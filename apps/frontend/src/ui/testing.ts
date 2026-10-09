import { act } from "react";
import { onTestFinished, vi } from "vitest";
import { LARGE_SCREEN } from "./largeScreen";
import { LANDSCAPE_TOUCH } from "./sideways";

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

/** Each device's screen in CSS px, portrait, as `screen` reports it whatever the window. */
const DEVICE_SCREENS = { phone: [390, 844], iPad: [1024, 1366] } as const;

/**
 * A touch screen for a test, landscape or not and large or not, since happy-dom has no touch screen:
 * answers LANDSCAPE_TOUCH and LARGE_SCREEN by the switches it returns, and every other query through
 * happy-dom's own, until the test ends. `landscape.change(true)` turns it on its side. The device is an
 * iPad when the window is large, and a phone otherwise unless it says so.
 */
export function onTouchScreen({
  landscape,
  large,
  device = large ? "iPad" : "phone",
}: {
  landscape: boolean;
  large: boolean;
  device?: keyof typeof DEVICE_SCREENS;
}) {
  const [width, height] = DEVICE_SCREENS[device];
  const sized = Object.entries({ width, height }).map(([side, px]) => {
    const own = Object.getOwnPropertyDescriptor(window.screen, side);
    Object.defineProperty(window.screen, side, { configurable: true, get: () => px });
    return () =>
      own
        ? Object.defineProperty(window.screen, side, own)
        : Reflect.deleteProperty(window.screen, side);
  });
  onTestFinished(() => sized.forEach((restore) => restore()));
  const matchMedia = window.matchMedia.bind(window);
  const screen = {
    landscape: new SwitchedQuery(LANDSCAPE_TOUCH, landscape),
    large: new SwitchedQuery(LARGE_SCREEN, large),
  };
  const spy = vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query) =>
      query === LANDSCAPE_TOUCH
        ? screen.landscape
        : query === LARGE_SCREEN
          ? screen.large
          : matchMedia(query),
    );
  onTestFinished(() => spy.mockRestore());
  return screen;
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

/** The input of the app's one switch (`Switch`): tests find switches by it, so one drawn any other way isn't found. */
export const SWITCH = ".switch > input[role='switch']";
