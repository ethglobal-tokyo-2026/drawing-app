# Outer-neighbor adjustment and six-point length measure

Static reconstruction from the pinned ARM64 image with SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
Both assembly files match their hashes in `extraction.json`. This analysis did
not execute CSP or compare these routines against a native oracle.

## Outer-neighbor adjustment: `0x10359f8d4`

Arguments are pointers to two-double points: `A = *x0`, `B = *x1`, and
modifiable `C = *x2`. With separately rounded subtractions and products:

```text
ux = C.x - A.x
uy = C.y - A.y
q = fma(ux, ux, uy * uy)
if q < 100: return without writing

vx = A.x - B.x
vy = A.y - B.y
r = 6.25 * fma(vx, vx, vy * vy)
if q < r: return without writing

rootR = sqrt(r)
radius = r > 100 ? rootR : 10
scale = radius / sqrt(q)
C.x = fma(ux, scale, A.x)
C.y = fma(uy, scale, A.y)
```

The four FMADD sites are `0x10359f8e8`, `0x10359f90c`, `0x10359f93c`,
and `0x10359f940`. The multiplication by 6.25 is separate. Computing
`2.5 * distance(A, B)` instead changes its rounding sequence.

For finite intermediates this limits an overly distant outer neighbor to a
radius of at least 10, or approximately 2.5 times the adjacent distance.
Both early returns use strict comparisons: equality reaches the recomputation
and store. There is no epsilon test; an accepted path has `q >= 100`, so its
denominator is at least 10. Degenerate `A == B` selects radius 10.

The observable result is the optional in-place write to C. The body leaves x0
holding A, but the inspected callers ignore it; this does not establish the
original source-language return type. Nonfinite intermediates and alternate
floating-point modes are outside this description.

## Six-point measure: `0x10359fd24`

Six points A through F arrive as A=(d0,d1), B=(d2,d3), C=(d4,d5),
D=(d6,d7), E=(incoming sp+0,sp+8), F=(incoming sp+16,sp+24).
The double result is returned in d0.

For each coordinate independently, construct these three points. Every
multiplication, addition, subtraction, and division rounds separately; no
coordinate accumulation uses FMA. The parentheses give the accumulation order.

```text
Q1 = (((((A*1.625 - B*11) + C*88.75) + D*23) - E*4) + F*0.625) / 99
Q2 = (((((A*1.5   - B*10) + C*58)    + D*58) - E*10) + F*1.5)  / 99
Q3 = (((((A*0.625 - B*4)  + C*23)    + D*88.75) - E*11) + F*1.625) / 99
```

The decoded immediate constants are `0x4056300000000000 = 88.75`,
`0x404d000000000000 = 58`, and `0x4058c00000000000 = 99`.
These are the six-point evaluator's coefficients at t=0.25, 0.5, and 0.75.
The measure nevertheless uses C and D directly for its two endpoints, rather
than evaluating t=0 and t=1; the latter can introduce additional rounding.

```text
length = distance(C, Q1)
length = length + distance(Q1, Q2)
length = length + distance(Q2, Q3)
length = length + distance(Q3, D)
return length
```

Each distance calls `0x102193618`: subtract second minus first coordinate,
form `squared = fma(dx, dx, dy * dy)`, then return +0 when squared equals zero,
otherwise its square root. The three length additions are left-to-right.
There is no tolerance or near-zero threshold.

This is a four-chord length estimate through the evaluator's quarter samples,
not an exact integral. Outer neighbors can cause overshoot. For example,
A=(99,0) and all other points=(0,0) produce Q1=(1.625,0), Q2=(1.5,0),
Q3=(0.625,0), and length=3.25 even though C equals D.

The caller `0x1035a01c0` uses this measure, multiplied by the absolute parameter
interval and divided by its spacing argument, before signed integer truncation
and a segment-count clamp to [4,255]. This use supports the length-estimate
interpretation; it does not establish identical natural pen behavior.
