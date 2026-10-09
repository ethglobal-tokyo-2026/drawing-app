import { describe, expect, it } from "vitest";
import {
  MAX_STACK_SCALE,
  POUCH_LINING,
  SHEET,
  STACK_Y,
  mouthShortFor,
  sheetHeightFor,
  stackFootFor,
  trayFitFor,
  type TrayFit,
} from "./trayModel";

/** Where the open stack ends, its lining under it included, in the column's px. */
const stackEnd = (fit: TrayFit, sheets: number, sheetH: number) =>
  2 + STACK_Y + fit.scale * sheetH + stackFootFor(sheets) + POUCH_LINING;

describe("trayFitFor", () => {
  it.each([
    ["a phone", false, 640],
    ["a large screen", true, 1200],
  ])(
    "grows the page to fill a tall pouch on %s, so the mouth opens to the bottom stop",
    (_, large, foot) => {
      const fit = trayFitFor(large, () => foot);
      for (const sheets of [1, 3, 60]) {
        const sheetH = sheetHeightFor(fit, sheets);
        expect(sheetH).toBeGreaterThan(SHEET.h);
        expect(mouthShortFor(fit, sheets, sheetH)).toBe(0);
        // The stack and its lining reach the open mouth's foot, and stop there.
        expect(stackEnd(fit, sheets, sheetH)).toBeCloseTo(foot, 6);
      }
    },
  );

  it("grows a large screen's stack to its most before the page grows taller", () => {
    const fit = trayFitFor(true, () => 1200);
    expect(fit.scale).toBe(MAX_STACK_SCALE);
    expect(sheetHeightFor(fit, 60)).toBeGreaterThan(SHEET.h);
  });

  it("keeps the page its least height on a board too short for it, shrinking the stack", () => {
    const fit = trayFitFor(false, () => 420);
    expect(fit.scale).toBeLessThan(1);
    expect(sheetHeightFor(fit, 60)).toBe(SHEET.h);
    expect(mouthShortFor(fit, 60, SHEET.h)).toBe(0);
  });
});
