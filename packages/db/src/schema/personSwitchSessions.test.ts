import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser, refusal } from "../testDb.ts";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  test = await createTestDb();
  insertUser(test.db, { id: "operator" });
  insertUser(test.db, { id: "hana" });
});

function insert(
  session = "session",
  principal = "operator",
  selected = "hana",
  version = session,
  expiresAt = 2000,
) {
  test.sqlite
    .prepare(
      "insert into person_switch_sessions (session_id, authenticated_user_id, selected_user_id, selection_version, expires_at, created_at, updated_at) values (?, ?, ?, ?, ?, 1000, 1000)",
    )
    .run(session, principal, selected, version, expiresAt);
}

describe("person_switch_sessions", () => {
  it("keeps a session's unique selection and both foreign keys", () => {
    expect(() => insert()).not.toThrow();
    expect(refusal(() => insert())).toMatch(/UNIQUE/);
    expect(refusal(() => insert("other", "missing"))).toMatch(/FOREIGN KEY/);
    expect(refusal(() => insert("other", "operator", "missing"))).toMatch(/FOREIGN KEY/);
    expect(() => insert("other", "operator", "hana", "session")).not.toThrow();
  });
  it("stores expiration and records hand-edited updates", () => {
    insert();
    expect(test.sqlite.prepare("select expires_at from person_switch_sessions").get()).toEqual({
      expires_at: 2000,
    });
    test.sqlite.exec("update person_switch_sessions set selected_user_id = 'operator'");
    const after = test.sqlite
      .prepare<[], { updated_at: number }>("select updated_at from person_switch_sessions")
      .get();
    expect(after?.updated_at).toBeGreaterThan(1000);
  });
});
