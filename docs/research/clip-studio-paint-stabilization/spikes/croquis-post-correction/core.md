# Croquis post-correction core and worker

October 11, 2026. The authoritative implementation is
`apps/frontend/src/sticker-creation/canvas/post-correction/`. The research
`post-*.ts` entry points export those modules so the existing native comparisons
exercise the same functions as the browser. There is one implementation of each
recovered algorithm.

## Input and source construction

`PostCorrectionInput` keeps every completed stabilization output before brush
spacing, with sheet x/y, filtered pressure, browser time, and the recovered output
phase. Array index is the stable source-record identity. Rendered x/y/width/time
records are a separate array. The core never substitutes rendered width for a
native scalar. Magnification, brush size, live stabilization strength, pointer
type, and post settings are captured when contact begins.

Phase 2 begins the source; phase 1 appends a midpoint node; phase 3 constructs the
terminal record and exact terminal node. A native group may close and reopen
during one browser contact when pressure briefly reaches zero. Each complete
group has its own movement, source and correction state. The core rejects a
missing start, nested start or unterminated group rather than treating the last
contact as an ending. A single initial packet and fully stationary packets
preserve the existing tap. Idle phase 1/3 output after a group closes retains its
coordinates without native source dispatch. Group geometries and idle points
stay in their original order, with one complete width/time transfer and one
stroke result. This grouping/preservation policy is a Croquis adaptation.

This distinction follows the retained code: ordinary append caller
`0x10288df54..84` updates movement then calls `0x1028ec548`. Ordinary finalizer
caller `0x1028908c8` passes `w6=1`; `0x1028917ac..814` constructs a fresh terminal
record and updates movement, then `0x102891834..844` calls `0x1028ec8d0`.
The latter allocates the exact terminal node through virtual `+0x30` and does not
append a midpoint first. The queue already returns its adjusted phase; the
adapter now retains it. This mapping does not infer native phase from pressure
or from array position.

The terminal caller excerpt and executable/instruction hashes are saved under
`../post-source/evidence/terminal-caller-*`; the full finalizer is retained at
`../post-contract/evidence/10289148c.asm`. Other native callers pass `w6=0` to
reuse a supplied record; those alternate brush operations are outside the
regular fresh-terminal profile selected here.

The [selected round brush profile](profile.md) uses ordinary open `0x2021`, immediate first-node
import, no scalar fade, no source corner detection, no startup pressure response,
zero angle/offset, and tilt 90. Movement uses the captured live stabilization
strength, Mac platform 2, pen type 4 or non-pen type 1, the magnification fraction,
and identity coordinate/document conversion factors. The October 11 recording
confirms these neutral source/input settings for the selected mouse brush;
using browser pen packets, current sheet magnification, and the live strength
remains the explicit Croquis adaptation. Endpoint processing now uses that
brush's observed immutable response configuration: main flags 17, its four-point
pressure curve and exact binary32 minimum, secondary disabled, and adjustment
mode 1. Its path parameter remains half the current Croquis brush size. This
replaces constructor defaults without changing the recovered evaluator math.

## Rendering attributes

The corrected spline is sampled directly by the recovered sampler, with a
Croquis density of half a CSS pixel converted to sheet units. No second curve
fit runs. The existing recovered sampler's 256-sample per-segment bound remains.

Width and elapsed time transfer from the existing rendered stroke by normalized
cumulative path distance. First and last width/time remain exact; interior
elapsed times are rounded and nondecreasing. A zero-length source uses record
order, and a zero-length corrected path uses sample order. A single corrected
position receives two coincident records when needed to preserve both endpoint
attributes and full duration. This is Croquis rendering behavior, separate from
native node scalar reconstruction and native brush rendering.

The public worker check of `d229c59e` found four one-ULP WebKit width differences,
while geometry, times, and endpoint widths agreed. The isolated
[attribute-distance probe](../post-joined/evidence/attribute-distance-20261011/README.md)
reproduced the discrepancy using the same adapter and traced it to `Math.hypot`.
Main follow-up `b6128209` replaces only the two transfer-distance calls with
`scale * sqrt((dx/scale)^2 + (dy/scale)^2)`, where scale is the larger absolute
delta; zero and nonfinite values preserve the explicit existing paths. This
scales before squaring and fixes operation order. It does not change recovered
CSP geometry, scalar response, endpoint equations, or sampled coordinates.
Cross-engine regressions failed before the change and passed afterward; final
verification is recorded in [delivery-20261011.md](../post-joined/delivery-20261011.md).

## Bounded execution and failure

The pure core accepts at most 10,000 completed packets, at most 10,000 working
nodes, one million source checks, and 50,000 sampled points. It checks an
800-millisecond processing deadline. These are browser limits, not recovered
native constants. Nonfinite geometry, unsupported phases/settings, and exceeded
limits throw `PostCorrectionError`; they do not return partial geometry.

`PostCorrectionService` creates a worker only when correction is requested. Each
request has an increasing ID and its own disposable worker. A one-second elapsed
deadline includes worker startup and message transfer. Abort and disposal
terminate pending workers; stale IDs are ignored. Success and failure also
terminate their worker and remove timers/listeners. Progress messages report
stage and node counts in the browser console. Returned flat point arrays are
validated for finite positions, nonnegative widths/times, complete records,
bounded count, and nondecreasing time before resolving.

The response shapes are `{id,type:"progress",progress}`,
`{id,type:"complete",points}`, and `{id,type:"failure",message}`. The engine owns
retaining the original ink and presenting a persistent error if correction fails.

## Verification scope

The focused core/service tests cover direct spline sampling, input ownership,
source phase order, stationary/disabled paths, invalid input, exact endpoint
attributes, width/time interpolation, lazy worker creation, request IDs, abort,
timeout, disposal, malformed returned geometry, and retained failure details.
The terminal-phase regression was observed failing before the core change.
Fourteen focused tests and scoped type-aware lint passed after the final
multiple-group and idle-output changes. Independent review additionally checked
24 actual queue sequences and six malformed phase sequences.

The retained native source operations, scalar preparation, post geometry, and
endpoint evaluator comparisons continue to exercise the production modules
through the research entry points. Those comparisons establish their stated
instruction and fixture scope. They do not establish identical acquisition,
native brush rendering, or pen feel for arbitrary browser devices.
