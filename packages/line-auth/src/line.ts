// The REST API runs this file under Node's type stripping, which needs the .ts extension; the auth
// server's build rewrites it to .js.
import { AuthError, type LineRejectionReason } from "./auth-error.ts";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const LINE_VERIFY_TIMEOUT_MS = 5_000;
const LINE_ISSUER = "https://access.line.me";

/** ID tokens outside these lengths are refused without asking LINE. */
export const MIN_ID_TOKEN_LENGTH = 10;
export const MAX_ID_TOKEN_LENGTH = 6000;

// LINE's descriptions become fixed labels; unknown response text is never logged.
const REJECTION_REASONS = new Map<string, LineRejectionReason>([
  ["Invalid IdToken.", "token_invalid"],
  // Undocumented, but what LINE answers for a token that isn't a JWS, and for a forged signature.
  ["JWS format error", "token_invalid"],
  ["JWS verification failed", "token_invalid"],
  ["IdToken expired.", "token_expired"],
  ["Invalid IdToken Issuer.", "issuer_mismatch"],
  ["Invalid IdToken Audience.", "audience_mismatch"],
  ["Invalid IdToken Nonce.", "nonce_mismatch"],
  ["Invalid IdToken Subject Identifier.", "subject_mismatch"],
]);

/** Who a LIFF ID token names. The name, which sign-in needs, comes with the profile scope. */
interface LineProfile {
  sub: string;
  name: string;
  picture?: string;
}

function transportFailure(error: unknown, signal: AbortSignal) {
  const timeout = signal.aborted || (error instanceof Error && error.name === "TimeoutError");
  return new AuthError({ code: "line_unavailable", reason: timeout ? "timeout" : "network_error" });
}

/**
 * The claims of LINE's answer that the verifier checks and returns; null when any is missing or
 * mistyped. The auth server ships without node_modules, so they're checked by hand, not with zod.
 */
function readClaims(claims: unknown) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return null;
  const iss: unknown = Reflect.get(claims, "iss");
  const aud: unknown = Reflect.get(claims, "aud");
  const exp: unknown = Reflect.get(claims, "exp");
  const sub: unknown = Reflect.get(claims, "sub");
  const name: unknown = Reflect.get(claims, "name");
  const picture: unknown = Reflect.get(claims, "picture");
  if (
    typeof iss !== "string" ||
    typeof aud !== "string" ||
    typeof exp !== "number" ||
    !Number.isFinite(exp) ||
    typeof sub !== "string" ||
    sub.length === 0 ||
    typeof name !== "string" ||
    (picture !== undefined && typeof picture !== "string")
  ) {
    return null;
  }
  const profile: LineProfile = { sub, name, ...(picture !== undefined && { picture }) };
  return { iss, aud, exp, profile };
}

/**
 * Asks LINE's verify endpoint who a LIFF ID token names, for the REST API's sign-in and the auth
 * server. Rejects with AuthError: invalid_request for a token of impossible length,
 * line_auth_failed when LINE refuses the token, and line_unavailable when LINE can't be asked or
 * gives an answer the verifier doesn't recognize.
 */
export function createLineVerifier({
  channelId,
  fetchImpl = fetch,
}: {
  channelId: string;
  fetchImpl?: typeof fetch;
}) {
  if (!channelId) throw new Error("LINE_CHANNEL_ID is required");

  return async function verifyLineIdToken(idToken: string): Promise<LineProfile> {
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

    let body: unknown;
    try {
      body = await response.json();
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
        body && typeof body === "object" ? Reflect.get(body, "error_description") : undefined;
      const reason =
        typeof description === "string" ? REJECTION_REASONS.get(description) : undefined;
      if (
        (response.status === 400 || response.status === 401) &&
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        Reflect.get(body, "error") === "invalid_request" &&
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
    const claims = readClaims(body);
    if (!claims) throw new AuthError({ code: "line_unavailable", reason: "invalid_claims" });
    if (claims.iss !== LINE_ISSUER) {
      throw new AuthError({ code: "line_auth_failed", reason: "issuer_mismatch" });
    }
    if (claims.aud !== channelId) {
      throw new AuthError({ code: "line_auth_failed", reason: "audience_mismatch" });
    }
    if (claims.exp <= Date.now() / 1000) {
      throw new AuthError({ code: "line_auth_failed", reason: "token_expired" });
    }
    return claims.profile;
  };
}
