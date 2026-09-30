# entry: first open and boot, sign-in failures, the handle prompt, session loss mid-use, API errors, LINE gate, language + Japanese font, formats, Privy/Sui/World ID

Commit: 9f541d12 · Files covered: all in the brief (api/, line/, identity/, performance/, the i18n runtime), plus the strings they show (strings/api.ts, errors.ts, line.ts) and SettingsNote's language save (for language switching) · Not covered: Privy, Sui and World ID in a browser (Privy is off under LIFF Mock: `identity/PrivySignIn.tsx:38`, so the developer slip's Privy rows and IDKit never render locally; read in code only); the LINE gate's logged-out and "LINE didn't start" states (LIFF Mock always logs in; read in code only); WebKit (time).
Screens inspected (Chromium, 390×741 unless noted; scripts and raw output in /tmp/impeccable-audit/scripts/entry/ a.out–e.out): first open — shots/entry/a1-boot-early.png, a1-boot-board.png · API refusing connections — a2-api-down.png · API hanging — a4-api-slow-5s.png, a4-api-slow-failed.png · board 500 at boot — a5-board-500.png · 401 after boot — a6-401-explore.png, a6-401-shop.png, a6-401-draw.png · handle prompt, name taken — b1-handle-name-taken.png · handle prompt, taken on submit at 375×591 — b2-handle-taken-error-375x591.png · 32-char handle at 375 — b3-handle-32chars-375.png · 16-char handle at 375 — d1-handle-16chars-375.png · Japanese handle prompt — b4-handle-ja.png · Japanese first open — c1-ja-board-first.png, c2-ja-board-6s.png · after picking English in Settings — e1-after-english.png, d2-after-english.png

Cross-reference: the frontend code review (docs/review/2026-09-29-frontend-code-review.md on main) already has SHELL-5 (views.ts "Someone") and SHELL-2 (Sui signer wait). Not repeated below except where people see something the review doesn't cover.

## Audit (technical)

Proposed scores for this slice: A11y 2 (failure screens aren't announced; handle field has no house focus ring) · Performance 3 (early session and a recorder that costs a flag check when off; Japanese face lands ~1.3 s after the board) · Theming 3 (aqua halo and browser-default placeholder on the handle field; busy key sinks) · Responsive 2 (handle prompt runs off a 375 px phone from a 17-character handle) · Integrity 2 (a lost session dead-ends every screen; the handle prompt gives the wrong reason; "token" and route paths in visible copy)

### Findings

- **[P1] A session that ends after boot has no way back in: every screen dead-ends on "You're signed out."** — `apps/frontend/src/api/SessionGate.tsx:129-133`, `apps/frontend/src/api/useApiQuery.ts:35-38`, `apps/frontend/src/i18n/strings/errors.ts:200` · Integrity · Impact: once the cookie's session is gone (expired, account removed, server's session reset), Explore shows "Couldn't load Explore / YOU'RE SIGNED OUT. / Try again", and Try again answers 401 again forever; Draw's card says "Couldn't use a ticket. You're signed out." and offers Start drawing again; the Shop loses its price line with no error at all. Only `signed_out` at boot is handled (rg "signed_out" src: earlySession.ts:49, SessionGate.tsx:130, errors.ts:200 — nothing else). Inside LINE the only recovery is closing and reopening the LIFF window, which nothing tells the person · Standard: n/a · Fix: one handler for 401 `signed_out` from any request that returns SessionGate to signing in (LINE's ID token, or "Reconnect with LINE" when it has expired), and errors.signed_out copy that names the recovery ("You're signed out. Reopen Croquis from LINE to sign in again.") · Command: /impeccable harden · Evidence: page.route answering 401 after the board loaded (a.out `after401Explore`, `after401Draw`, `after401Shop`, `requests401`), a6-401-explore.png
- **[P2] The handle prompt tells a person their LINE name is taken when it only can't be a handle** — `apps/frontend/src/api/HandlePrompt.tsx:61-65`, `apps/frontend/src/i18n/strings/api.ts:26-30` · Integrity/copy · Impact: a first-timer whose LINE name contains "@" (the server's rule: 1–32 code points, no "@", `apps/api/src/session/handles.ts:6-10`) reads "Someone already goes by @Entry@bad, so choose your own." — false, and it prints an "@" inside the handle; Japanese says the same ("@Entry@jpはすでにほかの人が使っているので…"). The lead picks its sentence only on whether a LINE name exists · Fix: have the server say why (`needsHandle: "taken" | "invalid"`), or one sentence true for both ("{{name}} can't be your handle here, so choose your own.") · Command: /impeccable clarify · Evidence: b.out `invalid`, `ja`
- **[P2] The handle prompt runs off the screen once the handle passes ~16 characters** — `apps/frontend/src/api/HandlePrompt.css:3-8`, `apps/frontend/src/api/HandlePrompt.tsx:87-89` · Responsive · Impact: the key's label "Use @{{handle}}" grows the one-column grid past its `min(320px, 100%)`, and the field and problem line widen with it; the gate is `position: fixed` (`line/LineGate.css:3-5`) so nothing scrolls. At 375 px: "sakura_mochi_art" (16) puts key and field at 28–373 px; 32 characters (the allowed maximum) at 28–726 px, cutting off the key's label, the field's right end and the problem line ("@entry-tk2 is ta…") · Standard: WCAG 1.4.10 (Reflow) · Fix: `grid-template-columns: minmax(0, 1fr)` on the form, and a key label that can't outgrow it (ellipsize the handle inside the key, or a fixed "Use this handle" with the handle echoed in the field) · Command: /impeccable adapt · Evidence: d.out (widths at 390 and 375), b.out `key32` (width 699 in a 375 viewport), b3-handle-32chars-375.png
- **[P2] Failure screens before the app opens aren't announced** — `apps/frontend/src/api/SessionGate.tsx:193-216`, `apps/frontend/src/line/LineGate.tsx:13-31` · Accessibility · Impact: while signing in, the only live region is the "Opening…" `role="status"` line; on failure it is replaced by an h1, a lead and a key with no live region and no focus move, so VoiceOver hears nothing change and focus stays on the body · Standard: WCAG 4.1.3 · Fix: keep one live region across the gate's states (put the failure's heading and lead in `role="alert"`, or move focus to the h1 with `tabIndex={-1}`) · Command: /impeccable harden · Evidence: code read
- **[P2] 16 seconds of one fine-print line while the server doesn't answer** — `apps/frontend/src/api/SessionGate.tsx:195-200`, `apps/frontend/src/api/httpApi.ts:7`, `apps/frontend/src/line/LineGate.css:50-55` · Integrity/status · Impact: with the API hanging, the bare paper shows "OPENING YOUR STICKER BOARD…" (11 px caps) alone for 15,972 ms, then "Couldn't sign you in". Sealing's wait escalates at 10 s and 30 s (DESIGN.md Draw screen › Sealing); this wait never says it's slow, so Casey assumes the app froze · Fix: a second label at ~6 s ("Still opening… this is taking longer than usual.") as sealing does; a faint board skeleton would match DESIGN.md › Loading · Command: /impeccable harden · Evidence: a.out `slow.msToFailure` 15972, a4-api-slow-5s.png
- **[P2] Error reasons print in fine print's capitals, carrying the server's English detail and route paths** — `apps/frontend/src/i18n/errorMessage.ts:17-18`, `apps/frontend/src/styles/base.css:50-58`, `apps/frontend/src/api/SessionGate.tsx:210-213` · Copy/typography · Impact: sentences meant to be read become 11 px uppercase: "YOU'RE SIGNED OUT.", "THE APP'S SERVER RAN INTO A PROBLEM. (BOARD QUERY FAILED (SIMULATED))"; the sign-in screen's reason line shows "network: GET /api/me got no answer: Failed to fetch" to every person; in Japanese the detail stays English. DESIGN.md keeps sentences out of fine print's capitals elsewhere (Explore › This week) · Fix: the message as a 13 px sentence in Ink; the code/detail on its own small selectable line in its own case, labeled for a report ("Details for support: …") · Command: /impeccable typeset · Evidence: a.out `board500`, `down`, a2-api-down.png, a6-401-explore.png
- **[P2] "Token" in visible sign-in copy** — `apps/frontend/src/i18n/strings/errors.ts:14-17,133-141` · Copy · Impact: the sign-in screen can say "LINE didn't provide a sign-in token" / "Your LINE sign-in token has expired" (also shown by Giving and Receiving through errorReason); PRODUCT.md › Brand Commitments: the interface never says token. The Japanese (ログイン情報) is fine · Fix: "LINE didn't sign you in." / "Your LINE sign-in has expired. Reconnect with LINE to continue." · Command: /impeccable clarify · Evidence: code read
- **[P2] Picking a language reloads the app onto the board's front, away from Settings** — `apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx:75,110` · Integrity/status · Impact: tapping English on the cork back's Settings reloads (`location.reload()`), and the app opens on the board's front; the person never sees their pick take, and must flip the board and scroll to Settings again to change it back (after the pick the Settings row sat under `[inert]` and the hit test landed on `DIV.board-stage`). Inside LINE that reload is the whole boot again · Fix: reopen on the cork back scrolled to Settings after the restart (a one-shot resting-side flag), or switch in place and announce "Croquis is now in English" · Command: /impeccable harden · Evidence: e.out `afterEnglish.probeJa`, e1-after-english.png, d.out `posts` ({"languageChoice":"en"})
- **[P3] The Japanese face swaps in ~1.3 s after the board, with a small shift** — `apps/frontend/src/i18n/japaneseFont.ts:6-21`, `apps/frontend/src/i18n/pageLanguage.ts:56` · Performance · Impact: first open in Japanese (localhost dev): board at 858 ms, Zen Kaku Gothic New `loadingdone` at 2199 ms (page clock), one layout shift of 0.035 (stat board papers), 32 requests to Google Fonts. On an iPhone the fallback is Hiragino Sans, so the swap is mostly a metric change; the request starts only when JS runs, though index.html already preconnects to fonts.gstatic.com · Fix: acceptable as is; if the swap shows on phones, add the Japanese stylesheet link in index.html behind the stored language, or self-host a subset · Command: /impeccable optimize · Evidence: c.out `boot.fonts`, `boot.shifts`
- **[P3] Handle field drifts from the house field** — `apps/frontend/src/api/HandlePrompt.css:10-26` · Theming · Impact: a 4px aqua-soft halo (aqua means giving; its comment cites Explore's search, which DESIGN.md says has no halo), focus only turns the border aqua-deep instead of the house 2px Ink ring at a 3px offset, and the placeholder is the browser's rgb(117,117,117) (4.61:1 on white) rather than Graphite (5.36:1) · Fix: the Explore search's white label stock and focus ring; `::placeholder { color: var(--graphite) }` · Command: /impeccable polish · Evidence: b.out `colors`; contrast via node WCAG formula
- **[P3] The handle key sinks grey while it saves** — `apps/frontend/src/api/HandlePrompt.tsx:87` · Theming · Impact: `disabled` during the save, where DESIGN.md › The key › Busy keeps the face lit with `aria-busy` · Fix: `aria-busy`/`aria-disabled` while saving · Command: /impeccable polish · Evidence: code read
- **[P3] English-only words reach the Japanese screen** — `apps/frontend/src/line/liff.ts:125` ("LINE didn't answer within 15 s", the LINE gate's reason line), `apps/frontend/src/api/views.ts:45` ("Someone", SHELL-5) · i18n · Fix: catalog strings · Command: /impeccable clarify · Evidence: code read
- **[P3] Explorer links leave LINE** — `apps/frontend/src/identity/PrivyAccount.tsx:70-79`, `apps/frontend/src/identity/SponsorshipCheck.tsx:75` · Integrity (developer slip only) · Impact: `target="_blank"` without `openLinkInLine`, which EnsNameLink uses, so inside LINE they open outside it · Fix: `onClick={openLinkInLine}` · Command: /impeccable polish · Evidence: code read

### Positives (what to keep)

- The early session: the cookie's me, board and tickets are asked for while LIFF starts, and nothing reaches the screen until LINE's user matches (`api/earlySession.ts`). First open showed the board at ~741 ms (en) and 858 ms (ja) on the dev server.
- The gate's "Opening…" line waits 1200 ms (`line/LineGate.css:52-55`), so a fast open shows only the paper; reduced motion keeps the delay without the rise.
- Every request has a deadline (15 s, 60 s for sealing, 120 s for receiving; LIFF start 15 s), so nothing hangs forever, and failures stay on screen with the reason and Try again — never a toast.
- The handle prompt focuses its field, checks the length before sending, keeps its problem line (`role="alert"`, `aria-describedby`) until the next try, and names the handle in the key.
- The performance recorder off costs one flag check (`performance/performanceRecorder.ts:284-307`); boot milestones are a Map write.
- Language: the account's choice is applied before the app renders, `<html lang>` and the title follow ("あなたのシールボード"), and the Japanese face is requested only in Japanese. Formats follow the language: 16:52 / 2026/09/27 16:52 in ja, 4:52 PM / Sep 27, 2026, 4:52 PM in en; counts 1,234,567.

## Design review (Assessment A)

### Design specificity verdict

Mostly authored. The gates are the board's own backing paper with the faint SEAL · シール maker print and the yellow key, so even a failure looks like Croquis rather than a stock error page. The handle prompt is the weakest: a centered form with a halo field and a pink key could sit in any app, and its aqua halo borrows giving's hue. The failure screen's developer reason line ("network: GET /api/me…") breaks the "technology stays invisible" principle.

### Heuristics — score 0–4 and key issue

1. Visibility of system status — 2: 16 s of one line with no "still working"; after a language pick the person lands elsewhere with no confirmation.
2. Match between system and the real world — 3: plain words, except "token" and route paths.
3. User control and freedom — 2: a lost session has no way back but closing LINE's window; Try again loops.
4. Consistency and standards — 3: busy key sinks, halo field, sentences in fine caps.
5. Error prevention — 3: length checked before sending; taken only after.
6. Recognition rather than recall — 3: Settings shows the current pick; the reload hides it.
7. Flexibility and efficiency — 3: returning people skip everything; the handle can be submitted from the keyboard.
8. Aesthetic and minimalist design — 3: calm paper; the reason line is noise for everyone but support.
9. Recognize, diagnose, recover from errors — 2: a wrong reason on the handle prompt; "You're signed out." with no recovery; reasons in caps.
10. Help and documentation — 2: "contact the team" (errors.line_token_invalid) with no way to contact anyone.
    Total 26/40 (65%, Acceptable).

### Cognitive load — checklist failures; decision points with >4 options

Low. One failure: working memory — after a language pick, the person must remember to flip and scroll back to check it. No decision point has more than 3 options (Settings' three radios).

### Emotional journey

Peak: the open itself — the board is there in under a second, no spinner. Valleys: the first-timer's handle prompt telling them their name is taken when it isn't; the failure screen's cold route string; a session lost mid-use turning every tab into "YOU'RE SIGNED OUT." High-stakes moments without reassurance: the long first-open wait on a bad connection (no "still working"), and changing language (the app blinks and forgets where you were).

### Strengths

- Failures keep the world's materials: paper, maker print and the key, never a browser error.
- The fast path is truly fast and quiet: the delayed opening line means most opens show no loading copy at all.
- The handle prompt respects the person: autofocus, the handle echoed in the key, a problem line that stays.

### Priority issues

- [P1] What: a lost session dead-ends every screen. Why: the only fix, closing LINE's window, is never suggested; people read it as the app being broken. Fix: return to sign-in on any 401 signed_out; copy that names the recovery. Command: /impeccable harden
- [P2] What: the handle prompt's wrong reason and overflow. Why: it's the first screen a new artist with an unusual LINE name meets. Fix: reason-specific lead; a form whose width can't grow. Command: /impeccable clarify, /impeccable adapt
- [P2] What: pre-app failures are silent to VoiceOver and slow waits never escalate. Why: Sam and Casey can't tell a stall from a failure. Fix: one live region across states; a 6 s "still opening" label. Command: /impeccable harden
- [P2] What: error reasons in 11 px caps with English details and route paths. Why: hard to read, reads technical, English in Japanese. Fix: sentence in Ink, details on a separate small line for reports. Command: /impeccable typeset
- [P2] What: a language pick reloads onto the board's front. Why: no confirmation, lost place. Fix: reopen on the cork back at Settings. Command: /impeccable harden

### Persona red flags

- Casey (one-handed, interrupted): comes back after a long break to "YOU'RE SIGNED OUT." on every tab, with Try again that never works; on a slow connection watches one 11 px line for 16 s.
- Jordan (first-timer): LINE name with "@" → told someone already has it; typing a long handle pushes the key off a 375 px screen.
- Sam (VoiceOver, keyboard, zoom): the sign-in failure isn't announced; the handle field's focus is a color change only; at 200% zoom the fixed, non-scrolling gate would clip the same way (unverified).
- Friend-first artist: changes language to share with a friend, lands on the front, unsure it worked.
- Gamer artist chasing clout: n/a for these screens beyond speed, which is good.
- Artist suspicious of crypto: "sign-in token" on the sign-in screen and "network: GET /api/me…" read as technical plumbing; Privy, Sui and World ID stay out of sight on these screens (Privy's rows are developer-slip only), which is right.

### Minor observations

- The sign-in failure's heading is "Couldn't sign you in" even when the cause is the server being down; the lead says so, but the heading blames sign-in.
- `api.handle.placeholder` "handle" repeats the @ prefix's job; ユーザー名 in Japanese reads well.
- The performance report and developer slip strings stay English by design (catalog `developer` keys).
- Intl's JPY in Japanese renders "￥1,200" (full-width, c.out `formats`); any caller formatting yen with Intl in Japanese gets the glyph DESIGN.md forbids — the tickets lane should confirm prices use U+00A5.

### Questions to consider

- Should a lost session ever show an error at all, or silently sign in again with LINE's token and retry the request?
- Does a language change need a reload, or only the text built outside React?
- Should the handle prompt suggest a handle (the LINE name without "@", or with a number) instead of an empty field?
