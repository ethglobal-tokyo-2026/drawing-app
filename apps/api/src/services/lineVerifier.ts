import { z } from "zod";
import { LineTokenInvalidError, lineProfileSchema, type LineVerifier } from "../deps.ts";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const VERIFY_TIMEOUT_MS = 5_000;

/**
 * Verifies LIFF ID tokens at LINE's verify endpoint, which checks the signature, the expiry and the
 * channel. sticker-chain's verifier returns only `sub`, and sign-in also needs the name and picture.
 */
export function createLineVerifier(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
): LineVerifier {
  return {
    verifyIdToken: async (idToken) => {
      const response = await fetchImpl(LINE_VERIFY_URL, {
        method: "POST",
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
      // LINE answers a token it refuses with 400 and its reason.
      if (response.status === 400) throw new LineTokenInvalidError(await response.text());
      if (!response.ok) throw new Error(`LINE's verify endpoint answered ${response.status}`);
      const profile = lineProfileSchema.safeParse(await response.json());
      if (!profile.success) {
        throw new Error(
          `LINE's ID token claims lack the profile: ${z.prettifyError(profile.error)}`,
        );
      }
      return profile.data;
    },
  };
}
