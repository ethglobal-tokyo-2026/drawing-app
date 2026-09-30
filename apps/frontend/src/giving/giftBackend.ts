import type { Gift } from "@drawing-app/api/client";
import type { ApiClient, ErrorCode } from "../api/apiClient";
import { ApiError } from "../api/apiClient";
import { currentLanguage } from "../i18n/i18n";
import { forgetMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import { formatNo } from "../stickers/format";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import {
  escrowConfigured,
  giftTransactions,
  GiftTransactionRevertedError,
  GiftTransferError,
  type GiftTransactions,
  type TransactionRecorder,
} from "./giftTransactions";
import { forgetKeptGift, keepGift, keptGift, type KeptGift } from "./keptGifts";

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

/**
 * The sticker's gift message went out, or may have, so packing stops: its Gift Claim Token never
 * goes out twice. `recordError`: LINE said it was sent, but the server still hasn't heard.
 */
export class GiftMessageOutError extends GiftPackagingError {
  readonly outcome: "sent" | "maybeSent";
  readonly recordError: unknown;

  constructor(giftId: string, outcome: "sent" | "maybeSent", recordError?: unknown) {
    super(giftId, `Gift ${giftId}'s message ${outcome === "sent" ? "went" : "may have gone"} out`);
    this.outcome = outcome;
    this.recordError = recordError;
  }
}

/**
 * What packing waits on, for a long wait to say: the app's server, an earlier gift bag that still
 * holds the sticker, the sticker going into the bag, or the bag confirming it's in.
 */
export type PackWait = "asking" | "earlier" | "moving" | "confirming";

/** Where gifts are made and settled. */
export interface GiftBackend {
  /**
   * Puts the sticker in a gift and returns the gift message that sends it. `onWait` hears what it
   * waits on each time that changes.
   */
  pack: (sticker: GiftSticker, onWait?: (wait: PackWait) => void) => Promise<PackedGift>;
  /** LINE, or the giver, said the gift message went out. */
  markSent: (giftId: string) => Promise<void>;
  /** The picker closed or failed without sending; the gift stays in the bag for another try. */
  markCancelled: (giftId: string) => Promise<void>;
  /** LINE didn't say whether the gift message went out, so it's never sent again. */
  markMaybeSent: (giftId: string) => void;
  /** The sticker came back out of the bag. */
  takeOut: (giftId: string) => Promise<void>;
}

interface ApiGiftBackendOptions {
  api: ApiClient;
  /** Whose gifts: what a gift's recovery needs is kept on this device per person. */
  userId: string;
  /** Printed on the gift message: "From @alice". */
  fromHandle: string;
  liffId: string;
  heroUrl?: string;
  transactions?: GiftTransactions;
  /** Who the giver picked in the app, so the gift waits on their board too. */
  forUserId?: string;
}

/**
 * The raw claim token lives only until the page closes; the rest is kept on this device too, for
 * the recovery after a reload. The server remains authoritative for gifts.
 */
interface GiftAttempt extends KeptGift {
  token: string;
  escrowed: boolean;
  /** Packed on this page, so every transaction for it went through this attempt. */
  packedHere: boolean;
}
const attempts = new Map<string, GiftAttempt>();
const packaging = new WeakMap<ApiClient, Map<string, Promise<PackedGift>>>();
const takingOut = new Map<string, Promise<void>>();

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `step`, again a few times while `pending` says its answer may still change. */
async function retrying<T>(step: () => Promise<T>, pending: (error: unknown) => boolean) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await step();
    } catch (error) {
      if (!pending(error) || attempt >= 5) throw error;
      await pause(500 * (attempt + 1));
    }
  }
}

const refusedWith = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;
/** No answer, or the server failing: what was sent may not have landed. */
const unanswered = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);
/** Refusals no later report can change: the gift is gone, closed, or someone else's. */
const FINAL_REFUSALS: ReadonlySet<string> = new Set([
  "gift_not_found",
  "not_yours",
  "gift_closed",
] satisfies ErrorCode[]);
const refusedForGood = (error: unknown) =>
  error instanceof ApiError && FINAL_REFUSALS.has(error.code);

/** A take-out may be on chain: the gift must come out, never go back into LINE. */
const takingOutOnChain = (attempt: KeptGift | undefined) =>
  attempt?.takeOutSentAt !== undefined || attempt?.takeOutHash !== undefined;

/** Gifts on the app's server: packaging, LINE's outcome, and taking a gift back out. */
export function createApiGiftBackend({
  api,
  userId,
  fromHandle,
  liffId,
  heroUrl,
  transactions = giftTransactions,
  forUserId,
}: ApiGiftBackendOptions): GiftBackend {
  const packing = packaging.get(api) ?? new Map<string, Promise<PackedGift>>();
  packaging.set(api, packing);

  /** The gift's attempt on this page, else one from what this device kept of it. */
  const attemptOf = (giftId: string): GiftAttempt | undefined => {
    const current = attempts.get(giftId);
    if (current) return current;
    const kept = keptGift(userId, giftId);
    if (!kept) return undefined;
    const onChain =
      kept.depositSentAt !== undefined || kept.depositHash !== undefined || takingOutOnChain(kept);
    const attempt = {
      ...kept,
      token: "",
      escrowed: onChain || escrowConfigured(),
      packedHere: false,
    };
    attempts.set(giftId, attempt);
    return attempt;
  };
  const update = (giftId: string, attempt: GiftAttempt, change: KeptGift) => {
    Object.assign(attempt, change);
    const { depositSentAt, depositHash, takeOutSentAt, takeOutHash, message } = attempt;
    keepGift(userId, giftId, { depositSentAt, depositHash, takeOutSentAt, takeOutHash, message });
  };
  const settle = (giftId: string) => {
    attempts.delete(giftId);
    forgetKeptGift(userId, giftId);
  };
  const recorder = (
    giftId: string,
    attempt: GiftAttempt,
    step: "deposit" | "takeOut",
    onWait?: (wait: PackWait) => void,
  ): TransactionRecorder => ({
    sending: (at) =>
      update(
        giftId,
        attempt,
        step === "deposit"
          ? { depositSentAt: at, depositHash: undefined }
          : { takeOutSentAt: at, takeOutHash: undefined },
      ),
    submitted: (hash) => {
      update(giftId, attempt, step === "deposit" ? { depositHash: hash } : { takeOutHash: hash });
      if (step === "deposit") onWait?.("confirming");
    },
  });

  const deposit = async (
    giftId: string,
    transfer: { to: string; data: string },
    attempt: GiftAttempt,
    onWait?: (wait: PackWait) => void,
  ) => {
    let reported: Gift;
    try {
      // A deposit sent before a reload only has its confirmation left to wait for.
      onWait?.(attempt.depositHash ? "confirming" : "moving");
      const hash = await transactions.deposit(
        giftId,
        transfer,
        { hash: attempt.depositHash, sentAt: attempt.depositSentAt },
        recorder(giftId, attempt, "deposit", onWait),
      );
      onWait?.("asking");
      reported = await retrying(
        () => api.reportDeposit(giftId, hash ?? undefined),
        refusedWith("deposit_not_landed"),
      );
    } catch (error) {
      if (error instanceof GiftTransactionRevertedError) {
        update(giftId, attempt, { depositSentAt: undefined, depositHash: undefined });
      }
      // The escrow's record isn't this sticker's: the gift closed, and a take-out would revert.
      if (refusedWith("deposit_mismatch")(error)) attempt.escrowed = false;
      throw error;
    }
    // Its sticker came back out on chain before the report, so this gift can't go out.
    if (reported.status !== "packed") {
      throw new GiftTransferError(
        "deposit_came_back",
        `The gift was ${reported.status} after its deposit landed, not packed`,
      );
    }
  };

  const markSent = async (giftId: string) => {
    const attempt = attemptOf(giftId);
    // Kept until the server hears it, so giving the sticker again reports it, not takes it out.
    if (attempt) update(giftId, attempt, { message: "sent" });
    try {
      await retrying(() => api.reportShared(giftId, "sent"), unanswered);
    } catch (error) {
      // Any other refusal, signed out included, leaves the mark for the report to go again.
      if (refusedForGood(error)) settle(giftId);
      throw error;
    }
    settle(giftId);
  };

  const takeOut = (giftId: string, escrowed?: boolean) => {
    const pending = takingOut.get(giftId);
    if (pending) return pending;
    const operation = (async () => {
      const attempt = attemptOf(giftId) ?? {
        token: "",
        escrowed: escrowed ?? escrowConfigured(),
        packedHere: false,
      };
      attempts.set(giftId, attempt);
      if (attempt.escrowed) {
        const neverSent =
          attempt.packedHere &&
          attempt.depositSentAt === undefined &&
          attempt.depositHash === undefined;
        let result: "takenOut" | "neverDeposited" = "neverDeposited";
        try {
          if (!neverSent) {
            result = await transactions.takeOut(
              giftId,
              { hash: attempt.takeOutHash, sentAt: attempt.takeOutSentAt },
              recorder(giftId, attempt, "takeOut"),
              { hash: attempt.depositHash, sentAt: attempt.depositSentAt },
            );
          }
        } catch (error) {
          if (error instanceof GiftTransactionRevertedError) {
            update(giftId, attempt, { takeOutSentAt: undefined, takeOutHash: undefined });
          }
          throw error;
        }
        if (result === "neverDeposited") {
          // The sticker never left the wallet, and the server keeps open a gift whose deposit might
          // still land, so the gift stays packed until it's given again.
          console.info("Gift taken out before its deposit landed", { giftId });
          update(giftId, attempt, { depositSentAt: undefined });
          return;
        }
      }
      await retrying(() => api.takeOutGift(giftId), refusedWith("take_out_not_landed"));
      settle(giftId);
    })().finally(() => takingOut.delete(giftId));
    takingOut.set(giftId, operation);
    return operation;
  };

  /** POST /api/gifts; an earlier gift that still holds the sticker in the escrow comes out first. */
  const packageGift = async (sticker: GiftSticker, onWait?: (wait: PackWait) => void) => {
    onWait?.("asking");
    try {
      return await api.packageGift(sticker.id, forUserId);
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "gift_held" || !error.giftId) throw error;
      const held = error.giftId;
      console.info("Taking out the gift that holds the sticker", {
        giftId: held,
        stickerId: sticker.id,
      });
      onWait?.("earlier");
      try {
        await takeOut(held, true);
      } catch (failure) {
        // Take it out tries that gift again.
        throw new GiftPackagingError(held, failure);
      }
      onWait?.("asking");
      return api.packageGift(sticker.id, forUserId);
    }
  };

  const pack = async (
    sticker: GiftSticker,
    onWait?: (wait: PackWait) => void,
  ): Promise<PackedGift> => {
    let packaged = await packageGift(sticker, onWait);
    forgetMyStickerBoard();
    try {
      const previousAttempt = attemptOf(packaged.gift.id);
      if (previousAttempt?.message) {
        const recordError =
          previousAttempt.message === "sent"
            ? await markSent(packaged.gift.id).then(
                () => undefined,
                (error: unknown) => error,
              )
            : undefined;
        throw new GiftMessageOutError(packaged.gift.id, previousAttempt.message, recordError);
      }
      // Already in the bag from an earlier visit: its Gift Claim Token left with that page, so the
      // gift comes out and goes back in with a new one.
      const outOnChain = takingOutOnChain(previousAttempt);
      if (outOnChain || (packaged.giftClaimToken === null && !previousAttempt?.token)) {
        console.info("Gift packaging recovery started", {
          giftId: packaged.gift.id,
          stickerId: sticker.id,
        });
        if (packaged.escrowTransfer !== null && !outOnChain) {
          const recovery = previousAttempt ?? { token: "", escrowed: true, packedHere: false };
          attempts.set(packaged.gift.id, recovery);
          // The old deposit lands before it comes out, and one sent before a reload is waited for:
          // closing a missing deposit in the database could strand a transaction that lands later.
          await deposit(packaged.gift.id, packaged.escrowTransfer, recovery, onWait);
        }
        onWait?.("earlier");
        await takeOut(packaged.gift.id, packaged.escrowTransfer !== null || escrowConfigured());
        packaged = await packageGift(sticker, onWait);
      }
      const { gift, giftClaimToken, escrowTransfer } = packaged;
      const previous = attempts.get(gift.id);
      const token = giftClaimToken ?? previous?.token;
      if (!token) {
        throw new GiftTransferError(
          "no_link",
          `${formatNo(sticker.no)} is in a gift the server gave no link for`,
        );
      }
      const attempt = previous ?? {
        token,
        escrowed: escrowTransfer !== null,
        packedHere: giftClaimToken !== null,
      };
      attempts.set(gift.id, attempt);
      if (escrowTransfer !== null) {
        await deposit(gift.id, escrowTransfer, attempt, onWait);
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
      throw error instanceof GiftPackagingError
        ? error
        : new GiftPackagingError(packaged.gift.id, error);
    }
  };
  return {
    pack: (sticker, onWait) => {
      const pending = packing.get(sticker.id);
      if (pending) return pending;
      const operation = pack(sticker, onWait).finally(() => packing.delete(sticker.id));
      packing.set(sticker.id, operation);
      return operation;
    },
    markSent,
    markCancelled: async (giftId) => void (await api.reportShared(giftId, "cancelled")),
    markMaybeSent: (giftId) => {
      const attempt = attemptOf(giftId);
      if (attempt) update(giftId, attempt, { message: "maybeSent" });
    },
    takeOut,
  };
}
