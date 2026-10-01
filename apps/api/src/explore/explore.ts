import { gifts, stickers, users, type Db } from "@drawing-app/db";
import { desc, eq, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import {
  isoTimeSchema,
  personSchema,
  stickerLookup,
  stickerSchema,
  toIsoTime,
  toPerson,
  type Sticker,
  type StickerViewer,
} from "../shapes.ts";
import { tokyoTicketDay, tokyoTicketDayStart } from "../ticketDays.ts";
import { leaderboardsSchema, loadLeaderboards } from "./leaderboards.ts";

/** The most stickers today's stickers lists, and the most entries the activity feed lists. */
export const EXPLORE_LIST_SIZE = 50;

const activityEntrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sealed"), at: isoTimeSchema, sticker: stickerSchema }),
  z.object({
    type: z.literal("received"),
    at: isoTimeSchema,
    sticker: stickerSchema,
    giver: personSchema,
    receiver: personSchema,
  }),
]);
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const exploreSchema = z.object({
  /** Sealed since today's ticket day began, newest first. */
  todaysStickers: z.array(stickerSchema),
  /** Seals and receives, newest first. */
  activity: z.array(activityEntrySchema),
  leaderboards: leaderboardsSchema,
});
export type Explore = z.infer<typeof exploreSchema>;

function todaysStickers(db: Db, todayStart: Date, viewer: StickerViewer): Sticker[] {
  const ids = db
    .select({ id: stickers.id })
    .from(stickers)
    .where(gte(stickers.createdAt, todayStart))
    .orderBy(desc(stickers.createdAt), desc(stickers.number))
    .limit(EXPLORE_LIST_SIZE)
    .all()
    .map(({ id }) => id);
  const stickerOf = stickerLookup(db, ids, viewer);
  return ids.map((id) => stickerOf(id));
}

/** The newest seals and the newest receives, merged newest first. */
function activity(db: Db, viewer: StickerViewer): ActivityEntry[] {
  const seals = db
    .select({ stickerId: stickers.id, at: stickers.createdAt })
    .from(stickers)
    .orderBy(desc(stickers.createdAt), desc(stickers.number))
    .limit(EXPLORE_LIST_SIZE)
    .all()
    .map((seal) => ({ type: "sealed" as const, ...seal }));
  const givers = alias(users, "giver");
  const receivers = alias(users, "receiver");
  const receives = db
    .select({
      giftId: gifts.id,
      stickerId: gifts.stickerId,
      at: gifts.receivedAt,
      giver: givers,
      receiver: receivers,
    })
    .from(gifts)
    .innerJoin(givers, eq(givers.id, gifts.giverId))
    .innerJoin(receivers, eq(receivers.id, gifts.receiverId))
    .where(eq(gifts.status, "received"))
    .orderBy(desc(gifts.receivedAt))
    .limit(EXPLORE_LIST_SIZE)
    .all()
    .map(({ giftId, stickerId, at, giver, receiver }) => {
      if (at === null) throw new Error(`Gift ${giftId} is received but has no received_at`);
      return {
        type: "received" as const,
        stickerId,
        at,
        giver: toPerson(giver),
        receiver: toPerson(receiver),
      };
    });

  const newest = [...seals, ...receives]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, EXPLORE_LIST_SIZE);
  const stickerOf = stickerLookup(
    db,
    newest.map((event) => event.stickerId),
    viewer,
  );
  return newest.map((event) =>
    event.type === "sealed"
      ? { type: event.type, at: toIsoTime(event.at), sticker: stickerOf(event.stickerId) }
      : {
          type: event.type,
          at: toIsoTime(event.at),
          sticker: stickerOf(event.stickerId),
          giver: event.giver,
          receiver: event.receiver,
        },
  );
}

/** Explore as it stands at `now`. */
export function loadExplore(db: Db, now: Date, viewer: StickerViewer): Explore {
  return {
    todaysStickers: todaysStickers(db, tokyoTicketDayStart(tokyoTicketDay(now)), viewer),
    activity: activity(db, viewer),
    leaderboards: loadLeaderboards(db, now),
  };
}
