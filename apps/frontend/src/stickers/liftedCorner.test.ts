import { describe, expect, it } from "vitest";
import { foldOf } from "./liftedCorner";

const SIZE = 100;

/** A square RGBA mask, opaque wherever `inside` holds. */
function mask(inside: (x: number, y: number) => boolean) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) if (inside(x, y)) data[(y * SIZE + x) * 4 + 3] = 255;
  return data;
}

/** Where the flap folds, as percentages of the mask's width and height. */
function focusOf(data: Uint8ClampedArray) {
  const fold = foldOf(data, SIZE, SIZE);
  if (!fold) throw new Error("The mask has no fold");
  return { x: parseFloat(fold.fx), y: parseFloat(fold.fy) };
}

describe("the lifted corner", () => {
  it("folds a square sticker at its bottom-right corner", () => {
    const focus = focusOf(mask(() => true));
    expect(focus.x).toBeGreaterThan(80);
    expect(focus.y).toBeGreaterThan(80);
  });

  it("folds where the silhouette meets the diagonal, not at the box's corner", () => {
    const round = focusOf(mask((x, y) => Math.hypot(x - 50, y - 50) <= 40));
    expect(round.x).toBeLessThan(75);
    expect(round.x).toBeGreaterThan(50);
    expect(round.y).toBeCloseTo(round.x);
  });

  it("leaves a sticker with no silhouette on the diagonal flat", () => {
    expect(
      foldOf(
        mask(() => false),
        SIZE,
        SIZE,
      ),
    ).toBeNull();
  });
});
