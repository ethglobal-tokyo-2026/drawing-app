import { z } from "zod";
import { CdnTokenRefusedError, type Cdn, type CdnSwitch } from "../cdn/cdnCap.ts";
import type { CdnPurge } from "../deps.ts";
import { failureCause, logFailure, logInfo } from "../diagnostics.ts";

export const FASTLY_API_URL = "https://api.fastly.com";
/** One call to Fastly's API, its body's read included. */
const FASTLY_CALL_TIMEOUT_MS = 10_000;
/** The CDN cap's switch before anything has set it: the site serves, and no one has been warned. */
const UNSET_SWITCH: CdnSwitch = { cap: "serve", warned: "" };

/**
 * A mark's purge of every URL, both purges with their tries and pauses. A mark waits on it inside the
 * app's own request limit (REQUEST_TIMEOUT_MS in the frontend's httpApi.ts), with room for the veil.
 */
export const CDN_PURGE_DEADLINE_MS = 10_000;
/** Each purge's tries, the first included. */
export const CDN_PURGE_TRIES = 3;
/**
 * The pause before a URL's second purge. An edge the first purge reached can refill from a shield it
 * hadn't reached yet, and keep that copy; the second purge clears it.
 */
export const CDN_PURGE_AGAIN_AFTER_MS = 1_000;
/** The pause before a purge's first retry, doubled before each one after it. */
const CDN_PURGE_BACKOFF_MS = 500;
const backoffAfter = (tried: number) => CDN_PURGE_BACKOFF_MS * 2 ** (tried - 1);
/**
 * Each try's share of what the pauses leave of the deadline, so a stalled try leaves the next as
 * long. Whole milliseconds, since AbortSignal.timeout throws on any other delay.
 */
const CDN_PURGE_TRY_TIMEOUT_MS = Math.floor(
  (CDN_PURGE_DEADLINE_MS -
    CDN_PURGE_AGAIN_AFTER_MS -
    2 * CDN_PURGE_BACKOFF_MS * (2 ** (CDN_PURGE_TRIES - 1) - 1)) /
    (2 * CDN_PURGE_TRIES),
);

/** Each hour's count, from Fastly's historical stats for one field. */
const hourlyRequestsSchema = z.object({
  data: z.array(z.object({ requests: z.number().nonnegative() })),
});
const hourlyBandwidthSchema = z.object({
  data: z.array(z.object({ bandwidth: z.number().nonnegative() })),
});
const itemSchema = z.object({ item_key: z.string(), item_value: z.string() });
/** The token a call is made with, as /tokens/self answers: expires_at is null when it never expires. */
const tokenSchema = z.object({ expires_at: z.iso.datetime().nullish() });
/** A purge Fastly took, with the ID it gave it. */
const purgeSchema = z.object({ status: z.literal("ok"), id: z.string().min(1) });
/** How Fastly's API says what failed: its older endpoints in msg and detail, newer ones in title. */
const errorSchema = z.object({
  msg: z.string().nullish(),
  detail: z.string().nullish(),
  title: z.string().nullish(),
});

const sum = (counts: number[]) => counts.reduce((total, count) => total + count, 0);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fastly's words for why a call failed, or the body as it came. */
function fastlyWords(body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  const error = errorSchema.safeParse(parsed);
  if (!error.success) return body;
  return [error.data.msg ?? error.data.title, error.data.detail].filter(Boolean).join(": ") || body;
}

/** Fastly's API with a token: `url` and `fetchImpl` stand in for it in tests. */
interface FastlyApi {
  token: string;
  url?: string;
  fetchImpl?: typeof fetch;
}

interface CallOptions {
  body?: URLSearchParams;
  timeoutMs?: number;
}

/** One call to Fastly's API; rejects with what failed, in Fastly's words when it answered. */
function callFastly<T>(
  api: FastlyApi,
  method: "GET" | "PUT" | "POST",
  path: string,
  schema: z.ZodType<T>,
  options?: CallOptions,
): Promise<T> {
  const what = `Fastly's ${method} ${path.split("?")[0]}`;
  return askFastly(api, method, `${api.url ?? FASTLY_API_URL}${path}`, what, schema, options);
}

/** One request to Fastly with the token; rejects with what failed, in Fastly's words when it answered. */
async function askFastly<T>(
  { token, fetchImpl = fetch }: FastlyApi,
  method: "GET" | "PUT" | "POST" | "PURGE",
  target: string,
  what: string,
  schema: z.ZodType<T>,
  { body, timeoutMs = FASTLY_CALL_TIMEOUT_MS }: CallOptions = {},
): Promise<T> {
  let text: string;
  let status: number;
  try {
    const response = await fetchImpl(target, {
      method,
      headers: { "Fastly-Key": token, Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    text = await response.text();
  } catch (error) {
    throw new Error(`${what} couldn't be reached: ${failureCause(error)}`, { cause: error });
  }
  if (status === 401 || status === 403) {
    throw new CdnTokenRefusedError(`${what} answered HTTP ${status}: ${fastlyWords(text)}`);
  }
  if (status < 200 || status >= 300) {
    throw new Error(`${what} answered HTTP ${status}: ${fastlyWords(text)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${what} answered with a body that isn't JSON`, { cause: error });
  }
  const answer = schema.safeParse(parsed);
  if (!answer.success) {
    throw new Error(`${what} answered in a shape this server doesn't read`, {
      cause: answer.error,
    });
  }
  return answer.data;
}

/**
 * Fastly's service in front of the site, through its API: the service's hourly stats for its usage,
 * which trail what it serves by a few minutes, and the croquis_cdn edge dictionary for the switch.
 */
export function createFastlyCdn({
  serviceId,
  dictionaryId,
  ...api
}: FastlyApi & { serviceId: string; dictionaryId: string }): Cdn {
  const dictionary = `/service/${serviceId}/dictionary/${dictionaryId}`;
  return {
    usageSince: async (from) => {
      const query = `from=${Math.floor(from.getTime() / 1000)}&by=hour`;
      const stats = `/stats/service/${serviceId}/field`;
      const [requests, bandwidth] = await Promise.all([
        callFastly(api, "GET", `${stats}/requests?${query}`, hourlyRequestsSchema),
        callFastly(api, "GET", `${stats}/bandwidth?${query}`, hourlyBandwidthSchema),
      ]);
      return {
        requests: sum(requests.data.map((hour) => hour.requests)),
        bytes: sum(bandwidth.data.map((hour) => hour.bandwidth)),
      };
    },
    readSwitch: async () => {
      const items = await callFastly(api, "GET", `${dictionary}/items`, z.array(itemSchema));
      const value = (key: keyof CdnSwitch) =>
        items.find(({ item_key }) => item_key === key)?.item_value ?? UNSET_SWITCH[key];
      return { cap: value("cap"), warned: value("warned") };
    },
    setSwitch: async (item, value) => {
      const body = new URLSearchParams({ item_value: value });
      await callFastly(api, "PUT", `${dictionary}/item/${item}`, itemSchema, { body });
    },
    tokenExpiresAt: async () => {
      const { expires_at } = await callFastly(api, "GET", "/tokens/self", tokenSchema);
      return expires_at ? new Date(expires_at) : null;
    },
  };
}

/**
 * Purges URLs from every Fastly location by a PURGE sent to each, twice, CDN_PURGE_AGAIN_AFTER_MS
 * apart. Each purge gets CDN_PURGE_TRIES tries, with a growing pause between them, all within
 * CDN_PURGE_DEADLINE_MS. Not through the API's POST /purge/<url>: it finds a service by the domains
 * on its versions, and the site's domains are the account's (Fastly's domains/v1), so it answers 404.
 */
export function createFastlyPurge(api: FastlyApi): CdnPurge {
  /** One purge of `imageUrl`, retried; true once Fastly took it. */
  async function purgeOnce(imageUrl: string): Promise<boolean> {
    for (let tried = 1; ; tried++) {
      try {
        const what = `Fastly's PURGE of ${new URL(imageUrl).pathname}`;
        const { id } = await askFastly(api, "PURGE", imageUrl, what, purgeSchema, {
          timeoutMs: CDN_PURGE_TRY_TIMEOUT_MS,
        });
        logInfo("cdn.purge.completed", { imageUrl, purgeId: id });
        return true;
      } catch (error) {
        if (tried >= CDN_PURGE_TRIES) {
          logFailure("cdn.purge.failed", error, { imageUrl, count: tried });
          return false;
        }
        logFailure("cdn.purge.retrying", error, { imageUrl, count: tried });
        await pause(backoffAfter(tried));
      }
    }
  }
  async function purgeTwice(imageUrl: string): Promise<boolean> {
    if (!(await purgeOnce(imageUrl))) return false;
    await pause(CDN_PURGE_AGAIN_AFTER_MS);
    return purgeOnce(imageUrl);
  }
  return {
    purge: async (urls) => (await Promise.all(urls.map(purgeTwice))).every(Boolean),
  };
}
