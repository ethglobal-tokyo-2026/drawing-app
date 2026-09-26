/** How far the brush trails the finger, in px, for a smoothing setting from 0 (Raw) to 100 (Smooth). */
export const lazyRadius = (smoothing: number) => 30 * (smoothing / 100) ** 1.35;

/** The lift's catch-up steps are at most this far apart, so the tail keeps the stroke's texture. */
const CATCH_UP_STEP = 3;
/** Closer than this, the brush is already under the finger. */
const SETTLED = 0.5;

/**
 * A brush on a string: it rests while the pointer moves within `radius`, then follows at that
 * distance, so a shaky hand draws a steady line.
 */
export class LazyBrush {
  x: number;
  y: number;
  private readonly radius: number;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  /** Pulls the brush toward the pointer; says whether it moved. */
  follow(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.radius) return false;
    const k = (d - this.radius) / d;
    this.x += dx * k;
    this.y += dy * k;
    return true;
  }

  /** The points from the brush to where the pointer lifted, so the stroke ends under the finger. */
  catchUp(px: number, py: number): [number, number][] {
    const dx = px - this.x;
    const dy = py - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= SETTLED) return [];
    const steps = Math.ceil(d / CATCH_UP_STEP);
    const points: [number, number][] = [];
    for (let i = 1; i <= steps; i++)
      points.push([this.x + (dx * i) / steps, this.y + (dy * i) / steps]);
    this.x = px;
    this.y = py;
    return points;
  }
}
