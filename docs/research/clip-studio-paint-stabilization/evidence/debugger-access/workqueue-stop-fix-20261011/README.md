# Recovery for the observed workqueue single-step stop

The tablet recorder now handles the specific secondary-thread stop that aborted
the 16:59 and 17:38 UTC captures. It preserves the simultaneously stopped owned
capture callback, including the input/output snapshot that the old recorder
discarded. It does not change CSP instructions, registers, memory, brush settings,
or stabilization arithmetic. All previous raw captures remain unchanged.

## Evidence and decision

Both actual failures reported exception data `[6, 1, 0]` at
`libsystem_pthread.dylib`'s `start_wqthread + 4`, alongside a valid owned hardware
probe on the input thread. Apple XNU's `handle_sw_step_debug` clears the single
step state before reporting that exact instruction-step completion; ordinary
breakpoint handling reports the instruction address instead. This distinguishes
the observed event from execution of the following `BRK` instruction.

Primary source:
https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/osfmk/arm64/sleh.c

The cause of the unexpected step remains unproved. The recovery is deliberately
limited to the observed system startup location and a single unambiguous owned
capture stop. It does not depend on explaining how the secondary thread acquired
its step state. See the [original diagnosis](../tablet-manual-20261011T173815.294680Z-bf864636/stop-diagnosis.md)
for that remaining uncertainty and the distinction from LLVM's separate
unchanged-PC workaround.

## Conditions for recovery

- Exact instruction-step exception `[6, 1, 0]`; exactly one secondary exception
  and one owned hardware breakpoint with a verified location and PC.
- Secondary thread has never supplied a capture callback or native input source
  and has no ingestion role. It differs from the owned callback's thread.
- Exact system module path, nonempty UUID, `start_wqthread` symbol, and PC at its
  start plus four bytes. The current instruction must be `BL` to the start of
  `_pthread_wqthread` in the same module; the following instruction must be `BRK #1`.
- Advancing, unchanged stop ID during inspection. At most one recovery per
  secondary thread and four per recording.

The full stop is validated before invoking the owned callback exactly once.
Every accepted recovery retains raw exception data, module identity, addresses,
instructions, branch target, probe identity, and role checks. Summary details
and a visible launcher warning preserve that decision. Normal continue, or
normal detach after a completed final callback, resumes execution. No exception
is converted into a fabricated input/output pair. All other stops remain fatal.

## Verification

- `regression-before-explicit.txt` runs the recorded simultaneous-stop pattern
  against the immutable recorder snapshot used at 17:38. It reproduces the old
  abort before the owned callback. The first unittest-output harness did not
  produce its completion marker; that attempt is retained separately and is not
  treated as a successful verification.
- `regression-after.txt` contains seven recovery test groups plus the existing
  shared, 30 tablet, eight post-correction, mouse, and maximum-history checks.
  Negative cases reject wrong exceptions, module/PC/instructions, branch target,
  thread roles, repeated events, limits, stale stops, and wrong probe locations.
- `launcher-tests.txt`: nine tests; recovery warnings survive incomplete captures.
- `reader-tests-final.txt`: 90 tests; recovery provenance, the following owned
  callback's kind/thread, and summary consistency are checked without relaxing
  complete input/release/cleanup requirements. Independent review identified the
  callback-link gap in the initial reader implementation; additional failing
  regressions and a strict next-record check resolved it.
  `reader-types-final.txt` records strict TypeScript verification.
- `native-s0-comparison-final.json`: the existing complete native S=0 baseline remains
  exact across all 115 included calls.
- `native-startup-context.json`: the actual native metadata/instruction guard
  passed on a real workqueue thread in a disposable program. The module UUID was
  `5A1828C3-CBC2-3B85-BD07-C8ED10021A41`; bytes at `0x19cf8ccdc` were
  `67040094200020d4`. The program completed normally in about 0.27 seconds.
  This was an intentional hardware stop, not reproduction of the exception.
- `csp-no-input-preflight/`: the revised recorder verified the pinned research
  executable, installed its four hardware probes, reached the expected no-input
  deadline, and detached cleanly in 5.12 seconds. An independent process check
  confirmed CSP resumed. The requested eight seconds includes cleanup reserve.

## Native reproduction limits

The stronger standalone creation experiment also remains useful negative
evidence. Its first setup attempt stopped in dyld before the required library
symbols were loaded; the corrected bootstrap stops at `main` with a hardware
probe. The workqueue-SVC variant reached its 20-second deadline without completing
a wave and was terminated; it did not reproduce `[6, 1, 0]`. The pthread-SVC
variant completed all 64 fresh-thread iterations in 1.62 seconds without that
exception. No reproduction attempt modified CSP or disabled an error check.

The exact old abort is covered by the deterministic host regression, and the
native lookup path is verified, but resuming this exception during a real CSP
tablet stroke has not yet been observed. The updated local command is ready for
one short tablet retry. That remains the complete end-to-end check; none of the
automated results here is labeled a successful tablet stroke or matching pen feel.
