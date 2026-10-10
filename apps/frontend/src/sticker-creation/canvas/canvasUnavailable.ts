/** The browser wouldn't make a canvas's 2D context: old iOS refuses one past its canvas memory cap. */
export class CanvasUnavailableError extends Error {
  constructor() {
    super("Canvas 2D context unavailable");
    this.name = "CanvasUnavailableError";
  }
}
