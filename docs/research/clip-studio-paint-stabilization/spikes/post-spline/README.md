# Post-correction geometry foundation

This stage reconstructs the missing ordinary spline arithmetic and the quadratic geometry needed before node removal. It uses the preserved Clip Studio Paint 5.1.4 ARM64 image, SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. It does not start or attach to CSP. No additional hand-drawn input is needed to execute this analysis.

The code is a readable reconstruction of addressed machine instructions, not CELSYS's original source. It is research code outside Croquis's frontend build. The subsequent [complete ordinary post replay](../post-pipeline/README.md) now assembles these functions with source import, associations, removal and endpoints, reproducing the saved 99-to-eight-node output exactly within its stated scope. The remaining-work section below records the boundary of this earlier foundation stage.

## Executable foundation

| File                                                   | Reconstructed behavior                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [post-spline.ts](../../post-spline.ts)                 | Six-point spline evaluation; outer-neighbor adjustment; four-chord length estimate; parameter sampling.                     |
| [post-spline-context.ts](../../post-spline-context.ts) | Neighbor selection, corner boundaries, and the four sampling modes over an explicit node model.                             |
| [post-quadratic.ts](../../post-quadratic.ts)           | Quadratic evaluation, split controls, four-chord estimate, sampled length, and length-selection rule.                       |
| [post-reference.ts](../../post-reference.ts)           | Previously reconstructed settings conversion, scalar bounds, corner predicate, pass schedule, and numeric removal criteria. |
| [binary64.ts](../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts) | Shared correctly fused multiply-add used only at recovered fused instructions. |

Address-by-address derivations are retained in [evaluator-analysis.md](evidence/evaluator-analysis.md), [geometry-helper-analysis.md](evidence/geometry-helper-analysis.md), [context-analysis.md](evidence/context-analysis.md), and [pipeline-analysis.md](evidence/pipeline-analysis.md). The quadratic derivation and fresh extracts are also in `evidence/`. The extraction manifests retain source-image and per-function hashes.

## Exact spline formula

Let the selected and adjusted neighbors be `A, B, C, D, E, F`, where `C` and `D` are the span endpoints. Evaluator `0x10359f580` computes the following mathematical function, independently for x and y:

```text
P(t) = (wA*A + wB*B + wC*C + wD*D + wE*E + wF*F) / 99
```

| Weight | t < 0.5     | t >= 0.5           |
| ------ | ----------- | ------------------ |
| A      | 10t − 14t²  | 4 − 6t + 2t²       |
| B      | −68t + 96t² | −28 + 44t − 16t²   |
| C      | 99 − 164t²  | 164 − 260t + 96t²  |
| D      | 68t + 96t²  | −65 + 328t − 164t² |
| E      | −12t − 16t² | 28 − 124t + 96t²   |
| F      | 2t + 2t²    | −4 + 18t − 14t²    |

These expanded polynomials explain the shape; they are not a substitute for the instruction-ordered implementation. The code preserves which coefficient operations are fused, which products/additions round separately, the coordinate accumulation order, and the final division. In particular, substituting `C` at t=0 or `D` at t=1 can change output bits: multiplication by 99 followed by division by 99 is still executed. There is no parameter clamp inside this evaluator.

The measurement at `0x10359fd24` constructs quarter, half, and three-quarter points with separately rounded arithmetic and returns:

```text
Q1 = (1.625A − 11B + 88.75C + 23D − 4E + 0.625F) / 99
Q2 = (1.5A − 10B + 58C + 58D − 10E + 1.5F) / 99
Q3 = (0.625A − 4B + 23C + 88.75D − 11E + 1.625F) / 99
L  = distance(C,Q1) + distance(Q1,Q2) + distance(Q2,Q3) + distance(Q3,D)
```

The additions in `L` execute left to right. Its endpoints are the direct input points, not `evaluateSpline(0)` and `evaluateSpline(1)`. This is a four-chord estimate, not exact arc length.

Before evaluation, outer-neighbor helper `0x10359f8d4` limits a selected neighbor's distance. For anchor `a`, opposite endpoint `b`, and outer point `p`, calculate `q=|p−a|²` and `r=6.25*|a−b|²`, using fused x² plus separately rounded y². Return unchanged if `q<100` or `q<r`. Otherwise set `p=a+(p−a)*max(10,sqrt(r))/sqrt(q)`, with each final coordinate fused. Equality takes the recomputation branch. The code preserves the native branch/order rather than replacing it with this compact expression.

Sampler `0x1035a01c0` chooses `n=clamp(ARM_signed32_truncate(abs(tEnd−tStart)*L/density),4,255)` and returns n+1 positions. It repeatedly adds `(tEnd−tStart)/n` for the first n samples, then separately evaluates exactly `tEnd`. The ordinary correction caller supplies density 4. The count cap is established here; it must not be copied onto unrelated length routines.

## Context matters

The ordinary span uses two preceding and two following nodes. A corner or absent neighbor causes selected positions to repeat. The adjustment helper is applied in sequence, so later adjustment uses an already adjusted copied point where the instructions do so. The reference accepts explicit previous/next links; constructing those links with CSP's open/closed accessor behavior is a caller responsibility.

The alternate sampling modes support hypothetical geometry around a removed node. Mode 1 advances the end node once, returning a single direct anchor point if no node remains. Modes 2 and 3 force the parameter interval to 0..1. Mode 2 contains a significant asymmetry: one following position is copied from the endpoint itself while traversal and corner tests inspect another node. The reconstruction preserves this behavior. It does not replace these modes with a generic uniform spline routine.

## Source subdivision is required

The saved native correction uses an open quadratic source and ordinary spline output. Preparation `0x102787500` calls `0x10277f8c8` before cloning the source into spline nodes. Each quadratic segment whose measured length exceeds `10*lengthScale` is split at t=0.5, unless the proposed point is within strict distance 0.5 of either endpoint. A successful split causes the shortened segment to be checked again. For the saved input, the threshold is `80.97101964970545` and the largest original chord is about 1080, so this is not an optional step.

The inserted position is evaluated with fused Bernstein arithmetic at `0x10359bc34`. The left/right controls come from separately rounded de Casteljau arithmetic at `0x10359d408`. The latter also returns a split position, but the node caller ignores that position. Using it instead of the Bernstein result can change bits.

Quadratic length first uses a four-chord estimate. If truncating estimate/divisor gives fewer than five intervals, it returns that estimate. The divisor is 0.5 in the high-precision source-preparation call and 4 in the other mode. Only the other mode caps the interval count at 255. Sampled length repeatedly adds its parameter step and does not force an exact final t=1. The research implementation explicitly bounds expensive sample counts; that resource guard is not a recovered CSP behavior.

A bounded [position/control-only subdivision probe](analyze-quadratic-subdivision.ts) applies this preparation to the saved real input. It reconstructs **99 → 304 nodes, with 205 insertions and no rejected splits**. All eight saved native output positions occur bit-exactly at reconstructed indices `[0,32,64,96,160,208,272,303]`. This explains all four output positions absent from the original 99 anchors, with no parameter tuning. The complete points, controls, input hash and comparison are retained in [quadratic-subdivision.json](evidence/quadratic-subdivision.json), with a [scope note](evidence/quadratic-subdivision.md).

The native capture did not record the intermediate subdivision list. Therefore 304 is a reconstructed count, not an independently observed CSP count. Final-position membership supports this stage, but it does not establish which nodes the removal passes select or reproduce the final corrected curve.

## Independent numeric checks

[native_oracle.py](native_oracle.py) extracts eleven bounded pure functions from the fingerprinted image and reassembles them into a small standalone ARM64 program. It verifies all 548 non-relocated instructions byte for byte. It also checks the 48 relocated instructions: branch opcodes/conditions and resolved destinations, constant-load registers/opcodes, and the referenced constant bytes. It then executes under FPCR=0 and retains input and output binary64 bit strings in [native-vectors.json](evidence/native-vectors.json).

The 1,614 cases comprise 1,088 spline/neighbor/measurement/sampling cases and 526 quadratic cases. They cover the t=0.5 boundary and adjacent doubles, endpoints, signed zero, tiny coordinates, finite random scales, neighbor limits, sampling limits, reversed/equal intervals, and quadratic length-selection boundaries. Counts and every returned coordinate or length are compared exactly by the TypeScript tests; there is no numeric tolerance. The retained `.S` and `.c` files describe precisely what was executed.

This is stronger evidence for these isolated arithmetic functions than comparing two manually translated formulas. It does not validate node-graph assembly, source-to-output correspondence, hidden endpoint configuration, all possible floating-point inputs, native floating-point exception flags, rendered pixels, or pen feel. Random cases are finite tests, not an exhaustive proof. The separately retained real CSP before/after capture remains the target for a whole-pass replay.

Recreate the oracle on macOS ARM64 with the original preserved image:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-spline/native_oracle.py --image '/Users/adoll/Applications/CSP Research/original-arm64'
```

The generated fixture can be tested without CSP or an ARM64 host:

```sh
node --test docs/research/clip-studio-paint-stabilization/post-spline.test.ts docs/research/clip-studio-paint-stabilization/post-spline-context.test.ts docs/research/clip-studio-paint-stabilization/post-quadratic.test.ts
```

## Remaining work before a complete post-correction claim

1. Extend the position/control-only subdivision probe with full node-attribute import, then clone the resulting nodes and initialize correspondence to the subdivided source. The pure quadratic arithmetic and bounded geometric subdivision are now available; the complete source-node operation is not.
2. Assemble candidate traversal, source/replacement sampling, nearest-sample distance/parameter decisions, scalar tests, and ordered removal passes. Move all source associations from a deleted output node to its preceding output node. The spline deletion callback is a bare return; list repair and count updates still matter.
3. Implement endpoint processing against independently reconstructed geometry. The saved capture contains a nonnull configurable evaluator pointer but not its object. For this fixture it may be possible to prove the first segment at each end exceeds the 2.5 travel limit, making its unknown values irrelevant. That must be established from predicted pre-endpoint geometry, not assumed from the expected final nodes.
4. Replay the saved 99-to-eight-node case and compare positions, flags, scalar fields, and sampled output shape. Retain intermediate discrepancies. Only a successful comparison supports that complete recorded case.
5. Extend coverage to relevant speed/zoom options, alternate Bézier correction, closed paths, and other device/configuration conditions. Those cases cannot be inferred from one open mouse stroke.

Further tablet input is not a prerequisite for steps 1–4. Request another capture only if a specific unresolved field or branch remains necessary after the offline reconstruction.
