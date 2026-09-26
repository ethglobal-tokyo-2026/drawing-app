/**
 * The pull tab's physics: a drag tears the strip with resistance through a spring, the tear front
 * advances in ticks, and past the snap the tab tears free. Tears run from 0 (sealed) to 1.
 */
export const PULL = {
  /** The strip's length along the bag's mouth: a drag across it tears `gain` of it. */
  travelPx: 250,
  gain: 0.82,
  snapAt: 0.86,
  /** Ticks along the whole strip. */
  ticks: 40,
  spring: { stiffness: 340, damping: 32 },
  /** How far each arrow key moves the tear. */
  keyStep: 0.2,
  /** Pressing and holding the bag this long tears it by itself. */
  holdMs: 520,
  /** A hold that moves further than this is a drag, not a hold. */
  holdSlopPx: 10,
  doubleTapMs: 340,
  /** How long the strip takes to tear by itself. */
  autoTearMs: 720,
} as const;

/** A spring step longer than this is taken as this long, so a stalled frame can't fling the tear. */
const MAX_STEP_MS = 32;
/** Closer than these to the target, the spring has settled. */
const REST = { tear: 0.0008, velocity: 0.002 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The tear a drag asks for: from where it started, dx along the strip, clamped to 0..1. */
export function tearTarget(start: number, dx: number): number {
  return clamp01(start + (dx / PULL.travelPx) * PULL.gain);
}

/**
 * One spring step toward the target; returns the new tear and its velocity. The ends are walls: a
 * tear that reaches one stops there.
 */
export function springStep(
  tear: number,
  velocity: number,
  target: number,
  dtMs: number,
): { tear: number; velocity: number } {
  const dt = Math.min(dtMs, MAX_STEP_MS) / 1000;
  const { stiffness, damping } = PULL.spring;
  const moved = velocity + (stiffness * (target - tear) - damping * velocity) * dt;
  const next = tear + moved * dt;
  return next < 0 || next > 1
    ? { tear: clamp01(next), velocity: 0 }
    : { tear: next, velocity: moved };
}

/** Whether the spring has settled on its target. */
export const atRest = (tear: number, velocity: number, target: number): boolean =>
  Math.abs(target - tear) <= REST.tear && Math.abs(velocity) <= REST.velocity;

// The epsilon keeps a tear that lands on a tick, like 0.7, from reading as just short of it.
const tickAt = (tear: number) => Math.floor(tear * PULL.ticks + 1e-9);

/** Ticks the tear front passed going from one tear to the next; springing back passes none. */
export function ticksBetween(from: number, to: number): number {
  return Math.max(0, tickAt(to) - tickAt(from));
}

/** Snapped: at or past snapAt. */
export const snapped = (tear: number): boolean => tear >= PULL.snapAt;

/** The tear after an arrow key: ±keyStep; the fifth press from 0 reaches the snap. */
export function keyTear(
  tear: number,
  key: "ArrowRight" | "ArrowUp" | "ArrowLeft" | "ArrowDown",
): number {
  const forward = key === "ArrowRight" || key === "ArrowUp";
  return clamp01(tear + (forward ? PULL.keyStep : -PULL.keyStep));
}

/** The tear `elapsedMs` into tearing by itself: easing in and out, all the way at autoTearMs. */
export function autoTear(elapsedMs: number): number {
  const k = clamp01(elapsedMs / PULL.autoTearMs);
  return k * k * (3 - 2 * k);
}
