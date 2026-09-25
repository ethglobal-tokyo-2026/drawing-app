import { describe, expect, it } from "vitest";
import { floodFill, type Pixels } from "./fill";

/** 7x7 transparent image with an opaque black ring around the center 3x3. */
function ring(): Pixels {
  const w = 7;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let y = 1; y <= 5; y++)
    for (let x = 1; x <= 5; x++)
      if (x === 1 || x === 5 || y === 1 || y === 5) data.set([0, 0, 0, 255], (y * w + x) * 4);
  return { width: w, height: w, data };
}

const px = (img: Pixels, x: number, y: number) => [
  ...img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];
const RED: [number, number, number, number] = [255, 0, 0, 255];

describe("floodFill", () => {
  it("fills the enclosed region and stops at the outline", () => {
    const img = ring();
    expect(floodFill(img, 3, 3, RED)).toBe(true);
    expect(px(img, 3, 3)).toEqual(RED);
    expect(px(img, 2, 4)).toEqual(RED);
    // Outside the ring stays transparent.
    expect(px(img, 0, 0)).toEqual([0, 0, 0, 0]);
  });

  it("grows one pixel into the outline to cover anti-aliasing", () => {
    const img = ring();
    floodFill(img, 3, 3, RED);
    expect(px(img, 1, 3)).toEqual(RED);
    expect(px(img, 5, 3)).toEqual(RED);
    // Corners of the ring aren't 4-adjacent to the interior.
    expect(px(img, 1, 1)).toEqual([0, 0, 0, 255]);
  });

  it("fills the outside without leaking into the ring interior", () => {
    const img = ring();
    floodFill(img, 0, 0, RED);
    expect(px(img, 6, 6)).toEqual(RED);
    expect(px(img, 3, 3)).toEqual([0, 0, 0, 0]);
  });

  it("does nothing when the seed already has the fill color", () => {
    const img = ring();
    expect(floodFill(img, 1, 1, [0, 0, 0, 255])).toBe(false);
    expect(floodFill(img, 99, 0, RED)).toBe(false);
  });
});
