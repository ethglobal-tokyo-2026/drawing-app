import { describe, expect, it } from "vitest";
import { evaluatePostEndpoint } from "./evaluator";
import { SELECTED_ROUND_BRUSH_PROFILE } from "./profile";

const bits = (value: number, bytes: 4 | 8) => {
  const data = new DataView(new ArrayBuffer(bytes));
  if (bytes === 4) data.setFloat32(0, value);
  else data.setFloat64(0, value);
  return Array.from(new Uint8Array(data.buffer), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

describe("selected round brush profile", () => {
  it("retains the selected brush's captured response fields and all pressure control bits", () => {
    // post-joined-20261011T230556.990852Z-2249f1a0; joined.jsonl SHA-256 b02068367c020a8fecb3266e4b1213000d3292a16d5b40966cbb6a1b6515a104.
    const config = SELECTED_ROUND_BRUSH_PROFILE.evaluator;
    expect(config.main.flags).toBe(17);
    expect(bits(config.main.minimum, 4)).toBe("3dcccccc");
    expect(config.main.curves[0]?.map(({ x, y }) => [bits(x, 8), bits(y, 8)])).toEqual([
      ["0000000000000000", "0000000000000000"],
      ["3fd3333333333333", "3fe2094f2094f209"],
      ["3fe586fb586fb587", "3fed1745d1745d17"],
      ["3ff0000000000000", "3ff0000000000000"],
    ]);
    expect(config.main.curves.slice(1)).toEqual([null, null]);
    expect(config.secondary).toEqual({
      flags: 0,
      minimum: 0,
      input1Minimum: 0,
      input1Maximum: 1,
      input2Minimum: 0,
      randomMinimum: 0,
      input4Minimum: 0,
      curves: [null, null, null],
    });
    expect(config.secondaryEnabled).toBe(false);
    expect(config.secondaryBase).toBe(1);
    expect(config.brushFlag4).toBe(false);
    expect(config.adjustmentMode).toBe(1);
  });

  it("uses the observed pressure endpoints and adjustment mode instead of pre-settings defaults", () => {
    const config = SELECTED_ROUND_BRUSH_PROFILE.evaluator;
    // At unit pressure the captured curve returns one: 14.75 - (1.5 * .25).
    expect(evaluatePostEndpoint({ scalars: [1, 1, 0, 0, 1, 1, 1], flags: 0 }, 14.75, config)).toBe(
      14.375,
    );
    // At zero pressure the curve returns zero, so the captured binary32 minimum applies.
    expect(evaluatePostEndpoint({ scalars: [0, 1, 0, 0, 1, 1, 1], flags: 0 }, 14.75, config)).toBe(
      1.1062499340623617,
    );
  });

  it("keeps every shared profile object immutable across strokes", () => {
    const check = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) check(child);
    };
    check(SELECTED_ROUND_BRUSH_PROFILE);
    expect(Reflect.set(SELECTED_ROUND_BRUSH_PROFILE.evaluator.main, "minimum", 1)).toBe(false);
    expect(
      Reflect.set(SELECTED_ROUND_BRUSH_PROFILE.evaluator.main.curves[0] ?? {}, "0", { x: 1, y: 1 }),
    ).toBe(false);
  });
});
