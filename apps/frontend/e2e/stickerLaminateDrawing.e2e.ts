import { expect, test } from "@playwright/test";

test("redrawing a ready laminate does not rewrite its visibility state", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/e2e/stickerLaminate.html?count=5&side=160");
  await expect
    .poll(() => page.locator("canvas.sticker-material[data-state=ready]").count())
    .toBe(8);
  await page.waitForTimeout(200);
  const stateWrites = await page.evaluate(async () => {
    const { refreshSticker } = await import("../src/stickers/stickerRenderer.ts");
    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    const canvases = [...document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-material")];
    for (const canvas of canvases)
      observer.observe(canvas, { attributes: true, attributeFilter: ["data-state"] });
    try {
      for (const canvas of canvases) refreshSticker(canvas);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return writes;
    } finally {
      observer.disconnect();
    }
  });
  expect(
    stateWrites,
    "Held material redraws must not invalidate the ready visibility selectors",
  ).toBe(0);
});
