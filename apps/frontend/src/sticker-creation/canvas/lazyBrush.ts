/** How far the brush trails a finger, in sheet units, for Smoothing from 0 (Raw) to 100 (Smooth). */
export const lazyRadius = (smoothing: number) => 30 * (smoothing / 100) ** 1.35;
/** A pen's string is this share of a finger's, so Smoothing only steadies a Pencil: its line stays under the nib. */
export const PEN_TRAIL_SHARE = 1 / 15;
/** A pen's string has no slack as it lands and lets out this much per unit the nib travels. */
const PEN_SLACK_PER_UNIT = 0.5;

/** The lift's catch-up steps are at most this many units apart, so the tail keeps its texture. */
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
  /** How much of the string is out: all of a finger's, and a pen's from none, so its line starts as it lands. */
  private slack: number;
  /** Where the pointer was last, to measure how far it has traveled. */
  private px: number;
  private py: number;

  constructor(x: number, y: number, radius: number, slack = radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.slack = slack;
    this.px = x;
    this.py = y;
  }

  /** A pen's brush: on its share of the finger's string, with no slack as it lands. */
  static forPen(x: number, y: number, radius: number): LazyBrush {
    return new LazyBrush(x, y, radius * PEN_TRAIL_SHARE, 0);
  }

  /** Pulls the brush toward the pointer; says whether it moved. */
  follow(px: number, py: number): boolean {
    if (this.slack < this.radius)
      this.slack = Math.min(
        this.radius,
        this.slack + PEN_SLACK_PER_UNIT * Math.hypot(px - this.px, py - this.py),
      );
    this.px = px;
    this.py = py;
    const dx = px - this.x;
    const dy = py - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.slack) return false;
    const k = (d - this.slack) / d;
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
