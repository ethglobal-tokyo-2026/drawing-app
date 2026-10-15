import { expect, type Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { boardSticker, drawKey, openSealSheet, say, sealOnSheet, tapKey } from "./helpers.ts";
import { at, type At, type Box } from "./pen.ts";

const { stickerCreation, ui } = strings;

/** A point on the sheet, as shares of its width and height. */
type OnSheet = [across: number, down: number];

/** Nine strokes' worth of zigzag across the sheet's top, outside the sticker's cut once it's erased. */
const ZIGZAG: OnSheet[] = Array.from({ length: 10 }, (_, i) => [
  0.14 + (0.72 * i) / 9,
  i % 2 ? 0.19 : 0.1,
]);
/** A loop at the sheet's foot, erased too; its radius is a share of the sheet's width. */
const LOOP = { middle: [0.2, 0.86] satisfies OnSheet, radius: 0.09 };
/** The circle that's filled and stays: the sticker. */
const CIRCLE = { middle: [0.5, 0.52] satisfies OnSheet, radius: 0.24 };
/** An arm from the circle to the sheet's right edge; its outer half is erased. */
const ARM: OnSheet[] = [
  [0.73, 0.5],
  [0.8, 0.46],
  [0.87, 0.41],
  [0.93, 0.36],
  [0.97, 0.32],
];
const ARM_OUTER_HALF = ARM.slice(2);
/** Each eraser pass's shift down the sheet, as a share of its height, so the passes cover each mark. */
const ERASER_PASSES = [-0.01, 0, 0.01];

/** A path on the sheet's screen box, each point `shift` of the sheet's height further down. */
const path =
  (shares: OnSheet[], shift = 0) =>
  (sheet: Box) =>
    shares.map(([across, down]) => at(sheet, across, down + shift));

/** A ring on the sheet's screen box, round on screen, running a step past its start so it closes. */
const ring =
  ({ middle: [across, down], radius }: { middle: OnSheet; radius: number }, shift = 0) =>
  (sheet: Box): At[] => {
    const segments = 24;
    return Array.from({ length: segments + 2 }, (_, i) => {
      const turn = (i / segments) * 2 * Math.PI;
      return {
        x: sheet.x + sheet.width * (across + radius * Math.cos(turn)),
        y: sheet.y + sheet.height * (down + shift) + sheet.width * radius * Math.sin(turn),
      };
    });
  };

const nextFrame = (page: Page) => page.evaluate(() => new Promise(requestAnimationFrame));

/** The drawing screen's sheet, where it is now: nothing, such as the screen rising, covers it. */
async function sheetBox(page: Page) {
  const sheet = page.locator(".ink-sheet");
  await sheet.hover();
  const box = await sheet.boundingBox();
  if (!box) throw new Error("The sheet isn't on screen");
  return box;
}

/** One stroke with the tool in hand, through the path's points: small moves, a frame apart. */
async function drawThrough(page: Page, pathOn: (sheet: Box) => At[]) {
  const [first, ...rest] = pathOn(await sheetBox(page));
  if (!first) throw new Error("A stroke needs a point");
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 3 });
    await nextFrame(page);
  }
  await page.mouse.up();
}

/** Picks a tool tile, and waits for it to be in hand. */
async function pickTool(page: Page, language: Language, tool: "fill" | "eraser") {
  const tile = page.getByRole("button", {
    name: say(stickerCreation.tools[tool], language),
    exact: true,
  });
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "true");
}

/**
 * From the board: a filled circle with an arm to the sheet's edge, a zigzag across the top and a loop
 * at the foot, then the zigzag, the loop and the arm's outer half erased, so the sheet was drawn on
 * well outside the sticker's cut. Seals it, and resolves with its number once it's on the board.
 */
export async function sealWithErasedMarks(page: Page, language: Language) {
  await tapKey(drawKey(page, language));
  await expect(page.locator(".drawing-screen")).not.toHaveAttribute("inert");
  const undo = page.getByRole("button", { name: say(stickerCreation.history.undo, language) });
  // A fresh sheet takes no ink until the server answers its ticket's spend, so a refused stroke is
  // drawn again.
  await expect(async () => {
    await drawThrough(page, path(ZIGZAG));
    await expect(undo).toBeEnabled({ timeout: 5_000 });
  }).toPass();
  await drawThrough(page, ring(LOOP));
  await drawThrough(page, ring(CIRCLE));
  await drawThrough(page, path(ARM));

  await pickTool(page, language, "fill");
  const sheet = await sheetBox(page);
  const inCircle = at(sheet, ...CIRCLE.middle);
  await page.mouse.click(inCircle.x, inCircle.y);

  await pickTool(page, language, "eraser");
  const size = page.getByRole("slider", { name: say(stickerCreation.sizeRail.eraser, language) });
  const widest = await size.getAttribute("aria-valuemax");
  if (widest === null) throw new Error("The eraser's size rail has no maximum");
  for (let press = 0; press < 30; press++) await size.press("ArrowUp");
  await expect(size).toHaveAttribute("aria-valuenow", widest);
  for (const shift of ERASER_PASSES) {
    await drawThrough(page, path(ZIGZAG, shift));
    await drawThrough(page, ring(LOOP, shift));
    await drawThrough(page, path(ARM_OUTER_HALF, shift));
  }

  await openSealSheet(page, language);
  const { card, no } = await sealOnSheet(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
  return no;
}
