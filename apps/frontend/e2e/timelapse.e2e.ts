import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { STAGE_INSET } from "../src/sticker-board/timelapse/timelapseFrame.ts";
import { MIN_LENGTH_MS } from "../src/sticker-board/timelapse/timelapseSchedule.ts";
import {
  boardSticker,
  drawKey,
  openDetail,
  openSealSheet,
  say,
  sealFromBoard,
  sealOnSheet,
  signIn,
  tapKey,
} from "./helpers.ts";
import { ipad } from "./ipad.ts";
import { at, type At, type Box } from "./pen.ts";

const { stickerBoard, stickerCreation, ui } = strings;
const { timelapse } = stickerBoard;

/** What the recorder saw: each inline transform and opacity the figure took, and when the layer took each phase. */
interface Recorded {
  styles: { transform: string; opacity: string }[];
  phases: { phase: string; at: number }[];
}

declare global {
  interface Window {
    timelapseRecorded?: Recorded;
  }
}

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

/** An 11-inch iPad on its side, its screen given over to the page. */
const IPAD_ON_ITS_SIDE = { ...ipad, viewport: { width: 1180, height: 820 } };

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
async function sealWithErasedMarks(page: Page, language: Language) {
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

/** Timelapse, named to watch `no` play: as it's named while nothing plays. */
const watchKey = (detail: Locator, language: Language, no: string) =>
  detail.getByRole("button", { name: say(timelapse.watchLabel, language, { no }) });

/** Timelapse while it plays, named to skip to the end. */
const skipKey = (detail: Locator, language: Language) =>
  detail.getByRole("button", { name: say(timelapse.skipLabel, language) });

/** The timelapse's live line, beside its button. */
const statusLine = (detail: Locator) => detail.locator(".timelapse-button + [role='status']");

/**
 * The timelapse as the page shows it now: its layer's phase, the figure's opacity and the inline
 * styles the timelapse sets on it, and the screen boxes of the figure, the paper, the stage and the
 * pager.
 */
const look = (detail: Locator) =>
  detail.evaluate((el) => {
    const boxOf = (selector: string) => {
      const found = el.querySelector(selector);
      if (!found) return null;
      const { x, y, width, height } = found.getBoundingClientRect();
      return { x, y, width, height };
    };
    const figure = el.querySelector<HTMLElement>(".sticker-detail__slide .sticker-figure");
    const figureBox = boxOf(".sticker-detail__slide .sticker-figure");
    const stage = boxOf(".sticker-detail__stage");
    const pager = boxOf(".sticker-detail__pager");
    if (!figure || !figureBox || !stage || !pager)
      throw new Error("The sticker detail has no sticker, stage or pager");
    const { transform, transformOrigin, opacity, zIndex } = figure.style;
    return {
      phase: el.querySelector<HTMLElement>(".timelapse-layer")?.dataset.phase ?? null,
      opacity: getComputedStyle(figure).opacity,
      inline: { transform, transformOrigin, opacity, zIndex },
      figure: figureBox,
      paper: boxOf(".timelapse-layer__paper"),
      stage,
      pager,
    };
  });
type Look = Awaited<ReturnType<typeof look>>;

/** The figure as the detail shows it with no timelapse: none of the timelapse's inline styles. */
const NO_INLINE_STYLES: Look["inline"] = {
  transform: "",
  transformOrigin: "",
  opacity: "",
  zIndex: "",
};

const edgesOf = ({ x, y, width, height }: Box) => ({
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
});

/** `box` as an offset from the stage's box, which a scroll moves with it. */
const onStage = (box: Box, stage: Box): Box => ({ ...box, x: box.x - stage.x, y: box.y - stage.y });

/** Expects every edge of `box` within a pixel of `like`'s. */
function expectNear(box: Box, like: Box, what: string) {
  const a = edgesOf(box);
  const b = edgesOf(like);
  for (const edge of ["left", "top", "right", "bottom"] as const)
    expect.soft(Math.abs(a[edge] - b[edge]), `${what}: its ${edge} edge`).toBeLessThanOrEqual(1);
}

/**
 * The sticker's spot on the stage, once the detail holds still: the lift into it has landed, and two
 * looks in a row find it in one place.
 */
async function stillSpot(detail: Locator) {
  let last = await look(detail);
  await expect
    .poll(async () => {
      const now = await look(detail);
      const was = last;
      last = now;
      const same = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.width === b.width;
      return now.opacity === "1" && same(now.figure, was.figure) && same(now.stage, was.stage);
    })
    .toBe(true);
  return onStage(last.figure, last.stage);
}

/**
 * Puts the recorder on: from now on, every inline transform and opacity the figure takes, and when
 * the timelapse's layer takes each phase. A style attribute's earlier values come as old values,
 * which a detached span reads.
 */
const startRecorder = (detail: Locator) =>
  detail.evaluate((el) => {
    const figure = el.querySelector<HTMLElement>(".sticker-detail__slide .sticker-figure");
    if (!figure) throw new Error("No sticker in the sticker detail");
    const recorded: Recorded = { styles: [], phases: [] };
    const reader = document.createElement("span");
    const note = ({ transform, opacity }: CSSStyleDeclaration) =>
      recorded.styles.push({ transform, opacity });
    new MutationObserver((records) => {
      for (const { oldValue } of records) {
        reader.setAttribute("style", oldValue ?? "");
        note(reader.style);
      }
      note(figure.style);
    }).observe(figure, { attributeFilter: ["style"], attributeOldValue: true });
    let phase: string | null = null;
    new MutationObserver(() => {
      const now = el.querySelector<HTMLElement>(".timelapse-layer")?.dataset.phase ?? null;
      if (now !== null && now !== phase)
        recorded.phases.push({ phase: now, at: performance.now() });
      phase = now;
    }).observe(el, { subtree: true, childList: true, attributeFilter: ["data-phase"] });
    window.timelapseRecorded = recorded;
  });

const recorded = async (page: Page) => {
  const seen = await page.evaluate(() => window.timelapseRecorded);
  if (!seen) throw new Error("The recorder isn't on");
  return seen;
};

/** Whether the recorder saw the figure moved, and saw it faded out: the latter shows it was listening. */
async function figureMoves(page: Page) {
  const { styles } = await recorded(page);
  expect(
    styles.some(({ opacity }) => opacity === "0"),
    "the recorder saw the figure fade out",
  ).toBe(true);
  return styles.some(({ transform }) => transform !== "");
}

/**
 * Presses Timelapse with the recorder on, and resolves with how the detail looks once the sticker's
 * sheet plays and the figure is faded out.
 */
async function pressUntilPlaying(detail: Locator, language: Language, no: string) {
  await startRecorder(detail);
  await watchKey(detail, language, no).click();
  let shown = await look(detail);
  await expect
    .poll(
      async () => {
        shown = await look(detail);
        return shown.phase === "playing" && shown.opacity === "0";
      },
      { message: "the sheet plays, the figure faded out", intervals: [50] },
    )
    .toBe(true);
  await expect(statusLine(detail)).toHaveText(say(timelapse.playing, language, { no }));
  return shown;
}

/** Waits for the end: Timelapse named to watch again, the live line saying it's done, the layer gone. */
async function untilEnded(detail: Locator, language: Language, no: string) {
  await expect(watchKey(detail, language, no)).toBeVisible();
  await expect(statusLine(detail)).toHaveText(say(timelapse.done, language));
  const shown = await look(detail);
  expect(shown.phase, "the timelapse's layer").toBeNull();
  return shown;
}

/** Expects the figure back in its spot, with none of the timelapse's inline styles left on it. */
function expectBackInSpot(shown: Look, spot: Box) {
  expect.soft(shown.inline, "the figure's inline styles").toEqual(NO_INLINE_STYLES);
  expectNear(onStage(shown.figure, shown.stage), spot, "the figure, back in its spot");
}

/** Expects the paper to show the sheet beyond the sticker's spot, inside the stage's room, above the pager. */
function expectPaperOnStage(shown: Look, spot: Box) {
  const { paper, stage, pager } = shown;
  if (!paper) throw new Error("No paper while the timelapse plays");
  const p = edgesOf(onStage(paper, stage));
  const s = edgesOf(spot);
  expect
    .soft(
      p.left < s.left - 1 || p.top < s.top - 1 || p.right > s.right + 1 || p.bottom > s.bottom + 1,
      "the paper reaches past the sticker's spot",
    )
    .toBe(true);
  // The room layoutFor keeps the paper in: the stage, inset where the figure leaves it spare.
  const room = {
    left: Math.min(STAGE_INSET, s.left),
    top: Math.min(STAGE_INSET, s.top),
    right: Math.max(stage.width - STAGE_INSET, s.right),
    bottom: Math.max(stage.height - STAGE_INSET, s.bottom),
  };
  expect.soft(p.left, "the paper's left edge").toBeGreaterThanOrEqual(room.left - 1);
  expect.soft(p.top, "the paper's top edge").toBeGreaterThanOrEqual(room.top - 1);
  expect.soft(p.right, "the paper's right edge").toBeLessThanOrEqual(room.right + 1);
  expect.soft(p.bottom, "the paper's bottom edge").toBeLessThanOrEqual(room.bottom + 1);
  expect
    .soft(paper.y + paper.height, "the paper's foot, above the pager")
    .toBeLessThanOrEqual(pager.y);
}

/** Signs someone new in, seals a sticker with erased marks outside its cut, and opens its detail. */
async function detailWithErasedMarks(page: Page, language: Language) {
  await signIn(page, "timelapse", language);
  const no = await sealWithErasedMarks(page, language);
  const detail = await openDetail(page, language, no);
  return { no, detail, spot: await stillSpot(detail) };
}

/**
 * The sticker flies from its spot onto its place on the sheet it was drawn on, which shows past it,
 * fades into the ink as it plays, and is back in its spot as it was once it ends.
 */
async function expectFlightOntoItsSheet(page: Page, language: Language) {
  const { no, detail, spot } = await detailWithErasedMarks(page, language);
  const playing = await pressUntilPlaying(detail, language, no);
  expectPaperOnStage(playing, spot);
  expect(await figureMoves(page), "the recorder saw the figure fly").toBe(true);
  expectBackInSpot(await untilEnded(detail, language, no), spot);
}

test("a sticker drawn within its cut plays in its spot, on paper the figure's size, and is left as it was", async ({
  page,
}) => {
  const language = "en";
  await signIn(page, "timelapse", language);
  const no = await sealFromBoard(page, language);
  const detail = await openDetail(page, language, no);
  const spot = await stillSpot(detail);

  const playing = await pressUntilPlaying(detail, language, no);
  if (!playing.paper) throw new Error("No paper while the timelapse plays");
  expectNear(playing.paper, playing.figure, "the paper, over the figure");
  expect(await figureMoves(page), "the recorder saw the figure move").toBe(false);
  expectBackInSpot(await untilEnded(detail, language, no), spot);
});

test("a sticker with marks outside its cut flies onto the sheet it was drawn on, and back", async ({
  page,
}) => {
  await expectFlightOntoItsSheet(page, "en");
});

test("Skip, while the timelapse plays, ends it at once with the sticker back in its spot", async ({
  page,
}) => {
  const language = "en";
  const { no, detail, spot } = await detailWithErasedMarks(page, language);
  await startRecorder(detail);
  await watchKey(detail, language, no).click();
  await skipKey(detail, language).click();
  expectBackInSpot(await untilEnded(detail, language, no), spot);

  // Played out, the ending can't start until the shortest timelapse has played.
  const { phases } = await recorded(page);
  const when = (phase: string) => phases.find((p) => p.phase === phase)?.at ?? NaN;
  expect(when("ending") - when("playing"), "ms from playing to its ending").toBeLessThan(
    MIN_LENGTH_MS,
  );
});

test.describe("Under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing flies: the sticker goes as its sheet plays, and is back in its spot after", async ({
    page,
  }) => {
    const language = "en";
    const { no, detail, spot } = await detailWithErasedMarks(page, language);
    const playing = await pressUntilPlaying(detail, language, no);
    expectPaperOnStage(playing, spot);
    expect(await figureMoves(page), "the recorder saw the figure move").toBe(false);
    expectBackInSpot(await untilEnded(detail, language, no), spot);
  });
});

test.describe("On an iPad held upright", () => {
  test.use(ipad);

  test("a sticker with marks outside its cut flies onto its sheet and back", async ({ page }) => {
    await expectFlightOntoItsSheet(page, "en");
  });
});

test.describe("On an iPad on its side", () => {
  test.use(IPAD_ON_ITS_SIDE);

  test("a sticker with marks outside its cut flies onto its sheet and back", async ({ page }) => {
    await expectFlightOntoItsSheet(page, "en");
  });
});

test.describe("In Japanese", () => {
  test.use({ locale: "ja-JP" });

  test("a sticker with marks outside its cut flies onto its sheet and back, its labels in Japanese", async ({
    page,
  }) => {
    await expectFlightOntoItsSheet(page, "ja");
  });
});
