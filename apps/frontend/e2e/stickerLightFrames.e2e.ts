import { expect, test } from "@playwright/test";

test("sticker detail restores identical laminate and foil after screen orientation round trips", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerLaminate.html?count=1&side=480&foil=1");
  await expect(page.locator("canvas.sticker-laminate[data-state=ready]")).toHaveCount(4);
  const read = async (angle: number, beta: number, gamma: number, alpha: number) => {
    await page.evaluate(
      ({ angle, beta, gamma, alpha }) => {
        Object.defineProperty(screen, "orientation", { configurable: true, value: { angle } });
        window.laminateFixture.tilt(beta, gamma, alpha);
      },
      { angle, beta, gamma, alpha },
    );
    return page.evaluate(async () => {
      let previous = "";
      let still = 0;
      const deadline = performance.now() + 5000;
      while (still < 5) {
        if (performance.now() > deadline) throw new Error("The material light did not settle");
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const next = JSON.stringify(window.laminateFixture.getPose());
        still = next === previous ? still + 1 : 0;
        previous = next;
      }
      const canvas = document.querySelector('[data-sticker="0"] canvas.sticker-laminate');
      const paper = document.querySelector("[data-white] canvas.sticker-laminate");
      const glint = document.querySelector(".sticker-foil__glint");
      const foil = document.querySelector(".sticker-foil");
      if (
        !(canvas instanceof HTMLCanvasElement) ||
        !(paper instanceof HTMLCanvasElement) ||
        !(glint instanceof HTMLElement) ||
        !(foil instanceof HTMLElement)
      )
        throw new Error("The detail material is missing");
      // Measure the browser's composed parent rotation and pseudo-element translation.
      const pseudo = getComputedStyle(glint, "::before");
      const marker = document.createElement("span");
      Object.assign(marker.style, {
        position: "absolute",
        top: pseudo.top,
        right: pseudo.right,
        bottom: pseudo.bottom,
        left: pseudo.left,
        translate: pseudo.translate,
        opacity: "0",
      });
      glint.append(marker);
      const bounds = marker.getBoundingClientRect();
      const band = foil.getBoundingClientRect();
      const foilPosition = {
        x: (bounds.x + bounds.width / 2 - band.x) / band.width,
        y: (bounds.y + bounds.height / 2 - band.y) / band.height,
      };
      marker.remove();
      const context = paper.getContext("2d");
      if (!context) throw new Error("The white-paper reflection pixels are unavailable");
      const { width, height } = paper;
      const pixels = context.getImageData(0, 0, width, height).data;
      let minimum = 255;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i + 3] === 255) minimum = Math.min(minimum, pixels[i]);
      let total = 0;
      let x = 0;
      let y = 0;
      for (let row = 0; row < height; row++)
        for (let column = 0; column < width; column++) {
          const i = (row * width + column) * 4;
          if (pixels[i + 3] !== 255) continue;
          const weight = Math.max(0, pixels[i] - minimum - 3);
          total += weight;
          x += (weight * (column + 0.5)) / width;
          y += (weight * (row + 0.5)) / height;
        }
      const pose = window.laminateFixture.getPose();
      return {
        pixels: canvas.toDataURL(),
        x: pose.x,
        y: pose.y,
        glint: getComputedStyle(glint, "::before").translate,
        rotation: getComputedStyle(glint).rotate,
        foilPosition,
        laminatePosition: total ? { x: x / total, y: y / total } : null,
      };
    });
  };
  await read(0, 40, 0, 123);
  const first = await read(0, 42, 3, 124);
  await page.screenshot({ path: testInfo.outputPath("detail-light-before.png") });
  const turned = await read(90, 42, 3, 124);
  for (const surface of ["foilPosition", "laminatePosition"] as const) {
    const before = first[surface];
    const after = turned[surface];
    if (!before || !after) throw new Error("The held gloss reflection must be visible");
    expect(after.x).toBeCloseTo(before.y, 2);
    expect(after.y).toBeCloseTo(1 - before.x, 2);
  }
  expect(await read(0, 42, 3, 124)).toEqual(first);
  for (let repeat = 0; repeat < 3; repeat++) {
    await read(90, 48, 16, 130);
    await read(90, 36, -12, 120);
    expect(await read(0, 42, 3, 124)).toEqual(first);
  }
  await page.screenshot({ path: testInfo.outputPath("detail-light-after.png") });
});

test("foil and laminate follow the same displayed pose throughout a diagonal wrist movement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerLaminate.html?count=1&side=360&board=1&foil=1");
  await expect(page.locator("canvas.sticker-laminate[data-state=ready]")).toHaveCount(1);
  await page.evaluate(() => window.laminateFixture.tilt(40, 0, 123));
  const result = await page.evaluate(async () => {
    const glint = document.querySelector(".sticker-foil__glint");
    if (!(glint instanceof HTMLElement)) throw new Error("The sticker foil glint is missing");
    let maximumTranslationError = 0;
    let maximumRotationError = 0;
    let changed = 0;
    let previous = "";
    for (let frame = 0; frame < 90; frame++) {
      const progress = (frame / 90) * Math.PI * 2;
      window.laminateFixture.tilt(
        40 + 5 * Math.sin(progress),
        5 * Math.cos(progress),
        123 + 3 * Math.sin(progress),
      );
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const pose = window.laminateFixture.getPose();
      const displayed = getComputedStyle(glint);
      const reflection = getComputedStyle(glint, "::before");
      const translation = reflection.translate.split(" ").map(Number.parseFloat);
      if (translation.length !== 2 || translation.some((value) => !Number.isFinite(value)))
        throw new Error(`The foil reflection translation is unavailable: ${reflection.translate}`);
      maximumTranslationError = Math.max(
        maximumTranslationError,
        Math.abs(translation[0] - pose.x * 83),
        Math.abs(translation[1] - pose.y * 83),
      );
      maximumRotationError = Math.max(
        maximumRotationError,
        Math.abs(Number.parseFloat(displayed.rotate) + pose.rotationDegrees),
      );
      if (reflection.translate !== previous) changed++;
      previous = reflection.translate;
    }
    return { maximumTranslationError, maximumRotationError, changed };
  });
  // CSS receives values rounded to three decimals, so 83% travel permits at most 0.042% rounding.
  expect(result.maximumTranslationError).toBeLessThanOrEqual(0.05);
  expect(result.maximumRotationError).toBeLessThanOrEqual(0.001);
  expect(result.changed).toBeGreaterThan(75);
});
