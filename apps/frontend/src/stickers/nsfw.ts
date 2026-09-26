import type { AgeStatus } from "@drawing-app/api/client";

/** An NSFW sticker is blurred for anyone whose age status isn't adult. */
export const veiledFor = (sticker: { nsfw: boolean }, viewer: AgeStatus): boolean =>
  sticker.nsfw && viewer !== "adult";

/** An NSFW sticker can be given only to an adult. */
export const canGiveTo = (sticker: { nsfw: boolean }, recipient: AgeStatus): boolean =>
  !sticker.nsfw || recipient === "adult";
