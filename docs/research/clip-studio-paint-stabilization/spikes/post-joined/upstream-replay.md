# Ordinary upstream input replay

`upstream-replay.ts` exports `replayJoinedUpstreamCapture(text)`. It reads one
complete saved post capture with joined source diagnostics, reconstructs each
ordinary primary source record, and independently advances `PostMovement` from
the saved initializer arguments. It does not read expected record positions or
scalars to initialize either computation.

The result separates constructed-record and movement-state comparisons. A
missing observation or unsupported branch returns `incomplete` with a retained
error, never a successful comparison of a prefix. A complete comparison with
unequal fields returns `mismatch`. The enclosing capture provenance remains
`synthetic` or `runtime`. Upstream unit fixtures are synthetic memory even when
they exercise runtime validation rules; a separate source regression reads the
first real joined capture.

Four native mouse recordings on October 11 now match upstream records and
movement, source construction, and post correction. They compare respectively
3/4/3/4 constructed records and 2/3/2/3 movement states. Exact settings, hashes,
endpoint limits, and complementary tablet evidence are in
`native-validation-20261011.md`.

## Input mapping

The primary callers are begin `0x10288ad38`, direct append `0x10288e2d8`, and
fresh finish `0x102891848`. Their retained assembly is in `evidence/`. They call
constructor `0x10288cd3c`; append and fresh finish then call movement update
`0x1028f25b0` and store its result into constructed record `+0x20`.

| Saved observation                                          | Modeled input                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `constructorPointHex`, two binary64 values                 | Constructor position before offsets                                        |
| Brush `+0x128`, two signed int32 values                    | Position offsets                                                           |
| Event `+0xa0`, binary64                                    | Supplied pressure attribute                                                |
| Event `+0xa8/+0xac/+0xb0`, signed int32 values             | Bearing, inclination, rotation                                             |
| Brush `+0x190/+0x194`, signed int32 values                 | Startup length and position                                                |
| Brush `+0x148/+0x14c`                                      | Both must be zero in this profile                                          |
| Event `+0xc0`, uint32                                      | Constructed record metadata at `+0x54`                                     |
| Event `+0xd0`, signed int64                                | Movement timestamp                                                         |
| Begin initializer `enabledHex/windowHex/mBits/cBits/dBits` | Enabled, window, magnification fraction, coordinate factor, document ratio |
| Begin event `+0xb8`, signed int32                          | Movement device type                                                       |
| Movement `+0x60`, uint32                                   | Explicit reuse input; update does not change this field                    |

The first constructed movement scalar is zero, established by the constructor
and begin caller. Movement initialization uses the independently predicted
first constructed position. Every later update uses that record's predicted
position and its captured event timestamp. Its predicted result becomes the
record's movement scalar. Observed result `+0x88` is compared afterward.

The complete `0x58` constructed record is compared in binary64/uint32-sized byte
groups, including zero-initialized reserved bytes and caller metadata. Movement
comparison includes time mode, scale, count, limit, initial timestamp, short
interval flag, startup counter, current/previous positions, result, and every
retained deque timestamp. Allocation pointers and the deque's physical starting
slot are validated where needed to interpret the snapshot, not predicted.

Runtime input requires FPCR zero at every source boundary and both post
boundaries. Platform two requires the recorder's exact loaded instruction
proofs for `0x102194e64` and its constant-return target `0x102072aa4`; the
initializer must also retain `platformValue: 2`.

## Explicit limits

The reader rejects generated append calls, a finish that reuses a supplied
record, nonzero angle-source flags requiring external reflection getters,
missing/incomplete movement snapshots, and changed identities or sequence.
It accepts at most 256 source events and 256 saved timestamps per movement
snapshot. Arithmetic outside the existing pure input implementation's domain
is reported as incomplete.

If the initializer denominator is at most `1e-8`, native initialization retains
the object's previous scale. The shared implementation models a fresh scale
of one, so this branch requires the captured pre-initialization vtable and
scale to establish exactly one. A different or unobserved prior scale is
incomplete. The usual positive denominator branch assigns its scale directly
and does not use that prior value.

This comparison begins at the observed constructor inputs. It does not prove
browser acquisition, native event creation, coordinate transformation before
the captured point, output pixels, or identical pen feel. The source/post
comparison is a separate stage; neither stage alone establishes whole-feature
equivalence. The input brush-to-resolved-evaluator cache/copy conversion is not
replayed: downstream endpoint evaluation receives the independently captured
resolved configuration. Its identity need not equal the begin input brush.

## Joined command

`replay.ts` exports `replayJoinedCapture(text)` and composes upstream, source
construction, and post-correction comparisons. It reports `match` only when all
three match. An upstream failure does not discard an independently valid
source/post comparison. Invalid or missing observations produce an explicit
`incomplete` stage. The command returns nonzero for any result other than a
joined match and never overwrites an existing report.

```sh
node --experimental-strip-types docs/research/clip-studio-paint-stabilization/spikes/post-joined/replay.ts capture.jsonl new-report.json
```

`upstream-fixture.ts` contains literal synthetic expectations for all stages:
three input records produce source anchors `(3,2)`, `(4.5,4)`, `(9,10)` and the
corrected two endpoints `(3,2)`, `(9,10)`. No implementation produces its expected
bytes. The successful command invocation is retained in
`evidence/literal-joined.jsonl` and `evidence/literal-joined-replay.json`, both
explicitly synthetic. Five orchestration tests check complete agreement,
independent stage failures, retained downstream comparisons, and invalid input.

## Verification

Seven test groups cover literal distance/time/reuse cases, alterations to
expected records, alterations to all modeled movement fields and timestamps,
incomplete and unsupported observations, identity/sequence changes, runtime
instruction/FPCR requirements, and begin-record consistency. They use no
production function to generate expected records or states. The begin-record
consistency regression was observed failing before its check was added.

```sh
node --experimental-strip-types --test docs/research/clip-studio-paint-stabilization/spikes/post-joined/upstream-replay.test.ts
```

The post-boundary FPCR regression also failed before its check was added. The
historical native 99-to-eight correction still matches exactly after that
change; the new report is `../post-pipeline/evidence/replay-fpcr-20261011.json`.
That historical capture has no joined upstream observations and cannot pass
this upstream comparison.
