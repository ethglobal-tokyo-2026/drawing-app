import { describe, expect, it } from "vitest";
import { floodFill, type Pixels } from "../fill";
import { prepareFillPatch } from "./core";

const pixels = (width: number, data: number[]): Pixels => ({
  width,
  height: data.length / width / 4,
  data: new Uint8ClampedArray(data),
});

describe("worker fill preparation", () => {
  it.each([false, true])(
    "keeps a found transparent region without a write when locked %s",
    (locked) => {
      const target = pixels(2, [0, 0, 0, 0, 0, 0, 0, 0]);
      const result = prepareFillPatch({
        at: { x: 10, y: 20, w: 2, h: 1 },
        shown: target,
        target,
        sx: 0,
        sy: 0,
        color: [255, 0, 0],
        gap: 0,
        locked,
      });
      expect(result.kind).toBe("found");
      if (result.kind !== "found") throw new Error("No region found");
      expect(result.interiorSpans).toEqual(new Uint32Array([20, 10, 12]));
      expect(result.written === null).toBe(locked);
      expect([...result.pixels.data]).toEqual(
        locked ? [0, 0, 0, 0, 0, 0, 0, 0] : [255, 0, 0, 255, 255, 0, 0, 255],
      );
    },
  );
  it("preserves the accepted seed's tolerance across chained colors", () => {
    const target = pixels(3, [100, 100, 100, 255, 160, 100, 100, 255, 220, 100, 100, 255]);
    const expected = pixels(3, [...target.data]);
    floodFill(expected, 1, 0, [0, 0, 255], 0);
    const result = prepareFillPatch({
      at: { x: 0, y: 0, w: 3, h: 1 },
      shown: target,
      target,
      sx: 1,
      sy: 0,
      color: [0, 0, 255],
      gap: 0,
      locked: false,
    });
    expect(result.kind).toBe("found");
    if (result.kind !== "found") throw new Error("No region found");
    expect(result.pixels.data).toEqual(expected.data);
    expect([...result.pixels.data]).toEqual([0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255]);
  });
  it("returns empty for same-paint opaque seeds", () => {
    const target = pixels(1, [255, 0, 0, 255]);
    expect(
      prepareFillPatch({
        at: { x: 0, y: 0, w: 1, h: 1 },
        shown: target,
        target,
        sx: 0,
        sy: 0,
        color: [255, 0, 0],
        gap: 0,
        locked: false,
      }),
    ).toEqual({ kind: "empty" });
  });
  it("asks for an expansion when a region reaches a cut side", () => {
    const target = pixels(2, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(
      prepareFillPatch({
        at: { x: 0, y: 0, w: 2, h: 1 },
        shown: target,
        target,
        sx: 0,
        sy: 0,
        color: [255, 0, 0],
        gap: 0,
        locked: false,
        cut: { left: false, top: false, right: true, bottom: false },
      }),
    ).toEqual({ kind: "past" });
  });
  it.each([0, 2])(
    "preserves soft edge coverage and gap closing on an opaque destination, gap %s",
    (gap) => {
      const rows = [
        "...........",
        ".#########.",
        ".#eeeeeee#.",
        ".#e.....e#.",
        ".#e.....e#.",
        ".#eeeeeee#.",
        ".####.####.",
        "...........",
      ];
      const data = rows.flatMap((row) =>
        row
          .split("")
          .flatMap((char) =>
            char === "#" ? [28, 24, 36, 255] : char === "e" ? [28, 24, 36, 180] : [0, 0, 0, 0],
          ),
      );
      const target = pixels(11, data);
      const expected = pixels(11, data);
      floodFill(expected, 5, 3, [255, 0, 0], gap);
      const result = prepareFillPatch({
        at: { x: 10, y: 20, w: 11, h: 8 },
        shown: target,
        target,
        sx: 5,
        sy: 3,
        color: [255, 0, 0],
        gap,
        locked: false,
      });
      if (result.kind !== "found") throw new Error("No region found");
      expect(result.pixels.data).toEqual(expected.data);
      expect([...result.pixels.data.slice((3 * 11 + 5) * 4, (3 * 11 + 5) * 4 + 4)]).toEqual([
        255, 0, 0, 255,
      ]);
      expect([...result.pixels.data.slice((3 * 11 + 2) * 4, (3 * 11 + 2) * 4 + 4)]).toEqual([
        95, 17, 25, 255,
      ]);
      expect([...result.pixels.data.slice((3 * 11 + 1) * 4, (3 * 11 + 1) * 4 + 4)]).toEqual([
        28, 24, 36, 255,
      ]);
    },
  );
});
