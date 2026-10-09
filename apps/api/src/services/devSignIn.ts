import { z } from "zod";
import {
  LineTokenInvalidError,
  lineProfileSchema,
  type LineProfile,
  type LineVerifier,
} from "../deps.ts";

// Dev sign-in: an access token anyone can write, which LIFF Mock hands out on the dev server. The app also
// imports this module, on LIFF Mock's path only, so it stays free of Node's modules.

/** Starts every dev access token; the JSON of the profile it names follows. */
export const DEV_ACCESS_TOKEN_PREFIX = "drawing-app-dev-access-token:";

/** A dev access token naming `profile`. */
export const devAccessToken = (profile: LineProfile) =>
  DEV_ACCESS_TOKEN_PREFIX + JSON.stringify(profile);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON: the schema check below refuses it with the rest.
    return undefined;
  }
};

/** Trusts whoever a dev access token names, and refuses any other token as LINE refuses a bad one. */
export function createDevLineVerifier(): LineVerifier {
  return {
    verifyAccessToken: async (accessToken) => {
      if (!accessToken.startsWith(DEV_ACCESS_TOKEN_PREFIX)) {
        throw new LineTokenInvalidError(
          `Not a dev access token: it doesn't start with the dev prefix`,
        );
      }
      const profile = lineProfileSchema.safeParse(
        parseJson(accessToken.slice(DEV_ACCESS_TOKEN_PREFIX.length)),
      );
      if (!profile.success) {
        throw new LineTokenInvalidError(
          `The dev access token names no LINE profile: ${z.prettifyError(profile.error)}`,
        );
      }
      return profile.data;
    },
  };
}

/**
 * The server's LINE verifier: `line` alone, unless DEV_SIGN_IN is "on". Then a dev access token signs in
 * whoever it names, and any other token still goes to `line`, so real LINE keeps working beside it.
 */
export function chooseLineVerifier(
  devSignIn: string | undefined,
  line: LineVerifier,
): LineVerifier {
  if (devSignIn !== "on") return line;
  console.warn(
    "⚠ DEV_SIGN_IN=on: anyone can sign in as anyone. The REST API trusts dev access tokens without asking LINE.",
  );
  const dev = createDevLineVerifier();
  return {
    verifyAccessToken: (accessToken) =>
      accessToken.startsWith(DEV_ACCESS_TOKEN_PREFIX)
        ? dev.verifyAccessToken(accessToken)
        : line.verifyAccessToken(accessToken),
  };
}
