/** How far a finger moves on the stage before it counts as a swipe or a scroll. */
const LOCK_PX = 8;
/** How far sideways a swipe goes before it pages. */
const PAGE_PX = 56;

type Move = { dx: number; dy: number };

/**
 * What a move on the stage is once it has gone far enough to tell, null until then. Mostly sideways
 * swipes between stickers; anything else is left to scroll the page.
 */
export function swipeLock({ dx, dy }: Move): "swipe" | "scroll" | null {
  if (Math.hypot(dx, dy) <= LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
}

/** Where a swipe lands: one sticker along when it went far enough, left for the next, within the list. */
export function swipeTo({ dx, index, count }: { dx: number; index: number; count: number }) {
  if (Math.abs(dx) <= PAGE_PX) return index;
  return Math.min(count - 1, Math.max(0, index + (dx < 0 ? 1 : -1)));
}
