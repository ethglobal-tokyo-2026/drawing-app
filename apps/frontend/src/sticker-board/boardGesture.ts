import { clampS, extentsOf, fitIn, type Field, type SRange } from "./placement";

export type Pt = { x: number; y: number };

/** How far a press may wander and still be a tap: past it, a press on a sticker becomes a drag. */
export const SLOP = 6;
/** A turn this many degrees from upright settles upright. */
const SETTLE = 3;

const deg = (rad: number) => (rad * 180) / Math.PI;
const angleAbout = (center: Pt, p: Pt) => Math.atan2(p.y - center.y, p.x - center.x);

/** A key press or an Arrange button's step, which moves, turns or resizes a sticker. */
export type Step =
  | "left"
  | "right"
  | "up"
  | "down"
  | "turnLeft"
  | "turnRight"
  | "smaller"
  | "bigger";

/** How far one step moves a sticker in px, turns it in degrees, or scales it. */
const STEP_MOVE = 10;
const STEP_TURN = 5;
const STEP_GROW = 1.08;
const STEP_SHRINK = 0.92;

/** A sticker's spot as one step changes it, its size kept in `range`: its center, size and turn. */
export function stepBy<T extends { x: number; y: number; s: number; r: number }>(
  at: T,
  step: Step,
  range: SRange,
): T {
  switch (step) {
    case "left":
      return { ...at, x: at.x - STEP_MOVE };
    case "right":
      return { ...at, x: at.x + STEP_MOVE };
    case "up":
      return { ...at, y: at.y - STEP_MOVE };
    case "down":
      return { ...at, y: at.y + STEP_MOVE };
    case "turnLeft":
      return { ...at, r: at.r - STEP_TURN };
    case "turnRight":
      return { ...at, r: at.r + STEP_TURN };
    case "smaller":
      return { ...at, s: clampS(at.s * STEP_SHRINK, range) };
    case "bigger":
      return { ...at, s: clampS(at.s * STEP_GROW, range) };
  }
}

/**
 * A growing sticker's center, moved in as far as its turned box needs to stay on the field, so its
 * handles stay on the board. A box too big for the field centers on it.
 */
export function keptOnField(
  at: { x: number; y: number; r: number },
  size: { w: number; h: number },
  field: Field,
): Pt {
  const { ex, ey } = extentsOf(size.w, size.h, at.r);
  return { x: fitIn(at.x, field.left, field.w, ex), y: fitIn(at.y, field.top, field.h, ey) };
}

/** Degrees, in [0, 360). */
export const normalizeTurn = (r: number) => ((r % 360) + 360) % 360;

export const passedSlop = (from: Pt, to: Pt) => Math.hypot(to.x - from.x, to.y - from.y) > SLOP;

/**
 * A corner handle moved from `from` to `to`: the size, inside `range`, follows how far out the handle
 * is along its corner's line from the center, so moving across that line keeps the size, and dragged
 * past the center the sticker stays at its smallest rather than growing again.
 */
export function scaleBy(center: Pt, from: Pt, to: Pt, s0: number, range: SRange): number {
  const cx = from.x - center.x;
  const cy = from.y - center.y;
  const d0 = Math.hypot(cx, cy) || 1;
  const along = ((to.x - center.x) * cx + (to.y - center.y) * cy) / d0;
  return clampS((s0 * along) / d0, range);
}

/** The knob moved from `from` to `to` about the center; nearly upright settles upright. */
export function turnBy(center: Pt, from: Pt, to: Pt, r0: number): number {
  const r = normalizeTurn(r0 + deg(angleAbout(center, to) - angleAbout(center, from)));
  return r < SETTLE || r > 360 - SETTLE ? 0 : r;
}

/**
 * Two fingers moved from `start` to `now`, in board pixels: the sticker follows their midpoint,
 * scales with their spread and turns with them. A pinch never settles, so small turns stay.
 */
export function pinchBy(
  start: readonly [Pt, Pt],
  now: readonly [Pt, Pt],
  p0: { x: number; y: number; s: number; r: number },
  range: SRange,
) {
  const [a0, b0] = start;
  const [a, b] = now;
  const spread0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
  const turn = deg(Math.atan2(b.y - a.y, b.x - a.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x));
  return {
    x: p0.x + (a.x + b.x - a0.x - b0.x) / 2,
    y: p0.y + (a.y + b.y - a0.y - b0.y) / 2,
    s: clampS((p0.s * Math.hypot(b.x - a.x, b.y - a.y)) / spread0, range),
    r: normalizeTurn(p0.r + turn),
  };
}

/**
 * Where a held sticker's center may go: a little over the header and across the sticker tray's
 * edge, never off the board. Where it's let go still lands on the field.
 */
export const dragBounds = (field: Field, width: number, height: number) => ({
  minX: field.left,
  maxX: width - 12,
  minY: field.top - 10,
  maxY: height - 18,
});
