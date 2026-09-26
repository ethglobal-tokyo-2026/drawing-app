import { describe, expect, it } from "vitest";
import { createShakeDetector, type ShakeRules } from "./shakeDetector";
import { createStrokeDetector, type StrokePass, type StrokeRules } from "./strokeDetector";

const STROKE: StrokeRules = { minRunPx: 40, fastPxPerMs: 0.38, turnPx: 12, pauseMs: 900 };
const SHAKE: ShakeRules = { deadZone: 6, minPeak: 11, minGapMs: 60, maxGapMs: 480, resetMs: 650 };

/**
 * A thumb stroking up and down `runs` times over `span` px, `msPerRun` each, sampled every 8 ms.
 * `forced`, as a replay passes it, goes with every move.
 */
function stroke(
  runs: number,
  { span = 120, msPerRun = 125, from = 0, forced = null as boolean | null } = {},
) {
  const detector = createStrokeDetector(STROKE);
  const passes: StrokePass[] = [];
  detector.fingerDown(200, 300, from);
  for (let t = 0; t <= runs * msPerRun + 60; t += 8) {
    const phase = Math.min(t / msPerRun, runs + 0.5);
    const y = 300 - span * (phase % 2 < 1 ? phase % 1 : 1 - (phase % 1));
    const pass = detector.fingerMove(200, y, from + t, forced);
    if (pass) passes.push(pass);
  }
  return { detector, passes };
}

describe("createStrokeDetector", () => {
  it("unlocks after five fast passes, and not after four", () => {
    expect(stroke(5).detector.fastStreak).toBe(5);
    expect(stroke(4).detector.fastStreak).toBe(4);
  });

  it("counts strokes in any direction", () => {
    const detector = createStrokeDetector(STROKE);
    detector.fingerDown(100, 100, 0);
    let last: StrokePass | null = null;
    for (let t = 0; t <= 5 * 125 + 60; t += 8) {
      const phase = Math.min(t / 125, 5.5);
      const k = phase % 2 < 1 ? phase % 1 : 1 - (phase % 1);
      last = detector.fingerMove(100 + 90 * k, 100 + 90 * k, t) ?? last;
    }
    expect(last?.fastStreak).toBe(5);
  });

  it("breaks the streak on a slow pass", () => {
    const { passes } = stroke(4, { msPerRun: 500 });
    expect(passes.every((p) => !p.fast && p.fastStreak === 0)).toBe(true);
  });

  it("breaks the streak on a pause", () => {
    const detector = createStrokeDetector(STROKE);
    detector.fingerDown(200, 300, 0);
    for (let t = 0; t <= 3 * 125 + 60; t += 8) {
      const phase = Math.min(t / 125, 3.5);
      detector.fingerMove(200, 300 - 120 * (phase % 2 < 1 ? phase % 1 : 1 - (phase % 1)), t);
    }
    expect(detector.fastStreak).toBe(3);
    detector.fingerMove(200, 300, 2000);
    expect(detector.fastStreak).toBe(0);
  });

  it("ends a fast pass wherever a replay says one ended, turned back or not", () => {
    const detector = createStrokeDetector(STROKE);
    detector.fingerDown(200, 300, 0);
    // Slow and still going: nothing ends by itself.
    expect(detector.fingerMove(200, 280, 100, null)).toBeNull();
    expect(detector.fingerMove(200, 260, 200, true)).toMatchObject({
      fast: true,
      fastStreak: 1,
      end: { x: 200, y: 260 },
    });
    // The next run starts where the forced one ended.
    expect(detector.fingerMove(200, 300, 260, true)).toMatchObject({
      fastStreak: 2,
      dy: 40,
      end: { x: 200, y: 300 },
    });
  });

  it("ends only slow passes where a replay says no fast one ended", () => {
    const { detector, passes } = stroke(5, { forced: false });
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((p) => !p.fast)).toBe(true);
    expect(detector.fastStreak).toBe(0);
  });
});

/** Samples of a sideways shake at `hz` and `peak` m/s², every 16 ms for `ms`. */
function shake(hz: number, peak: number, ms: number) {
  const detector = createShakeDetector(SHAKE);
  let top = 0;
  for (let t = 0; t <= ms; t += 16) {
    const reversal = detector.addMotionSample(peak * Math.sin((t / 1000) * 2 * Math.PI * hz), 0, t);
    if (reversal) top = Math.max(top, reversal.run);
  }
  return top;
}

describe("createShakeDetector", () => {
  it("counts a hard rhythmic shake past sixteen reversals", () => {
    expect(shake(4.4, 17, 4000)).toBeGreaterThanOrEqual(16);
  });

  it("ignores a slow sway and a soft wobble", () => {
    expect(shake(0.8, 17, 4000)).toBe(0);
    expect(shake(4.4, 8, 4000)).toBe(0);
  });

  it("ignores a single jolt", () => {
    const detector = createShakeDetector(SHAKE);
    const samples = [0, 20, -18, 0, 0, 0].map((a, i) => detector.addMotionSample(a, 0, i * 16));
    expect(samples.filter((r) => r && r.run > 1)).toHaveLength(0);
  });
});
