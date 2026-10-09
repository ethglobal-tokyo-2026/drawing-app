---
name: Croquis (クロッキー)
description: A LINE drawing app where every three-minute drawing is sealed into a die-cut sticker you keep or give.
colors:
  liner: "#F2F1F6"
  liner-deep: "#E5E3EC"
  liner-lift: "#F8F7FB"
  ink: "#1C1824"
  graphite: "#6E6878"
  graphite-on-deep: "#635D6D"
  canvas: "#FFFFFF"
  seal-yellow: "#FFD93B"
  soda-aqua: "#38D3DC"
  bonbon-pink: "#FF4F9A"
  grape: "#9B7BFF"
  tomato: "#FF5A36"
  seal-deep: "#D9A300"
  aqua-deep: "#1C9EA8"
  pink-deep: "#CC2A72"
  grape-deep: "#6D4FD6"
  tomato-deep: "#C63C1E"
  blue: "#298DFF"
  blue-deep: "#1B65CC"
  tangerine: "#FF9B3D"
  tangerine-deep: "#CC6A12"
  label-lip: "#D3D0DC"
  tray-canvas: "#F9B3D1"
  tray-tape: "#FFA6CD"
  tray-lining: "#FBE3EE"
  foil-pink: "#FF6FAE"
  foil-peach: "#FFA85E"
  foil-lemon: "#FFD84A"
  foil-aqua: "#5ED3D8"
  foil-sky: "#6FA8FF"
  foil-lilac: "#A98BFF"
  cork: "#CFA476"
  non-repro-blue: "#8CC8E8"
typography:
  display:
    fontFamily: "Dela Gothic One, Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  display-lg:
    fontFamily: "Dela Gothic One, Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  display-sm:
    fontFamily: "Dela Gothic One, Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  figure:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 112"
  title-sm:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.42
    fontVariation: "'wdth' 100"
  note:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.004em"
    fontVariation: "'wdth' 100"
  label-sm:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.004em"
    fontVariation: "'wdth' 100"
  fine:
    fontFamily: "Croquis Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.07em"
    fontVariation: "'wdth' 87.5"
  jp-caption:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, Hiragino Kaku Gothic ProN, Croquis Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  paper: "4px"
  label: "6px"
  button: "8px"
  pocket: "10px"
  key-sm: "14px"
  key: "16px"
  sheet: "16px"
  key-lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  gutter: "12px"
  md: "16px"
  lg: "20px"
components:
  key:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.key}"
    padding: "0 30px"
    height: "66px"
  key-lg:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.key-lg}"
    padding: "0 34px"
    height: "74px"
  key-sm:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.key-sm}"
    padding: "0 20px 0 18px"
    height: "54px"
  key-round:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "58px"
  key-disabled:
    backgroundColor: "{colors.liner-deep}"
    textColor: "{colors.graphite-on-deep}"
    rounded: "{rounded.key}"
  button-label:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "47px"
  button-label-seal:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "47px"
  button-label-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.liner}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "47px"
  button-label-small:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 12px"
    height: "35px"
  button-quiet:
    textColor: "{colors.graphite}"
    padding: "0 2px"
    height: "32px"
  dot-badge:
    backgroundColor: "{colors.seal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "26px"
  index-tab:
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.label}"
    padding: "0 6px"
    height: "46px"
  index-tab-current:
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "0 6px"
    height: "46px"
  tray-folder-tab:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    width: "46px"
    height: "24px"
  gift-pull-tab:
    backgroundColor: "{colors.soda-aqua}"
    textColor: "{colors.ink}"
    typography: "{typography.fine}"
  artist-chip:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px 0 4px"
    height: "40px"
  paused-tag:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.fine}"
    padding: "3px 6px 3px 5px"
  sheet-stack-button:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 9px 0 7px"
    height: "22px"
  sheet-x:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "30px"
  selection-handle:
    backgroundColor: "{colors.liner-lift}"
    rounded: "{rounded.label}"
    size: "20px"
  sheet:
    backgroundColor: "{colors.liner}"
    rounded: "{rounded.sheet}"
    padding: "0 20px 24px"
  cork-note:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    padding: "14px 14px 24px"
  label-tape:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.liner}"
    padding: "0 12px 0 11px"
    height: "26px"
  text-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "0 12px"
    height: "48px"
  trail-row-open:
    backgroundColor: "{colors.liner-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pocket}"
    padding: "0 12px 11px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.liner}"
    rounded: "{rounded.label}"
    padding: "11px 16px 12px"
---

# Design System: Croquis (クロッキー)

## Overview

**Creative North Star: "The Sticker Trade Book"**

The app is a シール帳, a sticker trade book. The ground is release-liner backing paper, controls are printed label stock, and the one thing each screen wants pressed is a cartoon keycap: a flat coded face with an ink outline, like the drawings, sitting on a thick lip it sinks into. A finished drawing gets sealed: its own strokes become a die-cut outline, a white border and a kiss-cut groove. Then it peels off the page and sticks to a free-form sticker board, and your whole collection lives as a stack of loose sheets in a zipped canvas tray down the board's right edge. The board's back is its stat board, a corkboard, and your figures are paper pinned to it. Everything that moves lives in the same physical world. Keys press and pop, labels sink 2px, stickers peel and stick, zippers run tooth by tooth, a gift bag's tear tape rips out, and sheets have a perforation row you tear along.

The surface is calm and orderly. Calm screens are almost all Liner and Ink, and color comes in flat coded fields where each hue has one meaning. The world only goes wild when you push it. Gratitude is one experience for everyone: the figures always show, and only people who keep mashing the heart reach the upper tiers, where it blushes, sweats hearts and finally whites out. Nothing is hidden behind a second place: tap a person's picture or name on their board and the whole board turns over to its stat board, where their figures are pinned up as a receipt, a calendar leaf, stamps, a notebook scrap and label tape.

The world refuses two category defaults. One is Procreate-grey tool chrome with a pixiv-style feed. The other is the sticker boom's gacha, rarity and "rate" market: foil marks who drew a sticker, never how rare it is, and gratitude is never described in money words.

**Key Characteristics:**

- Backing-paper ground (Liner), ink text, and flat coded color fields that always carry ink text.
- One cartoon keycap per screen for its primary act; everything else is thinner label stock, quiet links or flat tools.
- One tactile press for every key and label: press, hold, slide-off lift, release pop, with the action firing 60ms into the pop.
- No gloss on any control. Stickers keep their baked resin and live light; buttons never do.
- Stickers are die-cut from the artist's own strokes; the collection lives as loose sheets in a pink canvas tray with a real zipper.
- A sticker drawn by someone other than the board's owner wears a moving foil band and names its artist.
- The board turns over: its back is cork, with the figures pinned on as paper.
- Physical motion grammar on transform and opacity only.
- Mocked LINE and iOS screens copy those platforms exactly and never borrow the world's materials.
- Icons come from Phosphor through one registry (`apps/frontend/src/icons`). They're never drawn by hand.

## Colors

The palette is Liner and Ink, plus five candy-bright coded fields, each with one meaning and always carrying ink text. Each coded hue has one curated deep partner, used only as the lip under a key or label.

### Primary

- **Seal Yellow** (seal-yellow): "Now". The default key (Keep drawing, the seal check, Draw on your board), daily tickets, the draw screen's timer dot, the made stamp on the stat board, NEW dots, and text selection. It's the most common field in the app.

### Secondary

- **Soda Aqua** (soda-aqua): giving. The Give key (including where Draw sits on someone else's board), the Explore tab, the gift bag's tear tape and its pull tab, and viewer hints mixed toward Liner.
- **Bonbon Pink** (bonbon-pink): gratitude, and you. The Send gratitude key, the heart and its mini hearts, the My board tab, the tray's zip pull and its Mine folder tab, the open trail row's outline, the selected leaderboard tab (but Streak's, which is tangerine), the heart before each Most gratitude figure, and on the stat board the receipt's pushpin and heart, and the hit counter's speed lines. Gratitude has one mark wherever it shows, Phosphor's filled heart (GratitudeIcon): plain Bonbon Pink before every amount, with the drawings' ink line only on the stat board's printed papers, and on a pink disc only in the open trail row.

### Tertiary

- **Grape** (grape): received. The Accept key on a gift, the tray's Gifts folder tab, received-sticker marks, and the received stamp on the stat board.
- **Blue** (blue): the Shop and reserve tickets. The Shop tab, the Pay key and picked pack, reserve tickets, and the Use a reserve ticket key. Opposite daily tickets' yellow, so the two kinds of ticket can't be confused.
- **Tangerine** (tangerine): the streak. The streak leaf's band on the stat board, with the Fire icon, and the streak's figures elsewhere: Streak's selected leaderboard tab, and the fire before each of its figures, whose numerals stay Ink.
- **Tomato** (tomato): can't undo. Stopped states and warnings. It's never a key.
- **Foil** (foil-pink, foil-peach, foil-lemon, foil-aqua, foil-sky, foil-lilac): six iridescent bands, one 96px period, that flow along a sticker's foil band and turn in the ring round the artist chip's picture. It isn't a fill color. It's a material worn only by a sticker drawn by someone other than the board's owner, with the two exceptions in the Other Hand Rule. It has no green.

### Lips (deep partners)

- **Seal Deep, Aqua Deep, Pink Deep, Grape Deep, Tomato Deep, Blue Deep, Tangerine Deep** (seal-deep, aqua-deep, pink-deep, grape-deep, tomato-deep, blue-deep, tangerine-deep): the front wall under a coded key or label. They never appear as fields or text.
- **Label Lip** (label-lip): the 3px paper edge under plain Liner Lift label stock.

### The tray

- **Tray Canvas** (tray-canvas): the pink canvas edge down the board's right side where the zipper is sewn on.
- **Tray Tape** (tray-tape): the zipper tape, lighter than Bonbon Pink so the pull stays the one strong pink.
- **Tray Lining** (tray-lining): the soft pink canvas you see into when it's open.
- **Tray Mat** (tray-mat): the pink mat the spread deals its sheets onto.

### The stat board

- **Cork** (cork): the back of the sticker board, warm with granules and darker where the frame meets it. Paper, pins, tape and stamps sit on it; nothing is printed on it directly.

### Manga paper

- **Non-repro Blue** (non-repro-blue): manga manuscript paper's blue, the color that doesn't print. A print material, like Cork, not a coded hue: only the corner print of a sheet in Kyoto Seika Manga Expression Practice Mode uses it.
- **Smoke grey:** the deal's smoke keeps a color of its own, as manga draws it: #9A96A3, for the wisps from a die rolled too often and its cloud. No token matches it; it belongs to the smoke alone and never takes a meaning.

### Neutral

- **Liner** (liner): the backing-paper ground of every in-world screen and sheet.
- **Liner Deep** (liner-deep): a sunk (disabled) key or label, a pressed inactive tab, and the leaderboard tab track.
- **Liner Lift** (liner-lift): a label lifted off the liner: label-stock faces, the paper on the stat board, the artist chip, the open trail row, the tray's loose sheets, and selected chips.
- **Ink** (ink): all text on every field, the key's outline, the toast, the table under the board while it turns over, the label-maker tape on the stat board, the current drawing tool, and the ink button.
- **Graphite** (graphite): secondary text, fine print, placeholders and quiet links. It reads 4.8:1 on Liner and 5.0:1 on Liner Lift, but only 4.2:1 on Liner Deep, so fine text on Liner Deep, or on anything as dark, takes the darker `--graphite-on-deep` (#635D6D, 5.0:1 on Liner Deep). No other graphite is picked by hand. Ink-alpha steps carry hairlines: a kiss-cut rule at 14% and a stronger rule at 26%. Ink at 62% is the soft-text color.
- **Canvas** (canvas): drawing surfaces, and white label stock. That's the drawing sheet, a sticker's white border, and the draw screen's two stuck-on labels (the PAUSED tag and the paused hint), which are white so they read as labels over any drawing.

Soft fields (inactive tabs, quiet chips, hints) mix a coded hue into Liner, at 30–42% depending on the hue. They keep the hue's meaning at rest volume.

### Named Rules

**The Ink-On-Color Rule.** Every flat coded field carries Ink text, never white. White on pink reads at 3.1:1; Ink reads at 5.7:1.

**The One Meaning Rule.** Each hue means one thing: yellow is now, aqua is giving, pink is gratitude and you, grape is received, blue is the Shop and reserve tickets, tangerine is the streak, and tomato is can't-undo. Don't pick a hue for looks.

**The Other Hand Rule.** Foil appears only on a sticker drawn by someone other than the board's owner (on your tray's sheets, someone other than you). Your own stickers keep the plain white die-cut edge; the pearl rim is retired. Surfaces that aren't a board (Explore's sticker pile, the leaderboard) show no foil. It's never a rarity grade. Two foils are the exceptions: they mark how a sticker was made, not whose hands it's in, so they show whoever drew it, your own stickers included. Pink foil marks an NSFW sticker, and the Kyoto Seika Practice Mode foil a sticker drawn in Kyoto Seika Manga Expression Practice Mode; pink wins on a sticker that's both.

**The Platform Green Rule.** The world has no green. LINE's green appears only inside LINE's own mocked UI (the chat, the Gift Message, the consent and share screens, and the app badge).

## Typography

**Display Font:** Dela Gothic One (with Mona Sans fallback)
**Body Font:** Mona Sans, a variable font with a width axis (with Zen Kaku Gothic New for Japanese, then system-ui). The app serves its own build of it, Croquis Sans (see the Plain Zero Rule), under a name of its own because the license reserves "Mona".
**Japanese:** Zen Kaku Gothic New (with Hiragino Sans fallback). The page asks for it only while the app is in Japanese, since its stylesheet alone is 242 `@font-face` rules; in English the odd Japanese glyph (the なまえ cap, the 袋文字 tier captions) sets in the phone's own Hiragino Sans. Japanese headlines set with `palt`, and short centered lines break only between phrases, at `<wbr/>` marks in their strings.
**Platform chrome:** the native system stack (-apple-system, SF Pro Text, Hiragino Sans), used only inside mocked LINE and iOS UI.

**Character:** Mona Sans is the label stock, a precise and slightly technical sans that changes width with the job. Dela Gothic One is the puffy voice, heavy and rounded, and it belongs on the key and on the moments gratitude shouts.

### Hierarchy

- **Display** (400, 20px; 23px on the large key, 17px on the compact key; line-height 1): the key's label. It also sets dot badges (11–19px: the tray's NEW at the 11px floor, the draw screen's timer dot and Explore's day badges at 13px), the gratitude multiplier (×8.0, 27px), the giver's gratitude tag, the outlined 袋文字 tier captions (46px, pink inside white inside ink), and the deal's 書き文字 hand lettering: a die's outlined lines at 22px and countdown at 46px, and in plain Ink the reroll's 振り直し / Reroll at 15px and a roll's コロッ at 13px.
- **Figure** (900, 26px on the stat board's stamps up to two characters, stepping down from three and never under 11px, 27px in the open trail row and its replay stage, 40px for the stat board receipt's total, 52px for the Mini-game receipt's total and 58px on the streak leaf; line-height about 0.95, width 125, proportional figures): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the stat board, and the hit counter (23px on the leaderboard, 20px in the stat board's Bests).
- **Headline** (800, 26px, line-height 1.08, width 112, balanced wrap): screen and dialog titles such as "Sealed" and "Out of tickets for today", the sticker detail's heading and the name printed on a gift's tag.
- **Title** (800, 18–22px, line-height 1.1, width 112): sheet titles, the board header's name, and the notebook scrap and Settings headings on the stat board (18px).
- **Body** (400–500, 15px, line-height 1.42–1.5, width 100): running text. Notes cap at 28–44ch. Supporting notes drop to 13px. Text never sits between the steps (12, 12.5, 13.5, 14 or 16px), except the toast's 14px and the 16px text fields (Explore's search and the handle prompt), which keep iOS from zooming.
- **Label** (700, 15px, or 13px on small buttons, the selected sticker's toolbar and the draw screen's white labels, width 100): buttons, tabs and chips, in sentence case at one weight.
- **Fine** (650, 11px, uppercase, +0.07em, width 87.5, proportional figures): metadata lines such as "No.0147 · 4m 52s · 2026.09.23 · @alice", sheet date ranges in the tray, captions and hints. Two things keep their own case inside its capitals: a @handle or LINE name (the `.handle` class), and a drawing time, whose units stay lowercase ("4m 52s") because "4M" reads as millions.
- **JP caption** (700, 11px, +0.14em): the なまえ cap on the name label.

### Named Rules

**The 11px Floor Rule.** Nothing inside a 390px phone renders under 11px. Fine print, caps metadata and hints stop at the floor.

**The Width Axis Rule.** Width carries the role: UI at 100, titles at 112, fine print at 87.5, figures at 125. Take width from the shared tokens. The earlier 75 read too small at 11px on a phone. A few places keep 75 on purpose, either because the space is too tight or because the look calls for it:

- the zip pocket's "From …" line, which has to fit two names in one chip
- the gift bag's tear tape ("CLOSED 9.23") and the PULL on its tab
- the rubber date stamp on the gift tag

Nothing else is set at 75.

**The Puffy Voice Rule.** Dela Gothic One appears only on keys, dot badges (the draw screen's timer dot is one), the gratitude multiplier and tag, outlined 袋文字 captions, and the deal's 書き文字 lettering. It's never used for headings, body text or plain figures.

**The Plain Zero Rule.** Every zero is plain. Mona Sans draws its tabular zero slashed, with no feature that turns it back, so Croquis Sans drops the slash: its tabular zero is the plain zero at tabular width, on every width and weight (`pnpm --filter frontend croquis-sans` builds it). Figures are proportional, except a number that changes while you watch, which sets `tabular-nums` so its digits keep their places: the combo's amount, clock and hit counter, the multiplier, the brush size label, the refill countdown and the developer slip's performance summary. The timer dot sets its numerals in fixed cells.

**The Hits Rule.** A combo's length is counted in hits, the way fighting games count it, never in taps. It never wears ×, which belongs to the multiplier. It always shows as the hit counter.

## Layout

Croquis lays out by the window, never the device (`ui/largeScreen.ts`). A touch screen at least 600 × 600, such as an iPad's browser either way up, is a large screen: the same Sticker Trade Book composed for the room rather than stretched, where controls keep their phone sizes and the room goes to the board, the pile and the drawing sheet. Anything smaller keeps the phone layout: Split View, Slide Over, a short Stage Manager window and LINE's sheet on an iPad. There, in a window wider than a phone, stickers stay the widest phone's size. A computer with a mouse and no touch screen shows the phone layout in a phone frame. The layout follows the window as it turns or resizes, and each component's section says how it's composed on a large screen.

The phone layout is designed on a 390 × 844 iPhone viewport. From top to bottom there's a 47px status bar, LINE's 56px LIFF header, the screen, and the index-tab strip (Liner, under a 14% hairline): the 46px tabs with their padding, over the home-indicator safe area. Its height comes from the strip tokens (`--tab-h`, `--tabs-pad-top`, `--tabs-pad-foot`, `--tabs-strip`), and the toast sits 16px above it. Full-screen LINE chrome hides the LIFF header and the tabs, and a bare LIFF screen hides only the tabs. The drawing screen has no strip, so the sheet gets the room: it runs down to the home indicator's safe area, and its My board tile (see Draw screen) is the way back to the board.

The sign-in gates center on the paper, scroll when what they hold is taller than the window, and keep the focused field above the on-screen keyboard (`ui/visibleArea.ts`).

The spacing rhythm steps in 4px units, and 12px is the house gutter. Tabs sit on a 12px inset with an 8px gap, and sheets pad 18–20px on the sides and 24px at the foot, over the home indicator's safe area where a sheet reaches the screen's foot. Controls anchor to the thumb zone. The key sits low, usually bottom right or centered at a sheet's foot, with any secondary label or quiet link directly beneath it.

The sticker board is free-form, not a grid. Stickers sit wherever they were dropped, at their own size and slight rotation. The board's header is your avatar and name at the top left; the compact Draw key floats at the lower left; the sticker tray runs down the right edge from under the header and its gifts badge (y 72) to the foot, and opens across half the screen, only as far as its sheets. Someone else's board keeps the same layout with the tray gone, so the field runs to the right inset; Give takes Draw's slot, and a small Explore back chip sits beside the name. The stat board is a two-column grid (206px and the rest, 16 × 12px gaps) under Flip back, which sits at its top left, where the name that turns the board over sits. No surface shows grid paper: paper is hinted by the liner stock and the faint diagonal "SEAL · シール" maker print, never a full grid.

On a large screen the board keeps a layout of its own, the large layout, beside the phone's. Stickers keep their phone size, a share of the phone board's 390px width, and the extra room is board, as in a phone-layout window wider than a phone, such as LINE's sheet on an iPad, where they keep the widest phone's size. The first time a large screen shows your board, its large layout starts as your phone's arrangement, centered on the board and fitted to a side too short for it. From then on each layout is arranged on its own, down to which stickers are on the board and which are in the tray. A new sticker lands on both, and visitors see the layout for their own screen. Turning the screen keeps each sticker's share of the board and its size. The header is one row, your name and then the gifts badge, clear of the zipper's rail, and the tray starts under it. Draw, or Give on someone else's board, leads the tab strip (see Index tabs).

The phone layout is upright only. A phone on its side (a landscape touch window on a screen whose short side is under a large screen's 600px, `ui/sideways.ts`; an iPad's short Stage Manager window keeps the phone layout instead) shows the upright cover over everything: Liner, Phosphor's device-rotate at 64px and one Headline line, "Turn your phone upright" (スマホを縦にしてください), centered, with the app inert under it. Turning the phone back takes it away.

The gallery around the phones (a sticky flow index, a 260px story column beside rows of scaled phone frames, and a viewer with a 300px strip) collapses to one column at 1100px and stacks the viewer at 760px. Each phone's caption is a plain annotation: the element, where it is in parentheses, and what was just done to it and what that shows, with a quiet step number the gallery adds. It belongs to the design review, not the app.

## Elevation & Depth

Depth is physical, and it comes from a single light at the top left. Every cast shadow falls down and to the right, uses neutral Ink alpha and is layered in two parts, a tight contact and a soft throw. Controls get their depth from thickness, not shading: a key sits on a 6px lip and a label on 3px of paper, and the base casts the shadow, so pressing never darkens the lip. Stickers get their edge from a 0.5px kiss-cut groove drawn as a drop-shadow on the alpha, so the silhouette casts the shadow rather than a box. On a foil sticker the band is the edge: the kiss-cut and the cast fall from the band's outer edge, and nothing lies between the white edge and the foil.

Stickers and the gratitude heart also respond to the app's one moving light. The shared light variables run from -1 to 1. They follow the phone's tilt where the browser allows it, read from gravity's direction so they never jump as the phone passes upright, easing into the edges and gliding to each new tilt; a mouse or pen moves them too, but never a finger, which is busy dragging and turning stickers. They idle-sway on an 11s loop so stills look alive. Buttons don't follow the light; they have no highlight to move.

### Shadow Vocabulary

- **Key base** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 2px 6px 12px -3px rgba(28,24,36,.24)`): under every key, cast by the still base.
- **Label base** (`box-shadow: 0 1px 0 rgba(28,24,36,.06), 1px 3px 5px -2px rgba(28,24,36,.16)`): under label stock.
- **Label** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 1px 2px 3px rgba(28,24,36,.08)`): a flat label resting on the liner, such as the tool strip or a chip.
- **Lift** (`box-shadow: 1px 3px 4px rgba(28,24,36,.12), 3px 10px 22px rgba(28,24,36,.14)`): something held above the page, like a toast, the Smoothing bar or the color popover.
- **Sheet** (`box-shadow: 0 -1px 0 rgba(28,24,36,.06), 2px -8px 28px rgba(28,24,36,.12)`): a bottom sheet rising over the page. Every bottom sheet is a modal dialog: what it covers goes inert, focus stays inside, and Escape, Back and its perforation close it, unless its act is on its way or, as at time's up, there's nothing to go back to. On an iPad every sheet the detail, Giving, Receiving, the Mini-game and Explore open is a 400px card in the middle over a scrim that dims the tab row; the scrim, its X, Escape, Back and a swipe down its head close it, and its X, which Sheet draws in its top corner, takes the perforation's place. One card at a time: a flow's next step replaces its content.
- **Kiss-cut** (`filter: drop-shadow(0 0 .5px rgba(28,24,36,.55))`): the die-cut groove around every sticker, round the foil band's outer edge on a foil sticker.
- **Sticker cast** (`filter: drop-shadow(1px 2px 1.5px rgba(28,24,36,.16)) drop-shadow(2px 6px 8px rgba(28,24,36,.10))`): a sticker shown off a board, such as on a sheet, a card or its detail. It's always paired with the kiss-cut. A foil sticker casts it, and every lifted shadow, from a still copy of its band's shape.
- **Board cast** (`filter: drop-shadow(.5px 1px 1px rgba(28,24,36,.20)) drop-shadow(1px 2.5px 3px rgba(28,24,36,.08))`): a sticker stuck to a board, close to it, yours or someone else's: a contact line and a short, faint throw, enough to show which sticker lies on top. It's paired with the kiss-cut and cast from a still copy of the silhouette, or the foil band; the cast baked into the image doesn't show there. A sticker in your hand casts a lifted shadow instead.
- **Peeling** (`filter: drop-shadow(3px 7px 5px rgba(28,24,36,.18)) drop-shadow(8px 16px 18px rgba(28,24,36,.12))`): a sticker lifting off, tilted in 3D by 11°.
- **Floating sheet** (`box-shadow: 0 0 0 .5px rgba(28,24,36,.18), 3px 7px 8px rgba(28,24,36,.16), 8px 18px 30px rgba(28,24,36,.18)`): a sheet pulled out of the tray, hovering over the board.
- **Pinned note** (`filter: drop-shadow(0 1px 0 rgba(28,24,36,.12)) drop-shadow(2px 5px 5px rgba(58,36,16,.26))`): paper hanging on the stat board, from its pin or tape.

### Named Rules

**The One Light Rule.** There's one light for the whole app. Static shadows fall down and to the right from the top-left light, and every moving highlight (the sticker specular and sheen, the foil's glint, the Kyoto Seika Practice Mode foil's scraped highlights, the heart's gloss) reads the shared light variables. Don't add a second light source; the Shop's previews are the one exception, lit by the Shop's own looping light since their swatches are too small to tilt. The foil's glint sits where the light falls, the same way on every sticker whatever its turn, and holds where the last tilt left it; before any tilt it rests top-left. Only the foil's bands run on their own clock, flowing on a 7s loop staggered per sticker, under a grating that never moves. They hold still under reduced motion.

**The Neutral Shadow Rule.** Shadows are Ink alpha, never tinted. The one exception is the stat board: paper, stamps and pins cast a cork-brown throw (rgba(58,36,16,…)) over an Ink contact line, because a shadow on cork is darker cork. The one colored light is kept for a sticker's gratitude glow (see Designed, not built yet): faint pink (#FF7EB6) warming toward amber (#FFB13B); those two hues belong to the glow alone.

**The No Gloss Rule.** Controls have no gloss, highlight line or sheen: keys, labels, tabs, the zipper and the gift's tear tape are lit flat, with an edge and a contact shadow at most.

## Shapes

Corners come from paper and cut stock, and every control's corner is a step of the `rounded` scale. Label stock uses an 8px radius, as do the sticker detail's thumbnails and the board's name button, and toasts, fields and index tabs 6px. The draw screen's small parts take 6px too: the tool tiles (like the strip they sit in), the size rail's thumb and number, and the PAUSED tag. Slider tracks, the brightness bar and the combo's speed lines are pills. The tray's folder tabs round only their top corners, where they stand up from the stack. Keys are 16px (18px large, 14px compact), which reads as a key, not a pill or a tile; the seal check is a round 58px key, and the ring that pulses round Draw on a first visit stands 5px out, so its corners are 19px. Zip pockets use 10px, the open trail row 12px, bottom sheets 16–18px on their top corners, the Send gratitude sheet and the color popover, floating clear of the edges, 16px all round, and paper a paper-like 4px (`paper`): the drawing sheet, Try it's strip and the tray's loose sheets. Dot badges are pills tilted at -4°, as if one hand stuck them all. The same -4° tilt carries onto photo stickers.

Stickers have no radius. Their outline is the artist's own stroke silhouette, offset by a white border and bounded by a kiss-cut groove. A given sticker leaves the board, and its spot in its tray sheet keeps only a faint dashed outline of its cut, as a used drawing ticket does. A sticker out on the board leaves a kiss-cut hole in its tray sheet, and a used drawing ticket keeps a faint kiss-cut outline of the sticker it became. Sheets begin with a perforation row, a dotted line with a firmer run of holes at the center as the grab. A sheet that can't close, as at time's up, keeps only the plain holes: no grab, and no stop for Tab. Only the tray has a zipper; the gift bag closes with a clear film and an aqua tear tape whose tab sticks out past the bag's edge. Paper on the stat board has torn or cut edges of its own kind: a receipt's zigzag foot, a calendar leaf's and a notebook scrap's torn tops, a stamp's perforated edge, washi with torn ends, and slightly skewed label-maker tape. A selected sticker gets a clear frame with 10px corners, four 20px corner squares, and a round knob on a short stem above the top edge. Its toolbar ends with Arrange, a flat tile that opens two rows of flat step tiles (move; bigger and smaller, turn) that step it like the keys, for anyone who can't drag.

## Components

### The key (signature)

A cartoon keycap: the screen's one primary act.

- **Construction:** a flat face in a coded hue with a 2.5px Ink outline, over a 6px front wall (the lip) in the hue's deep partner with its own ink outline. The layout box includes the lip, so nothing hangs outside it. The face is 60px tall (68 large, 48 compact), padded 30px, with a 20px Phosphor icon and an 8px gap before the label.
- **Round:** the seal check, a 58px round key with Phosphor's check-fat (fill) at 26px. One tap opens the seal sheet (see Draw screen), whose Seal is then the screen's one key; the check steps back while the sheet is up.
- **Compact:** Draw on your own board, a Seal Yellow compact key at the lower left over the stickers, or at the tab strip's left end on a large screen. It carries only its icon and "Draw", or "Continue drawing" (続きをかく) while a drawing waits on the drawing screen; its tickets tuck behind its right end (see The Draw key's tickets). On a new artist's first visit, unless a drawing waits, it hops and a pulse ring surrounds it, held by a wrapper so the key keeps its own lip; the tickets sit in the same wrapper, so they hop along.
- **Disabled:** sunk flush with the page, with no lip and no ink: a Liner Deep face and its label in `--graphite-on-deep`, which reads 5.0:1 there. Enabling springs it up out of the page.
- **Busy:** while its act is on its way to the server, such as spending a ticket, the key keeps its face, lip and ink, and takes no second press. It's marked `aria-busy` and `aria-disabled`, never `disabled`, which would sink it grey as if the act weren't there.
- **Hover and focus:** hover shades the face 6% toward Ink. Focus draws a 2px Ink outline at a 3px offset.
- **Visiting:** on someone else's board, a Soda Aqua compact Give key sits in Draw's slot, and it's that board's one key.
- **Where it goes:** Keep drawing, Buy reserve tickets in the Shop, Pay in the reserve ticket checkout, Use a reserve ticket, Give, Send in LINE, Accept, Send gratitude, the seal check and the seal sheet's Seal, Draw on your board and Give on someone else's. A can't-undo act never gets the key.

### Label stock

Everything that isn't the key: the same construction at a third of the depth, with no ink outline.

- **Shape:** a Liner Lift face with a 1px edge at 30% Ink, an 8px radius, and 44px of face over a 3px lip (32px on the small variant).
- **Coded:** seal, aqua, pink, grape and tomato faces take their deep partner as the lip and a 22% edge. The ink variant has a near-black lip and Liner text.
- **Held:** while held, the face also takes a 10% shade, since 2px of travel is small. The ink variant can't shade toward Ink, so its hover and held face lift 8% toward Liner instead.
- **Quiet link:** text with a 1px underline at a 3px offset, in Graphite, with no stock and no travel. It turns Ink on press. It's the way out under a key.
- **Where it goes:** a secondary action beside or under a key (Back to My board, Give under Send gratitude), and coded actions in toolbars and rows (Give, View, Remove on a selected sticker). Three keys in a row would read as a keyboard.
- **Not buttons:** drawing tools, undo, redo and the drawing screen's My board, and close, back and header icons stay flat tiles. Chips, filters, segments and radio rows are selectable labels whose selection is their feedback. Gestures (hold to tear, the gift's pull tab, the zip, the heart, the tray's sheets) keep their own physics.

### Switch

The one switch, wherever something turns on or off: Settings' Show 18+ stickers, Kyoto Seika Manga Expression Practice Mode and Dark subjects too, and the seal sheet's 18+ (`ui/Switch.tsx`). A 46 × 28px pill at its row's end: off, a Canvas track with a 1.5px Graphite edge and a 16px Graphite thumb; on, filled Ink with a Canvas thumb, which slides across in 160ms on the ease-out while the fill fades in. Its row's words name it and a tap anywhere on the row flips it; the switch itself is 44px tall to touch. Focus draws the house ring round the track, 2px Ink at a 3px offset. Reduced motion: the thumb jumps and the fill changes at once. It isn't label stock, and never presses.

### Text field

One field wherever a person types, Explore's search and the handle prompt: a Canvas face on the label shadow with a 1px strong rule, 6px corners, 48px tall with 12px inside, and 16px text at 500 over a Graphite placeholder, the size below which iOS zooms into a focused field. Typing draws the house focus ring, 2px Ink at a 3px offset. It isn't label stock, and never presses.

### The press

One press for every key and label, and anything marked pressable.

- **Press:** on pointer down, or Space or Enter, the face drops as the lip compresses: 4.5px on a key, 2px on a label, 1px on a pressable tile, in 70ms on the ease-out curve. It bottoms out 0.5px further and settles back in 120ms, then keeps sinking 0.4px over 900ms while held, so it never looks frozen.
- **Slide off:** past the touch target plus 16px it springs back up (380ms on the spring curve, about 0.7px past rest) and the press cancels. Coming back within 10px presses it again.
- **Release inside:** it pops 1.4px past rest on the ease-out curve and springs home, 340ms in all. The action fires 60ms into the pop, so the pop shows before the screen changes.
- **Release outside, a scroll, blur or a hidden page:** it lifts and nothing fires. Escape while held cancels, and only cancels.
- **Mechanics:** only translate animates: the face moves down while the base counter-moves up, so the lip compresses and its outline never thins. Keys take the drag (a drag that starts on a key tracks the finger); labels let a scroll cancel the press, as on iOS.
- **Reduced motion:** half the travel, states change in 1ms, no spring, bottom-out or creep, and the action fires on release.

### Touch targets

Every key is at least 54px tall. A label's face carries invisible bands above and below it (5px on the small label, so 35px to see and 45px to touch), and the press measures its slide-off slop from that touch edge. A quiet link's touch area reaches 7px above and below and 4px to each side. Explore's sliding tabs carry the same bands, reaching across the gap between tabs too: the view switch is 38px to see and the leaderboard tabs 34px, and both are 44px to touch. Sticker handles, tray folder tabs, the sheet stack's +N button, a floating sheet's X, the zip pull, drawing tools, switches, and the selected sticker's Arrange tile and step tiles all pad to 44px.

### Dot badges

Round flat stickers stuck at -4°: a 26px pill in a coded hue with Ink puffy numerals and a light inset gloss. NEW dots mark stickers you haven't seen yet, and a 10px pip marks new items.

### Index tabs

Three tabs cut from label stock, side by side on the Liner strip: My board (pink), Explore (aqua) and Shop (blue). They're equal thirds of the strip, up to 176px each, 46px tall with a 6px radius. A label centers in its third and never widens its tab; the 6px padding keeps the longest, マイボード, inside the edge, and on phones narrower than 390px the icon sits 4px from its label instead of 8px. Draw isn't a tab; the board has its own Draw key. An inactive tab is an outline (a 26% Ink edge) with Graphite text (4.8:1 on Liner); the current tab is stuck on in its full hue with Ink text, lifted 2px with a lift shadow. Each tab presses 1.5px through the shared press. Current is shown by fill and lift only, never by weight or case. The icons are Phosphor's house (My board, for everyone), map-trifold (Explore) and tote-simple (Shop), 20px, bold at rest and fill when current. On a large screen (a touch screen at least 600 × 600, `ui/largeScreen.ts`) the tabs stand at the strip's right end, up to 144px each, under 14px of paper, and its left end holds the board's key. A tab you're not on has no outline there, only its Graphite label and icon, and still sinks when pressed. While someone else's board is open over Explore, the lit Explore tab there shows a caret in place of its map, is named "Back to Explore", and leads back.

- **Sticking on:** the tapped tab fills with its hue in 140ms while it lifts 2px and settles from 1.04 to 1 (220ms, `--ease-peel`), the world's stick. The tab it leaves drops its lift and shadow in 140ms. The screen's own change is a separate cross-fade; the strip never moves with it.
- **Reduced motion:** only the hue changes, in 120ms, with no lift travel and no settle.
- **Not while drawing:** the drawing screen has no strip; its My board tile opens the board as the My board tab does.

### Board header

Your avatar (a 42px photo sticker at -4°) and your name (800, 18px, width 112) at the board's top left, as one button with a 48px target and a small caret that says it opens something. Tapping it turns the whole board over to its stat board; on someone else's board, their name does the same with their figures.

### The stat board

The board's back, where a person's figures are pinned up as paper. It's the only place stats live.

- **The turn:** 640ms. The board lifts to 0.92 scale, turns on its vertical axis over the Ink table, with each face darkening as it turns from the top-left light, and lands with a small overshoot. A tap mid-turn reverses it. Reduced motion crossfades the faces in 180ms. The tray and Draw are fixed to the front and turn away with it; on a large screen the board's key, in the tab strip, fades out instead. The front takes no taps while turned.
- **No person card:** the front's header already names them, and the receipt prints their @handle in its own case, inside the fine print's capitals.
- **Gratitude:** a printed receipt pinned with a pink pushpin, headed "Gratitude received" beside a pink heart with an ink line, over the total in big numerals. On your own stat board a quiet link under it, "See where it came from", opens your gratitude events, a bottom sheet on a phone, and on an iPad a centered card 480px wide that a swipe down its head closes, its tear strip left only to keyboards and screen readers: a row per combo, newest first, with the sticker, who sent it, the day, a RESIDUAL tag on your Original Artist Gratitude Share, and the amount after its plain pink heart; Show more loads older ones. Someone else's receipt shows only the total. When the stats don't load, the receipt says why in place of its total.
- **Streak:** a torn-off calendar leaf with a Tangerine band, the Fire icon before STREAK under the pin, and the day count in Figure type. No rule copy.
- **Stickers:** made, received and given as three postage stamps stuck on at small turns, each printed on its hue with an Ink rule.
- **Bests:** a torn notebook scrap ruled in Ink at 14% every 24px, held by washi. Its heading and each row take whole 24px lines with no gaps between them, and each line's rule runs a pixel under the baseline, so the words sit on the rules the way handwriting sits on a notebook's lines. Best combo on it is the hit counter, with no note, and it fits inside its line. Best day, the most gratitude received in a day, leads its figure with the ink-lined heart. Each best's name stays on one line: its figure moves under it, at the right, only when the two don't fit side by side.
- **About:** the joined date, on a strip of Ink label-maker tape with raised letters.
- **Controls:** Flip back is label stock at the top left, where the name that turns the board over sits on its front, and it comes first for keyboards and screen readers; on your own stat board outside LINE's app, Log out of LINE follows it. Bare cork, Escape and LINE's Back also flip back. The stat board has no key.
- **On a large screen:** the papers in the phone's order as one cluster centered on the cork: the receipt over Bests over the label tape, the leaf over the stamps, then the address paper, a column of its own on someone else's. Your own puts Settings, no wider than 460px, centered under the cluster, or beside it when the screen is turned, in view where it's pinned rather than peeking. Flip back stays at the top left; on your own, turned, it rides over the cork's corner. The stat papers and your address paper are pinned a size up as far as the cluster fits; controls keep their phone size.
- **Settings:** your own stat board's first paper under the stats, above your Sui address paper, since it's the one people come back to. It's a clean-cut index card taped at both top corners, its Title-type heading over an Ink rule. Until it scrolls into view its heading peeks above the cork's foot, unless the stats would run into it (a short phone), when it waits below them; a tap or focus scrolls it in. Its settings are split by dashed rules, each a 44px row: its name, then its control at the row's end. A choice is a segmented radio group: its choices side by side in a Canvas pill with the switch's Graphite edge, the picked one inked in, as a switch is when on, each 26px to see and 44px to touch. Tab stops on the picked choice, and the arrow keys, Home and End move the pick; choices too long to share the row drop under its name. Language is English or 日本語, each named in its own language. Show 18+ stickers is one switch row, with no heading and no fine print. Kyoto Seika Manga Expression Practice Mode is one switch row too: its name, then "?" right after its last word, Phosphor's question (bold at rest, fill while its sheet is open), then its switch. The name blacks out one character of the university with a hand-inked bar, like a manga censor bar (伏せ字); a tap on the bar lifts its corner and a white label peels on under it ("Redacted for grown-up reasons"), and never flips the switch. Screen readers hear the full name. "?" opens the Kyoto Seika help sheet, which carries how the mode works, its maker's note and the JMdict credit; a tap anywhere else on the row flips the switch. Nothing says what a setting did: its control shows the change at once, and while it saves, the control holds the new state faded, after a short wait so a quick save never flickers, takes no other change, and is marked `aria-busy` and `aria-disabled`, never `disabled`, so focus stays on it. A failed save puts the control back and shows the error line, which stays until that setting saves. Last comes Drawing, kept on this device rather than the account: Drawing hand, Right or Left. Once a pen has drawn on the device, Input (Pencil only, Pencil and finger) and Pen pressure (Off, Light, Normal, Firm) follow, then Try it: a 64px strip of drawing paper, its name in fine print in its corner, where the pen tries the chosen curve in Ink (fingers too, unless Input is Pencil only); the ink fades a few seconds after the last stroke, or under reduced motion just goes. A change applies at once; one the device can't keep shows the error line and lasts until Croquis closes.
- **The Sui address paper:** pinned through its top margin by the chain pin, a push pin whose head is Sui's droplet in Sui Blue, unaltered, half its height clear of the paper's edge and above the code's quiet zone, casting a light Ink shadow on the paper. The paper hangs and swings from where the pin goes through. Its caption, then one line of fine print on what it's for: "Holds your stickers". The network's name is left to the address dialog's note. Someone else's stat board shows theirs too, at the foot of the leaf-and-stamps column, glossed "Holds their stickers"; it opens the same address dialog, titled with their name.
- **Developer slip:** LINE's details, a Device paper with what the device says and Copy, and Privy's details, on a torn-top slip, lying collapsed under the cork's end, after the last paper, in every build that has it. Pulling up past the end meets iOS's rubber band: the cork and its papers ride up together as the slip's top shows, and past 150px of travel the release brings it out and the cork glides up to it; short of that it settles back. Only a touch that starts at the end pulls, and the cork doesn't bounce there. A visually hidden "Developer tools" button, shown as label tape when focused, brings it out for keyboards and screen readers. Reduced motion: nothing moves, and it fades in. It goes back under once the board rests on its front.
- **Empty values** read in words: "No gratitude yet", "Not started", "None yet" (a best at 0).

### Gifts on the board

Opposite your name, top-right: gifts for you. On a large screen it stands in the header row, as long as its words.

- **Gifts for you:** Pink Soft label stock with a Pink ring and a round Pink disc holding a filled gift in Ink, never the sticker, so the pull tab still reveals it. "A gift for you", or "Gifts for you" beside a Seal Yellow dot badge that counts them, over "from @alice", the newest gift's sender, in Ink fine print, since Graphite is too faint on Pink Soft. It asks to be opened: now and then it lifts 3px and settles. Tapping it opens the newest in the Receive gift dialog, as its gift message would; the rest wait for the next tap. Reduced motion holds it still.

### Someone else's board

The same board, read only, opened from Explore. Their stickers sit where they stuck them, with foil on the ones someone else drew. Nothing moves, so there are no handles and no rotate knob. There's no tray, since a tray is private; Give takes Draw's slot as the board's one key; an Explore back chip (a 32px Liner Lift pill with a caret, 44px to touch, named "Back to Explore") sits beside the name, and Explore behind it takes no focus. On a large screen there's no chip: the lit Explore tab leads back. The stickers take keys as your own board's do (one Tab stop, arrows in reading order, Enter selects), and a selected sticker gets the same toolbar, with the artist chip on top when someone else drew it, then View.

### Draw screen

The canvas is just for drawing.

- **Sheet:** white paper inside thin Liner margins. A drawing keeps the shape its sheet took at the first mark, and turning the screen or resizing the window scales it to fit, centered, so strokes, brush sizes and the sticker's white border are the same on every screen.
- **Top row:** the timer dot and the tool strip share one row. The timer is a 48px yellow dot at -4° with puffy numerals, 56px while it reads 10:00 or more so 30:00 fits, growing and shrinking from its top-left corner (top-right for a left hand) by transform alone while its numerals and tag keep their size; tapping it pauses, except on a begun sheet in Kyoto Seika Manga Expression Practice Mode (see Paused).
- **Time calls:** a clock long enough to reach them, as a sheet in Kyoto Seika Manga Expression Practice Mode has, calls the time at 10 and 5 minutes left, as a proctor does: the white label under the timer reads "10 minutes left" / 残り10分 for a few seconds, tucked up under the dot with no arrow, since the arrow means "tap the timer", and screen readers hear it.
- **Paused:** the dot stays whole and bright, and a white label-stock tag reading PAUSED, with Phosphor's pause (fill), sticks across its lower edge at a counter-angle of 8°. It sticks on when the clock holds and peels off when it runs. There's one paused look for every hold: tapped, the page hidden, the board over the drawing screen, the seal sheet, the color sheet, the Smoothing bar or the clear bar open, or a finger on the size rail. Only the tap is the person's pause; the other holds release on their own. A sheet in Kyoto Seika Manga Expression Practice Mode never pauses once begun, as in the real test: only the page hidden, the board over it, or a reload's pause, which a tap lets go, holds its clock, and a tap on the running timer puts "The clock runs, as in the real test" on the white label for a few seconds.
- **Paused hint:** while paused the canvas takes no marks. A stroke nudges the dot and sticks a white label under it, turned -2°, reading "Tap the timer to keep drawing", with Phosphor's arrow-bend-left-up (bold, 28px; mirrored for a left hand) pointing up at the timer. It peels off by itself. Tools can still switch.
- **Tools:** brush, eraser, fill, a color control (a Phosphor dot inked in the current color on a thin ring; each new drawing starts in a random starting color) and Smoothing, as flat 38px tiles padded to 44px. The current tool is an Ink tile with the fill-weight icon. Clear ends the strip past a hairline. Once a pen has drawn on the device, Pencil only (Phosphor's pen-nib) leads it past another: pressed, the tile is Ink with the fill-weight icon, only the pen draws on the sheet, and fingers only tap to undo and redo. A tap switches this sheet; a fresh sheet starts in Settings' Input.
- **Smoothing:** an icon button that opens a compact Liner Lift bar under the tools. Its small title, "Smoothing", shows only while it's open, with Raw and Smooth at the ends. Its slider takes touches across a 44px band, and a tap on the sheet closes the bar without drawing. A finger's line trails it on a string to steady it; a Pencil's stays under the nib from where it lands, steadied by a hair.
- **Color sheet:** it stops at half the screen: the recents, the pad and the brightness bar first, the swatches behind a scroll; swatches and recents take cell-wide 44px-tall bands. Under 700px tall in the phone layout, such as LINE's sheet on an iPad, it stops at 42%, its heading hidden from sight and its pad 56px tall, so more than half the sheet stays in view.
- **Size rail:** the left edge, with a live number of the brush size in the sheet's px, a 390px phone's, so a size draws the same on any screen. Only its thumb takes a finger, from a 44px square round it; the rest of the edge is paper. The brush size and Smoothing are kept with the drawing. On a short screen it shortens, so it always ends 24px above undo.
- **Pencil hover:** a Pencil hovering over the paper shows a ring centered on its nib, as wide as the stroke it would draw at a middle pressure: a thin line in the brush's color with a white edge, or faint Ink for the eraser. None shows for fill, or while the sheet takes no ink. It never draws, and goes when the Pencil lands or leaves the paper.
- **Prediction:** a Pencil's brush stroke draws the browser's guess at its next points a frame ahead of the nib, joined to the line through the nib, at the stroke's width, and the next frame redraws it. It's never kept, in the drawing, the timelapse or the sticker.
- **Foot:** flat undo, redo and My board tiles at the bottom left, 46px, undo and redo 6px apart and My board 16px further on, so it reads as the way out rather than a third history control; the seal check at the bottom right, which says it opens a dialog. The canvas shows no ticket count.
- **On a large screen:** as in drawing apps made for a tablet, the sheet takes everything but a slim top bar and a slim sidebar, so no control sits on the paper. The top bar holds the timer and the tools, and the Smoothing and clear bars drop under its tool end. The sidebar, at the edge away from the drawing hand, holds the rest in the phone's order: the size rail, shorter and with no px number, since its thumb's tip shows the size; undo over redo over My board, which stays there before Begin; and the seal check at its foot, whose chip opens beside it over the sheet's corner. Colors open as a 360px popover under the tool strip, at its outer edge, its tear strip left only to keyboards and screen readers; a tap outside closes it, as Escape and Back do.
- **Drawing hand:** Left, in Settings, mirrors the screen so the hand never rests on a control: the size rail, the foot's tiles and the seal check change sides (on a large screen, the whole sidebar), the tools go to the top left and the timer to the top right, and the chip, the bars and the color popover follow. Each control keeps its own reading order: undo still comes before redo.
- **My board:** the tab's house (bold) on a flat tile, the only way back to the board mid-sheet, since LINE's ✕ closes the whole app. A tap opens the board as the My board tab does: the board covers the drawing screen and the clock holds until it's back. It steps back with the tools while sealing but stays for a seal to try again, and before Begin it takes undo's place, clear of Begin.
- **Seal sheet:** the check's one tap raises a bottom sheet over the foot, the drawing still in view above it. The sticker as it will be sits on the left at a -3° turn: the drawing on white, cropped to its ink with a border as the cut leaves, under the kiss-cut and the sticker cast, so it shows at once and never waits on the cut. Beside it, centered on it, the title "Seal this sticker?", then on a sheet in Kyoto Seika Manga Expression Practice Mode its pair as the sealed card prints it, so she can check both are drawn, then directly under them one switch row, "Mark 18+" / 「18+にする」 (the sticker detail's words), its only words, under a hairline. Under them, Seal (Seal Yellow, the check icon) centered at the foot, and "Not yet", a quiet link 12px under Seal's lip and 44px to touch, which closes it back to drawing; so do Escape, Back and the perforation. A regular sheet's clock holds while it's up; a begun sheet in Kyoto Seika Manga Expression Practice Mode runs on under it.
- **18+ switch:** for everyone, off on every new sheet. The choice is the sheet's, kept on the phone, so Not yet and a reload keep it. On, the switch fills Ink, as every switch does, and the preview's edge turns pink foil, the band an NSFW sticker wears, with no blur; Seal then seals it as an NSFW sticker. On a sheet in Kyoto Seika Manga Expression Practice Mode the preview wears the Kyoto Seika Practice Mode foil until then. It takes focus as the sheet opens, and screen readers hear that the sticker blurs for anyone without Show 18+ stickers.
- **Time's up:** 0:00 is pencils down. The tool strip, size rail and foot tiles fade, leaving the clock, and the seal sheet rises in its time's-up state, titled "Time's up" / 「タイムアップ」, with no Not yet: its perforation is plain holes, and Escape and Back do nothing. On a sheet in Kyoto Seika Manga Expression Practice Mode the title is the proctor's "Pencils down" / 「やめ」, in the deal's 書き文字 at 22px on one line, as はじめ began it. A seal sheet already open, which only a Kyoto Seika sheet's running clock reaches, turns time's up in place and keeps its height: Not yet's slot fades out rather than closing up, the new title pops in (none under reduced motion) and a polite status line reads it, and focus on Not yet moves to the 18+ switch, never to Seal, so Enter never seals blind. The timer under it is named "Timer", described as time's up, never "Pause timer". Nothing seals until Seal is tapped, and a reload at 0:00 brings the time's-up sheet back. A sheet erased to nothing at 0:00 has nothing to seal: it's spent, and the fresh sheet's chip says so.
- **Sealing:** the ceremony starts as soon as the sticker is cut: the cut runs round the ink behind a Seal Yellow blade, and the paper around it dims. It then waits there while the server seals the sticker, which takes 10–30 s. The blade keeps running round the cut, pass after pass, trailing a heavier stroke of fresh cut. Only once the seal is recorded does the resin pour, the sticker peel off and the sealed card come up, so nothing that says "sealed" shows early. A white label at the foot, turned -2°, sticks on after 1 s: "Sealing your sticker…". At 10 s a fresh label is pressed over it adding "It can take up to half a minute.", and at 30 s "It's taking longer than usual." It peels off when the seal lands. A tap skips to the wait but can't pass it. A failed seal fades back to the drawing, and the chip says in one line what failed and what to do, with the words behind it under that for a report and Copy, as on every error line. The chip stands above the foot row, left of the check's column, so it never covers the foot's tiles. A seal that fails at 0:00 starts the chip with "Time's up." and leaves only the check, which tries the same seal again with its mark: the sheet is locked and the tools are hidden and out of the tab order. Screen readers hear "30 seconds left" and "10 seconds left". Under reduced motion the cut shows at once, the blade stays hidden and the label still shows.
- **Sealed card:** the sticker lands in its slot with the card's 18px padding above it, never against the card's top edge, wearing the foil that marks how it was made, risen with the resin: pink on an NSFW sticker, the Kyoto Seika Practice Mode foil on one drawn in that mode, pink when both. Under "Sealed", the fine print: the sticker's number, drawing time and seal day. With tickets left, Keep drawing is the key and Back to My board the label under it. Once the sticker used the day's last daily ticket, the line under the ticket row leads with the refill, "New daily tickets at 12:00 AM", in Ink. On the last ticket of all, Back to My board becomes the key and Buy reserve tickets drops to small label stock with the ticket icon under that line: the day's peak is no sales pitch. On an iPad the card rises to the middle at 400px wide, as the ticket cards do, and the sticker stays on its slot when the screen turns.
- **Keep drawing:** the hand-over overlaps rather than running in turn. On the press, the fresh sheet and the clock (3:00) are set up under the veil, and the day's next daily ticket is spent without asking. The sealed card carries the sticker straight down 70% of the screen, over 280ms on the peel curve, fading over its last half, while the veil lifts linearly. The timer, tools, size rail, undo and My board fade back in 120ms later, so the sheet is never bare. No card shows during that spend; one comes up only if the spend fails, with the reason. When the sticker used the last daily ticket and reserve ones are left, the reserve ask rises 120ms into the card's exit, its scrim taking over from the lifting veil. The shop from the last ticket's card leaves the same way. The fresh sheet takes ink as soon as the spend lands, even while the card is still leaving. Under reduced motion it's the same order in one frame.

### The deal (Kyoto Seika Manga Expression Practice Mode)

A sheet whose ticket was spent in the mode deals two Kyoto Seika Subjects (題材) before the clock starts. An extension of the draw screen, not a new world: the delight is in the deal and in Begin.

- **Before Begin:** the timer dot reads 30:00 with "Starts when you press Begin" under it on the first visits, and the tool strip, size rail, undo and redo are hidden, as an exam waits for 「始め」. The sheet takes no ink: a touch on it nudges Begin and puts "Starts when you press Begin" on the timer's white label for a few seconds, as a stroke on a paused sheet nudges the timer and shows its hint. Under reduced motion, the label alone.
- **Clouds:** manga thought clouds (もくもく) inked with a G-pen on the sheet's own white, with no shadow: the pen line alone sets them off the paper, as on a manga page. Each is drawn in SVG, lobe by lobe round a squared-off ellipse, eleven lobes of different sizes, bigger and rounder where the cloud piles up along its top and flatter along its foot; each lobe is one stroke that lands fine, swells (heavier on the side away from the one light) and tapers off, crossing the next at its cusp. Three bubbles trail toward the thinker off the page, each one stroke drawn round once and closing a little past where it began: the upper cloud's head off the left edge, the lower's down toward the lower left. The upper cloud sits to the right at +2.5°, the lower to the left at -2.5°, apart, about 45% of the way down the space between the timer's label (whose room they keep even while it's off) and the task over Begin. Inside: the reading as group ruby over a word with kanji (12px Graphite) and the word in the Japanese face at 800 (46px for one or two characters down to 28px for six, 40px for a Latin acronym). No English.
- **Float:** each cloud drifts on its own seeded track of slow noise in rise (±2.6px), sway (±1.8px) and tilt (±0.7°), looping over 23s and 29s so the two never fall in step; its bubbles drift ±1.1px more on their own. The ink boils: three inkings of each cloud and its bubbles are drawn ahead, and one shows at a time, the next every 180ms, the lower cloud half a frame behind. Both hold while the page is hidden.
- **Short phones:** the clouds tighten rather than scale (word at most 36px, less room between lines), never so close they meet. Where even that doesn't fit, the lower reroll moves up beside its cloud's right side and the lower cloud's bubbles rise toward the page's left edge; then, as on an iPhone SE inside LINE, the clouds tighten further (a shorter word area with less room round it, flatter lobes, and words of three characters or more a size smaller, down to 24px for six), so the pair keeps the room under the timer's label and its note. Only on a phone shorter still does the pair keep its foot on the task line's room and give up some of the room under the label, so nothing lands on the task line or Begin. Nothing goes under the 11px floor.
- **Large screens:** the pair is laid out a phone's width wide over Begin, in the sheet's middle, and drawn 1.25× larger, so the two clouds still read as one pair.
- **Reroll:** under each cloud's right edge, fixed on the sheet so it never moves while the cloud drifts: a die inked in the clouds' own pen (a white face, a tapered ink line round it side by side and inked pips, with no key, lip or shadow) beside 「振り直し」 / "Reroll" lettered in Dela Gothic One at 15px, tilted -4°. Die and words are one button, 44px to touch, with the house focus ring. A roll tumbles the die once over an edge onto its new face in 250ms, with a hop and a squash as it lands; a small lettered コロッ (13px, both languages, as a drawn sound effect) pops just over it and fades in 640ms; the cloud squashes and puffs five pen-drawn puffs; and the word swaps out and in. Each roll lands on a new face, worked out from the roll count, so a reload shows the same one.
- **The task:** one quiet line just above Begin, 13px Graphite at 500: "Draw both in one sticker" / 「2つの題材を1枚にかく」.
- **Begin:** the screen's one key, Seal Yellow with the Draw icon, "Begin" / 「はじめ」, centered at the sheet's foot, 196px wide. It stays sunk until the pair shows, since a sheet begun without its pair could never seal, and springs up as the balloons arrive. The press starts the clock at once; the key and the task drop 56px and fade, the balloons tuck toward the corner and fade, and the tools come back 120ms later, as after Keep drawing.
- **The corner print:** once begun, the pair stays as a vertical margin note (縦書き) under the ink, in the sheet's lower left, its edge in line with undo's and its foot 16px over the foot row's tiles (on an iPad, the same corner of the sheet, beside the sidebar): the two words alone, with no heading, furigana or English, each in its own column, right to left, Latin letters upright. 26px words at 700 in Non-repro Blue at 70% strength: read at arm's length, still paler than any ink. A left drawing hand mirrors it to the lower right with the tiles, since a drawing hand covers the lower corner on its own side. A failed seal's chip may cover it until the chip goes. It fades in over 200ms and takes no touches, and the seal cuts only the ink, so it never reaches the sticker.
- **Rolling too much:** each die counts its own rolls. From the tenth, every third roll earns a line in manga hand lettering (書き文字: white Dela Gothic One at 22px with a 5px Ink outline, tilted -6°), popping in and peeling off after 1.6s, always clear of the die: above the upper cloud, and below the lower one, before its reroll where it fits and under it where it doesn't. The die shakes along a curve: nothing until roll 10, then each roll shakes it harder and quicker than the last did ((rolls − 9) / 20, squared and a little more), up to 2.6px, 10° and a 70ms jolt on the roll before the bang. From 26 a big Seal Yellow number (46px, a 6px Ink outline) counts 4, 3, 2, 1 by the die, which smokes: under it, or else beside or over it, wherever it first keeps clear of the die and of both clouds' outlines.
- **The bang:** the 30th press blows the die up at once, with no wind-up and no lettering: a burst of white, Tomato and Seal Yellow stars, ink outlined, kept inside the screen's sides, a spray of white shards inked round in the clouds' pen, and the cloud jolts. The die is left broken, a disabled button, and its subject stays: soot-dark, its top-right corner chipped off with two shards beside it, white cracks running from the chip, its pips faint, its lettering knocked askew in Graphite. Its shaking stops, and pen-drawn wisps of smoke rise from it and from its cloud's top edge.
- **Reduced motion:** the clouds are simply there, with no drift or boil, and a roll changes only the pips and the word; lines and numbers fade in and out in place; the 30th roll leaves only the broken die, with no bang or smoke; Begin's hand-over and the corner print take one frame.
- **Screen readers:** the clouds are a group named "Your subjects"; each reroll is named by its lettering and the subject it would replace ("Reroll: 風, wind" / 「振り直し：風、wind」), so speech control finds it by the words it shows, and never by its コロッ, and a polite line reads each new subject and any line it earned. Begin reads "Begin: start the 30-minute timer". A charred die reads "The die blew up. This subject stays." Once begun, the canvas's name carries the pair: in English each word with its English ("Canvas, subjects 遊園地, amusement park, and 繰り返し, repetition"), in Japanese the words alone.

### Tickets

**The Ticket Rule.** Every picture of tickets shows the tickets your next drawing can use, drawn from one helper (`ticketView`). While daily tickets are left they lead: the day's three stubs, fresh first and then the used ones newest first, so a spend turns a stub over where it lies; reserve tickets held show as one reserve ticket with its count. Once the daily tickets are used, the three slots go and one reserve ticket with its count takes their place; only the refill line says when daily tickets come back. With neither left, the used day shows. A zero never shows, and reserve tickets never fill daily slots.

Tickets aren't controls: daily tickets are matte ticket stock; reserve tickets wear the stickers' resin, an Ink outline and a four-point star.

- **Daily:** Seal Yellow stock with a 22% hairline edge, printed with the Draw mark.
- **Reserve:** Blue stock under the stickers' baked resin: a highlight from the top-left light over its top third (white 62% fading to 12%, then a clean edge), a rim of light just inside its top edge, and the print pooling Blue Deep at the foot. A full Ink outline (1.5px small, 2px large), and Phosphor's four-point star (fill), white with an Ink edge, over its top-right corner. The star pops in once, on the peel curve, when a reserve ticket first shows on a surface (bought, or come to the front), and never loops; reduced motion shows it still. A count's dot badge takes the corner, and the star sits just short of it.
- **Used:** the backing a ticket leaves: Liner Lift with a 26% edge and its perforation, carrying the kiss-cut outline of the sticker it became.
- **Marks:** at 18px (the checkout's pack rows) a ticket is a mark with an Ink edge; the reserve mark keeps only its rim of light.
- **A ten-ticket day:** in Kyoto Seika Manga Expression Practice Mode, more than three stubs lie in rows of five, like a strip of 回数券: small stubs as they are on the sealed card, and the ticket cards' stubs at a medium size that fits five across a 360px phone, without the large stubs' tossed tilts. A day never shows more stubs than its allowance.

### Out of tickets

Three empty ticket stubs say "used up" without a number. Each used ticket keeps a faint kiss-cut outline of the sticker it became (a 1px graphite line at 62%, dashed on the large stubs), fading in over 700ms: the cut line a sticker leaves on its backing. The small stubs on the seal screen carry the same outlines. Under the title, a printed refill line reads "New daily tickets at 12:00 AM," in bold Ink followed by the countdown ("in 6h 56m") in Graphite, in tabular figures. It never borrows the timer dot's look: no dot, no color field, no tilt, no Dela numerals. Then the perforation, Back to My board as the key and Buy reserve tickets on label stock with the ticket icon. The card doesn't restate the three-a-day rule. When the refill brings tickets back while it's open, it turns over in place and its key becomes a plain Draw. On an iPad every ticket card, the start card and the reserve ticket checkout included, rises to the middle of the screen at 400px wide instead of across its foot.

**Draw never asks for a daily ticket** (zero steps to the canvas). On the board, Draw with a daily ticket left spends it at once: the key's front ticket peels off, and the canvas opens as it goes, taking the ink as soon as the spend lands. With no tickets at all, Draw raises this card over the board instead, and the canvas doesn't load; its key reads "Back to My board", and its scrim dims the board and the tab strip under it, where a tap closes the card as Back to My board does and never changes tabs. A drawing in progress already has its ticket, so Draw just opens it.

The start card shares the card, and comes up for two things only. With daily tickets gone but reserve ones left, it asks "Use a reserve ticket?". When a spend fails (Draw, Keep drawing or the reserve ask), it says why in the error line under its title, over the canvas, with the tickets it tried: the day's stubs and, when you hold reserve tickets, one small reserve ticket, ×count and RESERVE under them, and Start drawing to try again. Its line says one fact per line: the bold one, then the quiet one under it, so neither breaks across the other; "3‑minute" keeps a non-breaking hyphen. A drawing a reload couldn't pick up says so in the timer's label, until the first stroke. The reserve ask's art is that one ticket, large (148 × 90) at the house tilt, with the count on a Blue dot badge, and no daily stubs. The line says each fact once: "Today's daily tickets are used." in bold, then "New ones at 12:00 AM." in Graphite on the line under it; screen readers also hear "You have 3 reserve tickets." Then a Blue key and Buy reserve tickets on label stock. Every Buy reserve tickets button on the ticket cards carries the ticket icon (BuyTicketsIcon), not the Shop's tote. The checkout's done step shows the same one reserve ticket, its badge on the new total.

Spending a ticket peels it, the house verb. On the press, the ticket being spent (the last fresh daily stub, or the reserve ask's one reserve ticket) lifts at a corner, 4px and -3°, over 220ms, while the key stays busy in its own color (see the key's Busy state). If the spend fails, it settles back. Once the server answers, its face peels up and away off the backing, fading over its last 40%, in 280ms on the peel curve, and leaves the used backing; a reserve ticket's badge ticks down one and is stuck on again, and a zero never shows. 120ms into the peel, the card drops back 56px and fades over 220ms, faster than its 460ms rise, and its scrim and the safe area's under it clear with it. Keep drawing peels the sealed card's next small daily stub (18px of travel, 220ms) as the card leaves. Draw on the board peels the key's front ticket the same way (24px of travel, 220ms), and the canvas opens once it's off. Under reduced motion there's no lift or travel: the face goes and the backing shows in one frame. The sheet under it takes ink at once. The card keeps showing the tickets it asked about on its way out, so spending the last daily ticket never turns it into the reserve ask. When the ticket shop takes its place, it goes at once and the shop's card rises.

### The Draw key's tickets

The tickets your next drawing can use tuck behind the Draw key's right end, like tickets slid behind a keycap. They're paper on the page, not part of the key: 14px of each hides under the key, they sit centered on its 48px face at -3°, and the key's cast shadow falls on them. They take no taps and don't press; the key sinks over them. By the Ticket Rule:

- **Daily tickets left:** one Seal Yellow ticket, 30px tall, with ×count in Figure type (850, 13px). Tickets this small carry a 1.5px Ink outline, both kinds.
- **Reserve tickets held too:** the reserve ticket fans out past the daily one's end like the next card in a hand: its own 16px end tucks under the daily ticket's notch, and the rest shows whole, 5px higher and turned 3° further, printed ×count, its star on its corner. It never hides behind the daily ticket as a sliver.
- **Daily tickets used:** the reserve ticket alone, in front.
- **Neither:** the used backing (Liner Lift, a dashed 26% edge) printed in fine print, Graphite, with when new ones come: "New at 12:00 AM", never the bare time. The key stays live: Draw raises the out-of-tickets card over the board.
- **Not loaded:** the error line above Draw says "Couldn't load your tickets: …" with Try again, and Draw asks for them again as it opens the canvas.

The key's name says what's left: "Draw a new sticker: 2 daily tickets and 5 reserve tickets left", or "…: no tickets until 12:00 AM". The star pops when the key first shows a reserve ticket in an app open, or when one is bought or comes to the front, not on every return to the board. Full-width Draw keys on the cards carry only their label; the card's art above shows the tickets.

### Shop

The Shop tab: reserve tickets on sale, then what's coming. No rules copy anywhere on it.

- **Title:** "Shop" in Headline type at the top left.
- **Reserve tickets:** the page's peak, one Liner Lift card. Three reserve tickets fanned like a hand of cards, only the front one wearing the star, since a star on a ticket behind would peek out past the one over it as a white shard; the headline "Reserve tickets"; one line on what they're for; the perforation; what you hold (the reserve ticket mark × count, left off at zero) over the blue Buy reserve tickets key, the page's only key. Under it, once your Sui address is known, Deposit (入金) on label stock lifts that address and its QR code off the button in the stat board's address dialog, to send JPYC to.
- **Your ticket purchases:** right under the reserve tickets card and as wide as it, once your Sui account is known, a small label button: a receipt, "Purchases · " with your short Sui address, and a caret. It opens the packs you paid for from it, read from Sui a page at a time, newest first, with Older purchases for the next page. Each row is a Liner Lift strip: the pack and when, then its price in yen and an out-arrow, and it opens the payment on Suiscan. A purchase closes the list, so it reads Sui again when next opened. When a read fails, the error line's Try again takes it off while Sui is read again, and focus goes to the Purchases button. The checkout carries the same label in its scrolling body under the packs. When tickets fail to load, the Shop says so with Try again.
- **Coming-soon shelves:** Laminates, Brushes and Backing foils, under one quiet Liner Deep "Coming soon" pill in `--graphite-on-deep`, the Graphite that reads 5.0:1 on Liner Deep where plain Graphite reads 4.2:1. Each shelf has its name in Title type over four 104px swatches that scroll sideways with snap, the fourth peeking past the edge. The first is what you have now, tagged "Yours" on a Pink Soft pill at the house tilt. No prices and no press: the swatches are a list, not buttons.
- **On an iPad:** upright, one centered column as wide as a shelf's four swatches with its sides, so every swatch shows whole. Held sideways, one spread with nothing to scroll: reserve tickets as a banner across the top (the fan, the name and its line, then past an upright perforation, like a ticket's stub, the count over Buy and Deposit), your ticket purchases under it, and the three shelves side by side under the one "Coming soon", each with its four 96px swatches two by two.
- **Previews** use the app's own materials. Laminate and backing foil swatches show the newest sticker you drew, or a bundled sample for artists with none, at the house tilt. Gloss is the live resin as it is; Matte drops it for a fine white haze with a broad, dim bloom; Glitter adds flecks and Prism faceted foil colors. A swatch is too small to tilt, so every preview, the backing foils' too, takes the Shop's own light instead of the app's: it circles the swatch on a slow 10s loop, leaning top left, and never follows the tilt or a finger. Under reduced motion it holds still at the top left. Backing foils are the foil band in other metals: Holo as it is, Gold, Silver and Rose gold. Brush swatches are one S-stroke on white, painted by the drawing screen's own `paintStroke`: Brush (today's pressure taper), Marker (a chisel's flat edge, 15% of the swatch, swept along the stroke: broad going down, a hairline going up, and both ends cut straight along the edge, so it never reads as the brush's round taper), Fineliner (one thin width) and Pixel pen (the stroke on a coarse grid, hard-edged and scaled up).

### Reserve ticket checkout

The one card that sells reserve tickets, in the out-of-tickets card's stock. The Shop's key raises it over the whole phone, tabs included; the drawing screen's cards raise it over the canvas. The title "Pick a pack", since over the Shop the hero's own "Reserve tickets" shows just above it, then "Reserve tickets never expire." in bold Ink. The balance sits in a Liner Lift well in yen, labelled "Balance" (残高), never the coin's name: the Sui account's JPYC, one yen each. Packs are a radio group of label rows (arrow keys move the pick; focus lands on the picked pack): a reserve ticket mark, the name, and the price in the last column, so every row's price lines up. A discounted pack stacks its price: the discount ("−40%") in plain Ink fine print before the struck-through full price, then the yen in bold. Your free first pack shows only "Free" (無料) in bold, with no discount, and Pay reads "Get it free": it needs no balance or Sui account, and its done card has no Paid line. There's no sale sticker: pink means gratitude and you, and a discount never outshouts the picked pack or Pay. The picked pack is stuck on in Blue Soft with a Blue ring, and its struck-through price turns Ink, since Graphite reads only 3.3:1 on Blue Soft. When the balance can't cover the picked pack, Pay stays sunk and a line under the packs says so plainly, in bold, then what to do: pick a smaller pack if the balance covers one, or add JPYC to the Sui account, with "Show my Sui address" opening the address and Copy in place. Then the perforation, and a footer that never scrolls away: the blue Pay key and Not now. While paying, Pay keeps its face (the Busy rule), a status line says what it waits on, and the scrim, Escape and Back wait until it lands. Every amount shows in yen, with the half-width ¥ (U+00A5) that Mona Sans carries, never the full-width ￥ Chromium writes for Japanese, which falls back to another typeface; SUI, the coin, never shows: the app pays every network fee. The smallest pack is picked to start. A failed payment says what failed in one plain line (timed out, or the server's reason), the raw words as copyable fine print, with Back to the packs as its key. When the answer is lost, Try again sends the same signed payment, which can run only once, so it never charges twice, and the server credits a payment that landed without the app.

### Stickers

- **Die-cut:** the outline comes from the artist's own strokes, offset into a white border and bounded by the kiss-cut groove, with the sticker cast shadow beneath. Parts the border doesn't join hang together by bridges of white border, narrower than the border: the shortest set that joins them all.
- **Baked resin:** the gloss is baked into the image, with the print darker and more saturated where resin pools at the edge, a refraction band inside the cut edge, a rim light and a meniscus at the foot.
- **Live resin:** on stickers that are showing, a live layer adds a specular along the top edge, a rim light and a sheen that sweeps when the sticker is placed, dragged or tilted. On a board its lens, specular and rim light are fainter, so the laminate reads thin.
- **Crease:** on a sticker board, a sticker lying over others shows the edges beneath it, as a real one does once it's pressed down over them. Each sticker lies over the ones below like a stiff sheet: beside an edge it lifts and ramps down, it bridges narrow gaps, and it passes on only part of the shape under it, so an edge directly beneath reads clearly and one buried deeper fades. The ramp is lit on the side facing the one light and shaded on the far side, across the white border and foil band too, and the live resin's specular and rim light catch its lit side as the light moves. It's baked off the main thread once the board holds still, clears while the sticker is in hand and fades back in once it's stuck. The sticker tray and Explore have none: stickers never overlap there. For now they're off on every device unless “Show creases on this device” is on in its developer slip.
- **Foil:** a sticker drawn by someone other than the board's owner wears a foil band just outside its white edge, 4% of the sticker's long side: about 5px on the board, wider on the detail's big sticker, narrower on tray sheets. It's the silhouette grown by that distance on the server, one mask per sticker, so it follows the cut at an even width round curves and points; a sticker without that mask dilates its silhouette in sixteen directions instead, 5px on the board, 6px on the detail, 3px on sheets. The band is the sticker's edge: the white edge runs straight into it, the image shows only inside its own cut, and the kiss-cut and cast shadow fall from the band's outer edge. A fine diffraction grating lies over it and never moves: diagonal hairlines on a 2px period, lit white and shaded Ink at low alpha. The six foil bands flow under the grating, so the band glitters rather than crawls, and a white glint sits where the one light falls; holes hide it; it's decorative, and the sticker's own label names the artist. The seal ceremony adds nothing: a freshly sealed sticker is yours and plain.
- **Pink foil:** the same band in pinks only, on an NSFW sticker, whoever drew it. The 18+ mark, wherever an NSFW sticker is flagged (over a blurred one, after "Sealed" on its sealed card, in the give sheet's picker), is Ink on a strip of pink foil with an Ink edge, never a Bonbon Pink field: pink is gratitude's.
- **Kyoto Seika Practice Mode foil:** manga screentone (網点), on a sticker drawn in Kyoto Seika Manga Expression Practice Mode, whoever drew it. Its band is narrower than holo's, 2.4% of the sticker's long side (2px at least), grown from the cut in eight directions rather than from the server's mask, so the tone never outweighs the sticker. Round Ink dots on paper white sit on a 45° screen with a 3px tile: a 20% tone all round, and a 45% tone on the same dots that comes in toward the bottom-right, away from the top-left light, whatever the sticker's turn. The tone is printed and never moves. The live light dims it under the glint and slides two highlights scraped out of the tone, a broad one and a fine one, across the screen's rows (at 22.5° off them, as a cutter scrapes) and always through the glint. Both move by transform alone, linearly with the light and eased over 420ms, so no tilt makes the tone jump. No grating, whose hairlines would beat against the dots. It shows wherever pink foil does, and pink wins.
- **Kyoto Seika Practice Mode tag:** on the detail of a sticker drawn in Kyoto Seika Practice Mode, under the fine print and Timelapse: an Ink label-tape tag at -2° with a tone swatch like its foil ("Entrance exam practice", 入試練習), and beside it the pair it was drawn from, 「風 × 再会」, at 20px with 11px furigana over each kanji word. Screen readers hear the tag and the pair as one line.
- **Peel and stick:** a sticker peels with a 3D lift toward the top right and sticks with a short settle from 1.06 scale.

### Artist chip

Who drew a foil sticker: a Liner Lift pill (40px) with the artist's LINE picture in a white edge inside a turning foil ring, then a fine-print ARTIST caption over "@name" (700, 13px). Without a picture, their first letter stands in on the paper, in the photo sticker's puffy capital (at the 11px floor in both variants), never a blank disc. A one-line "By @name" variant is for tight spaces. The copy is "artist" or "By", never "from".

- **First load:** when a board opens, each foil sticker's chip pops in at its top-left corner, top to bottom 80ms apart, holds about 2s and fades (3.2s in all), in one layer above every sticker and the name header. It happens once per app open for each board, yours and each one you visit, and not under a failure card. A received sticker landing always names its own artist, alone, even after the greeting has played. Nothing plays while the board is turned over: a board that opens on its stat board greets when its front first shows, and turning it over ends a greeting under way. Reduced motion shows and hides it without the pop.
- **Tapped:** the chip heads the selected sticker's menu, above its actions, until you deselect.
- **Detail:** under the big sticker, the chip leads the fine print. Your own stickers never get a chip.
- **Plain:** off a board, where foil never shows (Explore's lifted sticker), the chip has no ring: the picture keeps its white edge, cut from the pill by a kiss-cut, and casts a small shadow. With a sheet's width to use, it shows the whole handle, up to the longest (32 characters), running onto a second line rather than cut short.

### Explore

Browse what everyone draws, see who drew each sticker, and get to that artist's board. Under the search, a two-way switch picks **Stickers** or **This week**, and search results replace both views. On an iPad held sideways there's no switch: the search runs across the top, the pile leads, and This week sits beside it; search results take the pile's column and This week stays. Each column scrolls on its own, and a turn keeps your place in the pile.

- **The search:** the text field, "Search artists" beside an @, with no halo. Typing in it draws the house focus ring, 2px Ink at a 3px offset. A status line under it says Searching…, then how many artists match or that no one does; clearing the search keeps focus in it. On an iPad held sideways it runs across the top of both columns.
- **The view switch:** a Liner Deep track with one label stuck on the current view, Soda Aqua for the switch and Bonbon Pink for the leaderboard tabs inside This week, except Streak's, which is the streak's Tangerine. The label slides to the tapped tab in 260ms on the ease-out, fading between pink and tangerine as it goes; the text changes color in 140ms. The tabs take the shared press and the arrow keys. Reduced motion moves the label at once.
- **Handles in rows:** a leaderboard or search row shows the whole handle, up to 32 characters, as the name tags do: it runs onto a second line after "_", ".", "-" or a space, and between letters only where it must. A long one steps down from 15px to fit two lines, never under 11px. The rank, picture and figure stay centered on the row, so their columns hold. A row is named by what it shows (rank, handle, figure with its unit); where it leads is its description.
- **This week:** the three leaderboards, moved as they were, with "Resets Monday 12:00 AM" in fine print under Most gratitude and Best combo: Tokyo's midnight, in the person's own time. Streak never resets, so it has no such line. A board nobody is on yet says so, and how to get on it, as a sentence in a 13px supporting note, never in fine print's capitals. On a new board the old rows fade out in 90ms and the new ones stick on from the top, 25ms apart (the first five, the rest together), each rising 6px over 200ms. Reduced motion cross-fades them in 120ms. Best combo is the hit counter; Most gratitude's figures lead with the gratitude heart in Bonbon Pink, and Streak's (each person's current streak, ties sharing a rank) with the streak's fire (StreakIcon) in Tangerine. On an iPad all three boards show at once, with no tabs, each under its name stuck on as its tab's label is (Bonbon Pink, Tangerine for Streak): side by side in portrait, where their rows step down a size, and stacked in landscape's column. Phones keep the tabs.
- **The pile:** Explore's stickers are a heap of real die-cut stickers, never a grid or a feed. Each Tokyo day (turning over at midnight) is its own layer, newest first: a perforation row across the whole width as its top edge, with the day's dot badge stuck on it at the house tilt (Seal Yellow "Today 9.26", Liner Lift "9.25" for older days), then that day's heap resting on the next day's perforation. It pages back by day: as its last layer comes within a screen, the next page of older stickers lays out under it as older layers, joining a day split between pages, and the last day waits for the rest of its stickers so its heap never shifts (today always shows). While a page loads, the next floor shows in outline (a perforation, its badge and faint die-cut shapes); a page that fails says so there as an error line with Try again; once nothing's older, the last day ends on a bare perforation.
- **The heap:** stickers drop onto the floor oldest first, so the newest lie on top: at a few seeded, middle-leaning spots, sliding off anything they can't balance on, sinking into what they land on and staying at the lowest of those drops, turned up to 17° either way. The layout is 360 units across on every phone, seeded by the day and the sticker, so the pile looks the same on every visit and a new sticker moves nothing beneath it. Stickers keep their size however many share a day. On an iPad, and in any window wider than a phone, a pile unit stays 1.25px, about a phone's, and the pile spans as many units as fit, so the extra width shows more stickers rather than bigger ones.
- **Flat:** pile stickers are the sealed image alone, with its own cut, white edge, cast and baked resin: no live light and no foil. Only the lifted sticker gets live resin. A tap lands only on the cut line or the tags, so a clear corner lets the tap through to the sticker beneath.
- **Name tags:** every sticker wears one across its lower left edge, turned a little against the sticker, and quiet so the stickers lead: thin, flat Liner Lift stock with a hairline edge and no cast, 17 units tall, holding the artist's LINE picture as a 13-unit photo sticker (a plain dot without one, never a letter under the 11px floor) and "@handle" in 11px at 600. A given sticker adds a soft aqua "to @ken" tag under it ("@kenさんへ" in Japanese). Each tag is measured round its whole label, and a handle always shows whole, up to 32 characters: past 112 units a line runs onto the next, breaking after "_", ".", "-" or a space where that leaves the line well filled, and between letters otherwise. No later sticker or tag ever covers an earlier tag.
- **Empty:** a day with no stickers yet shows a faint dashed kiss-cut outline on its floor and "The first sticker sealed today lands here."
- **The fall-in:** only today's stickers fall; older days lie still as they arrive, their images loading lazily. On a first look, today's newest 14 fall in from under the view switch, oldest first, 55ms apart: 620ms of gravity (slow off the top, fastest as it lands) while spinning 24° into their turn, then a squash to 1.05 × 0.93, a 5px rebound and the stick settle. A shadow of the sticker in the air converges from the peeling offset to the sticker's own cast and fades as it lands. It waits for the falling stickers' images, at most 0.7s. On a return visit only stickers new since your last look fall, and every new sticker wears a Seal Yellow NEW pip on its tag; screen readers hear "3 new stickers since you last looked". Reduced motion fades the whole pile in over 150ms. While Explore loads, today's badge and faint die-cut shapes on its floor stand in (the skeleton), and the fall-in is the arrival.
- **Screen readers and keys:** a section per day ("Today", "Yesterday", "September 24"), each an ordered list of buttons newest first, named like "No.0147 by @mika, 5 min ago" and ", given to @ken". Older days arriving are heard as "Older stickers added, back to September 24". A focused sticker rises to the top of the pile, lifts 2px and gets the house focus ring around its cut; Enter or Space lifts it.

### Lifted sticker

Tapping a sticker in Explore's pile lifts it into a bottom sheet over a 36% Ink scrim.

- **The sheet:** the sticker in a 210px square with live resin under the one light, the plain artist chip, fine print (No. · drawing time · date, and "to @ken" when it was given), "Go to @mika's sticker board" on label stock (Explore has no key) and a Put back quiet link. Small flat carets either side of the sticker page to the previous and next one in pile order, newest first.
- **The flight:** the sticker peels up from its spot in the house peel (280ms, 3D lift at 35%) and flies into the sheet as the sheet rises under it; its spot keeps an 18% ghost. Put back, the scrim, the perforation, Escape and LINE's Back play the flight backward at the stick's pace, and it sticks down with the settle and gloss sweep.
- **Paging:** a sideways swipe, the carets or the arrow keys. The new sticker slides in from its side; the old spot fills back in and the new one fades to its ghost.
- **Reduced motion:** the sheet and the ghost crossfade in 150ms, with no flight.

### Hit counter

A combo's length, shown the way fighting games show it: "64 HITS" (`UI.hits`).

- **The look:** Figure numerals leaning 11°, HITS after them in small caps, and three pink speed lines trailing off the number's left side as if it had just slammed in.
- **The pink stays off the digits,** so a count never reads as struck out.
- **Where:** the Best combo figure on Explore's leaderboard (23px) and in the stat board's Bests (20px); in the Mini-game, beside the multiplier from the second hit (20px), and on its receipt.
- **Nothing like the multiplier:** no ×, no tag and no puffy face.

### Selection handles

A selected sticker on the board shows a clear frame (a 1.5px line at 50% Ink, 10px outside the sticker, with 10px corners). Four 20px corner squares in Liner Lift with an ink edge resize it. A 28px round knob with Phosphor's arrow-clockwise icon rotates it, on a 20px stem above the top edge. Every handle has a 44px hit area. The frame turns full Ink while a handle is being dragged. The toolbar sits under the sticker, or over it when there's no room below or Draw is in the way; with room on neither side it overlaps the sticker's edge away from the knob, never its middle, where a second tap opens it. Arrange, the toolbar's last tile, opens its step tiles in two rows on the side away from the sticker, so the row stays put wherever the open toolbar still fits; once opened, they stay out for every selection on that phone. A held step tile repeats its step, faster the longer it's held. Once steps go quiet, screen readers hear what the last one did, or that the board's edge or a size limit stopped it.

### Sticker tray

Your whole collection, in a pink canvas tray zipped down the board's right edge. The zipper is the tray's alone.

- **Zipper:** drawn from the real part. Two woven tapes in Tray Tape with white stitching, white molded teeth in two rows offset by half a pitch (12px), a top stop on each tape, a bottom stop across both, a white painted-metal slider, and a Bonbon Pink paddle pull hinged on its bridge. It's matte, lit flat from the top left.
- **Opening:** it opens top down. The slider rests at the top, just under the board header and its gifts badge, with its pull hanging down. Pull down and the slider follows with a little stiction and a tick per tooth, and the teeth part behind it, showing the lining. Released under 25% of the travel it springs shut, the teeth meshing back in a ripple; past 25%, or flicked, it runs on and knocks the bottom stop, a pull's length above the board's foot, and the mouth overshoots and settles at half the screen. The sheets fill the open pouch down to the bottom stop: their pages grow taller to fill its height, so it shows no bare lining or closed teeth under them. Both top stops are sewn into the seam at the mouth's top corner and never move. Push up or tap to close. It can be interrupted at any point.
- **The pull:** it hangs down from its hinge, shut or open. Touched or held, it lifts out of the tape toward you, its free end nearer and its shadow falling longer down and to the right; pushed up, it turns over to point the way it's pulled. Let go, it falls back under gravity, bounces on the tape and hangs down again. A knock at either stop makes it jump off the tape and fall back.
- **Idle, nudge and shake:** until the tray has been opened three times, or while something NEW is inside, the pull tugs itself at most twice a visit; an empty tray never tugs. On those first three visits the open tray's front sheet also lifts a little at its tear strip and settles back, once a visit, a moment after the slider reaches its stop; any touch on the open tray calls it off. A jolt of the phone (only with the app's existing motion permission) swings the hanging pull out toward you, no higher than one jolt throws it, and it falls back and settles hanging down; the slider and the chain stay put, and the hand's tremor is ignored. It never opens the tray. A Seal Yellow pip on the pull marks something unseen inside, and the pull's name says so.
- **The sheets:** inside is a stack of loose 156px-wide backing-paper sheets, whose pages grow taller (364px at least) to fill the open pouch above the stack's dated edges. Each has a perforated tear strip at the top to grip, and its date range and number printed on its foot. Up to three sheets sit behind the front one, each 15px lower, 2.5% narrower and a shade darker, so their dated edges show below it and the stack is its own index. Deeper sheets collapse into a "+N" pill with Phosphor's stack icon. The tray opens on the newest sheet. On a short phone the stack scales down to fit the open mouth, its dates staying at the 11px floor, and the dated edges share the room below the front sheet as touch bands. On a large screen it grows instead, up to 1.5×, the tray's column and the mouth's travel growing with it, and the pages grow taller for the room left; the dated edges, +N, the NEW dots and a pulled-out sheet's X keep their size. Only the front sheet takes focus: the folder tabs come first, then its stickers, named by number, then the dated edges and +N.
- **Packing:** stickers are laid organically on their real cut lines, at least 6px apart, in arrival order, bottom up so the newest sits highest, with small seeded turns and never shrunk; a taller page holds more, and a resize or rotation packs them again for the new height. On a given screen a sticker's spot is permanent: an earlier one never moves, and a given sticker's spot stays, drawn as its faint cut line.
- **A given sticker's spot:** once someone has received it, its spot is a button with its cut line traced on the paper (the used ticket's faint dashed line), named for screen readers like "No.0001, given to @bob. Open it". A tap opens the sticker among the stickers you gave: who has it, its Transfer Trail, and the Gratitude it earned with its replay. It takes the shared press and shows only that outline; a sticker on its way waits in its spot under the sleeve's frost, inside its cut line; it never peels, and a tap opens it among your stickers ("No.0147, on its way to @bob. Open it").
- **Holes:** a sticker out on the board leaves its kiss-cut hole in its packed spot: plain backing paper with the faint maker print, a crisp cut line and a hair of shadow on the top-left inside edge. Tapping a hole shows that sticker on the board. A hole for a sticker that arrived today is NEW until the tray is opened. One polite status line says what the tray did: the filter's sheets, the sheet in front, a sticker stuck on or back in the tray.
- **Paging:** the stack is a cyclic deck. Swipe up and the front sheet tucks in at the back; swipe down and the back sheet comes to the front; tap a dated edge and that sheet comes forward, riffling through the ones before it. The first 10px lock the direction: mostly vertical pages, wherever it started; horizontal toward the board peels a sticker if it started on one, or pulls the sheet out if it started on paper. PageUp and PageDown page too.
- **Folder tabs:** All (liner), Mine (pink) and Gifts (grape) stand up from the stack's top edge, 46 × 24px padded to 44px. The current one is full hue and lifted; the others are soft fields. A tapped tab stands up (220ms, `--ease-out`) as its fill and shadow come in (160ms), and the tabs take the shared press with 1px of travel; under reduced motion a tab stands up at once and only its color changes, in 120ms. A filter chooses sheets and never moves a sticker: in about 650ms the stack gathers into the mouth, the front sheet and every sheet without a match slide back into the tray, the rest riffle, and the newest match is dealt onto the front. Stickers that don't match fade to 20%. Reduced motion crossfades.
- **Pulling a sheet out:** drag the front sheet's paper toward the board and past about 60px it floats over the board at full size with the floating-sheet shadow and an X at its top left (a 30px Liner Lift disc with Phosphor's x). The tray sags to a crack. Stickers peel or tap off it; board stickers whose hole is on it drop back in. The X, dragging it back, closing the tray or opening the spread sends it home on top of the stack. One sheet out at a time.
- **The spread:** the +N button deals every sheet onto the tray's lining, front first, dates kept at the 11px floor. Tap one to bring it to the front; tap the lining or press Escape to put them back.
- **Peel and snap-back:** press a sticker and its edge lifts; drag and it rides under the thumb while the mouth relaxes to a crack and the sticker's own soft shadow previews where it lands. Drag a board sticker to the right edge and the tray opens to its sheet, its hole breathing in Ink until it drops in.
- **Reduced motion:** the pull toggles and the open tray fades in over 150ms; paging and tab changes cross-fade; the peel lifts without a tilt; no idle tug, no grip nudge and no shake.

### Gift bag

A frosted bag with no zipper. Packing drops the sticker into the open bag, peeking out of its mouth. The bag closes only when the send succeeds: the sticker settles in, the mouth presses shut, and the film band goes on. It's built like a konbini wrapper: a clear film band fused across the mouth, with a Soda Aqua tear tape running through it, printed with the pull direction and "CLOSED 9.23". The tape's loose end is the pull tab: a narrow neck leaves the film at the bag's left edge and widens into a rounded lobe that sticks out past the edge, tips up and casts a shadow, with three grip ribs moulded across its free end and PULL printed on it.

- **Opening:** the receiver takes the tab and drags it along the strip. The tape tears out behind it with resistance, lagging the finger and advancing in small ticks, and hangs from the tab in a loop that grows as you pull. Behind it the film splits along its line, rimmed by a thin torn edge, showing the bag's pale inside and the top of the sticker's sleeve. Let go early and it settles back. Past the end it snaps free, the tab flies off, the mouth springs open, the sticker rises, and the receive dialog slides up.
- **On a large screen:** the giver's header, the bag and its hint grow together, as the Mini-game does, up to 1.4× while they fit the window with the hint clear of the home indicator, and stand centered as one group; the tab stays under the finger along the grown strip, as on a phone, and the Accept card stays a 400px card.
- **Alternatives:** a looping hint shows a small pull; double-tap or press-and-hold tears it by itself; for keyboards and screen readers the tab is a slider. Under reduced motion there's no loop and the snap becomes a fade.
- **Can't be received here:** the screen that says why shows the bag as it stands, a closed one without its pull tab, so nothing invites a pull.
- **The tag** is printed, never typed. It reads "For @name" when the recipient was chosen in the app, and "From Alice" when it went through LINE's picker. An opened bag carries a rubber OPENED date stamp on its tag.

### Timelapse

The sticker detail plays how a sticker was drawn, stroke by stroke, in the sticker's own spot. It's never called a replay: that word belongs to the gratitude card.

- **The button:** a small label-stock button, "Timelapse" with Phosphor's play, at the end of the fine print ("by @mika · drawn in 2:51 · 9.26"). It shows in your stickers and the ones you gave, only for a sticker sealed with its timelapse, once the detail's answer is in. Every state's label shares one cell, so it never changes width: Loading…, Preparing… while the fills get ready, then Skip (Phosphor's skip-forward) while it plays.
- **Where it plays:** white paper cut to the sticker's silhouette covers the figure, the same size in the same spot, and the ink comes back inside it as it was drawn, eraser included. The silhouette, cast shadow, kiss-cut and foil stay put around it, and ink outside the final cut never shows. Fills spread in a circle from where they were tapped.
- **Length:** 2.5–6s, longer for a sticker that took longer; up to 20s for a sticker drawn in Kyoto Seika Manga Expression Practice Mode, whose clock runs ten times longer. A fill's reveal never takes more than its longest. Every stroke keeps its own pace; only the pauses between them shrink.
- **The end:** the finished ink holds 300ms, the paper fades out over 400ms onto the real sticker's resin, and the sheen sweeps once, as when it was sealed.
- **Skip and stop:** Skip, or a tap on the sticker, jumps to the finished ink and the reveal. Paging, Escape, Back and closing stop it at once, and the paper goes before the sticker flies back to the board.
- **Failure:** the paper goes, and the error line under the fine print says "Couldn't load the timelapse: {reason}" in the app's language, with Try again and the player's own words as details.
- **Reduced motion:** the strokes still play, since nothing crosses the screen; fills appear whole, and the end is a 150ms fade with no sheen.
- **Screen readers:** the paper is hidden; one polite line says "Playing how No.0147 was drawn", then "Done". The button reads "Timelapse: watch No.0147 being drawn", then "Skip to the end", and focus stays on it.

### Sticker trail

A sticker's detail shows where it has been, one quiet row per hand-off, newest first, replacing any separate provenance line.

- **One open row:** the most recent gratitude opens by default: a Liner Lift card with a pink outline, the amount in Figure type at 27px beside a pink heart dot, who it's from, and the screen's only Replay button. While you still owe gratitude for the newest gift, none opens: Send gratitude is the call.
- **Closed rows:** a sentence ("@mika gave it to @ken · 9.18") and a trailing amount with a caret, as one full-width 44px tap target. Tapping one opens it and closes the other. Every row keeps one head button, open or closed, that says whether it's open; tapping the open one closes it and stops its replay. The viewer reads as "you". Names are Ink and bold; "gave it to" and the day are Graphite. The artist is named once, in the by-line, so rows carry no artist tag.
- **The artist's fifth:** when the giver isn't the artist, the open row adds one line under a hairline rule: "2,357 to @ken · 590 to @mika, its artist", or "590 of it came to you, its artist". Copy never uses money words.
- **Calm at length:** past the newest gift, the rest fold into one "N earlier gifts" control, with a caret, directly under it.
- **Order:** when you can give the sticker, Give sits above the gratitude card (the open row); otherwise the actions stay below the trail.
- **The number:** No.0147 sits on a Seal Yellow label at the house tilt, in Dela.
- **In flight:** a Liner Lift note with the gift bag's frosted sleeve. Sent, it takes Give's place, tape across the sleeve's mouth: "On its way to @bob" once the app knows who it waits for (the person picked in the app, or whoever first opened its link), and "On its way" until then, since LINE's picker never says who was picked. A gift still in the bag shows the open sleeve and "In the bag", with Give still the key. Take it out, a quiet link under the note, takes it back: at once from the bag, and once it's sent after a confirm in place, as Mark 18+'s, "Take No.0147 out?", whose Cancel takes focus first. While it runs it reads "Taking it out…", and leaving the detail doesn't stop it; a failure stays under the note with Try again and Dismiss. Once it's out, Give is back and takes focus, and screen readers hear whether the sticker went back on the board or into the tray.
- **On a large screen:** the sticker grows up to 1.5×. Wider than tall, the sticker, its carets and its timelapse sit centered on the left, and a phone-width column beside them scrolls on its own, so opening a row or playing a replay never scrolls the sticker away; upright, it's one centered phone-width column under the sticker.

### Mark 18+

The detail of a sticker you drew that isn't 18+ yet ends in "Mark 18+…", a Graphite quiet link at its very foot, under Give and the Transfer Trail: quiet until asked, and never a key.

- **The confirm:** a tap swaps it in place for a Liner Lift label: "Mark No.0147 18+?", then what marking does (pink foil, and blurred and unreceivable for anyone without Show 18+ stickers), "You can't undo this." in bold, and that anyone who has already seen it may have kept a copy. Cancel, a quiet link, takes focus first, so Enter alone never marks; the small tomato label stock beside it, Mark 18+, marks, since it can't be undone. Cancel and Escape close it with nothing marked, and focus goes back to Mark 18+…. While the mark is on its way, the button reads Marking… and nothing closes the confirm.
- **Marked:** the sticker shows as the server's answer has it, with pink foil, and veiled with no Timelapse for you without the opt-in. Mark 18+… goes, focus moves to the detail, and a status line in its place, a 13px Graphite supporting note, says "No.0147 is marked 18+."; without the opt-in it adds that Show 18+ stickers in Settings shows it unblurred. The board loads again, and the board kept on the phone is forgotten.
- **Refused:** the error line under the confirm says why, with the words behind it for a report, and the confirm stays for another try.

### Gratitude replay

The trail's open row plays its gratitude combo back inside the card, never in a modal.

- **Replay:** the pill turns to Stop (Phosphor's stop), and a stage eases open inside the card, between the amount and the artist's share (200ms, height and opacity): the card's inner width by 300px, on the Mini-game's Liner with a hairline edge. The amount and the heart dot stay above it as the card's header. The replay loads on the press; until it arrives the stage is plain Liner.
- **What plays:** the combo as it was recorded, through the Mini-game's rules as they were when it was played and its effects, at the stage's scale: the drain bar and amount along the stage's top, the multiplier, the tiers, pop-in words and mini hearts. Every tap plays where and when it landed; a shake plays from its unlock; a stroke plays its recorded passes. The same combo draws the same words every time.
- **Length:** a combo of up to 4s plays in real time; a longer one plays sped up to take 4s, at most twice as fast.
- **The landing:** no receipt. The heart shrinks into the card's pink heart dot, the 27px amount pulses once, and after a 600ms beat the stage eases shut, with the landed heart and total still in it, and the pill reads Replay again.
- **The amount is the record's:** the card always shows the stored total, and a replay that counts differently ends its bar on it.
- **Stop:** Stop, Escape, paging, or opening another row ends it at once and shuts the stage. Scrolled off screen, it holds still until it's back.
- **Watched:** the giver's first replay of new gratitude marks it watched as the heart lands.
- **Failure:** the stage shuts, and the error line under the card says "Couldn't load the replay: {reason}" with Try again, or "The replay stopped.", with the engine's own words as details.
- **Reduced motion:** it plays through the Mini-game's reduced path: fades for flights, no screen shake and no climax. It follows the setting mid-play.
- **Screen readers:** the stage is hidden; one polite line says "Replaying @bob's 2,946 gratitude", then "Replay ended". The pill reads "Play the replay of @bob's 2,946 gratitude", then "Stop the replay", and focus stays on it.

### Gratitude

One experience for everyone, on plain Liner, once per hand-off.

- **The combo:** the first tap starts a timer game. A drain bar appears full and runs down; each tap adds less time than the last. The amount counts up in Figure type beside a puffy multiplier sticker (×1 to ×8) driven by tap speed, and from the second hit the hit counter beside it. Past three digits the amount steps down a size per digit, so the row fits a 360px phone. Nothing sits on or over the heart, and the heart holds its spot. The X ends a combo in play and shows its receipt; before the first tap it closes.
- **Tiers:** reached by the amount (ありがと, 照れ, ドキドキ, オーバーヒート, 昇天). Each new tier slams its name in outlined 袋文字, and pop-in words from a per-tier bank appear and go, never on the heart, another word or a slam; a slam hurries the words in its band away. The ground escalates from calm Liner to a blush, focus lines, heat haze and a white-out.
- **Mini hearts:** from ドキドキ up, taps spray small pink hearts that bounce, collide and pile along the bottom before fading. A tap shoves nearby hearts away, harder the closer they are. The heart sweats hearts: a slow drip at ドキドキ, a real sweat at オーバーヒート, heavier at 昇天, all landing in the same pile with 昇天's rain.
- **Discovery:** stroking the heart stretches it along the drag, and after three tries a tip says what to do. After the one motion opt-in, it sways with the wrist, and shaking hard says "Keep shaking!".
- **After:** the receipt shows the amount, the best multiplier and the combo's length as the hit counter. Its title and a note say what became of the send: sent, still sending, saved on this device to go when it can, neither sent nor saved, or refused and why, with the words behind a refusal nobody foresaw as details for a report. A refusal also shows on the gift's sticker detail until dismissed. The sticker's trail replays the combo inside its card (Gratitude replay).
- **On a large screen:** the top band, the HUD and the receipt keep a phone's width in the middle, the receipt as a card; the ground, the heart and its effects take the whole stage, and the game grows with it, up to 1.5×.

### Loading

- **Skeletons:** while a screen loads, it shows its own layout in outline, never a "Loading…" line: blocks of pressed Liner (Liner Deep) with a slow white shine passing over them, real headings and tab labels where they're fixed. Explore outlines today's floor with faint die-cut shapes, or the leaderboard; the ticket shop its balance and pack rows; the sticker board faint die-cut shapes where stickers usually sit; the stat board its papers' figures as blocks. A screen reader hears one status line ("Loading Explore", "Loading your stats").
- **Reveal:** loaded content rises 6px into place and fades in over 220ms. A picture (a sticker, a photo sticker) holds back until its image has loaded, then fades in whole, never half-drawn.
- **Tabs:** changing tabs swaps the screen at once and fades the new one in over 300ms on a gentle ease, settling up 8px from 98% size; it takes taps from its first frame. The tab bar changes crisply around it. Explore, once visited, comes back as it was left: its search, scroll, pile with the days it has loaded, and lifted sticker, with its data refreshed quietly behind it.
- **Reduced motion:** no shine and no rise; tabs change at once.
- **The last board:** the sticker board a phone last showed is kept on it for the person signed in, so the next open draws those stickers at once, with no outlines, and swaps in the fresh board when it lands. It can be one refresh out of date. A large screen draws it at once only if it has a large layout.
- **The board first:** while the board assembles, nothing else downloads. The stat board, the sticker detail, Giving, Explore, the Gratitude Mini-game and the drawing screen load once every sticker on the board has decoded and a quiet second has passed. Draw tapped before then opens the drawing screen on plain Liner for the moment its code takes.

### Error line

Every failure the app shows is one sentence in the app's language, saying what failed and what to do: 500 13px Ink on Tomato Soft, 6px corners, announced as an alert.

- **Try again:** a quiet Ink link after the sentence, only where asking again can work; a second link (Reload, Dismiss) where one fits.
- **Details for a report:** under the sentence, a fine-print label, the words behind the failure in their own case (usually English), and Copy, which copies them whole. When the clipboard refuses, a line under the details says so until the next try, and the words show whole to select by hand. Raw words never sit inside the sentence.
- **Its own screens:** the sign-in gates, the ticket cards and the Receive dialog's end screens keep their own title and bold line, and show their details the same way.

### Toast

An Ink slip with Liner text (600, 14px) and 6px corners on the lift shadow. It rises 10px in and sinks out.

### Icons

Every icon is Phosphor Icons (MIT) as `@phosphor-icons/react` 2.1.10 renders them, through one registry: `apps/frontend/src/icons`. An icon that carries one of the app's meanings goes by that meaning there (`DrawIcon`, `GiveIcon`); the rest keep Phosphor's names. The app's own controls use bold; fill marks an active or primary state, such as the current tool or the current tab; the mocked LINE and iOS screens use regular. The same action always gets the same icon:

- **Draw:** pencil-simple-line (fill), on every Draw action: the board's Draw key, Keep drawing, the print on fresh ticket stubs and the chat menu's Draw tile. The brush tool keeps paint-brush; it's a drawing tool, not the Draw action.
- **My board:** house, on the tab (bold, fill when current), every "go to the board" action, and the chat menu's My board tile (bold) and Open Sticker Board key (fill).
- **Explore:** map-trifold. **Shop:** tote-simple, on the tab and every way into the Shop.
- **Gratitude:** heart (fill) at every size, since it's a mark, not a control: Send gratitude, the Transfer Trail, the combo HUD, the stat board's receipt and Best day, your gratitude events, and Explore's Most gratitude figures. **Streak:** fire (fill).
- **Give** is gift, **View** eye and **Remove** sticker (a peeling corner).

Screens that build their DOM from strings (the mini-game, the tray) carry copies of Phosphor's paths; `phosphorCopies.test.tsx` checks each against the installed package.

**The Never Hand-Drawn Rule.** Icons are never drawn by hand and published paths are never edited. If Phosphor doesn't have it, choose a different Phosphor icon. A text glyph (♡, ★) never stands in for an icon.

**Brand marks** (Sui's droplet and full logo, files byte for byte from Sui's brand kit at live.standards.site/sui-media-kit; LINE's logo from Simple Icons or LINE's guidelines) and illustrations (the heart you tap, stickers, avatars, pins, tape, stamps, zipper parts) are not icons. Brand marks are their owners' files, never redrawn, recolored, outlined or glinted, and keep the clear space their kits ask for.

### Chat menu

The official account's menu under its chat in LINE, drawn as the board foot. LINE shows the 2500 × 843 image 390 wide, so it's drawn at 390 × 131.5 from the app's own tokens, key and label stock (`deploy/line/returning-menu.html`), and `pnpm --filter frontend chat-menus` renders every version.

- **Returning:** the Draw key (Seal Yellow, Phosphor's pencil-simple-line in fill) sits in the left 1409px, Draw's tap area. My board and Explore are pink and aqua label stock stacked on the right, 10px apart, with house and map-trifold in bold. The house gutter runs round the edges and between the columns.
- **Tickets:** LINE can't vary an image per person, so each ticket state is its own menu, linked person by person. The tickets tuck 16px behind the key's right end, as on the app's Draw key: a Seal Yellow ticket ×3, ×2 or ×1; the blue reserve ticket, with no count, once only reserve tickets are left; and at none, the used backing printed with Tokyo's midnight (12:00 AM, or 0:00). The key keeps one width (136px) in every ticket state, so only the tickets change; the plain menu has no tickets, and its key fills the area. It shows counts, never the three-a-day rule.
- **New people:** one large key across the image, Japanese over English (シールボードをひらく, Open Sticker Board), since it can't know their language, with the sticker board icon as tall as both lines (30px). It uses the greeting's words.
- **Words:** the app's own (Draw, My board and Explore; かく, マイボード and 発見). Each tap area's screen-reader label says what the image shows, in at most 20 characters ("Draw, 2 tickets left").

### Mocked platform screens

The LINE chat, the Gift Message, consent, share picker, Add friends screen and iOS notification banners use the platform's own native type, white and system greys, and LINE's green. They're faithful mimicry, and the world's materials (keys, labels, the press) never leak into them.

### Designed, not built yet

Designs the app doesn't show yet. PRODUCT.md's Not built yet lists them too.

- **Gratitude glow:** gratitude shows on a sticker as a soft glow behind it, warmer and brighter with more gratitude, from faint pink (#FF7EB6) toward amber (#FFB13B).
- **The giver's pink tag:** a pink tag on the board's edge tells the giver new Gratitude arrived; its card plays the combo's Gratitude replay.
- **Share my board:** your own stat board's controls add Share my board (an aqua label) and QR code, sharing your sticker board as a link or a QR code.

## Do's and Don'ts

### Do:

- **Do** put Ink text on every coded field (seal, aqua, pink, grape, tomato).
- **Do** use exactly one key per screen, for the primary act, with the secondary action as label stock or a quiet link beneath it.
- **Do** let the shared press drive every key and label; animate the press on translate only.
- **Do** animate only transform and opacity. Use the spring curve for release and springs, the exponential ease-out for settles and reveals, and the peel curve for peel, stick and pop.
- **Do** take the Mona Sans width from the shared width tokens: 100 for UI, 112 for titles, 87.5 for fine print and 125 for figures.
- **Do** keep every in-phone text size at 11px or above.
- **Do** cast shadows down and to the right from a top-left light, in neutral Ink alpha.
- **Do** show gratitude figures plainly, to everyone: in the combo, the receipt, the sticker's trail and the stat board.
- **Do** use icons from the registry only: Phosphor bold at rest, fill for an active state, regular inside the LINE and iOS mocks.
- **Do** give every touch target a 44px hit area, including small labels, quiet links, sticker handles, folder tabs, the +N stack button, a floating sheet's X and the zip pull.
- **Do** put foil on every sticker drawn by someone other than the board's owner, and name its artist with the artist chip.
- **Do** lay out by the window: a touch screen at least 600 × 600 is a large screen; anything smaller, and a computer's phone frame, keeps the phone layout.
- **Do** honor reduced motion. Durations collapse to 1ms, presses halve and lose their spring, the tray, paging and tab changes fade, the board's turn crossfades, the foil holds still, and the gift's snap becomes a fade.

### Don't:

- **Don't** put white text on a coded field.
- **Don't** use green anywhere in the world. LINE's #06C755 belongs only inside LINE's own mocked UI.
- **Don't** put gloss, a highlight line or a sheen on any control.
- **Don't** restyle a key's or label's face or base, or add your own pressed transform to them.
- **Don't** put holo foil on the board owner's own stickers, put foil on surfaces that aren't a board, or use it as a rarity grade. Pink foil and the Kyoto Seika Practice Mode foil are the only foils your own stickers wear. The pearl rim is retired.
- **Don't** set headings or body text in Dela Gothic One.
- **Don't** put a second key on a screen, or give a key to a tomato (can't-undo) action.
- **Don't** put a zipper on anything but the tray. The gift bag tears open along its tape.
- **Don't** stretch a key, card or sheet across a large screen: controls keep their phone sizes, and the room goes to the board, the pile and the drawing sheet.
- **Don't** put stats in a sheet or a big-number card; they live on the stat board as paper.
- **Don't** show grid paper anywhere; hint paper with liner stock and the faint maker print.
- **Don't** describe gratitude with money words (royalty, earn, reward, cut, share, %). It flows "to" people. "Residual", the tag on your gratitude events' Original Artist Gratitude Share rows, is the one allowed exception (ad0ll, 2026-09-26).
- **Don't** hand-draw an icon or edit a published path. Brand marks and illustrations are the only exceptions.
- **Don't** use Canvas white as a page ground. It's for drawing surfaces and white label stock.
- **Don't** use NFT, crypto, token, wallet, mint or similar words in visible copy. The one exception is "on-chain", in the line saying a seal isn't confirmed there yet.
