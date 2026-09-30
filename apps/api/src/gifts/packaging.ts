import { GIFT_EXPIRY_MS, gifts, stickers, users, type Db } from "@drawing-app/db";
import { createGiftClaim } from "@drawing-app/sticker-chain/gift-sticker";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { AppDeps, GiftChain } from "../deps.ts";
import {
  ageStatusOf,
  bytes32Schema,
  escrowTransferSchema,
  giftSchema,
  personSchema,
  refuse,
  stickerLookup,
  stickerSchema,
  toGift,
  toPerson,
  type EscrowTransfer,
  type Refusal,
} from "../shapes.ts";
import { checkDeposit, closingDates, ownGift } from "./deposit.ts";

export type GiftRow = typeof gifts.$inferSelect;

/** A step on one gift: the gift after it, or why it was refused. */
export type GiftStep<Code extends string> = { refusal: null; gift: GiftRow } | Refusal<Code>;

/**
 * The gift that still holds a sticker: in the bag or sent, or in the escrow. gifts_one_per_sticker
 * allows one at a time.
 */
export const giftHoldingSticker = (db: Pick<Db, "select">, stickerId: string) =>
  db
    .select()
    .from(gifts)
    .where(
      and(
        eq(gifts.stickerId, stickerId),
        or(inArray(gifts.status, ["packed", "sent"]), eq(gifts.escrowStatus, "pending")),
      ),
    )
    .get();

/** A Gift Claim Token: `0x` and 64 lowercase hex digits, typed for keccak256. */
export const giftClaimTokenSchema = z.templateLiteral(["0x", z.string().regex(/^[0-9a-f]{64}$/)]);

/** A sticker to give; `forUserId` when the giver picked who it's for in the app. */
export const packageBodySchema = createInsertSchema(gifts).pick({
  stickerId: true,
  forUserId: true,
});
type PackageBody = z.infer<typeof packageBodySchema>;

export const packagedGiftSchema = z.object({
  gift: giftSchema,
  /** Only in the 201: the gift link carries it, and the server keeps only its commitment. */
  giftClaimToken: bytes32Schema.nullable(),
  /** Null on the mock chain, and once the deposit has landed. */
  escrowTransfer: escrowTransferSchema.nullable(),
});
export type PackagedGift = z.infer<typeof packagedGiftSchema>;

export const giftResponseSchema = z.object({ gift: giftSchema });

export const sharedBodySchema = z.object({ outcome: z.enum(["sent", "cancelled"]) });
type SharedOutcome = z.infer<typeof sharedBodySchema>["outcome"];

export const pendingGiftsSchema = z.object({
  gifts: z.array(
    z.object({
      gift: giftSchema,
      sticker: stickerSchema,
      /** Who it waits for: the person picked in the app, or who first opened its link. */
      for: personSchema.nullable(),
    }),
  ),
});
export type PendingGifts = z.infer<typeof pendingGiftsSchema>;

/** The escrow chain's transfer of a gift's sticker from the giver's smart wallet into the escrow. */
function escrowTransferFor(
  giftChain: GiftChain,
  gift: GiftRow,
  tokenId: string | null,
  sender: string | null,
): EscrowTransfer {
  if (tokenId === null) throw new Error(`Sticker ${gift.stickerId} has no NFT to give`);
  // Everyone has a smart wallet once minting is on, so the contract has no code for this.
  if (sender === null) {
    throw new Error(`Person ${gift.giverId} has no smart wallet to send gift ${gift.id} from`);
  }
  return giftChain.prepareGiftTransfer({
    sender,
    tokenId,
    giftId: gift.id,
    claimCommitment: gift.claimCommitment,
    expiresAt: gift.expiresAt,
  });
}

export type Packaging =
  | Refusal<
      | "sticker_not_found"
      | "not_yours"
      | "gift_in_transit"
      | "gift_held"
      | "not_minted"
      | "user_not_found"
      | "own_gift"
      | "adults_only"
    >
  | { refusal: null; created: boolean; packaged: PackagedGift };

/** Packaging: a new gift of a sticker you hold, or the one already in the bag. */
export async function packageGift(
  deps: AppDeps,
  userId: string,
  { stickerId, forUserId = null }: PackageBody,
): Promise<Packaging> {
  const { db, clock, giftChain, smartWallets } = deps;
  const sender = giftChain ? await smartWallets.addressFor(userId) : null;
  if (giftChain) {
    // A gift the server took out while the escrow held its sticker: the escrow may have let go since.
    const held = giftHoldingSticker(db, stickerId);
    if (held?.status === "taken_out" && held.giverId === userId) {
      await checkDeposit(deps, giftChain, held);
    }
  }
  const now = clock.now();
  return db.transaction(
    (tx): Packaging => {
      const sticker = tx.select().from(stickers).where(eq(stickers.id, stickerId)).get();
      if (!sticker) return refuse("sticker_not_found", `There's no sticker ${stickerId}`);
      if (sticker.ownerId !== userId) {
        return refuse("not_yours", `Sticker ${stickerId} is held by someone else`);
      }
      // The table refuses these too; checking here answers with a refusal the app can show.
      if (forUserId === userId) return refuse("own_gift", "A gift can't be for its own giver");
      if (forUserId !== null) {
        const recipient = tx.select().from(users).where(eq(users.id, forUserId)).get();
        if (!recipient) {
          return refuse("user_not_found", `There's no person ${forUserId} to give it to`);
        }
        if (sticker.nsfw && ageStatusOf(recipient) !== "adult") {
          return refuse(
            "adults_only",
            `Sticker ${stickerId} is NSFW, and ${forUserId} isn't an adult`,
          );
        }
      }
      const open = giftHoldingSticker(tx, stickerId);
      if (open?.status === "packed" && open.giverId === userId) {
        // Still in the bag: it's for whoever the giver picked this time.
        if (open.forUserId !== forUserId) {
          tx.update(gifts).set({ forUserId }).where(eq(gifts.id, open.id)).run();
        }
        const escrowTransfer =
          giftChain && open.escrowStatus === "missing"
            ? escrowTransferFor(giftChain, open, sticker.tokenId, sender)
            : null;
        const packaged = { gift: toGift(open), giftClaimToken: null, escrowTransfer };
        return { refusal: null, created: false, packaged };
      }
      if (open?.status === "taken_out" && open.giverId === userId) {
        return refuse(
          "gift_held",
          `The escrow holds sticker ${stickerId} for gift ${open.id} until its giver takes it out on chain`,
          open.id,
        );
      }
      if (open) {
        return refuse(
          "gift_in_transit",
          `Sticker ${stickerId} is still in gift ${open.id}: ${open.status}, escrow ${open.escrowStatus}`,
        );
      }
      if (giftChain && sticker.tokenId === null) {
        return refuse("not_minted", `Sticker ${stickerId} has no NFT to give yet`);
      }
      const claim = giftChain ? giftChain.createGiftClaim() : createGiftClaim();
      const gift = tx
        .insert(gifts)
        .values({
          id: claim.giftId,
          stickerId,
          giverId: userId,
          forUserId,
          claimCommitment: claim.claimCommitment,
          expiresAt: new Date(now.getTime() + GIFT_EXPIRY_MS),
          // The mock chain's deposit counts as landed at once.
          escrowStatus: giftChain ? "missing" : "pending",
        })
        .returning()
        .get();
      const escrowTransfer = giftChain
        ? escrowTransferFor(giftChain, gift, sticker.tokenId, sender)
        : null;
      const packaged = { gift: toGift(gift), giftClaimToken: claim.giftClaimToken, escrowTransfer };
      return { refusal: null, created: true, packaged };
    },
    { behavior: "immediate" },
  );
}

const closed = (gift: GiftRow) =>
  refuse("gift_closed", `Gift ${gift.id} is already ${gift.status}`);

/** LINE's friend picker's result. A cancelled picker leaves the gift in the bag. */
export function reportShared(
  { db, clock }: AppDeps,
  userId: string,
  giftId: string,
  outcome: SharedOutcome,
): GiftStep<"gift_not_found" | "not_yours" | "gift_closed" | "not_deposited"> {
  return db.transaction(
    (tx) => {
      const owned = ownGift(
        tx.select().from(gifts).where(eq(gifts.id, giftId)).get(),
        userId,
        giftId,
      );
      if (owned.refusal !== null) return owned;
      const { gift } = owned;
      if (gift.status !== "packed" && gift.status !== "sent") return closed(gift);
      if (outcome === "cancelled" || gift.status === "sent") return owned;
      if (gift.escrowStatus !== "pending") {
        return refuse("not_deposited", `Gift ${giftId}'s deposit hasn't landed in the escrow`);
      }
      const sent = tx
        .update(gifts)
        .set({ status: "sent", sentAt: clock.now() })
        .where(eq(gifts.id, giftId))
        .returning()
        .get();
      return { refusal: null, gift: sent };
    },
    { behavior: "immediate" },
  );
}

/**
 * A take-out its gift's status already answers: one that landed before, answered again, or a
 * refusal. Null while the gift is packed or sent, so it can still be taken out, and while the server
 * has taken it out but the escrow holds its sticker, so the giver's take-out on chain settles it.
 */
function takeOutState(gift: GiftRow): GiftStep<"already_received" | "gift_closed"> | null {
  // Rejected, or never in the escrow.
  if (gift.status === "taken_out" && gift.escrowStatus !== "pending") {
    return { refusal: null, gift };
  }
  if (gift.status === "returned" && gift.escrowStatus === "expired_returned") {
    return { refusal: null, gift };
  }
  if (gift.status === "received") {
    return refuse("already_received", `Gift ${gift.id} was already received`);
  }
  if (gift.status !== "packed" && gift.status !== "sent" && gift.status !== "taken_out") {
    return closed(gift);
  }
  return null;
}

/**
 * Takes a gift back before anyone receives it, from the bag or after sending; or records the giver's
 * take-out on chain of one the server took out.
 */
export async function takeOut(
  { db, clock, giftChain }: AppDeps,
  userId: string,
  giftId: string,
): Promise<
  GiftStep<
    "gift_not_found" | "not_yours" | "already_received" | "gift_closed" | "take_out_not_landed"
  >
> {
  const before = ownGift(db.select().from(gifts).where(eq(gifts.id, giftId)).get(), userId, giftId);
  if (before.refusal !== null) return before;
  const answered = takeOutState(before.gift);
  if (answered) return answered;

  let escrowStatus: "rejected" | "expired_returned" = "rejected";
  if (giftChain) {
    const escrow = await giftChain.readEscrowGift(giftId);
    if (escrow.status === "claimed") {
      return refuse("already_received", `Gift ${giftId} was already received`);
    }
    if (escrow.status !== "rejected" && escrow.status !== "expired_returned") {
      return refuse(
        "take_out_not_landed",
        `Gift ${giftId}'s take-out is not confirmed: escrow is ${escrow.status}`,
      );
    }
    escrowStatus = escrow.status;
  }

  return db.transaction(
    (tx) => {
      const owned = ownGift(
        tx.select().from(gifts).where(eq(gifts.id, giftId)).get(),
        userId,
        giftId,
      );
      if (owned.refusal !== null) return owned;
      const { gift } = owned;
      // Another request may have settled it while the chain was read.
      const settled = takeOutState(gift);
      if (settled) return settled;
      const status = escrowStatus === "expired_returned" ? "returned" : "taken_out";
      const takenOut = tx
        .update(gifts)
        .set({
          status,
          ...closingDates(status, gift, clock.now()),
          // The mock chain's reject lands at once, so the sticker can be given again.
          escrowStatus,
        })
        .where(eq(gifts.id, giftId))
        .returning()
        .get();
      return { refusal: null, gift: takenOut };
    },
    { behavior: "immediate" },
  );
}

/** Your gifts in the bag or on their way, newest first, each with its sticker. */
export function pendingGifts({ db, images }: AppDeps, userId: string): PendingGifts {
  const rows = db
    .select({ gift: gifts, for: users })
    .from(gifts)
    .leftJoin(users, eq(users.id, gifts.forUserId))
    .where(and(eq(gifts.giverId, userId), inArray(gifts.status, ["packed", "sent"])))
    .orderBy(desc(gifts.createdAt))
    .all();
  const stickerOf = stickerLookup(
    db,
    rows.map(({ gift }) => gift.stickerId),
    images.urls,
  );
  return {
    gifts: rows.map(({ gift, for: forUser }) => ({
      gift: toGift(gift),
      sticker: stickerOf(gift.stickerId),
      for: forUser ? toPerson(forUser) : null,
    })),
  };
}
