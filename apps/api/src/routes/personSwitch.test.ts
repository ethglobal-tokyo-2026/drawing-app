import { personSwitchSessions, users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { z } from "zod";
import { BIGWHEEL_ID, HANA_ID } from "../session/personSwitch.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";

let test: TestApp;
let headers: Record<string, string>;
beforeEach(async () => {
  test = await createTestApp({
    personSwitch: { mode: "live", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID },
  });
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  headers = await test.signInAs(BIGWHEEL_ID);
});
afterEach(() => test.sqlite.close());
const select = (userId: string, requestHeaders = headers) =>
  test.send("POST", "/api/session/person", { headers: requestHeaders, body: { userId } });
async function selectedHeaders(response: Response) {
  const body = z
    .object({ me: z.object({ id: z.string() }), selectionVersion: z.string() })
    .parse(await response.json());
  return {
    ...headers,
    "x-croquis-user-id": body.me.id,
    "x-croquis-selection-version": body.selectionVersion,
  };
}

it("commits one of two selections with the same expected version", async () => {
  const statuses = await Promise.all([select(HANA_ID), select(HANA_ID)]).then((responses) =>
    responses.map((r) => r.status),
  );
  expect(statuses.sort((a, b) => a - b)).toEqual([200, 409]);
  expect(test.db.select().from(personSwitchSessions).all()).toHaveLength(1);
  const row = test.db.select().from(personSwitchSessions).get();
  if (!row) throw new Error("Selection missing");
  const selected = {
    ...headers,
    "x-croquis-user-id": HANA_ID,
    "x-croquis-selection-version": row.selectionVersion,
  };
  const updates = await Promise.all([select(BIGWHEEL_ID, selected), select(BIGWHEEL_ID, selected)]);
  expect(updates.map((response) => response.status).sort((a, b) => a - b)).toEqual([200, 409]);
});

it("rejects old BIGWHEEL headers after BIGWHEEL to Hana to BIGWHEEL", async () => {
  const hana = await select(HANA_ID);
  expect(hana.status).toBe(200);
  const current = await selectedHeaders(hana);
  const back = await select(BIGWHEEL_ID, current);
  expect(back.status).toBe(200);
  expect((await select(HANA_ID, current)).status).toBe(409);
  const stale = await test.send("POST", "/api/me/handle", { headers, body: { handle: "stale" } });
  expect(stale.status).toBe(409);
  expect(
    (
      await test.send("POST", "/api/me/handle", {
        headers: await selectedHeaders(back),
        body: { handle: "current" },
      })
    ).status,
  ).toBe(200);
});

it("refuses an ordinary principal, arbitrary target, forged cookie, and missing version", async () => {
  const ordinary = insertUser(test.db);
  expect((await select(HANA_ID, await test.signInAs(ordinary))).status).toBe(403);
  expect((await select(ordinary)).status).toBe(403);
  expect((await select(HANA_ID, { ...headers, Cookie: `${headers.Cookie}forged` })).status).toBe(
    401,
  );
  expect(
    (await select(HANA_ID, { Cookie: headers.Cookie, "x-croquis-user-id": BIGWHEEL_ID })).status,
  ).toBe(409);
});

it("expires a stored selection before allowing a fresh first selection", async () => {
  const response = await select(HANA_ID);
  expect(response.status).toBe(200);
  const stale = await selectedHeaders(response);
  test.db.update(personSwitchSessions).set({ expiresAt: test.clock.now() }).run();
  expect((await select(BIGWHEEL_ID, stale)).status).toBe(409);
  expect((await select(HANA_ID)).status).toBe(200);
});

it("refuses disabled selection and deleted Hana without creating a replacement", async () => {
  test.deps.personSwitch.mode = "off";
  const off = { Cookie: headers.Cookie, "x-croquis-user-id": BIGWHEEL_ID };
  expect((await select(HANA_ID, off)).status).toBe(403);
  test.deps.personSwitch.mode = "live";
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
  expect((await select(HANA_ID)).status).toBe(403);
  expect(test.db.select().from(users).all()).toHaveLength(2);
});

it("permits verification reads and authentication while refusing Hana mutations and pair transfers", async () => {
  test.deps.personSwitch.mode = "verify";
  const response = await select(HANA_ID);
  expect(response.status).toBe(200);
  const current = await selectedHeaders(response);
  expect((await test.send("GET", "/api/tickets", { headers: current })).status).toBe(200);
  expect(
    (await test.send("POST", "/api/me/handle", { headers: current, body: { handle: "changed" } }))
      .status,
  ).toBe(403);
  expect((await test.send("POST", "/api/gifts", { headers: current, body: {} })).status).toBe(403);
  const back = await select(BIGWHEEL_ID, current);
  expect(back.status).toBe(200);
  expect(
    (await test.send("POST", "/api/gifts", { headers: await selectedHeaders(back), body: {} }))
      .status,
  ).toBe(403);
});

it("forbids Hana reserve purchases and account deletion in live mode", async () => {
  const response = await select(HANA_ID);
  expect(response.status).toBe(200);
  const current = await selectedHeaders(response);
  for (const path of ["/api/ticket-purchases/start", "/api/ticket-purchases"]) {
    expect((await test.send("POST", path, { headers: current, body: {} })).status).toBe(403);
  }
  expect((await test.send("DELETE", "/api/me", { headers: current })).status).toBe(403);
});
