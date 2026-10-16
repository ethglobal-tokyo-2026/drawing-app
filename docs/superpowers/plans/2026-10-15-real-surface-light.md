# Real-surface light: a measured physical model

> **For agentic workers:** the coordinator runs this plan with superpowers:subagent-driven-development: one lane per area below, each in its own worktree from main's commit at dispatch, merged by the coordinator. Steps use checkboxes.

**Goal (ad0ll):** "an accurate simulation that looks really, really visually striking." Every value is measured or computed from a source; where it isn't, it's a labeled design decision.

**Architecture:** one room fixed in the world (`roomGeometry.ts`, `sharedRoom.ts`), one ceiling light drawn analytically in the shader (`roomShader.ts`), the room's bounce solved offline into a map (`generateRoomLight.ts` → `roomLight.json`), the paper under its coat (`coat.ts`, `stickerShader.ts`), creases as a real drape (`crease.ts`), the viewer re-centered by how long a pose lasts (`light.ts`).

**Tech:** WebGL1 shaders as TS template strings, vitest, Playwright e2e in Chromium and WebKit.

- **Live** (9ffdce3d): one soft ceiling light, steeper creases, paper light, drop shadows, foil lit by the one light, shadow softness from the light, the crease step's contact shadow.
- **Research notes:** `data/scratch/physical-model/` (`scripts/light-placement.mjs` placed the light).

## Decisions (ad0ll, 2026-10-16: all four as recommended)

1. The light's reflection at its physical brightness, with the sharp rim and the CIE veil; the still glare placed off the stickers; foil brightened to the metal's mirror of the light.
2. Coat darkening δ 1.
3. The board at life size.
4. Re-centering by how long a pose lasts: past 12.5° for 10 s or 25° for 5 s, then a 1.5 s ease (iOS 26 Liquid Glass's defaults).

## The model, term by term

| Term                   | Value                                                                                                                                              | Basis                                                                                                                                                                                                    | Kind                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Eye distance           | phone 2050 CSS px (34 cm); tablet 2600 (50 cm)                                                                                                     | Boccardo 2021/2023, Chen 2022, Naipal 2025: phones 33–37 cm; Young 2012: tablets 50 cm; iPhone 17 60.37 and iPad Pro M5 51.97 CSS px/cm                                                                  | measured                                                               |
| Phone or tablet        | a phone has a coarse pointer and a screen whose short side is under 600 CSS px; anything else sits as a tablet does                                | Android's 600 dp boundary                                                                                                                                                                                | computed                                                               |
| Still pose             | phone β 47; tablet β 36                                                                                                                            | Young 2012 (tablets); Chen 2022's gaze angles (phones)                                                                                                                                                   | measured / derived                                                     |
| The light's place      | 55° up, 45° to the viewer's left of straight behind                                                                                                | The placement whose still glare clears both classes' screens (≥ 89 CSS px, iPad landscape) and that stays in front of the screen furthest past upright (β 116°); it matches the controls' top-left light | design decision within the room's geometry                             |
| The light's size       | a 45 cm diffuser 1.71 m away: tan of its angular radius 0.1316 (15.0° across), its height × sin 55° = 0.82                                         | 8-tatami standard (JLMA, 3,800 lm); Panasonic HH-CK0825CA (2023); ceiling 1.4 m above the device                                                                                                         | computed                                                               |
| The light's brightness | radiance = π·W / (R_coated·E_still), about 86–90 shader units; its gloss reflection about 4× paper white                                           | Paper white W at the still pose sets the exposure; lumens and lux cancel                                                                                                                                 | computed                                                               |
| The light's rim        | 0.5° (feather tan 0.5°), before each coat's own lobe                                                                                               | A diffuser's rim is crisp; BOPP haze 1.2% (Ball & Doggett)                                                                                                                                               | measured                                                               |
| Veil                   | 1.85%·deg / (Δ + 0.32°) of the light's body outside its rim                                                                                        | CIE 146:2002, General, age 25                                                                                                                                                                            | measured formula                                                       |
| The light's color      | the display's white (D65)                                                                                                                          | True Tone adapts the screen to the room                                                                                                                                                                  | design decision                                                        |
| Room bounce            | a radiosity solve of a 3.6×3.6×2.4 m box at ceiling .8, walls .6, floor .3, lit by the disc, baked to a 64×32 map of the room seen from the device | EN 12464-1 reflectances; radiosity ≈ 10% of measurement (CIE 171)                                                                                                                                        | computed; room and reflectances are design decisions within EN's range |
| The coat's reflection  | BOPP n 1.51, exact Fresnel, gloss lobe σ_h 0.5° (roughness .024)                                                                                   | Patents; Akao 2010, Nakamura 2022                                                                                                                                                                        | measured                                                               |
| Paper under the coat   | interfaced Lambertian, δ 1: Δ(r) = (1−K)/(1−rK), K .602, paper albedo .855; lit paper white W .864                                                 | OpenPBR 1.1.1 coat darkening; Akao 2010                                                                                                                                                                  | computed                                                               |
| Paper's brightness     | clamp((E/E_still)^0.4, 0.85, 1)                                                                                                                    | ad0ll: slightly, adjustable later                                                                                                                                                                        | design decision                                                        |
| Tone                   | PBR Neutral's hue-keeping compression from 0.88, desaturating toward white, no black offset; foil's diffraction orders keep their saturation       | A screen can't show the light; ACES and AgX move the artists' colors                                                                                                                                     | design decision                                                        |
| Crease shape           | 1 − smoothstep(d/L) at the sticker's real thickness 0.175 mm (1.06 px) over L 2 mm (12 px), shoulder and foot bending equally                      | Thin-plate drape; 3M IJ180                                                                                                                                                                               | computed; L in the computed 1.5–2.6 mm is a design decision            |
| Crease line            | equal shoulder and foot tone                                                                                                                       | Keeps a crease legible where the room shows it faintly                                                                                                                                                   | design decision                                                        |
| Board scale            | life size at the phone's 6.04 CSS px/mm; iPads draw creases 15% larger, so one bake serves both                                                    | ad0ll's decision 3                                                                                                                                                                                       | design decision                                                        |
| Crease shadow          | the drape's self-shadow, marched over its height toward the light: none above its steepest slope (about 7.5°), long at raking light                | Shadow geometry                                                                                                                                                                                          | computed                                                               |
| Drop shadow            | a sticker's real thickness (1 px), blurred by the light's size                                                                                     | Sticker thickness 0.13–0.23 mm                                                                                                                                                                           | computed                                                               |
| Foil                   | a 1400 nm grating, metal reflectance, the same light and room; the palette mapping is art direction (no green)                                     | Stam's diffraction shaders                                                                                                                                                                               | computed; palette per DESIGN.md                                        |
| Motion                 | follows the hand, tremor included                                                                                                                  | One Euro filter on ad0ll's iPad traces                                                                                                                                                                   | measured                                                               |
| Re-centering           | past 12.5° for 10 s or 25° for 5 s, then a 1.5 s ease; the timer restarts inside                                                                   | iOS 26 Liquid Glass (`LightSourceSupport`), read from the system framework                                                                                                                               | shipped practice                                                       |
| Not modeled            | Oren–Nayar (≤3% under a coat), scattering inside paper, whitening agents, birefringence                                                            | The paper research                                                                                                                                                                                       | negligible                                                             |

## Build

Ports per lane for e2e: L1 6371/9971, L3 6471/10071, L5 6571/10171, L4 6671/10271, L7 6771/10371 (holo harness 5871). Every lane: AGENTS.md's comment and test rules, a red edit for each new test, related vitest files and `pnpm check` before reporting, conventional commits on its branch, no merge.

### Phase 1, in parallel

**L1 — the light.** Owns `stickers/viewing.ts` (new), `stickers/roomGeometry.ts` (new), `sharedRoom.ts`, `roomShader.ts`, `roomIrradiance.ts`, `foilMaterial.ts` (disc samples), `lightMode.ts` (STILL_POSE), their unit tests.

- [ ] `viewing.ts`: `VIEWING = { phone: { eyeDistance: 2050, stillBeta: 47 }, tablet: { eyeDistance: 2600, stillBeta: 36 } }`; `viewingClassOf(win)`; `VIEWING_CLASS` once at module load, phone without a window. Test the classifier on a 402×874 coarse, a 1032×1376 coarse and a 1440×900 fine screen.
- [ ] `lightMode.ts`: STILL_POSE's beta from the viewing class.
- [ ] `roomGeometry.ts` (pure, the generator imports it): ceiling 1.4 m above the device, diffuser radius 0.225 m, light elevation 55 and azimuth 45 (left), room 3.6×3.6×2.4 m, device 1.0 m up, reflectances; derived `lightDistance`, `lightRadius` (tan), `lightAspect` (sin elevation).
- [ ] `sharedRoom.ts`: ROOM.eyeDistance from VIEWING; ROOM.light from roomGeometry, fixed in the world (no STILL_POSE), `feather` tan 0.5°, `aspect`; drop haloLevel/haloScale. roomFrame's across/down become world-fixed on the light's plane (across level, down the plumb line seen on it), dropping the lattice-era split.
- [ ] `roomShader.ts`: the disc as an ellipse, distance `length(vec2(p.x, p.y/aspect))`; `roomCeilingLight` = body + (1 − body)·3.2e-4/(max(atan(q) − atan(radius), 0) + .0056) in place of the Gaussian halo; blur `sqrt(feather² + (.4·spread)² + footprint²)` as today.
- [ ] `roomIrradiance.ts` and `foilMaterial.ts`: the light's solid angle and samples over the ellipse (y × aspect, weights × aspect); keyShadow's spread follows (mean of both axes). Test: the samples' solid angle matches π·r²·aspect/(1+r²)^1.5 within 1%.
- [ ] Rerun the light-geometry e2e (stickerLightSweeps, stickerLightRotations, stickerLaminateReadability/Geometry/Rotation, keyShadow, paperLight) and re-derive what the move broke; report the rest.

**L2 — motion.** Owns `light.ts`, `light.test.ts`.

- [ ] `RECENTER = { tiers: [{ release: 12.5, holdMs: 10_000 }, { release: 25, holdMs: 5_000 }], easeMs: 1_500 }` replaces RECENTER_RELEASE/RECENTER_MS. Per tier, the time the reading first went past its release; cleared when it comes back inside; a tier that has waited its hold starts the existing smoothstep ease, which lands exactly. Counted whether moving or held.
- [ ] Tests on fake timers: a 30° tilt held 4.9 s keeps the room and eases at 5 s, landed by 6.5 s; 15° waits 10 s; 30° back to 10° within 5 s never re-centers; 30° then 20° re-centers 10 s after the first crossing.
- [ ] DX2's 15° turn left over at β 135: a test that the turn is identity once landed there; fix if red.

**L3 — creases.** Owns `crease.ts`, `crease.test.ts`, `creaseWorker.ts`, `creaseLight.e2e.ts`, and in `stickerShader.ts` only the crease constants, decode and contact shadow.

- [ ] Constants: `STICKER_THICKNESS_MM` 0.175, `DRAPE_LENGTH_MM` 2, `CSS_PX_PER_MM` 6.04 → thickness 1.06 px, RAMP 12 px; remove CREASE_STEEPENING; NORMAL_SLOPE follows the true thickness.
- [ ] Profile 1 − smoothstep(d/L) in place of the parabola's sharp shoulder, for stacked steps too. Test: a single step's slope is 0 at both ends and 1.5H/L at mid-ramp (±10%); shoulder and foot bends equal (±15%).
- [ ] CREASE_TONE shoulder = foot, labeled a design decision.
- [ ] The height image becomes the draped surface; the march reaches the drape's length (16 px, 12 samples), so the shadow is the drape's own. creaseLight.e2e: finds a raking pose from `roomFrame` in the page (light about 4° above the paper), so it holds wherever L1 puts the light: shadow beyond the shoulder at raking light, none from the step at 24° up.

**L5 — coat and tone.** Owns `stickers/coat.ts` (new), in `stickerShader.ts` the paper composition and tone, `foilCoat` in `foilShader.ts`, `laminateShader.ts`'s coat, the gloss roughness in `stickerRendererGpu.ts`. Draft code: branch `mock-coat-light` (9ed398cb).

- [ ] `coat.ts`: index 1.51, internal reflectance .602, paper albedo .855, paper white .864, δ 1; `coatDarkened` in TS and GLSL from the same constants. Test: white and black stay put; mid-gray darkens; a saturated color gains saturation.
- [ ] Shader: coatDarkened on the print; W .864 in place of .9; Fresnel at n 1.51 everywhere (`2.2801`); `highlightCompress` (PBR Neutral from .88, desaturation .15) in place of paper's `highlightShoulder(.88)`; foil keeps its own until L7.
- [ ] Gloss roughness .024; matte stays .16.

### Phase 2, after L1 and L5 merge

**L4 — the room's light.** Owns `scripts/generateRoomLight.ts` (new, package script `room-light`), `stickers/roomLight.json` (new), the bounce in `roomShader.ts`, `roomIrradiance.ts`'s SH, `sharedRoom.ts`'s radiance and bounce constants, the map's texture unit in `stickerRendererGpu.ts`, `roomFoil` users in `foilShader.ts` and `laminateShader.ts`.

- [ ] Generator: Jacobi radiosity over ~0.1 m patches; the disc a Lambertian emitter at the ceiling's center; the device where roomGeometry's elevation and azimuth put it; the room's radiance seen from the device, per unit light radiance, the disc left out, as a 64×32 equirectangular RGBA8 map in room axes (x left, y toward the viewer, z up) with its scale. Logs progress and the fill at flat, still and upright.
- [ ] Shader: `roomLightMap` replaces roomBounce for gloss, foil and glitter; glossBounce, foilBounce and the analytic bounce retire.
- [ ] `roomIrradiance.ts`: all nine SH terms from the map at module load (the light's azimuth breaks left-right symmetry). Test: SH irradiance within 2% of direct integration of the map at six normals.
- [ ] Radiance = π·W / (R_coated·E_still), E_still from the disc and the map at the class's still pose, R_coated from coat.ts. Foil keeps OVERHEAD_WINDOW's level until L7.
- [ ] E2E: paperLight, keyShadow, creaseLight, stickerLaminateReadability (the still glare is off the stickers by design).

### Phase 3, after L4

**L7 — foil at the physical light.** Owns `foilShader.ts`, `laminateShader.ts`'s glitter flash, `overheadWindow.ts` (retired if only fixtures use it), `FOIL_ROOM`.

- [ ] Foil mirrors the light at paper's radiance; `highlightCompress` for metal, hue-keeping without desaturation for holo's orders; holo's room orders from the map.
- [ ] Holo harness (`data/scratch/holo-hues-finish/harness/run.mjs`), both engines, against main: items 1, 2, 4, 5a hold; item 3 may fail only where the light's own mirror crosses a band, reported per pose.

### Phase 4, coordinator

- [ ] Every sticker, crease, foil, keyShadow and paperLight e2e in both engines; spec lanes for failures, each claim re-derived from the model with its red edit.
- [ ] The model table into `docs/research/sticker-laminate/README.md` with sources; this plan's build section deleted.
- [ ] Code review; impeccable critique on the 21-sticker board at the still pose, upright, raking and flat, phone and iPad; performance against main (material batch notes, WebKit).
- [ ] Deploy, announce, verify the bundle; ad0ll's device check in LINE.

## Open

- **Bright paper upright on ad0ll's iPad:** not reproduced in WebKit. The panel itself (OLEDs are brightest square-on), glare on the glass, or LINE's rotation readings. Two screenshots, at the reading angle and upright, tell them apart.
- **Each foil's metal and the room's bounce** (ad0ll: after this): gold warms it, silver keeps it neutral, rose gold tints it; the map gives the bounce to color.
- **Static shadows left:** the photo sticker, gift bag, give sheet pick, gift received notice, receive dialog; the tray unchecked.
- **HDR output:** WebGPU's HDR canvas (Safari 26) could show the light's real brightness. Unverified in LINE; deferred.

## Platform limits

- **Android (Chromium, LINE's WebView):** `deviceorientation` fires only after a 0.1° change, so slow tilts step.
- **LINE's in-app browser on iPad:** the screen angle is unverified on a device.
