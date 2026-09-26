import type { PendingGifts } from "@drawing-app/api/client";
import { toMs } from "../api/views";

export type StickerGiftStatus =
  | { giftId: string; state: "packed"; packedAt: number }
  | { giftId: string; state: "sent"; packedAt: number; sentAt: number };

/** Each of your stickers that's packed in a gift or on its way, from your pending gifts. */
export function giftStatusBySticker(pending: PendingGifts): Map<string, StickerGiftStatus> {
  return new Map(
    pending.gifts.map(({ gift }): [string, StickerGiftStatus] => [
      gift.stickerId,
      gift.status === "sent" && gift.sentAt
        ? {
            giftId: gift.id,
            state: "sent",
            packedAt: toMs(gift.packedAt),
            sentAt: toMs(gift.sentAt),
          }
        : { giftId: gift.id, state: "packed", packedAt: toMs(gift.packedAt) },
    ]),
  );
}
