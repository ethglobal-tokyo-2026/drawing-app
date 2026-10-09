/**
 * A sticker's layers, from its die-cut and the ink: the print (white border, kiss-cut groove, ink), the
 * print under its resin, the baked gloss, the cast shadow, the mask, the finished sticker, and the bands
 * the live resin is masked by. Pure functions over pixel arrays.
 */
import { clamp01 } from "../../ui/easing";
import type { DieCut } from "./dieCut";
import { boxResample, type Pixels } from "./pixels";

type Layer = Uint8ClampedArray<ArrayBuffer>;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The live resin's masks, cut from the silhouette's edges. */
interface Bands {
  width: number;
  height: number;
  /** The upper-left edge, brightest at the lip: where the specular runs. */
  spec: Layer;
  /** The lower edge: where the rim light sits. */
  rim: Layer;
}

export interface StickerLayers {
  width: number;
  height: number;
  /** The clear margin kept around the cut, in image pixels. */
  pad: number;
  /** Where the image sits over the ink, in ink pixels. */
  place: Rect;
  /** The print: white paper to the cut, the kiss-cut groove, and the ink where it was drawn. */
  plain: Layer;
  /** The print under its resin: darker, richer and cooler where the resin pools at the edge. */
  tint: Layer;
  /** Baked and still: a broad sheen, the rim light, a faint top specular, refraction and the meniscus. */
  gloss: Layer;
  /** The cast shadow, as it falls on the sheet. */
  shadow: Layer;
  /** The cut's shape: white, with the cut as its alpha. */
  mask: Layer;
  /** The finished sticker: the shadow, the print under its resin, and the gloss. */
  sticker: Layer;
  bands: Bands;
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
/** The resin's faint cool cast. */
const LAVENDER = [222, 217, 238];
/** The live resin's bands are measured at most this big; CSS stretches them to the sticker. */
const BAND_SIDE = 420;

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Where the image falls on the die-cut's grid: pixel (x, y) is centered on grid (x0 + (x + ½)/k, …). */
interface Frame {
  x0: number;
  y0: number;
  k: number;
  width: number;
  height: number;
}

/** A field over the die-cut's grid, sampled bilinearly at every image pixel. */
function upscale(field: ArrayLike<number>, w: number, h: number, f: Frame): Float32Array {
  const out = new Float32Array(f.width * f.height);
  const cols = new Int32Array(f.width);
  const fxs = new Float32Array(f.width);
  for (let x = 0; x < f.width; x++) {
    const gx = Math.min(w - 1, Math.max(0, f.x0 + (x + 0.5) / f.k - 0.5));
    cols[x] = Math.min(w - 2, Math.floor(gx));
    fxs[x] = gx - cols[x];
  }
  for (let y = 0; y < f.height; y++) {
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
      out[y * f.width + x] = t * (1 - fy) + b * fy;
    }
  }
  return out;
}

/**
 * The baked gloss on the die-cut's grid, premultiplied: the resin is a dome over the cut, lit from the
 * top left. It's broad and soft, so it's worked out at the grid's size and scaled up.
 */
function glossPlanes(cut: DieCut): Float32Array[] {
  const { width: w, height: h, mask, distanceIn: depth, bounds } = cut;
  const planes = [0, 1, 2, 3].map(() => new Float32Array(w * h));
  const [pr, pg, pb, pa] = planes;
  const mw = bounds.x1 - bounds.x0 + 1;
  const mh = bounds.y1 - bounds.y0 + 1;
  const S = Math.max(mw, mh);
  const D = Math.max(8, 0.2 * S);
  const H0 = 0.5;
  const L = norm3(-0.5, -0.7, 0.9);
  const lxy = Math.hypot(L[0], L[1]);
  const Lx = L[0] / lxy;
  const Ly = L[1] / lxy;
  const wcx = bounds.x0 + mw * 0.34;
  const wcy = bounds.y0 + mh * 0.3;
  const wrx = mw * 0.42;
  const wry = Math.max(4, mh * 0.2);
  const wc = Math.cos(-0.45);
  const ws = Math.sin(-0.45);
  const rimAt = 0.022 * S;
  const rimW = 0.013 * S;
  const topAt = 0.013 * S;
  const topW = 0.014 * S;
  const refAt = 0.017 * S;
  const refW = 0.009 * S;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const d = depth[i];
      const u = Math.min(Math.max(d / D, 0.02), 1);
      const gx = (depth[i + 1] - depth[i - 1]) / 2;
      const gy = (depth[i + w] - depth[i - w]) / 2;
      const gl = Math.hypot(gx, gy) || 1;
      // Pointing inward.
      const ix = gx / gl;
      const iy = gy / gl;
      const slope = u >= 1 ? 0 : (H0 * (1 - u)) / Math.sqrt(1 - (1 - u) * (1 - u));
      // The dome leans outward at its rim.
      const N = norm3(-ix * slope, -iy * slope, 1);
      const diffuse = N[0] * L[0] + N[1] * L[1] + N[2] * L[2] - L[2];
      const facing = ix * Lx + iy * Ly;
      const away = Math.max(0, facing);
      const toward = Math.max(0, -facing);
      const rim = Math.pow(away, 1.3) * Math.exp(-(((d - rimAt) / rimW) ** 2)) * 0.62;
      const top = Math.pow(toward, 1.6) * Math.exp(-(((d - topAt) / topW) ** 2)) * 0.52;
      const ex = x - wcx;
      const ey = y - wcy;
      const qx = (ex * wc - ey * ws) / wrx;
      const qy = (ex * ws + ey * wc) / wry;
      const q2 = qx * qx + qy * qy;
      const sheen = q2 < 1 ? 0.19 * Math.pow(1 - q2, 1.5) : 0;
      const lip = Math.pow(1 - u, 9) * 0.12;
      // Where the thick resin meets the border it refracts: a soft darker band just inside the cut,
      // heaviest on the side away from the light, so the dome reads even when nothing moves.
      const refraction =
        Math.exp(-(((d - refAt) / refW) ** 2)) * (0.07 + 0.11 * away) * (1 - 0.6 * toward);
      const light = Math.min(0.9, rim + top + sheen + Math.max(0, diffuse) * 0.06);
      const dark = Math.min(0.3, Math.max(0, -diffuse) * 0.15 + lip + refraction);
      const alpha = Math.min(1, light + dark);
      if (alpha <= 0.004) continue;
      pr[i] = 255 * light + INK[0] * dark;
      pg[i] = 255 * light + INK[1] * dark;
      pb[i] = 255 * light + INK[2] * dark;
      pa[i] = alpha;
    }
  }
  return planes;
}

/** Bilinear, and empty off the image. */
function sampleClear(m: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const v = (xx: number, yy: number) =>
    xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : m[yy * w + xx];
  return (
    (v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx) * (1 - fy) +
    (v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx) * fy
  );
}

/**
 * The live resin's bands: the silhouette less itself moved down and right (graded, so it's brightest
 * at the lip and feathers inward), and less itself moved up. Sizes are shares of the sticker.
 */
function cutBands(mask: Layer, width: number, height: number): Bands {
  const s = Math.min(1, BAND_SIDE / Math.max(width, height));
  const W = Math.max(1, Math.round(width * s));
  const H = Math.max(1, Math.round(height * s));
  const m = boxResample(
    { data: mask, width, height },
    { x: 0, y: 0, step: 1 / s, width: W, height: H },
    1,
  );
  for (let i = 0; i < m.length; i++) m[i] /= 255;
  const big = Math.max(W, H);
  const k = Math.max(3, Math.round(big * 0.1));
  const k2 = Math.max(2, Math.round(big * 0.035));
  const spec = new Uint8ClampedArray(W * H * 4);
  const rim = new Uint8ClampedArray(W * H * 4);
  const [sx, sy] = [Math.round(k * 0.55), k];
  const [rx, ry] = [-Math.round(k2 * 0.35), -k2];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = m[i];
      if (!a) continue;
      let upper = a;
      for (const [f, strength] of [
        [0.35, 0.2],
        [0.65, 0.4],
        [1, 1],
      ])
        upper *= 1 - strength * sampleClear(m, W, H, x - sx * f, y - sy * f);
      const lower = a * (1 - sampleClear(m, W, H, x - rx, y - ry));
      spec.set([255, 255, 255, upper * 255], i * 4);
      rim.set([255, 255, 255, lower * 255], i * 4);
    }
  }
  return { width: W, height: H, spec, rim };
}

/** The image's frame with the cut's long side at most `maxSide`, and its clear margin. */
function frameOf({ bounds, scale }: DieCut, maxSide: number): Frame & { pad: number } {
  const mw = bounds.x1 - bounds.x0 + 1;
  const mh = bounds.y1 - bounds.y0 + 1;
  // Never larger than the ink was drawn.
  const k = Math.min(maxSide / Math.max(mw, mh), 1 / scale);
  const pad = Math.ceil(Math.max(mw, mh) * k * PAD);
  const width = Math.round(mw * k) + pad * 2;
  const height = Math.round(mh * k) + pad * 2;
  return { x0: bounds.x0 - pad / k, y0: bounds.y0 - pad / k, k, width, height, pad };
}

/** Lays the sticker out from its cut: every layer, the same size and in the same place. */
export function stickerLayers(ink: Pixels, cut: DieCut): StickerLayers {
  const frame = frameOf(cut, MAX_SIDE);
  const { width, height, pad } = frame;
  const { layers, sticker, place } = paint(ink, cut, frame, 1, true);
  return {
    width,
    height,
    pad,
    place,
    ...layers,
    sticker,
    bands: cutBands(layers.mask, width, height),
  };
}

/** The finished sticker alone, larger than its stored image, for screens that show it larger. */
export interface SharpSticker {
  width: number;
  height: number;
  sticker: Layer;
}

/**
 * The finished sticker with its cut's long side up to SHARP_SIDE, as stickerLayers lays it out; null
 * when the ink holds no more pixels than the stored image already has.
 */
export function sharpSticker(ink: Pixels, cut: DieCut): SharpSticker | null {
  const frame = frameOf(cut, SHARP_SIDE);
  const base = frameOf(cut, MAX_SIDE);
  if (frame.width <= base.width) return null;
  const { sticker } = paint(ink, cut, frame, frame.k / base.k, false);
  return { width: frame.width, height: frame.height, sticker };
}

type Painted<All extends boolean> = {
  place: Rect;
  sticker: Layer;
  layers: All extends true ? Record<"plain" | "tint" | "gloss" | "shadow" | "mask", Layer> : null;
};

/**
 * Paints the finished sticker into `frame`, and every other layer too when `all`. The groove, the
 * contact line and the cast's offset keep the stored image's widths, `unit` image px to each of its.
 */
function paint<All extends boolean>(
  ink: Pixels,
  cut: DieCut,
  frame: Frame,
  unit: number,
  all: All,
): Painted<All>;
function paint(
  ink: Pixels,
  cut: DieCut,
  frame: Frame,
  unit: number,
  all: boolean,
): Painted<boolean> {
  const { scale, pad: gridPad } = cut;
  const { k, width, height } = frame;
  const mw = cut.bounds.x1 - cut.bounds.x0 + 1;
  const mh = cut.bounds.y1 - cut.bounds.y0 + 1;
  const n = width * height;

  const up = (field: ArrayLike<number>) => upscale(field, cut.width, cut.height, frame);
  const soft = up(cut.soft);
  const depth = up(cut.distanceIn);
  const clearance = up(cut.distanceOut);
  const place: Rect = {
    x: (frame.x0 - gridPad) / scale,
    y: (frame.y0 - gridPad) / scale,
    w: width / k / scale,
    h: height / k / scale,
  };
  const print = boxResample(
    ink,
    { x: place.x, y: place.y, step: 1 / (scale * k), width, height },
    4,
  );
  const glossGrid = glossPlanes(cut).map(up);

  const body = Math.max(mw, mh) * k;
  const offX = Math.round(body * 0.004 + unit);
  const offY = Math.round(body * 0.01 + 2 * unit);
  const blur = body * 0.035;
  const edgeZone = Math.max(4 * unit, body * 0.08);

  // Only the finished sticker when `all` is false: the sharp copy is large, and needs no other layer.
  const layer = () => new Uint8ClampedArray(all ? n * 4 : 0);
  const plain = layer();
  const tint = layer();
  const gloss = layer();
  const shadow = layer();
  const mask = layer();
  const sticker = new Uint8ClampedArray(n * 4);
  const tinted = [0, 0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const q = i * 4;
      // The signed distance to the cut, in image pixels, positive inside.
      const sd = (soft[i] - 0.5) * 5 * k;
      const a = clamp01(0.5 + sd);
      const groove = (clamp01(0.5 + sd + 1.15 * unit) - a) * 0.5;
      const printed = a + groove * (1 - a);

      if (all) {
        mask[q] = mask[q + 1] = mask[q + 2] = 255;
        mask[q + 3] = a * 255;
      }

      if (printed > 0) {
        const inkAlpha = print[q + 3] / 255;
        const resin = Math.pow(1 - Math.min((depth[i] * k) / edgeZone, 1), 1.6);
        for (let c = 0; c < 3; c++) {
          const base = (PAPER[c] * a + INK[c] * groove * (1 - a)) / printed;
          const v = print[q + c] + base * (1 - inkAlpha);
          // Resin pools deeper at the edge: the print there multiplies with itself and cools.
          tinted[c] =
            resin <= 0.002
              ? v
              : v *
                (1 + (v / 255 - 1) * 0.62 * resin) *
                (1 + (LAVENDER[c] / 255 - 1) * 0.75 * resin);
          if (all) {
            plain[q + c] = v;
            tint[q + c] = tinted[c];
          }
        }
        if (all) plain[q + 3] = tint[q + 3] = printed * 255;
      }

      // The cast shadow falls down and to the right, soft, with a tight contact line at the cut.
      const j =
        Math.min(height - 1, Math.max(0, y - offY)) * width +
        Math.min(width - 1, Math.max(0, x - offX));
      const under = soft[j] > 0.5;
      const throwOff = under ? 0 : clamp01((clearance[j] * k) / blur);
      const contact = under ? 1 : 1 - clamp01((clearance[i] * k) / (2.2 * unit));
      const shade = Math.min(1, 0.2 * (1 - throwOff) * (1 - throwOff) + 0.16 * contact);
      if (all) {
        shadow[q] = INK[0];
        shadow[q + 1] = INK[1];
        shadow[q + 2] = INK[2];
        shadow[q + 3] = shade * 255;
      }

      // The gloss, clipped to the cut; then shadow, print and gloss, one over the other.
      const glossAlpha = glossGrid[3][i] * a;
      const printAlpha = printed;
      const below = shade * (1 - printAlpha);
      const alpha = glossAlpha + (printAlpha + below) * (1 - glossAlpha);
      for (let c = 0; c < 3; c++) {
        const g = glossGrid[c][i] * a;
        if (all && glossAlpha > 0) gloss[q + c] = g / glossAlpha;
        const p = printed > 0 ? tinted[c] * printAlpha : 0;
        const premultiplied = g + (p + INK[c] * below) * (1 - glossAlpha);
        sticker[q + c] = alpha > 0 ? premultiplied / alpha : 0;
      }
      if (all) gloss[q + 3] = glossAlpha * 255;
      sticker[q + 3] = alpha * 255;
    }
  }

  return { place, sticker, layers: all ? { plain, tint, gloss, shadow, mask } : null };
}
