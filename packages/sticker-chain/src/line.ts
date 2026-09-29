import { AuthError, type LineRejectionReason } from "./auth-error.js";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const LINE_VERIFY_TIMEOUT_MS = 5_000;

/** ID tokens outside these lengths are refused without asking LINE. */
export const MIN_ID_TOKEN_LENGTH = 10;
export const MAX_ID_TOKEN_LENGTH = 6000;

// LINE's documented descriptions become fixed labels; unknown response text is never logged.
const REJECTION_REASONS = new Map<string, LineRejectionReason>([
  ["Invalid IdToken.", "token_invalid"],
  ["IdToken expired.", "token_expired"],
  ["Invalid IdToken Issuer.", "issuer_mismatch"],
  ["Invalid IdToken Audience.", "audience_mismatch"],
  ["Invalid IdToken Nonce.", "nonce_mismatch"],
  ["Invalid IdToken Subject Identifier.", "subject_mismatch"],
]);

function transportFailure(error: unknown, signal: AbortSignal) {
  const timeout = signal.aborted || (error instanceof Error && error.name === "TimeoutError");
  return new AuthError({ code: "line_unavailable", reason: timeout ? "timeout" : "network_error" });
}

export function createLineVerifier({
  channelId,
  fetchImpl = fetch,
}: {
  channelId: string;
  fetchImpl?: typeof fetch;
}) {
  if (!channelId) throw new Error("LINE_CHANNEL_ID is required");

  return async function verifyLineIdToken(idToken: string) {
    if (
      typeof idToken !== "string" ||
      idToken.length < MIN_ID_TOKEN_LENGTH ||
      idToken.length > MAX_ID_TOKEN_LENGTH
    ) {
      throw new AuthError({ code: "invalid_request", reason: "id_token_format" });
    }
    const signal = AbortSignal.timeout(LINE_VERIFY_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(LINE_VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
        signal,
      });
    } catch (error) {
      throw transportFailure(error, signal);
    }

    let claims: unknown;
    try {
      claims = await response.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw transportFailure(error, signal);
      throw new AuthError({
        code: "line_unavailable",
        reason: "invalid_response",
        upstreamStatus: response.status,
      });
    }
    if (!response.ok) {
      const description: unknown =
        claims && typeof claims === "object" ? Reflect.get(claims, "error_description") : undefined;
      const reason =
        typeof description === "string" ? REJECTION_REASONS.get(description) : undefined;
      if (
        (response.status === 400 || response.status === 401) &&
        claims &&
        typeof claims === "object" &&
        !Array.isArray(claims) &&
        Reflect.get(claims, "error") === "invalid_request" &&
        reason
      ) {
        throw new AuthError({
          code: "line_auth_failed",
          reason,
          upstreamStatus: response.status,
        });
      }
      throw new AuthError({
        code: "line_unavailable",
        reason: "http_error",
        upstreamStatus: response.status,
      });
    }
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
      throw new AuthError({ code: "line_unavailable", reason: "invalid_claims" });
    }
    const issuer: unknown = Reflect.get(claims, "iss");
    const audience: unknown = Reflect.get(claims, "aud");
    const subject: unknown = Reflect.get(claims, "sub");
    const expiration: unknown = Reflect.get(claims, "exp");
    if (
      typeof issuer !== "string" ||
      typeof audience !== "string" ||
      typeof subject !== "string" ||
      subject.length === 0 ||
      typeof expiration !== "number" ||
      !Number.isFinite(expiration)
    ) {
      throw new AuthError({ code: "line_unavailable", reason: "invalid_claims" });
    }
    if (issuer !== "https://access.line.me") {
      throw new AuthError({ code: "line_auth_failed", reason: "issuer_mismatch" });
    }
    if (audience !== channelId) {
      throw new AuthError({ code: "line_auth_failed", reason: "audience_mismatch" });
    }
    if (expiration <= Date.now() / 1000) {
      throw new AuthError({ code: "line_auth_failed", reason: "token_expired" });
    }
    return { sub: subject };
  };
}
