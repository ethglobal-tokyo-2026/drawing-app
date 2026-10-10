/**
 * A sticker's passes, from its die-cut and the ink: the print (white border, kiss-cut groove, ink), the
 * baked gloss of its thin laminate, the cast shadow, the mask and the finished sticker. Pure functions
 * over pixel arrays.
 */
import { clamp01 } from "../../ui/easing";
import type { DieCut } from "./dieCut";
import { boxRows, type Pixels } from "./pixels";

type Pass = Uint8ClampedArray<ArrayBuffer>;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StickerPasses {
  width: number;
  height: number;
  /** The clear margin kept around the cut, in image pixels. */
  pad: number;
  /** Where the image sits over the ink, in ink pixels. */
  place: Rect;
  /** The print: white paper to the cut, the kiss-cut groove, and the ink where it was drawn. */
  plain: Pass;
  /** Baked and still, and only ever light: a faint broad sheen and a slim highlight on the edges facing the light. */
  gloss: Pass;
  /** The cast shadow, as it falls on the sheet. */
  shadow: Pass;
  /** The cut's shape: white, with the cut as its alpha. */
  mask: Pass;
  /** The finished sticker: the shadow, the print, and the gloss. */
  sticker: Pass;
}

/** The cut's long side in the image, at most. */
export const MAX_SIDE = 640;
/**
 * The cut's long side in the sharp copy, at most: the sticker detail's largest figure on an iPad,
 * at 2×. Only the sticker gets a sharp copy, since the ink's edge is what reads as soft.
 */
export const SHARP_SIDE = 1600;
/** The margin around the cut, as a share of its long side. */
export const PAD = 0.05;
const INK = [28, 24, 36];
const PAPER = [255, 255, 255];
/** The one light, from the top left, across the sticker. */
const LIGHT = { x: -0.58, y: -0.81 };
/** The laminate's edge highlight: how bright, and how far in it reaches, as a share of the long side. */
const EDGE_LIGHT = 0.5;
const EDGE_REACH = 0.01;
/** The broad sheen's brightest. */
const SHEEN = 0.1;
/** A thin sticker's cast, as shares of its long side: its throw across and down, and its blur. */
const CAST_X = 0.0015;
const CAST_Y = 0.004;
const CAST_BLUR = 0.012;

/** Where the image falls on the die-cut's grid: pixel (x, y) is centered on grid (x0 + (x + ½)/k, …). */
interface Frame {
  x0: number;
  y0: number;
  k: number;
  width: number;
  height: number;
}

/**
 * Fields over the die-cut's grid, sampled bilinearly along one image row at a time, so a large image
 * never holds a field at its own size. `rows(field, keep)` keeps the last `keep` rows it sampled.
 */
function gridRows(cut: DieCut, f: Frame) {
  const { width: w, height: h } = cut;
  const cols = new Int32Array(f.width);
  const fxs = new Float32Array(f.width);
  for (let x = 0; x < f.width; x++) {
    const gx = Math.min(w - 1, Math.max(0, f.x0 + (x + 0.5) / f.k - 0.5));
    cols[x] = Math.min(w - 2, Math.floor(gx));
    fxs[x] = gx - cols[x];
  }
  return (field: ArrayLike<number>, keep = 1) => {
    const kept = Array.from({ length: keep }, () => ({ y: -1, row: new Float32Array(f.width) }));
    return (y: number) => {
      const slot = kept[y % keep];
      if (slot.y === y) return slot.row;
      slot.y = y;
      const gy = Math.min(h - 1, Math.max(0, f.y0 + (y + 0.5) / f.k - 0.5));
      const r0 = Math.min(h - 2, Math.floor(gy));
      const fy = gy - r0;
      const top = r0 * w;
      const bottom = top + w;
      for (let x = 0; x < f.width; x++) {
        const c = cols[x];
        const fx = fxs[x];
        const t = field[top + c] * (1 - fx) + field[top + c + 1] * fx;
        const b = field[bottom + c] * (1 - fx) + field[bottom + c + 1] * fx;
        slot.row[x] = t * (1 - fy) + b * fy;
      }
      return slot.row;
    };
  };
}

/** The baked gloss on the die-cut's grid, premultiplied: its white, the same in every channel, and its alpha. */
export interface GlossGrid {
  color: Float32Array;
  alpha: Float32Array;
}

/**
 * The baked gloss: a thin laminate lit from the top left, so a faint broad sheen and a slim highlight
 * along the edges that face the light, and no shade anywhere. It's soft, so it's worked out once a cut,
 * at the grid's size, and every image of the sticker scales it up.
 */
export function bakedGloss(cut: DieCut): GlossGrid {
  const { width: w, height: h, mask, distanceIn: depth, bounds } = cut;
  const color = new Float32Array(w * h);
  const alpha = new Float32Array(w * h);
  const mw = bounds.x1 - bounds.x0 + 1;
  const mh = bounds.y1 - bounds.y0 + 1;
  const reach = Math.max(1, EDGE_REACH * Math.max(mw, mh));
  const wcx = bounds.x0 + mw * 0.34;
  const wcy = bounds.y0 + mh * 0.3;
  const wrx = mw * 0.42;
  const wry = Math.max(4, mh * 0.2);
  const wc = Math.cos(-0.45);
  const ws = Math.sin(-0.45);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const gx = (depth[i + 1] - depth[i - 1]) / 2;
      const gy = (depth[i + w] - depth[i - w]) / 2;
      const gl = Math.hypot(gx, gy) || 1;
      // The edge faces the light where the way in points away from it.
      const toward = Math.max(0, -(gx * LIGHT.x + gy * LIGHT.y) / gl);
      const edge = Math.pow(toward, 1.6) * Math.exp(-((depth[i] / reach) ** 2)) * EDGE_LIGHT;
      const ex = x - wcx;
      const ey = y - wcy;
      const qx = (ex * wc - ey * ws) / wrx;
      const qy = (ex * ws + ey * wc) / wry;
      const q2 = qx * qx + qy * qy;
      const sheen = q2 < 1 ? SHEEN * Math.pow(1 - q2, 1.5) : 0;
      const light = Math.min(0.9, edge + sheen);
      if (light <= 0.004) continue;
      color[i] = 255 * light;
      alpha[i] = light;
    }
  }
  return { color, alpha };
}

/** The image's frame with the cut's long side at most `maxSide`, and its clear margin. */
function frameOf({ bounds, scale }: DieCut, maxSide: number): Frame & { pad: number } {
  const mw = bounds.x1 - bounds.x0 + 1;
  const mh = bounds.y1 - bounds.y0 + 1;
  // Never larger than the ink was drawn.
  const k = Math.min(maxSide / Math.max(mw, mh), 1 / scale);
  const w = Math.round(mw * k);
  const h = Math.round(mh * k);
  // A share of the long side in whole pixels: k × side can land a hair past a round number, which
  // would round the margin up a pixel.
  const pad = Math.ceil(Math.max(w, h) * PAD);
  const width = w + pad * 2;
  const height = h + pad * 2;
  return { x0: bounds.x0 - pad / k, y0: bounds.y0 - pad / k, k, width, height, pad };
}

/** Lays the sticker out from its cut and its gloss: every pass, the same size and in the same place. */
export function stickerPasses(ink: Pixels, cut: DieCut, glossGrid: GlossGrid): StickerPasses {
  const frame = frameOf(cut, MAX_SIDE);
  const { width, height, pad } = frame;
  const { passes, sticker, place } = paint(ink, cut, glossGrid, frame, 1, true);
  return { width, height, pad, place, ...passes, sticker };
}

/** The finished sticker alone, larger than its stored image, for screens that show it larger. */
export interface SharpSticker {
  width: number;
  height: number;
  sticker: Pass;
}

/**
 * The finished sticker with its cut's long side up to SHARP_SIDE, as stickerPasses lays it out; null
 * unless that comes out larger than the stored image on both sides, the only sharp copy the server
 * takes, as when the ink holds no more pixels than the stored image already has.
 */
export function sharpSticker(ink: Pixels, cut: DieCut, glossGrid: GlossGrid): SharpSticker | null {
  const frame = frameOf(cut, SHARP_SIDE);
  const base = frameOf(cut, MAX_SIDE);
  if (frame.width <= base.width || frame.height <= base.height) return null;
  const { sticker } = paint(ink, cut, glossGrid, frame, frame.k / base.k, false);
  return { width: frame.width, height: frame.height, sticker };
}

type Painted<All extends boolean> = {
  place: Rect;
  sticker: Pass;
  passes: All extends true ? Record<"plain" | "gloss" | "shadow" | "mask", Pass> : null;
};

/**
 * Paints the finished sticker into `frame`, and every other pass too when `all`. The groove, the
 * contact line and the cast's offset keep the stored image's widths, `unit` image px to each of its.
 */
function paint<All extends boolean>(
  ink: Pixels,
  cut: DieCut,
  glossGrid: GlossGrid,
  frame: Frame,
  unit: number,
  all: All,
): Painted<All>;
function paint(
  ink: Pixels,
  cut: DieCut,
  glossGrid: GlossGrid,
  frame: Frame,
  unit: number,
  all: boolean,
): Painted<boolean> {
  const { scale, pad: gridPad } = cut;
  const { k, width, height } = frame;
  const mw = cut.bounds.x1 - cut.bounds.x0 + 1;
  const mh = cut.bounds.y1 - cut.bounds.y0 + 1;
  const n = width * height;

  const place: Rect = {
    x: (frame.x0 - gridPad) / scale,
    y: (frame.y0 - gridPad) / scale,
    w: width / k / scale,
    h: height / k / scale,
  };
  const printRow = boxRows(
    ink,
    { x: place.x, y: place.y, step: 1 / (scale * k), width, height },
    4,
  );
  const print = new Float32Array(width * 4);

  const body = Math.max(mw, mh) * k;
  const offX = Math.round(body * CAST_X + 0.5 * unit);
  const offY = Math.round(body * CAST_Y + unit);
  const blur = Math.max(unit, body * CAST_BLUR);

  const rows = gridRows(cut, frame);
  // The cast reads the cut `offY` rows up, so that many rows stay at hand.
  const softRow = rows(cut.soft, offY + 1);
  const clearanceRow = rows(cut.distanceOut, offY + 1);
  const glossColorRow = rows(glossGrid.color);
  const glossAlphaRow = rows(glossGrid.alpha);

  // Only the finished sticker when `all` is false: the sharp copy is large, and needs no other pass.
  const pass = () => new Uint8ClampedArray(all ? n * 4 : 0);
  const plain = pass();
  const gloss = pass();
  const shadow = pass();
  const mask = pass();
  const sticker = new Uint8ClampedArray(n * 4);
  const printColor = [0, 0, 0];

  for (let y = 0; y < height; y++) {
    const soft = softRow(y);
    const clearance = clearanceRow(y);
    const castFrom = Math.min(height - 1, Math.max(0, y - offY));
    const softAbove = softRow(castFrom);
    const clearanceAbove = clearanceRow(castFrom);
    const glossColor = glossColorRow(y);
    const glossAlpha = glossAlphaRow(y);
    printRow(y, print);
    for (let x = 0; x < width; x++) {
      const q = (y * width + x) * 4;
      const p = x * 4;
      // The signed distance to the cut, in image pixels, positive inside.
      const sd = (soft[x] - 0.5) * 5 * k;
      const a = clamp01(0.5 + sd);
      const groove = (clamp01(0.5 + sd + 1.15 * unit) - a) * 0.5;
      const printed = a + groove * (1 - a);

      if (all) {
        mask[q] = mask[q + 1] = mask[q + 2] = 255;
        mask[q + 3] = a * 255;
      }

      if (printed > 0) {
        const inkAlpha = print[p + 3] / 255;
        for (let c = 0; c < 3; c++) {
          const base = (PAPER[c] * a + INK[c] * groove * (1 - a)) / printed;
          printColor[c] = print[p + c] + base * (1 - inkAlpha);
          if (all) plain[q + c] = printColor[c];
        }
        if (all) plain[q + 3] = printed * 255;
      }

      // The cast shadow falls a little down and to the right, with a tight contact line at the cut.
      const j = Math.min(width - 1, Math.max(0, x - offX));
      const under = softAbove[j] > 0.5;
      const throwOff = under ? 0 : clamp01((clearanceAbove[j] * k) / blur);
      const contact = under ? 1 : 1 - clamp01((clearance[x] * k) / (2.2 * unit));
      const shade = Math.min(1, 0.16 * (1 - throwOff) * (1 - throwOff) + 0.16 * contact);
      if (all) {
        shadow[q] = INK[0];
        shadow[q + 1] = INK[1];
        shadow[q + 2] = INK[2];
        shadow[q + 3] = shade * 255;
      }

      // The gloss, clipped to the cut; then shadow, print and gloss, one over the other.
      const glossA = glossAlpha[x] * a;
      const g = glossColor[x] * a;
      const printAlpha = printed;
      const below = shade * (1 - printAlpha);
      const alpha = glossA + (printAlpha + below) * (1 - glossA);
      for (let c = 0; c < 3; c++) {
        if (all && glossA > 0) gloss[q + c] = g / glossA;
        const inked = printed > 0 ? printColor[c] * printAlpha : 0;
        const premultiplied = g + (inked + INK[c] * below) * (1 - glossA);
        sticker[q + c] = alpha > 0 ? premultiplied / alpha : 0;
      }
      if (all) gloss[q + 3] = glossA * 255;
      sticker[q + 3] = alpha * 255;
    }
  }

  return { place, sticker, passes: all ? { plain, gloss, shadow, mask } : null };
}
