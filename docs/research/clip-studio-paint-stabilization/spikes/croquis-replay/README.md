# Croquis replay with the shared stabilization queue

These scripts replay the existing synthetic fixtures through the current
`Stabilizer`, `StrokeBuilder`, `StrokeCurve`, and `InkEngine`. The browser adapter
now uses the shared reconstructed CSP queue. The separate fixed-helper rows
isolate window growth and fractional averaging without release processing.
This maintenance changes research scripts only. Historical outputs in `results/`
remain untouched; they describe the removed One Euro implementation and older
canvas API, not the current application.

## Reproduce

From the repository root, using installed frontend dependencies and Chromium:

```sh
mkdir -p '/Users/adoll/Applications/CSP Research/outputs'
csp_croquis_output=$(mktemp -d '/Users/adoll/Applications/CSP Research/outputs/croquis-replay.XXXXXX')
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/research/clip-studio-paint-stabilization/spikes/croquis-replay/replay.mts "$csp_croquis_output"
node docs/research/clip-studio-paint-stabilization/spikes/croquis-replay/pixels.cjs "$csp_croquis_output"
```

Both scripts resolve imports relative to this directory and refuse to overwrite
their output files. Without an output argument each creates a distinct dated
directory beside the scripts. The geometry replay checks a 180-second work
deadline. Browser launch, page operations, and pixel evaluation have 20-second
bounds. The retained runs additionally used outer process deadlines of 200 and
60 seconds. Nothing is installed; no CSP process or product server is started.

macOS blocks Chromium's process communication in the filesystem sandbox
(`bootstrap_check_in ... Permission denied (1100)`), so the pixel run needs
scoped browser-process permission. Its generated page uses an intercepted local
origin for application language storage; it does not fetch a website or use a
personal browser profile. The tsx loader avoids the tsx CLI's IPC socket.

## Fixtures and current behavior

Each fixture lasts two seconds, includes both endpoints at 60, 120, and 240 Hz,
and increases reported contact pressure from 0.2 to 0.8. Positions are three
straight lines at 12, 180, and 600 units/second; 12 Hz vertical jitter; a right-angle
corner; a circle; acceleration; and a stationary pressure ramp.

Current filter labels are `raw`, `queue_S35_T0`, and `queue_S100_T0`. They use the
actual browser adapter with its direct 0–100 strength, fixed mode, taper zero,
empty starting history, and zero-millisecond output interval. Position and
pressure are filtered together. The adapter can return zero or multiple points;
the runner consumes its output array and uses its last emitted position.
Engine fixtures explicitly set post-correction strength to zero, so these runners
continue to test live stabilization and rendering after the post-correction
service was added. Retained reports below identify their own source hashes and
were not overwritten by that interface maintenance.

The three diagnostic arithmetic rows remain `fixed_S4_T0`, `fixed_S12_T0`, and
`fixed_S24_T12`. They call the authoritative `configureLiveQueue`,
`adjustFixedWindow`, and `averageFractionalHistory` helpers. They exclude pressure
extrapolation, phase/gating behavior, motion modes, and terminal processing, so
their labels do not claim to be complete queue configurations.

Native queue timestamps and this adapter use integer milliseconds. The runner
truncates synthetic fractional times for queue arithmetic and retains each
original browser timestamp on emitted samples. The synthetic cadence is not a
captured tablet stream. Croquis's engine filters local CSS coordinates before
converting to sheet units; the direct geometry fixtures use numeric unit scale
one. CSP spatial-unit correspondence remains outside this test.

Release supplies pressure zero at the actual lift time. All terminal outputs
retain that time, and the builder settles at the last emitted queue position,
which need not equal the unfiltered pointer. Native movement-based ending can
retain positive pressure, so the report records terminal pressure rather than
asserting zero universally. Empty display frames add no input packets.

The direct builder uses pen pressure response Off to isolate geometry; engine
delivery checks use normal pen pressure. The additional unspaced `StrokeCurve`
isolates accepted-point spacing from curve lookahead. Measurements concern the
last emitted centerline point, not brush edges, rendering latency, or pen feel.
Only constant-speed straight-line gaps are converted to delay equivalents.

## Current verification

The final [validation report](results-shared-core-20261011/final/validation.json) records:

```text
sample_rows: 40464
summary_rows: 144
engine_batch_checks: 504
engine_batch_failures: 0
raw_bypass_rows: 6744
analytical_fixed_window_checks: 9
```

All 504 finalized engine operations match across nonempty frame groups of 1,
2, 4, and 8 input samples, delivered as distinct or coalesced events. Adding
400 ms of empty frames leaves the operation identical and the final stored
timestamp at 2000 ms. All 72 complete-adapter fixture releases use no synthetic
time extension; their emitted release counts span 1–100 and terminal pressures
span 0–0.16201973165493083.

Recovered fixed S=12/T=0 retains its analytical 5.5-sample steady delay:
91.667, 45.833, and 22.917 ms at the three packet rates. At 120 Hz on the slow
straight line, current queue S=35 averages 141.584 ms of raw-to-filter delay plus
60.012 ms of filter-to-builder gap; S=100 averages 319.562 plus 64.008 ms. Those
are fixture observations, not tuning targets or a claim of identical CSP feel.

Full samples, summaries, fixtures, batching cases, and source hashes for the final
source state are preserved in [the final run](results-shared-core-20261011/final/).
Earlier successful runs and failures remain in
[results-shared-core-20261011](results-shared-core-20261011/).
The original broken-import failure and an invalid universal zero-terminal-pressure
assumption are retained separately. The latter was corrected without changing
the shared queue arithmetic.

## Pixel boundary

`pixels.ts` now uses the actual `LayerInk` and `LayerDisplay` APIs. It reads
committed layer pixels after the existing brush/eraser fixtures and compares
every RGBA channel against replay of the finalized operation. It also repeats
the existing synthetic middle-point correction with a layer hold/restore and a
negative control that paints over old ink. This is not an execution of the
separate reconstructed post-correction pipeline or a display screenshot test.

Current assertions require both tools' committed-layer replay equality,
hold/restore correction equality, and unequal negative controls. The earlier
eraser mismatch is historical: the current layered engine paints the whole
operation on commit. The final [pixel results](results-shared-core-20261011/final/pixels.json)
have zero differing channels in all four equality checks, each comparing
1,119,008 channels. Both negative controls differ as required. Source provenance
is saved beside the report; earlier failed launch attempts remain preserved.

## Historical baseline

The old [validation](results/validation.json), [summary](results/summary.csv),
[pixel results](results/pixels.json), and [provenance](results/provenance.json)
are unchanged. Their `one_euro_*` labels, positive synthetic time extension,
idle-frame behavior, and older eraser mismatch apply only to those recorded
checkout hashes. They must not be presented as current behavior.

The original full measurements and bundle remain in the
[workstation-local archive](/Users/adoll/.codex/visualizations/2026/10/09/01a122b3-7708-7ef1-ae40-18592e2c60ab/csp-croquis-replay-artifacts.zip);
[archive.json](results/archive.json) records its hash and contents.
