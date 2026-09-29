import {
  createTestDb,
  insertSticker,
  insertUser,
  packGift,
  receiveGift,
} from "@drawing-app/db/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messagingChannelFromEnvironment } from "../chatMenu/fromEnvironment.ts";
import { createFakeLine, TEST_CHANNEL } from "../testing/fakeLine.ts";
import { fakeClock } from "../testing/fakes.ts";
import { giverNoticeFor, startGiverNoticeSweeps, SWEEP_EVERY_MS } from "./giverNotice.ts";

beforeEach(() => {
  for (const method of ["info", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type Environment = Partial<Parameters<typeof messagingChannelFromEnvironment>[0]>;

/** LINE after one received gift's message, sent through the channel `environment` sets up. */
async function lineUnder(environment: Environment) {
  const line = createFakeLine();
  const { db } = await createTestDb();
  const clock = fakeClock();
  const giverId = insertUser(db);
  const giftId = packGift(db, insertSticker(db, giverId), giverId);
  receiveGift(db, giftId, insertUser(db), clock.now());
  const channel = messagingChannelFromEnvironment({
    devSignIn: undefined,
    channelId: undefined,
    channelSecret: undefined,
    ...environment,
    fetchImpl: line.fetch,
  });
  const notice = giverNoticeFor(channel, { db, clock });
  await notice.send(giftId);
  await notice.sweep();
  return line;
}

describe("the giver's messages", () => {
  it("are off under dev sign-in, and without the Messaging API channel's ID and secret", async () => {
    expect((await lineUnder({ devSignIn: "on", ...TEST_CHANNEL })).calls).toEqual([]);
    expect((await lineUnder({ channelId: TEST_CHANNEL.channelId })).calls).toEqual([]);
    expect((await lineUnder({ devSignIn: "off", ...TEST_CHANNEL })).pushes).toHaveLength(1);
  });

  it("are swept at once, for what an earlier run left due, then every SWEEP_EVERY_MS", () => {
    vi.useFakeTimers();
    const sweep = vi.fn(() => Promise.resolve());
    startGiverNoticeSweeps({ sweep });
    expect(sweep).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SWEEP_EVERY_MS);
    expect(sweep).toHaveBeenCalledTimes(2);
  });
});
