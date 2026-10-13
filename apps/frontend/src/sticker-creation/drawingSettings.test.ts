// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { refusingStorage } from "../ui/testing";
import {
  keepInputMode,
  keepPenMinimumWidth,
  penDrew,
  readInputMode,
  readPenMinimumWidth,
} from "./drawingSettings";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  keepPenMinimumWidth(20);
  localStorage.clear();
});

describe("the input mode", () => {
  it("starts every sheet in Pencil only once a pen first draws on this device, and a later pen never undoes the person's choice", () => {
    expect(readInputMode()).toBeNull();
    penDrew();
    expect(readInputMode()).toBe("pencilOnly");
    keepInputMode("pencilAndFinger");
    penDrew();
    expect(readInputMode()).toBe("pencilAndFinger");
  });
});

describe("the pen's minimum width", () => {
  it("uses twenty percent when this device has no choice", () => {
    expect(readPenMinimumWidth()).toBe(20);
  });

  it.each(["", " ", "NaN", "Infinity", "-1", "101", "20.5", "twenty"])(
    "uses the default instead of the invalid stored percentage %j",
    (stored) => {
      localStorage.setItem("draw.penMinimumWidth", stored);
      expect(readPenMinimumWidth()).toBe(20);
    },
  );

  it.each([0, 1, 65, 100])("reads the stored percentage %s", (stored) => {
    localStorage.setItem("draw.penMinimumWidth", String(stored));
    expect(readPenMinimumWidth()).toBe(stored);
  });

  it("keeps a chosen percentage and removes the default from storage", () => {
    expect(keepPenMinimumWidth(65)).toBe(true);
    expect(localStorage.getItem("draw.penMinimumWidth")).toBe("65");
    expect(readPenMinimumWidth()).toBe(65);
    expect(keepPenMinimumWidth(20)).toBe(true);
    expect(localStorage.getItem("draw.penMinimumWidth")).toBeNull();
    expect(readPenMinimumWidth()).toBe(20);
  });

  it.each([
    { value: -8, want: 0 },
    { value: 120, want: 100 },
    { value: 47.6, want: 48 },
    { value: NaN, want: 20 },
    { value: Infinity, want: 20 },
    { value: -Infinity, want: 20 },
  ])("normalizes a programmatic percentage $value to $want", ({ value, want }) => {
    keepPenMinimumWidth(value);
    expect(readPenMinimumWidth()).toBe(want);
    expect(localStorage.getItem("draw.penMinimumWidth")).toBe(want === 20 ? null : String(want));
  });

  it("applies a normalized percentage when the device refuses to keep it", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    expect(keepPenMinimumWidth(64.6)).toBe(false);
    expect(readPenMinimumWidth()).toBe(65);
  });
});
