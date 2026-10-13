// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { fieldOf, PHONE_BOARD, unitOf } from "./placement";
import { useCreases, type CreaseStore } from "./useCreases";

// Simulate a browser without worker painting at the capability boundary, keeping the hook real.
vi.mock("../ui/workerCanPaint", () => ({ workerCanPaint: () => false }));

it("settles the known flat fallback without waiting for a worker that cannot paint", async () => {
  vi.useFakeTimers();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const stores: CreaseStore[] = [];
  function Probe() {
    stores.push(
      useCreases({
        stickers: ["lower", "top"].map((id) => ({
          id,
          width: 120,
          height: 120,
          urls: { png: `${id}.png`, mask: `${id}-mask.png` },
          placement: { on: true, x: 0.5, y: 0.5, s: 0.4, r: 0, z: 1 },
        })),
        field: fieldOf(PHONE_BOARD.W, PHONE_BOARD.H),
        unit: unitOf("phone", PHONE_BOARD.W),
        foilOf: () => null,
      }),
    );
    return null;
  }
  const root = createRoot(document.createElement("div"));
  try {
    act(() => root.render(createElement(Probe)));
    let settled = false;
    void stores[0].whenSettled().then(() => (settled = true));
    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(settled).toBe(true);
    expect(error.mock.calls.flat().join(" ")).toContain("top");
    expect(error.mock.calls.flat().join(" ")).toContain("can't paint");
  } finally {
    act(() => root.unmount());
    error.mockRestore();
    vi.useRealTimers();
  }
});
