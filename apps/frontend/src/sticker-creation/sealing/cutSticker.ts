/**
 * Cutting the sticker from the ink: the die-cut, the passes as PNGs, and the outline. The sealing
 * worker runs it on OffscreenCanvas; where there's no worker for it, the main thread runs it on canvas
 * elements. Nothing here touches the document, so the worker can import it.
 */
import { MAX_FLAT_SIDE } from "@drawing-app/api/client";
import { BORDER_UNITS, dieCut, type Point } from "./dieCut";
import type { Pixels } from "./pixels";
import { bakedGloss, sharpSticker, stickerPasses, type Rect } from "./stickerPasses";

/** The passes only the ceremony shows. */
type PassName = "plain" | "gloss" | "shadow";

/** A blank canvas, on either thread, to paint, then encode as a PNG or hand over as a bitmap. */
interface PngCanvas {
  g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  /** Encodes what's painted, then frees the canvas. */
  png: () => Promise<Blob>;
  /** What's painted, as a bitmap to draw, then frees the canvas. */
  bitmap: () => Promise<ImageBitmap>;
}

export type MakeCanvas = (width: number, height: number) => PngCanvas;

/** The ink: its pixels to cut from, the image the flat sheet scales down, and pixels per unit. */
interface Ink {
  pixels: ImageData;
  image: CanvasImageSource;
  density: number;
}

/** The cut sticker: a SealedSticker once its mask has an object URL. */
export interface CutSticker {
  /** The finished sticker, cast shadow and all. */
  png: Blob;
  /** The sticker again, larger, for screens that show it larger than `png`; null when the ink holds no more. */
  sharp: Blob | null;
  /** The sheet as it was drawn, on white. */
  flat: Blob;
  /** The cut's shape (white, with the cut as alpha), the same size and place as `png`. */
  mask: Blob;
  /** The ceremony's passes, ready to draw: only the ceremony shows them, so they're never encoded. */
  passes: Record<PassName, ImageBitmap>;
  /** The mask as pixels, for the ceremony to paint with. */
  maskPixels: Uint8ClampedArray<ArrayBuffer>;
  /** The cut line as an SVG path, in image pixels. */
  outline: string;
  width: number;
  height: number;
  /** The clear margin around the cut, in image pixels. */
  pad: number;
  /** The ink canvas's width, which `place` and `contour` are measured against. */
  inkWidth: number;
  /** Where the image sits over the ink, in ink pixels. */
  place: Rect;
  /** The cut line, closed, in ink pixels. */
  contour: Point[];
}

/** Image pixels between the stored outline's points: finer than a ticket stub or a sheet can show. */
export const OUTLINE_STEP = 2;

/** The sheet as drawn, on white paper. */
function flatten({ pixels, image }: Ink, make: MakeCanvas): Promise<Blob> {
  const s = Math.min(1, MAX_FLAT_SIDE / Math.max(pixels.width, pixels.height));
  const width = Math.max(1, Math.round(pixels.width * s));
  const height = Math.max(1, Math.round(pixels.height * s));
  const { g, png } = make(width, height);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, width, height);
  g.imageSmoothingQuality = "high";
  g.drawImage(image, 0, 0, width, height);
  return png();
}

/** A line's points at least `step` apart, from its first. */
export function thinned(points: Point[], step: number): Point[] {
  const kept: Point[] = [];
  for (const p of points) {
    const last = kept.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= step) kept.push(p);
  }
  return kept;
}

function outlinePath(points: Point[]): string {
  const kept = thinned(points, OUTLINE_STEP);
  return `M${kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

/**
 * The die-cut and the sticker's passes from ink backed at `density` pixels per sheet unit, its
 * white border BORDER_UNITS wide on any device; null when there's no ink to cut.
 */
export function cutInk(pixels: Pixels, density: number) {
  const cut = dieCut(pixels, BORDER_UNITS * density);
  if (!cut) return null;
  // Worked out once for the stored image and the sharp copy both.
  const glossGrid = bakedGloss(cut);
  return { cut, glossGrid, passes: stickerPasses(pixels, cut, glossGrid) };
}

/** Cuts the sticker from the ink; null when there's no ink to cut. */
export async function cutSticker(ink: Ink, make: MakeCanvas): Promise<CutSticker | null> {
  const { pixels } = ink;
  const inked = cutInk(pixels, ink.density);
  if (!inked) return null;
  const { cut, glossGrid, passes } = inked;
  const { width, height, place } = passes;

  const contour = cut.contour.map(([x, y]): Point => [
    (x - cut.pad) / cut.scale,
    (y - cut.pad) / cut.scale,
  ]);
  const inImage = contour.map(([x, y]): Point => [
    ((x - place.x) * width) / place.w,
    ((y - place.y) * height) / place.h,
  ]);

  /** A pass, on a canvas of its own size. */
  const painted = (pass: Uint8ClampedArray<ArrayBuffer>, w = width, h = height) => {
    const canvas = make(w, h);
    canvas.g.putImageData(new ImageData(pass, w, h), 0, 0);
    return canvas;
  };
  const [png, flat, mask, plain, gloss, shadow] = await Promise.all([
    painted(passes.sticker).png(),
    flatten(ink, make),
    painted(passes.mask).png(),
    painted(passes.plain).bitmap(),
    painted(passes.gloss).bitmap(),
    painted(passes.shadow).bitmap(),
  ]);
  // Once the passes are encoded, so its canvas is never held beside theirs.
  const sharp = sharpSticker(pixels, cut, glossGrid);
  const sharpPng = sharp && (await painted(sharp.sticker, sharp.width, sharp.height).png());
  return {
    png,
    sharp: sharpPng,
    flat,
    mask,
    passes: { plain, gloss, shadow },
    maskPixels: passes.mask,
    outline: outlinePath(inImage),
    width,
    height,
    pad: passes.pad,
    inkWidth: pixels.width,
    place,
    contour,
  };
}
