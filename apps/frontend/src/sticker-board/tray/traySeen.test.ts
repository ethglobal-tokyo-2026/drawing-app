// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { countVisit } from "./traySeen";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("traySeen", () => {
  it("counts visits across a reload", () => {
    expect([countVisit(), countVisit()]).toEqual([1, 2]);
  });

  it("counts afresh from a damaged record, and says so", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("draw.tray.visits", "lots");
    expect(countVisit()).toBe(1);
    expect(report).toHaveBeenCalledOnce();
  });
});
