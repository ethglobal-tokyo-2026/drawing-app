// The REST API runs this file under Node's type stripping, which needs the .ts extension; the auth
// server's build rewrites it to .js.
import { AuthError } from "./auth-error.ts";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
const LINE_TIMEOUT_MS = 5_000;

/** Access tokens outside these lengths are refused without asking LINE. */
export const MIN_ACCESS_TOKEN_LENGTH = 10;
export const MAX_ACCESS_TOKEN_LENGTH = 6000;

/** LINE's answer to an expired access token; any other refusal is labeled token_invalid. */
const EXPIRED_DESCRIPTION = "access token expired";

/** Who a LIFF access token names, from LINE's profile: user ID (`sub`), name and picture. */
interface LineProfile {
  sub: string;
  name: string;
  picture?: string;
}

function transportFailure(error: unknown, signal: AbortSignal) {
  const timeout = signal.aborted || (error instanceof Error && error.name === "TimeoutError");
  return new AuthError({ code: "line_unavailable", reason: timeout ? "timeout" : "network_error" });
}

/** A field of LINE's JSON answer, whose shape is checked by hand: the auth server ships without zod. */
const field = (body: unknown, key: string): unknown =>
  body && typeof body === "object" && !Array.isArray(body) ? Reflect.get(body, key) : undefined;

/** LINE's status and JSON answer; line_unavailable when it can't be asked or doesn't answer JSON. */
async function askLine(fetchImpl: typeof fetch, url: string, headers?: Record<string, string>) {
  const signal = AbortSignal.timeout(LINE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, { headers, signal });
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
  return { status: response.status, ok: response.ok, body };
}

/**
 * Asks LINE who a LIFF access token names, for the REST API's sign-in and the auth server: LINE's
 * verify endpoint checks the token and says which channel it's for, and the profile names the person.
 * Rejects with AuthError: invalid_request for a token of impossible length, line_auth_failed when LINE
 * refuses the token or it's another channel's, and line_unavailable when LINE can't be asked or gives
 * an answer the verifier doesn't recognize.
 */
export function createLineVerifier({
  channelId,
  fetchImpl = fetch,
}: {
  channelId: string;
  fetchImpl?: typeof fetch;
}) {
  if (!channelId) throw new Error("LINE_CHANNEL_ID is required");

  return async function verifyLineAccessToken(accessToken: string): Promise<LineProfile> {
    if (
      typeof accessToken !== "string" ||
      accessToken.length < MIN_ACCESS_TOKEN_LENGTH ||
      accessToken.length > MAX_ACCESS_TOKEN_LENGTH
    ) {
      throw new AuthError({ code: "invalid_request", reason: "access_token_format" });
    }
    const verified = await askLine(
      fetchImpl,
      `${LINE_VERIFY_URL}?${new URLSearchParams({ access_token: accessToken })}`,
    );
    if (!verified.ok) {
      // LINE answers 400 for a token that's malformed, expired or revoked.
      if (verified.status === 400 && field(verified.body, "error") === "invalid_request") {
        const expired = field(verified.body, "error_description") === EXPIRED_DESCRIPTION;
        throw new AuthError({
          code: "line_auth_failed",
          reason: expired ? "token_expired" : "token_invalid",
          upstreamStatus: verified.status,
        });
      }
      throw new AuthError({
        code: "line_unavailable",
        reason: "http_error",
        upstreamStatus: verified.status,
      });
    }
    const clientId = field(verified.body, "client_id");
    const expiresIn = field(verified.body, "expires_in");
    if (
      typeof clientId !== "string" ||
      typeof expiresIn !== "number" ||
      !Number.isFinite(expiresIn)
    ) {
      throw new AuthError({ code: "line_unavailable", reason: "invalid_verification" });
    }
    // Any LINE channel's token passes LINE's own check; only one issued for this channel signs in.
    if (clientId !== channelId) {
      throw new AuthError({ code: "line_auth_failed", reason: "channel_mismatch" });
    }
    if (expiresIn <= 0) throw new AuthError({ code: "line_auth_failed", reason: "token_expired" });

    const profile = await askLine(fetchImpl, LINE_PROFILE_URL, {
      authorization: `Bearer ${accessToken}`,
    });
    if (profile.status === 401) {
      // Revoked since the verify call answered.
      throw new AuthError({
        code: "line_auth_failed",
        reason: "token_invalid",
        upstreamStatus: 401,
      });
    }
    if (!profile.ok) {
      throw new AuthError({
        code: "line_unavailable",
        reason: "http_error",
        upstreamStatus: profile.status,
      });
    }
    const sub = field(profile.body, "userId");
    const name = field(profile.body, "displayName");
    const picture = field(profile.body, "pictureUrl");
    if (
      typeof sub !== "string" ||
      sub.length === 0 ||
      typeof name !== "string" ||
      (picture !== undefined && typeof picture !== "string")
    ) {
      throw new AuthError({ code: "line_unavailable", reason: "invalid_profile" });
    }
    return { sub, name, ...(picture !== undefined && { picture }) };
  };
}
