# Sticker laminate

The live coating is a dielectric film across the sticker's full cut, including blank line-art interiors. Transparent artwork has white paper underneath. Ink color affects the composite appearance, but never coating coverage or roughness. All sealed stickers currently use gloss; matte is a coming-soon Shop preview with greater roughness. Backing foil remains separate.

`apps/frontend/src/stickers/laminateShader.ts` composes the print and neutral reflection in linear light using exact dielectric Fresnel. IOR 1.5 and print illumination 0.9 leave a white-paper baseline around 240/255. The reflected scene contains a rectangular source at angular center (0.02, −0.025), half dimensions (0.10, 0.145), edge feather 0.015, ambient radiance 0.14, and source radiance 3.2. At the camera distance of 2.4 short-side units, its unblurred footprint is about 0.48 × 0.70 sticker widths: the blank paper around it makes its edge visible. Gloss uses angular filter width 0.016; matte uses 0.16. These are declared scene and appearance assumptions, not measured laminate parameters or a reconstructed room. The separable shader filter equals the reference's nine positive tent-weighted angular samples. Raw crease slopes supply geometric normals; raised plateaus keep a flat normal. One shared GPU atlas produces bounded 2D snapshots, with resource retirement, loading deadlines, and recovery.

Device tilt changes a persistent reflection, followed by finite smoothing. The shared pose describes the backing foil's reflected-light travel: the coating's normal rotates in the opposite direction so its source travels with that foil in screen coordinates, including turned stickers. The first usable reading calibrates relative to the displayed pose; screen rotation recalibrates without changing that held light. The coating receives each display frame while moving, while CSS foil and crease updates keep their existing throttle. Shared GPU and 2D atlas allocations grow to fit mounted batches without shrinking for individual sticker turns. A covered Sticker Board and its tray retain their snapshots without rendering; re-exposure samples the held pose in a shared batch. Mobile, unknown, denied, blocked, and silent sensor states never acquire timed motion. Only positively classified devices without rotation input qualify for the shared fallback. Sticker turns and finite tray flights update the same geometry. Live image/GPU failures preserve the original image and diagnostic error; canceled work is consumed only after its final owner leaves.

The full relative orientation retains rotation around the screen's normal, including wrist turns while held flat. The first available heading recalibrates to the displayed pose, so a temporarily missing heading does not introduce a jump when it arrives.

Sealed image data is unchanged. Static Explore piles, pickers, gift bags, notices, and thumbnails retain their exported appearance.

## Independent regression reference

`material-reference.ts` is an independent CPU implementation used by the laminate browser regressions. Its tests verify cut-only coverage, neutral dielectric reflection, linear-light composition, roughness, view and sticker geometry, and crease normals. Agreement with the shader checks arithmetic; separate perception tests constrain the visible result. A white flat cut at neutral and small poses must retain near-white surrounding paper, a ≥12/255 peak-to-surround difference, and a half-bright footprint occupying 10–45% of the cut. The gloss boundary must cross 10–90% of its intensity within 15% of the short side. Both positive and negative shared-pose axes must move its centroid in the backing foil's screen direction, including a quarter-turned sticker. It is qualification code rather than a second production renderer.

From the repository root:

```sh
pnpm exec node --test docs/research/sticker-laminate/material-reference.test.ts
pnpm exec tsc -p docs/research/sticker-laminate/tsconfig.json
```

Earlier qualification included the actual No.0017 ashtray's immutable print and cut: both browser engines remained stationary for 22 seconds, responded to synthetic tilt, and held the settled reflection with no missing opaque interior pixels. Safari 26.5 on an iPad simulator also passed the stationary, orientation, cut, ramp-normal, and held-light checks. These checks do not establish physical iPad/LINE sensor delivery, attribution of the original disappearing strip, sustained hardware performance, or compatibility with every older baked highlight.

The iPad Chrome fixture adds independent perception checks at neutral and ±5°: blank white paper remains opaque and neutral, its localized reflection meets the footprint and boundary criteria above, it moves across at least 25% of the tested interior, and black ink retains at least 5:1 contrast. A 24-sticker fixture checks sustained small sensor changes, frame publication, complete paper, and return to a stationary reflection. Browser frame timings describe the test machine, not physical iPad performance. These are acceptance requirements; a passing mathematical reference alone does not establish the material's appearance or responsiveness on a physical iPad.

## Hardware performance qualification

`pnpm --filter frontend test:sticker-performance` runs the same 33.4ms p95 and 100ms maximum display budgets for 24 placed stickers drawn in Kyoto Seika Practice Mode, one 360px floating detail, and real board selection. It uses installed hardware-backed Chrome and native WebKit presentation. Software GPUs and idle baselines above 33.4ms refuse qualification; ordinary functional regressions do not assert machine-dependent timing. Snapshot continuity remains an ordinary selection regression.

The 2026-10-13 Mac run did not qualify performance: Chrome Metal rendered the board in about 0.91ms per update with a 9.2ms display p95, but recorded a 116.7ms display stall. WebKit's idle p95 was already 43–60ms. These are failed or unqualified timing results, not evidence of smooth physical iPad performance. Physical iPad Chrome timing remains unverified.

## Material sources

- Filament's independent clearcoat layer: https://google.github.io/filament/main/filament.html#materialsystem/clearcoatmodel
- PBRT's film over a diffuse substrate: https://www.pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Scattering_from_Layered_Materials
- OpenPBR's separate coating parameters: https://academysoftwarefoundation.github.io/OpenPBR/
- NIST's measured coating roughness and angular scattering: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=860265
- Device orientation and hardware-detection limits: https://www.w3.org/TR/orientation-event/ and https://www.w3.org/TR/generic-sensor/#a-note-on-feature-detection-of-hardware-features
