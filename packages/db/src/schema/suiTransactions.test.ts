import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestDb,
  insertSticker,
  insertUser,
  newId,
  packGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { suiTransactions, ticketPurchases } from "./index.ts";

let db: TestDb;
let person: string;
let sticker: string;
let gift: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  person = insertUser(db);
  sticker = insertSticker(db, person);
  gift = packGift(db, sticker, person);
});

type Row = typeof suiTransactions.$inferInsert;

/** Inserts an open transaction with `values`, over a sponsorship of its own. */
const insert = (values: Pick<Row, "kind"> & Partial<Row>) => (): number => {
  const row = db
    .insert(suiTransactions)
    .values({
      sender: "server",
      digest: newId("digest"),
      txBytes: "AA==",
      sponsorSignature: "AA==",
      expiresAt: new Date(Date.now() + 60_000),
      ...values,
    })
    .returning()
    .get();
  if (!row) throw new Error("The transaction wasn't inserted");
  return row.id;
};

const settle = (id: number, values: Partial<Row> = { outcome: "dead" }) =>
  db
    .update(suiTransactions)
    .set({ settledAt: new Date(), ...values })
    .where(eq(suiTransactions.id, id))
    .run();

const purchase = () =>
  db.insert(ticketPurchases).values({ userId: person, tickets: 1, priceYen: 100 }).returning().get()
    ?.id;

/** A payment of `purchaseId` signed by `sender`. */
const payment = (sender: string, purchaseId = purchase()) =>
  insert({ kind: "payment", sender, userId: person, purchaseId });

/** A mint of a sticker of its own. */
const mint = () => insert({ kind: "mint", stickerId: insertSticker(db, person) })();

describe("sui_transactions", () => {
  it("holds one open transaction per gift and per purchase, until it settles", () => {
    const claim = insert({ kind: "claim", giftId: gift });
    const takeOut = insert({ kind: "take_out", userId: person, giftId: gift })();
    expect(refusal(claim)).toMatch(/sui_transactions.gift_id/);
    settle(takeOut);
    expect(claim).not.toThrow();

    const purchaseId = purchase();
    const paid = payment("payer", purchaseId)();
    expect(refusal(payment("another payer", purchaseId))).toMatch(/sui_transactions.purchase_id/);
    settle(paid, { outcome: "failed", failure: "MoveAbort" });
    expect(payment("another payer", purchaseId)).not.toThrow();
  });

  it("holds one open mint or deposit per sticker, and one open payment per payer", () => {
    insert({ kind: "mint", stickerId: sticker })();
    expect(
      refusal(insert({ kind: "deposit", userId: person, stickerId: sticker, giftId: gift })),
    ).toMatch(/sui_transactions.sticker_id/);

    payment("payer")();
    expect(refusal(payment("payer"))).toMatch(/sui_transactions.sender/);
    expect(payment("another payer")).not.toThrow();
  });

  it("settles with its date, and keeps Sui's words only for a failure or a refusal", () => {
    expect(refusal(() => settle(mint(), { outcome: "failed" }))).toMatch(
      /sui_transactions_failure/,
    );
    expect(refusal(() => settle(mint(), { outcome: "succeeded", failure: "MoveAbort" }))).toMatch(
      /sui_transactions_failure/,
    );
    expect(() =>
      settle(mint(), { outcome: "dead", failure: "Invalid user signature" }),
    ).not.toThrow();
    expect(refusal(() => settle(mint(), { outcome: "dead", settledAt: null }))).toMatch(
      /sui_transactions_settled/,
    );
  });

  it("is submitted only once its sender signed, and names the subject its kind moves", () => {
    expect(refusal(insert({ kind: "mint", stickerId: sticker, submittedAt: new Date() }))).toMatch(
      /sui_transactions_submitted/,
    );
    expect(refusal(insert({ kind: "mint", stickerId: sticker, userId: person }))).toMatch(
      /sui_transactions_subject/,
    );
    expect(refusal(insert({ kind: "payment", userId: person }))).toMatch(
      /sui_transactions_subject/,
    );
  });
});
