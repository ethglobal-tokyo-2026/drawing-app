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

/** A W×H field of `value(x, y)`. */
const field = (value: (x: number, y: number) => number) => {
  const f = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = value(x, y);
  return f;
};
const everywhere = field(() => 1);

/** The finished crease images over separate supports, including the laminate's normal. */
function pixelsOver(layers: Float32Array[], scale = 1) {
  const pixels = creasePixels({
    width: W,
    height: H,
    surface: stackedSurface(layers, W, H, scale),
    own: everywhere,
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
function peakTone(pixels: ReturnType<typeof pixelsOver>, x0 = 0, x1 = W) {
  let peak = 0;
  for (const side of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const)
    for (let y = 1; y < H - 1; y++)
      for (let x = x0; x < x1; x++) peak = Math.max(peak, pixels[side][(y * W + x) * 4 + 3]);
  return peak;
}

/** Whether any laminate pixel bends away from a flat plane over a column interval. */
function bends(pixels: ReturnType<typeof pixelsOver>, x0 = 0, x1 = W) {
  for (let y = 1; y < H - 1; y++)
    for (let x = x0; x < x1; x++) {
      const q = (y * W + x) * 4;
      if (pixels.normal[q] !== 128 || pixels.normal[q + 1] !== 128 || pixels.normal[q + 2] !== 255)
        return true;
    }
  return false;
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
      surface: stackedSurface([everywhere], W, H, 1),
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
      surface: stackedSurface([everywhere, everywhere], W, H, 1),
      own,
      scale: 1,
      lights: CREASE_SIDES,
    });
    expect(twiceAsHigh).not.toBeNull();
    expect(twiceAsHigh?.normal).toEqual(pixels?.normal);
    for (const image of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const)
      expect(pixels?.[image][center + 3]).toBe(0);
  });

  it("bridges a gap narrower than the ramp between stickers beneath, and dips into a wide one", () => {
    /** How far the draped surface falls in the middle of a gap `gap` px wide in a plateau. */
    const dipAcross = (gap: number) => {
      const left = Math.round((W - gap) / 2);
      const plateau = field((x) => (x >= left && x < left + gap ? 0 : 1));
      return 1 - drape(plateau, W, H, 1)[(H / 2) * W + Math.round(left + gap / 2)];
    };
    expect(dipAcross(RAMP / 2)).toBeLessThan(0.15);
    expect(dipAcross(RAMP * 4)).toBeGreaterThan(0.9);
  });

  it.each([false, true])(
    "keeps touching supports flat in either stacking order (reverse %s)",
    (reverse) => {
      const supports = [field((x) => Number(x < 60)), field((x) => Number(x >= 60))];
      if (reverse) supports.reverse();
      const surface = stackedSurface(supports, W, H, 1);
      expect(Math.min(...surface)).toBe(1);
      expect(Math.max(...surface)).toBe(1);
      const pixels = pixelsOver(supports);
      expect(peakTone(pixels)).toBe(0);
      expect(bends(pixels)).toBe(false);
    },
  );

  it.each([1, 0.5])(
    "bridges narrow gaps in both crease shading and laminate geometry at scale %s",
    (scale) => {
      for (const gap of [1, 2, 4]) {
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

  it("bridges a narrow diagonal gap between separate supports", () => {
    const pixels = pixelsOver([
      field((x, y) => Number(x + y < 88)),
      field((x, y) => Number(x + y >= 91)),
    ]);
    expect(peakTone(pixels)).toBe(0);
    expect(bends(pixels)).toBe(false);
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
    const pixels = pixelsOver([field((x) => Number(x < 52)), field((x) => Number(x >= 68))]);
    expect(peakTone(pixels, 44, 60)).toBeGreaterThan(0);
    expect(peakTone(pixels, 60, 76)).toBeGreaterThan(0);
    expect(bends(pixels, 44, 60)).toBe(true);
    expect(bends(pixels, 60, 76)).toBe(true);
  });

  it("keeps a small supported sticker a full layer higher with a real crease at its edge", () => {
    const small = field((x, y) => Number(x >= 55 && x < 65 && y >= 25 && y < 35));
    const surface = stackedSurface([everywhere, small], W, H, 1);
    expect(surface[30 * W + 60]).toBe(2);
    expect(surface[30 * W + 40]).toBe(1);
    const pixels = pixelsOver([everywhere, small]);
    expect(peakTone(pixels)).toBeGreaterThan(0);
    expect(bends(pixels)).toBe(true);
  });

  it("shows an edge directly beneath, and none of an edge buried under another sticker", () => {
    /** The crease's most opaque pixel, lit from every side; 0 when it shows nothing. */
    const peak = (layers: Float32Array[]) => {
      const pixels = creasePixels({
        width: W,
        height: H,
        surface: stackedSurface(layers, W, H, 1),
        own: everywhere,
        scale: 1,
        lights: CREASE_SIDES,
      });
      let most = 0;
      for (const image of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"] as const) {
        const crease = pixels?.[image];
        if (!crease) continue;
        for (let q = 3; q < crease.length; q += 4) most = Math.max(most, crease[q]);
      }
      return most;
    };
    const step = field((x) => (x < W / 2 ? 1 : 0));
    expect(peak([step])).toBeGreaterThan(0);
    expect(peak([step, everywhere])).toBe(0);
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
