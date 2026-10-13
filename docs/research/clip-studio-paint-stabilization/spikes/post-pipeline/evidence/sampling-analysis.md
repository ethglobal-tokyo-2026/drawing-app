# Correction sampling and adjacent-segment projection

This reconstruction targets CSP 5.1.4 ARM64, image SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
[sampling-extraction.json](sampling-extraction.json) records original function
boundaries, byte hashes, assembly hashes, and the quadratic virtual-table entry.
The implementation is [post-sampling.ts](../../../post-sampling.ts).

## Source sampling dispatch

`0x10276ca3c` takes node `x0`, output array `x1`, caller flag `x2`, density `d0`.
It selects node `+0x28`, or the path head `path+0x30` when path flag `+0x21` bit
zero permits that fallback. With no following node it directly copies node
position `+8` and returns one sample. Otherwise it dispatches virtual `+0xf8`,
passing `w2=0`, `d1=0`, `d2=1`, output in `x4`, and status storage in `x5`.
The caller flag is passed through `x3`.

Quadratic table `0x104a527b0` slot `+0xf8` is `0x1027653d4`. Because `w2=0`,
this wrapper uses the stored control at node `+0x78` and the following position
at `+8`; its alternate merged-control branch is not used by this dispatch.
It calls `0x10359c7f0`, whose arguments are output pointer `x0`, A/Q/D coordinates
in `d0..d5`, density `d6`, start `d7`, end on the stack. The latter dispatches
quadratic kind zero to generic sampler `0x10359c838`.

For four-chord `measureQuadratic(points)`, the interval count is:

```text
n = clamp(FCVTZS_int32(abs(end - start) * measure / density), 4, 255)
step = (end - start) / unsignedDouble(n)
t = start
repeat n times: emit evaluateQuadratic(points,t); t = step + t
emit evaluateQuadratic(points,end)
return n+1
```

The measure and evaluator retain their recovered fused operation order. The
sampler does not clamp parameter ranges; reversed and extrapolated ranges are
accepted. Zero density follows ARM conversion: positive infinity saturates to
signed-int maximum, while NaN converts to zero before the 4–255 bounds. This
bounded sampler is separate from the higher-precision quadratic length loop.

## Nearest sampled vertex and adjacent segments

`0x10359b3b4` and `0x10359b240` receive sample pointer `x0`, signed count `w1`,
and query pointer `x2`. The parameter helper additionally receives projected
point storage `x3`; both return their scalar in `d0`.

Both loops begin with nearest index zero and best squared distance `DBL_MAX`.
For each vertex, `dx=vertex.x-query.x`, `dy=vertex.y-query.y`, and
`square=fma(dx,dx,dy*dy)`. Only strict ordered improvements replace the index.
Only that vertex's following and preceding segments are subsequently tested.
This can differ from the globally nearest polyline segment.

The distance helper calls `0x102193940`, with A/B/query coordinates in `d0..d5`:

```text
v = B-A; p = query-A
dot = fma(v.x,p.x,v.y*p.y)
if dot <= 0: return distance(query,A)
lengthSquared = fma(v.x,v.x,v.y*v.y)
if dot >= lengthSquared: return distance(query,B)
cross = fma(p.y,v.x,-(p.x*v.y))
return (cross < 0 ? -cross : cross) / sqrt(lengthSquared)
```

The interior uses separate FNMUL, then FMADD/FNMADD. Endpoint distances return
positive zero when their squared distance equals zero. Following is evaluated
first; preceding replaces it only for a strict improvement. Zero or one sample
returns `DBL_MAX`, not distance to the sole point.

The parameter helper calls `0x1021944a8`. It uses the same dot tests to select
fraction zero and A, fraction one and B, or fraction `dot/lengthSquared` and
projected position `B*fraction + A*(1-fraction)`. Those interpolation products
and additions round separately. Projected squared distance determines the
winning adjacent segment, with following retained on exact ties. The returned
parameter is `reciprocal * (fraction + segmentIndex)`, where the reciprocal is
computed first as `1/(count-1)`. Only an upper clamp to one follows. Count one
returns positive zero. Native count zero reads sample zero without checking;
the TypeScript API explicitly throws for this unsupported empty input.

## Independent numeric verification

[sampling_native_oracle.py](../sampling_native_oracle.py) reconstructs eight
pure function bodies into a standalone ARM64 executable. It checks original
image and extraction hashes, 414 unchanged instructions, and 35 relocated
branch opcode/register/condition/destination combinations. There are no
constant-load relocations in these bodies. The C driver preserves the recovered
scalar/register/stack ABIs and reports FPCR=0. Compilation and execution have
timeouts. CSP is neither launched nor attached.

[sampling-native-vectors.json](sampling-native-vectors.json) contains 717
deterministic cases: 312 distance, 311 parameter, and 94 quadratic sampling
cases. Tests compare every
output bit, including signed zero and every emitted point. Cases cover local
versus global projection, exact nearest/projection ties, endpoints, degenerate
segments, count one, distance count zero, random coordinate scales, subnormal
values, minimum/maximum intervals, zero/negative density, and reversed/equal/
extrapolated parameter ranges.

The manually designed first projection-tie example was not an exact tie after
rounded interpolation and was corrected to exactly representable quarter
fractions. The implementation was unchanged; both geometries followed native
results. [sampling-tests-before.txt](sampling-tests-before.txt) records the
initial failing stub tests; [sampling-tests-after.txt](sampling-tests-after.txt)
records the passing implementation checks.

Scope: finite coordinates and finite geometry intermediates, with the documented
nonfinite count conversion for zero density. NaN payloads, status flags,
arbitrary native memory, node dispatch with other curve kinds, and whole
post-correction equivalence are not established by this pure-function oracle.
