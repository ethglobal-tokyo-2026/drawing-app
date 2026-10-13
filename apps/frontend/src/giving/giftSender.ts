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
  send: (message: GiftMessage, delivery: "line" | "person") => Promise<GiftSendOutcome>;
}

/** One sender for private delivery or LINE; null when neither is available. */
export const liffGiftSender = (line: LiffPicker, personAvailable = false): GiftSender | null =>
  personAvailable || canOpenPicker(line)
    ? {
        send: async (message, delivery) => {
          if (delivery === "person") return "sent";
          const outcome = await sendInLineChat(line, [message]);
          if (liffMockActive && outcome === "sent") keepMockGiftMessage(message);
          return outcome;
        },
      }
    : null;
