import { users, type Db } from "@drawing-app/db";
import { bytes32 } from "@drawing-app/db/testing";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { eq } from "drizzle-orm";
import type { CdnPurge, Ids, ImageStore, ServerLog, TicketPaymentTarget } from "../deps.ts";
import { createDevLineVerifier } from "../services/devSignIn.ts";
import { imageUrls } from "../services/imageStore.ts";
import type { StickerPngKind } from "../shapes.ts";
import type { SuiWallets } from "../sui/types.ts";

/** A clock that stands still until the test moves it. It starts at noon in Tokyo, far from midnight. */
export function fakeClock(start = new Date("2026-09-26T03:00:00.000Z")) {
  let now = start.getTime();
  return {
    now: () => new Date(now),
    set: (date: Date) => {
      now = date.getTime();
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

/** UUIDs counting up from …0001. */
export function sequentialIds() {
  let made = 0;
  return {
    uuid: () => `00000000-0000-4000-8000-${String(++made).padStart(12, "0")}`,
  } satisfies Ids;
}

/** LINE, as dev sign-in stands in for it: devAccessToken's tokens name their profile, and any other is refused. */
export const fakeLineVerifier = createDevLineVerifier;

/**
 * Keeps saved images in memory, by content hash; like the disk store, the first save stays. The box
 * serves them on box.test, and the CDN in front of it on cdn.test.
 */
export function fakeImageStore() {
  const saved = new Map<string, Record<StickerPngKind, Uint8Array>>();
  const savedSharp = new Map<string, Uint8Array>();
  const store: ImageStore = {
    save: (contentHash, pngs, sharp) => {
      if (!saved.has(contentHash)) saved.set(contentHash, pngs);
      if (sharp && !savedSharp.has(contentHash)) savedSharp.set(contentHash, sharp);
      return Promise.resolve();
    },
    saveVeiled: (contentHash) =>
      saved.has(contentHash)
        ? Promise.resolve(bytes32(`veiled ${contentHash}`))
        : Promise.reject(new Error(`No images are saved under ${contentHash}`)),
    ...imageUrls("https://box.test/api/images"),
  };
  return { ...store, saved, savedSharp };
}

/** The Sui wallet the fakes give a person: made from their user id, as Privy's lookup answers it. */
export const fakeSuiAddress = (userId: string) => bytes32(`sui wallet ${userId}`);

/**
 * Gives everyone a Privy Sui wallet: an Ed25519 key made for them on first use, whose address the
 * lookup answers and, with the app's database, stores as the real one does. People in `without` have
 * none yet. `keyOf` signs as a person's wallet.
 */
export function fakeSuiWallets(db?: Db) {
  const keys = new Map<string, Ed25519Keypair>();
  const without = new Set<string>();
  const keyOf = (userId: string) => {
    const key = keys.get(userId) ?? Ed25519Keypair.generate();
    keys.set(userId, key);
    return key;
  };
  const wallets: SuiWallets = {
    addressFor: (userId) => {
      if (without.has(userId)) return Promise.resolve(null);
      const address = keyOf(userId).toSuiAddress();
      db?.update(users).set({ suiAddress: address }).where(eq(users.id, userId)).run();
      return Promise.resolve(address);
    },
  };
  return { ...wallets, keyOf, without };
}

/** A made-up JPYC payment contract on Sui. */
export const TEST_PAYMENT_TARGET: TicketPaymentTarget = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};

/** The CDN's purge: keeps every URL it's asked to purge, and answers `purged`, which a test may change. */
export function fakeCdnPurge(purged = true) {
  const fake: CdnPurge & { urls: string[]; purged: boolean } = {
    urls: [],
    purged,
    purge: (asked) => {
      fake.urls.push(...asked);
      return Promise.resolve(fake.purged);
    },
  };
  return fake;
}

/** A server log that reads `text`. */
export const fakeServerLog =
  (text = ""): ServerLog =>
  () =>
    Promise.resolve(new Blob([text]).stream());
