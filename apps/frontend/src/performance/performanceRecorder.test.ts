import { describe, expect, it } from "vitest";
import { createPerformanceLog, SLOW_FRAMES_KEPT, type PerformanceLog } from "./performanceRecorder";

const FRAME = 16.7;
const steady = (n: number, ms = FRAME) => Array.from({ length: n }, () => ms);

/** Frames for a log on a clock from 0: `run` plays intervals and returns when the last frame began. */
function framesFor(log: PerformanceLog) {
  let t = 0;
  log.frame(t);
  return (intervals: readonly number[]) => {
    for (const ms of intervals) {
      t += ms;
      log.frame(t);
    }
    return t;
  };
}

describe("the performance log", () => {
  it("counts a frame over one and a half typical frames as slow", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([...steady(30), FRAME * 1.4, FRAME * 1.6, ...steady(80)]);
    const [slow, ...others] = log.slowFrames();
    expect(log.summary()).toMatchObject({ frames: 112, slow: 1 });
    expect(slow.end - slow.start).toBeCloseTo(FRAME * 1.6);
    expect(slow.typicalMs).toBeCloseTo(FRAME);
    expect(others).toEqual([]);
  });

  it("takes 30 fps as the typical frame when that's the pace", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run([...steady(30, 33.4), 45, 55, ...steady(60, 33.4)]);
    const summary = log.summary();
    expect(summary.slow).toBe(1);
    expect(summary.typicalMs).toBeCloseTo(33.4);
  });

  it("skips the interval across a hidden page", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run(steady(30));
    log.pageHidden();
    run([5000, ...steady(10)]);
    const summary = log.summary();
    expect(summary).toMatchObject({ frames: 40, slow: 0 });
    expect(summary.recordedMs).toBeCloseTo(FRAME * 40);
  });

  it("keeps what happened from 250ms before a slow frame to its end, even when it's noted late", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    const start = run(steady(60));
    const mark = (offset: number, detail: string, ms = 0) =>
      log.note({ at: start + offset, ms, kind: "mark", detail });
    mark(-6000, "long gone");
    mark(-400, "spans into it", 200);
    mark(-300, "too early");
    mark(-200, "before");
    mark(10, "during");
    run([100]);
    // An observer's entry arrives after the frame it describes.
    mark(50, "noted late");
    mark(120, "after");
    run(steady(90));
    const [slow] = log.slowFrames();
    expect(slow.events.map((e) => e.detail)).toEqual([
      "spans into it",
      "before",
      "during",
      "noted late",
    ]);
  });

  it("keeps our work with the slow frame it was done in", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    run(steady(30));
    log.addOurWork("gratitude", 4);
    log.addOurWork("light", 1);
    log.addOurWork("gratitude", 2);
    run([80]);
    log.addOurWork("gratitude", 9);
    run([FRAME, 80]);
    expect(log.slowFrames().map((f) => f.ours)).toEqual([{ gratitude: 6, light: 1 }, {}]);
  });

  it("keeps the latest slow frames, counts each screen's, and clears", () => {
    const log = createPerformanceLog(0);
    const run = framesFor(log);
    log.setScreen("Sticker Board", 0);
    run(steady(30));
    const extra = 5;
    const starts: number[] = [];
    for (let i = 0; i < SLOW_FRAMES_KEPT + extra; i++)
      starts.push(run([80, ...steady(10)]) - 80 - FRAME * 10);
    log.setScreen("Send gratitude", starts.length);
    run([120, ...steady(10)]);

    const kept = log.slowFrames();
    expect(kept).toHaveLength(SLOW_FRAMES_KEPT);
    expect(kept[0].start).toBeCloseTo(starts[extra + 1]);
    const summary = log.summary();
    expect(summary.slow).toBe(SLOW_FRAMES_KEPT + extra + 1);
    expect(summary.worst).toMatchObject({ ms: 120, screen: "Send gratitude" });
    expect(Object.fromEntries(summary.byScreen)).toEqual({
      "Sticker Board": {
        frames: 30 + (SLOW_FRAMES_KEPT + extra) * 11,
        slow: SLOW_FRAMES_KEPT + extra,
      },
      "Send gratitude": { frames: 11, slow: 1 },
    });

    log.clear(5000);
    expect(log.summary()).toMatchObject({ startedAt: 5000, frames: 0, slow: 0, worst: null });
    expect(log.slowFrames()).toEqual([]);
  });
});
