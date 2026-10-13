# Endpoint evaluator snapshot

`../live-capture/post_evaluator_capture.py` exports
`snapshot_evaluator(address, read_memory, load_address, budget)`. The caller supplies
the observed path `+0x88` pointer, stopped-process reads, translation from pinned
file addresses to loaded addresses, and its existing deadline check. The helper
does not import LLDB, attach, launch, evaluate code, or write target memory.

`evaluator.ts` exports `PostEvaluatorSnapshot`, `PostResponseSnapshot`,
`PostResponseCurveSnapshot`, and
`decodePostEvaluatorSnapshot(value, expectedImageBase?)`. The decoder returns the
authoritative `PostEvaluatorConfig`, or `null` for an explicitly captured null
pointer. Missing historical data, unread memory, unknown object types, and
incomplete records throw; none supplies constructor defaults.

## Raw layout and read bounds

The schema is `csp-post-evaluator/v1`. Hex addresses retain runtime pointer values.
Raw hex strings retain little-endian memory order; no decoded decimal is the
authority for a field.

| Record             | Raw fields                                                                                                | Validated provenance                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Evaluator          | `prefixHex`, exactly `0x630` bytes                                                                        | Vtable `0x104a495f0`; allocation `0x740` at `0x1024c1290` |
| Main response      | `bytesHex`, exactly `0x58` bytes, copied from prefix `+0x88`                                              | Embedded response vtable `0x104a493b0`                    |
| Secondary response | `bytesHex`, exactly `0x58` bytes, read separately at evaluator `+0x630`                                   | Same embedded response layout                             |
| Present curve      | `headerHex` (`0x68` bytes), `countHex` (4 bytes at `+0x168`), `controlsHex` (`count*16` bytes at `+0x68`) | Vtable `0x104a491a0`, signed count `0..16`                |
| Null curve         | Address `0x0`, state `null`, all three raw strings empty                                                  | The response pointer was actually zero                    |

Both responses are embedded objects, not optional pointers. Each has three curve
pointer slots at `+0x28`, `+0x38`, and `+0x48`. A present curve with zero controls
decodes to `[]`, while a null pointer decodes to `null`.

The helper checks the first eight bytes before reading a known evaluator or curve
layout. All reads are checked against unsigned 64-bit address bounds and the
caller's deadline. The maximum snapshot makes **27 reads totaling 3,912 bytes**:
two responses and six distinct maximum-sized curve observations. Shared curve
pointers may be observed repeatedly; no unobserved cache is substituted. No
inactive control slots or unrelated pointed-to objects are read.

Each record carries `complete` and `errors`. Failed reads preserve earlier raw
bytes; a short read preserves the bytes returned and is incomplete. A null
evaluator makes no memory reads and carries empty `prefixHex` and null response
records. A nonzero unread evaluator remains `state: "present"`, incomplete.

The six response binary32 values, secondary binary64 base, and all active control
coordinates must be finite. Controls must have nondecreasing x. All unsigned
response flags remain intact: the reconstructed evaluator compares exactly one
and tests specific bits, so other bits are not silently removed. These checks
define the implemented finite arithmetic domain; they do not claim all possible
native objects fit it.

The exact field/constructor instructions already reside in
`../post-evaluator/evidence/1024c11e4.asm`, `1024c0dc0.asm`, `1024af65c.asm`,
`1024a925c.asm`, and `1024c497c.asm`, for CSP 5.1.4 ARM64 SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.

## Recorder and replay integration

The existing post-wrapper recorder adds optional `path.endpointEvaluator` to
entry and return snapshots. Any incomplete evaluator snapshot makes that path
incomplete while retaining its graph and raw diagnostics. Older saved captures
remain unchanged and lack the field.

`../post-pipeline/replay.ts` requires paired evaluator observations when either
boundary has one. It checks each evaluator address against that path's raw
pointer and each image base against the capture header, rejects configuration
drift, and constructs the endpoint callback from the entry configuration only.
Returned geometry never configures the prediction. Historical non-null pointers
without these snapshots still produce `"unknown"`; historical observed null
path pointers retain the existing absent-evaluator behavior.

Snapshot validity is not runtime authenticity. The enclosing recorder/reader
must still verify image identity, boundary instructions, stopped-process reads,
pairing and clean completion. This post-wrapper capture also does not contain
upstream source-call inputs or measure natural pen latency.

## Verification

The helper has 13 host tests; integration has 11 LLDB-host tests without a native
target. Seven decoder test groups include the Python helper's actual JSON shape,
and three replay groups cover observed callbacks, historical absence, malformed
data, pointer mismatch and configuration drift. Existing analyzer tests pass.

`evaluator-memory-fixture.json` is explicitly simulated host memory, not captured
brush settings or native proof. It was produced using the helper with
`check_post_evaluator_capture.Memory(fixture())`; the TypeScript test consumes it
without translating fields. The fixture's expected numeric values are literals.

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/live-capture/check_post_evaluator_capture.py
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs --test docs/research/clip-studio-paint-stabilization/spikes/post-joined/evaluator.test.ts docs/research/clip-studio-paint-stabilization/spikes/post-pipeline/replay.test.ts docs/research/clip-studio-paint-stabilization/spikes/post-replay/analyze.test.ts
```
