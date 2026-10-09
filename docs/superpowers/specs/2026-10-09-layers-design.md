# Layers on the drawing screen

For review. ad0ll's calls (2026-10-09): a layer's options open Procreate's way, by tapping the current chip again; drag to reorder; Clip to layer below in this build; up to 10 layers; 0% hides a layer; Pencil hover magnifies the chips. No merging and no blend modes. Brush opacity gets its own plan.

## Why

Artists use layers to sketch and then ink, to color under the lines, and to shade inside shapes. ibisPaint's basic course teaches the last two as lessons 11 and 12: fill the undercoat against the line art, then clip the shadow to it (https://ibispaint.com/lecture/index.jsp?no=85). The sheet is one canvas today, and PRODUCT.md lists layers under Never; this lifts that.

## Brief (impeccable shape)

- **Mode:** Operate. An extension of the drawing screen: it inherits the screen's world (flat label stock, paper, the one light), so no concept round and no DESIGN.md change.
- **Job:** pick the layer you draw on, see what's on each, fade or hide one, reorder them, and set one to lock its transparent pixels or clip to the layer below, mid-drawing, in a few taps, while the canvas stays nearly bare.
- **Signature move:** selecting a layer flashes its ink in the world's one light, under whatever covers it.
- **Must not:** lag a stroke, take more of the sheet than one more strip under the tools, or lose a stroke to a reload.

## Decisions

### The layer panel

1. **Placement.** One flat label strip under the tool strip, right-aligned with it; with a left drawing hand it follows the tool strip to the top left. Its slots line up under the tool tiles: on the right hand, a gap before **+** matches the hairline before the tool strip's Clear.
   - The Smoothing bar, the clear bar and the options bar open under the panel, never over it.
   - On a large screen it's one row in the top bar, before the tool strip, with the slider before the chips, so nothing hangs into the sheet.
   - It hides with the tools: while a Kyoto Seika sheet waits for Begin, at time's up and while sealing. The seal sheet covers it like the rest.
   - The panel leaves room for the current chip's ring.
2. **Chips.** Back on the left, front on the right, then **+**. Every layer stack in the apps surveyed is vertical, so the rule is stated: right is in front.
   - A chip is a tiny sheet of paper showing its layer's ink cropped to the ink, as ibisPaint's "Only Contents" thumbnails are (https://ibispaint.com/lecture/index.jsp?no=81&lang=en), with the layer's number in fine print. An empty layer shows only its number.
   - A fresh sheet has one layer, 1.
   - A faded layer's chip fades with it, but never below half, so a faint sketch still reads. A hidden layer's chip is dimmer still and wears an eye-slash.
   - Chips sit on the tool strip's 40px pitch. When there are more than fit (on a phone, past about seven), they scroll and **+** stays at the end.
   - The strip is one Tab stop, like the tool strip. Arrow keys move between chips; Enter selects one, or opens the current chip's options.
3. **Numbers.** A layer keeps its number for life: moving it never renumbers it. A new layer takes one more than the highest number the sheet has used, so an undone delete can't collide with a newer layer.
4. **Up to 10 layers.** **+** dims at 10. A 30-minute Kyoto Seika sheet needs more than Linea Sketch's 5 (https://linea-app.com/).
5. **+ adds a layer directly above the current one and makes it current.** Procreate Pocket (https://help.procreate.com/pocket/handbook/layers/layers-create), Sketchbook (https://help.sketchbook.com/docs/adding-layers), ibisPaint and Kleki all do this.
6. **Tap a chip** to make it current: its ink flashes (19). **Tap the current chip** to open or close its options bar, as Procreate's Layer Options open (https://help.procreate.com/procreate/handbook/layers/layers-mask).
7. **The options bar:** one row of flat tiles, like the tool strip, under the panel:
   - Lock transparent pixels, Clip to layer below;
   - Move back, Move forward;
   - Delete layer.

   A pressed toggle is reversed out of Ink, like the current tool. Any tap elsewhere closes it, as it closes the Smoothing bar.

8. **The opacity slider** sits under the chips and sets the current layer's opacity.
   - It shows once the sheet has two layers, since with one it would only fade the whole sticker. It also shows while the current layer isn't at 100%, so a hidden layer left on its own can still be brought back.
   - Arrow keys step it; Home and End go to 0% and 100%.
   - **Thumb only:** you drag the thumb from where you grab it, as on the size rail; a tap on the track does nothing. UIKit's slider and WebKit's range input work this way (https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/shadow/SliderThumbElement.cpp). Beside the canvas, jumping to a tapped spot would turn a palm, or a stroke starting next to the slider, into an opacity change.
   - **Ends:** dragging past either end lands exactly on it. It doesn't snap near 0 or 100: no app surveyed does, iOS's browser can't give the haptic tick that makes a snap legible, and a stray snap to 0 hides the layer.
   - **Value:** shown at the row's end while you drag.
   - **Reset:** a double-tap on the thumb resets it to 100%, as Lightroom and Fresco do.
   - **One step:** the value lands on release, as one undo step.
9. **0% hides a layer, and a hidden layer takes no ink.** A stroke, fill or erase on it is blocked; the slider nudges and a short hint shows beside it, as the paused sheet's hint does. Infinite Painter blocks drawing at zero the same way (https://docs.infinitestudio.art/painter/layers/). There's no eye button.
10. **Delete layer** takes one tap and asks nothing; undo restores it. Procreate, MediBang, ibisPaint and Kleki do the same. The last layer can't be deleted. The layer below the deleted one becomes current, or the one above if it was at the back.
11. **Reorder:** hold a chip to lift it, drag it along the strip and drop it (Procreate: https://help.procreate.com/procreate/handbook/layers/layers-organize).
    - While a chip is lifted, its neighbors slide apart, and an overflowing strip scrolls at its ends.
    - Move back and Move forward are the way without dragging, which WCAG 2.5.7 requires (https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
    - It runs on pointer events, not the browser's drag and drop, which WebKit may not enable in LINE's web view.
12. **Clear** (the tool strip's tile) clears the current layer. It asks first, as today, and leaves the layer's opacity alone; Procreate resetting it to 100% is a reported trap.
13. **No merging and no blend modes.**

### Painting with layers

14. **Fill reads every visible layer, as shown, and paints the current one.** This is the default in ibisPaint (https://ibispaint.com/lecture/index.jsp?no=82&lang=en), MediBang, Linea and Kleki.
    - A layer faded under half opacity doesn't hold a fill, since the fill takes anything fainter than alpha 128 for paper.
    - A layer at 0% doesn't count at all.
15. **Lock transparent pixels:** the brush and the fill change only pixels already on the layer. The eraser still erases, as in Procreate and Clip Studio. The chip shows a checkerboard under its thumbnail, Procreate's sign.
16. **Clip to layer below:** the layer shows only where the nearest unclipped layer below it has ink.
    - It fades with that layer: their opacities multiply, as in Clip Studio (https://help.clip-studio.com/en-us/manual_en/180_layers/Other_layer_settings.htm).
    - Several clipped layers can share one base.
    - The bottom layer can't clip. A clipped layer moved to the bottom stops clipping until a layer goes under it (Procreate).
    - Its chip slides left inside its slot to touch the chip it clips to, a little smaller, like a sticker stuck to the edge of another. The slots stay on the tool tiles' columns, and its number stays at 11px.
17. **Undo covers every layer change:** add, delete, move, opacity, lock, clip and clear are one step each.
    - Back-to-back opacity changes to one layer merge into one step, as Kleki does.
    - Undo never leaves a deleted layer current, and a layer it brings back comes back current.
18. **The clock holds** while a finger is on the slider's thumb, while a chip is lifted, and while the options bar is open, as it holds for the size rail and the Smoothing bar. It never holds on a begun sheet in Kyoto Seika Practice Mode.

### Feedback

19. **Selecting a layer flashes its ink.** This happens on a tap, Move back or forward, or a drop. Linea Sketch's "subtly flashes its contents" is the precedent (https://apps.apple.com/us/app/linea-sketch/id1094770251).
    - A band of the one light sweeps its visible ink from the top left, under the layers above it, so they cover it.
    - Where they cover it, a dashed Ink outline traces it for the same beat.
    - Glints spark off all its edges, covered ones too, and fade.
    - It lasts about 240 ms, with about a 500 ms tail.
    - A stroke that starts cancels it, an empty layer doesn't flash, and under reduced motion nothing flashes: the chip's ring shows the current layer.
20. **A hovering pen magnifies the chips,** as the macOS Dock does.
    - The chip under the pen grows, and its neighbors grow less and part to make room, so the chip stays under the pen.
    - Chips grow toward the sheet. On a phone, where the slider sits under them, the slider fades while the pen hovers the chips.
    - Touching down freezes the strip, so the tap lands where it hovered, and leaving lets it settle.
    - Pen only, never a finger or a mouse. Hover only previews, as Apple asks (https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble).
    - iPad Safari has delivered Pencil hover since 16.1 (https://webkit.org/blog/13399/webkit-features-in-safari-16-1/). Whether LINE's in-app browser does is unverified.

### Sealing, keeping and the timelapse

21. **The sticker is cut from the visible layers, composited as shown:** opacity and clipping applied, hidden layers left out. The flat sheet and the seal sheet's preview are the same composite.
    - Ink fainter than the cut's threshold (alpha 18) prints inside the cut but doesn't widen it.
22. **A reload brings everything back:** the layers, their order, opacity, lock, clipping and the current layer. A drawing kept by the build before this one loads as one layer, since strokes must survive a deploy.
23. **The timelapse plays each layer's ink in its place,** with its opacity, lock and clipping as they were at each moment. This builds on the whole-sheet timelapse (`docs/superpowers/specs/2026-10-09-timelapse-whole-sheet-design.md`), which lands first: the layered player extends its player, and its frame takes in every layer's strokes, deleted layers' too.
    - Adding a layer passes a faint sheen over the sheet.
    - Deleting or clearing one fades its ink out.
    - A move restacks the layers at once.
    - An opacity change eases to its new value.
    - Each event takes a short beat out of the timelapse's length, as a fill's reveal does.
    - It starts where the sheet was last blank, meaning no layer had ink, as today's starts after the last clear.
24. **Timelapse format v2** (below).
    - Stored v1 timelapses stay as they are and play as one layer. With no backups, rewriting every stored timelapse isn't worth the risk.
    - The API reads and accepts both formats, so a page loaded before a deploy can still seal.

### Vocabulary

25. **AGENTS.md gains Layer** (approved), worded: "One of the stacked sheets of ink a drawing is drawn on, up to ten. Each has its own opacity, and can lock its transparent pixels or clip to the layer below; at 0% it's hidden and takes no ink. Sealing flattens the visible layers into the sticker."
26. **Renames, so "layer" means one thing on the drawing screen and in the timelapse:**
    - The sealing code's image parts become **passes**, compositing's word for an image's separately rendered parts (a specular pass, a shadow pass, a matte): `sealing/stickerLayers.ts` → `stickerPasses.ts`, `LayerName` → `PassName`, `SealedSticker.layers` → `passes`.
    - The sticker detail's `TimelapseLayer` becomes `TimelapseOverlay`, once the whole-sheet timelapse branch, which edits it, has merged.
    - The ink engine's `InkLayer` goes; the layer stack replaces it.
    - Other screens' stacking elements named "layer" (the Mini-game's, `ArtistChipLayer`, `ThoughtLayer`, the tray's `spreadLayer`) stay. They're off the drawing screen, and renaming them would collide with other sessions' work there.

## How it works

### The layer stack

- An ordered list, back to front. Each layer has its number, its opacity (0–100), whether it's locked and whether it's clipped. One layer is current.
- A clipped layer's base is the nearest unclipped layer below it. A clipped layer with no unclipped layer below it isn't clipping.
- Each layer's ink is a canvas the size of the sheet. It's made when the layer first takes ink and let go when the layer is empty or gone.

### Steps and undo

- Every op names its layer. Layer changes are steps of their own: add, delete, move, opacity, lock, clip and clear.
- Undo rebuilds from the nearest checkpoint and replays every layer's steps since it, in order. A fill reads the other layers, so one layer can't replay alone and come out the same.
- A checkpoint copies only the layers changed since the previous one and shares the rest.
- Checkpoint copies live under a memory budget that shrinks as layers fill.
  - Past the budget, older checkpoints thin out rather than vanish.
  - So a deep undo in a 30-minute Kyoto Seika drawing replays a bounded stretch, not the whole drawing.
- A deleted layer's canvas stays until the next step, so undoing the delete is instant.

### What's on screen

- **Three canvases show the sheet however many layers it has:**
  - `below`: every layer under the current one, composited;
  - the current layer's own canvas, at its opacity;
  - `above`.
- The prediction canvas sits over the current layer, under `above`.
- **The composites are rebuilt** when:
  - the current layer changes;
  - another layer changes, through undo, redo, a property or a move;
  - a stroke changes the base of clipped layers above it. Only the stroke's dirty rectangle is rebuilt, and only then.
- A clipped current layer shows through a view canvas cut to its base, updated in each stroke's dirty rectangle.
- One compositing function serves the composites, the seal, the fill's read and the timelapse, so what's sealed is what was shown.
- While the board covers the drawing screen, the drawing screen lets go of its composites and checkpoints. They're rebuilt when it shows again.

### Painting

- **A stroke** paints only the current layer's canvas, as the one ink canvas is painted today. That keeps a stroke's cost per frame where it is.
- **Lock:** the brush composites `source-atop`, which keeps the layer's alpha. A locked fill draws its result the same way, and the prediction is cut to the layer's ink.
- **Clipping:** strokes land on the clipped layer's own canvas, which keeps all of them. Only what's shown is cut.
- **A pen's taper:** the snapshot it restores is the current layer's.

### Thumbnails

- Each chip has a small canvas at the screen's density.
- After each committed op, its chip redraws from the layer's canvas, scaled down with smoothing, cropped to the layer's ink bounds.
- It never redraws mid-stroke. After undo, redo, a load or a clear, every chip redraws.
- `drawImage` from one canvas to another stays in WebKit's GPU process, so nothing is read back.

### The flash

- Built when a layer is selected, at quarter scale, from that layer's own canvas:
  - a sheen canvas over the current layer, under `above`;
  - an outline cut to where `above` covers the layer;
  - glints started from its edge pixels.
- Let go when it ends.
- No canvas `filter`, which Safari ships turned off (https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter), and no animated `drop-shadow`, which WebKit animates on the main thread.

### Pen hover

- Transforms on the chips only, from the pen's position over the strip (pointer events with `pointerType` pen and no buttons).
- Distances are measured from each chip's resting center, so the chips don't jitter as they grow.

### Memory

Every canvas is one RGBA buffer.

- **Before iOS 17,** WebKit capped all of a page's canvases at a quarter of its process's memory limit. Reported caps run from 224 MB to 576 MB by device (https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/), and a canvas past the cap silently gets no pixels. Older LINE builds still run on iOS 15 and 16 (https://help.line.me/line/smartphone/sp?contentId=10002433&lang=en).
- **iOS 17 dropped the cap,** so past the limit the page process is killed instead (https://developer.apple.com/documentation/safari-release-notes/safari-17-release-notes).

Computed for a full iPhone sheet (1122 × 2469 px, 11.08 MB) and the densest sheet (16.80 MB), all ten layers inked:

| Canvases                         | Count | iPhone   | Densest  |
| -------------------------------- | ----- | -------- | -------- |
| Ten layers                       | 10    | 110.8 MB | 168.0 MB |
| + `below`, `above`, prediction   | 13    | 144.1 MB | 218.4 MB |
| + a clipped current layer's view | 14    | 155.1 MB | 235.2 MB |
| + four checkpoint copies         | 18    | 199.5 MB | 302.4 MB |
| + the seal's or a pen's copy     | 19    | 210.5 MB | 319.2 MB |

So:

- A layer's canvas exists only once the layer has ink.
- The checkpoint budget shrinks as layers fill.
- If a canvas can't be made, adding the layer or its first stroke fails with an error line, and nothing drawn is lost: every layer replays from its steps.
- Measured before the build (see To measure): whether WebKit gives each shown canvas a second backing store.

### Timelapse v2

```
{ v: 2, ink: [w, h], place: [x, y, w, h], density,
  layers: [[number, opacity, locked, clipped], …],   // back to front, where the timelapse starts
  ops: [
    ["brush" | "eraser", layer, color, T, points],
    ["fill", layer, color, T, x, y, gap],
    ["clear", layer, T],
    ["add", layer, T, at],        // at: its place from the back
    ["delete", layer, T],
    ["move", layer, T, to],
    ["opacity", layer, T, percent],
    ["lock", layer, T, on],
    ["clip", layer, T, on],
  ] }
```

- **API:** `apps/api/src/stickers/timelapse.ts` gets `timelapseV2Schema` and a union of v1 and v2 for reading and sealing. No table changes: the timelapse is stored gzipped as sent. `MAX_TIMELAPSE_BYTES` stays.
- **Player:** keeps a canvas per layer at the display's size and composites them each frame through the same compositing function.
- **Fills' prepare pass:** replays every layer in order at the drawn density, since each fill reads them all.

## Not taken

- **One canvas per layer, all on the page.** Simplest, but each shown canvas may hold a second backing store in WebKit, and the browser can't mask one canvas with another, so clipping would need composites anyway.
- **Tiles, as Krita and MyPaint use.** Memory would follow the inked area, at the cost of rewriting the engine.
- **Storing each fill's result,** as Klecks and Drawpile do, so a layer replays alone. That means heavier steps and timelapses.
- **A fill that reads only the current layer,** Procreate's default. It floods a fresh layer whole, the trap that coloring under the lines falls into.
- **A vertical layer column,** every app's stack. The drawing hand covers one side and the size rail holds the other.
- **Merging,** by drag or by command. No phone painting app merges by drag, and on a 40px chip the drop zone is about 3 mm against a fingertip's 7–12 mm (https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php).
- **A visibility toggle;** 0% hides a layer instead.
- **On the slider,** jumping to a tapped spot and snapping near 0 or 100.

## Tests

**Unit**

- Layer stack:
  - adds above the current layer, caps at 10, and never reuses a number;
  - delete keeps one layer;
  - a move works;
  - a clip finds its base, through chains, and stops at the bottom.
- Undo:
  - every layer step undoes and redoes;
  - checkpoints share unchanged layers;
  - a rebuild under any budget matches a replay from blank, over random step sequences with fills on other layers.
- Compositing: opacity, hidden layers, clip opacities multiplying, clip chains, a clipped layer at the bottom.
- Painting:
  - lock keeps alpha for the brush and the fill, and the eraser still erases;
  - lines on one layer bound a fill on another, and a layer under half opacity doesn't;
  - a hidden layer blocks ink and nudges the slider.
- Timelapse:
  - v2 encodes and decodes;
  - v1 decodes as one layer;
  - layer events get beats;
  - it starts at the last blank sheet.
- Kept session: layer steps and the current layer round-trip; a kept drawing without layers loads as layer 1.
- Slider:
  - a tap on the track does nothing;
  - dragging past an end lands on it, and the release position applies;
  - a double-tap resets;
  - one drag is one undo step;
  - Home and End jump to the ends.
- Panel:
  - a tap selects, and a tap on the current chip opens the options;
  - hold and drag reorders as one step;
  - Move back and Move forward work;
  - names and states are read out.
- API: a v2 seal is stored and served; a stored v1 still reads.

**End to end, in Chromium and WebKit**

- Layers:
  - add, then draw on two layers;
  - clear clears only the current one;
  - delete, then undo restores it;
  - a reload keeps the layers and the current one.
- Reorder by a touch drag, and by Move back and forward.
- Opacity: hiding blocks ink, and a double-tap resets.
- Lock and clip, checked through the seal sheet's preview.
- The sealed sticker shows a lower layer under an upper one, and leaves a hidden layer out.
- A layered sticker's timelapse plays.
- In Kyoto Seika Practice Mode, nothing in the panel holds the clock.
- With a left drawing hand, the panel is mirrored.
- On an iPad, the panel sits in the top bar, and synthesized pen hover magnifies the chips.

**iPadOS Safari** (`test:ipad-safari`): the panel against Safari's toolbars, and a touch drag that reorders.

## Build order

1. **Spike:** measure (below), and set the checkpoint budget.
2. **Renames** (26).
3. **Layer stack, steps, undo and the kept session,** with one layer and no visible change.
4. **The three-canvas display and the compositing function.** The seal and the fill read the composite.
5. **The panel:**
   - chips, thumbnails, add and select;
   - the options bar with Move back, Move forward and Delete;
   - clear per layer, the opacity slider and the hidden rule;
   - the clock holds and the strings.
6. **Drag to reorder, and pen hover.**
7. **Timelapse v2:** the encoder, the API schema and the layered player, on top of the whole-sheet player once its branch (`feat/timelapse-whole-sheet`) has merged.
8. **Lock transparent pixels.**
9. **The selection flash** (impeccable delight and animate).
10. **Clip to layer below:** last, so it can be cut without touching the rest.
11. **Finish:**
    - impeccable critique and polish;
    - PRODUCT.md, AGENTS.md and the glossary;
    - the full end-to-end suite and `test:ipad-safari`.

## To measure and tune

- **Before the build,** with ten inked layers:
  - canvas memory in the iPad simulator's Web Inspector, including whether a shown canvas holds a second backing store;
  - frame times drawing on the top and bottom layers in WebKit.
- **During the build,** reported as values for ad0ll to judge in use. These are unverified guesses to tune:
  - the lift hold, about 400 ms, with 8px of slop;
  - magnification: ×1.5 under the pen, ×1.25 beside it, ×1.1 next;
  - the flash: about 240 ms, with a 500 ms tail;
  - the timelapse's beats for layer events.
- **Deep undo** on a 30-minute Kyoto Seika drawing with ten layers and fills, timed with the performance recorder.

## Docs and strings

**PRODUCT.md**

- Tools: up to ten layers with opacity, lock and clip; fill reads every visible layer; clear clears the current layer.
- The clock's holds gain the slider, a lifted chip and the options bar.
- Never loses "Layers".
- Sealing cuts from the visible layers.
- The timelapse plays them.

**AGENTS.md:** the Layer entry (25), and `src/sticker-creation` gains `layers/`: the layer stack, the compositing function and the panel.

**DESIGN.md:** unchanged. No design-system rule changes: chips are paper, the tiles are flat tool tiles, and the flash reads the one light.

**Glossary.** Clip Studio's own Japanese, as the glossary's 消去 already is. Each term was checked against Clip Studio's user guide:

- layer basics: https://help.clip-studio.com/ja-jp/manual_jp/180_layers/レイヤーの基本操作.htm
- clipping and the lock: https://help.clip-studio.com/ja-jp/manual_jp/180_layers/編集に便利な設定を使う.htm

ibisPaint's names are noted where they differ (https://ibispaint.com/lecture/index.jsp?no=156&lang=ja).

| English                 | Japanese                   | Where Clip Studio says it                                               | ibisPaint says   |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------- | ---------------- |
| layer                   | レイヤー                   | everywhere                                                              | same             |
| New layer               | 新規レイヤー               | [レイヤー]メニュー→[新規レイヤー]                                       | 新規レイヤー追加 |
| Delete layer            | レイヤーを削除             | [レイヤーを削除]                                                        | レイヤーの削除   |
| Move forward / back     | 前面へ / 背面へ            | [レイヤー]メニュー→[並べ替え]→[前面へ]・[背面へ]                        | drag only        |
| hidden                  | 非表示                     | レイヤーの表示・非表示                                                  | same             |
| opacity                 | 不透明度                   | the palette's opacity                                                   | same             |
| layer options           | レイヤー設定               | [レイヤー]メニュー→[レイヤー設定]                                       | none             |
| Lock transparent pixels | 透明ピクセルをロック       | [レイヤー設定]→[透明ピクセルをロック]                                   | 不透明度ロック   |
| Clip to layer below     | 下のレイヤーでクリッピング | [レイヤー設定]→[下のレイヤーでクリッピング]                             | クリッピング     |
| clear (a layer)         | 消去                       | [編集]メニュー→[消去], replacing the glossary's "clear (the sheet)" row | レイヤーのクリア |

**Catalog** (`strings/stickerCreation.ts`). Each string gets its screen comment. Japanese follows the glossary above and the existing strings' style.

| Where                              | en                                                                                      | ja                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The panel, for screen readers      | Layers                                                                                  | レイヤー                                                                                       |
| A chip                             | Layer {{number}}                                                                        | レイヤー{{number}}                                                                             |
| A chip's states, after its name    | hidden · locked · clipped to layer {{base}}                                             | 非表示 · 透明ピクセルをロック中 · レイヤー{{base}}でクリッピング                               |
| +                                  | New layer                                                                               | 新規レイヤー                                                                                   |
| The slider                         | Opacity                                                                                 | 不透明度                                                                                       |
| The options bar                    | Layer {{number}} options                                                                | レイヤー{{number}}の設定                                                                       |
| Its tiles                          | Lock transparent pixels · Clip to layer below · Move back · Move forward · Delete layer | 透明ピクセルをロック · 下のレイヤーでクリッピング · 背面へ · 前面へ · レイヤーを削除           |
| A blocked stroke on a hidden layer | Hidden. Raise its opacity to draw.                                                      | 非表示中です。不透明度を上げるとかけます。                                                     |
| A move, announced                  | Layer {{number}} moved behind layer {{other}} · in front of layer {{other}}             | レイヤー{{number}}をレイヤー{{other}}の背面へ · 前面へ移動しました                             |
| The clear tile and its bar         | Clear the layer · Clear the layer?                                                      | レイヤーを消去 · レイヤーを消去しますか？                                                      |
| The timer's held status            | paused while you set the opacity · move a layer · choose layer options                  | 不透明度を調整している間 · レイヤーを移動している間 · レイヤー設定を選んでいる間は一時停止中   |
| A layer that can't be made         | Couldn't add a layer: this device is short on memory. Deleting a layer makes room.      | 端末のメモリが足りないため、レイヤーを追加できませんでした。レイヤーを削除すると追加できます。 |
