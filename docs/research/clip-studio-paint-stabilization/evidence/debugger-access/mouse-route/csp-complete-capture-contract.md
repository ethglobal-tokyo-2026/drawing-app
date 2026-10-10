# Complete capture contract investigation

2026-10-09. Read-only static analysis of the original CSP 5.1.4 ARM64 image, SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. All addresses below are unslid. No target process, UI, settings, or repository files were changed by this subtask.

## Immediate corrections

1. The existing two-breakpoint recorder records `PWPacketQueue` ingestion, shared by two distinct derived queues. Four direct call sites exist: digitizer normal `0x1020be030`, digitizer flush `0x1020bdeec`, gesture normal `0x1020d977c`, and gesture flush `0x1020d9608`.
2. Digitizer singleton is `0x104d63f80`, size 256; gesture singleton is `0x104d64608`, size 248. Reading 256 bytes unconditionally overreads gesture allocation by eight bytes. A common queue snapshot of `0xec` bytes covers the entire common object. Optional derived fields can be read after proving queue type by its vtable/RTTI or singleton identity.
3. `max_samples` matched pairs is not a stroke completion condition. `fixture_complete=false` is correct for the present helper.
4. Ordinary mouse has a separate event dispatch route. A mouse stroke that bypasses shared queue ingestion cannot validate the recovered digitizer arithmetic merely because it appears on the canvas.

## Ordinary mouse routing and next observation

Objective-C metadata identifies:

| Method | Entry | Event dispatch instruction |
|---|---|---|
| `-[PWLegacyContentView mouseDown:]` | `0x10205c7fc` | `blr x8` at `0x10205cb9c` |
| `-[PWLegacyContentView mouseDragged:]` | `0x10205c2ec` | `blr x8` at `0x10205c4d4` |
| `-[PWLegacyContentView mouseUp:]` | `0x10205cc64` | `blr x8` at `0x10205ce3c` |

At all three dispatch instructions, x0 is the legacy window object, x1 points at the constructed event packet, and x8 is the downstream callback address loaded from legacy-window `+0x38`. Capturing the loaded x8 at mouseDown identifies the exact next function without a target expression or function call. Its runtime callback target is not statically established in this investigation.

The mouse packet has:

- `+0x00`: i32 event kind. Down constructs 4 or 5 for left-button single/double variants; drag 1; up 6. Read the actual kind rather than infer click parity.
- `+0x08/+0x10`: f64 x/y converted with `convertPoint:fromView:nil` into the content view, not the digitizer screen-space coordinates.
- `+0x18`: i32 button bits.
- `+0x50`: signed64 milliseconds, truncating `NSEvent.timestamp * 1000`.
- `+0x58`: f64 pressure. Ordinary mouse is 1.0 in these constructors; down reads native pressure only for subtype 1. Up also stores 1.0, so a generic "up means pressure zero" rule is incorrect for this packet.
- The methods initialize through `+0x88`; retain 0x90 bytes if capturing the entire known stack record and retain its raw bytes, since not every field is semantically resolved.

MouseDown's digitizer call is conditional at `0x10205c9d4..0x10205c9fc`; mouseUp's at `0x10205cd20..0x10205cd40`. The `isTabletEvent:` implementation `0x102057120` returns true for NSEvent type 23 or 24, otherwise only subtype 1. Ordinary `sendEvent:` drag also gates the tablet path by `isTabletEvent:` (`0x102053bf4..0x102053c0c`). These facts explain why an ordinary mouse event can avoid the digitizer queue, but do not prove that no downstream mouse-specific stabilization exists. The legacy callback needs tracing before that stronger claim.

Evidence newly generated in `/private/tmp`:

- `csp-view-mouse-events-selectors.asm`: complete functions in `0x10205c05c..0x10205d010` (final range can end partway through a later method), with decoded selector names.
- `csp-mouse-send-event-selectors.asm`: complete `sendEvent:` function.
- `csp-is-tablet-event.asm`: complete predicate function.
- `csp-mouse-queue.asm`: gesture queue neighborhood; initial/final range include adjacent partial functions.
- `csp-complete-capture-refs.txt`: all direct shared-ingestion and reset callers found in image text.

## Ingestion pairing and complete-history conditions

Entry remains `0x1021367c0`; common exit before stack restoration remains `0x1021369ac`. All returns, including bypass and suppressed output, reach this exit. Pair per thread and nested call stack; retain x0 queue, x1 phase pointer, x7 output pointer and entry SP, then require exit SP=entry SP-0xb0. Capture x30 at entry as well: normal digitizer return address is `0x1020be034`, digitizer flush `0x1020bdef0`, normal gesture `0x1020d9780`, gesture flush `0x1020d960c` after module slide. This is a stronger caller-role discriminator than semantic names from stripped stack frames.

For a replayable segment, either:

1. Observe empty history immediately before the first included ingestion: both common queue `+0x30` available-record count and `+0x38` collected count equal zero; retain full common state because reset does not clear all fields; or
2. Save all out-of-line history present at the first entry. A 236/256-byte queue snapshot alone is insufficient.

Deque extraction, oldest to newest, follows the actual index calculation at `0x102136f18..0x102136f38` and `0x102136fc8..0x102136fe4`:

```text
mapBegin = u64(queue + 0x10)
mapEnd   = u64(queue + 0x18)
front    = u64(queue + 0x28)
count    = u64(queue + 0x30)
for i in 0 .. count-1:
    logical = front + i
    blockSlot = mapBegin + 8 * (logical >> 7)
    block = u64(blockSlot)
    record = read32(block + 32 * (logical & 127))
```

Check counts/ranges before reads; preserve raw bytes and order. Each record is f64 x/y/pressure followed by i64 timestamp. In the observed normal bounded domain, count and collected count should agree and be <=1000; explicitly fail a fixture if invariants differ instead of silently clamping. Configuration and reset can occur between ingestion calls, so retain all entry/exit state and reject unexplained state changes or record those mutations separately.

Reset common epilogue `0x1021372a4` is a useful third hardware breakpoint: x19 is queue, reset is complete, and state/H must still be read rather than assumed cleared. Reset sets count at +0x30/+0x38 to zero and clears output/pressure histories, but leaves state+0x88, H+0x58, last emission time+0x78, decline flag+0xd8, and retain-at-zero+0xdc untouched.

## Digitizer completion

A relevant begin is input phase 2 with pre-state 0; its emitted output phase 2 and post-state 1 establishes a new active sequence. Ordinary end input phase 3 may only change state 1→2 and output phase back to 1. It is not sufficient to observe the physical button release or one input phase 3.

Require a final emitted phase 3 with post-state 0, after actual end input or an observed terminal flush. Capture every intervening ingestion, including synthetic ones and suppressed outputs. Output-only sampling loses queue evolution.

Digitizer terminal flush `0x1020bde40` repeatedly calls shared ingestion with pressure=0, fixed terminal position/time, catchUp=0, gating=0 and the packet bypass. The phase remains 1 until termination. To prove the wrapper has actually finished (rather than merely seeing its final arithmetic), use terminal-flush completion address `0x1020bdf38`: x21 is queue, x20 input packet, x19 callback object, phase at sp+4, output packet at sp+8. This is before destruction; require phase !=1 and state=0. Entry/exit, reset completion, and this completion observation use four simultaneous hardware breakpoints.

Current recorded terminal mode=1 can forward a phase-3 input without running the explicit flush, and leave state 2 until later input. Thus no flush completion hit is not itself a failed capture; certification must follow actual state/phase behavior and distinguish a completed queue segment from a stopped recording. An input event occurring after release may be needed to drive native pending-end behavior, and should be recorded as part of the sequence.

## Gesture queue is different

Vtable `0x104a2c250` has RTTI `Planeswalker::PWGesturePacketQueue`; digitizer vtable `0x104a2adf8` has RTTI `Planeswalker::PWDigitizerPacketQueue`; common base vtable `0x104a306a8` is `PWPacketQueue`.

Both gesture ingestion callers pass timestamp=0, catchUp=1, gating=0, interval=0, bypass=0. They therefore cannot use native millisecond cadence or the digitizer catchUp=0 assumptions. Gesture reset happens from dispatcher `0x1020d9308`, call at `0x1020d9454`.

Gesture terminal helper `0x1020d9514` explicitly sets state 2, chooses pressure 1.0 when decline flag=0 or zero otherwise, and iterates ingestion with phase initially 1. It can terminate either on emitted phase 3 or an explicit finite-count condition. The latter forces state=0 at `0x1020d964c`, enables timestamp gating at `0x1020d9658`, clears the output synthetic flag at `0x1020d9664`, and overwrites final output with the last input position/selected pressure at `0x1020d9678`.

Consequently, shared ingestion entry/exit cannot alone certify the final gesture output. Observe `0x1020d967c`: x20 queue, x19 output, w26 forced-finish condition, before epilogue. Entry/exit + reset completion + gesture terminal completion again uses four simultaneous hardware breakpoints. Do not require a phase-3 ingestion if the observed native path explicitly forces completion after the loop.

## Minimal implementation recommendation

First identify actual caller family at runtime. The existing ingestion breakpoint catches both common-queue callers, but root's ordinary mouse attempt has zero hits. Next use the mouseDown dispatch breakpoint above to inspect the actual legacy callback, then trace its bounded call path. Capturing mouse packets is a useful recorder validation, but it is not a substitute for capturing native tablet filter inputs/outputs.

For a complete queue recorder, save initial out-of-line history, raw common state, each ingestion and caller return address; track begin/end; use one correct family-specific terminal completion observation; stop only after a certified completion, with call count and deadline as failure bounds. Add source-event kind or wrapper events to distinguish native release from pressure-driven early completion. Preserve terminal wrapper output after any post-ingestion writes. Record failures and missing phases explicitly.

A deterministic internal queue probe would be a distinct experiment: original instructions and arithmetic on controlled data, not a mouse/pen device capture and not pen-feel proof. It would need its own safe isolated-execution design and authorization before target allocations/calls; this read-only investigation has not implemented or run one.
