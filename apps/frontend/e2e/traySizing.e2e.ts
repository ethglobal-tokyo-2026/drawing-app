import { expect, type Locator } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { boardSticker, say, sealFromBoard, signIn, startsWith, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { stickerBoard } = strings;
const language = "en";
const phone = { width: 390, height: 844 };

test.use({ ...ipad, reducedMotion: "reduce" });

/** A sticker's image size before its sheet's scale and turn, and the aligned press area. */
const previewSize = (slot: Locator) =>
  slot.evaluate((el) => {
    const fit = el.querySelector<HTMLElement>(".tray__fit");
    if (!(el instanceof HTMLElement) || !fit)
      throw new Error("No sticker preview in its press area");
    return {
      w: parseFloat(fit.style.width),
      h: parseFloat(fit.style.height),
      pressW: parseFloat(el.style.width),
      pressH: parseFloat(el.style.height),
    };
  });

test("the iPad tray enlarges sticker previews by a quarter in both orientations and keeps phone sizes", async ({
  page,
}, info) => {
  await page.setViewportSize(phone);
  await signIn(page, "traysize", language);
  const nos: string[] = [];
  for (const reach of [0.6, 1.2]) {
    const no = await sealFromBoard(page, language, { reach });
    nos.push(no);
    await boardSticker(page, language, no).click();
    await page.getByRole("button", { name: say(stickerBoard.toolbar.remove, language) }).click();
    await expect(boardSticker(page, language, no)).toHaveCount(0);
  }
  const zipper = page.getByRole("button", {
    name: startsWith(say(stickerBoard.tray.zipper, language)),
  });
  // Remove opens the shut tray for the sticker's ride and zips it shut once it lands: opened before
  // that, it would shut under the checks below.
  await expect(zipper).toHaveAttribute("aria-expanded", "false");
  await zipper.press("ArrowDown");
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  const front = page.locator(".tray__stack .tray__sheet.is-top");
  const slots = front.locator('.tray__slot[data-state="here"]');
  await expect(slots).toHaveCount(2);
  const sizes = await Promise.all([previewSize(slots.nth(0)), previewSize(slots.nth(1))]);
  await page.screenshot({ path: info.outputPath("tray-phone.png") });

  for (const [orientation, viewport] of [
    ["portrait", ipad.viewport],
    ["landscape", { width: ipad.viewport.height, height: ipad.viewport.width }],
  ] as const) {
    await page.setViewportSize(viewport);
    // The open tray stays open as the screen turns.
    await expect(zipper).toHaveAttribute("aria-expanded", "true");
    await expect(slots).toHaveCount(2);
    for (const [i, before] of sizes.entries()) {
      const slot = slots.nth(i);
      await expect.poll(async () => (await previewSize(slot)).w).toBeCloseTo(before.w * 1.25, 0);
      const size = await previewSize(slot);
      expect(size.h).toBeCloseTo(before.h * 1.25, 0);
      expect(size.pressW).toBe(size.w);
      expect(size.pressH).toBe(size.h);
      await expect(slot).toBeInViewport({ ratio: 1 });
    }
    // Transparent image corners can interleave; the packing tests check clearance on the actual cuts.
    await page.screenshot({ path: info.outputPath(`tray-ipad-${orientation}.png`) });
  }

  await page.setViewportSize(phone);
  await expect.poll(async () => (await previewSize(slots.nth(0))).w).toBe(sizes[0].w);
  await page.setViewportSize(ipad.viewport);
  await expect
    .poll(async () => (await previewSize(slots.nth(0))).w)
    .toBeCloseTo(sizes[0].w * 1.25, 0);
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  await slots.nth(0).tap();
  await expect(boardSticker(page, language, nos[0])).toBeVisible();
});
