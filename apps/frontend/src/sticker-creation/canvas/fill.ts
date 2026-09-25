import type { RGBA } from "./color";

/** Structural subset of ImageData, so this runs in tests without a DOM. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Scanline flood fill from (sx, sy) in device pixels. Pixels within
 * `tolerance` of the seed color (per channel) are filled, then the region
 * grows by one pixel to cover anti-aliased stroke edges. Returns false when
 * nothing changed (seed out of bounds or already the fill color).
 */
export function floodFill(
  img: Pixels,
  sx: number,
  sy: number,
  color: RGBA,
  tolerance = 40,
): boolean {
  const { width: w, height: h, data } = img;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;
  const seed = (sy * w + sx) * 4;
  const [tr, tg, tb, ta] = [data[seed], data[seed + 1], data[seed + 2], data[seed + 3]];
  if (tr === color[0] && tg === color[1] && tb === color[2] && ta === color[3]) return false;

  const mask = new Uint8Array(w * h);
  const matches = (p: number) => {
    if (mask[p]) return false;
    const i = p * 4;
    return (
      Math.abs(data[i + 3] - ta) <= tolerance &&
      // Fully transparent pixels match each other whatever their RGB.
      (ta === 0 && data[i + 3] === 0
        ? true
        : Math.abs(data[i] - tr) <= tolerance &&
          Math.abs(data[i + 1] - tg) <= tolerance &&
          Math.abs(data[i + 2] - tb) <= tolerance)
    );
  };

  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    if (y === undefined || x === undefined) break;
    while (x > 0 && matches(y * w + x - 1)) x--;
    let up = false;
    let down = false;
    for (; x < w && matches(y * w + x); x++) {
      const p = y * w + x;
      mask[p] = 1;
      if (y > 0) {
        const m = matches(p - w);
        if (m && !up) stack.push(x, y - 1);
        up = m;
      }
      if (y < h - 1) {
        const m = matches(p + w);
        if (m && !down) stack.push(x, y + 1);
        down = m;
      }
    }
  }

  const [r, g, b, a] = color;
  const paint = (p: number) => {
    const i = p * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  for (let p = 0; p < mask.length; p++) {
    if (mask[p] !== 1) continue;
    paint(p);
    const x = p % w;
    // Grow by one pixel (marked 2 so growth doesn't cascade).
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q >= 0 && q < mask.length && !mask[q]) {
        mask[q] = 2;
        paint(q);
      }
    }
  }
  return true;
}
