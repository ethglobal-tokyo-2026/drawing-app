import type { GiftMessage } from "./giftMessage";
import type { NotSentReason } from "./giftStore";

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

/**
 * Where gifts are made and settled. localGiftBackend.ts keeps them on this device until an API
 * client takes its place. The escrow transfer (sticker-chain's prepareGiftTransfer, sent by the
 * artist's smart account) belongs in pack or in markSent; which one is still open, because in pack
 * a cancelled picker leaves the sticker in escrow.
 */
export interface GiftBackend {
  /**
   * Puts the sticker in a new gift and returns the gift message that sends it. API: POST
   * /api/gifts; the server runs createGiftClaim, keeps the claim commitment and puts the gift claim
   * token in the link.
   */
  pack: (sticker: GiftSticker) => Promise<PackedGift>;
  /** LINE reported the gift message sent. API: POST /api/gifts/:id/shared. */
  markSent: (giftId: string) => Promise<void>;
  /** The gift message never left, so the sticker is back. API: POST /api/gifts/:id/shared { cancelled }. */
  markNotSent: (giftId: string, reason: NotSentReason, error?: string) => Promise<void>;
}
