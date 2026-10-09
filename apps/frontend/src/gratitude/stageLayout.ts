/** What sits above the heart's area on a stage, px: the top band and the HUD, or a replay's HUD. */
export interface StageFrame {
  above: number;
}

/** The live Mini-game: its top band (176px) and its HUD (80px). */
export const LIVE_FRAME: StageFrame = { above: 176 + 80 };
/** The heart's widest at the live game's scale on a phone, px. */
export const MAX_HEART_WIDTH = 232;
/** The live game's stage on the phone it was made for, px: it draws at scale 1 there. */
export const LIVE_STAGE = { width: 390, height: 741 } as const;
/** The most the live game grows on a large screen's stage. */
export const MAX_LIVE_SCALE = 1.5;
/** A stage at least this both ways is a large screen's (ui/largeScreen.ts), px. */
const LARGE_STAGE_MIN = 600;
/** Below its widest, the heart takes this share of the stage's width. */
const HEART_SHARE = 0.58;
/** The heart art's height to width. */
const HEART_ASPECT = 232 / 240;

/**
 * The heart at rest on a `width` × `height` stage: its middle, width and height, px. It takes a
 * share of the width, up to `widest`.
 */
export function heartRest(
  width: number,
  height: number,
  frame: StageFrame,
  widest = MAX_HEART_WIDTH,
) {
  const w = Math.min(width * HEART_SHARE, widest);
  const h = w * HEART_ASPECT;
  const top = frame.above;
  return {
    x: width / 2,
    y: Math.max(top + (height - top) * 0.38, top + h * 0.5 + 12),
    width: w,
    height: h,
  };
}

/**
 * How far a layout drawn at scale 1 on a `madeFor` stage grows on a `width` × `height` one: 1 on a
 * phone's; on a large screen's, its smaller share of `madeFor`, from 1 up to `max`.
 */
export function grownScale(
  width: number,
  height: number,
  madeFor: { width: number; height: number },
  max: number,
): number {
  if (width < LARGE_STAGE_MIN || height < LARGE_STAGE_MIN) return 1;
  const grown = Math.min(width / madeFor.width, height / madeFor.height);
  return Math.min(max, Math.max(1, grown));
}

/**
 * The live game's scale on a `width` × `height` stage, grown from LIVE_STAGE up to MAX_LIVE_SCALE.
 * Read from the stage alone, so a replay finds the heart a combo was recorded on from the stage it
 * recorded.
 */
export const liveScale = (width: number, height: number): number =>
  grownScale(width, height, LIVE_STAGE, MAX_LIVE_SCALE);

/** The live game's heart at rest, as wide as its scale lets it be. */
export const liveHeartRest = (width: number, height: number) =>
  heartRest(width, height, LIVE_FRAME, MAX_HEART_WIDTH * liveScale(width, height));
