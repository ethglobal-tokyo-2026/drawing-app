import {
  gifts,
  gratitude,
  KYOTO_SEIKA_TIME_USED_S,
  MAX_HITS,
  MAX_PEAK_MULT,
  MAX_PEAK_TIER,
  stickerPlacements,
  stickers,
  suiTransactions,
  ticketKinds,
  users,
  type Db,
} from "@drawing-app/db";
import { eq, inArray } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { AppDeps } from "./deps.ts";
import { kyotoSeikaSubjectsSchema } from "./stickers/kyotoSeikaSubjects.ts";

// The contract's shapes that routes share, and the functions that turn rows into them.

/** A moment as the API sends it: an ISO 8601 UTC string. */
export const isoTimeSchema = z.iso.datetime();
export type IsoTime = z.infer<typeof isoTimeSchema>;

/** A database time as the API sends it. */
export function toIsoTime(date: Date): IsoTime;
export function toIsoTime(date: Date | null): IsoTime | null;
export function toIsoTime(date: Date | null): IsoTime | null {
  return date === null ? null : date.toISOString();
}

/** Gift ids, content hashes and Gift Claim Tokens: lowercase 0x-prefixed 32-byte hex. */
export const bytes32Schema = z.string().regex(/^0x[0-9a-f]{64}$/);

/** A gift ID that isn't 0x and 64 lowercase hex digits is invalid_request. */
export const giftIdParam = z.object({ giftId: bytes32Schema });

/** A Sui address or object ID: 0x and 64 lowercase hex digits. */
export const suiIdSchema = z
  .string()
  .regex(/^0x[0-9a-f]{64}$/, "Expected 0x and 64 lowercase hex digits");

/** A Sui transaction digest: 32 bytes in base58. */
const suiDigestSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/, "Expected a base58 Sui transaction digest");

/**
 * A transaction the server built and Shinami sponsored, for the person's Privy Sui wallet to sign
 * as its sender.
 */
export const sponsoredTransactionSchema = z.object({
  /** Base64 BCS TransactionData, Shinami's gas included: what the wallet signs. */
  txBytes: z.base64(),
  digest: suiDigestSchema,
  /** When Shinami's sponsorship lapses: a signature posted after it is refused. */
  expiresAt: z.iso.datetime(),
});
export type SponsoredTransaction = z.infer<typeof sponsoredTransactionSchema>;

/** The wallet's signature over a sponsored transaction, which the server checks and submits. */
export const signedTransactionSchema = z.object({
  digest: suiDigestSchema,
  signature: z.base64(),
});
export type SignedTransaction = z.infer<typeof signedTransactionSchema>;

export const toSponsoredTransaction = (
  row: Pick<typeof suiTransactions.$inferSelect, "txBytes" | "digest" | "expiresAt">,
): SponsoredTransaction => ({
  txBytes: row.txBytes,
  digest: row.digest,
  expiresAt: toIsoTime(row.expiresAt),
});

/** A refused step: the contract's code, and what failed for which item. */
export interface Refusal<Code extends string> {
  refusal: Code;
  detail: string;
}

export const refuse = <Code extends string>(refusal: Code, detail: string): Refusal<Code> => ({
  refusal,
  detail,
});

const count = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

const userRow = createSelectSchema(users);
type UserRow = typeof users.$inferSelect;

/** Whether the person has the NSFW opt-in on. */
export const optedIntoNsfw = (user: Pick<UserRow, "nsfwOptedInAt">): boolean =>
  user.nsfwOptedInAt !== null;

/** Whether the person has Kyoto Seika Manga Expression Practice Mode on. */
export const kyotoSeikaPracticeOn = (user: Pick<UserRow, "kyotoSeikaPracticeOnAt">): boolean =>
  user.kyotoSeikaPracticeOnAt !== null;

/** Anyone, as other signed-in people see them. */
export const personSchema = userRow
  .pick({
    id: true,
    handle: true,
    lineDisplayName: true,
    linePictureUrl: true,
  })
  .extend({
    /**
     * Show 18+ stickers, in Settings. Only someone with it on marks, sees unblurred or receives NSFW
     * stickers, so the give sheet shows it.
     */
    nsfwOptIn: z.boolean(),
  });
export type Person = z.infer<typeof personSchema>;

/** Picks the public columns, so LINE's user ID and the person's wallet never reach other people. */
export const toPerson = ({
  id,
  handle,
  lineDisplayName,
  linePictureUrl,
  nsfwOptedInAt,
}: Pick<
  UserRow,
  "id" | "handle" | "lineDisplayName" | "linePictureUrl" | "nsfwOptedInAt"
>): Person => ({
  id,
  handle,
  lineDisplayName,
  linePictureUrl,
  nsfwOptIn: optedIntoNsfw({ nsfwOptedInAt }),
});

/** You. */
export const meSchema = personSchema.extend({
  /**
   * LINE's `sub` for your account. The app opens on a lasting session only when it's the LINE user
   * LIFF logged in. Yours alone: Person leaves it out.
   */
  lineUserId: userRow.shape.lineUserId,
  language: userRow.shape.language,
  /** Settings' language; null follows LINE's. */
  languageChoice: userRow.shape.languageChoice,
  /** The stat board's "Since". */
  createdAt: isoTimeSchema,
  /** True until the handle prompt is answered. */
  needsHandle: z.boolean(),
  /** NEW in your sticker tray. */
  newStickerCount: count,
  /** The pink tag. */
  unseenGratitudeCount: count,
  /**
   * Kyoto Seika Manga Expression Practice Mode, in Settings: each ticket spent while it's on is
   * spent in it.
   */
  kyotoSeikaPractice: z.boolean(),
  /** "Dark subjects too", under it: the deal may bring the dark Kyoto Seika Subjects. */
  kyotoSeikaDarkSubjects: z.boolean(),
});
export type Me = z.infer<typeof meSchema>;

export const toMe = (
  user: UserRow,
  counts: Pick<Me, "newStickerCount" | "unseenGratitudeCount">,
): Me => ({
  ...toPerson(user),
  lineUserId: user.lineUserId,
  language: user.language,
  languageChoice: user.languageChoice,
  createdAt: toIsoTime(user.createdAt),
  needsHandle: user.handle === null,
  ...counts,
  kyotoSeikaPractice: kyotoSeikaPracticeOn(user),
  kyotoSeikaDarkSubjects: user.kyotoSeikaDarkSubjectsOnAt !== null,
});

/** The five PNGs a sticker is sealed with. The sticker PNG's hash names them. */
export const stickerPngsSchema = z.object({
  png: z.url(),
  mask: z.url(),
  spec: z.url(),
  rim: z.url(),
  flat: z.url(),
});
export type StickerPngKind = keyof z.infer<typeof stickerPngsSchema>;

/** What the app shows: WebP copies of the sticker and its masks, and the foil band's mask. */
export const stickerWebpsSchema = z.object({
  sticker: z.url(),
  mask: z.url(),
  spec: z.url(),
  rim: z.url(),
  /** The silhouette grown to the foil band's outer edge, the image's size. */
  foil: z.url(),
});
export type StickerWebpKind = keyof z.infer<typeof stickerWebpsSchema>;

/** A sticker's files on the CDN, named by its content hash. */
const stickerImagesSchema = stickerPngsSchema.extend({ webp: stickerWebpsSchema });
export type StickerImages = z.infer<typeof stickerImagesSchema>;

const stickerRow = createSelectSchema(stickers, {
  timeUsed: (schema) => schema.min(0).max(KYOTO_SEIKA_TIME_USED_S),
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
    objectId: true,
    nsfw: true,
  }).shape,
  /** The Original Artist. */
  artist: personSchema,
  images: stickerImagesSchema,
  sealedAt: isoTimeSchema,
  /**
   * The subject pair of a sticker drawn in Kyoto Seika Manga Expression Practice Mode, fixed at
   * seal; null on any other, so it marks such a sticker.
   */
  kyotoSeikaSubjects: kyotoSeikaSubjectsSchema.nullable(),
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
  seenAt: isoTimeSchema.nullable(),
  /** The sticker tray's order. */
  arrivedAt: isoTimeSchema,
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
  packedAt: isoTimeSchema,
  expiresAt: isoTimeSchema,
  sentAt: isoTimeSchema.nullable(),
  takenOutAt: isoTimeSchema.nullable(),
  receivedAt: isoTimeSchema.nullable(),
  returnedAt: isoTimeSchema.nullable(),
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
  recordedAt: isoTimeSchema,
  seenByGiverAt: isoTimeSchema.nullable(),
});
export type Gratitude = z.infer<typeof gratitudeSchema>;

type StickerRow = typeof stickers.$inferSelect;

/** What one viewer gets of each sticker: an NSFW sticker is veiled unless they've opted in. */
export interface StickerViewer {
  veils: (sticker: Pick<StickerRow, "nsfw">) => boolean;
  /** Its image URLs: the veiled image in place of each that shows the drawing, when it's veiled. */
  images: (sticker: Pick<StickerRow, "nsfw" | "contentHash" | "veiledHash">) => StickerImages;
}

function viewerOf(images: AppDeps["images"], optedIn: boolean): StickerViewer {
  const veils = (sticker: Pick<StickerRow, "nsfw">) => sticker.nsfw && !optedIn;
  return {
    veils,
    images: (sticker) => {
      if (!sticker.nsfw) return images.urls(sticker.contentHash);
      if (optedIn) return images.optInUrls(sticker.contentHash);
      // The database holds every NSFW sticker to its veil, so a row without one is a fault.
      if (sticker.veiledHash === null) {
        throw new Error(`The NSFW sticker with content hash ${sticker.contentHash} has no veil`);
      }
      return images.veiledUrls(sticker.contentHash, sticker.veiledHash);
    },
  };
}

/** The sticker viewer `viewerId` is, by their NSFW opt-in now. */
export function stickerViewer(
  { db, images }: Pick<AppDeps, "db" | "images">,
  viewerId: string,
): StickerViewer {
  const viewer = db
    .select({ nsfwOptedInAt: users.nsfwOptedInAt })
    .from(users)
    .where(eq(users.id, viewerId))
    .get();
  return viewerOf(images, viewer !== undefined && optedIntoNsfw(viewer));
}

/** A sticker with its Original Artist, and its images as `viewer` gets them. */
export function toSticker(
  sticker: StickerRow,
  artist: typeof users.$inferSelect,
  viewer: StickerViewer,
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
    images: viewer.images(sticker),
    objectId: sticker.objectId,
    nsfw: sticker.nsfw,
    sealedAt: toIsoTime(sticker.createdAt),
    kyotoSeikaSubjects: sticker.kyotoSeikaSubjects,
  };
}

/** Stickers by id, each with its Original Artist and its images as `viewer` gets them, keyed by id. */
export function loadStickers(
  db: Db,
  ids: Iterable<string>,
  viewer: StickerViewer,
): Map<string, Sticker> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const rows = db
    .select({ sticker: stickers, artist: users })
    .from(stickers)
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(inArray(stickers.id, wanted))
    .all();
  return new Map(
    rows.map(({ sticker, artist }) => [sticker.id, toSticker(sticker, artist, viewer)]),
  );
}

/** Looks up stickers loaded by id. Every id comes from a row whose foreign key holds its sticker. */
export function stickerLookup(db: Db, ids: Iterable<string>, viewer: StickerViewer) {
  const loaded = loadStickers(db, ids, viewer);
  return (id: string): Sticker => {
    const sticker = loaded.get(id);
    if (!sticker) throw new Error(`Sticker ${id} is missing`);
    return sticker;
  };
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

export const ticketsSchema = z.object({
  /** Tokyo time: ticket days run midnight to midnight there, for everyone. */
  ticketDay: z.iso.date(),
  dailyPerDay: count,
  dailyLeft: count,
  reserveLeft: count,
  /** The next midnight, Tokyo time. */
  nextRefillAt: isoTimeSchema,
  usedToday: z.array(
    z.object({
      id: z.number().int(),
      dayIndex: count,
      kind: z.enum(ticketKinds),
      /** For the ticket stubs, with its outline simplified; null until its sticker is sealed. */
      sticker: z
        .object({ id: z.string(), outline: z.string(), width: positiveInt, height: positiveInt })
        .nullable(),
    }),
  ),
});
export type Tickets = z.infer<typeof ticketsSchema>;

export const ticketShopSchema = z.object({
  packs: z.array(
    z.object({
      tickets: z.literal([1, 3, 5, 10]),
      priceYen: positiveInt,
      /** Off ¥100 per ticket. */
      discountPercent: count,
      /** The same price in JPYC base units, as decimal text: one JPYC is one yen. */
      priceJpyc: z.string().regex(/^[0-9]+$/),
    }),
  ),
  /** Where a pack is paid: the payment contract's `pay`, into its vault. */
  payment: z.object({
    network: z.enum(["testnet", "mainnet", "devnet"]),
    /** JPYC's Move type, `<package>::jpy_coin::JPY_COIN`. */
    coinType: z.string().min(1),
    /** JPYC base units per JPYC. */
    decimals: count,
    paymentPackage: suiIdSchema,
    vault: suiIdSchema,
  }),
});
export type TicketShop = z.infer<typeof ticketShopSchema>;

export const userStatsSchema = z.object({
  since: isoTimeSchema,
  made: count,
  received: count,
  given: count,
  gratitude: z.object({
    /** Your part of the combos on gifts you gave: each combo's total, less any Original Artist's share. */
    direct: count,
    /** Your Original Artist Gratitude Shares, from gifts of stickers you drew that others gave on. */
    residual: count,
    total: count,
  }),
  bests: z.object({ bestCombo: count, mostGratitudeInADay: count, longestStreak: count }),
  /** Current; a missed ticket day resets it to 0. */
  streak: count,
});
export type UserStats = z.infer<typeof userStatsSchema>;
