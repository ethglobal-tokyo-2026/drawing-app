import type {
  ApiErrorCode,
  ErrorBody,
  Explore,
  Gift,
  GiftPreview,
  GiftsForYou,
  Gratitude,
  GratitudeWithReplay,
  KyotoSeikaSubject,
  Me,
  OpenGiftBody,
  PackagedGift,
  PendingGifts,
  Person,
  PilePage,
  Placement,
  ReceivedGift,
  RecordGratitude,
  SealResponse,
  SignedTransaction,
  SpendTicket,
  SponsoredTransaction,
  StartedTicketPurchase,
  StickerBoard,
  StickerDetail,
  StickerPlacement,
  TakeOutStart,
  TicketPurchasePayment,
  TicketShop,
  Tickets,
  TicketUse,
  TimelapseV1,
  UnseenGratitude,
  UserStats,
} from "@drawing-app/api/client";

/** POST /api/stickers's parts. */
interface SealRequest {
  ticketUseId: number;
  timeUsed: number;
  width: number;
  height: number;
  outline: string;
  png: Blob;
  mask: Blob;
  spec: Blob;
  rim: Blob;
  flat: Blob;
  /** The gzipped TimelapseV1; a seal without one still seals. */
  timelapse?: Blob;
  /** Seals an NSFW sticker, which the server takes only from someone with the NSFW opt-in. */
  nsfw: boolean;
  /**
   * The sticker's Kyoto Seika Subject pair, which the server requires for a ticket spent in Kyoto
   * Seika Manga Expression Practice Mode and refuses for any other.
   */
  kyotoSeikaSubjects?: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}

/** Opening a Gift Message's link: its token as the link carries it, which the client checks. */
export type GiftOpening = Omit<OpenGiftBody, "giftClaimToken"> & { giftClaimToken: string };

/** A purchase started: the purchase, and its payment for the person's wallet to sign. */
interface StartedPurchase {
  purchase: StartedTicketPurchase;
  payment: SponsoredTransaction;
}

/** The REST API, one method per route the app calls. */
export interface ApiClient {
  /** POST /api/me/language-choice: Settings' language, or null to follow LINE's, whose `language` the account then takes. */
  setLanguageChoice: (
    languageChoice: Me["languageChoice"],
    language: Me["language"],
  ) => Promise<Me>;
  /** POST /api/me/nsfw-opt-in: Show 18+ stickers, in Settings. */
  setNsfwOptIn: (nsfwOptIn: boolean) => Promise<Me>;
  /** POST /api/me/kyoto-seika-practice: Kyoto Seika Practice Mode and its dark subjects, in Settings; a switch left out stays. */
  setKyotoSeikaPractice: (change: {
    kyotoSeikaPractice?: boolean;
    kyotoSeikaDarkSubjects?: boolean;
  }) => Promise<Me>;

  /** GET /api/sticker-boards/:userId; `me` for your own. */
  stickerBoard: (userId?: string) => Promise<StickerBoard>;
  /** GET /api/sticker-boards/:userId/user-stats */
  userStats: (userId?: string) => Promise<UserStats>;
  /** PATCH /api/sticker-boards/me/sticker-placements/:stickerId */
  saveStickerPlacement: (stickerId: string, placement: Placement) => Promise<StickerPlacement>;
  /** POST /api/sticker-boards/me/sticker-tray/seen */
  markTraySeen: (stickerIds: readonly string[]) => Promise<{ newStickerCount: number }>;

  /** POST /api/stickers: seals a drawing on the ticket it spent. */
  seal: (request: SealRequest) => Promise<SealResponse>;
  /** GET /api/stickers/:stickerId */
  stickerDetail: (stickerId: string) => Promise<StickerDetail>;
  /** GET /api/stickers/:stickerId/timelapse: how it was drawn; 404 timelapse_not_found without one. */
  timelapse: (stickerId: string) => Promise<TimelapseV1>;

  /** GET /api/tickets */
  tickets: () => Promise<Tickets>;
  /** POST /api/tickets/spend: the same idempotencyKey again answers the ticket use it spent. */
  spendTicket: (spend: SpendTicket) => Promise<{ ticketUse: TicketUse; tickets: Tickets }>;
  /** GET /api/ticket-shop */
  ticketShop: () => Promise<TicketShop>;
  /** POST /api/ticket-purchases/start: records a purchase of the pack of `tickets`, and builds its payment. */
  startTicketPurchase: (tickets: number) => Promise<StartedPurchase>;
  /** POST /api/ticket-purchases: a started purchase's signed payment, which the server runs and adds tickets for. */
  buyTickets: (payment: TicketPurchasePayment) => Promise<Tickets>;

  /**
   * POST /api/gifts: a new gift of the sticker, or the one already in the bag; `forUserId` when the
   * giver picked who it's for in the app, so it waits on their board.
   */
  packageGift: (stickerId: string, forUserId?: string) => Promise<PackagedGift>;
  /** POST /api/gifts/:giftId/deposit: the signed deposit, which the server runs. */
  reportDeposit: (giftId: string, signed: SignedTransaction) => Promise<Gift>;
  /** POST /api/gifts/:giftId/shared */
  reportShared: (giftId: string, outcome: "sent" | "cancelled") => Promise<Gift>;
  /** POST /api/gifts/:giftId/take-out/start */
  startTakeOut: (giftId: string) => Promise<TakeOutStart>;
  /** POST /api/gifts/:giftId/take-out: the signed take-out, which the server runs. */
  takeOutGift: (giftId: string, signed: SignedTransaction) => Promise<Gift>;
  /** GET /api/gifts/pending */
  pendingGifts: () => Promise<PendingGifts>;
  /** POST /api/gifts/preview */
  previewGift: (body: GiftOpening) => Promise<GiftPreview>;
  /** POST /api/gifts/receive */
  receiveGift: (body: GiftOpening) => Promise<ReceivedGift>;
  /** GET /api/gifts/for-you: gifts waiting for you, newest first. */
  giftsForYou: () => Promise<GiftsForYou>;
  /** GET /api/gifts/:giftId/preview: a gift waiting for you, checked as its link's preview is. */
  previewGiftForYou: (giftId: string) => Promise<GiftPreview>;
  /** POST /api/gifts/:giftId/receive: a gift waiting for you, received from your board. */
  receiveGiftForYou: (giftId: string) => Promise<ReceivedGift>;

  /** POST /api/gratitude, sent with keepalive so it lands as the page closes. */
  recordGratitude: (combo: RecordGratitude) => Promise<Gratitude>;
  /** GET /api/gratitude/unseen */
  unseenGratitude: () => Promise<UnseenGratitude>;
  /** GET /api/gratitude/:giftId */
  gratitude: (giftId: string) => Promise<GratitudeWithReplay>;
  /** POST /api/gratitude/:giftId/seen */
  markGratitudeSeen: (giftId: string) => Promise<Gratitude>;

  /** GET /api/explore */
  explore: () => Promise<Explore>;
  /** GET /api/explore/pile?before=: the pile's page older than a page's `before`. */
  explorePile: (before: string) => Promise<PilePage>;
  /** GET /api/users?handle= */
  searchUsers: (handle: string) => Promise<Person[]>;
}

/**
 * Codes the app makes itself: no answer, no LINE ID token to sign in with, a LINE reconnect that
 * failed, and no Sui wallet or signer from Privy in time for a chain action or a payment.
 */
type ClientErrorCode =
  | "network"
  | "no_line_token"
  | "line_reconnect_failed"
  | "sui_wallet_not_ready";
export type ErrorCode = ApiErrorCode | ClientErrorCode;

/** A refused or failed request: the HTTP status and the API's error body. Status 0 is no answer. */
export class ApiError extends Error {
  readonly status: number;
  /** The body's `error`: stable, so screens switch on it. */
  readonly code: string;
  readonly detail?: string;

  constructor(status: number, body: ErrorBody) {
    super(body.detail ? `${body.error}: ${body.detail}` : body.error);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error;
    this.detail = body.detail;
  }
}

/** Any failure as an ApiError, so screens handle one shape. */
export const apiError = (error: unknown): ApiError =>
  error instanceof ApiError
    ? error
    : new ApiError(0, {
        error: "network",
        detail: error instanceof Error ? error.message : String(error),
      });
