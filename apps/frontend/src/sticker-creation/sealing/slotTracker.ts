import type { Rect } from "./stickerPasses";

/**
 * Where the sealed card's slot is, measured once and again whenever the card or the ceremony around it
 * changes size: a late ticket row grows the card upward from its foot, and a turn moves a card
 * centered on a large screen.
 */
export function trackSlot(read: () => Rect, observe: (onResize: () => void) => () => void) {
  let box: Rect | null = null;
  const stop = observe(() => {
    box = null;
  });
  return {
    box: (): Rect => (box ??= read()),
    stop,
  };
}
