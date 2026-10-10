# Post-correction arithmetic and remaining reconstruction work

This handoff describes Clip Studio Paint 5.1.4 ARM64, image SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. Addresses are virtual addresses in that image. Descriptive function names are analysis labels; the class names `PWVectorSmooth` and `PWVectorSampleBezier` are established through RTTI. This is static analysis, not a comparison of rendered strokes against a running CSP process.

**2026-10-09 update:** The [post-correction data contract spike](spikes/post-contract/findings.md) resolves ordinary output type `0x80` as `PWVectorSplineCurve`, traces both node-scalar writers, and establishes the spline sampler's 5–256-point schedule. The full six-point evaluator, its measurement and neighbor-adjustment helpers, and the original device-scalar producer remain open. The linked report includes retained assembly, data bytes, and a self-contained verification command. These findings describe future CSP reconstruction requirements; Croquis's current stabilizer is disposable.

`post-reference.ts` implements the recovered arithmetic. It deliberately does not implement a stroke simplifier, Ramer–Douglas–Peucker procedure, curve fitter, or invented substitute for unresolved CSP path operations. Using these helpers inside another algorithm does not make that algorithm equivalent to CSP.

Supporting assembly is retained under `evidence/post/`. In addition to the original `region.asm` and per-function extracts, `magnification-transform.asm` records the state/getter/setter/affine transform chain, and `sampled-geometry-helpers.asm` records the nearest-sample projection/distance and scalar-comparison helpers. New extracts `102891ca0.asm`, `1021944a8.asm`, `102889450.asm`, and `102889768.asm` capture the caller cap, segment projection, and caller initialization/settings connection.

## Corrections and additions to the prior report

| Prior shorthand or missing detail                          | Audited result                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale = 100/M`                                            | Mathematical shorthand only. The instructions calculate `1 / (M * 0.01)`, with two binary64 rounding steps. Preserve this order.                                                                                                                                                               |
| `0.1*k*k`                                                  | `0.1 * uint32(int32(k) * int32(k))`: the integer multiply is 32 bits, wraps, and its result converts as unsigned. `Math.imul(k,k) >>> 0` captures that behavior.                                                                                                                               |
| Ratio/floor as decimal formulas                            | Two binary64 fused multiply-adds, then binary32 conversion, then binary32 upper caps. The floor cap is the float `0.30000001192092896`.                                                                                                                                                        |
| Tolerance is globally fixed for removal                    | Each additional pass subtracts an integer decrement from the current double. Setting `0x480` additionally enables a per-source-segment factor and minimum, described below.                                                                                                                    |
| Speed option not traced                                    | `0x480 -> brush+0x174 -> wrapper w3 -> smoother+0x58 -> source node float+0x4c` is established. `SVectorNode` double+0x20 comes from stateful movement/time helper `0x1028f25b0`, upper-capped at 1. Configuration meanings, time units, and UI-label association remain open. |
| Caller does not alter settings                             | A conditional branch caps `k` at 4 and tolerance at 1.5 immediately before invoking the stroke smoother. The activating object's semantics are not established.                                                                                                                                |
| Corner uses ordinary geometric formulas                    | Finite-domain branches agree with the prior formula, including equality acceptance in the last deviation test. FMA order matters. ARM `PL` also accepts unordered comparison, so replacing it with JS `>=` would change NaN behavior; NaN payloads are outside this implementation's contract. |
| Float scalar comparisons have approximately `1e-4` slack   | Exact constants are binary32 ±`0.00009999999747378752`, added to each bound in binary32; the interval is inclusive.                                                                                                                                                                            |
| Bézier formulas imply ordinary post correction fits cubics | They do not. Ordinary output type `0x80` allocates `PWVectorSplineCurve`; that path skips the shared control conversion block requiring type bits `0x60`. The alternative selector invokes a separate `PWVectorSampleBezier` class. |

## Input fields and call chain

Settings reader `0x1028e1308` receives the setting source, a view-related shared object, a fallback input `w3`, and pointers to outputs. The caller at `0x1028897f0–0x102889804` stores those outputs on the brush object:

| Brush offset    | Value                                      | Source                                                   |
| --------------- | ------------------------------------------ | -------------------------------------------------------- |
| `+0x164` u32    | Whether reader succeeds/enables processing | Reader's return value; includes forced fallback behavior |
| `+0x168` double | Positional tolerance                       | Setting `0x47f` transformed as below                     |
| `+0x170` i32    | `k`                                        | Setting `0x47f`, reader default 1                        |
| `+0x174` u32    | Per-source tolerance flag                  | Setting `0x480`                                          |
| `+0x178` double | Length scale                               | `1/(M*0.01)`                                             |
| `+0x180` u32    | Alternate class selector                   | Setting `0x482`                                          |

The same caller initializes `+0x174` and `+0x180` to zero and `+0x178` to 1 at `0x102889464–0x10288947c`. The reader does not initialize those two flag outputs itself. The pure function therefore requires caller-supplied prior flag values for the disabled-with-fallback branch.

```text
0x102889800 -> read settings at 0x1028e1308
0x102891ca0 -> gate on brush+0x164, plus further object/mode gates
0x102891cdc–0x102891d24 -> optional caller cap
0x102891d40–0x102891d58 -> load brush fields and invoke 0x1028ed064
  selector482 != 0:
    0x102785dd4 construct PWVectorSampleBezier
    0x102785e94 process with tolerance * 0.1, flag480, another mode input, scale
  selector482 == 0:
    0x102786e10 construct PWVectorSmooth
    0x1027873f4 set state, invoke 0x1027871d0 with corner/end processing enabled
```

`0x102891d4c` supplies an additional mode input from stack `+0x29c`, passed through stroke `w3`, wrapper `x4`, and core `w3`. It participates in closed/path handling, not in the per-source tolerance flag. Its original caller-side meaning is unresolved.

The caller cap applies when brush `+0x78` is non-null, that object's vtable `+0x10` method returns nonzero, and helper `0x102ce8894` returns a value other than 100. Then signed `k>=5` becomes 4; double tolerance `>1.5` becomes 1.5. Nothing here establishes which UI/tool mode that object represents. `applyCallerCap` leaves this decision to its caller.

## Settings conversion with exact arithmetic order

At `0x1028e134c–0x1028e1474`, the enable local starts false, scaling local starts true, and the integer setting output starts at 1 before reading `0x47f`.

```text
if setting47e:
    k = readInt(0x47f, default=1)
    T = binary64(uint32(k*k)) * binary64(0.1)
    if T < 0.2 and fallbackRequested: T = 0.2
    flag480 = readBool(0x480, caller's current output)
    scaleTolerance = readBool(0x481, default=true)
    selector482 = readBool(0x482, caller's current output)
else:
    if not fallbackRequested: return false without writing outputs
    k = 1
    T = 0.2
    scaleTolerance = true
    flag480 and selector482 remain unchanged
M = helper102992930(view)
S = 1.0 / (M * 0.01)
if scaleTolerance: T = S * T
return true, k, T, S, flag480, selector482
```

`M` is strongly established as view magnification in percent: its state record is consumed by the affine-transform builder, which divides it by 100. The record setter rounds to 1/4096 and clamps to default bounds 0.78125 and 3200. Neither the UI setting names for numeric IDs nor all setter overrides were recovered. No application behavior should infer an unobserved setting range solely from this routine.

## Core pipeline, address mapped

The ordinary wrapper `0x1027873f4` sets smoother fields `+0x30=1`, `+0x34=0`, `+0x50=T`, `+0x58=flag480`, `+0x68=S`, `+0x70=0`, and source path `+0x48`. Constructor values `+0x38=1` and `+0x3c=0x80` remain; type `0x80` selects `PWVectorSplineCurve`. Output path is `+0x40`; a source correspondence multimap begins at `+0x8`.

```text
0x102787204–230:
    ratio = float32(fma64(0.1, int32(k), 1.2))
    floor = float32(fma64(0.01, int32(k), 0.05))
    if ratio > float32(3.0): ratio = float32(3.0)
    if floor > float32(0.3): floor = float32(0.3)
0x102787234–250:
    raw = truncateTowardZero(binary64(k) * 0.2)
    n = minSigned(raw, 7)
0x102787258–25c:
    clone/convert source path and retain output-node -> source-node correspondence
0x102787260–26c:
    if self+0x34 != 0: reconsider existing node flags
0x102787270–27c:
    removeEligibleNodes()       # current T
    removeEligibleNodes()       # same T, runs even if previous pass removed nothing
0x102787280–288:
    if core w4 != 0: classify corners using T*0.3 and S
0x10278728c–2c4:
    if raw >= -2:
        decrement = signedIntegerDivision(k, n+4)
        counter = n+2
        do:
            T = T - binary64(decrement)
            changed = removeEligibleNodes()
            if not changed: break
            oldCounter = counter
            counter = counter - 1
        while oldCounter != 0
0x1027872c8–2cc:
    mergeEligibleNearCoincidentFlaggedNodes()
0x1027872d0–30c:
    if core w4 != 0:
        amount = k * 0.05
        if amount > 1: amount = 1
        processEndpoint(start, amount)
        processEndpoint(end, amount)
0x102787310–314:
    finalSegmentCleanup()
0x102787318–338:
    conditional path operation for core w3; remove old path; release correspondence
```

For nonnegative `k`, there are at most `n+3` additional passes and `n+5` removal passes total. The decrement is in coordinate units; it is not scaled with magnification, not a percentage of T, and not recalculated from `k*k`. There is no zero clamp on the per-pass T. For `k=10, M=400, scaleTolerance=true`, initial T is 2.5 and the maximum additional schedule is 1.5, 0.5, -0.5, -1.5, -2.5. Actual execution usually stops before exhausting such a schedule because a pass removes nothing. Enabling flag480 separately floors each sampled source's effective tolerance at 0.1.

`0x102787b30` starts at the node after the path head. It caches each candidate's next node before testing; after accepted removal, it advances past that cached next node. It returns whether any node was removed. Eligibility, not this traversal alone, excludes endpoints.

Corner classification precedes the additional tolerance decrements. It skips nodes with flag bit 2. The ordinary wrapper operates on all eligible nodes; other wrappers can restrict processing through an optional region object at `self+0x20`. A positive corner predicate sets bit 0; a negative result clears bits 0, 1, and 6 (`flags & ~0x43`).

## Exact corner predicate

`0x1027878ec–0x102787a18` is shared with other stroke processing and is not exclusively a post-correction routine. `cornerPredicate` preserves its operation order, including the separately rounded `y*y` followed by fused `x*x + product`.

For finite values, let `u=B-A`, `v=C-B`, `L=|u|+|v|`, and `s=L*S`. Squared length strictly below `1e-8` returns true. The direction-dot limits are 0.8 for `s<1`, 0.7 for `s<3`, 0.6 for `s<10`, 0.5 for `s<30`, and 0.4 otherwise. A dot strictly above the limit returns false; a dot strictly below zero returns true. Otherwise, a zero chord or `2*|C-A|<L` returns true. Final acceptance is `abs(cross(u,C-A)) >= |C-A|*positionalTolerance`, with equality accepted. The caller supplies `positionalTolerance=T*0.3` before the additional passes.

ARM compare details: `MI` means ordered less-than, `PL` means not ordered less-than, and `LE` after `FCMP` includes unordered. The implementation's documented contract excludes non-finite arithmetic and FPCR modes other than ordinary IEEE rounding; it does not claim ARM NaN payload or exception-flag equivalence.

## Removal eligibility and sampling

`0x102788104` protects a candidate with bit 0 unless smoother `+0x34` is nonzero or output-path flag bit 4 is set. It requires a preceding and following node via `0x10276afac` and `0x10276af54`. These accessors include path-end behavior and must not be replaced blindly with array neighbors.

Let `P,N,F` denote preceding, candidate, and following output nodes, and `PP`/`FF` their outer neighbors. The routine enumerates correspondence entries and invokes `0x10278847c` in these groups:

| Retained source entries associated with | Replacement segment anchor | Mode |
| --------------------------------------- | -------------------------- | ---- |
| P                                       | P                          | 1    |
| N                                       | P                          | 1    |
| F, if FF exists                         | F                          | 2    |
| PP, if PP exists                        | PP                         | 3    |

All checks must succeed. The extra scalar argument is F's float at `+0x44`. Correspondence remains available after deletion, so replacing this with a check of only the current three coordinates loses behavior.

`0x10278847c` performs:

```text
effectiveT = current pass T
if smoother+0x58 != 0:
    factor = binary64(sourceNode.floatAt4c)
    if factor < 0.1: factor = 0.1
    effectiveT = effectiveT * factor
    if effectiveT < 0.1: effectiveT = 0.1

if smoother+0x70 != 0:
    sourceSamples = source position plus optional next position via 0x10276af80
else:
    sourceSamples = 0x10276ca3c(sourceNode, argument 4.0, flag 1)

replacementSamples = 0x10276cb14(anchorNode, mode)
if that helper fails: return false
for every source sample:
    distance = 0x10359b3b4(replacementSamples, sample)
    if distance > effectiveT: return false
if mode != 1: return true
perform scalar test described below
```

Distance is Euclidean, not squared. `0x10359b3b4` first finds the nearest sampled vertex by squared distance (strict improvements only), then computes point-to-segment distance only on that vertex's preceding and following segments. It does not scan every segment for the globally nearest projection. `0x102193940` handles endpoint projection cases and interior cross-product distance. The [data contract spike](spikes/post-contract/findings.md#ordinary-spline-replacement-samples) identifies the ordinary spline sampler `0x102789114`, density argument `4.0`, and count `n+1`, where `n` is the truncated measure/density ratio clamped to 4–255. Its six-point evaluator `0x10359f580`, measurement `0x10359fd24`, and outer-neighbor adjustment `0x10359f8d4` still require reconstruction for full geometry equivalence.

After acceptance, `0x1027883ac` transfers the candidate's correspondence entries to its preceding node, removes the old entries, and invokes `0x10276e06c(candidate,1)`. That helper adjusts neighboring segment data before `0x102781838` relinks nodes and decrements the path node count. Merely deleting a coordinate from an array does not reproduce it.

## Scalar test

Scalar `q` is the source node's float `+0x44`, exported by `0x10276b138` as `SVectorNode` double `+0x10` and narrowed back by `0x10276b190`. Constructor `0x10288cd3c` receives brush-event double `+0xa0`, traced to input-wrapper double `+0xc8`, with optional response transforms and startup scaling before import. The original OS/device producer remains unconnected; this is not established as raw pressure. The sample-dependent tolerance uses float `+0x4c`, exported as double `+0x20`; move callers write the output of stateful movement/time helper `0x1028f25b0` there. It uses constructed positions, wrapper `+0x88` through event `+0xd0`, retained history and settings, then caps above at 1. The [exact writers and retention requirements](spikes/post-contract/findings.md) distinguish these values from raw input pressure, raw speed, and rendered width.

`scalarBounds` reproduces `0x1027885b8–0x1027885dc`:

```text
upperProduct = float32(q * ratio)
upper = upperProduct < floor ? floor : upperProduct
lowerQuotient = float32(q / ratio)
lower = q < floor ? float32(0) : lowerQuotient
```

The comparisons use the following exact float interval, not an unrounded double epsilon:

```text
e = float32(0.0001)             # bits 0x38d1b717
insideSlack(value,bound) = float32(bound-e) <= value <= float32(bound+e)
atLeast(value,bound) = value > bound OR insideSlack(value,bound)
atMost(value,bound) = value < bound OR insideSlack(value,bound)
```

Mode 1 first checks that both replacement endpoint scalar values are within `[lower,upper]` using those helpers. If either fails, `0x10359b240` finds a parameter `t` for the first source sample relative to the sampled replacement. It uses the nearest sampled vertex and only neighboring segments; the parameter is `(segmentIndex + projectedFraction)/(sampleCount-1)`, capped above at 1. It is not an arc-length fraction and not an input-time fraction. The scalar fallback is `float32(fma64(double(a), 1-t, t*double(b)))`, then the same bound checks. The implementation accepts `t` as an explicit parameter because the full replacement evaluator and neighbor adjustment remain unreconstructed, even though the sample-count schedule is known.

Near-coincident cleanup at `0x102787c9c` requires the candidate and its preceding node to have bit 0, requires a next node, and applies any region restriction. It removes the candidate only if squared distance is strictly less than 1 and its float `+0x44` satisfies the ratio/floor bounds constructed from its preceding node's scalar. The numeric helper is provided; graph/flag preconditions remain caller responsibilities.

## Bézier and endpoint behavior

`0x102787818–0x102787838` calculates `(2Q+A)/3` and `(2Q+C)/3` through add/add/divide instructions. `0x102787760–0x102787784` uses `L/3` and supplied endpoint tangents to form `A+tangentStart*(L/3)` and `C-tangentEnd*(L/3)` when the tangent-intersection construction fails. Tangent normalization was not independently established for every virtual implementation, so the helper does not normalize its inputs.

`0x10359dcac` attempts a quadratic control point from endpoint tangent rays. It has direction-dot limits, a near-parallel midpoint branch with a line-distance check, an intersection helper, and forward/backward direction checks. Its full supporting geometry functions are not implemented here.

These conversion formulas are in shared code. In the ordinary smoother branch, constructor defaults and wrapper state select output type bits `0x80`, now identified as `PWVectorSplineCurve` by allocation and RTTI. In `0x102787500`, the mask clears source type bits `0xf0`, then selects `0x80`. Accordingly `0x1027876dc` skips the control conversion block because `targetFlags & 0x60` is zero. The ordinary branch also skips the final `0x102787f94` cleanup gated by output type bits `0x60`. The separate `PWVectorSampleBezier` branch receives one-tenth the positional tolerance and requires source path bit `0x20`; it is not a toggle around the arithmetic above and is not implemented by this handoff.

Endpoint processing `0x102787db0` uses path virtual methods at vtable `+0x88` and `+0x98`, an optional evaluator `0x1024c497c`, accumulated segment lengths, and additional node/control modifications. Only its `min(k*0.05,1)` input is implemented. Omitting that endpoint routine means full output equivalence is still absent.

## What is needed before claiming equivalence

1. Resolve source-type selection for each actual brush configuration, relevant path/node flags, coordinate units, and original device producers into wrapper `+0xc8/+0x88`. The traced chain includes source type `0x20` (`PWVectorBezierCurve`) and output type `0x80` (`PWVectorSplineCurve`); it does not establish every tool's source path.
2. Implement the clone/conversion/resampling decision in `0x102787500`, including any `0x10277f8c8` conversion. Sampler wrappers and the spline target/count schedule are identified; reconstruct six-point evaluator `0x10359f580`, measurement `0x10359fd24`, neighbor adjustment `0x10359f8d4`, and any applicable source sampler.
3. Reproduce correspondence multimap updates, adjacency accessors with endpoint behavior, replacement controls, and mutation helpers; an array-only approximation is insufficient.
4. Reproduce both endpoint passes and any applicable final segment cleanup or path-close operation.
5. Trace setting IDs to UI labels, fallback input, caller-cap object conditions, scalar response/startup settings, movement/time initializer settings and time units, and alternate-class selection for the actual tool under study. The node-scalar writers are established; their remaining upstream device and configuration gaps are explicit in the linked spike.
6. Capture deterministic input/output cases from CSP, including setting/zoom changes, pressure/scalar variation, corners, very short segments, and selector482. Compare geometry, controls, node flags, scalar samples, and rendered output. The present checks validate arithmetic and assembly interpretation, not whole-stroke equivalence.

## Verification

The source compiles under the workspace TypeScript compiler with strict checking:

```text
cd /private/tmp/csp-handoff-post
node /Users/adoll/projects/drawing-app/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext post-reference.ts
exit 0; no output
```

The executable checks use Node v24.21.0 with explicit TypeScript stripping. Python's independent `math.fma` supplies binary64 expected values including cancellation, subnormal ties, an overflowing intermediate product with a finite fused result, signed zero, and 1,000 seeded randomized cases.

```text
node --experimental-strip-types post-reference.test.ts
FMA: 1005 binary64 cases agree bit-for-bit with Python math.fma.
Settings, uint32 square overflow, f32 limits, pass schedule, caller cap, and segment tolerance cases pass.
Corner degeneracy, straight, obtuse, deviation threshold, and inclusive boundary cases pass.
Scalar float-slack boundaries, interpolation acceptance, strict distance boundary, and cubic control cases pass.
exit 0
```

An initial `node --check post-reference.ts` attempt without the TypeScript stripping option failed with `SyntaxError: Unexpected token 'export'`. This was a command-selection error, resolved by the successful strict TypeScript check and explicit-stripping execution above. No application files or installed CSP files were modified.

An added bin-transition test initially expected a 0.6 direction dot to be rejected by the 0.7 limit, producing `AssertionError: true !== false`. The fixture was incorrect: rejection requires dot strictly above the limit. The test now independently checks the length-10 transition, where the limit changes from 0.6 to 0.5; implementation code did not change. The full suite was rerun successfully after the fixture correction.

The exactness contract is deliberately bounded: arithmetic runs with finite values/intermediates, IEEE round-to-nearest/ties-to-even and gradual underflow; the host `Math.sqrt` must provide correctly rounded binary64 square root. `fma64` is a software fused implementation because substituting JavaScript `a*b+c` would introduce an extra rounding step. FPCR changes, NaN payloads, signaling exceptions, and complete path behavior are not covered.
