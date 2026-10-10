import { describe, expect, it } from "vitest";
import { splitEasing } from "./easing";

type Curve = readonly [number, number, number, number];

/** A cubic-bezier easing's progress at time `t`. */
function ease([x1, y1, x2, y2]: Curve, t: number) {
  const at = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

function curveOf(css: string): Curve {
  const [x1, y1, x2, y2] = (css.match(/-?[\d.]+/g) ?? []).map(Number);
  if ([x1, y1, x2, y2].some((v) => v === undefined || Number.isNaN(v)))
    throw new Error(`not a cubic-bezier: ${css}`);
  return [x1 ?? 0, y1 ?? 0, x2 ?? 0, y2 ?? 0];
}

describe("splitEasing", () => {
  // A front-loaded curve, and a spring that overshoots.
  it.each<[Curve, number]>([
    [[0.2, 0.7, 0.2, 1], 0.35],
    [[0.34, 1.7, 0.5, 1], 0.6],
  ])("cuts %j at %d into halves that trace the whole curve", (curve, cutAt) => {
    const { progress, before, after } = splitEasing(curve, cutAt);
    for (let time = 0.05; time < 1; time += 0.1) {
      const traced =
        time < cutAt
          ? progress * ease(curveOf(before), time / cutAt)
          : progress + (1 - progress) * ease(curveOf(after), (time - cutAt) / (1 - cutAt));
      expect(traced).toBeCloseTo(ease(curve, time), 3);
    }
  });
});
