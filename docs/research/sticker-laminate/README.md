# Sticker laminate

The live laminate covers the sticker's full cut, including blank line-art interiors. Transparent artwork has white paper underneath. Ink affects composite color, never coating coverage or roughness. Sealed stickers use gloss; matte, glitter and prism are coming-soon Shop previews. Backing foil shares the complete output and registered geometry; sealed image data is unchanged.

`apps/frontend/src/stickers/stickerShader.ts` composes paper, ink, and neutral dielectric reflection in linear light using exact Fresnel. Every material on screen reflects one room from one viewpoint (`sharedRoom.ts`, `roomShader.ts`):

- **The light:** a shoji screen above and behind the viewer, a little left, with a frame and kumiko lattice, so its reflection reads on near-white paper. Each coat blurs it by its own lobe, and a soft halo around it, for the wall it lights and the eye's veiling glare, brightens before its reflection arrives and fades after it leaves. Its still glare sits in the screen's upper third.
- **The bounce:** a ceiling, the wall the shoji lights, other walls and a floor.
- **The viewpoint:** one viewer in front of the screen's center, toward its bottom edge when the device lies flat. The room and the viewer stay put in the world while the hand turns the device; once the device turns past a release, the viewer glides back in front of it. A sticker's reflection depends on where it sits on screen.
- **Paper's highlights** roll off above a shoulder, so the print never clips.

Gloss and matte use different angular filter widths. The separable filter matches nine positive tent-weighted samples. Raw crease slopes supply geometric normals; raised plateaus stay flat. Glitter and prism (`laminateShader.ts`) build on the same coat: glitter adds flakes that mirror the foil's room and flash where they meet the overhead window; prism lays palette facets over the print that slide and turn with the coat's normal. Scene and appearance constants are declared assumptions, not measured laminate parameters.

## Runtime

The light publishes the device's pose, beta and gamma from DeviceOrientation plus the screen angle, and the turn since the attitude the viewer is centered on, smoothed by a finite glide (`light.ts`, `lightMode.ts`):

- **Orientation:** alpha, beta and gamma give the device's attitude; without alpha, each change in gravity is the smallest turn that explains it. A restarted listener keeps the heading the device was lit at. A turned screen turns the room with the content at once.
- **The still pose:** before any reading the room is lit at the usual reading angle, and the first reading glides from it, with the viewer centered on that reading.
- **Pauses:** release, a hidden page, reduced motion or revoked permission hold the last pose.
- **Redraws:** coating and foil receive the same pose each display frame. A surface that moves on screen redraws as it moves: a drag, a landing, a scroll once it stops, a resize.
- **Creases** are lit from the static top left, as the drop shadows are, and don't follow tilt. Mobile, unknown, denied, blocked, and silent sensor states remain stationary; only positively classified devices without rotation input qualify for timed fallback motion. The static foil span supplies only the fallback and registered cast; complete material rendering replaces the former live CSS effects.

One WebGL context renders packed tiles. It requests `premultipliedAlpha: true`; the shader composes paper over foil and multiplies final display-space RGB by their combined alpha, leaving optical calculations and print uploads unchanged. Zero combined alpha produces zero RGBA. Each batch clears its used GL rectangle, submits its tile draws, then crops directly into retained sticker canvases with `copy`, including transparent pixels. All crops finish before the next batch overwrites the source. There is no second full-size 2D atlas.

Complete exposed registered geometry determines GL capacity, including pending textures and first normals. Partial refreshes select ready targets within that plan. Capacity can shrink from a covered Sticker Board to its detail without discarding board snapshots or textures. Re-exposure samples the held pose. Initially covered, detached, and offscreen surfaces defer resource acquisition; closed sticker trays create images and laminate owners when opened.

Decoded texture uploads share a validation task after 16ms rather than querying GPU errors after each upload. A successful batch checks once and becomes eligible for snapshots only afterward. Failed batches report every affected URL; error draining is bounded, and an unreadable shared error state fails and settles all owners while preserving their last bitmaps. Cancellation, context loss, and a 20-second deadline retire unvalidated uploads. WebGL 1 error checks remain synchronous: batching reduces queries without guaranteeing a cheap check.

Board exposure reaches the laminate leaves through context. Turns and detail covers suspend their retained surfaces without re-rendering the memoized sticker figures. The independently displayed detail stays active. Re-exposure samples the held pose once.

Initial Sticker Board assembly waits for exposed snapshots, applicable foil masks, and the first crease baseline, with a ten-second overall deadline. Readiness checks the complete material generation and normal committed to the retained snapshot and excludes later sharp-image refinement. Unavailable or failed workers settle affected jobs with diagnostics. Live failures retain the last complete material or original image; canceled generations cannot replace current pixels. Final ownership release retires pending and GPU resources. Concealing NSFW artwork disposes its complete output and copied flyers, including their fallback images.

Only an explicit placement commit grants a finite crease reveal. Hydration, viewport changes, material refinement, and remounting do not grant one. The matching accepted normal consumes that grant after its first retained snapshot, including when reduced motion displays it immediately. Covering the board cancels unstarted grants.

Current upstream WebKit captures the WebGL source before applying a crop and caches unchanged snapshots. Repeated direct reads can share that cache too: staging does not establish avoidance of one GPU capture per sticker, cropped backend readback, or free transfer.

## Verification

`material-reference.ts` independently checks coverage, neutral reflection, linear composition, roughness, geometry, and normals. Browser perception regressions additionally constrain near-white paper, localized highlight footprint and boundary, movement in the foil's screen direction, and black-ink contrast. Lifecycle regressions cover partial batches, delayed textures, re-exposure, readiness, failures, and cancellation.

`stickerLaminateAlpha.e2e.ts` compares premultiplied output with an independent straight-alpha GL reference across gloss/matte, blank paper, line art, gray, saturated ink, normals, turns, flight tilt, and fractional cuts. Alpha and opaque colors remain exact. Displayed fractional-edge composites allow at most 2/255 channel difference because premultiplication changes eight-bit rounding order; that allowance does not apply to opaque ink or optical parameters.

Run from the repository root:

```sh
pnpm exec node --test docs/research/sticker-laminate/material-reference.test.ts
pnpm exec tsc -p docs/research/sticker-laminate/tsconfig.json
pnpm --filter frontend test:e2e e2e/stickerLaminate.e2e.ts e2e/stickerLaminateAlpha.e2e.ts e2e/stickerLaminateGeometry.e2e.ts e2e/stickerLaminateReadability.e2e.ts e2e/stickerLaminateRotation.e2e.ts e2e/stickerLaminateFrames.e2e.ts e2e/stickerLaminateFlight.e2e.ts e2e/stickerLaminateSelection.e2e.ts e2e/stickerLaminateLifecycle.e2e.ts e2e/stickerLaminateConceal.e2e.ts e2e/stickerLaminateCoveredBoard.e2e.ts e2e/stickerLightFrames.e2e.ts e2e/stickerBoardDrag.e2e.ts --project=chromium --project=webkit --workers=1
pnpm --filter frontend test:sticker-performance --project=chrome
```

Hardware gates require display p95 ≤16.7ms and maximum ≤50ms; software GPUs or failing idle baselines refuse qualification. They cover loaded boards, details, selection, dragging, tilt, real detail flights, and sheet peel. Each measured scene checks its own hardware renderer and idle baseline. Startup remains unqualified: batched texture-upload error checks can still wait for queued GPU work on the main thread, and initial app layout has separately exceeded the frame budget.

A physical-device repeat is required to qualify iPad performance. Mac results and simulator functional checks establish neither physical iPad/LINE performance nor sustained 120Hz ProMotion output. While recording, material batch notes separate submission, first retained copy, and remaining copies; these synchronous timings do not prove GPU completion. `STICKER_DRAG_TRACE=on` enables explicit Chrome timeline capture.

## October 13 frame-cost investigation

The physical M5 iPad Pro report taken at 21:48:46 UTC recorded 904 slow frames out of 4,354. Its latest retained tilt frames were commonly 43–55ms apart while measured material/light callbacks occupied only part of that interval. Those wrappers do not account for all browser rendering, scheduling, or GPU work. The image-arrival and Stat board opening spikes remain separately unattributed; the report does not establish a repeated download loop or per-frame recorder UI updates.

A controlled 21-sticker comparison on hardware Chrome (M5 Max, Metal) reduced style-recalculation time from roughly 1.3–2.2ms per display frame to 0.007–0.026ms when foil property writes were held. A baseline Chrome trace showed repeated Kyoto Seika sheen painting. Holding laminate rendering did not remove that style cost. Freezing either foil axis alone, pruning unused values, registering properties, or adding paint/compositing hints did not establish a consistent improvement; none was applied. These measurements isolate foil work on this scene, not the exact cost of the physical iPad's irregular stickers.

Direct laminate crops removed the copy into a second full-size 2D canvas and its allocation. On native simulator Safari 26.5, the same 21-sticker fixture was fitted to the iPad Air viewport; successive baseline/direct/baseline/direct/baseline synchronous copy times were 63.3/56.4/63.0/47.6/56.4ms per light publication. Comparing each direct run with the average of its neighboring baselines measures about 10.7% and 20.3% less copy time, with variable overall frame intervals. Hardware Chrome copy time stayed approximately 0.2ms per publication. Both engines' 21 retained bitmaps matched the staged path exactly. The lifecycle regression additionally compares distinct prints, normals, fractional cuts, and flight poses with an independent staged reference across multiple batches. This qualifies removal of the extra copy, not the physical iPad's overall frame rate or the remaining foil cost.

### Populated app startup and Stat board turns

A full-app Chrome capture used production React, local test sign-in, 49 distinct production-format 600px WebP stickers, 23 placed on a 1200×1454 board at 2x. Images were prepared before capture. The scene held its light pose; it did not test physical rotation or tray opening. Development-build timings were excluded from production conclusions.

Repeated baseline captures made 68 upload error checks, totaling 247.0 and 195.6ms in elapsed native-call time. The first batched candidate made 26 checks totaling 150.7ms, but one check still waited 88.8ms. Thus deferral alone did not remove startup stalls. A later final capture made 23 checks totaling 6.9ms; cache and host variation prevent treating that low total as a stable device cost. Upload pixels, filtering, optical parameters, and retained crop semantics are unchanged.

The first Stat board turn exposed two forced-layout paths. The hidden drawing screen measured its Layer list during background mounting; it now measures and observes only while active. The Settings paper measured immediately on mounting and mixed geometry reads with writes; its first measurement now comes from ResizeObserver delivery, with all reads before changed writes. The final capture's first/second turn maximum intervals were 17.1/9.3ms, compared with baseline first turns of 117.3/91.7ms. Both sides were visually inspected. These stationary Mac results qualify those specific paths, not physical iPad cadence or remaining foil rendering costs. The final startup still had a 158.3ms initial app frame.

The upload regressions exercise delayed readiness, exact replacement pixels, complete OOM diagnostics, release, deadline, lost/restored generations, and terminal failure settlement for existing and cached owners. Unit regressions preserve exposure behavior, memoized figures, visible Layer scrolling, and the Settings paper's tuck and Stats clearance. Future finish-renderer integration must preserve these ownership and exposure rules as well as direct retained crops.

## Sources

- Clearcoat model: https://google.github.io/filament/main/filament.html#materialsystem/clearcoatmodel
- Layered scattering: https://www.pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Scattering_from_Layered_Materials
- Orientation events: https://www.w3.org/TR/orientation-event/
- WebGL alpha representation: https://registry.khronos.org/webgl/specs/latest/1.0/#PREMULTIPLIED_ALPHA
- Blocking WebGL queries: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_blocking_api_calls_in_production
- WebKit capture before cropping: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/canvas/CanvasRenderingContext2DBase.cpp
- WebKit cached source snapshots: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp
- WebKit Cocoa framebuffer capture: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/cocoa/GraphicsContextGLCocoa.mm

## Foil

Foil renders in the same pass as paper and laminate, under the same light, pose, turn and crease normal (`foilShader.ts`). It mirrors the same shared room as paper, more strongly, as a metal does.

Holo:

- **Diffraction** comes from concentric grooves lit by the shoji and by lamps fixed in the room, eye-level ones among them.
- **A floor:** the room's bounce adds a colored floor, so every band keeps color at every pose.
- **Hue sweep:** an authored sweep sets the band's hues by its angle round the sticker, and the floor's hues travel with tilt and side tilt.
- **No hue is green.**

Pink is candy-pink metal, never dimmer than the room's level. Kyoto Seika Practice Mode foil prints fixed screentone over silver, 80 tiles across the short side and never under 3 CSS px. `apps/frontend/scripts/generateFoilLookup.ts` (`pnpm --filter frontend foil-lookup`) regenerates the diffraction lookup (`foilLookupBasis.json`) from `foilSpectrum.json` (D65 and the CIE 1931 photopic curve); its grating period, order weights and lobe width are authored, not measured stock.

The band's coverage is prepared off the main thread: `foilCoverageWorker.ts` decodes the cut or the server's baked mask, grows the band and encodes the static band's mask. `acquireFoilCoverage.ts` shares one coverage per cut, style, mask, tile size and growth while anything holds it, and a copied cast holds the mask it shows. The static span (`StickerFoil`, `prepareStickerFoil`) supplies only the fallback band and the cast, registered to the coverage the renderer draws.

A first load whose coverage fails shows paper and laminate without foil and reports the error; once a complete output exists, a failed replacement keeps it. Creased overflow needs a normal registered over the whole outer coverage (`normalBounds`), which the crease worker bakes only when the grown band leaves the source frame. Removing a normal while a replacement is pending stages the flat transition with that replacement.

A copied presentation can request its own coverage frame with `updateSticker(canvas, options, requestedCoverageFrame)`; its old complete snapshot stays committed until the replacement's pixels commit. `subscribeStickerFoilCoverage(canvas, committed)` publishes changed coverage only after complete pixels commit, so a flyer's cast follows its copy.
