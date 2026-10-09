# The fill closes small gaps

For review. ad0ll chose one fixed gap with no control (2026-10-09).

## Why

A fill on paper floods every connected pixel fainter than alpha 128 (`sticker-creation/canvas/fill.ts`), so it escapes through any opening one device pixel wide: a third of a unit on a 3× phone. Lines drawn by finger seldom close that tightly.

## Decisions

1. **One fixed gap, no control.** A fill on paper treats openings up to `FILL_GAP` sheet units across as closed. It starts at 2 units (2 CSS px on a 390 px phone; the default brush draws 6.9 units wide), and the calibration below tunes it before merge.
2. **It stops about midway across a gap,** as if the line ran straight across it. Corners inside the shape still fill to their tips.
3. **A space narrower than the gap counts as one.** A shape pinched that narrow fills one side per tap. A space with no room anywhere wider than the gap, such as a tiny closed loop, fills whole, as today.
4. **A fill on a color doesn't close gaps.** Recoloring a stroke or an earlier fill floods that color's region as today, so a stroke thinner than the gap still recolors whole.
5. **The sheet's edges close gaps as lines do,** so a line that stops just short of the edge holds a fill.
6. **Each fill records the gap it closed** (`FillOp.gap`, sheet units). Undo, the drawing kept on the device and the timelapse replay every fill from scratch, each with its own gap. A fill drawn before this replays as it was drawn, and a later change to `FILL_GAP` never changes an existing drawing.
7. **Older records read as gap 0.** A kept step or a stored timelapse without a gap closed none. The timelapse's fill entry gains an optional sixth element, `["fill", color, T, x, y, gap]`, which the API's schema accepts alongside the five-element entries already stored. Sealing refuses a timelapse it can't parse, so the API ships with or before the app; `deploy.sh` publishes the API first.
8. **The first read stays small.** A fill still reads the 160-unit square around the tap first, and the whole sheet only when the fill could reach past that square. The result is the same either way.

## How it fills

1. **Distance:** each pixel of paper in the square read gets its distance to the nearest line pixel (alpha ≥ 128) or the sheet's edge, as chamfer distances, which are within a few percent of true ones and take one byte a pixel.
2. **Open paper:** paper farther than half the gap from every line, flooded from the tap. No open paper fits through an opening narrower than the gap, so the flood can't cross one. A tap near a line starts from the open paper nearest it.
3. **Paper near a line** goes to the nearest stretch of open paper, measured through paper. The fill takes its open paper and the paper near a line that goes to it. Across a gap, the far half goes to the open paper on the far side, so the fill stops about midway. In a corner, no other open paper is near, so the corner fills.
4. **Tuck:** the fill tucks under neighboring lines, as now.
5. **First square:** paper near a side of the square cut from the sheet can't see the lines past that side. The fill reads the whole sheet when it comes near such a side, or meets paper that open paper past the side might claim.

Gap 0 runs the same steps with no paper near a line, which is today's fill.

## Not taken

- Thickening the lines, filling, then growing the fill back: it bulges out through each gap and leaves corners unfilled.
- Krita 5.3's distance-following flood (https://invent.kde.org/graphics/krita/-/merge_requests/2050). Its author notes it can leave empty areas or spill along the edges when the gap size doesn't suit the lines (https://krita-artists.org/t/close-gap-in-fill-tool/32043?page=9).
- Joining detected line ends, as GIMP's line art fill does: unreliable on sketchy lines.
- Clip Studio Paint's Close gap (隙間閉じ) control: five levels, 1, 3, 5, 10 and 20 px by default (https://www.pipelinecomics.com/learncsp/close-the-gap/). ad0ll passed on a control for now; recording each fill's gap leaves room for one.

## Cost

The distance pass covers the square the fill reads: the 160-unit square for a small shape, and the whole sheet (up to 4.2 MP) for a background fill. Both kinds of fill are timed before and after in Chromium and WebKit on this Mac, and reported with the calibration.

## Tests

- `fill.test.ts`:
  - An opening under the gap holds the fill, and the paper just outside it stays empty.
  - An opening over the gap lets the fill through.
  - A closed shape with a sharp corner fills the same pixels with gap closing as without.
  - A tiny closed loop fills whole.
  - A stroke thinner than the gap recolors whole.
  - `floodSheet` gives the whole-image result for gap fills from every first-square size.
- `keptSession.test.ts`: a fill kept without a gap reads back closing none.
- API: a stored timelapse whose fills carry no gap still reads.

## Calibration (before merge)

In the dev server, in Chromium and WebKit: a sheet with openings of 1 to 6 units and a pinched shape, filled at gaps of 2, 3 and 4 units. Screenshots of which openings closed, and the timings, go to ad0ll with a recommended `FILL_GAP`.

## Docs

PRODUCT.md's Tools line says the fill closes small gaps. Nothing on screen changes, so there are no new strings and no vocabulary entry.
