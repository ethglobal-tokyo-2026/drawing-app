import type { escrowStatuses } from "@drawing-app/db";

/** Shinami Gas Station: pays the gas of every transaction the server builds. */
export interface GasStation {
  /** Sponsors a transaction kind for `sender`. Rejects with SponsorshipError. */
  sponsor: (kind: Uint8Array, sender: string) => Promise<Sponsorship>;
  /** The fund's balance less what's in flight, in MIST. */
  available: () => Promise<bigint>;
}

export interface Sponsorship {
  digest: string;
  /** Base64. */
  txBytes: string;
  /** Base64. */
  sponsorSignature: string;
  expiresAt: Date;
}

/** `refused`: Shinami's dry run failed the kind, in its words; `fund_empty`; `unavailable`. */
export class SponsorshipError extends Error {
  name = "SponsorshipError";
  readonly reason: "refused" | "fund_empty" | "unavailable";

  constructor(reason: SponsorshipError["reason"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.reason = reason;
  }
}

/**
 * Sui refused a transaction outright, in its words, so it never ran and never can: an input
 * another transaction already used, or a signature that isn't its signer's.
 */
export class TransactionRefusedError extends Error {
  name = "TransactionRefusedError";
}

export interface SuiWallets {
  /** The person's Privy Sui wallet, normalized; null while they have none. */
  addressFor: (userId: string) => Promise<string | null>;
}

/** What Sui did with a transaction. */
export type SuiOutcome =
  | { ok: true; events: { type: string; bcs: Uint8Array }[] }
  | { ok: false; failure: string };

/** A gift's Sui object's status, and `missing` while its derived ID holds no object. */
export type GiftObjectStatus = (typeof escrowStatuses)[number];

/** A gift's Sui object; `missing` until its deposit lands. */
export interface EscrowGift {
  status: GiftObjectStatus;
  recipient: string | null;
}

/** A sealed sticker's facts, as its Sticker object records them. */
export interface MintRequest {
  stickerId: string;
  number: number;
  /** The Original Artist's Sui address. */
  artist: string;
  contentHash: string;
  width: number;
  height: number;
  nsfw: boolean;
  /** The public image's file name, under Display's image host: an NSFW sticker's veiled one. */
  image: string;
}

/** Croquis's package and objects on Sui. Each builder answers a transaction kind to sponsor. */
export interface SuiChain {
  /** The server's sender address, which the package's ServerConfig names. */
  server: string;
  mintKind: (mint: MintRequest) => Promise<Uint8Array>;
  depositKind: (deposit: {
    sender: string;
    stickerObjectId: string;
    giftId: string;
    claimCommitment: string;
    expiresAt: Date;
  }) => Promise<Uint8Array>;
  takeOutKind: (sender: string, giftId: string) => Promise<Uint8Array>;
  claimKind: (giftId: string, recipient: string) => Promise<Uint8Array>;
  returnKind: (giftId: string) => Promise<Uint8Array>;
  paymentKind: (payment: {
    sender: string;
    amount: bigint;
    reference: string;
  }) => Promise<Uint8Array>;
  /** The server's signature over bytes it sends as sender. */
  signAsServer: (txBytes: string) => Promise<string>;
  /**
   * Submits a signed transaction and answers its outcome; null when the answer was lost. Rejects with
   * TransactionRefusedError when Sui refuses it outright, and ChainUnavailableError when Sui can't
   * be reached.
   */
  submit: (txBytes: string, signatures: string[]) => Promise<SuiOutcome | null>;
  /** The transaction's outcome; null while Sui doesn't show it, after readLanded's retries. */
  outcomeOf: (digest: string) => Promise<SuiOutcome | null>;
  /**
   * The ID the sticker's object has, or will have once minted (deriveObjectID). Rejects with
   * ChainUnavailableError when Sui can't be asked for the package's original ID.
   */
  stickerObjectId: (stickerId: string) => Promise<string>;
  /**
   * The payment package's original ID, which PaymentReceived's type keeps across upgrades. Rejects
   * with ChainUnavailableError when Sui can't be asked.
   */
  paymentOriginalPackage: () => Promise<string>;
  /** Whether the sticker's object exists: a mint of it ran, whatever this server recorded. */
  stickerMinted: (stickerId: string) => Promise<boolean>;
  readGift: (giftId: string) => Promise<EscrowGift>;
  /** Whether ServerConfig names `server`, and the objects the env names exist: the boot check. */
  check: () => Promise<{ serverMatches: boolean; missing: string[] }>;
}
