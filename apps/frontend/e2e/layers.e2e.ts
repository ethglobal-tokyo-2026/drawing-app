import { DAILY_TICKETS_PER_DAY, MAX_LAYERS } from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { LIFT_HOLD_MS } from "../src/sticker-creation/layers/useLayerDrag.ts";
import {
  canvas,
  drawKeyName,
  openDetail,
  openSealSheet,
  say,
  sealOnSheet,
  signIn,
} from "./helpers.ts";
import {
  along,
  at,
  FINGERTIP,
  hand,
  inkAt,
  inkShows,
  middle,
  pencil,
  penStroke,
  type At,
} from "./pen.ts";

const language = "en";
const { stickerCreation: creation, stickerBoard, ui } = strings;
const copy = creation.layers;
const chip = (page: Page, id: number) => page.locator(`[data-layer-chip="${id}"]`);
const button = (page: Page, name: { en: string; ja?: string }) =>
  page.getByRole("button", { name: say(name, language), exact: true });
const add = (page: Page) => button(page, copy.add);
const undo = (page: Page) => button(page, creation.history.undo);
const slider = (page: Page) =>
  page.getByRole("slider", { name: say(creation.opacitySlider.label, language) });

/** The sheet after its opening motion, with its first layer ready to take a mark. */
async function openSheet(page: Page) {
  await signIn(page, "layers", language);
  await button(page, { en: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  await canvas(page, language).hover();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
}

async function sheetBox(page: Page) {
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet is not visible");
  return box;
}

/** A horizontal mark well inside the sheet, clear of every layer control. */
async function line(page: Page, down: number, from = 0.3, to = 0.7) {
  const points = along(await sheetBox(page), down, from, to, 12);
  await penStroke(page, await pencil(page), points, () => 0.5, 8);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  return middle(points);
}

async function color(page: Page, name: "blue" | "red") {
  await button(page, creation.tools.color).click();
  const sheet = page.getByRole("dialog", { name: say(creation.colorSheet.title, language) });
  await sheet
    .getByRole("radiogroup", { name: say(creation.colorSheet.swatches, language) })
    .getByRole("radio", { name: say(creation.colorSheet.swatchNames[name], language), exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
}

/** The shown color at one point, compositing the visible canvases with their group's opacity. */
async function shownColor(page: Page, point: At) {
  return page.evaluate(({ x, y }) => {
    const sample = document.createElement("canvas");
    sample.width = sample.height = 1;
    try {
      const g = sample.getContext("2d", { willReadFrequently: true });
      if (!g) throw new Error("No context for the ink color sample");
      for (const ink of document.querySelectorAll<HTMLCanvasElement>(".ink-sheet .ink-canvas")) {
        const box = ink.getBoundingClientRect();
        if (
          !ink.width ||
          !ink.height ||
          !box.width ||
          !box.height ||
          getComputedStyle(ink).visibility !== "visible"
        )
          continue;
        let opacity = 1;
        for (let el: Element | null = ink; el; el = el.parentElement)
          opacity *= Number(getComputedStyle(el).opacity);
        g.globalAlpha = opacity;
        g.drawImage(
          ink,
          ((x - box.left) * ink.width) / box.width,
          ((y - box.top) * ink.height) / box.height,
          1,
          1,
          0,
          0,
          1,
          1,
        );
      }
      return [...g.getImageData(0, 0, 1, 1).data];
    } finally {
      sample.width = sample.height = 0;
    }
  }, point);
}

/** Two separated marks, on different layers: each can disappear without hiding the other. */
async function twoLayers(page: Page) {
  await openSheet(page);
  let lower = middle(along(await sheetBox(page), 0.35, 0.3, 0.7));
  await expect(async () => {
    lower = await line(page, 0.35);
    await inkShows(page, lower);
  }).toPass();
  await add(page).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  const upper = await line(page, 0.65);
  await inkShows(page, lower, upper);
  return { lower, upper };
}

/** Opens the selected layer's options; selecting another chip takes one separate tap. */
async function options(page: Page, id: number) {
  if ((await chip(page, id).getAttribute("aria-selected")) !== "true") await chip(page, id).click();
  if ((await chip(page, id).getAttribute("aria-expanded")) !== "true") await chip(page, id).click();
  await expect(button(page, copy.delete)).toBeVisible();
}

test("clear and delete affect the current layer, and undo restores its ink and selection", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await button(page, creation.tools.clear).click();
  await button(page, creation.clearBar.clear).click();
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await undo(page).click();
  await inkShows(page, lower, upper);

  await options(page, 2);
  await button(page, copy.delete).click();
  await expect(chip(page, 2)).toHaveCount(0);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await undo(page).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await inkShows(page, lower, upper);
});

test("a reload restores layer order, the selected layer, and both layers' marks", async ({
  page,
}) => {
  await twoLayers(page);
  await options(page, 2);
  await button(page, copy.moveBack).click();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: say(copy.movedBehind, language, { number: 2, other: 1 }) }),
  ).toBeVisible();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  const box = await sheetBox(page);
  await inkShows(page, middle(along(box, 0.35, 0.3, 0.7)), middle(along(box, 0.65, 0.3, 0.7)));
});

test("the board releases drawing canvases, and returning restores layers and redo", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await undo(page).click();
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await button(page, creation.myBoard).click();
  await expect(button(page, stickerBoard.board.continueDrawing)).toBeVisible();
  await expect(page.locator(".ink-sheet canvas")).toHaveCount(0);

  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await canvas(page, language).hover();
  const box = await sheetBox(page);
  const restoredLower = middle(along(box, 0.35, 0.3, 0.7));
  const restoredUpper = middle(along(box, 0.65, 0.3, 0.7));
  await inkShows(page, restoredLower);
  await expect.poll(() => inkAt(page, restoredUpper)).toBe(0);
  await button(page, creation.history.redo).click();
  await inkShows(page, restoredLower, restoredUpper);
});

test("layer setup survives a reload before the first mark, with the clock still waiting", async ({
  page,
}) => {
  await openSheet(page);
  await add(page).click();
  await options(page, 2);
  await button(page, copy.lock).click();
  await button(page, copy.moveBack).click();
  await chip(page, 2).click();
  await slider(page).press("ArrowDown");
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "95");
  const timer = button(page, creation.timer.label);
  await expect(timer).toBeVisible();
  const description = await timer.evaluate((dot) => {
    const id = dot.getAttribute("aria-describedby");
    return id ? document.getElementById(id)?.textContent : null;
  });
  if (!description) throw new Error("The waiting clock has no description");

  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 2)).toHaveClass(/is-locked/);
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "95");
  await expect(timer).toHaveAccessibleDescription(description);
  await chip(page, 1).click();
  await line(page, 0.5);
  await expect(button(page, creation.timer.pause)).toBeVisible();
});

test("opacity hides only its layer, hidden ink is blocked, and a double tap restores opacity", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  const thumb = slider(page).locator(".opacity-thumb");
  const box = await thumb.boundingBox();
  const track = await slider(page).boundingBox();
  if (!box || !track) throw new Error("The layer opacity slider is not visible");
  const fingers = await hand(page);
  const contact = { id: 1, radius: FINGERTIP, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await fingers.down([contact]);
  await fingers.move([{ ...contact, y: track.y + track.height + box.height }]);
  await fingers.up();
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "0");
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  const blocked = await line(page, 0.8);
  await expect(page.locator(".opacity-hint")).toHaveClass(/is-on/);
  await expect.poll(() => inkAt(page, blocked)).toBe(0);
  await thumb.dblclick();
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "100");
  await inkShows(page, lower, upper);
  await expect.poll(() => inkAt(page, blocked)).toBe(0);
});

test("a touch hold reorders once, and undo restores the original order", async ({ page }) => {
  await twoLayers(page);
  const from = await chip(page, 2).boundingBox();
  const to = await chip(page, 1).boundingBox();
  if (!from || !to) throw new Error("The layer chips are not visible");
  const fingers = await hand(page);
  const contact = {
    id: 1,
    radius: FINGERTIP,
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  };
  await fingers.down([contact]);
  await page.waitForTimeout(LIFT_HOLD_MS + 100);
  await fingers.move([{ ...contact, y: to.y + to.height / 2 }]);
  await fingers.up();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await undo(page).click();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "2",
  );
});

test("the layer cap prevents another add and the last layer cannot be deleted", async ({
  page,
}) => {
  await openSheet(page);
  await options(page, 1);
  await expect(button(page, copy.delete)).toHaveAttribute("aria-disabled", "true");
  await chip(page, 1).click();
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await add(page).click();
    await expect(chip(page, id)).toHaveAttribute("aria-selected", "true");
  }
  await expect(add(page)).toBeDisabled();
  await expect(page.locator(".layer-list [data-layer-chip]")).toHaveCount(MAX_LAYERS);
});

test("locking transparent pixels recolors existing ink without extending it", async ({ page }) => {
  await openSheet(page);
  await color(page, "blue");
  await expect(async () => {
    await inkShows(page, await line(page, 0.5, 0.4, 0.6));
  }).toPass();
  const box = await sheetBox(page);
  const center = at(box, 0.5, 0.5);
  await expect.poll(() => shownColor(page, center)).toEqual([47, 107, 255, 255]);
  await options(page, 1);
  await button(page, copy.lock).click();
  await expect(button(page, copy.lock)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 1).click();
  await color(page, "red");
  await line(page, 0.5, 0.2, 0.8);
  await expect.poll(() => shownColor(page, center)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => inkAt(page, at(box, 0.3, 0.5))).toBe(0);
  await expect.poll(() => inkAt(page, at(box, 0.7, 0.5))).toBe(0);
  await undo(page).click();
  await expect.poll(() => shownColor(page, center)).toEqual([47, 107, 255, 255]);
});

test("clipping masks outside ink on screen and in the seal preview", async ({ page }) => {
  await openSheet(page);
  await color(page, "blue");
  await expect(async () => {
    await inkShows(page, await line(page, 0.5, 0.3, 0.7));
  }).toPass();
  await add(page).click();
  await color(page, "red");
  await line(page, 0.5, 0.4, 0.6);
  const outside = await line(page, 0.7);
  await inkShows(page, outside);
  await options(page, 2);
  await button(page, copy.clip).click();
  await expect(button(page, copy.clip)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 2).click();
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  const box = await sheetBox(page);
  await expect.poll(() => shownColor(page, at(box, 0.5, 0.5))).toEqual([232, 72, 79, 255]);
  await expect.poll(() => shownColor(page, at(box, 0.35, 0.5))).toEqual([47, 107, 255, 255]);
  await openSealSheet(page, language);
  const preview = page.locator(".seal-preview__ink");
  await expect
    .poll(() =>
      preview.evaluate((node) => {
        if (!(node instanceof HTMLCanvasElement))
          throw new Error("The seal preview is not a canvas");
        const canvas = node;
        const g = canvas.getContext("2d");
        if (!g) throw new Error("No context for the seal preview");
        const { data } = g.getImageData(0, 0, canvas.width, canvas.height);
        const rows: number[] = [];
        let blue = 0;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (data[i] > 180 && data[i + 1] < 120 && data[i + 2] < 130) rows.push(y);
            if (data[i] < 100 && data[i + 1] < 150 && data[i + 2] > 220) blue++;
          }
        }
        if (!rows.length) return false;
        // Both colors belong to the same short row; the separate red stroke is absent.
        return blue > 0 && Math.max(...rows) - Math.min(...rows) < canvas.height * 0.5;
      }),
    )
    .toBe(true);
});

test("a sticker drawn on two layers seals and its layered timelapse plays to completion", async ({
  page,
}) => {
  await twoLayers(page);
  await openSealSheet(page, language);
  const { card, no } = await sealOnSheet(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  const watch = detail.getByRole("button", {
    name: say(stickerBoard.timelapse.watchLabel, language, { no }),
  });
  await watch.click();
  await expect(detail.locator(".timelapse-overlay")).toBeVisible();
  await expect(detail.locator(".timelapse-overlay")).toHaveCount(0, { timeout: 30_000 });
  await expect(watch).toBeEnabled();
});
