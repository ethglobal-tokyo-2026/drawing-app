import type { Db } from "@drawing-app/db";
import type { Address, LocalAccount } from "viem";
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
  /** Off as lineChatMenu is: every call then does nothing. */
  giverNotice: GiverNotice;
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

/**
 * The Official account's message telling a giver, in LINE, that their gift was received. What
 * fails is retried by a sweep, and given up once a retry could send it twice.
 */
export interface GiverNotice {
  /** Sends a gift's message once Receiving commits it. Never rejects: a failure is logged. */
  send: (giftId: string) => Promise<void>;
  /** Sends, or gives up, every received gift's message still due. Never rejects. */
  sweep: () => Promise<void>;
  /** Settles once every send and sweep started so far has. */
  idle: () => Promise<void>;
}

/**
 * The server log's newest `lines` lines as text, newest first; null while another request reads it.
 * Rejects when the log can't be read.
 */
export type ServerLog = (lines: number) => Promise<ReadableStream<Uint8Array> | null>;

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

/** LINE couldn't be asked about the ID token: a timeout, a network failure, or LINE's own error. */
export class LineUnavailableError extends Error {
  name = "LineUnavailableError";
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
  /**
   * Makes an NSFW sticker's veiled image from its saved PNG and mask, and saves it under its own
   * content hash, which it resolves to. Rejects when the sticker's images aren't saved.
   */
  saveVeiled: (contentHash: string) => Promise<string>;
  /** Where the CDN serves them. */
  urls: (contentHash: string) => StickerImages;
  /** What a viewer who isn't adult gets for an NSFW sticker: `urls` with its veiled image in place. */
  veiledUrls: (contentHash: string, veiledHash: string | null) => StickerImages;
}

/** A sealed sticker's facts, as its NFT records them. */
interface MintRequest {
  stickerId: string;
  artistId: string;
  contentHash: string;
  metadataUri: string;
  /** The image its metadata names, which anyone can read: an NSFW sticker's veiled image. */
  image: string;
  number: number;
  width: number;
  height: number;
}

export interface MintedToken {
  tokenId: string;
  txHash: string;
}

/** Mints a sealed sticker's NFT to its Original Artist's smart wallet. Null: the sticker stays unminted. */
export type Mint = (sticker: MintRequest) => Promise<MintedToken | null>;

interface GiftClaim {
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

/** The chain couldn't be read: its RPC failed, timed out, or gave an answer that doesn't decode. */
export class ChainUnavailableError extends Error {
  name = "ChainUnavailableError";
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
  /** Rejects with ChainUnavailableError when the escrow can't be read. */
  readEscrowGift: (giftId: string) => Promise<EscrowGift>;
  /**
   * Claims a pending gift for the recipient's smart wallet and waits for it to land. Without a Gift
   * Claim Token, the recipient must be the person the gift waits for (gifts.for_user_id). It reads
   * the escrow first, so a call after a failed one finds a claim that landed late.
   */
  claimGift: (gift: {
    giftId: string;
    giftClaimToken: string | null;
    recipientId: string;
  }) => Promise<{ claimed: true; txHash: string } | { claimed: false }>;
  /**
   * The escrow's returnExpiredGift: sends a pending gift past its expiry back to its sender, and
   * waits for it to land. Rejects when the escrow refuses it, or it isn't confirmed in time.
   */
  returnExpiredGift: (giftId: string) => Promise<{ txHash: string }>;
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
   * The payment contract's PaymentReceived events in a transaction that succeeded; null when Sui
   * still doesn't show the transaction after a short wait for it. Rejects when Sui can't be asked.
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
  /** Null only in tests: names resolve through the gateway, and none go onchain. */
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

/** Whether naming can work, as the contract check last found; off says why. */
export type NamingState = { on: true } | { on: false; reason: string };

/** Runs naming jobs one at a time, off the request that asked for them. */
export interface NamingQueue {
  /** Queues `job` under `key`, unless a job for that key is already waiting. */
  enqueue: (key: string, job: () => Promise<void>) => void;
  /** Settles once every queued job has. */
  idle: () => Promise<void>;
  /**
   * Naming's state from when `state` settles; it must not reject. A job that comes up before then
   * waits for it, and one that comes up while naming is off is skipped with a line saying why.
   */
  setState: (state: Promise<NamingState>) => void;
  /** Naming's state, once the last one set settles. On until one is set. */
  state: () => Promise<NamingState>;
}

/** The addresses the server's contract settings name, and the relayer that sends from them. */
export interface ConfiguredContracts {
  relayer: Address;
  stickers: Address;
  escrow: Address;
  names: Address;
  resolver: Address;
}

/**
 * What the configured contracts answer about each other. An address is null when its contract
 * refused the read: it reverted, or nothing there answers it.
 */
export interface ContractReads {
  configured: ConfiguredContracts;
  /** Whether CroquisNames grants the relayer NAMER_ROLE. */
  relayerIsNamer: boolean;
  /** The StickerNFT each of these reads. */
  namesStickers: Address | null;
  resolverStickers: Address | null;
  escrowSticker: Address | null;
  /** The escrow's CroquisNames; an escrow from before the names under croquis.eth has none. */
  escrowNames: Address | null;
}

/** Reads the configured contracts. Rejects with ChainUnavailableError when the RPC fails. */
export type ReadContracts = () => Promise<ContractReads>;
