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
 * internal_error and chain_unavailable come from the app's error handler, which any route can reach.
 */
export type ApiErrorCode =
  | (ErrorOutput extends { error: infer Code extends string } ? Code : never)
  | "internal_error"
  | "chain_unavailable";
export { HANDLE_MAX_LENGTH } from "./session/handleLimit.ts";
export { MAX_TIMELAPSE_BYTES } from "./stickers/timelapseLimit.ts";
export { TOKYO_UTC_OFFSET_MS, tokyoTicketDay } from "./ticketDays.ts";
export {
  GIFT_EXPIRY_MS,
  GRATITUDE_PER_HIT,
  MAX_PEAK_MULT,
  MAX_TIME_USED_S,
  METHOD_WEIGHT,
} from "@drawing-app/db/limits";

// The contract's shapes, for the app's screens: each is the type its route's schema checks.
export type { AgeProof, AgeVerificationRequest } from "./routes/ageVerification.ts";
export type { ChatMenuLink } from "./chatMenu/menus.ts";
export type { ErrorBody } from "./errors.ts";
export type { ActivityEntry, Explore } from "./explore/explore.ts";
export type { LeaderboardRow } from "./explore/leaderboards.ts";
export type { PackagedGift, PendingGifts } from "./gifts/packaging.ts";
export type {
  GiftPreview,
  GiftsForYou,
  OpenGiftBody,
  ReceivedGift,
  ReceiveRefusal,
} from "./gifts/receiving.ts";
export type { GratitudeWithReplay, UnseenGratitude } from "./gratitude/feed.ts";
export type { RecordGratitude } from "./gratitude/record.ts";
export type { ReplayV1 } from "./gratitude/replay.ts";
export type {
  AgeStatus,
  Gift,
  Gratitude,
  IsoTime,
  Me,
  Person,
  Placement,
  Sticker,
  StickerPlacement,
  Tickets,
  TicketShop,
  UserStats,
} from "./shapes.ts";
export type { BoardSticker, StickerBoard } from "./stickerBoards/board.ts";
export type { SealResponse } from "./stickers/seal.ts";
export type { StickerDetail, TransferTrailEntry } from "./stickers/stickerDetail.ts";
export type { TimelapseV1 } from "./stickers/timelapse.ts";
export type {
  SpendTicket,
  StartedTicketPurchase,
  TicketKind,
  TicketPurchasePayment,
  TicketUse,
} from "./tickets/tickets.ts";
