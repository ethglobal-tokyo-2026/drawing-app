import { MAX_LAYERS } from "@drawing-app/api/client";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { add, button, chip, createLayer, openSheet, options, undo } from "./fillHelpers.ts";
import {
  canvas,
  chooseLanguage,
  drawKeyName,
  drawStroke,
  openSettings,
  say,
  signIn,
} from "./helpers.ts";
import { FINGERTIP, hand, type At } from "./pen.ts";

const { stickerCreation: creation, stickerBoard } = strings;
const copy = creation.layers;
const evidence = fileURLToPath(
  new URL("../../../data/verification/layer-interactions-2026-10-12/", import.meta.url),
);
const menu = (page: Page) => page.locator(".layer-add-menu");
const settings = (page: Page) => page.locator(".layer-options-bar");
const list = (page: Page) => page.locator(".layer-list");

/** The displayed order, from the front layer at the top to the back layer at the foot. */
async function order(page: Page) {
  return list(page)
    .locator("[data-layer-chip]")
    .evaluateAll((chips) => chips.map((el) => Number(el.getAttribute("data-layer-chip"))));
}

/** A chip's center before transforms move it. */
async function center(page: Page, id: number): Promise<At> {
  const box = await chip(page, id).boundingBox();
  if (!box) throw new Error(`Layer ${id} has no visible chip`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Freezes hold timers so activation can only come from movement. */
async function freeze(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
}

/** Removes the first-use explanation before testing the chip underneath it. */
async function dismissHint(page: Page) {
  const dismiss = button(page, copy.dismissOptionsHint);
  if (await dismiss.isVisible()) await dismiss.click();
}

/** A spoken clock status, with only its remaining time allowed to vary. */
function status(reason: keyof typeof creation.timer.status, language: Language = "en") {
  return new RegExp(
    `^${say(creation.timer.status[reason], language, { time: "TIME" }).replace("TIME", "\\d+:\\d\\d")}$`,
  );
}

async function capture(page: Page, name: string, testInfo: TestInfo) {
  await mkdir(evidence, { recursive: true });
  const path = `${evidence}/${testInfo.project.name}-${name}.png`;
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test("Create above and Create below insert beside the selected layer and survive Undo and Redo", async ({
  page,
}) => {
  await openSheet(page, "layer-placement");
  await createLayer(page);
  await dismissHint(page);
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await chip(page, 1).click();
  await createLayer(page, "below");
  await expect.poll(() => order(page)).toEqual([2, 1, 3]);
  await expect(chip(page, 3)).toHaveAttribute("aria-selected", "true");
  await expect(menu(page)).toBeHidden();
  await undo(page).click();
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await button(page, creation.history.redo).click();
  await expect.poll(() => order(page)).toEqual([2, 1, 3]);
  await expect(chip(page, 3)).toHaveAttribute("aria-selected", "true");
  await createLayer(page);
  await expect.poll(() => order(page)).toEqual([2, 1, 4, 3]);
  await expect(chip(page, 4)).toHaveAttribute("aria-selected", "true");
});

test("the New layer menu pauses a running clock until Escape dismisses it", async ({
  page,
}, testInfo) => {
  await openSheet(page, "layer-menu-clock");
  await drawStroke(page, "en", 0.35);
  await expect(page.locator(".timer-dot")).toHaveAccessibleDescription(status("running"));
  await add(page).click();
  await expect(menu(page)).toHaveAttribute("role", "menu");
  await expect(page.getByRole("menuitem", { name: copy.createAbove.en })).toBeFocused();
  await expect(page.locator(".timer-dot")).toHaveAccessibleDescription(status("layerOptions"));
  const held = await page.locator(".timer-time").textContent();
  if (!held) throw new Error("The layer menu's paused clock has no time");
  await freeze(page);
  await page.clock.runFor(1500);
  await expect(page.locator(".timer-time")).toHaveText(held);
  await capture(page, "phone-new-layer-menu", testInfo);
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(add(page)).toBeFocused();
  await expect(page.locator(".timer-dot")).toHaveAccessibleDescription(status("running"));
  await page.clock.runFor(1500);
  await expect(page.locator(".timer-time")).not.toHaveText(held);
  await expect.poll(() => order(page)).toEqual([1]);
});

test("a quick mouse drag reorders the selected layer and leaves its options open after release", async ({
  page,
}) => {
  await openSheet(page, "layer-mouse-drag");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 2);
  const to = await center(page, 1);
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 12);
  await expect.poll(() => chip(page, 2).evaluate((el) => el.style.transform)).toContain("scale(");
  await expect(settings(page)).toBeVisible();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([1, 2]);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 2)).toHaveAttribute("aria-expanded", "true");
  await expect(settings(page)).toBeVisible();
  await undo(page).click();
  await expect.poll(() => order(page)).toEqual([2, 1]);
});

test("a quick touch drag reorders and preserves options with native Chromium touch and WebKit's pointer fallback", async ({
  page,
}) => {
  await openSheet(page, "layer-touch-drag");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 2);
  const to = await center(page, 1);
  const fingers = await hand(page);
  const contact = { ...from, id: 1, radius: FINGERTIP };
  await expect(chip(page, 2)).toHaveCSS("touch-action", "none");
  await freeze(page);
  await fingers.down([contact]);
  await fingers.move([{ ...contact, y: from.y + 16 }]);
  await page.clock.runFor(32);
  await expect.poll(() => chip(page, 2).evaluate((el) => el.style.transform)).toContain("scale(");
  await expect(settings(page)).toBeVisible();
  await fingers.move([{ ...contact, ...to }]);
  await page.clock.runFor(32);
  await expect
    .poll(async () => {
      const now = await center(page, 2);
      return Math.abs(now.y - to.y);
    })
    .toBeLessThan(1);
  await fingers.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([1, 2]);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 2)).toHaveAttribute("aria-expanded", "true");
  await expect(settings(page)).toBeVisible();
});

test("small pointer movement keeps the selected layer's tap available to open and close options", async ({
  page,
}) => {
  await openSheet(page, "layer-tap-slop");
  await createLayer(page);
  await dismissHint(page);
  await freeze(page);
  const from = await center(page, 2);
  for (const expanded of ["true", "false"]) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, from.y + 5);
    await page.mouse.up();
    await expect(chip(page, 2)).toHaveAttribute("aria-expanded", expanded);
  }
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await expect(settings(page)).toBeHidden();
});

test("a ten-layer phone scrolls under the dragged layer without dismissing its options", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await openSheet(page, "layer-scroll-drag");
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await createLayer(page);
    if (id === 2) await dismissHint(page);
  }
  await expect(page.locator(".layer-scroll-well")).toHaveAttribute("data-overflow", "true");
  await options(page, 10);
  const from = await center(page, 10);
  const box = await list(page).boundingBox();
  if (!box) throw new Error("The overflowing layer list has no box");
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 12);
  await page.mouse.move(from.x, box.y + box.height - 3);
  await page.clock.runFor(1200);
  await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect(settings(page)).toBeVisible();
  await page.mouse.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 10]);
  await expect(chip(page, 10)).toHaveAttribute("aria-expanded", "true");
  await expect(chip(page, 10)).toBeInViewport();
  await expect(settings(page)).toBeVisible();
  await capture(page, "phone-ten-layer-reordered-options", testInfo);
});

test("keyboard Redo restores the tenth layer and releases the menu pause without another mark", async ({
  page,
}) => {
  await openSheet(page, "layer-maximum-redo");
  await drawStroke(page, "en", 0.35);
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await createLayer(page);
    if (id === 2) await dismissHint(page);
  }
  await expect(add(page)).toBeDisabled();
  await undo(page).click();
  await expect(list(page).locator("[data-layer-chip]")).toHaveCount(9);
  await add(page).click();
  await expect(menu(page)).toBeVisible();
  await expect(page.locator(".timer-dot")).toHaveAccessibleDescription(status("layerOptions"));
  await page.keyboard.press("Control+Shift+Z");
  await expect(list(page).locator("[data-layer-chip]")).toHaveCount(10);
  await expect(chip(page, 10)).toHaveAttribute("aria-selected", "true");
  await expect(add(page)).toBeDisabled();
  await expect(menu(page)).toBeHidden();
  await expect(page.locator(".drawing-screen")).not.toHaveClass(/has-panel/);
  await expect(page.locator(".timer-dot")).toHaveAccessibleDescription(status("running"));
});

test.describe("on a large screen", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the Japanese New layer menu stays beside the mirrored column", async ({
    page,
  }, testInfo) => {
    await signIn(page, "layer-menu-japanese", "en");
    const note = await openSettings(page, "en");
    await expect(page.locator(".board-front")).toHaveAttribute("data-away", "");
    await note
      .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, "en") })
      .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, "en") })
      .click();
    await chooseLanguage(page, "en", "ja");
    await button(page, stickerBoard.statBoard.flipBack, "ja").click();
    await expect(page.locator(".board-front")).not.toHaveAttribute("inert");
    await page.getByRole("button", { name: drawKeyName("ja", 3) }).click();
    await canvas(page, "ja").hover();
    await expect(chip(page, 1)).toBeVisible();
    await button(page, copy.add, "ja").click();
    await expect(menu(page)).toBeVisible();
    await expect(page.getByRole("menuitem", { name: say(copy.createAbove, "ja") })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: say(copy.createBelow, "ja") })).toBeVisible();
    await expect(page.locator(".layer-column")).toHaveAttribute("data-edge", "right");
    const [menuBox, addBox] = await Promise.all([
      menu(page).boundingBox(),
      page.locator(".layer-add").boundingBox(),
    ]);
    if (!menuBox || !addBox) throw new Error("The Japanese layer menu or its button has no box");
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(addBox.x);
    expect(menuBox.y).toBeGreaterThanOrEqual(0);
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(900);
    await capture(page, "large-left-hand-japanese-new-layer-menu", testInfo);
  });
});
