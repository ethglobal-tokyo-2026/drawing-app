# cork: stat board (the turn, receipt, streak leaf, stamps, Bests, About tapes, Settings, address papers, Age verification, developer slip), sticker detail, Transfer Trail, timelapse

Commit: 9f541d12 · Files covered: all in brief (every file read in full) · Not covered in the browser: the address QR
dialog (Privy is off under LIFF Mock, so both papers stay "Getting your board address…" locally; code-read only),
"On its way" (needs a sent gift; code-read only), someone else's cork back (ArtistBoard's StatCork; not opened),
a successful gratitude replay (trail rows are crafted with fake gift ids), WebKit (Chromium only).
Seeder never finished: Residual and the Transfer Trail were produced with `page.route` (User Stats and the sticker
detail's answer rewritten in the browser) on a sticker this lane sealed for its own user (No.0008,
`cork_long_handle_for_the_byline1`). Scripts: `/tmp/impeccable-audit/scripts/cork/pass1-4.cjs`.
Screens inspected: own cork, real empty data, 390×741 — shots/cork/01-own-cork-390-real.png · Settings failed save —
02-settings-failed.png (text checked) · developer slip pulled out — 03-dev-slip-out.png (state checked) · crafted
Direct+Residual, long figures, 375×591 EN — 04-cork-375x591-en-US-crafted.png (also ja-JP and 430×829 measured) ·
stats loading — 05-cork-loading.png (text checked) · real data 375×591 hit-test — 06-cork-375x591-real.png ·
detail, gratitude owed + 2 earlier gifts — 07-detail-owed-375.png (text checked) · detail, foil sticker, open card,
32-char handles, EN 375 — 08-detail-trail-open-en-375.png · same in Japanese — 08-detail-trail-open-ja-375.png ·
replay + timelapse failures — 09-detail-failures-375.png (text checked) · detail check failed —
10-detail-check-failed-375.png · reduced-motion turn (measured, no shot).

## Audit (technical)

Proposed scores: **A11y 2** (solid bones — named dialogs, live lines, focus lands on Flip back, 44px bands — but a
verified focus loss in the trail, a 1.75:1 radio ring, loading read as "not known") · **Performance 3**
(transform/opacity WAAPI throughout, canvases released for iOS, timers stop when hidden; the pull-to-reveal animates
`height`) · **Theming 3** (tokens used almost everywhere; cork color hard-coded; type sizes drift off DESIGN.md's scale)
· **Responsive 2** (Japanese trail card runs off a 375px screen; Settings peek covers Flip back at 375×591; long
handles truncated; stamps clip at 4 digits) · **Integrity 3** (coherent and product-specific; errors in caps garble
their own detail; developer slip ships to everyone) → 13/20.

### Findings

- **[P1] In Japanese, the Transfer Trail's open card runs off the screen and clips Replay** —
  `apps/frontend/src/sticker-board/transfer-trail.css:6-11` (`.transfer-trail__list { display: grid }`, implicit `auto`
  track) with `apps/frontend/src/styles/base.css:93-95` (`:lang(ja) { word-break: auto-phrase }`) · Responsive ·
  Impact: with a long handle (32 characters are valid), phrases like 「作者の@Mika_draws_every_day_in_tokyo_32さんに」
  and 「@Hanako_…_handleさんが」 can't break, the grid track grows to their min-content, and the card overflows its
  column; `.sticker-detail__main` clips it. Japanese is the first market. · Standard: WCAG 1.4.10 · Fix:
  `grid-template-columns: minmax(0, 1fr)` on the list, `overflow-wrap: anywhere` on `.transfer-trail__say` and
  `.transfer-trail__split`. · Command: /impeccable adapt · Evidence: pass4, ja-JP 375×591: `.sticker-detail__main`
  scrollWidth 372 > clientWidth 313; Replay pill at x 316–422 on a 375px viewport; screenshot
  08-detail-trail-open-ja-375.png shows "▷ リ", "…handleさ", "…32さん" cut at the edge and the card's right border gone.
  English at 360 and 375 fits (main 298/298, 313/313).
- **[P1] The Transfer Trail drops focus, and with it the detail's Escape and arrow paging** —
  `TransferTrail.tsx:109-129,137-138,234-246`, `ui/useFocusTrap.ts:57`, `StickerDetail.tsx:214-218` · A11y · Impact: a
  closed row's `<button class="transfer-trail__head">` becomes the open card's `<p>` (new element), and "N earlier
  gifts" removes its own row, so focus falls to `<body>`; the focus trap and the ←/→ handler listen on the dialog root,
  so Escape no longer closes the detail and arrows no longer page. VoiceOver's cursor is thrown off the same way. Rows
  announce `aria-expanded="false"` but nothing ever reports `true`. · Standard: WCAG 2.4.3, 2.1.1, 4.1.2 · Fix: one
  `<button>` head per row in both states with `aria-expanded`; after unfolding, focus the first revealed row. ·
  Command: /impeccable harden · Evidence: pass3: focus before Enter on the fold `BUTTON.transfer-trail__head "2 earlier
gifts"`, after `BODY`; Escape then left the detail open (count 1); Enter on a closed row → `BODY`.
- **[P2] The detail's errors are 11px uppercase Graphite fine print, and the caps corrupt their own detail** —
  `StickerDetail.tsx:409-424`, `timelapse/TimelapseButton.tsx:92-96`, `TransferTrail.tsx:196-226` (all `.fine`,
  `styles/base.css:50-59`) · A11y/Integrity · Impact: the three failures on this screen read as caps sentences at the
  11px floor, under the key, and `text-transform: uppercase` rewrites case-sensitive detail meant for a report (a
  replay failure printed "…MUST MATCH PATTERN /^0X[0-9A-F]{64}$/"). When the detail check fails, **Send gratitude
  silently becomes Give** and **Timelapse disappears** (both depend on the answer), with only that caps line saying why.
  Settings and Age verification in the same slice use 13px Ink on Tomato Soft. · Standard: AGENTS.md errors;
  readability · Fix: one error treatment (13px Ink on Tomato Soft, sentence case, reason in its own case, Try
  again); say that the gratitude check didn't load where the key would be. · Command: /impeccable clarify · Evidence:
  pass3/4 text: "COULDN'T LOAD WHERE IT'S BEEN, OR WHETHER YOU'VE SENT GRATITUDE FOR IT: SOMETHING WENT WRONG
  (UNAVAILABLE). (SIMULATED: THE DATABASE IS BUSY)", acts `["Give"]`, timelapse button count 0;
  10-detail-check-failed-375.png.
- **[P2] At iPhone SE height the peeking Settings card covers Flip back and the croquis.eth tape** —
  `stat-board/settings-note.css:5-11`, `stat-board/SettingsNote.tsx:35-68` · Responsive · Impact: at 375×591 the card
  sticks at the cork's foot (top y 465) and rides over the stats: taps on the .eth tape and on Flip back's lower part
  land on Settings (which just scrolls itself in). Flip back is the labeled way back DESIGN.md puts in the thumb's reach.
  · Fix: keep the peek below the stats (reserve its height as bottom padding on the stats) or don't peek when the stats
  fill the screen. · Command: /impeccable layout · Evidence: pass2 real data 375×591: Flip back 445–480, .eth link
  443–489, Settings 465–682; `elementFromPoint` at the .eth center and 6px above Flip back's foot → SETTINGS NOTE;
  04-cork-375x591-en-US-crafted.png.
- **[P2] The sticker detail cuts the Original Artist's handle short** — `StickerDetail.tsx:319-325` places the
  ArtistChip inside the fine print, whose spans are `white-space: nowrap` (`sticker-detail.css:251-253`) · Responsive/
  Integrity · Impact: "@Mika_draws_every_day_in_tokyo_32" shows as "@Mika_draws_e…" (EN and JA, 360 and 375) on the one
  screen meant to name who drew it; DESIGN.md's plain chip shows whole handles up to 32 characters. · Fix: put the chip
  on its own line, full width, wrapping the handle. · Command: /impeccable adapt · Evidence: chip 187px in a 277px
  line (pass3/4); 08-detail-trail-open-en-375.png.
- **[P2] Unchecked language radios are nearly invisible** — `stat-board/settings-note.css:61-70` · A11y · Impact:
  the unchecked ring is Ink at 26%: 1.75:1 against the card, 1.86:1 against its white fill, so two of the three rows
  don't read as choices at a glance. · Standard: WCAG 1.4.11 · Fix: Graphite ring (≥3:1). · Command:
  /impeccable polish · Evidence: pass1 contrast computation; 01-own-cork-390-real.png.
- **[P2] Loading stats look and sound like failed ones** — `stat-board/StatCork.tsx:61-71,189-199`,
  `stat-board/StatBoard.tsx:55-61` · A11y/States · Impact: while User Stats load, every figure is "–" spoken "not known"
  and the receipt has an empty line; DESIGN.md's Loading section asks for outlines and one status line. · Fix: a
  loading variant (Liner Deep figure blocks, "Loading your stats" once). · Command: /impeccable harden · Evidence:
  pass1 with the request held: receipt "GRATITUDE RECEIVED\n\nTOTAL\n–\nnot known", stamps "–not knownmade…";
  05-cork-loading.png.
- **[P2] Age verification's busy state uses `disabled`** — `stat-board/AgeVerificationNote.tsx:108-119` · A11y ·
  Impact: "Opening World ID…" sinks the label grey as if unavailable and `disabled` drops focus to `<body>`;
  DESIGN.md's Busy rule: keep the face, `aria-busy` + `aria-disabled`, never `disabled`. · Standard: WCAG 2.4.3 ·
  Command: /impeccable harden · Evidence: code read.
- **[P3] Stamp counts of 1,000+ are clipped** — `stat-board/stat-board.css:363-423` (70px stamps, 26px figures) ·
  Responsive · "1,204" shows as "1,20" (04-cork-375x591-en-US-crafted.png). A heavy user reaches it in about a year of
  daily stickers. · Fix: step the figure down past 3 digits, as the trail's `.is-long` does. · Command: /impeccable adapt
- **[P3] Explorer link's name doesn't contain its visible label** — `stat-board/AddressDialog.tsx:375-385`
  ("View on Etherscan" vs "View your board address on Etherscan") · A11y · Standard: WCAG 2.5.3 · Command:
  /impeccable polish · Evidence: code read.
- **[P3] Type sizes off DESIGN.md's scale, across the slice** — DESIGN.md: "Text never sits between the steps (12,
  12.5, 13.5, 14 or 16px)". Receipt rows 14px (`stat-board.css:251,256`), Bests 13.5/14px (`:501,507`), label tape
  12px (`:578`), Age verification lead 14px (`age-verification-note.css:27`), .eth line 13.5px
  (`sticker-detail.css:229`), On its way 14.5px (`:304`), trail rows/amount/Replay 13.5px
  (`transfer-trail.css:44,92,194`), artist line 12.5px (`:242`) · Theming · Command: /impeccable typeset.
- **[P3] Cork color hard-coded twice, no token** — `stat-board/board-flip.css:45`, `stat-board/stat-board.css:17`;
  DESIGN.md names `cork` but `styles/tokens.css` has no `--cork` · Theming · Command: /impeccable polish.
- **[P3] The pull-to-reveal animates `height` and forces layout on every touch move** —
  `stat-board/usePullToReveal.ts:72-76` (writes `--pull`, then reads `scrollHeight` via `end()`), `:94-97` (settle
  animates `height`) · Performance · Ships to every user (see below). · Command: /impeccable optimize.

### Positives (what to keep)

- The turn: mid-turn tap reverses; the face turning away goes inert; focus lands on Flip back (measured:
  `stat-board__flip-back` focused after landing); reduced motion crossfades (measured opacity 0.28/0.72 at 60ms,
  `transform: none`, rear at 1 by 460ms).
- Settings failure: the reason shows on Tomato Soft as `role="alert"`, and the radio reverts to what's saved
  (measured `[true,false,false]` after a simulated 500).
- Timelapse button keeps one width across Loading/Preparing/Skip, its live line says "Playing…"/"Done", and the player
  releases its canvases (iOS budget) and sleeps while the page is hidden.
- Empty states in words ("No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
  "Not started", "None yet"), and Residual left off at 0 so a friend-first artist sees Direct alone.
- Paging announces the sticker it landed on (`countSpoken`); the dialog title follows the sticker for LINE's header.

## Design review (Assessment A)

### Design specificity verdict

Authored for Croquis, not interchangeable. The cork back is a real object — printed receipt with a zigzag foot, torn
calendar leaf, perforated stamps, a ruled notebook scrap whose rows sit on its lines, label-maker tape, QR papers held
by push pins shaped as the chain marks — and the stat figures read as things pinned up, not a dashboard. The detail's
binding strip and the Transfer Trail's quiet sentences with one pink-outlined card (Replay inside it, never a modal)
are equally particular. Where it slips is the text system around failures, which falls back to generic caps fine print.

### Heuristics

1 Visibility of status **3** — Saving…, timelapse labels, live lines; stats loading shows the failure dash.
2 Match with the real world **3** — the paper metaphors land; "Direct"/"Residual", "Board address · Ethereum Sepolia",
"Sui Testnet" and "World ID … Orb" are unexplained terms.
3 User control **3** — Flip back, bare cork, Escape, LINE's Back, mid-turn reversal; a language tap reloads the app at
once with no word that it will; Flip back covered at SE height.
4 Consistency **2** — two error styles on one feature; trail rows are buttons until open, then not; type off-scale.
5 Error prevention **3** — little to get wrong; the instant reload is the one trap.
6 Recognition over recall **3** — sentence rows ("@mika gave it to you · 9.29") need no decoding; "Residual" does.
7 Flexibility **3** — swipe, strip, carets and arrow keys page the detail; the hidden Developer tools button.
8 Aesthetic/minimal **3** — handsome; small noise: "1 / 1" pager with two dead carets, fine-print lines that start with
"·", a five-line artist split line with long handles.
9 Error recovery **2** — every failure has a reason and Try again, but in caps at 11px, and the check failure changes
the call silently.
10 Help **2** — Age verification never says what verifying unlocks (seeing and receiving NSFW stickers) or what an Orb
is; the receipt never glosses Residual.
**Total 27/40 (Acceptable, top of the band).**

### Cognitive load

Own cork: 1 checklist failure — single focus: stats share the surface with account plumbing (Settings, two chain
address papers, Age verification, and on live builds the developer slip). Sticker detail: 0–1 — up to ~7 tappable
things (pager, strip, .eth link, Timelapse, key, label, rows, fold) but one key leads and older gifts fold. No decision
point exceeds 4 real choices (Settings has 3).

### Emotional journey

Peak: the board turning over to its cork, and a replay landing in the card's heart dot. Valley: a first-timer's cork is
all zeros ("0" ×3 stamps, "None yet" ×3, "Not started") — honest, and the receipt's sentence says how Gratitude
arrives, but nothing points to the act that fills it (give a sticker). High-stakes moments: Age verification reassures
("Croquis learns nothing else about you"); the language change doesn't say the app will restart.

### Strengths

1. Stats as pinned paper — the one place stats live, legible at a glance, with Figure type doing the shouting.
2. The Transfer Trail: newest gift first, one open card, "N earlier gifts" fold, Give/Send gratitude order that follows
   what's owed.
3. Motion with state: the turn, the address paper lifting into its dialog and flying back to its pin, timelapse
   painting inside the sticker's own silhouette.

### Priority issues

- [P1] Japanese trail card overflow — long handles can't break, card and Replay run off screen. Fix: minmax(0,1fr)
  track + overflow-wrap on handles. /impeccable adapt
- [P1] Trail focus loss — Escape and paging die after one Enter. Fix: persistent disclosure buttons. /impeccable harden
- [P2] Caps fine-print errors; the check failure swaps Send gratitude for Give without saying so. Fix: one error
  style, a line where the key was. /impeccable clarify
- [P2] Settings peek covers Flip back and the .eth tape at 375×591. /impeccable layout
- [P2] Original Artist's handle truncated in the detail's chip. /impeccable adapt

### Persona red flags

- **Casey** (one-handed, interrupted): at SE height the thumb-zone Flip back is half under the Settings card; a stray
  tap on a language row restarts the app immediately.
- **Jordan** (first-timer): "Direct", "Residual", "Board address / Ethereum Sepolia", "Sui Testnet", "World ID", "Orb"
  with no gloss; an all-zero cork with no pointer to giving.
- **Sam** (VoiceOver/keyboard/zoom): trail focus loss (verified); stats loading announced as "not known"; an
  English-only "Developer tools" button in the order of every live stat board (`deploy/deploy.sh:30-32` builds with
  `VITE_DEV_SLIP=on`); 11px caps errors are hard at zoom.
- **Friend-first artist**: good — Direct alone, warm sentence rows. The artist split line under a gift gets long.
- **Gamer artist chasing clout**: stamp counts clip at 1,000+ ("1,20"); the hit counter and Bests read well.
- **Artist suspicious of crypto**: two QR "address" papers with chain names and chain-logo pins sit permanently under
  Settings on their own cork (allowed by PRODUCT.md as a plain fact, but always in view rather than where needed).

### Minor observations

- The detail's heading reads "sticker No.0008" with a lowercase "sticker" (`i18n/strings/stickerBoard.ts:413`).
- A lone sticker shows "1 / 1" between two disabled carets.
- Fine print wraps so a line starts with "·" ("· 2026.09.30") — 08/10 screenshots.
- `.sticker-detail__slide` keeps `will-change: transform` at rest (`sticker-detail.css:132`; one layer, commented).
- Address copy failure is a toast only (`AddressDialog.tsx:295-304`), though the address stays selectable.
- Unverified: the address papers have no timeout while Privy is still signing in (`addresses.ts:18-45` starts the
  15s timer only after sign-in), so "Getting your board address…" could sit indefinitely if Privy stalls.

### Questions to consider

- Should the developer slip (and its focusable button) ship to every live user, or only to accounts that ask for it?
- Should account plumbing (addresses, Age verification) live on a second paper stack so the cork stays about stats?
- Does "Residual" need a one-line gloss on the receipt, given it's the one money word allowed?
- Should Age verification say what it unlocks before asking someone to find an Orb?
