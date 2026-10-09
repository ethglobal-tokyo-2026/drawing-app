/**
 * The foil band's mask: a sticker's silhouette grown outward by an even distance, found with a
 * Euclidean distance transform, so the band has a crisp edge and the same width all the way round.
 */
import { squaredDistanceTo } from "./distanceTransform.ts";

/** How far the band reaches past the cut, as a share of the image's long side: under the image's clear margin. */
export const FOIL_REACH = 0.04;
/** A mask pixel at or over this alpha is inside the cut. */
export const INSIDE_ALPHA = 128;

/**
 * The band's mask from the cut's alpha, one byte per pixel: opaque over the cut and out to
 * `FOIL_REACH` past it, with a one-pixel ramp at the outer edge so it's crisp at any scale.
 */
export function foilMaskAlpha(cutAlpha: Uint8Array, width: number, height: number): Uint8Array {
  const reach = FOIL_REACH * Math.max(width, height);
  const squared = squaredDistanceTo((i) => cutAlpha[i] >= INSIDE_ALPHA, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    // A pixel's center is about half a pixel further from the cut than from the nearest pixel inside it.
    const past = Math.sqrt(squared[i]) - 0.5;
    const cover = reach + 0.5 - past;
    mask[i] = cover >= 1 ? 255 : cover <= 0 ? 0 : Math.round(cover * 255);
  }
  return mask;
}
