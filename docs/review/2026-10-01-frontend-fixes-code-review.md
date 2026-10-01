# Frontend fixes code review

2026-10-01. The code review of the fixes for [the frontend code review](2026-09-29-frontend-code-review.md), which the lanes in [the fix plan](../superpowers/plans/2026-09-29-frontend-review-fixes.md) made and merged to main. It looks for bugs the fixes introduced, and for cases a fix meant to cover but missed. Findings are added here as each reviewer reports.

## Scope

| Reviewer | Area                                                                                                                                                                                  | Commits                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1       | Tickets and payments: JPYC payment signing and kept digests, unadded purchases, the tickets provider, the API's purchase route; the ticket card shell; the drawing screen's spend key | e8d4c16f faee4912 c9e1bff2 162ed331 80c4a5fc; e3eb1dea eb482607; 224915c0's spend key changes                                                                                                                                                                                                        |
| R2       | Sealing and drawing: the locked retry phase, the drawing kept per person, the ink engine, the seal ceremony, dates in Tokyo's day                                                     | 224915c0 d7b06404 ed946d89; cc80b134 f2bd32b6; 39932965 40be7f6e 6e09c0ed; 99374f9f e6de165d 87476767 e0b292dc                                                                                                                                                                                       |
| R3       | Giving, receiving and Gratitude                                                                                                                                                       | b4604cc4 35dbf1a2; c9ad9db7 9c8410e7 a320b9ef; f9c9fb92 4274f47b c2a9d19f cc274d5a; 267c3976 16c02f44 1941761d 128cc97e 139b921c                                                                                                                                                                     |
| R4       | App shell, shared controls, sticker board, sticker tray, device storage and query cache, shared helpers                                                                               | c9cb450a 4f43c8bc e1cd7e40 db282201 9d3e41e2 e58a0e27 7ccdcb53 cf5c0fef; 5e9734a6 cedd346e f6700496 5ac915c5 efd5f362; 9e4da649 4474c573 2adf342e 6e141a9a cc30d487 77c3dc97 63982791 0e51c734 44cce135; 8b3ae5cc efae28f7; 4993e41f 5931c72f e522109c f872794c; 6b690fd5 ac575dba 27ea19f3 66580d31 |

Splitting trayEngine.ts (CLEAN-19), which runs alongside this review, is out of its scope.

## How

Each reviewer reads its commits whole and the code around each change on main: callers, callees and the tests the commit added. It asks what input, timing, platform or earlier state makes the change wrong, whether a new state has a way out, and whether a new test fails without its fix. Each finding is traced through the code, or run in a scratch test, before it's written down. A finding that needs a phone to confirm says how.

Severity is the review's: _high_ is lost data, money, a ticket, a gift or Gratitude, or the app unusable until a reload; _medium_ a wrong result or a stuck screen with a way out; _low_ cosmetic, or rare with little harm.

## Fixed

Every finding below is fixed on main, and `pnpm check:full` passes at d46f7ac2.

| Findings   | Commits                                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-1, R1-3 | 6aa7a16c                                                                                                                                                                                                                                |
| R1-2       | 6074498f                                                                                                                                                                                                                                |
| R2-1       | 009146d9                                                                                                                                                                                                                                |
| R2-2       | 793504fc                                                                                                                                                                                                                                |
| R2-3       | 86caa925                                                                                                                                                                                                                                |
| R2-4       | 1b513895, then b1d6fd3a: logging out now keeps the drawing for its person, so there's nothing to forget                                                                                                                                 |
| R3-1       | 274aa02f                                                                                                                                                                                                                                |
| R3-2       | dc77ed2e                                                                                                                                                                                                                                |
| R3-3       | b64c2ed0                                                                                                                                                                                                                                |
| R3-4       | 8852b718: FORBIDDEN, UNAUTHORIZED and an offline phone now read as before the picker. Online, LIFF 2.31.0 rejects a failed token request and a failed result poll alike, so a token request that fails online still reads as maybe sent |
| R4-1       | e81c8a14, and 6005a3a9 for the give sheet offering a sticker that just went into a gift, found while fixing it                                                                                                                          |

## Findings

### R1: Tickets and payments

**R1-1** · low · `src/tickets/TicketsProvider.tsx:112` (c9e1bff2)  
A purchase's answer (the checkout's, or the kept-payment retry's through set) is numbered when it arrives, not when its request went out, so it always wins: a stale one puts a spent ticket back on screen, and a spend on its way when it arrives has its own, newer answer dropped.

- Trigger: The app opens with kept payments: useAddUnaddedPurchases (App.tsx:138) asks for each in turn and sets the last added one's tickets only after the loop, which waits up to 10 s per payment Sui doesn't show yet. Meanwhile Draw on the board spends a daily ticket. The loop's set then shows the count from before the spend, or, if it lands while the spend is out, the spend's answer is dropped as older. The Draw key and the cards show one ticket too many until the next spend is refused and refreshes them: TIX-8's symptom, for the purchase and retry answers TIX-8 named.
- Fix: Take the request number when the purchase's request goes out (have the provider hand one out, or let addUnaddedPurchase and the checkout pass the number from before buyTickets and api.tickets were sent) and show the answer with that number.

**R1-2** · low · `apps/api/src/services/jpycPayments.ts:34` (e8d4c16f)  
readLanded checks the time left before its 1 s sleep, not after, so its last read can start with a few ms left on the shared 10 s signal; that read is aborted, readLanded rejects, and POST /api/ticket-purchases answers 502 sui_unavailable and logs sui.read.failed for a payment Sui simply doesn't show yet, instead of 409 payment_not_landed.

- Trigger: A payment Sui doesn't show (not landed yet, or never sent because the webview died after signing) and fullnode reads that take a few hundred ms: whenever a not-found read ends with between 1 s and 1 s plus one read's time left, the next read is cut off by the timeout. The phone shows "Sui didn't answer. Your tickets weren't added yet; try again." in place of "Sui doesn't show this payment yet", /api/logs shows a false Sui outage, and a payment past PAYMENT_LANDS_WITHIN_MS isn't finished off on that ask, since only the 409 counts as final. jpycPayments.test.ts can't catch it: its fake reads answer at once.
- Fix: Check the time left after the sleep (skip a read that can't finish), or once a read has answered not found, treat the deadline's abort as not landed and return null.

**R1-3** · low · `src/tickets/useDrawFromBoard.tsx:35` (224915c0)  
A spend the server refused leaves its key kept, and Draw on the board treats any kept key as a spend that may have landed, so with no tickets left it opens the canvas instead of the out-of-tickets card, for as long as the key stays (until a spend with it lands and is kept).

- Trigger: The phone shows a ticket that was spent elsewhere; Start's spend is refused with 409 no_tickets_left (or ticket_kind_changed and then no tickets). Every Draw on the board after that, and after a reload, skips the out-of-tickets card over the board and opens the drawing screen. There, spendRefused (drawing-screen state) hides the kept key in the same page life; after a reload it's false again, so spendAtOnce sends the refused key once more (another 409) before the out-of-tickets card comes up over the canvas.
- Fix: Keep the refusal with the key in TicketsProvider (hasKeptSpend false once the server refused a spend with it, until the next spend sends it), so the board and the drawing screen read one answer and spendRefused goes.

### R2: Sealing and drawing

**R2-1** · high · `src/sticker-creation/session/session.ts:115` (224915c0)  
sealFailure counts every 4xx but ticket_already_used as proof the server holds no seal, including 401 signed_out, which requireSession answers before the ticket is looked at; on a retry of a seal the server may hold, that clears the sent-seal note and reopens the sheet, so later strokes and an 18+ mark never reach the sticker.

- Trigger: A seal times out at 60 s (or answers mint_failed) while the server saves it: the sheet goes to retry, as meant. The session cookie is gone by the time the person taps the check (expired, or dropped by WebKit): POST /api/stickers answers 401 signed_out, sealFailure says 'refused', forgetSentSeal runs and the sheet goes back to drawing; SessionGate signs in again and remounts the app, and the kept drawing comes back as drawing, since sealWentOut is now false. The person draws more or turns on 18+ and seals; the server answers the first sticker, so the board and the NFT show the earlier drawing, stored without the NSFW mark and unblurred for people who aren't adult.
- Fix: Count as refused only the seal route's own refusals (invalid_request, ticket_not_yours, adults_only, ticket_not_found) and treat any other 4xx, signed_out above all, as not sent, so a retry keeps the note and the lock.

**R2-2** · high · `src/sticker-creation/DrawingScreen.tsx:565` (ed946d89)  
A reload after a seal went out carries the ticket to a fresh sheet without checking the sent-seal note when the kept drawing is only slow to read (or IndexedDB fails), so a new drawing on that sheet is answered with the sticker the server already made: the new drawing and its 18+ mark are dropped.

- Trigger: Seal, and LINE is closed before the answer while the server saves the sticker. On the cold reopen IndexedDB takes longer than LOAD_TIMEOUT_MS, so pickUp gets 'unread' and sends restored with sealSent false: the sheet is primed on that ticket with 'Your ticket carries over'. The person draws a new sticker and seals; POST /api/stickers finds the ticket use's sticker and answers it, so the ceremony plays the new cut while the card, the board and the NFT hold the first drawing. A late read that lands first goes to retry correctly, but pickUpLate drops it once a stroke is down. Plausible: needs a read slower than LOAD_TIMEOUT_MS, as DRAW-4 does.
- Fix: When sealWentOut(kept.ticket), keep the sheet locked (restoring) until the late read lands or the server says the ticket use has no sticker, instead of priming a fresh sheet on it.

**R2-3** · medium · `src/sticker-creation/session/session.ts:101` (224915c0)  
At 0:00, a seal the server refuses (or one the phone fails to cut every time) leaves the sheet locked in the retry phase with no way on: the check only sends the same refused seal again, and nothing starts a fresh sheet.

- Trigger: The clock runs out and the seal is refused (403 adults_only, 404 ticket_not_found, 400 invalid_request), or the cut fails on the phone each time. seal-failed with timeUp goes to retry; each tap of the check cuts the same locked sheet and gets the same refusal, and "Time's up. Couldn't seal. ..." stays. Board Draw sees the sheet as held and opens it again; a reload restores it drawing and paused at 0:00, and unpausing seals and is refused again. Only logging out, or undoing every stroke while paused after a reload, gets the person a fresh sheet.
- Fix: At 0:00, treat a refusal as final (reset to a fresh sheet with a chip saying the sticker couldn't be sealed, as the empty-at-0:00 branch does), and keep retry for failures after which the server may hold the seal.

**R2-4** · low · `src/api/logOut.ts:10` (cc80b134)  
Logging out with a drawing in progress doesn't forget it: the reload that ends the logout fires pagehide, and keepProgress writes the kept drawing's record straight back under the person's key.

- Trigger: Draw a few strokes, go to the board, flip to the stat board and log out. forgetKeptSession removes draw.session.<id> and deletes the database, then lineLogout reloads; DrawingScreen, still mounted under the board in the drawing phase, hears pagehide and keeper.save rewrites the record (ticket, time drawn, 18+, tools). It stays on the browser after logout, and the same person's next sign-in reads it, finds no ops and carries its ticket over.
- Fix: Stop the mounted keeper writing once its person is forgotten (for example logOut closes it before forgetting), so no save after the forget lands.

### R3: Giving, receiving and Gratitude

**R3-1** · medium · `src/giving/giveFlow.ts:303` (35dbf1a2)  
Nothing is kept on the device while LINE's picker is open, so a page reloaded or torn down after the Gift Message went out (before its answer is handled) leaves no message mark, and the next Give takes that gift out unasked and packs a new one: the friend's Gift Message then reads as taken back.

- Trigger: Giver taps Send in LINE and sends in the picker; before the page handles LIFF's 'sent' (LIFF polls every 500 ms), LINE's webview is reloaded or closed (the giver closes the LIFF window right after sending, or Android reclaims the webview while the picker is up). keptGifts holds only depositSentAt/depositHash, no `message`. Next time the giver gives that sticker: POST /api/gifts answers the packed gift with giftClaimToken null, pack() sees no message and no token, runs the recovery (take-out on chain, POST take-out) and packs a new gift; the friend opening the first message sees '@giver took this one back'. The 'never taken back unasked' promise holds only once the flow has heard an answer or stopped waiting. Confirm on a device by closing LINE's LIFF window right after tapping send in the picker (or with Android's 'Don't keep activities' on), then giving the same sticker again: the server log shows POST /api/gifts/:id/take-out for the first gift.
- Fix: Mark the gift maybeSent in keptGifts just before sender.send (the picker may send from then on), and clear the mark only on a definite 'cancelled' or a failure before the picker opened, so a reload lands on "Did it go out?" instead of the recovery.

**R3-2** · medium · `src/giving/Giving.tsx:114` (35dbf1a2)  
While LINE's picker is open Giving still refuses every exit, and the only early way out is a visibilitychange to visible; where LINE's picker doesn't hide the page and LIFF's answer never comes, the giver is held on a full-phone Giving screen for PICKER_ANSWER_MS (11 minutes).

- Trigger: In LINE's app, the picker opens over the page without the page going hidden, and LIFF's result poll stalls (its fetch has no timeout, and LIFF checks its 10-minute limit only between polls). The step stays 'picking': busy is true, close() does nothing, Escape/Back refuse, and takeOut() isn't leavable from picking; pageShown never runs, so only after(PICKER_ANSWER_MS, stopWaiting) ends it. Confirm on an iPhone and an Android phone in LINE by logging visibilitychange while the share target picker opens and closes; if no hidden/visible pair fires, a stalled answer holds Giving for 11 minutes.
- Fix: Offer a way out of picking after a short wait (for example Take it out or "Did it go out?" once PICKER_RETURN_MS has passed with no answer, whatever the page's visibility), recording the outcome as maybeSent as stopWaiting does.

**R3-3** · low · `src/giving/giftBackend.ts:235` (35dbf1a2)  
markSent forgets the kept 'sent' mark on any refusal other than no answer or a 5xx, so a sent report refused 401 signed_out (session lost while the picker was open) leaves the gift packed on the server with nothing on the device, and the next Give takes out a gift whose message went out.

- Trigger: Giver sends the Gift Message; POST /api/gifts/:id/shared answers 401 signed_out (the session cookie expired or was invalidated while the picker was open). markSent calls settle(), which deletes the in-page attempt and the kept entry; Giving shows 'Sealed and sent' with a couldn't-record line. After signing in again, giving the sticker again finds no mark and runs the recovery: take-out on chain, a new gift, and the friend's message reads as taken back.
- Fix: Settle only on refusals that close the question for good (gift_closed, not_yours, gift_not_found); keep the 'sent' mark on 401 signed_out (and other non-final answers) so the report is sent again after sign-in.

**R3-4** · low · `src/line/friendPicker.ts:52` (35dbf1a2)  
Failures LIFF raises before the picker ever opens (its one-time-token request failing offline or with an HTTP error, or its own FORBIDDEN/UNAUTHORIZED check) are read as 'unknown', so a giver whose tap never opened a picker gets "Did it go out?" and can no longer send the same Gift Message, only mark it sent or take the sticker out on chain.

- Trigger: Giver cancels the picker once (Not sent yet), loses the connection, and taps Send in LINE: LIFF's initOtt GET fails before `line://picker` is opened. The network TypeError is rethrown as EXCEPTION_IN_SUBWINDOW and an HTTP answer as code "400"/"401"/"403"/"404"/"429"/"500"; none is in BEFORE_THE_PICKER, so sendInLineChat returns "unknown", the flow marks the gift maybeSent and shows "Did it go out?". It went out records a send that never happened (the friend never gets a message); Take it out costs a take-out and a new deposit. Before this commit the same failure showed 'wasn't sent' with Send in LINE.
- Fix: Read FORBIDDEN and UNAUTHORIZED as before the picker, and tell an OTT failure from a result-poll failure by whether the picker could have shown (for example a rejection before the page was ever hidden and within the token request's time), confirming on a device what LINE's picker does to the page's visibility.

### R4: App shell, shared controls, board, tray, storage and helpers

**R4-1** · medium · `src/sticker-board/StickerBoard.tsx:380` (f872794c)  
Your sticker board adopts useMyStickerBoard's kept answer as a fresh load when it mounts, so on the visit after one where you moved, stuck on or put back stickers, they show at their old spots for the whole visit, and a sticker the board had placed itself is placed and saved again at its first spot, overwriting on the server where you moved it.

- Trigger: Move a sticker on your board (drag or arrow keys; the save lands), then go to Draw or Explore and back, or seal a sticker, which lands you on the board, with no Shop, give sheet or offer sheet loading the board in between. The new StickerBoard shows the answer kept from the start of the last visit over the phone's up-to-date board, and marks it fresh, so when the fresh load lands heldOver keeps those old spots over the server's. The moved sticker sits where it was before; one stuck on from the sticker tray is back in the tray; one put back in the tray is on the board again. A sticker whose kept placement was null (a received sticker the board placed on the last visit) gets its first free spot again and the newlyPlaced effect saves it, so the move is lost on the server too. visit 1 saves x 0.4701; visit 2 shows x 0.5 after the fresh load; in the unplaced case visit 2 saves x 0.5 again and the server ends at 0.5.
- Fix: Have StickerBoard adopt only a load that landed in this mount (or adopt the kept answer as fromPhone), or update the kept answer's placement whenever save() sends one.
