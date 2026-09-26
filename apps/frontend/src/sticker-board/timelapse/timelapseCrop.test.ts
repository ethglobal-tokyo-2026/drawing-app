import { describe, expect, it } from "vitest";
import type { Pixels } from "../../sticker-creation/canvas/fill";
import { MAX_DPR } from "../../sticker-creation/canvas/inkSurface";
import { dieCut } from "../../sticker-creation/sealing/dieCut";
import { stickerLayers } from "../../sticker-creation/sealing/stickerLayers";
import { decodeTimelapse, encodeTimelapse } from "../../sticker-creation/sealing/timelapse";
import {
  CAPPED_IMAGE_SIDE,
  changedArea,
  displayCanvas,
  displayPoint,
  drawingDensity,
  revealRadius,
  sheetCrop,
} from "./timelapseCrop";

/** A square sheet drawn at `density`, ink over a square of `side` sheet px in its middle, as sealing would cut it. */
function sealedSquare(density: number, sheetSide: number, side: number) {
  const size = Math.round(sheetSide * density);
  const data = new Uint8ClampedArray(size * size * 4);
  const from = Math.round(((sheetSide - side) / 2) * density);
  const to = from + Math.round(side * density);
  for (let y = from; y < to; y++) {
    for (let x = from; x < to; x++) data.set([28, 24, 36, 255], (y * size + x) * 4);
  }
  const ink: Pixels = { width: size, height: size, data };
  const cut = dieCut(ink);
  if (!cut) throw new Error("the sheet has ink, so it cuts");
  const layers = stickerLayers(ink, cut);
  const timelapse = decodeTimelapse(
    encodeTimelapse({ ops: [], ink: { width: size, height: size }, place: layers.place, density }),
  );
  return { timelapse, image: { width: layers.width, height: layers.height } };
}

describe("the density a sticker was drawn at", () => {
  it("is the recorded one, up to the ink surface's cap", () => {
    const { timelapse, image } = sealedSquare(2, 150, 50);
    expect(drawingDensity({ ...timelapse, density: 2.625 }, image)).toBe(2.625);
    expect(drawingDensity({ ...timelapse, density: MAX_DPR + 1 }, image)).toBe(MAX_DPR);
  });

  it.each([2, 2.625])(
    "is estimated from an image cut at the ink's own resolution, at %s",
    (density) => {
      const { timelapse, image } = sealedSquare(density, 150, 50);
      expect(Math.max(image.width, image.height)).toBeLessThan(CAPPED_IMAGE_SIDE);
      expect(drawingDensity({ ...timelapse, density: null }, image)).toBeCloseTo(density, 2);
    },
  );

  it("is MAX_DPR when sealing scaled the image down, which only its cap on the image's side shows", () => {
    const { timelapse, image } = sealedSquare(2, 380, 340);
    expect(Math.max(image.width, image.height)).toBe(CAPPED_IMAGE_SIDE);
    expect(drawingDensity({ ...timelapse, density: null }, image)).toBe(MAX_DPR);
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
  /** Layers laid out in fractions of a CSS px, as the detail sizes a sticker by its aspect. */
  const LAYERS = [
    [146.66, 216],
    [70.5, 216],
    [93.51, 216],
    [216, 146.94],
    [216, 61.37],
  ];

  it.each([1, 2, 2.625, 3])(
    "maps the ink's place onto the whole layer, to half a pixel, at a density of %s",
    (density) => {
      for (const [width, height] of LAYERS) {
        const place = { x: 12.3, y: 40.5, w: 60, h: (60 * height) / width };
        // The figure's offset width, which layout rounds to whole CSS px.
        const display = displayCanvas(place, Math.round(width), density);
        // The canvas covers the layer, so the ink ends where the canvas does, on both axes.
        expect(Math.abs(place.w * display.scale - display.width)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(place.h * display.scale - display.height)).toBeLessThanOrEqual(0.5);
      }
    },
  );
});

describe("a point on the display", () => {
  it("is where the sticker's crop puts a point of the sheet", () => {
    expect(displayPoint({ x: 20, y: 30 }, 3, { x: 40, y: 50 })).toEqual({ x: 60, y: 60 });
  });
});
