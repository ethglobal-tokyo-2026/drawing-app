import { describe, expect, it } from "vitest";
import type { Rect } from "../sealing/stickerLayers";
import { floodFill, floodSheet, type Pixels } from "./fill";

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

const copyOf = (img: Pixels): Pixels => ({ ...img, data: img.data.slice() });

/** Copies a block the size of `size` from (fx, fy) of `from` to (tx, ty) of `to`. */
function blit(
  from: Pixels,
  fx: number,
  fy: number,
  to: Pixels,
  tx: number,
  ty: number,
  size: Rect,
) {
  for (let row = 0; row < size.h; row++) {
    const start = ((fy + row) * from.width + fx) * 4;
    to.data.set(from.data.subarray(start, start + size.w * 4), ((ty + row) * to.width + tx) * 4);
  }
}

/** The whole image flooded in place, as every fill once was. */
function wholeImageFill(img: Pixels, x: number, y: number): Pixels {
  const out = copyOf(img);
  floodFill(out, x, y, RED);
  return out;
}

/** A fill as the ink takes one: `floodSheet` reads boxes of `img`, and only the changed box is written back. */
function sheetFill(img: Pixels, x: number, y: number, near: number) {
  const reads: Rect[] = [];
  const read = (box: Rect) => {
    reads.push(box);
    const pixels = { width: box.w, height: box.h, data: new Uint8ClampedArray(box.w * box.h * 4) };
    blit(img, box.x, box.y, pixels, 0, 0, box);
    return pixels;
  };
  const out = copyOf(img);
  const flood = floodSheet(img, read, x, y, RED, near);
  if (flood) {
    const { pixels, at: box, changed } = flood;
    blit(pixels, changed.x, changed.y, out, box.x + changed.x, box.y + changed.y, changed);
  }
  return { out, reads };
}

/** A shape drawn closed, soft inside as deep as the tuck, with a faint speck, beside a colored patch. */
const SHEET = image([
  "...........................",
  "..#############............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#....ooooo...",
  "..#ee.......ee#....opooq...",
  "..#ee...f...ee#....ooooo...",
  "..#ee.......ee#............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#............",
  "..#############............",
  "...........................",
]);

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
    expect(floodFill(img, 3, 3, RED)).not.toBeNull();
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
    expect(floodFill(img, 1, 0, [255, 93, 55])).toBeNull();
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

describe("floodSheet", () => {
  it.each([
    ["inside the closed shape", 6, 5],
    ["on open paper", 0, 0],
    ["on the colored patch", 19, 4],
  ])("gives the whole-image fill's pixels %s, whatever box it reads first", (_, x, y) => {
    const expected = wholeImageFill(SHEET, x, y).data;
    // Every size moves the box's sides across the region: cutting it, touching it or its tuck, clearing it.
    for (let near = 1; near <= SHEET.width + 2; near++) {
      expect(sheetFill(SHEET, x, y, near).out.data, `near ${near}`).toEqual(expected);
    }
  });

  it("reads only the box around the seed when the region and its tuck fit inside it", () => {
    const { reads } = sheetFill(SHEET, 6, 5, 16);
    expect(reads).toHaveLength(1);
    expect(reads[0].w * reads[0].h).toBeLessThan(SHEET.width * SHEET.height);
  });
});
