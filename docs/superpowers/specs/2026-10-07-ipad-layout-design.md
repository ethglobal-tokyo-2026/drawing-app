# iPad layout and Apple Pencil: design

**Status:** proposal for ad0ll's review, 2026-10-07. Nothing is built. Each numbered decision carries a recommendation for a yes, a no or a pick.

**Made with:** impeccable `shape` (this is its brief) and superpowers brainstorming. The plans that build it are listed in [Plans](#plans).

## 1. Brief

- **Who:** Japan-first artists with an iPad, some with an Apple Pencil (PRODUCT.md). Every surface is Operate mode: drawing, arranging, giving.
- **Job:** on an iPad, draw a sticker with the Pencil in one sitting, seal it, give it, receive gifts and look at boards, as easily as on a phone.
- **Success:**
  - A sticker drawn on an iPad looks like one drawn on a phone: same proportions, die-cut and stroke weight relative to the sticker.
  - Rotating the iPad or resizing its window never moves, hides or drops a stroke.
  - A sticker board arranged on any device reads the same on every other.
  - Phones keep today's layouts; their only changes are bug fixes.
- **Boundaries:** iPad only, no Android tablets. The phone stays the target. The sticker trade book world stays as DESIGN.md has it: no new materials, colors or type. DESIGN.md gains a size-class section after the build.
- **Anti-goals:** a magnified phone; sheets and keys stretched edge to edge; tools far from the Pencil hand; a navigation sidebar; anything that needs a Pencil feature the web doesn't get.

## 2. What's true today

Research from 2026-10-07: LINE's and Apple's docs, WebKit's source, and captures of the app in Playwright WebKit and Chromium with iPad emulation at 744×1133 to 1376×1032 and at 540×620.

### Where an iPad runs Croquis

- **Inside LINE for iPad, Croquis gets LINE's centered form sheet, about 540×620 pt.** It keeps that portrait shape in landscape, whatever the LIFF size setting. Source: LINE's notice for LINE 11.3.0 (2021-03-01), https://developers.line.biz/en/news/2021/. No later notice changes it. iPadOS 16 raised the default form sheet to 580×640 pt; whether LINE follows is unverified. So in LINE an iPad gets a phone-width screen that is shorter than an iPhone SE's.
- **LINE MINI Apps assume the phone UI on tablets** (LINE for Business FAQ, https://help.linebiz.com/lineadshelp/s/article/L000002137?language=ja), so a channel change wouldn't help.
- **A full-screen iPad layout only shows in a browser** (Safari), after LINE Login, at any window width; iPadOS 26 windows resize freely. With LINE installed, a liff.line.me link tapped in Safari opens LINE's sheet; the app's own URL stays in Safari.
- **In Safari on an iPad:** the user agent says Macintosh and `liff.getOS()` says "web". Login may land on LINE's email or QR screen. The friend picker needs a LINE single sign-on session and opens as a popup or tab. ID tokens last 1 h. https://developers.line.biz/en/reference/liff/
- **Most iPads are LINE sub devices, which never show chat menus:** https://help2.line.me/line/smartphone/sp?contentId=200001441&lang=en. iPad users mostly arrive through Gift Messages and links.

### Apple Pencil on the web (Safari and LINE's WKWebView)

- **What arrives:** Pointer Events with pointerType "pen", pressure 0–1 and tilt. Altitude, azimuth, `getCoalescedEvents` and `getPredictedEvents` since Safari 18.2 (https://webkit.org/blog/16301/webkit-features-in-safari-18-2/). `getCoalescedEvents` exists only in secure contexts.
- **Hover:** since Safari 16.1, as pen pointermove events with buttons 0 and no height (https://webkit.org/blog/13399/webkit-features-in-safari-16-1/). On iPadOS the `hover` media feature is always none and `pointer` always coarse, even with a trackpad (WebKit source). So the desktop phone frame in App.css never applies on an iPad.
- **Not available:** squeeze, double tap, haptics, barrel roll, 120 Hz animation frames by default (Safari renders pages near 60 fps, and Low Power Mode halves that), and suppressing corner or edge swipes.
- **Pen and finger exclude each other in WebKit:** touches don't reach the page during a Pencil stroke, and a resting palm may block the Pencil until it lifts (developer report: https://developer.apple.com/forums/thread/773213; device test pending).
- **Apple Pencil (USB-C) has no pressure sensor.**

### What the app does on an iPad today

1. **The drawing sheet is the viewport,** and strokes are stored in its CSS px from its top-left. Rotating or resizing hides the strokes outside the new sheet, and sealing cuts only what shows: a sticker sealed after a rotation lost a stroke (verified). On an iPad, strokes come out 0.57–0.73× as thick relative to the sticker as on a phone, and 1.5 px lines fade.
2. **Board stickers are sized by the board's width and placed by fractions of each axis.** They grow 2–3.5× on iPads; in landscape and in LINE's sheet they run off the board and over each other and over Draw.
3. **Explore's pile scales its 360-unit layout to the full width.** Stickers and name tags reach 3.5×, and a landscape screen shows 3–5 stickers.
4. **Every bottom sheet and card spans the full width,** with keys 680–1312 px wide.
5. **Phone-sized pieces float in empty space:**
   - The drawing tools stay in the four corners; undo and the seal check are about 1300 px apart in landscape.
   - The size rail is a 222 px stub.
   - The tray stays 205 px wide, with one 156×364 sheet in a full-height mouth.
   - The sticker detail and the receive dialog leave most of the screen empty.
6. **Broken at iPad sizes:**
   - the Gratitude replay (a fixed 300 px stage, scaled by width alone);
   - the sealed card after a rotation;
   - Explore's scroll position after a rotation;
   - the tilt light and the heart's sway in landscape (their axes assume a phone held upright);
   - the out-of-tickets card, which shifts the board and leaves a strip undimmed.
7. **Pencil gaps:**
   - A resting palm swallows two-finger undo.
   - Once a Pencil draws, fingers silently stop drawing until reload.
   - A palm before the first Pencil stroke paints.
   - No prediction ahead of the nib.
   - Strokes start heavy.
   - A pen whose pressure never changes draws one width.
8. **At LINE's sheet size (540×620):**
   - the color sheet leaves about 170 px of canvas;
   - the Mini-game's words clip;
   - Explore shows only the top of a heap;
   - the checkout hides the Shop's title;
   - board stickers crowd Draw.

## 3. Approaches

|       | Approach                                                                                                                                                                | For                                                                                | Against                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A     | Phone column: the phone layout, phone-sized, centered                                                                                                                   | Little work                                                                        | The canvas stays phone-sized; nothing for the Pencil        |
| **B** | **One app, two size classes, plus a short-height pass.** Real compositions where the screen matters (drawing screen, board and tray, Explore); centered cards elsewhere | Uses the iPad where it counts; phones untouched; one implementation of each screen | The most work; changes the sheet's and the board's geometry |
| C     | A separate iPad shell                                                                                                                                                   | Free hand per screen                                                               | Two implementations of every screen                         |

**Recommend B.**

## 4. Decisions

### Where and when

**1. Two places, one design.**

- Inside LINE on an iPad: the compact (phone) layout, made to hold at LINE's short sheet.
- In a browser on an iPad: the regular layout.
- The app decides by the size of its own frame, never by `getOS()` or the user agent.

**Recommend.**

**2. A way out of LINE's sheet.** Inside LINE on an iPad, a quiet label on your sticker board, "Full screen in Safari", opens the app in Safari (`liff.openWindow` with `external: true`).

- **Detection:** `min(screen.width, screen.height) ≥ 700`. The screen is the device's even inside the sheet (unverified; a device test).
- **Cost:** Safari asks for LINE Login: one tap with a LINE single sign-on session, otherwise LINE's email or QR screen.
- **Options:** (a) the label; (b) nothing; (c) a one-time hint instead.

**Recommend (a), once the device test confirms the sheet.**

**3. Size classes.** One module measures the app's frame and marks it:

- **Width:** `regular` at ≥ 700 px wide and ≥ 600 px tall, otherwise `compact`.
- **Height:** `short` below 700 px tall, otherwise `tall`.
- **Where they're read:** CSS selects on the marks, and JS layouts read a hook.
- **Values:** starting values, to tune from screenshots.
- **Desktop:** the desktop phone frame stays, and inside it the app is always compact. A dev-only `?layout=regular` previews the regular layout on a desktop.
- **Covered cases:** LINE's sheet (~540 wide) and half-screen iPad windows are compact. iPads in full-screen Safari are regular. A landscape iPhone is compact and short.
- **Alternative:** container queries on the frame, which repeat the numbers in every CSS file.

**Recommend.**

### The drawing screen

**4. One sheet for every device.** The sheet keeps one size, in sheet units, for the life of a drawing.

- **Size:** its short side is 374 units, the sheet on today's 390 px phone. Its long side follows the screen's shape when the drawing starts, clamped to between 1 and 2.2 times the short side.
- **On screen:** it's displayed scaled to fit. Rotating or resizing only rescales it.
- **Units:** strokes, brush sizes, Smoothing, the fill's reach, the speed-to-width model and the die-cut border are all in sheet units.
- **Ink canvas:** its resolution is fixed per drawing, matched to the screen when the drawing starts and capped near 4 MP. Today's 13-inch ink canvas measured 5.3 MP.
- **What that buys:** a sticker looks the same from any device, a window drag costs nothing, and a rotation loses nothing.
- **On phones:** a 390 px phone is unchanged (scale 1). Larger phones show the brush up to 10% bigger, because the brush is relative to the sheet now.
- **Drawings already kept on a phone** open as drawn on that phone's sheet.
- **Alternative:** lock the sheet's size at the first stroke and let an iPad hold finer detail. iPad stickers would then look thinner than phone ones, and iPad memory and fill time stay high.

**Recommend.**

**5. The regular drawing screen** (right hand shown; decision 6 mirrors it):

```
┌──────────────────────────────────────────────────────────┐
│ (2:59)                                  [brush … ∿  ✱]  │  timer and tool strip, as today
│                                                          │
│  ┃size┃    ┌──────────────────────────────────┐          │
│  ┃rail┃    │                                  │          │
│  ┃    ┃    │   the sheet, centered and        │          │
│  ┃    ┃    │   scaled to fit                  │          │
│  [↶][↷]    │                                  │          │
│            │                                  │          │
│  (✓)       └──────────────────────────────────┘          │
│                        [^ Board]                         │
└──────────────────────────────────────────────────────────┘
```

- **The edge opposite the drawing hand** carries:
  - the size rail, taller and centered at mid-height, where a holding thumb rests;
  - undo and redo under it;
  - the seal check at its foot, clear of the screen's corner, where the Pencil's corner swipe starts.
- **So the drawing hand's palm never rests on a control.** Arming the seal check with a palm would be one accidental tap from sealing.
- **The tool strip stays top right,** where the Pencil taps it.
- **The color sheet becomes a popover from the color tile,** so it no longer covers the drawing. Smoothing stays a bar under the tools.
- **Compact keeps today's layout,** with a short-height pass so the size rail and the color sheet fit LINE's sheet.
- **Alternatives:**
  - the phone's four corners, scaled up (1300 px apart in landscape);
  - a floating tool palette (more to build, and it lies over the sheet);
  - the seal check at the bottom right as on phones (in a right-hander's palm).

**Recommend the opposite edge.**

**6. Drawing hand.** A "Drawing hand: Right / Left" setting on your Settings card mirrors the drawing screen on phones and iPads. It's kept per device, and Right is the default.

**Recommend.**

### Apple Pencil

**7. Pencil only, visible.** Today one Pencil stroke silently stops fingers drawing until a reload. Instead:

- The first Pencil stroke on a device turns on Pencil only, shown as a tile in the tool strip.
- Tapping the tile turns it off or on again, and that choice is kept per device. A later Pencil stroke doesn't override it.
- Two- and three-finger taps work either way.

**Recommend.**

**8. Hover preview.** On iPads with Pencil hover, a ring at the nib shows the brush's size and color. It never draws.

**Recommend.**

**9. Prediction.** Each frame paints the browser's predicted points ahead of the nib and wipes them the next; they're never stored.

**Recommend.**

Fixes that need no decision:

- **Resting palm and undo:** touches already down when a tap begins, and palm-sized contacts, don't count toward it.
- **Palm before the first Pencil stroke:** it leaves no mark. Thresholds tuned on a device.
- **Heavy starts:** a stroke's width starts from its first sample.
- **Flat pressure:** a pen whose pressure never changes follows the finger's speed model.

### The sticker board

**10. One board for every device.** Today's phone board becomes the reference panel: 390 wide, with its 334×674 field under the 86 px header.

- **Placements:** stickers keep their stored fractions and sizes, relative to the panel.
- **Fitting:** the panel is scaled uniformly to fit and centered. Computed from measured board sizes: 1.43× on an 11-inch iPad in portrait, 0.97× in landscape, 0.71× in LINE's sheet.
- **What it buys:** every device shows the same composition, and existing placements stay valid.
- **What stays full size:** the header, Draw, the selection frame and the toolbar keep their own sizes, on the panel's edges.
- **iPhone SE:** the panel is about 300 px wide.
- **Alternatives:**
  - today's per-axis fractions, which overflow in landscape and in LINE's sheet;
  - a bigger board that pans and zooms, whose gestures clash with dragging and pinching stickers.

**Recommend.**

**11. The tray beside the board.** The panel is height-bound on every iPad and in LINE's sheet, which leaves 200–800 px spare beside it.

- **Where it opens:** wherever the sticker tray fits in that space, the zipper stays on the panel's right edge and the tray opens beside the panel, like the facing page of the trade book, instead of over the stickers.
- **Room:** the open sheet stack may grow up to 1.5×, and the spread gets more columns.
- **On phones:** there's no spare room, so they keep today's tray over the board.

**Recommend.**

**12. The cork back is the back of the same panel.** It keeps today's layout, scaled with the panel, and the turn's perspective follows the panel's width.

**Recommend.**

### Explore

**13. The pile keeps its size.**

- **The pile:** its scale is capped at 1.5×, and the 360-unit pile stays centered.
- **Other controls:** search, the view switch and the rows cap at about 560 px.
- **This week:** it sits beside the pile as a second column where the width allows.
- **The lifted sticker:** a centered card, at least as big as its pile copy.
- **Rotating** keeps your place.
- **Later option:** days side by side, each its own 360-unit heap.

**Recommend.**

### Everything else

**14. Cards, not stretched sheets.**

- **Cards:** in regular width, bottom sheets and ticket cards become centered cards at one content width (520 px to start, tuned by screenshots), and keys keep their natural width.
- **Columns:** the sticker detail, Giving, Receiving and the Shop sit in a centered column.
- **Sticker detail:** the sticker grows.

**Recommend.**

**15. The Gratitude Mini-game stays full screen.**

- **Scaling:** its lettering, words and hearts scale with the stage's size, not only its width.
- **Width caps:** the HUD and the receipt cap their width.
- **Shake** stays one of three ways to play.
- **The Gratitude replay** scales by width and height, re-lays on resize, and keeps recorded taps on its stage.

**Recommend.**

**16. Device-neutral words.** Seven strings name the phone or iPhone; the motion card says "iPhone asks once more" on an iPad. They become device-neutral in both languages.

**Recommend.**

**17. The tabs stay at the foot,** centered at their 176 px cap.

**Recommend.**

**Not doing:**

- canvas zoom and pan;
- tilt shading;
- Pencil squeeze, double tap and barrel roll (the web doesn't get them);
- a navigation sidebar;
- Android tablets;
- a committed browser test suite (each phase runs scripted checks, as the project does now).

### Separate, today

**18. LIFF 2.31.1.** On 2026-09-30 LINE deprecated LIFF 2.20.0–2.31.0 for a security issue and said to update immediately (https://developers.line.biz/en/docs/liff/release-notes/). The app is on 2.31.0. It's a one-line upgrade, independent of the iPad work.

**Recommend doing it today.**

## 5. What only a real iPad can settle

**Before the device session, two additions:**

- The developer slip gains a Device paper: viewport, screen, density, user agent, safe areas and media query results.
- The performance recorder gains a Pencil summary: pointer types, pressure range, coalesced and predicted counts, contact sizes.

Then, on an iPad, in LINE and in Safari:

1. LINE's sheet: its size, header, rotation and windowed sizes, on a main and on a sub device.
2. The friend picker, from LINE for iPad and from Safari.
3. Login in Safari: automatic through LINE for iPad, or LINE's email or QR screen?
4. Pressure from a Pencil (USB-C) and from a finger.
5. A palm down first, then the Pencil: do pen events arrive? How wide is a palm's contact?
6. Hover in LINE and in Safari; whether `(any-pointer: fine)` turns on with a Pencil paired.
7. A three-finger tap: does iPadOS's own shortcut bar take it?
8. Corner and edge swipes over the sheet; a long Pencil press.
9. The motion permission prompt in LINE on an iPad.

## 6. Shared interfaces

These names are shared between plans; each plan builds what it owns.

- **`apps/frontend/src/app/sizeClass.ts`** (owned by the foundations plan):
  - **Constants:** `REGULAR_MIN_WIDTH` 700, `REGULAR_MIN_HEIGHT` 600, `SHORT_BELOW_HEIGHT` 700.
  - **Type:** `SizeClass = { width: "compact" | "regular"; height: "short" | "tall" }`.
  - **`sizeClassOf(width, height, framed)`** is pure; the desktop frame (`framed`) is always compact.
  - **`observeSizeClass(frame)`** sets `data-width` and `data-height` on `.phone`.
  - **`useSizeClass()`** reads it in React.
  - **Dev override:** `?layout=regular|compact` in dev builds.
- **`--content-w`** (`styles/tokens.css`): the regular width's card and column width.
- **`apps/frontend/src/sticker-creation/canvas/sheetFrame.ts`** (owned by the drawing sheet plan):
  - **Constants:** `SHEET_SHORT_UNITS` 374, `MIN_SHEET_ASPECT` 1, `MAX_SHEET_ASPECT` 2.2, `MAX_INK_PIXELS` 4,200,000 (a starting value).
  - **Type:** `SheetFrame = { w: number; h: number; density: number }`, in units and device px per unit.
  - **`frameFor(area, devicePixelRatio)`** chooses a drawing's frame; **`fitScale(frame, area)`** gives CSS px per unit.
  - **The drawing canvas's handle** gains `frame()` and `screenToSheet(clientX, clientY)`.
- **`apps/frontend/src/sticker-board/boardPanel.ts`** (owned by the board plan):
  - **`REFERENCE_BOARD`** = `{ width: 390, height: 776 }`.
  - **`panelFor(boardW, boardH)`** returns `{ scale, left, top, width, height }`.
  - **`trayBesidePanel(panel, boardW, trayW)`** says whether the tray fits beside the panel.
- **`apps/frontend/src/ui/screenAxes.ts`** (owned by the Explore and dialogs plan): `toScreenAxes(x, y)` rotates device-tilt axes by `screen.orientation.angle`. The shared light and the heart's sway read through it.

## 7. Testing

- **Unit tests** cover the pure parts:
  - size-class thresholds;
  - the sheet frame and the screen-to-sheet mapping;
  - the kept drawing's frame;
  - the board panel's mapping;
  - the palm rules in the tap recognizer;
  - the pressure start and flat-pressure fallback;
  - the pile's scale cap.
- **Each phase runs scripted checks** in WebKit and Chromium at 390×844, 540×620, 744×1133, 820×1180, 1180×820 and 1376×1032. They include a rotation mid-drawing, mid-drag on the board and mid-scroll in Explore. Chromium's CDP pen events check pressure, tilt and hover.
- **impeccable critique, then polish and audit,** on compact and regular, before the finish.

## 8. Plans

Build order: the LIFF update (today); foundations; then the drawing sheet, the board, and Explore and dialogs in parallel; the drawing screen and Pencil once the sheet lands; LINE's sheet last, since it checks every surface and holds the finish.

Each plan covers its surfaces at every size, LINE's short sheet included.

| Plan                                           | Covers                                                                                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-10-07-ipad-foundations.md`               | Decisions 3, 14 (sheets and cards), 16, 17 and 18. The Device paper and the Pencil summary. The out-of-tickets card's shift. Bottom sheets' bottom safe area.                                |
| `2026-10-07-ipad-drawing-sheet.md`             | Decision 4. Strokes lost to a rotation.                                                                                                                                                      |
| `2026-10-07-ipad-drawing-screen-and-pencil.md` | Decisions 5–9 and the Pencil fixes. The drawing screen at short heights.                                                                                                                     |
| `2026-10-07-ipad-board.md`                     | Decisions 10–12. Overflowing stickers, the tray, the cork back's turn, the selection toolbar.                                                                                                |
| `2026-10-07-ipad-explore-and-dialogs.md`       | Decisions 13, 14 (columns) and 15. The Gratitude replay, the seal ceremony after a rotation, Explore's scroll after a rotation, the tilt axes, the Mini-game and Receiving at short heights. |
| `2026-10-07-ipad-line-sheet.md`                | Decisions 1 and 2. The sign-in gates at short heights. A check of every surface at LINE's sheet sizes. The finish.                                                                           |

**The finish, in the LINE sheet plan, which lands last:**

- impeccable critique, polish and audit.
- DESIGN.md's Layout gains the size classes and the regular compositions. That's a durable system change, made with ad0ll's approval.
- PRODUCT.md's Platform names the iPad: LINE's sheet and Safari.
