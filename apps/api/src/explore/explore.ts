import { gifts, stickers, users, type Db } from "@drawing-app/db";
import { and, desc, eq, inArray, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import {
  personSchema,
  stickerLookup,
  stickerSchema,
  toPerson,
  type Person,
  type StickerViewer,
} from "../shapes.ts";
import { leaderboardsSchema, loadLeaderboards } from "./leaderboards.ts";

/** The most stickers a page of the pile holds. */
export const PILE_PAGE_SIZE = 50;

/**
 * Where an older page of the pile starts: the seal, in ms since 1970, and the number of the sticker
 * the page before ended on. Fifteen digits stay within a safe integer and a valid date.
 */
const pileCursorSchema = z
  .string()
  .regex(/^[0-9]{1,15}-[0-9]{1,15}$/, "a cursor, as a page's `before` gives it");

interface PileCursor {
  sealedAt: Date;
  number: number;
}

const toCursor = ({ sealedAt, number }: PileCursor) => `${sealedAt.getTime()}-${number}`;

/** GET /api/explore/pile's query: the page older than `before`. */
export const pileQuerySchema = z.object({
  before: pileCursorSchema.transform((cursor): PileCursor => {
    const [ms, number] = cursor.split("-").map(Number);
    return { sealedAt: new Date(ms), number };
  }),
});

const pileStickerSchema = z.object({
  sticker: stickerSchema,
  /** Who it was last given to; null if it never was. */
  givenTo: personSchema.nullable(),
});
export type PileSticker = z.infer<typeof pileStickerSchema>;

export const pilePageSchema = z.object({
  /** Newest first, by seal and then by number, so stickers sealed in the same moment keep an order. */
  stickers: z.array(pileStickerSchema),
  /** Where the next, older page starts; null once nothing's older. */
  before: pileCursorSchema.nullable(),
});
export type PilePage = z.infer<typeof pilePageSchema>;

export const exploreSchema = z.object({
  /** The pile's first page: the newest stickers. */
  pile: pilePageSchema,
  leaderboards: leaderboardsSchema,
});
export type Explore = z.infer<typeof exploreSchema>;

/** Whoever each sticker was last given to, for the ones that were given. */
function lastReceivers(db: Db, stickerIds: string[]): Map<string, Person> {
  if (stickerIds.length === 0) return new Map();
  const received = db
    .select({ stickerId: gifts.stickerId, receiver: users })
    .from(gifts)
    .innerJoin(users, eq(users.id, gifts.receiverId))
    .where(and(inArray(gifts.stickerId, stickerIds), eq(gifts.status, "received")))
    .orderBy(desc(gifts.receivedAt))
    .all();
  const last = new Map<string, Person>();
  // Newest first, so the first gift met for a sticker is its latest.
  for (const { stickerId, receiver } of received) {
    if (!last.has(stickerId)) last.set(stickerId, toPerson(receiver));
  }
  return last;
}

/** A page of the pile: the newest stickers, or those sealed before `before`. */
export function loadPilePage(db: Db, viewer: StickerViewer, before?: PileCursor): PilePage {
  const rows = db
    .select({ id: stickers.id, sealedAt: stickers.createdAt, number: stickers.number })
    .from(stickers)
    // (created_at, number) < before's, spelled so stickers_created bounds the scan.
    .where(
      before &&
        and(
          lte(stickers.createdAt, before.sealedAt),
          or(lt(stickers.createdAt, before.sealedAt), lt(stickers.number, before.number)),
        ),
    )
    .orderBy(desc(stickers.createdAt), desc(stickers.number))
    .limit(PILE_PAGE_SIZE + 1)
    .all();
  const page = rows.slice(0, PILE_PAGE_SIZE);
  const ids = page.map(({ id }) => id);
  const stickerOf = stickerLookup(db, ids, viewer);
  const givenTo = lastReceivers(db, ids);
  const last = page.at(-1);
  return {
    stickers: ids.map((id) => ({ sticker: stickerOf(id), givenTo: givenTo.get(id) ?? null })),
    before: rows.length > PILE_PAGE_SIZE && last ? toCursor(last) : null,
  };
}

/** Explore as it stands at `now`. */
export function loadExplore(db: Db, now: Date, viewer: StickerViewer): Explore {
  return { pile: loadPilePage(db, viewer), leaderboards: loadLeaderboards(db, now) };
}
