import { describe, expect, it } from "vitest";
import { MIN_SCALE, SHEET, sheetHeightFor, trayFitFor, trayTopFor } from "./trayModel";
import { spreadCells } from "./traySpread";

describe("spreadCells", () => {
  it("never shrinks a sheet past readable, nor out of the board's width, however many sheets", () => {
    const board = { w: 390, h: 657 };
    const fit = trayFitFor(false, () => 600);
    const sheetH = sheetHeightFor(fit, 60);
    for (const n of [1, 2, 5, 12, 40, 125, 400])
      for (const cell of spreadCells(n, board.w, board.h, trayTopFor(false), fit.grow, sheetH)) {
        expect(cell.k).toBeGreaterThanOrEqual(MIN_SCALE);
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x + SHEET.w * cell.k).toBeLessThanOrEqual(board.w);
      }
  });
});
