import { seededRandom } from "../ui/seededRandom";
import type { Balloon } from "./deal";
import { charCount } from "./subjectList";

/** One balloon's shape and place. */
export interface BalloonSpec {
  w: number;
  h: number;
  /** Degrees. */
  tilt: number;
  bumps: number;
  /** Seeds the bumps' jitter, so a balloon is drawn the same every time. */
  seed: number;
  /** The die's center, from the balloon's center, in px. */
  die: readonly [number, number];
  /** One float's period, in ms; the two differ so they never sync. */
  bobMs: number;
}

/** The upper balloon and the lower, by Balloon. */
export const BALLOONS: readonly [BalloonSpec, BalloonSpec] = [
  { w: 176, h: 100, tilt: -3, bumps: 11, seed: 7, die: [113, 40], bobMs: 3400 },
  { w: 176, h: 104, tilt: 2.5, bumps: 11, seed: 21, die: [110, 45], bobMs: 4100 },
];
/** Each balloon's height on a short phone: unverified guesses, to tune at 375 × 640. */
const TIGHT_HEIGHTS = [88, 92] as const;

export type Shape =
  | { kind: "ellipse"; x: number; y: number; rx: number; ry: number }
  | { kind: "circle"; x: number; y: number; r: number };

/** The beads toward the thinker: each one's distance past the bumps' edge, and its radii. */
const BEADS = [
  [14, 9, 7],
  [36, 6.2, 5],
  [54, 4, 3.4],
] as const;

/**
 * A manga thought balloon around its center: bumps round an ellipse, and three beads trailing
 * toward `toward`, the thinker off the page.
 */
export function balloonShapes(spec: BalloonSpec, toward: readonly [number, number]) {
  const random = seededRandom(spec.seed);
  const rx = (spec.w / 2) * 1.2;
  const ry = (spec.h / 2) * 1.28;
  const body: Shape[] = [{ kind: "ellipse", x: 0, y: 0, rx, ry }];
  for (let i = 0; i < spec.bumps; i++) {
    const t = (i / spec.bumps) * Math.PI * 2 + (random() - 0.5) * 0.18;
    const r = 13 + random() * 6;
    body.push({ kind: "circle", x: Math.cos(t) * rx, y: Math.sin(t) * ry, r });
  }
  const [tx, ty] = toward;
  const ux = tx / Math.hypot(tx, ty);
  const uy = ty / Math.hypot(tx, ty);
  // Where the line toward the thinker leaves the bumps.
  const edge = 1 / Math.sqrt(ux ** 2 / (rx + 18) ** 2 + uy ** 2 / (ry + 18) ** 2);
  const beads = BEADS.map(([past, brx, bry]): Shape => ({
    kind: "ellipse",
    x: ux * (edge + past),
    y: uy * (edge + past),
    rx: brx,
    ry: bry,
  }));
  return { body, beads, rx, ry };
}

export interface ShapesBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** The box around `shapes`, `pad` px wider on each side for the ink edge and the shadow. */
export function shapesBox(shapes: readonly Shape[], pad = 8): ShapesBox {
  const reach = (s: Shape) => (s.kind === "circle" ? [s.r, s.r] : [s.rx, s.ry]);
  const minX = Math.min(...shapes.map((s) => s.x - reach(s)[0])) - pad;
  const minY = Math.min(...shapes.map((s) => s.y - reach(s)[1])) - pad;
  const maxX = Math.max(...shapes.map((s) => s.x + reach(s)[0])) + pad;
  const maxY = Math.max(...shapes.map((s) => s.y + reach(s)[1])) + pad;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Each balloon's center across the screen, as a share of its width. */
const CENTER_X = [182 / 390, 236 / 390] as const;
/** Each balloon's center from the middle of the space between the timer's label and Begin, in px. */
const CENTER_Y = [-87, 85] as const;
/** The thinker the beads trail toward: this far in from the screen's left, and up from Begin's top. */
const THINKER = { left: 22, up: 40 };

const specOf = (balloon: Balloon, tight: boolean): BalloonSpec =>
  tight ? { ...BALLOONS[balloon], h: TIGHT_HEIGHTS[balloon] } : BALLOONS[balloon];
const centerYOf = (balloon: Balloon, tight: boolean) =>
  (CENTER_Y[balloon] * specOf(balloon, tight).h) / BALLOONS[balloon].h;

/** How tall the pair stands, from the upper cloud's top to the lower cloud's foot. */
export function pairHeight(tight: boolean): number {
  const box = (balloon: Balloon) => shapesBox(balloonShapes(specOf(balloon, tight), [-1, 1]).body);
  const upper = box(0);
  const lower = box(1);
  return centerYOf(1, tight) + lower.minY + lower.height - (centerYOf(0, tight) + upper.minY);
}

type Point = [number, number];

/** Room kept between the two balloons' words where they draw closer, in px. */
const WORDS_GAP_PX = 8;

/**
 * The tightened balloons' centers, as far apart as the space allows, from their usual distance down
 * to where their words would meet; the pair stays centered on `middle` if even that doesn't fit.
 */
function closeIn(space: number, middle: number): [number, number] {
  const cloud = (balloon: Balloon) => shapesBox(balloonShapes(specOf(balloon, true), [-1, 1]).body);
  const upper = cloud(0);
  const lower = cloud(1);
  // The upper cloud's top half and the lower cloud's bottom half, which no distance changes.
  const reach = -upper.minY + lower.minY + lower.height;
  const usual = centerYOf(1, true) - centerYOf(0, true);
  const closest = (TIGHT_HEIGHTS[0] + TIGHT_HEIGHTS[1]) / 2 + WORDS_GAP_PX;
  const apart = Math.min(usual, Math.max(closest, space - reach));
  const upperY = middle - (reach + apart) / 2 - upper.minY;
  return [upperY, upperY + apart];
}

export interface PairLayout {
  /** The space is shorter than the pair, so the balloons tighten rather than scale. */
  tight: boolean;
  /** Each balloon's shape, tightened or not. */
  specs: readonly [BalloonSpec, BalloonSpec];
  /** Each balloon's center on the screen. */
  centers: readonly [Point, Point];
  /** From each balloon's center toward the thinker, for its beads. */
  towards: readonly [Point, Point];
}

/**
 * The pair, centered in the space between the timer's label (`top`) and Begin's top (`bottom`) on a
 * screen `width` wide: the upper balloon left of the lower, overlapping it.
 */
export function pairLayout({
  width,
  top,
  bottom,
}: {
  width: number;
  top: number;
  bottom: number;
}): PairLayout {
  const tight = bottom - top < pairHeight(false);
  const middle = (top + bottom) / 2;
  const [upperY, lowerY] = tight
    ? closeIn(bottom - top, middle)
    : [middle + centerYOf(0, false), middle + centerYOf(1, false)];
  const centers = [
    [CENTER_X[0] * width, upperY],
    [CENTER_X[1] * width, lowerY],
  ] as const satisfies readonly [Point, Point];
  const toward = ([x, y]: Point): Point => [THINKER.left - x, bottom - THINKER.up - y];
  return {
    tight,
    specs: [specOf(0, tight), specOf(1, tight)],
    centers,
    towards: [toward(centers[0]), toward(centers[1])],
  };
}

/** Furigana stays at 11 px or more, so a word it sits on is never set under this. */
export const FURIGANA_WORD_MIN_PX = 20;
/** A word's size on a short phone, at most. */
export const TIGHT_WORD_PX = 36;
/** A word's size by its length: one or two characters, then three to six. */
const WORD_PX = [46, 46, 42, 36, 32, 28] as const;
/** A Latin acronym such as SNS, which sets wider than kana or kanji. */
const ACRONYM_PX = 40;

/** The size a subject's word is set at in its balloon, in px. */
export function wordSizePx(ja: string, tight: boolean): number {
  const natural = /^[A-Z]+$/.test(ja)
    ? ACRONYM_PX
    : WORD_PX[Math.min(Math.max(charCount(ja), 1), WORD_PX.length) - 1];
  return tight ? Math.min(natural, TIGHT_WORD_PX) : natural;
}

/** The balloons' type, in px: the reading and the English, and the room between lines. */
export const TYPE = { readingPx: 12, englishPx: 16, gapPx: 2 };
/** On a short phone the lines close up rather than scaling, so nothing goes under the 11 px floor. */
export const TIGHT_TYPE = { ...TYPE, gapPx: 0 };
