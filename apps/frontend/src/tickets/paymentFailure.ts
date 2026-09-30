import { ApiError } from "../api/apiClient";
import { PaymentFailed, SigningTimedOut } from "../payments/paymentErrors";

/**
 * Why a payment moved no JPYC, as far as the checkout has a line for it. `detail` is the raw words, for
 * fine print beside Copy: it's English, and never the message.
 */
export type PaymentFailure =
  | { kind: "timedOut" | "rejected" | "noNetworkFee" | "offline" | "other"; detail: string }
  /** The app's own code for it, said in its catalog message. */
  | { kind: "app"; error: ApiError; detail: string };

/** The Sui SDK's and Sui's own words for an account with no SUI to pay the network fee with. */
const NO_NETWORK_FEE = /no valid gas coins|insufficientgas|insufficient gas/i;

/** What browsers throw when a request never reached its server. */
const NO_ANSWER = /failed to fetch|load failed|networkerror|network request failed/i;

/** Sorts a failure from signing or running a ticket payment. */
export function paymentFailureOf(error: unknown): PaymentFailure {
  if (error instanceof SigningTimedOut) return { kind: "timedOut", detail: "" };
  if (error instanceof ApiError) return { kind: "app", error, detail: error.detail ?? "" };
  const detail =
    error instanceof PaymentFailed
      ? error.why
      : error instanceof Error
        ? error.message
        : String(error);
  if (NO_NETWORK_FEE.test(detail)) return { kind: "noNetworkFee", detail };
  if (error instanceof PaymentFailed) return { kind: "rejected", detail };
  const offline =
    (error instanceof TypeError && NO_ANSWER.test(error.message)) || navigator.onLine === false;
  return { kind: offline ? "offline" : "other", detail };
}
