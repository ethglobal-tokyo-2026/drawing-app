import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { openDb } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { z } from "zod";
import { createApp } from "./app.ts";
import type { AppDeps } from "./deps.ts";
import { notFound, onError } from "./errors.ts";
import { createDiskImageStore } from "./services/imageStore.ts";
import { createLineVerifier } from "./services/lineVerifier.ts";
import { mintStub } from "./services/mint.ts";
import { noSmartWallets } from "./services/smartWallets.ts";
import { mockSuiPayments } from "./services/suiPayments.ts";

// DATABASE_URL is read by @drawing-app/db.
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  LINE_CHANNEL_ID: z.string().min(1),
  IMAGE_DIR: z.string().min(1),
  CDN_BASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(8788),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`The REST API's environment is incomplete:\n${z.prettifyError(parsed.error)}`);
}
const env = parsed.data;

// Pending migrations go in before the first query.
migrateDatabase();
mkdirSync(env.IMAGE_DIR, { recursive: true });

/** A stand-in SUI/JPY price, not a market one, until the server reads a price feed. */
const MOCK_SUI_YEN = "300";

const deps: AppDeps = {
  db: openDb(),
  sessionSecret: env.SESSION_SECRET,
  clock: { now: () => new Date() },
  ids: { uuid: () => randomUUID() },
  line: createLineVerifier(env.LINE_CHANNEL_ID),
  images: createDiskImageStore(env.IMAGE_DIR, env.CDN_BASE_URL),
  mint: mintStub,
  giftChain: null,
  smartWallets: noSmartWallets,
  sui: mockSuiPayments,
  suiPrice: () => Promise.resolve(MOCK_SUI_YEN),
};

/** Where the sticker images are served; on the box, CDN_BASE_URL is the site's origin plus this. */
const IMAGES_PATH = "/api/images";
/** A year: an image's name is its content's hash, so the file never changes. */
const IMAGE_MAX_AGE_S = 365 * 24 * 60 * 60;

const server = new Hono()
  .use(
    `${IMAGES_PATH}/*`,
    serveStatic({
      root: env.IMAGE_DIR,
      rewriteRequestPath: (path) => path.slice(IMAGES_PATH.length),
      onFound: (_path, c) => {
        c.header("Cache-Control", `public, max-age=${IMAGE_MAX_AGE_S}, immutable`);
      },
    }),
  )
  .route("/", createApp(deps))
  .onError(onError)
  .notFound(notFound);

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve({ fetch: server.fetch, port: env.PORT, hostname: "127.0.0.1" }, ({ port }) => {
  console.log(`REST API listening on http://127.0.0.1:${port}/api`);
});
