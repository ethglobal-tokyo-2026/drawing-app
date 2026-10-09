/**
 * A sticker's crease. A sticker is a stiff sheet: it can't follow a sharp step, so beside the edge of
 * a sticker beneath it lifts off and ramps down to the lower level, catching the one light on the side
 * that faces it and falling into shade on the side that doesn't. Each sticker in a stack softens and
 * fades the shapes under it, so an edge deep in the stack shows fainter than one just beneath. Pure
 * functions over pixel arrays; the crease worker draws the stickers underneath and hands their
 * silhouettes here. Heights are in sticker thicknesses.
 */

/** Toward the one light at the top left, as the baked gloss has it, on screen. */
export const CREASE_LIGHT = unit(-0.5, -0.7);

/** How far a sticker's ramp reaches beside a step one sticker high, in CSS px. */
export const RAMP = 4;

/** How much the ramp's corners are rounded off, as a blur, in CSS px. */
const ROUND = 1;

/** The spread of the mean height a sticker settles at over what's beneath it, in CSS px. */
const LEVEL = 14;

/**
 * How much of the shape beneath a sticker passes on to its top surface; the adhesive and vinyl soak
 * up the rest.
 */
export const TRANSMIT = 0.4;

/** How strongly each part of the crease shows, at its peak; the rest is shaded in proportion. */
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

/** The most a crease shows, lit and shaded, however many edges meet there. */
const MOST = { lit: 0.5, shade: 0.3 };

/** Tone a crease loses everywhere, so the slight dips a pressed sticker never shows vanish. */
const FLOOR = 0.03;

/** Scales every tone: how much the crease shows. */
const STRENGTH = 1;
/** How opaque the shine's mask is at its peak. */
const SHINE = 0.6;

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
 * A stiff sheet laid over `field`: a closing by a parabola, so beside a step one sticker high it
 * ramps down over RAMP, and a gap much narrower than that is bridged, then rounded at the corners.
 */
export function drape(
  field: Float32Array,
  width: number,
  height: number,
  scale: number,
): Float32Array {
  const out = Float32Array.from(field);
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
 * sticker's top settles at its thickness over the mean height beneath it, and passes on only TRANSMIT
 * of the draped shape around that mean, so an edge buried in the stack shows fainter and softer than
 * one just beneath, and keeping the mean adds no false step at a sticker's own edge.
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
    const level = Float32Array.from(surface);
    blur(level, width, height, LEVEL * scale);
    const draped = drape(surface, width, height, scale);
    for (let i = 0; i < surface.length; i++) {
      const m = layer[i];
      if (m <= 0) continue;
      const inside = 1 + level[i] + TRANSMIT * (draped[i] - level[i]);
      surface[i] += m * (inside - surface[i]);
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
  /** Toward the light, in this sticker's frame (lightIn). */
  light: readonly [number, number];
}

export interface CreasePixels {
  /** RGBA, not premultiplied: white where the laminate catches the light, ink where it falls into shade. */
  crease: Uint8ClampedArray<ArrayBuffer>;
  /** The lit side's mask, white, where the live resin's highlights catch the crease. */
  shine: Uint8ClampedArray<ArrayBuffer>;
}

/** The crease of the sticker laid over `surface`, or null when nothing underneath shows a step. */
export function creasePixels({
  width,
  height,
  surface,
  own,
  scale,
  light,
}: CreaseInput): CreasePixels | null {
  const field = drape(surface, width, height, scale);
  const unitStep = stepResponse(scale);
  const [lx, ly] = light;
  const out = new Uint8ClampedArray(width * height * 4);
  const shine = new Uint8ClampedArray(width * height * 4);
  let any = false;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = own[i];
      if (o <= 0.004) continue;
      const h = field[i];
      const gx = (field[i + 1] - field[i - 1]) / 2 / unitStep.slope;
      const gy = (field[i + width] - field[i - width]) / 2 / unitStep.slope;
      const bend =
        (field[i + 1] + field[i - 1] + field[i + width] + field[i - width] - 4 * h) / unitStep.bend;
      // Rising toward the light's far side faces the light.
      const facing = -(gx * lx + gy * ly);
      const lit = Math.max(0, facing) * CREASE_TONE.lit + Math.max(0, -bend) * CREASE_TONE.shoulder;
      const dark = Math.max(0, -facing) * CREASE_TONE.shade + Math.max(0, bend) * CREASE_TONE.foot;
      const raw = (lit - dark) * o * STRENGTH;
      const net = Math.sign(raw) * Math.max(0, Math.abs(raw) - FLOOR);
      const glint = Math.max(0, lit * o * STRENGTH - FLOOR);
      if (Math.abs(net) < 0.004 && glint < 0.004) continue;
      any = true;
      const q = i * 4;
      if (glint > 0) {
        shine[q] = shine[q + 1] = shine[q + 2] = 255;
        shine[q + 3] = Math.min(1, glint / CREASE_TONE.lit) * SHINE * 255;
      }
      if (net > 0) {
        out[q] = out[q + 1] = out[q + 2] = 255;
        out[q + 3] = ease(net, MOST.lit) * 255;
      } else if (net < 0) {
        out[q] = INK[0];
        out[q + 1] = INK[1];
        out[q + 2] = INK[2];
        out[q + 3] = ease(-net, MOST.shade) * 255;
      }
    }
  }
  return any ? { crease: out, shine } : null;
}
