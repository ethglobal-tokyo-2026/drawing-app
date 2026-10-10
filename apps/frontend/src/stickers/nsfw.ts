import { useContext } from "react";
import { MeContext } from "../api/meContext";
import type { StickerUrls } from "./stickerUrls";

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

/** An image of nothing: what an NSFW sticker shows while its drawing waits for a load under your opt-in now. */
const NO_DRAWING = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Stickers whose images were picked for the other NSFW opt-in, as they may show: each NSFW one
 * without its drawing or its sharp copy, since the browser keeps a drawing it has shown and the blur
 * is the server's.
 */
export const withoutNsfwDrawings = <S extends { nsfw: boolean; urls: StickerUrls }>(
  stickers: readonly S[],
): S[] =>
  stickers.map((s) => {
    if (!s.nsfw) return s;
    const { sharp: _sharp, ...urls } = s.urls;
    return { ...s, urls: { ...urls, png: NO_DRAWING } };
  });

/** A query's key, for an answer the server shapes by your NSFW opt-in: a change loads it again, and the other's answer never shows. */
export const useNsfwOptInKey = (key: string): string =>
  `${key}?nsfw=${useMyNsfwOptIn() ? "on" : "off"}`;
