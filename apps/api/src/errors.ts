import { zValidator } from "@hono/zod-validator";
import type { Context, ErrorHandler, NotFoundHandler, ValidationTargets } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { ChainUnavailableError } from "./deps.ts";
import { failureCause, logFailure, logInfo } from "./diagnostics.ts";

/** Every error's body. The code is stable, so clients and mocks can switch on it. */
export const errorBodySchema = z.object({
  /** A snake_case code, listed per route. */
  error: z.string(),
  /** Human-readable; for 400, names the field. */
  detail: z.string().optional(),
  /** gift_held's gift: the one whose sticker the escrow holds, which its giver can take out. */
  giftId: z.string().optional(),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

/** Answers with an ErrorBody. The status and code keep their literal types for Hono's typed client. */
export function apiError<const Status extends ContentfulStatusCode, const Code extends string>(
  c: Context,
  status: Status,
  error: Code,
  detail?: string,
  giftId?: string,
) {
  logInfo("api.refused", { status, errorCode: error });
  const body: { error: Code; detail?: string; giftId?: string } = {
    error,
    ...(detail !== undefined && { detail }),
    ...(giftId !== undefined && { giftId }),
  };
  return c.json(body, status);
}

interface Issue {
  path: readonly PropertyKey[];
  message: string;
}

const describeIssues = (issues: readonly Issue[], target: keyof ValidationTargets) =>
  issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.map(String).join(".") : target;
      return `${field}: ${issue.message}`;
    })
    .join("; ");

/** zValidator's hook: a request that fails its schema answers 400 invalid_request, naming the field. */
export const invalidRequest = (
  result: ({ success: true } | { success: false; error: { issues: readonly Issue[] } }) & {
    target: keyof ValidationTargets;
  },
  c: Context,
) =>
  result.success
    ? undefined
    : apiError(c, 400, "invalid_request", describeIssues(result.error.issues, result.target));

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
  // Any route that reads the escrow can meet this, so it's answered here rather than in each.
  if (error instanceof ChainUnavailableError) {
    logFailure("request.failed", error, { status: 502 });
    return apiError(c, 502, "chain_unavailable", `${error.message}: ${failureCause(error)}`);
  }
  logFailure("request.failed", error, { status: 500 });
  return apiError(c, 500, "internal_error");
};

export const notFound: NotFoundHandler = (c) =>
  apiError(c, 404, "route_not_found", `${c.req.method} ${c.req.path}`);
