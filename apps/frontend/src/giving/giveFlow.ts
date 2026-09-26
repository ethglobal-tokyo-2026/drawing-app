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
  /** Closes the flow. A gift message already in LINE's hands still records its outcome. */
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

  const openPicker = async () => {
    if (state.step !== "packed" && state.step !== "notSent" && state.step !== "failed") return;
    clearTimer();
    const a = attempt?.open ? attempt : startAttempt();
    set({ step: "picking" });
    const packed = await packedGift(a);
    if (!packed) return;

    let outcome: GiftSendOutcome;
    try {
      outcome = await sender.send(packed.message);
    } catch (error) {
      report(`${which} wasn’t sent`, error);
      set({ step: "failed", error: `${which} wasn’t sent: ${describe(error)}` });
      return;
    }
    if (outcome === "sent") {
      a.open = false;
      const recordError = await record("the send", () => backend.markShared(packed.giftId, "sent"));
      set({ step: "sent", sentAt: now(), recordError });
    } else {
      const recordError = await record("the cancel", () =>
        backend.markShared(packed.giftId, "cancelled"),
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
      const a = attempt;
      if (!a?.open) {
        attempt = null;
        set({ step: "sheet" });
        return;
      }
      set({ step: "takingOut" });
      void packedGift(a).then(async (packed) => {
        if (!packed) return;
        try {
          await backend.takeOut(packed.giftId);
          a.open = false;
          attempt = null;
          after(takeOutMs, () => set({ step: "sheet" }));
        } catch (error) {
          report(`${which} couldn’t be taken out`, error);
          set({ step: "failed", error: `${which} couldn’t be taken out: ${describe(error)}` });
        }
      });
    },
    dispose: () => {
      clearTimer();
      disposed = true;
      listeners.clear();
    },
  };
}
