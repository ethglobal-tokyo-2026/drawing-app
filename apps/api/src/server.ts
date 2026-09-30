import { randomUUID } from "node:crypto";
import { openDb } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { z } from "zod";
import { createServer } from "./app.ts";
import {
  chatMenuFromEnvironment,
  messagingChannelFromEnvironment,
} from "./chatMenu/fromEnvironment.ts";
import { startMidnightBatches } from "./chatMenu/midnight.ts";
import type { AppDeps, EnsDeps } from "./deps.ts";
import { logInfo } from "./diagnostics.ts";
import { createNamingQueue } from "./ens/naming.ts";
import { startExpiredGiftReturns } from "./gifts/expiry.ts";
import { giverNoticeFor, startGiverNoticeSweeps } from "./gifts/giverNotice.ts";
import { chooseLineVerifier } from "./services/devSignIn.ts";
import { createDiskImageStore } from "./services/imageStore.ts";
import { journalLog } from "./services/journal.ts";
import { createLineVerifier } from "./services/lineVerifier.ts";
import { mockChain } from "./services/mockChain.ts";
import { createJpycPayments } from "./services/jpycPayments.ts";
import { createPrivySmartWallets } from "./services/privySmartWallets.ts";
import { createStickerChain } from "./services/stickerChain.ts";
import { createWorldId } from "./services/worldId.ts";

/** A private key as viem takes one: 0x and 64 hexadecimal digits. */
const privateKeySchema = z.custom<Hex>(
  (v) => typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v),
  "Expected 0x and 64 hexadecimal digits",
);

// DATABASE_URL is read by @drawing-app/db.
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  LINE_CHANNEL_ID: z.string().min(1),
  IMAGE_DIR: z.string().min(1),
  CDN_BASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(8788),
  STICKER_CHAIN_MODE: z.enum(["mock", "sepolia"]),
  // Empty is how .env switches off what .env.example switches on.
  DEV_SIGN_IN: z.enum(["on", "off", ""]).optional(),
  // The ticket shop's JPYC and payment contract on Sui.
  SUI_NETWORK: z.enum(["testnet", "mainnet", "devnet"]),
  JPYC_COIN_TYPE: z.string().regex(/^0x[0-9a-f]{64}::[A-Za-z_]\w*::[A-Za-z_]\w*$/),
  JPYC_DECIMALS: z.coerce.number().int().nonnegative(),
  JPYC_PAYMENT_PACKAGE: z.string().regex(/^0x[0-9a-f]{64}$/),
  JPYC_PAYMENT_VAULT: z.string().regex(/^0x[0-9a-f]{64}$/),
  // The Messaging API channel's ID and secret, for the chat menu and the giver's messages, and
  // deploy/line/menus.json. Without the channel, both are off.
  LINE_MESSAGING_CHANNEL_ID: z.string().optional(),
  LINE_MESSAGING_CHANNEL_SECRET: z.string().optional(),
  LINE_CHAT_MENUS_FILE: z.string().optional(),
  // Age verification's World ID app, from the Developer Portal. Without all three, it's off.
  WORLD_ID_APP_ID: z
    .custom<`app_${string}`>((v) => typeof v === "string" && /^app_\w+$/.test(v), "Expected app_…")
    .optional(),
  WORLD_ID_RP_ID: z
    .string()
    .regex(/^rp_\w+$/)
    .optional(),
  WORLD_ID_SIGNING_KEY: z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]{64}$/)
    .optional(),
  // staging takes proofs from World's simulator, https://simulator.worldcoin.org
  WORLD_ID_ENVIRONMENT: z.enum(["production", "staging"]).default("production"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`The REST API's environment is incomplete:\n${z.prettifyError(parsed.error)}`);
}
const env = parsed.data;

// Pending migrations go in before the first query.
migrateDatabase();

const db = openDb();
const images = createDiskImageStore(env.IMAGE_DIR, env.CDN_BASE_URL);
const chain = (() => {
  if (env.STICKER_CHAIN_MODE === "mock") {
    console.warn("Sticker chain mode is mock; NFTs will not be minted or transferred");
    return mockChain;
  }
  const live = z
    .object({
      // One URL, or several separated by commas, tried in turn.
      ETHEREUM_SEPOLIA_RPC_URL: z
        .string()
        .refine((value) => value.split(",").every((url) => URL.canParse(url.trim())), {
          message: "Expected a URL, or URLs separated by commas",
        }),
      STICKER_NFT_ADDRESS: z.string().min(1),
      STICKER_GIFT_ESCROW_ADDRESS: z.string().min(1),
      STICKER_SEALER_PRIVATE_KEY: privateKeySchema,
      CROQUIS_NAMES_ADDRESS: z.string().min(1),
      CROQUIS_RESOLVER_ADDRESS: z.string().min(1),
      ENS_GATEWAY_PRIVATE_KEY: privateKeySchema,
      // The LIFF app's link, https://liff.line.me/<LIFF ID>: a person's name links to their board.
      APP_LINK_BASE: z.url(),
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
  const { mint, giftChain, nameWriter } = createStickerChain({
    rpcUrl: live.ETHEREUM_SEPOLIA_RPC_URL,
    stickerContract: live.STICKER_NFT_ADDRESS,
    escrowContract: live.STICKER_GIFT_ESCROW_ADDRESS,
    namesContract: live.CROQUIS_NAMES_ADDRESS,
    sealerPrivateKey: live.STICKER_SEALER_PRIVATE_KEY,
    smartWallets,
    images,
  });
  const ens: EnsDeps = {
    resolverAddress: live.CROQUIS_RESOLVER_ADDRESS,
    gatewaySigner: privateKeyToAccount(live.ENS_GATEWAY_PRIVATE_KEY),
    appLinkBase: live.APP_LINK_BASE.replace(/\/$/, ""),
    chainId: sepolia.id,
    stickerContract: live.STICKER_NFT_ADDRESS,
    writer: nameWriter,
    naming: createNamingQueue(),
  };
  return { mint, giftChain, smartWallets, ens };
})();

const worldId = (() => {
  const { WORLD_ID_APP_ID: appId, WORLD_ID_RP_ID: rpId, WORLD_ID_SIGNING_KEY: signingKey } = env;
  if (!appId && !rpId && !signingKey) {
    console.warn("No World ID app is configured; age verification is off");
    return null;
  }
  if (!appId || !rpId || !signingKey) {
    throw new Error(
      "Age verification needs WORLD_ID_APP_ID, WORLD_ID_RP_ID and WORLD_ID_SIGNING_KEY",
    );
  }
  return createWorldId({
    appId,
    rpId,
    signingKey,
    environment: env.WORLD_ID_ENVIRONMENT,
  });
})();

const clock = { now: () => new Date() };
const messaging = messagingChannelFromEnvironment({
  devSignIn: env.DEV_SIGN_IN,
  channelId: env.LINE_MESSAGING_CHANNEL_ID,
  channelSecret: env.LINE_MESSAGING_CHANNEL_SECRET,
});
const chatMenu = chatMenuFromEnvironment({
  db,
  clock,
  channel: messaging,
  menusFile: env.LINE_CHAT_MENUS_FILE,
});
const giverNotice = giverNoticeFor(messaging, { db, clock });

const deps: AppDeps = {
  db,
  sessionSecret: env.SESSION_SECRET,
  clock,
  ids: { uuid: () => randomUUID() },
  line: chooseLineVerifier(env.DEV_SIGN_IN, createLineVerifier(env.LINE_CHANNEL_ID)),
  images,
  ...chain,
  ticketPayments: createJpycPayments({
    network: env.SUI_NETWORK,
    coinType: env.JPYC_COIN_TYPE,
    decimals: env.JPYC_DECIMALS,
    paymentPackage: env.JPYC_PAYMENT_PACKAGE,
    vault: env.JPYC_PAYMENT_VAULT,
  }),
  serverLog: journalLog,
  lineChatMenu: chatMenu.lineChatMenu,
  giverNotice,
  worldId,
};

logInfo("api.configured", { mode: env.STICKER_CHAIN_MODE });

// The chat menu's batch at each midnight, Tokyo time, and today's now if it hasn't run.
if (chatMenu.on) {
  startMidnightBatches({ db, clock, ...chatMenu.on, chatMenu: chatMenu.lineChatMenu });
}

// The giver's messages that failed, retried from boot on.
if (messaging.line) startGiverNoticeSweeps(giverNotice);

// Gifts the escrow still holds past their expiry go back to their givers: now, for what downtime
// left, then just after each midnight, Tokyo time.
startExpiredGiftReturns(deps);

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve(
  { fetch: createServer(deps, env.IMAGE_DIR).fetch, port: env.PORT, hostname: "127.0.0.1" },
  ({ port }) => {
    console.log(`REST API listening on http://127.0.0.1:${port}/api`);
  },
);
