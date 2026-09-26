import type { Db } from "@drawing-app/db";
import { z } from "zod";
import type { EscrowStatus, EscrowTransfer, StickerImages } from "./shapes.ts";

/** Everything the routes reach beyond the request. server.ts builds the real ones; tests pass fakes. */
export interface AppDeps {
  db: Db;
  /** Signs the session cookie. */
  sessionSecret: string;
  clock: Clock;
  ids: Ids;
  line: LineVerifier;
  images: ImageStore;
  mint: Mint;
  /** Null in mock chain mode: Giving sends no escrow transfer, and a deposit counts as landed at once. */
  giftChain: GiftChain | null;
  smartWallets: SmartWallets;
  sui: SuiPayments;
  /** The ticket shop quotes its packs at this price. */
  suiPrice: SuiPrice;
}

/** The 5-minute time-weighted average SUI/JPY price, as decimal yen per SUI; null while there's none. */
export type SuiPrice = () => Promise<string | null>;

export interface Clock {
  now: () => Date;
}

export interface Ids {
  /** A new UUID, for a person or a sticker. */
  uuid: () => string;
}

/** Who a LIFF ID token names, as LINE reports them. */
export const lineProfileSchema = z.object({
  sub: z.string().min(1),
  name: z.string(),
  picture: z.string().optional(),
});
export type LineProfile = z.infer<typeof lineProfileSchema>;

/** LINE refused the ID token: expired, forged, or issued for another channel. */
export class LineTokenInvalidError extends Error {
  name = "LineTokenInvalidError";
}

export interface LineVerifier {
  /**
   * Asks LINE who the token names. Rejects with LineTokenInvalidError when LINE refuses the token;
   * any other rejection means LINE couldn't be asked.
   */
  verifyIdToken: (idToken: string) => Promise<LineProfile>;
}

export interface ImageStore {
  /** Saves a sticker's five PNGs under the content hash of its sticker PNG, keeping any already there. */
  save: (contentHash: string, pngs: Record<keyof StickerImages, Uint8Array>) => Promise<void>;
  /** Where the CDN serves them. */
  urls: (contentHash: string) => StickerImages;
}

/** A sealed sticker's facts, as its NFT records them. */
export interface MintRequest {
  stickerId: string;
  artistId: string;
  contentHash: string;
  metadataUri: string;
  number?: number;
  sealedAt?: Date;
  width?: number;
  height?: number;
}

export interface MintedToken {
  tokenId: string;
  txHash: string;
}

/** Mints a sealed sticker's NFT to its Original Artist's smart wallet. Null: the sticker stays unminted. */
export type Mint = (sticker: MintRequest) => Promise<MintedToken | null>;

export interface GiftClaim {
  /** The escrow's giftId. */
  giftId: string;
  giftClaimToken: string;
  /** keccak256 of the Gift Claim Token. */
  claimCommitment: string;
}

/** A gift as StickerGiftEscrow's gifts(giftId) returns it; status is `missing` until the deposit lands. */
export interface EscrowGift {
  sender: string;
  recipient: string;
  tokenId: string;
  claimCommitment: string;
  expiresAt: Date;
  status: EscrowStatus;
}

export interface GiftChain {
  /** sticker-chain's createGiftClaim. */
  createGiftClaim: () => GiftClaim;
  /** sticker-chain's prepareGiftTransfer: moves the sticker from `sender`, the giver's smart wallet. */
  prepareGiftTransfer: (gift: {
    sender: string;
    tokenId: string;
    giftId: string;
    claimCommitment: string;
    expiresAt: Date;
  }) => EscrowTransfer;
  readEscrowGift: (giftId: string) => Promise<EscrowGift>;
  /** Claims a pending gift for the recipient's smart wallet and waits for it to land. */
  claimGift: (gift: {
    giftId: string;
    giftClaimToken: string;
    recipientId: string;
  }) => Promise<{ claimed: true; txHash: string } | { claimed: false }>;
}

export interface SmartWallets {
  /** The person's Ethereum Sepolia smart wallet, lowercase; null while they have none. */
  addressFor: (userId: string) => Promise<string | null>;
}

export interface SuiPayments {
  /** Whether a ticket pack's Sui payment has landed. */
  verifyPayment: (txDigest: string) => Promise<boolean>;
}
