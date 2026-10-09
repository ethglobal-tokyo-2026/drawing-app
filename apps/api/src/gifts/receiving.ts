import { gifts, stickerPlacements, stickers, users, type Db } from "@drawing-app/db";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import {
  giftSchema,
  isoTimeSchema,
  optedIntoNsfw,
  personSchema,
  refuse,
  stickerLookup,
  stickerPlacementSchema,
  stickerSchema,
  stickerViewer,
  toGift,
  toIsoTime,
  toPerson,
  toStickerPlacement,
  type Refusal,
} from "../shapes.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  runAsServer,
  sponsored,
  suiDepsOf,
  type OnSucceeded,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import {
  claimSucceeded,
  currentGift,
  openGiftTransaction,
  settleOpenGiftTransaction,
  type GiftRow,
} from "./giftTransactions.ts";
import { claimCommitmentOf, giftClaimTokenSchema, giftHoldingSticker } from "./packaging.ts";

/** `liff.getContext().type`: where the Gift Message was opened. */
const liffContextTypeSchema = z.enum(["utou", "room", "group", "square_chat", "external", "none"]);
type LiffContextType = z.infer<typeof liffContextTypeSchema>;

/** The preview's body and the receive's. */
export const openGiftBodySchema = z.object({
  giftClaimToken: giftClaimTokenSchema,
  liffContextType: liffContextTypeSchema,
});
export type OpenGiftBody = z.infer<typeof openGiftBodySchema>;

/** Why a gift can't be received, in the order they're checked. */
const receiveRefusalSchema = z.enum([
  "group_chat",
  "own_gift",
  "already_received",
  "taken_back",
  "gift_returned",
  "gift_expired",
  "not_deposited",
  "nsfw_not_opted_in",
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

/** An NSFW sticker goes only to someone with the NSFW opt-in on. */
function nsfwOptInRefusal(db: Pick<Db, "select">, gift: GiftRow, userId: string) {
  const sticker = db
    .select({ nsfw: stickers.nsfw })
    .from(stickers)
    .where(eq(stickers.id, gift.stickerId))
    .get();
  if (!sticker?.nsfw) return null;
  const receiver = db
    .select({ nsfwOptedInAt: users.nsfwOptedInAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (receiver && optedIntoNsfw(receiver)) return null;
  return refuse(
    "nsfw_not_opted_in",
    `Gift ${gift.id} is an NSFW sticker, and the receiver has the NSFW opt-in off`,
  );
}

const takenBack = (gift: GiftRow) =>
  refuse("taken_back", `Gift ${gift.id} was taken back by its giver`);

const giftReturned = (gift: GiftRow) =>
  refuse("gift_returned", `Gift ${gift.id} expired and went back to its giver`);

/**
 * The first reason this person can't receive this gift now, or null. `claimLanded`: the escrow shows
 * the gift claimed, so its expiry no longer matters.
 */
function receiveRefusal(
  db: Pick<Db, "select">,
  gift: GiftRow,
  userId: string,
  liffContextType: LiffContextType,
  now: Date,
  claimLanded = false,
): Refusal<ReceiveRefusal> | null {
  const groupChat = groupChatRefusal(liffContextType);
  if (groupChat) return groupChat;
  if (gift.giverId === userId) return refuse("own_gift", `Gift ${gift.id} is your own`);
  if (gift.status === "received") {
    return refuse("already_received", `Gift ${gift.id} was already received`);
  }
  if (gift.status === "taken_out") return takenBack(gift);
  if (gift.status === "returned") return giftReturned(gift);
  if (!claimLanded && now.getTime() >= gift.expiresAt.getTime()) {
    return refuse("gift_expired", `Gift ${gift.id} expired at ${toIsoTime(gift.expiresAt)}`);
  }
  if (gift.escrowStatus !== "pending") {
    return refuse("not_deposited", `Gift ${gift.id}'s deposit hasn't landed in the escrow`);
  }
  return nsfwOptInRefusal(db, gift, userId);
}

/**
 * Whether an expired gift's claim may have landed anyway, before the expiry, since the escrow refuses
 * a claim after it: one that succeeded, or one submitted whose answer was lost. Accept still has to
 * follow and record it.
 */
function claimLandedBeforeExpiry({ db, clock, sui }: AppDeps, gift: GiftRow) {
  if (!sui || gift.escrowStatus !== "pending") return false;
  if (clock.now().getTime() < gift.expiresAt.getTime()) return false;
  const open = openGiftTransaction(db, gift.id);
  return claimSucceeded(db, gift.id) || (open?.kind === "claim" && open.submittedAt !== null);
}

/** The gift a Gift Claim Token opens. */
function openGift(deps: AppDeps, giftClaimToken: OpenGiftBody["giftClaimToken"]) {
  const commitment = claimCommitmentOf(giftClaimToken);
  return deps.db.select().from(gifts).where(eq(gifts.claimCommitment, commitment)).get();
}

/** The gift, if it waits for this person. */
function giftWaitingFor(db: Pick<Db, "select">, userId: string, giftId: string) {
  const gift = db.select().from(gifts).where(eq(gifts.id, giftId)).get();
  return gift?.forUserId === userId ? gift : undefined;
}

const notWaiting = (giftId: string) => refuse("gift_not_found", `No gift ${giftId} waits for you`);

export type Previewing = Refusal<"gift_not_found"> | { refusal: null; preview: GiftPreview };

/** The preview of a gift this person opened: the sticker only when they can receive it. */
function previewOf(
  deps: AppDeps,
  userId: string,
  gift: GiftRow,
  refusal: Refusal<ReceiveRefusal> | null,
): GiftPreview {
  const { db } = deps;
  const giver = db.select().from(users).where(eq(users.id, gift.giverId)).get();
  if (!giver) throw new Error(`Gift ${gift.id}'s giver ${gift.giverId} is missing`);
  return {
    giver: toPerson(giver),
    expiresAt: toIsoTime(gift.expiresAt),
    receivable: refusal === null,
    refusal: refusal?.refusal ?? null,
    sticker: refusal
      ? null
      : stickerLookup(db, [gift.stickerId], stickerViewer(deps, userId))(gift.stickerId),
  };
}

/** What opening the Gift Message's link shows, before Accept. */
export async function previewGift(
  deps: AppDeps,
  userId: string,
  { giftClaimToken, liffContextType }: OpenGiftBody,
): Promise<Previewing> {
  const { db, clock } = deps;
  const gift = openGift(deps, giftClaimToken);
  if (!gift) return notFound();
  const claimLanded = claimLandedBeforeExpiry(deps, gift);
  const refusal = receiveRefusal(db, gift, userId, liffContextType, clock.now(), claimLanded);
  const preview = previewOf(deps, userId, gift, refusal);
  // The first person to open it becomes who it waits for, so it stays on their board if they leave.
  if (!refusal && gift.forUserId === null) {
    db.update(gifts)
      .set({ forUserId: userId })
      .where(and(eq(gifts.id, gift.id), isNull(gifts.forUserId)))
      .run();
  }
  return { refusal: null, preview };
}

/**
 * What opening a gift waiting for you from your board shows, before Accept: the checks its link's
 * preview runs, since the board's list may be older than a take-out, an expiry or a receive.
 */
export async function previewGiftForYou(
  deps: AppDeps,
  userId: string,
  giftId: string,
): Promise<Previewing> {
  const gift = giftWaitingFor(deps.db, userId, giftId);
  if (!gift) return notWaiting(giftId);
  const claimLanded = claimLandedBeforeExpiry(deps, gift);
  const refusal = receiveRefusal(deps.db, gift, userId, "none", deps.clock.now(), claimLanded);
  return Promise.resolve({ refusal: null, preview: previewOf(deps, userId, gift, refusal) });
}

export type Receiving =
  | Refusal<ReceiveRefusal | "gift_not_found" | "claim_failed" | "no_sui_wallet">
  | { refusal: null; received: ReceivedGift };

/** A lost HTTP response must not repeat the claim or change a placement the recipient already used. */
function recordedReceive(deps: AppDeps, userId: string, gift: GiftRow): Receiving | null {
  const { db } = deps;
  if (gift.status !== "received" || gift.receiverId !== userId || gift.escrowStatus !== "claimed") {
    return null;
  }
  const sticker = stickerLookup(db, [gift.stickerId], stickerViewer(deps, userId))(gift.stickerId);
  // A later Giving must not look like a new arrival from this old receipt.
  if (sticker.ownerId !== userId || giftHoldingSticker(db, gift.stickerId)) return null;
  const placement = db
    .select()
    .from(stickerPlacements)
    .where(
      and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, gift.stickerId)),
    )
    .get();
  if (!placement) throw new Error(`Gift ${gift.id}'s received sticker placement is missing`);
  logInfo("gift.receive.recovered", { giftId: gift.id, userId });
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
  const opened = openGift(deps, giftClaimToken);
  if (!opened) return notFound();
  return receiveOpened(deps, userId, opened, liffContextType);
}

/** The gifts waiting for this person, which they can receive from their board. */
export function giftsForYou(deps: AppDeps, userId: string): GiftsForYou {
  const { db, clock } = deps;
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
  const stickerOf = stickerLookup(
    db,
    rows.map(({ gift }) => gift.stickerId),
    stickerViewer(deps, userId),
  );
  return {
    gifts: rows.map(({ gift, giver }) => ({
      gift: toGift(gift),
      sticker: stickerOf(gift.stickerId),
      giver: toPerson(giver),
    })),
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
  const gift = giftWaitingFor(deps.db, userId, giftId);
  if (!gift) return notWaiting(giftId);
  return receiveOpened(deps, userId, gift, "none");
}

const receivingNow = new WeakMap<AppDeps["db"], Map<string, Promise<Receiving>>>();

/** Overlapping requests for the same recipient share the claim, not just its eventual DB result. */
function receiveOpened(
  deps: AppDeps,
  userId: string,
  opened: GiftRow,
  liffContextType: LiffContextType,
): Promise<Receiving> {
  const active = receivingNow.get(deps.db) ?? new Map<string, Promise<Receiving>>();
  receivingNow.set(deps.db, active);
  const key = `${opened.id}/${userId}`;
  const pending = active.get(key);
  if (pending) return pending;
  const receiving = completeReceive(deps, userId, opened, liffContextType).finally(() =>
    active.delete(key),
  );
  active.set(key, receiving);
  return receiving;
}

/**
 * The receive: the gift received, the sticker theirs, back in their tray. Written with the claim's
 * outcome on Sui, and at once on the mock chain.
 */
const recordReceive =
  (gift: GiftRow, userId: string, now: Date): OnSucceeded =>
  (tx) => {
    tx.update(gifts)
      .set({ status: "received", receiverId: userId, receivedAt: now, escrowStatus: "claimed" })
      .where(eq(gifts.id, gift.id))
      .run();
    tx.update(stickers).set({ ownerId: userId }).where(eq(stickers.id, gift.stickerId)).run();
    // Accept carries the terms line.
    tx.update(users)
      .set({ termsAcceptedAt: now })
      .where(and(eq(users.id, userId), isNull(users.termsAcceptedAt)))
      .run();
    tx.insert(stickerPlacements)
      .values({ userId, stickerId: gift.stickerId })
      .onConflictDoUpdate({
        target: [stickerPlacements.userId, stickerPlacements.stickerId],
        // A sticker coming back returns to the tray at its old spots, in both layouts, and is NEW
        // again. created_at is kept, so its place in the tray doesn't move.
        set: {
          onBoard: sql`case when ${stickerPlacements.onBoard} is null then null else 0 end`,
          largeOnBoard: sql`case when ${stickerPlacements.largeOnBoard} is null then null else 0 end`,
          seenAt: null,
        },
      })
      .run();
  };

/** A recorded receive's answer; the giver's message goes off the request, so it never holds it up. */
function received(deps: AppDeps, userId: string, giftId: string): Receiving {
  const { db } = deps;
  const gift = currentGift(db, giftId);
  const placement = db
    .select()
    .from(stickerPlacements)
    .where(
      and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, gift.stickerId)),
    )
    .get();
  if (!placement) throw new Error(`Gift ${gift.id}'s received sticker placement is missing`);
  void deps.giverNotice.send(gift.id);
  return {
    refusal: null,
    received: {
      gift: toGift(gift),
      sticker: stickerLookup(db, [gift.stickerId], stickerViewer(deps, userId))(gift.stickerId),
      stickerPlacement: toStickerPlacement(placement),
    },
  };
}

const alreadyReceived = (gift: GiftRow) =>
  refuse("already_received", `Gift ${gift.id} was already received`);

/** Receives an opened gift for this person: the server checked its token, or they're who it waits for. */
async function completeReceive(
  deps: AppDeps,
  userId: string,
  opened: GiftRow,
  liffContextType: LiffContextType,
): Promise<Receiving> {
  const { db, clock } = deps;
  const now = clock.now();
  const claimLanded = claimLandedBeforeExpiry(deps, opened);
  const beforeClaim = receiveRefusal(db, opened, userId, liffContextType, now, claimLanded);
  if (beforeClaim) {
    return beforeClaim.refusal === "already_received"
      ? (recordedReceive(deps, userId, opened) ?? beforeClaim)
      : beforeClaim;
  }
  const sui = suiDepsOf(deps);
  if (sui) {
    return oneAtATime(`gift:${opened.id}`, () =>
      claimOnSui(deps, sui, userId, opened.id, liffContextType),
    );
  }

  const refusal = db.transaction(
    (tx) => {
      const gift = tx.select().from(gifts).where(eq(gifts.id, opened.id)).get();
      if (!gift) return refuse("gift_not_found", `Gift ${opened.id} is gone`);
      const refused = receiveRefusal(tx, gift, userId, liffContextType, now, claimLanded);
      if (refused) return refused;
      recordReceive(gift, userId, now)(tx, []);
      return null;
    },
    { behavior: "immediate" },
  );
  if (refusal) {
    // Another request can finish while this one checks.
    if (refusal.refusal === "already_received") {
      return recordedReceive(deps, userId, currentGift(db, opened.id)) ?? refusal;
    }
    return refusal;
  }
  return received(deps, userId, opened.id);
}

/**
 * Receiving on Sui, holding the gift's key: the gift's open transaction settles first. A claim that
 * already ran is this person's receive only if the escrow sent the sticker to their wallet; else the
 * server claims the gift for them, and the receive lands with the claim.
 */
async function claimOnSui(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  userId: string,
  giftId: string,
  liffContextType: LiffContextType,
): Promise<Receiving> {
  const { db } = sui;
  const recipient = await deps.suiWallets.addressFor(userId);
  if (!recipient) {
    return refuse(
      "no_sui_wallet",
      `Person ${userId} has no Sui wallet to receive the sticker into`,
    );
  }
  const settled = await settleOpenGiftTransaction(sui, currentGift(db, giftId));
  if (settled?.outcome === null) {
    return refuse(
      "claim_failed",
      `Sui hasn't shown gift ${giftId}'s ${settled.kind} yet; Accept again in a moment`,
    );
  }
  const now = sui.clock.now();
  const gift = currentGift(db, giftId);
  if (claimSucceeded(db, giftId)) return reconcileClaim(deps, sui, userId, recipient, gift, now);
  const refusal = receiveRefusal(db, gift, userId, liffContextType, now);
  if (refusal) return refusal;

  const claim = await sponsored(
    sui,
    { kind: "claim", giftId, stickerId: gift.stickerId },
    await sui.sui.claimKind(giftId, recipient),
  );
  const { row } = await runAsServer(sui, claim, recordReceive(gift, userId, now));
  if (row.outcome === "succeeded") return received(deps, userId, giftId);
  if (row.outcome === null) {
    return refuse(
      "claim_failed",
      `Sui hasn't answered gift ${giftId}'s claim yet; Accept again in a moment`,
    );
  }
  const failed = refuse(
    "claim_failed",
    `Gift ${giftId} wasn't received: Sui ${row.outcome === "dead" ? "refused" : "failed"} its claim (${row.failure ?? "no reason given"})`,
  );
  // It didn't run: the escrow says whether the giver took the gift back, or it went home, first.
  // When the escrow can't be read, the claim's own failure is the answer.
  let escrow;
  try {
    escrow = await sui.sui.readGift(giftId);
  } catch (error) {
    logFailure("gift.claim.check_failed", error, { giftId, userId });
    return failed;
  }
  if (escrow.status === "taken_out") return takenBack(gift);
  if (escrow.status === "expired_returned") return giftReturned(gift);
  return failed;
}

/** A claim of the gift ran: the receive is this person's only if the escrow sent them the sticker. */
async function reconcileClaim(
  deps: AppDeps,
  sui: SuiTransactionDeps,
  userId: string,
  recipient: string,
  gift: GiftRow,
  now: Date,
): Promise<Receiving> {
  if (gift.status === "received") {
    return (
      (gift.receiverId === userId && recordedReceive(deps, userId, gift)) || alreadyReceived(gift)
    );
  }
  const escrow = await sui.sui.readGift(gift.id);
  if (escrow.recipient !== recipient) return alreadyReceived(gift);
  sui.db.transaction((tx) => recordReceive(gift, userId, now)(tx, []), { behavior: "immediate" });
  logInfo("gift.receive.reconciled", { giftId: gift.id, userId });
  return received(deps, userId, gift.id);
}
