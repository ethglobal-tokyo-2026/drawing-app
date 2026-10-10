# Sticker Creation and Replay Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve report findings 2, 6, 7, 17, 19, 22 and 23 without attaching ink to the wrong ticket, dropping accepted marks, or retaining one bitmap per replay fill.

**Architecture:** Give each local drawing a ticket plus an independent generation ID shared by localStorage and IndexedDB. Finish input when drawing becomes unavailable. Measure replay bounds once, then generate and release one fill snapshot at a time at original drawing density. Keep lightweight unit Canvas substitutes and add real-browser pixel assertions.

**Tech Stack:** TypeScript, React, IndexedDB, Web Locks, Canvas 2D, Vitest/happy-dom/fake-indexeddb and Playwright Chromium/WebKit. No new dependency.

**Spec:** [Functional frontend fixes design](../specs/2026-10-10-functional-frontend-fixes-design.md), particularly “Drawing sessions and sealing.” Evidence is retained in `docs/reviews/2026-10-10-functional-frontend/evidence/`.

## Global Constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Preserve recoverable user data. Storage uncertainty must produce an explicit recovery state, never silently attach data to another session or discard it.
- All global constraints in the spec apply to every task.

- Use existing project vocabulary and bilingual catalog entries for new recovery copy.
- Keep the server ticket-use ID and ticket API unchanged. A local generation is not a new ticket.
- Do not silently clear saved ink whose ticket association cannot be proven.
- Do not lower replay density or skip fill operations to meet the memory goal.
- Do not lower the brush's permitted minimum width to hide a cut failure.
- Preserve the current native-pixel fake's documented scope; do not implement a second Canvas renderer in the test helper.
- Commands below run from `apps/frontend` unless explicitly marked repository root. No command in this plan has been executed as implementation verification.

## Review Focus

- A new blank drawing on the same spent ticket must not restore the previous generation after its reset transaction aborts: task 2.
- Records made before identity metadata existed cannot be proven to match the current localStorage ticket: task 2's explicit recovery path.
- A fill released after opening a panel must not alter ink or add undo history: task 3.
- Skip/stop/visibility changes can happen while the next replay fill is being prepared: tasks 5–6.
- A minimum-width detached dot near a grid-cell boundary must remain inside the sealed mask: task 4.

## Ordering and Integration

1. Fix the Web Locks test helper (19), then session identity/recovery (2); both touch `keptSession.test.ts`, so execute serially.
2. Pause/panel input (6), conservative cut occupancy (17), and root cleanup (22) are independent of storage.
3. Add native replay pixel coverage and stronger dispatch assertions (23) before replacing fill preparation/player scheduling (7). Reuse the native fixture for cut coverage.
4. Treat bounded fill preparation plus the player's asynchronous consumption as one reviewable deliverable. Do not ship a provider interface that the player still consumes as an unbounded map.

### Task 1: Make ownership tests reject a missing takeover request (19)

**Files:** Modify `apps/frontend/src/sticker-creation/session/keptSession.test.ts:504–526`; create `apps/frontend/e2e/keptSessionLocks.e2e.ts` for an isolated native keeper test.

**Interfaces:** Keep the production `SessionKeeper` API unchanged. Keep local `fakeLocks(): Map<string, (error: DOMException) => void>` narrow: assert the supplied options exactly equal `{ steal: true }` inside `request`, before invoking the current rejection/grant behavior. Its comment must describe a takeover-only substitute, not a general Web Locks implementation. This is smaller and more reliable than recreating browser queuing.

- [ ] Strengthen the existing `is kept by the tab that picked it up last...` test so a request with false/missing `steal` fails synchronously at the helper assertion. Assert both keeper starts made takeover requests for the same user-scoped name. Retain stale save/wipe, one warning, visibility reload and final release checks.
- [ ] Run `pnpm exec vitest run src/sticker-creation/session/keptSession.test.ts`. Baseline passes. Run the retained in-memory `locks` mutation from repository root with `CREATION_TEST_MUTATION=locks node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-mutations.config.mts`; expected failure now identifies `{steal:false}`. The mutation runner edits no source.
- [ ] Add native test `latest keeper owns saved ink and the previous keeper cannot overwrite it`. Use two same-origin pages with unique user ID and import the actual keeper through Vite. In A start ticket 7/save red; in B load/resume/save blue; poll A's `onKept(false)` before stale writes; then A.save/A.wipe must leave B's blue steps. Keep A hidden or stub only `location` navigation via page context arrangement if necessary; do not stub `navigator.locks`. Bound every poll and close both pages. A separate native API control for `steal:false` must show old held/new pending until release; reuse the existing evidence probe's semantics.
- [ ] Run `pnpm exec playwright test e2e/keptSessionLocks.e2e.ts --project=chromium --project=webkit --workers=1`. Both projects pass. Then commit this independently testable test improvement.

**Risk:** A fake assertion only protects request intent. The native keeper test protects actual ownership and save behavior. Web Locks are per-origin; pages must share the application's origin and user ID, while each test gets a fresh ID.

### Task 2: Bind saved steps to one drawing generation, with explicit recovery for unverified records (2)

**Files:** Modify `apps/frontend/src/sticker-creation/session/keptSession.ts`, `session/keptSession.test.ts`, `session/usePickUpKeptSession.ts`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `apps/frontend/src/i18n/strings/stickerCreation.ts`; create `apps/frontend/src/sticker-creation/session/KeptDrawingRecovery.tsx` and `KeptDrawingRecovery.test.tsx` using existing sheet/dialog primitives.

**Decision:** Use `{ticket:number,generation:string}`. Ticket alone is insufficient: `carry()` can replace an unread drawing using the same ticket. Generate with `crypto.randomUUID()` on `start()` and on the _first save_ after `carry()`; preserve the generation on `resume()`. Never mutate the old localStorage record merely for opening a carried blank sheet.

**Exact interfaces/data:**

- Export `interface KeptIdentity { ticket: number; generation: string }`.
- Add required `generation: string` to valid new `SessionRecord`; parse old records as a separate internal legacy shape, not by inventing an ID during reads.
- Reserve `IDENTITY_KEY = 2` in the existing `progress` store. No IndexedDB version bump is needed for an additional record key. Store `{ticket,generation}` there in the same transaction as step count, frame and steps. `PendingWrite` captures `identity: KeptIdentity | null`; the transaction must use that captured identity, never the keeper's mutable fields.
- Change `SessionKeeper.resume(ticket, steps, elapsedMs, nsfw, tools, kyotoSeika, generation: string): void`; add the last argument at the screen caller and test callers. Keep `start`, `carry`, `save` external argument lists unchanged.
- Change private `readDrawing(userId: string)` to return `{steps: Step[];frame: SheetFrame|null;identity: KeptIdentity|null}` from one readonly transaction. Missing and invalid identity are distinguishable internally for error reporting.
- Only return `status:'found'` when both stores' ticket and generation match. After the IndexedDB read finishes, reread the current localStorage identity and require it still matches the identity captured at the start; a new session opened during the read must not be replaced by the older result. `loadKeptSession` must not graft a localStorage ticket onto unverified steps.
- Add `KeptDrawing` variant `{status:'unverified';ticket:number;kyotoSeika:KeptKyotoSeika|null;reason:'legacy'|'identity-mismatch';recovery: {steps:Step[];frame:SheetFrame|null};error:unknown}` for structurally readable ink with absent/mismatched identity. `KeptSession` already includes `KeptDrawing`, and the unread variant's `later` promise must be able to return this result too. No source record is deleted while returning this variant. Keep genuinely unavailable IndexedDB on the existing `unread` path; corrupt steps remain distinct from identity mismatch.
- `usePickUpKeptSession` returns `recovery: Extract<KeptSession,{status:'unverified'}>|null` and `discardRecovery: () => void`. While recovery is present, input/ticket spending/Seal remain locked. `discardRecovery` reuses the current unsealed ticket with `keeper.start`, thereby making a fresh generation. It must honor the existing sent-Seal reconciliation before reusing the ticket; sealed/unknown sent-Seal outcomes must not authorize another Seal on that ticket.
- Recovery component props: `{recovery: Extract<KeptSession,{status:'unverified'}>; onDiscard:()=>void; onClose:()=>void}`. Offer download of all recovered steps/frame as JSON and then an explicit action to discard the unverified saved drawing and continue on a blank sheet. Closing/back preserves storage and leaves the sheet locked; it does not spend a ticket. Do not offer an automatic Resume that falsely certifies the unknown association. Downloads contain complete data with no truncation; name `croquis-recovered-drawing.json`. A browser download is explicitly initiated by that button.

**Why this handling:** Existing untagged steps have no evidence of which ticket produced them. Silently tagging them would make the reported failure permanent; treating them as corrupt and wiping would lose valid work. Explicit recovery keeps the data available without silently assigning it to the wrong ticket. The shared design retains this explicit recovery behavior.

- [ ] Add tests `does not attach ticket 7 ink to ticket 8 after a failed reset`, `does not restore an older generation under the same carried ticket`, and `queued writes retain the identity captured when queued`. Seed known red/blue steps; abort only the reset/write transaction while reads succeed; assert no `found` result combines new identity and red steps. Assert the old stored steps remain unchanged until explicit discard/new-generation write commits.
- [ ] Add `returns unverified legacy ink without changing either store`, `offers complete recovery download before explicit replacement`, `closing recovery preserves the saved drawing and spends no ticket`, `late read cannot restore after a new generation starts`, and `recovery cannot reuse a ticket with an unresolved or completed Seal`. Assert direct IndexedDB contents, generation reuse on resume, new generation on carry's first save, and empty steps with matching identity for a successful start.
- [ ] Run `pnpm exec vitest run src/sticker-creation/session/keptSession.test.ts src/sticker-creation/DrawingScreen.test.tsx src/sticker-creation/session/KeptDrawingRecovery.test.tsx`; new tests fail before implementation.
- [ ] Implement identity writes, strict read comparison and recovery UI. Within `drain`, write identity even for a reset to zero steps. Ensure the unchanged-step optimization cannot skip writing a missing/new identity. When a failed write marks `written=null`, the retry writes every step and its matching identity together. Wipe clears identity atomically with progress and steps. Log explicit mismatch including ticket IDs/generation IDs, not drawing content.
- [ ] Rerun the focused tests and `pnpm typecheck`; all pass. Commit storage, caller, recovery UI and tests together.

**Integration risks:** localStorage/IndexedDB cannot form one transaction, so mismatch is a recoverable state rather than something ordering alone can eliminate. Aborted reset, failed localStorage write, rapid start/save, sent-Seal recovery, late IndexedDB completion and an old application tab must all fail closed. Additive progress metadata alone does not stop old JavaScript from writing; Web Locks takeover plus strict generation comparison makes that detectable. Do not guess a legacy association or delete it on read.

### Task 3: Finish captured input when pause or a panel begins (6)

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts:229–235`, `canvas/inkEngine.test.ts`; add screen integration assertions in `DrawingScreen.test.tsx` as needed. Review `DrawingCanvas.tsx` and the existing screen clock holds at `DrawingScreen.tsx:745–754`; keep their public APIs unchanged.

**Interfaces:** `InkEngine.settings` setter remains `set settings(next: InkSettings)`. On transition from input permitted to any of `next.locked || next.paused || next.panelOpen`, call `endStroke(false)`, clear the touch-tap recognizer and convert existing contact roles to swallowed. Do this once per disabling edge. Keep `down()`'s existing panel-dismiss and paused hints for newly landed pointers. Re-enabling input must require a fresh pointerdown; an old held pointer may not resume drawing.

- [ ] Add table-driven test `finishes the held stroke before locked, paused or panel-open input takes effect`, over all three flags and mouse/pen/touch: down at x10, move to x30, apply disabled settings, move/up at x220. Assert exactly one committed op ending at x30, no later layer.paint, no pending frame and no duplicate commit. Include queued smoothing samples before pause; they must finish to the last accepted pre-pause sample.
- [ ] Add `drops a fill tap held when input becomes unavailable` and `does not undo from touch contacts begun before pause`. Down before the transition, release after; assert no fill/commit/history change. Add `a held pointer does not draw after resuming until it lands again`.
- [ ] Run `pnpm exec vitest run src/sticker-creation/canvas/inkEngine.test.ts` and establish the new cases fail.
- [ ] Implement the setter transition using existing stroke finalization and swallowed-role helpers. End the stroke before any future pointer sample can update its coordinates. Do not use `endStroke(true)`, which would discard accepted ink. Preserve native pointer capture until lift but suppress its effect; forced release is unnecessary and can introduce cancellation behavior.
- [ ] Rerun the engine tests and screen tests. Assert the regular sheet's clock remains held while paused/panel-open; Kyoto Seika Practice Mode retains its existing no-user-pause timing while tool panels still suppress drawing. Commit.

### Task 4: Make the cut grid conservatively preserve meaningful source ink (17)

**Files:** Modify `apps/frontend/src/sticker-creation/sealing/dieCut.ts` and `dieCut.test.ts`; create `apps/frontend/e2e/canvasPixels.e2e.ts` with real renderer/cut tests (also used by task 5). No change to `pixels.ts` RGBA averaging used for the final image.

**Decision/interfaces:** Replace _only cut occupancy_ averaging with conservative source-pixel coverage. Add private `inkMask(ink: Pixels, scale: number, pad: number, width: number, height: number): Uint8Array`. Keep `dieCut(ink: Pixels, borderPx: number): DieCut|null` unchanged. For every source pixel whose alpha is greater than the existing `INK_ALPHA = 18`, mark every grid cell its pixel square intersects. Compute each axis from `floor(sourceCoordinate * scale) + pad` through `ceil((sourceCoordinate + 1) * scale) - 1 + pad`, inclusive. This is O(source pixels), fixed-size output and at most four grid cells per source pixel because scale <= 1. It retains the threshold on source opacity instead of opacity diluted across a large grid cell. Use these cells for bounds/count, dilation, bridges and the full-bleed decision. Remove the unused alpha-resample import from dieCut only.

- [ ] Add `keeps an opaque one-pixel island across cut-grid boundaries`, `keeps detached fine ink beside a larger shape`, and `ignores source alpha at or below the existing threshold`. Vary fractional cell position, source dimensions above/below GRID, sheet edges and densities 1, 2, 3; assert non-null cut and mask coverage of each qualifying source-pixel center. Keep blank input returning null. Test source alpha 18 versus 19 explicitly.
- [ ] Add native test `minimum brush dots remain within the sealed mask`. Import actual `sizePx`, `StrokeBuilder`, `paintStroke` and `dieCut` through Vite in a real page. Use the existing reproduction's 374×748 sheet, density 3, minimum rail position 0, pressure .5, dot at (58.4375,58.4375), alone and detached from a larger mark; expand to density 1/2/3 and offsets inside and across a cut-grid cell. Assert source has meaningful alpha and cut includes its source pixels. Do not reproduce `paintStroke` with a hand-coded circle in the durable test.
- [ ] Run `pnpm exec vitest run src/sticker-creation/sealing/dieCut.test.ts src/sticker-creation/sealing/stickerPasses.test.ts` and `pnpm exec playwright test e2e/canvasPixels.e2e.ts --grep 'minimum brush' --project=chromium --project=webkit --workers=1`; establish failing minimum-mark cases before implementation.
- [ ] Implement conservative occupancy; rerun focused unit/native tests. For each mask fixture also assert detached pieces are joined and mask bounds remain within the current border/padding rules. Existing final-image averaging remains unchanged. Commit.

**Risk:** Conservative occupancy can enlarge the cut by less than a grid cell around faint edges; that is preferable to removing allowed ink and is bounded independently of brush size. It may shift full-bleed classification at the existing threshold; retain existing full-bleed/edge fixtures and add one just below it. Physical Apple Pencil behavior remains outside this native Canvas test's claim.

### Task 5: Give replay a meaningful pixel contract before refactoring preparation (23)

**Files:** Modify `apps/frontend/src/sticker-board/timelapse/timelapsePlayer.test.ts`; extend `apps/frontend/e2e/canvasPixels.e2e.ts` from task 4. Keep `testCanvas.ts` unchanged.

**Interfaces:** Production player and `paintStroke` signatures remain unchanged. Browser test imports the real modules via Vite; its manual `FrameSource` has a bounded `advance(ms, step)` and exposes pending count. All browser reads use actual `CanvasRenderingContext2D.getImageData`.

- [ ] Strengthen `paints each point once, in order...`: for every recorded dispatch, compare `op.tool`, `op.color`, `op.pts` and `op.T` with the corresponding decoded input op, not merely timestamp/ranges. Keep separate ordering and point-range assertions. The retained `transparent` in-memory mutation must now fail on color mismatch.
- [ ] Add native tests `replay paints recorded colors and erases to transparency` and `fill replay and Skip produce the same pixels as the completed drawing`. Use a 100×100 sheet at density1 and an identity display transform: red brush over center x20/y20, eraser over part of that stroke, bounded blue filled region and a later green stroke. Assert known interior pixels are red/blue/green/transparent with full-alpha interior samples; avoid antialiased edge equality. Also compare the complete final replay image with a reference `InkSurface` that applied the same operations, allowing only explicitly justified edge tolerance.
- [ ] Check partial playback before and after the eraser and fill; final static Sticker display is not sufficient. Test normal completion, Skip after partial playback, reduced motion and hidden/resumed playback. Wait for frames/preparation with bounded conditions, never an unbounded animation loop.
- [ ] Run `pnpm exec vitest run src/sticker-board/timelapse/timelapsePlayer.test.ts` and `pnpm exec playwright test e2e/canvasPixels.e2e.ts --grep 'replay' --project=chromium --project=webkit --workers=1`. Run the retained transparent mutation from repository root; baseline passes and mutated run fails. Commit the assertions and native tests.

**Risk:** The existing UI E2E asserts phase/geometry and does not expose a deterministic playback clock. Keep that coverage; add the isolated actual-player fixture for pixel determinism rather than sleeping until an arbitrary animation frame.

### Task 6: Stream fill snapshots with a constant bitmap bound (7)

**Files:** Replace the existing preparation API inside `apps/frontend/src/sticker-board/timelapse/fillSnapshots.ts`; modify `fillSnapshots.test.ts`, `timelapsePlayer.ts`, `timelapsePlayer.test.ts`, and `useTimelapse.test.tsx`; extend native pixel tests from task 5. No fallback that keeps the old unbounded map.

**Decision:** Bound retained fill snapshots to exactly one changed-area canvas. Its RGBA storage is at most `4 * view.width * view.height` bytes, independent of fill count. Keep one full original-density sheet and two reusable display-size before/after canvases while computing fills; transient pixel arrays are released after each calculation. This bounds raster storage by sheet/display size rather than operation count. The player's display canvas and the flood routine's temporary arrays are outside the one-snapshot count and must be included in measured peak memory assertions/documentation. Do not claim an absolute heap limit across all viewport sizes.

**Exact new interfaces:**

```ts
export interface PreparedFills {
  frame: Rect;
  next(index: number): Promise<FillSnapshot | null>;
  release(): void;
  dispose(): void;
}
export function prepareFillSnapshots(
  input: PrepareInput,
  control: PrepareControl,
): Promise<PreparedFills | null>;
```

`next(index)` accepts fill op indexes in increasing order; requesting the same active fill returns the same snapshot, and requesting another before `release()` rejects with an invariant error. No-change fills return null but still advance the internal original-density sheet. `release()` frees only the active changed-area canvas, idempotently. `dispose()` aborts future work and frees every owned canvas, also idempotently. Keep `FillSnapshot` fields unchanged. These operations replace, rather than supplement, `Prepared.snapshots` and `passes`.

**Two-pass algorithm:** First scan all operations up to the last fill on a single original-density `InkSurface`, grow the frame from flood bounds, and retain no fill raster data. Yield before fills and periodically while applying strokes so long histories remain interruptible. Release that sheet after bounds are final. Construct the provider with a fresh sheet and reusable before/after canvases using the final view. On `next(index)`, apply intervening strokes and preceding no-change fills in their recorded order, flood the requested op and produce its changed-area snapshot in the final frame. Do not repeatedly replay from op zero. The provider stops at that fill; it will advance from there on the next call. This avoids O(number of fills squared) work and any need for history checkpoints.

**Timeout semantics:** Preserve `PREPARE_TIMEOUT_MS = 30_000` for the initial scan; each provider `next` has its own 30-second active preparation deadline measured from invocation. Time spent in ordinary playback/user-hidden pauses is not preparation time. Poll `stopped()` and provider disposed state immediately after every yield and before publishing a snapshot. Errors include fill ordinal and total; player errors continue through the existing visible replay failure path.

**Player consumption:** Keep public `TimelapsePlayer` methods unchanged. Make the internal frame pump serial and asynchronous. `stepsDue(schedule,cursor,t)` may still produce a sequence, but consume it in order: stroke dispatch is synchronous; first reveal for a fill awaits provider.next(index); partial reveals reuse that snapshot; full reveal calls provider.release(). Track the last completely revealed fill index separately: reduced motion reveals a fill early while the scheduler can still emit more partial steps for it, and those later steps must be no-ops rather than requesting the released fill again. No second RAF advance starts until the current batch completes. Cancel the RAF while waiting and reset `last` to the current frame clock after preparation so waiting does not consume replay time. Recheck outcome/visibility after every await before drawing. Use step.index for failure reporting since stepsDue already advances the cursor. `skip()` stays void: mark skipped, stop ordinary scheduling, and drain remaining steps at Infinity through the same serial asynchronous consumer; `play()` settles only after the final fill actually paints. `stop()` settles promptly, disposes the provider and prevents a late snapshot from painting. `prepare()` resolves only after bounds are final; layout remains stable during playback. `takeInk()` continues to operate on the final display after completion.

- [ ] Add `retains at most one fill snapshot for forty full-sheet fills`: drive40 alternating whole-sheet fills at1000×1000 display; instrument owned canvas allocation/release and assert active snapshot bytes <=4,000,000 at each step and zero after completion/stop. Assert each fill's expected color and order, not memory alone. Include repeated identical-color no-change fills.
- [ ] Add `replays strokes and erasers between streamed fills once`, `measures fills outside the initial stroke frame before playback`, `does not advance playback time while a fill is pending`, `Skip waits for every remaining fill`, `stop during fill preparation prevents late painting and releases canvases`, and `hidden page resumes without a burst after pending preparation`. Use deferred yields, bounded manual frames, explicit disposal counts and the native pixel reference from task 5.
- [ ] Run `pnpm exec vitest run src/sticker-board/timelapse/fillSnapshots.test.ts src/sticker-board/timelapse/timelapsePlayer.test.ts src/sticker-board/timelapse/useTimelapse.test.tsx`; establish the memory-bound expectation fails on the current map implementation.
- [ ] Implement measurement/provider ownership and the serial player pump together. Adapt tests that currently inspect `Prepared.snapshots`; do not weaken content/cancellation assertions to fit the new API. Remove obsolete second-pass/map metrics; record measured fill count and total preparation duration using existing performance reporting.
- [ ] Rerun those unit tests, native replay tests, and existing `pnpm exec playwright test e2e/timelapse.e2e.ts --project=chromium --project=webkit --workers=1`. Then `pnpm typecheck`. All pass before committing this task.

**Risks:** Playback can visibly wait for an expensive fill instead of preloading all of them; this is an intentional memory/correctness tradeoff. The logical replay timing remains unchanged. Avoid background prefetching until a measured need justifies a second bounded snapshot. A synchronous single flood can still block briefly; moving the flood algorithm to a worker is outside this finding. Verify normal/Skip final pixels before claiming the memory improvement is complete.

### Task 7: Clean up every Subject test root (22)

**Files:** Modify `apps/frontend/src/kyoto-seika/SubjectThought.test.tsx` and `SubjectWord.test.tsx` only.

**Interfaces:** Replace each single reassigned cleanup variable with `const cleanups: Array<() => void> = []`; each helper registers its root teardown using `cleanups.push(...)`. `afterEach` drains all registered cleanups inside React act as appropriate, then asserts the suite's root selector is absent. No new production/shared testing abstraction is necessary for two short helpers.

- [ ] Add teardown postconditions `.subject-thought` count0 and `ruby[lang='ja']` count0 in their isolated files. Run the two tests first and confirm current helpers fail these postconditions after their multiple-render cases.
- [ ] Change helpers to register every root, ensuring cleanup registration occurs before any assertion that might throw after mounting. Run `pnpm exec vitest run src/kyoto-seika/SubjectThought.test.tsx src/kyoto-seika/SubjectWord.test.tsx`; all pass.
- [ ] From repository root run the retained dedicated cleanup probe: `node apps/frontend/node_modules/vitest/vitest.mjs run --config docs/reviews/2026-10-10-functional-frontend/evidence/creation-test-root-cleanup.config.mts`. It must now report zero thought/ruby roots and pass after the language change. Commit.

## Final Verification

- Run the combined relevant unit set once, followed by normal frontend lint/typecheck/build and the focused Chromium/WebKit E2E commands above. Do not repeatedly run full suites after unchanged results.
- Retain evidence mutation runners until the tests demonstrate the original false passes are gone. Do not turn mutation runs into required production build behavior.
- Review independent commits for storage+recovery, input blocking, cut occupancy, replay pixel tests, bounded replay, and test-helper cleanup; squash only as appropriate to repository policy at merge.
- Decisions requiring special attention during integration: generation identity is necessary even for the same ticket; legacy identity cannot be inferred; recovery must preserve data until an explicit discard; fill preparation changes Skip completion from immediate synchronous painting to asynchronously completed painting while retaining the public void trigger and promise outcome.
- No implementation or test execution occurred as part of this planning turn. Prior reproduction results remain evidence of the existing defects, not verification of these proposed fixes.
