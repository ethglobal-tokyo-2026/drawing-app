/**
 * Sticker sheets packed by each sticker's cut line, as on a die-cut sheet: varied gaps, slight turns,
 * as many to a sheet as the shapes allow. Pure and deterministic.
 * - Order: a later sticker never sits on an earlier sheet; a sheet reads in lines from its fill edge,
 *   left to right, so the newest sits highest.
 * - Stable: a spot depends only on the stickers before it, so appending moves nothing but a spread
 *   sheet's lines. Given stickers stay in the list, so the blanks they leave stay put.
 * - Clear: cut lines keep `clearance` apart, and `margin` from the paper's edge.
 * - Legible: never shrunk to fit; a sheet that can't take the next sticker turns.
 * - Spread: a sheet with room for another line can share that paper evenly under, between and over
 *   its lines, as a printed sheet lays out a few stickers; a full one stays packed.
 * Each sheet keeps a skyline, every column's highest point grown by the clearance. A new sticker is
 * lowered onto it at every x and settles on its own cut line, nesting into the valleys below.
 */
import { seededRandom } from "../../ui/seededRandom";

type Point = [x: number, y: number];

/** A sticker's cut line inside its `w` × `h` image, with `poly` running from 0 to 1 across it. */
export interface Shape {
  w: number;
  h: number;
  poly: Point[];
}

export interface PackItem {
  id: string;
  shape: Shape;
}

/** Where a sticker sits on its sheet, in sheet pixels. */
export interface PackedItem {
  id: string;
  /** Its place in arrival order. */
  n: number;
  /** The center of its image. */
  x: number;
  y: number;
  /** Its turn about that center, clockwise, in degrees. */
  r: number;
  /** Sheet pixels per image pixel. */
  s: number;
  /** Its image's size on the sheet. */
  w: number;
  h: number;
}

export interface Packed {
  /** Each sheet's stickers, in arrival order. */
  sheets: { items: PackedItem[] }[];
  /** Each sticker's spot, with the index `f` of its sheet. */
  byId: Map<string, PackedItem & { f: number }>;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The sheet and its margins are the caller's own; the rest has defaults. */
export interface PackOptions {
  sheet: { w: number; h: number };
  /** Paper kept clear of cut lines; a number sets all four sides. */
  margin: Margin | number;
  /** The least gap between two cut lines. */
  clearance?: number;
  /** Up to this much more, seeded per sticker, so gaps vary instead of repeating. */
  breathe?: number;
  /** The box each sticker's image is fitted into: the size stickers show at. */
  fit?: { w?: number; h?: number };
  /** A cut's long side never drops below this. */
  minSize?: number;
  /** Size varies by up to this share either way, seeded per sticker. */
  vary?: number;
  /** The largest turn, in degrees, seeded per sticker. */
  turn?: number;
  /** How far in from the left margin a line may start, seeded. */
  inset?: number;
  /** "up" fills a sheet from the bottom, the newest highest; "down" from the top. */
  fill?: "up" | "down";
  /** The most stickers one sheet takes. */
  max?: number;
  /** A sheet with room for another line spreads its lines over its page. */
  spread?: boolean;
  /**
   * The page the sheets are drawn on, when taller than `sheet`: the lines keep their places from its
   * fill edge, and a spread sheet spreads over all of it. Which sheet a sticker is on never depends on it.
   */
  page?: number;
}

interface Resolved {
  sheet: { w: number; h: number };
  page: number;
  margin: Margin;
  clearance: number;
  breathe: number;
  fit: { w: number; h: number };
  minSize: number;
  vary: number;
  turn: number;
  inset: number;
  fill: "up" | "down";
  max: number;
  spread: boolean;
}

/** Added to the clearance to cover tracing error in the cut shapes. */
const SAFE = 0.5;
/** A new line sits at least this many sticker heights above the one before. */
const LINE_RISE = 0.6;
/** A sticker continuing a line sits at most this many heights below the one before it, */
const LINE_DIP = 0.4;
/** and at least this many widths right of it. */
const LINE_STEP = 0.5;
/** Height traded per pixel away from the neighbor, continuing a line. */
const PULL_LINE = 0.15;
/** Height traded per pixel away from the left, starting a line. */
const PULL_START = 0.5;
/** How closely a stored outline is kept, as a share of the image. */
const OUTLINE_TOLERANCE = 0.0035;
/** How closely a traced mask is kept, in mask cells. */
const TRACE_TOLERANCE = 0.6;

const DEFAULTS: Omit<Resolved, "sheet" | "page" | "margin"> = {
  clearance: 6,
  breathe: 4,
  fit: { w: 66, h: 76 },
  minSize: 44,
  vary: 0.04,
  turn: 3,
  inset: 12,
  fill: "up",
  max: Infinity,
  spread: false,
};

/** FNV-1a: a string as a 32-bit seed. */
export function hash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Douglas-Peucker on an open chain, keeping both ends. */
function simplifyChain(pts: Point[], eps: number, out: Point[]) {
  const stack: [number, number][] = [[0, pts.length - 1]];
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  for (let span = stack.pop(); span; span = stack.pop()) {
    const [a, b] = span;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy) || 1e-9;
    let far = -1;
    let fd = eps;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > fd) {
        fd = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

/** Douglas-Peucker on a closed ring. */
function simplifyRing(pts: Point[], eps: number): Point[] {
  if (pts.length < 8) return pts.slice();
  let far = 0;
  let fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = simplifyChain(pts.slice(0, far + 1), eps, []);
  const b = simplifyChain(pts.slice(far).concat([pts[0]]), eps, []);
  return a.concat(b.slice(1, -1));
}

/** The outer cut line of the largest piece of a bit mask, along cell edges, simplified. In cells. */
function traceBits(bits: Uint8Array, cols: number, rows: number): Point[] {
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cols && y < rows && bits[y * cols + x] === 1;
  // Each corner's outgoing edges along the mask's boundary: 1 right, 2 down, 4 left, 8 up.
  const VW = cols + 1;
  const out = new Uint8Array(VW * (rows + 1));
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) out[y * VW + x] |= 1;
      if (!on(x + 1, y)) out[y * VW + x + 1] |= 2;
      if (!on(x, y + 1)) out[(y + 1) * VW + x + 1] |= 4;
      if (!on(x - 1, y)) out[(y + 1) * VW + x] |= 8;
    }
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  let best: Point[] | null = null;
  let bestA = 0;
  for (let v0 = 0; v0 < out.length; v0++) {
    while (out[v0]) {
      // The lowest direction left at this corner.
      let d = 31 - Math.clz32(out[v0] & -out[v0]);
      let v = v0;
      const ring: Point[] = [];
      for (let guard = 0; guard < out.length * 4; guard++) {
        out[v] &= ~(1 << d);
        const x = v % VW;
        const y = (v / VW) | 0;
        ring.push([x, y]);
        v = (y + DY[d]) * VW + x + DX[d];
        if (v === v0) break;
        const turn = [(d + 1) & 3, d, (d + 3) & 3].find((k) => (out[v] & (1 << k)) !== 0);
        if (turn === undefined) break;
        d = turn;
      }
      let A = 0;
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i];
        const q = ring[(i + 1) % ring.length];
        A += p[0] * q[1] - q[0] * p[1];
      }
      if (A > bestA) {
        bestA = A;
        best = ring;
      }
    }
  }
  if (!best) {
    return [
      [0, 0],
      [cols, 0],
      [cols, rows],
      [0, rows],
    ];
  }
  const ring = best;
  // Only the corners: points in the middle of straight runs go.
  const corners = ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[(i + 1) % ring.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
  return simplifyRing(corners, TRACE_TOLERANCE);
}

/** A cut that fills its whole image: what's packed for a sticker whose cut line can't be read. */
export const boxShape = (w: number, h: number): Shape => ({
  w,
  h,
  poly: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
});

/** A shape as the packer takes it: a cut line that isn't a polygon packs as its whole image. */
const normShape = (shape: Shape) =>
  shape.poly.length > 2 ? shape : boxShape(shape.w || 1, shape.h || 1);

/** A shape from a coarse mask: `bits` is 1 inside the cut, `cols` × `rows` with the image's aspect. */
export function shapeFromMask(
  bits: Uint8Array,
  cols: number,
  rows: number,
  w = cols,
  h = rows,
): Shape {
  const poly = traceBits(bits, cols, rows).map(([x, y]): Point => [x / cols, y / rows]);
  return { w: w || cols, h: h || rows, poly };
}

/** A stored cut line, an SVG path of straight segments in image pixels, as a shape. */
export function outlineShape(path: string, width: number, height: number): Shape {
  const values = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: Point[] = [];
  for (let i = 0; i + 1 < values.length; i += 2)
    pts.push([values[i] / width, values[i + 1] / height]);
  return { w: width, h: height, poly: simplifyRing(pts, OUTLINE_TOLERANCE) };
}

/** A sticker's cut line as placed, in sheet pixels. */
export function outline(shape: Shape, item: Pick<PackedItem, "x" | "y" | "r" | "s">): Point[] {
  const sh = normShape(shape);
  const bw = sh.w * item.s;
  const bh = sh.h * item.s;
  const a = (item.r * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return sh.poly.map(([u, v]): Point => {
    const px = (u - 0.5) * bw;
    const py = (v - 0.5) * bh;
    return [item.x + px * cs - py * sn, item.y + px * sn + py * cs];
  });
}

/** A turned, scaled cut centered on 0, 0: the highest and lowest points of each pixel column. */
export interface Profile {
  /** The first column's x. */
  j0: number;
  /** The number of columns. */
  m: number;
  top: Float64Array;
  bot: Float64Array;
  minx: number;
  maxx: number;
  /** The highest point. */
  tmin: number;
  w: number;
  h: number;
}

const profiles = new WeakMap<Shape, Map<string, Profile>>();

export function profileOf(sh: Shape, bw: number, bh: number, deg: number, flip: boolean): Profile {
  let per = profiles.get(sh);
  if (!per) {
    per = new Map();
    profiles.set(sh, per);
  }
  const key = `${bw.toFixed(3)}|${bh.toFixed(3)}|${deg.toFixed(3)}|${flip ? 1 : 0}`;
  const known = per.get(key);
  if (known) return known;
  const a = (deg * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  const poly = sh.poly;
  const n = poly.length;
  const X = new Float64Array(n);
  const Y = new Float64Array(n);
  let minx = Infinity;
  let maxx = -Infinity;
  let miny = Infinity;
  let maxy = -Infinity;
  for (let i = 0; i < n; i++) {
    const px = (poly[i][0] - 0.5) * bw;
    const py = (flip ? 0.5 - poly[i][1] : poly[i][1] - 0.5) * bh;
    const x = px * cs - py * sn;
    const y = px * sn + py * cs;
    X[i] = x;
    Y[i] = y;
    minx = Math.min(minx, x);
    maxx = Math.max(maxx, x);
    miny = Math.min(miny, y);
    maxy = Math.max(maxy, y);
  }
  const j0 = Math.floor(minx);
  const m = Math.floor(maxx) - j0 + 1;
  const top = new Float64Array(m).fill(Infinity);
  const bot = new Float64Array(m).fill(-Infinity);
  for (let i = 0; i < n; i++) {
    const k = (i + 1) % n;
    let xa = X[i];
    let ya = Y[i];
    let xb = X[k];
    let yb = Y[k];
    if (xa > xb) [xa, xb, ya, yb] = [xb, xa, yb, ya];
    const span = xb - xa;
    for (let c = Math.floor(xa); c <= Math.floor(xb); c++) {
      const lo = Math.max(xa, c);
      const hi = Math.min(xb, c + 1);
      const y1 = span < 1e-9 ? ya : ya + ((yb - ya) * (lo - xa)) / span;
      const y2 = span < 1e-9 ? yb : ya + ((yb - ya) * (hi - xa)) / span;
      const t = c - j0;
      top[t] = Math.min(top[t], y1, y2);
      bot[t] = Math.max(bot[t], y1, y2);
    }
  }
  const pf = { j0, m, top, bot, minx, maxx, tmin: miny, w: maxx - minx, h: maxy - miny };
  per.set(key, pf);
  return pf;
}

function options(opts: PackOptions): Resolved {
  const { margin } = opts;
  return {
    sheet: opts.sheet,
    page: Math.max(opts.page ?? opts.sheet.h, opts.sheet.h),
    margin:
      typeof margin === "number"
        ? { top: margin, right: margin, bottom: margin, left: margin }
        : margin,
    clearance: opts.clearance ?? DEFAULTS.clearance,
    breathe: opts.breathe ?? DEFAULTS.breathe,
    fit: { w: opts.fit?.w ?? DEFAULTS.fit.w, h: opts.fit?.h ?? DEFAULTS.fit.h },
    minSize: opts.minSize ?? DEFAULTS.minSize,
    vary: opts.vary ?? DEFAULTS.vary,
    turn: opts.turn ?? DEFAULTS.turn,
    inset: opts.inset ?? DEFAULTS.inset,
    fill: opts.fill ?? DEFAULTS.fill,
    max: opts.max ?? DEFAULTS.max,
    spread: opts.spread ?? DEFAULTS.spread,
  };
}

interface Sheet {
  items: PackedItem[];
  /** Per column, the highest point taken, grown by the clearance. */
  sky: Float64Array;
  last: { x: number; y: number; pf: Profile } | null;
  /** How many lines it holds, and each sticker's line, counted from the fill edge. */
  lines: number;
  lineOf: number[];
  /** The highest point of any cut line on it. */
  high: number;
}

/** A sticker's seeded breathing room. */
interface Seed {
  lift: number;
  gap: number;
  inset: number;
}

/** Lays out stickers in arrival order on as many sheets as they need. */
export function packSheets(items: readonly PackItem[], opts: PackOptions): Packed {
  const o = options(opts);
  const W = Math.round(o.sheet.w);
  const H = o.sheet.h;
  /** How much taller the page is than the sheet packed. */
  const lower = o.page - H;
  const up = o.fill !== "down";
  // Packed with the fill edge at the bottom: filling down is the same sheet mirrored top to bottom.
  const m = up ? o.margin : { ...o.margin, top: o.margin.bottom, bottom: o.margin.top };
  const c = Math.max(0, o.clearance) + SAFE;
  const K = Math.ceil(c) + 1;
  const grow = new Float64Array(K + 1);
  for (let a = 0; a <= K; a++) {
    const dx = Math.max(0, a - 1);
    grow[a] = dx < c ? Math.sqrt(c * c - dx * dx) : -1;
  }

  const sheets: Sheet[] = [];

  function spotFor(sheet: Sheet, pf: Profile, seed: Seed) {
    const prev = sheet.last;
    const sky = sheet.sky;
    const lo = Math.ceil(m.left - pf.j0);
    const hi = Math.floor(W - m.right - (pf.j0 + pf.m));
    if (hi < lo) return null;
    let D = 0;
    let B = 0;
    let T = 0;
    let toNext = 0;
    if (prev) {
      const hA = (prev.pf.h + pf.h) / 2;
      const wA = (prev.pf.w + pf.w) / 2;
      D = LINE_STEP * wA;
      B = LINE_RISE * hA;
      T = LINE_DIP * hA;
      // Just clear of its neighbor.
      toNext = prev.x + prev.pf.maxx + c + seed.gap - pf.minx;
    }
    const toLeft = m.left + seed.inset - pf.minx;
    let best: { x: number; y: number; same: boolean } | null = null;
    let bestCost = Infinity;
    for (let x = lo; x <= hi; x++) {
      let rest = Infinity;
      for (let t = 0, b = x + pf.j0; t < pf.m; t++) rest = Math.min(rest, sky[b + t] - pf.bot[t]);
      rest -= seed.lift;
      const same = prev !== null && x >= prev.x + D;
      const y = !prev ? rest : Math.min(rest, same ? prev.y + T : prev.y - B);
      if (y + pf.tmin < m.top) continue;
      const cost =
        -y + (same ? PULL_LINE * Math.abs(x - toNext) : PULL_START * Math.abs(x - toLeft));
      if (cost < bestCost) {
        bestCost = cost;
        best = { x, y, same };
      }
    }
    return best;
  }

  function settle(sheet: Sheet, pf: Profile, at: { x: number; y: number }) {
    const sky = sheet.sky;
    for (let t = 0; t < pf.m; t++) {
      const col = at.x + pf.j0 + t;
      const ty = at.y + pf.top[t];
      for (let d = -K; d <= K; d++) {
        const X = col + d;
        const g = grow[Math.abs(d)];
        if (X < 0 || X >= W || g < 0) continue;
        sky[X] = Math.min(sky[X], ty - g);
      }
    }
    sheet.last = { x: at.x, y: at.y, pf };
  }

  /**
   * Shares the paper over a sheet's last line evenly under, between and over its lines. Each line
   * rises at least as far as the lines before it, which it sits above, so cut lines only part.
   */
  function spreadLines(sheet: Sheet) {
    const free = sheet.high + lower - m.top;
    // Too little for a sticker at the fit's height, clear of the line below: the sheet is full.
    if (free < o.fit.h + c) return;
    sheet.items.forEach((it, i) => {
      const lift = ((sheet.lineOf[i] + 1) * free) / (sheet.lines + 1);
      it.y += up ? -lift : lift;
    });
  }

  const newSheet = (): Sheet => {
    const sheet: Sheet = {
      items: [],
      sky: new Float64Array(W).fill(H - m.bottom),
      last: null,
      lines: 0,
      lineOf: [],
      high: H - m.bottom,
    };
    sheets.push(sheet);
    return sheet;
  };

  items.forEach((it, n) => {
    const sh = normShape(it.shape);
    const rnd = seededRandom(hash(it.id));
    const u = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
    const r = Math.round((u[0] < 0.5 ? -1 : 1) * (0.3 + 0.7 * u[1]) * o.turn * 100) / 100;
    let s = Math.min(o.fit.w / sh.w, o.fit.h / sh.h) * (1 + o.vary * (2 * u[2] - 1));
    const us = sh.poly.map((p) => p[0]);
    const vs = sh.poly.map((p) => p[1]);
    const cutLong =
      Math.max(
        (Math.max(...us) - Math.min(...us)) * sh.w,
        (Math.max(...vs) - Math.min(...vs)) * sh.h,
      ) * s;
    if (cutLong < o.minSize) s *= o.minSize / cutLong;
    const pf = profileOf(sh, sh.w * s, sh.h * s, up ? r : -r, !up);
    const seed = { lift: u[3] * o.breathe, gap: u[4] * o.breathe, inset: u[5] * o.inset };
    let sheet = sheets.at(-1);
    let at = sheet && sheet.items.length < o.max ? spotFor(sheet, pf, seed) : null;
    if (!sheet || !at) {
      sheet = newSheet();
      at = spotFor(sheet, pf, seed) ?? {
        x: Math.round(W / 2),
        y: H - m.bottom - (pf.tmin + pf.h),
        same: false,
      };
    }
    settle(sheet, pf, at);
    sheet.lineOf.push(at.same ? sheet.lines - 1 : sheet.lines++);
    sheet.high = Math.min(sheet.high, at.y + pf.tmin);
    sheet.items.push({
      id: it.id,
      n,
      x: at.x,
      y: up ? at.y + lower : H - at.y,
      r,
      s,
      w: sh.w * s,
      h: sh.h * s,
    });
  });
  if (o.spread) for (const sheet of sheets) spreadLines(sheet);
  const byId: Packed["byId"] = new Map();
  sheets.forEach((sheet, f) => {
    for (const it of sheet.items) byId.set(it.id, { ...it, f });
  });
  return { sheets: sheets.map((sh) => ({ items: sh.items })), byId };
}
