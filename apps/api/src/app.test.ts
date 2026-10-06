import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { insertUser } from "@drawing-app/db/testing";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createServer, STICKER_IMAGES_PATH } from "./app.ts";
import { validate } from "./errors.ts";
import { createDiskImageStore } from "./services/imageStore.ts";
import { setSessionCookie, type AppEnv } from "./session.ts";
import { sealImages } from "./stickers/testPngs.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";
import { fakeServerLog } from "./testing/fakes.ts";
import { insertSealedSticker } from "./testing/rows.ts";
import { bodyOf, refusalOf } from "./testing/responses.ts";

const sha256Hex = (bytes: Uint8Array) => `0x${createHash("sha256").update(bytes).digest("hex")}`;

const probeBodySchema = z.object({ handle: z.string(), placement: z.object({ x: z.number() }) });
const probeBody = { handle: "alice", placement: { x: 0.5 } };
const probeFailure = new Error("The probe route failed on purpose");

/** A tiny protected route group, standing in for a real one. */
const probeRoutes = new Hono<AppEnv>()
  .post("/", validate("json", probeBodySchema), (c) => c.json({ userId: c.var.userId }))
  .get("/failure", () => {
    throw probeFailure;
  });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
  test.app.route("/probe", probeRoutes);
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** The routes anyone can call: signing in and out. */
const PUBLIC_ROUTES = new Set(["POST /api/session", "DELETE /api/session"]);

describe("sessions", () => {
  it("guard every route but the public ones", async () => {
    const routes = new Map(
      test.app.routes
        .filter(({ method }) => method !== "ALL")
        .map(({ method, path }) => [`${method} ${path}`, { method, path }]),
    );
    for (const [route, { method, path }] of routes) {
      if (PUBLIC_ROUTES.has(route)) continue;
      const response = await test.send(method, path.replaceAll(/:\w+/g, "any"));
      expect(response.status, route).toBe(401);
      expect((await refusalOf(response)).error, route).toBe("signed_out");
    }
  });

  it("accept the signed cookie signInAs makes, and name the person", async () => {
    const userId = insertUser(test.db);
    const response = await test.send("POST", "/api/probe", { as: userId, body: probeBody });
    expect((await bodyOf(response, z.object({ userId: z.string() }))).userId).toBe(userId);
  });

  it("start with the HttpOnly cookie setSessionCookie sets", async () => {
    const userId = insertUser(test.db);
    const signIn = new Hono().post("/", async (c) => {
      await setSessionCookie(c, test.deps.sessionSecret, userId);
      return c.body(null, 204);
    });
    const setCookie = (await signIn.request("/", { method: "POST" })).headers.get("set-cookie");
    expect(setCookie).toMatch(/; HttpOnly(;|$)/);
    const [cookie = ""] = (setCookie ?? "").split(";");
    const headers = { Cookie: cookie };
    expect((await test.send("POST", "/api/probe", { headers, body: probeBody })).status).toBe(200);
  });

  it("refuse a cookie the session secret didn't sign", async () => {
    const userId = insertUser(test.db);
    const headers = { Cookie: `session=${userId}` };
    const unsigned = await test.send("POST", "/api/probe", { headers, body: probeBody });
    expect(await refusalOf(unsigned)).toMatchObject({ status: 401, error: "signed_out" });
  });

  it("aren't needed to sign in, and only there", async () => {
    const signIn = await refusalOf(await test.send("POST", "/api/session", { body: {} }));
    expect(signIn.error).not.toBe("signed_out");
    const other = await refusalOf(await test.send("GET", "/api/session"));
    expect(other.error).toBe("signed_out");
  });
});

describe("errors", () => {
  it("answer a body that fails its schema with 400 invalid_request, naming the field", async () => {
    const body = { ...probeBody, placement: { x: "left" } };
    const as = insertUser(test.db);
    const answer = await refusalOf(await test.send("POST", "/api/probe", { as, body }));
    expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
    expect(answer.detail).toContain("placement.x");
  });

  it("answer a body that isn't JSON with 400 invalid_request", async () => {
    const response = await test.app.request("/api/probe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await test.signInAs(insertUser(test.db))),
      },
      body: "{",
    });
    expect(await refusalOf(response)).toMatchObject({ status: 400, error: "invalid_request" });
  });

  it("answer an error a route didn't catch with 500 internal_error, and log it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await test.send("GET", "/api/probe/failure", { as: insertUser(test.db) });
    expect(await refusalOf(response)).toEqual({ status: 500, error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"event":"request.failed"'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(probeFailure.message));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`"requestId":"${response.headers.get("x-request-id")}"`),
    );
  });

  it("assigns its own request ID even when the client supplies one", async () => {
    const response = await test.send("POST", "/api/gifts/receive", {
      headers: { "x-request-id": "untrusted-client-value" },
      body: {},
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers.get("x-request-id")).not.toBe("untrusted-client-value");
  });

  it("logs a Receiving request's start and finish under its route's template", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const giftId = `0x${"ab".repeat(32)}`;
    const response = await test.send("POST", `/api/gifts/${giftId}/receive`, {
      as: insertUser(test.db),
    });
    const requestEvents = log.mock.calls
      .map(([line]) => z.looseObject({ event: z.string() }).parse(JSON.parse(String(line))))
      .filter(({ event }) => event.startsWith("request."));
    const route = "/api/gifts/:giftId/receive";
    expect(requestEvents).toEqual([
      expect.objectContaining({ event: "request.started", route }),
      expect.objectContaining({ event: "request.completed", route, status: response.status }),
    ]);
  });
});

describe("sticker images", () => {
  let imageDir: string;
  beforeEach(() => {
    imageDir = mkdtempSync(join(tmpdir(), "drawing-app-images-"));
  });
  afterEach(() => {
    rmSync(imageDir, { recursive: true });
  });

  const get = (path: string) => createServer(test.deps, imageDir).request(path);

  it("are served where their URLs point, without a session, cached for good", async () => {
    const pngs = sealImages();
    const store = createDiskImageStore(imageDir, `https://sticker.test${STICKER_IMAGES_PATH}`);
    const contentHash = sha256Hex(pngs.png);
    await store.save(contentHash, pngs);
    const urls = store.urls(contentHash);
    const response = await get(new URL(urls.png).pathname);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pngs.png);
    expect(response.headers.get("cache-control")).toContain("immutable");
    const webp = await get(new URL(urls.webp.sticker).pathname);
    expect(webp.status).toBe(200);
    expect(webp.headers.get("content-type")).toBe("image/webp");
    expect(webp.headers.get("cache-control")).toContain("immutable");
  });

  it("show an NSFW sticker's drawing only to an opted-in session, never publicly cached", async () => {
    const pngs = sealImages();
    const store = createDiskImageStore(imageDir, `https://sticker.test${STICKER_IMAGES_PATH}`);
    const contentHash = sha256Hex(pngs.png);
    await store.save(contentHash, pngs);
    const artistId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    insertSealedSticker(test.db, artistId, { nsfw: true, contentHash });
    const { png, flat, webp, mask } = store.urls(contentHash);
    const server = createServer(test.deps, imageDir);
    const getAs = async (url: string, userId?: string) =>
      server.request(new URL(url).pathname, {
        headers: userId === undefined ? {} : await test.signInAs(userId),
      });

    for (const url of [png, flat, webp.sticker]) {
      for (const viewer of [undefined, insertUser(test.db)]) {
        expect(await refusalOf(await getAs(url, viewer))).toMatchObject({
          status: 403,
          error: "nsfw_not_opted_in",
        });
      }
      const optedIn = await getAs(url, artistId);
      expect(optedIn.status).toBe(200);
      expect(optedIn.headers.get("cache-control")).toMatch(/^private,/);
    }
    // The cut's shape shows no drawing, so its mask stays public.
    expect((await getAs(mask)).headers.get("cache-control")).toMatch(/^public,/);
  });

  it("answer a name with no image with 404, not the session check, and uncached", async () => {
    const response = await get(`${STICKER_IMAGES_PATH}/${sha256Hex(new Uint8Array([9]))}.png`);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 404, error: "image_not_found" });
  });
});

describe("the server log", () => {
  it("is served whole, as text, without a session", async () => {
    const log = `2026-09-27T00:36:41+0900 box drawing-api[7]: {"event":"nft.mint.started"}\n`;
    const server = createServer({ ...test.deps, serverLog: fakeServerLog(log) }, tmpdir());
    const response = await server.request("/api/logs");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await response.text()).toBe(log);
  });
});
