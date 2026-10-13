import { problemOf, type Problem } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { PickerSendError } from "../line/friendPicker";
import { formatNo } from "../stickers/format";
import {
  GiftMessageOutError,
  GiftPackagingError,
  GiftTransferError,
  type GiftBackend,
  type GiftSticker,
  type PackedGift,
  type PackWait,
} from "./giftBackend";
import type { GiftSender, GiftSendOutcome } from "./giftSender";

/** A wait for the gift bag that runs this long is a slow one: the screen says what it waits on and offers Take it out. */
export const PREPARING_SLOW_MS = 10_000;
/** LIFF stops waiting on LINE's picker after ten minutes, so an answer missing past this won't come. */
export const PICKER_ANSWER_MS = 11 * 60_000;
/** What the wait for the gift bag says of itself. */
interface PackingWait {
  /** What it waits on now, once the backend has said. */
  wait?: PackWait;
  /** It has run past PREPARING_SLOW_MS. */
  slow?: true;
}

/**
 * Giving through a LINE chat, from packing to "Closed and sent" or back out of the bag. `recordError`
 * means the step happened but the server couldn't record it; the gift may still read as packed.
 */
type GiveFlowStep =
  /** The bag animation has started while the sticker is prepared. Giving opens on it. */
  | ({ step: "packed" } & PackingWait)
  /** Waiting for the sticker to be ready before opening LINE's picker. */
  | ({ step: "preparing" } & PackingWait)
  /** The gift and message attempt are acknowledged; a fresh Send in LINE press opens the picker. */
  | { step: "ready"; cancelled?: true; error?: Problem }
  /** Waiting for LINE's confirmed send or cancellation. */
  | { step: "picking" }
  | { step: "sent"; sentAt: number; recordError?: Problem; retryError?: Problem }
  /** An unresolved LINE send can be replaced explicitly without a separate take-out step. */
  | { step: "maybeSent"; error: Problem; recordError?: Problem; retryError?: Problem }
  /** Replacing the earlier link before preparing a fresh gift. */
  | ({ step: "retrying" } & PackingWait)
  | { step: "failed"; error: Problem; recordError?: Problem }
  /** The sticker lifts back out of the bag. */
  | { step: "takingOut" }
  /** The sticker is back out of the bag, and Giving closes. */
  | { step: "takenOut" };

export type GiveFlowState = GiveFlowStep & {
  storageError?: Problem;
  packedForUserId?: string | null;
};

export interface GiveFlowOptions {
  sticker: GiftSticker;
  backend: GiftBackend;
  sender: GiftSender;
  /** How long taking the sticker out of the bag plays. */
  takeOutMs: number;
  now?: () => number;
  report?: (message: string, error: unknown) => void;
}

export interface GiveFlow {
  getState: () => GiveFlowState;
  subscribe: (listener: () => void) => () => void;
  /** Give: prepares the gift and acknowledges its message attempt. Only the flow's first step. */
  give: () => void;
  /** Opens LINE synchronously from ready; a failed preparation only prepares it again. */
  sendInLine: () => void;
  /** Replaces an uncertain gift link and prepares a fresh gift for a separate Send in LINE tap. */
  retry: () => void;
  takeOut: () => void;
  /** Closes the flow. A gift message already in LINE's hands still records its outcome. */
  dispose: () => void;
}

/**
 * One gift, from packing until it's sent or taken out. A cancelled or failed picker leaves it in
 * the bag, open, so Send in LINE sends the same gift.
 */
interface Attempt {
  gift: Promise<PackedGift>;
  open: boolean;
  packed?: PackedGift;
  messageAttemptId?: string;
  beginning?: Promise<void>;
  pickerStarted: boolean;
  takingOut?: true;
  /** Its link was closed by replacement; late LINE answers cannot revive it. */
  retired?: true;
  /** A late LINE confirmation retained while replacement is still waiting on its result. */
  sent?: { sentAt: number; recordError?: Problem };
}

/** A picker report always names the attempt that was acknowledged before it. */
function messageAttemptId(a: Attempt): string {
  if (!a.messageAttemptId) throw new Error("The Gift Message attempt was not recorded");
  return a.messageAttemptId;
}

/**
 * Why a step failed, as the screen says it: the cause in plain words in the app's language, and the
 * developer's English detail apart from it.
 */
const describe = (error: unknown): Problem =>
  error instanceof GiftPackagingError
    ? describe(error.cause)
    : error instanceof GiftTransferError
      ? {
          message: i18next.t(($) => $.giving.transferProblem[error.problem]),
          detail: error.message,
        }
      : error instanceof PickerSendError
        ? {
            message: i18next.t(($) => $.giving.lineSendError.pickerFailed),
            detail: error.detail,
          }
        : problemOf(error);

/**
 * What an attempt's packing came to: the gift that holds the sticker, null when packing failed before
 * any did, and the news that its gift message went out, or may have, when an earlier send of it did.
 */
async function packingOf(a: Attempt) {
  try {
    return { giftId: (await a.gift).giftId, messageOut: null };
  } catch (error) {
    return {
      giftId: error instanceof GiftPackagingError ? error.giftId : null,
      messageOut: error instanceof GiftMessageOutError ? error : null,
    };
  }
}

export function createGiveFlow({
  sticker,
  backend,
  sender,
  takeOutMs,
  now = Date.now,
  report = console.error,
}: GiveFlowOptions): GiveFlow {
  const which = formatNo(sticker.no);
  const lineSendProblem = (cause?: unknown): Problem =>
    cause instanceof PickerSendError
      ? describe(cause)
      : {
          message: i18next.t(($) => $.giving.lineSendError.message, { no: which }),
          ...(cause !== undefined && { detail: describe(cause).detail }),
        };
  const listeners = new Set<() => void>();
  let state: GiveFlowState = { step: "packed" };
  let attempt: Attempt | null = null;
  let packedForUserId: string | null | undefined;
  /** The picker the flow waits on, until LINE answers or the flow stops waiting. */
  let waiting: { a: Attempt; giftId: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  /** What the wait for the gift bag says of itself; it lasts until the flow leaves that wait. */
  let packing: PackingWait = {};
  let slowTimer: ReturnType<typeof setTimeout> | undefined;

  const clearSlowTimer = () => {
    clearTimeout(slowTimer);
    slowTimer = undefined;
  };
  const set = (next: GiveFlowState) => {
    if (disposed) return;
    if (next.step !== "packed" && next.step !== "preparing" && next.step !== "retrying") {
      clearSlowTimer();
      packing = {};
    }
    const storageError = backend.storageError?.();
    state = {
      ...next,
      ...(packedForUserId !== undefined && { packedForUserId }),
      ...(storageError && { storageError: describe(storageError) }),
    };
    listeners.forEach((l) => l());
  };
  const packingState = (step: "packed" | "preparing" | "retrying"): GiveFlowState => ({
    step,
    ...packing,
  });
  const packingChanged = (change: PackingWait) => {
    packing = { ...packing, ...change };
    if (state.step === "packed" || state.step === "preparing" || state.step === "retrying")
      set(packingState(state.step));
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const after = (ms: number, run: () => void) => {
    clearTimer();
    if (disposed) return;
    timer = setTimeout(() => {
      timer = undefined;
      run();
    }, ms);
  };
  const inTheBag = () =>
    state.step === "packed" || state.step === "ready" || state.step === "failed";

  /** Runs a backend write; on failure, reports it and returns why. */
  const record = async (what: string, write: () => Promise<void>) => {
    try {
      await write();
      return undefined;
    } catch (error) {
      report(`${which}: ${what} couldn’t be recorded`, error);
      return describe(error);
    }
  };

  /** Closing before LINE was called cancels only the unused message attempt, never the NFT. */
  const cancelUnused = async (a: Attempt) => {
    const packed = a.packed;
    const id = a.messageAttemptId;
    if (!packed || !id || a.pickerStarted || a.takingOut) return;
    // Preparation reports a rejected begin; cancellation still checks whether that ID reached the server.
    if (a.beginning) await Promise.allSettled([a.beginning]);
    const error = await record("the unused message attempt", () =>
      backend.markCancelled(packed.giftId, id),
    );
    if (!error) a.messageAttemptId = undefined;
  };

  const startAttempt = (): Attempt => {
    packing = {};
    clearSlowTimer();
    slowTimer = setTimeout(() => {
      slowTimer = undefined;
      packingChanged({ slow: true });
    }, PREPARING_SLOW_MS);
    attempt = {
      gift: backend.pack(sticker, (wait) => packingChanged({ wait })),
      open: true,
      pickerStarted: false,
    };
    return attempt;
  };

  /** The attempt's gift message went out, or may have: the screen says so, and it isn't sent again. */
  const showMessageOut = (a: Attempt, error: GiftMessageOutError) => {
    if (attempt !== a) return;
    a.messageAttemptId = error.attemptId;
    clearTimer();
    set(
      error.outcome === "sent"
        ? {
            step: "sent",
            sentAt: now(),
            ...(error.recordError !== undefined && { recordError: describe(error.recordError) }),
          }
        : {
            step: "maybeSent",
            error: lineSendProblem(error),
            ...(error.recordError !== undefined && { recordError: describe(error.recordError) }),
          },
    );
  };

  /** The attempt's gift, or null when it couldn’t be packed; that failure shows once. */
  const packedGift = async (a: Attempt): Promise<PackedGift | null> => {
    try {
      const packed = await a.gift;
      if (attempt === a) packedForUserId = packed.forUserId;
      return packed;
    } catch (error) {
      if (attempt === a && error instanceof GiftPackagingError) packedForUserId = error.forUserId;
      if (a.open) {
        a.open = false;
        if (error instanceof GiftMessageOutError) {
          showMessageOut(a, error);
          return null;
        }
        report(`${which} couldn’t be packed`, error);
        if (attempt === a) {
          clearTimer();
          const cause = describe(error);
          set({
            step: "failed",
            error: {
              message: i18next.t(($) => $.giving.inTheBag.couldntPack, {
                no: which,
                reason: cause.message,
              }),
              detail: cause.detail,
            },
          });
        }
      }
      return null;
    }
  };

  /**
   * No answer from LINE in time, or the giver stopped waiting: the gift message may have gone out,
   * so it isn't sent again, and only a later "sent" from LINE counts, since an empty answer by then
   * can mean another picker cut this one off.
   */
  const stopWaiting = () => {
    const stopped = waiting;
    if (!stopped) return;
    waiting = null;
    clearTimer();
    stopped.a.open = false;
    const error = new Error(`Gift ${stopped.giftId}: LINE's send confirmation did not arrive`);
    report(`${which}: LINE's send confirmation failed`, error);
    if (attempt === stopped.a) set({ step: "maybeSent", error: lineSendProblem(error) });
  };

  const answered = async (
    a: Attempt,
    giftId: string,
    outcome: GiftSendOutcome | { failed: unknown },
  ) => {
    // Replacing a link finishes before another gift is prepared. A late picker cannot restore it.
    if (a.retired) return;
    const awaited = waiting?.a === a;
    if (awaited) {
      waiting = null;
      clearTimer();
    }
    const shown = () =>
      attempt === a &&
      (state.step === (awaited ? "picking" : "maybeSent") || (state.step === "sent" && a.sent));
    if (outcome === "sent") {
      a.open = false;
      a.sent = { sentAt: now() };
      const recordError = await record("the send", () =>
        backend.markSent(giftId, messageAttemptId(a)),
      );
      a.sent.recordError = recordError;
      if (shown())
        set({
          step: "sent",
          ...a.sent,
          ...(state.step === "sent" && state.retryError && { retryError: state.retryError }),
        });
      return;
    }
    if (outcome !== "cancelled") {
      report(`${which}: LINE's send confirmation failed`, outcome.failed);
      if (!awaited && shown()) {
        set({ step: "maybeSent", error: lineSendProblem(outcome.failed) });
      }
    }
    if (!awaited) return;
    if (
      outcome !== "cancelled" &&
      outcome.failed instanceof PickerSendError &&
      outcome.failed.mayHaveSent
    ) {
      a.open = false;
      if (shown()) set({ step: "maybeSent", error: lineSendProblem(outcome.failed) });
    } else {
      const recordError = await record(outcome === "cancelled" ? "the cancel" : "the failure", () =>
        backend.markCancelled(giftId, messageAttemptId(a)),
      );
      if (recordError) {
        a.open = false;
        if (shown())
          set({
            step: "failed",
            error: {
              message: i18next.t(($) => $.giving.inTheBag.couldntRecord, {
                reason: recordError.message,
              }),
              detail: recordError.detail,
            },
          });
        return;
      }
      a.messageAttemptId = undefined;
      a.pickerStarted = false;
      if (!shown()) return;
      if (outcome === "cancelled") await prepare({ cancelled: true });
      else {
        const cause = describe(outcome.failed);
        await prepare({
          error: {
            message: i18next.t(($) => $.giving.inTheBag.wasntSent, {
              no: which,
              reason: cause.message,
            }),
            detail: cause.detail,
          },
        });
      }
    }
  };

  const prepare = async (feedback: { cancelled?: true; error?: Problem } = {}) => {
    if (disposed || (!inTheBag() && state.step !== "picking")) return;
    clearTimer();
    const a = attempt?.open ? attempt : startAttempt();
    if (!slowTimer) {
      packing = {};
      slowTimer = setTimeout(() => {
        slowTimer = undefined;
        packingChanged({ slow: true });
      }, PREPARING_SLOW_MS);
    }
    set(packingState("preparing"));
    const packed = await packedGift(a);
    if (!packed || disposed || !a.open || attempt !== a) return;
    a.packed = packed;

    // Retrying an unanswered begin reuses its ID only while no picker has opened.
    a.messageAttemptId ??= `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    try {
      a.beginning = backend.beginMessageAttempt(packed.giftId, a.messageAttemptId);
      await a.beginning;
    } catch (error) {
      report(`${which}: the message attempt couldn’t be recorded`, error);
      if (!disposed && a.open && attempt === a) set({ step: "failed", error: describe(error) });
      return;
    }
    if (disposed || !a.open || attempt !== a) return;
    set({ step: "ready", ...feedback });
  };

  const openPicker = () => {
    const a = attempt;
    if (disposed || state.step !== "ready" || !a?.open || !a.packed || !a.messageAttemptId) return;
    const packed = a.packed;
    set({ step: "picking" });
    if (disposed) return;
    waiting = { a, giftId: packed.giftId };
    a.pickerStarted = true;
    let outcome: Promise<GiftSendOutcome>;
    try {
      // No preparation or asynchronous work may precede LINE's synchronous popup creation on this press.
      outcome = sender.send(packed.message);
    } catch (error) {
      void answered(a, packed.giftId, { failed: error });
      return;
    }
    after(PICKER_ANSWER_MS, stopWaiting);
    void outcome.then(
      (result) => answered(a, packed.giftId, result),
      (error: unknown) => answered(a, packed.giftId, { failed: error }),
    );
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    give: () => {
      if (disposed || attempt || state.step !== "packed") return;
      void prepare();
    },
    sendInLine: () => {
      if (state.step === "failed") void prepare();
      else openPicker();
    },
    retry: () => {
      if (disposed || state.step !== "maybeSent" || !attempt) return;
      const previous = state;
      const a = attempt;
      a.open = false;
      a.takingOut = true;
      waiting = null;
      clearTimer();
      packing = { wait: "asking" };
      set(packingState("retrying"));
      slowTimer = setTimeout(() => {
        slowTimer = undefined;
        packingChanged({ slow: true });
      }, PREPARING_SLOW_MS);
      void (async () => {
        const packed = await packingOf(a);
        try {
          if (!packed.giftId) throw new Error("The previous gift could not be identified");
          await backend.takeOut(packed.giftId);
        } catch (error) {
          report(`${which}: the previous gift link couldn't be replaced`, error);
          const cause = describe(error);
          a.takingOut = undefined;
          const retryError = {
            message: i18next.t(($) => $.giving.lineSendError.couldntRetry, {
              no: which,
              reason: cause.message,
            }),
            detail: cause.detail,
          };
          set(a.sent ? { step: "sent", ...a.sent, retryError } : { ...previous, retryError });
          return;
        }
        a.retired = true;
        a.takingOut = undefined;
        attempt = null;
        if (disposed) return;
        set({ step: "packed" });
        await prepare();
      })();
    },
    takeOut: () => {
      const leavable = inTheBag() || state.step === "preparing" || state.step === "maybeSent";
      if (disposed || !leavable) return;
      clearTimer();
      const a = attempt;
      // Taking out an unresolved send explicitly invalidates its Gift Claim Token.
      const unresolved = state.step === "maybeSent";
      // A failed confirmation can still mean the take-out landed. Sending must prepare it again.
      // Mid-preparation the take-out waits for the packing to settle: a sticker never comes out while
      // its deposit is still going in.
      if (a) {
        a.open = false;
        a.packed = undefined;
        a.takingOut = true;
      }
      set({ step: "takingOut" });
      void (async () => {
        const packing = a ? await packingOf(a) : null;
        // Packing ended on news that the gift message is out, which the screen hasn't said yet: it
        // says so now, and the gift stays in LINE's hands.
        if (a && packing?.messageOut && !unresolved) {
          showMessageOut(a, packing.messageOut);
          return;
        }
        // Null when packing failed before any gift held the sticker: there's nothing to take out.
        const giftId = packing?.giftId;
        if (giftId) {
          try {
            await backend.takeOut(giftId);
          } catch (error) {
            report(`${which} couldn't be taken out`, error);
            const cause = describe(error);
            set({
              step: "failed",
              error: {
                message: i18next.t(($) => $.giving.inTheBag.couldntTakeOut, {
                  no: which,
                  reason: cause.message,
                }),
                detail: cause.detail,
              },
            });
            return;
          }
        }
        attempt = null;
        after(takeOutMs, () => set({ step: "takenOut" }));
      })();
    },
    dispose: () => {
      if (disposed) return;
      clearTimer();
      clearSlowTimer();
      // Unmounting is not consent to move an NFT; the gift stays in the bag until an explicit action.
      disposed = true;
      if (attempt && !attempt.pickerStarted) {
        attempt.open = false;
        void cancelUnused(attempt);
      }
      // A picker still open may yet send, and its gift message is never offered again.
      stopWaiting();
      listeners.clear();
    },
  };
}
