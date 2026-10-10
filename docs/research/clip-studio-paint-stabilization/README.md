# Clip Studio Paint stabilization implementation handoff

This handoff records the live input filter and geometric post-correction calculations recovered from the installed Clip Studio Paint 5.1.4 ARM64 executable. It supplies executable TypeScript reconstructions of the recovered arithmetic, annotated assembly, and a map of the corresponding Croquis code. It is intended for an agent implementing and tuning pen behavior in Croquis.

The central distinction is that live stabilization averages input samples with a changing fractional history window. Post-correction removes and reconstructs curve nodes subject to geometric and scalar constraints. Replacing one filter constant cannot reproduce both mechanisms.

The requested Croquis direction is to **replace the current stabilizer with an implementation based on the recovered CSP behavior**. The present One Euro filter is a disposable baseline. Its output is not the target to preserve or the standard for judging the replacement.

## Follow-up findings, 2026-10-09

The bounded follow-up spikes resolved several earlier unknowns:

- [Native live-input contract](spikes/live-contract/README.md): the ordinary Mac path supplies integer milliseconds and converted screen coordinates; the platform discriminator returns 2, so the configuration branch that scales settings for discriminator 4 is inactive in this build. Active emission options still need runtime observation.
- [Post-correction contract](spikes/post-contract/findings.md): type `0x80` is `PWVectorSplineCurve`; both preserved scalar writers and the ordinary span sampler's 5–256 point schedule are traced. A one-point fallback remains when no following node is available. The six-position evaluator, neighbor adjustment, and several upstream setting/producer meanings remain unresolved.
- [Croquis integration replay](spikes/croquis-replay/README.md): synthetic measurements separate the current filter from downstream point spacing and curve lookahead. The real-canvas experiment also identifies an existing eraser raster/replay discrepancy that a replacement must address. This evidence concerns integration; it does not validate CSP equivalence.
- [Runtime capture procedure and debugger access](runtime-capture.md): attachment to the installed app failed; the approved research copy successfully launched under LLDB. Its code/data sections match the original. Active settings were read, but the first bounded capture timed out without an input/output pair. Natural pen-feel comparison and computation replay remain outstanding.
- [Live capture preparation and verified mouse recording](spikes/live-capture/README.md): native mouse down/drag/up and the release callback's return were saved and independently checked, with clean detachment. Ordinary mouse follows a separate route and did not hit the recovered tablet filter. Its successful recording verifies capture mechanics; it does not establish tablet-filter equivalence or pen feel.

These reports supersede the corresponding unknowns in the original handoff. They do not turn the arithmetic reference into a complete CSP implementation.

## Read these files in order

| File                                                              | Contents                                                                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [live-reference.ts](live-reference.ts)                            | Executable reconstructions of the recovered live-filter arithmetic; comments identify the assembly addresses.                             |
| [live-analysis.md](live-analysis.md)                              | Queue fields, configuration, history, mode branches, pressure handling, flush behavior, and unresolved caller semantics.                  |
| [post-reference.ts](post-reference.ts)                            | Executable reconstructions of correction strength, pass scheduling, corner classification, scalar bounds, and curve-control calculations. |
| [post-analysis.md](post-analysis.md)                              | Full recovered correction sequence, point-removal criteria, flags, data structures, and missing pieces of the graph implementation.       |
| [croquis-integration.md](croquis-integration.md)                  | Current Croquis formulas and file locations, rendering constraints, proposed implementation boundaries, and acceptance criteria.          |
| [evidence/provenance.json](evidence/provenance.json)              | Application version, architecture, executable fingerprint, and analysis method.                                                           |
| [evidence/live](evidence/live) and [evidence/post](evidence/post) | Addressed assembly supporting the reconstructions.                                                                                        |
| [verify_core.py](verify_core.py)                                  | Read-only verification against the installed executable; refuses a different executable fingerprint.                                      |

The reference code is outside the frontend build. Preparing this handoff does not change Croquis's drawing behavior.

## Meaning of exact

The assembly instructions, constants, call sites, and object-field offsets are exact for the fingerprinted executable. The TypeScript files are readable reconstructions written for this investigation. They are not CELSYS's original C++ source, and descriptive function and field names were assigned where symbols were absent.

The reference functions make recovered inputs explicit. An unresolved condition is passed by the caller or described in the analysis; it is not replaced with an invented default. They do not constitute a complete implementation of CSP's event queue or internal vector-path graph. In particular, the geometric correction pipeline cannot be reproduced merely by calling a generic point simplifier.

Most geometric calculations use binary64 values; selected scalar calculations narrow to binary32. JavaScript does not directly expose the ARM fused multiply-add instructions used by some routines. The post-correction reference includes a software `fma64` implementation for its recovered fused expressions; the live reference preserves the mathematical operations but uses separate multiplication and addition. Even an algebraically identical expression can differ in its last bits. The reference code documents these precision boundaries. Finite, valid drawing inputs are its intended domain unless a function explicitly documents otherwise. The BigInt-based software FMA is an audit aid, not a recommended per-sample production implementation without performance measurement.

No recorded pen-event stream has been replayed through both CSP and these functions. Arithmetic tests establish the stated equations and boundary cases, not identical application behavior or subjective pen feel.

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

The slow-motion branch requires the exact history scan and boundary handling in `live-reference.ts`; applying only its target equation omits meaningful behavior.

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

Croquis's current filter identifies itself as One Euro. The authors describe that filter and publish implementations at [the One Euro project](https://gery.casiez.net/1euro/). That algorithm is a comparison baseline; it is not the fractional-history kernel found in CSP.

## Suggested instruction to the next coding agent

Read this entire directory, including the follow-up spikes and runtime-capture.md. Treat the TypeScript files as reference arithmetic, not a complete CSP clone. The intended product direction is to replace Croquis's current stabilization with the recovered CSP behavior; do not tune the replacement to reproduce the old filter. Reuse the synthetic replay harness, then add actual input capture under an explicit coordinate and sampling policy. Complete the live queue state machine and compare captured CSP inputs/outputs before claiming fidelity. Keep live stabilization, curve-preview behavior, pressure response, and after-lift geometric correction independently observable. Resolve the missing post-correction evaluator/graph operations or document an intentional adaptation. Use snapshot and repaint mechanics for corrected final geometry, including the eraser discrepancy identified by the replay spike. Preserve undo, cancellation, sealing, brush width, touch, and eraser behavior. Follow Croquis's Japanese and English catalog requirements for any new controls. Verify the acceptance cases in croquis-integration.md, and report every deliberate departure from the recovered formulas. Do not claim exact CSP equivalence without resolving the documented gaps and comparing recorded input/output behavior.
