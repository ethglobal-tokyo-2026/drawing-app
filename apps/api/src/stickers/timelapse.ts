import { gunzipSync } from "node:zlib";
import { stickers, stickerTimelapses, type Db } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

/** A timelapse's JSON, unzipped, at most: a gzip that grows past it is refused, not read. */
export const MAX_TIMELAPSE_JSON_BYTES = 16 * 1024 * 1024;

/** A stroke's points: x, y and width in tenths of a pixel, plus ms, each a change from the point before. */
const strokePoints = z
  .array(z.number())
  .refine((points) => points.length % 4 === 0, "expected 4 numbers per point");

/**
 * How a sticker was drawn: the ink canvas's ops, in order, as the app uploads them at seal.
 * Lengths are sheet pixels.
 */
export const timelapseV1Schema = z.object({
  v: z.literal(1),
  /** The sheet the ops were drawn on. */
  ink: z.tuple([z.number().positive(), z.number().positive()]),
  /** Where the sticker image sits on the sheet. */
  place: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  ops: z.array(
    z.union([
      z.tuple([z.enum(["brush", "eraser"]), z.string(), z.number(), strokePoints]),
      z.tuple([z.literal("fill"), z.string(), z.number(), z.number(), z.number()]),
    ]),
  ),
});
export type TimelapseV1 = z.infer<typeof timelapseV1Schema>;

/**
 * A sticker's timelapse, or why there's none. The stored bytes are the app's upload, unchecked at
 * seal, so one that isn't a timelapse throws, naming the sticker.
 */
export function readTimelapse(
  db: Pick<Db, "select">,
  stickerId: string,
): TimelapseV1 | "sticker_not_found" | "timelapse_not_found" {
  const row = db
    .select({ id: stickers.id, ops: stickerTimelapses.ops })
    .from(stickers)
    .leftJoin(stickerTimelapses, eq(stickerTimelapses.stickerId, stickers.id))
    .where(eq(stickers.id, stickerId))
    .get();
  if (!row) return "sticker_not_found";
  if (!row.ops) return "timelapse_not_found";
  try {
    const json = gunzipSync(row.ops, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString();
    return timelapseV1Schema.parse(JSON.parse(json));
  } catch (error) {
    throw new Error(`Sticker ${stickerId}'s stored timelapse can't be read`, { cause: error });
  }
}
