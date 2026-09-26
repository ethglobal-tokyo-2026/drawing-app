import type { ApiClient } from "../api/apiClient";
import { formatNo } from "../stickers/format";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";

/** The sticker a gift carries. */
export interface GiftSticker {
  id: string;
  /** Its running number, so errors can say which sticker. */
  no: number;
  /** Seconds it took to draw; the gift message prints it. */
  timeUsed: number;
}

export interface PackedGift {
  giftId: string;
  /** What LINE's picker sends. */
  message: GiftMessage;
}

/** Where gifts are made and settled. */
export interface GiftBackend {
  /** Puts the sticker in a gift and returns the gift message that sends it. */
  pack: (sticker: GiftSticker) => Promise<PackedGift>;
  /** LINE reported the gift message sent. */
  markSent: (giftId: string) => Promise<void>;
  /** The picker closed or failed without sending; the gift stays in the bag for another try. */
  markCancelled: (giftId: string) => Promise<void>;
  /** The sticker came back out of the bag. */
  takeOut: (giftId: string) => Promise<void>;
}

interface ApiGiftBackendOptions {
  api: ApiClient;
  /** Printed on the gift message: "From @alice". */
  fromHandle: string;
  liffId: string;
  heroUrl?: string;
}

/** Gifts on the app's server: packaging, LINE's outcome, and taking a gift back out. */
export function createApiGiftBackend({
  api,
  fromHandle,
  liffId,
  heroUrl,
}: ApiGiftBackendOptions): GiftBackend {
  return {
    pack: async (sticker) => {
      let packaged = await api.packageGift(sticker.id);
      // Already in the bag from an earlier visit: its Gift Claim Token left with that page, so the
      // gift comes out and goes back in with a new one.
      if (packaged.giftClaimToken === null) {
        await api.takeOutGift(packaged.gift.id);
        packaged = await api.packageGift(sticker.id);
      }
      const { gift, giftClaimToken, escrowTransfer } = packaged;
      if (giftClaimToken === null) {
        throw new Error(`${formatNo(sticker.no)} is in a gift the server gave no link for`);
      }
      if (escrowTransfer !== null) {
        await api.takeOutGift(gift.id);
        throw new Error(
          "Sending a sticker into the escrow needs your smart wallet, which the app can't send from yet",
        );
      }
      const message = buildGiftMessage({
        liffId,
        giftClaimToken,
        fromHandle,
        timeUsed: sticker.timeUsed,
        heroUrl,
      });
      return { giftId: gift.id, message };
    },
    markSent: async (giftId) => void (await api.reportShared(giftId, "sent")),
    markCancelled: async (giftId) => void (await api.reportShared(giftId, "cancelled")),
    takeOut: async (giftId) => void (await api.takeOutGift(giftId)),
  };
}
