import { problemOf, type Problem } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { formatNo } from "../stickers/format";
import {
  GiftMessageOutError,
  GiftPackagingError,
  type GiftBackend,
  type GiftSticker,
  type PackedGift,
  type PackWait,
} from "./giftBackend";
import type { GiftSender, GiftSendOutcome } from "./giftSender";
import { GiftTransferError } from "./giftTransactions";

/** A wait for the gift bag that runs this long is a slow one: the screen says what it waits on and offers Take it out. */
export const PREPARING_SLOW_MS = 10_000;
/** LIFF stops waiting on LINE's picker after ten minutes, so an answer missing past this won't come. */
export const PICKER_ANSWER_MS = 11 * 60_000;
/**
 * How long LINE's answer has once the page is back in view, as when LINE's picker closes: LIFF asks
 * LINE for it every half second.
 */
export const PICKER_RETURN_MS = 5_000;

/** What the wait for the gift bag says of itself. */
interface PackingWait {
  /** What it waits on now, once the backend has said. */
  wait?: PackWait;
  /** It has run past PREPARING_SLOW_MS. */
  slow?: true;
}

/**
 * Giving through a LINE chat, from the give sheet to "Sealed and sent". `recordError` means
 * the step happened but the server couldn't record it; the gift may still read as packed.
 */
export type GiveFlowState =
  | { step: "sheet" }
  /** The bag animation has started while the sticker is prepared. */
  | ({ step: "packed" } & PackingWait)
  /** Waiting for the sticker to be ready before opening LINE's picker. */
  | ({ step: "preparing" } & PackingWait)
  /** LINE's picker is open. */
  | { step: "picking" }
  | { step: "sent"; sentAt: number; recordError?: Problem }
  /** The picker closed without sending. */
  | { step: "notSent"; recordError?: Problem }
  /** LINE didn't say whether the gift message went out, so it isn't offered again. */
  | { step: "maybeSent"; confirming?: boolean }
  | { step: "failed"; error: Problem; recordError?: Problem }
  /** The sticker lifts back out of the bag, then the give sheet returns. */
  | { step: "takingOut" };

export interface GiveFlowOptions {
  sticker: GiftSticker;
  backend: GiftBackend;
  sender: GiftSender;
  /** How long the sticker sits in the open bag before LINE's picker opens. */
  pickerDelayMs: number;
  /** How long taking the sticker out of the bag plays. */
  takeOutMs: number;
  now?: () => number;
  report?: (message: string, error: unknown) => void;
}

export interface GiveFlow {
  getState: () => GiveFlowState;
  subscribe: (listener: () => void) => () => void;
  /** "Send in a LINE chat" on the give sheet. */
  chooseLineChat: () => void;
  /** The Send in LINE key: LINE's picker, again. */
  sendInLine: () => void;
  /** "It went out", when LINE didn't say: the giver says the gift message was sent. */
  itWentOut: () => void;
  takeOut: () => void;
  /** The page is back in view, as when LINE's picker closes. */
  pageShown: () => void;
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
      : problemOf(error);

/** The gift an attempt packed, or null when packing failed before any gift held the sticker. */
async function giftOf(a: Attempt): Promise<string | null> {
  try {
    return (await a.gift).giftId;
  } catch (error) {
    return error instanceof GiftPackagingError ? error.giftId : null;
  }
}

export function createGiveFlow({
  sticker,
  backend,
  sender,
  pickerDelayMs,
  takeOutMs,
  now = Date.now,
  report = console.error,
}: GiveFlowOptions): GiveFlow {
  const which = formatNo(sticker.no);
  const listeners = new Set<() => void>();
  let state: GiveFlowState = { step: "sheet" };
  let attempt: Attempt | null = null;
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
    if (next.step !== "packed" && next.step !== "preparing") {
      clearSlowTimer();
      packing = {};
    }
    state = next;
    listeners.forEach((l) => l());
  };
  const packingState = (step: "packed" | "preparing"): GiveFlowState => ({ step, ...packing });
  const packingChanged = (change: PackingWait) => {
    packing = { ...packing, ...change };
    if (state.step === "packed" || state.step === "preparing") set(packingState(state.step));
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
    state.step === "packed" || state.step === "notSent" || state.step === "failed";

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

  const startAttempt = (): Attempt => {
    packing = {};
    clearSlowTimer();
    slowTimer = setTimeout(() => {
      slowTimer = undefined;
      packingChanged({ slow: true });
    }, PREPARING_SLOW_MS);
    attempt = { gift: backend.pack(sticker, (wait) => packingChanged({ wait })), open: true };
    return attempt;
  };

  /** The attempt's gift, or null when it couldn’t be packed; that failure shows once. */
  const packedGift = async (a: Attempt): Promise<PackedGift | null> => {
    try {
      return await a.gift;
    } catch (error) {
      if (a.open) {
        a.open = false;
        if (error instanceof GiftMessageOutError) {
          if (attempt === a) {
            clearTimer();
            set(
              error.outcome === "sent"
                ? {
                    step: "sent",
                    sentAt: now(),
                    ...(error.recordError !== undefined && {
                      recordError: describe(error.recordError),
                    }),
                  }
                : { step: "maybeSent" },
            );
          }
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
   * No answer from LINE in time: the gift message may have gone out, so it isn't sent again, and
   * only a later "sent" from LINE counts, since an empty answer by then can mean another picker cut
   * this one off.
   */
  const stopWaiting = () => {
    const stopped = waiting;
    if (!stopped) return;
    waiting = null;
    clearTimer();
    stopped.a.open = false;
    backend.markMaybeSent(stopped.giftId);
    console.warn(`${which}: LINE didn't say whether the gift message went out`, stopped.giftId);
    if (attempt === stopped.a) set({ step: "maybeSent" });
  };

  const answered = async (
    a: Attempt,
    giftId: string,
    outcome: GiftSendOutcome | { failed: unknown },
  ) => {
    const awaited = waiting?.a === a;
    if (awaited) {
      waiting = null;
      clearTimer();
    }
    const shown = () => attempt === a && state.step === (awaited ? "picking" : "maybeSent");
    if (outcome === "sent") {
      a.open = false;
      const recordError = await record("the send", () => backend.markSent(giftId));
      if (shown()) set({ step: "sent", sentAt: now(), recordError });
      return;
    }
    if (!awaited) return;
    if (outcome === "cancelled") {
      const recordError = await record("the cancel", () => backend.markCancelled(giftId));
      if (shown()) set({ step: "notSent", recordError });
    } else if (outcome === "unknown") {
      a.open = false;
      backend.markMaybeSent(giftId);
      if (shown()) set({ step: "maybeSent" });
    } else {
      report(`${which} wasn’t sent`, outcome.failed);
      const recordError = await record("the failure", () => backend.markCancelled(giftId));
      if (shown()) {
        const cause = describe(outcome.failed);
        set({
          step: "failed",
          error: {
            message: i18next.t(($) => $.giving.inTheBag.wasntSent, {
              no: which,
              reason: cause.message,
            }),
            detail: cause.detail,
          },
          recordError,
        });
      }
    }
  };

  const openPicker = async () => {
    if (disposed || !inTheBag()) return;
    clearTimer();
    const a = attempt?.open ? attempt : startAttempt();
    set(packingState("preparing"));
    const packed = await packedGift(a);
    if (!packed || disposed || !a.open) return;

    set({ step: "picking" });
    waiting = { a, giftId: packed.giftId };
    after(PICKER_ANSWER_MS, stopWaiting);
    let outcome: GiftSendOutcome | { failed: unknown };
    try {
      outcome = await sender.send(packed.message);
    } catch (error) {
      outcome = { failed: error };
    }
    await answered(a, packed.giftId, outcome);
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    chooseLineChat: () => {
      if (disposed || state.step !== "sheet") return;
      const a = startAttempt();
      set(packingState("packed"));
      void packedGift(a);
      after(pickerDelayMs, () => void openPicker());
    },
    sendInLine: () => void openPicker(),
    itWentOut: () => {
      const a = attempt;
      if (disposed || !a || state.step !== "maybeSent" || state.confirming) return;
      set({ step: "maybeSent", confirming: true });
      void (async () => {
        const giftId = await giftOf(a);
        const recordError = giftId
          ? await record("the send", () => backend.markSent(giftId))
          : undefined;
        if (attempt === a && state.step === "maybeSent") {
          set({ step: "sent", sentAt: now(), recordError });
        }
      })();
    },
    takeOut: () => {
      const leavable =
        inTheBag() ||
        state.step === "preparing" ||
        (state.step === "maybeSent" && !state.confirming);
      if (disposed || !leavable) return;
      clearTimer();
      const a = attempt;
      // A failed confirmation can still mean the take-out landed. Sending must prepare it again.
      // Mid-preparation the take-out waits for the packing to settle: a sticker never comes out while
      // its deposit is still going in.
      if (a) a.open = false;
      set({ step: "takingOut" });
      void (async () => {
        // Null when packing failed before any gift held the sticker: there's nothing to take out.
        const giftId = a && (await giftOf(a));
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
        after(takeOutMs, () => set({ step: "sheet" }));
      })();
    },
    pageShown: () => {
      if (waiting && state.step === "picking") after(PICKER_RETURN_MS, stopWaiting);
    },
    dispose: () => {
      clearTimer();
      clearSlowTimer();
      // Unmounting is not consent to move an NFT; the gift stays in the bag until an explicit action.
      disposed = true;
      // A picker still open may yet send, and its gift message is never offered again.
      stopWaiting();
      listeners.clear();
    },
  };
}
