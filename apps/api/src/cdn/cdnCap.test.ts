import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeClock } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  CDN_CAP_EVERY_MS,
  CDN_PAUSE_SHARE,
  CDN_WARN_SHARE,
  CdnTokenRefusedError,
  checkCdnCap,
  FASTLY_FREE_BYTES,
  FASTLY_FREE_REQUESTS,
  remindTokenExpiry,
  startCdnCap,
  TOKEN_REMINDER_DAYS,
  type Cdn,
  type CdnSwitch,
  type CdnUsage,
} from "./cdnCap.ts";

/** Five in the morning of November 1st in Tokyo, still October in UTC, where Fastly bills. */
const LAST_EVENING_OF_OCTOBER = new Date("2026-10-31T20:00:00.000Z");
const OCTOBER = "2026-10";

/** The month's usage at `share` of the free allowance, by requests or by bytes. */
const usageAt = (share: number, by: "requests" | "bytes" = "requests"): CdnUsage => ({
  requests: by === "requests" ? FASTLY_FREE_REQUESTS * share : 0,
  bytes: by === "bytes" ? FASTLY_FREE_BYTES * share : 0,
});
const BELOW_WARNING = usageAt(CDN_WARN_SHARE / 2);
const WARNED = usageAt(CDN_WARN_SHARE);
const PAUSED = usageAt(CDN_PAUSE_SHARE);

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Fastly as the cap sees it, the month's `usage` so far and its switch, and LINE, which keeps what it's sent. */
function fakes({
  usage,
  tokenExpiresAt = null,
  ...start
}: { usage: CdnUsage; tokenExpiresAt?: Date | null } & Partial<CdnSwitch>) {
  const state: CdnSwitch & { usageFrom: Date[] } = {
    cap: "serve",
    warned: "",
    ...start,
    usageFrom: [],
  };
  const cdn: Cdn = {
    usageSince: (from) => {
      state.usageFrom.push(from);
      return Promise.resolve(usage);
    },
    readSwitch: () => Promise.resolve({ cap: state.cap, warned: state.warned }),
    setSwitch: vi.fn((item: keyof CdnSwitch, value: string) => {
      state[item] = value;
      return Promise.resolve();
    }),
    tokenExpiresAt: vi.fn(() => Promise.resolve(tokenExpiresAt)),
  };
  const sent: { text: string; key: string }[] = [];
  const tellOperator = vi.fn((text: string, key: string) => {
    sent.push({ text, key });
    return Promise.resolve();
  });
  const check = () => checkCdnCap({ cdn, clock: fakeClock(LAST_EVENING_OF_OCTOBER), tellOperator });
  return { cdn, state, sent, tellOperator, check };
}

describe("the CDN cap", () => {
  it.each(["requests", "bytes"] as const)(
    "tells the operator in LINE once a month when its %s reach the warning, and keeps the site serving",
    async (by) => {
      const { state, sent, check } = fakes({ usage: usageAt(CDN_WARN_SHARE, by) });
      await check();
      await check();
      expect(state.usageFrom).toEqual([
        new Date("2026-10-01T00:00:00.000Z"),
        new Date("2026-10-01T00:00:00.000Z"),
      ]);
      expect(sent).toHaveLength(1);
      expect(state).toMatchObject({ cap: "serve", warned: OCTOBER });
      logs.expectLogged("cdn.cap.warned", { cap: "serve" });
    },
  );

  it.each(["requests", "bytes"] as const)(
    "pauses the site for the rest of the month once its %s reach the pause, and tells the operator once",
    async (by) => {
      const { state, sent, check } = fakes({ usage: usageAt(CDN_PAUSE_SHARE, by) });
      await check();
      await check();
      expect(state).toMatchObject({ cap: OCTOBER, warned: OCTOBER });
      expect(sent).toHaveLength(1);
      expect(sent[0]?.text).toMatch(/paused/);
      logs.expectLogged("cdn.cap.paused", { cap: OCTOBER });
    },
  );

  it("pauses a site it warned about earlier in the month", async () => {
    const { state, check } = fakes({ usage: PAUSED, warned: OCTOBER });
    await check();
    expect(state.cap).toBe(OCTOBER);
  });

  it("says nothing and changes nothing below the warning", async () => {
    const { cdn, tellOperator, check } = fakes({ usage: BELOW_WARNING });
    expect(await check()).toMatchObject({ cap: "serve" });
    expect(tellOperator).not.toHaveBeenCalled();
    expect(cdn.setSwitch).not.toHaveBeenCalled();
  });

  it("lifts the pause it set once a later month starts, and warns again in the new month", async () => {
    const { state, check } = fakes({ usage: WARNED, cap: "2026-09", warned: "2026-09" });
    await check();
    expect(state).toMatchObject({ cap: "serve", warned: OCTOBER });
    logs.expectLogged("cdn.cap.lifted", { cap: "serve" });
  });

  it.each([
    { what: "its own pause this month", cap: OCTOBER },
    { what: "a pause set by hand", cap: "stop" },
    { what: "serving past the allowance by hand", cap: "keep" },
  ])("keeps $what, below the warning or past the pause", async ({ cap }) => {
    for (const usage of [BELOW_WARNING, PAUSED]) {
      const { state, check } = fakes({ usage, cap, warned: OCTOBER });
      await check();
      expect(state.cap).toBe(cap);
    }
  });

  it("pauses even when LINE fails, and tells the operator at the next check", async () => {
    const { state, sent, tellOperator, check } = fakes({ usage: PAUSED });
    tellOperator.mockRejectedValueOnce(new Error("LINE answered 429: monthly limit"));
    await check();
    expect(state).toMatchObject({ cap: OCTOBER, warned: "" });
    logs.expectLogged("cdn.cap.warn_failed", { cap: OCTOBER });
    await check();
    expect(sent).toHaveLength(1);
    expect(state.warned).toBe(OCTOBER);
  });

  it("reminds the operator on each of TOKEN_REMINDER_DAYS before Fastly's token expires, and on no other day", async () => {
    const expiresAt = new Date("2027-01-05T17:48:08.000Z");
    const remindedOn: number[] = [];
    for (let days = 0; days <= Math.max(...TOKEN_REMINDER_DAYS) + 2; days++) {
      const { cdn, sent, tellOperator } = fakes({
        usage: BELOW_WARNING,
        tokenExpiresAt: expiresAt,
      });
      const clock = fakeClock(new Date(expiresAt.getTime() - days * 86_400_000));
      await remindTokenExpiry({ cdn, clock, tellOperator });
      if (sent.length > 0) remindedOn.push(days);
      expect(sent.every(({ text }) => text.includes("2027-01-05"))).toBe(true);
    }
    expect(remindedOn.toSorted((a, b) => b - a)).toEqual(TOKEN_REMINDER_DAYS);
  });

  it("tells the operator once a day while Fastly refuses the token, and logs each failed check", async () => {
    const { cdn, sent, tellOperator } = fakes({ usage: BELOW_WARNING });
    cdn.usageSince = () => Promise.reject(new CdnTokenRefusedError("Fastly answered HTTP 401"));
    const clock = fakeClock(LAST_EVENING_OF_OCTOBER);
    const runs: (() => void)[] = [];
    const job = startCdnCap({
      cdn,
      clock,
      tellOperator,
      schedule: (run) => {
        runs.push(run);
        return () => {};
      },
    });
    const runNext = async () => {
      runs.shift()?.();
      await job.idle();
    };
    await job.idle();
    await runNext();
    expect(sent.filter(({ key }) => key.startsWith("cdn token refused"))).toHaveLength(1);
    expect(logs.entries.filter(({ event }) => event === "cdn.cap.check_failed")).toHaveLength(2);
    clock.advance(86_400_000);
    await runNext();
    expect(sent.filter(({ key }) => key.startsWith("cdn token refused"))).toHaveLength(2);
    expect(cdn.tokenExpiresAt).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it("checks at boot, logging the month's usage, then every CDN_CAP_EVERY_MS after each check ends", async () => {
    const { cdn, tellOperator } = fakes({ usage: BELOW_WARNING });
    const runs: (() => void)[] = [];
    const schedule = vi.fn((run: () => void) => {
      runs.push(run);
      return () => {};
    });
    const job = startCdnCap({
      cdn,
      clock: fakeClock(LAST_EVENING_OF_OCTOBER),
      tellOperator,
      schedule,
    });
    await job.idle();
    logs.expectLogged("cdn.cap.checked", { ...BELOW_WARNING, cap: "serve" });
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
    const { cdn, tellOperator } = fakes({ usage: PAUSED });
    cdn.usageSince = () => Promise.reject(new Error("Fastly answered HTTP 503"));
    const schedule = vi.fn(() => () => {});
    const job = startCdnCap({
      cdn,
      clock: fakeClock(LAST_EVENING_OF_OCTOBER),
      tellOperator,
      schedule,
    });
    await job.idle();
    logs.expectLogged("cdn.cap.check_failed");
    expect(cdn.setSwitch).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), CDN_CAP_EVERY_MS);
    job.stop();
  });
});
