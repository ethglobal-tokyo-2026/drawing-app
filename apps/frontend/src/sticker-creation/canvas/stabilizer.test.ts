import { describe, expect, it } from "vitest";
import { seededRandom } from "../../ui/seededRandom";
import { FIRST_SMOOTHING, filterTuning, Stabilizer } from "./stabilizer";

/** ms between an Apple Pencil's samples, and between a display's frames. */
const SAMPLE_MS = 1000 / 240;
const FRAME_MS = 1000 / 60;
/** Smoothing's ends. */
const RAW = 0;
const SMOOTH = 100;
/** A slow, careful line's step between samples, in sheet units. */
const SLOW_STEP = 0.2;
/** The most a jittery sample strays from the line it's drawn along, in sheet units. */
const JITTER = 1.5;
/** Smooth keeps a slow jittery line at least this many times closer to its true line than Raw does. */
const STEADIER = 2;
/** Steady nib speeds, in sheet units per ms, from a slow hand to a flick. */
const SPEEDS = [0.05, 0.2, 0.5, 1, 2, 4];
/** A flick's line trails by under one this-many-th of a slow hand's time. */
const QUICKER = 2;
/** Long enough at a steady speed for the filter's estimate of it to settle. */
const STEADY_SAMPLES = 480;

type Point = [number, number];

/** `count` samples along the row y = 0, `step` units apart, each strayed up to `JITTER` off it. */
function jitteryRow(count: number, step: number, seed: number): Point[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => [i * step, (random() * 2 - 1) * JITTER]);
}

/** A stabilizer led through `samples`, `SAMPLE_MS` apart, from the first; where the line went. */
function follow(samples: Point[], smoothing: number) {
  const [[x0, y0], ...rest] = samples;
  const stabilizer = new Stabilizer(x0, y0, 0, smoothing);
  const line = rest.map(([x, y], i) => stabilizer.add(x, y, (i + 1) * SAMPLE_MS));
  return { stabilizer, line, t: rest.length * SAMPLE_MS };
}

/** A nib moving along y = 0 at `speed` units per ms, long enough for the filter to settle on it. */
const steadyRow = (speed: number): Point[] =>
  Array.from({ length: STEADY_SAMPLES }, (_, i) => [i * speed * SAMPLE_MS, 0]);

/** How far the line trails a nib moving steadily at `speed` units per ms, in sheet units. */
function steadyGap(smoothing: number, speed: number): number {
  const row = steadyRow(speed);
  const { line } = follow(row, smoothing);
  return row[row.length - 1][0] - line[line.length - 1][0];
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

describe("Stabilizer", () => {
  it("smooths a slow stroke's jitter, more the higher the Smoothing", () => {
    const row = jitteryRow(600, SLOW_STEP, 7);
    const strays = (smoothing: number) =>
      mean(follow(row, smoothing).line.map(([, y]) => Math.abs(y)));
    expect(strays(SMOOTH) * STEADIER).toBeLessThan(strays(RAW));
    expect(strays(SMOOTH)).toBeLessThan(strays(FIRST_SMOOTHING));
    expect(strays(FIRST_SMOOTHING)).toBeLessThan(strays(RAW));
  });

  it("lets a quick stroke's line trail by less time than a slow one's, and never further than its tuning bounds", () => {
    for (const smoothing of [FIRST_SMOOTHING, SMOOTH]) {
      const tuning = filterTuning(smoothing);
      if (!tuning) throw new Error(`Smoothing ${smoothing} has no filter`);
      // A low-pass trails a steady nib by speed / (2π × cutoff); the cutoff grows by beta × speed.
      const bound = 1 / (2 * Math.PI * tuning.beta);
      const lagsMs = SPEEDS.map((speed) => steadyGap(smoothing, speed) / speed);
      lagsMs.slice(1).forEach((lag, i) => expect(lag).toBeLessThan(lagsMs[i]));
      expect(lagsMs[lagsMs.length - 1] * QUICKER).toBeLessThan(lagsMs[0]);
      for (const speed of SPEEDS) expect(steadyGap(smoothing, speed)).toBeLessThan(bound);
    }
  });

  it("leaves the nib's samples as they are at Raw", () => {
    const row = jitteryRow(40, 3, 11);
    const { stabilizer, line } = follow(row, RAW);
    expect(line).toEqual(row.slice(1));
    expect(stabilizer.settled).toBe(true);
  });

  it("starts the line where the nib lands, and moves it with the nib's first sample", () => {
    const [x] = new Stabilizer(10, 20, 0, SMOOTH).add(11, 20, SAMPLE_MS);
    // No dead zone: the line leaves the touch point at once.
    expect(x).toBeGreaterThan(10);
  });

  it("glides the line to a nib that stops, closer each frame, and lands on it", () => {
    const row = steadyRow(SLOW_STEP / SAMPLE_MS);
    const { stabilizer, line, t } = follow(row, SMOOTH);
    const nib = row[row.length - 1];
    const gaps = [nib[0] - line[line.length - 1][0]];
    for (let frame = 1; !stabilizer.settled; frame++)
      gaps.push(nib[0] - stabilizer.hold(t + frame * FRAME_MS)[0]);
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThan(gaps[i]));
    expect(gaps.at(-1)).toBe(0);
  });

  it("ends the stroke on the lift point, whatever the Smoothing, at times that never run back", () => {
    const row = jitteryRow(60, 3, 3);
    const lift: Point = [200, 10];
    for (const smoothing of [RAW, FIRST_SMOOTHING, SMOOTH]) {
      const { stabilizer, t } = follow(row, smoothing);
      const way = stabilizer.finish(...lift);
      expect(way.at(-1)?.slice(0, 2)).toEqual(lift);
      const times = [t, ...way.map(([, , time]) => time)];
      times.slice(1).forEach((time, i) => expect(time).toBeGreaterThanOrEqual(times[i]));
    }
  });
});
