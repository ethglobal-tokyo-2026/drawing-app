import { canOpenPicker, sendInLineChat, type LiffPicker } from "../line/friendPicker";
import type { GiftMessage } from "./giftMessage";

export type GiftSendOutcome = "sent" | "cancelled";

/**
 * Hands the gift message to LINE's picker. Resolves once the person sends it or backs out; rejects when the picker itself fails, with an
 * error that says why.
 */
export interface GiftSender {
  send: (message: GiftMessage) => Promise<GiftSendOutcome>;
}

/** LINE's picker; null wherever LINE reports the picker unavailable. */
export const liffGiftSender = (line: LiffPicker): GiftSender | null =>
  canOpenPicker(line) ? { send: (message) => sendInLineChat(line, [message]) } : null;
