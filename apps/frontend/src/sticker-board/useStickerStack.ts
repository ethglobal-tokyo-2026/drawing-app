import { useLayoutEffect, type RefObject } from "react";

/**
 * The board owns normalized stack ranks, which stay below its header and toolbar even when stored
 * placement.z grows. Apply only changed ranks before paint, without rendering unchanged stickers.
 */
export function useStickerStack(
  stage: RefObject<HTMLElement | null>,
  ranks: ReadonlyMap<string, number>,
): void {
  // Run after every board commit: its size can become ready after its ranks have already arrived.
  useLayoutEffect(() => {
    for (const sticker of stage.current?.querySelectorAll<HTMLElement>(".placed-sticker") ?? []) {
      const id = sticker.dataset.stickerId;
      const rank = id === undefined ? undefined : ranks.get(id);
      if (rank === undefined) continue;
      const z = String(10 + rank);
      if (sticker.style.zIndex !== z) sticker.style.zIndex = z;
    }
  });
}
