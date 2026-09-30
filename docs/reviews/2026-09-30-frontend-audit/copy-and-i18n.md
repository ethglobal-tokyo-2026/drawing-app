# copy: the string catalog (apps/frontend/src/i18n/strings/*), glossary.md, and user-facing text outside the catalog

Commit: 9f541d12 · Files covered: all 18 files in `apps/frontend/src/i18n/strings/`, `apps/frontend/src/i18n/glossary.md`, the i18n infra (`catalog.ts`, `i18n.ts`, `format.ts`, `errorMessage.ts`, `language.ts`), and an inline-text scan of all 297 non-test .ts/.tsx under `apps/frontend/src` · Not covered: the Gift Message as LINE renders it, the Receive gift dialog, the Mini-game, the offer sheet and the chat-menu images (their strings were reviewed in the catalog, but not on screen); `public/terms.html`/`privacy.html`; WebKit rendering (all screenshots are Chromium, so iOS Japanese font metrics are unverified)
Screens inspected (375×591, Chromium, DSF 2, own users `copy-en`/`copy-ja`; EN left | JA right):
sealed card — `/tmp/impeccable-audit/shots/copy/pair-02-sealed-card.png` · board, sticker selected — `pair-04-board-selected.png` · Giving's first screen — `pair-05-giving-sheet.png` · stat board — `pair-06-stat-board.png` (+ `crop-received-stamp-ja.png`) · Explore This week — `pair-10-explore-this-week.png` · Shop — `pair-13-shop-shelves.png` · reserve ticket checkout — `pair-14-checkout.png` · drawing screen — `pair-15-drawing.png`. Captured and DOM-checked but not viewed: empty board, stat board lower half and settings, Explore Stickers, Explore search with no match, Shop top (`/tmp/impeccable-audit/shots/copy/*-{en,ja}.png`, checks in `dom-checks.json`).

Method: dumped every catalog string with the repo's own parser (`apps/frontend/scripts/catalogSource.ts` via tsx) to
`/tmp/impeccable-audit/scripts/copy/catalog.json`, then ran `check-catalog.cjs` (integrity, banned words, placeholders,
apostrophes, spelling) and `check-ja-style.cjs` (honorifics, label variants) in `/tmp/impeccable-audit/scripts/copy/`.
Result: 804 strings, 690 with Japanese, 90 developer-slip strings (English by rule). Screens: `shots.cjs`, which also
flags clipped text and Latin text on Japanese screens.

## Audit (technical)

Proposed scores for this slice: A11y **3** (every control and state has a spoken name, comments name each; a few terse or action-less names) · Performance **n/a** (static data; both languages bundled so the first render has its strings) · Theming **3** (Japanese breaks mid-phrase; handle case treated two ways) · Responsive **3** (one Japanese overflow on every stat board at 375px; the checkout's title is lost when its balance row wraps) · Integrity **3** (catalog discipline near-perfect; banned words and raw SDK messages still reach the screen)

### i18n integrity (verified by script)

- Missing `ja`: **0** user-facing strings lack Japanese outside `_one` plural keys. The 24 `_one` keys without `ja` are correct: Japanese plural rules only use `_other` (glossary Style rule). No developer string carries `ja`.
- `{{variable}}`/`<tag>` parity en↔ja: **0** mismatches. British spellings: **0**. Japanese punctuation: no ASCII punctuation or stray spaces next to Japanese.
- Inline text bypassing the catalog: `scan-inline.mjs` (oxc-parser; JSX text; `aria-label`, `aria-roledescription`, `aria-valuetext`, `title`, `alt`, `placeholder`, `label` literals and literal branches of conditionals; alert/confirm/prompt/toast literals; `document.title`) found **1** hit: `alt="Sui"` on Sui's logo (`apps/frontend/src/shop/SuiCredit.tsx:17`), a brand name, acceptable. Text assembled from variables (SDK error messages passed as `{{reason}}`) is invisible to such a scan; see the raw-message finding.
- Japanese screens: every Latin string found on them is an allowed name (LINE, Sui, JPYC, World ID, Orb, handles, croquis.eth) or the English-only developer slip (`dom-checks.json`). No catalog string shows English to Japanese readers.
- Missing where-comments: **12** strings, all Shop swatch names (`shop.shelves.*.items.*`, `apps/frontend/src/i18n/strings/shop.ts:51-85`), which share one group comment. P3, folded into the hygiene item below.

### Findings

- **[P1] "wallet" on the main Giving path, in both languages** — `apps/frontend/src/i18n/strings/giving.ts:129-132`, rendered at `apps/frontend/src/giving/Giving.tsx:233-234` whenever `state.step` is `packed` or `preparing` (every gift, while the deposit confirms) · Copy/Brand · Impact: every giver reads "Confirm in your wallet if asked…" / 「ウォレットで確認を求められたら…」 at the moment PRODUCT.md says the chain stays invisible; an artist suspicious of crypto reads "this is a crypto app" mid-gift. Whether a Privy confirmation ever appears is unverified: `apps/frontend/src/identity/PrivySession.tsx:87` sets no `embeddedWallets.showWalletUIs`, so it depends on Privy's dashboard · Standard: PRODUCT.md Brand Commitments ("never says … wallet") · Fix: "Getting your gift ready. LINE's friend picker opens next; nothing is sent until you pick a chat." / 「ギフトを準備しています。次にLINEの友だち選択がひらきます。トークを選ぶまで送られません。」; if a Privy modal can appear, turn it off (`showWalletUIs: false`) instead of explaining it · Command: /impeccable clarify · Evidence: code read + `check-catalog.cjs`
- **[P2] "token" on the sign-in screen and in Giving/Receiving errors** — `apps/frontend/src/i18n/strings/errors.ts:14-17` (`no_line_token` "LINE didn't provide a sign-in token"), `:138-141` (`line_token_expired` "Your LINE sign-in token has expired"); raised at `apps/frontend/src/api/SessionGate.tsx:76-80` and `apps/frontend/src/identity/smartWallet.ts:86` · Copy/Brand · Impact: a banned visible word on a path anyone who keeps the app open past LINE's ID-token lifetime can hit; the Japanese already avoids it (ログイン情報), so the two languages disagree · Fix: "LINE didn't sign you in. Reconnect with LINE to try again." / "Your LINE sign-in has expired. Reconnect with LINE to continue." · Command: /impeccable clarify · Evidence: code read + `check-catalog.cjs`
- **[P2] Explore's "Longest streak" ranks current streaks; the stat board's "Longest streak" is the best ever** — `apps/frontend/src/i18n/strings/explore.ts:110` vs `apps/frontend/src/i18n/strings/stickerBoard.ts:44`; the API ranks current streaks (`apps/api/src/explore/leaderboards.ts:27-28,73-93`) · Copy/consistency · Impact: one label, two figures: a gamer artist sees "Longest streak 12 days" on their stat board and a smaller number on the leaderboard of the same name. The Japanese is already right (Explore 連続日数 = the stat board's Streak; Bests 最長連続日数) · Fix: rename the Explore tab "Streak" · Command: /impeccable clarify · Evidence: code read, `pair-10-explore-this-week.png`
- **[P2] "Back to the board" is said seven ways** — `giving.backToBoard` "Back to my sticker board", `tickets.backToStickerBoard` "Back to my board", `gratitude.receipt.backToBoard` "Back to your board", `receiving.goToStickerBoard` "Go to my sticker board", `stickerCreation.sealedCard.goToStickerBoard` and `tickets.goToStickerBoard` "Go to sticker board", `explore.lifted.goToYourBoard` "Go to your sticker board", `stickerBoard.detail.back` "Sticker board" (Japanese: シールボードに戻る / マイボードに戻る / 自分のシールボードへ / シールボードへ / あなたのシールボードへ) · Copy/consistency (AGENTS.md: one thing said one way) · Impact: one destination, the My board tab, reads as several places, alternating "my" and "your" · Fix: one label everywhere, named like the tab: "Back to My board" / 「マイボードに戻る」 · Command: /impeccable clarify · Evidence: `check-ja-style.cjs`
- **[P2] Japanese drops さん for other people throughout Giving only** — `apps/frontend/src/i18n/strings/giving.ts:42,45,72,249-255,269,276` (`receivedNotice.title` 「{{name}}があなたのシールを受け取りました」, `nsfw.adultsOnly` 「{{name}}はまだ確認されていません」, `giveSheet.title` 「{{name}}にシールを贈る」), while Receiving, Explore, Offers and the sticker board put さん after 50 names · Japanese quality · Impact: Giving's sentences read curt (呼び捨て) next to every other screen; `explore.pile.stickerGiven` mixes both in one sentence (「{{artist}}の{{number}}、…{{receiver}}さんに贈られました」, `explore.ts:61-64`) · Fix: さん after other people's names in running sentences; label forms (作者：{{artist}}) stay as they are · Command: /impeccable clarify · Evidence: `check-ja-style.cjs`
- **[P2] 「受け取った」 overflows the RECEIVED stamp on every Japanese stat board at 375px** — `stickerBoard.statBoard.stamps.received` (`apps/frontend/src/i18n/strings/stickerBoard.ts:81`) · Responsive/Japanese · Impact: the word spills past the purple field into the perforated border, on your own and everyone else's cork back; the English "RECEIVED" fits · Fix: a word that fits the stamp and matches its neighbors' plain past tense (つくった, 贈った): 「もらった」; or let the stamp word shrink to fit · Command: /impeccable adapt · Evidence: `crop-received-stamp-ja.png`, `pair-06-stat-board.png`
- **[P2] The motion permission question doesn't say what motion is for** — `apps/frontend/src/i18n/strings/app.ts:40-43` "Croquis uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?" · Copy/onboarding · Impact: shown once to every iPhone user right after sign-in, before they've drawn or received anything; "permissions for motion controls" is vague, so a first-timer declines and loses shake in the Mini-game for good · Fix: name the benefit: "Shake your phone to send gratitude? Croquis needs motion to feel the shake." / 「スマホを振って感謝を送れます。モーションの使用を許可しますか？」 · Command: /impeccable onboard · Evidence: code read
- **[P2] A payment refused for good gives no way forward** — `apps/frontend/src/i18n/strings/tickets.ts:202-209`, rendered at `apps/frontend/src/tickets/ReserveTicketCheckout.tsx:331-352` · Copy/error recovery · Impact: after money left the person's Sui account: "Tickets can't be added. Asking again won't add them. <reason>", a payment ID with Copy, and one key: "Back to the packs" (buy again). Nothing says who to give the ID to, and no contact exists anywhere in the app · Standard: AGENTS.md error handling (say what to do next) · Fix: name who helps and how ("Copy the payment ID and send it to Croquis's Official account in LINE"), and say what the ID is for · Command: /impeccable harden · Evidence: code read
- **[P2] "Add JPYC to your Sui account" is a dead end** — `apps/frontend/src/i18n/strings/tickets.ts:156-167` · Copy/clarity · Impact: the only purchase path assumes the person knows how to get JPYC onto Sui; nothing says how, and the Sui address sits on the stat board with no link from the checkout. A first-timer and a crypto-suspicious artist stop here · Fix: link the line to the Sui address paper and a short "How to add JPYC" · Command: /impeccable onboard · Evidence: code read
- **[P3] Error lines that don't say what happened or what to do** — `errors.signed_out` "You're signed out." (shown beside a Try again that can't help; say "Reopen Croquis from LINE"), `errors.gift_closed` "This gift is closed.", `errors.deposit_mismatch`, `errors.invalid_request`, `errors.unknown` "Something went wrong ({{code}})", the "isn't here" family (`gift_not_found`, `sticker_not_found`, `ticket_not_found`, `user_not_found`; the Japanese says 見つかりませんでした), `errors.line_token_invalid` "contact the team" (no contact exists), `errors.deposit_not_landed` "The gift bag isn't on the chain yet." (chain words outside PRODUCT.md's one exception, which is a seal), and Giving's `depositUnconfirmed`/`takeOutUnconfirmed` ("The Sticker transfer could not be confirmed…", "…Check the gift in the app…": capital Sticker, passive, "transfer", and no place named to check) — `apps/frontend/src/i18n/strings/errors.ts:7,64-72,74,86,127-136,199-200,207,236,258`, `apps/frontend/src/i18n/strings/giving.ts:10-19` · Command: /impeccable clarify
- **[P3] Raw SDK messages land inside Japanese sentences** — `apps/frontend/src/giving/giveFlow.ts:66-73` falls back to `error.message` for anything that isn't an ApiError (e.g. LINE's picker failing), shown as 「No.0147を送れませんでした：<English SDK text>」; the same pattern is deliberate in `tickets.checkout.balanceProblem`, `walletBroken`, `walletSignInFailed`, `stickerBoard.timelapse.notPlayed` · Impact: mixed-language alerts, possibly with technical words the brand bans · Fix: a localized line saying what to do, with the technical text in fine print after it · Command: /impeccable harden · Evidence: code read
- **[P3] English "seal" means two things** — the sticker's seal (ceremony, "Sealed" card) and the gift bag's closure (`giving.sent.title` "Sealed and sent", `inTheBag.lead` "It seals when it's sent", `notSentLead` "unsealed", tear tape "SEALED 9.23"; `giving.ts:142,149,176,195,214`) · Vocabulary (AGENTS.md: one meaning per term) · Impact: "It's still in the bag, unsealed" about a sealed sticker; the Japanese separates them (仕上げる vs 封) · Fix: the bag "closes": "Closed and sent", tape "CLOSED 9.23" · Command: /impeccable clarify
- **[P3] The checkout's title is pushed off the top whenever its balance row wraps** — `apps/frontend/src/i18n/strings/tickets.ts:120` · Responsive · Impact: at 375×591 in Japanese, 「パックを選んでください」 is off-screen and the card opens mid-sentence. On the dev server the row holds dev-only text; in production any `balanceProblem`/`walletBroken` reason wraps it the same way (unverified with a real balance) · Command: /impeccable adapt · Evidence: `pair-14-checkout.png`
- **[P3] Japanese breaks inside phrases** — e.g. the Shop lead 「無償チケットを使い｜切っても、かき続けられます。」 (`apps/frontend/src/i18n/strings/shop.ts:11-14`) · Typography · Fix: `word-break: auto-phrase` under `:lang(ja)` (Chrome/Safari support varies; `<wbr>` at phrase breaks for the short centered lines) · Command: /impeccable typeset · Evidence: `pair-13-shop-shelves.png`
- **[P3] Leaderboard reset time is a fixed "Monday 12:00 AM"** — `apps/frontend/src/i18n/strings/explore.ts:97` · Formatting · Impact: every other refill time is formatted to the person's clock (`tickets.newAt` through `formatTimeOfDay`); this one is Tokyo time with no zone, wrong for anyone outside Japan · Fix: `{{day}} {{time}}` from the same formatter · Command: /impeccable clarify
- **[P3] Small consistency slips** — "Best combo" is 最大コンボ in Explore and 最高コンボ on the stat board (`explore.ts:108`, `stickerBoard.ts:50`); "Gratitude" capitalized mid-sentence in 3 strings (`errors.gratitude_not_found`, `errors.replay_invalid`, `receiving.sendGratitude.line`), lowercase elsewhere; 46 straight vs 91 curly apostrophes; 「もどす」 (`explore.lifted.putBack`) vs 戻す everywhere else, 「…Suiscanで開く」 (`tickets.purchases.open`) vs ひらく everywhere else; "ticket shop" in `errors.payment_not_found` where the vocabulary says Shop (and チケットショップ reads as a discount-ticket reseller in Japanese); the Giving sheet's fine print shows the handle in capitals ("@COPY-EN", `pair-05-giving-sheet.png`) while the sealed card keeps its case ("@Copy-en", `pair-02-sealed-card.png`), and the catalog's own comments say handles keep their case · Command: /impeccable polish
- **[P3] Catalog and glossary hygiene** — 12 Shop swatch names without their own where-comment (`shop.ts:51-85`); `glossary.md:18` says "as the Draw tab" but Draw is the board's key, not a tab; the glossary has no entry for combo, streak, Best combo, Timelapse, Offer or board address, which is how 最大/最高コンボ drifted · Command: /impeccable document

### Positives (what to keep)

- Catalog discipline: 804 strings, 0 missing Japanese, 0 inline strings, 0 placeholder mismatches, where-comments on all but 12. `errors.ts` `satisfies Record<ErrorCode | "unknown", Leaf>` makes a missing error message a compile error; the selector-typed `t` makes a wrong key one; `missingInterpolationHandler` fails tests on a missing variable (`apps/frontend/src/i18n/i18n.ts:21-26`).
- The translator round trip (`i18n:export`/`i18n:import`) with a glossary is the right structure for the native review the glossary asks for before launch.
- Reassurance at the moments that cost something: "Your payment went through. Adding the tickets again won't charge you twice." (`tickets.ts:187`), "it won't use another ticket" (`errors.mint_failed`), "Couldn't pick up your drawing, so its ticket carries over", and "Can't find them?", which explains LINE's picker gaps honestly and offers the fix.
- Screen-reader copy is written, not generated: spoken durations, "3 of 6" positions, keyboard hints, the gift bag named by its state and stamp.

## Design review (Assessment A)

### Design specificity verdict

Authored for Croquis. The voice lives in physical verbs and objects: Remove is はがす (peel), "It comes off your board and into a gift bag", "Pull", rubber stamps (Opened, Taken back, Returned), the label-maker "Since 2026.09.30" tape, 「ふぅ…」 as a combo ends. Nothing here is interchangeable SaaS copy. It slips where the plumbing shows through: the Giving wait says "wallet", sign-in errors say "token", and errors switch to an engineer's voice ("transfer", "on the chain", "the app's server", "isn't here").

### Heuristics — copy lens

1. Visibility of system status — 3: the seal's staged labels ("Sealing your sticker…", "It can take up to half a minute.", "It's taking longer than usual.") are exemplary; Giving's wait is the exception.
2. Match with the real world — 3: sticker, bag, peel and stamp metaphors hold; lapses are wallet, token, transfer, on the chain, "px" on the size rail.
3. User control and freedom — 3: "Take it out", "Not now", "Put back", "Flip back"; a refused payment offers only buying again.
4. Consistency and standards — 2: seven board-return labels, "seal" with two meanings, "Longest streak" naming two figures, 最大/最高コンボ, さん dropped in one feature, mixed apostrophes.
5. Error prevention — 3: "Seal: tap twice", a reserve ticket always asked for, "won't charge you twice".
6. Recognition rather than recall — 3: keys name their action (Give, View, Remove, Send in LINE, Accept); a few spoken names don't (the Zipper is "Your stickers", the tray's tabs are "Show").
7. Flexibility and efficiency — 3: keyboard hints are complete, if long (`board.selectedHint` reads seven bindings on every selection).
8. Aesthetic and minimalist design — 3: labels are short in both languages; the terms line on the Accept sheet packs a privacy consequence and two legal links into one line at the moment of joy.
9. Recognize, diagnose, recover from errors — 2: many errors state a cause but no next step, and some state neither.
10. Help and documentation — 2: "Can't find them?" is the model; nothing else points anywhere (no contact, no JPYC how-to, a vague motion question).

### Cognitive load

Copy-level failures: errors that require the person to infer the next step (signed_out, gift_closed, refused payment); two figures under one name (Longest streak). No copy-driven decision point exceeds four options; the checkout's four packs carry both the discount and the struck price, which is the right amount.

### Emotional journey

Peaks: 仕上がりました / "Sealed" on the backing card, "Sealed and sent", "@bob received your sticker", the Mini-game's escalating Japanese. Valleys: the gift wait that asks about a wallet, at the single highest-stakes moment in the product; a refused payment with no one to turn to. Reassurance is strongest around tickets and weakest around the gift itself.

### Strengths

1. Near-perfect i18n integrity, enforced by types and tests rather than by care alone.
2. A specific, tactile voice in both languages, carried into the Japanese (はがす, つまみ, 開封済み, 仕上がりました).
3. Honest, calm copy at cost moments: tickets, payments, lost drawings, LINE's picker limits.

### Priority issues

- [P1] "wallet" in Giving's wait — Why: breaks the product's central promise at its central moment · Fix: the rewrite above; turn Privy's modal off if it exists · /impeccable clarify
- [P2] Errors without a next step, worst for a refused payment and for JPYC — Why: money and sign-in paths dead-end · Fix: every error names what to do and who helps · /impeccable harden
- [P2] One thing, several names (board return, Longest streak, seal) — Why: people learn the app by its words · Fix: one label per destination and figure · /impeccable clarify
- [P2] Japanese quality in Giving (さん) and the RECEIVED stamp overflow — Why: the Japan-first audience meets both on core screens · Fix: add さん; 「もらった」 · /impeccable clarify, /impeccable adapt
- [P2] The first-run motion question — Why: a vague permission request gets declined, and shake is lost for good · Fix: name the benefit · /impeccable onboard

### Persona red flags

- Casey (one-handed, interrupted): "Confirm in your wallet if asked" sends them looking for an app to switch to mid-gift; "Picked up where you left off" and "Seal: tap twice" serve them well.
- Jordan (first-timer): the motion question before any context; "Add JPYC to your Sui account" with no how-to; "Handles are exact".
- Sam (VoiceOver/keyboard): rich spoken names, but the Zipper is "Your stickers" (no action), the tray's tab group is "Show", and the selected-sticker hint reads seven key bindings each time; Japanese spoken names mix さん within one sentence.
- Friend-first artist: the Gift Message's "ONE OF ONE" / 一点もの (`giving.ts:24`) reads like NFT marketing ("1/1") where "Scarcity is felt, not explained" asks for less.
- Gamer artist chasing clout: "Longest streak" disagrees with their own stat board; 最大コンボ vs 最高コンボ.
- Artist suspicious of crypto: wallet, token, "transfer", "on the chain", ONE OF ONE — each alone is small; together on the give path they add up to the racket PRODUCT.md warns about.

### Minor observations

- "the app's server" recurs across errors; people don't model a server, and "Croquis" would read warmer.
- `errors.payment_short` "The payment was short." is an idiom that translates poorly and gives no next step.
- `stickerBoard.statBoard.gratitude.noneYet` (someone else's board): "…when someone sends gratitude for a sticker they gave them" has ambiguous pronouns; the Japanese is clearer.
- In English, the stat board's longer wrapped copy pushes Flip back under the peeking Settings note at 375×591 (`pair-06-stat-board.png`); the Japanese layout, shorter, clears it.

### Questions to consider

- Offers: 「手持ちの感謝を少し渡して、ゆずってもらいます」 ("hand over some of your gratitude to have them give it up", `offers.ts:36-37`) with amounts 100/250/500 frames Gratitude as payment for a sticker. Is that the framing PRODUCT.md's open question wants, given "Clout, not cash"?
- Should the Gift Message say ONE OF ONE at all, or let the single-use link carry the scarcity ("It opens once" already does)?
- The Accept sheet asks people to agree to Terms and a Privacy Policy that PRODUCT.md says are placeholders; is that line ready to ship?
