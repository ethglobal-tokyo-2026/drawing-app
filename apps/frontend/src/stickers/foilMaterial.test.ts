import { describe, expect, it } from "vitest";
import { createFoilDiscSamples, createFoilLookup, discProfile } from "./foilMaterial";
import { ROOM } from "./sharedRoom";
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

it("samples the ceiling light's solid angle and spread as its blurred ellipse covers them", () => {
  const disc = ROOM.light;
  const samples = createFoilDiscSamples(disc);
  const sampled = { solidAngle: 0, across: 0, down: 0 };
  for (let i = 0; i < samples.length; i += 4) {
    const [x, y, z, w] = samples.subarray(i, i + 4);
    sampled.solidAngle += w;
    sampled.across += w * (x / z) ** 2;
    sampled.down += w * (y / z) ** 2;
  }
  // A plain grid over the plane, independent of the rings: dω = dA / (1 + x² + y²)^(3/2).
  const dense = { solidAngle: 0, across: 0, down: 0 };
  const n = 400,
    reach = disc.radius + 12 * disc.feather,
    cell = ((2 * reach) / n) ** 2;
  for (let row = 0; row < n; row++)
    for (let column = 0; column < n; column++) {
      const x = ((2 * (column + 0.5)) / n - 1) * reach,
        y = ((2 * (row + 0.5)) / n - 1) * reach;
      const w =
        (discProfile(Math.hypot(x, y / disc.aspect), disc) * cell) / (1 + x * x + y * y) ** 1.5;
      dense.solidAngle += w;
      dense.across += w * x * x;
      dense.down += w * y * y;
    }
  expect(sampled.solidAngle / dense.solidAngle).toBeCloseTo(1, 3);
  expect(sampled.across / dense.across).toBeCloseTo(1, 2);
  expect(sampled.down / dense.down).toBeCloseTo(1, 2);
});
