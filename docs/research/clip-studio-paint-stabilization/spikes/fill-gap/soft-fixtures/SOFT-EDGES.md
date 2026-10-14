# Measured native partial-alpha gap behavior

This lane uses the new exact partial-alpha sources in `manifest.json`, keeping
the original 11 binary-alpha fixtures and reports unchanged. Comparisons use
the existing Croquis `fill.ts` SHA256
`d947273c2157bcdfd7539da1b3c3c87a9f32a80fc3cc36622f5477f3a780fe49`.
Native final A is compared with Croquis IN at the actual captured source seed.
Croquis TUCKED and its complete final RGBA are retained separately. Native final
layer RGBA has not been captured by this observer.

The capture operator reported freshly opening each exact PNG and manually
confirming Refer only to editing layer, multiple reference off, color margin
10, anti-aliasing on, area scaling off, Fill narrow areas on, and raw gap 10.
The document was 640 × 480 pixels, 72 dpi, viewed at 100%. Palettes were hidden
for an AX window click after the input path was independently verified. Each
capture's observed context distinguishes these observations from intended
launcher metadata. Actual seed coordinates are retained and used explicitly.

| Source, raw gap 10               | Native A | Croquis IN | Native-only | Croquis-only | Croquis TUCKED |
| -------------------------------- | -------- | ---------- | ----------- | ------------ | -------------- |
| Uniform alpha64                  | 80,355   | 307,200    | 0           | 226,845      | 0              |
| Uniform alpha128                 | 80,355   | 80,345     | 10          | 0            | 2,280          |
| Uniform alpha192                 | 80,355   | 80,345     | 10          | 0            | 2,280          |
| Opaque alpha255                  | 80,355   | 80,345     | 10          | 0            | 0              |
| Opaque core with outer AA fringe | 80,365   | 80,345     | 20          | 0            | 0              |

All native fills omit the exterior. The four uniform-alpha native A/C masks
are exactly identical across complete 640 × 480 decoded mask bytes. The AA
source changes those masks and includes positive native C bits on all four
known alpha16 corner pixels. Native final RGBA and native gap 20 are unmeasured.

## Uniform black alpha64 outline, raw gap 10

Source: `soft-axis-gap10-alpha064.png`. The exact three-pixel outline has
3,426 alpha64 black pixels; the remaining 303,774 pixels are transparent black.
The bottom has ten clear columns at x = 315…324.

Native capture:
[fill.jsonl](../evidence/captures/soft-alpha064-g10-20261013T162719.835423Z-91f4c404/fill.jsonl)

Comparison:
[soft-comparison.json](../evidence/captures/soft-alpha064-g10-20261013T162719.835423Z-91f4c404/soft-comparison.json)

Observed context:
[soft-fixture-context.json](../evidence/captures/soft-alpha064-g10-20261013T162719.835423Z-91f4c404/soft-fixture-context.json)

The native return confirms raw gap **10**, narrow-area argument **1024**,
bitmap dimensions **640 × 480**, offset **[0, 0]**, and actual seed
**[319, 208]**. That seed is transparent and inside the intended main room.
It differs from the fixture default [320, 230]; Croquis was recomputed with
the explicit `--use-captured-seed` option. The native call succeeded with
complete snapshot bytes. The capture operator separately reported clean
detach, independent process resume, and no capture errors.

| Measurement                    | Native A             | Croquis IN       |
| ------------------------------ | -------------------- | ---------------- |
| Selected pixels                | 80,355               | 307,200          |
| Exclusive bounds               | [163, 103, 478, 361] | [0, 0, 640, 480] |
| Interior [320, 230]            | Selected             | Selected         |
| Exterior [320, 420]            | Omitted              | Selected         |
| Opening [320, 359]             | Selected             | Selected         |
| Alpha64 source pixels selected | 0                    | 3,426            |
| Canvas sides reached           | None                 | All four         |

Native-only selection is **zero**. Croquis-only selection is **226,845**
pixels: **223,419 transparent pixels** plus all **3,426 alpha64 outline
pixels**. Croquis treats every alpha64 pixel as paper because its transparent
seed uses alpha < 128 and RGB does not affect eligibility. Consequently this
source provides no Croquis line barrier and the whole source becomes opaque
red. Native instead keeps A inside the outline at these fixed settings. This
establishes a partial-alpha classification and containment difference.

Final native C has **245,694 positive transparent-source bits**, **zero
positive alpha64-source bits**, **58,080 zero transparent-source bits**, and
**3,426 zero alpha64-source bits**. Native C is prepared lazily. These zero
counts are preserved as zero observations; they do not independently prove
that every alpha64 pixel was tested and rejected. The complete native candidate
predicate, alpha cutoff, and color-margin dependence remain unmeasured.

Native A retains **ten selected opening pixels** at
**[315, 360, 325, 361]** beyond the returned rectangle's exclusive bottom
edge. The comparison preserves those bits and counts them separately. They
must not be silently cropped or equated with final visible native pixels.

![Green shared native interior; blue Croquis-only exterior and soft outline](../evidence/captures/soft-alpha064-g10-20261013T162719.835423Z-91f4c404/soft-comparison-1.png)

## Uniform black alpha128 outline, raw gap 10

Capture, comparison, and observed context:
[soft-alpha128-g10-20261013T162914.759873Z-e4db0cf6](../evidence/captures/soft-alpha128-g10-20261013T162914.759873Z-e4db0cf6/soft-comparison.json)

The exact source has the same 3,426 outline pixels at alpha128. Native gap,
narrow-area argument, dimensions, offset, and actual seed again match the first
capture: **10**, **1024**, **640 × 480**, **[0, 0]**, **[319, 208]**. The call
and complete snapshots succeeded, and the operator reported no capture errors,
clean detach, and independently verified process resume under the same controls.

Native A and C are **exactly identical** to the alpha64 capture's complete
document-projected masks. Native A selects **80,355 pixels**, omits the exterior,
and selects **zero alpha128-source pixels**. Croquis IN selects **80,345** and
also omits the exterior. Native-only selection is exactly **ten clear opening
pixels**, [315, 360, 325, 361]; Croquis-only is zero. Those ten native pixels
again lie beyond the returned rectangle's exclusive bottom edge and remain in
the comparison.

Croquis separately tucks **2,280 alpha128 outline pixels**, making them opaque
red-over-black blends through `writeFill`; the top-core probe becomes
[127, 0, 0, 255]. Native A does not describe this later compositing operation,
so neither the small IN difference nor the shared containment establishes
equal final RGBA. Native C has 245,694 positive clear-source bits and zero
positive alpha128-source bits, with the same lazy-zero limitation as alpha64.

The alpha64-to-alpha128 transition changes Croquis from a whole-canvas fill to
a contained fill, while native A/C stay identical under these tested controls.
This is a directly measured source-alpha boundary difference; the complete
native alpha/color predicate still requires additional controls to determine.

## Uniform black alpha192 outline, raw gap 10

Comparison and retained context:
[soft-alpha192-g10-20261013T163058.854046Z-d84f8e05](../evidence/captures/soft-alpha192-g10-20261013T163058.854046Z-d84f8e05/soft-comparison.json)

The call succeeded with complete snapshots and the same recorded gap, narrow
argument, dimensions, offset, and actual seed [319, 208]. The operator reported
the same source/settings controls, no errors, clean detach, and independently
verified process resume. Native A and C are **exactly identical** to both
earlier uniform-alpha captures. Native A selects **80,355 clear pixels** and
no alpha192 pixels. Croquis IN selects **80,345**, with the same **ten native-only
clear opening pixels** and zero Croquis-only pixels. Both omit the exterior.

Croquis's **2,280 tucked alpha192 pixels** are kept separate; its top-core
probe becomes **[63, 0, 0, 255]** after `writeFill`. Native C contains no positive
alpha192-source bits; its clear-positive and lazy-zero counts are unchanged.
The native A observation still does not measure native final-layer compositing.

## Opaque black alpha255 control, raw gap 10

Comparison and retained context:
[soft-alpha255-g10-20261013T163221.566197Z-752abf9c](../evidence/captures/soft-alpha255-g10-20261013T163221.566197Z-752abf9c/soft-comparison.json)

The opaque source gives the same successful native capture controls, complete
snapshot bytes, and actual seed **[319, 208]**. Native A and C are **exactly
identical** to the uniform alpha64, alpha128, and alpha192 captures. Native A
again selects **80,355 clear pixels**, while Croquis IN selects **80,345**.
The difference remains exactly **ten native-only clear opening pixels** beyond
the returned exclusive bottom edge, with zero Croquis-only pixels and neither
selection reaching the exterior. No opaque source pixel is selected by either
IN mask, and Croquis TUCKED is **zero** on this source.

This ties the partial-alpha comparison to an opaque geometry control: native
classification stays unchanged across all four tested uniform alphas, whereas
Croquis changes at its alpha128 paper boundary and separately tucks partial
alpha128/192 ink. Native final-layer RGBA remains a separate measurement.

## True area-coverage outer fringe, raw gap 10

Comparison and retained context:
[soft-aa-outer-g10-20261013T163328.027396Z-9cc73c8e](../evidence/captures/soft-aa-outer-g10-20261013T163328.027396Z-9cc73c8e/soft-comparison.json)

This source adds an analytic outer fringe around the opaque three-pixel core:
four corner pixels at alpha16 and 1,154 side pixels at alpha64. Its exact
continuous outline extent is retained in the manifest. The source footprint
reaches one pixel farther outward than the uniform outlines, and the clear
opening is retained through that added bottom row. It therefore tests genuine
partial-alpha source pixels while also changing the source's outer footprint.

The native capture again succeeds completely at raw gap **10**, narrow
argument **1024**, dimensions **640 × 480**, offset **[0, 0]**, and actual
transparent seed **[319, 208]**, with the same reported source/settings,
clean-detach, and independent-resume controls.

Native A selects **80,365 clear pixels**, bounds **[163, 103, 478, 362]**,
and omits the exterior. Croquis IN selects **80,345**, with zero TUCKED pixels.
Native-only selection is **20 clear opening pixels** at
**[315, 360, 325, 362]**, and Croquis-only selection is zero. The returned
exclusive rectangle is [163, 103, 478, 361], leaving **ten selected A bits**
in the added opening row [315, 361, 325, 362] beyond its bottom edge. The
comparison retains them rather than cropping them.

Native C contains **all four known alpha16 corner pixels positively**. This is
direct evidence that those specific partial-alpha source pixels are eligible
under the tested native controls. C has **zero positive alpha64 side-fringe
pixels**, **zero positive opaque-core pixels**, and **244,536 positive clear
pixels**. Its 58,080 clear zeros, 1,154 alpha64 zeros, and 3,426 opaque zeros
retain the lazy-preparation caveat. Neither native A nor Croquis IN selects any
source-fringe pixel. The outer-corner probe [159, 99] is native C positive;
the outer-side probe [320, 99] is native C zero; both are exterior A/IN omissions.

Compared with the opaque uniform control, native A adds exactly **ten** clear
pixels in the new opening row. Native C loses exactly **1,154** previously
positive coordinates, the coordinates that became alpha64 side fringe, and
adds no new positive coordinates. Full decoded-byte comparison is retained in
`native-g10-summary.json`. The changed footprint and positive alpha16 evidence
must remain distinct from a complete native alpha/color-margin predicate.

## Measurement limits and verification

These observations cover five sources, one raw gap, one native control
combination, and one transparent interior seed. They do not establish general native
equivalence or final RGBA parity. Exact native final-layer RGBA and native gap
20 results are still needed for those separate comparisons. Native gap 20
was not captured in this lane because the verified input method could fill
the current gap 10 setting but could not safely select a different native gap.
Metadata and measured Croquis gap 20 outputs are prepared, but they are not
native gap 20 evidence.

Five exact source PNG/RGBA pairs and ten complete Croquis final outputs pass
`verify_sources.py`. The original 11 fixtures pass their original verifier.
All seven original decoder/comparison checks and four additional soft-source
checks pass. The independent read-only helper review found no correctness
issue; its documentation precision correction now explicitly distinguishes
document-projected A/C masks from complete native bytes retained in JSONL.

`consolidate_native_g10.mjs` independently verifies all five successful capture
outcomes and fifteen complete entry/initial/return snapshots, source hashes,
exact decoded native mask equality, and the AA-only differences. Four bounded
static ranges were freshly re-extracted and matched retained instruction bytes
and hashes. The follow-up
[candidate trace](static-candidate/CANDIDATE-PREDICATE.md) identifies exact
candidate workers and the captured tolerance value 26 at color margin 10. Its
alpha ≤ 26 rule is conditional on a source-format worker branch that these
captures did not observe, so the active complete native predicate is still
unconfirmed.
