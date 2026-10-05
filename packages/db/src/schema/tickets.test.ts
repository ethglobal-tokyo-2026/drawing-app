import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertTicketUse, insertUser, refusal, type TestDb } from "../testDb.ts";
import { ticketKinds, ticketPurchases } from "./index.ts";
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
  it("spends each ticket slot of a day once", () => {
    const spend = () => insertTicketUse(db, userId, { ticketDay: TICKET_DAY, dayIndex: FIRST_USE });
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("spends each key once per person, so a retry or a double tap can't spend two", () => {
    const idempotencyKey = randomUUID();
    const spend = (who: string, dayIndex: number) => () =>
      insertTicketUse(db, who, { ticketDay: TICKET_DAY, dayIndex, idempotencyKey });
    spend(userId, FIRST_USE)();
    expect(refusal(spend(userId, FIRST_USE + 1))).toMatch(/ticket_uses.idempotency_key/);
    spend(insertUser(db), FIRST_USE)();
  });

  it("makes a day's first uses daily tickets and the rest reserve ones", () => {
    const spend = (dayIndex: number, kind: (typeof ticketKinds)[number]) => () =>
      insertTicketUse(db, userId, { ticketDay: TICKET_DAY, dayIndex, kind });
    expect(refusal(spend(FIRST_USE, "reserve"))).toMatch(
      /CHECK constraint failed: ticket_uses_kind/,
    );
    expect(refusal(spend(DAILY_TICKETS_PER_DAY, "daily"))).toMatch(
      /CHECK constraint failed: ticket_uses_kind/,
    );
  });

  /** Records a one-ticket purchase with `values`. */
  const purchase =
    (values: Partial<typeof ticketPurchases.$inferInsert> = {}) =>
    () =>
      db
        .insert(ticketPurchases)
        .values({ userId, tickets: 1, priceYen: 100, ...values })
        .run();

  it("counts one Sui payment once, and holds any number of purchases not paid yet", () => {
    purchase()();
    purchase()();
    const paid = purchase({ paidJpyc: "1", txDigest: "digest" });
    paid();
    expect(refusal(paid)).toMatch(/ticket_purchases.tx_digest/);
  });

  it("counts a purchase only once its payment is recorded whole", () => {
    expect(refusal(purchase({ verifiedAt: new Date() }))).toMatch(/ticket_purchases_payment/);
    expect(refusal(purchase({ txDigest: "digest" }))).toMatch(/ticket_purchases_payment/);
  });
});
