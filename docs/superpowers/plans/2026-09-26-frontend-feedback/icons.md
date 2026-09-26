# Icons lane: findings and fix plan

Code references are to the research checkout at main 42d698a (`.claude/worktrees/feedback-plan`), paths under `apps/frontend/src/` unless noted. Every finding is marked **verified** (checked in code, a render or a byte comparison) or **suspected**.

Evidence, all under `/tmp/feedback-plan/icons/`:

- `contact.png`: every candidate at its real size and weight, in context (the 390px tab strip styled from `app/TabBar.css`, the compact Seal Yellow Draw key from `styles/keys.css` with its ticket chip, gratitude figures on the receipt, a Transfer Trail row and a leaderboard row, the streak leaf), plus the picks at 360, 390 and 430px in English and Japanese.
- `crop-tabs.png` and `crop-draw.png`: the tab sets and the Draw key candidates at 3x.
- `stubs.png`: the Draw candidates printed on fresh ticket stubs at 12px (small) and 22px (large), placed the way tickets/TicketStubs.tsx places them.
- `now-explore-360.png`: the live app at 360px with Explore current, as it is today.
- `contact.mjs`: renders the sheet from the installed `@phosphor-icons/react` 2.1.10 and prints the byte-for-byte path checks quoted below.
- `/tmp/feedback-plan/probe.png` (shared): a fresh user's board today.

Every Phosphor name below was checked in `node_modules/@phosphor-icons/react/dist/defs/` (verified). `Frame`, `Telescope` and `Hearts` don't exist in 2.1.10.

---

## Item 1: "If we have invented any icons, we should pick them up from Phosphor instead and not use our own."

**Now**

At a glance (details below):

| What                            | Where                                                                                                 | Depicts                        | Source                                            | Verdict                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------- | ---------------------------------------- |
| DrawIcon                        | icons/DrawIcon.tsx, 7 call sites                                                                      | pencil mid-squiggle            | Material Symbols                                  | Replace: PencilSimpleLine, fill (item 2) |
| StickerBoardIcon                | icons/StickerBoardIcon.tsx, 13 call sites                                                             | a square with a tilted sticker | invented: two Phosphor paths composed with a mask | Replace: SmileySticker (item 2)          |
| Eyes, Storefront                | app/TabBar.tsx:133, :142, and three Storefront links                                                  | eyes, a shop front             | Phosphor                                          | Replace: Compass, Ticket (item 2)        |
| "♡"                             | gratitude/comboHud.ts:98, gratitude/GratitudeMiniGame.tsx:299, :311, giving/GiftReceivedNotice.tsx:85 | heart                          | a font glyph                                      | Replace: Heart, fill (item 3)            |
| `HAND_SWIPE_SVG`, `VIBRATE_SVG` | gratitude/heartArt.ts:288, :291                                                                       | swiping hand, vibrating phone  | Phosphor, byte for byte                           | Keep, and add a test                     |
| Chat menu tiles                 | deploy/line/returning-menu.html:109-133                                                               | draw, smiley sticker, eyes     | Material Symbols + Phosphor copies                | Replace draw and eyes (line-oa lane)     |
| 39 other Phosphor icons         | appendix                                                                                              |                                | Phosphor                                          | Keep                                     |
| favicon.svg                     | apps/frontend/public/favicon.svg                                                                      | Vite's logo                    | Vite                                              | Decision below                           |

- **No registry exists (verified).** DESIGN.md:276, :593 and :619 describe "one registry", but 34 files import straight from `@phosphor-icons/react`: 41 distinct icons, listed in the appendix. main.tsx imports it too, for `IconContext`. The only shared setting is `IconContext.Provider` with `weight: "bold"` (main.tsx:20, :50). DESIGN.md:593 also names the wrong source: it says icons are "copied byte for byte from @phosphor-icons/core 2.1.1", but the app renders `@phosphor-icons/react` 2.1.10 components.
- **Two hand-made icon components (verified):**
  - `icons/DrawIcon.tsx`: Material Symbols' `draw` (pencil mid-squiggle), not Phosphor. It's the icon ad0ll calls imaginary. Seven call sites: the board's Draw key (sticker-board/StickerBoard.tsx:561), Keep drawing (sticker-creation/sealing/SealedCard.tsx:104), tickets/OutOfTickets.tsx:92, tickets/StartDrawing.tsx:108 and :121, tickets/TicketShop.tsx:190, and printed on every fresh ticket stub (tickets/TicketStubs.tsx:88).
  - `icons/StickerBoardIcon.tsx`: an invented composition: Phosphor's square with Phosphor's sticker scaled to 64%, turned -12° and cut out by a mask. The two paths are Phosphor's byte for byte (verified: Square bold, Sticker bold and fill all match), but the combined glyph exists nowhere in Phosphor. It's on the My board tab for people with no LINE picture (app/TabBar.tsx:123; see probe.png) and on 12 "go to the board" actions: offers/OfferSheet.tsx:92, tickets/OutOfTickets.tsx:100 and :105, tickets/TicketsNotLoaded.tsx:54, sticker-board/StickerDetail.tsx:234, giving/GiftReceivedNotice.tsx:115, giving/Giving.tsx:188, receiving/ReceiveGiftDialog.tsx:162 and :403, sticker-creation/sealing/SealedCard.tsx:95 and :136, gratitude/GratitudeMiniGame.tsx:319.
- **Inlined copies of Phosphor (verified, all byte for byte):** gratitude/heartArt.ts:288 `HAND_SWIPE_SVG` is HandSwipeRight bold and :291 `VIBRATE_SVG` is Vibrate fill (the mini-game builds its DOM from strings). `deploy/line/returning-menu.html` inlines SmileySticker fill and Eyes fill, and the Material Symbols `draw` path from DrawIcon.
- **A text glyph standing in for an icon (verified):** "♡" marks gratitude amounts in the combo HUD (gratitude/comboHud.ts:98) and the game's receipt (gratitude/GratitudeMiniGame.tsx:299, :311), and ends the heading "received your sticker ♡" (giving/GiftReceivedNotice.tsx:85). It's an outline heart in whatever fallback font has U+2661 (suspected: Mona Sans lacks it), beside the filled Phosphor Heart used everywhere else (contact.png, "Now" row). craft-floor.md refuses exactly this: "Unicode glyphs or emoji standing in for an icon system."
- **The favicon is Vite's default logo (verified):** `apps/frontend/public/favicon.svg`, linked from index.html:5 (the purple lightning, #863bff). Not invented, but not the app's either. LINE's in-app browser doesn't show it; desktop tabs and some link previews do (suspected).
- **Mixed weights in one list (verified):** the offer sheet's three option icons are ChatCircleDots in fill, then ArrowsLeftRight and Heart in bold (offers/OfferSheet.tsx:30, :36, :42). DESIGN.md:593 says fill is only for an active or primary state.
- Not icons, and fine as they are: the "•••" rank gap (explore/ExploreScreen.css:291) is typography between leaderboard ranks; "×" in ticket counts and multipliers is the multiplication sign; the tab grabber's bar (app/TabBar.css:125) is a control, drawn like iOS's.

**Cause:** DESIGN.md's registry was never built, so nothing stops a one-off: each screen imports its own icons, and the two custom components were built on purpose under the old Draw Exception and the composed "Sticker board" entry (DESIGN.md:597, :601) (verified).

**Fix**

1. Build the registry: `icons/index.tsx`, the only module allowed to import `@phosphor-icons/react`.
   - Re-export the generic icons under Phosphor's own names (ArrowRight, CaretLeft, X, Copy…), plus the `Icon` and `IconProps` types.
   - Export the icons that carry a meaning under the app's vocabulary, with the weight fixed where it's part of the meaning: `DrawIcon` (PencilSimpleLine, fill), `StickerBoardIcon` (SmileySticker), `ExploreIcon` (Compass), `ShopIcon` (Ticket), `GratitudeIcon` (Heart, fill), `StreakIcon` (Fire, fill), and `GiveIcon` (Gift), `ViewIcon` (Eye), `OfferIcon` (Handshake), `RemoveIcon` (TrayArrowDown) for the pairs DESIGN.md:593 fixes. For example: `export const DrawIcon = (props: IconProps) => <PencilSimpleLine weight="fill" {...props} />;`
   - `DrawIcon` and `StickerBoardIcon` keep their names, so the 19 call sites above, TabBar aside, only change their import path.
2. Delete `icons/DrawIcon.tsx` and `icons/StickerBoardIcon.tsx`.
3. Move all 34 files to `../icons` imports: a mechanical change to import lines only.
4. Stop new direct imports with a lint rule in `.oxlintrc.json`: `"no-restricted-imports": ["error", { "paths": [{ "name": "@phosphor-icons/react", "message": "Import icons from src/icons (DESIGN.md, Icons)." }] }]`, with an override that turns it off for `apps/frontend/src/icons/**` and `main.tsx` (IconContext). oxlint 1.85 has the rule (verified: `no_restricted_imports` is in the installed binary).
5. Keep the mini-game's two SVG strings, since it builds its DOM without React. Add `icons/icons.test.ts`, which renders HandSwipeRight bold and Vibrate fill with `react-dom/server` and checks that the strings' paths match. It checks the chat menu's three tile paths against the registry the same way, so no inlined copy can drift. `contact.mjs` already does these checks and can be ported.
6. Replace the "♡" glyphs with `GratitudeIcon` (item 3).
7. The offer sheet's three option icons: all bold, with `GratitudeIcon weight="bold"` on "Offer gratitude". Registry icons with a fixed default weight still accept `weight`.
8. Favicon: see the decision below.

**Impeccable:** `extract` for the registry and the lint guard (a one-off implementation becomes a shared component); `polish` for the call-site sweep and the ♡ glyphs; `document` for the DESIGN.md edits listed under item 2.

**Size:** M (registry, 34 import lines, the lint rule and the test: about three hours).

**Decisions for ad0ll**

- The favicon: replace Vite's logo with the app's own mark, or leave it, since LIFF doesn't show it? Recommendation: replace it only once there's an app mark. It's a brand asset, not a Phosphor icon, and it doesn't belong in this change.

**Overlaps:** all nine i18n branches still open (i18n/giving, i18n/gratitude, i18n/tickets, i18n/sticker-board, i18n/explore, i18n/offers, i18n/receiving, i18n/sticker-creation, i18n/api) touch the same files. i18n/giving moves "{{name}} received your sticker ♡" into `i18n/en/giving.ts:87`, and i18n/gratitude reworks the game receipt's ♡ lines. Land the registry after they merge, or keep its diff to import lines. The line-oa lane owns the chat menu.

---

## Item 2: "Better icons for Explore, My board and Shop", and the Draw key "has an imaginary icon"

**Now (verified):** app/TabBar.tsx:119-143. My board shows the person's LINE picture as a 24px photo sticker (:121), or the composed StickerBoardIcon when there's none (:123). Explore uses Eyes (:133) and Shop uses Storefront (:142), bold at rest and fill when current. The Draw key uses Material Symbols' `draw` (StickerBoard.tsx:561). See probe.png and the "Today" strip in contact.png.

**Cause:** the Draw icon and the no-picture My board icon are the two hand-made components from item 1 (verified). Explore's Eyes collides with the View action's Eye (sticker-board/StickerToolbar.tsx:108, sticker-board/ArtistBoard.tsx:291), which breaks DESIGN.md:593's rule that the same action always gets the same icon (verified). In crop-tabs.png, Storefront reads at 20px as a striped box (suspected: a judgment from the render).

**Candidates** (contact.png, crop-tabs.png, crop-draw.png; tabs bold at rest and fill when current, 20px):

| Slot     | Pick                       | Other candidates                 | Why the pick                                                                                                                                                                                                                                                                                                                                       |
| -------- | -------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My board | **SmileySticker**          | Sticker, CardsThree              | A sticker with a face says "my stickers" rather than "a sticker". It's already the chat menu's My board tile (verified byte for byte), so the tab and the chat menu match with no new rich menu. Plain Sticker reads as a sticky note; CardsThree reads as an inbox.                                                                               |
| Explore  | **Compass**                | Binoculars, Planet               | The standard sign for explore, clean at 20px, and it clashes with no action icon. Binoculars is the livelier choice and reads just as well; Planet reads as "space".                                                                                                                                                                               |
| Shop     | **Ticket**                 | Tag, ShoppingBagOpen             | Tickets are all the Shop sells (PRODUCT.md:154). The ticket shop's own keys already use Phosphor's Ticket (tickets/TicketShop.tsx:197, :213, :281), and its outline matches the ticket marks on the Draw key right above the tabs. At 20px, ShoppingBagOpen reads as an inbox tray.                                                                |
| Draw key | **PencilSimpleLine, fill** | Scribble (bold), PaintBrushBroad | A pencil drawing a line is the most recognizable "draw", and its fill weight works in all three places Draw appears: the key, the 12px print on ticket stubs, and the chat menu's fill tile. Scribble's fill weight is a knocked-out square tile, so it only works in bold. PaintBrushBroad reads as "paint", next to the brush tool's PaintBrush. |

- **Weights:** tabs stay bold at rest and fill when current (verified: that's today's code; DESIGN.md:459 says current is shown by fill and lift only). The Draw key and every other Draw action use PencilSimpleLine fill at 20px, as today's DrawIcon defaults to fill. Links to the Shop move with the tab: `Storefront` at tickets/OutOfTickets.tsx:109, tickets/StartDrawing.tsx:114 and sticker-creation/sealing/SealedCard.tsx:132 become `ShopIcon`, since the same destination gets the same icon.
- **"Every Phosphor pencil says edit":** DESIGN.md:601's reason for the exception doesn't hold in this app. Stickers are sealed and can't be edited, and nothing imports a pencil icon (verified by grep), so a pencil has nothing to be confused with.
- **The picks fit every target width in both languages** (verified in contact.png's last rows: 360, 390 and 430px, English and Japanese). The layout can't shift, because every tab icon is 20px before and after. Measured on the live app at 360px, the tabs are 122, 108 and 90px wide and nothing overflows (verified, `now-explore-360.png`).
- **Do ad0ll's asks override DESIGN.md's tab rules? Yes.**
  - "Pick them up from Phosphor … not use our own" retires the Draw Exception (DESIGN.md:601) and the composed Sticker board entry (:597).
  - "Better icons for Explore, My board" replaces Eyes (:596, :459) and, for everyone without a LINE picture, the composed icon.
  - Whether the LINE photo stays on the tab is the decision below.

**Fix**

1. In the registry (item 1), point `StickerBoardIcon` to SmileySticker, `ExploreIcon` to Compass, `ShopIcon` to Ticket and `DrawIcon` to PencilSimpleLine (fill).
2. In app/TabBar.tsx:119-143, use `StickerBoardIcon` / `ExploreIcon` / `ShopIcon`, each `size={20}` and `weight={active === tab ? "fill" : "bold"}`. The photo branch at :120-124 goes, or stays, per the decision below. `PhotoSticker` stays in use elsewhere.
3. Swap the three Storefront links listed above.
4. Ticket stubs need no code change: TicketStubs.tsx:88 prints whatever `DrawIcon` is. PencilSimpleLine fill reads at the small stubs' 12px and the large stubs' 22px (verified, `stubs.png`).
5. Chat menu (line-oa lane): the Draw tile takes PencilSimpleLine fill in place of the Material path, and the Explore tile Compass fill in place of Eyes (deploy/line/returning-menu.html:109-133). Re-render both `returning-menu.png` and `returning-menu.ja.png`. LINE can't replace a rich menu's image, so this means new menus (deploy/line/create-returning-menu.sh) for each language.
6. DESIGN.md edits (`document`):
   - :276: drop the Material Symbols exception: "Icons come from Phosphor through one registry (`src/icons`). They're never drawn by hand."
   - :459: the index tabs are three, not two (My board pink, Explore aqua, Shop grape). Replace the icon sentence: "My board is Phosphor's smiley-sticker, Explore compass and Shop ticket, bold at rest and fill when current" (or keep the photo, per the decision).
   - :593: the registry is `apps/frontend/src/icons`, rendering `@phosphor-icons/react` 2.1.10. Drop "plus one Material Symbols glyph". Add Gratitude is heart and Draw is pencil-simple-line to the same-action list.
   - :595-597: rewrite My board (smiley-sticker on the tab and the chat menu tile), Explore (compass), and replace the composed "Sticker board" entry with "Go to sticker board uses smiley-sticker, the My board icon". Add Shop (ticket), Gratitude (heart, fill) and Streak (fire, fill).
   - :601: delete the Draw Exception, and replace it with "Draw is Phosphor's pencil-simple-line (fill) on every Draw action: the board's Draw key, Keep drawing, the ticket stubs' print and the chat menu's Draw tile. The brush tool keeps paint-brush."
   - :619: "Phosphor bold at rest, fill for an active state, regular inside the LINE and iOS mocks." Drop the Material Symbols clause.

**Impeccable:** `polish` owns the swap (a design-system drift fix, not a redesign); `document` owns DESIGN.md; the line-oa lane re-renders the chat menu.

**Size:** S for the app once the registry exists (about an hour, plus checking the tab strip and ticket stubs on a phone). The chat menu's new rich menus are the line-oa lane's.

**Decisions for ad0ll**

- **The My board tab: your LINE picture, or one icon for everyone?** Recommendation: SmileySticker for everyone. The three tabs then read as one set, they match the chat menu tile, and your picture already sits 42px large in the board header directly above. Keeping the picture is Instagram's profile-tab pattern and just as defensible. If you keep it, SmileySticker still replaces the composed icon as the fallback.
- **Shop: Ticket or Tag?** Recommendation: Ticket while tickets are the only item. Switch to Tag (a price tag, "a shop") when the Shop sells anything else. With the registry, that's a one-line change.
- **Explore: Compass or Binoculars?** Recommendation: Compass for clarity. Binoculars if you want the livelier one; both read at 20px.

**Overlaps:**

- tickets-model lane: the Draw key's layout at StickerBoard.tsx:559-574; the icon is one prop there.
- shop lane: the Shop icon and the three Shop links.
- line-oa lane: the chat menu's Draw and Explore tiles must use these picks, in fill.

---

## Item 3: "We need an icon for gratitude … it could just be the heart", and the streak's icon

**Now (verified)**

- **Gratitude**
  - Phosphor's Heart (fill) already marks gratitude in most places: the Send gratitude key (receiving/SendGratitudeSheet.tsx:56, sticker-board/StickerDetail.tsx:354), the Transfer Trail figure (sticker-board/TransferTrail.tsx:72 at 13px, :87 at 20px) and the mini-game's photo dot (gratitude/GratitudeMiniGame.tsx:251, :290). OfferSheet's "Offer gratitude" uses Heart in bold (offers/OfferSheet.tsx:42).
  - Three places show gratitude figures with no icon:
    - the stat board receipt: rows and TOTAL at sticker-board/stat-board/StatCork.tsx:184-212 carry per-kind colored dots (stat-board.css:296), which are a legend of kinds, not a gratitude mark;
    - "Most gratitude in a day" on the Bests scrap (StatCork.tsx:241);
    - the "Most gratitude" leaderboard figures (explore/ExploreScreen.tsx:122-132).
  - The combo HUD and the game receipt use the "♡" glyph (item 1).
- **Streak:** no icon anywhere: the calendar leaf's band (StatCork.tsx:264-288), "Longest streak" on the Bests scrap (:223) and the "Longest streak" leaderboard (ExploreScreen.tsx:124-130).

**Cause:** gratitude and streak figures were designed as plain paper and type on the cork back (DESIGN.md:471-472). The HUD's ♡ predates the Heart icon's adoption elsewhere (suspected).

**Candidates** (contact.png, "Gratitude figures" and "Streak" rows):

| Slot      | Pick            | Other candidates         | Why the pick                                                                                                                                                                                                                             |
| --------- | --------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gratitude | **Heart, fill** | HeartStraight, HandHeart | Already gratitude's icon on the Send gratitude key and the Transfer Trail, and the same shape as the mini-game's heart. HeartStraight would be a second heart; HandHeart is the Accept key's icon (receiving/ReceiveGiftDialog.tsx:337). |
| Streak    | **Fire, fill**  | Flame, Lightning         | Fire is the sign people already read as a daily streak, and its inner flame keeps it legible at 14px. Flame is nearly the same with less detail. Lightning reads as combo energy (Best combo, hits).                                     |

- **Weights:** both are figure marks, not controls, so they use fill at every size: 13–14px beside small figures, 16px on leaderboard rows, 20–22px beside Figure-type totals. Color belongs to the stat-board lane. In the render, Heart in Bonbon Pink (gratitude's hue, DESIGN.md:289) reads on Liner Lift at about 2.9:1 (computed). That's fine for a mark beside a number, since the number and its label carry the meaning. Use Ink where the heart sits on a pink field. DESIGN.md keeps deep partners for lips, so they're not a fix here.

**Fix**

1. `GratitudeIcon` and `StreakIcon` go in the registry (item 1).
2. Replace the ♡ at comboHud.ts:98 (the HUD builds DOM from strings: add a `HEART_SVG` string beside `HAND_SWIPE_SVG` in heartArt.ts, byte for byte and covered by the same test), and at GratitudeMiniGame.tsx:299 and :311 with `<GratitudeIcon aria-hidden />`. For the "received your sticker ♡" heading, drop the glyph from the string (i18n/giving moves it to `i18n/en/giving.ts:87`) and render the icon after the heading.
3. Placement on the stat board and Explore is the stat-board lane's layout call. Suggested homes:
   - the receipt's "Gratitude received" heading (14px);
   - beside the TOTAL figure (22px);
   - "Most gratitude in a day" (14px);
   - the leaf band's "Streak" (14px, beside the word) and "Longest streak" (14px);
   - leaderboard figures for Most gratitude and Longest streak (16px), with no icon on Best combo, which keeps "×".
4. DESIGN.md :593 and :595-597 (see item 2) gain "Gratitude is heart (fill)" and "Streak is fire (fill)". :472 notes the band's fire mark once the stat-board lane settles its look.

**Impeccable:** `polish` for the swap and the ♡ removal. `colorize` in the stat-board lane for the streak's own color and where the marks sit.

**Size:** S (under an hour for the icon itself, beyond the stat-board lane's layout).

**Decisions for ad0ll:** none. Heart is what you suggested, and Fire is the sign people already read as a streak.

**Overlaps:**

- stat-board lane: the streak's color and styling, where the marks sit on the receipt and leaf, and the address papers already on the cork.
- i18n/gratitude and i18n/giving: the ♡ lines.
- The Explore lane, if there is one: leaderboard rows.

---

## Where icons end and illustrations begin

**The line:** an icon is a symbol standing for an action, a place or a quantity, drawn in one stroke family at 11–30px, and it can come from Phosphor. An illustration depicts a material of the world: paper, tape, tickets, the bag, the zipper, stickers, the heart you tap. It's drawn for its scene, at its own size, lit by the world's top-left light, and it's never a Phosphor icon. The Never Hand-Drawn Rule covers icons only (DESIGN.md:593 already exempts illustrations).

Illustrations in the app today, all keep (verified locations):

- **Tickets:** the ticket mark (tickets/TicketCount.tsx:18, shape from tickets/ticketShape.ts) and the paper stubs (tickets/TicketStubs.tsx:69). The stubs print the Draw icon, which is an icon printed on a material.
- **Gift bag:** the seal loop and ribs (giving/GiftBag.tsx:229, :235), the gift tag (:263), and the zigzag and noise masks (giving/GiftBag.css:58, :206-236, :561).
- **Zipper:** sticker-board/tray/zipper.ts and zipper.css.
- **Hearts and the mini-game's art** (gratitude/heartArt.ts):
  - the big heart's layers (:200-257), the mini heart (:262) and the stamp heart (:267);
  - glint (:271), puff (:273), sweat bead (:275), soul (:277), haze wave (:285) and dent (:294);
  - speed lines (:297) and focus lines (:312).
  - `HAND_SWIPE_SVG` and `VIBRATE_SVG` in the same file are icons (Phosphor copies), not illustrations.
- **The cork back:**
  - push pins (stat-board.css:184), the receipt's tear (:212), the leaf's torn top (:346) and the stamps' perforation (:453);
  - washi tape;
  - the chain pins (ChainPin.tsx, brand marks as pin heads: see below).
- **Stickers:** figures, silhouettes and foil, drawn from each sticker's own image (stickers/sticker-figure.css, stickers/live-resin.css, stickers/sticker-foil.css, sticker-board/GivenStickerSilhouette.tsx, giving/Giving.css:44, giving/gift-received-notice.css:72).
- **Paper:** the liner's grain and maker print (styles/tokens.css:124-125).
- **Data, not an icon:** QR codes (ui/QrCode.tsx:26, from `@paulmillr/qr`) on the address papers.

## Brand marks

Brand marks come from the brand's own assets, pasted verbatim, and sit outside the registry and Phosphor. Phosphor 2.1.10 couldn't supply them anyway: it has no LINE, Sui or Ethereum logo (verified against its list of `*Logo` icons).

- **Sui and Ethereum (verified):** Simple Icons (CC0) paths in sticker-board/stat-board/ChainPin.tsx:4-9, as the push-pin heads holding each chain's address paper on the cork. The shop lane will likely want Sui's mark on the Pay key. It should come from the same place. Suggestion: move the two paths into `icons/brands.ts`, next to the registry, with their license line, so there's one copy.
- **LINE (verified):** DESIGN.md:593 names LINE's logo from Simple Icons, but no LINE logo, and no use of LINE's green, exists in `apps/frontend/src` today. If one is added, take it from LINE's official brand guidelines or Simple Icons.
- **Vite (verified):** the favicon; see item 1.

---

## Appendix: every Phosphor icon in use (verified; weight is bold unless noted, via IconContext at main.tsx:20)

- ArrowBendLeftUp 28px: sticker-creation/TimerDot.tsx:134
- ArrowClockwise: sticker-board/PlacedSticker.tsx:137 (16px), sticker-creation/tools/HistoryButtons.tsx:31 (22px)
- ArrowCounterClockwise 22px: HistoryButtons.tsx:22
- ArrowRight: GivenStickerSilhouette.tsx:71 (12px), giving/GiftBag.tsx:207 (11px), GiftReceivedNotice.tsx:97 (12px)
- ArrowSquareOut: stat-board/AddressDialog.tsx:400, giving/CantFindThem.tsx:53 (20px), receiving/ReceiveGiftDialog.tsx:161
- ArrowUUpLeft: stat-board/StatCork.tsx:312, giving/Giving.tsx:236
- ArrowsLeftRight 18px: offers/OfferSheet.tsx:36
- At 20px: explore/ExploreScreen.tsx:357, api/HandlePrompt.tsx:61
- CaretDown 14px: TransferTrail.tsx:123
- CaretLeft: ArtistBoard.tsx:276 (14px), StickerDetail.tsx:288 (20px), CantFindThem.tsx:36 (20px)
- CaretRight: StickerDetail.tsx:305 (20px), TransferTrail.tsx:76 (14px), CantFindThem.tsx:59 (20px), Giving.tsx:161 (20px)
- CaretUp: app/TabBar.tsx:171 (the grabber's pull tab)
- ChatCircleDots 18px, fill: OfferSheet.tsx:30
- Check 12px: giving/StickerPicker.tsx:36
- CheckFat, fill: sticker-creation/SealKey.tsx:36
- Circle 26px, fill: tools/ToolStrip.tsx:80
- Clock: receiving/SendGratitudeSheet.tsx:60
- Copy: AddressDialog.tsx:386, PerformanceRecorderControls.tsx:126
- Eraser, PaintBrush, PaintBucket: ToolStrip.tsx:16-18 (22px; fill when current, :68)
- Eye: ArtistBoard.tsx:291, StickerToolbar.tsx:108 (18px)
- Eyes 20px, bold or fill: TabBar.tsx:133
- Gift: ArtistBoard.tsx:319, StickerToolbar.tsx:104 (18px), StickerDetail.tsx:362 (18px) and :372, giving/GiveSheet.tsx:97 (22px)
- HandHeart: ReceiveGiftDialog.tsx:337 (the Accept key)
- HandPointing 44px, fill: GiftBag.tsx:147
- Handshake: ArtistBoard.tsx:302
- Heart: OfferSheet.tsx:42 (18px); fill at StickerDetail.tsx:354, TransferTrail.tsx:72 (13px) and :87 (20px), SendGratitudeSheet.tsx:56, GratitudeMiniGame.tsx:251 and :290; GratitudeDemoControls.tsx:31 (developer slip)
- PaperPlaneTilt: OfferSheet.tsx:184 (22px), Giving.tsx:155 (20px) and :228 (fill), line/SendTestMessage.tsx:40
- Pause, fill: TimerDot.tsx:126
- Play 16px: TransferTrail.tsx:106
- Question: Giving.tsx:164
- SignOut: stat-board/StatBoard.tsx:78
- Sticker 16px (imported as StickerGlyph): Giving.tsx:167
- Storefront: TabBar.tsx:142 (20px, bold or fill), OutOfTickets.tsx:109, StartDrawing.tsx:114, SealedCard.tsx:132
- Ticket: TicketShop.tsx:197, :213, :281
- TrayArrowDown 18px: StickerToolbar.tsx:111
- Vibrate: app/MotionPermissionCard.tsx:29
- WaveSine 22px: ToolStrip.tsx:91 (fill when its panel is open)
- Wind: GratitudeMiniGame.tsx:275
- X: OfferSheet.tsx:106, AddressDialog.tsx:351, GiveSheet.tsx:64, Giving.tsx:144, ExploreScreen.tsx:375 (16px), ReceiveGiftDialog.tsx:346, GratitudeMiniGame.tsx:264
