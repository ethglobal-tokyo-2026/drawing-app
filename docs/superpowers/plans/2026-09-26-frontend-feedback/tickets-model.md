# tickets-model lane: the Draw key's tickets, the daily/reserve rule, reserve glamour, Shop copy

Lens: impeccable shape, bolder, clarify. Code read at 42d698a (the research checkout after it moved from
29c3325; Favio's 8442396, yen instead of SUI in the Shop, is included). File:line references are at 42d698a.

**Seeing the app.** The shared dev server can't seal under LIFF Mock: sealing waits for Privy's smart wallet,
which never gets ready there (`identity/smartWallet.ts:18-33`, 15 s timeout, then "Your sticker wallet is taking
too long to get ready"). So the sealed card is read from code (verified in code, not on screen). Every other state
was reached by spending tickets through `POST /api/tickets/spend` from the page and buying through the Shop's mock
purchase. Screens are in `/tmp/feedback-plan/tickets-model/`:

- `sheet-draw-key.png`: the board's Draw key in 8 states (left column 3/0, 2/0, 1/0, 0/0; right 3/5, 1/5, 0/5, 0/3; daily/reserve).
- `sheet-cards.png`: start card at 2/0 and 1/5, out-of-tickets at 0/0, reserve ask at 0/3.
- `sheet-reserve-shop.png`: the reserve ask, the Shop card's done step, the Shop card.
- Full screens: `a01…a14`, `b01…b07` (names say the state), e.g. `b01-shop-tab-bought.png`, `a13-shop-tab.png`.
- Mocks of the proposal (HTML rendered to PNG): `mock.png` (all), `mock-A.png` (Draw key), `mock-B.png` (reserve
  glamour), `mock-C.png` (cards), `mock-A-strip-first-pass.png` (a rejected variant). Source: `mock.html`.

## Inventory: where tickets show today (all verified)

| Screen (code)                                     | 3 daily, 0 reserve                                                                                                                 | 1–2 daily, 0 reserve                                     | 0 / 0                                          | daily left + reserve             | 0 daily + reserve                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Board Draw key (`StickerBoard.tsx:558-571`)       | Liner Lift chip inside the key face: yellow ×3, empty ×0                                                                           | yellow ×2/×1, empty ×0                                   | empty ×0, empty ×0                             | yellow ×3, grape ×5              | empty ×0, grape ×5                                                                                                                           |
| Start card (`StartDrawing.tsx:70-95`)             | 3 fresh stubs; "empty ×0 RESERVE"; "Use a ticket to draw?"                                                                         | used stubs on the left, fresh on the right; "×0 RESERVE" | (out-of-tickets card instead)                  | stubs + small "grape ×5 RESERVE" | **3 used stubs dominate; the reserve is an 18px mark**; "Use a reserve ticket?"; the line repeats the count ("You have 3 reserve tickets.")  |
| Out of tickets (`OutOfTickets.tsx:71-75`)         | –                                                                                                                                  | –                                                        | 3 used stubs, "empty ×0 RESERVE", refill line  | –                                | –                                                                                                                                            |
| Out of tickets, refilled (`:91-98`)               | Draw key with the chip inside                                                                                                      |                                                          |                                                |                                  |                                                                                                                                              |
| Sealed card (`SealedCard.tsx:111-129`, code only) | small stubs fresh first + reserve mark ×N (×0 shows too)                                                                           | same                                                     | used stubs, ×0, "That was today's last ticket" | same + ×N                        | used stubs + ×N, and "That was today's last daily ticket" **after every reserve seal too** (the condition is only `daily === 0`, `:126-128`) |
| Shop done step (`TicketShop.tsx:171-196`)         | **three grape stubs in the daily slots' layout, capped at 3 whatever the pack** (a 5-pack shows 3, `:174`); Draw key with the chip |                                                          |                                                |                                  |                                                                                                                                              |
| Shop tab and Shop card (`TicketShop.tsx:222-228`) | "Ticket shop", then "Reserve tickets never expire." always under it (`a13-shop-tab.png`)                                           |                                                          |                                                |                                  |                                                                                                                                              |

Two smaller inconsistencies (verified): the start and out-of-tickets cards order stubs used-first
(`dailyTickets`, `tickets.ts:30-37`) while the sealed card sorts fresh-first (`SealedCard.tsx:56-57`); and a zero
reserve count always shows as an empty mark "×0" on the key and the cards.

## The model (answers items 1–3 together)

**One rule, every surface: show the tickets your next drawing can use.**

1. While any daily ticket is left, the daily tickets lead: the day's three stubs on the cards, one Seal Yellow
   ticket "×N" on the Draw key. If you hold reserve tickets, they show as **one** reserve ticket with its count,
   behind or after the daily ones, in their own graphic (below).
2. When the daily tickets are gone and reserve tickets are left, the daily slots go. The one reserve ticket takes
   their place, with its count. Only the refill line says when daily tickets come back.
3. When both are gone, the used day shows (the out-of-tickets card's three used stubs with their kiss-cut outlines)
   and nothing else.
4. A zero count never shows. Reserve tickets never fill daily slots.

This is ad0ll's option A ("you shouldn't show the three slots when you're out of your daily tickets"), with his
option B's point kept for the case where both kinds exist: the reserve ticket gets its own graphic, so it stands
out without competing with the daily ones that will be spent first. Recommendation: A. The reserve ask exists to
ask about one reserve ticket, so that ticket should be the picture; three empty stubs say only "not this".

In code, one helper decides it, so the surfaces can't drift: `ticketView(t: Tickets)` in `tickets/tickets.ts`
returning `{ show: "daily", stubs, reserve } | { show: "reserve", reserve } | { show: "none", stubs }`, with stubs
fresh-first (move the sealed card's sort into it). The Draw key, `StartDrawing`, `OutOfTickets`, `SealedCard` and
the Shop's done step all render from it.

---

## Item 1: tickets attached to the Draw key, not inside it

- **Item:** "The amount of tickets that you have left should not be a part of the draw button, not contained within
  the draw button, but like an attachment, an addition to it, something that appears behind the draw button but not
  in it."
- **Now:** the board's Draw key (`StickerBoard.tsx:558-571`) renders `TicketCounts` inside the `<button>` as a Liner
  Lift chip (`TicketCount.tsx:26-34`, `TicketCount.css:8-15`), both counts always, zeros as empty marks. The key is
  237px wide with the chip (measured on `probe.png`: x 15–252). The same chip sits inside the full-width Draw keys on
  the refilled out-of-tickets card (`OutOfTickets.tsx:97`) and the Shop's done step (`TicketShop.tsx:195`).
  See `sheet-draw-key.png`, `sheet-reserve-shop.png` (middle).
- **Cause:** verified. DESIGN.md "Ticket counts" (DESIGN.md:501-503) specifies it: "Every Draw key carries daily and
  reserve tickets left after its label, on a Liner Lift chip". The chip exists so a yellow mark reads on the yellow key.
- **Fix:** the key goes back to icon + "Draw". The tickets tuck in **behind the key's right end**, like tickets slid
  behind a keycap (mock: `mock-A.png`, rows 2–3).
  - Build `tickets/DrawKeyTickets.tsx`: an `aria-hidden`, `pointer-events: none` SVG rendered as the key's sibling
    inside `.board-draw` (not inside the `<button>`). `.board-draw` is already a stacking context (`z-index: 955`,
    `StickerBoard.css:451-458`), so the SVG takes `z-index: -1`, `position: absolute; left: calc(100% - 14px)`, centered on the 48px face, turned -3° to -4°
    (the house tilt). 14px of it hides under the key; the key's own cast shadow falls on it.
  - States, from `ticketView`:
    - daily left: one Seal Yellow ticket (the `ticketShape.ts` silhouette), 30px tall, 1.5px Ink outline (tickets at
      mark size carry an Ink outline, as the `TicketCount` mark already does), "×3" in Figure type (Mona Sans 850,
      13px, width 125, tabular). About 42px shows.
    - daily left and reserve held: the reserve ticket sits behind the daily one, 8px higher, showing 40px past it
      with "×5" and its sparkle.
    - daily gone, reserve held: the reserve ticket alone in front, "×5".
    - none: the used-ticket backing (Liner Lift, dashed Ink 26% edge, as the used stubs) printed with the refill
      time ("12:00 AM", `formatRefillTime`) in fine print, Graphite, 11px.
  - It doesn't press: the key sinks 4.5px over it and the tickets stay on the page, which is what makes them read
    "behind". The first-visit hop moves the whole slot, so they hop along; the ring (`.board-draw.is-fresh::after`)
    keeps hugging the key because the tickets are absolutely positioned.
  - Width: 162–202px in all, down from 237px, clear of the tray and the nudge.
  - Accessible name: the key's `aria-label` (`StickerBoard.tsx:562-567`) names only what's there: "Draw a new
    sticker: 2 daily tickets left" / "…: 2 daily tickets and 5 reserve tickets" / "…: 5 reserve tickets" / "…: no
    tickets until 12:00 AM" (`describeTickets`, `tickets.ts:40-44`, moves to the catalog with plurals).
  - The full-width card keys lose the chip too (`OutOfTickets.tsx:97`, `TicketShop.tsx:195`): the card's ticket art
    above already shows the tickets. Then `TicketCounts` and `.ticket-counts--on-key` have no users; delete them.
    Keep `TicketCount` (the mark) for the Shop's pack rows.
  - Rejected variant: a strip of three cells for the daily tickets, no number (`mock-A-strip-first-pass.png`). At
    30px the perforations vanish and the strip reads as a yellow arm of the key.
  - Docs: DESIGN.md "The key → Compact" (DESIGN.md:421) and "Ticket counts" (:501-503) become "The Draw key's
    tickets"; PRODUCT.md:153 ("Every Draw key shows … ticket mark × count").
- **Impeccable:** `/impeccable shape` on the Draw key's tickets (the brief above; confirm with ad0ll on
  `mock-A.png`), then `/impeccable polish` on the board's lower left after the build.
- **Size:** M.
- **Decisions for ad0ll:**
  - Daily on the key as one ticket with "×3" (recommended) or a strip of three cells (reads poorly at this size).
  - At no tickets: the empty backing with the refill time (recommended) or no attachment at all.
- **Overlaps:** icons lane (the Draw icon inside the key; the tickets sit after the label, so any icon fits);
  tickets-motion lane (the spend animation should tear the front ticket off this attachment, and the reserve ticket
  slides forward when the last daily one goes).

## Item 2: one model for daily and reserve tickets

- **Item:** "When you run out of daily tickets … reserve tickets only take one slot rather than the three slots. You
  shouldn't show the three slots when you're out of your daily tickets … Or if you do want to show both … minimize the
  daily tickets so that the reserve tickets have their own graphic and stand out … It doesn't tell the user what they
  can use."
- **Now:** see the inventory. The two places ad0ll describes, both verified on screen:
  - "reserve tickets populate the daily tickets": the Shop's done step shows bought reserve tickets as three grape
    stubs in the daily layout, capped at 3 (`TicketShop.tsx:171-178`; `b01-shop-tab-bought.png` shows three stubs
    for a 5-pack).
  - "they appear as a secondary item when you've consumed all daily tickets": the reserve ask leads with three used
    daily stubs and shows the ticket it's asking about as an 18px mark (`StartDrawing.tsx:70-74`;
    `a12-start-0d-3r-reserve-ask.png`, `b07-start-0d-5r-reserve-ask.png`).
- **Cause:** verified. Each card renders `dailyTickets()` stubs regardless of state, and reserve tickets only ever
  get the small `TicketCount` mark or the daily stub layout.
- **Fix:** apply the rule through `ticketView` (mock: `mock-C.png`).
  - **Start card, daily left** (`StartDrawing.tsx:70-74`): stubs fresh-first. The reserve line shows only when
    you hold some: a small reserve stub (the resin one, item 3) + "×5" + the RESERVE caption, in place of the 18px mark.
  - **Reserve ask** (`StartDrawing.tsx`, `reserveAsk`): the art is one large reserve ticket (about 148×90, turned
    -4°) with its count on a Grape dot badge ("×3", Dela, stuck on at -4°, as DESIGN.md's dot badges). No daily
    stubs and no separate reserve line. The line says each fact once: "Today's daily tickets are used." then, in
    Graphite, "New ones at 12:00 AM." The count moves out of the line (`StartDrawing.tsx:82`); keep "You have 3
    reserve tickets" for screen readers in the dialog's description.
  - **Out of tickets** (`OutOfTickets.tsx:71-75`): keep the three used stubs; drop the "×0 RESERVE" line (the Shop
    label under the key already offers the way to more). Refilled view: plain "Draw".
  - **Sealed card** (`SealedCard.tsx:111-129`): the same rule at the small size. Fix the line bug: say "That was
    today's last daily ticket" only when this sticker used the third daily ticket
    (`tickets.usedToday.at(-1)?.kind === "daily"`); after a reserve seal say nothing, or "New daily tickets at 12:00 AM".
  - **Shop done step** (`TicketShop.tsx:171-178`): one reserve ticket with the new total on its badge, not up to
    three stubs; the title keeps "5 reserve tickets added".
  - DESIGN.md "Out of tickets" (:495-499) and a new line under "Ticket counts" state the rule.
- **Impeccable:** `/impeccable clarify` on the ticket cards (one fact per state, count said once), then
  `/impeccable polish`.
- **Size:** M.
- **Decisions for ad0ll:** option A, the daily slots go when they're used up and one reserve ticket takes their place
  (recommended), or option B, both always, daily shrunk.
- **Overlaps:** tickets-motion lane owns the "Use a reserve ticket?" dialog's motion and the sealed card's
  handover from three stubs to one reserve ticket (animate it; at rest the card follows the rule). Shop lane owns the
  done step's hero. The sealed card's "Keep drawing" key stays yellow even when the next ticket is a reserve one and
  the start card will ask; that's the tickets-motion lane's dialog question.

## Item 3: reserve tickets look paid for

- **Item:** "Reserve tickets … should be a little bit more glamorous than regular daily tickets … like in-game
  currencies … more than just the color change: maybe a slight silhouette change, add flair, add sparkle … maybe a
  slight bolden."
- **Now:** a reserve ticket is the daily ticket with a Grape fill: same silhouette, same 22% hairline edge, no other
  mark (`TicketStubs.css:39-54`, `TicketCount.css:37-43`; `mock-B.png`, second ticket).
- **Cause:** verified. Kind only switches the fill color.
- **Fix:** "resin reserve": give reserve tickets the premium material the world already owns, the stickers' resin,
  instead of inventing a new one (bolder.md: amplify what the system owns). Daily tickets stay matte paper.
  - **Resin coat:** inside the ticket's clip, a baked highlight from the top-left light (white 62% fading to 12% over
    the top third, then clear), a 1–1.6px white rim line just inside the top edge, and the print pooling darker at the
    foot (Grape Deep at 45% over the bottom fifth). It's baked, so it works at every size, with or without the app's
    light. Optional on the large reserve ticket only: reuse `stickers/LiveResin.tsx` with the ticket silhouette as
    its `--m` mask, so its specular follows the shared light like a sticker's.
  - **Bolden:** a full Ink outline (1.5px small, 2px large) where daily tickets keep the 22% hairline.
  - **Sparkle:** Phosphor's star-four (fill), white with an Ink edge, stuck over the top-right corner (13px on the
    Draw key's ticket, 24px on the large one). It pops in once when a reserve ticket first shows on a surface (bought,
    or moved to the front), on the peel curve, and never loops.
  - **Silhouette (option):** scalloped ends (three small bites) in place of the round notch. It's a shape difference
    for people who can't tell yellow from grape, but the outline and the sparkle already differ without color.
  - Where: `TicketStubs.tsx` / `.css` (reserve variant: edge, resin `<defs>`, sparkle), `TicketCount.tsx` / `.css`
    (the mark: Ink outline plus the top rim; no sparkle at 18px), `DrawKeyTickets.tsx`. Register star-four in the
    icon registry.
  - **Which rules apply** (DESIGN.md): the No Gloss Rule covers controls, and a ticket is paper, never a control
    (the Draw key's tickets don't press and take no taps), so resin is allowed. The One Light Rule still holds: the
    highlight falls from the top-left, the live layer reads the shared light, and a looping twinkle would be a second
    light on its own clock, so the sparkle pops once. The Other Hand Rule rules out foil: foil marks who drew a
    sticker and is never a rarity grade. The One Meaning Rule keeps Grape (no gold; yellow means daily). Shadows stay
    Ink alpha, the ×counts stay Ink on Grape, Dela only on the dot badge, nothing under 11px. Add one sentence to
    DESIGN.md so a reviewer doesn't flag the gloss: "Tickets aren't controls: daily tickets are matte ticket stock;
    reserve tickets wear the stickers' resin, an Ink outline and a star-four sparkle."
- **Impeccable:** `/impeccable bolder` on the reserve ticket (scope: the ticket only), then `/impeccable polish`.
- **Size:** S for the baked resin, outline and sparkle; M with the live resin layer.
- **Decisions for ad0ll:** resin + Ink outline + sparkle (recommended, `mock-B.png` third ticket), and whether to add
  the scalloped ends too (fourth ticket).
- **Overlaps:** shop lane (the Shop's reserve ticket hero and pack rows use this ticket); tickets-motion lane (the
  sparkle's one pop, reduced motion: none); icons lane (star-four joins the registry).

## Item 4: drop the always-on ticket copy; it's the Shop

- **Item:** "Get rid of the copy about daily tickets are always used first and reserve tickets never expire …
  'Reserve tickets never expire' is something you can show … when you're buying reserve tickets … And it's not the
  ticket shop, it's just the shop."
- **Now** (every occurrence, verified):
  - "Daily tickets are always used first." is already gone from the app on main (removed in 2cbba77). The deployed
    build (deploy/live at 942d96e) still shows it under the Shop's title (`TicketShop.tsx:228` there); the next deploy
    removes it. The docs that state the behavior (AGENTS.MD:11, PRODUCT.md:147,
    `apps/api/src/tickets/tickets.ts:88`, `packages/db/src/schema/tickets.ts:25`) describe what the code does, not
    copy: keep them.
  - "Reserve tickets never expire." shows under the title on the Shop tab and the Shop card, always
    (`TicketShop.tsx:227`; `a13-shop-tab.png`, `a09-shop-card.png`).
  - "Ticket shop" on screen: the Shop's title, `TicketShop.tsx:224` (both layouts). The tab already says "Shop"
    (`i18n/en/app.ts:16`, 「ショップ」 in `i18n/ja/app.ts:10`), so the page and its tab disagree today.
  - "ticket shop" in docs: AGENTS.MD:12 and :13 (a vocabulary entry), DESIGN.md:293, :425, :499, :505 (the
    "### Ticket shop" heading), PRODUCT.md:150, :152.
  - In code comments, log text and test names: `TicketShop.tsx:54` (log), `:102`, `TicketShop.css:1`,
    `StartDrawing.tsx:25`, `:36`, `OutOfTickets.tsx:18`, `:41`, `SealedCard.tsx:31`, `:38`, `DrawingScreen.tsx:128`,
    `ticketCards.test.tsx:92`, `SealCeremony.test.tsx:149`. The component and files are `TicketShop.tsx`/`.css`
    with `.ticket-shop*` classes; `app/ShopScreen.tsx` hosts it.
  - "Shop for tickets" (label on `OutOfTickets.tsx:110`, `StartDrawing.tsx:115`, `SealedCard.tsx:133`) names the
    action, not the place; keep it.
- **Cause:** verified: the Shop's header carries the rule as a subtitle, and "Ticket shop" is the vocabulary word.
- **Fix:**
  - Title "Ticket shop" → "Shop" (`TicketShop.tsx:224`).
  - Remove "Reserve tickets never expire." from under the title (`:226-228`). Show it where a pack is bought: fine
    print under the Pay key (or in the reserve ticket section once the Shop sells more than tickets).
  - Docs: AGENTS.MD's "Ticket shop" entry becomes "Shop" ("Where reserve tickets are bought…"), and the Reserve ticket
    entry says "in the Shop". DESIGN.md and PRODUCT.md lines above follow. Comments and test names follow.
  - Rename `TicketShop` → `Shop` (files, component, `.ticket-shop*` classes), since AGENTS.MD puts vocabulary into
    identifiers and file names. Do it after the i18n/tickets branch lands, in the same change as the shop lane's
    work, so the three don't collide.
  - All of these strings are still inline English: `i18n/en/tickets.ts` is `{}` on main, and the i18n/tickets branch
    (worktree `agent-add914181ddcc0ec6`, no commits yet) will move them. New strings go to `en/tickets.ts` and
    `ja/tickets.ts` (the title can reuse 「ショップ」).
- **Impeccable:** `/impeccable clarify` on the Shop's header and purchase step.
- **Size:** S (copy and docs); S more for the code rename.
- **Decisions for ad0ll:**
  - AGENTS.MD's vocabulary changes only with ad0ll's approval: confirm "Ticket shop" → "Shop" as the term, and the
    code rename (recommended).
  - Where "Reserve tickets never expire" goes: fine print under the Pay key (recommended) or only on the done step.
- **Overlaps:** shop lane (the Shop's layout and hero; this item's title and fine print land inside it); the
  i18n/tickets branch.

## Other findings (outside this lane, for the coordinator)

- Visible copy says "wallet": "Your sticker wallet is taking too long to get ready. Please try again."
  (`identity/smartWallet.ts:29`) and "Your sticker could not be added to your wallet yet. Please try Sealing
  again." (`api/smartWalletApi.ts:13`). Both break the no-"wallet" commitment (PRODUCT.md, Brand Commitments).
  Verified in code; the first showed in this session's browser console on each seal attempt.
- On the shared dev server, sealing always fails under LIFF Mock (the Privy wait above), so no lane can reach the
  sealed card there (the `dev/privy-off-under-mock` branch may be the fix).
