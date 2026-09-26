import liff from "@line/liff";
import { liffMockActive } from "../line/liff";
import { postJson } from "./request";

let session: Promise<void> | undefined;

/** Starts the REST API's HttpOnly session from the same LINE sign-in the app already uses. */
export function ensureApiSession(): Promise<void> {
  if (liffMockActive) return Promise.resolve();
  session ??= (async () => {
    const idToken = liff.getIDToken();
    if (!idToken) throw new Error("LINE gave no ID token for the app session");
    await postJson("/api/session", { idToken });
  })().catch((error: unknown) => {
    session = undefined;
    throw error;
  });
  return session;
}

/** Tests and a signed-out response can make the next request establish a fresh session. */
export function clearApiSession() {
  session = undefined;
}
