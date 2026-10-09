import { vi } from "vitest";
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
