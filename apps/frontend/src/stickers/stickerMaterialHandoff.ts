import { refreshSticker, whenStickerSettled } from "./stickerRenderer";

const handoffs = new WeakMap<HTMLCanvasElement, { paused: boolean }>();
/** A lift pauses its retained destination; its hidden return may temporarily resume a covered board. */
export function stickerMaterialActive(canvas: HTMLCanvasElement, active: boolean) {
  if (!canvas.isConnected) return false;
  const handoff = handoffs.get(canvas);
  return handoff ? !handoff.paused : active;
}

/** Owns destination admission until the flight has refreshed it or has been canceled. */
export function pauseStickerMaterial(canvas: HTMLCanvasElement) {
  const handoff = { paused: true };
  handoffs.set(canvas, handoff);
  return {
    resume: () => {
      if (handoffs.get(canvas) === handoff) handoff.paused = false;
    },
    release: () => {
      if (handoffs.get(canvas) === handoff) handoffs.delete(canvas);
    },
  };
}

/** Settlement alone can resolve before a pose-only draw: cross that draw frame before exposing. */
export async function refreshStickerMaterial(canvas: HTMLCanvasElement, signal: AbortSignal) {
  if (signal.aborted || !canvas.isConnected) return;
  refreshSticker(canvas);
  await new Promise<void>((resolve) => {
    const frame = requestAnimationFrame(finish);
    function finish() {
      cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    }
    signal.addEventListener("abort", finish, { once: true });
  });
  if (!signal.aborted && canvas.isConnected) await whenStickerSettled(canvas, undefined, signal);
}
