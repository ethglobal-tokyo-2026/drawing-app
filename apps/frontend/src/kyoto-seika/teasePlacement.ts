import type { Balloon } from "./deal";

/** A teasing line keeps at least this far inside the screen's edges, in px. */
export const TEASE_EDGE_PX = 10;
/** Room between a line and its balloon's cloud, above the upper or below the lower, in px. */
const CLOUD_GAP_PX = { above: 10, below: 8 };
/** A line's right end runs this far past its die's, so it reads as the die's. */
const PAST_DIE_PX = 6;

interface Placement {
  balloon: Balloon;
  /** The balloon's cloud on the screen. */
  cloud: { top: number; bottom: number };
  /** The right edge of the balloon's die on the screen. */
  dieRight: number;
  /** The line's own size. */
  size: { w: number; h: number };
  screenWidth: number;
}

/**
 * Where a die's teasing line goes: above the upper balloon and below the lower, so the word stays
 * readable, ending by its die, and always inside the screen.
 */
export function teasePlacement({ balloon, cloud, dieRight, size, screenWidth }: Placement) {
  const right = screenWidth - size.w - TEASE_EDGE_PX;
  const left = Math.max(TEASE_EDGE_PX, Math.min(right, dieRight - size.w + PAST_DIE_PX));
  const top =
    balloon === 0 ? cloud.top - size.h - CLOUD_GAP_PX.above : cloud.bottom + CLOUD_GAP_PX.below;
  return { left, top };
}
