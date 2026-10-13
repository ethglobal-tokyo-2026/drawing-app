# Sticker laminate design spec

Date: October 12, 2026. Status: proposed design for research and planning; product implementation has not started. Source findings and browser evidence: `docs/research/sticker-laminate/README.md`.

## Job and visual direction

An artist viewing a sealed sticker should recognize their printed artwork beneath a thin clear laminate, including a sticker that is mostly black line art on white paper. The surface should read as a physical coating when the device turns, then hold its reflection when the device stops. Repairing unwanted animation alone does not satisfy this job.

The direction inherits Croquis's sticker trade book and thin vinyl material in `PRODUCT.md` and `DESIGN.md`. On a Sticker Board and in detail, the artwork leads; the laminate establishes the object. In the Shop, the same artwork and lighting make finishes comparable. The face's coating remains distinct from the foil band. Do not restore a domed badge, tinted resin pooling, metallic ink, white flash, or painted gray strip.

Superpowers systematic debugging and brainstorming separate reproduced defects from proposed behavior; this standalone spec precedes production choices. Impeccable context and its Shape playbook inform the material hierarchy, states, platform constraints, and visual review. The implementation plan follows this spec rather than treating a research report as an approved renderer design.

## Settled requirements

- A cut mask alone determines laminate coverage; artwork RGB, artwork alpha, and ink density never determine reflection existence, coverage, or roughness.
- On iPad and phone, real device tilt is the only input for changing material light. A stationary device holds the last reflection after finite smoothing. Mouse, pen, and finger interactions never move it.
- The timed gloss wave is permitted only on devices without rotation input. It never runs on iPad or phone, including before permission, after denial, with a blocked API, or with missing readings.
- Reduced motion freezes material light. Backgrounding and releasing the last light owner stop pending material work.
- Existing sealed stickers remain gloss. Matte, glitter, prism, and other backing foils remain coming-soon Shop previews.
- Preserve pink foil precedence, Kyoto Seika Practice Mode foil selection, NSFW concealment, original pixels/hashes, and chain data.
- Use American English and project vocabulary. User-facing additions, if required, use the existing English/Japanese catalog and glossary; developer diagnostics stay English.
- Do not restore the removed dome assets or previous dome renderer.
- All diagnostic probes and checks have deadlines. Surface failures visibly and persistently; do not silently discard errors.
- Use isolated implementation work at execution time; preserve unrelated changes in the current checkout. Do not merge or deploy as part of this planning task.

## Optical model

The physical target is a transparent dielectric film bonded over opaque printed sticker paper. Light can reflect at the outer surface or pass into the print and return. These contributions coexist; the print is not a material mask. PBRT's coated-diffuse layering is a closer reference than its air/film/air thin-dielectric model. Source: https://www.pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Scattering_from_Layered_Materials

OpenPBR supplies the reference separation between coat coverage, surface roughness, refractive index, and transmission color. Clear dielectric surface reflection follows the source/environment color rather than the ink color beneath it. Roughness spreads reflected directions; matte is not absence of reflection. A nonabsorbing coat over white under uniform white illumination need not reveal a pattern. Source: https://academysoftwarefoundation.github.io/OpenPBR/

Use a fixed structured neutral environment and a declared finite virtual viewing geometry. The reference scene has a large soft light shape and darker surroundings, the same camera, and the same exposure for every artwork and finish. The reflection is derived from surface/view orientation. Do not move a detached white band across the art or add a gray shoulder and call that physical validation.

Angle-dependent dielectric reflectance and a distribution of small surface normals establish the glossy response. The normal-incidence value follows the interface's refractive indices, not the print's brightness. A refractive index near 1.5 is a useful illustrative reference for common plastics, not a measured property of Croquis's fictional film. Record any chosen value and approximation explicitly. Filament documents this distinction and coating energy attenuation; its example equations are not a production shader to copy without validation. Source: https://google.github.io/filament/main/filament.html#materialsystem/clearcoatmodel

For a flat patch, reflection direction follows its normal and view. A raised flat patch does not acquire a different normal just because its height changed. Through an overlap ramp, use the changing slope: approximately `normal = normalize(-dh/dx, -dh/dy, 1)` in a consistently scaled local coordinate system. Perspective/parallax may also depend on height. The current shifted duplicate through a height mask has not demonstrated these properties.

The existing height image encodes `h / (h + 1)` in alpha and multiplies it by the cut coverage (`crease.ts:318`). It is not a linear height or a normal map. Derive slopes from the worker's floating-point draped field before mask/alpha encoding, with a declared sticker-thickness scale; do not turn the cut's antialiasing into a false curved rim. The existing `gx`/`gy` are normalized by `unitStep.slope` for visual crease tone; physical normals must instead use raw field differences divided by spatial distance and multiplied by the declared thickness scale.

Coat reflection and transmitted print must share an energy budget. A linear-light reference must decode the print's color space, combine lighting, then apply a declared display transform. CSS source-over can approximate a reviewed appearance but is not equivalent to that light transport. Pure white added over pure white stays white, explaining the current failure. Source: https://www.w3.org/TR/compositing-1/#simplealphacompositing

Existing print RGB is a display image, not measured diffuse albedo, and includes faint baked material. Calibrate to its uncoated displayed appearance; a physically derived coat over that image still has declared approximation limits. Exact reconstruction of the artist's original reflectance is not a claim of this design.

Coverage means the coat can respond anywhere inside the cut. It does not require every point to be visibly highlighted at every pose. Under the selected environment, blank white interiors must exhibit the same coherent reflected shapes as printed regions at the review poses, without obscuring line structure. Identical geometry and material settings must produce an identical coat contribution when the artwork changes; the combined displayed colors may differ.

Gloss and matte use the same environment, geometry, and print. Gloss shows more distinct reflected shapes. Matte broadens and softens those shapes, usually lowering their peak, while preserving a surface response. Do not approximate matte solely by hiding gloss, desaturating the art, or adding white haze. The clear coat is not an interference-colored foil; colored diffraction remains with the relevant foil/preview material.

## Renderer qualification before production implementation

The selected physical behavior is settled; the production renderer is not. Neither the old resin renderer nor the current CSS gradients have qualified. The first implementation task is an isolated diagnostic comparison, not a product rollout.

| Candidate                                                                           | What must be demonstrated                                                                             | Cost or limitation to measure                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Physically derived dielectric coating with surface normals and environment sampling | View-dependent reflected shape, roughness, energy balance, flat/ramp behavior, print independence     | Board frame cost, memory, GPU resources if used, resource-loss recovery, WebKit masking           |
| Inexpensive projected 2D environment approximation                                  | Same reviewed appearance and pose behavior at board/detail sizes, including white interiors and ramps | Deviations from the reference; CSS blend/color-space limits; failure at rotations or device scale |

Compare both with identical inputs. Keep the current renderer as the failing baseline. The reference need not perform a full path trace, but its assumptions and checks must be explicit. If neither candidate passes, continue material work; do not substitute a contrast threshold for a visual/optical pass.

The diagnostic deliverable records the environment, camera, normal/height scale, film parameters, color transform, pose sequence, renderer assumptions, still frames, and measured device costs. At least the default pose and slow tilt through opposite directions must show a recognizable coat over white. Review both board size and detail size.

The renderer decision must identify one production implementation, its exact files/interfaces, and approved reference frames. Update the plan's material task with those choices before executing it. Do not ship parallel permanent renderers or retain the old renderer as a compatibility path. A rendering-resource failure uses a deliberate static representation, with persistent diagnostics, rather than changing the original artwork.

## Motion states and timed fallback

Separate device classification, browser rotation support, permission, and actual readings. Browser interfaces do not establish physical sensor availability, and there is no general sensor-discovery API. Source: https://www.w3.org/TR/generic-sensor/#a-note-on-feature-detection-of-hardware-features

| State                                                                                   | Material behavior                                                                                              |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| iPad/phone with usable rotation                                                         | Persistent reflection controlled by actual tilt; finite smoothing, then held position                          |
| iPad/phone denied, blocked, or without usable readings                                  | Held reflection, or common static top-left pose before the first reading; timed wave forbidden                 |
| Desktop known to lack browser rotation support, with no mobile/touch ambiguity          | One centrally gated timed gloss fallback using the same coat/environment; no independent Shop loop             |
| Desktop API present but silent, all-null readings, ambiguous device, or unknown support | Static; do not promote based on elapsed time or absence of events                                              |
| Any device after a usable rotation reading                                              | Permanently excluded from timed fallback; active rotation still respects denial, reduced motion and inactivity |
| Reduced motion                                                                          | Freeze the last published pose, or common static pose before any input; stop fallback and interpolation        |
| Hidden document or no owners                                                            | Cancel pending writes and pause fallback phase; preserve held state                                            |

Use conservative platform evidence, including iPadOS's Macintosh identity with touch support. Width, a mouse, hover support, screen rotation APIs, and a one-second motion timeout do not classify hardware. The existing remembered-permission timeout only checks whether permission must be asked again. Browser capability is an imperfect proxy for hardware: ambiguous desktops can remain static rather than wrongly enabling a wave. For browser-derived fallback eligibility, require a recognized zero-touch desktop, `isSecureContext === true`, explicit sensor-policy allowance for accelerometer and gyroscope, and an explicitly absent orientation interface. A blocked/unknown policy, insecure context, or uncertain interface remains unknown/static. No new permission prompt or settings control is presumed by this spec.

Actual finite orientation readings establish capability even while reduced motion is active. Once observed, timed fallback remains forbidden for this document. Explicit denial freezes material, as do reduced motion and inactivity. The stored `unasked` status is advisory when usable orientation is arriving or was already observed: its one-second `devicemotion` check must not freeze working `deviceorientation`. Without any usable reading, `unasked` stays static. Tests must pin these combinations rather than assuming a permission label proves delivery.

The fallback demonstrates the same persistent coating with one smooth virtual pose sequence; it does not add a second high-opacity sweep. This is the proposed interpretation of the user's permitted timed gloss wave. Qualify and record its period, path, and strength in the diagnostic comparison before production. Its light state is shared by the visible sticker face, foil, and overlap response. New mounts join the current phase. A user action, replay finish, or sensor threshold never starts another sweep.

The current 45 ms write spacing, 0.02 normalized deadband, 160 ms low-pass smoothing, and 250 ms crease settlement are the baseline to preserve unless evidence requires a change. These finite input responses are distinct from unattended animation. On rotation devices, returning from a hidden state or disabling reduced motion keeps the held pose until the next usable reading. An eligible fallback resumes its paused phase without a restart flash.

## Coordinates and surface integration

Project device orientation into the displayed screen axes; W3C device axes retain their standard orientation when the screen turns. Verify iPad portrait and both landscape directions. Then transform lighting into each sticker's local coordinates, accounting for its turn and non-square dimensions. The print and cut stay aligned; the reflected environment and crease response agree in screen space. Source: https://www.w3.org/TR/orientation-event/#device-orientation

The same pose must reach newly mounted figures, sharp-image swaps, reorder transitions, lifted detail, receiving reveal, and the sealed card. The seal ceremony changes its container rotation during flight and uses `LiveResin` directly; verify the final and moving rotation contexts rather than forwarding one final angle and assuming the flight works.

| Presentation                                                         | Required treatment                                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own/other Sticker Boards, detail, lifted Explore, revealed receiving | Correct the shared live figure and verify material/light continuity                                                                                                       |
| Seal ceremony and sealed card                                        | Replace direct material use consistently, preserving laminate application and sticker flight                                                                              |
| Shop                                                                 | Shared capability policy and environment; qualify gloss/matte and preview films on identical art                                                                          |
| Sticker tray                                                         | Currently has image and foil but no live coat. Explicitly decide exposed-tray coverage in the diagnostic scope; include it before claiming an affected tray sticker fixed |
| Explore pile, picker, notices, small thumbnails                      | Currently image-only. Record whether a still representation is sufficient; do not claim shared live changes cover them                                                    |
| Concealed gift                                                       | Keep the frosted sleeve and NSFW concealment intact; reveal the material only where artwork is authorized to appear                                                       |

The reported screen remains unidentified. Diagnostic work and shared-material research can proceed independently; final symptom attribution and scope verification require the actual affected presentation. Do not turn this into a silent omission.

## Existing baked appearance

Normal and sharp sealed images contain faint fixed gloss; older domed images have static display corrections. Those cannot create a periodic flash, but can compete with a moving coat. Review old and recent stickers before release. A live matte coat cannot erase gloss already baked into its print.

Preserve immutable originals and their tests. If fixed material remains visibly inconsistent, qualify an unlit display derivative separately: exact source reconstruction, new immutable cache names, sharp/veiled versions, access checks, cleanup, bounded generation, and original-hash preservation. Gray pixels must never be guessed to be removable material. Reconstruction from old flattened/quantized files is unproven; no asset migration is authorized by this planning task.

## Acceptance evidence

| Case                                                                            | Evidence required before calling the fix complete                                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| White interior, thin line art, gray ash-like fill, saturated and dense art      | Identical coat contribution for identical cut/geometry; coherent surface over blank paper; readable artwork, distinct from metallic foil |
| Uncoated/gloss/matte on identical art                                           | Finish distinction explained by roughness and reflection, with still frames and a controlled pose sequence                               |
| Stationary iPad/phone before and after tilt                                     | No time-driven material changes at 0, 5, 11, and 22 seconds after settling; stop and reversal control the persistent reflection          |
| No-rotation desktop, unknown desktop, denied/blocked/silent mobile              | Timed wave only in the qualifying desktop state; mobile and unknown stay static; transition to valid rotation cancels fallback           |
| Flat, constant raised plane, and curved overlap ramp                            | Identical normals on flat plateaus; ramp follows slope; any raised-plane parallax derives from declared camera/source geometry           |
| Square/non-square cuts at 0°, 90°, and arbitrary turns; iPad portrait/landscape | One environment and consistent screen-relative reflection/crease direction                                                               |
| Plain/holo/Kyoto Seika Practice Mode/pink foil                                  | Correct foil selection/precedence; coat remains over the face rather than borrowing foil behavior                                        |
| Reorder, mount, sharp swap, replay finish, pickup/drop, seal, receive           | Held material state without extra sweeps; meaningful movement, completion, and error states preserved                                    |
| Reduced motion and background/resume                                            | No inactive writes; pose/phase preserved; deliberate static appearance                                                                   |
| Populated board on iPadOS Safari and physical iPad                              | Measured frame/memory cost, no missing rows, resource-loss recovery where applicable                                                     |
| Exact ashtray sticker on the user's iPad                                        | No periodic missing horizontal strip or gray flash; isolate remaining print clipping separately from the coating                         |
| Existing original and display images                                            | Original pixels/hashes unchanged; no competing fixed highlight that undermines the reviewed material                                     |

Automated checks pin the reviewed images and behavior, including full material rather than hiding it as the current foil test does. The previous four-level/10%-area contrast suggestion is not a physical acceptance criterion: gray paint can satisfy it. Choose visual regression tolerances from the qualified reference and browser variance. Test mask support independently from final composite color; zero-alpha cut pixels must have no coat contribution.

Desktop Chromium/WebKit already reproduce weak white contrast and unattended sway. They do not reproduce the reported disappearing horizontal strip. The repository's iPad Safari harness is a simulator, so it complements rather than replaces the physical iPad review. That review remains a release check, not completed evidence.

## Review and next step

Research and design/planning are the authorized deliverable. The next proposed work is the bounded optical comparison and device qualification in `docs/superpowers/plans/2026-10-12-sticker-laminate.md`. Production renderer choice, exact fallback tuning, affected-screen attribution, actual device response, and fixed-image compatibility are explicit gates; none is claimed resolved by these documents.
