import { gifts, gratitude, stickers, stickerTimelapses, users, type Db } from "@drawing-app/db";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  giftSchema,
  gratitudeSchema,
  isoTimeSchema,
  loadStickers,
  personSchema,
  stickerSchema,
  toGratitude,
  toIsoTime,
  toPerson,
  type StickerImages,
} from "../shapes.ts";

/** Sticker ids aren't format-checked: an unknown one is sticker_not_found. */
export const stickerIdParam = z.object({ stickerId: createSelectSchema(stickers).shape.id });

const transferTrailEntrySchema = z.object({
  giftId: giftSchema.shape.id,
  giver: personSchema,
  receiver: personSchema,
  receivedAt: isoTimeSchema,
  gratitude: gratitudeSchema.nullable(),
});
export type TransferTrailEntry = z.infer<typeof transferTrailEntrySchema>;

/** GET /api/stickers/:stickerId's answer. */
export const stickerDetailSchema = z.object({
  sticker: stickerSchema,
  /** Who holds it now. */
  owner: personSchema,
  /** Newest first. */
  transferTrail: z.array(transferTrailEntrySchema),
  /** Sealed with its timelapse: GET /api/stickers/:stickerId/timelapse answers it. */
  hasTimelapse: z.boolean(),
});
export type StickerDetail = z.infer<typeof stickerDetailSchema>;

/** A sticker with who holds it and its Transfer Trail; null for an unknown sticker. */
export function stickerDetail(
  db: Db,
  stickerId: string,
  urls: (contentHash: string) => StickerImages,
): StickerDetail | null {
  const sticker = loadStickers(db, [stickerId], urls).get(stickerId);
  if (!sticker) return null;
  const owner = db.select().from(users).where(eq(users.id, sticker.ownerId)).get();
  if (!owner) throw new Error(`Sticker ${stickerId}'s owner ${sticker.ownerId} has no users row`);

  const giverUsers = alias(users, "giver");
  const receiverUsers = alias(users, "receiver");
  const received = db
    .select({ gift: gifts, giver: giverUsers, receiver: receiverUsers, combo: gratitude })
    .from(gifts)
    .innerJoin(giverUsers, eq(giverUsers.id, gifts.giverId))
    .innerJoin(receiverUsers, eq(receiverUsers.id, gifts.receiverId))
    .leftJoin(gratitude, eq(gratitude.giftId, gifts.id))
    // A returned gift's receive didn't hold, so only received gifts are on the trail.
    .where(and(eq(gifts.stickerId, stickerId), eq(gifts.status, "received")))
    .orderBy(desc(gifts.receivedAt))
    .all();
  const transferTrail = received.flatMap(({ gift, giver, receiver, combo }) =>
    // Every received gift has its received_at; this narrows the type.
    gift.receivedAt === null
      ? []
      : [
          {
            giftId: gift.id,
            giver: toPerson(giver),
            receiver: toPerson(receiver),
            receivedAt: toIsoTime(gift.receivedAt),
            gratitude: combo ? toGratitude(combo) : null,
          },
        ],
  );
  const timelapse = db
    .select({ stickerId: stickerTimelapses.stickerId })
    .from(stickerTimelapses)
    .where(eq(stickerTimelapses.stickerId, stickerId))
    .get();
  return {
    sticker,
    owner: toPerson(owner),
    transferTrail,
    hasTimelapse: timelapse !== undefined,
  };
}
