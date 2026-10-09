import { useLayoutEffect, type RefObject } from "react";
import { grownScale } from "../gratitude/stageLayout";

/** The most the unwrap grows on a large screen. */
export const MAX_UNWRAP_SCALE = 1.4;
/** The room the unwrap's group keeps clear of a large screen's edges, px. */
export const UNWRAP_MARGIN = 24;

/**
 * The unwrap's scale in a `width` × `height` window whose home indicator takes `footInset` at its
 * foot: grown as the Mini-game's stage grows, from the group's size at scale 1 to the room left inside
 * UNWRAP_MARGIN and above the inset, up to MAX_UNWRAP_SCALE.
 */
export function unwrapScale(
  view: { width: number; height: number; footInset: number },
  group: { width: number; height: number },
): number {
  const room = {
    width: view.width - 2 * UNWRAP_MARGIN,
    height: view.height - 2 * UNWRAP_MARGIN - view.footInset,
  };
  return grownScale(room.width, room.height, group, MAX_UNWRAP_SCALE);
}

const PROPERTIES = ["--unwrap-scale", "--unwrap-h", "--unwrap-group-h"] as const;

/**
 * On a large screen, fits the unwrap's group (the giver, the bag and the hint, inside `unwrap`) to the
 * dialog it's in, refitting as the window or the words change. Its scale and sizes at scale 1 go on
 * the dialog, for receive-gift-dialog.css; the group's height runs to the hint's foot.
 */
export function useUnwrapScale(unwrap: RefObject<HTMLElement | null>, large: boolean) {
  useLayoutEffect(() => {
    const group = unwrap.current;
    const dialog = group?.parentElement;
    const hint = group?.querySelector<HTMLElement>(".receive-gift__hint");
    if (!large || !group || !dialog || !hint) return;
    const fit = () => {
      const height = hint.offsetTop + hint.offsetHeight;
      const scale = unwrapScale(
        {
          width: dialog.clientWidth,
          height: dialog.clientHeight,
          footInset: parseFloat(getComputedStyle(dialog).paddingBottom) || 0,
        },
        { width: group.offsetWidth, height },
      );
      dialog.style.setProperty("--unwrap-scale", String(scale));
      dialog.style.setProperty("--unwrap-h", `${group.offsetHeight}px`);
      dialog.style.setProperty("--unwrap-group-h", `${height}px`);
    };
    fit();
    const resized = new ResizeObserver(fit);
    for (const el of [dialog, group, hint]) resized.observe(el);
    return () => {
      resized.disconnect();
      for (const property of PROPERTIES) dialog.style.removeProperty(property);
    };
  }, [unwrap, large]);
}
