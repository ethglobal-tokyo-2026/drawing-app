# Giving, Receiving and the stat board: design

2026-09-26, against `main` at d56d561. The rest of the gift experience (the receiver's side, the giver's side after sending), real User Stats on the stat board, and foil on stickers someone else drew, built from the design drafts on a data layer shaped like the planned REST API.

**Sources.** `DESIGN` = the design drafts' `drawing-app/` directory (`ethglobal-tokyo-2026-design-drafts`, checked out beside this repo); `P` = `DESIGN/prototype`.

- `DESIGN/DESIGN.md`: "Gift bag", "Stickers", "Artist chip", "The cork back", "Hit counter", "Toast".
- `DESIGN/research/build-contract.md` LATEST DECISIONS; `gift-seal-brief.md`, `stats-flip-brief.md`, `sticker-by-artist.md`, `hits-brief.md`.
- `P/screens/accept.js`, `receipt.js`, `give.js`, `linechat.js` (the gift message), `gift.css`, `sketchbook.js` (the pocket and the cork back), `piece.js`, `js/ui.js` (foil, the artist chip, hits).
- `docs/database-schema-and-rest-api.md`: the rules and routes the data layer follows.

**Precedence:** this spec > `docs/database-schema-and-rest-api.md` > build-contract LATEST DECISIONS > `DESIGN.md` > `P`'s code. Where this spec changes the REST doc, it says so under "Changes to the REST doc".

## Decisions

1. **Scope.** In: Receiving, the giving flow's remaining LINE-chat parts, real User Stats on the stat board, and foil with the artist chip. Out: everything listed under "Not in this work".
2. **LINE chats only.** No gifts by handle: no handle search, no Recent row, no "For @name" tag, no Give on someone else's board.
3. **Receiving happens at Accept.** The receiver sees the sticker first: the preview returns it for a 1:1 open of a gift that can still be received, so the torn bag reveals it before Accept.
4. **A data layer shaped like the REST routes** (`src/api/`), with a device client for the deployed app until the server exists and a mock for the dev server and tests.
5. **Fixtures run only on the dev server and in tests.** The build drops them.
6. **A sent gift leaves the board and waits in the PendingGiftsNotificationBadge.** Its GivenStickerSilhouette appears once it's received, naming the receiver. Until the server exists nobody can receive, so on the deployed app sent gifts stay on their way.
7. **The streak follows the server's rule:** a missed day resets it to 0.
8. **A gift link on the deployed app says gifts can't be opened yet**, until the server exists.

## Not in this work

- Explore, other people's Sticker Boards and their stat boards.
- Gifts by handle; the handle prompt ("Whose sticker board is this?").
- The Send gratitude sheet after Accept, the replay and the pink tag: parts 2 and 3 of `2026-09-26-gratitude-mini-game-design.md`.
- Taking back a sent gift, and what the giver sees when a gift returns after 7 days: the REST doc marks both "not designed".
- The Official account's pushes ("Bob accepted your sticker ♡" in LINE): server work.
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

| `ApiClient` method     | Route                                                        | Called from                                    |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `stickerBoard`         | `GET /api/sticker-boards/me`                                 | `StickerBoard`, `StickerTray`, `StickerDetail` |
| `saveStickerPlacement` | `PATCH /api/sticker-boards/me/sticker-placements/:stickerId` | the board's gestures, Remove, the tray         |
| `markTraySeen`         | `POST /api/sticker-boards/me/sticker-tray/seen`              | `StickerTray`                                  |
| `userStats`            | `GET /api/sticker-boards/me/user-stats`                      | `StatBoard`                                    |
| `pendingGifts`         | `GET /api/gifts/pending`                                     | PendingGiftsNotificationBadge                  |
| `previewGift`          | `POST /api/gifts/preview`                                    | ReceiveGiftDialog                              |
| `receiveGift`          | `POST /api/gifts/receive`                                    | ReceiveGiftDialog's Accept                     |

**Errors.** Every method rejects with an `ApiError`: the HTTP status and the REST doc's `ErrorBody` (`error`, the stable snake_case code screens switch on, and `detail`). Screens say what failed where the action was, with Try again, and log it. A request that never gets an answer is status 0, `network`. `deviceApi`'s preview and receive reject with 501 `needs_server`.

**The three clients over time:**

- **`deviceApi`** (the build, until the server exists): IndexedDB stickers, localStorage gifts and NEW marks, through the code that reads them today. Its User Stats are what this device knows (under "The stat board"); anything that needs a receive is 0.
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

## The stat board

`StatBoard` draws User Stats from `userStats`, in place of today's `stickers` and `gifts` props. The papers, the turn and the layout stay as they are.

**Props:**

```ts
interface Props {
  /** Whose board: the name card. From `stickerBoard`'s `owner`. */
  person: PersonView;
  /** The REST doc's `UserStats`, mapped; null while loading; the error when the load failed. */
  stats: UserStatsView | ApiError | null;
  onRetry: () => void;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  ref?: Ref<StatBoardHandle>;
}
```

**What each paper shows:**

| Paper                      | Shows                                                                                           | From                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| The name card              | Picture, LINE name, "@alice · name and picture from LINE"                                       | `person`                                                           |
| The receipt                | "@ALICE" and today's date on top; one row per kind above 0, each with its dot and reason; TOTAL | `gratitude`                                                        |
| The calendar leaf          | The streak in days, and its rule                                                                | `streak`                                                           |
| The notebook scrap (Bests) | Longest streak, Best combo as a hit counter, Most thanks in a day; "None yet" for each at 0     | `bests.longestStreak`, `bests.bestCombo`, `bests.mostThanksInADay` |
| The stamps                 | Made, received, given                                                                           | `made`, `received`, `given`                                        |
| The label-maker tape       | "Since 2026.08.12"                                                                              | `since`                                                            |

**The receipt's rows** (reasons from `P/screens/sketchbook.js:436-438`):

| Row           | Dot   | Reason                                             | Amount                                                                                                   |
| ------------- | ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Inspired      | pink  | "Thanks for stickers you gave."                    | `inspired`: your part of tap combos on gifts you gave                                                    |
| Magic         | grape | "Thanks sent a special way."                       | `magic`: your part of stroke and shake combos                                                            |
| As the artist | aqua  | "Came to you when others passed on your stickers." | `asOriginalArtist`: Original Artist Gratitude Shares from gifts of stickers you drew, given on by others |

A row at 0 is left off. With every row at 0, the receipt reads "No gratitude yet. It arrives when someone you give a sticker to thanks you for it." over a TOTAL of 0. The Daily row is gone (the REST doc: only the Mini-game makes gratitude).

**The streak's rule**, under the server's reset (proposed copy):

- With a streak: "Miss a day and it starts over. Days turn over at 4:00 AM."
- Without one: "Not started", then "Draw a sticker today to start one."

**Other changes from today's stat board:**

- **The receipt's rows** get the drafts' styles: a 9px dot, the name at 700 14px, the reason at 12px Graphite indented 16px (`P/screens/sketchbook.css:530-535`).
- **Best combo** is a `HitCounter` (`ui/HitCounter.tsx`, new, 20px here): Figure numerals leaning 11°, HITS in small caps, three pink speed lines off the left, no × (DESIGN.md "Hit counter", `P/css/components.css:356-365`).
- **Flip back** takes Phosphor's arrow-counter-clockwise, as in the drafts.
- **No ENS tape:** there's no ENS name until ENS lands.
- **Loading:** the papers show "–" (read as "not known") until the stats arrive.
- **A failed load** stays on the receipt as a line saying what failed, with Try again as small label stock. The drafts' toast and automatic flip back would make the error vanish.

**`deviceApi`'s User Stats:** `made` is the stickers on this device; `received` and `given` are 0, since nothing can be received without the server; `streak` and `bests.longestStreak` come from seal days under the reset rule; gratitude, `bestCombo` and `mostThanksInADay` are 0; `since` is the earlier of the first visit and the oldest sticker.

## Foil and the artist chip

A sticker drawn by someone other than the board's owner wears holo foil and names its Original Artist. On your own board and in your tray the owner is you, so only received stickers get either. Nothing that isn't a board gets foil (DESIGN.md "The Other Hand Rule"). The numbers are `P/css/components.css:271-350` unless noted.

**The foil band (`stickers/StickerFoil.tsx`),** the first child of `StickerFigure` when `foil` is set:

- **Width:** 5px on the board, 6px on the detail's big sticker, 3px on the tray's sheets.
- **Shape:** the silhouette dilated. The box is inset by −width and masked by nine copies of the sticker's mask at 100% − 2 × width: the center, four offsets of ±width and four diagonals of ±0.71 × width. It sits under the image.
- **Bands:** `repeating-linear-gradient(115deg, #FF6FAE 0, #FFA85E 16px, #FFD84A 32px, #5ED3D8 48px, #6FA8FF 64px, #A98BFF 80px, #FF6FAE 96px)` on a sheen inset −160px, the foil tokens in `tokens.css`.
- **Motion:** the sheen moves one period, `translate3d(87px, 40.6px, 0)`, in 7s linear, delayed −2.3s × the sticker's No. A glint (a 45%-wide white strip, 0 → .92 → 0, skewed −18°) waits to 52% of a 4.2s `cubic-bezier(.45,.05,.25,1)` loop and sweeps to `translateX(460%)`, delayed −1.3s × the No.
- **Holes, peels and curls:** a curled corner clips it with `--clip-in`; a tray hole or a peeling slot hides it.
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
- **"Show all my chats"**, "Recent chats appear here too. Keep it to your chat with them: a gift opened in a group can't be accepted." It packs the sticker into the bag like "Send in a LINE chat", then opens LINE's full picker: friends, groups and recent chats (`isMultiple: true`). The bag's "Send in LINE" reopens the picker the giver chose. `line/friendPicker.ts` stays the one picker call and gains that option.
- **"Not friends in LINE yet?"**, "Add them in LINE first and say hi. Then come back and pick them." (arrow-square-out). It opens LINE's Add friends screen, `https://line.me/R/nv/addFriends`, through `liff.openWindow({ external: true })`, and the sheet stays open for when they come back. LINE supports the link on phones only; its behavior inside LINE needs a check on a phone.

The drafts said "card"; the copy says "gift" for the Gift Message.

### PendingGiftsNotificationBadge

Your gifts on their way, at the board's top right, in the header row opposite your name (`P/screens/sketchbook.js:1085-1112`, `sketchbook.css:180-211`):

- **The look:** a 178 × 62 clear-film pocket (padding 10/12/6/10, gap 10): `rgba(214,236,255,.34)` with a 112° white streak, 10px corners and a 10% Ink edge. The drafts' zipper teeth are left off: DESIGN.md keeps the zipper to the sticker tray alone.
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
- **"Sealed and sent"** reads "It's in your LINE chat now, and the gift message opens once. When they accept it, you'll see who did." (the drafts', with "gift message" for "card"). It replaces the cleanup's interim line, which no longer holds once the sticker waits in the badge.

### "@bob accepted your sticker ♡"

The giver's moment when a gift has been received (`P/screens/receipt.js`), over the whole phone without the tabs:

- **Copy:** "@bob accepted your sticker ♡", then "It's on @bob's sticker board now." Handles rather than first names, which LINE names don't reliably have.
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
3. **The pull:** the tape tears out behind the tab, the film splits along its line, and the torn-out tape hangs from the tab in a growing loop (below).
4. **The reveal:** the tab snaps free, the bag drops and the sticker rises out of it, in `StickerFigure` with its resin sweep and, since someone else drew it, its foil. The sheet slides up:
   - "This sticker is for you, Bob Tanaka." (the opener's LINE name).
   - Fine print: "No.0147 · 4m 52s · 2026.09.23 · by @ken", naming the Original Artist.
   - **Accept**: the dialog's one key, grape, large, with Phosphor's hand-heart (build-contract item 52).
   - **Not now**: a quiet link with an X. It closes the dialog and sends nothing; the gift stays open for later, and the sheet's perforation does the same.
   - The terms line: "Accepting shows @alice your LINE name and picture. You agree to the Terms and Privacy Policy." The drafts' "starts your own sticker board" is left off, since it's only true the first time.
5. **Accepting:** Accept calls `receiveGift`. Until it answers, the key is busy and the sticker's shadow lifts (g:294). Then the copy fades over 200ms, the sheet drops, and the bag falls 420px (g:673, 682, 718).
6. **On the board:** the dialog closes, the board loads again, and the sticker lands, in foil, with its artist chip shown for it alone (3.2s). LINE's header reads "Your sticker board".

A failed Accept keeps the sheet up, with a line above the key saying what failed and "Tap Accept to try again" (as Giving does). An Accept the server refuses (someone else got there first, or it was taken back meanwhile) moves to that refusal's screen.

### The pull tab

- **Drag:** pointer capture, horizontal only; the stage has `touch-action: none`. The tear follows `start + dx ÷ 250px × 0.82` through a spring (stiffness 340, damping 32) (a:230, 274-275, 312).
- **Feel:** a tick every 6.25px of tear (40 in all), each a 0.7px, 80ms shiver, only while dragging. Held, the lobe lifts to 1.06; the tear tips it from −6° to level over its first quarter (a:248-249; g:554, 581-590).
- **Letting go:** under 86% it springs back to 0. At 86%, mid-drag or on release, it snaps: the tab flies off (+330px, −120px, −40°, 440ms ease-out, fading over 340ms after 90ms), the film fades over 200ms after 140ms, and the mouth opens (a:229, 267, 279, 319; g:592-593).
- **The tape and the loop:** the tape leaves with the tab while its print holds still, so it shortens. The loop fades in from 16% and grows from 6% to full by about 83% (g:468, 489, 574-576).
- **The split:** a zigzag gap shows the bag's pale inside, tinted by the sticker blurred behind it (g:416-455).
- **The reveal's timing:** 380ms after the snap the stage glides up (520ms, `--ease-peel`) and the sheet rises (440ms); 340ms later the bag drops 178px (640ms ease-out) and the sticker rises 52px (720ms ease-out); 460ms after that, a 560ms gloss sweep (a:211, 216, 268; g:313, 669-672, 688, 716).
- **The hint:** a 2.8s loop while the tear is at 0: the finger presses at 22%, drags 40px by 56%, lifts by 72%, and the tear reaches 16%. The first grab ends it (a:286, 304, 347; g:695-704).
- **Without dragging:** press and hold the bag for 520ms (cancelled past 10px of movement; the frost thins to .88), or double-tap within 340ms, and the strip tears by itself over 720ms, then snaps (a:292-295, 327-337).
- **Keyboard and screen readers:** the tab is a focusable slider, "Pull the tab to open the gift", 0–100 as the tear. Arrow keys move it 20% (the fifth press snaps); Enter, Space and End tear it (a:343-345). The bag's picture stays `aria-hidden`, so the slider isn't inside an image.
- **Reduced motion:** no spring, ticks, loop or hint; the tear still follows the finger; the snap and the reveal are a 150ms fade (DESIGN.md "Gift bag").

`GiftBag` stays the one bag: it gains the receive size, a `tear` value (0–1) as a custom property, the torn gap and the loop, the slider tab, the hint finger, and the rubber stamps below. The physics are a pure module, `receiving/pullTab.ts`.

### Refusals

One layout for each: a title, one line, the bag as a prop, and one label-stock button. "Back to LINE" (arrow-square-out) closes the LIFF window; outside LINE's app it's "Go to my sticker board". Titles and lines marked PROPOSED aren't in the drafts.

| When                                                  | Title                                        | Line                                                                                                  | The bag                                           | Button                                   |
| ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| a group, multi-person chat or OpenChat (`group_chat`) | "Open this in your chat with Alice Sato"     | "Gifts open only in the private chat they were sent to. If Alice Sato sent it to you, open it there." | sealed, stamped "OPENS ONLY IN / 1:1 CHAT" in ink | Back to LINE                             |
| received already (`already_received`)                 | "Already opened"                             | PROPOSED: "Each gift message opens once. If it was you, the sticker's on your sticker board."         | open and empty, stamped "OPENED" in grape         | Go to my sticker board                   |
| your own gift (`own_gift`)                            | PROPOSED: "This gift is on its way"          | PROPOSED: "Only the friend you sent it to can open it."                                               | sealed                                            | Go to my sticker board                   |
| taken back (`taken_back`)                             | PROPOSED: "Alice Sato took this one back"    | PROPOSED: "It went back to their sticker board before anyone accepted it."                            | open and empty, stamped "TAKEN BACK"              | Back to LINE                             |
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

## Changes to the REST doc

Proposed; `docs/database-schema-and-rest-api.md` takes them once this spec is approved, and `contract.ts` follows the doc.

1. **`POST /api/gifts/preview` returns the sticker for a 1:1 open**, so the receiver sees it before Accept (decision 3):
   - The request adds `liffContextType`, as `receive` has.
   - The response adds `sticker: Sticker | null`: the sticker when `receivable`, otherwise null. The doc's "never the sticker" goes: a forwarded link shows it only where Accept could take it anyway.
   - `ReceiveRefusal` adds `group_chat`, since the preview now knows the context.
2. **`BoardSticker` adds `givenTo: { receiver: Person; receivedAt: IsoTime } | null`**, set when `held` is false, for the GivenStickerSilhouette's "→ @bob" and the giver's notice.
3. **`POST /api/gifts/receive` sets `terms_accepted_at`** when it's unset: Accept carries the terms line.
4. **`bests.mostThanksInADay`** counts the person's ticket days, from 4:00 in their zone, as the streak does.

## Testing

- **Pure modules (vitest):**
  - `receiving/pullTab.ts`: the tear follows a drag with its resistance; a release under the snap settles back; the snap at its threshold; one tick per step; the fifth arrow press snaps.
  - The dialog's flow: each preview outcome picks its screen; Accept goes busy, then received; a failed Accept shows its line and retries; a refused Accept moves to its refusal.
  - The refusal screens, one per REST doc error code. The codes are the server's contract, so the test names them.
  - The contract mappings: ISO times to milliseconds, the placement's fields, an empty image URL as none, and `held`, `openGift` and `givenTo` choosing the board, the badge or the silhouette.
  - `deviceApi`'s User Stats: the streak's reset, the counts, `since`.
  - `openedView.ts`: `/g/{token}` opens the dialog with that token.
  - `friendPicker.ts`: the any-chat option asks for LINE's full picker.
  - `giftMessage.ts`: the texts, and a hero only at an HTTPS URL.
- **UI (happy-dom), rendered from fixtures:**
  - ReceiveGiftDialog: every screen's title; the slider tears it and brings up Accept; Accept calls `receiveGift` once and closes with the sticker's ID.
  - StatBoard: filled stats hide the rows at 0; empty stats show the empty lines; a failed load shows what failed, with Try again.
  - PendingGiftsNotificationBadge: one gift and several; a tap opens the newest.
  - GivenStickerSilhouette names its receiver; "Can't find them?" opens the full picker and goes back.
- **Shared helpers**, written before the suites: fixture builders (`person()`, `sticker()`, `boardSticker()`, `gift()`, `userStats()`) and a render that puts a component under `ApiProvider` with a mock client.
- **Looks:** 390 × 844 screenshots, plus 360 and 430 where layout changes, beside the drafts' renders in `DESIGN/.impeccable/review/screens-local/`, with every difference listed.
- **Before merging:** the frontend's lint, typecheck, tests and format check; the build; and a search of `dist/` for a fixture's name, which must find nothing.

## Build order

Implementation branches from `main` after the critique cleanup's branches merge (the cleanup's coordinator says when). Streams run in parallel worktrees, each owning its files; only the coordinator (this session) edits files two streams need.

| Wave | Stream      | Owns                                                                                                                                                                                                                                                        |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Coordinator | `src/api/` (the contract, the client, `useApiQuery`, `deviceApi`'s reads, the mock's frame, fixture builders and fixture stickers), `ApiProvider` in `main.tsx`, `VITE_API_MOCK` in `env.d.ts` and `.env.example`, the REST doc's changes                   |
| 1    | Receiving   | `src/receiving/`, `GiftBag`'s receive additions, `api/mock/receiving.ts`, the gift path in `app/openedView.ts`, LIFF Mock's context in `line/liff.ts`                                                                                                       |
| 1    | Giving      | `giving/` ("Can't find them?", PendingGiftsNotificationBadge, the giver's notice, the gift message and its hero, the sent copy), `line/friendPicker.ts`, `api/mock/giving.ts`                                                                               |
| 1    | Stat board  | `sticker-board/stat-board/`, `ui/HitCounter.tsx`, `deviceApi`'s User Stats, `api/mock/stats.ts`                                                                                                                                                             |
| 1    | Foil        | `stickers/StickerFoil.*`, `stickers/ArtistChip.*`, `StickerFigure`'s foil, the first-load chip layer                                                                                                                                                        |
| 1    | Board data  | `StickerBoard`'s load and saves through the client, `boardSticker.ts`'s mapping, the tray's NEW through `markTraySeen`, `GivenStickerSilhouette`'s receiver, the detail's "On its way" and "You gave it to", `api/mock/board.ts`                            |
| 2    | Coordinator | Mounting the badge, the notice, the chip layer and a received sticker's landing on the board; foil and the chip on the board, the toolbar, the detail and the tray's sheets; screenshots; a code review of the whole change; the checks; squashing; merging |

Each wave-1 stream builds and tests its components alone, from fixtures, and reports its branch to the coordinator; nothing merges to `main` until wave 2 passes.

## Open questions

1. **The Terms and Privacy Policy** have no pages yet. Until they do, the terms line names them without links.
2. **"Not friends in LINE yet?"** needs a check on a phone: `line.me/R/nv/addFriends` through `liff.openWindow`.
