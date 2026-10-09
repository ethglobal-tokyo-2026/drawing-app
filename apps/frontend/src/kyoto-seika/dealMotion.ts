import { EASE_SPRING } from "../ui/easing";
import { seededRandom } from "../ui/seededRandom";

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
 * A roll: the die tumbles once over an edge onto its new pips with a hop, its コロッ pops beside it, the
 * cloud squashes and puffs, and the word swaps.
 */
export const ROLL = {
  dieMs: 250,
  hopPx: 7,
  /** How far round the die starts, so it lands square on its new face. */
  tumbleDeg: 90,
  soundMs: 640,
  cloudMs: 300,
  wordOutMs: 120,
  wordInMs: 220,
  puffs: 5,
  puffMs: 420,
};
/** A tumble's easing: gentle enough that the turn shows across its quarter second, not just its start. */
export const TUMBLE_EASE = "cubic-bezier(0.3, 0.6, 0.45, 1)";
export const DIE_TUMBLE: Keyframe[] = [
  { rotate: `-${ROLL.tumbleDeg}deg`, translate: "0 0", scale: "1" },
  { rotate: `-${ROLL.tumbleDeg * 0.4}deg`, translate: `0 -${ROLL.hopPx}px`, offset: 0.45 },
  { rotate: "0deg", translate: "0 0", scale: "1.08 0.92", offset: 0.82 },
  { rotate: "0deg", translate: "0 0", scale: "1" },
];
export const CLOUD_SQUASH: Keyframe[] = [
  { scale: "1 1" },
  { scale: "0.95 0.97" },
  { scale: "1.03 1.01" },
  { scale: "1 1" },
];
export const WORD_OUT: Keyframe[] = [
  { opacity: 1, scale: 1 },
  { opacity: 0, scale: 0.7 },
];
export const WORD_IN: Keyframe[] = [
  { opacity: 0, scale: 0.7 },
  { opacity: 1, scale: 1.12, offset: 0.6 },
  { opacity: 1, scale: 1 },
];

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
