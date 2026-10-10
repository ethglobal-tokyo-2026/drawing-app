import { gunzipSync, gzipSync } from "node:zlib";
import { stickers, stickerTimelapses, timelapseV1ToV2, type Db } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { describeIssues, failureCause } from "../diagnostics.ts";
import type { StickerViewer } from "../shapes.ts";
import { MAX_LAYERS } from "./timelapseLimit.ts";

/** A timelapse's JSON, unzipped, at most: a gzip that grows past it is refused, not read. */
const MAX_TIMELAPSE_JSON_BYTES = 16 * 1024 * 1024;

/** A stroke's points: x, y and width in tenths of a unit, plus ms, each a change from the one before. */
const strokePoints = z
  .array(z.number())
  .refine((points) => points.length % 4 === 0, "expected 4 numbers per point");

/**
 * A timelapse from before timelapses recorded layers, all on one: what a page loaded before then
 * still uploads, and sealing converts to v2.
 */
const timelapseV1Schema = z.object({
  v: z.literal(1),
  ink: z.tuple([z.number().positive(), z.number().positive()]),
  place: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  density: z.number().positive(),
  ops: z.array(
    z.union([
      z.tuple([z.enum(["brush", "eraser"]), z.string(), z.number(), strokePoints]),
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

const layerId = z.number().int().min(1);
const at = z.number().int().nonnegative();

/**
 * How a sticker was drawn: the layers where its timelapse starts, then every step from there, marks
 * and changes to the layers, in order, as the app uploads them at seal. Lengths are sheet units.
 */
export const timelapseV2Schema = z.object({
  v: z.literal(2),
  /** The sheet the ops were drawn on. */
  ink: z.tuple([z.number().positive(), z.number().positive()]),
  /** Where the sticker image sits on the sheet. */
  place: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  /** Device pixels per sheet unit where it was drawn: fills flood at it. */
  density: z.number().positive(),
  /** The layers where the timelapse starts, back to front: number, opacity, locked, clipped. */
  layers: z
    .array(z.tuple([layerId, z.number().int().min(0).max(100), z.boolean(), z.boolean()]))
    .min(1)
    .max(MAX_LAYERS),
  ops: z.array(
    z.union([
      z.tuple([z.enum(["brush", "eraser"]), layerId, z.string(), z.number(), strokePoints]),
      // A fill: its color, ms and tap, then the widest opening it closed, in units.
      z.tuple([
        z.literal("fill"),
        layerId,
        z.string(),
        z.number(),
        z.number(),
        z.number(),
        z.number().nonnegative(),
      ]),
      z.tuple([z.literal("clear"), layerId, z.number()]),
      // `at` and `move`'s `to`: the layer's place from the back.
      z.tuple([z.literal("add"), layerId, z.number(), at]),
      z.tuple([z.literal("delete"), layerId, z.number()]),
      z.tuple([z.literal("move"), layerId, z.number(), at]),
      z.tuple([z.literal("opacity"), layerId, z.number(), z.number().int().min(0).max(100)]),
      z.tuple([z.literal("lock"), layerId, z.number(), z.boolean()]),
      z.tuple([z.literal("clip"), layerId, z.number(), z.boolean()]),
    ]),
  ),
});
export type TimelapseV2 = z.infer<typeof timelapseV2Schema>;

/**
 * GET /api/stickers/:stickerId/timelapse's query: the version the app reads. It's in the URL, so a
 * browser never takes a timelapse it cached, immutable, in another version.
 */
export const timelapseQuery = z.object({ format: z.literal("2") });

/** An upload's timelapse by its `v`, so a refusal names the fields of the version it says it is. */
const uploadedTimelapseSchema = z.discriminatedUnion("v", [timelapseV1Schema, timelapseV2Schema]);

/** A gzipped timelapse's JSON. Throws when it doesn't unzip within the limit, or isn't JSON. */
const unzippedJson = (gzipped: Uint8Array): unknown =>
  JSON.parse(gunzipSync(gzipped, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString());

/**
 * An uploaded timelapse as it's stored, gzipped v2: as sent, or converted from v1. Or why it can't
 * be read back, naming the field.
 */
export function timelapseToStore(
  gzipped: Buffer,
): { stored: Buffer; fromV1: boolean } | { problem: string } {
  let json: unknown;
  try {
    json = unzippedJson(gzipped);
  } catch (error) {
    return { problem: `timelapse: ${failureCause(error)}` };
  }
  const parsed = uploadedTimelapseSchema.safeParse(json);
  if (!parsed.success) {
    return { problem: describeIssues(parsed.error.issues, { under: "timelapse" }) };
  }
  if (parsed.data.v === 2) return { stored: gzipped, fromV1: false };
  // A page loaded before timelapses recorded layers sends v1, which sealing logs as
  // sticker.timelapse.v1_converted. This bridge goes once the server log shows none.
  const converted = timelapseV2Schema.parse(timelapseV1ToV2(parsed.data));
  return { stored: gzipSync(JSON.stringify(converted)), fromV1: true };
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
): TimelapseV2 | "sticker_not_found" | "nsfw_not_opted_in" | "timelapse_not_found" {
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
    return timelapseV2Schema.parse(unzippedJson(row.ops));
  } catch (error) {
    throw new Error(`Sticker ${stickerId}'s stored timelapse can't be read`, { cause: error });
  }
}
