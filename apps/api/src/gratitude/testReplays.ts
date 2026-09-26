import { randomUUID } from "node:crypto";
import { ONE_TAP } from "../testing/rows.ts";
import type { RecordGratitude } from "./record.ts";
import { STAGE_UNITS, type ReplayV1 } from "./replay.ts";

/** The time between a tap combo's touches: quick enough that MAX_HITS + 1 of them fit in a combo. */
export const TAP_GAP_MS = 50;
/** The middle of the stage, where a tap combo's touches land. */
export const STAGE_CENTRE = STAGE_UNITS / 2;
const PHONE_WIDTH_PX = 390;
const PHONE_HEIGHT_PX = 844;
/** A fixed seed, so a replay compares equal to itself read back. */
const SEED = 7;
const FULL_INTENSITY = 1;
const GAME_CONFIG_VERSION = "test";

/** One touch of a replay's `hits`: the ms since the touch before, the change in x and y, and whether it counted. */
export const touch = (msSincePrevious: number, dx: number, dy: number, counted = true) => [
  msSincePrevious,
  dx,
  dy,
  counted ? 1 : 0,
];

/** A valid tap combo: `hitCount` counted touches at the stage's centre, TAP_GAP_MS apart. */
export function tapReplay(hitCount: number): ReplayV1 {
  const hits = Array.from({ length: hitCount }, (_, at) =>
    at === 0 ? touch(0, STAGE_CENTRE, STAGE_CENTRE) : touch(TAP_GAP_MS, 0, 0),
  ).flat();
  return {
    v: 1,
    seed: SEED,
    intensity: FULL_INTENSITY,
    stage: [PHONE_WIDTH_PX, PHONE_HEIGHT_PX],
    // The last touch lands at (hitCount - 1) gaps; the combo ends a gap after it.
    durationMs: hitCount * TAP_GAP_MS,
    endReason: hitCount === 1 ? "sent" : "empty",
    switchedAtHit: null,
    hits,
    strokes: [],
    shakes: [],
  };
}

/** A valid RecordGratitude for `giftId`: ONE_TAP and its replay, with a new idempotencyKey. */
export const recordBody = (
  giftId: string,
  overrides: Partial<RecordGratitude> = {},
): RecordGratitude => ({
  idempotencyKey: randomUUID(),
  giftId,
  ...ONE_TAP,
  gameConfigVersion: GAME_CONFIG_VERSION,
  replay: tapReplay(ONE_TAP.hits),
  ...overrides,
});
