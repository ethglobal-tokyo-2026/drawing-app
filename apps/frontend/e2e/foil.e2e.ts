import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { drawAndSeal, drawKeyName, openDetail, say, signIn, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { ui } = strings;
const language = "en";

test.use({ ...ipad, viewport: { width: 1180, height: 820 } });

/** Waits for the light to land: the material draws each pose it publishes, and it stops at its aim. */
const lightAtRest = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(async () => {
        const { currentLight } = await import("../src/stickers/light.ts");
        const before = JSON.stringify(currentLight());
        await new Promise((frame) => requestAnimationFrame(() => requestAnimationFrame(frame)));
        return JSON.stringify(currentLight()) === before;
      }),
    )
    .toBe(true);

/** The screen over a foil's band, as it looks now. */
async function bandPixels(page: Page, foil: Locator) {
  const box = await foil.locator("..").locator("canvas.sticker-material").boundingBox();
  if (!box) throw new Error("The foil's band isn't on screen");
  return page.screenshot({ clip: box });
}

/**
 * Shares a device reading that holds the screen at `beta` and `gamma` in its displayed axes,
 * whichever way the screen is turned, and waits for the light to reach that pose and land.
 */
async function tiltLight(page: Page, beta: number, gamma: number) {
  await page.evaluate(
    async ({ beta, gamma }) => {
      const { readAt } = await import("../src/stickers/lightMode.ts");
      const reported = screen.orientation?.angle ?? Reflect.get(window, "orientation");
      const angle = typeof reported === "number" && Number.isFinite(reported) ? reported : 0;
      const reading = readAt({ beta, gamma, screenAngle: 0 }, angle);
      window.dispatchEvent(
        Object.assign(new Event("deviceorientation"), {
          alpha: 0,
          beta: reading.beta,
          gamma: reading.gamma,
        }),
      );
    },
    { beta, gamma },
  );
  await expect
    .poll(() =>
      page.evaluate(
        async ({ beta, gamma }) => {
          const { currentLight } = await import("../src/stickers/light.ts");
          const { upOnScreen } = await import("../src/stickers/lightMode.ts");
          const aim = upOnScreen({ beta, gamma, screenAngle: 0 });
          return upOnScreen(currentLight()).every((v, i) => Math.abs(v - aim[i]) < 1e-6);
        },
        { beta, gamma },
      ),
    )
    .toBe(true);
  await lightAtRest(page);
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
        await lightAtRest(page);
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
  // The complete material contains the paper and foil in the same held orientation.
  await expect(foil.locator("..").locator("canvas.sticker-material")).toHaveAttribute(
    "data-foil",
    "true",
  );
  // A copy of the sticker flies from the board to its place in the detail, over it, until it lands.
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);

  // Before the sensor shares a tilt, the foil holds the still pose's light.
  await lightAtRest(page);
  expect(
    await page.evaluate(async () => (await import("../src/stickers/light.ts")).currentLight()),
  ).toEqual({ beta: 55, gamma: 0, screenAngle: 0 });
  const still = await bandPixels(page, foil);
  await page.waitForTimeout(500);
  expect((await bandPixels(page, foil)).equals(still)).toBe(true);
  await ignorePointers(page, foil, still);

  // The first reading moves the light to where the device really is, not to a neutral reference.
  await tiltLight(page, 40, 0);
  expect((await bandPixels(page, foil)).equals(still)).toBe(false);

  // Device tilt swings the light across the screen, and the complete reflection follows it.
  await tiltLight(page, 40, -25);
  const left = await bandPixels(page, foil);
  await tiltLight(page, 40, 25);
  const right = await bandPixels(page, foil);
  expect(right.equals(left)).toBe(false);
  await ignorePointers(page, foil, right);
});
