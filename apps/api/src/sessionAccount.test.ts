import { insertUser } from "@drawing-app/db/testing";
import { afterEach, expect, it } from "vitest";
import type { LineProfile } from "./deps.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";
import { devAccessToken } from "./services/devSignIn.ts";

let test: TestApp | undefined;
afterEach(() => test?.sqlite.close());

it("authenticates the cookie before requiring an account on protected mutations", async () => {
  test = await createTestApp();
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
  test = await createTestApp();
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
