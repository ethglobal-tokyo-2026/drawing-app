import { describe, expect, it } from "vitest";
import { StrokeBuilder } from "./brush";
import { STRIDE } from "./ops";
import { FIRST_SMOOTHING, SMOOTH_WINDOW_MS, Stabilizer } from "./stabilizer";

/** ms between an Apple Pencil's samples. */
const SAMPLE_MS = 1000 / 240;
/** ms between a mouse's samples, and between a display's frames. */
const MOUSE_MS = 1000 / 60;
const FRAME_MS = 1000 / 60;
/** A slow nib's step between samples, in sheet units: slow enough for the whole slow window. */
const SLOW_STEP = 0.2;
/** Enough samples to fill the slowest window, with some to spare. */
const ROW_SAMPLES = 2 * Math.ceil(SMOOTH_WINDOW_MS.slow / SAMPLE_MS);
/** A slow stroke's lag at Smooth is within this share of a third of the window, its weights' mean age. */
const LAG_BAND = 0.1;
/** A slow stroke's lag at the first Smoothing, in ms: a steady hand's, as Clip Studio's daily settings give. */
const FIRST_LAG_MS = { least: 10, most: 20 } as const;
/** Steady nib speeds, in sheet units per ms, from a slow hand to a flick. */
const SPEEDS = Array.from({ length: 40 }, (_, i) => (i + 1) * 0.05);
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

/**
 * A stabilizer that has followed a nib along a row, `step` units each `SAMPLE_MS`, long enough to
 * fill its window; and where the nib is, and when.
 */
function followedRow(step: number, smoothing = SMOOTH) {
  const row = Array.from({ length: ROW_SAMPLES }, (_, i): Point => [i * step, 0]);
  const stabilizer = new Stabilizer(0, 0, 0, smoothing);
  let line: Point = [0, 0];
  row.slice(1).forEach(([x, y], i) => (line = stabilizer.add(x, y, (i + 1) * SAMPLE_MS)));
  return { stabilizer, line, nib: row[row.length - 1], t: (row.length - 1) * SAMPLE_MS };
}

const gapTo = (nib: Point, [x, y]: Point) => Math.hypot(x - nib[0], y - nib[1]);

/** How far the line trails a nib moving steadily at `speed` units per ms, in sheet units. */
function steadyGap(smoothing: number, speed: number): number {
  const { line, nib } = followedRow(speed * SAMPLE_MS, smoothing);
  return gapTo(nib, line);
}

/** How long the line trails a slow nib, in ms. */
const slowLagMs = (smoothing: number) =>
  steadyGap(smoothing, SLOW_STEP / SAMPLE_MS) / (SLOW_STEP / SAMPLE_MS);

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

  it("glides the line to a nib that pauses over the window's time, frame by frame, and reaches one that keeps sampling within the window", () => {
    const { stabilizer, nib, t } = followedRow(SLOW_STEP);
    const gaps: number[] = [];
    for (let frame = 1; frame * FRAME_MS <= SMOOTH_WINDOW_MS.slow; frame++)
      gaps.push(gapTo(nib, stabilizer.hold(t + frame * FRAME_MS)));
    gaps.push(gapTo(nib, stabilizer.hold(t + SMOOTH_WINDOW_MS.slow)));
    // Each frame closer, and on the nib once the window has passed.
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThan(gaps[i]));
    expect(gaps.at(-1)).toBeLessThan(ON_NIB);
    expect(stabilizer.settled).toBe(true);
    const halfway = followedRow(SLOW_STEP);
    const half = halfway.stabilizer.hold(halfway.t + SMOOTH_WINDOW_MS.slow / 2);
    expect(gapTo(halfway.nib, half)).toBeGreaterThan(ON_NIB);

    const sampling = followedRow(SLOW_STEP);
    let time = sampling.t;
    let samples = 0;
    while (
      gapTo(sampling.nib, sampling.stabilizer.add(...sampling.nib, (time += SAMPLE_MS))) >= ON_NIB
    )
      samples++;
    expect(samples).toBeLessThanOrEqual(Math.ceil(SMOOTH_WINDOW_MS.slow / SAMPLE_MS));
  });

  it("leaves the line where its samples put it through frames that bring none, as a mouse's do on a faster display", () => {
    const row = jitteryRow(80, 2, 5);
    const steady = new Stabilizer(...row[0], 0, SMOOTH);
    const framed = new Stabilizer(...row[0], 0, SMOOTH);
    row.slice(1).forEach(([x, y], i) => {
      const t = (i + 1) * MOUSE_MS;
      framed.hold(t - MOUSE_MS / 2);
      expect(framed.add(x, y, t)).toEqual(steady.add(x, y, t));
    });
  });

  it("lags a slow stroke by a third of its window at Smooth, and by a steady hand's at the first Smoothing", () => {
    expect(Math.abs(slowLagMs(SMOOTH) / (SMOOTH_WINDOW_MS.slow / 3) - 1)).toBeLessThan(LAG_BAND);
    const first = slowLagMs(FIRST_SMOOTHING);
    expect(first).toBeGreaterThanOrEqual(FIRST_LAG_MS.least);
    expect(first).toBeLessThanOrEqual(FIRST_LAG_MS.most);
  });

  it("never closes the line's gap on its nib as the nib speeds up, so a quickening stroke doesn't lurch", () => {
    for (const smoothing of [FIRST_SMOOTHING, SMOOTH]) {
      const gaps = SPEEDS.map((speed) => steadyGap(smoothing, speed));
      gaps.slice(1).forEach((gap, i) => expect(gap).toBeGreaterThanOrEqual(gaps[i]));
    }
  });

  it("ends the stroke on the lift point, whatever the Smoothing", () => {
    const row = jitteryRow(60, 3, 3);
    for (const smoothing of [RAW, FIRST_SMOOTHING, SMOOTH])
      expect(drawn(row, smoothing).at(-1)).toEqual(row.at(-1));
    // Lifting mid-stroke, the line's way there ends on the lift point too.
    const { stabilizer, nib } = followedRow(SLOW_STEP);
    expect(stabilizer.finish(...nib).at(-1)).toEqual(nib);
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
