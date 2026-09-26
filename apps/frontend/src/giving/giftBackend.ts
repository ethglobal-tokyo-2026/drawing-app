import type { GiftMessage } from "./giftMessage";

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
 * client takes its place. The API backend sends the escrow transfer from the artist's smart account
 * while packing, before LINE's picker opens.
 */
export interface GiftBackend {
  /**
   * Puts the sticker in a new gift and returns the gift message that sends it. API: POST
   * /api/gifts; the server runs createGiftClaim, keeps the claim commitment and puts the gift claim
   * token in the link.
   */
  pack: (sticker: GiftSticker) => Promise<PackedGift>;
  /** Records LINE's picker outcome. A cancellation leaves the sticker in its gift bag. */
  markShared: (giftId: string, outcome: "sent" | "cancelled") => Promise<void>;
  /** Returns the sticker from its gift bag to the sender. */
  takeOut: (giftId: string) => Promise<void>;
}
