# Croquis live stabilization integration

Croquis uses the reconstructed CSP live queue in place of its former One Euro
filter. The existing Smoothing control stays 0–100 with default 35, mapped
directly to stabilization strength. The integrated mode is fixed, with taper 0.
The recovered speed modes remain available in the arithmetic/queue but are not
additional Croquis controls. Post correction is now integrated separately;
see the [current post-correction report](../croquis-post-correction/README.md).

## Authoritative implementation

- [arithmetic.ts](../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts): addressed configuration, window adjustment, fractional averaging, pressure, phase and emission calculations.
- [binary64.ts](../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts): correctly rounded software fusion at the recovered fused instructions only.
- [queue.ts](../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts): browser-safe queue, also used by native-capture replay.
- [stabilizer.ts](../../../../../apps/frontend/src/sticker-creation/canvas/stabilizer.ts): browser acquisition and bounded release adapter.
- [inkEngine.ts](../../../../../apps/frontend/src/sticker-creation/canvas/inkEngine.ts): ordered contact delivery, emitted records, preview, release and persistent failure reporting.

There is one arithmetic implementation and one ingestion implementation. Native
replay seeds that queue from retained native state; a browser stroke initializes
it from its first contact. The old filter is removed.

## Browser adaptation and confidence boundary

The native Mac producer uses converted screen coordinates and integer
milliseconds. Croquis uses local CSS coordinates, truncates event timestamps to
integer milliseconds for queue decisions, and preserves the original event time
in emitted records. The queue interval is 0, as in the retained tablet sequences.
Every coalesced contact packet is processed in order, including suppressed outputs.
Display frames do not invent packets.

Each stroke retains its starting CSS-to-sheet scale. If the paper moves or
resizes, subsequent events are mapped through the current paper transform into
that same original scale; queued samples and averaging history keep one basis.
Output is converted to sheet coordinates afterward. This prevents a resize from
reshaping an unfinished stroke.

The queue averages both position and pressure. Device pressure-capability
detection uses raw contact readings; changing filtered or synthetic terminal
pressure is not evidence that a device senses pressure. The existing Croquis
width response, curve rendering, spacing and visual taper remain downstream.
Mouse/touch contact uses control pressure 1 so absent pressure sensing does not
prematurely end the queue.

Release follows the recovered prefeed and phase-3 processing, then completes a
pending ending with bounded zero-pressure packets. All emitted records retain
the actual lift time. Geometry ends at the last emitted position rather than
being forced to the raw pointer. Native geometry-based completion can retain
positive terminal pressure. A 2,048-packet browser safeguard throws on failure;
the app drops the uncommitted preview, releases capture, preserves earlier ink,
and reports a persistent localized error.

Browser acquisition, an initially empty hover history, synchronous release
completion, and Croquis's renderer are application choices. Two complete native
sequences match all compared queue fields exactly (S20/T0: 311 included calls;
S0/T0: 115). This proves those recorded sequences through the shared core, not
all settings, browser-to-CSP event identity, pixel identity or subjective feel.
No additional manual capture was needed for this integration.

## Performance evidence

[benchmark.ts](benchmark.ts) measures the actual production adapter, with 2,400
ordered packets representing 10 seconds at 240 Hz, at strengths 0, 20, 35 and 100.
Its deadline is 30 seconds. It reports every run without removing outliers.

Across the three `benchmark-20261011*.json` reports on the Apple M5 Max, median
packet processing was 0.0017–0.0046 ms, p95 at most 0.0115 ms, and release
0.082–1.275 ms. The first run included a 75 ms packet / 83 ms four-packet outlier;
the two repeats reached about 5.18 / 5.20 ms. The cause of that first pause was
not established. These are host Node measurements of filtering only, excluding
rendering, event delivery and device latency. They are not iPad or Safari
performance measurements and do not guarantee a maximum frame time.

## Verification records

[verification.json](verification.json) records check results, failure resolutions,
the original executable fingerprint, and hashes of the current implementation,
tests, native captures and supporting evidence.

The adjacent text reports retain frontend checks, including failed attempts and
subsequent focused reruns. The [research result](../post-pipeline/evidence/combined-research-tests.txt)
contains 201 passing tests, including native live queue comparisons and the
complete post-correction case. Independent review covered queue ordering,
release, work limits, error cleanup, coordinate resizing and pressure inference.

Final [drawing tests](frontend-final-focused.txt) pass 273 tests across 10 files.
The [browser run](pencil-browser-tests-final.txt) passes all 12 Pencil cases in
Chromium and WebKit, including constant versus varying pressure, smoothing,
idle frames, release, hovering, input-mode controls and palm rejection. These
are automated browser inputs, not a physical tablet feel comparison.

The final [production build](frontend-final-build.txt), including TypeScript
checking, and [type-aware lint](frontend-final-lint.txt) pass. The
[independent review](independent-review.md) records the two integration findings
and verifies their fixes. The final live-only replay rerun passes 93 tests,
including both native recordings through the shared production queue.

The initial full frontend run passed 2,474 tests and failed five: two newly
added pressure regressions were still in their deliberate failing stage, and
three failures came from the board/timelapse tests. The pressure regressions
pass in the final drawing suite; both unrelated files pass all 17 tests in an
[isolated rerun](frontend-unrelated-recheck.txt) without source changes. This is
not reported as a clean full-suite execution. The initial browser attempt
could not start its localhost API under the sandbox (`listen EPERM`); the
approved local-server/browser run above completed successfully.

The historical [Croquis source audit](../../croquis-integration.md) describes the
previous filter and renderer as of October 9. The updated
[synthetic replay](../croquis-replay/README.md) exercises the current classes;
historical measurements remain labeled by their original implementation.
