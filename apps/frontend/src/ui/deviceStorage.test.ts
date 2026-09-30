// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { countVisit, visitsCounted } from "./deviceStorage";

const KEY = "test.visits";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("countVisit", () => {
  it("counts visits across a reload", () => {
    expect([countVisit(KEY), countVisit(KEY)]).toEqual([1, 2]);
  });

  it("reads the visits counted so far without counting one", () => {
    expect(visitsCounted(KEY)).toBe(0);
    countVisit(KEY);
    expect([visitsCounted(KEY), visitsCounted(KEY)]).toEqual([1, 1]);
  });

  it("counts afresh from a damaged record, and says so", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(KEY, "lots");
    expect(countVisit(KEY)).toBe(1);
    expect(report).toHaveBeenCalledOnce();
  });
});
