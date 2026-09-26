# Performance Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A performance recorder on the stat board's developer slip that works inside LINE's in-app browser and says why frames drop, plus the two fixes the findings point at: the light writes only onto the elements that read it, and the board stops painting under the gratitude mini-game.

**Architecture:** A pure frame log (`createPerformanceLog`, clock passed in) judges each requestAnimationFrame interval against the median of the last 120 and keeps the timeline around each slow one. A thin page layer feeds it: one rAF loop, window listeners, `document.fonts` and feature-checked PerformanceObservers, all started and stopped together. The app adds marks with `notePerformance` and times its per-frame callbacks with `timeOurWork`, both a single flag check while off. A pure formatter turns the recording into plain text for the slip's Copy report.

**Tech Stack:** TypeScript 7, React 19, vitest 5 with happy-dom, oxlint, oxfmt, the Playwright MCP tools.

---

## How to use it (for the owner)

1. In LINE, open the app and tap your name to turn the board over to the stat board.
2. On the developer slip, under **Performance**, turn on **Record performance**. It records from then on, and from the app's start every time it opens, until you turn it off.
3. Use the app, or play the gratitude mini-game (**Try the gratitude mini-game** on the same slip).
4. Back on the slip, tap **Copy report** and paste it into the chat. If the phone won't copy, the slip says why and shows the report in a box: select it all and copy that.
5. **Clear** starts the recording over.

**The recording to send:** Full effects on, Record performance on, then use the board for a minute (scroll, open stickers, open the tray), then play three games to 昇天, then Copy report.

## Ground rules

- **Worktree:** `.claude/worktrees/gratitude-mini-game`, branch `design/gratitude-mini-game`. Lanes in one wave run in parallel in it, each owning only its files. An isolated subagent starts with `git switch -c perf/<lane> design/gratitude-mini-game` in its own worktree, and the controller cherry-picks its commits.
- **Commits:** one per task, `git commit -m "<type>: <what>" -- <paths>`, with explicit paths and no trailers; a new file needs `git add <path>` first. Types: feat, fix, docs, refactor, test. If git reports an `index.lock`, wait and retry.
- **The gratitude fix round:** other agents are editing `apps/frontend/src/gratitude/`. Before editing a file there, `git status --short apps/frontend/src/gratitude` must not list it; if it does, wait. Edits in those files are given by anchor text, not line numbers, because the lines move.
- **Checks in a wave**, your own files only: `pnpm --filter frontend exec vitest run <tests>`, `pnpm exec oxlint --type-aware --type-check <files>`, `pnpm exec oxfmt <files>`, and `pnpm --filter frontend typecheck`, where an error in a file you don't own is another lane's work in progress: report it, don't touch it. The full `pnpm check`, the code review and the smoke run happen once, in Task 10.
- **Tests:** vitest. A DOM test opts in with `// @vitest-environment happy-dom` on its first line; happy-dom has no `document.fonts` and runs no Web Animations.
- **Dev server:** `pnpm --filter frontend dev --port <port> --strictPort` (flags after `--` are ignored). It serves LIFF Mock and the API fixtures, so the board has stickers.

## Waves

| Wave  | Lane                 | Tasks | Needs                                                  |
| ----- | -------------------- | ----- | ------------------------------------------------------ |
| 1     | R: the frame log     | 1 → 3 | —                                                      |
| 1     | P: the report        | 2     | — (it imports only types from Task 1's file)           |
| 1     | L: the light readers | 4     | — (its engine step waits for the fix round)            |
| 1     | H: the board hidden  | 5     | — (waits for the fix round on `GratitudeMiniGame.tsx`) |
| 2     | S: the slip and boot | 6     | 2, 3, 4                                                |
| 2     | G: the game's marks  | 7     | 3, 4                                                   |
| 2     | M: the light's marks | 8     | 3, 4                                                   |
| 2     | T: tray and zipper   | 9     | 3                                                      |
| Final | —                    | 10    | all                                                    |

## Files

| File (under `apps/frontend/src/`)                                                                                | Task |
| ---------------------------------------------------------------------------------------------------------------- | ---- |
| Create `performance/performanceRecorder.ts`, `performance/performanceRecorder.test.ts`                           | 1, 3 |
| Create `performance/performanceReport.ts`, `performance/performanceReport.test.ts`                               | 2    |
| Modify `stickers/light.ts`, `stickers/light.test.ts`                                                             | 4, 8 |
| Modify `stickers/LiveResin.tsx`, `stickers/live-resin.css` (comment)                                             | 4    |
| Modify `gratitude/miniGameEngine.ts`                                                                             | 4, 7 |
| Modify `gratitude/miniGameEngine.test.ts`                                                                        | 4    |
| Modify `main.tsx`                                                                                                | 4, 6 |
| Modify `gratitude/GratitudeMiniGame.tsx`, `gratitude/GratitudeMiniGame.test.tsx`                                 | 5    |
| Create `sticker-board/stat-board/PerformanceRecorderControls.tsx`, its test, `performance-recorder-controls.css` | 6    |
| Modify `sticker-board/stat-board/StatBoard.tsx`, and `AGENTS.MD` (repo root)                                     | 6    |
| Modify `gratitude/tierSlamAndPopIns.ts`, `gratitude/gameEndings.ts`                                              | 7    |
| Modify `sticker-board/tray/trayEngine.ts`, `sticker-board/tray/zipper.ts`                                        | 9    |

---

### Task 1: The frame log

The pure core of `performance/performanceRecorder.ts`: no browser, the clock passed in.

**Files:** Create `apps/frontend/src/performance/performanceRecorder.ts`, `apps/frontend/src/performance/performanceRecorder.test.ts`.

- [ ] **Step 1: Write the failing tests** in `performanceRecorder.test.ts`:

```ts
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
```

- [ ] **Step 2: Run them to see them fail:** `pnpm --filter frontend exec vitest run src/performance/performanceRecorder.test.ts`. Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Write `performanceRecorder.ts`:**

```ts
/**
 * The performance recorder, for phones where LINE's browser has no developer tools: every frame's
 * interval, judged against the typical frame, and what happened around each slow one. Off, it costs
 * nothing: no loop, no observers and no listeners, and `notePerformance` and `timeOurWork` return
 * at their first check.
 */

/** Something that happened, on the performance.now() clock. */
interface TimelineEvent {
  at: number;
  /** How long it lasted in ms; 0 for a moment. */
  ms: number;
  kind: string;
  detail: string;
}

/** A frame over `SLOW_FACTOR` typical frames, and what happened around it. */
export interface SlowFrame {
  /** Its interval: when the frame before it began, and when it began. */
  start: number;
  end: number;
  /** The typical frame it was judged against, in ms. */
  typicalMs: number;
  screen: string;
  /** Our own script time in it, in ms by label. */
  ours: Record<string, number>;
  /** What happened from `BEFORE_SLOW_MS` before it to its end, oldest first. */
  events: TimelineEvent[];
}

interface ScreenFrames {
  frames: number;
  slow: number;
}

export interface PerformanceSummary {
  /** When the recording began, on the performance.now() clock. */
  startedAt: number;
  /** The frames' time: the time on screen, without the time the page was hidden. */
  recordedMs: number;
  frames: number;
  slow: number;
  worst: { ms: number; at: number; screen: string } | null;
  /** The median of the latest intervals; 0 before the first. */
  typicalMs: number;
  byScreen: ReadonlyMap<string, ScreenFrames>;
}

export interface PerformanceLog {
  /** A frame began at `now`: the interval since the one before is judged. */
  frame: (now: number) => void;
  /** The page went hidden, so the interval across it is no frame. */
  pageHidden: () => void;
  note: (event: TimelineEvent) => void;
  /** Our own script time, counted in the frame in progress. */
  addOurWork: (label: string, ms: number) => void;
  setScreen: (screen: string, at: number) => void;
  summary: () => PerformanceSummary;
  /** The kept slow frames, oldest first; those still waiting on late events settle now. */
  slowFrames: () => readonly SlowFrame[];
  clear: (now: number) => void;
}

/** A frame is slow over this many typical frames. */
const SLOW_FACTOR = 1.5;
/** The typical frame is the median of this many latest intervals. */
const TYPICAL_OF = 120;
/** Before any interval, the typical frame is the slowest pace a phone keeps: 30 fps. */
const FIRST_TYPICAL_MS = 1000 / 30;
/** The timeline keeps this much. */
const TIMELINE_MS = 5000;
/** A slow frame keeps what happened from this long before it. */
const BEFORE_SLOW_MS = 250;
/** Observers report a frame after it ends, so a slow frame waits this long before taking its events. */
const SETTLE_MS = 1000;
export const SLOW_FRAMES_KEPT = 60;

/** The recording, on the clock its caller passes in. */
export function createPerformanceLog(now: number): PerformanceLog {
  let startedAt = now;
  let screen = "";
  let timeline: TimelineEvent[] = [];
  let intervals: number[] = [];
  const sorting = new Float64Array(TYPICAL_OF);
  let last: number | null = null;
  let hidden = false;
  let ours: Record<string, number> | null = null;
  let pending: SlowFrame[] = [];
  let kept: SlowFrame[] = [];
  let frames = 0;
  let slow = 0;
  let recordedMs = 0;
  let worst: PerformanceSummary["worst"] = null;
  const byScreen = new Map<string, ScreenFrames>();

  const typicalMs = () => {
    const n = intervals.length;
    if (n === 0) return FIRST_TYPICAL_MS;
    sorting.set(intervals);
    const latest = sorting.subarray(0, n).sort();
    const mid = n >> 1;
    return n % 2 === 1 ? latest[mid] : (latest[mid - 1] + latest[mid]) / 2;
  };

  const countsOnScreen = () => {
    let counts = byScreen.get(screen);
    if (!counts) {
      counts = { frames: 0, slow: 0 };
      byScreen.set(screen, counts);
    }
    return counts;
  };

  const note = (event: TimelineEvent) => {
    let i = timeline.length;
    while (i > 0 && timeline[i - 1].at > event.at) i--;
    timeline.splice(i, 0, event);
  };

  const keep = (frame: SlowFrame) => {
    const from = frame.start - BEFORE_SLOW_MS;
    frame.events = timeline.filter((e) => e.at + e.ms >= from && e.at <= frame.end);
    kept.push(frame);
    if (kept.length > SLOW_FRAMES_KEPT) kept.shift();
  };

  /** Slow frames that ended `SETTLE_MS` before `now` (all of them, with no `now`) take their events. */
  const settle = (now = Infinity) => {
    let due = 0;
    while (due < pending.length && now - pending[due].end >= SETTLE_MS) due++;
    for (const frame of pending.splice(0, due)) keep(frame);
  };

  return {
    frame: (now) => {
      const spent = ours;
      ours = null;
      const before = last;
      last = now;
      if (before === null || hidden) {
        hidden = false;
        return;
      }
      const ms = now - before;
      const typical = typicalMs();
      intervals.push(ms);
      if (intervals.length > TYPICAL_OF) intervals.shift();
      frames++;
      recordedMs += ms;
      const counts = countsOnScreen();
      counts.frames++;
      if (!worst || ms > worst.ms) worst = { ms, at: before, screen };
      if (ms > SLOW_FACTOR * typical) {
        slow++;
        counts.slow++;
        pending.push({
          start: before,
          end: now,
          typicalMs: typical,
          screen,
          ours: spent ?? {},
          events: [],
        });
      }
      settle(now);
      // What no slow frame can still take goes.
      while (timeline.length > 0 && timeline[0].at + timeline[0].ms < now - TIMELINE_MS) {
        timeline.shift();
      }
    },
    pageHidden: () => {
      hidden = true;
    },
    note,
    addOurWork: (label, ms) => {
      ours ??= {};
      ours[label] = (ours[label] ?? 0) + ms;
    },
    setScreen: (next, at) => {
      screen = next;
      note({ at, ms: 0, kind: "screen", detail: next });
    },
    summary: () => ({
      startedAt,
      recordedMs,
      frames,
      slow,
      worst,
      typicalMs: intervals.length > 0 ? typicalMs() : 0,
      byScreen: new Map(
        [...byScreen].map(([name, counts]): [string, ScreenFrames] => [name, { ...counts }]),
      ),
    }),
    slowFrames: () => {
      settle();
      return [...kept];
    },
    clear: (now) => {
      startedAt = now;
      timeline = [];
      intervals = [];
      last = null;
      hidden = false;
      ours = null;
      pending = [];
      kept = [];
      frames = 0;
      slow = 0;
      recordedMs = 0;
      worst = null;
      byScreen.clear();
    },
  };
}
```

- [ ] **Step 4: Run the tests:** same command. Expected: 6 pass.

- [ ] **Step 5: Commit:** `git commit -m "feat: add the performance recorder's frame log" -- apps/frontend/src/performance/performanceRecorder.ts apps/frontend/src/performance/performanceRecorder.test.ts`.

---

### Task 2: The report

**Files:** Create `apps/frontend/src/performance/performanceReport.ts`, `apps/frontend/src/performance/performanceReport.test.ts`.

Its imports from `./performanceRecorder` are types only, so its tests run before Task 1 lands; its typecheck waits for Task 1's commit.

- [ ] **Step 1: Write the failing tests** in `performanceReport.test.ts`:

```ts
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
  ours: { light: 0.5, gratitude: 11.9 },
  events: [
    { at: 64_990, ms: 0, kind: "tap", detail: 'pointerdown button "Send gratitude to @alice"' },
    { at: 65_150, ms: 0, kind: "light", detail: "write to 3 readers" },
    { at: 65_195, ms: 0, kind: "light", detail: "write to 3 readers" },
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
        "  ours 12.4ms: gratitude 11.9ms, light 0.5ms",
        '  -210ms tap: pointerdown button "Send gratitude to @alice"',
        "  -50ms light: write to 3 readers ×2",
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
```

- [ ] **Step 2: Run them to see them fail:** `pnpm --filter frontend exec vitest run src/performance/performanceReport.test.ts`. Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Write `performanceReport.ts`:**

```ts
import type { PerformanceSummary, SlowFrame } from "./performanceRecorder";

export interface ReportInput {
  summary: PerformanceSummary;
  slowFrames: readonly SlowFrame[];
  takenAt: Date;
  /** The phone and browser, from `describeDevice`. */
  device: string;
}

/** A typical frame in this band is 30 fps: iOS's Low Power Mode, or the browser throttling the page. */
const THIRTY_FPS_MS = { from: 28, to: 40 };

const count = (n: number) => n.toLocaleString("en-US");
const ms = (value: number, digits = 0) => `${value.toFixed(digits)}ms`;
const share = (part: number, whole: number) =>
  `${whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0"}%`;
const fps = (typicalMs: number) => Math.round(1000 / typicalMs);
const screenName = (screen: string) => screen || "untitled";

/** 45s, or 3m 12s. */
function span(duration: number): string {
  const s = Math.round(duration / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** m:ss.s since the recording began. */
function since(at: number, startedAt: number): string {
  const tenths = Math.round(Math.max(0, at - startedAt) / 100);
  const minutes = Math.floor(tenths / 600);
  return `${minutes}:${((tenths - minutes * 600) / 10).toFixed(1).padStart(4, "0")}`;
}

/** The slip's line: time recorded, slow frames, the worst and the pace. */
export function formatSummaryLine(summary: PerformanceSummary): string {
  if (summary.frames === 0) return "Nothing recorded yet";
  const { slow, frames, worst } = summary;
  return [
    span(summary.recordedMs),
    `${count(slow)} slow of ${count(frames)} frames (${share(slow, frames)})`,
    ...(worst ? [`worst ${ms(worst.ms)}`] : []),
    `${fps(summary.typicalMs)} fps`,
  ].join(" · ");
}

/** A slow frame: when and where, our work in it, and what happened around it, repeats counted. */
function slowFrameLines(frame: SlowFrame, startedAt: number): string[] {
  const work = Object.entries(frame.ours).sort(([, a], [, b]) => b - a);
  const ours = work.reduce((sum, [, spent]) => sum + spent, 0);
  const split = work.map(([label, spent]) => `${label} ${ms(spent, 1)}`).join(", ");
  const seen = new Map<string, { line: string; times: number }>();
  for (const event of frame.events) {
    const offset = Math.round(event.at - frame.start);
    const key = `${event.kind}: ${event.detail}`;
    const had = seen.get(key);
    if (had) had.times++;
    else seen.set(key, { line: `  ${offset < 0 ? "" : "+"}${offset}ms ${key}`, times: 1 });
  }
  return [
    `${since(frame.start, startedAt)} ${screenName(frame.screen)}: ${ms(frame.end - frame.start)} (typical ${ms(frame.typicalMs, 1)})`,
    `  ours ${ms(ours, 1)}${split ? `: ${split}` : ""}`,
    ...[...seen.values()].map(({ line, times }) => (times > 1 ? `${line} ×${times}` : line)),
  ];
}

/** The report, as plain text to paste into a chat. */
export function formatPerformanceReport({
  summary,
  slowFrames,
  takenAt,
  device,
}: ReportInput): string {
  const head = `Performance report, taken ${takenAt.toISOString()}`;
  if (summary.frames === 0) return [head, device, "", "Nothing recorded yet"].join("\n");
  const { worst, startedAt, typicalMs } = summary;
  const lines = [
    head,
    device,
    "",
    `${span(summary.recordedMs)} recorded · ${count(summary.frames)} frames · ${count(summary.slow)} slow (${share(summary.slow, summary.frames)})`,
    ...(worst
      ? [`Worst ${ms(worst.ms)} at ${since(worst.at, startedAt)} on ${screenName(worst.screen)}`]
      : []),
    `Typical frame ${ms(typicalMs, 1)} (${fps(typicalMs)} fps)`,
    ...(typicalMs >= THIRTY_FPS_MS.from && typicalMs <= THIRTY_FPS_MS.to
      ? ["30 fps: Low Power Mode or throttling"]
      : []),
    "",
    "Slow frames by screen",
    ...[...summary.byScreen]
      .sort(([, a], [, b]) => b.slow - a.slow)
      .map(
        ([screen, { frames, slow }]) =>
          `  ${screenName(screen)}: ${count(slow)} of ${count(frames)} (${share(slow, frames)})`,
      ),
    "",
    slowFrames.length === summary.slow
      ? `All ${slowFrames.length} slow frames, oldest first`
      : `The latest ${slowFrames.length} of ${count(summary.slow)} slow frames, oldest first`,
  ];
  for (const frame of slowFrames) lines.push("", ...slowFrameLines(frame, startedAt));
  return lines.join("\n");
}
```

- [ ] **Step 4: Run the tests:** same command. Expected: 5 pass. Once Task 1 is committed, `pnpm --filter frontend typecheck`.

- [ ] **Step 5: Commit:** `git commit -m "feat: format the performance report as plain text" -- apps/frontend/src/performance/performanceReport.ts apps/frontend/src/performance/performanceReport.test.ts`.

---

### Task 3: The recorder on the page

Appends the page layer to `performanceRecorder.ts`: the setting (`draw.performanceRecorder` = `"on"`), start and stop, the rAF loop, listeners, fonts, observers, `notePerformance` and `timeOurWork`.

**Files:** Modify `apps/frontend/src/performance/performanceRecorder.ts`, `apps/frontend/src/performance/performanceRecorder.test.ts`.

- [ ] **Step 1: Write the failing tests.** Replace the test file's import lines with:

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPerformanceRecording,
  createPerformanceLog,
  describeLongFrame,
  notePerformance,
  readPerformanceRecorderSetting,
  readPerformanceRecording,
  setPerformanceRecorder,
  SLOW_FRAMES_KEPT,
  startPerformanceRecorder,
  stopPerformanceRecorder,
  timeOurWork,
  type LongAnimationFrame,
  type PerformanceLog,
} from "./performanceRecorder";
```

and append:

```ts
describe("a long animation frame's split", () => {
  it("parts script from rAF callbacks from style, layout and paint", () => {
    const frame: LongAnimationFrame = {
      entryType: "long-animation-frame",
      name: "long-animation-frame",
      startTime: 1000,
      duration: 140,
      renderStart: 1040,
      styleAndLayoutStart: 1052,
      scripts: [
        { duration: 30, forcedStyleAndLayoutDuration: 8, invoker: "FrameRequestCallback" },
        { duration: 6, forcedStyleAndLayoutDuration: 0, invoker: "BUTTON.onclick" },
      ],
      toJSON: () => ({}),
    };
    expect(describeLongFrame(frame)).toBe(
      "140ms: script 36ms (forced style and layout 8ms), rAF callbacks 12ms, style, layout and paint 88ms, longest script FrameRequestCallback 30ms",
    );
  });
});

describe("the recorder on the page", () => {
  let queued: FrameRequestCallback | null = null;
  let clock = 0;
  /** The browser starts a frame at `t`. */
  const frameAt = (t: number) => {
    clock = t;
    const run = queued;
    queued = null;
    run?.(t);
  };

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queued = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      queued = null;
    });
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  afterEach(() => {
    stopPerformanceRecorder();
    clearPerformanceRecording();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("costs nothing while off: no loop, no listeners, and marks and timings pass through", () => {
    const listens = vi.spyOn(window, "addEventListener");
    notePerformance("gratitude", "tier-up");
    expect(timeOurWork("gratitude", () => 7)).toBe(7);
    expect(queued).toBeNull();
    expect(listens).not.toHaveBeenCalled();
    expect(readPerformanceRecording()).toBeNull();
  });

  it("records a slow frame with the marks and our work in it, then stops all it started", () => {
    document.title = "Send gratitude";
    const listens = vi.spyOn(window, "addEventListener");
    const unlistens = vi.spyOn(window, "removeEventListener");
    startPerformanceRecorder();
    for (let t = 0; t <= 320; t += 16) frameAt(t);
    clock = 330;
    notePerformance("gratitude", "tier-up オーバーヒート");
    timeOurWork("gratitude", () => {
      clock = 336;
    });
    frameAt(400);
    stopPerformanceRecorder();

    const recording = readPerformanceRecording();
    expect(recording?.summary).toMatchObject({ slow: 1 });
    const [slow] = recording?.slowFrames ?? [];
    expect(slow).toMatchObject({ screen: "Send gratitude", ours: { gratitude: 6 } });
    expect(slow.events.map((e) => e.detail)).toContain("tier-up オーバーヒート");
    expect(queued).toBeNull();
    const types = (calls: unknown[][]) =>
      calls.map(([type]) => String(type)).sort((a, b) => a.localeCompare(b));
    expect(types(unlistens.mock.calls)).toEqual(types(listens.mock.calls));
  });

  it("starts and stops at once from the switch, and keeps the setting for the next start", () => {
    setPerformanceRecorder(true);
    expect(queued).not.toBeNull();
    expect(readPerformanceRecorderSetting()).toBe(true);
    setPerformanceRecorder(false);
    expect(queued).toBeNull();
    expect(readPerformanceRecorderSetting()).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail:** `pnpm --filter frontend exec vitest run src/performance/performanceRecorder.test.ts`. Expected: FAIL, `describeLongFrame`, `startPerformanceRecorder` and the rest aren't exported.

- [ ] **Step 3: Append the page layer** to `performanceRecorder.ts`:

```ts
// ---------------------------------------------------------------- on the page

const SETTING = "draw.performanceRecorder";
/** Input slower than this to its next paint is noted. */
const SLOW_INPUT_MS = 48;

/** What's been recorded, running or stopped, until Clear. */
let log: PerformanceLog | null = null;
/** Stops the running recorder's loop, observers and listeners; null while it's off. */
let stopRecording: (() => void) | null = null;

/** An app mark on the timeline, such as a tier-up. */
export function notePerformance(kind: string, detail: string): void {
  if (!stopRecording) return;
  log?.note({ at: performance.now(), ms: 0, kind, detail });
}

/** Runs `work`; while recording, its time counts as ours, under `label`, in the frame in progress. */
export function timeOurWork<T>(label: string, work: () => T): T {
  if (!stopRecording) return work();
  const began = performance.now();
  try {
    return work();
  } finally {
    log?.addOurWork(label, performance.now() - began);
  }
}

export const isPerformanceRecorderOn = () => stopRecording !== null;

export function readPerformanceRecorderSetting(): boolean {
  try {
    return localStorage.getItem(SETTING) === "on";
  } catch (error) {
    console.error("The performance recorder's setting couldn't be read", error);
    return false;
  }
}

/** Starts or stops recording at once, and keeps the setting for the app's next start; throws when it can't. */
export function setPerformanceRecorder(on: boolean): void {
  if (on) startPerformanceRecorder();
  else stopPerformanceRecorder();
  if (on) localStorage.setItem(SETTING, "on");
  else localStorage.removeItem(SETTING);
}

export function startPerformanceRecorder(): void {
  if (stopRecording) return;
  log ??= createPerformanceLog(performance.now());
  stopRecording = listen(log);
}

export function stopPerformanceRecorder(): void {
  stopRecording?.();
  stopRecording = null;
}

/** Empties the recording; a running recorder records on from now. */
export function clearPerformanceRecording(): void {
  if (stopRecording) log?.clear(performance.now());
  else log = null;
}

/** For the slip's line: it leaves slow frames still waiting on late events waiting. */
export const readPerformanceSummary = (): PerformanceSummary | null => log?.summary() ?? null;

/** What the report needs, or null before anything was recorded. */
export function readPerformanceRecording(): {
  summary: PerformanceSummary;
  slowFrames: readonly SlowFrame[];
} | null {
  return log && { summary: log.summary(), slowFrames: log.slowFrames() };
}

/** The phone and browser, for the report. */
export function describeDevice(): string {
  const { width, height } = window.screen;
  return `${navigator.userAgent}\nScreen ${width}×${height} at ${devicePixelRatio}x, window ${innerWidth}×${innerHeight}`;
}

/** Chromium's long animation frame entry, which TypeScript's DOM types don't have yet. */
export interface LongAnimationFrame extends PerformanceEntry {
  readonly renderStart: number;
  readonly styleAndLayoutStart: number;
  readonly scripts: readonly LongFrameScript[];
}
interface LongFrameScript {
  readonly duration: number;
  readonly forcedStyleAndLayoutDuration: number;
  readonly invoker: string;
}

const isResource = (entry: PerformanceEntry): entry is PerformanceResourceTiming =>
  entry.entryType === "resource";
const isLongAnimationFrame = (entry: PerformanceEntry): entry is LongAnimationFrame =>
  entry.entryType === "long-animation-frame";
const isSlowInput = (entry: PerformanceEntry): entry is PerformanceEventTiming =>
  entry.entryType === "event";

const ms = (value: number) => `${Math.round(value)}ms`;

/** What a tap or a key landed on: a control's name, or the element's tag and first class. */
function describeTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "the page";
  const control = target.closest("button, a, label, [role='button']");
  const el = control ?? target;
  const name =
    el.getAttribute("aria-label") ?? (control?.textContent ?? "").replace(/\s+/g, " ").trim();
  const tag = el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : "");
  return name ? `${tag} "${name}"` : tag;
}

/** Where a long frame's time went: script, rAF callbacks, and style, layout and paint. */
export function describeLongFrame(frame: LongAnimationFrame): string {
  const end = frame.startTime + frame.duration;
  let script = 0;
  let forced = 0;
  let longest: LongFrameScript | null = null;
  for (const s of frame.scripts) {
    script += s.duration;
    forced += s.forcedStyleAndLayoutDuration;
    if (!longest || s.duration > longest.duration) longest = s;
  }
  const layoutFrom = frame.styleAndLayoutStart || end;
  const parts = [
    `script ${ms(script)}${forced > 0 ? ` (forced style and layout ${ms(forced)})` : ""}`,
    `rAF callbacks ${ms(frame.renderStart ? layoutFrom - frame.renderStart : 0)}`,
    `style, layout and paint ${ms(frame.styleAndLayoutStart ? end - frame.styleAndLayoutStart : 0)}`,
  ];
  if (longest) parts.push(`longest script ${longest.invoker} ${ms(longest.duration)}`);
  return `${ms(frame.duration)}: ${parts.join(", ")}`;
}

/** Where slow input's time went: waiting, its handlers, and on to the next paint. */
function describeSlowInput(input: PerformanceEventTiming): string {
  const waited = input.processingStart - input.startTime;
  const handled = input.processingEnd - input.processingStart;
  const painted = input.startTime + input.duration - input.processingEnd;
  return `${input.name} ${ms(input.duration)}: waited ${ms(waited)}, handlers ${ms(handled)}, then ${ms(painted)} to paint, on ${describeTarget(input.target)}`;
}

/** Everything the recorder hears on the page; returns what stops it all. */
function listen(log: PerformanceLog): () => void {
  const stops: (() => void)[] = [];
  const note = (kind: string, detail: string, at = performance.now(), duration = 0) =>
    log.note({ at, ms: duration, kind, detail });

  let raf = 0;
  let title: string | null = null;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (document.title !== title) {
      title = document.title;
      log.setScreen(title, now);
    }
    log.frame(now);
  };
  raf = requestAnimationFrame(tick);
  stops.push(() => cancelAnimationFrame(raf));

  const hear = <K extends keyof WindowEventMap>(type: K, heard: (e: WindowEventMap[K]) => void) => {
    window.addEventListener(type, heard, { capture: true, passive: true });
    stops.push(() => window.removeEventListener(type, heard, { capture: true }));
  };
  const onTap = (e: PointerEvent) => note("tap", `${e.type} ${describeTarget(e.target)}`);
  hear("pointerdown", onTap);
  hear("pointerup", onTap);
  // Only named keys: what someone types stays theirs.
  hear("keydown", (e) =>
    note("key", `${e.key.length === 1 ? "a character" : e.key} on ${describeTarget(e.target)}`),
  );
  hear("resize", () => note("resize", `${innerWidth}×${innerHeight}`));

  const onVisibility = () => {
    if (document.visibilityState === "hidden") log.pageHidden();
    note("visibility", document.visibilityState);
  };
  document.addEventListener("visibilitychange", onVisibility);
  stops.push(() => document.removeEventListener("visibilitychange", onVisibility));

  // Every browser the app runs in has document.fonts; happy-dom doesn't.
  const fonts: FontFaceSet | undefined = document.fonts;
  if (fonts) {
    const onFonts = (e: FontFaceSetLoadEvent) =>
      note("font", `${e.type} ${[...new Set(e.fontfaces.map((face) => face.family))].join(", ")}`);
    for (const type of ["loading", "loadingdone", "loadingerror"] as const) {
      fonts.addEventListener(type, onFonts);
      stops.push(() => fonts.removeEventListener(type, onFonts));
    }
  }

  const observe = (
    type: string,
    options: PerformanceObserverInit & { durationThreshold?: number },
    take: (entry: PerformanceEntry) => void,
  ) => {
    if (typeof PerformanceObserver !== "function") return;
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) take(entry);
    });
    const init = { ...options, type };
    observer.observe(init);
    stops.push(() => observer.disconnect());
  };
  observe("resource", { buffered: true }, (entry) => {
    if (!isResource(entry)) return;
    const url = URL.parse(entry.name);
    const where = url ? `${url.host}${url.pathname}` : entry.name;
    note("network", `${where} in ${ms(entry.duration)}`, entry.responseEnd);
  });
  observe("long-animation-frame", { buffered: true }, (entry) => {
    if (isLongAnimationFrame(entry)) {
      note("long frame", describeLongFrame(entry), entry.startTime, entry.duration);
    }
  });
  observe("event", { buffered: true, durationThreshold: SLOW_INPUT_MS }, (entry) => {
    if (isSlowInput(entry) && entry.duration >= SLOW_INPUT_MS) {
      note("slow input", describeSlowInput(entry), entry.startTime, entry.duration);
    }
  });

  return () => {
    for (const stop of stops.splice(0)) stop();
  };
}
```

- [ ] **Step 4: Run the tests:** same command. Expected: 10 pass. Then `pnpm exec oxlint --type-aware --type-check apps/frontend/src/performance` and `pnpm --filter frontend typecheck`.

- [ ] **Step 5: Commit:** `git commit -m "feat: record frames, taps, fonts, network and long frames on the page" -- apps/frontend/src/performance/performanceRecorder.ts apps/frontend/src/performance/performanceRecorder.test.ts`.

---

### Task 4: The light writes only onto its readers

`light.ts` writes `--lx`/`--ly` onto the page root, which restyles every element for four rules. The readers, checked: `LiveResin.tsx` renders `.live-resin`, and `live-resin.css` reads the variables only in `.live-resin__lens > b`, `.live-resin__spec > b` and `.live-resin__rim > b`, all inside it (`SealCeremony.css` styles the same parts without reading them). The fourth is the heart's gloss, `.gr-heart-layers .h-gloss` in `gratitude-mini-game.css`.

The engine also writes the light, on the game's root (`.gr`), while a thumb holds the heart, which restyles the whole game at the light's beat. So the heart's reader is `.gr-heart-layers`, the gloss's parent, and the engine's thumb light moves onto the gloss itself: set there, it wins over the inherited light while the thumb holds, as it wins over the root's today.

**Files:** Modify `apps/frontend/src/stickers/light.ts`, `apps/frontend/src/stickers/light.test.ts`, `apps/frontend/src/stickers/LiveResin.tsx`, `apps/frontend/src/stickers/live-resin.css`, `apps/frontend/src/main.tsx`, `apps/frontend/src/gratitude/miniGameEngine.ts`, `apps/frontend/src/gratitude/miniGameEngine.test.ts`.

- [ ] **Step 1: Replace `light.test.ts`** with the failing tests:

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireLight, addLightReader, installLight } from "./light";

let uninstall = () => {};
/** The tilt listeners on the window: the phone's motion sensor runs while there are any. */
const tiltListeners = new Set<EventListenerOrEventListenerObject>();
/** The light's holds and readers a test hasn't released, released after it. */
const held = new Set<() => void>();

const lightOn = (el: HTMLElement) => [
  el.style.getPropertyValue("--lx"),
  el.style.getPropertyValue("--ly"),
];
const pointAt = (x: number, y: number) =>
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));
const tiltTo = (gamma: number, beta: number) =>
  window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma, beta }));
const hold = (release: () => void) => {
  held.add(release);
  return () => {
    held.delete(release);
    release();
  };
};
/** A screen with stickers showing: it holds the light, and returns what closes it. */
const showScreen = () => hold(acquireLight());
/** A sticker's live resin on screen, with the band its sheen sweeps. */
const resinOnScreen = () => {
  const el = document.body.appendChild(document.createElement("span"));
  el.className = "live-resin";
  el.innerHTML = '<i class="live-resin__sheen"><b></b></i>';
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 80, 80));
  return el;
};
/** A live resin that reads the light. */
const readingResin = () => {
  const el = resinOnScreen();
  hold(addLightReader(el));
  return el;
};
/** Reduced motion, off until the returned function turns it on. */
const reducedMotionSetting = () => {
  const query = window.matchMedia("not all");
  let on = false;
  Object.defineProperty(query, "matches", { get: () => on });
  vi.spyOn(window, "matchMedia").mockReturnValue(query);
  return () => {
    on = true;
    query.dispatchEvent(new Event("change"));
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === "deviceorientation") tiltListeners.add(listener);
    add(type, listener, options);
  });
  vi.spyOn(window, "removeEventListener").mockImplementation((type, listener, options) => {
    if (type === "deviceorientation") tiltListeners.delete(listener);
    remove(type, listener, options);
  });
});

afterEach(() => {
  held.forEach((release) => release());
  held.clear();
  uninstall();
  tiltListeners.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the shared light", () => {
  it("follows the pointer to the window's edge, on its readers and nowhere else", () => {
    const resin = readingResin();
    const other = document.body.appendChild(document.createElement("span"));
    uninstall = installLight();
    pointAt(window.innerWidth, window.innerHeight / 2);
    vi.advanceTimersByTime(16);
    expect(lightOn(resin)).toEqual(["1.000", "0.000"]);
    expect(lightOn(document.documentElement)).toEqual(["", ""]);
    expect(lightOn(other)).toEqual(["", ""]);
  });

  it("writes once for moves that come close together, with the later position", () => {
    const resin = readingResin();
    uninstall = installLight();
    pointAt(0, 0);
    vi.advanceTimersByTime(16);
    const writes = vi.spyOn(resin.style, "setProperty");
    pointAt(window.innerWidth / 4, 0);
    vi.advanceTimersByTime(16);
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(writes.mock.calls.filter(([name]) => name === "--lx")).toEqual([["--lx", "1.000"]]);
  });

  it("lights a reader that comes later at once, and stops lighting one that's gone", () => {
    uninstall = installLight();
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(16);
    const later = resinOnScreen();
    const release = hold(addLightReader(later));
    expect(lightOn(later)).toEqual(["1.000", "-1.000"]);
    release();
    pointAt(0, 0);
    vi.advanceTimersByTime(100);
    expect(lightOn(later)).toEqual(["1.000", "-1.000"]);
  });

  it("follows the phone's tilt on a screen with stickers, even in a browser that can also ask", () => {
    // Chrome has requestPermission too, and grants it without asking.
    vi.stubGlobal(
      "DeviceOrientationEvent",
      class {
        static requestPermission = () => Promise.resolve("granted");
      },
    );
    const resin = readingResin();
    uninstall = installLight();
    showScreen();
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightOn(resin)).toEqual(["1.000", "0.000"]);
  });

  it("leaves the motion sensor off while no screen shows stickers", () => {
    const resin = readingResin();
    uninstall = installLight();
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightOn(resin)).toEqual(["", ""]);
    expect(tiltListeners.size).toBe(0);
  });

  it("stops listening for the tilt when the last screen with stickers goes", () => {
    const resin = readingResin();
    uninstall = installLight();
    const closeBoard = showScreen();
    const closeDetail = showScreen();
    closeDetail();
    expect(tiltListeners.size).toBe(1);
    tiltTo(32, 40);
    vi.advanceTimersByTime(16);
    expect(lightOn(resin)).toEqual(["1.000", "0.000"]);

    closeBoard();
    expect(tiltListeners.size).toBe(0);
    tiltTo(-32, 40);
    vi.advanceTimersByTime(100);
    expect(lightOn(resin)).toEqual(["1.000", "0.000"]);
  });

  it("sweeps a sheen across the resins that read it when the phone tilts far", () => {
    const sweeps = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
    const resin = readingResin();
    resinOnScreen();
    uninstall = installLight();
    showScreen();
    tiltTo(0, 40);
    tiltTo(20, 40);
    expect(sweeps.mock.contexts).toEqual([resin.querySelector(".live-resin__sheen > b")]);
  });

  it("stays in the middle under reduced motion", () => {
    // A query that always matches stands in for the reduced-motion setting.
    vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
    const resin = readingResin();
    uninstall = installLight();
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(100);
    expect(lightOn(resin)).toEqual(["", ""]);
  });

  it("sets every reader back in the middle when reduced motion turns on", () => {
    const turnOn = reducedMotionSetting();
    const resin = readingResin();
    uninstall = installLight();
    pointAt(window.innerWidth, 0);
    vi.advanceTimersByTime(16);
    turnOn();
    expect(lightOn(resin)).toEqual(["", ""]);
  });
});
```

- [ ] **Step 2: Run them to see them fail:** `pnpm --filter frontend exec vitest run src/stickers/light.test.ts`. Expected: FAIL, `addLightReader` isn't exported.

- [ ] **Step 3: Replace `light.ts`:**

```ts
import { useEffect, useLayoutEffect, type RefObject } from "react";
import { sheenIn, sweepSheen } from "./resinSheen";

/**
 * The app's one light: `--lx` and `--ly` (-1 to 1) follow the pointer, or the phone's tilt where the
 * browser shares it. They're written onto the light's readers, the elements whose highlights read
 * them, and never onto the root, where a change restyles every element on the page. A highlight
 * rests in the middle without them. The tilt is listened for only while a screen with stickers
 * holds the light, so the motion sensor rests everywhere else.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The light is written at most this often; the highlights' transitions glide between writes. */
const BEAT_MS = 45;
/** Degrees of tilt that carry the light from the middle to an edge. */
const TILT_RANGE = 32;
/** How far back a phone leans when it's held to read, in degrees. */
const HELD_BETA = 40;
/** A tilt change this big sweeps a sheen across the stickers on screen, at most once a pause. */
const SWEEP_TILT = 9;
const SWEEP_PAUSE_MS = 1400;

const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** The installed light's tilt listener, on while any screen with stickers holds the light. */
let tilt: { on: () => void; off: () => void } | null = null;
let holders = 0;

const readers = new Set<HTMLElement>();
/** The light as last written, which a new reader takes at once; null while it rests in the middle. */
let shining: { x: string; y: string } | null = null;

function lightUp(reader: HTMLElement) {
  if (shining) {
    reader.style.setProperty("--lx", shining.x);
    reader.style.setProperty("--ly", shining.y);
  } else {
    reader.style.removeProperty("--lx");
    reader.style.removeProperty("--ly");
  }
}

function shine(next: { x: string; y: string } | null) {
  shining = next;
  for (const reader of readers) lightUp(reader);
}

/** Sweeps a sheen across each live resin reader big enough to see on screen; returns how many it measured. */
function sweepVisible(win: Window): number {
  let measured = 0;
  for (const reader of readers) {
    const sheen = sheenIn(reader);
    if (!sheen) continue;
    measured++;
    const r = reader.getBoundingClientRect();
    if (r.width > 30 && r.bottom > 0 && r.top < win.innerHeight) sweepSheen(sheen);
  }
  return measured;
}

/** Writes the light onto an element whose styles read it; returns what stops that. */
export function addLightReader(reader: HTMLElement): () => void {
  readers.add(reader);
  if (shining) lightUp(reader);
  return () => {
    readers.delete(reader);
  };
}

/** Writes the light onto the element in `ref` while it's mounted, from before its first paint. */
export function useLightReader(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const reader = ref.current;
    return reader ? addLightReader(reader) : undefined;
  }, [ref]);
}

/** Starts the light; returns what stops it. */
export function installLight(win: typeof window = window): () => void {
  const reduced = win.matchMedia(REDUCED);
  let x = 0;
  let y = 0;
  let frame = 0;
  let lastWrite = -Infinity;

  const write = (now: number) => {
    frame = 0;
    if (now - lastWrite < BEAT_MS) {
      frame = win.requestAnimationFrame(write);
      return;
    }
    lastWrite = now;
    shine({ x: x.toFixed(3), y: y.toFixed(3) });
  };

  const aim = (nx: number, ny: number) => {
    if (reduced.matches) return;
    x = clamp11(nx);
    y = clamp11(ny);
    if (!frame) frame = win.requestAnimationFrame(write);
  };

  const fromPointer = (e: PointerEvent) =>
    aim((e.clientX / win.innerWidth) * 2 - 1, (e.clientY / win.innerHeight) * 2 - 1);

  let lastGamma: number | null = null;
  let lastSweep = -Infinity;
  const fromTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    aim(e.gamma / TILT_RANGE, (e.beta - HELD_BETA) / TILT_RANGE);
    const now = win.performance.now();
    if (
      lastGamma !== null &&
      Math.abs(e.gamma - lastGamma) > SWEEP_TILT &&
      now - lastSweep > SWEEP_PAUSE_MS &&
      !reduced.matches
    ) {
      lastSweep = now;
      sweepVisible(win);
    }
    lastGamma = e.gamma;
  };

  // Turning reduced motion on sets the light back in the middle.
  const onMotionSetting = () => {
    if (!reduced.matches) return;
    win.cancelAnimationFrame(frame);
    frame = 0;
    shine(null);
  };

  // The light never asks for the tilt: where a browser wants permission first (iOS), no tilt
  // arrives until something else has asked, and the pointer alone moves the light.
  const passive = { passive: true };
  const ownTilt = {
    on: () => win.addEventListener("deviceorientation", fromTilt, passive),
    off: () => {
      win.removeEventListener("deviceorientation", fromTilt);
      // A tilt from before the sensor rested isn't a change to sweep for.
      lastGamma = null;
    },
  };
  tilt = ownTilt;
  if (holders > 0) ownTilt.on();
  win.addEventListener("pointermove", fromPointer, passive);
  win.addEventListener("pointerdown", fromPointer, passive);
  reduced.addEventListener("change", onMotionSetting);
  return () => {
    win.removeEventListener("pointermove", fromPointer);
    win.removeEventListener("pointerdown", fromPointer);
    ownTilt.off();
    if (tilt === ownTilt) tilt = null;
    reduced.removeEventListener("change", onMotionSetting);
    win.cancelAnimationFrame(frame);
    shine(null);
  };
}

/** Holds the light for a screen with stickers; returns what releases it. */
export function acquireLight(): () => void {
  if (holders++ === 0) tilt?.on();
  return () => {
    if (--holders === 0) tilt?.off();
  };
}

/** Holds the light while the calling screen shows its stickers. */
export function useLight(showing = true) {
  useEffect(() => (showing ? acquireLight() : undefined), [showing]);
}
```

- [ ] **Step 4: The live resin reads it.** In `LiveResin.tsx`, add the imports and the ref:

```tsx
import { useRef } from "react";
import { useLightReader } from "./light";
import "./live-resin.css";
```

```tsx
export function LiveResin({ highlights }: Props) {
  const resin = useRef<HTMLSpanElement>(null);
  useLightReader(resin);
  return (
    <span className="live-resin" ref={resin} aria-hidden="true">
```

In `live-resin.css`, the header comment's last sentence becomes: `The highlights read the shared light (--lx, --ly, -1 to 1), which the light writes onto .live-resin itself, and rest in the middle without one.`

- [ ] **Step 5: `main.tsx`:** `installLight(document.documentElement);` becomes `installLight();`.

- [ ] **Step 6: The heart's gloss** (wait for the fix round). In `gratitude/miniGameEngine.test.ts`, add `import { installLight } from "../stickers/light";` and this test inside `describe("mountMiniGameEngine")`:

```ts
it("lights the heart's gloss from the app's light while it's mounted, never the game's root", () => {
  const uninstall = installLight();
  const pointAt = (x: number) =>
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: 0 }));
  try {
    pointAt(window.innerWidth);
    vi.advanceTimersByTime(100);
    const layers = host.querySelector<HTMLElement>(".gr-heart-layers");
    expect(layers?.style.getPropertyValue("--lx")).toBe("1.000");
    expect(host.style.getPropertyValue("--lx")).toBe("");
    engine.destroy();
    pointAt(0);
    vi.advanceTimersByTime(100);
    expect(layers?.style.getPropertyValue("--lx")).toBe("1.000");
  } finally {
    uninstall();
  }
});
```

Run `pnpm --filter frontend exec vitest run src/gratitude/miniGameEngine.test.ts`. Expected: the new test FAILS (`--lx` is empty on the layers).

- [ ] **Step 7: Edit `miniGameEngine.ts`:**
  - Import: add `import { addLightReader } from "../stickers/light";` with the other `../` imports.
  - After `const ink = body.querySelector(".h-ink");` add:

```ts
// The gloss reads the app's light through the heart's layers; a thumb on the heart writes its own
// onto the gloss, which wins while it's there.
const gloss = body.querySelector<SVGElement>(".h-gloss");
const heartLayers = body.querySelector<HTMLElement>(".gr-heart-layers");
const stopLighting = heartLayers ? addLightReader(heartLayers) : () => {};
```

- In the frame's thumb branch, the two `root.style.setProperty("--lx", …)` / `("--ly", …)` calls become `gloss?.style.setProperty(…)` with the same arguments, and in its `else` branch the two `root.style.removeProperty("--lx")` / `("--ly")` become `gloss?.style.removeProperty(…)`.
- In `destroy`, replace

```ts
root.style.removeProperty("--lx");
root.style.removeProperty("--ly");
```

with

```ts
stopLighting();
```

- [ ] **Step 8: Run** `pnpm --filter frontend exec vitest run src/stickers/light.test.ts src/gratitude/miniGameEngine.test.ts`. Expected: all pass. Then `rg -n -e '--l[xy]' --glob '*.ts' --glob '*.tsx' apps/frontend/src` lists only `stickers/light.ts`, its test, the engine's `gloss` lines and the engine test's checks: nothing writes the root.

- [ ] **Step 9: Commit:** `git commit -m "fix: write the light only onto the elements that read it" -- apps/frontend/src/stickers/light.ts apps/frontend/src/stickers/light.test.ts apps/frontend/src/stickers/LiveResin.tsx apps/frontend/src/stickers/live-resin.css apps/frontend/src/main.tsx apps/frontend/src/gratitude/miniGameEngine.ts apps/frontend/src/gratitude/miniGameEngine.test.ts`.

---

### Task 5: The board hidden under the game

`setPhoneAside` in `gratitude/GratitudeMiniGame.tsx` (committed in `50c737f`) makes the phone's other children `inert` in a layout effect as the game mounts, and takes off only the `inert` it added, both in `leave()` before `onClose()` and on unmount. This adds `visibility: hidden` to the same children and puts back each one's own inline visibility. Not `content-visibility`: it skips layout, so the board's ResizeObservers would see empty sizes.

**Files:** Modify `apps/frontend/src/gratitude/GratitudeMiniGame.tsx`, `apps/frontend/src/gratitude/GratitudeMiniGame.test.tsx`.

- [ ] **Step 1: Check the game covers the whole phone.** `rg -n -A20 '^\.gr \{' apps/frontend/src/gratitude/gratitude-mini-game.css` shows `position: absolute`, `inset: 0`, `background: var(--liner)` and `z-index: var(--z-sheet)`; `rg -n -- '--liner:' apps/frontend/src/styles/tokens.css` shows an opaque color (`#f2f1f6`). `.phone` in `app/App.css` is `position: fixed` on a phone and `relative` in the desktop frame, so `inset: 0` covers its padding box, safe area included; the masked `.gr-ground` doesn't matter, `.gr`'s own background is under it. `rg -n 'z-index' apps/frontend/src/app/*.css` shows no other phone child over `--z-sheet`. If any of this has changed, stop and report: hiding the board would show through.

- [ ] **Step 2: Check closing shows no board mid-transition.** The same `rg` output has no `animation` or `transition` on `.gr` (the receipt's `gr-receipt-in` is an entrance). `leave()` calls `restorePhone.current()` and then `onClose()`, which unmounts the game in the same click. If either has changed, stop and report.

- [ ] **Step 3: Write the failing test.** In `GratitudeMiniGame.test.tsx`, the test `"is modal: the rest of the phone goes inert while it's open, and only what it made inert comes back"` becomes:

```tsx
it("is modal: the rest of the phone goes inert and unseen while it's open, and comes back as it was", () => {
  const phone = document.createElement("div");
  phone.className = "phone";
  const board = phone.appendChild(document.createElement("div"));
  const tabs = phone.appendChild(document.createElement("nav"));
  tabs.setAttribute("inert", "");
  const seen = () => [board.style.visibility, tabs.style.visibility];
  document.body.append(phone);
  try {
    open();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.parentElement).toBe(phone);
    expect(board.hasAttribute("inert")).toBe(true);
    expect(seen()).toEqual(["hidden", "hidden"]);
    act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
    expect(board.hasAttribute("inert")).toBe(false);
    expect(tabs.hasAttribute("inert")).toBe(true);
    expect(seen()).toEqual(["", ""]);

    // A fresh screen, unmounted without its X.
    act(() => root.render(null));
    open();
    expect(board.hasAttribute("inert")).toBe(true);
    expect(seen()).toEqual(["hidden", "hidden"]);
    act(() => root.render(null));
    expect(board.hasAttribute("inert")).toBe(false);
    expect(tabs.hasAttribute("inert")).toBe(true);
    expect(seen()).toEqual(["", ""]);
  } finally {
    phone.remove();
  }
});
```

- [ ] **Step 4: Run it to see it fail:** `pnpm --filter frontend exec vitest run src/gratitude/GratitudeMiniGame.test.tsx`. Expected: FAIL, the visibility is `""` while open.

- [ ] **Step 5: Replace `setPhoneAside`** and its comment:

```tsx
/**
 * While the game covers the phone, the phone's other children (the board's screen, the tab bar and
 * anything else open) go inert and hidden: assistive tech and Tab reach only the game, and the
 * browser stops painting what it covers. Returns what undoes it, which takes off only the `inert`
 * it added and puts back each child's own visibility.
 */
function setPhoneAside(game: HTMLElement): () => void {
  const phone = game.parentElement;
  if (!phone?.classList.contains("phone")) return () => {};
  const others = [...phone.children].filter(
    (child): child is HTMLElement => child !== game && child instanceof HTMLElement,
  );
  const madeInert = others.filter((child) => !child.hasAttribute("inert"));
  const visibility = others.map((child) => ({ child, was: child.style.visibility }));
  for (const child of madeInert) child.setAttribute("inert", "");
  for (const child of others) child.style.visibility = "hidden";
  return () => {
    for (const child of madeInert.splice(0)) child.removeAttribute("inert");
    for (const { child, was } of visibility.splice(0)) child.style.visibility = was;
  };
}
```

- [ ] **Step 6: Run the test:** same command. Expected: all pass.

- [ ] **Step 7: Commit:** `git commit -m "fix: stop painting the board while the gratitude mini-game covers it" -- apps/frontend/src/gratitude/GratitudeMiniGame.tsx apps/frontend/src/gratitude/GratitudeMiniGame.test.tsx`.

---

### Task 6: The slip's controls and the boot start

**Files:** Create `apps/frontend/src/sticker-board/stat-board/PerformanceRecorderControls.tsx`, `PerformanceRecorderControls.test.tsx` and `performance-recorder-controls.css` beside it. Modify `apps/frontend/src/sticker-board/stat-board/StatBoard.tsx`, `apps/frontend/src/main.tsx`, `AGENTS.MD`.

The controls follow `GratitudeDemoControls.tsx`: a plain labelled checkbox, a 2px Ink focus ring 3px out, and `useId` for the describedby. Copy report opts out of the shared press (`data-press="off"`): the press swallows the tap's click and fires `el.click()` 60ms into its pop, and the clipboard wants the tap's own activation.

- [ ] **Step 1: Write the failing tests** in `PerformanceRecorderControls.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPerformanceRecording,
  stopPerformanceRecorder,
} from "../../performance/performanceRecorder";
import { PerformanceRecorderControls } from "./PerformanceRecorderControls";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const writeText = vi.fn<(text: string) => Promise<void>>();

const control = <E extends HTMLElement>(selector: string) => {
  const el = host.querySelector<E>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const button = (label: string) => {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`No "${label}" button`);
  return found;
};
/** Turns recording on and lets it see a few frames. */
const record = () => {
  act(() => control<HTMLInputElement>("input[type=checkbox]").click());
  act(() => {
    vi.advanceTimersByTime(100);
  });
};
const copyReport = () => act(async () => button("Copy report").click());

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<PerformanceRecorderControls />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  stopPerformanceRecorder();
  clearPerformanceRecording();
  localStorage.clear();
  writeText.mockReset();
  vi.useRealTimers();
});

describe("PerformanceRecorderControls", () => {
  it("copies the report once there's a recording", async () => {
    expect(button("Copy report").disabled).toBe(true);
    record();
    writeText.mockResolvedValue();
    await copyReport();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Typical frame"));
    expect(control('[role="status"]').textContent).toBe("Copied. Paste it into the chat.");
  });

  it("says why the clipboard refused the report, and shows it to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    record();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copyReport();
    expect(control('[role="alert"]').textContent).toBe(
      "The report couldn't be copied: Not allowed here. It's below to copy by hand.",
    );
    expect(control<HTMLTextAreaElement>("textarea").value).toContain("Typical frame");
  });
});
```

- [ ] **Step 2: Run them to see them fail:** `pnpm --filter frontend exec vitest run src/sticker-board/stat-board/PerformanceRecorderControls.test.tsx`. Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Write `PerformanceRecorderControls.tsx`:**

```tsx
import { Copy } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  clearPerformanceRecording,
  describeDevice,
  isPerformanceRecorderOn,
  readPerformanceRecording,
  readPerformanceSummary,
  setPerformanceRecorder,
} from "../../performance/performanceRecorder";
import { formatPerformanceReport, formatSummaryLine } from "../../performance/performanceReport";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import "./performance-recorder-controls.css";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The performance recorder's switch, live summary and report, on the stat board's developer slip. */
export function PerformanceRecorderControls() {
  const id = useId();
  const slip = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(isPerformanceRecorderOn);
  const [summary, setSummary] = useState(readPerformanceSummary);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The report, to copy by hand after the clipboard refused it. */
  const [uncopied, setUncopied] = useState<string | null>(null);

  // Each second while the slip shows: the board facing out, or a game over it, makes it inert.
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !slip.current?.closest("[inert]")) {
        setSummary(readPerformanceSummary());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [on]);

  const toggle = (next: boolean) => {
    setOn(next);
    setProblem(null);
    try {
      setPerformanceRecorder(next);
    } catch (error) {
      console.error("The performance recorder's setting couldn't be kept", error);
      setProblem(`Recording is ${next ? "on" : "off"} until the app restarts: ${reason(error)}`);
    }
    setSummary(readPerformanceSummary());
  };

  const copy = async () => {
    const recording = readPerformanceRecording();
    if (!recording) return;
    const report = formatPerformanceReport({
      ...recording,
      takenAt: new Date(),
      device: describeDevice(),
    });
    setCopied(false);
    setProblem(null);
    setUncopied(null);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch (error) {
      console.error("The performance report couldn't be copied", error);
      setProblem(`The report couldn't be copied: ${reason(error)}. It's below to copy by hand.`);
      setUncopied(report);
    }
  };

  const clear = () => {
    clearPerformanceRecording();
    setSummary(readPerformanceSummary());
    setCopied(false);
    setUncopied(null);
  };

  return (
    <div className="performance-recorder" ref={slip}>
      <h3 className="fine performance-recorder__h">Performance</h3>
      <label className="performance-recorder__switch">
        <input
          type="checkbox"
          checked={on}
          aria-describedby={`${id}-what`}
          onChange={(e) => toggle(e.target.checked)}
        />
        Record performance
      </label>
      <p id={`${id}-what`} className="fine performance-recorder__note">
        Slow frames and what happened around them. While it’s on, it records from the app’s start.
      </p>
      <p className="performance-recorder__summary">
        {summary ? formatSummaryLine(summary) : "Nothing recorded yet"}
      </p>
      <div className="performance-recorder__actions">
        {/* The clipboard wants the tap's own click, which the press would fire late. */}
        <LabelButton
          size="sm"
          icon={<Copy />}
          data-press="off"
          disabled={!summary}
          onClick={() => void copy()}
        >
          Copy report
        </LabelButton>
        <QuietLink disabled={!summary} onClick={clear}>
          Clear
        </QuietLink>
      </div>
      <p className="fine performance-recorder__note" role="status">
        {copied ? "Copied. Paste it into the chat." : ""}
      </p>
      {problem && (
        <p className="performance-recorder__problem" role="alert">
          {problem}
        </p>
      )}
      {uncopied && (
        <textarea
          className="performance-recorder__report"
          aria-label="Performance report"
          readOnly
          value={uncopied}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `performance-recorder-controls.css`:**

```css
/* ---------- The performance recorder, on the developer slip ---------- */

.performance-recorder {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--rule-strong);
}

.performance-recorder__h {
  margin: 0;
  color: var(--ink);
  font-weight: 750;
  letter-spacing: 0.1em;
}

.performance-recorder__note {
  margin: -2px 0 0;
}

.performance-recorder__switch {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font: 600 15px/1.2 var(--font-ui);
}

.performance-recorder__switch input {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--ink);
}

/* It changes each second: tabular figures keep it from jittering. */
.performance-recorder__summary {
  margin: 0;
  font: 500 14px/1.4 var(--font-ui);
  font-variant-numeric: tabular-nums;
}

.performance-recorder__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* A failure's reason can be long: it wraps, and can be copied into a report. */
.performance-recorder__problem {
  margin: 0;
  font: 500 14px/1.4 var(--font-ui);
  overflow-wrap: anywhere;
  -webkit-user-select: text;
  user-select: text;
}

.performance-recorder__report {
  min-height: 180px;
  font:
    12px/1.4 ui-monospace,
    monospace;
  -webkit-user-select: text;
  user-select: text;
}

.performance-recorder :focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
}
```

- [ ] **Step 5: Put it on the slip.** In `StatBoard.tsx`, add `import { PerformanceRecorderControls } from "./PerformanceRecorderControls";` and render it after the gratitude demo, as the slip's next h3 section:

```tsx
            <GratitudeDemoControls onTry={onTryGratitudeMiniGame} />
            <PerformanceRecorderControls />
```

- [ ] **Step 6: Start it at boot.** In `main.tsx`, add `import { readPerformanceRecorderSetting, startPerformanceRecorder } from "./performance/performanceRecorder";` and, right after `void initLine();`:

```ts
// From boot while it's on, so the app's own start is in the recording.
if (readPerformanceRecorderSetting()) startPerformanceRecorder();
```

- [ ] **Step 7: AGENTS.MD,** in Architecture after the `src/gratitude` line, add: ``  - `src/performance` — the performance recorder, switched on from the stat board's developer slip: frame intervals, slow frames and what happened around each, for phones where LINE's browser has no developer tools``.

- [ ] **Step 8: Run** `pnpm --filter frontend exec vitest run src/sticker-board/stat-board/PerformanceRecorderControls.test.tsx`. Expected: 2 pass. Then lint, format and `pnpm --filter frontend typecheck`.

- [ ] **Step 9: Commit:** `git commit -m "feat: add the performance recorder to the developer slip" -- apps/frontend/src/sticker-board/stat-board/PerformanceRecorderControls.tsx apps/frontend/src/sticker-board/stat-board/PerformanceRecorderControls.test.tsx apps/frontend/src/sticker-board/stat-board/performance-recorder-controls.css apps/frontend/src/sticker-board/stat-board/StatBoard.tsx apps/frontend/src/main.tsx AGENTS.MD`.

---

### Task 7: The gratitude mini-game's marks

Phase changes, tier-ups, slams, pop-ins, thrown mini hearts with their counts, and endings, plus the frame's script time. The slams and pop-ins are marked inside the lettering, so 昇天's slam and pop-ins in `gameEndings.ts` are caught too. No unit test: these are one-line marks, and Task 10 checks them in a real report.

**Files:** Modify `apps/frontend/src/gratitude/miniGameEngine.ts`, `apps/frontend/src/gratitude/tierSlamAndPopIns.ts`, `apps/frontend/src/gratitude/gameEndings.ts`. Wait for the fix round.

- [ ] **Step 1: `miniGameEngine.ts`.** Add `import { notePerformance, timeOurWork } from "../performance/performanceRecorder";` with the other `../` imports, then:
  - After the mount's `root.dataset.reduced = reduced ? "1" : "0";` add `notePerformance("gratitude", "phase ready");`.
  - In `finish`, after `root.dataset.phase = "done";` add `notePerformance("gratitude", "phase done");`.
  - In `end`, after `root.dataset.phase = "ending";` add:

```ts
notePerformance(
  "gratitude",
  `phase ending, ${caught ? "caught" : "sent"} after ${record.hits} hits`,
);
```

- In `onCaught`, after `root.dataset.phase = "running";` add ``notePerformance("gratitude", `phase running, ${combo.view.method}`);``.
- In `firstTap`, after `root.dataset.phase = "sending";` add `notePerformance("gratitude", "phase sending");`.
- First line of `onTierUp`: ``notePerformance("gratitude", `tier-up ${TIER_NAMES[tier].jp}`);``.
- After `const throwCount = …;` add:

```ts
/** Marks mini hearts thrown for the performance recorder, with the pile they join. */
const markThrow = (what: string) =>
  notePerformance("gratitude", `${what}, ${physics.hearts.length} mini hearts`);
```

- Each throw takes its count once and marks it:

```ts
const count = throwCount();
physics.knockOffWall(from.x, from.y, normal, hit.speed, count);
markThrow(`knock ${count}`);
```

```ts
if (tier >= 3 && hits % 2 === 1 && method !== "stroke" && !reduced) {
  physics.rainFromTop();
  markThrow("rain");
}
```

```ts
const count = throwCount();
physics.sprayFromTap(x, y, box, count);
markThrow(`spray ${count}`);
```

```ts
const count = throwCount();
physics.flingAlongStroke(pass, count);
markThrow(`fling ${count}`);
```

```ts
for (; sweat >= 1; sweat -= 1) {
  physics.sweatFromHeart(heartBox());
  markThrow("sweat");
}
```

- The frame's work is timed. `frame` becomes:

```ts
const frame = (now: number) => {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  try {
    timeOurWork("gratitude", () => drawFrame(now));
  } catch (error) {
    fail(error);
  }
};

/** One frame: the combo's clock, the mini hearts, the heart, the ground and the HUD. */
const drawFrame = (now: number) => {
  // …the old try block's body, unchanged…
};
```

Move the body of the old `try { … }` into `drawFrame` as it is, then `pnpm exec oxfmt apps/frontend/src/gratitude/miniGameEngine.ts` fixes its indent.

- [ ] **Step 2: `tierSlamAndPopIns.ts`.** Add the same import, then as the first line of `slamTierName(text, gloss) {`: ``notePerformance("gratitude", `slam ${text}`);``, and of `showPopInWord(bank, heart) {`: ``notePerformance("gratitude", `pop-in ${bank}`);``.

- [ ] **Step 3: `gameEndings.ts`.** Add the same import, then as the first line of `flyHeartToGiver`: `notePerformance("gratitude", "ending: fly to the giver");`, of `playAscension`: `notePerformance("gratitude", "ending: 昇天");`, and of `sighAndTidy`: `notePerformance("gratitude", "ending: sigh");`.

- [ ] **Step 4: Run** `pnpm --filter frontend exec vitest run src/gratitude`. Expected: all pass, unchanged. Then lint, format and typecheck.

- [ ] **Step 5: Commit:** `git commit -m "feat: mark the gratitude mini-game's moments for the performance recorder" -- apps/frontend/src/gratitude/miniGameEngine.ts apps/frontend/src/gratitude/tierSlamAndPopIns.ts apps/frontend/src/gratitude/gameEndings.ts`.

---

### Task 8: The light's marks

**Files:** Modify `apps/frontend/src/stickers/light.ts`.

- [ ] **Step 1:** Add `import { notePerformance, timeOurWork } from "../performance/performanceRecorder";`. In `write`, the last line `shine({ x: x.toFixed(3), y: y.toFixed(3) });` becomes:

```ts
timeOurWork("light", () => shine({ x: x.toFixed(3), y: y.toFixed(3) }));
notePerformance("light", `write to ${readers.size} readers`);
```

In `fromTilt`, `sweepVisible(win);` becomes:

```ts
const measured = timeOurWork("light sweep", () => sweepVisible(win));
notePerformance("light", `sweep measured ${measured} resins`);
```

- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run src/stickers/light.test.ts`. Expected: all pass. Then lint, format and typecheck.

- [ ] **Step 3: Commit:** `git commit -m "feat: mark the light's writes and sweeps for the performance recorder" -- apps/frontend/src/stickers/light.ts`.

---

### Task 9: The tray's and zipper's script time

**Files:** Modify `apps/frontend/src/sticker-board/tray/trayEngine.ts`, `apps/frontend/src/sticker-board/tray/zipper.ts`.

- [ ] **Step 1: `trayEngine.ts`.** Add `import { timeOurWork } from "../../performance/performanceRecorder";`. In `freePeel`, the peel's loop becomes:

```ts
const loop = () =>
  timeOurWork("sticker tray", () => {
    if (pk.target) {
      const was = pk.x;
      pk.x = lerp(pk.x, pk.target.x, 0.34);
      pk.y = lerp(pk.y, pk.target.y, 0.34);
      pk.vx = lerp(pk.vx, pk.x - was, 0.3);
      const out = clamp((pk.startX - pk.x) / 80, 0, 1);
      const ez = 1 - Math.pow(1 - out, 2);
      pk.scale = lerp(pk.r.w / pk.size.w, 1.04, ez);
      pk.rot = lerp(pk.r.r, clamp(pk.vx * 1.4, -12, 12), ez * 0.9);
      pk.el.style.transform = flyerAt(pk.x, pk.y, pk.size, pk.scale, pk.rot);
      showLanding(overBoard(pk.target) ? pk : null);
    }
    pk.raf = win.requestAnimationFrame(loop);
  });
```

- [ ] **Step 2: `zipper.ts`.** Add the same import (`../../performance/performanceRecorder`). `loop` becomes:

```ts
function loop(t: number) {
  timeOurWork("zipper", () => {
    raf = 0;
    const dt = Math.min(MAX_FRAME_S, Math.max(0, (t - last) / 1000));
    last = t;
    const n = Math.max(1, Math.ceil(dt * SUBSTEPS_PER_S));
    for (let i = 0; i < n; i++) step(dt / n);
    render();
    if (!still()) raf = win.requestAnimationFrame(loop);
    else settle();
  });
}
```

- [ ] **Step 3: Run** `pnpm --filter frontend exec vitest run src/sticker-board/tray`. Expected: all pass, unchanged. Then lint, format and typecheck.

- [ ] **Step 4: Commit:** `git commit -m "feat: time the sticker tray's and zipper's frames for the performance recorder" -- apps/frontend/src/sticker-board/tray/trayEngine.ts apps/frontend/src/sticker-board/tray/zipper.ts`.

---

### Task 10: Verify

- [ ] **Step 1:** `pnpm check` passes.
- [ ] **Step 2: One code review** of every commit from Task 1 on (superpowers:requesting-code-review). Fix what it finds, one `fix:` commit per finding, and rerun the affected tests.
- [ ] **Step 3: Smoke run in Chromium** with the Playwright MCP tools. Start `pnpm --filter frontend dev --port 5199 --strictPort` in the background, resize to 390×844, open `http://localhost:5199/`, then run with `browser_run_code_unsafe`:

```js
async (page) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:5199",
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.getByRole("button", { name: /: your stats$/ }).click();
  await page.getByLabel("Full effects").check();
  await page.getByLabel("Record performance").check();
  await page.getByRole("button", { name: "Try the gratitude mini-game" }).click();
  const underGame = await page.evaluate(() => {
    const screen = document.querySelector(".phone > .screen");
    return screen instanceof HTMLElement && screen.inert && screen.style.visibility === "hidden";
  });
  const box = await page.locator(".gr-heart-btn").boundingBox();
  for (let i = 0; i < 200 && (await page.locator(".gr-receipt").count()) === 0; i++) {
    await page.mouse.click(box.x + box.width / 2 + (i % 2 ? 14 : -14), box.y + box.height / 2);
    await page.waitForTimeout(75);
  }
  await page.getByRole("button", { name: "Back to your board" }).click();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.mouse.move(300, 400);
  await page.waitForTimeout(200);
  const light = await page.evaluate(() => ({
    root: document.documentElement.style.getPropertyValue("--lx"),
    resins: [...document.querySelectorAll(".live-resin")].filter(
      (el) => el instanceof HTMLElement && el.style.getPropertyValue("--lx") !== "",
    ).length,
  }));
  await page.getByRole("button", { name: "Copy report" }).click();
  const report = await page.evaluate(() => navigator.clipboard.readText());
  return { underGame, light, report };
};
```

Pass when: `underGame` is true; `light.root` is `""` and `light.resins` is over 0; the report has the summary lines (`recorded ·`, `Typical frame`, `Slow frames by screen` with `Send gratitude`), at least one slow-frame line matching `/^\d+:\d\d\.\d .+: \d+ms \(typical/m` with an `ours` line naming `gratitude`, and `gratitude: tier-up`, `gratitude: slam`, `gratitude: spray` and `long frame` lines. Then turn Record performance off and check the summary line stops changing. Paste the report into the handback.

- [ ] **Step 4: The owner's check on the phone:** the recording in "How to use it". Its report decides the next round.

---

## Open questions

1. **The engine's own light.** Besides the page root, the engine writes `--lx`/`--ly` onto the game's root while a thumb holds the heart. Task 4 moves that onto the gloss rather than removing it. On a phone the app's light already follows the same finger, so the thumb light could go entirely; that's the owner's call.
2. **Paint, not style.** `visibility: hidden` stops the board painting, but its CSS animations (every resin's specular sway) still run. If the report still shows style and layout under the game, pausing the board's animations while the game covers it is the next step.
3. **Descendants that set `visibility: visible`** still paint under a hidden parent: the seal key and the smoothing bar in the drawing screen, and the received gift's figure. None shows while a game opens, and the game's opaque liner covers them regardless.
4. **The sweep still measures every mounted resin.** Task 4 drops the document query, not the measuring. The light's sweep mark reports how many it measured, so the recording shows whether that matters.
5. **Unverified guesses:** the slow-input threshold (48ms to the next paint), the 30 fps band (28–40ms), the first interval's 30 fps pace, and whether LINE's WebView lets Copy report use the clipboard (the text box covers a refusal).
6. **The Show frame times switch** and `frameTimeReadout.ts` overlap the recorder. AGENTS.MD's hard deprecation suggests removing them once the recorder has worked on the phone; not in this plan.
