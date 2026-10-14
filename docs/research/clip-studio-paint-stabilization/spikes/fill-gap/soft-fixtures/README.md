# Controlled partial-alpha gap sources

These five new sources isolate candidate eligibility and later edge tuck. They
preserve the original 11 binary-alpha fixtures and all previous reports. Each
source is 640 × 480 pixels, with a transparent intended seed at [320, 230], a
three-pixel black outline core at inclusive [160, 100, 480, 360], and ten clear
bottom columns at x = 315…324. Exact PNG and compressed RGBA hashes, source alpha
histograms, source probes, and geometry are retained in `manifest.json`.

Four sources have uniform outline alpha 64, 128, 192, or 255. The fifth has an
opaque core and a true area-coverage outer fringe. Its alpha is computed from
the exact intersection area of each unit pixel square with a continuous outer
rectangle minus its clear interior. Coverage is rounded to RGBA8, yielding four
alpha16 corner pixels and 1,154 alpha64 side pixels outside the opaque core.
This analytic rasterization is recorded in the manifest; it is not a painted
blur or an invented artistic image. All transparent RGB bytes are known zero.

`soft_baselines.mjs` executes the current Croquis `findFill` and `writeFill`
directly, with no DOM and no product changes. `croquis-baselines.json` retains
all ten classification results, source-relative alpha counts, probes, complete
IN/TUCKED/changed masks, the implementation hash, and final RGBA hashes. The
`croquis-results/` directory retains final PNGs, complete compressed RGBA, and
one mark byte per source pixel.

| Source outline                   | Raw gap   | Croquis IN | Croquis TUCKED | Exterior selected |
| -------------------------------- | --------- | ---------- | -------------- | ----------------- |
| alpha64                          | 10 and 20 | 307,200    | 0              | Yes               |
| alpha128                         | 10 and 20 | 80,345     | 2,280          | No                |
| alpha192                         | 10 and 20 | 80,345     | 2,280          | No                |
| alpha255                         | 10 and 20 | 80,345     | 0              | No                |
| Opaque core plus outer AA fringe | 10 and 20 | 80,345     | 0              | No                |

These baseline observations are Croquis only. Measured native captures are
documented separately in [SOFT-EDGES.md](SOFT-EDGES.md). Croquis classifies
paper candidates with alpha < 128, regardless of RGB. Its line-distance source
uses alpha ≥ 128. Consequently alpha64 black provides no barrier and all
307,200 pixels become opaque red through IN. Uniform alpha128 and alpha192
provide the same barrier and IN mask as opaque black, but two eight-neighbor
edge-tuck rounds add 2,280 partial-alpha ink pixels. On this same-layer red fill,
an alpha128 tucked black pixel becomes [127, 0, 0, 255], and an alpha192 one
becomes [63, 0, 0, 255]. The alpha255 core is never tucked. The AA fringe is
eligible paper but belongs to the omitted exterior and remains untouched.

## Native controls and comparison

Keep color margin 10, anti-aliasing on, area scaling off, Refer only to editing
layer, multiple reference off, Fill narrow areas on, and paint #ff0000. Use the
fourth and fifth native indicators to capture raw gaps 10 and 20; verify the
captured gap/seed/narrow argument. Open the exact new source PNG for each case,
then retain visible UI/source context before filling. Do not reuse a previously
filled source. The recommended minimum sequence is alpha64 and alpha128 at both
gaps to establish the candidate transition, then alpha192 and the AA fringe.
Alpha255 is the control tying these geometries to the earlier opaque sources.
Individual g10 and g20 launcher metadata are prepared in `native-cases/`; its
matrix records source paths and honest captured-seed comparison policy. The
g10 cases are ordered first. Metadata describes intended controls; save observed
UI settings and source identity separately when capturing.

`compare_soft_native.mjs` accepts the same successful final observer boundaries
as the original comparer. It uses the unchanged original bitmap decoder and
keeps MSB-first bits, padded strides, signed document offsets, exact byte counts,
complete-capture requirements, failure rejection, and explicit seed matching.
Native bits outside the document and outside the returned exclusive rectangle
remain counted. Every document-projected A/C/IN/TUCKED/difference mask is retained
losslessly. Complete native bytes, including outside-document bits, stay in the
original capture JSONL, whose path and hash are recorded by the report.
Native C positives and zero bits are counted by exact source RGBA and alpha.
The alpha < 128 rule is labeled as Croquis's reference rule, not assumed to be
native truth. C is prepared lazily: a zero bit does not establish native
candidate rejection. Pixels outside C's bitmap are counted separately.

```sh
node docs/research/clip-studio-paint-stabilization/spikes/fill-gap/soft-fixtures/compare_soft_native.mjs \
  --capturefile /absolute/path/to/native.jsonl \
  --fixture soft-axis-gap10-alpha064 \
  --context /absolute/path/to/retained-ui-context.json \
  --output /absolute/path/to/new-soft-comparison.json
```

The intended seed must match by default. `--use-captured-seed` explicitly
recomputes Croquis at a different captured source coordinate and records both
seeds. `--call-id` selects one return; `--map` accepts an array of call/fixture
mappings. Reports and overlays are created exclusively, so choose a new output
path. Context is retained as evidence with its hash; intended settings alone
are not treated as confirmation of native UI controls.

The report compares final native A with Croquis IN, while TUCKED is a separate
measurement. It explicitly leaves native final RGBA unmeasured: A/C bitmaps do
not capture anti-aliasing, returned-rectangle application, or final source-layer
compositing. Croquis's complete final RGBA is available for a later independent
comparison once an exact native final-layer export is captured.

The bounded follow-up trace is recorded in
[CANDIDATE-PREDICATE.md](static-candidate/CANDIDATE-PREDICATE.md). It identifies
the candidate invoker and byte/alpha-color workers and retains the captured
interval parameter 26 under color margin 10. Its alpha ≤ 26 result is explicitly
conditional on a source-format branch that these captures did not observe.

## Verification

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/soft-fixtures/verify_sources.py
node docs/research/clip-studio-paint-stabilization/spikes/fill-gap/soft-fixtures/consolidate_native_g10.mjs
node --test \
  docs/research/clip-studio-paint-stabilization/spikes/fill-gap/bitmap.test.mjs \
  docs/research/clip-studio-paint-stabilization/spikes/fill-gap/compare_native.test.mjs \
  docs/research/clip-studio-paint-stabilization/spikes/fill-gap/soft-fixtures/compare_soft_native.test.mjs
```

The source generator only creates files or accepts identical retained bytes.
The baseline runner creates results exclusively; reproduction requires a new
copy of this source directory without previous outputs. This avoids replacing
retained evidence after the implementation changes.
