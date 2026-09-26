# Lane: shop

Read at main 42d698a (the research checkout moved there from 29c3325). Screens in `/tmp/feedback-plan/shop/` come from the dev server at 5190 as user `shop-r1-a` (390×844, LIFF Mock): `node /tmp/feedback-plan/shop/flow.mjs <prefix>` replays them; it spends the three daily tickets through `POST /api/tickets/spend` so the quick path shows in a minute.

**Favio is working in this area.** His 8442396 (committed 2026-09-26 22:28 JST) made every amount in the ticket shop yen, dropped the SUI/JPY rate line and relabeled "Shop for tickets with Sui" to "Shop for tickets"; his 2cbba77 earlier removed "Daily tickets are always used first." and "More things to buy with Sui are on the way." The build for these items should be coordinated with him before it starts.

---

## 1. The Shop shows intent: reserve tickets on top, then laminates, brushes and backing foils

**Item:** "The shop page should have placeholders for … laminate styles, brushes, and backing foils for your stickers … show those loaded in the shop even though we don't actually support them … just to show intent. Reserve tickets … can be the main call to action at the top … And we still show the quick 'this is how you purchase reserve tickets as quickly as possible' when you're doing it because you want to keep drawing stickers."

**Now (verified):**

- The Shop tab is the ticket shop and nothing else. `app/ShopScreen.tsx:5-10` renders `<TicketShop layout="page">`; `tickets/TicketShop.tsx:219-296` draws title "Ticket shop", the line "Reserve tickets never expire.", a "YOUR JPY ¥7,500" well, four pack rows and the Grape "Pay ¥100" key. The lower half of the screen is empty Liner (content is 776px tall at 390×844). Screens: `shop/s01-shop-tab-3d-0r.png`, `shop/s09-shop-tab-0d-3r.png`.
- The quick path from the drawing flow is the same component as a card: out of tickets (`s02-out-of-tickets-0d-0r.png`) → "Shop for tickets" (`OutOfTickets.tsx:109-111`) → `TicketShop layout="card"` over the canvas (`DrawingScreen.tsx:585-594`, `s03-quick-shop-card.png`) → pick a pack, Pay (`s04`, `s05`) → "3 reserve tickets added" with Draw, Buy more tickets, Not now (`s06`) → Not now → "Use a reserve ticket?" with "Shop for tickets" (`StartDrawing.tsx:103-117`, `s07`, `s08`). The seal screen's last-ticket card also opens it (`SealedCard.tsx:130-134`, `SealCeremony.tsx:258`). From "out of tickets" to drawing again takes three taps with the preselected single ticket (Shop for tickets, Pay, Draw), four with another pack; that's already short.
- Nothing in the app sells or previews laminates, brushes or foils. The one brush is `sticker-creation/canvas/brush.ts` + `paintStroke.ts` (opaque, pressure or speed tapered). The sticker's finish is baked resin plus `LiveResin` (`stickers/live-resin.css`). The only foil is `StickerFoil` (`stickers/sticker-foil.css`), the six-band holo band behind a sticker someone other than the board's owner drew.

**Cause:** The Shop was built when tickets were the only thing to sell (PRODUCT.md: "A Shop tab signals a Sui-backed in-app store; tickets are the only item for now"), so the page is the ticket shop's card body laid on the Liner. (verified)

**Vocabulary check (verified), two conflicts to settle before naming anything:**

- **Foil already has one meaning.** `styles/tokens.css:117`: "Foil: a material, never a fill, worn only by stickers someone other than the board's owner drew." DESIGN.md "Stickers → Foil" and SCOPE.md's sticker detail row say the same. A foil you buy for your own stickers on your own board would break that rule and blur the "someone else drew this" signal.
- **"Ticket shop" is an AGENTS.MD term** ("Where reserve tickets are bought, in packs of 1, 3, 5 and 10, priced in yen and paid in SUI"), and "Reserve ticket" says "bought with Sui in the ticket shop". ad0ll's "It's not the ticket shop, it's just the shop" changes it, and AGENTS.MD says vocabulary changes need his approval.
- "Laminate" appears only inside the Seal entry ("you seal a printed sticker by applying laminate over it"), which makes laminate styles literally other ways to seal a sticker. "Backing" is used for the paper under a sticker (DESIGN.md "Out of tickets": "the cut line a sticker leaves on its backing"; `sticker-figure.css:24`). No entry exists for "Shop", "Laminate", "Backing foil" or "Brush".

**Fix (the brief):**

_Structure, top to bottom, at 360–430px:_

1. **Page title** "Shop" (display type, as the other tabs' titles). No subtitle: no rules copy on the page.
2. **Reserve tickets hero** (`ReserveTicketsHero`), one label-stock card, the page's only key:
   - Art: three Grape reserve stubs fanned, from `TicketStubs` (`kind: "reserve"`, size large), the same art as the "tickets added" card, so the product reads as an object on display.
   - Under it, what you hold: the reserve ticket mark × count, as on the out-of-tickets card (`out-of-tickets__reserve`).
   - Title "Reserve tickets"; one line on what they are for, not how they're spent: "Draw more stickers today." (copy for the clarify pass).
   - Price anchor from the loaded pack list: "¥100 each, less in packs" (the one-ticket pack's `priceYen`; "less in packs" only while some pack has a discount). Hidden while the list loads or fails, so the hero never waits on it.
   - The Grape key "Buy reserve tickets" (ticket icon). It opens the checkout (below).
   - The Sui credit at the card's foot (item 2).
   - Roughly 300px tall at 390px, so the first shelf's header and tiles show above the tab bar and the second shelf's top peeks: the page visibly continues.
3. **Three coming-soon shelves** (`ComingSoonShelf`), in this order: Laminates, Brushes, Backing foils. Each:
   - Header row: the shelf name (16px, 750) and one "Coming soon" tag (a quiet Liner Deep pill in Graphite fine print, not the Pink sale sticker, which means a discount). One line under it saying what the thing is.
   - A row of four tiles that scrolls sideways with scroll-snap; with 104px tiles, 8px gaps and 18px page padding the fourth peeks by about 36px at 390px and 76px at 430px, and barely (about 6px) at 360px, where the tiles could drop to 100px (arithmetic, not measured). Tile: Liner Lift label stock, a 96px square preview, the item's name. No price, no buy button, no press state; the tiles are a list, not buttons (`role="list"`, each `aria-label` like "Glitter laminate, coming soon").
   - The first tile is what you already have, tagged "Yours"; the other three are the coming ones. Leading with the owned default explains the category without copy, and makes the shelf read as "your kit, growing" rather than "things you can't buy".

_What each shelf shows (previews made from the app's own materials, one of your stickers in each):_

| Shelf         | Line under it                                              | Tiles (first is Yours)                      | Preview                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laminates     | "The finish your stickers are sealed with."                | Gloss (Yours), Matte, Glitter, Prism        | Your newest sticker through `StickerFigure`, so it has its die-cut, cast shadow and resin. Gloss is it unchanged. Matte drops `LiveResin` and adds a faint white haze masked by the sticker's `--m`. Glitter and Prism add an overlay masked by `--m` (sparkle dots with `mix-blend-mode: screen`; faceted foil-palette gradient with `overlay`). The overlays read the shared light (`--lx`, `--ly`) the resin already follows, so a tilt moves them.              |
| Brushes       | "More ways to lay down ink."                               | Brush (Yours), Marker, Fineliner, Pixel pen | A stroke sample: one S-curve painted on a small canvas by the app's own `paintStroke`, in Ink. Brush = today's tapered `StrokeBuilder` output. Marker = width set by stroke direction (a chisel tip). Fineliner = one constant thin width. Pixel pen = the same path on a quarter-size grid, scaled up with `image-rendering: pixelated`. All four are opaque, so none contradicts "Brushes are fully opaque" (PRODUCT.md) or SCOPE.md's "textured brushes: Never". |
| Backing foils | "The foil your stickers wear on a friend's sticker board." | Holo (Yours), Gold, Silver, Rose gold       | Your sticker with `StickerFoil` behind it at detail width, one finish per tile: a `finish` modifier that swaps the six `--foil-*` colors for golds, silvers or rose golds. Holo is today's foil unchanged.                                                                                                                                                                                                                                                          |

- Backing foils read as a **style of the foil your stickers already wear when someone else holds them** (recommended reading; see decisions). That keeps foil's one meaning, turns it into the artist's signature on every gift, and each preview is simply "your sticker as a friend sees it".
- **Which sticker:** your newest held sticker, from one `api.stickerBoard()` call when the Shop opens (the call `useKeptStickers` makes; `useApiQuery` keeps no cache between screens, so this is a fresh request, verified in `api/useApiQuery.ts`). The preview squares stay blank label stock until it answers, so no stand-in flips to your sticker mid-look.
- **When you have no stickers yet** (every new user): the laminate and foil tiles use one bundled sample sticker, drawn and sealed in the app once and saved with its png, mask, spec and rim (a few small PNGs under `src/shop/sample-sticker/`).
- Reduced motion: overlays hold still, as `live-resin.css` and `sticker-foil.css` already do.

_The checkout (the drill-down), shared with the quick path:_

- Rename `TicketShop` to `ReserveTicketCheckout` and make it always the card (drop `layout: "page"` and the `ticket-shop--page` style). The Shop's hero key opens it over the Shop page; the drawing flow opens it over the canvas exactly as now. One component, one set of states (choose, paying, done, error), one test. Over the Shop its scrim should cover the tab bar too: `.out-of-tickets` is `z-index: 30` inside `.shop` (25) inside `.screen`, while the tab bar sits outside `.screen` at `--z-tabs`; if the scrim doesn't reach it, open the card from `App.tsx` at the phone level, as `ReceiveGiftDialog` is (suspected, not tried).
- Its content: title "Reserve tickets" (not "Ticket shop"); under it "Reserve tickets never expire." (item 3 puts that note here); the balance well relabeled "Balance" (the "YOUR JPY" caps label reads as a currency code); the four packs; the Grape "Pay ¥…" key; the Sui credit under the key (item 2); "Not now".
- Done state from the Shop: Draw goes to the drawing screen (`onDraw`, as now), "Buy more tickets" returns to the packs, "Not now" closes the card back onto the Shop, whose hero count has updated from `useTickets()`.
- The quick path keeps its three taps. Its button label becomes "Buy reserve tickets" on the out-of-tickets card, the reserve ask and the seal screen's last card: it opens the checkout, not the Shop, and the label should say what happens.

_Files:_

- New folder `apps/frontend/src/shop/` (add it to AGENTS.MD's architecture list): `ShopScreen.tsx` + `.css` (moved from `app/`; its doc comment "Tickets are the only thing on sale for now" goes), `ReserveTicketsHero.tsx`, `ComingSoonShelf.tsx`, `LaminatePreview.tsx`, `BrushStrokeSample.tsx`, `BackingFoilPreview.tsx`, `shelves.ts` (the items: id, name key, preview kind), `sample-sticker/`.
- `tickets/TicketShop.tsx` → `tickets/ReserveTicketCheckout.tsx` (+ its CSS); `sticker-creation/DrawingScreen.tsx:18,586` (import); `app/App.tsx:11,122`; `tickets/OutOfTickets.tsx:109-111`, `tickets/StartDrawing.tsx:114-116`, `sticker-creation/sealing/SealedCard.tsx:132-134` (label); `tickets/ticketCards.test.tsx:132-164` and `SealCeremony.test.tsx:162` (names and labels).
- `stickers/StickerFoil.tsx` + `sticker-foil.css`: an optional `finish` prop, used only by the previews.
- i18n: a new `shop` section (`i18n/en/shop.ts`, `i18n/ja/shop.ts`, both `index.ts`) for the page, hero and shelves; the checkout's strings in `tickets` (empty today).
- Docs: DESIGN.md "Ticket shop" becomes "Shop" (page, hero, shelves) and "Reserve ticket checkout"; PRODUCT.md's two Shop bullets (lines 152 and 154) and a dated decision line for the shelves; SCOPE.md a row "Shop shelves: laminates, brushes, backing foils | coming soon, not for sale"; AGENTS.MD vocabulary once approved.

**Impeccable:** `/impeccable shape` on this brief with ad0ll (the decisions below), then the build as an ordinary impeccable request for a new surface inside the established world (DESIGN.md stays the authority), `/impeccable bolder` scoped to the reserve tickets hero (the page's one peak, in the system's own devices: stub art, display type, Grape key), `/impeccable clarify` on the Shop and checkout copy, `/impeccable polish` last.

**Size:** L as specified (about a day): page + hero + shared checkout M; laminate and foil previews M; brush samples S–M; sample sticker S. A cheaper cut (S–M): static preview images rendered once, no sample sticker; recommended only if the day isn't there.

**Decisions for ad0ll:**

1. _What a backing foil is._ (a) A style of the foil band your stickers wear on other people's sticker boards (recommended: keeps foil's one meaning, becomes the artist's signature on gifts); (b) a holographic base for your stickers on your own board, which needs a new rule for foil and a new way to mark "someone else drew this".
2. _Vocabulary._ Rename the AGENTS.MD entry "Ticket shop" to "Shop" (the tab: reserve tickets on sale, laminates, brushes and backing foils coming), change "Reserve ticket" to "bought in the Shop, paid on Sui", and add "Laminate" and "Backing foil" entries. Recommended as worded here; the checkout needs no vocabulary entry.
3. _Prices on coming-soon items._ Recommend none: a price invites a tap that goes nowhere, and PRODUCT.md's Brand Commitments ask for "No financial framing anywhere a user can see it"; the reserve ticket packs are the only prices the Shop needs.
4. _Item names._ Laminates Gloss, Matte, Glitter, Prism; brushes Brush, Marker, Fineliner, Pixel pen; foils Holo, Gold, Silver, Rose gold. Recommended as listed; they're content, easy to swap.
5. _Whether the owned default leads each shelf as "Yours"._ Recommended yes.

**Overlaps:** tickets-model lane (the reserve ticket's look: the hero's stub art and count mark inherit whatever it decides; it inventories the ticket copy app-wide); transitions lane (the Shop's loading and tab transition; the checkout card's rise over the Shop page should use the same motion as over the canvas); icons lane (the Shop tab icon, `TabBar.tsx:142`, and the ticket and storefront icons on the relabeled buttons); `i18n/tickets` (agent worktree at 0e21a72, no commits or edits yet): the checkout's strings land in the same `tickets` section, so whichever lands second rebases; Favio's recent ticket shop commits (above).

---

## 2. Show that payments happen on Sui

**Item:** "We're about to make a change where the user pays directly in JPY, in a mock stablecoin … we won't need to show the amount of SUI, so there won't be a converting thing here. You don't need to make that change yet. … I want people to know the transaction takes place on Sui, so we should show the Sui logo somewhere, and maybe some subtle Sui branding there too."

**Now (verified):**

- No Sui mark or the word Sui on screen anywhere in the Shop or the checkout since 8442396 (only comments and console logs still say it): prices, balance and the Pay key are yen only (`TicketShop.tsx:229-291`), the rate line is gone. The only on-screen hint left is the pay error from the mock, "You don't have enough yen for this pack." (`payments/sui.ts:33`).
- The conversion lives only in code: `useTicketQuote` refetches a SUI/JPY quote as each expires (`TicketShop.tsx:39-73`), the balance is MIST shown as yen through `yenForMist` (`prices.ts:9-10`), and `payForTickets` / `buyTickets` send `priceMist` / `paidMist`. The payment is the mock (`IS_MOCK_PAYMENT = true`, `payments/sui.ts:20`).
- The one Sui mark drawn in the app is the stat board's push pin (`sticker-board/stat-board/ChainPin.tsx:3-8`, merged in a38f82d): Simple Icons' Sui path filled Liner Lift with a 2.4 Ink outline and a glint. There is no `feat/board-address-papers` branch; a38f82d is that work, merged.

**Cause:** Favio's yen change removed the SUI amounts, and with them every mention of Sui; nothing replaced them. (verified)

**Sui's brand rules (verified from the official kit):** Sui's "Launch on Sui" page links its Brand Kit as "Official logos and brand assets": https://live.standards.site/sui-media-kit (linked from https://www.sui.io/launch-on-sui). Its text, extracted to `/tmp/feedback-plan/shop/sui-media-kit.txt`, and its logo files (`/tmp/feedback-plan/shop/sui-logo/01_Sui_Logo/`, SVG, PNG and EPS for the droplet and the full logo in Sui Blue, black and white) say:

- The full logo (droplet + wordmark) "should be used most often to represent our brand, especially to audiences unfamiliar with it." The droplet alone is the "mark of authenticity", for once the brand is known.
- Colors: "Our logo should only appear in black, white, or Sui Blue 600", which is #298DFF. Monochrome is for when the background clashes with Sui Blue, for one-color printing, or beside a partner logo.
- Clear space: "use the letter 'u' in the wordmark as a guide for spacing" (full logo); the droplet's diagram (`kit-Clearspace_1.png`) keeps half the droplet's height clear on every side.
- Don'ts (`kit-sheet.png`): don't alter the logo, apply multiple colors, stretch the droplet, alter the logo type, create custom logos ("Sui Group"), use the old logo, use unapproved colors or gradients, or use low-contrast pairings ("our minimum requirement is AA").
- No minimum size is published. The media kit's text has none; ask the Sui Foundation through the kit's Contact Us form if it matters.
- Contrast on this app's papers, computed with the WCAG formula: Sui Blue on Liner #f2f1f6 is 2.94:1 (under the 3:1 graphics floor), on Liner Lift #f8f7fb 3.10:1, on white 3.31:1, on Grape 1.05:1. Black-family Ink passes on all of them.
- Permission (suspected, unresolved): fetching https://sui.io/security/trademark-usage-policy returned Sui's Terms of Service, which ask for written consent to "use or display … any Sui Foundation trademark, logo" and forbid misrepresenting affiliation; a search snippet for the same URL describes a trademark policy that allows saying a project is built on Sui. A credit saying payments run on Sui, with no partner lockup and no claim of endorsement, looks like low risk for a hackathon build; nobody has asked the Foundation.

**Fix:**

- **One component, `SuiCredit`:** fine print "Payments on" (Graphite caps, the `.fine` style) followed by Sui's full logo, unmodified from the kit's files, 16px tall (about 31px wide at the file's 1914:1001 ratio), with at least the "u"-width of clear space around it. It's `role="img"` named "Payments on Sui"; no underline, chevron, border or pressed state, and it never sits inside a button, so it reads as a credit and not a control. No link while the payment is mocked.
- **Color:** the black file (`Logo_Sui_Full_Black.svg`) by default. It's one of the kit's three approved colors, passes contrast on every paper in the app (the checkout card is bare Liner, where Sui Blue measures 2.94:1), and adds no color DESIGN.md doesn't own. The Sui Blue file is the alternative wherever the credit sits on Liner Lift or white (3.10:1 and 3.31:1), which today means only the hero's foot (decision 1). Never Sui Blue on the Grape key's face (1.05:1).
- **Where it sits:** at the foot of the reserve tickets hero, and under the Pay key in `ReserveTicketCheckout`, where the transaction happens, so the quick path from the drawing flow shows it too. Mock at 390px: `/tmp/feedback-plan/shop/mock/credit.png` (A black on the checkout card, B Sui Blue on the checkout card, C Sui Blue on the hero's Liner Lift); at 16px both colors read as a quiet credit and the wordmark stays legible.
- **Subtle branding beyond the logo:** none needed. The credit is the branding. Tinting the checkout blue or adding Sui's gradient would compete with Grape (reserve tickets) and Seal Yellow (daily tickets), and bring in the "DeFi" look Sui's own rebrand steers away from (https://the-brandidentity.com/project/holographik-steers-suis-brand-clear-of-the-defi-casino-aesthetic).
- **The done state** keeps "3 reserve tickets added" without "Paid on Sui": under the mock no transaction happened, so it shouldn't claim one. When payments become real, the done line becomes "Paid ¥270 on Sui" with the digest linked on Suiscan through `identity/explorers.ts` (which today has only the account URL; add a transaction URL then).
- **The JPY stablecoin later, without a redesign:** the UI already shows yen only, so nothing on screen changes. Keep new Shop code free of MIST and quotes: the hero's price anchor reads `priceYen` from the pack list, and `SuiCredit` doesn't care what coin moves. When the stablecoin lands, only `useTicketQuote` (becomes a plain pack list with no expiry refetch), `useSuiBalance` / `yenForMist` (become a yen balance), `payments/sui.ts` and the purchase request's `paidMist` change. No further seam work now.
- Files: `apps/frontend/src/shop/SuiCredit.tsx` (+ the SVG under `src/shop/`, with a comment saying it's Sui's file, unmodified), `ReserveTicketsHero.tsx`, `tickets/ReserveTicketCheckout.tsx`; i18n: the credit's words in the `shop` section. Japanese puts the logo first (「[logo] で決済」), so the message needs the logo as a slot in the translation rather than English word order with the logo appended (i18next `Trans` or a two-part message); DESIGN.md: a line in the Shop section for the credit and its color rule; PRODUCT.md line 106 ("Sponsors (backend only; never surfaced in consumer copy): … Sui/Walrus …") contradicts a visible Sui credit and needs a dated line for this decision, like the 2026-09-26 stat board one in Brand Commitments.

**Impeccable:** part of the Shop build; `/impeccable clarify` for the credit's wording in both languages; `/impeccable polish` for its size, clear space and baseline alignment against the fine print.

**Size:** S (under an hour once the Shop structure exists; about an hour on today's TicketShop alone).

**Decisions for ad0ll:**

1. _Color:_ black everywhere (recommended: quiet, passes contrast on every paper, adds no color) or Sui Blue on the hero's foot and black in the checkout (more recognizable for the demo, at the cost of two treatments). See `mock/credit.png`.
2. _Full logo or droplet only:_ full logo recommended, per Sui's own rule for audiences who don't know the brand, which is most LINE users here.
3. _Whether to ask the Sui Foundation_ (the kit's Contact Us) about a minimum size and about showing the logo as a payment credit. Recommended only if the app outlives the hackathon.

**Overlaps:** icons lane (if it redraws the stat board's pins, note that the pin restyles the Sui mark with an outline and a fill color, which the kit's "Do not alter the logo" covers; the Shop should use the file unmodified); tickets-model lane (the checkout's key and art); Favio's yen work (the stablecoin change will touch the same hooks).

---

## 3. No rules copy in the Shop; "never expire" moves into buying

**Item:** "Get rid of the copy about daily tickets are always used first and reserve tickets never expire. 'Reserve tickets never expire' is something you can show when you're buying reserve tickets, or when you drill down into buying them. It's not the ticket shop, it's just the shop."

**Now (verified):**

- "Daily tickets are always used first." is already gone from the app: Favio removed it in 2cbba77 ("Ticket shop: remove 'Daily tickets are always used first.'"); `rg -i "used first|spent first|always used"` over `apps/frontend/src` finds nothing. If ad0ll saw it, it was on an older deploy.
- "Reserve tickets never expire." is the Shop page's subtitle, right under "Ticket shop" (`TicketShop.tsx:223-228`; `s01-shop-tab-3d-0r.png`), and the same header opens the quick card (`s03`).
- "Ticket shop" is the page's title, the Pay error's way back ("Back to the shop", `TicketShop.tsx:213-215`), DESIGN.md's section name (line 505), PRODUCT.md line 152 and the AGENTS.MD term. The tab and LINE's page title already say "Shop" (`i18n/en/app.ts:8,16`).

**Cause:** The page and the checkout are one component with one header, so the checkout's note shows on the Shop page too. (verified)

**Fix:**

- The Shop page has no rules copy: title "Shop", then the hero (item 1). Nothing about daily tickets anywhere in the Shop.
- "Reserve tickets never expire." lives only in `ReserveTicketCheckout`, under its title "Reserve tickets": the moment you're choosing a pack, where it answers "what if I don't use them today?". Keep it bold Ink, one line, as now.
- "Ticket shop" goes from every screen: checkout title "Reserve tickets"; error key "Back to the packs" (it returns to choosing, not to a shop); DESIGN.md, PRODUCT.md and AGENTS.MD as in item 1's decision 2.
- The seal screen's `SealedCard`, the out-of-tickets card and the reserve ask say "Buy reserve tickets" (item 1).
- The tickets-model lane owns the same copy elsewhere (the reserve ask's "Today's daily tickets are used. You have 3 reserve tickets." in `StartDrawing.tsx:79-87` explains the order without stating the rule; leave it to that lane).
- Files: `tickets/TicketShop.tsx` (→ `ReserveTicketCheckout.tsx`), `app/ShopScreen.tsx` (→ `shop/`), the `tickets` and `shop` i18n sections, DESIGN.md lines 495-507, PRODUCT.md lines 147-154, AGENTS.MD lines 12-13.

**Impeccable:** `/impeccable clarify` (Shop, checkout, and the three buttons that open the checkout).

**Size:** S on its own; free inside item 1's build.

**Decisions for ad0ll:** none beyond item 1's vocabulary decision.

**Overlaps:** tickets-model lane (app-wide ticket copy inventory; the reserve count's wording); `i18n/tickets` (same strings).
