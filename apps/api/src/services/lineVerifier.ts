import { AuthError } from "@drawing-app/sticker-chain/auth-error";
import { createLineVerifier as createLineIdTokenVerifier } from "@drawing-app/sticker-chain/line";
import { LineTokenInvalidError, LineUnavailableError, type LineVerifier } from "../deps.ts";

/** Sign-in's error for the verifier's: LINE refused the token, or LINE couldn't be asked. */
function signInError({ details }: AuthError): Error {
  if (details.code === "line_auth_failed" || details.code === "invalid_request") {
    return new LineTokenInvalidError(
      `ID token refused: ${details.reason}`,
      details.reason === "token_expired" ? "expired" : "invalid",
    );
  }
  const status =
    details.code === "line_unavailable" && details.upstreamStatus !== undefined
      ? `, HTTP ${details.upstreamStatus}`
      : "";
  return new LineUnavailableError(`LINE's verify endpoint failed: ${details.reason}${status}`);
}

/** sticker-chain's LINE verifier, the auth server's too, with failures as sign-in reads them. */
export function createLineVerifier(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
): LineVerifier {
  const verify = createLineIdTokenVerifier({ channelId, fetchImpl });
  return {
    verifyIdToken: async (idToken) => {
      try {
        return await verify(idToken);
      } catch (error) {
        throw error instanceof AuthError ? signInError(error) : error;
      }
    },
  };
}
