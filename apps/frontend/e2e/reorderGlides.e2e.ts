import { expect, test } from "@playwright/test";
import type {} from "./reorderGlides";
import { tiltScreen } from "./screenTilt.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/reorderGlides.html");
  await page.waitForFunction(() => Boolean(window.reorderGlides));
  await page.evaluate(() => window.reorderGlides.start());
  await expect.poll(() => page.evaluate(() => window.reorderGlides.transitions())).toBe(4);
});

test("reordering preserves a laminate film's light glide through repeated moves", async ({
  page,
}) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { before, after, replays } = await page.evaluate(() => window.reorderGlides.reorder());
    expect(before[0]).toBe(40);
    expect(after[0]).toBeCloseTo(before[0], 2);
    expect(replays).toBeGreaterThan(0);
  }
  // The first reading sets the light's reference; the second tilts the phone from it.
  await tiltScreen(page, 40, 0);
  await tiltScreen(page, 40, -32);
  await expect
    .poll(async () => (await page.evaluate(() => window.reorderGlides.positions()))[0])
    .toBe(-100);
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
