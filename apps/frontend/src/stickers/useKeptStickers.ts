import { useApiQuery } from "../api/useApiQuery";
import { toSticker } from "../api/views";

export interface KeptSticker {
  id: string;
  no: number;
  /** When it was sealed, in milliseconds. */
  createdAt: number;
  timeUsed: number;
  width: number;
  height: number;
  /** Its image. */
  url: string;
}

/** Your stickers not packed or sent as gifts, newest first. */
export function useKeptStickers() {
  const board = useApiQuery("sticker-board/me", (api) => api.stickerBoard());
  if (board.state === "loading") return { stickers: null, error: null };
  if (board.state === "failed") {
    return { stickers: null, error: `Couldn’t load your stickers: ${board.error.message}` };
  }
  const stickers = board.data.boardStickers
    .filter((b) => b.held && !b.openGift)
    .map((b): KeptSticker => {
      const s = toSticker(b.sticker);
      return {
        id: s.id,
        no: s.no,
        createdAt: s.sealedAt,
        timeUsed: s.timeUsed,
        width: s.width,
        height: s.height,
        url: s.urls.png,
      };
    })
    .reverse();
  return { stickers, error: null };
}
