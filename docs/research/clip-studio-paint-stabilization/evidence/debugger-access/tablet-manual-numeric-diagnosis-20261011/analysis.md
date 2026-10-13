# Fractional averaging differences in the two manual tablet captures

The six distinct output differences are explained by fused multiply-add rounding in the fractional history contribution. The existing TypeScript reference explicitly documents that it evaluates multiplication and addition separately. No input units, queue sequencing, window formula, or pressure interpretation had to change to explain these differences.

The disassembly in `evidence/live/digitizer-averaging.asm` shows:

```text
0x102136ffc  fmla.2d v1, v4, v0[0]   // x and y: sum + older * fraction
0x102137004  fmadd   d2, d4, d0, d2  // pressure: sum + older * fraction
0x102137008  fadd    d3, d0, d3      // whole + fraction
0x102137010  fdiv    d0, d0, d3      // reciprocal, with numerator 1
0x102137014  fmul.2d v1, v1, v0[0]   // normalize x and y
0x10213701c  fmul    d0, d2, d0      // normalize pressure
```

The two fused instructions round `sum + older * fraction` once to binary64. The expression `sum += older * fraction` in `live-reference.ts::averageFractionalHistory` rounds the multiplication and addition separately. Normalization remains a separate multiplication by the rounded reciprocal. The integer sample accumulation order is unchanged.

`check_fractional_fma.py` reconstructs the fixed window from its initial state and independently verifies every resulting window against the capture. It builds history from the initial raw sample bytes and incoming register bytes, preserving newest-first addition order and the existing old-sample repetition rule. It evaluates two alternatives that differ only in fractional multiply-add fusion, using Python `math.fma` for single-rounding binary64 arithmetic. It checks both queue output fields and the separately captured output fields. Both captures have positive incoming pressure throughout the included segment, fixed S20, speed adjustment off, FPCR zero, and no ending phase.

| Capture | Recorded ingestion pairs | Distinct unfused output differences | Fused output differences |
| --- | ---: | ---: | ---: |
| `tablet-manual-20261011T171306.937948Z-8cdfbb39` | 398 | 2 | 0 |
| `tablet-manual-20261011T171422.944399Z-33211c35` | 327 | 4 | 0 |

The original diagnostic reported 8 and 14 differing rows because a differing output also appears in its queue exit and subsequent stored state. The unique initiating outputs are:

| Capture start | Call | Field | Window | Native output bits |
| --- | ---: | --- | ---: | --- |
| 17:13:06 | 48 | pressure | 13.262190625 | `0x3fc9c05b83e822ec` |
| 17:13:06 | 83 | x | 19.714878434348968 | `0xc098040a0533b227` |
| 17:14:22 | 68 | pressure | 12.8549375 | `0x3fd5d5d5e0000001` |
| 17:14:22 | 77 | pressure | 15.86657916720495 | `0x3fd626d313dbc3f5` |
| 17:14:22 | 79 | pressure | 16.367087698402468 | `0x3fd64b9aa4241afe` |
| 17:14:22 | 95 | y | 18.960931742542094 | `0x4076946a6f525bd5` |

The saved report includes source hashes and the exact FMA operands for these six cases. These are useful regression vectors for an eventual arithmetic correction.

Candidate correction: use a correctly rounded binary64 fused multiply-add for the fractional x, y, and pressure contributions, retaining separate reciprocal normalization and ordinary integer-sample addition. JavaScript's `Math.fround` is binary32 and is not a substitute. An implementation must account for the other fused instructions already identified elsewhere in the reference before claiming general bit-for-bit equivalence. This investigation changes neither shared implementation nor comparison tolerances.

Both raw captures remain incomplete. The latest contains 327 raw entry/exit pairs, but the deadline interrupts bookkeeping after the last raw exit, leaving 326 included pairs confirmed by the recorder contract. This diagnosis deliberately compares the available raw arithmetic and does not upgrade that capture's completeness. It establishes neither physical pen release nor source-handler completion, post correction, speed modes, or identical pen feel. It does not explain or repair recorder latency.

Reproduce from the repository root with Python supporting `math.fma`:

```sh
python3 docs/research/clip-studio-paint-stabilization/evidence/debugger-access/tablet-manual-numeric-diagnosis-20261011/check_fractional_fma.py
```
