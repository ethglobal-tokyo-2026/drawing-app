/**
 * CSP 5.1.4 ARM64 post-correction sampling and adjacent-segment projection.
 * Numeric scope: finite coordinates/intermediates, FPCR=0; density zero follows
 * the native signed conversion of infinity/NaN. No NaN payload/status modeling.
 * Point arrays represent a native nonnegative signed 32-bit sample count.
 */
import { fma64 } from "../stabilization/binary64.ts";
import { truncateToSignedInt32 } from "../stabilization/arithmetic.ts";
import type { Point } from "./reference.ts";
import { evaluateQuadratic, measureQuadratic, type QuadraticPoints } from "./quadratic.ts";

function squaredDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return fma64(dx, dx, dy * dy);
}

/** Both native loops initialize index zero and replace it only on strict MI. */
function nearestVertex(samples: readonly Point[], point: Point): number {
  let index = 0;
  let distance = Number.MAX_VALUE;
  for (let i = 0; i < samples.length; i++) {
    const candidate = squaredDistance(samples[i], point);
    if (candidate < distance) {
      distance = candidate;
      index = i;
    }
  }
  return index;
}

/** 0x102193940: FNMUL before FMADD/FNMADD, with direct endpoint branches. */
function segmentDistance(a: Point, b: Point, point: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const px = point.x - a.x;
  const py = point.y - a.y;
  const dot = fma64(dx, px, dy * py);
  let squared: number;
  if (dot <= 0) {
    squared = fma64(px, px, py * py);
  } else {
    const lengthSquared = fma64(dx, dx, dy * dy);
    if (dot >= lengthSquared) {
      squared = squaredDistance(point, b);
    } else {
      const cross = fma64(py, dx, -(px * dy));
      return (cross < 0 ? -cross : cross) / Math.sqrt(lengthSquared);
    }
  }
  return squared === 0 ? 0 : Math.sqrt(squared);
}

/**
 * 0x10359b3b4: nearest vertex, following segment, then preceding segment.
 * This deliberately does not find the globally nearest polyline segment.
 * With zero or one sample the native result is DBL_MAX, not point distance.
 */
export function nearestSampleDistance(samples: readonly Point[], point: Point): number {
  const index = nearestVertex(samples, point);
  let distance =
    index < samples.length - 1
      ? segmentDistance(samples[index], samples[index + 1], point)
      : Number.MAX_VALUE;
  if (index >= 1) {
    const candidate = segmentDistance(samples[index - 1], samples[index], point);
    if (candidate < distance) distance = candidate;
  }
  return distance;
}

/** 0x1021944a8: interpolation products/additions round separately. */
function projectSegment(a: Point, b: Point, point: Point): { point: Point; fraction: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dot = fma64(dx, point.x - a.x, dy * (point.y - a.y));
  if (dot <= 0) return { point: a, fraction: 0 };
  const lengthSquared = fma64(dx, dx, dy * dy);
  if (dot >= lengthSquared) return { point: b, fraction: 1 };
  const fraction = dot / lengthSquared;
  const complement = 1 - fraction;
  return {
    fraction,
    point: {
      x: b.x * fraction + a.x * complement,
      y: b.y * fraction + a.y * complement,
    },
  };
}

/**
 * 0x10359b240: neighboring projections yield a sample-index parameter.
 * Following wins projection ties; only the upper bound is clamped to one.
 * Native count zero dereferences an invalid sample; reject it explicitly here.
 */
export function nearestSampleParameter(samples: readonly Point[], point: Point): number {
  if (samples.length === 0) throw new RangeError("Projection requires at least one sample");
  const index = nearestVertex(samples, point);
  const reciprocal = 1 / (samples.length - 1);
  let parameter = 0;
  let distance = Number.MAX_VALUE;
  if (index < samples.length - 1) {
    const projection = projectSegment(samples[index], samples[index + 1], point);
    distance = squaredDistance(projection.point, point);
    parameter = reciprocal * (projection.fraction + index);
  }
  if (index >= 1) {
    const projection = projectSegment(samples[index - 1], samples[index], point);
    if (squaredDistance(projection.point, point) < distance) {
      parameter = reciprocal * (projection.fraction + (index - 1));
    }
  }
  return parameter > 1 ? 1 : parameter;
}

/**
 * 0x1027653d4 → 0x10359c7f0/838, quadratic branch used by 0x10276ca3c.
 * Four-chord measure sets 4–255 intervals; t advances cumulatively before a
 * separately evaluated exact end parameter. Reversed/extrapolated ranges stay.
 */
export function sampleQuadraticForCorrection(
  points: QuadraticPoints,
  density = 4,
  tStart = 0,
  tEnd = 1,
): Point[] {
  const count = Math.max(
    4,
    Math.min(
      255,
      truncateToSignedInt32((Math.abs(tEnd - tStart) * measureQuadratic(points)) / density),
    ),
  );
  const step = (tEnd - tStart) / count;
  const samples: Point[] = [];
  let t = tStart;
  for (let index = 0; index < count; index++) {
    samples.push(evaluateQuadratic(points, t));
    t = step + t;
  }
  samples.push(evaluateQuadratic(points, tEnd));
  return samples;
}
