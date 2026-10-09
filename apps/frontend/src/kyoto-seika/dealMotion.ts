import { EASE_OUT, EASE_SPRING } from "../ui/easing";
import { seededRandom } from "../ui/seededRandom";
import type { Pt } from "./pen";

// The deal's motion, from its prototype: tunable values, played through the Web Animations API.

export const SPRING = EASE_SPRING;

/** How far a drift reaches: px across and down, and degrees of tilt. */
export interface DriftReach {
  x: number;
  y: number;
  deg: number;
}

/**
 * Each cloud drifts on its own: slow seeded noise in sway, rise and tilt, each over its own loop, so
 * no two clouds fall in step. Seeds and loops by the cloud's place in the deal.
 */
export const FLOAT = {
  seeds: [11, 47, 29, 83, 61] as const,
  cloud: { x: 1.8, y: 2.6, deg: 0.7 },
  periodMs: [23_000, 29_000, 26_000, 31_000, 27_000] as const,
  /** Keyframes in one loop: enough that the straight runs between them never show. */
  keyframes: 96,
};

/**
 * The ink boils: the line shows one of a few frames drawn ahead, the next every `frameMs`. The CSS's
 * ink-boil keyframes hold each of the three frames for a third of the cycle.
 */
export const BOIL = { frames: 3, frameMs: 180 };

/** A pick's ink pools out from the tap; an unpick drains it back into the tap, quicker. */
export const POOL = { inMs: 180, drainMs: 110, drainEase: "ease-in" };

/**
 * With two picked, the other clouds' pen line and word fade to this opacity while they wait. Their
 * white stays opaque, so a cloud behind never shows through.
 */
export const FADED = 0.4;

const TAU = Math.PI * 2;
/** Each axis mixes one slow wave, one middling and one quick, as harmonics of its loop. */
const WAVES = [
  [1, 2],
  [3, 4],
  [5, 6, 7],
] as const;

/**
 * A drift through one loop (t from 0 to 1, and round again): seeded waves that come back where they
 * began, peaking at exactly `reach` on each axis.
 */
export function driftAt(seed: number, reach: DriftReach) {
  const random = seededRandom(seed);
  const axis = (amp: number) => {
    const waves = WAVES.map((choices) => {
      const harmonic = choices[Math.floor(random() * choices.length)];
      return { harmonic, weight: (0.6 + 0.8 * random()) / harmonic ** 0.45, phase: random() * TAU };
    });
    const raw = (u: number) =>
      waves.reduce((s, w) => s + w.weight * Math.sin(TAU * w.harmonic * u + w.phase), 0);
    let peak = 0;
    for (let i = 0; i < 4096; i++) peak = Math.max(peak, Math.abs(raw(i / 4096)));
    return (u: number) => (amp * raw(u)) / peak;
  };
  const x = axis(reach.x);
  const y = axis(reach.y);
  const deg = axis(reach.deg);
  return (t: number) => {
    const u = t - Math.floor(t);
    return { x: x(u), y: y(u), deg: deg(u) };
  };
}

/** A drift as Web Animations keyframes for one loop. */
export function driftKeyframes(seed: number, reach: DriftReach): Keyframe[] {
  const drift = driftAt(seed, reach);
  return Array.from({ length: FLOAT.keyframes + 1 }, (_, i) => {
    const { x, y, deg } = drift(i / FLOAT.keyframes);
    return { translate: `${x.toFixed(2)}px ${y.toFixed(2)}px`, rotate: `${deg.toFixed(3)}deg` };
  });
}

/** Each cloud puffs out and its word stamps in, in reading order. */
export const ARRIVE = {
  firstMs: 120,
  /** Each cloud starts this long after the one before. */
  staggerMs: 110,
  cloudAfterMs: 0,
  cloudMs: 420,
  wordAfterMs: 240,
  wordMs: 260,
};
export const CLOUD_ARRIVE: Keyframe[] = [
  { opacity: 0, scale: "0.55 0.5" },
  { opacity: 1, scale: "1.06 0.96", offset: 0.55 },
  { scale: "0.98 1.03", offset: 0.8 },
  { opacity: 1, scale: "1 1" },
];
export const WORD_STAMP: Keyframe[] = [
  { opacity: 0, scale: 1.35, rotate: "-6deg" },
  { opacity: 1, scale: 1, rotate: "0deg" },
];

/**
 * A roll: the die tumbles once over an edge onto its new pips with a hop, and its コロッ pops beside it.
 * Each cloud it deals again pops (POP).
 */
export const ROLL = {
  dieMs: 250,
  hopPx: 7,
  /** How far round the die starts, so it lands square on its new face. */
  tumbleDeg: 90,
  soundMs: 640,
};
/** A tumble's easing: gentle enough that the turn shows across its quarter second, not just its start. */
export const TUMBLE_EASE = "cubic-bezier(0.3, 0.6, 0.45, 1)";
export const DIE_TUMBLE: Keyframe[] = [
  { rotate: `-${ROLL.tumbleDeg}deg`, translate: "0 0", scale: "1" },
  { rotate: `-${ROLL.tumbleDeg * 0.4}deg`, translate: `0 -${ROLL.hopPx}px`, offset: 0.45 },
  { rotate: "0deg", translate: "0 0", scale: "1.08 0.92", offset: 0.82 },
  { rotate: "0deg", translate: "0 0", scale: "1" },
];

/**
 * A cloud the die deals again pops, as a cartoon ends a thought: the old cloud and its word swell, then
 * are gone in one frame; every other lobe of its pen line bursts off as a rim, beads spray off it, and
 * the new cloud puffs up where it stood, its word stamped in. Px are in the cloud's own frame.
 */
const POP = {
  swellMs: 70,
  swellScale: 1.1,
  /** Easing in, so the swell is quickest as it gives. */
  swellEase: "cubic-bezier(0.5, 0, 0.9, 0.5)",
  /** Each lobe starts `scale` times as far out, flies `px` further, and holds its ink for `holdFor`. */
  rim: { scale: 1.18, ms: 190, px: [8, 17], spinDeg: 14, endScale: 0.94, holdFor: 0.3 },
  /** Each bead leaves the rim at `r` px, flies `px` out and `liftPx` up, and holds its ink for `holdFor`. */
  beads: { count: 6, ms: 240, r: [2.6, 3.8], px: [12, 22], liftPx: 4, endScale: 0.4, holdFor: 0.5 },
  /** The new cloud and its word, from the roll. */
  cloud: { afterMs: 120, ms: 280 },
  word: { afterMs: 170, ms: 200 },
} as const;

/** Keyframes and the timing to play them with. */
export interface Motion {
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
}

/** A pop: the old cloud and word go, their burst flies, and the new cloud and word arrive. */
export interface CloudPop {
  /** For the old cloud and its word, from the look they had at the roll. */
  swell: Motion;
  /** Every other lobe of the old cloud's pen line, as path data in the cloud's frame. */
  rim: { d: string; motion: Motion }[];
  /** Beads drawn round (0, 0) at `r` px from `seed`, each leaving the rim at `at`. */
  beads: { r: number; seed: number; at: Pt; motion: Motion }[];
  cloud: Motion;
  word: Motion;
}

/** What penStroke writes each command with, and where in its numbers the command's end point sits. */
const PATH_ARITY: Record<string, number> = { M: 2, L: 2, C: 6, S: 4, A: 7, Z: 0 };

/**
 * A cloud's pen line split into its lobes, each with the middle of its reach: cloudShape inks each lobe
 * as one closed subpath of absolute commands.
 */
function inkLobes(ink: string): { d: string; middle: Pt }[] {
  return ink.split(/(?=M)/).map((d) => {
    const ends: Pt[] = [];
    for (const [, command, args] of d.matchAll(/([A-Z])([^A-Z]*)/g)) {
      const n = (args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []).map(Number);
      const arity = PATH_ARITY[command] ?? 0;
      for (let end = arity; arity > 0 && end <= n.length; end += arity)
        ends.push({ x: n[end - 2], y: n[end - 1] });
    }
    const xs = ends.map((p) => p.x);
    const ys = ends.map((p) => p.y);
    const middle = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
    return { d, middle };
  });
}

const translateTo = (p: Pt) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
const outFrom = (p: Pt): Pt => {
  const reach = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / reach, y: p.y / reach };
};

/**
 * The pop of a cloud that roll number `rolls` dealt again, seeded by the cloud's own `seed` and that
 * roll, so it plays the same every time. None under reduced motion, where the words swap in place.
 */
export function cloudPop(
  cloud: { white: readonly Pt[]; inks: readonly string[] },
  seed: number,
  rolls: number,
  reduced: boolean,
): CloudPop | null {
  if (reduced) return null;
  const random = seededRandom(seed * 7919 + rolls * 104_729);
  const between = ([lo, hi]: readonly [number, number]) => lo + (hi - lo) * random();
  const burst = { delay: POP.swellMs, easing: EASE_OUT };
  const { rim, beads } = POP;

  // Which half of the lobes bursts off varies by roll.
  const half = random() < 0.5 ? 0 : 1;
  const pieces = inkLobes(cloud.inks[0] ?? "").filter((_, i) => i % 2 === half);
  const flung = pieces.map(({ d, middle }) => {
    const at = { x: middle.x * (rim.scale - 1), y: middle.y * (rim.scale - 1) };
    const out = outFrom(middle);
    const far = between(rim.px);
    const to = { x: at.x + out.x * far, y: at.y + out.y * far };
    const spin = (random() * 2 - 1) * rim.spinDeg;
    const keyframes: Keyframe[] = [
      { translate: translateTo(at), scale: rim.scale, rotate: "0deg", opacity: 1 },
      { opacity: 1, offset: rim.holdFor },
      {
        translate: translateTo(to),
        scale: rim.endScale,
        rotate: `${spin.toFixed(1)}deg`,
        opacity: 0,
      },
    ];
    return { d, motion: { keyframes, timing: { ...burst, duration: rim.ms } } };
  });

  // Each bead leaves its own stretch of the rim, a little off its even spacing.
  const sprayed = Array.from({ length: beads.count }, (_, i) => {
    const on = Math.floor(((i + random() * 0.6) / beads.count) * cloud.white.length);
    const p = cloud.white[on % cloud.white.length] ?? { x: 0, y: 0 };
    const out = outFrom(p);
    const r = between(beads.r);
    const seed = Math.floor(random() * 2 ** 31);
    const far = between(beads.px);
    const to = { x: out.x * far, y: out.y * far - beads.liftPx };
    const keyframes: Keyframe[] = [
      { translate: "0px 0px", scale: 1, opacity: 1 },
      { opacity: 1, offset: beads.holdFor },
      { translate: translateTo(to), scale: beads.endScale, opacity: 0 },
    ];
    const at = { x: p.x * rim.scale, y: p.y * rim.scale };
    return { r, seed, at, motion: { keyframes, timing: { ...burst, duration: beads.ms } } };
  });

  return {
    // Gone in the swell's last frame, with no fade a frame could catch, and kept gone.
    swell: {
      keyframes: [
        { scale: 1, opacity: 1, easing: POP.swellEase },
        { scale: POP.swellScale, opacity: 1, offset: 0.999 },
        { scale: POP.swellScale, opacity: 0 },
      ],
      timing: { duration: POP.swellMs, fill: "forwards" },
    },
    rim: flung,
    beads: sprayed,
    // Hidden until they start, so the old cloud has the spot to itself until it pops.
    cloud: {
      keyframes: CLOUD_ARRIVE,
      timing: {
        delay: POP.cloud.afterMs,
        duration: POP.cloud.ms,
        easing: EASE_OUT,
        fill: "backwards",
      },
    },
    word: {
      keyframes: WORD_STAMP,
      timing: { delay: POP.word.afterMs, duration: POP.word.ms, easing: SPRING, fill: "backwards" },
    },
  };
}

/**
 * A die rolled too often shakes, harder as dieMood's shake builds from 0 to 1: this far and this many
 * degrees at its worst, each jolt quicker as it builds.
 */
export const SHAKE = { maxPx: 2.6, maxDeg: 10, slowMs: 260, fastMs: 70 };

/** Rolling too much: each line peels off after this long, a countdown number sooner. */
export const TEASE_MS = 1600;
export const COUNT_MS = 800;
/** The bang goes off with the roll that blows the die up, and is gone after this long. */
export const BOOM_MS = 1800;
/** A line pops in tilted, holds, and peels off; a countdown number does the same untilted. */
export const teaseIn = (tilt: number): Keyframe[] => [
  { opacity: 0, scale: 0.3, rotate: `${tilt - 10}deg` },
  { opacity: 1, scale: 1.15, rotate: `${tilt + 2}deg`, offset: 0.14 },
  { scale: 1, rotate: `${tilt}deg`, offset: 0.24 },
  { opacity: 1, scale: 1, rotate: `${tilt}deg`, translate: "0 0", offset: 0.82 },
  { opacity: 0, scale: 0.92, rotate: `${tilt - 8}deg`, translate: "0 -14px" },
];
/** Under reduced motion, lines, numbers and the bang fade in and out in place. */
export const FADE_IN_OUT: Keyframe[] = [
  { opacity: 0 },
  { opacity: 1, offset: 0.1 },
  { opacity: 1, offset: 0.85 },
  { opacity: 0 },
];
export const BURST: Keyframe[] = [
  { scale: 0.1, rotate: "-20deg", opacity: 1 },
  { scale: 1.15, rotate: "4deg", opacity: 1, offset: 0.16 },
  { scale: 1, rotate: "0deg", opacity: 1, offset: 0.3 },
  { scale: 1.02, rotate: "1deg", opacity: 1, offset: 0.7 },
  { scale: 1.08, opacity: 0 },
];
export const BURST_MS = 1400;
/** The balloon whose die blew up jolts. */
export const JOLT: Keyframe[] = [
  { translate: "0 0" },
  { translate: "-5px 3px" },
  { translate: "4px -2px" },
  { translate: "-2px 1px" },
  { translate: "0 0" },
];
export const JOLT_MS = 360;
