import { createHash, randomBytes } from "node:crypto";
import { GIFT_EXPIRY_MS, gifts, stickers, users, type Db } from "@drawing-app/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { PersonSessionError } from "../errors.ts";
import { deliveryAtPackaging, giftDeliveryFor } from "./personDelivery.ts";
import type { AppDeps } from "../deps.ts";
import {
  bytes32Schema,
  giftSchema,
  optedIntoNsfw,
  refuse,
  sponsoredTransactionSchema,
  signedTransactionSchema,
  toGift,
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
  givingLimitRefusal,
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
  delivery: z.enum(["line", "person"]),
  /** Only the giver may recover the last Gift Message attempt. */
  messageAttempt: z
    .object({ id: bytes32Schema, state: z.enum(["pending", "cancelled", "sent"]) })
    .nullable(),
  /** The original recipient, visible only to the giver resuming Packaging. */
  forUserId: z.string().nullable(),
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

/** Automatic lost-link recovery may close only this same known-unsent message attempt. */
const unsentMessageAttemptSchema = z
  .object({
    id: bytes32Schema,
    state: z.literal("cancelled"),
  })
  .nullable();
export type UnsentGiftMessage = z.infer<typeof unsentMessageAttemptSchema>;
export const takeOutRequestSchema = z.object({
  unsentMessageAttempt: unsentMessageAttemptSchema.optional(),
});
export const signedTakeOutSchema = signedTransactionSchema.extend({
  unsentMessageAttempt: unsentMessageAttemptSchema.optional(),
});

export const messageAttemptBodySchema = z.object({ attemptId: bytes32Schema });
export const sharedBodySchema = messageAttemptBodySchema.extend({
  outcome: z.enum(["sent", "cancelled"]),
});
type SharedOutcome = z.infer<typeof sharedBodySchema>["outcome"];

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
      | "not_deposited"
      | "giving_limit_reached"
    >
  | { refusal: null; created: boolean; packaged: PackagedGift };

type Packaged = Extract<Packaging, { refusal: null }>;

/** An NSFW sticker goes only to someone with the NSFW opt-in on. */
export function nsfwRefusal(
  sticker: Pick<typeof stickers.$inferSelect, "id" | "nsfw">,
  receiver: Pick<typeof users.$inferSelect, "id" | "nsfwOptedInAt"> | undefined,
) {
  if (!sticker.nsfw || (receiver && optedIntoNsfw(receiver))) return null;
  return refuse(
    "nsfw_not_opted_in",
    `Sticker ${sticker.id} is NSFW, and ${receiver?.id ?? "its receiver"} has the NSFW opt-in off`,
  );
}

/**
 * Packaging resumes the giver's open gift, or checks a new gift's recipient.
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
  // An existing gift keeps its destination; only a new gift uses the requested recipient.
  const open = giftHoldingSticker(db, stickerId) ?? null;
  if (open && !((open.status === "packed" || open.status === "sent") && open.giverId === userId)) {
    return refuse(
      "gift_in_transit",
      `Sticker ${stickerId} is still in gift ${open.id}: ${open.status}, escrow ${open.escrowStatus}`,
    );
  }
  if (open) return { refusal: null, sticker, bagged: open };
  // The table refuses these too; checking here answers with a refusal the app can show.
  if (forUserId === userId) return refuse("own_gift", "A gift can't be for its own giver");
  if (forUserId !== null) {
    const recipient = db.select().from(users).where(eq(users.id, forUserId)).get();
    if (!recipient) return refuse("user_not_found", `There's no person ${forUserId} to give it to`);
    const nsfw = nsfwRefusal(sticker, recipient);
    if (nsfw) return nsfw;
  }
  return { refusal: null, sticker, bagged: null };
}

const messageAttemptOf = (gift: GiftRow): PackagedGift["messageAttempt"] =>
  gift.messageAttemptId !== null && gift.messageAttemptState !== "not_started"
    ? { id: gift.messageAttemptId, state: gift.messageAttemptState }
    : null;

/** A gift packaged again: no token, since only the first answer carries it. */
const packagedAgain = (gift: GiftRow, deposit: SuiTransaction | null): Packaged => ({
  refusal: null,
  created: false,
  packaged: {
    delivery: gift.delivery,
    gift: toGift(gift),
    messageAttempt: messageAttemptOf(gift),
    forUserId: gift.forUserId,
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
  const existing = giftHoldingSticker(deps.db, stickerId);
  const destination = existing ? existing.forUserId : forUserId;
  if (userId === deps.personSwitch.hanaUserId && destination !== deps.personSwitch.operatorUserId) {
    throw new PersonSessionError("person_switch_forbidden");
  }
  const sui = suiDepsOf(deps);
  const result = !sui
    ? packageOnMockChain(deps, userId, stickerId, forUserId)
    : await oneAtATime(`sticker:${stickerId}`, () =>
        packageOnSui(deps, sui, userId, stickerId, forUserId),
      );
  if (result.refusal === null) {
    result.packaged.delivery = giftDeliveryFor(deps.personSwitch, {
      giverId: result.packaged.gift.giverId,
      forUserId: result.packaged.forUserId,
      delivery: result.packaged.delivery,
    });
  }
  return result;
}

/** On the mock chain a gift is in the escrow from the start, so it has no deposit to sign. */
function packageOnMockChain(
  { db, clock, personSwitch }: AppDeps,
  userId: string,
  stickerId: string,
  forUserId: string | null,
): Packaging {
  const now = clock.now();
  return db.transaction(
    (tx): Packaging => {
      const checked = checkPackaging(tx, userId, stickerId, forUserId);
      if (checked.refusal !== null) return checked;
      if (checked.bagged) return packagedAgain(checked.bagged, null);
      const claim = newGiftClaim();
      const gift = tx
        .insert(gifts)
        .values({
          id: claim.giftId,
          delivery: deliveryAtPackaging(personSwitch, { giverId: userId, forUserId }),
          stickerId,
          giverId: userId,
          forUserId,
          claimCommitment: claim.claimCommitment,
          expiresAt: new Date(now.getTime() + GIFT_EXPIRY_MS),
          escrowStatus: "pending",
        })
        .returning()
        .get();
      const packaged = {
        delivery: gift.delivery,
        gift: toGift(gift),
        messageAttempt: messageAttemptOf(gift),
        forUserId: gift.forUserId,
        giftClaimToken: claim.giftClaimToken,
        deposit: null,
      };
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
    if (
      bagged.escrowStatus === "pending" &&
      deliveryAtPackaging(deps.personSwitch, bagged) === "person" &&
      (await sui.sui.readGift(bagged.id)).status === "missing"
    ) {
      return refuse("not_deposited", `Gift ${bagged.id} has no escrow object to resume`);
    }
    if (bagged.status === "sent") return packagedAgain(bagged, null);
    const again = await oneAtATime(`gift:${bagged.id}`, () => packageAgain(sui, bagged, terms));
    if (again) return again;
    // The gift left the bag meanwhile: sent, received or closed, so the checks run again.
    const rechecked = checkPackaging(deps.db, userId, stickerId, forUserId);
    if (rechecked.refusal !== null) return rechecked;
  }
  return packageNew(
    sui,
    forUserId,
    terms,
    deliveryAtPackaging(deps.personSwitch, { giverId: userId, forUserId }),
  );
}

/**
 * Packages the gift in the bag again: its deposit answered again while it's live, else once the last
 * one is settled, a new deposit for it, or none once the escrow holds it. Null when the gift closed
 * meanwhile, or its expiry is too near for a deposit to land, so the sticker gets a new gift.
 */
async function packageAgain(
  sui: SuiTransactionDeps,
  bagged: GiftRow,
  terms: DepositTerms,
): Promise<Packaging | null> {
  const { db } = sui;
  const now = sui.clock.now();
  if (bagged.status === "sent") return packagedAgain(bagged, null);
  const open = openGiftTransaction(db, bagged.id);
  if (open?.kind === "deposit" && isLive(open, now)) {
    return packagedAgain(bagged, open);
  }
  const settled = await settleOpenGiftTransaction(sui, bagged);
  if (settled?.outcome === null) {
    return refuse(
      "deposit_not_landed",
      `Sui hasn't shown gift ${bagged.id}'s last transaction yet; package it again in a moment`,
    );
  }
  const gift = currentGift(db, bagged.id);
  if (gift.status === "sent") return packagedAgain(gift, null);
  if (gift.status !== "packed") return null;
  if (gift.escrowStatus === "pending") return packagedAgain(gift, null);
  if (gift.expiresAt.getTime() - now.getTime() <= SPONSORSHIP_MARGIN_MS) {
    closeUndeposited(db, gift, now);
    return null;
  }
  const limited = givingLimitRefusal(db, terms.userId, now);
  if (limited) return limited;
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
  return packagedAgain(gift, deposit);
}

/**
 * A new gift: its deposit is sponsored first, then the gift and its deposit's row go in together,
 * so no gift waits on a deposit Shinami won't pay for.
 */
async function packageNew(
  sui: SuiTransactionDeps,
  forUserId: string | null,
  terms: DepositTerms,
  delivery: "line" | "person",
): Promise<Packaging> {
  const now = sui.clock.now();
  const limited = givingLimitRefusal(sui.db, terms.userId, now);
  if (limited) return limited;
  const claim = newGiftClaim();
  const expiresAt = new Date(now.getTime() + GIFT_EXPIRY_MS);
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
          delivery,
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
      delivery,
      gift: toGift(currentGift(sui.db, claim.giftId)),
      messageAttempt: null,
      forUserId,
      giftClaimToken: claim.giftClaimToken,
      deposit: toSponsoredTransaction(deposit),
    },
  };
}

const closed = (gift: GiftRow) =>
  refuse("gift_closed", `Gift ${gift.id} is already ${gift.status}`);

type MessageStep = GiftStep<
  | "gift_not_found"
  | "not_yours"
  | "gift_closed"
  | "not_deposited"
  | "gift_message_unresolved"
  | "gift_message_attempt_changed"
  | "take_out_not_landed"
>;

/** Records the attempt before the giver opens LINE; pending never expires. */
export function beginMessageAttempt(
  { db }: AppDeps,
  userId: string,
  giftId: string,
  attemptId: string,
): MessageStep {
  return db.transaction(
    (tx): MessageStep => {
      const owned = ownGift(
        tx.select().from(gifts).where(eq(gifts.id, giftId)).get(),
        userId,
        giftId,
      );
      if (owned.refusal !== null) return owned;
      const { gift } = owned;
      if (gift.status !== "packed") return closed(gift);
      if (gift.escrowStatus !== "pending")
        return refuse("not_deposited", `Gift ${giftId}'s deposit hasn't landed in the escrow`);
      const withdrawal = openGiftTransaction(tx, giftId);
      if (withdrawal?.kind === "take_out" && withdrawal.submittedAt !== null)
        return refuse(
          "take_out_not_landed",
          `Gift ${giftId}'s submitted take-out has not settled; a new message cannot start yet`,
        );
      if (gift.messageAttemptId === attemptId) return owned;
      if (gift.messageAttemptState === "pending")
        return refuse(
          "gift_message_unresolved",
          `Gift ${giftId}'s earlier message attempt is unresolved`,
        );
      const pending = tx
        .update(gifts)
        .set({ messageAttemptId: attemptId, messageAttemptState: "pending" })
        .where(eq(gifts.id, giftId))
        .returning()
        .get();
      return { refusal: null, gift: pending };
    },
    { behavior: "immediate" },
  );
}

/** LINE's definitive outcome resolves only the matching attempt. Sent cannot be downgraded. */
export function recordMessageOutcome(
  { db, clock }: AppDeps,
  userId: string,
  giftId: string,
  attemptId: string,
  outcome: SharedOutcome,
): MessageStep {
  return db.transaction(
    (tx): MessageStep => {
      const owned = ownGift(
        tx.select().from(gifts).where(eq(gifts.id, giftId)).get(),
        userId,
        giftId,
      );
      if (owned.refusal !== null) return owned;
      const { gift } = owned;
      if (gift.status !== "packed" && gift.status !== "sent") return closed(gift);
      if (gift.messageAttemptId !== attemptId)
        return refuse(
          "gift_message_attempt_changed",
          `Gift ${giftId}'s message attempt no longer matches`,
        );
      if (gift.messageAttemptState === "sent" || gift.messageAttemptState === outcome) return owned;
      if (gift.escrowStatus !== "pending")
        return refuse("not_deposited", `Gift ${giftId}'s deposit hasn't landed in the escrow`);
      const reported = tx
        .update(gifts)
        .set({
          messageAttemptState: outcome,
          ...(outcome === "sent" && {
            status: "sent" as const,
            sentAt: gift.sentAt ?? clock.now(),
          }),
        })
        .where(eq(gifts.id, giftId))
        .returning()
        .get();
      return { refusal: null, gift: reported };
    },
    { behavior: "immediate" },
  );
}

/** Ordinary LINE reports cannot first acknowledge a private pair delivery. */
export function reportShared(
  deps: AppDeps,
  userId: string,
  giftId: string,
  attemptId: string,
  outcome: SharedOutcome,
): MessageStep {
  const gift = deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get();
  if (
    gift &&
    gift.giverId === userId &&
    outcome === "sent" &&
    gift.status === "packed" &&
    giftDeliveryFor(deps.personSwitch, gift) === "person"
  ) {
    throw new PersonSessionError("person_switch_forbidden");
  }
  return recordMessageOutcome(deps, userId, giftId, attemptId, outcome);
}
