import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeClock } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  CDN_CAP_EVERY_MS,
  CDN_CAP_SHARE,
  checkCdnCap,
  FASTLY_FREE_BYTES,
  FASTLY_FREE_REQUESTS,
  startCdnCap,
  type Cdn,
  type CdnUsage,
} from "./cdnCap.ts";

const CAP_REQUESTS = FASTLY_FREE_REQUESTS * CDN_CAP_SHARE;
const CAP_BYTES = FASTLY_FREE_BYTES * CDN_CAP_SHARE;
/** Five in the morning of November 1st in Tokyo, still October in UTC, where Fastly bills. */
const LAST_EVENING_OF_OCTOBER = new Date("2026-10-31T20:00:00.000Z");

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Fastly as the cap sees it: the month's `usage` so far, and its switch, which the test reads back. */
function fakeCdn({
  usage = { requests: 0, bytes: 0 },
  sendToBox = "no",
}: {
  usage?: CdnUsage;
  sendToBox?: string;
}) {
  const state = { sendToBox, usageFrom: [] as Date[] };
  const cdn: Cdn = {
    usageSince: (from) => {
      state.usageFrom.push(from);
      return Promise.resolve(usage);
    },
    readSwitch: () => Promise.resolve(state.sendToBox),
    setSwitch: vi.fn((value: string) => {
      state.sendToBox = value;
      return Promise.resolve();
    }),
  };
  return { cdn, state };
}

/** The cap, checked once at `now`. */
async function checkAt(now: Date, cdn: Cdn) {
  const clock = fakeClock(now);
  return checkCdnCap({ cdn, clock });
}

describe("the CDN cap", () => {
  it.each([
    { what: "requests", usage: { requests: CAP_REQUESTS, bytes: 0 } },
    { what: "bytes", usage: { requests: 0, bytes: CAP_BYTES } },
  ])(
    "sends every request to the box once the month's $what reach the cap, until the month Fastly bills ends",
    async ({ usage }) => {
      const { cdn, state } = fakeCdn({ usage });
      await checkAt(LAST_EVENING_OF_OCTOBER, cdn);
      expect(state.usageFrom).toEqual([new Date("2026-10-01T00:00:00.000Z")]);
      expect(state.sendToBox).toBe("2026-10");
      logs.expectLogged("cdn.cap.reached", { ...usage, sendToBox: "2026-10" });
    },
  );

  it("leaves the CDN serving below the cap", async () => {
    const { cdn, state } = fakeCdn({ usage: { requests: CAP_REQUESTS - 1, bytes: CAP_BYTES - 1 } });
    expect(await checkAt(LAST_EVENING_OF_OCTOBER, cdn)).toMatchObject({ sendToBox: "no" });
    expect(cdn.setSwitch).not.toHaveBeenCalled();
    expect(state.sendToBox).toBe("no");
  });

  it("lifts the cap it set once a later month starts", async () => {
    const { cdn, state } = fakeCdn({ sendToBox: "2026-09" });
    await checkAt(LAST_EVENING_OF_OCTOBER, cdn);
    expect(state.sendToBox).toBe("no");
    logs.expectLogged("cdn.cap.lifted", { sendToBox: "no" });
  });

  it.each([
    { what: "the cap it set this month", sendToBox: "2026-10" },
    { what: "a switch someone set by hand", sendToBox: "yes" },
    { what: "a switch someone set by hand that sorts before a month", sendToBox: "1" },
  ])("keeps $what, below the cap or past it", async ({ sendToBox }) => {
    for (const usage of [
      { requests: 0, bytes: 0 },
      { requests: CAP_REQUESTS, bytes: CAP_BYTES },
    ]) {
      const { cdn, state } = fakeCdn({ usage, sendToBox });
      await checkAt(LAST_EVENING_OF_OCTOBER, cdn);
      expect(cdn.setSwitch).not.toHaveBeenCalled();
      expect(state.sendToBox).toBe(sendToBox);
    }
  });

  it("checks at boot, logging the month's usage, then every CDN_CAP_EVERY_MS after each check ends", async () => {
    const usage = { requests: 12, bytes: 3456 };
    const { cdn } = fakeCdn({ usage });
    const runs: (() => void)[] = [];
    const schedule = vi.fn((run: () => void) => {
      runs.push(run);
      return () => {};
    });
    const job = startCdnCap({ cdn, clock: fakeClock(LAST_EVENING_OF_OCTOBER), schedule });
    await job.idle();
    logs.expectLogged("cdn.cap.checked", { ...usage, sendToBox: "no" });
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), CDN_CAP_EVERY_MS);
    const [next] = runs;
    assert(next, "the next check was scheduled");
    next();
    await job.idle();
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(logs.entries.filter(({ event }) => event === "cdn.cap.checked")).toHaveLength(1);
    job.stop();
  });

  it("logs a check that fails, changes nothing, and checks again", async () => {
    const { cdn } = fakeCdn({});
    cdn.usageSince = () => Promise.reject(new Error("Fastly answered HTTP 503"));
    const schedule = vi.fn(() => () => {});
    const job = startCdnCap({ cdn, clock: fakeClock(LAST_EVENING_OF_OCTOBER), schedule });
    await job.idle();
    logs.expectLogged("cdn.cap.check_failed");
    expect(cdn.setSwitch).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), CDN_CAP_EVERY_MS);
    job.stop();
  });
});
