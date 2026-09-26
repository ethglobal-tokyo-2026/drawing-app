---
name: Sticker Board (シール帳)
description: A LINE drawing app where every five-minute drawing is sealed into a die-cut sticker you keep, give or trade.
colors:
  liner: "#F2F1F6"
  liner-deep: "#E5E3EC"
  liner-lift: "#F8F7FB"
  ink: "#1C1824"
  graphite: "#6E6878"
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
typography:
  display:
    fontFamily: "Dela Gothic One, Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  display-lg:
    fontFamily: "Dela Gothic One, Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  display-sm:
    fontFamily: "Dela Gothic One, Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  figure:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.42
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.004em"
    fontVariation: "'wdth' 100"
  fine:
    fontFamily: "Mona Sans, Zen Kaku Gothic New, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.07em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 87.5"
  jp-caption:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, Hiragino Kaku Gothic ProN, Mona Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
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
    textColor: "{colors.graphite}"
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
    padding: "0 12px"
    height: "46px"
  index-tab-current:
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "0 12px"
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

# Design System: Sticker Board (シール帳)

## Overview

**Creative North Star: "The Sticker Trade Book"**

The app is a シール帳, a sticker trade book. The ground is release-liner backing paper, controls are printed label stock, and the one thing each screen wants pressed is a cartoon keycap: a flat coded face with an ink outline, like the drawings, sitting on a thick lip it sinks into. A finished drawing gets sealed: its own strokes become a die-cut outline, a white border and a kiss-cut groove. Then it peels off the page and sticks to a free-form sticker board, and your whole collection lives as a stack of loose sheets in a zipped canvas tray down the board's right edge. The board has a cork back, and your figures are paper pinned to it. Everything that moves lives in the same physical world. Keys press and pop, labels sink 2px, stickers peel and stick, zippers run tooth by tooth, a gift's seal tears off, and sheets have a perforation row you tear along.

The surface is calm and orderly. Calm screens are almost all Liner and Ink, and color comes in flat coded fields where each hue has one meaning. The world only goes wild when you push it. Gratitude is one experience for everyone: the figures always show, and only people who keep mashing the heart reach the upper tiers, where it blushes, sweats hearts and finally fogs the glass. Nothing is hidden behind a second place: tap a person's picture or name on their board and the whole board turns over to its cork back, where their figures are pinned up as a receipt, a calendar leaf, stamps, a notebook scrap and label tape.

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

- **Seal Yellow** (seal-yellow): "Now". The default key (Keep drawing, the seal check, Draw on your board), daily tickets, the draw screen's timer dot, the made stamp on the cork back, NEW dots, and text selection. It's the most common field in the app.

### Secondary

- **Soda Aqua** (soda-aqua): giving. The Give key (including where Draw sits on someone else's board), the Explore tab, the gift bag's tear tape and its pull tab, and viewer hints mixed toward Liner.
- **Bonbon Pink** (bonbon-pink): gratitude, and you. The Send gratitude key, the heart and its mini hearts, the My board tab, the tray's zip pull and its Mine folder tab, the open trail row's outline, the selected leaderboard tab, and on the cork back the receipt's pushpin and heart, and the hit counter's speed lines.

### Tertiary

- **Grape** (grape): received, and offers. The Accept key on a gift, the Send offer key, Offer for it on someone else's board, the tray's Gifts folder tab, received-sticker marks, and the received stamp on the cork back.
- **Blue** (blue): the Shop and reserve tickets. The Shop tab, the Pay key and picked pack, reserve tickets, and the Use a reserve ticket key. Opposite daily tickets' yellow, so the two kinds of ticket can't be confused.
- **Tangerine** (tangerine): the streak. The streak leaf's band on the cork back, with the Fire icon, and the streak's figures elsewhere.
- **Tomato** (tomato): can't undo. Stopped states and warnings. It's never a key.
- **Foil** (foil-pink, foil-peach, foil-lemon, foil-aqua, foil-sky, foil-lilac): six iridescent bands, one 96px period, that flow along a sticker's foil band and turn in the ring round the artist chip's picture. It isn't a fill color. It's a material worn only by a sticker drawn by someone other than the board's owner. It has no green.

### Lips (deep partners)

- **Seal Deep, Aqua Deep, Pink Deep, Grape Deep, Tomato Deep, Blue Deep, Tangerine Deep** (seal-deep, aqua-deep, pink-deep, grape-deep, tomato-deep, blue-deep, tangerine-deep): the front wall under a coded key or label. They never appear as fields or text.
- **Label Lip** (label-lip): the 3px paper edge under plain Liner Lift label stock.

### The tray

- **Tray Canvas** (tray-canvas): the pink canvas edge down the board's right side where the zipper is sewn on.
- **Tray Tape** (tray-tape): the zipper tape, lighter than Bonbon Pink so the pull stays the one strong pink.
- **Tray Lining** (tray-lining): the soft pink canvas you see into when it's open.

### The cork back

- **Cork** (cork): the back of the sticker board, warm with granules and darker where the frame meets it. Paper, pins, tape and stamps sit on it; nothing is printed on it directly.

### Neutral

- **Liner** (liner): the backing-paper ground of every in-world screen and sheet.
- **Liner Deep** (liner-deep): a sunk (disabled) key or label, a pressed inactive tab, and the leaderboard tab track.
- **Liner Lift** (liner-lift): a label lifted off the liner: label-stock faces, the paper on the cork back, the artist chip, the open trail row, the tray's loose sheets, and selected chips.
- **Ink** (ink): all text on every field, the key's outline, the toast, the table under the board while it turns over, the label-maker tape on the cork back, the current drawing tool, and the ink button.
- **Graphite** (graphite): secondary text, fine print, placeholders and quiet links. Ink-alpha steps carry hairlines: a kiss-cut rule at 14% and a stronger rule at 26%. Ink at 62% is the soft-text color.
- **Canvas** (canvas): drawing surfaces, and white label stock. That's the drawing sheet, a sticker's white border, and the draw screen's two stuck-on labels (the PAUSED tag and the paused hint), which are white so they read as labels over any drawing.

Soft fields (inactive tabs, quiet chips, hints) mix a coded hue into Liner, at 30–42% depending on the hue. They keep the hue's meaning at rest volume.

### Named Rules

**The Ink-On-Color Rule.** Every flat coded field carries Ink text, never white. White on pink reads at 3.1:1; Ink reads at 5.7:1.

**The One Meaning Rule.** Each hue means one thing: yellow is now, aqua is giving, pink is gratitude and you, grape is received and offers, blue is the Shop and reserve tickets, tangerine is the streak, and tomato is can't-undo. Don't pick a hue for looks.

**The Other Hand Rule.** Foil appears only on a sticker drawn by someone other than the board's owner (on your tray's sheets, someone other than you). Your own stickers keep the plain white die-cut edge; the pearl rim is retired. Surfaces that aren't a board (Explore's sticker pile, the leaderboard) show no foil. It's never a rarity grade.

**The Platform Green Rule.** The world has no green. LINE's green appears only inside LINE's own mocked UI (the chat, the Gift Message, the consent and share screens, and the app badge).

## Typography

**Display Font:** Dela Gothic One (with Mona Sans fallback)
**Body Font:** Mona Sans, a variable font with a width axis (with Zen Kaku Gothic New for Japanese, then system-ui)
**Japanese:** Zen Kaku Gothic New (with Hiragino Sans fallback). The page asks for it only while the app is in Japanese, since its stylesheet alone is 242 `@font-face` rules; in English the odd Japanese glyph (the なまえ cap, the 袋文字 tier captions) sets in the phone's own Hiragino Sans.
**Platform chrome:** the native system stack (-apple-system, SF Pro Text, Hiragino Sans), used only inside mocked LINE and iOS UI.

**Character:** Mona Sans is the label stock, a precise and slightly technical sans that changes width with the job. Dela Gothic One is the puffy voice, heavy and rounded, and it belongs on the key and on the moments gratitude shouts.

### Hierarchy

- **Display** (400, 20px; 23px on the large key, 17px on the compact key; line-height 1): the key's label. It also sets dot badges (12–19px), the gratitude multiplier (×8.0), the giver's gratitude tag, and the outlined 袋文字 tier captions (46px, pink inside white inside ink).
- **Figure** (900, 26px on the cork back's stamps and 27px in the open trail row, up to 52px on the gratitude receipt and 58px on the streak leaf; line-height about 0.95, width 125, tabular): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the cork back (the receipt's TOTAL at 30px), and the hit counter (23px on the leaderboard, 20px in the cork back's Bests).
- **Headline** (800, 26px, line-height 1.08, width 112, balanced wrap): screen and dialog titles such as "Sealed on-chain" and "Out of tickets for today".
- **Title** (800, 18–22px, line-height 1.1, width 112): sheet titles, the board header's name, and the notebook scrap and Settings headings on the cork back (18px).
- **Body** (400–500, 15px, line-height 1.42–1.5, width 100): running text. Notes cap at 28–44ch. Supporting notes drop to 13px.
- **Label** (700, 15px, or 13px on small buttons, width 100): buttons, tabs and chips, in sentence case at one weight.
- **Fine** (650, 11px, uppercase, +0.07em, width 87.5, tabular): metadata lines such as "No.0147 · 4:52 · 2026.09.23 · @alice", sheet date ranges in the tray, captions and hints.
- **JP caption** (700, 11px, +0.14em): the なまえ cap on the name label.

### Named Rules

**The 11px Floor Rule.** Nothing inside a 390px phone renders under 11px. Fine print, caps metadata and hints stop at the floor.

**The Width Axis Rule.** Width carries the role: UI at 100, titles at 112, fine print at 87.5, figures at 125. Take width from the shared tokens. The earlier 75 read too small at 11px on a phone. A few places keep 75 on purpose, either because the space is too tight or because the look calls for it:

- the zip pocket's "From …" line, which has to fit two names in one chip
- the gift bag's tear tape ("SEALED 9.23") and the PULL on its tab
- the rubber date stamp on the gift tag

Nothing else is set at 75.

**The Puffy Voice Rule.** Dela Gothic One appears only on keys, dot badges (the draw screen's timer dot is one), the gratitude multiplier and tag, and outlined 袋文字 captions. It's never used for headings, body text or plain figures.

**The Hits Rule.** A combo's length is counted in hits, the way fighting games count it, never in taps. It never wears ×, which belongs to the multiplier. It always shows as the hit counter.

## Layout

Every screen is a 390 × 844 iPhone viewport. From top to bottom there's a 47px status bar, LINE's 56px LIFF header, the screen, and the 84px index-tab strip (Liner, under a 14% hairline) with a 34px home-indicator safe area. Full-screen LINE chrome hides the LIFF header and the tabs, and a bare LIFF screen hides only the tabs. A screen can also let the tabs hide: they tuck below the page, and a 36 × 5px grabber sits 20px above the home indicator, clear of iOS's home swipe. Tap it or drag it up and the tabs slide back; the next touch elsewhere, or 4s idle, tucks them away again. The draw and seal screens use this, so the canvas gets the room.

The spacing rhythm steps in 4px units, and 12px is the house gutter. Tabs sit on a 12px inset with an 8px gap, and sheets pad 18–20px on the sides and 24px at the foot. Controls anchor to the thumb zone. The key sits low, usually bottom right or centered at a sheet's foot, with any secondary label or quiet link directly beneath it.

The sticker board is free-form, not a grid. Stickers sit wherever they were dropped, at their own size and slight rotation. The board's header is your avatar and name at the top left; the compact Draw key floats at the lower left; the sticker tray runs down the right edge from under the header (y 64) to the foot and opens across half the screen. Someone else's board keeps the same layout with the tray gone, so the field runs to the right inset; Give takes Draw's slot, and a small Explore back chip sits beside the name. The cork back is a two-column grid (206px and the rest, 16 × 12px gaps), with Flip back at the foot of the right column in the thumb's reach. No surface shows grid paper: paper is hinted by the liner stock and the faint diagonal "SEAL · シール" maker print, never a full grid.

The gallery around the phones (a sticky flow index, a 260px story column beside rows of scaled phone frames, and a viewer with a 300px strip) collapses to one column at 1100px and stacks the viewer at 760px. Each phone's caption is a plain annotation: the element, where it is in parentheses, and what was just done to it and what that shows, with a quiet step number the gallery adds. It belongs to the design review, not the app.

## Elevation & Depth

Depth is physical, and it comes from a single light at the top left. Every cast shadow falls down and to the right, uses neutral Ink alpha and is layered in two parts, a tight contact and a soft throw. Controls get their depth from thickness, not shading: a key sits on a 6px lip and a label on 3px of paper, and the base casts the shadow, so pressing never darkens the lip. Stickers get their edge from a 0.5px kiss-cut groove drawn as a drop-shadow on the alpha, so the silhouette casts the shadow rather than a box. On a foil sticker the band is the edge: the kiss-cut and the cast fall from the band's outer edge, and nothing lies between the white edge and the foil.

Stickers and the gratitude heart also respond to the app's one moving light. The shared light variables run from -1 to 1. They follow the pointer or touch, and device tilt where the browser already allows it without a prompt, and they idle-sway on an 11s loop so stills look alive. Buttons don't follow the light; they have no highlight to move.

### Shadow Vocabulary

- **Key base** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 2px 6px 12px -3px rgba(28,24,36,.24)`): under every key, cast by the still base.
- **Label base** (`box-shadow: 0 1px 0 rgba(28,24,36,.06), 1px 3px 5px -2px rgba(28,24,36,.16)`): under label stock.
- **Label** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 1px 2px 3px rgba(28,24,36,.08)`): a flat label resting on the liner, such as the tool strip or a chip.
- **Lift** (`box-shadow: 1px 3px 4px rgba(28,24,36,.12), 3px 10px 22px rgba(28,24,36,.14)`): something held above the page, like a toast or the Smoothing bar.
- **Sheet** (`box-shadow: 0 -1px 0 rgba(28,24,36,.06), 2px -8px 28px rgba(28,24,36,.12)`): a bottom sheet rising over the page.
- **Kiss-cut** (`filter: drop-shadow(0 0 .5px rgba(28,24,36,.55))`): the die-cut groove around every sticker, round the foil band's outer edge on a foil sticker.
- **Sticker cast** (`filter: drop-shadow(1px 2px 1.5px rgba(28,24,36,.16)) drop-shadow(2px 6px 8px rgba(28,24,36,.10))`): a sticker stuck to the page. It's always paired with the kiss-cut. A foil sticker casts it, and every lifted shadow, from a still copy of its band's shape.
- **Peeling** (`filter: drop-shadow(3px 7px 5px rgba(28,24,36,.18)) drop-shadow(8px 16px 18px rgba(28,24,36,.12))`): a sticker lifting off, tilted in 3D by 11°.
- **Floating sheet** (`box-shadow: 0 0 0 .5px rgba(28,24,36,.18), 3px 7px 8px rgba(28,24,36,.16), 8px 18px 30px rgba(28,24,36,.18)`): a sheet pulled out of the tray, hovering over the board.
- **Pinned note** (`filter: drop-shadow(0 1px 0 rgba(28,24,36,.12)) drop-shadow(2px 5px 5px rgba(58,36,16,.26))`): paper hanging on the cork back, from its pin or tape.

### Named Rules

**The One Light Rule.** There's one light for the whole app. Static shadows fall down and to the right from the top-left light, and every moving highlight (the sticker specular and sheen, the foil's glint, the heart's gloss) reads the shared light variables. Don't add a second light source. The foil's glint sits where the light falls, the same way on every sticker whatever its turn, and holds where the last tilt left it; before any tilt it rests top-left. Only the foil's bands run on their own clock, flowing on a 7s loop staggered per sticker, under a grating that never moves. They hold still under reduced motion.

**The Neutral Shadow Rule.** Shadows are Ink alpha, never tinted. The one exception is the cork back: paper, stamps and pins cast a cork-brown throw (rgba(58,36,16,…)) over an Ink contact line, because a shadow on cork is darker cork. The only colored light in the world is a sticker's gratitude glow, warming from faint pink toward amber as more gratitude arrives.

**The No Gloss Rule.** Controls have no gloss, highlight line or sheen: keys, labels, tabs, the zipper and the gift's tear tape are lit flat, with an edge and a contact shadow at most.

## Shapes

Corners come from paper and cut stock. Label stock uses an 8px radius, and toasts, fields and index tabs 6px. The tray's folder tabs round only their top corners, where they stand up from the stack. Keys are 16px (18px large, 14px compact), which reads as a key, not a pill or a tile; the seal check is a round 58px key. Zip pockets use 10px, the open trail row 12px, bottom sheets 16–18px on their top corners, and the tray's loose sheets a paper-like 4px. Dot badges are pills tilted at -4°, as if one hand stuck them all. The same -4° tilt carries onto photo stickers and the gift's SEALED stamp.

Stickers have no radius. Their outline is the artist's own stroke silhouette, offset by a white border and bounded by a kiss-cut groove. A given sticker leaves its silhouette on the board, hatched at 45° in faint graphite. A sticker out on the board leaves a kiss-cut hole in its tray sheet, and a used drawing ticket keeps a faint kiss-cut outline of the sticker it became. Sheets begin with a perforation row, a dotted line with a firmer run of holes at the center as the grab. Only the tray has a zipper; the gift bag closes with a clear film and an aqua tear tape whose tab sticks out past the bag's edge. Paper on the cork back has torn or cut edges of its own kind: a receipt's zigzag foot, a calendar leaf's and a notebook scrap's torn tops, a stamp's perforated edge, washi with torn ends, and slightly skewed label-maker tape. A selected sticker gets a clear frame with 10px corners, four 20px corner squares, and a round knob on a short stem above the top edge.

## Components

### The key (signature)

A cartoon keycap: the screen's one primary act.

- **Construction:** a flat face in a coded hue with a 2.5px Ink outline, over a 6px front wall (the lip) in the hue's deep partner with its own ink outline. The layout box includes the lip, so nothing hangs outside it. The face is 60px tall (68 large, 48 compact), padded 30px, with a 20px Phosphor icon and an 8px gap before the label.
- **Round:** the seal check, a 58px round key with Phosphor's check-fat (fill) at 26px. The first tap arms it: it breathes (scale to 1.08 and back every 900ms) and a label-stock chip beside it says "Tap again to seal". A second tap within 2.5s seals; otherwise it disarms. It's still the draw screen's only key.
- **Compact:** Draw on your own board, a Seal Yellow compact key at the lower left over the stickers. It carries only its icon and "Draw"; its tickets tuck behind its right end (see The Draw key's tickets). On a new artist's first visit it hops and a pulse ring surrounds it, held by a wrapper so the key keeps its own lip; the tickets sit in the same wrapper, so they hop along.
- **Disabled:** sunk flush with the page, with no lip and no ink: a Liner Deep face and a graphite label. Enabling springs it up out of the page.
- **Busy:** while its act is on its way to the server, such as spending a ticket, the key keeps its face, lip and ink, and takes no second press. It's marked `aria-busy` and `aria-disabled`, never `disabled`, which would sink it grey as if the act weren't there.
- **Hover and focus:** hover shades the face 6% toward Ink. Focus draws a 2px Ink outline at a 3px offset.
- **Visiting:** on someone else's board, a Soda Aqua compact Give key sits in Draw's slot, and it's that board's one key.
- **Where it goes:** Keep drawing, Buy reserve tickets in the Shop, Pay in the reserve ticket checkout, Use a reserve ticket, Give, Send in LINE, Accept, Send gratitude, Send offer, the seal check, Draw on your board and Give on someone else's. A can't-undo act never gets the key.

### Label stock

Everything that isn't the key: the same construction at a third of the depth, with no ink outline.

- **Shape:** a Liner Lift face with a 1px edge at 30% Ink, an 8px radius, and 44px of face over a 3px lip (32px on the small variant).
- **Coded:** seal, aqua, pink, grape and tomato faces take their deep partner as the lip and a 22% edge. The ink variant has a near-black lip and Liner text.
- **Held:** while held, the face also takes a 10% shade, since 2px of travel is small.
- **Quiet link:** text with a 1px underline at a 3px offset, in Graphite, with no stock and no travel. It turns Ink on press. It's the way out under a key.
- **Where it goes:** a secondary action beside or under a key (Go to sticker board, Give under Send gratitude), and coded actions in toolbars and rows (Give, View, Remove on a selected sticker). Three keys in a row would read as a keyboard.
- **Not buttons:** drawing tools, undo and redo, and close, back and header icons stay flat tiles. Chips, filters, segments and radio rows are selectable labels whose selection is their feedback. Gestures (hold to tear, the gift's pull tab, the zip, grabbers, the heart, the tray's sheets) keep their own physics.

### The press

One press for every key and label, and anything marked pressable.

- **Press:** on pointer down, or Space or Enter, the face drops as the lip compresses: 4.5px on a key, 2px on a label, 1px on a pressable tile, in 70ms on the ease-out curve. It bottoms out 0.5px further and settles back in 120ms, then keeps sinking 0.4px over 900ms while held, so it never looks frozen.
- **Slide off:** past the touch target plus 16px it springs back up (380ms on the spring curve, about 0.7px past rest) and the press cancels. Coming back within 10px presses it again.
- **Release inside:** it pops 1.4px past rest on the ease-out curve and springs home, 340ms in all. The action fires 60ms into the pop, so the pop shows before the screen changes.
- **Release outside, a scroll, blur or a hidden page:** it lifts and nothing fires. Escape while held cancels, and only cancels.
- **Mechanics:** only translate animates: the face moves down while the base counter-moves up, so the lip compresses and its outline never thins. Keys take the drag (a drag that starts on a key tracks the finger); labels let a scroll cancel the press, as on iOS.
- **Reduced motion:** half the travel, states change in 1ms, no spring, bottom-out or creep, and the action fires on release.

### Touch targets

Every key is at least 54px tall. A label's face carries invisible bands above and below it (5px on the small label, so 35px to see and 45px to touch), and the press measures its slide-off slop from that touch edge. A quiet link's touch area reaches 7px above and below and 4px to each side. Sticker handles, tray folder tabs, the sheet stack's +N button, a floating sheet's X, the zip pull and drawing tools all pad to 44px.

### Dot badges

Round flat stickers stuck at -4°: a 26px pill in a coded hue with Ink puffy numerals and a light inset gloss. NEW dots mark stickers you haven't seen yet, and a 10px pip marks new items.

### Index tabs

Three tabs cut from label stock, side by side on the Liner strip: My board (pink), Explore (aqua) and Shop (blue), each up to 176px wide and 46px tall with a 6px radius. Draw isn't a tab; the board has its own Draw key. An inactive tab is an outline (a 26% Ink edge) with graphite text; the current tab is stuck on in its full hue with Ink text, lifted 2px with a lift shadow. Each tab presses 1.5px through the shared press. Current is shown by fill and lift only, never by weight or case. The icons are Phosphor's smiley-sticker (My board, for everyone), compass (Explore) and tag (Shop), 20px, bold at rest and fill when current.

- **Sticking on:** the tapped tab fills with its hue in 140ms while it lifts 2px and settles from 1.04 to 1 (220ms, `--ease-peel`), the world's stick. The tab it leaves drops its lift and shadow in 140ms. The screen's own change is a separate cross-fade; the strip never moves with it.
- **Reduced motion:** only the hue changes, in 120ms, with no lift travel and no settle.
- **Tucked:** on screens where the tabs hide, the whole strip slides away behind the grabber described in Layout.

### Board header

Your avatar (a 42px photo sticker at -4°) and your name (800, 18px, width 112) at the board's top left, as one button with a 48px target. Tapping it turns the whole board over to its cork back; on someone else's board, their name does the same with their figures.

### The cork back

The board's back, where a person's figures are pinned up as paper. It's the only place stats live.

- **The turn:** 640ms. The board lifts to 0.92 scale, turns on its vertical axis over the Ink table, with each face darkening as it turns from the top-left light, and lands with a small overshoot. A tap mid-turn reverses it. Reduced motion crossfades the faces in 180ms. The tray and Draw are fixed to the front and turn away with it; the front takes no taps while turned.
- **No person card:** the front's header already names them, and the receipt prints their @handle.
- **Gratitude:** a printed receipt pinned with a pink pushpin, headed "Gratitude received" beside a pink heart with an ink line. Its rows are plain line items in Ink, Direct and Residual, with no dots and no reason lines; a row at 0 is left off, so a friend-first artist sees Direct alone. The total is its TOTAL line. When the stats don't load, the receipt says why in place of its rows.
- **Streak:** a torn-off calendar leaf with a Tangerine band, the Fire icon before STREAK under the pin, and the day count in Figure type. No rule copy.
- **Stickers:** made, received and given as three postage stamps stuck on at small turns, each printed on its hue with an Ink rule.
- **Bests:** a torn notebook scrap ruled in Ink at 14%, held by washi. Best combo on it is the hit counter, with no note.
- **About:** the joined date and the ENS name, each on its own strip of Ink label-maker tape with raised letters; the ENS strip opens the name in the ENS app.
- **Controls:** Flip back is label stock at the foot of the right column. Bare cork, Escape and LINE's Back also flip back. Your own back adds Share my board (aqua label) and QR code. The back has no key.
- **Settings:** your own back's last paper, a clean-cut index card taped at both top corners, its Title-type heading over an Ink rule. Until it scrolls into view its heading peeks above the cork's foot; a tap or focus scrolls it in. Language is ruled 44px radio rows (Same as LINE, English, 日本語) with an Ink dot in a ring for the pick; a failed save shows its reason on Tomato Soft.
- **Developer slip:** LINE's and Privy's details on a torn-top slip, lying collapsed under the cork's end, after Settings, in every build that has it. Pulling up past the end meets iOS's rubber band: the cork and its papers ride up together as the slip's top shows, and past 150px of travel the release brings it out and the cork glides up to it; short of that it settles back. Only a touch that starts at the end pulls, and the cork doesn't bounce there. A visually hidden "Developer tools" button, shown as label tape when focused, brings it out for keyboards and screen readers. Reduced motion: nothing moves, and it fades in. It goes back under once the board rests on its front.
- **Empty values** read in words: "No gratitude yet", "Not started", "None yet" (a best at 0).

### Gifts on the board

Opposite your name, top-right, stacked: gifts for you, then gifts on their way.

- **Gifts for you:** Pink Soft label stock with a Pink ring and a round Pink seal holding a filled gift, never the sticker, so the pull tab still reveals it. "A gift for you" or "3 gifts for you" over "from @alice (and 2 more)"; a Seal Yellow dot badge counts them past one. It asks to be opened: now and then it lifts 3px and settles. Tapping it opens the newest in the Receive gift dialog, as its gift message would; the rest wait for the next tap. Reduced motion holds it still.
- **On their way:** clear film with the stickers' frosted sleeves, quieter, since it only reports.

### Someone else's board

The same board, read only, opened from Explore. Their stickers sit where they stuck them, with foil on the ones someone else drew. Nothing moves, so there are no handles and no rotate knob. There's no tray, since a tray is private; Give takes Draw's slot as the board's one key; an Explore back chip (a 32px Liner Lift pill with a caret) sits beside the name. Tapping a sticker opens its menu: the artist chip on top when someone else drew it, then View and Offer for it (grape label).

### Draw screen

The canvas is just for drawing.

- **Top row:** the timer dot and the tool strip share one row. The timer is a 48px yellow dot at -4° with puffy numerals; tapping it pauses.
- **Paused:** the dot stays whole and bright, and a white label-stock tag reading PAUSED, with Phosphor's pause (fill), sticks across its lower edge at a counter-angle of 8°. It sticks on when the clock holds and peels off when it runs. There's one paused look for every hold: tapped, the page hidden, the color sheet open, the Smoothing panel open, or a finger on the size rail. Only the tap is the person's pause; the other holds release on their own.
- **Paused hint:** while paused the canvas takes no marks. A stroke nudges the dot and sticks a white label under it, turned -2°, reading "Tap the timer to keep drawing", with Phosphor's arrow-bend-left-up (bold, 28px) pointing up at the timer. It peels off by itself. Tools can still switch.
- **Tools:** brush, eraser, fill, a color control (a Phosphor dot inked in the current color on a thin ring; each new drawing starts in a random starting color) and Smoothing, as flat 38px tiles padded to 44px. The current tool is an Ink tile with the fill-weight icon.
- **Smoothing:** an icon button that opens a compact Liner Lift bar under the tools. Its small title, "Smoothing", shows only while it's open, with Raw and Smooth at the ends.
- **Size rail:** the left edge, with a live number of the brush size in px.
- **Foot:** flat undo and redo at the bottom left, the seal check at the bottom right. The canvas shows no ticket count.
- **Sealing:** the ceremony starts as soon as the sticker is cut: the cut runs round the ink behind a Seal Yellow blade, and the paper around it dims. It then waits there while the server seals the sticker, which takes 10–30 s. The blade keeps running round the cut, pass after pass, trailing a heavier stroke of fresh cut. Only once the seal is recorded does the resin pour, the sticker peel off and the sealed card come up, so nothing that says "sealed" shows early. A white label at the foot, turned -2°, sticks on after 1 s: "Sealing your sticker…". At 10 s a fresh label is pressed over it adding "It can take up to half a minute.", and at 30 s "It's taking longer than usual." It peels off when the seal lands. A tap skips to the wait but can't pass it. A failed seal fades back to the drawing, and the seal chip says what went wrong. Under reduced motion the cut shows at once, the blade stays hidden and the label still shows.
- **Keep drawing:** the hand-over overlaps rather than running in turn. On the press, the fresh sheet and the clock (3:00) are set up under the veil, and the day's next daily ticket is spent without asking. The sealed card carries the sticker down toward the Board grabber, 70% of the screen, over 280ms on the peel curve, fading over its last half, while the veil lifts linearly. The timer, tools, size rail and undo fade back in 120ms later, so the sheet is never bare. No "Use a ticket to draw?" card shows during that spend; it comes up only if the spend fails, with the reason. When the sticker used the last daily ticket and reserve ones are left, the reserve ask rises 120ms into the card's exit, its scrim taking over from the lifting veil. The shop from the last ticket's card leaves the same way. The fresh sheet takes ink as soon as the spend lands, even while the card is still leaving. Under reduced motion it's the same order in one frame.

### Tickets

**The Ticket Rule.** Every picture of tickets shows the tickets your next drawing can use, drawn from one helper (`ticketView`). While daily tickets are left they lead: the day's three stubs, fresh first and then the used ones newest first, so a spend turns a stub over where it lies; reserve tickets held show as one reserve ticket with its count. Once the daily tickets are used, the three slots go and one reserve ticket with its count takes their place; only the refill line says when daily tickets come back. With neither left, the used day shows. A zero never shows, and reserve tickets never fill daily slots.

Tickets aren't controls: daily tickets are matte ticket stock; reserve tickets wear the stickers' resin, an Ink outline and a four-point star.

- **Daily:** Seal Yellow stock with a 22% hairline edge, printed with the Draw mark.
- **Reserve:** Blue stock under the stickers' baked resin: a highlight from the top-left light over its top third (white 62% fading to 12%, then a clean edge), a rim of light just inside its top edge, and the print pooling Blue Deep at the foot. A full Ink outline (1.5px small, 2px large), and Phosphor's four-point star (fill), white with an Ink edge, over its top-right corner. The star pops in once, on the peel curve, when a reserve ticket first shows on a surface (bought, or come to the front), and never loops; reduced motion shows it still. A count's dot badge takes the corner, and the star sits just short of it.
- **Used:** the backing a ticket leaves: Liner Lift with a 26% edge and its perforation, carrying the kiss-cut outline of the sticker it became.
- **Marks:** at 18px (the checkout's pack rows) a ticket is a mark with an Ink edge; the reserve mark keeps only its rim of light.

### Out of tickets

Three empty ticket stubs say "used up" without a number. Each used ticket keeps a faint kiss-cut outline of the sticker it became (a 1px graphite line at 62%, dashed on the large stubs), fading in over 700ms: the cut line a sticker leaves on its backing. The small stubs on the seal screen carry the same outlines. Under the title, a printed refill line reads "New daily tickets at 12:00 AM," in bold Ink followed by the countdown ("in 6h 56m") in Graphite, in tabular figures. It never borrows the timer dot's look: no dot, no color field, no tilt, no Dela numerals. Then the perforation, Go to sticker board as the key and Buy reserve tickets on label stock with the Shop's tag. The card doesn't restate the three-a-day rule. When the refill brings tickets back while it's open, it turns over in place and its key becomes a plain Draw.

The start screen shares the card. With daily tickets left, it shows the day's stubs and, when you hold reserve tickets, one small reserve ticket, ×count and RESERVE under them. With daily tickets gone but reserve ones left, it asks "Use a reserve ticket?" instead. Its art is that one ticket, large (148 × 90) at the house tilt, with the count on a Blue dot badge, and no daily stubs. The line says each fact once: "Today's daily tickets are used." in bold, then "New ones at 12:00 AM." in Graphite; screen readers also hear "You have 3 reserve tickets." Then a Blue key and Buy reserve tickets on label stock. The checkout's done step shows the same one reserve ticket, its badge on the new total.

Spending a ticket peels it, the house verb. On the press, the ticket being spent (the last fresh daily stub, or the reserve ask's one reserve ticket) lifts at a corner, 4px and -3°, over 220ms, while the key stays busy in its own color (see the key's Busy state). If the spend fails, it settles back. Once the server answers, its face peels up and away off the backing, fading over its last 40%, in 280ms on the peel curve, and leaves the used backing; a reserve ticket's badge ticks down one and is stuck on again, and a zero never shows. 120ms into the peel, the card drops back 56px and fades over 220ms, faster than its 460ms rise, and its scrim and the grabber strip's clear with it. Keep drawing peels the sealed card's next small daily stub (18px of travel, 220ms) as the card leaves. Under reduced motion there's no lift or travel: the face goes and the backing shows in one frame. The sheet under it takes ink at once. The card keeps showing the tickets it asked about on its way out, so spending the last daily ticket never turns it into the reserve ask. When the ticket shop takes its place, it goes at once and the shop's card rises.

### The Draw key's tickets

The tickets your next drawing can use tuck behind the Draw key's right end, like tickets slid behind a keycap. They're paper on the page, not part of the key: 14px of each hides under the key, they sit centered on its 48px face at -3°, and the key's cast shadow falls on them. They take no taps and don't press; the key sinks over them. By the Ticket Rule:

- **Daily tickets left:** one Seal Yellow ticket, 30px tall, with ×count in Figure type (850, 13px). Tickets this small carry a 1.5px Ink outline, both kinds.
- **Reserve tickets held too:** the reserve ticket sits behind it, 8px higher and fanned 2° further, printed ×count past the daily ticket's end, its star on its corner.
- **Daily tickets used:** the reserve ticket alone, in front.
- **Neither:** the used backing (Liner Lift, a dashed 26% edge) printed with the refill time in fine print, Graphite.

The key's name says what's left: "Draw a new sticker: 2 daily tickets and 5 reserve tickets left", or "…: no tickets until 12:00 AM". The star pops when the key first shows a reserve ticket in an app open, or when one is bought or comes to the front, not on every return to the board. Full-width Draw keys on the cards carry only their label; the card's art above shows the tickets.

### Shop

The Shop tab: reserve tickets on sale, then what's coming. No rules copy anywhere on it.

- **Title:** "Shop" in Headline type at the top left.
- **Reserve tickets:** the page's peak, one Liner Lift card. Three reserve tickets fanned like a hand of cards, only the front one wearing the star, since a star on a ticket behind would peek out past the one over it as a white shard; what you hold (the reserve ticket mark × count, left off at zero); the headline "Reserve tickets"; one line on what they're for; the one-ticket price from the pack list ("¥100 each, less in packs", the tail only while a pack is discounted, outlined while it loads); the perforation; the blue Buy reserve tickets key, the page's only key; and the Sui credit.
- **Coming-soon shelves:** Laminates, Brushes and Backing foils. Each has its name in Title type, a quiet Liner Deep "Coming soon" pill in `--graphite-on-deep`, the Graphite that reads 5.0:1 on Liner Deep where plain Graphite reads 4.2:1, and one Graphite line on what the things are. Four 104px swatches scroll sideways with snap, the fourth peeking past the edge. The first is what you have now, tagged "Yours" on a Pink Soft pill at the house tilt. No prices and no press: the swatches are a list, not buttons.
- **Previews** use the app's own materials. Laminate and backing foil swatches show the newest sticker you drew, or a bundled sample for artists with none, at the house tilt. Gloss is the live resin as it is; Matte drops it for a fine white haze; Glitter adds flecks and Prism faceted foil colors, both moving with the one light. Backing foils are the foil band in other metals: Holo as it is, Gold, Silver and Rose gold. Brush swatches are one S-stroke on white, painted by the drawing screen's own `paintStroke`: Brush (today's pressure taper), Marker (a chisel, its width set by direction), Fineliner (one thin width) and Pixel pen (the stroke on a coarse grid, hard-edged and scaled up).
- **The Sui credit:** "Payments on" in fine print, then Sui's full logo: the black file from Sui's brand kit, unmodified, 16px tall, its wordmark on the text's baseline, with a "u" of clear space. Black because Sui Blue measures under 3:1 on Liner. It's a credit, never a link or inside a button. Japanese puts the logo first (「[logo]で決済」).

### Reserve ticket checkout

The one card that sells reserve tickets, in the out-of-tickets card's stock. The Shop's key raises it over the whole phone, tabs included; the drawing screen's cards raise it over the canvas. The title "Pick a pack", since over the Shop the hero's own "Reserve tickets" shows just above it, then "Reserve tickets never expire." in bold Ink. The balance sits in a Liner Lift well in yen, labelled "Balance" (残高), never the coin's name: the Sui account's JPYC, one yen each. Packs are label rows: a reserve ticket mark, the name, and the price in the last column, so every row's price lines up. A discounted pack stacks its price: the discount ("−40%") in plain Ink fine print before the struck-through full price, then the yen in bold. There's no sale sticker: pink means gratitude and you, and a discount never outshouts the picked pack or Pay. The picked pack is stuck on in Blue Soft with a Blue ring, and its struck-through price turns Ink, since Graphite reads only 3.3:1 on Blue Soft. When the balance can't cover the picked pack, Pay stays sunk and a line under the packs says so plainly, in bold, then what to do: pick a smaller pack if the balance covers one, or add JPYC to the Sui account. Then the perforation, the blue Pay key, the Sui credit and Not now. Every amount shows in yen; SUI never shows. The smallest pack is picked to start. A failed payment says what failed, with Back to the packs as its key.

### Stickers

- **Die-cut:** the outline comes from the artist's own strokes, offset into a white border and bounded by the kiss-cut groove, with the sticker cast shadow beneath.
- **Baked resin:** the gloss is baked into the image, with the print darker and more saturated where resin pools at the edge, a refraction band inside the cut edge, a rim light and a meniscus at the foot.
- **Live resin:** on stickers that are showing, a live layer adds a specular along the top edge, a rim light and a sheen that sweeps when the sticker is placed, dragged or tilted.
- **Foil:** a sticker drawn by someone other than the board's owner wears a foil band just outside its white edge, 4% of the sticker's long side: about 5px on the board, wider on the detail's big sticker, narrower on tray sheets. It's the silhouette grown by that distance on the server, one mask per sticker, so it follows the cut at an even width round curves and points; a sticker without that mask dilates its silhouette in sixteen directions instead, 5px on the board, 6px on the detail, 3px on sheets. The band is the sticker's edge: the white edge runs straight into it, the image shows only inside its own cut, and the kiss-cut and cast shadow fall from the band's outer edge. A fine diffraction grating lies over it and never moves: diagonal hairlines on a 2px period, lit white and shaded Ink at low alpha. The six foil bands flow under the grating, so the band glitters rather than crawls, and a white glint sits where the one light falls; holes hide it; it's decorative, and the sticker's own label names the artist. The seal ceremony adds nothing: a freshly sealed sticker is yours and plain.
- **Glow:** gratitude shows on a sticker as a soft glow behind it, warmer and brighter with more gratitude.
- **Peel and stick:** a sticker peels with a 3D lift toward the top right and sticks with a short settle from 1.06 scale.

### Artist chip

Who drew a foil sticker: a Liner Lift pill (40px) with the artist's LINE picture in a white edge inside a turning foil ring, then a fine-print ARTIST caption over "@name" (760, 14px). A one-line "By @name" variant is for tight spaces. The copy is "artist" or "By", never "from".

- **First load:** when a board opens, each foil sticker's chip pops in at its top-left corner, top to bottom 80ms apart, holds about 2s and fades (3.2s in all), in one layer above every sticker and the name header. It happens once per opening. Reduced motion shows and hides it without the pop.
- **Tapped:** the chip heads the selected sticker's menu, above its actions, until you deselect.
- **Detail:** under the big sticker, the chip leads the fine print. Your own stickers never get a chip.
- **Plain:** off a board, where foil never shows (Explore's lifted sticker), the chip has no ring: the picture keeps its white edge, cut from the pill by a kiss-cut, and casts a small shadow.

### Explore

Browse what everyone draws, see who drew each sticker, and get to that artist's board. Under the search, a two-way switch picks **Stickers** or **This week**. Search results replace both views.

- **The view switch:** a Liner Deep track with one label stuck on the current view, Soda Aqua for the switch and Bonbon Pink for the leaderboard tabs inside This week. The label slides to the tapped tab in 260ms on the ease-out; the text changes color in 140ms. The tabs take the shared press and the arrow keys. Reduced motion moves the label at once.
- **This week:** the three leaderboards, moved as they were, with "Resets Monday 4:00" in fine print under the list. On a new board the old rows fade out in 90ms and the new ones stick on from the top, 25ms apart (the first five, the rest together), each rising 6px over 200ms. Reduced motion cross-fades them in 120ms. Best combo is the hit counter.
- **The pile:** Explore's stickers are a heap of real die-cut stickers, never a grid or a feed. Each Tokyo day (turning over at 4:00) is its own layer, newest first: a perforation row across the whole width as its top edge, with the day's dot badge stuck on it at the house tilt (Seal Yellow "Today 9.26", Liner Lift "9.25" for older days), then that day's heap resting on the next day's perforation. The last day ends on a bare perforation.
- **The heap:** stickers drop onto the floor oldest first, so the newest lie on top: at a few seeded, middle-leaning spots, sliding off anything they can't balance on, sinking into what they land on and staying at the lowest of those drops, turned up to 17° either way. The layout is 360 units across on every phone, seeded by the day and the sticker, so the pile looks the same on every visit and a new sticker moves nothing beneath it. Stickers keep their size however many share a day.
- **Flat:** pile stickers are the sealed image alone, with its own cut, white edge, cast and baked resin: no live light and no foil. Only the lifted sticker gets live resin. A tap lands only on the cut line or the tags, so a clear corner lets the tap through to the sticker beneath.
- **Name tags:** every sticker wears one across its lower left edge, turned a little against the sticker: a Liner Lift pill with the artist's LINE picture as a 16px photo sticker (letter fallback) and "@handle" in 11px bold. A given sticker adds a Soda Aqua "to @ken" tag under it. No later sticker or tag ever covers an earlier tag.
- **Empty:** a day with no stickers yet shows a faint dashed kiss-cut outline on its floor and "The first sticker sealed today lands here."
- **The fall-in:** on a first look, today's newest 14 fall in from under the view switch, oldest first, 55ms apart: 620ms of gravity (slow off the top, fastest as it lands) while spinning 24° into their turn, then a squash to 1.05 × 0.93, a 5px rebound and the stick settle. A shadow of the sticker in the air converges from the peeling offset to the sticker's own cast and fades as it lands. It waits for the falling stickers' images, at most 0.7s. On a return visit only stickers new since your last look fall, and every new sticker wears a Seal Yellow NEW pip on its tag; screen readers hear "3 new stickers since you last looked". Reduced motion fades the whole pile in over 150ms. While Explore loads, today's badge and faint die-cut shapes on its floor stand in (the skeleton), and the fall-in is the arrival.
- **Screen readers and keys:** a section per day ("Today", "Yesterday", "September 24"), each an ordered list of buttons newest first, named like "No.0147 by @mika, 5 min ago" and ", given to @ken". A focused sticker rises to the top of the pile, lifts 2px and gets the house focus ring around its cut; Enter or Space lifts it.

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
- **Where:** the Best combo figure on Explore's leaderboard (23px) and in the cork back's Bests (20px).
- **Nothing like the multiplier:** no ×, no tag and no puffy face.

### Selection handles

A selected sticker on the board shows a clear frame (a 1.5px line at 50% Ink, 10px outside the sticker, with 10px corners). Four 20px corner squares in Liner Lift with an ink edge resize it. A 28px round knob with Phosphor's arrow-clockwise icon rotates it, on a 20px stem above the top edge. Every handle has a 44px hit area. The frame turns full Ink while a handle is being dragged.

### Sticker tray

Your whole collection, in a pink canvas tray zipped down the board's right edge. The zipper is the tray's alone.

- **Zipper:** drawn from the real part. Two woven tapes in Tray Tape with white stitching, white molded teeth in two rows offset by half a pitch (12px), a top stop on each tape, a bottom stop across both, a white painted-metal slider, and a Bonbon Pink paddle pull hinged on its bridge. It's matte, lit flat from the top left.
- **Opening:** it opens top down. The slider rests at the top, just under the board header, with its pull hanging down. Pull down and the slider follows with a little stiction and a tick per tooth, and the teeth part behind it, showing the lining. Released under 25% of the travel it springs shut, the teeth meshing back in a ripple; past 25%, or flicked, it runs to the bottom stop, knocks it, and the mouth overshoots and settles at half the screen. The pull flops over so it always lies toward the next pull. Push up or tap to close. It can be interrupted at any point.
- **Idle and shake:** on the first three visits, or while something NEW is inside, the pull tugs itself at most twice a visit. When the phone moves (only with the app's existing motion permission), the pull swings and settles, the chain ripples and the slider jiggles a pixel or two. It never opens the tray. A Seal Yellow pip on the pull marks something unseen inside.
- **The sheets:** inside is a stack of loose 156 × 364px backing-paper sheets. Each has a perforated tear strip at the top to grip, and its date range and number printed on its foot. Up to three sheets sit behind the front one, each 15px lower, 2.5% narrower and a shade darker, so their dated edges show below it and the stack is its own index. Deeper sheets collapse into a "+N" pill with Phosphor's stack icon. The tray opens on the newest sheet.
- **Packing:** stickers are laid organically on their real cut lines, at least 6px apart, in arrival order, bottom up so the newest sits highest, with small seeded turns and never shrunk. A sticker's spot is permanent: an earlier one never moves, and a given sticker's spot stays blank.
- **Holes:** a sticker out on the board leaves its kiss-cut hole in its packed spot: plain backing paper with the faint maker print, a crisp cut line and a hair of shadow on the top-left inside edge. Tapping a hole shows that sticker on the board.
- **Paging:** the stack is a cyclic deck. Swipe up and the front sheet tucks in at the back; swipe down and the back sheet comes to the front; tap a dated edge and that sheet comes forward, riffling through the ones before it. The first 10px lock the direction: mostly vertical pages, wherever it started; horizontal toward the board peels a sticker if it started on one, or pulls the sheet out if it started on paper. PageUp and PageDown page too.
- **Folder tabs:** All (liner), Mine (pink) and Gifts (grape) stand up from the stack's top edge, 46 × 24px padded to 44px. The current one is full hue and lifted; the others are soft fields. A tapped tab stands up (220ms, `--ease-out`) as its fill and shadow come in (160ms), and the tabs take the shared press with 1px of travel; under reduced motion a tab stands up at once and only its color changes, in 120ms. A filter chooses sheets and never moves a sticker: in about 650ms the stack gathers into the mouth, the front sheet and every sheet without a match slide back into the tray, the rest riffle, and the newest match is dealt onto the front. Stickers that don't match fade to 20%. Reduced motion crossfades.
- **Pulling a sheet out:** drag the front sheet's paper toward the board and past about 60px it floats over the board at full size with the floating-sheet shadow and an X at its top left (a 30px Liner Lift disc with Phosphor's x). The tray sags to a crack. Stickers peel or tap off it; board stickers whose hole is on it drop back in. The X, dragging it back, closing the tray or opening the spread sends it home on top of the stack. One sheet out at a time.
- **The spread:** the +N button deals every sheet onto the tray's lining, front first, dates kept at the 11px floor. Tap one to bring it to the front; tap the lining or press Escape to put them back.
- **Peel and snap-back:** press a sticker and its edge lifts; drag and it rides under the thumb while the mouth relaxes to a crack and the sticker's own soft shadow previews where it lands. Drag a board sticker to the right edge and the tray opens to its sheet, its hole breathing in Ink until it drops in.
- **Reduced motion:** the pull toggles and the open tray fades in over 150ms; paging and tab changes cross-fade; the peel lifts without a tilt; no idle tug and no shake.

### Gift bag

A frosted bag with no zipper. Packing drops the sticker into the open bag, peeking out of its mouth. The bag seals only when the send succeeds: the sticker settles in, the mouth presses shut, and the seal goes on. It's built like a konbini wrapper: a clear film band heat-sealed across the mouth, with a Soda Aqua tear tape running through it, printed with the pull direction and "SEALED 9.23". The tape's loose end is the pull tab: a narrow neck leaves the film at the bag's left edge and widens into a rounded lobe that sticks out past the edge, tips up and casts a shadow, with three grip ribs moulded across its free end and PULL printed on it.

- **Opening:** the receiver takes the tab and drags it along the strip. The tape tears out behind it with resistance, lagging the finger and advancing in small ticks, and hangs from the tab in a loop that grows as you pull. Behind it the film splits along its line, rimmed by a thin torn edge, showing the bag's pale inside and the top of the sticker's sleeve. Let go early and it settles back. Past the end it snaps free, the tab flies off, the mouth springs open, the sticker rises, and the receive dialog slides up.
- **Alternatives:** a looping hint shows a small pull; double-tap or press-and-hold tears it by itself; for keyboards and screen readers the tab is a slider. Under reduced motion there's no loop and the snap becomes a fade.
- **The tag** is printed, never typed. It reads "For @name" when the recipient was chosen in the app, and "From Alice" when it went through LINE's picker. An opened bag carries a rubber OPENED date stamp on its tag.

### Timelapse

The sticker detail plays how a sticker was drawn, stroke by stroke, in the sticker's own spot. It's never called a replay: that word belongs to the gratitude card.

- **The button:** a small label-stock button, "Timelapse" with Phosphor's play, at the end of the fine print ("by @mika · drawn in 2:51 · 9.26"). It shows in your stickers and the ones you gave, only for a sticker sealed with its timelapse, once the detail's answer is in. Every state's label shares one cell, so it never changes width: Loading…, Preparing… while the fills get ready, then Skip (Phosphor's skip-forward) while it plays.
- **Where it plays:** white paper cut to the sticker's silhouette covers the figure, the same size in the same spot, and the ink comes back inside it as it was drawn, eraser included. The silhouette, cast shadow, kiss-cut and foil stay put around it, and ink outside the final cut never shows. Fills spread in a circle from where they were tapped.
- **Length:** 2.5–6s, longer for a sticker that took longer. Every stroke keeps its own pace; only the pauses between them shrink.
- **The end:** the finished ink holds 300ms, the paper fades out over 400ms onto the real sticker's resin, and the sheen sweeps once, as when it was sealed.
- **Skip and stop:** Skip, or a tap on the sticker, jumps to the finished ink and the reveal. Paging, Escape, Back and closing stop it at once, and the paper goes before the sticker flies back to the board.
- **Failure:** the paper goes, and a line under the fine print says "Couldn't load the timelapse: {reason}" with Try again.
- **Reduced motion:** the strokes still play, since nothing crosses the screen; fills appear whole, and the end is a 150ms fade with no sheen.
- **Screen readers:** the paper is hidden; one polite line says "Playing how No.0147 was drawn", then "Done". The button reads "Timelapse: watch No.0147 being drawn", then "Skip to the end", and focus stays on it.

### Sticker trail

A sticker's detail shows where it has been, one quiet row per hand-off, newest first, replacing any separate provenance line.

- **One open row:** the most recent gratitude opens by default: a Liner Lift card with a pink outline, the amount in Figure type at 27px beside a pink heart dot, who it's from, and the screen's only Replay button. While you still owe gratitude for the newest gift, none opens: Send gratitude is the call.
- **Closed rows:** a sentence ("@mika gave it to @ken · 9.18") and a trailing amount with a caret, as one full-width 44px tap target. Tapping one opens it and closes the other. The viewer reads as "you". Names are Ink and bold; "gave it to" and the day are Graphite. The artist is named once, in the by-line, so rows carry no artist tag.
- **The artist's fifth:** when the giver isn't the artist, the open row adds one line under a hairline rule: "2,357 to @ken · 590 to @mika, its artist", or "590 of it came to you, its artist". Copy never uses money words.
- **Calm at length:** past the newest gift, the rest fold into one "N earlier gifts" control, with a caret, directly under it.
- **Order:** when you can give the sticker, Give sits above the gratitude card (the open row); otherwise the actions stay below the trail.
- **The number:** No.0147 sits on a Seal Yellow label at the house tilt, in Dela.
- **On its way:** a Liner Lift note with the gift bag's frosted sleeve replaces Give: "On its way to @bob" once the app knows who it waits for (the artist picked in the app, or whoever first opened its link), and "On its way" until then, since LINE's picker never says who was picked. The badge on the board reads the same.

### Gratitude replay

The trail's open row plays its gratitude combo back inside the card, never in a modal.

- **Replay:** the pill turns to Stop (Phosphor's stop), and a stage eases open inside the card, between the amount and the artist's share (200ms, height and opacity): the card's inner width by 300px, on the Mini-game's Liner with a hairline edge. The amount and the heart dot stay above it as the card's header. The replay loads on the press, with the heart resting on the stage meanwhile.
- **What plays:** the combo as it was recorded, through the Mini-game's own rules and effects at the stage's scale: the drain bar and amount along the stage's top, the multiplier, the tiers, pop-in words and mini hearts. Every tap plays where and when it landed; a shake plays from its unlock; a stroke plays its recorded passes. The same combo draws the same words every time.
- **Length:** a combo of up to 4s plays in real time; a longer one plays sped up to take 4s, at most twice as fast.
- **The landing:** no receipt. The heart shrinks into the card's pink heart dot, the 27px amount pulses once, and after a 600ms beat the stage eases shut and the pill reads Replay again.
- **The amount is the record's:** the card always shows the stored total, and a replay that counts differently ends its bar on it.
- **Stop:** Stop, Escape, paging, or opening another row ends it at once and shuts the stage. Scrolled off screen, it holds still until it's back.
- **Watched:** the giver's first replay of new gratitude marks it watched as the heart lands.
- **Failure:** the stage shuts, and a line under the card says "Couldn't load the replay: {reason}" with Try again, or "The replay stopped: {reason}".
- **Reduced motion:** it plays through the Mini-game's reduced path: fades for flights, no screen shake and no climax. It follows the setting mid-play.
- **Screen readers:** the stage is hidden; one polite line says "Replaying @bob's 2,946 gratitude", then "Replay ended". The pill reads "Play the replay of @bob's 2,946 gratitude", then "Stop the replay", and focus stays on it.

### Gratitude

One experience for everyone, on plain Liner, once per hand-off.

- **The combo:** the first tap starts a timer game. A drain bar appears full and runs down; each tap adds less time than the last. The amount counts up in Figure type beside a puffy multiplier sticker (×1 to ×8) driven by tap speed. Nothing sits on or over the heart, and the heart holds its spot.
- **Tiers:** reached by the amount (ありがと, 照れ, ドキドキ, オーバーヒート, 昇天). Each new tier slams its name in outlined 袋文字, and pop-in words from a per-tier bank appear and go. The ground escalates from calm Liner to a blush, focus lines, heat haze and a white-out.
- **Mini hearts:** from ドキドキ up, taps spray small pink hearts that bounce, collide and pile along the bottom before fading. A tap shoves nearby hearts away, harder the closer they are. The heart sweats hearts: a slow drip at ドキドキ, a real sweat at オーバーヒート, heavier at 昇天, all landing in the same pile with 昇天's rain.
- **Discovery:** stroking the heart stretches it along the drag, and after three tries a tip says what to do. After the one motion opt-in, it sways with the wrist, and shaking hard says "Keep shaking!".
- **After 昇天:** condensation fogs the glass in from the edges over 1.2s and clears on its own.
- **After:** the receipt shows the amount, the best multiplier and the combo's length. The sticker's trail replays the combo inside its card (Gratitude replay). The giver will see a pink tag on the board's edge whose card plays the same replay.

### Loading

- **Skeletons:** while a screen loads, it shows its own layout in outline, never a "Loading…" line: blocks of pressed Liner (Liner Deep) with a slow white shine passing over them, real headings and tab labels where they're fixed. Explore outlines today's floor with faint die-cut shapes, or the leaderboard; the ticket shop its balance and pack rows; the sticker board faint die-cut shapes where stickers usually sit. A screen reader hears one status line ("Loading Explore").
- **Reveal:** loaded content rises 6px into place and fades in over 220ms. A picture (a sticker, a photo sticker) holds back until its image has loaded, then fades in whole, never half-drawn.
- **Tabs:** changing tabs cross-fades the screen over 300ms on a gentle ease: the old one fades out and sinks back a little as the new one fades in and settles up 8px from 98% size. The tab bar changes crisply around it. Browsers without View Transitions change at once.
- **Reduced motion:** no shine and no rise; tabs cross-fade plainly in 150ms.
- **The last board:** the sticker board a phone last showed is kept on it for the person signed in, so the next open draws those stickers at once, with no outlines, and swaps in the fresh board when it lands. It can be one refresh out of date.
- **The board first:** while the board assembles, nothing else downloads. The stat board, the sticker detail, Giving, Explore, the Gratitude Mini-game and the drawing screen load once every sticker on the board has decoded and a quiet second has passed. Draw tapped before then opens the drawing screen on plain Liner for the moment its code takes.

### Toast

An Ink slip with Liner text (600, 14px) and 6px corners on the lift shadow. It rises 10px in and sinks out.

### Icons

Every icon is Phosphor Icons (MIT) as `@phosphor-icons/react` 2.1.10 renders them, through one registry: `apps/frontend/src/icons`. An icon that carries one of the app's meanings goes by that meaning there (`DrawIcon`, `GiveIcon`); the rest keep Phosphor's names. The app's own controls use bold; fill marks an active or primary state, such as the current tool or the current tab; the mocked LINE and iOS screens use regular. The same action always gets the same icon:

- **Draw:** pencil-simple-line (fill), on every Draw action: the board's Draw key, Keep drawing, the print on fresh ticket stubs and the chat menu's Draw tile. The brush tool keeps paint-brush; it's a drawing tool, not the Draw action.
- **My board:** smiley-sticker, on the tab (bold, fill when current), every "go to the board" action and the chat menu's My board tile (fill).
- **Explore:** compass. **Shop:** tag, on the tab and every way into the Shop.
- **Gratitude:** heart (fill) at every size, since it's a mark, not a control: Send gratitude, the Transfer Trail, the combo HUD and the receipt. **Streak:** fire (fill).
- **Give** is gift, **View** eye, **Offer** handshake and **Remove** tray-arrow-down.

Screens that build their DOM from strings (the mini-game, the tray) carry copies of Phosphor's paths; `phosphorCopies.test.tsx` checks each against the installed package.

**The Never Hand-Drawn Rule.** Icons are never drawn by hand and published paths are never edited. If Phosphor doesn't have it, choose a different Phosphor icon. A text glyph (♡, ★) never stands in for an icon.

**Brand marks** (Sui's and Ethereum's, from Simple Icons, CC0, in `icons/brandMarks.ts`; LINE's logo from Simple Icons or LINE's guidelines) and illustrations (the heart you tap, stickers, avatars, pins, tape, stamps, zipper parts) are not icons. Brand marks are pasted verbatim. Sui's brand kit forbids altering its logo, so the stat board's chain pin, which recolors and outlines Sui's mark as a push-pin head, is an open exception.

### Chat menu

The official account's menu under its chat in LINE, drawn as the board foot. LINE shows the 2500 × 843 image 390 wide, so it's drawn at 390 × 131.5 from the app's own tokens, key and label stock (`deploy/line/returning-menu.html`), and `pnpm --filter frontend chat-menus` renders every version.

- **Returning:** the Draw key (Seal Yellow, Phosphor's pencil-simple-line in fill) sits in the left 1409px, Draw's tap area. My board and Explore are pink and aqua label stock stacked on the right, 10px apart, with smiley-sticker and compass in bold. The house gutter runs round the edges and between the columns.
- **Tickets:** LINE can't vary an image per person, so each ticket state is its own menu, linked person by person. The tickets tuck 16px behind the key's right end, as on the app's Draw key: a Seal Yellow ticket ×3, ×2 or ×1; the blue reserve ticket, with no count, once only reserve tickets are left; and at none, the used backing printed with Tokyo's midnight (12:00 AM, or 0:00). The key keeps one width (136px) in every ticket state, so only the tickets change; the plain menu has no tickets, and its key fills the area. It shows counts, never the three-a-day rule.
- **New people:** one large key across the image, Japanese over English (シールボードをひらく, Open Sticker Board), since it can't know their language, with the sticker board icon as tall as both lines (30px). It uses the greeting's words.
- **Words:** the app's own (Draw, My board and Explore; かく, マイボード and さがす). Each tap area's screen-reader label says what the image shows, in at most 20 characters ("Draw, 2 tickets left").

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
- **Do** show gratitude figures plainly, to everyone: in the combo, the receipt, the sticker's trail and the board's cork back.
- **Do** use icons from the registry only: Phosphor bold at rest, fill for an active state, regular inside the LINE and iOS mocks.
- **Do** give every touch target a 44px hit area, including small labels, quiet links, sticker handles, folder tabs, the +N stack button, a floating sheet's X and the zip pull.
- **Do** put foil on every sticker drawn by someone other than the board's owner, and name its artist with the artist chip.
- **Do** honor reduced motion. Durations collapse to 1ms, presses halve and lose their spring, the tray, paging and tab changes fade, the board's turn crossfades, the foil holds still, and the gift's snap becomes a fade.

### Don't:

- **Don't** put white text on a coded field.
- **Don't** use green anywhere in the world. LINE's #06C755 belongs only inside LINE's own mocked UI.
- **Don't** put gloss, a highlight line or a sheen on any control.
- **Don't** restyle a key's or label's face or base, or add your own pressed transform to them.
- **Don't** put foil on the board owner's own stickers, on surfaces that aren't a board, or use it as a rarity grade. The pearl rim is retired.
- **Don't** set headings or body text in Dela Gothic One.
- **Don't** put a second key on a screen, or give a key to a tomato (can't-undo) action.
- **Don't** put a zipper on anything but the tray. The gift bag tears open along its tape.
- **Don't** put stats in a sheet or a big-number card; they live on the cork back as paper.
- **Don't** show grid paper anywhere; hint paper with liner stock and the faint maker print.
- **Don't** describe gratitude with money words (royalty, earn, reward, cut, share, %). It flows "to" people. "Residual", the receipt's name for the Original Artist Gratitude Share, is the one allowed exception (ad0ll, 2026-09-26).
- **Don't** hand-draw an icon or edit a published path. Brand marks and illustrations are the only exceptions.
- **Don't** use Canvas white as a page ground. It's for drawing surfaces and white label stock.
- **Don't** use NFT, crypto, token, wallet, mint or similar words in visible copy. The one exception is "Sealed on-chain" with the sticker's ENS name.
