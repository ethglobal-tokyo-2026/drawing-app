# CSP narrow-area endpoint-pair choices

Static follow-up on 2026-10-13 for the larger-gap investigation. No CSP process
was launched, attached, or changed. No Croquis product code was changed.
This note translates the main pair-choice loop inside
`PWFloodFill::FindNarrowestPointForEachGap(SRect&, vector<SPoint>&)` and extends
[narrow-boundary-rules.md](narrow-boundary-rules.md).

The source remains the pinned
`/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64`, SHA256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
All addresses below are unslid ARM64 virtual addresses.
The exact function range is `0x102541c94–0x102542720`, 2,700 bytes.
The existing [675-instruction extract](evidence/narrow-boundary/102541c94.asm)
has original instruction bytes; the new
[verification record](evidence/endpoint-pairs/verification.json) independently
checks every instruction against the pinned image, the complete byte hash,
and both `LC_FUNCTION_STARTS` boundaries. It also evaluates the retained scalar
choice instructions in 13 hand-computable cases and nearest-point comparisons
in four cases. This is a small instruction interpreter, not native execution.

## State entering the main loop

Two outline positions advance in opposite traversal modes described in
narrow-boundary-rules.md. Name them `first` for mode 1 and `second` for mode 0.
These labels are local names for this note, not recovered native identifiers.
The input positions have already passed through startup tracing. This note
does not yet translate how every startup branch chooses their coordinates.

| State                                | Native storage at the main loop |
| ------------------------------------ | ------------------------------- |
| Current first x, y, direction        | `sp+0xc0`, `sp+0xbc`, `sp+0xc4` |
| Current second x, y, direction       | `sp+0xb4`, `sp+0xb0`, `sp+0xb8` |
| Current first flag                   | `sp+0x9c`, copied to `w25`      |
| Current second flag                  | `sp+0x98`, copied to `w21`      |
| First point list begin/end           | `x29-0x90`, `x29-0x88`          |
| Second point list begin/end          | `x29-0xa8`, `x29-0xa0`          |
| First/second list counts             | `w26`, `w27`                    |
| Remembered first/second list indices | `w23`, `w20`                    |
| Remembered squared distance          | `x28`                           |
| Fixed squared-distance limit         | `sp+0x60`, loaded into `x22`    |
| Initial first x/y                    | `sp+0xa8`, `sp+0xac`            |
| Initial second x/y                   | `sp+0xa0`, `sp+0xa4`            |

At `0x1025422f8–0x102542344`, both counts and both remembered indices start at
zero, the remembered distance starts at the limit, and **both initial flags
are set to 1**. The initial positions are saved separately for termination.
Each subsequent iteration updates temporary current point records at
`sp+0x90` for first and `sp+0x88` for second.

The first current point is appended to the first list only when its flag is
nonzero; the second is appended to the second list only when its flag is
nonzero (`0x1025423b0–0x1025423e4`). The first iteration therefore retains both
initial positions even before another outline step. Lists retain flagged
positions from earlier iterations. They are cleared after this candidate
finishes by setting each end pointer back to its begin pointer
(`0x1025425f0–0x1025425fc`). They do not survive to the next scanned candidate.

## Eligibility and nearest-point ties

The fixed limit is computed with 32-bit instructions as:

```text
limit = 2 * (g + 1) * (g + 1)
```

At each iteration the routine computes two separate cross-outline trials:

1. The nearest retained first-list point to the **current second** point.
2. The nearest retained second-list point to the **current first** point.

The two loops are `0x10254240c–0x102542438` and
`0x10254246c–0x102542498`. Coordinates are sign-extended to 64 bits before
subtraction; squared distances are calculated with 64-bit `mul` and `madd`.
Each search starts at `distance=limit, index=0`. A smaller distance changes
the distance; a smaller **or equal** distance changes the index. Thus the
later list index wins a tie. A point farther than the limit never changes
either initial value.

**Both trial distances must be strictly below the limit**, independently of
the current flags and the remembered pair (`0x10254249c–0x1025424a8`). If either
distance equals or exceeds it, traversal ends and emits the remembered pair.
For ordinary gap widths, limits are 72 at g=5, 242 at g=10, and 882 at g=20.
For example, distance squared 882 fails the g=20 condition, while 881 passes.
This is separate from the later omitted-component area limit `8*g*g`.

The algorithm is not an unrestricted search over every possible first/second
list pair. Each new trial contains one current outline point. A remembered
pair carries earlier results forward.

## Exact remembered-pair ranking and replacement

Provided both trials pass the strict limit, the 15 scalar instructions at
`0x1025424ac–0x1025424e4` implement this rule. `nearestFirstIndex` belongs to the
first trial above; `nearestSecondIndex` belongs to the second trial.

```text
if secondFlag == 0 or firstTrialDistance > rememberedDistance:
    candidate = rememberedPair
    candidateDistance = rememberedDistance
else:
    candidate = (nearestFirstIndex, secondCount - 1)
    candidateDistance = firstTrialDistance

if firstFlag != 0 and secondTrialDistance <= candidateDistance:
    rememberedPair = (firstCount - 1, nearestSecondIndex)
    rememberedDistance = secondTrialDistance
else:
    rememberedPair = candidate
    rememberedDistance = candidateDistance
```

The flag checks have a subtle assembly consequence. Both conditional compares
use fallback NZCV=0 (`0x1025424b0`, `0x1025424d0`). Those flags satisfy ARM64's
signed `gt` condition. When a current flag is zero, the comparison therefore
preserves the prior eligible choice; it does not manufacture a new pair from
an unflagged current point. The two nearest-distance searches still run and
their strict-limit condition still applies.

For ordinary nonnegative squared distances, the remembered distance never
increases. Ties are deliberately replaceable:

- A flagged second point replaces the remembered pair when its first trial
  ties the remembered distance.
- A flagged first point replaces the first candidate when its second trial
  ties that candidate distance. If both new trials tie, this second trial wins.
- Within each individual nearest-list search, later retained points win ties.
- With both current flags zero, the remembered pair stays unchanged, provided
  both cross-outline searches still pass the strict limit.

The verified cases use distinct indices for the remembered pair, nearest
points, and latest list points. This prevents an index mix-up from looking
correct merely because several choices happen to use index zero.

## Advancement, termination, and emitted endpoint order

After ranking, first advances through `TraceOutlineForSoak` in mode 1, then
second advances in mode 0 (`0x1025424e8–0x102542528`). Their newly returned flags
are used on the next iteration. The routine does not compare the next points
against the squared-distance limit until the next iteration.

There are three distinct exits:

| Exit                                                                                                               | Segment behavior                                                                |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Either current cross-outline nearest distance is at or above the limit                                             | Append the remembered first-list endpoint, then remembered second-list endpoint |
| An outline helper returns 0 with no checked failure status                                                         | Finish this candidate without appending a segment                               |
| After both successful steps, first equals the initial second position and second equals the initial first position | Finish this candidate without appending a segment                               |

The third condition is a **swap of the initial positions**, not two separate
returns to each outline's own start (`0x102542530–0x10254256c`). It tests the
four coordinates and does not test directions. The observed branches are
consistent with two fronts meeting around the same candidate outline, but
that explanation is an interpretation of the coordinate rule.

On the distance exit, the nonempty-list path at
`0x102542584–0x1025425e8` emits ordered points:

```text
output.push(firstPoints[rememberedFirstIndex])
output.push(secondPoints[rememberedSecondIndex])
```

If either list is empty, the guarded fallback emits initial first, then
initial second instead (`0x1025425cc–0x1025425e8`). The ordinary main-loop
initialization forces both flags to 1 and appends both initial points, so the
empty-list guard should not be described as a usual outcome of an unflagged
outline step. Extreme count overflow and exceptional allocation paths are
outside this note's ordinary-coordinate description.

Every completed candidate clears the two temporary lists. The function's
local processed flag becomes 1 even on the two exits that emit no segment
(`0x1025425ec–0x102542604`). Consequently, a true analyzer return is not proof
that its endpoint output grew. Checked failure status aborts the analyzer.

`RefillToStopLine` later consumes consecutive ordered pairs. The first endpoint
remains the mode-1 list point; the second remains the mode-0 list point.
As already shown in narrow-boundary-rules.md, reversing endpoints can change
`DrawSegment`'s half-step raster ties. An equivalent implementation must
preserve this order.

## Verification and remaining limits

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/evidence/endpoint-pairs/verify_endpoint_pairs.py
```

Verification passes for the exact source hash, both function boundaries, all
675 original instructions, 13 ranking cases, and four nearest-point cases.
The interpreter reads the original scalar instruction text after checking its
recorded assembly hash and every original instruction byte. It does not emulate
the rest of the analyzer or execute proprietary instructions.

This resolves the main loop's list eligibility, nearest-distance ranking,
replacement ties, termination, and output order. It leaves the complete
startup walk, lazy reference preparation, outer scanned-candidate visitation,
native observations of actual emitted endpoints, and later bitmap effects for
separate verification. The recovered loop is sufficient to reject a global
nearest-pair simplification; it is not proof of complete native equivalence.
