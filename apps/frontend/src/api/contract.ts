/**
 * The REST API's shapes, as docs/database-schema-and-rest-api.md writes them, for the routes the app
 * calls. Temporary: once the Hono routes exist the app takes these from Hono's client, and this goes.
 */

export type IsoTime = string;

/** Anyone, as other signed-in people see them. */
export interface Person {
  id: string;
  handle: string | null;
  /** Null after account deletion. */
  lineDisplayName: string | null;
  linePictureUrl: string | null;
}

export interface Sticker {
  id: string;
  /** Printed as No.0147. */
  number: number;
  /** The Original Artist. */
  artist: Person;
  ownerId: string;
  /** Seconds on the drawing clock. */
  timeUsed: number;
  width: number;
  height: number;
  /** The cut line, an SVG path in image pixels. */
  outline: string;
  contentHash: string;
  /** CDN URLs. */
  images: { png: string; mask: string; spec: string; rim: string; flat: string };
  tokenId: string | null;
  mintTxHash: string | null;
  sealedAt: IsoTime;
}

export interface Placement {
  /** False: waiting in the sticker tray. */
  onBoard: boolean;
  x: number;
  y: number;
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  z: number;
}

export interface StickerPlacement {
  stickerId: string;
  /** Null until your board first places it. */
  placement: Placement | null;
  /** Null shows NEW. */
  seenAt: IsoTime | null;
  /** The sticker tray's order. */
  arrivedAt: IsoTime;
}

export type GiftStatus = "packed" | "sent" | "received" | "taken_out" | "returned";
export type EscrowStatus = "missing" | "pending" | "claimed" | "rejected" | "expired_returned";

export interface Gift {
  id: string;
  stickerId: string;
  giverId: string;
  receiverId: string | null;
  status: GiftStatus;
  escrowStatus: EscrowStatus;
  packedAt: IsoTime;
  expiresAt: IsoTime;
  sentAt: IsoTime | null;
  takenOutAt: IsoTime | null;
  receivedAt: IsoTime | null;
  returnedAt: IsoTime | null;
}

export interface Gratitude {
  giftId: string;
  method: "tap" | "stroke" | "shake";
  hits: number;
  total: number;
  peakMult: number;
  peakTier: 0 | 1 | 2 | 3 | 4;
  originalArtistGratitudeShare: number;
  gameConfigVersion: string;
  recordedAt: IsoTime;
  seenByGiverAt: IsoTime | null;
}

/**
 * A gratitude combo, as played. Positions are 0–10000 of the stage; values that follow one another
 * store the change from the one before.
 */
export interface ReplayV1 {
  v: 1;
  /** Pop-in lines and particles. */
  seed: number;
  /** 0–1, set by the person sending gratitude. */
  intensity: number;
  /** Pixels. */
  stage: [width: number, height: number];
  /** 0–8000. */
  durationMs: number;
  endReason: "sent" | "empty" | "cap" | "hidden" | "closed";
  /** Where a tap combo committed to stroke or shake. */
  switchedAtHit: number | null;
  /** Flat: [msSincePrevious, x, y, counted (0 | 1), …] for every touch. */
  hits: number[];
  /** One per stroke: [msSincePrevious, x, y, …] at about 30 Hz. */
  strokes: number[][];
  /** Flat: [msSincePrevious, direction (1 | -1), …]. */
  shakes: number[];
}

export interface BoardSticker extends StickerPlacement {
  sticker: Sticker;
  /** False: given away; a GivenStickerSilhouette on the board, an empty spot in the tray. */
  held: boolean;
  /** Set when held is false. */
  givenTo: { receiver: Person; receivedAt: IsoTime } | null;
  openGift: { id: string; status: "packed" | "sent" } | null;
}

export interface TransferTrailEntry {
  giftId: string;
  giver: Person;
  receiver: Person;
  receivedAt: IsoTime;
  gratitude: Gratitude | null;
}

export type LiffContextType = "utou" | "room" | "group" | "square_chat" | "external" | "none";

export type ReceiveRefusal =
  | "group_chat"
  | "own_gift"
  | "already_received"
  | "taken_back"
  | "gift_returned"
  | "gift_expired"
  | "not_deposited";

export interface ErrorBody {
  /** Stable snake_case code. */
  error: string;
  detail?: string;
}

/** GET /api/sticker-boards/:userId */
export interface StickerBoardResponse {
  owner: Person;
  /** In the sticker tray's order. */
  boardStickers: BoardSticker[];
}

/** GET /api/stickers/:stickerId */
export interface StickerDetailResponse {
  sticker: Sticker;
  owner: Person;
  /** Newest first. */
  transferTrail: TransferTrailEntry[];
}

/** GET /api/gifts/pending: your packed and sent gifts, newest first. */
export interface PendingGiftsResponse {
  gifts: Array<{ gift: Gift; sticker: Sticker }>;
}

/** POST /api/gifts/preview and POST /api/gifts/receive take the same body. */
export interface GiftClaimRequest {
  giftClaimToken: string;
  liffContextType: LiffContextType;
}

export interface GiftPreviewResponse {
  giver: Person;
  expiresAt: IsoTime;
  receivable: boolean;
  refusal: ReceiveRefusal | null;
  /** Only when receivable. */
  sticker: Sticker | null;
}

export interface ReceiveGiftResponse {
  gift: Gift;
  sticker: Sticker;
  stickerPlacement: StickerPlacement;
}

/** POST /api/gratitude: records a Mini-game combo. */
export interface RecordGratitude {
  /** A UUID made at the first hit. */
  idempotencyKey: string;
  giftId: string;
  method: "tap" | "stroke" | "shake";
  /** 1–120. */
  hits: number;
  total: number;
  /** 1–8. */
  peakMult: number;
  peakTier: 0 | 1 | 2 | 3 | 4;
  gameConfigVersion: string;
  replay: ReplayV1;
}

/** 201 when recorded; 200 with the stored record when the same idempotencyKey comes again. */
export interface RecordGratitudeResponse {
  gratitude: Gratitude;
}
