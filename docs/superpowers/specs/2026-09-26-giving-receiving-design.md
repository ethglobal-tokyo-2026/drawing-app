# Giving and Receiving: design

2026-09-26, against `main` at d56d561. The rest of the gift experience: the receiver's side, the giver's side after sending, the entry to the gratitude Mini-game, and foil on stickers someone else drew. Built from the design drafts on a data layer shaped like the planned REST API.

**Sources.** `DESIGN` = the design drafts' `drawing-app/` directory (`ethglobal-tokyo-2026-design-drafts`, checked out beside this repo); `P` = `DESIGN/prototype`.

- `DESIGN/DESIGN.md`: "Gift bag", "Stickers", "Artist chip", "The cork back", "Hit counter", "Toast".
- `DESIGN/research/build-contract.md` LATEST DECISIONS; `gift-seal-brief.md`, `stats-flip-brief.md`, `sticker-by-artist.md`, `hits-brief.md`.
- `P/screens/accept.js`, `receipt.js`, `give.js`, `linechat.js` (the gift message), `gift.css`, `sketchbook.js` (the PendingGiftsNotificationBadge and the stat board), `piece.js`, `js/ui.js` (foil, the artist chip, hits).
- `docs/database-schema-and-rest-api.md`: the rules and routes the data layer follows.

**Precedence:** this spec > `docs/database-schema-and-rest-api.md` > build-contract LATEST DECISIONS > `DESIGN.md` > `P`'s code. Where this spec changes the REST doc, it says so under "Changes to the REST doc".

## Decisions

1. **Scope.** In: Receiving, the giving flow's remaining LINE-chat parts, the gift message, foil with the artist chip, and Send gratitude's entry to the Mini-game. Out: everything listed under "Not in this work". The stat board's User Stats have their own spec, `2026-09-26-stat-board-user-stats-design.md`.
2. **LINE chats only.** No gifts by handle: no handle search, no Recent row, no "For @name" tag, no Give on someone else's board.
3. **Receiving happens at Accept.** The receiver sees the sticker first: the preview returns it for a 1:1 open of a gift that can still be received, so unpackaging reveals it before Accept.
4. **A data layer shaped like the REST routes** (`src/api/`), with a device client for the deployed app until the server exists and a mock for the dev server and tests.
5. **Fixtures run only on the dev server and in tests.** The build drops them.
6. **A sent gift leaves the board and waits in the PendingGiftsNotificationBadge.** Its GivenStickerSilhouette appears once it's received, naming the receiver. Until the server exists nobody can receive, so on the deployed app sent gifts stay on their way.
7. **A gift link on the deployed app says gifts can't be opened yet**, until the server exists.
8. **Send gratitude opens a placeholder** until the Mini-game (`design/gratitude-mini-game`) merges: the data the Mini-game will get, shown as it is.
9. **The terms line links placeholder pages** until the real Terms of Use and Privacy Policy are written.

## Not in this work

- Explore, other people's Sticker Boards and their stat boards.
- Gifts by handle; the handle prompt ("Whose sticker board is this?").
- The Mini-game itself, recording a combo (`POST /api/gratitude`) and the replay: `docs/gratitude-mini-game-design-doc.md`. The pink tag: DESIGN.md.
- The stat board's User Stats: `2026-09-26-stat-board-user-stats-design.md`.
- Taking back a sent gift, and what the giver sees when a gift returns after 7 days: the REST doc marks both "not designed".
- The Official account's pushes ("Bob received your sticker ♡" in LINE): server work.
- The Transfer Trail on the sticker detail.
- LINE's own screens (consent, the friend picker, notifications): LINE draws them.

## The data layer

`src/api/`, used by every screen in this work.

| File             | What it holds                                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contract.ts`    | The REST doc's shapes, as it writes them (`Person`, `Sticker`, `StickerPlacement`, `BoardSticker`, `Gift`, `UserStats`, `ErrorBody`, `ReceiveRefusal`), and each route's request and response. Temporary: Hono's client infers them once the routes exist, and the file goes |
| `apiClient.ts`   | The `ApiClient` interface, `ApiError`, `ApiProvider` and `useApi()`                                                                                                                                                                                                          |
| `useApiQuery.ts` | One screen's load: `loading`, `failed` (an `ApiError`, with `retry`) or `ready`                                                                                                                                                                                              |
| `deviceApi.ts`   | The deployed app's client until the server exists: today's device storage behind the interface                                                                                                                                                                               |
| `mock/`          | The dev server's and the tests' client: `deviceApi` plus fixtures, one file per feature                                                                                                                                                                                      |

**The routes this work calls** (the REST doc's "REST API" section; two change, under "Changes to the REST doc"):

| `ApiClient` method     | Route                                                        | Called from                                                           |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `stickerBoard`         | `GET /api/sticker-boards/me`                                 | `StickerBoard`, `StickerTray`, `StickerDetail`                        |
| `saveStickerPlacement` | `PATCH /api/sticker-boards/me/sticker-placements/:stickerId` | the board's gestures, Remove, the tray                                |
| `markTraySeen`         | `POST /api/sticker-boards/me/sticker-tray/seen`              | `StickerTray`                                                         |
| `stickerDetail`        | `GET /api/stickers/:stickerId`                               | `StickerDetail`: whether you've sent gratitude for a received sticker |
| `pendingGifts`         | `GET /api/gifts/pending`                                     | PendingGiftsNotificationBadge                                         |
| `previewGift`          | `POST /api/gifts/preview`                                    | ReceiveGiftDialog                                                     |
| `receiveGift`          | `POST /api/gifts/receive`                                    | ReceiveGiftDialog's Accept                                            |

**Errors.** Every method rejects with an `ApiError`: the HTTP status and the REST doc's `ErrorBody` (`error`, the stable snake_case code screens switch on, and `detail`). Screens say what failed where the action was, with Try again, and log it. A request that never gets an answer is status 0, `network`. `deviceApi`'s preview and receive reject with 501 `needs_server`.

**The three clients over time:**

- **`deviceApi`** (the build, until the server exists): IndexedDB stickers, localStorage gifts and NEW marks, through the code that reads them today. A sticker's detail is its own record, with an empty Transfer Trail.
- **`mockApi`** (the dev server, and every UI test): `deviceApi` plus fixtures. Loaded by a dynamic import under `import.meta.env.DEV`, so the build drops it; `VITE_API_MOCK=off` uses `deviceApi` on the dev server, as `VITE_LIFF_MOCK=off` does for LINE.
- **The Hono client**, once the routes exist, replaces `deviceApi`; device storage goes with it.

**View models.** Components don't take contract types. One mapping per feature turns them into what the component draws, so the Hono client changes only the mapping's input:

- ISO times become milliseconds, as the app keeps them.
- `number` is the app's `no`; a placement's `onBoard`, `scale` and `rotation` are the app's `on`, `s` and `r`.
- `Sticker.images` becomes `StickerUrls`. `deviceApi` gives a sticker sealed before masks existed empty `mask`, `spec` and `rim` URLs, and the mapping reads an empty URL as none, so the figure shows the image alone, as today.

## Opening a gift link

- **In LINE:** the gift message's link, `https://liff.line.me/{liffId}/g/{token}`, opens the endpoint with `?liff.state=%2Fg%2F{token}`. `liff.init()` then reloads the page at `/g/{token}` with `location.replace` and never resolves on the first load; the second load's `liff.init()` resolves there (`@liff/init` 2.31.0, `HandleLiffState`). The box already serves `index.html` for any path (`deploy/serve.py`).
- **The start path:** `app/openedView.ts`'s `viewFromPath` maps `/draw` and `/explore` today; it gains `/g/{token}`: the board, with ReceiveGiftDialog open over it and the token held in memory. The address resets to `/`, as it does for the others, so a reload with the dialog open lands on the board, and the gift message opens it again.
- **Back:** the dialog is an overlay on the critique cleanup's Back stack (B4), which marks its entries in `history.state` and never changes the path. LINE's Back and Android's close it, as the Not now link does. No second history mechanism.
- **The context:** the preview and the receive send `liff.getContext()?.type`: `utou`, `room`, `group`, `square_chat`, `external` or `none` (`@liff/store` 2.31.0). The server refuses `group`, `room` and `square_chat`. A null context is sent as `none`.
- **The dev server:** LIFF Mock ignores `liff.state`, and Vite serves `index.html` for any path, so fixtures open directly at `http://localhost:5173/g/{fixture token}`. LIFF Mock reports a `group` context by default; `initMock` in `line/liff.ts` sets `utou`, so a fixture opens as a 1:1 chat unless it names another context.

## Foil and the artist chip

A sticker drawn by someone other than the board's owner wears holo foil and names its Original Artist. On your own board and in your tray the owner is you, so only received stickers get either. Nothing that isn't a board gets foil (DESIGN.md "The Other Hand Rule"). The numbers are `P/css/components.css:271-350` unless noted.

**The foil band (`stickers/StickerFoil.tsx`),** the first child of `StickerFigure` when `foil` is set:

- **Width:** 5px on the board, 6px on the detail's big sticker, 3px on the tray's sheets.
- **Shape:** the silhouette dilated. The box is inset by −width and masked by nine copies of the sticker's mask at 100% − 2 × width: the center, four offsets of ±width and four diagonals of ±0.71 × width. It sits under the image.
- **Bands:** `repeating-linear-gradient(115deg, #FF6FAE 0, #FFA85E 16px, #FFD84A 32px, #5ED3D8 48px, #6FA8FF 64px, #A98BFF 80px, #FF6FAE 96px)` on a sheen inset −160px, the foil tokens in `tokens.css`.
- **Motion:** the sheen moves one period, `translate3d(87px, 40.6px, 0)`, in 7s linear, delayed −2.3s × the sticker's No. A glint (a 45%-wide white strip, 0 → .92 → 0, skewed −18°) rests out of sight and sweeps to `translateX(460%)` in 2s `cubic-bezier(.45,.05,.25,1)` only when the phone tilts past the light's sweep threshold (`stickers/light.ts`); never while the phone is held still.
- **Silhouettes, peels and curls:** a curled corner clips it with `--clip-in`; a UsedStickerSilhouette in the tray or a peeling slot hides it.
- **Reduced motion:** still bands, no glint.
- `aria-hidden`.

**The artist chip (`stickers/ArtistChip.tsx`):**

- **The `artist` variant:** a 40px Liner Lift pill (padding 0 14px 0 4px, gap 7px, an inset 1px strong rule and `1px 3px 8px rgba(28,24,36,.18)`). The picture is 26px with a 2px white edge, inside a 32px conic ring of the six foil colors that turns every 5s. Beside it: "ARTIST" in fine print (11px, 700, width 87.5, +0.09em, Graphite), then "@alice" at 760 14px, capped at 15ch.
- **The `by` variant,** for tight rows: "By @alice" on one line. The copy is "artist" or "By", never "from".
- `role="note"`, `aria-label="Artist: @alice"`, the picture's alt empty.
- **Reduced motion:** the ring holds still.

**Where the chip shows:**

1. **When the board opens,** once per opening: each foil sticker's chip at its top-left corner (left `clamp(x − w/2 − 10, 8, W − 200)`, top `clamp(y − h/2 − 20, 74, H − 150)`, dropping 46px when it would overlap another). The chips play `by-flash` top to bottom: 3.2s ease-out, delayed 300ms + 80ms × i, fully in by 9%, held to 72%, then fading as they rise 3px. Each goes on `animationend`; selecting any sticker clears them. They live in one `aria-hidden` layer at z-index 900, a sibling of the stage that ignores the pointer. Reduced motion: no stagger, opaque to 85%, then a fade. A received sticker's landing plays this for it alone.
2. **The selected sticker's toolbar:** the chip, bare (no pill), as a full-width top row above Give, View and Remove, coming in over 220ms from `translateY(6px) scale(.92)`, until you deselect.
3. **The detail:** the chip leads the fine print, then "4m 28s · 2026.09.09", in a wrapping row with a 10px gap. Your own stickers keep "By @you" fine print and no chip.

**The sticker's label** adds ", by @alice" for a sticker someone else drew.

**The data:** `BoardSticker.sticker.artist` is the Original Artist and `stickerBoard`'s `owner` is the board's, so foil is `sticker.artist.id !== owner.id`. `deviceApi`'s stickers are all yours.

## Giving

The give sheet, the bag and "Sealed and sent" exist (`giving/Giving.tsx`). This work adds the rest of the LINE-chat flow and what the giver sees after sending. The give flow's packing and picker steps stay as they are; moving them onto `POST /api/gifts`, the deposit and `shared` is the REST API plan's work.

### "Can't find them?"

A quiet link under "Send in a LINE chat" (Phosphor's question icon) opens a sheet in its place, with a back button to the give sheet (`P/screens/give.js:589, 614-631`):

- **The note:** "LINE's list shows friends only. It leaves out anyone who turned off sharing with apps, and friends you added in the last few minutes."
- **"Show all my chats"**, "Recent chats appear here too. Keep it to your chat with them: a gift opened in a group can't be received." It packs the sticker into the bag like "Send in a LINE chat", then opens LINE's full picker: friends, groups and recent chats (`isMultiple: true`). The bag's "Send in LINE" reopens the picker the giver chose. `line/friendPicker.ts` stays the one picker call and gains that option.
- **"Not friends in LINE yet?"**, "Add them in LINE first and say hi. Then come back and pick them." (arrow-square-out). It opens LINE's Add friends screen, `https://line.me/R/nv/addFriends`, through `liff.openWindow({ external: true })`, and the sheet stays open for when they come back. LINE supports the link on phones only; its behavior inside LINE needs a check on a phone.

The drafts said "card"; the copy says "gift" for the Gift Message.

### PendingGiftsNotificationBadge

Your gifts on their way, at the board's top right, in the header row opposite your name (`P/screens/sketchbook.js:1085-1112`, `sketchbook.css:180-211`):

- **The look:** a 178 × 62 clear-film badge (padding 10/12/6/10, gap 10): `rgba(214,236,255,.34)` with a 112° white streak, 10px corners and a 10% Ink edge. The drafts' zipper teeth are left off: DESIGN.md keeps the zipper to the sticker tray alone.
- **Sleeves:** up to two frosted 32 × 40 sleeves, 4px corners, each with a 2px Soda Aqua strip, the front one turned −4° and the back one 5°. A sleeve is the sticker's own PNG blurred behind the frost, so each gift keeps its colors without storing any.
- **Text:** "On its way" in fine print (11px, width 75), then "No.0147" (750, 14.5px, Ink). With more than one: "On their way", then "No.0147 and 2 more". LINE never says who was picked, so no name.
- **Which gifts:** `pendingGifts` with status `sent`, newest first. A `packed` gift is the bag's, in Giving.
- **Tap:** opens the newest one's sticker detail. aria-label: "Gifts on their way: No.0147", or "3 gifts on their way".
- **Press:** the shared press, as a tile. It joins the name as a box the rotate knob and the toolbar keep clear of.
- **None on their way:** nothing shows.

### The board, the tray and the detail

| The gift is | On the board                                                    | In the tray    | In the detail                                                                                                      |
| ----------- | --------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packed`    | where it was                                                    | where it was   | Give, as today                                                                                                     |
| `sent`      | gone; the badge has it                                          | gone           | among your stickers; a Liner Lift note with its sleeve, "On its way", replaces Give (`P/screens/piece.js:196-199`) |
| received    | a GivenStickerSilhouette: "No.0147 → @bob", with the 12px arrow | its spot empty | among the stickers you gave, read-only: "You gave it to @bob · 9.23"                                               |

- **The silhouette's label:** "No.0147, given to @bob on 9.23. Open it". Its date is `givenTo.receivedAt`.
- **`deviceApi`** can't learn of a receive, so on the deployed app a sent gift stays in the badge.
- **"Sealed and sent"** reads "It's in your LINE chat now, and the gift message opens once. When they receive it, you'll see who did." (the drafts', with "gift message" for "card" and "receive" for "accept"). It replaces the cleanup's interim line, which no longer holds once the sticker waits in the badge.

### "@bob received your sticker ♡"

The giver's moment when a gift has been received (`P/screens/receipt.js`), over the whole phone without the tabs:

- **Copy:** "@bob received your sticker ♡", then "It's on @bob's sticker board now." Handles rather than first names, which LINE names don't reliably have.
- **The prop:** the sticker's GivenStickerSilhouette, captioned "→ @bob · 9.23", with @bob's LINE picture stuck on beside it as a 150px photo sticker.
- **The way out:** "Back to my sticker board", in label stock with the sticker-board icon. Nothing to press but that: no take-back.
- **Motion:** on first view the sticker arcs into the picture (820ms, `--ease-out`) and the picture sticks on. Reduced motion shows it still.
- **When:** the board opens it once for the newest received gift you haven't seen it for, remembered on this device as the lifted corner is. The others go into that record too, since their silhouettes already say where they went.

## Receiving: ReceiveGiftDialog

Over the whole phone without the tabs, as Giving is. LINE's header reads "A gift from @alice". Numbers are from `P/screens/accept.js` (a) and `gift.css` (g) unless noted.

### The steps

1. **Opening:** `previewGift` with the Gift Claim Token and the LIFF context type. While it's out, the Liner shows the bag's outline, still, with no copy. A preview that says the gift can be received brings the sticker, whose images load behind the frost.
2. **The sealed bag** (a:75-84):
   - At the top, the giver's 46px photo sticker and "Alice Sato sent you a sticker" (their LINE name; their handle when LINE's is gone).
   - The bag, larger than Giving's (the drafts' 250 × 278 sleeve on a 330px stage, a 14px tape, a 52 × 32 lobe and an 8px neck), sits 92px low, the sticker blurred inside. Its tag reads "From @alice"; its tape prints "→ SEALED 9.23" five times; its tab prints PULL.
   - Under it: "**Pull the tab to open it**", then "or double-tap, or press and hold".
   - A 44px hand loops the hint (below).
3. **The pull:** the tear tape pulls out behind the tab, the film splits along its line, and the pulled-out tape hangs from the tab in a growing loop (below).
4. **The reveal:** the tab snaps free, the bag drops and the sticker rises out of it, in `StickerFigure` with its resin sweep and, since someone else drew it, its foil. The sheet slides up:
   - "This sticker is for you, Bob Tanaka." (the opener's LINE name).
   - Fine print: "No.0147 · 4m 52s · 2026.09.23 · by @ken", naming the Original Artist.
   - **Accept**: the dialog's one key, grape, large, with Phosphor's hand-heart (build-contract item 52).
   - **Not now**: a quiet link with an X. It closes the dialog and sends nothing; the gift stays open for later, and the sheet's perforation does the same.
   - The terms line: "Receiving it shows @alice your LINE name and picture. You agree to the Terms and Privacy Policy." The drafts' "starts your own sticker board" is left off, since it's only true the first time.
5. **Receiving:** Accept calls `receiveGift`. Until it answers, the key is busy and the sticker's shadow lifts (g:294). Then the copy fades over 200ms, the sheet drops, and the bag falls 420px (g:673, 682, 718).
6. **On the board:** the dialog closes, the board loads again, and the sticker lands, in foil, with its artist chip shown for it alone (3.2s). LINE's header reads "Your sticker board".

A failed Accept keeps the sheet up, with a line above the key saying what failed and "Tap Accept to try again" (as Giving does). An Accept the server refuses (someone else got there first, or it was taken back meanwhile) moves to that refusal's screen.

### The pull tab

- **Drag:** pointer capture, horizontal only; the stage has `touch-action: none`. The pull follows `start + dx ÷ 250px × 0.82` through a spring (stiffness 340, damping 32) (a:230, 274-275, 312).
- **Feel:** a tick every 6.25px of pull (40 in all), each a 0.7px, 80ms shiver, only while dragging. Held, the lobe lifts to 1.06; the pull tips it from −6° to level over its first quarter (a:248-249; g:554, 581-590).
- **Letting go:** under 86% it springs back to 0. At 86%, mid-drag or on release, it snaps: the tab flies off (+330px, −120px, −40°, 440ms ease-out, fading over 340ms after 90ms), the film fades over 200ms after 140ms, and the mouth opens (a:229, 267, 279, 319; g:592-593).
- **The tape and the loop:** the tape leaves with the tab while its print holds still, so it shortens. The loop fades in from 16% and grows from 6% to full by about 83% (g:468, 489, 574-576).
- **The split:** a zigzag gap shows the bag's pale inside, tinted by the sticker blurred behind it (g:416-455).
- **The reveal's timing:** 380ms after the snap the stage glides up (520ms, `--ease-peel`) and the sheet rises (440ms); 340ms later the bag drops 178px (640ms ease-out) and the sticker rises 52px (720ms ease-out); 460ms after that, a 560ms gloss sweep (a:211, 216, 268; g:313, 669-672, 688, 716).
- **The hint:** a 2.8s loop while the pull is at 0: the finger presses at 22%, drags 40px by 56%, lifts by 72%, and the pull reaches 16%. The first grab ends it (a:286, 304, 347; g:695-704).
- **Without dragging:** press and hold the bag for 520ms (cancelled past 10px of movement; the frost thins to .88), or double-tap within 340ms, and the pull plays by itself over 720ms, then snaps (a:292-295, 327-337).
- **Keyboard and screen readers:** the tab is a focusable slider, "Pull the tab to open the gift", 0–100 as the pull. Arrow keys move it 20% (the fifth press snaps); Enter, Space and End finish the pull (a:343-345). The bag's picture stays `aria-hidden`, so the slider isn't inside an image.
- **Reduced motion:** no spring, ticks, loop or hint; the pull still follows the finger; the snap and the reveal are a 150ms fade (DESIGN.md "Gift bag").

`GiftBag` stays the one bag: it gains the receive size, the pull's progress (0–1) as a custom property, the split and the loop, the slider tab, the hint finger, and the rubber stamps below. The physics are a pure module, `receiving/pullTab.ts`.

### Refusals

One layout for each: a title, one line, the bag as a prop, and one label-stock button. "Back to LINE" (arrow-square-out) closes the LIFF window; outside LINE's app it's "Go to my sticker board". Titles and lines marked PROPOSED aren't in the drafts.

| When                                                  | Title                                        | Line                                                                                                  | The bag                                           | Button                                   |
| ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| a group, multi-person chat or OpenChat (`group_chat`) | "Open this in your chat with Alice Sato"     | "Gifts open only in the private chat they were sent to. If Alice Sato sent it to you, open it there." | sealed, stamped "OPENS ONLY IN / 1:1 CHAT" in ink | Back to LINE                             |
| received already (`already_received`)                 | "Already opened"                             | PROPOSED: "Each gift message opens once. If it was you, the sticker's on your sticker board."         | open and empty, stamped "OPENED" in grape         | Go to my sticker board                   |
| your own gift (`own_gift`)                            | PROPOSED: "This gift is on its way"          | PROPOSED: "Only the friend you sent it to can open it."                                               | sealed                                            | Go to my sticker board                   |
| taken back (`taken_back`)                             | PROPOSED: "Alice Sato took this one back"    | PROPOSED: "It went back to their sticker board before anyone received it."                            | open and empty, stamped "TAKEN BACK"              | Back to LINE                             |
| 7 days passed (`gift_returned`, `gift_expired`)       | PROPOSED: "This one went back to Alice Sato" | PROPOSED: "Gifts wait a week. This one wasn't opened in time, so it's back on their sticker board."   | open and empty, stamped "RETURNED"                | Back to LINE                             |
| the deposit hasn't landed (`not_deposited`)           | PROPOSED: "Almost here"                      | PROPOSED: "This gift is still on its way. Try again in a few seconds."                                | sealed                                            | Try again, and a Back to LINE quiet link |
| no such gift (`gift_not_found`)                       | PROPOSED: "This link doesn't open a gift"    | PROPOSED: "Open it again from the gift message in your chat."                                         | none                                              | Back to LINE                             |
| the preview failed                                    | PROPOSED: "Couldn't open the gift"           | what failed, from the error                                                                           | none                                              | Try again, and a Back to LINE quiet link |
| the deployed app, before the server (`needs_server`)  | PROPOSED: "Gifts can't be opened yet"        | PROPOSED: "Opening a gift needs the app's server, which isn't running yet."                           | none                                              | Back to LINE                             |

"Already opened" doesn't name who received it: anyone holding a forwarded link would see it. The drafts' copy said "gift card"; this copy says "gift" and "gift message".

### The mock's gift links

On the dev server, `/g/demo` opens a gift from a fixture friend that can be received, and a link for each other state opens it: `/g/demo-group`, `-opened`, `-own`, `-taken`, `-returned`, `-expired`, `-not-deposited` (the second Try again works), `-slow` (a 3s preview), `-fail` (the preview fails) and `-accept-fail` (the first Accept fails). Any other token is `gift_not_found`. A received demo gift lands on your board with your own stickers, for this page load.

## The gift message

`giving/giftMessage.ts`, from the drafts' gift message (`P/screens/linechat.js:80-95`), keeping what AGENTS.MD's Gift Message names (a frosted sleeve, never the sticker; "From @alice"; "Open your gift"):

| Part     | Today                            | This work                                                                                                                                                                                                                                                                                                               |
| -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| altText  | "@alice sent you a drawing"      | "@alice sent you a sticker": the chat list and LINE's notification show it                                                                                                                                                                                                                                              |
| Hero     | the configured image, or none    | one static image of the sealed bag, with no tag, colors or number, since those would be per gift or hint at the sticker. It's rendered from `GiftBag` once and shipped as a hashed file; its URL is the app's origin plus that file, so there's nothing to configure. LINE needs HTTPS, so the dev server sends no hero |
| Top line | none                             | "NO.0147 · ONE OF ONE", Graphite, xs                                                                                                                                                                                                                                                                                    |
| Title    | "From @alice"                    | the same                                                                                                                                                                                                                                                                                                                |
| Sub      | "A one-of-one drawing · 4:52"    | "A one-of-one sticker, drawn in 4m 52s. It opens once."                                                                                                                                                                                                                                                                 |
| Button   | "Open your gift", secondary aqua | the same                                                                                                                                                                                                                                                                                                                |

`VITE_GIFT_MESSAGE_HERO_URL` and `giving/config.ts` go.

## Send gratitude: the Mini-game's entry

Two ways in, both for a sticker you received and haven't sent gratitude for:

- **The sheet after landing** (the drafts' `receive-landed`): once a received sticker has stuck to the board, a sheet rises with the giver's 60px photo sticker, "Send @alice gratitude?", and "It's on your board. @alice drew it in 4m 52s, and gratitude never expires." When someone else drew it: "It's on your board, from @alice. Gratitude never expires." Then **Send gratitude**, the sheet's one key (pink, Phosphor's heart, fill), and **Later**, a quiet link with Phosphor's clock. It shows once, for the gift just received.
- **The sticker's detail:** a received sticker you haven't sent gratitude for has Send gratitude as its key, with Give as label stock under it (`P/screens/piece.js` `owes`). You haven't when the Transfer Trail's newest entry to you, from `stickerDetail`, has no gratitude.

Both open the Mini-game with the gift, the sticker and its giver, as `GratitudeMiniGame` takes them (`sticker`, `giver`, `onEnd`, `onClose`; `apps/frontend/src/gratitude/GratitudeMiniGame.tsx`), plus the gift's ID. Until `design/gratitude-mini-game` merges, `gratitude/GratitudeMiniGamePlaceholder.tsx` stands in: over the whole phone, "The gratitude Mini-game is being built", then those props as formatted JSON, and Close. Swapping in the Mini-game is one import. Recording the combo is the Mini-game's.

## The Terms and Privacy Policy placeholders

The terms line links two static pages, `apps/frontend/public/terms.html` and `privacy.html`, opened inside LINE (`liff.openWindow`, `external: false`). Each opens with a Seal Yellow label reading "Placeholder: the real Terms of Use aren't written yet" (or "the real Privacy Policy"), in the world's type on the Liner:

- **Terms:** the GNU Manifesto, verbatim from https://www.gnu.org/gnu/manifesto.en.html, with its copyright and permission notice, which allow verbatim copies.
- **Privacy Policy:** the "I'd just like to interject for a moment" GNU/Linux copypasta, labeled as an internet copypasta that's often attributed to Richard Stallman as a joke. It isn't his words, and nothing on the page says it is.

## Changes to the REST doc

Approved on 2026-09-26 and made in `docs/database-schema-and-rest-api.md`; `contract.ts` follows the doc.

1. **`POST /api/gifts/preview` returns the sticker for a 1:1 open**, so the receiver sees it before Accept (decision 3):
   - The request adds `liffContextType`, as `receive` has.
   - The response adds `sticker: Sticker | null`: the sticker when `receivable`, otherwise null. The doc's "never the sticker" goes: a forwarded link shows it only where Accept could take it anyway.
   - `ReceiveRefusal` adds `group_chat`, since the preview now knows the context.
2. **`BoardSticker` adds `givenTo: { receiver: Person; receivedAt: IsoTime } | null`**, set when `held` is false, for the GivenStickerSilhouette's "→ @bob" and the giver's notice.
3. **`POST /api/gifts/receive` sets `terms_accepted_at`** when it's unset: Accept carries the terms line.

## Testing

- **Pure modules (vitest):**
  - `receiving/pullTab.ts`: the pull follows a drag with its resistance; a release under the snap settles back; the snap at its threshold; one tick per step; the fifth arrow press snaps.
  - The dialog's flow: each preview outcome picks its screen; Accept goes busy, then received; a failed Accept shows its line and retries; a refused Accept moves to its refusal.
  - The refusal screens, one per REST doc error code. The codes are the server's contract, so the test names them.
  - The contract mappings: ISO times to milliseconds, the placement's fields, an empty image URL as none, and `held`, `openGift` and `givenTo` choosing the board, the badge or the silhouette.
  - `openedView.ts`: `/g/{token}` opens the dialog with that token.
  - `friendPicker.ts`: the any-chat option asks for LINE's full picker.
  - `giftMessage.ts`: the texts, and a hero only at an HTTPS URL.
- **UI (happy-dom), rendered from fixtures:**
  - ReceiveGiftDialog: every screen's title; the slider unpackages the sticker and brings up Accept; Accept calls `receiveGift` once and closes with the sticker's ID.
  - The Send gratitude sheet and the detail's key open the placeholder with the sticker, its giver and the gift.
  - PendingGiftsNotificationBadge: one gift and several; a tap opens the newest.
  - GivenStickerSilhouette names its receiver; "Can't find them?" opens the full picker and goes back.
- **Shared helpers**, written before the suites: fixture builders (`person()`, `sticker()`, `boardSticker()`, `gift()`) and a render that puts a component under `ApiProvider` with a mock client.
- **Looks:** 390 × 844 screenshots, plus 360 and 430 where layout changes, beside the drafts' renders in `DESIGN/.impeccable/review/screens-local/`, with every difference listed.
- **Before merging:** the frontend's lint, typecheck, tests and format check; the build; and a search of `dist/` for a fixture's name, which must find nothing.

## Build order

Streams run in parallel worktrees, each owning its files; only the coordinator (this session) edits files two streams need. The Board data stream starts once the critique cleanup's bundle split and review fixes are on `main`, since they touch `StickerBoard.tsx`; the others start now.

| Wave | Stream      | Owns                                                                                                                                                                                                                                                 |
| ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Coordinator | `src/api/` (the contract, the client, `useApiQuery`, `deviceApi`, the mock's frame, fixture builders and fixture stickers), `ApiProvider` in `main.tsx`, `VITE_API_MOCK`, `gratitude/GratitudeMiniGamePlaceholder.tsx`, the REST doc's changes       |
| 1    | Receiving   | `src/receiving/` (the dialog, the pull tab, the refusals, the Send gratitude sheet), `GiftBag`'s receive additions, `api/mock/receiving.ts`, the gift path in `app/openedView.ts`, LIFF Mock's context in `line/liff.ts`, the placeholder pages      |
| 1    | Giving      | `giving/` ("Can't find them?", PendingGiftsNotificationBadge, the giver's notice, the gift message and its hero, the sent copy), `line/friendPicker.ts`, `api/mock/giving.ts`                                                                        |
| 1    | Foil        | `stickers/StickerFoil.*`, `stickers/ArtistChip.*`, `StickerFigure`'s foil, the first-load chip layer                                                                                                                                                 |
| 1    | Board data  | `StickerBoard`'s load and saves through the client, `boardSticker.ts`'s mapping, the tray's NEW through `markTraySeen`, `GivenStickerSilhouette`'s receiver, the detail's "On its way", "You gave it to" and Send gratitude, `api/mock/board.ts`     |
| 2    | Coordinator | Mounting the badge, the notice, the chip layer, the Send gratitude sheet and a received sticker's landing; foil and the chip on the board, the toolbar, the detail and the tray's sheets; screenshots; a code review; the checks; squashing; merging |

Each wave-1 stream builds and tests its components alone, from fixtures, and reports its branch to the coordinator; nothing merges to `main` until wave 2 passes.

## Checking "Not friends in LINE yet?" on a phone

Not a blocker. After a deploy, on an iPhone (and an Android phone if one's handy):

1. Open the app from the Official account's chat, give a sticker, tap "Can't find them?", then "Not friends in LINE yet?".
2. LINE's Add friends screen should open inside LINE, not in a browser. Close it and come back: the app should still show the "Can't find them?" sheet.
3. If it opens a browser tab or does nothing, say which; the fix is the `external` flag on `liff.openWindow`.
