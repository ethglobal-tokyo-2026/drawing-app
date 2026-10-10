# Croquis pen pipeline: implementation handoff

Read-only source audit on 2026-10-09. No app files were changed and no app test suite was run. The audited source checkout reports HEAD ebe0d143f134d7e28cd2da386044a8327f0fe10b. Exact commands and numbered source output, including the constants below, are in [croquis-source.txt](evidence/croquis-source.txt). Source line numbers refer to that snapshot.

“Existing” below means observed in Croquis source. “Recovered” means reported by the separate installed-CSP static-analysis artifacts; this audit did not independently trace that executable. “Recommendation” means a proposed integration choice, not an existing behavior or proof of equivalence to CSP.

The user has since specified that the current stabilizer is replaceable and that the CSP reconstruction should guide its replacement. Existing filter behavior below is historical context for locating the integration boundary. It is not a behavior-preservation requirement. The [follow-up replay](spikes/croquis-replay/README.md) uses actual Croquis classes to isolate spacing, curve, and repaint effects that would still matter after replacing the filter. That report records its later checkout and per-file hashes separately from this source audit.

## Existing input-to-pixels path

    browser pointerdown / pointermove / pointerup
      -> CSS client position converted to fixed sheet coordinates
      -> move samples queued in supplied order, coalesced when available
      -> requestAnimationFrame drains every queued sample
      -> One Euro x/y filter at sample timestamps
      -> pressure/speed width model, spatial minimum-step rejection
      -> centripetal Catmull-Rom interpolation with one-key lookahead
      -> adaptively flattened [x, y, width, elapsed-ms] points
      -> incremental opaque brush / destructive eraser canvas capsules
      -> on termination: filter catch-up, curve settle, pen tail repaint
      -> history.commit, onCommit, session storage, sealing/timelapse

The React boundary constructs InkSurface and InkEngine in [DrawingCanvas.tsx:103](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/DrawingCanvas.tsx:103), attaches the native listeners at line 113, and copies current settings to the engine at line 158. Filtering and painting do not require React renders.

### Coordinates and timing

- [inkEngine.ts:315](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:315) caches the paper origin and scale when the stroke starts. [inkEngine.ts:513](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:513) defines scale = paper CSS width / sheet width; line 522 uses x = (clientX - left) / scale and y = (clientY - top) / scale. Device pixel ratio is not multiplied into the input.
- [sheetFrame.ts:10](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/sheetFrame.ts:10) defines the short side as 374 sheet units. Frame construction follows the available aspect ratio; the frame becomes fixed at the first mark in [inkEngine.ts:590](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:590). CSS resizing thereafter changes presentation rather than coordinates. Raster density belongs to InkSurface, which applies its transform in [inkSurface.ts:57](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkSurface.ts:57).
- Pointer timeStamp is in the pipeline's millisecond clock. The filter converts intervals to seconds; the width speed model uses sheet units per millisecond. StrokeBuilder stores each output time as rounded t - initial t; op.T separately stores the session start time. See [brush.ts:204](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:204), [brush.ts:210](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:210), and [ops.ts:4](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/ops.ts:4).
- The origin remains the one captured at pointerdown for that stroke. Any future view transform integration must explicitly decide whether transforms may change during a stroke.

### Browser event handling and frame batching

[inkEngine.ts:207](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:207) attaches pointerdown, pointermove, pointerup, pointercancel, lostpointercapture, and pointerleave. This engine does not register pointerrawupdate. Its PointerInput interface at line 93 exposes getCoalescedEvents but no prediction method.

[inkEngine.ts:348](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:348) obtains getCoalescedEvents() when available. A nonempty coalesced array replaces the enclosing event; otherwise the enclosing move event is the sample. Each sample contributes x, y, pressure, and timeStamp. The code does not sort or resample these samples. It schedules one outstanding frame and later drains every queued sample at [inkEngine.ts:647](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:647). It does not collapse the frame's queue to its last point.

The first dot paints synchronously at pointerdown, [inkEngine.ts:627](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:627). Frames thereafter paint only the newly appended output points, lines 632–677.

Predictions are a diagnostic distinction: [performanceRecorder.ts:595](/Users/adoll/projects/drawing-app/apps/frontend/src/performance/performanceRecorder.ts:595) records the count of predicted events, but InkEngine does not feed them into geometry. [e2e/pen.ts:171](/Users/adoll/projects/drawing-app/apps/frontend/e2e/pen.ts:171) can create synthetic predicted events for the test pointer. This does not imply the renderer consumes them. Searches also covered the frontend HTML, public files and existing dist assets; no production raw-update input path was identified. The source engine remains the authority for this handoff.

### Exact current One Euro math

Source: [stabilizer.ts:7](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:7), [stabilizer.ts:44](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:44), and [stabilizer.ts:125](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:125). These equations restate the source; the evidence file includes the exact numbered output.

For Smoothing s:

    q = clamp(s / 100, 0, 1)^2
    q == 0: return the unfiltered x/y sample
    f_min = 1000 / (2*pi*170*q)                  // Hz
    beta = f_min / (2000*q)
    alpha(f, dt) = 1 / (1 + 1/(2*pi*f*dt))       // dt in seconds

For a new raw position r, previous raw position r_prev, filtered position p, and smoothed velocity v:

    a_v = alpha(4, dt)
    v.x += a_v * ((r.x - r_prev.x)/dt - v.x)
    v.y += a_v * ((r.y - r_prev.y)/dt - v.y)
    a_p = alpha(f_min + beta*hypot(v.x, v.y), dt)
    p.x += a_p * (r.x - p.x)
    p.y += a_p * (r.y - p.y)

The same scalar cutoff serves both axes. Pressure does not enter Stabilizer. The default Smoothing is 35.

[stabilizer.ts:93](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:93) updates the stored interval and filter time only when the new timestamp is greater than the filter's current time. Equal/older timestamps reuse the prior positive interval; the initial interval is 1000/60 ms. The filter starts at the initial position with zero velocity.

### Pressure, width and sample rejection

The queue's pressure bypasses position filtering and reaches StrokeBuilder directly at [inkEngine.ts:652](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:652).

[brush.ts:174](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:174) rejects a new geometric key when its filtered position is less than 0.5 sheet units from the last curve key. This return happens before pressure recognition and width updates. Pressure-only changes at a stationary position therefore do not become new keys through this method.

Exact width functions are at [brush.ts:9](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:9) and [brush.ts:53](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:53):

    size = 1.5 + 46.5*railValue^2
    pressure exponent e: light=0.5, normal=0.75, firm=1.25
    for p <= 0.5:
        W(p) = 0.28 + 0.72*p^e
    for p > 0.5:
        h = 0.28 + 0.72*0.5^e
        rise = 0.2*h
        slope = 0.72*e*0.5^(e-1)
        a = clamp((p-0.5)/0.5, 0, 1)
        W(p) = h + rise*(1-(1-a)^(slope*0.5/rise))
    pressure Off: W(p) = 1
    speed width = clamp(1.12 - 0.15*speed, 0.68, 1.1)

A pen is recognized as pressure-sensitive when an accepted key differs from the first pressure by more than 0.01, or the engine has already recognized pressure variation on a prior stroke. Until then it uses the speed path. For positive pressure after recognition, the builder averages its last two pressure-derived widths; on first use that history is seeded by the current smoothed width. Nonpositive pressure keeps the previous width. Pressure Off and non-pressure input use a 0.7 previous + 0.3 target width update when a raw nib accompanies the key.

Speed uses the raw nib displacement and raw sample time since the last accepted builder key, not the filtered path speed. Catch-up supplies nib=null, so it does not fabricate raw speed. However positive pen pressure still takes the width-history branch during such calls; “keeps width” is exact for the speed branch and is the intended pen behavior once its width history has settled.

Pen taper multiplies width by 0.35 + 0.65*min(1, reach/8). Initial reach is the maximum radial displacement from the first point, not accumulated arc length. Touch/mouse taper is min(1, 0.6 + 0.08*accepted-key count). Erasers keep full size. The pen tail narrows afterward along the final curve over its last 8 units, [brush.ts:229](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.ts:229). Pressure Off still participates in the pen taper; “Off” disables pressure response, not endpoint taper.

### Curve lookahead and flattening

[strokeCurve.ts:83](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/strokeCurve.ts:83) waits until there is a point after a span before emitting that span. Thus Smoothing=0 bypasses One Euro but still retains builder spacing, width behavior, and one-key curve lookahead.

[strokeCurve.ts:110](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/strokeCurve.ts:110) builds a centripetal Catmull-Rom span P1→P2 with mirrored neighbors outside the run. It uses:

    d0 = max(sqrt(length(P1-P0)), 1e-6)
    d1 = max(sqrt(length(P2-P1)), 1e-6)
    d2 = max(sqrt(length(P3-P2)), 1e-6)

    tangent(pa,pb,pc,da,db)
      = d1/3 * ((pb-pa)/da - (pc-pa)/(da+db) + (pc-pb)/db)

    B0 = P1
    B1 = P1 + tangent(P0,P1,P2,d0,d1)
    B2 = P2 - tangent(P1,P2,P3,d1,d2)
    B3 = P2

The expression applies componentwise. De Casteljau subdivision at the midpoint continues while 0.75 times the largest inner-control-point distance to the chord segment exceeds 0.25 sheet units, bounded by six halvings. Width and time interpolate linearly in the resulting Bézier parameter; time is rounded. These are separate approximations from input stabilization.

### Pause, pen-up and cancellation

[inkEngine.ts:662](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:662) begins hold catch-up after 40 ms without an input sample, on frames whose queue is empty. [stabilizer.ts:103](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:103) limits each hold step to 1000/60 ms and snaps to the nib below a 0.1-unit gap. Filter time is then set to the frame time. Once the filter is settled, the curve is settled to the endpoint.

[inkEngine.ts:584](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:584) takes the pointer-up position but does not update live pressure or time from the up event. Termination drains pending moves, calls finish with the final x/y, supplies the last move/down pressure to builder catch-up, settles the curve, and paints.

[stabilizer.ts:113](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.ts:113) adds a changed endpoint using the existing filter time, then runs synchronous 8-ms synthetic holds, bounded by 1000 steps, and snaps to the endpoint if still unsettled. These times are stored in the op through StrokeBuilder; terminal output can extend past the actual input end time.

Cancellation keeps a sufficiently traveled stroke and discards a shorter one using the 4-unit moved threshold in [inkEngine.ts:585](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:585). A discard rebuilds committed history. A forced finish (e.g. time expiration) calls the same terminal path at [inkEngine.ts:397](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:397).

## Existing pixels, history and storage: correction constraint

[paintStroke.ts:44](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/paintStroke.ts:44) fills the union of variable-radius capsules. Brush composite is source-over; eraser is destination-out. Changing already-painted coordinates cannot move their pixels or recover pixels already erased.

Croquis already solves the narrower version of this problem for pen brush tails: [inkEngine.ts:605](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:605) snapshots the canvas before the first dot, and [inkEngine.ts:703](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:703) restores that snapshot and repaints the entire final stroke if taperEnd changed it. The snapshot currently covers pen brush strokes only, excluding eraser, touch, and mouse.

The final corrected op must be visible before [inkEngine.ts:712](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:712) commits history and invokes onCommit. History.commit records an already-visible operation and may take a checkpoint, [history.ts:72](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/history.ts:72), [history.ts:178](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/history.ts:178). Correcting afterward could leave the canvas, checkpoints and saved data inconsistent.

StrokeOp stores x/y/width/time only, not raw pressure, source correspondence or cubic controls. Session storage writes those ops to IndexedDB, [keptSession.ts:278](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/session/keptSession.ts:278). Timelapse encoding consumes the finalized points at [sealing/timelapse.ts:51](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/sealing/timelapse.ts:51); the player uses their times at [timelapseSchedule.ts:49](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-board/timelapse/timelapseSchedule.ts:49). Preserve one finalized operation as the source for all of these consumers.

## Existing controls, localization and persistence

- Smoothing's range is 0–100, integer steps, with native change committing on release; input only changes the slider's visual progress. See [SmoothingBar.tsx:24](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/tools/SmoothingBar.tsx:24), line 53. The tool button is [ToolStrip.tsx:135](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/tools/ToolStrip.tsx:135).
- Default comes from FIRST_SMOOTHING in [DrawingScreen.tsx:176](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/DrawingScreen.tsx:176). Smoothing is held in screen state, saved with the active drawing using keeper.keepTools at line 221, restored at line 635. It is not the device pressure setting. [keptSession.ts:575](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/session/keptSession.ts:575) validates the stored range, while keepTools at line 272 writes the session record when eligible. That record lives in localStorage alongside session metadata.
- Opening Smoothing pauses the active drawing clock, [DrawingScreen.tsx:860](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/DrawingScreen.tsx:860). An open panel consumes a sheet press to dismiss it, [inkEngine.ts:302](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.ts:302).
- Catalog: Smoothing / 手ぶれ補正, [stickerCreation.ts:199](/Users/adoll/projects/drawing-app/apps/frontend/src/i18n/strings/stickerCreation.ts:199); Raw / 弱 and Smooth / 強, line 316. New user-visible controls need both languages and the catalog comments required by AGENTS.md.
- Pen pressure is a device setting under draw.penPressure, default normal, [drawingSettings.ts:31](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/drawingSettings.ts:31). Settings choices and persistence error reporting are [PencilSettings.tsx:19](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-board/stat-board/PencilSettings.tsx:19); catalog entries are [stickerBoard.ts:261](/Users/adoll/projects/drawing-app/apps/frontend/src/i18n/strings/stickerBoard.ts:261), and glossary terminology is [glossary.md:24](/Users/adoll/projects/drawing-app/apps/frontend/src/i18n/glossary.md:24).
- The Try it pressure strip shares StrokeBuilder and paintStroke, but directly feeds coalesced events without InkEngine or Stabilizer, [TryPenPressure.tsx:103](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-board/stat-board/TryPenPressure.tsx:103), line 120. A brush API change must update this caller too; do not assume it inherits engine filtering.

## Recovered CSP behavior relevant to integration

The detailed artifacts are [live-analysis.md](live-analysis.md) and [post-analysis.md](post-analysis.md). Their saved assembly addresses and verification output are the source for these recovered claims. The abbreviated formulas here describe the ordinary arithmetic; use the detailed analyses for branch conditions and floating-point conversions.

- In successful ordinary averaging with finite H>=1, the identified live queue averages x, y and pressure together using a fractional oldest sample. Newest-first records Q and window H give m=floor(H), r=H-m, output=(sum(Q[0:m])+r*Q[m])/H. Missing usable history is filled by repeating its last usable sample. This is a packet-count filter, unlike Croquis's dt-dependent One Euro implementation.
- The recovered queue has setting-dependent startup/window adjustment, speed options, pressure decline/zero-crossing termination and a repeated-terminal-input flush. A Croquis adapter that averages x/y but leaves pressure and its current finish method untouched is a hybrid, not reproduction of that queue.
- The offline PWVectorSmooth path retains source correspondence while deleting/reconstructing geometry. Its ordinary enabled positional tolerance is 0.1*k², optionally multiplied by 100/M, with additional conditional behavior described in the artifact. The recovered transform evidence supports M as view magnification percent. Mapping this into Croquis sheet units still requires an explicit adapter; do not copy a CSP coordinate constant as CSS pixels.
- Its scalar bounds use ratio=min(1.2+0.1*k,3.0), floor=min(0.05+0.01*k,0.3). For source scalar q: lower=0 when q<floor else q/ratio; upper=max(q*ratio,floor). The artifact establishes the node/scalar layout but does not fully establish the scalar's original event-property identity. Croquis's stored width is already nonlinear and tapered, so substituting width for that scalar is a product adaptation unless further evidence proves it appropriate.
- The recovered procedure is not merely the current Catmull-Rom interpolator with a larger setting. Corner classification, original-geometry error checks, reconstruction and terminal behavior must stay distinct from live averaging.
- Direct translated-label associations, every surrounding path/state branch, and end-to-end runtime equivalence remain outside what these artifacts prove. Do not call an implementation an exact CSP clone based only on this audit.

## Recommendations: concrete integration boundaries

1. Keep input acquisition, palm recognition and drawing coordinates in InkEngine. Build a pure sample-processing unit called from its feed/terminal boundary, with explicit x, y, pressure, input time and stroke phase. Capture pointer-up pressure and time if reproducing the recovered queue's ending rules. Do not silently reinterpret the existing finish(x,y) result as equivalent. Preserve the original nib separately for Croquis's speed-width path.

2. Replace the current filter with a sample-processing implementation based on the recovered CSP queue. Evaluate it independently from Croquis's curve and width behavior using the completed external replay harness. Keep the old filter only as historical comparison evidence; do not retain duplicate production implementations. A mapping from the current Smoothing slider to CSP S/T/H settings still needs calibration; it is not recovered arithmetic. Public control wording and new settings need a UI decision.

3. For offline correction, retain the necessary per-stroke source geometry and scalar before it is flattened, rather than trying to reconstruct them from final capsules. Put correction after live sample completion and before final output flattening/taper/history commit. A first implementation may preserve current StrokeOp storage by converting the corrected geometry to its existing point format. If corrected cubic controls are already authoritative, evaluate those controls directly rather than feeding them as keys through another Catmull-Rom pass.

4. Generalize the existing pre-stroke snapshot/restore flow for every tool/input combination to which correction will apply, or use an isolated live-stroke layer with correct eraser compositing. Restore the prior raster, paint the corrected terminal operation, then commit once. Extend snapshot ownership to success, cancel, forced finish, errors and disposal. Do not erase the original path by painting transparent capsules: that can destroy earlier strokes underneath it.

5. Decide pressure ordering explicitly. Recovered pressure averaging before a nonlinear width curve differs from Croquis's averaging of resulting widths. Keeping both adds filtering. Preserve raw pressure separately from the scalar after response/startup treatment, and retain the derived movement/time factor before flattening. The [post-contract spike](spikes/post-contract/findings.md) traces both scalar writers; a raw pressure or raw velocity substitute is not established as equivalent. Choose the production pressure/taper policy deliberately.

6. Preserve settings and replay contracts. New control state belongs beside KeptTools if it is per drawing, or in drawingSettings if deliberately per device. Keep stroke settings fixed at stroke start. Make terminal output times finite and nondecreasing; decide how synthetic flush time maps to timelapse time rather than accidentally extending playback. If correction is asynchronous, sealing and history must wait for finalization and failures must remain visible.

## Verification and acceptance criteria

Existing tests to inspect and extend:

- Filter jitter suppression, speed/lag behavior, raw bypass, initial movement, hold, final endpoint and monotonic times: [stabilizer.test.ts:63](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/stabilizer.test.ts:63).
- Width response, pressure detection, taper, minimum spacing and sparse-curve shape: [brush.test.ts:103](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/brush.test.ts:103).
- Commit, live lag/hold, width during catch-up, pointer modes, cancellation-related gestures and coordinate scaling: [inkEngine.test.ts:223](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/canvas/inkEngine.test.ts:223), line 493. The injected frame callback at line 104 provides a useful deterministic harness.
- Slider commits and restored values: [SmoothingBar.test.tsx:36](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/tools/SmoothingBar.test.tsx:36); settings persistence: [keptSession.test.ts:162](/Users/adoll/projects/drawing-app/apps/frontend/src/sticker-creation/session/keptSession.test.ts:162).
- Real canvas browser behavior: [pencil.e2e.ts:118](/Users/adoll/projects/drawing-app/apps/frontend/e2e/pencil.e2e.ts:118), line 146. Current Playwright configuration runs Chromium and WebKit. The synthetic pointer helper is not a measured hardware trace.

Recommended acceptance tests:

- Replay identical timestamped samples through each candidate and independently measure live endpoint gap, spatial jitter, corner preservation, terminal displacement, pressure lag and output time. Use slow lines, accelerated flicks, corners, loops, taps and pressure ramps. Record measured results; no unverified target values are supplied here.
- Verify the recovered arithmetic against small hand-computable windows, including integer/fractional H, short history, constant inputs and the documented terminal branches. Compare those expectations independently from the implementation, rather than calculating the expected result by calling its helper.
- Deliver the same stream singly and in different coalesced/frame batches: identical input order and timestamps must produce identical finalized geometry when the selected policy is input-driven. Test genuine idle holds separately, because current frame-based hold behavior deliberately introduces additional processing.
- Vary packet rate while keeping the physical path/time comparable. Quantify the rate dependence expected from the recovered packet-count kernel; do not claim time invariance. For a fixed integer window H on a uniform stream, its theoretical steady-state group delay is (H-1)/2 sample intervals; this is an analytical comparison, not a measurement of CSP.
- Ensure smoothing bypass identity at the filter boundary, while acknowledging that Croquis's builder and curve still transform later geometry. Check separate contributions from the curve lookahead and raster presentation.
- For offline correction, verify source-correspondence error limits and scalar constraints, protected corners, endpoints and bounded pass termination. A generic three-point simplifier is insufficient evidence for the recovered algorithm.
- Pixel regression: final on-screen raster must equal replay of finalized ops from the same prior image. Cover a correction over existing colored ink, intersections, eraser, undo/redo, cancel, and forced finish/sealing. This catches stale pixels that point-array assertions miss.
- Save/reload and timelapse roundtrip must preserve the final visible stroke and monotonic timing; ensure no provisional geometry is persisted or checkpointed.
- Exercise control changes in both languages, slider release behavior, saved-session restoration and pressure Try it. Perform the first hardware comparison on a Mac drawing tablet or pen display, matching the analyzed CSP platform. Follow with iPad Safari validation for the browser/device adaptation; measure rather than infer the feel from synthetic browser input.
- Use the existing performance recorder's ink paint/replay/snapshot labels to compare frame and terminal costs on target devices. Set any acceptance budget from a measured baseline before calling a performance regression acceptable.

Relevant commands for the implementing agent, from repository root (not executed during this read-only audit):

    pnpm --filter frontend test src/sticker-creation/canvas/stabilizer.test.ts src/sticker-creation/canvas/brush.test.ts src/sticker-creation/canvas/inkEngine.test.ts
    pnpm --filter frontend test src/sticker-creation/tools/SmoothingBar.test.tsx src/sticker-creation/session/keptSession.test.ts src/sticker-creation/drawingSettings.test.ts src/sticker-board/stat-board/PencilSettings.test.tsx
    pnpm --filter frontend test src/sticker-creation/canvas/history.test.ts src/sticker-creation/sealing/timelapse.test.ts src/sticker-board/timelapse/timelapsePlayer.test.ts src/sticker-board/timelapse/timelapseSchedule.test.ts
    pnpm --filter frontend test:e2e pencil.e2e.ts
    pnpm --filter frontend test:ipad-safari
    pnpm check

The package scripts are captured in evidence/croquis-source.txt. pnpm check includes the Move tests and requires the Sui CLI. E2E starts its own API and Vite instance and modifies its test-data directories, so it was intentionally not launched in this read-only audit. This source audit makes no claim about runtime fidelity, app-test results, or performance; reference-arithmetic test results are recorded separately in evidence/verification.txt.
