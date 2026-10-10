import { ApiError, type ErrorCode } from "../../api/apiClient";

/**
 * The seal route's own refusals, each answered only while the ticket holds no sticker of this person's.
 * A 4xx from before the route, 401 signed_out above all, says nothing about an earlier try, nor does
 * ticket_not_yours: it means the session is someone else's, as when another window signed this
 * browser in as them.
 */
const SEAL_REFUSALS: ReadonlySet<string> = new Set([
  "invalid_request",
  "ticket_not_found",
] satisfies ErrorCode[]);

/**
 * What a failed seal request says about the server. "refused": it answered that it holds no seal for
 * this ticket, so the sheet may change. "unsent": the wait for the Sui address stopped it before it
 * left the device. "unknown": anything else, no answer above all, after which the server may hold it.
 */
export function sealFailure(error: unknown): "refused" | "unsent" | "unknown" {
  if (!(error instanceof ApiError)) return "unknown";
  if (error.status >= 400 && error.status < 500 && SEAL_REFUSALS.has(error.code)) return "refused";
  const unsent = error.code === "line_token_expired" || error.code === "sui_wallet_not_ready";
  return error.status === 0 && unsent ? "unsent" : "unknown";
}

/** What the seal chip says a failed seal ran into, in words of its own with no technical detail. */
export type SealProblem =
  | {
      kind:
        | "onThisDevice"
        | "noAnswer"
        | "serverProblem"
        | "notOnChain"
        | "suiAddress"
        | "signInExpired";
    }
  /** The server's own answer, worded by its error message. */
  | { kind: "refused"; error: ApiError };

/** Sorts a failed seal for its chip. `sent`: the request had left the device. */
export function describeSealFailure(error: unknown, sent: boolean): SealProblem {
  // An answer that can't be read is no answer; a failure before the request left is the device's.
  if (!(error instanceof ApiError)) return { kind: sent ? "noAnswer" : "onThisDevice" };
  if (error.code === "line_token_expired") return { kind: "signInExpired" };
  if (error.code === "sui_wallet_not_ready") return { kind: "suiAddress" };
  if (error.code === "mint_failed") return { kind: "notOnChain" };
  if (error.status === 0) return { kind: "noAnswer" };
  return error.status >= 500 ? { kind: "serverProblem" } : { kind: "refused", error };
}
