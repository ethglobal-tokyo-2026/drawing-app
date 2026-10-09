import { seededRandom } from "../ui/seededRandom";
import { BOIL } from "./dealMotion";
import type { Balloon } from "./deal";
import { outline, penStroke, pressure, wobble, type PenPoint, type Pt } from "./pen";
import { charCount } from "./subjectList";

export type { Pt };

/** One cloud: the word area inside it, its lean, and the seed it's drawn from. */
export interface BalloonSpec {
  /** The word area, the furigana over the word included, in px. */
  w: number;
  h: number;
  /** How far the white reaches above and below the word area before its lobes, in px. */
  padY: number;
  /** The most a lobe bulges, in px. */
  lobe: number;
  /** Degrees. */
  tilt: number;
  /** Seeds its lobes and bubbles, so a cloud is drawn the same every time. */
  seed: number;
}

/** The upper cloud, on the right, and the lower, on the left, by Balloon. */
export const BALLOONS: readonly [BalloonSpec, BalloonSpec] = [
  { w: 176, h: 72, padY: 12, lobe: 19, tilt: 2.5, seed: 7 },
  { w: 176, h: 72, padY: 12, lobe: 19, tilt: -2.5, seed: 23 },
];
/** On a short phone the clouds tighten rather than scale: first a shorter word area. */
const TIGHT = { h: 62 };
/** Where even that doesn't fit, a shorter one still, with less room round it and flatter lobes. */
const TIGHTER = { h: 44, padY: 8, lobe: 14 };

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const TAU = Math.PI * 2;
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => mul(a, 1 / (len(a) || 1));
const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x });
const polar = (t: number): Pt => ({ x: Math.cos(t), y: Math.sin(t) });
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function rotate(a: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

function boxOf(pts: readonly Pt[]): Box {
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

const grow = (b: Box, by: number): Box => ({
  minX: b.minX - by,
  minY: b.minY - by,
  maxX: b.maxX + by,
  maxY: b.maxY + by,
});
/** How far a cloud's or a bubble's ink reaches past its white, at the pen's heaviest. */
const INK_REACH_PX = 4;

/** Where a ray from the cloud's center along `dir` leaves its white. */
function exitAlong(poly: readonly Pt[], dir: Pt): Pt {
  let far = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const e = sub(poly[(i + 1) % poly.length], a);
    const den = dir.x * e.y - dir.y * e.x;
    if (Math.abs(den) < 1e-9) continue;
    const t = (a.x * e.y - a.y * e.x) / den;
    const u = (a.x * dir.y - a.y * dir.x) / den;
    if (u >= 0 && u <= 1 && t > far) far = t;
  }
  return mul(dir, far);
}

/** Down and to the right, away from the app's one light: a pen line sits heavier on that side. */
const SHADE = unit({ x: 1, y: 1.15 });

/** The lobes' rhythm round the cloud, big and small, as a hand varies them. */
const LOBE_RHYTHM = [1.25, 0.8, 1.05, 1.3, 0.78, 1.12, 0.92, 1.28, 0.82, 1.08, 0.95];
/**
 * The G-pen, in px: its line at its heaviest before the shade side adds to it, at its finest, and how
 * far a lobe's stroke starts before its cusp and runs past the next.
 */
const PEN = { heavy: 2.6, shade: 0.3, fine: 0.55, before: 1.1, after: 2.4, wobble: 0.35 };

export interface Cloud {
  /** The cloud's white, as a closed outline round its center. */
  white: readonly Pt[];
  /** The G-pen line round it as SVG path data, once per boil frame: the first is the line at rest. */
  inks: readonly string[];
}

/** One frame of the boil's own seed: the same lobes, inked again by a hand that never quite repeats. */
const boilRandom = (seed: number, frame: number) => seededRandom(seed * 7919 + frame * 104_729);

/**
 * A manga thought cloud round its word area, inked lobe by lobe: lobes of different sizes round a
 * squared-off ellipse, bigger where the cloud piles up along its top, each one stroke that swells and
 * tapers and crosses the next at its cusp.
 */
export function cloudShape(spec: BalloonSpec): Cloud {
  const random = seededRandom(spec.seed);
  const ax = spec.w / 2 + 14;
  const ay = spec.h / 2 + spec.padY;
  const exp = 2.6;
  const base = (t: number): Pt => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return {
      x: ax * Math.sign(c) * Math.abs(c) ** (2 / exp),
      y: ay * Math.sign(s) * Math.abs(s) ** (2 / exp),
    };
  };
  const steps = 900;
  const ring = Array.from({ length: steps + 1 }, (_, i) => base((i / steps) * TAU));
  const run = [0];
  for (let i = 1; i <= steps; i++) run.push(run[i - 1] + len(sub(ring[i], ring[i - 1])));
  const perimeter = run[steps];
  const along = (dist: number): Pt => {
    const d = ((dist % perimeter) + perimeter) % perimeter;
    let lo = 0;
    let hi = steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (run[mid] <= d) lo = mid;
      else hi = mid;
    }
    const f = (d - run[lo]) / (run[hi] - run[lo] || 1);
    return add(ring[lo], mul(sub(ring[hi], ring[lo]), f));
  };

  const start = random() * perimeter;
  const jitter = LOBE_RHYTHM.map(() => 0.88 + random() * 0.24);
  const place = (weights: readonly number[]) => {
    const total = weights.reduce((s, x) => s + x, 0);
    let at = start;
    return weights.map((wt) => {
      const from = at;
      at += (wt / total) * perimeter;
      return [from, at] as const;
    });
  };
  const even = place(LOBE_RHYTHM.map(() => 1));
  const weights = LOBE_RHYTHM.map((r, i) => {
    const mid = along((even[i][0] + even[i][1]) / 2);
    return r * jitter[i] * (1 + 0.18 * clamp(-mid.y / ay, -1, 1));
  });

  const white: Pt[] = [];
  const strokes: ((random: () => number) => string)[] = [];
  for (const [from, to] of place(weights)) {
    const a = along(from);
    const b = along(to);
    const chord = len(sub(b, a));
    const mid = mul(add(a, b), 0.5);
    let out = unit(perp(sub(b, a)));
    if (dot(out, mid) < 0) out = mul(out, -1);
    // Rounder lobes along the top, flatter ones along the foot.
    const k = 0.38 + 0.09 * clamp(-mid.y / ay, -1, 1) + (random() - 0.5) * 0.08;
    const sag = clamp(k * chord, 6, spec.lobe);
    const radius = (chord * chord) / 4 / (2 * sag) + sag / 2;
    const center = add(mid, mul(out, sag - radius));
    const a0 = Math.atan2(a.y - center.y, a.x - center.x);
    const span = 2 * Math.asin(clamp(chord / (2 * radius), -1, 1));
    // The arc runs from a to b through its apex, whichever way round that is.
    const apex = Math.atan2(out.y, out.x);
    const gap = (x: number, y: number) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
    const turn = gap(a0 + span / 2, apex) < gap(a0 - span / 2, apex) ? 1 : -1;
    const samples = Math.max(10, Math.round(chord / 2.5));
    for (let i = 0; i < samples; i++)
      white.push(add(center, mul(polar(a0 + (turn * span * i) / samples), radius)));

    const count = Math.max(8, Math.round(chord / 4));
    // Each inking of the lobe lands, runs on and presses a little differently.
    strokes.push((ink) => {
      const heavy = PEN.heavy * (1 + PEN.shade * dot(out, SHADE)) * (1 + (ink() - 0.5) * 0.12);
      const before = (PEN.before + (ink() - 0.5) * 0.8) / radius;
      const after = (PEN.after + (ink() - 0.5) * 0.8) / radius;
      const wob = wobble(ink, 2);
      const pts: PenPoint[] = [];
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const ang = a0 + turn * (-before + t * (span + before + after));
        const p = add(center, mul(polar(ang), radius + PEN.wobble * wob(t)));
        pts.push({ ...p, w: PEN.fine + (heavy - PEN.fine) * pressure(t, 0.44, 0.65, 1.05) });
      }
      return penStroke(pts);
    });
  }
  const inks = Array.from({ length: BOIL.frames }, (_, frame) => {
    const ink = boilRandom(spec.seed, frame);
    return strokes.map((stroke) => stroke(ink)).join("");
  });
  return { white, inks };
}

/** One of the bubbles a cloud trails toward the thinker, in the cloud's own frame. */
interface Bead {
  at: Pt;
  r: number;
}

/** The bubbles' sizes from the cloud out, the room before each, and their pen, in px. */
const BEADS = { radii: [7.5, 5.2, 3.4], gaps: [5, 5, 4.5], pen: 1.8 };
/**
 * Which way each cloud's bubbles head on the screen: the upper's off to the page's left edge, above the
 * lower cloud, and the lower's down toward the thinker off the page's lower left.
 */
const BEADS_TOWARD: readonly [Pt, Pt] = [unit({ x: -1, y: 0.22 }), unit({ x: -0.55, y: 1 })];
/** On a phone too short for that, the lower cloud's bubbles rise toward the page's left edge instead. */
const BEADS_RISING = unit({ x: -0.75, y: -0.65 });

/** A row of bubbles leaving the cloud's white along `dir`, along a gentle bend. */
function beadRow(white: readonly Pt[], dir: Pt): Bead[] {
  const from = exitAlong(white, dir);
  const side = perp(dir);
  let at = 0;
  return BEADS.radii.map((r, i) => {
    at += (i === 0 ? 0 : BEADS.radii[i - 1]) + BEADS.gaps[i] + r;
    const bend = 3.5 * Math.sin((at / 70) * Math.PI);
    return { at: add(add(from, mul(dir, at)), mul(side, bend)), r };
  });
}

/** A bubble's oval: a little wider than tall, turned along its row, grown by `grow` px. */
const beadOval =
  ({ at, r }: Bead, turn: number) =>
  (t: number, grow = 0) =>
    add(
      at,
      rotate({ x: (r * 1.07 + grow) * Math.cos(t), y: (r * 0.93 + grow) * Math.sin(t) }, turn),
    );

/** One bubble inked: a single pen stroke round its oval, closing a little past and outside where it began. */
function beadInk(bead: Bead, turn: number, random: () => number, pen = BEADS.pen): string {
  const oval = beadOval(bead, turn);
  const from = random() * TAU;
  const count = Math.max(24, Math.round(bead.r * 5));
  const pts: PenPoint[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = oval(from + t * (TAU + 0.5), -0.25 + 0.7 * t);
    pts.push({ ...p, w: Math.max(0.22, pen * pressure(t, 0.35, 0.6, 1.2)) });
  }
  return penStroke(pts);
}

/** A lone bubble round (0, 0), white and inked: the puffs a roll blows out of a cloud. */
export function beadShape(r: number, seed: number): { white: string; ink: string } {
  const bead = { at: { x: 0, y: 0 }, r };
  const oval = beadOval(bead, 0);
  return {
    white: outline(Array.from({ length: 36 }, (_, i) => oval((i / 36) * TAU))),
    ink: beadInk(bead, 0, seededRandom(seed)),
  };
}

/** The bubbles' white, and their ink once per boil frame. */
function beadsDrawn(beads: readonly Bead[], dir: Pt, seed: number) {
  const turn = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  const white = beads
    .map((bead) =>
      outline(Array.from({ length: 36 }, (_, i) => beadOval(bead, turn)((i / 36) * TAU))),
    )
    .join("");
  const inks = Array.from({ length: BOIL.frames }, (_, frame) => {
    const ink = boilRandom(seed, frame);
    return beads.map((bead) => beadInk(bead, turn, ink)).join("");
  });
  return { white, inks };
}

/** Each reroll, in px: its die and lettering side by side under the cloud's right edge. */
const REROLL = {
  die: 32,
  label: 64,
  gap: 3,
  height: 32,
  /** The die's center sits this far in from the cloud's rightmost reach. */
  inset: 18,
  /** And its top this far under the cloud's foot there. */
  below: 6,
  /** Beside its cloud on a short phone, this far out from the cloud's right reach. */
  beside: 6,
};
/** Room kept between the two clouds, and between one cloud and the other's bubbles or reroll. */
const CLEAR_PX = 8;
/** The clouds keep this far from the screen's sides: the lower's left, the upper's right. */
const SIDE_PX = { left: 26, right: 18 };
/** Where the pair stands in the space between the timer's label and the task line: a little above the middle. */
export const PAIR_AT = 0.45;
/** The room kept between the pair and the timer's label above it, and the task over Begin below it, in px. */
export const ROOM_PX = 14;
/** A blown-up die's cloud smokes from its top edge, this far in from its right end, in px. */
const SMOKE_IN_PX = [62, 36];

export interface PlacedBalloon {
  spec: BalloonSpec;
  /** The cloud's center on the screen; it's drawn turned by its spec's tilt round it. */
  center: Pt;
  cloud: Cloud;
  /** The cloud's white as SVG path data, and its reach round its center, ink included. */
  whitePath: string;
  cloudBox: Box;
  beads: readonly Bead[];
  beadsWhite: string;
  /** The bubbles' ink, once per boil frame. */
  beadsInks: readonly string[];
  /** The bubbles' reach in the cloud's frame, ink included. */
  beadsBox: Box;
  /** Where smoke rises from the cloud once its die blows up: on its top edge toward its right end, in its frame. */
  smoke: readonly Pt[];
  /** The reroll's die and lettering on the screen. */
  reroll: Box;
  /** The die's center on the screen. */
  die: Pt;
  /** The cloud's reach on the screen. */
  reach: Box;
}

/** How far the clouds tightened, rather than scaled, to fit a space shorter than the pair. */
export type Fit = "roomy" | "tight" | "tighter";

export interface PairLayout {
  /** The screen's width the pair was laid out on. */
  width: number;
  fit: Fit;
  /** The upper cloud and the lower. */
  balloons: readonly [PlacedBalloon, PlacedBalloon];
}

/** A point in `placed`'s own frame, on the screen. */
export const toScreen = (placed: Pick<PlacedBalloon, "center" | "spec">, p: Pt): Pt =>
  add(placed.center, rotate(p, placed.spec.tilt));

/** The highest (`top`) or lowest point of `pts` within `from`..`to` across, or null when none falls there. */
function edgeWithin(pts: readonly Pt[], from: number, to: number, top: boolean): number | null {
  let edge: number | null = null;
  for (const p of pts)
    if (p.x >= from && p.x <= to)
      edge = edge === null ? p.y : top ? Math.min(edge, p.y) : Math.max(edge, p.y);
  return edge;
}

/** One cloud drawn and turned round its center (0, 0), with its bubbles and reroll. */
function drawn(balloon: Balloon, spec: BalloonSpec, short = false) {
  const cloud = cloudShape(spec);
  const turned = cloud.white.map((p) => rotate(p, spec.tilt));
  const toward = short && balloon === 1 ? BEADS_RISING : BEADS_TOWARD[balloon];
  const dir = rotate(toward, -spec.tilt);
  const beads = beadRow(cloud.white, dir);
  const beadsTurned = beads.map(({ at, r }) => ({ at: rotate(at, spec.tilt), r }));
  const reach = boxOf(turned);
  const dieX = reach.maxX - REROLL.inset;
  const left = dieX - REROLL.die / 2 - REROLL.gap - REROLL.label;
  const right = dieX + REROLL.die / 2;
  const foot = edgeWithin(turned, left, right, false) ?? reach.maxY;
  const top = foot + REROLL.below;
  return {
    spec,
    cloud,
    turned,
    beads,
    beadsTurned,
    ...beadsDrawn(beads, dir, spec.seed + 101),
    reroll: { minX: left, minY: top, maxX: right, maxY: top + REROLL.height },
    die: { x: dieX, y: top + REROLL.height / 2 },
  };
}
type Drawn = ReturnType<typeof drawn>;

/**
 * The lower cloud with its reroll by its right side, level with its lower half, rather than under it,
 * where a short phone has no room below; never higher than `clearOf`, the upper reroll's foot in the
 * lower cloud's frame, so the two rerolls never meet.
 */
function besideItsCloud(lower: Drawn, clearOf: number): Drawn {
  const reach = boxOf(lower.turned);
  const left = reach.maxX + REROLL.beside;
  const right = left + REROLL.label + REROLL.gap + REROLL.die;
  const top = Math.max(reach.maxY * 0.35 - REROLL.height / 2, clearOf + CLEAR_PX);
  return {
    ...lower,
    reroll: { minX: left, minY: top, maxX: right, maxY: top + REROLL.height },
    die: { x: right - REROLL.die / 2, y: top + REROLL.height / 2 },
  };
}

/**
 * How far below the upper cloud's center the lower's must be, so the clouds, the upper's bubbles and
 * its reroll all keep clear of the lower cloud, `dx` being the lower cloud's center less the upper's.
 */
function apart(upper: Drawn, lower: Drawn, dx: number): number {
  let need = 0;
  const below = (from: number, to: number, bottom: number) => {
    for (let x = from; x <= to; x += 2) {
      const top = edgeWithin(lower.turned, x - dx - 1.5, x - dx + 1.5, true);
      if (top !== null) need = Math.max(need, bottom - top + CLEAR_PX);
    }
  };
  for (let x = Math.min(...upper.turned.map((p) => p.x)); x <= upper.reroll.maxX; x += 2) {
    const foot = edgeWithin(upper.turned, x - 1.5, x + 1.5, false);
    if (foot !== null) below(x, x, foot);
  }
  below(upper.reroll.minX, upper.reroll.maxX, upper.reroll.maxY);
  for (const { at, r } of upper.beadsTurned) below(at.x - r, at.x + r, at.y + r);
  return need;
}

/**
 * The pair between the timer's label (`top`) and the task line (`bottom`) on a screen `width` wide:
 * the upper cloud to the right, the lower to the left, each with its bubbles and its reroll, about
 * PAIR_AT of the way down the space; tightened on a short phone, and never so close the clouds meet.
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
  const space = bottom - top;
  /** The pair with clouds cut to `cut`; `beside` sets the lower reroll by its cloud's right side, not under it. */
  const arrange = (cut: Partial<BalloonSpec>, beside: boolean) => {
    const specs = BALLOONS.map((s) => ({ ...s, ...cut }));
    const upper = drawn(0, specs[0]);
    const under = drawn(1, specs[1], beside);
    const x = [
      width - SIDE_PX.right - Math.max(...upper.turned.map((p) => p.x), upper.reroll.maxX),
      SIDE_PX.left - Math.min(...under.turned.map((p) => p.x)),
    ];
    const dy = apart(upper, under, x[1] - x[0]);
    const lower = beside ? besideItsCloud(under, upper.reroll.maxY - dy) : under;
    const extents = [
      ...upper.turned.map((p) => p.y),
      ...upper.beadsTurned.flatMap(({ at, r }) => [at.y - r, at.y + r]),
      upper.reroll.maxY,
    ];
    const lowerExtents = [
      ...lower.turned.map((p) => p.y),
      ...lower.beadsTurned.map(({ at, r }) => at.y + r),
      lower.reroll.maxY,
    ];
    const head = Math.min(...extents);
    const foot = Math.max(...extents, ...lowerExtents.map((y) => y + dy));
    return { upper, lower, x, dy, head, height: foot - head };
  };
  let pair = arrange({}, false);
  let fit: Fit = "roomy";
  if (pair.height > space) [pair, fit] = [arrange(TIGHT, false), "tight"];
  // Still too tall: the lower reroll moves up beside its cloud, and then, as on an iPhone SE inside
  // LINE, the clouds tighten further, so the pair keeps clear of the timer's label and its note.
  if (pair.height > space) pair = arrange(TIGHT, true);
  if (pair.height > space) [pair, fit] = [arrange(TIGHTER, true), "tighter"];
  const room = space - pair.height;
  // A pair taller than the space even so keeps its foot on the task line's room, giving up some of
  // the room under the timer's label instead, so nothing ever lands on the task line or Begin.
  const pairTop =
    room >= 0 ? top + clamp(PAIR_AT * space - pair.height / 2, 0, room) : bottom - pair.height;
  const upperY = pairTop - pair.head;
  const place = (d: Drawn, center: Pt): PlacedBalloon => {
    const shift = (b: Box): Box => ({
      minX: b.minX + center.x,
      minY: b.minY + center.y,
      maxX: b.maxX + center.x,
      maxY: b.maxY + center.y,
    });
    return {
      spec: d.spec,
      center,
      cloud: d.cloud,
      whitePath: outline(d.cloud.white),
      cloudBox: grow(boxOf(d.cloud.white), INK_REACH_PX),
      beads: d.beads,
      beadsWhite: d.white,
      beadsInks: d.inks,
      beadsBox: grow(
        boxOf(d.beads.flatMap(({ at, r }) => [add(at, { x: r, y: r }), sub(at, { x: r, y: r })])),
        INK_REACH_PX,
      ),
      smoke: SMOKE_IN_PX.map((inset) => {
        const x = boxOf(d.cloud.white).maxX - inset;
        return { x, y: (edgeWithin(d.cloud.white, x - 3, x + 3, true) ?? 0) + 2 };
      }),
      reroll: shift(d.reroll),
      die: add(d.die, center),
      reach: shift(boxOf(d.turned)),
    };
  };
  return {
    width,
    fit,
    balloons: [
      place(pair.upper, { x: pair.x[0], y: upperY }),
      place(pair.lower, { x: pair.x[1], y: upperY + pair.dy }),
    ],
  };
}

/** Furigana stays at 11 px or more, so a word it sits on is never set under this. */
export const FURIGANA_WORD_MIN_PX = 20;
/**
 * A word's size by its length, one or two characters, then three to six, by how far the clouds
 * tightened: the longer words a size smaller in the tighter clouds.
 */
const WORD_PX = {
  roomy: [46, 46, 42, 36, 32, 28],
  tight: [36, 36, 36, 36, 32, 28],
  tighter: [36, 36, 32, 28, 26, 24],
} as const satisfies Record<Fit, readonly number[]>;
/** A Latin acronym such as SNS, which sets wider than kana or kanji. */
const ACRONYM_PX = { roomy: 40, tight: 36, tighter: 32 } as const satisfies Record<Fit, number>;

/** The size a subject's word is set at in its cloud, in px. */
export function wordSizePx(ja: string, fit: Fit): number {
  if (/^[A-Z]+$/.test(ja)) return ACRONYM_PX[fit];
  const sizes = WORD_PX[fit];
  return sizes[Math.min(Math.max(charCount(ja), 1), sizes.length) - 1];
}

/** The clouds' type, in px: the reading, and the room between it and the word. */
export const TYPE = { readingPx: 12, gapPx: 2 };
/** On a short phone the lines close up rather than scaling, so nothing goes under the 11 px floor. */
export const TIGHT_TYPE = { ...TYPE, gapPx: 0 };
