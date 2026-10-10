import { describe, expect, it } from "vitest";
import { PEN_TAPER, PRESSURE_CAP, previewWidth, StrokeBuilder, type PenPressure } from "./brush";
import { STRIDE } from "./ops";
import { CURVE_FLATNESS } from "./strokeCurve";

const SIZE = 10;

/** A brush stroke from 0,0, with whatever of its start `given` sets. */
const builder = (given: Partial<ConstructorParameters<typeof StrokeBuilder>[0]> = {}) =>
  new StrokeBuilder({
    tool: "brush",
    layer: 1,
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

/** A stroke's widths as fractions of the brush size. */
const widthsOf = ({ op: { pts } }: StrokeBuilder) =>
  Array.from({ length: pts.length / STRIDE }, (_, i) => pts[i * STRIDE + 2] / SIZE);

interface Drawn {
  /** One pressure for every point, or each point's by its index. */
  pressure?: number | ((i: number) => number);
  pointer?: string;
  ms?: number;
  /** Sheet units between points. */
  step?: number;
  tool?: "brush" | "eraser";
  /** The pen has shown its pressure moving before this stroke. */
  pressureVaries?: boolean;
  response?: PenPressure;
  /** The pointer lifts after the last point. */
  lift?: boolean;
}

/** Widths as fractions of the brush size, after adding `n` points `step` apart, `ms` apart. */
function widths(n: number, drawn: Drawn = {}): number[] {
  const {
    pressure = 0.5,
    pointer = "mouse",
    ms = 16,
    step = 10,
    tool = "brush",
    pressureVaries = true,
    response = "normal",
    lift = false,
  } = drawn;
  const pressed = (i: number) => (typeof pressure === "number" ? pressure : pressure(i));
  const stroke = builder({
    tool,
    pressure: pressed(0),
    pointerType: pointer,
    pressureVaries,
    response,
  });
  for (let i = 1; i <= n; i++) stroke.add(i * step, 0, pressed(i), i * ms);
  stroke.settle(n * step, 0);
  if (lift) stroke.taperEnd();
  return widthsOf(stroke);
}

const last = (list: number[]) => list[list.length - 1];
/** A stroke's second half, where any taper in is long done. */
const settled = (list: number[]) => list.slice(list.length / 2);
/** How wide a long pen stroke settles at one pressure, as a fraction of the size. */
const penWidth = (pressure: number, response: PenPressure = "normal") =>
  last(widths(40, { pointer: "pen", pressure, response }));

/** A Pencil tap at full pressure: its nib wobbles a unit and back `wobbles` times, then lifts. */
function tap(wobbles: number): number[] {
  const stroke = builder({ pressure: 1, pointerType: "pen", pressureVaries: true });
  for (let i = 1; i <= wobbles; i++) stroke.add(i % 2, 0, 1, i * 4);
  stroke.settle(wobbles % 2, 0);
  stroke.taperEnd();
  return widthsOf(stroke);
}

/** The most a sharp corner's line may turn at any one point, in radians: less than the corner's own. */
const CORNER_TURN = Math.PI / 3;

/** A wavy line's samples, far enough apart that the builder takes each, so its spans curve. */
const WAVE = Array.from({ length: 8 }, (_, i) => [(i + 1) * 10, 10 * Math.sin(i)] as const);

/** A stroke through WAVE's first `n` samples; `asked`, its held-back points are asked for after each, as every frame does. */
function wave(n: number, asked: boolean): StrokeBuilder {
  const stroke = builder();
  WAVE.slice(0, n).forEach(([x, y], i) => {
    stroke.add(x, y, 0.5, (i + 1) * 16);
    if (asked) stroke.provisional();
  });
  return stroke;
}

/** A stroke's points, as x, y. */
const pointsOf = ({ op: { pts } }: StrokeBuilder) =>
  Array.from({ length: pts.length / STRIDE }, (_, i): [number, number] => [
    pts[i * STRIDE],
    pts[i * STRIDE + 1],
  ]);

describe("StrokeBuilder", () => {
  it("draws a half press as wide as the hover ring, a full press at most PRESSURE_CAP times that, and a feather-light touch at most half a full press", () => {
    for (const response of ["light", "normal", "firm"] as const) {
      const ring = previewWidth(response, true);
      expect(penWidth(0.5, response)).toBeCloseTo(ring);
      // No jump as a press passes halfway.
      expect(penWidth(0.5001, response)).toBeCloseTo(ring);
      expect(penWidth(1, response) / ring).toBeLessThanOrEqual(PRESSURE_CAP + 1e-9);
      expect(penWidth(0.0001, response)).toBeLessThan(penWidth(1, response) / 2);
    }
  });

  it("thins quick touch and mouse strokes", () => {
    for (const pointer of ["touch", "mouse"]) {
      // 10 units every 4 ms, a flick, against 10 a second.
      const [quick, slow] = [4, 1000].map((ms) => last(widths(40, { pointer, ms })));
      expect(quick).toBeLessThan(slow);
    }
  });

  it("tapers and thins a finger's stroke alike however often the screen samples it", () => {
    // One stroke's speed, sampled at 60 Hz and at 120 Hz: where both have a point, widths agree.
    const coarse = widths(16, { pointer: "touch", step: 5, ms: 1000 / 60 });
    const fine = widths(32, { pointer: "touch", step: 2.5, ms: 1000 / 120 });
    coarse.forEach((w, k) => expect(w).toBeCloseTo(fine[2 * k]));
  });

  it("widens a pen's stroke from its dot over its first PEN_TAPER.travel units, however densely the pen samples", () => {
    const FINE = 1;
    const COARSE = 4;
    const reach = 2 * PEN_TAPER.travel;
    const fine = widths(reach / FINE, { pointer: "pen", pressure: 1, step: FINE });
    const coarse = widths(reach / COARSE, { pointer: "pen", pressure: 1, step: COARSE });
    coarse.forEach((w, k) => {
      expect(w).toBeCloseTo(fine[(k * COARSE) / FINE]);
      if (k * COARSE < PEN_TAPER.travel) expect(w).toBeLessThan(penWidth(1));
      else expect(w).toBeCloseTo(penWidth(1));
    });
  });

  it("leaves a Pencil tap at full pressure a small dot, however many samples its wobble makes", () => {
    expect(Math.max(...tap(0))).toBeCloseTo(PEN_TAPER.dot * penWidth(1));
    expect(Math.max(...tap(16))).toBeCloseTo(Math.max(...tap(2)));
  });

  it("narrows a pen's stroke toward where it lifts over its last PEN_TAPER.travel units", () => {
    const drawn = { pointer: "pen", pressure: 1, step: 1 } as const;
    const held = widths(40, drawn);
    const lifted = widths(40, { ...drawn, lift: true });
    const tail = lifted.slice(-PEN_TAPER.travel);
    tail.slice(1).forEach((w, i) => expect(w).toBeLessThan(tail[i]));
    expect(last(lifted)).toBeCloseTo(PEN_TAPER.dot * last(held));
    expect(lifted.slice(0, -PEN_TAPER.travel)).toEqual(held.slice(0, -PEN_TAPER.travel));
  });

  it("keeps the eraser at its full size", () => {
    expect(widths(8, { tool: "eraser", ms: 0.5 }).every((w) => w === 1)).toBe(true);
  });

  it("curves a sharp corner, turning across several points rather than all at one", () => {
    const stroke = builder();
    const corner = [
      ...Array.from({ length: 8 }, (_, i) => [(i + 1) * 10, 0]),
      ...Array.from({ length: 8 }, (_, i) => [80, (i + 1) * 10]),
    ];
    corner.forEach(([x, y], i) => stroke.add(x, y, 0.5, (i + 1) * 16));
    stroke.settle(80, 80);
    const points = pointsOf(stroke);
    const heading = (i: number) =>
      Math.atan2(points[i + 1][1] - points[i][1], points[i + 1][0] - points[i][0]);
    const turns = points.slice(2).map((_, i) => Math.abs(heading(i + 1) - heading(i)));
    expect(Math.max(...turns)).toBeLessThanOrEqual(CORNER_TURN);
    // Still through the corner, and on to where it ends.
    expect(points).toContainEqual([80, 0]);
    expect(points.at(-1)).toEqual([80, 80]);
  });

  it("rounds a circle drawn in few samples: nothing it paints strays further from it than the curve's flatness", () => {
    const [samples, radius] = [30, 60];
    const around = (i: number) => {
      const angle = (2 * Math.PI * i) / samples;
      return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
    };
    const stroke = builder({ x: radius, y: 0 });
    for (let i = 1; i <= samples; i++) stroke.add(...around(i), 0.5, i * 16);
    stroke.settle(...around(samples));
    const points = pointsOf(stroke);
    // Each point, and each chord's middle, where a straight capsule strays most.
    const strays = points.flatMap(([x, y], i) => {
      const [px, py] = points[Math.max(0, i - 1)];
      return [Math.hypot(x, y), Math.hypot((x + px) / 2, (y + py) / 2)].map((r) =>
        Math.abs(r - radius),
      );
    });
    expect(Math.max(...strays)).toBeLessThanOrEqual(CURVE_FLATNESS);
  });

  it("holds back what settling at the newest point would add, and nothing once settled", () => {
    for (let n = 1; n <= WAVE.length; n++) {
      const stroke = wave(n, true);
      const held = [...stroke.provisional()];
      const settledTo = stroke.op.pts.length;
      stroke.settle(...WAVE[n - 1]);
      expect(held.length).toBeGreaterThan(0);
      expect(held).toEqual(stroke.op.pts.slice(settledTo));
      expect(stroke.provisional()).toEqual([]);
    }
  });

  it("draws the same stroke whether or not its held-back points were asked for", () => {
    const [asked, never] = [wave(WAVE.length, true), wave(WAVE.length, false)];
    for (const stroke of [asked, never]) stroke.settle(...WAVE[WAVE.length - 1]);
    expect(asked.op).toEqual(never.op);
  });

  it("skips points within half a pixel of the last", () => {
    const stroke = builder();
    expect(stroke.add(0.3, 0.3, 0.5, 16)).toBe(false);
    expect(stroke.add(0.6, 0, 0.5, 32)).toBe(true);
    stroke.settle(0.6, 0);
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
          settled(
            widths(40, { pointer: "pen", pressure: 0.5, pressureVaries: false, response, ms }),
          ),
        ).toEqual(settled(widths(40, { pointer: "touch", ms })));
    // Landing at no pressure is no reading, so it's no move either.
    const unread = (i: number) => (i === 0 ? 0 : 0.5);
    expect(
      settled(widths(40, { pointer: "pen", pressure: unread, pressureVaries: false, ms: 1000 })),
    ).toEqual(settled(widths(40, { pointer: "touch", ms: 1000 })));
    // Once its pressure moves, pressure sets the width.
    const moving = { pointer: "pen", ms: 0.5, pressureVaries: false } as const;
    expect(last(widths(40, { ...moving, pressure: (i) => (i < 5 ? 0.5 : 1) }))).toBeCloseTo(
      last(widths(40, { pointer: "pen", ms: 0.5, pressure: 1 })),
    );
  });

  it("starts a pen known to sense pressure at its first reading's width when it lands reporting none", () => {
    // Safari can report no pressure for a Pencil's landing.
    const unread = widths(40, { pointer: "pen", pressure: (i) => (i === 0 ? 0 : 0.1) });
    expect(unread).toEqual(widths(40, { pointer: "pen", pressure: 0.1 }));
  });

  it("shows a pen's change of pressure in full by its second sample, once past its taper in", () => {
    const STEP = 20;
    const stepped = widths(40, { pointer: "pen", pressure: (i) => (i < STEP ? 0.2 : 0.9) });
    expect(stepped[STEP + 1]).toBeCloseTo(penWidth(0.9));
  });

  it("draws wider at one pressure under Light than Normal, and Normal than Firm, and the brush's own size under Off", () => {
    // Under a half press and past it.
    for (const pressure of [0.3, 0.8]) {
      const at = (response: PenPressure) => penWidth(pressure, response);
      expect(at("light")).toBeGreaterThan(at("normal"));
      expect(at("normal")).toBeGreaterThan(at("firm"));
    }
    const off = (pressure: Drawn["pressure"], ms: number, pressureVaries: boolean) =>
      widths(40, { pointer: "pen", pressure, ms, pressureVaries, response: "off" });
    expect(off((i) => i / 40, 0.5, true)).toEqual(off(0.5, 1000, false));
    expect(last(off(0.5, 1000, false))).toBe(1);
  });
});
