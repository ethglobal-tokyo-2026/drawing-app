import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { STAGE_INSET } from "../src/sticker-board/timelapse/timelapseFrame.ts";
import { MIN_LENGTH_MS } from "../src/sticker-board/timelapse/timelapseSchedule.ts";
import { sealWithErasedMarks } from "./erasedMarks.ts";
import { boardSticker, openDetail, say, signIn } from "./helpers.ts";
import { ipad, ipadOnItsSide } from "./ipad.ts";
import type { Box } from "./pen.ts";
import { sealStoredSticker, type StoredSticker } from "./storedStickers.ts";

const { timelapse } = strings.stickerBoard;

/** What the recorder saw: each inline transform and opacity the figure took, and when the overlay took each phase. */
interface Recorded {
  styles: { transform: string; opacity: string }[];
  phases: { phase: string; at: number }[];
}

declare global {
  interface Window {
    timelapseRecorded?: Recorded;
  }
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
 * The timelapse as the page shows it now: its overlay's phase, the figure's opacity and the inline
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
      phase: el.querySelector<HTMLElement>(".timelapse-overlay")?.dataset.phase ?? null,
      opacity: getComputedStyle(figure).opacity,
      inline: { transform, transformOrigin, opacity, zIndex },
      figure: figureBox,
      paper: boxOf(".timelapse-overlay__paper"),
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
 * the timelapse's overlay takes each phase. A style attribute's earlier values come as old values,
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
      const now = el.querySelector<HTMLElement>(".timelapse-overlay")?.dataset.phase ?? null;
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

/** Waits for the end: Timelapse named to watch again, the live line saying it's done, the overlay gone. */
async function untilEnded(detail: Locator, language: Language, no: string) {
  await expect(watchKey(detail, language, no)).toBeVisible();
  await expect(statusLine(detail)).toHaveText(say(timelapse.done, language));
  const shown = await look(detail);
  expect(shown.phase, "the timelapse's overlay").toBeNull();
  return shown;
}

/** Presses Skip while the timelapse plays, and waits for the end as `untilEnded` does. */
async function skipToEnd(detail: Locator, language: Language, no: string) {
  await skipKey(detail, language).click();
  return untilEnded(detail, language, no);
}

/** Expects the figure back in its spot, with none of the timelapse's inline styles left on it. */
function expectBackInSpot(shown: Look, spot: Box) {
  expect.soft(shown.inline, "the figure's inline styles").toEqual(NO_INLINE_STYLES);
  expectNear(onStage(shown.figure, shown.stage), spot, "the figure, back in its spot");
}

/** The room layoutFor keeps the paper in: the stage, inset where the figure leaves it spare. */
function roomOf(stage: Box, spot: Box) {
  const s = edgesOf(spot);
  return {
    left: Math.min(STAGE_INSET, s.left),
    top: Math.min(STAGE_INSET, s.top),
    right: Math.max(stage.width - STAGE_INSET, s.right),
    bottom: Math.max(stage.height - STAGE_INSET, s.bottom),
  };
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
  const room = roomOf(stage, spot);
  expect.soft(p.left, "the paper's left edge").toBeGreaterThanOrEqual(room.left - 1);
  expect.soft(p.top, "the paper's top edge").toBeGreaterThanOrEqual(room.top - 1);
  expect.soft(p.right, "the paper's right edge").toBeLessThanOrEqual(room.right + 1);
  expect.soft(p.bottom, "the paper's bottom edge").toBeLessThanOrEqual(room.bottom + 1);
  expect
    .soft(paper.y + paper.height, "the paper's foot, above the pager")
    .toBeLessThanOrEqual(pager.y);
}

/** Expects the paper held by the stage's width: it spans the room from side to side. */
function expectPaperAcrossRoom({ paper, stage }: Look, spot: Box) {
  if (!paper) throw new Error("No paper while the timelapse plays");
  const p = edgesOf(onStage(paper, stage));
  const room = roomOf(stage, spot);
  for (const side of ["left", "right"] as const)
    expect
      .soft(Math.abs(p[side] - room[side]), `the paper's ${side} edge, at the room's`)
      .toBeLessThanOrEqual(1);
}

/**
 * Opens sticker `no`'s detail from the board. Resolves with its number, the detail and the sticker's
 * spot once it holds still.
 */
async function detailOf(page: Page, language: Language, no: string) {
  const detail = await openDetail(page, language, no);
  return { no, detail, spot: await stillSpot(detail) };
}
type Opened = Awaited<ReturnType<typeof detailOf>>;

/**
 * Signs someone new in, draws a sticker with erased marks outside its cut on the drawing screen and
 * seals it, and opens its detail.
 */
async function detailWithErasedMarks(page: Page, language: Language) {
  await signIn(page, "timelapse", language);
  return detailOf(page, language, await sealWithErasedMarks(page, language));
}

/**
 * Signs someone new in, seals stored sticker `name` through the API, and opens its detail: for tests
 * whose point is what plays, not how it was drawn.
 */
async function detailWithStored(page: Page, language: Language, name: StoredSticker) {
  await signIn(page, "timelapse", language);
  const { no } = await sealStoredSticker(page, name);
  // The board places a sticker sealed through the API when it next loads.
  await page.reload();
  await expect(boardSticker(page, language, no)).toBeVisible();
  return detailOf(page, language, no);
}

/**
 * Presses Timelapse on a sticker with marks outside its cut: it flies from its spot onto its place on
 * the sheet it was drawn on, which shows past it, and fades into the ink as it plays. Resolves with
 * how the detail looks while it plays.
 */
async function expectFlightOntoItsSheet(
  page: Page,
  language: Language,
  { no, detail, spot }: Opened,
) {
  const playing = await pressUntilPlaying(detail, language, no);
  expectPaperOnStage(playing, spot);
  expect(await figureMoves(page), "the recorder saw the figure fly").toBe(true);
  return playing;
}

/**
 * Stored sticker `name`, with marks outside its cut, flies onto its sheet, and Skip brings it back as
 * it was. Resolves with how the detail looked while it played, and the sticker's spot.
 */
async function expectFlightThenSkip(page: Page, language: Language, name: StoredSticker) {
  const opened = await detailWithStored(page, language, name);
  const playing = await expectFlightOntoItsSheet(page, language, opened);
  expectBackInSpot(await skipToEnd(opened.detail, language, opened.no), opened.spot);
  return { playing, spot: opened.spot };
}

test("a sticker drawn within its cut plays in its spot, on paper the figure's size, and is left as it was", async ({
  page,
}) => {
  const language = "en";
  const { no, detail, spot } = await detailWithStored(page, language, "oneStroke");
  const playing = await pressUntilPlaying(detail, language, no);
  if (!playing.paper) throw new Error("No paper while the timelapse plays");
  expectNear(playing.paper, playing.figure, "the paper, over the figure");
  expect(await figureMoves(page), "the recorder saw the figure move").toBe(false);
  expectBackInSpot(await skipToEnd(detail, language, no), spot);
});

// The one test that draws its sticker: what plays is the timelapse the drawing screen recorded. It
// plays to its own end, where the sticker flies back.
test("a sticker with marks outside its cut flies onto the sheet it was drawn on, and back", async ({
  page,
}) => {
  const language = "en";
  const opened = await detailWithErasedMarks(page, language);
  await expectFlightOntoItsSheet(page, language, opened);
  expectBackInSpot(await untilEnded(opened.detail, language, opened.no), opened.spot);
});

test("Skip, while the timelapse plays, ends it at once with the sticker back in its spot", async ({
  page,
}) => {
  const language = "en";
  const { no, detail, spot } = await detailWithStored(page, language, "erasedMarks");
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

  // Reduced motion changes how it plays as well as how it ends, so this one plays to its own end.
  test("nothing flies: the sticker goes as its sheet plays, and is back in its spot after", async ({
    page,
  }) => {
    const language = "en";
    const { no, detail, spot } = await detailWithStored(page, language, "erasedMarks");
    const playing = await pressUntilPlaying(detail, language, no);
    expectPaperOnStage(playing, spot);
    expect(await figureMoves(page), "the recorder saw the figure move").toBe(false);
    expectBackInSpot(await untilEnded(detail, language, no), spot);
  });
});

test.describe("On an iPad held upright", () => {
  test.use(ipad);

  test("a sticker with marks outside its cut flies onto its sheet and back", async ({ page }) => {
    await expectFlightThenSkip(page, "en", "erasedMarks");
  });
});

test.describe("On an iPad on its side", () => {
  test.use(ipadOnItsSide);

  // Drawn on this screen, its sheet is wider than tall: the stage's width holds its paper, where a
  // phone's sheet is held by the stage's height.
  test("a sticker with marks outside its cut flies onto its sheet and back", async ({ page }) => {
    const { playing, spot } = await expectFlightThenSkip(page, "en", "erasedMarksSideways");
    expectPaperAcrossRoom(playing, spot);
  });
});

test.describe("In Japanese", () => {
  test.use({ locale: "ja-JP" });

  test("a sticker with marks outside its cut flies onto its sheet and back, its labels in Japanese", async ({
    page,
  }) => {
    await expectFlightThenSkip(page, "ja", "erasedMarks");
  });
});
