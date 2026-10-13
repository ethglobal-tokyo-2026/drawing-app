import { users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { privySubject } from "@drawing-app/line-auth/line-privy-jwt";
import { eq } from "drizzle-orm";
import { serializeSigned } from "hono/utils/cookie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LineTokenInvalidError, type LineProfile } from "./deps.ts";
import { z } from "zod";
import {
  canSelectPerson,
  prunePersonSwitchSessions,
  validatePersonSwitchConfig,
} from "./session/personSwitch.ts";
import { meSchema, personSchema } from "./shapes.ts";
import { devAccessToken } from "./services/devSignIn.ts";
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "./session.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";

const BIGWHEEL_ID = "d5984df6-db28-44f2-801c-2f2f5b565463";
const HANA_ID = "bef03287-50ee-4e51-aaef-a9dc1303b854";
const operator = { sub: "line-bigwheel", name: "BIGWHEEL" };
const envelopeSchema = z.object({
  me: meSchema,
  authenticated: meSchema.pick({
    id: true,
    lineUserId: true,
    lineDisplayName: true,
    linePictureUrl: true,
  }),
  allowedSelections: z.array(personSchema),
  selectionVersion: z.string().nullable(),
  expectedPrivySubject: z.string(),
  expectedSuiAddress: z.string().nullable(),
  personSwitchMode: z.enum(["off", "verify", "live"]),
});
const readEnvelope = async (response: Response) => envelopeSchema.parse(await response.json());
let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
  Object.assign(test.deps, {
    personSwitch: { mode: "verify", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID },
    lineChannelId: "test-channel",
  });
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: operator.sub });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana", lineDisplayName: "Hana" });
});
afterEach(() => test.sqlite.close());

it("authenticates the cookie before requiring an account on protected mutations", async () => {
  const alice = insertUser(test.db);
  const signed = await test.signInAs(alice);
  const cookie = { Cookie: signed.Cookie };
  for (const [method, path, body] of [
    ["POST", "/api/me/handle", { handle: "changed" }],
    ["DELETE", "/api/session", undefined],
  ] as const) {
    for (const headers of [cookie, { ...cookie, "x-croquis-user-id": "bob" }]) {
      const response = await test.send(method, path, { headers, body });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "session_account_changed" });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    expect(
      (await test.send(method, path, { headers: { "x-croquis-user-id": alice }, body })).status,
    ).toBe(401);
  }
  expect((await test.send("GET", "/api/me", { headers: cookie })).status).toBe(200);
  expect(
    (await test.send("GET", "/api/tickets", { headers: { ...cookie, "x-croquis-user-id": "bob" } }))
      .status,
  ).toBe(409);
  expect(
    (await test.send("POST", "/api/me/handle", { as: alice, body: { handle: "changed" } })).status,
  ).toBe(200);
});

it("never issues a session cookie for a delayed matching-account profile refresh", async () => {
  let resolveProfile = (_profile: LineProfile) => {};
  const profile = new Promise<LineProfile>((done) => {
    resolveProfile = done;
  });
  let markStarted = () => {};
  const started = new Promise<void>((done) => {
    markStarted = done;
  });
  test.sqlite.close();
  test = await createTestApp({
    line: {
      verifyAccessToken: async (token) => {
        if (token === "refresh") {
          markStarted();
          return profile;
        }
        return { sub: "bob", name: "Bob" };
      },
    },
  });
  const alice = insertUser(test.db, { lineUserId: "alice" });
  const refresh = test.send("POST", "/api/session", {
    as: alice,
    body: { accessToken: "refresh", language: "en" },
  });
  await started;
  const bob = await test.send("POST", "/api/session", {
    body: { accessToken: "interactive", language: "en" },
  });
  expect(bob.headers.get("set-cookie")).not.toBeNull();
  resolveProfile({ sub: "alice", name: "New Alice" });
  const response = await refresh;
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(await response.json()).toMatchObject({ me: { id: alice, lineDisplayName: "New Alice" } });
});

it("refuses an automatic profile refresh before it can replace another account's cookie", async () => {
  const alice = insertUser(test.db, { lineUserId: "alice" });
  const bob = insertUser(test.db);
  const response = await test.send("POST", "/api/session", {
    as: bob,
    headers: { "x-croquis-user-id": alice },
    body: { accessToken: devAccessToken({ sub: "alice", name: "Changed" }), language: "en" },
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: "session_account_changed" });
  expect(response.headers.get("set-cookie")).toBeNull();
});

async function signIn() {
  const response = await test.send("POST", "/api/session", {
    body: { accessToken: devAccessToken(operator), language: "en" },
  });
  const envelope = await readEnvelope(response);
  return { envelope, Cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "" };
}

function selectHana(sessionId: string | null) {
  if (sessionId === null) throw new Error("The operator has no session version");
  test.sqlite
    .prepare(
      "insert into person_switch_sessions (session_id, authenticated_user_id, selected_user_id, selection_version, expires_at) values (?, ?, ?, ?, ?)",
    )
    .run(
      sessionId,
      BIGWHEEL_ID,
      HANA_ID,
      "hana-version",
      test.clock.now().getTime() + SESSION_MAX_AGE_S * 1000,
    );
}

describe("authenticated session and selected account", () => {
  it("requires actor and version before verifying LINE for a retained operator session", async () => {
    const signed = await signIn();
    test.deps.line = {
      verifyAccessToken: async () => {
        throw new LineTokenInvalidError("Unexpected LINE verification");
      },
    };
    const invalidHeaders: Record<string, string>[] = [
      {},
      { "x-croquis-user-id": BIGWHEEL_ID },
      { "x-croquis-selection-version": signed.envelope.selectionVersion ?? "" },
      { "x-croquis-user-id": BIGWHEEL_ID, "x-croquis-selection-version": "stale" },
    ];
    for (const headers of invalidHeaders) {
      const response = await test.send("POST", "/api/session", {
        headers: { Cookie: signed.Cookie, ...headers },
        body: { accessToken: "unverified", language: "en" },
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "session_account_changed" });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  it("refuses a delayed LINE refresh after a same-account selection version changes", async () => {
    const signed = await signIn();
    let finish = (_profile: LineProfile) => {};
    const profile = new Promise<LineProfile>((resolve) => {
      finish = resolve;
    });
    let started = () => {};
    const verificationStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    test.deps.line = {
      verifyAccessToken: async () => {
        started();
        return profile;
      },
    };
    const refresh = test.send("POST", "/api/session", {
      headers: {
        Cookie: signed.Cookie,
        "x-croquis-user-id": BIGWHEEL_ID,
        "x-croquis-selection-version": signed.envelope.selectionVersion ?? "",
      },
      body: { accessToken: "refresh", language: "en" },
    });
    await verificationStarted;
    selectHana(signed.envelope.selectionVersion);
    test.sqlite.prepare("update person_switch_sessions set selected_user_id = ?").run(BIGWHEEL_ID);
    finish({ ...operator, name: "Delayed BIGWHEEL" });
    const response = await refresh;
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "session_account_changed" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(
      test.db.select().from(users).where(eq(users.id, BIGWHEEL_ID)).get()?.lineDisplayName,
    ).toBe("BIGWHEEL");
  });

  it("retains the authenticated profile while resolving Hana", async () => {
    const signed = await signIn();
    expect(signed.envelope.authenticated.id).toBe(BIGWHEEL_ID);
    expect(signed.envelope.selectionVersion).toBeTypeOf("string");
    selectHana(signed.envelope.selectionVersion);
    const response = await test.send("GET", "/api/me", {
      headers: { Cookie: signed.Cookie, "x-line-user-id": operator.sub },
    });
    const envelope = await readEnvelope(response);
    expect(envelope.me.id).toBe(HANA_ID);
    expect(envelope.authenticated.id).toBe(BIGWHEEL_ID);
    expect(envelope.expectedPrivySubject).toBe(privySubject("test-channel", "dev-video-hana"));
    expect(envelope.allowedSelections.map((person: { id: string }) => person.id)).toEqual([
      BIGWHEEL_ID,
      HANA_ID,
    ]);
  });

  it("rejects the former cookie format and expired or deleted principals", async () => {
    const oldCookie = await serializeSigned(
      SESSION_COOKIE,
      `${BIGWHEEL_ID}.${test.clock.now().getTime() + 100000}`,
      test.deps.sessionSecret,
    );
    expect((await test.send("GET", "/api/me", { headers: { Cookie: oldCookie } })).status).toBe(
      401,
    );
    const signed = await signIn();
    test.clock.advance(SESSION_MAX_AGE_S * 1000);
    expect((await test.send("GET", "/api/me", { headers: { Cookie: signed.Cookie } })).status).toBe(
      401,
    );
    const next = await signIn();
    test.db
      .update(users)
      .set({
        deletedAt: test.clock.now(),
        lineUserId: null,
        lineDisplayName: null,
        linePictureUrl: null,
        handle: null,
      })
      .where(eq(users.id, BIGWHEEL_ID))
      .run();
    expect((await test.send("GET", "/api/me", { headers: { Cookie: next.Cookie } })).status).toBe(
      401,
    );
  });

  it("refreshes LINE on BIGWHEEL without changing Hana or the session version", async () => {
    const signed = await signIn();
    expect(signed.envelope.authenticated.id).toBe(BIGWHEEL_ID);
    selectHana(signed.envelope.selectionVersion);
    const before = await readEnvelope(
      await test.send("GET", "/api/me", { headers: { Cookie: signed.Cookie } }),
    );
    const response = await test.send("POST", "/api/session", {
      headers: {
        Cookie: signed.Cookie,
        "x-croquis-user-id": HANA_ID,
        "x-croquis-selection-version": "hana-version",
      },
      body: { accessToken: devAccessToken({ ...operator, name: "New BIGWHEEL" }), language: "en" },
    });
    expect(response.status).toBe(200);
    const after = await readEnvelope(response);
    expect(after.me.id).toBe(HANA_ID);
    expect(after.selectionVersion).toBe(before.selectionVersion);
    expect(after.authenticated.lineDisplayName).toBe("New BIGWHEEL");
    expect(after.me.lineDisplayName).toBe(before.me.lineDisplayName);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("requires the current actor and version on selected-account feature requests", async () => {
    const signed = await signIn();
    expect(signed.envelope.authenticated.id).toBe(BIGWHEEL_ID);
    selectHana(signed.envelope.selectionVersion);
    const invalidHeaders: Record<string, string>[] = [
      {},
      { "x-croquis-user-id": HANA_ID },
      { "x-croquis-user-id": HANA_ID, "x-croquis-selection-version": "stale" },
    ];
    for (const headers of invalidHeaders) {
      const response = await test.send("GET", "/api/tickets", {
        headers: { Cookie: signed.Cookie, ...headers },
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "session_account_changed" });
    }
    expect(
      (
        await test.send("GET", "/api/tickets", {
          headers: {
            Cookie: signed.Cookie,
            "x-croquis-user-id": HANA_ID,
            "x-croquis-selection-version": "hana-version",
          },
        })
      ).status,
    ).toBe(200);
  });

  it("recovers off-mode Hana through session_account_changed", async () => {
    const signed = await signIn();
    expect(signed.envelope.authenticated.id).toBe(BIGWHEEL_ID);
    selectHana(signed.envelope.selectionVersion);
    Object.assign(test.deps.personSwitch, { mode: "off" });
    expect(
      (
        await test.send("GET", "/api/me", {
          headers: {
            Cookie: signed.Cookie,
            "x-croquis-user-id": HANA_ID,
            "x-croquis-selection-version": "hana-version",
          },
        })
      ).status,
    ).toBe(409);
    const after = await readEnvelope(
      await test.send("GET", "/api/me", { headers: { Cookie: signed.Cookie } }),
    );
    expect(after.me.id).toBe(BIGWHEEL_ID);
    expect(after.allowedSelections).toEqual([]);
    expect(after.personSwitchMode).toBe("off");
  });

  it("leaves ordinary users without a selection row", async () => {
    const response = await test.send("POST", "/api/session", {
      body: { accessToken: devAccessToken({ sub: "ordinary", name: "Ordinary" }), language: "en" },
    });
    const envelope = await readEnvelope(response);
    expect(envelope.selectionVersion).toBeNull();
    expect(envelope.allowedSelections).toEqual([]);
    expect(envelope.personSwitchMode).toBe("off");
    expect(test.sqlite.prepare("select * from person_switch_sessions").all()).toEqual([]);
  });

  it("keeps an operator's initial version without storing a selection", async () => {
    const signed = await signIn();
    expect(signed.envelope.selectionVersion).toBeTypeOf("string");
    expect(test.sqlite.prepare("select * from person_switch_sessions").all()).toEqual([]);
    expect(
      (
        await test.send("GET", "/api/tickets", {
          headers: { Cookie: signed.Cookie, "x-croquis-user-id": BIGWHEEL_ID },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await test.send("GET", "/api/tickets", {
          headers: {
            Cookie: signed.Cookie,
            "x-croquis-user-id": BIGWHEEL_ID,
            "x-croquis-selection-version": signed.envelope.selectionVersion ?? "",
          },
        })
      ).status,
    ).toBe(200);
  });

  it("does not resolve a deleted selected account", async () => {
    const signed = await signIn();
    selectHana(signed.envelope.selectionVersion);
    test.db
      .update(users)
      .set({
        deletedAt: test.clock.now(),
        lineUserId: null,
        lineDisplayName: null,
        linePictureUrl: null,
        handle: null,
      })
      .where(eq(users.id, HANA_ID))
      .run();
    expect((await test.send("GET", "/api/me", { headers: { Cookie: signed.Cookie } })).status).toBe(
      401,
    );
  });

  it("prunes expired selections and resolves the operator with the initial version", async () => {
    const signed = await signIn();
    selectHana(signed.envelope.selectionVersion);
    test.sqlite
      .prepare("update person_switch_sessions set expires_at = ?")
      .run(test.clock.now().getTime());
    const envelope = await readEnvelope(
      await test.send("GET", "/api/me", { headers: { Cookie: signed.Cookie } }),
    );
    expect(envelope.me.id).toBe(BIGWHEEL_ID);
    expect(envelope.selectionVersion).toBe(signed.envelope.selectionVersion);
    prunePersonSwitchSessions(test.db, test.clock.now());
    expect(test.sqlite.prepare("select * from person_switch_sessions").all()).toEqual([]);
  });

  it("validates both configured live accounts and Hana's stored identity even while off", () => {
    const config = { ...test.deps.personSwitch, mode: "off" as const };
    expect(() => validatePersonSwitchConfig(test.db, config)).not.toThrow();
    expect(canSelectPerson(config, BIGWHEEL_ID)).toBe(false);
    expect(() => validatePersonSwitchConfig(test.db, { ...config, hanaUserId: null })).toThrow(
      /requires/,
    );
    expect(() =>
      validatePersonSwitchConfig(test.db, { ...config, operatorUserId: HANA_ID }),
    ).toThrow(/requires/);
    test.db.update(users).set({ lineUserId: "replacement" }).where(eq(users.id, HANA_ID)).run();
    expect(() => validatePersonSwitchConfig(test.db, config)).toThrow(/stored LINE identity/);
    expect(() =>
      validatePersonSwitchConfig(test.db, { mode: "off", operatorUserId: null, hanaUserId: null }),
    ).not.toThrow();
    expect(() =>
      validatePersonSwitchConfig(test.db, { mode: "live", operatorUserId: null, hanaUserId: null }),
    ).toThrow(/requires/);
  });

  it("logout removes only this session's selection row", async () => {
    const first = await signIn();
    const second = await signIn();
    expect(first.envelope.selectionVersion).toBeTypeOf("string");
    expect(second.envelope.selectionVersion).not.toBe(first.envelope.selectionVersion);
    selectHana(first.envelope.selectionVersion);
    test.sqlite
      .prepare(
        "insert into person_switch_sessions (session_id, authenticated_user_id, selected_user_id, selection_version, expires_at) values (?, ?, ?, ?, ?)",
      )
      .run(
        second.envelope.selectionVersion,
        BIGWHEEL_ID,
        BIGWHEEL_ID,
        second.envelope.selectionVersion,
        test.clock.now().getTime() + SESSION_MAX_AGE_S * 1000,
      );
    expect(
      (
        await test.send("DELETE", "/api/session", {
          headers: {
            Cookie: first.Cookie,
            "x-croquis-user-id": HANA_ID,
            "x-croquis-selection-version": "hana-version",
          },
        })
      ).status,
    ).toBe(204);
    expect(
      test.sqlite.prepare("select selection_version from person_switch_sessions").all(),
    ).toEqual([{ selection_version: second.envelope.selectionVersion }]);
  });
});
