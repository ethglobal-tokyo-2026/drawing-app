import { gifts, type Db } from "@drawing-app/db";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { AppDeps, GiftChain } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { checkDeposit } from "./deposit.ts";
import type { GiftRow } from "./packaging.ts";

/** What the sweep did with the gifts it found, by how many. */
type ExpirySweep = Record<"returned" | "recorded" | "left" | "failed", number>;

/** Gifts in the bag or sent, past their expiry, whose deposit the database saw land. */
const expiredInEscrow = (db: Db, now: Date) =>
  db
    .select()
    .from(gifts)
    .where(
      and(
        eq(gifts.escrowStatus, "pending"),
        inArray(gifts.status, ["packed", "sent"]),
        lt(gifts.expiresAt, now),
      ),
    )
    .orderBy(asc(gifts.expiresAt))
    .all();

/**
 * Sends one expired gift's sticker back to its giver, unless the escrow already let it go, then
 * records what the escrow says. Rejects when the chain fails, or the escrow still reads the gift
 * pending after its return.
 */
async function settleExpired(
  deps: Pick<AppDeps, "db" | "clock">,
  giftChain: GiftChain,
  gift: GiftRow,
): Promise<Exclude<keyof ExpirySweep, "failed">> {
  const fields = { giftId: gift.id, userId: gift.giverId, stickerId: gift.stickerId };
  const escrow = await giftChain.readEscrowGift(gift.id);
  // Receiving records a claim that landed before the expiry; a deposit this escrow doesn't have
  // leaves nothing here to send back.
  if (escrow.status === "claimed" || escrow.status === "missing") {
    logInfo("gift.expiry.left", { ...fields, status: escrow.status });
    return "left";
  }
  const sentBack = escrow.status === "pending" ? await giftChain.returnExpiredGift(gift.id) : null;
  const { gift: settled } = await checkDeposit(deps, giftChain, gift);
  if (settled.escrowStatus === "pending") {
    throw new Error(
      `The escrow still reads gift ${gift.id} pending after its return, so the next sweep records it`,
    );
  }
  if (!sentBack) {
    logInfo("gift.expiry.recorded", { ...fields, status: settled.status });
    return "recorded";
  }
  logInfo("gift.expiry.returned", { ...fields, status: settled.status, txHash: sentBack.txHash });
  return "returned";
}

/**
 * The expiry sweep: every gift the escrow still holds past its expiry goes back to its giver, oldest
 * first, and is recorded returned, so its sticker is back on their Sticker Board and can be given
 * again. One gift's failure is logged, and the sweep goes on to the next.
 */
export async function returnExpiredGifts(
  deps: Pick<AppDeps, "db" | "clock">,
  giftChain: GiftChain,
): Promise<ExpirySweep> {
  const due = expiredInEscrow(deps.db, deps.clock.now());
  const tally: ExpirySweep = { returned: 0, recorded: 0, left: 0, failed: 0 };
  if (due.length > 0) logInfo("gift.expiry.sweep", { count: due.length });
  // One at a time, so the relayer's transactions and the escrow reads never come in a burst.
  for (const gift of due) {
    try {
      tally[await settleExpired(deps, giftChain, gift)] += 1;
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
export function startExpiredGiftReturns({
  db,
  clock,
  giftChain,
  schedule,
}: Pick<AppDeps, "db" | "clock" | "giftChain"> & { schedule?: Schedule }) {
  if (!giftChain) return null;
  return startMidnightJob(
    { clock, schedule },
    {
      failedEvent: "gift.expiry.sweep_failed",
      run: async () => {
        await returnExpiredGifts({ db, clock }, giftChain);
        return null;
      },
    },
  );
}
