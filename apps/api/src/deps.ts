import type { Db } from "@drawing-app/db";
import { z } from "zod";
import type { ChatMenuLink } from "./chatMenu/menus.ts";
import type { StickerImages, StickerPngKind, TicketShop } from "./shapes.ts";
import type { GasStation, SuiChain, SuiWallets } from "./sui/types.ts";

/** Everything the routes reach beyond the request. server.ts builds the real ones; tests pass fakes. */
export interface AppDeps {
  db: Db;
  /** Signs the session cookie. */
  sessionSecret: string;
  clock: Clock;
  ids: Ids;
  line: LineVerifier;
  images: ImageStore;
  /**
   * Null in mock chain mode: nothing is minted, a gift lands in the escrow at once, and ticket packs
   * can't be bought.
   */
  sui: SuiChain | null;
  /** Null in mock chain mode, as sui is. */
  gasStation: GasStation | null;
  suiWallets: SuiWallets;
  /** Where ticket packs are paid, which the ticket shop shows in either mode. */
  ticketPayment: TicketPaymentTarget;
  serverLog: ServerLog;
  /** Off without the Messaging API channel, or under dev sign-in: every call then does nothing. */
  lineChatMenu: LineChatMenu;
  /** Off as lineChatMenu is: every call then does nothing. */
  giverNotice: GiverNotice;
  /** Null without Fastly's settings, as in development: a mark then skips the purge. */
  cdnPurge: CdnPurge | null;
}

/** The CDN in front of the box, as marking a sticker 18+ clears its copies of the drawing. */
export interface CdnPurge {
  /**
   * Purges each URL's copies from every POP, retrying a failure within a deadline, and logs each
   * purge. True once all are purged; false once one failed for good, which it logs. Never rejects.
   */
  purge: (urls: string[]) => Promise<boolean>;
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

/** Who a LIFF access token names, as LINE reports them. */
export const lineProfileSchema = z.object({
  sub: z.string().min(1),
  name: z.string(),
  picture: z.string().optional(),
});
export type LineProfile = z.infer<typeof lineProfileSchema>;

/** LINE refused the access token: expired, revoked, or issued for another channel. */
export class LineTokenInvalidError extends Error {
  name = "LineTokenInvalidError";
  readonly reason: "invalid" | "expired";

  constructor(message?: string, reason: "invalid" | "expired" = "invalid") {
    super(message);
    this.reason = reason;
  }
}

/** LINE couldn't be asked about the access token: a timeout, a network failure, or LINE's own error. */
export class LineUnavailableError extends Error {
  name = "LineUnavailableError";
}

export interface LineVerifier {
  /**
   * Asks LINE who the token names. Rejects with LineTokenInvalidError when LINE refuses the token;
   * any other rejection means LINE couldn't be asked.
   */
  verifyAccessToken: (accessToken: string) => Promise<LineProfile>;
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
  /** Where they load from. The box serves an NSFW sticker's drawing only to the NSFW opt-in. */
  urls: (contentHash: string) => StickerImages;
  /** What a viewer without the NSFW opt-in gets for an NSFW sticker: `urls` with its veiled image in place. */
  veiledUrls: (contentHash: string, veiledHash: string) => StickerImages;
}

/** Sui couldn't be read or reached: its RPC failed, timed out, or gave an answer that doesn't decode. */
export class ChainUnavailableError extends Error {
  name = "ChainUnavailableError";
}

/** Where ticket packs are paid: the JPYC payment contract's vault on Sui. */
export type TicketPaymentTarget = TicketShop["payment"];
