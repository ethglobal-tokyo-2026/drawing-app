import { useContext } from "react";
import { MeContext } from "../api/meContext";

/**
 * An NSFW sticker is veiled for anyone without the NSFW opt-in, and the API sends them its veiled
 * image.
 */
export const veiledFor = (sticker: { nsfw: boolean }, viewerOptedIn: boolean): boolean =>
  sticker.nsfw && !viewerOptedIn;

/** An NSFW sticker can be given only to someone with the NSFW opt-in. */
export const canGiveTo = (sticker: { nsfw: boolean }, recipientOptedIn: boolean): boolean =>
  !sticker.nsfw || recipientOptedIn;

/** Whether you have the NSFW opt-in on; off outside a session. */
export function useMyNsfwOptIn(): boolean {
  return useContext(MeContext)?.nsfwOptIn ?? false;
}
