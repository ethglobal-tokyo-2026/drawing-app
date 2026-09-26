/** What sits above the heart's area on a stage, px: the top band and the HUD, or a replay's HUD. */
export interface StageFrame {
  above: number;
}

/** The live Mini-game: its top band (176px) and its HUD (80px). */
export const LIVE_FRAME: StageFrame = { above: 176 + 80 };
/** The heart's widest, px. */
export const MAX_HEART_WIDTH = 232;
/** Below its widest, the heart takes this share of the stage's width. */
const HEART_SHARE = 0.58;
/** The heart art's height to width. */
const HEART_ASPECT = 232 / 240;

/** The heart at rest on a `width` × `height` stage: its middle, width and height, px. */
export function heartRest(width: number, height: number, frame: StageFrame) {
  const w = Math.min(width * HEART_SHARE, MAX_HEART_WIDTH);
  const h = w * HEART_ASPECT;
  const top = frame.above;
  return {
    x: width / 2,
    y: Math.max(top + (height - top) * 0.38, top + h * 0.5 + 12),
    width: w,
    height: h,
  };
}
