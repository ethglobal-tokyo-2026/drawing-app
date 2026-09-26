import { describe, expect, it } from "vitest";
import { formatRefillIn, msUntilRefillLineChanges } from "./refill";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("refill line", () => {
  it("counts down in whole hours and minutes", () => {
    expect(formatRefillIn(6 * HOUR + 56 * MIN)).toBe("in 6h 56m");
    expect(formatRefillIn(6 * HOUR + 56 * MIN + 59_999)).toBe("in 6h 56m");
    expect(formatRefillIn(6 * HOUR)).toBe("in 6h");
    expect(formatRefillIn(42 * MIN)).toBe("in 42m");
    expect(formatRefillIn(MIN)).toBe("in 1m");
    expect(formatRefillIn(MIN - 1)).toBe("in under a minute");
  });

  it("wakes exactly when the line changes, or when the refill arrives", () => {
    for (const ms of [6 * HOUR + 56 * MIN, 6 * HOUR + 30_000, 61_000, MIN, 59_000, 1]) {
      const wait = msUntilRefillLineChanges(ms);
      const line = formatRefillIn(ms);
      expect(formatRefillIn(ms - wait + 1), `a moment early, from ${ms}ms`).toBe(line);
      const after = ms - wait;
      expect(after <= 0 || formatRefillIn(after) !== line, `on time, from ${ms}ms`).toBe(true);
    }
  });
});
