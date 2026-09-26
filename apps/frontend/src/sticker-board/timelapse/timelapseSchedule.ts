/**
 * A timelapse as numbers: when each recorded point and fill plays, and what's due by any moment.
 * Every point and pause plays at one speed, so strokes keep their shapes and the speed ratios between
 * them; only pauses are squeezed first, so long ones vanish and short ones keep their rhythm.
 */
import { STRIDE, type FillOp, type Op, type StrokeOp } from "../../sticker-creation/canvas/ops";

/** Before the speed-up, a pause of any length plays as at most this: short ones keep their rhythm. */
export const MAX_IDLE_MS = 300;
/** Before the speed-up, a hold inside a stroke counts at most this long per point step. */
export const MAX_POINT_STEP_MS = 150;
/** The sticker plays this many times faster than it was drawn, within the length's bounds. */
export const SPEEDUP = 15;
/** A timelapse plays at least this long, however quickly the sticker was drawn… */
export const MIN_LENGTH_MS = 2500;
/** …and at most this long, however slowly. */
export const MAX_LENGTH_MS = 6000;
/** A fill's reveal in the shortest timelapse, and in the longest. */
export const MIN_FILL_REVEAL_MS = 150;
export const MAX_FILL_REVEAL_MS = 200;
/** The fills' reveals together take at most this share of the length. */
export const MAX_FILL_SHARE = 0.25;

/** A stroke on the playback clock: when each of its points is painted, ms from the start. */
export interface ScheduledStroke {
  kind: "stroke";
  op: StrokeOp;
  at: number[];
}

/** A fill on the playback clock: its reveal grows from `start` and is whole at `end`, ms. */
export interface ScheduledFill {
  kind: "fill";
  op: FillOp;
  start: number;
  end: number;
}

type ScheduledOp = ScheduledStroke | ScheduledFill;

export interface TimelapseSchedule {
  ops: ScheduledOp[];
  /** When the last op is painted, ms. */
  length: number;
}

const pointCount = (op: StrokeOp) => Math.floor(op.pts.length / STRIDE);
const pointMs = (op: StrokeOp, p: number) => op.pts[p * STRIDE + 3] ?? 0;
/** How long the op took as drawn: a stroke's last point's time, nothing for a fill. */
const drawnMs = (op: Op) => (op.tool === "fill" ? 0 : pointMs(op, pointCount(op) - 1));

/** A stroke's point times with each hold capped, ms after its first point. */
function heldPointMs(op: StrokeOp): number[] {
  const times = pointCount(op) > 0 ? [0] : [];
  for (let p = 1; p < pointCount(op); p++) {
    const step = Math.max(0, pointMs(op, p) - pointMs(op, p - 1));
    times.push(times[p - 1] + Math.min(step, MAX_POINT_STEP_MS));
  }
  return times;
}

/** A pause as it plays before the speed-up: nearly its own length when short, never over MAX_IDLE_MS. */
const idleMs = (gap: number) => MAX_IDLE_MS * (1 - Math.exp(-gap / MAX_IDLE_MS));

/**
 * The session-clock pause before each op. `T` pauses with the clock, which starts as the first op
 * lands, so an op stamped at 0 drew before the clock ran and none of its time is on it.
 */
function gapsBefore(ops: readonly Op[]): number[] {
  return ops.map((op, i) => {
    if (i === 0) return 0;
    const before = ops[i - 1];
    const onClock = i === 1 && before.T === 0 ? 0 : drawnMs(before);
    return Math.max(0, op.T - before.T - onClock);
  });
}

/** Each fill's reveal: paced with the length, and shorter when there are too many to fit. */
function fillRevealMs(length: number, fills: number): number {
  const pace = (length - MIN_LENGTH_MS) / (MAX_LENGTH_MS - MIN_LENGTH_MS);
  const paced = MIN_FILL_REVEAL_MS + (MAX_FILL_REVEAL_MS - MIN_FILL_REVEAL_MS) * pace;
  return Math.min(paced, (MAX_FILL_SHARE * length) / fills);
}

/** When every op plays. Fills' reveals come out of the length rather than adding to it. */
export function scheduleTimelapse(
  ops: readonly Op[],
  { reduced }: { reduced: boolean },
): TimelapseSchedule {
  const held = ops.map((op) => (op.tool === "fill" ? [] : heldPointMs(op)));
  const idle = gapsBefore(ops).map(idleMs);
  const drawn =
    held.reduce((sum, times) => sum + (times.at(-1) ?? 0), 0) + idle.reduce((a, b) => a + b, 0);
  const length = Math.min(MAX_LENGTH_MS, Math.max(MIN_LENGTH_MS, drawn / SPEEDUP));
  const fills = ops.filter((op) => op.tool === "fill").length;
  const reveal = reduced || fills === 0 ? 0 : fillRevealMs(length, fills);
  // Nothing drawn over time (a dot, or fills alone) has nothing to speed up.
  const speed = drawn > 0 ? (length - fills * reveal) / drawn : 0;

  let clock = 0;
  const scheduled = ops.map((op, i): ScheduledOp => {
    clock += idle[i] * speed;
    if (op.tool === "fill") {
      const start = clock;
      clock += reveal;
      return { kind: "fill", op, start, end: clock };
    }
    const start = clock;
    const at = held[i].map((ms) => start + ms * speed);
    clock = at.at(-1) ?? clock;
    return { kind: "stroke", op, at };
  });
  return { ops: scheduled, length: clock };
}

/** How far playback has painted: the op in progress, and how many of its points are on the ink. */
export interface PlaybackCursor {
  op: number;
  painted: number;
}

export const startOfPlayback = (): PlaybackCursor => ({ op: 0, painted: 0 });

export const playbackDone = (schedule: TimelapseSchedule, cursor: PlaybackCursor) =>
  cursor.op >= schedule.ops.length;

/** One paint for a frame: a stroke's points [from, to), or a fill's reveal so far, 1 when whole. */
export type PaintStep =
  | { kind: "stroke"; index: number; op: StrokeOp; from: number; to: number }
  | { kind: "reveal"; index: number; op: FillOp; progress: number };

/** What to paint, in order, to bring the ink up to playback time `t`; moves `cursor` past it. */
export function stepsDue(
  schedule: TimelapseSchedule,
  cursor: PlaybackCursor,
  t: number,
): PaintStep[] {
  const steps: PaintStep[] = [];
  while (!playbackDone(schedule, cursor)) {
    const index = cursor.op;
    const scheduled = schedule.ops[index];
    if (scheduled.kind === "stroke") {
      const { at, op } = scheduled;
      let due = cursor.painted;
      while (due < at.length && at[due] <= t) due++;
      if (due > cursor.painted)
        steps.push({ kind: "stroke", index, op, from: cursor.painted, to: due });
      cursor.painted = due;
      if (due < at.length) break;
    } else {
      if (t < scheduled.start) break;
      const span = scheduled.end - scheduled.start;
      const progress = span > 0 ? Math.min(1, (t - scheduled.start) / span) : 1;
      if (progress > 0) steps.push({ kind: "reveal", index, op: scheduled.op, progress });
      if (progress < 1) break;
    }
    cursor.op++;
    cursor.painted = 0;
  }
  return steps;
}
