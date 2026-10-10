import { i18next } from "../i18n/i18n";
import type { BootMilestone } from "./bootMilestones";
import type {
  FrameWindow,
  PerformanceSummary,
  PointerKindSummary,
  SampleCount,
  SlowFrame,
  Span,
} from "./performanceRecorder";

export interface ReportInput {
  summary: PerformanceSummary;
  slowFrames: readonly SlowFrame[];
  takenAt: Date;
  /** The device and its browser, from `describeDevice`. */
  device: string;
  /** This open's start, step by step, from `readBootMilestones`. */
  start?: readonly BootMilestone[];
  /** The most characters the report may have: it leaves out its oldest slow frames to fit. */
  within?: number;
}

/** A typical frame in this band is 30 fps: iOS's Low Power Mode, or the browser throttling the page. */
const THIRTY_FPS_MS = { from: 28, to: 40 };

const count = (n: number) => n.toLocaleString("en-US");
const ms = (value: number, digits = 0) => `${value.toFixed(digits)}ms`;
const share = (part: number, whole: number) =>
  `${whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0"}%`;
const fps = (typicalMs: number) => `${Math.round(1000 / typicalMs)} fps`;
const screenName = (screen: string) =>
  screen || i18next.t(($) => $.stickerBoard.developer.performance.lines.untitled);
const calls = (n: number) =>
  i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.calls, {
    count: n,
    calls: count(n),
  });
const range = ({ min, max }: Span, digits: number) =>
  `${min.toFixed(digits)}–${max.toFixed(digits)}`;

/**
 * Samples a move, on average and at most, or that the browser has no such list. `events` names the
 * list as PointerEvent does: coalesced or predicted.
 */
const perMove = (samples: SampleCount | null, moves: number, events: string) =>
  samples === null
    ? i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noEvents, { events })
    : i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.perMove, {
        average: (moves > 0 ? samples.total / moves : 0).toFixed(1),
        events,
        most: samples.most,
      });

/** One kind of pointer: its contacts and hovering, how hard and how big, and the samples a move carried. */
function pointerLine(pointer: string, kind: PointerKindSummary): string {
  const head = i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.counts, {
    pointer,
    downs: count(kind.downs),
    moves: count(kind.moves),
    hovers: count(kind.hovers),
  });
  const { pressure, landing, width, height } = kind;
  if (!pressure || !width || !height)
    return `${head} · ${i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noContact)}`;
  return [
    head,
    i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.pressure, {
      range: range(pressure, 2),
    }),
    ...(landing
      ? [
          i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.landing, {
            range: range(landing, 2),
          }),
        ]
      : []),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.contact, {
      size: `${range(width, 1)} × ${range(height, 1)}px`,
    }),
    perMove(kind.coalesced, kind.moves, "coalesced"),
    perMove(kind.predicted, kind.moves, "predicted"),
  ].join(" · ");
}

/** The pointers seen, for checking a Pencil, or that none was. */
function pointerLines(pointers: PerformanceSummary["pointers"]): string[] {
  if (pointers.size === 0)
    return [i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.noneSeen), ""];
  return [
    i18next.t(($) => $.stickerBoard.developer.performance.lines.pointers.title),
    ...[...pointers].map(([pointer, kind]) => `  ${pointerLine(pointer, kind)}`),
    "",
  ];
}

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
  if (summary.frames === 0)
    return i18next.t(($) => $.stickerBoard.developer.performance.nothingYet);
  const { slow, frames, worst } = summary;
  return [
    span(summary.recordedMs),
    i18next.t(($) => $.stickerBoard.developer.performance.summary.slow, {
      slow: count(slow),
      frames: count(frames),
      share: share(slow, frames),
    }),
    ...(worst
      ? [
          i18next.t(($) => $.stickerBoard.developer.performance.summary.worst, {
            worst: ms(worst.ms),
          }),
        ]
      : []),
    fps(summary.typicalMs),
  ].join(" · ");
}

/** Repeats of an event this close to the one before are one line, counted. */
const REPEATS_WITHIN_MS = 20;

/** A slow frame: when, where, our work in it, and what happened around it, close repeats counted. */
function slowFrameLines(frame: SlowFrame, startedAt: number): string[] {
  const work = Object.entries(frame.ours).sort(([, a], [, b]) => b.ms - a.ms);
  const ours = work.reduce((sum, [, spent]) => sum + spent.ms, 0);
  const split = work
    .map(([label, spent]) => `${label} ${ms(spent.ms, 1)} (${calls(spent.calls)})`)
    .join(", ");
  const happened: { line: string; times: number; lastAt: number }[] = [];
  const latest = new Map<string, (typeof happened)[number]>();
  for (const event of frame.events) {
    const key = `${event.kind}: ${event.detail}`;
    const repeated = latest.get(key);
    if (repeated && event.at - repeated.lastAt <= REPEATS_WITHIN_MS) {
      repeated.times++;
      repeated.lastAt = event.at;
      continue;
    }
    const offset = Math.round(event.at - frame.start);
    const line = {
      line: `  ${offset < 0 ? "" : "+"}${offset}ms ${key}`,
      times: 1,
      lastAt: event.at,
    };
    happened.push(line);
    latest.set(key, line);
  }
  const oursLine = i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.ours, {
    ours: ms(ours, 1),
  });
  return [
    i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.frame, {
      at: since(frame.start, startedAt),
      screen: screenName(frame.screen),
      interval: ms(frame.end - frame.start),
      typical: ms(frame.typicalMs, 1),
    }),
    `  ${oursLine}${split ? `: ${split}` : ""}`,
    ...happened.map(({ line, times }) => (times > 1 ? `${line} ×${times}` : line)),
  ];
}

/** 2.41s: a moment on the page's clock, from when the page began to load. */
const onPageClock = (at: number) => `${(at / 1000).toFixed(2)}s`;

/** Each step of the start, on the page's clock. */
function startLines(start: readonly BootMilestone[]): string[] {
  if (start.length === 0) return [];
  return [
    i18next.t(($) => $.stickerBoard.developer.performance.lines.start),
    ...start.map(
      ({ step, at, detail }) => `  ${onPageClock(at)} ${step}${detail ? `: ${detail}` : ""}`,
    ),
    "",
  ];
}

/** The value `part` of the way up the sorted values, such as 0.95 for the 95th percentile. */
function percentile(values: readonly number[], part: number): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(part * sorted.length) - 1)] ?? 0;
}

/** A watched stretch's frames: how many, the slow ones, the worst, the pace and the long tail. */
function windowLine(w: FrameWindow): string {
  const shown = w.intervals.reduce((sum, interval) => sum + interval, 0);
  const label = `${w.label.charAt(0).toUpperCase()}${w.label.slice(1)}`;
  if (w.frames === 0)
    return i18next.t(($) => $.stickerBoard.developer.performance.lines.window.noFrames, { label });
  const typical = percentile(w.intervals, 0.5);
  return [
    i18next.t(($) => $.stickerBoard.developer.performance.lines.window.frames, {
      label,
      frames: count(w.frames),
      seconds: `${(shown / 1000).toFixed(1)}s`,
    }),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.window.slow, {
      slow: count(w.slow),
      share: share(w.slow, w.frames),
    }),
    ...(w.worst
      ? [
          i18next.t(($) => $.stickerBoard.developer.performance.lines.window.worst, {
            worst: ms(w.worst.ms),
            at: `+${((w.worst.at - w.from) / 1000).toFixed(1)}s`,
          }),
        ]
      : []),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.window.typical, {
      typical: ms(typical, 1),
      fps: fps(typical),
    }),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.window.percentile95, {
      interval: ms(percentile(w.intervals, 0.95), 1),
    }),
  ].join(" · ");
}

/** Lines for the stretches watched, or why the board's first seconds weren't. */
function windowLines(summary: PerformanceSummary, start: readonly BootMilestone[]): string[] {
  if (summary.windows.length > 0) return [...summary.windows.map(windowLine), ""];
  if (!start.some((m) => m.step === "board complete")) return [];
  return [i18next.t(($) => $.stickerBoard.developer.performance.lines.window.boardNotRecorded), ""];
}

/**
 * The report, as plain text to paste into a chat. Within a limit, it holds the latest slow frames
 * that fit, and says how many of the slow frames it holds. Its words are the developer slip's, which
 * stay English, so the server log reads the same whatever the app's language.
 */
export function formatPerformanceReport(input: ReportInput): string {
  const { slowFrames, within = Infinity } = input;
  let report = formatReport(input);
  let kept = slowFrames.length;
  // Slow frames run about as long as one another, so the share that fits is nearly the share to keep.
  while (report.length > within && kept > 0) {
    kept = Math.floor(kept * Math.min(0.9, within / report.length));
    report = formatReport({ ...input, slowFrames: slowFrames.slice(slowFrames.length - kept) });
  }
  return report;
}

function formatReport({ summary, slowFrames, takenAt, device, start = [] }: ReportInput): string {
  const head = i18next.t(($) => $.stickerBoard.developer.performance.lines.taken, {
    time: takenAt.toISOString(),
  });
  if (summary.frames === 0) {
    const nothingYet = i18next.t(($) => $.stickerBoard.developer.performance.nothingYet);
    return [head, device, "", ...startLines(start), nothingYet].join("\n");
  }
  const { worst, startedAt, typicalMs } = summary;
  const lines = [
    head,
    device,
    "",
    ...startLines(start),
    ...windowLines(summary, start),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.recorded, {
      span: span(summary.recordedMs),
      frames: count(summary.frames),
      slow: count(summary.slow),
      share: share(summary.slow, summary.frames),
    }),
    ...(worst
      ? [
          i18next.t(($) => $.stickerBoard.developer.performance.lines.worst, {
            worst: ms(worst.ms),
            at: since(worst.at, startedAt),
            screen: screenName(worst.screen),
          }),
        ]
      : []),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.typical, {
      typical: ms(typicalMs, 1),
      fps: fps(typicalMs),
    }),
    ...(typicalMs >= THIRTY_FPS_MS.from && typicalMs <= THIRTY_FPS_MS.to
      ? [i18next.t(($) => $.stickerBoard.developer.performance.lines.thirtyFps)]
      : []),
    "",
    ...pointerLines(summary.pointers),
    i18next.t(($) => $.stickerBoard.developer.performance.lines.byScreen.title),
    ...[...summary.byScreen]
      .sort(([, a], [, b]) => b.slow - a.slow)
      .map(
        ([screen, { frames, slow }]) =>
          `  ${i18next.t(($) => $.stickerBoard.developer.performance.lines.byScreen.screen, {
            screen: screenName(screen),
            slow: count(slow),
            frames: count(frames),
            share: share(slow, frames),
          })}`,
      ),
    "",
    slowFrames.length === summary.slow
      ? i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.all, {
          kept: slowFrames.length,
        })
      : i18next.t(($) => $.stickerBoard.developer.performance.lines.slowFrames.latest, {
          kept: slowFrames.length,
          slow: count(summary.slow),
        }),
  ];
  for (const frame of slowFrames) lines.push("", ...slowFrameLines(frame, startedAt));
  return lines.join("\n");
}
