import { gifts, suiTransactions, type Db } from "@drawing-app/db";
import { and, asc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  follow,
  runAsServer,
  sponsored,
  suiDepsOf,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import type { EscrowGift } from "../sui/types.ts";
import {
  claimSucceeded,
  closeUndeposited,
  currentGift,
  giftRecord,
  recordEscrowClosing,
  settleOpenGiftTransaction,
  type GiftRow,
} from "./giftTransactions.ts";
import { recordClaimShown } from "./receiving.ts";

/**
 * How long past its expiry a gift waits for the sweep: return_expired aborts until Sui's clock,
 * which can lag the box's, is past the expiry.
 */
export const RETURN_CLOCK_MARGIN_MS = 60_000;

/** What the sweep did with the gifts it found, by how many. */
export type ExpirySweep = Record<"returned" | "recorded" | "closed" | "left" | "failed", number>;

/** Gifts in the bag or sent, past their expiry by RETURN_CLOCK_MARGIN_MS, oldest first. */
const expiredOpenGifts = (db: Db, now: Date) =>
  db
    .select()
    .from(gifts)
    .where(
      and(
        inArray(gifts.status, ["packed", "sent"]),
        lt(gifts.expiresAt, new Date(now.getTime() - RETURN_CLOCK_MARGIN_MS)),
      ),
    )
    .orderBy(asc(gifts.expiresAt))
    .all();

/** Whether the gift's deposit was ever sent to Sui: one never sent can't be in the escrow. */
const depositSent = (db: Db, giftId: string) =>
  db
    .select({ id: suiTransactions.id })
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.giftId, giftId),
        eq(suiTransactions.kind, "deposit"),
        isNotNull(suiTransactions.submittedAt),
      ),
    )
    .get() !== undefined;

const NEVER_DEPOSITED: EscrowGift = { status: "missing", recipient: null };

/**
 * Settles one expired gift: its open transaction first, an unsigned take-out dropped so the return
 * goes ahead. Then the escrow says where the sticker is, since Sui can stop showing a transaction
 * that ran, and the giver's own wallet can take a gift out: a gift it never held closes, one it
 * holds goes back to its giver, and one a claim or a take-out took is recorded so. Rejects when the
 * return doesn't land.
 */
async function settleExpired(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  expired: GiftRow,
): Promise<Exclude<keyof ExpirySweep, "failed">> {
  const fields = { giftId: expired.id, userId: expired.giverId, stickerId: expired.stickerId };
  const left = (reason: string) => {
    logInfo("gift.expiry.left", { ...fields, reason });
    return "left" as const;
  };
  const settled = await settleOpenGiftTransaction(sui, expired);
  if (settled?.outcome === null) return left(`its ${settled.kind} hasn't shown on Sui yet`);
  const now = sui.clock.now();
  const gift = currentGift(sui.db, expired.id);
  if (gift.status !== "packed" && gift.status !== "sent") {
    logInfo("gift.expiry.recorded", { ...fields, status: gift.status });
    return "recorded";
  }
  const escrow =
    gift.escrowStatus === "missing" && !depositSent(sui.db, gift.id)
      ? NEVER_DEPOSITED
      : await sui.sui.readGift(gift.id);
  switch (escrow.status) {
    case "missing": {
      if (gift.escrowStatus !== "missing") {
        return left("Sui doesn't show the gift its deposit put in the escrow");
      }
      const closed = closeUndeposited(sui.db, gift, now);
      logInfo("gift.expiry.closed", { ...fields, status: closed.status });
      return "closed";
    }
    case "claimed":
      if (!escrow.recipient || !recordClaimShown(deps, gift, escrow.recipient)) {
        return left(`no one has wallet ${escrow.recipient}, which its claim sent the sticker to`);
      }
      logInfo("gift.expiry.recorded", { ...fields, status: "received" });
      return "recorded";
    case "taken_out":
    case "expired_returned": {
      const closed = recordEscrowClosing(sui.db, gift, escrow.status, now);
      logInfo("gift.expiry.recorded", { ...fields, status: closed.status });
      return "recorded";
    }
    case "pending":
      if (claimSucceeded(sui.db, gift.id)) {
        return left("its claim landed, but Sui doesn't show it in the escrow yet");
      }
  }
  const back = await sponsored(
    sui,
    { kind: "return", giftId: gift.id, stickerId: gift.stickerId },
    await sui.sui.returnKind(gift.id),
  );
  const { row } = await runAsServer(sui, back, giftRecord(back, gift, now));
  if (row.outcome !== "succeeded") {
    const why = row.failure ? `: ${row.failure}` : "";
    throw new Error(
      `Gift ${gift.id}'s return ${row.outcome ?? "isn't shown on Sui yet"}${why}, so the next sweep settles it`,
    );
  }
  logInfo("gift.expiry.returned", { ...fields, status: "returned", txDigest: row.digest });
  return "returned";
}

/**
 * The expiry sweep: every gift in the bag or sent past its expiry is settled, oldest first, each
 * holding its gift's key: one the escrow holds goes back to its giver and is recorded returned, so
 * its sticker can be given again, one it never held closes, and one it let go is recorded as it
 * went. One gift's failure is logged, and the sweep goes on to the next. Nothing to do on the mock
 * chain.
 */
export async function returnExpiredGifts(deps: AppDeps): Promise<ExpirySweep> {
  const tally: ExpirySweep = { returned: 0, recorded: 0, closed: 0, left: 0, failed: 0 };
  const sui = suiDepsOf(deps);
  if (!sui) return tally;
  const due = expiredOpenGifts(deps.db, deps.clock.now());
  if (due.length > 0) logInfo("gift.expiry.sweep", { count: due.length });
  // One at a time, so the server's transactions and Sui's reads never come in a burst.
  for (const gift of due) {
    try {
      tally[await oneAtATime(`gift:${gift.id}`, () => settleExpired(deps, sui, gift))] += 1;
    } catch (error) {
      tally.failed += 1;
      logFailure("gift.expiry.failed", error, { giftId: gift.id, userId: gift.giverId });
    }
  }
  logInfo("gift.expiry.swept", { count: due.length, ...tally });
  return tally;
}

/** Gift transactions sent to Sui that haven't settled, oldest first. */
const submittedGiftTransactions = (db: Db) =>
  db
    .select()
    .from(suiTransactions)
    .where(
      and(
        isNotNull(suiTransactions.giftId),
        isNotNull(suiTransactions.submittedAt),
        isNull(suiTransactions.outcome),
      ),
    )
    .orderBy(asc(suiTransactions.createdAt))
    .all();

/**
 * Follows one gift transaction with its kind's record. A claim that ran is recorded as the receive
 * of whoever's wallet the escrow sent the sticker to, since no one may press Accept again.
 */
async function followGiftTransaction(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  giftId: string,
  row: SuiTransaction,
): Promise<SuiTransaction> {
  const before = currentGift(sui.db, giftId);
  const { row: followed } = await follow(sui, row, giftRecord(row, before, sui.clock.now()));
  if (followed.kind !== "claim" || followed.outcome !== "succeeded") return followed;
  const gift = currentGift(sui.db, giftId);
  if (gift.status !== "packed" && gift.status !== "sent") return followed;
  const escrow = await sui.sui.readGift(giftId);
  if (escrow.status === "claimed" && escrow.recipient) {
    recordClaimShown(deps, gift, escrow.recipient);
  }
  return followed;
}

/**
 * Follows every gift transaction sent to Sui whose answer was lost, each holding its gift's key, so
 * it settles while Sui still shows whether it ran: a fullnode keeps only days of history, less than
 * a gift's expiry. One transaction's failure is logged, and the sweep goes on to the next.
 */
async function followLostGiftTransactions(deps: AppDeps): Promise<void> {
  const sui = suiDepsOf(deps);
  if (!sui) return;
  const open = submittedGiftTransactions(deps.db);
  if (open.length === 0) return;
  const tally = { settled: 0, open: 0, failed: 0 };
  for (const row of open) {
    const { giftId } = row;
    try {
      if (giftId === null) throw new Error(`Gift transaction ${row.digest} names no gift`);
      const followed = await oneAtATime(`gift:${giftId}`, () =>
        followGiftTransaction(deps, sui, giftId, row),
      );
      tally[followed.outcome === null ? "open" : "settled"] += 1;
    } catch (error) {
      tally.failed += 1;
      logFailure("gift.lost_transactions.failed", error, {
        giftId: giftId ?? undefined,
        txDigest: row.digest,
      });
    }
  }
  logInfo("gift.lost_transactions.followed", { count: open.length, ...tally });
}

/**
 * The expiry sweep at boot, for what downtime left, then just after each midnight, Tokyo time,
 * after following the gift transactions whose answer was lost. Null on the mock chain, whose gifts
 * never go into an escrow.
 */
export function startExpiredGiftReturns(deps: AppDeps & { schedule?: Schedule }) {
  if (!deps.sui) return null;
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "gift.expiry.sweep_failed",
      run: async () => {
        await followLostGiftTransactions(deps);
        await returnExpiredGifts(deps);
        return null;
      },
    },
  );
}
