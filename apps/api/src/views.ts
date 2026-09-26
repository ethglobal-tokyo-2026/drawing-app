import {
  gifts,
  gratitude,
  MAX_HITS,
  MAX_PEAK_MULT,
  MAX_PEAK_TIER,
  MAX_TIME_USED_S,
  stickerPlacements,
  stickers,
  users,
  type Db,
} from "@drawing-app/db";
import { stickerEnsName } from "@drawing-app/sticker-chain/croquis-names";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  isoTimeSchema as isoTime,
  personSchema,
  stickerImagesSchema,
  toIsoTime,
  toPerson,
  type StickerImages,
} from "./shapes.ts";

// The contract's shared shapes that come from stickers, placements, gifts and gratitude, built from
// the tables, and the views that turn rows into them. Person and Me are in shapes.ts.

const stickerRow = createSelectSchema(stickers, {
  timeUsed: (schema) => schema.min(0).max(MAX_TIME_USED_S),
  width: (schema) => schema.positive(),
  height: (schema) => schema.positive(),
});

export const stickerSchema = z.object({
  ...stickerRow.pick({
    id: true,
    number: true,
    ownerId: true,
    timeUsed: true,
    width: true,
    height: true,
    outline: true,
    contentHash: true,
    tokenId: true,
    mintTxHash: true,
  }).shape,
  /** The Original Artist. */
  artist: personSchema,
  images: stickerImagesSchema,
  sealedAt: isoTime,
  /** <number>.<artist>.croquis.eth, once it's onchain. */
  ensName: z.string().nullable(),
});
export type Sticker = z.infer<typeof stickerSchema>;

/**
 * A placement's six values, all set, with the table's CHECK ranges: StickerPlacement's `placement`,
 * and the body that saves one.
 */
export const placementSchema = createSelectSchema(stickerPlacements, {
  onBoard: z.boolean(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().gt(0).max(1),
  rotation: z.number(),
  z: z.int(),
}).pick({ onBoard: true, x: true, y: true, scale: true, rotation: true, z: true });

export type Placement = z.infer<typeof placementSchema>;

export const stickerPlacementSchema = z.object({
  stickerId: createSelectSchema(stickerPlacements).shape.stickerId,
  placement: placementSchema.nullable(),
  /** Null shows NEW. */
  seenAt: isoTime.nullable(),
  /** The sticker tray's order. */
  arrivedAt: isoTime,
});
export type StickerPlacement = z.infer<typeof stickerPlacementSchema>;

export const giftSchema = z.object({
  ...createSelectSchema(gifts).pick({
    id: true,
    stickerId: true,
    giverId: true,
    receiverId: true,
    status: true,
    escrowStatus: true,
  }).shape,
  packedAt: isoTime,
  expiresAt: isoTime,
  sentAt: isoTime.nullable(),
  takenOutAt: isoTime.nullable(),
  receivedAt: isoTime.nullable(),
  returnedAt: isoTime.nullable(),
});
export type Gift = z.infer<typeof giftSchema>;

const gratitudeRow = createSelectSchema(gratitude, {
  hits: (schema) => schema.min(1).max(MAX_HITS),
  total: (schema) => schema.min(0),
  peakMult: (schema) => schema.min(1).max(MAX_PEAK_MULT),
  peakTier: (schema) => schema.min(0).max(MAX_PEAK_TIER),
  originalArtistGratitudeShare: (schema) => schema.min(0),
});

export const gratitudeSchema = z.object({
  ...gratitudeRow.pick({
    giftId: true,
    method: true,
    hits: true,
    total: true,
    peakMult: true,
    peakTier: true,
    originalArtistGratitudeShare: true,
    gameConfigVersion: true,
  }).shape,
  recordedAt: isoTime,
  seenByGiverAt: isoTime.nullable(),
});
export type Gratitude = z.infer<typeof gratitudeSchema>;

/** A content hash's five image URLs on the CDN: the server passes `deps.images.urls`. */
type ImageUrls = (contentHash: string) => StickerImages;

/** A sticker with its Original Artist, and its images named by its PNG's content hash. */
export function toSticker(
  sticker: typeof stickers.$inferSelect,
  artist: typeof users.$inferSelect,
  urls: ImageUrls,
): Sticker {
  return {
    id: sticker.id,
    number: sticker.number,
    artist: toPerson(artist),
    ownerId: sticker.ownerId,
    timeUsed: sticker.timeUsed,
    width: sticker.width,
    height: sticker.height,
    outline: sticker.outline,
    contentHash: sticker.contentHash,
    images: urls(sticker.contentHash),
    tokenId: sticker.tokenId,
    mintTxHash: sticker.mintTxHash,
    sealedAt: toIsoTime(sticker.createdAt),
    ensName:
      sticker.ensNamedAt !== null && artist.ensLabel !== null
        ? stickerEnsName(sticker.number, artist.ensLabel)
        : null,
  };
}

/** Stickers by id, each with its Original Artist, keyed by id. */
export function loadStickers(db: Db, ids: Iterable<string>, urls: ImageUrls): Map<string, Sticker> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const rows = db
    .select({ sticker: stickers, artist: users })
    .from(stickers)
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(inArray(stickers.id, wanted))
    .all();
  return new Map(rows.map(({ sticker, artist }) => [sticker.id, toSticker(sticker, artist, urls)]));
}

export function toStickerPlacement(row: typeof stickerPlacements.$inferSelect): StickerPlacement {
  const { onBoard, x, y, scale, rotation, z } = row;
  return {
    stickerId: row.stickerId,
    placement:
      onBoard === null ||
      x === null ||
      y === null ||
      scale === null ||
      rotation === null ||
      z === null
        ? null
        : { onBoard, x, y, scale, rotation, z },
    seenAt: toIsoTime(row.seenAt),
    arrivedAt: toIsoTime(row.createdAt),
  };
}

export const toGift = (gift: typeof gifts.$inferSelect): Gift => ({
  id: gift.id,
  stickerId: gift.stickerId,
  giverId: gift.giverId,
  receiverId: gift.receiverId,
  status: gift.status,
  escrowStatus: gift.escrowStatus,
  packedAt: toIsoTime(gift.createdAt),
  expiresAt: toIsoTime(gift.expiresAt),
  sentAt: toIsoTime(gift.sentAt),
  takenOutAt: toIsoTime(gift.takenOutAt),
  receivedAt: toIsoTime(gift.receivedAt),
  returnedAt: toIsoTime(gift.returnedAt),
});

export const toGratitude = (row: typeof gratitude.$inferSelect): Gratitude => ({
  giftId: row.giftId,
  method: row.method,
  hits: row.hits,
  total: row.total,
  peakMult: row.peakMult,
  peakTier: row.peakTier,
  originalArtistGratitudeShare: row.originalArtistGratitudeShare,
  gameConfigVersion: row.gameConfigVersion,
  recordedAt: toIsoTime(row.createdAt),
  seenByGiverAt: toIsoTime(row.seenByGiverAt),
});

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

/** The pink tag: gratitude on gifts the person gave that they haven't watched. */
export function unseenGratitudeCount(db: Db, userId: string): number {
  const row = db
    .select({ n: count() })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .where(and(eq(gifts.giverId, userId), isNull(gratitude.seenByGiverAt)))
    .get();
  return row?.n ?? 0;
}
