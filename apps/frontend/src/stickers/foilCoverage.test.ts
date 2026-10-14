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
