import { describe, expect, it } from "vitest";
import { replayV1Schema } from "./replay.ts";
import { STAGE_CENTRE, TAP_GAP_MS, tapReplay } from "./testReplays.ts";

/** A replay with one stroke of `samples` samples, TAP_GAP_MS apart, from the stage's centre. */
const withStroke = (samples: number, strokePasses?: number[][]) => ({
  ...tapReplay(2),
  strokes: [
    Array.from({ length: samples }, (_, at) =>
      at === 0 ? [0, STAGE_CENTRE, STAGE_CENTRE] : [TAP_GAP_MS, 0, 0],
    ).flat(),
  ],
  ...(strokePasses && { strokePasses }),
});

const parses = (replay: object) => replayV1Schema.safeParse(replay).success;

describe("a replay's stroke passes", () => {
  it("are optional, for replays recorded before them", () => {
    expect(parses(withStroke(4))).toBe(true);
  });

  it("name later samples of their own stroke", () => {
    expect(parses(withStroke(4, [[1, 3]]))).toBe(true);
    expect(parses(withStroke(4, [[3, 1]]))).toBe(false);
    expect(parses(withStroke(4, [[4]]))).toBe(false);
  });

  it("come as one list per stroke", () => {
    expect(parses(withStroke(4, [[1], [2]]))).toBe(false);
  });

  it("survive parsing", () => {
    expect(replayV1Schema.parse(withStroke(4, [[2]])).strokePasses).toEqual([[2]]);
  });
});
