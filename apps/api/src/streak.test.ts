import { describe, expect, it } from "vitest";
import { streakOf } from "./streak.ts";
import { addDays } from "./ticketDays.ts";

const TODAY = "2026-09-26";
const daysAgo = (days: number) => addDays(TODAY, -days);

describe("streakOf", () => {
  it("counts consecutive seal days, and today isn't missed until it's over", () => {
    const run = [daysAgo(3), daysAgo(2), daysAgo(1)];
    expect(streakOf(run, TODAY)).toEqual({ current: run.length, best: run.length });
    expect(streakOf([...run, TODAY], TODAY)).toEqual({
      current: run.length + 1,
      best: run.length + 1,
    });
  });

  it("resets to 0 on a missed day, and keeps the best it reached", () => {
    const earlier = [daysAgo(6), daysAgo(5), daysAgo(4)];
    expect(streakOf([...earlier, daysAgo(1)], TODAY)).toEqual({ current: 1, best: earlier.length });
    expect(streakOf(earlier, TODAY)).toEqual({ current: 0, best: earlier.length });
  });

  it("counts a day with several seals once, and is 0 before the first seal", () => {
    expect(streakOf([TODAY, TODAY], TODAY)).toEqual({ current: 1, best: 1 });
    expect(streakOf([], TODAY)).toEqual({ current: 0, best: 0 });
  });
});
