# Sticker Foil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace translated foil highlights with convincing reflective metal, fixed Kyoto Seika screentone, and angle-dependent holo/pink color that share the sticker's existing geometry and light.

**Architecture:** Extend the existing packed shared renderer to produce one complete finish per mounted presentation. Preserve the paper optical/display path, use foil-only highlight compression, and retain the existing normal/reveal/resource lifecycle. React and imperative presentations share the same renderer and coverage description.

**Tech Stack:** Existing TypeScript, React, WebGL1, Vitest, Playwright Chromium/WebKit, pnpm; no new product dependencies.

**Spec:** [Approved sticker foil design](../specs/2026-10-13-sticker-foil-design.md).

## Global Constraints

- User delegated design/plan review and authorized implementation with sub-agents in a worktree; do not pause for routine reviews.
- Preserve fully covered paper pixels exactly; preserve existing fractional-edge alpha tolerance.
- One GPU context and complete output per mounted presentation; temporary flat/bent outputs only during the existing placement-authorized reveal.
- Share the existing pose, room, turn, lift tilt, and crease normal; no independent material-light clock or sensor listener.
- Fixed source-coordinate print/grating; uniform initial grating; zero and positive/negative first and second diffraction orders share reflection energy.
- Initial quadrature ceiling: 4×4 source grid. Initial reference budgets: one rendered-pixel reflection-centroid error and 5% relative integrated-luminance error. These are unverified guesses, frozen before fitting.
- Holo/pink palettes and foil precedence remain authoritative. No new UI setting, availability, or purchase behavior; any new UI text belongs in the English/Japanese catalog.
- Preserve concealment, covering, readiness/decode deadlines, cancellation, diagnostics, context restoration, and outgoing/used tray states. Initial board settlement continues to exclude later sharp-image refinement.
- Hard rename replaced renderer/component operations; no compatibility aliases or second live foil algorithm. Keep decorative ArtistChip rings separate.
- Read AGENTS.MD. Keep unrelated work out of commits. Plans/specs are committed on main; product implementation is isolated. Keep documentation free of personal paths.

## Review Focus

1. Sharp-image upgrades and repeated resize must preserve print scale and normal registration — Task 3 browser assertions.
2. Concealment during an active/reversed detail flight must discard every unblurred retained output — Task 5 lifecycle assertion.
3. Failed foil-mask replacement must retain a complete prior finish, settle with diagnostics, and reject stale completions — Task 2 lifecycle assertion.
4. Partial sealing coating must not expose metal inside the paper cut or hide its timed plain/gloss passes — Task 3 composition assertion.
5. Outgoing gifts and used tray slots must preserve frost/fade and resource admission — Task 5 tray assertion.

## File and interface map

- Create `apps/frontend/src/stickers/foilMaterial.ts`: typed foil styles, fixed print mapping, authored calibrated parameters, spectral/color lookup, bounded source samples, display compression.
- Create `apps/frontend/src/stickers/foilShader.ts`: reusable foil GLSL calculation only; no context or animation ownership.
- Create `apps/frontend/src/stickers/foilCoverage.ts`: source-aligned cached outer coverage and necessary bounds. Reuse existing cut/mask helpers and Kyoto Seika growth rule.
- Move `laminateRenderer.ts` to `stickerRenderer.ts`, `laminateShader.ts` to `stickerShader.ts`, `StickerLaminate.tsx` to `StickerFinish.tsx`, and `sticker-laminate.css` to `sticker-finish.css`. Migrate their callers/tests together, including renderer/component test filenames. Existing laminate E2E test names remain meaningful for the paper behavior they test.
- Create `docs/research/sticker-foil/material-reference.ts` and its test/tsconfig for an independent optical reference. Production must not import this reference.
- Create `apps/frontend/e2e/stickerFoil.html`, `stickerFoil.tsx`, and `stickerFoil.e2e.ts` for controlled material/coverage/pose fixtures.
- Existing `StickerFigure`, static `StickerFoil`, Shop preview, board/flight/tray/sealing callers adopt the complete output. Preserve `light.ts`, the crease calculation, and sealed data; conditionally extend the crease bake's registered bounds for actual foil overflow.

Renderer API after Task 2:

```ts
type LaminateFinish = "gloss" | "matte";
interface StickerFoilMaterial {
  style: FoilStyle; // existing tones plus explicit Shop gold/silver/roseGold previews
  size: FoilSize;
  mask?: string;
}
interface StickerSurface {
  print: string; cut: string; normal?: string;
  // A supplied normal's bounds in the original source frame; omitted means [0, 0, 1, 1].
  normalBounds?: { x: number; y: number; width: number; height: number };
  turn: number; finish: LaminateFinish;
  foil?: StickerFoilMaterial;
  tiltX?: number; tiltY?: number;
  active?: () => boolean;
  onCreaseProgress?: (normal: string, progress: number) => void;
  canRevealCrease?: (normal: string) => boolean;
  startCreaseReveal?: (normal: string) => boolean;
  paperAmount?: number; foilAmount?: number;
}
mountSticker(canvas: HTMLCanvasElement, options: StickerSurface): () => void;
updateSticker(canvas: HTMLCanvasElement,
  options: Pick<StickerSurface, "print"|"cut"|"normal"|"normalBounds"|"finish"|"foil">): void;
stickerTurn(canvas: HTMLCanvasElement): number | undefined;
turnSticker(canvas: HTMLCanvasElement, turn: number, tiltX?: number, tiltY?: number): void;
setStickerAmounts(canvas: HTMLCanvasElement, paperAmount: number, foilAmount: number): void;
refreshSticker(canvas: HTMLCanvasElement): void;
whenStickerSettled(canvas: HTMLCanvasElement,
  expected?: { normal?: string }, signal?: AbortSignal): Promise<void>;
mountStickerCopy(canvas: HTMLCanvasElement, source: HTMLCanvasElement,
  active: () => boolean, onInvalidated?: () => void): () => void;
```

`mountStickerCopy` seeds pixels and retains the material/normal description, has independent geometry, and invalidates/discards its copied pixels if its source is disposed for concealment. It calls `onInvalidated` so a flyer can remove its entire cloned presentation, including fallback images. It is not a bitmap-only clone. Readiness compares requested and committed material generations internally, including foil assets. Use `.sticker-finish` for the canvas and migrate affected current selectors; do not preserve old class aliases.

Creased overflow requires a supplied normal covering the complete output bounds. A missing extended field retains the prior complete finish and reports a persistent diagnostic. It must never stretch or clamp the source normal to invent geometry. Task 4 supplies conditional extended crease bakes from the actual underlying silhouettes; full-frame flat previews need no normal.

---

### Task 1: Prove and calibrate the foil response

**Files:** Create `foilMaterial.ts`, `foilMaterial.test.ts`, `foilShader.ts`, independent `docs/research/sticker-foil/material-reference.ts`, `material-reference.test.ts`, `tsconfig.json`, and a concise `calibration.md`. Create the controlled foil fixture and `stickerFoil.e2e.ts`; retain diagnostics only while useful to material verification.

**Interfaces:** Produces `FoilStyle = "holo" | "pink" | "kyoto-seika" | "gold" | "silver" | "roseGold"`, existing `FoilTone`/`FoilSize` types, `foilFragment` GLSL string, and `createFoilLookup(style: FoilStyle, palette: readonly (readonly [number,number,number])[]): {width:number;height:number;pixels:Uint8Array}`. Export `foilPrintCoordinates(u:number,v:number,aspect:number): readonly [number,number]` and `compressFoil(rgb:readonly [number,number,number]): readonly [number,number,number]` for derived behavior tests. Lookup encoding and uniforms are documented beside `foilFragment`; the renderer consumes that single declared encoding.

- [ ] Write failing tests for repeatable direction-dependent response, fixed print registration/mean coverage, invalid hemispheres, source removal, order-energy normalization, luminance-preserving palette substitution, and non-clipping monotonic compression. Assert computed behavior, not configuration equality. The independent reference directly integrates wavelengths and source directions in double precision and shares no production lookup generator.
- [ ] Run `pnpm --filter frontend test src/stickers/foilMaterial.test.ts` and `pnpm exec node --test docs/research/sticker-foil/material-reference.test.ts`; record expected RED failures for missing behavior.
- [ ] Implement filtered-mirror conductor/ink/coat and bounded diffraction in `foilMaterial.ts`/`foilShader.ts`; retain fixed source coordinates. Derive dense print from existing token and canonical fixture. Use the cited aluminum/coat defaults; label fitted/unsourced values unverified guesses. Keep neutral gloss separate from authored chromaticity and account for source solid angle.
- [ ] Establish reference convergence and freeze the spec's pose/geometry matrix and budgets before fitting. In the diagnostic fixture, compare actual GPU output with the independent reference and choose the smallest passing source grid within the ceiling. Capture Kyoto Seika, holo, and pink at paired/return poses, dark/broad/removed source, and rotated grating. Record selected parameters, errors, source assumptions, and representative frames in `calibration.md`. If the initial approximation fails, report evidence to the controller for a recorded model correction before integration.
- [ ] Run focused unit/reference/type checks and `pnpm --filter frontend test:e2e stickerFoil.e2e.ts --workers=2`; expect passing independent metrics, stable printed marks, no luminous dark-room rainbow, and no channel-clipped metal plateau. Run frontend unit suite once before committing.
- [ ] Commit explicit task paths with `feat: model sticker foil reflection and diffraction` and report RED/GREEN commands, calibration evidence, and any model limitations.

### Task 2: Complete output, aligned coverage, and renderer lifecycle

**Files:** Move renderer/shader/component/styles and their component tests as mapped above. Create `foilCoverage.ts`/`foilCoverage.test.ts`; modify `StickerFigure.test.tsx`, existing laminate alpha/lifecycle/geometry/covered-board fixtures, and all direct imports of renamed renderer operations (mechanical migration only). Modify `creaseRevealSize.ts` only for necessary output/source extent alignment.

**Interfaces:** Consumes Task 1's `FoilStyle`, `FoilTone`, `FoilSize`, lookup and GLSL encoding. Produces the complete `StickerSurface` and renderer API above. `StickerFinish` accepts the existing component props plus `foil?: StickerFoilMaterial`; its settled generation includes coverage/lookup/material identity. `foilCoverage.ts` produces source-aligned alpha and output offsets using existing baked masks or the established growth rule.

- [ ] Extend failing alpha/geometry/lifecycle tests: paper output exact; full cut occludes foil; fractional output follows the spec equation; expanded rectangular/tiny/edge coverage maps print and normals correctly; failed/stale foil assets retain prior complete output; concealment/context restoration/reveal use matching material generations. Prove each new assertion can fail under the former behavior.
- [ ] Run focused tests to record RED, then implement cached coverage and combined shader evaluation. Preserve the exact paper branch. Kyoto Seika grows from the cut and ignores any baked holo mask. Generate overflow geometry only when needed, keep source UV/view coordinates aligned, and zero RGB outside final alpha. Retain one packed context/copy pipeline.
- [ ] Generalize registration/update/settlement and perform the hard API/component/class rename in every current source/test caller. Add `setStickerAmounts` using the spec's partial sealing equation; do not scale paper occlusion by its coating amount. Preserve complete flat/bent reveal snapshots, diagnostics, existing deadlines, and last-complete-generation behavior.
- [ ] Implement `mountStickerCopy` ownership and invalidation; test source concealment invalidation and independent geometry/resource release without another foil surface. Retain inactive destination snapshots and refresh from held pose when exposed.
- [ ] Run `pnpm --filter frontend test src/stickers` and `pnpm --filter frontend test:e2e stickerLaminateAlpha stickerLaminateGeometry stickerLaminateLifecycle stickerLaminateCoveredBoard --workers=2`. Expect existing paper/alpha/lifecycle assertions plus new foil cases to pass. Run `pnpm --filter frontend typecheck` and frontend unit suite once before committing.
- [ ] Commit explicit task paths with `feat: render complete sticker finishes in shared batches`; report resource/readiness and coordinate evidence.

### Task 3: React figures, Shop previews, sealing, and static fallback

**Files:** Modify `StickerFigure.tsx`, `StickerFoil.tsx`, `sticker-foil.css`, `sticker-figure.css`, `StickerFinish.tsx`, `sticker-finish.css`, `shop/FinishPreview.tsx`, relevant Shop CSS, `sticker-creation/SealSheet.tsx`, `sealing/SealCeremony.tsx`, corresponding component tests, and foil/laminate fixture tests. Existing token declarations remain authoritative.

**Interfaces:** Consumes the complete surface API and Task 1's style/lookup encoding. `StickerFigure` resolves existing foil precedence; `FinishPreview` passes an explicit preview style; sealing forwards `setStickerAmounts(canvas, f.spec.opacity, f.foil)` and current turn/tilt. Static fallback/cast and live output use identical outer coverage.

- [ ] Add failing semantic/presentation tests: pink wins; own Kyoto Seika foil remains; opaque art unchanged; Shop gold/silver/roseGold preserve chosen appearance without diffraction; fixed print survives resizing and sharp upgrades; source failure shows shaped static fallback with diagnostics.
- [ ] Add a sealing fixture assertion at partial coating amount: no foil inside full paper coverage, underlying timed plain/gloss remain visible, independent foil visibility, and live flight reflection. Record focused RED before implementation.
- [ ] Supply the common foil descriptor to the live React finish; pass the preview style explicitly rather than depending on CSS recoloring of an already-rendered canvas. Remove obsolete live CSS strips/grating/density blend, retaining only necessary cast/static fallback. Hide fallback only on complete output commit. Preserve NSFW image/mark/gloss behavior.
- [ ] Update seal preview rectangular bounds and ceremony amounts/geometry while retaining existing formation timeline and plain/gloss/pour layers. Keep their coverage and cast synchronized with the combined output.
- [ ] Run `pnpm --filter frontend test src/stickers src/shop src/sticker-creation/sealing` and `pnpm --filter frontend test:e2e foil stickerFoil stickerLaminateDrawing stickerLaminateConceal stickerLaminateReadability --workers=2`. Verify paired frames at enlarged/minified/fractional scales; record no seams, moiré, shifted print, green hue excursions, or paper changes. Run frontend typecheck and unit suite once before committing.
- [ ] Commit explicit task paths with `feat: apply physical foil to sticker figures and sealing`.

### Task 4: Conditional registered crease geometry

**Files:** Modify `sticker-board/useCreases.ts` and its tests, `stickers/creaseWorker.ts`, necessary bounds/support helpers in `crease.ts` and tests, `StickerFigure.tsx`, `StickerCrease.tsx`, and focused crease/geometry fixtures. Keep the existing drape calculation and ordinary bake path unchanged.

**Interfaces:** Consumes the existing own/lower silhouettes and shared foil growth rule. Produces optional source-normalized `normalBounds` on the accepted crease and forwards it to `StickerFinish`. The normal alone may have expanded bounds; painted base/four sides remain in the original source frame. Explicitly enumerate image keys when releasing or decoding crease URLs so metadata is never treated as an image.

- [ ] Add failing cases for unchanged ordinary margins, empty masks, real outside-source support geometry, asymmetric/rotated registration, and normal-only outside-source bends. Record RED before changing the worker.
- [ ] Detect actual grown coverage overflow after mask decoding; retain enough original alpha extent information to avoid downsampling changing eligibility. Only that case uses an expanded registered raster with real lower-mask context through the drape dependency reach. Crop the normal to the required outer bounds and painted images to the original source frame.
- [ ] Preserve source-frame support-plane averaging while extending accepted support levels into the added region. Corrected boundary geometry may change the exceptional overflow case, but paper, foil, and painted crease must use the same accepted surface. Never duplicate or stretch old edge normals.
- [ ] Carry bounds through the success reply and accepted crease metadata, URL release/paint decoding, and React finish registration. Retain current scheduling, timeouts, stale-batch rejection, reveal grants, and failure diagnostics; no stored sticker or database change.
- [ ] Run focused crease/store/component unit tests, frontend typecheck/lint, and Chromium/WebKit crease/geometry browser cases. Verify ordinary normal/paint results unchanged, conditional padding, and no invalid registration diagnostic after a real padded bake.
- [ ] Commit explicit task paths with `fix: register crease geometry beyond overflowing foil` and report the metadata/geometry evidence.

### Task 5: Live board, tray, and detail-flight integration

**Files:** Modify `sticker-board/useBoardGestures.ts`, `boardComplete.ts`, `tray/traySheets.ts`, `tray/trayPeel.ts`, `tray/sticker-tray.css`, `detailLift.ts`, affected board/detail/tray/receiving/Explore selectors and tests, and `stickerLaminateFlight.e2e.ts`, `stickerBoardDrag.e2e.ts`, `stickerLightFrames.e2e.ts`.

**Interfaces:** Consumes complete surface registration, imperative turn/amount/refresh/settlement operations and live-copy ownership. Temporary flyers sample the existing flight geometry; they do not control shared light. The destination is paused during flight, refreshed before exposure, and retained through reversal.

- [ ] Add failing assertions for live foil through drag, sheet peel, detail forward/reverse lift, concealed active flyer, canceled/paged flight, outgoing frost/fade, used-slot non-admission, and complete board readiness. Record the failing behavioral output before integration.
- [ ] Replace manual tray live foil with the same material/coverage registration as React. Keep outgoing gift coating omission/frost/fade and empty used slots. Forward existing peel/curl geometry and release all flyer resources on completion/cancellation.
- [ ] Use live copied owners for detail flights, preserve the owner during reversed playback, and refresh the destination before restoring exposure. Concealment invalidates originals and their copies. Forward board gesture geometry to the complete output and make board readiness wait for committed foil assets without changing its deadline.
- [ ] Update affected material/clipping/shadow/exposure selectors; verify inheriting Artist Board, Explore lift, receiving, and tray/detail presentations. Keep the closed GiftBag and decorative ArtistChip behavior separate.
- [ ] Run focused board/tray/detail unit tests and `pnpm --filter frontend test:e2e stickerLaminateFlight stickerBoardDrag stickerLightFrames stickerLaminateAttribution stickerLaminateSelection --workers=2`. Run frontend typecheck and unit suite once before committing. Expect coherent retained finishes and no active work/resource leak after cancellation or concealment.
- [ ] Commit explicit task paths with `fix: keep sticker foil live through placement and lifts`.

### Task 6: Acceptance, performance, and whole-branch verification

**Files:** Extend `stickerFoil.e2e.ts`, relevant existing lifecycle/frame/selection/performance fixtures, and `docs/research/sticker-foil/calibration.md`; update current `docs/research/sticker-laminate/README.md` renderer references. Fix defects in their owning production files. Do not modify DESIGN.md or add new standing rules.

**Interfaces:** Consumes the integrated complete finish. Produces reproducible numerical/visual/functional evidence, declared material assumptions, performance results/limitations, and a reviewed branch ready for integration.

- [ ] Add any remaining failing acceptance case from the spec matrix before fixing it. Reuse common fixtures and assertion helpers; do not duplicate tests for already-covered unchanged lifecycle behavior.
- [ ] Run `pnpm check:full`, the independent reference checks, and the complete affected sticker/foil browser suite in Chromium and WebKit. Record failures by name/output; repair issues and rerun only amended coverage before the final broad pass.
- [ ] Run `pnpm --filter frontend test:sticker-performance --project=chrome` on a qualifying hardware GPU. Measure mixed-tone loaded boards, details, dragging, and flights; preserve the existing frame budgets and idle-baseline refusal. Capture paired physical-reference and app frames for final visual inspection.
- [ ] Repeat sustained motion on physical iPhone/iPad in supported browsers/LINE if a device is available. If unavailable, report physical qualification incomplete explicitly; do not substitute a simulator/desktop claim or block unrelated completed work.
- [ ] Record final calibrated parameters, optical approximations, passing evidence, and material failure behavior in concise current documentation. Remove throwaway spike artifacts after their useful evidence is preserved. Keep plan/spec until integration is complete.
- [ ] Commit explicit final paths with `test: verify sticker foil optics and presentation lifecycle`; request fresh whole-branch review, resolve concrete defects, and finish the worktree according to the user's authorized scope. Do not merge/push/publish without authorization.

## Controller execution record

Use this plan's ignored SDD workspace for task briefs, reports, diff packages, review findings, and progress. Record reviewed task commits and rulings there so compaction does not repeat completed work. The user selected sub-agent execution in an isolated worktree and delegated routine review; proceed through all tasks without another plan-approval question.
