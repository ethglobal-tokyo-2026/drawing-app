/**
 * Cutting the sticker from the ink: the die-cut, the passes as PNGs, and the outline. The sealing
 * worker runs it on OffscreenCanvas; where there's no worker for it, the main thread runs it on canvas
 * elements. Nothing here touches the document, so the worker can import it.
 */
import { BORDER_UNITS, dieCut, type Point } from "./dieCut";
import type { Pixels } from "./pixels";
import { sharpSticker, stickerPasses, type Rect } from "./stickerPasses";

export type PassName = "plain" | "gloss" | "shadow" | "mask";

/** A blank canvas, on either thread, to paint and encode as a PNG. */
interface PngCanvas {
  g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  /** Encodes what's painted, then frees the canvas. */
  png: () => Promise<Blob>;
}

export type MakeCanvas = (width: number, height: number) => PngCanvas;

/** The ink: its pixels to cut from, the image the flat sheet scales down, and pixels per unit. */
interface Ink {
  pixels: ImageData;
  image: CanvasImageSource;
  density: number;
}

/** The cut sticker: a SealedSticker once its passes are object URLs. */
export interface CutSticker {
  /** The finished sticker, cast shadow and all. */
  png: Blob;
  /** The sticker again, larger, for screens that show it larger than `png`; null when the ink holds no more. */
  sharp: Blob | null;
  /** The sheet as it was drawn, on white. */
  flat: Blob;
  /** The ceremony's passes, as PNGs. */
  passes: Record<PassName, Blob>;
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

/** The long side of the flat sheet, at most. */
const FLAT_SIDE = 1100;
/** Image pixels between the stored outline's points: finer than a ticket stub or a sheet can show. */
const OUTLINE_STEP = 2;

/** The sheet as drawn, on white paper. */
function flatten({ pixels, image }: Ink, make: MakeCanvas): Promise<Blob> {
  const s = Math.min(1, FLAT_SIDE / Math.max(pixels.width, pixels.height));
  const width = Math.max(1, Math.round(pixels.width * s));
  const height = Math.max(1, Math.round(pixels.height * s));
  const { g, png } = make(width, height);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, width, height);
  g.imageSmoothingQuality = "high";
  g.drawImage(image, 0, 0, width, height);
  return png();
}

function outlinePath(points: Point[]): string {
  const kept: Point[] = [];
  for (const p of points) {
    const last = kept.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= OUTLINE_STEP) kept.push(p);
  }
  return `M${kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

/**
 * The die-cut and the sticker's passes from ink backed at `density` pixels per sheet unit, its
 * white border BORDER_UNITS wide on any device; null when there's no ink to cut.
 */
export function cutInk(pixels: Pixels, density: number) {
  const cut = dieCut(pixels, BORDER_UNITS * density);
  return cut && { cut, passes: stickerPasses(pixels, cut) };
}

/** Cuts the sticker from the ink; null when there's no ink to cut. */
export async function cutSticker(ink: Ink, make: MakeCanvas): Promise<CutSticker | null> {
  const { pixels } = ink;
  const inked = cutInk(pixels, ink.density);
  if (!inked) return null;
  const { cut, passes } = inked;
  const { width, height, place } = passes;

  const contour = cut.contour.map(([x, y]): Point => [
    (x - cut.pad) / cut.scale,
    (y - cut.pad) / cut.scale,
  ]);
  const inImage = contour.map(([x, y]): Point => [
    ((x - place.x) * width) / place.w,
    ((y - place.y) * height) / place.h,
  ]);

  const encoded = (pass: Uint8ClampedArray<ArrayBuffer>, w = width, h = height) => {
    const { g, png } = make(w, h);
    g.putImageData(new ImageData(pass, w, h), 0, 0);
    return png();
  };
  const [png, flat, plain, gloss, shadow, mask] = await Promise.all([
    encoded(passes.sticker),
    flatten(ink, make),
    encoded(passes.plain),
    encoded(passes.gloss),
    encoded(passes.shadow),
    encoded(passes.mask),
  ]);
  // Once the passes are encoded, so its canvas is never held beside theirs.
  const sharp = sharpSticker(pixels, cut);
  const sharpPng = sharp && (await encoded(sharp.sticker, sharp.width, sharp.height));
  return {
    png,
    sharp: sharpPng,
    flat,
    passes: { plain, gloss, shadow, mask },
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
