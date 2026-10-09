import { describe, expect, it } from "vitest";
import { dieCut } from "./dieCut";
import type { Pixels } from "./pixels";
import { stickerLayers, type StickerLayers } from "./stickerLayers";

const RED = [255, 0, 0];
/** The white border on this sheet, in ink pixels. */
const BORDER = 6;

/** A 200 × 200 sheet with a red disk of radius 40 in the middle. */
function redDisk(): Pixels {
  const width = 200;
  const height = 200;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (Math.hypot(x + 0.5 - 100, y + 0.5 - 100) <= 40)
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
