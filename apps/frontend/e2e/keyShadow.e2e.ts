import { expect, test, type Page } from "@playwright/test";

test.use({
  viewport: { width: 1032, height: 1376 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

/** A phone that shares its tilt once asked, so readings move the light. */
async function openBoard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    // WebKit reports a portrait page's screen turned, and a turned screen turns the room.
    if (typeof ScreenOrientation === "function")
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        get: () => 0,
        configurable: true,
      });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
  });
  await page.goto("/e2e/stickerBoardDrag.html");
  await expect(page.locator(".placed-sticker .sticker-figure").first()).toBeVisible();
  expect(await page.evaluate(() => window.stickerBoardDragFixture.askForMotion())).toBe("granted");
}

/**
 * After a reading lands, where a board sticker's key shadow sits against its figure, in CSS px, beside
 * the shoji's direction on screen.
 */
async function shadowAt(page: Page, beta: number, gamma: number) {
  await page.evaluate(([b, g]) => window.stickerBoardDragFixture.tilt(b, g), [beta, gamma]);
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const shadow = document.querySelector<HTMLElement>(".placed-sticker .sticker-key-shadow");
    if (!shadow) throw new Error("The board has no sticker with a key shadow");
    const cast = shadow.getBoundingClientRect();
    // Where it would sit unmoved: straight under its sticker's silhouette.
    shadow.style.transform = "none";
    const under = shadow.getBoundingClientRect();
    shadow.style.transform = "";
    const [x, y] = window.stickerBoardDragFixture.roomLight();
    return { offset: [cast.left - under.left, cast.top - under.top], light: [x, y] };
  });
}

test("a sticker's key shadow falls away from the room's light at every pose", async ({ page }) => {
  await openBoard(page);
  for (const [beta, gamma] of [
    [47, 0],
    [20, 0],
    [47, 25],
    [47, -25],
    [90, 0],
  ]) {
    const { offset, light } = await shadowAt(page, beta, gamma);
    const length = Math.hypot(offset[0], offset[1]);
    const away = -(offset[0] * light[0] + offset[1] * light[1]) / (length * Math.hypot(...light));
    expect(length, `β ${beta}, γ ${gamma}: the key shadow moved off its sticker`).toBeGreaterThan(
      0.1,
    );
    expect(
      away,
      `β ${beta}, γ ${gamma}: the key shadow points away from the light`,
    ).toBeGreaterThan(0.99);
  }
});
