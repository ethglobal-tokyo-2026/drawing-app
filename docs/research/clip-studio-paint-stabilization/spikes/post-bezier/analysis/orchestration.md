# Bézier branch orchestration and anchor adjustment

Static analysis performed October 11, 2026 against the pinned CSP 5.1.4 ARM64 image. Function and literal hashes are retained in `../evidence/extraction.json` and `../evidence/literals.json`. These findings have not been validated by executing this branch or comparing a Bézier-on stroke.

## Dispatch and settings

The shared wrapper `0x1028ed064` selects `PWVectorSampleBezier` when `w4 != 0`. The UI mapping of setting `0x482` to “Bezier curve” / “ベジェ曲線” is already established in `../../post-capture-contract/README.md`.

At `0x1028ed0a0..0x1028ed0bc`, the wrapper multiplies the converted positional tolerance `T` by the stored binary64 constant `0.1` (`3fb999999999999a`) and calls `0x102785e94`. Define `r = T * 0.1`, preserving this separate multiplication. The Bézier callee receives the speed flag in `w2`, the unresolved closure/mode argument in `w3`, and length scale in `d1`. Strength is consumed through the settings-derived tolerance; it is not passed as a separate Bézier removal-pass count.

`0x102785e94` requires source path type bit `0x20`; otherwise it returns null. It stores output/source pointers at state `+0x8/+0x10`, `r` at `+0x18`, speed flag at `+0x20`, mode at `+0x24`, and scale at `+0x28`. It creates an output path with the source flags, adding `0x1000` only when mode is nonzero. `0x102783068` copies source path bytes `+0x60..+0x77` and double `+0x78`, then calls output path virtual `+0x100` with `w2=0`. This is not proof that copying only those fields implements every path/brush contract.

## Ordered processing

`0x102785f40` performs these operations in order:

1. Reduce any retained deque contents to at most two entries, reset its count/logical state, and clear pending state `+0x70`. Fresh constructor state is empty. If reusable state is implemented, reproduce the native reset rather than assuming the fresh case describes reuse.
2. Send the source head to `0x102786094`.
3. Call `0x102786564` to choose the next source node, then send that node to `0x102786094`. Continue while the returned node has a raw `next` pointer.
4. Traverse the generated output in raw `next` order. Read each node through virtual `+0x10` with selector zero. For an interior node whose flag bit `0` is clear, set its position to the componentwise, separately rounded midpoint of the previous and current returned points, using `0x10276b004`. Endpoints and bit-zero corner nodes skip this adjustment.
5. Call `0x10278193c` with an initial zero rectangle. That routine updates node bounds through `0x10276b2c4`, accumulates path bounds, and marks path state `+0x80 = 1`.
6. Call `0x10278672c`, the scalar-preservation pass. The wrapper subsequently invokes the bounds refresh once more before installing the result.

The quadratic node vtable confirms virtual `+0x10 = 0x102764800`, which returns stored control `+0x78/+0x80`; virtual `+0x18 = 0x10276481c` sets that stored control. These points are not interchangeable with anchors. In particular, source accessor `0x102786808` uses stored controls for interior source nodes and raw positions for endpoints.

## Exact position setter

`0x10276b004` applies the following independently to each coordinate, with every multiplication/addition separately rounded to binary64:

```text
a = coordinate * binary64(0x412e848000000000)       // 1,000,000
b = a + (a < 0 ? binary64(0xbfe0055e000063b9)
               : binary64(0x3fe0055e000063b9))
n = ARM signed-64 truncating conversion of b
result = binary64(n) * binary64(0x3eb0c6f7a0b5ed8d) // 0.000001
```

The signed offsets are exactly `±0.5006551742582054`, not `±0.5`. A generic decimal-rounding helper can therefore disagree near the half-step boundary. The future implementation must establish its finite coordinate range and reproduce signed-64 conversion within that range, including negative values and signed zero; the existing signed-32 helper is not a replacement for this instruction.

## Remaining dependencies and evidence boundary

The candidate/emission operations and next-span search are documented in `candidate-acceptance.md` and `advance-cleanup.md`. Output record sampling at `0x10276b714`, node flags, scalar export/import, node bounds, projection, and segment insertion must follow their actual native dependencies. Corner/control routine `0x102780880` is conditional on the nonzero mode branch of emission; the selected open mode is zero, so supporting that separate branch is not a prerequisite for the chosen scope.

The ordinary spline simplifier's removal schedule and endpoint evaluator are not called by this Bézier orchestration. Reusing those passes would require new native evidence. The final scalar pass has a different purpose and can insert nodes into the generated quadratic path. No native output, natural pen feel, rendered brush appearance, or runtime closure condition has been established by this static analysis.
