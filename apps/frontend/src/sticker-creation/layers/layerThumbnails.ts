import { context2d } from "../canvas/context2d";
import type { ThumbnailSource } from "./layerView";

/** The paper kept clear round a chip's ink, CSS px. */
export const THUMB_INSET = 3;

/**
 * Draws a layer's ink on its chip's canvas, cropped to the ink's box and scaled to fit inside the
 * inset: centered across, and from the top, so the number in the chip's foot stays as clear as it
 * can. It clears first, so a null source leaves the chip blank.
 */
export function drawThumbnail(
  target: HTMLCanvasElement,
  source: ReturnType<ThumbnailSource>,
  cssWidth: number,
  cssHeight: number,
  density: number,
): void {
  const width = Math.round(cssWidth * density);
  const height = Math.round(cssHeight * density);
  // Setting a canvas's size reallocates its pixels even when the size is the same.
  if (target.width !== width) target.width = width;
  if (target.height !== height) target.height = height;
  const ctx = context2d(target);
  ctx.clearRect(0, 0, width, height);
  if (!source || source.box.w <= 0 || source.box.h <= 0) return;
  const { canvas, box } = source;
  const inset = THUMB_INSET * density;
  const scale = Math.min((width - 2 * inset) / box.w, (height - 2 * inset) / box.h);
  const w = box.w * scale;
  const h = box.h * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, box.x, box.y, box.w, box.h, (width - w) / 2, inset, w, h);
}
