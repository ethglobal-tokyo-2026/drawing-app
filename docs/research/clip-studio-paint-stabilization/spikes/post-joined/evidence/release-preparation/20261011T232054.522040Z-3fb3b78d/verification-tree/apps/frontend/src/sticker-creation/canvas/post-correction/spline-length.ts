/** Spline length used by the recovered endpoint pass; finite inputs and FPCR=0. */
import { pointDistance, truncateToSignedInt32 } from "../stabilization/arithmetic.ts";
import { evaluateSpline, measureSpline, type SixPoints } from "./spline.ts";

/** 0x10359fe88: begin at direct C, repeatedly add dt, and do not force t=1. */
export function sampledSplineLength(points: SixPoints, count: number): number {
  if (!Number.isInteger(count) || count < -2147483648 || count > 2147483647) {
    throw new RangeError("Spline sample count must be a signed 32-bit integer");
  }
  if (count > 100000)
    throw new RangeError("Spline sample count exceeds the research limit of 100000 intervals");
  if (count < 1) return 0;
  const step = 1 / count;
  let t = step;
  let previous = points[2];
  let length = 0;
  for (let index = 0; index < count; index++) {
    const point = evaluateSpline(points, t);
    length = length + pointDistance(previous, point);
    previous = point;
    t = step + t;
  }
  return length;
}

/** 0x10359fc40: only the lower-precision mode caps the sampled interval count. */
export function splineLength(points: SixPoints, highPrecision: boolean): number {
  const estimate = measureSpline(points);
  const count = truncateToSignedInt32(estimate / (highPrecision ? 0.5 : 4));
  if (count < 5) return estimate;
  return sampledSplineLength(points, highPrecision ? count : Math.min(count, 255));
}
