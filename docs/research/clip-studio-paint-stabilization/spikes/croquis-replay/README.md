# Croquis replay: constraints for the CSP replacement

The intended replacement is the recovered CSP behavior. Croquis's current One Euro filter is a disposable diagnostic baseline in this spike. Its numbers identify which delay comes from that filter and which comes from downstream spacing, curve construction, or painting; they do not establish quality targets for the replacement.

No product source changed. This directory contains portable research scripts and compact results. The full sampled measurements, exact fixtures, individual batching results and generated browser bundle are in the [local artifact archive](/Users/adoll/.codex/visualizations/2026/10/09/01a122b3-7708-7ef1-ae40-18592e2c60ab/csp-croquis-replay-artifacts.zip). The archive is workstation-local, outside the repository; its SHA-256 and contents are recorded in `results/archive.json`.

## Reproduce

From repository root, with the already installed frontend dependencies and Chromium:

```sh
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/research/clip-studio-paint-stabilization/spikes/croquis-replay/replay.mts /tmp/csp-croquis-replay
node docs/research/clip-studio-paint-stabilization/spikes/croquis-replay/pixels.cjs /tmp/csp-croquis-replay
```

Both scripts resolve source paths relative to this directory and accept an output directory. Omitting it uses the platform temporary directory. They do not start the application, API, or a web server, and install nothing. The browser launch has a 20-second timeout. On this macOS sandbox it needed scoped permission to use browser process communication; the initial sandboxed launch failed with `bootstrap_check_in ... Permission denied (1100)`, and the scoped run succeeded. Node's tsx loader is used because the tsx CLI attempted an IPC socket denied by the sandbox.

The replay imports the actual exported `Stabilizer`, `StrokeBuilder`, `StrokeCurve`, `InkEngine` and recovered fixed-window helpers. The pixel script bundles the actual `InkEngine`, `InkSurface` and raster implementation, then runs them in existing local Chromium.

## Provenance and units

The earlier source audit used HEAD `ebe0d143f134d7e28cd2da386044a8327f0fe10b`. The initial isolated replay used `52493b5618ec22291b32caa8fd1f803c15384416`. The durable-script rerun used `2018111dfc429945f7a7e0b3807b8531fa8de0b9`. These are different checkout states. All seven imported source hashes matched between the initial replay and durable rerun; that comparison does not establish equality with the earlier audit. The exact hashes, Node version, date and rerun HEAD are in [provenance.json](results/provenance.json).

Croquis coordinates are sheet units. Ordinary native CSP timestamps have now been traced as integer milliseconds in the accompanying live-contract work. This harness rounds its synthetic fractional-millisecond sample times to integer milliseconds for the recovered helper; it retains fractional times for the current Croquis path. Neither the synthetic cadence nor its packet producer is a measured CSP device stream. Spatial correspondence between Croquis sheet units and CSP coordinates remains an adapter question. No window selected here reaches the recovered 1000-ms history-age boundary.

## Fixtures and measurement

Each path lasts two seconds and includes both endpoints at 60, 120 and 240 Hz. Pressure rises linearly from 0.2 to 0.8.

| Fixture                  | Position in sheet units, with s in seconds                       |
| ------------------------ | ---------------------------------------------------------------- |
| Three straight lines     | x = 20 + v*s, y = 80; v = 12, 180 or 600                         |
| Jitter                   | x = 20 + 60*s, y = 80 + 2*sin(24*pi*s)                           |
| Corner                   | Right for one second at 120 units/s, then down at the same speed |
| Loop                     | Radius 50 centered at (120,120), one loop in two seconds         |
| Acceleration             | x = 20 + 150*s*s, y = 80                                         |
| Stationary pressure ramp | x = 80, y = 80                                                   |

Filters are current Raw, current Smoothing 35 and 100, plus recovered fixed-mode S=4/T=0, S=12/T=0 and S=24/T=12. S/T values are experimental inputs with no asserted mapping to Croquis's slider. The recovered branch calls `configureLiveQueue`, `adjustFixedWindow` and `averageFractionalHistory`, including startup growth and fractional averaging of x/y/pressure. State is 0 for the initial sample and 1 afterward; both motion options are disabled. Pressure extrapolation, ending logic, output gating, fast/slow modes and the terminal driver are outside this bounded fixed-mode replay. Candidate terminal behavior is not invented.

The positional builder uses a pen with pressure response Off; pen taper remains. Actual engine delivery checks use normal pen pressure. An additional unspaced `StrokeCurve` accepts every filtered sample to isolate its lookahead from builder spacing.

Measurements use the last emitted centerline coordinate. They exclude brush-edge distance, event-to-photon delay, raster cost and hardware latency. Summary means use t >= 1000 ms. Distance divided by speed is reported as a delay equivalent only for the straight constant-speed fixtures, where the points remain collinear behind the nib. On curved paths the reported gaps are spatial distances; they are not additive delay terms.

## Downstream constraints

At 120 Hz, the current comparison baseline gives:

| Speed (units/s) | Baseline      | Raw to filter (ms) | Filter to emitted builder curve (ms) |
| --------------- | ------------- | -----------------: | -----------------------------------: |
| 12              | Raw           |              0.000 |                               58.196 |
| 12              | Smoothing 35  |             19.853 |                               58.196 |
| 12              | Smoothing 100 |            168.894 |                               70.889 |
| 180             | Smoothing 35  |             12.005 |                                8.333 |
| 600             | Smoothing 35  |              6.038 |                                8.333 |

For slow Raw input, the unspaced curve contributes one sample, 8.333 ms. The builder's minimum spacing plus accepted-point lookahead raises the combined gap to 58.196 ms. Its mean spatial gap is 0.698347 units: 0.198347 between the filtered position and newest accepted key, then 0.5 to the emitted endpoint. A CSP filter replacement passed through this unchanged downstream path inherits that additional behavior. High current Smoothing shows the opposite diagnostic case, where the disposable filter dominates. Finite precision and the exact 0.5-unit threshold affect accepted-key cadence; these measurements are fixture-specific.

For recovered fixed S=12/T=0, raw-to-filter delay is 91.667, 45.833 and 22.917 ms at 60, 120 and 240 Hz. All nine straight-line cases match the analytical steady-state delay of 5.5 sample intervals. Packet rate changes this branch's delay for the same continuous path and duration.

Actual `InkEngine` finalized operations match across frame groups of 1, 2, 4 and 8 samples, using either distinct events or coalesced events, for seven moving paths, three rates and three current Smoothing values: **504 equality assertions pass**. Frames run only after nonempty groups. This is a useful acquisition/consumer invariant for replacement work, not validation of a full reconstructed queue.

Genuine empty frames are separate: adding 400 ms of idle frames after the last input at Smoothing 100 changes the corner operation and final stored time from 2800 to 2840 ms. The last raw input is at 2000 ms. Current synthetic catch-up times therefore extend beyond input duration, and a replacement needs an explicit terminal-time policy.

## Repaint boundary

Real Chromium Canvas2D tests start with crossing red and blue ink. The checks compare every RGBA channel of 374 x 748 pixels.

| Comparison                                                                                 | Brush                    | Eraser                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| Current engine terminal raster versus replay of its finalized operation                    | Exact                    | 609 differing channels; 216 alpha pixels, maximum alpha difference 62 |
| Restore prior snapshot, paint synthetic corrected operation, compare with corrected replay | Exact                    | Exact                                                                 |
| Negative control: paint correction over provisional operation without restoration          | 6,335 differing channels | 4,286 differing channels                                              |

The synthetic correction moves one middle point; it is not recovered offline correction. These checks show that the existing surface supports snapshot-based terminal replacement for both tools. They also expose an existing eraser replay mismatch relevant to integration. Source inspection suggests repeated compositing of overlapping antialiased capsule boundaries during incremental painting versus one whole-operation fill during replay; that mechanism remains an inference. The current pen-brush terminal snapshot/repaint handles its tested case, while the eraser has no equivalent terminal repaint.

Generalized snapshot ownership, actual recovered post-correction, undo/redo, cancellation, forced finish, cleanup after errors and sealing remain production integration work outside this spike. The eraser mismatch is recorded rather than repaired because this task changes research artifacts only.

## Verification

The durable scripts reran successfully with:

```text
sample_rows: 40464
summary_rows: 144
engine_batch_checks: 504
engine_batch_failures: 0
raw_bypass_rows: 6744
analytical_fixed_window_checks: 9
```

[validation.json](results/validation.json), [summary.csv](results/summary.csv) and [pixels.json](results/pixels.json) retain the compact results. Raw bypass identity, constant-speed fixed-window delay and engine delivery equivalence are asserted. The browser driver asserts snapshot replacement equality and the negative controls; the current-engine eraser mismatch remains a diagnostic result.

The existing app unit tests were inspected, not run by this spike. These exported-module replays and real-canvas comparisons establish synthetic behavior only; no hardware, iPad feel, performance budget or end-to-end CSP runtime match is claimed.
