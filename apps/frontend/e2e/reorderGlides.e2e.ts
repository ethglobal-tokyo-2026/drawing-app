import { expect, test } from "@playwright/test";
import type {} from "./reorderGlides";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/reorderGlides.html");
  await page.waitForFunction(() => Boolean(window.reorderGlides));
  await page.evaluate(() => window.reorderGlides.start());
  await expect.poll(() => page.evaluate(() => window.reorderGlides.transitions())).toBe(10);
});

test("reordering preserves resin and foil pseudo-elements through repeated moves", async ({
  page,
}) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await page.evaluate(() => window.reorderGlides.reorder());
    expect(result.before.slice(0, 4)).toEqual([40, 40, 40, 40]);
    for (let i = 0; i < 4; i++) {
      expect(result.after[i]).toBeCloseTo(result.before[i], 2);
    }
    expect(result.replays).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.reorderGlides.moveLight());
  await expect
    .poll(async () => (await page.evaluate(() => window.reorderGlides.positions())).slice(0, 4))
    .toEqual([-100, -100, -100, -100]);
});

test("a reordered crease follows a newer opacity without an old replay overriding it", async ({
  page,
}) => {
  await page.evaluate(() => window.reorderGlides.reorder());
  const opacity = await page.locator('[data-sticker="a"] [data-part="crease"]').evaluate((el) => {
    if (!(el instanceof HTMLElement)) throw new Error("The crease must be an HTML element");
    const crease = el;
    crease.style.transition = "none";
    crease.style.opacity = "0.25";
    return Number(getComputedStyle(crease).opacity);
  });
  expect(opacity).toBe(0.25);
});

test("reduced motion ends every replay, including crease opacity", async ({ page }) => {
  await page.evaluate(() => {
    window.reorderGlides.reorder();
    window.reorderGlides.pause();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => page.evaluate(() => window.reorderGlides.animations()), { timeout: 3000 })
    .toBe(0);
});

test("removing the board cancels its remaining replays", async ({ page }) => {
  await page.evaluate(() => window.reorderGlides.reorder());
  expect(await page.evaluate(() => window.reorderGlides.remove())).toBe(0);
});
