import { describe, expect, it } from "vitest";
import { LOCK_PX, PAGE_PX, swipeLock, swipeTo } from "./detailPaging";

describe("sticker detail paging", () => {
  it("pages once the swipe passes its distance sideways, and not past either end", () => {
    const past = PAGE_PX + 1;
    expect(swipeTo({ dx: -past, index: 0, count: 3 })).toBe(1);
    expect(swipeTo({ dx: past, index: 0, count: 3 })).toBe(0);
    expect(swipeTo({ dx: -(PAGE_PX - 1), index: 1, count: 3 })).toBe(1);
    expect(swipeTo({ dx: -past, index: 2, count: 3 })).toBe(2);
  });

  it("lets a mostly vertical move scroll instead of paging", () => {
    const past = LOCK_PX + 1;
    expect(swipeLock({ dx: past / 3, dy: past })).toBe("scroll");
    expect(swipeLock({ dx: past, dy: past / 3 })).toBe("swipe");
    expect(swipeLock({ dx: LOCK_PX - 1, dy: 0 })).toBeNull();
  });
});
