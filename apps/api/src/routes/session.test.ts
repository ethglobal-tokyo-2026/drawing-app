import { stickers, users } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LineTokenInvalidError, type LineProfile } from "../deps.ts";
import { errorBodySchema } from "../errors.ts";
import { HANDLE_MAX_LENGTH } from "../session/handles.ts";
import { SESSION_COOKIE } from "../session.ts";
import { meSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeLineIdToken, fakeSmartWallets } from "../testing/fakes.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "../testing/rows.ts";
import { ID_TOKEN_MAX_LENGTH } from "./session.ts";

const meBodySchema = z.object({ me: meSchema });

/** A LINE account, as the fake LINE verifier reads it from its ID token. */
const ALICE: LineProfile = {
  sub: "line-alice",
  name: "Alice",
  picture: "https://profile.line-scdn.net/alice",
};
/** The device's zone at sign-up. It isn't the column's default, so a test sees it was stored. */
const DEVICE_ZONE = "America/New_York";

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Sends `method path`, with `body` as JSON when there is one. */
const call = (method: string, path: string, headers: Record<string, string> = {}, body?: unknown) =>
  test.app.request(path, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const signIn = (profile: LineProfile, timeZone = DEVICE_ZONE) =>
  call("POST", "/api/session", {}, { idToken: fakeLineIdToken(profile), timeZone });

/** The Cookie header that sends back the session a response set. */
function sessionCookie(response: Response) {
  const [cookie = ""] = (response.headers.get("set-cookie") ?? "").split(";");
  return { Cookie: cookie };
}

/** `me` from a 200 answer. */
async function meIn(response: Response) {
  expect(response.status).toBe(200);
  return meBodySchema.parse(await response.json()).me;
}

/** The status and ErrorBody a request was refused with. */
const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

const setHandle = (headers: Record<string, string>, handle: unknown) =>
  call("POST", "/api/me/handle", headers, { handle });

describe("signing in", () => {
  it("makes the person at their first sign-in, with their LINE name as handle and the device's zone", async () => {
    const response = await signIn(ALICE);
    const me = await meIn(response);
    expect(me).toMatchObject({
      handle: ALICE.name,
      lineDisplayName: ALICE.name,
      linePictureUrl: ALICE.picture,
      timeZone: DEVICE_ZONE,
      needsHandle: false,
    });
    expect(await meIn(await call("GET", "/api/me", sessionCookie(response)))).toEqual(me);
  });

  it("asks for a handle when the LINE name is taken in another letter case, or breaks the rules", async () => {
    insertUser(test.db, { handle: ALICE.name.toUpperCase() });
    const names = [ALICE.name, `@${ALICE.name}`, "a".repeat(HANDLE_MAX_LENGTH + 1)];
    for (const name of names) {
      const me = await meIn(await signIn({ sub: `line-${name}`, name }));
      expect(me).toMatchObject({ handle: null, needsHandle: true, lineDisplayName: name });
    }
  });

  it("keeps a returning person's id, handle and zone, and takes their new LINE name and picture", async () => {
    const first = await meIn(await signIn(ALICE));
    const renamed = { ...ALICE, name: "Alice B", picture: "https://profile.line-scdn.net/alice-b" };
    const again = await meIn(await signIn(renamed, "Asia/Tokyo"));
    expect(again).toEqual({
      ...first,
      lineDisplayName: renamed.name,
      linePictureUrl: renamed.picture,
    });
  });

  it("refuses an ID token LINE refuses with no session, and logs LINE's reason instead of sending it", async () => {
    const reason = "IdToken expired.";
    test = await createTestApp({
      line: { verifyIdToken: () => Promise.reject(new LineTokenInvalidError(reason)) },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await signIn(ALICE);
    expect(response.headers.get("set-cookie")).toBeNull();
    const refused = await refusal(response);
    expect(refused).toMatchObject({ status: 401, error: "line_token_invalid" });
    expect(refused.detail).not.toContain(reason);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(reason));
  });

  it("refuses an unknown zone, and an ID token that's empty or too long", async () => {
    const idToken = fakeLineIdToken(ALICE);
    const bodies = [
      { idToken, timeZone: "Mars/Olympus_Mons" },
      { idToken: "", timeZone: DEVICE_ZONE },
      { idToken: "x".repeat(ID_TOKEN_MAX_LENGTH + 1), timeZone: DEVICE_ZONE },
    ];
    for (const body of bodies) {
      expect(await refusal(await call("POST", "/api/session", {}, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("me", () => {
  it("counts NEW in your sticker tray and the pink tag", async () => {
    const userId = insertUser(test.db);
    const unseen = [insertSealedSticker(test.db, userId), insertSealedSticker(test.db, userId)];
    const giftId = packGift(test.db, insertSealedSticker(test.db, userId), userId);
    const withGratitude = [receiveGift(test.db, giftId, insertUser(test.db))];
    for (const gift of withGratitude) insertGratitude(test.db, gift.id);
    const me = await meIn(await call("GET", "/api/me", await test.signInAs(userId)));
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
    expect(await refusal(await setHandle(headers, "SAKURA"))).toMatchObject({
      status: 409,
      error: "handle_taken",
    });
    for (const handle of ["   ", "a".repeat(HANDLE_MAX_LENGTH + 1), "@sakura2"]) {
      expect(await refusal(await setHandle(headers, handle))).toMatchObject({
        status: 400,
        error: "handle_invalid",
      });
    }
    expect(await refusal(await setHandle(headers, null))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
  });
});

describe("deleting your account", () => {
  it("forgets LINE and the handle, keeps the rest, ends the session, and a new sign-in makes a new person", async () => {
    const signedIn = await signIn(ALICE);
    const { id } = await meIn(signedIn);
    const headers = sessionCookie(signedIn);
    const wallet = await fakeSmartWallets().addressFor(id);
    test.db.update(users).set({ smartAccountAddress: wallet }).where(eq(users.id, id)).run();
    const stickerId = insertSealedSticker(test.db, id);

    const deleted = await call("DELETE", "/api/me", headers);
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
      smartAccountAddress: wallet,
    });
    expect(test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()).toMatchObject({
      artistId: id,
      ownerId: id,
    });

    expect(await refusal(await call("GET", "/api/me", headers))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
    const again = await meIn(await signIn(ALICE));
    expect(again.id).not.toBe(id);
    expect(again.handle).toBe(ALICE.name);
  });
});

describe("without a session", () => {
  it("you can't read, rename or delete your account", async () => {
    const responses = [
      await call("GET", "/api/me"),
      await setHandle({}, "sakura"),
      await call("DELETE", "/api/me"),
    ];
    for (const response of responses) {
      expect(await refusal(response)).toMatchObject({ status: 401, error: "signed_out" });
    }
  });
});
