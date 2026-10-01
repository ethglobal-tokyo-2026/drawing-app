import { stickers, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Clock } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import type { DiskImageStore } from "../services/imageStore.ts";
import { publicStickerViewer } from "../shapes.ts";

/** What the veil catch-up did with the NSFW stickers it found, by how many. */
type VeilCatchUp = Record<"veiled" | "rewritten" | "failed", number>;

interface VeilDeps {
  db: Db;
  images: DiskImageStore;
}

/** Every NSFW sticker, oldest first. */
const nsfwStickers = (db: Db) =>
  db
    .select({
      id: stickers.id,
      artistId: stickers.artistId,
      contentHash: stickers.contentHash,
      veiledHash: stickers.veiledHash,
    })
    .from(stickers)
    .where(eq(stickers.nsfw, true))
    .orderBy(asc(stickers.number))
    .all();

/** The sticker's veiled image: the one it has, or one made now. Resolves whether it made one. */
async function veiledHashOf(
  { db, images }: VeilDeps,
  sticker: ReturnType<typeof nsfwStickers>[number],
) {
  if (sticker.veiledHash !== null) return { veiledHash: sticker.veiledHash, made: false };
  const veiledHash = await images.saveVeiled(sticker.contentHash);
  db.update(stickers)
    .set({ veiledHash })
    .where(and(eq(stickers.id, sticker.id), isNull(stickers.veiledHash)))
    .run();
  return { veiledHash, made: true };
}

/**
 * The veil catch-up, over every NSFW sticker, oldest first: makes the veiled image of one sealed
 * before Sealing made them, and points NFT metadata written before its veil existed at it, keeping
 * the tokenURI. It writes only what's missing or different, so a second run writes nothing. One
 * sticker's failure is logged, and it goes on to the next.
 */
export async function veilNsfwStickers(deps: VeilDeps): Promise<VeilCatchUp> {
  const due = nsfwStickers(deps.db);
  const tally: VeilCatchUp = { veiled: 0, rewritten: 0, failed: 0 };
  if (due.length > 0) logInfo("sticker.veil.catch_up.sweep", { count: due.length });
  for (const [at, sticker] of due.entries()) {
    const fields = { stickerId: sticker.id, artistId: sticker.artistId, done: at + 1 };
    try {
      const { veiledHash, made } = await veiledHashOf(deps, sticker);
      if (made) {
        tally.veiled += 1;
        logInfo("sticker.veil.catch_up.veiled", { ...fields, count: due.length });
      }
      const veiled = { ...sticker, nsfw: true, veiledHash };
      const image = publicStickerViewer(deps.images).images(veiled).png;
      if (await deps.images.nameMetadataImage(sticker.id, image)) {
        tally.rewritten += 1;
        logInfo("sticker.veil.catch_up.metadata_rewritten", { ...fields, count: due.length });
      }
    } catch (error) {
      tally.failed += 1;
      logFailure("sticker.veil.catch_up.failed", error, { ...fields, count: due.length });
    }
  }
  logInfo("sticker.veil.catch_up.swept", { count: due.length, ...tally });
  return tally;
}

/** The veil catch-up at boot, then just after each midnight, Tokyo time, to retry what failed. */
export function startVeilCatchUp(deps: VeilDeps & { clock: Clock; schedule?: Schedule }) {
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "sticker.veil.catch_up.sweep_failed",
      run: async () => {
        await veilNsfwStickers(deps);
        return null;
      },
    },
  );
}
