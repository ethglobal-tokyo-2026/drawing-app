/**
 * A sticker's crease. A sticker is a stiff sheet: it can't follow a sharp step, so beside the edge of
 * a sticker beneath it lifts off and ramps down to the lower level, catching the one light on the side
 * that faces it and falling into shade on the side that doesn't. A sticker shows only the edges
 * directly beneath it: one pressed over others hides theirs. Pure functions over pixel arrays; the
 * crease worker draws the stickers underneath and hands their silhouettes here. Heights are in
 * sticker thicknesses.
 */

/** Toward the one light at the top left, as the baked gloss has it, on screen. */
export const CREASE_LIGHT = unit(-0.5, -0.7);

/** The sides a crease is baked lit from: the one light at rest, its opposite, and the two across. */
export type CreaseSide = "topLeft" | "bottomRight" | "topRight" | "bottomLeft";

/**
 * A crease's images: its rise lit from each side, its base, and geometric normals for the laminate
 * reflection. The base's shoulder and foot show however the light falls.
 */
export type CreaseImage = CreaseSide | "base" | "normal";

/** The illustrative paper and film thickness, in CSS px, used only for geometric normals. */
export const STICKER_THICKNESS = 0.35;

/**
 * Toward each side's light, on screen. The board blends the four by where the one light is, so the
 * crease follows the tilt without being baked again.
 */
export const CREASE_SIDES: Record<CreaseSide, readonly [number, number]> = {
  topLeft: CREASE_LIGHT,
  bottomRight: [-CREASE_LIGHT[0], -CREASE_LIGHT[1]],
  topRight: [-CREASE_LIGHT[1], CREASE_LIGHT[0]],
  bottomLeft: [CREASE_LIGHT[1], -CREASE_LIGHT[0]],
};

/** How far a sticker's ramp reaches beside a step one sticker high, in CSS px. */
export const RAMP = 4;

/** How much the ramp's corners are rounded off, as a blur, in CSS px. */
const ROUND = 1;

/** The spread of the mean height a sticker settles at over what's beneath it, in CSS px. */
const LEVEL = 14;

/**
 * Each part's tone where one sticker's step beneath peaks, the rest shaded in proportion. STRENGTH
 * scales it, then FLOOR takes its share and MOST caps it, so a part shows less than its value here.
 */
const CREASE_TONE = {
  /** The rise that faces the light. */
  lit: 0.42,
  /** The rise that faces away. */
  shade: 0.24,
  /** The shoulder at the top of the rise. */
  shoulder: 0.14,
  /** The foot of the rise. */
  foot: 0.2,
};

/** The ink the shade is drawn in. */
const INK = [28, 24, 36];

/** The most each of a crease's images shows, lit and shaded, however many edges meet there. */
const MOST = { lit: 0.5, shade: 0.3 };

/** Tone each image loses everywhere, after STRENGTH, so the slight dips a pressed sticker never shows vanish. */
const FLOOR = 0.03;

/** How much the crease shows: scales every CREASE_TONE, before FLOOR and MOST apply. */
const STRENGTH = 0.56;

/** Rises as `v` does, easing into `most` rather than piling up where edges cross. */
const ease = (v: number, most: number) => most * (1 - Math.exp(-v / most));

function unit(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/** `light` turned into the frame of a sticker turned `deg` clockwise on screen. */
export function lightIn(deg: number, light = CREASE_LIGHT): [number, number] {
  const t = (-deg * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  return [light[0] * c - light[1] * s, light[0] * s + light[1] * c];
}

/** Rows or columns: how many lines, how long each is, and the index steps along and between them. */
const linesOf = (width: number, height: number, across: boolean) =>
  across ? ([height, width, 1, width] as const) : ([width, height, width, 1] as const);

/** One pass of a box blur `r` wide each way, along rows or columns, from `src` into `dst`. */
function boxPass(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  r: number,
  across: boolean,
) {
  const [lines, length, step, stride] = linesOf(width, height, across);
  const n = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    const base = line * stride;
    let sum = 0;
    // Clamped at the ends, so the edge of the canvas reads as more of the same.
    for (let i = -r; i <= r; i++) sum += src[base + Math.min(length - 1, Math.max(0, i)) * step];
    for (let i = 0; i < length; i++) {
      dst[base + i * step] = sum / n;
      const out = Math.max(0, i - r);
      const into = Math.min(length - 1, i + r + 1);
      sum += src[base + into * step] - src[base + out * step];
    }
  }
}

/** Three box passes each way, in place: close to a Gaussian of spread `sigma`, in pixels. */
function blur(field: Float32Array, width: number, height: number, sigma: number) {
  const r = Math.max(1, Math.round(Math.sqrt(sigma * sigma + 1 / 4) - 1 / 2));
  const tmp = new Float32Array(field.length);
  for (let pass = 0; pass < 3; pass++) {
    boxPass(field, tmp, width, height, r, true);
    boxPass(tmp, field, width, height, r, false);
  }
}

/** A sliding maximum or minimum over a row or column, with the ends clamped. */
function extremumPass(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  r: number,
  across: boolean,
  maximum: boolean,
) {
  const [lines, length, step, stride] = linesOf(width, height, across);
  const queue = new Int32Array(length);
  for (let line = 0; line < lines; line++) {
    const base = line * stride;
    let head = 0;
    let tail = 0;
    let next = 0;
    for (let p = 0; p < length; p++) {
      const end = Math.min(length - 1, p + r);
      for (; next <= end; next++) {
        const value = src[base + next * step];
        while (tail > head) {
          const last = src[base + queue[tail - 1] * step];
          if (maximum ? last > value : last < value) break;
          tail--;
        }
        queue[tail++] = next;
      }
      const start = Math.max(0, p - r);
      while (queue[head] < start) head++;
      dst[base + p * step] = src[base + queue[head] * step];
    }
  }
}

/** Close valleys narrower than the ramp at their support height, without lowering a real step. */
function bridgeGaps(field: Float32Array, width: number, height: number, scale: number) {
  const r = Math.max(1, Math.round((RAMP * scale) / 2));
  const tmp = new Float32Array(field.length);
  extremumPass(field, tmp, width, height, r, true, true);
  extremumPass(tmp, field, width, height, r, false, true);
  extremumPass(field, tmp, width, height, r, true, false);
  extremumPass(tmp, field, width, height, r, false, false);
}

/** The lower envelope's scratch, grown to the longest line yet. */
let envelope = { v: new Int32Array(1), z: new Float64Array(2), f: new Float64Array(1) };

/**
 * Along each row or column, in place: the least of field[q] + k·(p − q)² over every q, by the lower
 * envelope of those parabolas (Felzenszwalb and Huttenlocher), in time linear in the line. `sign` −1
 * takes the greatest of field[q] − k·(p − q)² instead.
 */
function envelopePass(
  field: Float32Array,
  width: number,
  height: number,
  k: number,
  sign: 1 | -1,
  across: boolean,
) {
  const [lines, length, step, stride] = linesOf(width, height, across);
  if (envelope.v.length < length) {
    envelope = {
      v: new Int32Array(length),
      z: new Float64Array(length + 1),
      f: new Float64Array(length),
    };
  }
  const { v, z, f } = envelope;
  /** Where the parabolas from q and r cross. */
  const cross = (q: number, r: number) =>
    (f[q] + k * q * q - (f[r] + k * r * r)) / (2 * k * (q - r));
  for (let line = 0; line < lines; line++) {
    const base = line * stride;
    for (let i = 0; i < length; i++) f[i] = sign * field[base + i * step];
    let j = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < length; q++) {
      let s = cross(q, v[j]);
      while (s <= z[j]) s = cross(q, v[--j]);
      v[++j] = q;
      z[j] = s;
      z[j + 1] = Infinity;
    }
    j = 0;
    for (let p = 0; p < length; p++) {
      while (z[j + 1] < p) j++;
      const d = p - v[j];
      field[base + p * step] = sign * (k * d * d + f[v[j]]);
    }
  }
}

/**
 * A stiff sheet laid over `field`: narrow gaps are bridged level with their supports, then a
 * closing by a parabola ramps down over RAMP beside a step and rounds the corners.
 */
export function drape(
  field: Float32Array,
  width: number,
  height: number,
  scale: number,
): Float32Array {
  const out = Float32Array.from(field);
  bridgeGaps(out, width, height, scale);
  const reach = RAMP * scale;
  // The parabola falls one sticker's thickness over the ramp.
  const k = 1 / (reach * reach);
  envelopePass(out, width, height, k, -1, true);
  envelopePass(out, width, height, k, -1, false);
  envelopePass(out, width, height, k, 1, true);
  envelopePass(out, width, height, k, 1, false);
  blur(out, width, height, ROUND * scale);
  return out;
}

/**
 * The surface under a sticker, from the silhouettes beneath it, bottom to top, each 0 to 1. Each
 * sticker's top settles at its thickness over the mean height inside its own silhouette. The
 * coverage-normalized mean keeps nearby stickers from lifting it unless they actually overlap.
 */
export function stackedSurface(
  layers: readonly Float32Array[],
  width: number,
  height: number,
  scale: number,
): Float32Array {
  const surface = new Float32Array(width * height);
  layers.forEach((layer, n) => {
    if (n === 0) {
      surface.set(layer);
      return;
    }
    const level = new Float32Array(surface.length);
    for (let i = 0; i < surface.length; i++) level[i] = surface[i] * layer[i];
    const coverage = Float32Array.from(layer);
    blur(level, width, height, LEVEL * scale);
    blur(coverage, width, height, LEVEL * scale);
    for (let i = 0; i < surface.length; i++) {
      const m = layer[i];
      if (m > 0) surface[i] += m * (1 + level[i] / coverage[i] - surface[i]);
    }
  });
  return surface;
}

/**
 * A draped step one sticker high: its steepest slope, and its sharpest bend, where it's rolled over
 * the step's top edge; the foot's bend is spread down the ramp, so it shades softly.
 */
interface StepResponse {
  slope: number;
  bend: number;
}

const stepResponses = new Map<number, StepResponse>();

/** The response to one sticker's step just beneath, at `scale`, so that step reads at full tone. */
function stepResponse(scale: number): StepResponse {
  const known = stepResponses.get(scale);
  if (known) return known;
  const half = Math.ceil((RAMP + 4 * ROUND) * scale) + 2;
  const width = 2 * half + 1;
  // A few rows, every one the same: the step runs down the columns.
  const step = new Float32Array(width * 3);
  for (let y = 0; y < 3; y++) step.fill(1, y * width, y * width + half);
  const field = drape(step, width, 3, scale);
  const response = { slope: 0, bend: 0 };
  for (let i = width + 1; i < 2 * width - 1; i++) {
    response.slope = Math.max(response.slope, Math.abs(field[i + 1] - field[i - 1]) / 2);
    response.bend = Math.max(response.bend, Math.abs(field[i + 1] + field[i - 1] - 2 * field[i]));
  }
  stepResponses.set(scale, response);
  return response;
}

export interface CreaseInput {
  width: number;
  height: number;
  /** The surface under this sticker (stackedSurface). */
  surface: Float32Array;
  /** This sticker's own silhouette, 0 to 1: the crease shows only on it. */
  own: Float32Array;
  /** Pixels per CSS px. */
  scale: number;
  /** Toward each side's light, in this sticker's frame (lightIn of CREASE_SIDES). */
  lights: Record<CreaseSide, readonly [number, number]>;
}

/**
 * The crease's images, as RGBA, not premultiplied: white where the laminate catches the light, ink
 * where it falls into shade. Normal RGB describes the raw draped surface independently of the cut.
 */
export type CreasePixels = Record<CreaseImage, Uint8ClampedArray<ArrayBuffer>>;

const SIDES = [
  "topLeft",
  "bottomRight",
  "topRight",
  "bottomLeft",
] as const satisfies readonly CreaseSide[];

/** The crease and geometric normals over `surface`, or null when nothing rises. */
export function creasePixels({
  width,
  height,
  surface,
  own,
  scale,
  lights,
}: CreaseInput): CreasePixels | null {
  const field = drape(surface, width, height, scale);
  const unitStep = stepResponse(scale);
  const image = () => new Uint8ClampedArray(width * height * 4);
  const base = image();
  const normal = image();
  const bakes = SIDES.map((side) => ({ light: lights[side], out: image() }));
  let any = false;
  /** Shades pixel `q` of `out` by `tone`, lit above zero and shaded below. */
  const shade = (out: Uint8ClampedArray, q: number, tone: number) => {
    const net = Math.sign(tone) * Math.max(0, Math.abs(tone) - FLOOR);
    if (Math.abs(net) < 0.004) return;
    any = true;
    if (net > 0) {
      out[q] = out[q + 1] = out[q + 2] = 255;
      out[q + 3] = ease(net, MOST.lit) * 255;
    } else {
      out[q] = INK[0];
      out[q + 1] = INK[1];
      out[q + 2] = INK[2];
      out[q + 3] = ease(-net, MOST.shade) * 255;
    }
  };
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = own[i];
      // Differentiate the floating-point drape before cut coverage and visual crease tone.
      const dx = ((field[i + 1] - field[i - 1]) * scale * STICKER_THICKNESS) / 2;
      const dy = ((field[i + width] - field[i - width]) * scale * STICKER_THICKNESS) / 2;
      const length = Math.hypot(dx, dy, 1);
      const q = i * 4;
      normal[q] = Math.round(128 - (127 * dx) / length);
      normal[q + 1] = Math.round(128 - (127 * dy) / length);
      normal[q + 2] = Math.round(128 + 127 / length);
      normal[q + 3] = 255;
      if (o <= 0.004) continue;
      const h = field[i];
      // A flat raised plane still supplies normal data without inventing a visible crease.
      if (h > 0.004 && Math.round((h / (h + 1)) * o * 255) > 0) any = true;
      const gx = (field[i + 1] - field[i - 1]) / 2 / unitStep.slope;
      const gy = (field[i + width] - field[i - width]) / 2 / unitStep.slope;
      const bend =
        (field[i + 1] + field[i - 1] + field[i + width] + field[i - width] - 4 * h) / unitStep.bend;
      const ridge =
        Math.max(0, -bend) * CREASE_TONE.shoulder - Math.max(0, bend) * CREASE_TONE.foot;
      shade(base, q, ridge * o * STRENGTH);
      for (const { light, out } of bakes) {
        // Rising toward the light's far side faces the light.
        const facing = -(gx * light[0] + gy * light[1]);
        const rise =
          Math.max(0, facing) * CREASE_TONE.lit - Math.max(0, -facing) * CREASE_TONE.shade;
        shade(out, q, rise * o * STRENGTH);
      }
    }
  }
  if (!any) return null;
  const [topLeft, bottomRight, topRight, bottomLeft] = bakes.map(({ out }) => out);
  // The outer sampling row stays a flat plane rather than an uninitialized curved edge.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const q = (y * width + x) * 4;
      normal.set([128, 128, 255, 255], q);
    }
  return { base, normal, topLeft, bottomRight, topRight, bottomLeft };
}
