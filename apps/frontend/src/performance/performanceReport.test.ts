import { describe, expect, it, onTestFinished } from "vitest";
import { i18next } from "../i18n/i18n";
import type { BootMilestone } from "./bootMilestones";
import type {
  FrameWindow,
  PerformanceSummary,
  PointerKindSummary,
  SlowFrame,
} from "./performanceRecorder";
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
  pointers: new Map(),
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
  within = Infinity,
) =>
  formatPerformanceReport({
    summary: { ...summary, ...over },
    slowFrames,
    takenAt: new Date(Date.UTC(2026, 8, 26, 9, 4, 5)),
    device: "iPhone Line/15.14.0",
    start: steps,
    within,
  });

const NOTHING_YET = i18next.t(($) => $.stickerBoard.developer.performance.nothingYet);
const START = i18next.t(($) => $.stickerBoard.developer.performance.lines.start);
const THIRTY_FPS = i18next.t(($) => $.stickerBoard.developer.performance.lines.thirtyFps);
/** The summary's line in the report, as `summary` makes it. */
const RECORDED = i18next.t(($) => $.stickerBoard.developer.performance.lines.recorded, {
  span: "3m 12s",
  frames: "11,520",
  slow: "212",
  share: "1.8%",
});
const latestOf = (kept: number) =>
  i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.latest, {
    kept,
    slow: "212",
  });
const calls = (n: number) =>
  i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.calls, {
    count: n,
    calls: String(n),
  });

describe("the performance report", () => {
  it("sums up the recording: its time, the slow share, the worst frame, the pace and each screen", () => {
    const text = report();
    const byScreen = (screen: string, slow: string, frames: string, share: string) =>
      `  ${i18next.t(($) => $.stickerBoard.developer.performance.lines.byScreen.screen, {
        screen,
        slow,
        frames,
        share,
      })}`;
    expect(text).toContain(RECORDED);
    expect(text).toContain(
      i18next.t(($) => $.stickerBoard.developer.performance.lines.worst, {
        worst: "184ms",
        at: "1:04.2",
        screen: "Send gratitude",
      }),
    );
    expect(text).toContain(
      i18next.t(($) => $.stickerBoard.developer.performance.lines.typical, {
        typical: "16.7ms",
        fps: "60 fps",
      }),
    );
    expect(text).toContain(
      [
        byScreen("Send gratitude", "180", "5,400", "3.3%"),
        byScreen("Sticker Board", "32", "6,120", "0.5%"),
      ].join("\n"),
    );
    expect(text).not.toContain(THIRTY_FPS);
  });

  it("names 30 fps as Low Power Mode or throttling", () => {
    expect(report({ typicalMs: 33.4 })).toContain(THIRTY_FPS);
  });

  it("lists a slow frame with our work in it and what happened around it, repeats counted", () => {
    const ours = i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.ours, {
      ours: "12.4ms",
    });
    expect(report()).toContain(
      [
        i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.frame, {
          at: "1:04.2",
          screen: "Send gratitude",
          interval: "184ms",
          typical: "16.7ms",
        }),
        `  ${ours}: gratitude 11.9ms (${calls(3)}), light 0.5ms (${calls(1)})`,
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
    expect(report()).toContain(latestOf(1));
  });

  it("leaves out the oldest slow frames to fit a limit, and keeps a report that already fits whole", () => {
    const slowFrames = Array.from({ length: 40 }, (_, i) => ({
      ...slowFrame,
      screen: `Screen ${i}`,
    }));
    const whole = report({}, slowFrames);
    expect(report({}, slowFrames, [], whole.length)).toBe(whole);

    const limit = Math.floor(whole.length / 2);
    const fitted = report({}, slowFrames, [], limit);
    const listed = [...fitted.matchAll(/^\S+ Screen (\d+): /gm)].map(([, n]) => Number(n));
    expect(fitted.length).toBeLessThanOrEqual(limit);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.length).toBeLessThan(slowFrames.length);
    expect(listed.at(-1)).toBe(slowFrames.length - 1);
    expect(fitted).toContain(latestOf(listed.length));
  });

  it("tells the open's start step by step, on the page's clock, before the recording", () => {
    const text = report({}, [slowFrame], start);
    expect(text).toContain(
      [
        START,
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
    expect(text.indexOf(START)).toBeLessThan(text.indexOf(RECORDED));
  });

  it("sums up the 5s after the board was complete: the slow ones, the worst and the long tail", () => {
    expect(report({ windows: [afterTheBoard] }, [slowFrame], start)).toContain(
      [
        i18next.t(($) => $.stickerBoard.developer.performance.lines.window.frames, {
          label: "The 5s after the board was complete",
          frames: "300",
          seconds: "4.8s",
        }),
        i18next.t(($) => $.stickerBoard.developer.performance.lines.window.slow, {
          slow: "1",
          share: "0.3%",
        }),
        i18next.t(($) => $.stickerBoard.developer.performance.lines.window.worst, {
          worst: "50ms",
          at: "+0.4s",
        }),
        i18next.t(($) => $.stickerBoard.developer.performance.lines.window.typical, {
          typical: "16.0ms",
          fps: "63 fps",
        }),
        i18next.t(($) => $.stickerBoard.developer.performance.lines.window.percentile95, {
          interval: "16.0ms",
        }),
      ].join(" · "),
    );
  });

  it("says when the board's first seconds weren't recorded", () => {
    const notRecorded = i18next.t(
      ($) => $.stickerBoard.developer.performance.lines.window.boardNotRecorded,
    );
    expect(report({}, [slowFrame], start)).toContain(notRecorded);
    expect(report({}, [slowFrame], [])).not.toContain(notRecorded);
  });

  it("lists each kind of pointer: contacts and hovering, pressure and its landing, contact size and samples a move", () => {
    const pen: PointerKindSummary = {
      downs: 2,
      moves: 400,
      hovers: 57,
      pressure: { min: 0.03, max: 0.97 },
      landing: { min: 0, max: 0.4 },
      width: { min: 0.5, max: 0.5 },
      height: { min: 0.5, max: 0.5 },
      coalesced: { total: 1560, most: 6 },
      predicted: null,
    };
    const hovering = {
      ...pen,
      downs: 0,
      moves: 0,
      pressure: null,
      landing: null,
      width: null,
      height: null,
    };
    const text = report({
      pointers: new Map([
        ["pen", pen],
        ["mouse", hovering],
      ]),
    });
    const counts = (pointer: string, downs: string, moves: string) =>
      i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.counts, {
        pointer,
        downs,
        moves,
        hovers: "57",
      });
    expect(text).toContain(
      [
        i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.title),
        `  ${[
          counts("pen", "2", "400"),
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.pressure, {
            range: "0.03–0.97",
          }),
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.landing, {
            range: "0.00–0.40",
          }),
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.contact, {
            size: "0.5–0.5 × 0.5–0.5px",
          }),
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.perMove, {
            average: "3.9",
            events: "coalesced",
            most: 6,
          }),
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noEvents, {
            events: "predicted",
          }),
        ].join(" · ")}`,
        `  ${counts("mouse", "0", "0")} · ${i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noContact)}`,
      ].join("\n"),
    );
    expect(report()).toContain(
      i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noneSeen),
    );
  });

  it("tells the start even before any frame is recorded", () => {
    const text = report({ frames: 0 }, [], start);
    expect(text).toContain("  2.45s board complete");
    expect(text).toContain(NOTHING_YET);
  });

  it("reads the same while the app is in Japanese, as the server log keeps it", async () => {
    const english = report({ windows: [afterTheBoard] }, [slowFrame], start);
    await i18next.changeLanguage("ja");
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    expect(report({ windows: [afterTheBoard] }, [slowFrame], start)).toBe(english);
  });
});

describe("the slip's summary line", () => {
  it("gives the time, the slow frames, the worst and the pace, or that nothing is recorded yet", () => {
    expect(formatSummaryLine(summary)).toBe(
      [
        "3m 12s",
        i18next.t(($) => $.stickerBoard.developer.performance.summary.slow, {
          slow: "212",
          frames: "11,520",
          share: "1.8%",
        }),
        i18next.t(($) => $.stickerBoard.developer.performance.summary.worst, { worst: "184ms" }),
        "60 fps",
      ].join(" · "),
    );
    expect(formatSummaryLine({ ...summary, frames: 0 })).toBe(NOTHING_YET);
  });
});
