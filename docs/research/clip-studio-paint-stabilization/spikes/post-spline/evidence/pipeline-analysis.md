# Ordinary open-path dependencies

2026-10-11. Read-only analysis of the pinned CSP 5.1.4 ARM64 image, SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
No CSP process was attached or executed. This is an algorithm map, not a completed
curve implementation or a native equality result.

The concrete case is the successful
[native mouse fixture](../../../evidence/debugger-access/post-mouse-manual-20261010T184049Z/README.md):
99 quadratic-Bezier source nodes, flags `0x2021`, ordinary output flags `0x2081`,
`k=40`, tolerance `160`, length scale `8.097101964970545`, speed flag zero,
alternate selector zero, and closure argument zero. The before/after fixture
has eight output spline nodes. It contains no internal pass snapshots.

The four starting extracts are [source preparation](102787500.asm),
[correspondence-preserving deletion](1027883ac.asm),
[node deletion](10276e06c.asm), and [endpoint processing](102787db0.asm).
Additional exact bodies and vtable entries are retained in
[quadratic-extraction.json](quadratic-extraction.json), independently of the
shared spline extraction manifest.

## Source preparation is not a copy of the original 99 anchors

In `0x102787500`, ordinary constructor fields `+0x38=1` and `+0x3c=0x80`
select the spline result. The path flags clear `0x10f0`, then add `0x80`;
the captured source therefore produces `0x2081`. Closure argument zero does
not add `0x1000`.

For source type `0x20`, `w24` is zero at `0x1027875cc`, so the branch at
`0x102787660` does call [0x10277f8c8](quadratic-10277f8c8.asm). The supplied
threshold is `10 * lengthScale`, or `80.97101964970545` for this fixture.
That routine follows its non-spline, non-polyline branch:

1. Start at the first source node.
2. Measure the segment with `0x10276ba84(node, 1)`.
3. If length is above the threshold, call `0x10276dec8(node, 0.5, 0.5)`.
4. On a successful split, remeasure the same anchor's shortened first segment.
5. When short enough, or when splitting fails, advance to the raw next node.

`0x10276dec8` proposes a midpoint sample, rejects it if its squared distance
from either endpoint is strictly below `0.5 * 0.5`, inserts a node, imports
its attributes, and dispatches the source class's split-control operation.
This is recursive subdivision through repeated mutation, not uniformly
resampling the entire original path.

The fixture's largest consecutive source-anchor distance is about `1080.0475`,
well above the subdivision threshold. This stage is therefore relevant to the
fixture; the four output coordinates absent from the original 99 coordinates
must not be attributed to an invented spline-node movement operation.

The exact quadratic length/evaluation/split arithmetic and ABI are documented
in [quadratic-analysis.md](quadratic-analysis.md). The main dependencies are:

- Length: `0x10276ba84` → Bezier virtual `+0x78 = 0x102764de4` →
  `0x10359c378` → `0x10359c394`, with measure `0x10359c490` and sampled length
  `0x10359c60c`.
- Midpoint attributes: `0x10276b714`; position dispatches through Bezier
  virtual `+0x68 = 0x102764db4` to `0x10359bc34`.
- Split controls: Bezier virtual `+0x108 = 0x102765694` → `0x10359d408`.

## Clone and correspondence

After subdivision, `0x1027876a0..0x102787898` creates one output spline node for
each resulting source node. `0x10276b138` exports coordinates and seven
binary32 scalar fields to a temporary double record; `0x10276b190` imports
them. Output type `0x80` skips the control conversion block at
`0x1027876dc`. Node flags clear `0xc00` for this non-cubic output.

Each map insertion at `0x102787884..890` associates the new output node with
the corresponding **subdivided source node**. The original 99-node indices
are not the internal correspondence domain after subdivision.

`0x102783068` copies path state and calls path virtual `+0x100 = 0x102789f24`.
For paths belonging to the same owner context, this copies the shared endpoint
evaluator, parameter at `+0x98`, and field `+0xa0`; a different owner context
uses `0x1024cc404` to adapt the evaluator. This fixture's source and result
retain the same evaluator pointer pair and parameter.

## Removal and node mutation

The [ordinary core](../../post-capture-contract/evidence/ordinary_core.asm)
performs two initial removal passes, corner classification, additional passes
with decreasing tolerance and early termination, near-coincident cleanup,
two endpoint passes, and final cleanup. The ordinary wrapper fixes `+0x34=0`,
so the earlier node-flag reconsideration routine is skipped.

The removal traversal `0x102787b30`, retained in
[the original region](../../../evidence/post/region.asm), starts at the second
node. It caches the candidate's next node. On successful deletion it skips
that cached next node before choosing another candidate.

[0x1027883ac](1027883ac.asm) gets the preceding output node and the complete
map range keyed by the candidate. For each association, it inserts a new
association with the preceding output node and the same source node, then
removes the candidate's map entry. Only after transferring all associations
does it delete the candidate with `0x10276e06c(candidate, 1)`.

`0x10276e06c` can invoke the previous node's virtual `+0x128` before unlinking.
For `PWVectorSplineCurve`, that entry is **0x10276e704, a bare return**;
the address and target bytes are retained in the quadratic manifest. There is
no additional spline control adjustment at this deletion callback.
`0x102781838` repairs previous/next and path first/last links, releases the
node, and decrements the node count. The near-coincident pass uses the same
correspondence-preserving deletion. An implementation can represent these
operations without native allocation addresses, but must preserve source
associations, flags, adjacency and traversal order.

## Endpoint processing and the actual uncaptured input

[0x102787db0](102787db0.asm) runs from the head, then from the tail. Its amount
is `min(k * 0.05, 1)`, hence `1` here. It obtains the path parameter from
virtual `+0x88` and its shared evaluator from virtual `+0x98`. The travel
limit is `max(parameter, 2)`, which is `2.5` in this fixture.

For the current endpoint it obtains an evaluator value, or `1` if the
evaluator is absent; a supplied result is clamped to at least `1`. Then it
walks inward and accumulates segment lengths. If accumulated length exceeds
the travel limit, it exits before evaluating that next node. Otherwise it
obtains the next node's evaluator value, again clamped to at least `1`.

The deletion threshold is the single fused result
`nextValue - anchorValue * (1 - amount)` (`FMSUB` at `0x102787ef8`). The anchor
is deleted only if its segment length is strictly below that result and one
of these conditions holds: a previous segment was kept, accumulated length
is below `0.5`, or the next node has corner flag bit 0 set (mask `1`). After a deletion or a kept
segment, the walk advances inward. Endpoint deletion directly invokes
`0x10276e06c`; it no longer needs correspondence for later removal passes.

The exact endpoint length dependency is `0x10276ba84` → spline virtual
`+0x78 = 0x102788b10` → `0x10359fc40`, which uses measurement `0x10359fd24`
or sampled length `0x10359fe88`. This is separate from merely counting
replacement samples.

The native fixture contains evaluator pointer `0xcb69ef000` and control
pointer `0xcb71242e0`, but not the pointed-to object bytes.
[0x1024c497c](quadratic-1024c497c.asm) reads configurable fields through
`+0x638` and can call `0x1024aff24` and `0x1024af6f0`. Its result cannot be
recovered from the pointer value or replaced with an assumed default.

For this one fixture, endpoint geometry may be provably independent of the
missing evaluator: if independently reconstructed geometry entering the
endpoint stage has both outer segment lengths above `2.5`, neither pass
can delete a node. The saved final first/last chord lengths are about
`1647.6022` and `1528.4952`, suggesting this case is possible. Those expected
output values do not replace the required check on reconstructed intermediate
geometry. The initial evaluator call still happens in native execution;
this proposed proof concerns geometry, not its side effects or exception flags.

## Excluded branches and next work

For this captured case, final control cleanup `0x102787f94` immediately exits
because output flags lack `0x60`. Closure `0x102780800` is skipped because
the closure argument is zero. All captured source node flags are zero;
fields `+0x44/+0x48/+0x54/+0x58/+0x5c` are all `1`, field `+0x50` is `0`,
and only `+0x4c` varies. This excludes the flagged path-scalar callbacks and
nonzero-angle interpolation branch while constructing subdivision samples
for the fixture. It does not establish that those branches are unnecessary
for other inputs.

After the spline math foundation, the next bounded implementation stage is
quadratic source subdivision with exact point, scalar and control operation
order. Then reconstruct correspondence-aware removal and verify the
endpoint early-exit condition on the resulting geometry. General endpoint
behavior needs the evaluator configuration as an explicit input or additional
runtime object evidence. Alternate output classes, closure, other node flags
and rendering remain separate work.
