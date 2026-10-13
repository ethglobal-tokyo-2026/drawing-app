/**
 * Bounded node-context reconstruction for CSP's six-point post-correction spline.
 * Links represent the results of the native previous/next accessors, including
 * their closed-path fallback. Callers must resolve that ownership behavior before
 * constructing this model. Explicit cycles are supported; no list is traversed
 * beyond three neighbors. This does not implement point allocation or deletion.
 */
import type { Point } from "./reference.ts";
import { adjustSplineOuterNeighbor, sampleSpline, type SixPoints } from "./spline.ts";

export interface SplineNode {
  point: Point;
  flags: number;
  previous: SplineNode | null;
  next: SplineNode | null;
}

const copy = (point: Point): Point => ({ x: point.x, y: point.y });
const corner = (node: SplineNode): boolean => (node.flags & 1) !== 0;

/** 0x1027888dc and mode-specific contexts at 0x102789248 / 0x1027893b0. */
export function buildSplineContext(
  anchor: SplineNode,
  endpoint: SplineNode,
  mode = 0,
): SixPoints | null {
  if (mode === 1) {
    if (endpoint.next === null) return null;
    endpoint = endpoint.next;
  }
  const c = copy(anchor.point);
  const d = copy(endpoint.point);

  let previous = anchor.previous;
  if (mode === 2 && previous !== null) previous = previous.previous;
  let a: Point;
  let b: Point;
  if (previous === null || corner(anchor)) {
    b = copy(c);
    a = copy(c);
  } else {
    b = adjustSplineOuterNeighbor(c, d, previous.point);
    const farther = previous.previous;
    a =
      farther === null || corner(previous)
        ? copy(b)
        : adjustSplineOuterNeighbor(b, c, farther.point);
  }

  let next = endpoint.next;
  let e: Point;
  let f: Point;
  if (mode === 2) {
    // 0x102789300 copies D, despite testing next(D)'s corner flag.
    if (next === null || corner(next)) {
      e = copy(d);
      f = copy(d);
    } else {
      e = adjustSplineOuterNeighbor(d, c, d);
      const farther = next.next;
      f =
        farther === null || corner(next) ? copy(e) : adjustSplineOuterNeighbor(e, d, farther.point);
    }
  } else {
    if (mode === 3 && next !== null) next = next.next;
    if (next === null || corner(endpoint)) {
      e = copy(d);
      f = copy(d);
    } else {
      e = adjustSplineOuterNeighbor(d, c, next.point);
      const farther = next.next;
      f =
        farther === null || corner(next) ? copy(e) : adjustSplineOuterNeighbor(e, d, farther.point);
    }
  }
  return [a, b, c, d, e, f];
}

/** 0x102789114 dispatch; native point count is this returned array's length. */
export function sampleSplineNodes(
  anchor: SplineNode,
  endpoint: SplineNode,
  mode: number,
  density: number,
  tStart = 0,
  tEnd = 1,
): Point[] {
  const context = buildSplineContext(anchor, endpoint, mode);
  // Mode 1's missing advanced endpoint bypasses spline arithmetic entirely.
  if (context === null) return [copy(anchor.point)];
  return mode === 2 || mode === 3
    ? sampleSpline(context, density, 0, 1)
    : sampleSpline(context, density, tStart, tEnd);
}
