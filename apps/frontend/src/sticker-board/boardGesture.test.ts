import { describe, expect, it } from "vitest";
import {
  keptOnField,
  passedSlop,
  pinchBy,
  scaleBy,
  SLOP,
  stepBy,
  turnBy,
  type Pt,
  type Step,
} from "./boardGesture";
import type { SRange } from "./placement";

const center = { x: 100, y: 100 };
/** A sticker's sizes, as the board works them out for it. */
const RANGE: SRange = { min: 0.15, max: 0.9 };
/** A corner handle up and to the right of `center`, and a size inside `RANGE`. */
const topRight = { x: 140, y: 60 };
const midSize = (RANGE.min + RANGE.max) / 2;

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

  it("steps undo each other, and a size step stops at the sticker's largest", () => {
    const at = { x: 100, y: 100, s: 0.3, r: 10 };
    const step = (from: typeof at, by: Step) => stepBy(from, by, RANGE);
    expect(step(step(at, "left"), "right")).toEqual(at);
    expect(step(step(at, "up"), "down")).toEqual(at);
    expect(step(step(at, "turnLeft"), "turnRight")).toEqual(at);
    expect(step(at, "bigger").s).toBeGreaterThan(at.s);
    expect(step(at, "smaller").s).toBeLessThan(at.s);
    expect(step({ ...at, s: RANGE.max }, "bigger").s).toBe(RANGE.max);
  });

  it("scales with the handle's distance from the center, up to the sticker's largest", () => {
    expect(scaleBy(center, { x: 120, y: 100 }, { x: 140, y: 100 }, 0.2, RANGE)).toBeCloseTo(0.4);
    expect(scaleBy(center, { x: 120, y: 100 }, { x: 2000, y: 100 }, 0.3, RANGE)).toBe(RANGE.max);
  });

  it("keeps a corner dragged in past the center at the smallest size, rather than growing again", () => {
    expect(scaleBy(center, topRight, { x: 20, y: 180 }, midSize, RANGE)).toBe(RANGE.min);
  });

  it("keeps the size while a corner moves across its line from the center", () => {
    expect(scaleBy(center, topRight, { x: 160, y: 80 }, midSize, RANGE)).toBeCloseTo(midSize);
    expect(scaleBy(center, topRight, { x: 120, y: 40 }, midSize, RANGE)).toBeCloseTo(midSize);
  });

  it("moves a sticker grown past the field's edge back onto it, turned or not", () => {
    const field = { left: 16, top: 86, w: 334, h: 549 };
    const size = { w: 200, h: 120 };
    for (const r of [0, 30]) {
      const at = keptOnField({ x: 340, y: 620, r }, size, field);
      const turn = (r * Math.PI) / 180;
      const [cos, sin] = [Math.abs(Math.cos(turn)), Math.abs(Math.sin(turn))];
      const reach = { x: (cos * size.w + sin * size.h) / 2, y: (sin * size.w + cos * size.h) / 2 };
      expect(at.x + reach.x).toBeCloseTo(field.left + field.w);
      expect(at.y + reach.y).toBeCloseTo(field.top + field.h);
    }
    const inside = { x: 180, y: 300, r: 0 };
    expect(keptOnField(inside, size, field)).toEqual({ x: inside.x, y: inside.y });
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
    expect(pinchBy(start, now, { x: 100, y: 100, s: 0.3, r: 0 }, RANGE).r).toBeCloseTo(2);
  });

  it("passes the slop by the distance moved, not by either axis alone", () => {
    const from = { x: 10, y: 10 };
    expect(passedSlop(from, { x: from.x + SLOP, y: from.y })).toBe(false);
    expect(passedSlop(from, { x: from.x + 0.8 * SLOP, y: from.y - 0.8 * SLOP })).toBe(true);
  });
});
