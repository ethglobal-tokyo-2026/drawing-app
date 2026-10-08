import { describe, expect, it } from "vitest";
import {
  CHARRED_AT_ROLL,
  COUNTDOWN_FROM_ROLL,
  dieMood,
  SHAKE_FROM_ROLL,
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

  it("barely shakes until about roll 10, then harder with every roll toward the bang, and stops once it blows up", () => {
    const shakes = rollsUpTo(CHARRED_AT_ROLL).map((r) => dieMood(r).shake);
    expect(shakes.slice(0, SHAKE_FROM_ROLL).every((s) => s === 0)).toBe(true);
    const building = shakes.slice(SHAKE_FROM_ROLL, CHARRED_AT_ROLL - 1);
    expect(building.every((s, i) => i === 0 || s > building[i - 1])).toBe(true);
    expect(dieMood(SHAKE_FROM_ROLL + 1).shake).toBeLessThan(0.02);
    expect(dieMood(CHARRED_AT_ROLL - 1).shake).toBe(1);
    // Escalating: each roll adds more shake than the one before it did.
    const steps = building.slice(1).map((s, i) => s - building[i]);
    expect(steps.every((d, i) => i === 0 || d > steps[i - 1])).toBe(true);
    expect(dieMood(CHARRED_AT_ROLL).shake).toBe(0);
  });

  it("counts down by one from COUNTDOWN_FROM_ROLL to 1 on the roll before the bang, smoking all the while, and blows up on the last with no count", () => {
    const counts = rollsUpTo(CHARRED_AT_ROLL).flatMap((r) => dieMood(r).countdown ?? []);
    expect(dieMood(CHARRED_AT_ROLL - 1).countdown).toBe(1);
    expect(counts).toEqual(counts.map((_, i) => counts[0] - i));
    expect(counts).toHaveLength(CHARRED_AT_ROLL - COUNTDOWN_FROM_ROLL);
    expect(dieMood(CHARRED_AT_ROLL)).toMatchObject({
      countdown: null,
      charred: true,
      smoking: true,
    });
    expect(dieMood(CHARRED_AT_ROLL - 1).charred).toBe(false);
  });
});
