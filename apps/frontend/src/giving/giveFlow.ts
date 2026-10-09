import { problemOf, type Problem } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
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
/**
 * How long LINE's answer has with the page in view, as once LINE's picker closes: LIFF asks LINE for
 * it every half second. Past it, the giver may stop waiting.
 */
export const PICKER_RETURN_MS = 5_000;
/**
 * How long LINE's answer has from the moment the flow asks for the picker, with the page in view all
 * along, as where the picker opens over it: LIFF fetches a token before it opens the picker, so
 * this leaves room for a slow connection.
 */
export const PICKER_OPENING_MS = 20_000;

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
export type GiveFlowState =
  /** The bag animation has started while the sticker is prepared. Giving opens on it. */
  | ({ step: "packed" } & PackingWait)
  /** Waiting for the sticker to be ready before opening LINE's picker. */
  | ({ step: "preparing" } & PackingWait)
  /**
   * LINE's picker is open. `late`: LINE hasn't answered in time with the page in view, so the giver
   * may stop waiting, as when LINE didn't say; its answer still counts until they do.
   */
  | { step: "picking"; late?: true }
  | { step: "sent"; sentAt: number; recordError?: Problem }
  /** The picker closed without sending. */
  | { step: "notSent"; recordError?: Problem }
  /** LINE didn't say whether the gift message went out, so it isn't offered again. */
  | { step: "maybeSent"; confirming?: boolean }
  | { step: "failed"; error: Problem; recordError?: Problem }
  /** The sticker lifts back out of the bag. */
  | { step: "takingOut" }
  /** The sticker is back out of the bag, and Giving closes. */
  | { step: "takenOut" };

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
  /** Give: packs the sticker, then opens LINE's picker. Only the flow's first step. */
  give: () => void;
  /** The Send in LINE key: LINE's picker, again. */
  sendInLine: () => void;
  /** "It went out", when LINE didn't say or is late: the giver says the gift message was sent. */
  itWentOut: () => void;
  takeOut: () => void;
  /** The page is back in view, as when LINE's picker closes. */
  pageShown: () => void;
  /** The page is out of view, as when LINE's picker covers it: LINE's answer isn't late meanwhile. */
  pageHidden: () => void;
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
  pickerDelayMs,
  takeOutMs,
  now = Date.now,
  report = console.error,
}: GiveFlowOptions): GiveFlow {
  const which = formatNo(sticker.no);
  const listeners = new Set<() => void>();
  let state: GiveFlowState = { step: "packed" };
  let attempt: Attempt | null = null;
  /** The picker the flow waits on, until LINE answers or the flow stops waiting. */
  let waiting: { a: Attempt; giftId: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  /** What the wait for the gift bag says of itself; it lasts until the flow leaves that wait. */
  let packing: PackingWait = {};
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  /** Runs while the page is in view with LINE's picker open, until its answer is late. */
  let lateTimer: ReturnType<typeof setTimeout> | undefined;
  /** The page is in view, as pageShown and pageHidden last said. */
  let inView = true;

  const clearSlowTimer = () => {
    clearTimeout(slowTimer);
    slowTimer = undefined;
  };
  const clearLateTimer = () => {
    clearTimeout(lateTimer);
    lateTimer = undefined;
  };
  const set = (next: GiveFlowState) => {
    if (disposed) return;
    if (next.step !== "packed" && next.step !== "preparing") {
      clearSlowTimer();
      packing = {};
    }
    if (next.step !== "picking") clearLateTimer();
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
  const late = () => state.step === "picking" && state.late === true;
  /** LINE's answer is due: without it in `ms` with the page in view, the giver may stop waiting. */
  const answerDue = (ms: number) => {
    clearLateTimer();
    if (!inView) return;
    lateTimer = setTimeout(() => {
      lateTimer = undefined;
      if (waiting && state.step === "picking") set({ step: "picking", late: true });
    }, ms);
  };

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

  /** The attempt's gift message went out, or may have: the screen says so, and it isn't sent again. */
  const showMessageOut = (a: Attempt, error: GiftMessageOutError) => {
    if (attempt !== a) return;
    clearTimer();
    set(
      error.outcome === "sent"
        ? {
            step: "sent",
            sentAt: now(),
            ...(error.recordError !== undefined && { recordError: describe(error.recordError) }),
          }
        : { step: "maybeSent" },
    );
  };

  /** The attempt's gift, or null when it couldn’t be packed; that failure shows once. */
  const packedGift = async (a: Attempt): Promise<PackedGift | null> => {
    try {
      return await a.gift;
    } catch (error) {
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
    // Due from now too, since LINE's picker may open over the page without hiding it.
    answerDue(PICKER_OPENING_MS);
    // The picker may send from here on: a page that goes before LINE answers must ask, not send again.
    backend.markMaybeSent(packed.giftId);
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
    give: () => {
      if (disposed || attempt || state.step !== "packed") return;
      const a = startAttempt();
      set(packingState("packed"));
      void packedGift(a);
      after(pickerDelayMs, () => void openPicker());
    },
    sendInLine: () => void openPicker(),
    itWentOut: () => {
      const a = attempt;
      if (disposed || !a) return;
      if (late()) stopWaiting();
      if (state.step !== "maybeSent" || state.confirming) return;
      set({ step: "maybeSent", confirming: true });
      void (async () => {
        const { giftId } = await packingOf(a);
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
        late() ||
        (state.step === "maybeSent" && !state.confirming);
      if (disposed || !leavable) return;
      if (late()) stopWaiting();
      clearTimer();
      const a = attempt;
      // On "Did it go out?" already: Take it out is the giver's answer, so it goes ahead.
      const asked = state.step === "maybeSent";
      // A failed confirmation can still mean the take-out landed. Sending must prepare it again.
      // Mid-preparation the take-out waits for the packing to settle: a sticker never comes out while
      // its deposit is still going in.
      if (a) a.open = false;
      set({ step: "takingOut" });
      void (async () => {
        const packing = a ? await packingOf(a) : null;
        // Packing ended on news that the gift message is out, which the screen hasn't said yet: it
        // says so now, and the gift stays in LINE's hands.
        if (a && packing?.messageOut && !asked) {
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
    pageShown: () => {
      inView = true;
      if (!disposed && waiting && state.step === "picking" && !late()) answerDue(PICKER_RETURN_MS);
    },
    pageHidden: () => {
      inView = false;
      if (!late()) clearLateTimer();
    },
    dispose: () => {
      clearTimer();
      clearSlowTimer();
      clearLateTimer();
      // Unmounting is not consent to move an NFT; the gift stays in the bag until an explicit action.
      disposed = true;
      // A picker still open may yet send, and its gift message is never offered again.
      stopWaiting();
      listeners.clear();
    },
  };
}
