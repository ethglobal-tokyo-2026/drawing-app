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
const calls = (n: number) => `${count(n)} ${n === 1 ? "call" : "calls"}`;

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
