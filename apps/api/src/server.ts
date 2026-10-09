import { randomUUID } from "node:crypto";
import { openDb, stickers } from "@drawing-app/db";
import { migrateDatabase } from "@drawing-app/db/migrate";
import { serve } from "@hono/node-server";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { z } from "zod";
import { createServer, STICKER_IMAGES_PATH } from "./app.ts";
import {
  chatMenuFromEnvironment,
  messagingChannelFromEnvironment,
} from "./chatMenu/fromEnvironment.ts";
import { startCdnCap, type TellOperator } from "./cdn/cdnCap.ts";
import { startMidnightBatches } from "./chatMenu/midnight.ts";
import type { AppDeps } from "./deps.ts";
import { logFailure, logInfo } from "./diagnostics.ts";
import { startExpiredGiftReturns } from "./gifts/expiry.ts";
import { giverNoticeFor, startGiverNoticeSweeps } from "./gifts/giverNotice.ts";
import { chooseLineVerifier } from "./services/devSignIn.ts";
import { createFastlyCdn, createFastlyPurge } from "./services/fastly.ts";
import { createShinamiGasStation } from "./services/gasStation.ts";
import { createDiskImageStore, makeMissingDisplayWebps } from "./services/imageStore.ts";
import { journalLog } from "./services/journal.ts";
import { retryKeyFor } from "./services/lineMessaging.ts";
import { createLineVerifier } from "./services/lineVerifier.ts";
import { mockChain } from "./services/mockChain.ts";
import { createPrivySuiWallets } from "./services/privySuiWallets.ts";
import { createSuiChain } from "./services/suiChain.ts";
import { startMintCatchUp } from "./stickers/mint.ts";
import { startCdnPurgeSweeps } from "./stickers/nsfwDrawing.ts";
import { suiIdSchema } from "./shapes.ts";
import { startChainChecks } from "./sui/chainCheck.ts";
import { startTicketPurchaseSweeps } from "./tickets/purchaseSweep.ts";

/** A secret the examples leave as a placeholder. */
const secretSchema = z
  .string()
  .min(1)
  .refine((value) => !/^(replace-|placeholder|your[_-])/i.test(value), "Set the real secret");

// DATABASE_URL is read by @drawing-app/db.
const envSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  LINE_CHANNEL_ID: z.string().min(1),
  IMAGE_DIR: z.string().min(1),
  // Where the sticker images load from: the box's, through Fastly in front of the site on the box. The
  // path alone loads them from whichever origin the app was opened on, as behind a demo's tunnel.
  IMAGE_BASE_URL: z.union([z.url(), z.literal(STICKER_IMAGES_PATH)], {
    error: `Expected an absolute URL, or ${STICKER_IMAGES_PATH}`,
  }),
  PORT: z.coerce.number().int().positive().default(8788),
  STICKER_CHAIN_MODE: z.enum(["mock", "sui"]),
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
  // Who the CDN cap tells in LINE, from the Official account: the operator's user ID, as the channel's
  // Basic settings show it.
  OPERATOR_LINE_USER_ID: z
    .string()
    .regex(/^U[0-9a-f]{32}$/, "Expected a LINE user ID")
    .optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`The REST API's environment is incomplete:\n${z.prettifyError(parsed.error)}`);
}
const env = parsed.data;

// Pending migrations go in before the first query.
migrateDatabase();

const db = openDb();
const images = createDiskImageStore(env.IMAGE_DIR, env.IMAGE_BASE_URL);
const ticketPayment = {
  network: env.SUI_NETWORK,
  coinType: env.JPYC_COIN_TYPE,
  decimals: env.JPYC_DECIMALS,
  paymentPackage: env.JPYC_PAYMENT_PACKAGE,
  vault: env.JPYC_PAYMENT_VAULT,
};
const chain = (() => {
  if (env.STICKER_CHAIN_MODE === "mock") {
    console.warn("Sticker chain mode is mock; nothing is minted or given on Sui");
    return mockChain;
  }
  const live = z
    .object({
      SUI_SERVER_PRIVATE_KEY: secretSchema.refine((value) => value.startsWith("suiprivkey1"), {
        message: "Expected a suiprivkey1… key",
      }),
      SHINAMI_ACCESS_KEY: secretSchema,
      SUI_STICKER_PACKAGE: suiIdSchema,
      SUI_STICKER_REGISTRY: suiIdSchema,
      SUI_SERVER_CONFIG: suiIdSchema,
      SUI_GIFT_ESCROW: suiIdSchema,
      PRIVY_APP_ID: z.string().min(1),
      PRIVY_APP_SECRET: secretSchema,
    })
    .parse(process.env);
  const sui = createSuiChain({
    client: new SuiGrpcClient({
      network: env.SUI_NETWORK,
      baseUrl: `https://fullnode.${env.SUI_NETWORK}.sui.io:443`,
    }),
    serverPrivateKey: live.SUI_SERVER_PRIVATE_KEY,
    stickerPackage: live.SUI_STICKER_PACKAGE,
    stickerRegistry: live.SUI_STICKER_REGISTRY,
    serverConfig: live.SUI_SERVER_CONFIG,
    giftEscrow: live.SUI_GIFT_ESCROW,
    payment: ticketPayment,
  });
  const gasStation = createShinamiGasStation({ accessKey: live.SHINAMI_ACCESS_KEY });
  const suiWallets = createPrivySuiWallets({
    db,
    lineChannelId: env.LINE_CHANNEL_ID,
    privyAppId: live.PRIVY_APP_ID,
    privyAppSecret: live.PRIVY_APP_SECRET,
  });
  return { sui, gasStation, suiWallets };
})();

// Fastly's service in front of the site, with its API token and the IDs of the service and its
// croquis_cdn dictionary: the CDN cap watches it, and an 18+ mark purges the drawing from it. Without
// any of them, as in development, both are off.
const fastly = (() => {
  const keys = ["FASTLY_API_TOKEN", "FASTLY_SERVICE_ID", "FASTLY_CAP_DICTIONARY_ID"];
  if (keys.every((key) => !process.env[key])) return null;
  const fastlyIdSchema = z.string().regex(/^[A-Za-z0-9]{22}$/, "Expected a Fastly ID");
  const settings = z
    .object({
      FASTLY_API_TOKEN: secretSchema,
      FASTLY_SERVICE_ID: fastlyIdSchema,
      FASTLY_CAP_DICTIONARY_ID: fastlyIdSchema,
    })
    .parse(process.env);
  return {
    cdn: createFastlyCdn({
      token: settings.FASTLY_API_TOKEN,
      serviceId: settings.FASTLY_SERVICE_ID,
      dictionaryId: settings.FASTLY_CAP_DICTIONARY_ID,
    }),
    cdnPurge: createFastlyPurge({ token: settings.FASTLY_API_TOKEN }),
  };
})();

// A purge names each drawing by its absolute URL, so a path would leave 18+ drawings in Fastly's caches.
if (fastly && !URL.canParse(env.IMAGE_BASE_URL)) {
  throw new Error("IMAGE_BASE_URL must be an absolute URL while Fastly's settings are set");
}

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
  ticketPayment,
  serverLog: journalLog,
  lineChatMenu: chatMenu.lineChatMenu,
  giverNotice,
  cdnPurge: fastly?.cdnPurge ?? null,
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

// Stickers still without their Sui object, from a mint that failed at Sealing, are minted to their
// Original Artists: now, then just after each midnight, Tokyo time.
startMintCatchUp(deps);

// Ticket payments still open, followed on Sui: now, then every few minutes.
startTicketPurchaseSweeps(deps);

// The package's objects, the server's address and Shinami's fund, checked: now, then just after each
// midnight, Tokyo time.
startChainChecks(deps);

// Fastly's usage this month, checked now and then every few minutes: the operator hears in LINE, and
// the site pauses before Fastly would bill.
const tellOperator: TellOperator = async (text, key) => {
  if (!messaging.line || !env.OPERATOR_LINE_USER_ID) {
    throw new Error(
      "No one to tell in LINE: OPERATOR_LINE_USER_ID or the Messaging API channel is unset",
    );
  }
  await messaging.line.pushText(env.OPERATOR_LINE_USER_ID, text, retryKeyFor(key));
};
if (fastly) {
  if (!messaging.line || !env.OPERATOR_LINE_USER_ID) {
    logFailure(
      "cdn.cap.no_operator",
      new Error("The CDN cap can pause the site, but has no one to tell in LINE"),
      { reason: "OPERATOR_LINE_USER_ID or the Messaging API channel is unset" },
    );
  }
  startCdnCap({ cdn: fastly.cdn, clock, tellOperator });
  // The CDN purges an 18+ mark made due that failed, or that a restart cut off: retried now, then
  // every few minutes.
  startCdnPurgeSweeps(deps);
} else {
  logInfo("cdn.cap.off", { reason: "no Fastly settings" });
  logInfo("cdn.purge.off", { reason: "no Fastly settings" });
}

// The WebP files stored stickers lack, such as a display copy under a new name, made from their PNGs
// on disk, in the background: until each is made, its URL is a 404.
void makeMissingDisplayWebps(
  images,
  db
    .selectDistinct({
      contentHash: stickers.contentHash,
      veiledHash: stickers.veiledHash,
      hasSharpCopy: stickers.hasSharpCopy,
    })
    .from(stickers)
    .all(),
);

// Only a proxy on this machine reaches it: Vite's in development, HAProxy's on the box.
serve(
  { fetch: createServer(deps, env.IMAGE_DIR).fetch, port: env.PORT, hostname: "127.0.0.1" },
  ({ port }) => {
    console.log(`REST API listening on http://127.0.0.1:${port}/api`);
  },
);
