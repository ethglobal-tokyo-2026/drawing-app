import type { ChildProcess } from "node:child_process";
import { once } from "node:events";

/** Finish server termination before shutting down a simulator its driver could still reopen. */
export async function stopIpadServers(children: ChildProcess[]) {
  const results = await Promise.allSettled(
    children.map(async (child) => {
      if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
      const closed = once(child, "close", { signal: AbortSignal.timeout(10_000) });
      const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
      child.kill("SIGTERM");
      try {
        await closed;
      } catch (cause) {
        throw new Error(`Could not stop iPad test server PID ${child.pid}`, { cause });
      } finally {
        clearTimeout(force);
      }
    }),
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length)
    throw new AggregateError(
      failures.map((result): unknown => result.reason),
      "iPad test servers did not stop",
    );
}

/** Format server cleanup failures for the runner's persistent output. */
export function describeIpadServerCleanupFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const details =
    error instanceof AggregateError
      ? error.errors.map((failure: unknown) => describeIpadServerCleanupFailure(failure))
      : [];
  if (error instanceof Error && error.cause !== undefined)
    details.push(describeIpadServerCleanupFailure(error.cause));
  return [message, ...details].join("; ");
}
