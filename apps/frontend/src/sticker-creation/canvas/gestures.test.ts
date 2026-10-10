import { describe, expect, it } from "vitest";
import {
  MULTI_FINGER_TAP_MS,
  MULTI_FINGER_TAP_SLOP,
  TapRecognizer,
  YOUNG_MS,
  YOUNG_PX,
} from "./gestures";

/** Where and when `land`'s second finger lands, and with it the tap begins. */
const SECOND = { x: 100, t: 30 };

/**
 * Lands fingers 50px apart: the first starts drawing, and the second lands on that stroke; the rest
 * land once the stroke is either taken back or going on.
 */
function land(fingers: number, stroke = { age: SECOND.t, moved: 0 }) {
  const taps = new TapRecognizer();
  const results = [taps.down(1, 0, 0, 0), taps.down(2, SECOND.x, 0, SECOND.t, stroke)];
  const drawing = results[1] === "ignore";
  for (let id = 3; id <= fingers; id++)
    results.push(taps.down(id, id * 50, 0, SECOND.t + 10, drawing ? stroke : undefined));
  return { taps, results };
}

/** Lifts every finger at `t`; returns what the last lift recognized. */
function liftAll(taps: TapRecognizer, fingers: number, t: number) {
  let result = null;
  for (let id = 1; id <= fingers; id++) result = taps.up(id, t);
  return result;
}

describe("TapRecognizer", () => {
  it("undoes on a two-finger tap, taking back the stroke the first finger began", () => {
    const { taps, results } = land(2);
    expect(results).toEqual(["draw", "cancel-stroke"]);
    expect(taps.up(1, 200)).toBeNull();
    expect(taps.up(2, 210)).toBe("undo");
  });

  it("redoes on a tap of three fingers or more", () => {
    const three = land(3);
    expect(three.results).toEqual(["draw", "cancel-stroke", "gesture"]);
    expect(liftAll(three.taps, 3, 200)).toBe("redo");
    expect(liftAll(land(4).taps, 4, 200)).toBe("redo");
  });

  it("does nothing once the fingers have been down too long", () => {
    expect(liftAll(land(2).taps, 2, SECOND.t + MULTI_FINGER_TAP_MS - 1)).toBe("undo");
    expect(liftAll(land(2).taps, 2, SECOND.t + MULTI_FINGER_TAP_MS)).toBeNull();
  });

  it("does nothing when a finger moves too far", () => {
    const small = land(2);
    small.taps.move(2, SECOND.x + MULTI_FINGER_TAP_SLOP - 1, 0);
    expect(liftAll(small.taps, 2, 200)).toBe("undo");
    const big = land(2);
    big.taps.move(2, SECOND.x + MULTI_FINGER_TAP_SLOP, 0);
    expect(liftAll(big.taps, 2, 200)).toBeNull();
  });

  it("lets a stroke too old or too long to be a tap's start go on", () => {
    for (const stroke of [
      { age: YOUNG_MS, moved: 0 },
      { age: SECOND.t, moved: YOUNG_PX },
    ]) {
      const { taps, results } = land(2, stroke);
      expect(results).toEqual(["draw", "ignore"]);
      expect(liftAll(taps, 2, 200)).toBeNull();
    }
  });

  it("measures a finger's movement from where it was as the tap began, so a dash taken back as its start still taps", () => {
    const taps = new TapRecognizer();
    taps.down(1, 0, 0, 0);
    taps.move(1, MULTI_FINGER_TAP_SLOP, 0);
    const dash = { age: SECOND.t, moved: MULTI_FINGER_TAP_SLOP };
    expect(taps.down(2, SECOND.x, 0, SECOND.t, dash)).toBe("cancel-stroke");
    // The first finger's next sample, where it already was.
    taps.move(1, MULTI_FINGER_TAP_SLOP, 0);
    expect(liftAll(taps, 2, 200)).toBe("undo");
  });

  it("starts a gesture on the second finger when the first isn't drawing", () => {
    const taps = new TapRecognizer();
    taps.down(1, 0, 0, 0);
    expect(taps.down(2, 50, 0, 30)).toBe("gesture");
    expect(liftAll(taps, 2, 200)).toBe("undo");
  });

  it("leaves out a touch already down when a tap begins, so a resting palm doesn't hold the undo up", () => {
    const taps = new TapRecognizer();
    taps.down(9, 300, 600, 0);
    const t = YOUNG_MS + 100;
    taps.down(1, 0, 0, t);
    taps.down(2, 50, 0, t + 10);
    expect(taps.up(1, t + 100)).toBeNull();
    expect(taps.up(2, t + 110)).toBe("undo");
  });

  it("never counts a palm-sized contact: it lands as nothing, and a tap around it keeps its count", () => {
    const taps = new TapRecognizer();
    expect(taps.down(1, 0, 0, 0)).toBe("draw");
    expect(taps.down(9, 300, 600, 5, undefined, true)).toBe("ignore");
    taps.down(2, 50, 0, 10);
    expect(taps.up(1, 100)).toBeNull();
    expect(taps.up(2, 110)).toBe("undo");
  });
});
