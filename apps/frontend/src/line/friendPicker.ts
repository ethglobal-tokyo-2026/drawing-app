import type liff from "@line/liff";
import { describeLiffError } from "./liff";

/** A message LINE's share target picker accepts. */
export type PickerMessage = Parameters<typeof liff.shareTargetPicker>[0][number];

/** The LIFF calls the picker needs: pass `liff` itself, or a stand-in in tests. */
export type LiffPicker = Pick<
  typeof liff,
  "isApiAvailable" | "shareTargetPicker" | "isInClient" | "getLineVersion"
>;

/** `unknown`: LINE didn't say whether the messages went out. */
export type PickerOutcome = "sent" | "cancelled" | "unknown";

/** LIFF's own checks, which fail before the picker opens, so nothing went out. */
const BEFORE_THE_PICKER = new Set([
  "INVALID_ARGUMENT",
  "INVALID_CONFIG",
  "CREATE_SUBWINDOW_FAILED",
]);

/** Inside LINE before 10.11.0, LIFF resolves as soon as the picker opens, whatever is sent. */
function reportsOutcome(line: LiffPicker): boolean {
  const version = line.isInClient() ? line.getLineVersion() : null;
  if (!version) return true;
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return major > 10 || (major === 10 && minor >= 11);
}

/**
 * Whether the picker can open, as LINE reports it after liff.init(): switched on in the console
 * and logged in. That holds in the LINE app and in a browser after LINE Login.
 */
export const canOpenPicker = (line: LiffPicker): boolean =>
  line.isApiAvailable("shareTargetPicker");

/**
 * Sends messages through LINE's full share target picker: friends, groups and recent chats. The
 * one-pick mode lists friends only, and LINE can leave that list empty. Rejects with LINE's error
 * code when the picker fails before it opens.
 */
export async function sendInLineChat(
  line: LiffPicker,
  messages: PickerMessage[],
): Promise<PickerOutcome> {
  let result;
  try {
    result = await line.shareTargetPicker(messages, { isMultiple: true });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (typeof code === "string" && BEFORE_THE_PICKER.has(code)) {
      throw new Error(`LINE’s friend picker failed: ${describeLiffError(error)}`, { cause: error });
    }
    // Once the picker is open, a failure (asking LINE for its result, or a timeout) says nothing of
    // whether the messages went out.
    console.warn(
      `LINE’s friend picker failed after it may have sent: ${describeLiffError(error)}`,
      error,
    );
    return "unknown";
  }
  if (result?.status === "success") return "sent";
  // A picker closed without sending resolves with nothing.
  return result === undefined && reportsOutcome(line) ? "cancelled" : "unknown";
}
