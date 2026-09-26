import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, refusal, type TestDb } from "../testDb.ts";
import { chatMenuBatches } from "./index.ts";

const TICKET_DAY = "2026-09-27";

let db: TestDb;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

describe("chat menu batches", () => {
  it("keeps one batch per ticket day", () => {
    const send = () =>
      db
        .insert(chatMenuBatches)
        .values({ ticketDay: TICKET_DAY, lineRequestId: "request-1", status: "sent" })
        .run();
    send();
    expect(refusal(send)).toMatch(/UNIQUE constraint failed: chat_menu_batches/);
  });

  it("has LINE's request ID for every batch LINE took", () => {
    for (const status of ["sent", "done"] as const) {
      expect(
        refusal(() => db.insert(chatMenuBatches).values({ ticketDay: TICKET_DAY, status }).run()),
      ).toMatch(/CHECK constraint failed: chat_menu_batches_request/);
    }
    db.insert(chatMenuBatches).values({ ticketDay: TICKET_DAY, status: "failed" }).run();
  });
});
