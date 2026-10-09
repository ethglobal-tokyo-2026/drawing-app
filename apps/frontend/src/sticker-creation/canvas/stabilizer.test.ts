import { describe, expect, it } from "vitest";
import { StrokeBuilder } from "./brush";
import { STRIDE } from "./ops";
import { CATCH_UP_FRAMES, FIRST_SMOOTHING, SMOOTH_WINDOW_MS, Stabilizer } from "./stabilizer";

/** ms between an Apple Pencil's samples. */
const SAMPLE_MS = 1000 / 240;
/** Smoothing's ends. */
const RAW = 0;
const SMOOTH = 100;
/** The most a jittery sample strays from the line it's drawn along, in sheet units. */
const JITTER = 1.5;
/** Smooth keeps a jittery line at least this many times closer to its true line than Raw does. */
const STEADIER = 2;
/** The most a whole-pixel circle's line may turn at any point at the first Smoothing, in radians. */
const STAIRCASE_TURN = Math.PI / 9;
/** A Raw line stores at most this many points per sample: its curve adds few between them. */
const POINTS_PER_SAMPLE = 1.5;
/** A circle's radius in sheet units, drawn in this many samples: one turn in a second. */
const CIRCLE_RADIUS = 40;
const CIRCLE_SAMPLES = 240;
/** Closer than this, in sheet units, the line is on the nib: the average of samples there rounds. */
const ON_NIB = 1e-9;

type Point = [number, number];

/** Numbers from 0 to 1, the same ones every run (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` samples along the row y = 0, `step` units apart, each strayed up to `JITTER` off it. */
function jitteryRow(count: number, step: number, seed: number): Point[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, i) => [i * step, (random() * 2 - 1) * JITTER]);
}

/** A pen stroke through `samples`, `SAMPLE_MS` apart, at `smoothing`, lifting on the last: its points. */
function drawn(samples: Point[], smoothing: number): Point[] {
  const [[x0, y0], ...rest] = samples;
  const stabilizer = new Stabilizer(x0, y0, 0, smoothing);
  const stroke = new StrokeBuilder({
    tool: "brush",
    color: "#000000",
    size: 6,
    x: x0,
    y: y0,
    t: 0,
    T: 0,
    pressure: 0.5,
    pointerType: "pen",
    pressureVaries: false,
    response: "normal",
  });
  rest.forEach(([x, y], i) => {
    const t = (i + 1) * SAMPLE_MS;
    stroke.add(...stabilizer.add(x, y, t), 0.5, t);
  });
  const [x, y] = samples[samples.length - 1];
  for (const point of stabilizer.finish(x, y))
    stroke.add(...point, 0.5, samples.length * SAMPLE_MS);
  stroke.settle(x, y);
  const { pts } = stroke.op;
  return Array.from({ length: pts.length / STRIDE }, (_, i) => [
    pts[i * STRIDE],
    pts[i * STRIDE + 1],
  ]);
}

/** A stabilizer at Smooth that has followed a nib along a row, `SAMPLE_MS` apart; and where the nib is. */
function followedRow(): { stabilizer: Stabilizer; nib: Point; t: number } {
  const row = Array.from({ length: 40 }, (_, i): Point => [i * 2, 0]);
  const stabilizer = new Stabilizer(0, 0, 0, SMOOTH);
  row.slice(1).forEach(([x, y], i) => stabilizer.add(x, y, (i + 1) * SAMPLE_MS));
  return { stabilizer, nib: row[row.length - 1], t: (row.length - 1) * SAMPLE_MS };
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** How far the line turns at each point between its first and last, in radians. */
function turnsAlong(points: Point[]): number[] {
  const heading = (i: number) =>
    Math.atan2(points[i + 1][1] - points[i][1], points[i + 1][0] - points[i][0]);
  return points.slice(2).map((_, i) => {
    const turn = heading(i + 1) - heading(i);
    return Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
  });
}

describe("Stabilizer", () => {
  it("keeps a jittery line closer to its true line at Smooth than at Raw", () => {
    const row = jitteryRow(150, 2, 7);
    const strays = (smoothing: number) => mean(drawn(row, smoothing).map(([, y]) => Math.abs(y)));
    // Even through jitter, the curve between samples adds few points to keep.
    expect(drawn(row, RAW).length).toBeLessThanOrEqual(POINTS_PER_SAMPLE * row.length);
    expect(strays(SMOOTH) * STEADIER).toBeLessThan(strays(RAW));
    expect(strays(FIRST_SMOOTHING)).toBeLessThan(strays(RAW));
  });

  it("starts the line where the nib lands, and moves it with the nib's first sample", () => {
    const [x] = new Stabilizer(10, 20, 0, SMOOTH).add(11, 20, SAMPLE_MS);
    // No dead zone: the line leaves the touch point at once.
    expect(x).toBeGreaterThan(10);
    expect(drawn(jitteryRow(30, 2, 1), SMOOTH)[0]).toEqual(jitteryRow(1, 2, 1)[0]);
  });

  it("catches the line up to a nib that pauses: within the window's samples while it samples, within its catch-up frames while it doesn't", () => {
    /** How many steps it takes the line to reach the nib. */
    const stepsToNib = (nib: Point, step: () => [number, number]) => {
      for (let steps = 1; steps <= 1000; steps++) {
        const [x, y] = step();
        if (Math.hypot(x - nib[0], y - nib[1]) < ON_NIB) return steps;
      }
      return Infinity;
    };
    const sampling = followedRow();
    let t = sampling.t;
    const samples = stepsToNib(sampling.nib, () =>
      sampling.stabilizer.add(...sampling.nib, (t += SAMPLE_MS)),
    );
    expect(samples).toBeLessThanOrEqual(Math.ceil(SMOOTH_WINDOW_MS.slow / SAMPLE_MS));
    const still = followedRow();
    expect(stepsToNib(still.nib, () => still.stabilizer.hold())).toBeLessThanOrEqual(
      CATCH_UP_FRAMES,
    );
  });

  it("ends the stroke on the lift point, whatever the Smoothing", () => {
    const row = jitteryRow(60, 3, 3);
    for (const smoothing of [RAW, FIRST_SMOOTHING, SMOOTH])
      expect(drawn(row, smoothing).at(-1)).toEqual(row.at(-1));
  });

  it("rounds a circle a browser gave in whole pixels, at the Smoothing a fresh sheet starts at", () => {
    // One slow turn at a Pencil's rate, each sample rounded as WebKit can round them: a staircase.
    const circle = Array.from({ length: CIRCLE_SAMPLES + 1 }, (_, i): Point => {
      const angle = (2 * Math.PI * i) / CIRCLE_SAMPLES;
      return [
        Math.round(100 + CIRCLE_RADIUS * Math.cos(angle)),
        Math.round(100 + CIRCLE_RADIUS * Math.sin(angle)),
      ];
    });
    const steepest = (smoothing: number) => Math.max(...turnsAlong(drawn(circle, smoothing)));
    // Averaging takes the steps out, where Raw turns square at each.
    expect(steepest(FIRST_SMOOTHING)).toBeLessThanOrEqual(STAIRCASE_TURN);
  });

  it("draws through every sample at Raw", () => {
    const row = jitteryRow(40, 3, 11);
    const points = drawn(row, RAW);
    for (const sample of row) expect(points).toContainEqual(sample);
  });
});
