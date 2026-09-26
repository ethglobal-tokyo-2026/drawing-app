import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { openDb } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import { z } from "zod";
import { createServer } from "./app.ts";
import type { AppDeps } from "./deps.ts";
import { chooseLineVerifier } from "./services/devSignIn.ts";
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
  // Empty is how .env switches off what .env.example switches on.
  DEV_SIGN_IN: z.enum(["on", "off", ""]).optional(),
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
  line: chooseLineVerifier(env.DEV_SIGN_IN, createLineVerifier(env.LINE_CHANNEL_ID)),
  images: createDiskImageStore(env.IMAGE_DIR, env.CDN_BASE_URL),
  mint: mintStub,
  giftChain: null,
  smartWallets: noSmartWallets,
  sui: mockSuiPayments,
  suiPrice: () => Promise.resolve(MOCK_SUI_YEN),
};

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve(
  { fetch: createServer(deps, env.IMAGE_DIR).fetch, port: env.PORT, hostname: "127.0.0.1" },
  ({ port }) => {
    console.log(`REST API listening on http://127.0.0.1:${port}/api`);
  },
);
