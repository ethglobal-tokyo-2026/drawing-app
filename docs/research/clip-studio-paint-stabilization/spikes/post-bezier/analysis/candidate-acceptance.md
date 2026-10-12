# Bézier candidate acceptance and output construction

This is static reconstruction guidance for a future implementer, not a validated
implementation. No CSP process, debugger, original instruction execution, or new
stroke capture was used for this analysis. The original ARM64 image is pinned to
SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.

Primary extracts:
[candidate acceptance, 0x102786094](../evidence/102786094.asm),
[point accessor, 0x102786808](../evidence/102786808.asm),
[output construction, 0x1027868ec](../evidence/1027868ec.asm),
[record export](../evidence/10276b138.asm),
[record import](../evidence/10276b190.asm), and
[record sampling](../evidence/10276b714.asm).
Function boundaries and extract hashes are in
[extraction.json](../evidence/extraction.json).

## Candidate state and inputs

The routine takes `x0=state`, `x1=incoming source node`. It mutates the output
path and candidate deque; it has no meaningful Boolean return. The names below
describe operations observed here and do not claim original symbol names.

| State offset  | Type                | Observed role                                                                                                          |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `+0x08`       | pointer             | Output path; its `+0x38` is the current tail.                                                                          |
| `+0x18`       | binary64            | Parameter transformed into the positional corner threshold. It is not established here to be the UI strength directly. |
| `+0x24`       | 32-bit value        | Selects the extra corner/control adjustment in the emitter.                                                            |
| `+0x28`       | binary64            | Scale passed to the corner predicate; also conditionally scales its threshold.                                         |
| `+0x30`       | deque object        | Pointer queue. Global `+0x38/+0x40` are table begin/end, `+0x50` is front index, and `+0x58` is size.                  |
| `+0x60/+0x68` | two binary64 values | Last emitted record position used by the first-candidate corner test.                                                  |
| `+0x70`       | 32-bit value        | Pending corner operation consumed by the next output emission.                                                         |
| `+0x74`       | 32-bit value        | One-emission deferral state used when `+0x24` is enabled.                                                              |

Source node `+0x28` is the next pointer, `+0x30` the previous pointer, and
`+0x40` the flags word. Flag bit 2 is tested as byte `+0x40 & 4`; do not rename
it to a user-facing feature without proving its meaning. The routine sometimes
uses raw coordinates at `+0x08/+0x10` and sometimes calls a point accessor.

`point(node)`, function `0x102786808`, is exactly:

- If **both** next and previous pointers are non-null, call node virtual slot
  `+0x10`, with a 16-byte destination and integer argument zero.
- Otherwise return the two raw binary64 coordinates at `+0x08/+0x10`.

Candidate corner points use raw coordinates for bit-2 nodes and `point(node)`
for other nodes. Duplicate comparisons always use `point(node)`, including
bit-2 nodes. These two usages must not be merged into one unconditional getter.

The local stack holds three points and three node pointers. Normal wrapper
execution must keep the candidate queue at most three nodes. Prove that invariant
with the wrapper's traversal before translating this into an unbounded array;
the function itself does not check a three-node bound.

## Threshold and duplicate coalescing

At `0x1027860d4..0x1027860f0`, preserve binary64 operation order:

```text
threshold = fma64(state.parameterAt18, 3.0, 1.0)
if state.scaleAt28 > 1.0:
    threshold = threshold * state.scaleAt28
```

The scale is always also passed separately to `cornerPredicate`. Scaling the
threshold at scales at or below one would change this branch.

The literals at `0x1042e3688` and `0x1042e3690` are exactly `-1e-8` and `1e-8`
(little-endian bytes `3a8c30e28e7945be` and `3a8c30e28e79453e`). For finite
values, two points coalesce when the previous queued position lies inclusively
inside `[incoming.x-1e-8, incoming.x+1e-8]` **and** the analogous y interval.
This is a coordinate-wise box, not Euclidean distance. The additions round
before the comparisons; replacing them with `abs(previous-incoming) <= 1e-8`
can change boundary rounding.

Process the incoming node in this exact order:

1. With no queued node, append it.
2. With a different point, append it.
3. With a coalescing point and a non-null incoming next pointer, return
   immediately without appending or processing the existing queue.
4. With a coalescing terminal point and bit 2 set, append it anyway.
5. With a coalescing terminal point and bit 2 clear, do not append; process the
   existing queue as a terminal case.
6. After an append, a nonterminal incoming node returns immediately if the
   queue has fewer than two nodes. Otherwise set the local `hasFollowing=true`.
   Terminal cases use `hasFollowing=false`. An empty remaining queue returns.

ARM comparisons are not modeled by this finite-input description for NaNs or
nondefault FPCR behavior. A future exact implementation needs either the same
finite-input contract as the ordinary port or explicitly reproduced ARM rules.

## Ordered acceptance and queue transitions

At `0x1027861b8..0x10278626c`, snapshot `N=queue size`, its original nodes
`P0..P(N-1)`, and their chosen corner points `A0..A(N-1)`. Later output actions
must continue using this snapshot after deque consumption; do not recalculate
indices against the mutated deque.

Notation:

- `emit(previous, current, extra, allowShortDeferral)` is `0x1027868ec`.
- `consume()` increments the deque front, decrements size, then calls deque
  block cleanup. The vector integer constant at `0x104303ce0` is **`(1,-1)`**,
  not floating-point data.
- `pending()` writes integer one to state `+0x70` **after** `emit` returns.
- `corner(A,B,C)` is existing `0x1027878ec`, with `d0=threshold` and
  `d1=state.scaleAt28`. Reuse its exact recovered arithmetic and branch order.

First-candidate handling, `0x10278626c..0x102786350`:

```text
firstHadPrevious = P0.previous != null
local26 = true
remaining = N
if firstHadPrevious:
    if N >= 2 and (P0.bit2 or corner(lastEmittedPosition,A0,A1)):
        emit(null,P0,null,true)
        pending()
        consume()
        local26 = false
        remaining = N - 1
else:
    append output node and import exported record(P0)
    lastEmittedPosition = A0
    consume()
    remaining = N - 1
    local26 = true

if N < 3 and hasFollowing: return
if remaining == 0: return
```

`local26` is deliberately named after the register: its true value after
seeding the first endpoint does not mean that P0 is still queued. Subsequent
tests combine it with `firstHadPrevious`.

Three-candidate handling, `0x102786360..0x10278642c`:

```text
if N == 3:
    if P1.bit2 or corner(A0,A1,A2):
        if firstHadPrevious and local26:
            emit(P0,P1,null,true)
            pending()
            consume()
            consume()
            remaining -= 2
        else:
            emit(null,P1,null,true)
            pending()
            consume()
            remaining -= 1
    else if firstHadPrevious and local26:
        emit(P0,P0,P1,false)
        consume()
        remaining -= 1
```

The noncorner `emit(P0,P0,P1,false)` must not become `emit(P0,P1,...)`.
There is no `pending()` write on that branch.

Terminal handling, `0x102786430..0x10278651c`:

```text
if hasFollowing: return
if remaining == 1:
    emit(null,P[N-1],null,true)
    consume()
else if remaining == 2:
    if N == 3:
        emit(P1,P2,null,true)
        consume()
        consume()
    else:
        emit(P0,P1,null,true)
        consume()
```

Other remaining sizes cause no action. In particular, the two-node terminal
case shown above consumes **one**, not two, nodes. Do not invent a final queue
clear because a two-node interpolation was emitted. Observe and validate
actual wrapper completion separately.

## Output emitter, 0x1027868ec

Inputs are `state`, optional `previous`, required `current`, optional `extra`,
and integer `allowShortDeferral`. Snapshot the output path's old tail **before**
appending a new output node. The first-candidate seed guarantees a tail on
normal paths; an independent helper test must explicitly supply it.

1. Build a temporary record for `current`. If its bit 2 is clear, call
   `0x10276b714(current,t=0.5)`; otherwise export its raw record with
   `0x10276b138`.
2. If `extra` is non-null, sample **that** node with `0x10276b714(extra,0.5)`
   irrespective of bit 2, then average only record offsets
   `+0,+8,+0x10,+0x18,+0x20,+0x30`. Each uses separately rounded addition and
   multiplication by `0.5`. Record fields `+0x28,+0x38,+0x40,+0x48,+0x50`
   remain from the first record. Averaging every scalar channel would be wrong.
3. Append a new node with `0x102781770(output)` and import the temporary record
   with `0x10276b190`. The temporary coordinates stay binary64; seven scalar
   channels narrow to binary32 here. Two exported flags at record `+0x50`
   replace only node flag bits 12 and 13; import does not copy all node flags.
4. Change the **old tail's** point/control through node virtual slot `+0x18`,
   with integer mode zero. If `previous` exists, use `point(previous)`.
   Otherwise use `(oldTail.rawPosition + newRecord.position) * 0.5`, with a
   separately rounded component addition then multiplication.
5. Apply pending corner state to the old tail, in the order below.
6. Save the new temporary record's position into state `+0x60/+0x68`.

Pending state, `0x102786a00..0x102786a94`:

```text
if pendingAt70 != 0:
    if modeAt24 == 0:
        oldTail.flags |= 1
        pendingAt70 = 0
    else if deferredAt74 != 0:
        deferredAt74 = 0
        oldTail.flags |= 1
        pendingAt70 = 0
    else:
        short = false
        if allowShortDeferral:
            dx = newRecord.x - oldTail.rawX
            dy = newRecord.y - oldTail.rawY
            squared = fma64(dx,dx,dy*dy)
            short = squared < 100.0
        if short:
            deferredAt74 = 1
            oldTail.flags |= 1
        else:
            adjustOldTail(oldTail,1) // 0x102780880
        pendingAt70 = 0
```

For `allowShortDeferral=false`, the distance arithmetic is skipped entirely.
Equality with 100 takes the adjustment branch. `0x102780880` is a 1,028-byte
tangent/control reconstruction routine; it must **not** be replaced by a flag
setter. It can change controls and flags. Analyze and validate it before
claiming the emitter's full output is reconstructed.

`0x10276b714` also cannot become a generic average: its positional sample uses
node virtual `+0x68`, scalar sampling widens binary32 values and preserves fused
interpolation order, scalar `+0x50` uses `0x102217f00` when either endpoint is
nonzero, node bits 4/5 enable path virtual `+0xc0` callbacks, and bits 12/13
select discontinuity behavior. Its terminal handling respects the path's closed
flag. The ordinary zero-flag tests establish only part of these cases.

## Selected open mode-zero implementation contract

The planned first implementation uses an explicitly open source/output path and
passes wrapper mode zero, stored at state `+0x24`. For that contract, the emitter
always takes the simple pending operation `oldTail.flags |= 1; pending=0`.
Neither distance-100 deferral nor `0x102780880` is reachable. Implement and test
the mode-zero branch first; retain the nonzero-mode extract as evidence rather
than treating tangent reconstruction as required work for this contract.

The source wrapper copies the mode into `+0x24` at `0x102785eb8`. Prove the
selected call argument is zero and keep an explicit rejection for another mode
until it is supported. The wrapper also changes output path flag bit 12 when
that argument is nonzero; preserve mode zero's flags when allocating the output.

For sampling, open-path handling avoids the terminal-to-head fallback at
`0x10276b774..0x10276b784`. The straightforward scalar path additionally requires
the following selected-profile gates to be proved from source construction and
checked in offline inputs:

- Source node bit 4 clear and next node bit 5 clear: no path virtual `+0xc0`
  callback for endpoint attributes.
- Both sampled nodes' scalar `+0x50` zero: no `0x102217f00` angle interpolation.
- Source flag bits 12/13 clear: ordinary scalar interpolation rather than the
  one-sided/discontinuity branches. If these bits are reachable in the selected
  profile, implement those branches instead of rejecting legitimate strokes.

These are proposed bounded-profile gates, not a claim that every selected source
has already been observed to satisfy them. Candidate bit 2 remains part of the
supported acceptance state machine and must not be discarded by an all-flags-zero
guard. Varying pressure and the remaining ordinary scalar channels are supported
by the ordinary sampling branch and must not be restricted to constant values.

## Concrete implementation and validation tasks

1. Resolve node virtual `+0x10`, `+0x18`, and `+0x68` against the actual source
   and output classes selected by the Bézier wrapper. Retain their table
   addresses and extracts. Do not assume slots behave identically across node
   classes.
2. Prove the selected open mode-zero and sampling gates above from the source
   constructor, imported configuration, and offline profile inputs. Keep
   `0x102780880` outside this first contract. Implement any reachable flagged
   or nonzero-`+0x50` sampling branches; otherwise reject unsupported modes
   explicitly. Do not silently clear source flags or scalars.
3. Implement this state machine as pure arithmetic/path operations. Keep the
   three-node snapshot separate from the mutable queue. Record decisions,
   emitted call tuples, queue counts, pending/deferral flags, scalar narrowing,
   and old-tail control changes in offline comparison reports.
4. Add independently expected branch cases: queue sizes 0/1/2/3; linked and
   terminal input; exact duplicate and each epsilon boundary; bit-2 duplicates;
   first endpoint seed; first-candidate corner/noncorner; middle-candidate
   corner/noncorner; old tail distance below/equal/above 10 units; both mode
   values; initial pending/deferral states; scalar flags and varying pressures.
5. For future original-instruction comparison, execute only an independently
   audited bounded helper harness. Check exact coordinates, seven scalar
   channel bits, flags, controls, append order, and queue transitions. Such
   execution was **not** performed during this static analysis.
6. When the user is available for app interaction later, capture a complete
   native Bézier-on stroke through wrapper, source traversal, candidate
   acceptance, emission, and completion. Replay captured inputs independently,
   never seed expected corrected nodes into prediction. Include actual tablet
   pressure only after automated mouse/constant-pressure comparisons work.

Do not apply the ordinary post-correction removal passes or endpoint evaluator
to the new branch without evidence that the Bézier wrapper calls them. This
helper constructs a different output path and the surrounding native completion
must be analyzed on its own.
