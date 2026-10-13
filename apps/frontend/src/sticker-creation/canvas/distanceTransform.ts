/** Felzenszwalb–Huttenlocher squared distance transform along one line; `at` gets each argmin. */
function distanceLine(
  f: Float64Array,
  n: number,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  at?: Int32Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
    if (at) at[q] = v[k];
  }
}

/** Binary zero/capped costs reduce to the nearest zero in either direction, without argmin ties. */
function binaryDistanceLine(f: Float64Array, n: number, d: Float64Array, cap: number) {
  let previous = -Infinity;
  for (let q = 0; q < n; q++) {
    if (f[q] === 0) previous = q;
    const delta = q - previous;
    d[q] = Math.min(cap, delta * delta);
  }
  let next = Infinity;
  for (let q = n - 1; q >= 0; q--) {
    if (f[q] === 0) next = q;
    const delta = next - q;
    d[q] = Math.min(d[q], delta * delta);
  }
}

/** Replaces finite squared costs with their Euclidean minima; optionally records original cells. */
export function squaredDistanceTransform(
  distances: Float32Array | Float64Array,
  width: number,
  height: number,
  nearest?: Int32Array,
): void {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const at = nearest && new Int32Array(n);
  // Down each column, the row of its nearest cell; along each row, the column whose is nearest.
  const row = nearest && new Int32Array(width * height);
  for (let x = 0; x < width; x++) {
    let binary = !nearest;
    let cap = 0;
    for (let y = 0; y < height; y++) {
      const value = distances[y * width + x];
      f[y] = value;
      if (binary && value !== 0) {
        if (value < 0 || (cap !== 0 && value !== cap)) binary = false;
        else cap = value;
      }
    }
    if (binary) binaryDistanceLine(f, height, d, cap);
    else distanceLine(f, height, d, v, z, at);
    for (let y = 0; y < height; y++) distances[y * width + x] = d[y];
    if (row && at) for (let y = 0; y < height; y++) row[y * width + x] = at[y];
  }
  for (let y = 0; y < height; y++) {
    const o = y * width;
    for (let x = 0; x < width; x++) f[x] = distances[o + x];
    distanceLine(f, width, d, v, z, at);
    for (let x = 0; x < width; x++) distances[o + x] = d[x];
    if (nearest && row && at)
      for (let x = 0; x < width; x++) nearest[o + x] = row[o + at[x]] * width + at[x];
  }
}
