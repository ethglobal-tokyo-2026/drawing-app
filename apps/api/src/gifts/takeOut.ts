import { gifts } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { refuse, type Refusal, type SignedTransaction } from "../shapes.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  isLive,
  runSigned,
  sponsored,
  suiDepsOf,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import {
  claimSucceeded,
  closeUndeposited,
  closingDates,
  currentGift,
  giftRecord,
  giftTransaction,
  openGiftTransaction,
  ownGift,
  settleOpenGiftTransaction,
  type GiftRow,
  type GiftStep,
} from "./giftTransactions.ts";

const alreadyReceived = (gift: GiftRow) =>
  refuse("already_received", `Gift ${gift.id} was already received`);

/**
 * A take-out its gift's status already answers: one that landed before, answered again, or a
 * refusal. Null while the gift is packed or sent, so it can still be taken out.
 */
function takeOutState(gift: GiftRow): GiftStep<"already_received"> | null {
  if (gift.status === "taken_out" || gift.status === "returned") return { refusal: null, gift };
  if (gift.status === "received") return alreadyReceived(gift);
  return null;
}

export type TakeOutStarting =
  | Refusal<
      | "gift_not_found"
      | "not_yours"
      | "already_received"
      | "no_sui_wallet"
      | "deposit_not_landed"
      | "take_out_not_landed"
    >
  | { refusal: null; gift: GiftRow; takeOut: SuiTransaction | null };

/**
 * Take-out's start: takes a gift back before anyone receives it, from the bag or after sending. A
 * gift the escrow holds answers the take-out for its giver's wallet to sign; one it doesn't hold
 * closes at once, as every gift does on the mock chain.
 */
export async function startTakeOut(
  deps: AppDeps,
  userId: string,
  giftId: string,
): Promise<TakeOutStarting> {
  const owned = ownGift(
    deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get(),
    userId,
    giftId,
  );
  if (owned.refusal !== null) return owned;
  const sui = suiDepsOf(deps);
  if (!sui) return takeOutOnMockChain(deps, owned.gift);
  return oneAtATime(`gift:${giftId}`, () => startTakeOutOnSui(deps, sui, giftId));
}

function takeOutOnMockChain({ db, clock }: AppDeps, gift: GiftRow): TakeOutStarting {
  const answered = takeOutState(gift);
  if (answered) return answered.refusal === null ? { ...answered, takeOut: null } : answered;
  const takenOut = db
    .update(gifts)
    .set({
      status: "taken_out",
      escrowStatus: "taken_out",
      ...closingDates("taken_out", gift, clock.now()),
    })
    .where(eq(gifts.id, gift.id))
    .returning()
    .get();
  return { refusal: null, gift: takenOut, takeOut: null };
}

async function startTakeOutOnSui(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  giftId: string,
): Promise<TakeOutStarting> {
  const { db } = sui;
  const before = currentGift(db, giftId);
  const answered = takeOutState(before);
  if (answered) return answered.refusal === null ? { ...answered, takeOut: null } : answered;
  const open = openGiftTransaction(db, giftId);
  if (open?.kind === "take_out" && isLive(open, sui.clock.now())) {
    return { refusal: null, gift: before, takeOut: open };
  }
  const settled = await settleOpenGiftTransaction(sui, before);
  if (settled?.outcome === null) {
    const what = settled.kind === "take_out" ? "take_out_not_landed" : "deposit_not_landed";
    return refuse(
      what,
      `Sui hasn't shown gift ${giftId}'s ${settled.kind} yet; try again in a moment`,
    );
  }
  const gift = currentGift(db, giftId);
  const after = takeOutState(gift);
  if (after) return after.refusal === null ? { ...after, takeOut: null } : after;
  // A claim the receiver hasn't recorded yet still sent the sticker on.
  if (claimSucceeded(db, giftId)) return alreadyReceived(gift);
  if (gift.escrowStatus === "missing") {
    return { refusal: null, gift: closeUndeposited(db, gift, sui.clock.now()), takeOut: null };
  }
  const sender = await deps.suiWallets.addressFor(gift.giverId);
  if (!sender) {
    return refuse(
      "no_sui_wallet",
      `Person ${gift.giverId} has no Sui wallet to take the gift out to`,
    );
  }
  const takeOut = await sponsored(
    sui,
    { kind: "take_out", sender, userId: gift.giverId, giftId, stickerId: gift.stickerId },
    await sui.sui.takeOutKind(sender, giftId),
  );
  return { refusal: null, gift, takeOut };
}

export type TakingOut = GiftStep<
  | "gift_not_found"
  | "not_yours"
  | "already_received"
  | "sponsorship_expired"
  | "transaction_failed"
  | "take_out_not_landed"
>;

/** The giver's signed take-out, which the server checks and submits: the gift as the escrow left it. */
export async function submitTakeOut(
  deps: AppDeps,
  userId: string,
  giftId: string,
  signed: SignedTransaction,
): Promise<TakingOut> {
  const owned = ownGift(
    deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get(),
    userId,
    giftId,
  );
  if (owned.refusal !== null) return owned;
  const sui = suiDepsOf(deps);
  if (!sui) {
    return refuse(
      "sponsorship_expired",
      `This server runs without Sui, so ${signed.digest} isn't one of its take-outs`,
    );
  }
  return oneAtATime(`gift:${giftId}`, async (): Promise<TakingOut> => {
    const takeOut = giftTransaction(sui.db, giftId, "take_out", signed.digest);
    if (!takeOut) {
      return refuse(
        "sponsorship_expired",
        `Gift ${giftId} has no take-out ${signed.digest}; start the take-out again`,
      );
    }
    const gift = currentGift(sui.db, giftId);
    const now = sui.clock.now();
    const { row } = await runSigned(sui, takeOut, signed.signature, giftRecord(takeOut, gift, now));
    if (row.outcome === "succeeded") return { refusal: null, gift: currentGift(sui.db, giftId) };
    if (row.outcome === null) {
      return refuse(
        "take_out_not_landed",
        `Sui hasn't answered gift ${giftId}'s take-out yet; send the same signature again`,
      );
    }
    if (row.outcome === "dead") {
      return refuse(
        "sponsorship_expired",
        row.failure
          ? `Sui refused gift ${giftId}'s take-out: ${row.failure}`
          : `Gift ${giftId}'s take-out ${signed.digest} lapsed unsigned; start the take-out again`,
      );
    }
    // It failed: the escrow says whether the gift went on, or back, first.
    const escrow = await sui.sui.readGift(giftId);
    if (escrow.status === "claimed") return alreadyReceived(gift);
    if (escrow.status === "expired_returned") {
      const returned = sui.db
        .update(gifts)
        .set({
          status: "returned",
          escrowStatus: "expired_returned",
          ...closingDates("returned", gift, now),
        })
        .where(eq(gifts.id, giftId))
        .returning()
        .get();
      return { refusal: null, gift: returned };
    }
    return refuse(
      "transaction_failed",
      `Gift ${giftId}'s take-out failed on Sui: ${row.failure ?? "Sui gave no reason"}`,
    );
  });
}
