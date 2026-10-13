import { expect, test } from "@playwright/test";

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
