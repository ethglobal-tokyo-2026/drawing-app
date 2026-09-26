import type { ApiClient } from "../api/apiClient";
import { ApiError } from "../api/apiClient";
import type { Hash } from "viem";
import { currentLanguage } from "../i18n/i18n";
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

/** Preparation failed after allocation; Taking out must still be able to identify this gift. */
export class GiftPackagingError extends Error {
  readonly giftId: string;

  constructor(giftId: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.giftId = giftId;
  }
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
  /** Who the giver picked in the app, so the gift waits on their board too. */
  forUserId?: string;
}

// The raw claim token lives only until the page closes. The server remains authoritative for gifts.
interface GiftAttempt {
  token: string;
  escrowed: boolean;
  depositHash?: Hash;
  takeOutHash?: Hash;
  takingOut?: boolean;
}
const attempts = new Map<string, GiftAttempt>();
const packaging = new WeakMap<ApiClient, Map<string, Promise<PackedGift>>>();
const takingOut = new Map<string, Promise<void>>();

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function confirmStep(
  step: () => Promise<unknown>,
  pendingCode: "deposit_not_landed" | "take_out_not_landed",
) {
  for (let attempt = 0; ; attempt++) {
    try {
      await step();
      return;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== pendingCode || attempt >= 5) {
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
  forUserId,
}: ApiGiftBackendOptions): GiftBackend {
  const packing = packaging.get(api) ?? new Map<string, Promise<PackedGift>>();
  packaging.set(api, packing);
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
      await confirmStep(() => api.reportDeposit(giftId, hash ?? undefined), "deposit_not_landed");
    } catch (error) {
      if (error instanceof GiftTransactionRevertedError) attempt.depositHash = undefined;
      throw error;
    }
  };
  const takeOut = (giftId: string, escrowed = attempts.get(giftId)?.escrowed) => {
    const pending = takingOut.get(giftId);
    if (pending) return pending;
    const operation = (async () => {
      const attempt = attempts.get(giftId) ?? { token: "", escrowed: Boolean(escrowed) };
      attempts.set(giftId, attempt);
      attempt.takingOut = true;
      if (attempt.escrowed) {
        try {
          await transactions.takeOut(
            giftId,
            (hash) => {
              attempt.takeOutHash = hash;
            },
            attempt.takeOutHash,
            attempt.depositHash,
          );
        } catch (error) {
          if (error instanceof GiftTransactionRevertedError) attempt.takeOutHash = undefined;
          throw error;
        }
      }
      await confirmStep(() => api.takeOutGift(giftId), "take_out_not_landed");
      attempts.delete(giftId);
    })().finally(() => takingOut.delete(giftId));
    takingOut.set(giftId, operation);
    return operation;
  };
  const pack = async (sticker: GiftSticker): Promise<PackedGift> => {
    let packaged = await api.packageGift(sticker.id, forUserId);
    try {
      // Already in the bag from an earlier visit: its Gift Claim Token left with that page, so the
      // gift comes out and goes back in with a new one.
      const previousAttempt = attempts.get(packaged.gift.id);
      if (
        previousAttempt?.takingOut ||
        (packaged.giftClaimToken === null && !previousAttempt?.token)
      ) {
        console.info("Gift packaging recovery started", {
          giftId: packaged.gift.id,
          stickerId: sticker.id,
        });
        if (packaged.escrowTransfer !== null && !previousAttempt?.takingOut) {
          const recovery = previousAttempt ?? { token: "", escrowed: true };
          attempts.set(packaged.gift.id, recovery);
          // Settle the old deposit before taking it out, including one broadcast before a reload.
          // Closing a missing deposit in the database could strand a transaction that lands later.
          await deposit(packaged.gift.id, packaged.escrowTransfer, recovery);
        }
        await takeOut(
          packaged.gift.id,
          packaged.escrowTransfer !== null || Boolean(import.meta.env.VITE_STICKER_ESCROW_ADDRESS),
        );
        packaged = await api.packageGift(sticker.id, forUserId);
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
        language: currentLanguage(),
      });
      return { giftId: gift.id, message };
    } catch (error) {
      throw new GiftPackagingError(packaged.gift.id, error);
    }
  };
  return {
    pack: (sticker) => {
      const pending = packing.get(sticker.id);
      if (pending) return pending;
      const operation = pack(sticker).finally(() => packing.delete(sticker.id));
      packing.set(sticker.id, operation);
      return operation;
    },
    markSent: async (giftId) => void (await api.reportShared(giftId, "sent")),
    markCancelled: async (giftId) => void (await api.reportShared(giftId, "cancelled")),
    takeOut,
  };
}
