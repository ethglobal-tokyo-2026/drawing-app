import {
  canOpenPicker,
  sendInLineChat,
  type LiffPicker,
  type PickerOutcome,
} from "../line/friendPicker";
import { liffMockActive } from "../line/liff";
import type { GiftMessage } from "./giftMessage";
import { keepMockGiftMessage } from "./mockGiftMessages";

/** LINE confirms the gift message was sent, or the picker closed without sending. */
export type GiftSendOutcome = PickerOutcome;

/**
 * Hands the gift message to LINE's picker. Resolves once LINE confirms sending or cancellation;
 * rejects unsupported sends and picker failures with an error that says why.
 */
export interface GiftSender {
  send: (message: GiftMessage) => Promise<GiftSendOutcome>;
}

/** LINE's picker; null wherever LINE reports the picker unavailable. */
export const liffGiftSender = (line: LiffPicker): GiftSender | null =>
  canOpenPicker(line)
    ? {
        send: async (message) => {
          const outcome = await sendInLineChat(line, [message]);
          if (liffMockActive && outcome === "sent") keepMockGiftMessage(message);
          return outcome;
        },
      }
    : null;
