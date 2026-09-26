import { describe, expect, it } from "vitest";
import type { PerformanceSummary, SlowFrame } from "./performanceRecorder";
import { formatPerformanceReport, formatSummaryLine } from "./performanceReport";

const summary: PerformanceSummary = {
  startedAt: 1000,
  recordedMs: 192_000,
  frames: 11_520,
  slow: 212,
  worst: { ms: 184, at: 65_200, screen: "Send gratitude" },
  typicalMs: 16.7,
  byScreen: new Map([
    ["Sticker Board", { frames: 6120, slow: 32 }],
    ["Send gratitude", { frames: 5400, slow: 180 }],
  ]),
};
const slowFrame: SlowFrame = {
  start: 65_200,
  end: 65_384,
  typicalMs: 16.7,
  screen: "Send gratitude",
  ours: { light: { ms: 0.5, calls: 1 }, gratitude: { ms: 11.9, calls: 3 } },
  events: [
    { at: 64_990, ms: 0, kind: "tap", detail: 'pointerdown button "Send gratitude to @alice"' },
    { at: 65_150, ms: 0, kind: "light", detail: "write to 3 resins" },
    { at: 65_195, ms: 0, kind: "light", detail: "write to 3 resins" },
    { at: 65_210, ms: 0, kind: "gratitude", detail: "tier-up オーバーヒート" },
  ],
};
const report = (over: Partial<PerformanceSummary> = {}) =>
  formatPerformanceReport({
    summary: { ...summary, ...over },
    slowFrames: [slowFrame],
    takenAt: new Date(Date.UTC(2026, 8, 26, 9, 4, 5)),
    device: "iPhone Line/15.14.0",
  });

describe("the performance report", () => {
  it("sums up the recording: its time, the slow share, the worst frame, the pace and each screen", () => {
    const text = report();
    expect(text).toContain("3m 12s recorded · 11,520 frames · 212 slow (1.8%)");
    expect(text).toContain("Worst 184ms at 1:04.2 on Send gratitude");
    expect(text).toContain("Typical frame 16.7ms (60 fps)");
    expect(text).toContain(
      "  Send gratitude: 180 of 5,400 (3.3%)\n  Sticker Board: 32 of 6,120 (0.5%)",
    );
    expect(text).not.toContain("Low Power Mode");
  });

  it("names 30 fps as Low Power Mode or throttling", () => {
    expect(report({ typicalMs: 33.4 })).toContain("30 fps: Low Power Mode or throttling");
  });

  it("lists a slow frame with our work in it and what happened around it, repeats counted", () => {
    expect(report()).toContain(
      [
        "1:04.2 Send gratitude: 184ms (typical 16.7ms)",
        "  ours 12.4ms: gratitude 11.9ms (3 calls), light 0.5ms (1 call)",
        '  -210ms tap: pointerdown button "Send gratitude to @alice"',
        "  -50ms light: write to 3 resins ×2",
        "  +10ms gratitude: tier-up オーバーヒート",
      ].join("\n"),
    );
  });

  it("says how many slow frames it lists of all of them", () => {
    expect(report()).toContain("The latest 1 of 212 slow frames, oldest first");
  });
});

describe("the slip's summary line", () => {
  it("gives the time, the slow frames, the worst and the pace", () => {
    expect(formatSummaryLine(summary)).toBe(
      "3m 12s · 212 slow of 11,520 frames (1.8%) · worst 184ms · 60 fps",
    );
  });
});
