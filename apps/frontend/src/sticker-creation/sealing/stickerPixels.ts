/**
 * Pure pixel operations that turn drawn ink into a die-cut, domed sticker.
 * Everything works on flat arrays so it runs (and is tested) without a DOM,
 * and is a natural candidate for WASM later.
 */

const INF = 1e20;

/** 1D squared distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared Euclidean distance from every pixel to the nearest set pixel of `mask`. */
export function distanceTransform(mask: Uint8Array, w: number, h: number): Float64Array {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) grid[i] = mask[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

/** Sets enclosed empty regions (not reachable from the border) to 1, in place. */
export function fillHoles(mask: Uint8Array, w: number, h: number): void {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (p: number) => {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    if (p === undefined) break;
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < w * (h - 1)) seed(p + w);
  }
  for (let p = 0; p < mask.length; p++) if (!mask[p] && !outside[p]) mask[p] = 1;
}

type Pt = [number, number];

// Marching-squares segments per case, as pairs of edges: 0 top, 1 right, 2 bottom, 3 left.
const SEGMENTS: number[][] = [
  [],
  [3, 2],
  [2, 1],
  [3, 1],
  [0, 1],
  [3, 0, 2, 1],
  [0, 2],
  [3, 0],
  [3, 0],
  [0, 2],
  [0, 1, 3, 2],
  [0, 1],
  [3, 1],
  [2, 1],
  [3, 2],
  [],
];

/**
 * Outline loops of a binary mask (whose border row/column must be empty),
 * in pixel-center coordinates.
 */
export function traceContours(mask: Uint8Array, w: number, h: number): Pt[][] {
  // Edge midpoints are keyed on a doubled grid so they're integers.
  const W2 = 2 * w + 1;
  const key = (x2: number, y2: number) => y2 * W2 + x2;
  const edgePoint = (x: number, y: number, e: number): number =>
    e === 0
      ? key(2 * x + 1, 2 * y)
      : e === 1
        ? key(2 * x + 2, 2 * y + 1)
        : e === 2
          ? key(2 * x + 1, 2 * y + 2)
          : key(2 * x, 2 * y + 1);
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const la = links.get(a);
    if (la) la.push(b);
    else links.set(a, [b]);
    const lb = links.get(b);
    if (lb) lb.push(a);
    else links.set(b, [a]);
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const c =
        (mask[i] ? 8 : 0) |
        (mask[i + 1] ? 4 : 0) |
        (mask[i + w + 1] ? 2 : 0) |
        (mask[i + w] ? 1 : 0);
      const segs = SEGMENTS[c];
      for (let s = 0; s < segs.length; s += 2)
        link(edgePoint(x, y, segs[s]), edgePoint(x, y, segs[s + 1]));
    }
  }
  const loops: Pt[][] = [];
  const seen = new Set<number>();
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop: Pt[] = [];
    let prev = -1;
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push([(cur % W2) / 2, Math.floor(cur / W2) / 2]);
      const next = links.get(cur)?.find((n) => n !== prev && !seen.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

/** SVG path for outline loops, lightly decimated. */
function contoursToPath(loops: Pt[][], step = 2): string {
  return loops
    .map((loop) => {
      const pts = loop.filter((_, i) => i % step === 0);
      const [x0, y0] = loop[0];
      const [x1, y1] = loop[loop.length - 1];
      // Only close loops that really come back around (the mask may touch the edge).
      const closed = Math.abs(x0 - x1) + Math.abs(y0 - y1) <= 1;
      return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
    })
    .join("");
}

/** Pixel arrays are ArrayBuffer-backed so they can go straight into `ImageData`. */
export interface StickerPixels {
  /** Paper + ink, cut to shape (no dome). */
  cut: Uint8ClampedArray<ArrayBuffer>;
  /** Final sticker with the clear dome. */
  dome: Uint8ClampedArray<ArrayBuffer>;
  /** SVG path of the cut line. */
  outline: string;
}

const smooth01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function hueRgb(h: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 1 - Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

/**
 * `source` is RGBA ink on a transparent background with at least
 * `border + 2` pixels of empty padding. The sticker outline is the ink
 * grown by `border` pixels, with enclosed gaps filled and nearby parts
 * (up to about 2 × `bridge` apart) joined into one smooth piece.
 */
export function makeStickerPixels(
  source: Uint8ClampedArray,
  w: number,
  h: number,
  border: number,
  bridge = 0,
): StickerPixels {
  const n = w * h;
  const ink = new Uint8Array(n);
  for (let p = 0; p < n; p++) ink[p] = source[p * 4 + 3] > 16 ? 1 : 0;

  // Cut = closing(ink, bridge) grown by border: grow by border + bridge,
  // fill holes, then shrink back by bridge. The shrink is measured with a
  // distance transform, which also gives an anti-aliased edge.
  const reach = border + bridge;
  const dInk = distanceTransform(ink, w, h);
  const grown = new Uint8Array(n);
  for (let p = 0; p < n; p++) grown[p] = dInk[p] <= reach * reach ? 1 : 0;
  fillHoles(grown, w, h);
  const outsideGrown = new Uint8Array(n);
  for (let p = 0; p < n; p++) outsideGrown[p] = grown[p] ? 0 : 1;
  const dEdge = distanceTransform(outsideGrown, w, h);
  const coverage = new Float32Array(n);
  const solid = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    // dEdge is to the nearest outside pixel's center; the edge is half a pixel nearer.
    coverage[p] = grown[p] ? Math.min(1, Math.max(0, Math.sqrt(dEdge[p]) - bridge)) : 0;
    solid[p] = coverage[p] >= 0.5 ? 1 : 0;
  }

  // Dome height rises over `bevel` pixels in from the edge.
  const empty = new Uint8Array(n);
  for (let p = 0; p < n; p++) empty[p] = solid[p] ? 0 : 1;
  const dIn = distanceTransform(empty, w, h);
  const bevel = Math.max(6, border * 1.6);
  const height = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const t = Math.min(1, Math.sqrt(dIn[p]) / bevel);
    height[p] = Math.sqrt(1 - (1 - t) * (1 - t));
  }

  const cut = new Uint8ClampedArray(n * 4);
  const dome = new Uint8ClampedArray(n * 4);
  // Light from the top-left, slightly in front.
  const L = [-0.45, -0.65, 0.61];
  const Hv = [L[0], L[1], L[2] + 1];
  const Hl = Math.hypot(Hv[0], Hv[1], Hv[2]);
  const H = [Hv[0] / Hl, Hv[1] / Hl, Hv[2] / Hl];
  const glossX = w * 0.3;
  const glossY = h * 0.22;
  const glossR = Math.max(w, h) * 0.55;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      const a = coverage[p];
      if (a <= 0) continue;
      // Ink over white paper.
      const da = source[i + 3] / 255;
      const r = source[i] * da + 255 * (1 - da);
      const g = source[i + 1] * da + 255 * (1 - da);
      const b = source[i + 2] * da + 255 * (1 - da);
      cut[i] = r;
      cut[i + 1] = g;
      cut[i + 2] = b;
      cut[i + 3] = a * 255;

      // Surface normal from the height field.
      const hx = (height[x < w - 1 ? p + 1 : p] - height[x > 0 ? p - 1 : p]) * 0.5 * bevel * 0.9;
      const hy = (height[y < h - 1 ? p + w : p] - height[y > 0 ? p - w : p]) * 0.5 * bevel * 0.9;
      const nl = Math.hypot(hx, hy, 1);
      const nx = -hx / nl;
      const ny = -hy / nl;
      const nz = 1 / nl;
      const diffuse = nx * L[0] + ny * L[1] + nz * L[2] - L[2];
      const spec = Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), 60);
      const gloss = 0.16 * smooth01(1 - Math.hypot(x - glossX, y - glossY) / glossR);
      const edge = Math.sqrt(dIn[p]);
      const rim = edge < 3 ? 1 - edge / 3 : 0;

      const [ir, ig, ib] = hueRgb(((x / w) * 300 + (y / h) * 160) % 360);
      let R = r + diffuse * 70 + (spec * 0.85 + gloss) * (255 - r);
      let G = g + diffuse * 70 + (spec * 0.85 + gloss) * (255 - g);
      let B = b + diffuse * 70 + (spec * 0.85 + gloss) * (255 - b);
      // Iridescent, slightly milky rim where the resin meets the paper edge.
      const tint = rim * 0.35;
      R = R * (1 - tint) + (200 + ir * 55) * tint;
      G = G * (1 - tint) + (200 + ig * 55) * tint;
      B = B * (1 - tint) + (200 + ib * 55) * tint;
      dome[i] = R;
      dome[i + 1] = G;
      dome[i + 2] = B;
      dome[i + 3] = a * 255;
    }
  }

  return { cut, dome, outline: contoursToPath(traceContours(solid, w, h)) };
}
