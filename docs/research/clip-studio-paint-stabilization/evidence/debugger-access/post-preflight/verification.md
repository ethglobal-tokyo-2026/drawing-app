# Post-correction preparation verification, 2026-10-10

Scope: capture and saved-file tooling. No actual post-correction invocation or native tablet stream was recorded in this preparation.

## Recorder checks

`check_post_correction.py` ran inside LLDB without an attached target, using simulated memory/registers. Eight checks passed: complete allocation bytes for four node classes; closed path with a null-terminated raw list; damaged links/owners/vtables with retained partial evidence; explicit node-count failure; path type versus independent node flags; original path freed and replaced; wrong thread/stack/holder/returned pointer rejection; and incomplete/nested entry rejection.

Development began with a failing import before the recorder existed. Independent static review then found that an early check incorrectly compared node attribute flags with class type bits. The fix uses path header flags and vtables, with arbitrary independent node flags in tests. Review also corrected the full wrapper span from `0x118` to `0x11c` bytes. All eight checks passed after these corrections. No target was run with the incorrect check.

A separate reviewer reran the host checks and emitted [this synthetic JSONL](post-recorder-host-crosscheck.jsonl) through the actual recorder methods using fake memory and registers. The post analyzer accepted one valid pair, with zero runtime helper comparisons and whole-curve equivalence not evaluated. Its [report](post-recorder-host-crosscheck.report.json) remains explicitly synthetic. This checks the producer/consumer contract, not CSP behavior.

The review found no remaining recorder correctness defect after the two fixes. Source-path lifetime, return pairing and cleanup sequencing were checked against the pinned static contract. External endpoint objects, actual UI-setting drift and device identity remain outside this recorder's observations.

## Live no-input check

[Debugger log](post-no-input-preflight-lldb.txt) and [raw JSONL](post-no-input-preflight.jsonl) preserve the run on research-copy PID 21626:

- Exact approved executable path and ARM64 process verified.
- All `0x11c` bytes from file VA `0x1028ed064` matched the pinned original executable.
- Hardware probes installed at `0x1028ed064` and `0x1028ed144`; no software fallback.
- Requested total eight seconds, five seconds of capture plus three reserved for cleanup. No input supplied; zero entries/pairs.
- Expected `CaptureError: capture_deadline_reached` at about 5.004 seconds; incomplete summary retained.
- Both probes removed, `Detach(False)` succeeded, matching detached state event observed. No cleanup error, warning, watchdog failure or deadline overrun. Final elapsed 5.120001792 seconds.
- Outer debugger timeout was 35 seconds; child exited 0. This exit code alone does not prove a complete fixture.
- Subsequent independent OS inspection returned `21626 S /private/tmp/csp-debug-research-20261009/CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT`.

The offline analyzer returned exit 2 and saved [an invalid-capture report](post-no-input-comparison.json), for the expected deadline, absent wrapper entry and absent paired operation. It did not reinterpret clean detachment as a successful capture. The setup check passed; the operation fixture is intentionally incomplete.

## UI dry run not completed

The window-control API failed before any automated stroke or brush-setting edit. Selecting the research path returned `timeoutReached`; selecting the bundle returned `cgWindowNotFound`; Finder selection also returned `cgWindowNotFound` after a tool stall of about 2,089 seconds despite a requested ten-second timeout. The native computer API did not expose a separate launch method. No alternative input injection, security change, forced quit or restart was attempted. The later debugger attachment found the process in its main message wait, and detached normally.

An actual mouse post-correction wrapper pair is still required to finish the dry run. No tablet is needed to troubleshoot this window-access issue. The live tablet recorder still awaits its first native pen recording as documented separately.
