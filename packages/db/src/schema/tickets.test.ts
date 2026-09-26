import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser, refusal, type TestDb } from "../testDb.ts";
import { ticketPurchases, ticketUses } from "./index.ts";

let db: TestDb;
let userId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
});

describe("tickets", () => {
  it("spends each ticket slot of a day once, so a double tap can't spend two", () => {
    const spend = () =>
      db.insert(ticketUses).values({ userId, ticketDay: "2026-09-26", dayIndex: 0 }).run();
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("counts one Sui payment once", () => {
    const record = () =>
      db
        .insert(ticketPurchases)
        .values({ userId, tickets: 1, priceYen: 100, paidMist: "1", txDigest: "digest" })
        .run();
    record();
    expect(refusal(record)).toMatch(/ticket_purchases.tx_digest/);
  });
});
