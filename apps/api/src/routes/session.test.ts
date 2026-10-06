import { stickers, users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { MAX_ID_TOKEN_LENGTH } from "@drawing-app/line-auth/line";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MAX_BODY_BYTES } from "../app.ts";
import { LineTokenInvalidError, LineUnavailableError, type LineProfile } from "../deps.ts";
import { devIdToken } from "../services/devSignIn.ts";
import { HANDLE_MAX_LENGTH } from "../session/handleLimit.ts";
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "../session.ts";
import { meSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiAddress } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { insertSealedSticker, sendGratitude } from "../testing/rows.ts";
import { LINE_USER_ID_MAX_LENGTH } from "./session.ts";

const meBodySchema = z.object({ me: meSchema });

/** A LINE account, as the fake LINE verifier reads it from its ID token. */
const ALICE: LineProfile = {
  sub: "line-alice",
  name: "Alice",
  picture: "https://profile.line-scdn.net/alice",
};

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const signIn = (profile: LineProfile, language = "en") =>
  test.send("POST", "/api/session", { body: { idToken: devIdToken(profile), language } });

const getMe = (headers: Record<string, string>) => test.send("GET", "/api/me", { headers });

/** The Cookie header that sends back the session a response set. */
function sessionCookie(response: Response) {
  const [cookie = ""] = (response.headers.get("set-cookie") ?? "").split(";");
  return { Cookie: cookie };
}

/** `me` from a 200 answer. */
const meIn = async (response: Response) => (await bodyOf(response, meBodySchema)).me;

const setHandle = (headers: Record<string, string>, handle: unknown) =>
  test.send("POST", "/api/me/handle", { headers, body: { handle } });

const setLanguageChoice = (headers: Record<string, string>, body: unknown) =>
  test.send("POST", "/api/me/language-choice", { headers, body });

describe("signing in", () => {
  it("makes the person at their first sign-in, with their LINE name as handle", async () => {
    const response = await signIn(ALICE);
    const me = await meIn(response);
    expect(me).toMatchObject({
      handle: ALICE.name,
      lineDisplayName: ALICE.name,
      linePictureUrl: ALICE.picture,
      // So the app can check the session is still this LINE account's.
      lineUserId: ALICE.sub,
      needsHandle: false,
    });
    expect(await meIn(await getMe(sessionCookie(response)))).toEqual(me);
  });

  it("keeps the session for SESSION_MAX_AGE_S", async () => {
    const cookie = (await signIn(ALICE)).headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_S}`);
  });

  it("asks for a handle when the LINE name is taken in another letter case, or breaks the rules", async () => {
    insertUser(test.db, { handle: ALICE.name.toUpperCase() });
    const names = [ALICE.name, `@${ALICE.name}`, "a".repeat(HANDLE_MAX_LENGTH + 1)];
    for (const name of names) {
      const me = await meIn(await signIn({ sub: `line-${name}`, name }));
      expect(me).toMatchObject({ handle: null, needsHandle: true, lineDisplayName: name });
    }
  });

  it("keeps a returning person's id and handle, and takes their new LINE name and picture", async () => {
    const first = await meIn(await signIn(ALICE));
    const renamed = { ...ALICE, name: "Alice B", picture: "https://profile.line-scdn.net/alice-b" };
    const again = await meIn(await signIn(renamed));
    expect(again).toEqual({
      ...first,
      lineDisplayName: renamed.name,
      linePictureUrl: renamed.picture,
    });
  });

  it("keeps the app's language, and takes a returning sign-in's new one", async () => {
    expect((await meIn(await signIn(ALICE, "ja"))).language).toBe("ja");
    expect((await meIn(await signIn(ALICE, "en"))).language).toBe("en");
  });

  it("keeps a returning person's language choice, which is their language whatever the device says", async () => {
    const headers = sessionCookie(await signIn(ALICE));
    await setLanguageChoice(headers, { languageChoice: "ja" });
    expect(await meIn(await signIn(ALICE, "en"))).toMatchObject({
      languageChoice: "ja",
      language: "ja",
    });
  });

  it.each([
    { reason: "invalid", message: "Invalid IdToken Audience.", code: "line_token_invalid" },
    { reason: "expired", message: "IdToken expired.", code: "line_token_expired" },
  ] as const)(
    "refuses a $reason ID token without a session and keeps LINE's reason in the log",
    async ({ reason, message, code }) => {
      test = await createTestApp({
        line: { verifyIdToken: () => Promise.reject(new LineTokenInvalidError(message, reason)) },
      });
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await signIn(ALICE);
      expect(response.headers.get("set-cookie")).toBeNull();
      const refused = await refusalOf(response);
      expect(refused).toMatchObject({ status: 401, error: code });
      expect(refused.detail).not.toContain(message);
      expect(log).toHaveBeenCalledWith(expect.stringContaining(message));
    },
  );

  it("redacts credentials from the provider refusal log", async () => {
    const credential = "eyJhbGciOiJFUzI1NiJ9.c2VjcmV0.c2lnbmF0dXJl";
    test = await createTestApp({
      line: {
        verifyIdToken: () =>
          Promise.reject(new LineTokenInvalidError(`Invalid IdToken: ${credential}`)),
      },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await refusalOf(await signIn(ALICE))).toMatchObject({ error: "line_token_invalid" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Invalid IdToken"));
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining(credential));
  });

  it("answers LINE being unreachable with line_unavailable, and logs why", async () => {
    test = await createTestApp({
      line: { verifyIdToken: () => Promise.reject(new LineUnavailableError("verify timed out")) },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await signIn(ALICE);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 502, error: "line_unavailable" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("line.token.unverified"));
  });

  it("answers any other failure while asking LINE as the server's own", async () => {
    test = await createTestApp({
      line: { verifyIdToken: () => Promise.reject(new Error("a bug")) },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await signIn(ALICE);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 500, error: "internal_error" });
  });

  it("refuses a body over MAX_BODY_BYTES with invalid_request, though it's otherwise valid", async () => {
    const valid = { idToken: devIdToken(ALICE), language: "en" };
    const padded = { ...valid, padding: "x".repeat(MAX_BODY_BYTES) };
    const response = await test.send("POST", "/api/session", { body: padded });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 400, error: "invalid_request" });
  });

  it("refuses an unknown language, and an ID token that's empty or too long", async () => {
    const valid = { idToken: devIdToken(ALICE), language: "en" };
    const bodies = [
      { ...valid, language: "fr" },
      { ...valid, idToken: "" },
      { ...valid, idToken: "x".repeat(MAX_ID_TOKEN_LENGTH + 1) },
    ];
    for (const body of bodies) {
      expect(await refusalOf(await test.send("POST", "/api/session", { body }))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("me", () => {
  it("reuses a signed session only for the requested LINE account", async () => {
    const signedIn = await signIn(ALICE);
    const headers = sessionCookie(signedIn);
    const me = await meIn(signedIn);
    const matching = await getMe({ ...headers, "x-line-user-id": ALICE.sub });
    expect(matching.headers.get("cache-control")).toBe("no-store");
    expect(await meIn(matching)).toEqual(me);
    const mismatched = await getMe({ ...headers, "x-line-user-id": "line-bob" });
    expect(mismatched.headers.get("cache-control")).toBe("no-store");
    expect(await refusalOf(mismatched)).toMatchObject({ status: 401, error: "signed_out" });
  });

  it("does not treat the requested LINE account as authentication", async () => {
    await signIn(ALICE);
    expect(await refusalOf(await getMe({ "x-line-user-id": ALICE.sub }))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
  });

  it("rejects an empty or oversized LINE account header", async () => {
    const headers = sessionCookie(await signIn(ALICE));
    for (const lineUserId of ["", "x".repeat(LINE_USER_ID_MAX_LENGTH + 1)]) {
      expect(
        await refusalOf(await getMe({ ...headers, "x-line-user-id": lineUserId })),
      ).toMatchObject({ status: 400, error: "invalid_request" });
    }
  });

  it("counts NEW in your sticker tray and the pink tag", async () => {
    const userId = insertUser(test.db);
    const unseen = [insertSealedSticker(test.db, userId), insertSealedSticker(test.db, userId)];
    const given = insertSealedSticker(test.db, userId);
    const withGratitude = [sendGratitude(test.db, given, userId, insertUser(test.db))];
    const me = await meIn(await test.send("GET", "/api/me", { as: userId }));
    expect(me).toMatchObject({
      newStickerCount: unseen.length,
      unseenGratitudeCount: withGratitude.length,
    });
  });
});

describe("your handle", () => {
  it("is stored trimmed, ends the prompt, and can change to itself in another letter case", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    const set = await meIn(await setHandle(headers, "  sakura  "));
    expect(set).toMatchObject({ handle: "sakura", needsHandle: false });
    expect(await meIn(await setHandle(headers, "Sakura"))).toMatchObject({ handle: "Sakura" });
    // Each emoji is two UTF-16 units but one code point.
    const emoji = "🎨".repeat(HANDLE_MAX_LENGTH);
    expect(await meIn(await setHandle(headers, emoji))).toMatchObject({ handle: emoji });
  });

  it("refuses someone else's handle in another letter case, and a handle that breaks the rules", async () => {
    insertUser(test.db, { handle: "sakura" });
    const headers = await test.signInAs(insertUser(test.db));
    expect(await refusalOf(await setHandle(headers, "SAKURA"))).toMatchObject({
      status: 409,
      error: "handle_taken",
    });
    for (const handle of ["   ", "a".repeat(HANDLE_MAX_LENGTH + 1), "@sakura2"]) {
      expect(await refusalOf(await setHandle(headers, handle))).toMatchObject({
        status: 400,
        error: "handle_invalid",
      });
    }
    expect(await refusalOf(await setHandle(headers, null))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
  });
});

describe("your language choice", () => {
  it("is null until you choose, then comes with you, and null goes back to LINE's language", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    const me = () => getMe(headers);
    expect((await meIn(await me())).languageChoice).toBeNull();
    expect(await meIn(await setLanguageChoice(headers, { languageChoice: "ja" }))).toMatchObject({
      languageChoice: "ja",
    });
    expect((await meIn(await me())).languageChoice).toBe("ja");
    expect(
      (await meIn(await setLanguageChoice(headers, { languageChoice: null }))).languageChoice,
    ).toBeNull();
    expect((await meIn(await me())).languageChoice).toBeNull();
  });

  it("refuses a language the app doesn't speak, and a body that doesn't say", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    for (const body of [{ languageChoice: "fr" }, {}]) {
      expect(await refusalOf(await setLanguageChoice(headers, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("your NSFW opt-in", () => {
  const setNsfwOptIn = (headers: Record<string, string>, body: unknown) =>
    test.send("POST", "/api/me/nsfw-opt-in", { headers, body });
  const optedInAt = (userId: string) =>
    test.db.select().from(users).where(eq(users.id, userId)).get()?.nsfwOptedInAt;

  it("is off until you turn it on, shows to everyone, and turns off again", async () => {
    const userId = insertUser(test.db);
    const headers = await test.signInAs(userId);
    expect((await meIn(await getMe(headers))).nsfwOptIn).toBe(false);
    expect((await meIn(await setNsfwOptIn(headers, { nsfwOptIn: true }))).nsfwOptIn).toBe(true);
    expect(optedInAt(userId)).toEqual(test.clock.now());
    expect((await meIn(await setNsfwOptIn(headers, { nsfwOptIn: false }))).nsfwOptIn).toBe(false);
    expect(optedInAt(userId)).toBeNull();
  });

  it("refuses a body that doesn't say on or off", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    for (const body of [{ nsfwOptIn: "yes" }, {}]) {
      expect(await refusalOf(await setNsfwOptIn(headers, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("deleting your account", () => {
  it("forgets LINE, the handle and the NSFW opt-in, keeps the rest, ends the session, and a new sign-in makes a new person", async () => {
    const signedIn = await signIn(ALICE);
    const { id } = await meIn(signedIn);
    const headers = sessionCookie(signedIn);
    const wallet = fakeSuiAddress(id);
    test.db
      .update(users)
      .set({ suiAddress: wallet, nsfwOptedInAt: test.clock.now() })
      .where(eq(users.id, id))
      .run();
    const stickerId = insertSealedSticker(test.db, id);

    const deleted = await test.send("DELETE", "/api/me", { headers });
    expect(deleted.status).toBe(204);
    const cleared = deleted.headers.get("set-cookie") ?? "";
    expect(cleared.startsWith(`${SESSION_COOKIE}=;`)).toBe(true);
    expect(cleared).toContain("Max-Age=0");
    expect(test.db.select().from(users).where(eq(users.id, id)).get()).toMatchObject({
      deletedAt: test.clock.now(),
      lineUserId: null,
      lineDisplayName: null,
      linePictureUrl: null,
      handle: null,
      nsfwOptedInAt: null,
      suiAddress: wallet,
    });
    expect(test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()).toMatchObject({
      artistId: id,
      ownerId: id,
    });

    expect(await refusalOf(await getMe(headers))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
    const again = await meIn(await signIn(ALICE));
    expect(again.id).not.toBe(id);
    expect(again.handle).toBe(ALICE.name);
  });
});

describe("signing out", () => {
  it("clears the cookie, with a session or without one", async () => {
    const headers = sessionCookie(await signIn(ALICE));
    for (const sent of [headers, {}]) {
      const response = await test.send("DELETE", "/api/session", { headers: sent });
      expect(response.status).toBe(204);
      const cleared = response.headers.get("set-cookie") ?? "";
      expect(cleared.startsWith(`${SESSION_COOKIE}=;`)).toBe(true);
      expect(cleared).toContain("Max-Age=0");
    }
  });
});
