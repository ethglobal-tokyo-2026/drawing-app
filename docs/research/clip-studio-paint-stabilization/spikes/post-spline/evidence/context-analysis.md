# Six-point node contexts and dispatch

Static reconstruction from the pinned ARM64 image with SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
The four addressed assembly files are listed in `extraction.json`. This analysis
does not establish the entire correction pass or identical pen behavior.
The two traversal bodies are retained in `context-link-helpers.asm`, with code
hashes in `context-link-extraction.json`.

## Node fields and traversal

`position(node)` copies two doubles at node+0x08. `corner(node)` tests bit 0
of the byte at node+0x40. Other flag bits do not affect these routines.
`adjust(anchor, opposite, candidate)` means the adjustment documented in
`geometry-analysis.md`, operating on a copy of candidate. Source nodes are not
modified. A and B precede the segment endpoints C and D; E and F follow them.

The native traversal accessors include an owner fallback, so a missing direct
link does not necessarily mean the end of the path:

```text
next(node):                         // 0x10276af80, 44 bytes
    if pointer(node+0x28) != null: return pointer(node+0x28)
    owner = pointer(node+0x38)
    if byte(owner+0x21) & 1: return pointer(owner+0x30)
    return null

previous(node):                     // 0x10276afd8, 44 bytes
    if pointer(node+0x30) != null: return pointer(node+0x30)
    owner = pointer(node+0x38)
    if byte(owner+0x21) & 1: return pointer(owner+0x38)
    return null
```

These accessors assume nonnull node and valid owner when following the fallback.
An object-model port must resolve that fallback into its previous/next links;
mapping only the direct native pointers loses closed-path behavior. Traversal
here is bounded to three links and does not require an acyclic graph.

## Ordinary context: `0x1027888dc`

ABI: x0=Cnode, x1=Dnode, x2=A output, x3=B output, x4=E output,
x5=F output. C and D positions are copied to the stack. The result is the four
output points; no scalar return is consumed.

```text
C = position(Cnode)
D = position(Dnode)
p = previous(Cnode)
if p == null or corner(Cnode):
    B = C; A = C
else:
    B = adjust(C, D, position(p))
    pp = previous(p)
    if pp == null or corner(p): A = B
    else: A = adjust(B, C, position(pp))

n = next(Dnode)
if n == null or corner(Dnode):
    E = D; F = D
else:
    E = adjust(D, C, position(n))
    nn = next(n)
    if nn == null or corner(n): F = E
    else: F = adjust(E, D, position(nn))
```

The second adjustment uses the already adjusted B or E, while traversal and
corner checks use the original node. Adjustment call sites are 0x102788944,
0x102788970, 0x1027889b8, and 0x1027889e4.

## Mode 2: `0x102789248`

ABI: x0=Cnode, x1=Dnode, x2=output array, d0=density. The left side skips
the immediate previous node, without checking that skipped node's corner bit:

```text
C = position(Cnode)
D = position(Dnode)
p1 = previous(Cnode)
p2 = p1 == null ? null : previous(p1)
if p2 == null or corner(Cnode):
    B = C; A = C
else:
    B = adjust(C, D, position(p2))
    p3 = previous(p2)
    if p3 == null or corner(p2): A = B
    else: A = adjust(B, C, position(p3))

n1 = next(Dnode)
if n1 == null or corner(n1):
    E = D; F = D
else:
    E = adjust(D, C, D)
    n2 = next(n1)
    if n2 == null or corner(n1): F = E
    else: F = adjust(E, D, position(n2))

return sample(A, B, C, D, E, F, density, 0, 1)
```

The right side is asymmetric. At 0x102789300, E is loaded from Dnode at
x20+0x08, not from n1. Its adjustment therefore returns D unchanged for finite
coordinates. F can come from next(next(Dnode)), but its adjustment sees both
anchor and opposite equal to D, giving a limit radius of 10. The corner checked
is n1 at 0x1027892f8 and again at 0x102789324, not Dnode. The repeated check is
preserved above even though the inputs are not modified by these helpers.

The left corner checks are on Cnode at 0x102789288 and p2 at 0x1027892b8.
The wrapper writes literal tStart=0 and tEnd=1 at 0x102789374..0x102789378.

## Mode 3: `0x1027893b0`

ABI is the same as mode 2. Its left side is identical to the ordinary context.
Its right side skips the immediate next node, without checking that skipped
node's corner bit:

```text
(A, B) = ordinary left context for Cnode and Dnode
C = position(Cnode)
D = position(Dnode)
n1 = next(Dnode)
n2 = n1 == null ? null : next(n1)
if n2 == null or corner(Dnode):
    E = D; F = D
else:
    E = adjust(D, C, position(n2))
    n3 = next(n2)
    if n3 == null or corner(n2): F = E
    else: F = adjust(E, D, position(n3))

return sample(A, B, C, D, E, F, density, 0, 1)
```

The two initial next calls are 0x102789454 and 0x10278945c. The corner checks
are on Dnode at 0x102789464 and selected n2 at 0x102789494. E is copied from
n2 at 0x102789470, unlike mode 2. The wrapper writes literal tStart=0 and
tEnd=1 at 0x1027894e0..0x1027894e4.

## Dispatch: `0x102789114`

ABI: x0=Cnode, x1=Dnode, w2=mode, x4=output array, x5=integer result-flag
pointer, d0=density, d1=tStart, d2=tEnd. x3 is unused by this body.

```text
*resultFlag = 1
if mode == 2: return sampleMode2(Cnode, Dnode, density, output)
if mode == 3: return sampleMode3(Cnode, Dnode, density, output)
if mode == 1:
    Dnode = next(Dnode)
    if Dnode == null:
        output[0] = position(Cnode)
        return 1
(A, B, E, F) = ordinaryContext(Cnode, Dnode)
return sample(A, B, position(Cnode), position(Dnode), E, F,
              density, tStart, tEnd)
```

All other mode integers use ordinary context. Mode 1 advances Dnode, leaving
Cnode unchanged, before building the context. Its null-result branch copies C
directly without evaluator rounding and ignores density and parameter range.
The result flag is set to 1 on every path and is distinct from the returned
point count in w0. No branch sets the flag to zero.

Ordinary dispatch and mode 1 pass the provided tStart and tEnd unchanged;
neither this body nor the sampler clamps, sorts, or rejects the interval.
Modes 2 and 3 ignore that interval and sample [0,1]. Valid source nodes and
stable topology are assumed. Reconstructing the surrounding ownership,
allocation, simplification, and mutation rules remains separate work.

## Reference implementation and verification

`../../../post-spline-context.ts` exposes `buildSplineContext` and
`sampleSplineNodes`. Its links represent the resolved native accessor results,
so closed paths need explicitly connected links. `buildSplineContext` returns
null only for mode 1's missing advanced endpoint; the sampling wrapper then
returns the direct anchor copy. Native w0 corresponds to the array length. The
constant native result flag is not modeled as a separate mutable output.

`../../../post-spline-context.test.ts` contains 14 host tests with literal,
assembly-derived expectations for point ordering, flag checks, selected and
skipped neighbors, source immutability, adjusted-copy reuse, mode-2 duplication,
mode-1 fallback, resolved cycles, and parameter ranges. The saved
`context-tests-before.txt` records all 14 failing before implementation. All 14
passed afterward; the top-level research test command passed 67 tests. The
context tests have not yet been compared against native context dispatch.
