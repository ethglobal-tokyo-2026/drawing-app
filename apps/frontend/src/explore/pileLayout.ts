/**
 * Explore's sticker pile: a day's stickers dropped onto that day's floor, oldest first, so the newest
 * lie on top. Pure and deterministic, on the sticker tray's cut profiles (sheetPacking.ts).
 * - Heaped: each sticker drops at a few seeded x's that favor the middle, slides off anything it
 *   can't balance on, sinks into what it lands on by `overlap` of its radius, and stays at the lowest
 *   of those drops, turned up to `turn` degrees.
 * - Named: every sticker's name tag hangs across its lower left edge, and no later sticker or tag
 *   covers an earlier tag.
 * - Stable: a spot depends only on the day, the sticker's id and the stickers before it, in a space
 *   `width` units wide on every phone, so appending moves nothing and each visit looks the same.
 * Units: x runs from 0 to `width`, and y from the floor at 0 up, so a heap's y is negative.
 */
import { boxShape, hash, profileOf, type Shape } from "../sticker-board/tray/sheetPacking";
import { seededRandom } from "../ui/seededRandom";

/** The pile's width in units on every phone; the screen scales it to fit. */
export const PILE_WIDTH = 360;
/** A name tag's height: a 16-unit photo sticker in a pill. */
export const TAG_H = 20;
/** The "to @x" tag sits this far right of the name tag above it, */
export const TO_TAG_INDENT = 10;
/** and this far below it. */
export const TO_TAG_DROP = TAG_H + 2;
/** The widest a tag gets; a longer name is cut short. */
export const TAG_MAX_W = 124;

/** A name tag's width around its text: padding, the photo and its gap. */
const TAG_CHROME = 30;
/** The "to @x" tag has no photo. */
const TO_TAG_CHROME = 16;
/** How far a tag reaches left of its sticker's cut. */
const TAG_OUT = 8;
/** How much of a tag's height lies over its sticker's edge. */
const TAG_OVER = 9;
/** Kept clear around each tag, for its turn's rounding and its NEW pip. */
const TAG_CLEAR = 3;
/** Cut lines and tags keep this far from the pile's sides. */
const SIDE = 4;
/** A sticker's size: the side of a square with its cut's area. */
const SIZE = 92;
/** Its cut's long side stays between these. */
const LONG_MIN = 64;
const LONG_MAX = 128;
/** Drops tried per sticker; it stays at the lowest. */
const TRIES = 4;
/** The share of its full sink that counts as sunk in, rather than held up by a tag. */
const FULL = 0.9;
/** It slides at most this many steps, */
const SLIDES = 10;
/** each this share of its width, */
const SLIDE_STEP = 0.2;
/** while all it rests on, everything within this of its lowest contact, */
const CONTACT = 2;
/** lies further than this share of its width to one side of its middle. */
const BALANCE = 0.06;
/** A hair more than rounding, so a sticker that rises clear of a tag doesn't still touch it. */
const EDGE = 1e-6;

/** A name's width in 11px bold, over-reckoned so the pill never needs more than its room. */
function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x1100) w += 12;
    else if (ch >= "A" && ch <= "Z") w += 8.8;
    else if (ch === "i" || ch === "l" || ch === "." || ch === "_" || ch === "'") w += 4.4;
    else if (ch === "m" || ch === "w" || ch === "@") w += 11.5;
    else w += 7.4;
  }
  return w;
}

/** A tag group's size: the name tag, and under it the "to @x" tag when the sticker was given. */
export function tagSize(name: string, givenTo: string | null): { w: number; h: number } {
  const nameW = Math.min(TAG_MAX_W, Math.ceil(TAG_CHROME + textWidth(name)));
  if (givenTo === null) return { w: nameW, h: TAG_H };
  const toW = Math.min(TAG_MAX_W, Math.ceil(TO_TAG_CHROME + textWidth(givenTo)));
  return { w: Math.max(nameW, TO_TAG_INDENT + toW), h: TO_TAG_DROP + TAG_H };
}

/** The width each tag in a group gets. */
export function tagWidths(name: string, givenTo: string | null) {
  return {
    name: Math.min(TAG_MAX_W, Math.ceil(TAG_CHROME + textWidth(name))),
    to: givenTo === null ? 0 : Math.min(TAG_MAX_W, Math.ceil(TO_TAG_CHROME + textWidth(givenTo))),
  };
}

export interface PileItem {
  id: string;
  /** Its cut line inside its image. */
  shape: Shape;
  /** Its tag group's size, from `tagSize`. */
  tag: { w: number; h: number };
}

/** A rectangle, in pile units. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Where a sticker lies in the pile. */
export interface PiledSticker {
  id: string;
  /** Its place in the day, oldest first: later ones lie over it. */
  n: number;
  /** The center of its image. */
  x: number;
  y: number;
  /** Its turn about that center, clockwise, in degrees. */
  r: number;
  /** Pile units per image pixel, and its image's size in the pile. */
  s: number;
  w: number;
  h: number;
  /** Its tag group's top left before its turn, its size, and its turn about its own center. */
  tag: { x: number; y: number; w: number; h: number; r: number };
  /** What its tag keeps uncovered: the turned group, and a little room. */
  tagClear: Box;
}

export interface PileLayer {
  /** Oldest first. */
  items: PiledSticker[];
  /** The heap's highest point, cut lines and tags alike: 0 when it's empty. */
  top: number;
}

export interface PileOptions {
  /** The day, which seeds the layer. */
  seed: string;
  width?: number;
  /** How far a sticker sinks into what it lands on, as a share of its radius. */
  overlap?: number;
  /** The largest turn, in degrees. */
  turn?: number;
  /** Size varies by up to this share either way. */
  vary?: number;
}

const shapeOf = (shape: Shape) =>
  shape.poly.length > 2 ? shape : boxShape(shape.w || 1, shape.h || 1);

/** The cut's size in image pixels, from its line's extent. */
function cutExtent(sh: Shape) {
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (const [u, v] of sh.poly) {
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
    v0 = Math.min(v0, v);
    v1 = Math.max(v1, v);
  }
  return { w: (u1 - u0) * sh.w, h: (v1 - v0) * sh.h };
}

/** Lays out one day's stickers, oldest first. */
export function pileStickers(items: readonly PileItem[], opts: PileOptions): PileLayer {
  const W = Math.round(opts.width ?? PILE_WIDTH);
  const overlap = opts.overlap ?? 0.6;
  const turn = opts.turn ?? 17;
  const vary = opts.vary ?? 0.1;
  // The heap's surface: each column's highest cut line, which a sticker falls onto and sinks into.
  const surface = new Float64Array(W).fill(0);
  // Every tag so far, which nothing later may cover.
  const tags: Box[] = [];
  const out: PiledSticker[] = [];
  let heapTop = 0;

  items.forEach((item, n) => {
    const sh = shapeOf(item.shape);
    const rnd = seededRandom(hash(`${opts.seed}:${item.id}`));
    const r = Math.round((2 * rnd() - 1) * turn * 100) / 100;
    const extent = cutExtent(sh);
    let s = (SIZE * (1 + vary * (2 * rnd() - 1))) / Math.sqrt(extent.w * extent.h || 1);
    const long = Math.max(extent.w, extent.h) * s;
    if (long > LONG_MAX) s *= LONG_MAX / long;
    else if (long < LONG_MIN) s *= LONG_MIN / long;
    const w = sh.w * s;
    const h = sh.h * s;
    const pf = profileOf(sh, w, h, r, false);

    // The tag hangs across the cut's lower edge under its own left side, turned back a little.
    const tw = item.tag.w;
    const th = item.tag.h;
    const tagX = pf.minx - TAG_OUT;
    let edge = -Infinity;
    for (let c = Math.floor(tagX); c <= tagX + tw * 0.45; c++) {
      const t = c - pf.j0;
      if (t >= 0 && t < pf.m) edge = Math.max(edge, pf.bot[t]);
    }
    if (edge === -Infinity) edge = pf.tmin + pf.h;
    const tagY = edge - TAG_OVER;
    const tr = Math.round((-0.3 * r + (rnd() - 0.5) * 3) * 100) / 100;
    const a = (Math.abs(tr) * Math.PI) / 180;
    const cw = tw * Math.cos(a) + th * Math.sin(a);
    const ch = tw * Math.sin(a) + th * Math.cos(a);
    const clear: Box = {
      x0: tagX + tw / 2 - cw / 2 - TAG_CLEAR,
      y0: tagY + th / 2 - ch / 2 - TAG_CLEAR,
      x1: tagX + tw / 2 + cw / 2 + TAG_CLEAR,
      y1: tagY + th / 2 + ch / 2 + TAG_CLEAR,
    };
    /** Where the cut first meets the heap's cut lines or the floor, dropped at x. */
    const touch = (x: number) => {
      let y = Infinity;
      for (let t = 0, c = x + pf.j0; t < pf.m; t++, c++) {
        if (c >= 0 && c < W) y = Math.min(y, surface[c] - pf.bot[t]);
      }
      return y;
    };
    // Its lowest point, cut or tag, stays on the floor.
    const floor = -Math.max(pf.tmin + pf.h, clear.y1);
    /**
     * The lowest y at or above `y` where neither its cut nor its tag covers an earlier tag. Each
     * earlier tag rules out a band of heights at this x, and the sticker rises past each band it's
     * in until it's in none. Above every tag it's always clear, so this ends.
     */
    const clearAt = (x: number, y: number) => {
      const bands: [above: number, below: number][] = [];
      for (const tag of tags) {
        if (tag.x1 > x + clear.x0 && tag.x0 < x + clear.x1)
          bands.push([tag.y0 - clear.y1, tag.y1 - clear.y0]);
        // Every column of the cut the tag reaches into, even partly.
        const from = Math.max(Math.floor(tag.x0) - x - pf.j0, 0);
        const to = Math.min(Math.ceil(tag.x1) - 1 - x - pf.j0, pf.m - 1);
        if (from > to) continue;
        let low = -Infinity;
        let high = Infinity;
        for (let t = from; t <= to; t++) {
          low = Math.max(low, pf.bot[t]);
          high = Math.min(high, pf.top[t]);
        }
        bands.push([tag.y0 - low, tag.y1 - high]);
      }
      let at = Math.min(y, floor);
      for (let moved = true; moved;) {
        moved = false;
        for (const [above, below] of bands) {
          if (at > above - EDGE && at < below) {
            at = above - EDGE;
            moved = true;
          }
        }
      }
      return at;
    };

    const lo = Math.ceil(SIDE - Math.min(pf.minx, clear.x0));
    const hi = Math.floor(W - SIDE - Math.max(pf.maxx, clear.x1));
    const clamp = (x: number) =>
      hi < lo ? Math.round((lo + hi) / 2) : Math.min(hi, Math.max(lo, x));
    const sink = overlap * (Math.max(pf.w, pf.h) / 2);
    const step = Math.max(2, Math.round(pf.w * SLIDE_STEP));

    let best: { x: number; y: number; depth: number } | null = null;
    for (let tries = 0; tries < TRIES; tries++) {
      // Three randoms summed: most drops fall near the middle, so the day heaps into a mound.
      let x = clamp(Math.round(((rnd() + rnd() + rnd()) / 3) * W));
      // It slides off anything it can't balance on: while all it rests on lies to one side of its
      // middle, it moves a step the other way.
      for (let slides = 0; slides < SLIDES; slides++) {
        const rest = touch(x);
        let first = Infinity;
        let last = -Infinity;
        for (let t = 0, c = x + pf.j0; t < pf.m; t++, c++) {
          if (c >= 0 && c < W && surface[c] - pf.bot[t] - rest < CONTACT) {
            first = Math.min(first, pf.j0 + t + 0.5);
            last = Math.max(last, pf.j0 + t + 0.5);
          }
        }
        const balance = pf.w * BALANCE;
        const next = last < -balance ? clamp(x + step) : first > balance ? clamp(x - step) : x;
        if (next === x) break;
        x = next;
      }
      const landed = touch(x);
      const y = clearAt(x, landed + sink);
      const depth = (y - landed) / (sink || 1);
      // The lowest of its drops wins, as a heap fills its hollows; one that sinks in fully counts
      // lower than one held up by a tag.
      const low = y + (depth >= FULL ? 0 : -sink);
      if (!best || low > best.depth) best = { x, y, depth: low };
    }
    const middle = clamp(Math.round(W / 2));
    const { x, y } = best ?? { x: middle, y: clearAt(middle, touch(middle)) };

    for (let t = 0, c = x + pf.j0; t < pf.m; t++, c++) {
      if (c >= 0 && c < W) surface[c] = Math.min(surface[c], y + pf.top[t]);
    }
    const tagClear = { x0: x + clear.x0, y0: y + clear.y0, x1: x + clear.x1, y1: y + clear.y1 };
    tags.push(tagClear);
    heapTop = Math.min(heapTop, y + pf.tmin, tagClear.y0);
    out.push({
      id: item.id,
      n,
      x,
      y,
      r,
      s,
      w,
      h,
      tag: { x: x + tagX, y: y + tagY, w: tw, h: th, r: tr },
      tagClear,
    });
  });

  return { items: out, top: heapTop };
}
