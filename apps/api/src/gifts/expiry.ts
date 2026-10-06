import { gifts, suiTransactions, type Db } from "@drawing-app/db";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import { runAsServer, sponsored, suiDepsOf, type SuiTransactionDeps } from "../sui/transactions.ts";
import {
  claimSucceeded,
  closeUndeposited,
  currentGift,
  giftRecord,
  settleOpenGiftTransaction,
  type GiftRow,
} from "./giftTransactions.ts";

/** What the sweep did with the gifts it found, by how many. */
export type ExpirySweep = Record<"returned" | "recorded" | "closed" | "left" | "failed", number>;

/** Gifts in the bag or sent, past their expiry, oldest first. */
const expiredOpenGifts = (db: Db, now: Date) =>
  db
    .select()
    .from(gifts)
    .where(and(inArray(gifts.status, ["packed", "sent"]), lt(gifts.expiresAt, now)))
    .orderBy(asc(gifts.expiresAt))
    .all();

const depositSucceeded = (db: Db, giftId: string) =>
  db
    .select({ id: suiTransactions.id })
    .from(suiTransactions)
    .where(
      and(
        eq(suiTransactions.giftId, giftId),
        eq(suiTransactions.kind, "deposit"),
        eq(suiTransactions.outcome, "succeeded"),
      ),
    )
    .get() !== undefined;

/**
 * Settles one expired gift: its open transaction first, an unsigned take-out dropped so the return
 * goes ahead. A gift the escrow never held closes, one it holds goes back to its giver, and one a
 * claim took is Receiving's to record. Rejects when the return doesn't land.
 */
async function settleExpired(
  sui: SuiTransactionDeps,
  expired: GiftRow,
): Promise<Exclude<keyof ExpirySweep, "failed">> {
  const fields = { giftId: expired.id, userId: expired.giverId, stickerId: expired.stickerId };
  const settled = await settleOpenGiftTransaction(sui, expired);
  if (settled?.outcome === null) {
    logInfo("gift.expiry.left", {
      ...fields,
      reason: `its ${settled.kind} hasn't shown on Sui yet`,
    });
    return "left";
  }
  const now = sui.clock.now();
  const gift = currentGift(sui.db, expired.id);
  if (gift.status !== "packed" && gift.status !== "sent") {
    logInfo("gift.expiry.recorded", { ...fields, status: gift.status });
    return "recorded";
  }
  if (claimSucceeded(sui.db, gift.id)) {
    logInfo("gift.expiry.left", { ...fields, reason: "its claim landed, for Receiving to record" });
    return "left";
  }
  if (gift.escrowStatus === "missing") {
    if (depositSucceeded(sui.db, gift.id)) {
      throw new Error(`Gift ${gift.id}'s deposit succeeded, but the database has the escrow empty`);
    }
    const closed = closeUndeposited(sui.db, gift, now);
    logInfo("gift.expiry.closed", { ...fields, status: closed.status });
    return "closed";
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
 * its sticker can be given again, and one it never held closes. One gift's failure is logged, and
 * the sweep goes on to the next. Nothing to do on the mock chain.
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
      tally[await oneAtATime(`gift:${gift.id}`, () => settleExpired(sui, gift))] += 1;
    } catch (error) {
      tally.failed += 1;
      logFailure("gift.expiry.failed", error, { giftId: gift.id, userId: gift.giverId });
    }
  }
  logInfo("gift.expiry.swept", { count: due.length, ...tally });
  return tally;
}

/**
 * The expiry sweep at boot, for what downtime left, then just after each midnight, Tokyo time. Null
 * on the mock chain, whose gifts never go into an escrow.
 */
export function startExpiredGiftReturns(deps: AppDeps & { schedule?: Schedule }) {
  if (!deps.sui) return null;
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "gift.expiry.sweep_failed",
      run: async () => {
        await returnExpiredGifts(deps);
        return null;
      },
    },
  );
}
