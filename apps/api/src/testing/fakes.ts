import { users, type Db } from "@drawing-app/db";
import { bytes32 } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import type {
  Clock,
  EscrowGift,
  GiftChain,
  Ids,
  ImageStore,
  Mint,
  MintedToken,
  ServerLog,
  SmartWallets,
  JpycPayment,
  TicketPayments,
  TicketPaymentTarget,
  WorldId,
  WorldIdVerdict,
} from "../deps.ts";
import { createDevLineVerifier } from "../services/devSignIn.ts";
import { stickerImageUrls, veiledImageUrls } from "../services/imageStore.ts";
import type { StickerPngKind } from "../shapes.ts";
import { isHex, keccak256, toBytes } from "viem";

/** A made-up address, the same for the same seed. */
const fakeAddress = (seed: string) => bytes32(seed).slice(0, 42);
/** The smart wallet the fakes give a person, lowercase as Privy's lookup answers it. */
const fakeSmartWalletAddress = (userId: string) => fakeAddress(`smart wallet ${userId}`);

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

/** LINE, as dev sign-in stands in for it: devIdToken's tokens name their profile, and any other is refused. */
export const fakeLineVerifier = createDevLineVerifier;

/** Keeps saved images in memory, by content hash; like the disk store, the first save stays. */
export function fakeImageStore(cdnBaseUrl = "https://cdn.test") {
  const saved = new Map<string, Record<StickerPngKind, Uint8Array>>();
  const store: ImageStore = {
    save: (contentHash, pngs) => {
      if (!saved.has(contentHash)) saved.set(contentHash, pngs);
      return Promise.resolve();
    },
    saveVeiled: (contentHash) =>
      saved.has(contentHash)
        ? Promise.resolve(bytes32(`veiled ${contentHash}`))
        : Promise.reject(new Error(`No images are saved under ${contentHash}`)),
    urls: (contentHash) => stickerImageUrls(cdnBaseUrl, contentHash),
    veiledUrls: (contentHash, veiledHash) => veiledImageUrls(cdnBaseUrl, contentHash, veiledHash),
  };
  return { ...store, saved };
}

/** Mints each sticker once, with token IDs counting up from 1. `minted` holds each sticker's token. */
export function fakeMint() {
  const minted = new Map<string, MintedToken>();
  const mint: Mint = ({ stickerId }) => {
    const token = minted.get(stickerId) ?? {
      tokenId: String(minted.size + 1),
      txHash: bytes32(`mint ${stickerId}`),
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

/** A time as a block's timestamp gives it: whole seconds. */
const blockSeconds = (at: Date) => Math.floor(at.getTime() / 1000);

/**
 * Chain mode without a chain. The escrow holds what the test puts in `escrow`; any other gift reads
 * as missing, as before its deposit lands. Its blocks are stamped with `clock`'s time.
 */
export function fakeGiftChain(clock: Clock = { now: () => new Date() }) {
  const escrow = new Map<string, EscrowGift>();
  const claimTransactions = new Map<string, string>();
  let claims = 0;
  const chain: GiftChain = {
    createGiftClaim: () => {
      claims += 1;
      const giftClaimToken = bytes32(`gift claim token ${claims}`);
      return {
        giftId: bytes32(`gift ${claims}`),
        giftClaimToken,
        claimCommitment: keccak256(toBytes(giftClaimToken)),
      };
    },
    prepareGiftTransfer: (gift) => ({
      to: fakeAddress("StickerNFT"),
      data: bytes32(JSON.stringify(gift)),
    }),
    readEscrowGift: (giftId) => Promise.resolve(escrow.get(giftId) ?? missingEscrowGift()),
    claimGift: ({ giftId, giftClaimToken, recipientId }) => {
      const gift = escrow.get(giftId) ?? missingEscrowGift();
      const recipient = fakeSmartWalletAddress(recipientId);
      if (gift.status === "claimed") {
        return Promise.resolve(
          gift.recipient.toLowerCase() === recipient.toLowerCase()
            ? {
                claimed: true as const,
                txHash: claimTransactions.get(giftId) ?? bytes32(giftId),
              }
            : { claimed: false as const },
        );
      }
      if (gift.status !== "pending") return Promise.reject(new Error("Gift is not pending"));
      // Without a token, the API has already checked the recipient is who the gift waits for.
      if (giftClaimToken !== null) {
        if (!isHex(giftClaimToken) || giftClaimToken.length !== 66) {
          return Promise.reject(new Error("Gift claim token is invalid"));
        }
        if (keccak256(giftClaimToken).toLowerCase() !== gift.claimCommitment.toLowerCase()) {
          return Promise.reject(new Error("Gift claim token is invalid"));
        }
      }
      const txHash = bytes32(`claim ${giftId}`);
      claimTransactions.set(giftId, txHash);
      escrow.set(giftId, { ...gift, recipient, status: "claimed" });
      return Promise.resolve({ claimed: true as const, txHash });
    },
    returnExpiredGift: (giftId) => {
      const gift = escrow.get(giftId) ?? missingEscrowGift();
      // The escrow's own checks: the gift is pending, and this block's second is past its expiry.
      if (gift.status !== "pending") return Promise.reject(new Error("Gift is not pending"));
      if (blockSeconds(clock.now()) <= blockSeconds(gift.expiresAt)) {
        return Promise.reject(new Error("Gift has not expired"));
      }
      escrow.set(giftId, { ...gift, status: "expired_returned" });
      return Promise.resolve({ txHash: bytes32(`return ${giftId}`) });
    },
  };
  return { ...chain, escrow, claimTransactions };
}

/**
 * Gives everyone a smart wallet, its address made from their user id. With the app's database it
 * answers as Privy's lookup does: the stored address first, else it stores the one it makes.
 */
export function fakeSmartWallets(db?: Db): SmartWallets {
  return {
    addressFor: (userId) => {
      const byId = eq(users.id, userId);
      const stored = db
        ?.select({ address: users.smartAccountAddress })
        .from(users)
        .where(byId)
        .get();
      if (stored?.address) return Promise.resolve(stored.address);
      const address = fakeSmartWalletAddress(userId);
      db?.update(users).set({ smartAccountAddress: address }).where(byId).run();
      return Promise.resolve(address);
    },
  };
}

/** A made-up JPYC payment contract on Sui. */
export const TEST_PAYMENT_TARGET: TicketPaymentTarget = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};

/**
 * Sui's transactions, by digest, in the order they ran: the payments each made, or a rejection for
 * Sui being unreachable. A read of payment events lists every payment, newest first, and is as
 * `events.read` says: whole, stopped short of how far back it was asked, or a rejection.
 */
export function fakeTicketPayments(transactions = new Map<string, JpycPayment[] | Error>()) {
  const events: { read: "whole" | "stopped_short" | Error } = { read: "whole" };
  const ticketPayments: TicketPayments = {
    target: TEST_PAYMENT_TARGET,
    paymentsIn: (txDigest) => {
      const found = transactions.get(txDigest);
      if (found instanceof Error) return Promise.reject(found);
      return Promise.resolve(found ?? null);
    },
    paymentsSince: () => {
      if (events.read instanceof Error) return Promise.reject(events.read);
      const payments = [...transactions]
        .reverse()
        .flatMap(([txDigest, made]) =>
          made instanceof Error ? [] : made.map((payment) => ({ ...payment, txDigest })),
        );
      return Promise.resolve({ payments, complete: events.read === "whole" });
    },
  };
  return { ticketPayments, transactions, events };
}

/** A server log that reads `text`. */
export const fakeServerLog =
  (text = ""): ServerLog =>
  () =>
    Promise.resolve(new Blob([text]).stream());

/**
 * World ID without World: it signs any request, and gives each proof `verdict`, or rejects with it
 * when it's an Error. `proofs` holds every proof sent to World.
 */
export function fakeWorldId(verdict: WorldIdVerdict | Error = { verified: true, nullifier: null }) {
  const proofs: Record<string, unknown>[] = [];
  const worldId: WorldId = {
    appId: "app_test",
    environment: "production",
    signRequest: () => ({
      rp_id: "rp_test",
      nonce: "0x01",
      created_at: 1,
      expires_at: 301,
      signature: "0x02",
    }),
    verifyProof: (proof) => {
      proofs.push(proof);
      return verdict instanceof Error ? Promise.reject(verdict) : Promise.resolve(verdict);
    },
  };
  return Object.assign(worldId, { proofs });
}
