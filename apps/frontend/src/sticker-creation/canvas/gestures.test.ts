import { describe, expect, it } from "vitest";
import { TapRecognizer } from "./gestures";

/**
 * Lands fingers 50px apart: the first starts drawing, and the second lands 30ms later on that stroke;
 * the rest land once the stroke is either taken back or going on.
 */
function land(fingers: number, stroke = { age: 30, moved: 0 }) {
  const taps = new TapRecognizer();
  const results = [taps.down(1, 0, 0, 0), taps.down(2, 100, 0, 30, stroke)];
  const drawing = results[1] === "ignore";
  for (let id = 3; id <= fingers; id++)
    results.push(taps.down(id, id * 50, 0, 40, drawing ? stroke : undefined));
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

  it("does nothing when the fingers lift after 420ms", () => {
    expect(liftAll(land(2).taps, 2, 419)).toBe("undo");
    expect(liftAll(land(2).taps, 2, 460)).toBeNull();
  });

  it("does nothing when a finger moves 14px or more", () => {
    const small = land(2);
    small.taps.move(2, 100 + 13, 0);
    expect(liftAll(small.taps, 2, 200)).toBe("undo");
    const big = land(2);
    big.taps.move(2, 100 + 14, 0);
    expect(liftAll(big.taps, 2, 200)).toBeNull();
  });

  it("lets a stroke older than 260ms or longer than 26px go on", () => {
    for (const stroke of [
      { age: 260, moved: 5 },
      { age: 100, moved: 26 },
    ]) {
      const { taps, results } = land(2, stroke);
      expect(results).toEqual(["draw", "ignore"]);
      expect(liftAll(taps, 2, 200)).toBeNull();
    }
  });

  it("starts a gesture on the second finger when the first isn't drawing", () => {
    const taps = new TapRecognizer();
    taps.down(1, 0, 0, 0);
    expect(taps.down(2, 50, 0, 30)).toBe("gesture");
    expect(liftAll(taps, 2, 200)).toBe("undo");
  });
});
