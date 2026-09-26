import { describe, expect, it } from "vitest";
import { simplifiedOutline } from "./outline.ts";

type Point = [number, number];

const SIZE = 600;

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
  it("stays within a fraction of a pixel of the stored one, on far fewer points", () => {
    const stored = storedLine(blob());
    const simplified = simplifiedOutline(stored, SIZE, SIZE);
    const kept = pointsOf(simplified);
    for (const point of pointsOf(stored)) expect(distanceToLoop(point, kept)).toBeLessThan(1.5);
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
