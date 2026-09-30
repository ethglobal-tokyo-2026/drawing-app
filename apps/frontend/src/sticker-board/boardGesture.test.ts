import { describe, expect, it } from "vitest";
import { passedSlop, pinchBy, scaleBy, stepBy, turnBy, type Pt } from "./boardGesture";
import { S_MAX } from "./placement";

const center = { x: 100, y: 100 };

describe("board gestures", () => {
  it("settles a nearly upright turn upright, and leaves a real turn alone", () => {
    const from = { x: 100, y: 0 };
    const nudged = {
      x: 100 + 100 * Math.sin((2.5 * Math.PI) / 180),
      y: 100 - 100 * Math.cos((2.5 * Math.PI) / 180),
    };
    const turned = {
      x: 100 + 100 * Math.sin((4 * Math.PI) / 180),
      y: 100 - 100 * Math.cos((4 * Math.PI) / 180),
    };
    expect(turnBy(center, from, nudged, 0)).toBe(0);
    expect(turnBy(center, from, turned, 0)).toBeCloseTo(4);
    expect(turnBy(center, from, nudged, 358)).toBe(0);
    expect(turnBy(center, from, nudged, 350)).toBeCloseTo(352.5);
  });

  it("steps undo each other, and a size step stops at the board's limits", () => {
    const at = { x: 100, y: 100, s: 0.3, r: 10 };
    expect(stepBy(stepBy(at, "left"), "right")).toEqual(at);
    expect(stepBy(stepBy(at, "up"), "down")).toEqual(at);
    expect(stepBy(stepBy(at, "turnLeft"), "turnRight")).toEqual(at);
    expect(stepBy(at, "bigger").s).toBeGreaterThan(at.s);
    expect(stepBy(at, "smaller").s).toBeLessThan(at.s);
    expect(stepBy({ ...at, s: S_MAX }, "bigger").s).toBe(S_MAX);
  });

  it("scales with the handle's distance from the centre, within the board's limits", () => {
    expect(scaleBy(center, { x: 120, y: 100 }, { x: 140, y: 100 }, 0.2)).toBeCloseTo(0.4);
    expect(scaleBy(center, { x: 120, y: 100 }, { x: 200, y: 100 }, 0.3)).toBe(S_MAX);
  });

  it("turns with two fingers without settling", () => {
    const start: [Pt, Pt] = [
      { x: 90, y: 100 },
      { x: 110, y: 100 },
    ];
    const a = (2 * Math.PI) / 180;
    const now: [Pt, Pt] = [
      { x: 100 - 10 * Math.cos(a), y: 100 - 10 * Math.sin(a) },
      { x: 100 + 10 * Math.cos(a), y: 100 + 10 * Math.sin(a) },
    ];
    expect(pinchBy(start, now, { x: 100, y: 100, s: 0.3, r: 0 }).r).toBeCloseTo(2);
  });

  it("starts a drag only past the slop", () => {
    expect(passedSlop({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
    expect(passedSlop({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });
});
