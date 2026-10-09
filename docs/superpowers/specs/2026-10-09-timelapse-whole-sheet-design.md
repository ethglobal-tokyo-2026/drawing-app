# Timelapse on the whole sheet: design

**Status:** approved 2026-10-09 (ad0ll picked "play on the sheet, framed to everything drawn, then cut the sticker out", and left the rest to the recommendations here).

## Problem

- The player crops to the sticker's place (`timelapsePlayer.ts`) and the layer is masked to its silhouette (`timelapse.css`). A mark drawn outside the cut and erased never shows; a stroke crossing the cut stops at its edge; their time still plays, so the timelapse stalls.
- The data is whole: a timelapse holds every op on the sheet at seal, with the sheet's size and the sticker's place. This is a player change only, and every stored timelapse plays the new way.
- Undone marks, and anything before Clear, aren't recorded and stay out: undo takes a mark back, Clear starts over.

## The frame

- The part of the sheet that was drawn on: the box around every brush stroke (its points, each grown by half its width), every fill (the box its flood changed) and the sticker's place, grown by a margin and clipped to the sheet.
- Eraser strokes don't grow it: on bare paper they show nothing.

## Where it plays

- In the sticker's spot. The layer covers the detail's stage (`.sticker-detail__slide`) and is clipped to it; the pager, fine print and Skip don't move.
- The frame plays as white paper in the drawing sheet's look (Canvas, `--r-paper`, the sheet's shadow), the ink canvas over it.
- Scale: the sticker's own when the frame fits the stage at it, otherwise shrunk to fit; never larger than the sticker's own.
- Position: the sticker's part stays as near its spot as the stage allows, each axis clamped into the stage.

## Sequence

1. **Start.** The paper fades in. The sticker flies from its spot onto its place on the paper, then fades to blank paper as the first strokes land.
2. **Playing.** As today: the schedule, fills' circular reveals, Skip. The sticker and the gift dot are hidden.
3. **End.** A hold on the finished sheet. The sticker fades in over its own ink, peels off the sheet and flies back to its spot, sticking with a settle from 1.06, while the paper and every mark around the sticker fade out. The sheen sweeps, as now.

- A sticker whose frame fits around it at its own scale never flies: the paper fades in around it and fades out around it.
- Stop, paging and closing put the sticker and the dot back at once, before the detail's lift clones the figure.
- **Reduced motion:** no flights. The paper appears at once; at the end it fades out while the sticker fades in, in its spot; no sheen.

## Fills

- A fill's reach is known only once flooded. The prepare pass already floods every fill at the drawing's density; `InkSurface.fill` returns the box it changed.
- The pass frames the strokes and the place first. When a fill reaches outside that frame, it floods on to find every fill's box, then prepares again in the grown frame. A sticker whose fills stay inside its strokes prepares once, as now.
- Each fill's before and after reads cover only the box its flood changed, mapped onto the display, not the whole display.

## Code

| Unit                                                                             | Change                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sticker-board/timelapse/timelapseFrame.ts` (new)                                | Pure: the frame from ops and fill boxes; the layout (where the sheet sits while it plays, and where the sticker sits in its spot); the sticker's transform between them |
| `timelapseCrop.ts`                                                               | The display canvas covers the stage; `sheetCrop` and `displayPoint` take a placement rather than the place                                                              |
| `fillSnapshots.ts`                                                               | Frame-aware; regrows the frame; reads only each fill's box                                                                                                              |
| `sticker-creation/canvas/inkSurface.ts`                                          | `fill` returns the box it changed, or null                                                                                                                              |
| `timelapsePlayer.ts`                                                             | Canvas over the stage, drawn at the playing placement; exposes the frame and layout once prepared                                                                       |
| `useTimelapse.ts`                                                                | The start and end flights, hiding and restoring the sticker and the dot, on the hook's frame clock                                                                      |
| `TimelapseLayer.tsx`, `timelapse.css`, `sticker-detail.css`, `StickerDetail.tsx` | The layer over the stage, the paper element, the stage's box for the player                                                                                             |

## Testing

- Unit: the frame (marks outside grow it, erasers don't, fills count, clipped to the sheet); the layout (own scale when it fits, shrinks to fit, never grows, clamps); fills regrowing the frame; the player painting outside the place; the hook hiding the sticker while it plays, landing it in its spot, and restoring it on stop.
- End to end, Chromium and WebKit: seal a sticker with a mark erased outside its cut; while it plays the paper reaches past the sticker's box; at the end the sticker is back in its spot.
- By hand before merge: phone and iPad sizes, both engines, English and Japanese, reduced motion, and a recording of the whole sequence.
