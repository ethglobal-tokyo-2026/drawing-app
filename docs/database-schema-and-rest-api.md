# Database schema and REST API (planned)

What the server will store and serve, so UI work can line up with it. None of it is built yet: the app still keeps stickers, tickets and gifts on the device. Delete this file once `packages/db` holds the schema and the API routes exist, and point AGENTS.MD at those instead.

## How it fits together

- **Server:** Hono, with SQLite through Drizzle (`packages/db`).
- **Types:** request and response types derive from the tables through drizzle-zod. The app calls routes through Hono's typed client, so UI code gets its types from the server.
- **Sign-in:** every screen needs LINE Login; there are no public pages. The server verifies LIFF's ID token and sets a session cookie.
- **Chain:** World Chain Sepolia is the owner of record for each sticker (`StickerNFT`) and each gift in transit (`StickerGiftEscrow`). The server keeps a small index of chain state, so screens don't wait for the chain except where noted below.
- **Images:** five files per sticker on our CDN, named by the sticker PNG's content hash. The NFT's metadata is a JSON file on the same CDN. No IPFS.

## Rules that shape the UI

### Tickets

- Three free tickets per ticket day. A ticket day turns over at 4:00 in the person's time zone, taken from the device at sign-up.
- **Start screen:** drawing starts from a screen that shows the tickets left and a button that spends one. The button starts the 3-minute clock. Today's app spends the ticket and starts the clock at the first stroke.
- **Paid tickets:** packs of 1, 3, 5 or 10 for ¥100, ¥270, ¥350 or ¥500, paid in SUI. The payment is a mock for now. There's no daily limit, and paid tickets don't expire.
- **Follow-up:** the UI for holding many paid tickets (the ticket stubs, the out-of-tickets card) needs design.

### Sealing

- Sealing waits for the mint. Until Privy smart wallets are set up, the mint step is a stub: a dev toast, and a comment where the minting logic goes.
- A sticker's number (No.0147) is separate from its NFT token ID. The sticker detail links to the token on WorldScan, World Chain's explorer.

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

## Tables

Every table also has `created_at` and `updated_at`, which the database keeps current.

| Table                | One row per                              | Columns screens use                                                                                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`              | person                                   | `handle`, `line_display_name`, `line_picture_url`, `time_zone`, `created_at` (the stat board's "Since"), `deleted_at`                                                                                                                                                                               |
| `stickers`           | sealed sticker                           | `number`, `artist_id` (the Original Artist), `owner_id` (who holds it now), `time_used` (seconds on the clock), `width`, `height`, `outline` (the cut line as an SVG path), `content_hash` (names its image files), `token_id` and `mint_tx_hash` (for the WorldScan link), `created_at` (the seal) |
| `sticker_timelapses` | sticker                                  | `ops`: how it was drawn, gzipped, for the timelapse                                                                                                                                                                                                                                                 |
| `ticket_uses`        | spent ticket                             | `ticket_day`, `day_index` (the day's free tickets come first), `sticker_id` (null until seal, and for good if the drawing was abandoned), `created_at` (when it was spent)                                                                                                                          |
| `ticket_purchases`   | ticket purchase                          | `tickets`, `price_yen`, `paid_mist`, `tx_digest` (the Sui transaction), `verified_at`                                                                                                                                                                                                               |
| `sticker_placements` | person and sticker that has reached them | `on_board`, `x`, `y`, `scale`, `rotation`, `z` (null until their board first places it), `seen_at` (null shows NEW), `created_at` (the tray's order)                                                                                                                                                |
| `gifts`              | Giving                                   | `status`, `escrow_status`, `expires_at`, `sent_at`, `taken_out_at`, `receiver_id`, `received_at`, `returned_at`                                                                                                                                                                                     |
| `gratitude`          | received gift                            | `method`, `hits`, `total`, `peak_mult`, `peak_tier`, `original_artist_gratitude_share`, `replay`, `seen_by_giver_at`                                                                                                                                                                                |

- **Gift `status`:** `packed` (in the bag), then `sent` (the picker reported it sent), then `received`. Or `taken_out` (taken back before anyone received it), or `returned` (its 7 days ran out).
- **Gift `escrow_status`** mirrors the escrow contract: `missing`, then `pending` once the deposit lands, then `claimed`, `rejected` or `expired_returned`.

## REST routes

Planned; names and shapes may change as they're built. The Gift Claim Token only travels in request bodies, never in URL paths. "Not built" marks screens that don't exist yet.

| Route                                                        | Does                                                                                                                            | Called from                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/session`                                          | Verifies LINE's ID token, finds or creates the person, sets the session cookie; says when a handle is needed                    | `LineGate`                                                                |
| `GET /api/me`                                                | You, and the counts behind NEW and the pink tag                                                                                 | App start                                                                 |
| `POST /api/me/handle`                                        | Sets your handle                                                                                                                | The handle prompt (not built)                                             |
| `DELETE /api/me`                                             | Account deletion                                                                                                                | Not designed                                                              |
| `GET /api/tickets`                                           | Today's used tickets with their stickers' outlines, free and paid tickets left, the next refill                                 | The start screen (not built), `SealedCard`, `TicketStubs`, `OutOfTickets` |
| `POST /api/tickets/spend`                                    | Spends a ticket, or refuses when none are left                                                                                  | The start screen's button (not built)                                     |
| `POST /api/ticket-purchases`                                 | A pack and its Sui payment                                                                                                      | `OutOfTickets`                                                            |
| `POST /api/stickers`                                         | Seals: the five images, the outline, size, time used, the ticket and the timelapse. Returns once the mint lands                 | `DrawingScreen`'s seal step                                               |
| `GET /api/stickers/:stickerId`                               | The sticker detail: the Original Artist, who holds it, the Transfer Trail with each gratitude, the token for the WorldScan link | `StickerDetail`                                                           |
| `GET /api/stickers/:stickerId/timelapse`                     | The timelapse's ops                                                                                                             | The timelapse (not built)                                                 |
| `GET /api/sticker-boards/:userId`                            | A Sticker Board: placements and given sticker silhouettes; on your own board, also the tray's order and NEW                     | `StickerBoard`, `StickerTray`                                             |
| `PATCH /api/sticker-boards/me/sticker-placements/:stickerId` | Saves a sticker placement                                                                                                       | The board's gestures on release, `StickerToolbar`'s Remove, `StickerTray` |
| `POST /api/sticker-boards/me/sticker-tray/seen`              | Marks seen the stickers whose sheet was open when the tray zipped shut                                                          | `StickerTray`                                                             |
| `GET /api/sticker-boards/:userId/user-stats`                 | User Stats                                                                                                                      | `StatBoard`                                                               |
| `POST /api/gifts`                                            | Packaging: returns the Gift Claim Token once, the escrow transfer and the Gift Message, or the gift already in the bag          | `Giving`                                                                  |
| `POST /api/gifts/:giftId/deposit`                            | Reports the escrow transfer; the server checks the escrow                                                                       | `Giving`                                                                  |
| `POST /api/gifts/:giftId/shared`                             | The picker's result: sent or cancelled                                                                                          | `Giving`                                                                  |
| `POST /api/gifts/:giftId/take-out`                           | Takes the gift back, until it's received                                                                                        | `GiftBag`, `Giving`; taking back a sent gift (not designed)               |
| `GET /api/gifts/pending`                                     | Your gifts not yet received                                                                                                     | PendingGiftsNotificationBadge (not built)                                 |
| `POST /api/gifts/preview`                                    | From the Gift Claim Token: the giver's name and picture, and whether it can be received. Never the sticker                      | ReceiveGiftDialog (not built)                                             |
| `POST /api/gifts/receive`                                    | From the Gift Claim Token and LIFF's context type: the sticker for the reveal, or why not                                       | ReceiveGiftDialog's pull tab (not built)                                  |
| `POST /api/gratitude`                                        | One combo and its replay, sent with `keepalive`. The same idempotency key again returns the stored record                       | The Mini-game (not built)                                                 |
| `GET /api/gratitude/unseen`                                  | Gratitude to you that you haven't watched                                                                                       | The pink tag (not built)                                                  |
| `GET /api/gratitude/:giftId`                                 | One combo with its replay                                                                                                       | The pink tag, the Transfer Trail (not built)                              |
| `POST /api/gratitude/:giftId/seen`                           | Marks it watched                                                                                                                | The replay (not built)                                                    |
| `GET /api/explore`                                           | Today's stickers, the activity feed, the weekly leaderboards                                                                    | `ExploreScreen`                                                           |
| `GET /api/users?handle=`                                     | Search by handle                                                                                                                | Explore search (not built)                                                |

Images aren't routes: `{hash}.png`, `{hash}.mask.png`, `{hash}.spec.png`, `{hash}.rim.png` and `{hash}.flat.png` come from the CDN, and `StickerFigure`, `PlacedSticker` and `LiveResin` read them.
