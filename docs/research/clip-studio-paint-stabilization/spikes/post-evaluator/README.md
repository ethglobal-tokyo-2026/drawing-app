# Configured endpoint evaluation

`../../post-evaluator.ts` reconstructs `0x1024c497c`, including its deterministic
response helper, response-curve selection, quadratic inversion and line fallback.
It supplies the existing endpoint callback without changing traversal or treating
unknown configuration as an absent pointer.

The pinned image is the preserved CSP 5.1.4 ARM64 executable, SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
Addressed assembly, native vectors and source hashes are retained in `evidence/`.
No CSP process was launched or attached for this work.

## API and retained fields

```ts
evaluatePostEndpoint(node, pathParameter, config): number
createPostEndpointEvaluator(config): (node, parameter) => number
createPostEvaluatorConstructorConfig(): PostEvaluatorConfig
evaluatePostResponseCurve(points, input): number
```

The node contains its unsigned flags and seven retained binary32 scalars, widened
to binary64. `0x10276b138` exports these as follows:

| Node field        | Export field        | Evaluator use                                |
| ----------------- | ------------------- | -------------------------------------------- |
| `+0x44`, scalar 0 | `+0x10`             | First response curve input                   |
| `+0x48`, scalar 1 | `+0x18`             | Second response curve input                  |
| `+0x4c`, scalar 2 | `+0x20`             | Third response curve input                   |
| `+0x50`, scalar 3 | `+0x28`             | Not read by this evaluator                   |
| `+0x54`, scalar 4 | `+0x30`             | Direct response multiplier input             |
| `+0x58`, scalar 5 | `+0x38`             | Main and secondary scale                     |
| `+0x5c`, scalar 6 | `+0x40`             | Not read by this evaluator                   |
| flags bit 12      | flags `+0x50` bit 0 | Bypasses main response and random adjustment |

The code rejects nonfinite or unretained scalar doubles. It does not substitute
raw device pressure or rendered width for a retained attribute.

`PostEvaluatorConfig` decodes evaluator-object fields `+0x80` bit 4,
`+0x198`, `+0x624` bit 0, `+0x628`, and response objects at `+0x88/+0x630`.
Each response supplies flags at its `+8`, six float values at `+0xc..+0x20`,
and three optional curve objects at `+0x28/+0x38/+0x48`. A curve contains
binary64 x/y controls at `+0x68` and signed count at `+0x168`.
The array storage occupies 16 points. Supported decoded controls are finite,
in nondecreasing x order, and number 0–16. Other orders/counts are explicitly
rejected rather than treated as a generic curve.

## Arithmetic and order

All following products and subtractions round separately unless marked `FMA`.
Float configuration values are narrowed to binary32 before use. Let `p` be the
path parameter and `s[i]` the retained node scalars.

Response `R(base)` at `0x1024aff24`, called with its random-enable argument zero:

1. With flag `0x10` and a present first curve, multiply by
   `FMA(1-min0, curve0(s[0]), min0)`.
2. With flag `0x20` and a present second curve, multiply by
   `FMA(f32(max1-min1), curve1(s[1]), min1)`. The span subtraction is binary32.
3. With flag `0x40` and a present third curve, multiply by
   `FMA(1-min2, curve2(s[2]), min2)`.
4. With flag `0x100`, multiply by `FMA(1-min4, s[4], min4)`.

Missing curve pointers skip their factors. Present curves of count zero or one
return zero; they are distinct from absent curves. No random generator advances
at this call site.

For the main value, `a=p`. Unless main flags equal exactly 1 or node bit 12 is
set, set `a=R(a)` and, when main flag `0x80` is set, multiply by
`FMA(1-randomMinimum, -0.3, 1)`. Then multiply by `s[5]` and clamp below to 1.

The secondary value starts at zero. When enabled, start it at the configured
secondary base. If secondary flags do not equal exactly 1, apply its response
and multiply the main value by 0.7. Multiply the secondary value by `s[5]`.

When adjustment mode is nonzero, brush flag 4 multiplies the secondary value by
0.7 if enabled, or the main value otherwise. Modes 1/2/3 select 1.5/2.5/3.5;
other unsigned values select zero. Cap this amount above by the main value and
set main to `FMA(amount, -0.25, main)`. Finally return `secondary + main`.
The endpoint caller independently clamps the returned value below to 1.

The response curve uses a line for two controls and one quadratic for three.
For four or more controls, `0x10359de0c` chooses the local quadratic from endpoint
controls and separately rounded adjacent midpoints. It inverts x using
`0x10359b494`, keeping the native root order and roots in `[0,1)`, and returns the
first corresponding fused Bernstein y. If no root qualifies, it extrapolates
the selected endpoints' line. There is no input clamp to `[0,1]`. The near-zero
coefficient/discriminant and nearly vertical line thresholds are `1e-8`.

## Configuration construction and confidence boundary

The path constructor `0x102789680` initially stores a null evaluator at path
`+0x88/+0x90` and parameter zero at `+0x98`. Path virtual `+0x88` calls getter
`0x102789790`; virtual `+0x90` calls parameter setter `0x102789798`.
Virtual `+0x98` returns the evaluator through `0x102789774`. The adjacent setter
`0x1027897a0` resolves a supplied brush configuration through `0x1024cc404` and
stores the result at path `+0x88`; a null input explicitly clears it.
`0x1024cc404` reuses an equivalent cached brush or calls `0x1024c1398` to create
a copied configuration. `0x1024c1714` copies the evaluator fields and response
objects from that brush, including configured curves.

The evaluator constructor `0x1024c0dc0` and response constructor `0x1024af65c`
provide known defaults: response flags zero, null curves, float minima zero,
second-response maximum one, secondary disabled with base one, adjustment mode
two, and brush flags `0x1c600` (bit 4 clear). Therefore its constructor-only
result is `a - .25*min(2.5,a)`, where `a=max(p*s[5],1)`, with the subtraction
implemented by FMA. This is not a constant-one evaluator.

**Constructor defaults are not captured brush settings.** The saved path has a
non-null evaluator and parameter 2.5, but the capture did not recursively retain
its evaluator object. This work reconstructs equations and explicit
configuration; it cannot determine that missing object's exact values. Product
callers must provide an explicit configuration and parameter, label application
choices as such, and must not claim constructor defaults reproduce the captured
brush.

The ordinary parameter caller is now traced: begin `0x1028ebd40` sends its record
`+0x10` to virtual setter `+0x90` at `0x1028ebdc4..dd0`. Its caller
`0x1028889ac` stores the return of `0x1028da414` at `SP+0x620`, the same field
in its `SP+0x610` begin record. It passes setting selector zero. That helper
looks up unit-bearing numeric property **1000**, normalizes its unit with
`0x10339dc98`, converts it to unit zero with `0x1022180a0`, and multiplies by
**0.5**. A missing numeric property returns zero. With a supplied context and
enabled boolean property **1002**, it additionally divides by
`0.01 * 0x102992930(context)`. Otherwise it retains the converted half-size.
The alternate numeric selector reads property 51000 and follows the same math.

Conversion to unit zero is identity when the source unit is zero. For other
units the exact order is `value * resolution / unitsPerInch[unit]`, where
the table starts `[1, 2.54, 25.4, 1, 6, 72, 101.6, 72.28114285714285]`.
This identifies the familiar centimeter/millimeter/inch and typographic ratios.
The caller obtains resolution through `0x102915430`, which reads
`0x1024e8320`/object `+0x100` or defaults to 300. The evidence proves the numeric
unit conversion and half-size; UI names for property 1002 are not inferred.
The separate alternate setup branch at `0x1028892a8..2b0` uses `2 / scale`.

For a Croquis brush diameter already expressed in sheet coordinates, an explicit
unit-zero application profile therefore uses `pathParameter = brushSize / 2`.
Its view-size behavior must be chosen separately; the captured value 2.5 is not
a default. Supporting physical-size settings or native property 1002 semantics
would require supplying their resolved conversion inputs.

`null` still means the native pointer is absent (caller value one). `"unknown"`
still means unresolved configuration, permitted only where existing geometry
proves no evaluator-dependent decision. This module does not collapse them.

## Verification

The standalone oracle executes only extracted pure functions with synthetic
configuration objects and retained node fields. It preserves arithmetic and
control instructions, relocates calls/branches and constant pages, and supplies
a local stack guard. It checks 364 unchanged instruction words and 84 relocated
instructions, including branch targets and constant-page bytes, at FPCR zero.
Every native operation uses the recovered machine instructions; TypeScript
outputs do not feed the oracle.

All 680 native output values match exact binary64 bits: 200 response-curve cases
and 480 configured endpoint cases. Cases cover 0–16 controls, quadratic and line
fallback, extrapolation, scalar factors, response flag combinations, random
adjustment, bypass bit, secondary modes, brush flag 4, and adjustment modes.
Native status flags/NaN payloads are outside scope. Synthetic cases are not a
replay of the missing captured brush configuration.

Fifteen evaluator and endpoint tests pass. Short-stroke checks preserve one
node for a coincident tap and show that varying a retained scale changes a
short-endpoint decision even with amount zero. Existing head/tail order,
unknown-configuration guards and geometry-only fixture proof remain intact.
Strict TypeScript checking passes for the new evaluator and tests.

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/native_oracle.py
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs --test docs/research/clip-studio-paint-stabilization/post-evaluator.test.ts docs/research/clip-studio-paint-stabilization/post-endpoints.test.ts
```

The oracle limits compilation to 60 seconds, symbol reading to 15, and native
execution to 30. It uses a temporary executable and retains source assembly,
driver and output vectors here. No product integration or manual capture is
part of these checks.
