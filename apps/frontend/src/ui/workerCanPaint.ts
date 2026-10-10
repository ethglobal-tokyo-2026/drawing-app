/** Whether a worker can paint here: older iOS lacks OffscreenCanvas, or its 2D context. */
export const workerCanPaint = () =>
  typeof Worker === "function" &&
  typeof OffscreenCanvas === "function" &&
  new OffscreenCanvas(1, 1).getContext("2d") !== null;
