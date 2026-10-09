import { describe, expect, it } from "vitest";
import { LIVE_STAGE } from "../gratitude/stageLayout";
import { MAX_UNWRAP_SCALE, UNWRAP_MARGIN, unwrapScale } from "./unwrapScale";

/** The unwrap's group at scale 1: a phone's column, the giver down to the hint's foot. */
const GROUP = { width: LIVE_STAGE.width, height: 570 };
/** An iPad's home indicator safe area. */
const HOME_INDICATOR = 20;

/** The scale in a `width` × `height` window, and the room the grown group takes with its margins. */
function fitted(width: number, height: number, footInset = HOME_INDICATOR) {
  const scale = unwrapScale({ width, height, footInset }, GROUP);
  return {
    scale,
    width: GROUP.width * scale + 2 * UNWRAP_MARGIN,
    height: GROUP.height * scale + 2 * UNWRAP_MARGIN + footInset,
  };
}

describe("the unwrap's scale", () => {
  it.each([
    [820, 1094],
    [1180, 734],
    [1180, 820],
    [744, 600],
  ])("in %i × %i grows from a phone's size no further than the window has room", (w, h) => {
    const { scale, width, height } = fitted(w, h);
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(scale).toBeLessThanOrEqual(MAX_UNWRAP_SCALE);
    if (scale > 1) {
      expect(width).toBeLessThanOrEqual(w + 1e-9);
      expect(height).toBeLessThanOrEqual(h + 1e-9);
    }
  });

  it("stops at its cap in a roomy window", () => {
    expect(fitted(1024, 1366).scale).toBe(MAX_UNWRAP_SCALE);
  });

  it("fills a short window's height short of its cap, and gives up the home indicator's room", () => {
    const short = fitted(1180, 734);
    expect(short.scale).toBeGreaterThan(1);
    expect(short.scale).toBeLessThan(MAX_UNWRAP_SCALE);
    expect(short.height).toBeCloseTo(734);
    expect(short.scale).toBeLessThan(fitted(1180, 734, 0).scale);
  });

  it("stays at a phone's size in a window under a large screen's either way", () => {
    expect(fitted(1180, 590).scale).toBe(1);
    expect(fitted(590, 1180).scale).toBe(1);
  });
});
