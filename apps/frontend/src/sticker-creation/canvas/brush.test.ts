import { describe, expect, it } from "vitest";
import { PEN_PRESSURE_SAMPLES, StrokeBuilder, type PenPressure } from "./brush";
import { STRIDE } from "./ops";

const SIZE = 10;

/** A brush stroke from 0,0, with whatever of its start `given` sets. */
const builder = (given: Partial<ConstructorParameters<typeof StrokeBuilder>[0]> = {}) =>
  new StrokeBuilder({
    tool: "brush",
    color: "#000000",
    size: SIZE,
    x: 0,
    y: 0,
    t: 0,
    T: 0,
    pressure: 0,
    pointerType: "mouse",
    pressureVaries: false,
    response: "normal",
    ...given,
  });

interface Drawn {
  /** One pressure for every point, or each point's by its index. */
  pressure?: number | ((i: number) => number);
  pointer?: string;
  ms?: number;
  tool?: "brush" | "eraser";
  /** The pen has shown its pressure moving before this stroke. */
  pressureVaries?: boolean;
  response?: PenPressure;
}

/** Widths as fractions of the brush size, after adding `n` points 10px apart, `ms` apart. */
function widths(n: number, drawn: Drawn = {}): number[] {
  const {
    pressure = 0.5,
    pointer = "mouse",
    ms = 16,
    tool = "brush",
    pressureVaries = true,
    response = "normal",
  } = drawn;
  const pressed = (i: number) => (typeof pressure === "number" ? pressure : pressure(i));
  const stroke = builder({
    tool,
    pressure: pressed(0),
    pointerType: pointer,
    pressureVaries,
    response,
  });
  for (let i = 1; i <= n; i++) stroke.add(i * 10, 0, pressed(i), i * ms);
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
    const stroke = builder();
    expect(stroke.add(0.3, 0.3, 0.5, 16)).toBe(false);
    expect(stroke.add(0.6, 0, 0.5, 32)).toBe(true);
    expect(stroke.op.pts.length / STRIDE).toBe(2);
  });

  it("starts a pen stroke at its first sample's width, so a light start stays light", () => {
    const light = widths(40, { pointer: "pen", pressure: 0.1 });
    const firm = widths(40, { pointer: "pen", pressure: 0.9 });
    expect(light[0]).toBeLessThan(firm[0]);
    // Nothing heavier than where it settles: no full-width start thinning out.
    expect(Math.max(...light)).toBeCloseTo(last(light));
  });

  it("draws a pen whose pressure never moves as a finger draws, by speed, under every curve", () => {
    for (const response of ["light", "normal", "firm"] as const)
      for (const ms of [0.5, 1000])
        expect(
          widths(40, { pointer: "pen", pressure: 0.5, pressureVaries: false, response, ms }),
        ).toEqual(widths(40, { pointer: "touch", ms }));
    // Once its pressure moves, pressure sets the width.
    const moving = { pointer: "pen", ms: 0.5, pressureVaries: false } as const;
    expect(last(widths(40, { ...moving, pressure: (i) => (i < 5 ? 0.5 : 1) }))).toBeCloseTo(
      last(widths(40, { pointer: "pen", ms: 0.5, pressure: 1 })),
    );
  });

  it("shows a pen's change of pressure in full within its few samples", () => {
    const STEP = 20;
    const stepped = widths(40, { pointer: "pen", pressure: (i) => (i < STEP ? 0.2 : 0.9) });
    const firm = last(widths(40, { pointer: "pen", pressure: 0.9 }));
    expect(stepped[STEP + PEN_PRESSURE_SAMPLES - 1]).toBeCloseTo(firm);
  });

  it("draws wider at one pressure under Light than Normal, and Normal than Firm, and the brush's own size under Off", () => {
    const at = (response: PenPressure) =>
      last(widths(40, { pointer: "pen", pressure: 0.3, response }));
    expect(at("light")).toBeGreaterThan(at("normal"));
    expect(at("normal")).toBeGreaterThan(at("firm"));
    const off = (pressure: Drawn["pressure"], ms: number, pressureVaries: boolean) =>
      widths(40, { pointer: "pen", pressure, ms, pressureVaries, response: "off" });
    expect(off((i) => i / 40, 0.5, true)).toEqual(off(0.5, 1000, false));
    expect(last(off(0.5, 1000, false))).toBe(1);
  });
});
