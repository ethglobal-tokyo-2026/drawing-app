import { describe, expect, it } from "vitest";
import { STRIDE, type FillOp, type Op, type StrokeOp } from "../../sticker-creation/canvas/ops";
import { KYOTO_SEIKA_TIME_USED_S } from "@drawing-app/api/client";
import {
  KYOTO_SEIKA_MAX_LENGTH_MS,
  MAX_FILL_REVEAL_MS,
  MAX_FILL_SHARE,
  MAX_IDLE_MS,
  MAX_LENGTH_MS,
  MAX_POINT_STEP_MS,
  MIN_FILL_REVEAL_MS,
  MIN_LENGTH_MS,
  SPEEDUP,
  playbackDone,
  scheduleTimelapse,
  startOfPlayback,
  stepsDue,
  type ScheduledFill,
  type ScheduledStroke,
  type TimelapseSchedule,
} from "./timelapseSchedule";

/** A brush stroke begun `T` ms into the session, with a point at each of `ms` ms after it began. */
const stroke = (T: number, ms: readonly number[]): StrokeOp => ({
  tool: "brush",
  color: "#1c1824",
  T,
  pts: ms.flatMap((t, i) => [10 + i, 20, 4, t]),
});
/** Point times every `step` ms for `ms` ms: a steady hand that never holds still. */
const steady = (ms: number, step = 16) =>
  Array.from({ length: Math.floor(ms / step) + 1 }, (_, i) => i * step);
const fill = (T: number): FillOp => ({ tool: "fill", color: "#ff7eb6", x: 5, y: 5, T });
const pointCount = (op: StrokeOp) => op.pts.length / STRIDE;

const schedule = (ops: Op[], reduced = false, kyotoSeika = false) =>
  scheduleTimelapse(ops, { reduced, kyotoSeika });
const strokes = (s: TimelapseSchedule) =>
  s.ops.filter((o): o is ScheduledStroke => o.kind === "stroke");
const fills = (s: TimelapseSchedule) => s.ops.filter((o): o is ScheduledFill => o.kind === "fill");
const lastPoint = (o: ScheduledStroke) => o.at.at(-1) ?? Number.NaN;
/** Playback ms per drawn ms, read off the first stroke's first step, drawn `step` ms long. */
const speedOf = (s: TimelapseSchedule, step: number) => {
  const [first] = strokes(s);
  return (first.at[1] - first.at[0]) / step;
};

describe("a timelapse's schedule", () => {
  it.each([
    ["a quick doodle", 1_000, MIN_LENGTH_MS],
    ["a minute of drawing", 60_000, 60_000 / SPEEDUP],
    ["three minutes of drawing", 180_000, MAX_LENGTH_MS],
  ])("plays %s SPEEDUP times faster, within the length's bounds", (_, drawnMs, length) => {
    expect(schedule([stroke(0, steady(drawnMs))]).length).toBeCloseTo(length, 6);
  });

  it("plays every point at one speed, so strokes keep their shapes and their pace", () => {
    const drawn = [steady(900), steady(300, 30), steady(600, 8)];
    const s = schedule(drawn.map((ms, i) => stroke(i * 1_500, ms)));
    const speeds = strokes(s).flatMap((o, i) =>
      o.at.slice(1).map((at, p) => (at - o.at[p]) / (drawn[i][p + 1] - drawn[i][p])),
    );
    expect(Math.max(...speeds)).toBeCloseTo(Math.min(...speeds), 9);
  });

  it("plays a pause of any length as at most MAX_IDLE_MS before the speed-up, and a short one nearly as drawn", () => {
    // The first stroke started the session clock as it landed, so the second begins `gap` after it.
    const pauseAfter = (gap: number) => {
      const s = schedule([stroke(0, steady(2_000)), stroke(gap, steady(2_000))]);
      const [a, b] = strokes(s);
      return (b.at[0] - lastPoint(a)) / speedOf(s, 16);
    };
    const long = pauseAfter(60_000);
    expect(long).toBeCloseTo(MAX_IDLE_MS, 6);
    expect(pauseAfter(5_000)).toBeLessThan(long);
    expect(pauseAfter(40)).toBeGreaterThan(40 * 0.9);
    expect(pauseAfter(40)).toBeLessThanOrEqual(40);
  });

  it("counts a hold inside a stroke as MAX_POINT_STEP_MS", () => {
    const s = schedule([stroke(0, [0, 16, 2_016, 2_032])]);
    const [held] = strokes(s);
    expect((held.at[2] - held.at[1]) / speedOf(s, 16)).toBeCloseTo(MAX_POINT_STEP_MS, 9);
  });

  it("doesn't take the first stroke's time off the pause after it when that stroke started the clock", () => {
    const pauseBefore = (firstT: number) => {
      const [a, b] = strokes(
        schedule([stroke(firstT, steady(1_000)), stroke(firstT + 400, steady(100))]),
      );
      return b.at[0] - lastPoint(a);
    };
    // Stamped 0, it drew before the clock ran; stamped later, its 1s ran on the clock.
    expect(pauseBefore(0)).toBeGreaterThan(0);
    expect(pauseBefore(100)).toBe(0);
  });

  it("gives each fill a reveal between MIN_FILL_REVEAL_MS and MAX_FILL_REVEAL_MS, longer in a longer timelapse", () => {
    const beats = (drawnMs: number) =>
      fills(schedule([stroke(0, steady(drawnMs)), fill(drawnMs + 100), fill(drawnMs + 200)])).map(
        (f) => f.end - f.start,
      );
    const quick = beats(1_000);
    const slow = beats(180_000);
    for (const beat of [...quick, ...slow]) {
      expect(beat).toBeGreaterThanOrEqual(MIN_FILL_REVEAL_MS);
      expect(beat).toBeLessThanOrEqual(MAX_FILL_REVEAL_MS);
    }
    expect(slow[0]).toBeGreaterThan(quick[0]);
  });

  it("fits many fills' reveals into MAX_FILL_SHARE of the length, which they never stretch", () => {
    const many = Array.from({ length: 60 }, (_, i) => fill(180_000 + i * 50));
    const s = schedule([stroke(0, steady(180_000)), ...many]);
    const revealing = fills(s).reduce((sum, f) => sum + f.end - f.start, 0);
    expect(s.length).toBeCloseTo(MAX_LENGTH_MS, 6);
    expect(revealing).toBeLessThanOrEqual(MAX_FILL_SHARE * s.length + 1e-6);
  });

  it("reveals fills at once under reduced motion, giving their time to the strokes", () => {
    const ops = [stroke(0, steady(60_000)), fill(60_100)];
    const played = (reduced: boolean) => {
      const s = schedule(ops, reduced);
      const [line] = strokes(s);
      const [f] = fills(s);
      return { length: s.length, line: lastPoint(line) - line.at[0], reveal: f.end - f.start };
    };
    const reduced = played(true);
    const full = played(false);
    expect(reduced.reveal).toBe(0);
    expect(reduced.length).toBeCloseTo(full.length, 6);
    expect(reduced.line).toBeGreaterThan(full.line);
  });

  it("plays a sticker with no time in it, a dot and a fill, in the fill's reveal alone", () => {
    const s = schedule([stroke(0, [0]), fill(0)]);
    const [f] = fills(s);
    expect(strokes(s)[0].at).toEqual([0]);
    expect(s.length).toBe(f.end - f.start);
  });

  it.each([
    ["a regular sticker", false, MAX_LENGTH_MS],
    ["a sticker drawn in Kyoto Seika Practice Mode", true, KYOTO_SEIKA_MAX_LENGTH_MS],
  ])("plays the longest drawing of %s in at most its length", (_, kyotoSeika, length) => {
    const drawnMs = KYOTO_SEIKA_TIME_USED_S * 1000;
    expect(
      schedule([stroke(0, steady(drawnMs, MAX_POINT_STEP_MS))], false, kyotoSeika).length,
    ).toBeCloseTo(length, 6);
  });

  it("keeps fills' reveals within MAX_FILL_REVEAL_MS in the longer timelapse of a sticker drawn in Kyoto Seika Practice Mode", () => {
    const s = schedule(
      [stroke(0, steady(KYOTO_SEIKA_TIME_USED_S * 1000, MAX_POINT_STEP_MS)), fill(2e6)],
      false,
      true,
    );
    expect(fills(s)[0].end - fills(s)[0].start).toBeLessThanOrEqual(MAX_FILL_REVEAL_MS);
  });
});

describe("what's due each frame", () => {
  const sticker: Op[] = [stroke(0, steady(900)), fill(1_200), stroke(1_500, steady(400, 30))];
  const [first, , last] = sticker;
  if (first.tool === "fill" || last.tool === "fill")
    throw new Error("the sticker starts and ends with strokes");

  it("paints every point once, in order, grows each reveal to whole before moving on, and ends at the length", () => {
    const s = schedule(sticker);
    const cursor = startOfPlayback();
    const points = sticker.map((): number[] => []);
    const reveals: number[] = [];
    const order: number[] = [];
    let t = 0;
    for (; !playbackDone(s, cursor); t += 16) {
      for (const step of stepsDue(s, cursor, t)) {
        order.push(step.index);
        if (step.kind === "reveal") reveals.push(step.progress);
        else for (let p = step.from; p < step.to; p++) points[step.index].push(p);
      }
    }
    expect(points[0]).toEqual([...Array(pointCount(first)).keys()]);
    expect(points[2]).toEqual([...Array(pointCount(last)).keys()]);
    expect(order).toEqual(order.toSorted((a, b) => a - b));
    expect(reveals.length).toBeGreaterThan(1);
    expect(reveals).toEqual(reveals.toSorted((a, b) => a - b));
    expect(reveals.at(-1)).toBe(1);
    // The loop's last frame, at t - 16, finished it: not before the length.
    expect(t - 16).toBeGreaterThanOrEqual(s.length);
    expect(t - 32).toBeLessThan(s.length);
  });

  it("brings in the rest at once, whole, at the end of time", () => {
    const s = schedule(sticker);
    expect(stepsDue(s, startOfPlayback(), Infinity)).toEqual([
      { kind: "stroke", index: 0, op: first, from: 0, to: pointCount(first) },
      { kind: "reveal", index: 1, op: sticker[1], progress: 1 },
      { kind: "stroke", index: 2, op: last, from: 0, to: pointCount(last) },
    ]);
    const midway = startOfPlayback();
    stepsDue(s, midway, strokes(s)[0].at[5]);
    expect(stepsDue(s, midway, Infinity)[0]).toMatchObject({ index: 0, from: 6 });
  });
});
