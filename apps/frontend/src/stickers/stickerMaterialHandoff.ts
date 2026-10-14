import { refreshSticker, whenStickerSettled } from "./stickerRenderer";

/** How long a hidden destination may take to draw the held pose before it's shown regardless. */
export const MATERIAL_REFRESH_DEADLINE_MS = 8000;

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
async function refreshStickerMaterial(canvas: HTMLCanvasElement, signal: AbortSignal) {
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

/**
 * Hidden destinations resume admission and cross their queued held-pose draw before exposure, within
 * the deadline; `destination` names them in the error when they miss it. Resolves whether `signal`
 * still holds.
 */
export async function refreshHiddenMaterials(
  canvases: readonly HTMLCanvasElement[],
  signal: AbortSignal,
  destination: string,
) {
  const admissions = canvases.map(pauseStickerMaterial);
  for (const admission of admissions) admission.resume();
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(MATERIAL_REFRESH_DEADLINE_MS)]);
  try {
    await Promise.all(canvases.map((canvas) => refreshStickerMaterial(canvas, bounded)));
    if (bounded.aborted && !signal.aborted)
      console.error(
        `Refreshing ${destination} exceeded its ${MATERIAL_REFRESH_DEADLINE_MS / 1000} second material deadline`,
      );
    return !signal.aborted;
  } finally {
    for (const admission of admissions) admission.release();
  }
}
