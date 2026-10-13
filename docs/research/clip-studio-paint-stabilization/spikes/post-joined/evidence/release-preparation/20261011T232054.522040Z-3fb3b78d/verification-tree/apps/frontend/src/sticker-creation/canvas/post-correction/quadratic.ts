/**
 * Pure quadratic post-correction arithmetic recovered from CSP 5.1.4 ARM64.
 * This does not implement source-node insertion or the complete correction pass.
 * Domain: finite binary64 inputs/intermediates, FPCR=0. Parameters are not clamped.
 * Sampled lengths above 100,000 intervals throw as a research work bound; that
 * limit is not a CSP constant. Native status flags and NaN payloads are excluded.
 */
import { fma64 } from "../stabilization/binary64.ts";
import { pointDistance, truncateToSignedInt32 } from "../stabilization/arithmetic.ts";
import type { Point } from "./reference.ts";

/** Start, stored quadratic control, and end, in native argument order. */
export type QuadraticPoints = readonly [Point, Point, Point];

function weightedPoint(points: QuadraticPoints, aa: number, bb: number, dd: number): Point {
  const [start, control, end] = points;
  return {
    x: fma64(dd, end.x, fma64(aa, start.x, control.x * bb)),
    y: fma64(dd, end.y, fma64(aa, start.y, control.y * bb)),
  };
}

/** 0x10359bc34..0x10359bc64; the inserted node uses this fused Bernstein result. */
export function evaluateQuadratic(points: QuadraticPoints, t: number): Point {
  const u = 1 - t;
  const aa = u * u;
  const bb = (u + u) * t;
  const dd = t * t;
  return weightedPoint(points, aa, bb, dd);
}

/** 0x10359d408..0x10359d458; each product/addition rounds separately, without FMA. */
export function splitQuadratic(points: QuadraticPoints, t: number) {
  const [start, control, end] = points;
  const u = 1 - t;
  const leftControl = {
    x: control.x * t + start.x * u,
    y: control.y * t + start.y * u,
  };
  const rightControl = {
    x: end.x * t + control.x * u,
    y: end.y * t + control.y * u,
  };
  const splitPoint = {
    x: rightControl.x * t + leftControl.x * u,
    y: rightControl.y * t + leftControl.y * u,
  };
  return { leftControl, splitPoint, rightControl };
}

/** The measure helper multiplies the control first, then fuses the two anchors. */
function measurePoint(points: QuadraticPoints, aa: number, bb: number, dd: number): Point {
  const [start, control, end] = points;
  return {
    x: fma64(end.x, dd, fma64(start.x, aa, control.x * bb)),
    y: fma64(end.y, dd, fma64(start.y, aa, control.y * bb)),
  };
}

/** Quadratic branch of 0x10359c490..0x10359c5e4; four quarter-interval chords. */
export function measureQuadratic(points: QuadraticPoints): number {
  const quarter = measurePoint(points, 0.5625, 0.375, 0.0625);
  const half = measurePoint(points, 0.25, 0.5, 0.25);
  const threeQuarters = measurePoint(points, 0.0625, 0.375, 0.5625);
  let length = pointDistance(points[0], quarter);
  length += pointDistance(quarter, half);
  length += pointDistance(half, threeQuarters);
  return length + pointDistance(threeQuarters, points[2]);
}

/** 0x10359c60c..0x10359c748; cumulative t, with no forced exact final endpoint. */
export function sampledQuadraticLength(points: QuadraticPoints, count: number): number {
  if (!Number.isInteger(count) || count < -2147483648 || count > 2147483647) {
    throw new RangeError("Quadratic sample count must be a signed 32-bit integer");
  }
  if (count > 100000) {
    throw new RangeError("Quadratic sample count exceeds the research limit of 100000 intervals");
  }
  if (count < 1) return 0;
  const step = 1 / count;
  let t = step;
  let previous = points[0];
  let length = 0;
  for (let index = 0; index < count; index++) {
    const u = 1 - t;
    const aa = u * u;
    const bb = t * (u + u);
    const dd = t * t;
    const point = weightedPoint(points, aa, bb, dd);
    length += pointDistance(previous, point);
    previous = point;
    t = step + t;
  }
  return length;
}

/** 0x10359c378/394; high precision uses 0.5 density and has no native 255 cap. */
export function quadraticLength(points: QuadraticPoints, highPrecision: boolean): number {
  const estimate = measureQuadratic(points);
  const count = truncateToSignedInt32(estimate / (highPrecision ? 0.5 : 4));
  if (count < 5) return estimate;
  return sampledQuadraticLength(points, highPrecision ? count : Math.min(count, 255));
}
