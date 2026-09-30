# Frontend audit and critique

2026-09-30. `/impeccable audit` (accessibility, performance, theming, responsive, implementation integrity) and `/impeccable critique` (Nielsen heuristics, cognitive load, emotional journey, personas) of all of `apps/frontend`, at main `9f541d12`. Nothing here is fixed yet.

**In progress.** Six of eleven lanes are in: the shell and design system, copy and i18n, Explore, Gratitude, the stat board and sticker detail, and tickets and the Shop. The sticker board, sticker tray, drawing screen, Giving and Receiving, and sign-in and identity lanes, and the detector pass, are still running; their findings and the frontend's overall scores land here when they finish.

- Each lane took a slice of `apps/frontend/src`, read every file in it, and checked the running app: a local dev server under LIFF Mock with its own database, Chromium at 390×741, 375×591 (iPhone SE inside LINE) and 430×829, in English and Japanese, with failures simulated by holding or failing API calls. Each did both lenses for its slice. The detector (`impeccable detect`) ran as its own pass, kept apart from the design review.
- Every finding's impact, standard and evidence: the lane reports in [2026-09-30-frontend-audit/](2026-09-30-frontend-audit/). Screenshots and scripts are on ad0ll's Mac only, in `/tmp/impeccable-audit/`, which macOS clears after a few days.
- The code review of the same commit, [2026-09-29-frontend-code-review.md](../superpowers/plans/2026-09-29-frontend-code-review.md), found defects line by line. A finding here that is the same defect, or shares its root cause, names its ID (→ CLEAN-1) rather than repeating it.
- Paths are under `apps/frontend/src/` unless they start with `apps/`, `index.html`, `public/` or `DESIGN.md`.
- Severity: **P0** blocks the task · **P1** significant difficulty, or a WCAG AA failure · **P2** an annoyance with a way around it · **P3** polish.

## Scores so far

Audit, 0–4 per dimension:

| Lane                          | A11y | Performance | Theming | Responsive | Integrity | Total |
| ----------------------------- | ---- | ----------- | ------- | ---------- | --------- | ----- |
| Shell and design system       | 2    | 3           | 3       | 3          | 3         | 14/20 |
| Copy and i18n                 | 3    | n/a         | 3       | 3          | 3         | 12/16 |
| Explore                       | 2    | 3           | 3       | 3          | 3         | 14/20 |
| Gratitude                     | 3    | 3           | 3       | 3          | 2         | 14/20 |
| Stat board and sticker detail | 2    | 3           | 3       | 2          | 3         | 13/20 |
| Tickets and Shop              | 3    | 3           | 3       | 3          | 2         | 14/20 |

Critique, Nielsen's heuristics, 0–4:

| #   | Heuristic                       | Shell  | Copy   | Explore | Gratitude | Stat board | Tickets |
| --- | ------------------------------- | ------ | ------ | ------- | --------- | ---------- | ------- |
| 1   | Visibility of system status     | 3      | 3      | 3       | 2         | 3          | 3       |
| 2   | Match with the real world       | 4      | 3      | 3       | 3         | 3          | 3       |
| 3   | User control and freedom        | 3      | 3      | 4       | 2         | 3          | 3       |
| 4   | Consistency and standards       | 3      | 2      | 3       | 3         | 2          | 3       |
| 5   | Error prevention                | 3      | 3      | 3       | 3         | 3          | 3       |
| 6   | Recognition rather than recall  | 4      | 3      | 3       | 3         | 3          | 3       |
| 7   | Flexibility and efficiency      | 2      | 3      | 3       | 4         | 3          | 3       |
| 8   | Aesthetic and minimalist design | 4      | 3      | 4       | 3         | 3          | 3       |
| 9   | Error recovery                  | 3      | 2      | 3       | 1         | 2          | 2       |
| 10  | Help and documentation          | 3      | 2      | 2       | 3         | 2          | 2       |
|     | **Total /40**                   | **32** | **27** | **31**  | **27**    | **27**     | **28**  |

Every lane found the design authored for Croquis, not interchangeable: the keycap and its press, label stock, perforations, the pile, the cork back, the ticket stubs, the tier ladder. Where it slips, it slips the same way everywhere: failures fall back to engineer text in fine print.

## Fix first (P1)

1. **UX-GRAT-1** A failed Gratitude send reads as "Gratitude sent", and Send gratitude comes back, inviting a duplicate combo for a once-per-gift act.
2. **UX-COPY-1** "Confirm in your wallet if asked…" shows on every gift while it waits, in both languages.
3. **UX-TIX-1** A failed payment prints raw English exception text ("Sui rejected the payment … MoveAbort(…"), "wallet" and "Privy", and an ID that overflows the card.
4. **UX-TIX-2** A payment is kept on the phone only after its confirmation wait returns; a slow one says "Payment didn't go through" (→ TIX-1, TIX-4).
5. **UX-SHELL-3** The Accept sheet's "You agree to the Terms and Privacy Policy" links to joke pages; the privacy page autoplays looping audio with no controls.
6. **UX-SHELL-1** Pinch zoom is off app-wide.
7. **UX-SHELL-2** The shared Sheet isn't modal: no `aria-modal`, Escape, Back or focus trap.
8. **UX-STAT-2** The Transfer Trail drops keyboard focus, and with it the sticker detail's Escape and paging (→ CLEAN-1).
9. **UX-STAT-1** In Japanese, the Transfer Trail's open card runs off a 375px screen and cuts Replay in half.
10. **UX-EXPL-1** Leaderboard and search rows speak only "@x's sticker board": no rank, no figure.
11. **UX-TIX-3** Every ticket purchase row is named by its transaction ID.
12. **UX-SHELL-4** Every NSFW mark is white on pink at 3.07:1, three of them under 11px.
13. **UX-EXPL-2** Your own leaderboard row's "You" and unit read 3.45:1.

## Patterns

Most findings are instances of a few causes; fixing the cause once closes them and keeps the next screen from repeating them.

1. **Failures fall back to engineer text in fine print.** Raw exception and SDK messages reach cards and Japanese sentences (UX-TIX-1, UX-COPY-10); the sticker detail and Explore print reasons as 11px uppercase Graphite that garbles case-sensitive detail (UX-STAT-3, UX-EXPL-7); copy failures vanish as 2.4 s toasts (UX-SHELL-6); a kept Gratitude combo reads as sent (UX-GRAT-1); kept payments and failed ticket loads are console-only (UX-TIX-7, UX-TIX-10); many catalog errors name no next step and no one to ask (UX-COPY-7, UX-COPY-9). Settings and Age verification already have the right treatment: 13px Ink on Tomato Soft with `role="alert"`. One error line component, a catalog string per known failure, raw detail only as copyable fine print, and one named place to get help would close most of these. `/impeccable harden`, `/impeccable clarify`.
2. **Crypto words leak through the plumbing.** "wallet" in Giving's wait (UX-COPY-1), "token" in sign-in errors (UX-COPY-2), "Privy", "MoveAbort" and "Sui rejected the payment" in payment failures (UX-TIX-1), "on the chain" and "transfer" in errors (UX-COPY-9), and ONE OF ONE on the Gift Message. Each alone is small; on the give and pay paths together they read as the racket PRODUCT.md warns about.
3. **`aria-label` replaces what the screen shows.** Leaderboard rows (UX-EXPL-1), purchase rows (UX-TIX-3), the explorer link (UX-STAT-10); the Zipper is "Your stickers" and the tray's tabs "Show". Name controls from their visible text and add hidden units, so screen reader and Voice Control users get what sighted users see (WCAG 2.5.3).
4. **Focus is lost when the focused control goes away.** The Transfer Trail (UX-STAT-2), clearing the search (UX-EXPL-3), Pay turning `disabled` (UX-TIX-4), Age verification turning `disabled` (UX-STAT-8). The trap listens only on its root (→ CLEAN-1), and two keys break DESIGN.md's Busy rule (`aria-busy` and `aria-disabled`, never `disabled`).
5. **Shared primitives don't own their accessibility.** `ui/Sheet` has no modality (UX-SHELL-2; → UI-2, UI-5, UI-7), and there are two tab-stop rules (UX-SHELL-11; → CLEAN-9). Each caller has to remember what the primitive should guarantee.
6. **Japanese layouts break on long handles.** 32-character handles next to kana can't break under `word-break: auto-phrase` (UX-STAT-1); 「受け取った」 overflows its stamp (UX-COPY-6); the checkout's title is pushed off (UX-COPY-12). Test every screen that prints a handle with a 32-character one, in Japanese, at 375 wide.
7. **The scales exist but aren't used.** About 38 font sizes sit between DESIGN.md's steps (12, 12.5, 13.5, 14, 14.5, 16px), heaviest in the Transfer Trail, the sticker detail, the board and the stat board; a z-index scale that 16 declarations use and about 100 literals (800 to 100000) ignore; cork, the scrim and the metal foils have no tokens; 23 hex literals duplicate a token (mostly `#fff`). Decide the type ladder once in DESIGN.md, then snap to it. `/impeccable typeset`, `/impeccable document`.
8. **DESIGN.md has drifted from the app** (still so on main at `ba836c54`). Its front matter names the app "Sticker Board (シール帳)" with "every five-minute drawing" (`DESIGN.md:2-3`, `:255`); Explore's day and week turn over "at 4:00" (`:588-589`; the app turns at midnight Tokyo); a condensation fog after 昇天 doesn't exist (`:693`); the Busy rule is broken by two keys (pattern 4); Explore's loading line says "Loading…", not "Loading Explore". `/impeccable document`.

## Findings by area

### Shell and design system

- **UX-SHELL-1** · P1 · `index.html:8` · Pinch zoom is off app-wide (`maximum-scale=1.0, user-scalable=no`), so inside LINE nobody can enlarge 11px fine print. The lock doesn't protect strokes: the canvas, keys, board, tray, gift bag and Mini-game already refuse gestures (22 `touch-action: none`), and `body` is fixed. WCAG 1.4.4 · Fix: drop the lock; `touch-action: manipulation` on `html` and `none` on `.drawing-screen`; check on an iPhone in LINE · `/impeccable adapt`
- **UX-SHELL-2** · P1 · `ui/Sheet.tsx:50-83` · The shared Sheet is `role="dialog"` with no `aria-modal`, Escape, Back or focus trap, and its perforation closes on pointerup or Enter/Space only, not a click. On the motion card, measured: Escape and a click leave it up, and Tab walks onto the board behind. The motion card and the color sheet use it bare · WCAG 2.1.1, 2.4.3, 4.1.2 · Fix: build `aria-modal`, `useFocusTrap(ref, { onEscape })` and `useBackToClose` into Sheet · → UI-2, UI-5, UI-7 · `/impeccable harden`
- **UX-SHELL-3** · P1 · `public/privacy.html:58-88`, `public/ja/privacy.html:57-87`, `public/terms.html`, `public/ja/terms.html`, linked from `receiving/ReceiveGiftDialog.tsx:407-416` · "You agree to the Terms and Privacy Policy" leads to Stallman copypasta, an English stand-in under `lang="ja"` with an editor's note left in the markup, and a Rick Roll / "Nice boat." video that autoplays looping with no controls, unmutes on the next tap anywhere, and preloads 1.9 MB / 2.8 MB. It lands on a first-timer's first gift · WCAG 1.4.2, 2.2.2 · Fix: until real pages exist, drop the agreement clause (keep the LINE-name disclosure) or link an honest "being written" page; any video gets `controls`, `preload="metadata"` and no unmute on an unrelated tap · `/impeccable clarify`
- **UX-SHELL-4** · P1 · `giving/give-sheet.css:83-85`, `stickers/sticker-figure.css:133-136`, `sticker-creation/sealing/SealedCard.css:46-48`, `sticker-creation/NsfwToggle.css:44-48`, `receiving/gifts-for-you-badge.css:49-52` · Every NSFW mark is white on Bonbon Pink (3.07:1), and three are 10px or clamp to 9px, the app's only text under 11px · WCAG 1.4.3; DESIGN.md's Ink-On-Color and 11px Floor rules · Fix: one shared 18+ mark, Ink on pink, at 11px or more · `/impeccable colorize`
- **UX-SHELL-5** · P2 · `styles/keys.css:249-251` · Ink labels get a Seal Yellow focus ring, which reads 1.23–1.65:1 against the paper around it (Age verification's and the address dialog's ink labels) · WCAG 2.4.7, 1.4.11 · Fix: delete the override; the house Ink ring reads 16.3:1 · `/impeccable polish`
- **UX-SHELL-6** · P2 · `ui/ToastProvider.tsx:5`; `sticker-board/stat-board/AddressDialog.tsx:302`, `identity/AccountRow.tsx:26`, `sticker-creation/DrawingScreen.tsx:280` · Failures shown only as a toast gone in 2.4 s: an address not copied, a sheet empty at 0:00 · AGENTS.md: errors persist · Fix: an inline line under the control until the next try; toasts for confirmations only · `/impeccable harden`
- **UX-SHELL-7** · P2 · `app/TabBar.tsx:9,62-65,101-110` · On the drawing screen the tabs tuck again 4 s after the last pointer, focus or key event inside them, keyboard activation included (measured); VoiceOver moves without those events (unverified on a device) · WCAG 2.2.1 · Fix: no idle tuck while focus is in the strip or after a keyboard or assistive activation · `/impeccable harden`
- **UX-SHELL-8** · P2 · `app/TabBar.css:128-147`, `app/App.css:47-53` · The grabber's touch band starts 20px from the screen's edge and ignores `env(safe-area-inset-bottom)`, so on Face ID iPhones it sits inside the home indicator's area, where dragging up competes with iOS's home swipe (unverified on a device; DESIGN.md says 20px above the home indicator) · Fix: offset by the safe area · `/impeccable adapt`
- **UX-SHELL-9** · P2 · `i18n/strings/app.ts:40-43` · The first thing an iPhone user reads after sign-in is "Croquis uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?": no payoff named, before they've seen the heart; a decline loses shake for good · Fix: name the benefit ("Shake your phone to send Gratitude? iPhone asks first."), or ask when shaking first matters · `/impeccable onboard`
- **UX-SHELL-10** · P3 · `app/MotionPermissionCard.tsx:29` · Allow asks even after a slide-off · → SHELL-6
- **UX-SHELL-11** · P3 · `ui/useFocusTrap.ts:3-4,32-33` and `app/useFocusLoop.ts:3-16` · Two tab-stop rules · → CLEAN-9
- **UX-SHELL-12** · P3 · `controls/useToast.tsx` · Dead duplicate toast · → CLEAN-11
- **UX-SHELL-13** · P3 · `sticker-board/StickerBoard.css:85` · `will-change: transform` stays on every board sticker at rest, one layer each while the board is up · Fix: set it only while a sticker moves · `/impeccable optimize`
- **UX-SHELL-14** · P3 · `app/App.css:14-33` · The desktop phone frame uses literals rather than `--shadow-device`, `--ph-radius` and `--ph-bezel`; the toast sits at a fixed 100px whatever the tab strip's real height (`ui/toast.css:6`) · `/impeccable polish`

### Copy and i18n

The catalog itself is in excellent shape: 804 strings, none missing Japanese, no `{{variable}}` or `<tag>` mismatch, one inline string in all of `src` (`alt="Sui"`).

- **UX-COPY-1** · P1 · `i18n/strings/giving.ts:129-132`, shown by `giving/Giving.tsx:233-234` · "Confirm in your wallet if asked…" / 「ウォレットで確認を求められたら…」 on every gift while the deposit confirms: PRODUCT.md's interface never says wallet, at the product's central moment. Whether Privy ever asks is unverified (`identity/PrivySession.tsx:87` sets no `showWalletUIs`) · Fix: "Getting your gift ready. LINE's friend picker opens next; nothing is sent until you pick a chat.", and turn Privy's modal off if it can appear · `/impeccable clarify`
- **UX-COPY-2** · P2 · `i18n/strings/errors.ts:14-17,138-141` · "token" in LINE sign-in errors ("Your LINE sign-in token has expired"), reachable by anyone who keeps the app open past the ID token's hour; the Japanese already says ログイン情報 · `/impeccable clarify`
- **UX-COPY-3** · P2 · `i18n/strings/explore.ts:110`, `stickerBoard.ts:44`, `apps/api/src/explore/leaderboards.ts:27,117-124` · "Longest streak" names two figures: Explore's board ranks current streaks, the stat board's is the best ever. Explore's sits under "This week" and "Resets Monday" but never resets, and ties take ranks 1–6 in handle order · Fix: call the Explore tab "Streak" (ja 連続日数 is already right); give ties one rank · `/impeccable clarify`
- **UX-COPY-4** · P2 · `giving.backToBoard`, `tickets.backToStickerBoard`, `gratitude.receipt.backToBoard`, `receiving.goToStickerBoard`, `stickerCreation.sealedCard.goToStickerBoard`, `explore.lifted.goToYourBoard`, `stickerBoard.detail.back` · One destination, the My board tab, is worded seven ways ("my"/"your", "board"/"sticker board") · Fix: "Back to My board" / 「マイボードに戻る」 everywhere · `/impeccable clarify`
- **UX-COPY-5** · P2 · `i18n/strings/giving.ts:42,45,72,249-255,269,276` · Japanese drops さん after other people's names only in Giving (「{{name}}があなたのシールを受け取りました」), while 50 names elsewhere carry it; `explore.pile.stickerGiven` mixes both in one sentence · `/impeccable clarify`
- **UX-COPY-6** · P2 · `i18n/strings/stickerBoard.ts:81` · 「受け取った」 overflows the RECEIVED stamp on every Japanese stat board at 375px · Fix: 「もらった」, beside つくった and 贈った, or let the stamp word shrink to fit · `/impeccable adapt`
- **UX-COPY-7** · P2 · `i18n/strings/tickets.ts:202-209`, `tickets/ReserveTicketCheckout.tsx:331-352` · A payment refused for good offers only "Back to the packs" and a payment ID with no one to give it to; nowhere in the app names a contact · Fix: name who helps and how (the Official account's chat), and what the ID is for · `/impeccable harden`
- **UX-COPY-8** · P2 · `i18n/strings/tickets.ts:156-167`, `tickets/ReserveTicketCheckout.tsx:506-522`, `payments/jpyc.ts:44-48` · "Pick a smaller one, or add JPYC to your Sui account." says neither how nor where the address is (it's on the stat board), and a JPYC-only account can still fail on the network fee, which is paid in SUI and not sponsored · Fix: a "Show my Sui address" label in place, a short how-to, and a decision on the fee (sponsor it, or a plain "network fee" line) · `/impeccable onboard`
- **UX-COPY-9** · P3 · `i18n/strings/errors.ts:7,64-72,74,86,127-136,199-200,207,236,258`, `giving.ts:10-19` · Errors that don't say what happened or what to do: "You're signed out." beside a Try again that can't help, "This gift is closed.", "Something went wrong ({{code}})", the "isn't here" family, "contact the team" (no contact exists), "The gift bag isn't on the chain yet.", "The Sticker transfer could not be confirmed…" · `/impeccable clarify`
- **UX-COPY-10** · P3 · `giving/giveFlow.ts:66-73` · Anything that isn't an ApiError falls back to `error.message`, so LINE's picker failing prints English SDK text inside a Japanese sentence; the same pattern is deliberate in `tickets.checkout.balanceProblem`, `walletBroken`, `walletSignInFailed` and `stickerBoard.timelapse.notPlayed` · `/impeccable harden`
- **UX-COPY-11** · P3 · `i18n/strings/giving.ts:142,149,176,195,214` · English "seal" means both the sticker's seal and the gift bag's closure ("It's still in the bag, unsealed", tape "SEALED 9.23"); the Japanese already separates them (仕上げる, 封) · Fix: the bag closes ("Closed and sent", "CLOSED 9.23") · `/impeccable clarify`
- **UX-COPY-12** · P3 · `i18n/strings/tickets.ts:120` · At 375×591 in Japanese the checkout's title 「パックを選んでください」 is pushed off the top when the balance row wraps · `/impeccable adapt`
- **UX-COPY-13** · P3 · `i18n/strings/explore.ts:97` · "Resets Monday 12:00 AM" is Tokyo time with no zone, while the ticket refill line converts to the person's clock · Fix: format `leaderboards.weekStart`, already in the payload, with the same formatter · `/impeccable clarify`
- **UX-COPY-14** · P3 · Japanese breaks inside phrases (the Shop lead 「無償チケットを使い｜切っても…」, `i18n/strings/shop.ts:11-14`) and headlines set without `palt` look airy (ショップ, 有償チケット) · Fix: `<wbr>` at phrase breaks on short centered lines; `palt` on Japanese headlines · `/impeccable typeset`
- **UX-COPY-15** · P3 · Slips: Best combo is 最大コンボ in Explore and 最高コンボ on the stat board; "Gratitude" capitalized mid-sentence in three strings; 46 straight and 91 curly apostrophes, mixed within one sentence; もどす and 開く where the rest say 戻す and ひらく; "ticket shop" in `errors.payment_not_found` (チケットショップ reads as a ticket reseller); the give sheet's fine print sets the handle in capitals ("@COPY-EN") while the catalog says handles keep their case · `/impeccable polish`
- **UX-COPY-16** · P3 · The 12 Shop swatch names share one where-comment (→ CLEAN-15); `i18n/glossary.md:18` calls Draw a tab; the glossary has no combo, streak, Best combo, Timelapse, Offer or board address, which is how 最大/最高コンボ drifted · `/impeccable document`

### Explore

- **UX-EXPL-1** · P1 · `explore/ExploreScreen.tsx:78-85,125-129` · Each leaderboard and search row's `aria-label` replaces its content, so VoiceOver hears "@Copy-en's sticker board" six times with no rank and no figure; your own row is "Your sticker board" while it shows "@name You" (accessibility tree read) · WCAG 1.3.1, 2.5.3 · Fix: the row's text as its name, a hidden unit on each figure, where it goes as a description · `/impeccable harden`
- **UX-EXPL-2** · P1 · `explore/ExploreScreen.css:254-256,301-307,329-335` · On your own row, "You" and the streak's unit are Graphite on Pink Soft, measured 3.45:1 · WCAG 1.4.3 · Fix: Ink on `li.me`, as its rank already is · `/impeccable polish`
- **UX-EXPL-3** · P2 · `explore/ExploreScreen.tsx:622-631` · Clearing the search unmounts the clear button and drops focus to `<body>` (measured) · WCAG 2.4.3 · Fix: focus the field · `/impeccable harden`
- **UX-EXPL-4** · P2 · `explore/ExploreScreen.tsx:469-479,484-496` · Search results and "No one here is @x yet" are never announced; "Searching…" is a status mounted with its text · WCAG 4.1.3 · Fix: one persistent polite region, as the pile's arrivals line has · `/impeccable harden`
- **UX-EXPL-5** · P3 · `explore/StickerPile.tsx:252-259,400-403,427-429` · The fall-in never reaches its done state, so up to 14 hidden, blurred, eager `<img>` layers stay mounted for the life of the pile (measured after the fall settled) · `/impeccable optimize`
- **UX-EXPL-6** · P3 · `explore/LiftedSticker.tsx:149` · The lifted sheet dates a sticker in the phone's time zone while the pile files it under its Tokyo day · → EXPL-3
- **UX-EXPL-7** · P3 · `explore/ExploreScreen.tsx:457` · Why Explore failed is one 11px uppercase line ("SOMETHING WENT WRONG (INTERNAL).") · Fix: a 13px supporting note (pattern 1) · `/impeccable typeset`
- **UX-EXPL-8** · P3 · Empty leaderboards are a dead end: "No one is on it yet this week." with nothing on how to get on Best combo or Most gratitude · `/impeccable onboard`
- **UX-EXPL-9** · P3 · `explore/ExploreScreen.css:71-88,223,272-276,337-350`; `explore/ExploreScreen.tsx:541`, `StickerPile.tsx:431-440`, `sticker-pile.css:177-180` · Dead code from a removed "your rank" row and an unused `liftedId` path · `/impeccable distill`
- **UX-EXPL-10** · P3 · `explore/lifted-sticker.css:113`, `explore/sticker-pile.css:32,70` · A hand-picked graphite and a 22% Ink between the rule tokens · `/impeccable polish`

### Gratitude

- **UX-GRAT-1** · P1 · `gratitude/GratitudeMiniGame.tsx:151-157` · When `POST /api/gratitude` fails, the outbox keeps the combo but the screen ignores that: the receipt says "Gratitude sent", the live region "Sent 3,063 gratitude to @x.", and the only trace is a `console.warn`. The outbox retries only at the next app start, and the sticker detail offers Send gratitude again meanwhile · AGENTS.md: an error only the calling client can see is a silent error · Fix: a kept state on the receipt and in the live region ("Saved on this phone. It goes to @x when you're back online."); retry on `online` and `visibilitychange`; the detail treats a combo waiting in the outbox as sent · related GRAT-1, GRAT-3 · `/impeccable harden`
- **UX-GRAT-2** · P2 · `gratitude/GratitudeMiniGame.tsx:217-220,272-280`, `miniGameEngine.ts:1107-1114,1304` · After the first tap, the X named "Close" ends and records the combo and shuts the screen with no receipt, so a test tap followed by "start over" sends a tiny, final combo · Fix: show the receipt of what was sent, or name it "Send and close" · `/impeccable clarify`
- **UX-GRAT-3** · P2 · `gratitude/GratitudeMiniGame.tsx:155`, `i18n/strings/gratitude.ts:77-80` · A refusal (already recorded, not the receiver…) says "Close this and send it again", which can't succeed, throws the reason away, and sits under a receipt titled "Gratitude sent" · Fix: the reason per code; a retry only where one can succeed; retitle the receipt · `/impeccable clarify`
- **UX-GRAT-4** · P2 · `gratitude/tierSlamAndPopIns.ts:477-502` · At the top tiers pop-in words reuse taken slots and are kept off the heart only, so they stack on each other and on the tier slam (screenshots: だめ… over バクバク, アツい… into 昇天); the comedy turns to mush when the screen is loudest · Fix: skip or retire a word when no slot is free; place against live words' boxes and the band a slam will take · `/impeccable polish`
- **UX-GRAT-5** · P2 · `gratitude/popInWords.ts:35-73`, `miniGameEngine.ts:640-644`, `heartFaces.ts:17-56` · While stroking, the top tiers answer with そこ… "right there…", ハァハァ "pant pant" and もっと… "more…", beside the nosebleed face. Each is deniable alone; together they read as a sex joke, at PRODUCT.md's "never explicit" line and LINE's MINI App Policy · Fix: a product call: retire or re-gloss those words, and give stroking its own bank at every tier · `/impeccable clarify`
- **UX-GRAT-6** · P2 · The Mini-game never shows hits while playing, though Best combo ranks by them, and the receipt prints them as fine print, against DESIGN.md's Hits Rule · Fix: the hit counter in the HUD from the second hit and on the receipt · `/impeccable bolder`
- **UX-GRAT-7** · P3 · `gratitude/tierBackground.ts:36-37,182-185`, `gratitude-mini-game.css:206-214` · The focus lines swap drawings at 8 Hz; measured under WCAG 2.3.1's area threshold (7.7% of the area below the header changes), but still a flickering stripe pattern · Fix: 3 Hz or less, or a crossfade · `/impeccable animate`
- **UX-GRAT-8** · P3 · `gratitude/replay/mountGratitudeReplay.ts:73-77`, `combo.ts:114`, `gameConfig.ts:44-45` · Replays run under today's rules though the design doc promises each record replays with its own version, and the config has changed once already · `/impeccable harden`
- **UX-GRAT-9** · P3 · `styles/tokens.css:17`, `index.html:19`, `gratitude-mini-game.css:538-546` · The multiplier and the giver's initial show in thin Mona Sans until Dela Gothic One arrives · Fix: load Dela before the game opens, as the lettering's Japanese glyphs are · `/impeccable typeset`
- **UX-GRAT-10** · P3 · `gratitude/GratitudeMiniGame.tsx:339` · After a frame-loop failure, "send your gratitude again" points at a Send gratitude that's gone · `/impeccable clarify`
- **UX-GRAT-11** · P3 · `gratitude/gratitude-mini-game.css:463-465`, `GratitudeMiniGame.tsx:46-47,158` · Dead `.gr-tick.is-capped` and `onEnd` prop · `/impeccable distill`

### Stat board and sticker detail

- **UX-STAT-1** · P1 · `sticker-board/transfer-trail.css:6-11`, `styles/base.css:93-95` · In Japanese, phrases like 「作者の@Mika_draws_every_day_in_tokyo_32さんに」 can't break under `word-break: auto-phrase`; the trail's grid track grows to them and the open card runs off a 375px screen, Replay cut at the edge (measured scrollWidth 372 vs 313) · WCAG 1.4.10 · Fix: `grid-template-columns: minmax(0, 1fr)`; `overflow-wrap: anywhere` on handles · `/impeccable adapt`
- **UX-STAT-2** · P1 · `sticker-board/TransferTrail.tsx:109-129,137-138,234-246` · Enter on a closed row or on "N earlier gifts" removes the focused button: focus falls to `<body>`, then Escape doesn't close the sticker detail and the arrows don't page (verified); rows say `aria-expanded="false"` and never true · WCAG 2.4.3, 2.1.1, 4.1.2 · Fix: one head button per row in both states, with `aria-expanded`; focus the first revealed row · → CLEAN-1 · `/impeccable harden`
- **UX-STAT-3** · P2 · `sticker-board/StickerDetail.tsx:409-424`, `timelapse/TimelapseButton.tsx:92-96`, `TransferTrail.tsx:196-226` · The detail's failures are 11px uppercase Graphite sentences that garble their own detail ("/^0X[0-9A-F]{64}$/"); when the detail's check fails, Send gratitude silently becomes Give and Timelapse disappears, with only that line to say why · Fix: the Settings treatment (13px Ink on Tomato Soft, sentence case, Try again), and a line where the key would be · `/impeccable clarify`
- **UX-STAT-4** · P2 · `sticker-board/stat-board/settings-note.css:5-11`, `SettingsNote.tsx:35-68` · At 375×591 the peeking Settings card covers Flip back and the croquis.eth tape (hit-tested) · Fix: keep the peek below the stats, or don't peek when they fill the screen · `/impeccable layout`
- **UX-STAT-5** · P2 · `sticker-board/StickerDetail.tsx:319-325`, `sticker-detail.css:251-253` · The artist chip sits inside no-wrap fine print, so a 32-character handle shows as "@Mika_draws_e…" on the screen meant to name who drew it · Fix: the chip on its own line, wrapping · `/impeccable adapt`
- **UX-STAT-6** · P2 · `sticker-board/stat-board/settings-note.css:61-70` · Unchecked language radios are a 26% Ink ring, 1.75:1 · WCAG 1.4.11 · Fix: a Graphite ring · `/impeccable polish`
- **UX-STAT-7** · P2 · `sticker-board/stat-board/StatCork.tsx:61-71,189-199`, `StatBoard.tsx:55-61` · While User Stats load, every figure is "–" spoken "not known", the same as a failure · Fix: DESIGN.md's loading outlines and one status line · `/impeccable harden`
- **UX-STAT-8** · P2 · `sticker-board/stat-board/AgeVerificationNote.tsx:108-119` · "Opening World ID…" sets `disabled`: the label sinks grey and focus drops to `<body>` · WCAG 2.4.3; DESIGN.md's Busy rule · `/impeccable harden`
- **UX-STAT-9** · P3 · The stat board never says what Direct and Residual are, what "Board address · Ethereum Sepolia" or "Sui Testnet" is for, or what Age verification unlocks (seeing and receiving NSFW stickers) and what an Orb is; a first-timer's all-zero cork points to no act that fills it; tapping a language reloads the app with no word that it will · `/impeccable clarify`
- **UX-STAT-10** · P3 · `sticker-board/stat-board/AddressDialog.tsx:375-385` · "View on Etherscan" is named "View your board address on Etherscan" · WCAG 2.5.3 · `/impeccable polish`
- **UX-STAT-11** · P3 · `sticker-board/stat-board/stat-board.css:363-423` · Stamp counts of 1,000 or more clip ("1,204" shows "1,20") · Fix: step the figure down past three digits · `/impeccable adapt`
- **UX-STAT-12** · P3 · `sticker-board/stat-board/board-flip.css:45`, `stat-board.css:17` · Cork is hard-coded twice; DESIGN.md names it but `tokens.css` has no `--cork` · `/impeccable polish`
- **UX-STAT-13** · P3 · `sticker-board/stat-board/usePullToReveal.ts:72-76,94-97` · The developer slip's pull animates `height` and reads layout on every move; with `VITE_DEV_SLIP=on` in `deploy/deploy.sh`, it and an English "Developer tools" button are in every live stat board's tab order · `/impeccable optimize`

### Tickets and the Shop

Yen is half-width everywhere in both languages (measured), and one `ticketView` helper keeps every ticket picture consistent.

- **UX-TIX-1** · P1 · `payments/jpyc.ts:76,80-82`, `tickets/ReserveTicketCheckout.tsx:50-55,182-198,397-399`, `tickets/tickets.css:83-89`, `identity/suiSigner.ts:32`, `identity/privy.ts:100` · "Payment didn't go through" prints the code's own English exception text, untranslated in Japanese: "Sui rejected the payment <ID>: MoveAbort(MoveLocation { …", with "wallet" and "Privy" in visible copy, and the 44-character ID overflows the card (scrollWidth 465 vs 362 at 390) · WCAG 1.4.10; AGENTS.md i18n; PRODUCT.md · Fix: one catalog line per known failure (timed out, rejected, not ready, no fee funds, offline); the raw detail as fine print with Copy and `overflow-wrap: anywhere` · related SHELL-2 · `/impeccable harden`
- **UX-TIX-2** · P1 · `payments/jpyc.ts:73-87`, `tickets/ReserveTicketCheckout.tsx:182-196` · The payment is kept on the phone only after the confirmation wait returns, so a closed app or a slow confirmation loses its ID and the card says "Payment didn't go through", against DESIGN.md's "closing it never loses the payment" · → TIX-1, TIX-4 for the defect; for the screen: after a send, a slow confirmation opens "Tickets not added yet", not the failure card · `/impeccable harden`
- **UX-TIX-3** · P1 · `tickets/TicketPurchases.tsx:133` · Every purchase row is named "Open the payment 5CrSDF… on Suiscan", never its pack, date or price · WCAG 2.5.3, 2.4.4 · Fix: "3 tickets, ¥270, Sep 29, opens Suiscan", or no `aria-label` · `/impeccable harden`
- **UX-TIX-4** · P2 · `tickets/ReserveTicketCheckout.tsx:250-253,528-535` · While paying, Pay is `disabled` and sinks grey like "can't pay", focus jumps to "Ticket purchases by …", and the wait can run about two minutes with no words · WCAG 4.1.3, 2.4.3; DESIGN.md's Busy rule, which this card's own "Adding…" key follows · Fix: `aria-busy` and `aria-disabled`, focus kept, a status line that says leaving is safe · `/impeccable harden`
- **UX-TIX-5** · P2 · `tickets/ReserveTicketCheckout.tsx:385-388`, `tickets/tickets.css:131-133` · "Back to the packs" and "Not now" sit on one line with no gap, their touch bands overlapping by about 8px (measured) · Fix: stack them, as DESIGN.md puts them · `/impeccable layout`
- **UX-TIX-6** · P2 · `tickets/ReserveTicketCheckout.tsx:546`, `ReserveTicketCheckout.css:6-9` · At 375×591 the checkout scrolls inside itself (627px of card in 563), its only exit "Not now" below the fold, the scrim doesn't close it and Back isn't hooked · Fix: Pay and Not now in a footer outside the scroll; the scrim closes it while not paying · `/impeccable adapt`
- **UX-TIX-7** · P2 · `tickets/unaddedPurchases.ts:243-266`, `shop/ShopScreen.tsx:31` · A kept payment the server refuses or can't reach shows only in the console until the checkout is opened · Fix: a "Tickets not added yet" strip on the Shop and a pip on its tab · `/impeccable harden`
- **UX-TIX-8** · P2 · `tickets/StartDrawing.tsx:90-94,119-123`, `tickets/tickets.css:111-117` · After a failed spend the card keeps asking "Use a ticket to draw?" with the reason as a 13px Graphite footnote, which in Japanese ends in the server's English detail · Fix: "Couldn't start your sticker", the reason in Ink, Start drawing as the retry · `/impeccable clarify`
- **UX-TIX-9** · P3 · `tickets/ReserveTicketCheckout.tsx:250-253,466-478` · The checkout opens with focus on "Not now", and the pack picker is four toggle buttons rather than a radio group · WCAG 2.4.3, 4.1.2 · related CLEAN-4, CLEAN-6 · `/impeccable harden`
- **UX-TIX-10** · P3 · `shop/ReserveTicketsHero.tsx:32,37`, `tickets/TicketsProvider.tsx:29-33` · When tickets fail to load, the Shop reads as if you hold none, with no message; the board's Draw key likewise · `/impeccable harden`
- **UX-TIX-11** · P3 · The purchases button shows a receipt icon, your ENS name and a caret; "Ticket purchases" is screen-reader-only · `/impeccable clarify`
- **UX-TIX-12** · P3 · `shop/ShopScreen.css:325-350`, `tickets/ReserveResin.css:5,15,21`, `tickets/TicketCount.css:31`, `tickets/tickets.css:14`, `app/App.css:65,104` · The gold, silver and rose gold foils are 18 hex values with no tokens; `#fff` where `--canvas` exists; the scrim's value in three files · `/impeccable document`

### Pending

The sticker board, sticker tray, drawing screen, Giving and Receiving, and sign-in and identity lanes, and the detector's verified findings.

## What to keep

- **The press** (`ui/press.ts`): one implementation for every key, label and tab, translate-only, with slide-off cancel, Escape cancel, pop-then-fire and a reduced-motion path that keeps the state change.
- **One key per screen by construction**, and 44px touch targets built into label stock's bands.
- **The catalog**: types make a missing error message or key a compile error, and a test fails on a missing variable.
- **Reduced motion is designed, not bolted on**: 33 of the 48 animating stylesheets have their own block and the rest ride tokens that drop to 1ms; the Mini-game keeps every state as fades; no global 0.01ms kill.
- **Live regions**: about 53, for loading, sealing, spending and failures; skeletons are hidden with one status line each.
- **The pile and the lifted sticker** are built for assistive tech: a section per day, ordered lists of buttons named "No.0147 by @mika, 5 min ago", a focus ring round the cut, and paging announced.
- **The Mini-game** is fully playable by keyboard to 昇天, speaks its tiers and totals in both languages, and tears down completely; one engine plays both the live combo and its replay.
- **Money in limbo is treated as the person's**: a paid-but-not-added payment is kept, retried safely and reopened with "Adding the tickets again won't charge you twice".
- **The cork back and the Transfer Trail** put stats on paper and history in sentences, Direct alone for a friend-first artist.

## Recommended commands so far

1. **[P1] `/impeccable harden`**: the error line and its catalog strings (pattern 1), then UX-GRAT-1, UX-TIX-1, UX-TIX-2, UX-TIX-3, UX-EXPL-1, UX-STAT-2, and Sheet modality (UX-SHELL-2).
2. **[P1] `/impeccable clarify`**: the crypto words (pattern 2), the consent line (UX-SHELL-3), and the Gratitude words (UX-GRAT-5).
3. **[P1] `/impeccable adapt`**: zoom (UX-SHELL-1), the Japanese Transfer Trail (UX-STAT-1), the checkout at 591 tall (UX-TIX-6).
4. **[P1] `/impeccable colorize`**: one Ink-on-pink 18+ mark (UX-SHELL-4); `/impeccable polish` for the 3.45:1 row, the 1.75:1 radios and the yellow focus ring.
5. **[P2] `/impeccable clarify`** again for one name per destination and figure (UX-COPY-3, UX-COPY-4) and さん in Giving.
6. **[P2] `/impeccable onboard`**: the motion question, JPYC and the fee, empty leaderboards.
7. **[P3] `/impeccable typeset` and `/impeccable document`**: the type ladder, missing tokens and DESIGN.md's drift (patterns 7 and 8).
8. **`/impeccable polish`** last.

## Not covered so far

- **An iPhone.** Every lane ran Chromium; WebKit, LINE's in-app browser, safe areas, VoiceOver and real pinch zoom were not tried. Frame times are from a Vite dev build in headless Chromium.
- **Real Privy and Sui.** The dev server runs LIFF Mock with Privy off, so the checkout ran against stubs: real SDK error text, confirmation timing and the purchase history read from Sui are unverified, and the address papers stayed on "Getting…".
- **Received gifts.** The shared seeded world never finished, so lanes made their own users and content; the Transfer Trail and Residual were shown with rewritten API answers, and a Gratitude replay was read, not played. Shake can't run headless.
