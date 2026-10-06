import type { SignedTransaction, SponsoredTransaction } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { ApiError } from "../api/apiClient";
import { currentLanguage } from "../i18n/i18n";
import { forgetMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import { formatNo } from "../stickers/format";
import { buildGiftMessage, type GiftMessage } from "./giftMessage";
import { forgetKeptGift, keepGift, keptGift } from "./keptGifts";
import { refusedForGood } from "./sentReports";

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

/** Why a packed gift can't go out; the catalog's `giving.transferProblem` says each in plain words. */
export type GiftTransferProblem = "no_link";

/**
 * A packed gift can't go out. `problem` is what the screen says; the message is the developer's
 * English detail, shown as fine print after it.
 */
export class GiftTransferError extends Error {
  readonly problem: GiftTransferProblem;

  constructor(problem: GiftTransferProblem, detail: string) {
    super(detail);
    this.name = "GiftTransferError";
    this.problem = problem;
  }
}

/**
 * What packing waits on, for a long wait to say: the app's server, an earlier gift bag that still
 * holds the sticker, or the sticker going into the bag.
 */
export type PackWait = "asking" | "earlier" | "moving";

/** Signs a transaction the server built, as its sender. */
export type SignSponsored = (tx: SponsoredTransaction) => Promise<SignedTransaction>;

/** The person's Sui wallet. Sui's SDK loads with the first gift it signs, not with the app. */
const signWithSuiWallet: SignSponsored = async (tx) =>
  (await import("../identity/suiSigner")).signSponsored(tx);

/** Where gifts are made and settled. */
export interface GiftBackend {
  /**
   * Puts the sticker in a gift and returns the gift message that sends it. `onWait` hears what it
   * waits on each time that changes.
   */
  pack: (sticker: GiftSticker, onWait?: (wait: PackWait) => void) => Promise<PackedGift>;
  /** LINE, or the giver, said the gift message went out. */
  markSent: (giftId: string) => Promise<void>;
  /**
   * The picker closed, or failed before it opened, without sending: the gift stays in the bag for
   * another try, and its maybe-sent mark goes.
   */
  markCancelled: (giftId: string) => Promise<void>;
  /**
   * LINE's picker may send the gift message from now on. Kept, so until a cancel clears it the gift
   * message is never sent again, even after a reload.
   */
  markMaybeSent: (giftId: string) => void;
  /** The sticker came back out of the bag. */
  takeOut: (giftId: string) => Promise<void>;
}

interface ApiGiftBackendOptions {
  api: ApiClient;
  /** Whose gifts: whether a gift's message went out is kept on this device per person. */
  userId: string;
  /** Printed on the gift message: "From @alice". */
  fromHandle: string;
  liffId: string;
  heroUrl?: string;
  /** Who the giver picked in the app, so the gift waits on their board too. */
  forUserId?: string;
  /** Signs the deposits and take-outs the server builds; the person's Sui wallet unless a test gives its own. */
  sign?: SignSponsored;
}

/** Each gift's Gift Claim Token, from packing it on this page; it's never kept anywhere else. */
const tokens = new Map<string, string>();
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

/** Gifts on the app's server: packaging, LINE's outcome, and taking a gift back out. */
export function createApiGiftBackend({
  api,
  userId,
  fromHandle,
  liffId,
  heroUrl,
  forUserId,
  sign = signWithSuiWallet,
}: ApiGiftBackendOptions): GiftBackend {
  const packing = packaging.get(api) ?? new Map<string, Promise<PackedGift>>();
  packaging.set(api, packing);

  const settle = (giftId: string) => {
    tokens.delete(giftId);
    forgetKeptGift(userId, giftId);
  };

  /** Signs the deposit the server built and reports it: the server submits it and waits for Sui. */
  const deposit = async (
    giftId: string,
    sponsored: SponsoredTransaction,
    onWait?: (wait: PackWait) => void,
  ) => {
    onWait?.("moving");
    const signed = await sign(sponsored);
    onWait?.("asking");
    const reported = await api.reportDeposit(giftId, signed);
    // Taken out elsewhere before its deposit landed, so this gift can't go out.
    if (reported.status !== "packed") {
      throw new Error(`Gift ${giftId} was ${reported.status} once its deposit landed, not packed`);
    }
  };

  const markSent = async (giftId: string) => {
    // Kept until the server hears it, so giving the sticker again reports it, not takes it out.
    keepGift(userId, giftId, { message: "sent" });
    try {
      await retrying(() => api.reportShared(giftId, "sent"), unanswered);
    } catch (error) {
      // Any other refusal, signed out included, leaves the mark for the report to go again.
      if (refusedForGood(error)) settle(giftId);
      throw error;
    }
    settle(giftId);
  };

  const takeOut = (giftId: string) => {
    const pending = takingOut.get(giftId);
    if (pending) return pending;
    const operation = (async () => {
      // The server answers a take-out for the giver's wallet to sign, or none when the sticker
      // never went into the escrow.
      const { takeOut: sponsored } = await api.startTakeOut(giftId);
      if (sponsored) await api.takeOutGift(giftId, await sign(sponsored));
      settle(giftId);
    })().finally(() => takingOut.delete(giftId));
    takingOut.set(giftId, operation);
    return operation;
  };

  /** `again`: the deposit's sponsorship may lapse once more before the pack gives up. */
  const pack = async (
    sticker: GiftSticker,
    onWait: ((wait: PackWait) => void) | undefined,
    again: boolean,
  ): Promise<PackedGift> => {
    onWait?.("asking");
    let packaged = await api.packageGift(sticker.id, forUserId);
    forgetMyStickerBoard();
    try {
      const sent = keptGift(userId, packaged.gift.id)?.message;
      if (sent) {
        const recordError =
          sent === "sent"
            ? await markSent(packaged.gift.id).then(
                () => undefined,
                (error: unknown) => error,
              )
            : undefined;
        throw new GiftMessageOutError(packaged.gift.id, sent, recordError);
      }
      // Already in the bag from an earlier page: its Gift Claim Token left with that page, so the
      // gift comes out and goes back in with a new one.
      if (packaged.giftClaimToken === null && !tokens.has(packaged.gift.id)) {
        console.info("Gift packaging recovery started", {
          giftId: packaged.gift.id,
          stickerId: sticker.id,
        });
        onWait?.("earlier");
        await takeOut(packaged.gift.id);
        onWait?.("asking");
        packaged = await api.packageGift(sticker.id, forUserId);
      }
      const { gift } = packaged;
      const token = packaged.giftClaimToken ?? tokens.get(gift.id);
      if (!token) {
        throw new GiftTransferError(
          "no_link",
          `${formatNo(sticker.no)} is in a gift the server gave no link for`,
        );
      }
      tokens.set(gift.id, token);
      if (packaged.deposit) {
        try {
          await deposit(gift.id, packaged.deposit, onWait);
        } catch (error) {
          // Signed after its sponsorship lapsed: the server sponsors a fresh deposit for the gift.
          if (!again || !refusedWith("sponsorship_expired")(error)) throw error;
          return await pack(sticker, onWait, false);
        }
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
      const operation = pack(sticker, onWait, true).finally(() => packing.delete(sticker.id));
      packing.set(sticker.id, operation);
      return operation;
    },
    markSent,
    markCancelled: async (giftId) => {
      // Nothing went out, so the same gift message can go into LINE again.
      if (keptGift(userId, giftId)?.message === "maybeSent") forgetKeptGift(userId, giftId);
      await api.reportShared(giftId, "cancelled");
    },
    markMaybeSent: (giftId) => keepGift(userId, giftId, { message: "maybeSent" }),
    takeOut,
  };
}
