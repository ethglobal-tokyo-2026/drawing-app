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

test("a foil holds still under a still light, and its bands slide as the light moves", async ({
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

  // The light holds where the last click left it, and nothing on the foil moves.
  await expect.poll(() => runningOn(foil)).toBe(0);
  const still = await bandPixels(page, foil);
  await page.waitForTimeout(500);
  expect((await bandPixels(page, foil)).equals(still)).toBe(true);

  // A mouse swings the light across the top of the screen, and the bands slide with it.
  const screen = page.viewportSize();
  if (!screen) throw new Error("The page has no viewport");
  await page.mouse.move(0, 0);
  await expect.poll(() => runningOn(foil)).toBe(0);
  const left = await bandPixels(page, foil);
  await page.mouse.move(screen.width - 1, 0, { steps: 4 });
  await expect.poll(() => runningOn(foil)).toBe(0);
  expect((await bandPixels(page, foil)).equals(left)).toBe(false);
});
