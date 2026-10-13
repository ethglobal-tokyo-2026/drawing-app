# Sticker laminate

The live laminate covers the sticker's full cut, including blank line-art interiors. Transparent artwork has white paper underneath. Ink affects composite color, never coating coverage or roughness. Sealed stickers use gloss; matte is a coming-soon Shop preview. Backing foil remains separate, and sealed image data is unchanged.

`apps/frontend/src/stickers/laminateShader.ts` composes paper, ink, and neutral dielectric reflection in linear light using exact Fresnel. A finite rectangular reflected source makes the highlight's boundary visible against near-white paper. Gloss and matte use different angular filter widths. The separable filter matches nine positive tent-weighted samples. Raw crease slopes supply geometric normals; raised plateaus stay flat. Scene and appearance constants are declared assumptions, not measured laminate parameters.

## Runtime

Device rotation changes a persistent reflection through finite smoothing. Both tilt axes and rotation around the screen normal survive sticker turns. Sensor acquisition and newly available heading establish the reference from the displayed pose. Screen rotation transforms that fixed reference into the current displayed axes without recalibrating it, so orientation round trips restore the same reflection. Heading wrap follows the shortest angle. Coating and foil receive the same pose each display frame without another foil transition or publication throttle. Crease shading updates after settling. Mobile, unknown, denied, blocked, and silent sensor states remain stationary; only positively classified devices without rotation input qualify for timed fallback motion. Foil compositing hints cover the glint, its first pseudo-element, and the Kyoto Seika Practice Mode foil's second pseudo-element.

One WebGL context renders packed tiles. It requests `premultipliedAlpha: true`; the shader multiplies final display-space RGB by cut alpha, leaving optical calculations and print uploads unchanged. Zero cut alpha produces zero RGBA. Each batch clears its used GL rectangle, submits its tile draws, then crops directly into retained sticker canvases with `copy`, including transparent pixels. All crops finish before the next batch overwrites the source. There is no second full-size 2D atlas.

Complete exposed registered geometry determines GL capacity, including pending textures and first normals. Partial refreshes select ready targets within that plan. Capacity can shrink from a covered Sticker Board to its detail without discarding board snapshots or textures. Re-exposure samples the held pose. Initially covered, detached, and offscreen surfaces defer resource acquisition; closed sticker trays create images and laminate owners when opened.

Initial Sticker Board assembly waits for exposed snapshots, applicable foil masks, and the first crease baseline, with a ten-second overall deadline. Readiness checks the normal committed to the retained snapshot and excludes later sharp-image refinement. Unavailable or failed workers settle affected jobs with diagnostics. Live failures retain the last complete material or original image; canceled generations cannot replace current pixels. Final ownership release retires pending and GPU resources. Concealing NSFW artwork remounts its laminate to discard the previous bitmap.

Only an explicit placement commit grants a finite crease reveal. Hydration, viewport changes, material refinement, and remounting do not grant one. The matching accepted normal consumes that grant after its first retained snapshot, including when reduced motion displays it immediately. Covering the board cancels unstarted grants.

Current upstream WebKit captures the WebGL source before applying a crop and caches unchanged snapshots. Repeated direct reads can share that cache too: staging does not establish avoidance of one GPU capture per sticker, cropped backend readback, or free transfer.

## Verification

`material-reference.ts` independently checks coverage, neutral reflection, linear composition, roughness, geometry, and normals. Browser perception regressions additionally constrain near-white paper, localized highlight footprint and boundary, movement in the foil's screen direction, and black-ink contrast. Lifecycle regressions cover partial batches, delayed textures, re-exposure, readiness, failures, and cancellation.

`stickerLaminateAlpha.e2e.ts` compares premultiplied output with an independent straight-alpha GL reference across gloss/matte, blank paper, line art, gray, saturated ink, normals, turns, flight tilt, and fractional cuts. Alpha and opaque colors remain exact. Displayed fractional-edge composites allow at most 2/255 channel difference because premultiplication changes eight-bit rounding order; that allowance does not apply to opaque ink or optical parameters.

Run from the repository root:

```sh
pnpm exec node --test docs/research/sticker-laminate/material-reference.test.ts
pnpm exec tsc -p docs/research/sticker-laminate/tsconfig.json
pnpm --filter frontend test:e2e stickerLaminate stickerLightFrames stickerBoardDrag
pnpm --filter frontend test:sticker-performance --project=chrome
```

Hardware gates require display p95 ≤16.7ms and maximum ≤50ms; software GPUs or failing idle baselines refuse qualification. They cover loaded boards, details, selection, dragging, and tilt. Startup remains unqualified: immediate texture-upload error checks can wait for queued GPU work on the main thread.

A physical-device repeat is required to qualify iPad performance. Mac results and simulator functional checks establish neither physical iPad/LINE performance nor sustained 120Hz ProMotion output. While recording, material batch notes separate submission, first retained copy, and remaining copies; these synchronous timings do not prove GPU completion. `STICKER_DRAG_TRACE=on` enables explicit Chrome timeline capture.

## October 13 frame-cost investigation

The physical M5 iPad Pro report taken at 21:48:46 UTC recorded 904 slow frames out of 4,354. Its latest retained tilt frames were commonly 43–55ms apart while measured material/light callbacks occupied only part of that interval. Those wrappers do not account for all browser rendering, scheduling, or GPU work. The image-arrival and Stat board opening spikes remain separately unattributed; the report does not establish a repeated download loop or per-frame recorder UI updates.

A controlled 21-sticker comparison on hardware Chrome (M5 Max, Metal) reduced style-recalculation time from roughly 1.3–2.2ms per display frame to 0.007–0.026ms when foil property writes were held. A baseline Chrome trace showed repeated Kyoto Seika sheen painting. Holding laminate rendering did not remove that style cost. Freezing either foil axis alone, pruning unused values, registering properties, or adding paint/compositing hints did not establish a consistent improvement; none was applied. These measurements isolate foil work on this scene, not the exact cost of the physical iPad's irregular stickers.

Direct laminate crops removed an extra full-buffer copy and allocation. On native simulator Safari 26.5, the same 21-sticker fixture was fitted to the iPad Air viewport; successive baseline/direct/baseline/direct/baseline synchronous copy times were 63.3/56.4/63.0/47.6/56.4ms per light publication. This measures about 10–20% less copy time against the neighboring baselines, with variable overall frame intervals. Hardware Chrome copy time stayed approximately 0.2ms per publication. Both engines' 21 retained bitmaps matched the staged path exactly. The lifecycle regression additionally compares distinct prints, normals, fractional cuts, and flight poses with an independent staged reference across multiple batches. This qualifies removal of the extra copy, not the physical iPad's overall frame rate or the remaining foil cost.

## Sources

- Clearcoat model: https://google.github.io/filament/main/filament.html#materialsystem/clearcoatmodel
- Layered scattering: https://www.pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Scattering_from_Layered_Materials
- Orientation events: https://www.w3.org/TR/orientation-event/
- WebGL alpha representation: https://registry.khronos.org/webgl/specs/latest/1.0/#PREMULTIPLIED_ALPHA
- WebKit capture before cropping: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/canvas/CanvasRenderingContext2DBase.cpp
- WebKit cached source snapshots: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp
- WebKit Cocoa framebuffer capture: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/cocoa/GraphicsContextGLCocoa.mm
