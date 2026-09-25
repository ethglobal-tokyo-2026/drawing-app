import { describe, expect, it } from "vitest";
import { distanceTransform, fillHoles, makeStickerPixels, traceContours } from "./stickerPixels";

const grid = (w: number, h: number, on: (x: number, y: number) => boolean) => {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = on(x, y) ? 1 : 0;
  return m;
};

describe("distanceTransform", () => {
  it("gives squared Euclidean distance to the nearest set pixel", () => {
    const m = grid(9, 9, (x, y) => x === 4 && y === 4);
    const d = distanceTransform(m, 9, 9);
    expect(d[4 * 9 + 4]).toBe(0);
    expect(d[4 * 9 + 7]).toBe(9);
    expect(d[0]).toBe(32);
  });
});

describe("fillHoles", () => {
  it("fills a ring interior but not the outside", () => {
    const m = grid(
      9,
      9,
      (x, y) =>
        (x >= 2 && x <= 6 && (y === 2 || y === 6)) || (y >= 2 && y <= 6 && (x === 2 || x === 6)),
    );
    fillHoles(m, 9, 9);
    expect(m[4 * 9 + 4]).toBe(1);
    expect(m[0]).toBe(0);
  });
});

describe("traceContours", () => {
  it("traces one loop per blob", () => {
    const m = grid(
      20,
      10,
      (x, y) => y >= 2 && y <= 7 && ((x >= 2 && x <= 6) || (x >= 12 && x <= 17)),
    );
    const loops = traceContours(m, 20, 10);
    expect(loops).toHaveLength(2);
    for (const loop of loops) {
      for (const [x, y] of loop) {
        expect(x).toBeGreaterThanOrEqual(1.5);
        expect(y).toBeGreaterThanOrEqual(1.5);
      }
    }
  });
});

describe("makeStickerPixels", () => {
  it("grows the ink into a paper border and keeps outside transparent", () => {
    const w = 40;
    const h = 40;
    const drawing = new Uint8ClampedArray(w * h * 4);
    // A black dot in the middle.
    for (let y = 18; y < 22; y++)
      for (let x = 18; x < 22; x++) drawing.set([0, 0, 0, 255], (y * w + x) * 4);
    const s = makeStickerPixels(drawing, w, h, 8);
    const at = (a: Uint8ClampedArray, x: number, y: number) => [
      ...a.slice((y * w + x) * 4, (y * w + x) * 4 + 4),
    ];
    expect(at(s.cut, 20, 20)).toEqual([0, 0, 0, 255]); // ink
    expect(at(s.cut, 26, 20)).toEqual([255, 255, 255, 255]); // paper border
    expect(at(s.cut, 2, 2)[3]).toBe(0); // outside
    expect(s.dome[(20 * w + 26) * 4 + 3]).toBe(255);
    expect(s.outline.startsWith("M")).toBe(true);
  });

  it("bridges nearby parts into a single piece", () => {
    const w = 80;
    const h = 40;
    const drawing = new Uint8ClampedArray(w * h * 4);
    // Two dots 16px apart.
    for (const cx of [30, 50])
      for (let y = 18; y < 22; y++)
        for (let x = cx - 2; x < cx + 2; x++) drawing.set([0, 0, 0, 255], (y * w + x) * 4);
    const apart = makeStickerPixels(drawing, w, h, 4);
    const joined = makeStickerPixels(drawing, w, h, 4, 8);
    expect(apart.outline.match(/M/g)).toHaveLength(2);
    expect(joined.outline.match(/M/g)).toHaveLength(1);
    // Midway between the dots is paper once bridged.
    expect(apart.cut[(20 * w + 40) * 4 + 3]).toBe(0);
    expect(joined.cut[(20 * w + 40) * 4 + 3]).toBe(255);
  });
});
