# Native joined validation, October 11, 2026

Four automated mouse recordings match the reconstructed upstream input,
movement, quadratic source construction, and ordinary post correction with
**zero compared field differences**. No manual input was needed for these
recordings. This validates the recorded cases; it does not establish universal
CSP equivalence or identical pen feel.

The image is CSP 5.1.4 ARM64, SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
Each capture has one paired correction entry/return, complete upstream/source
observations, FPCR zero, no unmatched entries or cleanup errors, successful
detach, and a separate launcher check confirming the process resumed. Debugger
pauses change timing; capture elapsed time is not a latency measurement.

## Captured configurations and counts

All four have movement enabled, device type 1, platform 2, window 20,
coordinate factor 1, and document ratio 1. Source construction has
`deferFirstNode=false`, no fade adjustment, and no corner detection. All
constructed pressure inputs equal one. Correction uses `k=40`, `closedMode=0`,
and `selector482=0`.

| UTC capture time | Magnification fraction | Source records / movement states | Source → subdivided → result nodes | Speed flag480 |        Tolerance |       Length scale | Path parameter |
| ---------------- | ---------------------: | -------------------------------: | ---------------------------------: | ------------: | ---------------: | -----------------: | -------------: |
| 23:05:56         |                      1 |                            3 / 2 |                         3 → 67 → 2 |             0 |              160 |                  1 |          14.75 |
| 23:09:54         |                    0.5 |                            4 / 3 |                         4 → 65 → 2 |             0 |              320 |                  2 |          14.75 |
| 23:11:18         |       0.33333251953125 |                            3 / 2 |                          3 → 3 → 2 |             1 | 480.001171877861 | 3.0000073242366314 |            7.5 |
| 23:13:50         |       0.33333251953125 |                            4 / 3 |                          4 → 4 → 2 |             1 | 480.001171877861 | 3.0000073242366314 |            7.5 |

The latter three runs had display-magnification adjustment enabled; the last two
also had speed adjustment enabled. UI brush sizes were 29.5, 29.5, 15, and 15; recorded
path parameters are their halves. The third drag was requested as five by two
screen pixels; the fourth was one screen pixel horizontally. Their actual
retained geometry is the comparison evidence.
The final tolerance and length-scale bits are `407e0004cccd9168` and
`40080003d70adaba`, respectively.

Each captured endpoint evaluator has the same decoded configuration:

- Main response flags 17; minimum `0.09999999403953552` (binary32 `3dcccccc`).
  Input-one minimum/maximum are 0/1; input-two, random, and input-four minima
  are zero. Its pressure curve controls are `(0,0)`,
  `(0.3,0.5636363636363636)`, `(0.6727272727272727,0.9090909090909091)`, `(1,1)`.
  The other two curve pointers are explicitly null.
- Secondary response flags zero, all minima zero, input-one maximum one,
  all three curve pointers null; secondary disabled, base one.
- Brush bit-four flag false; adjustment mode one.

These are resolved native settings, not constructor defaults. The source begin
input brush can be copied or matched to a cached object before storage at path
`+0x88`. That transformation/cache selection is not replayed; the endpoint stage
uses independently observed resolved configuration. See
`evidence/native-joined-20261011T230556-resolver-review.md` for the exact setter
and resolver instructions. The original incomplete report from the overly
strict pointer-equality guard remains unchanged.

## What the comparisons cover

Upstream predicts each complete `0x58` source record from separate constructor
position, brush, event, and movement inputs, then compares its bytes. Movement
initialization and subsequent updates are modeled continuously and compared
against every retained modeled state field and deque timestamp. Expected
record values do not seed those predictions.

Source construction predicts ordered position/control binary64 bits, seven
binary32 scalar fields, node flags, endpoint data, and path flags. Post replay
uses the observed source geometry independently and compares all retained
result fields and adjacency. Intermediate subdivision/removal traces describe
the reconstruction; they were not separately probed inside CSP.

The first three recordings' endpoint passes exit at the travel limit with zero removals and no
endpoint-adjustment decisions. The first segment lengths are
432.3426488511459, 883.5036011705026, and 22.08764392298229, against respective
limits 14.75, 14.75, and 7.5.

The fourth recording's segment length is 4.101572507812477, below travel limit
7.5. Both modeled passes reach the evaluator-dependent decision, compute
threshold 7.125 from the captured configuration, retain the endpoint, and end
with no removal. The native returned geometry matches those retained endpoints.
The threshold and branch trace are reconstruction outputs, not separate native
interior probes. This adds complete-path agreement for a case that reaches
the endpoint decision; it does **not** establish actual endpoint deletion or
variable-pressure behavior in a native stroke. The separate extracted-instruction
evaluator oracle covers 680 configured numeric outputs, including those
arithmetic branches; its synthetic inputs remain distinct from a real stroke
observation.

The subsequent selected-profile oracle adds **1,530 exact binary64 outputs**
using this captured configuration: 90 pressure-curve outputs and 1,440 endpoint
outputs over 90 retained binary32 pressures and 16 path parameters. It checks
364 unchanged instruction words and 84 relocations at FPCR zero. See
`../post-evaluator/evidence/selected-profile-20261011T2345/README.md` and its
immutable `comparison.json`. This extends synthetic arithmetic coverage without
turning it into a variable-pressure native stroke observation.

Browser/OS event acquisition, transforms before the captured constructor
point, brush cache/copy conversion, rendering, every brush/mode, and natural
timing/feel remain outside this comparison. Generated/reused source calls and
unsupported reflection branches still report incomplete.

## Complementary native evidence

- The curved post-only recording
  `evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl`
  has 99 input nodes and eight output nodes, all compared fields matching.
  Input SHA-256 is `c58ad8bf883500013717aa56bcbeedecf270ec9c68d5b30ed6b91db2dbd6452a`;
  report `spikes/post-pipeline/evidence/replay-fpcr-20261011.json` has SHA-256
  `5082e9d8f884c286f1ac18ef80cf5bba8967ac56d60b3011982dba3b95ebc115`.
  It lacks joined upstream inputs and recursive evaluator configuration. Its
  endpoint travel-limit exits independently make output geometry insensitive
  to that missing evaluator in this case.
- Complete tablet queue recordings at S0/T0 and fixed S20/T0 compare 115 and
  311 ingestion calls exactly, including observed native release and final
  source-handler return. Input SHA-256 values are
  `cf3bb7c761de415dea8286c9a3b1249c26b91adcc7ed529ec6043f3e2464876a` and
  `68a60bc01d3cdda720f7360d12438925aef7087ce544372a7cd087135ff612e6`.
  Reports are `native-s0-comparison-final.json` and
  `native-s20-comparison-final.json` under
  `evidence/debugger-access/stabilization-fused-arithmetic-20261011/`.
  They prove queue arithmetic for those streams, not post correction or
  natural pen latency. Fast/slow live modes and nonzero taper still lack a
  complete native queue comparison.

All paths in this section are relative to the stabilization research root.
The tablet, curved-post, and joined-mouse records are separate observations,
not one uninterrupted tablet-to-rendered-result proof.

## Immutable joined artifacts

Raw `joined.jsonl` files live below the research root's
`evidence/debugger-access/`. Reports live in this folder's `evidence/`.

| Capture folder                                 | Report                                               |
| ---------------------------------------------- | ---------------------------------------------------- |
| `post-joined-20261011T230556.990852Z-2249f1a0` | `native-joined-20261011T230556-resolver-report.json` |
| `post-joined-20261011T230954.155622Z-06a7725b` | `native-joined-20261011T230954-report.json`          |
| `post-joined-20261011T231118.293795Z-13bb29c6` | `native-joined-20261011T231118-report.json`          |
| `post-joined-20261011T231350.071015Z-28e08788` | `native-joined-20261011T231350-report.json`          |

| UTC time | Raw capture SHA-256                                                | Report SHA-256                                                     |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 23:05:56 | `b02068367c020a8fecb3266e4b1213000d3292a16d5b40966cbb6a1b6515a104` | `6479a9f177eecd5c7b80a908ba37ce8a54ebe373fade6877c7efa4e949abf363` |
| 23:09:54 | `eda6a383ae468b8ca945cdcdd923a86944ba775a7b4d140a11437208df82f216` | `a9f6efa5e87a536cf91dfcdbb70487a7bb1944810c0e03370ec2e4ac9f9a38ed` |
| 23:11:18 | `554ed78a3c103800fde45a6abbd272e0740b83ec1e47c6820ae09dc3f27610dd` | `3a27d148e59d7b4d65c3fa988140e7e2a842f080175923a6d91c7b1ddf0a3eef` |
| 23:13:50 | `f0da0df84703a0cccd2df5c731bcc592641368c03f3b6f18bc981822ac235b38` | `7dc8b70b03273e49d81b250ab744c2f30282d533855de9fc577a3ee5f1a300e3` |

Raw captures, debugger snapshots, failed reports, and the pinned binary remain
local research evidence; they are not release-commit contents. This report
does not modify or replace any previous observation.
