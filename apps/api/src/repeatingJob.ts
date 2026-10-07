import { logFailure } from "./diagnostics.ts";
import { timer, type Schedule } from "./midnightJob.ts";

/**
 * Runs `run` at once, then `everyMs` after each run ends. Runs go one at a time, and a failure is
 * logged as `failedEvent`, never thrown. `stop` cancels the next run; `idle` settles when the one
 * running has.
 */
export function startRepeatingJob(
  {
    everyMs,
    failedEvent,
    schedule = timer,
  }: { everyMs: number; failedEvent: string; schedule?: Schedule },
  run: () => Promise<unknown>,
) {
  let cancel = () => {};
  let stopped = false;
  let running = Promise.resolve();

  function runNext() {
    running = running
      .then(run)
      .then(
        () => {},
        (error: unknown) => logFailure(failedEvent, error),
      )
      .then(() => {
        if (!stopped) cancel = schedule(runNext, everyMs);
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
