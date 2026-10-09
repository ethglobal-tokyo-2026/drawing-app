import { gifts, stickerPlacements, stickers, users, type Db } from "@drawing-app/db";
import { and, asc, count, eq, inArray, isNull, notExists, or } from "drizzle-orm";
import { z } from "zod";
import {
  giftSchema,
  isoTimeSchema,
  largeColumns,
  largePlacementSchema,
  personSchema,
  placementSchema,
  stickerPlacementSchema,
  stickerSchema,
  toIsoTime,
  toPerson,
  toSticker,
  toStickerPlacement,
  type StickerViewer,
} from "../shapes.ts";
import { simplifiedOutlineOf } from "../stickers/outline.ts";
import { MAX_LARGE_LAYOUT_BATCH } from "./largeLayoutLimit.ts";

/** `me` in a board's path: the signed-in person. */
export const ME = "me";

/** The most sticker ids one seen report marks. */
export const MAX_SEEN_BATCH = 500;

/** A gift is open while it's in the bag or on its way. */
const openGiftStatusSchema = giftSchema.shape.status.extract(["packed", "sent"]);

const boardStickerSchema = stickerPlacementSchema.extend({
  /** Its outline simplified, which is all a sticker sheet packs by; the sticker's detail has it whole. */
  sticker: stickerSchema,
  /** False: given away; off the board, and an empty spot in the sticker tray. */
  held: z.boolean(),
  /** Set when `held` is false: who received it, for the giver's notice. */
  givenTo: z.object({ receiver: personSchema, receivedAt: isoTimeSchema }).nullable(),
  /** `for`: who the giver picked in the app, or who first opened its link; null through LINE alone. */
  openGift: z
    .object({ id: giftSchema.shape.id, status: openGiftStatusSchema, for: personSchema.nullable() })
    .nullable(),
});
export type BoardSticker = z.infer<typeof boardStickerSchema>;

export const stickerBoardSchema = z.object({
  owner: personSchema,
  boardStickers: z.array(boardStickerSchema),
});
export type StickerBoard = z.infer<typeof stickerBoardSchema>;

export const seenRequestSchema = z.object({
  stickerIds: z.array(stickerPlacementSchema.shape.stickerId.min(1)).min(1).max(MAX_SEEN_BATCH),
});

/** The body that saves a sticker's spot: in the phone's layout, the large layout, or both at once. */
export const placementsRequestSchema = z
  .object({
    placement: placementSchema.optional(),
    largePlacement: largePlacementSchema.optional(),
  })
  .refine(
    (body) => body.placement !== undefined || body.largePlacement !== undefined,
    "placement or largePlacement: say at least one",
  );
export type PlacementsRequest = z.infer<typeof placementsRequestSchema>;

/** A large layout derived from the phone's: each sticker's spot in it. */
export const largeLayoutRequestSchema = z.object({
  stickerPlacements: z
    .array(
      z.object({
        stickerId: stickerPlacementSchema.shape.stickerId.min(1),
        largePlacement: largePlacementSchema,
      }),
    )
    .min(1)
    .max(MAX_LARGE_LAYOUT_BATCH),
});
export type LargeLayoutEntry = z.infer<
  typeof largeLayoutRequestSchema
>["stickerPlacements"][number];

/** Whose board a path names: `me`, or a user id. Undefined when there's no such person. */
export const findBoardOwner = (db: Db, userId: string, viewerId: string) =>
  db
    .select()
    .from(users)
    .where(eq(users.id, userId === ME ? viewerId : userId))
    .get();

/** The owner's gifts in the bag or on their way, by sticker. */
function openGiftsOf(db: Db, ownerId: string) {
  const rows = db
    .select({ id: gifts.id, stickerId: gifts.stickerId, status: gifts.status, for: users })
    .from(gifts)
    .leftJoin(users, eq(users.id, gifts.forUserId))
    .where(and(eq(gifts.giverId, ownerId), inArray(gifts.status, openGiftStatusSchema.options)))
    .all();
  const open = new Map<string, BoardSticker["openGift"]>();
  for (const { id, stickerId, status, for: forUser } of rows) {
    const openStatus = openGiftStatusSchema.safeParse(status);
    if (openStatus.success) {
      open.set(stickerId, {
        id,
        status: openStatus.data,
        for: forUser ? toPerson(forUser) : null,
      });
    }
  }
  return open;
}

/** Who received each of `stickerIds` from the owner, the last time it left them. */
function givenToOf(db: Db, ownerId: string, stickerIds: string[]) {
  const givenTo = new Map<string, BoardSticker["givenTo"]>();
  if (stickerIds.length === 0) return givenTo;
  const rows = db
    .select({ stickerId: gifts.stickerId, receivedAt: gifts.receivedAt, receiver: users })
    .from(gifts)
    .innerJoin(users, eq(users.id, gifts.receiverId))
    .where(
      and(
        eq(gifts.giverId, ownerId),
        eq(gifts.status, "received"),
        inArray(gifts.stickerId, stickerIds),
      ),
    )
    .orderBy(asc(gifts.receivedAt))
    .all();
  // Oldest first, so a sticker given more than once keeps its latest receiver.
  for (const { stickerId, receivedAt, receiver } of rows) {
    if (receivedAt) {
      givenTo.set(stickerId, { receiver: toPerson(receiver), receivedAt: toIsoTime(receivedAt) });
    }
  }
  return givenTo;
}

/** A sticker in one of the owner's sent gifts: on its way, so off their board until it's received. */
const onItsWayFrom = (db: Db, ownerId: string) =>
  db
    .select({ id: gifts.id })
    .from(gifts)
    .where(
      and(eq(gifts.stickerId, stickers.id), eq(gifts.giverId, ownerId), eq(gifts.status, "sent")),
    );

/**
 * A Sticker Board in sticker tray order. Your own lists every sticker that reached you, with NEW and
 * your open gifts; anyone else's lists only the stickers on it, since the bag and NEW are the owner's.
 */
export function loadStickerBoard(
  db: Db,
  owner: typeof users.$inferSelect,
  viewerId: string,
  viewer: StickerViewer,
): StickerBoard {
  const own = owner.id === viewerId;
  const rows = db
    .select({ placement: stickerPlacements, sticker: stickers, artist: users })
    .from(stickerPlacements)
    .innerJoin(stickers, eq(stickers.id, stickerPlacements.stickerId))
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(
      and(
        eq(stickerPlacements.userId, owner.id),
        // Receiving writes only the receiver's placement, so a sticker given away keeps the giver's.
        // A visitor gets no open gifts to tell a sticker on its way by, so it's left off here.
        own
          ? undefined
          : and(
              // On the board in either layout: the visitor's screen shows the one for its size.
              or(eq(stickerPlacements.onBoard, true), eq(stickerPlacements.largeOnBoard, true)),
              eq(stickers.ownerId, owner.id),
              notExists(onItsWayFrom(db, owner.id)),
            ),
      ),
    )
    .orderBy(asc(stickerPlacements.createdAt), asc(stickerPlacements.stickerId))
    .all();
  const openGifts = own ? openGiftsOf(db, owner.id) : new Map<string, BoardSticker["openGift"]>();
  const givenAway = rows.filter(({ sticker }) => sticker.ownerId !== owner.id);
  const givenTo = own
    ? givenToOf(
        db,
        owner.id,
        givenAway.map(({ sticker }) => sticker.id),
      )
    : new Map<string, BoardSticker["givenTo"]>();
  return {
    owner: toPerson(owner),
    boardStickers: rows.map(({ placement, sticker, artist }) => {
      const stickerPlacement = toStickerPlacement(placement);
      const held = sticker.ownerId === owner.id;
      return {
        ...stickerPlacement,
        seenAt: own ? stickerPlacement.seenAt : null,
        sticker: {
          ...toSticker(sticker, artist, viewer),
          outline: simplifiedOutlineOf(sticker),
        },
        held,
        givenTo: held ? null : (givenTo.get(sticker.id) ?? null),
        openGift: openGifts.get(sticker.id) ?? null,
      };
    }),
  };
}

/**
 * Saves the person's placement of a sticker in either layout or both, all six values of each.
 * Undefined when it never reached them.
 */
export const savePlacements = (
  db: Db,
  userId: string,
  stickerId: string,
  { placement, largePlacement }: PlacementsRequest,
) =>
  db
    .update(stickerPlacements)
    .set({ ...placement, ...(largePlacement && largeColumns(largePlacement)) })
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .returning()
    .get();

/** Which of `stickerIds` never reached the person: they hold no placement of it. */
export function neverReached(db: Db, userId: string, stickerIds: readonly string[]) {
  const found = new Set(
    db
      .select({ stickerId: stickerPlacements.stickerId })
      .from(stickerPlacements)
      .where(
        and(
          eq(stickerPlacements.userId, userId),
          inArray(stickerPlacements.stickerId, [...stickerIds]),
        ),
      )
      .all()
      .map(({ stickerId }) => stickerId),
  );
  return stickerIds.filter((id) => !found.has(id));
}

/**
 * Saves a large layout derived from the phone's, each spot only where the sticker has none in the
 * large layout yet: a large layout saved first from another device stays. Answers the listed
 * stickers' placements as saved.
 */
export function saveDerivedLargeLayout(
  db: Db,
  userId: string,
  entries: readonly LargeLayoutEntry[],
) {
  const ids = entries.map(({ stickerId }) => stickerId);
  return db.transaction((tx) => {
    for (const { stickerId, largePlacement } of entries) {
      tx.update(stickerPlacements)
        .set(largeColumns(largePlacement))
        .where(
          and(
            eq(stickerPlacements.userId, userId),
            eq(stickerPlacements.stickerId, stickerId),
            isNull(stickerPlacements.largeOnBoard),
          ),
        )
        .run();
    }
    return tx
      .select()
      .from(stickerPlacements)
      .where(and(eq(stickerPlacements.userId, userId), inArray(stickerPlacements.stickerId, ids)))
      .all();
  });
}

/** Clears NEW on the person's stickers among `stickerIds`, keeping the time each was first seen. */
export function markStickersSeen(db: Db, userId: string, stickerIds: string[], now: Date) {
  db.update(stickerPlacements)
    .set({ seenAt: now })
    .where(
      and(
        eq(stickerPlacements.userId, userId),
        inArray(stickerPlacements.stickerId, stickerIds),
        isNull(stickerPlacements.seenAt),
      ),
    )
    .run();
}

/** NEW in a sticker tray: stickers the person holds whose placement has no seen_at. */
export function newStickerCount(db: Db, userId: string): number {
  const row = db
    .select({ n: count() })
    .from(stickerPlacements)
    .innerJoin(stickers, eq(stickers.id, stickerPlacements.stickerId))
    .where(
      and(
        eq(stickerPlacements.userId, userId),
        eq(stickers.ownerId, userId),
        isNull(stickerPlacements.seenAt),
      ),
    )
    .get();
  return row?.n ?? 0;
}
