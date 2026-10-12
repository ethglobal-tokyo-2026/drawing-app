# CSP Bézier Post-Correction Specification and Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` when the user resumes implementation. Steps below use checkboxes for tracking. This request authorizes static analysis and this written handoff; implementation and runtime captures are deferred by the user until after their video recording.

**Goal:** Add an optional Bézier curve mode to Croquis's existing post correction, reproducing CSP 5.1.4's selected ordinary open-stroke Bézier branch with independent numerical evidence.

**Architecture:** Reuse the existing stabilized packets, selected brush profile, quadratic source construction, exact arithmetic, correction worker, and stroke lifecycle. Implement CSP's separate `PWVectorSampleBezier` processing and sample its quadratic output directly. Continue using Croquis's existing rendered width/time transfer.

**Tech Stack:** TypeScript, React, Vitest, Playwright, Python static Mach-O inspection, and future standalone ARM64 instruction comparisons. Repository runtime: Node 24.21.0 and pnpm 12.6.0.

**Spec:** This file is both the feature specification and its ordered implementation handoff. Addressed analysis and private evidence are linked below.

## Intent and current state

The user wants the actual CSP correction behavior and concrete instructions another coding agent can execute. They want to close CSP for video recording now. No CSP launch, debugger attachment, stroke capture, instruction execution, product code change, or deployment was performed for this specification.

Ordinary spline post correction and live stabilization are already shipped at feature revision `b6128209b6490c3c0b1a265e312f2b7d780dd582`. The shared checkout was at `c1a6368ed09ef23f0d4f3e6cf314ecd4a151f6c6` during this analysis and contains unrelated unfinished work. The previous CSP implementation worktree was removed after release; do not use its old path. Start later implementation from the then-current main branch in an appropriate isolated worktree, preserving unrelated changes.

Post settings currently default to strength `0`, adjust by speed `false`, and adjust by scale `true`. Both adjustment controls already ship. Bézier mode is the sole new user option in this specification; it defaults to `false`.

## Product behavior and scope

- Add “Bézier curve” / “ベジェ曲線” under the existing Post correction controls. Disable it when post strength is zero. Persist it with the other drawing tools and capture it when a stroke begins.
- With the option off, preserve the existing ordinary spline result. With it on, correct the completed freehand stroke using the reconstructed native Bézier algorithm. The artist still draws normally and lifts the pen; no manual control-point editing is introduced.
- Apply the existing strength, speed, and scale settings through this branch's actual native arithmetic. Preserve the existing strength range `0..40`; do not infer or expand it from CSP documentation alone.
- Retain one stroke and one undo action, layer ordering, eraser behavior, export, Merge down, sealing, and correction cancellation. Failed correction retains the original ink and its persistent error.
- Initial scope is the selected round brush's open quadratic source, zero closure/mode argument, neutral orientation/offset, and supported scalar/flag values established by Task 1. This is not every CSP brush configuration.
- Explicitly closed paths, the nonzero closure/mode branch, native brush rasterization, editable vector tools, and additional live stabilization modes are outside this expansion. Reconstructing the entire CSP brush renderer is not the intended deliverable. Cached geometric bounds used by this algorithm do need a correct contract.
- Native fidelity means exact compared coordinate/control binary64 bits, scalar binary32 bits, flags, ordered adjacency, and retained endpoint/path fields in independently recorded supported cases. Browser consistency and app tests are separate evidence. Natural pen feel and universal CSP equivalence remain distinct claims.

## Global constraints

- Use the authoritative production modules under `apps/frontend/src/sticker-creation/canvas/post-correction/`; research entry points must reuse that implementation rather than retain a second algorithm.
- Comments, code, and documentation use American English and the project's vocabulary. User-facing strings belong in `apps/frontend/src/i18n/strings/stickerCreation.ts`, with Japanese translations and the required one-line screen/interaction comments.
- Preserve observed FMA, separately rounded operations, signed conversions, binary32 narrowing, strict/inclusive comparisons, candidate order, and tie behavior. A generic curve fitter or shape simplifier is not an acceptable substitute.
- Inputs, arithmetic, and original-instruction comparisons use the documented finite domain and FPCR zero. Reject unsupported conditions explicitly; never return an unmarked partial match or silently fall back to the spline mode.
- Preserve operational bounds: 10,000 packets, 10,000 working nodes, 1,000,000 geometry checks across groups, 50,000 sampled points, 800 ms core deadline, and 1,000 ms worker service deadline. Charge Bézier traversal/projection work against those bounds; report progress and persistent failures.
- Saved evidence is outside temporary storage. Never use historical `/tmp` paths as required inputs or overwrite old captures/reports.
- Raw captures, extracted instructions, original executables, and native probes stay local. Publish only the intended production source and portable tests when the later release is authorized.

## Static evidence and newly resolved facts

Pinned reference: `/Users/adoll/Applications/CSP Research/original-arm64`, CSP 5.1.4 ARM64, SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. This is targeted disassembly and our reconstruction, not CELSYS's source code.

Research root: `docs/research/clip-studio-paint-stabilization/spikes/post-bezier/`.

This handoff uses the preserved local research workspace. Earlier linked evaluator, quadratic, sampling, and capture-contract notes remain local research dependencies outside the scoped Bézier commit, and the original image remains at the absolute path above. A fresh clone alone does not contain every research input. Preserve those existing files when handing this task to another agent; the current local verification checks their presence.

| Operation              | Original address             | Concrete finding                                                                                                                                  |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared dispatch        | `0x1028ed064`                | Setting `0x482` selects the separate Bézier class; it receives `r = convertedTolerance * binary64(0.1)`.                                          |
| Constructor and entry  | `0x102785dd4`, `0x102785e94` | Requires quadratic source bit `0x20`; records speed, mode, scale, source, and destination.                                                        |
| Orchestration          | `0x102785f40`                | Ordered source advancement, candidate emission, midpoint anchor adjustment, bounds refresh, then scalar preservation.                             |
| Candidate acceptance   | `0x102786094`                | Small stateful candidate deque, coordinate-wise duplicate tests, corner classification, and exact emission tuples.                                |
| Next span              | `0x102786564`                | Uses interior controls and endpoint positions; backward deviation tests, corner stops, and a 200-candidate cap.                                   |
| Representative point   | `0x102786808`                | Raw position at endpoints; quadratic stored control for an interior node.                                                                         |
| Emission               | `0x1027868ec`                | Samples/imports records, averages selected fields, changes the old tail's control, and consumes pending corner state.                             |
| Anchor setter          | `0x10276b004`                | Scales by 1,000,000, adds the exact signed offset `±0.5006551742582054`, truncates to signed 64 bits, then scales by `0.000001`.                  |
| Final scalar pass      | `0x10278672c`                | Preserves the transformed primary brush-response scalar using projection, insertion, or a maximum update; this is not ordinary endpoint trimming. |
| Scalar transfer        | `0x102786a98`                | Searches within `10*r`, attempts segment insertion with separation 1, then falls back to a scalar maximum.                                        |
| Bounded nearest search | `0x102782054`, `0x102781eb0` | Integer path/node bounds gate projection; strict improvement keeps the first candidate on ties.                                                   |
| Quadratic projection   | `0x102764e0c`, `0x10359cc94` | Endpoint early-outs, then native sampled projection at density 4.                                                                                 |
| Split and bounds       | `0x10276dec8`, `0x10276b2c4` | Segment splitting and cached bounds maintenance are observable dependencies of the scalar pass.                                                   |

The original three missing helper bodies are now retained and analyzed. This work adds 31 bounded function extracts with original-byte and assembly hashes, exact memory literals, and quadratic vtable targets. It does not add an executed Bézier implementation or a native Bézier-on recording.

Read these notes before implementing:

- [Dispatch, operation order, and unusual coordinate quantization](../../research/clip-studio-paint-stabilization/spikes/post-bezier/analysis/orchestration.md).
- [Candidate state transitions and emission](../../research/clip-studio-paint-stabilization/spikes/post-bezier/analysis/candidate-acceptance.md).
- [Span advancement, scalar preservation, projection, and remaining bounds contracts](../../research/clip-studio-paint-stabilization/spikes/post-bezier/analysis/advance-cleanup.md).
- [Exact production integration and recorder/replay changes](../../research/clip-studio-paint-stabilization/spikes/post-bezier/analysis/integration.md).
- [Extraction manifest](../../research/clip-studio-paint-stabilization/spikes/post-bezier/evidence/extraction.json), [literal bytes](../../research/clip-studio-paint-stabilization/spikes/post-bezier/evidence/literals.json), and [quadratic vtable](../../research/clip-studio-paint-stabilization/spikes/post-bezier/evidence/quadratic-vtable.json).

## Important arithmetic contracts

Let `T` be the existing settings converter's tolerance and `r = T * 0.1`, using a separate binary64 multiplication. The candidate corner threshold is `fma64(r, 3, 1)`, multiplied by length scale only when that scale is strictly greater than 1. Scale also remains a separate input to the native corner predicate.

Duplicate coalescing compares each previous coordinate inclusively against `incomingCoordinate ± 1e-8`, with rounded interval construction. It is not a Euclidean epsilon test. Span search uses separately calculated `(r*r)*4` for its endpoint-radius exemptions and `(r*r)*0.025` for its speed-selected relative test. Its fixed test compares line deviation with `r`; its relative test compares squared deviation with the relative factor times squared local-edge length.

The final scalar pass reads source path parameter `p`, returns when `p < 1e-8`, and computes `step = clamp(0.5/p, 0.005, 0.2)`. Its exact skip/transfer order is in the analysis note. Node scalar `+0x44` is a transformed brush-response value imported from `SVectorNode+0x10`; do not substitute raw device pressure or Croquis's rendered width.

The ordinary spline removal schedule and endpoint evaluator are not part of the recovered Bézier call chain. The Bézier scalar pass can insert nodes after anchor adjustment. Final output therefore must be sampled after that pass, using the resulting controls and order.

## Unresolved contracts to close first

These are specific prerequisites, not permission to fill gaps with plausible formulas:

1. **Selected source construction with Bézier on:** trace the begin/append/finish callers, selected path class, flags, scalar response, and path parameter. Setting-to-dispatch mapping is known; the entire source configuration cannot be inferred from that mapping alone.
2. **Record sampling gates:** `0x10276b714` uses virtual scalar sampling and conditional flag/angle paths. Establish which flags are reachable in the selected profile, including bits 4, 5, 12, 13 and scalar `+0x50`. Implement reachable branches and explicitly guard any unsupported ones.
3. **Cached projection bounds:** finish the path/node bounds creation and refresh contract, including scalar/evaluator dependencies. Port the observed filters or prove a substitute preserves every accepted candidate, comparison, and tie. Omitting filters without proof does not establish equivalence.
4. **Source path parameter:** trace the virtual `+0x88` getter and its initialization for Bézier mode. Ordinary captures observed half the brush diameter; verify that provenance for this branch.
5. **Degenerate/reuse behavior:** prove the candidate queue bound and reset behavior, one-node/repeated-point paths, terminal emission, zero-length segments, and signed coordinate-conversion domain.

The nonzero mode's `0x102780880` tangent/control reconstruction is retained but excluded by the chosen mode-zero scope. Closed-path fallback in projection/splitting must remain guarded in this first implementation.

## File and interface map

Paths below are relative to `/Users/adoll/projects/drawing-app`.

| File                                                                                  | Responsibility                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `docs/research/clip-studio-paint-stabilization/spikes/post-bezier/extract.py`         | Reproducible static extraction, hashes, literals, and vtable targets. Already written.                             |
| Same folder, future `native_oracle.py` and `replay.ts`                                | Independent instruction cases and complete native before/after comparisons.                                        |
| `apps/frontend/src/sticker-creation/canvas/post-correction/bezier.ts`                 | New authoritative open Bézier candidate, span, emission, orchestration, and scalar pass.                           |
| Same folder, `bezier-projection.ts`                                                   | New bounded nearest search, exact bound gates/refresh contract, and insertion/attribute transfer.                  |
| Same folder, `bezier-sampling.ts`                                                     | Sample finalized quadratic segments and effective controls for Croquis's rendering density.                        |
| Same folder, `bezier.test.ts`, `bezier-projection.test.ts`, `bezier-sampling.test.ts` | Portable independently checked arithmetic, state transitions, and geometry cases.                                  |
| Same folder, `quadratic.ts`, `sampling.ts`, `source.ts`, `reference.ts`, `profile.ts` | Reuse verified operations and expose shared primitives only where the native call chain proves reuse.              |
| Same folder, `settings.ts`, `core.ts`, `core.test.ts`                                 | Add `bezierCurve: boolean`; validate it; dispatch by mode and sample the correct result type.                      |
| Same folder, `protocol.ts`, `worker.ts`, `service.ts`, `service.test.ts`              | Carry the setting through existing typed requests, preserving progress, limits, failures, and cancellation.        |
| `apps/frontend/src/sticker-creation/canvas/inkEngine.ts` and test                     | Preserve pen-down settings snapshot, one undo action, interruption ordering, and original ink on failure.          |
| `apps/frontend/src/sticker-creation/session/keptSession.ts` and test                  | Save/restore the new boolean; normalize a missing field to the ordinary default, reject present nonboolean values. |
| `apps/frontend/src/sticker-creation/tools/SmoothingBar.tsx` and test                  | Add the switch to the existing post options fieldset.                                                              |
| `apps/frontend/src/i18n/strings/stickerCreation.ts`                                   | English/Japanese labels and any necessary help.                                                                    |
| `apps/frontend/src/sticker-creation/DrawingScreen.tsx` and test                       | Verify settings restoration and delivery to the correction service.                                                |
| `apps/frontend/e2e/pencil.e2e.ts`                                                     | Real worker, browser numerical consistency, controls, history, persistence, and failure behavior.                  |

Public interfaces fixed by this spec:

```ts
interface PostCorrectionSettings {
  strength: number;
  adjustBySpeed: boolean;
  adjustByScale: boolean;
  bezierCurve: boolean;
}
// FIRST_POST_CORRECTION: { strength: 0, adjustBySpeed: false,
//                          adjustByScale: true, bezierCurve: false }
```

`PostCorrectionInput`, `PostCorrectionResult`, the worker's sampled flat `points` response, and `transferStrokeAttributes` retain their current external contracts. Internal Bézier input/output types must include complete quadratic controls, seven scalars, flags, endpoint bytes, adjacency/order, path fields, parameter, and the proven bounds configuration. Task 1 defines those types from the closed contracts before the pipeline is implemented; do not guess a narrow point-array API now and discard required data later.

## Review focus

1. A control point far from its anchor: use native representative/effective control ownership in both correction and sampling.
2. Negative coordinates and midpoint rounding boundaries: preserve the exact offset and signed-64 conversion.
3. Short or repeated-point strokes: preserve terminal behavior, taps, finite results, and endpoint attributes.
4. Changing response scalar and near-endpoint projection: preserve extrema, split controls, insertion rejection, and first-candidate ties.
5. Mode changes or cancellation during pending correction: apply settings only to the intended stroke and retain one history action/original ink.

## Ordered implementation tasks

### Task 1: Close the selected native contract

**Files:** Existing static extracts and the four analysis notes; add `spikes/post-bezier/contract.md` and any specifically needed extracts through `extract.py`.

**Consumes:** The pinned image, established UI selector, addressed call chain, and selected ordinary profile.

**Produces:** A complete selected Bézier source/result contract, exact dependency list, and internal TypeScript input/output types for the next tasks.

- [ ] Verify the original image hash and each retained function/literal hash. Reproduce extraction with the saved commands in `evidence/extraction.json`.
- [ ] Trace and document the five unresolved contracts above. Record exact getters, virtual targets, field writers, comparison order, and support guards. For each flag/scalar branch, prove it is supported or unreachable under the selected profile.
- [ ] Define `runBezierPost`'s internal input/output types in `contract.md`, including the bounds/evaluator dependencies. Use existing `PostNodeInput`, scalar and point types where their meanings match; create only the missing control/bounds types.
- [ ] Build portable source/record cases from independent instruction expectations. Include a control distinct from its anchor, scalar changes, first/last nodes, and mode zero.
- [ ] Record proof and remaining exclusions. This task passes only when each supported input needed by later tasks has a known source and finite-domain contract.

### Task 2: Implement and independently verify Bézier primitives

**Files:** New production Bézier modules/tests, future local `native_oracle.py`, and only necessary shared primitive exports.

**Consumes:** Task 1's exact types and branch support contract.

**Produces:** Verified candidate/emission/span, anchor quantization, projection/insertion, and scalar preservation operations.

- [ ] Write failing portable tests named for representative controls, duplicate interval boundaries, emitted call tuples, queue front/count changes, and pending corner timing. Implement the candidate/emitter from the retained analysis without changing operation order.
- [ ] Write failing span tests for both speed flag values, endpoint-radius equality, radial rejection, candidate-versus-offending-node return, bit-2 stop, duplicates, and the 200-candidate boundary. Implement the native traversal.
- [ ] Write failing coordinate tests around positive/negative half steps and the exact signed offset. Implement the native signed-64 finite-domain setter; compare against independently executed original instructions.
- [ ] Write failing scalar/projection tests for both step clamps, threshold equality, previous-node transfer suppression, failed searches, endpoint insertion rejection, split-control preservation, binary32 imports, maximum ties, and equal-distance candidate order. Implement the proven bounds contract and ordered scalar pass.
- [ ] Build a standalone original-instruction comparison with synthetic node graphs and decoded configuration. Verify unchanged instruction words, relocations/constants, and FPCR zero before accepting results. Disclose any allocator/object seams and keep them outside the arithmetic claim.
- [ ] Require exact bit/flag comparisons for every supported primitive case. Preserve failed reports. Passing implementation-derived expectations alone is insufficient.

### Task 3: Assemble the complete branch and obtain native targets

**Files:** `bezier.ts`, `bezier-sampling.ts` and tests; local `replay.ts`; mode-specific changes/tests in `spikes/live-capture/` and native decoding/replay.

**Consumes:** Verified primitives, original source construction, and settings conversion.

**Produces:** An independently replayable source-to-Bézier result and complete CSP Bézier-on capture evidence.

- [ ] Assemble the exact operation order from `orchestration.md`, including fresh/reset state, source advancement, midpoint adjustment, bounds refresh, scalar preservation, and final bounds refresh. Count work and check the shared deadline inside nested scans and projection loops.
- [ ] Implement output sampling from finalized quadratic controls. Reuse `sampleQuadraticForCorrection` only after checking its call semantics. Retain the Croquis target spacing of half a CSS pixel in sheet units and the existing per-segment limit; make the first/last output and corner ownership explicit.
- [ ] Extend the recorder and decoder with explicit Bézier mode contracts. Current source replay and output comparison have ordinary-only guards; retain those guards and add the proven alternate class/controls comparison. Do not turn off image, caller, class, completeness, or mode checks globally.
- [ ] Run host-only recorder tests first, including wrong class, wrong mode, missing controls, unmatched entry/return, cleanup failure, and limits. Existing recorder tests must still pass.
- [ ] After the user resumes runtime work, launch the persistent research copy and discover its fresh PID. Use a disposable canvas, confirmed settings, bounded recorder, and automated mouse input. A capture is acceptable only with owned-breakpoint cleanup, successful detach, and independently confirmed process resume.
- [ ] Capture the matrix below. Predict from retained source/settings without seeding expected result controls, node counts, replacement order, or flags. Compare every recorded supported result field exactly.
- [ ] Add a focused tablet capture only if the changing brush-response behavior remains unobserved. Prepare/check everything first; request the specific pressure stroke only at the point physical input is required.

### Native capture and replay matrix

Use open strokes and closure/mode zero. Keep the selected profile, taper zero, and live stabilization fixed at 20 unless a case explicitly needs a different input contract. Numbers below are actual settings, not indicator positions. Add cases only for a discovered uncovered branch; this is not an exhaustive Cartesian product.

| Case                                                  | Post strength | Speed | Scale | Zoom | Purpose                                                                                       |
| ----------------------------------------------------- | ------------: | ----- | ----- | ---: | --------------------------------------------------------------------------------------------- |
| Straight stroke                                       |            20 | Off   | Off   | 100% | Complete source/result baseline and redundant controls.                                       |
| Broad S curve                                         |            10 | Off   | Off   | 100% | Lower-strength geometry and control changes.                                                  |
| Broad S curve                                         |            40 | Off   | Off   | 100% | High-strength result and contrast with ordinary correction.                                   |
| Deliberate sharp turn                                 |            20 | Off   | Off   | 100% | Corner classification and emission.                                                           |
| Short/repeated-point stroke                           |             1 | Off   | Off   | 100% | Terminal/coalescing and degenerate geometry.                                                  |
| Stroke with short/long adjacent movements             |            20 | On    | Off   | 100% | Relative span test and captured movement/scalar provenance.                                   |
| S curve                                               |            20 | Off   | On    |  50% | Scale greater than one and corner threshold scaling.                                          |
| S curve                                               |            20 | Off   | On    | 200% | Scale below one and its distinct branch.                                                      |
| Short curve with varying tablet pressure, if required |            20 | Off   | On    | 100% | Changed transformed scalar, insertion/max fallback, and complete pressure-dependent behavior. |

Mouse inputs have constant pressure; they cannot establish variable-pressure tablet behavior. Debugger captures perturb timing, so these are numerical comparisons, not latency measurements. The independent primitive suite must still exercise all branch boundaries even if the mouse fixtures do not happen to reach them.

### Task 4: Integrate the option with Croquis

**Files:** Settings, core, worker/service, session, engine, controls/catalog, and their tests from the file map.

**Consumes:** Task 3's validated branch and quadratic sampler.

**Produces:** An optional saved Bézier setting applied consistently to complete strokes.

- [ ] Add `bezierCurve` with default false and strict core validation. Normalize an absent saved field to that default using the existing reader; reject an explicitly invalid value. Keep one settings implementation.
- [ ] Pass `selector482` through settings conversion and dispatch to the separate algorithm. Preserve the ordinary routine's unsupported-mode guards and exact regression outputs.
- [ ] Test both algorithms through `correctPostStroke`, including speed/scale flags, dots, multiple source groups, idle release, brush size, sampled geometry, width/time transfer, nonfinite values, limits, and deadline failure.
- [ ] Add the bilingual switch to the existing post options fieldset and verify disabled/restore behavior. Snapshot mode at pen-down; changing it during a stroke affects the next stroke.
- [ ] Verify one correction/undo action and interruption behavior for layers, Merge down, export, sealing, cancellation, errors retaining original ink, and stale replies. Extend existing lifecycle tests instead of duplicating all ordinary tests.
- [ ] Verify actual worker output and width/time transfer in Chromium and WebKit; preserve the explicitly ordered distance calculation from the released browser rounding fix.

### Task 5: Verify, review, and deliver during the later implementation task

**Produces:** A reviewed, integrated release with bounded fidelity claims and preserved evidence.

- [ ] Run the relevant focused tests, then frontend type/lint/format, the complete frontend suite, relevant Chromium/WebKit tests, and a production build using the commands below.
- [ ] Review source/control ownership, native comparison independence, bounds/scalar contracts, cancellation, and the five review-focus conditions. Address discrepancies before declaring the feature complete.
- [ ] Document the captured CSP configuration, exact compared fields, results, exclusions, and any Croquis adaptation. Clearly distinguish synthetic instruction checks, actual native strokes, and browser consistency.
- [ ] When delivery is authorized, merge cleanly onto current main, preserve concurrent work, use the normal deployment process, and verify public worker output/assets. Follow repository commit and post-merge cleanup requirements; do not stop at a local passing implementation while claiming delivery.

## Verification commands

Static evidence regeneration, safe with CSP closed:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-bezier/extract.py 0x102785dd4 0x102785e94 0x102785f40 0x102786094 0x102786564 0x10278672c 0x1028ed064
```

The manifest retains all additional extraction commands and exact original-byte/assembly hashes. Additional extracts are bounded to 32,768 bytes per function. This command reads the pinned image and disassembles it; it does not start CSP.

Existing host-only recorder checks:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/live-capture/check_post_correction.py
python3 docs/research/clip-studio-paint-stabilization/spikes/live-capture/check_joined_post.py
python3 docs/research/clip-studio-paint-stabilization/spikes/live-capture/check_record_joined_post.py
```

Run after the future files/tests exist, from the clean implementation worktree:

```sh
pnpm --filter frontend test -- src/sticker-creation/canvas/post-correction src/sticker-creation/canvas/inkEngine.test.ts src/sticker-creation/tools/SmoothingBar.test.tsx src/sticker-creation/session/keptSession.test.ts src/sticker-creation/DrawingScreen.test.tsx
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend test:e2e -- e2e/pencil.e2e.ts --project=chromium --project=webkit
pnpm --filter frontend build
```

Run `pnpm exec oxfmt --check` on the exact changed files. Future `native_oracle.py` and `replay.ts` must each support unique persistent report paths, bounded execution, explicit completeness/failure, and exact comparisons. Establish their command-line contracts in Task 2/3 before listing a runnable capture command; the current ordinary launcher is not a verified Bézier launcher.

## Completion and resume boundary

This specification is complete when its linked static evidence is present, checksums/links are checked, and the tasks identify every remaining contract and acceptance gate. The Bézier feature is complete only after the later reconstruction, independent comparisons, integration, review, and authorized delivery.

Resume at **Task 1**, using saved files. CSP and the tablet are unnecessary for that task. Native recording becomes necessary at Task 3 after the recorder and replay understand the mode. The persistent research app is `/Users/adoll/Applications/CSP Research/CLIP STUDIO PAINT Research.app`; use a fresh process ID and the current repository recorder rather than historical helper copies.
