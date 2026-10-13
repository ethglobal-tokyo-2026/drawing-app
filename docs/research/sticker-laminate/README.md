# Sticker laminate

The live coating is a dielectric film across the sticker's full cut, including blank line-art interiors. Transparent artwork has white paper underneath. Ink color affects the composite appearance, but never coating coverage or roughness. All sealed stickers currently use gloss; matte is a coming-soon Shop preview with greater roughness. Backing foil remains separate.

`apps/frontend/src/stickers/laminateShader.ts` composes the print and neutral reflection in linear light using exact dielectric Fresnel. IOR 1.5, print illumination 0.9, the finite rectangular reflected environment, and nine-tap angular roughness are declared visual assumptions, not measured laminate parameters. Raw crease slopes supply geometric normals; raised plateaus keep a flat normal. One shared GPU atlas produces bounded 2D snapshots, with resource retirement, loading deadlines, and recovery.

Device tilt changes a persistent reflection, followed by finite smoothing. The first usable reading calibrates relative to the displayed pose; screen rotation recalibrates without changing that held light. The coating receives each display frame while moving, while CSS foil and crease updates keep their existing throttle. Shared GPU and 2D atlas allocations grow to fit mounted batches without shrinking for individual sticker turns. A covered Sticker Board and its tray retain their snapshots without rendering; re-exposure samples the held pose in a shared batch. Mobile, unknown, denied, blocked, and silent sensor states never acquire timed motion. Only positively classified devices without rotation input qualify for the shared fallback. Sticker turns and finite tray flights update the same geometry. Live image/GPU failures preserve the original image and diagnostic error; canceled work is consumed only after its final owner leaves.

Sealed image data is unchanged. Static Explore piles, pickers, gift bags, notices, and thumbnails retain their exported appearance.

## Independent regression reference

`material-reference.ts` is an independent CPU implementation used by the laminate browser regressions. Its tests verify cut-only coverage, neutral dielectric reflection, linear-light composition, roughness, view and sticker geometry, and crease normals. It is qualification code rather than a second production renderer.

From the repository root:

```sh
pnpm exec node --test docs/research/sticker-laminate/material-reference.test.ts
pnpm exec tsc -p docs/research/sticker-laminate/tsconfig.json
```

The release qualification included the actual No.0017 ashtray's immutable print and cut: both browser engines remained stationary for 22 seconds, responded to synthetic tilt, and held the settled reflection with no missing opaque interior pixels. Safari 26.5 on an iPad simulator also passed the stationary, orientation, cut, ramp-normal, and held-light checks. These checks do not establish physical iPad/LINE sensor delivery, attribution of the original disappearing strip, sustained hardware performance, or compatibility with every older baked highlight.

The iPad Chrome follow-up adds independent perception checks at neutral and ±5°: blank white paper remains opaque and neutral, its reflection moves across at least 25% of the tested interior, and black ink retains at least 5:1 contrast. A 24-sticker fixture checks sustained small sensor changes, frame publication, complete paper, and return to a stationary reflection. Browser frame timings describe the test machine, not physical iPad performance.

## Material sources

- Filament's independent clearcoat layer: https://google.github.io/filament/main/filament.html#materialsystem/clearcoatmodel
- PBRT's film over a diffuse substrate: https://www.pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Scattering_from_Layered_Materials
- OpenPBR's separate coating parameters: https://academysoftwarefoundation.github.io/OpenPBR/
- NIST's measured coating roughness and angular scattering: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=860265
- Device orientation and hardware-detection limits: https://www.w3.org/TR/orientation-event/ and https://www.w3.org/TR/generic-sensor/#a-note-on-feature-detection-of-hardware-features
