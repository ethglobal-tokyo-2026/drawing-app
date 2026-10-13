import type liff from "@line/liff";
import { describeLiffError } from "./liff";

/** A message LINE's share target picker accepts. */
export type PickerMessage = Parameters<typeof liff.shareTargetPicker>[0][number];

/** The LIFF calls the picker needs: pass `liff` itself, or a stand-in in tests. */
export type LiffPicker = Pick<
  typeof liff,
  "isApiAvailable" | "shareTargetPicker" | "isInClient" | "getLineVersion"
>;

/** A confirmed send or a picker closed without sending. */
export type PickerOutcome = "sent" | "cancelled";

/** A send failure, including whether LINE may already have sent the messages. */
export class PickerSendError extends Error {
  readonly mayHaveSent: boolean;

  constructor(message: string, mayHaveSent: boolean, options?: ErrorOptions) {
    super(message, options);
    this.name = "PickerSendError";
    this.mayHaveSent = mayHaveSent;
  }
}

/**
 * LIFF's own checks, which fail before the picker opens, so nothing went out: its arguments and
 * config, whether the picker is allowed here, and the access token it asks LINE for a one-time
 * token with.
 */
const BEFORE_THE_PICKER = new Set([
  "INVALID_ARGUMENT",
  "INVALID_CONFIG",
  "CREATE_SUBWINDOW_FAILED",
  "FORBIDDEN",
  "UNAUTHORIZED",
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
 * one-pick mode lists friends only, and LINE can leave that list empty. Rejects unsupported sends
 * before opening and preserves LINE's error when the picker fails.
 */
export async function sendInLineChat(
  line: LiffPicker,
  messages: PickerMessage[],
): Promise<PickerOutcome> {
  if (!canOpenPicker(line)) {
    throw new PickerSendError("LINE’s friend picker is unavailable in this environment.", false);
  }
  if (!reportsOutcome(line)) {
    throw new PickerSendError("LINE’s friend picker requires LINE 10.11.0 or later.", false);
  }
  // LIFF asks LINE for a one-time token before it opens the picker, so offline it never opens.
  if (navigator.onLine === false) {
    throw new PickerSendError("LINE’s friend picker cannot open while offline.", false);
  }
  let result;
  try {
    result = await line.shareTargetPicker(messages, { isMultiple: true });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    // Later failures cannot prove nothing was sent; keep the gift pending to prevent duplication.
    throw new PickerSendError(
      `LINE’s friend picker failed: ${describeLiffError(error)}`,
      !(typeof code === "string" && BEFORE_THE_PICKER.has(code)),
      { cause: error },
    );
  }
  if (result?.status === "success") return "sent";
  // A picker closed without sending resolves with nothing.
  if (result === undefined) return "cancelled";
  throw new PickerSendError("LINE’s friend picker returned an unexpected result.", true, {
    cause: result,
  });
}
