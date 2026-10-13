# Debugger wait overhead, 2026-10-11

The recorder previously checked for an event and slept for 5 ms when none was
available. It now waits for a process event with a one-second timeout, with
capture-budget checks before and immediately after that wait. Process identity,
restarted-event, stop-ID, and hardware-probe checks remain in place. No samples,
state reads, or cleanup checks were removed, and no capture deadline was extended.

## Standalone native measurement

The [C test program](../../../spikes/live-capture/benchmark_stop_wait.c) calls three
functions 64 times, with a hardware probe at each function. The
[LLDB helper](../../../spikes/live-capture/benchmark_stop_wait.py) preserves all
192 stops, reads a register and 236 bytes at each stop, and requires normal exit.
The other threads, when enabled, only sleep. This is a debugger benchmark, not a
model of CSP's rendering or input system. No CSP process was attached or changed.

| Wait | Additional threads | Total seconds | Median resume-to-stop ms | Stops |
| --- | ---: | ---: | ---: | ---: |
| 5 ms polling | 0 | 1.4161 | 6.7940 | 192 |
| Bounded event wait | 0 | 0.9249 | 3.9767 | 192 |
| 5 ms polling | 24 | 3.6346 | 16.8437 | 192 |
| Bounded event wait | 24 | 2.4914 | 11.2478 | 192 |

Elapsed time fell by 34.7% and 31.5%, respectively. Each case was run once, in the
order shown. These measurements verify that the changed wait can reduce overhead;
they do not establish CSP throughput, eliminate native stop/resume costs, or prove
that another full tablet stroke will finish before the deadline. In particular,
the many-thread example still spends about 11 ms per stop before ordinary capture
reads. The previous CSP recordings had three stops per input sample.

All four reports retain every stop and event. The JSON reports, debugger logs,
binary, and source hashes are listed in `manifest.json`. The internal measurement
deadline was 20 seconds; each LLDB subprocess also had a 30-second outer timeout.
All cases completed normally, without reaching either deadline.

## Regression checks

`host-verification.txt` records shared capture/cleanup checks, 30 tablet checks,
eight post-correction checks, mouse-route checks, and maximum-history extraction.
The new wait regression was first observed failing with the old polling method.
`launcher-verification.txt` records eight launcher checks. None require a tablet.
The launcher's final failure speech was shortened to avoid exceeding its existing
three-second audio completion allowance; the complete error remains printed and
saved. The shortened speech has not been exercised in a live recording.

## Reproduction

From the repository root, compile the program:

```sh
xcrun clang -g -O0 -arch arm64 docs/research/clip-studio-paint-stabilization/spikes/live-capture/benchmark_stop_wait.c -o docs/research/clip-studio-paint-stabilization/evidence/debugger-access/stop-wait-benchmark-20261011/benchmark_stop_wait
```

Run LLDB on that executable, import the Python helper, and call
`benchmark_stop_wait.run(lldb.debugger, MODE, NEW_OUTPUT_PATH, WORKERS)`.
`MODE` is `poll` or `event`; `WORKERS` is 0 or 24 for this comparison. The output
path must not exist. Retain an external 30-second process timeout and the full
debugger log. Do not launch this helper against CSP: it explicitly accepts only
the disposable benchmark executable.

## Current boundary

The [manual capture diagnosis](../manual-capture-timing-20261011/README.md) explains
the two real CSP timeouts. Both detached and resumed; both remain incomplete.
Do not request another tablet stroke solely to check this change. Investigate the
already-recorded arithmetic differences offline first, and distinguish a future
complete CSP capture from the standalone performance result above.
