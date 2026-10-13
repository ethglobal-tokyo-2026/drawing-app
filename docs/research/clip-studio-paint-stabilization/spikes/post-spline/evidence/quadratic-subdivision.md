# Position/control source-subdivision check

2026-10-11. The saved native mouse input produces **304 reconstructed source
nodes from its original 99**, adding 205 nodes with no rejected splits. All
eight saved native output positions occur bit-exactly in that reconstructed
list. This includes all four positions absent from the original input.

The complete [report](quadratic-subdivision.json) retains every point/control,
its binary64 bits, source-input hash, limits, settings, and comparisons.
[The script](../analyze-quadratic-subdivision.ts) validates and decodes the saved
capture through the existing post replay reader before processing it.

| Native output index | Original input index | Reconstructed subdivision index |
| ------------------- | -------------------- | ------------------------------- |
| 0                   | 0                    | 0                               |
| 1                   | absent               | 32                              |
| 2                   | 27                   | 64                              |
| 3                   | absent               | 96                              |
| 4                   | absent               | 160                             |
| 5                   | 72                   | 208                             |
| 6                   | absent               | 272                             |
| 7                   | 98                   | 303                             |

This is coordinate membership, not reconstructed source/output associations.
The native capture does not include the intermediate subdivided path, so
304 is a reconstructed count, not an independently observed native count.
No complete correction, scalar import, removal, endpoint, closure, or rendering
equivalence is claimed.

The script follows the ordinary open quadratic branch of
[0x10277f8c8](quadratic-10277f8c8.asm): measure the current segment at high
precision, split at 0.5 if its length exceeds `10 * lengthScale`, then recheck
the shortened current segment. The threshold is `80.97101964970545` for this
capture. It follows [0x10276dec8](quadratic-10276dec8.asm) for strict squared
separation rejection below `0.25`, uses the fused evaluator for the inserted
position, and [0x102765694](quadratic-102765694.asm) for separately rounded
left/right controls. The split helper's own midpoint is intentionally unused,
as in the native caller. The node count is limited to 10,000, the run has a
30-second deadline checked around each bounded length evaluation, and each
length evaluation is limited to 100,000 sampling intervals. Exceeding a bound
records a failure and throws; these limits are research safeguards, not native
constants.

There were 508 nonterminal segment measurements. The final largest measured
segment was `80.71798556249996`, below the threshold. The measured run took
about 1.67 seconds; this is script runtime, not native performance evidence.
Strict TypeScript checking passed. No parameters were adjusted to obtain the
matches, and the script did not attach to or run CSP.

Run from the repository root with a new report output path:

```sh
node --experimental-strip-types docs/research/clip-studio-paint-stabilization/spikes/post-spline/analyze-quadratic-subdivision.ts docs/research/clip-studio-paint-stabilization/evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl /tmp/csp-quadratic-subdivision.json
```
