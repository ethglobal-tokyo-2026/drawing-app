import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { PALM_CONTACT_PX } from "../src/sticker-creation/canvas/gestures.ts";
import { lazyRadius, PEN_TRAIL_SHARE } from "../src/sticker-creation/canvas/lazyBrush.ts";
import { SHEET_SHORT_UNITS } from "../src/sticker-creation/canvas/sheetFrame.ts";
import { canvas, drawKeyName, openSettings, say, signIn } from "./helpers.ts";
import { ipad } from "./ipad.ts";
import {
  along,
  at,
  countInkedFrames,
  FINGERTIP,
  hand,
  inkAt,
  inkedPixels,
  inkReach,
  middle,
  nextFrames,
  pencil,
  penStroke,
  touchStroke,
  type Box,
  type Hand,
} from "./pen.ts";

const { stickerBoard, stickerCreation } = strings;
const language = "en";

// An iPad in portrait, the Pencil's own device.
test.use(ipad);

/** Signs someone new in and opens a fresh sheet; resolves with the paper's box on screen. */
async function openSheet(page: Page, who: string) {
  await signIn(page, who, language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  // The sheet takes ink once its ticket is spent, which the timer's first-visit note marks.
  await expect(
    page.getByText(say(stickerCreation.timer.note.startsWhenYouDraw, language)).first(),
  ).toBeVisible();
  const sheet = canvas(page, language);
  // Waits until nothing covers the paper, as the suite's own strokes do.
  await sheet.hover();
  const box = await sheet.boundingBox();
  if (!box) throw new Error("The sheet isn't on screen");
  return box;
}

const undo = (page: Page) =>
  page.getByRole("button", { name: say(stickerCreation.history.undo, language) });
const pencilOnlyTile = (page: Page) =>
  page.getByRole("button", { name: say(stickerCreation.tools.pencilOnly, language) });

/** Two fingertips land together near the sheet's foot, and lift. */
async function twoFingerTap(fingers: Hand, box: Box) {
  const tap = [at(box, 0.3, 0.85), at(box, 0.45, 0.85)].map((point, i) => ({
    ...point,
    id: 10 + i,
    radius: FINGERTIP,
  }));
  await fingers.down(tap);
  await fingers.up();
}

test("a pen's first stroke brings the Pencil only tile; fingers then only tap, until the tile lets them draw", async ({
  page,
}) => {
  const box = await openSheet(page, "pencil-only");
  await expect(pencilOnlyTile(page)).toHaveCount(0);
  const pen = await pencil(page);
  const penRow = along(box, 0.2, 0.1, 0.4);
  await penStroke(page, pen, penRow, () => 0.5);
  await expect(undo(page)).toBeEnabled();
  await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "true");

  const fingers = await hand(page);
  const fingerRow = along(box, 0.5, 0.6, 0.9);
  await touchStroke(page, fingers, fingerRow, FINGERTIP);
  expect(await inkAt(page, middle(fingerRow))).toBe(0);
  // Fingers still tap: two take the pen's stroke back.
  await twoFingerTap(fingers, box);
  await expect.poll(() => inkAt(page, middle(penRow))).toBe(0);

  await pencilOnlyTile(page).click();
  await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "false");
  await touchStroke(page, fingers, fingerRow, FINGERTIP);
  expect(await inkAt(page, middle(fingerRow))).toBeGreaterThan(0);
});

test("a hovering pen rings where it will land, as wide as the stroke it draws, and the ring goes as it lands or leaves", async ({
  page,
}) => {
  // Off draws the brush's own width, so the stroke under the ring has one width to match.
  await page.addInitScript(() => localStorage.setItem("draw.penPressure", "off"));
  const box = await openSheet(page, "hover");
  const pen = await pencil(page);
  const ring = page.locator(".nib-ring");
  const row = along(box, 0.4, 0.2, 0.7);
  await pen.hover(row[0]);
  await expect(ring).toBeVisible();
  const shown = await ring.boundingBox();
  if (!shown) throw new Error("The ring has no box");
  expect(Math.abs(shown.x + shown.width / 2 - row[0].x)).toBeLessThan(1.5);
  expect(Math.abs(shown.y + shown.height / 2 - row[0].y)).toBeLessThan(1.5);

  // Pressed ever harder, a stroke under Off keeps one width: the ring's.
  await penStroke(page, pen, row, (i) => 0.1 + (0.9 * i) / row.length, 40);
  await expect(ring).toBeHidden();
  const early = await inkAt(page, row[8]);
  const late = await inkAt(page, row[row.length - 4]);
  expect(Math.abs(early - late)).toBeLessThan(1);
  expect(Math.abs(late - shown.width)).toBeLessThan(2);

  await pen.hover(at(box, 0.5, 0.7));
  await expect(ring).toBeVisible();
  // Above the paper, over the top bar.
  await pen.hover({ x: box.x + 30, y: box.y - 30 });
  await expect(ring).toBeHidden();
});

test("pen pressure: a pen whose pressure never moves draws by speed; then strokes widen as they press harder, and start as light as they land", async ({
  page,
}) => {
  const box = await openSheet(page, "pressure");
  const pen = await pencil(page);
  // The page's first strokes, at one pressure: a quick one draws thinner than a slow one.
  const slow = along(box, 0.15, 0.1, 0.4);
  const quick = along(box, 0.15, 0.6, 0.9);
  await penStroke(page, pen, slow, () => 0.5, 60);
  await penStroke(page, pen, quick, () => 0.5, 0);
  expect(await inkAt(page, middle(quick))).toBeLessThan(await inkAt(page, middle(slow)));

  // Pressure that moves sets the width: wider where it's pressed harder.
  const rising = along(box, 0.35, 0.1, 0.9);
  await penStroke(page, pen, rising, (i) => 0.1 + (0.9 * i) / rising.length);
  expect(await inkAt(page, rising[4])).toBeLessThan(await inkAt(page, rising[rising.length - 4]));

  // From now on a stroke starts at its first sample's width: a light one starts thin.
  const light = along(box, 0.6, 0.1, 0.4);
  const firm = along(box, 0.6, 0.6, 0.9);
  await penStroke(page, pen, light, () => 0.1);
  await penStroke(page, pen, firm, () => 0.9);
  expect(await inkAt(page, light[2])).toBeLessThan(await inkAt(page, firm[2]));
});

test("prediction paints a guess ahead of the pen while it moves, and none of it stays", async ({
  page,
}) => {
  const box = await openSheet(page, "prediction");
  const pen = await pencil(page);
  const row = along(box, 0.5, 0.1, 0.6, 30);
  const lift = row[row.length - 1];
  const inkedFrames = await countInkedFrames(page, ".ink-prediction", lift.y);
  await penStroke(page, pen, row, () => 0.5, 8);
  expect(await inkedFrames()).toBeGreaterThan(0);
  await expect.poll(() => inkedPixels(page, ".ink-prediction")).toBe(0);
  // The stroke ends where the pen lifted.
  expect(await inkAt(page, { x: lift.x + 24, y: lift.y })).toBe(0);
});

test("at Smooth, a pen's line stays under its nib as it moves, and ends where it lifts", async ({
  page,
}) => {
  const box = await openSheet(page, "smooth-pen");
  const smoothing = page.getByRole("button", {
    name: say(stickerCreation.tools.smoothing, language),
  });
  await smoothing.click();
  await page.locator(".smoothing-range").fill("100");
  await smoothing.click();
  await expect(smoothing).toHaveAttribute("aria-expanded", "false");

  const pen = await pencil(page);
  const row = along(box, 0.5, 0.1, 0.6, 30);
  const nib = row[row.length - 1];
  const t0 = Date.now();
  await pen.down(row[0], 0.5, t0);
  for (let i = 1; i < row.length; i++) {
    await pen.move(row[i], 0.5, t0 + i * 16);
    await page.waitForTimeout(16);
  }
  await nextFrames(page);
  // Before it lifts, the ink is within the pen's trail of the nib, in CSS px.
  const trail = lazyRadius(100) * PEN_TRAIL_SHARE * (box.width / SHEET_SHORT_UNITS);
  expect(nib.x - ((await inkReach(page, nib.y)) ?? row[0].x)).toBeLessThanOrEqual(trail + 1);
  await pen.up(nib, t0 + row.length * 16);
  expect(await inkReach(page, nib.y)).toBeGreaterThanOrEqual(nib.x - 1);
});

test("once a pen has drawn here, a palm never draws, and a resting palm doesn't hold up two-finger undo", async ({
  page,
}) => {
  const box = await openSheet(page, "palm");
  const pen = await pencil(page);
  await penStroke(page, pen, along(box, 0.2, 0.1, 0.4), () => 0.5);
  await expect(undo(page)).toBeEnabled();
  // Pencil and finger, so fingers draw: a palm still doesn't.
  await pencilOnlyTile(page).click();
  const fingers = await hand(page);
  const palmRow = along(box, 0.5, 0.55, 0.9);
  await touchStroke(page, fingers, palmRow, PALM_CONTACT_PX);
  expect(await inkAt(page, middle(palmRow))).toBe(0);

  const second = along(box, 0.7, 0.1, 0.4);
  await penStroke(page, pen, second, () => 0.5);
  const palm = { ...at(box, 0.85, 0.95), id: 1, radius: PALM_CONTACT_PX };
  const tap = [at(box, 0.3, 0.85), at(box, 0.45, 0.85)].map((point, i) => ({
    ...point,
    id: 10 + i,
    radius: FINGERTIP,
  }));
  await fingers.down([palm]);
  await fingers.down([palm, ...tap]);
  // The tap lifts; the palm stays down.
  await fingers.up(tap);
  await expect.poll(() => inkAt(page, middle(second))).toBe(0);
  await fingers.up();
});

test("Settings shows Input and Pen pressure once a pen has drawn on the device, and Try it takes the pen", async ({
  page,
}) => {
  await signIn(page, "pencil-settings", language);
  let settings = await openSettings(page, language);
  const { pencil: words } = stickerBoard.settings;
  const input = () => settings.getByRole("radiogroup", { name: say(words.input.title, language) });
  await expect(input()).toHaveCount(0);

  // What a pen's first stroke on the drawing screen keeps on the device.
  await page.evaluate(() => localStorage.setItem("draw.inputMode", "pencilOnly"));
  await page.reload();
  settings = await openSettings(page, language);
  await expect(
    input().getByRole("radio", { name: say(words.input.pencilOnly, language) }),
  ).toBeChecked();
  await settings
    .getByRole("radiogroup", { name: say(words.pressure.title, language) })
    .getByRole("radio", { name: say(words.pressure.light, language) })
    .click();

  const strip = page.locator(".try-pen-pressure__ink");
  await strip.scrollIntoViewIfNeeded();
  const box = await strip.boundingBox();
  if (!box) throw new Error("Try it isn't on screen");
  // Pencil only: a finger leaves the strip blank, and the pen draws.
  const row = along(box, 0.5, 0.1, 0.9);
  await touchStroke(page, await hand(page), row, FINGERTIP);
  expect(await inkedPixels(page, ".try-pen-pressure__ink")).toBe(0);
  await penStroke(page, await pencil(page), row, (i) => 0.1 + (0.9 * i) / row.length);
  expect(await inkedPixels(page, ".try-pen-pressure__ink")).toBeGreaterThan(0);
  // It fades a few seconds after the last stroke, and nothing is kept.
  await expect.poll(() => inkedPixels(page, ".try-pen-pressure__ink"), { timeout: 6000 }).toBe(0);
});
