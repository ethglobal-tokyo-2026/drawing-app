import { describe, expect, it } from "vitest";
import { LazyBrush, lazyRadius } from "./lazyBrush";

describe("LazyBrush", () => {
  it("stays put while the pointer moves inside its radius", () => {
    const brush = new LazyBrush(0, 0, 10);
    expect(brush.follow(6, 6)).toBe(false);
    expect([brush.x, brush.y]).toEqual([0, 0]);
  });

  it("follows the pointer beyond the radius, trailing it by the radius", () => {
    const brush = new LazyBrush(0, 0, 10);
    expect(brush.follow(30, 40)).toBe(true);
    expect(Math.hypot(30 - brush.x, 40 - brush.y)).toBeCloseTo(10);
    // Straight toward the pointer.
    expect(brush.x / brush.y).toBeCloseTo(30 / 40);
  });

  it("catches up to where the pointer lifted in steps of at most 3px", () => {
    const brush = new LazyBrush(0, 0, 10);
    expect(brush.catchUp(9, 0)).toEqual([
      [3, 0],
      [6, 0],
      [9, 0],
    ]);
    const steps = new LazyBrush(0, 0, 10).catchUp(10, 0);
    expect(steps.map(([x]) => x)).toEqual([2.5, 5, 7.5, 10]);
  });

  it("has nothing to catch up when it's already under the pointer", () => {
    expect(new LazyBrush(5, 5, 10).catchUp(5.2, 5.2)).toEqual([]);
  });

  it("moves a pen's brush from the nib's first slight drag, where a finger's rests on its string", () => {
    const smooth = lazyRadius(100);
    expect(LazyBrush.forPen(0, 0, smooth).follow(1, 0)).toBe(true);
    expect(new LazyBrush(0, 0, smooth).follow(1, 0)).toBe(false);
  });
});

describe("lazyRadius", () => {
  it("draws right under the finger at Raw and trails further the smoother it's set", () => {
    expect(lazyRadius(0)).toBe(0);
    expect(lazyRadius(30)).toBeLessThan(lazyRadius(60));
    expect(lazyRadius(100)).toBe(30);
  });
});
