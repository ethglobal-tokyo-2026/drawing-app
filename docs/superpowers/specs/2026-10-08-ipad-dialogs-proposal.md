# iPad dialogs: design proposal

**Status:** for ad0ll's review, 2026-10-08. Covers the screens no iPad plan has: the sticker detail, Giving, Receiving, the Gratitude Mini-game and its replay, and Explore's lifted sticker. Feeds `docs/superpowers/plans/2026-10-08-ipad-dialogs.md` (to write). Direction: `2026-10-08-ipad-design-brief.md` (the same world, composed for the room; controls keep phone sizes; cards rise to the middle at 400px). Every rule sits behind foundations' large-screen query, so phones are unchanged.

**Captures:** the draft (`spike/ipad-board`), where none of these screens has a large-screen rule yet, so each capture is the phone layout at iPad size. Chromium (WebKit can't render pages on this Mac), English, at 820×1094 and 1180×734, in `.claude/worktrees/ipad-research/data/scratch/board/me/dialogs/` (gitignored) as `<state>-<size>.png`. Its `dialogs.js` takes them again without changing the research database: it holds `POST /api/gifts`, refuses `POST /api/gifts/receive`, and plays the Mini-game as the developer slip's demo. Not captured: Japanese, the Send gratitude sheet and the gift received notice (both need a real Accept).

## Decisions

1. **One card rule for every sheet these screens open.**
   - Today: Giving's sheets, the Accept sheet and the Send gratitude sheet are the shared `Sheet` (`ui/sheet.css`, `left: 0; right: 0`), and the lifted sticker's sheet is pinned the same way (`lifted-sticker.css`). Each spans the screen with its title and X at the screen's edges, at the foot, far from the sticker it's about.
   - A: rise to the middle at 400px, as the checkout, ticket cards and Sealed card do. The perforation stays only for keyboards and screen readers, as the gratitude events card's tear strip does; the scrim, X, Escape and Back close it. The scrim covers the tab row and its lead key. At most the screen's height, its body scrolling, its key in view.
   - B: keep bottom sheets at the foot, 400px wide and centered.
   - **Recommend A.** Covers the give sheet, the sticker picker, Can't find them?, Preparing your gift, the Accept sheet, the lifted sticker and the Mini-game's receipt; uncaptured, the same for the Send gratitude sheet and the gift received notice.

2. **Sticker detail** (`detail-*`, `detail-owed-*`, `detail-timelapse-*`).
   - Today: a page whose column runs the screen's width beside the thumbnail rail. Give and Send gratitude stretch nearly edge to edge, wider than any key on a phone; the open trail row puts Replay the screen's width from its amount. The sticker centers on the screen while the heading, artist chip and fine print hug the left edge. Upright, a third of the screen stays empty under the trail; sideways, the Transfer Trail starts at the fold, and opening a replay scrolls the sticker off the top.
   - A: one centered column at a phone's width, both ways, the sticker over it growing up to 1.5×, as the tray's sheets do.
   - B: sideways, two panes: the sticker, its paging carets and Timelapse playing in place, centered on the left; the heading, fine print, key, Transfer Trail and Mark 18+… in a phone-width column on the right that scrolls on its own. Upright, A.
   - **Recommend B.** Sideways, the sticker, its key and the open trail row with its replay are all in view, and the sticker never scrolls away; upright, the phone's order and measure. The key keeps the column's width; the rail stays at the left edge.

3. **The Transfer Trail's replay** (`detail-replay-*`).
   - Today: the stage is the card's width, the whole column, by 300px, and the replay scales by the card's width over a phone's. Sideways, オーバーヒート's caption runs nearly across the stage, far larger than on a phone, and the stage drops below the fold.
   - A: decision 2's phone-width column gives the card a phone's width, so the replay plays at a phone's scale with no new rule.
   - B: scale by the replay heart's width over a phone's live heart, at any card width (`replayScale` in the deleted plan, `git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-explore-and-dialogs.md`, decision 15.6).
   - **Recommend A,** which comes with decision 2. If decision 6 grows the live game, the replay still plays at its card's scale.

4. **Giving from your board: the give sheet and the gift bag** (`give-sheet-*`, `gift-bag-*`).
   - Today: the sticker floats at the screen's top and the sheet sits at its foot, with about half the upright screen of scrim between the sticker and the act that gives it. Title and X sit the screen's width apart. Preparing your gift grows the sheet round the bag, and its note runs one line nearly the screen's width (DESIGN.md caps notes at 28–44ch); sideways, the sheet cuts across the sticker's ghost outline.
   - A: a phone's page in the middle, sticker over sheet, as the deleted plan had.
   - B: decision 1's card with the sticker at its head over the give sheet's rows. Packing drops the sticker into the bag inside the same card, which then holds Preparing, sent and Take it out.
   - **Recommend B.** The sticker and its Give sit together, the drop into the bag stays in one place, and no phone frame floats in the room.

5. **Give on someone else's board: the sticker picker** (`give-picker-*`, `give-picker-picked-*`).
   - Today: the picker's four columns stretch with the sheet, so two stickers sit far apart and the picked tile becomes a wide aqua slab. The sheet stops above the tab row, which stays lit and live: the lead's Give and the sheet's Give No.0037 show together, two keys on one screen. The first capture, 3s after Give, caught the sheet taller than the screen at 1180×734, its perforation above the top edge; it had settled by the next.
   - A: decision 1's card, tiles at the phone's size, four a row; the scrim dims the tab row and the lead, as the out-of-tickets card does (foundations, decision 5).
   - B: keep the full-width sheet, with as many phone-size tiles a row as fit.
   - **Recommend A.**

6. **Receiving: opening a gift, the pull tab, Accept** (`receive-closed-*`, `receive-open-*`; torn through the pull tab's slider, Accept untouched).
   - Today: a phone page pinned to the top left. The giver's picture and "Ipad-bob sent you a sticker" sit in the corner, the bag in the upper middle, and half the upright screen is empty under the hint. Torn, the risen sticker sits at the top and the Accept sheet at the foot, a band of empty Liner between them upright, the sheet across the full width.
   - A: a phone's page in the middle, as 4A.
   - B: one centered group: the header centered over the bag, the bag and pull tab at the phone's size in the middle of the screen. Torn, the Accept panel rises as a 400px card under the bag's mouth, over its lower half as the phone's sheet does, so the risen sticker, its fine print and Accept read as one group.
   - **Recommend B.** The pull tab keeps a phone's travel, so the tear feels the same.

7. **The Gratitude Mini-game** (`minigame-start-*`, `minigame-combo-*`, `minigame-receipt-*`).
   - Today: the HUD spans the screen. The drain bar runs nearly edge to edge, the amount sits at the far left and the hit counter and multiplier at the far right, so the eye can't hold both while tapping the heart in the middle. The heart and pop-in words keep a phone's size in a room nearly three times a phone's, and the mini hearts thin out across it; the speed lines, ground and hearts filling the screen is right. The header and the X sit in opposite top corners. The receipt is a card nearly the screen's width, its Back to My board label as wide.
   - A: a phone-width band: the header with its X, the HUD and the receipt in one centered column; the heart and effects at a phone's scale.
   - B: A, and the game grows with its stage up to 1.5×: the heart, lettering, pop-in words, mini hearts, and the touch rules (a first tap's slop, a stroke's least run) with them. The deleted plan records the heart growing as ad0ll's call (decision 15.1).
   - **Recommend B,** the receipt as decision 1's card. "Controls keep phone sizes" holds for the X and the receipt's label; the heart is the game's stage piece, and a larger one only widens its target.

8. **Explore's lifted sticker** (`lifted-*`).
   - Today: a full-width bottom sheet with its paging carets at the screen's edges, far from the 210px sticker between them. Sideways, it covers most of the height across both columns, This week included, and hides the sticker's ghost spot in the pile.
   - A: decision 1's card in the middle, the carets just outside the sticker's square; the flight lands in the card, and Put back flies it home.
   - B: sideways, a 400px card over the pile's column, so This week stays in view and the flight stays short; upright, A.
   - **Recommend A:** one place for every card, and the card is modal either way.
