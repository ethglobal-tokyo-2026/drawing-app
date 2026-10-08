import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  CDN_PURGE_AGAIN_AFTER_MS,
  CDN_PURGE_DEADLINE_MS,
  CDN_PURGE_TRIES,
  createFastlyCdn,
  createFastlyPurge,
  FASTLY_API_URL,
} from "./fastly.ts";

const TOKEN = "test-fastly-token";
const SERVICE = "serviceAAAAAAAAAAAAAAA";
const DICTIONARY = "dictionaryBBBBBBBBBBBB";

/** Fastly's API as a fake fetch plays it: `answer` picks each reply by method and path, and every request is kept. */
function fakeFastly(answer: (method: string, path: string) => Response) {
  const requests: { method: string; url: URL; token: string | null; body: string }[] = [];
  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({
      method: request.method,
      url,
      token: request.headers.get("Fastly-Key"),
      body: await request.text(),
    });
    return answer(request.method, url.pathname);
  });
  const cdn = createFastlyCdn({
    token: TOKEN,
    serviceId: SERVICE,
    dictionaryId: DICTIONARY,
    fetchImpl,
  });
  return { cdn, requests };
}

describe("Fastly's CDN", () => {
  it("adds up the service's hourly requests and bandwidth since the time it's given", async () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const { cdn, requests } = fakeFastly((_, path) =>
      path.endsWith("/field/requests")
        ? Response.json({
            status: "success",
            data: [
              { start_time: 1, requests: 120 },
              { start_time: 2, requests: 3 },
            ],
          })
        : Response.json({
            status: "success",
            data: [
              { start_time: 1, bandwidth: 4000 },
              { start_time: 2, bandwidth: 56 },
            ],
          }),
    );
    expect(await cdn.usageSince(from)).toEqual({ requests: 123, bytes: 4056 });
    expect(requests.map(({ url }) => url.pathname).toSorted()).toEqual([
      `/stats/service/${SERVICE}/field/bandwidth`,
      `/stats/service/${SERVICE}/field/requests`,
    ]);
    for (const { url, token } of requests) {
      expect(url.origin).toBe(FASTLY_API_URL);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        from: String(from.getTime() / 1000),
        by: "hour",
      });
      expect(token).toBe(TOKEN);
    }
  });

  it("reads the switch from the croquis_cdn dictionary's items, an unset one as serving and unwarned, and sets one", async () => {
    const dictionary = `/service/${SERVICE}/dictionary/${DICTIONARY}`;
    let items = [{ item_key: "warned", item_value: "2026-10" }];
    const { cdn, requests } = fakeFastly((method, path) => {
      if (method === "GET" && path === `${dictionary}/items`) return Response.json(items);
      const item = path.startsWith(`${dictionary}/item/`) ? path.split("/").at(-1) : undefined;
      if (method === "PUT" && item) return Response.json({ item_key: item, item_value: "2026-10" });
      return new Response(null, { status: 404 });
    });
    expect(await cdn.readSwitch()).toEqual({ cap: "serve", warned: "2026-10" });
    await cdn.setSwitch("cap", "2026-10");
    await cdn.setSwitch("warned", "2026-10");
    const puts = requests.filter(({ method }) => method === "PUT");
    expect(puts.map(({ url }) => url.pathname)).toEqual([
      `${dictionary}/item/cap`,
      `${dictionary}/item/warned`,
    ]);
    for (const put of puts) expect(put).toMatchObject({ body: "item_value=2026-10", token: TOKEN });
    items = [{ item_key: "cap", item_value: "stop" }];
    expect(await cdn.readSwitch()).toEqual({ cap: "stop", warned: "" });
  });

  it("rejects with what Fastly says when it refuses a call", async () => {
    const { cdn } = fakeFastly(() =>
      Response.json({ msg: "Provided credentials are missing or invalid" }, { status: 401 }),
    );
    await expect(cdn.readSwitch()).rejects.toThrow(
      /answered HTTP 401: Provided credentials are missing or invalid/,
    );
  });
});

describe("Fastly's purge", () => {
  const IMAGE = `https://site.test/api/images/0x${"a".repeat(64)}`;
  const PNG = `${IMAGE}.png`;
  const WEBP = `${IMAGE}.webp`;
  const PURGE_ID = "108-1391560174-974124";
  /** A request Fastly never answers, until its timeout aborts it. */
  const STALL = "stall";
  type Answer = Response | Error | typeof STALL;

  let logs: LogLines;
  beforeEach(() => {
    logs = captureLogLines();
    vi.useFakeTimers();
    // Node's own AbortSignal.timeout runs on the real clock, which the fake one doesn't move. Like
    // Node's, it throws on a delay that isn't a whole number of milliseconds.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      if (!Number.isSafeInteger(ms) || ms < 0) {
        throw new RangeError(
          `The value of "delay" is out of range. It must be an integer. Received ${ms}`,
        );
      }
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), ms);
      return controller.signal;
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    expect(logs.raw.join("\n")).not.toContain(TOKEN);
  });

  /** Fastly's API as a fake fetch plays it: `answer` picks each reply by the purge's path and its count of requests. */
  function fakePurge(answer: (path: string, sent: number) => Answer) {
    const requests: { method: string; path: string; token: string | null; at: number }[] = [];
    const fetchImpl = vi.fn<typeof fetch>((input, init) => {
      const request = new Request(input, init);
      const path = new URL(request.url).pathname;
      const token = request.headers.get("Fastly-Key");
      requests.push({ method: request.method, path, token, at: Date.now() });
      const reply = answer(path, requests.filter((sent) => sent.path === path).length);
      if (reply instanceof Error) return Promise.reject(reply);
      if (reply === STALL) {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        });
      }
      return Promise.resolve(reply);
    });
    return { requests, cdnPurge: createFastlyPurge({ token: TOKEN, fetchImpl }) };
  }
  const purged = () => Response.json({ status: "ok", id: PURGE_ID });
  const busy = () => new Response("busy", { status: 503 });
  /** The requests that purged `url`, by its host and path. */
  const sentTo = <Sent extends { path: string }>(requests: Sent[], url: string) =>
    requests.filter(({ path }) => path === `/purge/${url.slice("https://".length)}`);

  /** Runs the purge to its end, timers included. */
  async function settled(work: Promise<boolean>) {
    const outcome = work.then((value) => ({ value }));
    await vi.runAllTimersAsync();
    return outcome;
  }

  it("purges each URL by its host and path with the token, and again after a pause, logging the IDs Fastly answers", async () => {
    const { requests, cdnPurge } = fakePurge(() => purged());
    expect(await settled(cdnPurge.purge([PNG, WEBP]))).toEqual({ value: true });
    expect(requests).toHaveLength(4);
    for (const url of [PNG, WEBP]) {
      const [first, second] = sentTo(requests, url);
      for (const sent of [first, second])
        expect(sent).toMatchObject({ method: "POST", token: TOKEN });
      expect(second.at - first.at).toBeGreaterThanOrEqual(CDN_PURGE_AGAIN_AFTER_MS);
      logs.expectLogged("cdn.purge.completed", { imageUrl: url, purgeId: PURGE_ID });
    }
  });

  it("retries a failed purge after a pause, and answers true once the retry purges it", async () => {
    const { requests, cdnPurge } = fakePurge((_, sent) => (sent === 1 ? busy() : purged()));
    expect(await settled(cdnPurge.purge([PNG]))).toEqual({ value: true });
    // The retry, then the second purge.
    expect(sentTo(requests, PNG)).toHaveLength(3);
    logs.expectLogged("cdn.purge.retrying", { imageUrl: PNG });
  });

  it("gives up within its deadline when either purge keeps failing or stalling, logging each URL, and answers false", async () => {
    // The PNG's first purge takes its last try, and its second stalls on every try: the longest a
    // purge can run. Every try of the WebP's first purge fails, so it has no second.
    const { requests, cdnPurge } = fakePurge((path, sent) => {
      if (path.endsWith(".webp")) return busy();
      return sent === CDN_PURGE_TRIES ? purged() : STALL;
    });
    const started = Date.now();
    expect(await settled(cdnPurge.purge([PNG, WEBP]))).toEqual({ value: false });
    expect(Date.now() - started).toBeLessThanOrEqual(CDN_PURGE_DEADLINE_MS);
    expect(sentTo(requests, PNG)).toHaveLength(2 * CDN_PURGE_TRIES);
    expect(sentTo(requests, WEBP)).toHaveLength(CDN_PURGE_TRIES);
    for (const url of [PNG, WEBP]) logs.expectLogged("cdn.purge.failed", { imageUrl: url });
  });
});
