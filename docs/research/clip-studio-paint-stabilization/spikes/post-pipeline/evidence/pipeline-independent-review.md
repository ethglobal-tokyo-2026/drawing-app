# Independent ordinary pipeline review

Reviewed `post-pipeline.ts`, `spikes/post-pipeline/replay.ts`, the capture reader,
and `replay-180s.json` against the retained original instructions on 2026-10-11.
The expensive full replay was not rerun concurrently with the author's test.

No corrective arithmetic or control-flow finding was identified in the stated
ordinary open quadratic source scope, with zero source flags and zero angle
scalar. The review covered:

- `0x102787500`: ordinary type selection, `10*lengthScale`, source subdivision,
  output flag transformation, scalar import, constructor-zero endpoint data,
  and initial source correspondence.
- `0x10277f8c8`, `0x10276dec8`, and `0x10276b714`: retrying the left span after
  midpoint insertion, strict quarter-unit squared endpoint exclusion, separately
  evaluated inserted position, split controls, fused scalar interpolation, and
  the zero-angle branch.
- `0x102788104/47c`: P then N correspondence in mode 1, F correspondence in
  mode 2 only when FF exists, PP correspondence in mode 3, F's scalar supplied
  to mode-1 bounds/interpolation, source-dependent tolerance, source sampling,
  and adjacent-segment distances. Pure sampling caches do not change decisions.
- `0x1027883ac`, `0x102787b30`: transferring candidate correspondence to P and
  advancing past the cached next node after accepted deletion.
- `0x102787bb0`, `0x102787c9c`: corner classification before decreasing passes,
  and near-coincident eligibility/scalar direction. The final cleanup at
  `0x102787f94` exits immediately for the reconstructed spline output type.
- The endpoint wrapper uses current graph links, then returns the retained
  original node records. Its unknown evaluator acceptance and scope limits were
  reviewed separately in `endpoints-independent-review.md`.

There is no expected-output dependency in predicted geometry. `replay.ts`
constructs model input only from the before snapshot, captured entry arguments,
and entry path header. The after snapshot supplies validity checks and expected
values after reconstruction. The capture reader verifies native head/tail and
every next/previous pointer against snapshot order; checking predicted adjacency
against that same ordered sequence is therefore a valid topology comparison.

The retained report establishes one original correction boundary: 99 source
nodes become 304 subdivided source nodes and eight output spline nodes, with
zero reported differences in ordered binary64 positions, seven binary32
scalars, flags, endpoint bytes, adjacency, and path type flags. The independent
configuration-fingerprint warning remains in the report. These findings do not
establish other settings, unsupported source flags/types, arbitrary evaluator
configuration, rendering, or identical pen feel.
