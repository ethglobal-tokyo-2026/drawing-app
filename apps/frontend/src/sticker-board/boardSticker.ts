import type { Placement, StickerRecord } from "../stickers/stickerStorage";

/** A stored sticker as the board shows it: with an object URL for its image and a settled placement. */
export interface BoardSticker extends StickerRecord {
  url: string;
  placement: Placement;
}
