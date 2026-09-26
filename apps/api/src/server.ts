import { randomUUID } from "node:crypto";
import { openDb } from "@drawing-app/db";
import { serve } from "@hono/node-server";
import { z } from "zod";
import { createApp } from "./app.ts";
import type { AppDeps } from "./deps.ts";
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
};

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve({ fetch: createApp(deps).fetch, port: env.PORT, hostname: "127.0.0.1" }, ({ port }) => {
  console.log(`REST API listening on http://127.0.0.1:${port}/api`);
});
