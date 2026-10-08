import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertTicketUse, insertUser, refusal, type TestDb } from "../testDb.ts";
import { ticketKinds, ticketPurchases } from "./index.ts";
import { DAILY_TICKETS_PER_DAY } from "./limits.ts";

const FIRST_USE = 0;

let db: TestDb;
let userId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
});

describe("tickets", () => {
  it("spends each ticket slot of a day once", () => {
    const spend = () => insertTicketUse(db, userId, { dayIndex: FIRST_USE });
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("spends each key once per person, so a retry or a double tap can't spend two", () => {
    const idempotencyKey = randomUUID();
    const spend = (who: string) => () => insertTicketUse(db, who, { idempotencyKey });
    spend(userId)();
    expect(refusal(spend(userId))).toMatch(/ticket_uses.idempotency_key/);
    spend(insertUser(db))();
  });

  it("never spends a reserve ticket among a day's first DAILY_TICKETS_PER_DAY uses, and takes daily ones after one", () => {
    const spend = (dayIndex: number, kind: (typeof ticketKinds)[number]) => () =>
      insertTicketUse(db, userId, { dayIndex, kind });
    expect(refusal(spend(DAILY_TICKETS_PER_DAY - 1, "reserve"))).toMatch(
      /CHECK constraint failed: ticket_uses_kind/,
    );
    // A mixed day: the standard allowance, a reserve ticket, then daily tickets again, as Kyoto
    // Seika Manga Expression Practice Mode's larger allowance gives them.
    for (let dayIndex = 0; dayIndex < DAILY_TICKETS_PER_DAY; dayIndex++) spend(dayIndex, "daily")();
    spend(DAILY_TICKETS_PER_DAY, "reserve")();
    expect(spend(DAILY_TICKETS_PER_DAY + 1, "daily")).not.toThrow();
  });

  /** Records a one-ticket purchase with `values`. */
  const purchase =
    (values: Partial<typeof ticketPurchases.$inferInsert> = {}) =>
    () =>
      db
        .insert(ticketPurchases)
        .values({ userId, tickets: 1, priceYen: 100, ...values })
        .run();

  it("counts a purchase only once its payment is recorded whole", () => {
    expect(refusal(purchase({ verifiedAt: new Date() }))).toMatch(/ticket_purchases_payment/);
    expect(refusal(purchase({ paidJpyc: "1" }))).toMatch(/ticket_purchases_payment/);
    expect(purchase({ paidJpyc: "1", verifiedAt: new Date() })).not.toThrow();
  });
});
