# Workqueue-thread stop, 2026-10-11

The recording stopped because another thread reported an unexpected instruction-step exception. The evidence favors a debugger/OS stepping problem over an executed application trap, but does not establish the precise cause or a safe general rule for ignoring it. No native process was accessed for this diagnosis.

## Direct observations

The unchanged `tablet.jsonl` records 173 entries and 172 paired returns. At 8.616 seconds the main thread, ID 9595875, hit owned exit breakpoint `[2, 1]`. In the same stop, thread 10058914 reported stop-reason enum 6 and exception data `[6, 1, 0]`. The recorder enumerates all thread stop reasons before invoking an owned callback; rejection of the second thread therefore prevented saving call 173's exit snapshot.

The unchanged `debugger.log`, lines 4698–4712, identifies the second thread as thread 23 at:

```text
0x19cf8ccdc libsystem_pthread.dylib`start_wqthread + 4
bl 0x19cf8de78 ; _pthread_wqthread
```

The following instruction, at `0x19cf8cce0`, is `brk #1`. The reported PC is on the branch, not that trap instruction. The raw exception subcode is zero, not either instruction's address. No pen release was observed before the abort. Detachment was observed without cleanup errors at 8.619 seconds; the launcher's separate process check found the research process running.

The earlier `../tablet-live-s20-curve-20261011T165932Z/` recording has the same signature. Its `debugger.txt`, lines 3726–3741, shows an owned ingestion-entry breakpoint on the main thread, alongside thread 21 at the exact same `start_wqthread + 4` address and exception `[6, 1, 0]`. It aborted after 137 hover pairs, with no confirmed begin. This occurrence predates the change from event polling to bounded blocking waits.

## Primary-source interpretation

LLVM's `StopInfoMachException.cpp` classifies `[6, 1, 0]` as instruction-step completion; an ARM64 `BRK` carries its instruction address instead. An unexpected step completion can remain a Mach exception when that thread was not designated as stepping. Its `WasContinueInterrupted` implementation documents a Darwin hardware-breakpoint/watchpoint condition that produces such an exception during continue at an unchanged PC. That recovery requires previous-PC evidence which these recordings lack.

Source, particularly lines 646–700, 777–795, and 806–850:
https://raw.githubusercontent.com/llvm/llvm-project/main/lldb/source/Plugins/Process/Utility/StopInfoMachException.cpp

LLVM's ARM64 debugserver controls single stepping through `MDSCR_EL1.SS`. Its single-step setter updates the thread rather than the task. Hardware-breakpoint operations can also update task debug state. These facts explain relevant mechanisms, but do not prove that step state was inherited here.

Source, particularly `SetDBGState`, `EnableHardwareSingleStep`, and `EnableHardwareBreakpoint`:
https://raw.githubusercontent.com/llvm/llvm-project/main/lldb/tools/debugserver/source/MacOSX/arm64/DNBArchImplARM64.cpp

These upstream sources were consulted on 2026-10-11. They explain exception classification; they are not proof that the installed Apple LLDB build has identical implementation details.

## Remaining uncertainty and useful next experiment

The startup PC suggests a newly starting workqueue thread. The saved data does not establish when that thread was created, its previous PC, debug-register contents, exception-syndrome registers, or the debugger's step plan for it. A specific new-thread inheritance bug therefore remains a hypothesis. The records also do not establish an application crash or failure inside `_pthread_wqthread`.

A disposable native reproduction should create new dispatch/workqueue workers while hardware probes are active, retaining thread IDs, stop reasons, PC, and relevant debugger state. The earlier throughput benchmark's workers were already present and sleeping, so its success does not address this case. Keep arbitrary exception stops fatal; do not turn every reason-6 event into an ignored event based on these two observations.

No raw capture, saved summary, or recorder was modified. This diagnosis adds interpretation only and does not convert either recording into a complete stroke fixture.
