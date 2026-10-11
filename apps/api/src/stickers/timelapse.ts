import { gunzipSync, gzipSync } from "node:zlib";
import {
  stickers,
  stickerTimelapses,
  normalizeTimelapse,
  uploadedTimelapseSchema,
  timelapseV4Schema,
  MAX_TIMELAPSE_JSON_BYTES,
  type TimelapseV4,
  type Db,
} from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { describeIssues, failureCause } from "../diagnostics.ts";
import type { StickerViewer } from "../shapes.ts";
export { timelapseV4Schema, type TimelapseV4 } from "@drawing-app/db";

/**
 * GET /api/stickers/:stickerId/timelapse's query: the version the app reads. It's in the URL, so a
 * browser never takes a timelapse it cached, immutable, in another version.
 */
export const timelapseQuery = z.object({ format: z.enum(["1", "2", "3", "4"]) });

/** A gzipped timelapse's JSON. Throws when it doesn't unzip within the limit, or isn't JSON. */
const unzippedJson = (gzipped: Uint8Array): unknown =>
  JSON.parse(gunzipSync(gzipped, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString());

/**
 * An uploaded timelapse as it's stored, gzipped v4: as sent, or converted from v1/v2/v3. Or why it can't
 * be read back, naming the field.
 */
export function timelapseToStore(
  gzipped: Buffer,
): { stored: Buffer; originalVersion: 1 | 2 | 3 | 4 } | { problem: string } {
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
  if (parsed.data.v === 4) return { stored: gzipped, originalVersion: 4 };
  let normalized: TimelapseV4;
  try {
    normalized = normalizeTimelapse(parsed.data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return { problem: describeIssues(error.issues, { under: "timelapse" }) };
    throw error;
  }
  return {
    stored: gzipSync(JSON.stringify(normalized)),
    originalVersion: parsed.data.v,
  };
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
): TimelapseV4 | "sticker_not_found" | "nsfw_not_opted_in" | "timelapse_not_found" {
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
    return timelapseV4Schema.parse(unzippedJson(row.ops));
  } catch (error) {
    throw new Error(`Sticker ${stickerId}'s stored timelapse can't be read`, { cause: error });
  }
}
