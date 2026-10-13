# Ordinary open post-correction replay

The offline reconstruction now reproduces the saved CSP mouse correction's
complete retained path: **99 input nodes become eight output spline nodes,
with zero field differences**. The independently recorded native input/output
pair remains the reference. No output coordinates, output node indices, or
target count are supplied to the implementation.

[post-pipeline.ts](../../post-pipeline.ts) assembles source subdivision, scalar
import, source associations, removal, corner classification, near-coincident
cleanup, and the two endpoint passes. [replay.ts](replay.ts) validates the saved
capture before decoding it, runs that implementation, and compares every
retained field. The complete successful result is
[replay-180s.json](evidence/replay-180s.json).

## Exact result and stage trace

| Stage                                  | Nodes afterward |        Positional tolerance |
| -------------------------------------- | --------------: | --------------------------: |
| Quadratic subdivision and spline clone |             304 |                           — |
| Initial removal 1                      |             153 |                         160 |
| Initial removal 2                      |              77 |                         160 |
| Corner classification                  |              77 | 48 for the corner predicate |
| Additional removal 1                   |              39 |                         157 |
| Additional removal 2                   |              20 |                         154 |
| Additional removal 3                   |              12 |                         151 |
| Additional removal 4                   |              10 |                         148 |
| Additional removal 5                   |               8 |                         145 |
| Additional removal 6, no changes       |               8 |                         142 |
| Near-coincident cleanup                |               8 |                           — |
| Head and tail endpoint passes          |               8 |                           — |

The replay matches each ordered output node's two binary64 coordinates, seven
binary32 scalar fields at `+0x44..+0x5c`, node flags, twelve endpoint bytes at
`+0x60..+0x6b`, open adjacency, spline class, and output path flags. It performs
4,351 retained-source checks. The report includes all subdivision points and
controls, final source associations, candidate acceptances/rejections, and each
pass's retained node list. Intermediate counts are reconstructed values; the
native fixture captured only the original input and final output.

## Endpoint configuration and supported inputs

The capture contains the evaluator pointers and path parameter, but not the
pointed-to evaluator configuration. The implementation passes this fact as
`"unknown"`; it does not fabricate a callback result. Both endpoint passes are
proved unable to change geometry for this reconstructed path: their first
spline segment lengths are `1648.7323712842876` and `1578.852227083522`, both
strictly above the captured travel limit `2.5`. The native loop therefore exits
before a deletion decision. Initial native evaluator calls and their possible
side effects are not reproduced or claimed. Inputs whose geometry could
require that missing evaluator configuration fail explicitly.

This implementation supports the ordinary selector, open quadratic source
paths, zero source node flags, and zero angle scalar `+0x50`. Other node flags,
source classes, alternate selector, region-restricted wrappers, and closed-path
operations are outside its contract. All seven source scalar fields must be
finite binary32 values; positions and controls and their arithmetic must remain
within the pure helpers' finite binary64 domain. The path remains research
code, and this one saved mouse fixture is not tablet, rendering, or all-settings
validation.

Node construction is established from the original constructor instructions,
not copied from expected outputs. The [construction audit](evidence/node-construction.md)
records why new source/output nodes reset endpoint fields and why the original
source nodes retain their own bytes. Existing helpers preserve exact FMA and
binary32 rounding. Replacement/source sample caches reuse pure results only;
they do not change sample positions or candidate traversal.

## Running the bounded replay

From the repository root, use a new output filename:

```sh
node --experimental-strip-types docs/research/clip-studio-paint-stabilization/spikes/post-pipeline/replay.ts docs/research/clip-studio-paint-stabilization/evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl /tmp/csp-post-replay.json 180000
```

The final argument is an explicit operational deadline in milliseconds. The
default is 60 seconds. Runs are additionally limited to 10,000 source nodes,
1,000,000 retained-source checks, and the numeric helpers' existing sample-count
bounds. These limits are research safeguards, not native constants. Each pass
reports progress. A failure is retained in the requested report and causes a
nonzero exit; neither the algorithm nor comparison returns a partial success.

The [first replay](evidence/replay-first.json) reached the 60-second work limit
before completing the additional removal passes. A second run with the explicit
180-second bound completed in about 101 seconds, producing zero differences.
Only the operational time allowance changed. No captured tolerance, strength,
scale, sample schedule, or removal rule was adjusted. This duration measures
the TypeScript reference with software binary64 FMA, not CSP runtime behavior.
