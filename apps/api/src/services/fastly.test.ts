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
