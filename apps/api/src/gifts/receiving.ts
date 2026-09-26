import { gifts, stickerPlacements, stickers, users, type Db } from "@drawing-app/db";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { queueNaming } from "../ens/naming.ts";
import type { AppDeps } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import { keccak256 } from "../keccak256.ts";
import { ageStatusOf, isoTimeSchema, personSchema, toIsoTime, toPerson } from "../shapes.ts";
import {
  giftSchema,
  loadStickers,
  stickerPlacementSchema,
  stickerSchema,
  toGift,
  toStickerPlacement,
} from "../views.ts";
import { checkDeposit } from "./deposit.ts";
import { giftClaimTokenSchema, refuse, type GiftRow, type Refusal } from "./packaging.ts";

/** `liff.getContext().type`: where the Gift Message was opened. */
const liffContextTypeSchema = z.enum(["utou", "room", "group", "square_chat", "external", "none"]);
export type LiffContextType = z.infer<typeof liffContextTypeSchema>;

/** The preview's body and the receive's. */
export const openGiftBodySchema = z.object({
  giftClaimToken: giftClaimTokenSchema,
  liffContextType: liffContextTypeSchema,
});
export type OpenGiftBody = z.infer<typeof openGiftBodySchema>;

/** Why a gift can't be received, in the order they're checked. */
export const receiveRefusalSchema = z.enum([
  "group_chat",
  "own_gift",
  "already_received",
  "taken_back",
  "gift_returned",
  "gift_expired",
  "not_deposited",
  "adults_only",
]);
export type ReceiveRefusal = z.infer<typeof receiveRefusalSchema>;

export const giftPreviewSchema = z.object({
  giver: personSchema,
  expiresAt: isoTimeSchema,
  receivable: z.boolean(),
  refusal: receiveRefusalSchema.nullable(),
  /** Only when it can be received, so the torn bag shows it before Accept. */
  sticker: stickerSchema.nullable(),
});
export type GiftPreview = z.infer<typeof giftPreviewSchema>;

export const giftsForYouSchema = z.object({
  /** Newest first. */
  gifts: z.array(z.object({ gift: giftSchema, sticker: stickerSchema, giver: personSchema })),
});
export type GiftsForYou = z.infer<typeof giftsForYouSchema>;

export const receivedGiftSchema = z.object({
  gift: giftSchema,
  sticker: stickerSchema,
  stickerPlacement: stickerPlacementSchema,
});
export type ReceivedGift = z.infer<typeof receivedGiftSchema>;

/** A gift goes to one person: a group, a multi-person chat or an OpenChat can't receive it. */
const GROUP_CHATS: ReadonlySet<LiffContextType> = new Set(["group", "room", "square_chat"]);

const groupChatRefusal = (liffContextType: LiffContextType) =>
  GROUP_CHATS.has(liffContextType)
    ? refuse("group_chat", `A gift can't be received from a ${liffContextType} chat`)
    : null;

const notFound = () => refuse("gift_not_found", "No gift has this Gift Claim Token");

/** An NSFW sticker goes only to an adult. */
function adultsOnlyRefusal(db: Pick<Db, "select">, gift: GiftRow, userId: string) {
  const sticker = db
    .select({ nsfw: stickers.nsfw })
    .from(stickers)
    .where(eq(stickers.id, gift.stickerId))
    .get();
  if (!sticker?.nsfw) return null;
  const receiver = db
    .select({ ageVerifiedAt: users.ageVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (receiver && ageStatusOf(receiver) === "adult") return null;
  return refuse("adults_only", `Gift ${gift.id} is an NSFW sticker, for adults only`);
}

/** The first reason this person can't receive this gift now, or null. */
function receiveRefusal(
  db: Pick<Db, "select">,
  gift: GiftRow,
  userId: string,
  liffContextType: LiffContextType,
  now: Date,
): Refusal<ReceiveRefusal> | null {
  const groupChat = groupChatRefusal(liffContextType);
  if (groupChat) return groupChat;
  if (gift.giverId === userId) return refuse("own_gift", `Gift ${gift.id} is your own`);
  if (gift.status === "received") {
    return refuse("already_received", `Gift ${gift.id} was already received`);
  }
  if (gift.status === "taken_out") {
    return refuse("taken_back", `Gift ${gift.id} was taken back by its giver`);
  }
  if (gift.status === "returned") {
    return refuse("gift_returned", `Gift ${gift.id} expired and went back to its giver`);
  }
  if (now.getTime() >= gift.expiresAt.getTime()) {
    return refuse("gift_expired", `Gift ${gift.id} expired at ${toIsoTime(gift.expiresAt)}`);
  }
  if (gift.escrowStatus !== "pending") {
    return refuse("not_deposited", `Gift ${gift.id}'s deposit hasn't landed in the escrow`);
  }
  return adultsOnlyRefusal(db, gift, userId);
}

/**
 * The gift a Gift Claim Token opens. On the escrow chain, a deposit not seen yet is read first, since
 * it may have landed a moment ago.
 */
async function openGift(deps: AppDeps, giftClaimToken: OpenGiftBody["giftClaimToken"]) {
  const { db, giftChain } = deps;
  const commitment = keccak256(giftClaimToken);
  const gift = db.select().from(gifts).where(eq(gifts.claimCommitment, commitment)).get();
  if (!gift || !giftChain || gift.escrowStatus !== "missing") return gift;
  return (await checkDeposit(deps, giftChain, gift)).gift;
}

export type Previewing = Refusal<"gift_not_found"> | { refusal: null; preview: GiftPreview };

/** What opening the Gift Message's link shows, before Accept. */
export async function previewGift(
  deps: AppDeps,
  userId: string,
  { giftClaimToken, liffContextType }: OpenGiftBody,
): Promise<Previewing> {
  const { db, clock, images } = deps;
  const gift = await openGift(deps, giftClaimToken);
  if (!gift) return notFound();
  const giver = db.select().from(users).where(eq(users.id, gift.giverId)).get();
  if (!giver) throw new Error(`Gift ${gift.id}'s giver ${gift.giverId} is missing`);
  const refusal = receiveRefusal(db, gift, userId, liffContextType, clock.now());
  // The first person to open it becomes who it waits for, so it stays on their board if they leave.
  if (!refusal && gift.forUserId === null) {
    db.update(gifts)
      .set({ forUserId: userId })
      .where(and(eq(gifts.id, gift.id), isNull(gifts.forUserId)))
      .run();
  }
  const sticker = refusal
    ? null
    : loadStickers(db, [gift.stickerId], images.urls).get(gift.stickerId);
  if (sticker === undefined)
    throw new Error(`Gift ${gift.id}'s sticker ${gift.stickerId} is missing`);
  return {
    refusal: null,
    preview: {
      giver: toPerson(giver),
      expiresAt: toIsoTime(gift.expiresAt),
      receivable: refusal === null,
      refusal: refusal?.refusal ?? null,
      sticker,
    },
  };
}

export type Receiving =
  | Refusal<ReceiveRefusal | "gift_not_found">
  | { refusal: null; received: ReceivedGift };

/** A lost HTTP response must not repeat the claim or change a placement the recipient already used. */
function recordedReceive({ db, images }: AppDeps, userId: string, gift: GiftRow): Receiving | null {
  if (gift.status !== "received" || gift.receiverId !== userId || gift.escrowStatus !== "claimed") {
    return null;
  }
  const sticker = loadStickers(db, [gift.stickerId], images.urls).get(gift.stickerId);
  if (!sticker) throw new Error(`Gift ${gift.id}'s sticker ${gift.stickerId} is missing`);
  // A later Giving must not look like a new arrival from this old receipt.
  if (sticker.ownerId !== userId) return null;
  const inAnotherGift = db
    .select({ id: gifts.id })
    .from(gifts)
    .where(
      and(
        eq(gifts.stickerId, gift.stickerId),
        or(inArray(gifts.status, ["packed", "sent"]), eq(gifts.escrowStatus, "pending")),
      ),
    )
    .get();
  if (inAnotherGift) return null;
  const placement = db
    .select()
    .from(stickerPlacements)
    .where(
      and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, gift.stickerId)),
    )
    .get();
  if (!placement) throw new Error(`Gift ${gift.id}'s received sticker placement is missing`);
  logInfo("gift.receive.recovered", {
    giftId: gift.id,
    userId,
    txHash: gift.claimTxHash ?? undefined,
  });
  return {
    refusal: null,
    received: { gift: toGift(gift), sticker, stickerPlacement: toStickerPlacement(placement) },
  };
}

/** Accept: the first person to receive gets the sticker, on their board. */
export async function receiveGift(
  deps: AppDeps,
  userId: string,
  { giftClaimToken, liffContextType }: OpenGiftBody,
): Promise<Receiving> {
  const groupChat = groupChatRefusal(liffContextType);
  if (groupChat) return groupChat;
  const opened = await openGift(deps, giftClaimToken);
  if (!opened) return notFound();
  return receiveOpened(deps, userId, opened, liffContextType, giftClaimToken);
}

/** The gifts waiting for this person, which they can receive from their board. */
export function giftsForYou({ db, clock, images }: AppDeps, userId: string): GiftsForYou {
  const rows = db
    .select({ gift: gifts, giver: users })
    .from(gifts)
    .innerJoin(users, eq(users.id, gifts.giverId))
    .where(
      and(
        eq(gifts.forUserId, userId),
        eq(gifts.status, "sent"),
        eq(gifts.escrowStatus, "pending"),
        gt(gifts.expiresAt, clock.now()),
      ),
    )
    .orderBy(desc(gifts.createdAt))
    .all();
  const stickersById = loadStickers(
    db,
    rows.map(({ gift }) => gift.stickerId),
    images.urls,
  );
  return {
    gifts: rows.map(({ gift, giver }) => {
      const sticker = stickersById.get(gift.stickerId);
      if (!sticker) throw new Error(`Gift ${gift.id}'s sticker ${gift.stickerId} is missing`);
      return { gift: toGift(gift), sticker, giver: toPerson(giver) };
    }),
  };
}

/**
 * Accept from the board, without the Gift Message's link: only for the person the gift waits for.
 * A gift for someone else answers as if there were none.
 */
export async function receiveGiftForYou(
  deps: AppDeps,
  userId: string,
  giftId: string,
): Promise<Receiving> {
  const gift = deps.db.select().from(gifts).where(eq(gifts.id, giftId)).get();
  if (!gift || gift.forUserId !== userId) {
    return refuse("gift_not_found", `No gift ${giftId} waits for you`);
  }
  return receiveOpened(deps, userId, gift, "none", null);
}

const receivingNow = new WeakMap<AppDeps["db"], Map<string, Promise<Receiving>>>();

/** Overlapping requests for the same recipient share the claim, not just its eventual DB result. */
function receiveOpened(
  deps: AppDeps,
  userId: string,
  opened: GiftRow,
  liffContextType: LiffContextType,
  giftClaimToken: OpenGiftBody["giftClaimToken"] | null,
): Promise<Receiving> {
  const active = receivingNow.get(deps.db) ?? new Map<string, Promise<Receiving>>();
  receivingNow.set(deps.db, active);
  const key = `${opened.id}/${userId}`;
  const pending = active.get(key);
  if (pending) return pending;
  const receiving = completeReceive(deps, userId, opened, liffContextType, giftClaimToken).finally(
    () => active.delete(key),
  );
  active.set(key, receiving);
  return receiving;
}

/** Receives an opened gift for this person; without its token, they're who it waits for. */
async function completeReceive(
  deps: AppDeps,
  userId: string,
  opened: GiftRow,
  liffContextType: LiffContextType,
  giftClaimToken: OpenGiftBody["giftClaimToken"] | null,
): Promise<Receiving> {
  const { db, clock, giftChain, images } = deps;
  const now = clock.now();
  const beforeClaim = receiveRefusal(db, opened, userId, liffContextType, now);
  if (beforeClaim) {
    return beforeClaim.refusal === "already_received"
      ? (recordedReceive(deps, userId, opened) ?? beforeClaim)
      : beforeClaim;
  }

  let claimTxHash: string | undefined;
  if (giftChain) {
    const claimed = await giftChain.claimGift({
      giftId: opened.id,
      giftClaimToken,
      recipientId: userId,
    });
    if (!claimed.claimed) {
      return refuse("already_received", `Gift ${opened.id} was already received`);
    }
    claimTxHash = claimed.txHash;
  }

  const receiving = db.transaction(
    (tx) => {
      const gift = tx.select().from(gifts).where(eq(gifts.id, opened.id)).get();
      if (!gift) return refuse("gift_not_found", `Gift ${opened.id} is gone`);
      const refusal = receiveRefusal(tx, gift, userId, liffContextType, now);
      if (refusal) return refusal;
      const received = tx
        .update(gifts)
        .set({
          status: "received",
          receiverId: userId,
          receivedAt: now,
          escrowStatus: "claimed",
          claimTxHash,
        })
        .where(eq(gifts.id, gift.id))
        .returning()
        .get();
      tx.update(stickers).set({ ownerId: userId }).where(eq(stickers.id, gift.stickerId)).run();
      // Accept carries the terms line.
      tx.update(users)
        .set({ termsAcceptedAt: now })
        .where(and(eq(users.id, userId), isNull(users.termsAcceptedAt)))
        .run();
      const placement = tx
        .insert(stickerPlacements)
        .values({ userId, stickerId: gift.stickerId })
        .onConflictDoUpdate({
          target: [stickerPlacements.userId, stickerPlacements.stickerId],
          // A sticker coming back returns to the tray at its old spot, and is NEW again. created_at
          // is kept, so its place in the tray doesn't move.
          set: {
            onBoard: sql`case when ${stickerPlacements.onBoard} is null then null else 0 end`,
            seenAt: null,
          },
        })
        .returning()
        .get();
      return { refusal: null, gift: received, placement };
    },
    { behavior: "immediate" },
  );
  if (receiving.refusal !== null) {
    // Another request can finish while this request waits for the chain.
    if (receiving.refusal === "already_received") {
      const gift = db.select().from(gifts).where(eq(gifts.id, opened.id)).get();
      if (gift) return recordedReceive(deps, userId, gift) ?? receiving;
    }
    return receiving;
  }
  queueNaming(deps, userId);
  const { gift, placement } = receiving;
  const sticker = loadStickers(db, [gift.stickerId], images.urls).get(gift.stickerId);
  if (!sticker) throw new Error(`Gift ${gift.id}'s sticker ${gift.stickerId} is missing`);
  return {
    refusal: null,
    received: { gift: toGift(gift), sticker, stickerPlacement: toStickerPlacement(placement) },
  };
}
