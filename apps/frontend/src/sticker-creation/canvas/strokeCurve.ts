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

/** A cubic Bézier's four control points, flat: x, y for each. */
type Bezier = [number, number, number, number, number, number, number, number];

/** How far a point is from the segment between two others. */
function fromSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const [dx, dy] = [bx - ax, by - ay];
  const along = dx === 0 && dy === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
  const s = Math.min(1, Math.max(0, along));
  return Math.hypot(x - ax - dx * s, y - ay - dy * s);
}

/** How far a Bézier strays from its chord at most, from where its inner points are. */
function strays(b: Bezier): number {
  const off = (x: number, y: number) => fromSegment(x, y, b[0], b[1], b[6], b[7]);
  return BEZIER_STRAY * Math.max(off(b[2], b[3]), off(b[4], b[5]));
}

/** De Casteljau at the middle: the two halves of a Bézier. */
function halve(b: Bezier): [Bezier, Bezier] {
  const mid = (i: number, j: number) => (b[i] + b[j]) / 2;
  const [ax, ay, bx, by, cx, cy] = [
    mid(0, 2),
    mid(1, 3),
    mid(2, 4),
    mid(3, 5),
    mid(4, 6),
    mid(5, 7),
  ];
  const [dx, dy, ex, ey] = [(ax + bx) / 2, (ay + by) / 2, (bx + cx) / 2, (by + cy) / 2];
  const [mx, my] = [(dx + ex) / 2, (dy + ey) / 2];
  return [
    [b[0], b[1], ax, ay, dx, dy, mx, my],
    [mx, my, ex, ey, cx, cy, b[6], b[7]],
  ];
}

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
  private keys: number[];

  /** `out` holds the stroke's first point, already painted. */
  constructor(out: number[]) {
    this.out = out;
    this.keys = out.slice(-STRIDE);
  }

  /** The line has reached the newest point: none waits for its span. */
  get settled(): boolean {
    return this.keys.length === STRIDE;
  }

  /** The newest point the curve passes through. */
  get x(): number {
    return this.keys[this.keys.length - STRIDE];
  }

  get y(): number {
    return this.keys[this.keys.length - STRIDE + 1];
  }

  /** The curve passes through x, y next, at this width and ms; the span before it is cut. */
  add(x: number, y: number, width: number, t: number): void {
    this.keys.push(x, y, width, t);
    const n = this.keys.length / STRIDE;
    if (n < 3) return;
    this.span(n - 3);
    this.keys = this.keys.slice(-3 * STRIDE);
  }

  /**
   * The line ends at x, y for now, as the nib pauses or lifts: the waiting point moves there, a step
   * it was too near to take, and its span is cut. The next point starts a fresh curve from it.
   */
  settle(x: number, y: number): void {
    const { keys } = this;
    let last = keys.length - STRIDE;
    if (keys[last] !== x || keys[last + 1] !== y) {
      if (last === 0) {
        keys.push(x, y, keys[2], keys[3]);
        last += STRIDE;
      } else [keys[last], keys[last + 1]] = [x, y];
    }
    if (last > 0) this.span(last / STRIDE - 1);
    this.keys = keys.slice(-STRIDE);
  }

  /** Cuts the span from key `i` to the next, whose neighbors set its tangents. */
  private span(i: number): void {
    const k = this.keys;
    const n = k.length / STRIDE;
    const at = (j: number) => [k[j * STRIDE], k[j * STRIDE + 1]] as const;
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    if (x1 === x2 && y1 === y2) return;
    // Past either end of the run, the curve's neighbor is its own point mirrored.
    const [x0, y0] = i > 0 ? at(i - 1) : [2 * x1 - x2, 2 * y1 - y2];
    const [x3, y3] = i + 2 < n ? at(i + 2) : [2 * x2 - x1, 2 * y2 - y1];
    const knot = (ax: number, ay: number, bx: number, by: number) =>
      Math.max(Math.hypot(bx - ax, by - ay) ** KNOT_POWER, 1e-6);
    const [d0, d1, d2] = [knot(x0, y0, x1, y1), knot(x1, y1, x2, y2), knot(x2, y2, x3, y3)];
    // The Barry–Goldman tangents at each end, scaled to the span, as a Bézier's inner points.
    const tangent = (pa: number, pb: number, pc: number, da: number, db: number) =>
      (d1 * ((pb - pa) / da - (pc - pa) / (da + db) + (pc - pb) / db)) / 3;
    const bezier: Bezier = [
      x1,
      y1,
      x1 + tangent(x0, x1, x2, d0, d1),
      y1 + tangent(y0, y1, y2, d0, d1),
      x2 - tangent(x1, x2, x3, d1, d2),
      y2 - tangent(y1, y2, y3, d1, d2),
      x2,
      y2,
    ];
    const [w1, t1, w2, t2] = [
      k[i * STRIDE + 2],
      k[i * STRIDE + 3],
      k[(i + 1) * STRIDE + 2],
      k[(i + 1) * STRIDE + 3],
    ];
    const cut = (b: Bezier, s0: number, s1: number, halvings: number) => {
      if (halvings < MAX_HALVINGS && strays(b) > CURVE_FLATNESS) {
        const [left, right] = halve(b);
        const mid = (s0 + s1) / 2;
        cut(left, s0, mid, halvings + 1);
        cut(right, mid, s1, halvings + 1);
        return;
      }
      this.out.push(b[6], b[7], w1 + (w2 - w1) * s1, Math.round(t1 + (t2 - t1) * s1));
    };
    cut(bezier, 0, 1, 0);
  }
}
