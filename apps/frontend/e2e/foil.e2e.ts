import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { drawAndSeal, drawKeyName, openDetail, say, signIn, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { ui } = strings;
const language = "en";

test.use({ ...ipad, viewport: { width: 1180, height: 820 } });

/** How many animations and transitions run on a foil and its parts. */
const runningOn = (foil: Locator) =>
  foil.evaluate((el) => el.getAnimations({ subtree: true }).length);

/** The screen over a foil's band, as it looks now. */
async function bandPixels(page: Page, foil: Locator) {
  const box = await foil.locator(".sticker-foil__band").boundingBox();
  if (!box) throw new Error("The foil's band isn't on screen");
  return page.screenshot({ clip: box });
}

/** Shares a device tilt with the app, and waits for the foil to reach that light and settle. */
async function tiltLight(page: Page, foil: Locator, gamma: number, lx: string) {
  await page.evaluate((gamma) => {
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma, beta: 40 }));
  }, gamma);
  await expect(foil.locator(".sticker-foil__sheen")).toHaveCSS("--lx", lx);
  await expect.poll(() => runningOn(foil)).toBe(0);
}

/** Mouse and Apple Pencil hover and contact leave the foil's current band pixels unchanged. */
async function ignorePointers(page: Page, foil: Locator, still: Buffer) {
  const screen = page.viewportSize();
  if (!screen) throw new Error("The page has no viewport");
  for (const pointerType of ["mouse", "pen"]) {
    for (const type of ["pointermove", "pointerdown"]) {
      await test.step(`${pointerType} ${type} leaves the foil still`, async () => {
        await foil.dispatchEvent(type, {
          pointerType,
          pointerId: pointerType === "pen" ? 2 : 1,
          buttons: type === "pointerdown" ? 1 : 0,
          clientX: type === "pointermove" ? 0 : screen.width - 1,
          clientY: type === "pointermove" ? 0 : screen.height - 1,
        });
        // Wait past a pointer-driven write and transition, so a delayed change cannot pass as still.
        await page.waitForTimeout(500);
        await expect.poll(() => runningOn(foil)).toBe(0);
        expect((await bandPixels(page, foil)).equals(still)).toBe(true);
        if (type === "pointerdown")
          await foil.dispatchEvent("pointerup", {
            pointerType,
            pointerId: pointerType === "pen" ? 2 : 1,
            buttons: 0,
          });
      });
    }
  }
}

test("a foil follows only device tilt, holding still through mouse and Apple Pencil hover and contact", async ({
  page,
}) => {
  await signIn(page, "foil", language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  const { card, no } = await drawAndSeal(page, language, { nsfw: true });
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const foil = (await openDetail(page, language, no)).locator(".sticker-foil--pink");
  // The image, its resin and the glint follow the light too, so they're hidden: only the bands count.
  await page.addStyleTag({
    content: ".sticker-foil ~ *, .sticker-foil__glint { visibility: hidden !important; }",
  });
  // A copy of the sticker flies from the board to its place in the detail, over it, until it lands.
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);

  // Before the sensor shares a tilt, the foil holds its default light.
  await expect.poll(() => runningOn(foil)).toBe(0);
  const still = await bandPixels(page, foil);
  await page.waitForTimeout(500);
  expect((await bandPixels(page, foil)).equals(still)).toBe(true);
  await ignorePointers(page, foil, still);

  // Device tilt swings the light across the screen, and the bands slide with it.
  await tiltLight(page, foil, -32, "-1.000");
  const left = await bandPixels(page, foil);
  await tiltLight(page, foil, 32, "1.000");
  const right = await bandPixels(page, foil);
  expect(right.equals(left)).toBe(false);
  await ignorePointers(page, foil, right);
});
