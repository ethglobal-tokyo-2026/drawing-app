import { describe, expect, it } from "vitest";
import { COAT, coatDarkened, coatedPaperReflectance, coatFresnel } from "./coat";

/** How far a linear color sits from gray: its channels' spread against its peak. */
const saturation = (rgb: number[]) => (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb);

describe("coatFresnel", () => {
  it("reflects ((n − 1)/(n + 1))² square-on, only one polarization at Brewster's angle, and all at grazing", () => {
    const n = COAT.index;
    expect(coatFresnel(1)).toBeCloseTo(((n - 1) / (n + 1)) ** 2, 12);
    // At Brewster's angle the parallel polarization passes whole, leaving half the perpendicular's.
    expect(coatFresnel(1 / Math.hypot(1, n))).toBeCloseTo(((n * n - 1) / (n * n + 1)) ** 2 / 2, 12);
    expect(coatFresnel(0)).toBeCloseTo(1, 12);
  });
});

describe("coatDarkened", () => {
  it("keeps paper white and black ink where they are, and leaves every albedo alone at δ 0", () => {
    expect(coatDarkened(1)).toBeCloseTo(1, 12);
    expect(coatDarkened(0)).toBe(0);
    for (const albedo of [0.05, 0.2, 0.5, 0.8])
      expect(coatDarkened(albedo, 0)).toBeCloseTo(albedo, 12);
  });

  it("deepens mid-gray and saturates a color", () => {
    const gray = coatDarkened(0.5);
    expect(gray).toBeLessThan(0.5);
    expect(gray).toBeGreaterThan(0);
    const color = [0.8, 0.1, 0.3];
    expect(saturation(color.map((c) => coatDarkened(c)))).toBeGreaterThan(saturation(color));
  });
});

describe("coatedPaperReflectance", () => {
  it("returns, over every direction, the darkened paper's share of the light the coat lets in", () => {
    // OpenPBR's albedo for a coated base: the coat's transmission times the base's albedo times Δ.
    const { paperAlbedo, internalReflectance: k } = COAT;
    const darkenedAlbedo = (paperAlbedo * (1 - k)) / (1 - paperAlbedo * k);
    const steps = 4000;
    for (const light of [1, 0.7, 0.3]) {
      let returned = 0;
      for (let i = 0; i < steps; i++) {
        const view = (i + 0.5) / steps;
        returned += (coatedPaperReflectance(light, view) * 2 * view) / steps;
      }
      expect(returned).toBeCloseTo((1 - coatFresnel(light)) * darkenedAlbedo, 5);
    }
  });
});
