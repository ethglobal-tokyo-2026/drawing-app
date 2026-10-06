import { createHash, randomBytes } from "node:crypto";
import { GIFT_EXPIRY_MS, gifts, stickers, users, type Db } from "@drawing-app/db";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import {
  bytes32Schema,
  giftSchema,
  optedIntoNsfw,
  personSchema,
  refuse,
  sponsoredTransactionSchema,
  stickerLookup,
  stickerSchema,
  stickerViewer,
  toGift,
  toPerson,
  toSponsoredTransaction,
  type Refusal,
} from "../shapes.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  isLive,
  SPONSORSHIP_MARGIN_MS,
  sponsored,
  suiDepsOf,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import {
  closeUndeposited,
  currentGift,
  openGiftTransaction,
  ownGift,
  settleOpenGiftTransaction,
  type GiftRow,
  type GiftStep,
} from "./giftTransactions.ts";

export type { GiftStep } from "./giftTransactions.ts";

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

/** A Gift Claim Token: `0x` and 64 lowercase hex digits. */
export const giftClaimTokenSchema = z.templateLiteral(["0x", z.string().regex(/^[0-9a-f]{64}$/)]);

/** 32 bytes as the database and the escrow take them: 0x and 64 lowercase hex digits. */
const hexOf = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString("hex")}`;

/** The Gift Claim Token's commitment, which the escrow and the database keep: its sha256. */
export const claimCommitmentOf = (giftClaimToken: string) =>
  hexOf(
    createHash("sha256")
      .update(Buffer.from(giftClaimToken.slice(2), "hex"))
      .digest(),
  );

/** A new gift's id and Gift Claim Token, each 32 random bytes, and the token's commitment. */
function newGiftClaim() {
  const giftClaimToken = hexOf(randomBytes(32));
  return {
    giftId: hexOf(randomBytes(32)),
    giftClaimToken,
    claimCommitment: claimCommitmentOf(giftClaimToken),
  };
}

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
  /** The deposit for the giver's wallet to sign; null on the mock chain, and once it has landed. */
  deposit: sponsoredTransactionSchema.nullable(),
});
export type PackagedGift = z.infer<typeof packagedGiftSchema>;

export const giftResponseSchema = z.object({ gift: giftSchema });

/** Take-out's start: the gift, and the take-out for the giver's wallet to sign while the escrow holds it. */
export const takeOutStartSchema = z.object({
  gift: giftSchema,
  takeOut: sponsoredTransactionSchema.optional(),
});
export type TakeOutStart = z.infer<typeof takeOutStartSchema>;

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

export type Packaging =
  | Refusal<
      | "sticker_not_found"
      | "not_yours"
      | "gift_in_transit"
      | "not_minted"
      | "no_sui_wallet"
      | "user_not_found"
      | "own_gift"
      | "nsfw_not_opted_in"
      | "deposit_not_landed"
    >
  | { refusal: null; created: boolean; packaged: PackagedGift };

type Packaged = Extract<Packaging, { refusal: null }>;

/**
 * The checks every Packaging makes: the sticker is the giver's, and the person it's for can have it.
 * Answers the sticker, and the gift still in the bag for it, which the giver can package again.
 */
function checkPackaging(
  db: Pick<Db, "select">,
  userId: string,
  stickerId: string,
  forUserId: string | null,
):
  | Exclude<Packaging, Packaged>
  | { refusal: null; sticker: typeof stickers.$inferSelect; bagged: GiftRow | null } {
  const sticker = db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
  if (!sticker) return refuse("sticker_not_found", `There's no sticker ${stickerId}`);
  if (sticker.ownerId !== userId) {
    return refuse("not_yours", `Sticker ${stickerId} is held by someone else`);
  }
  // The table refuses these too; checking here answers with a refusal the app can show.
  if (forUserId === userId) return refuse("own_gift", "A gift can't be for its own giver");
  if (forUserId !== null) {
    const recipient = db.select().from(users).where(eq(users.id, forUserId)).get();
    if (!recipient) return refuse("user_not_found", `There's no person ${forUserId} to give it to`);
    if (sticker.nsfw && !optedIntoNsfw(recipient)) {
      return refuse(
        "nsfw_not_opted_in",
        `Sticker ${stickerId} is NSFW, and ${forUserId} has the NSFW opt-in off`,
      );
    }
  }
  const open = giftHoldingSticker(db, stickerId) ?? null;
  if (open && !(open.status === "packed" && open.giverId === userId)) {
    return refuse(
      "gift_in_transit",
      `Sticker ${stickerId} is still in gift ${open.id}: ${open.status}, escrow ${open.escrowStatus}`,
    );
  }
  return { refusal: null, sticker, bagged: open };
}

/** A gift still in the bag is for whoever the giver picked this time. */
function packFor(db: Pick<Db, "update">, gift: GiftRow, forUserId: string | null): GiftRow {
  if (gift.forUserId === forUserId) return gift;
  return db.update(gifts).set({ forUserId }).where(eq(gifts.id, gift.id)).returning().get();
}

/** A gift packaged again: no token, since only the first answer carries it. */
const packagedAgain = (gift: GiftRow, deposit: SuiTransaction | null): Packaged => ({
  refusal: null,
  created: false,
  packaged: {
    gift: toGift(gift),
    giftClaimToken: null,
    deposit: deposit && toSponsoredTransaction(deposit),
  },
});

/**
 * Packaging: a new gift of a sticker you hold, or the one already in the bag, with the deposit for
 * the giver's wallet to sign while the escrow doesn't hold it yet.
 */
export async function packageGift(
  deps: AppDeps,
  userId: string,
  { stickerId, forUserId = null }: PackageBody,
): Promise<Packaging> {
  const sui = suiDepsOf(deps);
  if (!sui) return packageOnMockChain(deps, userId, stickerId, forUserId);
  return oneAtATime(`sticker:${stickerId}`, () =>
    packageOnSui(deps, sui, userId, stickerId, forUserId),
  );
}

/** On the mock chain a gift is in the escrow from the start, so it has no deposit to sign. */
function packageOnMockChain(
  { db, clock }: AppDeps,
  userId: string,
  stickerId: string,
  forUserId: string | null,
): Packaging {
  const now = clock.now();
  return db.transaction(
    (tx): Packaging => {
      const checked = checkPackaging(tx, userId, stickerId, forUserId);
      if (checked.refusal !== null) return checked;
      if (checked.bagged) return packagedAgain(packFor(tx, checked.bagged, forUserId), null);
      const claim = newGiftClaim();
      const gift = tx
        .insert(gifts)
        .values({
          id: claim.giftId,
          stickerId,
          giverId: userId,
          forUserId,
          claimCommitment: claim.claimCommitment,
          expiresAt: new Date(now.getTime() + GIFT_EXPIRY_MS),
          escrowStatus: "pending",
        })
        .returning()
        .get();
      const packaged = { gift: toGift(gift), giftClaimToken: claim.giftClaimToken, deposit: null };
      return { refusal: null, created: true, packaged };
    },
    { behavior: "immediate" },
  );
}

/** What a gift's deposit moves, and who signs it. */
interface DepositTerms {
  sender: string;
  userId: string;
  stickerId: string;
  stickerObjectId: string;
}

async function packageOnSui(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  userId: string,
  stickerId: string,
  forUserId: string | null,
): Promise<Packaging> {
  const checked = checkPackaging(deps.db, userId, stickerId, forUserId);
  if (checked.refusal !== null) return checked;
  const stickerObjectId = checked.sticker.objectId;
  if (stickerObjectId === null) {
    return refuse("not_minted", `Sticker ${stickerId} isn't on Sui yet, so it can't be given`);
  }
  const sender = await deps.suiWallets.addressFor(userId);
  if (!sender) return refuse("no_sui_wallet", `Person ${userId} has no Sui wallet to give from`);
  const terms = { sender, userId, stickerId, stickerObjectId };
  const { bagged } = checked;
  if (bagged) {
    const again = await oneAtATime(`gift:${bagged.id}`, () =>
      packageAgain(sui, bagged, forUserId, terms),
    );
    if (again) return again;
  }
  return packageNew(sui, forUserId, terms);
}

/**
 * Packages the gift in the bag again: its deposit answered again while it's live, else once the last
 * one is settled, a new deposit for it, or none once the escrow holds it. Null when the gift closed
 * meanwhile, or its expiry is too near for a deposit to land, so the sticker gets a new gift.
 */
async function packageAgain(
  sui: SuiTransactionDeps,
  bagged: GiftRow,
  forUserId: string | null,
  terms: DepositTerms,
): Promise<Packaging | null> {
  const { db } = sui;
  const now = sui.clock.now();
  const open = openGiftTransaction(db, bagged.id);
  if (open?.kind === "deposit" && isLive(open, now)) {
    return packagedAgain(packFor(db, bagged, forUserId), open);
  }
  const settled = await settleOpenGiftTransaction(sui, bagged);
  if (settled?.outcome === null) {
    return refuse(
      "deposit_not_landed",
      `Sui hasn't shown gift ${bagged.id}'s last transaction yet; package it again in a moment`,
    );
  }
  const gift = currentGift(db, bagged.id);
  if (gift.status !== "packed") return null;
  if (gift.escrowStatus === "pending") return packagedAgain(packFor(db, gift, forUserId), null);
  if (gift.expiresAt.getTime() - now.getTime() <= SPONSORSHIP_MARGIN_MS) {
    closeUndeposited(db, gift, now);
    return null;
  }
  const kind = await sui.sui.depositKind({
    sender: terms.sender,
    stickerObjectId: terms.stickerObjectId,
    giftId: gift.id,
    claimCommitment: gift.claimCommitment,
    expiresAt: gift.expiresAt,
  });
  const deposit = await sponsored(
    sui,
    {
      kind: "deposit",
      sender: terms.sender,
      userId: terms.userId,
      stickerId: terms.stickerId,
      giftId: gift.id,
    },
    kind,
  );
  return packagedAgain(packFor(db, gift, forUserId), deposit);
}

/**
 * A new gift: its deposit is sponsored first, then the gift and its deposit's row go in together,
 * so no gift waits on a deposit Shinami won't pay for.
 */
async function packageNew(
  sui: SuiTransactionDeps,
  forUserId: string | null,
  terms: DepositTerms,
): Promise<Packaging> {
  const claim = newGiftClaim();
  const expiresAt = new Date(sui.clock.now().getTime() + GIFT_EXPIRY_MS);
  const kind = await sui.sui.depositKind({
    sender: terms.sender,
    stickerObjectId: terms.stickerObjectId,
    giftId: claim.giftId,
    claimCommitment: claim.claimCommitment,
    expiresAt,
  });
  const deposit = await sponsored(
    sui,
    {
      kind: "deposit",
      sender: terms.sender,
      userId: terms.userId,
      stickerId: terms.stickerId,
      giftId: claim.giftId,
    },
    kind,
    (tx) => {
      tx.insert(gifts)
        .values({
          id: claim.giftId,
          stickerId: terms.stickerId,
          giverId: terms.userId,
          forUserId,
          claimCommitment: claim.claimCommitment,
          expiresAt,
        })
        .run();
    },
  );
  return {
    refusal: null,
    created: true,
    packaged: {
      gift: toGift(currentGift(sui.db, claim.giftId)),
      giftClaimToken: claim.giftClaimToken,
      deposit: toSponsoredTransaction(deposit),
    },
  };
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

/** Your gifts in the bag or on their way, newest first, each with its sticker. */
export function pendingGifts(deps: AppDeps, userId: string): PendingGifts {
  const { db } = deps;
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
    stickerViewer(deps, userId),
  );
  return {
    gifts: rows.map(({ gift, for: forUser }) => ({
      gift: toGift(gift),
      sticker: stickerOf(gift.stickerId),
      for: forUser ? toPerson(forUser) : null,
    })),
  };
}
