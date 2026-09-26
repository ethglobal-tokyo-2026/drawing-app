import { chatMenuBatches } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import {
  chatMenuThrough,
  createFakeLine,
  lineMessagingThrough,
  TEST_CHAT_MENU_IDS,
  type FakeLine,
} from "../testing/fakeLine.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import type { ChatMenuIds } from "./menus.ts";
import {
  AFTER_MIDNIGHT_MS,
  FIRST_LOOK_MS,
  LOOK_EVERY_MS,
  MAX_TRIES,
  RETRY_AFTER_MS,
  runChatMenuBatch,
  startMidnightBatches,
  type MidnightDeps,
} from "./midnight.ts";

const { en, ja } = TEST_CHAT_MENU_IDS;
/** LINE user IDs as LINE writes them: U and 32 hex digits. */
const lineUserId = (digit: string) => `U${digit.repeat(32)}`;
const ANN = lineUserId("a");
const BEN = lineUserId("b");
const CHO = lineUserId("c");

let test: TestApp;
let line: FakeLine;
/** Every wait the job asked for, in ms. */
let waits: number[];
/** Runs during each wait, as time passing. */
let duringWait: (() => Promise<void>) | undefined;
/** The midnight job's timers: when each would fire, and what it would run. */
let timers: { ms: number; run: () => void }[];

/** A person with a LINE account, signed in, whose chat menu LINE shows as `menu`. */
async function person(lineUser: string, menu?: string, language: "en" | "ja" = "en") {
  const userId = insertUser(test.db, { lineUserId: lineUser, language });
  if (menu) line.links.set(lineUser, menu);
  return { userId, headers: await test.signInAs(userId) };
}

const spend = async (headers: Record<string, string>) => {
  const response = await test.app.request("/api/tickets/spend", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ kind: "daily" }),
  });
  expect(response.status).toBe(201);
  await test.deps.lineChatMenu.idle();
};

const jobDeps = (ids: ChatMenuIds = TEST_CHAT_MENU_IDS): MidnightDeps => ({
  db: test.db,
  clock: test.clock,
  line: lineMessagingThrough(line),
  ids,
  chatMenu: test.deps.lineChatMenu,
  sleep: async (ms) => {
    waits.push(ms);
    await duringWait?.();
  },
  schedule: (run, ms) => {
    const entry = { ms, run };
    timers.push(entry);
    return () => {
      timers = timers.filter((timer) => timer !== entry);
    };
  },
});

const batches = () => test.db.select().from(chatMenuBatches).all();
const today = () => tokyoTicketDay(test.clock.now());

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  line = createFakeLine();
  test = await createTestApp(chatMenuThrough(line));
  waits = [];
  duringWait = undefined;
  timers = [];
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the chat menu's midnight batch", () => {
  it("moves everyone back to 3 daily tickets, in their language, with one batch keyed to the day", async () => {
    await person(ANN, en["2"]);
    await person(BEN, ja.none, "ja");
    await person(CHO, en["3"]);
    await runChatMenuBatch(jobDeps(), today());

    expect(line.batches).toHaveLength(1);
    expect(line.batches[0]?.resumeRequestKey).toBe(today());
    expect(Object.fromEntries(line.links)).toEqual({
      [ANN]: en["3"],
      [BEN]: ja["3"],
      [CHO]: en["3"],
    });
    expect(batches()).toMatchObject([
      { ticketDay: today(), lineRequestId: "fake-request-1", status: "done" },
    ]);
    expect(waits).toEqual([FIRST_LOOK_MS]);
  });

  it("then links everyone who spent since midnight to their count, even a spend made while it ran", async () => {
    const ann = await person(ANN);
    const ben = await person(BEN);
    await spend(ann.headers);
    line.reportNextBatch(["ongoing", "succeeded"]);
    // Ben spends while LINE runs the batch, which then moves him from 2 back to 3.
    duringWait = async () => {
      duringWait = undefined;
      await spend(ben.headers);
      expect(line.links.get(BEN)).toBe(en["2"]);
    };
    await runChatMenuBatch(jobDeps(), today());

    expect(line.links.get(ANN)).toBe(en["2"]);
    expect(line.links.get(BEN)).toBe(en["2"]);
    expect(waits).toEqual([FIRST_LOOK_MS, LOOK_EVERY_MS]);
  });

  it("runs once a day: an ended batch isn't run again", async () => {
    await runChatMenuBatch(jobDeps(), today());
    await runChatMenuBatch(jobDeps(), today());
    expect(line.batches).toHaveLength(1);
  });

  it("resumes a batch LINE took before a restart by its request ID, without sending it again", async () => {
    const requestId = await lineMessagingThrough(line).moveMenus(
      [{ from: en["2"], to: en["3"] }],
      today(),
    );
    test.db
      .insert(chatMenuBatches)
      .values({ ticketDay: today(), lineRequestId: requestId, status: "sent" })
      .run();
    await runChatMenuBatch(jobDeps(), today());
    expect(line.batches).toHaveLength(1);
    expect(batches()).toMatchObject([{ status: "done", lineRequestId: requestId }]);
  });

  it("sends a batch LINE reports failed again with the same key, which resumes it", async () => {
    await person(ANN, en.none);
    line.reportNextBatch(["failed"]);
    await runChatMenuBatch(jobDeps(), today());

    expect(line.batches.map((batch) => batch.resumeRequestKey)).toEqual([today(), today()]);
    expect(waits).toEqual([FIRST_LOOK_MS, RETRY_AFTER_MS, FIRST_LOOK_MS]);
    expect(line.links.get(ANN)).toBe(en["3"]);
    expect(batches()).toMatchObject([{ status: "done", lineRequestId: "fake-request-2" }]);
  });

  it("gives up after three tries at a batch LINE doesn't take, and still links the day's spenders", async () => {
    const ann = await person(ANN);
    await spend(ann.headers);
    line.links.set(ANN, en["3"]);
    for (let tries = 0; tries < MAX_TRIES; tries++) {
      line.failNext("batch", Response.json({ message: "Too many requests" }, { status: 429 }));
    }
    await runChatMenuBatch(jobDeps(), today());

    expect(line.calls.filter((call) => call === "batch")).toHaveLength(MAX_TRIES);
    expect(waits).toEqual([RETRY_AFTER_MS, RETRY_AFTER_MS]);
    expect(line.links.get(ANN)).toBe(en["2"]);
    expect(batches()).toMatchObject([{ status: "failed", lineRequestId: null }]);
  });

  it("gives up at once when LINE refuses the batch itself", async () => {
    line.failNext("batch", Response.json({ message: "richmenu not found" }, { status: 400 }));
    await runChatMenuBatch(jobDeps(), today());
    expect(line.calls.filter((call) => call === "batch")).toHaveLength(1);
    expect(batches()).toMatchObject([{ status: "failed" }]);
  });

  it("stops trying once the day turns: the next day's batch moves everyone", async () => {
    line.failNext("batch", Response.json({ message: "busy" }, { status: 500 }));
    duringWait = () => {
      test.clock.set(nextTokyoTicketDayStart(test.clock.now()));
      return Promise.resolve();
    };
    const day = today();
    await runChatMenuBatch(jobDeps(), day);
    expect(line.calls.filter((call) => call === "batch")).toHaveLength(1);
    expect(batches()).toEqual([]);
  });
});

describe("the midnight job", () => {
  it("catches up at boot, then runs each day's batch just after its midnight, Tokyo time", async () => {
    const bootDay = today();
    const job = startMidnightBatches(jobDeps());
    await job.idle();
    expect(line.batches.map((batch) => batch.resumeRequestKey)).toEqual([bootDay]);

    const midnight = nextTokyoTicketDayStart(test.clock.now());
    expect(timers.map((timer) => timer.ms)).toEqual([
      midnight.getTime() + AFTER_MIDNIGHT_MS - test.clock.now().getTime(),
    ]);
    test.clock.set(new Date(midnight.getTime() + AFTER_MIDNIGHT_MS));
    timers[0]?.run();
    await job.idle();
    expect(line.batches.map((batch) => batch.resumeRequestKey)).toEqual([bootDay, today()]);
    expect(today()).not.toBe(bootDay);
    expect(timers).toHaveLength(2);
    job.stop();
  });

  it("doesn't run a batch at boot when the day's has ended", async () => {
    await runChatMenuBatch(jobDeps(), today());
    const job = startMidnightBatches(jobDeps());
    await job.idle();
    expect(line.batches).toHaveLength(1);
    job.stop();
  });

  it("doesn't start without a 3 menu to move anyone to", async () => {
    const job = startMidnightBatches(jobDeps({ en: { plain: en.plain } }));
    await job.idle();
    expect(line.calls).toEqual([]);
    expect(timers).toEqual([]);
  });
});
