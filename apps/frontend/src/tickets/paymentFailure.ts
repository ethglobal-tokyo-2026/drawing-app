import { ApiError } from "../api/apiClient";
import { messageOf } from "../i18n/errorMessage";
import { SigningTimedOut } from "../identity/signingTimedOut";

/**
 * Why a payment moved no JPYC, as far as the checkout has a line for it. `detail` is the raw words, for
 * fine print beside Copy: it's English, and never the message.
 */
export type PaymentFailure =
  | { kind: "timedOut" | "other"; detail: string }
  /** The app's or the server's own code for it, said in its catalog message. */
  | { kind: "app"; error: ApiError; detail: string };

/** Sorts a failure from starting, signing or running a ticket payment. */
export function paymentFailureOf(error: unknown): PaymentFailure {
  if (error instanceof SigningTimedOut) return { kind: "timedOut", detail: "" };
  if (error instanceof ApiError) return { kind: "app", error, detail: error.detail ?? "" };
  return { kind: "other", detail: messageOf(error) };
}
