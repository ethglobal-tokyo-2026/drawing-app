import { describe, expect, it } from "vitest";
import { highlightCompress, highlightCompressKeepingHue, TONE } from "./tone";

const peakOf = (rgb: readonly number[]) => Math.max(...rgb);
/** A color's hue angle, from its opponent channels; graying a color leaves it where it is. */
const hue = ([r, g, b]: readonly number[]) => Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b);
const saturation = (rgb: readonly number[]) => (peakOf(rgb) - Math.min(...rgb)) / peakOf(rgb);

describe("highlightCompress", () => {
  it("leaves colors up to its start alone and rolls brighter ones toward white, in order, never reaching it", () => {
    const below = [0.6, 0.5, 0.2] as const;
    expect(highlightCompress(below)).toEqual(below);
    expect(peakOf(highlightCompress([TONE.start + 1e-6, 0, 0]))).toBeCloseTo(TONE.start, 5);
    let previous: number = TONE.start;
    for (const peak of [0.9, 1, 1.5, 4, 100]) {
      const shown = peakOf(highlightCompress([peak, peak, peak]));
      expect(shown).toBeGreaterThan(previous);
      expect(shown).toBeLessThan(1);
      previous = shown;
    }
  });

  it("keeps a highlight's hue, and washes the brightest toward white", () => {
    const color = [1, 0.3, 0.1];
    let previous = saturation(color);
    for (const scale of [1.2, 2, 4, 8]) {
      const shown = highlightCompress([color[0] * scale, color[1] * scale, color[2] * scale]);
      expect(hue(shown)).toBeCloseTo(hue(color), 9);
      // Well past rounding: scaling alone keeps a color's saturation exactly.
      expect(saturation(shown)).toBeLessThan(previous - 1e-6);
      previous = saturation(shown);
    }
  });
});

describe("highlightCompressKeepingHue", () => {
  it("rolls the peak off as highlightCompress does, keeping the color's hue and saturation", () => {
    const color = [1, 0.3, 0.1];
    for (const scale of [0.5, 1.2, 2, 4, 8]) {
      const lit = [color[0] * scale, color[1] * scale, color[2] * scale] as const;
      const shown = highlightCompressKeepingHue(lit);
      expect(peakOf(shown)).toBeCloseTo(peakOf(highlightCompress(lit)), 12);
      expect(hue(shown)).toBeCloseTo(hue(color), 9);
      expect(saturation(shown)).toBeCloseTo(saturation(color), 12);
    }
  });
});
