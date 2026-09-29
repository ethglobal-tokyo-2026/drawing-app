import { randomUUID } from "node:crypto";
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
  it("spends each ticket slot of a day once", () => {
    const spend = () =>
      db
        .insert(ticketUses)
        .values({ userId, ticketDay: TICKET_DAY, dayIndex: FIRST_USE, kind: "daily" })
        .run();
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("spends each key once per person, so a retry or a double tap can't spend two", () => {
    const idempotencyKey = randomUUID();
    const spend = (who: string, dayIndex: number) => () =>
      db
        .insert(ticketUses)
        .values({ userId: who, ticketDay: TICKET_DAY, dayIndex, kind: "daily", idempotencyKey })
        .run();
    spend(userId, FIRST_USE)();
    expect(refusal(spend(userId, FIRST_USE + 1))).toMatch(/ticket_uses.idempotency_key/);
    spend(insertUser(db), FIRST_USE)();
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
        .values({
          userId,
          tickets: 1,
          priceYen: 100,
          paidJpyc: "1",
          txDigest: "digest",
        })
        .run();
    record();
    expect(refusal(record)).toMatch(/ticket_purchases.tx_digest/);
  });
});
