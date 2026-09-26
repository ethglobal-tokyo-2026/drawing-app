import { gifts, stickers, users } from "@drawing-app/db";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { AppDeps, EscrowGift, GiftChain } from "../deps.ts";
import { bytes32Schema } from "../shapes.ts";
import { ownGift, refuse, type GiftRow, type GiftStep } from "./packaging.ts";

export const depositBodySchema = z.object({
  /** The escrow transfer's transaction or user operation hash. */
  txHash: bytes32Schema,
});

/** What the escrow holds for a gift whose deposit hadn't been seen. */
export type DepositCheck = "landed" | "not_landed" | "mismatch";

/** The escrow keeps expiries in whole seconds. */
const chainSeconds = (at: Date) => Math.floor(at.getTime() / 1000);

/** Whether the escrow's record is the deposit packaging issued. */
function isIssuedDeposit(
  record: EscrowGift,
  gift: GiftRow,
  issued: { sender: string | null; tokenId: string | null },
) {
  return (
    record.status === "pending" &&
    record.sender.toLowerCase() === issued.sender?.toLowerCase() &&
    record.tokenId === issued.tokenId &&
    record.claimCommitment.toLowerCase() === gift.claimCommitment &&
    chainSeconds(record.expiresAt) === chainSeconds(gift.expiresAt)
  );
}

/**
 * Reads the escrow's record of a gift whose deposit hasn't been seen, and records that the escrow
 * holds it. A record that isn't the deposit packaging issued also takes the gift out, so the worker
 * rejects it back to the giver.
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
  const record = await giftChain.readEscrowGift(gift.id);
  if (record.status === "missing") return { check: "not_landed", gift };
  const check = issued && isIssuedDeposit(record, gift, issued) ? "landed" : "mismatch";
  const now = clock.now();
  const checked = db.transaction(
    (tx) => {
      const unseen = and(eq(gifts.id, gift.id), eq(gifts.escrowStatus, "missing"));
      if (check === "mismatch") {
        tx.update(gifts)
          .set({ status: "taken_out", takenOutAt: now })
          .where(and(unseen, inArray(gifts.status, ["packed", "sent"])))
          .run();
      }
      tx.update(gifts).set({ escrowStatus: "pending" }).where(unseen).run();
      return tx.select().from(gifts).where(eq(gifts.id, gift.id)).get();
    },
    { behavior: "immediate" },
  );
  if (!checked) throw new Error(`Gift ${gift.id} vanished while its deposit was checked`);
  return { check, gift: checked };
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
    return refuse(
      "deposit_mismatch",
      `The escrow's deposit for gift ${giftId} isn't the one packaging issued, so the gift is taken out`,
    );
  }
  return { refusal: null, gift };
}
