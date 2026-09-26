import { chatMenuBatches, ticketUses, type Db } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import type { Clock, LineChatMenu } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { LineApiError, type BatchPhase, type LineMessaging } from "../services/lineMessaging.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import { midnightMoves, type ChatMenuIds } from "./menus.ts";

/** The first look at a batch's progress, then the wait between looks: LINE allows 100 an hour. */
export const FIRST_LOOK_MS = 15_000;
export const LOOK_EVERY_MS = 60_000;
/** Looks at one batch, about an hour's worth, before leaving it to the next boot. */
const MAX_LOOKS = 60;
/** Between tries of a batch: LINE takes 3 batches an hour. */
export const RETRY_AFTER_MS = 25 * 60_000;
export const MAX_TRIES = 3;
/**
 * How long after midnight the batch starts, so any link that read yesterday's count, with its
 * token request and link at up to 5 s each, has landed first and the batch moves it too.
 */
export const AFTER_MIDNIGHT_MS = 15_000;

export interface MidnightDeps {
  db: Db;
  clock: Clock;
  line: LineMessaging;
  ids: ChatMenuIds;
  /** Links the day's spenders to their counts again once the batch is done. */
  chatMenu: Pick<LineChatMenu, "relink">;
  /** Waits `ms`. */
  sleep?: (ms: number) => Promise<void>;
  /** Calls `run` after `ms`, and returns a function that cancels it. */
  schedule?: (run: () => void, ms: number) => () => void;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms).unref();
  });

const timer = (run: () => void, ms: number) => {
  const handle = setTimeout(run, ms);
  handle.unref();
  return () => clearTimeout(handle);
};

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

/** Looks at the batch until LINE says how it ended; "ongoing" if it's still running after an hour. */
async function lastPhase(line: LineMessaging, sleep: (ms: number) => Promise<void>, id: string) {
  for (let look = 0; look < MAX_LOOKS; look++) {
    await sleep(look === 0 ? FIRST_LOOK_MS : LOOK_EVERY_MS);
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
  logInfo("chat_menu.spenders_relinked", { stage: ticketDay, status: spenders.length });
}

/**
 * `ticketDay`'s batch, unless it has ended: one LINE batch moves everyone on a counted chat menu to
 * the 3 menu, since everyone has 3 daily tickets again, keyed to the day so a retry resumes it.
 * Once LINE reports it done, the day's spenders are linked to their counts again. A batch LINE took
 * before a restart is looked up by its request ID instead of sent again.
 */
export async function runChatMenuBatch(deps: MidnightDeps, ticketDay: string): Promise<void> {
  const { db, clock, line, ids, sleep = wait } = deps;
  const moves = midnightMoves(ids);
  const earlier = batchOf(db, ticketDay);
  if (moves.length === 0 || (earlier && earlier.status !== "sent")) return;
  const fields = { stage: ticketDay };
  let requestId = earlier?.lineRequestId ?? null;

  for (let tries = 1; tries <= MAX_TRIES; tries++) {
    if (tries > 1) {
      await sleep(RETRY_AFTER_MS);
      // The next day's batch moves everyone again, and links that day's spenders.
      if (tokyoTicketDay(clock.now()) !== ticketDay) return;
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
      phase = await lastPhase(line, sleep, requestId);
    } catch (error) {
      logFailure("chat_menu.batch_progress_failed", error, fields);
      // LINE no longer knows the request: sending the batch again with its key resumes it.
      if (error instanceof LineApiError && !error.retryable) requestId = null;
      continue;
    }
    if (phase === "ongoing") {
      logInfo("chat_menu.batch_still_running", fields);
      return;
    }
    if (phase === "succeeded") {
      await relinkSpenders(deps, ticketDay);
      saveBatch(db, ticketDay, { status: "done", lineRequestId: requestId });
      logInfo("chat_menu.batch_done", fields);
      return;
    }
    logInfo("chat_menu.batch_failed_at_line", fields);
    requestId = null;
  }
  // The batch may still have moved some of the day's spenders to 3.
  await relinkSpenders(deps, ticketDay);
  saveBatch(db, ticketDay, { status: "failed", lineRequestId: requestId });
  logInfo("chat_menu.batch_given_up", fields);
}

/**
 * The midnight job: today's batch at once, when it hasn't run (the catch-up at boot), then each
 * day's, just after its midnight, Tokyo time. Batches run one at a time, and a failure is logged,
 * never thrown. `stop` cancels the next one; `idle` settles when the one running has.
 */
export function startMidnightBatches(deps: MidnightDeps) {
  const { clock, schedule = timer } = deps;
  if (midnightMoves(deps.ids).length === 0) {
    logInfo("chat_menu.batch_off", { status: "no 3 menu to move anyone to" });
    return { stop: () => {}, idle: () => Promise.resolve() };
  }
  let cancel = () => {};
  let stopped = false;
  let running = Promise.resolve();

  async function runDue() {
    // A batch that ran past midnight leaves the new day's due at once.
    for (;;) {
      const ticketDay = tokyoTicketDay(clock.now());
      try {
        await runChatMenuBatch(deps, ticketDay);
      } catch (error) {
        logFailure("chat_menu.batch_failed", error, { stage: ticketDay });
      }
      if (tokyoTicketDay(clock.now()) === ticketDay) return;
    }
  }

  function runNext() {
    running = running.then(runDue).then(() => {
      if (stopped) return;
      const now = clock.now().getTime();
      const due = nextTokyoTicketDayStart(clock.now()).getTime() + AFTER_MIDNIGHT_MS;
      cancel = schedule(runNext, due - now);
    });
  }

  runNext();
  return {
    stop() {
      stopped = true;
      cancel();
    },
    idle: () => running,
  };
}
