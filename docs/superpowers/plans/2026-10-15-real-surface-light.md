# Real-surface light: what's left

The measured light is on main (8dd8bea5): one ceiling light in a solved room, paper under a real coat, creases at a sticker's thickness, foil at the physical light, re-centering by dwell. Its model, term by term with sources, is in `docs/research/sticker-laminate/README.md`. ad0ll's decisions (2026-10-16): the light at physical brightness, coat darkening δ 1, life-size creases, re-centering by dwell.

- **Live:** 9ffdce3d until main is deployed; the deploy waits on ad0ll.
- **Research notes:** `data/scratch/physical-model/`; foil renders in `data/scratch/foil-physical-light/` (`main-live/` is live's foil, `floor-fixed/` main's).

## Open

- **Deploy and device check:** deploy main, verify the bundle (the slip's `getFriendship` in the StatBoard chunk), then ad0ll's check in LINE on iPad and phone with the performance recorder on while tilting.
- **Tilt stalls:** in WebKit on this Mac, a sustained tilt's frames run 1.4–1.5× main's on average and its p95 doubles. Shading costs the same as main, and the stalls stay with every material draw skipped, so the cause is outside the shaders: copies, compositing, or how the light paces redraws. Measured under heavy load; the device check settles whether it's felt. Script: `data/scratch/light-build-perf/` was lost with its worktree; the method is to interleave main and the build on `/e2e/stickerBoardDrag.html?variant=mixed-21&recorder=on`, reading one pixel back before the first copy to time the GPU.
- **Crease drape depends on unrelated stickers** (`crease.ts` `plateauLevels`): levels are collected across the whole bake, so a cliff crossing a level that exists only elsewhere drapes in shorter runs (17 px alone, 12 px beside an unrelated level-1 plateau). Split a cliff only at levels whose plateau lies within the drape's reach; test a 2-high cliff with and without an unrelated plateau.
- **The self-shadow march runs when it can't shade:** it returns 0 until the light sinks below the drape's steepest slope plus its radius (past β ≈ 100°), yet runs 12 fetches on every flagged pixel at every pose. Skip it per tile when the light is above that, with the bake reporting the drape's steepest slope.
- **Kyoto Seika silver** mirrors the room's real bounce, so away from the light its band reads mid-gray (luma 83–97) where live's reads 135–177. Holo keeps a fixed colored floor and pink a candy-pink floor; whether silver gets one is ad0ll's call.
- **Holo under the light's own reflection:** only blue and violet diffract within about 15° of it, so a band the glare covers goes white-hot with blue-violet edges, no warm hue. Physical; ad0ll may prefer a wider sweep (about ±0.3) so orange shows there.
- **DESIGN.md:** its foil wording ("bright metal") is arguable for silver away from the light; put to ad0ll, not edited.
- **Review findings, low:** the speed estimate inflates when readings arrive in bursts (unverified on devices); the rim blur and veil are measured in the aspect-stretched distance; nothing ties `roomLight.json` to `roomGeometry.ts`; the generator hard-codes the still poses' elevations; `GLOSS_ROUGHNESS` and the eye distances are derived by hand in comments; `LIGHT_RADIUS` means a tangent in `roomGeometry.ts` and an angle in `stickerShader.ts`; `roomIrradiance.ts`'s header says the light never sinks below a crease's horizon; on return from a hidden page a counting hold can fire against the pre-hide reading.
- **Each foil's metal and the room's bounce** (ad0ll: after this): gold warms it, silver keeps it neutral, rose gold tints it; the map gives the bounce to color.
- **Bright paper upright on ad0ll's iPad:** not reproduced in WebKit. Two screenshots, at the reading angle and upright, tell the panel, glass glare and LINE's readings apart.
- **Static shadows left:** the photo sticker, gift bag, give sheet pick, gift received notice, receive dialog; the tray unchecked.
- **HDR output:** WebGPU's HDR canvas (Safari 26) could show the light's real brightness. Unverified in LINE; deferred.

## Platform limits

- **Android (Chromium, LINE's WebView):** `deviceorientation` fires only after a 0.1° change, so slow tilts step.
- **LINE's in-app browser on iPad:** the screen angle is unverified on a device.
