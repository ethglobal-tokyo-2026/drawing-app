import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { openDb } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import { isHex } from "viem";
import { z } from "zod";
import { createServer } from "./app.ts";
import type { AppDeps } from "./deps.ts";
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
  STICKER_CHAIN_MODE: z.enum(["mock", "sepolia"]),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`The REST API's environment is incomplete:\n${z.prettifyError(parsed.error)}`);
}
const env = parsed.data;
if (process.env.NODE_ENV === "production" && env.STICKER_CHAIN_MODE === "mock") {
  throw new Error("Production requires STICKER_CHAIN_MODE=sepolia; mock minting is disabled");
}

// Pending migrations go in before the first query.
migrateDatabase();
mkdirSync(env.IMAGE_DIR, { recursive: true });

const db = openDb();
const images = createDiskImageStore(env.IMAGE_DIR, env.CDN_BASE_URL);
const chain = (() => {
  if (env.STICKER_CHAIN_MODE === "mock") {
    console.warn("Sticker chain mode is mock; NFTs will not be minted or transferred");
    return { mint: mintStub, giftChain: null, smartWallets: noSmartWallets };
  }
  const live = z
    .object({
      ETHEREUM_SEPOLIA_RPC_URL: z.url(),
      STICKER_NFT_ADDRESS: z.string().min(1),
      STICKER_GIFT_ESCROW_ADDRESS: z.string().min(1),
      STICKER_SEALER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      PRIVY_APP_ID: z.string().min(1),
      PRIVY_APP_SECRET: z
        .string()
        .min(1)
        .refine(
          (value) => !/^(replace-|placeholder|your[_-])/i.test(value),
          "Set the real Privy app secret",
        ),
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

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve(
  { fetch: createServer(deps, env.IMAGE_DIR).fetch, port: env.PORT, hostname: "127.0.0.1" },
  ({ port }) => {
    console.log(`REST API listening on http://127.0.0.1:${port}/api`);
  },
);
