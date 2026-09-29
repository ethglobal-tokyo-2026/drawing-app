/** Frees a canvas's memory now: iOS counts canvases against a small budget until they're collected. */
export const releaseCanvas = (canvas: HTMLCanvasElement | OffscreenCanvas) => {
  canvas.width = 0;
  canvas.height = 0;
};
