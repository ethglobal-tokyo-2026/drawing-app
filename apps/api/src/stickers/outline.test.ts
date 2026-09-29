import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAX_CACHED_OUTLINE_CHARS,
  simplifiedOutline,
  simplifiedOutlineOf,
  TOLERANCE,
} from "./outline.ts";

type Point = [number, number];

const SIZE = 600;
/** How far the simplified line may stray: its tolerance, plus rounding to a tenth of a pixel. */
const MAX_STRAY = TOLERANCE * SIZE + 0.1;

/** A cut line as the seal stores it: a point every 2 px, to a tenth of a pixel. */
function storedLine(points: Point[]) {
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

/** A wobbly blob round the image's middle, like a drawn sticker's cut. */
function blob(): Point[] {
  const points: Point[] = [];
  for (let t = 0; t < Math.PI * 2; t += 2 / 250) {
    const r = 250 + 20 * Math.sin(t * 5) + 6 * Math.cos(t * 13);
    points.push([300 + r * Math.cos(t), 300 + r * Math.sin(t)]);
  }
  return points;
}

const pointsOf = (path: string): Point[] =>
  [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

function distanceToLoop([px, py]: Point, loop: Point[]) {
  let best = Infinity;
  loop.forEach(([ax, ay], i) => {
    const [bx, by] = loop[(i + 1) % loop.length];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)),
    );
    best = Math.min(best, Math.hypot(ax + t * dx - px, ay + t * dy - py));
  });
  return best;
}

describe("a simplified cut line", () => {
  it("stays within its tolerance of the stored one, on far fewer points", () => {
    const stored = storedLine(blob());
    const simplified = simplifiedOutline(stored, SIZE, SIZE);
    const kept = pointsOf(simplified);
    for (const point of pointsOf(stored)) {
      expect(distanceToLoop(point, kept)).toBeLessThan(MAX_STRAY);
    }
    expect(simplified.length).toBeLessThan(stored.length / 4);
    expect(simplified).toMatch(/^M[-\d. LZ]*Z$/);
  });

  it("keeps each loop of a line with more than one", () => {
    const square = (x: number): Point[] => [
      [x, 10],
      [x + 40, 10],
      [x + 40, 50],
      [x, 50],
    ];
    const simplified = simplifiedOutline(
      `${storedLine(square(10))}${storedLine(square(100))}`,
      SIZE,
      SIZE,
    );
    expect(simplified.match(/M/g)).toHaveLength(2);
  });
});

describe("a sealed sticker's simplified cut line", () => {
  /** Two cut lines that simplify to different lines. */
  const SQUARE = storedLine([
    [10, 10],
    [50, 10],
    [50, 50],
    [10, 50],
  ]);
  const TRIANGLE = storedLine([
    [10, 10],
    [50, 10],
    [30, 50],
  ]);
  const sticker = (id: string, outline: string) => ({ id, outline, width: SIZE, height: SIZE });

  it("is simplified once, then reused for the same sticker", () => {
    const id = randomUUID();
    expect(simplifiedOutlineOf(sticker(id, SQUARE))).toBe(simplifiedOutline(SQUARE, SIZE, SIZE));
    // Sealing fixes the outline, so a repeat read answers from the cache, not from what it's passed.
    expect(simplifiedOutlineOf(sticker(id, TRIANGLE))).toBe(simplifiedOutline(SQUARE, SIZE, SIZE));
  });

  it("keeps at most MAX_CACHED_OUTLINE_CHARS of cut lines, letting the first one cached go", () => {
    const square = simplifiedOutline(SQUARE, SIZE, SIZE);
    const fill = Math.floor(MAX_CACHED_OUTLINE_CHARS / square.length) + 1;
    const ids = Array.from({ length: fill }, () => randomUUID());
    for (const id of ids) simplifiedOutlineOf(sticker(id, SQUARE));
    const [first, ...kept] = ids;
    expect(kept.filter((id) => simplifiedOutlineOf(sticker(id, TRIANGLE)) !== square)).toEqual([]);
    expect(simplifiedOutlineOf(sticker(first, TRIANGLE))).toBe(
      simplifiedOutline(TRIANGLE, SIZE, SIZE),
    );
  });
});
