// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { countVisit, readSeen, saveSeen } from "./traySeen";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("traySeen", () => {
  it("keeps seen stickers and visits across a reload", () => {
    saveSeen(new Set(["a", "b"]));
    expect(readSeen()).toEqual(new Set(["a", "b"]));
    expect([countVisit(), countVisit()]).toEqual([1, 2]);
  });

  it("reads damaged records as nothing seen and no visits yet, and says so", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("draw.tray.seen", '{"a":1}');
    localStorage.setItem("draw.tray.visits", "lots");
    expect(readSeen()).toEqual(new Set());
    expect(countVisit()).toBe(1);
    expect(report).toHaveBeenCalledTimes(2);
  });
});
