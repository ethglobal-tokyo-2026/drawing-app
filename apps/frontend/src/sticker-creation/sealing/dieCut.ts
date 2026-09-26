/**
 * The die-cut: a sticker's outline from the artist's own ink, with no guessing. The cut is a dilation
 * of the ink, so the same ink always gives the same cut, and it never crops a line. Pure functions over
 * pixel arrays; the ink is measured scaled down to at most GRID pixels on its long side.
 */
import { boxResample, type Pixels } from "./pixels";

export type Point = [x: number, y: number];

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DieCut {
  /** The grid the cut is measured on: the ink scaled by `scale`, with `pad` empty cells around it. */
  width: number;
  height: number;
  scale: number;
  pad: number;
  /** 1 inside the cut. */
  mask: Uint8Array;
  /** Inside the cut, how far each cell is from its edge; 0 outside. */
  distanceIn: Float64Array;
  /** Outside the cut, how far each cell is from it; 0 inside. */
  distanceOut: Float64Array;
  /** The mask blurred: its half level is the cut line, a curve rather than the grid's staircase. */
  soft: Float32Array;
  /** The cut's extent in cells, inclusive. */
  bounds: Bounds;
  /** The cut line, closed, through cell centers. */
  contour: Point[];
  /** Cut as a rounded square, because the ink fills the sheet, runs off it, or won't join up. */
  square: boolean;
}

const GRID = 512;
/** Alpha above which a cell counts as ink. */
const INK_ALPHA = 18;
/** The white border, as a share of the ink's long side. */
const BORDER = 0.03;
/** Each try dilates a little wider, until the parts join into one piece. */
const TRIES = [1, 1.5, 2.1];
/** The closing that rounds the concave corners, as a share of the dilation. */
const CLOSING = 0.7;
/** Ink over this share of the sheet is cut as a square. */
const FULL_BLEED = 0.6;
/** The square cut's corner radius, in borders. */
const SQUARE_CORNER = 1.8;

/** Felzenszwalb–Huttenlocher squared distance transform along one line. */
function distanceLine(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
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
  }
}

/** The Euclidean distance from every cell to the nearest cell that's set in `on`. */
function distanceTo(on: Uint8Array, w: number, h: number): Float64Array {
  const FAR = 1e12;
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = on[i] ? 0 : FAR;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    distanceLine(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) f[x] = g[o + x];
    distanceLine(f, w, d, v, z);
    for (let x = 0; x < w; x++) g[o + x] = Math.sqrt(d[x]);
  }
  return g;
}

/** A separable box blur, clamped at the edges. Twice over, it's close to a Gaussian. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = acc / n;
      acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Sets every cell the border can't reach through empty cells, in place. */
function fillHoles(m: Uint8Array, w: number, h: number) {
  const reached = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!m[i] && !reached[i]) {
      reached[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  for (let i = 0; i < w * h; i++) if (!reached[i]) m[i] = 1;
}

/** How many separate pieces the mask holds, counting no further than two. */
function pieces(m: Uint8Array, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  let count = 0;
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || seen[s]) continue;
    if (++count > 1) return count;
    const stack = [s];
    seen[s] = 1;
    for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
      const x = i % w;
      const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i + w];
      for (const j of next) {
        if (j >= 0 && j < w * h && m[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return count;
}

/** A rounded rectangle, as a mask. */
function roundRect(w: number, h: number, box: Bounds, radius: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = Math.max(0, Math.floor(box.y0)); y <= Math.min(h - 1, Math.ceil(box.y1)); y++) {
    for (let x = Math.max(0, Math.floor(box.x0)); x <= Math.min(w - 1, Math.ceil(box.x1)); x++) {
      const dx = Math.max(box.x0 + radius - x, 0, x - (box.x1 - radius));
      const dy = Math.max(box.y0 + radius - y, 0, y - (box.y1 - radius));
      if (dx * dx + dy * dy <= radius * radius) m[y * w + x] = 1;
    }
  }
  return m;
}

const DX = [-1, -1, 0, 1, 1, 1, 0, -1];
const DY = [0, -1, -1, -1, 0, 1, 1, 1];

/** The outer boundary by a Moore-neighbor trace, every other step, then three Chaikin passes. */
function trace(m: Uint8Array, w: number, h: number): Point[] {
  const start = m.indexOf(1);
  if (start < 0) return [];
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  let cx = start % w;
  let cy = Math.floor(start / w);
  let back = 0;
  const sx = cx;
  const sy = cy;
  const steps: Point[] = [[cx, cy]];
  for (let guard = 0; guard < w * h * 2; guard++) {
    let found = false;
    for (let i = 1; i <= 8; i++) {
      const dir = (back + i) % 8;
      const nx = cx + DX[dir];
      const ny = cy + DY[dir];
      if (!at(nx, ny)) continue;
      const checked = (back + i - 1) % 8;
      const bx = cx + DX[checked] - nx;
      const by = cy + DY[checked] - ny;
      back = DX.findIndex((dx, k) => dx === bx && DY[k] === by);
      cx = nx;
      cy = ny;
      found = true;
      break;
    }
    if (!found || (cx === sx && cy === sy)) break;
    steps.push([cx, cy]);
  }
  let line = steps.filter((_, i) => i % 2 === 0);
  for (let pass = 0; pass < 3; pass++) {
    const next: Point[] = [];
    for (let i = 0; i < line.length; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[(i + 1) % line.length];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    line = next;
  }
  return line;
}

/** Cuts the ink on a sheet; null when there's no ink to cut. */
export function dieCut(ink: Pixels): DieCut | null {
  const scale = Math.min(1, GRID / Math.max(ink.width, ink.height));
  const iw = Math.max(1, Math.ceil(ink.width * scale));
  const ih = Math.max(1, Math.ceil(ink.height * scale));
  const long = Math.max(iw, ih);
  const border = BORDER * long;
  // Room for the widest try and the smoothing, so the cut can grow past the sheet's edge.
  const pad = Math.ceil(border * 4.2 + 0.07 * long + 6);
  const width = iw + 2 * pad;
  const height = ih + 2 * pad;
  const n = width * height;

  const alpha = boxResample(
    ink,
    { x: -pad / scale, y: -pad / scale, step: 1 / scale, width, height },
    1,
  );
  const inked = new Uint8Array(n);
  let count = 0;
  const ink0: Bounds = { x0: width, y0: height, x1: -1, y1: -1 };
  for (let i = 0; i < n; i++) {
    if (alpha[i] <= INK_ALPHA) continue;
    inked[i] = 1;
    count++;
    const x = i % width;
    const y = Math.floor(i / width);
    ink0.x0 = Math.min(ink0.x0, x);
    ink0.x1 = Math.max(ink0.x1, x);
    ink0.y0 = Math.min(ink0.y0, y);
    ink0.y1 = Math.max(ink0.y1, y);
  }
  if (!count) return null;

  // Dilate, round the concave corners with a closing, fill the holes; widen until it's one piece.
  const edges = [
    ink0.y0 - pad <= 1,
    ink0.y1 - pad >= ih - 2,
    ink0.x0 - pad <= 1,
    ink0.x1 - pad >= iw - 2,
  ].filter(Boolean).length;
  let square = count / (iw * ih) > FULL_BLEED || edges >= 3;
  let joined: Uint8Array | null = null;
  if (!square) {
    const fromInk = distanceTo(inked, width, height);
    for (const t of TRIES) {
      const r = border * t;
      const closing = r * CLOSING;
      const outsideGrown = new Uint8Array(n);
      for (let i = 0; i < n; i++) outsideGrown[i] = fromInk[i] <= r + closing ? 0 : 1;
      const toOutside = distanceTo(outsideGrown, width, height);
      const m = new Uint8Array(n);
      for (let i = 0; i < n; i++)
        m[i] = (!outsideGrown[i] && toOutside[i] > closing) || fromInk[i] <= r ? 1 : 0;
      fillHoles(m, width, height);
      if (pieces(m, width, height) === 1) {
        joined = m;
        break;
      }
    }
    square = !joined;
  }
  const mask =
    joined ??
    roundRect(
      width,
      height,
      { x0: ink0.x0 - border, y0: ink0.y0 - border, x1: ink0.x1 + border, y1: ink0.y1 + border },
      border * SQUARE_CORNER,
    );

  const outside = new Uint8Array(n);
  const bounds: Bounds = { x0: width, y0: height, x1: -1, y1: -1 };
  for (let i = 0; i < n; i++) {
    outside[i] = mask[i] ? 0 : 1;
    if (!mask[i]) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    bounds.x0 = Math.min(bounds.x0, x);
    bounds.x1 = Math.max(bounds.x1, x);
    bounds.y0 = Math.min(bounds.y0, y);
    bounds.y1 = Math.max(bounds.y1, y);
  }
  const plain = Float32Array.from(mask);
  const soft = boxBlur(boxBlur(plain, width, height, 2), width, height, 2);
  const edge = new Uint8Array(n);
  for (let i = 0; i < n; i++) edge[i] = soft[i] >= 0.5 ? 1 : 0;

  return {
    width,
    height,
    scale,
    pad,
    mask,
    distanceIn: distanceTo(outside, width, height),
    distanceOut: distanceTo(mask, width, height),
    soft,
    bounds,
    contour: trace(edge, width, height).map(([x, y]) => [x + 0.5, y + 0.5]),
    square,
  };
}
