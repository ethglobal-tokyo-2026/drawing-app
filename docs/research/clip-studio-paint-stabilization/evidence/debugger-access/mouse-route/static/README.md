# Ordinary mouse route and isolated arithmetic probe feasibility

2026-10-09. Independent static follow-up using the original CSP 5.1.4 ARM64 image with SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. No process/UI access or mutations were performed. All addresses are unslid.

## Finite recommendation

Complete the real mouse event recording already underway to validate debugger operation, entry/return pairing, file persistence, and source down/drag/up boundaries. Label it an ordinary mouse event fixture, not a tablet stabilization fixture. The native mouse route observed so far does not execute the recovered common queue, and static routing independently explains a separate mouse callback.

After that, the useful hardware session is a short native tablet contact/move/lift (plus continued hover if native ending remains pending) using the prepared digitizer recorder. Its first purpose is to establish that real native packets hit the expected path, initial history is complete, and terminal outputs are captured. The recorder can stop and report completeness automatically. Saved complete input/settings allow repeated offline comparison of that captured case; other settings/device behaviors may need additional native captures.

A device-free deterministic test of original arithmetic is feasible in a separate machine-code emulator or carefully isolated native harness. It would test the actual instruction bytes on controlled queue state, not the native event producer, hardware pressure, screen mapping, scheduling, or pen feel. It should not be described as validating the entire native capture setup before a tablet is ever connected. This follow-up did not build or run that probe.

## Static callback assignment is resolved

Window installer `0x1021e3298` creates a 0xa8-byte callback table on its stack at `sp+0x60`. At `0x1021e3328` it stores the pair `0x1021e36d0`, `0x1021e3708` at table offsets `+0x30`, `+0x38` respectively. The same table stores `0x1021e3d8c` at `+0x70` (`0x1021e3378`). It passes this table to native window constructor `0x102079238`.

The constructor allocates 0x118 bytes for the legacy window and copies the callback table without rearranging its offsets at `0x1020792a0..0x1020792c8`. Thus window `+0x38` is the ordinary mouse callback `0x1021e3708`, while `+0x70` is the gesture callback `0x1021e3d8c`, for windows made through this installer. Runtime x8 at the previously supplied native dispatch breakpoint is still a useful independent check.

`0x1021e3708` obtains the window's context using `0x10207989c` and tail-calls `0x1021ef5d0` with context x0 and the original mouse packet x1. The latter is a 4548-byte view-event dispatch routine. It reads all mouse packet fields, selects a registered event identity by packet kind, builds a broader event parameter, and routes it to view/application handlers. It has no direct call to shared queue ingestion or the digitizer/gesture forwarding wrappers. This is not proof of an absence of distinct downstream mouse smoothing: the event dispatch crosses indirect/dynamic view handlers.

For the normal dispatch branch, `0x1021ef5d0` constructs the event parameter at stack `sp+0x50` and eventually routes it at `0x1021f0230` to `0x1021bb9a4` or an alternate application route at `0x1021f0220`. A bounded mouse record should not claim this downstream event parameter is a stabilized output without further tracing.

Evidence:

- [window-callback-installation.asm](evidence/window-callback-installation.asm)
- [native-window-create.asm](evidence/native-window-create.asm)
- [mouse-dispatch.asm](evidence/mouse-dispatch.asm)
- Companion [complete capture contract](complete-capture-contract.md) lists down/drag/up source dispatch addresses and packet fields.

## Gesture queue is a separate input family, including touch callbacks

Native `-[PWLegacyContentView touchesBeganCallback]` at `0x10205d880` obtains window `+0x70` and dispatches a kind-2 packet at `0x10205d8d0`. `touchesEndedCallback` at `0x10205d904` dispatches kind 3 at `0x10205d964`; `gesturesEndCallback` also dispatches through `+0x70`. The callback table resolves these to `0x1021e3d8c`, which looks up the gesture singleton and calls its dispatcher `0x1020d9308`. This explains gesture queue lifecycle resets independently of mouse.

Gesture processing is nevertheless connected to brush-tool code:

- The same tool configuration routine `0x102e18d58` configures both queue singletons. Digitizer configuration call is `0x102e18ec4`; gesture configuration call is `0x102e18f30`. The gesture call forces slow-motion flag w4=0 and retains the recovered fast-mode argument w3.
- Brush-processing function `0x10288d8ac` uses digitizer history timestamps when its input-type field at object+0xb8 is 2 or 3 (`0x10288e458..0x10288e4b4`), and gesture window H when that field is 4 (`0x10288e4b8..0x10288e4f0`). It skips these branches for other types. This does not by itself prove every name for that field, but the two-queue distinction is explicit.
- Native `currentPenTypeWithEvent:` at `0x102057a54` returns 1 for ordinary mouse, 2 for recognized tablet input, and 3 for the cached eraser device. Gesture begin/end constructors separately store 4 at packet+0x60. These facts are consistent with, but do not alone establish the entire transport of, the brush input-type field.
- Gesture pressure getter `0x10207d254` returns the constant 1.0 for a non-null packet. It is not a path for measured variable tablet pressure in this image.

Evidence:

- [native-touch-events.asm](evidence/native-touch-events.asm)
- [live-two-queue-configuration.asm](evidence/live-two-queue-configuration.asm)
- [brush-gesture-configuration.asm](evidence/brush-gesture-configuration.asm)
- [brush-tool-gesture-configuration.asm](evidence/brush-tool-gesture-configuration.asm)
- [native-pen-type.asm](evidence/native-pen-type.asm)
- [gesture-initialization.asm](evidence/gesture-initialization.asm)

Do not conclude that gesture processing is irrelevant to drawing merely from its class name. Do not conclude that ordinary mouse uses it merely because it shares the common queue's arithmetic.

## Isolated original-instruction probe: feasible, not yet implemented

The narrowest useful original-instruction targets are configuration `0x1021366bc` (180 bytes) and phase/pressure/ending adjustment `0x102137058` (440 bytes). Both operate on supplied state and fixed image constants without calls in their normal bodies. They can be emulated with mapped original instruction bytes, constant pages, controlled queue/position/pressure/phase buffers, a separate stack, and an instruction-count/time limit. This would independently exercise exact machine arithmetic against the portable references, provided ARM64 floating-point emulation is validated first.

A full short ingestion sequence is also practical but involves additional code:

- Ingestion `0x1021367c0`, append `0x1021369d0`, averaging/window `0x102136a5c`, phase `0x102137058`.
- Distance helper `0x102193618` is a 44-byte FMA/sqrt routine with no calls.
- Bounds helper `0x10221b72c` is a 144-byte numeric routine using the 1e-8 constant, with no calls.
- Normally the deque can allocate through `0x102137348` and free through `0x1021374fc`; its allocation path reaches application allocator imports and generic container helpers. A harness must either model those explicitly or preallocate sufficient valid deque blocks and stay within a declared bounded sequence that cannot grow/free storage. It must fail if execution reaches an unmodeled external address.
- A preallocated history is synthetic initial state, not evidence of the original constructor's allocation behavior. Do not promote it to a full app replay claim.
- Capture FPCR as part of a later native sample to check rounding/subnormal assumptions; an emulator should validate its FMA and conversion behavior with existing known ARM64 probes.

Avoid calling arbitrary internal functions in the running research application's GUI thread merely to bypass the missing input route. Such a call is a new experiment with its own memory, allocator, exception, and cleanup risks. The existing recorder deliberately avoids target expressions/function calls and should retain that property. An isolated host process with explicit bounded memory and no app documents provides a cleaner failure boundary for synthetic instruction experiments.

No isolated machine-code execution was performed, no new dependency was installed, and no stronger runtime-equivalence result is claimed here.
