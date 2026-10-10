import type { ExtractSchema } from "hono/types";
import type { ClientErrorStatusCode, ServerErrorStatusCode } from "hono/utils/http-status";
import type { AppType } from "./app.ts";

export type { AppType };

type Schema = ExtractSchema<AppType>;
type Endpoint = { [Path in keyof Schema]: Schema[Path][keyof Schema[Path]] }[keyof Schema];
type ErrorOutput = Extract<
  Endpoint,
  { status: ClientErrorStatusCode | ServerErrorStatusCode }
>["output"];

/**
 * Every `error` code a route answers, from the routes' own types: `apiError` keeps each code's literal.
 * The rest come from the app's error handler, which any route can reach: Sui and Shinami failing,
 * and a signature that isn't its wallet's.
 */
export type ApiErrorCode =
  | (ErrorOutput extends { error: infer Code extends string } ? Code : never)
  | "internal_error"
  | "chain_unavailable"
  | "sponsorship_refused"
  | "sponsor_fund_empty"
  | "sponsor_unavailable"
  | "signature_invalid";
export { replayHitProblems } from "./gratitude/replayHits.ts";
export { MAX_PERFORMANCE_REPORT_CHARS } from "./performanceReportLimits.ts";
export { HANDLE_MAX_LENGTH } from "./session/handleLimit.ts";
export { MAX_LARGE_LAYOUT_BATCH } from "./stickerBoards/largeLayoutLimit.ts";
export {
  CUT_PAD,
  MAX_CUT_SIDE,
  MAX_FLAT_SIDE,
  MAX_SHARP_IMAGE_SIDE,
  MAX_STICKER_IMAGE_SIDE,
  SHARP_CUT_SIDE,
} from "./stickers/imageSides.ts";
export { MAX_LAYERS, MAX_TIMELAPSE_BYTES } from "./stickers/timelapseLimit.ts";
export { TOKYO_UTC_OFFSET_MS, tokyoTicketDay } from "./ticketDays.ts";
export { purchaseNamedBy } from "./tickets/paymentReference.ts";
export {
  DAILY_TICKETS_PER_DAY,
  GIFT_EXPIRY_MS,
  GRATITUDE_PER_HIT,
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
  MAX_LARGE_SCALE,
  MAX_PEAK_MULT,
  MAX_SCALE,
  MAX_TIME_USED_S,
  METHOD_WEIGHT,
} from "@drawing-app/db/limits";

// Type-only, so the app bundles nothing of the database package.
export type { KyotoSeikaSubject } from "@drawing-app/db";

// The contract's shapes, for the app's screens: each is the type its route's schema checks.
export type { ChatMenuLink } from "./chatMenu/menus.ts";
export type { ErrorBody } from "./errors.ts";
export type { Explore, PilePage, PileSticker } from "./explore/explore.ts";
export type { LeaderboardRow } from "./explore/leaderboards.ts";
export type { PackagedGift, TakeOutStart } from "./gifts/packaging.ts";
export type {
  GiftPreview,
  GiftsForYou,
  OpenGiftBody,
  ReceivedGift,
  ReceiveRefusal,
} from "./gifts/receiving.ts";
export type { GratitudeEvents } from "./gratitude/events.ts";
export type { GratitudeWithReplay, UnseenGratitude } from "./gratitude/feed.ts";
export type { RecordGratitude } from "./gratitude/record.ts";
export type { ReplayV1 } from "./gratitude/replay.ts";
export type { PerformanceReportUpload } from "./routes/performanceReports.ts";
export type {
  Gift,
  Gratitude,
  IsoTime,
  Me,
  Person,
  Placement,
  SignedTransaction,
  SponsoredTransaction,
  Sticker,
  StickerPlacement,
  Tickets,
  TicketShop,
  UserStats,
} from "./shapes.ts";
export type {
  BoardSticker,
  LargeLayoutEntry,
  PlacementsRequest,
  StickerBoard,
} from "./stickerBoards/board.ts";
export type { MarkNsfwResponse, UnmarkNsfwResponse } from "./stickers/markNsfw.ts";
export type { SealResponse } from "./stickers/seal.ts";
export type { StickerDetail, TransferTrailEntry } from "./stickers/stickerDetail.ts";
export type { TimelapseV2 } from "./stickers/timelapse.ts";
export type {
  SpendTicket,
  StartedTicketPurchase,
  StartPurchase,
  TicketKind,
  TicketPurchasePayment,
  TicketUse,
} from "./tickets/tickets.ts";
