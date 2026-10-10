/**
 * Stickers sealed before the thin laminate have a resin dome baked into their PNG, which stays as
 * sealed and minted. This is the one place that knows how that dome was baked, so their display
 * copies can show the paper flat: it models the paper's color under the dome at each pixel, and lifts
 * the pixels that match it to white, leaving ink as it was.
 */
import { squaredDistanceTo } from "../services/distanceTransform.ts";
import { INSIDE_ALPHA } from "../services/foilMask.ts";

const RGBA = 4;
/** A channel at full strength: paper's white. */
const FULL = 255;

/** A sticker image's pixels: RGBA, unpremultiplied. */
export interface Pixels {
  data: Uint8Array;
  width: number;
  height: number;
}

// The dome as sealing baked it: lit from the top left, its sizes shares of the cut's long side.
const DOME_INK = [28, 24, 36];
/** The resin's faint cool cast. */
const LAVENDER = [222, 217, 238];
const LIGHT = unit(-0.5, -0.7, 0.9);
const LIGHT_FLAT_X = LIGHT[0] / Math.hypot(LIGHT[0], LIGHT[1]);
const LIGHT_FLAT_Y = LIGHT[1] / Math.hypot(LIGHT[0], LIGHT[1]);
const DOME_FOOT = 0.2;
const MIN_DOME_FOOT = 8;
const RIM_HEIGHT = 0.5;
const RIM_AT = 0.022;
const RIM_WIDTH = 0.013;
const TOP_AT = 0.013;
const TOP_WIDTH = 0.014;
const REFRACTION_AT = 0.017;
const REFRACTION_WIDTH = 0.009;
/** The sheen: an ellipse over the upper left, as shares of the cut's width and height. */
const SHEEN = { x: 0.34, y: 0.3, rx: 0.42, ry: 0.2, minRy: 4, turn: -0.45, strength: 0.19 };
/** Where the resin pools and tints the print, as a share of the cut's long side. */
const EDGE_ZONE = 0.08;
const MIN_EDGE_ZONE = 4;

/**
 * Paper a few px in from the cut, on the side facing away from the light: under the dome it's far
 * below white, and the border never holds ink, so it tells a domed seal from a flat one.
 */
const PROBE_DEPTH = { from: 2, to: 6 };
const PROBE_AWAY = 0.5;
const MIN_PROBE_PIXELS = 16;

/** A pixel within this of the modeled paper in every channel is paper, and is lifted all the way. */
export const PAPER_MATCH = 12;
/** A pixel this far from it in any channel is ink, and is left as it is; between, it's lifted in part. */
const INK_MATCH = 40;

function unit(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** The cut a dome sits over: how deep each pixel lies inside it, and the dome's sizes from its bounds. */
interface DomeCut {
  width: number;
  height: number;
  /** Inside the cut, how far each pixel's center lies from its edge; 0 outside. */
  depth: Float32Array;
  foot: number;
  edgeZone: number;
  sheen: { x: number; y: number; rx: number; ry: number };
  rimAt: number;
  rimWidth: number;
  topAt: number;
  topWidth: number;
  refractionAt: number;
  refractionWidth: number;
}

/** The cut whose alpha is `cutAlpha`, on the image's own grid; null with no cut. */
function domeCut(cutAlpha: Uint8Array, width: number, height: number): DomeCut | null {
  const squared = squaredDistanceTo((i) => cutAlpha[i] < INSIDE_ALPHA, width, height);
  const depth = new Float32Array(squared.length);
  for (let i = 0; i < squared.length; i++) depth[i] = Math.sqrt(squared[i]);
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cutAlpha[y * width + x] < INSIDE_ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  if (x1 < 0) return null;
  const cutWidth = x1 - x0 + 1;
  const cutHeight = y1 - y0 + 1;
  const side = Math.max(cutWidth, cutHeight);
  return {
    width,
    height,
    depth,
    foot: Math.max(MIN_DOME_FOOT, DOME_FOOT * side),
    edgeZone: Math.max(MIN_EDGE_ZONE, EDGE_ZONE * side),
    sheen: {
      x: x0 + cutWidth * SHEEN.x,
      y: y0 + cutHeight * SHEEN.y,
      rx: cutWidth * SHEEN.rx,
      ry: Math.max(SHEEN.minRy, cutHeight * SHEEN.ry),
    },
    rimAt: RIM_AT * side,
    rimWidth: RIM_WIDTH * side,
    topAt: TOP_AT * side,
    topWidth: TOP_WIDTH * side,
    refractionAt: REFRACTION_AT * side,
    refractionWidth: REFRACTION_WIDTH * side,
  };
}

const [TURN_COS, TURN_SIN] = [Math.cos(SHEEN.turn), Math.sin(SHEEN.turn)];

/** Where domeAt writes a pixel's dome: its gloss, premultiplied RGBA, then its resin and how it faces. */
const GLOSS_ALPHA = 3;
const RESIN = 4;
const AWAY = 5;
const DOME_VALUES = 6;

/**
 * The dome at pixel `i`, inside the cut and off the image's edge, into `out`: its baked gloss, how
 * much resin pools over its print, from 0 to 1, and how squarely its edge faces away from the light.
 */
function domeAt(cut: DomeCut, i: number, x: number, y: number, out: Float32Array) {
  const { depth, width, foot, edgeZone, sheen } = cut;
  const d = depth[i];
  out[RESIN] = Math.pow(1 - Math.min(d / edgeZone, 1), 1.6);
  const u = Math.min(Math.max(d / foot, 0.02), 1);
  const gx = (depth[i + 1] - depth[i - 1]) / 2;
  const gy = (depth[i + width] - depth[i - width]) / 2;
  const gl = Math.hypot(gx, gy) || 1;
  // Pointing inward.
  const ix = gx / gl;
  const iy = gy / gl;
  const slope = u >= 1 ? 0 : (RIM_HEIGHT * (1 - u)) / Math.sqrt(1 - (1 - u) * (1 - u));
  // The dome leans outward at its rim.
  const normal = unit(-ix * slope, -iy * slope, 1);
  const diffuse = normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2] - LIGHT[2];
  const facing = ix * LIGHT_FLAT_X + iy * LIGHT_FLAT_Y;
  const awayFrom = Math.max(0, facing);
  const toward = Math.max(0, -facing);
  out[AWAY] = awayFrom;
  const rim = Math.pow(awayFrom, 1.3) * Math.exp(-(((d - cut.rimAt) / cut.rimWidth) ** 2)) * 0.62;
  const top = Math.pow(toward, 1.6) * Math.exp(-(((d - cut.topAt) / cut.topWidth) ** 2)) * 0.52;
  const ex = x + 0.5 - sheen.x;
  const ey = y + 0.5 - sheen.y;
  const qx = (ex * TURN_COS - ey * TURN_SIN) / sheen.rx;
  const qy = (ex * TURN_SIN + ey * TURN_COS) / sheen.ry;
  const q2 = qx * qx + qy * qy;
  const sheenLight = q2 < 1 ? SHEEN.strength * Math.pow(1 - q2, 1.5) : 0;
  const lip = Math.pow(1 - u, 9) * 0.12;
  const refraction =
    Math.exp(-(((d - cut.refractionAt) / cut.refractionWidth) ** 2)) *
    (0.07 + 0.11 * awayFrom) *
    (1 - 0.6 * toward);
  const light = Math.min(0.9, rim + top + sheenLight + Math.max(0, diffuse) * 0.06);
  const dark = Math.min(0.3, Math.max(0, -diffuse) * 0.15 + lip + refraction);
  const alpha = Math.min(1, light + dark);
  if (alpha <= 0.004) {
    out.fill(0, 0, RESIN);
    return;
  }
  for (let c = 0; c < 3; c++) out[c] = FULL * light + DOME_INK[c] * dark;
  out[GLOSS_ALPHA] = alpha;
}

/** The dome over a cut, per pixel. */
interface Dome {
  /** The baked gloss, premultiplied, RGBA a pixel. */
  gloss: Float32Array;
  /** How much resin pools over each pixel's print, from 0 to 1. */
  resin: Float32Array;
}

/** The whole dome over `cut`, pixel by pixel. */
function domeOver(cut: DomeCut, cutAlpha: Uint8Array): Dome {
  const { width, height } = cut;
  const n = width * height;
  const gloss = new Float32Array(n * RGBA);
  const resin = new Float32Array(n);
  const at = new Float32Array(DOME_VALUES);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (cutAlpha[i] < INSIDE_ALPHA) continue;
      domeAt(cut, i, x, y, at);
      resin[i] = at[RESIN];
      for (let c = 0; c < RGBA; c++) gloss[i * RGBA + c] = at[c];
    }
  }
  return { gloss, resin };
}

/** The dome's bake of print color `v` in channel `c`, under the gloss at `gloss[q]` and `resin`. */
function baked(gloss: Float32Array, q: number, resin: number, c: number, v: number): number {
  // Resin pools deeper at the edge: the print there multiplies with itself and cools.
  const tinted =
    resin <= 0.002
      ? v
      : v * (1 + (v / FULL - 1) * 0.62 * resin) * (1 + (LAVENDER[c] / FULL - 1) * 0.75 * resin);
  return gloss[q + c] + tinted * (1 - gloss[q + GLOSS_ALPHA]);
}

/** The dome's bake of print color `v`, in channel `c` of pixel `i`. */
const bakedAt = (dome: Dome, i: number, c: number, v: number) =>
  baked(dome.gloss, i * RGBA, dome.resin[i], c, v);

/**
 * A print baked under the dome as sealing baked it, inside the cut: `print` is the ink over white
 * paper. What a sticker sealed before the thin laminate looks like, for tests.
 */
export function bakeDome(print: Pixels, cutAlpha: Uint8Array): Uint8Array {
  const out = Uint8Array.from(print.data);
  const cut = domeCut(cutAlpha, print.width, print.height);
  if (!cut) return out;
  const dome = domeOver(cut, cutAlpha);
  for (let i = 0; i < cutAlpha.length; i++) {
    if (cutAlpha[i] < INSIDE_ALPHA) continue;
    for (let c = 0; c < 3; c++) {
      out[i * RGBA + c] = Math.round(bakedAt(dome, i, c, print.data[i * RGBA + c]));
    }
  }
  return out;
}

/** White paper's color, RGBA, at every pixel of an image `n` pixels big. */
const whitePaper = (n: number) => new Float32Array(n * RGBA).fill(FULL);

/**
 * Whether the paper by the cut, on its side away from the light, is nearer the dome's paper than
 * white. Worked out at those pixels alone, so a sticker sealed flat never pays for the whole dome.
 */
function sealedDomed(sticker: Pixels, cutAlpha: Uint8Array, cut: DomeCut): boolean {
  const { width, height, depth } = cut;
  const at = new Float32Array(DOME_VALUES);
  // The paper's color is kept as the whole dome's paper keeps it, so both judge alike.
  const paper = new Float32Array(1);
  let toDome = 0;
  let toFlat = 0;
  let probed = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (cutAlpha[i] < INSIDE_ALPHA) continue;
      if (depth[i] < PROBE_DEPTH.from || depth[i] > PROBE_DEPTH.to) continue;
      domeAt(cut, i, x, y, at);
      if (at[AWAY] < PROBE_AWAY) continue;
      probed++;
      for (let c = 0; c < 3; c++) {
        paper[0] = baked(at, 0, at[RESIN], c, FULL);
        const seen = sticker.data[i * RGBA + c];
        toDome += Math.abs(seen - paper[0]);
        toFlat += Math.abs(seen - FULL);
      }
    }
  }
  return probed >= MIN_PROBE_PIXELS && toDome < toFlat;
}

/**
 * The paper's color under the dome at each pixel of `sticker`, RGBA, when the paper by its cut is
 * far from white the way the dome made it; null when the sticker was sealed flat.
 */
export function domedPaper(sticker: Pixels, cutAlpha: Uint8Array): Float32Array | null {
  const cut = domeCut(cutAlpha, sticker.width, sticker.height);
  if (!cut || !sealedDomed(sticker, cutAlpha, cut)) return null;
  const dome = domeOver(cut, cutAlpha);
  const paper = whitePaper(cutAlpha.length);
  for (let i = 0; i < cutAlpha.length; i++) {
    if (cutAlpha[i] < INSIDE_ALPHA) continue;
    for (let c = 0; c < 3; c++) paper[i * RGBA + c] = bakedAt(dome, i, c, FULL);
  }
  return paper;
}

/**
 * `pixels` with the paper inside the cut moved from `sealedPaper` to `flatPaper`, both RGBA: a pixel
 * within PAPER_MATCH of the sealed paper moves all the way, one INK_MATCH or more from it stays, so
 * ink and its antialiased edges keep their color. Outside the cut nothing moves.
 */
export function liftPaper(
  pixels: Uint8Array,
  cutAlpha: Uint8Array,
  sealedPaper: ArrayLike<number>,
  flatPaper: ArrayLike<number>,
): Uint8Array {
  const out = Uint8ClampedArray.from(pixels);
  for (let i = 0; i < cutAlpha.length; i++) {
    if (cutAlpha[i] < INSIDE_ALPHA) continue;
    const q = i * RGBA;
    let off = 0;
    for (let c = 0; c < 3; c++) off = Math.max(off, Math.abs(pixels[q + c] - sealedPaper[q + c]));
    if (off >= INK_MATCH) continue;
    const t = Math.min(1, (INK_MATCH - off) / (INK_MATCH - PAPER_MATCH));
    const lift = t * t * (3 - 2 * t) * (cutAlpha[i] / FULL);
    for (let c = 0; c < 3; c++) {
      out[q + c] = pixels[q + c] + lift * (flatPaper[q + c] - sealedPaper[q + c]);
    }
  }
  return new Uint8Array(out.buffer);
}

/** The sticker's pixels with the dome lifted off its paper; null when it was sealed flat. */
export function flattenDomedSeal(sticker: Pixels, cutAlpha: Uint8Array): Uint8Array | null {
  const paper = domedPaper(sticker, cutAlpha);
  return paper && liftPaper(sticker.data, cutAlpha, paper, whitePaper(cutAlpha.length));
}

/** `sticker` with its cut filled by `paper` and no ink: what the veil makes of its paper alone. */
export function paperOnly(sticker: Pixels, cutAlpha: Uint8Array, paper: ArrayLike<number>) {
  const out = Uint8Array.from(sticker.data);
  for (let i = 0; i < cutAlpha.length; i++) {
    if (cutAlpha[i] < INSIDE_ALPHA) continue;
    for (let c = 0; c < 3; c++) out[i * RGBA + c] = Math.round(paper[i * RGBA + c]);
  }
  return out;
}

/** White paper, for `paperOnly`. */
export const flatPaper = whitePaper;
