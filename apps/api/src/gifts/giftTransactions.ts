import { gifts, suiTransactions, type Db } from "@drawing-app/db";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { refuse, type Refusal } from "../shapes.ts";
import {
  drop,
  follow,
  type OnSucceeded,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import type { GiftObjectStatus } from "../sui/types.ts";

type Reader = Pick<Db, "select">;

export type GiftRow = typeof gifts.$inferSelect;

/** A step on one gift: the gift after it, or why it was refused. */
export type GiftStep<Code extends string> = { refusal: null; gift: GiftRow } | Refusal<Code>;

/** A gift its giver is changing, or why it can't be: there's no such gift, or it's someone else's. */
export function ownGift(
  gift: GiftRow | undefined,
  userId: string,
  giftId: string,
): GiftStep<"gift_not_found" | "not_yours"> {
  if (!gift) return refuse("gift_not_found", `There's no gift ${giftId}`);
  if (gift.giverId !== userId) return refuse("not_yours", `Gift ${giftId} is someone else's`);
  return { refusal: null, gift };
}

/**
 * The dates a gift moving to `status` needs, as gifts_status_dates asks: a take-out keeps its first
 * date, and a return has none.
 */
function closingDates(status: GiftRow["status"], gift: GiftRow, now: Date) {
  if (status === "taken_out") return { takenOutAt: gift.takenOutAt ?? now };
  if (status === "returned") return { takenOutAt: null, returnedAt: now };
  return {};
}

/** The gift's open Sui transaction, of any kind: sui_transactions_open_gift allows one. */
export const openGiftTransaction = (db: Reader, giftId: string) =>
  db
    .select()
    .from(suiTransactions)
    .where(and(eq(suiTransactions.giftId, giftId), isNull(suiTransactions.outcome)))
    .get();

/** The gift's transaction of `kind` with `digest`, settled or not: what the app posts a signature for. */
export const giftTransaction = (
  db: Reader,
  giftId: string,
  kind: SuiTransaction["kind"],
  digest: string,
) =>
  db
    .select()
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.giftId, giftId),
        eq(suiTransactions.kind, kind),
        eq(suiTransactions.digest, digest),
      ),
    )
    .get();

/** Whether a claim of the gift succeeded on Sui. */
export const claimSucceeded = (db: Reader, giftId: string) =>
  db
    .select({ id: suiTransactions.id })
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.giftId, giftId),
        eq(suiTransactions.kind, "claim"),
        eq(suiTransactions.outcome, "succeeded"),
      ),
    )
    .get() !== undefined;

/** The gift as the database holds it now. */
export function currentGift(db: Reader, giftId: string): GiftRow {
  const gift = db.select().from(gifts).where(eq(gifts.id, giftId)).get();
  if (!gift) throw new Error(`Gift ${giftId} is gone`);
  return gift;
}

export const alreadyReceived = (gift: GiftRow) =>
  refuse("already_received", `Gift ${gift.id} was already received`);

/** The gift taken out by its giver: its sticker back in their wallet. */
export function recordTakenOut(db: Pick<Db, "update">, gift: GiftRow, now: Date) {
  db.update(gifts)
    .set({
      status: "taken_out",
      escrowStatus: "taken_out",
      ...closingDates("taken_out", gift, now),
    })
    .where(eq(gifts.id, gift.id))
    .run();
}

/** The gift sent back to its giver once it expired. */
function recordReturned(db: Pick<Db, "update">, gift: GiftRow, now: Date) {
  db.update(gifts)
    .set({
      status: "returned",
      escrowStatus: "expired_returned",
      ...closingDates("returned", gift, now),
    })
    .where(eq(gifts.id, gift.id))
    .run();
}

/**
 * Records a take-out or a return the escrow shows that no transaction this server followed made:
 * one from the giver's own wallet, or one Sui stopped showing. Any other status records nothing.
 * Answers the gift as it now stands.
 */
export function recordEscrowClosing(
  db: Db,
  gift: GiftRow,
  escrow: GiftObjectStatus,
  now: Date,
): GiftRow {
  if (escrow === "taken_out") recordTakenOut(db, gift, now);
  if (escrow === "expired_returned") recordReturned(db, gift, now);
  return currentGift(db, gift.id);
}

/**
 * What a gift transaction that succeeded records, by its kind, in the database transaction that
 * settles it. A claim's record is the receive, which only Receiving can write, knowing the receiver:
 * another flow settling a claim leaves the receive to what the escrow shows.
 */
export function giftRecord(
  row: SuiTransaction,
  gift: GiftRow,
  now: Date,
  receive?: OnSucceeded,
): OnSucceeded | undefined {
  switch (row.kind) {
    case "deposit":
      // The escrow holds the gift now; a gift still in the bag is the only one a deposit can land for.
      return (tx) => {
        tx.update(gifts)
          .set({ escrowStatus: "pending" })
          .where(
            and(
              eq(gifts.id, gift.id),
              eq(gifts.status, "packed"),
              eq(gifts.escrowStatus, "missing"),
            ),
          )
          .run();
      };
    case "take_out":
      return (tx) => recordTakenOut(tx, gift, now);
    case "return":
      return (tx) => recordReturned(tx, gift, now);
    case "claim":
      return receive;
    case "mint":
    case "payment":
      return undefined;
  }
}

/**
 * How many deposits and take-outs one person can have sponsored in GIVING_LIMIT_WINDOW_MS: far more
 * than anyone giving makes, so only a loop of packaging and taking out reaches it, which would
 * otherwise tie up Shinami's fund for everyone.
 */
export const GIVING_LIMIT = 60;
export const GIVING_LIMIT_WINDOW_MS = 24 * 60 * 60_000;

/** Refuses a person who already had GIVING_LIMIT deposits and take-outs sponsored in the window. */
export function givingLimitRefusal(db: Reader, userId: string, now: Date) {
  const { count } = db
    .select({ count: sql<number>`count(*)` })
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.userId, userId),
        inArray(suiTransactions.kind, ["deposit", "take_out"]),
        gt(suiTransactions.createdAt, new Date(now.getTime() - GIVING_LIMIT_WINDOW_MS)),
      ),
    )
    .get() ?? { count: 0 };
  if (count < GIVING_LIMIT) return null;
  return refuse(
    "giving_limit_reached",
    `Person ${userId} had ${count} deposits and take-outs sponsored in the last ${GIVING_LIMIT_WINDOW_MS / 3_600_000} hours, the most allowed`,
  );
}

/**
 * Settles the gift's open transaction before a flow goes ahead: a submitted one is followed, with
 * its kind's record, and an unsubmitted one is dropped, so the first transaction to land wins.
 * Answers the row as it now stands, still open while Sui doesn't show it; null when there was none.
 */
export async function settleOpenGiftTransaction(
  sui: SuiTransactionDeps,
  gift: GiftRow,
  receive?: OnSucceeded,
): Promise<SuiTransaction | null> {
  const open = openGiftTransaction(sui.db, gift.id);
  if (!open) return null;
  if (open.submittedAt === null) return drop(sui, open);
  return (await follow(sui, open, giftRecord(open, gift, sui.clock.now(), receive))).row;
}

/**
 * Closes a gift whose deposit never landed, and now won't, as taken out with the escrow holding
 * nothing: its sticker never left the giver's wallet. Only while it's still in the bag that way.
 */
export function closeUndeposited(db: Db, gift: GiftRow, now: Date): GiftRow {
  db.update(gifts)
    .set({ status: "taken_out", escrowStatus: "missing", ...closingDates("taken_out", gift, now) })
    .where(
      and(eq(gifts.id, gift.id), eq(gifts.status, gift.status), eq(gifts.escrowStatus, "missing")),
    )
    .run();
  return currentGift(db, gift.id);
}
