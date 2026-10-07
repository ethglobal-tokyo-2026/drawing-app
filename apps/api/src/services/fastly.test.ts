import { describe, expect, it, vi } from "vitest";
import { createFastlyCdn, FASTLY_API_URL } from "./fastly.ts";

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

  it("reads and sets the switch, the croquis_cdn dictionary's send_to_box item", async () => {
    const item = `/service/${SERVICE}/dictionary/${DICTIONARY}/item/send_to_box`;
    const { cdn, requests } = fakeFastly((method, path) =>
      path === item
        ? Response.json({
            item_key: "send_to_box",
            item_value: method === "GET" ? "no" : "2026-10",
          })
        : new Response(null, { status: 404 }),
    );
    expect(await cdn.readSwitch()).toBe("no");
    await cdn.setSwitch("2026-10");
    const [, put] = requests;
    expect(put).toMatchObject({ method: "PUT", body: "item_value=2026-10", token: TOKEN });
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
