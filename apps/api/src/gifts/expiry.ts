import { gifts, type Db } from "@drawing-app/db";
import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { AppDeps, GiftChain } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { checkDeposit, closingDates } from "./deposit.ts";
import type { GiftRow } from "./packaging.ts";

/**
 * How long past its expiry the sweep leaves a gift whose deposit it can't see before closing it: a
 * deposit can land in a block just before the expiry while the RPC lags behind that block.
 */
export const CLOSE_UNLANDED_AFTER_MS = 60 * 60_000;

/** What the sweep did with the gifts it found, by how many. */
type ExpirySweep = Record<"returned" | "recorded" | "closed" | "left" | "failed", number>;

/**
 * Gifts in the bag or sent, past their expiry. gifts_status_escrow leaves each a deposit seen to
 * land, or a packed one's deposit not seen yet.
 */
const expiredOpenGifts = (db: Db, now: Date) =>
  db
    .select()
    .from(gifts)
    .where(and(inArray(gifts.status, ["packed", "sent"]), lt(gifts.expiresAt, now)))
    .orderBy(asc(gifts.expiresAt))
    .all();

/**
 * Takes out a packed gift whose deposit never landed, and now can't, since the escrow refuses a
 * deposit past its expiry; its sticker never left the giver's wallet. Only while the gift is still
 * as the sweep read it.
 */
function closeUnlanded({ db, clock }: Pick<AppDeps, "db" | "clock">, gift: GiftRow) {
  const closed = db.transaction(
    (tx) => {
      tx.update(gifts)
        .set({
          status: "taken_out",
          escrowStatus: "missing",
          ...closingDates("taken_out", gift, clock.now()),
        })
        .where(
          and(
            eq(gifts.id, gift.id),
            eq(gifts.status, gift.status),
            eq(gifts.escrowStatus, gift.escrowStatus),
          ),
        )
        .run();
      return tx.select().from(gifts).where(eq(gifts.id, gift.id)).get();
    },
    { behavior: "immediate" },
  );
  if (closed?.status !== "taken_out" || closed.escrowStatus !== "missing") {
    throw new Error(
      `Gift ${gift.id} changed while the sweep read the escrow, so the next sweep settles it`,
    );
  }
  return closed;
}

/**
 * Sends one expired gift's sticker back to its giver, unless the escrow already let it go, then
 * records what the escrow says; or closes a packed gift whose deposit never landed. Rejects when the
 * chain fails, or the gift isn't settled after.
 */
async function settleExpired(
  deps: Pick<AppDeps, "db" | "clock">,
  giftChain: GiftChain,
  gift: GiftRow,
): Promise<Exclude<keyof ExpirySweep, "failed">> {
  const fields = { giftId: gift.id, userId: gift.giverId, stickerId: gift.stickerId };
  const escrow = await giftChain.readEscrowGift(gift.id);
  const unlanded = escrow.status === "missing" && gift.escrowStatus === "missing";
  if (unlanded && deps.clock.now().getTime() - gift.expiresAt.getTime() > CLOSE_UNLANDED_AFTER_MS) {
    const closed = closeUnlanded(deps, gift);
    logInfo("gift.expiry.closed", { ...fields, status: closed.status });
    return "closed";
  }
  // Receiving records a claim that landed before the expiry. A deposit the escrow doesn't have is in
  // another escrow when the database saw it land, and may still show up, within
  // CLOSE_UNLANDED_AFTER_MS, when it didn't.
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
 * again; a packed gift whose deposit never landed is taken out. One gift's failure is logged, and
 * the sweep goes on to the next.
 */
export async function returnExpiredGifts(
  deps: Pick<AppDeps, "db" | "clock">,
  giftChain: GiftChain,
): Promise<ExpirySweep> {
  const due = expiredOpenGifts(deps.db, deps.clock.now());
  const tally: ExpirySweep = { returned: 0, recorded: 0, closed: 0, left: 0, failed: 0 };
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
