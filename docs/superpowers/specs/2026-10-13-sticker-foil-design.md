# Sticker foil design

Status: design review delegated to the implementer; implementation authorized. Research: [sticker foil](../../research/sticker-foil/README.md).

## Outcome

Make foil feel like a physical sticker material when the phone moves, at the quality established by Croquis's laminate and overlap creases. Reflections change across the surface, follow actual bends, and remain coherent during placement, lifting, and sealing. Printed marks stay attached to the sticker. Returning to the same orientation restores the same appearance.

Preserve artwork, the existing paper/laminate appearance, foil silhouettes, and meanings:

- Kyoto Seika Practice Mode foil remains black manga screentone on a narrow band, including on the Original Artist's board.
- Holo continues to mark someone else's sticker where it does today.
- Pink foil remains distinct and takes precedence on NSFW stickers.
- Croquis's existing foil palettes remain authoritative, including the exclusion of green hues.

## Selected approach

Extend the existing shared rendering architecture into one complete paper-and-foil output per mounted sticker presentation. A board, detail, and sheet may retain separate presentations of the same sticker; foil does not get an additional live canvas beside each paper canvas. Keep one GPU context, packed batches, shared texture ownership, and the existing orientation publication.

This supplies shared geometry and illumination while allowing different material responses. A CSS-only reflection overlay cannot supply the required conductor response, local bends, and diffraction. Matching a measured physical foil remains a possible later refinement; this implementation uses declared optical approximations.

## Appearance

### Kyoto Seika Practice Mode foil

Use neutral reflective metal beneath fixed dark ink and clear gloss. Keep the existing round-dot 45° lattice and Ink color. Start with the existing dense screentone preset uniformly across the foil; remove its light-dependent coverage blend. Silver gaps change from dark gray to bright reflection. Gloss can cross dark print, reducing its visible contrast without changing dot centers or radii.

Set print pitch in normalized source coordinates. The exact reference is `/e2e/stickerLaminate.html?board=1&foil=1&side=240`: the fixture displays its square source at its natural size. Derive the initial pitch from the existing CSS tile and dense SVG preset, then hold that normalized mapping through resizing, turns, and lifts. A sharp-image upgrade changes texture resolution, never dot count. Filter ink coverage when dots become subpixel. Tune fixed coverage and pitch only through recorded comparison frames; they never depend on pose or time.

Use the supplied crease normal. Raised flat plateaus remain flat; only actual ramps bend reflections. Do not derive curvature from cut alpha or add raised dots, artificial domes, or animated grain.

### Holo

Combine neutral ordinary reflection with angle-dependent diffraction. The microscopic groove direction and spacing remain fixed in sticker coordinates. Different regions become colorful as their geometry directs illuminated wavelengths toward the viewer; other regions return to quieter silver/dark states. The clear top gloss stays neutral.

Use a uniform grating orientation/period for the initial material. Local variation comes from finite view direction and existing crease normals. Do not invent a random embossed pattern or draw the microscopic grooves as visible lines. The model supports an authored static grating map later only if a chosen reference justifies it.

### Pink foil and existing Shop previews

Pink uses the same reflection/diffraction foundation with an authored absorbing pink treatment and its existing restricted palette. It remains visibly pink in quieter poses, with neutral gloss above it.

Preserve the existing coming-soon gold, silver, and rose gold Shop previews through the same renderer. Their explicit preview selections provide colored or neutral conductor responses without rainbow diffraction. Existing availability and purchase behavior do not change. Decorative ArtistChip rings and coming-soon glitter/prism laminate overlays retain their current separate behavior.

## Optical calculation

Keep the existing room/source geometry and finite camera. All materials use the same device pose, sticker turn, lift tilt, and crease normal. Material coordinates never translate with the light.

The silver base uses conductor Fresnel with an aluminum-like RGB reference and a filtered reflected environment. It has no added Lambertian body-color term. Black ink attenuates the underlying metal and has a dielectric response; subpixel coverage mixes complete ink and metal responses. Clear gloss sits above both with coat transmission attenuating the underlying response. Detailed ink relief, coating refraction, internal reflections, and polarization are simplified explicitly.

Holo allocates part of the conductor's reflection budget to zero and positive/negative first and second diffraction orders. Weights are nonnegative and share the available reflected energy. Broadening a lobe must preserve integrated energy. The color term does not emit light independently of illumination.

For unit light/view vectors pointing away from the surface, use the unnormalized `L + V` projected onto an orthonormal local groove frame. Across grooves, an order occurs near `m * wavelength / period`; along grooves, the projection must remain within its finite lobe. Reject illumination or viewing directions behind the surface. Reproject the groove tangent consistently onto the crease-normal tangent plane. The selected ordinary-reflection approximation is filtered-mirror conductor reflection, not a claimed GGX environment integral.

Precompute spectral color integration under an explicit D65 white-source assumption. Shade with a fixed, bounded quadrature of the existing rectangular source and a preintegrated ambient contribution. Quadrature weights account for source solid angle. Select the smallest sample count that passes the calibration gate below. Do not perform a per-sticker environment convolution during motion.

Filter diffraction using source angular size, unresolved roughness, pixel footprint, and normal variation. Filter the angular response as well as the printed texture. Source sampling must not produce several artificial separate strips, missed glints, or moving color flicker.

### Color and brightness

Keep paper and laminate optical calculations and display conversion unchanged. Fully covered paper pixels must match the existing reference output exactly. Foil alone receives smooth highlight compression before display encoding; this material-specific approximation preserves the currently successful paper appearance while retaining variation in bright metal.

Perform foil layering and illumination in linear light. Keep computed luminance separate from authored chromaticity: palette substitution preserves that luminance before the foil shoulder. Apply the allowed holo or pink display-color treatment explicitly, without changing the computed reflection directions. Validate the complete interpolated hue path, including bright and dim outputs. Do not remove the RGB green channel or independently clip channels to force a palette. Existing palette declarations provide the authoritative colors; do not duplicate their literals in a second source.

The metal reference and clear-coat index are published starting assumptions, not measurements of Croquis's foil. Grating period, efficiency, roughness, dye absorption, source quadrature, and foil compression parameters require calibration. Any numerical initial value lacking a source or derivation must be labeled **unverified guess** in the calibration record. Save the selected values and comparison evidence before integration; do not describe them as measured physical properties.

## Renderer and component boundaries

Generalize `laminateRenderer.ts` and its shader as the single authority for a sticker's rendered finish. Public operations must describe the whole sticker output once they own foil too; rename the existing operations together rather than leaving compatibility aliases or a second renderer.

Keep responsibilities explicit:

| Input     | Responsibility                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Material  | Print, cut, laminate finish, optional foil tone/preview style, authoritative outer coverage, palette, and presentation amounts. |
| Geometry  | Source-frame dimensions, output bounds/offset, registered normal, turn, and lift tilt.                                          |
| Lifecycle | Exposure eligibility, committed material generation, placement-reveal callbacks, settlement, and release.                       |

`StickerFigure` resolves semantic foil precedence once and supplies the same description to the rendered finish and its cast. React and imperative sheet/flyer presentations use the same registration and shape calculation. `StickerFoil` retains only necessary static silhouette/cast/fallback responsibilities; its translated strips, moving color bands, and visible grating are removed.

One geometry update changes the whole finish during dragging or flight. Sealing forwards the existing foil amount `f` and coated-paper amount `s` independently. The output uses `Ap * s * paperColor + (1 - Ap) * Af * f * foilColor`, with alpha `Ap * s + (1 - Ap) * Af * f`. Full paper coverage `Ap` occludes foil even while the coated contribution fades. Preserve the existing timed plain/gloss passes underneath during formation; do not hide them just because a partial combined output is ready. Ordinary sealed presentations use full amounts and the coverage equation below. Applying laminate opacity to the entire combined canvas would incorrectly fade foil and must not replace the existing timeline.

## Coordinates, coverage, and bounds

The source image frame remains the common coordinate system for print, cut, dots, grating, normals, and finite-camera position. Existing sealed-image margins normally contain the foil band. Determine overflow from actual source coverage and the existing band-growth rule; expand output only when necessary, with an explicit mapping back to the source frame. Never stretch a normal map across an enlarged wrapper.

Generate or cache outer coverage when assets or geometry change, not on each light publication. Preserve baked holo/pink masks and Kyoto Seika's current narrower growth rule. Cast shadows use that same outer silhouette, independently of reflected colors.

Full-frame Seal previews use explicit rectangular coverage and flat geometry. If a creased board sticker truly overflows its source frame, generate correspondingly registered padded crease geometry. Do not rebake all normal maps merely because foil exists.

Compose paper over underlying foil at fractional cut edges. With straight display-RGB material colors, paper alpha `Ap`, and outer foil alpha `Af`, the final premultiplied output is:

```text
C = Ap * paperColor + (1 - Ap) * Af * foilColor
A = Ap + (1 - Ap) * Af
```

Optical layers are calculated in linear light; this final coverage operation preserves current display-space edge composition. Zero final alpha produces zero RGB. Do not subtract cut alpha from outer foil alpha.

## Crease reveal and resource lifecycle

Preserve the current placement-authorized crease reveal. Its temporary flat and bent snapshots both contain the complete paper-and-foil finish. They share one accepted normal, placement grant, reveal origin, and progress. Preserve complementary coverage/additive composition so the reveal does not double opacity at fractional edges. Expanded bounds must remain aligned with the painted crease.

Consume the reveal grant only after the first complete retained copy. Asset readiness is insufficient: settlement reports the material generation actually committed to the output, including required foil coverage. Retire the temporary flat snapshot on completion, covering, failure, or disposal.

Retain the existing decode/readiness deadlines, cancellation checks, context-loss handling, reference counts, and exposure rules. Covered, detached, offscreen, and hidden presentations do no material work. Re-exposure samples the held pose. A failed replacement retains the last complete finish and surfaces which asset/presentation failed.

Before the first successful render, the original print plus a coherent static foil fallback may appear. Hide that fallback when a complete output commits. Initial GPU failure retains this static presentation with existing persistent diagnostics; never retain the old animated foil as a competing fallback. Context restoration rebuilds resources and rejects stale completions.

NSFW concealment discards previous unblurred outputs, including temporary flyer owners. Its fallback uses only the permitted veiled image. No previously retained unblurred bitmap may reappear during a replacement or failed load.

## Presentation integration

| Presentation   | Required change                                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sticker Board  | `useBoardGestures.ts` updates the entire finish imperatively. `boardComplete.ts` waits for complete material settlement.                                                                                                                                                          |
| Sticker sheets | `traySheets.ts` uses the common material/coverage description. Preserve outgoing-gift fade/frost and its current omission of live coating; used slots acquire no sticker material. Update the affected selectors together.                                                        |
| Sheet peel     | `trayPeel.ts` gives the existing flyer a combined live finish and forwards its calculated lift/curl geometry.                                                                                                                                                                     |
| Detail lift    | `detailLift.ts` creates a temporary live owner seeded from the ready output. Pause the obscured presentation. Keep the owner through reversed playback; release after completion or actual replacement/cancellation. Refresh the destination at the held pose before re-exposure. |
| Sealing        | `SealCeremony.tsx` forwards current turn/tilt and the independent amounts from `sealTimeline.ts`. `SealSheet.tsx` supplies explicit rectangular bounds.                                                                                                                           |
| Other figures  | Details, Artist Boards, Explore lifts, receiving, and Shop previews inherit the common finish through `StickerFigure`. Verify clipping, casts, and exposure selectors in their containers.                                                                                        |

Closed GiftBag imagery and sticker image/NFT data remain as currently defined. No additional sensor listener, independent material-light clock, setting, or purchase option is introduced. Bounded sampling of an existing flight animation's geometry is allowed. New user-facing error text, if needed, follows the existing English/Japanese catalog.

## Verification and acceptance

Build on the existing laminate fixtures and independent reference rather than duplicating their lifecycle tests. Extend assertions where foil introduces a new observable requirement.

Before fitting, freeze a calibration matrix spanning both tilt axes, turn, flat/ramp/raised-flat normals, dark/ambient/source illumination, and enlarged/minified presentations. The optical reference uses separate double-precision code, direct spectral summation, and dense source integration; it does not call production lookup generators. Establish its convergence by increasing spectral/angular resolution before assessing production results.

The initial quadrature ceiling is a 4×4 source grid. Proposed pass budgets are maximum reflection-centroid error of one rendered pixel in the canonical fixture and relative integrated-luminance error of 5% for illuminated cases; dark cases must remain dark. These are **unverified guesses** chosen as initial engineering acceptance limits, not measured perceptual or phone-performance facts. Freeze them before parameter fitting and record band/chromaticity comparisons as well. If no candidate within the ceiling passes the reference and appearance checks, stop integration and revise the model or budget explicitly; do not continue an open-ended tuning loop or silently relax the limits.

| Evidence                            | Acceptance                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paired poses and return pose        | Repeatable output; both tilt axes, heading, turn, and lift agree across foil and laminate. Print registration and coverage remain fixed.                                               |
| Controlled room fixtures            | Dark room has no luminous rainbow; removing a source removes its features; broad sources broaden the response; groove rotation rotates dispersion.                                     |
| Independent dense optical reference | Sparse sampling preserves the same reflection locations and integrated response; no false strips or missed orders. Record the chosen error budget as an authored acceptance threshold. |
| Flat/ramp/raised-flat geometry      | Actual bends redirect reflections; flat plateaus and cut edges do not invent curvature.                                                                                                |
| Paper/ink fixtures                  | Existing opaque paper output is exact; fractional-edge composites retain the existing alpha tolerance; black ink and artwork remain legible.                                           |
| Size/turn/device-pixel-ratio sweep  | Fixed print scale in source coordinates; no dot moiré, color flicker, white seams, clipping, or mask halos.                                                                            |
| Semantic presentations              | Kyoto Seika remains manga screentone, holo uses the allowed palette, pink remains distinct and wins precedence, Shop preview choices remain recognizable.                              |
| Lifecycle/flight fixtures           | Complete readiness, synchronized reveal, concealment, failed replacements, cancellation, context restoration, re-exposure, and flyer disposal preserve the accepted output.            |

Use the existing hardware display budgets in `apps/frontend/e2e/stickerPerformance.ts`, including its refusal to qualify software GPUs or failing idle baselines. Measure sustained mixed-foil boards, dragging, sheets, details, and flights; identify whether cost comes from shading, uploads, batch snapshots, or retained copies. Keep sampling bounded and avoid material updates when pose/content is unchanged.

Run functional browser verification in Chromium and WebKit, then repeat motion and sustained performance on physical iPhone/iPad in the supported browser and LINE. Simulator or desktop success does not establish physical-device performance. If physical testing is unavailable, report that qualification as incomplete rather than claiming the finish is fully verified.

## Delivery order

1. Establish independent references and paired baseline frames; implement the silver/ink/coat model in the shared diagnostic fixture.
2. Calibrate fixed screentone, bounded diffraction, pink/preview color treatment, and foil highlight compression. Record assumptions and selected parameters.
3. Integrate one complete output and material settlement across React, sheets, sealing, and live flyers; remove obsolete live CSS effects.
4. Complete functional, appearance, lifecycle, and physical-device performance verification. Fix defects before reporting completion.

The detailed task breakdown, exact file operations, commands, and execution method belong in the implementation plan after written-spec approval. Delete the completed spec/plan after integration according to the repository's cleanup rules; retain only useful current renderer documentation and material assumptions.
