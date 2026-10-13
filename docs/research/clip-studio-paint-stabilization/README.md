# Clip Studio Paint stabilization implementation handoff

This handoff records the live input filter and geometric post-correction calculations recovered from the installed Clip Studio Paint 5.1.4 ARM64 executable. It supplies executable TypeScript reconstructions of the recovered arithmetic, annotated assembly, and a map of the corresponding Croquis code. It is intended for an agent implementing and tuning pen behavior in Croquis.

The central distinction is that live stabilization averages input samples with a changing fractional history window. Post-correction removes and reconstructs curve nodes subject to geometric and scalar constraints. Replacing one filter constant cannot reproduce both mechanisms.

The requested Croquis direction is to **replace the old stabilizer with an implementation based on the recovered CSP behavior**. The old One Euro filter's output is not the target to preserve or the standard for judging the replacement.

[Persistent research locations](research-locations.md) identifies the app, original image, current tools, and saved temporary working files after the 2026-10-10 reboot preparation. Future work uses those locations; historical temporary paths remain in raw evidence for provenance.

## Current result, 2026-10-11

**Live stabilization and ordinary post correction are implemented on main.** The old filter has been
replaced by the recovered shared arithmetic/queue, using the existing 0–100
Smoothing control (default 35) and taper 0. Pen input offers fixed (default),
slow-drawing adjustment at strengths 0–30, and fast-drawing adjustment from
strength 3; each choice uses fixed behavior outside its active range. Mouse
and touch remain fixed. The choice is captured at stroke start and retained in
kept sessions; older sessions default to fixed. The [current controls and
verification](spikes/croquis-post-correction/README.md) record the bilingual UI,
the controls and historical checks. The final follow-up passed 2,567 frontend
tests and 22 Chromium/WebKit cases; see the [delivery record](spikes/post-joined/delivery-20261011.md).
The [initial live integration report](spikes/croquis-stabilization/README.md)
documents browser adaptation, release, pressure detection, resize handling,
and measured performance. Neither report claims identical native pen feel.

Feature commit `d229c59e` was merged, pushed, and deployed normally. The public
worker check then exposed four one-ULP WebKit width differences in Croquis
attribute transfer, with geometry and times exact. Follow-up main commit
`b6128209b6490c3c0b1a265e312f2b7d780dd582` changes only that distance calculation;
it is now deployed and publicly verified at https://stickeroo.art/. Five served
assets match the build byte for byte, and light/firm worker outputs match every
bit in Chromium and WebKit. See the delivery record for the retained checks.
**Four automated
[joined native comparisons](spikes/post-joined/native-validation-20261011.md)
now match all recorded upstream/source/post fields**, using the selected
observed brush configuration at three zoom levels and two brush sizes, with
post speed adjustment off and on. Cache/copy selection remains outside that
replay; the resolved evaluator is independently captured. The live speed choices
add no new native tablet stroke recording:
[450 standalone configuration/window cases](spikes/post-runtime-profile/evidence/live-modes-comparison.json)
match exactly, and separate production probes cover 909 contact sequences.

The live reconstruction now matches every compared field in two complete native tablet recordings: **311 included calls at S=20/T=0** and **115 at S=0/T=0**, through recorded release and source return. The [S20 report](evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s20-comparison-final.json) and [S0 report](evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s0-comparison-final.json) retain exact bit comparisons. Correctly fused fractional accumulation resolves all 16 numeric-field differences in the S20 recording without changing tolerances or reseeding predicted state. The reference also preserves the recovered fused distance and ending operations. This validates those captured sequences, not all settings, browser input adaptation, rendering, or pen feel.

Post correction now has a complete [ordinary open-path replay](spikes/post-pipeline/README.md) for the saved case. Starting with its captured input and settings, the reconstruction produces the same eight spline nodes: ordered coordinates match binary64 bits, seven scalar fields match binary32 bits, and node flags, endpoint data, adjacency and path flags match. The removal sequence is 99 input nodes → 304 subdivided nodes → 153 → 77 → 39 → 20 → 12 → 10 → 8 → 8. The algorithm never reads the expected output; the comparison runs afterward.

The [geometry foundation](spikes/post-spline/README.md) has 1,614 native arithmetic cases; source sampling/projection adds 717 and spline length adds 110. Extracted instructions and relocated branches are checked against the original image. The saved case's missing endpoint evaluator cannot affect its retained geometry: the independently predicted head and tail segments measure 1648.7323712842876 and 1578.852227083522, each exceeding the captured travel limit 2.5 before a deletion decision. This is a geometry proof for this case, not reconstruction of the evaluator object's side effects or behavior on short endpoints.

The previously missing [source construction](spikes/post-source/README.md), [source input arithmetic](spikes/post-input/README.md), and [configured endpoint evaluator](spikes/post-evaluator/README.md) are now reconstructed. Respectively, 520, 6,240, and 680 standalone native cases match. The source constructor comparisons cover original instructions with explicit object/container seams; the historical 99-node recording still has no paired upstream records or evaluator snapshot. The four new joined captures retain both. Their [selected round brush profile](spikes/croquis-post-correction/profile.md) now replaces constructor-only endpoint settings in production, with another [1,530 exact native instruction comparisons](spikes/post-evaluator/evidence/selected-profile-20261011T2345/README.md) across synthetic pressure/parameter inputs.

The joined captures cover ordinary correction with Bézier off. All use pressure
one. The shortest reaches both reconstructed evaluator-dependent endpoint
decisions and retains the endpoints, matching native output; none observes
endpoint deletion or variable-pressure joined behavior. OS/browser acquisition,
rendering, and natural pen feel remain separate from this arithmetic proof.

The [exact arithmetic optimization](spikes/post-performance/README.md) reduced a fresh saved-case baseline of 7.85 seconds to 211–316 ms on this Mac, with Chromium/WebKit runs of 162–303 ms. All 202,744 additional native FMA cases and the saved output remain exact. The earlier 101-second observation occurred before this optimization and under different host load. The recovered post implementation now lives in Croquis's `canvas/post-correction/`; research modules re-export it. The [integration report](spikes/croquis-post-correction/README.md) records the browser profile, controls, lifecycle, rendering choices, final validation and limits. No complete CSP brush-rendering or identical-pen-feel claim follows from these arithmetic results.

The dated sections below describe earlier stages and are superseded by this result where they differ.

## Capture preparation, 2026-10-10

[Preparation status, settings coverage, and the bounded tablet procedure](capture-preparation.md) cover both features. The [offline live queue replay](spikes/live-replay/README.md) compares saved inputs, state and outputs across a complete captured sequence. The [post recorder](spikes/live-capture/capture_post_correction.py) and [offline post analyzer](spikes/post-replay/README.md) preserve and compare before/after paths, with [verified layouts and settings](spikes/post-capture-contract/README.md). A [native mouse post-correction capture](evidence/debugger-access/post-mouse-manual-20261010T184049Z/README.md) passed integrity checks and recorded 99 input nodes becoming eight spline nodes, at observed strength `k=40` after the user selected the fifth indicator bar. At that stage, post-curve prediction and a native pen recording were still outstanding; the October 11 results above supersede those limits for their documented cases.

## Follow-up findings, 2026-10-09

The bounded follow-up spikes resolved several earlier unknowns:

- [Native live-input contract](spikes/live-contract/README.md): the ordinary Mac path supplies integer milliseconds and converted screen coordinates; the platform discriminator returns 2, so the configuration branch that scales settings for discriminator 4 is inactive in this build. Active emission options still need runtime observation.
- [Post-correction contract](spikes/post-contract/findings.md): type `0x80` is `PWVectorSplineCurve`; both preserved scalar writers and the ordinary span sampler's 5–256 point schedule are traced. A one-point fallback remains when no following node is available. The six-position evaluator, neighbor adjustment, and several upstream meanings were unresolved at that stage; current reconstruction is documented above.
- [Croquis integration replay](spikes/croquis-replay/README.md): synthetic measurements separate the current filter from downstream point spacing and curve lookahead. The real-canvas experiment also identifies an existing eraser raster/replay discrepancy that a replacement must address. This evidence concerns integration; it does not validate CSP equivalence.
- [Runtime capture procedure and debugger access](runtime-capture.md): attachment to the installed app failed; the approved research copy successfully launched under LLDB. Its code/data sections match the original. Active settings were read, but the first bounded capture timed out without an input/output pair. Natural pen-feel comparison and computation replay remain outstanding.
- [Live capture preparation and verified mouse recording](spikes/live-capture/README.md): native mouse down/drag/up and the release callback's return were saved and independently checked, with clean detachment. Ordinary mouse follows a separate route and did not hit the recovered tablet filter. Its successful recording verifies capture mechanics; it does not establish tablet-filter equivalence or pen feel.

These reports supersede the corresponding unknowns in the original handoff. They do not turn the arithmetic reference into a complete CSP implementation.

## Read these files in order

| File                                                                                                         | Contents                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Production live arithmetic](../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts) | Executable recovered live-filter arithmetic; comments identify assembly addresses.                                                        |
| [Production live queue](../../../apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts)           | One browser-safe queue shared by Croquis and native capture replay.                                                                       |
| [live-analysis.md](live-analysis.md)                                                                         | Queue fields, configuration, history, mode branches, pressure handling, flush behavior, and unresolved caller semantics.                  |
| [post-reference.ts](post-reference.ts)                                                                       | Executable reconstructions of correction strength, pass scheduling, corner classification, scalar bounds, and curve-control calculations. |
| [Post geometry foundation](spikes/post-spline/README.md)                                                     | Exact spline and quadratic formulas, executable code, standalone instruction oracle, and remaining pipeline dependencies.                 |
| [Complete ordinary post replay](spikes/post-pipeline/README.md)                                              | Source graph, associations, ordered removal, endpoints, native comparison and supported domain.                                           |
| [Source construction](spikes/post-source/README.md)                                                          | Recovered quadratic source nodes, controls, scalar import, caller configuration and native instruction comparisons.                       |
| [Source input arithmetic](spikes/post-input/README.md)                                                       | Stateful movement, timestamp handling, startup response and explicit browser input choices.                                               |
| [Endpoint evaluator](spikes/post-evaluator/README.md)                                                        | Brush response curves, short endpoints, native configuration defaults and half-size parameter trace.                                      |
| [Croquis post integration](spikes/croquis-post-correction/README.md)                                         | Worker, direct spline rendering, settings, lifecycle, tests and remaining fidelity limits.                                                |
| [post-analysis.md](post-analysis.md)                                                                         | Full recovered correction sequence, point-removal criteria, flags, data structures, and missing pieces of the graph implementation.       |
| [croquis-integration.md](croquis-integration.md)                                                             | Current Croquis formulas and file locations, rendering constraints, proposed implementation boundaries, and acceptance criteria.          |
| [evidence/provenance.json](evidence/provenance.json)                                                         | Application version, architecture, executable fingerprint, and analysis method.                                                           |
| [evidence/live](evidence/live) and [evidence/post](evidence/post)                                            | Addressed assembly supporting the reconstructions.                                                                                        |
| [verify_core.py](verify_core.py)                                                                             | Read-only verification against the installed executable; refuses a different executable fingerprint.                                      |

Native probes, disassembly, captured data and research runners stay outside the
frontend build. Both live and ordinary post arithmetic are production modules;
research entry points use those same implementations rather than keeping
separate copies.

## Meaning of exact

The assembly instructions, constants, call sites, and object-field offsets are exact for the fingerprinted executable. The TypeScript files are readable reconstructions written for this investigation. They are not CELSYS's original C++ source, and descriptive function and field names were assigned where symbols were absent.

The reference functions make recovered inputs explicit. An unresolved condition is passed by the caller or described in the analysis; it is not replaced with an invented default. The research live queue driver now assembles the recovered ingestion sequence for offline comparison within its documented domain. It does not reproduce the native event producer, allocator, renderer or full internal vector-path graph. In particular, the geometric correction pipeline cannot be reproduced merely by calling a generic point simplifier.

Most geometric calculations use binary64 values; selected scalar calculations narrow to binary32. JavaScript does not directly expose the ARM fused multiply-add instructions used by some routines. Both implementations use shared [binary64.ts](../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts) only where the recovered instructions fuse multiplication and addition; separate instructions remain separate. Even an algebraically identical expression can differ in its last bits. Finite, valid inputs are the intended domain unless documented otherwise. Performance must be measured separately: the offline post pipeline is much more expensive than live averaging.

Saved CSP input/state/output sequences have now been replayed offline through the reconstructed live queue and ordinary post pipeline, with the scoped exact results above. This is not injection of a stream into both applications, a whole-feature equivalence proof, or a measurement of subjective pen feel.

## Parameters to keep separate

| Parameter               | Recovered role                                                                                                                        | Implementation consequence                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `S`                     | Internal live stabilization setting.                                                                                                  | It limits or initializes a sample-history window. Do not automatically equate it to Croquis's current percentage slider.      |
| `T`                     | Second queue setting associated with taper.                                                                                           | It affects the initial window, pressure decline, ending conditions, and terminal samples.                                     |
| `H`                     | Fractional current history window.                                                                                                    | Stateful; update it at the recovered point in each input-processing step.                                                     |
| `I`                     | Initial history window derived from `S` and `T`.                                                                                      | The beginning of a stroke need not have the same lag as a long stroke.                                                        |
| `k`                     | Internal post-correction strength.                                                                                                    | Used in positional tolerance, pass scheduling, and scalar-preservation limits.                                                |
| `M`                     | View magnification percentage, strongly established by the affine-transform call chain.                                               | Optional tolerance scaling uses `100 / M`.                                                                                    |
| node scalar at `+0x44`  | Imported from `SVectorNode+0x10`, traced to brush-event `+0xa0` and input-wrapper `+0xc8`, with optional response/startup transforms. | The original OS/device property is not connected end to end. Raw pressure or rendered width is not an established substitute. |
| source float at `+0x4c` | Derived stateful movement/time factor, capped above at 1, imported from `SVectorNode+0x20`.                                           | Retain the derived factor or reconstruct its full initializer and history. Raw speed is not equivalent.                       |

## Main calculations

For finite `H >= 1` in successful ordinary averaging, let the input history be newest first, `Q = (x, y, pressure)`, `m = floor(H)`, and `r = H - m`:

```text
output = (sum(Q[i], i = 0 .. m - 1) + r * Q[m]) / H
```

The implementation repeats the last usable input when history is too short or old. The code and analysis specify how pressure transitions can alter this otherwise straightforward formula.

For nonnegative settings in the regular configuration path:

```text
I = S                                      if S < 3
I = clamp(floor(min(S, T) / 2), 2, 15)       otherwise
H = I
```

In the fixed mode, while active or ending and `H < S`:

```text
H = min(S, H + min(0.5, (S - H + 1) / S))
```

In the fast-motion adjustment branch, using consecutive input distance `d`:

```text
D = 2*S + 100
u = (D - d) / D
H += (u > 0 ? 0.5*u : u)
H = clamp(H, 2, activeOrEnding ? S : I)
```

The slow-motion branch requires the exact history scan and boundary handling in production `stabilization/arithmetic.ts`; applying only its target equation omits meaningful behavior.

The regular enabled post-correction branch begins with:

```text
epsilon = 0.1 * uint32(k * k)
if callerRequestsMinimum and epsilon < 0.2:
    epsilon = 0.2
if adjustByScale:
    epsilon *= 100 / M
```

The uint32 operation reflects the actual 32-bit multiply followed by unsigned conversion. Ordinary UI-sized nonnegative settings have the familiar `0.1*k²` result. Do not interpret `epsilon` as a squared-distance threshold: the removal check compares sampled geometric distance against it.

Additional caller clamps, per-segment scaling, tolerance progression, scalar constraints, and cleanup passes are recorded in `post-analysis.md`. The expression above is the initial tolerance, not the entire correction algorithm.

## What an implementing agent must decide

1. **Coordinate and time normalization.** CSP's live fast-motion calculation uses distance per packet. The traced ordinary Mac producer supplies screen coordinates and integer milliseconds; physical tablet/browser-coordinate equivalence and actual input cadence remain unmeasured. Applying its constants directly to fixed Croquis sheet coordinates requires an explicit conversion. Preserve raw samples before that conversion.
2. **Pressure responsibilities.** CSP's recovered averaging kernel includes pressure. Croquis currently filters position and handles pressure separately. A position-only adaptation should be labeled as such; averaging pressure in both places can add another delay.
3. **Preview latency.** Croquis's curve renderer waits for a later accepted key. Live-filter lag and curve-preview lag must be evaluated separately. Post-correction after pen-up cannot eliminate lag while the pen is moving.
4. **Geometric representation.** CSP retains source-node correspondence during repeated simplification. An implementation needs an equivalent source reference and tested curve sampling if it aims to reproduce the recovered acceptance checks.
5. **Repainting.** Croquis paints incrementally into a raster surface. Post-correction must replace the already-rendered live stroke, then commit the corrected operation. Altering stored coordinates alone leaves incorrect pixels on the surface.
6. **Scope of equivalence.** Implementing the confirmed live arithmetic is tractable now. Exact whole-pipeline equivalence also needs the unknown inputs and graph behavior listed in the detailed analyses, followed by runtime comparison. A deliberately simpler correction algorithm can be useful but must be identified as an adaptation.

These are implementation decisions, not discovered CSP constants. They belong in the implementation design before changing application behavior.

## Deriving pen lag from the recovered window

The following is a mathematical consequence of the averaging kernel, not an additional discovered CSP routine. With a fixed window, a long enough history, uniform sampling interval `dt`, and constant velocity, the weighted mean sample age is:

```text
m = floor(H)
r = H - m
delayInSamples = (m*(m - 1)/2 + r*m) / H
delayInTime = delayInSamples * dt
positionLag = velocity * delayInTime
```

For an integer window this simplifies to `(H - 1)/2` samples. Thus changing the event rate changes the time lag even when `H` is identical. The ramp at stroke start, variable `H`, sample padding, output gating, and the renderer's lookahead add behavior outside this steady-motion calculation. `reference-invariants.test.ts` checks this derivation against the reconstructed kernel.

## Verification and reproducibility

From the repository root, run the reference tests and installed-binary check:

```sh
node --test docs/research/clip-studio-paint-stabilization/*.test.ts
python3 docs/research/clip-studio-paint-stabilization/verify_core.py
```

The reference tests require Node.js with native TypeScript stripping (verified with Node 24) and Python 3.13 or newer for the independent `math.fma` oracle used by the post-correction tests. The binary verifier requires macOS `lipo`, `objdump`, Python 3, and the same installed application. It extracts the ARM64 slice into a temporary directory, checks its SHA256, prints constants and disassembly, and removes the temporary executable on exit. No executable is included in this handoff.

Additional addresses can be inspected without modifying the script:

```sh
python3 docs/research/clip-studio-paint-stabilization/verify_core.py \
  --range 0x1027878ec:0x102787a1c \
  --double 0x1042e3690
```

`evidence/verification.txt` records the exact final commands, exit statuses, and output from this handoff's verification. Test fixtures are synthetic arithmetic checks; they are not CSP runtime captures.

## Public documentation and resource labels

CSP documents live stabilization separately from post-correction, with speed adjustment, display-scale adjustment, and a quadratic Bézier option. This supports the interpretation of the recovered branches but does not provide their formulas: [CSP Correction settings](https://help.clip-studio.com/en-us/manual_en/810_subtools/C.htm).

`evidence/correction-labels.json` records the relevant strings and resource offsets extracted from the installed English resources. Direct association from every numeric setting ID to its translated UI label remains incomplete. These labels should not be treated as recovered C++ field names.

Croquis's former filter used One Euro. The authors describe that filter and publish implementations at [the One Euro project](https://gery.casiez.net/1euro/). That algorithm is a historical comparison baseline; it is not the fractional-history kernel found in CSP or Croquis's current implementation.

## Suggested instruction to the next coding agent

Start with the current live and post integration reports, their verification
records, and the authoritative production modules. Both features are implemented;
do not repeat the replacement work described in the historical reports. Preserve
the pinned native fixtures when tuning, and distinguish deliberate product
changes from recovered arithmetic. The next validation frontier is real-device
feel and additional configuration coverage, not the already completed ordinary
graph/evaluator reconstruction. Keep acquisition, live filtering, Croquis width
response, preview rendering and post correction independently observable.
Preserve undo, cancellation, layers, sealing and brush/eraser replay. The selected
brush configuration and four paired upstream/source/post recordings are now
available. Cache/copy selection, variable-pressure joined native behavior,
endpoint deletion, other brushes/modes, and browser/OS feel remain outside that
proof. Do not claim whole-feature CSP equivalence from the retained cases.
