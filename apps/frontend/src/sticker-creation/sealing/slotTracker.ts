import type { Box } from "./sealTimeline";

/**
 * Where the sealed card's slot is, measured once and again whenever the card changes size: the card
 * grows upward from its foot, so a late ticket row moves the slot after the flight has started.
 */
export function trackSlot(read: () => Box, observe: (onResize: () => void) => () => void) {
  let box: Box | null = null;
  const stop = observe(() => {
    box = null;
  });
  return {
    box: (): Box => (box ??= read()),
    stop,
  };
}
