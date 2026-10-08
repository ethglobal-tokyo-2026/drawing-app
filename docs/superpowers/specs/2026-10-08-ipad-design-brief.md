# Croquis on iPad, and the small fixes before it: design brief

**Status:** shaped 2026-10-08 from ad0ll's reviews of the draft on `spike/ipad-board`; waiting on ad0ll's confirmation. Replaces `2026-10-07-ipad-layout-design.md`. The draft branch is the reference implementation; it's never merged, and each plan builds from main.

## Phase 0: small fixes, every size, before the iPad work

Changes ad0ll asked for that apply to phones too. One plan, landing on main first.

- **Settings:** Language is one row showing its choice, the select laid unseen over the row; Show 18+ stickers is one switch row, with no heading and no fine print.
- **Receipt:** "Gratitude received" and the total only. On your own stat board a link under it, "See where it came from", opens your gratitude events (newest first: the sticker, who sent it, the day, Residual on Original Artist shares, the amount), through a new `GET /api/gratitude/events`. Someone else's receipt shows only the total.
- **Bests:** "Best day" (1日の最多感謝), its figure led by the gratitude heart; every best fits one line.
- **Sui address:** someone else's stat board shows theirs, through `GET /api/sticker-boards/:userId/sui-address` (the server keeps a wallet it looks up). The paper drops "Sui Testnet" and says "Holds your stickers".
- **Flip back:** at the stat board's top left, where the name that turns the board over sits, on phones too.
- **Shop:** reserve tickets lead with their name, then their one line; "You have ×N" sits over the Buy key; no price line; no line under each shelf's name; one "Coming soon" over the shelves.
- **Sticker board:** the first-selection hint goes; the gift chip says "Gifts for you" beside its count badge, without "and 1 more"; the zipper clears the gift badges and runs to the foot, opening only as far as its sheets.
- **Sealed card:** no handle in its fine print.
- **One gratitude mark:** GratitudeIcon in plain Bonbon Pink before every amount (Explore's Most gratitude figures included); the ink-lined heart only on the stat board's printed papers; the disc only in the open trail row.
- **One text field:** DESIGN.md's `text-field` component, one shared class for Explore's search and the handle prompt.
- **Words:** "stat board", never "cork back", in AGENTS.MD and every doc; Direct and Residual's vocabulary as built.

**Open, not in Phase 0 until decided:** the My board icon's replacement; the My board tab's pink beside the gifts badge's pink; whether Settings keeps "Same as LINE"; gifts on their way shown in the sticker detail instead of the board's badge (needs a design).

## The iPad layout

**Who and when.** Artists on an iPad, by finger or Apple Pencil, in LINE or Safari. A touch screen at least 600×600 gets the large layout; anything smaller, Split View and LINE's short sheet included, keeps the phone's; a desktop browser keeps the phone frame. WebKit is the engine that counts.

**Direction.** The same Sticker Trade Book world, composed for the room rather than stretched; phones unchanged. Controls keep phone sizes.

### Board, tray and stat board

- Stickers keep their phone size; the extra room is board.
- **A separate large layout per board,** stored beside the phone's: derived from the phone's the first time it's shown, then edited on its own. A new sticker lands on both. Visitors see the layout for their own size class.
- The board follows the screen when it turns.
- Draw (or Give, on someone else's board) stands at the tab row's left end; the tabs at its right, in the quieter style: tabs you're not on lose their outline.
- One header row: the name, then the gift badges. On someone else's board the lit Explore tab shows a caret and leads back.
- The tray's zipper runs the board's height; its sheets grow up to 1.5× to fill the pouch.
- Stat board: the phone's order (receipt over Bests over the SINCE tape, the leaf over the stamps, the address paper), one centered cluster; your own puts Settings under it. Flip back at the top left. Gratitude events open as a centered card.

### Shop and cards

- Landscape: reserve tickets as a banner across the top (fan, name and line, then the count and Buy past an upright perforation), the three shelves side by side under it, with no scrolling. Portrait: one centered column, every swatch whole.
- The checkout, the ticket cards and the Sealed card rise to the middle at 400px.

### Explore

- Landscape: the search across the top; the pile in the left column, This week in the right; results take the pile's column while This week stays. Each column scrolls on its own; reading order follows the screen.
- This week shows all three leaderboards at once: three columns in portrait, stacked in landscape's column. Phones keep the tabs.
- The pile keeps stickers about phone size and shows more of them.

### Drawing screen

- **One sheet for every device:** 374 units across its short side, the long side following the screen's shape at the first mark (1 to 2.2×), shown scaled to fit; strokes, brush sizes and the die-cut border in sheet units. Turning mid-drawing keeps the sheet's shape, as Procreate's canvas does; a blank sheet follows the screen.
- A slim top bar (timer, My board key, tools) and a slim sidebar (the size rail, undo and redo, the seal check with its armed chip and 18+ box opening toward the sheet); the sheet takes the rest. My board leaves in one tap; the drawing is kept and Draw resumes it.
- Colors open as a popover under the tool strip.
- **Drawing hand:** Right or Left in Settings, kept on the device, Right by default. Left mirrors the drawing screen on phones and iPads.

### Apple Pencil (only on a device that has drawn with one)

- **Input:** Pencil only or Pencil and finger, with the default in Settings' Drawing group and a quick switch on the drawing screen. Two- and three-finger taps undo and redo either way.
- **Pen pressure:** Off, Light, Normal or Firm in Settings, with a strip to try it.
- **Hover preview:** a ring where the nib will land, at the stroke's width.
- **Prediction:** a short guess ahead of the nib, redrawn each frame and never kept. It's the opposite of Smoothing, which trails the line to steady it.
- Palm rejection and pressure fixes: a resting palm never draws or counts toward undo; heavy starts and flat-pressure pens draw as intended.

### Small windows

Below 600×600 the phone layout, with a short-height pass so the size rail and color sheet fit LINE's sheet.

## Plans

Phase 0 lands first; then foundations, before the screens, which can run in parallel; the Pencil after the drawing screen; small windows and the finish last.

| Plan                                      | Covers                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `2026-10-08-small-fixes.md`               | Phase 0                                                                                                                         |
| `2026-10-08-ipad-foundations.md`          | the large-screen query and touch gate, the desktop frame, the tab row's lead slot and quieter style, the Explore tab's way back |
| `2026-10-08-ipad-board-and-stat-board.md` | the board's unit and separate large layout, header, tray, stat board                                                            |
| `2026-10-08-ipad-shop-and-cards.md`       | Shop, checkout, ticket cards, Sealed card, gratitude events card                                                                |
| `2026-10-08-ipad-explore.md`              | the split view, search, three leaderboards                                                                                      |
| `2026-10-08-ipad-drawing.md`              | one sheet for every device, the drawing screen's layout, My board key, drawing hand                                             |
| `2026-10-08-ipad-pencil.md`               | input mode, pen pressure, hover, prediction, palm fixes                                                                         |
| `2026-10-08-ipad-small-windows.md`        | Split View, LINE's sheet, short heights, the finish                                                                             |
