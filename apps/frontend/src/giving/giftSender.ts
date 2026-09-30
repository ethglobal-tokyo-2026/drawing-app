import {
  canOpenPicker,
  sendInLineChat,
  type LiffPicker,
  type PickerOutcome,
} from "../line/friendPicker";
import type { GiftMessage } from "./giftMessage";

/** `unknown`: LINE didn't say whether the gift message went out. */
export type GiftSendOutcome = PickerOutcome;

/**
 * Hands the gift message to LINE's picker. Resolves once the person sends it or backs out, or once
 * LINE is done without saying which; rejects when the picker fails before it opens, with an error
 * that says why.
 */
export interface GiftSender {
  send: (message: GiftMessage) => Promise<GiftSendOutcome>;
}

/** LINE's picker; null wherever LINE reports the picker unavailable. */
export const liffGiftSender = (line: LiffPicker): GiftSender | null =>
  canOpenPicker(line) ? { send: (message) => sendInLineChat(line, [message]) } : null;
