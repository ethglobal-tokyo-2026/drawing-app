import { expect, test } from "@playwright/test";

// Kyoto Seika grows the cut; holo reads a baked mask and adds diffraction.
for (const style of ["kyoto-seika", "holo"] as const) {
  test(`${style} complete border follows a held pose and returns to it`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 1100 });
    await page.goto(
      `/e2e/stickerLaminate.html?board=1&foil=1&foilStyle=${style}&side=240&creaseFoil=1`,
    );
    const canvas = page.locator('[data-sticker="0"] canvas.sticker-material');
    const fallback = page.locator('[data-sticker="0"] .sticker-foil');
    await expect(canvas).toHaveAttribute("data-state", "ready");
    await expect(canvas).toHaveAttribute("data-foil", "true");
    await canvas.evaluate(async (canvas: HTMLCanvasElement) => {
      const { whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
      const normal = canvas
        .closest(".sticker-figure")
        ?.querySelector<HTMLElement>(".sticker-crease")?.dataset.normal;
      if (!normal) throw new Error("The appearance figure has no actual crease normal");
      await whenStickerSettled(canvas, { normal }, AbortSignal.timeout(15000));
    });
    await expect(fallback).toHaveAttribute("data-state", "ready");
    await expect(fallback.locator(".sticker-foil__band")).toHaveCSS("visibility", "hidden");
    const marginPaint = await page
      .locator('[data-sticker="0"] .sticker-crease > i')
      .first()
      .evaluate(async (element: HTMLElement) => {
        const image = new Image();
        image.src = element.style.getPropertyValue("--crease").slice(5, -2);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 240;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No crease paint pixels");
        context.drawImage(image, 0, 0);
        // This strip is above both the cut and its narrow band in the calibrated source frame.
        const strip = context.getImageData(100, 10, 40, 1).data;
        return strip.reduce((total, value, index) => total + (index % 4 === 3 ? value : 0), 0);
      });
    expect(
      marginPaint,
      "The painted crease must not become a stripe outside the physical sticker",
    ).toBe(0);
    const pixels = () => canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    const original = await pixels();
    await page.evaluate(() => window.laminateFixture.flight(6, 0));
    await expect.poll(pixels).not.toBe(original);
    const tilted = await pixels();
    await page.evaluate(() => window.laminateFixture.flight(0, 0));
    await expect.poll(pixels).toBe(original);
    expect(tilted).not.toBe(original);
  });
}

test("a failed print leaves a shaped static foil and persistent diagnostics", async ({ page }) => {
  await page.route("**/missing-print.png", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/e2e/stickerLaminate.html?board=1&foil=1&foilStyle=pink&failedPrint=1");
  const failed = page.locator('[data-sticker="0"]');
  await expect(failed.locator("canvas.sticker-material")).toHaveAttribute("data-state", "failed");
  await expect(failed.locator("canvas.sticker-material")).toHaveAttribute(
    "data-error",
    /missing-print/,
  );
  await expect(failed.locator(".sticker-foil")).toHaveAttribute("data-state", "ready");
  await expect(failed.locator(".sticker-foil__band")).toHaveCSS("visibility", "visible");
  const shape = await failed
    .locator(".sticker-foil__band")
    .evaluate((el) => getComputedStyle(el).maskImage);
  expect(shape).toMatch(/^url\("(blob|data):/);
});

test("a sharp print upgrade keeps the foil dots and cut registered", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1100 });
  await page.goto("/e2e/stickerLaminate.html?board=1&foil=1&side=480");
  const canvas = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await expect(canvas).toHaveAttribute("data-foil", "true");
  const border = () =>
    canvas.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No complete frame");
      // The centered side border is outside paper and contains the fixed source-coordinate dots.
      return Array.from(context.getImageData(0, Math.floor(canvas.height * 0.45), 16, 80).data);
    });
  await expect(page.locator('[data-sticker="0"] .sticker-foil')).toHaveAttribute(
    "data-state",
    "ready",
  );
  const before = await border();
  const mask = await page
    .locator('[data-sticker="0"] .sticker-foil')
    .evaluate((el: HTMLElement) => el.style.getPropertyValue("--foil-coverage"));
  await page.evaluate(() => window.laminateFixture.upgradePrint());
  await expect(page.locator('[data-sticker="0"] .sticker-figure__img')).toHaveAttribute(
    "src",
    /960/,
  );
  // The sharp print commits with the foil it was registered to before the snapshot is compared.
  await canvas.evaluate(async (canvas: HTMLCanvasElement) => {
    const { whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(15000));
  });
  expect(await border()).toEqual(before);
  expect(
    await page
      .locator('[data-sticker="0"] .sticker-foil')
      .evaluate((el: HTMLElement) => el.style.getPropertyValue("--foil-coverage")),
  ).toBe(mask);
});

test("partial coating retains paper occlusion and independent foil during sealing", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1&foil=1&foilStyle=silver");
  const canvas = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(canvas).toHaveAttribute("data-state", "ready");
  const result = await canvas.evaluate(async (canvas: HTMLCanvasElement) => {
    const { setStickerAmounts, turnSticker, updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const read = () => {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No complete material pixels");
      return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
    };
    const frame = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    const full = read(),
      fullWidth = canvas.width,
      fullHeight = canvas.height;
    const figure = canvas.closest<HTMLElement>(".sticker-figure");
    const print = figure?.querySelector<HTMLImageElement>(".sticker-figure__img")?.src;
    const cut = figure?.style.getPropertyValue("--m").slice(5, -2);
    if (!print || !cut) throw new Error("Missing source paper assets");
    updateSticker(canvas, { print, cut, finish: "gloss" });
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(5000));
    const paperMaterial = {
      state: canvas.dataset.state,
      foil: canvas.dataset.foil,
      error: canvas.dataset.error ?? "",
    };
    const paper = read(),
      dx = Math.round((fullWidth - canvas.width) / 2),
      dy = Math.round((fullHeight - canvas.height) / 2);
    let paperError = 0;
    let paperMismatch:
      | { x: number; y: number; channel: number; before: number; after: number }
      | undefined;
    for (let y = Math.floor(canvas.height * 0.1); y < canvas.height * 0.9; y += 3)
      for (let x = Math.floor(canvas.width * 0.1); x < canvas.width * 0.9; x += 3)
        for (let channel = 0; channel < 4; channel++) {
          const before = full[((y + dy) * fullWidth + x + dx) * 4 + channel];
          const after = paper[(y * canvas.width + x) * 4 + channel];
          const error = Math.abs(after - before);
          if (error > paperError) {
            paperError = error;
            paperMismatch = { x, y, channel, before, after };
          }
        }
    updateSticker(canvas, {
      print,
      cut,
      finish: "gloss",
      foil: { style: "silver", size: "board" },
    });
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(5000));
    setStickerAmounts(canvas, 0.25, 0.7);
    await frame();
    const partial = read();
    const image = canvas
      .closest<HTMLElement>(".sticker-figure")
      ?.querySelector(".sticker-figure__img");
    const plainVisible = image ? getComputedStyle(image).visibility : "missing";
    setStickerAmounts(canvas, 0.25, 0);
    await frame();
    const noFoil = read();
    setStickerAmounts(canvas, 0, 1);
    await frame();
    const foilOnly = read();
    turnSticker(canvas, 0, 24, -16);
    await frame();
    const flying = read();
    const center =
      (Math.floor(canvas.height / 2) * canvas.width + Math.floor(canvas.width / 2)) * 4;
    return {
      paperError,
      paperMismatch,
      paperMaterial,
      dimensions: { fullWidth, fullHeight, dx, dy },
      fullAlpha: full[center + 3],
      partialAlpha: partial[center + 3],
      centerNoFoil: noFoil.slice(center, center + 4),
      centerPartial: partial.slice(center, center + 4),
      centerFoilOnly: foilOnly.slice(center, center + 4),
      independentFoil: partial.some((v, i) => v !== noFoil[i]),
      flying: flying.some((v, i) => v !== foilOnly[i]),
      plainVisible,
    };
  });
  expect(result.paperMaterial).toEqual({ state: "ready", foil: "false", error: "" });
  expect(result.paperError, JSON.stringify(result)).toBe(0);
  expect(result.fullAlpha).toBe(255);
  expect(result.partialAlpha).toBe(64);
  expect(result.centerNoFoil).toEqual(result.centerPartial);
  expect(result.centerFoilOnly).toEqual([0, 0, 0, 0]);
  expect(result.independentFoil).toBe(true);
  expect(result.flying).toBe(true);
  expect(result.plainVisible).toBe("visible");
});

// A fractional CSS resize changes print registration even when integer coverage dimensions stay put.
test("fractional static foil registration refreshes without preparing unchanged coverage", async ({
  page,
}) => {
  const side = 240,
    fractional = side + 0.25;
  await page.setViewportSize({ width: 1100, height: 1100 });
  await page.goto(`/e2e/stickerLaminate.html?board=1&foil=1&side=${side}&failedPrint=1`);
  const figure = page.locator('[data-sticker="0"]');
  const fallback = figure.locator(".sticker-foil");
  await expect(fallback).toHaveAttribute("data-state", "ready");
  const before = await fallback.evaluate((element: HTMLElement) => ({
    width: element.clientWidth,
    pitch: parseFloat(element.style.getPropertyValue("--foil-print-pitch")),
    origin: parseFloat(element.style.getPropertyValue("--foil-print-x")),
    coverage: element.style.getPropertyValue("--foil-coverage"),
  }));
  await page.evaluate(() => {
    const fetch = window.fetch;
    const encode: unknown = Reflect.get(HTMLCanvasElement.prototype, "toDataURL");
    if (typeof encode !== "function") throw new Error("The native PNG encoder is missing");
    const calls = { fetches: 0, encodes: 0 };
    Reflect.set(window, "fractionalPreparation", calls);
    window.fetch = (...args) => {
      calls.fetches++;
      return fetch(...args);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      calls.encodes++;
      const result: unknown = Reflect.apply(encode, this, args);
      if (typeof result !== "string") throw new Error("The PNG encoder returned no image");
      return result;
    };
  });
  await figure.evaluate((element: HTMLElement, size) => {
    element.style.width = element.style.height = `${size}px`;
  }, fractional);
  // The print's pitch and origin scale with the shown size; the coverage's integer frame stays.
  await expect
    .poll(() =>
      fallback.evaluate((el: HTMLElement) =>
        parseFloat(el.style.getPropertyValue("--foil-print-pitch")),
      ),
    )
    .toBeCloseTo((before.pitch * fractional) / side, 6);
  const after = await fallback.evaluate((el: HTMLElement) => ({
    width: el.clientWidth,
    origin: parseFloat(el.style.getPropertyValue("--foil-print-x")),
    coverage: el.style.getPropertyValue("--foil-coverage"),
  }));
  expect(after.width).toBe(before.width);
  expect(after.coverage).toBe(before.coverage);
  expect(after.origin).toBeCloseTo((before.origin * fractional) / side, 6);
  expect(await page.evaluate((): unknown => Reflect.get(window, "fractionalPreparation"))).toEqual({
    fetches: 0,
    encodes: 0,
  });
});
