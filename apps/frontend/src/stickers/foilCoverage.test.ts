import { expect, it } from "vitest";
import { foilCoverage } from "./foilCoverage";

it("keeps a band inside existing margins and expands only the sides it reaches", () => {
  const alpha = new Uint8ClampedArray(20 * 12);
  for (let y = 4; y < 8; y++) for (let x = 4; x < 16; x++) alpha[y * 20 + x] = 255;
  const contained = foilCoverage(alpha, 20, 12, 2, 8);
  expect([contained.x, contained.y, contained.width, contained.height]).toEqual([0, 0, 20, 12]);
  alpha[6 * 20] = 255;
  const overflow = foilCoverage(alpha, 20, 12, 2, 8);
  expect([overflow.x, overflow.y, overflow.width, overflow.height]).toEqual([-2, 0, 22, 12]);
  expect(overflow.alpha[6 * overflow.width]).toBe(255);
  expect(overflow.alpha[6 * overflow.width + 2]).toBe(255);
});

it("composes translated fractional masks as the existing CSS mask union does", () => {
  const result = foilCoverage(new Uint8ClampedArray([128]), 1, 1, 1, 8);
  expect([result.x, result.y, result.width, result.height]).toEqual([-1, -1, 3, 3]);
  expect(result.alpha[4]).toBeGreaterThanOrEqual(128);
  expect(result.alpha[0]).toBeGreaterThan(0);
  expect(result.alpha[0]).toBeLessThan(128);
});

it("registers a circular CSS band when the source frame is displayed at a different aspect", () => {
  const result = foilCoverage(new Uint8ClampedArray(20 * 20).fill(255), 20, 20, 2, 8, 4);
  expect([result.x, result.y, result.width, result.height]).toEqual([-2, -4, 24, 28]);
});

// October 13 pre-shortcut accumulation, retained for complete geometry and byte comparisons.
/** Union the center and the same translated masks used by the static band and its cast. */
function unchangedCoverage(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  copies: number,
  verticalRadius = radius,
) {
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!alpha[y * width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  const x = Math.min(0, Math.floor(left - radius));
  const y = Math.min(0, Math.floor(top - verticalRadius));
  const w = Math.max(width, Math.ceil(right + radius)) - x;
  const h = Math.max(height, Math.ceil(bottom + verticalRadius)) - y;
  const output = new Uint8ClampedArray(w * h);
  const shifts = [
    [0, 0],
    ...Array.from({ length: copies }, (_, i) => [
      radius * Math.cos((i * 2 * Math.PI) / copies),
      verticalRadius * Math.sin((i * 2 * Math.PI) / copies),
    ]),
  ];
  const at = (u: number, v: number) =>
    u < 0 || v < 0 || u >= width || v >= height ? 0 : alpha[v * width + u] / 255;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let union = 0;
      for (const [dx, dy] of shifts) {
        const u = i + x - dx,
          v = j + y - dy,
          a = Math.floor(u),
          b = Math.floor(v);
        const fx = u - a,
          fy = v - b;
        const sample =
          at(a, b) * (1 - fx) * (1 - fy) +
          at(a + 1, b) * fx * (1 - fy) +
          at(a, b + 1) * (1 - fx) * fy +
          at(a + 1, b + 1) * fx * fy;
        union += (1 - union) * sample;
      }
      output[j * w + i] = union * 255;
    }
  return { x, y, width: w, height: h, sourceWidth: width, sourceHeight: height, alpha: output };
}

it("preserves every geometry field and alpha byte against the unchanged accumulation", () => {
  for (const [width, height] of [
    [1, 1],
    [3, 7],
    [20, 12],
    [64, 47],
  ]) {
    const masks = [
      new Uint8ClampedArray(width * height).fill(255),
      new Uint8ClampedArray(width * height),
      Uint8ClampedArray.from({ length: width * height }, (_, i) => [0, 1, 128, 254, 255][i % 5]),
      Uint8ClampedArray.from({ length: width * height }, (_, i) => (i % 7 < 3 ? 255 : 0)),
      new Uint8ClampedArray(width * height).fill(128),
    ];
    for (const alpha of masks)
      for (const copies of [0, 8, 16, 64])
        for (const [radius, vertical] of [
          [0, 0],
          [1, 1],
          [2.375, 3.125],
          [7, 0.4],
        ])
          expect(foilCoverage(alpha, width, height, radius, copies, vertical)).toEqual(
            unchangedCoverage(alpha, width, height, radius, copies, vertical),
          );
  }
});

it("preserves malformed inputs, including saturation followed by a nonfinite sample", () => {
  const cases: Parameters<typeof foilCoverage>[] = [
    [new Uint8ClampedArray([255, 255]), 4, 1, 1, 2, 1],
    [new Uint8ClampedArray(20).fill(255), 4.5, 2, 1.2, 8],
    [new Uint8ClampedArray(20).fill(255), 4, 2.5, 1.2, 8],
    [new Uint8ClampedArray(4).fill(255), 2, 2, -0.2, 8],
    [new Uint8ClampedArray(4).fill(255), 2, 2, 0, NaN],
    [new Uint8ClampedArray(4).fill(255), 2, 2, NaN, 8],
    [new Uint8ClampedArray(4).fill(255), 2, 2, Infinity, 8],
    [new Uint8ClampedArray(4).fill(255), 2, 2, 1, 8, Infinity],
    [new Uint8ClampedArray(0), 0, 0, 0, 0],
  ];
  const run = (fn: typeof foilCoverage, args: Parameters<typeof foilCoverage>) => {
    try {
      return fn(...args);
    } catch (error) {
      return { error: String(error) };
    }
  };
  for (const args of cases) expect(run(foilCoverage, args)).toEqual(run(unchangedCoverage, args));
  expect(unchangedCoverage(...cases[0]).alpha).toContain(0);
});
