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
}

/** A typical frame in this band is 30 fps: iOS's Low Power Mode, or the browser throttling the page. */
const THIRTY_FPS_MS = { from: 28, to: 40 };

const count = (n: number) => n.toLocaleString("en-US");
const ms = (value: number, digits = 0) => `${value.toFixed(digits)}ms`;
const share = (part: number, whole: number) =>
  `${whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0"}%`;
const fps = (typicalMs: number) => Math.round(1000 / typicalMs);
const screenName = (screen: string) => screen || "untitled";
const calls = (n: number) => `${count(n)} ${n === 1 ? "call" : "calls"}`;
const range = ({ min, max }: Span, digits: number) =>
  `${min.toFixed(digits)}–${max.toFixed(digits)}`;

/** Samples a move, on average and at most, or that the browser has no such list. */
const perMove = (samples: SampleCount | null, moves: number, name: string) =>
  samples === null
    ? `no ${name} events`
    : `${(moves > 0 ? samples.total / moves : 0).toFixed(1)} ${name} a move (most ${samples.most})`;

/** One kind of pointer: its contacts and hovering, how hard and how big, and the samples a move carried. */
function pointerLine(type: string, kind: PointerKindSummary): string {
  const head = `${type}: ${count(kind.downs)} down, ${count(kind.moves)} moves, ${count(kind.hovers)} hovering`;
  const { pressure, width, height } = kind;
  if (!pressure || !width || !height) return `${head} · no contact`;
  return [
    head,
    `pressure ${range(pressure, 2)}`,
    `contact ${range(width, 1)} × ${range(height, 1)}px`,
    perMove(kind.coalesced, kind.moves, "coalesced"),
    perMove(kind.predicted, kind.moves, "predicted"),
  ].join(" · ");
}

/** The pointers seen, for checking a Pencil, or that none was. */
function pointerLines(pointers: PerformanceSummary["pointers"]): string[] {
  if (pointers.size === 0) return ["Pointers: none seen", ""];
  return ["Pointers", ...[...pointers].map(([type, kind]) => `  ${pointerLine(type, kind)}`), ""];
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
  if (summary.frames === 0) return "Nothing recorded yet";
  const { slow, frames, worst } = summary;
  return [
    span(summary.recordedMs),
    `${count(slow)} slow of ${count(frames)} frames (${share(slow, frames)})`,
    ...(worst ? [`worst ${ms(worst.ms)}`] : []),
    `${fps(summary.typicalMs)} fps`,
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
  return [
    `${since(frame.start, startedAt)} ${screenName(frame.screen)}: ${ms(frame.end - frame.start)} (typical ${ms(frame.typicalMs, 1)})`,
    `  ours ${ms(ours, 1)}${split ? `: ${split}` : ""}`,
    ...happened.map(({ line, times }) => (times > 1 ? `${line} ×${times}` : line)),
  ];
}

/** 2.41s: a moment on the page's clock, from when the page began to load. */
const onPageClock = (at: number) => `${(at / 1000).toFixed(2)}s`;

/** Each step of the start, on the page's clock. */
function startLines(start: readonly BootMilestone[]): string[] {
  if (start.length === 0) return [];
  return [
    "Start, on the page's clock",
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
  const head = `${w.label.charAt(0).toUpperCase()}${w.label.slice(1)}`;
  if (w.frames === 0) return `${head}: no frames recorded`;
  const typical = percentile(w.intervals, 0.5);
  return [
    `${head}: ${count(w.frames)} frames in ${(shown / 1000).toFixed(1)}s`,
    `${count(w.slow)} slow (${share(w.slow, w.frames)})`,
    ...(w.worst
      ? [`worst ${ms(w.worst.ms)} at +${((w.worst.at - w.from) / 1000).toFixed(1)}s`]
      : []),
    `typical ${ms(typical, 1)} (${fps(typical)} fps)`,
    `95th percentile ${ms(percentile(w.intervals, 0.95), 1)}`,
  ].join(" · ");
}

/** Lines for the stretches watched, or why the board's first seconds weren't. */
function windowLines(summary: PerformanceSummary, start: readonly BootMilestone[]): string[] {
  if (summary.windows.length > 0) return [...summary.windows.map(windowLine), ""];
  if (!start.some((m) => m.step === "board complete")) return [];
  return ["The 5s after the board was complete: not recorded, as the recorder was off then", ""];
}

/** The report, as plain text to paste into a chat. */
export function formatPerformanceReport({
  summary,
  slowFrames,
  takenAt,
  device,
  start = [],
}: ReportInput): string {
  const head = `Performance report, taken ${takenAt.toISOString()}`;
  if (summary.frames === 0) {
    return [head, device, "", ...startLines(start), "Nothing recorded yet"].join("\n");
  }
  const { worst, startedAt, typicalMs } = summary;
  const lines = [
    head,
    device,
    "",
    ...startLines(start),
    ...windowLines(summary, start),
    `${span(summary.recordedMs)} recorded · ${count(summary.frames)} frames · ${count(summary.slow)} slow (${share(summary.slow, summary.frames)})`,
    ...(worst
      ? [`Worst ${ms(worst.ms)} at ${since(worst.at, startedAt)} on ${screenName(worst.screen)}`]
      : []),
    `Typical frame ${ms(typicalMs, 1)} (${fps(typicalMs)} fps)`,
    ...(typicalMs >= THIRTY_FPS_MS.from && typicalMs <= THIRTY_FPS_MS.to
      ? ["30 fps: Low Power Mode or throttling"]
      : []),
    "",
    ...pointerLines(summary.pointers),
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
