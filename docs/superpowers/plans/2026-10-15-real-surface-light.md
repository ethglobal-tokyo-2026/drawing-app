# Real-surface light: what's left

The measured light is on main (8dd8bea5): one ceiling light in a solved room, paper under a real coat, creases at a sticker's thickness, foil at the physical light, re-centering by dwell. Its model, term by term with sources, is in `docs/research/sticker-laminate/README.md`. ad0ll's decisions (2026-10-16): the light at physical brightness, coat darkening δ 1, life-size creases, re-centering by dwell.

- **Live:** 502252ea, deployed 2026-10-16; the bundle has the build and the developer slip.
- **Research notes:** `data/scratch/physical-model/`; foil renders in `data/scratch/foil-physical-light/` (`main-live/` is live's foil, `floor-fixed/` main's).

## Open

- **Device check:** ad0ll's check in LINE on iPad and phone, with the performance recorder on while tilting.
- **Tilt stalls:** in WebKit on this Mac, a sustained tilt's frames run 1.4–1.5× main's on average and its p95 doubles. Shading costs the same as main, and the stalls stay with every material draw skipped, so the cause is outside the shaders: copies, compositing, or how the light paces redraws. Measured under heavy load; the device check settles whether it's felt. Script: `data/scratch/light-build-perf/` was lost with its worktree; the method is to interleave main and the build on `/e2e/stickerBoardDrag.html?variant=mixed-21&recorder=on`, reading one pixel back before the first copy to time the GPU.
- **The two review fixes below** (handoff briefs).
- **Kyoto Seika silver** mirrors the room's real bounce, so away from the light its band reads mid-gray (luma 83–97) where live's reads 135–177. Holo keeps a fixed colored floor and pink a candy-pink floor; whether silver gets one is ad0ll's call.
- **Holo under the light's own reflection:** only blue and violet diffract within about 15° of it, so a band the glare covers goes white-hot with blue-violet edges, no warm hue. Physical; ad0ll may prefer a wider sweep (about ±0.3) so orange shows there.
- **DESIGN.md:** its foil wording ("bright metal") is arguable for silver away from the light; put to ad0ll, not edited.
- **Review findings, low:** the speed estimate inflates when readings arrive in bursts (unverified on devices); the rim blur and veil are measured in the aspect-stretched distance; nothing ties `roomLight.json` to `roomGeometry.ts`; the generator hard-codes the still poses' elevations; `GLOSS_ROUGHNESS` and the eye distances are derived by hand in comments; `LIGHT_RADIUS` means a tangent in `roomGeometry.ts` and an angle in `stickerShader.ts`; `roomIrradiance.ts`'s header says the light never sinks below a crease's horizon; on return from a hidden page a counting hold can fire against the pre-hide reading.
- **Each foil's metal and the room's bounce** (ad0ll: after this): gold warms it, silver keeps it neutral, rose gold tints it; the map gives the bounce to color.
- **Bright paper upright on ad0ll's iPad:** not reproduced in WebKit. Two screenshots, at the reading angle and upright, tell the panel, glass glare and LINE's readings apart.
- **Static shadows left:** the photo sticker, gift bag, give sheet pick, gift received notice, receive dialog; the tray unchecked.
- **HDR output:** WebGPU's HDR canvas (Safari 26) could show the light's real brightness. Unverified in LINE; deferred.

## Handoff: skip the self-shadow march when it can't shade

Small: one lane, about an hour.

- **Why:** `creaseSelfShadow` (`stickerShader.ts`) runs 12 height fetches plus atan and acos on every pixel whose height image's G flag is set, about a fifth of a creased sticker, on every redraw. It returns exactly 0 unless the light's center sits less than atan(steepest drape slope) + the light's angular radius above the sticker's plane: the march's horizon can't exceed the drape's steepest slope, and `discBelow` is 0 once the disc clears it. For one step that's about 15°. The light stands 58.8° above the paper at the phone's still pose, 64.3° at the tablet's and 23.9° upright, so the march only matters at raking light.
- **Change:**
  - `crease.ts`: the bake reports its drape's steepest slope, rise per CSS px over the draped field, with its images. The worker and surface carry it beside the height image.
  - `stickerRendererGpu.ts` `drawTiles`: compute the tile's `normalTransform` before binding its textures (the height image is bound first today). Take the light in the sticker's axes as transpose(normalTransform)·room.light.
  - Bind `flatHeight` in place of the height image, as the flat snapshot already does, when any of these holds: the tile is flat; the light's z ≤ 0; its elevation atan2(z, |xy|) ≥ atan(steepest) + the light's angular radius. Put that test in a pure function. Export the angular radius from `stickerShader.ts`, renaming its `LIGHT_RADIUS`, which `roomGeometry.ts` uses for a tangent.
  - The image is unchanged by construction.
- **Tests:**
  - The bake's steepest slope for one step is 1.5 × thickness / RAMP, within 10%.
  - The gate function at its boundary: just above it skips, just below it marches.
  - `creaseLight.e2e.ts` in both engines; a red edit that always skips turns its raking test red.
- **Measure:** material GPU time on the 21-sticker board at the still pose, interleaved against main, by the method under Tilt stalls.

## Handoff: a crease's drape depends only on supports near it

Design, then build: a 30-minute spike, then one lane.

- **Why:** `drape` (`crease.ts`) splits the support surface into bands at every plateau level `plateauLevels` finds anywhere in the padded bake, and drapes each band over RAMP·√(its height). So a single cliff that crosses a level present only elsewhere drapes as stacked shorter runs.
  - A 2-high cliff drapes over 17 px alone, but over 12 px (slope 0.24 against 0.17) when a level-1 plateau sits 90 px away.
  - Sticker B overhanging sticker A onto the board drapes over 12 px when A's top shows beside B, and 14 px when A is hidden.
  - Moving an unrelated sticker under the same top sticker re-bakes its crease up to 40% steeper.
- **Rule:** a cliff splits at an intermediate level only where that level's tread lies within the drape's reach of it. Elsewhere it drapes as one band of its full height H, over RAMP·√H.
- **Constraints:** the drape stays continuous, and monotone beside stairs at every tread width and edge placement; that's why the bake went global. Already measured and rejected:
  - the support's local maximum: it jumps under buried steps;
  - each point's top and foot from a window around it: it rises up to 0.19 between stacked steps;
  - blending dilation and closing by their gradients: it kinks along inner-corner bisectors.
- **Spike question:** does blending each level's split and merged drapes by a smooth weight of the distance to that level's tread stay continuous and monotone on the existing stair tests? `envelopePass` already computes exact distance transforms.
- **Tests:**
  - A 2-high cliff drapes over RAMP·√2 with and without an unrelated level-1 plateau beyond reach; today's global levels give 12 px, so it fails before the fix.
  - A level-1 tread wider than the reach still splits the cliff (today's stair tests).
  - Sliding the unrelated plateau from far to adjacent changes the drape continuously.
  - Bake time within 10% of main's.
  - `creaseSupports`, `creaseOverflow` and `creaseLight` e2e in both engines.

## Platform limits

- **Android (Chromium, LINE's WebView):** `deviceorientation` fires only after a 0.1° change, so slow tilts step.
- **LINE's in-app browser on iPad:** the screen angle is unverified on a device.
