import { hc } from "hono/client";
import type { AppType } from "./app.ts";

export type { AppType };

// The contract's shapes, for the app's screens: each is the type its route's schema checks.
export type { ErrorBody } from "./errors.ts";
export type { ActivityEntry, Explore } from "./explore/explore.ts";
export type { LeaderboardRow } from "./explore/leaderboards.ts";
export type { PackagedGift, PendingGifts } from "./gifts/packaging.ts";
export type {
  GiftPreview,
  LiffContextType,
  OpenGiftBody,
  ReceivedGift,
  ReceiveRefusal,
} from "./gifts/receiving.ts";
export type { GratitudeWithReplay, UnseenGratitude } from "./gratitude/feed.ts";
export type { RecordGratitude } from "./gratitude/record.ts";
export type { ReplayV1 } from "./gratitude/replay.ts";
export type {
  EscrowTransfer,
  GiftStatus,
  IsoTime,
  Me,
  Person,
  StickerImages,
  TicketQuote,
  Tickets,
  UserStats,
} from "./shapes.ts";
export type { BoardSticker, StickerBoard } from "./stickerBoards/board.ts";
export type { SealResponse } from "./stickers/seal.ts";
export type { StickerDetail, TransferTrailEntry } from "./stickers/stickerDetail.ts";
export type { TicketKind, TicketUse } from "./tickets/tickets.ts";
export type { Gift, Gratitude, Placement, Sticker, StickerPlacement } from "./views.ts";

/**
 * The REST API's typed client, from its routes' own types: `createApiClient().me.$get()` calls
 * GET /api/me. `baseUrl` is the origin that serves /api; the app's own, behind a proxy, by default.
 */
export const createApiClient = (baseUrl = "/") => hc<AppType>(baseUrl).api;

export type ApiClient = ReturnType<typeof createApiClient>;
