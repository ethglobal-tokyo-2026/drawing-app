import { describe, expect, it } from "vitest";
import type { Op } from "../canvas/ops";
import { firstChanged } from "./keptSession";

const stroke = (color: string): Op => ({ tool: "brush", color, pts: [], T: 0 });

describe("firstChanged", () => {
  it("starts a save at the first op that isn't the one written there last", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"].map(stroke);
    // A new stroke, and a redo: only the new last op.
    expect(firstChanged([a, b], [a, b, c])).toBe(2);
    // An undo: no ops, only the count.
    expect(firstChanged([a, b, c], [a, b])).toBe(2);
    // A stroke after an undo takes the undone one's place.
    expect(firstChanged([a, b, c], [a, b, d])).toBe(2);
    // Nothing written yet, or a write that failed: every op.
    expect(firstChanged([], [a, b])).toBe(0);
  });
});
