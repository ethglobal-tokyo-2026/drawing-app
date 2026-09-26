import { describe, expect, it } from "vitest";
import type { Op } from "../canvas/ops";
import { firstChanged, keptColor } from "./keptSession";

const stroke = (color: string): Op => ({ tool: "brush", color, pts: [], T: 0 });

describe("keptColor", () => {
  it("picks a drawing back up in the color it was last drawn in", () => {
    const fill: Op = { tool: "fill", x: 0, y: 0, color: "#00868B", T: 0 };
    const erase: Op = { tool: "eraser", color: "#E8484F", pts: [], T: 0 };
    expect(keptColor([stroke("#1478C8"), stroke("#B4299A")])).toBe("#B4299A");
    // A fill counts; the eraser doesn't draw in a color.
    expect(keptColor([stroke("#1478C8"), fill, erase])).toBe("#00868B");
    // Nothing drawn: it keeps the color a fresh sheet starts in.
    expect(keptColor([])).toBeNull();
  });
});

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
