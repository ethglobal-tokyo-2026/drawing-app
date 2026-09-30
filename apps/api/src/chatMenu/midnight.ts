import { chatMenuBatches, ticketUses, type Db } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import type { Clock, LineChatMenu } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { startMidnightJob, type Schedule } from "../midnightJob.ts";
import { LineApiError, type BatchPhase, type LineMessaging } from "../services/lineMessaging.ts";
import { tokyoTicketDay } from "../ticketDays.ts";
import { midnightMoves, type ChatMenuIds } from "./menus.ts";

/** The first look at a batch's progress, then the wait between looks: LINE allows 100 an hour. */
export const FIRST_LOOK_MS = 15_000;
export const LOOK_EVERY_MS = 60_000;
/** Looks at a batch, about an hour's worth, before leaving it to a recheck. */
export const MAX_LOOKS = 60;
/** Before a recheck, so its first look comes LOOK_EVERY_MS after the last, like the others. */
export const RECHECK_AFTER_MS = LOOK_EVERY_MS - FIRST_LOOK_MS;
/** Between tries of a batch: LINE takes 3 batches an hour. */
export const RETRY_AFTER_MS = 25 * 60_000;
export const MAX_TRIES = 3;

export interface MidnightDeps {
  db: Db;
  clock: Clock;
  line: LineMessaging;
  ids: ChatMenuIds;
  /** Links the day's spenders to their counts again once the batch is done. */
  chatMenu: Pick<LineChatMenu, "relink">;
  /** Waits `ms`. */
  sleep?: (ms: number) => Promise<void>;
  schedule?: Schedule;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms).unref();
  });

const batchOf = (db: Db, ticketDay: string) =>
  db.select().from(chatMenuBatches).where(eq(chatMenuBatches.ticketDay, ticketDay)).get();

function saveBatch(
  db: Db,
  ticketDay: string,
  values: Pick<typeof chatMenuBatches.$inferInsert, "status" | "lineRequestId">,
) {
  db.insert(chatMenuBatches)
    .values({ ticketDay, ...values })
    .onConflictDoUpdate({ target: chatMenuBatches.ticketDay, set: values })
    .run();
}

/**
 * Looks at `ticketDay`'s batch until LINE says how it ended; "ongoing" if it's still running after
 * MAX_LOOKS looks, or once the day turns, since the next day's batch moves everyone again.
 */
async function lastPhase(
  { line, clock }: Pick<MidnightDeps, "line" | "clock">,
  sleep: (ms: number) => Promise<void>,
  id: string,
  ticketDay: string,
) {
  for (let look = 0; look < MAX_LOOKS; look++) {
    await sleep(look === 0 ? FIRST_LOOK_MS : LOOK_EVERY_MS);
    if (tokyoTicketDay(clock.now()) !== ticketDay) return "ongoing";
    const phase: BatchPhase = await line.batchPhase(id);
    if (phase !== "ongoing") return phase;
  }
  return "ongoing";
}

/**
 * Links everyone who spent a ticket on `ticketDay` to their count again: the batch moved anyone it
 * found on a counted menu to 3, including someone whose spend was linked while it ran.
 */
async function relinkSpenders({ db, chatMenu }: MidnightDeps, ticketDay: string) {
  const spenders = db
    .selectDistinct({ userId: ticketUses.userId })
    .from(ticketUses)
    .where(eq(ticketUses.ticketDay, ticketDay))
    .all();
  for (const { userId } of spenders) await chatMenu.relink(userId);
  logInfo("chat_menu.spenders_relinked", { ticketDay, count: spenders.length });
}

/**
 * `ticketDay`'s batch, unless it has ended: one LINE batch moves everyone on a counted chat menu to
 * the 3 menu, since everyone has 3 daily tickets again, keyed to the day so a retry resumes it.
 * Once LINE reports it done, the day's spenders are linked to their counts again. A batch LINE took
 * before a restart is looked up by its request ID instead of sent again. Resolves true when LINE is
 * still running the batch at the last look, which leaves it sent, for a recheck.
 */
export async function runChatMenuBatch(deps: MidnightDeps, ticketDay: string): Promise<boolean> {
  const { db, clock, line, ids, sleep = wait } = deps;
  const moves = midnightMoves(ids);
  const earlier = batchOf(db, ticketDay);
  if (moves.length === 0 || (earlier && earlier.status !== "sent")) return false;
  const fields = { ticketDay };
  let requestId = earlier?.lineRequestId ?? null;

  for (let tries = 1; tries <= MAX_TRIES; tries++) {
    if (tries > 1) {
      await sleep(RETRY_AFTER_MS);
      // The next day's batch moves everyone again, and links that day's spenders.
      if (tokyoTicketDay(clock.now()) !== ticketDay) return false;
    }
    if (requestId === null) {
      try {
        requestId = await line.moveMenus(moves, ticketDay);
      } catch (error) {
        logFailure("chat_menu.batch_failed", error, fields);
        if (error instanceof LineApiError && !error.retryable) break;
        continue;
      }
      saveBatch(db, ticketDay, { status: "sent", lineRequestId: requestId });
      logInfo("chat_menu.batch_sent", fields);
    }
    let phase: BatchPhase;
    try {
      phase = await lastPhase(deps, sleep, requestId, ticketDay);
    } catch (error) {
      logFailure("chat_menu.batch_progress_failed", error, fields);
      // LINE no longer knows the request: sending the batch again with its key resumes it.
      if (error instanceof LineApiError && !error.retryable) requestId = null;
      continue;
    }
    if (phase === "ongoing") {
      logInfo("chat_menu.batch_still_running", fields);
      return true;
    }
    if (phase === "succeeded") {
      await relinkSpenders(deps, ticketDay);
      saveBatch(db, ticketDay, { status: "done", lineRequestId: requestId });
      logInfo("chat_menu.batch_done", fields);
      return false;
    }
    logInfo("chat_menu.batch_failed_at_line", fields);
    requestId = null;
  }
  // The batch may still have moved some of the day's spenders to 3.
  await relinkSpenders(deps, ticketDay);
  saveBatch(db, ticketDay, { status: "failed", lineRequestId: requestId });
  logInfo("chat_menu.batch_given_up", fields);
  return false;
}

/**
 * The midnight job: today's batch at once, when it hasn't run (the catch-up at boot), then each
 * day's, just after its midnight, Tokyo time. A batch LINE is still running is rechecked after
 * RECHECK_AFTER_MS until it ends or the day turns, so the day's spenders are linked once it ends.
 */
export function startMidnightBatches(deps: MidnightDeps) {
  if (midnightMoves(deps.ids).length === 0) {
    logInfo("chat_menu.batch_off", { status: "no_3_menu" });
    return { stop: () => {}, idle: () => Promise.resolve() };
  }
  return startMidnightJob(deps, {
    failedEvent: "chat_menu.batch_failed",
    run: async (ticketDay) => ((await runChatMenuBatch(deps, ticketDay)) ? RECHECK_AFTER_MS : null),
  });
}
