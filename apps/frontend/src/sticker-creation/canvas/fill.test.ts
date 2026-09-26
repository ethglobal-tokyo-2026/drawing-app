import { describe, expect, it } from "vitest";
import { floodFill, type Pixels } from "./fill";

type Rgba = [number, number, number, number];

const INK: Rgba = [28, 24, 36, 255];
const RED = [255, 0, 0] as const;
const KEY: Record<string, Rgba> = {
  ".": [0, 0, 0, 0],
  "#": INK,
  // Faint enough to count as empty paper.
  f: [28, 24, 36, 100],
  // A line's soft edge: ink, but not opaque.
  e: [28, 24, 36, 191],
  o: [255, 90, 54, 255],
  // Within the tolerance of o (|ΔRGB| sums to 46)…
  p: [255, 110, 80, 255],
  // …and outside it (sums to 105).
  q: [200, 40, 54, 255],
};

/** Pixels from rows of characters, one per pixel, colored by `KEY`. */
function image(rows: string[]): Pixels {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => row.split("").forEach((c, x) => data.set(KEY[c], (y * width + x) * 4)));
  return { width, height: rows.length, data };
}

const at = (img: Pixels, x: number, y: number) => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];

describe("floodFill", () => {
  it("fills empty paper up to the line, counting faint pixels as empty", () => {
    const img = image([
      "..........",
      ".########.",
      ".########.",
      ".##....##.",
      ".##.f..##.",
      ".##....##.",
      ".########.",
      ".########.",
      "..........",
    ]);
    expect(floodFill(img, 3, 3, RED)).toBe(true);
    expect(at(img, 3, 3)).toEqual([...RED, 255]);
    expect(at(img, 6, 5)).toEqual([...RED, 255]);
    expect(at(img, 4, 4)).toEqual([...RED, 255]);
    expect(at(img, 1, 1)).toEqual(INK);
    expect(at(img, 0, 0)).toEqual(KEY["."]);
    expect(at(img, 9, 8)).toEqual(KEY["."]);
  });

  it("fills a colored region across small color differences but not large ones", () => {
    const img = image(["oopoq", "ooooq"]);
    floodFill(img, 0, 0, RED);
    expect(at(img, 2, 0)).toEqual([...RED, 255]);
    expect(at(img, 4, 0)).toEqual(KEY.q);
  });

  it("does nothing on a color already within 8 of the fill color", () => {
    const img = image(["ooo"]);
    const before = [...img.data];
    expect(floodFill(img, 1, 0, [255, 93, 55])).toBe(false);
    expect([...img.data]).toEqual(before);
  });

  it("tucks the fill 2px under a line's soft edge", () => {
    const img = image(["....eeee...."]);
    floodFill(img, 0, 0, RED);
    for (const x of [4, 5]) {
      const [r, g, b, a] = at(img, x, 0);
      expect(a).toBe(255);
      // The fill shows through under the edge, so the pixel sits between the ink and the fill.
      expect(r).toBeGreaterThan(INK[0]);
      expect(r).toBeLessThan(RED[0]);
      expect([g, b]).toEqual([18, 27]);
    }
    expect(at(img, 6, 0)).toEqual(KEY.e);
    expect(at(img, 11, 0)).toEqual(KEY["."]);
  });
});
