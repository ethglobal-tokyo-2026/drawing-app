import { zValidator } from "@hono/zod-validator";
import type { Context, ErrorHandler, NotFoundHandler, ValidationTargets } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { ChainUnavailableError } from "./deps.ts";
import { describeIssues, failureCause, logFailure, logInfo, type Issue } from "./diagnostics.ts";
import { SignatureInvalidError } from "./sui/transactions.ts";
import { SponsorshipError } from "./sui/types.ts";

/** Every error's body. The code is stable, so clients and mocks can switch on it. */
export const errorBodySchema = z.object({
  /** A snake_case code, listed per route. */
  error: z.string(),
  /** Human-readable; for 400, names the field. */
  detail: z.string().optional(),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

/** Answers with an ErrorBody. The status and code keep their literal types for Hono's typed client. */
export function apiError<const Status extends ContentfulStatusCode, const Code extends string>(
  c: Context,
  status: Status,
  error: Code,
  detail?: string,
) {
  logInfo("api.refused", { status, errorCode: error });
  const body: { error: Code; detail?: string } = {
    error,
    ...(detail !== undefined && { detail }),
  };
  return c.json(body, status);
}

/**
 * Each refusal's status, for every route that answers a domain step's Refusal. A transaction whose
 * answer from Sui was lost is a 503: the app sends the same signature again.
 */
const REFUSAL_STATUS = {
  // Giving and Receiving.
  sticker_not_found: 404,
  gift_not_found: 404,
  user_not_found: 404,
  not_yours: 403,
  not_minted: 409,
  no_sui_wallet: 409,
  gift_in_transit: 409,
  sponsorship_expired: 409,
  transaction_failed: 409,
  take_out_not_landed: 503,
  deposit_not_landed: 503,
  not_deposited: 409,
  gift_closed: 409,
  already_received: 409,
  group_chat: 403,
  own_gift: 403,
  taken_back: 409,
  gift_returned: 410,
  gift_expired: 410,
  nsfw_not_opted_in: 403,
  claim_failed: 503,
  giving_limit_reached: 429,
  // Ticket purchases.
  pack_unknown: 400,
  free_pack_used: 409,
  price_changed: 409,
  chain_unavailable: 502,
  purchase_not_found: 404,
  payment_not_yours: 403,
  payment_not_landed: 503,
  // Gratitude.
  gift_not_received: 409,
  not_receiver: 403,
  gratitude_already_recorded: 409,
} as const satisfies Record<string, ContentfulStatusCode>;

type RefusalCode = keyof typeof REFUSAL_STATUS;

/** Answers a domain step's refusal with its status from REFUSAL_STATUS. */
export const refused = <Code extends RefusalCode>(
  c: Context,
  { refusal, detail }: { refusal: Code; detail: string },
) => apiError(c, REFUSAL_STATUS[refusal], refusal, detail);

/**
 * Shinami's refusals, which any route that sponsors a transaction can meet: its dry run failing
 * the kind, in its words; its fund running dry; or it being unreachable after its retry.
 */
const SPONSORSHIP_REFUSALS = {
  refused: { status: 422, error: "sponsorship_refused" },
  fund_empty: { status: 503, error: "sponsor_fund_empty" },
  unavailable: { status: 503, error: "sponsor_unavailable" },
} as const satisfies Record<SponsorshipError["reason"], { status: number; error: string }>;

/** zValidator's hook: a request that fails its schema answers 400 invalid_request, naming the field. */
export const invalidRequest = (
  result: ({ success: true } | { success: false; error: { issues: readonly Issue[] } }) & {
    target: keyof ValidationTargets;
  },
  c: Context,
) =>
  result.success
    ? undefined
    : apiError(
        c,
        400,
        "invalid_request",
        describeIssues(result.error.issues, { whenEmpty: result.target }),
      );

/** Validates a request's body, query or path parameters, with the invalid_request hook. */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) => zValidator(target, schema, invalidRequest);

/**
 * Refuses a body over `maxBytes` before anything buffers it. The contract has no 413: an oversized
 * body is invalid_request, in ErrorBody JSON.
 */
export const limitBody = (maxBytes: number) =>
  bodyLimit({
    maxSize: maxBytes,
    onError: (c) => apiError(c, 400, "invalid_request", `body: over ${maxBytes} bytes`),
  });

/** Answers what a route didn't catch: a malformed body is the client's error, anything else is ours. */
export const onError: ErrorHandler = (error, c) => {
  // Hono's validators throw a 400 for a body that doesn't parse as JSON or form data.
  if (error instanceof HTTPException && error.status === 400) {
    return apiError(c, 400, "invalid_request", error.message);
  }
  // Any route that reads or writes Sui can meet these, so they're answered here rather than in each.
  if (error instanceof ChainUnavailableError) {
    const status = REFUSAL_STATUS.chain_unavailable;
    logFailure("request.failed", error, { status });
    return apiError(c, status, "chain_unavailable", `${error.message}: ${failureCause(error)}`);
  }
  if (error instanceof SponsorshipError) {
    const { status, error: code } = SPONSORSHIP_REFUSALS[error.reason];
    logFailure("request.failed", error, { status });
    return apiError(c, status, code, error.message);
  }
  if (error instanceof SignatureInvalidError) {
    return apiError(c, 400, "signature_invalid", error.message);
  }
  logFailure("request.failed", error, { status: 500 });
  return apiError(c, 500, "internal_error");
};

export const notFound: NotFoundHandler = (c) =>
  apiError(c, 404, "route_not_found", `${c.req.method} ${c.req.path}`);
