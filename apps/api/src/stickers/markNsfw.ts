import { stickers } from "@drawing-app/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { diagnosticStep, logInfo } from "../diagnostics.ts";
import { loadStickers, stickerSchema, stickerViewer } from "../shapes.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import { isNsfwDrawing, purgeDueDrawing } from "./nsfwDrawing.ts";

/** POST /api/stickers/:stickerId/nsfw's answer. */
export const markNsfwResponseSchema = z.object({
  /** The sticker as its Original Artist now gets it. */
  sticker: stickerSchema,
  /**
   * False when the CDN may still hold its drawing: a sticker that isn't 18+ still shows it, the
   * purge was skipped, or it failed, which the CDN purge sweep retries.
   */
  cdnPurged: z.boolean(),
});
export type MarkNsfwResponse = z.infer<typeof markNsfwResponseSchema>;

/** Why a mark was refused: the contract's status and code, and what failed. */
type MarkNsfwRefusal =
  | { status: 404; error: "sticker_not_found"; detail: string }
  | { status: 403; error: "not_original_artist"; detail: string }
  | { status: 409; error: "already_nsfw"; detail: string };

const alreadyNsfw = (stickerId: string): MarkNsfwRefusal => ({
  status: 409,
  error: "already_nsfw",
  detail: `Sticker ${stickerId} is already marked 18+`,
});

/** A mark that left its drawing public: there's nothing for the CDN to purge. */
function stillPublic(stickerId: string) {
  const reason = "a sticker that isn't 18+ shows its drawing, so its files stay public";
  logInfo("cdn.purge.skipped", { stickerId, reason });
  return false;
}

/**
 * Marks a sealed sticker 18+, for its Original Artist alone and for good: makes its veil, marks its
 * row, then purges the CDN's copies of its drawing once no sticker that isn't 18+ shows it. A gift
 * on its way may be marked, since Receiving reads the mark as it runs.
 */
export async function markStickerNsfw(
  deps: AppDeps,
  userId: string,
  stickerId: string,
): Promise<{ marked: MarkNsfwResponse } | { refused: MarkNsfwRefusal }> {
  // One mark of a sticker at a time, so a second sees the first's before it makes a veil.
  const outcome = await oneAtATime(`nsfw-mark:${stickerId}`, () =>
    markRow(deps, userId, stickerId),
  );
  if ("refused" in outcome) return outcome;
  logInfo("sticker.nsfw.marked", { stickerId, userId });

  const cdnPurged = outcome.madePrivate
    ? await purgeDueDrawing(deps, stickerId, outcome.contentHash)
    : stillPublic(stickerId);
  const sticker = loadStickers(deps.db, [stickerId], stickerViewer(deps, userId)).get(stickerId);
  if (!sticker) throw new Error(`Sticker ${stickerId} lost its row right after its mark`);
  return { marked: { sticker, cdnPurged } };
}

/**
 * The mark's checks, its veil, then its row, with the CDN purge it makes due when no other sticker
 * that isn't 18+ shows its drawing.
 */
async function markRow(
  deps: AppDeps,
  userId: string,
  stickerId: string,
): Promise<{ refused: MarkNsfwRefusal } | { contentHash: string; madePrivate: boolean }> {
  const { db } = deps;
  const row = db
    .select({ artistId: stickers.artistId, nsfw: stickers.nsfw, contentHash: stickers.contentHash })
    .from(stickers)
    .where(eq(stickers.id, stickerId))
    .get();
  if (!row) {
    return {
      refused: { status: 404, error: "sticker_not_found", detail: `No sticker ${stickerId}` },
    };
  }
  if (row.artistId !== userId) {
    const detail = `Only sticker ${stickerId}'s Original Artist can mark it 18+`;
    return { refused: { status: 403, error: "not_original_artist", detail } };
  }
  if (row.nsfw) return { refused: alreadyNsfw(stickerId) };

  // What anyone without the NSFW opt-in sees in its place, made before the row names it.
  const veiledHash = await diagnosticStep("sticker.veil.save", { stickerId, userId }, () =>
    deps.images.saveVeiled(row.contentHash),
  );
  // Guarded, since a write outside this turn can still mark it while the veil is made. The purge it
  // makes due commits with it, so a restart can't lose the purge.
  const marked = db.transaction(
    (tx) => {
      const updated = tx
        .update(stickers)
        .set({ nsfw: true, veiledHash })
        .where(and(eq(stickers.id, stickerId), eq(stickers.nsfw, false)))
        .returning({ id: stickers.id })
        .get();
      if (!updated) return null;
      const madePrivate = isNsfwDrawing(tx, row.contentHash);
      if (madePrivate) {
        tx.update(stickers)
          .set({ cdnPurgeDueAt: deps.clock.now() })
          .where(eq(stickers.id, stickerId))
          .run();
      }
      return { madePrivate };
    },
    { behavior: "immediate" },
  );
  if (!marked) return { refused: alreadyNsfw(stickerId) };
  return { contentHash: row.contentHash, madePrivate: marked.madePrivate };
}
