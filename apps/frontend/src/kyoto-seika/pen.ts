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
 * A pen stroke through `pts` as SVG path data: one outline round the stroke, offset by half its width
 * on each side, with round ends. Every stroke runs the same way round, so strokes that cross fill as
 * one under the nonzero rule.
 */
export function penStroke(pts: readonly PenPoint[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const cap = (p: PenPoint, along: Pt, sign: number) => {
    const r = p.w / 2;
    return [0.25, 0.5, 0.75].map((f) => {
      const a = f * Math.PI;
      const side = { x: -along.y, y: along.x };
      return {
        x: p.x + r * (Math.cos(a) * side.x * sign + Math.sin(a) * along.x * sign),
        y: p.y + r * (Math.cos(a) * side.y * sign + Math.sin(a) * along.y * sign),
      };
    });
  };
  const tangent = (i: number): Pt => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };
  pts.forEach((p, i) => {
    const t = tangent(i);
    const r = p.w / 2;
    left.push({ x: p.x - t.y * r, y: p.y + t.x * r });
    right.push({ x: p.x + t.y * r, y: p.y - t.x * r });
  });
  const last = pts.length - 1;
  const ring = [
    ...left,
    ...cap(pts[last], tangent(last), 1),
    ...right.toReversed(),
    ...cap(pts[0], tangent(0), -1),
  ];
  return outline(area2(ring) < 0 ? ring.toReversed() : ring);
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
