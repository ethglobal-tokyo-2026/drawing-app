import { describe, expect, it } from "vitest";
import {
  heartRest,
  LIVE_FRAME,
  LIVE_STAGE,
  liveHeartRest,
  liveScale,
  MAX_HEART_WIDTH,
  MAX_LIVE_SCALE,
} from "./stageLayout";

/** A replay's stage in the gratitude card, and what sits above its heart. */
const CARD_STAGE = { width: 268, height: 300 };
const CARD_FRAME = { above: 64 };

describe("where the heart rests", () => {
  it("sits centered under the frame, never wider than its cap", () => {
    const wide = heartRest(1000, 900, LIVE_FRAME);
    expect(wide.x).toBe(500);
    expect(wide.width).toBe(MAX_HEART_WIDTH);
    expect(wide.y - wide.height / 2).toBeGreaterThan(LIVE_FRAME.above);
  });

  it("shrinks with a narrow stage, and stays on it", () => {
    const narrow = heartRest(CARD_STAGE.width, CARD_STAGE.height, CARD_FRAME);
    expect(narrow.width).toBeLessThan(MAX_HEART_WIDTH);
    expect(narrow.y - narrow.height / 2).toBeGreaterThan(CARD_FRAME.above);
    expect(narrow.y + narrow.height / 2).toBeLessThanOrEqual(CARD_STAGE.height);
  });
});

describe("the live game's scale", () => {
  it("stays at 1 on a phone", () => {
    expect(liveScale(LIVE_STAGE.width, LIVE_STAGE.height)).toBe(1);
    expect(liveScale(430, 829)).toBe(1);
  });

  it("grows with a large screen's stage's smaller share, up to its cap", () => {
    expect(liveScale(1180, 820)).toBeGreaterThan(1);
    expect(liveScale(1180, 820)).toBeLessThan(MAX_LIVE_SCALE);
    expect(liveScale(820, 1180)).toBe(MAX_LIVE_SCALE);
  });

  it("is 1 on a stage under a large screen's size either way", () => {
    expect(liveScale(1180, 590)).toBe(1);
    expect(liveScale(590, 1180)).toBe(1);
  });

  it("draws the live heart as wide as its scale lets it be", () => {
    const [w, h] = [820, 1180];
    expect(liveHeartRest(w, h).width).toBeCloseTo(MAX_HEART_WIDTH * liveScale(w, h));
  });
});
