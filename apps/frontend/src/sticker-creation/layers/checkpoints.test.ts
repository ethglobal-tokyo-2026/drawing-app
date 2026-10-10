import { describe, expect, it } from "vitest";
import { CHECKPOINT_COST, checkpointToDrop, HEAD_WINDOW, planCheckpoints } from "./checkpoints";
import { brush } from "./testLayerSteps";

/** Checkpoints every CHECKPOINT_COST steps through `last`, where every step costs 1. */
const everyCheckpointTo = (last: number) =>
  Array.from({ length: Math.floor(last / CHECKPOINT_COST) }, (_, i) => (i + 1) * CHECKPOINT_COST);

/**
 * The order the rule drops `kept` in, every step costing 1, until it says stop. Each checkpoint
 * owns one copy, and `otherCopies` more are owned by none of them, so dropping can't free those.
 */
function dropOrder(
  kept: readonly number[],
  {
    head = kept.at(-1) ?? 0,
    budget = 1,
    freed = () => 1,
    justTaken = null,
    otherCopies = 0,
  }: {
    head?: number;
    budget?: number;
    freed?: (at: number) => number;
    justTaken?: number | null;
    otherCopies?: number;
  } = {},
): number[] {
  const left = [...kept];
  const dropped: number[] = [];
  for (;;) {
    const at = checkpointToDrop({
      kept: left,
      head,
      costTo: (steps) => steps,
      copiesFreed: freed,
      copiesHeld: left.length + otherCopies,
      budget,
      justTaken,
    });
    if (at === null) return dropped;
    dropped.push(at);
    left.splice(left.indexOf(at), 1);
  }
}

/** Gaps between neighboring checkpoints, nearest the head first. */
const gapsBack = (planned: readonly number[]) =>
  planned
    .slice(1)
    .map((at, i) => at - planned[i])
    .toReversed();

describe("checkpointToDrop", () => {
  const kept = everyCheckpointTo(10 * CHECKPOINT_COST);

  it("keeps every checkpoint while the copies fit the budget", () => {
    expect(dropOrder(kept, { budget: kept.length })).toEqual([]);
  });

  it("spares the head window while older checkpoints are left to drop", () => {
    const older = kept.slice(0, -HEAD_WINDOW);
    const dropped = dropOrder(kept);
    expect(new Set(dropped.slice(0, older.length))).toEqual(new Set(older));
    // Then the window goes oldest first, down to the budget.
    expect(dropped.slice(older.length)).toEqual(kept.slice(-HEAD_WINDOW, -1));
  });

  it("drops checkpoints past the head first, the farthest first", () => {
    const head = kept[4] + 1;
    const pastHead = kept.filter((at) => at > head);
    expect(dropOrder(kept, { head }).slice(0, pastHead.length)).toEqual(pastHead.toReversed());
  });

  it("drops the checkpoint just taken last, and only at a budget of 0", () => {
    const justTaken = kept.at(-1) ?? 0;
    const others = kept.slice(0, -1);
    expect(new Set(dropOrder(kept, { justTaken, otherCopies: 2 }))).toEqual(new Set(others));
    expect(dropOrder(kept, { justTaken, budget: 0 }).at(-1)).toBe(justTaken);
  });

  it("weighs the replay a checkpoint saves against the copies it frees", () => {
    const six = kept.slice(-2 * HEAD_WINDOW);
    const [byReplay] = dropOrder(six);
    // By replay alone another goes first; freeing twice the copies sends the nearest older one first.
    const doubled = six[HEAD_WINDOW - 1];
    expect(byReplay).not.toBe(doubled);
    expect(dropOrder(six, { freed: (at) => (at === doubled ? 2 : 1) })[0]).toBe(doubled);
    // One that frees nothing alone goes after those that free a copy.
    expect(dropOrder(six, { freed: (at) => (at === byReplay ? 0 : 1) })[0]).not.toBe(byReplay);
  });

  it("thins by replay alone when no checkpoint frees a copy by itself", () => {
    // Close pairs far back, so the replay rule picks something other than the oldest.
    const uneven = [5, 15, 16, 21, 22, 23].map((n) => n * CHECKPOINT_COST);
    const byReplay = dropOrder(uneven);
    expect(byReplay[0]).not.toBe(uneven[0]);
    expect(dropOrder(uneven, { freed: () => 0 })).toEqual(byReplay);
  });
});

describe("planCheckpoints", () => {
  it.each([6, 8, 12])(
    "thins a uniform log with distance back from the head, at %i copies",
    (budget) => {
      const steps = Array.from({ length: 100 * CHECKPOINT_COST }, () => brush());
      const gaps = gapsBack(
        planCheckpoints(
          steps,
          () => 1,
          () => budget,
        ),
      );
      // Dense in the head window, then wider going back: dropping one at a time can leave a gap
      // narrower than its nearer neighbor, but never narrower than any gap nearer than that.
      expect(gaps.slice(0, HEAD_WINDOW - 1)).toEqual(Array(HEAD_WINDOW - 1).fill(CHECKPOINT_COST));
      for (let i = 2; i < gaps.length; i++)
        expect(gaps[i]).toBeGreaterThanOrEqual(Math.max(...gaps.slice(0, i - 1)));
      expect(gaps.at(-1)).toBeGreaterThan(CHECKPOINT_COST);
    },
  );
});
