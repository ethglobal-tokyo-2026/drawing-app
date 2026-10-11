import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../../../../apps/frontend/src/api/testing";
import { StickerToolbar } from "../../../../apps/frontend/src/sticker-board/StickerToolbar";
import { HOLD_DELAY_MS } from "../../../../apps/frontend/src/ui/useHeldRepeat";

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("records Bigger repeating after window blur and page hiding", () => {
  vi.useFakeTimers();
  const onStep = vi.fn();
  const view = renderWithApi(
    <StickerToolbar
      label="No.0133"
      sticker={{ x: 100, y: 200, w: 80, h: 80, r: 0 }}
      board={{ W: 390, H: 657 }}
      knobBelow={false}
      clearOf={null}
      onView={() => {}}
      onEscape={() => {}}
      reduced
      arrange={{ open: true, onOpen: () => {}, onStep }}
    />,
    emptyApi(),
  );
  unmount = view.unmount;
  const bigger = view.host.querySelector<HTMLButtonElement>('button[aria-label="Bigger"]');
  expect(bigger).not.toBeNull();
  act(() => {
    bigger!.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        isPrimary: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      }),
    );
    vi.advanceTimersByTime(HOLD_DELAY_MS);
  });
  const before = onStep.mock.calls.length;
  expect(before).toBe(1);
  act(() => window.dispatchEvent(new Event("blur")));
  act(() => vi.advanceTimersByTime(500));
  const afterBlur = onStep.mock.calls.length;
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(500));
  const afterHidden = onStep.mock.calls.length;
  expect({ before, afterBlur, afterHidden }).toEqual({ before: 1, afterBlur: 6, afterHidden: 11 });
});
