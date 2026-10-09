/** A point on a pen stroke, with the stroke's width there in px. */
export interface PenPoint {
  x: number;
  y: number;
  w: number;
}

export interface Pt {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;
const n = (v: number) => Math.round(v * 100) / 100;
const xy = (p: Pt) => `${n(p.x)} ${n(p.y)}`;

/** A closed outline through `pts` as SVG path data. */
export function outline(pts: readonly Pt[]): string {
  return `M${pts.map(xy).join("L")}Z`;
}

/** Twice the outline's signed area: positive when it runs clockwise on the screen. */
const area2 = (pts: readonly Pt[]) =>
  pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length];
    return s + (p.x * q.y - q.x * p.y);
  }, 0);

/**
 * Point `i` along `pts`, running on past either end as the line would: curving on as through the end's
 * last three points, or straight on when it's `jagged`.
 */
function runOn(pts: readonly Pt[], jagged: boolean): (i: number) => Pt {
  const last = pts.length - 1;
  return (i) => {
    if (i >= 0 && i <= last) return pts[i];
    const [end, next, after] =
      i < 0 ? [pts[0], pts[1], pts[2]] : [pts[last], pts[last - 1], pts[last - 2]];
    return after && !jagged
      ? { x: 3 * (end.x - next.x) + after.x, y: 3 * (end.y - next.y) + after.y }
      : { x: 2 * end.x - next.x, y: 2 * end.y - next.y };
  };
}

/**
 * One side of a stroke on from its first point, as SVG path data: Catmull-Rom curves through `side` as
 * cubic Béziers, or straight lines when it's `jagged`.
 */
function sideOf(side: readonly Pt[], jagged: boolean): string {
  if (jagged) return side.map((p, i) => (i ? `L${xy(p)}` : "")).join("");
  const at = runOn(side, jagged);
  // A curve leaves point i along its neighbors' chord, its handle a sixth of that chord.
  const handle = (i: number): Pt => ({
    x: (at(i + 1).x - at(i - 1).x) / 6,
    y: (at(i + 1).y - at(i - 1).y) / 6,
  });
  return side
    .map((p, i) => {
      if (!i) return "";
      const c2 = { x: p.x - handle(i).x, y: p.y - handle(i).y };
      // Each curve leaves its point the way the last arrived there, which `S` mirrors.
      if (i > 1) return `S${xy(c2)} ${xy(p)}`;
      const c1 = { x: side[0].x + handle(0).x, y: side[0].y + handle(0).y };
      return `C${xy(c1)} ${xy(c2)} ${xy(p)}`;
    })
    .join("");
}

/** Half a circle of radius `r` on to `to`, turning clockwise on the screen when `sweep` is 1. */
const roundEnd = (r: number, sweep: 0 | 1, to: Pt) => `A${n(r)} ${n(r)} 0 0 ${sweep} ${xy(to)}`;

/**
 * A pen stroke through `pts` as SVG path data: one outline round the stroke, offset by half its width
 * on each side, in curves, or in straight lines when it's `jagged` like a crack, with round ends. Every
 * stroke runs the same way round, so strokes that cross fill as one under the nonzero rule.
 */
export function penStroke(pts: readonly PenPoint[], { jagged = false } = {}): string {
  const at = runOn(pts, jagged);
  const tangent = (i: number): Pt => {
    const a = at(i - 1);
    const b = at(i + 1);
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const t = tangent(i);
    const r = p.w / 2;
    left.push({ x: p.x - t.y * r, y: p.y + t.x * r });
    right.push({ x: p.x + t.y * r, y: p.y - t.x * r });
  });
  const last = pts.length - 1;
  const tip = (p: PenPoint, along: Pt, sign: number) => ({
    x: p.x + (sign * along.x * p.w) / 2,
    y: p.y + (sign * along.y * p.w) / 2,
  });
  const ring = [
    ...left,
    tip(pts[last], tangent(last), 1),
    ...right.toReversed(),
    tip(pts[0], tangent(0), -1),
  ];
  const [first, end] = [pts[0].w / 2, pts[last].w / 2];
  return area2(ring) < 0
    ? `M${xy(left[0])}${roundEnd(first, 1, right[0])}${sideOf(right, jagged)}` +
        `${roundEnd(end, 1, left[last])}${sideOf(left.toReversed(), jagged)}Z`
    : `M${xy(left[0])}${sideOf(left, jagged)}${roundEnd(end, 0, right[last])}` +
        `${sideOf(right.toReversed(), jagged)}${roundEnd(first, 0, left[0])}Z`;
}

/**
 * A pen's pressure along one stroke, 0 to 1: it lands fine (入り), swells by `peak`, and lifts off over a
 * longer taper (抜き), as a G-pen draws.
 */
export function pressure(t: number, peak = 0.42, landing = 0.7, lifting = 1.1): number {
  const u = t < peak ? t / peak : (1 - t) / (1 - peak);
  const shaped = 1 - (1 - Math.min(Math.max(u, 0), 1)) ** 2;
  return t < peak ? shaped ** landing : shaped ** lifting;
}

/** Smooth noise along a stroke: a few slow waves with seeded phases, about -1 to 1. */
export function wobble(random: () => number, waves = 3): (t: number) => number {
  const parts = Array.from({ length: waves }, (_, i) => ({
    freq: (i + 1) * (0.8 + random() * 0.6),
    phase: random() * TAU,
    amp: 1 / (i + 1),
  }));
  const total = parts.reduce((s, p) => s + p.amp, 0);
  return (t) => parts.reduce((s, p) => s + p.amp * Math.sin(p.freq * TAU * t + p.phase), 0) / total;
}
