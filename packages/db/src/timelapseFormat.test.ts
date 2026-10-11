import { describe, expect, it } from "vitest";
import { normalizeTimelapse, timelapseV3Schema } from "./timelapseFormat.ts";
const base = { ink: [10, 20], place: [0, 0, 10, 20], density: 2 };
describe("timelapse normalization", () => {
  it("keeps historical fills visible, including pre-gap recordings", () => {
    expect(normalizeTimelapse({ ...base, v: 1, ops: [["fill", "#000000", 4, 1, 2]] }).ops).toEqual([
      ["fill", 1, "#000000", 4, 1, 2, 0, "visible"],
    ]);
    expect(
      normalizeTimelapse({
        ...base,
        v: 2,
        layers: [[1, 100, false, false]],
        ops: [["fill", 1, "#000000", 4, 1, 2, 3]],
      }).ops,
    ).toEqual([["fill", 1, "#000000", 4, 1, 2, 3, "visible"]]);
  });
  it.each([undefined, "other"])("rejects missing or unknown v3 references: %s", (reference) => {
    expect(() =>
      timelapseV3Schema.parse({
        ...base,
        v: 3,
        layers: [[1, 100, false, false]],
        ops: [["fill", 1, "#000000", 4, 1, 2, 0, reference]],
      }),
    ).toThrow();
  });
  it.each(["layer", "visible"])("retains explicit %s references", (reference) => {
    const value = {
      ...base,
      v: 3,
      layers: [[1, 100, false, false]],
      ops: [["fill", 1, "#000000", 4, 1, 2, 0, reference]],
    };
    expect(normalizeTimelapse(value)).toEqual(value);
  });
});
