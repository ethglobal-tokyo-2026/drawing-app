import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { createNamingQueue, NAMING_JOB_TIMEOUT_MS } from "./naming.ts";

let logs: LogLines;
/** Each job's name, as it starts. */
let started: string[];

beforeEach(() => {
  logs = captureLogLines();
  started = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A job that starts as `name` and runs until `finish` is called. */
function heldJob(name: string) {
  let start = () => {};
  const running = new Promise<void>((resolve) => {
    start = resolve;
  });
  let finish = () => {};
  const ended = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return {
    run: async () => {
      started.push(name);
      start();
      await ended;
    },
    /** Settles once the job has started. */
    running,
    finish,
  };
}

/** A job that starts as `name` and ends at once. */
const quickJob = (name: string) => async () => {
  started.push(name);
};

describe("the naming queue", () => {
  it("drops a job whose key is waiting, and queues one whose key is running", async () => {
    const queue = createNamingQueue();
    const alice = heldJob("alice");
    queue.enqueue("alice", alice.run);
    queue.enqueue("ben", quickJob("ben"));
    queue.enqueue("ben", quickJob("ben again"));
    await alice.running;
    // Alice's running job may have read her stickers before this was queued.
    queue.enqueue("alice", quickJob("alice again"));
    alice.finish();
    await queue.idle();
    expect(started).toEqual(["alice", "ben", "alice again"]);
  });

  it("logs a job still running at its timeout, and starts the next only once it ends", async () => {
    vi.useFakeTimers();
    const queue = createNamingQueue();
    const alice = heldJob("alice");
    queue.enqueue("alice", alice.run);
    queue.enqueue("ben", quickJob("ben"));
    await vi.advanceTimersByTimeAsync(NAMING_JOB_TIMEOUT_MS);
    logs.expectLogged("ens.naming.timed_out", { userId: "alice" });
    expect(started).toEqual(["alice"]);

    alice.finish();
    await queue.idle();
    expect(started).toEqual(["alice", "ben"]);
  });
});
