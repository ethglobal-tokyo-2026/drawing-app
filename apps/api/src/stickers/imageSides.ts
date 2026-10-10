/**
 * How large the app lays out a sticker's images, in pixels. Their own module, free of server imports,
 * so the app lays them out by these through the typed client, and Sealing refuses a larger image by
 * its PNG header, before anything decodes it.
 */

/** The cut's long side in the sticker's image, at most. */
export const MAX_CUT_SIDE = 640;
/**
 * The cut's long side in the sharp copy, at most: the sticker detail's largest figure on an iPad,
 * at 2×. Only the sticker gets a sharp copy, since the ink's edge is what reads as soft.
 */
export const SHARP_CUT_SIDE = 1600;
/** The margin around the cut, as a share of its long side. */
export const CUT_PAD = 0.05;
/** The flat sheet's long side, at most. */
export const MAX_FLAT_SIDE = 1100;

/** An image's long side at most, for a cut's at most `cutSide`: the margin each side, a pixel over for rounding. */
const imageSideFor = (cutSide: number) => cutSide + 2 * (Math.ceil(cutSide * CUT_PAD) + 1);
/** The sticker's image and its mask, at most. */
export const MAX_STICKER_IMAGE_SIDE = imageSideFor(MAX_CUT_SIDE);
/** The sharp copy, at most. */
export const MAX_SHARP_IMAGE_SIDE = imageSideFor(SHARP_CUT_SIDE);
