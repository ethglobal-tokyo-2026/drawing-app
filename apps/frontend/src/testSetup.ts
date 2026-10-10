// Runs before every frontend test file (vite.config.ts's test.setupFiles).

declare global {
  /** Tells React that tests flush its updates with act, so it warns about one made outside act. */
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
