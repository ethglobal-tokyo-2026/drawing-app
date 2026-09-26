import type liff from "@line/liff";
import { describeLiffError } from "./liff";

/** A message LINE's share target picker accepts. */
export type PickerMessage = Parameters<typeof liff.shareTargetPicker>[0][number];

/** The LIFF calls the picker needs: pass `liff` itself, or a stand-in in tests. */
export type LiffPicker = Pick<typeof liff, "isApiAvailable" | "shareTargetPicker">;

export type OneFriendShare = "sent" | "cancelled";

/**
 * Whether the picker can open, as LINE reports it after liff.init(): switched on in the console
 * and logged in. That holds in the LINE app and in a browser after LINE Login.
 */
export const canPickOneFriend = (line: LiffPicker): boolean =>
  line.isApiAvailable("shareTargetPicker");

/**
 * Sends messages through LINE's share target picker, limited to one friend so they land in one
 * private chat. Rejects with LINE's error code when the picker itself fails.
 */
export async function sendToOneFriend(
  line: LiffPicker,
  messages: PickerMessage[],
): Promise<OneFriendShare> {
  let result;
  try {
    result = await line.shareTargetPicker(messages, { isMultiple: false });
  } catch (error) {
    throw new Error(`LINE’s friend picker failed: ${describeLiffError(error)}`, { cause: error });
  }
  // A picker closed without sending resolves with nothing.
  return result?.status === "success" ? "sent" : "cancelled";
}
