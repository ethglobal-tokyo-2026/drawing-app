import { describe, expect, it } from "vitest";
import type { BootMilestone } from "./bootMilestones";
import type { FrameWindow, PerformanceSummary, SlowFrame } from "./performanceRecorder";
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
  windows: [],
};
const start: BootMilestone[] = [
  { step: "HTML in", at: 310 },
  { step: "JS running", at: 420 },
  { step: "LIFF ready", at: 950 },
  { step: "signed in", at: 1620 },
  { step: "board from this phone", at: 1631, detail: "12 stickers" },
  { step: "first sticker decoded", at: 1702 },
  { step: "board JSON", at: 2010, detail: "12 stickers" },
  { step: "all stickers", at: 2450, detail: "12 stickers, 48 images" },
  { step: "board complete", at: 2451 },
];
/** 300 frames from 2451ms: all 16ms, but for a 50ms one 0.4s in. */
const afterTheBoard: FrameWindow = {
  label: "the 5s after the board was complete",
  from: 2451,
  ms: 5000,
  frames: 300,
  slow: 1,
  worst: { ms: 50, at: 2851 },
  intervals: Array.from({ length: 300 }, (_, i) => (i === 24 ? 50 : 16)),
};
const slowFrame: SlowFrame = {
  start: 65_200,
  end: 65_384,
  typicalMs: 16.7,
  screen: "Send gratitude",
  ours: { light: { ms: 0.5, calls: 1 }, gratitude: { ms: 11.9, calls: 3 } },
  events: [
    { at: 64_990, ms: 0, kind: "tap", detail: 'pointerdown button "Send gratitude to @alice"' },
    { at: 65_180, ms: 0, kind: "light", detail: "write to 3 resins" },
    { at: 65_195, ms: 0, kind: "light", detail: "write to 3 resins" },
    { at: 65_210, ms: 0, kind: "gratitude", detail: "tier-up オーバーヒート" },
  ],
};
const report = (
  over: Partial<PerformanceSummary> = {},
  slowFrames = [slowFrame],
  steps: BootMilestone[] = [],
) =>
  formatPerformanceReport({
    summary: { ...summary, ...over },
    slowFrames,
    takenAt: new Date(Date.UTC(2026, 8, 26, 9, 4, 5)),
    device: "iPhone Line/15.14.0",
    start: steps,
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
        "  -20ms light: write to 3 resins ×2",
        "  +10ms gratitude: tier-up オーバーヒート",
      ].join("\n"),
    );
  });

  it("lists repeats far apart on their own lines, so one just before the frame shows", () => {
    const tap = { ms: 0, kind: "tap", detail: 'pointerdown button "Send"' };
    const events = [
      { ...tap, at: 64_966 },
      { ...tap, at: 65_191 },
    ];
    expect(report({}, [{ ...slowFrame, events }])).toContain(
      ['  -234ms tap: pointerdown button "Send"', '  -9ms tap: pointerdown button "Send"'].join(
        "\n",
      ),
    );
  });

  it("says how many slow frames it lists of all of them", () => {
    expect(report()).toContain("The latest 1 of 212 slow frames, oldest first");
  });

  it("tells the open's start step by step, on the page's clock, before the recording", () => {
    const text = report({}, [slowFrame], start);
    expect(text).toContain(
      [
        "Start, on the page's clock",
        "  0.31s HTML in",
        "  0.42s JS running",
        "  0.95s LIFF ready",
        "  1.62s signed in",
        "  1.63s board from this phone: 12 stickers",
        "  1.70s first sticker decoded",
        "  2.01s board JSON: 12 stickers",
        "  2.45s all stickers: 12 stickers, 48 images",
        "  2.45s board complete",
      ].join("\n"),
    );
    expect(text.indexOf("Start, on the page's clock")).toBeLessThan(text.indexOf("recorded ·"));
  });

  it("sums up the 5s after the board was complete: the slow ones, the worst and the long tail", () => {
    expect(report({ windows: [afterTheBoard] }, [slowFrame], start)).toContain(
      "The 5s after the board was complete: 300 frames in 4.8s · 1 slow (0.3%) · worst 50ms at +0.4s · typical 16.0ms (63 fps) · 95th percentile 16.0ms",
    );
  });

  it("says when the board's first seconds weren't recorded", () => {
    expect(report({}, [slowFrame], start)).toContain(
      "The 5s after the board was complete: not recorded, as the recorder was off then",
    );
    expect(report({}, [slowFrame], [])).not.toContain("after the board was complete");
  });

  it("tells the start even before any frame is recorded", () => {
    const text = report({ frames: 0 }, [], start);
    expect(text).toContain("  2.45s board complete");
    expect(text).toContain("Nothing recorded yet");
  });
});

describe("the slip's summary line", () => {
  it("gives the time, the slow frames, the worst and the pace", () => {
    expect(formatSummaryLine(summary)).toBe(
      "3m 12s · 212 slow of 11,520 frames (1.8%) · worst 184ms · 60 fps",
    );
  });
});
