import { describe, expect, it } from "vitest";
import { heartRest, LIVE_FRAME, MAX_HEART_WIDTH } from "./stageLayout";

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
