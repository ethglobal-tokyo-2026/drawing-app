import type liff from "@line/liff";
import { describeLiffError } from "./liff";

/** A message LINE's share target picker accepts. */
export type PickerMessage = Parameters<typeof liff.shareTargetPicker>[0][number];

/** The LIFF calls the picker needs: pass `liff` itself, or a stand-in in tests. */
export type LiffPicker = Pick<typeof liff, "isApiAvailable" | "shareTargetPicker">;

export type PickerOutcome = "sent" | "cancelled";

/**
 * Whether the picker can open, as LINE reports it after liff.init(): switched on in the console
 * and logged in. That holds in the LINE app and in a browser after LINE Login.
 */
export const canOpenPicker = (line: LiffPicker): boolean =>
  line.isApiAvailable("shareTargetPicker");

/**
 * Sends messages through LINE's full share target picker: friends, groups and recent chats. The
 * one-pick mode lists friends only, and LINE can leave that list empty. Rejects with LINE's error
 * code when the picker itself fails.
 */
export async function sendInLineChat(
  line: LiffPicker,
  messages: PickerMessage[],
): Promise<PickerOutcome> {
  let result;
  try {
    result = await line.shareTargetPicker(messages, { isMultiple: true });
  } catch (error) {
    throw new Error(`LINE’s friend picker failed: ${describeLiffError(error)}`, { cause: error });
  }
  // A picker closed without sending resolves with nothing.
  return result?.status === "success" ? "sent" : "cancelled";
}
