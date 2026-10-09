import { clamp } from "../../ui/easing";
import { STRIDE, type StrokeOp } from "./ops";

/**
 * The size rail's value (0–1) as a width in sheet units, the px the rail shows, squared so the
 * fine sizes get most of the travel.
 */
export const sizePx = (value: number) => 1.5 + 46.5 * value * value;

/** Points closer than this many sheet units to the last one add cost and nothing else. */
const MIN_STEP = 0.5;
/** A stroke starts as a dot this fraction of the size, then widens by `TAPER_STEP` a point. */
const FIRST_DOT = 0.6;
const TAPER_STEP = 0.08;

/** How wide this point wants to be, as a fraction of the size. */
function widthFactor(pressure: number, pointerType: string, speed: number): number {
  if (pointerType === "pen" && pressure > 0) return 0.28 + 0.72 * pressure ** 0.75;
  // Touch and mouse have no pressure, so a quick flick draws thinner, the way ink runs thin.
  return clamp(1.12 - 0.15 * speed, 0.68, 1.1);
}

interface StrokeStart {
  tool: StrokeOp["tool"];
  color: string;
  /** Width in sheet units. */
  size: number;
  x: number;
  y: number;
  /** When the first point landed, in ms. */
  t: number;
  /** ms into the session. */
  T: number;
}

/**
 * Builds a stroke point by point. A brush's width follows pen pressure, or speed for touch and mouse,
 * smoothed so it never jumps, and tapers in from a dot. The eraser keeps one width.
 */
export class StrokeBuilder {
  readonly op: StrokeOp;
  private readonly size: number;
  private readonly t0: number;
  private lastT: number;
  private smoothed = 1;

  constructor({ tool, color, size, x, y, t, T }: StrokeStart) {
    this.size = size;
    this.t0 = t;
    this.lastT = t;
    this.op = { tool, color, pts: [x, y, size * (tool === "eraser" ? 1 : FIRST_DOT), 0], T };
  }

  get count(): number {
    return this.op.pts.length / STRIDE;
  }

  /** Adds a point unless it's within half a unit of the last one; says whether it did. */
  add(x: number, y: number, pressure: number, pointerType: string, t: number): boolean {
    const { pts, tool } = this.op;
    const n = this.count;
    const dist = Math.hypot(x - pts[(n - 1) * STRIDE], y - pts[(n - 1) * STRIDE + 1]);
    if (dist < MIN_STEP) return false;
    const dt = Math.max(1, t - this.lastT);
    this.lastT = t;
    let width = this.size;
    if (tool === "brush") {
      this.smoothed = 0.7 * this.smoothed + 0.3 * widthFactor(pressure, pointerType, dist / dt);
      width *= this.smoothed * Math.min(1, FIRST_DOT + TAPER_STEP * n);
    }
    pts.push(x, y, width, Math.round(t - this.t0));
    return true;
  }
}
