/**
 * Pure post-correction geometry reconstructed from Clip Studio Paint 5.1.4 ARM64.
 * This does not implement the surrounding point graph or the full correction pass.
 * Inputs are finite binary64 values; operation order assumes FPCR=0. NaN payloads
 * and floating-point status flags are not reproduced. The sampler preserves the
 * native saturated integer conversion when its count expression overflows.
 */
import { fma64 } from "../stabilization/binary64.ts";
import { pointDistance, truncateToSignedInt32 } from "../stabilization/arithmetic.ts";
import type { Point } from "./reference.ts";

/** Two preceding points, the segment's endpoints, and two following points. */
export type SixPoints = readonly [Point, Point, Point, Point, Point, Point];

/** 0x10359f580..0x10359f748; t is not clamped, including at either endpoint. */
export function evaluateSpline(points: SixPoints, t: number): Point {
  let weights: number[];
  if (t < 0.5) {
    weights = [
      fma64(-14, t, 10) * t,
      fma64(96, t, -68) * t,
      fma64(t * -164, t, 99),
      fma64(t, 96, 68) * t,
      fma64(t, -16, -12) * t,
      fma64(t, 2, 2) * t,
    ];
  } else {
    const times96 = t * 96;
    weights = [
      fma64(t, 2 * t, -6 * t) + 4,
      fma64(t, -16 * t, 44 * t) + -28,
      fma64(times96, t, t * -260) + 164,
      fma64(t * -164, t, t * 328) + -65,
      fma64(times96, t, t * -124) + 28,
      fma64(t * -14, t, t * 18) + -4,
    ];
  }
  // Native vectors accumulate [y,x], with separate point products and sums.
  let x = points[1].x * weights[1] + points[0].x * weights[0];
  let y = points[0].y * weights[0] + points[1].y * weights[1];
  for (let index = 2; index < 6; index++) {
    x = points[index].x * weights[index] + x;
    y = points[index].y * weights[index] + y;
  }
  return { x: x / 99, y: y / 99 };
}

/** 0x10359f8d4..0x10359f948; return the updated outer point without mutating inputs. */
export function adjustSplineOuterNeighbor(anchor: Point, opposite: Point, outer: Point): Point {
  const dx = outer.x - anchor.x;
  const dy = outer.y - anchor.y;
  const squared = fma64(dx, dx, dy * dy);
  if (squared < 100) return { ...outer };
  const oppositeDx = anchor.x - opposite.x;
  const oppositeDy = anchor.y - opposite.y;
  const limitSquared = fma64(oppositeDx, oppositeDx, oppositeDy * oppositeDy) * 6.25;
  if (squared < limitSquared) return { ...outer };
  const limit = limitSquared > 100 ? Math.sqrt(limitSquared) : 10;
  const scale = limit / Math.sqrt(squared);
  return { x: fma64(dx, scale, anchor.x), y: fma64(dy, scale, anchor.y) };
}

/** The measure routine's separately rounded products, additions, and subtractions. */
function weightedMeasurePoint(points: SixPoints, weights: readonly number[]): Point {
  const coordinate = (axis: "x" | "y") => {
    let sum = points[0][axis] * weights[0] - points[1][axis] * weights[1];
    sum = points[2][axis] * weights[2] + sum;
    sum = points[3][axis] * weights[3] + sum;
    sum = sum - points[4][axis] * weights[4];
    sum = points[5][axis] * weights[5] + sum;
    return sum / 99;
  };
  return { x: coordinate("x"), y: coordinate("y") };
}

/** 0x10359fd24..0x10359fe84; four chords with direct P2/P3 endpoints. */
export function measureSpline(points: SixPoints): number {
  const quarter = weightedMeasurePoint(points, [1.625, 11, 88.75, 23, 4, 0.625]);
  const half = weightedMeasurePoint(points, [1.5, 10, 58, 58, 10, 1.5]);
  const threeQuarters = weightedMeasurePoint(points, [0.625, 4, 23, 88.75, 11, 1.625]);
  let length = pointDistance(points[2], quarter);
  length += pointDistance(quarter, half);
  length += pointDistance(half, threeQuarters);
  return length + pointDistance(threeQuarters, points[3]);
}

/** 0x1035a01c0..0x1035a0324; 4..255 intervals, cumulative t, explicit final tEnd. */
export function sampleSpline(points: SixPoints, density: number, tStart = 0, tEnd = 1): Point[] {
  const count = Math.max(
    4,
    Math.min(
      255,
      truncateToSignedInt32((Math.abs(tEnd - tStart) * measureSpline(points)) / density),
    ),
  );
  const step = (tEnd - tStart) / count;
  const samples: Point[] = [];
  let t = tStart;
  for (let index = 0; index < count; index++) {
    samples.push(evaluateSpline(points, t));
    t = step + t;
  }
  samples.push(evaluateSpline(points, tEnd));
  return samples;
}
