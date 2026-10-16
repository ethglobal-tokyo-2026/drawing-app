/**
 * A sticker's crease. A sticker is a stiff sheet: it can't follow a sharp step, so beside the edge of
 * a sticker beneath it lifts off and ramps down to the lower level. The sticker shader shades its
 * slopes by the room's light; the bake adds the shoulder and foot. A sticker shows only the edges
 * directly beneath it: one pressed over others hides theirs. Pure functions over pixel arrays; the
 * crease worker draws the stickers underneath and hands their silhouettes here. Heights are in
 * sticker thicknesses.
 */

/**
 * A crease's images: its base, the shoulder and foot, which no light moves; geometric normals, which
 * the sticker shader lights and reflects; and the steps' height, whose contact shadows it casts.
 */
export type CreaseImage = "base" | "normal" | "height";

/** A rectangle in the raster or normalized source frame, as its caller specifies. */
export interface CreaseBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The illustrative paper and film thickness, in CSS px, used only for geometric normals. */
export const STICKER_THICKNESS = 0.35;

/** How far a sticker's ramp reaches beside a step one sticker high, in CSS px. */
export const RAMP = 12;

/** Height changes below a quarter of a sticker do not bend or shade its laminate. */
const MIN_CREASE_HEIGHT = 0.25;

/** How much the ramp's corners are rounded off, as a blur, in CSS px. */
const ROUND = 1;

/** The neighborhood of one ramp, including its rounded ends, in CSS px. */
const ROUNDED_REACH = RAMP + 4 * ROUND;

/** Include rotated antialiased boundary cells in the circular bridge footprint, in pixels. */
const bridgeRadiusAt = (scale: number) => ROUNDED_REACH * scale + 1;

/**
 * Each part's tone where one sticker's step beneath peaks, the rest shaded in proportion. STRENGTH
 * scales it, then FLOOR takes its share and MOST caps it, so a part shows less than its value here.
 */
const CREASE_TONE = {
  /** The shoulder at the top of the ramp. */
  shoulder: 0.14,
  /** The foot of the ramp. */
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

/** The radius of each box pass for a Gaussian spread, in pixels. */
const boxRadius = (sigma: number) =>
  Math.max(1, Math.round(Math.sqrt(sigma * sigma + 1 / 4) - 1 / 2));

/** Three box passes each way, in place: close to a Gaussian of spread `sigma`, in pixels. */
function blur(field: Float32Array, width: number, height: number, sigma: number) {
  const r = boxRadius(sigma);
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

/** A circular maximum or minimum; equal horizontal chords share their sliding-extremum pass. */
function diskPass(
  src: Float32Array,
  dst: Float32Array,
  row: Float32Array,
  width: number,
  height: number,
  radius: number,
  maximum: boolean,
) {
  dst.fill(maximum ? -Infinity : Infinity);
  let previous = -1;
  for (let dy = 0; dy <= Math.floor(radius); dy++) {
    const rx = Math.floor(Math.sqrt(radius * radius - dy * dy));
    if (rx !== previous) {
      extremumPass(src, row, width, height, rx, true, maximum);
      previous = rx;
    }
    for (let y = 0; y < height; y++) {
      const above = Math.max(0, y - dy) * width;
      const below = Math.min(height - 1, y + dy) * width;
      const base = y * width;
      for (let x = 0; x < width; x++) {
        const value = maximum
          ? Math.max(row[above + x], row[below + x])
          : Math.min(row[above + x], row[below + x]);
        const i = base + x;
        dst[i] = maximum ? Math.max(dst[i], value) : Math.min(dst[i], value);
      }
    }
  }
}

/** Bridge neighboring supports at the lower height, with the same reach in every direction. */
function bridgeGaps(field: Float32Array, width: number, height: number, scale: number) {
  const radius = bridgeRadiusAt(scale);
  const row = new Float32Array(field.length);
  const closed = new Float32Array(field.length);
  diskPass(field, closed, row, width, height, radius, true);
  diskPass(closed, field, row, width, height, radius, false);
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

/** The height-minimum neighborhood used by normals, in pixels. */
export const creaseNormalReach = (scale: number) => Math.max(1, Math.ceil(ROUNDED_REACH * scale));

/** Full drape dependency reach, including both closings and the rounded ends, in pixels. */
export function drapeReach(scale: number, heightRange: number): number {
  return Math.ceil(
    2 * bridgeRadiusAt(scale) +
      2 * RAMP * scale * Math.sqrt(heightRange) +
      3 * boxRadius(ROUND * scale),
  );
}

/** The `width`×`height` middle of a field padded by `padding` on every side, into `into`. */
function cropInto(
  padded: Float32Array,
  paddedWidth: number,
  padding: number,
  width: number,
  height: number,
  into: Float32Array,
) {
  for (let y = 0; y < height; y++) {
    const start = (y + padding) * paddedWidth + padding;
    into.set(padded.subarray(start, start + width), y * width);
  }
}

/**
 * A stiff sheet laid over `field`: narrow gaps are bridged level with their supports, then a
 * closing by a parabola ramps down over RAMP beside a step and rounds the corners. `steps`, when
 * given, receives the bridged supports before the ramp: the sheet's steps, sharp at their edges.
 */
export function drape(
  field: Float32Array,
  width: number,
  height: number,
  scale: number,
  steps?: Float32Array,
): Float32Array {
  let lowest = Infinity;
  let highest = -Infinity;
  for (const value of field) {
    lowest = Math.min(lowest, value);
    highest = Math.max(highest, value);
  }
  if (highest <= lowest) {
    steps?.set(field);
    return Float32Array.from(field);
  }
  const reach = RAMP * scale;
  // Each closing samples twice; keep its full reach and the blur's footprint beyond the crop.
  const padding = drapeReach(scale, highest - lowest);
  const extendedWidth = width + 2 * padding;
  const extendedHeight = height + 2 * padding;
  const out = new Float32Array(extendedWidth * extendedHeight);
  // Continue the original surface, rather than clamping an intermediate dilation at the image edge.
  for (let y = 0; y < extendedHeight; y++) {
    const source = Math.max(0, Math.min(height - 1, y - padding)) * width;
    const start = y * extendedWidth;
    out.fill(field[source], start, start + padding);
    out.set(field.subarray(source, source + width), start + padding);
    out.fill(field[source + width - 1], start + padding + width, start + extendedWidth);
  }
  bridgeGaps(out, extendedWidth, extendedHeight, scale);
  if (steps) cropInto(out, extendedWidth, padding, width, height, steps);
  // The parabola falls one sticker's thickness over the ramp.
  const k = 1 / (reach * reach);
  envelopePass(out, extendedWidth, extendedHeight, k, -1, true);
  envelopePass(out, extendedWidth, extendedHeight, k, -1, false);
  envelopePass(out, extendedWidth, extendedHeight, k, 1, true);
  envelopePass(out, extendedWidth, extendedHeight, k, 1, false);
  blur(out, extendedWidth, extendedHeight, ROUND * scale);
  const crop = new Float32Array(width * height);
  cropInto(out, extendedWidth, padding, width, height, crop);
  return crop;
}

/**
 * The surface under a sticker, from the silhouettes beneath it, bottom to top, each 0 to 1. Each
 * sticker's top is one flat plane at its thickness over the mean height inside its silhouette.
 * A covered edge cannot bend that plane; nearby stickers lift it only where they actually overlap.
 */
export function stackedSurface(
  layers: readonly Float32Array[],
  width: number,
  height: number,
  supportBounds?: CreaseBounds,
): Float32Array {
  const surface = new Float32Array(width * height);
  layers.forEach((layer, n) => {
    if (n === 0) {
      surface.set(layer);
      return;
    }
    let support = 0;
    let coverage = 0;
    for (let i = 0; i < surface.length; i++) {
      if (supportBounds) {
        const x = i % width,
          y = Math.floor(i / width);
        if (
          x < supportBounds.x ||
          x >= supportBounds.x + supportBounds.width ||
          y < supportBounds.y ||
          y >= supportBounds.y + supportBounds.height
        )
          continue;
      }
      support += surface[i] * layer[i];
      coverage += layer[i];
    }
    // A support wholly outside the source has no accepted source-plane level. Estimate it by
    // the same mean-support rule over its real extended coverage; accepted levels stay unchanged.
    if (coverage === 0 && supportBounds) {
      for (let i = 0; i < surface.length; i++) {
        support += surface[i] * layer[i];
        coverage += layer[i];
      }
    }
    // Overlapping boxes can still have disjoint silhouettes in this sticker's frame.
    if (coverage === 0) return;
    const level = 1 + support / coverage;
    for (let i = 0; i < surface.length; i++) {
      const m = layer[i];
      if (m > 0) surface[i] += m * (level - surface[i]);
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
  const half = Math.ceil(ROUNDED_REACH * scale) + 2;
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

/**
 * The surface slope R and G hold at their extremes: one sticker's steepest step at full scale, so a
 * crease's slope spans every level and the shader's shading has no visible steps.
 */
export const NORMAL_SLOPE = stepResponse(1).slope * STICKER_THICKNESS;

/** How many NORMAL_SLOPEs a slope may reach, where steps stack, before it clips. */
const NORMAL_RANGE = 6;

/** B's levels per NORMAL_SLOPE of range beyond the first. */
export const NORMAL_RANGE_LEVELS = 255 / (NORMAL_RANGE - 1);

/**
 * Packs the surface's slope (height per CSS px, rightward and downward) at byte `q`. R and G hold the
 * normal's sideways part in NORMAL_SLOPEs divided by B's range, which grows only where steps stack, so
 * every channel stays continuous under the GPU's filtering. Flat is 128, 128, 255.
 */
function encodeNormal(out: Uint8ClampedArray, q: number, dx: number, dy: number) {
  const sx = dx / NORMAL_SLOPE;
  const sy = dy / NORMAL_SLOPE;
  const steepest = Math.min(NORMAL_RANGE, Math.max(1, Math.abs(sx), Math.abs(sy)));
  const b = Math.round(255 - (steepest - 1) * NORMAL_RANGE_LEVELS);
  const range = 1 + (255 - b) / NORMAL_RANGE_LEVELS;
  out[q] = Math.round(128 - (127 * sx) / range);
  out[q + 1] = Math.round(128 - (127 * sy) / range);
  out[q + 2] = b;
  out[q + 3] = 255;
}

/**
 * The height image's gray levels per sticker thickness, 0 at the lowest support. It is an opaque image
 * of its own: a canvas premultiplies alpha, which would move the normal's colors.
 */
export const HEIGHT_LEVELS = 16;

/** A height above the lowest support, in sticker thicknesses, from its gray level; the shader decodes alike. */
export const creaseHeight = (level: number) => level / HEIGHT_LEVELS;

export interface CreaseInput {
  width: number;
  height: number;
  /** The surface under this sticker (stackedSurface). */
  surface: Float32Array;
  /** This sticker's own silhouette, 0 to 1: the crease shows only on it. */
  own: Float32Array;
  /** Pixels per CSS px. */
  scale: number;
  /** Expanded geometry can retain a bend independently of painted coverage. */
  normalRegion?: CreaseBounds;
}

/**
 * The crease's images, as RGBA, not premultiplied: the base white on the shoulder and ink at the foot.
 * Normal RGB describes the raw draped surface independently of the cut, as encodeNormal packs it, and
 * the height the steps beneath, as creaseHeight reads it.
 */
export type CreasePixels = Record<CreaseImage, Uint8ClampedArray<ArrayBuffer>>;

/** The crease and geometric normals over `surface`, or null when nothing rises. */
export function creasePixels({
  width,
  height,
  surface,
  own,
  scale,
  normalRegion,
}: CreaseInput): CreasePixels | null {
  const steps = new Float32Array(width * height);
  const field = drape(surface, width, height, scale, steps);
  // Include both plateaus of a complete ramp, with its rounded ends, when measuring its height.
  const reach = creaseNormalReach(scale);
  const scratch = new Float32Array(field.length);
  const highest = new Float32Array(field.length);
  const lowest = new Float32Array(field.length);
  extremumPass(field, scratch, width, height, reach, true, true);
  extremumPass(scratch, highest, width, height, reach, false, true);
  extremumPass(field, scratch, width, height, reach, true, false);
  extremumPass(scratch, lowest, width, height, reach, false, false);
  const unitStep = stepResponse(scale);
  const image = () => new Uint8ClampedArray(width * height * 4);
  const base = image();
  const normal = image();
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
      const bends = highest[i] - lowest[i] >= MIN_CREASE_HEIGHT;
      // Paint and reflection share the height minimum; cut coverage cannot create curvature.
      const dx = bends ? ((field[i + 1] - field[i - 1]) * scale * STICKER_THICKNESS) / 2 : 0;
      const dy = bends
        ? ((field[i + width] - field[i - width]) * scale * STICKER_THICKNESS) / 2
        : 0;
      const q = i * 4;
      encodeNormal(normal, q, dx, dy);
      if (
        normalRegion &&
        x >= normalRegion.x &&
        x < normalRegion.x + normalRegion.width &&
        y >= normalRegion.y &&
        y < normalRegion.y + normalRegion.height &&
        (normal[q] !== 128 || normal[q + 1] !== 128)
      )
        any = true;
      if (o <= 0.004) continue;
      const h = field[i];
      // A flat raised plane still supplies normal data without inventing a visible crease.
      if (h > 0.004 && Math.round((h / (h + 1)) * o * 255) > 0) any = true;
      if (!bends) continue;
      const bend =
        (field[i + 1] + field[i - 1] + field[i + width] + field[i - width] - 4 * h) / unitStep.bend;
      const ridge =
        Math.max(0, -bend) * CREASE_TONE.shoulder - Math.max(0, bend) * CREASE_TONE.foot;
      shade(base, q, ridge * o * STRENGTH);
    }
  }
  if (!any) return null;
  // The outer sampling row stays a flat plane rather than an uninitialized curved edge.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const q = (y * width + x) * 4;
      normal.set([128, 128, 255, 255], q);
    }
  let lowestStep = Infinity;
  for (const level of steps) lowestStep = Math.min(lowestStep, level);
  const heights = image();
  for (let i = 0; i < steps.length; i++) {
    heights.fill(Math.round((steps[i] - lowestStep) * HEIGHT_LEVELS), i * 4, i * 4 + 3);
    heights[i * 4 + 3] = 255;
  }
  return { base, normal, height: heights };
}
