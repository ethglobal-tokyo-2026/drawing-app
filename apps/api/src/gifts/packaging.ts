import { randomBytes } from "node:crypto";
import { GIFT_EXPIRY_MS, gifts, stickers, users } from "@drawing-app/db";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { AppDeps, GiftChain, GiftClaim } from "../deps.ts";
import { keccak256 } from "../keccak256.ts";
import {
  bytes32Schema,
  escrowTransferSchema,
  personSchema,
  toPerson,
  type EscrowTransfer,
} from "../shapes.ts";
import { giftSchema, loadStickers, stickerSchema, toGift } from "../views.ts";

export type GiftRow = typeof gifts.$inferSelect;

/** A refused step: the contract's code, and what failed for which item. */
export interface Refusal<Code extends string> {
  refusal: Code;
  detail: string;
}

export const refuse = <Code extends string>(refusal: Code, detail: string): Refusal<Code> => ({
  refusal,
  detail,
});

/** A step on one gift: the gift after it, or why it was refused. */
export type GiftStep<Code extends string> = { refusal: null; gift: GiftRow } | Refusal<Code>;

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

const randomBytes32 = () => `0x${randomBytes(32).toString("hex")}` as const;

/**
 * sticker-chain's createGiftClaim, for the mock chain: a random gift id and Gift Claim Token, and the
 * token's commitment. sticker-chain's module doesn't load in plain Node yet.
 */
export function createGiftClaim(): GiftClaim {
  const giftId = randomBytes32();
  const giftClaimToken = randomBytes32();
  return { giftId, giftClaimToken, claimCommitment: keccak256(giftClaimToken) };
}

/** The giver's smart wallet, lowercase: the one stored, or the one Privy has made. */
async function smartWalletOf({ db, smartWallets }: AppDeps, userId: string) {
  const stored = db
    .select({ address: users.smartAccountAddress })
    .from(users)
    .where(eq(users.id, userId))
    .get()?.address;
  if (stored) return stored;
  return (await smartWallets.addressFor(userId))?.toLowerCase() ?? null;
}

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
      | "not_minted"
      | "user_not_found"
      | "own_gift"
    >
  | { refusal: null; created: boolean; packaged: PackagedGift };

/** Packaging: a new gift of a sticker you hold, or the one already in the bag. */
export async function packageGift(
  deps: AppDeps,
  userId: string,
  { stickerId, forUserId = null }: PackageBody,
): Promise<Packaging> {
  const { db, clock, giftChain } = deps;
  const sender = giftChain ? await smartWalletOf(deps, userId) : null;
  const now = clock.now();
  return db.transaction(
    (tx): Packaging => {
      const sticker = tx.select().from(stickers).where(eq(stickers.id, stickerId)).get();
      if (!sticker) return refuse("sticker_not_found", `There's no sticker ${stickerId}`);
      if (sticker.ownerId !== userId) {
        return refuse("not_yours", `Sticker ${stickerId} is held by someone else`);
      }
      // gifts.for_user_id carries no foreign key or check, so it's checked here.
      if (forUserId === userId) return refuse("own_gift", "A gift can't be for its own giver");
      if (forUserId !== null && !tx.select().from(users).where(eq(users.id, forUserId)).get()) {
        return refuse("user_not_found", `There's no person ${forUserId} to give it to`);
      }
      // gifts_one_per_sticker's condition: at most one gift of a sticker is open.
      const open = tx
        .select()
        .from(gifts)
        .where(
          and(
            eq(gifts.stickerId, stickerId),
            or(inArray(gifts.status, ["packed", "sent"]), eq(gifts.escrowStatus, "pending")),
          ),
        )
        .get();
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
      if (giftChain && sender !== null) {
        tx.update(users)
          .set({ smartAccountAddress: sender })
          .where(and(eq(users.id, userId), isNull(users.smartAccountAddress)))
          .run();
      }
      const escrowTransfer = giftChain
        ? escrowTransferFor(giftChain, gift, sticker.tokenId, sender)
        : null;
      const packaged = { gift: toGift(gift), giftClaimToken: claim.giftClaimToken, escrowTransfer };
      return { refusal: null, created: true, packaged };
    },
    { behavior: "immediate" },
  );
}

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

/** Takes a gift back before anyone receives it, from the bag or after sending. */
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
  if (before.gift.status === "taken_out" && before.gift.escrowStatus === "rejected") return before;
  if (before.gift.status === "returned" && before.gift.escrowStatus === "expired_returned")
    return before;
  if (before.gift.status === "received") {
    return refuse("already_received", `Gift ${giftId} was already received`);
  }
  if (before.gift.status !== "packed" && before.gift.status !== "sent") {
    return closed(before.gift);
  }

  let escrowStatus: "rejected" | "expired_returned" = "rejected";
  if (giftChain) {
    if (before.gift.escrowStatus === "rejected") {
      escrowStatus = "rejected";
    } else {
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
      if (gift.status === "taken_out" && gift.escrowStatus === "rejected") return owned;
      if (gift.status === "returned" && gift.escrowStatus === "expired_returned") return owned;
      if (gift.status === "received") {
        return refuse("already_received", `Gift ${giftId} was already received`);
      }
      if (gift.status !== "packed" && gift.status !== "sent") return closed(gift);
      const takenOut = tx
        .update(gifts)
        .set({
          status: escrowStatus === "expired_returned" ? "returned" : "taken_out",
          takenOutAt: escrowStatus === "expired_returned" ? undefined : clock.now(),
          returnedAt: escrowStatus === "expired_returned" ? clock.now() : undefined,
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
  const stickersById = loadStickers(
    db,
    rows.map(({ gift }) => gift.stickerId),
    images.urls,
  );
  return {
    gifts: rows.map(({ gift, for: forUser }) => {
      const sticker = stickersById.get(gift.stickerId);
      if (!sticker) throw new Error(`Gift ${gift.id}'s sticker ${gift.stickerId} is missing`);
      return { gift: toGift(gift), sticker, for: forUser ? toPerson(forUser) : null };
    }),
  };
}
