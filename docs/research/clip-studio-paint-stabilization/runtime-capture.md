# Mac debugger access and runtime comparison

Status on 2026-10-09 local session: **debugger access and a complete native mouse-route recording work**. The mouse recording includes down, drag, up, and return from the up callback, with independently checked saved packets and clean detachment. The installed app remains unchanged. Ordinary mouse follows a separate route and produced zero calls into the recovered tablet queue, so no live tablet input/output comparison is established. The primary comparison device is a drawing tablet or pen display on Mac. An iPad is a later portability/feel test, not a substitute for validating this Mac executable.

## Approved research-copy outcome

The user approved creation, signing, and launch of a separate research copy, then confirmed their work was saved and authorized switching from the installed instance. The installed instance was quit through its UI. The research copy is at `/private/tmp/csp-debug-research-20261009/CLIP STUDIO PAINT Research.app` (macOS also presents this as `/tmp/...`).

- Preserved the original entitlements `com.apple.security.cs.disable-library-validation=true` and `com.apple.security.device.camera=true`; added only `com.apple.security.get-task-allow=true`. Hardened Runtime remains enabled. No persistent macOS security setting was changed.
- Verified 775 original app manifest entries. Only the copied main executable changed; nested components and all 36 ARM64 Mach-O sections are identical. The installed app matched its original manifest afterward. See [copy-verification.json](evidence/debugger-access/copy-verification.json) and [signing-verification.txt](evidence/debugger-access/signing-verification.txt).
- The copy's first normal launch exited because an application with the same bundle identifier and a different path was already running. The debugger caught `exit(0)` after `-[NSApplication terminate:]`, called at `0x10204bc84`; static tracing identifies `PWLegacyDummyApplicationDelegateMac` forwarding to the existing instance. This specific exit was duplicate-instance handling. See [startup-exit.txt](evidence/debugger-access/startup-exit.txt) and [the startup analysis](evidence/debugger-access/startup/launch-exit-findings.md).
- A debugger-controlled launch stopped at entry and detached successfully: [debug-launch.txt](evidence/debugger-access/debug-launch.txt). After the approved switch, the research copy opened a canvas in a later debugger session.
- The first bounded capture observed emission interval **0 ms**, interval option **3**, and terminal mode **1** after initialization. Queue settings were **S=30, T=0, fast=false, slow=false, H=2, state=0**. These are this session's observed values, not universal defaults.
- That capture installed the two hardware breakpoints and confirmed all 528 bytes of `0x1021367c0` matched the original image. No input call arrived before its 27-second recording deadline. Cleanup returned after 32.115 seconds, exceeding the requested 30-second budget; LLDB printed successful detachment, but the helper's immediate asynchronous state check did not confirm it. Later process/UI observations showed the research process and canvas remained available. The artifact retains the timeout and cleanup error: [live-contract-first-call.jsonl](evidence/debugger-access/live-contract-first-call.jsonl). It is not a passing capture or a replay fixture.

The exact signing action on the approved copy was:

```sh
codesign --force --sign - --options runtime \
  --entitlements /private/tmp/csp-debug-research-20261009/research-entitlements.plist \
  --timestamp=none \
  '/private/tmp/csp-debug-research-20261009/CLIP STUDIO PAINT Research.app'
```

The entitlement file and preparation metadata are preserved in [evidence/debugger-access](evidence/debugger-access). No executable is included in the handoff.

The user elected to defer their tablet participation, then authorized an automated mouse check. Raising the research window allowed mouse clicks and drags to produce visible marks. A new capture received zero filter entries despite a delivered mouse click. Its revised cleanup both acknowledged detachment and observed the matching detached process event, with no cleanup errors and a 27.124-second total duration. A separate process check subsequently found research PID 21626 in state `S` at the research executable path. The [new recording and console output](evidence/debugger-access/mouse-route/manifest.json) preserve this result; neither failed capture is an input/output fixture.

The subsequent [mouse-route recording](evidence/debugger-access/mouse-route/mouse-route-event-driven.jsonl) succeeded after correcting a debugger stop-event race. It retained three packets and the up callback's return, then detached cleanly within 7.738 seconds. [Independent verification](evidence/debugger-access/mouse-route/mouse-route-independent-verification.json) decoded positions, pressure and timestamps from the saved raw bytes, checked ordering and thread/window/stack pairing, and confirmed the observed callback agrees with static analysis. A visible canvas stroke and a separate process check verified continued operation. This result validates mouse capture mechanics, not the tablet filter or post-correction.

The [prepared full tablet recorder](spikes/live-capture/capture_tablet_stroke.py) passed 27 host checks and independent review. Its [no-input preflight](evidence/debugger-access/tablet-preflight/tablet-no-input-preflight.jsonl) verified all three required instruction ranges, installed four simultaneous hardware breakpoints, and detached cleanly on the expected deadline. No pen input was supplied or recorded, so actual tablet capture and numerical comparison remain pending. See [the recorder instructions and boundaries](spikes/live-capture/README.md#prepared-tablet-recorder).

## What requires a tablet

A tablet is not a prerequisite for disassembly, debugger access, arithmetic verification, synthetic replay, or observing mouse input in CSP. It is needed to validate the intended tablet's device-specific input and subjective feel.

| Question                                                                                   | Required input or evidence                                                                                                                         |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are the extracted equations and branches reconstructed correctly?                          | Disassembly, independent arithmetic tests, synthetic streams.                                                                                      |
| Do captured positions produce the same live-filter outputs and emission decisions?         | A stream proven to enter the recovered queue. The ordinary mouse route bypasses native digitizer dispatch; a visible mouse stroke is insufficient. |
| Does post-correction preserve the same source curve within the same bounds?                | Source geometry/scalars plus before/after output fixtures; a tablet is not inherently required.                                                    |
| What does this tablet deliver for pressure, proximity, eraser, zero pressure and pen lift? | That tablet/driver producing real native events. Ordinary mouse events do not establish these conditions.                                          |
| Does Croquis feel right on the intended hardware?                                          | An uninstrumented real pen session, after numerical comparison.                                                                                    |

The first failed automated stroke was an app-control failure. After correcting delivery, a separate limitation became clear: `PWLegacyContentView` gates digitizer dispatch on `isTabletEvent:`. Ordinary mouse down/drag/up use a different callback and packet layout. The [complete-capture investigation](evidence/debugger-access/mouse-route/csp-complete-capture-contract.md) records exact addresses and assembly. This proves a separate native route, not the absence of all downstream mouse smoothing. A mouse capture must identify itself as mouse-only. An internal algorithm invocation would be a separate experiment and would not establish native tablet acquisition or natural pen feel.

The [capture helpers](spikes/live-capture/README.md) include explicit executable/reference paths and host-only checks. Revised cleanup now has a live timeout/detach observation as described above. Tablet entry/exit pairing and complete terminal processing remain unvalidated on the live app; the original failed attempts remain unchanged.

## Observed attachment failure

The installed application was running as PID 778 when this command was attempted with a 25-second outer timeout:

```sh
/Applications/Xcode.app/Contents/Developer/usr/bin/lldb --batch \
  -o 'process attach --pid 778' \
  -o 'process status' \
  -o 'process detach' \
  -o quit
```

LLDB exited with status 1 and reported:

```text
error: attach failed: attach failed (Not allowed to attach to process.
Look in the console messages ... debugserver ...)
```

The ellipsis abbreviates LLDB's diagnostic suggestion, not an omitted successful attachment. The subsequent status/detach commands did not execute. The outer command wrapper exited normally after reporting the failed child process; that wrapper status does not mean the attachment succeeded.

Read-only checks found:

| Check                                                   | Result                                                                                     | Meaning                                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DevToolsSecurity -status` outside the command sandbox  | `Developer mode is currently disabled.`                                                    | General developer debugging authorization is not enabled. This alone does not prove the reason for the CSP denial.                                  |
| `codesign -dv --verbose=4`                              | `CodeDirectory ... flags=0x10000(runtime)`                                                 | CSP opts into Hardened Runtime.                                                                                                                     |
| Initial sandboxed `codesign` inspection                 | Reported an invalid entitlement blob and invalid signature                                 | These restricted results were superseded by the successful external verification below. They do not establish a broken installed app signature.     |
| External `codesign --verify --strict --verbose=2`       | `valid on disk`; `satisfies its Designated Requirement`                                    | The installed application signature verifies successfully outside the command sandbox.                                                              |
| External `codesign -d --entitlements - --xml`           | Parsed `disable-library-validation=true` and `device.camera=true`; no `get-task-allow` key | The installed application's usable entitlement dictionary omits debugger permission. Both original permissions were preserved in the research copy. |
| Narrow `debugserver` log query                          | `task_for_pid` for PID 778 failed with errno 5                                             | Confirms the task-port acquisition failure.                                                                                                         |
| Narrow kernel-policy log query for the failure interval | No matching entries returned                                                               | The exact enforcing subsystem was not established from the available logs.                                                                          |

The original attachment failure was a macOS denial, not an automatic approval-review rejection or an unanswered Codex permission dialog. The later authorized signature change applies only to the research copy.

Apple distinguishes debugger authorization from the target application's permission to be debugged. Hardened applications without `com.apple.security.get-task-allow` can reject an otherwise authorized debugger. Administrator authorization is therefore not a guaranteed fix. See [Apple DTS's explanation](https://developer.apple.com/forums/thread/676028) and [the debugger entitlement documentation](https://developer.apple.com/documentation/BundleResources/Entitlements/com.apple.security.cs.debugger).

## Concrete authorization scope

The authorized experiment uses a **separate local research copy** of this exact CSP version whose main executable is signed with debugging allowed. The purpose is only to obtain a task port and inspect stabilization inputs, state, and outputs.

Preparation and execution should:

1. Preserve the installed application. Record the original signature metadata and hashes, and create the copy in a clearly identified research directory outside the application install directory.
2. Inventory the copy's existing entitlements and nested signed components before deciding the signing command. Preserve Hardened Runtime and existing required permissions. Do not use a blanket recursive signing command that changes all nested components without inspection.
3. Add `com.apple.security.get-task-allow` to the copy's main executable signature. Record the exact command, signing identity, resulting entitlements, and verification output. A local signature may prevent the copy from launching or loading its signed libraries; stop and report that failure instead of weakening additional restrictions automatically.
4. Verify that every analyzed executable instruction and read-only constant is unchanged. Re-signing changes the executable's overall digest; the original whole-file hash alone cannot validate a re-signed copy. Record the new fingerprint alongside a comparison of the relevant Mach-O sections.
5. Confirm the user has saved work before launching or attaching. A copied bundle can still use the same preferences, autosave locations, account, and single-instance behavior as the installed app. It is not automatically an isolated profile. Do not assume `open` selected the copy: verify the process executable path.
6. Try the ordinary macOS debugger authorization prompt first. A requested administrator approval must be supplied through the operating system, not as a password in chat. Do not enable persistent developer authorization unless separately authorized. Do not disable SIP or remove Hardened Runtime.
7. Run the short inspection below on a disposable document, detach, and verify the process resumed. Record all failures and stop at the bounded timeout. No license checks, login checks, or other application behavior are changed.

The user supplied the specific approval for modifying the research copy's signature and running it. Persistent system-wide security changes remain outside that approval and were unnecessary for the successful debugger-controlled launch.

## Bounded filter inspection

This procedure is prepared from the verified assembly and local LLDB help. The first attempt reached instruction verification, active-global reads, and hardware-breakpoint installation, then timed out without an input call. Entry/exit pairing remains unvalidated on CSP. Its purpose is to validate the field/argument contract, not measure natural drawing latency. Breakpoint stops change event delivery and can change subsequent input cadence.

Use the ARM64 process for the fingerprinted build. Verify the module path, loaded architecture, and relevant instruction bytes before using addresses. Addresses in this document are unslid Mach-O addresses. LLDB's `breakpoint set -s MODULE -a ADDRESS` treats the address as a file address in that module; raw memory addresses must instead use that module's resolved load address. Do not assume the ASLR slide is zero.

Start with an attach-and-immediate-detach check under a 25-second outer timeout. Only after that succeeds, inspect one invocation under a separate 30-second deadline. Use two hardware breakpoints if available; stop if they cannot be installed. Do not silently fall back to another attachment mechanism. Keep the console available to interrupt, remove this session's breakpoints, and `process detach --keep-stopped false` if the expected event does not arrive.

At the exact entry `0x1021367c0`, before the prologue:

```text
x0 = queue address
x1 = caller phase pointer
x2 = input timestamp (signed integer milliseconds on the traced Mac path)
x3 = slow-mode catch-up argument
x4 = emission-gating request
x5 = emission interval
x6 = bypass flag
x7 = output record pointer
d0, d1, d2 = input x, y, pressure
```

Save x0, x1, and x7 in the debugger host, together with the thread ID; do not rely on their register values after the call. Dump the common 236-byte queue prefix and 4 bytes from the phase pointer, retaining original byte order and raw floating-point bits. The function is shared by a 256-byte digitizer queue and a 248-byte gesture queue; an unconditional 256-byte read overreads the latter. Record the input registers as both interpreted values and raw bits. Preserve x30 and the call stack to distinguish digitizer/gesture input from synthetic completion calls.

The common exit before epilogue is `0x1021369ac`. Use a one-shot breakpoint restricted to the same thread. If nested entry calls occur, reject this single-call capture and use explicit per-thread call pairing before proceeding. At the exit:

- `w0 != 0` means an emitted output. Only then interpret doubles at saved output pointer `+0x08`, `+0x10`, `+0x18` as output x, y, pressure. On suppression, these fields are not a newly emitted sample.
- Read the phase pointer again and take the same queue-byte snapshot.
- Queue `+0x58` is the window H, `+0x88` the state, `+0x90/+0x98` the latest processed position, and `+0xb0` the processed pressure. These queue values can change even when emission is suppressed; bypass is a separate path that leaves queue state unchanged.
- Remove the two breakpoints and detach with the process resumed. Record completion and elapsed duration.

Record these active globals using resolved load addresses, rather than assuming their initialized values apply:

| Unslid address | Read type       | Meaning established so far                                                                       |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `0x104b22068`  | signed 64-bit   | Emission interval; the option setter selects 0, 10, 15, or 20 ms on this platform.               |
| `0x104b22070`  | unsigned 32-bit | Global mode supplied to the terminal path; initialized to 1 and observed as 1 in these captures. |
| `0x104d63fb0`  | signed 32-bit   | Selected interval option; UI label mapping not established here.                                 |

The entry/exit offsets and output stores are backed by [digitizer-averaging.asm](evidence/live/digitizer-averaging.asm). The native producer and option setter are in [the live-contract spike](spikes/live-contract/README.md).

## From an inspected call to a comparison fixture

A queue snapshot alone does not contain its out-of-line history contents. It is insufficient to replay an arbitrary mid-stroke call from an empty reconstruction.

The prepared tablet recorder captures every entry/exit pair from a proven initial history through one short stroke and its complete terminal processing. It records initial out-of-line history or proves it empty; reset alone does not clear all queue fields. It preserves queue identity, thread/call pairing, input phase, arguments, H/state changes, emitted flag, output phase, output coordinates/pressure, and actual S/T/mode settings. Suppressed calls and synthetic completion calls are retained. Unmatched calls, missing initial history, read errors, call limits, or settings changes produce an incomplete fixture. This implementation still needs its first actual tablet run.

Completion is specific to the queue family. Digitizer release may leave state 2 pending later input; a final emitted phase 3 with state 0 establishes queue completion. Gesture completion can force state 0 and overwrite the last output after shared ingestion returns. Observe the wrapper's final output in that case. The [complete-capture investigation](evidence/debugger-access/mouse-route/csp-complete-capture-contract.md) gives both terminal addresses and the checked history extraction formula. Stopping after a requested number of matched calls is never evidence of a complete stroke.

Replay exactly those captured input arguments through the reconstructed state machine. Compare emission decisions and phases exactly, coordinates/pressure with separately reported absolute and ULP error, and terminal count/order. Account explicitly for the live reference's unfused arithmetic. Do not hide a discrepancy by changing coordinate scale or retuning S/T until it disappears.

The resulting comparison validates the computation for the captured stream. It does not validate natural input cadence, renderer latency, or pen feel under breakpoint instrumentation. Those require a later uninstrumented Mac pen session with the same brush settings and separate measurements of input-to-preview behavior. Use short slow lines, fast flicks, corners, loops, holds, lifts, pressure changes, and the tablet's eraser if available. An iPad session then evaluates the browser/device adaptation independently.

## Post-correction work that remains independent of attachment

The [post-contract spike](spikes/post-contract/findings.md) identifies `PWVectorSplineCurve` and its sample schedule. Its six-position evaluator, neighbor adjustment, and curve-length-related measure still need reconstruction or a clearly documented replacement. The derived movement/time factor also needs its complete configuration and input-wrapper units traced. Runtime before/after source-node fixtures can confirm these results once access works, but a final screenshot alone cannot isolate them.

Croquis's present One Euro filter is a disposable comparison baseline. The requested implementation direction is a replacement based on CSP's recovered behavior. Existing builder/curve/repaint behavior is relevant only where it would distort or misrender the replacement's output.
