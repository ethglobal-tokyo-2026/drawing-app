import { formatNo } from "../stickers/format";
import type { GiftBackend, GiftSticker, PackedGift } from "./giftBackend";
import type { GiftSender, GiftSendOutcome } from "./giftSender";

/**
 * Giving through a LINE chat, from the give sheet to "Sealed and sent". `recordError` means
 * the step happened but this device couldn't record it; the gift may still read as packed.
 */
export type GiveFlowState =
  | { step: "sheet" }
  /** In the bag. LINE's picker opens on its own after a beat. */
  | { step: "packed" }
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
  /** The Send in LINE key. */
  sendInLine: () => void;
  takeOut: () => void;
  /** Closes the flow. A card already in LINE's hands still records its outcome. */
  dispose: () => void;
}

/** One gift, from packing until it's sent or closed. */
interface Attempt {
  gift: Promise<PackedGift>;
  open: boolean;
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
      report(`${which}: ${what} couldn’t be recorded on this device`, error);
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
          set({ step: "failed", error: `${which} couldn’t be packed: ${describe(error)}` });
        }
      }
      return null;
    }
  };

  const putBack = (a: Attempt) => {
    if (!a.open) return;
    a.open = false;
    void a.gift.then(
      (packed) => record("taking it out", () => backend.markNotSent(packed.giftId, "taken_out")),
      (error: unknown) => report(`${which} couldn’t be packed`, error),
    );
  };

  const openPicker = async () => {
    if (state.step !== "packed" && state.step !== "notSent" && state.step !== "failed") return;
    clearTimer();
    const a = attempt?.open ? attempt : startAttempt();
    set({ step: "picking" });
    const packed = await packedGift(a);
    if (!packed) return;

    let outcome: GiftSendOutcome;
    try {
      outcome = await sender.send(packed.card);
    } catch (error) {
      a.open = false;
      report(`${which} wasn’t sent`, error);
      const recordError = await record("the failure", () =>
        backend.markNotSent(packed.giftId, "send_failed", describe(error)),
      );
      set({ step: "failed", error: `${which} wasn’t sent: ${describe(error)}`, recordError });
      return;
    }
    a.open = false;
    if (outcome === "sent") {
      const recordError = await record("the send", () => backend.markSent(packed.giftId));
      set({ step: "sent", sentAt: now(), recordError });
    } else {
      const recordError = await record("the cancel", () =>
        backend.markNotSent(packed.giftId, "picker_cancelled"),
      );
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
      if (state.step !== "sheet") return;
      const a = startAttempt();
      set({ step: "packed" });
      void packedGift(a);
      after(pickerDelayMs, () => void openPicker());
    },
    sendInLine: () => void openPicker(),
    takeOut: () => {
      if (state.step !== "packed" && state.step !== "notSent" && state.step !== "failed") return;
      if (attempt) putBack(attempt);
      attempt = null;
      set({ step: "takingOut" });
      after(takeOutMs, () => set({ step: "sheet" }));
    },
    dispose: () => {
      clearTimer();
      if (state.step === "packed" && attempt) putBack(attempt);
      disposed = true;
      listeners.clear();
    },
  };
}
