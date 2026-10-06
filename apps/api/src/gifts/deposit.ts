import { gifts } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { refuse, type SignedTransaction } from "../shapes.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import { runSigned, suiDepsOf } from "../sui/transactions.ts";
import {
  closeUndeposited,
  currentGift,
  giftRecord,
  giftTransaction,
  ownGift,
  type GiftStep,
} from "./giftTransactions.ts";

export type Depositing = GiftStep<
  | "gift_not_found"
  | "not_yours"
  | "sponsorship_expired"
  | "transaction_failed"
  | "deposit_not_landed"
>;

/**
 * The giver's signed deposit, which the server checks and submits: the gift once the escrow holds
 * it. On the mock chain every gift is in the escrow from Packaging on.
 */
export async function submitDeposit(
  deps: AppDeps,
  userId: string,
  giftId: string,
  signed: SignedTransaction,
): Promise<Depositing> {
  const owned = ownGift(
    deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get(),
    userId,
    giftId,
  );
  const sui = suiDepsOf(deps);
  if (owned.refusal !== null || !sui) return owned;
  return oneAtATime(`gift:${giftId}`, async (): Promise<Depositing> => {
    const deposit = giftTransaction(sui.db, giftId, "deposit", signed.digest);
    if (!deposit) {
      return refuse(
        "sponsorship_expired",
        `Gift ${giftId} has no deposit ${signed.digest}; package it again for a new one`,
      );
    }
    const gift = currentGift(sui.db, giftId);
    const now = sui.clock.now();
    const { row } = await runSigned(sui, deposit, signed.signature, giftRecord(deposit, gift, now));
    switch (row.outcome) {
      case "succeeded":
        return { refusal: null, gift: currentGift(sui.db, giftId) };
      case "failed":
        // It never moved the sticker, so the gift closes and the sticker can be given again.
        closeUndeposited(sui.db, gift, now);
        return refuse(
          "transaction_failed",
          `Gift ${giftId}'s deposit failed on Sui: ${row.failure ?? "Sui gave no reason"}`,
        );
      case "dead":
        return refuse(
          "sponsorship_expired",
          row.failure
            ? `Sui refused gift ${giftId}'s deposit: ${row.failure}`
            : `Gift ${giftId}'s deposit ${signed.digest} lapsed unsigned; package it again for a new one`,
        );
      case null:
        return refuse(
          "deposit_not_landed",
          `Sui hasn't answered gift ${giftId}'s deposit yet; send the same signature again`,
        );
    }
  });
}
