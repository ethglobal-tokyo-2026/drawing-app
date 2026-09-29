import { gifts, stickers, users } from "@drawing-app/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppDeps, EscrowGift, GiftChain } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import { bytes32Schema, refuse } from "../shapes.ts";
import type { GiftRow, GiftStep } from "./packaging.ts";

export const depositBodySchema = z.object({
  /**
   * The escrow transfer's transaction, logged with the report so the deposit can be traced.
   * Optional after a lost response: the escrow record is authoritative.
   */
  txHash: bytes32Schema.optional(),
});

/** What the escrow's record says of a gift's deposit. */
export type DepositCheck = "landed" | "not_landed" | "mismatch";

/** The escrow keeps expiries in whole seconds. */
const chainSeconds = (at: Date) => Math.floor(at.getTime() / 1000);

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
export function closingDates(status: GiftRow["status"], gift: GiftRow, now: Date) {
  if (status === "taken_out") return { takenOutAt: gift.takenOutAt ?? now };
  if (status === "returned") return { takenOutAt: null, returnedAt: now };
  return {};
}

type Settled = Pick<GiftRow, "status" | "escrowStatus"> & {
  check: Exclude<DepositCheck, "not_landed">;
};

/** The gift as the escrow's record leaves it; null while the escrow has no record of it. */
function settledBy(
  record: EscrowGift,
  gift: GiftRow,
  issued: { sender: string | null; tokenId: string | null },
): Settled | null {
  if (record.status === "missing") return null;
  // Another deposit holds the gift's id, so our sticker never entered the escrow, and now can't.
  if (
    record.sender.toLowerCase() !== issued.sender?.toLowerCase() ||
    record.tokenId !== issued.tokenId
  ) {
    return { check: "mismatch", status: "taken_out", escrowStatus: "missing" };
  }
  const check =
    record.claimCommitment.toLowerCase() === gift.claimCommitment &&
    chainSeconds(record.expiresAt) === chainSeconds(gift.expiresAt)
      ? "landed"
      : "mismatch";
  switch (record.status) {
    case "rejected":
      return { check, status: "taken_out", escrowStatus: "rejected" };
    case "expired_returned":
      return { check, status: "returned", escrowStatus: "expired_returned" };
    case "claimed":
      // Receiving claims only a deposit it has seen, so the server never recorded this receive:
      // as landed, Receiving's reconcile settles who holds the sticker.
      return { check: "landed", status: gift.status, escrowStatus: "pending" };
    case "pending":
      // Under other terms it can't be received, and only its giver can take it out on chain.
      return check === "landed"
        ? { check, status: gift.status, escrowStatus: "pending" }
        : { check, status: "taken_out", escrowStatus: "pending" };
  }
}

/**
 * Reads the escrow's record of a gift whose deposit hasn't been seen, or of one the server took out
 * while the escrow held its sticker, and records what it says: landed, sent back to the giver, or
 * never our sticker. Our sticker under other terms takes the gift out, and stays in the escrow until
 * its giver takes it out on chain.
 */
export async function checkDeposit(
  { db, clock }: Pick<AppDeps, "db" | "clock">,
  giftChain: GiftChain,
  gift: GiftRow,
): Promise<{ check: DepositCheck; gift: GiftRow }> {
  const issued = db
    .select({ sender: users.smartAccountAddress, tokenId: stickers.tokenId })
    .from(gifts)
    .innerJoin(users, eq(users.id, gifts.giverId))
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .where(eq(gifts.id, gift.id))
    .get();
  if (!issued) throw new Error(`Gift ${gift.id}'s giver or sticker is missing`);
  const record = await giftChain.readEscrowGift(gift.id);
  const settled = settledBy(record, gift, issued);
  if (!settled) return { check: "not_landed", gift };
  if (record.status === "claimed") logInfo("gift.deposit.already_claimed", { giftId: gift.id });
  if (settled.status === gift.status && settled.escrowStatus === gift.escrowStatus) {
    return { check: settled.check, gift };
  }
  const now = clock.now();
  const checked = db.transaction(
    (tx) => {
      // Another request may have recorded it while the escrow was read.
      tx.update(gifts)
        .set({
          status: settled.status,
          escrowStatus: settled.escrowStatus,
          ...closingDates(settled.status, gift, now),
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
  if (!checked) throw new Error(`Gift ${gift.id} vanished while its deposit was checked`);
  return { check: settled.check, gift: checked };
}

/** The giver's report that the escrow transfer went out. A deposit already seen answers the gift. */
export async function reportDeposit(
  deps: AppDeps,
  userId: string,
  giftId: string,
): Promise<GiftStep<"gift_not_found" | "not_yours" | "deposit_not_landed" | "deposit_mismatch">> {
  const { db, giftChain } = deps;
  const owned = ownGift(db.select().from(gifts).where(eq(gifts.id, giftId)).get(), userId, giftId);
  if (owned.refusal !== null) return owned;
  // On the mock chain every deposit has landed since packaging.
  if (!giftChain || owned.gift.escrowStatus !== "missing") return owned;
  const { check, gift } = await checkDeposit(deps, giftChain, owned.gift);
  if (check === "not_landed") {
    return refuse("deposit_not_landed", `The escrow has no deposit for gift ${giftId} yet`);
  }
  if (check === "mismatch") {
    const sticker =
      gift.escrowStatus === "pending"
        ? "the escrow holds its sticker until the giver takes it out on chain"
        : "its sticker can be given again";
    return refuse(
      "deposit_mismatch",
      `The escrow's deposit for gift ${giftId} isn't the one packaging issued, so the gift is ${gift.status}, and ${sticker}`,
    );
  }
  return { refusal: null, gift };
}
