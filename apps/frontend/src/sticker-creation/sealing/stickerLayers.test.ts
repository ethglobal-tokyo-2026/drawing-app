import { describe, expect, it } from "vitest";
import { dieCut } from "./dieCut";
import type { Pixels } from "./pixels";
import {
  MAX_SIDE,
  PAD,
  SHARP_SIDE,
  sharpSticker,
  stickerLayers,
  type StickerLayers,
} from "./stickerLayers";

const RED = [255, 0, 0];
/** The white border on this sheet, in ink pixels. */
const BORDER = 6;

/** A `side` px square sheet with a red disk of `radius` in the middle: 200 and 40 unless given. */
function redDisk(side = 200, radius = 40): Pixels {
  const width = side;
  const height = side;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) <= radius)
        data.set([...RED, 255], (y * width + x) * 4);
  return { data, width, height };
}

function layersOf(ink: Pixels) {
  const cut = dieCut(ink, BORDER);
  if (!cut) throw new Error("expected a cut");
  return { cut, layers: stickerLayers(ink, cut) };
}

/** The RGBA of a layer at a point given in sheet pixels. */
function at(layers: StickerLayers, layer: Uint8ClampedArray, [x, y]: [number, number]) {
  const { place, width, height } = layers;
  const ix = Math.floor(((x - place.x) * width) / place.w);
  const iy = Math.floor(((y - place.y) * height) / place.h);
  const i = (iy * width + ix) * 4;
  return [...layer.slice(i, i + 4)];
}

describe("stickerLayers", () => {
  it("prints the ink in its own color on white paper, inside the cut", () => {
    const { layers } = layersOf(redDisk());
    expect(at(layers, layers.plain, [100, 100])).toEqual([...RED, 255]);
    // Between the ink's edge and the cut: the white border.
    expect(at(layers, layers.plain, [100, 100 - 43])).toEqual([255, 255, 255, 255]);
  });

  it("leaves nothing of the print outside the cut, only its groove and cast shadow", () => {
    const { layers } = layersOf(redDisk());
    const { sticker, mask, width, height } = layers;
    for (let i = 0; i < width * height; i++) {
      if (mask[i * 4 + 3] > 0 || sticker[i * 4 + 3] === 0) continue;
      // Ink-dark: no paper white or ink color escapes.
      expect(Math.max(sticker[i * 4], sticker[i * 4 + 1], sticker[i * 4 + 2])).toBeLessThanOrEqual(
        36,
      );
    }
    for (const [x, y] of [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ])
      expect(sticker[(y * width + x) * 4 + 3]).toBe(0);
  });

  it("masks exactly the cut", () => {
    const { cut, layers } = layersOf(redDisk());
    const { mask, width, height, place } = layers;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        // This image pixel's center, on the die-cut's grid.
        const gx = Math.floor((place.x + ((x + 0.5) * place.w) / width) * cut.scale + cut.pad);
        const gy = Math.floor((place.y + ((y + 0.5) * place.h) / height) * cut.scale + cut.pad);
        const g = gy * cut.width + gx;
        const alpha = mask[(y * width + x) * 4 + 3];
        if (cut.distanceIn[g] >= 2) expect(alpha).toBe(255);
        if (cut.distanceOut[g] >= 2) expect(alpha).toBe(0);
      }
  });

  it("darkens the print where the resin pools at the edge, and leaves the middle as printed", () => {
    const { layers } = layersOf(redDisk());
    const brightness = (layer: Uint8ClampedArray, point: [number, number]) =>
      at(layers, layer, point)
        .slice(0, 3)
        .reduce((sum, v) => sum + v, 0);
    expect(brightness(layers.tint, [100, 100])).toBe(brightness(layers.plain, [100, 100]));
    const edge: [number, number] = [100, 100 - 44];
    expect(brightness(layers.tint, edge)).toBeLessThan(brightness(layers.plain, edge));
  });

  it("cuts the live resin's bands from the silhouette: the specular up top, the rim light below", () => {
    const { layers } = layersOf(redDisk());
    const { spec, rim, width, height } = layers.bands;
    // Alpha summed over the top and bottom halves of each band.
    const halves = (band: Uint8ClampedArray) => {
      let top = 0;
      let bottom = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const a = band[(y * width + x) * 4 + 3];
          if (y < height / 2) top += a;
          else bottom += a;
        }
      return { top, bottom };
    };
    const s = halves(spec);
    const r = halves(rim);
    expect(s.top).toBeGreaterThan(4 * s.bottom);
    expect(r.bottom).toBeGreaterThan(4 * r.top);
  });
});

/** Cutting a sheet larger than the stored image takes seconds while the whole suite runs. */
const LARGE_INK_TIMEOUT_MS = 30_000;

describe("sharpSticker", () => {
  /** The long side an image whose cut's long side is `cutSide` comes out at, margins and all. */
  const sideFor = (cutSide: number) => Math.round(cutSide) + 2 * Math.ceil(cutSide * PAD);
  const longSide = ({ width, height }: { width: number; height: number }) =>
    Math.max(width, height);

  it(
    "holds the cut's long side to SHARP_SIDE, from ink that has more",
    () => {
      const ink = redDisk(2000, 950);
      const sharp = sharpSticker(ink, layersOf(ink).cut);
      expect(sharp && longSide(sharp)).toBe(sideFor(SHARP_SIDE));
      expect(sharp?.sticker.length).toBe((sharp?.width ?? 0) * (sharp?.height ?? 0) * 4);
    },
    LARGE_INK_TIMEOUT_MS,
  );

  it(
    "is never larger than the ink was drawn",
    () => {
      const ink = redDisk(1000, 400);
      const { cut, layers } = layersOf(ink);
      const inkSide = (cut.bounds.x1 - cut.bounds.x0 + 1) / cut.scale;
      expect(inkSide).toBeGreaterThan(MAX_SIDE);
      expect(inkSide).toBeLessThan(SHARP_SIDE);
      const sharp = sharpSticker(ink, cut);
      expect(sharp && longSide(sharp)).toBe(sideFor(inkSide));
      expect(longSide(layers)).toBe(sideFor(MAX_SIDE));
    },
    LARGE_INK_TIMEOUT_MS,
  );

  it("is null when the ink holds no more than the stored image", () => {
    const ink = redDisk();
    expect(sharpSticker(ink, layersOf(ink).cut)).toBeNull();
  });
});
