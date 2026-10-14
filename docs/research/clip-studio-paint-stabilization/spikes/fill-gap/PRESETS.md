# CSP Close gap factory indicator values

Read-only static research on 2026-10-13 recovered the five factory values in
the pinned CSP 5.1.4 ARM64 executable: **1, 3, 5, 10, 20**, in left-to-right
indicator order. They are numeric presets, each of which the user can customize.
This establishes the factory table independently of saved per-tool widths and
the fill algorithm's internal thresholds.

The executable remains
`/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64`, SHA256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
All addresses below are unslid virtual addresses in that image. The bounded
assembly extracts, retained function names, raw double values, extraction
commands, and artifact hashes are in
[`evidence/indicator-presets/manifest.json`](evidence/indicator-presets/manifest.json).

## Factory table and parameter identification

The retained function name identifies `0x102a9d450` as
`Planeswalker::PWFillToolFactory::InitializeIndicatorInfo(...) const`.
It inserts a `std::map<int, SOptionalIndicatorInfo>` entry for parameter **5101**
at `0x102a9d46c-0x102a9d494`. The map helper at `0x100b2b518` stores the key
at node offset `+0x20` and reserves 48 bytes for the value beginning at `+0x28`.
The initializer then writes:

| Indicator index | Map node offset | Factory value | Source                                  |
| --------------- | --------------- | ------------- | --------------------------------------- |
| 0               | `+0x28`         | 1             | First double at `0x104314720`           |
| 1               | `+0x30`         | 3             | Second double at `0x104314720`          |
| 2               | `+0x38`         | 5             | First double at `0x104314630`           |
| 3               | `+0x40`         | 10            | Second double at `0x104314630`          |
| 4               | `+0x48`         | 20            | Binary64 immediate `0x4034000000000000` |

It writes a separate integer flag **1** at map node `+0x50`, immediately after
the five doubles. That is `SOptionalIndicatorInfo +0x28`; the flag is separate
from its values at `+0x00` through `+0x20`.

The companion retained function
`Planeswalker::PWFillToolFactory::MakeControlAttribute(...) const`
at `0x102a9a7d4` branches on parameter 5101 at `0x102a9acb4-0x102a9acbc`
to the control setup at `0x102a9c014`. Its label request is **`0x002e0019`**:
group **46**, label **25**. The preserved English resource extraction identifies
that exact entry as **Close gap**, and label 26 as
**Set the width of gaps to treat as closed**:

`/Users/adoll/Applications/CSP Research/research-files/csp-resource-analysis/english-labels.json`

The control also records parameter 5100 as its Boolean dependency at
`0x102a9c024-0x102a9c028`, consistent with the native configuration routine
in the accompanying [width-conversion research](README.md).

## Indicator consumption and order

`Planeswalker::Urza::URToolOptionInnerView::MakeSliderControl(...)`
at `0x100f26dbc` checks `SOptionalIndicatorInfo +0x28` and passes the value
to `SetIndicatorBlockValue(...)` at `0x100f270c4`.

`Planeswalker::Urza::URToolOptionInnerView::SetIndicatorBlockValue(...)`
at `0x100f28a78` reads **five consecutive doubles in order**, starting at the
provided structure's offset zero. Its loop at `0x100f28aec-0x100f28b64`
increments the offset by eight and stops at `0x28`. It appends each converted
value to a vector and calls `PWOptionalSlider::SetIndicatorValues(...)`
at `0x100f28ba8`; the order is preserved.

`PWOptionalSlider::GetIndicatorValue(...)` at `0x1032cc1ac` selects the vector
entry directly with `index * 4` at `0x1032cc220`.
`PWOptionalSlider::GetIndicatorBlockRect(...)` at `0x1032ccbb4` derives each
box's horizontal start from the parent rectangle's left coordinate and the
index at `0x1032ccc34-0x1032ccc6c`. Index zero is the leftmost box; increasing
indices advance horizontally. The factory order is therefore **1 → 3 → 5 →
10 → 20** from left to right.

## Units and limits

These are the factory values before the generic control's display conversion.
The control uses the global length-unit preference and decimal scaling; they
must not be substituted for the complete numeric-setting-to-fill conversion.
For length controls in unit **2**, `SetIndicatorBlockValue(...)` multiplies
the stored values by **0.1** at `0x100f28aec-0x100f28af8`, using the exact
constant at `0x1042ecb78`. That gives **0.1, 0.3, 0.5, 1, 2** before decimal
encoding. The Close gap control's bounds also differ in unit 2: `0.01..2.0`
instead of `0.1..50.0`, selected at `0x102a9c0a4-0x102a9c0d4`.

The current read-only profile query returned `Unit.GlobalLengthUnit = 0` in
`/Users/adoll/Library/CELSYS/CLIPStudioPaintVer1_5_0/Preference/Config.sqlite`.
This profile observation does not change the factory table and does not prove
that a user's customized five values still equal the defaults. The precise
human names of every unit and the behavior of every customized saved table were
outside this extraction.

The image-processing routine and its internal bitmap passes remain separate
research. Recovering these five presets does not reconstruct the complete
Close gap operation.

## Reproduction

The retained private method names are in a disconnected name subtree within
the `LC_DYLD_INFO_ONLY` export-name data. Standard symbol listings and the
public export-root traversal omit them. The recovery script follows validated
parent-name edges for only the requested native addresses and records each
ancestry chain in the manifest. Candidate byte locations that fail the node
structure checks are discarded; they are not application errors.

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/extract_indicator_presets.py \
  '/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64' \
  --output docs/research/clip-studio-paint-stabilization/spikes/fill-gap/evidence/indicator-presets
```

The extraction checks the pinned executable hash, decodes the source double
pairs, asserts the five factory values, and saves each bounded disassembly with
a hash. Existing `objdump` and `c++filt` were used. No tools were installed;
no app, document, settings, or product implementation was changed.

Official documentation describing customizable indicator values:
https://tips.clip-studio.com/en-us/articles/534

Official documentation describing Close gap:
https://help.clip-studio.com/en-us/manual_en/810_subtools/F.htm
