import { describe, expect, it } from "vitest";
import {
  HEIGHT_LEVELS,
  NORMAL_RANGE_LEVELS,
  NORMAL_SLOPE,
  RAMP,
  SELF_SHADOW_REACH,
  STICKER_THICKNESS,
  creaseHeight,
  creasePixels,
  drape,
  stackedSurface,
  type CreaseImage,
} from "./crease";

const W = 120;
const H = 60;

/** A field of `value(x, y)`, using the usual test dimensions unless another size is needed. */
const field = (value: (x: number, y: number) => number, width = W, height = H) => {
  const f = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) f[y * width + x] = value(x, y);
  return f;
};
const everywhere = field(() => 1);

/** The finished crease images over separate supports, including the laminate's normal. */
function pixelsOver(layers: Float32Array[], scale = 1, width = W, height = H) {
  const pixels = creasePixels({
    width,
    height,
    surface: stackedSurface(layers, width, height),
    own: width === W && height === H ? everywhere : new Float32Array(width * height).fill(1),
    scale,
  });
  if (!pixels) throw new Error("The supported sticker lost its material geometry");
  return pixels;
}

/** One of the crease's images: its base or its normal. */
const creaseOver = (layers: Float32Array[], image: CreaseImage) => pixelsOver(layers)[image];

/** The strongest painted highlight or shadow over a column interval. */
function peakTone(
  pixels: ReturnType<typeof pixelsOver>,
  x0 = 0,
  x1 = W,
  y0 = 1,
  y1 = H - 1,
  width = W,
) {
  let peak = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) peak = Math.max(peak, pixels.base[(y * width + x) * 4 + 3]);
  return peak;
}

/** Whether any laminate pixel bends away from a flat plane over a column interval. */
function bends(
  pixels: ReturnType<typeof pixelsOver>,
  x0 = 0,
  x1 = W,
  y0 = 1,
  y1 = H - 1,
  width = W,
) {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const q = (y * width + x) * 4;
      if (pixels.normal[q] !== 128 || pixels.normal[q + 1] !== 128 || pixels.normal[q + 2] !== 255)
        return true;
    }
  return false;
}

/** Separate ramps rising rightward across the middle of the sticker, from the normal. */
function risingRamps(pixels: ReturnType<typeof pixelsOver>) {
  let bands = 0;
  let previous = false;
  for (let x = 0; x < W; x++) {
    const rising = pixels.normal[((H / 2) * W + x) * 4] < 128;
    if (rising && !previous) bands++;
    previous = rising;
  }
  return bands;
}

/** The crease's lit (white) and shaded (ink) alpha, summed over a box. */
function tones(crease: Uint8ClampedArray, x0: number, x1: number, y0: number, y1: number) {
  let lit = 0;
  let shade = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const q = (y * W + x) * 4;
      if (crease[q] === 255) lit += crease[q + 3];
      else shade += crease[q + 3];
    }
  }
  return { lit, shade };
}

describe("crease", () => {
  it("keeps a raised plane's normal flat and does not turn cut alpha into curvature", () => {
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: everywhere,
      own: field((x) => (x < 90 ? 1 : 0.25)),
      scale: 1,
    });
    if (!pixels) throw new Error("The raised plane must retain its geometry");
    const center = ((H / 2) * W + W / 2) * 4;
    expect([...pixels.normal.slice(center, center + 3)]).toEqual([128, 128, 255]);
    const edge = ((H / 2) * W + 100) * 4;
    expect([...pixels.normal.slice(edge, edge + 3)]).toEqual([128, 128, 255]);
  });

  it("bends the laminate normal only over the draped overlap ramp", () => {
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: field((x) => (x < W / 2 ? 1 : 0)),
      own: everywhere,
      scale: 1,
    });
    if (!pixels) throw new Error("The overlap ramp must retain its geometry");
    const center = ((H / 2) * W + W / 2) * 4;
    expect(pixels.normal[center]).toBeGreaterThan(128);
    expect(pixels.normal[center + 1]).toBe(128);
    const plateau = ((H / 2) * W + 15) * 4;
    expect([...pixels.normal.slice(plateau, plateau + 3)]).toEqual([128, 128, 255]);
  });

  it("keeps a flat raised sticker's geometric normal and height flat, without an invented crease", () => {
    const own = field((x) => (x < 90 ? 1 : 0));
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: stackedSurface([everywhere], W, H),
      own,
      scale: 1,
    });
    expect(pixels).not.toBeNull();
    if (!pixels) throw new Error("The raised sticker lost its material geometry");
    const center = ((H / 2) * W + W / 2) * 4;
    expect(new Set(pixels.height.filter((_, i) => i % 4 === 0))).toEqual(new Set([0]));
    expect([...pixels.normal.slice(center, center + 4)]).toEqual([128, 128, 255, 255]);
    const twiceAsHigh = creasePixels({
      width: W,
      height: H,
      surface: stackedSurface([everywhere, everywhere], W, H),
      own,
      scale: 1,
    });
    expect(twiceAsHigh).not.toBeNull();
    expect(twiceAsHigh?.normal).toEqual(pixels?.normal);
    expect(pixels?.base[center + 3]).toBe(0);
  });

  it("keeps the drape's height in an opaque image of its own, within a level, flat on each tread", () => {
    // Stairs two stickers high: each tread is flat, and each riser a sharp step.
    const stairs = field((x) => (x < 40 ? 2 : x < 80 ? 1 : 0));
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: stairs,
      own: everywhere,
      scale: 1,
    });
    if (!pixels) throw new Error("The stairs raised no crease");
    const heightAt = (x: number, y = H / 2) => creaseHeight(pixels.height[(y * W + x) * 4]);
    const surface = drape(stairs, W, H, 1);
    for (let x = 0; x < W; x++)
      expect(Math.abs(heightAt(x) - surface[(H / 2) * W + x]), `at ${x}`).toBeLessThanOrEqual(
        0.5 / HEIGHT_LEVELS,
      );
    for (const [x, tread] of [
      [20, 2],
      [60, 1],
      [100, 0],
    ])
      expect(heightAt(x)).toBe(tread);
    expect(heightAt(30, 5)).toBe(heightAt(10, H - 5));
    expect(new Set(pixels.height.filter((_, i) => i % 4 === 3))).toEqual(new Set([255]));
  });

  it("marks where something higher within the self-shadow's reach could shade the paper", () => {
    const step = field((x) => (x < 40 ? 1 : 0));
    const pixels = pixelsOver([step]);
    const marked = (x: number) => pixels.height[((H / 2) * W + x) * 4 + 1] === 255;
    // The step's top and the far paper have nothing higher in reach; the drape and the paper past
    // its foot, within reach of the shoulder, do.
    expect(marked(20)).toBe(false);
    expect(marked(45)).toBe(true);
    expect(marked(Math.floor(39 + SELF_SHADOW_REACH))).toBe(true);
    expect(marked(Math.ceil(39 + RAMP + SELF_SHADOW_REACH) + 1)).toBe(false);
  });

  it("bridges nearby supports and dips into a clearly separated gap", () => {
    /** How far the draped surface falls in the middle of a gap `gap` px wide in a plateau. */
    const dipAcross = (gap: number) => {
      const left = Math.round((W - gap) / 2);
      const plateau = field((x) => (x >= left && x < left + gap ? 0 : 1));
      return 1 - drape(plateau, W, H, 1)[(H / 2) * W + Math.round(left + gap / 2)];
    };
    expect(dipAcross(RAMP / 2)).toBeLessThan(0.15);
    expect(dipAcross(48)).toBeGreaterThan(0.9);
  });

  it.each([false, true])(
    "keeps touching supports flat in either stacking order (reverse %s)",
    (reverse) => {
      const supports = [field((x) => Number(x < 60)), field((x) => Number(x >= 60))];
      if (reverse) supports.reverse();
      const surface = stackedSurface(supports, W, H);
      expect(Math.min(...surface)).toBe(1);
      expect(Math.max(...surface)).toBe(1);
      const pixels = pixelsOver(supports);
      expect(peakTone(pixels)).toBe(0);
      expect(bends(pixels)).toBe(false);
    },
  );

  it.each([1, 0.5])(
    "bridges nearby gaps in both crease shading and laminate geometry at scale %s",
    (scale) => {
      for (const gap of [1, 2, 4, 8, 12, 16, 24, 32]) {
        const left = 60 - Math.floor((gap * scale) / 2);
        const right = left + Math.round(gap * scale);
        const supports = [field((x) => Number(x < left)), field((x) => Number(x >= right))];
        for (const layers of [supports, [...supports].reverse()]) {
          const pixels = pixelsOver(layers, scale);
          expect(peakTone(pixels), `gap ${gap}`).toBe(0);
          expect(bends(pixels), `gap ${gap}`).toBe(false);
        }
      }
    },
  );

  it.each([0, 17, 45, 81])(
    "bridges nearby supports at the same distance when turned %s degrees",
    (angle) => {
      const side = 160;
      const raised = field(() => 1, side, side);
      const radians = (angle * Math.PI) / 180;
      const distance = (x: number, y: number, scale: number) =>
        ((x - side / 2) * Math.cos(radians) + (y - side / 2) * Math.sin(radians)) / scale;
      for (const scale of [1, 0.5])
        for (const gap of [8, 12, 16, 24, 32]) {
          const supports = [
            field((x, y) => Number(distance(x, y, scale) < -gap / 2), side, side),
            field((x, y) => Number(distance(x, y, scale) >= gap / 2), side, side),
          ];
          for (const below of [[], [raised]])
            for (const neighbors of [supports, [...supports].reverse()]) {
              const pixels = pixelsOver([...below, ...neighbors], scale, side, side);
              expect(peakTone(pixels, 56, 104, 56, 104, side), `gap ${gap}, scale ${scale}`).toBe(
                0,
              );
              expect(bends(pixels, 56, 104, 56, 104, side), `gap ${gap}, scale ${scale}`).toBe(
                false,
              );
            }
        }
    },
  );

  it.each([0, 17, 45, 81])("keeps separated supports visible when turned %s degrees", (angle) => {
    const side = 160;
    const radians = (angle * Math.PI) / 180;
    const distance = (x: number, y: number) =>
      (x - side / 2) * Math.cos(radians) + (y - side / 2) * Math.sin(radians);
    const pixels = pixelsOver(
      [
        field((x, y) => Number(distance(x, y) < -20), side, side),
        field((x, y) => Number(distance(x, y) >= 20), side, side),
      ],
      1,
      side,
      side,
    );
    expect(peakTone(pixels, 56, 104, 56, 104, side)).toBeGreaterThan(0);
    expect(bends(pixels, 56, 104, 56, 104, side)).toBe(true);
  });

  it("does not turn antialiased touching edges into a crease", () => {
    const left = field((x) => Math.max(0, Math.min(1, (61 - x) / 2)));
    const right = Float32Array.from(left, (value) => 1 - value);
    for (const supports of [
      [left, right],
      [right, left],
    ]) {
      const pixels = pixelsOver(supports);
      expect(peakTone(pixels)).toBe(0);
      expect(bends(pixels)).toBe(false);
    }
  });

  it("leaves a wide gap's two edges visible in both shading and reflection", () => {
    const pixels = pixelsOver([field((x) => Number(x < 36)), field((x) => Number(x >= 84))]);
    expect(peakTone(pixels, 24, 54)).toBeGreaterThan(0);
    expect(peakTone(pixels, 66, 98)).toBeGreaterThan(0);
    expect(bends(pixels, 24, 54)).toBe(true);
    expect(bends(pixels, 66, 98)).toBe(true);
  });

  it.each([
    [12, 1],
    [48, 2],
  ])(
    "joins nearby ascending steps and keeps distant steps separate (spacing %s)",
    (spacing, bands) => {
      const pixels = pixelsOver([
        everywhere,
        field((x) => Number(x >= 32)),
        field((x) => Number(x >= 32 + spacing)),
      ]);
      expect(risingRamps(pixels)).toBe(bands);
      for (const x of [32, 32 + spacing]) {
        const q = ((H / 2) * W + x) * 4;
        expect(pixels.normal[q]).toBeLessThan(128);
      }
      const middle = 32 + spacing / 2;
      expect(bends(pixels, middle, middle + 1)).toBe(spacing === 12);
    },
  );

  it("bridges unequal supports at the lower height and keeps only the taller step", () => {
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: field((x) => (x < 48 ? 1 : x < 72 ? 0 : 2)),
      own: everywhere,
      scale: 1,
    });
    if (!pixels) throw new Error("The taller support lost its material geometry");
    expect(peakTone(pixels, 36, 50)).toBe(0);
    expect(bends(pixels, 36, 50)).toBe(false);
    expect(peakTone(pixels, 60, 90)).toBeGreaterThan(0);
    expect(bends(pixels, 60, 90)).toBe(true);
  });

  it.each([false, true])(
    "preserves an exposed edge next to the sampling boundary (reverse %s)",
    (reverse) => {
      const pixels = pixelsOver([field((x) => Number(reverse ? x >= 6 : x < W - 6))]);
      expect(peakTone(pixels)).toBeGreaterThan(0);
      expect(bends(pixels)).toBe(true);
    },
  );

  it.each([1, 2, 4])(
    "keeps the same drape beside a sampling boundary for a step %s high",
    (height) => {
      for (const reverse of [false, true]) {
        const support = (x: number) => ((reverse ? x >= 6 : x < W - 6) ? height : 0);
        const actual = drape(field(support), W, H, 1);
        const padding = 120;
        const referenceWidth = W + 2 * padding;
        const reference = drape(
          field((x) => support(Math.max(0, Math.min(W - 1, x - padding))), referenceWidth, H),
          referenceWidth,
          H,
          1,
        );
        for (let x = 0; x < W; x++)
          expect(actual[(H / 2) * W + x]).toBeCloseTo(
            reference[(H / 2) * referenceWidth + padding + x],
            5,
          );
      }
    },
  );

  it("keeps a small supported sticker a full layer higher with a real crease at its edge", () => {
    const small = field((x, y) => Number(x >= 55 && x < 65 && y >= 25 && y < 35));
    const surface = stackedSurface([everywhere, small], W, H);
    expect(surface[30 * W + 60]).toBe(2);
    expect(surface[30 * W + 40]).toBe(1);
    const pixels = pixelsOver([everywhere, small]);
    expect(peakTone(pixels)).toBeGreaterThan(0);
    expect(bends(pixels)).toBe(true);
  });

  it("shows an edge directly beneath, and none of an edge buried under another sticker", () => {
    const step = field((x) => Number(x < W / 2));
    const exposed = pixelsOver([step]);
    expect(peakTone(exposed)).toBeGreaterThan(0);
    expect(bends(exposed)).toBe(true);
    const covered = pixelsOver([step, everywhere]);
    expect(peakTone(covered)).toBe(0);
    expect(bends(covered)).toBe(false);
  });

  it("keeps lightly overlapping neighboring supports level while their outer edge still creases", () => {
    const supports = [field((x) => Number(x < 66)), field((x) => Number(x >= 54 && x < 114))];
    for (const below of [[], [everywhere]])
      for (const neighbors of [supports, [...supports].reverse()]) {
        const pixels = pixelsOver([...below, ...neighbors]);
        expect(peakTone(pixels, 42, 78)).toBe(0);
        expect(bends(pixels, 42, 78)).toBe(false);
        expect(peakTone(pixels, 102, 118)).toBeGreaterThan(0);
        expect(bends(pixels, 102, 118)).toBe(true);
      }
  });

  it("keeps a finite covering sticker flat inside while its exposed edge still creases", () => {
    const step = field((x) => Number(x < 60));
    const cover = field((x, y) => Number(x >= 30 && x < 90 && y >= 10 && y < 50));
    const surface = stackedSurface([step, cover], W, H);
    expect(surface[30 * W + 45]).toBe(1.5);
    expect(surface[30 * W + 75]).toBe(1.5);
    const pixels = pixelsOver([step, cover]);
    for (let y = 20; y < 40; y++) {
      for (let x = 42; x < 78; x++) {
        const q = (y * W + x) * 4;
        expect([...pixels.normal.slice(q, q + 3)]).toEqual([128, 128, 255]);
        expect(pixels.base[q + 3]).toBe(0);
      }
    }
    expect(peakTone(pixels, 80, 100)).toBeGreaterThan(0);
    expect(bends(pixels, 80, 100)).toBe(true);
  });

  it.each([1, 3])(
    "packs a draped step %s stickers high so its slope decodes within a level, one sticker's spanning nearly every level",
    (high) => {
      const step = field((x) => (x < W / 2 ? high : 0));
      const surface = drape(step, W, H, 1);
      const { normal } = pixelsOver([step]);
      const y = H / 2;
      let steepest = 0;
      for (let x = 2; x < W - 2; x++) {
        const i = y * W + x;
        const slope = ((surface[i + 1] - surface[i - 1]) / 2) * STICKER_THICKNESS;
        // The shader's decoding: R in NORMAL_SLOPEs, times B's range.
        const range = 1 + (255 - normal[i * 4 + 2]) / NORMAL_RANGE_LEVELS;
        const decoded = (-(normal[i * 4] - 128) / 127) * range * NORMAL_SLOPE;
        expect(Math.abs(decoded - slope)).toBeLessThanOrEqual((range * NORMAL_SLOPE) / 127);
        steepest = Math.max(steepest, Math.abs(normal[i * 4] - 128));
      }
      if (high === 1) expect(steepest).toBeGreaterThan(120);
    },
  );

  it("keeps a step's shoulder and foot in the base, which shows with the light overhead", () => {
    const step = field((x) => (x < W / 2 ? 1 : 0));
    const reach = Math.ceil(RAMP);
    const ramp = tones(creaseOver([step], "base"), W / 2 - reach, W / 2 + 2 * reach, 5, H - 5);
    expect(ramp.lit).toBeGreaterThan(0);
    expect(ramp.shade).toBeGreaterThan(0);
  });
});

describe("the drape's profile", () => {
  const LONG = 200;
  /** The draped profile across a row of stairs, `levels[n]` high from `edges[n − 1]` px on. */
  const profileOver = (levels: number[], edges: number[], scale: number) => {
    const stairs = field((x) => levels[edges.filter((edge) => x >= edge).length], LONG, 5);
    return [...drape(stairs, LONG, 5, scale).slice(2 * LONG, 3 * LONG)];
  };
  /** The slope down the profile at each pixel, by central differences, in thicknesses per pixel. */
  const slopesOf = (profile: number[]) =>
    profile.map((_, x) => (profile[Math.max(0, x - 1)] - profile[Math.min(LONG - 1, x + 1)]) / 2);

  it("bounds the encoded height's bilinear slopes, including diagonal creases", () => {
    for (const angle of [0, 17, 45]) {
      const radians = (angle * Math.PI) / 180;
      const pixels = pixelsOver([
        field((x, y) =>
          Number((x - W / 2) * Math.cos(radians) + (y - H / 2) * Math.sin(radians) < 0),
        ),
      ]);
      const at = (x: number, y: number) =>
        creaseHeight(pixels.height[(y * W + x) * 4]) * STICKER_THICKNESS;
      expect(Number.isFinite(pixels.maxSlope)).toBe(true);
      for (let y = 0; y < H - 1; y++)
        for (let x = 0; x < W - 1; x++) {
          const a = at(x, y),
            b = at(x + 1, y),
            c = at(x, y + 1),
            d = at(x + 1, y + 1);
          for (const u of [0, 0.5, 1])
            for (const v of [0, 0.5, 1]) {
              const dx = ((b - a) * (1 - v) + (d - c) * v) * W;
              const dy = ((c - a) * (1 - u) + (d - b) * u) * H;
              expect(Math.hypot(dx, dy), `angle ${angle} at ${x},${y}`).toBeLessThanOrEqual(
                pixels.maxSlope + 1e-6,
              );
            }
        }
    }
  });

  it("keeps a cliff's drape independent of a distant intermediate support", () => {
    const height = 90;
    const alone = drape(
      field((x) => (x < 60 ? 2 : 0), LONG, height),
      LONG,
      height,
      1,
    );
    const beside = drape(
      field((x, y) => (x < 60 ? 2 : x >= 150 && x < 170 && y > 20 && y < 70 ? 1 : 0), LONG, height),
      LONG,
      height,
      1,
    );
    for (let y = 0; y < height; y++)
      for (let x = 40; x < 95; x++)
        expect(beside[y * LONG + x], `at ${x},${y}`).toBeCloseTo(alone[y * LONG + x], 6);
  });

  it("moves continuously as an intermediate support approaches a cliff", () => {
    const height = 5;
    const supportAt = (edge: number) =>
      field((x) => (x < 60 ? 2 : Math.max(0, Math.min(1, x + 1 - edge))), LONG, height);
    let previous = drape(supportAt(110), LONG, height, 1);
    for (let edge = 109.75; edge >= 65; edge -= 0.25) {
      const next = drape(supportAt(edge), LONG, height, 1);
      for (let x = 45; x < 100; x++)
        expect(
          Math.abs(next[2 * LONG + x] - previous[2 * LONG + x]),
          `edge ${edge}, x ${x}`,
        ).toBeLessThanOrEqual(0.25 + 1e-6);
      previous = next;
    }
  });

  it("keeps a changing tread monotone through oblique and concave corners", () => {
    const height = 90;
    const ends = [
      (y: number) => y / 2,
      (y: number) => Math.abs(y - height / 2),
      (y: number) => (y < height / 2 ? 20 : 0),
      (y: number) => 6 + 15 * Math.sin(y / 12),
    ];
    for (const end of ends) {
      const surface = drape(
        field((x, y) => (x < 60 ? 2 : x < 60 + end(y) ? 1 : 0), LONG, height),
        LONG,
        height,
        1,
      );
      for (let y = 0; y < height; y++)
        for (let x = 1; x < LONG; x++)
          expect(surface[y * LONG + x], `at ${x},${y}`).toBeLessThanOrEqual(
            surface[y * LONG + x - 1] + 1e-6,
          );
    }
  });

  it.each([
    [1, 1],
    [1, 2],
    [0.75, 1],
    [0.5, 1],
  ])(
    "at scale %s, drapes a step %s high flat at the shoulder, steepest at 1.5·height/run mid-run",
    (scale, high) => {
      // The shoulder is the step's last pixel; a pixel past the foot, the paper lies flat.
      const shoulder = 59;
      const run = RAMP * scale * Math.sqrt(high);
      const slopes = slopesOf(profileOver([high, 0], [shoulder + 1], scale));
      const peak = (1.5 * high) / run;
      expect(slopes[shoulder]).toBeLessThan(0.25 * peak);
      expect(slopes[Math.ceil(shoulder + run) + 1]).toBeLessThan(0.25 * peak);
      expect(Math.abs(Math.max(...slopes) / peak - 1)).toBeLessThan(0.1);
      const steepest = slopes.indexOf(Math.max(...slopes));
      expect(Math.abs(steepest - (shoulder + run / 2))).toBeLessThanOrEqual(1);
    },
  );

  it.each([1, 0.5])(
    "at scale %s, bends the shoulder convex and the foot concave, equally",
    (scale) => {
      const corner = 59;
      const run = RAMP * scale;
      const slopes = slopesOf(profileOver([1, 0], [corner + 1], scale));
      /** The slope at `x`, between pixels too. */
      const slopeAt = (x: number) =>
        slopes[Math.floor(x)] + (x % 1) * (slopes[Math.floor(x) + 1] - slopes[Math.floor(x)]);
      // Each third's bend is its change of slope from the flat beside it: the shoulder's steepens,
      // the foot's eases off.
      const shoulder = slopeAt(corner + run / 3) - slopes[corner - 1];
      const foot = slopeAt(corner + (2 * run) / 3) - slopes[Math.ceil(corner + run) + 1];
      expect(shoulder).toBeGreaterThan(0);
      expect(foot).toBeGreaterThan(0);
      expect(Math.abs(shoulder / foot - 1)).toBeLessThan(0.15);
    },
  );

  it.each([1, 0.5])(
    "at scale %s, keeps two stacked steps monotonic, within their supports, and resting on a wide tread",
    (scale) => {
      const run = RAMP * scale;
      for (let spacing = 0; spacing <= 48; spacing += 2) {
        const tread = spacing * scale;
        const profile = profileOver([2, 1, 0], [60, 60 + tread], scale);
        for (let x = 1; x < LONG; x++)
          expect(profile[x], `spacing ${spacing} at ${x}`).toBeLessThanOrEqual(
            profile[x - 1] + 1e-6,
          );
        expect(Math.max(...profile)).toBeLessThanOrEqual(2 + 1e-6);
        expect(Math.min(...profile)).toBeGreaterThanOrEqual(-1e-6);
        if (tread > 2 * run + 2)
          expect(profile[Math.round(60 + tread - 1)], `spacing ${spacing}`).toBeCloseTo(1, 3);
      }
    },
  );
});

describe("registered crease support", () => {
  it("averages accepted support planes only in the source frame", () => {
    const lower = field((x) => (x < 30 ? 1 : 0));
    const upper = field(() => 1);
    const surface = stackedSurface([lower, upper], W, H, { x: 0, y: 0, width: 60, height: H });
    expect(surface[W - 1]).toBe(1.5);
  });

  it("retains a normal-only bend within requested geometry when paint has no coverage", () => {
    const pixels = creasePixels({
      width: W,
      height: H,
      scale: 1,
      own: field(() => 0),
      surface: field((x) => (x < 60 ? 1 : 0)),
      normalRegion: { x: 45, y: 10, width: 30, height: 40 },
    });
    expect(pixels).not.toBeNull();
    if (!pixels) throw new Error("The outside bend lost its normal");
    expect(bends(pixels, 45, 75, 10, 50)).toBe(true);
    expect(peakTone(pixels)).toBe(0);
  });

  it("keeps real later supports outside the source without changing accepted source levels", () => {
    const lower = field((x) => (x < 30 || x >= 80 ? 1 : 0));
    const outside = field((x) => (x >= 80 ? 1 : 0));
    const accepted = field((x) => (x < 60 ? 1 : 0));
    const bounds = { x: 0, y: 0, width: 60, height: H };
    const extended = stackedSurface([lower, outside, accepted], W, H, bounds);
    expect(extended[100]).toBe(2);
    expect(extended[10]).toBe(1.5);
    const withoutOutside = stackedSurface([lower, accepted], W, H, bounds);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < 60; x++) expect(extended[y * W + x]).toBe(withoutOutside[y * W + x]);
  });
});
