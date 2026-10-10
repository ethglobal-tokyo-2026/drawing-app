import { describe, expect, it } from "vitest";
import { dieCut } from "./dieCut";
import type { Pixels } from "./pixels";
import {
  MAX_SIDE,
  PAD,
  SHARP_SIDE,
  bakedGloss,
  sharpSticker,
  stickerPasses,
  type StickerPasses,
} from "./stickerPasses";

const RED = [255, 0, 0];
const GRAY = [120, 120, 120];
/** The white border on this sheet, in ink pixels. */
const BORDER = 6;
/** The disks' middle and radius on their 200 × 200 sheet, in ink pixels. */
const MIDDLE = 100;
const RADIUS = 40;
/** How far the cut runs from the middle. */
const CUT_RADIUS = RADIUS + BORDER;

/** A `side` px square sheet with a disk of `color` and `radius` in the middle: 200 and 40 unless given. */
function disk(color: number[], side = 2 * MIDDLE, radius = RADIUS): Pixels {
  const width = side;
  const height = side;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) <= radius)
        data.set([...color, 255], (y * width + x) * 4);
  return { data, width, height };
}

const redDisk = (side?: number, radius?: number) => disk(RED, side, radius);

function passesOf(ink: Pixels) {
  const cut = dieCut(ink, BORDER);
  if (!cut) throw new Error("expected a cut");
  const glossGrid = bakedGloss(cut);
  return { cut, glossGrid, passes: stickerPasses(ink, cut, glossGrid) };
}

function sharpOf(ink: Pixels) {
  const { cut, glossGrid } = passesOf(ink);
  return sharpSticker(ink, cut, glossGrid);
}

/** The RGBA of a pass at a point given in sheet pixels. */
function at(passes: StickerPasses, pass: Uint8ClampedArray, [x, y]: [number, number]) {
  const { place, width, height } = passes;
  const ix = Math.floor(((x - place.x) * width) / place.w);
  const iy = Math.floor(((y - place.y) * height) / place.h);
  const i = (iy * width + ix) * 4;
  return [...pass.slice(i, i + 4)];
}

describe("stickerPasses", () => {
  it("prints the ink in its own color on white paper, inside the cut", () => {
    const { passes } = passesOf(redDisk());
    expect(at(passes, passes.plain, [100, 100])).toEqual([...RED, 255]);
    // Between the ink's edge and the cut: the white border.
    expect(at(passes, passes.plain, [100, 100 - 43])).toEqual([255, 255, 255, 255]);
  });

  it("leaves nothing of the print outside the cut, only its groove and cast shadow", () => {
    const { passes } = passesOf(redDisk());
    const { sticker, mask, width, height } = passes;
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
    const { cut, passes } = passesOf(redDisk());
    const { mask, width, height, place } = passes;
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

  it("keeps the border paper white all the way to the cut", () => {
    const { plain, mask, sticker, width, height } = passesOf(redDisk()).passes;
    let paper = 0;
    let tinted = 0;
    for (let q = 0; q < width * height * 4; q += 4) {
      const isPaper = mask[q + 3] === 255 && plain.slice(q, q + 3).every((v) => v === 255);
      if (!isPaper) continue;
      paper++;
      if (sticker.slice(q, q + 3).some((v) => v !== 255)) tinted++;
    }
    expect(paper).toBeGreaterThan(0);
    expect(tinted).toBe(0);
  });

  it("never darkens the print inside the cut, so no edge is darker than the middle", () => {
    const { plain, mask, sticker, width, height } = passesOf(disk(GRAY)).passes;
    let darkened = 0;
    for (let q = 0; q < width * height * 4; q += 4) {
      if (mask[q + 3] < 255) continue;
      for (let c = 0; c < 3; c++) if (sticker[q + c] < plain[q + c]) darkened++;
    }
    expect(darkened).toBe(0);
  });

  it("lights the edge that faces the light, and nothing on the side away from it", () => {
    const { passes } = passesOf(redDisk());
    // Just inside the cut, on the diagonal toward the light (top left) and away from it.
    const inside = (CUT_RADIUS - 1) / Math.SQRT2;
    const glossAt = (sign: number) =>
      at(passes, passes.gloss, [MIDDLE + sign * inside, MIDDLE + sign * inside])[3];
    expect(glossAt(-1)).toBeGreaterThan(0);
    expect(glossAt(1)).toBe(0);
  });

  it("casts a thin sticker's short shadow, ending in the inner half of the clear margin", () => {
    const { shadow, mask, width, height, pad } = passesOf(redDisk()).passes;
    // Straight down the middle: the cut's last row, and the cast's.
    const column = Math.floor(width / 2);
    let cutEnds = 0;
    let castEnds = 0;
    for (let y = 0; y < height; y++) {
      if (mask[(y * width + column) * 4 + 3] > 0) cutEnds = y;
      if (shadow[(y * width + column) * 4 + 3] > 0) castEnds = y;
    }
    expect(castEnds).toBeGreaterThan(cutEnds);
    expect(castEnds - cutEnds).toBeLessThanOrEqual(pad / 2);
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
      const sharp = sharpOf(ink);
      expect(sharp && longSide(sharp)).toBe(sideFor(SHARP_SIDE));
      expect(sharp?.sticker.length).toBe((sharp?.width ?? 0) * (sharp?.height ?? 0) * 4);
    },
    LARGE_INK_TIMEOUT_MS,
  );

  it(
    "is never larger than the ink was drawn",
    () => {
      const ink = redDisk(1000, 400);
      const { cut, glossGrid, passes } = passesOf(ink);
      const inkSide = (cut.bounds.x1 - cut.bounds.x0 + 1) / cut.scale;
      expect(inkSide).toBeGreaterThan(MAX_SIDE);
      expect(inkSide).toBeLessThan(SHARP_SIDE);
      const sharp = sharpSticker(ink, cut, glossGrid);
      expect(sharp && longSide(sharp)).toBe(sideFor(inkSide));
      expect(longSide(passes)).toBe(sideFor(MAX_SIDE));
    },
    LARGE_INK_TIMEOUT_MS,
  );

  it("is null when the ink holds no more than the stored image", () => {
    const ink = redDisk();
    expect(sharpOf(ink)).toBeNull();
  });
});
