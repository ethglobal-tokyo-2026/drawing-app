import type { Clock } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import type { Schedule } from "../midnightJob.ts";
import { startRepeatingJob } from "../repeatingJob.ts";

/** Fastly's free allowance for a month, its regions together. */
export const FASTLY_FREE_REQUESTS = 1_000_000;
export const FASTLY_FREE_BYTES = 100_000_000_000;
/**
 * The share of the free allowance where the cap sends every request to the box, leaving the rest for
 * what arrives between checks and while Fastly's stats catch up.
 */
export const CDN_CAP_SHARE = 0.8;
/** Between the cap's checks of the month's usage. */
export const CDN_CAP_EVERY_MS = 5 * 60_000;

/** What the CDN answered over a time. */
export interface CdnUsage {
  requests: number;
  bytes: number;
}

/**
 * The CDN in front of the box, as the cap reads and switches it. While its switch is "no" the CDN
 * serves; any other value sends every request to the same file on the box.
 */
export interface Cdn {
  /** What it answered from `from` until now, its edges and shields together, as Fastly bills them. */
  usageSince: (from: Date) => Promise<CdnUsage>;
  readSwitch: () => Promise<string>;
  setSwitch: (value: string) => Promise<void>;
}

/** The switch while the cap holds: the month it was reached, as Fastly bills it, in UTC. */
const CAPPED_MONTH = /^\d{4}-\d{2}$/;
const monthOf = (now: Date) => now.toISOString().slice(0, 7);
const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/** What a check read of the month's usage, and the switch as the check left it. */
interface CdnCapCheck {
  usage: CdnUsage;
  sendToBox: string;
}

/**
 * One check of the CDN cap. Once the month's usage reaches CDN_CAP_SHARE of Fastly's free allowance,
 * it sets the switch to the month, so the app loads everything from the box, and in a later month it
 * lifts the cap it set. A switch someone set to anything else stays as they left it.
 */
export async function checkCdnCap({
  cdn,
  clock,
}: {
  cdn: Cdn;
  clock: Clock;
}): Promise<CdnCapCheck> {
  const now = clock.now();
  const month = monthOf(now);
  const [usage, sendToBox] = await Promise.all([cdn.usageSince(monthStart(now)), cdn.readSwitch()]);
  const reached =
    usage.requests >= FASTLY_FREE_REQUESTS * CDN_CAP_SHARE ||
    usage.bytes >= FASTLY_FREE_BYTES * CDN_CAP_SHARE;
  const setInAnEarlierMonth = CAPPED_MONTH.test(sendToBox) && sendToBox < month;
  if (reached && (sendToBox === "no" || setInAnEarlierMonth)) {
    await cdn.setSwitch(month);
    const why = new Error(
      `Fastly answered ${usage.requests} requests and sent ${usage.bytes} bytes since ${month} began, ` +
        `${CDN_CAP_SHARE * 100}% of its free allowance, so every request goes to the box until next month`,
    );
    logFailure("cdn.cap.reached", why, { ...usage, sendToBox: month });
    return { usage, sendToBox: month };
  }
  if (!reached && setInAnEarlierMonth) {
    await cdn.setSwitch("no");
    logInfo("cdn.cap.lifted", { ...usage, sendToBox: "no" });
    return { usage, sendToBox: "no" };
  }
  return { usage, sendToBox };
}

/**
 * The CDN cap: checks at once, logging the month's usage, then CDN_CAP_EVERY_MS after each check
 * ends. A failed check is logged and changes nothing.
 */
export function startCdnCap({
  schedule,
  ...deps
}: {
  cdn: Cdn;
  clock: Clock;
  schedule?: Schedule;
}) {
  let checked = false;
  return startRepeatingJob(
    { everyMs: CDN_CAP_EVERY_MS, failedEvent: "cdn.cap.check_failed", schedule },
    async () => {
      const { usage, sendToBox } = await checkCdnCap(deps);
      if (!checked) logInfo("cdn.cap.checked", { ...usage, sendToBox });
      checked = true;
    },
  );
}
