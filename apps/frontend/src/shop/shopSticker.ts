import type { StickerBoard } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";
import { toSticker } from "../api/views";
import type { StickerUrls } from "../stickers/stickerUrls";
import sampleMask from "./sample-sticker/mask.png";
import samplePng from "./sample-sticker/sticker.png";
import sampleRim from "./sample-sticker/rim.png";
import sampleSpec from "./sample-sticker/spec.png";

/** A sticker the Shop's laminate and backing foil previews wear. */
export interface ShopSticker {
  urls: StickerUrls & { mask: string };
  width: number;
  height: number;
  /** Staggers its foil's bands, as on a board. */
  no: number;
}

/** A cat drawn and sealed with the app's own brush, fill and cut, for artists with no sticker yet. */
const SAMPLE_STICKER: ShopSticker = {
  urls: { png: samplePng, mask: sampleMask, spec: sampleSpec, rim: sampleRim },
  width: 374,
  height: 384,
  no: 0,
};

/** The newest sticker you drew and still hold, with the mask its finishes need; null when there's none. */
function newestOwnSticker(board: StickerBoard): ShopSticker | null {
  let newest: (ShopSticker & { sealedAt: number }) | null = null;
  for (const b of board.boardStickers) {
    if (!b.held || b.sticker.artist.id !== board.owner.id) continue;
    const s = toSticker(b.sticker);
    const { mask } = s.urls;
    if (!mask || (newest && s.sealedAt <= newest.sealedAt)) continue;
    newest = {
      urls: { ...s.urls, mask },
      width: s.width,
      height: s.height,
      no: s.no,
      sealedAt: s.sealedAt,
    };
  }
  return newest;
}

/**
 * The sticker the Shop's previews wear: your newest, or the sample when you have none. Null while
 * your board loads, so no stand-in shows first and then turns into yours.
 */
export function useShopSticker(): ShopSticker | null {
  const board = useApiQuery("sticker-board/me", (api) => api.stickerBoard());
  if (board.state === "loading") return null;
  // The previews are decoration and useApiQuery logs the failure, so the sample stands in.
  if (board.state === "failed") return SAMPLE_STICKER;
  return newestOwnSticker(board.data) ?? SAMPLE_STICKER;
}
