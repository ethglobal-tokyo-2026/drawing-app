import { describe, expect, it } from "vitest";
import {
  CREASE_SIDES,
  RAMP,
  TRANSMIT,
  creasePixels,
  drape,
  stackedSurface,
  type CreaseSide,
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

/**
 * The crease of an unturned sticker covering the whole field over `layers`, at one pixel per CSS px,
 * lit from `side`: the one light at rest unless another is named.
 */
function creaseOver(layers: Float32Array[], side: CreaseSide = "topLeft") {
  const pixels = creasePixels({
    width: W,
    height: H,
    surface: stackedSurface(layers, W, H, 1),
    own: everywhere,
    scale: 1,
    lights: CREASE_SIDES,
  });
  if (!pixels) throw new Error("No crease over a step");
  return pixels[side];
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

  it("shows an edge one sticker deeper at about TRANSMIT of one just beneath", () => {
    const peak = (crease: Uint8ClampedArray) => {
      let most = 0;
      for (let q = 3; q < crease.length; q += 4) most = Math.max(most, crease[q]);
      return most;
    };
    const step = field((x) => (x < W / 2 ? 1 : 0));
    const direct = peak(creaseOver([step]));
    const deeper = peak(creaseOver([step, everywhere]));
    expect(deeper).toBeGreaterThan(0);
    expect(deeper).toBeLessThan(direct * (TRANSMIT + 0.15));
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
});
