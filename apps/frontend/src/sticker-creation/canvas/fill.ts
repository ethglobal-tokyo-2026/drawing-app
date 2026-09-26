/** Structural subset of ImageData, so the fill runs in tests without a DOM. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

type Rgb = readonly [number, number, number];

/** Pixels fainter than this are empty paper. */
const EMPTY_ALPHA = 128;
/** A colored region takes in pixels whose summed |ΔRGB| from the tapped pixel is under this. */
const REGION_TOLERANCE = 72;
/** A tap on a color this close to the fill color changes nothing. */
const SAME_COLOR = 8;
/** The fill reaches this many pixels under neighboring edges, so no white halo shows between color and line. */
const TUCK = 2;

const rgbDistance = (data: Uint8ClampedArray, i: number, [r, g, b]: Rgb) =>
  Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);

/**
 * Scanline flood fill from (sx, sy), in the pixels' own units. It takes in empty paper, or a colored
 * region of similar colors, and tucks the fill under what borders it. Returns false when nothing
 * changed: the seed is off the image or already the fill color.
 */
export function floodFill(img: Pixels, sx: number, sy: number, fill: Rgb): boolean {
  const { width: w, height: h, data } = img;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return false;
  const seed = (sy * w + sx) * 4;
  const target: Rgb = [data[seed], data[seed + 1], data[seed + 2]];
  const empty = data[seed + 3] < EMPTY_ALPHA;
  if (!empty && rgbDistance(data, seed, fill) < SAME_COLOR) return false;

  const region = new Uint8Array(w * h);
  const matches = empty
    ? (p: number) => data[p * 4 + 3] < EMPTY_ALPHA
    : (p: number) =>
        data[p * 4 + 3] >= EMPTY_ALPHA && rgbDistance(data, p * 4, target) < REGION_TOLERANCE;
  const open = (p: number) => !region[p] && matches(p);

  let x0 = sx;
  let x1 = sx;
  let y0 = sy;
  let y1 = sy;
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop() ?? 0;
    let x = stack.pop() ?? 0;
    while (x > 0 && open(y * w + x - 1)) x--;
    let up = false;
    let down = false;
    for (; x < w && open(y * w + x); x++) {
      const p = y * w + x;
      region[p] = 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y > 0) {
        const next = open(p - w);
        if (next && !up) stack.push(x, y - 1);
        up = next;
      }
      if (y < h - 1) {
        const next = open(p + w);
        if (next && !down) stack.push(x, y + 1);
        down = next;
      }
    }
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  const bx0 = Math.max(0, x0 - TUCK);
  const bx1 = Math.min(w - 1, x1 + TUCK);
  const by0 = Math.max(0, y0 - TUCK);
  const by1 = Math.min(h - 1, y1 + TUCK);
  const near = dilate(region, w, bx0, bx1, by0, by1);
  const [fr, fg, fb] = fill;
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const p = y * w + x;
      if (!near[p]) continue;
      const i = p * 4;
      // The region takes the fill; its surroundings keep their color over it, by their own alpha.
      const a = region[p] ? 0 : data[i + 3] / 255;
      data[i] = data[i] * a + fr * (1 - a);
      data[i + 1] = data[i + 1] * a + fg * (1 - a);
      data[i + 2] = data[i + 2] * a + fb * (1 - a);
      data[i + 3] = 255;
    }
  }
  return true;
}

/** The region grown by `TUCK` pixels in every direction (a square), within the given box. */
function dilate(
  region: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): Uint8Array {
  // Two one-dimensional passes grow the same square as checking every neighbor, for far less work.
  const rows = new Uint8Array(region.length);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let dx = -TUCK; dx <= TUCK; dx++) {
        const nx = x + dx;
        if (nx >= x0 && nx <= x1 && region[y * w + nx]) {
          rows[y * w + x] = 1;
          break;
        }
      }
    }
  }
  const grown = new Uint8Array(region.length);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let dy = -TUCK; dy <= TUCK; dy++) {
        const ny = y + dy;
        if (ny >= y0 && ny <= y1 && rows[ny * w + x]) {
          grown[y * w + x] = 1;
          break;
        }
      }
    }
  }
  return grown;
}
