# Croquis post-correction integration

Croquis now has a separate **Post correction / 後補正** control in Smoothing. It
reshapes a completed stroke after lift using the reconstructed ordinary CSP
source and correction routines. Live stabilization uses the recovered queue
with fixed, slow-drawing, and fast-drawing choices for pen input. Fixed is the
default, and post correction starts off.

This is a usable implementation of the selected ordinary open-path profile.
It does not claim identical CSP acquisition, every brush configuration, native
rasterization, or identical subjective pen feel.

Feature `d229c59e` is merged, pushed, and deployed. The public check led to a
Croquis-only attribute-distance fix on main `b6128209`, now deployed and publicly
verified at https://stickeroo.art/. The [delivery record](../post-joined/delivery-20261011.md)
retains the exact revisions, checks, and original failed report.
Four [joined native comparisons](../post-joined/native-validation-20261011.md)
now match all recorded upstream, source, and post fields for the selected profile.

## Controls

| Control                              | Behavior                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Smoothing / 手ぶれ補正               | Existing live strength 0–100; default 35. Taper remains zero.                                |
| Pen speed / ペン速度                 | Fixed (default), Adjust for slow drawing, or Adjust for fast drawing. Pen input only.        |
| Post correction / 後補正             | Croquis integer strength 0–40; 0 disables it. This is not CSP's configurable five-bar index. |
| Adjust by speed / 速度による調整     | Uses the recovered movement scalar in source-segment tolerance. Starts off.                  |
| Adjust by scale / 表示倍率による調整 | Uses recovered magnification scaling of correction tolerance. Starts on.                     |

The speed choice applies while drawing. The recovered slow branch applies at
strengths 0–30; above 30 it uses fixed behavior. The fast branch applies from
strength 3; below 3 it uses fixed behavior. The selected option's English and
Japanese help states these limits. Mouse and touch retain fixed behavior because
their native producer routes differ from the digitizer route reconstructed here.
Each stroke captures its speed choice at the start.

The two switches apply to post correction, independently of the live speed
choice. Closed paths and the alternate Bézier source mode are outside this
integration. A kept drawing retains the live speed choice and all three post
settings. Older kept drawings without them resume with fixed live behavior and
post correction off.

## One authoritative implementation

Production code is in
`apps/frontend/src/sticker-creation/canvas/post-correction/`. Research
`post-*.ts` entry points re-export the corresponding production modules, so the
native comparisons exercise the code used by the worker.

| Adjustment or calculation                                           | Authoritative file                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Live queue, averaging, release, pressure and phase                  | `canvas/stabilization/queue.ts`, `arithmetic.ts`, and `canvas/stabilizer.ts`        |
| Native float operation order and exact fused arithmetic             | `canvas/stabilization/binary64.ts`                                                  |
| Strength, magnification and removal tolerance formulas              | `post-correction/reference.ts`                                                      |
| Movement history, timestamps, pressure/startup record construction  | `post-correction/input.ts`, `input-table.ts`                                        |
| Start, midpoint and terminal quadratic source construction          | `post-correction/source.ts`                                                         |
| Quadratic/spline evaluation, conversion, lengths and sampling       | `quadratic.ts`, `spline.ts`, `spline-context.ts`, `spline-length.ts`, `sampling.ts` |
| Node-removal orchestration and endpoint changes                     | `pipeline.ts`, `endpoints.ts`, `evaluator.ts`                                       |
| Captured round brush profile, native groups and width/time transfer | `profile.ts`, `core.ts`                                                             |
| Worker protocol, deadlines and cancellation                         | `service.ts`, `worker.ts`, `protocol.ts`                                            |
| Stroke lifecycle, layers and history                                | `canvas/inkEngine.ts`                                                               |

For example, the settings reader computes tolerance as `0.1 * (k*k)` for the
supported nonnegative strength range. When zoom adjustment is enabled it
multiplies that result by `1 / (magnificationPercent * 0.01)`. It preserves the
original sequence of operations. This is only the initial tolerance; the
source-segment tests, scalar bounds, removal passes and endpoint rules also
determine the final geometry. Changing a formula deliberately requires new
expectations for that change; the pinned native fixtures must remain preserved
as the reference behavior.

## Input and rendering contract

The engine retains every emitted stabilization packet before brush spacing:
sheet coordinates, filtered pressure, timestamp and actual recovered phase.
Phase 2 begins a source, phase 1 adds a contact, and phase 3 ends that source.
Pressure can close and reopen native groups during one browser contact. Each
complete group receives fresh movement/source/correction state, while Croquis
keeps a single committed stroke and undo action. Idle emissions outside a group
are preserved as coordinates without inventing a new native source. Combining
those geometries is an explicit Croquis adaptation.

The profile is open `0x2021`, immediate first-node import, no scalar fade or
corner callback, zero offsets/startup/orientation, and inclination 90. Movement
uses the captured live stabilization setting, pen device type 4 or other input
type 1, Mac platform 2, displayed sheet scale, and identity external coordinate
and document factors. Endpoint evaluation uses the immutable
[captured round brush configuration](profile.md) and half the brush diameter
in sheet units. Native joined observations establish the selected neutral
source/input values and resolved response fields; browser device adaptation
and sheet-unit conversion remain explicit Croquis choices. The input-brush
cache/copy operation is not replayed, and this profile is not a universal CSP
default.

Corrected splines are sampled directly at a target half CSS pixel spacing,
subject to the recovered sampler's 256-point segment limit. There is no second
curve fit. Croquis transfers its existing widths and elapsed times by normalized
cumulative distance, preserving both endpoint attributes and monotonic playback
time. This preserves Croquis's brush response; it is not CSP brush rendering.
The distance uses explicitly ordered scaled arithmetic after WebKit's
`Math.hypot` rounding caused four one-ULP width differences in the public smoke
test. The recovered CSP geometry and scalar equations are unchanged.

## Completion, interruption and failure

Correction runs in a disposable worker after natural lift; the original preview
stays visible until completion. A successful result commits exactly once.
A new stroke, history/layer operation, export, sealing, suspension or disposal
cancels pending work and commits the original once before proceeding. Late
responses cannot overwrite it. Pointer/touch cancellation does not start a
correction.

The core has an 800 ms processing deadline and the service has a one-second
elapsed deadline, including startup/transfer. Limits include 10,000 input
packets/working nodes and 50,000 sampled points; grouped paths share the limits.
Worker or correction failure retains the original ink and shows a persistent
localized error. If saving/displaying the original also fails, the existing
canvas error takes precedence; the UI does not falsely say that ink was saved.

## Evidence and confidence

- [Source construction](../post-source/README.md): 520 independently executed native node-construction cases. Source dispatch and orchestration are statically reconstructed and separately tested.
- [Input records and movement](../post-input/README.md): 6,240 native cases, including timestamps, lookup interpolation and binary32 imports.
- [Endpoint evaluation](../post-evaluator/README.md): 680 native response/evaluator cases, including short-endpoint behavior under explicit configuration.
- [Selected profile oracle](../post-evaluator/evidence/selected-profile-20261011T2345/README.md): another 1,530 exact binary64 outputs using the actual captured response configuration, 90 synthetic retained pressures, and 16 endpoint parameters. These are standalone instruction executions, not tablet recordings.
- [Joined native validation](../post-joined/native-validation-20261011.md): four automated mouse captures match constructed records, movement state, source nodes and post result; three zoom levels, two brush sizes, speed adjustment off/on. The shortest reaches both modeled endpoint decisions and retains the endpoints as native output does.
- [Complete retained correction](../post-pipeline/README.md): the captured 99-node ordinary input becomes eight spline nodes with all compared native fields matching exactly.
- [Exact arithmetic performance](../post-performance/README.md): 202,744 native fused-operation comparisons; saved-case processing reduced from about 7.85 seconds to 211–316 ms on this Mac. Pure Chromium/WebKit correction took 162–303 ms. These timings exclude worker startup, source construction and rendering, and do not establish physical iPad performance.
- [Live speed arithmetic](../post-runtime-profile/evidence/live-modes-comparison.json): 450 native configuration/window cases match exactly, including 24 subunit slow-window cases. A separate production probe completes 909 contact sequences (43,632 ingestions) without failure. Those synthetic inputs test arithmetic and supported queue states; they are not additional native stroke recordings or release comparisons.
- [Core contract](core.md) and [independent integration review](integration-review.md) describe adapter behavior and resolved findings.

The historical 99→8 post fixture starts at already-constructed source nodes.
The four new joined recordings separately supply observed upstream inputs and
resolved evaluator configuration. They use pressure one and ordinary Bézier-off
correction; they do not observe actual endpoint deletion or variable-pressure
joined behavior. The two retained tablet sequences independently match the live
queue through release. None of these observations proves identical operating-system
event delivery, rendering, cache/copy selection, or pen feel.

## Validation before the live speed controls

The initial integration checks and source/evidence hashes are recorded in
`verification.json`; complete test output is retained under `evidence/`.
No new debugger attachment or manual recording was used for that integration
stage. Later joined-comparison preparation is reported separately.

That stage passed **2,522 frontend tests**, **227 research tests**, strict
research TypeScript, frontend type-aware lint, and the production build.
Chromium and WebKit both completed corrected brush/eraser strokes whose full
pixel hashes matched after undo/redo. The English iPad and Japanese phone
panels were inspected; their screenshots are retained in `evidence/`.

All 12 existing Pencil browser cases passed in the first run. The four new
cases initially failed because the test read a zero-size backing canvas and
set Japanese only on the device while account settings retained English.
Those test-setup errors were fixed. Three new cases then passed; the remaining
WebKit case timed out before its canvas became visible, before correction ran.
Its isolated rerun passed without an application change. Thus all 16 cases
passed across the recorded runs, not in one clean run. An initial full unit
run also overlapped the deliberately failing phase regression; the final full
run above was clean. Strict-type and lint findings in the new test helpers were
fixed and rechecked.

## Live speed control validation, October 11

The live-speed full frontend run passed **2,541 tests across 252 files**; its complete
output is retained in
[frontend-tests-speed-20261011.txt](../post-joined/evidence/frontend-tests-speed-20261011.txt).
The focused adapter, engine, kept-session, drawing-screen, panel, and pressure
tryout run passed 293 tests. TypeScript, scoped type-aware lint, and formatting
checks also passed. Coverage includes native first-move expectations, release
and zero-pressure restarts, immutable stroke settings, resize handling, pen-only
selection, saved choices, and the fixed default for older sessions.

Four speed-choice browser cases passed in one Chromium/WebKit run, covering
English and Japanese, panel bounds, drawing through release, and the retained
selection. The Safari tap target initially measured 24.15625 CSS pixels because
the native select ignored `min-height`; an explicit height fixed it, and the
regression now requires at least 44 pixels. Eight reviewed screenshots are
retained as `evidence/live-speed-{en,ja}-{slow,fast}-{chromium,webkit}.png`.
These controls use the existing recovered math; no new native recording was
made for their implementation.

After adding the selected captured profile, the isolated release candidate
passed **2,545 frontend tests across 253 files**. After integration and the
attribute-distance fix, the final run passed **2,567 tests across 254 files**,
all **22 Chromium/WebKit cases**, type/lint/format checks, and production build.
Final deployed verification passed: five public assets match the build byte for
byte, and light/firm worker output bits match in Chromium and WebKit. The smoke
used anonymous synthetic requests and saved no real artwork; see the delivery record.

Browser tests now write screenshots through Playwright's `testInfo.outputPath`.
Selected run artifacts are copied into local evidence with manifests; tests no
longer write directly into the research tree.

The next human check is ordinary drawing in Croquis with the new controls.
Its purpose is to choose useful settings and assess feel. It is not required
to complete the already retained arithmetic comparisons.
