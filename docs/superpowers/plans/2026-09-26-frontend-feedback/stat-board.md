# Stat board (the board's cork back): findings and fix plan

Lane: stat-board. Code read at main **42d698a**. The research checkout moved there from 29c3325 during the run. The board-address papers and QR codes (a38f82d) are already on main, so this plan builds on main's StatBoard.tsx.

**Screenshots** (all in /tmp/feedback-plan/stat-board/, 390×844 at 3×):

- `s0-cork-0.png` … `s0-cork-3.png`: a fresh user with real data (empty states), the whole cork scrolled in four steps. `s0-el-*.png` are element shots: who, receipt, bests, leaf, stamps, tape, slip.
- `b-today-top.png`, `b-today-receipt.png`, `b-today-bests.png`, `b-today-leaf.png`, `b-today-who.png`: today's cork **with figures**. The figures are route-mocked in my own browser context (`render.mjs`): made 12, received 5, given 7, gratitude 1,840 / 620 / 395, streak 4, bests 9 days / 64 hits / 1,210.
- `c-proposal-top.png`: items 1, 2 and 4 applied by DOM changes in my page only, with the streak in Calendar Blue. `c-proposal-foot-mid-pull.png` shows the slip peeking at the foot.
- `swatches-in-context.png`: item 5's sheet, five cork backs side by side.
- Draw-and-seal didn't finish on the shared server (`s-fail.png`): the seal key never armed at about 14:12 UTC. The explore lane logged "Your sticker wallet is taking too long to get ready" at 14:05. That's why the states with figures use mocked stats.

Scripts: `flow.mjs` (real user, flip, scroll, seal attempt), `render.mjs` (mocked stats and proposals), `sheet.mjs` and `sheet.html` (the swatch sheet), `contrast.mjs` (contrast and OKLCH figures quoted below).

---

## 1. Gratitude received: Direct and Residual, a heart, no Magic

- **Item:** "You've invented Magic and Original artist. Just say Gratitude received and Residual. Residual is gratitude you receive as the 20% bonus when you're the original artist, versus gratitude you've received directly: Gratitude received, Direct and Residual, and show the number. We need an icon for gratitude; it could just be the heart. And Magic… there's nothing there."
- **Now (verified):**
  - The receipt lists three rows from `GRATITUDE_KINDS` (StatCork.tsx:70-78, rendered at 187-199): Inspired (pink dot), Magic (grape dot) and Original Artist (Seal Yellow dot). Each row has a reason line, and TOTAL sits under them.
  - The dots are styled at stat-board.css:296-313.
  - All three rows show even at 0, though the spec says a row at 0 is left off (spec :47).
  - Screenshots: `b-today-receipt.png`; the empty state is `s0-el-receipt.png`.
- **Cause (verified):**
  - The API splits the giver's part by the combo's method: tap goes to `inspired`, stroke and shake to `magic` (apps/api/src/stickerBoards/userStats.ts:46-53; schema apps/api/src/shapes.ts:138-155).
  - PRODUCT.md:79 and :107 say what "inspired" and "magic" measure is open and "not to be invented as settled". The build settled it anyway.
  - "Magic" is your part of stroke and shake combos: hidden input methods most people never find. That's why it reads as nothing.
- **Data (verified): the split ad0ll wants already exists.**
  - Every combo stores `original_artist_gratitude_share` (packages/db/src/schema/gratitude.ts:32-36). It's 20%, floored (apps/api/src/gratitude/record.ts:21, 104-110), and it's set only when the Original Artist is neither the giver nor the receiver.
  - userStats.ts:49-50 already computes each combo's giver part (`total − share`) and the artist's share.
  - **Direct = inspired + magic; Residual = asOriginalArtist.** No schema change and no new column.
  - One wording note: the 20% isn't a bonus on top. It comes out of the giver's part, so a combo of 100 gives the giver 80 Direct and the artist 20 Residual. The copy shouldn't say "bonus".
- **Fix:**
  - **API:**
    - In `shapes.ts` `userStatsSchema.gratitude`, change the fields to `{ direct, residual, total }`.
    - In `userStats.ts`, add `direct += giversPart; residual += share` and drop the tap/stroke branch. The `method` select can go too.
    - Rewrite apps/api/src/routes/stickerBoards.test.ts:312 and :354-366: B's `direct` is `total − share` across tap, stroke and shake; A's `residual` is the share.
    - The frontend gets the type through `@drawing-app/api/client` (Hono RPC), so there's no hand-written type to change.
  - **Frontend:**
    - In StatCork.tsx, `CorkFigures.gratitude` becomes `{ direct; residual; total } | null`.
    - Replace `GRATITUDE_KINDS` with two rows, Direct and Residual: the label and the amount only, with no dots and no reasons.
    - Put a Phosphor `Heart` (fill) in Bonbon Pink with an Ink edge before the "Gratitude received" heading. Keep TOTAL.
    - Leave off a row at 0.
    - In the CSS, delete the dot rules and `small` rule (stat-board.css:290-313) and set each row as label left, amount right.
    - statFigures.ts:25 only needs its type changed.
    - New strings go into `apps/frontend/src/i18n/strings/stickerBoard.ts`, under `statBoard`, each `{ en, ja }` under its where-comment (AGENTS.MD "Internationalization"). Suggested ja: 直接 / 作者として, for the ja catalog's owner to confirm.
  - **Docs:**
    - AGENTS.MD vocabulary needs ad0ll's approval first (AGENTS.MD:5 says agents may not invent or redefine vocabulary). Rename "Original Artist Gratitude Share" to Residual, or give it Residual as its on-screen name, and add Direct.
    - DESIGN.md:471 (the cork back's Gratitude bullet).
  - **Render:** `c-proposal-top.png`.
- **Impeccable:** `/impeccable clarify` (labels, and the empty and failed states), then `/impeccable distill` (rows, dots, reasons), then `/impeccable polish`.
- **Size:** M (API field change and its tests, the receipt, the catalog, docs).
- **Decisions for ad0ll:**
  1. **"Residual" conflicts with DESIGN.md:636** ("Don't describe gratitude with money words: royalty, earn, reward, cut, share, %"). Residuals are royalty payments. _Recommend:_ use Residual as you asked, and add it to DESIGN.md as the allowed name. The alternative is "As the artist".
  2. **Reason lines under the rows.** _Recommend:_ none. The sticker's trail already explains the artist's fifth where it happens (DESIGN.md:570).
  3. **A row at 0.** _Recommend:_ leave it off, as the spec says. A friend-first artist then sees Direct only.
- **Overlaps:**
  - The icons lane owns the gratitude heart icon; this lane only places it.
  - The **i18n/sticker-board** branch (another session; worktree agent-ab75fe818dac421f9 at c475216) is moving this folder's hard-coded English into the catalog. StatCork.tsx and statFigures.ts are still inline English on main.
  - Explore's leaderboards use totals only (verified: no inspired or magic under apps/api/src/explore), so no Explore change is needed.

## 2. Best combo: drop its note

- **Item:** "Best combo doesn't need its copy about 'most hits in one gratitude combo'."
- **Now (verified):**
  - StatCork.tsx:234-239 renders `Best combo<small>Most hits in one gratitude combo</small>` with the value `×64`.
  - The note's CSS is at stat-board.css:545-550, and the container-query rule at :573-576 exists only for this note.
  - Screenshots: `b-today-bests.png`, `s0-el-bests.png`.
- **Also verified:**
  - **"None yet" never shows once stats load.** StatCork.tsx:238 and :243-245 test `=== null`, but the API sends 0 (userStats.ts:23-29, :67). A new user sees "Best combo ×0" and "Most gratitude in a day 0", while Longest streak says "None yet" (`s0-el-bests.png`).
  - **`×64` breaks DESIGN.md's Hits Rule** (DESIGN.md:368): a combo's length never wears ×, which belongs to the multiplier (×1–×8), and it always shows as the hit counter. With the note gone, "×64" reads as a 64× multiplier.
  - The spec's `ui/HitCounter.tsx` (spec :57) was never built. Explore prints `×{value}` too (ExploreScreen.tsx:123).
- **Fix:**
  - Delete the `<small>` and its CSS (:545-550, :573-576).
  - Show "None yet" at 0 for Best combo and Most gratitude in a day. Test for 0 in the render; `null` keeps meaning "didn't load".
  - Build `ui/HitCounter.tsx` to DESIGN.md's "Hit counter" section (:526-533): Figure numerals leaning 11°, HITS in small caps, three pink speed lines off the number's left. Use it at 20px here and at 23px on Explore's leaderboard.
  - Render: `c-proposal-top.png` (an approximation).
- **Impeccable:** `/impeccable distill` (the note), then `/impeccable polish` (the hit counter).
- **Size:** S for the note and "None yet". M with the shared hit counter.
- **Decisions for ad0ll:** build the hit counter now? _Recommend:_ yes. Without the note, "×64" is ambiguous.
- **Overlaps:** the explore lane (the leaderboard's Best combo, same component).

## 3. The developer slip: off screen until pulled for

- **Item:** "The little dev section at the bottom should be off screen by default. You shouldn't see it unless you know it's there. You should scroll down and feel a little resistance before it shows."
- **Now (verified):**
  - StatBoard.tsx:94-108 renders the slip when `DEV_SLIP` is set (:25-27). It's the last child of the cork's one scroller (StatCork.tsx:322), after the address papers (StatBoard.tsx:87-93), with a 28px gap (stat-board.css:664-668).
  - The cork scrolls with `overflow-y: auto` and `overscroll-behavior: contain` (stat-board.css:16-24).
  - Measured with mocked figures (`render.mjs` log): the cork is 776px tall with 2,154px of content. The slip starts 928px down and is 1,211px tall. Screenshots: `s0-cork-1.png` to `-3.png`.
  - **Once items 1, 2 and 4 trim the cork, the stats and both address papers fit the first screen, and the slip's top shows on it** (`c-proposal-top.png`). Hiding it matters more after those cuts.
  - The back stays mounted after its first turn (StickerBoard.tsx:824, "kept from then on"). Any revealed state would survive later turns unless it's reset.
- **Fix:** keep the slip in the live build (VITE_DEV_SLIP=on), collapsed under the cork's end.
  - Move the slip out of StatBoard.tsx into `stat-board/DeveloperSlip.tsx`. Add a `usePullToReveal.ts` hook beside it.
  - **Collapsed:** a wrapper at height 0 with `inert`, so the cork's scroll ends at the address papers.
  - **The pull:** at the cork's bottom (`scrollTop + clientHeight ≥ scrollHeight − 1`), a touch that keeps dragging up raises the slip's torn top and washi from under the papers, damped like iOS's rubber band: `shown = limit × (1 − 1 / (pull × 0.55 / limit + 1))`, with limit ≈ 90px.
    - React's touch listeners are passive, so `touchmove` needs `addEventListener(…, { passive: false })` in an effect to call `preventDefault`.
    - Past about 140px of finger travel (about 60px shown), the release opens the wrapper to the slip's height on the peel curve and scrolls it into view. Short of that, it springs back on the spring curve.
    - Set `overscroll-behavior-y: none` on the cork so iOS's own bounce doesn't stack on top.
    - Wheel deltas past the bottom add up the same way on desktop.
    - The pull is at the bottom, pulling up, so it doesn't compete with LINE's swipe-down at the top.
  - **Keyboard and screen readers:** a visually hidden "Developer tools" button at the cork's end reveals the slip.
  - **Reduced motion:** no rubber band. Crossing the threshold fades the slip in.
  - **Reset:** collapse again when the board turns back to its front (`turn(false)` or `onTurnEnd(false)` in StickerBoard.tsx).
  - **Tests:** add a DeveloperSlip test covering three cases: collapsed at first, revealed after a simulated pull past the threshold, and revealed by the hidden button. No repo test depends on the slip showing (verified by grep).
  - **Other lanes' Playwright scripts** that use the slip (the language switch, the gratitude demo, the performance recorder) will need the pull or the hidden button.
- **Impeccable:** `/impeccable animate` (the resistance and spring), with `/impeccable harden` for iOS gesture edge cases.
- **Size:** M.
- **Decisions for ad0ll:**
  1. **How long it stays open.** _Recommend:_ until the board turns back ("off screen by default"), not for the whole session.
  2. **The same on the dev server.** _Recommend:_ yes, so what's tested is what ships.
- **Overlaps:** the perf lane (the performance recorder lives on the slip); any lane scripting the slip.

## 4. Streak copy, and the LINE name and picture

- **Item:** "A streak on the board doesn't need the copy. The name and picture from LINE don't need to be there on the user stat board either; that's doing nothing."
- **Now (verified):**
  - **The streak's copy:**
    - StatCork.tsx:286 prints `f.streakRule` under the count. The copy comes from statFigures.ts:27-32: "Miss a day and it goes back to zero. Days turn over at 12:00 AM." / "Draw a sticker today to start one." / "It starts the first day they draw." (`b-today-leaf.png`).
    - The same slot carries the load failure (StatBoard.tsx:54-55; statFigures.ts:18).
  - **Candidates for "the name and picture":**
    - (a) **The person card** at the top of the cork (StatCork.tsx:161-171): the LINE picture as a photo sticker, and the LINE display name with @handle on a washi-taped card. It's filled from LINE via `useIdentity` (StatBoard.tsx:47-49), and from the owner on someone else's board (ArtistBoard.tsx:201-203). Screenshots: `b-today-who.png`, `s0-el-who.png`.
    - (b) **The developer slip's "LINE name" and "LINE user ID" rows** (LineDetails.tsx:86-87; `s0-cork-1.png`). These show a name but no picture.
  - **Which one ad0ll means (suspected, with high confidence): (a).** "Name and picture" together only match the person card.
    - A tap on it does nothing: it's in the stuck-on list at StatCork.tsx:81-82.
    - It repeats the front's header, which was just tapped to turn the board.
    - The receipt's top line already prints the @handle (StatCork.tsx:180-183).
- **Fix:**
  - **The streak's copy:**
    - Delete the rule paragraph (StatCork.tsx:286; CSS stat-board.css:402-407).
    - Remove `streakRule` from `CorkFigures`, from statFigures.ts, and from the `nextRefill` and `formatRefillTime` imports.
    - Keep "Not started" at 0.
    - The failure message, `stats.error.message` included, moves to the receipt's empty line: "Gratitude didn't load." (StatCork.tsx:202-203) becomes "Your stats didn't load: {reason}". That follows the spec's failed-load rule (spec :61).
  - **The person card:**
    - Remove `.stat-board__who` (StatCork.tsx:161-171) and its `picture` prop. Keep `name` for the dialog's label (:155) and `handle` for the receipt.
    - Drop the "who who" grid row (stat-board.css:88-93), the name-card CSS (:118-165) and its entry in `ON_CORK`.
    - This applies to your board and to someone else's, since both use StatCork (ArtistBoard.tsx:343).
    - Update DESIGN.md:376 and :470 and the spec's table (:32).
  - **Render:** `c-proposal-top.png`.
- **Impeccable:** `/impeccable distill`.
- **Size:** S.
- **Decisions for ad0ll:** remove the card from someone else's cork back too? _Recommend:_ yes. You tapped their name to turn their board, and the receipt still names them.
- **Overlaps:** item 5 (the leaf's look); the i18n/sticker-board branch.

## 5. The streak gets its own color; "received" stops matching the Shop

- **Item:** "If streak is its own special thing, it should have its own styling and its own color instead of overlapping with the yellow that's associated with drawing… associate that with the gratitude color and then received. I'm not a huge fan of having it be the same color as the store color."
- **My reading:**
  1. The streak gets its own hue, off Seal Yellow.
  2. Everything on the receipt reads as gratitude's pink: its heart, and no grape or yellow dots.
  3. The received stamp shouldn't share the Shop's grape.
  - Another reading is possible: "associate that with the gratitude color" could mean the streak takes pink. That's column v3 in the sheet.
- **Now (verified):**
  - **The cork back's colors:**
    - The streak band is Seal Yellow (stat-board.css:367-374).
    - The stamps are made in yellow, received in grape and given in aqua (StatCork.tsx:291-296).
    - The receipt's dots are pink, grape and yellow (stat-board.css:302-313).
    - The Bests scrap's ruled lines are grape (:496).
    - The pins and washi are pink.
    - So on this one surface, yellow means three things (streak, made, Original Artist) and grape two (received, Magic), plus a decoration.
  - **App-wide:**
    - DESIGN.md:284 puts the streak band under Seal Yellow ("Now").
    - DESIGN.md:293 gives grape both "received" (Accept, the tray's Gifts tab, received marks) and the Shop (the Shop tab, the ticket shop's Pay key and picked pack, reserve tickets). That breaks the One Meaning Rule (DESIGN.md:327), and ad0ll's complaint follows from it.
- **Palette proposal (colorize audit; within the no-green, ink-on-color and one-meaning rules):**
  - **Streak: a new coded hue, Calendar Blue `#5B9BFF`, with its deep partner `#2F6BD1`.**
    - The hue comes from the object and the audience, not the "streak = flame orange" default. The leaf is a tear-off day calendar (日めくり), and Japanese calendars print Saturdays in blue.
    - It's also the one free hue that isn't green. The palette sits at OKLCH hue 34 (tomato), 95 (yellow), 201 (aqua), 292 (grape) and 359 (pink), with the cork at 68. Blue at 259 fills the 91° gap between aqua and grape.
    - Ink on it measures 6.29:1 (`contrast.mjs`).
    - **Tangerine `#FF9B3D` is rejected.** Ink on it is 8.30:1, but at hue 60 it sits within 8° of the cork and between yellow and tomato (v2).
    - Blue and grape are close in lightness (0.69 and 0.67), so for color-blind readers the STREAK band and the leaf's shape carry the meaning, not the hue alone.
  - **Gratitude received:** Bonbon Pink only (the pin and the heart), with the rows in Ink.
  - **The received stamp stays grape, and grape comes to mean "received" alone.** The Shop, Pay, the picked pack and reserve tickets move off grape (the shop lane's call). Recoloring just the stamp would split "received" across the app, since Accept, the Gifts tab and received marks are all grape.
  - **The made stamp stays Seal Yellow.** Made means drawing, which is the meaning ad0ll gives yellow.
  - **Bests' ruled lines** become Ink at 14% (the kiss-cut rule) instead of decorative grape.
  - **The build:**
    - Add `--calendar-blue` and `--calendar-blue-deep` in apps/frontend/src/styles/tokens.css, beside :9-13 and :110-114.
    - The band rule is at stat-board.css:370; the ruled lines are at :496.
  - **DESIGN.md:**
    - In the frontmatter `colors`, add `calendar-blue` and `calendar-blue-deep`.
    - Add a Calendar Blue entry under Colors: "the streak: the calendar leaf's band, and the streak's icon."
    - Take the streak band out of Seal Yellow (:284), and the scrap's rules (plus the Shop items, if they move) out of Grape (:293).
    - Add "blue is the streak" to the One Meaning Rule (:327).
    - Update the cork back's bullets (:471-474).
- **Render:** `swatches-in-context.png`, with five columns: today, v1 blue (recommended), v2 tangerine, v3 pink and v4 yellow kept. Also `c-proposal-top.png`.
- **Impeccable:** `/impeccable colorize` (the token and DESIGN.md), then `/impeccable polish`.
- **Size:** S on the cork back. M if the hue also goes to Explore's Longest streak leaderboard (ExploreScreen.tsx:42-47, 124) and the streak icon.
- **Decisions for ad0ll:**
  1. **The streak's hue:** Calendar Blue (_recommended_), Tangerine, or pink.
  2. **Which side leaves grape:** the Shop (_recommended_), or "received" app-wide.
- **Overlaps:**
  - The shop lane (the Shop's color).
  - The icons lane (the streak icon, such as Phosphor CalendarCheck or Fire, and the heart).
  - The tickets-model lane (Seal Yellow's meaning; moving the streak off yellow keeps yellow as drawing and daily tickets).
  - The explore lane (the Longest streak tab).

## 6. Persona 5 lettering on the "since" line (a question; nothing to build)

- **Item:** "For the 'since 2026-09-26' line, has anybody done the font update for the Persona 5 style… the notes they put when they're trying to do things?"
- **Now (verified):**
  - The line is StatCork.tsx:253-260, "Since 2026.09.20". The date comes from `formatDay`, stickers/format.ts:7-10, as yyyy.mm.dd.
  - It's printed on Ink label-maker tape: Mona Sans 750 at 12px, uppercase, 0.13em tracking, Liner letters raised by a text-shadow, on a slightly skewed tape (stat-board.css:622-655). DESIGN.md:475 describes it that way.
  - Screenshot: `s0-el-tape.png`.
- **Search (verified):**
  - `git log --all -i --grep=persona --grep="calling card" --grep=ransom` finds no commits.
  - A wider pattern (p5, phantom, collage, magazine, cut-out, calling) finds only two unrelated commits whose bodies say "calling" (5527bd8, 337d734).
  - `git grep` across every local and remote branch finds nothing.
  - Grepping every worktree's files, uncommitted ones included, plus the docs, the memory folder and every drawing-app session log finds nothing except this lane's own brief.
- **Answer:** nobody has done it.
  - What ad0ll is thinking of is Persona 5's calling cards (予告状), in ransom-note lettering: letters cut from magazines in mixed faces, sizes and colors on black, red and white.
  - If it's wanted later, it could be built from faces the app already has: each letter on its own tilted scrap of paper, in Dela Gothic One and Mona Sans at different widths.
  - It would need DESIGN.md to allow it, since the Puffy Voice Rule (:366) limits where Dela appears.
- **Size:** none; it's a question.

---

## Other findings (verified)

- All of the stat board's own copy is inline English: StatCork.tsx, statFigures.ts, and StatBoard.tsx:82 and :127-133. AGENTS.MD:54 wants it in the catalog, and the i18n/sticker-board branch is moving it. Land items 1, 2 and 4 either on top of that branch or with catalog keys from the start.
- A suggested build order, to avoid conflicts in StatCork.tsx:
  1. Item 4 and item 2's note (distill).
  2. Item 1 (API and receipt).
  3. Item 5 (colorize).
  4. Item 3 (the pull), which becomes visible only once 1, 2 and 4 have shortened the cork.
