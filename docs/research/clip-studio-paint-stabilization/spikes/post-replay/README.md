# Offline post-correction capture comparison

This research-only tool reads saved CSP 5.1.4 ARM64 captures. It validates the capture structure, measures observed field changes, and evaluates the bounded arithmetic already extracted in `../../post-reference.ts`. **It does not predict the corrected path or implement the complete post-correction algorithm.** Nothing here imports Croquis production code, attaches to CSP, or requires a tablet.

The analyzed executable SHA256 is `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. Runtime recording is implemented separately in `../live-capture/capture_post_correction.py`. Layouts and supplementary breakpoint contracts are supported by `../post-capture-contract/README.md` and its pinned static evidence. Earlier arithmetic boundaries remain in `../../post-analysis.md` and `../post-contract/findings.md`.

## Run

From the repository root, with Node 24.21.0:

```sh
node --experimental-strip-types docs/research/clip-studio-paint-stabilization/spikes/post-replay/compare.ts /absolute/path/to/capture.jsonl --out /absolute/path/to/report.json
node --experimental-strip-types --test docs/research/clip-studio-paint-stabilization/spikes/post-replay/analyze.test.ts
node --experimental-strip-types docs/research/clip-studio-paint-stabilization/spikes/post-replay/write-fixtures.ts
```

Without `--out`, the comparison prints the complete JSON report. Exit 0 means structurally valid captured pairs and no mismatch among any supplied helper observations. It does **not** mean whole-curve equivalence, active correction, rendered equality, or tablet validation. Exit 2 means malformed/incomplete capture, helper mismatch, file failure, or invalid command arguments. A malformed JSONL input still produces a persistent report when `--out` is supplied. Output creation is exclusive: choose a new report filename; an existing file, including an alias of the input capture, cannot be overwritten.

The two checked-in fixtures are **hand-constructed synthetic bytes, never captured CSP output**. `synthetic-correction` changes three Bezier nodes into two spline nodes; `synthetic-identity` relocates an otherwise identical path to show that address changes alone do not prove correction. Their reports contain zero runtime arithmetic comparisons. The synthetic terminal detach fields exist only to exercise the schema; they do not describe an actual debugger session.

## Four separate report sections

| Section                         | What it establishes                                                                                                                                                                                                                                                                                                   | What it cannot establish                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `integrity`                     | Known image declaration; ordered records; matching entry/return thread and holder; valid raw bytes; recognized relocated vtables and allocation lengths; type selection; counts, owners, both link directions, null termination; consistent configuration fingerprints when supplied; complete clean terminal summary | Authenticity of an edited file, independently verified input device, or settings that were not captured               |
| `deltas` and `decodedSnapshots` | Actual saved node count, positions, bounds, stored controls, node/path flags, scalar `+0x44`, movement/time factor `+0x4c`, all seven scalar bytes, additional endpoint data and caches                                                                                                                               | Full curve shape, rendered output, effective controls selected by virtual methods, or source-to-output correspondence |
| `arithmetic`                    | Reference-derived parameters, or bit-exact helper comparison when all required inputs and an independent output are provided                                                                                                                                                                                          | Which nodes were removed, whether the maximum pass schedule executed, or which source nodes a replacement represents  |
| `wholeCurveEquivalence`         | Always explicitly `not-evaluated`                                                                                                                                                                                                                                                                                     | Any reconstructed whole-stroke output                                                                                 |

`classification: identity` means the listed retained fields compare equal in traversal order. `classification: changed` means at least one listed field differs. A path-type change can produce `changed` even if anchor positions stay equal; read the separate geometry result. Address, allocation state and cache differences alone do not imply correction. Stored controls are reported as stored controls: node flags `0x400/0x800` can select derived effective controls instead. Neither classification establishes visual equality or quality.

Each `snapshotIndex` belongs only to its own captured list. Equal node counts do not justify pairing nodes by index, and equal pointer values do not establish allocation identity because pools can reuse addresses. No per-node displacement, node survival, source-index assignment, or correspondence matching is invented. The original raw capture remains the authoritative memory record; decoded lists make its finite fields easier to inspect.

## JSONL schema

`schema.ts` is the portable contract. Each nonblank line is one JSON object. Header first, summary last, and all `boundary`, `helper`, and `error` sequences strictly increase. Recognized diagnostic rows may appear between header and summary; they require an `event` string and are not interpreted as geometry. Unknown kinds are errors.

1. `header`: `schema: "csp-post-capture/v1"`, pinned `imageSha256`, `imageBase`, `architecture: "arm64"`, explicit `provenance: "runtime" | "synthetic"`, and `device: "mouse" | "tablet" | "unknown"`. `imageBase` is the runtime load address corresponding to file VA `0x100000000`, not the slide. Optional `metadata` retains tool, brush and settings notes without assigning them unobserved semantics.
2. `boundary`: `callId`, `sequence`, `phase`, `threadId`, `holder`, file-VA `boundary`, `arguments`, and `path`. Entry is `0x1028ed064`; return is `0x1028ed144`, and return also supplies `returnedPath`. Copied entry arguments on return establish pairing consistency only. An optional independently acquired `configurationFingerprint` can detect settings drift; without it, the report warns that UI settings drift was not evaluated.
3. Optional `helper` records supply `helper`, ordered `inputs`, optional `observed`, and nonempty `evidence` naming the exact capture boundary. Runtime comparison additionally requires captured `fpcr: "00000000"`; a missing or nondefault FPCR produces `not-evaluated`.
4. `summary` supplies `captureComplete`, `stopReason`, `entries`, `pairs`, `cleanupErrors`, `detachRequestSucceeded`, and `detachedStateObserved`. Integrity requires at least one complete pair, consistent counts, no cleanup errors, and both detach facts. Any recorder `error` is retained and invalidates the capture. A failed global integrity check suppresses all path comparisons, even if a partial pair was readable.

Addresses are hexadecimal strings. `headerHex` and node `bytesHex` preserve raw little-endian memory bytes in increasing-address order. Wrapper `toleranceBits` and `lengthScaleBits` are fixed-width big-endian hexadecimal **bit representations** of binary64 numbers. For example, tolerance 2.5 is `4004000000000000` and scale 0.25 is `3fd0000000000000`. This distinction prevents accidental byte reversal.

Full recognized `PWVectorStroke` headers are `0xa8` bytes. Shorter manually prepared headers of at least `0x50` are accepted with an incomplete-endpoint-context warning; headers exceeding the known allocation are rejected. The recorder emits the full size. Nodes require exactly `0x78`, `0x88`, or `0x98` bytes according to the relocated vtable and path type. Node flags are independent of path type. The 4096-node maximum is a recording safety bound, not an application limit; exceeding it fails rather than truncating. Closed-path accessor wrapping does not excuse a circular raw list.

The validator rejects nonfinite coordinates, stored controls and the two decoded scalar fields. Other retained bytes are preserved without guessing whether their bit patterns are initialized numeric data. Header declarations are checked against the pinned contract; this offline tool does not authenticate the producer or reread the live executable.

## Derived arithmetic and optional observations

With `selector482 == 0`, wrapper `k` and tolerance suffice to calculate the reference scalar ratio/floor, maximum removal-pass schedule, endpoint amount, and a possible initial per-source tolerance for each retained source node. They are labeled `derived`, never `match`. The source can be converted internally, so these source-node tolerance calculations do not prove that those exact nodes reached an internal segment test. The schedule is a **maximum**: actual additional passes stop on the first pass that removes no node. With the alternate selector, ordinary-core derivations are not evaluated.

Settings conversion requires all original reader inputs: enable, signed `k`, both flags, scaling choice, fallback choice, magnification, and prior flag values. Wrapper outputs cannot reconstruct those inputs. Caller-cap comparison likewise needs pre-cap values and the actual object condition. Missing observations remain `not-evaluated`; nothing fills the gap from a UI label or an assumed default.

All helper calculations call the existing `post-reference.ts` exports, including software fused arithmetic. Floating outputs use `{ "f32": "400ccccd" }` or `{ "f64": "3fe0000000000000" }`, including floats nested in objects or arrays. Integers and booleans remain plain JSON values. Tagged floats may also be used within inputs to preserve signed zero and exact source bits. Runtime outputs must be independently captured, not computed by the reference and written back as observations.

Example optional record for a captured scalar-limit checkpoint:

```json
{
  "kind": "helper",
  "sequence": 3,
  "callId": "1",
  "helper": "scalarLimits",
  "inputs": [10],
  "observed": { "ratio": { "f32": "400ccccd" }, "floor": { "f32": "3e19999a" } },
  "fpcr": "00000000",
  "evidence": "At file VA 0x102787260, captured smoother+0x5c/+0x60; k retained from this invocation."
}
```

This is an example shape, not a runtime observation. The corresponding concrete checkpoints are:

| Bounded comparison        | Required captured values                                                                                               | Boundary                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `scalarLimits`            | signed core `k`; smoother ratio/floor raw f32 bits                                                                     | `0x102787260`, `x19+0x5c/+0x60`                                                                                                    |
| `cornerPredicate`         | actual A/B/C doubles, actual corner tolerance and scale, Boolean return                                                | entry `0x1027878ec`; ordinary caller return `0x102787c40`; retain thread/stack pairing                                             |
| `sourceSegmentTolerance`  | current pass tolerance, flag480, source node f32 `+0x4c`, resulting `d9`                                               | `0x102788574`, after sampler return; scope to this invocation                                                                      |
| `interpolateScalar`       | endpoint f32 values, actual replacement parameter `t`, final narrowed f32 result                                       | `0x102788638` provides `d0=t`, `s11/s8`; `0x102788650` is **before** float narrowing, so capture after narrowing for this export   |
| `removalScalarAccepted`   | source scalar, both endpoint scalars, ratio/floor, actual nearest-sample replacement parameter; accepted scalar result | scalar portion of `0x1027885b0..0x102788680`; distinguish scalar rejection from preceding geometric rejection                      |
| Additional-pass tolerance | initial tolerance, signed `k`, actual pass ordinal and retained tolerance; stop/changed result                         | derive the maximum using `removalPassSchedule`; actual pass collection requires a separate precisely paired internal record series |

The helper schema also permits settings conversion, caller cap, endpoint amount, classified corner flags, scalar bounds and the numeric near-coincident test. Their argument order is the existing export signature. Eligibility, flags, adjacency, geometry sampling and helper invocation coverage remain outside those numeric results. Do not put an observed early-stop pass list into `removalPassSchedule`: that export returns a maximum arithmetic schedule, not an execution trace.

The numeric domain remains finite IEEE binary64/binary32, round-to-nearest/ties-to-even and gradual underflow. Geometry helper input magnitudes are conservatively limited to `1e100` to exclude hidden intermediate overflow. Scalar inputs must narrow to finite binary32; scalar-bound ratios must be positive. Explicit interpolation parameters are bounded to `[0,1]`. Inputs outside these bounded checks are rejected rather than treated as verified. FPCR modes, exception flags and nonfinite ARM behavior are not reproduced.

## Current coverage and remaining work

The checked-in fixtures demonstrate parser and comparison behavior only. The initial recorder observes wrapper entry/return and thus produces before/after field evidence with **zero helper-runtime matches**. Any separately saved real mouse or tablet capture must retain its own input file and report; synthetic fixtures must not be relabeled as native evidence.

The [2026-10-11 geometry foundation](../post-spline/README.md) now reconstructs the six-point spline evaluator, measurement, outer-neighbor adjustment, contexts and sampler, plus the pure quadratic geometry needed for source subdivision. This analyzer still does not assemble those functions into whole-output prediction. Remaining work includes full source conversion and attribute import; correspondence and ordered node-removal orchestration; endpoint evaluator configuration and endpoint passes; closure/final cleanup; and the alternate Bezier branch. Captured source/replacement sample arrays at `0x102788574` could later test a bounded distance/scalar decision, but this analyzer does not yet evaluate those records. Full rendering and pressure-device provenance remain separate checks.

Validation includes malformed bytes, bad counts and links, owner errors, duplicate nodes, incomplete snapshots, missing returns, mismatched configurations, foreign images, duplicate sequence numbers, terminal cleanup failures, identity versus changed positions/scalars/flags/controls/endpoint data, independent node flags, settings bit comparisons, alternate-class exclusion, runtime FPCR gating, and persistent CLI failure reports. `verification.txt` records the executed checks and their scope.
