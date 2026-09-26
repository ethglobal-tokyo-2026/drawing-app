import type { ReplayV1 } from "@drawing-app/api/client";
import type { HeartBox } from "../miniHeartPhysics";
import { STAGE_UNITS } from "../replayRecorder";
import { heartRest, LIVE_FRAME } from "../stageLayout";

/** A combo that lasted up to this long replays in real time. */
export const REPLAY_REAL_TIME_MS = 4000;
/** A longer one replays on a clock sped up to take REPLAY_REAL_TIME_MS, at most this much faster. */
export const MAX_REPLAY_SPEED = 2;

/** How fast a combo of `durationMs` replays: 1 is real time. */
export const replaySpeed = (durationMs: number) =>
  Math.min(MAX_REPLAY_SPEED, Math.max(1, durationMs / REPLAY_REAL_TIME_MS));

/** A place on the replay's stage, px from its top left. */
export interface StagePoint {
  x: number;
  y: number;
}

/** One recorded input, `at` ms after the combo's first hit, placed on the replay's stage. */
export type FeedInput =
  | { kind: "touch"; at: number; point: StagePoint; counted: boolean }
  | { kind: "strokeStart"; at: number; point: StagePoint }
  /** `fastPass` is null for replays recorded before stroke passes were. */
  | { kind: "strokeMove"; at: number; point: StagePoint; fastPass: boolean | null }
  | { kind: "strokeEnd"; at: number }
  | { kind: "reversal"; at: number; direction: 1 | -1 };

export interface ReplayFeed {
  /** Every input, in time order. */
  readonly inputs: readonly FeedInput[];
  /** When the combo ended, ms after its first hit, and why. */
  readonly end: { at: number; reason: ReplayV1["endReason"] };
  /** The inputs due by `at` that haven't been returned yet, in order. */
  due: (at: number) => FeedInput[];
}

/** Rows of `size` values from a flat series, the first `summed` of each added to the row before's. */
function runningRows(flat: readonly number[], size: number, summed: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i + size <= flat.length; i += size) {
    const before = rows.at(-1);
    rows.push(flat.slice(i, i + size).map((v, j) => (before && j < summed ? before[j] + v : v)));
  }
  return rows;
}

/**
 * At the same ms: touches, then the stroke finger, then reversals. The live combo heard them in that
 * order: every touch the replay kept came before any commit, and the shake unlock let go of the stroke.
 */
const TIE_ORDER: Record<FeedInput["kind"], number> = {
  touch: 0,
  strokeStart: 1,
  strokeMove: 1,
  strokeEnd: 1,
  reversal: 2,
};

/**
 * The replay's inputs in time order, each position moved from the recording's stage onto the
 * replay's: the same place relative to the heart, in heart widths from its middle. `target` is the
 * replay stage's heart at rest.
 */
export function createReplayFeed(replay: ReplayV1, target: HeartBox): ReplayFeed {
  const [width, height] = replay.stage;
  // Both hearts have the art's aspect, so a stroke scales evenly and keeps its shape. Nothing is
  // clamped to the replay's stage: that would bend the strokes the detector and effects read.
  const recorded = heartRest(width, height, LIVE_FRAME);
  const place = (x: number, y: number): StagePoint => ({
    x: target.x + (((x / STAGE_UNITS) * width - recorded.x) / recorded.width) * target.width,
    y: target.y + (((y / STAGE_UNITS) * height - recorded.y) / recorded.height) * target.height,
  });

  const touches = runningRows(replay.hits, 4, 3).map(([at, x, y, counted]): FeedInput => ({
    kind: "touch",
    at,
    point: place(x, y),
    counted: counted === 1,
  }));
  const reversals = runningRows(replay.shakes, 2, 1).map(([at, direction]): FeedInput => ({
    kind: "reversal",
    at,
    direction: direction < 0 ? -1 : 1,
  }));
  // One stroke finger at a time: a finger that went down while another stroked starts its stroke
  // when that one lifts, as the engine heard it.
  const strokeInputs: FeedInput[] = [];
  let lifted = 0;
  for (const [stroke, series] of replay.strokes.entries()) {
    const passes = replay.strokePasses?.[stroke];
    const samples = runningRows(series, 3, 3);
    for (const [i, [ms, x, y]] of samples.entries()) {
      const at = Math.max(ms, lifted);
      const point = place(x, y);
      const fastPass = passes ? passes.includes(i) : null;
      if (i === 0) strokeInputs.push({ kind: "strokeStart", at, point });
      // A combo that began mid-stroke keeps it from its first hit, which can be a pass: the finger
      // starts there, and that move ends the pass.
      if (i > 0 || fastPass) strokeInputs.push({ kind: "strokeMove", at, point, fastPass });
      lifted = at;
    }
    if (samples.length > 0) strokeInputs.push({ kind: "strokeEnd", at: lifted });
  }

  // Each group is in time order already, and the sort is stable, so ties keep TIE_ORDER.
  const inputs = [...touches, ...strokeInputs, ...reversals].sort(
    (a, b) => a.at - b.at || TIE_ORDER[a.kind] - TIE_ORDER[b.kind],
  );
  let next = 0;
  return {
    inputs,
    end: { at: replay.durationMs, reason: replay.endReason },
    due(at) {
      const from = next;
      while (next < inputs.length && inputs[next].at <= at) next++;
      return inputs.slice(from, next);
    },
  };
}
