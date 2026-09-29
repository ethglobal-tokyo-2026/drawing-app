/**
 * A sticker's cut line with only the points that shape it. The stored line keeps a point every 2 px,
 * far finer than a sticker sheet packs by or a ticket stub prints, so the board and the tickets send
 * this one instead.
 */

type Point = [x: number, y: number];

/** How far the simplified line may stray from the stored one, as a share of the image's long side. */
export const TOLERANCE = 0.002;

/** The stored line's loops: an SVG path of M, L and Z commands. */
function loopsOf(path: string): Point[][] {
  return path.split("M").flatMap((loop) => {
    const values = (loop.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const points: Point[] = [];
    for (let i = 0; i + 1 < values.length; i += 2) points.push([values[i], values[i + 1]]);
    return points.length > 0 ? [points] : [];
  });
}

/** The squared distance from `p` to the segment from `a` to `b`. */
function squaredToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  const x = ax + t * dx - px;
  const y = ay + t * dy - py;
  return x * x + y * y;
}

/** Douglas and Peucker's simplification of the open run from `first` to `last`, marking what it keeps. */
function keepAlong(
  points: Point[],
  first: number,
  last: number,
  tolerance: number,
  kept: boolean[],
) {
  const runs: [number, number][] = [[first, last]];
  const squaredTolerance = tolerance * tolerance;
  for (let run = runs.pop(); run; run = runs.pop()) {
    const [from, to] = run;
    let farthest = -1;
    let farthestSquared = squaredTolerance;
    for (let i = from + 1; i < to; i++) {
      const squared = squaredToSegment(points[i], points[from], points[to]);
      if (squared > farthestSquared) {
        farthest = i;
        farthestSquared = squared;
      }
    }
    if (farthest >= 0) {
      kept[farthest] = true;
      runs.push([from, farthest], [farthest, to]);
    }
  }
}

/** A closed loop's points within `tolerance` of it: split at the point farthest from its first. */
function simplifyLoop(points: Point[], tolerance: number): Point[] {
  if (points.length <= 3) return points;
  const [x0, y0] = points[0];
  let opposite = 0;
  let farthest = -1;
  points.forEach(([x, y], i) => {
    const squared = (x - x0) * (x - x0) + (y - y0) * (y - y0);
    if (squared > farthest) {
      opposite = i;
      farthest = squared;
    }
  });
  const kept = points.map((_, i) => i === 0 || i === opposite);
  const closed = [...points, points[0]];
  kept.push(false);
  keepAlong(closed, 0, opposite, tolerance, kept);
  keepAlong(closed, opposite, points.length, tolerance, kept);
  return points.filter((_, i) => kept[i]);
}

/** A tenth of a pixel is finer than any use of the line, and "12" is shorter than "12.0". */
const coordinate = (value: number) => String(Math.round(value * 10) / 10);

/** The cut line simplified for a `width` × `height` image, in the stored line's format. */
export function simplifiedOutline(path: string, width: number, height: number): string {
  const tolerance = TOLERANCE * Math.max(width, height);
  return loopsOf(path)
    .map((loop) => simplifyLoop(loop, tolerance))
    .filter((loop) => loop.length > 0)
    .map((loop) => `M${loop.map(([x, y]) => `${coordinate(x)} ${coordinate(y)}`).join("L")}Z`)
    .join("");
}
