import {
  gifts,
  gratitude,
  GRATITUDE_PER_HIT,
  MAX_HITS,
  MAX_PEAK_MULT,
  MAX_PEAK_TIER,
  METHOD_WEIGHT,
  stickers,
} from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { apiError, invalidRequest } from "../errors.ts";
import {
  bytes32Schema,
  gratitudeSchema,
  refuse,
  toGratitude,
  type Gratitude,
  type Refusal,
} from "../shapes.ts";
import { countedTouches, gzipReplay, replayV1Schema } from "./replay.ts";

/** The part of a combo's total that goes to the Original Artist, out of the giver's part. */
export const ORIGINAL_ARTIST_GRATITUDE_SHARE = 0.2;
/**
 * The most gratitude one hit can score. The Mini-game rounds gratitude per hit × multiplier × weight;
 * this takes the multiplier's ceiling and the heaviest weight (a tap's is 1) and rounds up, so no
 * real combo scores more than its hits times this.
 */
export const MAX_GRATITUDE_PER_HIT = Math.ceil(
  GRATITUDE_PER_HIT * MAX_PEAK_MULT * Math.max(1, METHOD_WEIGHT),
);
/** The most a `keepalive` request can carry, and the Mini-game sends its combo with one. */
export const MAX_GRATITUDE_BODY_BYTES = 64 * 1024;
const MAX_GAME_CONFIG_VERSION_LENGTH = 64;

/**
 * RecordGratitude: a Mini-game combo and its replay, which must agree. `total` isn't recounted, only
 * held to the most its hits could score.
 */
export const recordGratitudeSchema = createInsertSchema(gratitude, {
  idempotencyKey: z.uuid(),
  giftId: bytes32Schema,
  hits: (schema) => schema.min(1).max(MAX_HITS),
  total: (schema) => schema.min(0),
  peakMult: (schema) => schema.min(1).max(MAX_PEAK_MULT),
  peakTier: (schema) => schema.min(0).max(MAX_PEAK_TIER),
  gameConfigVersion: (schema) => schema.min(1).max(MAX_GAME_CONFIG_VERSION_LENGTH),
})
  .pick({
    idempotencyKey: true,
    giftId: true,
    method: true,
    hits: true,
    total: true,
    peakMult: true,
    peakTier: true,
    gameConfigVersion: true,
  })
  .extend({ replay: replayV1Schema })
  .superRefine(({ hits, total }, ctx) => {
    const most = hits * MAX_GRATITUDE_PER_HIT;
    if (total > most) {
      ctx.addIssue({
        code: "custom",
        path: ["total"],
        message: `${total}, over the ${most} its hits can score at ${MAX_GRATITUDE_PER_HIT} a hit`,
      });
    }
  })
  .superRefine(({ method, hits, replay }, ctx) => {
    const report = (field: keyof typeof replay, message: string) =>
      ctx.addIssue({ code: "custom", path: ["replay", field], message });
    const counted = countedTouches(replay);
    if (method === "tap") {
      if (counted !== hits)
        report("hits", `${counted} counted touches in a tap combo of ${hits} hits`);
      if (replay.switchedAtHit !== null) {
        report("switchedAtHit", `${replay.switchedAtHit} in a tap combo, which never switched`);
      }
    } else {
      if (counted > hits) report("hits", `${counted} counted touches, more than the ${hits} hits`);
      if (replay.switchedAtHit === null) {
        report("switchedAtHit", `null in a ${method} combo, which switched from tapping`);
      } else if (replay.switchedAtHit > hits) {
        report("switchedAtHit", `${replay.switchedAtHit}, past the combo's ${hits} hits`);
      }
    }
  });
export type RecordGratitude = z.infer<typeof recordGratitudeSchema>;

/**
 * The record body's validator hook: a replay that breaks its bounds or disagrees with the body is
 * replay_invalid, and a problem in any other field is invalid_request. Both name the fields.
 */
export function replayInvalidHook(result: Parameters<typeof invalidRequest>[0], c: Context) {
  if (result.success) return undefined;
  const { issues } = result.error;
  if (issues.some((issue) => issue.path[0] !== "replay")) return invalidRequest(result, c);
  const detail = issues
    .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
    .join("; ");
  return apiError(c, 400, "replay_invalid", detail);
}

export const gratitudeResponseSchema = z.object({ gratitude: gratitudeSchema });

/** Each refusal of a combo, and its status. */
export const RECORD_REFUSAL_STATUS = {
  gift_not_found: 404,
  gift_not_received: 409,
  not_receiver: 403,
  gratitude_already_recorded: 409,
} as const satisfies Record<string, ContentfulStatusCode>;

export type Recording =
  | Refusal<keyof typeof RECORD_REFUSAL_STATUS>
  | { refusal: null; created: boolean; gratitude: Gratitude };

/** None when the Original Artist gave or received the gift: gratitude to or from them is all theirs. */
function originalArtistGratitudeShare(
  total: number,
  originalArtistId: string,
  gift: Pick<typeof gifts.$inferSelect, "giverId" | "receiverId">,
) {
  if (originalArtistId === gift.giverId || originalArtistId === gift.receiverId) return 0;
  return Math.floor(total * ORIGINAL_ARTIST_GRATITUDE_SHARE);
}

/**
 * Records a receiver's combo on the gift they received, once per gift; the same idempotencyKey again
 * gets the stored record. The database doesn't know who's recording, so the receiver check is here.
 */
export function recordGratitude(
  { db }: AppDeps,
  userId: string,
  { replay, ...combo }: RecordGratitude,
): Recording {
  const { idempotencyKey, giftId } = combo;
  return db.transaction(
    (tx): Recording => {
      const sent = tx
        .select({ gratitude, receiverId: gifts.receiverId })
        .from(gratitude)
        .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
        .where(eq(gratitude.idempotencyKey, idempotencyKey))
        .get();
      if (sent?.receiverId === userId) {
        return { refusal: null, created: false, gratitude: toGratitude(sent.gratitude) };
      }
      if (sent) {
        return refuse(
          "gratitude_already_recorded",
          `Combo ${idempotencyKey} was recorded by someone else`,
        );
      }
      const given = tx
        .select({ gift: gifts, originalArtistId: stickers.artistId })
        .from(gifts)
        .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
        .where(eq(gifts.id, giftId))
        .get();
      if (!given) return refuse("gift_not_found", `There's no gift ${giftId}`);
      const { gift, originalArtistId } = given;
      if (gift.status !== "received") {
        return refuse("gift_not_received", `Gift ${giftId} is ${gift.status}, not received`);
      }
      if (gift.receiverId !== userId) {
        return refuse("not_receiver", `Gift ${giftId} was received by someone else`);
      }
      const recorded = tx
        .select({ giftId: gratitude.giftId })
        .from(gratitude)
        .where(eq(gratitude.giftId, giftId))
        .get();
      if (recorded) {
        return refuse("gratitude_already_recorded", `Gift ${giftId} already has gratitude`);
      }
      const row = tx
        .insert(gratitude)
        .values({
          ...combo,
          originalArtistGratitudeShare: originalArtistGratitudeShare(
            combo.total,
            originalArtistId,
            gift,
          ),
          replay: gzipReplay(replay),
        })
        .returning()
        .get();
      return { refusal: null, created: true, gratitude: toGratitude(row) };
    },
    { behavior: "immediate" },
  );
}
