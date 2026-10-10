/**
 * A timelapse as numbers: when each recorded point, fill and layer step plays, and what's due by any
 * moment. Every point and pause plays at one speed, so strokes keep their shapes and the speed ratios
 * between them; only pauses are squeezed first, so long ones vanish and short ones keep their rhythm.
 */
import {
  STRIDE,
  type FillOp,
  type LayerStep,
  type Step,
  type StrokeOp,
} from "../../sticker-creation/canvas/ops";

/** Before the speed-up, a pause of any length plays as at most this: short ones keep their rhythm. */
export const MAX_IDLE_MS = 300;
/** Before the speed-up, a hold inside a stroke counts at most this long per point step. */
export const MAX_POINT_STEP_MS = 150;
/** The sticker plays this many times faster than it was drawn, within the length's bounds. */
export const SPEEDUP = 15;
/** A timelapse plays at least this long, however quickly the sticker was drawn… */
export const MIN_LENGTH_MS = 2500;
/** …and at most this long, however slowly… */
export const MAX_LENGTH_MS = 6000;
/** …or this long for a sticker drawn in Kyoto Seika Manga Expression Practice Mode, whose clock runs ten times longer. */
export const KYOTO_SEIKA_MAX_LENGTH_MS = 20_000;
/** A fill's reveal in the shortest timelapse, and in the longest. */
export const MIN_FILL_REVEAL_MS = 150;
export const MAX_FILL_REVEAL_MS = 200;
/** The fills' reveals together take at most this share of the length. */
export const MAX_FILL_SHARE = 0.25;
/** The beat of a layer step that shows over time: an added layer's sheen, a fade, an opacity's ease. Tunable. */
export const LAYER_BEAT_MS = 180;
/** The layer steps' beats together take at most this share of the length. Tunable. */
export const MAX_LAYER_BEAT_SHARE = 0.15;

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

/** A layer step on the playback clock: its beat runs from `start` to `end`, ms; none for one shown at once. */
export interface ScheduledLayerStep {
  kind: "layer";
  step: LayerStep;
  start: number;
  end: number;
}

type ScheduledStep = ScheduledStroke | ScheduledFill | ScheduledLayerStep;

export interface TimelapseSchedule {
  steps: ScheduledStep[];
  /** When the last step is played, ms. */
  length: number;
}

const isStroke = (step: Step): step is StrokeOp => step.tool === "brush" || step.tool === "eraser";
const pointCount = (op: StrokeOp) => Math.floor(op.pts.length / STRIDE);
const pointMs = (op: StrokeOp, p: number) => op.pts[p * STRIDE + 3] ?? 0;
/** How long the step took as drawn: a stroke's last point's time, nothing for anything else. */
const drawnMs = (step: Step) => (isStroke(step) ? pointMs(step, pointCount(step) - 1) : 0);

/** A move, a lock or a clip shows at once; the other layer steps change what shows over a beat. */
const takesBeat = (step: Step) =>
  step.tool === "add" || step.tool === "delete" || step.tool === "clear" || step.tool === "opacity";

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
 * The session-clock pause before each step. `T` pauses with the clock, which starts as the first op
 * lands, so an op stamped at 0 drew before the clock ran and none of its time is on it.
 */
function gapsBefore(steps: readonly Step[]): number[] {
  return steps.map((step, i) => {
    if (i === 0) return 0;
    const before = steps[i - 1];
    const onClock = i === 1 && before.T === 0 ? 0 : drawnMs(before);
    return Math.max(0, step.T - before.T - onClock);
  });
}

/**
 * Each fill's reveal: paced with the length, up to its longest in a timelapse of MAX_LENGTH_MS or
 * more, and shorter when there are too many to fit.
 */
function fillRevealMs(length: number, fills: number): number {
  const pace = Math.min(1, (length - MIN_LENGTH_MS) / (MAX_LENGTH_MS - MIN_LENGTH_MS));
  const paced = MIN_FILL_REVEAL_MS + (MAX_FILL_REVEAL_MS - MIN_FILL_REVEAL_MS) * pace;
  return Math.min(paced, (MAX_FILL_SHARE * length) / fills);
}

/**
 * When every step plays. Fills' reveals and layer steps' beats come out of the length rather than
 * adding to it; under reduced motion there are none, and their time goes to the strokes.
 */
export function scheduleTimelapse(
  steps: readonly Step[],
  { reduced, kyotoSeika = false }: { reduced: boolean; kyotoSeika?: boolean },
): TimelapseSchedule {
  const held = steps.map((step) => (isStroke(step) ? heldPointMs(step) : []));
  const idle = gapsBefore(steps).map(idleMs);
  const drawn =
    held.reduce((sum, times) => sum + (times.at(-1) ?? 0), 0) + idle.reduce((a, b) => a + b, 0);
  const longest = kyotoSeika ? KYOTO_SEIKA_MAX_LENGTH_MS : MAX_LENGTH_MS;
  const length = Math.min(longest, Math.max(MIN_LENGTH_MS, drawn / SPEEDUP));
  const fills = steps.filter((step) => step.tool === "fill").length;
  const reveal = reduced || fills === 0 ? 0 : fillRevealMs(length, fills);
  const beats = steps.filter(takesBeat).length;
  const beat =
    reduced || beats === 0 ? 0 : Math.min(LAYER_BEAT_MS, (MAX_LAYER_BEAT_SHARE * length) / beats);
  // Nothing drawn over time (a dot, or fills alone) has nothing to speed up.
  const speed = drawn > 0 ? (length - fills * reveal - beats * beat) / drawn : 0;

  let clock = 0;
  const scheduled = steps.map((step, i): ScheduledStep => {
    clock += idle[i] * speed;
    const start = clock;
    if (isStroke(step)) {
      const at = held[i].map((ms) => start + ms * speed);
      clock = at.at(-1) ?? clock;
      return { kind: "stroke", op: step, at };
    }
    if (step.tool === "fill") {
      clock += reveal;
      return { kind: "fill", op: step, start, end: clock };
    }
    if (takesBeat(step)) clock += beat;
    return { kind: "layer", step, start, end: clock };
  });
  return { steps: scheduled, length: clock };
}

/** How far playback has gone: the step in progress, and how many of a stroke's points are painted. */
export interface PlaybackCursor {
  step: number;
  painted: number;
}

export const startOfPlayback = (): PlaybackCursor => ({ step: 0, painted: 0 });

export const playbackDone = (schedule: TimelapseSchedule, cursor: PlaybackCursor) =>
  cursor.step >= schedule.steps.length;

/**
 * One paint for a frame: a stroke's points [from, to), or how far a fill's reveal or a layer step's
 * beat has gone, 1 when whole.
 */
export type PaintStep =
  | { kind: "stroke"; index: number; op: StrokeOp; from: number; to: number }
  | { kind: "reveal"; index: number; op: FillOp; progress: number }
  | { kind: "layer"; index: number; step: LayerStep; progress: number };

/** What to paint, in order, to bring the sheet up to playback time `t`; moves `cursor` past it. */
export function stepsDue(
  schedule: TimelapseSchedule,
  cursor: PlaybackCursor,
  t: number,
): PaintStep[] {
  const due: PaintStep[] = [];
  while (!playbackDone(schedule, cursor)) {
    const index = cursor.step;
    const scheduled = schedule.steps[index];
    if (scheduled.kind === "stroke") {
      const { at, op } = scheduled;
      let painted = cursor.painted;
      while (painted < at.length && at[painted] <= t) painted++;
      if (painted > cursor.painted)
        due.push({ kind: "stroke", index, op, from: cursor.painted, to: painted });
      cursor.painted = painted;
      if (painted < at.length) break;
    } else {
      if (t < scheduled.start) break;
      const span = scheduled.end - scheduled.start;
      const progress = span > 0 ? Math.min(1, (t - scheduled.start) / span) : 1;
      if (progress > 0) {
        due.push(
          scheduled.kind === "fill"
            ? { kind: "reveal", index, op: scheduled.op, progress }
            : { kind: "layer", index, step: scheduled.step, progress },
        );
      }
      if (progress < 1) break;
    }
    cursor.step++;
    cursor.painted = 0;
  }
  return due;
}
