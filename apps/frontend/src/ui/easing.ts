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
