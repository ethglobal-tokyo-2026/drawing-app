/** An image as ImageData holds it: RGBA, row by row, not premultiplied. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * A window onto a source image, `width` × `height` pixels, each averaging a `step`-wide square of the
 * source: pixel (x, y) covers [x + x·step, x + (x + 1)·step) across and likewise down. Anything off the
 * source is empty.
 */
export interface Window {
  x: number;
  y: number;
  step: number;
  width: number;
  height: number;
}

interface Taps {
  first: Int32Array;
  count: Int32Array;
  weight: Float32Array;
  stride: number;
}

/** Along one axis: the source pixels each window pixel covers, and how much of each. */
function taps(size: number, source: number, start: number, step: number): Taps {
  const stride = Math.ceil(step) + 1;
  const first = new Int32Array(size);
  const count = new Int32Array(size);
  const weight = new Float32Array(size * stride);
  for (let i = 0; i < size; i++) {
    const a = start + i * step;
    const b = a + step;
    const p0 = Math.max(0, Math.floor(a));
    const p1 = Math.min(source, Math.ceil(b));
    first[i] = p0;
    count[i] = Math.max(0, p1 - p0);
    for (let p = p0; p < p1; p++)
      weight[i * stride + p - p0] = (Math.min(b, p + 1) - Math.max(a, p)) / step;
  }
  return { first, count, weight, stride };
}

function resampleRow(src: Pixels, q: number, tx: Taps, channels: 1 | 4, row: Float32Array) {
  row.fill(0);
  const { data, width } = src;
  const base = q * width;
  for (let i = 0; i < tx.count.length; i++) {
    const o = i * channels;
    for (let t = 0; t < tx.count[i]; t++) {
      const k = (base + tx.first[i] + t) * 4;
      const a = data[k + 3];
      if (!a) continue;
      const w = tx.weight[i * tx.stride + t];
      if (channels === 1) {
        row[o] += w * a;
        continue;
      }
      const wa = (w * a) / 255;
      row[o] += wa * data[k];
      row[o + 1] += wa * data[k + 1];
      row[o + 2] += wa * data[k + 2];
      row[o + 3] += w * a;
    }
  }
}

/**
 * Scales a window of `src` down by area-averaging. One channel gives the alpha; four give RGBA
 * premultiplied by it, on the 0–255 scale, so colors at soft edges don't darken.
 */
export function boxResample(src: Pixels, win: Window, channels: 1 | 4): Float32Array {
  const tx = taps(win.width, src.width, win.x, win.step);
  const ty = taps(win.height, src.height, win.y, win.step);
  const rowLength = win.width * channels;
  const out = new Float32Array(win.height * rowLength);
  // Neighboring window rows share at most their boundary source row, so two cached rows are enough.
  const cache = [
    { q: -1, row: new Float32Array(rowLength) },
    { q: -1, row: new Float32Array(rowLength) },
  ];
  let next = 0;
  const rowAt = (q: number) => {
    for (const c of cache) if (c.q === q) return c.row;
    const c = cache[next];
    next = 1 - next;
    c.q = q;
    resampleRow(src, q, tx, channels, c.row);
    return c.row;
  };
  for (let j = 0; j < win.height; j++) {
    const o = j * rowLength;
    for (let t = 0; t < ty.count[j]; t++) {
      const wy = ty.weight[j * ty.stride + t];
      const row = rowAt(ty.first[j] + t);
      for (let i = 0; i < rowLength; i++) out[o + i] += wy * row[i];
    }
  }
  return out;
}
