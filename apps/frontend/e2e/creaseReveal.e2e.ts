import { expect, test, type Page, type Route } from "@playwright/test";
import sharp from "sharp";
import type { Crease } from "../src/stickers/StickerFigure";
import type { CreaseImage } from "../src/stickers/crease";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

async function coatPixels(page: Page) {
  const crease = page.locator("[data-reveal] .sticker-crease");
  const previous = await crease.evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLElement)) throw new Error("The crease paint element is missing");
      const before = {
        value: element.style.getPropertyValue("opacity"),
        priority: element.style.getPropertyPriority("opacity"),
      };
      element.style.setProperty("opacity", "0", "important");
      return before;
    }),
  );
  try {
    // Read the actual composed material: its flat and bent canvases share the CSS reveal mask.
    return await figurePixels(page);
  } finally {
    await crease.evaluateAll((elements, previous) => {
      elements.forEach((element, index) => {
        if (!(element instanceof HTMLElement))
          throw new Error("The crease paint element is missing");
        const before = previous[index];
        if (before?.value) element.style.setProperty("opacity", before.value, before.priority);
        else element.style.removeProperty("opacity");
      });
    }, previous);
  }
}

async function figurePixels(page: Page) {
  const image = await page.locator("[data-reveal]").screenshot({ animations: "allow" });
  return [...(await sharp(image).resize(240, 240, { fit: "fill" }).ensureAlpha().raw().toBuffer())];
}

const figureBounds = (page: Page) =>
  page
    .locator("[data-reveal] .sticker-figure__img, [data-reveal] canvas.sticker-laminate")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const { left, top, width, height } = element.getBoundingClientRect();
        return { left, top, width, height };
      }),
    );

function difference(before: number[], after: number[], box: [number, number, number, number]) {
  let peak = 0;
  const [left, top, width, height] = box;
  for (let y = top; y < top + height; y++)
    for (let x = left; x < left + width; x++)
      for (let c = 0; c < 3; c++) {
        const q = (y * 240 + x) * 4 + c;
        peak = Math.max(peak, Math.abs(before[q] - after[q]));
      }
  return peak;
}

const upper: [number, number, number, number] = [22, 22, 70, 70];
const lower: [number, number, number, number] = [150, 150, 70, 70];
const art: [number, number, number, number] = [103, 103, 34, 34];

async function openFixture(page: Page, query = "") {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`/e2e/creaseReveal.html${query}`);
  const coat = page.locator("[data-reveal] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => {
    window.creaseRevealFixture.tilt(40, 0);
    window.creaseRevealFixture.tilt(40, 2);
  });
  await page.waitForTimeout(1000);
  const images = await page.evaluate(() => window.creaseRevealFixture.imageData);
  const flat = { paint: await figurePixels(page), coat: await coatPixels(page) };
  return { images, flat, errors };
}

async function routeImages(page: Page, images: Crease, delay?: CreaseImage) {
  const pending: Route[] = [];
  const names = ["base", "normal", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const;
  await page.route("**/e2e/crease-reveal-*.png?*", (route) => {
    const path = new URL(route.request().url()).pathname;
    const name = names.find((name) => path.endsWith(`crease-reveal-${name}.png`));
    if (!name) throw new Error(`Unknown crease fixture image ${path}`);
    if (name === delay) {
      pending.push(route);
      return;
    }
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(images[name].split(",")[1], "base64"),
    });
  });
  return {
    pending,
    release: () => {
      if (!delay) throw new Error("The fixture has no delayed crease image");
      const body = Buffer.from(images[delay].split(",")[1], "base64");
      return Promise.all(pending.map((route) => route.fulfill({ contentType: "image/png", body })));
    },
  };
}

async function freezeFrames(page: Page) {
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 100));
}

async function observeDiagonal(
  page: Page,
  flat: { paint: number[]; coat: number[] },
  constant?: [number, number, number, number],
  artTolerance = 0,
) {
  let crossed = false;
  // Observe the order along the diagonal, independently of the animation's chosen duration.
  for (let frame = 0; frame < 30; frame++) {
    await page.clock.runFor(16);
    const paint = await figurePixels(page);
    const coat = await coatPixels(page);
    if (constant) {
      expect(
        difference(flat.paint, paint, constant),
        "The cut edge must keep its visible opacity",
      ).toBeLessThanOrEqual(1);
      expect(
        difference(flat.coat, coat, constant),
        "The material cut edge must retain its opacity",
      ).toBeLessThanOrEqual(1);
    }
    expect(
      difference(flat.paint, paint, art),
      "The reveal must leave the artwork visible",
    ).toBeLessThanOrEqual(artTolerance);
    expect(
      difference(flat.coat, coat, art),
      "Flat artwork must keep its reflection",
    ).toBeLessThanOrEqual(artTolerance);
    if (difference(coat, paint, upper) > 2 && difference(flat.coat, coat, upper) > 1) {
      expect(
        difference(flat.paint, paint, lower),
        "The bottom-right crease must wait for the diagonal to reach it",
      ).toBe(0);
      expect(
        difference(flat.coat, coat, lower),
        "The bottom-right reflection must wait with its painted crease",
      ).toBe(0);
      crossed = true;
      break;
    }
  }
  expect(crossed, "The actual paint and reflection must reveal the top-left first").toBe(true);
}

async function finishedPixels(
  page: Page,
  flat: { paint: number[]; coat: number[] },
  artTolerance = 0,
) {
  await page.clock.runFor(1000);
  const final = { paint: await figurePixels(page), coat: await coatPixels(page) };
  for (const box of [upper, lower]) {
    expect(
      difference(final.coat, final.paint, box),
      "A finished crease must be visible",
    ).toBeGreaterThan(2);
    expect(
      difference(flat.coat, final.coat, box),
      "A finished crease must bend reflection",
    ).toBeGreaterThan(1);
  }
  expect(difference(flat.paint, final.paint, art)).toBeLessThanOrEqual(artTolerance);
  expect(difference(flat.coat, final.coat, art)).toBeLessThanOrEqual(artTolerance);
  return final;
}

async function observeImmediateFinish(page: Page, flat: { paint: number[]; coat: number[] }) {
  let final: { paint: number[]; coat: number[] } | undefined;
  // Network decoding is asynchronous; the first changed material frame must already be complete.
  for (let frame = 0; frame < 30; frame++) {
    await page.clock.runFor(16);
    const sample = { paint: await figurePixels(page), coat: await coatPixels(page) };
    expect(difference(flat.paint, sample.paint, art)).toBe(0);
    expect(difference(flat.coat, sample.coat, art)).toBe(0);
    if (
      difference(flat.coat, sample.coat, upper) > 1 ||
      difference(flat.coat, sample.coat, lower) > 1
    ) {
      for (const box of [upper, lower]) {
        expect(
          difference(sample.coat, sample.paint, box),
          "Reduced motion must show the complete painted crease",
        ).toBeGreaterThan(2);
        expect(
          difference(flat.coat, sample.coat, box),
          "Reduced motion must have no partial reflection diagonal",
        ).toBeGreaterThan(1);
      }
      final = sample;
      break;
    }
  }
  expect(final, "The ready crease must finish in reduced motion").toBeDefined();
  await page.clock.runFor(1000);
  expect(await figurePixels(page)).toEqual(final?.paint);
  expect(await coatPixels(page)).toEqual(final?.coat);
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`crease paint stays flat until its delayed laminate normal is ready, ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const { flat, images, errors } = await openFixture(page);
    const { pending, release } = await routeImages(page, images, "normal");
    await page.evaluate(() => window.creaseRevealFixture.drop());
    await expect.poll(() => pending.length).toBeGreaterThan(0);
    // The images for the painted crease are available; only its normal is deliberately delayed.
    await page.waitForTimeout(600);
    const pendingPaint = await figurePixels(page);
    const pendingCoat = await coatPixels(page);
    expect(difference(flat.coat, pendingCoat, upper), "The delayed normal must stay flat").toBe(0);
    expect(
      difference(flat.paint, pendingPaint, upper),
      "Paint must wait for the same normal readiness as reflection",
    ).toBe(0);
    expect(difference(flat.paint, pendingPaint, lower)).toBe(0);
    await freezeFrames(page);
    await release();
    if (reducedMotion === "reduce") await observeImmediateFinish(page, flat);
    else {
      await observeDiagonal(page, flat);
      await finishedPixels(page, flat);
    }
    expect(errors).toEqual([]);
  });
}

for (const { width, height } of [
  { width: 240, height: 240 },
  { width: 240, height: 360 },
  { width: 240.5, height: 360.5 },
]) {
  test(`a repeated placement restarts the diagonal across paint and actual laminate pixels, size ${width}x${height}`, async ({
    page,
  }) => {
    const { flat, images, errors } = await openFixture(page, `?width=${width}&height=${height}`);
    const fractional = !Number.isInteger(width) || !Number.isInteger(height);
    // Fractional canvas sampling can differ by one color byte; integer sizes remain exact.
    const artTolerance = fractional ? 1 : 0;
    const bounds = await figureBounds(page);
    expect(bounds.map(({ width, height }) => ({ width, height }))).toEqual([
      { width, height },
      { width, height },
    ]);
    const checkBounds = async () => {
      const actual = await figureBounds(page);
      if (!fractional) {
        expect(actual, "The reveal must not move artwork or material bounds").toEqual(bounds);
        return;
      }
      expect(actual).toHaveLength(bounds.length);
      for (const [index, box] of actual.entries())
        for (const coordinate of ["left", "top", "width", "height"] as const)
          expect(
            Math.abs(box[coordinate] - bounds[index][coordinate]),
            "Fractional bounds must retain the sticker's position and size",
          ).toBeLessThanOrEqual(0.001);
    };
    await routeImages(page, images);
    await freezeFrames(page);
    await page.evaluate(() => window.creaseRevealFixture.drop());
    await observeDiagonal(page, flat, undefined, artTolerance);
    await checkBounds();
    await finishedPixels(page, flat, artTolerance);
    await page.evaluate(() => window.creaseRevealFixture.lift());
    await page.clock.runFor(32);
    if (fractional) {
      expect(
        difference(flat.paint, await figurePixels(page), [0, 0, 240, 240]),
      ).toBeLessThanOrEqual(1);
      expect(difference(flat.coat, await coatPixels(page), [0, 0, 240, 240])).toBeLessThanOrEqual(
        1,
      );
    } else {
      expect(await figurePixels(page)).toEqual(flat.paint);
      expect(await coatPixels(page)).toEqual(flat.coat);
    }
    await page.evaluate(() => window.creaseRevealFixture.drop());
    await observeDiagonal(page, flat, undefined, artTolerance);
    await checkBounds();
    await finishedPixels(page, flat, artTolerance);
    expect(errors).toEqual([]);
  });
}

test("lifting a sticker cancels a reveal while its normal is still loading", async ({ page }) => {
  const { flat, images, errors } = await openFixture(page);
  const { pending, release } = await routeImages(page, images, "normal");
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.evaluate(() => window.creaseRevealFixture.lift());
  await release();
  await page.clock.runFor(1000);
  expect(await figurePixels(page)).toEqual(flat.paint);
  expect(await coatPixels(page)).toEqual(flat.coat);
  expect(errors).toEqual([]);
});

test("lifting a sticker cancels an intermediate crease reveal", async ({ page }) => {
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeDiagonal(page, flat);
  await page.evaluate(() => window.creaseRevealFixture.lift());
  await page.clock.runFor(1000);
  expect(await figurePixels(page)).toEqual(flat.paint);
  expect(await coatPixels(page)).toEqual(flat.coat);
  expect(errors).toEqual([]);
});

test("reduced motion reveals the finished crease without a partial diagonal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeImmediateFinish(page, flat);
  expect(errors).toEqual([]);
});

test("reflection stays flat until the delayed painted crease image is ready", async ({ page }) => {
  const { flat, images, errors } = await openFixture(page);
  const { pending, release } = await routeImages(page, images, "base");
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.waitForTimeout(600);
  const pendingCoat = await coatPixels(page);
  expect(
    difference(flat.coat, pendingCoat, upper),
    "Reflection must wait for the painted crease's image readiness",
  ).toBe(0);
  expect(difference(flat.coat, pendingCoat, lower)).toBe(0);
  await freezeFrames(page);
  await release();
  await observeDiagonal(page, flat);
  await finishedPixels(page, flat);
  expect(errors).toEqual([]);
});

test("a failed print upgrade reveals a ready crease over retained artwork without new light input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  const printRequests: Route[] = [];
  await page.route("**/e2e/crease-reveal-print.png?*", (route) => {
    printRequests.push(route);
  });
  const normalResponse = page.waitForResponse((response) =>
    response.url().includes("crease-reveal-normal.png"),
  );
  const pose = await page.evaluate(() => window.creaseRevealFixture.pose());
  await page.evaluate(() => {
    window.creaseRevealFixture.replacePrint("/e2e/crease-reveal-print.png?upgrade=1");
    window.creaseRevealFixture.drop();
  });
  await normalResponse;
  await expect.poll(() => printRequests.length).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(
    difference(flat.coat, await coatPixels(page), [0, 0, 240, 240]),
    "A pending print upgrade must retain complete paper",
  ).toBe(0);
  await freezeFrames(page);
  await Promise.all(
    printRequests.map((route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Fixture print upgrade unavailable",
      }),
    ),
  );
  const coat = page.locator("[data-reveal] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-error", /print.*503/);
  await page.clock.runFor(1000);
  const final = { paint: await figurePixels(page), coat: await coatPixels(page) };
  for (const box of [upper, lower]) {
    expect(difference(final.coat, final.paint, box)).toBeGreaterThan(2);
    expect(
      difference(flat.coat, final.coat, box),
      "A failed print must unblock the ready normal without another light input",
    ).toBeGreaterThan(1);
  }
  expect(difference(flat.paint, final.paint, art)).toBe(0);
  expect(difference(flat.coat, final.coat, art)).toBe(0);
  expect(await page.evaluate(() => window.creaseRevealFixture.pose())).toEqual(pose);
  await page.evaluate(() => window.creaseRevealFixture.refresh());
  await page.clock.runFor(32);
  expect(
    await coatPixels(page),
    "The failure must already have drawn the complete material",
  ).toEqual(final.coat);
  expect(errors.some((error) => error.includes("print") && error.includes("503"))).toBe(true);
  expect(errors.filter((error) => !error.includes("503"))).toEqual([]);
});

test("turning on reduced motion completes an intermediate reveal immediately", async ({ page }) => {
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeDiagonal(page, flat);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(32);
  const final = { paint: await figurePixels(page), coat: await coatPixels(page) };
  for (const box of [upper, lower]) {
    expect(difference(final.coat, final.paint, box)).toBeGreaterThan(2);
    expect(difference(flat.coat, final.coat, box)).toBeGreaterThan(1);
  }
  expect(difference(flat.paint, final.paint, art)).toBe(0);
  expect(difference(flat.coat, final.coat, art)).toBe(0);
  await page.clock.runFor(1000);
  expect(await figurePixels(page)).toEqual(final.paint);
  expect(await coatPixels(page)).toEqual(final.coat);
  expect(errors).toEqual([]);
});

test("a crease arriving after GPU failure paints over visible artwork", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext: unknown = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
    )?.value;
    if (typeof getContext !== "function")
      throw new Error("The browser canvas context function is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        if (args[0] === "webgl") return null;
        const context: unknown = Reflect.apply(getContext, this, args);
        return context;
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/e2e/creaseReveal.html");
  const coat = page.locator("[data-reveal] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect(coat).toHaveAttribute("data-error", /WebGL.*unavailable/);
  const image = page.locator("[data-reveal] .sticker-figure__img");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((image) => image instanceof HTMLImageElement && image.complete))
    .toBe(true);
  const flat = await figurePixels(page);
  const images = await page.evaluate(() => window.creaseRevealFixture.imageData);
  await routeImages(page, images);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect
    .poll(async () => difference(flat, await figurePixels(page), upper), {
      message: "A later crease must use painted fallback after GPU failure",
    })
    .toBeGreaterThan(2);
  const final = await figurePixels(page);
  expect(difference(flat, final, lower)).toBeGreaterThan(2);
  expect(difference(flat, final, art)).toBe(0);
  await expect(image).toBeVisible();
  await expect(coat).toHaveAttribute("data-error", /WebGL.*unavailable/);
  expect(errors.some((error) => error.includes("WebGL"))).toBe(true);
  expect(errors.filter((error) => !error.includes("WebGL"))).toEqual([]);
});

test("an antialiased cut keeps its edge opacity throughout the diagonal reveal", async ({
  page,
}) => {
  const { flat, images, errors } = await openFixture(page, "?softcut=1");
  await routeImages(page, images);
  const edge: [number, number, number, number] = [2, 103, 6, 34];
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeDiagonal(page, flat, edge);
  await page.clock.runFor(32);
  expect(difference(flat.paint, await figurePixels(page), edge)).toBeLessThanOrEqual(1);
  expect(difference(flat.coat, await coatPixels(page), edge)).toBeLessThanOrEqual(1);
  const final = await finishedPixels(page, flat);
  expect(difference(flat.paint, final.paint, edge)).toBeLessThanOrEqual(1);
  expect(difference(flat.coat, final.coat, edge)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
