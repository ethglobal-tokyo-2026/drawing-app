import type { Step } from "../canvas/ops";
import { LayerStepError } from "./layerState";

/** Checks one candidate continuation without scanning the preceding history. */
export function validateFillUndoStep(step: Step, previous: Step | undefined, index: number): void {
  if (!("undoWithPrevious" in step)) return;
  if (step.tool !== "fill" || step.undoWithPrevious !== true)
    throw new LayerStepError("Only a fill can continue the previous Undo action, with true", index);
  if (
    previous?.tool !== "fill" ||
    previous.layer !== step.layer ||
    previous.color !== step.color ||
    previous.reference !== step.reference ||
    previous.gap !== step.gap
  )
    throw new LayerStepError(
      "A continued fill must follow a fill with the same layer, color, reference and gap",
      index,
    );
}

/** Rejects malformed or disconnected Fill Undo actions before a recording is loaded. */
export function validateFillUndo(steps: readonly Step[]): void {
  for (let i = 0; i < steps.length; i++) validateFillUndoStep(steps[i], steps[i - 1], i);
}

/** The inclusive first step of the action ending immediately before `end`. */
export function fillUndoStart(steps: readonly Step[], end: number): number {
  let start = end - 1;
  while (start > 0) {
    const step = steps[start];
    if (step.tool !== "fill" || step.undoWithPrevious !== true) break;
    start--;
  }
  return start;
}
