import { stickers, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";

/** What the veil catch-up did with the NSFW stickers it found, by how many. */
type VeilCatchUp = Record<"veiled" | "failed", number>;

/** NSFW stickers still without their veiled image, oldest first. */
const unveiledStickers = (db: Db) =>
  db
    .select({ id: stickers.id, artistId: stickers.artistId, contentHash: stickers.contentHash })
    .from(stickers)
    .where(and(eq(stickers.nsfw, true), isNull(stickers.veiledHash)))
    .orderBy(asc(stickers.number))
    .all();

/**
 * The veil catch-up: makes the veiled image of every NSFW sticker still without one, oldest first,
 * which only a sticker sealed before Sealing made them lacks. One sticker's failure is logged, and it
 * goes on to the next; a sticker veiled once is never veiled again.
 */
export async function veilUnveiled(deps: Pick<AppDeps, "db" | "images">): Promise<VeilCatchUp> {
  const due = unveiledStickers(deps.db);
  const tally: VeilCatchUp = { veiled: 0, failed: 0 };
  if (due.length > 0) logInfo("sticker.veil.catch_up.sweep", { count: due.length });
  for (const [at, sticker] of due.entries()) {
    const fields = { stickerId: sticker.id, artistId: sticker.artistId, done: at + 1 };
    try {
      const veiledHash = await deps.images.saveVeiled(sticker.contentHash);
      deps.db
        .update(stickers)
        .set({ veiledHash })
        .where(and(eq(stickers.id, sticker.id), isNull(stickers.veiledHash)))
        .run();
      tally.veiled += 1;
      logInfo("sticker.veil.catch_up.veiled", { ...fields, count: due.length });
    } catch (error) {
      tally.failed += 1;
      logFailure("sticker.veil.catch_up.failed", error, { ...fields, count: due.length });
    }
  }
  logInfo("sticker.veil.catch_up.swept", { count: due.length, ...tally });
  return tally;
}

/** The veil catch-up at boot, then just after each midnight, Tokyo time, to retry what failed. */
export function startVeilCatchUp(
  deps: Pick<AppDeps, "db" | "images" | "clock"> & { schedule?: Schedule },
) {
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "sticker.veil.catch_up.sweep_failed",
      run: async () => {
        await veilUnveiled(deps);
        return null;
      },
    },
  );
}
