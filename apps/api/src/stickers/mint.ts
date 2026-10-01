import { stickers, users, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AppDeps, MintedToken } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { queueNaming } from "../ens/naming.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";

/**
 * Writes a mint's token unless the sticker has one. Sealing's retry and the mint catch-up can mint
 * the same sticker at once; StickerNFT answers both with its one token, and the first write stays.
 */
function recordMint(db: Db, stickerId: string, minted: MintedToken) {
  const recorded = db
    .update(stickers)
    .set({ tokenId: minted.tokenId, mintTxHash: minted.txHash })
    .where(and(eq(stickers.id, stickerId), isNull(stickers.tokenId)))
    .returning({ id: stickers.id })
    .get();
  const fields = { stickerId, tokenId: minted.tokenId, txHash: minted.txHash };
  logInfo(recorded ? "sticker.mint.recorded" : "sticker.mint.already_recorded", fields);
}

/**
 * Mints a sealed sticker's NFT unless it has one, records its token, then queues its Original
 * Artist's naming under croquis.eth. Sealing, its retry and the mint catch-up all mint through this.
 * Rejects when the chain doesn't confirm the mint: the sticker stays sealed and unminted, and the
 * next attempt reconciles an NFT that landed late.
 */
export async function mintSticker(deps: AppDeps, stickerId: string): Promise<void> {
  const sticker = deps.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
  if (!sticker) throw new Error(`Sticker ${stickerId} is missing before its mint`);
  if (sticker.tokenId === null) {
    const minted = await deps.mint({
      stickerId,
      artistId: sticker.artistId,
      contentHash: sticker.contentHash,
      metadataUri: sticker.metadataUri,
      number: sticker.number,
      width: sticker.width,
      height: sticker.height,
    });
    if (minted === null && deps.giftChain !== null) {
      throw new Error("The chain returned no confirmed record");
    }
    // Explicit local mock mode stores stickers without sending a mint transaction.
    if (minted !== null) recordMint(deps.db, stickerId, minted);
  }
  queueNaming(deps, sticker.artistId);
}

/** What the mint catch-up did with the unminted stickers it found, by how many. */
type MintCatchUp = Record<"minted" | "skipped" | "failed", number>;

/** Stickers without their NFT, oldest first, with when their Original Artist deleted their account. */
const unmintedStickers = (db: Db) =>
  db
    .select({
      id: stickers.id,
      artistId: stickers.artistId,
      ownerId: stickers.ownerId,
      artistDeletedAt: users.deletedAt,
    })
    .from(stickers)
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(isNull(stickers.tokenId))
    .orderBy(asc(stickers.number))
    .all();

/**
 * Why the catch-up leaves a sticker unminted, or null to mint it. The NFT goes to its Original
 * Artist's smart wallet, so a sticker someone received in mock chain mode would land where its
 * holder can't give it.
 */
async function skipStatus(
  { smartWallets }: AppDeps,
  sticker: ReturnType<typeof unmintedStickers>[number],
) {
  if (sticker.artistDeletedAt !== null) return "no_live_person";
  if (sticker.ownerId !== sticker.artistId) return "not_held_by_artist";
  if (!(await smartWallets.addressFor(sticker.artistId))) return "no_smart_account";
  return null;
}

/**
 * The mint catch-up: mints every sticker still without its NFT, oldest first, as Sealing does: one
 * whose mint failed at Sealing and was never retried, or one sealed before the server reached the
 * chain. One sticker's failure is logged, and the catch-up goes on to the next.
 */
export async function mintUnminted(deps: AppDeps): Promise<MintCatchUp> {
  const due = unmintedStickers(deps.db);
  const tally: MintCatchUp = { minted: 0, skipped: 0, failed: 0 };
  if (due.length > 0) logInfo("sticker.mint.catch_up.sweep", { count: due.length });
  // One at a time, so the relayer's transactions never come in a burst.
  for (const sticker of due) {
    const fields = { stickerId: sticker.id, artistId: sticker.artistId };
    try {
      const status = await skipStatus(deps, sticker);
      if (status) {
        tally.skipped += 1;
        logInfo("sticker.mint.catch_up.skipped", { ...fields, status });
        continue;
      }
      await mintSticker(deps, sticker.id);
      tally.minted += 1;
    } catch (error) {
      tally.failed += 1;
      logFailure("sticker.mint.catch_up.failed", error, fields);
    }
  }
  logInfo("sticker.mint.catch_up.swept", { count: due.length, ...tally });
  return tally;
}

/**
 * The mint catch-up at boot, then just after each midnight, Tokyo time, so a sticker whose mint
 * failed is tried again within a day. Null on the mock chain, which mints nothing.
 */
export function startMintCatchUp(deps: AppDeps & { schedule?: Schedule }) {
  const { clock, giftChain, schedule } = deps;
  if (!giftChain) return null;
  return startMidnightJob(
    { clock, schedule },
    {
      failedEvent: "sticker.mint.catch_up.sweep_failed",
      run: async () => {
        await mintUnminted(deps);
        return null;
      },
    },
  );
}
