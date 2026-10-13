# Sticker Laminate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify and restore a physical-looking laminate across the complete sticker cut, including white line art, with tilt-driven light on iPad/phone and a timed gloss fallback only on devices without rotation input.

**Architecture:** Keep sticker data, silhouette masks, foil meaning, and original images. First compare a physically derived coating reference with a cheaper projected approximation; select one renderer from visual and device evidence. A single shared controller chooses held, rotation, or eligible timed light; no independent gesture sweeps or Shop oscillator remain.

**Tech Stack:** React, TypeScript, current cut/crease workers, a research-only coating reference and 2D candidate, Vitest, Playwright Chromium/WebKit, the existing iPadOS Safari harness.

**Spec:** `docs/superpowers/specs/2026-10-12-sticker-laminate.md`. Evidence and sources: `docs/research/sticker-laminate/README.md`.

**Status:** Proposed work; no product implementation executed. Task 1 qualifies the renderer and records exact production choices before Tasks 3–5. This plan does not declare the existing CSS architecture sufficient.

**Reported symptom:** On an iPad, a horizontal strip periodically disappears from the ashtray sticker. Its screen, browser/container, iPadOS version, sticker identity, and deployed build remain unconfirmed. Desktop browsers reproduce weak white contrast and unattended sway, not that disappearing strip.

## Global Constraints

- A cut mask alone determines laminate coverage; artwork RGB, artwork alpha, and ink density never determine reflection existence, coverage, or roughness.
- On iPad and phone, real device tilt is the only input for changing material light. A stationary device holds the last reflection after finite smoothing. Mouse, pen, and finger interactions never move it.
- The timed gloss wave is permitted only on devices without rotation input. It never runs on iPad or phone, including before permission, after denial, with a blocked API, or with missing readings.
- Reduced motion freezes material light. Backgrounding and releasing the last light owner stop pending material work.
- Existing sealed stickers remain gloss. Matte, glitter, prism, and other backing foils remain coming-soon Shop previews.
- Preserve pink foil precedence, Kyoto Seika Practice Mode foil selection, NSFW concealment, original pixels/hashes, and chain data.
- Use American English and project vocabulary. User-facing additions, if required, use the existing English/Japanese catalog and glossary; developer diagnostics stay English.
- Do not restore the removed dome assets or previous dome renderer.
- All diagnostic probes and checks have deadlines. Surface failures visibly and persistently; do not silently discard errors.
- Use isolated implementation work at execution time; preserve unrelated changes in the current checkout. Do not merge or deploy as part of this planning task.

## Review Focus

- White paper can pass a contrast test after being painted gray; require coherent optical reference behavior and readable line art.
- iPad can identify itself as Macintosh; permission denial, absent readings, and layout size must never enable its timed fallback.
- The current height alpha is nonlinear and includes the cut mask; differentiating it invents slopes and perimeter curvature.
- Fixed baked gloss can compete with the moving coat, especially on older stickers and the matte preview; preserve originals and qualify display treatment.
- The tray/pile are image-only; shared live changes do not automatically cover the affected presentation or concealed gifts.

## File responsibilities

Paths below are relative to `apps/frontend/` unless a full repository path is shown.

| Files                                                                          | Responsibility                                                                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `docs/research/sticker-laminate/` and new `e2e/stickerLaminate*`               | Controlled optical comparison, failing baseline, approved reference frames and behavioral regression     |
| `src/ui/deviceForLight.ts`, `src/stickers/lightMode.ts`                        | Conservative browser-fact classification and pure source-selection policy                                |
| `src/stickers/light.ts`, `src/ui/motionPermission.ts`                          | One shared source, existing permission flow, finite settling, lifecycle and coordinates                  |
| `src/stickers/LiveResin.tsx`, `live-resin.css`, `StickerFigure.tsx`            | Current integration boundary; selected renderer replaces its material implementation after qualification |
| `src/stickers/crease.ts`, `creaseWorker.ts`, `src/sticker-board/useCreases.ts` | Geometric slope representation and its object-URL lifecycle if selected rendering requires it            |
| `src/stickers/resinSheen.ts`, `stick.ts`, sweep callers                        | Delete event-driven detached light while preserving meaningful movement                                  |
| `src/shop/FinishPreview.tsx`, `ShopScreen.tsx`, `ShopScreen.css`               | Comparable finishes, shared policy, no local light loop                                                  |
| `DESIGN.md`                                                                    | Durable thin-film, full-cut, roughness, coordinate and capability requirements                           |

### Task 1: Qualify the coating and diagnose the affected iPad presentation

**Files:** Create `docs/research/sticker-laminate/material-reference.ts`, `material-reference.test.ts`, `material-comparison.html`, `material-comparison.ts`, `render-materials.cjs`, `renderer-decision.md`, and an `evidence/material-comparison/` folder. Create `apps/frontend/e2e/stickerLaminate.html`, `stickerLaminate.tsx`, and `stickerLaminate.e2e.ts`. Use the existing `render-current.cjs` as baseline evidence. Product renderer remains unchanged during this task.

**Interfaces:** Research input `MaterialReference` contains print, cut, draped geometric height, height-to-distance scale, sticker turn, virtual camera, environment, pose, coat index/roughness, and display transform. `renderMaterialReference(input: MaterialReference): MaterialFrame` returns separate coat contribution, transmitted-print contribution, cut coverage, and the final display image. Both candidate renderers consume identical input. The decision records one production renderer, exact source files/public props, calibrated material/environment constants, fallback period/path, browser image tolerances, and measured cost; do not proceed with multiple permanent alternatives.

- [ ] Identify the affected ashtray presentation/build and physical iPad/container/version when available. Record active material animations, usable orientation readings, crease presence, and replay state. Keep the device stationary; disable animation while retaining each layer, then hide layers individually. Determine whether print itself loses the horizontal strip. If access is unavailable, continue the independent reference work and record this device check as outstanding.
- [ ] Establish an identical diagnostic set: blank white, sparse black line art, gray fill, saturated and dense art; square and irregular/non-square cuts; flat plane, uniformly raised plane, and curved ramp. Show uncoated/gloss/matte at 120, 240, and 480 CSS px and at actual board/detail sizes.
- [ ] Implement the declared optical reference from the spec: one neutral area-light/environment, finite perspective camera, dielectric Fresnel response, roughness-dependent reflected directions, slope normals, and linear-light composition with a documented display transform. Treat print RGB as a calibrated displayed image, not measured albedo. Record film values as assumptions, not manufacturer measurements.
- [ ] Test the reference's properties before visual comparison: changing print with fixed cut/geometry leaves isolated coat contribution identical; a constant height offset leaves planar normals unchanged; a ramp changes normals by its slope; a white nonabsorbing reference under uniform white light remains uniform; reflection/transmission weights stay bounded. Do not differentiate the encoded height PNG.
- [ ] Implement the inexpensive 2D candidate using the same scene inputs, and compare it with the reference and current renderer. Capture default pose, slow opposite-direction tilts, stopping, reversal, 0°/90°/arbitrary sticker turn, and a ramp. Include one proposed smooth timed sequence solely in a diagnostic no-rotation state.
- [ ] Review still frames and the pose sequence as one batch. Require clear coating over blank paper, preserved line structure, distinct gloss/matte roughness, coherent ramp response, thin film rather than a dome/metal/gray paint, and no separate traveling flash. Make one consolidated correction batch, then confirm. If neither candidate qualifies, continue reference work rather than selecting CSS for convenience.
- [ ] Measure viable candidates with 12- and 48-sticker diagnostic boards on iPadOS Safari and the physical iPad, recording device scale, frame timings, memory and repeated mount/unmount behavior. These are diagnostic counts, not a product quota. Use a 60 Hz frame budget (16.7 ms) as a responsiveness target and compare with the same uncoated board. Test GPU resource loss/recovery if applicable; do not hide failures.
- [ ] Record which exposed image-only presentations need live coating versus a still appearance. The tray currently has no live laminate; if it is the reported presentation, include its extension in Task 5. Keep frosted sleeves and NSFW concealment intact.
- [ ] Build the production-figure regression fixture. It must import `installLight`, call `acquireLight()` while mounted, and release/uninstall on teardown; installation alone receives no readings. Use real production material CSS and synthetic orientation only inside this test page.
- [ ] Establish failing baseline tests: white-interior coat readability against the reviewed reference; stationary phone/iPad pixels at 0/5/11/22 seconds; tilt reversal before a former 760 ms sweep completes; stable pose after the 1,400 ms cooldown; full-cut isolated coat support. Initialize one orientation before a changed reading. Settle image decode, reveal, smoothing, crease and transitions; allow screenshot animations. Control CSS/Web Animation clocks and JavaScript time separately instead of sleeping through cycles.
- [ ] Use Node's built-in test runner for the isolated reference: `node --test docs/research/sticker-laminate/material-reference.test.ts` from the repository root. Run `node docs/research/sticker-laminate/render-materials.cjs` with a 60-second deadline and the named production-fixture Playwright cases in Chromium/WebKit. The current production fixture should fail for documented material defects, while reference invariants pass. Save complete outputs and captures.
- [ ] Write `renderer-decision.md` with evidence, approximation limits and exact selected contract/constants. Replace Task 4's conditional renderer boundary with that exact production change before executing it. Physical iPad access, visual review, and reference correctness are qualification gates; passing arbitrary pixel contrast is insufficient.
- [ ] Commit the isolated reference/decision/fixtures as one reviewable research change when their stated checks are satisfied.

### Task 2: Implement conservative motion-source selection and finite lifecycle

**Files:** Create `src/ui/deviceForLight.ts`, `deviceForLight.test.ts`, `src/stickers/lightMode.ts`, and `lightMode.test.ts`. Modify `src/ui/motionPermission.ts`, `motionPermission.test.ts`, `src/stickers/light.ts`, and `light.test.ts`; extend the fixture from Task 1.

**Interfaces:** `DeviceForLight = "phone-or-tablet" | "desktop" | "unknown"`; `RotationInput = "unknown" | "usable" | "unavailable"`; `LightMode = "still" | "device-tilt" | "fallback-wave"`. `deviceForLight({ userAgent, maxTouchPoints }): DeviceForLight` classifies facts conservatively; export the one authoritative `isAppleMobile` check for existing iOS permission logic. `lightMode({ device, rotation, permission, hasUsableReading, reducedMotion, visible, holders }): LightMode` is pure. `rotationInputForLight({ device, secureContext, orientationApi, sensorPolicy }): RotationInput` returns unavailable only for recognized desktop, secure context, explicitly absent orientation API and explicitly allowed accelerometer/gyroscope policy. API/policy facts have present/absent/unknown and allowed/blocked/unknown states; collect explicit policy allowance from the browser policy API, otherwise keep unknown. Keep `MotionPermission` unchanged; expose `getMotionPermission(): MotionPermission` and `subscribeMotionPermission(listener: () => void): () => void` from its existing store if the controller needs them. Keep `installLight`, `acquireLight`, `useLight`, and `lightUp` public contracts.

- [ ] Write failing table tests for iPhone/iPad/iPod/Android, iPad Macintosh+touch, mobile requesting desktop content, unknown/touch desktop, and recognized zero-touch desktops. Width, hover, pointer and `userAgentData.mobile === false` must never prove no rotation.
- [ ] Pin mode priority: hidden/no-owner/reduced-motion and explicit denial freeze held light; usable or previously observed orientation selects rotation even if remembered permission is unasked; unasked with no usable reading stays still; only recognized desktop plus explicit unavailable input, granted/not-needed permission and no prior reading allows fallback; every other state is still. Capability observation continues to exclude fallback even if the pose is frozen. Test usable+unasked, usable+denied, usable+reduced-motion, and first reading during reduced motion explicitly.
- [ ] Add tests that no events, all-null/nonfinite readings, blocked API, and the permission store's one-second check never promote any device into fallback. Phone/tablet remains permanently excluded even if its orientation API is absent. In browser-derived eligibility, mark a recognized desktop unavailable only only when `isSecureContext` is true, accelerometer/gyroscope policy is explicitly allowed and the orientation interface is explicitly absent; present-but-silent/all-null remains unknown. Pin insecure, blocked/unknown policy and uncertain interface facts; none authorizes fallback.
- [ ] Run `pnpm --filter frontend exec vitest run src/ui/deviceForLight.test.ts src/stickers/lightMode.test.ts src/ui/motionPermission.test.ts src/stickers/light.test.ts` and confirm the new policy tests fail on missing/current behavior.
- [ ] Extract the existing Apple-mobile check without changing its permission behavior. Implement the pure classifier and mode policy. Document that browser capability cannot certify physical hardware absence; uncertain devices stay static. Never turn permission failure or elapsed time into eligibility.
- [ ] Implement one shared fallback clock in `light.ts` using the qualified period/path from Task 1. It changes the same material pose used by rotation; no per-figure/Shop animation. New mounts sample the current phase. A usable orientation reading cancels fallback permanently for the document. Keep pointer input ignored.
- [ ] Add tests for late mounts, transition from fallback to rotation, later silence, last-owner release during interpolation, hiding, reduced-motion activation during motion, and resume. Assert no queued writes while inactive; preserve held pose and paused fallback phase. Rotation devices resume at the held pose until a new reading. Keep baseline smoothing values unless Task 1 demonstrates a required adjustment.
- [ ] Run the focused unit tests and named controller-only policy/lifecycle cases in both browser projects. Assert that still mode preserves published light rather than clearing variables. Production appearance/sway and Shop cases remain expected failures until Tasks 3–5; list those failures rather than requiring the full suite to pass here. Confirm the policy/lifecycle checks pass; record remaining physical delivery limits. Verify actual orientation after the existing iOS prompt before changing permission requests.
- [ ] Commit the verified shared policy and lifecycle change.

### Task 3: Remove independent light effects while preserving sticker movement

**Files:** Modify `src/stickers/light.ts`, `light.test.ts`, `live-resin.css`, `LiveResin.tsx`, `StickerFigure.tsx`, `sticker-figure.css`, `stick.ts`, `src/sticker-board/StickerBoard.css`, `useBoardGestures.ts`, `timelapse/useTimelapse.ts`, `useTimelapse.test.tsx`, `src/sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.test.tsx`, and `src/receiving/receive-gift-dialog.css`. Delete `src/stickers/resinSheen.ts` after its last caller is removed.

**Interfaces:** Keep `playStick` and timelapse completion/cancellation interfaces. Remove `.live-resin__sheen` and `.sticker-figure__sweep` event overlays; the timed fallback is the controller branch from Task 2, not these elements. Preserve seal-result gating, laminate application, flight, pickup/drop and unpackaging transitions.

- [ ] Add failing integration assertions that pickup/drop, replay finish, final sealing landing and receiving reveal produce no detached surface sweep, with phone/iPad facts and held light.
- [ ] Run `pnpm --filter frontend exec vitest run src/stickers/light.test.ts src/sticker-board/timelapse/useTimelapse.test.tsx src/sticker-creation/sealing/SealCeremony.test.tsx` plus the corresponding browser fixture cases; establish the current sweep failures.
- [ ] Remove `live-resin-sway` declarations/keyframes, board pause/reset rules, threshold/cooldown sweep state/constants, both sweep overlays, and every caller listed in the research trigger table. Remove receiving's delayed sweep keyframes. Preserve legitimate animation clocks in `keepAnimations.ts`.
- [ ] Remove sealing's required `.live-resin__sheen > b` lookup and its `swept` state, and the required sheen helper in timelapse tests. Confirm absent deleted elements cannot throw or prevent completion. Retain skip/error/cancel behavior and the ceremony's actual film application.
- [ ] Remove unused functions/classes/constants and delete `resinSheen.ts`. Search the exact obsolete identifiers and inspect every remaining reference; do not leave dormant old behavior.
- [ ] Run the focused unit tests and named existing-figure motion integration cases in Chromium/WebKit. Confirm stationary mobile figure checks pass while eligible desktop uses the qualified fallback from Task 2. Optical reference and Shop cases remain expected failures until Tasks 4–5; report them separately.
- [ ] Commit the verified removal separately from the material rendering change.

### Task 4: Integrate the qualified full-cut coating and geometric coordinates

**Files:** The renderer decision from Task 1 specifies exact new renderer files and replaces the material internals of `src/stickers/LiveResin.tsx`/`live-resin.css` (or replaces those files outright). Modify `src/stickers/StickerFigure.tsx`, `StickerFigure.test.tsx`, `light.ts`, `light.test.ts`, `src/sticker-creation/sealing/SealCeremony.tsx`, and the regression fixture. For slope data, modify `src/stickers/crease.ts`, `crease.test.ts`, `creaseWorker.ts`, `src/sticker-board/useCreases.ts`, its tests and lifecycle tests. Update all `CreaseImage` fixtures and object-URL maps.

**Interfaces:** At qualification, pin one coat component contract carrying cut source, selected gloss/matte material, sticker turn, actual rendered dimensions, and optional geometric normal/height representation. Default sealed stickers to gloss. Preserve `StickerFigure` callers unless an explicit optional material/geometry prop is needed; its existing `turn` must reach the coat. If a normal PNG is selected, add `"normal"` to `CreaseImage` and propagate it through worker replies, `Crease`, URL creation/revocation and tests; derive it from the floating-point field before alpha masking. Do not execute this task until Task 1 replaces this boundary with exact props, files and constants.

- [ ] Write failing approved-reference tests across white/line-art/gray/saturated art, gloss/matte, flat/raised/ramp geometry and actual presentation sizes. Assert identical isolated coat contribution after changing artwork, mask support, and reviewed shape/motion; use tolerances measured in Task 1 rather than the discarded four-level/10% rule.
- [ ] Add coordinate failures for portrait and both iPad landscape directions; equally oriented gravity expressed in rotated screen axes; square/non-square cuts at 0°/90°/arbitrary turns. Assert one environment in screen space and matching crease direction.
- [ ] Run the focused unit/reference checks and browser cases to establish current material/coordinate failures.
- [ ] Implement only the qualified renderer, with exact parameters and declared approximation limits. Replace the old material, do not retain it as a compatibility renderer. Preserve print/cut/foil/concealment. If a GPU source is used, implement the qualified shared resource allocation, bounded texture loading and persistent recovery diagnostics.
- [ ] Produce required geometric normals from the draped floating-point field with the qualified distance scale. Do not derive slopes from `h/(h+1)*coverage`, artwork, or the existing tone-normalized `gx`/`gy`. Use raw field differences divided by spatial distance and the qualified thickness scale; unchanged plateau normals may still have legitimate camera/source parallax. Test constant height, ramp direction, mask edge, quantization and URL cleanup.
- [ ] Map gravity through screen orientation, then transform the coat/crease into sticker-local coordinates with non-square scaling. Keep wrap/tremor behavior. Update the direct seal component with its actual changing container turn and final `LANDED_TURN_DEG`; verify during flight as well as at rest.
- [ ] Review recent and older sealed images for fixed competing gloss, plus matte on the same image. If a conspicuous baked highlight prevents qualification, stop this release path and write the separate unlit-display derivative plan described in the spec before storage changes. Preserve original-image tests and hashes.
- [ ] Run approved visual cases and `pnpm --filter frontend exec vitest run src/stickers/StickerFigure.test.tsx src/stickers/light.test.ts src/stickers/crease.test.ts src/stickers/creaseBatch.test.ts src/sticker-board/useCreases.test.ts src/sticker-board/useCreases.lifecycle.test.ts src/sticker-creation/sealing/stickerPasses.test.ts`. Confirm geometric/material cases pass and unchanged sealed-image invariants remain.
- [ ] Commit the qualified material/coordinate integration with its evidence.

### Task 5: Apply the shared material to Shop and verify complete presentation behavior

**Files:** Modify `src/shop/ShopScreen.css`, `ShopScreen.tsx`, `FinishPreview.tsx`, `FinishPreview.test.tsx`, `src/stickers/light.ts` as needed for qualified preview layers, `e2e/shop.e2e.ts`, `stickerLaminate.e2e.ts`, `scripts/ipadSafari.ts`, and `DESIGN.md`. If Task 1 requires exposed-tray coating, modify `src/sticker-board/tray/traySheets.ts` and its integration tests as an explicit part of this task.

**Interfaces:** `ShopScreen` owns shared light through `useLight()`; previews consume the qualified coat and mode. Existing finish availability/purchase props remain unchanged. Preview films/haze either use the chosen material source or are replaced as specified by the qualification; do not stack the old matte wash over a new coat. Exposed tray extension, if required, uses the same material contract and ownership rather than a second implementation.

- [ ] Add failing Shop cases for stationary phone/iPad, one eligible desktop phase, unknown desktop static state, shared held light for every finish, and gloss/matte comparison over white. Include explicit user-agent/touch facts; `e2e/ipad.ts` currently sets layout/touch but not an iPad user agent.
- [ ] Run the Shop cases and confirm the unconditional five-second preview loop is detected.
- [ ] Delete `--finish-lx/--finish-ly` registration/keyframes, local loop declarations, important light overrides and the preview-only `transition: none` rules that assumed a continuous local clock. Replace hidden-gloss/desaturation/white-fog matte with the qualified roughness response. Preserve coming-soon state and current purchases.
- [ ] Apply the shared current light/mode to gloss, matte and other preview layers; initialize late mounts and honor reduced motion. Update `DESIGN.md` to describe full-cut optical response, roughness, held mobile light, conservative no-rotation fallback and no Shop exception.
- [ ] Verify own/other Sticker Boards, detail, lifted Explore, revealed receiving, sealing and Shop, with plain/holo/Kyoto Seika Practice Mode/pink foil. Exercise reorder, sharp swap, replay finish, board flip, pickup/drop, background/resume and NSFW opt-in/concealment. Complete agreed image-only presentation work before claiming coverage.
- [ ] Run focused frontend tests, `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint`, and Playwright `stickerLaminate.e2e.ts foil.e2e.ts crease.e2e.ts shop.e2e.ts timelapse.e2e.ts sealPreview.e2e.ts` in Chromium/WebKit. Use database-isolated E2E configuration and deadlines; inspect complete failures.
- [ ] Extend the iPadOS Safari simulator checks with full material at actual device scale and large/rotated/ramped cuts; test denied/absent/silent mobile rotation states. Assert stationary print/material do not lose a horizontal row after settling. Run `pnpm --filter frontend test:ipad-safari` with a deadline and save failures. Desktop WebKit is insufficient for this symptom.
- [ ] Review the exact ashtray sticker on the physical iPad through a former 22-second cycle, slow tilt/stop/reversal, and detail reopen. Require held light, legible white-paper coating and no periodic missing strip/gray flash. If print clipping remains after decorative motion is removed, reproduce and fix that separate rendering defect before claiming the reported symptom resolved.
- [ ] Repeat the populated-device cost/recovery checks from Task 1 for the integrated renderer. Confirm fixed-image compatibility and record any image-only or physical-device limit explicitly.
- [ ] Obtain independent implementation review before merge/deploy. After a merged fix, retain concise durable material rules and remove completed plans/specs under the repository's cleanup policy.

## Planning self-review and handoff

Every spec requirement maps to these tasks: optical model/qualification and affected-presentation scope → Task 1; device/permission/fallback/lifecycle → Task 2; unrelated sweeps → Task 3; full-cut coating, geometry, orientation and baked appearance → Task 4; Shop, all presentations, concealment, real iPad strip and final verification → Task 5. The five review-focus conditions each have an explicit check.

The plan intentionally makes renderer selection an evidence-producing first task. It does not present a CSS gradient or the former resin overlay as a completed solution. Task 4 cannot be executed from a guessed contract: Task 1 must record and incorporate the exact qualified implementation choices first.

The authorized deliverable is research, spec and planning. No implementation, merge or deployment is claimed. The exact iPad strip, physical appearance, renderer cost, browser capability classification and fixed-image compatibility require the recorded gates before a future fix can be called complete.
