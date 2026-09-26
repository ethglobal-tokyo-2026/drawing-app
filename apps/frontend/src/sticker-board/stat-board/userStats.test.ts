import { afterEach, describe, expect, it, vi } from "vitest";
import { streakOf } from "./userStats";

const days = (...keys: string[]) => keys;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("streakOf", () => {
  it("hasn't started before the first sticker", () => {
    expect(streakOf([], "2026-09-26")).toEqual({ current: 0, best: 0 });
  });

  it("counts days in a row, and a day with two stickers once", () => {
    expect(
      streakOf(days("2026-09-24", "2026-09-25", "2026-09-25", "2026-09-26"), "2026-09-26"),
    ).toEqual({ current: 3, best: 3 });
  });

  it("drops one for a missed day", () => {
    const streak = streakOf(
      days("2026-09-20", "2026-09-21", "2026-09-22", "2026-09-24"),
      "2026-09-24",
    );
    expect(streak).toEqual({ current: 3, best: 3 });
  });

  it("never drops to zero once started", () => {
    expect(streakOf(days("2026-09-01"), "2026-09-26").current).toBe(1);
  });

  it("doesn't count today as missed before it's over", () => {
    expect(streakOf(days("2026-09-24", "2026-09-25"), "2026-09-26").current).toBe(2);
  });

  it("keeps the longest streak after a fall", () => {
    const seals = days(
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-09",
    );
    expect(streakOf(seals, "2026-09-09")).toEqual({ current: 3, best: 5 });
  });

  it("counts calendar days across a clock change", () => {
    // London's clocks go forward on 2026-03-29, so that day lasts 23 hours there.
    vi.stubEnv("TZ", "Europe/London");
    expect(streakOf(days("2026-03-28", "2026-03-29", "2026-03-30"), "2026-03-30").current).toBe(3);
  });
});
