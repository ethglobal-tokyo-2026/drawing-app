/** The canvas's 2D context; throws where the browser can't provide one. */
export function context2d(
  canvas: HTMLCanvasElement,
  settings?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", settings);
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx;
}
