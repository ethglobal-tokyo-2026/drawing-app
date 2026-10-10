import type { Clock } from "./deps.ts";
import { logFailure } from "./diagnostics.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay, tokyoTicketDayStart } from "./ticketDays.ts";

/**
 * How long after midnight each day's run starts, so any chat menu link that read yesterday's count,
 * its token request and link each within LINE's request limit, has landed first and the day's batch
 * moves it too.
 */
export const AFTER_MIDNIGHT_MS = 15_000;

/** Calls `run` after `ms`, and returns a function that cancels it. */
export type Schedule = (run: () => void, ms: number) => () => void;

/** The Schedule the server runs on: a timer that never holds the process open. */
export const timer: Schedule = (run, ms) => {
  const handle = setTimeout(run, ms);
  handle.unref();
  return () => clearTimeout(handle);
};

/** Work to run as each day begins, Tokyo time. */
interface MidnightJob {
  /** The event a run that throws is logged as. */
  failedEvent: string;
  /** Runs `ticketDay`'s work. Resolves how long until it runs again when it isn't done, else null. */
  run: (ticketDay: string) => Promise<number | null>;
}

/**
 * Runs `job` at once, the catch-up at boot, then just after each midnight, Tokyo time. A run that
 * isn't done runs again when it asks, unless midnight comes first. Runs go one at a time, and a
 * failure is logged, never thrown. `stop` cancels the next run; `idle` settles when the one running
 * has.
 */
export function startMidnightJob(
  { clock, schedule = timer }: { clock: Clock; schedule?: Schedule },
  job: MidnightJob,
) {
  let cancel = () => {};
  let stopped = false;
  let running = Promise.resolve();

  /** Runs the day's work, and resolves how long until the next run. */
  async function runDue() {
    const ticketDay = tokyoTicketDay(clock.now());
    let rerunIn: number | null = null;
    try {
      rerunIn = await job.run(ticketDay);
    } catch (error) {
      logFailure(job.failedEvent, error, { ticketDay });
    }
    const now = clock.now();
    const today = tokyoTicketDay(now);
    // A run that went past midnight leaves the new day's AFTER_MIDNIGHT_MS after it, as any day's.
    if (today !== ticketDay) {
      return Math.max(0, tokyoTicketDayStart(today).getTime() + AFTER_MIDNIGHT_MS - now.getTime());
    }
    const midnight = nextTokyoTicketDayStart(now).getTime();
    // A rerun from midnight on would start the next day's run before AFTER_MIDNIGHT_MS.
    const rerunAt = rerunIn === null ? null : now.getTime() + rerunIn;
    const due = rerunAt !== null && rerunAt < midnight ? rerunAt : midnight + AFTER_MIDNIGHT_MS;
    return due - now.getTime();
  }

  function runNext() {
    running = running.then(runDue).then((dueIn) => {
      if (!stopped) cancel = schedule(runNext, dueIn);
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
