// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PointerIndicators } from "./PointerIndicators";
import { keepPointerIndicators } from "./pointerIndicatorsSetting";
import { renderInHost } from "./testing";

let unmount = () => {};

afterEach(() => {
  unmount();
  keepPointerIndicators(false);
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount() {
  const view = renderInHost(<PointerIndicators />);
  unmount = view.unmount;
  return view;
}

function point(type: string, init: PointerEventInit = {}, target: EventTarget = document) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 7,
    pointerType: "pen",
    clientX: 120,
    clientY: 85,
    buttons: 0,
    ...init,
  });
  act(() => void target.dispatchEvent(event));
  return event;
}

const cursors = () => document.querySelectorAll<HTMLElement>(".pointer-indicators__cursor");
const ripples = () => document.querySelectorAll<HTMLElement>(".pointer-indicators__ripple");

describe("the recording pointer indicators", () => {
  it("starts off and follows the device switch immediately", () => {
    mount();
    point("pointermove");
    expect(cursors()).toHaveLength(0);
    act(() => void keepPointerIndicators(true));
    point("pointermove");
    expect(cursors()).toHaveLength(1);
    act(() => void keepPointerIndicators(false));
    expect(document.querySelector(".pointer-indicators")).toBeNull();
    point("pointerdown", { buttons: 1 });
    expect(ripples()).toHaveLength(0);
  });

  it("shows reported hover and contact even when a control stops propagation", () => {
    keepPointerIndicators(true);
    const { host } = mount();
    const button = document.createElement("button");
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    host.append(button);
    point("pointermove", {}, button);
    expect(cursors()[0]?.style.transform).toBe("translate(120px, 85px)");
    expect(cursors()[0]?.hasAttribute("data-contact")).toBe(false);
    const press = point("pointerdown", { buttons: 1 }, button);
    expect(press.defaultPrevented).toBe(false);
    expect(cursors()[0]?.hasAttribute("data-contact")).toBe(true);
    expect(ripples()).toHaveLength(1);
    point("pointermove", { clientX: 140, clientY: 95, buttons: 1 }, button);
    expect(cursors()[0]?.style.transform).toBe("translate(140px, 95px)");
    point("pointerup", {}, button);
    expect(cursors()).toHaveLength(0);
    point("pointermove", {}, button);
    expect(cursors()).toHaveLength(1);
    point("pointerout", { relatedTarget: null }, button);
    expect(cursors()).toHaveLength(0);
  });

  it("shows separate fingertips, skips a palm, and removes canceled contacts", () => {
    keepPointerIndicators(true);
    mount();
    point("pointermove", { pointerType: "touch" });
    expect(cursors()).toHaveLength(0);
    point("pointerdown", { pointerType: "touch", pointerId: 1, buttons: 1 });
    point("pointerdown", { pointerType: "touch", pointerId: 2, buttons: 1 });
    point("pointerdown", { pointerType: "touch", pointerId: 3, width: 90, height: 90 });
    expect(cursors()).toHaveLength(2);
    expect(ripples()).toHaveLength(2);
    point("pointercancel", { pointerType: "touch", pointerId: 1 });
    expect(cursors()).toHaveLength(1);
    point("pointerup", { pointerType: "touch", pointerId: 2 });
    expect(cursors()).toHaveLength(0);
  });

  it("keeps one Pencil position when hover and contact use different pointer IDs", () => {
    keepPointerIndicators(true);
    mount();
    point("pointermove", { pointerId: 20 });
    point("pointerdown", { pointerId: 21, buttons: 1, clientX: 123, clientY: 87 });
    expect(cursors()).toHaveLength(1);
    point("pointermove", { pointerId: 21, buttons: 1, clientX: 125, clientY: 89 });
    expect(cursors()[0]?.style.transform).toBe("translate(125px, 89px)");
    point("pointerup", { pointerId: 21 });
    expect(cursors()).toHaveLength(0);
    point("pointermove", { pointerId: 22, clientX: 130, clientY: 94 });
    point("pointermove", { pointerId: 23, clientX: 132, clientY: 95 });
    expect(cursors()).toHaveLength(1);
    expect(cursors()[0]?.style.transform).toBe("translate(132px, 95px)");
  });

  it.each(["pointerup", "pointercancel", "lostpointercapture"])(
    "ends the Pencil contact on %s after hover has changed its ID",
    (ending) => {
      keepPointerIndicators(true);
      mount();
      point("pointerdown", { pointerId: 21, buttons: 1 });
      point("pointermove", { pointerId: 22, clientX: 123, clientY: 87 });
      point(ending, { pointerId: 21 });
      expect(cursors()).toHaveLength(0);
      point("pointerdown", { pointerId: 23, buttons: 1 });
      point(ending, { pointerId: 21 });
      expect(cursors()).toHaveLength(1);
      expect(cursors()[0]?.hasAttribute("data-contact")).toBe(true);
    },
  );

  it("follows a small Pencil drag Safari reports only through touchmove", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    const pencil = Object.assign(
      new Touch({ identifier: 400, target: document.body, clientX: 123, clientY: 87 }),
      { touchType: "stylus" },
    );
    const movement = new TouchEvent("touchmove", {
      cancelable: true,
      touches: [pencil],
      changedTouches: [pencil],
    });
    act(() => void document.dispatchEvent(movement));
    expect(cursors()).toHaveLength(1);
    expect(cursors()[0]?.style.transform).toBe("translate(123px, 87px)");
    expect(cursors()[0]?.hasAttribute("data-contact")).toBe(true);
    expect(movement.defaultPrevented).toBe(false);
    expect(ripples()).toHaveLength(1);
    act(
      () =>
        void document.dispatchEvent(
          new TouchEvent("touchend", { touches: [], changedTouches: [pencil] }),
        ),
    );
    expect(cursors()).toHaveLength(0);
  });

  it("shows a ripple for every rapid Pencil touch when pointerdown is missing", () => {
    vi.useFakeTimers();
    keepPointerIndicators(true);
    mount();
    for (let id = 1; id <= 3; id++) {
      const pencil = Object.assign(
        new Touch({ identifier: id, target: document.body, clientX: 120, clientY: 85 }),
        { touchType: "stylus" },
      );
      act(
        () =>
          void document.dispatchEvent(
            new TouchEvent("touchstart", { touches: [pencil], changedTouches: [pencil] }),
          ),
      );
      expect(ripples()).toHaveLength(id);
      const dragged = Object.assign(
        new Touch({ identifier: id, target: document.body, clientX: 123, clientY: 87 }),
        { touchType: "stylus" },
      );
      act(
        () =>
          void document.dispatchEvent(
            new TouchEvent("touchmove", { touches: [dragged], changedTouches: [dragged] }),
          ),
      );
      expect(cursors()[0]?.style.transform).toBe("translate(123px, 87px)");
      act(
        () =>
          void document.dispatchEvent(
            new TouchEvent("touchend", { touches: [], changedTouches: [dragged] }),
          ),
      );
      act(() => void vi.advanceTimersByTime(50));
      expect(ripples()).toHaveLength(id);
    }
    for (const ripple of ripples()) expect(ripple.style.transform).toBe("translate(120px, 85px)");
    expect(cursors()).toHaveLength(0);
    act(() => void vi.advanceTimersByTime(500));
    expect(ripples()).toHaveLength(0);
  });

  it.each(["touch-first", "pointer-first"])(
    "shows one ripple when WebKit reports a Pencil contact both ways: %s",
    (order) => {
      keepPointerIndicators(true);
      mount();
      const pencil = Object.assign(new Touch({ identifier: 7, target: document.body }), {
        touchType: "stylus",
      });
      const touchDown = () =>
        act(
          () =>
            void document.dispatchEvent(
              new TouchEvent("touchstart", { touches: [pencil], changedTouches: [pencil] }),
            ),
        );
      if (order === "touch-first") touchDown();
      point("pointerdown", { buttons: 1 });
      if (order === "pointer-first") touchDown();
      expect(ripples()).toHaveLength(1);
      point("pointerup");
      act(
        () =>
          void document.dispatchEvent(
            new TouchEvent("touchend", { touches: [], changedTouches: [pencil] }),
          ),
      );
      touchDown();
      expect(ripples()).toHaveLength(2);
    },
  );

  it("clears a lifted Pencil even if its last movement reported no buttons", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    point("pointermove", { buttons: 0, clientX: 123, clientY: 87 });
    const finger = new Touch({ identifier: 1, target: document.body });
    const pencil = Object.assign(new Touch({ identifier: 400, target: document.body }), {
      touchType: "stylus",
    });
    act(
      () =>
        void document.dispatchEvent(
          new TouchEvent("touchend", { touches: [finger], changedTouches: [pencil] }),
        ),
    );
    expect(cursors()).toHaveLength(0);
  });

  it("clears a held contact if its target loses pointer capture", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    point("lostpointercapture");
    expect(cursors()).toHaveLength(0);
    point("pointermove");
    point("lostpointercapture");
    expect(cursors()).toHaveLength(1);
  });

  it("shows a new ripple when a Pencil contact ID returns after a lost lift", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    point("lostpointercapture");
    point("pointerdown", { buttons: 1 });
    expect(ripples()).toHaveLength(2);
    const pencil = Object.assign(new Touch({ identifier: 7, target: document.body }), {
      touchType: "stylus",
    });
    act(
      () =>
        void document.dispatchEvent(
          new TouchEvent("touchstart", { touches: [pencil], changedTouches: [pencil] }),
        ),
    );
    expect(ripples()).toHaveLength(2);
  });

  it("clears contact on Safari's final touch lift when pointerup was missing", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    expect(cursors()).toHaveLength(1);
    act(() => void document.dispatchEvent(new TouchEvent("touchend", { touches: [] })));
    expect(cursors()).toHaveLength(0);
  });

  it("clears a Pencil lift Safari reports while a finger remains on screen", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    point("pointerdown", { pointerType: "touch", pointerId: 1, buttons: 1 });
    expect(cursors()).toHaveLength(2);
    const finger = new Touch({ identifier: 1, target: document.body });
    const pencil = Object.assign(new Touch({ identifier: 7, target: document.body }), {
      touchType: "stylus",
    });
    act(
      () =>
        void document.dispatchEvent(
          new TouchEvent("touchend", { touches: [finger], changedTouches: [pencil] }),
        ),
    );
    expect(cursors()).toHaveLength(1);
    point("pointerup", { pointerType: "touch", pointerId: 1 });
    expect(cursors()).toHaveLength(0);
  });

  it("bounds ripple lifetime and clears everything when the window loses focus", () => {
    vi.useFakeTimers();
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    expect(ripples()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(ripples()).toHaveLength(0);
    point("pointerdown", { buttons: 1 });
    act(() => void window.dispatchEvent(new Event("blur")));
    expect(cursors()).toHaveLength(0);
    expect(ripples()).toHaveLength(0);
    unmount();
    point("pointerdown", { buttons: 1 });
    expect(document.querySelector(".pointer-indicators")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears indicators when the app goes into the background", () => {
    keepPointerIndicators(true);
    mount();
    point("pointerdown", { buttons: 1 });
    expect(cursors()).toHaveLength(1);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(cursors()).toHaveLength(0);
    expect(ripples()).toHaveLength(0);
  });
});
