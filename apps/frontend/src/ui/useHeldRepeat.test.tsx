// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buttonNamed, renderInHost } from "./testing";
import { HOLD_DELAY_MS, useHeldRepeat } from "./useHeldRepeat";

function HeldButton({ onStep }: { onStep: () => void }) {
  return (
    <button type="button" {...useHeldRepeat(onStep)}>
      Step
    </button>
  );
}

const pointer = (button: HTMLButtonElement, type: string) =>
  act(() => void button.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true })));
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const click = (button: HTMLButtonElement) => act(() => button.click());
let cleanup: (() => void) | undefined;
const mount = (onStep: () => void) => {
  const view = renderInHost(<HeldButton onStep={onStep} />);
  cleanup = view.unmount;
  return view;
};
const unmount = () => {
  cleanup?.();
  cleanup = undefined;
};

describe("useHeldRepeat interruption", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => {
    unmount();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const interruptions = [
    ["window blur", () => window.dispatchEvent(new Event("blur"))],
    [
      "hidden page",
      () => {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      },
    ],
    ["lost pointer capture", (button: HTMLButtonElement) => pointer(button, "lostpointercapture")],
    ["pagehide", () => window.dispatchEvent(new Event("pagehide"))],
  ] as const;

  it.each(interruptions)(
    "ends a repeating hold on %s until a new primary press",
    (_name, interrupt) => {
      let steps = 0;
      const view = mount(() => steps++);
      const button = buttonNamed(view.host, "Step");
      pointer(button, "pointerdown");
      wait(HOLD_DELAY_MS);
      expect(steps).toBe(1);

      act(() => {
        interrupt(button);
      });
      wait(1000);
      pointer(button, "pointerup");
      click(button);
      expect(steps).toBe(1);

      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      act(() => {
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
      wait(HOLD_DELAY_MS);
      expect(steps).toBe(1);

      pointer(button, "pointerdown");
      wait(HOLD_DELAY_MS);
      expect(steps).toBe(2);
      pointer(button, "pointerup");
      click(button);
      expect(steps).toBe(2);
      unmount();
    },
  );

  it.each(interruptions)(
    "suppresses release click when %s interrupts before the first repeat",
    (_name, interrupt) => {
      let steps = 0;
      const view = mount(() => steps++);
      const button = buttonNamed(view.host, "Step");
      pointer(button, "pointerdown");
      wait(HOLD_DELAY_MS - 1);
      act(() => {
        interrupt(button);
      });
      wait(HOLD_DELAY_MS + 1);
      pointer(button, "pointerup");
      click(button);
      expect(steps).toBe(0);
      unmount();
    },
  );

  it("takes a short tap and keyboard activation once each, including after idle blur", () => {
    let steps = 0;
    const view = mount(() => steps++);
    const button = buttonNamed(view.host, "Step");
    pointer(button, "pointerdown");
    wait(HOLD_DELAY_MS - 1);
    pointer(button, "pointerup");
    click(button);
    expect(steps).toBe(1);
    wait(1000);
    act(() => void window.dispatchEvent(new Event("blur")));
    act(() => void window.dispatchEvent(new Event("focus")));
    act(
      () =>
        void button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    act(
      () => void button.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true })),
    );
    click(button);
    expect(steps).toBe(2);
    unmount();
  });

  it("removes page listeners and its pending timer on unmount", () => {
    const windowAdd = vi.spyOn(window, "addEventListener");
    const windowRemove = vi.spyOn(window, "removeEventListener");
    const documentAdd = vi.spyOn(document, "addEventListener");
    const documentRemove = vi.spyOn(document, "removeEventListener");
    const view = mount(() => {});
    const button = buttonNamed(view.host, "Step");
    pointer(button, "pointerdown");
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    for (const type of ["blur", "pagehide"]) {
      const added = windowAdd.mock.calls
        .filter(([event]) => event === type)
        .map(([, listener]) => listener);
      const removed = windowRemove.mock.calls
        .filter(([event]) => event === type)
        .map(([, listener]) => listener);
      expect(added).toHaveLength(1);
      expect(removed).toEqual(added);
    }
    const added = documentAdd.mock.calls
      .filter(([event]) => event === "visibilitychange")
      .map(([, listener]) => listener);
    const removed = documentRemove.mock.calls
      .filter(([event]) => event === "visibilitychange")
      .map(([, listener]) => listener);
    expect(added).toHaveLength(1);
    expect(removed).toEqual(added);
  });

  it("does not schedule another repeat when its action unmounts the button", () => {
    let steps = 0;
    const view = mount(() => {
      steps++;
      unmount();
    });
    const button = buttonNamed(view.host, "Step");
    pointer(button, "pointerdown");
    wait(HOLD_DELAY_MS);
    expect(steps).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    wait(1000);
    expect(steps).toBe(1);
  });
});
