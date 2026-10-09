/** A Euclidean distance transform over a sticker image's pixels (Felzenszwalb and Huttenlocher). */

/** Stands in for "no seed on this line yet". */
const FAR = 1e20;

/**
 * Squared distances along one line of `n` cells, from each to the nearest cell whose `f` is 0,
 * adding `f` (the lower envelope of parabolas).
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

/** Each pixel's squared distance to the nearest pixel `isSeed` picks, center to center. */
export function squaredDistanceTo(
  isSeed: (i: number) => boolean,
  width: number,
  height: number,
): Float64Array {
  const d = new Float64Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = isSeed(i) ? 0 : FAR;
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
