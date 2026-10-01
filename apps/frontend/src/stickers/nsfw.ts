import type { AgeStatus } from "@drawing-app/api/client";

/**
 * An NSFW sticker is veiled for anyone whose age status isn't adult, and the API sends them its
 * veiled image.
 */
export const veiledFor = (sticker: { nsfw: boolean }, viewer: AgeStatus): boolean =>
  sticker.nsfw && viewer !== "adult";

/** An NSFW sticker can be given only to an adult. */
export const canGiveTo = (sticker: { nsfw: boolean }, recipient: AgeStatus): boolean =>
  !sticker.nsfw || recipient === "adult";
