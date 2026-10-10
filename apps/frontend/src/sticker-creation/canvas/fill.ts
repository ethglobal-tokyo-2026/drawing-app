import type { Rect } from "../sealing/stickerPasses";

/** Structural subset of ImageData, so the fill runs in tests without a DOM. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Which sides of the pixels were cut from a bigger image, so a region may go on past them. */
interface Cut {
  left: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
}

type Rgb = readonly [number, number, number];

/** The extremes of the pixels a flood took in, inclusive. */
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Whether a pixel, or a box with these extremes, comes near a side cut from a bigger image. */
type NearCut = (x0: number, y0: number, x1?: number, y1?: number) => boolean;

/**
 * The widest opening, in sheet units, a fill on paper treats as closed, so a line that stops just
 * short of meeting itself still holds the fill. Each fill records its own, so changing this leaves
 * every drawing as it was drawn.
 */
export const FILL_GAP = 2;

/** Pixels fainter than this are empty paper. */
const EMPTY_ALPHA = 128;
/** A colored region takes in pixels whose summed |ΔRGB| from the tapped pixel is under this. */
const REGION_TOLERANCE = 72;
/** A tap on a color this close to the fill color changes nothing. */
export const SAME_COLOR = 8;
/** The fill reaches this many pixels under neighboring edges, so no white halo shows between color and line. */
export const TUCK = 2;
/** A region this close to a cut side may go on past it, or tuck under pixels beyond it. */
const CLEAR = Math.max(TUCK, 1);
/** Chamfer steps, in thirds of a pixel: to the pixel beside, and to the pixel across a corner. */
const SIDE = 3;
const CORNER = 4;
/** Distances stop at this many thirds of a pixel, so a byte holds each. */
const FAR = 255;
/**
 * How deep, in halves of the gap, other open paper must be somewhere to be a region of its own. A
 * shallower pocket, as where two channels narrower than the gap meet, goes to the nearest region.
 */
const ROOM = 1.5;

/** Marks in a flood's `region`. The region's own pixels: */
const IN = 1;
/** Paper that goes to other open paper, so it stays as it is: */
const OUT = 2;
/** Paper near a cut side, which open paper past that side may be nearer: */
const UNSEEN = 3;
/** Paper searched for the open paper nearest a tap near a line: */
const SEARCHED = 4;
/** Other open paper while its band is judged: */
const FLOODING = 5;
/** Other open paper too shallow to be a region, which goes to the nearest: */
const POCKET = 6;
/** Pixels outside the region the fill tucked under: */
const TUCKED = 7;

const rgbDistance = (data: Uint8ClampedArray, i: number, [r, g, b]: Rgb) =>
  Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);

/** A fill's region and tuck on the pixels shown, in their coordinates. */
export interface FoundFill {
  box: Rect;
  /** IN or TUCKED per pixel of `box`, row by row; 0 elsewhere. */
  marks: Uint8Array;
  /** A paper fill, rather than a recolor. */
  paper: boolean;
}

/**
 * Scanline flood fill from (sx, sy) on the pixels shown, in their own units, writing nothing. It
 * takes in empty paper, or a colored region of similar colors, and tucks the fill under what borders
 * it. On paper, openings in the lines up to about `gap` across hold the fill as if closed
 * (`closeGaps`). Null when the fill would change nothing: the seed is off the pixels or already the
 * fill color. With `cut` sides it answers "past" once the region comes close enough to one to go on
 * beyond it.
 */
export function findFill(
  shown: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
): FoundFill | null;
export function findFill(
  shown: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut?: Cut,
): FoundFill | "past" | null;
export function findFill(
  shown: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut?: Cut,
): FoundFill | "past" | null {
  const { width: w, height: h, data } = shown;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const seed = (sy * w + sx) * 4;
  const target: Rgb = [data[seed], data[seed + 1], data[seed + 2]];
  const empty = data[seed + 3] < EMPTY_ALPHA;
  if (!empty && rgbDistance(data, seed, fill) < SAME_COLOR) return null;

  // Half the widest opening closed, in thirds of a pixel. A fill on a color closes none, so a stroke
  // thinner than the gap still recolors whole.
  const reach = empty ? Math.min((gap * SIDE) / 2, FAR - 1) : 0;
  const lines = reach > 0 ? lineDistances(shown, cut, reach, reach * ROOM) : null;
  const far = lines?.far ?? null;
  // Lines past a cut side are unseen, so paper this near one may be nearer them than it looks.
  const margin = reach > 0 ? Math.max(CLEAR, Math.ceil((reach * ROOM) / SIDE) + 1) : CLEAR;
  const nearCut: NearCut = (x0, y0, x1 = x0, y1 = y0) =>
    cut !== undefined &&
    ((cut.left && x0 < margin) ||
      (cut.top && y0 < margin) ||
      (cut.right && x1 > w - 1 - margin) ||
      (cut.bottom && y1 > h - 1 - margin));

  const region = new Uint8Array(w * h);
  // One test for every kind of region, so the engine's optimized flood survives a switch between them.
  const open = (p: number) => {
    if (region[p]) return false;
    const i = p * 4;
    if (!empty)
      return data[i + 3] >= EMPTY_ALPHA && rgbDistance(data, i, target) < REGION_TOLERANCE;
    return data[i + 3] < EMPTY_ALPHA && (far === null || far[p] > reach);
  };
  const box =
    lines === null
      ? scanFill(region, w, h, sx, sy, open, false, nearCut)
      : closeGaps(region, lines.far, lines.near, reach, w, h, sx, sy, open, nearCut);
  if (box === "past") return "past";

  // The pixels the tuck grows from: the region's, beside a pixel outside it.
  let edge: number[] = [];
  const { x0, y0, x1, y1 } = box;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * w + x;
      if (region[p] !== IN) continue;
      if (
        (x > 0 && region[p - 1] !== IN) ||
        (x < w - 1 && region[p + 1] !== IN) ||
        (y > 0 && region[p - w] !== IN) ||
        (y < h - 1 && region[p + w] !== IN)
      )
        edge.push(p);
    }
  }
  // The tuck takes in no paper outside the region: a paper fill goes under the ink beside it, up to
  // its opaque core, and a recolor gives the stroke's faint fringe the fill's color.
  const tucks = empty
    ? (a: number) => a >= EMPTY_ALPHA && a < 255
    : (a: number) => a > 0 && a < EMPTY_ALPHA;
  const reached: Box = { ...box };
  for (let step = 0; step < TUCK && edge.length > 0; step++) {
    const next: number[] = [];
    for (const p of edge) {
      const x = p % w;
      const y = (p - x) / w;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(h - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(w - 1, x + 1); nx++) {
          const q = ny * w + nx;
          if (region[q] === IN || region[q] === TUCKED || !tucks(data[q * 4 + 3])) continue;
          region[q] = TUCKED;
          extend(reached, q, w);
          next.push(q);
        }
      }
    }
    edge = next;
  }
  const bw = reached.x1 - reached.x0 + 1;
  const bh = reached.y1 - reached.y0 + 1;
  const marks = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    const row = (reached.y0 + y) * w + reached.x0;
    for (let x = 0; x < bw; x++) {
      const mark = region[row + x];
      if (mark === IN || mark === TUCKED) marks[y * bw + x] = mark;
    }
  }
  return { box: { x: reached.x0, y: reached.y0, w: bw, h: bh }, marks, paper: empty };
}

/**
 * Writes a found fill onto `target`, against the target's own pixels, where `target` and `shown`
 * cover the pixels the fill was found on. On one layer, `target` is `shown`. On a `locked` layer
 * the fill's color goes source-atop, region and tuck alike, so every pixel keeps its alpha. Returns
 * whether it wrote a pixel, which a locked layer's clear pixels never take.
 */
export function writeFill(
  target: Pixels,
  shown: Pixels,
  found: FoundFill,
  fill: Rgb,
  locked = false,
): boolean {
  if (target.width !== shown.width || target.height !== shown.height) {
    throw new Error(
      `A fill found on ${shown.width}×${shown.height} px can't be written on ${target.width}×${target.height} px`,
    );
  }
  const { box, marks, paper } = found;
  const [fr, fg, fb] = fill;
  const t = target.data;
  let wrote = false;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const mark = marks[y * box.w + x];
      if (mark === 0) continue;
      const i = ((box.y + y) * target.width + box.x + x) * 4;
      if (locked) {
        // An opaque color laid source-atop takes the pixel's alpha, so a clear pixel takes nothing.
        if (t[i + 3] === 0) continue;
        t[i] = fr;
        t[i + 1] = fg;
        t[i + 2] = fb;
      } else if (!paper) {
        // A recolor keeps the stroke's shape and soft edge, from whichever layer shows it.
        t[i] = fr;
        t[i + 1] = fg;
        t[i + 2] = fb;
        t[i + 3] = Math.max(t[i + 3], shown.data[i + 3]);
      } else if (mark === IN) {
        t[i] = fr;
        t[i + 1] = fg;
        t[i + 2] = fb;
        t[i + 3] = 255;
      } else {
        // The target's ink keeps its color over the fill, by its own alpha: on a layer under the
        // lines, where it's clear, the fill goes under them whole.
        const a = t[i + 3] / 255;
        t[i] = t[i] * a + fr * (1 - a);
        t[i + 1] = t[i + 1] * a + fg * (1 - a);
        t[i + 2] = t[i + 2] * a + fb * (1 - a);
        t[i + 3] = 255;
      }
      wrote = true;
    }
  }
  return wrote;
}

/**
 * Floods the pixels from (sx, sy) in place, as one layer takes a fill: `findFill`, then `writeFill`
 * on the same pixels. Returns the box it changed, or what `findFill` answered instead.
 */
export function floodFill(img: Pixels, sx: number, sy: number, fill: Rgb, gap: number): Rect | null;
export function floodFill(
  img: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut: Cut,
): Rect | "past" | null;
export function floodFill(
  img: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut?: Cut,
): Rect | "past" | null {
  const found = findFill(img, sx, sy, fill, gap, cut);
  if (found === null || found === "past") return found;
  writeFill(img, img, found, fill);
  return found.box;
}

/**
 * Marks IN in `region` what `open` takes in from (sx, sy), a run along a row at a time; with
 * `corners`, a run reaches the rows beside it across a corner too. Returns the box it marked, or
 * "past" as soon as that box comes near a cut side.
 */
function scanFill(
  region: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  open: (p: number) => boolean,
  corners: boolean,
  nearCut: NearCut,
): Box | "past" {
  const box: Box = { x0: sx, y0: sy, x1: sx, y1: sy };
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop() ?? 0;
    let x = stack.pop() ?? 0;
    while (x > 0 && open(y * w + x - 1)) x--;
    // Taken in by another run since it was stacked.
    if (!open(y * w + x)) continue;
    let up = false;
    let down = false;
    if (corners && x > 0) {
      up = y > 0 && open((y - 1) * w + x - 1);
      if (up) stack.push(x - 1, y - 1);
      down = y < h - 1 && open((y + 1) * w + x - 1);
      if (down) stack.push(x - 1, y + 1);
    }
    for (; x < w && open(y * w + x); x++) {
      const p = y * w + x;
      region[p] = IN;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
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
    if (corners && x < w) {
      if (y > 0 && !up && open((y - 1) * w + x)) stack.push(x, y - 1);
      if (y < h - 1 && !down && open((y + 1) * w + x)) stack.push(x, y + 1);
    }
    if (y < box.y0) box.y0 = y;
    if (y > box.y1) box.y1 = y;
    if (nearCut(box.x0, box.y0, box.x1, box.y1)) return "past";
  }
  return box;
}

/**
 * The flood on paper with openings up to twice `reach` closed: open paper, farther than `reach` from
 * every line, floods from the tap, then paper nearer a line goes to the open paper nearest it, so
 * the fill stops midway across an opening yet fills its corners.
 */
function closeGaps(
  region: Uint8Array,
  far: Uint8Array,
  near: readonly number[],
  reach: number,
  w: number,
  h: number,
  sx: number,
  sy: number,
  open: (p: number) => boolean,
  nearCut: NearCut,
): Box | "past" {
  const lineNear = (p: number) => far[p] > 0 && far[p] <= reach;
  let start = sy * w + sx;
  if (lineNear(start)) {
    const searched = [start];
    region[start] = SEARCHED;
    let found = -1;
    const search = (q: number) => {
      if (found >= 0 || region[q] || far[q] === 0) return;
      if (far[q] > reach) {
        found = q;
        return;
      }
      region[q] = SEARCHED;
      searched.push(q);
    };
    for (let head = 0; head < searched.length && found < 0; head++) {
      const p = searched[head];
      const x = p % w;
      if (nearCut(x, (p - x) / w)) return "past";
      eachBeside(p, w, h, search);
    }
    if (found < 0) {
      // Every pixel of this paper is near a line, so it has no opening to close: it all fills.
      const box: Box = { x0: sx, y0: sy, x1: sx, y1: sy };
      for (const p of searched) {
        region[p] = IN;
        extend(box, p, w);
      }
      return box;
    }
    for (const p of searched) region[p] = 0;
    start = found;
  }
  const box = scanFill(region, w, h, start % w, Math.floor(start / w), open, true, nearCut);
  if (box === "past") return "past";

  // Paper near a line by a cut side may be nearer open paper past it.
  const claims: number[] = [];
  const others: number[] = [];
  for (const p of near) {
    const x = p % w;
    if (region[p] === 0 && nearCut(x, (p - x) / w)) {
      region[p] = UNSEEN;
      others.push(p);
    }
  }
  // Other open paper is another region's where it goes deeper than ROOM, judged from the band by
  // its lines alone, and a pocket where it doesn't.
  const room = reach * ROOM;
  const band: number[] = [];
  const judge = (r: number) => {
    band.length = 0;
    band.push(r);
    region[r] = FLOODING;
    let deep = false;
    const box: Box = { x0: w, y0: h, x1: 0, y1: 0 };
    for (let head = 0; head < band.length; head++) {
      const p = band[head];
      extend(box, p, w);
      const x = p % w;
      const y = (p - x) / w;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(h - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(w - 1, x + 1); nx++) {
          const q = ny * w + nx;
          if (far[q] > room) deep = true;
          else if (far[q] > reach && region[q] === 0) {
            region[q] = FLOODING;
            band.push(q);
          }
        }
      }
    }
    // Deeper paper beside a band by a cut side may itself be shallow past it.
    const mark = nearCut(box.x0 - 1, box.y0 - 1, box.x1 + 1, box.y1 + 1)
      ? UNSEEN
      : deep
        ? OUT
        : POCKET;
    for (const p of band) region[p] = mark;
  };
  // Claims start from open paper beside paper near a line, the fill's own first, so paper as near
  // the fill's open paper as any other goes to the fill.
  const source = (r: number) => {
    if (region[r] === IN) {
      claims.push(r);
      return;
    }
    if (far[r] <= reach) return;
    if (region[r] === 0) {
      const x = r % w;
      if (far[r] > room) region[r] = nearCut(x, (r - x) / w) ? UNSEEN : OUT;
      else judge(r);
    }
    if (region[r] === OUT || region[r] === UNSEEN) others.push(r);
  };
  for (const q of near) if (region[q] === 0) eachBeside(q, w, h, source);
  for (const p of others) claims.push(p);
  const claimable = (q: number) =>
    region[q] === POCKET || (region[q] === 0 && far[q] > 0 && far[q] <= reach);
  let from = IN;
  let met = false;
  const claim = (q: number) => {
    const at = region[q];
    if (claimable(q)) {
      region[q] = from;
      claims.push(q);
    } else if ((from === IN && at === UNSEEN) || (from === UNSEEN && at === IN)) met = true;
  };
  for (let head = 0; head < claims.length && !met; head++) {
    const p = claims[head];
    from = region[p];
    eachBeside(p, w, h, claim);
  }
  // The fill meets paper that open paper past a cut side may claim: only the whole sheet settles it.
  if (met) return "past";
  for (const p of claims) if (region[p] === IN) extend(box, p, w);
  return box;
}

/**
 * Each pixel's chamfer distance to the nearest line, in thirds of a pixel, and the paper within
 * `reach` of one. Lines are pixels as opaque as EMPTY_ALPHA, and the sheet's edge past each side
 * that isn't cut, which closes a gap as a line does. Chamfer distances come within a few percent of
 * true ones, in a byte a pixel. No distance past `room` decides anything, so only the paper that
 * near a line or an uncut side is measured (`measuredRuns`), and the rest reads FAR.
 */
function lineDistances(
  img: Pixels,
  cut: Cut | undefined,
  reach: number,
  room: number,
): { far: Uint8Array; near: number[] } {
  const { width: w, height: h, data } = img;
  const far = new Uint8Array(w * h).fill(FAR);
  const near: number[] = [];
  // Past a cut side the lines are unseen, so none is counted there.
  const left = cut?.left ? FAR : 0;
  const top = cut?.top ? FAR : 0;
  const right = cut?.right ? FAR : 0;
  const bottom = cut?.bottom ? FAR : 0;
  // Every step costs at least SIDE, so a distance up to `room` spans at most this many pixels.
  const span = Math.floor(Math.min(Math.floor(room), FAR - 1) / SIDE);
  const { start, cols } = measuredRuns(img, cut, span);
  for (let y = 0; y < h; y++) {
    for (let r = start[y]; r < start[y + 1]; r += 2) {
      for (let x = cols[r]; x <= cols[r + 1]; x++) {
        const p = y * w + x;
        if (data[p * 4 + 3] >= EMPTY_ALPHA) {
          far[p] = 0;
          continue;
        }
        let d = Math.min((x > 0 ? far[p - 1] : left) + SIDE, (y > 0 ? far[p - w] : top) + SIDE);
        if (y > 0 && x > 0) d = Math.min(d, far[p - w - 1] + CORNER);
        if (y > 0 && x < w - 1) d = Math.min(d, far[p - w + 1] + CORNER);
        far[p] = Math.min(d, FAR);
      }
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let r = start[y + 1] - 2; r >= start[y]; r -= 2) {
      for (let x = cols[r + 1]; x >= cols[r]; x--) {
        const p = y * w + x;
        if (far[p] === 0) continue;
        let d = Math.min(
          far[p],
          (x < w - 1 ? far[p + 1] : right) + SIDE,
          (y < h - 1 ? far[p + w] : bottom) + SIDE,
        );
        if (y < h - 1 && x < w - 1) d = Math.min(d, far[p + w + 1] + CORNER);
        if (y < h - 1 && x > 0) d = Math.min(d, far[p + w - 1] + CORNER);
        far[p] = d;
        if (d <= reach) near.push(p);
      }
    }
  }
  return { far, near };
}

/**
 * The columns `lineDistances` measures, as runs of [first, last] in `cols`, row y's from `start[y]`
 * up to `start[y + 1]`: those within `span` pixels of a line, found from each row's first and last
 * line pixel, and the `span` pixels by each side that isn't cut.
 */
function measuredRuns(
  { width: w, height: h, data }: Pixels,
  cut: Cut | undefined,
  span: number,
): { start: Int32Array; cols: Int32Array } {
  // Each row's first and last line pixel; a row with none keeps its first past its last.
  const first = new Int32Array(h).fill(w);
  const last = new Int32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let x = 0;
    while (x < w && data[(row + x) * 4 + 3] < EMPTY_ALPHA) x++;
    if (x === w) continue;
    first[y] = x;
    x = w - 1;
    while (data[(row + x) * 4 + 3] < EMPTY_ALPHA) x--;
    last[y] = x;
  }
  const leftStrip = cut?.left ? 0 : span;
  const topStrip = cut?.top ? 0 : span;
  const rightStrip = cut?.right ? 0 : span;
  const bottomStrip = cut?.bottom ? 0 : span;
  const start = new Int32Array(h + 1);
  const cols = new Int32Array(h * 6);
  let n = 0;
  /** Adds columns a to z to the row whose runs begin at `row`, given in order of their first column. */
  const add = (row: number, a: number, z: number) => {
    if (a > z) return;
    if (n > row && a <= cols[n - 1] + 1) cols[n - 1] = Math.max(cols[n - 1], z);
    else {
      cols[n++] = a;
      cols[n++] = z;
    }
  };
  for (let y = 0; y < h; y++) {
    const row = n;
    start[y] = row;
    if (y < topStrip || y >= h - bottomStrip) {
      add(row, 0, w - 1);
      continue;
    }
    let a = w;
    let z = -1;
    for (let k = Math.max(0, y - span); k <= Math.min(h - 1, y + span); k++) {
      a = Math.min(a, first[k]);
      z = Math.max(z, last[k]);
    }
    const lineFrom = Math.max(0, a - span);
    const rightFrom = Math.max(0, w - rightStrip);
    add(row, 0, Math.min(leftStrip, w) - 1);
    // Columns near lines that start inside the right strip add nothing to it.
    if (z >= 0 && lineFrom <= rightFrom) add(row, lineFrom, Math.min(w - 1, z + span));
    add(row, rightFrom, w - 1);
  }
  start[h] = n;
  return { start, cols };
}

/** Calls `visit` with each pixel beside p, left, right, above and below, that's on the image. */
function eachBeside(p: number, w: number, h: number, visit: (q: number) => void): void {
  const x = p % w;
  if (x > 0) visit(p - 1);
  if (x < w - 1) visit(p + 1);
  if (p >= w) visit(p - w);
  if (p < w * (h - 1)) visit(p + w);
}

/** Grows `box` to take in pixel p. */
function extend(box: Box, p: number, w: number): void {
  const x = p % w;
  const y = (p - x) / w;
  if (x < box.x0) box.x0 = x;
  if (x > box.x1) box.x1 = x;
  if (y < box.y0) box.y0 = y;
  if (y > box.y1) box.y1 = y;
}

/** A fill found on a sheet: the shown pixels read, where they sit on the sheet, and the fill on them. */
interface SheetFind<P extends Pixels> {
  shown: P;
  at: Rect;
  found: FoundFill;
}

/** A sheet flood's result: the pixels read, where they sit on the sheet, and the box of them it changed. */
interface SheetFlood<P extends Pixels> {
  pixels: P;
  at: Rect;
  changed: Rect;
}

/** How many squares a sheet fill reads, each twice as wide as the last, before the whole sheet. */
const SQUARE_READS = 3;

/**
 * Finds a fill on a sheet from (sx, sy), closing openings up to `gap` across, reading what's shown
 * through `readShown`: a square about `near` px on a side around the seed, then squares twice as wide
 * while the region reaches past each, then the whole sheet, so a fill reads and floods not much more
 * than its region. Null when the fill would change nothing.
 */
export function findOnSheet<P extends Pixels>(
  sheet: { width: number; height: number },
  readShown: (box: Rect) => P,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  near: number,
): SheetFind<P> | null {
  const { width, height } = sheet;
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
  for (let n = 0, side = near; n < SQUARE_READS; n++, side *= 2) {
    const half = Math.floor(side / 2);
    const x = Math.max(0, sx - half);
    const y = Math.max(0, sy - half);
    const around = {
      x,
      y,
      w: Math.min(width, sx + half + 1) - x,
      h: Math.min(height, sy + half + 1) - y,
    };
    const cut = {
      left: around.x > 0,
      top: around.y > 0,
      right: around.x + around.w < width,
      bottom: around.y + around.h < height,
    };
    // A wider square holding half the sheet costs about what the whole does, and may still fall short.
    if (n > 0 && around.w * around.h * 2 >= width * height) break;
    const shown = readShown(around);
    const found = findFill(shown, sx - around.x, sy - around.y, fill, gap, cut);
    if (found !== "past") return found && { shown, at: around, found };
  }
  const whole = { x: 0, y: 0, w: width, h: height };
  const shown = readShown(whole);
  const found = findFill(shown, sx, sy, fill, gap);
  return found && { shown, at: whole, found };
}

/**
 * Floods a sheet of one layer from (sx, sy), as `findOnSheet` finds it, writing the fill onto the
 * pixels it read. Null when nothing changed.
 */
export function floodSheet<P extends Pixels>(
  sheet: { width: number; height: number },
  read: (box: Rect) => P,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  near: number,
): SheetFlood<P> | null {
  const sheetFind = findOnSheet(sheet, read, sx, sy, fill, gap, near);
  if (!sheetFind) return null;
  const { shown, at, found } = sheetFind;
  writeFill(shown, shown, found, fill);
  return { pixels: shown, at, changed: found.box };
}

/** The pixels a fill changed on its layer and their values after it, run-length encoded. */
export interface WrittenFill {
  box: Rect;
  /** y, x0, x1 (end-exclusive) per span of changed pixels, in sheet px. */
  spans: Uint32Array;
  /** count, then RGBA packed in a uint32, over the spans' pixels in order. */
  colors: Uint32Array;
}

/**
 * What a fill wrote on its layer, read from `after` once written, which `at` places on the sheet.
 * Undo replays it on that layer alone, since finding the fill again would need the other layers as
 * they were. A flat fill keeps few color runs a row.
 */
export function recordFill(after: Pixels, at: Rect, found: FoundFill): WrittenFill {
  const { box, marks } = found;
  const { width, data } = after;
  const spans: number[] = [];
  const colors: number[] = [];
  let color = -1;
  for (let y = 0; y < box.h; y++) {
    let x = 0;
    while (x < box.w) {
      if (marks[y * box.w + x] === 0) {
        x++;
        continue;
      }
      const x0 = x;
      for (; x < box.w && marks[y * box.w + x] !== 0; x++) {
        const i = ((box.y + y) * width + box.x + x) * 4;
        const rgba =
          ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;
        if (rgba === color) colors[colors.length - 2]++;
        else {
          color = rgba;
          colors.push(1, rgba);
        }
      }
      spans.push(at.y + box.y + y, at.x + box.x + x0, at.x + box.x + x);
    }
  }
  return {
    box: { x: at.x + box.x, y: at.y + box.y, w: box.w, h: box.h },
    spans: Uint32Array.from(spans),
    colors: Uint32Array.from(colors),
  };
}

/** Writes a recorded fill's pixels back onto `target`, which `at` places on the sheet. */
export function replayFill(target: Pixels, at: Rect, written: WrittenFill): void {
  const { box, spans, colors } = written;
  const { width, height, data } = target;
  if (
    box.x < at.x ||
    box.y < at.y ||
    box.x + box.w > at.x + width ||
    box.y + box.h > at.y + height
  ) {
    throw new Error(
      `A fill written at (${box.x}, ${box.y}), ${box.w}×${box.h} px, reaches past the ${width}×${height} px at (${at.x}, ${at.y}) it's replayed on`,
    );
  }
  let run = 0;
  let left = 0;
  let rgba = 0;
  for (let s = 0; s < spans.length; s += 3) {
    const row = (spans[s] - at.y) * width - at.x;
    for (let x = spans[s + 1]; x < spans[s + 2]; x++) {
      if (left === 0) {
        left = colors[run];
        rgba = colors[run + 1];
        run += 2;
      }
      left--;
      const i = (row + x) * 4;
      data[i] = rgba >>> 24;
      data[i + 1] = (rgba >>> 16) & 255;
      data[i + 2] = (rgba >>> 8) & 255;
      data[i + 3] = rgba & 255;
    }
  }
}
