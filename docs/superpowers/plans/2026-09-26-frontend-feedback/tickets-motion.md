# Lane: tickets-motion

Code read at main 42d698a (`.claude/worktrees/feedback-plan`). Paths are under `apps/frontend/src/` unless noted.
Screenshots, frame strips and scripts are in `/tmp/feedback-plan/tickets-motion/`. Each strip shows frames 80 ms apart, left to right, top row first.

**When a ticket is spent (verified):** at Start, not at the first stroke or the seal. `start()` calls `tickets.spend(kind)` when the person taps Start drawing or Use a reserve ticket (`sticker-creation/DrawingScreen.tsx:268-286`). `startRightAway()` spends straight away, with no ask, when the next ticket is a daily one after Keep drawing, after a refill Draw or after a purchase (`:292-295`, `:545-548`, `:574-577`, `:588-591`). The clock starts at the first stroke (`sticker-creation/session/session.ts:65`). The seal files the sticker under that ticket use (`ticketUseId`), then `tickets.refresh()` fetches the used stub's outline (`DrawingScreen.tsx:235`, `:250`). So the spend animation belongs at Start and at Keep drawing. The seal already has its own moment: the kiss-cut outline fades in over 700 ms (`tickets/TicketStubs.css:72-90`).

**Recording note:** in headless Chromium, sealing on the dev server fails after 15 s with "Your sticker wallet is taking too long to get ready". `api/smartWalletApi.ts:8-9` waits for Privy's smart wallet, which never arrives there. `record-flow.mjs` gets past this with a stand-in wallet, set through Vite's module URL, and a patched seal response. `SPEND_DELAY=350` holds each ticket spend for 350 ms, as a phone's round trip to the API would. Tickets were set up through the API: `POST /api/tickets/spend`, then `POST /api/ticket-purchases` with a base58 `txDigest`.

---

## 1. Ticket consumption animation

- **Item:** "We need a ticket consumption animation when you consume a ticket. It does not look smooth with the reserve ticket."
- **Now (verified):**
  - No ticket moves when one is spent. The start card and its scrim vanish in one frame once the spend returns (`strip-start-daily.png`, `strip-use-reserve.png`). `StartDrawing` has no exit: it unmounts when `send({ type: "start" })` turns `asking` false (`DrawingScreen.tsx:276`, `:402`, `:559`).
  - While the spend is in flight, `disabled={busy}` (`tickets/StartDrawing.tsx:109`, `:122`) sinks the key to the disabled look: a Liner Deep face with no lip. With a 350 ms round trip, the Grape "Use a reserve ticket" key goes grey for about 4 frames, then the whole card cuts away (`strip-use-reserve-delay.png`, frames 2–6). That grey key, then the cut, is the "not smooth" reserve moment.
  - Keep drawing spends a daily ticket with no ask and no feedback of any kind (item 2).
  - On the reserve ask, the only reserve ticket on screen is the 18×12 mark in "×3 Reserve" (`tickets/TicketCount.tsx:5`). The art row shows three used daily backings (`3-after-inset34-full.png`).
- **Cause:** the spend was never designed as a moment. The card's only states are mounted and unmounted, and "busy" borrows the disabled look.
- **Fix:** peel the ticket off its backing. This uses the house verb (stickers peel and stick) and ends on the used-ticket look DESIGN.md already defines: "the empty backing it left".
  - **Stub layers.** In `tickets/TicketStubs.tsx`, draw a fresh stub as two layers in one wrapper:
    - underneath, the backing, which is today's `is-used` look (Liner Lift face, 26% edge, perforation);
    - on top, the face (Seal Yellow or Grape, with the Draw mark) in its own `<svg>`.
    - Move the tossed `rotate` from the svg to the wrapper (`TicketStubs.css:15-27`). Add a prop naming which stub is spending and its state: `lift` or `peel`.
  - **Lift.** Starts on the key's press, while the spend is in flight. The face rises `translate: 0 -4px; rotate: -3deg` over `--t-stick` (220 ms) on `--ease-out`. It takes a static lift shadow built from `--shadow-lift`'s values as a drop-shadow, falling down and to the right from the one light. It holds there until the server answers.
  - **Peel.** Starts on the server's answer. The face travels to `translate: 10px -36px; rotate: -12deg`, fading out over the last 40%, in `--t-peel` (280 ms) on `--ease-peel`. The backing stays, and the count text updates with the new tickets.
  - **Failure.** The face settles back (220 ms, `--ease-out`) and today's `startProblem` note shows (`DrawingScreen.tsx:278-285`).
  - **The key while busy.** Replace `disabled={busy}` with `aria-disabled` and `aria-busy`. The key keeps its Seal Yellow or Grape face. `start()` already ignores a second tap (`DrawingScreen.tsx:269`).
  - **Card exit.** 120 ms into the peel, the card drops `translateY(0 → 56px)` and fades out, and the scrim fades out, both in 220 ms (exit faster than the 460 ms rise). Keep `StartDrawing` mounted while it leaves: a `leaving` flag in `DrawingScreen`, cleared on the card's `animationend`. This is the same pattern as `ui/Sheet.tsx:21-58` and `ui/sheet.css:20-33`. The leaving root gets `pointer-events: none`, so the primed sheet takes ink at once. Fade the grabber strip's scrim too: `.phone.has-tucked-tabs:has(.out-of-tickets.is-leaving)::after` in `app/App.css`.
  - **Reserve.** Reserve peels the same way, Grape. It needs a peelable reserve ticket (decision below).
  - **Reduced motion.** No lift, travel or drop. The drawing screen already forces 1 ms on every animation (`sticker-creation/DrawingScreen.css` `@media (prefers-reduced-motion)`), so the face swaps to the backing and the card goes in the same frame. The swap still reads as "used".
  - **Files:**
    - `tickets/TicketStubs.tsx`, `TicketStubs.css`
    - `tickets/StartDrawing.tsx`, `tickets/tickets.css` (`is-leaving` keyframes next to `out-of-tickets-rise`)
    - `sticker-creation/DrawingScreen.tsx` (`leaving` state; pass `spending` to the card)
    - `app/App.css`
  - **Text and docs.** No new on-screen text. Update DESIGN.md's "Out of tickets" with the peel.
  - **View Transitions:** don't use them here. React 19.3.0 in node_modules exports `ViewTransition`, `addTransitionType` and `Activity` (verified: `require('react').ViewTransition` is a symbol). WebKit shipped `document.startViewTransition` in Safari 18.0 / iOS 18, and types and classes in 18.2. On older iOS, LINE's WKWebView gets React's no-animation fallback, which is today's hard cut. A transition also snapshots the live canvas and holds input while it runs. The moving parts exist in both states, so an in-DOM CSS exit is simpler and works on every iOS.
    - https://webkit.org/blog/15865/webkit-features-in-safari-18-0/
    - https://webkit.org/blog/16301/webkit-features-in-safari-18-2/
- **Impeccable:** `/impeccable animate apps/frontend/src/tickets`, then `/impeccable polish`.
- **Size:** M.
- **Decisions for ad0ll:**
  - **Which reserve ticket peels on the reserve ask.** Recommend: lay one large Grape stub on the art row, over the three used daily backings. It peels and "×3" ticks to ×2. The other option is peeling the 18px Grape mark in the count, which is too small to read as a moment.
- **Overlaps:**
  - The tickets-model lane owns what a daily or reserve ticket looks like, the stub art and the Draw key's count chip. The peel needs its stub drawn in two layers. The board's Draw key count could tick down when the board returns.
  - Branch `i18n/handoff` edits `StartDrawing.tsx`, `OutOfTickets.tsx`, `TicketCount.tsx` and `tickets.ts`: text-only conflicts. Land after it or rebase onto it.

## 2. Keep drawing cuts to a blank screen

- **Item:** "When you choose to keep drawing because you have tickets left, there's a hard cut to a blank screen instead of a smooth transition to a blank screen."
- **Now (verified, `strip-keep-daily.png`):**
  - The tap waits 60 ms (press) plus 160 ms (`ACT_AFTER_MS`, `sticker-creation/sealing/SealedCard.tsx:20`, `:62-66`).
  - The whole ceremony (veil, card and sticker) then fades in 240 ms (`sealing/SealCeremony.css:10-13`, `SealCeremony.tsx:218-222`).
  - A white sheet with no timer, tools, rail or undo shows for about 2 frames.
  - Then the chrome and "3:00" snap in: the 200 ms `--ease-out` fade is almost done by the first frame (`DrawingScreen.css:34`, `:42-48`).
  - Only after the fade does the reset run (`LEAVE_MS` 260, `SealCeremony.tsx:22`). It wipes the sheet and unmounts the ceremony in one render (`DrawingScreen.tsx:167-181`, `:263-266`).
  - **With a 350 ms round trip it gets worse** (`strip-keep-daily-delay.png`). After the blank frames, a "Use a ticket to draw?" card nobody asked for rises for about 320 ms with its key sunk grey, then vanishes in one frame. During a right-away spend the phase is `blank`, so `asking` is true and `StartDrawing` mounts (`DrawingScreen.tsx:397-402`, `:545-548`).
  - Keep drawing onto the reserve ask: card fade, a blank frame, then the ask rises (`strip-keep-to-reserve.png`).
  - Under reduced motion `leave()` calls the action at once (`SealCeremony.tsx:219`). The result is the same blank-then-chrome cut.
- **Cause (verified):**
  - The hand-over runs in series: fade out, then reset, then chrome. It should overlap.
  - The ask isn't held back during a right-away spend.
  - Nothing says where the new sticker went.
- **Fix:** the sealed card carries the sticker away, down toward the "Board" grabber, and the fresh sheet is already waiting under it.
  - **0 ms, on the press.** The first fresh small stub on the card's ticket row lifts and peels, using item 1's peel at the small size (travel about 18px, 220 ms). The spend request goes out. Drop the extra 160 ms `ACT_AFTER_MS` for Keep drawing: the press already pops before firing, and the exit now carries the change.
  - **At leave start, not its end.** Reset the sheet and clock under the veil (the ink is already hidden by `data-lifted`, `SealCeremony.css:16-18`). Keep the ceremony mounted as "leaving" until its exit ends, then dispose the layers. This means splitting `reset-sheet`'s `setSealed(null)` and `dispose()` from the canvas and clock reset.
  - **About 100 ms in: the card leaves.**
    - Wrap `SealedCard`, `.seal-ceremony__shadow` and `.seal-ceremony__sticker` in one `position: absolute; inset: 0` layer.
    - On leave, animate that layer's `translate` down 70% of the screen, with opacity 1 → 0 over the last half, in `--t-peel` (280 ms) on `--ease-peel`. That matches the bottom sheet's exit.
    - `translate` composes with the inline `transform`s the frame loop writes, so none of them need changing.
    - The veil and the used-sticker silhouette fade out in 280 ms, linear.
  - **About 120 ms in: the chrome returns.** Timer at 3:00, tools, rail and undo fade in over `--t-pop` with a 120 ms delay, so the sheet is never bare. "Starts when you draw" peels on as it does today.
  - **Hold the ask back during a right-away spend.** Add a `rightAway` flag, set in `startRightAway` and cleared when the spend settles, and render the ask only when `asking && !rightAway`. If the spend fails, the ask rises with its error note, as today (`DrawingScreen.tsx:278-285`).
  - **Last daily ticket, reserve left.** The card leaves the same way and the reserve ask's rise starts about 120 ms into it, so no blank frame shows.
  - **Reduced motion.** No travel. The card, veil and chrome swap in one frame under the house's 1 ms rule, but in the new order, so the fresh sheet and its chrome arrive together.
  - **Budget.** Transform and opacity only, on layers already promoted (`will-change: transform` on the sticker). The veil is one full-screen opacity layer, and the canvas wipe runs once, under the veil.
  - **Files:**
    - `sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.css`, `SealedCard.tsx`
    - `sticker-creation/DrawingScreen.tsx`, `DrawingScreen.css`
    - `tickets/TicketStubs.*` (shared with item 1)
- **Impeccable:** `/impeccable animate apps/frontend/src/sticker-creation/sealing`, then `/impeccable polish`.
- **Size:** M. Items 1 and 2 together take about a day, since they share the peel.
- **Decisions for ad0ll:**
  - **Where the sticker goes on Keep drawing.** Recommend: the card and sticker slide down toward the "Board" grabber. It says "it's on your board", and exits downward like the bottom sheet does. The other option is a plain crossfade: shorter, but it says nothing about where the sticker went.
- **Overlaps:**
  - The transitions lane is looking at page-level hand-overs and at `ViewTransition`. If it adopts `<ViewTransition>`, keep the drawing screen's internal hand-over outside it, or both will animate, and share its exit durations and curves.
  - Branch `i18n/sticker-creation` edits `SealedCard.tsx`, `SealCeremony.tsx` and `SealKey.tsx`: text-only conflicts.

## 3. The start dialog's foot looks cut off on the iPhone

- **Item:** "The bottom of the ticket consumption dialog looks like it cuts off. There's this bright spot and then 'Not now' shows up at the bottom, and there's a hard cutoff instead of a round cutoff."
- **Which dialog (verified):** `StartDrawing`, the only ticket-spending card with "Not now". It has two versions: daily ("Use a ticket to draw?") and reserve ("Use a reserve ticket?"). The same fault hits every card on `.out-of-tickets`: OutOfTickets, the ticket shop card (its "Not now" is the close link) and TicketsNotLoaded.
- **Now (verified in Chromium, 390×844):**
  - **With iOS's 34px home-indicator inset** (CDP `Emulation.setSafeAreaInsetsOverride`), a dark band with a straight top edge lies across the card just below "Not now". The card's rounded foot is dimmed under it (`3-start-reserve-inset34.png`, crop `3-before-inset34.png`).
  - **With no inset** the corners are round. But the "Board" grabber's pull tab sticks up out of the strip's scrim undimmed: a bright spot under the card (`3-before-inset0.png`).
  - `3-before-after.png` shows, left to right: before at 0px inset, before at 34px, after at 0px, after at 34px.
- **Cause (verified):**
  - While a ticket card is up, `.phone.has-tucked-tabs:has(.out-of-tickets__scrim)::after` dims the grabber strip at `height: calc(50px + env(safe-area-inset-bottom))` (`app/App.css:51-61`).
  - The strip itself is only `50px`, from `.phone.has-tucked-tabs .screen { margin-bottom: 50px }` (`App.css:47-49`).
  - With a 34px inset the scrim is 84px tall, so it covers the screen's bottom 34px. The card sits 14px above the screen's foot (`tickets/tickets.css:2-9`), so its bottom 20px lie under a second scrim at z-index 22. Measured: card bottom 780, screen bottom 794, scrim 760–844.
  - At 0px inset, the pull tab (`app/TabBar.css:103-123`, bottom 20px, 44px band, z-index 21) reaches 8px above the 50px scrim. The card's own scrim sits below it, inside the isolated drawing screen, so that 8px shows undimmed.
  - **Bright spot (suspected):** most likely that pull tab. It shows until the grabber has been used once. When the card opens, the strip's scrim fades in over 320 ms while the card rises over 460 ms, so the bright "Board" tab shows first and "Not now" arrives after. On the phone, the dark-then-light scrim bands under the card are the other candidate.
  - LINE's LIFF view size (full, tall or compact) isn't recorded anywhere in the repo; it's set in the LINE console. DESIGN.md's layout (LIFF header, 34px home-indicator area) describes full view. The fault needs a bottom inset above 0, which is consistent with a full-view WKWebView running under the home indicator with `viewport-fit=cover` (`index.html`).
- **Fix (verified by a style override, `after-dialog.mjs`):**
  - Give the strip one height and use it for both the screen's margin and the scrim, so they can't drift apart:
    ```css
    .phone.has-tucked-tabs {
      --tucked-strip: 50px;
    }
    .phone.has-tucked-tabs .screen {
      margin-bottom: var(--tucked-strip);
    }
    .phone.has-tucked-tabs:has(.out-of-tickets__scrim)::after {
      height: var(--tucked-strip);
    }
    /* While a ticket card waits for an answer the grabber can't be used; it goes rather than poking out of the scrim. */
    .phone.has-tucked-tabs:has(.out-of-tickets__scrim) .tab-grabber {
      opacity: 0;
      pointer-events: none;
    }
    ```
  - Leave the grabber at 20px from the bottom. DESIGN.md and the TabBar.css comment place it just above the home-indicator bar on purpose. The `+ env(safe-area-inset-bottom)` term is the only error.
  - The grabber already fades over 160 ms (`TabBar.css:122`).
  - Item 1's card exit adds a fade-out rule for the same `::after`.
  - Confirm on the iPhone in LINE afterwards: this was reproduced by emulating the inset, not on the device.
- **Impeccable:** `/impeccable adapt apps/frontend/src/app/App.css` (safe-area fix), then `/impeccable polish`.
- **Size:** S.
- **Overlaps:** the transitions lane, if it changes the tucked tabs or the grabber. All four `.out-of-tickets` cards benefit.

## Scripts

All of these are one-shot and in `/tmp/feedback-plan/tickets-motion/`:

- `repro-dialog.mjs <user>`: sets up a new user (3 daily tickets spent, 3 reserve bought) and shoots the reserve ask with and without the inset.
- `after-dialog.mjs <user>`: before and after shots of the fix.
- `record-flow.mjs <user>`, with an optional `SPEND_DELAY=<ms>`: records video of the whole flow and writes `marks*.json`, which says when each tap happened.
- To cut a strip: `ffmpeg -ss <s> -t <s> -i video/<file>.webm -vf "fps=12.5,scale=156:-1,tile=10x2"`.
