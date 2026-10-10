// @vitest-environment happy-dom
import { act, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { ColorSheet } from "./ColorSheet";

/** The color the brush draws in. */
const DRAWN = "#1C1824";

describe("ColorSheet", () => {
  it("shows the drawn color again when it goes with a color still in hand on the pad", () => {
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
