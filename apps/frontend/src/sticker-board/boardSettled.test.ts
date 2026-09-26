import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  // Both signals come once per app open, so each test starts from fresh modules.
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the board settling", () => {
  it("waits for the board to be complete and quiet, and for its artist chips to have played", async () => {
    const { markBoardComplete } = await import("./boardComplete");
    const { markChipsPlayed, whenBoardSettled } = await import("./boardSettled");
    let settled = false;
    void whenBoardSettled().then(() => (settled = true));

    markChipsPlayed();
    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).toBe(false);

    markBoardComplete();
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });

  it("waits for the chips when the board completes first", async () => {
    const { markBoardComplete } = await import("./boardComplete");
    const { markChipsPlayed, whenBoardSettled } = await import("./boardSettled");
    let settled = false;
    void whenBoardSettled().then(() => (settled = true));

    markBoardComplete();
    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).toBe(false);
    markChipsPlayed();
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(true);
  });
});
