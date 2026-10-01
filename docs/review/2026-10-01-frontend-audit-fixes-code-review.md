# Frontend audit fixes code review

2026-10-01. The code review of the fixes for [the frontend audit](../reviews/2026-09-30-frontend-audit.md), which the `ux/*` lanes made and merged to main. It looks for bugs the fixes introduced, and for cases a fix meant to cover but missed. The code review fix lanes' own commits are in [the fixes review](2026-10-01-frontend-fixes-code-review.md), not here.

## Scope

| Reviewer | Area                                                                                                                                                           | Commits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RA       | Tickets, the Shop, payments and the drawing screen                                                                                                             | 17365fc7 22746ada 2dafecd5 423a4ff7 70c9f502 76c41b83 9b844f46 a0762d11 adb48d9e adc1a0e4 b046c1f2 b5663866 befc66cc c5adfaa4 edadf91a f3c33434 fd61191c                                                                                                                                                                                                                                                                                                                                              |
| RB       | Gratitude and its outbox, giving and receiving, the sticker detail and stat board, the error line                                                              | 0a626874 16943c4f 18057b84 2449384d 329ed327 36b7e4fb 38fc3d89 3bccb6fe 3c3812d6 4e7d66fd 57b9768c 59548ead 65de32c9 6e5ba406 6f424d7a 854d3df1 8ca518b6 909c7931 94478cd1 96eda34d 9e3229ed a4fb15d3 a9ecb3cc bd460ac2 c6771b31 ce6d1373 da9acc09 ebee8cc3 f335c625 f9e35bae fec7a8c7                                                                                                                                                                                                                |
| RC       | The sticker board and someone else's, the sticker tray, Explore, sign-in, the app shell, the catalog and its import, the giving screens' waits, one API change | 00dc9e98 051ce11a 06bcf664 09856345 09bdd408 0d16ef74 2eaaa7da 38dac9b0 3a8e5711 3d35dd1b 4023a3d4 407c89eb 5287ca2c 556edeb5 57bc862a 5a4806f7 64a7ceec 67faa43c 7a63cb59 7ce2898c 7f4bc71a 7f7dbd0f 809ab3e1 81b20bed 8ac074db 8ec23578 914fc4ec 9ab6ee54 a0a548e4 a28d7abc a4bbe266 ac3c3634 adf96e99 aea30c68 b1439dee b2bace7b b83dce03 c2589183 c29dfe15 c692511e c7f7ac5f cd0b2f1e cd26ea95 d5e54327 d65c6383 d9c2aa78 e6c74edd ea7696f9 eabaad30 efb3364a f2095738 f3412230 f695d9d3 fd8de386 |

Two more came from outside the reviews: F-1 from the lane that built the first selection's hint, and F-2 from a pass in Playwright's WebKit at 375×591.

## How

Each reviewer read its commits whole and the code around each change on main: callers, callees and the tests the commit added. It asked what input, timing, platform (iOS WebKit inside LINE, a 375×591 phone) or earlier state makes the change wrong, whether a new state has a way out, and whether a new test fails without its fix. Each finding was traced through the code, run in a scratch test, or measured in a browser before it was written down.

Severity is the review's: _high_ is lost data, money, a ticket, a gift or Gratitude, or the app unusable until a reload; _medium_ a wrong result or a stuck screen with a way out; _low_ cosmetic, or rare with little harm. No finding is high. Nothing traced can duplicate Gratitude: the server keeps one per gift, and the outbox refuses to resend a combo already on its way.

## Fixed

| Findings     | Commits                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| RA-1         | 527ae37f                                                                                        |
| RA-2         | e149846e                                                                                        |
| RA-3         | fe4e0fda                                                                                        |
| RC-8         | ddddfe67                                                                                        |
| RC-10, RB-14 | c26ad511                                                                                        |
| F-1          | 9e810428                                                                                        |
| F-2          | 4295ae66                                                                                        |
| RC-2         | 41ae7a2f                                                                                        |
| RC-9         | 68e63d0c                                                                                        |
| RC-3         | 25989330 (holds down to boards about 476px tall)                                                |
| RC-4         | 2de098a5                                                                                        |
| RB-2         | 66c51871                                                                                        |
| RC-5         | 7b05b159                                                                                        |
| RB-4         | e6cd7c65                                                                                        |
| RB-9         | 4136f877                                                                                        |
| RB-8         | 81f117c3                                                                                        |
| RB-10        | f01cd870                                                                                        |
| RC-1         | 6fcd5c16                                                                                        |
| RC-7         | 8499fef2 (a Remove before the tray's code has loaded still saves the spot from before the step) |
| RB-11        | 65af9658                                                                                        |
| RB-12        | f0cfef27                                                                                        |

## Findings

### RA: Tickets, the Shop, payments and the drawing screen

**RA-1** · low · `src/tickets/ReserveTicketCheckout.tsx:645` (2dafecd5)
Tapping Pay moved focus to the picked pack while the payment waited, though the fix promised focus kept on Pay; its test never checked where focus was.

- Fix: the paying step keeps the packs' view, so the focus trap doesn't move focus.

**RA-2** · low · `src/sticker-creation/session/keptSession.ts:225` (a0762d11)
After a reload whose read of the kept drawing was slow, moving the size rail or Smoothing before the first stroke rewrote the kept record with no time drawn and no 18+ mark, so a second reload brought the drawing back with a full 3:00 and unmarked.

- Fix: what a carried session keeps stays untouched until the new sheet is drawn on.

**RA-3** · low · `src/sticker-creation/SealKey.tsx:36` (76c41b83)
The armed 18+ chip ("Tap again to seal as 18+") didn't wrap like the other chips, and reached over the Redo tile for the 2.5 s it shows.

- Fix: every chip but the plain prompt wraps short of the undo and redo tiles.

### RB: Gratitude, giving and receiving, the sticker detail and stat board, the error line

**RB-1** · medium · `src/gratitude/gratitudeOutbox.ts:202` (57b9768c)
When the phone can't store a combo and the send also fails, the receipt says "Saved on this phone" while nothing holds it: the combo's Gratitude is gone, and nobody says so.

- Fix: the send says it wasn't saved, and the receipt says it can be played again.

**RB-2** · medium · `src/giving/giveFlow.ts:368` (18057b84)
Take it out during the slow wait takes back a gift whose Gift Message already went out, when an earlier send of the same sticker is marked sent or maybe sent on the phone: the packing's GiftMessageOutError is ignored once the giver has pressed Take it out, and the gift's link then opens as taken back.

- Fix: Take it out waits for the packing's answer first, and a gift whose message went out goes to its sent screen instead.

**RB-3** · low · `src/gratitude/gratitude-mini-game.css:488` (57b9768c)
On a 375px phone the HUD's row of amount, hit counter and multiplier runs past the HUD's edge from an amount of 1,000, and off the screen at five digits.

**RB-4** · low · `src/sticker-board/stat-board/stat-board.css:438` (3bccb6fe)
Three-digit counts on the cork back's stamps run over the stamp's printed frame (in WebKit, "900" is 60px against a 53px face).

**RB-5** · low · `src/sticker-board/StickerDetail.tsx:129` (6e5ba406, 909c7931)
While the detail's first read is loading or has failed, it doesn't hear the outbox, so a combo recorded in that window can leave Send gratitude showing for a gift that has its Gratitude. A second combo is refused by the server.

**RB-6** · low · `src/gratitude/gratitudeOutbox.ts:138`
A combo refused during a resend in the background is forgotten with only a console line: the person is never told their Gratitude was dropped.

**RB-7** · low · `src/giving/gift-message-hero.jpg`, `gift-message-hero-nsfw.jpg` (fec7a8c7, bd460ac2)
The Gift Message's artwork still prints SEALED on the bag's tape, where the app now says CLOSED. It needs the artwork redrawn.

**RB-8** · low · `src/ui/CopyableFinePrint.tsx:21` (0a626874, f335c625)
When the clipboard refuses, the error line's Copy says nothing, and the details are clipped to three lines, so they can't be selected whole either. In the address dialog that Copy also gets the Seal Yellow focus ring on Tomato Soft, at about 1.1:1.

**RB-9** · low · `src/sticker-board/stat-board/StatCork.tsx:218` (0a626874)
Try again on the cork back's failed receipt drops keyboard focus to the page, and Escape with it.

**RB-10** · low · `src/tickets/TicketPurchases.tsx:162` (0a626874)
Try again on the purchases list looks live while a read is already running, and does nothing.

**RB-11** · low · `src/sticker-board/StickerBoard.tsx:305` (38fc3d89)
After a language restart, which opens on the cork back, the artist chips' greeting plays hidden behind the cork and is spent.

**RB-12** · low · `src/sticker-board/StickerBoard.tsx:897` (0a626874)
Two tray problems in the board's alert can share a React key, now that every unknown failure reads the same.

**RB-13** · low · unverified · `deploy/deploy.sh:48` (bd460ac2)
Gift Messages sent before bd460ac2 went live point at the old artwork's file names, which the deploy deletes, so their image is gone; the text and "Open your gift" still work. Whether LINE keeps its own copy of the image wasn't checked. It happened once.

**RB-14** · low
Leftovers: a test still said the bag seals, `stickerBoard.tryAgain` had no caller, and 41 comments named `errorReason`, which `problemOf` replaced.

### RC: The sticker board, the tray, Explore, sign-in, the shell, the catalog and one API change

**RC-1** · medium · `src/sticker-board/StickerBoard.tsx:320` (8ec23578)
Once the artist chips have greeted an app open, a received sticker landing on the board no longer names its artist.

**RC-2** · low · `src/sticker-board/tray/traySpread.ts:132` (051ce11a)
In WebKit, closing the spread by tapping a sheet leaves focus on the page, since WebKit blurs the sheet before the tap lands.

**RC-3** · low · `src/sticker-board/tray/trayEngine.ts:66` (d65c6383)
On a board about 501px tall or less, the open stack can't shrink enough and the +N pill is cut in half.

**RC-4** · low · `apps/api/src/gifts/receiving.ts:352` (eabaad30)
Accept answers 503 `claim_failed`, saying a retry is safe, even when the giver's take-out has landed on chain and the server hasn't recorded it yet, so every Accept fails the same way.

**RC-5** · low · `src/giving/GiveSheet.tsx:49` (aea30c68)
After giving from someone else's board, sent or cancelled, focus lands on the page instead of the Give key.

**RC-6** · low · `src/ui/useModalDialog.ts:18` (aea30c68, cd0b2f1e)
Closing a sheet puts back the `inert` it found when it opened, over any change React made meanwhile: the drawing screen's tab strip, tucked away while a sheet was open, comes back reachable by keyboard though it's off screen.

**RC-7** · low · `src/sticker-board/useBoardGestures.ts:255` (8ec23578)
Remove within 400ms of an arrow or Arrange step peels the sticker from where it was before the step, so it jumps back before it rides to the tray. Its saved place is right.

**RC-8** · low · `scripts/translatorSheet.ts:50` (e5a28697)
The catalog's import took `<wbr />` and `<wbr class="x"/>` as break hints, which the app would show as text.

**RC-9** · low · `src/sticker-board/tray/traySheets.ts:176` (ea7696f9, a4bbe266)
With no stickers, the front sheet reads "Sheet 1, , in front" and is described by a line about stickers it doesn't have.

**RC-10** · low
Copy the string commits missed: the time's-up seal refusal said "The server", `chain_unavailable`'s comment left out packing and the expiry read, and two keys had no caller. The "on-chain" in `mint_failed`, `not_minted` and `notOnChain` stays, as PRODUCT.md allows.

### Found outside the reviews

**F-1** · medium · `src/sticker-board/placement.ts` (toolbarSpot)
With no room above or below, the selected sticker's toolbar centered over the sticker, so the second tap that opens it hit the toolbar instead. Older than the audit; the Arrange row made the toolbar taller and the case commoner.

**F-2** · low · `src/i18n/i18n.ts` (e5a28697)
In WebKit a line kept to its phrase breaks could end on an opening bracket, as in the sign-in screen's unknown-error line.

## Not checked

- iOS WebKit inside LINE on a phone, and VoiceOver. The WebKit pass ran Playwright's build headless.
- Real Sui and Privy error text, and timing with real network latency.
- SessionGate's sign-in again (ac3c3634): a request already out when the session was lost can answer 401 after the new sign-in and land the app on the failure screen, and a placement save answered 401 is dropped with the unmount, so the server's board wins. Timing-dependent; not reproduced.
- From before these commits: the outbox treats any 400 or 403 as final, so one from a proxy in front of the API would drop a combo for good.
