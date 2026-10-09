# iPad dialogs: shaped brief

**Status:** shaped with impeccable 2026-10-09; awaiting ad0ll's confirmation of changes. Decisions 1–8 were approved as proposed on 2026-10-08 and are marked kept or changed below; 9 is new. Feeds `docs/superpowers/plans/2026-10-08-ipad-dialogs.md` (to write).

- **Who:** artists on an iPad, by finger or Apple Pencil, in LINE or Safari, opening a sticker's detail, giving, receiving and sending Gratitude (Operate mode). Success: the sticker, its one act and its trail read as one group at a phone's sizes, nothing stretched across the room.
- **Authority:** DESIGN.md's world and `2026-10-08-ipad-design-brief.md`: controls keep phone sizes; cards rise to the middle at 400px. Every rule but decision 9 sits behind foundations' large-screen query, so phones are unchanged; decision 9 is for every size.
- **Untouched:** each screen's content, copy, order and motion; the gift bag, pull tab and Mini-game rules.
- **Captures of today:** the draft (`spike/ipad-board`), Chromium, English, 820×1094 and 1180×734, in `.claude/worktrees/ipad-research/data/scratch/board/me/dialogs/` (gitignored) as `<state>-<size>.png`; its `dialogs.js` takes them again. Not captured: Japanese, the Send gratitude sheet, the gift received notice.

## Decisions

1. **Changed: one card rule for every sheet these screens open.** A 400px card in the middle, over a scrim that dims the tab row and its lead key; at most the screen's height, its body scrolling, its key in view. The scrim, X, Escape, Back and a downward swipe on the card's head close it (the phone's perforation drag), all refused while its act is on its way; the perforation row shows only to keyboards and screen readers. One card at a time: a flow's next step replaces the card's content, as Giving's steps already do, never a card over a card. Covers the give sheet, the sticker picker, Can't find them?, Preparing your gift, the Accept card (placed by decision 6), the lifted sticker, the Mini-game's receipt, the Send gratitude sheet and the gift received notice.
   - Changed: the proposal dropped the phone's drag, and Apple's HIG says "Support swiping to dismiss a sheet. People expect to swipe vertically to dismiss a sheet instead of tapping a dismiss button." The rest follows the HIG's iPad sheets, centered "on top of a dimmed background view", "one sheet at a time".
   - Not popovers: these are multistep flows whose acts can't be tapped away, and the HIG keeps popovers to "a small amount of information or functionality" that closes on a tap outside.
2. **Kept, sharpened: the sticker detail in two panes when the window is wider than tall; one column otherwise.** Left pane: the sticker, its carets and Timelapse playing in place, centered. Right pane: a phone-width column that scrolls on its own: heading, fine print, the act (the key, or decision 9's note), the Transfer Trail, Mark 18+…. Otherwise one centered phone-width column, the sticker over it growing up to 1.5×. The thumbnail rail stays at the left edge.
   - Sharpened: "sideways" is the window's shape, not the device's (CSS orientation reads the viewport), so a Stage Manager window splits by its own shape; the HIG: "Determine layout based on size classes, not device type or orientation."
   - Captures: sideways, opening a replay scrolls the sticker off the top (`detail-replay-1180x734`); Give and Send gratitude run nearly edge to edge (`detail-*`, `detail-owed-*`). Media beside its conversation is how Instagram's iPad app opens comments.
3. **Kept: the replay plays at a phone's scale,** since decision 2's column gives the card a phone's width; no new scale rule. Today オーバーヒート's caption spans the column-wide stage (`detail-replay-*`).
4. **Kept, clarified: Giving from your board is one card with the sticker at its head,** lifted just above the card's top edge with its peel shadow, the two centered as one group. Packing drops the sticker into the bag inside the same card, which then holds Preparing, In the bag, Not sent yet, Taking it out and sent. Today half the upright screen of scrim parts the sticker from its Give, and Preparing's note runs nearly the screen's width (`give-sheet-*`, `gift-bag-*`).
5. **Kept: the sticker picker on someone else's board is decision 1's card,** tiles at a phone's size, four a row, the scrim dimming the tab row and its lead Give, so one key shows. Today the lead's Give and Give No.0037 are both lit, and the picked tile is a wide aqua slab (`give-picker-picked-1180x734`).
6. **Kept, clarified: Receiving is one centered group:** the header centered over the bag, the bag and pull tab at a phone's size, the tab's travel a phone's. Torn, the Accept card (decision 1's, 400px) rises under the bag's mouth, over its lower half as the phone's sheet does; the group centers, not the card alone. Today the header sits in the corner and Accept at the foot, with a band of empty Liner between (`receive-*`).
7. **Kept, clarified: the Mini-game in a phone-width band, the game growing with its stage.** The header with its X, the HUD and the receipt share one centered phone-width column. The heart, lettering, pop-in words, mini hearts and the touch rules (a first tap's slop, a stroke's least run) scale by the stage's smaller side over a phone stage's, up to 1.5×; shake's thresholds stay, since a shake is the device's own motion. The X and the receipt's label keep phone sizes; the receipt is decision 1's card. Today the amount and the multiplier sit at opposite edges of a full-width HUD (`minigame-combo-1180x734`).
   - Clarified: the smaller side keeps a grown heart inside a sideways stage 734px tall. The rule and ad0ll's call on the heart are the deleted plan's decisions 15.1–15.2 (`git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-explore-and-dialogs.md`).
8. **Kept: Explore's lifted sticker is decision 1's card in the middle,** its carets just outside the sticker's square; the flight lands in the card and Put back flies it home. Today the sheet spans both columns and hides This week and the sticker's ghost spot (`lifted-1180x734`); a card is modal either way.
9. **New: a gift in flight shows in its sticker's detail, on every size, and the board's "On its way" badge goes.**
   - **Where:** the act slot, where Give sits: the phone's column, the iPad's column, the right pane sideways. Not a Transfer Trail row; the trail gains its row when the gift is received.
   - **States,** from the board's sticker data (its open gift, and who it's for):
     - Sent, waiting for someone (picked in the app, or whoever first opened its link): the closed bag's frosted sleeve and "On its way to @bob".
     - Sent through LINE's picker, no one yet: the sleeve and "On its way".
     - Packed, not sent (LINE's picker closed without sending, or LINE didn't say): the open bag's sleeve and "In the bag", with Give still the key; Giving takes the sticker out of this bag before packing a new one, as it does today. "In the bag" stays true whether or not a message LINE didn't answer for went out.
     - Each says its state only: no expiry date, no "whoever opens it first", no tip.
   - **Take it out:** a quiet link under the note in all three states, with Giving's words and icon (arrow-u-up-left). No confirm, as in Giving: the sticker comes back and can be given again. While it runs it reads "Taking it out…" and takes no second press, and leaving the detail doesn't stop it. A failure is an error line under the note with Try again, kept on that sticker's detail until retried or dismissed, as a Gratitude refusal is. When it lands, the note goes, Give returns as the key with focus on it, the sticker is back where it was (its board spot or its tray spot), and screen readers hear it.
   - **The board:** the header keeps only gifts for you; on an iPad its one row is the name, then that badge. A sticker on its way stays off the board, as now.
   - **The tray's spot:** today bare paper; now the sticker under the sleeve's frost, inside its own cut line, so the packing never moves. It never peels; a tap opens its detail among your stickers, named like "No.0147, on its way to @bob. Open it". Once received it becomes the given sticker's dashed cut line; taken out, or back after its week, a hole or the sticker again.
   - **Reduced motion:** the frost and note go in one frame.
   - **Goes (hard deprecation):** `PendingGiftsNotificationBadge`, its CSS, the `giving.pendingGifts` strings, the board's pending gifts query, and `GET /api/gifts/pending` if nothing else reads it. The server already takes a sent gift back (`apps/api/src/gifts/takeOut.ts`: "from the bag or after sending"), and its receiver then sees "@alice took this one back".
   - **Docs when built:** DESIGN.md's Gifts on the board and On its way; PRODUCT.md's "Until it's sent, you can take the sticker back out" becomes "until it's received"; the board plan's two-badge header step and its pass line; the board feedback backlog's item 1 goes.

## Constraints

- WebKit decides. Japanese runs longer: the note and Take it out wrap within the column, never truncate.
- One key per screen: decision 9's sent states have none; packed keeps Give.
- New words: only the tray spot's names and the spoken take-out line; the rest reuse the detail's and Giving's.

## Open questions for ad0ll

1. Take it out on a sent gift with no confirm, as in Giving? The friend's Gift Message then says you took it back. Mark 18+'s in-place confirm is the alternative.
2. Decision 1's swipe-down also fits the shop-and-cards plan's gratitude events card, which hides its tear strip with no swipe. Align it there?
3. Minimal copy, past this brief's layout scope: the give sheet's lines around Send in a LINE chat ("Pick your chat with them. The first to open it gets it.", "It comes off your board and into a gift bag.") and the picker's "Pick one of yours, then send it to @… in a LINE chat." are sublines and glosses. Cut them, on every size?

## Sources

- Apple HIG, Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple HIG, Popovers: https://developer.apple.com/design/human-interface-guidelines/popovers
- Apple HIG, Modality: https://developer.apple.com/design/human-interface-guidelines/modality
- Apple HIG, Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple HIG, Split views: https://developer.apple.com/design/human-interface-guidelines/split-views
- Instagram for iPad, comments beside the media: https://www.idownloadblog.com/2025/09/03/instagram-app-for-ipad/ and https://techcrunch.com/2025/09/03/instagram-is-finally-launching-an-ipad-app/
