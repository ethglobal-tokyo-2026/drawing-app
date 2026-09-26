# Database schema and REST API (planned)

What the server will store and serve, so UI work and mocks can line up with it while it's built. None of it exists yet: the app still keeps stickers, tickets and gifts on the device. This file is temporary: once `packages/db` holds the schema and the API routes exist, delete it and point AGENTS.MD at those instead.

## How it fits together

- **Server:** Hono, with SQLite through Drizzle (`packages/db`).
- **Types:** request and response types derive from the tables through drizzle-zod. The app will call routes through Hono's typed client, so UI code gets its types from the server. Until then, the shapes below are the contract.
- **Sign-in:** every screen needs LINE Login; there are no public pages. The server verifies LIFF's ID token and sets a session cookie.
- **Chain:** Ethereum Sepolia is the owner of record for each sticker (`StickerNFT`) and each gift in transit (`StickerGiftEscrow`). The server keeps a small index of chain state, so screens don't wait for the chain except where noted below.
- **Images:** five files per sticker on our CDN, named by the sticker PNG's content hash. The NFT's metadata is a JSON file on the same CDN. No IPFS.

## Rules that shape the UI

### Tickets

- **Daily tickets:** three free ones per ticket day. A ticket day runs midnight to midnight, Tokyo time, for everyone; unused daily tickets expire with it.
- **Reserve tickets:** bought with SUI, no limit, never expire. Daily tickets are always spent first.
- **Start screen:** drawing starts from a screen that shows the tickets left and a button that spends one (`StartDrawing`). The 3-minute clock then waits for the first stroke. Keep drawing on the sealed card spends a daily ticket without asking; with none left, the start screen asks before spending a reserve ticket, or offers the ticket shop. Draw right after a purchase spends one without asking.
- **Ticket shop:** packs of 1, 3, 5 or 10 for ¥100, ¥270, ¥375 or ¥600, shown with their discount off ¥100 each. Prices are in yen and paid in SUI, converted at the server's 5-minute time-weighted average SUI/JPY price. The payment is a mock for now.
- **Draw keys** show daily and reserve tickets left, each as its ticket mark × count. Daily tickets are Seal Yellow, reserve tickets Grape.

### Sealing

- Sealing waits for the mint. Until Privy smart wallets are set up, the mint step is a stub: a dev toast, and a comment where the minting logic goes.
- A sticker's number (No.0147) is separate from its NFT token ID. The sticker detail links to the token on Sepolia Etherscan.

### Sticker Board and sticker tray

- A sticker lands on your board when it reaches you: at seal, or when you receive it. The board picks the spot and saves it.
- The sticker tray is in the order stickers reached you. A given sticker leaves its spot empty; one that comes back to you returns to its old spot.
- **NEW:** stored per sticker on the server, so it matches across devices.
  - It clears when the tray zips shut with the sticker's sheet open.
  - It comes back when a sticker comes back to you.

### Giving

- Packaging sends the sticker to the escrow from the giver's smart wallet; the bag animation is only the visual. LINE's friend picker opens once the deposit lands, usually after a few seconds.
- A cancelled or failed picker leaves the gift in the bag, and "Send in LINE" reuses it.
- **Taking a gift back:** the giver can do it any time until the gift is received, from the bag or after sending. Follow-up: the UI for taking back a sent gift.
- **7 days:** a gift nobody receives within 7 days goes back to the giver. Follow-up: what the giver, and whoever opens the Gift Message later, see.
- A sticker can't be given on until its last claim, take-back or return has landed on chain, usually a few seconds.

### Receiving

- The Gift Message's link carries the Gift Claim Token. The first person to receive gets the sticker; a forwarded link fails for everyone after.
- **Seeing it first:** opening the link previews the gift. For an open the gift can be received from, the preview includes the sticker, so unpackaging shows it before Accept; Accept receives it.
- **The terms line:** Accept carries it, so receiving sets `terms_accepted_at` when it's unset.
- **Refused:**
  - opens from a group, a multi-person chat or an OpenChat;
  - your own gift;
  - a gift already received, taken back or returned;
  - a gift past its 7 days;
  - a gift whose deposit hasn't landed.

### Gratitude

- One gratitude per received gift, from its receiver to its giver. Only the Mini-game makes gratitude, so the design drafts' stat board Daily row is gone.
- **The Original Artist Gratitude Share:** 20% of the total goes to the Original Artist, out of the giver's part, when they're neither the giver nor the receiver.
  - Gratitude to the Original Artist is all theirs.
  - Gratitude from the Original Artist, after a sticker comes back to them, is all the giver's.
- The replay stores every touch, the stroke paths and a random seed, so it plays back as it looked.

### User Stats

- **Streak:** consecutive ticket days with a sealed sticker. A missed day resets it to 0, and today isn't missed until it's over. Today's app lowers the streak by one per missed day instead (`userStats.ts`).
- **Leaderboards** include everyone.

### Handles

- Your handle starts as your LINE name. The app asks for a different one only at sign-up, when someone already has that name (ignoring letter case).

### Account deletion

- Not designed yet. LINE requires offering it, and deleting the person's LINE data when they use it.

## Limits and constants

| Name                              | Value                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| Drawing clock (`MAX_TIME_USED_S`) | 180 s                                                        |
| Daily tickets                     | 3 per ticket day; the day turns over at midnight, Tokyo time |
| Ticket packs                      | 1, 3, 5, 10 tickets for ¥100, ¥270, ¥375, ¥600               |
| SUI/JPY price                     | 5-minute time-weighted average; a quote holds for 60 s       |
| Gift expiry (`GIFT_EXPIRY_MS`)    | 7 days after Packaging                                       |
| Hits per combo (`MAX_HITS`)       | 1–120                                                        |
| Gratitude multiplier              | 1–8                                                          |
| Gratitude tiers                   | 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天          |
| Original Artist Gratitude Share   | 20% of a combo's total                                       |
| Explore's day and week            | from 4:00 and from Monday 4:00, Tokyo time                   |

## Tables

- **Times** are integer milliseconds since the epoch in the database; the API sends them as ISO 8601 strings.
- **Every table** also has `created_at` (set by the database on insert, never changed) and `updated_at` (moved by every update).
- **Hashes and addresses** are lowercase 0x-prefixed hex; uint256 values are decimal text.

### `users`: one row per person

Inserted at the first sign-in.

| Column                  | Type           | Values                      | Set when                                                       | Meaning                                                      |
| ----------------------- | -------------- | --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `id`                    | text, PK       | UUID                        | first sign-in                                                  |                                                              |
| `line_user_id`          | text, null     | LINE's `sub`; unique        | first sign-in; cleared on account deletion                     | finds a returning person; the Official account's push target |
| `line_display_name`     | text, null     | LINE name                   | every sign-in; cleared on account deletion                     | how others see them                                          |
| `line_picture_url`      | text, null     | https URL                   | every sign-in; cleared on account deletion                     |                                                              |
| `handle`                | text, null     | unique ignoring letter case | first sign-in (the LINE name, when free), or the handle prompt | printed as `@handle`                                         |
| `smart_account_address` | text, null     | `0x` + 40 hex; unique       | the first time the server needs it, from Privy                 | where stickers are minted and claimed                        |
| `terms_accepted_at`     | int (ms), null |                             | the first action that carries the terms line                   |                                                              |
| `deleted_at`            | int (ms), null |                             | account deletion                                               |                                                              |

- A live account has `line_user_id` and `line_display_name`; a deleted one has none of the LINE columns.
- `created_at` is the stat board's "Since".

### `stickers`: one row per sealed sticker

Inserted at seal. Everything but `owner_id` and the mint is fixed then.

| Column         | Type         | Values                   | Set when                                      | Meaning                                                      |
| -------------- | ------------ | ------------------------ | --------------------------------------------- | ------------------------------------------------------------ |
| `id`           | text, PK     | UUID                     | seal                                          | the NFT's sticker key is keccak256 of it                     |
| `number`       | int          | 1, 2, 3…; unique         | seal                                          | shown as No.0147                                             |
| `artist_id`    | text → users |                          | seal                                          | the Original Artist                                          |
| `owner_id`     | text → users |                          | seal (the Original Artist), then each receive | who holds it now                                             |
| `time_used`    | int          | 0–180                    | seal                                          | seconds on the drawing clock                                 |
| `width`        | int          | > 0                      | seal                                          | the sticker image's size in pixels; all five images share it |
| `height`       | int          | > 0                      | seal                                          |                                                              |
| `outline`      | text         | SVG path in image pixels | seal                                          | the cut line: ticket stubs, sheet packing, silhouettes       |
| `content_hash` | text         | `0x` + 64 hex            | seal                                          | keccak256 of the sticker PNG; names its image files          |
| `metadata_uri` | text         | CDN URL                  | seal                                          | the NFT's tokenURI                                           |
| `token_id`     | text, null   | uint256; unique          | the mint lands                                | null while minting is a stub                                 |
| `mint_tx_hash` | text, null   | `0x` + 64 hex            | with `token_id`                               | for the WorldScan link                                       |

- `created_at` is the seal: the sealed card's date, "Today's stickers", streak days.

### `sticker_timelapses`: one row per sticker

Inserted with the sticker at seal; its own table so board reads never load it.

| Column       | Type                | Values                              | Set when | Meaning          |
| ------------ | ------------------- | ----------------------------------- | -------- | ---------------- |
| `sticker_id` | text, PK → stickers |                                     | seal     |                  |
| `ops`        | blob                | gzipped JSON, `TimelapseV1` (below) | seal     | how it was drawn |

### `ticket_uses`: one row per spent ticket

Inserted when the start screen's button spends a ticket.

| Column       | Type                  | Values                   | Set when | Meaning                                      |
| ------------ | --------------------- | ------------------------ | -------- | -------------------------------------------- |
| `id`         | int, PK               | auto                     | spend    |                                              |
| `user_id`    | text → users          |                          | spend    |                                              |
| `ticket_day` | text                  | `YYYY-MM-DD`, Tokyo time | spend    |                                              |
| `day_index`  | int                   | 0, 1, 2…                 | spend    | order within the day                         |
| `kind`       | text                  | `daily`, `reserve`       | spend    | daily for `day_index` 0–2, reserve after     |
| `sticker_id` | text, null → stickers | unique                   | seal     | null for good when the drawing was abandoned |

- `(user_id, ticket_day, day_index)` is unique, so a double tap can't spend two tickets.
- `created_at` is when the ticket was spent.

### `ticket_purchases`: one row per pack bought

| Column        | Type           | Values             | Set when                                           | Meaning                      |
| ------------- | -------------- | ------------------ | -------------------------------------------------- | ---------------------------- |
| `id`          | int, PK        | auto               | purchase                                           |                              |
| `user_id`     | text → users   |                    | purchase                                           |                              |
| `tickets`     | int            | 1, 3, 5, 10        | purchase                                           | the pack                     |
| `price_yen`   | int            | 100, 270, 375, 600 | purchase                                           |                              |
| `sui_yen`     | text           | decimal            | purchase                                           | the quote's SUI/JPY price    |
| `paid_mist`   | text           | decimal MIST       | purchase                                           | what the Sui payment carried |
| `tx_digest`   | text           | Sui digest; unique | purchase                                           | one payment counts once      |
| `verified_at` | int (ms), null |                    | the server checks it on Sui (at once for the mock) | its tickets count from then  |

- Reserve tickets left = verified purchases' `tickets` minus `reserve` uses. They carry over from day to day.
- A purchase counts only if `paid_mist` covers the pack at a quote the server issued within the last 60 s.

### `sticker_placements`: one row per person and sticker that has reached them

Inserted when a sticker first reaches someone: at seal for the Original Artist, when they receive it for anyone else. It stays after they give the sticker away.

| Column       | Type                | Values             | Set when                                                                    | Meaning                                           |
| ------------ | ------------------- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `user_id`    | text → users; PK    |                    | insert                                                                      | whose Sticker Board                               |
| `sticker_id` | text → stickers; PK |                    | insert                                                                      |                                                   |
| `on_board`   | bool, null          |                    | their board first places it, then every move and Remove                     | false: waiting in the sticker tray                |
| `x`, `y`     | real, null          | 0–1                | same                                                                        | centre, as fractions of the board's field         |
| `scale`      | real, null          | above 0, up to 1   | same                                                                        | the long side, as a fraction of the board's width |
| `rotation`   | real, null          | degrees, clockwise | same                                                                        |                                                   |
| `z`          | int, null           |                    | same                                                                        | stacking order; higher is on top                  |
| `seen_at`    | int (ms), null      |                    | the tray zips shut with its sheet open; cleared when the sticker comes back | null shows NEW                                    |

- The placement columns are all null (not placed yet) or all set.
- `created_at` is the tray's order; it's kept when a sticker comes back, so it returns to its old spot.

### `gifts`: one row per Giving

Inserted at Packaging.

| Column               | Type               | Values                                                          | Set when                                  | Meaning                             |
| -------------------- | ------------------ | --------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| `id`                 | text, PK           | `0x` + 64 hex                                                   | Packaging                                 | the escrow's giftId                 |
| `sticker_id`         | text → stickers    |                                                                 | Packaging                                 |                                     |
| `giver_id`           | text → users       |                                                                 | Packaging                                 |                                     |
| `claim_commitment`   | text               | `0x` + 64 hex; unique                                           | Packaging                                 | keccak256 of the Gift Claim Token   |
| `status`             | text               | `packed`, `sent`, `received`, `taken_out`, `returned`           | see below                                 | where the gift stands               |
| `escrow_status`      | text               | `missing`, `pending`, `claimed`, `rejected`, `expired_returned` | see below                                 | the escrow contract's status for it |
| `expires_at`         | int (ms)           | `created_at` + 7 days                                           | Packaging                                 | Receiving is refused after it       |
| `sent_at`            | int (ms), null     |                                                                 | LINE's picker reports it sent             |                                     |
| `taken_out_at`       | int (ms), null     |                                                                 | the giver takes it back                   |                                     |
| `receiver_id`        | text, null → users |                                                                 | receive                                   |                                     |
| `received_at`        | int (ms), null     |                                                                 | receive                                   |                                     |
| `returned_at`        | int (ms), null     |                                                                 | the 7 days run out                        |                                     |
| `claim_tx_hash`      | text, null         |                                                                 | the server sends `claimGift`              |                                     |
| `reject_tx_hash`     | text, null         |                                                                 | the server sends `rejectGift`             |                                     |
| `return_tx_hash`     | text, null         |                                                                 | the server sends `returnExpiredGift`      |                                     |
| `pushed_to_giver_at` | int (ms), null     |                                                                 | the "received your sticker" push goes out |                                     |

| `status`    | Means                                             | Giver sees                                  | Whoever opens the link sees        |
| ----------- | ------------------------------------------------- | ------------------------------------------- | ---------------------------------- |
| `packed`    | in the bag; the Gift Message isn't confirmed sent | "In the bag"; "Not sent yet" after a cancel | the gift, if the message went out  |
| `sent`      | LINE's picker reported the Gift Message sent      | "On its way"; the sticker leaves the board  | "Alice sent you a sticker"         |
| `received`  | someone received it                               | a GivenStickerSilhouette                    | their board; anyone after: refused |
| `taken_out` | the giver took it back before anyone received it  | the sticker, back                           | refused (`taken_back`)             |
| `returned`  | 7 days passed, so the escrow returned it          | the sticker, back                           | refused (`gift_returned`)          |

| `escrow_status`    | Means                                         |
| ------------------ | --------------------------------------------- |
| `missing`          | the deposit hasn't landed                     |
| `pending`          | the escrow holds the sticker                  |
| `claimed`          | the receiver's claim landed                   |
| `rejected`         | a take-back's reject landed; the giver has it |
| `expired_returned` | the expiry return landed; the giver has it    |

- One gift per sticker at a time: while it's `packed` or `sent`, and while the escrow still holds the sticker.
- Nothing is sent or received before the deposit (`escrow_status` `pending`).
- A gift can't be received by its giver.

### `gratitude`: one row per received gift that gratitude was sent for

Inserted when the receiver's Mini-game combo is recorded.

| Column                            | Type             | Values                           | Set when                                | Meaning                                                                 |
| --------------------------------- | ---------------- | -------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `gift_id`                         | text, PK → gifts |                                  | recorded                                | the received gift it's for; one gratitude per gift                      |
| `idempotency_key`                 | text             | UUID; unique                     | recorded                                | made on the device at the first hit                                     |
| `method`                          | text             | `tap`, `stroke`, `shake`         | recorded                                | the method the combo ended in                                           |
| `hits`                            | int              | 1–120                            | recorded                                | counted taps, stroke passes or shake reversals                          |
| `total`                           | int              | ≥ 0                              | recorded                                | the gratitude, multiplier included                                      |
| `peak_mult`                       | real             | 1–8                              | recorded                                |                                                                         |
| `peak_tier`                       | int              | 0–4                              | recorded                                |                                                                         |
| `original_artist_gratitude_share` | int              | 0 to `total`                     | recorded                                | the Original Artist's 20%, or 0; the giver's part is `total` minus this |
| `game_config_version`             | text             |                                  | recorded                                | the Mini-game tuning it was played with                                 |
| `replay`                          | blob             | gzipped JSON, `ReplayV1` (below) | recorded                                |                                                                         |
| `seen_by_giver_at`                | int (ms), null   |                                  | the giver watches the replay            | null shows the pink tag                                                 |
| `pushed_to_giver_at`              | int (ms), null   |                                  | its push, or a digest with it, goes out |                                                                         |

## REST API

### Conventions

- **Base path:** `/api`. JSON in and out, except sealing (multipart) and the timelapse (gzipped JSON).
- **Session:** `POST /api/session` sets a signed, HttpOnly cookie named `session`. Every other route needs it, and returns 401 `signed_out` without it.
- **Times:** ISO 8601 UTC strings, e.g. `"2026-09-26T02:15:00.000Z"`. Ticket days are `"YYYY-MM-DD"`.
- **IDs:** people and stickers are UUID strings; gifts are `0x` + 64 hex; ticket uses are integers.
- **Errors:** every error has this body, and its code is stable, so mocks can switch on it:

  ```ts
  interface ErrorBody {
    error: string; // snake_case code, listed per route
    detail?: string; // human-readable; for 400, names the field
  }
  ```

  400 `invalid_request` is possible on every route with a body or query.

### Shared shapes

```ts
type IsoTime = string;

/** Anyone, as other signed-in people see them. */
interface Person {
  id: string;
  handle: string | null;
  lineDisplayName: string | null; // null after account deletion
  linePictureUrl: string | null;
}

/** You. */
interface Me extends Person {
  createdAt: IsoTime; // the stat board's "Since"
  needsHandle: boolean; // true until the handle prompt is answered
  newStickerCount: number; // NEW in your sticker tray
  unseenGratitudeCount: number; // the pink tag
}

interface Sticker {
  id: string;
  number: number; // No.0147
  artist: Person; // the Original Artist
  ownerId: string;
  timeUsed: number; // seconds, 0–180
  width: number;
  height: number;
  outline: string; // SVG path in image pixels
  contentHash: string;
  images: { png: string; mask: string; spec: string; rim: string; flat: string }; // CDN URLs
  tokenId: string | null; // null while minting is a stub
  mintTxHash: string | null; // for the WorldScan link
  sealedAt: IsoTime;
}

interface StickerPlacement {
  stickerId: string;
  placement: {
    onBoard: boolean; // false: waiting in the sticker tray
    x: number; // 0–1
    y: number; // 0–1
    scale: number; // above 0, up to 1
    rotation: number; // degrees, clockwise
    z: number;
  } | null; // null until your board first places it
  seenAt: IsoTime | null; // null shows NEW
  arrivedAt: IsoTime; // the sticker tray's order
}

type GiftStatus = "packed" | "sent" | "received" | "taken_out" | "returned";
type EscrowStatus = "missing" | "pending" | "claimed" | "rejected" | "expired_returned";

interface Gift {
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

interface Gratitude {
  giftId: string;
  method: "tap" | "stroke" | "shake";
  hits: number; // 1–120
  total: number;
  peakMult: number; // 1–8
  peakTier: 0 | 1 | 2 | 3 | 4;
  originalArtistGratitudeShare: number;
  gameConfigVersion: string;
  recordedAt: IsoTime;
  seenByGiverAt: IsoTime | null;
}

interface Tickets {
  ticketDay: string; // "YYYY-MM-DD", Tokyo time
  dailyPerDay: number;
  dailyLeft: number;
  reserveLeft: number;
  nextRefillAt: IsoTime; // the next midnight, Tokyo time
  usedToday: Array<{
    id: number;
    dayIndex: number;
    kind: "daily" | "reserve";
    sticker: { id: string; outline: string; width: number; height: number } | null; // for the ticket stubs
  }>;
}

interface TicketQuote {
  suiYen: string; // decimal: yen per SUI, 5-minute time-weighted average
  quotedAt: IsoTime;
  expiresAt: IsoTime; // 60 s after quotedAt
  packs: Array<{
    tickets: 1 | 3 | 5 | 10;
    priceYen: number;
    discountPercent: number; // off ¥100 per ticket: 0, 10, 25, 40
    priceMist: string; // decimal MIST, rounded up
  }>;
}

interface UserStats {
  since: IsoTime;
  made: number;
  received: number;
  given: number;
  gratitude: {
    inspired: number; // your part of tap combos on gifts you gave
    magic: number; // your part of stroke and shake combos
    asOriginalArtist: number; // Original Artist Gratitude Shares
    total: number;
  };
  bests: { bestCombo: number; mostGratitudeInADay: number; longestStreak: number };
  streak: number; // current; a missed ticket day resets it to 0
}
```

### Replay and timelapse formats

Both are JSON with a version field. The replay travels as JSON; the server gzips it for storage. The timelapse is sent and served gzipped.

```ts
/** A gratitude combo, as played. Positions are 0–10000 of the stage; values that follow one another store the change from the one before. */
interface ReplayV1 {
  v: 1;
  seed: number; // pop-in lines and particles
  intensity: number; // 0–1, the receiver's setting
  stage: [width: number, height: number]; // px
  durationMs: number; // 0–8000
  endReason: "sent" | "empty" | "cap" | "hidden" | "closed";
  switchedAtHit: number | null; // where a tap combo committed to stroke or shake
  hits: number[]; // flat: [msSincePrevious, x, y, counted (0 | 1), …] for every touch
  strokes: number[][]; // one per stroke: [msSincePrevious, x, y, …] at about 30 Hz
  shakes: number[]; // flat: [msSincePrevious, direction (1 | -1), …]
}

/** How a sticker was drawn: the ink canvas's ops, in order. Points are x, y and width in tenths of a pixel, plus ms, each as the change from the point before. */
interface TimelapseV1 {
  v: 1;
  ink: [width: number, height: number]; // the ink canvas, px
  place: [x: number, y: number, width: number, height: number]; // where the sticker image sits on it
  ops: Array<
    | ["brush" | "eraser", color: string, startMs: number, points: number[]]
    | ["fill", color: string, atMs: number, x: number, y: number]
  >;
}
```

### Session and you

| Route                 | Request                                                      | Response                              | Errors                                   |
| --------------------- | ------------------------------------------------------------ | ------------------------------------- | ---------------------------------------- |
| `POST /api/session`   | `{ idToken: string }`: from `liff.getIDToken()`              | 200 `{ me: Me }`, and sets the cookie | 401 `line_token_invalid`                 |
| `GET /api/me`         | none                                                         | 200 `{ me: Me }`                      |                                          |
| `POST /api/me/handle` | `{ handle: string }`: 1–32 characters after trimming, no `@` | 200 `{ me: Me }`                      | 400 `handle_invalid`; 409 `handle_taken` |
| `DELETE /api/me`      | none                                                         | 204, and clears the cookie            |                                          |

### Tickets

| Route                        | Request                                                              | Response                                                                                                                                 | Errors                                                                                  |
| ---------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/tickets`           | none                                                                 | 200 `{ tickets: Tickets }`                                                                                                               |                                                                                         |
| `POST /api/tickets/spend`    | `{ kind: "daily" \| "reserve" }`: the kind the start screen offered  | 201 `{ ticketUse: { id: number; ticketDay: string; dayIndex: number; kind: "daily" \| "reserve"; spentAt: IsoTime }; tickets: Tickets }` | 409 `no_tickets_left`; 409 `ticket_kind_changed` when the next ticket is the other kind |
| `GET /api/ticket-quote`      | none                                                                 | 200 `{ quote: TicketQuote }`                                                                                                             | 503 `sui_price_unavailable`                                                             |
| `POST /api/ticket-purchases` | `{ tickets: 1 \| 3 \| 5 \| 10; txDigest: string; paidMist: string }` | 201 `{ tickets: Tickets }`                                                                                                               | 400 `pack_unknown`; 402 `payment_short`; 409 `payment_already_counted`                  |

### Stickers

**`POST /api/stickers`** seals a sticker. The request is `multipart/form-data`:

| Part          | Type                     | Values                                    |
| ------------- | ------------------------ | ----------------------------------------- |
| `ticketUseId` | field                    | the id `POST /api/tickets/spend` returned |
| `timeUsed`    | field                    | integer seconds, 0–180                    |
| `width`       | field                    | integer pixels, > 0                       |
| `height`      | field                    | integer pixels, > 0                       |
| `outline`     | field                    | SVG path in image pixels                  |
| `png`         | file, `image/png`        | the finished sticker                      |
| `mask`        | file, `image/png`        | the cut's shape                           |
| `spec`        | file, `image/png`        | the live resin's specular mask            |
| `rim`         | file, `image/png`        | the live resin's rim-light mask           |
| `flat`        | file, `image/png`        | the sheet as drawn                        |
| `timelapse`   | file, `application/gzip` | gzipped `TimelapseV1`                     |

- 201 `{ sticker: Sticker; stickerPlacement: StickerPlacement }`, once the mint step resolves. While minting is a stub, `tokenId` is null.
- Errors: 403 `ticket_not_yours`; 404 `ticket_not_found`; 409 `ticket_already_used`.

| Route                                    | Request | Response                                                                                                        | Errors                  |
| ---------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `GET /api/stickers/:stickerId`           | none    | 200 `{ sticker: Sticker; owner: Person; transferTrail: TransferTrailEntry[] }`, the Transfer Trail newest first | 404 `sticker_not_found` |
| `GET /api/stickers/:stickerId/timelapse` | none    | 200 `TimelapseV1`, served with `Content-Encoding: gzip`                                                         | 404 `sticker_not_found` |

```ts
interface TransferTrailEntry {
  giftId: string;
  giver: Person;
  receiver: Person;
  receivedAt: IsoTime;
  gratitude: Gratitude | null;
}
```

### Sticker Board, sticker tray and stat board

| Route                                                        | Request                                                                                                                   | Response                                                                    | Errors                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------- |
| `GET /api/sticker-boards/:userId` (`me` for your own)        | none                                                                                                                      | 200 `{ owner: Person; boardStickers: BoardSticker[] }`, in the tray's order | 404 `user_not_found`              |
| `PATCH /api/sticker-boards/me/sticker-placements/:stickerId` | `{ onBoard: boolean; x: number; y: number; scale: number; rotation: number; z: number }`, ranges as in `StickerPlacement` | 200 `{ stickerPlacement: StickerPlacement }`                                | 404 `sticker_placement_not_found` |
| `POST /api/sticker-boards/me/sticker-tray/seen`              | `{ stickerIds: string[] }`: the stickers whose sheet was open when the tray zipped shut                                   | 200 `{ newStickerCount: number }`                                           |                                   |
| `GET /api/sticker-boards/:userId/user-stats`                 | none                                                                                                                      | 200 `{ userStats: UserStats }`                                              | 404 `user_not_found`              |

```ts
interface BoardSticker extends StickerPlacement {
  sticker: Sticker;
  held: boolean; // false: given away; show a GivenStickerSilhouette, and an empty spot in the tray
  givenTo: { receiver: Person; receivedAt: IsoTime } | null; // set when held is false: the silhouette's "→ @bob"
  openGift: { id: string; status: "packed" | "sent" } | null;
}
```

### Giving

| Route                              | Request                                                                        | Response                                                                                                                                                                | Errors                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST /api/gifts`                  | `{ stickerId: string }`                                                        | 201 `{ gift: Gift; giftClaimToken: string; escrowTransfer: EscrowTransfer \| null }`; or 200 with `giftClaimToken: null` when the sticker already has a gift in the bag | 403 `not_yours`; 404 `sticker_not_found`; 409 `not_minted`, `gift_in_transit`               |
| `POST /api/gifts/:giftId/deposit`  | `{ txHash: string }`: the escrow transfer's transaction or user operation hash | 200 `{ gift: Gift }`, `escrowStatus` `pending` once checked                                                                                                             | 403 `not_yours`; 404 `gift_not_found`; 409 `deposit_not_landed` (retry), `deposit_mismatch` |
| `POST /api/gifts/:giftId/shared`   | `{ outcome: "sent" \| "cancelled" }`: the picker's result                      | 200 `{ gift: Gift }`: `sent` moves it to `sent`; `cancelled` leaves it `packed`                                                                                         | 403 `not_yours`; 404 `gift_not_found`; 409 `not_deposited`, `gift_closed`                   |
| `POST /api/gifts/:giftId/take-out` | none                                                                           | 200 `{ gift: Gift }`, status `taken_out`                                                                                                                                | 403 `not_yours`; 404 `gift_not_found`; 409 `already_received`, `gift_closed`                |
| `GET /api/gifts/pending`           | none                                                                           | 200 `{ gifts: Array<{ gift: Gift; sticker: Sticker }> }`: your `packed` and `sent` gifts, newest first                                                                  |                                                                                             |

```ts
/** Send it from the giver's smart wallet to move the sticker into the escrow. */
interface EscrowTransfer {
  to: string; // the StickerNFT contract
  data: string; // calldata
}
```

- **The Gift Claim Token** comes back once, from the 201. Keep it on the device until the Gift Message is sent, and build the message's link from it: `https://liff.line.me/{liffId}/g/{giftClaimToken}`. If it's lost while the gift is in the bag, take the gift out and package again.
- **While minting is a stub,** `escrowTransfer` is null and the deposit counts as landed at once, so Giving works end to end, as the mock Sui purchase does.
- **`gift_closed`:** the gift was already received, taken back or returned.

### Receiving

| Route                     | Request                                                                                                                                            | Response                                                                                                                                                        | Errors                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/gifts/preview` | `{ giftClaimToken: string; liffContextType: "utou" \| "room" \| "group" \| "square_chat" \| "external" \| "none" }`, as `receive` takes it         | 200 `{ giver: Person; expiresAt: IsoTime; receivable: boolean; refusal: ReceiveRefusal \| null; sticker: Sticker \| null }`: the sticker only when `receivable` | 404 `gift_not_found`                                                                                                                                                        |
| `POST /api/gifts/receive` | `{ giftClaimToken: string; liffContextType: "utou" \| "room" \| "group" \| "square_chat" \| "external" \| "none" }`, from `liff.getContext().type` | 200 `{ gift: Gift; sticker: Sticker; stickerPlacement: StickerPlacement }`                                                                                      | 403 `group_chat` (room, group or square_chat), `own_gift`; 404 `gift_not_found`; 409 `already_received`, `taken_back`, `not_deposited`; 410 `gift_expired`, `gift_returned` |

```ts
type ReceiveRefusal =
  | "group_chat" // room, group or square_chat
  | "own_gift"
  | "already_received"
  | "taken_back"
  | "gift_returned"
  | "gift_expired"
  | "not_deposited";
```

### Gratitude

**`POST /api/gratitude`** records a Mini-game combo. Send it with `fetch(…, { keepalive: true })`, and send it again on the next open until it lands.

```ts
interface RecordGratitude {
  idempotencyKey: string; // UUID made at the first hit
  giftId: string;
  method: "tap" | "stroke" | "shake";
  hits: number; // 1–120
  total: number;
  peakMult: number; // 1–8
  peakTier: 0 | 1 | 2 | 3 | 4;
  gameConfigVersion: string;
  replay: ReplayV1;
}
```

- 201 `{ gratitude: Gratitude }`; 200 with the stored record when the same `idempotencyKey` comes again.
- Errors: 400 `replay_invalid`; 403 `not_receiver`; 404 `gift_not_found`; 409 `gift_not_received`, `gratitude_already_recorded`.

| Route                              | Request | Response                                                                                                                                       | Errors                                     |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `GET /api/gratitude/unseen`        | none    | 200 `{ unseen: Array<{ gratitude: Gratitude; sticker: Sticker; receiver: Person }> }`: gratitude to you that you haven't watched, oldest first |                                            |
| `GET /api/gratitude/:giftId`       | none    | 200 `{ gratitude: Gratitude; replay: ReplayV1; giver: Person; receiver: Person }`                                                              | 404 `gratitude_not_found`                  |
| `POST /api/gratitude/:giftId/seen` | none    | 200 `{ gratitude: Gratitude }`                                                                                                                 | 403 `not_giver`; 404 `gratitude_not_found` |

### Explore

| Route                    | Request                        | Response                                                                                                  | Errors |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------ |
| `GET /api/explore`       | none                           | 200 `Explore`                                                                                             |        |
| `GET /api/users?handle=` | `handle`: 1 or more characters | 200 `{ users: Person[] }`: handles starting with it first, then handles containing it, A to Z; at most 20 |        |

```ts
interface Explore {
  todaysStickers: Sticker[]; // sealed since 4:00 today, Tokyo time; newest first; at most 50
  activity: Array<
    | { type: "sealed"; at: IsoTime; sticker: Sticker }
    | { type: "received"; at: IsoTime; sticker: Sticker; giver: Person; receiver: Person }
  >; // newest first; at most 50
  leaderboards: {
    weekStart: IsoTime; // Monday 4:00, Tokyo time
    mostGratitude: LeaderboardRow[]; // the giver's part plus Original Artist Gratitude Shares received this week
    bestCombo: LeaderboardRow[]; // the most hits in one combo this week
    longestStreak: LeaderboardRow[]; // current streaks
  };
}

interface LeaderboardRow {
  person: Person;
  value: number;
}
```

### Images

Not routes: the URLs come in `Sticker.images`. Each sticker's five files are on the CDN, named by its content hash: `{contentHash}.png`, `.mask.png`, `.spec.png`, `.rim.png` and `.flat.png`. `StickerFigure`, `PlacedSticker` and `LiveResin` read them.
