# Fill Gap Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Closely emulate CSP's gap-filling behavior and let an artist choose levels 1–5, initially 3, remembering that choice across stickers and app restarts on the same device.

**Architecture:** Replace Croquis's current gap-region selection with one authoritative implementation based on recovered CSP bitmap stages and verified native captures. Map levels to CSP's recovered factory values `[1, 3, 5, 10, 20]` in canonical sheet units, then pass the numeric gap through existing device settings, Fill gestures, workers, recorded operations, and replay. Native selection comparisons precede product integration and UI work.

**Tech Stack:** TypeScript, React, existing localStorage device-setting helpers, native radio inputs, the existing Fill worker, Vitest, and Playwright Chromium/WebKit. Native research uses the pinned CSP 5.1.4 ARM64 image and retained observer captures.

**Spec:** The design brief and verified findings below, plus `docs/research/clip-studio-paint-stabilization/spikes/fill-gap/PRESETS.md`, `native-algorithm.md`, `narrow-boundary-rules.md`, `endpoint-pair-rules.md`, `FIXTURES.md`, `COMPARISONS.md`, `LARGER-GAPS.md`, and `soft-fixtures/SOFT-EDGES.md`. The operator requested research and planning; this document does not authorize product implementation.

## Global Constraints

- Choices are exactly levels 1, 2, 3, 4, and 5. Their canonical numeric gaps are exactly **1, 3, 5, 10, and 20**. Missing or invalid saved data starts at **level 3, gap 5**.
- The default intentionally changes from today's gap 2. Do not preserve that behavior by shrinking the recovered table or claim that level 3 retains the old algorithm's pixels.
- A saved choice survives new stickers, reloading, and closing/reopening Croquis in the same browser or LINE storage context. Clearing that context resets it. Separate browsers and devices have separate choices.
- The preference belongs to the device, outside a kept drawing's tool metadata. Restoring a drawing must not replace the latest device choice.
- Every region in one Fill drag uses settings captured at its beginning. A new choice takes effect only after accepted Fill finishes.
- Every completed Fill records its own numeric canonical gap, independent of later preferences. Preserve existing operation fields; historical pixel compatibility requires the decision gate in Task 0.
- Initially fix **Fill narrow areas on** inside the replacement algorithm. This matches the observed standard Fill reference tools and native comparison configuration. Do not add another user setting. Test the native off branch as a comparison control.
- A failed preference write still applies the choice for the current page, logs the failure, and displays a persistent localized notice. A failed Fill prevents the requested choice change and its save.
- User-facing copy belongs in `apps/frontend/src/i18n/strings/stickerCreation.ts`, in English and Japanese, with required one-line screen/interaction comments. Follow `apps/frontend/src/i18n/glossary.md`.
- The feature's user-facing name is **Close gap** (CSP's label; Japanese 隙間閉じ). Code identifiers here still use the `fillGap` stem (`FillGapLevel`, `fillGapForLevel`, `canvas/fill-gap/`, `draw.fillGapLevel`); align them to a `closeGap` stem so the feature has one name, pending the engineer's vocabulary confirmation.
- Preserve worker region/drain deadlines, memory limits, layer restrictions, cancellation, and one-Undo-action-per-drag behavior. The larger native range must pass browser measurements before shipping.
- Keep one authoritative fill implementation. Remove the old chamfer/`ROOM`/`POCKET` gap path when the replacement is integrated; do not ship a legacy-algorithm branch.
- No server, database, or cookie changes are needed for the selector. Historical replay is settled: the timelapse gains stored fill pixels (**timelapse v5**), specced separately in `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md`, and must ship before Task 3's algorithm change. The kept-session format is unchanged; recovered in-progress drawings re-flood with the installed algorithm.
- When implemented and merged, remove this completed plan according to the project's post-merge instructions.

## Review Focus

1. CSP gap 5 closes the retained five-pixel opening while current Croquis gap 5 leaks outside. Exact native selection agreement in Task 1 is a gate; substituting the table into the old algorithm is insufficient.
2. The larger-width captures establish exterior leakage on a small canvas under Croquis gap 20 and recovery of a 500-pixel pocket under native gap 10. Closure-edge differences remain even when both fills are contained. Tasks 0–1 use those full masks, recovered endpoint order/ties, and crop checks; generic dilation or distance rules are insufficient.
3. Canonical gap must not change with display zoom or backing density. Task 3 checks canonical values, raster conversion, crop/full-sheet agreement, and density-dependent raster limits separately.
4. Replacement can change regenerated old fills even when recorded gaps are unchanged. Historical replay is decided — timelapse v5 stores each fill's written pixels so sealed timelapses replay faithfully (see `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md`); pre-v5 timelapses and recovered kept drawings re-flood, which is accepted. Tasks 1 and 3 verify new-operation replay against it.
5. Setting changes during queued Fill, blocked storage, and a taller control on narrow Japanese phone layouts can break the drawing flow. Tasks 2–4 test ordering, persistent errors, both hands, and supported layouts.

---

## Design brief and scale

An artist should be able to reduce gap closure for intentional small openings or increase it for broken lines, using behavior that closely follows CSP. While Fill is selected, extend the current floating control below the tool strip with five choices labeled `1 2 3 4 5`, beneath Fill reference. The group label is **Close gap** (CSP's label; Japanese 隙間閉じ). Both groups remain independent native radio groups, with keyboard selection and 44px touch targets.

The control retains its material and hand-dependent position. It does not open a modal or pause the clock. Help and save errors wrap inside its existing bounded width. Changes affect future fills, not pixels already painted.

| Level | Canonical gap in sheet units | Initial state             |
| ----- | ---------------------------: | ------------------------- |
| 1     |                            1 | Smallest allowance        |
| 2     |                            3 |                           |
| 3     |                            5 | Default selector position |
| 4     |                           10 |                           |
| 5     |                           20 | Largest allowance         |

These numbers reproduce the recovered **CSP factory indicator table**, not every user's customized values. Croquis exposes five fixed choices. Every level is positive; zero remains an ordinary-connectivity path for existing numeric operations, not an additional Off choice.

A canonical sheet unit is the reference 390px phone's sheet unit defined in `canvas/sheetFrame.ts`. The preference and `FillOp.gap` stay in those units. The worker receives `gap * savedFrame.density` in backing pixels; display zoom is excluded. The recovered ordinary positive-width conversion is `max(1, trunc(backingGap + 0.50000001))`. Apply it once at the algorithm boundary, retaining the unrounded canonical number in the operation.

At density 1, the five native integer widths are `[1, 3, 5, 10, 20]`: this is the fixed-raster comparison domain. At density 2.625 they become `[3, 8, 13, 26, 53]`. Density does not change the canonical allowance, but raster sampling, odd/even rules, and native pixel constants can change individual edge pixels. Fixed-raster parity does not promise identical pixels across browser densities. Test densities 1, 2.625, and 3 and zooms 0.5, 1, and 2. Do not divide the presets by density or restore gap 2 as default.

The initial narrow-area-on policy is supported by saved “Refer only to editing layer” and “Refer other layers” settings with `FillSoakIntoNarrowArea = 1`, and the real native fixture's flag `1024`. Other tools differ, so this is the chosen Croquis policy, not a claim about every CSP subtool.

## Verified findings and limits

### Native CSP

- Pinned CSP 5.1.4 ARM64 image: `/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64`; SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
- `PWFillToolFactory::InitializeIndicatorInfo` at `0x102a9d450` establishes `[1, 3, 5, 10, 20]` for parameter 5101. `MakeControlAttribute` associates it with resource group 46, label 25, **Close gap**. Generic consumption preserves left-to-right order. The research app's Indicator Settings dialog independently confirmed the values. See `PRESETS.md` and `evidence/indicator-presets/manifest.json`.
- Parameter 5100 enables gap closing, 5101 is a length with a unit, and 5102 controls narrow-area processing. Native conversion normalizes units and produces an integer image-pixel width. For a positive length resolved to target unit 0, it is `max(1, trunc(length + 0.50000001))`. Physical units/document resolution remain relevant to native comparisons.
- `PWFloodFill::CloseGapFill` at `0x10253f5e4` uses square barrier perimeters, seed exemption, restoration constrained by candidate pixels, and local repeated four-neighbor shrinking. Widths above 10 use additional refinement. Narrow areas on adds connected reflood and stop-line processing. Both settings recover omitted components with a count limit `8*g*g` and crop-boundary checks.
- `native-algorithm.md` records exact bitmap roles, helper arguments, calls, and observer boundaries. `narrow-boundary-rules.md` recovers the two outline-scan orders, diagonal supporting-neighbor requirement, and direction-sensitive segment rasterization. `endpoint-pair-rules.md` recovers the advancing-front pair selection, remembered-pair flags, replacement ties, strict distance bound `2*(g+1)^2`, and termination/output order. These verified static translations leave startup preparation and full helper interactions **not yet natively validated**. Generic square dilation/erosion or Croquis's `POCKET` rule is not an established substitute.
- Native C is prepared lazily. A captured zero may be unprepared rather than ineligible; derive eligibility from known source fixtures and retain that distinction.

### First real comparison

The retained `axis-gap-5` fixture is a 640×480 transparent PNG with a three-pixel black rectangular outline and five-pixel opening. Native configuration: 72 dpi, 100% view, seed `[320, 230]`, current-layer reference, color margin 10, area scaling off, anti-aliasing on, narrow areas on. The observer confirmed integer gap **5**, narrow flag **1024**, exact seed, complete boundaries, and successful return.

| Measurement                  | Native CSP | Current Croquis, raw gap 5 |
| ---------------------------- | ---------: | -------------------------: |
| Selected pixels              |     80,340 |                    303,759 |
| Exterior probe `[320, 420]`  |    Omitted |                   Selected |
| Canvas sides reached         |       None |                   All four |
| Croquis-only selected pixels |            |                    223,419 |

CSP closes this opening; current Croquis leaks. Full A masks and differences are retained in `COMPARISONS.md` and its report. Native A has five selected bits beyond the returned rectangle under the recovered exclusive-bound convention; retain the mask and rectangle separately rather than cropping the comparison to force agreement.

Four successful native calls are retained, all at gap 5 with narrow areas on. Comparisons after the first use the actual captured seed explicitly, recomputing Croquis from that seed:

| Fixture          | Captured document seed | Native pixels | Croquis pixels | Measured result                                                      |
| ---------------- | ---------------------- | ------------: | -------------: | -------------------------------------------------------------------- |
| Axis opening 5   | `[320, 230]`           |        80,340 |        303,759 | Native closes; Croquis reaches exterior                              |
| Narrow pocket    | `[322, 176]`           |        79,525 |         79,523 | Both omit pocket; native adds two passage-end pixels                 |
| Diagonal opening | `[318, 176]`           |       303,803 |        303,803 | Exact selection agreement; both reach exterior                       |
| Green bridge 4   | `[254, 246]`           |        25,360 |         50,560 | Native selects left lobe and bridge; Croquis also selects right lobe |

The green fixture's complete native candidate mask includes all 50,560 original green pixels. Its omitted right lobe is therefore a gap-selection effect, not a difference in eligible colors. All four runs captured entry, initial, and successful return, detached cleanly, and independently verified a resumed research process. Full masks, overlays, returned-rectangle exceptions, provenance, and outcomes are in `COMPARISONS.md`.

These prove specific selection outcomes. Full final RGBA, native anti-aliasing, and natural fill timing have not been measured. Earlier failed preset input and later failed pocket attempts remain separate from successful evidence; details are retained in the comparison and cleanup notes.

### Larger gaps, canvas edges, pockets, and soft sources

Thirteen additional successful native calls cover eight larger-width/edge/pocket/diagonal comparisons and five soft-source controls. Every retained successful run completed its native return, detached cleanly, and passed the launcher's independent exact-process resume check. Their fixed settings remain current-layer reference, color margin 10, area scaling off, anti-aliasing on, and narrow areas on. Source rasters are immutable; fallback input uses the actual captured interior seed, explicitly recomputed in Croquis.

| Source and native width         | Native pixels | Croquis pixels | Measured result                                                   |
| ------------------------------- | ------------: | -------------: | ----------------------------------------------------------------- |
| Small canvas, opening 2, gap 10 |        30,231 |         30,229 | Both contained; two native-only opening pixels                    |
| Small canvas, opening 2, gap 20 |        30,231 |         45,870 | Native contained; Croquis selects 15,639 exterior pixels          |
| Axis opening 10, gap 10         |        80,355 |         80,345 | Both contained; ten native-only opening pixels                    |
| Axis opening 20, gap 10         |       303,804 |        303,804 | Exact mask agreement; both leak                                   |
| Axis opening 20, gap 20         |        80,406 |         80,365 | Both contained; 41 native-only closure pixels                     |
| Axis opening 21, gap 20         |       303,807 |        303,807 | Exact mask agreement; both leak                                   |
| Narrow pocket, gap 10           |        80,025 |         79,523 | Native recovers the full 500-pixel pocket plus two passage pixels |
| Diagonal opening, gap 10        |        55,966 |         55,919 | Both contained; 47 native-only pixels at the opening              |

The native pocket mask exactly equals the ordinary four-neighbor transparent component in the original source from its actual seed. Its gap-5 omission and gap-10 recovery are consistent with the recovered count limit rising from 200 to 800, without isolating that pass. Croquis's small-canvas exterior leakage is consistent with its distance/`POCKET` classification; native omitted-component recovery also checks crop contact. These are explanations supported by static stages and final masks, not stage-specific runtime observations. See `LARGER-GAPS.md` for seeds, full masks, bounds, returned-rectangle exceptions, and failed attempts.

The five soft sources share a clear ten-pixel opening. Uniform black outline alpha 64, 128, 192, and 255 produce exactly identical native A and C masks at gap 10: native A selects 80,355 pixels and stays contained. Croquis fills all 307,200 pixels at alpha 64, then becomes contained with 80,345 selected pixels at alpha 128/192/255. The true antialiased outer-fringe source has native A 80,365 versus Croquis 80,345; its altered outer geometry accounts for a further row of opening pixels. All four exact alpha-16 corner pixels are positive native C evidence. Zero C pixels remain potentially unprepared; these observations alone do not establish the complete native alpha predicate. Croquis's partial-alpha tuck and final color writing are separate from IN-mask selection. See `soft-fixtures/SOFT-EDGES.md` and its complete source/output comparisons.

The bounded candidate trace in `soft-fixtures/static-candidate/CANDIDATE-PREDICATE.md` identifies the tile invoker and two workers. All fifteen soft-capture headers retain flags `0x440`, mode 0, tolerance **26**, and zero target components under UI color margin 10. One separate-alpha/color worker reduces to inclusive **alpha <= 26**, independent of RGB, if that worker and the captured controls are the active path. The source-format dispatch and active worker were not observed, and the general margin-to-tolerance conversion is not recovered. This conditional result is consistent with the positive alpha-16 evidence; do not replace Croquis's alpha-128 rule with a guessed universal constant. Task 0 must confirm the active predicate and choose the candidate/edge-writing policy before integration.

The original larger-gap matrix is **seven of ten** complete; the diagonal control and five soft controls are additional. Pocket gap 20 and both actual near-line seed cases remain uncaptured because arbitrary point input returned `noWindowsAvailable` again. Accessible canvas-center clicks cannot establish near-line behavior or change the gap selector. Native soft-source gap-20 controls, narrow off, final RGBA, and natural timing remain unmeasured. Research cleanup and settings that could not be restored are in `CLEANUP.md`.

### Croquis integration and historical replay

- `canvas/fill.ts` supplies fixed `FILL_GAP = 2`. Its gap path uses 3/4 chamfer distances, `ROOM = 1.5`, nearest-region assignment, and `POCKET`. These define the replacement target, not acceptance outputs.
- Current gap closure applies only to empty paper; recoloring uses existing tolerance. The native green-bridge comparison proves the CSP gap rule also affects this opaque-color recoloring case. Apply the recovered gap selection to eligible colored regions as well as paper, then validate soft/partial-alpha candidates separately.
- `canvas/inkEngine.ts` passes the fixed gap to `fills.begin`. Add numeric gap to `fillSelection`/`sameFillSelection`, beside tool, color, reference, and input mode.
- `canvas/fillGesture.ts` captures settings, records canonical gap, and sends `gap * density` to the worker. `layers/layerInk.ts::flood` repeats the conversion for replay. Preserve that canonical contract.
- Existing `drawingSettings.ts`, `ui/deviceSetting.ts`, and `ui/deviceStorage.ts` provide preferences, subscriptions, logged errors, and in-page retention when saving is refused.
- `session/keptSession.ts` persists steps and frame, not complete persistent selections. `inkEngine.load` rebuilds history from them. Timelapse v4 tuples store gap/reference without algorithm identity or selected mask. `sticker-board/timelapse/fillSnapshots.ts` calls `LayerInk.flood` during both preparation passes; those snapshots are regenerated.
- Sealing creates PNGs from the current raster through `makeSticker.ts`/`cutSticker.ts`. Existing sealed images remain stable because this change does not rewrite them. Restoring old kept operations or regenerating old timelapses can yield different fills under replacement.
- `FIXTURES.md` retains 11 fixtures and 55 current-Croquis selections. Their old thresholds/leaks document differences, not expected replacement behavior.

Official primary references:

- https://help.clip-studio.com/en-us/manual_en/810_subtools/F.htm
- https://help.clip-studio.com/en-us/manual_en/images/810_subtools_0110.png
- https://tips.clip-studio.com/en-us/articles/590
- https://tips.clip-studio.com/en-us/articles/534
- https://help.clip-studio.com/ja-jp/manual_jp/150_tools/%E3%83%84%E3%83%BC%E3%83%AB%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3%E3%83%91%E3%83%AC%E3%83%83%E3%83%88.htm
- https://support.clip-studio.com/en-us/faq/articles/20190051

## File responsibilities

| Responsibility                                          | Files                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native fixtures, comparisons, remaining evidence        | `docs/research/clip-studio-paint-stabilization/spikes/fill-gap/`                                                                                                                                                                                                                        |
| Recovered selection stages, isolated from color writing | New `apps/frontend/src/sticker-creation/canvas/fill-gap/types.ts`, `barriers.ts`, `restoration.ts`, `narrowAreas.ts`, `components.ts`, `selection.ts`; tests `barriers.test.ts`, `restoration.test.ts`, `narrowAreas.test.ts`, `components.test.ts`, `selection.test.ts`                |
| Authoritative levels/default/mapping                    | New `apps/frontend/src/sticker-creation/canvas/fillGap.ts` and `.test.ts`                                                                                                                                                                                                               |
| Device preference                                       | `apps/frontend/src/sticker-creation/drawingSettings.ts` and `.test.ts`                                                                                                                                                                                                                  |
| Selection integration, gesture settings, worker         | Existing `canvas/fill.ts`, `canvas/inkEngine.ts`, `canvas/fillGesture.ts`, `canvas/fill-worker/core.ts`, and tests                                                                                                                                                                      |
| Replay and accepted historical policy                   | Existing `layers/layerInk.ts`, `session/keptSession.ts`, `sealing/timelapse.ts`, `sticker-board/timelapse/fillSnapshots.ts`, and tests; the timelapse format change (v5, stored fill pixels) is specced in `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md` and ships first |
| Control and copy                                        | Existing `tools/FillReferenceBar.tsx`, `.css`, `.test.tsx`; `DrawingScreen.tsx`, `.test.tsx`; `i18n/strings/stickerCreation.ts`                                                                                                                                                         |
| Browser validation                                      | Existing `e2e/fill.e2e.ts`, `e2e/fillEngine.e2e.ts`, `e2e/fillHistory.e2e.ts`                                                                                                                                                                                                           |

Extend `FillReferenceBar`; do not create a competing control. Retire `FILL_GAP` when callers use the mapping. Split native stages by responsibility rather than putting the whole reconstruction in `fill.ts`.

## Task 0: Complete the native target and historical replay decision

**Files:** Research evidence/comparisons in `docs/research/clip-studio-paint-stabilization/spikes/fill-gap/`; this plan. No product changes.

**Interfaces:** Produce reviewed fixed-raster fixtures with source bytes, seed, integer gap, narrow flag, dimensions/offsets, full final A mask, returned rectangle, success, and provenance. Produce the historical replay decision and scoped candidate/edge-rendering policy before integration.

- [x] Recover/inspect `[1, 3, 5, 10, 20]`; resolve initial selector as level 3, canonical gap 5.
- [x] Retain the first successful `axis-gap-5` native comparison and equal-gap Croquis leak.
- [x] Retain native gap-5 narrow-pocket, diagonal, and opaque-green-bridge comparisons at verified interior seeds.
- [x] Retain larger axis boundary comparisons at widths 10/20, small-canvas edge comparisons at both widths, narrow-pocket recovery at width 10, and the additional diagonal width-10 control. Preserve full masks and returned rectangles separately.
- [x] Retain five native width-10 soft-source controls against exact Croquis source/selection/tuck/RGBA baselines. Recover static outline scan, segment rasterization, and endpoint-pair rules with pinned-byte checks.
- [ ] Capture axis openings 1, 3, 5, 10, 20, and 21 at all five widths, narrow areas on. Retain full masks and exterior classification independently of final RGBA. Record missing/failed cases explicitly.
- [ ] Complete near-line seed, edge opening, and additional-width diagonal, pocket, and green-bridge comparisons. Add isolated specks, odd/even openings, tiny loops, omitted components below/at/above `8*g*g`, and components touching each crop side. Capture narrow off as a representative control.
- [ ] Resolve remaining startup/local-window interactions and validate recovered stop-line rules against native endpoint boundaries. Static endpoint rules are recovered; their integration and active-path observations remain gates. Native results determine missing stages; do not invent a heuristic.
- [ ] Record the parity domain: exact source raster/candidate assumptions, integer width, seed, reference/color settings, and narrow-on policy. Investigate soft/partial-alpha and colored references before settling candidate conversion and Croquis edge writing. A-mask parity does not prove native RGBA parity.
- [x] Historical replay decided: ship **timelapse v5** (stored fill pixels) before this algorithm change so sealed timelapses replay faithfully; pre-v5 timelapses and recovered kept drawings re-flood under the new algorithm, which is accepted. Sealed PNGs stay unchanged. Full scope in `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md`.
- [ ] Update the plan with further successful comparisons. The replay decision is recorded (timelapse v5, `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md`). Until the remaining native gates are reviewed, product execution is not authorized.

## Task 1: Implement native selection and verify it before UI

**Files:** New focused `canvas/fill-gap/` modules/tests listed above; reviewed Task 0 fixtures. Product paths below are under `apps/frontend/src/sticker-creation/`.

**Interfaces:** Define `FillGapInput` with `width`, `height`, full-raster `candidate: Uint8Array` (0/1), integer `sx`/`sy`, positive integer backing-pixel `gap`, internal `fillNarrowAreas: boolean`, and optional existing `Cut`. Define `FillGapSelection` with full-raster 0/1 `marks` and `box: Rect`, where `box` encloses **every selected mask bit**. It is independent of the native returned `SRect`; retain that rectangle as research provenance rather than substituting it for mask bounds. Produce `selectFillGap(input: FillGapInput): FillGapSelection | "past" | null` in `selection.ts`. Production passes narrow on; the Boolean is an internal comparison input.

- [ ] Write tests decoding complete native masks and comparing every selected bit and seed/domain mapping. First target: `axis-gap-5`, 80,340 pixels, exterior omitted, no side contact, zero mask differences.
- [ ] Run tests and confirm the new implementation is absent/failing; record output. A current-Croquis mismatch is not a passing regression.
- [ ] Implement square-perimeter barriers, odd-width asymmetry, seed exemption, initial flood, constrained restoration, local shrinking, above-10 refinement, verified narrow-area stop lines, and common omitted-component count/crop checks. Preserve outline scan order, flagged-point list order, later-index nearest-list ties, strict cross-front distance, remembered-pair replacement ties, endpoint emission order, and direction-sensitive segment pixels. Keep mask bounds separate from native returned rectangles; do not discard bits to force bounds agreement.
- [ ] Run the reviewed native matrix; require zero mask differences in its declared fixed-raster domain. Do not silently substitute the old `POCKET` path for missing stages.
- [ ] Test crop expansion against whole-image results, seed/source bounds, empty selections, cancellation, memory budgets, and large widths. Missing surrounding pixels must yield `"past"`, not an invented canvas edge.
- [ ] Review code against addresses and comparison failures. Record deliberate browser adaptations and tested consequences. Selection, candidate conversion, final RGBA, and timing are separate checks.
- [ ] Commit the isolated selection deliverable. Integrate only after Task 0 native and historical replay gates are satisfied.

## Task 2: Define levels and remember the choice

**Files:** New `canvas/fillGap.ts`/`.test.ts`; existing `drawingSettings.ts`/`.test.ts`.

**Interfaces:** Produce `FillGapLevel = 1 | 2 | 3 | 4 | 5`, `DEFAULT_FILL_GAP_LEVEL = 3`, and `fillGapForLevel(level: FillGapLevel): number`, mapping `[1, 3, 5, 10, 20]`. Produce `useFillGapLevel(): FillGapLevel`, `readFillGapLevel(): FillGapLevel`, and `keepFillGapLevel(value: FillGapLevel): boolean`. Use existing `deviceSetting`, key `draw.fillGapLevel`, and default-entry removal.

- [ ] Test exact table/default, five stored choices, default-entry removal, and empty/malformed/fractional/out-of-range saved levels: `0`, `6`, `1.5`, `NaN`, `Infinity`, and object text.
- [ ] Test save refusal then later persistence: false result, chosen in-page value, unchanged prior storage, fresh-page prior value, then a successful save.
- [ ] Run focused tests and confirm missing exports fail.
- [ ] Add mapping/preference using existing conventions. Log malformed text whole with its key; do not add kept-drawing tool metadata.
- [ ] Run focused tests/type check and commit.

## Task 3: Integrate selection, gestures, worker, and replay

**Files:** Existing `canvas/fill.ts`, `canvas/inkEngine.ts`/`.test.ts`, and canvas/worker/layer/session/timelapse tests. Complete `InkSettings` constructors also change in `sticker-board/stat-board/TryPenPressure.tsx`, `e2e/fillEngine.e2e.ts`, and `e2e/penMinimumWidth.e2e.ts`.

**Interfaces:** Consume `selectFillGap`/`fillGapForLevel`; add required `InkSettings.fillGap: number` in canonical units. Preserve raw `FillOp.gap`/worker input numbers and convert backing gap once at the selection boundary. Keep `findFill` results as existing `FoundFill`, `"past"`, or null and accepted-work completion/reference contracts.

- [ ] Test `fills.begin` receiving `[1, 3, 5, 10, 20]`, default 5, and historical values 2/1.5 without remapping them into levels. Every drag region retains its starting gap.
- [ ] Test changing only gap: complete old accepted work before new value; failure/cancellation retains the previous choice.
- [ ] Compare `findFill` selection before tuck/color writing with Task 1 native fixtures. Assert that converting the full mask into cropped `FoundFill` marks preserves every selected bit, including the five axis-opening and four recolor bridge-end bits beyond the native returned rectangle. Keep later native rendering/rectangle behavior as the separate edge-writing investigation. Check worker/direct/crop/full-sheet parity at levels 1/3/5, density 2.625, and dense visible references.
- [ ] Test zoom 0.5/1/2 without changing canonical/recorded gap. Test densities 1/2.625/3 using documented conversion and geometric classification; do not require identical edge pixels across different rasters or arbitrary-region monotonicity.
- [ ] Connect selection to reviewed paper/color candidates and edge-writing policy; add gap to `fillSelection`/`sameFillSelection`; replace the fixed `fills.begin` gap.
- [ ] Remove chamfer/`ROOM`/`POCKET` gap selection and `FILL_GAP`. Positive-gap recoloring uses the replacement selection, including the verified green-bridge outcome. Retain ordinary zero-gap connectivity. Update default imports and complete settings constructors to gap 5.
- [ ] Add mixed-gap `[1, 3, 5, 10, 20]` kept/timelapse round trips. Require unchanged recorded numbers after preference changes and identical newly created fill replay at the same saved density. Cover references, locked/clipped layers, Undo/Redo, cancellation, and one Undo per drag.
- [ ] Confirm timelapse v5 (stored fill pixels, `docs/superpowers/plans/2026-10-14-timelapse-fill-pixels.md`) shipped before changing the algorithm, then verify new fills replay from stored pixels while pre-v5 timelapses and recovered kept drawings re-flood. Use `sticker-board/timelapse/fillSnapshots.test.ts`.
- [ ] Measure level 5 at maximum-sheet/dense-reference sizes and repeated fills in Chromium/WebKit. Verify region/drain/preparation deadlines, memory budgets, and persistent reviewable failure notices. Desktop timing does not prove native/physical-phone equivalence.
- [ ] Run focused canvas/worker/layer/session/timelapse tests/type check and commit integration.

## Task 4: Add the control and verify the drawing flow

**Files:** `DrawingScreen.tsx`/`.test.tsx`, `tools/FillReferenceBar.tsx`/`.css`/`.test.tsx`, `i18n/strings/stickerCreation.ts`, and existing Fill browser tests.

**Interfaces:** Consume `useFillGapLevel`, `keepFillGapLevel`, `fillGapForLevel`. Add `gapLevel: FillGapLevel`, `onGapLevelChange: (level: FillGapLevel) => void`, and `gapSaveFailed: boolean` to existing `FillReferenceBar` props; retain reference props. No retry action — a failed save shows the notice only and clears on a later successful save.

- [ ] Test independently named native radio groups, five gap choices, initial level 3, keyboard/focus behavior, and English/Japanese accessible names. Displayed digits are data; accessible names use catalog copy.
- [ ] Test preference reaching canvas settings and surviving tool switches/new stickers/remount/restored drawings without pausing time. Do not add it to `keeper.keepTools` or `putBack`.
- [ ] Test `changeAfterFill`: old gap/storage until success; Fill failure changes neither choice nor storage.
- [ ] Test save failure: current choice works, `ErrorLine` shows while Fill is selected, state survives hiding/showing, and a later successful save clears it. No retry action.
- [ ] Confirm new tests fail, read required UI guidance, and add the row inside the existing control. Use an ordinary outer wrapper with two separate radio groups.
- [ ] Read preference beside device settings; apply changes through `changeAfterFill` before saving. Keep failure state in `DrawingScreen`; the next accepted level change saves through the same path and clears it.
- [ ] Add catalog entries below with required comments and keep help/errors inside the screen.

| Key under `stickerCreation.fillGap` | English                                                                              | Japanese                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `label`                             | Close gap                                                                            | 隙間閉じ                                                                                   |
| `level`                             | Level {{level}}                                                                      | レベル{{level}}                                                                            |
| `help`                              | Higher levels close larger gaps.                                                     | 数値が大きいほど、大きなすき間を閉じます。                                                 |
| `notKept`                           | This device couldn’t keep your close gap level, so it lasts until you close Croquis. | 隙間閉じのレベルをこの端末に保存できなかったため、クロッキーを閉じるまでの設定になります。 |

- [ ] Browser flow: choose level 2, record gap **3**, reload/resume, start another sticker, retain level 2. Add default level 3/gap 5 and level 5/gap 20 broken-outline/exterior checks against reviewed native fixtures. Verify one Undo per drag and recorded gaps after later preference changes.
- [ ] Check narrow/normal phones and iPads, both hands/languages, with Visible layers help, timer note, and save error. All choices stay reachable/in-screen with 44px targets. Capture one batched review and fix collisions.
- [ ] Run verification and focused branch review; commit UI/integration. Product execution requires the operator's instruction to proceed.

## Implementation verification

From the repository root after dependencies are installed and historical policy is settled:

```sh
pnpm --filter frontend test -- src/sticker-creation/canvas/fill-gap src/sticker-creation/canvas/fillGap.test.ts src/sticker-creation/drawingSettings.test.ts src/sticker-creation/tools/FillReferenceBar.test.tsx src/sticker-creation/DrawingScreen.test.tsx src/sticker-creation/canvas/fill.test.ts src/sticker-creation/canvas/fillGesture.test.ts src/sticker-creation/canvas/inkEngine.test.ts src/sticker-creation/canvas/fill-worker/core.test.ts src/sticker-creation/layers/layerInk.test.ts src/sticker-creation/session/keptSession.test.ts src/sticker-creation/sealing/timelapse.test.ts src/sticker-board/timelapse/fillSnapshots.test.ts
pnpm --filter frontend test:e2e -- fill.e2e.ts fillEngine.e2e.ts fillHistory.e2e.ts
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
pnpm exec oxfmt --check apps/frontend/src/sticker-creation apps/frontend/src/sticker-board/stat-board/TryPenPressure.tsx apps/frontend/src/sticker-board/timelapse/fillSnapshots.ts apps/frontend/src/sticker-board/timelapse/fillSnapshots.test.ts apps/frontend/src/i18n/strings/stickerCreation.ts apps/frontend/e2e/fill.e2e.ts apps/frontend/e2e/fillEngine.e2e.ts apps/frontend/e2e/fillHistory.e2e.ts apps/frontend/e2e/penMinimumWidth.e2e.ts docs/superpowers/plans/2026-10-13-fill-gap-levels.md
```

Passing requires zero fixed-raster native mask differences in the reviewed domain, relevant tests passing, successful type/lint/build/format commands, Chromium/WebKit gesture/replay checks, correct saved choices/operations, accepted historical replay behavior, and layout/performance checks. Physical LINE/iPhone retention/touch feel remain release checks. Do not claim native timing, all-settings equivalence, or final native RGBA parity.

## Verification performed for this plan

- Reviewed selection, worker/gesture callers, settings/storage, UI/catalog, replay, kept operations, and timelapse preparation. Confirmed current formats lack persistent historical selection geometry.
- Reviewed recovered presets, width conversion, bitmap evidence, and four successful native comparisons. They establish the gap-5 outline and recoloring differences, the two-pixel pocket difference, and exact agreement for the diagonal case. Eleven source fixtures validate, 32 observer checks plus six launcher checks pass, and seven bitmap/comparison tests pass. An initial verification invocation used a nonexistent `fixtures.test.mjs`; the documented `bitmap.test.mjs` and `compare_native.test.mjs` invocation then passed all seven tests. Product tests remain unavailable as recorded below.
- Extended native evidence with thirteen successful additional calls: eight larger-gap/edge/pocket/diagonal cases and five soft sources. Static tracing and endpoint ranking are checked against exact original bytes, with independently specified synthetic tie cases. Five watchdog-cleanup regressions demonstrated and fixed a research-recorder race; native stop causation remains unproven. Failed zero-call runs remain failures with explicit process recovery evidence, not algorithm measurements.
- Fresh root verification passed five cleanup regressions, 32 observer checks, six launcher checks, eleven bitmap/soft comparison tests, six tracing/segment extraction ranges, the complete 675-instruction endpoint analyzer with thirteen ranking and four nearest-point cases, and five soft sources/ten Croquis output checks. The exact research process remained resumed after cleanup; all scratch sources were closed without saving. Remaining research settings and controlled-input limitations are recorded in `CLEANUP.md`.
- Removed conservative mappings, default-gap-2 preservation, and old-algorithm acceptance expectations. Added native selection gates before UI and an explicit historical replay decision.
- Self-review checked mapping/types, storage/gesture/UI coverage, scale conversions, Review Focus tests, evidence limits, and dependencies. Independent review confirmed those decisions and identified the need to define mask bounds independently of native `SRect`; that interface and integration assertion are now explicit. No product, dependency, or deployment changes occurred; live research actions and cleanup are recorded separately.
- Product baseline Vitest previously could not run: dependency fetch failed DNS resolution to `registry.npmjs.org` and was stopped (exit 130); direct invocation exited 1 with `MODULE_NOT_FOUND` for `apps/frontend/node_modules/vitest/vitest.mjs`. No passing product tests are claimed.

## Unresolved before product execution

1. Remaining native fixture coverage, startup/local-window interactions, and native endpoint observations validating the recovered outline/segment/pair rules. Near-line seeds, gap-20 pocket, and narrow-off controls remain uncaptured.
2. Complete active native candidate predicate and edge writing: partial-alpha selection outcomes are measured at gap 10, but final native RGBA and natural timing remain unmeasured.
3. Historical replay policy: reviewed acceptance of regenerated changes or separately scoped selection-geometry migration.
4. Largest-gap browser performance/memory and physical LINE/iPhone checks after implementation.
