# Live-input capture preparation and checks

2026-10-09 local session (final capture UTC 2026-10-10): **complete native mouse-route recording passed**, including down, drag, up, and the up callback's return on the same thread and stack. Detachment was acknowledged and observed, with no cleanup errors and a 7.738-second total. The saved raw packets were decoded independently afterward. The canvas displayed the stroke, and a separate OS check found the research process in state `S`. Tablet entry/exit pairing remains unvalidated.

The original helper supports the first input/output contract check described in [runtime capture](../../runtime-capture.md). It does not record a complete stroke replay or establish natural drawing latency. **Ordinary mouse input uses a separate native route.** Its packet layout and release pressure also differ from the digitizer path. A visible mouse stroke does not prove that the recovered tablet filter ran. See the [complete-capture investigation and assembly](../../evidence/debugger-access/mouse-route/csp-complete-capture-contract.md).

## Verified mouse recording

- [Native mouse capture](../../evidence/debugger-access/mouse-route/mouse-route-event-driven.jsonl): one down, one drag, one up, and the return after the up callback. Raw packet bytes, decoded fields, callback address, window/thread identity, instruction verification, and cleanup status are retained.
- [Debugger output](../../evidence/debugger-access/mouse-route/mouse-route-event-driven-lldb.txt) and [independent saved-data verification](../../evidence/debugger-access/mouse-route/mouse-route-independent-verification.json).
- [Static route evidence](../../evidence/debugger-access/mouse-route/static/README.md) explains the separate mouse and tablet routes. Observed callback `0x1021e3708` agrees with the independently traced assignment.

The first delivered click produced [zero tablet-filter calls](../../evidence/debugger-access/mouse-route/mouse-pair-check.jsonl), confirming the need to distinguish routes. The first mouse-route attempt recorded down and then [failed on a debugger state transition](../../evidence/debugger-access/mouse-route/mouse-route-complete.jsonl). It polled public process state, which could remain stopped after continue while thread stop reasons were already cleared. The shared recorder now waits for a matching process state-change event, logs automatically restarted stops, and reads registers only after a new stable stop. The failed file's name contains `complete`, but its summary is explicitly false; the file remains unchanged.

This successful mouse check verifies recorder mechanics and release-boundary handling. It contains one coalesced drag sample, and all three packets have the same native timestamp, `41922872 ms`. It cannot validate speed-dependent behavior, sampling density, or latency. It does not capture tablet filter inputs/outputs, post-correction curves, final-render completion, or pen feel.

The mouse helper is [capture_mouse_route.py](capture_mouse_route.py), with [host checks](check_mouse_route.py). Inside an LLDB session already controlling the approved research process:

```text
(lldb) script import sys; sys.dont_write_bytecode=True; sys.path.insert(0, "/absolute/path/to/live-capture"); import capture_mouse_route as mouse
(lldb) script mouse.run(lldb.debugger, PID, "/absolute/path/to/new-mouse-capture.jsonl", timeout_seconds=30, max_events=128, research_executable="/absolute/path/to/CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT", original_arm64="/absolute/path/to/original-arm64")
```

It requires at least one drag and the up callback's return. A click alone, missing up, changed window/thread, regressing timestamp, or event limit produces an incomplete result. It uses three active hardware breakpoints and exchanges the up-dispatch breakpoint for the following instruction to observe return. `mouse_route_complete` and `digitizer_fixture_complete` are separate fields; the latter is always false here.

## Prepared tablet recorder

[capture_tablet_stroke.py](capture_tablet_stroke.py) is a separate digitizer recorder, with [host checks](check_tablet_stroke.py). Its live tablet behavior remains unvalidated. It retains complete initial hover history when a new stroke begins, all matched ingestion calls including suppressed outputs, raw state/settings, the floating-point control/status registers, native source-event observations, and the final queue output. Gesture calls are identified and explicitly excluded from the digitizer fixture.

All 27 tablet host checks passed and were rerun by an independent reviewer. A subsequent [no-input preflight](../../evidence/debugger-access/tablet-preflight/tablet-no-input-preflight.jsonl) on the research copy verified 528 ingestion bytes, 608 dispatcher bytes, and 320 terminal-wrapper bytes against the original. All four hardware breakpoints installed together. The expected timeout retained zero inputs and `fixture_complete=false`, then detached cleanly within 5.119 seconds of the eight-second total budget. A separate OS check found the process in state `S` afterward. [Debugger output](../../evidence/debugger-access/tablet-preflight/tablet-no-input-preflight-lldb.txt) also confirms that `fpcr`/`fpsr` are readable, observed as `0x00000000`/`0x08000015` on the stopped main thread. These values are not assumed to apply forever; each captured pair records them again.

Actual pen packet decoding, initial-history extraction on live pen input, breakpoint rotation during a tablet stroke, reconstructed numerical equality, and feel remain unvalidated. The preflight is a passing setup check with an intentionally incomplete stroke record.

Four hardware observations cover shared entry/exit, terminal-wrapper completion, and native dispatcher entry. The fourth slot rotates to a verified return instruction while observing release or a later source handler needed to finish the stroke. It checks thread and stack identity before treating the handler as returned. Queue completion and physical release are separate conditions; a fixed call count or an end marker alone does not certify the fixture.

The [independent audit](../../evidence/debugger-access/tablet-preflight/independent-audit.md) records one remaining precision limit: if pressure ends the filtered stroke before physical release, the recorder directly observes the later release handler's return. It relies on sequential dispatch for the earlier producer's return and does not independently exclude event reentry from that earlier callback. A new active segment before release is rejected. These constraints must remain visible when interpreting a future successful fixture. The separate [maximum-history check](check_tablet_max_history.py) verifies exact extraction of 1,000 records across nine blocks without a target process.

The capture is bounded to 512 ingestion calls, 2,048 source events, and a requested maximum of 30 seconds with three seconds reserved for cleanup. Native debugger calls can still exceed their budget; overruns remain failures in the saved summary. Initial history is limited to the traced 1,000-record queue domain, with no silent truncation. Unsupported sequences, changed settings, unmatched calls, missing history, or timeouts are retained as incomplete outcomes.

```text
(lldb) script import sys; sys.dont_write_bytecode=True; sys.path.insert(0, "/absolute/path/to/live-capture"); import capture_tablet_stroke as tablet
(lldb) script tablet.run(lldb.debugger, PID, "/absolute/path/to/new-tablet-stroke.jsonl", timeout_seconds=30, max_calls=512, research_executable="/absolute/path/to/CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT", original_arm64="/absolute/path/to/original-arm64")
```

For the later hardware check, wait for the recorder's active cue, make one short contact/move/lift, and leave the pen hovering briefly so native deferred ending can finish. Check the saved summary before drawing anything else. A complete recording can be reused for repeated numerical comparison of that case; different settings and device behaviors may still need additional recordings. Natural feel and latency require a separate uninstrumented check. The recorder does not yet compare the captured stream against a complete reconstructed queue automatically.

## First attempt: retained observations

| Observation                             | Result                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Process/build                           | Research-copy PID 21626; ARM64; module UUID `16AE7684-CFE3-398F-A644-F80900052671`                                                               |
| Loaded instruction check                | All 528 bytes at `0x1021367c0` matched the original function; function SHA256 `bbc588153c1406b15498300d8c66563d7b399561cc649bbe763c5dacb3fe366e` |
| Active emission interval, `0x104b22068` | Signed 64-bit value `0`                                                                                                                          |
| Active terminal mode, `0x104b22070`     | Unsigned 32-bit value `1`                                                                                                                        |
| Active interval option, `0x104d63fb0`   | Signed 32-bit value `3`                                                                                                                          |
| Initial queue snapshot                  | 256 bytes retained; H `2.0`, state `0`; this alone does not prove complete history/reset coverage                                                |
| Breakpoints                             | Hardware breakpoints installed at exact entry `0x1021367c0` and common exit `0x1021369ac`                                                        |
| Captured calls                          | `0` entries, `0` pairs; no input/output fixture                                                                                                  |
| Capture deadline                        | Triggered at elapsed `27.010629667` seconds                                                                                                      |
| Final summary                           | Elapsed `32.114950750` seconds, exceeding the requested 30-second total budget                                                                   |

The original cleanup called `Detach(False)` successfully and LLDB printed that the process detached, but its immediate `GetState()` check did not return `eStateDetached`. The retained log therefore contains the old error `Detach did not report detached state` and `resumed_by_detach: false`. Later LLDB status reported exited with status `-1` and stale stop information, while separate OS/UI observations reported the process still present and its canvas accessible. These disagreeing debugger observations do not establish an application exit or a failed detach. They also do not justify changing the original log. The original [JSONL](../../evidence/debugger-access/live-contract-first-call.jsonl) is preserved unchanged.

The updated helper separately records `detach_request_succeeded`, `detached_state_observed`, the matching process-state events and latest queried debugger state. A successful detach request with no matching detached observation produces a warning, not a claim that the detach call failed. Observation lasts at most 0.25 seconds within the original remaining deadline, with one nonblocking event drain even after a native call exhausted the budget. The helper never treats an `eStateExited` observation as proof of resumed execution. `resume_independently_verified` is always false; a separate OS/UI check remains necessary.

## Files and verification

- [capture_live_contract.py](capture_live_contract.py): LLDB-embedded capture helper. Importing it does not perform process operations.
- [check_capture_helper.py](check_capture_helper.py): host-only checks with simulated registers, memory and debugger events. These need no CSP executable or process.
- [verification.txt](verification.txt): executed checks and their limited scope.

From the repository root, verify syntax without creating cached files:

```sh
python3 -c 'from pathlib import Path; p=Path("docs/research/clip-studio-paint-stabilization/spikes/live-capture"); [compile(f.read_text(), str(f), "exec") for f in p.glob("*.py")]; print("PASS: Python syntax")'
```

Run the host-only checks with installed LLDB:

```sh
xcrun lldb --batch -o 'script import sys; sys.dont_write_bytecode=True; sys.path.insert(0,"docs/research/clip-studio-paint-stabilization/spikes/live-capture"); import check_capture_helper; check_capture_helper.run_checks()'
```

These checks cover emission versus suppression, original-pointer retention despite changed registers, bounded 236-byte queue reads on both outcomes, thread/stack pairing rejection, delayed detached events with stale current state, exclusion of another process's event, and successful acknowledgement with absent or exited debugger state. Host tests do not establish target behavior. Separately, the retained live runs exercised exact hardware-breakpoint installation and the later timeout/detach cleanup; neither recorded a tablet filter input/output pair.

## Exact later invocation

Use the LLDB session that already controls the approved research-copy process. The helper neither launches nor attaches; a PID absent from that LLDB is rejected. Verify saved work and the intended process separately as described in the runtime handoff. Replace the three `/absolute/path/...` values below with local paths; `original-arm64` must be the separately retained original thin ARM64 image with SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.

```text
(lldb) script import sys; sys.dont_write_bytecode=True; sys.path.insert(0, "/absolute/path/to/live-capture"); import capture_live_contract as capture
(lldb) script capture.run(lldb.debugger, lldb.debugger.GetSelectedTarget().GetProcess().GetProcessID(), "/absolute/path/to/new-contract-capture.jsonl", timeout_seconds=30, max_samples=1, research_executable="/absolute/path/to/CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT", original_arm64="/absolute/path/to/original-arm64")
```

The output filename must not exist. The selected-process expression can be replaced with an explicit positive integer PID. If reusing an LLDB session that imported an earlier helper version, run `script import importlib; importlib.reload(capture)` before invoking it.

`research_executable` and `original_arm64` are explicit keyword arguments. When omitted, `CSP_RESEARCH_EXECUTABLE` and `CSP_ORIGINAL_ARM64` supply them. As a local convenience only, absent arguments/environment variables fall back to the research copy and original image under `/private/tmp/csp-debug-research-20261009/`. Missing files produce explicit errors. The helper and host checks have no dependency on the temporary analysis scripts, and neither executable is included in this directory.

## Capture and cleanup limits

The helper verifies the controlled PID's executable path and architecture before process operations, resolves ASLR through that module, and compares the loaded function bytes with the fingerprinted original. It creates required hardware breakpoints directly and fails if exact hardware locations cannot be installed. It does not create a software breakpoint and convert it afterward. No application-memory writes, target expressions, target function calls, input injection, application setting changes, or security changes are present.

Entry records preserve x0–x7, raw d0–d2 bits, saved queue/phase/output pointers, all available stack frames up to a checked limit, phase bytes, and the common 236-byte queue prefix. The function has digitizer and gesture callers, whose allocations are 256 and 248 bytes respectively; reading 256 bytes unconditionally was an overread and has been corrected. Thread-specific call stacks plus `exit SP == entry SP - 0xb0` validate pairing. Exit records always reread queue and phase; output `+0x08/+0x10/+0x18` is read only when w0 is nonzero. Active globals are recorded before capture and at each entry/exit; changes end the capture as incomplete. Errors, unexpected stops, unmatched calls, and limits remain in the output.

At most 64 calls may be requested; the first check defaults to one. The requested total budget cannot exceed 30 seconds, with three seconds reserved for cleanup and a watchdog interrupt at the earlier capture deadline. Native SB read/detach calls expose no individual timeout: the first run's 32.115-second summary demonstrates that this is **not an unconditional wall-clock guarantee**. Keep console access and an outer debugger guard. The helper records deadline overruns rather than hiding them.

Cleanup always attempts to remove only its own breakpoint IDs and requests `Detach(False)`, then restores the previous LLDB asynchronous mode and selected target. Each run records its own hardware availability and cleanup outcome. The helper records detach acknowledgement separately from observed debugger state and never independently verifies OS execution.

`contract_capture_complete` requires the requested matched pairs plus observed cleanup within the budget. `fixture_complete` is always false: reset, out-of-line history, and complete stroke/terminal coverage are not captured. A midqueue start or bounded pair must not be relabeled a full replay fixture. Breakpoint instrumentation alters event cadence and cannot establish natural latency or pen feel.
