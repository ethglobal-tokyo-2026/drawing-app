import { describe, expect, it } from "vitest";
import { cutInk } from "./cutSticker";
import { BORDER_UNITS } from "./dieCut";
import type { Pixels } from "./pixels";

/** A sheet `side` units square at `density`, inked with a `radius`-unit disk in its middle. */
function diskSheet(side: number, radius: number, density: number): Pixels {
  const size = Math.round(side * density);
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= radius * density)
        data.set([28, 24, 36, 255], (y * size + x) * 4);
  return { width: size, height: size, data };
}

describe("cutInk", () => {
  it("cuts the same sticker, in sheet units, from ink backed at any density", () => {
    const [side, radius] = [200, 40];
    /** The cut's width and the image's, in sheet units, from the disk backed at `density`. */
    const inUnits = (density: number) => {
      const inked = cutInk(diskSheet(side, radius, density), density);
      if (!inked) throw new Error("The sheet has ink, so it cuts");
      const { cut, passes } = inked;
      return {
        cut: (cut.bounds.x1 - cut.bounds.x0 + 1) / (cut.scale * density),
        image: passes.place.w / density,
      };
    };
    const [phone, tablet] = [inUnits(1), inUnits(2.5)];
    // The white border is BORDER_UNITS wide all round, to within a cell of the cut's grid.
    expect(Math.abs(phone.cut - 2 * (radius + BORDER_UNITS))).toBeLessThan(2);
    expect(Math.abs(tablet.cut - phone.cut)).toBeLessThan(2);
    expect(Math.abs(tablet.image - phone.image)).toBeLessThan(2);
  });
});
