import type {
  ErrorBody,
  GiftClaimRequest,
  GiftPreviewResponse,
  PendingGiftsResponse,
  Placement,
  ReceiveGiftResponse,
  RecordGratitude,
  RecordGratitudeResponse,
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
  /** POST /api/gratitude, with keepalive, so a combo that ends as the page goes away still lands. */
  recordGratitude: (body: RecordGratitude) => Promise<RecordGratitudeResponse>;
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

/** How long a request may go unanswered before it counts as no answer. */
const REQUEST_TIMEOUT_MS = 15_000;

const isErrorBody = (value: unknown): value is ErrorBody =>
  typeof value === "object" &&
  value !== null &&
  "error" in value &&
  typeof value.error === "string";

/** POSTs `body` as JSON to the app's server and returns its answer; a refusal or none throws an ApiError. */
export async function postJson(
  path: string,
  body: unknown,
  init: Pick<RequestInit, "keepalive"> = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw apiError(error);
  }
  // An answer that isn't JSON, like a static host's error page, still reports its status.
  const answer: unknown = await response.json().catch(() => null);
  if (response.ok) return answer;
  throw new ApiError(
    response.status,
    isErrorBody(answer)
      ? answer
      : { error: "unexpected_response", detail: `HTTP ${response.status} ${response.statusText}` },
  );
}
