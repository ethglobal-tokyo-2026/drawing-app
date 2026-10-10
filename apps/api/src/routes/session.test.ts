import { stickers, users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { MAX_ACCESS_TOKEN_LENGTH } from "@drawing-app/line-auth/line";
import { eq } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MAX_BODY_BYTES } from "../app.ts";
import { LineTokenInvalidError, LineUnavailableError, type LineProfile } from "../deps.ts";
import { devAccessToken } from "../services/devSignIn.ts";
import { createLineVerifier } from "../services/lineVerifier.ts";
import { HANDLE_MAX_LENGTH } from "../session/handleLimit.ts";
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "../session.ts";
import { meSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiAddress } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { insertSealedSticker, sendGratitude } from "../testing/rows.ts";
import { LINE_USER_ID_MAX_LENGTH } from "./session.ts";

const meBodySchema = z.object({ me: meSchema });

/** A LINE account, as the fake LINE verifier reads it from its access token. */
const ALICE: LineProfile = {
  sub: "line-alice",
  name: "Alice",
  picture: "https://profile.line-scdn.net/alice",
};

/**
 * A LINE name of `parts`, each written as its code points, with the hidden character `hidden` between
 * them; and the handle it makes, the parts alone.
 */
function nameHolding(hidden: number, ...parts: number[][]) {
  const texts = parts.map((codePoints) => String.fromCodePoint(...codePoints));
  return { name: texts.join(String.fromCodePoint(hidden)), handle: texts.join("") };
}

/** Real names that need a hidden character outside an emoji. */
const NAMES_WITH_HIDDEN_CHARACTERS = [
  // Katsuragi, its first kanji in a family's own glyph, picked by an ideographic variation selector.
  nameHolding(0xe0100, [0x845b], [0x57ce]),
  // Alireza in Persian, its two names kept apart by a zero-width non-joiner.
  nameHolding(0x200c, [0x639, 0x644, 0x6cc], [0x631, 0x636, 0x627]),
  // Sri in Sinhala, whose conjunct needs a zero-width joiner.
  nameHolding(0x200d, [0xdc1, 0xdca], [0xdbb, 0xdd3]),
];

/** A black flag, `region` in tag letters (ASCII moved to the tags block), and a cancel tag. */
const subdivisionFlag = (region: string) =>
  String.fromCodePoint(
    0x1f3f4,
    ...Array.from(region, (letter) => 0xe0000 + letter.charCodeAt(0)),
    0xe007f,
  );

/** England's, Scotland's and Wales's flags. */
const SUBDIVISION_FLAGS = ["gbeng", "gbsct", "gbwls"].map(subdivisionFlag);

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const signIn = (profile: LineProfile, language = "en") =>
  test.send("POST", "/api/session", { body: { accessToken: devAccessToken(profile), language } });

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

  it("makes a LINE name a handle without its hidden characters, keeping an emoji's", async () => {
    // A woman technologist, an emoji joined by a zero-width joiner.
    const emoji = [String.fromCodePoint(0x1f469, 0x200d, 0x1f4bb), ...SUBDIVISION_FLAGS];
    const names = [
      ...NAMES_WITH_HIDDEN_CHARACTERS,
      ...emoji.map((name) => ({ name, handle: name })),
      // A double exclamation mark emoji, which NFKC writes as !!, leaving its variation selector stray.
      { name: String.fromCodePoint(0x203c, 0xfe0f), handle: "!!" },
    ];
    for (const { name, handle } of names) {
      const me = await meIn(await signIn({ sub: `line-${name}`, name }));
      expect(me, name).toMatchObject({ handle, needsHandle: false });
    }
  });

  it("keeps the session for SESSION_MAX_AGE_S", async () => {
    const cookie = (await signIn(ALICE)).headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_S}`);
  });

  it("ends the session SESSION_MAX_AGE_S after signing in, for a copy of its cookie too", async () => {
    const headers = sessionCookie(await signIn(ALICE));
    test.clock.advance(SESSION_MAX_AGE_S * 1000 - 1);
    expect((await getMe(headers)).status).toBe(200);
    test.clock.advance(1);
    expect(await refusalOf(await getMe(headers))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
  });

  it("signs out a cookie signed before sessions carried their end", async () => {
    const { id } = await meIn(await signIn(ALICE));
    const headers = { Cookie: await serializeSigned(SESSION_COOKIE, id, test.deps.sessionSecret) };
    expect(await refusalOf(await getMe(headers))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
  });

  it("asks for a handle when the LINE name is taken in another letter case, or breaks the rules", async () => {
    insertUser(test.db, { handle: ALICE.name.toUpperCase() });
    const names = [
      ALICE.name,
      // A lookalike of the name, with a zero-width space.
      ALICE.name + String.fromCodePoint(0x200b),
      `@${ALICE.name}`,
      "a".repeat(HANDLE_MAX_LENGTH + 1),
      // Nothing but hidden characters: a Hangul filler, a zero-width space and a right-to-left override.
      String.fromCodePoint(0x3164, 0x200b, 0x202e),
    ];
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

  // LIFF counts the person logged in for hours after its ID token lapses, holding this token all along.
  it("signs in with a LIFF access token LINE vouches for, naming who LINE's profile says", async () => {
    const asked: string[] = [];
    test = await createTestApp({
      line: createLineVerifier("channel", async (input) => {
        const url = new URL(input instanceof Request ? input.url : input);
        asked.push(url.pathname);
        return url.pathname === "/v2/profile"
          ? Response.json({ userId: ALICE.sub, displayName: ALICE.name })
          : Response.json({ scope: "profile", client_id: "channel", expires_in: 3600 });
      }),
    });
    const response = await test.send("POST", "/api/session", {
      body: { accessToken: "line-access-token", language: "en" },
    });
    expect(await meIn(response)).toMatchObject({
      lineUserId: ALICE.sub,
      lineDisplayName: ALICE.name,
    });
    expect(asked).toEqual(["/oauth2/v2.1/verify", "/v2/profile"]);
  });

  it("starts a new person in the sign-in's language, and a later sign-in in another leaves it", async () => {
    expect((await meIn(await signIn(ALICE, "ja"))).language).toBe("ja");
    expect((await meIn(await signIn(ALICE, "en"))).language).toBe("ja");
  });

  it.each([
    { reason: "invalid", message: "Invalid IdToken Audience.", code: "line_token_invalid" },
    { reason: "expired", message: "IdToken expired.", code: "line_token_expired" },
  ] as const)(
    "refuses a $reason access token without a session and keeps LINE's reason in the log",
    async ({ reason, message, code }) => {
      test = await createTestApp({
        line: {
          verifyAccessToken: () => Promise.reject(new LineTokenInvalidError(message, reason)),
        },
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
        verifyAccessToken: () =>
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
      line: {
        verifyAccessToken: () => Promise.reject(new LineUnavailableError("verify timed out")),
      },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await signIn(ALICE);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 502, error: "line_unavailable" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("line.token.unverified"));
  });

  it("answers any other failure while asking LINE as the server's own", async () => {
    test = await createTestApp({
      line: { verifyAccessToken: () => Promise.reject(new Error("a bug")) },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await signIn(ALICE);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 500, error: "internal_error" });
  });

  it("refuses a body over MAX_BODY_BYTES with invalid_request, though it's otherwise valid", async () => {
    const valid = { accessToken: devAccessToken(ALICE), language: "en" };
    const padded = { ...valid, padding: "x".repeat(MAX_BODY_BYTES) };
    const response = await test.send("POST", "/api/session", { body: padded });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 400, error: "invalid_request" });
  });

  it("refuses an unknown language, and an access token that's empty or too long", async () => {
    const valid = { accessToken: devAccessToken(ALICE), language: "en" };
    const bodies = [
      { ...valid, language: "fr" },
      { ...valid, accessToken: "" },
      { ...valid, accessToken: "x".repeat(MAX_ACCESS_TOKEN_LENGTH + 1) },
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

  it("is stored NFKC-normalized, so a full-width or decomposed form is the handle it looks like", async () => {
    insertUser(test.db, { handle: "sakura" });
    const headers = await test.signInAs(insertUser(test.db));
    expect(await refusalOf(await setHandle(headers, "ＳＡＫＵＲＡ"))).toMatchObject({
      status: 409,
      error: "handle_taken",
    });
    // が as か and a combining dakuten, as some keyboards write it.
    expect(await meIn(await setHandle(headers, "か\u3099く"))).toMatchObject({ handle: "がく" });
  });

  it("refuses hidden characters, keeping the ones an emoji is written with", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    // A zero-width space, a right-to-left override, a soft hyphen, a newline, a Hangul filler, a
    // zero-width joiner with no emoji around it, a black flag with California's tag letters, which no
    // flag shows, and the names sign-in makes handles of without their hidden characters.
    const hiding = [
      "sakura\u200B",
      "\u202Esakura",
      "saku\u00ADra",
      "saku\nra",
      "sakura\u3164",
      "sakura\u200D",
      subdivisionFlag("usca"),
      ...NAMES_WITH_HIDDEN_CHARACTERS.map(({ name }) => name),
    ];
    for (const handle of hiding) {
      expect(await refusalOf(await setHandle(headers, handle)), handle).toMatchObject({
        status: 400,
        error: "handle_invalid",
      });
    }
    // A woman technologist, a heart on fire, a keycap 1 and the flags: joiners, variation selectors and
    // tag letters.
    for (const emoji of ["👩\u200D💻", "❤\uFE0F\u200D🔥", "1\uFE0F\u20E3", ...SUBDIVISION_FLAGS]) {
      expect(await meIn(await setHandle(headers, emoji))).toMatchObject({ handle: emoji });
    }
    // Emoji NFKC writes as text, a double exclamation mark and a trade mark, keep the text alone.
    for (const [emoji, handle] of [
      [String.fromCodePoint(0x203c, 0xfe0f), "!!"],
      [String.fromCodePoint(0x2122, 0xfe0f), "TM"],
    ]) {
      expect(await meIn(await setHandle(headers, emoji)), emoji).toMatchObject({ handle });
    }
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
  it("sets your language on your account, so it comes with you", async () => {
    const headers = await test.signInAs(insertUser(test.db, { language: "en" }));
    expect((await meIn(await setLanguageChoice(headers, { language: "ja" }))).language).toBe("ja");
    expect((await meIn(await getMe(headers))).language).toBe("ja");
  });

  it("refuses a language the app doesn't speak, none, and a body that leaves it out", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    for (const body of [{ language: "fr" }, { language: null }, {}]) {
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

describe("your switch for Kyoto Seika Manga Expression Practice Mode", () => {
  const setSwitch = (headers: Record<string, string>, body: unknown) =>
    test.send("POST", "/api/me/kyoto-seika-practice", { headers, body });
  const practiceIn = async (response: Response) => (await meIn(response)).kyotoSeikaPractice;
  const kyotoSeikaPracticeOnAt = (userId: string) =>
    test.db.select().from(users).where(eq(users.id, userId)).get()?.kyotoSeikaPracticeOnAt;

  it("is off until turned on, and turns off again", async () => {
    const userId = insertUser(test.db);
    const headers = await test.signInAs(userId);
    expect(await practiceIn(await getMe(headers))).toBe(false);
    expect(await practiceIn(await setSwitch(headers, { kyotoSeikaPractice: true }))).toBe(true);
    expect(kyotoSeikaPracticeOnAt(userId)).toEqual(test.clock.now());
    expect(await practiceIn(await setSwitch(headers, { kyotoSeikaPractice: false }))).toBe(false);
    expect(kyotoSeikaPracticeOnAt(userId)).toBeNull();
  });

  it("refuses a body that doesn't say on or off", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    for (const body of [{}, { kyotoSeikaPractice: "on" }]) {
      expect(await refusalOf(await setSwitch(headers, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("deleting your account", () => {
  it("forgets LINE, the handle, the NSFW opt-in and Kyoto Seika Manga Expression Practice Mode, keeps the rest, ends the session, and a new sign-in makes a new person", async () => {
    const signedIn = await signIn(ALICE);
    const { id } = await meIn(signedIn);
    const headers = sessionCookie(signedIn);
    const wallet = fakeSuiAddress(id);
    const now = test.clock.now();
    test.db
      .update(users)
      .set({
        suiAddress: wallet,
        nsfwOptedInAt: now,
        kyotoSeikaPracticeOnAt: now,
      })
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
      kyotoSeikaPracticeOnAt: null,
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
