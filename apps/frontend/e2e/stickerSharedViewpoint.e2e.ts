import { expect, test, type Page } from "@playwright/test";
import { FINGERTIP, hand } from "./pen";
import { tiltScreen } from "./screenTilt";

test.use({ deviceScaleFactor: 2, hasTouch: true, isMobile: true });

/** Each matching material canvas's pixels as a digest, once a requested redraw has had its frame. */
async function digests(page: Page, selector: string) {
  return page.evaluate(async (selector) => {
    for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
    return Promise.all(
      [...document.querySelectorAll<HTMLCanvasElement>(selector)].map(async (canvas) => {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("A sticker material canvas has no 2D context");
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        return [...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels))].join(",");
      }),
    );
  }, selector);
}

/** One fixed pose for the whole test, given as the sensors give it, once the light has landed on it. */
async function holdPose(page: Page) {
  await tiltScreen(page, 55, 0);
  // The material draws each pose the light publishes; it holds once two frames publish the same.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { currentLight } = await import("../src/stickers/light.ts");
        const before = JSON.stringify(currentLight());
        await new Promise((frame) => requestAnimationFrame(() => requestAnimationFrame(frame)));
        return JSON.stringify(currentLight()) === before;
      }),
    )
    .toBe(true);
}

/** Once a let-go sticker has stuck: it has stopped moving, and the crease it was given has shown. */
async function whenStuck(page: Page, id: string) {
  const sticker = page.locator(`[data-sticker-id="${id}"]`);
  await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
  await sticker.evaluate((el) =>
    Promise.allSettled(el.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
  await expect(sticker.locator("[data-crease-reveal]")).toHaveCount(0);
}

test("identical stickers at different places on screen reflect one room differently", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Two at 240 px don't fit side by side here, so the second sits below the first.
  await page.goto("/e2e/stickerLaminate.html?count=2&side=240");
  const stickers = "[data-sticker] canvas.sticker-material";
  await expect(page.locator(`${stickers}[data-state=ready]`)).toHaveCount(2);
  await holdPose(page);
  const [first, second] = await digests(page, stickers);
  expect(second).not.toBe(first);
});

test("a dragged sticker's reflection follows it, and it keeps the reflection of where it's let go", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerBoardDrag.html");
  await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(15);
  await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
  await holdPose(page);
  // A small sticker at the board's right edge, clear of the overlapping middle.
  const id = "large-drag-6";
  const material = `[data-sticker-id="${id}"] canvas.sticker-material`;
  const box = await page.locator(`[data-sticker-id="${id}"]`).boundingBox();
  if (!box) throw new Error(`${id} isn't on the board`);
  const contact = { id: 1, radius: FINGERTIP, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const finger = await hand(page);
  await finger.down([contact]);
  for (let step = 1; step <= 3; step++)
    await finger.move([{ ...contact, x: contact.x - step * 10 }]);
  await expect(page.locator(".board-stage")).toHaveAttribute("data-held", id);
  await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
  const [held] = await digests(page, material);
  // Along the top, clear of the stickers in the middle.
  for (let step = 1; step <= 10; step++)
    await finger.move([{ ...contact, x: contact.x - 30 - step * 30 }]);
  const [carried] = await digests(page, material);
  expect(carried, "Carried across the board, it reflects the room from where it is").not.toBe(held);
  await finger.up();
  await expect(page.locator(".board-stage")).toHaveAttribute("data-held", "");
  await whenStuck(page, id);
  const [placed] = await digests(page, material);
  // A resize redraws every surface for the same pose: what it shows already is its new spot's.
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  const [redrawn] = await digests(page, material);
  expect(redrawn, "Let go, it shows its new spot's reflection with no pose change").toBe(placed);
});
