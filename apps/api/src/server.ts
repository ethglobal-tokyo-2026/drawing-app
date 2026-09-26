import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { openDb } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import { isHex } from "viem";
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
import { createPrivySmartWallets } from "./services/privySmartWallets.ts";
import { createStickerChain } from "./services/stickerChain.ts";

// DATABASE_URL is read by @drawing-app/db.
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  LINE_CHANNEL_ID: z.string().min(1),
  IMAGE_DIR: z.string().min(1),
  CDN_BASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(8788),
  STICKER_CHAIN_MODE: z.enum(["mock", "sepolia"]).default("mock"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`The REST API's environment is incomplete:\n${z.prettifyError(parsed.error)}`);
}
const env = parsed.data;

// Pending migrations go in before the first query.
migrateDatabase();
mkdirSync(env.IMAGE_DIR, { recursive: true });

const db = openDb();
const images = createDiskImageStore(env.IMAGE_DIR, env.CDN_BASE_URL);

const chain = (() => {
  if (env.STICKER_CHAIN_MODE === "mock") {
    console.warn("Sticker chain mode is mock; seals will not complete in the production frontend");
    return { mint: mintStub, giftChain: null, smartWallets: noSmartWallets };
  }
  const live = z
    .object({
      ETHEREUM_SEPOLIA_RPC_URL: z.url(),
      STICKER_NFT_ADDRESS: z.string().min(1),
      STICKER_GIFT_ESCROW_ADDRESS: z.string().min(1),
      STICKER_SEALER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      PRIVY_APP_ID: z.string().min(1),
      PRIVY_APP_SECRET: z.string().min(1),
    })
    .parse(process.env);
  const smartWallets = createPrivySmartWallets({
    db,
    lineChannelId: env.LINE_CHANNEL_ID,
    privyAppId: live.PRIVY_APP_ID,
    privyAppSecret: live.PRIVY_APP_SECRET,
  });
  if (!isHex(live.STICKER_SEALER_PRIVATE_KEY)) {
    throw new Error("STICKER_SEALER_PRIVATE_KEY is not hexadecimal");
  }
  return {
    ...createStickerChain({
      rpcUrl: live.ETHEREUM_SEPOLIA_RPC_URL,
      stickerContract: live.STICKER_NFT_ADDRESS,
      escrowContract: live.STICKER_GIFT_ESCROW_ADDRESS,
      sealerPrivateKey: live.STICKER_SEALER_PRIVATE_KEY,
      smartWallets,
      images,
    }),
    smartWallets,
  };
})();

/** A stand-in SUI/JPY price, not a market one, until the server reads a price feed. */
const MOCK_SUI_YEN = "300";

const deps: AppDeps = {
  db,
  sessionSecret: env.SESSION_SECRET,
  clock: { now: () => new Date() },
  ids: { uuid: () => randomUUID() },
  line: createLineVerifier(env.LINE_CHANNEL_ID),
  images,
  mint: chain.mint,
  giftChain: chain.giftChain,
  smartWallets: chain.smartWallets,
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
