import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { stickers } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { serve } from "@hono/node-server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createServer, STICKER_IMAGES_PATH } from "./app.ts";
import { validate } from "./errors.ts";
import { createDiskImageStore } from "./services/imageStore.ts";
import { setSessionCookie, type AppEnv } from "./session.ts";
import type { StickerImages } from "./shapes.ts";
import { markNsfwResponseSchema } from "./stickers/markNsfw.ts";
import { sweepCdnPurges } from "./stickers/nsfwDrawing.ts";
import { sealImages, sharpImage } from "./stickers/testPngs.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";
import { fakeCdnPurge, fakeServerLog } from "./testing/fakes.ts";
import { captureLogLines } from "./testing/logLines.ts";
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
      await setSessionCookie(c, test.deps, userId);
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

  /** Where the box serves the images. */
  const base = `https://sticker.test${STICKER_IMAGES_PATH}`;

  /** A disk store with a new sticker's images saved in it, under their content hash. */
  async function savedImages() {
    const pngs = sealImages();
    const store = createDiskImageStore(imageDir, base);
    const contentHash = sha256Hex(pngs.png);
    await store.save(contentHash, pngs, sharpImage());
    return { store, pngs, contentHash };
  }

  /** Every URL among a sticker's images. */
  const urlsIn = ({ webp, sharp, ...pngs }: StickerImages) => [
    ...Object.values(pngs),
    ...Object.values(webp),
    ...(sharp ? [sharp.png, sharp.webp] : []),
  ];

  /** The URLs among a stored sticker's images that show its drawing: the files a save writes. */
  const storedDrawing = (store: ReturnType<typeof createDiskImageStore>, contentHash: string) => {
    const drawing = store.drawingUrls(contentHash);
    return urlsIn(store.urls(contentHash)).filter((url) => drawing.includes(url));
  };

  /** Asserts the server answers `url`'s path to anyone, cached for good. */
  async function expectPublic(url: string) {
    const response = await get(new URL(url).pathname);
    expect(response.status, url).toBe(200);
    expect(response.headers.get("cache-control"), url).toMatch(/^public,.*immutable/);
    return response;
  }

  it("load from the box's folder, answered without a session and cached for good", async () => {
    const { store, pngs, contentHash } = await savedImages();
    const urls = store.urls(contentHash);
    for (const url of urlsIn(urls)) {
      expect(url.startsWith(`${base}/`), url).toBe(true);
      await expectPublic(url);
    }
    const png = await expectPublic(urls.png);
    expect(new Uint8Array(await png.arrayBuffer())).toEqual(pngs.png);
    const webp = await expectPublic(urls.webp.sticker);
    expect(webp.headers.get("content-type")).toBe("image/webp");
  });

  it("show an NSFW sticker's drawing only to an opted-in session, never publicly cached", async () => {
    const { store, contentHash } = await savedImages();
    const artistId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    insertSealedSticker(test.db, artistId, { nsfw: true, contentHash });
    const server = createServer(test.deps, imageDir);
    const getAs = async (url: string, userId?: string) =>
      server.request(new URL(url).pathname, {
        headers: userId === undefined ? {} : await test.signInAs(userId),
      });
    const urls = store.urls(contentHash);
    const drawing = storedDrawing(store, contentHash);
    expect(drawing).toEqual(
      expect.arrayContaining([urls.png, urls.flat, urls.webp.sticker, urls.sharp?.png]),
    );
    expect(drawing).toContain(urls.sharp?.webp);

    // Every name the drawing was ever shown at, stored or not, the WebPs that showed the dome too.
    for (const url of store.drawingUrls(contentHash)) {
      for (const viewer of [undefined, insertUser(test.db)]) {
        const refused = await getAs(url, viewer);
        expect(await refusalOf(refused)).toMatchObject({ status: 403, error: "nsfw_not_opted_in" });
      }
    }
    for (const url of drawing) {
      const optedIn = await getAs(url, artistId);
      expect(optedIn.status).toBe(200);
      expect(optedIn.headers.get("cache-control")).toMatch(/^private,/);
    }
    // The rest, such as the cut's mask, show no drawing, so they stay public.
    for (const url of urlsIn(urls).filter((url) => !drawing.includes(url))) {
      await expectPublic(url);
    }
  });

  it("answer a stored file's path in any form but its name with 404, as the server receives it", async () => {
    const { store, contentHash } = await savedImages();
    const path = new URL(store.urls(contentHash).png).pathname;
    const app = createServer(test.deps, imageDir);
    const { port, close } = await new Promise<{ port: number; close: () => void }>((resolve) => {
      const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, (address) =>
        resolve({ port: address.port, close: () => server.close() }),
      );
    });
    // Sent as written: fetch would resolve the dot segments first, as the CDN doesn't.
    const statusOf = (sent: string) =>
      new Promise<number | undefined>((resolve, reject) => {
        const asked = request({ host: "127.0.0.1", port, path: sent }, (response) => {
          response.resume();
          resolve(response.statusCode);
        });
        asked.on("error", reject).end();
      });
    try {
      expect(await statusOf(path)).toBe(200);
      const variants = [
        path.replace(/\.png$/, "%2Epng"),
        path.replace(/\.png$/, "%2epng"),
        path.replace("/0x", "/%30x"),
        path.replace(`${STICKER_IMAGES_PATH}/`, `${STICKER_IMAGES_PATH}/x/../`),
        path.replace(`${STICKER_IMAGES_PATH}/`, `${STICKER_IMAGES_PATH}//`),
      ];
      for (const variant of variants) expect(await statusOf(variant), variant).toBe(404);
    } finally {
      close();
    }
  });

  it("make a stored sticker's missing display WebPs from its PNGs as they're asked for", async () => {
    const { store, contentHash } = await savedImages();
    insertSealedSticker(test.db, insertUser(test.db), { contentHash, hasSharpCopy: true });
    const { webp, sharp } = store.urls(contentHash);
    const files = [webp.sticker, sharp?.webp ?? ""].map((url) => new URL(url).pathname);
    const made = files.map((path) => readFileSync(join(imageDir, basename(path))));
    for (const path of files) unlinkSync(join(imageDir, basename(path)));
    const server = createServer({ ...test.deps, images: store }, imageDir);
    const answers = await Promise.all(
      [...files, ...files].map(async (path) =>
        Buffer.from(await (await server.request(path)).arrayBuffer()),
      ),
    );
    expect(answers).toEqual([...made, ...made]);
  });

  it("answer a name with no image with 404, not the session check, and uncached", async () => {
    const response = await get(`${STICKER_IMAGES_PATH}/${sha256Hex(new Uint8Array([9]))}.png`);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(await refusalOf(response)).toMatchObject({ status: 404, error: "image_not_found" });
  });

  describe("once a sticker that shows them is marked 18+", () => {
    /**
     * Alice's sticker, sealed from a new drawing whose files the box serves, and a server whose CDN
     * purge keeps what it's asked. `mark` marks a sticker 18+ through the server's own route.
     */
    async function aliceSealed() {
      const { store, pngs, contentHash } = await savedImages();
      // The API's own store makes the veil from them.
      await test.images.save(contentHash, pngs);
      const purge = fakeCdnPurge();
      const deps = { ...test.deps, cdnPurge: purge };
      const server = createServer(deps, imageDir);
      const aliceId = insertUser(test.db);
      const aliceSticker = insertSealedSticker(test.db, aliceId, { contentHash });
      const mark = async (userId: string, stickerId: string) =>
        bodyOf(
          await server.request(`/api/stickers/${stickerId}/nsfw`, {
            method: "POST",
            headers: await test.signInAs(userId),
          }),
          markNsfwResponseSchema,
        );
      return {
        store,
        contentHash,
        purge,
        aliceId,
        aliceSticker,
        mark,
        sweep: () => sweepCdnPurges(deps),
        drawing: storedDrawing(store, contentHash),
      };
    }

    it("stay public, and purge nothing, while another sticker that isn't marked shows the drawing", async () => {
      const logs = captureLogLines();
      const scene = await aliceSealed();
      const malloryId = insertUser(test.db);
      const copy = insertSealedSticker(test.db, malloryId, { contentHash: scene.contentHash });
      const marked = await scene.mark(malloryId, copy);
      for (const url of scene.drawing) await expectPublic(url);
      await scene.sweep();
      expect(scene.purge.urls).toEqual([]);
      expect(marked).toMatchObject({ sticker: { nsfw: true }, cdnPurged: false });
      logs.expectLogged("cdn.purge.skipped", { stickerId: copy });
    });

    it("go private, and are purged, when no other sticker shows the drawing", async () => {
      const scene = await aliceSealed();
      expect(await scene.mark(scene.aliceId, scene.aliceSticker)).toMatchObject({
        cdnPurged: true,
      });
      for (const url of scene.drawing) {
        const refused = await get(new URL(url).pathname);
        expect(await refusalOf(refused)).toMatchObject({ status: 403, error: "nsfw_not_opted_in" });
      }
      const purged = test.images.drawingUrls(scene.contentHash);
      expect(scene.purge.urls.toSorted()).toEqual(purged.toSorted());
      const { sharp } = test.images.urls(scene.contentHash);
      expect(scene.purge.urls).toEqual(expect.arrayContaining([sharp?.png, sharp?.webp]));
    });

    it("leave a veil public, and purge nothing, when someone seals it as their own and marks that 18+", async () => {
      const scene = await aliceSealed();
      await scene.mark(scene.aliceId, scene.aliceSticker);
      const veiledHash = test.db
        .select({ veiledHash: stickers.veiledHash })
        .from(stickers)
        .where(eq(stickers.id, scene.aliceSticker))
        .get()?.veiledHash;
      if (!veiledHash) throw new Error("Alice's mark left her sticker without its veil");
      // Mallory seals the veil's PNG, public as every veil is: the box stores it, and the API's store
      // makes the mark's own veil from it.
      await scene.store.save(veiledHash, sealImages());
      await test.images.save(veiledHash, sealImages());
      const malloryId = insertUser(test.db);
      const copy = insertSealedSticker(test.db, malloryId, { contentHash: veiledHash });
      const purgedBefore = [...scene.purge.urls];

      const marked = await scene.mark(malloryId, copy);
      await scene.sweep();
      expect(marked).toMatchObject({ sticker: { nsfw: true }, cdnPurged: false });
      expect(scene.purge.urls).toEqual(purgedBefore);
      const veil = scene.store.veiledUrls(scene.contentHash, veiledHash);
      for (const url of [veil.png, veil.webp.sticker]) await expectPublic(url);
    });
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
