import { describe, expect, it } from "vitest";
import { hexToHsv, hexToRgba, hsvToHex } from "./color";

describe("color", () => {
  it("parses hex", () => {
    expect(hexToRgba("#ff8000")).toEqual([255, 128, 0, 255]);
    expect(hexToRgba("#fff")).toEqual([255, 255, 255, 255]);
  });

  it("round-trips through HSV", () => {
    for (const hex of ["#1c1b29", "#ec6341", "#3d6ef1", "#ffffff", "#000000", "#66d0d6"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});
