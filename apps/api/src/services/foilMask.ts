/**
 * The foil band's mask: a sticker's silhouette grown outward by an even distance, found with a
 * Euclidean distance transform, so the band has a crisp edge and the same width all the way round.
 */

/** How far the band reaches past the cut, as a share of the image's long side: under the image's clear margin. */
export const FOIL_REACH = 0.04;
/** A mask pixel at or over this alpha is inside the cut. */
const INSIDE_ALPHA = 128;
/** Stands in for "no inside pixel on this line yet". */
const FAR = 1e20;

/**
 * Squared distances along one line of `n` cells, from each to the nearest cell whose `f` is 0,
 * adding `f` (Felzenszwalb and Huttenlocher's lower envelope of parabolas).
 */
function distanceAlong(
  f: Float64Array,
  n: number,
  out: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Each pixel's squared distance to the nearest pixel inside the cut. */
function squaredDistanceToCut(alpha: Uint8Array, width: number, height: number): Float64Array {
  const d = new Float64Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = alpha[i] >= INSIDE_ALPHA ? 0 : FAR;
  const long = Math.max(width, height);
  const f = new Float64Array(long);
  const out = new Float64Array(long);
  const v = new Int32Array(long);
  const z = new Float64Array(long + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = d[y * width + x];
    distanceAlong(f, height, out, v, z);
    for (let y = 0; y < height; y++) d[y * width + x] = out[y];
  }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) f[x] = d[row + x];
    distanceAlong(f, width, out, v, z);
    for (let x = 0; x < width; x++) d[row + x] = out[x];
  }
  return d;
}

/**
 * The band's mask from the cut's alpha, one byte per pixel: opaque over the cut and out to
 * `FOIL_REACH` past it, with a one-pixel ramp at the outer edge so it's crisp at any scale.
 */
export function foilMaskAlpha(cutAlpha: Uint8Array, width: number, height: number): Uint8Array {
  const reach = FOIL_REACH * Math.max(width, height);
  const squared = squaredDistanceToCut(cutAlpha, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    // A pixel's center is about half a pixel further from the cut than from the nearest pixel inside it.
    const past = Math.sqrt(squared[i]) - 0.5;
    const cover = reach + 0.5 - past;
    mask[i] = cover >= 1 ? 255 : cover <= 0 ? 0 : Math.round(cover * 255);
  }
  return mask;
}
