import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser, refusal, type TestDb } from "../testDb.ts";
import { ticketKinds, ticketPurchases, ticketUses } from "./index.ts";
import { DAILY_TICKETS_PER_DAY } from "./limits.ts";

const TICKET_DAY = "2026-09-26";
const FIRST_USE = 0;

let db: TestDb;
let userId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
});

describe("tickets", () => {
  it("spends each ticket slot of a day once, so a double tap can't spend two", () => {
    const spend = () =>
      db
        .insert(ticketUses)
        .values({ userId, ticketDay: TICKET_DAY, dayIndex: FIRST_USE, kind: "daily" })
        .run();
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("makes a day's first uses daily tickets and the rest reserve ones", () => {
    const spend = (dayIndex: number, kind: (typeof ticketKinds)[number]) => () =>
      db.insert(ticketUses).values({ userId, ticketDay: TICKET_DAY, dayIndex, kind }).run();
    expect(refusal(spend(FIRST_USE, "reserve"))).toMatch(
      /CHECK constraint failed: ticket_uses_kind/,
    );
    expect(refusal(spend(DAILY_TICKETS_PER_DAY, "daily"))).toMatch(
      /CHECK constraint failed: ticket_uses_kind/,
    );
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
