/** prefers-reduced-motion as the phone reports it, switched by the test: a matchMedia spy returns it. */
export class ReducedMotion extends EventTarget implements MediaQueryList {
  readonly media = "(prefers-reduced-motion: reduce)";
  onchange = null;
  matches: boolean;
  constructor(reduced: boolean) {
    super();
    this.matches = reduced;
  }
  change(reduced: boolean) {
    this.matches = reduced;
    this.dispatchEvent(new Event("change"));
  }
  addListener() {}
  removeListener() {}
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
