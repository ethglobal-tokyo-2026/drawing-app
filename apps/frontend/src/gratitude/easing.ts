export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** tokens.css's curves, spelled out: Web Animations can't read CSS variables. */
export const EASE_SPRING = "cubic-bezier(0.34, 1.7, 0.5, 1)";
export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_PEEL = "cubic-bezier(0.2, 0.7, 0.2, 1)";
