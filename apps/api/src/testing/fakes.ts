import type {
  EnsDeps,
  EscrowGift,
  GiftChain,
  Ids,
  ImageStore,
  Mint,
  MintedToken,
  NameWriter,
  ServerLog,
  SmartWallets,
  JpycPayment,
  TicketPayments,
  TicketPaymentTarget,
} from "../deps.ts";
import { keccak256 } from "../keccak256.ts";
import { createDevLineVerifier } from "../services/devSignIn.ts";
import { stickerImageUrls } from "../services/imageStore.ts";
import type { StickerImages } from "../shapes.ts";
import { isHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createNamingQueue } from "../ens/naming.ts";

/** A made-up 32-byte hex value, the same for the same seed. */
const fakeBytes32 = (seed: string) => keccak256(new TextEncoder().encode(seed));
/** A made-up address, the same for the same seed. */
const fakeAddress = (seed: string) => fakeBytes32(seed).slice(0, 42);

/** A clock that stands still until the test moves it. It starts at noon in Tokyo, far from 4:00. */
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

/** LINE, as dev sign-in stands in for it: devIdToken's tokens name their profile, and any other is refused. */
export const fakeLineVerifier = createDevLineVerifier;

/** Keeps saved images in memory, by content hash; like the disk store, the first save stays. */
export function fakeImageStore(cdnBaseUrl = "https://cdn.test") {
  const saved = new Map<string, Record<keyof StickerImages, Uint8Array>>();
  const store: ImageStore = {
    save: (contentHash, pngs) => {
      if (!saved.has(contentHash)) saved.set(contentHash, pngs);
      return Promise.resolve();
    },
    urls: (contentHash) => stickerImageUrls(cdnBaseUrl, contentHash),
  };
  return { ...store, saved };
}

/** Mints each sticker once, with token IDs counting up from 1. `minted` holds each sticker's token. */
export function fakeMint() {
  const minted = new Map<string, MintedToken>();
  const mint: Mint = ({ stickerId }) => {
    const token = minted.get(stickerId) ?? {
      tokenId: String(minted.size + 1),
      txHash: fakeBytes32(`mint ${stickerId}`),
    };
    minted.set(stickerId, token);
    return Promise.resolve(token);
  };
  return Object.assign(mint, { minted });
}

/** What the escrow's gifts(giftId) returns for a gift it has never held: Solidity's zero values. */
const missingEscrowGift = (): EscrowGift => ({
  sender: `0x${"0".repeat(40)}`,
  recipient: `0x${"0".repeat(40)}`,
  tokenId: "0",
  claimCommitment: `0x${"0".repeat(64)}`,
  expiresAt: new Date(0),
  status: "missing",
});

/**
 * Chain mode without a chain. The escrow holds what the test puts in `escrow`; any other gift reads
 * as missing, as before its deposit lands.
 */
export function fakeGiftChain() {
  const escrow = new Map<string, EscrowGift>();
  const claimTransactions = new Map<string, string>();
  let claims = 0;
  const chain: GiftChain = {
    createGiftClaim: () => {
      claims += 1;
      const giftClaimToken = fakeBytes32(`gift claim token ${claims}`);
      return {
        giftId: fakeBytes32(`gift ${claims}`),
        giftClaimToken,
        claimCommitment: keccak256(giftClaimToken),
      };
    },
    prepareGiftTransfer: (gift) => ({
      to: fakeAddress("StickerNFT"),
      data: fakeBytes32(JSON.stringify(gift)),
    }),
    readEscrowGift: (giftId) => Promise.resolve(escrow.get(giftId) ?? missingEscrowGift()),
    claimGift: ({ giftId, giftClaimToken, recipientId }) => {
      const gift = escrow.get(giftId) ?? missingEscrowGift();
      const recipient = fakeAddress(`smart wallet ${recipientId}`);
      if (gift.status === "claimed") {
        return Promise.resolve(
          gift.recipient.toLowerCase() === recipient.toLowerCase()
            ? {
                claimed: true as const,
                txHash: claimTransactions.get(giftId) ?? fakeBytes32(giftId),
              }
            : { claimed: false as const },
        );
      }
      if (gift.status !== "pending") return Promise.reject(new Error("Gift is not pending"));
      if (!isHex(giftClaimToken) || giftClaimToken.length !== 66) {
        return Promise.reject(new Error("Gift claim token is invalid"));
      }
      if (keccak256(giftClaimToken).toLowerCase() !== gift.claimCommitment.toLowerCase()) {
        return Promise.reject(new Error("Gift claim token is invalid"));
      }
      const txHash = fakeBytes32(`claim ${giftId}`);
      claimTransactions.set(giftId, txHash);
      escrow.set(giftId, { ...gift, recipient, status: "claimed" });
      return Promise.resolve({ claimed: true as const, txHash });
    },
  };
  return { ...chain, escrow, claimTransactions };
}

/** Gives everyone a smart wallet, its address made from their user id. */
export const fakeSmartWallets = (): SmartWallets => ({
  addressFor: (userId) => Promise.resolve(fakeAddress(`smart wallet ${userId}`)),
});

/** A made-up JPYC payment contract on Sui. */
export const TEST_PAYMENT_TARGET: TicketPaymentTarget = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};

/** Sui's transactions, by digest: the payments each made, or a rejection for Sui being unreachable. */
export function fakeTicketPayments(transactions = new Map<string, JpycPayment[] | Error>()) {
  const ticketPayments: TicketPayments = {
    target: TEST_PAYMENT_TARGET,
    paymentsIn: (txDigest) => {
      const found = transactions.get(txDigest);
      if (found instanceof Error) return Promise.reject(found);
      return Promise.resolve(found ?? null);
    },
  };
  return { ticketPayments, transactions };
}

/** A server log that reads `text`. */
export const fakeServerLog =
  (text = ""): ServerLog =>
  () =>
    Promise.resolve(new Blob([text]).stream());

/** A name writer that records each call, and throws at `failAt` when that step comes up. */
export function fakeNameWriter({ failAt }: { failAt?: string } = {}) {
  const calls: string[] = [];
  const named = new Set<string>();
  const step = (call: string) => {
    if (call === failAt) throw new Error(`Naming failed at ${call}`);
    calls.push(call);
  };
  const writer: NameWriter = {
    ensurePersonName: (person, label) => {
      // Like CroquisNames, a person keeps the name they already have.
      if (named.has(person)) return Promise.resolve({ label, created: false });
      step(`person ${label}`);
      named.add(person);
      return Promise.resolve({ label, created: true });
    },
    ensureStickerName: (tokenId, label) => {
      step(`sticker ${tokenId} ${label}`);
      return Promise.resolve({ label, created: true });
    },
    setAvatar: (_person, avatar) => {
      step(`avatar ${avatar}`);
      return Promise.resolve();
    },
  };
  return { writer, calls };
}

/** The gateway signer's key in tests. */
export const TEST_GATEWAY_KEY: Hex = `0x${"6a".repeat(32)}`;

/** The names under croquis.eth with a fixed gateway signer, writing through `writer`. */
export const fakeEns = (writer: NameWriter | null = null): EnsDeps => ({
  resolverAddress: fakeAddress("CroquisResolver"),
  gatewaySigner: privateKeyToAccount(TEST_GATEWAY_KEY),
  appLinkBase: "https://liff.line.me/test-liff",
  chainId: 11155111,
  stickerContract: fakeAddress("StickerNFT"),
  writer,
  naming: createNamingQueue(),
});
