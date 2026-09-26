import { describe, expect, it } from "vitest";
import { hexToRgb } from "../canvas/color";
import {
  MIN_STARTING_CONTRAST,
  MIN_STARTING_DISTANCE,
  STARTING_COLORS,
  startingColor,
  SWATCHES,
} from "./palette";

/** A 0–255 sRGB channel as linear light. */
const linear = (c: number) => {
  const u = c / 255;
  return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
};

/** The WCAG contrast ratio of a color with white. */
function contrastWithWhite(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linear);
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/** A color in OKLab: lightness, then green–red and blue–yellow. */
function oklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function distance(a: string, b: string): number {
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe("the starting colors", () => {
  it("each show as a thin line on the white sheet", () => {
    for (const hex of STARTING_COLORS)
      expect(contrastWithWhite(hex), hex).toBeGreaterThanOrEqual(MIN_STARTING_CONTRAST);
  });

  it("are far enough apart that no two look alike", () => {
    for (const [i, a] of STARTING_COLORS.entries())
      for (const b of STARTING_COLORS.slice(i + 1))
        expect(distance(a, b), `${a} and ${b}`).toBeGreaterThanOrEqual(MIN_STARTING_DISTANCE);
  });

  it("are all swatches, so the color sheet shows the one in hand as picked", () => {
    const swatches: readonly string[] = SWATCHES.map((s) => s.hex);
    for (const hex of STARTING_COLORS) expect(swatches, hex).toContain(hex);
  });
});

describe("startingColor", () => {
  it("picks with the random it's given", () => {
    expect(startingColor([], () => 0)).toBe(STARTING_COLORS[0]);
    expect(startingColor([], () => 0.999)).toBe(STARTING_COLORS.at(-1));
  });

  it("never starts in the last drawing's starting color or the color in hand", () => {
    const [started, inHand] = STARTING_COLORS;
    expect(startingColor([started, inHand], () => 0)).toBe(STARTING_COLORS[2]);
    for (let i = 0; i < STARTING_COLORS.length; i++) {
      const picked = startingColor([started, inHand], () => i / STARTING_COLORS.length);
      expect([started, inHand]).not.toContain(picked);
    }
  });
});
