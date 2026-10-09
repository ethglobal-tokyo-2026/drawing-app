import { seededRandom } from "../ui/seededRandom";
import { BOIL } from "./dealMotion";
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
  /** Seeds its lobes, so a cloud is drawn the same every time. */
  seed: number;
}

/** Each cloud's lean and seed, by its place in the deal: rows of two, two and one, read left to right. */
const CLOUDS = [
  { tilt: 2, seed: 7 },
  { tilt: -2.5, seed: 23 },
  { tilt: -1.5, seed: 41 },
  { tilt: 2.5, seed: 59 },
  { tilt: -2, seed: 73 },
] as const satisfies readonly Pick<BalloonSpec, "tilt" | "seed">[];
/** The places in each row; the die takes the last row's right-hand room. */
const ROWS = [[0, 1], [2, 3], [4]] as const;

/** How far the clouds tightened, rather than scaled, to fit a space shorter than the deal. */
export type Fit = "roomy" | "tight" | "tighter";
/** The word area's height, the room round it, the lobes, and how much lower the right-hand clouds sit. */
const FITS = {
  roomy: { h: 54, padY: 10, lobe: 15, stagger: 10 },
  tight: { h: 46, padY: 7, lobe: 12, stagger: 4 },
  tighter: { h: 40, padY: 5, lobe: 10, stagger: 0 },
} as const satisfies Record<Fit, Pick<BalloonSpec, "h" | "padY" | "lobe"> & { stagger: number }>;

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
const shift = (b: Box, by: Pt): Box => ({
  minX: b.minX + by.x,
  minY: b.minY + by.y,
  maxX: b.maxX + by.x,
  maxY: b.maxY + by.y,
});
/** How far a cloud's ink reaches past its white, at the pen's heaviest. */
const INK_REACH_PX = 4;

/** Down and to the right, away from the app's one light: a pen line sits heavier on that side. */
const SHADE = unit({ x: 1, y: 1.15 });

/** The lobes' rhythm round the cloud, big and small, as a hand varies them. */
const LOBE_RHYTHM = [1.25, 0.8, 1.05, 1.3, 0.78, 1.12, 0.92, 1.28, 0.82, 1.08, 0.95];
/**
 * The G-pen, in px: its line at its heaviest before the shade side adds to it, at its finest, and how
 * far a lobe's stroke starts before its cusp and runs past the next.
 */
const PEN = { heavy: 2.6, shade: 0.3, fine: 0.55, before: 1.1, after: 2.4, wobble: 0.35 };
/** The white reaches this far past the word area on each side, before its lobes, in px. */
const PAD_X = 14;

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
  const ax = spec.w / 2 + PAD_X;
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

/** A puff's pen, in px. */
const PUFF_PEN = 1.8;

/** A puff's oval round (0, 0): a little wider than tall, grown by `grow` px. */
const puffOval =
  (r: number) =>
  (t: number, grow = 0) => ({
    x: (r * 1.07 + grow) * Math.cos(t),
    y: (r * 0.93 + grow) * Math.sin(t),
  });

/** A lone puff round (0, 0), white and inked in one stroke closing a little past where it began. */
export function beadShape(r: number, seed: number): { white: string; ink: string } {
  const oval = puffOval(r);
  const random = seededRandom(seed);
  const from = random() * TAU;
  const count = Math.max(24, Math.round(r * 5));
  const pts: PenPoint[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = oval(from + t * (TAU + 0.5), -0.25 + 0.7 * t);
    pts.push({ ...p, w: Math.max(0.22, PUFF_PEN * pressure(t, 0.35, 0.6, 1.2)) });
  }
  return {
    white: outline(Array.from({ length: 36 }, (_, i) => oval((i / 36) * TAU))),
    ink: penStroke(pts),
  };
}

/** The reroll, in px: the die and its lettering side by side, in the last row's right-hand room. */
const REROLL = { die: 32, label: 64, gap: 3, height: 32 };
/** Room kept between two clouds side by side, and between rows, in px. */
const CLEAR_PX = { x: 6, y: 4 };
/** The clouds keep this far from the screen's sides, in px. */
const SIDE_PX = 10;
/** The narrowest word area a cloud is cut to, in px. */
const MIN_WORD_W = 80;
/** Where the deal stands in the space between the timer's label and the task line: a little above the middle. */
export const DEAL_AT = 0.45;
/** The room kept between the deal and the timer's label above it, and the task over Begin below it, in px. */
export const ROOM_PX = 14;

export interface PlacedBalloon {
  spec: BalloonSpec;
  /** The cloud's center on the screen; it's drawn turned by its spec's tilt round it. */
  center: Pt;
  cloud: Cloud;
  /** The cloud's white as SVG path data, and its reach round its center, ink included. */
  whitePath: string;
  cloudBox: Box;
  /** The cloud's reach on the screen. */
  reach: Box;
}

export interface DealLayout {
  /** The screen's width the deal was laid out on. */
  width: number;
  fit: Fit;
  /** One cloud per place in the deal. */
  balloons: readonly PlacedBalloon[];
  /** The reroll's die and lettering on the screen, and the die's center. */
  reroll: Box;
  die: Pt;
}

/** A point in `placed`'s own frame, on the screen. */
export const toScreen = (placed: Pick<PlacedBalloon, "center" | "spec">, p: Pt): Pt =>
  add(placed.center, rotate(p, placed.spec.tilt));

/** One cloud drawn and turned round its center (0, 0), and its reach. */
function drawn(spec: BalloonSpec) {
  const cloud = cloudShape(spec);
  return { spec, cloud, reach: boxOf(cloud.white.map((p) => rotate(p, spec.tilt))) };
}
type Drawn = ReturnType<typeof drawn>;

/**
 * The five clouds between the timer's label (`top`) and the task line (`bottom`) on a screen `width`
 * wide, in rows of two, two and one, the reroll beside the last; as wide as two side by side allow, and
 * tightened rather than scaled on a short phone. A deal taller than the space even so keeps its foot on
 * the task line's room, giving up some of the room under the timer's label.
 */
export function dealLayout({
  width,
  top,
  bottom,
}: {
  width: number;
  top: number;
  bottom: number;
}): DealLayout {
  const space = bottom - top;
  const arrange = (fit: Fit) => {
    const { stagger, ...cut } = FITS[fit];
    const draw = (w: number) => CLOUDS.map((c) => drawn({ ...c, ...cut, w }));
    // The widest word area two clouds side by side leave room for.
    let w = Math.floor((width - 2 * SIDE_PX - CLEAR_PX.x) / 2 - 2 * PAD_X);
    let clouds: Drawn[] = draw(w);
    const across = ({ reach }: Drawn) => reach.maxX - reach.minX;
    const sideBySide = (cs: readonly Drawn[]) =>
      ROWS.every((row) => {
        const [left, right] = row.map((place) => cs[place]);
        return !right || across(left) + across(right) + CLEAR_PX.x + 2 * SIDE_PX <= width;
      });
    while (!sideBySide(clouds) && w > MIN_WORD_W) clouds = draw((w -= 2));
    const centers: Pt[] = [];
    let y = 0;
    for (const row of ROWS) {
      const height = Math.max(
        ...row.map((place) => clouds[place].reach.maxY - clouds[place].reach.minY),
      );
      row.forEach((place, column) => {
        const { reach } = clouds[place];
        const x = column === 0 ? SIDE_PX - reach.minX : width - SIDE_PX - reach.maxX;
        centers[place] = { x, y: y - reach.minY + column * stagger };
      });
      y += height + CLEAR_PX.y;
    }
    // The die sits where a sixth cloud would: centered in the right-hand column of the last row.
    const right = clouds[1];
    const dieRow = centers[ROWS[2][0]].y + stagger;
    const middle = width - SIDE_PX - (right.reach.maxX - right.reach.minX) / 2;
    const rerollW = REROLL.label + REROLL.gap + REROLL.die;
    const reroll: Box = {
      minX: middle - rerollW / 2,
      minY: dieRow - REROLL.height / 2,
      maxX: middle + rerollW / 2,
      maxY: dieRow + REROLL.height / 2,
    };
    const reaches = clouds.map((c, place) => shift(c.reach, centers[place]));
    const head = Math.min(...reaches.map((r) => r.minY));
    const foot = Math.max(...reaches.map((r) => r.maxY), reroll.maxY);
    return { clouds, centers, reroll, head, height: foot - head };
  };
  let fit: Fit = "roomy";
  let deal = arrange(fit);
  for (const tighter of ["tight", "tighter"] as const)
    if (deal.height > space) [deal, fit] = [arrange(tighter), tighter];
  const room = space - deal.height;
  const dealTop =
    room >= 0 ? top + clamp(DEAL_AT * space - deal.height / 2, 0, room) : bottom - deal.height;
  const down = { x: 0, y: dealTop - deal.head };
  return {
    width,
    fit,
    balloons: deal.clouds.map(({ spec, cloud, reach }, place) => {
      const center = add(deal.centers[place], down);
      return {
        spec,
        center,
        cloud,
        whitePath: outline(cloud.white),
        cloudBox: grow(boxOf(cloud.white), INK_REACH_PX),
        reach: shift(reach, center),
      };
    }),
    reroll: shift(deal.reroll, down),
    die: {
      x: deal.reroll.maxX - REROLL.die / 2,
      y: (deal.reroll.minY + deal.reroll.maxY) / 2 + down.y,
    },
  };
}

/** Furigana stays at 11 px or more, so a word it sits on is never set under this. */
export const FURIGANA_WORD_MIN_PX = 20;
/**
 * A word's size by its length, one or two characters, then three to six, by how far the clouds
 * tightened; a word too long for its cloud's width at that size is set smaller to fit it.
 */
const WORD_PX = {
  roomy: [36, 36, 32, 28, 26, 24],
  tight: [32, 32, 28, 26, 24, 22],
  tighter: [26, 26, 24, 22, 22, 20],
} as const satisfies Record<Fit, readonly number[]>;
/** A Latin acronym such as SNS, which sets narrower than kana or kanji. */
const ACRONYM_PX = { roomy: 32, tight: 28, tighter: 24 } as const satisfies Record<Fit, number>;
/** How wide a character sets, in ems: full width with the word's spacing, or a capital letter. */
const WORD_EM = 1.04;
const ACRONYM_EM = 0.75;

/** The size a subject's word is set at in a cloud whose word area is `w` px wide, in px. */
export function wordSizePx(ja: string, fit: Fit, w: number): number {
  const chars = Math.max(charCount(ja), 1);
  if (/^[A-Z]+$/.test(ja)) return Math.min(ACRONYM_PX[fit], Math.floor(w / (chars * ACRONYM_EM)));
  const sizes = WORD_PX[fit];
  return Math.min(sizes[Math.min(chars, sizes.length) - 1], Math.floor(w / (chars * WORD_EM)));
}

/** The clouds' type, in px: the reading, and the room between it and the word. */
export const TYPE = { readingPx: 12, gapPx: 2 };
/** On a short phone the lines close up rather than scaling, so nothing goes under the 11 px floor. */
export const TIGHT_TYPE = { readingPx: 11, gapPx: 0 };
