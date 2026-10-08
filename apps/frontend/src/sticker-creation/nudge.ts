/**
 * A touch met a sheet that takes no ink: what holds it turns toward the touch and back, on top of its
 * tilt. The timer dot nudges on a paused sheet, Begin on a sheet waiting for it.
 */
export const NUDGE: Keyframe[] = [
  { rotate: "0deg", scale: "1" },
  { rotate: "-9deg", scale: "1.08", offset: 0.28 },
  { rotate: "5deg", scale: "1.03", offset: 0.58 },
  { rotate: "0deg", scale: "1" },
];
/** How long a nudge takes, in ms. */
export const NUDGE_MS = 480;
