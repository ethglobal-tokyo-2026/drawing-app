import { AuthError } from "@drawing-app/line-auth/auth-error";
import { createLineVerifier as createLineAccessTokenVerifier } from "@drawing-app/line-auth/line";
import { LineTokenInvalidError, LineUnavailableError, type LineVerifier } from "../deps.ts";

/** Sign-in's error for the verifier's: LINE refused the token, or LINE couldn't be asked. */
function signInError({ details }: AuthError): Error {
  if (details.code === "line_auth_failed" || details.code === "invalid_request") {
    return new LineTokenInvalidError(
      `Access token refused: ${details.reason}`,
      details.reason === "token_expired" ? "expired" : "invalid",
    );
  }
  const status =
    details.code === "line_unavailable" && details.upstreamStatus !== undefined
      ? `, HTTP ${details.upstreamStatus}`
      : "";
  return new LineUnavailableError(
    `LINE couldn't check the access token: ${details.reason}${status}`,
  );
}

/** line-auth's LINE verifier, the auth server's too, with failures as sign-in reads them. */
export function createLineVerifier(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
): LineVerifier {
  const verify = createLineAccessTokenVerifier({ channelId, fetchImpl });
  return {
    verifyAccessToken: async (accessToken) => {
      try {
        return await verify(accessToken);
      } catch (error) {
        throw error instanceof AuthError ? signInError(error) : error;
      }
    },
  };
}
