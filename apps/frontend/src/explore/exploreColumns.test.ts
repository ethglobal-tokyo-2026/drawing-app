import { describe, expect, it } from "vitest";
import { exploreColumns, TWO_COLUMNS_MIN_WIDTH } from "./exploreColumns";

describe("exploreColumns", () => {
  it("splits Explore only on a large screen held sideways, with room for both columns", () => {
    const w = TWO_COLUMNS_MIN_WIDTH;
    expect(exploreColumns(w, w - 1, true)).toBe(2);
    expect(exploreColumns(w - 1, w - 2, true)).toBe(1);
    expect(exploreColumns(w, w + 1, true)).toBe(1);
    expect(exploreColumns(w, w - 1, false)).toBe(1);
  });
});
