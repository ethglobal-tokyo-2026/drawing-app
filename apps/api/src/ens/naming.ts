import { stickers, users, type Db } from "@drawing-app/db";
import { stickerAvatar, stickerLabel } from "@drawing-app/sticker-chain/croquis-names";
import { and, asc, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { isAddress } from "viem";
import type { AppDeps, EnsDeps, NamingQueue, NamingState, ReadContracts } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { checkContracts } from "./contractCheck.ts";
import { syncEnsLabel } from "./labels.ts";

/** A naming job's longest run: a person name, a few sticker names and an avatar, each a transaction. */
export const NAMING_JOB_TIMEOUT_MS = 10 * 60_000;

/** Where a person's name links: their Sticker Board, opened in the LIFF app. */
export const boardUrl = (ens: Pick<EnsDeps, "appLinkBase">, label: string) =>
  `${ens.appLinkBase}/@${label}`;

/**
 * ENSIP-12's avatar for the newest minted sticker `userId` holds, or "" when they hold none. Never
 * an NSFW sticker: anyone can resolve the name, and ENS apps show the avatar unblurred.
 */
export function latestStickerAvatar(
  { db }: Pick<AppDeps, "db">,
  ens: Pick<EnsDeps, "chainId" | "stickerContract">,
  userId: string,
): string {
  const latest = db
    .select({ tokenId: stickers.tokenId })
    .from(stickers)
    .where(and(eq(stickers.ownerId, userId), isNotNull(stickers.tokenId), eq(stickers.nsfw, false)))
    .orderBy(desc(stickers.number))
    .get();
  if (!latest?.tokenId || !isAddress(ens.stickerContract)) return "";
  return stickerAvatar(ens.chainId, ens.stickerContract, BigInt(latest.tokenId));
}

/**
 * Puts a person's names onchain: theirs if it isn't yet, then every minted sticker they drew that
 * has no name, then their avatar. It picks up whatever an earlier run left undone. A sticker it
 * can't name is logged and passed, and the run rejects once the rest are done.
 */
export async function nameEverything(deps: AppDeps, userId: string): Promise<void> {
  const { db, clock } = deps;
  const writer = deps.ens?.writer;
  if (!deps.ens || !writer) return;
  const ens = deps.ens;
  const row = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row || row.deletedAt !== null) {
    logInfo("ens.naming.skipped", { userId, status: "no_live_person" });
    return;
  }
  const account = await deps.smartWallets.addressFor(userId);
  if (!account) {
    logInfo("ens.naming.skipped", { userId, status: "no_smart_account" });
    return;
  }
  const user = syncEnsLabel(db, row);
  if (user.ensLabel === null) throw new Error(`Person ${userId} has no ENS label to name`);
  const avatar = latestStickerAvatar(deps, ens, userId);

  const wasNamed = user.ensNamedAt !== null;
  if (!wasNamed) {
    const { label } = await writer.ensurePersonName(account, user.ensLabel, {
      avatar,
      url: boardUrl(ens, user.ensLabel),
    });
    // A retry after a lost response finds the name the first attempt made, which is the truth.
    db.update(users)
      .set({ ensLabel: label, ensNamedAt: clock.now() })
      .where(eq(users.id, userId))
      .run();
    logInfo("ens.person.named", { userId, address: account });
  }

  const unnamed = db
    .select({ id: stickers.id, number: stickers.number, tokenId: stickers.tokenId })
    .from(stickers)
    .where(
      and(eq(stickers.artistId, userId), isNotNull(stickers.tokenId), isNull(stickers.ensNamedAt)),
    )
    .orderBy(asc(stickers.number))
    .all();
  const skipped: string[] = [];
  for (const sticker of unnamed) {
    if (sticker.tokenId === null) continue;
    const fields = { userId, stickerId: sticker.id, tokenId: sticker.tokenId };
    try {
      await writer.ensureStickerName(sticker.tokenId, stickerLabel(sticker.number));
    } catch (error) {
      // A sticker in the gift escrow can't be named, and mustn't keep the rest unnamed until it leaves.
      logFailure("ens.sticker.failed", error, fields);
      skipped.push(sticker.tokenId);
      continue;
    }
    db.update(stickers).set({ ensNamedAt: clock.now() }).where(eq(stickers.id, sticker.id)).run();
    logInfo("ens.sticker.named", fields);
  }

  // A new name already carries the latest avatar.
  if (wasNamed && avatar !== "") {
    await writer.setAvatar(account, avatar);
    logInfo("ens.avatar.set", { userId });
  }
  if (skipped.length > 0) {
    throw new Error(
      `Stickers with token IDs ${skipped.join(", ")} stayed unnamed, so the next run retries them`,
    );
  }
}

/**
 * Queues naming for `userId` after a seal or a receive. The request that asked doesn't wait: the
 * database records what's named (ens_named_at), and the next run picks up a failed one.
 */
export function queueNaming(deps: AppDeps, userId: string) {
  const { ens } = deps;
  if (!ens?.writer) return;
  ens.naming.enqueue(userId, () => nameEverything(deps, userId));
}

/**
 * Live people with a smart wallet whose names aren't all onchain: theirs, or a minted sticker's
 * they drew.
 */
const unnamedPeople = (db: Db) =>
  db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        isNotNull(users.smartAccountAddress),
        or(
          isNull(users.ensNamedAt),
          inArray(
            users.id,
            db
              .select({ artistId: stickers.artistId })
              .from(stickers)
              .where(and(isNotNull(stickers.tokenId), isNull(stickers.ensNamedAt))),
          ),
        ),
      ),
    )
    .orderBy(asc(users.createdAt))
    .all();

/**
 * The naming catch-up: while naming is on, queues naming for everyone whose names aren't all
 * onchain. Resolves how many it queued.
 */
export async function queueUnnamed(deps: AppDeps): Promise<number> {
  const { ens } = deps;
  if (!ens?.writer) return 0;
  const state = await ens.naming.state();
  if (!state.on) {
    logInfo("ens.naming.catch_up.skipped", { status: "naming_off", reason: state.reason });
    return 0;
  }
  const people = unnamedPeople(deps.db);
  for (const { id } of people) queueNaming(deps, id);
  logInfo("ens.naming.catch_up.queued", { count: people.length });
  return people.length;
}

/**
 * The contract check, then the naming catch-up: at boot, then just after each midnight, Tokyo time,
 * so a name a failed or skipped job left undone waits a day at most, and naming comes back on once
 * the contracts agree. Null without an ENS writer.
 */
export function startNamingCatchUp(
  deps: AppDeps & { schedule?: Schedule },
  readContracts: ReadContracts,
) {
  const { ens, clock, schedule } = deps;
  if (!ens?.writer) return null;
  const { naming } = ens;
  return startMidnightJob(
    { clock, schedule },
    {
      failedEvent: "ens.naming.catch_up_failed",
      run: async () => {
        const checked = naming.state().then((current) => checkContracts(readContracts, current));
        naming.setState(checked);
        await checked;
        await queueUnnamed(deps);
        return null;
      },
    },
  );
}

/**
 * Runs one job at a time and logs every failure. A job still running at NAMING_JOB_TIMEOUT_MS is
 * logged then, and the next waits for it to end: nothing can stop a job, and two at once would send
 * ENS transactions at once. While naming is off, each job is skipped instead of sending a
 * transaction that reverts or names another StickerNFT's sticker.
 */
export function createNamingQueue(): NamingQueue {
  const waiting = new Set<string>();
  let tail: Promise<void> = Promise.resolve();
  let state: Promise<NamingState> = Promise.resolve({ on: true });
  return {
    enqueue(key, job) {
      if (waiting.has(key)) return;
      waiting.add(key);
      tail = tail.then(async () => {
        waiting.delete(key);
        const started = performance.now();
        const fields = () => ({ userId: key, elapsedMs: Math.round(performance.now() - started) });
        const timer = setTimeout(() => {
          const overdue = new Error(
            `Naming ${key} is still running after ${NAMING_JOB_TIMEOUT_MS} ms; the next job waits for it`,
          );
          logFailure("ens.naming.timed_out", overdue, fields());
        }, NAMING_JOB_TIMEOUT_MS);
        try {
          const now = await state;
          if (!now.on) {
            logInfo("ens.naming.skipped", {
              userId: key,
              status: "naming_off",
              reason: now.reason,
            });
            return;
          }
          await job();
          logInfo("ens.naming.completed", fields());
        } catch (error) {
          logFailure("ens.naming.failed", error, fields());
        } finally {
          clearTimeout(timer);
        }
      });
    },
    idle: () => tail,
    setState(next) {
      state = next;
    },
    state: () => state,
  };
}
