import { describe, expect, it } from "vitest";
import { createFoilSourceSamples, createFoilLookup } from "./foilMaterial";
const palette = [
  [1, 0.2, 0.5],
  [1, 0.8, 0.2],
  [0.2, 0.8, 1],
  [0.3, 0.8, 0.9],
  [0.4, 0.6, 1],
  [0.7, 0.5, 1],
] as const;
describe("foil material", () => {
  it("builds deterministic directional response with weaker tails and finite output", () => {
    const a = createFoilLookup("holo", palette);
    const row = Math.floor(a.height / 4);
    const alpha = (u: number) =>
      a.pixels[(row * a.width + Math.round(((u + 2) / 4) * (a.width - 1))) * 4 + 3];
    expect(alpha(0.4)).toBeGreaterThan(alpha(1.8));
    expect(alpha(-0.4)).toBeCloseTo(alpha(0.4), 0);
  });
});

it("integrates the source feather and solid angle without adding edge energy", () => {
  const samples = createFoilSourceSamples(0.02, -0.025, 0.1, 0.145, 4, []);
  let actual = 0;
  for (let i = 3; i < samples.length; i += 4) actual += samples[i];
  let dense = 0;
  const n = 300;
  const smooth = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = ((2 * (x + 0.5)) / n - 1) * 0.115,
        py = ((2 * (y + 0.5)) / n - 1) * 0.16;
      dense +=
        ((1 - smooth(0.085, 0.115, Math.abs(px))) *
          (1 - smooth(0.13, 0.16, Math.abs(py))) *
          4 *
          0.115 *
          0.16) /
        n ** 2 /
        (1 + (px + 0.02) ** 2 + (py - 0.025) ** 2) ** 1.5;
    }
  expect(actual / dense).toBeCloseTo(1, 5);
});
