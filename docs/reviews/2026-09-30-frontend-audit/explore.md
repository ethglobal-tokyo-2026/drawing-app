# explore: Explore (Stickers pile, lifted sticker sheet, This week leaderboards, artist search)

Commit: 9f541d12 · Files covered: all in brief (ExploreScreen.tsx/.css, StickerPile.tsx, sticker-pile.css, pileLayout.ts, pileDays.ts, pileOrigin.ts, pileVisits.ts, LiftedSticker.tsx, lifted-sticker.css; plus their catalog `i18n/strings/explore.ts` and the server's `apps/api/src/explore/*` for what the boards mean) · Not covered: "to @ken" tags and given captions in the browser (no received gifts in the local database; the seeder's READY never appeared), WebKit (Chromium only, for time), 360/430 widths, the pile's layout cost at 50 stickers a day (measured at 6).
Screens inspected (Chromium, DPR 3; probe `/tmp/impeccable-audit/scripts/explore/probe.cjs`, results `/tmp/impeccable-audit/scripts/explore/results.json`): first look after the fall-in 390×741 — shots/explore/01-pile-390.png · keyboard focus on a pile sticker — 02-pile-focus-390.png · lifted sheet 390×741 — 03-lifted-390.png · lifted sheet 375×591 — 04-lifted-375x591.png · This week, Longest streak with your own row — 05-thisweek-streak-390.png · search with a 32-character handle 375×591 — 06-search-long-375x591.png · no results — 07-search-none-375x591.png · pile in Japanese 375×591 — 08-pile-ja-375x591.png · This week in Japanese 375×591 — 09-thisweek-ja-375x591.png · skeleton (Explore never answers) — 10-skeleton-390.png · failure (500) — 11-failed-390.png · return visit with a NEW pip — 12-return-new-390.png. (Shots are in /tmp/impeccable-audit/shots/explore/.)

## Audit (technical)

Proposed scores for this slice: **A11y 2** (strong pile semantics, but leaderboard rows speak neither rank nor figure, your row fails contrast, search is silent and clearing drops focus) · **Performance 3** (first look 115ms to pile, fall-in settled at 1.34s, no long tasks; hidden fall layers never unmount; 50-sticker cost unverified) · **Theming 3** (tokens throughout; a few hand-picked Ink/Graphite alphas) · **Responsive 3** (375×591 and Japanese hold, long handles wrap whole, 44px targets; 360/430 not checked) · **Integrity 3** (one misnamed board, dead code from a removed rank row and an unused `liftedId` path, DESIGN.md drift)

### Findings

- **[P1] Leaderboard and search rows speak only "@x's sticker board": rank, figure and LINE name never reach a screen reader** — `apps/frontend/src/explore/ExploreScreen.tsx:78-85` (`aria-label` on the row button replaces its content), set at `:125-129` · Accessibility · Impact: a VoiceOver user on This week hears "@Copy-en's sticker board, button" six times, with no rank and no "1 day"/"64 hits"/Gratitude figure, so the leaderboards carry no information by ear; on your own row the name is "Your sticker board" while the visible text is "@Explore-me You", so voice control ("tap @Explore-me") misses it · Standard: WCAG 1.3.1, 2.5.3 · Fix: drop `aria-label`; let the row's text be its name, give each figure a spoken unit (visually hidden "gratitude"/"hits"/"days"), and say where it goes with `aria-description` or a hidden suffix · Command: /impeccable harden · Evidence: `locator('.leaderboard').ariaSnapshot()` → `button "@Copy-en's sticker board": 1 @Copy-en Copy-en 1day`, `button "Your sticker board": 3 @Explore-me You 1day` (results.json `thisWeek.aria`).
- **[P1] Your own leaderboard row fails contrast: "You" and the streak unit at 3.45:1** — `apps/frontend/src/explore/ExploreScreen.css:254-256` (`li.me` on `--pink-soft`) under `.row-names span` (`:301-307`, Graphite 13px/400) and `.figure small` (`:329-335`, Graphite 12px/700) · Accessibility · Impact: the one row a person looks for first has its second line and unit below AA; the rank on that row already switches to Ink (`:267-270`), the text beside it doesn't · Standard: WCAG 1.4.3 · Fix: Ink (or a token checked at ≥4.5:1 on pink-soft) for `li.me .row-names span` and `li.me .figure small`; check the hit counter's HITS on that row too (unverified: Best combo was empty) · Command: /impeccable polish · Evidence: computed in page, rgb(110,104,120) on composited rgb(246,192,218) = 3.45:1 for both "You" and "day" (results.json `thisWeek.boards.2.meContrast`); 05-thisweek-streak-390.png.
- **[P2] Clearing the search drops keyboard focus to `<body>`** — `apps/frontend/src/explore/ExploreScreen.tsx:622-631` · Accessibility · Impact: the clear button unmounts with the query and nothing takes focus, so a keyboard, switch or VoiceOver user is thrown to the top of the document · Standard: WCAG 2.4.3 · Fix: focus the input in the clear handler · Command: /impeccable harden · Evidence: focus the clear button, press Enter → `document.activeElement` is `BODY` (results.json `search.afterClear`).
- **[P2] Search results are never announced** — `apps/frontend/src/explore/ExploreScreen.tsx:469-479` ("Searching…" is a `role="status"` mounted with its text and unmounted when results land), `:494-496` (the count is plain fine print), `:484-490` (no results) · Accessibility · Impact: a screen-reader user types a handle and hears nothing: not the count, not "No one here is @x yet"; the Explore loading line (`:377-384`) has the same mount-with-text pattern · Standard: WCAG 4.1.3 · Fix: one persistent polite region in ExploreScreen that says Searching…, then "1 artist" or the no-results title, set after mount, as the pile's arrivals line already does (`apps/frontend/src/explore/StickerPile.tsx:404-414, 456-458`) · Command: /impeccable harden · Evidence: after results rendered, no `[role=status]` or `[aria-live]` inside `.explore` (results.json `search.res.statusRegions: []`).
- **[P2] "Longest streak" ranks current streaks, under "This week" and "Resets Monday"** — `apps/frontend/src/explore/ExploreScreen.tsx:50`, `apps/frontend/src/i18n/strings/explore.ts:110` (its own comment says "current streak"), server `apps/api/src/explore/leaderboards.ts:27` ("Current streaks, as each person's User Stats count them") · Integrity · Impact: "Longest streak" is the stat board's name for the all-time best, and this board neither holds a longest run nor resets on Monday; a gamer artist reads the wrong record · Fix: call it the current streak (ja 連続日数 is already neutral), or rank the week's longest run on the server; keep the reset line off it · Command: /impeccable clarify · Evidence: code read; all six seeded rows show "1 day", their current streak (05).
- **[P2] Ties take distinct ranks in handle order** — server `apps/api/src/explore/leaderboards.ts:117-124` (stable sort over people A to Z), shown by `apps/frontend/src/explore/ExploreScreen.tsx:346` (`i + 1`) · Integrity · Impact: six people on a 1-day streak are ranked 1–6 by alphabet; streak ties will be the common case, and the rank a clout-chasing artist sees is decided by their handle's first letter · Fix: competition ranking (equal values share a rank: 1, 1, 1…), or show no rank on ties · Command: /impeccable clarify · Evidence: 05-thisweek-streak-390.png (ranks 1–6, all "1 day").
- **[P3] Dead code: a removed rank row and an unused `liftedId` path** — CSS `.section-head` (`apps/frontend/src/explore/ExploreScreen.css:71-88`), `.row-art` (`:272-276`), `.rank-gap` (`:337-350`, "Ranks skipped between the top five and yours": no such row renders); `.pressable`'s comment (`:223`) still names "today's stickers and feed heads"; `Stickers` never passes `liftedId` (`apps/frontend/src/explore/ExploreScreen.tsx:541`), so `StickerPile`'s focus-return effect (`apps/frontend/src/explore/StickerPile.tsx:431-440`) and `[data-lifted]` ghost rule (`apps/frontend/src/explore/sticker-pile.css:177-180`) never run; the ghost and focus return actually come from `useDetailLift` and `useFocusTrap` · Integrity · Fix: delete them (one implementation per concept) · Command: /impeccable distill · Evidence: rg over apps/frontend/src finds no other use; measured ghost opacity 0.18 during a lift and focus back on the last shown sticker's button without `liftedId` (results.json `keyboard.opened.ghost`, `keyboard.back`).
- **[P3] The fall-in never finishes in state: its hidden blurred layers stay mounted** — `apps/frontend/src/explore/StickerPile.tsx:400-403, 427-429` (`dropping` only goes waiting → falling; "done" is never set after a first render), `:252-259` (the `.pile-sticker__air` image) · Performance · Impact: every sticker that fell keeps a second `<img>` under `filter: brightness(0) blur(3px)` at opacity 0 and stays `loading="eager"` for the life of the pile (up to 14) · Fix: set "done" when the last fall animation finishes · Command: /impeccable optimize · Evidence: after the fall settled (1337ms), 5 `.pile-sticker__air` and 5 `[data-falling]` remain (results.json `firstLook.dom.airImgsLeft`, `fallingAttrLeft`).
- **[P3] "Resets Monday 12:00 AM" doesn't say Tokyo** — `apps/frontend/src/i18n/strings/explore.ts:97` · Copy · Impact: for English readers outside JST the reset is hours (for the US, a day) off; the ticket refill line converts Tokyo midnight into the person's own time (`apps/frontend/src/i18n/strings/tickets.ts:85`), so the two disagree · Fix: format `leaderboards.weekStart` (already in the payload, unused) in the person's own time · Command: /impeccable clarify · Evidence: code read; 05.
- **[P3] The lifted sheet dates a sticker in the device's time zone; the pile files it under its Tokyo day** — `apps/frontend/src/explore/LiftedSticker.tsx:149` (`formatDay`, local `getDate`) vs `apps/frontend/src/explore/pileDays.ts:10` · Integrity · Impact: outside JST a sticker under the "9.30" badge can print 2026.09.29 in its sheet · Fix: format the seal day as a Tokyo day, as the pile does · Command: /impeccable harden · Evidence: code read (unverified in browser).
- **[P3] Error reasons set in fine print's capitals** — `apps/frontend/src/explore/ExploreScreen.tsx:457` (`<p className="fine muted">`) · Accessibility/typography · Impact: the one sentence that says why Explore failed is 11px uppercase Graphite ("SOMETHING WENT WRONG (INTERNAL)."), which DESIGN.md already refuses for a sentence-length note (the empty leaderboard) · Fix: a 13px supporting note · Command: /impeccable typeset · Evidence: 11-failed-390.png.
- **[P3] Hand-picked colors outside the tokens** — `apps/frontend/src/explore/lifted-sticker.css:113` (`rgba(110, 104, 120, 0.4)` on disabled carets; DESIGN.md: "No other graphite is picked by hand"), `apps/frontend/src/explore/sticker-pile.css:32, 70` (perforation dots at 22% Ink, between `--rule` 14% and `--rule-strong` 26%) · Theming · Fix: tokens · Command: /impeccable polish · Evidence: code read.
- **[P3] DESIGN.md still turns days over at 4:00** — `DESIGN.md:589` ("Resets Monday 4:00"), `:590` ("turning over at 4:00") vs `apps/frontend/src/tickets/config.ts` (`TICKET_DAY_UTC_OFFSET_MS` = 9h, midnight Tokyo) and PRODUCT.md ("Every day ends at midnight Tokyo time") · Doc drift · Command: /impeccable document · Evidence: code read; the UI says 12:00 AM (05).

### Positives (what to keep)

- The pile's structure for assistive tech matches DESIGN.md: a `section` per day with an SR-only `h2` ("Today", "Yesterday"), an ordered list of buttons newest first, named "No.0006 by @Tray-base, just now" (results.json `firstLook.dom`).
- Keyboard path is short and right: search → the view switch (roving tabindex, arrows, Home/End) → first sticker; the focus ring sits round the cut and the sticker rises (ring opacity 1, 02). Arrow keys on the leaderboard tabs wrap and move focus (verified).
- The lifted sheet is a real dialog: name, focus trap, Escape, arrow keys, "2 of 6" paging announcements, 36×44 carets padded to 44px, focus returned to the sticker it lands on (verified); at 375×591 it fits without scrolling (456px tall, actions end at 571px).
- Return visits: a NEW pip and "1 new sticker since you last looked" through a region that exists before its text changes (12, results.json `returnVisit`).
- Text contrast on the pile and tabs passes: day badge 12.64:1, tags 16.33:1, inactive tabs 4.98:1, "Resets" 4.77:1, empty board 5.03:1 (computed).
- Long handles show whole: a 32-character handle takes three tag lines with none cut (`truncatedLines: []`), and wraps whole in rows (06); Japanese tabs fit at 375 (09).
- Cost is small at this size: 115ms from tab tap to pile, fall-in settled at 1.34s, no long tasks, ScriptDuration +18ms and LayoutDuration +3ms over the switch (CDP Performance.getMetrics); motion is transform/opacity; pile images outside the fall load lazily.
- Failure persists with its reason and Try again (`role="alert"`, 11); the skeleton outlines today's floor with 5 die-cut shapes and one "Loading…" status (10).

## Design review (Assessment A)

### Design specificity verdict

Authored for Croquis. A heap of real die-cut stickers on perforated day floors, dot badges at the house tilt, name tags hung across each sticker's lower-left edge, a gravity fall-in with squash and rebound, and a lift into a sheet with live resin: no other product could use this unchanged (01, 03, 12). The leaderboard is the most generic part (ranked rows, avatar, number), held in the world by the sliding label, the streak's tangerine fire and the hit counter. Search is deliberately plain, which is right for a tool.

### Heuristics

1. Visibility of system status — 3: skeleton floor, NEW pips and their announcement; search and its results say nothing to screen readers, and you can't see where you stand outside the top ten.
2. Match with the real world — 3: pile, perforation, "Put back" and "to @ken" read naturally; "Longest streak" names a different record; "Resets Monday 12:00 AM" omits Tokyo.
3. User control and freedom — 4: Put back, scrim, perforation, Escape, LINE's Back, clear search.
4. Consistency and standards — 3: the lift and paging match the board's sticker detail; "Longest streak" means current here and all-time on the stat board; error reasons break the no-capitals-for-sentences rule.
5. Error prevention — 3: little to prevent in a browse surface; a leading @ is stripped, paging clamps at the ends.
6. Recognition rather than recall — 3: every sticker wears its artist's name; "This week" doesn't say it holds the rankings.
7. Flexibility and efficiency — 3: swipe, carets and arrow keys page; Home/End on tabs; reaching an artist from the pile is two taps (lift, then Go to board).
8. Aesthetic and minimalist design — 4: calm Liner, quiet tags, the stickers lead.
9. Error recognition and recovery — 3: "Couldn't load Explore" with a reason and Try again that persist; no-results offers the LINE-gift path, but says "Handles are exact" while search matches any part of a handle.
10. Help and documentation — 2: nothing says what Best combo counts or how to get on an empty board; no-results is the only help.
    Total 31/40 (Good).

### Cognitive load

0 checklist failures (low): two views, three boards, one pile, one sheet. No decision point shows more than 4 options (the pile is content to browse, not choices).

### Emotional journey

Peaks: the first look's fall-in, the lift off the heap, and the NEW pip on a return (12). Valleys: This week in a quiet week is three boards of "No one is on it yet this week." with no hint how to get on (Most gratitude and Best combo stay empty until gifts are received and Gratitude played); a player outside the top ten never sees themselves; tied streaks rank by alphabet. Explore has no high-stakes act; its path to giving (lift → "Go to @x's sticker board" → Give) is clear.

### Strengths

1. The pile is a browse surface with its own physics and memory: seeded, stable layouts per Tokyo day, tags that never get covered, only new stickers falling on return.
2. Accessibility was designed for a spatial layout rather than bolted on: day headings, ordered lists, a ring round the cut, the focused sticker rising to the top.
3. The lift/put-back loop gives every exit the same flight back, and paging reads in the pile's own order.

### Priority issues

- **[P1] The leaderboards carry nothing by ear.** Rows are named "@x's sticker board", so rank and figure vanish for VoiceOver. Why: the board's whole content is the rank and the number. Fix: row text as the name, spoken units on figures. /impeccable harden
- **[P2] "Longest streak" under "This week" is neither.** It ranks current streaks and never resets. Why: a gamer artist compares the wrong record, and "Resets Monday" misleads under it. Fix: rename or re-rank on the server. /impeccable clarify
- **[P2] Tied ranks by alphabet.** Why: ties are the norm for streaks; "#6" for an equal streak reads as losing. Fix: shared ranks. /impeccable clarify
- **[P2] Search is silent and clearing loses focus.** Why: finding a friend by handle is Explore's first job for Sam. Fix: a persistent status region; focus back to the input. /impeccable harden
- **[P3] Empty boards are a dead end.** Why: Jordan can't tell how to get on Best combo. Fix: one line on what counts (a combo you play when a sticker's given to you). /impeccable onboard

### Persona red flags

- **Casey (one-handed, interrupted):** fine; stickers and tags are large targets, the sheet's actions sit low, and the pile keeps its layout and NEW marks across interruptions. The search and view switch sit at the top, far from the thumb, which is acceptable for browsing.
- **Jordan (first-timer):** "This week" doesn't say rankings; "Best combo" means nothing before the Mini-game; empty boards don't say how to get on; "Handles are exact" contradicts partial matching.
- **Sam (VoiceOver/keyboard/zoom):** leaderboard rows lose rank and figure; search is silent; clear drops focus; "You" on your own row at 3.45:1. The pile itself is well built for them.
- **Friend-first artist:** finds a friend's sticker by its tag and reaches their board in two taps. Red flag: search matches handles only, while rows show LINE names, so a friend known by their LINE name may not turn up.
- **Gamer artist chasing clout:** the "Longest streak" board isn't what it says, ties are ranked by alphabet, and a rank outside the top ten is invisible (the server lists ten; the unused `.rank-gap` style suggests a "your rank" row was once planned).
- **Artist suspicious of crypto:** clean. No NFT/crypto/token/wallet words anywhere in Explore's strings; croquis.eth appears only in a name-link's error title, which PRODUCT.md allows.

### Minor observations

- The badge's ja "今日9.30" runs the words together where the English has a space (08).
- Tag and row line breaks can leave a two-character orphan ("x1") under the 60% break-fill rule (01, 06).
- "ago" in the pile's names freezes at the pile's mount; a pile left open reads "just now" an hour later.
- Paging past the last sticker repeats "6 of 6"; the caret's `aria-disabled` is the only signal.
- A keyboard-opened sheet lands focus on the perforation, whose ring draws a hard black box across the sheet's rounded top (03).

### Questions to consider

- Should This week show where you stand outside the top ten?
- Is the streak board meant to be the current streak (rename it) or the week's longest run (change the server)?
- Should search also match LINE names, since every row shows one?
- Should an empty board say how to get on it, so the leaderboards teach the Mini-game?
