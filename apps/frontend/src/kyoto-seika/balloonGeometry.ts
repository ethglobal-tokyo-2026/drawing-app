import { seededRandom } from "../ui/seededRandom";
import { BOIL } from "./dealMotion";
import { outline, penStroke, pressure, wobble, type PenPoint, type Pt } from "./pen";
import { charCount, type KyotoSeikaSubjectEntry, type SubjectKind } from "./subjectList";

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

/** How far the clouds tightened, rather than scaled, to fit a space shorter than the deal. */
export type Fit = "roomy" | "tight" | "tighter";
/** The word area's height, the room round it, and the lobes. */
const FITS = {
  roomy: { h: 54, padY: 10, lobe: 15 },
  tight: { h: 46, padY: 7, lobe: 12 },
  tighter: { h: 40, padY: 5, lobe: 10 },
} as const satisfies Record<Fit, Pick<BalloonSpec, "h" | "padY" | "lobe">>;
const FIT_ORDER = ["roomy", "tight", "tighter"] as const satisfies readonly Fit[];

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
 * The G-pen, in px: its line at its heaviest before the shade side adds to it, at its finest, how far a
 * lobe's stroke starts before its cusp and runs past the next, give or take half `runOnJitter`, so the
 * lines cross at each cusp with nothing sticking out into the white, and how far it wanders off the lobe.
 */
export const PEN = {
  heavy: 2.6,
  shade: 0.3,
  fine: 0.55,
  before: 0.5,
  after: 0.9,
  runOnJitter: 0.3,
  wobble: 0.35,
};
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

/** How squared-off the ellipse a cloud's lobes run round is: 2 is an ellipse. */
const SQUARENESS = 2.6;

/** One lobe: an arc round `center` from `a0` through `span` radians, turning `turn`, bulging along `out`. */
interface Lobe {
  center: Pt;
  radius: number;
  a0: number;
  span: number;
  turn: number;
  out: Pt;
  chord: number;
}

/**
 * A manga thought cloud's lobes round its word area: lobes of different sizes round a squared-off
 * ellipse, bigger where the cloud piles up along its top, and the white they close round.
 */
function lobesOf(spec: BalloonSpec): { white: Pt[]; lobes: Lobe[] } {
  const random = seededRandom(spec.seed);
  const ax = spec.w / 2 + PAD_X;
  const ay = spec.h / 2 + spec.padY;
  const base = (t: number): Pt => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return {
      x: ax * Math.sign(c) * Math.abs(c) ** (2 / SQUARENESS),
      y: ay * Math.sign(s) * Math.abs(s) ** (2 / SQUARENESS),
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
  const lobes: Lobe[] = [];
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
    lobes.push({ center, radius, a0, span, turn, out, chord });
  }
  return { white, lobes };
}

/** A cloud's white alone, as a closed outline round its center: all laying the deal out measures. */
const cloudWhite = (spec: BalloonSpec): readonly Pt[] => lobesOf(spec).white;

/**
 * A manga thought cloud round its word area, inked lobe by lobe: each lobe one stroke that swells and
 * tapers and crosses the next at its cusp.
 */
export function cloudShape(spec: BalloonSpec): Cloud {
  const { white, lobes } = lobesOf(spec);
  // Each inking of a lobe lands, runs on and presses a little differently.
  const stroke = ({ center, radius, a0, span, turn, out, chord }: Lobe, ink: () => number) => {
    const count = Math.max(8, Math.round(chord / 4));
    const heavy = PEN.heavy * (1 + PEN.shade * dot(out, SHADE)) * (1 + (ink() - 0.5) * 0.12);
    const before = (PEN.before + (ink() - 0.5) * PEN.runOnJitter) / radius;
    const after = (PEN.after + (ink() - 0.5) * PEN.runOnJitter) / radius;
    const wob = wobble(ink, 2);
    const pts: PenPoint[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const ang = a0 + turn * (-before + t * (span + before + after));
      const p = add(center, mul(polar(ang), radius + PEN.wobble * wob(t)));
      pts.push({ ...p, w: PEN.fine + (heavy - PEN.fine) * pressure(t, 0.44, 0.65, 1.05) });
    }
    return penStroke(pts);
  };
  const inks = Array.from({ length: BOIL.frames }, (_, frame) => {
    const ink = boilRandom(spec.seed, frame);
    return lobes.map((lobe) => stroke(lobe, ink)).join("");
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

/** The reroll, in px: the die and its lettering side by side. */
const REROLL = { die: 32, label: 64, gap: 3, height: 32 };
const REROLL_W = REROLL.label + REROLL.gap + REROLL.die;
/** Room kept between two clouds side by side where the widest word area is cut, in px. */
const CLEAR_X_PX = 6;
/** The clouds keep this far from the screen's sides, in px. */
const SIDE_PX = 10;
/** The narrowest word area a cloud is cut to, in px. */
const MIN_WORD_W = 80;
/** The die keeps this far from every cloud's outline, and the trail from the die, in px. */
export const DIE_CLEAR_PX = 6;
/** The trail's bubbles keep this far from every cloud's outline, in px. */
const BEAD_CLEAR_PX = 3;
/** From this pair area width the five stand three over two; narrower, two, one and two. */
export const WIDE_DEAL_PX = 500;
/** Where the deal stands in the space between the timer's label and the task line: a little above the middle. */
export const DEAL_AT = 0.45;
/** The room kept between the deal and the timer's label above it, and the task over Begin below it, in px. */
export const ROOM_PX = 14;

/** A word a seat must hold: every word its kind can be dealt. */
type SeatWord = Pick<KyotoSeikaSubjectEntry, "ja" | "reading" | "kind">;
/** How wide a reading's character sets, in ems, its letter spacing included. */
const READING_EM = 1.12;
/** The narrowest seat, in px. */
const MIN_SEAT_W = 64;
/** A seat is cut up to this much wider than its words need, by its seed, never past the widest word area. */
const SEAT_GROW = 0.06;
/** How far each cloud leans, in degrees, each the other way from its neighbor. */
const TILT = { least: 1, most: 3 };
/** Clouds touch with this much of their lobes overlapping, so their outlines just cross. */
const KISS = 0.3;
/** Room kept between a cloud's word area and any other cloud's outline, in px. */
const WORD_CLEAR_PX = 2;
/** How much of a lobe's bulge counts toward a cloud's reach: lobes bulge their most only here and there. */
const LOBE_REACH = 0.8;
/** Rounds of pushing touching clouds together and overlapping ones apart, then of parting any outline from a word. */
const RELAX = { rounds: 70, partRounds: 30, partPx: 1.5 };
/** The trail's three bubbles, largest by its cloud, in px; a tightened deal draws them smaller. */
const TRAIL = { radii: [7, 5, 3.4], tight: 0.85 };
/** Ways the trail may run from its cloud, first choice first: down toward the artist at the lower left. */
const TRAIL_WAYS = [
  { x: -0.62, y: 0.78 },
  { x: -0.4, y: 0.92 },
  { x: -0.85, y: 0.52 },
  { x: 0.1, y: 1 },
].map(unit);

/** Two pairs of clouds side by side, each leaning the other way from its neighbor. */
const SIDE_BY_SIDE = [
  [
    { tilt: 2, seed: 7 },
    { tilt: -2.5, seed: 23 },
  ],
  [
    { tilt: -1.5, seed: 41 },
    { tilt: 2.5, seed: 59 },
  ],
] as const;

const widestKnown = new Map<string, number>();
/** The widest word area two clouds side by side leave room for on a screen `width` wide: no seat is wider. */
export function widestWordArea(width: number, fit: Fit): number {
  const key = `${width} ${fit}`;
  const known = widestKnown.get(key);
  if (known !== undefined) return known;
  const across = (lean: { tilt: number; seed: number }, w: number) => {
    const reach = boxOf(cloudWhite({ ...lean, ...FITS[fit], w }).map((p) => rotate(p, lean.tilt)));
    return reach.maxX - reach.minX;
  };
  let w = Math.floor((width - 2 * SIDE_PX - CLEAR_X_PX) / 2 - 2 * PAD_X);
  const sideBySide = () =>
    SIDE_BY_SIDE.every(
      ([left, right]) => across(left, w) + across(right, w) + CLEAR_X_PX + 2 * SIDE_PX <= width,
    );
  while (!sideBySide() && w > MIN_WORD_W) w -= 2;
  widestKnown.set(key, w);
  return w;
}

/** How wide `word` and its reading set in a cloud `w` wide, in px. */
function wordWidth({ ja, reading }: SeatWord, fit: Fit, w: number): number {
  const { readingPx } = fit === "roomy" ? TYPE : TIGHT_TYPE;
  const em = isAcronym(ja) ? ACRONYM_EM : WORD_EM;
  return Math.max(
    charCount(ja) * wordSizePx(ja, fit, w) * em,
    charCount(reading) * readingPx * READING_EM,
  );
}

/** Each kind's seat: as wide as its widest word sets in the widest word area, and no wider than that. */
function seatWidths(list: readonly SeatWord[], fit: Fit, area: number) {
  const seats = new Map<SubjectKind, number>();
  for (const word of list) {
    const need = Math.ceil(wordWidth(word, fit, area));
    seats.set(word.kind, Math.min(area, Math.max(seats.get(word.kind) ?? MIN_SEAT_W, need)));
  }
  return seats;
}

/** Mixes numbers into one seed. */
function mixSeed(...ns: number[]): number {
  let h = 0x811c9dc5;
  for (const n of ns) {
    h = Math.imul(h ^ (n >>> 0), 0x01000193);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** How far a cloud reaches from its center toward the unit direction `u`: its ellipse, turned, and most of a lobe. */
function reachToward(spec: BalloonSpec, u: Pt): number {
  const v = rotate(u, -spec.tilt);
  const dual = SQUARENESS / (SQUARENESS - 1);
  const ax = spec.w / 2 + PAD_X;
  const ay = spec.h / 2 + spec.padY;
  const ellipse = (Math.abs(ax * v.x) ** dual + Math.abs(ay * v.y) ** dual) ** (1 / dual);
  return ellipse + spec.lobe * LOBE_REACH;
}
const halfW = (spec: BalloonSpec) => reachToward(spec, { x: 1, y: 0 });
const halfH = (spec: BalloonSpec) => reachToward(spec, { x: 0, y: 1 });

/** Directions round half a turn that two clouds' overlap is measured along. */
const AXES = Array.from({ length: 18 }, (_, i) => polar((i * Math.PI) / 18));

/** How deep two clouds overlap, and the way from `a` toward `b` they'd part by most easily. */
function overlap(a: BalloonSpec, at: Pt, b: BalloonSpec, bt: Pt) {
  let best = { depth: Infinity, toward: AXES[0] };
  for (const axis of AXES) {
    const apart = dot(sub(bt, at), axis);
    const toward = apart < 0 ? mul(axis, -1) : axis;
    const depth = reachToward(a, toward) + reachToward(b, mul(toward, -1)) - Math.abs(apart);
    if (depth < best.depth) best = { depth, toward };
  }
  return best;
}

/** Whether `p` lies inside the closed outline `poly` (even-odd). */
function inside(p: Pt, poly: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      hit = !hit;
  }
  return hit;
}
const inBox = (p: Pt, b: Box) => p.x > b.minX && p.x < b.maxX && p.y > b.minY && p.y < b.maxY;
const meets = (a: Box, b: Box) =>
  a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
const union = (boxes: readonly Box[]): Box => ({
  minX: Math.min(...boxes.map((b) => b.minX)),
  minY: Math.min(...boxes.map((b) => b.minY)),
  maxX: Math.max(...boxes.map((b) => b.maxX)),
  maxY: Math.max(...boxes.map((b) => b.maxY)),
});

/** A seat plan's slots: the trail runs from the fourth, the lowest on the left, and the die goes by the last. */
const TRAIL_SLOT = 3;
const DIE_SLOT = 4;

/**
 * A seat plan: which place takes each slot, given the places widest seat first; a first guess at each
 * slot's center; and which slots' clouds touch.
 */
interface SeatPlan {
  assign: (widestFirst: readonly number[], random: () => number) => number[];
  guess: (specs: readonly BalloonSpec[], width: number, random: () => number) => Pt[];
  touch: readonly (readonly [number, number])[];
}

type SeatPlanName = "2-1-2" | "3-over-2";

const PLANS: Record<SeatPlanName, SeatPlan> = {
  // Two, one and two, like the die's five, the middle one over both rows: the narrowest kind takes
  // it. Slots: top left, top right, middle, bottom left, bottom right.
  "2-1-2": {
    assign([a, b, c, d, e], random) {
      const rows =
        random() < 0.5
          ? [
              [a, d],
              [b, c],
            ]
          : [
              [b, c],
              [a, d],
            ];
      const [top, bottom] = rows.map((row) => (random() < 0.5 ? row : row.toReversed()));
      return [top[0], top[1], e, bottom[0], bottom[1]];
    },
    guess(specs, width, random) {
      const h = Math.max(...specs.map(halfH));
      const midX = width / 2 + (random() < 0.5 ? -1 : 1) * (8 + random() * 14);
      const row = (left: number, right: number, y: number): Pt[] => [
        { x: SIDE_PX + halfW(specs[left]) + random() * 8, y: y + (random() - 0.5) * 10 },
        {
          x: width - SIDE_PX - halfW(specs[right]) - random() * 8,
          y: y + (random() - 0.5) * 10 + 6,
        },
      ];
      const top = row(0, 1, 0);
      return [...top, { x: midX, y: h * 1.25 }, ...row(3, 4, h * 2.5)];
    },
    touch: [
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 4],
    ],
  },
  // Three over two, the bottom two under the top row's gaps: the widest two weigh it down and the
  // next widest crowns it. Slots: top left, top middle, top right, bottom left, bottom right.
  "3-over-2": {
    assign([a, b, c, d, e], random) {
      return random() < 0.5 ? [d, c, e, a, b] : [e, c, d, b, a];
    },
    guess(specs, width, random) {
      const h = Math.max(...specs.map(halfH));
      const mid = { x: width / 2 + (random() - 0.5) * 12, y: -h * 0.2 };
      const left = { x: mid.x - halfW(specs[1]) - halfW(specs[0]) + 10, y: (random() - 0.3) * 12 };
      const right = { x: mid.x + halfW(specs[1]) + halfW(specs[2]) - 10, y: (random() - 0.3) * 12 };
      return [
        left,
        mid,
        right,
        { x: width / 2 - halfW(specs[3]) + 6, y: h * 1.6 + (random() - 0.5) * 10 },
        { x: width / 2 + halfW(specs[4]) - 6, y: h * 1.6 + (random() - 0.5) * 10 },
      ];
    },
    touch: [
      [0, 1],
      [1, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 4],
      [3, 4],
    ],
  },
};

/** One of the trail's bubbles: its center and radius, in px. */
export interface Bead extends Pt {
  r: number;
}

/** The deal's clouds as one cluster at `fit`, in its own frame, by slot. */
function cluster(
  plan: SeatPlan,
  fit: Fit,
  { width, kinds, list, seed }: Omit<DealInput, "top" | "bottom">,
) {
  const area = widestWordArea(width, fit);
  const seats = seatWidths(list, fit, area);
  const seatOf = (place: number) => seats.get(kinds[place]) ?? area;
  const random = seededRandom(mixSeed(seed, 7));
  const widestFirst = kinds.map((_, place) => place).sort((a, b) => seatOf(b) - seatOf(a) || a - b);
  const placeIn = plan.assign(widestFirst, random);
  const lean = random() < 0.5 ? 1 : -1;
  const specs: BalloonSpec[] = placeIn.map((place, slot) => {
    const own = seededRandom(mixSeed(seed, place, 11));
    return {
      ...FITS[fit],
      w: Math.min(area, Math.round(seatOf(place) * (1 + SEAT_GROW * own()))),
      tilt: (slot % 2 ? 1 : -1) * lean * (TILT.least + (TILT.most - TILT.least) * own()),
      seed: mixSeed(seed, place, 3) % 99_991,
    };
  });
  const centers = plan.guess(specs, width, random);
  const slots = specs.map((_, slot) => slot);
  const keepInside = () =>
    slots.forEach((slot) => {
      const half = halfW(specs[slot]);
      centers[slot] = {
        x: clamp(centers[slot].x, SIDE_PX + half, width - SIDE_PX - half),
        y: centers[slot].y,
      };
    });
  const touching = new Set(plan.touch.map(([a, b]) => `${a} ${b}`));
  const size = specs.map((s) => halfW(s) * halfH(s));
  for (let round = 0; round < RELAX.rounds; round++) {
    for (const a of slots)
      for (const b of slots.slice(a + 1)) {
        const { depth, toward } = overlap(specs[a], centers[a], specs[b], centers[b]);
        const kiss = (specs[a].lobe + specs[b].lobe) * KISS;
        let push = 0;
        if (depth > kiss + 0.5) push = depth - kiss;
        else if (touching.has(`${a} ${b}`) && depth < kiss - 0.5) push = -(kiss - depth) * 0.5;
        if (!push) continue;
        const share = size[b] / (size[a] + size[b]);
        centers[a] = sub(centers[a], mul(toward, push * share * 0.5));
        centers[b] = add(centers[b], mul(toward, push * (1 - share) * 0.5));
      }
    keepInside();
  }

  const whites = specs.map(cloudWhite);
  const turned = whites.map((white, slot) => white.map((p) => rotate(p, specs[slot].tilt)));
  // Whether b's outline reaches into a's word area, its reading included.
  const intrudes = (a: number, b: number) =>
    turned[b].some((p, i) => {
      if (i % 3) return false;
      const local = rotate(sub(add(p, centers[b]), centers[a]), -specs[a].tilt);
      return (
        Math.abs(local.x) < specs[a].w / 2 + WORD_CLEAR_PX &&
        Math.abs(local.y) < specs[a].h / 2 + WORD_CLEAR_PX
      );
    });
  for (let round = 0; round < RELAX.partRounds; round++) {
    let moved = false;
    for (const a of slots)
      for (const b of slots) {
        if (a === b || !intrudes(a, b)) continue;
        const away = unit(sub(centers[b], centers[a]));
        centers[a] = sub(centers[a], mul(away, RELAX.partPx));
        centers[b] = add(centers[b], mul(away, RELAX.partPx));
        moved = true;
      }
    keepInside();
    if (!moved) break;
  }

  const outlines = turned.map((pts, slot) => pts.map((p) => add(p, centers[slot])));
  const reaches = outlines.map(boxOf);
  const clouds = union(reaches);
  const inSides = (box: Box) => box.minX >= SIDE_PX && box.maxX <= width - SIDE_PX;
  const clearOf = (box: Box, by: number) => {
    const near = grow(box, by);
    const probes = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.minX, y: box.maxY },
      { x: box.maxX, y: box.maxY },
      { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
    ];
    return outlines.every(
      (poly) => !poly.some((p) => inBox(p, near)) && !probes.some((q) => inside(q, poly)),
    );
  };

  // The die: in a nook beside or under the last cloud, or else under the whole cluster.
  const rerollAt = (x: number, y: number): Box => ({
    minX: x,
    minY: y,
    maxX: x + REROLL_W,
    maxY: y + REROLL.height,
  });
  const last = reaches[DIE_SLOT];
  const lastAt = centers[DIE_SLOT];
  const nooks: Box[] = [];
  for (let dx = -18; dx <= 6; dx += 3)
    for (let dy = -6; dy <= 30; dy += 4)
      nooks.push(rerollAt(last.maxX + dx, lastAt.y - REROLL.height / 2 + dy));
  for (let dx = 30; dx >= -40; dx -= 5)
    nooks.push(rerollAt(lastAt.x + dx - REROLL_W / 2, last.maxY - 12));
  const right = Math.min(clouds.maxX, width - SIDE_PX) - REROLL_W;
  for (let dx = 0; dx <= 120; dx += 10)
    nooks.push(rerollAt(right - dx, clouds.maxY + DIE_CLEAR_PX + 1 - 14));
  const under = rerollAt(right, clouds.maxY + DIE_CLEAR_PX + 1);
  const reroll = nooks.find((box) => inSides(box) && clearOf(box, DIE_CLEAR_PX)) ?? under;

  // The trail: three bubbles from the lowest cloud on the left toward the artist, clear of all.
  const from = TRAIL_SLOT;
  const scale = fit === "roomy" ? 1 : TRAIL.tight;
  const beadBox = (b: Bead): Box => ({
    minX: b.x - b.r,
    minY: b.y - b.r,
    maxX: b.x + b.r,
    maxY: b.y + b.r,
  });
  let trail: Bead[] = [];
  for (const way of TRAIL_WAYS) {
    let d = reachToward(specs[from], way) - 2;
    const beads = TRAIL.radii.map((radius, i) => {
      const r = radius * scale;
      d += r + (i === 0 ? 5 : 4);
      const bead = { ...add(centers[from], mul(way, d)), r };
      d += r;
      return bead;
    });
    const clear = beads.every((b) => {
      const box = beadBox(b);
      return inSides(box) && clearOf(box, BEAD_CLEAR_PX) && !meets(box, grow(reroll, DIE_CLEAR_PX));
    });
    if (clear) {
      trail = beads;
      break;
    }
  }

  const valid =
    clearOf(reroll, DIE_CLEAR_PX) &&
    slots.every((a) => slots.every((b) => a === b || !intrudes(a, b)));
  const slotOf: number[] = [];
  placeIn.forEach((place, slot) => (slotOf[place] = slot));
  return {
    specs,
    centers,
    whites,
    reaches,
    slotOf,
    reroll,
    trail,
    valid,
    box: union([clouds, reroll, ...trail.map(beadBox)]),
  };
}

export interface PlacedBalloon {
  spec: BalloonSpec;
  /** The cloud's center on the screen; it's drawn turned by its spec's tilt round it. */
  center: Pt;
  /** The cloud's white, as a closed outline round its center. */
  white: readonly Pt[];
  /** The cloud's white as SVG path data, and its reach round its center, ink included. */
  whitePath: string;
  cloudBox: Box;
  /** The cloud's reach on the screen. */
  reach: Box;
  /** Its place in the cluster's stack: a cloud later in the plan overlaps the ones before. */
  stack: number;
}

export interface DealLayout {
  /** The screen's width the deal was laid out on. */
  width: number;
  fit: Fit;
  plan: SeatPlanName;
  /** One cloud per place in the deal. */
  balloons: readonly PlacedBalloon[];
  /** The reroll's die and lettering on the screen, and the die's center. */
  reroll: Box;
  die: Pt;
  /** The thought trail's bubbles, largest by its cloud; none when no way is clear. */
  trail: readonly Bead[];
}

/** A point in `placed`'s own frame, on the screen. */
export const toScreen = (placed: Pick<PlacedBalloon, "center" | "spec">, p: Pt): Pt =>
  add(placed.center, rotate(p, placed.spec.tilt));

export interface DealInput {
  /** The screen's width, and the space between the timer's label (`top`) and the task line (`bottom`). */
  width: number;
  top: number;
  bottom: number;
  /** Each place's kind: seats are sized by kind, so a roll never moves a cloud. */
  kinds: readonly SubjectKind[];
  /** Every word the kinds can be dealt: each seat holds its kind's widest. */
  list: readonly SeatWord[];
  /** The sheet's own seed, so a reload lays the deal out the same. */
  seed: number;
}

/**
 * The five clouds as one thought cluster between the timer's label and the task line: two, one and two
 * on a phone, three over two from WIDE_DEAL_PX, each seat sized by its kind and placed by the sheet's
 * seed, with the die in a nook by the last and a trail of bubbles toward the artist. Tightened rather
 * than scaled on a short phone; a deal taller than the space even so keeps its foot on the task line's
 * room, giving up some of the room under the timer's label.
 */
export function dealLayout(input: DealInput): DealLayout {
  const { width, top, bottom } = input;
  const space = bottom - top;
  const plan: SeatPlanName = width >= WIDE_DEAL_PX ? "3-over-2" : "2-1-2";
  const lay = (fit: Fit) => cluster(PLANS[plan], fit, input);
  const fits = (deal: ReturnType<typeof lay>) =>
    deal.valid &&
    deal.box.minX >= SIDE_PX - 0.5 &&
    deal.box.maxX <= width - SIDE_PX + 0.5 &&
    deal.box.maxY - deal.box.minY <= space;
  let fit: Fit = FIT_ORDER[0];
  let deal = lay(fit);
  for (const tighter of FIT_ORDER.slice(1)) {
    if (fits(deal)) break;
    [deal, fit] = [lay(tighter), tighter];
  }
  const height = deal.box.maxY - deal.box.minY;
  const room = space - height;
  const dealTop = room >= 0 ? top + clamp(DEAL_AT * space - height / 2, 0, room) : bottom - height;
  const down = { x: 0, y: dealTop - deal.box.minY };
  return {
    width,
    fit,
    plan,
    balloons: input.kinds.map((_, place) => {
      const slot = deal.slotOf[place];
      const white = deal.whites[slot];
      return {
        spec: deal.specs[slot],
        center: add(deal.centers[slot], down),
        white,
        whitePath: outline(white),
        cloudBox: grow(boxOf(white), INK_REACH_PX),
        reach: shift(deal.reaches[slot], down),
        stack: slot,
      };
    }),
    reroll: shift(deal.reroll, down),
    die: {
      x: deal.reroll.maxX - REROLL.die / 2,
      y: (deal.reroll.minY + deal.reroll.maxY) / 2 + down.y,
    },
    trail: deal.trail.map((b) => ({ ...b, y: b.y + down.y })),
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
const isAcronym = (ja: string) => /^[A-Z]+$/.test(ja);

/** The size a subject's word is set at in a cloud whose word area is `w` px wide, in px. */
export function wordSizePx(ja: string, fit: Fit, w: number): number {
  const chars = Math.max(charCount(ja), 1);
  if (isAcronym(ja)) return Math.min(ACRONYM_PX[fit], Math.floor(w / (chars * ACRONYM_EM)));
  const sizes = WORD_PX[fit];
  return Math.min(sizes[Math.min(chars, sizes.length) - 1], Math.floor(w / (chars * WORD_EM)));
}

/** The clouds' type, in px: the reading, and the room between it and the word. */
export const TYPE = { readingPx: 12, gapPx: 2 };
/** On a short phone the lines close up rather than scaling, so nothing goes under the 11 px floor. */
export const TIGHT_TYPE = { readingPx: 11, gapPx: 0 };
