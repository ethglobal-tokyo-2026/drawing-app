import { bytes32, insertUser } from "@drawing-app/db/testing";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeContractReads, fakeEns, fakeNameWriter, fakeSmartWallets } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import {
  createNamingQueue,
  NAMING_JOB_TIMEOUT_MS,
  queueUnnamed,
  startNamingCatchUp,
} from "./naming.ts";

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

/** A smart wallet's address, lowercase as Privy's lookup answers it. */
const wallet = (digit: string) => `0x${digit.repeat(40)}`;
/** A sticker minted as `tokenId`, named onchain at `ensNamedAt` when it's given. */
const minted = (tokenId: string, ensNamedAt?: Date) => ({
  tokenId,
  mintTxHash: bytes32(`mint ${tokenId}`),
  ensNamedAt,
});

/** The app with an ENS writer that records each name; `enqueued` holds each person queued for naming. */
async function namingApp() {
  const { writer, calls } = fakeNameWriter();
  const test = await createTestApp(({ db }) => ({
    ens: fakeEns(writer),
    smartWallets: fakeSmartWallets(db),
  }));
  const { ens } = test.deps;
  assert(ens, "The test app names people under croquis-app.eth");
  const enqueue = vi.spyOn(ens.naming, "enqueue");
  const enqueued = () => enqueue.mock.calls.map(([userId]) => userId);
  return { test, naming: ens.naming, calls, enqueued };
}

describe("the naming catch-up", () => {
  it("queues naming for each live person with a smart wallet whose names aren't all onchain, and logs how many", async () => {
    const { test, naming, enqueued } = await namingApp();
    const { db } = test;
    const namedAt = test.clock.now();
    const unnamed = insertUser(db, { smartAccountAddress: wallet("a") });
    const stickerUnnamed = insertUser(db, {
      smartAccountAddress: wallet("b"),
      ensNamedAt: namedAt,
    });
    insertSealedSticker(db, stickerUnnamed, minted("1"));
    const allNamed = insertUser(db, { smartAccountAddress: wallet("c"), ensNamedAt: namedAt });
    insertSealedSticker(db, allNamed, minted("2", namedAt));
    // An unminted sticker has nothing onchain to name yet.
    insertSealedSticker(db, allNamed);
    insertUser(db);
    insertUser(db, {
      smartAccountAddress: wallet("d"),
      deletedAt: namedAt,
      lineUserId: null,
      lineDisplayName: null,
    });

    expect(await queueUnnamed(test.deps)).toBe(2);
    expect(enqueued()).toHaveLength(2);
    expect(enqueued()).toEqual(expect.arrayContaining([unnamed, stickerUnnamed]));
    logs.expectLogged("ens.naming.catch_up.queued", { count: 2 });
    await naming.idle();
  });

  it("queues nothing while naming is off, and says why", async () => {
    const { test, naming, enqueued } = await namingApp();
    insertUser(test.db, { smartAccountAddress: wallet("a") });
    const reason = "The relayer lacks NAMER_ROLE";
    naming.setState(Promise.resolve({ on: false, reason }));

    expect(await queueUnnamed(test.deps)).toBe(0);
    expect(enqueued()).toEqual([]);
    logs.expectLogged("ens.naming.catch_up.skipped", { status: "naming_off", reason });
  });

  it("checks the contracts at boot and just after each midnight, and names everyone unnamed once they agree", async () => {
    const { test, naming, calls } = await namingApp();
    insertUser(test.db, { handle: "Alice", smartAccountAddress: wallet("a") });
    const answers = [fakeContractReads({ relayerIsNamer: false }), fakeContractReads()];
    const midnights: (() => void)[] = [];
    const job = startNamingCatchUp(
      {
        ...test.deps,
        schedule: (run) => {
          midnights.push(run);
          return () => {};
        },
      },
      async () => answers.shift() ?? fakeContractReads(),
    );
    assert(job, "The test app has an ENS writer");

    await job.idle();
    await naming.idle();
    expect(calls).toEqual([]);
    logs.expectLogged("ens.naming.catch_up.skipped", { status: "naming_off" });

    midnights.shift()?.();
    await job.idle();
    await naming.idle();
    expect(calls).toEqual(["person alice"]);
    logs.expectLogged("chain.contracts.checked", { naming: "on" });
    job.stop();
  });
});
