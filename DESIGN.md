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
- Icons come from Phosphor through one registry, with Material Symbols' `draw` as the single exception. They're never drawn by hand.

## Colors

The palette is Liner and Ink, plus five candy-bright coded fields, each with one meaning and always carrying ink text. Each coded hue has one curated deep partner, used only as the lip under a key or label.

### Primary

- **Seal Yellow** (seal-yellow): "Now". The default key (Keep drawing, the seal check, Draw on your board), daily tickets, the draw screen's timer dot, the streak leaf's band on the cork back, NEW dots, and text selection. It's the most common field in the app.

### Secondary

- **Soda Aqua** (soda-aqua): giving. The Give key (including where Draw sits on someone else's board), the Explore tab, the gift bag's tear tape and its pull tab, and viewer hints mixed toward Liner.
- **Bonbon Pink** (bonbon-pink): gratitude, and you. The Send gratitude key, the heart and its mini hearts, the My board tab, the tray's zip pull and its Mine folder tab, the open trail row's outline, the selected leaderboard tab, and on the cork back the receipt's pushpin and your name's washi strip.

### Tertiary

- **Grape** (grape): received, offers, and reserve tickets. The Accept key on a gift, the ticket shop's Pay key and picked pack, the Use a reserve ticket key, the Shop tab, the Send offer key, Offer for it on someone else's board, the tray's Gifts folder tab, received-sticker marks, and the ruled lines of the notebook scrap on the cork back.
- **Tomato** (tomato): can't undo. Stopped states and warnings. It's never a key.
- **Foil** (foil-pink, foil-peach, foil-lemon, foil-aqua, foil-sky, foil-lilac): six iridescent bands, one 96px period, that flow along a sticker's foil band and turn in the ring round the artist chip's picture. It isn't a fill color. It's a material worn only by a sticker drawn by someone other than the board's owner. It has no green.

### Lips (deep partners)

- **Seal Deep, Aqua Deep, Pink Deep, Grape Deep, Tomato Deep** (seal-deep, aqua-deep, pink-deep, grape-deep, tomato-deep): the front wall under a coded key or label. They never appear as fields or text.
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

**The One Meaning Rule.** Each hue means one thing: yellow is now, aqua is giving, pink is gratitude and you, grape is received, and tomato is can't-undo. Don't pick a hue for looks.

**The Other Hand Rule.** Foil appears only on a sticker drawn by someone other than the board's owner (on your tray's sheets, someone other than you). Your own stickers keep the plain white die-cut edge; the pearl rim is retired. Surfaces that aren't a board (Explore's feed, the leaderboard) show no foil. It's never a rarity grade.

**The Platform Green Rule.** The world has no green. LINE's green appears only inside LINE's own mocked UI (the chat, the Gift Message, the consent and share screens, and the app badge).

## Typography

**Display Font:** Dela Gothic One (with Mona Sans fallback)
**Body Font:** Mona Sans, a variable font with a width axis (with Zen Kaku Gothic New for Japanese, then system-ui)
**Japanese:** Zen Kaku Gothic New (with Hiragino Sans fallback)
**Platform chrome:** the native system stack (-apple-system, SF Pro Text, Hiragino Sans), used only inside mocked LINE and iOS UI.

**Character:** Mona Sans is the label stock, a precise and slightly technical sans that changes width with the job. Dela Gothic One is the puffy voice, heavy and rounded, and it belongs on the key and on the moments gratitude shouts.

### Hierarchy

- **Display** (400, 20px; 23px on the large key, 17px on the compact key; line-height 1): the key's label. It also sets dot badges (12–19px), the gratitude multiplier (×8.0), the giver's gratitude tag, and the outlined 袋文字 tier captions (46px, pink inside white inside ink).
- **Figure** (900, 26px on the cork back's stamps and 27px in the open trail row, up to 52px on the gratitude receipt and 58px on the streak leaf; line-height about 0.95, width 125, tabular): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the cork back (the receipt's TOTAL at 30px), and the hit counter (23px on the leaderboard, 20px in the cork back's Bests).
- **Headline** (800, 26px, line-height 1.08, width 112, balanced wrap): screen and dialog titles such as "Sealed on-chain" and "Out of tickets for today".
- **Title** (800, 18–22px, line-height 1.1, width 112): sheet titles, the board header's name, and the name card and notebook scrap heading on the cork back (18px).
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
- the caption and badge on LINE's rich menu

Nothing else is set at 75.

**The Puffy Voice Rule.** Dela Gothic One appears only on keys, dot badges (the draw screen's timer dot is one), the gratitude multiplier and tag, and outlined 袋文字 captions. It's never used for headings, body text or plain figures.

**The Hits Rule.** A combo's length is counted in hits, the way fighting games count it, never in taps. It never wears ×, which belongs to the multiplier. It always shows as the hit counter.

## Layout

Every screen is a 390 × 844 iPhone viewport. From top to bottom there's a 47px status bar, LINE's 56px LIFF header, the screen, and the 84px index-tab strip (Liner, under a 14% hairline) with a 34px home-indicator safe area. Full-screen LINE chrome hides the LIFF header and the tabs, and a bare LIFF screen hides only the tabs. A screen can also let the tabs hide: they tuck below the page, and a 36 × 5px grabber sits 20px above the home indicator, clear of iOS's home swipe. Tap it or drag it up and the tabs slide back; the next touch elsewhere, or 4s idle, tucks them away again. The draw and seal screens use this, so the canvas gets the room.

The spacing rhythm steps in 4px units, and 12px is the house gutter. Tabs sit on a 12px inset with an 8px gap, and sheets pad 18–20px on the sides and 24px at the foot. Controls anchor to the thumb zone. The key sits low, usually bottom right or centered at a sheet's foot, with any secondary label or quiet link directly beneath it.

The sticker board is free-form, not a grid. Stickers sit wherever they were dropped, at their own size and slight rotation. The board's header is your avatar and name at the top left; the compact Draw key floats at the lower left; the sticker tray runs down the right edge from under the header (y 64) to the foot and opens across half the screen. Someone else's board keeps the same layout with the tray gone, so the field runs to the right inset; Give takes Draw's slot, and a small Explore back chip sits beside the name. The cork back is a two-column grid (206px and the rest, 16 × 12px gaps) under the person's picture and name card, with Flip back at the foot of the right column in the thumb's reach. No surface shows grid paper: paper is hinted by the liner stock and the faint diagonal "SEAL · シール" maker print, never a full grid.

The gallery around the phones (a sticky flow index, a 260px story column beside rows of scaled phone frames, and a viewer with a 300px strip) collapses to one column at 1100px and stacks the viewer at 760px. Each phone's caption is a plain annotation: the element, where it is in parentheses, and what was just done to it and what that shows, with a quiet step number the gallery adds. It belongs to the design review, not the app.

## Elevation & Depth

Depth is physical, and it comes from a single light at the top left. Every cast shadow falls down and to the right, uses neutral Ink alpha and is layered in two parts, a tight contact and a soft throw. Controls get their depth from thickness, not shading: a key sits on a 6px lip and a label on 3px of paper, and the base casts the shadow, so pressing never darkens the lip. Stickers get their edge from a 0.5px kiss-cut groove drawn as a drop-shadow on the alpha, so the silhouette casts the shadow rather than a box.

Stickers and the gratitude heart also respond to the app's one moving light. The shared light variables run from -1 to 1. They follow the pointer or touch, and device tilt where the browser already allows it without a prompt, and they idle-sway on an 11s loop so stills look alive. Buttons don't follow the light; they have no highlight to move.

### Shadow Vocabulary

- **Key base** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 2px 6px 12px -3px rgba(28,24,36,.24)`): under every key, cast by the still base.
- **Label base** (`box-shadow: 0 1px 0 rgba(28,24,36,.06), 1px 3px 5px -2px rgba(28,24,36,.16)`): under label stock.
- **Label** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 1px 2px 3px rgba(28,24,36,.08)`): a flat label resting on the liner, such as the tool strip or a chip.
- **Lift** (`box-shadow: 1px 3px 4px rgba(28,24,36,.12), 3px 10px 22px rgba(28,24,36,.14)`): something held above the page, like a toast or the Smoothing bar.
- **Sheet** (`box-shadow: 0 -1px 0 rgba(28,24,36,.06), 2px -8px 28px rgba(28,24,36,.12)`): a bottom sheet rising over the page.
- **Kiss-cut** (`filter: drop-shadow(0 0 .5px rgba(28,24,36,.55))`): the die-cut groove around every sticker.
- **Sticker cast** (`filter: drop-shadow(1px 2px 1.5px rgba(28,24,36,.16)) drop-shadow(2px 6px 8px rgba(28,24,36,.10))`): a sticker stuck to the page. It's always paired with the kiss-cut.
- **Peeling** (`filter: drop-shadow(3px 7px 5px rgba(28,24,36,.18)) drop-shadow(8px 16px 18px rgba(28,24,36,.12))`): a sticker lifting off, tilted in 3D by 11°.
- **Floating sheet** (`box-shadow: 0 0 0 .5px rgba(28,24,36,.18), 3px 7px 8px rgba(28,24,36,.16), 8px 18px 30px rgba(28,24,36,.18)`): a sheet pulled out of the tray, hovering over the board.
- **Pinned note** (`filter: drop-shadow(0 1px 0 rgba(28,24,36,.12)) drop-shadow(2px 5px 5px rgba(58,36,16,.26))`): paper hanging on the cork back, from its pin or tape.

### Named Rules

**The One Light Rule.** There's one light for the whole app. Static shadows fall down and to the right from the top-left light, and every moving highlight (the sticker specular and sheen, the foil's glint, the heart's gloss) reads the shared light variables. Don't add a second light source. The foil's glint sits where the light falls, the same way on every sticker whatever its turn, and holds where the last tilt left it; before any tilt it rests top-left. Only the foil's bands run on their own clock, flowing on a 7s loop staggered per sticker. They hold still under reduced motion.

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
- **Compact:** Draw on your own board, a Seal Yellow compact key at the lower left over the stickers. On a new artist's first visit it hops and a pulse ring surrounds it, held by a wrapper so the key keeps its own lip.
- **Disabled:** sunk flush with the page, with no lip and no ink: a Liner Deep face and a graphite label. Enabling springs it up out of the page.
- **Hover and focus:** hover shades the face 6% toward Ink. Focus draws a 2px Ink outline at a 3px offset.
- **Visiting:** on someone else's board, a Soda Aqua compact Give key sits in Draw's slot, and it's that board's one key.
- **Where it goes:** Keep drawing, Pay in the ticket shop, Use a reserve ticket, Give, Send in LINE, Accept, Send gratitude, Send offer, the seal check, Draw on your board and Give on someone else's. A can't-undo act never gets the key.

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

Two tabs cut from label stock, side by side on the Liner strip: My board (pink) and Explore (aqua), each up to 176px wide and 46px tall with a 6px radius. Draw isn't a tab; the board has its own Draw key. An inactive tab is an outline (a 26% Ink edge) with graphite text; the current tab is stuck on in its full hue with Ink text, lifted 2px with a lift shadow. Each tab presses 1.5px through the shared press. Current is shown by fill and lift only, never by weight or case. My board's icon is the person's own LINE picture as a 24px photo sticker, the same whether current or not; Explore's is Phosphor's eyes, bold at rest and fill when current. On screens where the tabs hide, the whole strip slides away behind the grabber described in Layout.

### Board header

Your avatar (a 42px photo sticker at -4°) and your name (800, 18px, width 112) at the board's top left, as one button with a 48px target. Tapping it turns the whole board over to its cork back; on someone else's board, their name does the same with their figures.

### The cork back

The board's back, where a person's figures are pinned up as paper. It's the only place stats live.

- **The turn:** 640ms. The board lifts to 0.92 scale, turns on its vertical axis over the Ink table, with each face darkening as it turns from the top-left light, and lands with a small overshoot. A tap mid-turn reverses it. Reduced motion crossfades the faces in 180ms. The tray and Draw are fixed to the front and turn away with it; the front takes no taps while turned.
- **The person:** their photo sticker and their name on a Liner Lift card held by washi (pink on your own board), where the header sits on the front.
- **Gratitude:** a printed receipt pinned with a pink pushpin, one row per kind (Daily, Inspired, Magic, and As the artist when above 0), each with a colored dot and a one-line plain-words reason, and the total as its TOTAL line.
- **Streak:** a torn-off calendar leaf with a Seal Yellow band, the day count in Figure type and the rule beneath.
- **Stickers:** made, received and given as three postage stamps stuck on at small turns, each printed on its hue with an Ink rule.
- **Bests:** a torn notebook scrap with grape rules, held by washi. Best combo on it is the hit counter.
- **About:** the ENS name and the joined date on Ink label-maker tape with raised letters; the ENS strip copies the name.
- **Controls:** Flip back is label stock at the foot of the right column. Bare cork, Escape and LINE's Back also flip back. Your own back adds Share my board (aqua label) and QR code. The back has no key.
- **Empty values** read in words: "No gratitude yet", "Not started", "None yet".

### Someone else's board

The same board, read only, opened from Explore. Their stickers sit where they stuck them, with foil on the ones someone else drew. Nothing moves, so there are no handles and no rotate knob. There's no tray, since a tray is private; Give takes Draw's slot as the board's one key; an Explore back chip (a 32px Liner Lift pill with a caret) sits beside the name. Tapping a sticker opens its menu: the artist chip on top when someone else drew it, then View and Offer for it (grape label).

### Draw screen

The canvas is just for drawing.

- **Top row:** the timer dot and the tool strip share one row. The timer is a 48px yellow dot at -4° with puffy numerals; tapping it pauses.
- **Paused:** the dot stays whole and bright, and a white label-stock tag reading PAUSED, with Phosphor's pause (fill), sticks across its lower edge at a counter-angle of 8°. It sticks on when the clock holds and peels off when it runs. There's one paused look for every hold: tapped, the page hidden, the color sheet open, the Smoothing panel open, or a finger on the size rail. Only the tap is the person's pause; the other holds release on their own.
- **Paused hint:** while paused the canvas takes no marks. A stroke nudges the dot and sticks a white label under it, turned -2°, reading "Tap the timer to keep drawing", with Phosphor's arrow-bend-left-up (bold, 28px) pointing up at the timer. It peels off by itself. Tools can still switch.
- **Tools:** brush, eraser, fill, a color control (a Phosphor dot inked in the current color on a thin ring) and Smoothing, as flat 38px tiles padded to 44px. The current tool is an Ink tile with the fill-weight icon.
- **Smoothing:** an icon button that opens a compact Liner Lift bar under the tools. Its small title, "Smoothing", shows only while it's open, with Raw and Smooth at the ends.
- **Size rail:** the left edge, with a live number of the brush size in px.
- **Foot:** flat undo and redo at the bottom left, the seal check at the bottom right. The canvas shows no ticket count.

### Out of tickets

Three empty ticket stubs say "used up" without a number. Each used ticket keeps a faint kiss-cut outline of the sticker it became (a 1px graphite line at 62%, dashed on the large stubs), fading in over 700ms: the cut line a sticker leaves on its backing. The small stubs on the seal screen carry the same outlines. Under the stubs, the reserve count: a Grape ticket mark × count. Under the title, a printed refill line reads "New daily tickets at 12:00 AM," in bold Ink followed by the countdown ("in 6h 56m") in Graphite, in tabular figures. It never borrows the timer dot's look: no dot, no color field, no tilt, no Dela numerals. Then the perforation, Go to sticker board as the key and Shop for tickets on label stock. The card doesn't restate the three-a-day rule.

With daily tickets gone but reserve ones left, the start screen asks "Use a reserve ticket?" instead, with a Grape key and the ticket shop on label stock.

### Ticket counts

Every Draw key carries daily and reserve tickets left after its label, on a Liner Lift chip: a small ticket mark in Seal Yellow or Grape with an Ink edge, then ×count in Figure type. A zero count is an empty backing mark in Ink Soft.

### Ticket shop

The out-of-tickets card's stock. The balance sits in a Liner Lift well in yen, worth its SUI at the quote. Packs are label rows: a Grape ticket mark, the name, a Pink sale sticker at the house tilt ("−40%"), and the price stacked right (struck-through full price, yen in bold). The picked pack is stuck on in Grape Soft with a Grape ring. Every amount shows in yen; SUI never shows. The smallest pack is picked to start.

### Stickers

- **Die-cut:** the outline comes from the artist's own strokes, offset into a white border and bounded by the kiss-cut groove, with the sticker cast shadow beneath.
- **Baked resin:** the gloss is baked into the image, with the print darker and more saturated where resin pools at the edge, a refraction band inside the cut edge, a rim light and a meniscus at the foot.
- **Live resin:** on stickers that are showing, a live layer adds a specular along the top edge, a rim light and a sheen that sweeps when the sticker is placed, dragged or tilted.
- **Foil:** a sticker drawn by someone other than the board's owner wears a foil band just outside its white edge: 5px on the board, 6px on the detail's big sticker, 3px on tray sheets. It's the silhouette dilated, so it follows the cut. The six foil bands flow along it and a white glint sits where the one light falls; holes hide it; it's decorative, and the sticker's own label names the artist. The seal ceremony adds nothing: a freshly sealed sticker is yours and plain.
- **Glow:** gratitude shows on a sticker as a soft glow behind it, warmer and brighter with more gratitude.
- **Peel and stick:** a sticker peels with a 3D lift toward the top right and sticks with a short settle from 1.06 scale.

### Artist chip

Who drew a foil sticker: a Liner Lift pill (40px) with the artist's LINE picture in a white edge inside a turning foil ring, then a fine-print ARTIST caption over "@name" (760, 14px). A one-line "By @name" variant is for tight spaces. The copy is "artist" or "By", never "from".

- **First load:** when a board opens, each foil sticker's chip pops in at its top-left corner, top to bottom 80ms apart, holds about 2s and fades (3.2s in all), in one layer above every sticker and the name header. It happens once per opening. Reduced motion shows and hides it without the pop.
- **Tapped:** the chip heads the selected sticker's menu, above its actions, until you deselect.
- **Detail:** under the big sticker, the chip leads the fine print. Your own stickers never get a chip.

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
- **Folder tabs:** All (liner), Mine (pink) and Gifts (grape) stand up from the stack's top edge, 46 × 24px padded to 44px. The current one is full hue and lifted; the others are soft fields. A filter chooses sheets and never moves a sticker: in about 650ms the stack gathers into the mouth, the front sheet and every sheet without a match slide back into the tray, the rest riffle, and the newest match is dealt onto the front. Stickers that don't match fade to 20%. Reduced motion crossfades.
- **Pulling a sheet out:** drag the front sheet's paper toward the board and past about 60px it floats over the board at full size with the floating-sheet shadow and an X at its top left (a 30px Liner Lift disc with Phosphor's x). The tray sags to a crack. Stickers peel or tap off it; board stickers whose hole is on it drop back in. The X, dragging it back, closing the tray or opening the spread sends it home on top of the stack. One sheet out at a time.
- **The spread:** the +N button deals every sheet onto the tray's lining, front first, dates kept at the 11px floor. Tap one to bring it to the front; tap the lining or press Escape to put them back.
- **Peel and snap-back:** press a sticker and its edge lifts; drag and it rides under the thumb while the mouth relaxes to a crack and the sticker's own soft shadow previews where it lands. Drag a board sticker to the right edge and the tray opens to its sheet, its hole breathing in Ink until it drops in.
- **Reduced motion:** the pull toggles and the open tray fades in over 150ms; paging and tab changes cross-fade; the peel lifts without a tilt; no idle tug and no shake.

### Gift bag

A frosted bag with no zipper. Packing drops the sticker into the open bag, peeking out of its mouth. The bag seals only when the send succeeds: the sticker settles in, the mouth presses shut, and the seal goes on. It's built like a konbini wrapper: a clear film band heat-sealed across the mouth, with a Soda Aqua tear tape running through it, printed with the pull direction and "SEALED 9.23". The tape's loose end is the pull tab: a narrow neck leaves the film at the bag's left edge and widens into a rounded lobe that sticks out past the edge, tips up and casts a shadow, with three grip ribs moulded across its free end and PULL printed on it.

- **Opening:** the receiver takes the tab and drags it along the strip. The tape tears out behind it with resistance, lagging the finger and advancing in small ticks, and hangs from the tab in a loop that grows as you pull. Behind it the film splits along its line, rimmed by a thin torn edge, showing the bag's pale inside and the top of the sticker's sleeve. Let go early and it settles back. Past the end it snaps free, the tab flies off, the mouth springs open, the sticker rises, and the receive dialog slides up.
- **Alternatives:** a looping hint shows a small pull; double-tap or press-and-hold tears it by itself; for keyboards and screen readers the tab is a slider. Under reduced motion there's no loop and the snap becomes a fade.
- **The tag** is printed, never typed. It reads "For @name" when the recipient was chosen in the app, and "From Alice" when it went through LINE's picker. An opened bag carries a rubber OPENED date stamp on its tag.

### Sticker trail

A sticker's detail shows where it has been, one quiet row per hand-off, newest first, replacing any separate provenance line.

- **One open row:** the most recent gratitude opens by default: a Liner Lift card with a pink outline, the amount in Figure type at 27px beside a pink heart dot, who it's from, and the screen's only Replay button. While you still owe gratitude for the newest gift, none opens: Send gratitude is the call.
- **Closed rows:** a sentence ("@mika gave it to @ken · 9.18") and a trailing amount with a caret, as one full-width 44px tap target. Tapping one opens it and closes the other. The viewer reads as "you". Names are Ink and bold; "gave it to" and the day are Graphite. The artist is named once, in the by-line, so rows carry no artist tag.
- **The artist's fifth:** when the giver isn't the artist, the open row adds one line under a hairline rule: "2,357 to @ken · 590 to @mika, its artist", or "590 of it came to you, its artist". Copy never uses money words.
- **Calm at length:** past the newest gift, the rest fold into one "N earlier gifts" control, with a caret, directly under it.
- **Order:** when you can give the sticker, Give sits above the gratitude card (the open row); otherwise the actions stay below the trail.
- **The number:** No.0147 sits on a Seal Yellow label at the house tilt, in Dela.
- **On its way:** a Liner Lift note with the gift bag's frosted sleeve replaces Give: "On its way to @bob" when the gift went to an artist in the app, and "On its way" through LINE's picker, which never says who was picked.

### Gratitude

One experience for everyone, on plain Liner, once per hand-off.

- **The combo:** the first tap starts a timer game. A drain bar appears full and runs down; each tap adds less time than the last. The amount counts up in Figure type beside a puffy multiplier sticker (×1 to ×8) driven by tap speed. Nothing sits on or over the heart, and the heart holds its spot.
- **Tiers:** reached by the amount (ありがと, 照れ, ドキドキ, オーバーヒート, 昇天). Each new tier slams its name in outlined 袋文字, and pop-in words from a per-tier bank appear and go. The ground escalates from calm Liner to a blush, focus lines, heat haze and a white-out.
- **Mini hearts:** from ドキドキ up, taps spray small pink hearts that bounce, collide and pile along the bottom before fading. A tap shoves nearby hearts away, harder the closer they are. The heart sweats hearts: a slow drip at ドキドキ, a real sweat at オーバーヒート, heavier at 昇天, all landing in the same pile with 昇天's rain.
- **Discovery:** stroking the heart stretches it along the drag, and after three tries a tip says what to do. After the one motion opt-in, it sways with the wrist, and shaking hard says "Keep shaking!".
- **After 昇天:** condensation fogs the glass in from the edges over 1.2s and clears on its own.
- **After:** the receipt shows the amount, the best multiplier and the combo's length. The giver sees a pink tag on the board's edge; tapping it replays the combo in 3s. The sticker's trail opens the same replay.

### Loading

- **Skeletons:** while a screen loads, it shows its own layout in outline, never a "Loading…" line: blocks of pressed Liner (Liner Deep) with a slow white shine passing over them, real headings and tab labels where they're fixed. Explore outlines Today's stickers, the leaderboard and the feed; the ticket shop its balance and pack rows; the sticker board faint die-cut shapes where stickers usually sit. A screen reader hears one status line ("Loading Explore").
- **Reveal:** loaded content rises 6px into place and fades in over 220ms. A picture (a sticker, a photo sticker) holds back until its image has loaded, then fades in whole, never half-drawn.
- **Tabs:** a tab's screen opens from the paper: a Liner veil over it fades away in 160ms.
- **Reduced motion:** no shine, no rise, no fades.

### Toast

An Ink slip with Liner text (600, 14px) and 6px corners on the lift shadow. It rises 10px in and sinks out.

### Icons

Every icon comes from one registry, copied byte for byte from the published SVGs: Phosphor Icons (MIT, @phosphor-icons/core 2.1.1), plus one Material Symbols glyph. The app's own controls use bold; fill marks an active or primary state, such as the current tool or the current tab; the mocked LINE and iOS screens use regular. The same action always gets the same icon (Give is gift, View is eye, Offer is handshake, Remove is tray-arrow-down). Brand marks (LINE's logo, from Simple Icons, CC0) and illustrations (the heart, stickers, avatars, pins, tape, stamps, zipper parts) are not icons.

- **My board:** the tab shows the person's own LINE picture as a photo sticker. The rich menu's My board tile uses Phosphor's smiley-sticker (fill), since the rich menu is one image for everyone and can't show each person's picture.
- **Explore:** Phosphor's eyes, on the tab (bold, fill when current) and the rich menu tile (fill).
- **Sticker board:** one composed entry, Phosphor's square with Phosphor's sticker set at 64%, turned -12° and masked, in bold and fill only. It marks the board itself (Go to sticker board) and stands in on the My board tab when a person has no LINE picture.

**The Never Hand-Drawn Rule.** Icons are never drawn by hand and published paths are never edited. If Phosphor doesn't have it, choose a different Phosphor icon or compose published paths by transform.

**The Draw Exception.** Every Draw action (the board's Draw key, Keep drawing, and the rich menu's Draw tile) uses Material Symbols' `draw` (Apache-2.0, weight 700, filled). It's the one icon from outside Phosphor, because its pencil mid-squiggle says "draw", where every Phosphor pencil says "edit". The brush tool keeps Phosphor's paint-brush; it's a drawing tool, not the Draw action.

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
- **Do** use icons from the registry only: Phosphor bold at rest, fill for an active state, regular inside the LINE and iOS mocks, and Material Symbols' `draw` for Draw actions.
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
- **Don't** describe gratitude with money words (royalty, earn, reward, cut, share, %). It flows "to" people.
- **Don't** hand-draw an icon or edit a published path. Brand marks and illustrations are the only exceptions.
- **Don't** use Canvas white as a page ground. It's for drawing surfaces and white label stock.
- **Don't** use NFT, crypto, token, wallet, mint or similar words in visible copy. The one exception is "Sealed on-chain" with the sticker's ENS name.
