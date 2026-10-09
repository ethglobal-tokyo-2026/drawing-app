import { act } from "react";
import { onTestFinished, vi } from "vitest";
import { LARGE_SCREEN } from "./largeScreen";

/** A media query switched by the test: a matchMedia spy returns it, and `change` tells its listeners. */
class SwitchedQuery extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange = null;
  matches: boolean;
  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }
  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
  addListener() {}
  removeListener() {}
}

/** prefers-reduced-motion as the phone reports it, switched by the test: a matchMedia spy returns it. */
export class ReducedMotion extends SwitchedQuery {
  constructor(reduced: boolean) {
    super("(prefers-reduced-motion: reduce)", reduced);
  }
}

/**
 * A large screen for a test, since happy-dom has no touch screen and so is a phone: answers
 * LARGE_SCREEN as a large screen and every other query through happy-dom's own. Returns the switch,
 * whose `change(false)` makes the screen a phone's. `vi.restoreAllMocks()` puts matchMedia back.
 */
export function onLargeScreen() {
  const matchMedia = window.matchMedia.bind(window);
  const large = new SwitchedQuery(LARGE_SCREEN, true);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === LARGE_SCREEN ? large : matchMedia(query),
  );
  return large;
}

/**
 * ResizeObservers a test reports to, since happy-dom's never call back: `resize(el)` tells each
 * observer watching `el`, and `resize()` every observer watching anything. Gone when the test ends.
 */
export function stubResizeObservers() {
  const watching = new Map<
    ResizeObserver,
    { targets: Set<Element>; callback: ResizeObserverCallback }
  >();
  class TestResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      watching.set(this, { targets: new Set(), callback });
    }
    observe(target: Element) {
      watching.get(this)?.targets.add(target);
    }
    unobserve(target: Element) {
      watching.get(this)?.targets.delete(target);
    }
    disconnect() {
      watching.get(this)?.targets.clear();
    }
  }
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = TestResizeObserver;
  onTestFinished(() => {
    globalThis.ResizeObserver = original;
  });
  return {
    resize(el?: Element | null) {
      for (const [observer, { targets, callback }] of watching) {
        if (el ? targets.has(el) : targets.size > 0) callback([], observer);
      }
    },
  };
}

/**
 * A stand-in for localStorage that refuses every write, as a full or blocked one does: a test passes
 * it to `vi.stubGlobal("localStorage", …)`, since spying on happy-dom's own can leave it unable to
 * write for later tests.
 */
export const refusingStorage = {
  getItem: () => null,
  removeItem: () => {},
  clear: () => {},
  setItem: () => {
    throw new DOMException("The storage is full", "QuotaExceededError");
  },
};

/**
 * A finger on `el`, moved by each of `path`'s offsets in turn, then lifted there; the browser's click
 * follows the lift. No path is a tap.
 */
export function dragBy(el: Element | null, ...path: [dx: number, dy: number][]) {
  const at = { clientX: 100, clientY: 100, pointerId: 1, bubbles: true };
  const send = (type: string, dx = 0, dy = 0) =>
    act(
      () =>
        void el?.dispatchEvent(
          new PointerEvent(type, { ...at, clientX: at.clientX + dx, clientY: at.clientY + dy }),
        ),
    );
  send("pointerdown");
  for (const [dx, dy] of path) send("pointermove", dx, dy);
  const [dx, dy] = path.at(-1) ?? [0, 0];
  send("pointerup", dx, dy);
  act(() => void el?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}
