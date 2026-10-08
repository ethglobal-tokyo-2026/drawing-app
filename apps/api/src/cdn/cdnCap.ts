import type { Clock } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import type { Schedule } from "../midnightJob.ts";
import { startRepeatingJob } from "../repeatingJob.ts";

/** Fastly's free allowance for a month, its regions together. */
export const FASTLY_FREE_REQUESTS = 1_000_000;
export const FASTLY_FREE_BYTES = 100_000_000_000;
/** The share of the free allowance at which the operator hears about it in LINE, once a month. */
export const CDN_WARN_SHARE = 0.8;
/**
 * The share at which Fastly pauses the site until next month, before it would start billing. The rest
 * is room for what arrives between checks and while Fastly's stats catch up.
 */
export const CDN_PAUSE_SHARE = 0.95;
/** Between the cap's checks of the month's usage. */
export const CDN_CAP_EVERY_MS = 5 * 60_000;
/**
 * The days before Fastly's API token expires on which the operator hears about it in LINE: past its
 * expiry the cap can't read Fastly, so it can't pause the site.
 */
export const TOKEN_REMINDER_DAYS: readonly number[] = [14, 7, 3, 1];

/** What the CDN answered over a time. */
export interface CdnUsage {
  requests: number;
  bytes: number;
}

/** The cap's switch, and what it remembers, as the service's croquis_cdn edge dictionary holds them. */
export interface CdnSwitch {
  /**
   * "serve" while the site is up. The cap sets the month it paused the site in, YYYY-MM; Fastly
   * answers every request with its paused page then, and for "stop" too. "keep" serves past the
   * allowance. The cap changes neither "stop" nor "keep".
   */
  cap: string;
  /** The month the operator last heard in LINE how much of the allowance is used, or "". */
  warned: string;
}

/** Fastly's service in front of the site, as the cap reads and switches it. */
export interface Cdn {
  /** What it answered from `from` until now, its edges and shields together, as Fastly bills them. */
  usageSince: (from: Date) => Promise<CdnUsage>;
  readSwitch: () => Promise<CdnSwitch>;
  setSwitch: (item: keyof CdnSwitch, value: string) => Promise<void>;
  /** When the API token the cap uses expires; null when it never does. */
  tokenExpiresAt: () => Promise<Date | null>;
}

/** Fastly refused the cap's API token: it expired, or was revoked or replaced. */
export class CdnTokenRefusedError extends Error {
  name = "CdnTokenRefusedError";
}

/** Sends the operator a LINE message; the same `key` again within a day sends nothing more. */
export type TellOperator = (text: string, key: string) => Promise<void>;

/** A month the cap paused the site in. */
const PAUSED_MONTH = /^\d{4}-\d{2}$/;
/** Fastly bills by the calendar month in UTC. */
const monthOf = (now: Date) => now.toISOString().slice(0, 7);
const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

const percentOf = (share: number) => `${Math.floor(share * 100)}%`;
const usageWords = ({ requests, bytes }: CdnUsage) =>
  `${requests.toLocaleString("en-US")} requests and ${(bytes / 1e9).toFixed(1)} GB`;

/** What a check read of the month's usage, and the switch as the check left it. */
interface CdnCapCheck {
  usage: CdnUsage;
  cap: string;
}

/**
 * One check of the CDN cap. At CDN_PAUSE_SHARE of Fastly's free allowance it pauses the site for the
 * rest of the month, and once a later month starts it lifts the pause it set. At CDN_WARN_SHARE, or
 * on pausing, it tells the operator in LINE, once a month; a message LINE didn't take goes again at
 * the next check, and never holds up the pause.
 */
export async function checkCdnCap({
  cdn,
  clock,
  tellOperator,
}: {
  cdn: Cdn;
  clock: Clock;
  tellOperator: TellOperator;
}): Promise<CdnCapCheck> {
  const now = clock.now();
  const month = monthOf(now);
  const [usage, { cap: before, warned }] = await Promise.all([
    cdn.usageSince(monthStart(now)),
    cdn.readSwitch(),
  ]);
  const share = Math.max(usage.requests / FASTLY_FREE_REQUESTS, usage.bytes / FASTLY_FREE_BYTES);
  const pausedEarlier = PAUSED_MONTH.test(before) && before < month;
  let cap = before;
  if (share >= CDN_PAUSE_SHARE && (before === "serve" || pausedEarlier)) {
    cap = month;
    await cdn.setSwitch("cap", cap);
    const why = new Error(
      `Fastly answered ${usageWords(usage)} since ${month} began, ${percentOf(share)} of its free allowance, so it pauses the site until next month`,
    );
    logFailure("cdn.cap.paused", why, { ...usage, cap });
  } else if (share < CDN_PAUSE_SHARE && pausedEarlier) {
    cap = "serve";
    await cdn.setSwitch("cap", cap);
    logInfo("cdn.cap.lifted", { ...usage, cap });
  }

  if (share >= CDN_WARN_SHARE && warned !== month) {
    const text =
      cap === month
        ? `Fastly has paused Croquis until next month: it answered ${usageWords(usage)}, ${percentOf(share)} of its free allowance. Visitors see a paused page. To serve the rest of the month and pay Fastly, set the cap to keep (deploy/README.md's CDN).`
        : `Croquis has used ${percentOf(share)} of Fastly's free allowance this month: ${usageWords(usage)}. At ${percentOf(CDN_PAUSE_SHARE)} Fastly pauses the site until next month, unless the cap is set to keep (deploy/README.md's CDN).`;
    try {
      await tellOperator(text, `cdn cap ${cap === month ? "paused" : "warned"} ${month}`);
      await cdn.setSwitch("warned", month);
      logInfo("cdn.cap.warned", { ...usage, cap });
    } catch (error) {
      logFailure("cdn.cap.warn_failed", error, { ...usage, cap });
    }
  }
  return { usage, cap };
}

const dayOf = (time: Date) => time.toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** Tells the operator in LINE when Fastly's API token expires, on each of TOKEN_REMINDER_DAYS before. */
export async function remindTokenExpiry({
  cdn,
  clock,
  tellOperator,
}: {
  cdn: Cdn;
  clock: Clock;
  tellOperator: TellOperator;
}) {
  const expiresAt = await cdn.tokenExpiresAt();
  if (!expiresAt) return;
  const on = dayOf(expiresAt);
  const days = Math.round((Date.parse(on) - Date.parse(dayOf(clock.now()))) / DAY_MS);
  if (!TOKEN_REMINDER_DAYS.includes(days)) return;
  await tellOperator(
    `Croquis's Fastly API token expires on ${on}, in ${days} day${days === 1 ? "" : "s"}. After that the CDN cap can't read Fastly or pause the site. Make a new token for the Croquis service in Fastly, set it as FASTLY_API_TOKEN in deploy/.env, and deploy the API (deploy/README.md's CDN).`,
    `cdn token expires ${on} ${days}`,
  );
  logInfo("cdn.cap.token_expiring", { reason: `the token expires ${on}`, count: days });
}

/**
 * The CDN cap: checks at once, logging the month's usage, then CDN_CAP_EVERY_MS after each check
 * ends. A failed check is logged and changes nothing; while Fastly refuses the token, the operator
 * hears it in LINE once a day. Once a day it also looks at when the token expires.
 */
export function startCdnCap({
  schedule,
  ...deps
}: {
  cdn: Cdn;
  clock: Clock;
  tellOperator: TellOperator;
  schedule?: Schedule;
}) {
  let checked = false;
  let expiryLookedOn = "";
  let refusalToldOn = "";
  return startRepeatingJob(
    { everyMs: CDN_CAP_EVERY_MS, failedEvent: "cdn.cap.check_failed", schedule },
    async () => {
      const today = dayOf(deps.clock.now());
      if (expiryLookedOn !== today) {
        expiryLookedOn = today;
        await remindTokenExpiry(deps).catch((error: unknown) =>
          logFailure("cdn.cap.token_check_failed", error),
        );
      }
      try {
        const { usage, cap } = await checkCdnCap(deps);
        if (!checked) logInfo("cdn.cap.checked", { ...usage, cap });
        checked = true;
      } catch (error) {
        if (error instanceof CdnTokenRefusedError && refusalToldOn !== today) {
          refusalToldOn = today;
          await deps
            .tellOperator(
              `Fastly refuses the CDN cap's API token (${error.message}), so the cap can't pause the site before Fastly bills. Make a new token for the Croquis service in Fastly, set it as FASTLY_API_TOKEN in deploy/.env, and deploy the API (deploy/README.md's CDN).`,
              `cdn token refused ${today}`,
            )
            .catch((told: unknown) => logFailure("cdn.cap.warn_failed", told));
        }
        throw error;
      }
    },
  );
}
