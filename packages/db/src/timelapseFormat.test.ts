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
    expect(normalizeTimelapse(value)).toEqual({ ...value, v: 4 });
  });

  it("normalizes an unchanged v3 replay to v4 and accepts a valid merge tuple", () => {
    const v3 = {
      ...base,
      v: 3,
      layers: [[1, 65, true, true]],
      ops: [
        ["add", 2, 1, 1],
        ["brush", 2, "#ff3366", 2, [10, 20, 30, 0]],
        ["clip", 2, 3, true],
        ["opacity", 2, 4, 35],
      ],
    };
    expect(normalizeTimelapse(v3)).toEqual({ ...v3, v: 4 });
    const v4 = {
      ...v3,
      v: 4,
      ops: [...v3.ops, ["merge", 2, 5, 1]],
    };
    expect(normalizeTimelapse(v4)).toEqual(v4);
  });

  it.each([
    {
      name: "missing destination",
      ops: [
        ["add", 2, 0, 1],
        ["merge", 2, 1],
      ],
    },
    {
      name: "wrong tuple order",
      ops: [
        ["add", 2, 0, 1],
        ["merge", 2, 1, 1, 99],
      ],
    },
    { name: "unknown source", ops: [["merge", 2, 1, 1]] },
    {
      name: "bottom layer",
      ops: [
        ["add", 2, 0, 1],
        ["merge", 1, 1, 2],
      ],
    },
    {
      name: "nonadjacent destination",
      ops: [
        ["add", 2, 0, 1],
        ["add", 3, 1, 2],
        ["merge", 3, 2, 1],
      ],
    },
    {
      name: "clipped run above source",
      ops: [
        ["add", 2, 0, 1],
        ["add", 3, 1, 2],
        ["clip", 3, 2, true],
        ["merge", 2, 3, 1],
      ],
    },
    {
      name: "reused deleted layer id",
      ops: [
        ["add", 2, 0, 1],
        ["merge", 2, 1, 1],
        ["add", 2, 2, 1],
      ],
    },
  ])("rejects a v4 merge with $name", ({ ops }) => {
    expect(() =>
      normalizeTimelapse({
        ...base,
        v: 4,
        layers: [[1, 100, false, false]],
        ops,
      }),
    ).toThrow();
  });
});
