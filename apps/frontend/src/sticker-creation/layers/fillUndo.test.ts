import { describe, expect, it } from "vitest";
import type { Step } from "../canvas/ops";
import { fillUndoStart, validateFillUndo } from "./fillUndo";
import { LayerStepError } from "./layerState";
import { brush, fill, setOpacity } from "./testLayerSteps";

describe("Fill undo boundaries", () => {
  it("finds the first fill in a chained action without joining separate drags", () => {
    const steps: Step[] = [
      brush(),
      fill(),
      { ...fill(), undoWithPrevious: true },
      fill(),
      { ...fill(), undoWithPrevious: true },
    ];
    validateFillUndo(steps);
    expect(fillUndoStart(steps, 5)).toBe(3);
    expect(fillUndoStart(steps, 3)).toBe(1);
    expect(fillUndoStart(steps, 1)).toBe(0);
    expect(fillUndoStart([fill(), fill()], 2)).toBe(1);
  });

  it.each<Step[]>([
    [{ ...fill(), undoWithPrevious: true }],
    [fill(), Object.assign(fill(), { undoWithPrevious: false })],
    [fill(), Object.assign(fill(), { undoWithPrevious: "true" })],
    [fill(), Object.assign(fill(), { undoWithPrevious: undefined })],
    [fill(), Object.assign(brush(), { undoWithPrevious: true })],
    [fill(), Object.assign(setOpacity(1, 50), { undoWithPrevious: true })],
    [fill(), { ...fill(2), undoWithPrevious: true }],
    [fill(), { ...fill(), color: "#ff0000", undoWithPrevious: true }],
    [fill(), { ...fill(), reference: "layer", undoWithPrevious: true }],
    [fill(), { ...fill(), gap: 1, undoWithPrevious: true }],
    [fill(), brush(), { ...fill(), undoWithPrevious: true }],
  ])("rejects invalid continuation %# at its sequence index", (...steps) => {
    expect(() => validateFillUndo(steps)).toThrow(LayerStepError);
    try {
      validateFillUndo(steps);
    } catch (error) {
      expect(error).toMatchObject({ stepIndex: steps.length - 1 });
    }
  });
});
