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
import { clamp } from "../ui/easing";
import { seededRandom } from "../ui/seededRandom";

/** The pile's width in units on every phone; the screen scales it to fit. */
export const PILE_WIDTH = 360;
/** A name tag's height on one line: a 12-unit line of 11-unit text in a pill round a 13-unit photo. */
export const TAG_H = 17;
/** Each further line a long name runs onto adds this. */
export const TAG_LINE = 12;
/** The widest a tag's line of text gets; a longer name runs onto another line, never cut short. */
export const TAG_LINE_MAX = 112;
/** The "to @x" tag sits this far right of the name tag above it, */
const TO_TAG_INDENT = 10;
/** and this far below its foot. */
const TO_TAG_GAP = 2;

/** A name tag's width round its text: its padding, the photo and its gap. */
const TAG_CHROME = 26;
/** The "to @x" tag has no photo. */
const TO_TAG_CHROME = 14;
/** The widest a tag gets. */
export const TAG_MAX_W = TAG_CHROME + TAG_LINE_MAX;
/** How far a tag reaches left of its sticker's cut. */
const TAG_OUT = 8;
/** How much of a tag's first line lies over its sticker's edge. */
const TAG_OVER = 8;
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

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * A character's width in pile units, in the tags' 11-unit Mona Sans: the widest of its kind as
 * measured at weights 550 to 750, and a little more, so a line never needs more than its room. A
 * grapheme counts as its first character, so an emoji sequence or an accented letter counts once.
 */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  // Emoji, and the arrows, symbols and dingbats that draw as emoji.
  if (code >= 0x1f000 || (code >= 0x2190 && code <= 0x2bff)) return 17;
  // Full width: kana, kanji, hangul and their punctuation; and W, the widest Latin letter.
  if (code >= 0x1100 || ch === "W") return 12;
  if (code >= 0x80) return 9.8;
  if ("ijlI.,:;'`!| ".includes(ch)) return 3.5;
  if ('frt1J()[]{}/\\*"-_'.includes(ch)) return 5.3;
  if ("mM@%".includes(ch)) return 11.3;
  if ("ABCDGHKNOQRUVXYw&".includes(ch)) return 9.8;
  if (ch >= "a" && ch <= "z") return 7.3;
  return 7.8;
}

/** A text's width in pile units, set as a tag sets it. */
export function textWidth(text: string): number {
  let w = 0;
  for (const { segment } of graphemes.segment(text)) w += charWidth(segment);
  return w;
}

/** A name may run onto its next line after one of these, or after any full-width character. */
const BREAKS_AFTER = " _.-/・、。";
/** A natural break is taken only when it leaves at least this share of a line on the line. */
const BREAK_FILL = 0.6;

/**
 * A tag's words as lines at most `max` units wide, so a long name shows whole. Each line breaks at
 * its last natural break, when that leaves it well filled, and otherwise between two characters.
 */
export function tagLines(text: string, max = TAG_LINE_MAX): string[] {
  const parts = [...graphemes.segment(text)].map(({ segment }) => ({
    g: segment,
    w: charWidth(segment),
    breaks: BREAKS_AFTER.includes(segment) || (segment.codePointAt(0) ?? 0) >= 0x1100,
  }));
  const join = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map(({ g }) => g)
      .join("");
  const lines: string[] = [];
  let start = 0;
  let width = 0;
  // The last place this line may break after, and its width up to there.
  let fits = -1;
  let fitsWidth = 0;
  parts.forEach(({ w, breaks }, i) => {
    if (width + w > max && i > start) {
      const at = fits >= start && fitsWidth >= max * BREAK_FILL ? fits + 1 : i;
      lines.push(join(start, at).trimEnd());
      width = parts.slice(at, i).reduce((sum, part) => sum + part.w, 0);
      start = at;
      fits = -1;
    }
    width += w;
    if (breaks) {
      fits = i;
      fitsWidth = width;
    }
  });
  lines.push(join(start));
  return lines;
}

/** One tag: its lines, its top left within its group, and its size, in pile units. */
export interface Tag {
  lines: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A sticker's tag group: the name tag, and under it the "to @x" tag when the sticker was given. */
export interface TagGroup {
  name: Tag;
  to: Tag | null;
  /** The group's size, which no later sticker or tag covers. */
  w: number;
  h: number;
}

function tagOf(text: string, chrome: number, x: number, y: number): Tag {
  const lines = tagLines(text);
  const w = Math.ceil(chrome + Math.max(...lines.map(textWidth)));
  return { lines, x, y, w, h: TAG_H + (lines.length - 1) * TAG_LINE };
}

/**
 * A sticker's tags, each measured round its whole label: the name tag round `name`, and when the
 * sticker was given, the "to @x" tag round `to`, such as "to @ken" or "@kenさんへ".
 */
export function tagGroup(name: string, to: string | null): TagGroup {
  const nameTag = tagOf(name, TAG_CHROME, 0, 0);
  if (to === null) return { name: nameTag, to: null, w: nameTag.w, h: nameTag.h };
  const toTag = tagOf(to, TO_TAG_CHROME, TO_TAG_INDENT, nameTag.h + TO_TAG_GAP);
  return {
    name: nameTag,
    to: toTag,
    w: Math.max(nameTag.w, toTag.x + toTag.w),
    h: toTag.y + toTag.h,
  };
}

export interface PileItem {
  id: string;
  /** Its cut line inside its image. */
  shape: Shape;
  /** Its tag group's size, from `tagGroup`. */
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
    // A sticker too wide for the floor's sides sits in the middle of them.
    const withinSides = (x: number) => (hi < lo ? Math.round((lo + hi) / 2) : clamp(x, lo, hi));
    const sink = overlap * (Math.max(pf.w, pf.h) / 2);
    const step = Math.max(2, Math.round(pf.w * SLIDE_STEP));

    let best: { x: number; y: number; depth: number } | null = null;
    for (let tries = 0; tries < TRIES; tries++) {
      // Three randoms summed: most drops fall near the middle, so the day heaps into a mound.
      let x = withinSides(Math.round(((rnd() + rnd() + rnd()) / 3) * W));
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
        const next =
          last < -balance ? withinSides(x + step) : first > balance ? withinSides(x - step) : x;
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
    const middle = withinSides(Math.round(W / 2));
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
