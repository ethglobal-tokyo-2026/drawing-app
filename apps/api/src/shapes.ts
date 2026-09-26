import { escrowStatuses, giftStatuses, users } from "@drawing-app/db";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/** A moment as the API sends it: an ISO 8601 UTC string. */
export const isoTimeSchema = z.iso.datetime();
export type IsoTime = z.infer<typeof isoTimeSchema>;

/** A database time as the API sends it. */
export function toIsoTime(date: Date): IsoTime;
export function toIsoTime(date: Date | null): IsoTime | null;
export function toIsoTime(date: Date | null): IsoTime | null {
  return date === null ? null : date.toISOString();
}

/** Gift ids, content hashes and transaction hashes: lowercase 0x-prefixed 32-byte hex. */
export const bytes32Schema = z.string().regex(/^0x[0-9a-f]{64}$/);

const count = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

const userRow = createSelectSchema(users);
type UserRow = typeof users.$inferSelect;

/** Anyone, as other signed-in people see them. */
export const personSchema = userRow.pick({
  id: true,
  handle: true,
  lineDisplayName: true,
  linePictureUrl: true,
});
export type Person = z.infer<typeof personSchema>;

/** Picks the public columns, so LINE's user ID and the smart wallet never reach other people. */
export const toPerson = ({
  id,
  handle,
  lineDisplayName,
  linePictureUrl,
}: Pick<UserRow, keyof Person>): Person => ({ id, handle, lineDisplayName, linePictureUrl });

/** You. */
export const meSchema = personSchema.extend({
  timeZone: userRow.shape.timeZone,
  /** The stat board's "Since". */
  createdAt: isoTimeSchema,
  /** True until the handle prompt is answered. */
  needsHandle: z.boolean(),
  /** NEW in your sticker tray. */
  newStickerCount: count,
  /** The pink tag. */
  unseenGratitudeCount: count,
});
export type Me = z.infer<typeof meSchema>;

export const toMe = (
  user: UserRow,
  counts: Pick<Me, "newStickerCount" | "unseenGratitudeCount">,
): Me => ({
  ...toPerson(user),
  timeZone: user.timeZone,
  createdAt: toIsoTime(user.createdAt),
  needsHandle: user.handle === null,
  ...counts,
});

/** A sticker's five files on the CDN, named by its content hash. */
export const stickerImagesSchema = z.object({
  png: z.url(),
  mask: z.url(),
  spec: z.url(),
  rim: z.url(),
  flat: z.url(),
});
export type StickerImages = z.infer<typeof stickerImagesSchema>;

export const giftStatusSchema = z.enum(giftStatuses);
export type GiftStatus = z.infer<typeof giftStatusSchema>;

/** StickerGiftEscrow's GiftStatus. */
export const escrowStatusSchema = z.enum(escrowStatuses);
export type EscrowStatus = z.infer<typeof escrowStatusSchema>;

/** Sent from the giver's smart wallet to move the sticker into the escrow. */
export const escrowTransferSchema = z.object({
  /** The StickerNFT contract. */
  to: z.string(),
  /** Calldata. */
  data: z.string(),
});
export type EscrowTransfer = z.infer<typeof escrowTransferSchema>;

// Sticker, StickerPlacement, Gift and Gratitude are built from their tables in views.ts.

export const ticketsSchema = z.object({
  /** From 4:00 in your zone. */
  ticketDay: z.iso.date(),
  freePerDay: count,
  freeLeft: count,
  paidLeft: count,
  nextRefillAt: isoTimeSchema,
  usedToday: z.array(
    z.object({
      id: z.number().int(),
      dayIndex: count,
      /** For the ticket stubs; null until its sticker is sealed. */
      sticker: z
        .object({ id: z.string(), outline: z.string(), width: positiveInt, height: positiveInt })
        .nullable(),
    }),
  ),
  packs: z.array(z.object({ tickets: z.literal([1, 3, 5, 10]), priceYen: positiveInt })),
});
export type Tickets = z.infer<typeof ticketsSchema>;

export const userStatsSchema = z.object({
  since: isoTimeSchema,
  made: count,
  received: count,
  given: count,
  gratitude: z.object({
    /** Your part of tap combos on gifts you gave. */
    inspired: count,
    /** Your part of stroke and shake combos. */
    magic: count,
    /** Original Artist Gratitude Shares. */
    asOriginalArtist: count,
    total: count,
  }),
  bests: z.object({ bestCombo: count, mostThanksInADay: count, longestStreak: count }),
  /** Current; a missed ticket day resets it to 0. */
  streak: count,
});
export type UserStats = z.infer<typeof userStatsSchema>;
