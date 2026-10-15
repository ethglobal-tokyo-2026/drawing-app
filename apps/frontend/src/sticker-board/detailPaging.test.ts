import { describe, expect, it } from "vitest";
import { LOCK_PX, PAGE_PX, swipeLock, swipeTo, throwOf } from "./detailPaging";

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

describe("a sticker thrown off the detail", () => {
  /** A finger going up `perFrame` px a frame at 60 frames a second, from t = 0 for `frames` frames. */
  const upward = (perFrame: number, frames: number) =>
    Array.from({ length: frames + 1 }, (_, i) => ({ t: (i * 1000) / 60, x: 0, y: -perFrame * i }));
  const along = (v: { x: number; y: number } | null) => v && Math.atan2(v.y, v.x);

  it("is thrown at the finger's speed when it's let go moving fast", () => {
    const samples = upward(20, 6);
    const thrown = throwOf(samples, { dx: 0, dy: -120 }, 100);
    expect(thrown?.y).toBeCloseTo(-20 * 60);
    expect(thrown?.x).toBeCloseTo(0);
  });

  it("isn't thrown by a short, slow drag, and springs back", () => {
    expect(throwOf(upward(1, 10), { dx: 0, dy: -10 }, 170)).toBeNull();
  });

  it("goes by how far it came when its moves came all at once", () => {
    const together = [
      { t: 0, x: 0, y: 0 },
      { t: 1, x: 0, y: -20 },
    ];
    expect(throwOf(together, { dx: 0, dy: -20 }, 1)).toBeNull();
    expect(along(throwOf(together, { dx: 0, dy: -80 }, 1))).toBeCloseTo(-Math.PI / 2);
  });

  it("is thrown the way it went when it came far but rested before it was let go", () => {
    const samples = upward(20, 6);
    const thrown = throwOf(samples, { dx: 40, dy: -120 }, 1000);
    expect(along(thrown)).toBeCloseTo(Math.atan2(-120, 40));
  });
});
