import { describe, expect, it } from "vitest";
import { StrokeBuilder } from "./brush";
import { STRIDE } from "./ops";

const SIZE = 10;

const start = (tool: "brush" | "eraser" = "brush") =>
  new StrokeBuilder({ tool, color: "#000000", size: SIZE, x: 0, y: 0, t: 0, T: 0 });

/** Widths as fractions of the brush size, after adding `n` points 10px apart, `ms` apart. */
function widths(
  n: number,
  {
    pressure = 0.5,
    pointer = "mouse",
    ms = 16,
    tool = "brush",
  }: { pressure?: number; pointer?: string; ms?: number; tool?: "brush" | "eraser" } = {},
): number[] {
  const stroke = start(tool);
  for (let i = 1; i <= n; i++) stroke.add(i * 10, 0, pressure, pointer, i * ms);
  const { pts } = stroke.op;
  return Array.from({ length: pts.length / STRIDE }, (_, i) => pts[i * STRIDE + 2] / SIZE);
}

const last = (list: number[]) => list[list.length - 1];

describe("StrokeBuilder", () => {
  it("sets a pen's width from pressure, from 0.28 of the size to all of it", () => {
    expect(last(widths(40, { pointer: "pen", pressure: 1 }))).toBeCloseTo(1);
    expect(last(widths(40, { pointer: "pen", pressure: 0.0001 }))).toBeCloseTo(0.28);
  });

  it("thins fast touch and mouse strokes, within 0.68 and 1.1 of the size", () => {
    // 10px every half millisecond (time steps floor at 1ms) against 10px a second.
    expect(last(widths(40, { ms: 0.5 }))).toBeCloseTo(0.68);
    expect(last(widths(40, { ms: 1000 }))).toBeCloseTo(1.1);
    expect(last(widths(40, { pointer: "touch", ms: 0.5 }))).toBeCloseTo(0.68);
  });

  it("tapers in from a dot at 0.6 of the size", () => {
    const taper = widths(6, { pointer: "pen", pressure: 1 });
    expect(taper.map((w) => +w.toFixed(2))).toEqual([0.6, 0.68, 0.76, 0.84, 0.92, 1, 1]);
  });

  it("keeps the eraser at its full size", () => {
    expect(widths(8, { tool: "eraser", ms: 0.5 }).every((w) => w === 1)).toBe(true);
  });

  it("skips points within half a pixel of the last", () => {
    const stroke = start();
    expect(stroke.add(0.3, 0.3, 0.5, "mouse", 16)).toBe(false);
    expect(stroke.add(0.6, 0, 0.5, "mouse", 32)).toBe(true);
    expect(stroke.op.pts.length / STRIDE).toBe(2);
  });
});
