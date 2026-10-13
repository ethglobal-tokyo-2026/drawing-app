// @vitest-environment happy-dom
import { act, useRef } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { ColorSheet } from "./ColorSheet";
import { SWATCHES } from "./palette";

/** The color the brush draws in. */
const DRAWN = "#1C1824";

describe("ColorSheet", () => {
  it("moves by the displayed swatch row when arrow keys change colors", () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });
    const onPick = vi.fn<(hex: string) => void>();
    function Screen() {
      const root = useRef<HTMLDivElement>(null);
      return (
        <div ref={root}>
          <ColorSheet
            id="colors"
            open
            layer={root}
            color={DRAWN}
            recent={[]}
            onPick={onPick}
            onPreview={() => {}}
            onClose={() => {}}
          />
        </div>
      );
    }
    const view = renderWithApi(<Screen />);
    const dots = [...view.host.querySelectorAll<HTMLButtonElement>(".color-swatches button")];
    for (const [index, dot] of dots.entries())
      Object.defineProperty(dot, "offsetTop", { get: () => Math.floor(index / 7) * 44 });
    const moves = [
      [1, "ArrowDown", 8],
      [8, "ArrowUp", 1],
      [1, "ArrowUp", 36],
      [36, "ArrowDown", 1],
      [34, "ArrowDown", 6],
      [6, "ArrowUp", 34],
      [39, "ArrowRight", 0],
      [0, "ArrowLeft", 39],
    ] as const;
    for (const [from, key, to] of moves) {
      act(() => {
        dots[from].focus();
        dots[from].dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
      expect(document.activeElement).toBe(dots[to]);
      expect(onPick).toHaveBeenLastCalledWith(SWATCHES[to].hex);
    }
    view.unmount();
  });
  it("shows the drawn color again when it goes with a color still in hand on the pad", () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      // Closing schedules a history step back; it must not outlive this test's window.
      vi.clearAllTimers();
      vi.useRealTimers();
    });
    const onPick = vi.fn<(hex: string) => void>();
    const onPreview = vi.fn<(hex: string) => void>();
    function Screen() {
      const root = useRef<HTMLDivElement>(null);
      return (
        <div ref={root}>
          <ColorSheet
            id="colors"
            open
            layer={root}
            color={DRAWN}
            recent={[]}
            onPick={onPick}
            onPreview={onPreview}
            onClose={() => {}}
          />
        </div>
      );
    }
    const view = renderWithApi(<Screen />);
    const pad = view.host.querySelector(".color-pad");
    if (!pad) throw new Error("the pad isn't rendered");
    pad.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
    act(
      () =>
        void pad.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 1,
            clientX: 150,
            clientY: 20,
            bubbles: true,
          }),
        ),
    );
    expect(onPreview).toHaveBeenCalled();
    expect(onPreview).not.toHaveBeenLastCalledWith(DRAWN);

    view.rerender(null);
    expect(onPreview).toHaveBeenLastCalledWith(DRAWN);
    expect(onPick).not.toHaveBeenCalled();
    view.unmount();
  });
});
