# Six-point evaluator at 0x10359f580

This is an instruction-order reconstruction of the 460-byte leaf function in
`10359f580.asm`. `extraction.json` pins its boundaries and code hash to image
SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
`evaluator-constants.json` records the extracted constant bytes and decoded values.
No external function is called, and no input or output is clamped.

## Input and output ordering

| Value | Entry location |
| --- | --- |
| P0.x, P0.y | d0, d1 |
| P1.x, P1.y | d2, d3 |
| P2.x, P2.y | d4, d5 |
| P3.x, P3.y | d6, d7 |
| P4.x, P4.y | [sp], [sp+8] |
| P5.x, P5.y | [sp+0x10], [sp+0x18] |
| t | [sp+0x20] |

The function returns x in d0 and y in d1. It builds its accumulation vectors in
the order `[y,x]`; the last `mov d0,v1[1]` restores the returned x/y order.
The caller at 0x102788a1c loads neighboring points into P0/P1/P4/P5 and the two
segment endpoints into P2/P3, then stores the scalar t at sp+0x20 before calling
0x10359f580 at 0x102788a74. Its return is forwarded without modification.

## Exact arithmetic pseudocode

`mul`, `add`, and `div` below each perform one binary64 rounding. `fma(a,b,c)`
performs one rounding of the exact product-plus-addend. This ordering assumes
round-to-nearest/ties-to-even and gradual underflow; NaN payloads and exception
flags are outside the portable reference. Do not merge separate operations.

```text
if t < 0.5:
    w0 = mul(fma(-14, t, 10), t)
    w1 = mul(fma(96, t, -68), t)
    w2 = fma(mul(t, -164), t, 99)
    w3 = mul(fma(t, 96, 68), t)
    w4 = mul(fma(t, -16, -12), t)
    w5 = mul(fma(t, 2, 2), t)
else:
    w0 = add(fma(t, mul(2, t), mul(-6, t)), 4)
    w1 = add(fma(t, mul(-16, t), mul(44, t)), -28)
    r96 = mul(t, 96)
    w2 = add(fma(r96, t, mul(t, -260)), 164)
    w3 = add(fma(mul(t, -164), t, mul(t, 328)), -65)
    w4 = add(fma(r96, t, mul(t, -124)), 28)
    w5 = add(fma(mul(t, -14), t, mul(t, 18)), -4)

x = add(mul(P1.x, w1), mul(P0.x, w0))
y = add(mul(P0.y, w0), mul(P1.y, w1))
for i in [2, 3, 4, 5]:
    x = add(mul(Pi.x, wi), x)
    y = add(mul(Pi.y, wi), y)
return (div(x, 99), div(y, 99))
```

The split is `FCMP t,0.5; B.PL right`, at 0x10359f594..598. Thus exactly 0.5
uses the right branch. An unordered comparison also takes the right branch.
Finite t outside [0,1] is evaluated with the same branch formulas; there is no
range check or implicit endpoint replacement in this function.

The fractional weight pair is vector FMLA at 0x10359f5ac or 0x10359f6c0.
The other fused coefficient instructions are at 0x10359f5c4, 5d8, 5e8, 634,
670, 698, 6b4, and 71c. Every multiplication by a point coordinate and every
addition of a weighted point is separate. The final denominator 99 is assembled
as bits `0x4058c00000000000`, then used by vector FDIV at 0x10359f740.

## Algebraic interpretation and its limits

Ignoring floating-point rounding, the two branches have these numerator weights:

| Point | t < 0.5 | t >= 0.5 |
| --- | --- | --- |
| P0 | 10t - 14t² | 4 - 6t + 2t² |
| P1 | -68t + 96t² | -28 + 44t - 16t² |
| P2 | 99 - 164t² | 164 - 260t + 96t² |
| P3 | 68t + 96t² | -65 + 328t - 164t² |
| P4 | -12t - 16t² | 28 - 124t + 96t² |
| P5 | 2t + 2t² | -4 + 18t - 14t² |

Their sum is 99 in exact arithmetic. Values and first derivatives agree at 0.5;
the second derivatives differ. This establishes a piecewise quadratic evaluator
with matching first derivatives, without assuming a named spline family.

The algebraic endpoints are P2 at t=0 and P3 at t=1. They are **not** guaranteed
bit-identical to the input point: multiplying a coordinate by 99 and dividing the
rounded product by 99 can alter its last bit. Do not replace those evaluations
with direct endpoint copies when reproducing this routine.

At t=.25, .5, and .75, the weights are respectively
`[1.625,-11,88.75,23,-4,.625]`, `[1.5,-10,58,58,-10,1.5]`, and the reversed
first sequence, all divided by 99. These exactly representable coefficient
vectors agree with the separate length approximation in 0x10359fd24. That
routine uses direct P2/P3 endpoints and its own explicit accumulation order;
it does not call this evaluator.

This document recovers the function, its ABI, and constants statically. It does
not claim end-to-end post-correction behavior or equality to a rendered stroke.
