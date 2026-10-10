/** When the bounds cross, `max` wins. */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Bezier = readonly [number, number, number, number];
export const cubicBezier = (points: Bezier) => `cubic-bezier(${points.join(", ")})`;

// tokens.css's curves, spelled out: Web Animations can't read CSS variables. The control points are
// for cutting a curve at a keyframe (splitEasing).
export const EASE_OUT_POINTS: Bezier = [0.16, 1, 0.3, 1];
export const EASE_PEEL_POINTS: Bezier = [0.2, 0.7, 0.2, 1];
export const EASE_OUT = cubicBezier(EASE_OUT_POINTS);
export const EASE_PEEL = cubicBezier(EASE_PEEL_POINTS);
export const EASE_SPRING = cubicBezier([0.34, 1.7, 0.5, 1]);

type Point = readonly [number, number];

/**
 * A cubic-bezier easing cut at time `t`: the progress there, and each side as an easing of its own.
 * A keyframe can then sit at `t` while the motion through it still follows the one curve, where
 * easing each side with the whole curve would stall at the keyframe.
 */
export function splitEasing([x1, y1, x2, y2]: Bezier, t: number) {
  const x = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (x(mid) < t) lo = mid;
    else hi = mid;
  }
  const u = (lo + hi) / 2;
  // de Casteljau's construction at u gives both halves' control points.
  const mix = (p: Point, q: Point): Point => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  const p0: Point = [0, 0];
  const p1: Point = [x1, y1];
  const p2: Point = [x2, y2];
  const p3: Point = [1, 1];
  const a = mix(p0, p1);
  const b = mix(p1, p2);
  const c = mix(p2, p3);
  const d = mix(a, b);
  const e = mix(b, c);
  const cut = mix(d, e);
  const easing = (start: Point, c1: Point, c2: Point, end: Point) => {
    const n = (p: Point) =>
      [(p[0] - start[0]) / (end[0] - start[0]), (p[1] - start[1]) / (end[1] - start[1])]
        .map((v) => v.toFixed(4))
        .join(", ");
    return `cubic-bezier(${n(c1)}, ${n(c2)})`;
  };
  return { progress: cut[1], before: easing(p0, a, d, cut), after: easing(cut, e, c, p3) };
}
