# Real-surface light: creases, shadows, motion and reflections

**Goal:** the board behaves like real stickers under one real room:

- crease shading and drop shadows follow the light;
- the reflection follows the hand, tremor included;
- some light reflects at every pose.

Simulate it physically first, then tune the strengths by feel (ad0ll, 2026-10-15: "just get the simulation right").

**Shipped so far:** the room and the viewer stay put in the world (3dea75b6), and holo's warm hues (3a622af0).

## Platform limits

- **Android (Chromium, LINE's Android WebView):** `deviceorientation` fires only after an angle moves 0.1°, which is 6.6 px of reflection. Slow tilts arrive in steps, and tremor under 0.1° never reaches the page. iOS and iPadOS have no threshold: the smallest step seen was 0.0066°.
- **LINE's in-app browser on iPad:** its screen angle is unverified on a device. The performance recorder's orientation lines show it.

## Decisions

1. **The room's light shades creases, physically, in the sticker shader.**
   - Per fragment, from the crease normal and `roomFrame`: E(n) = E_shoji·n·L + E_room(n), where E_room is `roomBounce`'s irradiance as spherical harmonics (Ramamoorthi & Hanrahan).
   - The print is multiplied by 1 + k·(E(n) − E(n₀))/E(n₀).
   - k = 1 is physical, kept as one named constant for tuning by feel.
   - The foil band's metal is shaded the same way.
   - The baked rise and `CREASE_LIGHT` retire. The base bake (shoulder and foot) stays, as occlusion.
   - The normal is re-encoded so a crease's slope spans about 127 levels, not 6.
   - No cast self-shadow: creases are under 3° and the light stays above 18°.
   - Physically the shading is faint: at a slope of 0.047 it is 0.8% at β 30, 1.6% at β 47, 3.0% at β 70 and 4.6% at β 90. ad0ll accepts that and will judge it by feel.
2. **Lying flat, the light comes from the bottom edge, so crease lighting flips.** Accepted for now. Revisit the room's lights once the basic version works; ad0ll suggested a light in front of the viewer as well as behind.
3. **Drop shadows follow the light, as in a real room.**
   - A key shadow sits away from the light: offset h·S with S = −L_xy/L_z, clamped near 1.5.
   - Its blur comes from the shoji's size (about h·0.36/L_z² along S), and its opacity from the shoji's share of the light.
   - A static, even ambient shadow sits under it.
   - Upright it falls straight down, longer and softer. At the reading pose it is short. Lying flat it falls toward the top edge.
   - It is drawn as a pre-blurred layer moved with `transform` on each publish, never by rewriting `filter`.
   - h is a design elevation: the real 0.35 px thickness is sub-pixel.
4. **The reflection follows the hand, tremor included.**
   - Remove the 0.5° input band and the 160 ms glide.
   - Run a One Euro filter on the attitude quaternion: min cutoff 2 Hz, β 10, derivative cutoff 1 Hz, with dt from each event.
   - Publish once the reflection has moved ≥ 0.5 CSS px. Re-centering's gate moves to px too.
   - On ad0ll's recorded iPad traces, today's band froze 28% of frames and trailed by 114 px on average. The filter trails by 2.4 px, and sensor noise is under 0.31 px.

5. **Lights at every pose: the reflections spike's variant e, with brighter cores.**
   - Today's room reflects brightly only at β 40–50, and nothing when upright. Variant e keeps light on a sticker at every pose: at least 71% of a black sticker is above luma 0.1, with glare at 6 of 10 β poses. Black ink stays darker than in the brighter variant d.
   - Its sources:
     - today's shoji, with the lattice softened;
     - a round ceiling lamp, 66° up beyond the device;
     - a soft round window at eye level behind the viewer;
     - a brighter bounce: ceiling .62, lit wall .56, walls .36, floor .08.
   - From its critique: the sources read as gray shapes, so give each a small core bright enough to clip near white, with a falloff. Move the eye-level window 30–45° to one side, away from the viewer's head; a round marumado suits the room.
   - Every material mirrors the same sources, including foil's source samples and glitter's flash.
   - ad0ll tunes positions by feel once it works. Watch the dip at β 30, between the lamp and the shoji.
   - The spike is on branch `reflections-spike` (116416fb), never merged. Its sheets are in `data/scratch/light-shading/reflections/`.
6. **The shoji's grid stays,** squared so its rails are level and its bars plumb (today it hangs about 2.8° off level), and slightly softened as a real gloss does. ad0ll chose the shoji; the complaint was that it shows only at some poses, which 5 answers.
7. **The foil's shine is physical, with no per-sticker glow.**
   - A small light, like 5's ceiling lamp, gives the real sliding highlight on a sticker's foil.
   - The big shoji brightens a whole band at once, because a phone-size sticker spans about ±5° of the room's reflection.
   - Rounds 3 and 4 are on branches `foil-shine-3` and `foil-shine-4`; use them as a reference only.
8. **DESIGN.md's One Light Rule** opens: "Crease shading, drop shadows and reflections all come from one room that stays put in the world…". It replaces "Static shadows and crease shading fall from the top left…" (ad0ll approved, 2026-10-15).

## Cost

- **Each publish redraws every sticker:** about 7 ms of main thread per publish, measured on the 2026-10-13 build, mostly the copy from WebGL to each sticker's canvas.
- **Following tremor publishes every frame while held:** about 21% of the main thread at 30 fps, and 41% at 60 fps. Measure on today's build first.
- **If too costly:** cap publishes at 30/s, and cut the per-publish copy, the real lever.
- **Re-centering:** today it redraws for about 8 s after a big posture change (a model of the loop, not measured). Ease onto the device over a fixed 1 s instead.

## Build (each lane owns its files)

- **A, motion** (`light.ts`, `lightMode.ts`): the filter, the px gates, and re-centering's fixed ease. Unit tests replay the recorded traces: no stalls, tremor passes.
- **B, creases** (`stickerShader.ts`'s paper term, `crease.ts`, `creaseWorker.ts`, `useCreases.ts`, `StickerCrease.tsx`, `sticker-crease.css`):
  - shading in the shader, with the rise and `CREASE_LIGHT` retired and the normal re-encoded;
  - new e2e: a print over a support band, swept through β 0, 20, 47, 70 and 90. Bottom-facing ramps darken against top-facing ones as the device rises, and the sign flips lying flat.
- **C, drop shadows** (the tokens and the sticker CSS):
  - a key shadow that follows the light, plus a static ambient one;
  - the cheapest correct way to move it each publish, measured, never by rewriting `filter`;
  - an e2e checks the shadow's offset direction against the pose.
- **D, room** (`sharedRoom.ts`, `roomShader.ts`, `foilShader.ts`'s room and sources, `laminateShader.ts`'s flash): decisions 5–7 and the square shoji, with foil and glitter mirroring every source.
- **E, cost:** measure publish cost on main in Chromium, then cut the per-publish copy if it's the bottleneck.
- **Then align specs:** the sweeps and rotations measure glare as luma above 0.35, so once A and D land they track the shoji, not the lamp or window.
- **Checks before deploy:**
  - every light, crease, laminate and foil e2e in both engines;
  - an impeccable critique on the 21-sticker board across the pose matrix;
  - the cost numbers;
  - DESIGN.md's One Light Rule, per decision 8;
  - ad0ll's device check in LINE through the recorder, which also covers holo's warm hues in motion.

## Sources

- Ramamoorthi & Hanrahan 2001: https://cseweb.ucsd.edu/~ravir/papers/envmap/envmap.pdf
- Filament's spherical harmonics irradiance: https://google.github.io/filament/Filament.md.html
- Arvo 1995, polygonal light irradiance: https://dl.acm.org/doi/10.1145/218380.218467
- Exaggerated shading: https://gfx.cs.princeton.edu/pubs/Rusinkiewicz_2006_ESF/index.php
- Light and shadow: https://m2.material.io/design/environment/light-shadows.html and https://www.joshwcomeau.com/css/designing-shadows/
- One Euro filter: https://dl.acm.org/doi/10.1145/2207676.2208639 and https://gery.casiez.net/1euro/
- Chromium's 0.1° threshold: https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/device_orientation/device_orientation_event_pump.cc
- WebKit's 60 Hz motion timer, with no threshold: https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/ios/WebCoreMotionManager.mm
