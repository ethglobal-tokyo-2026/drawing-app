import { describe, expect, it } from "vitest";
import { hexToHsv, hexToRgb, hsvToHex } from "./color";

describe("color", () => {
  it("reads hex channels", () => {
    expect(hexToRgb("#FF8000")).toEqual([255, 128, 0]);
    expect(hexToRgb("#1c1824")).toEqual([28, 24, 36]);
  });

  it("round-trips through HSV", () => {
    for (const hex of ["#1C1824", "#FF5A36", "#3B3F8F", "#FFFFFF", "#000000", "#38D3DC"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});
