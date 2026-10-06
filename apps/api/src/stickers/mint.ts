import { stickers, suiTransactions, users, type Db } from "@drawing-app/db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { pngName } from "../services/imageStore.ts";
import { stickerSealedIn } from "../sui/events.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import {
  follow,
  runAsServer,
  sponsored,
  type OnSucceeded,
  type SuiTransactionDeps,
} from "../sui/transactions.ts";
import { SponsorshipError } from "../sui/types.ts";

/** A sticker that can't be minted yet, and why: the catch-up skips it, and Sealing refuses. */
class MintBlockedError extends Error {
  name = "MintBlockedError";
  readonly status: "no_live_person" | "no_sui_wallet";

  constructor(status: MintBlockedError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

const stickerOf = (db: Db, stickerId: string) => {
  const sticker = db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
  if (!sticker) throw new Error(`Sticker ${stickerId} is missing before its mint`);
  return sticker;
};

/** The sticker's latest mint, if one was ever sponsored. */
const lastMint = (db: Db, stickerId: string) =>
  db
    .select()
    .from(suiTransactions)
    .where(and(eq(suiTransactions.kind, "mint"), eq(suiTransactions.stickerId, stickerId)))
    .orderBy(desc(suiTransactions.id))
    .get();

/** Writes the sticker's object unless it has one: a second writer of the same object changes nothing. */
const writeObject = (db: Pick<Db, "update">, stickerId: string, objectId: string) =>
  db
    .update(stickers)
    .set({ objectId })
    .where(and(eq(stickers.id, stickerId), isNull(stickers.objectId)))
    .run();

/**
 * A mint's record, in the transaction that settles it: the sticker's object, checked against the
 * StickerSealed the mint emitted, since a mint that made another object is a bug to stop on.
 */
const recordMint =
  (stickerId: string, objectId: string): OnSucceeded =>
  (tx, events) => {
    const sealed = stickerSealedIn(events);
    if (sealed?.sticker !== objectId) {
      throw new Error(
        `Sticker ${stickerId}'s mint emitted ${sealed ? `StickerSealed for ${sealed.sticker}` : "no StickerSealed"}, not for its object ${objectId}`,
      );
    }
    writeObject(tx, stickerId, objectId);
  };

/**
 * Mints a sealed sticker's Sui object to its Original Artist unless it has one, and records the
 * object. Sealing, its retry and the mint catch-up all mint through this, one at a time per sticker.
 * An open mint is followed before any other, and one that failed or died is checked against the
 * chain, so a sticker Sui minted is recorded rather than minted again. Rejects when the mint doesn't
 * land: the sticker stays sealed and unminted for the next attempt. The mock chain mints nothing.
 */
export function mintSticker(deps: AppDeps, stickerId: string): Promise<void> {
  const { db, clock, sui, gasStation } = deps;
  const sticker = stickerOf(db, stickerId);
  if (!sui || !gasStation || sticker.objectId !== null) return Promise.resolve();
  const chain: SuiTransactionDeps = { db, clock, sui, gasStation };
  const objectId = sui.stickerObjectId(stickerId);
  const record = recordMint(stickerId, objectId);
  const recorded = (how: string, txDigest?: string) =>
    logInfo("sticker.mint.recorded", { stickerId, ...(txDigest && { txDigest }), reason: how });

  return oneAtATime(`sticker:${stickerId}`, async () => {
    if (stickerOf(db, stickerId).objectId !== null) return;
    const last = lastMint(db, stickerId);
    if (last && last.outcome === null) {
      const { row } = await follow(chain, last, record);
      if (row.outcome === "succeeded") return recorded("its earlier mint landed", row.digest);
      if (row.outcome === null) {
        throw new Error(`Sticker ${stickerId}'s mint ${row.digest} hasn't shown on Sui yet`);
      }
    }
    // A mint that failed or died may have been beaten by one that ran: the object says.
    if (last && (await sui.stickerMinted(stickerId))) {
      writeObject(db, stickerId, objectId);
      return recorded("its object was already on Sui");
    }
    const artist = await deps.suiWallets.addressFor(sticker.artistId);
    if (!artist) {
      throw new MintBlockedError(
        "no_sui_wallet",
        `Sticker ${stickerId}'s Original Artist ${sticker.artistId} has no Sui wallet yet`,
      );
    }
    const kind = await sui.mintKind({
      stickerId,
      number: sticker.number,
      artist,
      contentHash: sticker.contentHash,
      width: sticker.width,
      height: sticker.height,
      nsfw: sticker.nsfw,
      // What anyone may see, by the image store's naming: an NSFW sticker's veiled image.
      image: pngName(sticker.veiledHash ?? sticker.contentHash, "png"),
    });
    let row;
    try {
      row = await sponsored(chain, { kind: "mint", stickerId }, kind);
    } catch (error) {
      // Shinami's dry run refuses a mint of a key Sui already minted.
      if (error instanceof SponsorshipError && (await sui.stickerMinted(stickerId))) {
        writeObject(db, stickerId, objectId);
        return recorded("its object was already on Sui");
      }
      throw error;
    }
    const { row: ran } = await runAsServer(chain, row, record);
    if (ran.outcome === "succeeded") return recorded("minted", ran.digest);
    if (ran.outcome === null) {
      throw new Error(
        `Sui's answer to sticker ${stickerId}'s mint ${ran.digest} was lost; it's followed next`,
      );
    }
    throw new Error(
      `Sticker ${stickerId}'s mint ${ran.digest} ${ran.outcome === "failed" ? `failed: ${ran.failure}` : "never ran: its sponsorship lapsed"}`,
    );
  });
}

/** What the mint catch-up did with the unminted stickers it found, by how many. */
type MintCatchUp = Record<"minted" | "skipped" | "failed", number>;

/** Stickers without their Sui object, oldest first, with when their Original Artist deleted their account. */
const unmintedStickers = (db: Db) =>
  db
    .select({
      id: stickers.id,
      artistId: stickers.artistId,
      artistDeletedAt: users.deletedAt,
    })
    .from(stickers)
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(isNull(stickers.objectId))
    .orderBy(asc(stickers.number))
    .all();

/**
 * The mint catch-up: mints every sticker still without its Sui object, oldest first, as Sealing does:
 * one whose mint failed at Sealing and was never retried. It skips a sticker whose Original Artist
 * deleted their account or has no Sui wallet yet. One sticker's failure is logged, and the catch-up
 * goes on to the next.
 */
export async function mintUnminted(deps: AppDeps): Promise<MintCatchUp> {
  const due = unmintedStickers(deps.db);
  const tally: MintCatchUp = { minted: 0, skipped: 0, failed: 0 };
  if (due.length > 0) logInfo("sticker.mint.catch_up.sweep", { count: due.length });
  // One at a time, so the server's transactions never come in a burst.
  for (const sticker of due) {
    const fields = { stickerId: sticker.id, artistId: sticker.artistId };
    try {
      if (sticker.artistDeletedAt !== null) {
        throw new MintBlockedError("no_live_person", `${sticker.artistId} deleted their account`);
      }
      await mintSticker(deps, sticker.id);
      tally.minted += 1;
    } catch (error) {
      if (error instanceof MintBlockedError) {
        tally.skipped += 1;
        logInfo("sticker.mint.catch_up.skipped", { ...fields, status: error.status });
      } else {
        tally.failed += 1;
        logFailure("sticker.mint.catch_up.failed", error, fields);
      }
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
  if (!deps.sui) return null;
  return startMidnightJob(
    { clock: deps.clock, schedule: deps.schedule },
    {
      failedEvent: "sticker.mint.catch_up.sweep_failed",
      run: async () => {
        await mintUnminted(deps);
        return null;
      },
    },
  );
}
