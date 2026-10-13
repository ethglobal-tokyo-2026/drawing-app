# Independent production stabilization review

October 11, 2026. Read-only review of the final production arithmetic, binary64
helper, queue, browser adapter, `InkEngine`, and pressure handling in
`StrokeBuilder`. The reviewer reported findings to the integration author and
reviewed the fixes; the reviewer did not edit those implementations.

## Findings and resolutions

1. **Resize could mix coordinate scales within one stroke.** Queued samples and
   averaging history retained the previous CSS scale, while later input and
   output conversion used the current paper scale. A resize could therefore move
   a horizontal stroke vertically. `LiveStroke.scale` now fixes the coordinate
   basis at pointerdown; `toStrokeCss` rebases subsequent input into that basis,
   and contact/release output conversion uses the same stored scale. The
   regression compares complete committed geometry with and without a resize at
   strengths 0, 4, and 35, including an old-scale sample still waiting for a
   display frame. Reviewed in `inkEngine.ts`, particularly `queue`,
   `toStrokeCss`, `feed`, and `endStroke`.

2. **Filtered pressure could falsely establish pen pressure capability.**
   Constant raw pressure can produce changing averaged pressure after a zero
   landing, and synthetic release records intentionally decrease pressure. Both
   cases could incorrectly change later strokes' starting widths. The reviewer
   reproduced both cases before the fix. `Nib.pressure` now carries raw contact
   pressure; only that value establishes capability. Filtered pressure still
   determines pressure-sensitive rendering, and release records have no contact
   nib. `InkEngine` retains capability after draining contact input and before
   generating release records. Regressions cover the two false-positive cases
   and confirm that a real raw-pressure change still establishes capability.

Both findings are resolved in the reviewed final changes. No further actionable
finding remained within this review's scope.

## Arithmetic and lifecycle checks

- The queue appends pressure-corrected input before averaging, preserves processed
  history when output is suppressed, and limits native history to 1,000 records.
  Constructor/configuration values and append/eviction order were compared with
  `../../evidence/live/digitizer-queue.asm`,
  `../../evidence/live/digitizer-averaging.asm`, and the ingestion description in
  `../../live-analysis.md`.
- Release preserves the supplied pressure for the recovered prefeed, computes
  its repeat count once, submits phase 3, and completes a pending ending with
  zero-pressure input. The recovered wrapper addresses and branch interpretation
  are recorded in `../../live-analysis.md` under caller behavior. Finishing that
  pending ending synchronously is an explicit browser policy.
- Display frames consume actual contact packets without inventing idle packets.
  Packet order, averaged pressure, fractional browser output timestamps, and
  the queue's terminal position are retained. Native timestamp arithmetic uses
  integer milliseconds, obtained by truncating the browser timestamp.
- Invalid input and nonfinite output become `StabilizationError`. The integration
  cancels the uncommitted preview, releases capture when held, preserves earlier
  committed ink, logs the cause, and reports the existing persistent localized
  drawing error. Failure paths for both contact input and terminal flush were
  inspected.
- Averaging history and its per-packet copies are bounded by 1,000 records;
  browser strength is bounded by 100. Release has a bounded prefeed and an
  explicit 2,048-iteration flush bound. Software fused arithmetic uses integers
  whose size is bounded by binary64 exponents. No new unbounded internal loop was
  found. The existing pending event array and stored stroke still grow with
  received input; this review does not claim a fixed memory bound for an entire
  stroke or a measured browser latency limit.

## Independent final verification

The reviewer reran the six focused regression cases after the final fixes:

```text
./node_modules/.bin/vitest run src/sticker-creation/canvas/brush.test.ts src/sticker-creation/canvas/inkEngine.test.ts -t 'capability|unread landing|synthetic release|coordinate basis during resize|invalid packet|failed terminal flush'

Test Files  2 passed (2)
Tests       6 passed | 112 skipped (118)
Duration    3.28s
```

Run from `apps/frontend` on October 11, 2026. The broader final test, build,
lint, native replay, and browser results are separate records in this directory
and the live replay directory; the six-case result above is the independent
reviewer's final verification.

This review establishes the inspected implementation and regression behavior.
It does not establish identical browser/device acquisition, pressure calibration,
rendered pixels, tablet latency, or pen feel in CSP. Production uses an empty
initial hover history, fixed-window stabilization, taper zero, and the existing
Croquis brush renderer. Post correction remains an offline research pipeline.
