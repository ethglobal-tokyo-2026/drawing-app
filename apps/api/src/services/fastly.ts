import { z } from "zod";
import type { Cdn } from "../cdn/cdnCap.ts";
import { failureCause } from "../diagnostics.ts";

export const FASTLY_API_URL = "https://api.fastly.com";
/** One call to Fastly's API, its body's read included. */
const FASTLY_CALL_TIMEOUT_MS = 10_000;
/** The item of the service's croquis_cdn edge dictionary that holds the CDN cap's switch. */
const SWITCH_ITEM = "send_to_box";

/** Each hour's count, from Fastly's historical stats for one field. */
const hourlyRequestsSchema = z.object({
  data: z.array(z.object({ requests: z.number().nonnegative() })),
});
const hourlyBandwidthSchema = z.object({
  data: z.array(z.object({ bandwidth: z.number().nonnegative() })),
});
const itemSchema = z.object({ item_value: z.string() });
/** How Fastly's API says what failed: its older endpoints in msg and detail, newer ones in title. */
const errorSchema = z.object({
  msg: z.string().nullish(),
  detail: z.string().nullish(),
  title: z.string().nullish(),
});

const sum = (counts: number[]) => counts.reduce((total, count) => total + count, 0);

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

/**
 * Fastly's service in front of the box, through its API: the service's hourly stats for its usage,
 * which trail what it serves by a few minutes, and the croquis_cdn edge dictionary for the switch.
 */
export function createFastlyCdn({
  token,
  serviceId,
  dictionaryId,
  url = FASTLY_API_URL,
  fetchImpl = fetch,
}: {
  token: string;
  serviceId: string;
  dictionaryId: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Cdn {
  async function call<T>(
    method: "GET" | "PUT",
    path: string,
    schema: z.ZodType<T>,
    body?: URLSearchParams,
  ): Promise<T> {
    const what = `Fastly's ${method} ${path.split("?")[0]}`;
    let text: string;
    let status: number;
    try {
      const response = await fetchImpl(`${url}${path}`, {
        method,
        headers: { "Fastly-Key": token, Accept: "application/json" },
        body,
        signal: AbortSignal.timeout(FASTLY_CALL_TIMEOUT_MS),
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      throw new Error(`${what} couldn't be reached: ${failureCause(error)}`, { cause: error });
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

  const item = `/service/${serviceId}/dictionary/${dictionaryId}/item/${SWITCH_ITEM}`;
  return {
    usageSince: async (from) => {
      const query = `from=${Math.floor(from.getTime() / 1000)}&by=hour`;
      const stats = `/stats/service/${serviceId}/field`;
      const [requests, bandwidth] = await Promise.all([
        call("GET", `${stats}/requests?${query}`, hourlyRequestsSchema),
        call("GET", `${stats}/bandwidth?${query}`, hourlyBandwidthSchema),
      ]);
      return {
        requests: sum(requests.data.map((hour) => hour.requests)),
        bytes: sum(bandwidth.data.map((hour) => hour.bandwidth)),
      };
    },
    readSwitch: async () => (await call("GET", item, itemSchema)).item_value,
    setSwitch: async (value) => {
      await call("PUT", item, itemSchema, new URLSearchParams({ item_value: value }));
    },
  };
}
