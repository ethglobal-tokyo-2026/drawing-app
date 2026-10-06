import { toSticker } from "../api/views";
import { errorDetail, errorMessage, type Problem } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { useMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import { useMyNsfwOptIn, veiledFor } from "./nsfw";

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
  nsfw: boolean;
  /** An NSFW sticker for you without the NSFW opt-in: `url` is the veiled image. */
  veiled: boolean;
}

/** Your stickers not packed or sent as gifts, newest first. */
export function useKeptStickers(): { stickers: KeptSticker[] | null; error: Problem | null } {
  const { t } = useTranslation();
  const board = useMyStickerBoard();
  const optedIn = useMyNsfwOptIn();
  if (board.state === "loading") return { stickers: null, error: null };
  if (board.state === "failed") {
    const reason = errorMessage(board.error);
    return {
      stickers: null,
      error: {
        message: t(($) => $.stickers.keptStickers.notLoaded, { reason }),
        detail: errorDetail(board.error),
      },
    };
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
        nsfw: s.nsfw,
        veiled: veiledFor(s, optedIn),
      };
    })
    .reverse();
  return { stickers, error: null };
}
