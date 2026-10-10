import { act, useEffect, useRef, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import { onTestFinished, vi } from "vitest";
import type { LayerId } from "../canvas/ops";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

/** A chip is 30 by 38 and the chips sit on a 42px pitch, as in the column. */
export const CHIP = { width: 30, height: 38 };
export const PITCH = 42;
/** Where the list's top is, client px. */
const LIST_TOP = 100;

/** The client y of the middle of the chip in `slot`, counting from the top, with the list unscrolled. */
export const slotY = (slot: number) => LIST_TOP + slot * PITCH + CHIP.height / 2;

/** Timers a test steps by hand: the hold, the settle and the animation frames. */
export function useFakeClock() {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
  onTestFinished(() => {
    vi.useRealTimers();
  });
}

/** Lets `ms` pass. */
export const elapse = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

/** A pointer event of `type` on `target`: a finger, unless `init` says otherwise. */
export const pointer = (target: Element, type: string, init: PointerEventInit = {}) =>
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        pointerType: "touch",
        ...init,
      }),
    );
  });

export const click = (target: Element) =>
  act(() => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });

/** A chip's scale, 1 when its transform sets none. */
export const scaleOf = (chip: HTMLElement) =>
  Number(/scale\(([\d.]+)\)/.exec(chip.style.transform)?.[1] ?? 1);

/** How far a chip's transform moves it along the column, px. */
export const shiftOf = (chip: HTMLElement) =>
  Number(/translateY\((-?[\d.]+)px\)/.exec(chip.style.transform)?.[1] ?? 0);

/**
 * A layer list as the column renders it, with `useHook` called on it. Chips are in the order the
 * column shows them, front layer first, and `getOrder` is back to front. Change what `getOrder` and
 * the hook read, then `rerender()`. Unmounts when the test ends.
 */
export function mountChipList<R>(
  useHook: (list: RefObject<HTMLDivElement | null>) => R,
  getOrder: () => readonly LayerId[],
  onSelect: (id: LayerId) => void = () => {},
) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let result: R;
  function Column() {
    const list = useRef<HTMLDivElement>(null);
    const hooked = useHook(list);
    useEffect(() => {
      result = hooked;
    });
    return (
      <div ref={list} role="listbox">
        {[...getOrder()].reverse().map((id) => (
          <div key={id} role="option" data-layer-chip={id} onClick={() => onSelect(id)} />
        ))}
      </div>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = () => act(() => root.render(<Column />));
  render();
  onTestFinished(() => {
    act(() => root.unmount());
    host.remove();
  });

  const list = host.querySelector<HTMLElement>("[role=listbox]");
  if (!list) throw new Error("the list isn't rendered");
  layOut(list);
  return {
    list,
    chip: (id: LayerId) => {
      const chip = list.querySelector<HTMLElement>(`[data-layer-chip="${id}"]`);
      if (!chip) throw new Error(`layer ${id} has no chip`);
      return chip;
    },
    rerender: render,
    result: () => result,
  };
}

/**
 * Gives the list and its chips the boxes the column would lay out, since happy-dom lays out nothing:
 * the list shows `visible` px of its chips from `LIST_TOP`, and chips follow their place in the list
 * and how far it has scrolled.
 */
export function layOut(list: HTMLElement, visible = Infinity) {
  const total = list.children.length * PITCH;
  const height = Math.min(visible, total);
  Object.defineProperties(list, {
    scrollHeight: { configurable: true, value: total },
    clientHeight: { configurable: true, value: height },
  });
  list.getBoundingClientRect = () => new DOMRect(0, LIST_TOP, CHIP.width, height);
  for (const chip of Array.from(list.children)) {
    chip.getBoundingClientRect = () => {
      const place = Array.from(list.children).indexOf(chip);
      return new DOMRect(0, LIST_TOP + place * PITCH - list.scrollTop, CHIP.width, CHIP.height);
    };
  }
}
