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
import { FINGERTIP, hand, inkedPixels, pencil, type At } from "./pen.ts";

const { stickerCreation: creation, stickerBoard } = strings;
const copy = creation.layers;
const evidence = fileURLToPath(
  new URL("../../../data/verification/any-layer-drag-2026-10-13/", import.meta.url),
);
const menu = (page: Page) => page.locator(".layer-add-menu");
const settings = (page: Page) => page.locator(".layer-options-bar");
const list = (page: Page) => page.locator(".layer-list");
const scrollControls = (page: Page) => page.locator(".layer-scroll-controls");
const scrollButton = (page: Page, direction: "up" | "down") =>
  scrollControls(page).locator(`button[data-direction="${direction}"]`);

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
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 100));
}

/** Removes the first-use explanation before testing the chip underneath it. */
async function dismissHint(page: Page, language: Language = "en") {
  const dismiss = button(page, copy.dismissOptionsHint, language);
  if (await dismiss.isVisible()) await dismiss.click();
}

/** Chips entirely inside the list's scroll viewport, rather than merely present in its DOM. */
async function visibleLayers(page: Page) {
  return list(page).evaluate((el) => {
    const viewport = el.getBoundingClientRect();
    return [...el.querySelectorAll<HTMLElement>("[data-layer-chip]")].flatMap((chip) => {
      const box = chip.getBoundingClientRect();
      return box.top >= viewport.top && box.bottom <= viewport.bottom
        ? [Number(chip.dataset.layerChip)]
        : [];
    });
  });
}

/** Reads the scroll position before a frame updates the arrow's disabled state. */
async function atScrollEnd(page: Page, direction: "up" | "down") {
  return list(page).evaluate(
    (el, direction) =>
      direction === "up"
        ? el.scrollTop <= 1
        : el.scrollTop + el.clientHeight >= el.scrollHeight - 1,
    direction,
  );
}

/** The options' content can reflow before ResizeObserver keeps its paper above the scroll controls. */
async function expectOptionsAboveScrollControls(page: Page) {
  await expect
    .poll(
      () =>
        settings(page).evaluate((bar) => {
          const controls = bar.closest(".layer-column")?.querySelector(".layer-scroll-controls");
          if (!controls) throw new Error("The open layer options have no scroll controls");
          return bar.getBoundingClientRect().bottom - controls.getBoundingClientRect().top;
        }),
      { timeout: 2000 },
    )
    .toBeLessThanOrEqual(0);
}

/** Opens a Japanese sheet with the layer column mirrored for a left drawing hand. */
async function openJapaneseLeftSheet(page: Page, name: string) {
  await signIn(page, name, "en");
  const note = await openSettings(page, "en");
  await expect(page.locator(".board-front")).toHaveAttribute("data-away", "");
  await note
    .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, "en") })
    .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, "en") })
    .click();
  await chooseLanguage(page, "en", "ja");
  await button(page, stickerBoard.statBoard.flipBack, "ja").click();
  await expect(page.locator(".board-front")).not.toHaveAttribute("inert");
  const spent = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/tickets/spend",
  );
  await page.getByRole("button", { name: drawKeyName("ja", 3) }).click();
  const response = await spent;
  expect(response.status()).toBe(201);
  await response.finished();
  await canvas(page, "ja").hover();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText(say(creation.timer.note.startsWhenYouDraw, "ja")).first(),
  ).toBeVisible();
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

test("a quick mouse drag reorders an unselected layer and keeps options available after release", async ({
  page,
}, testInfo) => {
  await openSheet(page, "layer-mouse-drag");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 1);
  const to = await center(page, 2);
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y - 12);
  await expect.poll(() => chip(page, 1).evaluate((el) => el.style.transform)).toContain("scale(");
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "false");
  await expect(settings(page)).toBeVisible();
  await chip(page, 2).evaluate((el) => el.focus({ preventScroll: true }));
  await expect(chip(page, 2)).toBeFocused();
  const [liftedZ, selectedZ] = await Promise.all([
    chip(page, 1).evaluate((el) => Number(getComputedStyle(el).zIndex)),
    chip(page, 2).evaluate((el) => Number(getComputedStyle(el).zIndex)),
  ]);
  expect(liftedZ).toBeGreaterThan(selectedZ);
  await capture(page, "phone-unselected-drag-preview-options", testInfo);
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([1, 2]);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-expanded", "true");
  await expect(settings(page)).toBeVisible();
  await capture(page, "phone-unselected-mouse-reordered-options", testInfo);
  await undo(page).click();
  await expect.poll(() => order(page)).toEqual([2, 1]);
});

test("a quick touch drag reorders an unselected layer with native Chromium touch and WebKit's pointer fallback", async ({
  page,
}) => {
  await openSheet(page, "layer-touch-drag");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 1);
  const to = await center(page, 2);
  const fingers = await hand(page);
  const contact = { ...from, id: 1, radius: FINGERTIP };
  await expect(chip(page, 1)).toHaveCSS("touch-action", "none");
  await freeze(page);
  await fingers.down([contact]);
  await fingers.move([{ ...contact, y: from.y - 16 }]);
  await page.clock.runFor(32);
  await expect.poll(() => chip(page, 1).evaluate((el) => el.style.transform)).toContain("scale(");
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "false");
  await expect(settings(page)).toBeVisible();
  await fingers.move([{ ...contact, ...to }]);
  await page.clock.runFor(32);
  await expect
    .poll(async () => {
      const now = await center(page, 1);
      return Math.abs(now.y - to.y);
    })
    .toBeLessThan(1);
  await fingers.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([1, 2]);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-expanded", "true");
  await expect(settings(page)).toBeVisible();
});

test("a tablet pen can reorder an unselected layer without selecting it during the preview", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openSheet(page, "layer-any-pen");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 1);
  const to = await center(page, 2);
  const pen = await pencil(page);
  await freeze(page);
  await pen.hover(from);
  await pen.down(from, 0.5);
  await pen.move({ ...from, y: from.y - 12 }, 0.5);
  await expect.poll(() => chip(page, 1).evaluate((el) => el.style.transform)).toContain("scale(");
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "false");
  await expect(settings(page)).toBeVisible();
  const [liftedZ, selectedZ] = await Promise.all([
    chip(page, 1).evaluate((el) => Number(getComputedStyle(el).zIndex)),
    chip(page, 2).evaluate((el) => Number(getComputedStyle(el).zIndex)),
  ]);
  expect(liftedZ).toBeGreaterThan(selectedZ);
  await pen.move(to, 0.5);
  await pen.up(to);
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([1, 2]);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-expanded", "true");
  await expect(settings(page)).toBeVisible();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await capture(page, "tablet-unselected-pen-reordered-options", testInfo);
});

test("Escape cancels an unselected layer's drag without changing the selected layer or its options", async ({
  page,
}) => {
  await openSheet(page, "layer-unselected-cancel");
  await createLayer(page);
  await dismissHint(page);
  await options(page, 2);
  const from = await center(page, 1);
  const to = await center(page, 2);
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y - 12);
  await expect.poll(() => chip(page, 1).evaluate((el) => el.style.transform)).toContain("scale(");
  await page.mouse.move(to.x, to.y);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.clock.runFor(200);
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 2)).toHaveAttribute("aria-expanded", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "false");
  await expect(settings(page)).toBeVisible();
});

test("horizontal movement abandons the drag even if the pointer then moves vertically", async ({
  page,
}) => {
  await openSheet(page, "layer-horizontal-slop");
  await createLayer(page);
  await dismissHint(page);
  const from = await center(page, 1);
  const to = await center(page, 2);
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 1);
  await page.mouse.move(to.x + 12, to.y);
  await page.clock.runFor(450);
  await expect.poll(() => chip(page, 1).evaluate((el) => el.style.transform)).toBe("");
  await page.mouse.up();
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
});

test("small movement on an unselected layer remains a tap that selects it", async ({ page }) => {
  await openSheet(page, "layer-any-tap");
  await createLayer(page);
  await dismissHint(page);
  const from = await center(page, 1);
  await freeze(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y - 5);
  await page.mouse.up();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => order(page)).toEqual([2, 1]);
  await expect(settings(page)).toBeHidden();
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

test("a short phone's scroll arrows reach all ten layers without reordering, selecting, or making marks", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSheet(page, "layer-short-scroll");
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await createLayer(page);
    if (id === 2) await dismissHint(page);
  }
  const unchanged = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  await expect(scrollControls(page)).toBeVisible();
  await expect(scrollButton(page, "up")).toHaveAccessibleName(copy.scrollUp.en);
  await expect(scrollButton(page, "down")).toHaveAccessibleName(copy.scrollDown.en);
  await expect(scrollButton(page, "up")).toBeDisabled();
  const box = await scrollControls(page).boundingBox();
  if (!box) throw new Error("The short phone's layer scroll controls have no box");
  expect(box.width).toBe(88);
  expect(box.height).toBe(44);
  for (const direction of ["up", "down"] as const) {
    const buttonBox = await scrollButton(page, direction).boundingBox();
    if (!buttonBox) throw new Error(`The layer scroll ${direction} button has no box`);
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  }
  const reached = new Set(await visibleLayers(page));
  for (let press = 0; press < MAX_LAYERS && !(await atScrollEnd(page, "down")); press++) {
    const before = await list(page).evaluate((el) => el.scrollTop);
    await scrollButton(page, "down").click();
    await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    for (const id of await visibleLayers(page)) reached.add(id);
    await expect.poll(() => order(page)).toEqual(unchanged);
    await expect(chip(page, 10)).toHaveAttribute("aria-selected", "true");
  }
  await expect(scrollButton(page, "down")).toBeDisabled();
  expect([...reached].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await expect(chip(page, 1)).toBeInViewport();
  await options(page, 1);
  await expectOptionsAboveScrollControls(page);
  await capture(page, "short-phone-ten-layer-scroll-controls-options", testInfo);
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await canvas(page, "en").hover();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => visibleLayers(page)).toContain(1);
  await options(page, 1);
  await expectOptionsAboveScrollControls(page);
  await capture(page, "short-phone-restored-bottom-layer-options", testInfo);
  for (let press = 0; press < MAX_LAYERS && !(await atScrollEnd(page, "up")); press++) {
    const before = await list(page).evaluate((el) => el.scrollTop);
    await scrollButton(page, "up").click();
    await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBeLessThan(before);
  }
  await expect(scrollButton(page, "up")).toBeDisabled();
  await expect(chip(page, 10)).toBeInViewport();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => order(page)).toEqual(unchanged);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
});

test("short Japanese left-hand scroll controls expand toward the sheet and stay below layer options", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openJapaneseLeftSheet(page, "layer-short-jp");
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await createLayer(page, "above", "ja");
    if (id === 2) await dismissHint(page, "ja");
  }
  await expect(page.locator(".layer-column")).toHaveAttribute("data-edge", "right");
  await expect(scrollButton(page, "up")).toHaveAccessibleName(say(copy.scrollUp, "ja"));
  await expect(scrollButton(page, "down")).toHaveAccessibleName(say(copy.scrollDown, "ja"));
  for (let press = 0; press < MAX_LAYERS && !(await atScrollEnd(page, "down")); press++) {
    const before = await list(page).evaluate((el) => el.scrollTop);
    await scrollButton(page, "down").click();
    await expect.poll(() => list(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
  }
  await expect(scrollButton(page, "down")).toBeDisabled();
  await chip(page, 1).click();
  await chip(page, 1).click();
  await expect(settings(page)).toBeVisible();
  const [controls, layer] = await Promise.all([
    scrollControls(page).boundingBox(),
    chip(page, 1).boundingBox(),
  ]);
  if (!controls || !layer) throw new Error("The mirrored layer controls have no box");
  expect(controls.x).toBeLessThan(layer.x);
  expect(controls.x + controls.width).toBeGreaterThanOrEqual(layer.x + layer.width);
  expect(controls.x).toBeGreaterThanOrEqual(0);
  expect(controls.x + controls.width).toBeLessThanOrEqual(320);
  await expectOptionsAboveScrollControls(page);
  await expect.poll(() => order(page)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await capture(page, "short-phone-left-hand-japanese-scroll-controls-options", testInfo);
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
