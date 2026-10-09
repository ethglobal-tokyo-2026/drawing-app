import { gunzipSync } from "node:zlib";
import { stickers, stickerTimelapses, type Db } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { failureCause } from "../diagnostics.ts";
import type { StickerViewer } from "../shapes.ts";

/** A timelapse's JSON, unzipped, at most: a gzip that grows past it is refused, not read. */
const MAX_TIMELAPSE_JSON_BYTES = 16 * 1024 * 1024;

/** A stroke's points: x, y and width in tenths of a unit, plus ms, each a change from the one before. */
const strokePoints = z
  .array(z.number())
  .refine((points) => points.length % 4 === 0, "expected 4 numbers per point");

/**
 * How a sticker was drawn: the ink canvas's ops, in order, as the app uploads them at seal.
 * Lengths are sheet units.
 */
export const timelapseV1Schema = z.object({
  v: z.literal(1),
  /** The sheet the ops were drawn on. */
  ink: z.tuple([z.number().positive(), z.number().positive()]),
  /** Where the sticker image sits on the sheet. */
  place: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  /** Device pixels per sheet unit where it was drawn: fills flood at it. */
  density: z.number().positive(),
  ops: z.array(
    z.union([
      z.tuple([z.enum(["brush", "eraser"]), z.string(), z.number(), strokePoints]),
      // A fill: its color, ms and tap, then the widest opening it closed, in units.
      z.tuple([
        z.literal("fill"),
        z.string(),
        z.number(),
        z.number(),
        z.number(),
        z.number().nonnegative(),
      ]),
      // A fill sealed before fills recorded their gap: it closed none.
      z.tuple([z.literal("fill"), z.string(), z.number(), z.number(), z.number()]),
    ]),
  ),
});
export type TimelapseV1 = z.infer<typeof timelapseV1Schema>;

/** A gzipped timelapse's JSON. Throws when it doesn't unzip within the limit, or isn't JSON. */
const unzippedJson = (gzipped: Uint8Array): unknown =>
  JSON.parse(gunzipSync(gzipped, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString());

/** Why an uploaded timelapse can't be read back, naming the field; null when it can. */
export function timelapseProblem(gzipped: Uint8Array): string | null {
  let json: unknown;
  try {
    json = unzippedJson(gzipped);
  } catch (error) {
    return `timelapse: ${failureCause(error)}`;
  }
  const parsed = timelapseV1Schema.safeParse(json);
  if (parsed.success) return null;
  return parsed.error.issues
    .map((issue) => `${["timelapse", ...issue.path].map(String).join(".")}: ${issue.message}`)
    .join("; ");
}

/**
 * A sticker's timelapse, or why `viewer` gets none: it shows the drawing, so a sticker veiled to them
 * is nsfw_not_opted_in. Sealing stores only one that reads, so one that doesn't throws, naming the
 * sticker.
 */
export function readTimelapse(
  db: Pick<Db, "select">,
  stickerId: string,
  viewer: Pick<StickerViewer, "veils">,
): TimelapseV1 | "sticker_not_found" | "nsfw_not_opted_in" | "timelapse_not_found" {
  const row = db
    .select({ id: stickers.id, nsfw: stickers.nsfw, ops: stickerTimelapses.ops })
    .from(stickers)
    .leftJoin(stickerTimelapses, eq(stickerTimelapses.stickerId, stickers.id))
    .where(eq(stickers.id, stickerId))
    .get();
  if (!row) return "sticker_not_found";
  if (viewer.veils(row)) return "nsfw_not_opted_in";
  if (!row.ops) return "timelapse_not_found";
  try {
    return timelapseV1Schema.parse(unzippedJson(row.ops));
  } catch (error) {
    throw new Error(`Sticker ${stickerId}'s stored timelapse can't be read`, { cause: error });
  }
}
