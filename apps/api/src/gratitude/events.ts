import { gifts, gratitude, stickers, users, type Db } from "@drawing-app/db";
import { and, desc, eq, gt, lt, ne, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gratitudeParts } from "../gratitudeParts.ts";
import {
  bytes32Schema,
  isoTimeSchema,
  personSchema,
  stickerLookup,
  stickerSchema,
  toIsoTime,
  toPerson,
  type StickerViewer,
} from "../shapes.ts";

// The gratitude you've received, combo by combo: as the gift's giver (Direct) and as its sticker's
// Original Artist (Residual), newest first, a page at a time.

/** How many events one page lists. */
export const GRATITUDE_EVENTS_PAGE = 30;

/** Where the next page starts: the last event's recorded time in ms, then its gift id. */
const cursorSchema = z.string().regex(/^\d+\.0x[0-9a-f]{64}$/);

/** GET /api/gratitude/events' query: `before` is the last page's `next`. */
export const gratitudeEventsQuerySchema = z.object({ before: cursorSchema.optional() });

const gratitudeEventSchema = z.object({
  giftId: bytes32Schema,
  sticker: stickerSchema,
  /** Who sent it: the gift's receiver, who played the Mini-game. */
  from: personSchema,
  /** Direct, as the gift's giver, or Residual: your Original Artist Gratitude Share. */
  part: z.enum(["direct", "residual"]),
  amount: z.number().int().nonnegative(),
  recordedAt: isoTimeSchema,
});

/** GET /api/gratitude/events' answer. */
export const gratitudeEventsSchema = z.object({
  /** Newest first. */
  events: z.array(gratitudeEventSchema),
  /** `before` for the next page; null on the last. */
  next: cursorSchema.nullable(),
});
export type GratitudeEvents = z.infer<typeof gratitudeEventsSchema>;

/** One page of the combos that gave `userId` gratitude, older than `before` when it's given. */
export function gratitudeEvents(
  db: Db,
  userId: string,
  viewer: StickerViewer,
  before?: string,
): GratitudeEvents {
  const [at, lastGiftId] = before?.split(".") ?? [];
  const after =
    at && lastGiftId
      ? or(
          lt(gratitude.createdAt, new Date(Number(at))),
          and(eq(gratitude.createdAt, new Date(Number(at))), lt(gratitude.giftId, lastGiftId)),
        )
      : undefined;
  // A page and one more from each side, so the merged page knows whether another follows. A select
  // for each side, as User Stats' are, since an OR across both can't use either index.
  const page = (side: SQL | undefined) =>
    db
      .select({
        combo: gratitude,
        stickerId: gifts.stickerId,
        giverId: gifts.giverId,
        artistId: stickers.artistId,
        sender: users,
      })
      .from(gratitude)
      .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
      .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
      .innerJoin(users, eq(users.id, gifts.receiverId))
      .where(and(side, after))
      .orderBy(desc(gratitude.createdAt), desc(gratitude.giftId))
      .limit(GRATITUDE_EVENTS_PAGE + 1)
      .all();
  const rows = [
    ...page(eq(gifts.giverId, userId)),
    // The giver's own sticker shares nothing, and a combo with no share gives its artist nothing.
    ...page(
      and(
        eq(stickers.artistId, userId),
        ne(gifts.giverId, userId),
        gt(gratitude.originalArtistGratitudeShare, 0),
      ),
    ),
  ].sort(
    (a, b) =>
      b.combo.createdAt.getTime() - a.combo.createdAt.getTime() ||
      (a.combo.giftId < b.combo.giftId ? 1 : -1),
  );
  const shown = rows.slice(0, GRATITUDE_EVENTS_PAGE);
  const stickerOf = stickerLookup(
    db,
    shown.map(({ stickerId }) => stickerId),
    viewer,
  );
  const last = shown.at(-1);
  return {
    events: shown.map(({ combo, stickerId, giverId, artistId, sender }) => {
      const parts = gratitudeParts({
        giverId,
        artistId,
        total: combo.total,
        share: combo.originalArtistGratitudeShare,
      });
      // Every row was selected as their gift or their sticker, so a row without their part is a fault.
      const mine = parts.find(({ personId }) => personId === userId);
      if (!mine) throw new Error(`Gift ${combo.giftId}'s gratitude has no part for ${userId}`);
      return {
        giftId: combo.giftId,
        sticker: stickerOf(stickerId),
        from: toPerson(sender),
        part: mine.part,
        amount: mine.value,
        recordedAt: toIsoTime(combo.createdAt),
      };
    }),
    next:
      rows.length > GRATITUDE_EVENTS_PAGE && last
        ? `${last.combo.createdAt.getTime()}.${last.combo.giftId}`
        : null,
  };
}
