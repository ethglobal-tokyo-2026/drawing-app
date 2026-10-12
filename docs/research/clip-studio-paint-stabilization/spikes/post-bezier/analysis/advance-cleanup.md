# Bézier span advancement and scalar preservation

2026-10-11. Static analysis only: no application launch, debugger attachment,
instruction execution, or runtime capture was performed for this note. The
original CSP 5.1.4 ARM64 image has SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
The retained [extraction manifest](../evidence/extraction.json) identifies the
original boundaries and instruction hashes. These are reconstructed contracts,
not CELSYS source code and not an established native equality result.

## Correct the earlier helper description

`0x102786564` chooses the next source node for the Bézier span constructor. It
does not delete or modify nodes. `0x10278672c` performs a final pass preserving
the source's primary brush-response scalar on the corrected path. It can insert
nodes and raise a stored scalar; it does not delete nodes or run the ordinary
post-correction endpoint-deletion evaluator.

The scalar at node `+0x44` is imported from temporary `SVectorNode+0x10`, which
comes from brush event `+0xa0` and ultimately input-wrapper `+0xc8`. Brush event
construction can transform it. It is therefore a transformed primary
brush-response scalar, not a proven raw device-pressure value. For the selected
profile it participates in pressure behavior, but a future specification must
retain this distinction. See [field provenance](../../post-contract/findings.md).

## Data accesses and coordinate selection

The correction object stores destination path at `+8`, source path at `+0x10`,
threshold `r` as binary64 at `+0x18`, and a nonzero relative-test selector at
`+0x20`. This note uses those field names descriptively; their initialization
and UI correspondence belong to the constructor/caller analysis.

Nodes have raw next at `+0x28`, raw previous at `+0x30`, owner path at `+0x38`,
flags at `+0x40`, position at `+8/+0x10`, and primary scalar as binary32 at
`+0x44`. Path first/last are `+0x30/+0x38`.

The coordinate helper [0x102786808](../evidence/102786808.asm) is essential:

```text
representative(node):
    if node.next != null and node.previous != null:
        return node.virtual(+0x10)(outPoint, 0)
    return node.position
```

For quadratic nodes, vtable `0x104a527b0` slot `+0x10` points to
[0x102764800](../evidence/102764800.asm), which returns the stored control at
`+0x78`. Interior tests therefore use quadratic controls; endpoint tests use
positions. Replacing this helper with an anchor-only lookup changes the
algorithm.

## Span selection: 0x102786564

Inputs are correction object `x0` and current source node `x1`. The return is a
source node pointer. Constants are retained in [literals](../evidence/literals.json):
`epsilon=1e-8` at `0x1042e3690`, and `0.025` at `0x104322140`.

For finite inputs, the traversal is:

```text
A = representative(current)
candidate = current.next
if candidate == null: return source.last
attempts = 0
endpointRadiusSquared = (r*r) * 4
relativeFactor = (r*r) * 0.025

while candidate != null:
    if attempts == 200 or (candidate.flags & 4) != 0:
        return candidate

    P = representative(candidate)
    v = P - A
    candidateDistanceSquared = fma64(v.x, v.x, v.y*v.y)

    if candidateDistanceSquared > epsilon and candidate != current:
        denominator = sqrt(candidateDistanceSquared)
        scan = candidate
        lastPoint = P

        while scan != current:
            Q = representative(scan)
            qA = Q - A
            qP = Q - P
            distanceFromA = fma64(qA.x, qA.x, qA.y*qA.y)
            distanceFromP = fma64(qP.x, qP.x, qP.y*qP.y)

            if distanceFromA > endpointRadiusSquared and
               distanceFromP > endpointRadiusSquared:
                if distanceFromA > candidateDistanceSquared:
                    return scan

                product = qP.y * (-v.x)
                cross = FMADD(v.y, qP.x, product)
                negativeCross = FNMADD(v.y, qP.x, product)
                magnitude = cross < 0 ? negativeCross : cross
                deviation = magnitude / denominator

                if relativeSelector != 0:
                    local = Q - lastPoint
                    localSquared = fma64(local.x, local.x,
                                         local.y*local.y)
                    reject = deviation*deviation >
                             relativeFactor*localSquared
                else:
                    reject = deviation > r
                if reject: return scan

            lastPoint = Q
            scan = scan.previous

    attempts += 1
    candidate = candidate.next

return source.last
```

`FNMADD` here returns the negated fused sum, `-(a*b+c)`, with native rounding.
For ordinary finite values this implements the absolute cross-product distance;
an exact port must preserve fused arithmetic and signed-zero selection rather
than expand it into separately rounded products and subtraction. The routine
does not project onto a finite chord. It tests the infinite-line distance after
the two endpoint-radius exemptions and the radial-distance rejection.

The first attempted candidate is the immediate next node. Each subsequent
candidate scans backward toward the current node. A violation returns the
offending scanned node, which need not be the candidate being tested. The cap
returns the current candidate before evaluating it; it is not a 200-node output
cap. A source node whose flag bit 2 is set also ends advancement immediately.
Neither this routine nor its coordinate helper writes a node flag.

For nonfinite values, keep the actual `FCMP`/`FCCMP`/conditional-select semantics
when building an instruction comparison. The finite pseudocode is not a
specification for JavaScript NaN handling.

## Final scalar pass: 0x10278672c

The source path's virtual `+0x88` supplies a binary64 parameter. The known path
getter [0x102789790](../../post-evaluator/README.md) returns path field `+0x98`;
the captured ordinary selected brush set this to half the brush diameter. The
Bézier caller still needs to establish its exact provenance and profile.

```text
parameter = source.virtual(+0x88)()
if parameter < 1e-8: return
step = clamp(0.5 / parameter, 0.005, 0.2)
doubleStep = step + step
lastSuccessfulScalar = 0
lastAttemptedNode = null

for node in source raw next order:
    scalar = widenFloat32(node.scalar44)
    if scalar >= doubleStep and
       abs(scalar-lastSuccessfulScalar) < step:
        continue

    previous = node.previous
    if previous != null and previous != lastAttemptedNode:
        transferScalarNode(previous)   // return intentionally unused by native

    success = transferScalarNode(node)
    if success:
        lastSuccessfulScalar = scalar
    lastAttemptedNode = node
```

Equality at the difference threshold triggers transfer. A scalar below
`2*step` triggers transfer regardless of its difference from the last successful
scalar. The previous-node call helps preserve adjacent values when a significant
change occurs. `lastAttemptedNode` advances even when transfer fails; the scalar
reference advances only on a successful current-node transfer.

## Transfer: 0x102786a98

Inputs are correction object and a source node. The result is Boolean success.
This routine uses the source node's raw position, not `representative(node)`.

```text
query = sourceNode.position
radius = r * 10
found, projectedPoint, segmentStart, t =
    destination.findNearestWithBounds(query, radius)
if not found: return false

inserted = splitSegment(segmentStart, t, minimumSeparation=1)
if inserted != null:
    attributes = exportNode(sourceNode)
    attributes.position = inserted.position
    importNode(inserted, attributes)
    refreshNodeBounds(inserted)
    refreshNodeBounds(segmentStart)
    return true

target = segmentStart
if t > 0.5 and segmentStart.next != null:
    target = segmentStart.next
if sourceNode.scalar44 > target.scalar44:  // binary32 comparison
    target.scalar44 = sourceNode.scalar44
    return true
return false
```

The native split routine [0x10276dec8](../evidence/10276dec8.asm) first evaluates
the quadratic and attributes at `t`, then rejects insertion if its squared
distance from either segment endpoint is strictly less than `1*1`. Equality
permits insertion. It uses the existing closed-path neighbor fallback when
there is no raw next node. It imports interpolated attributes, applies the
quadratic split-control operation, and can set corner bit 0 if the path's
`+0x20` bit 4 requires it.

The subsequent export/import replaces all seven scalar fields with those from
the selected source node and restores the split node's geometric position.
The import updates flag bits 12 and 13 from the temporary record. It does not
blindly copy the entire source flags word. The split-control changes remain.
Existing [attribute and split analysis](../../post-spline/evidence/quadratic-analysis.md)
provides the recovered helper formulas.

`refreshNodeBounds` is [0x10276b2c4](../evidence/10276b2c4.asm). Its calculations
depend on segment geometry, scalar/evaluator response and path configuration.
This is a relevant dependency because later nearest searches inspect cached
integer bounds. It cannot be omitted without establishing that the substitute
search has the same accepted candidates and tie order.

## Nearest search and quadratic projection

[0x102782054](../evidence/102782054.asm) calls
[0x102781eb0](../evidence/102781eb0.asm) from destination first node to null. It:

- Rejects a query-radius box that does not intersect the path's integer bounds.
- Converts the search rectangle to integer limits using the recovered rounding
  instructions, and tests strict intersection with each node's cached bounds.
- Projects only accepted nodes, keeping a candidate only when squared distance
  is strictly less than the current best, initially `(10*r)^2`.
- Retains the first traversal candidate on ties; updates projected point,
  segment and parameter; returns false if none improve the radius.

Node projection [0x10276bab4](../evidence/10276bab4.asm) chooses raw next, or
path first when closure bit 0 of path `+0x21` is set. With no usable next it
returns the node position and parameter zero. Quadratic vtable `+0x88` is
[0x102764e0c](../evidence/102764e0c.asm), forwarding position, stored quadratic
control, following position and query to
[0x10359cc94](../evidence/10359cc94.asm).

That wrapper has endpoint dot-product early exits. If the query is behind the
start relative to both control and end, it returns start at `t=0`. If it is
beyond the end under the corresponding recovered dot checks, it returns end at
`t=1`. Otherwise it samples quadratic kind zero over `[0,1]` at density `4`,
using `0x10359c838`, and calls `0x10359b240` for the nearest sampled vertex and
its adjacent segments. Those sampling and parameter helpers are already
reconstructed and separately checked in
[sampling analysis](../../post-pipeline/evidence/sampling-analysis.md).
Do not substitute an analytic cubic-root minimizer: the sampled selection and
tie behavior are observable parts of the native algorithm.

## Closure and endpoint boundaries

The advancement and scalar traversal themselves follow raw lists until null;
they do not wrap. Nearest projection and split insertion can wrap the final
segment to path first under the path closure flag. If splitting that closing
segment fails, scalar transfer's fallback tests only the raw `segment.next`,
so it selects the last segment start rather than using an implicit head fallback.

This note does not identify a CSP UI operation activating this closure case.
Open-path implementation remains the intended first scope. Tests for closure
must not imply support until the constructor, source preparation, result flags,
final controls and scalar behavior have been reconstructed together.

No ordinary endpoint trimming call appears in these helper bodies. The future
Bézier specification must not promise reuse of ordinary endpoint trimming
unless another caller demonstrably invokes it.

## Concrete next work and checks

1. Establish constructor provenance for `r`, relative selector, source parameter,
   source/result curve classes and flags. Require finite supported inputs.
2. Port `representative` and span selection with exact fused operations and raw
   traversal. Cases must exercise interior controls distinct from anchors,
   fixed and relative thresholds, radial rejection, endpoint-radius exemptions,
   equality, flag `4`, duplicate representatives, and the 200-candidate cap.
3. Port final scalar pass and transfer with binary32 imports. Cases must cover
   `parameter<1e-8`, both step clamps, scalar difference equality, unsuccessful
   transfers, previous-node transfer suppression, successful insertion, rejected
   insertion at either endpoint, and max-scalar fallback ties.
4. Reuse the recovered quadratic sampling, split, attribute import/export and
   projection parameter helpers. Preserve endpoint early-outs and nearest ties.
5. Finish or prove equivalent the destination bounds maintenance and search
   filters. Document the proof separately from a result-shape comparison.
6. Run future standalone original-instruction comparisons with synthetic node
   graphs, then joined native Bézier captures after the user returns. Save
   before/after controls, attributes, flags, bounds and stage returns. A changing
   primary scalar fixture is required to validate the final pass together.

The saved instructions now make these helpers concrete enough to implement a
research reference. The missing bounds/configuration contracts and absence of a
native Bézier before/after comparison prevent a claim of complete replication.
