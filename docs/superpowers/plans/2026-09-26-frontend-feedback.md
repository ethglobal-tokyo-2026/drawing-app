# Frontend feedback plan

2026-09-26. A proposal for ad0ll's review. Nothing here is built yet.

ad0ll sent a list of frontend feedback on 2026-09-26. Nine research lanes, one per area, looked at each item through the impeccable skill's commands, reproduced it on a dev server (LIFF Mock, 390 × 844, 250 ms added to each request where timing mattered) and designed a fix. They read main at 42d698a, which already has Favio's yen-only Shop (8442396), a chat menu per language (f07dd3f), the seal worker (0e21a72) and the stat board's QR papers (a38f82d).

- Each lane's full findings, with file and line references: [2026-09-26-frontend-feedback/](2026-09-26-frontend-feedback/).
- The key mocks: [2026-09-26-frontend-feedback/mocks/](2026-09-26-frontend-feedback/mocks/).
- Every other screenshot, frame strip and script is on ad0ll's Mac only, in `/tmp/feedback-plan/`, which macOS clears after a few days.

## Decisions for ad0ll

Each has a recommendation. "Go with the recommendations" settles all of them; name the numbers you want changed.

### Tickets

1. **What the ticket art shows.** One rule on every screen: show the tickets your next drawing can use. While daily tickets are left, they lead, and any reserve tickets show as one ticket with its count. When the daily tickets are gone, the three slots go and one reserve ticket with its count takes their place. A zero never shows. _Recommend this_, your first option, over always showing both with the daily ones shrunk. Mock: `mocks/tickets-model-mock-C.jpg`.
2. **The Draw key's tickets.** They leave the key and tuck behind its right end, like tickets slid behind a keycap: one yellow ticket "×3"; a reserve ticket behind it when you hold some; the reserve ticket alone once the daily ones are gone; at 0 and 0, an empty backing printed with the refill time. The key goes back to icon and "Draw". _Recommend._ Mock: `mocks/tickets-model-mock-A.jpg`.
3. **The reserve ticket's look.** It wears the stickers' resin (a baked highlight from the top-left light), a full Ink outline and Phosphor's four-point star, which pops once when a reserve ticket first shows. Daily tickets stay matte paper. No foil, no gold. _Recommend_; scalloped ends are an optional extra change of silhouette. Mock: `mocks/tickets-model-mock-B.jpg` (drawn in grape; its color follows decision 6).
4. **Spending a ticket.** Today nothing moves: the key sinks grey while the spend is in flight, then the card vanishes in one frame. Proposed: the ticket's face lifts on the press, peels off its backing when the server answers (settling back if the spend fails), and leaves the used backing DESIGN.md already describes; then the card drops away. On the reserve ask, one large reserve ticket peels. _Recommend._
5. **Keep drawing.** The sealed card and its sticker slide down toward the Board grabber while the fresh sheet, clock and tools fade in underneath, so no blank frame shows. _Recommend_, over a plain crossfade.

### Colors

6. **Blue for the Shop and reserve tickets, tangerine for the streak.** You asked for the streak to get its own color off Seal Yellow, for gratitude received to take the gratitude color, and for "received" to stop sharing the Shop's grape. The palette has one free hue that isn't green (blue). Blue and tangerine are the two candidates. My recommendation:
   - The Shop and reserve tickets take a new blue near Sui's own (the Shop tab, the Pay key, the reserve ticket, "Use a reserve ticket"). Yellow daily tickets and blue reserve tickets are opposite hues, so the two kinds can't be confused, and the Shop carries Sui's color without a logo wall.
   - The streak takes tangerine, with a Fire icon: the flame color people already read as a streak (`mocks/stat-board-swatches-in-context.jpg`, column v2).
   - Grape keeps "received" and offers only: Accept, the tray's Gifts tab, received marks and stamps, the offer keys.
   - The gratitude receipt goes all pink: its heart and its rows.
   - The stat-board lane recommended the other way round: the streak in "Calendar Blue", after the Saturdays printed in blue on Japanese calendars (column v1), with the Shop leaving grape for a hue it didn't name. That leaves tangerine for the Shop, next to daily tickets' yellow.
   - Either way it's a colorize pass: two tokens with deep partners, and DESIGN.md's One Meaning Rule rewritten.

### The Shop

7. **"Ticket shop" becomes "Shop"**, as you said, in AGENTS.MD's vocabulary and on screen. In code, the ticket shop becomes `ReserveTicketCheckout`, and the Shop page moves to a new `shop/` folder. AGENTS.MD also gets Laminate and Backing foil entries. _Recommend._ AGENTS.MD changes wait for your yes.
8. **What a backing foil is.** A style of the foil your stickers wear on other people's boards: holo today, then gold, silver, rose gold. _Recommend_: foil keeps its one meaning ("someone else drew this"), and the style becomes the artist's signature on every gift. The alternative, a holographic base under your stickers on your own board, breaks DESIGN.md's Other Hand Rule.
9. **The coming-soon shelves.** No prices (_recommend_: a price invites a tap that goes nowhere, and PRODUCT.md asks for no financial framing). The items, easy to swap: Laminates Gloss, Matte, Glitter, Prism; Brushes Brush, Marker, Fineliner, Pixel pen; Backing foils Holo, Gold, Silver, Rose gold. The first tile on each shelf is what you already have, tagged "Yours".
10. **The Sui credit.** "Payments on" with Sui's full logo, from Sui's official brand kit and unmodified, in black, at the foot of the reserve tickets section and under the Pay key. It isn't a link. _Recommend black and the full logo_: the kit allows black, white or Sui Blue, and Sui Blue on the checkout's paper measures 2.94:1, under the 3:1 floor. PRODUCT.md's line that sponsors are "never surfaced in consumer copy" needs a dated exception. Mock: `mocks/shop-mock-credit.jpg`.

### The stat board

11. **"Residual."** DESIGN.md bans money words for gratitude ("royalty, earn, reward, cut, share, %"), and residuals are royalty payments. _Recommend_ keeping your word and listing it as allowed. The receipt becomes "Gratitude received" with a heart, and two rows, Direct and Residual, with no reason lines. A row at 0 is left off, so a friend-first artist sees Direct only. AGENTS.MD gets Direct and Residual. Mock: `mocks/stat-board-c-proposal-top.jpg`.
12. **The name and picture from LINE.** I read this as the person card at the top of the cork back: your LINE picture and name on a washi-taped card, which repeats the board's header and does nothing when tapped. _Recommend_ removing it on your board and on other people's. Say if you meant the developer slip's "LINE name" row instead.
13. **The developer slip.** It sits collapsed under the cork's end. Pulling up past the bottom meets rubber-band resistance, and past a threshold the slip opens. It collapses again when the board turns back. A visually hidden "Developer tools" button covers keyboards and screen readers. _Recommend_, on the dev server too.
14. **The hit counter.** Without "Most hits in one gratitude combo", "×64" reads as a multiplier, which DESIGN.md's Hits Rule forbids. _Recommend_ building the hit counter DESIGN.md already specifies (leaning numerals, HITS in small caps, speed lines), for the stat board and Explore's leaderboard.

### Icons

15. **The picks**, all Phosphor, through one registry. Contact sheet: `mocks/icons-contact.jpg`.
    - Draw: PencilSimpleLine in fill (_recommend_: it reads on the key, on the 12px print on ticket stubs and on the chat menu, and the app has no edit action for a pencil to be confused with), or Scribble in bold.
    - My board: SmileySticker, for everyone (_recommend_: the three tabs read as one set, and it's already the chat menu's tile), or keep your LINE picture on the tab.
    - Explore: Compass (_recommend_; today's Eyes looks like View's Eye), or Binoculars.
    - Shop: Tag (_recommend_, since the Shop will show more than tickets), or Ticket, the icons lane's pick while tickets are the only item.
    - Gratitude: Heart in fill, already on Send gratitude and the Transfer Trail. Streak: Fire in fill.

### Page changes and loading

16. **How pages hand over.** Since the research, Favio's a940496 opens each tab's screen from a Liner veil that fades away in 160 ms. _Recommend_ keeping his fade (DESIGN.md already says tab changes fade), and adding the sideways slide in tab order (240 ms in, 120 ms out, CSS on the live page) only if tab changes still feel hard on the phone. React 19.3's `ViewTransition` stays out either way: a tap during a running view transition never reaches the page (verified in WebKit 26.5 and Chromium), and on iOS before 18.2 it falls back to a cut.
17. **The first open.** The board's shell (header, zipper, Draw, tabs) shows while you're signed in, instead of bare paper; then the stickers stick on in reading order. The first-sticker ring, hop and note, and the artist chips, play once per app open, not on every return to My board. _Recommend both._
18. **Small ones**, all _recommended_: keep Explore alive between tabs so its search and scroll survive; prefetch the Shop's price quote once the board is idle; re-deal the leaderboard rows on a tab change now, and slide people to their new rank later.

### Explore

19. **The pile falls down the screen** and heaps on each day's floor, as prototyped (`mocks/explore-proto-30-settled.jpg`), rather than dropping toward you onto a loose spread. _Recommend._
20. **Leaderboards move to a "This week" view** beside "Stickers", so hundreds of stickers can't bury them. _Recommend._
21. **Name tags on every sticker**, with the artist's picture and @handle, laid out so no tag is covered. Live resin only on the sticker you lift. _Recommend both._
22. **Gifts in the pile.** A gift drops the sticker again on top of today's layer with an aqua "to @ken" tag, and its old spot keeps a hatched silhouette. _Recommend_, after the first phase.

### The LINE Official Account

23. **A live ticket count in the chat menu.** It can be built. LINE can't vary one image per person, but it can link a different menu per person: one per state (3, 2 or 1 left, reserve only, none) and language, 10 in all, against LINE's limit of 1,000. The API already stores each person's raw LINE user ID and relinks them after each spend or purchase; the change shows at once, even with the chat open. One batch call at midnight Tokyo time moves everyone back to "3 left". _Recommend_ shipping the plain Draw key now (small) and the live count after (a day or more). The reserve state shows the reserve ticket with no count; the none state prints Tokyo's midnight.
24. **The menu's look.** Redraw it as the app's board foot: the Draw key on the left, My board and Explore as pink and aqua labels stacked on the right, drawn from the app's own CSS. Redraw the "Open Sticker Board" menu that new people see the same way. _Recommend both._ Mock: `mocks/line-oa-mock-compare.jpg`. Its live-count version must show the tickets behind the key (decision 2), not today's chip inside it.
25. **The greeting.** LINE's default greeting was most likely never replaced. It's set in LINE Official Account Manager, not in code. _Recommend_ this text, Japanese first, in one message:

    > 5分でかいた絵が、シールになります。ボードにはるのも、友だちにあげるのも自由。下のメニューからシールボードをひらいてください。
    >
    > Draw for five minutes, and your drawing becomes a sticker to keep on your board or give to a friend. Open Sticker Board from the menu below.

    Two other texts are in the LINE findings. A greeting sent from our own server (a follow webhook) waits for the live count, which needs the same LINE service.

### Performance

26. **A session that lasts.** Give the session cookie a 30-day lifetime, ask for the board with it while LIFF starts, and check afterwards that LINE's user matches. Opens then skip the box's call to LINE's verify endpoint from Germany (0.3–0.6 s) and overlap LIFF with the board request. _Recommend._
27. **Start Privy after the board settles**, or at once for a gift link, a seal, a gift or a receive. Its comment already says it "loads once the board is up and never delays it", but it starts with the board and delays the stickers by up to 3.4 s. The chat menu switch and the Sui wallet setup then happen a few seconds later. _Recommend._
28. **WebP sticker images, made on the server** at sealing (WebKit can't encode WebP from a canvas, so the phone can't). The PNGs stay the originals for the content hash and the chain. One sticker's four images went from 260 KB to 43 KB. _Recommend WebP now_; AVIF is 40% smaller again but slower to encode and needs iOS 16.
29. **Keep the last board on the phone**, so the next open paints your stickers before the network answers. It can be one refresh out of date. _Recommend._
30. **The foil's glint: settled by Favio.** The research found the glint swept only when the phone tilted, which needs motion permission most iPhones never grant. After the research, Favio's 753aa9f made it read the shared light: it rests at the top left before any tilt and holds where the last tilt left it, so every phone shows it. _Recommend_ keeping his design and looking at it on the iPhone. The foil's other fixes (W3) should be built with Favio, who is working in that code.
31. **A CDN in Japan** for the app's files and sticker images, once the app has a real domain instead of sslip.io. The round trip to Germany is 265 ms from here; a Tokyo edge would be 10–30 ms. _Recommend later_, and not moving the box, since the data lives only there.

## Fix now: bugs that need no decision

| Bug                                                                                            | Cause                                                                                                                                                                                                                                                                                                                                    | Fix                                                                                                                                                                                              | Size |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| The ticket card's foot looks cut off on the iPhone (your "hard cutoff" and "bright spot")      | `app/App.css:51-61` dims the strip under the canvas at `50px + env(safe-area-inset-bottom)`, but the strip is 50px, so with the iPhone's 34px inset the dimming lies across the card's bottom 20px, just under "Not now", as a hard straight edge. Without an inset, the Board pull tab pokes out undimmed, most likely the bright spot. | One strip height for both, and hide the grabber while a ticket card is up. Checked in Chromium with the inset emulated (`mocks/tickets-motion-3-before-after.jpg`); needs a look on your iPhone. | S    |
| After every reserve seal, the sealed card says "That was today's last daily ticket"            | It checks only `daily === 0` (`SealedCard.tsx:126-128`)                                                                                                                                                                                                                                                                                  | Say it only when this sticker used the third daily ticket                                                                                                                                        | S    |
| Two error messages say "wallet", which the brand rules ban                                     | `identity/smartWallet.ts:29`, `api/smartWalletApi.ts:13`                                                                                                                                                                                                                                                                                 | Reword ("Your sticker isn't ready yet…")                                                                                                                                                         | S    |
| Sealing never finishes on the dev server                                                       | Since the sponsored accounts (ae4e2a9), sealing waits up to 15 s for Privy's Sepolia client, and Privy is off under LIFF Mock. Past that wait, the API's mock chain mode returns no token ID and the app rejects the seal. The live site is fine.                                                                                        | Under LIFF Mock with the API in mock chain mode, skip the wallet and accept the mock seal. Every check of the ticket and seal work below needs this.                                             | S–M  |
| Best combo and Most gratitude in a day show "×0" and "0" to a new artist instead of "None yet" | The cork tests for `null`; the API sends 0                                                                                                                                                                                                                                                                                               | Test for 0                                                                                                                                                                                       | S    |
| Explore's empty leaderboard row has no left padding; the feed says "0 MIN" for under a minute  | `ExploreScreen.tsx:167`, `:35-40`                                                                                                                                                                                                                                                                                                        | Pad it; say "just now"                                                                                                                                                                           | S    |
| Stickers that arrive on the board together all land on the same spot, stacked                  | `placeUnplaced` falls back to one spot for every unplaced sticker                                                                                                                                                                                                                                                                        | Spread them over free spots                                                                                                                                                                      | S    |
| DESIGN.md says there are two index tabs and names the wrong icon package                       | Stale since the Shop tab                                                                                                                                                                                                                                                                                                                 | Three tabs; `@phosphor-icons/react` 2.1.10                                                                                                                                                       | S    |

Already done, nothing to fix:

- "Daily tickets are always used first" left the app in Favio's 2cbba77, and the live site has run main (a38f82d) since tonight's deploy.
- The square box around avatars in Explore's feed was the same story: 2cbba77 rounded the ring, and it's live now. It still needs a look in LINE.
- The Japanese chat menu was never linked (`LINE_RETURNING_RICH_MENU_ID_JA` is unset), but the app starts everyone in English, so nobody sees it yet. The chat menu redraw (W8) creates it.

## Workstreams

Sizes: S under an hour, M a few hours, L a day or more. Paths are under `apps/frontend/src/` unless they start with `apps/`, `packages/`, `deploy/` or a root file.

### W1 Tickets

Your items: tickets attached to the Draw key, not inside it; one model for daily and reserve tickets; reserve tickets that look paid for; a spend animation; no hard cut on Keep drawing; the cut-off card foot; the always-on ticket copy.

- **What's wrong.** A Liner Lift chip with both counts, zeros included, sits inside the Draw key, and inside the full-width Draw keys on the out-of-tickets card and the Shop's done step (`StickerBoard.tsx:558-571`). The reserve ask leads with three used daily stubs and shows the ticket it asks about as an 18px mark. The Shop's done step draws bought reserve tickets in the daily slots' layout, capped at three, so a 5-pack shows three. Stub order differs between cards. Nothing animates on a spend. Keep drawing runs fade out, reset and chrome in series, and a "Use a ticket to draw?" card nobody asked for flashes during the spend.
- **The fix.**
  - One helper, `ticketView(t)` in `tickets/tickets.ts`, decides what every surface shows (decision 1): the Draw key, `StartDrawing`, `OutOfTickets`, `SealedCard` and the Shop's done step all render from it.
  - `tickets/DrawKeyTickets.tsx`: the tickets tucked behind the key's right end (decision 2). They take no taps and don't press, and the key's accessible name says what's left. The chip inside the keys goes, and `TicketCounts` with it.
  - The reserve ticket's resin, outline and star (decision 3) in `TicketStubs` and `TicketCount`.
  - The peel (decision 4): stubs drawn as face over backing, lift on press, peel on the answer, the card's exit kept mounted until it ends (the pattern `ui/Sheet.tsx` uses), and the key keeps its color while busy (`aria-busy`, not `disabled`).
  - Keep drawing (decision 5): the sheet resets under the veil at the start of the exit, the card and sticker slide toward the grabber, the chrome fades in 120 ms later, and the ask is held back during a spend that needs no asking.
  - The card foot fix (see Fix now).
  - Copy: the Shop's title and the "never expire" line move with W4. "Shop for tickets" becomes "Buy reserve tickets" on the three cards that open the checkout.
- **Impeccable:** `shape` on the ticket rule and the Draw key (the mocks), `bolder` on the reserve ticket, `animate` on the peel and the hand-over, `adapt` on the safe area, `clarify` on the card copy, `polish` last.
- **Size:** about two days, split in two: the look (rule, Draw key, reserve ticket; M+M+S) and the motion (peel and Keep drawing; about a day).
- **Files:** `tickets/` (`tickets.ts`, `TicketStubs.*`, `TicketCount.*`, `StartDrawing.tsx`, `OutOfTickets.tsx`, `tickets.css`), `sticker-board/StickerBoard.tsx` (the Draw slot), `sticker-creation/DrawingScreen.tsx`, `sticker-creation/sealing/SealCeremony.*`, `SealedCard.tsx`, `app/App.css`.
- Findings: [tickets-model.md](2026-09-26-frontend-feedback/tickets-model.md), [tickets-motion.md](2026-09-26-frontend-feedback/tickets-motion.md).

### W2 Page changes, loading and the first open

Your items: the board's buttons pop in on first open; the Shop takes a while with no loading animation; hard cuts and popping data between My board, Explore and Shop; hard cuts on the tray's folder tabs and Explore's tabs.

- **What's wrong.** `App.tsx:104-122` mounts only the current screen, and each screen keeps its data in its own state, so every return fetches again and pops (`/api/sticker-boards/me`, `/api/gifts/pending`, the user stats, `/api/explore` and the ticket quote, on every visit). The first open arrives in three pops: bare paper, then the header, Draw and tabs, then the zipper, ticket counts and stickers at once, with a one-frame see-through ghost of each sticker before its image. The first-sticker ring, hop and note replay on every return. The Shop shows two "loading" lines, then the packs pop in and Pay jumps about 270px down. The tray's folder tabs and the leaderboard tabs change color in one frame.
- **Built since the plan: Favio's a940496** (2026-09-27, with a new Loading section in DESIGN.md):
  - A shared skeleton, pressed liner with a slow shine, replaces "Loading…". It outlines Explore's sections and search rows, the Shop's balance and pack rows, and faint die-cut shapes where board stickers sit (`ui/Skeleton.tsx`, `ui/skeleton.css`, `sticker-board/BoardLoading.tsx`).
  - Loaded content rises in, and pictures and stickers fade in only once their image has loaded, so the see-through sticker frame is gone (`ui/reveal.ts`).
  - A tab's screen opens from a Liner veil that fades in 160 ms.
  - Reduced motion drops the shine, the rise and the fades; screen readers hear one status line.
- **What's left.** Build on Favio's skeleton and reveal rather than the blank stock this plan first proposed, and coordinate with him, since he's in these files:
  - A query cache in `api/useApiQuery.ts`: the last answer per key, shown at once and refreshed quietly, plus `prefetchApiQuery`. Returning to a tab still fetches everything again, so this removes the second pop on every return.
  - The first open (decision 17): a `BoardShell` from the moment LINE is ready, so the header, zipper, Draw and tabs show during sign-in instead of bare paper; Draw springs up when the app can draw; the tray mounts before data. The first-sticker ring, hop and note, and the artist chips, play once per app open.
  - The tapped tab sticks on: its fill, then its lift with a small settle. Then the tray's folder tabs (fill, shadow and stand-up together in 160–220 ms, with the shared press) and Explore's leaderboard tabs (one pink label sliding along its track, the rows re-dealt).
  - Keep Explore alive between tabs, and cache and prefetch the Shop's quote (decision 18).
  - Reduced motion: 120 ms fades and no travel. Budgets: nothing blocks input, and only transform and opacity animate.
- **Impeccable:** `animate`, `bolder` scoped to the first open only, `harden` for loading, empty and failed states, `polish`.
- **Size:** about a day: cache S–M, first open M–L, tabs S.
- **Files:** `api/useApiQuery.ts`, `api/SessionGate.tsx`, `sticker-board/BoardShell.tsx` (new), `sticker-board/StickerBoard.tsx`, `sticker-board/BoardLoading.tsx`, `app/App.tsx`, `app/TabBar.css`, `sticker-board/tray/sticker-tray.css`, `explore/ExploreScreen.*`, `styles/tokens.css`.
- Findings: [transitions.md](2026-09-26-frontend-feedback/transitions.md).

### W3 Performance

Your items: first opening your sticker board takes five to seven seconds; the foil loads slowly, its gloss lags in motion on first load, and it doesn't look very good.

- **Where the 5–7 s goes.** Measured on a production build served the way the box serves it, with 250 ms latency, 12 Mbit/s and 4× CPU, for a user with 12 stickers, 5 drawn by others. Your 5–7 s is a cold open (new stickers, or after a deploy):
  - With Privy loading as it does in LINE, all sticker images are in at 8.6–8.8 s cold; without it, at 5.4 s.
  - A warm open reaches the board at 1.1 s locally, which works out to about 2.5–3 s in LINE (estimated from live timings). That's the floor every open pays today.
- **Causes, ranked.**
  1. **Image bytes** (measured). Each sticker is a 574–704 px RGBA PNG of about 250 KB, about 310 KB with its mask, spec and rim, so 12 stickers are 3.7 MB. That's about 2.9 s of a cold open, 40–50% of it. Real drawings with more ink will be bigger.
  2. **Privy's SDK** (measured locally). 52 chunks, 737 KB gzipped, start with the board (`main.tsx:54-55`). The board's data arrives 2.1 s later and the images 3.4 s later. Its wallet iframe then blocks the main thread for 0.3–1 s just as the stickers appear. That block is the lag you saw in the foil's first motion.
  3. **The boot chain** (measured on the live site). Every open runs HTML, JS, `liff.init` (which waits for LIFF's own language files), the LINE profile, `POST /api/session`, the board, then the images, one after another. That's five round trips of about 265 ms to Germany. The session sign-in also has the box check the token with LINE on every open (+0.3–0.6 s), because the session cookie has no lifetime.
  4. **Background downloads during the load** (measured). The stat board's preload pulls in viem (about 60 KB gzipped), and the idle preloads fire on a 1 s timer in Safari, which has no `requestIdleCallback`: 0.2–0.3 s of a cold open.
  5. Smaller: board JSON of 114 KB, mostly outline paths the board doesn't need; a 536 KB entry chunk carrying the Gratitude Mini-game and the drawing screen; 368 `@font-face` rules, 242 of them Japanese, on every open.
- **Why the foil looks bad** (seen in frames).
  - Each sticker's four images arrive separately over about 3 s, so its foil and gloss pop in piece by piece.
  - The band reads as a flat, soft rainbow outline: six broad hue blocks crawling on a 7 s loop, with no metallic contrast and no sparkle.
  - Its edge is soft and lumpy, from a nine-copy mask dilation that is thinner on the diagonals.
  - The sticker's cast shadow draws a dark groove between the white edge and the band, so the foil reads as a ring behind the sticker rather than its edge.
  - No glint shows without tilt (decision 30).
  - Steady-state frames are fine in Chromium (worst 12 ms). The trouble is the first seconds.
- **The fix, in priority order.**
  - **Speed:**
    1. WebP images made on the server at sealing, with a backfill on the box (decision 28, M).
    2. Start Privy late (decision 27, S–M).
    3. A lasting session, asked for while LIFF starts (decision 26, M).
    4. The name and picture from the ID token, so the app doesn't wait for `getProfile` (S).
    5. The last board from the phone's storage (decision 29, M).
    6. Nothing else downloads while the board assembles (S).
    7. Board and ticket JSON without outlines (S–M).
    8. A lazy Gratitude Mini-game and drawing screen (M).
    9. Japanese fonts only when the app is in Japanese (S).
  - **Foil:**
    - Reveal each sticker whole, once its image, mask, spec and rim have decoded (S–M).
    - Bake the band's mask on the server: one crisp mask of even width instead of nine copies (M).
    - The glint: done differently by Favio's 753aa9f (decision 30); check it on the iPhone.
    - Add a fine, still diffraction grating the bands flow under, so they glitter instead of crawling, and cast the shadow from the band's outer edge, so the dark groove goes (M).
  - **Measure on the phone:** add boot milestones and a frame summary to the performance recorder, so you can copy a real report from LINE on your iPhone (S). Measure the foil's cost there before trading any motion for speed: you reverted an unmeasured "hold still" in d758892.
- **Expected results:** warm opens from about 2.5–3 s to 1.0–1.3 s; cold opens from 5–8 s to 2.5–3 s. These are estimates until the phone reports.
- **Impeccable:** `optimize` for the speed fixes, the whole-sticker reveal and the device measurement; `animate` for the foil's material and glint; `polish` last.
- **Size:** about two days in all. WebP M, Privy S–M, session M, last board M, foil M+M, the rest S each.
- **Files:** `main.tsx`, `identity/PrivySignIn.tsx`, `identity/smartWallet.ts`, `line/liff.ts`, `line/LineGate.tsx`, `api/SessionGate.tsx`, `api/ApiRoot.tsx`, `api/useApiQuery.ts`, `ui/lazyWithPreload.ts`, `stickers/StickerFigure.tsx`, `StickerFoil.tsx`, `sticker-foil.css`, `stickerUrls.ts`, `stickers/light.ts`, `sticker-board/StickerBoard.tsx`, `sticker-board/stat-board/addresses.ts`, `performance/`; `apps/api/src/session.ts`, `routes/session.ts`, `services/lineVerifier.ts`, `services/imageStore.ts`, `stickers/seal.ts`, `views.ts`.
- Findings: [perf.md](2026-09-26-frontend-feedback/perf.md).

### W4 The Shop

Your items: placeholders for laminates, brushes and backing foils; reserve tickets as the main call to action; the quick purchase path kept; Sui shown as where payments happen; no always-on rules copy; "Shop", not "Ticket shop".

- **What's wrong.** The Shop tab is the ticket shop's card body laid on the page: "Ticket shop", "Reserve tickets never expire.", a balance well, four packs and Pay, with the lower half of the screen empty. Since Favio's yen change, Sui appears nowhere on screen.
- **The fix.**
  - The page, top to bottom: the title "Shop"; a reserve tickets section (fanned reserve stubs, what you hold, "Reserve tickets", one line on what they're for, "¥100 each, less in packs", a "Buy reserve tickets" key, the Sui credit); then three coming-soon shelves (decisions 8 and 9).
  - Each shelf is a row of four tiles that scrolls sideways. Previews use the app's own materials: your newest sticker under each laminate and foil, a stroke painted by the app's own `paintStroke` for each brush. A bundled sample sticker covers artists with no stickers yet. The tiles aren't buttons.
  - One checkout, `ReserveTicketCheckout` (today's `TicketShop`), always a card. Both the Shop and the drawing flow open it, so the quick path stays three taps. Its title is "Reserve tickets", "Reserve tickets never expire." sits under it, and the Sui credit sits under Pay.
  - Nothing on screen changes when payments move to a JPY coin: the Shop already shows yen only. Keep new code free of SUI amounts and quotes, so only the payment hooks change then.
- **Impeccable:** `shape` (this structure), then the build as new work inside the established world, `bolder` scoped to the reserve tickets section, `clarify` on the copy in both languages, `polish`.
- **Size:** about a day (page, section and checkout M; laminate and foil previews M; brush samples S–M), plus S for the credit. A cheaper cut: static preview images, no sample sticker.
- **Coordinate with Favio** before starting: his 8442396 and 2cbba77 are in these files.
- **Files:** `shop/` (new: `ShopScreen`, `ReserveTicketsHero`, `ComingSoonShelf`, the three previews, `SuiCredit`, `sample-sticker/`), `tickets/TicketShop.tsx` → `tickets/ReserveTicketCheckout.tsx`, `stickers/StickerFoil.tsx` (a `finish` prop for the previews), the `shop` and `tickets` catalogs.
- Findings: [shop.md](2026-09-26-frontend-feedback/shop.md).

### W5 Explore

Your items: the box around the avatar; stickers shown as a list instead of something wilder, like stickers falling into a pile, always showing who drew each one.

- **What's wrong.** The avatar box is fixed (see Fix now). Explore today is a strip plus a feed of one sticker per row: the "pixiv-style feed" DESIGN.md says the world refuses. Everywhere else in the app, stickers are loose, turned, overlapping objects.
- **The fix** (decisions 19–22).
  - A "Stickers | This week" switch under the search, with the leaderboards in This week.
  - The pile: each day is a layer on a perforated floor, newest day first. Stickers overlap about 40%, at seeded turns, so the pile looks the same on every visit.
  - The layout reuses the tray's packer (`tray/sheetPacking.ts`), with overlap, a center-biased drop and a check that keeps every name tag uncovered.
  - Today's newest 12–16 fall in on arrival: gravity, a spin into their turn, the house stick. On a return visit, only stickers new since your last visit fall.
  - Tap lifts a sticker into a sheet with the artist, its details and "Go to @x's sticker board", and you can swipe to the next one. This reuses the board's `useDetailLift` and `detailPaging`.
  - The artist chip needs a plain variant there, since foil isn't allowed off a board.
  - Pile stickers render flat; only the lifted one gets live resin. The screen-reader order is newest first, and under reduced motion the pile fades in.
  - Phase 1 builds the pile from today's payload, with no API change. Phase 2 adds paging by day and smaller images (with W3). Phase 3 adds gifts resurfacing.
- **Impeccable:** `shape` (the brief), `overdrive` (the pile and fall-in), `animate`, `delight` (arrivals on return), `harden` (0, 3 and 300 stickers; screen readers), `optimize` (images, with W3), `polish`.
- **Size:** L; phase 1 about a day.
- **Files:** `explore/` (`ExploreScreen.tsx`, `StickerPile.tsx` and `sticker-pile.css`, `LiftedSticker.tsx`, `pileLayout.ts`, all new except the first), `sticker-board/tray/sheetPacking.ts` (export `profileOf`), `sticker-board/detailLift.ts`, `stickers/ArtistChip.*`; phase 2 `apps/api/src/explore/` and `apps/api/src/routes/explore.ts`.
- Findings: [explore.md](2026-09-26-frontend-feedback/explore.md).

### W6 The stat board

Your items: Direct and Residual instead of the invented Inspired, Magic and Original Artist, with a gratitude icon; no Best combo note; the developer slip hidden until pulled for; no streak copy; no LINE name and picture; the streak's own color.

- **What's wrong.** The API splits the giver's part by input method: tap is Inspired, stroke and shake are Magic (`apps/api/src/stickerBoards/userStats.ts:46-53`). PRODUCT.md said what those measure was open. Magic is your share of the hidden input methods, which is why it reads as nothing. The data you want already exists: every combo stores the artist's 20% share, so Direct is today's Inspired plus Magic and Residual is today's Original Artist. No schema change is needed. One wording note: the 20% comes out of the giver's part, so a combo of 100 gives 80 Direct and 20 Residual, and the copy shouldn't call it a bonus.
- **The fix.**
  - API: `userStatsSchema.gratitude` becomes `{ direct, residual, total }`, with its tests and the REST doc. The app gets the type through Hono's client.
  - The receipt: the heading "Gratitude received" with a pink heart, two rows and TOTAL (decision 11).
  - Delete the Best combo note and the streak's rule; the load-failure message moves to the receipt.
  - Remove the person card (decision 12).
  - The slip in `stat-board/DeveloperSlip.tsx` with a `usePullToReveal` hook (decision 13).
  - `ui/HitCounter.tsx` (decision 14).
  - The streak's color and Fire icon (decisions 6 and 15).
  - "None yet" at 0 (see Fix now).
- **Impeccable:** `distill` (the notes, dots and card), `clarify` (labels, empty and failed states), `colorize` (the streak and the receipt), `animate` and `harden` (the pull on iOS), `polish`.
- **Size:** about a day. Receipt with API M, pull M, the cuts S, colors S.
- **Order, to avoid conflicts in `StatCork.tsx`:** the cuts, then the receipt, then colors, then the pull, which only shows once the cuts shorten the cork.
- **Files:** `sticker-board/stat-board/` (`StatCork.tsx`, `statFigures.ts`, `stat-board.css`, `StatBoard.tsx`, `DeveloperSlip.tsx` and `usePullToReveal.ts` new), `ui/HitCounter.tsx` (new), `apps/api/src/shapes.ts`, `apps/api/src/stickerBoards/userStats.ts`, `apps/api/src/routes/stickerBoards.test.ts`, `docs/database-schema-and-rest-api.md`.
- Findings: [stat-board.md](2026-09-26-frontend-feedback/stat-board.md).

### W7 Icons

Your items: invented icons replaced from Phosphor; better Explore, My board and Shop icons; the Draw key's invented icon; an icon for gratitude.

- **What's wrong.** DESIGN.md says icons go through one registry, but none exists: 34 files import 41 Phosphor icons directly. Two icons are ours:
  - `DrawIcon` is Material Symbols' `draw`: the Draw key, six other Draw actions, and the print on every fresh ticket stub.
  - `StickerBoardIcon` is our own mix of two Phosphor shapes, on 13 "go to the board" spots and on the My board tab for people with no LINE picture.
  - The combo HUD and the game's receipt type a "♡" where the rest of the app uses the Heart icon.
- **The fix.**
  - A registry at `icons/index.tsx`. `DrawIcon` and `StickerBoardIcon` keep their names, so 19 call sites change only their import line.
  - oxlint's `no-restricted-imports` blocks direct Phosphor imports.
  - A test checks that the inlined copies (two mini-game SVG strings and the chat menu page) match the package.
  - The picks from decision 15; the "♡" becomes the Heart.
  - Brand logos (Sui, Ethereum, LINE) stay apart from icons. The stat board's Sui pin recolors and outlines the logo, which Sui's kit forbids, so move the marks to one brand-marks file and use the logo unmodified.
- **Impeccable:** `polish` (a drift fix, not a redesign), `document` for DESIGN.md.
- **Size:** registry M, the swaps S.
- Findings: [icons.md](2026-09-26-frontend-feedback/icons.md).

### W8 The LINE Official Account

Your items: "3 a day" on the chat menu's Draw tile; the menu's icons and buttons not matching the app; the greeting.

- **What's wrong.** One menu image per language is linked to everyone, so it states the rule ("3 A DAY") instead of a count. Its tiles are flat fields with no ink outline and no lip: neither the app's key nor its label stock. It uses Material's `draw` and Phosphor's `eyes`. The greeting is set in LINE Official Account Manager and is most likely LINE's default.
- **The fix.**
  - Step 1 (M): redraw both languages' menus as the board foot (decision 24), using W7's icons; create the menus; move everyone onto them with one batch call; set the Japanese menu's ID for the first time.
  - Step 2 (L, decision 23):
    - Move chat-menu linking from the sticker-auth server into the REST API as a `lineChatMenu` service behind `AppDeps`, and relink on each spend, purchase and app load.
    - Commit a `deploy/line/menus.json` map of menu IDs.
    - Run the midnight batch, with a catch-up at boot, then relink anyone who spent while the batch ran, or they'd wrongly show "3 left".
    - Unlink on account deletion.
  - The greeting: paste text A into the Manager (decision 25), keep it in `deploy/line/greeting.md`, and check the auto-replies while there. This needs your LINE console login.
- **Impeccable:** `shape` (layout and states), `clarify` (the menu's screen-reader labels and the greeting in both languages), `polish` on the rendered PNGs, `document` for DESIGN.md's new "Chat menu" entry.
- Findings: [line-oa.md](2026-09-26-frontend-feedback/line-oa.md).

### W9 The design docs

After decisions 6, 7, 11 and 15:

- AGENTS.MD: Shop, Laminate, Backing foil, Direct and Residual. These wait for your yes.
- DESIGN.md: three index tabs; the icon registry, with the Draw Exception gone; the palette and One Meaning Rule; the Draw key's tickets; ticket art; the reserve ticket's resin; the Shop; Explore, which has no section today; the chat menu; the cork back; page hand-overs and blank stock.
- PRODUCT.md: the Shop's shelves, the Sui credit exception and the gratitude kinds.
- One `/impeccable document` pass at the end, checked against what shipped. Each lane still keeps its own DESIGN.md section current as it goes.

## Build order

1. **Before any build.**
   - Land PR #10 (`i18n/handoff`, 71+ frontend files). It now also carries the sticker board's, Explore's and the tickets' text (`i18n/sticker-board`, `i18n/explore` and `i18n/tickets` were merged into it). Almost every workstream edits the same files for text.
   - Tell Favio about W2 (his a940496 built the loading outlines and tab fades), W4 (his Shop changes) and the foil work in W3 (his 753aa9f is in the same files), and Spencer about the dev sealing fix and the "wallet" copy (his sponsored-account code).
   - Run `git fetch` and look at open PRs again, since both teammates merge too.
2. **Foundations**, each small and committed early so the lanes can start:
   - the dev sealing fix;
   - the icon registry with the picks;
   - the motion tokens in `styles/tokens.css`;
   - the query cache in `api/useApiQuery.ts`;
   - `ticketView`;
   - the color tokens, after decision 6.
3. **Lanes in parallel**, one agent per workstream, each branching from main in its own worktree. Who owns shared files:
   - `StickerBoard.tsx`: W1 owns the Draw slot, W2 the first-open sequence, and W3 the images and resin.
   - The ticket shop: W4 renames it, and W1 touches its done step only through `ticketView`, after W4 lands.
   - `ExploreScreen`: W5 owns the content; W2 owns the page hand-over and This week's tab motion. W2's Explore placeholders give way to the pile's fall-in, which is Explore's loading state.
   - `api/useApiQuery.ts`: W2 builds the cache; W3's stored last board plugs into it.
   - Sticker images: W3's WebP and smaller images also serve W5's pile.
   - DESIGN.md: each lane edits its own sections; AGENTS.MD goes in one commit after your yes.
4. **At the end**, once: one code review, `pnpm check`, the end-to-end run, a look on your iPhone in LINE (the card foot, the slip's pull, the foil, the first open), then merge and deploy.

W1, W2, W5 and W6 each take a day or two; the rest are shorter. With the lanes in parallel, allow about two days, plus the review.

## The impeccable commands, per workstream

| Workstream                   | Commands, in order                                                 |
| ---------------------------- | ------------------------------------------------------------------ |
| W1 Tickets                   | shape → bolder → animate → adapt → clarify → polish                |
| W2 Page changes and loading  | animate → bolder (first open only) → harden → polish               |
| W3 Performance               | optimize → animate (the foil) → polish                             |
| W4 The Shop                  | shape → bolder (the reserve tickets section) → clarify → polish    |
| W5 Explore                   | shape → overdrive → animate → delight → harden → optimize → polish |
| W6 The stat board            | distill → clarify → colorize → animate → harden → polish           |
| W7 Icons                     | polish → document                                                  |
| W8 The LINE Official Account | shape → clarify → polish → document                                |
| W9 The design docs           | document                                                           |
| After everything             | critique on the whole app, to catch what the lanes missed          |

## Not in this plan

- **Paying in a JPY coin.** You said not yet. The Shop already shows yen only, and the Sui credit doesn't depend on the coin.
- **Persona 5 lettering on the "since" line.** Nobody has done it: no branch, commit, file or doc mentions it. The line is Mona Sans on the cork back's ink label-maker tape. The notes you meant are Persona 5's calling cards (予告状), in ransom-note lettering: letters cut from magazines in mixed faces. It could be built later from the app's own fonts on tilted paper scraps, if DESIGN.md allowed it.
