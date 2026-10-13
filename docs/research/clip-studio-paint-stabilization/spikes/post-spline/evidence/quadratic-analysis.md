# Quadratic source subdivision arithmetic

2026-10-11. Static derivation from the pinned CSP 5.1.4 ARM64 image. Fresh
function-body and vtable records are in
[quadratic-extraction.json](quadratic-extraction.json). The initial derivation
was static. Subsequent pure-helper implementation and comparison are recorded
below; the CSP application was not run for this work.

The described domain is finite binary64 inputs and intermediates, default
round-to-nearest/ties-to-even, gradual underflow, and signed integer sample
counts that remain in range. Native exception flags, nonfinite operands and
out-of-range float-to-integer conversion are outside this derivation.
`mul`, `add`, `sub`, and `div` below each round once to binary64; `fma(a,b,c)`
rounds only the exact product-plus-addend. Formulas written as sequences must
not be algebraically reassociated.

## ABI and call graph

| Function      | Inputs                                                                                                                | Result and role                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `0x102764de4` | `x0=quadratic node`, `w1=length quality`, `x2=following node`                                                         | Loads A from node `+8`, Q from `+0x78`, D from following node `+8`; dispatches the length wrapper.                                     |
| `0x10359c378` | `w0=length quality`, `d0/d1=A`, `d2/d3=Q`, `d4/d5=D`                                                                  | Sets curve kind to zero, copies Q into both generic control positions, moves D to `d6/d7`, and branches to `0x10359c394`.              |
| `0x10359c394` | `w0=curve kind` (zero quadratic; nonzero cubic), `w1=length quality`, `d0..d7=A,B,C,D` as four x/y pairs              | Returns a selected polyline length in `d0`. Quadratic uses B as its control and ignores C.                                             |
| `0x10359c490` | `w0=curve kind`, `d0..d7=A,B,C,D`                                                                                     | Returns the four-chord quarter-sample estimate in `d0`.                                                                                |
| `0x10359c60c` | `w0=curve kind`, `w1=segment count`, `d0..d7=A,B,C,D`                                                                 | Returns the accumulated sampled length in `d0`.                                                                                        |
| `0x102193618` | `x0=first 16-byte point`, `x1=second point`                                                                           | Returns the binary64 distance in `d0`.                                                                                                 |
| `0x102764db4` | `x0=quadratic node`, `x1=following node`, `d0=t`                                                                      | Loads A/Q/D, moves t to `d6`, and branches to the point evaluator.                                                                     |
| `0x10359bc34` | `d0/d1=A`, `d2/d3=Q`, `d4/d5=D`, `d6=t`                                                                               | Returns evaluated x/y in `d0/d1`.                                                                                                      |
| `0x10359d408` | `d0/d1=A`, `d2/d3=Q`, `d4/d5=D`, `d6=t`; `x0=left-control output`, `x1=split-point output`, `x2=right-control output` | Writes three 16-byte points using separately rounded multiply/add operations.                                                          |
| `0x102765694` | `x0=original anchor`, `x1=inserted node`, `x2=old following node`, `d0=t`                                             | Uses the split helper to replace the original control and set the inserted node's control. It ignores the helper's split-point output. |

Vtable slots are verified from the original bytes: quadratic `+0x68` is
`0x102764db4`, `+0x78` is `0x102764de4`, and `+0x108` is `0x102765694`.
The coordinate evaluator reads the stored quadratic control directly.

## Distance

[0x102193618](quadratic-102193618.asm) computes:

```text
dx = sub(second.x, first.x)
dy = sub(second.y, first.y)
y2 = mul(dy, dy)
squared = fma(dx, dx, y2)
root = sqrt(squared)
return squared != 0 ? root : +0
```

The separate `dy*dy` and fused `dx*dx + y2` are required. The assembly executes
the square root before choosing the explicit positive-zero result.

## Four-chord estimate: 0x10359c490

The helper evaluates positions at `t=1/4`, `1/2`, and `3/4`. In quadratic
mode, for each coordinate independently:

```text
q25 = fma(D, 0.0625, fma(A, 0.5625, mul(B, 0.375)))
q50 = fma(D, 0.25,   fma(A, 0.25,   mul(B, 0.5)))
q75 = fma(D, 0.5625, fma(A, 0.0625, mul(B, 0.375)))
```

In cubic mode the corresponding sequences are:

```text
q25 = fma(D, 0.015625, fma(C, 0.140625, fma(A, 0.421875, mul(B, 0.421875))))
q50 = fma(D, 0.125,    fma(C, 0.375,    fma(A, 0.125,    mul(B, 0.375))))
q75 = fma(D, 0.421875, fma(C, 0.421875, fma(A, 0.015625, mul(B, 0.140625))))
```

The return value adds four distances in this exact order:

```text
sum = distance(A, q25)
sum = add(sum, distance(q25, q50))
sum = add(sum, distance(q50, q75))
return add(sum, distance(q75, D))
```

The actual body computes both sets of quarter positions before selecting by
curve kind. Only the quadratic result matters to the captured source type;
the above cubic formulas document the shared function without asserting
complete cubic-path support.

## Length selection: 0x10359c394

[The selector](quadratic-10359c394.asm) first obtains that four-chord estimate.
Then:

```text
density = lengthQuality == 0 ? 4 : 0.5
n = truncateTowardZeroToSigned32(div(estimate, density))
if n < 5:
    return estimate
if lengthQuality == 0:
    n = min(n, 255)
return sampledLength(curveKind, n, A, B, C, D)
```

There is **no 255 cap when lengthQuality is nonzero**. Source subdivision
calls with quality `1`, whereas the endpoint walk calls with quality `0`.
The threshold at `n=5`, rather than a minimum forced sample count, matters.

## Sampled length: 0x10359c60c

[The loop](quadratic-10359c60c.asm) returns positive zero if `n<1`. Otherwise
it sets `step=1/n`, `t=step`, `previous=A`, and `sum=+0`. It performs exactly
n iterations, each computing the selected curve point, adding its distance
from `previous`, copying it into `previous`, and doing `t=add(step,t)`.

It **does not force the final parameter to exactly 1**. Unlike the spline
replacement-sample routine, the final point comes from the accumulated
parameter. Do not replace it with `i/n` or a separately appended exact D.

For quadratic mode each iteration computes:

```text
u = sub(1, t)
aa = mul(u, u)
bb = mul(t, add(u, u))
dd = mul(t, t)
point = fma(dd, D, fma(aa, A, mul(B, bb)))
```

Each coordinate uses the same scalar weights. The cubic portion computes:

```text
aaa = mul(u, aa)
threeU = mul(u, 3)
bbb = mul(t, mul(u, threeU))
ccc = mul(t, mul(t, threeU))
ddd = mul(t, dd)
point = fma(ddd, D, fma(ccc, C, fma(aaa, A, mul(B, bbb))))
```

Both arithmetic paths execute before the selector. Accumulation is
`sum=add(sum,distance(previous,point))` in traversal order.

## Quadratic point evaluator: 0x10359bc34

[The standalone evaluator](quadratic-10359bc34.asm) has the same quadratic
arithmetic pattern, with `bb=mul(add(u,u),t)` rather than reversing the
multiply operands:

```text
u = sub(1, t)
aa = mul(u, u)
bb = mul(add(u, u), t)
dd = mul(t, t)
point.x = fma(dd, D.x, fma(aa, A.x, mul(Q.x, bb)))
point.y = fma(dd, D.y, fma(aa, A.y, mul(Q.y, bb)))
```

This routine supplies the inserted node's position through `0x10276b714`.
At `t=0.5`, the weights are exactly `0.25`, `0.5`, `0.25`, but the successive
FMA rounding is still significant.

## Control split: 0x10359d408

[The split helper](quadratic-10359d408.asm) uses de Casteljau construction
with no fused instructions, independently for x and y:

```text
u = sub(1, t)
left = add(mul(Q, t), mul(A, u))
right = add(mul(D, t), mul(Q, u))
split = add(mul(right, t), mul(left, u))
```

It stores `left` at `x0`, `right` at `x2`, then reloads the first output to
calculate `split` at `x1`. The observed caller provides three distinct stack
outputs. Its algorithm is not specified for arbitrary overlapping outputs.

[0x102765694](quadratic-102765694.asm) takes only `left` and `right`: it writes
left to the original node's stored control at `+0x78`, then calls the new
node's control setter with right. **The helper's split position is ignored.**
The inserted node's position already came from the fused Bernstein evaluator
through `0x10276b714`. Reusing the de Casteljau split point as the inserted
position would change rounding and is not the observed implementation.

## Attribute interpolation and midpoint acceptance

[0x10276b714](quadratic-10276b714.asm) returns a temporary record containing
the point and interpolated scalar values. For the fixture's zero node flags,
each of the fields `+0x44`, `+0x48`, `+0x4c`, `+0x54`, `+0x58`, and `+0x5c`
is widened from binary32, interpolated as
`fma(previous, sub(1,t), mul(next,t))`, and later narrowed to binary32 by
[0x10276b190](quadratic-10276b190.asm). `+0x50` takes a separate interpolation
helper if either endpoint is nonzero; it remains zero for this fixture.
Node flag cases can invoke the path's scalar callback and change those
semantics, so the zero-flag scope must remain explicit.

[0x10276dec8](quadratic-10276dec8.asm) checks endpoint separation before
inserting. Its second floating argument is a minimum separation, here `0.5`.
It enables the check only above constant `1e-8` (file address `0x1042e3690`,
raw little-endian bytes `3a8c30e28e79453e`). It computes squared distance
to the following endpoint first, then to the original anchor, using
`fma(dx,dx,mul(dy,dy))`. Strictly smaller than minimum separation squared
rejects the split; equality permits it.

## What is now concrete, and what remains

These extracts establish the arithmetic necessary for quadratic length,
midpoint location, and split controls. They also expose the important
unbounded-by-255 subdivision length mode and the two distinct midpoint
rounding paths.

[post-quadratic.ts](../../../post-quadratic.ts) now implements those five
pure operations. All 526 quadratic cases in the 1,614-case separately assembled
native instruction oracle match every binary64 output bit: 150 evaluations, 150
splits, 150 measurements, 30 sampled lengths, and 46 complete length selections.
The native fixture is [native-vectors.json](native-vectors.json); this tests
only the quadratic branch of the generic helpers, with FPCR=0.
[quadratic-tests-after.txt](quadratic-tests-after.txt) records all nine test
groups passing. Strict TypeScript checking also passed. Sample counts above
100,000 throw as an explicit research work bound, distinct from native behavior.

The [position/control subdivision probe](quadratic-subdivision.md) now
reconstructs the insertion loop for the saved open quadratic input. Complete
selected attribute-import semantics and source/output associations are still
unimplemented. The existing native fixture constrains only original input
and final output; it does not independently reveal the intermediate subdivision
count or nodes. No new manual stroke is required for this remaining offline work.
