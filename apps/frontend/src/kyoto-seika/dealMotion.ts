import { EASE_SPRING } from "../ui/easing";

// The deal's motion, from its prototype: tunable values, played through the Web Animations API.

export const SPRING = EASE_SPRING;

/** Each balloon's beads pop in from the thinker's side, then the cloud puffs out and the word stamps in. */
export const ARRIVE = {
  firstMs: 120,
  /** The lower balloon starts this long after the upper. */
  staggerMs: 260,
  beadsMs: 220,
  cloudAfterMs: 140,
  cloudMs: 420,
  wordAfterMs: 380,
  wordMs: 260,
};
export const BEADS_ARRIVE: Keyframe[] = [
  { opacity: 0, scale: 0.4 },
  { opacity: 1, scale: 1 },
];
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

/** A roll: the die tumbles with a hop, the cloud squashes and puffs, and the word swaps. */
export const ROLL = {
  dieMs: 420,
  hopPx: 9,
  turns: 2,
  cloudMs: 300,
  wordOutMs: 120,
  wordInMs: 220,
  puffs: 5,
  puffMs: 420,
};
export const DIE_TUMBLE: Keyframe[] = [
  { rotate: "0deg", translate: "0 0" },
  { rotate: `${ROLL.turns * 180}deg`, translate: `0 -${ROLL.hopPx}px`, offset: 0.45 },
  { rotate: `${ROLL.turns * 360}deg`, translate: "0 0" },
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

/** Rolling too much: each line peels off after this long, a countdown number sooner. */
export const TEASE_MS = 1600;
export const COUNT_MS = 800;
/** The bang goes off this long after the roll that chars the die, and is gone after BOOM_MS. */
export const BOOM_DELAY_MS = 520;
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
