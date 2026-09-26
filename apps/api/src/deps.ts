import type { Db } from "@drawing-app/db";
import type { LocalAccount } from "viem";
import { z } from "zod";
import type { ChatMenuLink } from "./chatMenu/menus.ts";
import type {
  EscrowStatus,
  EscrowTransfer,
  StickerImages,
  StickerPngKind,
  TicketShop,
} from "./shapes.ts";

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
  /** Null when the names under croquis.eth aren't configured: labels are kept, nothing resolves. */
  ens: EnsDeps | null;
  ticketPayments: TicketPayments;
  serverLog: ServerLog;
  /** Off without the Messaging API channel, or under dev sign-in: every call then does nothing. */
  lineChatMenu: LineChatMenu;
  /** Null when the server has no World ID app: age verification is off. */
  worldId: WorldId | null;
}

/** A World ID request's signature, which World App checks came from our app: IDKit's `rp_context`. */
export interface WorldIdRpContext {
  rp_id: string;
  nonce: string;
  /** Unix seconds. */
  created_at: number;
  /** Unix seconds. */
  expires_at: number;
  signature: string;
}

/**
 * World's verdict on a proof: when it holds, the nullifier if World names one; World's code and
 * detail when it doesn't.
 */
export type WorldIdVerdict =
  | { verified: true; nullifier: string | null }
  | { verified: false; code: string; detail: string };

/** Our app in World's Developer Portal, which age verification asks for proofs and checks them with. */
export interface WorldId {
  appId: `app_${string}`;
  environment: "production" | "staging";
  signRequest: (action: string) => WorldIdRpContext;
  /** Sends IDKit's result, as the app got it, to World to check. Rejects when World can't be asked. */
  verifyProof: (proof: Record<string, unknown>) => Promise<WorldIdVerdict>;
}

/**
 * Links each person's chat menu, under the Official Account's chat in LINE, to the one for their
 * language and tickets. Calls for one person run in turn, each reading their tickets when it runs.
 */
export interface LineChatMenu {
  /** Links the person's menu and says what LINE shows; null once the account is gone. Rejects when LINE fails. */
  link: (userId: string) => Promise<ChatMenuLink | null>;
  /** Links the person's menu after a spend or a purchase commits. Never rejects: a failure is logged. */
  relink: (userId: string) => Promise<void>;
  /** Unlinks a deleted account's menu, so LINE shows the default one. Never rejects. */
  unlink: (userId: string, lineUserId: string) => Promise<void>;
  /** Settles once every call made so far has. */
  idle: () => Promise<void>;
}

/** The server's whole log as text, newest line first. Rejects when the log can't be read. */
export type ServerLog = () => Promise<ReadableStream<Uint8Array>>;

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
  readonly reason: "invalid" | "expired";

  constructor(message?: string, reason: "invalid" | "expired" = "invalid") {
    super(message);
    this.reason = reason;
  }
}

export interface LineVerifier {
  /**
   * Asks LINE who the token names. Rejects with LineTokenInvalidError when LINE refuses the token;
   * any other rejection means LINE couldn't be asked.
   */
  verifyIdToken: (idToken: string) => Promise<LineProfile>;
}

export interface ImageStore {
  /**
   * Saves a sticker's five PNGs under the content hash of its sticker PNG, and the WebP files made
   * from them, keeping any already there.
   */
  save: (contentHash: string, pngs: Record<StickerPngKind, Uint8Array>) => Promise<void>;
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
  /**
   * Claims a pending gift for the recipient's smart wallet and waits for it to land. Without a Gift
   * Claim Token, the recipient must be the person the gift waits for (gifts.for_user_id).
   */
  claimGift: (gift: {
    giftId: string;
    giftClaimToken: string | null;
    recipientId: string;
  }) => Promise<{ claimed: true; txHash: string } | { claimed: false }>;
}

export interface SmartWallets {
  /** The person's Ethereum Sepolia smart wallet, lowercase; null while they have none. */
  addressFor: (userId: string) => Promise<string | null>;
}

/** Where ticket packs are paid: the JPYC payment contract's vault on Sui. */
export type TicketPaymentTarget = Omit<TicketShop["payment"], "reference">;

/** One PaymentReceived event of the payment contract. */
export interface JpycPayment {
  vault: string;
  payer: string;
  /** JPYC base units. */
  amount: bigint;
  /** What the payer passed as `pay`'s reference, as UTF-8. */
  reference: string;
}

export interface TicketPayments {
  target: TicketPaymentTarget;
  /**
   * The payment contract's PaymentReceived events in a transaction that succeeded; null when Sui has
   * no such transaction. Rejects when Sui can't be asked.
   */
  paymentsIn: (txDigest: string) => Promise<JpycPayment[] | null>;
}

/** The names under croquis.eth: the CCIP-Read gateway, and the relayer that writes names. */
export interface EnsDeps {
  /** CroquisResolver: the gateway answers only its lookups. */
  resolverAddress: string;
  /** Signs the gateway's answers; CroquisResolver trusts its address. */
  gatewaySigner: LocalAccount;
  /** A person's `url` record is this plus /@<label>: the LIFF app's link, which opens their board. */
  appLinkBase: string;
  chainId: number;
  stickerContract: string;
  /** Null in mock chain mode: names resolve through the gateway, and none go onchain. */
  writer: NameWriter | null;
  naming: NamingQueue;
}

/** sticker-chain's createCroquisNames. Each call reads the chain first, so it's safe to repeat. */
export interface NameWriter {
  ensurePersonName: (
    person: string,
    label: string,
    records: { avatar: string; url: string },
  ) => Promise<{ label: string; created: boolean }>;
  ensureStickerName: (
    tokenId: string,
    label: string,
  ) => Promise<{ label: string; created: boolean }>;
  setAvatar: (person: string, avatar: string) => Promise<void>;
}

/** Runs naming jobs one at a time, off the request that asked for them. */
export interface NamingQueue {
  /** Queues `job` under `key`, unless a job for that key is already waiting. */
  enqueue: (key: string, job: () => Promise<void>) => void;
  /** Settles once every queued job has. */
  idle: () => Promise<void>;
}
