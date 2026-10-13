# Capture preparation for live stabilization and post correction

Current result, 2026-10-11: **the S20/T0 tablet recording completed, and all 311 included calls now match the reconstructed live queue exactly through release and source return.** Correctly fused arithmetic resolves the 16 prior numeric-field differences; the S0/T0 baseline still matches all 115 included calls. See the [S20 report](evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s20-comparison-final.json), [S0 report](evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s0-comparison-final.json), and [recording diagnosis](evidence/debugger-access/tablet-manual-20261011T181326.241155Z-172e5259/latency-diagnosis.json). One background-thread recovery succeeded and cleanup was verified. Capture remained severely intrusive: 1,033 owned stops and 19.36 seconds from observed stroke begin through release return for a packet timestamp span of 1.781 seconds. No repeat of this baseline is needed. Further manual captures should target a specific unresolved branch after offline analysis.

The dated failure accounts below are historical. Post-correction whole-curve reconstruction, other live modes, browser adaptation, and uninstrumented feel remain outstanding.

Follow-up retry, 2026-10-11 17:38 UTC: the updated recorder saved 172 paired calls before an unexpected background-thread instruction-step exception at 8.62 seconds. Median spacing between entries was 42 ms, versus 61–66 ms in the preceding recordings. No pen release was captured; detach and independent resumed state were verified. See the [session outcome](evidence/debugger-access/tablet-manual-20261011T173815.294680Z-bf864636/session-outcome.json) and [stop diagnosis](evidence/debugger-access/tablet-manual-20261011T173815.294680Z-bf864636/stop-diagnosis.md). Six standalone workqueue stress runs did not reproduce the exception. The complete tablet recorder remains unvalidated after the wait change. UI automation can access the research canvas again, but exposes mouse dragging rather than digitizer pressure/release events.

Latest recording issue, 2026-10-11: two locally triggered positive-stabilization captures timed out with a large input backlog caused by debugger overhead. Both detached and resumed. The [diagnosis](evidence/debugger-access/manual-capture-timing-20261011/README.md) retains timing and partial arithmetic comparisons; hundreds of captured pairs are useful for offline investigation, including small rounding discrepancies. Replacing the recorder's polling delay with a bounded event wait reduced a separate native benchmark's elapsed time by 31–35%. [Benchmark evidence and limits](evidence/debugger-access/stop-wait-benchmark-20261011/README.md) do not establish that CSP capture is fixed. No additional tablet input is needed for the current offline investigation.

Status, 2026-10-11: **one native tablet baseline now matches the research replay exactly at stabilization 0.** The unchanged [recording](evidence/debugger-access/tablet-live-20261011T164934Z/tablet.jsonl) contains 115 included calls, movement, changing pressure, release and return; the [validated report](evidence/debugger-access/tablet-live-20261011T164934Z/comparison-validated.json) reports zero differences. A reader bug incorrectly required the recorder's retained breakpoint-ID list to be empty; the fix preserves cleanup-error and detach checks. This result does not exercise positive stabilization.

A subsequent short stabilization-20 input retained eight ingestion pairs that [compare exactly in a limited diagnostic](evidence/debugger-access/tablet-live-s20-20261011T165317Z/diagnostic-ingestions.json). Its original recording remains incomplete: the recorder rejected an observed window reset from 5.5 to the initial value 2 after final emission. Every other common queue byte matched. Configuration reapplication can explain the reset, but the exact dynamic writer was not observed. The user reported a possible preliminary tap. A later retry retained 146 pairs at stabilization 20 but timed out before release. Neither is a complete positive-stabilization validation. See the dated capture directories and their unchanged summaries for the additional freeze, missed-window and timeout outcomes.

The native mouse post-correction setup check also passed. Its [manual capture](evidence/debugger-access/post-mouse-manual-20261010T184049Z/README.md) retained 99 quadratic-Bezier source nodes and eight returned spline nodes, with clean detach and valid offline analysis. The user selected the fifth indicator bar; CSP received numeric strength `k=40`. Whole-curve reconstruction remains incomplete.

The tablet initially did not respond with Wacom driver 6.4.11-2 on macOS 27.0.1. After the user updated to 6.4.15-1, real digitizer events were recorded. The operator's [post-capture brush image and confirmation](evidence/debugger-access/tablet-live-20261011T164934Z/operator-confirmation.json) show stabilization 0, post correction enabled and the visible taper setting 20; the recorded queue had S=0/T=0. Do not treat the UI-to-native taper mapping as validated by that session.

## Persistent research location

Use these paths for subsequent sessions, including after a reboot:

- Research app: `/Users/adoll/Applications/CSP Research/CLIP STUDIO PAINT Research.app`.
- Pinned original ARM64 reference: `/Users/adoll/Applications/CSP Research/original-arm64`.

Launch the research app with:

```sh
open '/Users/adoll/Applications/CSP Research/CLIP STUDIO PAINT Research.app'
```

The persistent copy was verified against its source: all 811 files (782,552,918 bytes), file modes, and symbolic links matched; the app's signature passed verification. The [persistent-copy verification record](</Users/adoll/Applications/CSP Research/persistent-copy-verification.json>) retains the results.

Before attaching, verify the current process executable is the `Contents/MacOS/CLIP STUDIO PAINT` inside that bundle. Saved captures and historical commands retain their original `/private/tmp/csp-debug-research-20261009/` paths; those records describe the earlier sessions and must not be rewritten.

## What is prepared

| Feature            | Saved evidence                                                                                                                        | Offline result                                                                                                                              | Current validation                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Live stabilization | Initial hover history, every included input/output pair, suppressed calls, raw settings/state, native release and terminal processing | Stateful replay; exact control decisions; numeric bits, absolute error and ULP differences for coordinates, pressure and window size        | Complete native S20/T0: 311 included calls match exactly. Complete S0/T0 baseline: 115 calls match exactly. Other modes remain unvalidated |
| Post correction    | Complete source and final path allocations, all known node bytes and stored controls, wrapper settings, thread/stack/holder pairing   | Validated before/after geometry and field changes; extracted arithmetic derivations; separately supplied helper observations can be checked | Native mouse before/after pair captured and independently checked; no complete curve prediction or native tablet validation                |

The references are handwritten reconstructions from targeted disassembly, not CELSYS's original source. The live queue driver is implemented in the research tools and now preserves all recovered fused instruction sites within its supported arithmetic domain. Post correction still lacks the complete evaluator, correspondence graph, mutation and endpoint operations. These are unfinished dependency analyses; another manual stroke is not required to begin them. The post report always marks whole-curve equivalence `not-evaluated`; a successful file check does not change that.

## Settings coverage in the planned port

Disabling modifiers for the initial recording isolates the base operation; it does not remove those settings from the intended implementation. The user's requested scope includes both post-correction modifiers and the separate live-stabilization modes.

| CSP setting          | Reference coverage                                                                                     | Remaining validation or implementation                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 手ブレ補正           | Configuration, changing fractional history window, averaging, and research queue replay                | Native tablet stream comparison and browser input adaptation                                                   |
| 速度による手ブレ補正 | Both fast-motion and slow-motion window branches                                                       | Native branch activation, input units, and behavior across event rates                                         |
| はらい               | Queue configuration, pressure decline, ending rules, and terminal processing                           | Native ending comparison and deliberate integration with Croquis's width/taper behavior                        |
| 後補正               | Settings conversion, tolerance/scalar arithmetic, pass schedule, and portions of removal logic         | Complete curve evaluator, correspondence, mutation, and endpoint operations                                    |
| 速度による調整       | `sourceSegmentTolerance` applies the preserved node movement/time factor to tolerance                  | Native observations and correct construction of that factor; raw pointer speed is not an equivalent substitute |
| 表示倍率による調整   | `convertPostSettings` applies `1 / (magnificationPercent * 0.01)` to positional tolerance when enabled | Coordinate adaptation and native observations across magnifications                                            |
| ベジェ曲線           | Alternate post-correction route and setting association identified                                     | Separate curve pipeline remains unresolved and is excluded from the first ordinary-smoother capture            |

The display-scale option above belongs to post correction. It must not be copied into the live queue as an invented equivalent setting. The live input coordinate conversion and device-dependent configuration are separate parts of the implementation contract. Even with post-correction display-scale adjustment disabled, the recovered settings reader still supplies a length-scale value to other calculations; disabling that checkbox does not establish total zoom independence.

## Mouse setup procedure and completed check

1. Reconnect UI control to the approved research copy and its disposable canvas. Confirm the actual process path before attachment. Do not silently switch to the installed app or assume a PID is still current.
2. Record the selected brush, layer type, size, magnification and settings when UI access permits; label unobserved values explicitly. Enable **Post correction**, choose a positive strength, and turn **Bezier curve** off to target the ordinary smoother. Distinguish numeric strength from indicator-bar position: the bar values are configurable, and the right-hand button reveals numeric entry, as described in [CSP's manual](https://help.clip-studio.com/ja-jp/manual_jp/150_tools/ツールプロパティパレット.htm). The successful fixture used the fifth bar and observed `k=40`; numeric 5 was not required for the setup check. Preserve the prior settings for restoration. The setting IDs and exact resource labels are established in the [static capture contract](spikes/post-capture-contract/README.md).
3. Arm the post recorder, wait for its active cue, and draw one mouse drag. The user has offered manual input while window control is unavailable. Require an actual paired wrapper entry/normal epilogue, complete node chains and clean detach. A visible mark alone is insufficient. Analyze the saved JSONL immediately. A straight or sparse mouse drag may produce no geometric change; identity is useful for recorder validation but cannot establish active simplification.
4. If no wrapper runs, inspect the established brush-enable/finalizer gates and selected tool. This is setup work. Do not ask the user to keep drawing to discover why the recorder missed the path.

Automated window access failed: research-copy selection returned `timeoutReached`, bundle selection returned `cgWindowNotFound`, and a subsequent Finder selection also failed. One native UI tool call took about 2,089 seconds despite a requested ten-second timeout. No stroke or brush setting change was made during that attempt. OS process inspection continued to find the research executable, and its main thread was in the normal message wait during the later debugger attachment. The reason the window was inaccessible is not established. User-supplied manual input subsequently completed the mouse setup check.

A [user-requested retry on 2026-10-10](evidence/debugger-access/post-preflight/window-retry-20261010.json) reproduced the access failure by research path, bundle ID and installed-app path, including after an automation-session reset. App inventory reported CSP running; OS inspection found both the installed process (PID 1713) and research process (PID 21626). Selection ambiguity is possible but unproven. No debugger attachment, stroke, setting change or process termination occurred during that retry. The next check requires a visible canvas on the unlocked desktop.

The [post no-input preflight](evidence/debugger-access/post-preflight/post-no-input-preflight.jsonl) checked all `0x11c` wrapper bytes against the pinned original, installed hardware probes at `0x1028ed064` and `0x1028ed144`, timed out as planned with zero pairs, and detached cleanly at about 5.120 seconds of an eight-second budget. Independent OS inspection afterward found PID 21626 in state `S` at the research executable path. Its [offline report](evidence/debugger-access/post-preflight/post-no-input-comparison.json) correctly rejects it as an incomplete capture. This is a passing setup check, not a successful correction fixture.

## First tablet session: inspect the live test before continuing

The mouse setup check has passed. The persistent reference paths and all 27 tablet recorder host checks passed again in the [post-preservation readiness check](evidence/debugger-access/tablet-readiness-after-preservation-20261010.txt). No CSP process was running at that check; launch the persistent research app and verify its current PID/path before recording. The first live tablet test does not depend on completing the separate post-correction curve reconstruction.

Start with one short live-stabilization recording on the Mac tablet, inspect its saved data, and only then decide whether to take the complementary post-correction recording. The agent prepares settings where UI control permits, arms each recorder, checks completion, and saves the reports. The user makes the requested stroke after the active cue; any manual setup needed because of inaccessible UI must be stated before arming.

1. **Live stabilization:** set numeric 手ブレ補正 to 20, 速度による手ブレ補正 off, 後補正 off, and はらい to numeric 0. Distinguish numeric values from indicator-bar positions. Draw one small continuous curve over about one second with a modest pressure change and a clean lift, then leave the pen hovering briefly so deferred ending can finish. Keep the stroke short because the bounded recorder permits at most 512 ingestion calls. Compare the recorded actual settings and native packet handling, history, pressure, emission, and terminal behavior against the reconstruction for that stream; successful recording alone does not establish equality.
2. **Post correction:** one short bent stroke with a pressure change and lift, with enabled positive Post correction and Bezier curve off. This saves the native path before/after correction and its actual scalar fields. It provides a reusable fixture for resolving the remaining curve operations; the current analyzer cannot predict the whole final path.

The two recorders use separate passes: the live recorder needs four simultaneous hardware probes and the post recorder two. Do not claim the two hand-drawn strokes contain identical inputs. Each comparison uses that recording's own saved inputs and outputs.

Inspect each result before requesting another stroke. If recording fails, retain the failure and fix the identified cause first. If recording succeeds but arithmetic differs, investigate the saved data offline. Additional settings, eraser behavior or pressure edge cases should be requested only when an identified branch lacks coverage. These are the initial two diagnostic cases, not a guarantee that all modes or devices will be validated. Natural pen feel and latency require an uninstrumented check after implementation because debugger stops distort timing.

## Commands for the next agent

Use an LLDB session already controlling the verified research process. The recorders do not attach or launch. Keep an outer debugger timeout (35 seconds for an eight-second preflight; 45 seconds for a thirty-second capture) and verify the process resumed afterward. Always choose new filenames. Read [the debugger procedure](runtime-capture.md) and [recorder limits](spikes/live-capture/README.md) first.

```text
(lldb) script import sys; sys.dont_write_bytecode=True; sys.path.insert(0, "/absolute/path/to/spikes/live-capture")
(lldb) script import capture_tablet_stroke as tablet; tablet.run(lldb.debugger, PID, "/absolute/path/to/new-live.jsonl", timeout_seconds=30)
```

After that session detaches, use a separately attached session for post correction:

```text
(lldb) script import sys; sys.dont_write_bytecode=True; sys.path.insert(0, "/absolute/path/to/spikes/live-capture")
(lldb) script import capture_post_correction as post; post.run(lldb.debugger, PID, "/absolute/path/to/new-post.jsonl", timeout_seconds=30, device="tablet", metadata={"brush":"record exact selection", "settings":"record actual UI values"})
```

For the automated setup check, declare `device="mouse"`. Device declarations are operator notes, not an independent identification. Both helpers accept explicit `research_executable` and `original_arm64` keyword paths. Their shared default root is now `Path.home() / 'Applications/CSP Research'`. For explicit paths, use `/Users/adoll/Applications/CSP Research/CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT` and `/Users/adoll/Applications/CSP Research/original-arm64`, respectively.

From the repository root:

```sh
node docs/research/clip-studio-paint-stabilization/spikes/live-replay/compare-capture.ts /absolute/path/to/new-live.jsonl --report /absolute/path/to/new-live-report.json
node docs/research/clip-studio-paint-stabilization/spikes/post-replay/compare.ts /absolute/path/to/new-post.jsonl --out /absolute/path/to/new-post-report.json
```

Preserve raw JSONL, debugger output, selected settings, independent resume evidence and the full report together. The live tool returns 0 for equality of its compared fields, 1 for differences, and 2 for invalid/unsupported data. The post tool returns 0 for valid captures with no supplied-helper mismatch, and 2 for invalid captures or mismatches; it never certifies whole-curve equality. Neither return code establishes pen feel.

## Verification and remaining limits

- [Live replay verification](spikes/live-replay/verification.txt): host tests and strict TypeScript.
- [Post analyzer verification](spikes/post-replay/verification.txt): host tests, exact fixture reproduction, strict TypeScript, extracted arithmetic and independent review.
- [Post capture verification](evidence/debugger-access/post-preflight/verification.md): recorder host tests, cross-tool synthetic check, live no-input check and actual failures.
- [Pinned layout evidence](spikes/post-capture-contract/README.md): source/output lifetimes, complete allocation sizes, raw-list invariants, settings association and optional internal arithmetic probes.

This preparation does not implement a replacement in Croquis. Complete native S20/T0 and S0/T0 recordings match their compared fields exactly. Full post-curve prediction, browser/tablet adaptation, other live and post settings, and uninstrumented feel remain distinct outstanding work. Static reconstruction and saved-data analysis can continue without consuming the user's drawing time.
