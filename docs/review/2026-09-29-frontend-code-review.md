# Frontend code review

2026-09-29. The findings of a max-effort review of all of `apps/frontend` at main `9f541d12`, grouped by area. The plan that fixes them, and what it has fixed so far, is [docs/superpowers/plans/2026-09-29-frontend-review-fixes.md](../superpowers/plans/2026-09-29-frontend-review-fixes.md).

Finder lanes each took an area or an angle: line by line, behavior removed in the history's merges, frontend and API contracts, React and JavaScript pitfalls, wrappers, reuse, simplification, efficiency, root causes and AGENTS.md's rules. A second agent that hadn't found a candidate then checked it against the code, running a scratch script where one could settle it, and gap sweepers looked for what the lanes missed. A defect found by several lanes is one finding here.

- A finding reads **ID** · severity · verdict · `file:line`, then what goes wrong, its trigger (for cleanup, its cost) and a fix. Paths are under `apps/frontend/` unless they start with `apps/` or `deploy/`.
- _Confirmed_: the trigger and what the person sees were traced through the code, or run. _Plausible_: the mechanism is real, but the trigger needs a device, a timing or a platform to confirm, and the finding says how.
- _High_: lost data, money, a ticket, a gift or Gratitude; an NSFW sticker shown to or received by someone not adult; or the app unusable until a reload. _Medium_: a wrong result, or a stuck screen with a way out. _Low_: cosmetic, or rare with little harm.

## Fix first

Every high finding. Confirmed:

- **DRAW-1** A seal the server saved but whose answer failed reopens the sheet, and every stroke or 18+ switch change after that is dropped: an NSFW mark never reaches the server.
- **DRAW-2** The drawing kept on the device has no owner: the next person to sign in on that browser gets it, and can't seal it.
- **GRAT-1** The Gratitude outbox is one per browser: someone else signing in deletes the combos still waiting to send.
- **TIX-1** A payment Sui ran is dropped when the wait after it fails: the JPYC is spent and no tickets are ever added.
- **TIX-2** After a failed spend, Draw on the board spends a ticket the drawing screen never takes, and Start then spends a second one.
- **TIX-3** A paid pack's tickets depend on the phone keeping the payment's digest: the server never looks for payments to the vault itself.
- **SHELL-1** On iPhone, the second missing chunk in one LINE session doesn't reload, and the app goes blank.
- **UI-1** A lazy screen whose code fails to load blanks the whole app: no error boundary, and React.lazy keeps the failure.

Plausible, each needing a device or platform check first:

- **DRAW-3** If copying the ink throws (iOS out of canvas memory), the seal never ends: the screen stays in sealing until a reload.
- **DRAW-4** A kept drawing whose read takes over 5 s is treated as lost, and wiped.
- **DRAW-5** A tap finger whose lift never arrives blocks finger drawing until a reload.
- **DRAW-6** Once WebKit drops the IndexedDB connection, no later stroke is kept, and nothing says so.
- **GIFT-1** If LINE's picker never answers, Giving can't be closed.
- **TIX-4** A payment still running when the 60 s timer fires is shown as failed and never credited.
- **TIX-5** A 422 payment_not_found, from a fullnode not caught up yet, makes the phone forget a real payment.

## Patterns

Most findings are instances of a few causes. Fixing the cause once, where it lives, closes the instances and keeps the next caller from repeating them.

1. **Device storage that doesn't know whose it is.** The kept drawing and the Gratitude outbox are one per browser, so the next person to sign in gets or deletes the last person's (**DRAW-2**, **GRAT-1**), while the ticket spend key, unadded purchases and the last board are kept per person. About ten stores each hand-roll their own read, parse, validate and write (**CLEAN-21**). One device store keyed by the signed-in person, cleared on sign-out, with one rule for a blocked or unreadable entry, fixes both and gives **GIFT-10** and **GRAT-11** one place to be right.
2. **No answer taken as no.** A request that may have landed on the server is treated as failed, and the way back either can't recover or repeats the side effect: the seal (**DRAW-1**, **DRAW-9**), the ticket spend (**DRAW-7**, **TIX-2**), the JPYC payment (**TIX-1**, **TIX-4**, **TIX-5**) and the gift (**GIFT-3**, **GIFT-9**); and the server never looks for a payment the phone forgot (**TIX-3**). The rule for each: keep the request's key, digest or hash before sending it; after no answer, hold the screen on "checking" and ask again with the same key; only a definite refusal reopens the sheet or the bag.
3. **Every gesture tracks its own pointers.** Each hand-rolled drag misses a pointer id, a cancel or a second finger: the sticker tray (**TRAY-1**, **TRAY-2**, **TRAY-8**), the board's pinch (**BOARD-6**), the developer slip's pull (**BOARD-5**), the pull tab (**GIFT-8**), the Mini-game's stroke (**GRAT-2**), the ink's tap gestures (**DRAW-5**) and the sheet's perforation (**UI-2**). A shared single-pointer drag (one pointer id, pointercancel and lostpointercapture end it as a cancel, a second finger is ignored or handled on purpose) removes the class.
4. **A chunk that fails to load takes the app down.** No error boundary sits above any lazy screen, React.lazy keeps a rejection for good, and on iPhone the reload guard fires once per tab session (**UI-1**, **SHELL-1**). One boundary with a retry that makes a fresh load, and a guard keyed by the chunk or the build, fix both.
5. **Dates in the phone's time zone.** The app's day ends at midnight in Tokyo, but sheet feet, the lifted sticker's caption and the start and sealed cards' refill time use the phone's clock and zone (**TRAY-3**, **EXPL-3**, **CLEAN-5**), and the Tokyo offset itself is a hand copy of the server's (**CLEAN-7**). One Tokyo-day date module, fed by the server's offset, for every printed date.
6. **iOS canvas memory released in some places only.** The fill copy and the cut's canvases are freed at once; the seal's ink copy, the undo checkpoints and the mini-heart layer aren't (**DRAW-15**, **DRAW-11**, **GRAT-13**), and running out is what makes **DRAW-3** fire. Call the existing `release(canvas)` wherever a canvas leaves use.
7. **Focus fixed per dialog.** useFocusTrap wraps only from its first and last control and loses Escape once focus falls to the page (**UI-7**, **CLEAN-1**), so each dialog re-adds its own refocus effect, those copies have drifted (**CLEAN-4**), and the screen-level focus loop keeps its own idea of a tab stop (**CLEAN-9**). Fix the trap once and delete the per-dialog effects.

## Drawing screen and sealing

18 findings: 6 high, 5 medium, 7 low.

**DRAW-1** · high · confirmed · `src/sticker-creation/DrawingScreen.tsx:337`  
After a seal the server already saved fails on its way back (503 mint_failed, or the app's 60 s wait running out while the server finishes), the sheet reopens for ink on the same ticket, and the retry returns the first seal's sticker, so every later stroke and any change to the 18+ switch is silently dropped.

- Trigger: Seal: POST /api/stickers commits the sticker row, the ticket use's stickerId and the placement, then the mint fails and the answer is 503 mint_failed (or the fetch aborts at 60 s). seal() sends seal-failed, the phase goes back to drawing with ticket.current still set, and the sheet takes ink. The person draws more or turns the 18+ switch on, then seals again: the server sees ticket.stickerId !== null and answers the first sticker without reading the new PNGs, timelapse, timeUsed or nsfw. The ceremony plays the new local cut, but the board, the detail and the NFT show the earlier drawing, and an NSFW mark made after the failure never reaches the server, so the sticker is stored without pink foil and unblurred for people who aren't adult. Same end if LINE is closed mid-request: keeper.wipe() never ran, so the reload restores the sealed drawing as in progress.
- Fix: Once a seal may have reached the server (any failure after api.seal was called, above all mint_failed or a timeout), keep the sheet locked and offer only a retry of the same seal request, or have the server refuse a retry whose content hash or nsfw differs from the saved sticker.

**DRAW-2** · high · confirmed · `src/sticker-creation/session/keptSession.ts:169`  
The drawing kept on the device has no owner and nothing clears it on sign-out, so the next person to sign in on that browser gets the last person's drawing and ticket use, and every seal of it is refused.

- Trigger: Person A has a drawing in progress (draw.session in localStorage, ops in IndexedDB 'drawing-session'), then logs out from the stat board (lineLogout reloads the page) and B signs in on the same browser (LINE Login in a desktop browser, or ?as= in dev). B's DrawingScreen runs loadKeptSession, which returns 'found' with A's ops, nsfw flag and ticket use; pickUp puts them on B's sheet, paused. Every seal B tries gets 403 ticket_not_yours; seal-failed puts the sheet back to drawing, the sheet stays 'held' so the board's Draw never spends B a ticket, and startNewSticker runs only after a seal (App.tsx:148). Once the clock hits 0:00 it is done for good, so B's only way to a fresh sheet is erasing everything and sealing (seal's empty-at-time-up branch). The 'lost' branch does the same through 'carried', which calls keeper.start(A's ticket).
- Fix: Key the kept record and the ops store by the signed-in user's id (as spendKey.ts does) and have loadKeptSession ignore, or wipe, a kept drawing that belongs to someone else; also wipe it in logOut.

**DRAW-3** · high · plausible · `src/sticker-creation/DrawingScreen.tsx:266`  
seal() runs finishStroke() and inkForReading() before its try block, so if either throws, no seal-failed is sent and the drawing screen stays in sealing for good: tools hidden, sheet locked, the sealing label up, until a reload.

- Trigger: Both calls can allocate a full-size canvas through copyOf -> context2d, which throws 'Canvas 2D context unavailable' when getContext returns null, as WebKit does once its total canvas memory budget is used up (undo checkpoints, fill copies, ceremony layers). seal() rejects outside the try, `void seal()` drops the rejection, the phase stays sealing, and SealingStatusLabel moves on to 'taking longer' with nothing else on screen. Only a reload gets out, and a stroke finished by finishStroke may not have been kept.
- Confirm by: On an iPhone in LINE, make getContext return null at seal time (fill the canvas budget with many undo checkpoints and fills, or stub HTMLCanvasElement.prototype.getContext to return null just before the seal tap) and watch the screen stay in sealing.
- Fix: Move finishStroke() and inkForReading() inside seal()'s try, so any failure there sends seal-failed and shows the seal problem.

**DRAW-4** · high · plausible · `src/sticker-creation/DrawingScreen.tsx:435`  
A kept drawing whose IndexedDB read takes longer than 5 s is treated as lost, and the 'carried' path then clears its ops and time, so a read that was only slow destroys the drawing.

- Trigger: Cold start in LINE's WebView with IndexedDB slow to open or read past LOAD_TIMEOUT_MS. withTimeout rejects while readOps keeps going; loadKeptSession returns {status:'lost', ticket}; pickUp runs keeper.start(kept.ticket), which overwrites the localStorage record with elapsedMs 0 and nsfw false and queues a readwrite transaction that clears both stores. That transaction runs after the still-running readonly read, whose result is thrown away, so the ops are deleted. The person sees 'ticket carries over' and a blank sheet; the drawing is gone for good.
- Confirm by: A scratch run under fake-indexeddb that delays the ops store's getAll past 5 s, then checks the stores after pickUp's keeper.start; or timing IndexedDB's first open on a cold iPhone LINE start.
- Fix: On a timed-out read, carry the ticket over without clearing the stores (or keep waiting for the read and restore the drawing when it lands), and clear only a record the read proved unreadable.

**DRAW-5** · high · plausible · `src/sticker-creation/canvas/gestures.ts:41`  
A tap-gesture finger whose lift never reaches the sheet stays in TapRecognizer.touches for good, and from then on every single-finger touch is read as part of a gesture, so fingers can't draw until a reload; load() and reset() don't clear it.

- Trigger: Two fingers land for a tap; the second is a 'gesture' finger the engine doesn't track, so attach() gives it no pointer capture and onLostCapture ignores it. If its pointerup/pointercancel never reaches the sheet, its entry stays. Every later touch then finds touches.size >= 2, gets 'gesture', and draws nothing; the drawing screen stays that way across fresh sheets, since reset()/load() never touch `taps`. Pen and mouse still draw. Only a later touch that happens to reuse the lost pointer id overwrites the entry; otherwise nothing clears it until a reload. Scratch run: after one lost gesture finger, 'ops after a later single-finger stroke 0', 'ops after load([]) and another stroke 0', and 'ops once the lost finger is cancelled 1'.
- Confirm by: On an iPhone in LINE, find a way a touch on the sheet ends with no pointerup or pointercancel reaching it (the drawing screen turning inert mid-touch, a system gesture, a WebView dropping the up), then try a one-finger stroke.
- Fix: Clear the TapRecognizer in load()/reset() and drop a touch from it on lostpointercapture or on a new touch landing with no pointers down (for example a pointer count from pointerdown/up at the document), so a missed lift can't block drawing.

**DRAW-6** · high · plausible · `src/sticker-creation/session/keptSession.ts:37`  
openDb keeps its IDBDatabase for good, so once WebKit closes that connection every later save fails with one console line and nothing on screen, and a reload brings back the ops from before the drop with the later time.

- Trigger: The person draws, switches away in LINE, and WebKit drops its IndexedDB server connection. dbPromise still holds the closed connection, so transact's db.transaction() throws for every later save; write() sets written=null and logs only the first failure. writeRecord keeps updating elapsedMs in localStorage. If the page is then reloaded or killed, loadKeptSession restores the ops from before the drop with the later time, and every stroke since is gone.
- Confirm by: Safari Web Inspector on an iPhone: background LINE for a few minutes with a drawing in progress, come back, draw a stroke, and look for 'Connection to Indexed Database server lost' plus this module's console error; then reload and count the ops.
- Fix: Reset dbPromise on the connection's close event (and on a transaction that throws InvalidStateError) so the next save reopens, and show a persistent note on the drawing screen when the drawing can't be kept.

**DRAW-7** · medium · confirmed · `src/sticker-creation/DrawingScreen.tsx:496`  
When the spend of the last ticket lands on the server but its answer is lost, the refreshed tickets count it as spent, so the drawing screen shows the out-of-tickets card and never sends the kept key that would return the unsealed ticket use.

- Trigger: Last daily ticket and no reserve tickets: POST /api/tickets/spend commits, the answer is lost (15 s timeout, network drop). spend() rejects, the key stays kept, and start's failure path calls tickets.refresh(), which says dailyLeft 0, reserveLeft 0. The out-of-tickets card comes up; its Start drawing calls startRightAway, where nextKind returns null, so no spend is sent. The person is told they're out of tickets although a spent, unsealed ticket use waits for them, until a purchase or the Tokyo midnight refill sends a spend with the kept key.
- Fix: When a spend key is kept, let the drawing screen send it even with no tickets left (for example startRightAway spends with the kept key whatever nextKind says), or have GET /api/tickets return the unsealed ticket use so the sheet can take it.

**DRAW-8** · medium · confirmed · `src/sticker-creation/session/session.ts:87`  
When the seal fired at 0:00 fails, the sheet goes back to drawing but the clock is already done, so resume-clock does nothing and time-up never fires again: the person can draw past the three minutes for as long as they like.

- Trigger: The clock reaches 0:00: SessionClock.frame sets state to done and calls onTimeUp, time-up moves to sealing and seal() starts. The seal fails (network, mint_failed, line_token_expired, a worker error). seal-failed moves to drawing with resume-clock, but resume() only acts on a stopped clock. The timer sits at 0:00, the sheet is unlocked and takes strokes with no limit, and nothing seals on its own; a later seal-key seal reports timeUsed clamped to 180 s.
- Fix: In seal-failed, when the clock is done, keep the sheet locked (a time-up phase that only offers the seal retry) instead of going back to drawing.

**DRAW-9** · medium · plausible · `src/api/httpApi.ts:9`  
The app's 60 s seal wait covers the upload of five PNGs and the timelapse plus the server's whole seal, but only the server's receipt wait is bounded under it, so a seal that succeeds on a slow connection or a slow Sepolia block shows as failed and reopens the sheet.

- Trigger: Slow phone uplink plus a slow mint: the server's path is the image save, the Privy wallet lookup, chain_lookup (up to four RPC reads at 5 s each with one retry), simulate, submit, the 30 s receipt wait, verify reads, and after a recovered mint a 30 s event-block lookup. The fetch aborts at 60 s with ApiError status 0, the seal chip says the server didn't answer and the sheet takes ink again, while the server finishes the seal (which then drops later strokes, see drawing-seal-1).
- Confirm by: Seal over a throttled connection (for example 1 Mbps up) while Sepolia is slow, or read the box's `sticker.seal.saved` and `chain.mint` log times for seals the app reported as failed at 60 s.
- Fix: Bound the server's whole seal (upload read excluded) under the app's wait and answer mint_failed from that bound, or have the app start its wait after the upload and treat a timeout as 'maybe sealed', checking the ticket use before reopening the sheet.

**DRAW-10** · medium · plausible · `src/sticker-creation/DrawingScreen.tsx:391`  
The stroke that finishStroke() commits as sealing starts (a finger mid-stroke at 0:00) is never saved, because keepProgress skips the sealing phase and nothing saves on seal-failed, so a failed seal followed by leaving the page can lose that stroke.

- Trigger: A finger is mid-stroke when time-up arrives. send() sets latest.current to sealing before running the seal effect; seal() calls finishStroke(), whose commit calls onHistory -> keepProgress, which returns because the phase is sealing. The seal fails (for example line_token_expired), the sheet goes back to drawing, and nothing saves. Tapping the check to reconnect leaves the page, and the only save left is keepOnHide's IndexedDB write started as the page unloads, which the module's own header says never lands. Back on /draw, the drawing returns without its last stroke.
- Confirm by: In WebKit (Playwright), hold a stroke through 0:00 with the seal answered 401 line_token_expired, tap the check, return to /draw, and count the restored ops against the ops before the seal.
- Fix: Save the ops in seal() right after finishStroke() (or let keepProgress save in the sealing phase too), so the kept drawing always holds what the seal was cut from.

**DRAW-11** · medium · plausible · `src/sticker-creation/canvas/history.ts:130`  
Undo checkpoints are full-sheet canvas copies. History drops them in four places without zeroing their size, so each backing store stays counted in WebKit's canvas budget until garbage collection.

- Trigger: Every 24 strokes, or at one fill, History snapshots the ink at up to DPR 3. Past four snapshots it drops the oldest. Drawing after an undo drops the undone ones, and a resize or reset drops all of them. None is zeroed, so each keeps its backing store until JavaScriptCore collects it. If collection lags until iOS's canvas limit, the fill's reader copy or the seal's copyForReading comes back blank.
- Confirm by: On an older iPhone in LINE, draw a long session with undos and redraws, then fill or seal, with Web Inspector open for 'Total canvas memory use exceeds the maximum limit'. JavaScriptCore reports canvas memory to its collector, so the limit may never be reached in practice.
- Fix: Give Surface a discard(snapshot) that zeroes the canvas (move fillSnapshots.ts's release into a shared canvas module), and have History call it everywhere a checkpoint leaves the Map, and when the engine is torn down.

**DRAW-12** · low · confirmed · `src/sticker-creation/DrawingScreen.tsx:686`  
When the LINE reconnect started from the seal key's reconnect chip fails, the drawing screen shows nothing: the tap clears the chip first, and the failure only goes to the Privy status, which the drawing screen never shows.

- Trigger: A seal fails with line_token_expired and the chip says to reconnect. The person taps the key: setSealProblem(null), then retryPrivySignIn('/draw') -> reconnectLine. Inside LINE, liff.permanentLink.createUrlBy rejects or passes its 15 s timeout, and .catch calls fail('LINE could not reconnect; try again', true). The chip is gone and nothing sets it again, so the key looks like it did nothing; two more seal taps bring the chip back.
- Fix: Have retryPrivySignIn return the reconnect's promise and, on the drawing screen, set the seal problem again with the reconnect's failure when it rejects.

**DRAW-13** · low · confirmed · `src/sticker-creation/canvas/inkEngine.ts:331`  
A two-finger undo tap whose fingers landed before the sheet locked still undoes when they lift during sealing, so the sticker is cut from the ink with the op but the timelapse, read after the cut, lacks it and replays to a different final image.

- Trigger: Two fingers land on the sheet for an undo tap as the clock hits 0:00 and lift within the tap window. seal() copies the ink synchronously before its first await, so the sticker PNG has the last op; the lift then runs lift() -> taps.up() -> 'undo' -> engine.undo(), which pops that op. timelapseOf reads canvas.ops() after `await makeSticker(ink)`, so the stored timelapse on the sticker's detail ends without the op the sticker shows. A focused undo tile activated by Enter or Space during the ceremony does the same, since the button isn't disabled and .is-sealing sets only opacity and pointer-events. Scratch run: 1 op, two touches down, settings.locked = true, both lift -> 'ops after locked lift 0, last history [ false, true ]'.
- Fix: Have InkEngine.undo/redo (and lift's gesture branch) do nothing while settings.locked, and take the timelapse's ops at the same moment seal() copies the ink.

**DRAW-14** · low · confirmed · `src/sticker-creation/sealing/SealCeremony.tsx:275`  
The ceremony's frame loop effect depends on the live reduced-motion setting, so turning Reduce Motion off while the ceremony or its sealed card is up restarts the whole ceremony from t = 0.

- Trigger: An artist with Reduce Motion on seals a sticker; with the sealed card up they turn Reduce Motion off (Accessibility Shortcut, or Settings and back to LINE). useReducedMotion follows matchMedia's change, the layout effect cleans up and reruns with t = 0, path and lines reset: the dim and cut repaint, the sticker returns to its backing and flies again, and the card's opacity is rewritten from its t = 0 value, so the card blanks and fades up again. `done` stays true, so the root's tap-to-skip is off while the card's buttons still take taps, and the re-added keydown listener turns the next Enter or Space on the focused key into a skip instead of a press. Turning it on instead jumps straight to the end, since ceremonyTime returns stop under reduced.
- Fix: Read reduced through useEffectEvent (as isSealed is) so the setting changes how the next frames play without restarting the effect.

**DRAW-15** · low · plausible · `src/sticker-creation/DrawingScreen.tsx:267`  
The full-size ink copy seal() makes for reading is never released with width = 0, unlike the fill copy and makeSticker's canvases, so on iPhone it counts against WebKit's canvas memory until it is collected.

- Trigger: Each seal allocates an ink-sized canvas (willReadFrequently) and drops it only for garbage collection. Several seals in a row (Keep drawing), with undo checkpoints, fill copies and ceremony layers, push toward WebKit's canvas memory limit, where getContext starts returning null (see drawing-seal-2). Depends on GC timing.
- Confirm by: Seal several stickers in a row on an iPhone in LINE with Web Inspector attached and watch canvas memory in the Graphics tab, or watch for the 'Total canvas memory use exceeds the maximum limit' console warning.
- Fix: Release the ink copy (width = 0, height = 0) in seal()'s finally once the timelapse is made, when the worker path cut from its own ImageBitmap copy.

**DRAW-16** · low · plausible · `src/sticker-creation/sealing/SealCeremony.tsx:172`  
The ceremony collects the sealed card's [data-card-line] lines once, so when the post-seal tickets refresh flips whether this was the last ticket, the bottom line is replaced by a node of another type that skips the staggered fade-up.

- Trigger: tickets never goes null during a drawing (TicketsProvider keeps the last tickets until a load lands and the spend sets them), so TicketRow is there from the card's first render; the candidate's null-tickets path doesn't occur. The reachable trigger: an artist spends their last daily ticket before midnight JST and seals after it. The card mounts with last = true (the Shop line, a div); tickets.refresh(), called just before sealed is set, answers with the new day's daily tickets, last flips to false and the div is replaced by a LabelButton. The Key above is the same component in both branches, so React keeps its node. The new LabelButton isn't in `lines`: it shows at full opacity at once while the lines above it are still fading up. Visible only if the answer lands during the card's fade.
- Confirm by: Seal with the last daily ticket while mocking GET /api/tickets to answer fresh daily tickets about half a second after POST /api/stickers, and watch the bottom line.
- Fix: Collect the card's lines on each frame until the ceremony ends (or keep both bottom lines mounted and toggle them), so a replaced line joins the stagger.

**DRAW-17** · low · plausible · `src/sticker-creation/sealing/SealCeremony.tsx:270`  
The ceremony's dim, cut and silhouette canvases keep their screen-sized backing stores after it unmounts until WebKit collects them, unlike the ceremony's own wall canvas and the sticker's mask, which are zeroed for the same reason.

- Trigger: Each ceremony sizes the dim and cut canvases to the ceremony at min(DPR, 2), about 5 MB each on a 390 x 844 phone, plus the silhouette; the cleanup only cancels the frame, removes the key listener and clears data-lifted. Unmounted, they're unreferenced, so they're freed at the next collection; the harm needs several seals in a row (Keep drawing) to stack up enough uncollected canvas memory against WebKit's canvas limit that a later getContext fails, which then shows as a missing dim or cut line, or a failure elsewhere (the ink sheet's canvases). Whether GC lags that far is unverified.
- Confirm by: On an iPhone in LINE (or Safari with Web Inspector's canvas memory), seal ten stickers in a row with Keep drawing and watch for 'Total canvas memory use exceeds the maximum limit' or the ceremony's 'No 2D context' console error.
- Fix: In the effect's cleanup, set the dim, cut and silhouette canvases' width and height to 0, as ceremonyPaint does for its wall canvas.

**DRAW-18** · low · plausible · `src/sticker-creation/sealing/timelapse.ts:105`  
gzipTimelapse uses CompressionStream with no feature check, so on iOS before 16.4 every sticker seals without its timelapse, with only a console error.

- Trigger: On iOS 16.0 to 16.3, `new CompressionStream("gzip")` throws ReferenceError inside gzipTimelapse; timelapseOf catches it and returns null, and the seal goes on without a timelapse. The person gets no warning, and the sticker's detail has no timelapse to play on any device.
- Confirm by: Check that LINE and the built bundle still run on iOS 16.0 to 16.3 (LINE's minimum iOS, and whether the Vite default target's output parses there), then seal once on such a device and look for a timelapse on the sticker's detail.
- Fix: Check for CompressionStream and, where it's missing, send the timelapse uncompressed if under the limit or gzip it with a small library, rather than dropping it.

## Sticker board, sticker detail and stat board

7 findings: 0 high, 2 medium, 5 low.

**BOARD-1** · medium · confirmed · `apps/api/src/stickerBoards/board.ts:126`  
Visitors still see a sticker in a sent gift on the giver's board until someone receives it. The API's visitor filter checks only onBoard and ownerId, and openGift is null for visitors, so ArtistBoard can't apply onItsWay.

- Trigger: The giver sends a gift of a sticker on their board (status sent, in escrow). Their own board hides it, and it shows only in the pending gifts badge. A visitor who opens the giver's board from Explore still sees it there, and can open its detail and the offer sheet for it. A gift that waits for someone and is never received stays visible to visitors for as long as it waits.
- Fix: In loadStickerBoard, leave any sticker held by one of the owner's sent gifts off a visitor's board, so the server decides what is on a board for every viewer and the client keeps one predicate.

**BOARD-2** · medium · confirmed · `src/sticker-board/StickerBoard.tsx:828`  
A received sticker that comes back to someone whose board placed it before goes to the sticker tray instead of landing, so landingId never clears and the Send gratitude sheet doesn't show on that visit.

- Trigger: You give a sticker your board has placed, the receiver gives it back, and you receive it. The receive upsert sets your old placement row's on_board to 0, so the board loads it with placement.on false: it isn't in onBoard, no PlacedSticker mounts with landing=true, and onLanded (the only thing that clears landingId) never runs. owed is set by the stickerDetail check, but the sheet needs `!landingId`, so you see no landing and no gratitude question; the sticker sits quietly in the tray. The sheet shows only after the board remounts (landed already holds the id), or if you place the sticker from the tray on this visit, which also plays a stray landing on it.
- Fix: Gate the sheet on the fresh sticker actually landing: treat landingId as done when the fresh sticker loads off the board (for example, clear it when `stickers` holds it with placement.on false).

**BOARD-3** · low · confirmed · `src/sticker-board/StickerBoard.tsx:803`  
After a gift is sent, the board reloads only when its query is ready, so on a board whose fresh load failed (or is still loading) the given sticker stays on the board with Give still offered.

- Trigger: The board shows from the phone's storage and its fresh GET /api/sticker-boards/me failed, so the 'didn't load' note shows. The person gives a sticker and sends it; Giving's onClose(true) finds board.state 'failed' and neither refreshes nor retries, so the sticker stays on the board (and its toolbar still offers Give) while the pending badge, which is retried, shows the same gift on its way. It clears only on Try again or a new visit. The same happens if the first load is still in flight and its server read predates the send (that timing part is PLAUSIBLE only).
- Fix: On a sent gift, refresh when ready and retry when failed (and refetch once a load in flight lands), or mark the given sticker's openGift as sent locally so it leaves the board at once.

**BOARD-4** · low · confirmed · `src/sticker-board/stat-board/StatCork.tsx:132`  
Tapping World ID's backdrop to dismiss it also turns your board back to its front, because the backdrop's click bubbles through React portals to the cork's bare-cork click handler.

- Trigger: On your stat board, tap Verify under Age verification, then tap IDKit's backdrop (on a phone, the area above its bottom sheet) to dismiss it. IDKit closes World ID without stopping the click; React bubbles it from the ShadowHost portal through WorldIdAgeProof's body portal and AgeVerificationNote to `.stat-board__cork`'s onClick. The backdrop isn't inside any ON_CORK element in the DOM (it's in a shadow root under body), so closest returns null and onFlipBack runs: the person lands on the front of their Sticker Board instead of the stat board. They can tap their name to turn it over again. With a keyboard, Escape inside IDKit reaches StatCork's onKeyDown first, which stops it and flips the board, so IDKit's window keydown listener never closes World ID and its sheet stays open over the front.
- Fix: Render AgeVerificationNote's WorldIdAgeProof beside the cork (as StatBoard does for AddressDialog), or have onCorkClick and onKeyDown ignore events whose target isn't inside the cork's DOM (`!cork.current?.contains(e.target)`).

**BOARD-5** · low · confirmed · `src/sticker-board/stat-board/usePullToReveal.ts:114`  
A second finger landing mid-pull clears `pulling` without settling the rubber band, so the developer slip stays partly pulled out under the cork.

- Trigger: Pull up past the cork's end with one finger so --pull shows part of the slip, then touch a second finger before lifting. onTouchStart sets pulling=false and from=null and returns on two touches; the later touchmoves return on from === null, and both touchends return on !pulling before settle(). shown and --pull stay where they were, so the top of the slip keeps showing at the cork's end. A later tap doesn't fix it; only a later one-finger drag that starts at the end and releases settles it. The slip ships in deployed builds (DEV_SLIP).
- Fix: In onTouchStart, settle a band that's showing (call settle() when pulling or shown > 0) before clearing `pulling`, so any touch that ends a pull puts the band back.

**BOARD-6** · low · confirmed · `src/sticker-board/useBoardGestures.ts:309`  
A third finger during a pinch joins `pointers` but not the gesture; when the first finger lifts, the pinch continues with fingers 2 and 3 measured against the old start pair, so the sticker jumps, turns and resizes.

- Trigger: Pinch a sticker with fingers 1 and 2, touch a third finger, then lift finger 1. The pinch keeps going, and pinchBy compares [f2, f3] with start [f1, f2]: the midpoint, spread and angle all change at once, so the sticker leaps and spins (a scratch run of pinchBy([f1,f2], [f2,f3]) with fingers at (100,100), (200,100) and (150,200) gives `{ x: 25, y: 50, s: 0.72, r: 116.565 }` against `{ x: 0, y: 0, s: 0.72, r: 0 }` for the unchanged pair), and it's committed wherever it ends when the last finger lifts. The person can move it back.
- Fix: When a pinch's pair changes (a finger in the pair lifts while others stay, or a third lands), restart the pinch from the current two fingers and the live placement, as onDown already does at two.

**BOARD-7** · low · plausible · `src/sticker-board/StickerBoard.tsx:300`  
Saves of one sticker's placement carry no order: overlapping PATCHes can be applied out of order on the server, and their answers can settle out of order in `unsaved`, so an older save's success clears the warning about a newer failed one.

- Trigger: A held arrow key commits and saves on every keydown repeat, and a drag followed by a quick nudge saves twice, so several PATCH /api/sticker-boards/me/sticker-placements/:id requests for one sticker are in flight together. If the older one is applied last, the server keeps the older spot and the next board open moves the sticker back. If the newer save fails and the older succeeds afterwards, setUnsaved deletes the id, and the 'didn't save' note and Try again disappear while the spot on screen is unsaved.
- Confirm by: Hold an arrow key on a selected sticker over a throttled HTTP/1.1 connection (or delay one PATCH in a proxy) and check the stored placement against the one on screen, then reopen the board; or fail the second of two PATCHes with a 500 while delaying the first, and watch the unsaved note vanish.
- Fix: Keep one save in flight per sticker, sending only the latest placement once it settles, and let only the latest save's answer set or clear its `unsaved` entry.

## Sticker tray

8 findings: 0 high, 2 medium, 6 low.

**TRAY-1** · medium · confirmed · `src/sticker-board/tray/trayEngine.ts:1372`  
The pulled-out sheet's pointerup clears ui.g even when it belongs to a stack gesture held by another finger, so that stack peel is never dropped and its flyer stays frozen over the board.

- Trigger: With a sheet pulled out, finger A starts peeling a sticker from the stack (ui.g = A's gesture). Finger B taps the pulled-out sheet: its pointerdown checks only its own local `g`, so it starts a 'maybe' press. B lifts: `up` sets `ui.g = null` (and a tap on a sticker quick-adds it). A lifts: stackUp finds ui.g null and returns, so dropPeel never runs. The person sees A's sticker frozen over the board where the finger left it, its rAF loop running every frame until the board unmounts, and its slot on the stack left 'peeling' until the next re-render. The sticker is not placed; nothing is lost.
- Fix: In bindPulled's up, clear ui.g only when it is this gesture (`if (ui.g === done) ui.g = null`), and have the pulled sheet's pointerdown refuse while ui.g is set, as the stack's does.

**TRAY-2** · medium · confirmed · `src/sticker-board/tray/trayEngine.ts:1406`  
Sending the pulled-out sheet home while a sticker is being peeled from it removes the sheet's pointerup/pointercancel listeners, so that peel never ends: its flyer stays frozen over the board and ui.g stays set, which locks the whole sticker tray stack until the person leaves the sticker board.

- Trigger: Pull a sheet out and start peeling a sticker from it (finger A down, ui.g = the pulled sheet's gesture). A second finger taps the Zipper's pull: the Zipper's onDown has no guard for a gesture elsewhere, its tap shuts the tray, 'commit' {open:false} calls sendHome, which aborts the listeners. On a desktop the same happens with Escape held during a mouse peel (escape() -> zip.close()) or Enter on the focused depth button (openSpread -> sendHome). Finger A lifts: `up` is gone, so dropPeel never runs. The person sees the peeled sticker frozen over the board while the same sticker is back on the re-rendered stack; every press on the stack is ignored (no paging, peeling, pulling or tap-to-add), and the flyer's rAF loop runs every frame. Touch pointer IDs are new per touch, so nothing recovers until the board unmounts (App.tsx renders StickerBoard only while view === 'board', so a tab change and back clears it). With a mouse, a later click on the stack recovers by accident, because the mouse's pointerId repeats and stackUp matches it.
- Fix: Give the tray one routine that ends whatever gesture holds ui.g (cancel the peel's frame, lay the flyer back, clear ui.g), and call it from sendHome before aborting the pulled sheet's listeners.

**TRAY-3** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:244`  
Sticker sheet feet and sheet labels date stickers by the device's own time zone, while the tray's NEW and Explore's day badges use the Tokyo day, so on a phone not set to Tokyo time the dates disagree by a day near midnight.

- Trigger: On a phone set to UTC, a sticker that arrives at 23:00 JST on 9.29 (14:00 UTC) and is looked at at 08:00 JST on 9.30 (23:00 UTC 9.29) shows 9.29 on its sheet's foot, today by the phone's calendar, yet is not NEW, because in Tokyo it arrived yesterday; Explore shows the same sticker under Tokyo days. sameDay also merges or splits a sheet's date range on local midnight. Phones set to Tokyo time are unaffected.
- Fix: Build monthDay and sameDay on the Tokyo day (ticketDayNumber and dayBadge from explore/pileDays.ts, or one shared Tokyo-day formatter), as NEW and Explore already do.

**TRAY-4** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:688`  
redraw() re-renders the pulled-out sheet even mid-peel, which replaces the peeled slot's element and drops its 'peeling' state, so the sticker shows on the sheet while it is also in the person's hand.

- Trigger: Peel a sticker from the pulled-out sheet while the board's stickers change (StickerTray refreshes on every stickers change, for example when an earlier tap-to-add's placement lands). rerenderPulled rebuilds the sheet from the model, where the slot is still 'here', so the sticker shows both on the sheet and in hand for the rest of the peel, and bindPulled's `slot` points at a detached element. The drop finds the new element by id (setSlotState), so it ends consistent; the glitch is visual.
- Fix: Skip rerenderPulled while a gesture holds the pulled sheet and render it when that gesture ends, or carry the peeling slot's state into the render.

**TRAY-5** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:689`  
A refresh that arrives while a finger is on the stack or a page turn or tab shuffle runs is dropped: redraw skips renderStack and never marks the stack stale, so the stack keeps showing stickers as they were until some later re-render.

- Trigger: The tray is open and the stickers change (StickerTray calls refresh on every change of its stickers prop: a placement lands, a gift is received or given, a sticker is sealed) while ui.g or ui.busy is set. The model updates but the stack is not redrawn. If the press ends in a tap, a settle or a drop back into the tray, or the change came during page(-1) (which renders before its animations) or after setFilter's mid-way render, nothing renders again: a new sticker is missing, a given one still shows as pressable, a placed one keeps its old state, until the next page turn, tab change or pull.
- Fix: Mark the stack stale when redraw skips it, and render a stale stack when ui.g is cleared (stackUp and the pulled sheet's up) and when page() and setFilter clear ui.busy.

**TRAY-6** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:877`  
A folder tab tapped during a forward page turn renders the new filter at once, then the turn's continuation rotates that new order by one, so the newest matching sheet goes to the back instead of the front.

- Trigger: Swipe the front sheet up (page(1), about 350 ms of animation with ui.busy set) and tap Gifts before it ends. setFilter sees ui.busy, resets the order to the gift sheets newest first and renders at once. page(1) then resumes and runs `ui.order = turned()`, which reads the new order, so renderStack puts the second-newest gift sheet in front and the newest at the back. The person can page to it.
- Fix: Have page() take the order it turns when it starts and apply the turn only if ui.order is still that order, or let setFilter cancel a running turn through a token as it does for its own shuffle.

**TRAY-7** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:1029`  
PageDown and PageUp call page() with no busy check, so a held or repeated key starts turns that overlap each other and a tab shuffle, and the first to finish clears ui.busy while the rest still animate.

- Trigger: With focus in the stack (a keyboard), hold PageDown: each key repeat starts another page(1) on the same front sheet while a turn takes about 350 ms. The sheets jump and flicker instead of turning; the first turn to end sets ui.busy = false, so a press can start mid-turn and have the stack re-rendered under it. PageDown during a tab shuffle re-renders the stack mid-shuffle, setFilter keeps animating detached sheets, and its deal renders from the rotated order, so the newest match may not be in front. The end order still reflects the number of key presses; the harm is visual.
- Fix: Return from the PageDown/PageUp handler (or from page() itself) while ui.busy or a shuffle is running, or queue a single pending step.

**TRAY-8** · low · plausible · `src/sticker-board/tray/zipper.ts:1278`  
The Zipper sends pointercancel through its release path, where a short, still press counts as a tap, so a touch the browser or OS cancels opens or shuts the sticker tray.

- Trigger: A finger lands on the Zipper's pull and the system cancels the touch within 400 ms and before it moves 4 px. onUp runs for the pointercancel, computes tap = true and runs the opposite of the tray's state, so the tray opens or shuts though the person never let go on the pull. touch-action: none on the pull (zipper.css:272) rules out scroll and zoom cancels, so only system cancels remain; the person can undo it with one more tap.
- Confirm by: On an iPhone in LINE, log pointercancel on the pull and touch it just as a system gesture takes the touch (Notification Center from the top edge, a LINE banner, an incoming call); the tray toggling on that cancel confirms it.
- Fix: Give pointercancel its own handler that clears the grab and runs back to g.startOpen, never counting it as a tap.

## Giving and receiving

10 findings: 1 high, 3 medium, 6 low.

**GIFT-1** · high · plausible · `src/giving/giveFlow.ts:163`  
The wait on LINE's picker has no timeout, and while it runs the close button, the scrim, Escape and Back all refuse to close Giving, so a picker promise that never settles leaves the giver on a Giving screen that covers the whole phone.

- Trigger: If LINE's WebView drops the pending shareTargetPicker promise (for example, LINE backgrounded on iOS with the picker open), `await sender.send` never settles, the step stays 'picking', busy stays true, Send in LINE and Take it out are disabled and close() does nothing; Giving is portaled over the phone, tabs included, so the only way out is closing the LIFF window, which reloads the app. The gift is never marked sent or cancelled.
- Confirm by: On an iPhone and an Android phone inside LINE, open the picker, background LINE (or lock the screen) for a while, return, and see whether the shareTargetPicker promise ever resolves or rejects.
- Fix: Let the picking step be left: re-check on visibilitychange or after a generous timeout, and offer a way back to the bag that records the outcome as unknown instead of disabling every exit.

**GIFT-2** · medium · confirmed · `src/giving/giftBackend.ts:129`  
When a gift's deposit never went out (for example the smart wallet wasn't ready), Take it out always fails, and the takingOut flag it leaves behind sends every later Send in LINE through the same failing take-out, so the giver can't send or take out that sticker until they reload the page.

- Trigger: Giver taps Send in a LINE chat; POST /api/gifts answers 201 with a token and an escrowTransfer; transactions.deposit reads escrow status 0 and waitForSmartWallet rejects (smart_account_not_ready, or line_token_expired), so nothing is broadcast and the giver sees 'NO.x couldn't be packed'. Take it out: attempts[giftId] is {escrowed: true} with no depositHash, so transactions.takeOut reads status 0 and throws GiftTransactionUnconfirmedError('takeOut') before api.takeOutGift runs: 'NO.x couldn't be taken out: Taking out the Sticker could not be confirmed...'. Send in LINE then repacks, sees previousAttempt.takingOut, skips the deposit that would now succeed, and calls the same take-out: 'couldn't be packed: Taking out the Sticker could not be confirmed'. attempts is module-level, so closing and reopening Giving doesn't help; only a reload does, and after it the recovery deposits, takes out and deposits again.
- Fix: Record in the attempt whether a deposit was ever submitted (the submitted callback), and when none was, let Send in LINE retry the deposit instead of the take-out, and clear takingOut when a take-out fails before sending anything.

**GIFT-3** · medium · confirmed · `src/giving/giftBackend.ts:157`  
After a Gift Message went out but its 'sent' report failed, the gift stays packed on the server and the sticker looks un-given on the board; giving it again after a reload takes the old gift out on chain and packs a new one, so the friend's first message now says the giver took it back.

- Trigger: Giver sends the Gift Message through LINE's picker; POST /api/gifts/:id/shared {outcome:'sent'} fails, so Giving shows 'Sealed and sent' with a couldn't-record line and the server keeps the gift 'packed'. The board treats a packed gift as not on its way, so the sticker keeps its Give control. After a reload (the Gift Claim Token lived only in the in-memory attempts map), Give -> Send in a LINE chat -> POST /api/gifts answers the open packed gift with giftClaimToken null -> pack() runs its recovery: on-chain takeOut, POST take-out (status taken_out), then a new gift. The friend opens the first message and sees '@giver took this one back'; only the second message works, and if the giver cancels the picker the friend has only the dead link.
- Fix: Retry the 'sent' report (keep it with the gift until it lands) rather than dropping it after one failure, and have the recovery ask before taking out a gift whose sent report may have failed, or have the server treat a packed gift whose deposit has landed as possibly sent.

**GIFT-4** · medium · confirmed · `src/giving/giveFlow.ts:219`  
When POST /api/gifts itself fails, no gift exists, yet Take it out rethrows the packing error as 'couldn't be taken out' every time instead of returning to the give sheet.

- Trigger: Giver taps Send in a LINE chat for a sticker the server refuses (409 not_minted right after sealing, 403 adults_only for an NSFW sticker picked for a non-adult, 409 gift_in_transit) or the request drops; api.packageGift rejects before pack()'s try, so the error is a raw ApiError, not a GiftPackagingError; the screen reads 'NO.x couldn't be packed: <reason>'. Take it out: `await a.gift` rejects with that ApiError, which is rethrown, so the screen reads 'NO.x couldn't be taken out: <same reason>'. The attempt stays the failed one, so every Take it out repeats it. Send in LINE (a fresh pack) or closing Giving are the only ways out.
- Fix: In giveFlow's takeOut, treat an attempt whose pack rejected without a GiftPackagingError as having no gift: skip backend.takeOut, clear the attempt and return to the give sheet.

**GIFT-5** · low · confirmed · `deploy/serve.py:104`  
serve.py's log redaction only matches a literal /g/ in the request line, so LIFF's primary redirect, GET /?liff.state=%2Fg%2F<token>, writes every opened Gift Message's Gift Claim Token unredacted into the sticker-board journal.

- Trigger: A friend taps Open your gift. LINE opens https://liff.line.me/<liffId>/g/<token> and its primary redirect loads the endpoint with the path percent-encoded into liff.state; that first page load reaches serve.py, whose log line keeps the token because '%2Fg%2F' isn't '/g/'. LIFF's init then does the secondary redirect to /g/<token>, the only line that gets redacted. Scratch run of the file's own regex: '"GET /?liff.state=%2Fg%2F0xabab...ab HTTP/1.1" 200 -' comes out unchanged, while '"GET /g/0xabab...ab ..."' becomes '/g/<gift-claim-token>'. Who can read it: the sticker-board unit isn't in /api/logs, so only people with a shell on the box (journalctl -u sticker-board, per deploy/README.md) see it, and they already hold the server's claim-signing sealer key. It breaks the Gift Claim Token's promise (the token lives only in the Gift Message) and the file's own comment, but exposes it to no one who couldn't already move the gift; low.
- Fix: Redact after urllib.parse.unquote, or match the token itself (0x followed by 64 hex digits), so the liff.state query and the /g/ path are both covered.

**GIFT-6** · low · confirmed · `src/offers/OfferSheet.tsx:111`  
On someone else's sticker board, the offer sheet's credit line and the give sheet's NSFW note print handles in capitals: both sit in .fine paragraphs, and neither has a .handle span or a text-transform reset.

- Trigger: Open someone's board from Explore, tap a sticker, then Offer: the credit reads 'BY @MIKA.DRAWS · @KEN HOLDS IT' (Japanese too: 作者：@MIKA.DRAWS). Tap Give while you hold an NSFW sticker and their age status isn't adult: the note ends '... AND @KEN ISN'T.'
- Fix: Print every handle through one renderer that wraps it in the .handle span (a Handle component passed to <Trans> as a slot), and use it on these two lines.

**GIFT-7** · low · confirmed · `src/receiving/ReceiveGiftDialog.tsx:60`  
A gift opened from the board skips the server's preview and is always treated as receivable, so one taken back, expired or received since the list loaded is unpackaged and its sticker revealed before Accept is refused.

- Trigger: Receiver's board loads GET /api/gifts/for-you; the giver then takes the gift out (or it expires); the receiver taps the gifts-for-you badge; previewOfWaiting says receivable, so the sealed bag and pull tab show; tearing it reveals the sticker; Accept calls POST /api/gifts/:id/receive, which refuses 409 taken_back or 410 gift_expired, and the refusal screen ('@giver took this one back') replaces the revealed sticker. NSFW stays guarded: the server set forUserId only for an adult or a non-refused opener.
- Fix: Open a waiting gift through a server read by gift ID (the same checks previewGift runs) before showing the pull tab, or at least check expiresAt and refetch the list when the badge is tapped.

**GIFT-8** · low · confirmed · `src/receiving/usePullTab.ts:170`  
The pull tab's drag ignores pointerId: a second finger on the tab re-anchors the drag, the first finger's moves are then measured from the second finger's x, and whichever finger lifts first springs the tear back.

- Trigger: Receiver drags the pull tab with one finger and a second finger lands on the tab: onPointerDown overwrites p.drag with the second finger's x, so the first finger's next move jumps the tear by the distance between the fingers; lifting either finger runs release, and unless the tear had already snapped it springs back to 0 and the receiver starts again.
- Fix: Keep the dragging pointer's id in p.drag, ignore pointerdown while a drag is live, and let only that pointer's move, up and cancel drive or end it.

**GIFT-9** · low · plausible · `src/giving/giftBackend.ts:168`  
A reload while the deposit's user operation is still pending makes the recovery send the escrow transfer a second time, but the removed store didn't prevent this either: it saved depositTxHash only after the send resolved, which is after inclusion; the second send most likely costs one transient 'couldn't be packed' error.

- Trigger: Giver taps Send in a LINE chat; wallet.sendTransaction submits the user operation and waits for its receipt; LINE's WebView reloads before inclusion. The next Give runs the recovery with no known hash; statusOf reads 0 while the first operation is pending, so deposit() sends again. The second user operation reuses the account's pending nonce, so the bundler rejects it or replaces the first; a rejection lands in the catch, which reads the status again and either returns (1) or throws depositUnconfirmed: 'NO.x couldn't be packed: The Sticker transfer could not be confirmed. Tap Send in LINE to check the gift again.' Tapping again finds status 1 and continues. Once the operation is included, sendTransaction has returned and a reload finds status 1 (giftTransactions.ts:137), so the window HEAD leaves open is only the pending one, the same window the old code had.
- Confirm by: On Sepolia, reload the page while a gift's deposit user operation is pending in Pimlico's mempool, give the same sticker again, and read the bundler's answer to the second operation (same-nonce rejection, replacement, or a second inclusion) in the console and on the EntryPoint's events.
- Fix: Persist the user operation hash (or a 'deposit submitted' mark) with the gift before waiting on its receipt, and have the recovery wait on that operation instead of sending a new one; correct the comment at giftBackend.ts:168 either way.

**GIFT-10** · low · plausible · `src/giving/noticedGifts.ts:12`  
When localStorage throws, every read returns an empty set and every save only logs, so the giver sees the same gift-received notice on every board load; the unscoped key itself is harmless, since each entry is one sticker's receive time.

- Trigger: In a WebView where localStorage throws on access (storage disabled) or on write (quota full), newestUnnoticed finds the newest received gift unnoticed every time and markNoticed can't save, so the notice repeats on each visit. A second account on the same device can't be affected by the first's set, because entries are `stickerId@receivedAt`, which name one receive of one sticker.
- Confirm by: Check whether LINE's in-app browser on iOS or Android ever throws on localStorage access or write (storage disabled, private mode, quota); if it never does, this doesn't happen.
- Fix: Keep the noticed set on the server with the giver's stats, or at least hold it in memory for the session so a failed save doesn't repeat the notice on each board load.

## Gratitude Mini-game

13 findings: 1 high, 2 medium, 10 low.

**GRAT-1** · high · confirmed · `src/gratitude/gratitudeOutbox.ts:5`  
The Gratitude outbox is one device-wide localStorage list, so when someone else signs in with the same browser storage, App resends another person's kept combos under the new session, the server refuses them 403 not_receiver, and the outbox deletes them for good.

- Trigger: Person A plays the Mini-game on a gift they received and the POST /api/gratitude gets no answer or a 5xx (or the page closes mid-request), so the combo stays under draw.gratitude.pending. Before A opens the app again, person B signs in with the same browser storage (LINE Login in a browser outside LINE after A logs out, or ?as=b on the dev server). App's start effect runs resendPendingGratitude under B's session; the gift was received by A, so the server answers 403 not_receiver; isRefusal treats every 403 as final, and forget() drops A's combo. A's gift never gets its Gratitude, the giver gets none, and nothing on A's side says so (only a console.error in B's session). The sticker detail, which reads the server, offers Send gratitude on that gift again (sticker-board/StickerDetail.tsx:126-128 `owedGratitude(loaded)`), so A can play again only if A notices; the combo A played is gone.
- Fix: Key the outbox by the signed-in person (draw.gratitude.pending.<userId>, as spendKey.ts does), so the start-up resend sends only that person's combos and another person's are never sent or dropped.

**GRAT-2** · medium · confirmed · `src/gratitude/touchInput.ts:86`  
A second thumb that passes the slop while the first thumb is stroking is marked dragged but never becomes the stroke finger, even after the first lifts, so none of its strokes count until it lifts and touches down again.

- Trigger: In a stroke combo the person switches thumbs with overlap: thumb B lands and moves before thumb A lifts. B's grab.dragged turns true while strokeFinger is A. When A lifts, strokeFinger goes back to null, but B's later moves skip the `!grab.dragged` block and fail `e.pointerId === strokeFinger`, so onStrokeStart and onStrokeMove never run for B; B's lift is not a tap either. B's passes add no hits, the bar drains and the combo can end while the person is still stroking. Scratch run (touch.ts, tsx): A down/move, B down t=30, B move t=40, A up t=50 -> strokeEnd, then B moves at t=60, 70, 80 and B up at t=90 produce no strokeStart, strokeMove or tap.
- Fix: When the stroke finger lifts, hand the stroke to a finger already dragging (call onStrokeStart for it from its current point), or start a stroke on a dragged finger's next move whenever strokeFinger is null.

**GRAT-3** · medium · plausible · `src/gratitude/miniGameEngine.ts:1101`  
A combo in play is kept on the device only when it ends, and it ends from outside only on visibilitychange (hidden) or pagehide, so a webview torn down without either event loses the combo in progress.

- Trigger: The person is mid-combo and LINE destroys the in-app browser (closing it, or Android reclaiming it) without firing visibilitychange or pagehide. Nothing was written: draw.gratitude.pending stays empty and no POST /api/gratitude goes, so the gift gets no Gratitude. When either event does fire, the write is synchronous (handle -> `void end(e, hidden)` -> onRecord before any await -> sendGratitude writes localStorage), so the loss needs a teardown with neither. The sticker detail offers Send gratitude on the gift again, so the person can play again, but the combo they played is gone.
- Confirm by: On Android LINE and iPhone LINE, close the LIFF browser mid-combo (the X, and swiping LINE away), reopen, and check draw.gratitude.pending and the server log for POST /api/gratitude; a console or performance-recorder note in onHidden/onPageHide would show whether either event ran.
- Fix: Keep the combo in progress in the outbox as it plays (a provisional record from the first hit, updated on a throttle), so any teardown leaves something to send when the app next opens.

**GRAT-4** · low · confirmed · `src/gratitude/heartMotion.ts:419`  
The fly-to-giver stretch divides by a local `scale` that is always 1 and uses per-frame displacement, so it is weaker on a replay stage and on high-refresh phones, and capped on slow frames.

- Trigger: Every landing: step() declares `let scale = 1` (:407), shadowing the stage scale, before :419 reads it, and vx/vy are this frame's displacement. Scratch run of createHeartMotion with the same layout scaled: peak stretch 1.500 at stage scale 1 and 60 Hz, 1.307 at 120 Hz, 1.500 at 30 Hz; 1.423 at stage scale 0.69 and 60 Hz, 1.212 at 120 Hz. So a 120 Hz Android WebView shows a visibly softer smear into the giver's picture than a 60 Hz phone, and a replay card's is softer than the live game's.
- Fix: Rename the per-frame size local, and compute the stretch from speed in px/s (displacement / dt) over FLIGHT.stretchPx × the stage scale.

**GRAT-5** · low · confirmed · `src/gratitude/heartMotion.ts:532`  
Turning on reduced motion mid-game while the heart is tilted freezes its sway and tilt angles, and they stay added to its rotation, so the heart sits tilted until the combo's end fades it.

- Trigger: Hold the phone rolled during ready or tap play so tilt.now and sway.angle are nonzero (up to 8° and 10°), then switch on the OS reduce-motion setting. useReducedMotion follows it live and setReduced(true) runs. The block that eases sway and tilt (:525-531) needs !state.reduced, so both freeze; :532 still adds them every frame. calm() and stopSway() only zero the targets and drive, and comeLoose() (which zeroes the angles) is skipped with reduced. The reduced ending fades the heart in place, still tilted. Rare: needs the setting changed mid-game.
- Fix: With reduced motion, ease sway.angle and tilt.now back to 0 (or zero them in setReduced) instead of freezing them.

**GRAT-6** · low · confirmed · `src/gratitude/miniGameEngine.ts:571`  
A replay whose combo reached オーバーヒート with taps or shakes leaves 昇天's rain piled on the card after the landing, and the replay's frame loop never sleeps while the card is open.

- Trigger: Open a Transfer Trail card whose recorded tap or shake combo reached tier 3, with reduced motion off. Odd hits at tier >= 3 call physics.rainFromTop(); each rain body that settles gets fadeDue.at = Infinity. The replay's end() lands the heart and calls finish(record) without sighAndTidy, so physics.clear() never runs, physics.hearts.length stays above 0, and the loop's sleep condition never holds. The person sees the rain hearts stay piled behind the landed heart for as long as the card is open, and the phone keeps running a frame loop (heart.step, HUD step, style writes) every frame until the card scrolls out of view or closes.
- Fix: When a replay lands, melt the physics' pile (give resting rain a finite fadeDue once the combo has ended, or clear the physics and the mini heart layer after landHeart) so hearts.length reaches 0 and the loop sleeps.

**GRAT-7** · low · confirmed · `src/gratitude/miniGameEngine.ts:986`  
With reduced motion on, any phone movement over 1.5 m/s² still makes the heart jelly-wobble before a shake starts, which the design doc lists as a motion-allowed effect.

- Trigger: Reduced motion on, game in ready or tap play: moving the phone (picking it up, walking) calls heart.wobble(min(0.1, |a| × 0.005)); step() applies the jelly with no reduced check, so the heart squashes and stretches by that share at JELLY.pace 17 rad/s (about 2.7 Hz) and dies away. Everyday movement gives a small wobble (1 to 2%); a hard jolt up to 10%. The pre-shake reversal jiggle (:991) and countReversal's reduced jiggle (:971) are also ungated; the latter is deliberate, the ambient wobble contradicts the doc.
- Fix: Skip the ambient wobble in onMotion when reduced (keeping countReversal's deliberate reduced jiggle), and state in the doc's reduced-motion list that a counted shake still jiggles the heart.

**GRAT-8** · low · confirmed · `src/gratitude/replayRecorder.ts:149`  
A replay drops the stroke samples before the first hit, but the live stroke detector kept their fast-pass streak, so a tap combo that switched to stroke on its first pass after the tap switches one pass later in its gratitude replay and counts different hits.

- Trigger: While the heart is ready, the person makes 1 to 4 fast passes (fewer than unlockPasses 5, so nothing unlocks), lifts, taps to start the combo, and strokes again within pauseMs (900 ms) of the last fast pass. Live, the engine's one detector still holds the streak, so the first fast pass after the tap has fastStreak >= unlockPassesMidCombo (2) and unlocks stroke. The recorder keeps only samples from the first hit on, and the replay's fresh engine starts at streak 0, so its first pass has fastStreak 1 and it unlocks a pass later (startsWithStroke is only for switchedAtHit 0). In the Transfer Trail's open card the replay counts differently, the HUD snaps to the stored total at the end, and a console warning names the gift.
- Fix: Have the replay force the unlock at the recorded switchedAtHit (as it already does for 0), rather than re-deriving it from a streak whose earlier passes the record doesn't keep.

**GRAT-9** · low · confirmed · `src/gratitude/tierSlamAndPopIns.ts:364`  
place()'s `scale` parameter is the word's shrink step, which shadows the stage scale, so on a replay card the pop-in words' side and foot margins and sideways drift stay at the live game's px.

- Trigger: On a replay card (stage scale s = card width / 390, below 1), a full-size pop-in keeps 8 px from the sides, 16 px from the foot and drifts 26 px sideways, where 8s, 16s and 26s px match every other lettering distance; the words drift proportionally further across the small card. In the live game a word shrunk to minScale gets smaller margins and drift than a full-size one. The margins and drift are clamped to the screen, so nothing leaves the stage; it is only a proportion difference.
- Fix: Rename place()'s parameter to the word's shrink and multiply EDGE_PX, FOOT_PX, the 2 px top gap and the 26 px drift by the stage scale.

**GRAT-10** · low · confirmed · `src/gratitude/tierSlamAndPopIns.ts:420`  
The stroke unlock's "!?" slam is never measured, so its left edge is placed from a 2 em guessed width and the word lands left of the screen's center on every stroke unlock.

- Trigger: Start stroking the heart to unlock stroke: unlockStroke calls lettering.slamTierName("!?", ""). measure() probes only the pop-in words and tier names, so wordSize("!?") falls back to 2 × WORD_EM_GUESS = 2 em. With px = 58 × grow (grow = (0.86 + 0.28 × intensity) × stage scale), x = (screen.width - 2 em × px) / 2, while the caption's real box is only as wide as the two half-width Latin glyphs (.gr-cap is absolute, nowrap, so it shrinks to its text). The word's middle sits (2 em - real width) / 2 × px left of center: at half-width glyphs (1 em together, unmeasured estimate) and grow 1, about 29 px left on a 390 px screen. ポンッ is also unmeasured, but its guess of 1 em per full-width kana is close.
- Fix: Measure every text the engine slams (add "!?" and "ポンッ" to the probe's word set, ideally from one exported list the engine and letteringCharacters share).

**GRAT-11** · low · plausible · `src/gratitude/gratitudeOutbox.ts:54`  
If draw.gratitude.pending ever holds a value that fails the shape check, readPending returns an empty list and the next finished combo overwrites it, deleting whatever combos it held, with only a console line.

- Trigger: The mechanism is real: one failing entry or unparseable JSON reads as empty, resendPendingGratitude sends nothing, and sendGratitude writes `[newCombo]` over the raw value. The stated trigger is not: the key's only writer is writePending, which stores RecordGratitude bodies, and the check (idempotencyKey and giftId strings) is the same as in the commit that introduced the key (e87041bf), so no older build wrote another shape. It needs storage the app didn't write (manual edits, corruption).
- Confirm by: Find a writer of draw.gratitude.pending other than writePending, or a stored value that fails isRecordGratitude on a real device.
- Fix: Keep the entries that pass the check and leave an unreadable raw value in place (or move it aside under another key) instead of overwriting it with the next combo.

**GRAT-12** · low · plausible · `src/gratitude/miniHeartLayer.ts:38`  
Baking the mini heart art has no onerror and caches the entry before it loads, so an art image that fails to load leaves that tone's hearts (or the rain) undrawn for the rest of the session, with no log.

- Trigger: If an art Image fails (a policy blocking data: images, or a decode failure), art[i] stays null, paint() skips every heart of that kind with `if (!image) continue;`, and baked.set(dpr, art) has already cached the array, so no retry for that pixel ratio. No trigger found in this app: svgDataUrl encodes with encodeURIComponent and no Content-Security-Policy is set in apps/frontend/index.html, deploy/ or apps/api/src. `baked` keyed by dpr × stage scale is never evicted, but a device shows one or a few card widths, so its growth is small.
- Confirm by: Load the game in LINE's in-app browser on iOS and Android with a blocked or failing data: SVG (or a CSP from LINE's WebView) and check whether mini hearts are missing; otherwise it stays a hardening gap.
- Fix: Add img.onerror that logs the failure and drops the cached entry (or retries) so a failed bake is visible and recoverable.

**GRAT-13** · low · plausible · `src/gratitude/miniHeartLayer.ts:180`  
The mini-heart layer's two stage-sized canvases are painted empty and detached on destroy but never zeroed, so each Mini-game or gratitude replay mount leaves two backing stores counted until garbage collection.

- Trigger: Each Mini-game played and each gratitude replay opened in the Transfer Trail builds two new canvases, filling the stage at up to DPR 2. The engine's destroy paints them empty and replaceChildren detaches them, with no width or height reset. They count toward iOS's canvas budget until collected, alongside the drawing screen's ink and checkpoints.
- Confirm by: Open and close many gratitude replays on an iPhone while watching canvas memory in Web Inspector. These canvases are smaller than the ink, and JavaScriptCore reports their cost to its collector, so a visible failure is unlikely.
- Fix: Add a release() to MiniHeartLayer that zeroes both canvases and disconnects its ResizeObserver, and call it from the engine's destroy in place of clear().

## Explore

3 findings: 0 high, 1 medium, 2 low.

**EXPL-1** · medium · confirmed · `src/explore/ExploreScreen.tsx:563`  
A name link (/@label) opens that person's sticker board again on every later visit to the Explore tab, because App keeps passing the same boardOf and OpenBoardOf's once-only guard is a ref that a remount resets; a link to your own name sends you from Explore back to your board every time.

- Trigger: Open the app from /@alice: Explore opens alice's board (correct). Tap My Board in the tab bar, then Explore: ExploreScreen mounts again, OpenBoardOf mounts with opened.current = false, useApiQuery fetches ens-person/alice again (it keeps no cache) and calls open(), so alice's board covers Explore again, on every Explore visit until a reload. If the lookup failed, its 'couldn't find alice.croquis.eth' alert reappears each visit. If the label is the person's own, open() calls onOpenMyBoard, so tapping Explore bounces to My Board every time and Explore can't be used until a reload (arguably high for that case).
- Fix: Consume the name link once in App: hold boardOf in state and clear it when OpenBoardOf opens the board or reports the failure, instead of guarding with a ref inside a component that remounts.

**EXPL-2** · low · confirmed · `src/explore/ExploreScreen.tsx:500`  
The artist search finds its match in handle.toLowerCase() and slices the original handle at that index, so a handle with a character whose lowercase is longer (U+0130 'İ') gets the highlight on the wrong letters.

- Trigger: A handle 'İzmirArt' searched with 'art': the lowercased string is one code unit longer, `at` is 6, and the result row shows '@İzmirA' plain, 'rt' marked and nothing after. Scratch run (highlight.ts, tsx): `{ handle: 'İzmirArt', query: 'art', at: 6, before: 'İzmirA', mark: 'rt', after: '' }`. Handles may be any script (apps/api/src/session/handles.ts), so it is possible but rare.
- Fix: Find the match on a case-folded copy whose indexes map back to the original (fold per code point and keep an index map), or match with a case-insensitive RegExp on the original handle.

**EXPL-3** · low · confirmed · `src/explore/LiftedSticker.tsx:149`  
The lifted sticker's caption prints its sealed day in the device's time zone while the pile files it under its Tokyo day, so the two dates disagree on a phone set to any zone but JST.

- Trigger: Phone set to Asia/Bangkok: a sticker sealed at 00:30 JST on 9.26 (2026-09-25T15:30Z) sits under the pile's '9.26' badge, and lifting it shows '2026.09.25'. Scratch run (day.ts, tsx): `Asia/Bangkok { caption: '2026.09.25', badge: '9.26' }`, `Asia/Tokyo { caption: '2026.09.26', badge: '9.26' }`.
- Fix: Make formatDay (and formatMonthDay) print the Tokyo day, from ticketDayNumber or with timeZone 'Asia/Tokyo', so every date in the app uses the days the server and the pile use.

## Tickets, the Shop and payments

9 findings: 5 high, 1 medium, 3 low.

**TIX-1** · high · confirmed · `src/payments/jpyc.ts:86`  
When waitForTransaction rejects after Sui has executed a ticket payment, payForTickets throws without the digest, so the checkout never keeps the payment or asks the server for its tickets.

- Trigger: signAndExecuteTransaction returns a successful Transaction (the JPYC is in the vault), then waitForTransaction reaches its 60 s timeout because every getTransaction poll fails (the phone's connection drops, or the fullnode behind the public URL doesn't serve the digest). The checkout shows Payment failed with the timeout's message and a key back to the packs. Nothing is kept, POST /api/ticket-purchases is never sent, nothing retries, and the person may pay again.
- Fix: Keep the payment as an unadded purchase as soon as its digest is known, before the wait (the same change that fixes tickets-2), so a failed wait leaves a kept payment that the checkout asks for again.

**TIX-2** · high · confirmed · `src/sticker-creation/DrawingScreen.tsx:510`  
After a failed spend on the drawing screen, the sheet still reads fresh to the board, so Draw on the board spends a ticket that the drawing screen never takes; the ask card's Start then spends a second ticket for the same sticker.

- Trigger: A spend on the drawing screen fails (a network timeout or 409 ticket_kind_changed), which sets startProblem. The person goes to the board; DrawingScreen stays mounted and startProblem stays set. Phase is blank and spending is false, so the sheet is 'fresh', and Draw with a daily ticket left calls spendForSheet('daily'). That spend lands and its key is cleared. The canvas opens, but the spendAtOnce effect returns early on startProblem, so takeSheetSpend is never called. The ask card shows the old failure note, and its Start calls start(kind) with no `spent`, so tickets.spend makes a new key and spends a second ticket. The first spend sits in sheetSpend.current until a later board Draw overwrites it, or a reload drops it. If the board's spend took the last ticket, Start fails with no_tickets_left and the person is left with no ticket and no sticker.
- Fix: Let spendAtOnce take a waiting sheet spend even while startProblem is set, and clear startProblem when one arrives. Or report the sheet as 'held' to the board while a start problem stands.

**TIX-3** · high · confirmed · `src/tickets/unaddedPurchases.ts:39`  
A paid pack's tickets depend on this phone's localStorage holding the payment's digest until the server adds them. The server never looks up vault payments itself, so a payment whose tickets call failed is lost if that storage goes.

- Trigger: The person pays JPYC. The tickets call then fails (5xx, timeout or no answer, all kept for asking again), and before any later ask succeeds, the phone's storage goes (a new phone, LINE reinstalled, or its data cleared). The JPYC is spent, no tickets arrive, and the purchase never appears in the ticket purchases list. The 10-payment cap is almost unreachable, because the checkout opens on a payment that's still kept.
- Fix: Have the server record the payments to the vault itself, either from the vault's payment events or from a purchase intent recorded before signing, and add their tickets, so the client's kept digest becomes only a way to ask sooner.

**TIX-4** · high · plausible · `src/payments/jpyc.ts:73`  
The 60 s withTimeout race stops waiting for signAndExecuteTransaction but doesn't cancel it, so a slow payment that still executes is shown as failed, with no digest kept or credited.

- Trigger: Building the transaction (coin selection, gas price), Privy's signRawHash and executeTransaction together take more than 60 s: a slow phone network or Privy's iframe waking up. The timer rejects with 'Sui didn't answer the payment in time…', but the build, sign and execute chain keeps running and submits the payment. The checkout shows Payment failed, nothing is kept, and the server is never asked. The JPYC is in the vault, and the only recovery is by hand.
- Confirm by: In a scratch test, give payForTickets a signer whose signing resolves after PAYMENT_TIMEOUT_MS: the promise rejects while execute still runs. Or find a 'didn't answer the payment in time' report followed by a PaymentReceived event for that wallet in the Shop's purchases list.
- Fix: Build and sign first, take the digest from the signed bytes (tx.getDigest()), keep it as an unadded purchase, and only then execute and wait, so any failure after signing leaves a kept payment that the checkout asks for again (a not-yet-found digest then needs tickets-3's fix).

**TIX-5** · high · plausible · `src/tickets/unaddedPurchases.ts:42`  
The app treats 422 as a refusal for good, but the server answers 422 payment_not_found whenever its single getTransaction on the public fullnode doesn't find the digest yet, so a real, landed payment can be forgotten on the phone with no tickets added.

- Trigger: The client's waitForTransaction succeeds on its own connection to fullnode.<network>.sui.io. The server's getTransaction is a separate connection to the same load-balanced host, with no retry, and can reach a backend that hasn't caught up yet. It gets notFound, and the route answers 422 payment_not_found. ask() calls refuse(), showUnadded calls forgetUnaddedPurchase, and the checkout says once that the tickets were refused for good. The JPYC is paid, no tickets are added, and nothing asks again. A kept payment that was refused earlier is also dropped at the next open (openOnKept).
- Confirm by: Count 422 payment_not_found in /api/logs within seconds of purchases. Or make the fake paymentsIn return null once in an API test and watch the checkout forget the payment.
- Fix: On the server, wait for the digest (waitForTransaction with a bounded timeout) instead of one getTransaction, and answer a digest Sui still lacks with a retryable status. On the client, stop counting payment_not_found as a refusal for good.

**TIX-6** · medium · confirmed · `src/tickets/TicketsProvider.tsx:44`  
The new day's daily tickets load only from one setTimeout keyed on the nextRefillAt string, so a phone clock running ahead, a failed reload at midnight, or a timer delayed by device sleep leaves yesterday's used-up tickets on screen.

- Trigger: Clock ahead (deterministic): the phone's clock is more than REFILL_MARGIN_MS ahead of the server's, so the timer fires before the server's midnight. GET /api/tickets returns the old day with the same nextRefillAt string, so the effect's deps are unchanged and no timer is set for the real turnover. Failed reload (deterministic): the one GET at midnight fails, so only `error` is set and nothing retries. Sleep (plausible): WebKit and Chromium timers can fire late after the device sleeps or the webview is suspended, and no visibilitychange handler reloads the tickets. In each case the out-of-tickets card's countdown stops at msLeft <= 0 and sits at 'in under a minute', and Draw opens the out-of-tickets card until a reload, a seal or a failed spend refreshes the tickets.
- Fix: Schedule the reload from the server's time, or reload again whenever an answer still carries a nextRefillAt already past on the device's clock, retry a failed reload, and reload on visibilitychange once refillAt has passed.

**TIX-7** · low · confirmed · `src/shop/FinishPreview.tsx:81`  
The glitter and prism laminate films are live resin that mounts only after the mask image's onload, after the Shop's one relight, and never calls lightUp, so they sit lit from their CSS default corner until the next touch or tilt.

- Trigger: The person opens the Shop (the tab tap itself moves the light, so lightNow is set). ShopScreen's useLight(sticker !== null) relights every .live-resin in the DOM when the sticker arrives, in the same commit that first mounts FinishPreview; its useImageLoaded only flips in the Image's onload, which is always later, so the film spans mount after that relight. The light writes --lx/--ly on each lit element, not on an ancestor, so the film's `var(--lx, -0.6)` and `var(--lx, 0)` fall back: the glitter sparkle and prism facets show the default angle while the gloss swatch and backing foil glints beside them show the real light. The next pointerdown or tilt lights them (with the 280ms glide). Cosmetic.
- Fix: Give the film span a ref and call lightUp on it in a layout effect when it mounts, as LiveResin and StickerFoil do.

**TIX-8** · low · plausible · `src/tickets/TicketsProvider.tsx:26`  
Every answer that carries tickets (a load, a spend, a purchase, the unadded-purchase retry) is applied in arrival order, so an older GET's answer that arrives after a spend's can put the spent ticket back on screen.

- Trigger: A GET /api/tickets is in flight (the refill reload, a refresh after a seal or a failed spend, or api.tickets() after payment_already_counted), and a board Draw's spend lands first. The older answer then calls setTickets with the count from before the spend. The Draw key and the cards show one ticket too many, and the next spend fails with 409 ticket_kind_changed or no_tickets_left, whose refresh corrects the count.
- Confirm by: In a test, hold a GET /api/tickets answer, let a spend resolve, then release the GET and check the shown count.
- Fix: Order the answers in TicketsProvider with a request counter, or a server-side version, so an answer older than the one shown is dropped.

**TIX-9** · low · plausible · `src/tickets/unaddedPurchases.ts:204`  
A 403 payment_not_yours counts as a refusal for good, so a payment kept for person A but asked for while the origin's session cookie belongs to person B is marked refused and dropped from the phone.

- Trigger: Person A's app is open with a kept payment. Another tab or window in the same browser signs in as person B, so the shared cookie is now B's. A's app keeps me.id A, and useAddUnaddedPurchases sends A's payment with B's cookie. The server compares the reference tickets:A with B and answers 403 payment_not_yours. isRefusal(403) marks A's payment refused, and the next checkout says so once and forgets it. That's unlikely inside LINE's webview.
- Confirm by: In a desktop browser, keep a payment for A, sign in as B in a second tab (dev ?as=), then open A's tab's Shop and watch the 403 and the kept payment turn refused.
- Fix: Keep payment_not_yours when the session's user isn't the kept payment's user (or check /me first), so only a verdict on the payment itself counts as final.

## App shell, sign-in and LINE

10 findings: 1 high, 3 medium, 6 low.

**SHELL-1** · high · confirmed · `src/main.tsx:43`  
The reload-once-per-missing-chunk guard is keyed by the error's message, and WebKit (every iPhone LINE browser) gives the same message for every failed dynamic import, so after one reload in a tab session no later missing chunk reloads, and the lazy screen's rejection blanks the whole app.

- Trigger: iPhone, LIFF window kept open across two deploys. Deploy 1 deletes old chunks; opening a lazy screen fails with 'Importing a module script failed.', sessionStorage stores that text, the page reloads onto the new build. Deploy 2, same tab session: the next lazy screen (stat board, Explore, giving, drawing screen) fails with the identical text, `getItem(RELOADED_FOR) === missing` is true, so no preventDefault and no reload; Vite's helper rethrows, the lazy component rejects, and with no error boundary above App's Suspense boundaries React unmounts the root: a blank app until the person reloads. Android Chromium puts the chunk URL in the message, so it only skips the reload on a repeat failure of the same chunk, as the comment intends.
- Fix: Key the guard by the failed chunk (or by the build, e.g. the deployed build ID) instead of the error text, and put an error boundary around the lazy screens that offers a reload.

**SHELL-2** · medium · confirmed · `src/identity/suiSigner.ts:28`  
waitForSuiSigner ignores Privy's status, so a Privy sign-in that needs LINE reconnected makes the reserve ticket checkout wait 15 s and then fail with 'Please try again', in inline English even in Japanese; its 15 s budget is also half the 30 s cold-start budget the smart wallet wait allows.

- Trigger: Certain: LINE's ID token has expired (privy status failed, reconnectLine true). The person picks a pack and pays: pay() awaits waitForSuiSigner, which only listens for a signer, so after 15 s it rejects with `Your Sui wallet isn’t ready. Please try again.`; ReserveTicketCheckout's reason() shows error.message as is, so Japanese shows English, and trying again repeats the 15 s wait, since only reconnecting LINE fixes it. Timing-dependent: a first-time buyer who opens the Shop right after the app opens needs Privy's SDK download, sign-in, the Ethereum wallet, then MakeSuiWallet's Sui wallet and SuiWalletBridge's signer, which can pass 15 s on a phone. No JPYC is spent in either case.
- Fix: Make waitForSuiSigner follow waitForSmartWallet: end on a Privy failure (line_token_expired when reconnectLine), share its cold-start timeout, and reject with an ApiError code whose message is in the catalog.

**SHELL-3** · medium · confirmed · `src/line/friendPicker.ts:30`  
Spec conflict, not an accident: the gift sender opens LINE's full, multi-pick share target picker on purpose, so one Gift Message and its single Gift Claim Token can go to several chats and to group chats at once, while AGENTS.md says a Gift Message goes into one 1:1 chat and the token lets one person receive, once.

- Trigger: The giver taps Send in LINE and picks three friends, or a group. LINE sends the same link to every pick and resolves { status: 'success' } once, so the gift is recorded as sent once. Whoever opens the link first in a 1:1 chat becomes who the gift waits for and receives it; the friend the giver meant may see already_received; anyone opening it in the group sees the group_chat refusal. Code side: the comment says the one-pick mode lists friends only and LINE can leave that list empty, which is why the full picker was chosen, and the code does exactly that. Spec side: Gift Message row 'into one 1:1 chat', Gift Claim Token row 'lets one person receive the sticker, once'. The server keeps the 'once' (first opener wins, group chats refused), so nothing is duplicated, but who receives it is a race among the picks.
- Fix: Product decision first: either keep the full picker and change the Gift Message definition (and tell the giver the first to open it receives), or switch to isMultiple: false with a fallback when LINE's one-pick friend list comes up empty.

**SHELL-4** · medium · plausible · `src/line/friendPicker.ts:35`  
Any picker result other than { status: 'success' } counts as cancelled, so a LINE build that resolves without a status after a real send records the gift as not sent and offers Send in LINE again with the same Gift Claim Token.

- Trigger: On a LINE version or platform whose shareTargetPicker resolves without a status after sending: outcome 'cancelled' -> backend.markCancelled -> the give sheet shows Not sent with Send in LINE -> the giver sends again, perhaps to a different friend, with the same link, so two chats hold it and the first to open receives.
- Confirm by: LINE's liff.shareTargetPicker reference on which LINE versions or platforms resolve without { status: 'success' } after a send, checked against the oldest LINE version the app's LIFF SDK supports; if every supported version resolves false only on cancel, refute.
- Fix: Treat only an explicit `false` as cancelled and anything else that isn't success as unknown, recording it as possibly sent rather than offering a resend of the same token.

**SHELL-5** · low · confirmed · `src/api/views.ts:45`  
A deleted account, the only person the database lets have no LINE name, is named with the inline English 'Someone', which the Japanese UI shows as is.

- Trigger: Someone deletes their account; their lineDisplayName and handle are cleared. Their stickers still appear as other people's (Original Artist chip, Explore, sticker detail) and in Transfer Trail rows, and every place that prints toPerson(...).name shows 'Someone' in English in the Japanese UI.
- Fix: Name a deleted account from a catalog string (for example a 'deleted account' label with a ja entry) instead of inline English.

**SHELL-6** · low · confirmed · `src/app/MotionPermissionCard.tsx:29`  
Allow asks for motion on every pointerup, including a press the person backed out of by sliding off, because the shared press captures the pointer on the key and keys never turn a drag into pointercancel.

- Trigger: iPhone: finger down on Allow, slide well off (the key lifts, press.ts fires no click), release elsewhere. The key holds pointer capture and has touch-action: none, so the pointerup is dispatched to the key, React runs onPointerUp={allow}, and iOS shows the motion prompt the person meant to cancel. They can still choose on iOS's own prompt, so little harm.
- Fix: Ask on pointerup only when the release is inside the key (or when the press commits), for example by having the press expose its commit decision instead of handling raw pointerup.

**SHELL-7** · low · plausible · `src/identity/SmartWalletBridge.tsx:36`  
Privy's smart wallets provider makes a new getClientForChain (and a newly wrapped client) on every render, so every Privy re-render after sign-in drops the working Sepolia client to null and rebuilds it, and a rebuild that fails replaces a client that worked.

- Trigger: Verified in Privy's dist: the provider's value is an object literal with an inline async getClientForChain, and the file imports only useContext, useState, useEffect and createContext (no memo), and the inner provider passes `client: d?.smartWallet&&s?m(s):void 0`, a fresh wrap each render. So any render of Privy's provider (user refresh after MakeSuiWallet's createWallet, a session change) reruns the bridge's effect: setSmartWallet(null), then a new getClientForChain. A seal, pack or receive that starts in that window waits for the rebuild; if the rebuild rejects (a blip reaching the embedded wallet or bundler), smartWalletFailed() sets the failure. waitForSmartWallet gives one fresh try per wait, so only a second failure shows smart_account_not_ready. In-flight actions keep their old client object, so they aren't broken.
- Confirm by: Count the bridge effect's runs (a console.count in a local build) across a sign-in that creates the Sui wallet and a JWT refresh, and throttle the network during one rebuild to see a chain action get smart_account_not_ready.
- Fix: Key the bridge's effect on what identifies the wallet (client?.account.address and the chain), not on Privy's function and wrapper identities, and keep the working client until a replacement is ready.

**SHELL-8** · low · plausible · `src/identity/SponsorshipCheck.tsx:27`  
The developer slip's gas check finds its portal target only while rendering, and nothing re-renders it when PrivyAccount mounts or remounts that target later, so the button can be missing, or stay in a detached node, until the smart wallet context changes.

- Trigger: PrivyAccount renders the target div only while the status is signed-in (PrivyAccount.tsx:22,53), inside the stat board, which mounts once the board is idle. If SponsorshipCheck last rendered before that div existed, or the div is remounted after a status flip with the Sepolia client unchanged (shell-4's signing-in flip on a JWT re-sync), SponsorshipCheck's hooks don't change, so it keeps returning null or keeps portaling into the old detached div, and the developer sees no Check gas sponsorship button. In the usual cold start the client arrives after sign-in and re-renders it, so the button appears.
- Confirm by: On a device with the developer slip, open it after the smart wallet client is ready and after a five-minute JWT re-sync, and see whether the gas check button is there.
- Fix: Have PrivyAccount render the gas check itself through a slot or context, or subscribe SponsorshipCheck to the target's mount (a callback ref in a small store) instead of reading the DOM in render.

**SHELL-9** · low · plausible · `src/identity/privy.ts:127`  
fetchPrivyJwt sets the status to signing-in on every fresh exchange, including a mid-session re-sync once the kept five-minute JWT has lapsed, and only onAuthenticated or a new `user` object sets it back to signed-in.

- Trigger: Signed in; after the kept JWT lapses, Privy's SDK calls getExternalJwt again: status goes signed-in -> signing-in. It always unmounts and remounts PrivyAccount's rows (and the gas check's portal target, see shell-6). If that re-sync neither fires onAuthenticated nor yields a new `user` object, the status stays signing-in: the developer slip's Privy account rows stay gone and MakeSuiWallet's `needed` stays false, so a missing Sui wallet isn't made. waitForSmartWallet and waitForSuiSigner don't read signing-in, so sealing, giving and paying are unaffected.
- Confirm by: Privy's SDK (useSubscribeToJwtAuthWithFlag): whether it calls getExternalJwt for an already-authenticated user, and if so whether that path calls onAuthenticated or replaces `user`; or watch privyStatus on a device past the five-minute mark.
- Fix: Only set signing-in when the status isn't already signed-in, so a background re-sync keeps the signed-in status until it fails.

**SHELL-10** · low · plausible · `src/identity/smartWallet.ts:89`  
When a stale smart-wallet `failure` is still set while Privy's sign-in has failed, waitForSmartWallet's one fresh try rejects at once with that stale reason, before the new Privy sign-in can finish, so the seal, give or receive waiting on it fails on the first tap.

- Trigger: Precondition: SmartWalletBridge called smartWalletFailed (so `failure` is set) and Privy's status later went to 'failed' without reconnectLine, with SmartWalletBridge's effect not re-running in between (the Sepolia client stayed mounted). The person seals: check() sees privy failed, sets retried=true, calls resetPrivySignIn(); setPrivyStatus('signing-in') calls check() again synchronously; now `failed = failure` (the stale string) and retried is true, so the wait rejects with smart_account_not_ready and the seal key shows it. The fresh sign-in then usually succeeds, and the next tap takes the non-Privy branch (attempt += 1, failure = null) and works, so 'every tap fails' only holds while Privy keeps failing.
- Confirm by: Whether Privy's useSmartWallets().client stays the same object when the Privy status goes 'failed' (getExternalJwt resolving undefined, or onPrivyError). If Privy logs the person out, `client` goes undefined, SmartWalletBridge's effect cleanup calls setSmartWallet(null) and clears `failure`, and the trigger can't happen; privy.ts:114-115 and PrivySession.tsx:50-55 suggest a failed exchange usually does log out.
- Fix: Clear `failure` (and bump `attempt`) alongside resetPrivySignIn() in the retry branch, so the fresh try restarts both the sign-in and the client.

## Shared UI, i18n and tools

7 findings: 1 high, 1 medium, 5 low.

**UI-1** · high · confirmed · `src/ui/lazyWithPreload.ts:26`  
A lazily loaded screen whose chunk fails to load while it is mounted (or is remounted while a retry is in flight) throws a rejection React.lazy caches forever, and with no error boundary above any Suspense site the whole app unmounts to a blank page.

- Trigger: Flaky mobile network in LINE's browser: the person taps a sticker (StickerDetail) or opens Explore, Giving, the stat board, the Mini-game, the sticker tray, someone else's sticker board or the gift dialog; its import() fails. main.tsx reloads once per error message, but the next failure with the same message in that tab session does not reload (on iPhone WebKit every failed dynamic import says the same thing, so after one reload any later chunk failure qualifies). The load rejects, Lazy's payload goes to Rejected, the render throws, no boundary catches it, React 19 unmounts the root: board and tab bar vanish until LINE's window is reloaded or reopened. Reopening cannot retry either: preload() forgets only its own promise, while Preloaded still picks Lazy until a new load has resolved, and Lazy rethrows the cached error without calling its factory.
- Fix: Put an error boundary around each lazy screen's Suspense that shows a retry, and have Preloaded create a fresh lazy() (or skip Lazy) after a failed load so a retry actually refetches.

**UI-2** · medium · confirmed · `src/ui/Sheet.tsx:43`  
An upward (or sideways, or down-and-back) drag on a sheet's perforation leaves dy at 0, so release treats it as a tap and closes the sheet; on the motion card that stores 'denied' for good.

- Trigger: Finger down on the perforation row, drag up (the usual 'pull the sheet up' gesture), release: every pointermove sets dy to Math.max(0, negative) = 0, release sees dragged === 0 and calls onClose(). On MotionPermissionCard that is declineMotion, which keeps 'denied' in storage so the card never asks again; on the gift dialog's accept sheet it is Not now; other sheets just close. touch-action: none on .perf means the browser never cancels the drag.
- Fix: Track whether the pointer moved beyond a small slop in any direction (a ref, not the clamped dy state) and treat only a stationary press as a tap; read the drag distance from a ref on release.

**UI-3** · low · confirmed · `scripts/catalogImport.ts:76`  
The import's <tags> check compares only the sets of tokens, so a Japanese string with its tags swapped, reordered or repeated a different number of times is written to the catalog with no problem or warning.

- Trigger: Reproduced on a scratch copy: work file { "giving.giftBag.sealed": { "ja": "</b>封印<b>{{date}}" } } against English "<b>Sealed</b> {{date}}": the import printed 'Writing .../giving.ts: 0 added, 1 changed' and 'Done: 1 section changed', and the copy now holds `ja: "</b>封印<b>{{date}}"`. On the gift bag, Trans would render that broken markup; no live string has the problem today.
- Fix: Compare the ordered token lists (or at least check the tags balance and nest as in the English) in placeholderProblem.

**UI-4** · low · confirmed · `scripts/catalogSource.ts:82`  
A work file's where that starts with '_' can never be imported: oneLine() strips that '_' on read-back, so the whole import is refused with the misleading 'the edit didn't read back as planned'.

- Trigger: Reproduced on a scratch copy: work file { "tickets.reserve": { "where": "_Reserve_ caption on the start card", "ja": "有償" } } prints 'ERR tickets: the edit didn't read back as planned at tickets.reserve' and writes nothing, and the message doesn't say the leading '*' is the cause.
- Fix: Have whereProblem refuse a where that starts with '_' with a clear message (or make oneLine strip only the doc-comment's own leading '_' per line when followed by a space).

**UI-5** · low · plausible · `src/ui/Sheet.tsx:61`  
The perforation button announced as 'Close {{label}}' has no onClick, so a screen reader's activation, if it sends only a simulated click, does nothing.

- Trigger: VoiceOver or TalkBack user double-taps the sheet's close button: if the platform dispatches only mousedown/mouseup/click (no pointer events, no Enter keydown), no handler runs and the sheet stays open; they must use the sheet's own controls or Back.
- Confirm by: Activate the perforation with VoiceOver on an iPhone in LINE, and with TalkBack in Android's WebView, and see whether the sheet closes (or log the events the button receives).
- Fix: Close on onClick for clicks with no preceding pointer drag (e.g. detail === 0 or no pointerdown recorded), and keep the pointer path for drags.

**UI-6** · low · plausible · `src/ui/useBackToClose.ts:115`  
A code-closed overlay's held step back is a setTimeout(0); if the person's Back is still in the browser process when it fires, both go back and one extra history entry is taken.

- Trigger: An overlay closes by code in the same few milliseconds as the person's Android/LINE Back: the timer sees history.state still marked with the overlay's id and calls history.back() (ownPops = 1); the person's popstate is then counted as ours, and our queued back takes one more entry (the app's previous entry, closing overlays below, or leaving the page if one precedes it).
- Confirm by: In Chrome/WebView, trigger a browser Back and a release() within the same frame (e.g. press Back while an auto-closing overlay's timer fires) and check whether two entries are popped.
- Fix: Instead of a fixed one-task hold, defer the step back until no popstate for the overlay's entry has arrived within a short window, or mark the entry closed and let the next popstate skip it.

**UI-7** · low · plausible · `src/ui/useFocusTrap.ts:49`  
Tab wrapping only checks whether focus is on the first or last control, so Shift+Tab from the dialog's root (or from anywhere not in the list) while the dialog has controls moves focus out to the page behind.

- Trigger: A dialog whose root holds focus while it has controls (activated before its controls rendered, or its first control couldn't take focus) and an external keyboard: Shift+Tab from the root is neither first nor last, so no preventDefault and the browser moves focus before the dialog in DOM order. For the gift dialog named by the lane, its own effect moves focus to each step's control, so it is largely covered there.
- Confirm by: In a dialog among the 17 callers whose controls lack data-autofocus and render after activation, focus the root and press Shift+Tab with a hardware keyboard; check whether focus leaves the dialog (and whether the page behind is inert).
- Fix: Wrap when activeElement is the root or not inside the list: on Shift+Tab from the root or from outside the list focus the last control, on Tab focus the first.

## Cleanup: reuse, simplification, efficiency and conventions

Severity here is the cost of leaving it: high invites a bug soon, medium is a real maintenance cost, low is tidiness.

22 findings: 1 high, 8 medium, 13 low.

**CLEAN-1** · high · confirmed · `src/ui/useFocusTrap.ts:57`  
useFocusTrap listens for keydown only on its root. When the focused control unmounts, focus falls to body and Escape and the Tab wrap stop working, so every dialog adds its own refocus effect for each way its controls can change.

- Cost: Three fixes already exist for this one cause: e077f822 (sticker detail page turn), a6089580 (sticker detail Try again) and 69001e81 (the replay's Try again keeps focus). Each new dialog, or each new way a dialog's control can unmount, has to know to add another effect, or keyboard and switch users lose Escape and the Tab wrap until they tap back in.
- Fix: Let the trap recapture focus itself: while it's active, listen for keydown on document and, when focus has fallen to body, return it to root (preventScroll) before handling Escape and Tab. A focusout listener alone isn't enough, because a removed control may fire none. Then drop the per-dialog refocus effects.

**CLEAN-2** · medium · confirmed · `src/gratitude/gratitude-mini-game.css:487`  
Mona Sans's slashed tabular zero is worked around site by site: per-zero spans at font-stretch 114% tuned to a 125% tabular cell, a 0.65em per-digit cell in SizeRail, and tabular-nums removed from other stylesheets. Nothing ties these widths to the tokens they depend on.

- Cost: Retune --w-figure or the HUD or size rail weight, and the 114% zero or the 0.65em cell stops matching, so the combo's amount and clock jitter as they count and the brush size label shifts. A new counting figure has to know to use plainZeros, and any tabular-nums in Mona Sans brings the slashed zero back.
- Fix: Fix it at the font: self-host a Mona Sans build whose tabular zero is the plain glyph, or set counting figures in a face with a plain tabular zero, then restore tabular-nums and delete the per-zero spans and the fixed digit cells.

**CLEAN-3** · medium · confirmed · `src/sticker-board/tray/trayEngine.ts:226`  
tokens.css's --ease-out and --ease-peel are spelled out as private string literals in about 15 modules, besides gratitude/easing.ts's exported EASE_OUT/EASE_PEEL/EASE_SPRING, ReplayStage's own exported EASE_OUT and three getComputedStyle reads with hard-coded fallbacks.

- Cost: Retuning --ease-out or --ease-peel in styles/tokens.css moves every CSS transition but none of the Web Animations in the tray, board gestures, sticker detail, lift, paging, Explore pile, lifted sticker, address dialog, stick, gift notice or replay stage, which keep the old curve. The values all agree today.
- Fix: Move gratitude/easing.ts's curve constants into ui/ (e.g. ui/easing.ts), import EASE_OUT/EASE_PEEL/EASE_SPRING from there in every module above, and delete ReplayStage's exported EASE_OUT and the private copies.

**CLEAN-4** · medium · confirmed · `src/tickets/StartDrawing.tsx:63`  
Four ticket cards pair useFocusTrap with their own 'focus the first enabled button when the view changes' effect, and StartDrawing's copy has already dropped the :not(:disabled) skip and the fallback to the card.

- Cost: No failure today: StartDrawing's busy key uses aria-disabled, not disabled (StartDrawing.tsx comment: `aria-disabled rather than disabled`), so its first button is never disabled. If one ever is, focus() on it is a no-op and focus stays wherever it was, where the other three cards would fall back to the card.
- Fix: Give useFocusTrap a refocus key option (re-run its first-control focus when the key changes) and replace the four effects with it.

**CLEAN-5** · medium · confirmed · `src/tickets/StartDrawing.tsx:101`  
StartDrawing and SealedCard print the refill time from the device's nextRefill(new Date()) although the server's tickets.nextRefillAt is in their props, so the Tokyo-midnight rule has a frontend copy.

- Cost: The printed value is only a time of day (formatRefillTime = formatTimeOfDay), and both rules are Tokyo midnight today, so the cards agree with the server now. When the server's day rule changes, the reserve ask and sealed card print the old refill time while OutOfTickets' countdown (server's nextRefillAt) shows the new one in the same flow.
- Fix: Use formatRefillTime(new Date(tickets.nextRefillAt)) in StartDrawing and SealedCard's TicketRow and delete nextRefill from tickets/tickets.ts (these are its only callers).

**CLEAN-6** · medium · confirmed · `src/tickets/TicketsNotLoaded.tsx:24`  
Four ticket cards rebuild the same dialog shell: the .out-of-tickets wrapper, scrim, section role=dialog aria-modal tabIndex=-1, useFocusTrap, and a first-button focus effect. The copies have already drifted.

- Cost: Drift today: StartDrawing focuses `querySelector("button")` while the other three skip disabled buttons, and only OutOfTickets marks its scrim aria-hidden. StartDrawing's busy key uses aria-disabled, not disabled, so its drift may not show yet. Any focus or accessibility fix to the ticket cards has to be made four times.
- Fix: Extract one TicketCard shell (wrapper, scrim, dialog section, focus trap and a focus-first-enabled-button-on-key effect) and render all four cards through it.

**CLEAN-7** · medium · confirmed · `src/tickets/config.ts:2`  
The frontend's TICKET_DAY_UTC_OFFSET_MS (and its ticketDay) is a hand copy of the API's TOKYO_UTC_OFFSET_MS/tokyoTicketDay; the board's drawn-today filter, the tray's day grouping and Explore's pile days bucket by the copy.

- Cost: Both are +9 h today, so no mismatch now. A change to the server's day rule leaves the board's 'today', the tray's day labels and Explore's pile days on the old boundary while daily tickets, streaks and Explore's today/week move.
- Fix: Export the offset and tokyoTicketDay from apps/api/src/ticketDays.ts through apps/api/src/client.ts, have the frontend's ticketDay and pileDays use them, and delete TICKET_DAY_UTC_OFFSET_MS from tickets/config.ts.

**CLEAN-8** · medium · confirmed · `src/tickets/config.ts:4`  
The reserve ticket checkout prints each pack's struck-through price from the frontend's own TICKET_PRICE_YEN, beside a discount percent the server computed from its TICKET_PRICE_YEN; both are 100 today.

- Cost: If the server's single price moves (e.g. to 120) without a matching frontend edit, the checkout's 3-pack shows 'was ¥300' beside a discount computed from ¥360, and the Shop hero (server's 1-pack priceYen) disagrees with the checkout's struck prices. No mismatch today.
- Fix: In ReserveTicketCheckout, take the struck price from singleTicketPrice(shop.packs)?.priceYen (or have the server send each pack's undiscounted price beside discountPercent) and delete TICKET_PRICE_YEN from tickets/config.ts.

**CLEAN-9** · medium · confirmed · `src/ui/useFocusTrap.ts:32`  
useFocusLoop's tabStops() skips inert, visibility-hidden and tabIndex<0 elements, but useFocusTrap's focusables() only drops [tabindex="-1"] by selector, so the two focus traps disagree on what a tab stop is.

- Cost: Mechanism verified; no specific dialog found with a hidden or inert control inside its trap. In one that has one (or a button with tabindex=-1, which button:not([disabled]) still matches), the trap takes it as first/last stop: Tab from the real last control is not wrapped, focus() on the hidden one fails, and focus leaves the dialog.
- Fix: Move tabStops (with its visible check) into ui/useFocusTrap.ts or a small ui/tabStops.ts, export it, and have both useFocusTrap and useFocusLoop call it, deleting both FOCUSABLE copies.

**CLEAN-10** · low · confirmed · `src/api/httpApi.ts:74`  
A refusal whose body isn't the API's JSON error keeps only the first 200 characters of the body in its detail, against AGENTS.md's 'Never truncate data before the database or a log unless a schema requires it'.

- Cost: A non-JSON error page (a proxy's HTML, a Vite proxy error) reaches the UI's error and the console cut to 200 characters, often before the part that says what failed.
- Fix: Keep the whole response text in the ApiError (e.g. a separate `body` field logged in full) and, if the on-screen line must stay short, shorten it only where it is shown.

**CLEAN-11** · low · confirmed · `src/controls/useToast.tsx:6`  
controls/useToast.tsx is an unimported second toast hook (1.8 s, renders its own node) beside the app's ui/useToast over ToastProvider (2.4 s, one host).

- Cost: Dead today; the risk is an auto-import picking it, which would give that screen a toast with another duration outside the shared host.
- Fix: Delete apps/frontend/src/controls/useToast.tsx (and the then-empty controls/ folder).

**CLEAN-12** · low · confirmed · `src/giving/giftBackend.ts:174`  
Whether the sticker escrow is configured is decided twice, by different rules: giftBackend accepts any non-empty VITE_STICKER_ESCROW_ADDRESS, while giftTransactions.escrowAddress() requires isAddress() and throws otherwise.

- Cost: The rules differ only when the address is set but malformed. That also breaks every deposit, which reads the same escrowAddress(), so the practical harm is that a change to how the address is read has to be made in two files.
- Fix: Export escrowConfigured(), built on the checked address, from giftTransactions, and use it in giftBackend's recovery.

**CLEAN-13** · low · confirmed · `src/giving/giftTag.ts:19`  
giftTag.sealDate and trayEngine's private monthDay are byte-for-byte copies of stickers/format.ts's exported formatMonthDay ("9.23").

- Cost: No failure today; the three agree. A change to the short date's form lands in formatMonthDay and the gift bag's tear tape and the tray's sheet labels keep the old form.
- Fix: Delete sealDate and monthDay and call formatMonthDay from stickers/format.ts in giftTag's callers and trayEngine.

**CLEAN-14** · low · confirmed · `src/gratitude/combo.ts:46`  
Six types are exported but used only in their own files: ComboView, HudView, HeartFaceName, StrokeThrow, OurWork and DailyTicket.

- Cost: The needless exports keep knip's report non-empty, so a new unused export is harder to spot.
- Fix: Remove the export keyword from the six types.

**CLEAN-15** · low · confirmed · `src/i18n/strings/shop.ts:52`  
The Shop's 12 coming-soon swatch names (laminates, brushes, backing foils) have no /** */ comment of their own, only one on each `items` object, so AGENTS.md's one-comment-per-string rule is broken and the translator's sheet gets no 'where' for them.

- Cost: `pnpm --filter frontend i18n:export` writes an empty Where for Gloss, Matte, Glitter, Prism, Brush, Marker, Fineliner, Pixel pen, Holo, Gold, Silver and Rose gold, because the export reads the comment directly before each string's own property.
- Fix: Give each of the 12 swatch strings its own one-line comment (e.g. `/** Laminates shelf: the matte swatch's name, coming soon */`), via the i18n:import work file or by hand.

**CLEAN-16** · low · confirmed · `src/identity/privyStart.ts:26`  
privyStart(), which reports why Privy started, is exported only for PrivySignIn.test.tsx. No app code reads the reason, and it already goes into the performance mark.

- Cost: A production export kept alive only by a test adds to the module's surface, and a reader has to assume it has callers.
- Fix: Drop the export and have the test assert the privy-start performance mark (or usePrivyStarted) instead.

**CLEAN-17** · low · confirmed · `src/shop/shopSticker.ts:51`  
useApiQuery has no shared cache, so the Shop's preview sticker, the give sheet and the offer sheet each fetch your whole sticker board again on every mount, although the board loaded the same data earlier in the session.

- Cost: Each Shop tab visit, and each give sheet or offer sheet opened on someone else's board, costs one full GET of your board and shows skeletons until it arrives.
- Fix: Keep the last answer per key in a cache held by ApiProvider, which useApiQuery shows at once and refreshes in the background, and give the board and these three consumers one key.

**CLEAN-18** · low · confirmed · `src/sticker-board/ArtistBoard.tsx:151`  
ArtistBoard and StickerBoard each write out the same board-size measurement: a layout effect with a ResizeObserver and a setSize that keeps the old {W,H} while clientWidth and clientHeight are unchanged.

- Cost: A fix to how a board is measured has to be made on both boards, or someone else's board lays stickers out differently from your own.
- Fix: Extract a useBoardSize(ref, extraObserved?) hook and use it on both boards.

**CLEAN-19** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:1`  
trayEngine.ts is 2,104 lines, over AGENTS.md's 'Avoid files over ~2000 lines ... split by responsibility'.

- Cost: No person-facing failure; every tray change edits one file holding the model, rendering, gestures, paging, filters and the spread.
- Fix: Split trayEngine.ts by responsibility, e.g. the stack and pulled-sheet gestures into their own module beside it, leaving the model and rendering.

**CLEAN-20** · low · confirmed · `src/sticker-board/tray/trayEngine.ts:237`  
clamp/lerp are re-declared in trayEngine, zipper, placement, ArtistChipLayer and brush, clamp01 in seven files and easeOut in sealTimeline, though gratitude/easing.ts exports clamp, lerp and easeOutCubic.

- Cost: No failure today: every copy computes the same result (the ternary clamp01s and the Math.min/max ones both pass NaN through). Tidiness only.
- Fix: Move easing.ts's clamp/lerp/easeOutCubic (with a clamp01) to the same ui/ module as the curve constants and import them in place of the private copies.

**CLEAN-21** · low · confirmed · `src/sticker-creation/drawVisits.ts:17`  
drawVisits.countVisit is the same visit counter as traySeen.countVisit, and pileVisits.ts's read/write pair is traySeen.ts's with another log prefix; no shared localStorage helper exists, and about ten stores hand-roll the try/catch.

- Cost: Nothing a person hits today; the two counters recover a bad count identically now. A fix to storage handling (a blocked or corrupt entry) has to be found and repeated per store.
- Fix: Add one storage module (e.g. ui/deviceStorage.ts) with a logged read/write by key and a countVisit(key), call it from traySeen, drawVisits and pileVisits, and move the other stores onto its read/write.

**CLEAN-22** · low · confirmed · `src/stickers/liftedCorner.ts:79`  
liftedCorner.readFold and tray/stickerShape.traceMask each decode a mask onto a throwaway canvas, read its pixels and zero the canvas inline, although sticker-board/timelapse/fillSnapshots.ts exports release(canvas) for exactly that zeroing.

- Cost: No failure today: both copies zero width and height in a finally. A change to the iOS canvas-budget workaround has to be repeated in each copy. (The claim that the two readers fail differently for one URL was not checked.)
- Fix: Move release() out of timelapse/fillSnapshots.ts into stickers/ (beside the mask readers) with one maskPixels(url, width, height) helper that decodes, draws, reads and releases, and call it from readFold and traceMask.

## Not covered

- CSS was read only where a finding depended on it.
- Tests (`*.test.ts[x]`) were read only to learn what the code means to do.
- The API, the contracts and `deploy/` were read only where a frontend finding depended on them. The few findings that live there are filed with the screen they break.
- No finding was reproduced on a phone. A trigger that needs iOS WebKit, Android WebView, LINE's picker or a slow network is traced from the code, and marked plausible with how to confirm it.
- Of the merges that resolved conflicts in `apps/frontend`, only the largest resolutions were read for dropped guards.

## Checked and refuted

Candidates a lane raised that the check disproved, so nobody raises them again:

- `src/sticker-board/StickerDetail.tsx:255`: The sticker detail doesn't veil NSFW stickers, but it only shows the board owner's own stickers (held or given), and no one who isn't adult can ever hold an NSFW sticker, so no one sees raw NSFW art through it.
- `src/giving/giftBackend.ts:186`: The deposit does run before buildGiftMessage, but none of buildGiftMessage's throws can be reached after a deposit in the app: the giver always has a handle, the LIFF ID is a fixed URL-safe constant and the token is 0x-prefixed hex.
- `src/gratitude/letteringFonts.ts:10`: ポンッ and !? are missing from letteringCharacters(), but the Dela Gothic One slices that hold them are already fetched by the characters it does ask for, so neither slam swaps typefaces.
- `src/performance/performanceRecorder.ts:322`: The recorder starting before its setting is kept is handled by the only caller, which reads the recorder's real state after a throw and says the switch holds only until restart.
- `src/receiving/ReceiveGiftDialog.tsx:198`: The mechanism is real (Try again resets neither usePullTab's torn flag nor the reveal), but no reachable path gives a not_deposited refusal after the pull tab has torn, so the stuck sealed bag can't be reached.
