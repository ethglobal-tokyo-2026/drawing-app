import type { FillPatchInput, FillPatchResult } from "./protocol";
import { validateFillPatch } from "./protocol";
import { findFill, writeFill, recordFill, fillInteriorSpans } from "../fill";

export function prepareFillPatch(input: FillPatchInput): FillPatchResult {
  validateFillPatch(input);
  const { at, shown, target, sx, sy, color, gap, locked, cut } = input;
  const found = findFill(shown, sx, sy, color, gap, cut);
  if (found === "past") return { kind: "past" };
  if (found === null) return { kind: "empty" };
  const interiorSpans = fillInteriorSpans(found, at);
  const written = writeFill(target, shown, found, color, locked)
    ? recordFill(target, at, found)
    : null;
  return { kind: "found", pixels: target, found, interiorSpans, written };
}
