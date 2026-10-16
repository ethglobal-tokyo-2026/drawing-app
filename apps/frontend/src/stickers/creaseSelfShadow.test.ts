import { describe, expect, it } from "vitest";
import { creaseCanShade } from "./creaseSelfShadow";

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const lightAt = (elevation: number) => [Math.cos(elevation), 0, Math.sin(elevation)];

describe("the crease self-shadow gate", () => {
  it("skips only when the light's whole disc clears the encoded slope bound", () => {
    const slope = 0.2,
      size = [100, 100],
      radius = 0.05;
    const threshold = Math.atan(slope) + radius;
    expect(creaseCanShade(lightAt(threshold + 0.001), identity, slope * 100, size, radius)).toBe(
      false,
    );
    expect(creaseCanShade(lightAt(threshold - 0.001), identity, slope * 100, size, radius)).toBe(
      true,
    );
  });

  it("keeps the march for an image without a known bound", () => {
    expect(creaseCanShade(lightAt(1), identity, undefined, [100, 100], 0.05)).toBe(true);
  });

  it("uses the sticker's plane when a flight tilts its normal", () => {
    const angle = 0.6,
      c = Math.cos(angle),
      s = Math.sin(angle);
    const turn = [c, 0, s, 0, 1, 0, -s, 0, c];
    expect(creaseCanShade(lightAt(0.7), identity, 20, [100, 100], 0.05)).toBe(false);
    expect(creaseCanShade(lightAt(0.7), turn, 20, [100, 100], 0.05)).toBe(true);
  });

  it("keeps the march when the registered height image is displayed smaller", () => {
    expect(creaseCanShade(lightAt(0.4), identity, 20, [100, 100], 0.05)).toBe(false);
    expect(creaseCanShade(lightAt(0.4), identity, 20, [25, 50], 0.05)).toBe(true);
  });

  it("keeps obstruction when the light crosses the flat plane but can still reach a tilted crease", () => {
    for (const elevation of [0.001, 0, -0.001, -0.1])
      expect(creaseCanShade(lightAt(elevation), identity, 20, [100, 100], 0.05)).toBe(true);
  });

  it("keeps unknown geometry conservative", () => {
    expect(creaseCanShade(lightAt(1), identity, 20, [0, 100], 0.05)).toBe(true);
  });
});
