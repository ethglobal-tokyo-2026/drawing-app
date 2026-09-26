import type { ApiClient } from "../api/apiClient";
import { ApiError } from "../api/apiClient";
import type { Hash } from "viem";
import { formatNo } from "../stickers/format";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import {
  giftTransactions,
  GiftTransactionRevertedError,
  type GiftTransactions,
} from "./giftTransactions";

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
  transactions?: GiftTransactions;
}

// The raw claim token lives only until the page closes. The server remains authoritative for gifts.
const attempts = new Map<string, { token: string; escrowed: boolean; depositHash?: Hash }>();

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function confirmDeposit(api: ApiClient, giftId: string, hash?: Hash) {
  for (let attempt = 0; ; attempt++) {
    try {
      await api.reportDeposit(giftId, hash);
      return;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "deposit_not_landed" || attempt >= 5) {
        throw error;
      }
      await pause(500 * (attempt + 1));
    }
  }
}

/** Gifts on the app's server: packaging, LINE's outcome, and taking a gift back out. */
export function createApiGiftBackend({
  api,
  fromHandle,
  liffId,
  heroUrl,
  transactions = giftTransactions,
}: ApiGiftBackendOptions): GiftBackend {
  const deposit = async (
    giftId: string,
    transfer: { to: string; data: string },
    attempt: { depositHash?: Hash },
  ) => {
    try {
      const hash = await transactions.deposit(
        giftId,
        transfer,
        (hash) => {
          attempt.depositHash = hash;
        },
        attempt.depositHash,
      );
      await confirmDeposit(api, giftId, hash ?? undefined);
    } catch (error) {
      if (error instanceof GiftTransactionRevertedError) attempt.depositHash = undefined;
      throw error;
    }
  };
  const takeOut = async (giftId: string, escrowed = attempts.get(giftId)?.escrowed) => {
    if (escrowed) await transactions.takeOut(giftId, attempts.get(giftId)?.depositHash);
    await api.takeOutGift(giftId);
    attempts.delete(giftId);
  };
  return {
    pack: async (sticker) => {
      let packaged = await api.packageGift(sticker.id);
      // Already in the bag from an earlier visit: its Gift Claim Token left with that page, so the
      // gift comes out and goes back in with a new one.
      if (packaged.giftClaimToken === null && !attempts.get(packaged.gift.id)?.token) {
        if (packaged.escrowTransfer !== null) {
          const recovery = attempts.get(packaged.gift.id) ?? { token: "", escrowed: true };
          attempts.set(packaged.gift.id, recovery);
          // Settle the old deposit before taking it out, including one broadcast before a reload.
          // Closing a missing deposit in the database could strand a transaction that lands later.
          await deposit(packaged.gift.id, packaged.escrowTransfer, recovery);
        }
        await takeOut(
          packaged.gift.id,
          packaged.escrowTransfer !== null || Boolean(import.meta.env.VITE_STICKER_ESCROW_ADDRESS),
        );
        packaged = await api.packageGift(sticker.id);
      }
      const { gift, giftClaimToken, escrowTransfer } = packaged;
      const previous = attempts.get(gift.id);
      const token = giftClaimToken ?? previous?.token;
      if (!token) {
        throw new Error(`${formatNo(sticker.no)} is in a gift the server gave no link for`);
      }
      const attempt = previous ?? { token, escrowed: escrowTransfer !== null };
      attempts.set(gift.id, attempt);
      if (escrowTransfer !== null) {
        await deposit(gift.id, escrowTransfer, attempt);
      }
      const message = buildGiftMessage({
        liffId,
        giftClaimToken: token,
        fromHandle,
        no: sticker.no,
        timeUsed: sticker.timeUsed,
        heroUrl,
      });
      return { giftId: gift.id, message };
    },
    markSent: async (giftId) => void (await api.reportShared(giftId, "sent")),
    markCancelled: async (giftId) => void (await api.reportShared(giftId, "cancelled")),
    takeOut,
  };
}
