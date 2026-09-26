import { escrowStatuses, giftStatuses, ticketKinds, users } from "@drawing-app/db";
import { personEnsName } from "@drawing-app/sticker-chain/croquis-names";
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
export const personSchema = userRow
  .pick({
    id: true,
    handle: true,
    lineDisplayName: true,
    linePictureUrl: true,
  })
  .extend({
    /** <label>.croquis.eth, which resolves from the moment they have a label. */
    ensName: z.string().nullable(),
  });
export type Person = z.infer<typeof personSchema>;

/** Picks the public columns, so LINE's user ID and the smart wallet never reach other people. */
export const toPerson = ({
  id,
  handle,
  lineDisplayName,
  linePictureUrl,
  ensLabel,
}: Pick<UserRow, "id" | "handle" | "lineDisplayName" | "linePictureUrl" | "ensLabel">): Person => ({
  id,
  handle,
  lineDisplayName,
  linePictureUrl,
  ensName: ensLabel === null ? null : personEnsName(ensLabel),
});

/** You. */
export const meSchema = personSchema.extend({
  timeZone: userRow.shape.timeZone,
  language: userRow.shape.language,
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
  language: user.language,
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
      /** For the ticket stubs; null until its sticker is sealed. */
      sticker: z
        .object({ id: z.string(), outline: z.string(), width: positiveInt, height: positiveInt })
        .nullable(),
    }),
  ),
});
export type Tickets = z.infer<typeof ticketsSchema>;

export const ticketQuoteSchema = z.object({
  /** Yen per SUI, the 5-minute time-weighted average, as decimal text. */
  suiYen: z.string().regex(/^[0-9]+(\.[0-9]+)?$/),
  quotedAt: isoTimeSchema,
  /** A purchase counts only at a quote that still holds. */
  expiresAt: isoTimeSchema,
  packs: z.array(
    z.object({
      tickets: z.literal([1, 3, 5, 10]),
      priceYen: positiveInt,
      /** Off ¥100 per ticket. */
      discountPercent: count,
      /** Decimal MIST, rounded up. */
      priceMist: z.string().regex(/^[0-9]+$/),
    }),
  ),
});
export type TicketQuote = z.infer<typeof ticketQuoteSchema>;

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
  bests: z.object({ bestCombo: count, mostGratitudeInADay: count, longestStreak: count }),
  /** Current; a missed ticket day resets it to 0. */
  streak: count,
});
export type UserStats = z.infer<typeof userStatsSchema>;
