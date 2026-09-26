import type {
  ErrorBody,
  GiftClaimRequest,
  GiftPreviewResponse,
  PendingGiftsResponse,
  Placement,
  ReceiveGiftResponse,
  StickerBoardResponse,
  StickerDetailResponse,
  StickerPlacement,
} from "./contract";

/** The REST API, one method per route the app calls. */
export interface ApiClient {
  /** GET /api/sticker-boards/me */
  stickerBoard: () => Promise<StickerBoardResponse>;
  /** PATCH /api/sticker-boards/me/sticker-placements/:stickerId */
  saveStickerPlacement: (stickerId: string, placement: Placement) => Promise<StickerPlacement>;
  /** POST /api/sticker-boards/me/sticker-tray/seen */
  markTraySeen: (stickerIds: readonly string[]) => Promise<{ newStickerCount: number }>;
  /** GET /api/stickers/:stickerId */
  stickerDetail: (stickerId: string) => Promise<StickerDetailResponse>;
  /** GET /api/gifts/pending */
  pendingGifts: () => Promise<PendingGiftsResponse>;
  /** POST /api/gifts/preview */
  previewGift: (body: GiftClaimRequest) => Promise<GiftPreviewResponse>;
  /** POST /api/gifts/receive */
  receiveGift: (body: GiftClaimRequest) => Promise<ReceiveGiftResponse>;
}

/** A refused or failed request: the HTTP status and the REST doc's error body. Status 0 is no answer. */
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
