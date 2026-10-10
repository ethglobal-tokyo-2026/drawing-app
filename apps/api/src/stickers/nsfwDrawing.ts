import { stickers, type Db } from "@drawing-app/db";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import type { Schedule } from "../midnightJob.ts";
import { startRepeatingJob } from "../repeatingJob.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";

/** Between the sweeps that retry the CDN purges still due. */
export const CDN_PURGE_SWEEP_EVERY_MS = 5 * 60_000;

type PurgeDeps = Pick<AppDeps, "db" | "clock" | "cdnPurge" | "images">;

/**
 * Whether the files that show a drawing are only for the NSFW opt-in: some sticker sealed with its
 * content hash is NSFW, and none that isn't. Anyone can seal a copy of a public PNG, so marking the
 * copy never hides the drawing another sticker shows; nor a veil, which everyone without the opt-in
 * sees.
 */
export function isNsfwDrawing(db: Pick<Db, "select">, contentHash: string): boolean {
  const marks = db
    .select({ nsfw: stickers.nsfw })
    .from(stickers)
    .where(eq(stickers.contentHash, contentHash))
    .all();
  if (marks.length === 0 || !marks.every(({ nsfw }) => nsfw)) return false;
  const veil = db
    .select({ id: stickers.id })
    .from(stickers)
    .where(eq(stickers.veiledHash, contentHash))
    .get();
  return veil === undefined;
}

/** Whether a purge of the drawing's files is due, on any sticker that shows it. */
const purgeIsDue = (db: Db, contentHash: string) =>
  db
    .select({ id: stickers.id })
    .from(stickers)
    .where(and(eq(stickers.contentHash, contentHash), isNotNull(stickers.cdnPurgeDueAt)))
    .get() !== undefined;

/**
 * Purges the CDN's copies of each file that shows a drawing whose purge is due: the mark that made
 * it private runs it, and the sweep retries it. A drawing's purges run one at a time, and each
 * clears only what was due when it began, once both its passes are done. True once purged, or no
 * longer due; false without a CDN to purge or when the purge failed, which leaves it due.
 */
export function purgeDueDrawing(
  { db, clock, cdnPurge, images }: PurgeDeps,
  stickerId: string,
  contentHash: string,
): Promise<boolean> {
  if (!cdnPurge) {
    logInfo("cdn.purge.skipped", { stickerId, reason: "no Fastly settings" });
    return Promise.resolve(false);
  }
  return oneAtATime(`cdn-purge:${contentHash}`, async () => {
    if (!purgeIsDue(db, contentHash)) return true;
    const began = clock.now();
    if (!(await cdnPurge.purge(images.drawingUrls(contentHash)))) return false;
    db.update(stickers)
      .set({ cdnPurgeDueAt: null })
      .where(and(eq(stickers.contentHash, contentHash), lte(stickers.cdnPurgeDueAt, began)))
      .run();
    return true;
  });
}

/** Each drawing whose purge is due, with the first sticker whose mark made it so. */
function dueDrawings(db: Db) {
  const due = new Map<string, string>();
  const rows = db
    .select({ stickerId: stickers.id, contentHash: stickers.contentHash })
    .from(stickers)
    .where(isNotNull(stickers.cdnPurgeDueAt))
    .orderBy(asc(stickers.cdnPurgeDueAt))
    .all();
  for (const { stickerId, contentHash } of rows) {
    if (!due.has(contentHash)) due.set(contentHash, stickerId);
  }
  return [...due].map(([contentHash, stickerId]) => ({ contentHash, stickerId }));
}

/**
 * The CDN purge sweep: retries each purge still due, one drawing at a time, once a mark's own purge
 * failed or a restart cut it off. A purge that fails again stays due for the next sweep.
 */
export async function sweepCdnPurges(deps: PurgeDeps): Promise<void> {
  const due = dueDrawings(deps.db);
  if (due.length === 0) return;
  logInfo("cdn.purge.sweep", { count: due.length });
  for (const { stickerId, contentHash } of due) {
    const purged = await purgeDueDrawing(deps, stickerId, contentHash);
    logInfo("cdn.purge.retried", { stickerId, status: purged ? "purged" : "still_due" });
  }
}

/**
 * Sweeps at once, then CDN_PURGE_SWEEP_EVERY_MS after each sweep ends; null without Fastly's
 * settings. Sweeps run one at a time, and a failure is logged, never thrown. `stop` cancels the next
 * sweep; `idle` settles when the one running has.
 */
export function startCdnPurgeSweeps({ schedule, ...deps }: PurgeDeps & { schedule?: Schedule }) {
  if (!deps.cdnPurge) return null;
  return startRepeatingJob(
    { everyMs: CDN_PURGE_SWEEP_EVERY_MS, failedEvent: "cdn.purge.sweep_failed", schedule },
    () => sweepCdnPurges(deps),
  );
}
