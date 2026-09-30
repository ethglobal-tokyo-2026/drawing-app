# gratitude: the Gratitude Mini-game (live), its HUD, endings and receipt, the Gratitude outbox, and the Transfer Trail's replay stage

Commit: 9f541d12 · Files covered: every file in `apps/frontend/src/gratitude/` and `gratitude/replay/` (tests skimmed only), plus docs/gratitude-mini-game-design-doc.md; callers read for context: `sticker-board/StickerBoard.tsx` (how the game opens), `sticker-board/TransferTrail.tsx` (the replay's card), `app/App.tsx` (outbox resend), `i18n/strings/gratitude.ts`, `apps/api/src/gratitude/record.ts` (refusal codes) · Not covered: see the last section

Screens inspected (demo from the stat board's developer slip, user `gratitude-giver`, Chromium, 390×741 @3x unless noted):

- ready — `/tmp/impeccable-audit/shots/gratitude/02-ready-390.png`
- オーバーヒート mid-combo — `03-overheat.png`
- 昇天 mid-combo — `04-shouten.png`
- receipt — `05-receipt-main.png`
- Japanese at 375×591, ready and receipt, played by Enter only — `06-ready-ja-375x591.png` (boxes measured, not viewed), `07-receipt-ja-375x591.png`
- stroke tip after three slow drags — `08-stroke-tip.png`
- reduced motion run — `05-receipt-reduced.png` (transcript used, not viewed)
  Scripts: `/tmp/impeccable-audit/scripts/gratitude/02-play.cjs` (combo, frame times, live region, teardown), `03-ja-keys-stroke.cjs` (Japanese + keyboard, stroke discovery).

## Audit (technical)

Proposed scores for this slice:

- **A11y 3** — the heart is a named button that takes focus, Enter reaches 昇天, the live region speaks the start, tiers, totals and the end in both languages, reduced motion keeps every state change; but the end says "Sent" even when nothing was sent.
- **Performance 3** — one frame loop that sleeps, pooled elements, no per-frame layout reads, complete teardown, good frame times in a bounded run; the GPU-heavy layers (masked ground, 1100px speed field, drop-shadow filters, text-stroke lettering) are unmeasured on an iPhone.
- **Theming 3** — UI parts use tokens; effect colors are illustration literals; the puffy face falls back to a thin Mona Sans while it loads.
- **Responsive 3** — fits 375×591 in Japanese with 28px to spare under the hint; the px-anchored layout (176px band + 80px HUD) was checked at two sizes only.
- **Integrity 2** — a false success on a failed send, refusal copy that points at an impossible retry, a Close that silently commits, a promised effect and config behavior the code doesn't have, dead code.

### Findings

- **[P1] The receipt and the live region say "sent" when the send failed** — `apps/frontend/src/gratitude/GratitudeMiniGame.tsx:151-157` · Integrity / error handling · Impact: when `POST /api/gratitude` fails (no network, 5xx, timeout), `sendGratitude` answers `{ state: "kept" }` and the screen ignores it: the receipt is labeled "Gratitude sent" (`i18n/strings/gratitude.ts:57`) and the live region says "Sent 3,063 gratitude to @x." (`gameEndings.ts:95-100`). The only trace is a `console.warn` (`gratitudeOutbox.ts:99-101`). The outbox retries only when the app next starts (`app/App.tsx:115-117`), so inside a LINE session that stays open the giver gets nothing, and the sticker detail keeps offering Send gratitude (the server has none), inviting a second combo; whichever reaches the server first wins and the other is refused later with only a `console.error` (`gratitudeOutbox.ts:92-97`; `resendPendingGratitude`'s results are dropped). It's once per gift with no redo, the highest-stakes moment in the flow. AGENTS.md: "An error only the calling client can see is a silent error." · Standard: n/a (AGENTS.md error handling; Nielsen 1 and 9) · Fix: show the kept state on the receipt and in the live region ("Saved on this phone. It goes to @x when you're back online."); retry on `online` and `visibilitychange`, not only at app start; have the detail treat a combo waiting in the outbox for that gift as sent, so Send gratitude doesn't come back. · Command: /impeccable harden · Evidence: code read. Not reproduced in the browser: the demo sends nothing, and no received gift existed in the seeded world during this lane.

- **[P2] Close mid-combo silently sends the combo so far** — `GratitudeMiniGame.tsx:217-220,272-280`, `miniGameEngine.ts:1107-1114,1304` · Integrity / user control · Impact: the X is named "Close", but after the first tap it ends the combo, records it and shuts the screen at once, with no receipt and no word. Gratitude is once per gift, so a person who taps a few times and presses X to start over has sent a tiny, final combo. Before the first tap the X sends nothing (correct). · Fix: after the first tap, let the X show the receipt of what was sent (or name it "Send and close"); at least say "Sent N gratitude" before closing. · Command: /impeccable clarify · Evidence: code read

- **[P2] The refusal alert asks for a retry that can't work, and hides why** — `GratitudeMiniGame.tsx:155`, `i18n/strings/gratitude.ts:77-80`, `gratitudeOutbox.ts:19-25` · Integrity / copy · Impact: "refused" means 400/403/404/409 (`apps/api/src/gratitude/record.ts:112-115`: gift_not_found, gift_not_received, not_receiver, gratitude_already_recorded, an invalid replay), which by the outbox's own comment "sending the same combo again can't change". The alert says "Your gratitude didn't reach @x. Close this and send it again." After `gratitude_already_recorded` there is no Send gratitude to press; for the rest a new combo meets the same refusal. `sent.error` is thrown away, and the alert sits under a receipt titled "Gratitude sent". · Fix: keep the error and say the reason per code ("@x already has your gratitude for this sticker"); offer a retry only where one can succeed; retitle the receipt when refused. · Command: /impeccable clarify · Evidence: code read

- **[P2] Pop-in words pile onto each other and onto the tier slam at the top tiers** — `apps/frontend/src/gratitude/tierSlamAndPopIns.ts:477-502` · Implementation / legibility · Impact: from ドキドキ up a word pops every 2 hits and lives 620–1180ms, up to 5 at once (`POP_INS`), but while a slam holds the band above the heart only the two slots below it are free (beside the heart needs `(screen − heart)/2` ≥ the word, about 82px at 390 wide). When every slot is taken, `tries = … slots.slice(0, 1)` reuses a taken one, and placement keeps words off the heart only, never off each other or off a slam that lands later. The punchlines turn to mush exactly where people are: `03-overheat.png` shows だめ… over バクバク and ずっきゅん over もっと…, glosses stacked; `04-shouten.png` shows アツい… running into the 昇天 slam ("昇天ツい…"). · Fix: when no slot is free, skip the word (or retire the oldest early) instead of stacking; clear words from the band a slam is about to take; test placement against live words' boxes, not only the heart's. · Command: /impeccable polish · Evidence: screenshots above + code read

- **[P2] The ceiling words sit closest to explicit exactly where the input is stroking** — `apps/frontend/src/gratitude/popInWords.ts:35-73`, `miniGameEngine.ts:640-644`, `heartFaces.ts:17-56`, `i18n/strings/gratitude.ts:19` · Copy / brand and platform-policy risk · Impact: PRODUCT.md's ceiling is "suggestive comedy with plausible deniability, never explicit … LINE's MINI App Policy bans sexual content." During a stroke combo 70% of pop-ins come from the tier bank, so a thumb stroking "back and forth, fast" (the tip's own words) is answered at オーバーヒート by ハァハァ "_pant pant_", そこ… "right there…", はげしい "so intense", もうだめ "can't take it", and at ドキドキ by もっと… "more…", だめ… "no fair…", with ぞくぞく "_shiver_" and すりすり "_nuzzle_" from the stroke bank. `04-shouten.png` shows そこ… "right there…" and アツい… "so hot…" beside the bliss face with its nosebleed (the anime shorthand for arousal). Each word alone is deniable; together, in English especially, they read as a sex joke, and ハァハァ carries a leering sense in Japanese net slang. The heart art itself stays on the comedy side. · Fix: product call; candidates to retire or re-gloss: そこ…/"right there…", ハァハァ/"pant pant", もっと…/"more…"; keep the heat and exhaustion words (ぷしゅー, とけちゃう, ぜぇぜぇ) that read as overheating; give stroking its own words at every tier. · Command: /impeccable clarify · Evidence: code read (both languages) + `04-shouten.png`

- **[P3] The focus lines flicker at 8 Hz** — `apps/frontend/src/gratitude/tierBackground.ts:36-37,182-185`, `gratitude-mini-game.css:206-214` · Accessibility (photosensitivity, comfort) · Impact: at ドキドキ and オーバーヒート (tap combos) two different 集中線 drawings hard-swap 8 times a second. Measured by rasterizing both in the page (`02-play.cjs`): they cover 4.6% and 3.9% of the area below the header and 7.7% of that area changes at each swap; in a 317px square round the heart (about a 10° field on a phone at 30cm) only 0.8% changes. That's under WCAG 2.3.1's area threshold (25% of a 10° field), so it very likely passes; the corners weren't measured separately. What remains is a flickering high-contrast stripe pattern above 3 Hz, which broadcast pattern guidance (Ofcom, ITU-R BT.1702) advises against. Reduced motion stops the swap. · Standard: WCAG 2.3.1 (likely passes, numbers above) · Fix: swap at 3 Hz or less, or crossfade the two drawings. · Command: /impeccable animate · Evidence: measurement above

- **[P3] Replays of older combos run under today's rules** — `apps/frontend/src/gratitude/replay/mountGratitudeReplay.ts:73-77`, `combo.ts:114`, `gameConfig.ts:44-45` · Integrity · Impact: the design doc says "Change G.version whenever a rule number changes, so an old record replays with the numbers it was played with", but the frontend holds one `GAME_CONFIG` and the replay only warns on a mismatch. History already has two versions (`git log -p -- apps/frontend/src/gratitude/gameConfig.ts` → "2026-09-26", then "2026-09-26.2"), so an older combo's replay can climb tiers at different moments and then snap its amount to the stored total at the end. · Fix: keep past configs by version and replay with the recorded one, or drop the promise from the design doc. · Command: /impeccable harden · Evidence: code read + git history

- **[P3] DESIGN.md promises a condensation fog after 昇天 that doesn't exist** — DESIGN.md "Gratitude → After 昇天" and its Overview ("finally fogs the glass"); `rg -n -i "fog|condensation|glass" apps/frontend/src/gratitude` → no match · Integrity (doc drift) · Fix: build it or strike it from DESIGN.md. · Command: /impeccable document · Evidence: command above

- **[P3] The puffy face shows as thin Mona Sans until Dela Gothic One arrives** — `apps/frontend/src/styles/tokens.css:17` (`--font-puffy: "Dela Gothic One", var(--font-ui)`), `apps/frontend/index.html:19` (Google Fonts, `display=swap`), `gratitude-mini-game.css:538-546` (`.gr-mult b` at weight 400) · Theming · Impact: `08-stroke-tip.png` caught the multiplier "×1.0" and the giver's initial in regular-weight Mona Sans; `02-ready-390.png` of the same state had Dela. On a slow LINE connection the HUD's one puffy element opens thin and then swaps. · Fix: load Dela Gothic One before the game opens, as `loadLetteringFonts` already does for the lettering's Japanese glyphs, or self-host and preload it. · Command: /impeccable typeset · Evidence: two screenshots of the same state

- **[P3] Dead code: `.gr-tick.is-capped` and the `onEnd` prop** — `gratitude-mini-game.css:463-465` (`rg -n is-capped apps/frontend/src` → only the CSS); `GratitudeMiniGame.tsx:46-47,158` (`rg -n "onEnd=" apps/frontend/src` → only `GratitudeMiniGame.test.tsx:45`) · Integrity · Fix: delete both, per AGENTS.md hard deprecation. · Command: /impeccable distill · Evidence: commands above

- **[P3] After the loop fails, "send your gratitude again" is wrong** — `GratitudeMiniGame.tsx:339`, `miniGameEngine.ts:575-580,1107-1114` · Integrity / copy · Impact: after a frame-loop failure the combo is still "running", so the X's `endNow` ends it and `onRecord` sends it before the (frozen) ending; "Close it and send your gratitude again" then points at a Send gratitude that's gone. · Fix: say whether the combo so far was sent. · Command: /impeccable clarify · Evidence: code read

Measured, no finding (bounded; Vite dev build, headless Chromium on a Mac, not an iPhone GPU):

- Frame times over a full tap combo to 昇天 and its ending, 4× CPU throttle, no screenshots during play: 1,143 frames, p50 8.3ms, p95 16.7ms, max 84.4ms, 1 frame over 34ms (`node 02-play.cjs cpu4 4`). Unthrottled with two mid-combo screenshots: p95 9.3ms, max 208.6ms, 6 frames over 50ms; those stalls line up with the screenshots, so they aren't counted against the game. 348 elements inside `.gr` at the end.
- Teardown: 0 animation-frame calls in 2s with the receipt up (the loop sleeps) and 0 after closing; the game's `devicemotion` listener comes off on close (2 → 1 app-wide); its two ResizeObservers disconnect on close (disconnect count 8 → 10); `.gr` is gone and `document.title` is restored.
- Layout at 375×591 in Japanese: HUD 172–252, heart 293–470, hint 510–563 (28px above the bottom), receipt 273–510.

### Positives (what to keep)

- One engine for the live game and the card's replay: seeded effect streams, closed-form rules between events, replay inputs fed through the same handlers, so a combo looks the same however frames fall.
- The loop never reads layout per frame, reuses fixed pools (stamps, sprites, lines, captions, dents), draws mini hearts on two canvases, skips unchanged draws, and sleeps once nothing moves; teardown is complete (measured above).
- Real accessibility: the heart is a `<button>` named "Send gratitude to @x" that takes focus on open; Enter/Space tap and key repeats don't count; a click alone taps, for Voice Control and screen readers; Enter alone reached 昇天 (84 hits, `03-ja-keys-stroke.cjs`); the polite live region said "Keep tapping before the bar runs out.", each tier ("Blushing." … "Ascension." in English, 照れ … 昇天 in Japanese), a total at most every 1.6s, and "Sent … to @x."; focus moves to the receipt's button, with a visible 2px Ink ring (`07`); the rest of the phone goes `inert` and hidden while the game covers it.
- Reduced motion keeps every state: tiers still slam (as fades), rising hearts fade in place, the heart fades instead of flying, no screen shake, haze, rays, flicker or climax, and the numbers are the same.
- Touch that forgives: the first tap counts on release with slop and hold guards, the heart's hit area never follows its squash or tremor, two thumbs both count, a stroke finger can't tap until it lifts.
- Discovery works as designed: three slow drags on the heart brought "Stroke it back and forth, fast" (shown and spoken), then fast passes unlocked stroke ("Stroke unlocked.") and ran a 59-hit combo to 昇天.
- The outbox keeps a combo on the device before its request goes, with an idempotency key, so a closed page doesn't lose it.
- No money words in any of the game's strings or glosses, and no NFT or wallet language.

## Design review (Assessment A)

### Design specificity verdict

Authored for Croquis, not interchangeable. The tier ladder named in Japanese (ありがと → 昇天) with 袋文字 slams and English glosses on white label stock, the heart's anime faces, manga focus lines, the mini-heart pile with real physics, the heart flying into the giver's picture, the "fuu…" sigh, and a receipt with a perforated grab edge all come from this product's world. At rest it keeps DESIGN.md's calm (Liner, one heart, one line of copy, a tilted pink multiplier label); it bursts only when pushed, which is PRODUCT.md's "sane on the surface, about to burst at the seams" done literally.

### Heuristics

1. Visibility of system status — **2**: in play it's excellent (bar with seconds, amount, multiplier, tier slams); after play, a failed send reads as "Gratitude sent", and a Close mid-combo sends without a word.
2. Match between system and the real world — **3**: arcade and anime conventions fit gamer artists, and the glossed Japanese keeps English speakers in on the joke; "hits", the leaderboard's own word, never shows while playing.
3. User control and freedom — **2**: X and Escape work at any time, but after the first tap they commit a once-per-gift combo with no receipt; there's no way to restart.
4. Consistency and standards — **3**: HUD type follows DESIGN.md (Figure amount, puffy multiplier); the receipt prints hits as fine print, not the hit counter.
5. Error prevention — **3**: first-tap guards, a fixed hit area, rate limits, lift-to-tap; the Close-sends path is the gap.
6. Recognition rather than recall — **3**: the ready hint and a full bar before the first tap; stroke and shake are hidden on purpose, with a tip after three tries.
7. Flexibility and efficiency — **4**: tap, stroke, shake, keyboard, click, two thumbs.
8. Aesthetic and minimalist design — **3**: calm at rest, maximal on purpose at the top; colliding pop-ins turn the maximal part into noise (`03`, `04`).
9. Error recovery — **1**: kept sends are silent; refusals give no reason and advise an impossible retry; the loop-failure copy misdirects.
10. Help and documentation — **3**: the hint and the contextual tips are the right help at the right moment; nothing says where the giver will see the gratitude.
    Total **27/40** (68%, Acceptable, at the top of the band).

### Cognitive load

Checklist: single focus ✓, chunking ✓, grouping ✓, visual hierarchy ✓ at rest (at 昇天 the HUD competes with slams, words and rain, deliberately), one thing at a time ✓, minimal choices ✓ (the heart and X), working memory ✓, progressive disclosure ✓ (stroke and shake revealed by trying). 0 failures: low load. No decision point has more than 2 options.

### Emotional journey

The Send gratitude sheet hands over to a calm screen: a breathing heart and a hint beating like a start button. The first tap lights a visible fuse, and each tier raises the heat (blush, heart eyes, overheat with steam and a nosebleed, then ascension with a flash, a limp pale heart and its soul rising into the giver's picture). The peak is earned and funny. The end is a quiet receipt: the amount large, "gratitude to @x", the giver's picture wearing a pink heart dot. Reassurance fails where it matters most: once per gift, the receipt claims success whether or not the server has it, and a Close mid-combo ends everything with no receipt at all. A 昇天 ending runs about 3.9s after 4.8–5.8s of play (phase log: ending 4,795ms → done 8,723ms in the tap run), unskippable, which a gamer thanking often will feel. There's no "new best" moment for someone chasing the leaderboard.

### Strengths

- The escalation is the product's signature and reads as made by artists: the tiers, faces and 袋文字 lettering are specific, clear at rest and funny at the top.
- Accessibility and reduced motion are designed in, not bolted on: a real button, the keyboard all the way to 昇天, spoken tiers and totals in both languages, fades that keep every state.
- One engine plays both the live combo and the Transfer Trail's replay, so the giver sees the combo the receiver actually played.

### Priority issues

- **[P1] A failed send reads as "Gratitude sent"** — Why: once per gift, no redo; the receiver is told it arrived, the giver sees nothing, and Send gratitude comes back to invite a duplicate. Fix: a kept state on the receipt and in the live region, retries while the app stays open, the detail honoring the outbox. Command: /impeccable harden
- **[P2] Close mid-combo commits silently** — Why: "Close" reads as cancel, but it sends a final once-per-gift combo and shows nothing. Fix: show the receipt of what was sent, or rename the action after the first tap. Command: /impeccable clarify
- **[P2] Pop-in words collide at the top tiers** — Why: the words are the comedy; stacked 袋文字 read as mush exactly when the screen is loudest. Fix: skip or retire instead of stacking; keep words off each other and off slams. Command: /impeccable polish
- **[P2] Hits are invisible while playing** — Why: hits rank Best combo on the leaderboard, yet the gamer artist can't watch them climb, and the receipt shows them as fine print against DESIGN.md's Hits Rule ("always shows as the hit counter"). Fix: the hit counter in the HUD from the 2nd hit and on the receipt. Command: /impeccable bolder
- **[P2] The top-tier words during stroking approach explicit** — Why: the brand's ceiling and LINE's policy; a friend thanking a friend's cute sticker can get "right there…" and "pant pant" beside a nosebleed. Fix: retire or re-gloss the few words that tip it. Command: /impeccable clarify

### Persona red flags

- **Casey (one-handed, interrupted):** a LINE notification that sends the app to the background ends the combo at once and records it; once per gift, the interruption caps their gratitude for good. The X in the top corner is a stretch for a thumb, but it's the exit, not the task.
- **Jordan (first-timer):** the first action is obvious ("Tap the heart as fast as you can!"); the full bar and ×1.0 mean nothing until play starts; a test tap followed by X to "start over" sends that one tap for good; the receipt never says what the number does or who will see it.
- **Sam (VoiceOver/keyboard):** works end to end (focus on the heart, Enter/Space, spoken tiers and totals, focus to the receipt); the time left is never spoken (the bar is `aria-hidden`), which the timed-game exception allows but still leaves them guessing; at VoiceOver's double-tap pace the multiplier likely stays low (unverified); and they hear "Sent" even when nothing was sent.
- **Friend-first artist:** the default is warm and the intensity is theirs to push; the risk is the top-tier words embarrassing them in front of the friend they're thanking.
- **Gamer artist chasing clout:** no live hits, no "new best", a multiplier already at its ×8.0 cap by オーバーヒート, 1.35s into a fast mash (`03`), and a ~3.9s ending they can't skip.
- **Artist suspicious of crypto:** clean; nothing here says NFT, token, wallet or money, and Gratitude is never priced.

### Minor observations

- The multiplier and the giver's initial render thin until Dela Gothic One loads (`08-stroke-tip.png`).
- The receipt floats mid-screen with wide empty Liner bands above and below it (`05`); it could sit lower, in the thumb's reach.
- "Back to your board" is the receipt's only way on, even when the game opened from a sticker detail, which closed to make room.
- The receipt prints the peak tier as 昇天 ASCENSION in fine-print capitals, where the game shows the gloss in quiet italics on a label.

### Questions to consider

- Should a hidden page pause the combo rather than end it, given there's no second chance per gift?
- Would a skippable ending after a person's first combo keep the climax special without taxing someone who thanks often?
- Should stroking have its own word bank at every tier, since it's the input most likely to be read as innuendo?
- Should the receipt tell the receiver when and where the giver will find out, given that telling the giver about new Gratitude isn't built yet?

## Not covered

- The Gratitude outbox under API failure in the browser: the demo records nothing, and no received gift existed in the seeded world (`/tmp/impeccable-audit/seed/` had no READY or world.json) during this lane; verified by code only.
- Shake: can't be tested headless; `phoneMotion.ts`, `shakeDetector.ts` and the engine's shake path were read. Tap, stroke and keys all work without it, as PRODUCT.md requires.
- The replay stage in a browser (needs recorded gratitude). `replay/` was read in full: the stage is `aria-hidden` with an inert heart, the card speaks for it, the clock pauses off screen, Stop and Escape tear it down, and reduced motion is followed mid-play.
- WebKit (the iPhone engine), 430×829, and a real iPhone GPU; the frame numbers above are a dev build in headless Chromium.
