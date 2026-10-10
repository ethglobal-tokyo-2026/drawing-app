import { describe, expect, it } from "vitest";
import type { Pixels } from "../../sticker-creation/canvas/fill";
import { MAX_DPR, MAX_INK_PIXELS } from "../../sticker-creation/canvas/sheetFrame";
import {
  changedArea,
  displayBox,
  displayPoint,
  displayView,
  drawingDensity,
  revealRadius,
  sheetCrop,
} from "./timelapseCrop";

describe("the density a sticker was drawn at", () => {
  it("is the recorded one, up to the densest any sheet that size was backed at", () => {
    const ink = { width: 150, height: 150 };
    const most = Math.floor(Math.sqrt(4_200_000 / (ink.width * ink.height)) * 1000) / 1000;
    // An iPad's sheet is backed denser than any screen's own pixels, and its fills flood at that.
    expect(drawingDensity({ ink, density: most - 1 })).toBe(most - 1);
    expect(drawingDensity({ ink, density: most + 1 })).toBe(most);
    // A sheet the size of a big screen, backed at the screen's own density, floods as it did.
    const side = Math.sqrt(MAX_INK_PIXELS);
    const big = { width: side, height: side };
    expect(drawingDensity({ ink: big, density: MAX_DPR - 1 })).toBe(MAX_DPR - 1);
    expect(drawingDensity({ ink: big, density: MAX_DPR + 1 })).toBe(MAX_DPR);
  });
});

describe("the sheet's crop", () => {
  const sheet = { width: 800, height: 1200, density: 2 };
  const display = { width: 300, height: 300, scale: 3 };

  it("reads the place's window of the sheet onto the whole display", () => {
    expect(sheetCrop({ x: 10, y: 20 }, sheet, display)).toEqual({
      source: { x: 20, y: 40, w: 200, h: 200 },
      target: { x: 0, y: 0, w: 300, h: 300 },
    });
  });

  it("reads only the sheet where the place reaches past its edges, and moves the target to match", () => {
    expect(sheetCrop({ x: -5, y: -10 }, sheet, display)).toEqual({
      source: { x: 0, y: 0, w: 190, h: 180 },
      target: { x: 15, y: 30, w: 285, h: 270 },
    });
    expect(sheetCrop({ x: 350, y: 550 }, sheet, display)).toEqual({
      source: { x: 700, y: 1100, w: 100, h: 100 },
      target: { x: 0, y: 0, w: 150, h: 150 },
    });
  });

  it("reads nothing where the place misses the sheet", () => {
    expect(sheetCrop({ x: 500, y: 0 }, sheet, display)).toBeNull();
  });
});

describe("what a fill changed", () => {
  const blank = (): Pixels => ({ width: 5, height: 4, data: new Uint8ClampedArray(5 * 4 * 4) });
  const tap = { x: 0.5, y: 0.5 };

  it("is the box around every pixel that differs, in any channel", () => {
    const before = blank();
    const after = blank();
    after.data[(2 * 5 + 1) * 4] = 255;
    after.data[(1 * 5 + 3) * 4 + 3] = 1;
    expect(changedArea(before, after, tap)?.box).toEqual({ x: 1, y: 1, w: 3, h: 2 });
  });

  it("reaches from the tap past the farthest pixel that differs, and no farther than the pixel's corner", () => {
    const before = blank();
    const after = blank();
    after.data[(2 * 5 + 1) * 4] = 255;
    after.data[(1 * 5 + 3) * 4] = 255;
    const reach = changedArea(before, after, tap)?.reach ?? 0;
    // The farthest changed pixel spans (3, 1) to (4, 2); the tap is the middle of pixel (0, 0).
    expect(reach).toBeGreaterThanOrEqual(Math.hypot(3.5 - tap.x, 1.5 - tap.y));
    expect(reach).toBeLessThanOrEqual(Math.hypot(4 - tap.x, 2 - tap.y));
  });

  it("is nothing when nothing changed", () => {
    expect(changedArea(blank(), blank(), tap)).toBeNull();
  });
});

describe("the reveal's circle", () => {
  it("grows from the tap to what the fill reached, easing out", () => {
    const reach = 30;
    const radii = [0, 0.25, 0.5, 0.75, 1].map((progress) => revealRadius(reach, progress));
    expect(radii[0]).toBe(0);
    expect(radii.at(-1)).toBe(reach);
    expect(radii).toEqual(radii.toSorted((a, b) => a - b));
    expect(new Set(radii).size).toBe(radii.length);
    expect(radii[2]).toBeGreaterThan(reach / 2);
  });
});

describe("the display canvas", () => {
  it.each([1, 2, 2.625, 3])(
    "covers the stage, and shows each sheet point where the layout puts it, at a density of %s",
    (density) => {
      // A stage laid out in fractions of a CSS px, and a sheet shrunk and slid to fit it.
      const stage = { width: 303.66, height: 240 };
      const at = { left: -41.2, top: 12.5, scale: 0.77 };
      const view = displayView(stage, at, density);
      expect(Math.abs(view.width - stage.width * density)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(view.height - stage.height * density)).toBeLessThanOrEqual(0.5);
      const point = { x: 150, y: 333 };
      const shown = displayPoint(view.origin, view.scale, point);
      expect(shown.x).toBeCloseTo((at.left + point.x * at.scale) * density);
      expect(shown.y).toBeCloseTo((at.top + point.y * at.scale) * density);
    },
  );

  it("holds a sheet box's pixels, one to spare for scaling, and only on the display", () => {
    const view = { width: 100, height: 80, scale: 2, origin: { x: 10, y: 10 } };
    const box = { x: 20, y: 20, w: 5.2, h: 3 };
    const on = displayBox(view, box);
    if (!on) throw new Error("the box is on the display");
    const from = displayPoint(view.origin, view.scale, box);
    const to = displayPoint(view.origin, view.scale, { x: box.x + box.w, y: box.y + box.h });
    expect(on.x).toBe(Math.floor(from.x) - 1);
    expect(on.y).toBe(Math.floor(from.y) - 1);
    expect(on.x + on.w).toBe(Math.ceil(to.x) + 1);
    expect(on.y + on.h).toBe(Math.ceil(to.y) + 1);
    expect(displayBox(view, { x: 0, y: 0, w: 200, h: 200 })).toEqual({ x: 0, y: 0, w: 100, h: 80 });
    expect(displayBox(view, { x: 500, y: 0, w: 5, h: 5 })).toBeNull();
  });
});

describe("a point on the display", () => {
  it("is where the sticker's crop puts a point of the sheet", () => {
    expect(displayPoint({ x: 20, y: 30 }, 3, { x: 40, y: 50 })).toEqual({ x: 60, y: 60 });
  });
});
