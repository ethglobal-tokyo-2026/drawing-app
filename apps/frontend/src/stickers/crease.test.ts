import { describe, expect, it } from "vitest";
import {
  CREASE_SIDES,
  RAMP,
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
    lights: CREASE_SIDES,
  });
  if (!pixels) throw new Error("The supported sticker lost its material geometry");
  return pixels;
}

/** The crease's image lit from one side, or its base or normal. */
const creaseOver = (layers: Float32Array[], image: CreaseImage = "topLeft") =>
  pixelsOver(layers)[image];

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
  for (const side of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) peak = Math.max(peak, pixels[side][(y * width + x) * 4 + 3]);
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

/** Separate painted highlight bands across the middle of the sticker. */
function highlightBands(pixels: ReturnType<typeof pixelsOver>) {
  let bands = 0;
  let previous = false;
  for (let x = 0; x < W; x++) {
    const q = ((H / 2) * W + x) * 4;
    const lit = pixels.topLeft[q] === 255 && pixels.topLeft[q + 3] > 0;
    if (lit && !previous) bands++;
    previous = lit;
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
      lights: CREASE_SIDES,
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
      lights: CREASE_SIDES,
    });
    if (!pixels) throw new Error("The overlap ramp must retain its geometry");
    const center = ((H / 2) * W + W / 2) * 4;
    expect(pixels.normal[center]).toBeGreaterThan(128);
    expect(pixels.normal[center + 1]).toBe(128);
    const plateau = ((H / 2) * W + 15) * 4;
    expect([...pixels.normal.slice(plateau, plateau + 3)]).toEqual([128, 128, 255]);
  });

  it("keeps a flat raised sticker's geometric normal without an unused height image or invented crease", () => {
    const own = field((x) => (x < 90 ? 1 : 0));
    const pixels = creasePixels({
      width: W,
      height: H,
      surface: stackedSurface([everywhere], W, H),
      own,
      scale: 1,
      lights: CREASE_SIDES,
    });
    expect(pixels).not.toBeNull();
    if (!pixels) throw new Error("The raised sticker lost its material geometry");
    const center = ((H / 2) * W + W / 2) * 4;
    expect(Object.keys(pixels).sort()).toEqual([
      "base",
      "bottomLeft",
      "bottomRight",
      "normal",
      "topLeft",
      "topRight",
    ]);
    expect([...pixels.normal.slice(center, center + 4)]).toEqual([128, 128, 255, 255]);
    const twiceAsHigh = creasePixels({
      width: W,
      height: H,
      surface: stackedSurface([everywhere, everywhere], W, H),
      own,
      scale: 1,
      lights: CREASE_SIDES,
    });
    expect(twiceAsHigh).not.toBeNull();
    expect(twiceAsHigh?.normal).toEqual(pixels?.normal);
    for (const image of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const)
      expect(pixels?.[image][center + 3]).toBe(0);
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
      expect(highlightBands(pixels)).toBe(bands);
      for (const x of [32, 32 + spacing]) {
        const q = ((H / 2) * W + x) * 4;
        expect(pixels.topLeft[q + 3]).toBeGreaterThan(0);
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
      lights: CREASE_SIDES,
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
        for (const image of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const)
          expect(pixels[image][q + 3]).toBe(0);
      }
    }
    expect(peakTone(pixels, 80, 100)).toBeGreaterThan(0);
    expect(bends(pixels, 80, 100)).toBe(true);
  });

  it("lights the side of a step that faces the light and shades the far side, and swaps them for the opposite light", () => {
    const [x0, x1, y0, y1] = [40, 80, 20, 40];
    const card = [field((x, y) => (x >= x0 && x < x1 && y >= y0 && y < y1 ? 1 : 0))];
    const reach = RAMP + 2;
    /** The ramps round the card beneath: the left and top ones face the top left. */
    const ramps = (crease: Uint8ClampedArray) => ({
      left: tones(crease, x0 - reach, x0, y0 + 5, y1 - 5),
      right: tones(crease, x1, x1 + reach, y0 + 5, y1 - 5),
      top: tones(crease, x0 + 5, x1 - 5, y0 - reach, y0),
      bottom: tones(crease, x0 + 5, x1 - 5, y1, y1 + reach),
    });
    const atRest = ramps(creaseOver(card, "topLeft"));
    const opposite = ramps(creaseOver(card, "bottomRight"));
    for (const [lit, shaded] of [
      [atRest.left, atRest.right],
      [atRest.top, atRest.bottom],
      [opposite.right, opposite.left],
      [opposite.bottom, opposite.top],
    ]) {
      expect(lit.lit).toBeGreaterThan(lit.shade);
      expect(shaded.shade).toBeGreaterThan(shaded.lit);
    }
  });

  it("keeps a step's shoulder and foot in the base, which shows with the light overhead", () => {
    const step = field((x) => (x < W / 2 ? 1 : 0));
    const ramp = tones(creaseOver([step], "base"), W / 2 - RAMP, W / 2 + 2 * RAMP, 5, H - 5);
    expect(ramp.lit).toBeGreaterThan(0);
    expect(ramp.shade).toBeGreaterThan(0);
  });

  it("leaves what doesn't slope out of each side's image: a ridge's level crest shows only in the base", () => {
    // A strip beneath, one column either side of the middle, so the crest over it is level.
    const middle = W / 2;
    const strip = field((x) => (Math.abs(x - middle) <= 1 ? 1 : 0));
    /** How opaque `image` is on the crest. */
    const onCrest = (image: CreaseImage) =>
      creaseOver([strip], image)[((H / 2) * W + middle) * 4 + 3];
    expect(onCrest("base")).toBeGreaterThan(0);
    for (const side of ["topLeft", "bottomRight", "topRight", "bottomLeft"] as const) {
      expect(onCrest(side)).toBe(0);
    }
  });
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
      lights: CREASE_SIDES,
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
