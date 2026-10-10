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

The app is a シール帳, a sticker trade book. The ground is release-liner backing paper, controls are printed label stock, and each screen's primary act is a cartoon keycap: a flat coded face with an Ink outline on a thick lip. A sealed drawing becomes a die-cut sticker with a white border and a kiss-cut groove. It peels off the page and sticks to a free-form sticker board. The collection lives as loose sheets in a zipped canvas tray, and the board's back is a corkboard with the figures pinned on as paper. Everything that moves obeys that physical world: keys press and pop, stickers peel and stick, zippers run, tear tape rips.

Calm screens are almost all Liner and Ink, with color in flat coded fields that each mean one thing. The world only goes wild when you push it: Gratitude escalates for whoever keeps mashing the heart.

The world refuses two category defaults: Procreate-grey tool chrome with a pixiv-style feed, and the sticker boom's gacha, rarity and "rate" market. Foil marks who drew a sticker, never how rare it is.

**Key Characteristics:**

- Backing-paper ground (Liner), Ink text, and flat coded fields that always carry Ink text.
- Light only, even where a browser would force pages dark.
- One cartoon keycap per screen for its primary act; everything else is thinner label stock, quiet links or flat tools.
- One tactile press for every key and label.
- No gloss on any control. Stickers keep their gloss laminate and live light; buttons never do.
- Stickers are die-cut from the artist's own strokes.
- A sticker drawn by someone other than the board's owner wears a moving foil band and names its artist.
- Motion is physical, on transform and opacity only.
- Mocked LINE and iOS screens copy those platforms exactly and never borrow the world's materials.

## Colors

Liner and Ink, plus candy-bright coded fields, each with one meaning and always carrying Ink text. Each coded hue has one deep partner, used only as the lip under a key or label.

### Primary

- **Seal Yellow** (seal-yellow): "now". The default key, daily tickets, NEW dots and the timer dot. The most common field in the app.

### Secondary

- **Soda Aqua** (soda-aqua): giving.
- **Bonbon Pink** (bonbon-pink): Gratitude, and you. Gratitude's one mark is Phosphor's filled heart in Bonbon Pink.

### Tertiary

- **Grape** (grape): received.
- **Blue** (blue): the Shop and reserve tickets, opposite daily tickets' yellow.
- **Tangerine** (tangerine): the streak.
- **Tomato** (tomato): can't undo: stopped states and warnings. Never a key.
- **Foil** (foil-pink, foil-peach, foil-lemon, foil-aqua, foil-sky, foil-lilac): six iridescent bands that flow along a foil band and ring the artist chip's picture. A material, not a fill, worn as the Other Hand Rule says. No green.

### Lips and materials

- **Deep partners** (seal-deep, aqua-deep, pink-deep, grape-deep, tomato-deep, blue-deep, tangerine-deep): only the front wall under a coded key or label, never a field or text. **Label Lip** (label-lip) is the paper edge under plain label stock.
- **The tray** (tray-canvas, tray-tape, tray-lining, tray-mat): the sticker tray's pink canvas, zipper tape, lining and mat. The tape stays lighter than Bonbon Pink, so the pull is the one strong pink.
- **Cork** (cork): the stat board's ground. Paper, pins, tape and stamps sit on it; nothing is printed on it.
- **Non-repro Blue** (non-repro-blue): manga manuscript paper's non-printing blue, only on the corner print of a sheet in Kyoto Seika Practice Mode.

### Neutral

- **Liner** (liner): the backing-paper ground of every in-world screen and sheet.
- **Liner Deep** (liner-deep): sunk (disabled) keys and labels, pressed inactive tabs, and skeletons.
- **Liner Lift** (liner-lift): label-stock faces and paper lifted off the liner.
- **Ink** (ink): all text on every field, outlines, the toast and label-maker tape.
- **Graphite** (graphite): secondary text, fine print, placeholders and quiet links. On Liner Deep, or anything as dark, fine text takes the darker `--graphite-on-deep` (5.0:1).
- **Canvas** (canvas): drawing surfaces, a sticker's white border, and white label stock.

Hairlines are Ink alpha: 14% for a rule, 26% for a strong one. Soft text is Ink at 62%. A veil is Ink at 46% behind a card or dialog, and at 36% where what's behind stays in view, such as a board under a sheet or the pile under a lifted sticker. Soft fields mix a coded hue into Liner at 30–42%, keeping its meaning at rest volume.

### Named Rules

**The Ink-On-Color Rule.** Every coded field carries Ink text, never white.

**The One Meaning Rule.** Yellow is now, aqua is giving, pink is Gratitude and you, grape is received, blue is the Shop and reserve tickets, tangerine is the streak, tomato is can't-undo. Never pick a hue for looks.

**The Other Hand Rule.** Holo foil marks a sticker drawn by someone other than the board's owner, only on sticker boards and sheets, and never as a rarity grade. Pink foil (NSFW) and the Kyoto Seika Practice Mode foil mark how a sticker was made, so they show whoever drew it, your own included; pink wins.

**The Platform Green Rule.** The world has no green. LINE's green appears only inside mocked LINE UI.

## Typography

**Display Font:** Dela Gothic One (with Croquis Sans fallback)
**Body Font:** Croquis Sans, the app's own build of Mona Sans, a variable font with a width axis (then Zen Kaku Gothic New, system-ui)
**Japanese:** Zen Kaku Gothic New (with Hiragino Sans fallback). Headlines set with `palt`, and short centered lines break only between phrases.
**Platform chrome:** the native system stack, only inside mocked LINE and iOS UI.
**Yen:** the half-width ¥, never the full-width ￥, which falls back to another typeface.

**Character:** Croquis Sans is the label stock, precise and slightly technical, changing width with the job. Dela Gothic One is the puffy voice, on the key and the moments Gratitude shouts.

### Hierarchy

- **Display** (400, 20px; 23px large key, 17px compact; line-height 1): key labels, dot badges, the Gratitude multiplier and tag, outlined 袋文字 tier captions, and the deal's 書き文字.
- **Figure** (900, line-height 0.95, width 125): Gratitude amounts, stat board counts and the hit counter.
- **Headline** (800, 26px, line-height 1.08, width 112): screen and dialog titles.
- **Title** (800, 18–22px, line-height 1.1, width 112): sheet titles and section headings.
- **Body** (400–500, 15px, line-height 1.42–1.5, width 100): running text; supporting notes 13px. Text fields set 16px so iOS doesn't zoom.
- **Label** (700, 15px, 13px small, width 100): buttons, tabs and chips, in sentence case.
- **Fine** (650, 11px, uppercase, +0.07em, width 87.5): metadata, captions and hints. Handles and drawing times keep their own case.
- **JP caption** (700, 11px, +0.14em): the なまえ cap.

### Named Rules

**The 11px Floor Rule.** Nothing on a 390px phone renders under 11px.

**The Width Axis Rule.** Width carries the role: UI 100, titles 112, fine print 87.5, figures 125, from the shared tokens. 75 only where the space is too tight, as on the gift bag's tape and tag.

**The Puffy Voice Rule.** Dela Gothic One appears only on keys, dot badges, the Gratitude multiplier and tag, 袋文字 captions and the deal's lettering; never on headings, body text or plain figures.

**The Plain Zero Rule.** Every zero is plain: Croquis Sans drops Mona Sans's slash. Figures are proportional, except numbers that change while you watch, which set `tabular-nums`.

**The Hits Rule.** A combo's length is counted in hits, never taps, and never wears ×, which belongs to the multiplier.

## Layout

Croquis lays out by the window, never the device (`ui/largeScreen.ts`). A touch screen at least 600 × 600 is a large screen: the same world composed for the room, with controls at their phone sizes and the room given to the board, the pile and the drawing sheet. Anything smaller, and a computer's phone frame, keeps the phone layout, designed on a 390 × 844 viewport and upright only.

Spacing steps in 4px units, with a 12px gutter. Controls anchor to the thumb zone: the key sits low, with any secondary label or quiet link directly beneath it.

The sticker board is free-form, not a grid, and Explore's pile is a heap of die-cut stickers, never a grid or a feed. No surface shows grid paper: the liner stock and its faint "SEAL · シール" maker print hint at paper.

## Elevation & Depth

Depth is physical, from one light at the top left. Every cast shadow falls down and to the right in neutral Ink alpha, in two parts: a tight contact and a soft throw. Controls get depth from thickness, not shading: a key sits on a 6px lip, a label on 3px of paper, and the base casts the shadow. Stickers get their edge from the kiss-cut groove round their silhouette; on a foil sticker the band is the edge.

Stickers, foils and the Gratitude heart also follow the app's one moving light. It tracks the phone's tilt, or a mouse or pen but never a finger, and idle-sways so stills look alive. Controls don't follow it.

### Shadow Vocabulary

- **Key base** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 2px 6px 12px -3px rgba(28,24,36,.24)`): under every key.
- **Label base** (`box-shadow: 0 1px 0 rgba(28,24,36,.06), 1px 3px 5px -2px rgba(28,24,36,.16)`): under label stock.
- **Label** (`box-shadow: 0 1px 0 rgba(28,24,36,.10), 1px 2px 3px rgba(28,24,36,.08)`): a flat label resting on the liner.
- **Lift** (`box-shadow: 1px 3px 4px rgba(28,24,36,.12), 3px 10px 22px rgba(28,24,36,.14)`): something held above the page, such as a toast or a popover.
- **Sheet** (`box-shadow: 0 -1px 0 rgba(28,24,36,.06), 2px -8px 28px rgba(28,24,36,.12)`): a bottom sheet.
- **Kiss-cut** (`filter: drop-shadow(0 0 .5px rgba(28,24,36,.55))`): the groove round every sticker.
- **Sticker cast** (`filter: drop-shadow(.5px 1px 1px rgba(28,24,36,.16)) drop-shadow(1px 3px 4px rgba(28,24,36,.08))`): a sticker off a board, with the kiss-cut.
- **Board cast** (`filter: drop-shadow(.25px .5px .75px rgba(28,24,36,.18)) drop-shadow(.5px 1.25px 2px rgba(28,24,36,.06))`): a sticker stuck to a board, with the kiss-cut.
- **Peeling** (`filter: drop-shadow(3px 7px 5px rgba(28,24,36,.18)) drop-shadow(8px 16px 18px rgba(28,24,36,.12))`): a sticker lifting off.
- **Floating sheet** (`box-shadow: 0 0 0 .5px rgba(28,24,36,.18), 3px 7px 8px rgba(28,24,36,.16), 8px 18px 30px rgba(28,24,36,.18)`): a sticker sheet pulled out of the tray.
- **Pinned note** (`filter: drop-shadow(0 1px 0 rgba(28,24,36,.12)) drop-shadow(2px 5px 5px rgba(58,36,16,.26))`): paper on the stat board.

### Named Rules

**The One Light Rule.** One light for the whole app. Static shadows fall from the top left, and every moving highlight (a sticker's specular and sheen, the foils' glint, a crease's shading, the heart's gloss) reads the shared light. No second light; the Shop's small previews are the one exception, lit by their own loop.

**The Neutral Shadow Rule.** Shadows are Ink alpha, never tinted, except on the stat board, where paper casts a cork-brown throw over an Ink contact line.

**The No Gloss Rule.** Controls have no gloss, highlight line or sheen: keys, labels, tabs, the zipper and tear tape are lit flat, with an edge and a contact shadow at most.

## Shapes

Corners come from paper and cut stock, each a step of the `rounded` scale: keys 16px (18px large, 14px compact) and the round 58px seal check; label stock 8px; fields, toasts, index tabs and the drawing screen's small parts 6px; bottom sheets 16px on their top corners; paper 4px. Dot badges are pills stuck at -4°, as if one hand stuck them all.

Stickers have no radius: their outline is the artist's own stroke silhouette, offset by a white border and bounded by a kiss-cut groove. A sticker out on the board leaves a kiss-cut hole in its sheet; a given one leaves a faint dashed outline. Sticker sheets begin with a perforation row. Only the tray has a zipper; the gift bag tears open along its tape. Paper on the stat board has torn or cut edges of its own kind.

## Components

### The key (signature)

A cartoon keycap: the screen's one primary act.

- **Construction:** a flat coded face with a 2.5px Ink outline over a 6px lip in the hue's deep partner. Faces are 60px tall (68px large, 48px compact), with a 20px Phosphor icon before the label.
- **Variants:** the round 58px seal check, and the compact Draw key on your own board, where someone else's board has Give.
- **States:** hover shades the face 6% toward Ink; focus draws a 2px Ink ring at a 3px offset; disabled sinks flush on Liner Deep, with no lip or ink; busy keeps its look and takes no second press.
- **Rule:** one per screen, and never for a can't-undo act.

### Label stock

Everything that isn't the key: the same construction at a third of the depth, with no Ink outline.

- **Shape:** a Liner Lift face with a 1px 30% Ink edge and 8px corners, 44px of face over a 3px lip (32px small).
- **Coded:** coded faces take their deep partner as the lip; the ink variant carries Liner text.
- **Quiet link:** Graphite text with a 1px underline, no stock and no travel: the way out under a key.
- **Not buttons:** drawing tools, header icons, close and back stay flat tiles; chips and segments select; gestures keep their own physics.

### The press

One press for every key and label: the face drops as the lip compresses (4.5px on a key, 2px on a label), springs back if you slide off, and on release pops past rest, with the action firing 60ms into the pop. Only translate animates. Reduced motion halves the travel and drops the spring.

### Controls

- **Switch:** the one on/off control: a 46 × 28px pill, off a Canvas track with a Graphite thumb, on filled Ink. Its whole row flips it.
- **Text field:** a Canvas face with a 1px rule and 6px corners, 48px tall, with 16px text.
- **Bottom sheet:** a modal dialog that keeps focus inside; on a large screen, a centered card closed by an X.
- **Touch targets:** keys are at least 54px tall, and every other control reaches a 44px hit area.
- **Dot badges:** round flat stickers at -4°: a 26px pill in a coded hue with Ink puffy lettering or a filled Ink icon.
- **Toast:** an Ink slip with Liner text, on the lift shadow.

### Index tabs

Three tabs cut from label stock: My board (pink), Explore (aqua) and Shop (blue), equal thirds of the strip. An inactive tab is an outline with Graphite text; the current one is stuck on in its full hue and lifted 2px. Current shows by fill and lift only, never weight or case. The drawing screen has no tabs.

### The deal (Kyoto Seika Practice Mode)

An extension of the drawing screen, drawn with manga's own devices instead of UI chrome: G-pen ink on white with no shadow, a picked thought cloud filled solid (ベタ) with its word in white (白抜き), 書き文字 in Dela Gothic One, and Non-repro Blue for what stays off the sticker. Begin is the screen's one key.

### Tickets

**The Ticket Rule.** Every picture of tickets shows what your next drawing can use, from one helper (`ticketView`): the day's daily tickets while any are left, with reserve tickets as one ticket and a count; then the reserve ticket alone; with neither, the used day. A zero never shows.

- **Daily:** matte Seal Yellow stock printed with the Draw mark.
- **Reserve:** glossy Blue stock with a full Ink outline and a white four-point star that pops in once and never loops. Tickets aren't controls, so the No Gloss Rule leaves them be.
- **Used:** Liner Lift backing that keeps the kiss-cut outline of the sticker it became.

### Stickers

- **Die-cut:** cut from the artist's own strokes: a white border bounded by the kiss-cut groove. Parts the border doesn't join hang together by narrow bridges of border.
- **Gloss laminate:** flat, as on a vinyl sticker, with one slim highlight that follows the light.
- **Crease:** on a sticker board, a sticker lying over others shows their edges beneath it, lit on the side facing the light, as a real one does pressed down over them.
- **Foil:** a sticker drawn by someone other than the board's owner wears a holo band just outside its white edge, an even width round the cut, under a still diffraction grating with a glint where the light falls. The band is the sticker's edge.
- **Pink foil:** the same band in pinks, on an NSFW sticker. The 18+ mark is Ink on a strip of pink foil, never a Bonbon Pink field.
- **Kyoto Seika Practice Mode foil:** a narrower band of printed manga screentone (網点), heavier away from the light, with highlights the moving light scrapes through it.
- **Peel and stick:** a sticker peels with a 3D lift toward the top right and sticks with a short settle.

### Artist chip

Names who drew a foil sticker: a Liner Lift pill with the artist's LINE picture in a white edge inside a turning foil ring, and an ARTIST caption over "@name". Without a picture, their first letter stands in. The copy says "artist" or "By", never "from". Off a board, where there's no foil, the ring goes.

### Hit counter

A combo's length the way fighting games show it, "64 HITS": Figure numerals leaning 11°, with pink speed lines trailing off the left that never touch the digits. Nothing like the multiplier: no ×, tag or puffy face.

### Gift bag

A frosted bag closed like a konbini wrapper: a clear film band with a Soda Aqua tear tape, whose tab sticks out past the edge with PULL printed on it. Its tag is printed, and an opened bag carries a rubber OPENED stamp.

### Loading

A loading screen shows its own layout in outline: Liner Deep blocks with a slow shine, never a "Loading…" line. Loaded content rises 6px and fades in; a picture holds back until it has loaded, then fades in whole.

### Error line

Every failure is one sentence in the app's language saying what failed and what to do, Ink on Tomato Soft, announced as an alert. Try again shows only where asking again can work. The words behind the failure sit under it in fine print, with Copy.

### Icons

Every icon is Phosphor, through one registry (`apps/frontend/src/icons`): bold at rest, fill for an active or primary state, regular inside the LINE and iOS mocks. The same action always gets the same icon: Draw pencil-simple-line, My board house, Explore map-trifold, Shop tote-simple, Gratitude heart (fill), streak fire (fill), Give gift, View eye, Remove sticker.

**The Never Hand-Drawn Rule.** Icons are never drawn by hand and published paths are never edited, and a text glyph (♡, ★) never stands in for one. Brand marks, Sui's and LINE's, are their owners' files, never redrawn or recolored.

### LINE surfaces

- **Chat menu:** the Official account's chat menu is drawn as the board's foot, from the app's own tokens, key and label stock.
- **Mocked platform screens:** the LINE chat, the Gift Message, consent and share screens and iOS banners use the platform's own type, greys and green, and never the world's materials.

## Do's and Don'ts

### Do:

- **Do** put Ink text on every coded field.
- **Do** use exactly one key per screen, with the secondary action as label stock or a quiet link beneath it.
- **Do** let the shared press drive every key and label.
- **Do** animate only transform and opacity, on the house curves: spring, ease-out and peel.
- **Do** keep every in-phone text size at 11px or above, with widths from the shared tokens.
- **Do** cast shadows down and to the right from the top-left light, in neutral Ink alpha.
- **Do** give every touch target a 44px hit area.
- **Do** honor reduced motion: durations collapse, presses halve and lose their spring, and moving materials hold still.

### Don't:

- **Don't** put white text on a coded field, or green anywhere outside mocked LINE UI.
- **Don't** put gloss, a highlight line or a sheen on any control.
- **Don't** restyle a key's or label's face or base, or add your own pressed transform.
- **Don't** put holo foil on the board owner's own stickers or off a board, or use any foil as a rarity grade.
- **Don't** set headings or body text in Dela Gothic One.
- **Don't** put a second key on a screen, or give the key to a can't-undo act.
- **Don't** stretch a key, card or sheet across a large screen.
- **Don't** put stats in a sheet or a big-number card; they live on the stat board as paper.
- **Don't** show grid paper, or use Canvas white as a page ground.
- **Don't** describe Gratitude with money words. "Residual" is the one exception.
- **Don't** put NFT, crypto, token, wallet, mint or similar words in visible copy. "On-chain", in the line saying a seal isn't confirmed there yet, is the one exception.
- **Don't** hand-draw an icon or edit a published path.
