import { useContext } from "react";
import { MeContext } from "../api/meContext";

/**
 * An NSFW sticker is veiled for anyone without the NSFW opt-in, its Original Artist included, and the
 * API sends them its veiled image.
 */
export const veiledFor = (sticker: { nsfw: boolean }, viewerOptedIn: boolean): boolean =>
  sticker.nsfw && !viewerOptedIn;

/** An NSFW sticker can be given only to someone with the NSFW opt-in. */
export const canGiveTo = (sticker: { nsfw: boolean }, recipientOptedIn: boolean): boolean =>
  !sticker.nsfw || recipientOptedIn;

/** Your NSFW opt-in, Settings' Show 18+ stickers; off outside a session. */
export function useMyNsfwOptIn(): boolean {
  return useContext(MeContext)?.nsfwOptIn ?? false;
}
