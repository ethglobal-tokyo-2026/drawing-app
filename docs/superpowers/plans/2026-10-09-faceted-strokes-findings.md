# Faceted strokes: findings

**Status:** research done 2026-10-09; the fix is in progress (Smoothing rebuild lane). Delete once that lands.

## Symptom

Curves drawn fast with a mouse are chains of long straight segments; on an iPad with Apple Pencil, micro-jags even at full Smoothing.

## Causes, by evidence (main a2f3f809)

1. **No curve between samples.** `StrokeBuilder.add` (`canvas/brush.ts`) stores each pointer sample once it is `MIN_STEP` from the last point; `paintStroke.ts` joins consecutive points with one straight capsule. Live ink, undo/replay, the prediction overlay and the timelapse all use `paintStroke`, and the seal is cut from the ink, so sealed stickers keep the facets. A facet's length is speed ÷ sample rate: a 60 Hz mouse on a fast circle gives 8–33 px sides.
2. **Smoothing is a pulled string (`lazyBrush.ts`).** It aims straight at each sample, so it keeps one point per sample and never curves. At Smooth it collapses small loops and ends each stroke with a straight catch-up tail (about 27 units). A Pencil's string (`PEN_TRAIL_SHARE`) is only 2 units at Smooth, too short to remove jitter.
3. **Whole-pixel coordinates in WebKit (likely, unverified on device).** Playwright's WebKit delivered whole-px mouse coordinates; Safari before 26.2 rounds pointer coordinates. Whole-px input at 240 Hz turns a Pencil stroke into a staircase (simulated turn p50 45° at Raw against an ideal 1.2°).
4. **Not a cause: lost samples.** `inkEngine.ts` reads `getCoalescedEvents()` for every pointer type and feeds every queued sample to the builder. Coalesced events need a secure context, so an `http://<LAN IP>` origin falls back to one sample per frame.

## Simulated numbers (real `LazyBrush` + `StrokeBuilder`, perfect circle, second turn)

| Circle, speed     | Rate   | Segment, Raw / default / Smooth (units) | Turn per point |
| ----------------- | ------ | --------------------------------------- | -------------- |
| R40, 503 units/s  | 60 Hz  | 8.36 / 8.14 / 4.92                      | 12°            |
| R40, 503 units/s  | 240 Hz | 2.09 / 2.06 / 1.35                      | 3°             |
| R60, 1131 units/s | 60 Hz  | 18.77 / 18.39 / 14.86                   | 18° (a 20-gon) |

## The fix

- A centripetal Catmull-Rom curve through the samples, with capsules laid along it at a small fixed spacing, built into the stored stroke so existing timelapses replay unchanged.
- Smoothing as a speed-aware moving average (Procreate, Krita), with no dead zone, catching up on a pause and ending at the lift point.

## Sources

- https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents
- https://developer.chrome.com/blog/aligning-input-events
- https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
- https://github.com/steveruizok/perfect-freehand
- https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings
- https://docs.krita.org/en/reference_manual/tools/freehand_brush.html
- https://webkit.org/blog/17640/webkit-features-for-safari-26-2/
