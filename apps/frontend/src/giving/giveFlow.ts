import { ApiError } from "../api/apiClient";
import { errorReason } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { formatNo } from "../stickers/format";
import {
  GiftPackagingError,
  type GiftBackend,
  type GiftSticker,
  type PackedGift,
} from "./giftBackend";
import type { GiftSender, GiftSendOutcome } from "./giftSender";

/**
 * Giving through a LINE chat, from the give sheet to "Sealed and sent". `recordError` means
 * the step happened but the server couldn't record it; the gift may still read as packed.
 */
export type GiveFlowState =
  | { step: "sheet" }
  /** The bag animation has started while the sticker is prepared. */
  | { step: "packed" }
  /** Waiting for the sticker to be ready before opening LINE's picker. */
  | { step: "preparing" }
  /** LINE's picker is open. */
  | { step: "picking" }
  | { step: "sent"; sentAt: number; recordError?: string }
  /** The picker closed without sending. */
  | { step: "notSent"; recordError?: string }
  | { step: "failed"; error: string; recordError?: string }
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
}

/** Why a step failed, as the screen says it: an API error in the app's language, else its own text. */
const describe = (error: unknown): string =>
  error instanceof GiftPackagingError
    ? describe(error.cause)
    : error instanceof ApiError
      ? errorReason(error)
      : error instanceof Error
        ? error.message
        : String(error);

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
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const set = (next: GiveFlowState) => {
    if (disposed) return;
    state = next;
    listeners.forEach((l) => l());
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
    attempt = { gift: backend.pack(sticker), open: true };
    return attempt;
  };

  /** The attempt's gift, or null when it couldn’t be packed; that failure shows once. */
  const packedGift = async (a: Attempt): Promise<PackedGift | null> => {
    try {
      return await a.gift;
    } catch (error) {
      if (a.open) {
        a.open = false;
        report(`${which} couldn’t be packed`, error);
        if (attempt === a) {
          clearTimer();
          set({
            step: "failed",
            error: i18next.t(($) => $.giving.inTheBag.couldntPack, {
              no: which,
              reason: describe(error),
            }),
          });
        }
      }
      return null;
    }
  };

  const openPicker = async () => {
    if (
      disposed ||
      (state.step !== "packed" && state.step !== "notSent" && state.step !== "failed")
    )
      return;
    clearTimer();
    const a = attempt?.open ? attempt : startAttempt();
    set({ step: "preparing" });
    const packed = await packedGift(a);
    if (!packed || disposed || !a.open) return;

    set({ step: "picking" });
    let outcome: GiftSendOutcome;
    try {
      outcome = await sender.send(packed.message);
    } catch (error) {
      report(`${which} wasn’t sent`, error);
      const recordError = await record("the failure", () => backend.markCancelled(packed.giftId));
      set({
        step: "failed",
        error: i18next.t(($) => $.giving.inTheBag.wasntSent, {
          no: which,
          reason: describe(error),
        }),
        recordError,
      });
      return;
    }
    if (outcome === "sent") {
      a.open = false;
      const recordError = await record("the send", () => backend.markSent(packed.giftId));
      set({ step: "sent", sentAt: now(), recordError });
    } else {
      const recordError = await record("the cancel", () => backend.markCancelled(packed.giftId));
      set({ step: "notSent", recordError });
    }
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
      set({ step: "packed" });
      void packedGift(a);
      after(pickerDelayMs, () => void openPicker());
    },
    sendInLine: () => void openPicker(),
    takeOut: () => {
      if (
        disposed ||
        (state.step !== "packed" && state.step !== "notSent" && state.step !== "failed")
      )
        return;
      clearTimer();
      const a = attempt;
      // A failed confirmation can still mean the take-out landed. Sending must prepare it again.
      if (a) a.open = false;
      set({ step: "takingOut" });
      void (async () => {
        if (a) {
          try {
            let giftId: string;
            try {
              giftId = (await a.gift).giftId;
            } catch (error) {
              if (!(error instanceof GiftPackagingError)) throw error;
              giftId = error.giftId;
            }
            await backend.takeOut(giftId);
          } catch (error) {
            report(`${which} couldn't be taken out`, error);
            set({
              step: "failed",
              error: i18next.t(($) => $.giving.inTheBag.couldntTakeOut, {
                no: which,
                reason: describe(error),
              }),
            });
            return;
          }
        }
        attempt = null;
        after(takeOutMs, () => set({ step: "sheet" }));
      })();
    },
    dispose: () => {
      clearTimer();
      // Unmounting is not consent to move an NFT; the gift stays in the bag until an explicit action.
      disposed = true;
      listeners.clear();
    },
  };
}
