import { describe, expect, it } from "vitest";
import {
  ANGER_FROM_ROLL,
  CHARRED_AT_ROLL,
  COUNTDOWN_FROM_ROLL,
  dieMood,
  SHIVER_FROM_ROLL,
  SWEAT_FROM_ROLL,
  TEASE_LINES,
} from "./dieMood";

const rollsUpTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("a die's mood", () => {
  it("says each line once, on the roll that earns it, and nothing on any other", () => {
    const said = rollsUpTo(CHARRED_AT_ROLL).flatMap((r) => {
      const { line } = dieMood(r);
      return line ? [[r, line]] : [];
    });
    expect(said).toEqual([...TEASE_LINES]);
  });

  it("sweats from SWEAT_FROM_ROLL, angers from ANGER_FROM_ROLL, shivers from SHIVER_FROM_ROLL", () => {
    for (const r of rollsUpTo(CHARRED_AT_ROLL))
      expect(dieMood(r)).toMatchObject({
        sweat: r >= SWEAT_FROM_ROLL,
        anger: r >= ANGER_FROM_ROLL,
        shiver: r >= SHIVER_FROM_ROLL,
      });
  });

  it("counts down by one from COUNTDOWN_FROM_ROLL to 1 as it's charred, smoking all the while", () => {
    const counts = rollsUpTo(CHARRED_AT_ROLL).flatMap((r) => dieMood(r).countdown ?? []);
    expect(counts.at(-1)).toBe(1);
    expect(counts).toEqual(counts.map((_, i) => counts[0] - i));
    expect(counts).toHaveLength(CHARRED_AT_ROLL - COUNTDOWN_FROM_ROLL + 1);
    expect(dieMood(CHARRED_AT_ROLL)).toMatchObject({ charred: true, smoking: true });
    expect(dieMood(CHARRED_AT_ROLL - 1).charred).toBe(false);
  });
});
