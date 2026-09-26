import {
  LineTokenInvalidError,
  lineProfileSchema,
  type EscrowGift,
  type GiftChain,
  type Ids,
  type ImageStore,
  type LineProfile,
  type LineVerifier,
  type Mint,
  type MintedToken,
  type SmartWallets,
  type SuiPayments,
  type SuiPrice,
} from "../deps.ts";
import { keccak256 } from "../keccak256.ts";
import { stickerImageUrls } from "../services/imageStore.ts";
import type { StickerImages } from "../shapes.ts";

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

const FAKE_ID_TOKEN = "fake-line-id-token:";

/** An ID token the fake LINE verifier accepts as naming `profile`. */
export const fakeLineIdToken = (profile: LineProfile) => FAKE_ID_TOKEN + JSON.stringify(profile);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Accepts tokens from fakeLineIdToken, and refuses anything else as LINE would. */
export function fakeLineVerifier() {
  return {
    verifyIdToken: (idToken) => {
      const claims = idToken.startsWith(FAKE_ID_TOKEN)
        ? parseJson(idToken.slice(FAKE_ID_TOKEN.length))
        : undefined;
      const profile = lineProfileSchema.safeParse(claims);
      return profile.success
        ? Promise.resolve(profile.data)
        : Promise.reject(new LineTokenInvalidError(`Not a fake LINE ID token: ${idToken}`));
    },
  } satisfies LineVerifier;
}

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
  };
  return { ...chain, escrow };
}

/** Gives everyone a smart wallet, its address made from their user id. */
export const fakeSmartWallets = (): SmartWallets => ({
  addressFor: (userId) => Promise.resolve(fakeAddress(`smart wallet ${userId}`)),
});

/** Answers every payment check with `verified`. */
export const fakeSuiPayments = (verified: boolean): SuiPayments => ({
  verifyPayment: () => Promise.resolve(verified),
});

/** A SUI/JPY price that never moves: `yenPerSui`, or null for none available. */
export const fakeSuiPrice =
  (yenPerSui: string | null): SuiPrice =>
  () =>
    Promise.resolve(yenPerSui);
