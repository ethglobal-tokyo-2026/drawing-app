import { expect, test, type Page, type Route } from "@playwright/test";
import sharp from "sharp";
import type { Crease } from "../src/stickers/StickerFigure";
import type { CreaseImage } from "../src/stickers/crease";
import { pauseClock } from "./clock.ts";

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

declare global {
  interface Window {
    creaseRevealWork: {
      revealChanges: number;
      flatSnapshots: number;
      materialCopies: number;
    };
  }
}

async function observeCreaseWork(page: Page) {
  await page.addInitScript(() => {
    const work = { revealChanges: 0, flatSnapshots: 0, materialCopies: 0 };
    window.creaseRevealWork = work;
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") work.revealChanges++;
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(".sticker-material-flat")) work.flatSnapshots++;
          work.flatSnapshots += node.querySelectorAll(".sticker-material-flat").length;
        }
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-crease-reveal"],
    });
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (typeof drawImage !== "function") throw new Error("The canvas image method is missing");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (
          this.canvas.classList.contains("sticker-material") ||
          this.canvas.classList.contains("sticker-material-flat")
        )
          work.materialCopies++;
        Reflect.apply(drawImage, this, args);
      },
    });
  });
}

const resetCreaseWork = (page: Page) =>
  page.evaluate(() => {
    window.creaseRevealWork.revealChanges = 0;
    window.creaseRevealWork.flatSnapshots = 0;
    window.creaseRevealWork.materialCopies = 0;
  });

async function expectSettledCrease(page: Page) {
  await page.clock.runFor(300);
  const settled = await page.evaluate(() => ({
    work: { ...window.creaseRevealWork },
    pose: window.creaseRevealFixture.pose(),
  }));
  expect(settled.work.revealChanges, "No timed reveal may start without placement intent").toBe(0);
  expect(settled.work.flatSnapshots, "Baseline creases need no temporary flat material").toBe(0);
  await expect(page.locator("[data-reveal] [data-crease-reveal]")).toHaveCount(0);
  await expect(page.locator("[data-reveal] canvas.sticker-material-flat")).toHaveCount(0);
  const paperIsComplete = await page
    .locator("[data-reveal] canvas.sticker-material")
    .evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
      if (!canvas.width || !canvas.height)
        throw new Error("The settled laminate snapshot has no pixels");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The material pixel context is missing");
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let alpha = 3; alpha < pixels.length; alpha += 4)
        if (pixels[alpha] !== 255) return false;
      return true;
    });
  expect(paperIsComplete, "A settled baseline retains all opaque paper").toBe(true);
  await page.clock.runFor(500);
  const held = await page.evaluate(() => ({
    work: { ...window.creaseRevealWork },
    pose: window.creaseRevealFixture.pose(),
  }));
  expect(held.work).toEqual(settled.work);
  expect(held.pose).toEqual(settled.pose);
}

async function awaitCurrentNormalSnapshot(page: Page) {
  // A remount creates new image and material owners; pixel agreement starts at their actual readiness.
  // Reveal-marker history remains observed throughout this wait, including any unintended sweep.
  await page.clock.runFor(16);
  let settled = false;
  let failure: unknown;
  const readiness = page
    .evaluate(() => window.creaseRevealFixture.whenSettled())
    .then(
      () => {
        settled = true;
      },
      (error: unknown) => {
        failure = error;
        settled = true;
      },
    );
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return settled;
    })
    .toBe(true);
  await readiness;
  if (failure) throw failure;
  // The held side-light opacity transition uses the browser's animation clock, not the fake RAF.
  // Its actual finish is the baseline for settled pixel agreement; reveal history stays observed.
  settled = false;
  failure = undefined;
  const sideOpacity = page.locator("[data-reveal] .sticker-crease").evaluate(async (crease) => {
    const transitions = [...crease.querySelectorAll("i[data-side]")].flatMap((side) => {
      void getComputedStyle(side).opacity;
      return side
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSTransition && animation.transitionProperty === "opacity",
        );
    });
    await Promise.all(transitions.map((animation) => animation.finished));
  });
  const opacityReadiness = sideOpacity.then(
    () => {
      settled = true;
    },
    (error: unknown) => {
      failure = error;
      settled = true;
    },
  );
  await expect
    .poll(() => settled, {
      timeout: 5000,
      message: "The remounted crease's finite side-light opacity transitions must finish",
    })
    .toBe(true);
  await opacityReadiness;
  if (failure) throw failure;
}

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
    .locator("[data-reveal] .sticker-figure__img, [data-reveal] canvas.sticker-material")
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
  const coat = page.locator("[data-reveal] canvas.sticker-material");
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
  let released = false;
  const names = ["base", "normal", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const;
  await page.route("**/e2e/crease-reveal-*.png?*", (route) => {
    const path = new URL(route.request().url()).pathname;
    const name = names.find((name) => path.endsWith(`crease-reveal-${name}.png`));
    if (!name) throw new Error(`Unknown crease fixture image ${path}`);
    if (name === delay && !released) {
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
      released = true;
      const body = Buffer.from(images[delay].split(",")[1], "base64");
      return Promise.all(pending.map((route) => route.fulfill({ contentType: "image/png", body })));
    },
  };
}

async function freezeFrames(page: Page) {
  await pauseClock(page);
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
          "An immediate finish must show the complete painted crease",
        ).toBeGreaterThan(2);
        expect(
          difference(flat.coat, sample.coat, box),
          "An immediate finish must have no partial reflection diagonal",
        ).toBeGreaterThan(1);
      }
      final = sample;
      break;
    }
  }
  expect(final, "The ready crease must appear complete without a timed reveal").toBeDefined();
  await page.clock.runFor(1000);
  expect(await figurePixels(page)).toEqual(final?.paint);
  expect(await coatPixels(page)).toEqual(final?.coat);
}

test("a fresh baseline crease hydrates without a timed reveal or repeated settled copies", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { errors } = await openFixture(page, "?baseline=1");
  const paint = await figurePixels(page),
    coat = await coatPixels(page);
  for (const box of [upper, lower]) expect(difference(coat, paint, box)).toBeGreaterThan(2);
  await freezeFrames(page);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  expect(errors).toEqual([]);
});

test("delayed hydration shows the complete crease without granting placement intent", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  const { pending, release } = await routeImages(page, images, "normal");
  await page.evaluate(() => window.creaseRevealFixture.hydrate());
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.waitForTimeout(600);
  expect(await figurePixels(page)).toEqual(flat.paint);
  expect(await coatPixels(page)).toEqual(flat.coat);
  await freezeFrames(page);
  await release();
  await observeImmediateFinish(page, flat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  expect(errors).toEqual([]);
});

test("remounting a placed crease cannot replay its consumed placement intent", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeDiagonal(page, flat);
  const final = await finishedPixels(page, flat);
  const started = await page.evaluate(() => [...window.creaseRevealFixture.startedNormals]);
  expect(started).toHaveLength(1);
  await resetCreaseWork(page);
  await page.evaluate(() => window.creaseRevealFixture.remount());
  await awaitCurrentNormalSnapshot(page);
  await observeImmediateFinish(page, flat);
  expect(await figurePixels(page)).toEqual(final.paint);
  expect(await coatPixels(page)).toEqual(final.coat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual(started);
  expect(errors).toEqual([]);
});

test("a crease completed in reduced motion cannot replay after normal motion and remount", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeImmediateFinish(page, flat);
  const final = { paint: await figurePixels(page), coat: await coatPixels(page) };
  const started = await page.evaluate(() => [...window.creaseRevealFixture.startedNormals]);
  expect(started, "The first complete normal snapshot consumes placement intent").toHaveLength(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await resetCreaseWork(page);
  await page.evaluate(() => window.creaseRevealFixture.remount());
  await awaitCurrentNormalSnapshot(page);
  await observeImmediateFinish(page, flat);
  expect(await figurePixels(page)).toEqual(final.paint);
  expect(await coatPixels(page)).toEqual(final.coat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual(started);
  expect(errors).toEqual([]);
});

test("rereading and refreshing a held crease consumes its placement intent only once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return page.evaluate(() => window.creaseRevealFixture.startedNormals.length);
    })
    .toBe(1);
  // Repeated requests before the next clock tick must not admit the same placement again.
  await page.evaluate(() => {
    for (let request = 0; request < 8; request++) window.creaseRevealFixture.refresh();
  });
  await page.clock.runFor(16);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toHaveLength(1);
  const final = await finishedPixels(page, flat);
  const pose = await page.evaluate(() => window.creaseRevealFixture.pose());
  await resetCreaseWork(page);
  await page.evaluate(() => {
    window.creaseRevealFixture.reread();
    window.creaseRevealFixture.refresh();
  });
  await page.clock.runFor(32);
  expect(await figurePixels(page)).toEqual(final.paint);
  expect(await coatPixels(page)).toEqual(final.coat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.pose())).toEqual(pose);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("covering before the first snapshot cancels placement intent through re-exposure and remount", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  const { pending, release } = await routeImages(page, images, "normal");
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.evaluate(() => window.creaseRevealFixture.cover());
  await release();
  await page.clock.runFor(300);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  await page.evaluate(() => window.creaseRevealFixture.expose());
  await observeImmediateFinish(page, flat);
  await expectSettledCrease(page);
  await page.evaluate(() => window.creaseRevealFixture.remount());
  await awaitCurrentNormalSnapshot(page);
  await observeImmediateFinish(page, flat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  expect(errors).toEqual([]);
});

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

test("the diagonal keeps separate crease regions visibly staged over successive frames", async ({
  page,
}) => {
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  await freezeFrames(page);
  await page.evaluate(() => window.creaseRevealFixture.drop());
  let started = false;
  for (let frame = 0; frame < 30; frame++) {
    await page.clock.runFor(16);
    started = await page
      .locator("[data-reveal] .sticker-crease-reveal")
      .evaluate((crease) => crease.hasAttribute("data-crease-reveal"));
    if (started) break;
  }
  expect(started, "The placed crease must start its sweep").toBe(true);
  // Six display frames should show the leading crease without already reaching the trailing one.
  await page.clock.runFor(96);
  const paint = await figurePixels(page);
  const coat = await coatPixels(page);
  expect(
    difference(flat.paint, paint, upper),
    "The leading crease must already be visible",
  ).toBeGreaterThan(2);
  expect(difference(flat.paint, paint, lower), "The trailing crease must still be flat").toBe(0);
  expect(difference(flat.coat, coat, lower), "The trailing reflection must still be flat").toBe(0);
  await finishedPixels(page, flat);
  expect(errors).toEqual([]);
});

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

test("a failed crease normal keeps new paint hidden over retained material and recovers once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeCreaseWork(page);
  const { flat, images, errors } = await openFixture(page);
  await routeImages(page, images);
  const failedNormal = "/e2e/crease-reveal-normal.png?bake=1";
  const requests: Route[] = [];
  await page.route(`**${failedNormal}`, (route) => {
    requests.push(route);
  });
  await freezeFrames(page);
  await resetCreaseWork(page);
  const pose = await page.evaluate(() => window.creaseRevealFixture.pose());
  await page.evaluate(() => window.creaseRevealFixture.drop());
  await expect
    .poll(async () => {
      await page.clock.runFor(16);
      return requests.length;
    })
    .toBeGreaterThan(0);
  // The full Figure requests its normal only after all matching painted crease images decode.
  const paintedCrease = page.locator("[data-reveal] .sticker-crease-reveal");
  await expect(page.locator("[data-reveal] .sticker-crease")).toHaveAttribute(
    "data-normal",
    failedNormal,
  );
  await expect(paintedCrease).toHaveCSS("opacity", "0");
  await Promise.all(
    requests.map((route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Fixture crease normal unavailable",
      }),
    ),
  );
  const coat = page.locator("[data-reveal] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-error", /Replacing crease normal.*bake=1.*503/);
  await page.evaluate(() => window.creaseRevealFixture.whenSettled("normal-error"));
  await page.clock.runFor(32);
  await expect(coat).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-reveal] .sticker-figure__img")).toHaveCSS(
    "visibility",
    "hidden",
  );
  await expect(
    paintedCrease,
    "A failed normal must not publish new crease paint over a retained older reflection",
  ).toHaveCSS("opacity", "0");
  expect(await figurePixels(page), "The retained whole sticker must keep its exact pixels").toEqual(
    flat.paint,
  );
  expect(await coatPixels(page), "The failed normal must never replace the ready coating").toEqual(
    flat.coat,
  );
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  await expectSettledCrease(page);
  await page.evaluate(() => window.creaseRevealFixture.refresh());
  await page.clock.runFor(32);
  expect(await figurePixels(page)).toEqual(flat.paint);
  expect(await coatPixels(page)).toEqual(flat.coat);
  expect(await page.evaluate(() => window.creaseRevealFixture.pose())).toEqual(pose);
  await expect(coat).toHaveAttribute("data-error", /Replacing crease normal.*bake=1.*503/);

  await page.evaluate(() => window.creaseRevealFixture.cover());
  await page.clock.runFor(32);
  await page.evaluate(() => window.creaseRevealFixture.expose());
  await page.clock.runFor(32);
  await page.evaluate(() => window.creaseRevealFixture.whenSettled("normal-error"));
  await expect(
    paintedCrease,
    "Re-exposing retained material must keep its mismatched pending crease paint hidden",
  ).toHaveCSS("opacity", "0");
  expect(await figurePixels(page)).toEqual(flat.paint);
  expect(await coatPixels(page)).toEqual(flat.coat);
  await expect(coat).toHaveAttribute("data-state", "ready");
  await expect(coat).toHaveAttribute("data-error", /Replacing crease normal.*bake=1.*503/);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([]);
  await expectSettledCrease(page);

  await page.evaluate(() => window.creaseRevealFixture.drop());
  await observeDiagonal(page, flat);
  const recovered = await finishedPixels(page, flat);
  await expect(coat).not.toHaveAttribute("data-error");
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toEqual([
    "/e2e/crease-reveal-normal.png?bake=2",
  ]);
  await resetCreaseWork(page);
  await page.evaluate(() => {
    window.creaseRevealFixture.reread();
    window.creaseRevealFixture.refresh();
  });
  await page.clock.runFor(32);
  expect(await figurePixels(page)).toEqual(recovered.paint);
  expect(await coatPixels(page)).toEqual(recovered.coat);
  await expectSettledCrease(page);
  expect(await page.evaluate(() => window.creaseRevealFixture.startedNormals)).toHaveLength(1);
  expect(errors.some((error) => error.includes(failedNormal) && error.includes("503"))).toBe(true);
  expect(errors.filter((error) => !error.includes("503"))).toEqual([]);
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
  const coat = page.locator("[data-reveal] canvas.sticker-material");
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
  const coat = page.locator("[data-reveal] canvas.sticker-material");
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
