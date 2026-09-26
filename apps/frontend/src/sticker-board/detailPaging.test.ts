import { describe, expect, it } from "vitest";
import { swipeLock, swipeTo } from "./detailPaging";

describe("sticker detail paging", () => {
  it("pages once the swipe passes 56px sideways, and not past either end", () => {
    expect(swipeTo({ dx: -60, index: 0, count: 3 })).toBe(1);
    expect(swipeTo({ dx: 60, index: 0, count: 3 })).toBe(0);
    expect(swipeTo({ dx: -40, index: 1, count: 3 })).toBe(1);
    expect(swipeTo({ dx: -60, index: 2, count: 3 })).toBe(2);
  });

  it("lets a mostly vertical move scroll instead of paging", () => {
    expect(swipeLock({ dx: 3, dy: 9 })).toBe("scroll");
    expect(swipeLock({ dx: 9, dy: 3 })).toBe("swipe");
    expect(swipeLock({ dx: 4, dy: 4 })).toBeNull();
  });
});
