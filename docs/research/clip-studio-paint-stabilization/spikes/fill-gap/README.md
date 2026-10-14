# CSP fill gap: native width conversion

Read-only static research on 2026-10-13. This note establishes the numeric
configuration path into gap-aware flood fill. The factory preset table is
established separately in [PRESETS.md](PRESETS.md). The first four native
selection comparisons are retained in [COMPARISONS.md](COMPARISONS.md), larger
width and edge comparisons in [LARGER-GAPS.md](LARGER-GAPS.md), and partial-alpha
and antialiased-source comparisons in
[SOFT-EDGES.md](soft-fixtures/SOFT-EDGES.md).
The complete gap-closing algorithm has not been reproduced in Croquis.

The pinned CSP 5.1.4 ARM64 image is
`/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64`.
Its SHA256 was checked again:
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
Addresses below are unslid virtual addresses in that image. The retained
[extraction manifest](evidence/extraction.json) records each bounded extraction
command, function boundary, artifact hash, and relevant constants. Existing
`objdump` and the saved Mach-O function-boundary helper were used; no tools were
installed and no application or production code was changed.

## Established native path

1. The ordinary fill caller at `0x102a8d124` gets a document scalar through
   `0x102915430`, then calls the shared configuration routine `0x102a9f5cc`
   at `0x102a8d27c`. Its gap-width output is the fifth integer argument (`x5`,
   stack location `x29-0xcc` in this caller).
2. `0x102a9f5cc` initially sets that output to zero. It reads Boolean parameter
   ID **5100** at `0x102a9f660`. When enabled, it reads parameter ID **5101**
   through `0x102856cd4` at `0x102a9f678`. That accessor returns a 16-byte
   `Planeswalker::SLength`; the type check points to its retained RTTI name at
   `0x10432c0f8`.
3. The returned length is normalized by `0x10339dc98` through `0x102218260`.
   This selects the unit at offset `+8` of the shared object returned by
   `0x10339d934`; conversion uses the exact constant **254.0** at
   `0x1042ee820`. The human meaning of that shared unit setting was not traced
   here, so do not omit this normalization when claiming native equivalence.
4. The normalized length is converted to **target unit 0** by `0x1022180a0`
   at `0x102a9f698`, with the document scalar supplied as `d0`. The unit-0 to
   unit-0 branch is an identity (`0x1022180d4`, then `0x102218160`). Other
   unit conversions use the length-unit tables at `0x10451d9f8` and
   `0x10451da40`. The document scalar comes from the image's binary64 field
   `+0x100` through `0x1024e8320`; its fallback is **300.0** at `0x1042f9340`.
   The tables and fallback strongly support interpreting this scalar as image
   resolution and target unit 0 as image pixels; this interpretation is separate
   from the directly recovered arithmetic.
5. At `0x102a9f69c-0x102a9f6c0`, the converted value receives
   **+0.50000001** when nonnegative, or **-0.50000001** when negative, then
   truncates to an integer. The result is clamped to at least one under the
   ordinary nonnegative setting domain. For a positive length already resolved
   to unit 0, the resulting gap width is:

   ```text
   integerGapWidth = max(1, trunc(length + 0.50000001))
   ```

6. The fill caller loads that output into `w1` at `0x102a8d618` and calls
   `0x10253cbcc` at `0x102a8d640`. That initializer stores it at
   `PWFloodFill +0x16c` at `0x10253cc64`.
7. The fill dispatcher `0x10253d250` reads `+0x16c` at `0x10253d2ac`.
   Zero takes the ordinary fill path; nonzero calls the native gap routine at
   `0x10253d2c4`.

The shared configuration routine separately reads Boolean parameter **5102**
and sets flag `0x400`, which the fill dispatcher supplies to the gap routine.
That flag selects additional narrow-area processing. Its native association is
consistent with the separate Fill narrow areas setting in official documentation.

## Native function identification and limits

The gap routine is **`Planeswalker::PWFloodFill::CloseGapFill(SPoint, unsigned
int, SRect&)` at `0x10253f5e4`**, size 2,348 bytes. Four retained lambda RTTI
names contain that exact enclosing function signature at `0x10453e4ce`,
`0x10453e517`, `0x10453e560`, and `0x10453e5a9`. Their callback tables
`0x104a4b810`, `0x104a4b830`, `0x104a4b850`, and `0x104a4b870` are directly
referenced by this function.

The function performs multiple bitmap passes. It has different processing below
width 2 and above width 10 and computes an auxiliary width from
`max(1, trunc(integerGapWidth * 0.35 + 0.50000001))`. Those numbers are internal
image-processing values, **not evidence of the five indicator presets**. The
bitmap stages are detailed in [native-algorithm.md](native-algorithm.md).
[Outline tracing and segment rasterization](narrow-boundary-rules.md) and the
[endpoint-pair loop](endpoint-pair-rules.md) now have verified instruction-level
translations. Startup position preparation, full stage interactions, candidate
classification, and final RGBA still need further evidence; these translations
do not establish whole-algorithm equivalence.

The preserved settings snapshot
`/Users/adoll/Applications/CSP Research/research-files/csp-cleanroom/EditImageTool.todb`
has `Variant.FillCloseGap REAL`, `FillCloseGapUnit INTEGER`,
`FillUseCloseGap INTEGER`, and `FillSoakIntoNarrowArea INTEGER`. Its saved widths
1.0, 2.0, and 20.0 do not establish an indicator table. Subsequent
[preset research](PRESETS.md) established the label-to-parameter association,
left-to-right factory order, and current unit-0 UI values. The first actual
capture independently confirmed that its third preset produces native gap 5
on a 72-dpi raster. Every other unit preference and customized table still
needs its own evidence before claiming equivalence across configurations.

Official behavior documentation:

- https://help.clip-studio.com/en-us/manual_en/810_subtools/F.htm
- https://tips.clip-studio.com/en-us/articles/590
- https://support.clip-studio.com/en-us/faq/articles/20190051
- https://tips.clip-studio.com/en-us/articles/534
- https://help.clip-studio.com/ja-jp/manual_jp/150_tools/%E3%83%84%E3%83%BC%E3%83%AB%E3%83%97%E3%83%AD%E3%83%91%E3%83%86%E3%82%A3%E3%83%91%E3%83%AC%E3%83%83%E3%83%88.htm
- https://help.clip-studio.com/en-us/manual_en/images/810_subtools_0110.png

The first two describe gap size and separate narrow-area behavior; the support
page confirms the indicator can switch to a numeric slider. The Fill screenshot
shows five boxes. The official Indicator Settings tutorial says each box has
an editable numeric value; the current Japanese manual requires ascending
values from left to right and explains how to show the current number without
changing display mode. The five boxes are numeric presets. These sources do
not provide the factory five numeric values.
