import { describe, expect, it } from "vitest";
import {
  areaFrame,
  fitScale,
  frameFor,
  MAX_DPR,
  MAX_INK_PIXELS,
  MAX_SHEET_ASPECT,
  maxInkDensity,
  SHEET_SHORT_UNITS,
  type SheetArea,
  type SheetFrame,
} from "./sheetFrame";

/** The sheet's room on a 390 px phone, and on an 11-inch and a 13-inch iPad in portrait, CSS px. */
const PHONE: SheetArea = { width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 };
const IPAD_11: SheetArea = { width: 804, height: 1108 };
const IPAD_13: SheetArea = { width: 1016, height: 1304 };
const turned = ({ width, height }: SheetArea): SheetArea => ({ width: height, height: width });

const longOverShort = ({ w, h }: SheetFrame) => Math.max(w, h) / Math.min(w, h);
const backing = ({ w, h, density }: SheetFrame) => w * density * h * density;

describe("frameFor", () => {
  it("is a 390 px phone's own sheet, shown at scale 1 at the phone's density", () => {
    const frame = frameFor(PHONE, MAX_DPR);
    expect(frame).toEqual({ w: PHONE.width, h: PHONE.height, density: MAX_DPR });
    expect(fitScale(frame, PHONE)).toBe(1);
  });

  it("keeps the short side and gives the long side the area's shape, up to the widest the sheet goes", () => {
    for (const area of [IPAD_11, turned(IPAD_11), { width: 300, height: 300 * 4 }]) {
      const frame = frameFor(area, 2);
      expect(Math.min(frame.w, frame.h)).toBe(SHEET_SHORT_UNITS);
      expect(frame.h >= frame.w).toBe(area.height >= area.width);
      const shape = Math.max(area.width, area.height) / Math.min(area.width, area.height);
      expect(longOverShort(frame)).toBeCloseTo(Math.min(shape, MAX_SHEET_ASPECT), 2);
    }
  });

  it("backs the ink at the screen's density as the sheet is shown, within MAX_INK_PIXELS", () => {
    const shown = frameFor(IPAD_11, 2);
    expect(shown.density).toBeCloseTo(fitScale(shown, IPAD_11) * 2, 2);
    expect(backing(shown)).toBeLessThan(MAX_INK_PIXELS);

    const big = frameFor(IPAD_13, 2);
    expect(big.density).toBe(maxInkDensity(big));
    expect(big.density).toBeLessThan(fitScale(big, IPAD_13) * 2);
    expect(backing(big)).toBeLessThanOrEqual(MAX_INK_PIXELS);
  });

  it("never backs a sheet shown small coarser than a phone's sheet, nor past MAX_DPR", () => {
    const small = { width: SHEET_SHORT_UNITS / 2, height: SHEET_SHORT_UNITS };
    expect(fitScale(frameFor(small, 2), small)).toBeLessThan(1);
    expect(frameFor(small, 2).density).toBe(2);
    expect(frameFor(PHONE, MAX_DPR + 1).density).toBe(MAX_DPR);
  });
});

describe("fitScale", () => {
  it("shows the whole sheet as large as the area holds", () => {
    for (const area of [PHONE, IPAD_11, turned(IPAD_11), turned(IPAD_13)]) {
      const frame = frameFor(IPAD_11, 2);
      const scale = fitScale(frame, area);
      // How much of the area's width and height the sheet takes: all of one, no more of the other.
      const taken = [(frame.w * scale) / area.width, (frame.h * scale) / area.height];
      expect(Math.max(...taken)).toBeCloseTo(1, 9);
      expect(Math.min(...taken)).toBeLessThanOrEqual(1);
    }
  });
});

describe("areaFrame", () => {
  it("takes the area itself as the sheet, at scale 1, at the screen's density", () => {
    const area = { width: 1163.53, height: 747.5 };
    const frame = areaFrame(area, 2);
    expect(fitScale(frame, area)).toBeCloseTo(1, 3);
    expect(frame.density).toBe(2);
  });
});
