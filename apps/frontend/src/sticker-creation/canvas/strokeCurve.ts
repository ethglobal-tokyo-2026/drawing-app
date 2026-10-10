import { clamp01, lerp } from "../../ui/easing";
import { STRIDE } from "./ops";

/**
 * A span is cut until each piece strays no further than this from the curve, in sheet units: closer
 * than shows, so close samples add no points and sparse ones still curve.
 */
export const CURVE_FLATNESS = 0.25;
/** A span is halved at most this many times over, so a cusp can't cut it endlessly. */
const MAX_HALVINGS = 6;
/** A cubic Bézier strays from its chord at most this share of its inner points' distance from it. */
const BEZIER_STRAY = 0.75;
/** Centripetal: the knots step by the square root of each chord, so the curve never loops or overshoots. */
const KNOT_POWER = 0.5;
/** The keys a span needs: its own two and a neighbor each side, the newest waiting for the next. */
const MAX_KEYS = 4;

/**
 * Bézier pieces of a span waiting to be cut, depth first, each `PIECE` numbers: its four control
 * points' x and y, where it starts and ends along the span, and how often it was halved. Halving
 * puts one piece on top of another, so a piece never sits deeper than its halvings: one buffer for
 * every curve keeps cutting free of garbage, which can pause a stroke mid-way.
 */
const PIECE = 11;
const pieces = new Float64Array((MAX_HALVINGS + 1) * PIECE);

/** How far a point is from the segment between two others. */
function fromSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const along = dx === 0 && dy === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
  const s = clamp01(along);
  return Math.hypot(x - ax - dx * s, y - ay - dy * s);
}

/** How far the piece at `p` strays from its chord at most, from where its inner points are. */
function strays(p: number): number {
  const x0 = pieces[p];
  const y0 = pieces[p + 1];
  const x3 = pieces[p + 6];
  const y3 = pieces[p + 7];
  return (
    BEZIER_STRAY *
    Math.max(
      fromSegment(pieces[p + 2], pieces[p + 3], x0, y0, x3, y3),
      fromSegment(pieces[p + 4], pieces[p + 5], x0, y0, x3, y3),
    )
  );
}

/** De Casteljau at the middle: the piece at `p` keeps its right half, and its left goes on top. */
function halve(p: number): void {
  const b = pieces;
  const ax = (b[p] + b[p + 2]) / 2;
  const ay = (b[p + 1] + b[p + 3]) / 2;
  const bx = (b[p + 2] + b[p + 4]) / 2;
  const by = (b[p + 3] + b[p + 5]) / 2;
  const cx = (b[p + 4] + b[p + 6]) / 2;
  const cy = (b[p + 5] + b[p + 7]) / 2;
  const dx = (ax + bx) / 2;
  const dy = (ay + by) / 2;
  const ex = (bx + cx) / 2;
  const ey = (by + cy) / 2;
  const mx = (dx + ex) / 2;
  const my = (dy + ey) / 2;
  const mid = (b[p + 8] + b[p + 9]) / 2;
  const halvings = b[p + 10] + 1;
  const l = p + PIECE;
  b[l] = b[p];
  b[l + 1] = b[p + 1];
  b[l + 2] = ax;
  b[l + 3] = ay;
  b[l + 4] = dx;
  b[l + 5] = dy;
  b[l + 6] = mx;
  b[l + 7] = my;
  b[l + 8] = b[p + 8];
  b[l + 9] = mid;
  b[l + 10] = halvings;
  b[p] = mx;
  b[p + 1] = my;
  b[p + 2] = ex;
  b[p + 3] = ey;
  b[p + 4] = cx;
  b[p + 5] = cy;
  b[p + 8] = mid;
  b[p + 10] = halvings;
}

/** The knot step between two keys. */
const knot = (ax: number, ay: number, bx: number, by: number) =>
  Math.max(Math.hypot(bx - ax, by - ay) ** KNOT_POWER, 1e-6);

/** A Barry–Goldman tangent through pa, pb, pc, scaled to a span `d` long, as a Bézier's inner point's offset. */
const tangent = (pa: number, pb: number, pc: number, da: number, db: number, d: number) =>
  (d * ((pb - pa) / da - (pc - pa) / (da + db) + (pc - pb) / db)) / 3;

/**
 * The line a stroke paints through its points: a centripetal Catmull-Rom curve, which passes through
 * every point however unevenly they're spaced, cut into pieces straight enough to paint as capsules,
 * with widths and times eased along it. A span is cut once the point after it is
 * known, so the painted line ends a point short until the stroke settles.
 */
export class StrokeCurve {
  /** The stroke's points, flat, `STRIDE` numbers each; the curve appends its pieces' ends. */
  private readonly out: number[];
  /** The latest points the curve passes through, flat like `out`: the last one waits for its span. */
  private readonly keys: number[] = Array.from({ length: MAX_KEYS * STRIDE }, () => 0);
  private count = 1;

  /** `out` holds the stroke's first point, already painted. */
  constructor(out: number[]) {
    this.out = out;
    this.copyKey(out, out.length - STRIDE, 0);
  }

  /** The line has reached the newest point: none waits for its span. */
  get settled(): boolean {
    return this.count === 1;
  }

  /** The newest point the curve passes through. */
  get x(): number {
    return this.keys[(this.count - 1) * STRIDE];
  }

  get y(): number {
    return this.keys[(this.count - 1) * STRIDE + 1];
  }

  /** The stroke's first point takes this width, while no span from it has been cut. */
  setFirstWidth(width: number): void {
    if (this.out.length !== STRIDE) return;
    this.out[2] = width;
    this.keys[2] = width;
  }

  /** The curve passes through x, y next, at this width and ms; the span before it is cut. */
  add(x: number, y: number, width: number, t: number): void {
    const at = this.count * STRIDE;
    const { keys } = this;
    keys[at] = x;
    keys[at + 1] = y;
    keys[at + 2] = width;
    keys[at + 3] = t;
    this.count++;
    if (this.count < 3) return;
    this.span(this.count - 3);
    if (this.count === MAX_KEYS) this.keep(1);
  }

  /**
   * The line ends at x, y for now, as the nib pauses or lifts: the waiting point moves there, a step
   * it was too near to take, and its span is cut. The next point starts a fresh curve from it.
   */
  settle(x: number, y: number): void {
    const { keys } = this;
    let last = this.count - 1;
    const at = last * STRIDE;
    if (keys[at] !== x || keys[at + 1] !== y) {
      if (last === 0) {
        this.copyKey(keys, 0, STRIDE);
        keys[STRIDE] = x;
        keys[STRIDE + 1] = y;
        this.count = 2;
        last = 1;
      } else {
        keys[at] = x;
        keys[at + 1] = y;
      }
    }
    if (last > 0) this.span(last - 1);
    this.keep(last);
  }

  /** Keeps the keys from `first` on, moved to the front. */
  private keep(first: number): void {
    for (let i = first; i < this.count; i++)
      this.copyKey(this.keys, i * STRIDE, (i - first) * STRIDE);
    this.count -= first;
  }

  private copyKey(from: number[], at: number, to: number): void {
    for (let j = 0; j < STRIDE; j++) this.keys[to + j] = from[at + j];
  }

  /** Cuts the span from key `i` to the next, whose neighbors set its tangents. */
  private span(i: number): void {
    const k = this.keys;
    const a = i * STRIDE;
    const b = a + STRIDE;
    const x1 = k[a];
    const y1 = k[a + 1];
    const x2 = k[b];
    const y2 = k[b + 1];
    if (x1 === x2 && y1 === y2) return;
    // Past either end of the run, the curve's neighbor is its own point mirrored.
    const x0 = i > 0 ? k[a - STRIDE] : 2 * x1 - x2;
    const y0 = i > 0 ? k[a - STRIDE + 1] : 2 * y1 - y2;
    const next = i + 2 < this.count;
    const x3 = next ? k[b + STRIDE] : 2 * x2 - x1;
    const y3 = next ? k[b + STRIDE + 1] : 2 * y2 - y1;
    const d0 = knot(x0, y0, x1, y1);
    const d1 = knot(x1, y1, x2, y2);
    const d2 = knot(x2, y2, x3, y3);
    // The Barry–Goldman tangents at each end, scaled to the span, as a Bézier's inner points.
    pieces[0] = x1;
    pieces[1] = y1;
    pieces[2] = x1 + tangent(x0, x1, x2, d0, d1, d1);
    pieces[3] = y1 + tangent(y0, y1, y2, d0, d1, d1);
    pieces[4] = x2 - tangent(x1, x2, x3, d1, d2, d1);
    pieces[5] = y2 - tangent(y1, y2, y3, d1, d2, d1);
    pieces[6] = x2;
    pieces[7] = y2;
    pieces[8] = 0;
    pieces[9] = 1;
    pieces[10] = 0;
    const w1 = k[a + 2];
    const t1 = k[a + 3];
    const w2 = k[b + 2];
    const t2 = k[b + 3];
    for (let top = 1; top > 0;) {
      const p = --top * PIECE;
      if (pieces[p + 10] < MAX_HALVINGS && strays(p) > CURVE_FLATNESS) {
        halve(p);
        top += 2;
        continue;
      }
      const s = pieces[p + 9];
      this.out.push(pieces[p + 6], pieces[p + 7], lerp(w1, w2, s), Math.round(lerp(t1, t2, s)));
    }
  }
}
