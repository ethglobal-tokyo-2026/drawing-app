import { z } from "zod";
import {
  LineTokenInvalidError,
  lineProfileSchema,
  type LineProfile,
  type LineVerifier,
} from "../deps.ts";

// Dev sign-in: an ID token anyone can write, which LIFF Mock hands out on the dev server. The app also
// imports this module, on LIFF Mock's path only, so it stays free of Node's modules.

/** Starts every dev ID token; the JSON of the profile it names follows. */
export const DEV_ID_TOKEN_PREFIX = "drawing-app-dev-id-token:";

/** A dev ID token naming `profile`. */
export const devIdToken = (profile: LineProfile) => DEV_ID_TOKEN_PREFIX + JSON.stringify(profile);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON: the schema check below refuses it with the rest.
    return undefined;
  }
};

/** Trusts whoever a dev ID token names, and refuses any other token as LINE refuses a bad one. */
export function createDevLineVerifier(): LineVerifier {
  return {
    verifyIdToken: async (idToken) => {
      if (!idToken.startsWith(DEV_ID_TOKEN_PREFIX)) {
        throw new LineTokenInvalidError(`Not a dev ID token: it doesn't start with the dev prefix`);
      }
      const profile = lineProfileSchema.safeParse(
        parseJson(idToken.slice(DEV_ID_TOKEN_PREFIX.length)),
      );
      if (!profile.success) {
        throw new LineTokenInvalidError(
          `The dev ID token names no LINE profile: ${z.prettifyError(profile.error)}`,
        );
      }
      return profile.data;
    },
  };
}

/** The server's LINE verifier: dev sign-in's when DEV_SIGN_IN is "on", and `line` otherwise. */
export function chooseLineVerifier(devSignIn: string | undefined, line: LineVerifier) {
  if (devSignIn !== "on") return line;
  console.warn(
    "⚠ DEV_SIGN_IN=on: anyone can sign in as anyone. The REST API trusts dev ID tokens and never asks LINE.",
  );
  return createDevLineVerifier();
}
