// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInHost, type HostView } from "../ui/testing";
import { HOLD_MS, HOLD_SLOP_PX, useHold } from "./useHold";

const AT = { clientX: 100, clientY: 100 };

interface HeldProps {
  word: string;
  onHold: () => void;
  onClick: () => void;
}

/** A button that takes the hold on `word`, as a cloud's pick button does. */
function Held({ word, onHold, onClick }: HeldProps) {
  const hold = useHold(HOLD_MS, onHold, word);
  return <button type="button" {...hold} onClick={onClick} />;
}

let view: HostView | null = null;
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  view?.unmount();
  view = null;
  vi.useRealTimers();
});

/** The held button over `word`, what its holds and clicks did, and a way to change its word. */
function held(word = "風") {
  const props = { onHold: vi.fn(), onClick: vi.fn() };
  view = renderInHost(<Held word={word} {...props} />);
  const button = view.host.querySelector("button");
  if (!button) throw new Error("No button");
  const shown = view;
  return {
    button,
    ...props,
    reword: (next: string) => shown.rerender(<Held word={next} {...props} />),
  };
}

const send = (el: Element, type: string, init: PointerEventInit = {}) =>
  act(
    () =>
      void el.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerId: 1, ...AT, ...init }),
      ),
  );
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("a held press", () => {
  it("calls onHold once it has stayed for HOLD_MS, through a wobble within the slop, and not before", () => {
    const { button, onHold } = held();
    send(button, "pointerdown");
    send(button, "pointermove", { clientX: AT.clientX + HOLD_SLOP_PX });
    wait(HOLD_MS - 1);
    expect(onHold).not.toHaveBeenCalled();
    wait(1);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it.each([
    ["a release", "pointerup", {}],
    ["a cancel", "pointercancel", {}],
    // React hears a pointer leave from the pointerout the browser sends with it.
    ["leaving the button", "pointerout", {}],
    ["a move past the slop", "pointermove", { clientY: AT.clientY + HOLD_SLOP_PX + 1 }],
  ])("lets go at %s", (_, type, init) => {
    const { button, onHold } = held();
    send(button, "pointerdown");
    send(button, type, init);
    wait(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("lets go when the word under it changes", () => {
    const { button, onHold, reword } = held("風");
    send(button, "pointerdown");
    reword("春");
    wait(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("swallows the click its release makes once it has fired, and not a short press's", () => {
    const { button, onHold, onClick } = held();
    send(button, "pointerdown");
    wait(HOLD_MS);
    send(button, "pointerup");
    act(() => button.click());
    expect(onHold).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
    send(button, "pointerdown");
    send(button, "pointerup");
    act(() => button.click());
    expect(onClick).toHaveBeenCalledOnce();
  });
});
