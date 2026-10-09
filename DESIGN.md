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
- Light only: no dark theme, and it stays light where a browser would force pages dark (`color-scheme: only light`, `darkreader-lock`), so stickers keep their colors.
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

- **Soda Aqua** (soda-aqua): giving.
- **Bonbon Pink** (bonbon-pink): gratitude, and you. Gratitude has one mark wherever it shows, Phosphor's filled heart (GratitudeIcon), in Bonbon Pink.

### Tertiary

- **Grape** (grape): received.
- **Blue** (blue): the Shop and reserve tickets. Opposite daily tickets' yellow, so the two kinds of ticket can't be confused.
- **Tangerine** (tangerine): the streak.
- **Tomato** (tomato): can't undo. Stopped states and warnings. It's never a key.
- **Foil** (foil-pink, foil-peach, foil-lemon, foil-aqua, foil-sky, foil-lilac): six iridescent bands that flow along a sticker's foil band and turn in the ring round the artist chip's picture. It isn't a fill color. It's a material worn only by a sticker drawn by someone other than the board's owner, with the two exceptions in the Other Hand Rule. It has no green.

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
**Yen:** every amount shows in yen, with the half-width ¥ (U+00A5) that Mona Sans carries, never the full-width ￥ Chromium writes for Japanese, which falls back to another typeface.

**Character:** Mona Sans is the label stock, a precise and slightly technical sans that changes width with the job. Dela Gothic One is the puffy voice, heavy and rounded, and it belongs on the key and on the moments gratitude shouts.

### Hierarchy

- **Display** (400, 20px; 23px on the large key, 17px on the compact key; line-height 1): the key's label. It also sets dot badges, the gratitude multiplier, the giver's gratitude tag, the outlined 袋文字 tier captions (pink inside white inside ink), and the deal's 書き文字 hand lettering.
- **Figure** (900, line-height about 0.95, width 125, proportional figures, sized to its place and never under 11px): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the stat board, and the hit counter.
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

Croquis lays out by the window, never the device (`ui/largeScreen.ts`). A touch screen at least 600 × 600, such as an iPad's browser either way up, is a large screen: the same Sticker Trade Book composed for the room rather than stretched, where controls keep their phone sizes and the room goes to the board, the pile and the drawing sheet. Anything smaller keeps the phone layout: Split View, Slide Over, a short Stage Manager window and LINE's sheet on an iPad. A computer with a mouse and no touch screen shows the phone layout in a phone frame. The layout follows the window as it turns or resizes. The sections below describe the phone layout unless they say otherwise.

The phone layout is designed on a 390 × 844 iPhone viewport, and it's upright only: a phone on its side shows the upright cover over everything until it's turned back (`ui/sideways.ts`).

The spacing rhythm steps in 4px units, and 12px is the house gutter. Tabs sit on a 12px inset with an 8px gap, and sheets pad 18–20px on the sides and 24px at the foot, over the home indicator's safe area where a sheet reaches the screen's foot. Controls anchor to the thumb zone. The key sits low, usually bottom right or centered at a sheet's foot, with any secondary label or quiet link directly beneath it.

The sticker board is free-form, not a grid. Stickers sit wherever they were dropped, at their own size and slight rotation. Explore's pile is a heap of real die-cut stickers, never a grid or a feed. No surface shows grid paper: paper is hinted by the liner stock and the faint diagonal "SEAL · シール" maker print, never a full grid.

## Elevation & Depth

Depth is physical, and it comes from a single light at the top left. Every cast shadow falls down and to the right, uses neutral Ink alpha and is layered in two parts, a tight contact and a soft throw. Controls get their depth from thickness, not shading: a key sits on a 6px lip and a label on 3px of paper, and the base casts the shadow, so pressing never darkens the lip. Stickers get their edge from a 0.5px kiss-cut groove drawn as a drop-shadow on the alpha, so the silhouette casts the shadow rather than a box. On a foil sticker the band is the edge: the kiss-cut and the cast fall from the band's outer edge, and nothing lies between the white edge and the foil.

Stickers and the gratitude heart also respond to the app's one moving light. The shared light variables run from -1 to 1. They follow the phone's tilt where the browser allows it, read from gravity's direction so they never jump as the phone passes upright, easing into the edges and gliding to each new tilt; a mouse or pen moves them too, but never a finger, which is busy dragging and turning stickers. They idle-sway on an 11s loop so stills look alive. Buttons don't follow the light; they have no highlight to move.

### Shadow Vocabulary

- **Key base** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 2px 6px 12px -3px rgba(28,24,36,.24)`): under every key, cast by the still base.
- **Label base** (`box-shadow: 0 1px 0 rgba(28,24,36,.06), 1px 3px 5px -2px rgba(28,24,36,.16)`): under label stock.
- **Label** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 1px 2px 3px rgba(28,24,36,.08)`): a flat label resting on the liner, such as the tool strip or a chip.
- **Lift** (`box-shadow: 1px 3px 4px rgba(28,24,36,.12), 3px 10px 22px rgba(28,24,36,.14)`): something held above the page, like a toast, the Smoothing bar or the color popover.
- **Sheet** (`box-shadow: 0 -1px 0 rgba(28,24,36,.06), 2px -8px 28px rgba(28,24,36,.12)`): a bottom sheet rising over the page (see Bottom sheet).
- **Kiss-cut** (`filter: drop-shadow(0 0 .5px rgba(28,24,36,.55))`): the die-cut groove around every sticker, round the foil band's outer edge on a foil sticker.
- **Sticker cast** (`filter: drop-shadow(1px 2px 1.5px rgba(28,24,36,.16)) drop-shadow(2px 6px 8px rgba(28,24,36,.10))`): a sticker shown off a board, such as on a sheet, a card or its detail. It's always paired with the kiss-cut. A foil sticker casts it, and every lifted shadow, from a still copy of its band's shape.
- **Board cast** (`filter: drop-shadow(.5px 1px 1px rgba(28,24,36,.20)) drop-shadow(1px 2.5px 3px rgba(28,24,36,.08))`): a sticker stuck to a board, close to it, yours or someone else's: a contact line and a short, faint throw, enough to show which sticker lies on top. It's paired with the kiss-cut and cast from a still copy of the silhouette, or the foil band; the cast baked into the image doesn't show there. A sticker in your hand casts a lifted shadow instead.
- **Peeling** (`filter: drop-shadow(3px 7px 5px rgba(28,24,36,.18)) drop-shadow(8px 16px 18px rgba(28,24,36,.12))`): a sticker lifting off, tilted in 3D by 11°.
- **Floating sheet** (`box-shadow: 0 0 0 .5px rgba(28,24,36,.18), 3px 7px 8px rgba(28,24,36,.16), 8px 18px 30px rgba(28,24,36,.18)`): a sheet pulled out of the tray, hovering over the board.
- **Pinned note** (`filter: drop-shadow(0 1px 0 rgba(28,24,36,.12)) drop-shadow(2px 5px 5px rgba(58,36,16,.26))`): paper hanging on the stat board, from its pin or tape.

### Named Rules

**The One Light Rule.** There's one light for the whole app. Static shadows fall down and to the right from the top-left light, and every moving highlight (the sticker specular and sheen, the foil's glint, the Kyoto Seika Practice Mode foil's scraped highlights, the heart's gloss) reads the shared light variables, as does a crease's shading, the one shade that moves: cast shadows stay put. Don't add a second light source; the Shop's previews are the one exception, lit by the Shop's own looping light since their swatches are too small to tilt. The foil's glint sits where the light falls, the same way on every sticker whatever its turn, and holds where the last tilt left it; before any tilt it rests top-left. Only the foil's bands run on their own clock, flowing on a 7s loop staggered per sticker, under a grating that never moves. They hold still under reduced motion.

**The Neutral Shadow Rule.** Shadows are Ink alpha, never tinted. The one exception is the stat board: paper, stamps and pins cast a cork-brown throw (rgba(58,36,16,…)) over an Ink contact line, because a shadow on cork is darker cork. The one colored light is kept for a sticker's gratitude glow, not built yet: faint pink (#FF7EB6) warming toward amber (#FFB13B); those two hues belong to the glow alone.

**The No Gloss Rule.** Controls have no gloss, highlight line or sheen: keys, labels, tabs, the zipper and the gift's tear tape are lit flat, with an edge and a contact shadow at most.

## Shapes

Corners come from paper and cut stock, and every control's corner is a step of the `rounded` scale. Label stock uses an 8px radius, as do the sticker detail's thumbnails and the board's name button, and toasts, fields and index tabs 6px. The draw screen's small parts take 6px too: the tool tiles (like the strip they sit in), the size rail's thumb and number, and the PAUSED tag. Slider tracks, the brightness bar and the combo's speed lines are pills. The tray's folder tabs round only their top corners, where they stand up from the stack. Keys are 16px (18px large, 14px compact), which reads as a key, not a pill or a tile; the seal check is a round 58px key. Zip pockets use 10px, the open trail row 12px, bottom sheets 16–18px on their top corners, the Send gratitude sheet and the color popover, floating clear of the edges, 16px all round, and paper a paper-like 4px (`paper`): the drawing sheet and the tray's loose sheets. Dot badges are pills tilted at -4°, as if one hand stuck them all. The same -4° tilt carries onto photo stickers.

Stickers have no radius. Their outline is the artist's own stroke silhouette, offset by a white border and bounded by a kiss-cut groove. A given sticker leaves the board, and its spot in its tray sheet keeps only a faint dashed outline of its cut, as a used drawing ticket does. A sticker out on the board leaves a kiss-cut hole in its tray sheet, and a used drawing ticket keeps a faint kiss-cut outline of the sticker it became. Sheets begin with a perforation row, a dotted line with a firmer run of holes at the center as the grab. A sheet that can't close, as at time's up, keeps only the plain holes: no grab, and no stop for Tab. Only the tray has a zipper; the gift bag closes with a clear film and an aqua tear tape whose tab sticks out past the bag's edge. Paper on the stat board has torn or cut edges of its own kind: a receipt's zigzag foot, a calendar leaf's and a notebook scrap's torn tops, a stamp's perforated edge, washi with torn ends, and slightly skewed label-maker tape.

## Components

### The key (signature)

A cartoon keycap: the screen's one primary act.

- **Construction:** a flat face in a coded hue with a 2.5px Ink outline, over a 6px front wall (the lip) in the hue's deep partner with its own ink outline. The layout box includes the lip, so nothing hangs outside it. The face is 60px tall (68 large, 48 compact), padded 30px, with a 20px Phosphor icon and an 8px gap before the label.
- **Round:** the seal check, a 58px round key with Phosphor's check-fat (fill) at 26px. One tap opens the seal sheet, whose Seal is then the screen's one key; the check steps back while the sheet is up.
- **Compact:** Draw on your own board, a Seal Yellow compact key at the lower left over the stickers, or at the tab strip's left end on a large screen. It carries only its icon and "Draw", or "Continue drawing" (続きをかく) while a drawing waits on the drawing screen; its tickets tuck behind its right end. On a new artist's first visit, unless a drawing waits, it hops and a pulse ring surrounds it, held by a wrapper so the key keeps its own lip; the tickets sit in the same wrapper, so they hop along.
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

The one switch, wherever something turns on or off (`ui/Switch.tsx`). A 46 × 28px pill at its row's end: off, a Canvas track with a 1.5px Graphite edge and a 16px Graphite thumb; on, filled Ink with a Canvas thumb, which slides across in 160ms on the ease-out while the fill fades in. Its row's words name it and a tap anywhere on the row flips it; the switch itself is 44px tall to touch. Focus draws the house ring round the track, 2px Ink at a 3px offset. Reduced motion: the thumb jumps and the fill changes at once. It isn't label stock, and never presses.

### Text field

One field wherever a person types, Explore's search and the handle prompt: a Canvas face on the label shadow with a 1px strong rule, 6px corners, 48px tall with 12px inside, and 16px text at 500 over a Graphite placeholder, the size below which iOS zooms into a focused field. Typing draws the house focus ring, 2px Ink at a 3px offset. It isn't label stock, and never presses.

### Bottom sheet

Every bottom sheet is a modal dialog: what it covers goes inert, focus stays inside, and Escape, Back and its perforation close it, unless its act is on its way or there's nothing to go back to. On a large screen it's a centered card, closed by an X in place of the perforation, one at a time.

### The press

One press for every key and label, and anything marked pressable.

- **Press:** on pointer down, or Space or Enter, the face drops as the lip compresses: 4.5px on a key, 2px on a label, 1px on a pressable tile, in 70ms on the ease-out curve. It bottoms out 0.5px further and settles back in 120ms, then keeps sinking 0.4px over 900ms while held, so it never looks frozen.
- **Slide off:** past the touch target plus 16px it springs back up (380ms on the spring curve, about 0.7px past rest) and the press cancels. Coming back within 10px presses it again.
- **Release inside:** it pops 1.4px past rest on the ease-out curve and springs home, 340ms in all. The action fires 60ms into the pop, so the pop shows before the screen changes.
- **Release outside, a scroll, blur or a hidden page:** it lifts and nothing fires. Escape while held cancels, and only cancels.
- **Mechanics:** only translate animates: the face moves down while the base counter-moves up, so the lip compresses and its outline never thins. Keys take the drag (a drag that starts on a key tracks the finger); labels let a scroll cancel the press, as on iOS.
- **Reduced motion:** half the travel, states change in 1ms, no spring, bottom-out or creep, and the action fires on release.

### Touch targets

Every key is at least 54px tall. A label's face carries invisible bands above and below it (5px on the small label, so 35px to see and 45px to touch), and the press measures its slide-off slop from that touch edge. A quiet link's touch area reaches 7px above and below and 4px to each side. Every other control pads to 44px.

### Dot badges

Round flat stickers stuck at -4°: a 26px pill in a coded hue with a light inset gloss, carrying Ink puffy lettering or a filled Ink icon, and 20px on a sticker sheet. NEW dots mark stickers you haven't seen yet, and a 10px pip marks new items.

### Index tabs

Three tabs cut from label stock, side by side on the Liner strip: My board (pink), Explore (aqua) and Shop (blue). They're equal thirds of the strip, up to 176px each, 46px tall with a 6px radius. A label centers in its third and never widens its tab. Draw isn't a tab; the board has its own Draw key. An inactive tab is an outline (a 26% Ink edge) with Graphite text (4.8:1 on Liner); the current tab is stuck on in its full hue with Ink text, lifted 2px with a lift shadow. Each tab presses 1.5px through the shared press. Current is shown by fill and lift only, never by weight or case. The icons are Phosphor's house (My board, for everyone), map-trifold (Explore) and tote-simple (Shop), 20px, bold at rest and fill when current.

- **Sticking on:** the tapped tab fills with its hue in 140ms while it lifts 2px and settles from 1.04 to 1 (220ms, `--ease-peel`), the world's stick. The tab it leaves drops its lift and shadow in 140ms. The screen's own change is a separate cross-fade; the strip never moves with it.
- **Reduced motion:** only the hue changes, in 120ms, with no lift travel and no settle.
- **Not while drawing:** the drawing screen has no strip; its My board tile opens the board as the My board tab does.

### The deal (Kyoto Seika Manga Expression Practice Mode)

An extension of the draw screen, not a new world, drawn with manga's own devices instead of UI chrome: G-pen ink on the sheet's white with no shadow (the thought clouds, the die), a picked state filled solid (ベタ) with its word in white (白抜き), 書き文字 lettering in Dela Gothic One, and Non-repro Blue for what stays off the sticker. Begin is the screen's one key.

### Tickets

**The Ticket Rule.** Every picture of tickets shows the tickets your next drawing can use, drawn from one helper (`ticketView`). While daily tickets are left they lead: the day's three stubs, fresh first and then the used ones newest first, so a spend turns a stub over where it lies; reserve tickets held show as one reserve ticket with its count. Once the daily tickets are used, the three slots go and one reserve ticket with its count takes their place; only the refill line says when daily tickets come back. With neither left, the used day shows. A zero never shows, and reserve tickets never fill daily slots.

Tickets aren't controls: daily tickets are matte ticket stock; reserve tickets wear the stickers' resin, an Ink outline and a four-point star.

- **Daily:** Seal Yellow stock with a 22% hairline edge, printed with the Draw mark.
- **Reserve:** Blue stock under the stickers' baked resin: a highlight from the top-left light over its top third (white 62% fading to 12%, then a clean edge), a rim of light just inside its top edge, and the print pooling Blue Deep at the foot. A full Ink outline (1.5px small, 2px large), and Phosphor's four-point star (fill), white with an Ink edge, over its top-right corner. The star pops in once, on the peel curve, when a reserve ticket first shows on a surface (bought, or come to the front), and never loops; reduced motion shows it still. A count's dot badge takes the corner, and the star sits just short of it.
- **Used:** the backing a ticket leaves: Liner Lift with a 26% edge and its perforation, carrying the kiss-cut outline of the sticker it became.
- **Marks:** at 18px (the checkout's pack rows) a ticket is a mark with an Ink edge; the reserve mark keeps only its rim of light.

### Stickers

- **Die-cut:** the outline comes from the artist's own strokes, offset into a white border and bounded by the kiss-cut groove, with the sticker cast shadow beneath. Parts the border doesn't join hang together by bridges of white border, narrower than the border: the shortest set that joins them all.
- **Baked resin:** the gloss is baked into the image, with the print darker and more saturated where resin pools at the edge, a refraction band inside the cut edge, a rim light and a meniscus at the foot.
- **Live resin:** on stickers that are showing, a live layer adds a specular along the top edge, a rim light and a sheen that sweeps when the sticker is placed, dragged or tilted. On a board its lens, specular and rim light are fainter, so the laminate reads thin.
- **Crease:** on a sticker board, a sticker lying over others shows the edges beneath it, as a real one does once it's pressed down over them. Each sticker lies over the ones below like a stiff sheet: beside an edge it lifts and ramps down, it bridges narrow gaps, and it shows only the edges directly beneath it: an edge buried under another sticker doesn't show through. The ramp is lit on the side facing the one light and shaded on the far side, across the white border and foil band too, at a quiet strength. Its shading follows the light: at rest it's lit from the top left; a tilt swings the light round, the lit and shaded sides follow, and a strong tilt swaps them. The light never grows stronger than at rest, so the crease only fades as the light passes overhead; under reduced motion it stays lit from the top left. It clears while the sticker is in hand and fades back in once it's stuck. The sticker tray and Explore have none: stickers never overlap there.
- **Foil:** a sticker drawn by someone other than the board's owner wears a foil band just outside its white edge, a fixed share of the sticker's long side, so it's wider on the detail's big sticker and narrower on tray sheets. It follows the cut at an even width round curves and points. The band is the sticker's edge: the white edge runs straight into it, the image shows only inside its own cut, and the kiss-cut and cast shadow fall from the band's outer edge. A fine diffraction grating lies over it and never moves: diagonal hairlines, lit white and shaded Ink at low alpha. The six foil bands flow under the grating, so the band glitters rather than crawls, and a white glint sits where the one light falls; holes hide it; it's decorative, and the sticker's own label names the artist. The seal ceremony adds nothing: a freshly sealed sticker is yours and plain.
- **Pink foil:** the same band in pinks only, on an NSFW sticker, whoever drew it. The 18+ mark, wherever an NSFW sticker is flagged (over a blurred one, after "Sealed" on its sealed card, in the give sheet's picker), is Ink on a strip of pink foil with an Ink edge, never a Bonbon Pink field: pink is gratitude's.
- **Kyoto Seika Practice Mode foil:** manga screentone (網点), on a sticker drawn in Kyoto Seika Manga Expression Practice Mode, whoever drew it. Its band is narrower than holo's, so the tone never outweighs the sticker. Round Ink dots on paper white sit on a 45° screen: a light tone all round, and a heavier tone on the same dots that comes in toward the bottom-right, away from the top-left light, whatever the sticker's turn. The tone is printed and never moves. The live light dims it under the glint and slides two highlights scraped out of the tone, a broad one and a fine one, across the screen's rows, as a cutter scrapes, always through the glint. Both move by transform alone, with the light, so no tilt makes the tone jump. No grating, whose hairlines would beat against the dots. It shows wherever pink foil does, and pink wins.
- **Peel and stick:** a sticker peels with a 3D lift toward the top right and sticks with a short settle from 1.06 scale.

### Artist chip

Who drew a foil sticker: a Liner Lift pill (40px) with the artist's LINE picture in a white edge inside a turning foil ring, then a fine-print ARTIST caption over "@name" (700, 13px). Without a picture, their first letter stands in on the paper, in the photo sticker's puffy capital (at the 11px floor in both variants), never a blank disc. A one-line "By @name" variant is for tight spaces. The copy is "artist" or "By", never "from".

- **First load:** when a board opens, each foil sticker's chip pops in briefly at its top-left corner to name its artist, once per app open for each board. Reduced motion shows and hides it without the pop.
- **Tapped:** the chip heads the selected sticker's menu, above its actions, until you deselect.
- **Detail:** under the big sticker, the chip leads the fine print. Your own stickers never get a chip.
- **Plain:** off a board, where foil never shows (Explore's lifted sticker), the chip has no ring: the picture keeps its white edge, cut from the pill by a kiss-cut, and casts a small shadow. With a sheet's width to use, it shows the whole handle, up to the longest (32 characters), running onto a second line rather than cut short.

### Hit counter

A combo's length, shown the way fighting games show it: "64 HITS" (`UI.hits`).

- **The look:** Figure numerals leaning 11°, HITS after them in small caps, and three pink speed lines trailing off the number's left side as if it had just slammed in.
- **The pink stays off the digits,** so a count never reads as struck out.
- **Nothing like the multiplier:** no ×, no tag and no puffy face.

### Gift bag

A frosted bag with no zipper, built like a konbini wrapper: a clear film band fused across the mouth, with a Soda Aqua tear tape running through it, printed with the pull direction and "CLOSED 9.23". The tape's loose end is the pull tab: a narrow neck leaves the film at the bag's left edge and widens into a rounded lobe that sticks out past the edge, tips up and casts a shadow, with three grip ribs moulded across its free end and PULL printed on it. Its tag is printed, never typed, and an opened bag carries a rubber OPENED date stamp on its tag.

### Loading

- **Skeletons:** while a screen loads, it shows its own layout in outline, never a "Loading…" line: blocks of pressed Liner (Liner Deep) with a slow white shine passing over them, real headings and tab labels where they're fixed. A screen reader hears one status line.
- **Reveal:** loaded content rises 6px into place and fades in over 220ms. A picture (a sticker, a photo sticker) holds back until its image has loaded, then fades in whole, never half-drawn.
- **Tabs:** changing tabs swaps the screen at once and fades the new one in over 300ms on a gentle ease, settling up 8px from 98% size; it takes taps from its first frame. The tab bar changes crisply around it.
- **Reduced motion:** no shine and no rise; tabs change at once.

### Error line

Every failure the app shows is one sentence in the app's language, saying what failed and what to do: 500 13px Ink on Tomato Soft, 6px corners, announced as an alert.

- **Try again:** a quiet Ink link after the sentence, only where asking again can work; a second link (Reload, Dismiss) where one fits.
- **Details for a report:** under the sentence, a fine-print label, the words behind the failure in their own case (usually English), and Copy, which copies them whole. When the clipboard refuses, a line under the details says so until the next try, and the words show whole to select by hand. Raw words never sit inside the sentence.
- **Its own screens:** the sign-in gates, the ticket cards and the Receive dialog's end screens keep their own title and bold line, and show their details the same way.

### Toast

An Ink slip with Liner text (600, 14px) and 6px corners on the lift shadow. It rises 10px in and sinks out.

### Icons

Every icon is Phosphor Icons (MIT) as `@phosphor-icons/react` renders them, through one registry: `apps/frontend/src/icons`. An icon that carries one of the app's meanings goes by that meaning there (`DrawIcon`, `GiveIcon`); the rest keep Phosphor's names. The app's own controls use bold; fill marks an active or primary state, such as the current tool or the current tab; the mocked LINE and iOS screens use regular. The same action always gets the same icon:

- **Draw:** pencil-simple-line (fill), on every Draw action: the board's Draw key, Keep drawing, the print on fresh ticket stubs and the chat menu's Draw tile. The brush tool keeps paint-brush; it's a drawing tool, not the Draw action.
- **My board:** house, on the tab (bold, fill when current), every "go to the board" action, and the chat menu's My board tile (bold) and Open Sticker Board key (fill).
- **Explore:** map-trifold. **Shop:** tote-simple, on the tab and every way into the Shop.
- **Gratitude:** heart (fill) at every size, since it's a mark, not a control: Send gratitude, the Transfer Trail, the combo HUD, the stat board's receipt and Best day, your gratitude events, and Explore's Most gratitude figures. **Streak:** fire (fill).
- **Give** is gift, **View** eye and **Remove** sticker (a peeling corner).

Screens that build their DOM from strings (the mini-game, the tray) carry copies of Phosphor's paths; `phosphorCopies.test.tsx` checks each against the installed package.

**The Never Hand-Drawn Rule.** Icons are never drawn by hand and published paths are never edited. If Phosphor doesn't have it, choose a different Phosphor icon. A text glyph (♡, ★) never stands in for an icon.

**Brand marks** (Sui's droplet and full logo, files byte for byte from Sui's brand kit at live.standards.site/sui-media-kit; LINE's logo from Simple Icons or LINE's guidelines) and illustrations (the heart you tap, stickers, avatars, pins, tape, stamps, zipper parts) are not icons. Brand marks are their owners' files, never redrawn, recolored, outlined or glinted, and keep the clear space their kits ask for.

### Chat menu

The Official account's chat menu in LINE is drawn as the board's foot, from the app's own tokens, key and label stock (`deploy/line/`), with one menu per ticket state, since LINE can't vary an image per person.

### Mocked platform screens

The LINE chat, the Gift Message, consent, share picker, Add friends screen and iOS notification banners use the platform's own native type, white and system greys, and LINE's green. They're faithful mimicry, and the world's materials (keys, labels, the press) never leak into them.

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
