import { describe, expect, it } from "vitest";
import { createFoilSourceSamples, createFoilLookup, FOIL_ROOM } from "./foilMaterial";
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
  const samples = createFoilSourceSamples({ ...FOIL_ROOM, grid: 4, lamps: [] });
  let actual = 0;
  for (let i = 3; i < samples.length; i += 4) actual += samples[i];
  let dense = 0;
  const n = 300;
  const smooth = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const { x: cx, y: cy, halfWidth, halfHeight, feather } = FOIL_ROOM.window;
  const hx = halfWidth + feather,
    hy = halfHeight + feather;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = ((2 * (x + 0.5)) / n - 1) * hx,
        py = ((2 * (y + 0.5)) / n - 1) * hy;
      dense +=
        ((1 - smooth(halfWidth - feather, hx, Math.abs(px))) *
          (1 - smooth(halfHeight - feather, hy, Math.abs(py))) *
          4 *
          hx *
          hy) /
        n ** 2 /
        (1 + (px + cx) ** 2 + (py + cy) ** 2) ** 1.5;
    }
  expect(actual / dense).toBeCloseTo(1, 5);
});
