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
