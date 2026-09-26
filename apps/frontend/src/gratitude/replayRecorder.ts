import type { ReplayV1 } from "../api/contract";
import type { ComboEvent } from "./combo";

/** Positions run from 0 to this, across the stage and down it. */
export const STAGE_UNITS = 10_000;
/**
 * A stroke keeps a move only this long after the one before it: about 30 a second from the 60 or
 * 120 a phone reports. A move that ends a fast pass is kept however soon it comes.
 */
export const STROKE_SAMPLE_GAP_MS = 30;

type Ended = Extract<ComboEvent, { kind: "ended" }>;
type Answer = Extract<ComboEvent, { kind: "hit" | "limited" }>;

/** A stroke sample: the caller's time, and where, in stage units. */
interface Sample {
  t: number;
  x: number;
  y: number;
}

export interface ReplayRecorderOptions {
  /** What the pop-in lines and particles are drawn from. */
  seed: number;
  /** The effects' dial, 0–1. */
  intensity: number;
  /** The stage's size, px. */
  width: number;
  height: number;
}

export interface ReplayRecorder {
  /** The stage's new size, px: positions from now on are shares of it. */
  resize: (width: number, height: number) => void;
  /**
   * A touch-down on the heart, or the first tap's release, at (x, y) in stage px, with what
   * `tapHeart` answered. It's kept if it counted or was rate-limited: every touch the combo heard.
   */
  touch: (x: number, y: number, answer: readonly ComboEvent[]) => void;
  /** A shake reversal the combo heard, the unlock or one after it, with what it answered. */
  shake: (direction: number, answer: readonly ComboEvent[]) => void;
  /** The stroke finger went down at `t`, on the caller's clock, at (x, y) in stage px. */
  strokeStart: (t: number, x: number, y: number) => void;
  /** The stroke finger moved. `fastPass`: the move ended a fast pass. */
  strokeMove: (t: number, x: number, y: number, fastPass: boolean) => void;
  strokeEnd: () => void;
  /** The combo's replay, from what it heard and the `ended` event that closed it. */
  finish: (ended: Ended) => ReplayV1;
}

/** The combo's answer to an input it heard: a hit or a rate-limited one. */
const heard = (answer: readonly ComboEvent[]) =>
  answer.find((e): e is Answer => e.kind === "hit" || e.kind === "limited");

/** Rows as one flat list, the first `running` values of each after the first stored as the change. */
function changes(rows: readonly (readonly number[])[], running: number): number[] {
  return rows.flatMap((row, i) =>
    row.map((value, j) => (i > 0 && j < running ? value - rows[i - 1][j] : value)),
  );
}

/**
 * Rows whose first value is a time, in time order and none after `end`. A rate-limited touch can
 * carry a later time than the touch after it when a key and a finger tap together: it moves back
 * to that touch's time. A counted one never moves, so the counted times stay the record's.
 */
function inTimeOrder(rows: readonly (readonly number[])[], end: number): number[][] {
  const ordered = rows.map((row) => [...row]);
  let next = end;
  for (let i = ordered.length - 1; i >= 0; i--) {
    ordered[i][0] = Math.min(ordered[i][0], next);
    next = ordered[i][0];
  }
  return ordered;
}

/**
 * Collects a gratitude combo as it's played, with no DOM: every touch the combo heard, the stroke
 * finger's path, the shake reversals, and at the end what the replay needs besides. Touches and
 * reversals take the combo's own times, so the counted ones' times are the record's `hitTimes`.
 * Stroke samples are timed on the caller's clock until the end says when the combo started. A
 * replay stores each time and position as the change from the one before, the first as it is.
 */
export function createReplayRecorder(options: ReplayRecorderOptions): ReplayRecorder {
  let { width, height } = options;
  const unit = (px: number, size: number) =>
    Math.min(STAGE_UNITS, Math.max(0, Math.round((px / size) * STAGE_UNITS)));
  /** [ms after the first hit, x, y, counted]. */
  const touches: number[][] = [];
  /** [ms after the first hit, direction]. */
  const reversals: number[][] = [];
  const gestures: Sample[][] = [];
  let gesture: Sample[] | null = null;
  /** The gesture's latest move, when it came too soon to keep: where the finger was last. */
  let unkept: Sample | null = null;

  const closeGesture = () => {
    if (gesture && unkept) gesture.push(unkept);
    gesture = null;
    unkept = null;
  };

  return {
    resize(w, h) {
      width = w;
      height = h;
    },

    touch(x, y, answer) {
      const e = heard(answer);
      if (e) touches.push([e.at, unit(x, width), unit(y, height), e.kind === "hit" ? 1 : 0]);
    },

    shake(direction, answer) {
      const e = heard(answer);
      if (e) reversals.push([e.at, direction < 0 ? -1 : 1]);
    },

    strokeStart(t, x, y) {
      closeGesture();
      gesture = [{ t, x: unit(x, width), y: unit(y, height) }];
      gestures.push(gesture);
    },

    strokeMove(t, x, y, fastPass) {
      if (!gesture) return;
      const sample = { t, x: unit(x, width), y: unit(y, height) };
      if (fastPass || t - gesture[gesture.length - 1].t >= STROKE_SAMPLE_GAP_MS) {
        gesture.push(sample);
        unkept = null;
      } else unkept = sample;
    },

    strokeEnd: closeGesture,

    finish({ record, reason, startedAt }) {
      closeGesture();
      const end = record.durationMs;
      // Samples from the first hit to the end, on the record's clock.
      const strokes = gestures.flatMap((samples) => {
        const rows: number[][] = [];
        for (const s of samples) {
          const at = Math.round(s.t - startedAt);
          if (at < 0 || at > end) continue;
          const previous = rows.length > 0 ? rows[rows.length - 1][0] : 0;
          rows.push([Math.max(previous, at), s.x, s.y]);
        }
        return rows.length > 0 ? [changes(rows, 3)] : [];
      });
      return {
        v: 1,
        seed: options.seed >>> 0,
        intensity: Math.min(1, Math.max(0, options.intensity)),
        stage: [Math.max(1, Math.round(width)), Math.max(1, Math.round(height))],
        durationMs: end,
        endReason: reason,
        switchedAtHit: record.switchedAtHit,
        hits: changes(inTimeOrder(touches, end), 3),
        strokes,
        shakes: changes(inTimeOrder(reversals, end), 1),
      };
    },
  };
}
