# Native mouse post-correction capture, 2026-10-10

**The mouse setup check passed:** one complete native post-correction entry/normal-epilogue pair was captured in research PID 21351. The analyzer validated the saved allocations and pairing. CSP replaced a path containing 99 quadratic-Bezier nodes with a path containing eight spline nodes. This is a reusable native fixture, not reconstructed whole-curve equivalence.

## Selected setting and observed arguments

The user reports selecting the fifth of five post-correction indicator bars. The assistant's earlier instruction, "strength 5," ambiguously meant numeric value 5. The recorder actually observed `k=40`. This is not a user setup error, and no repeat is required to satisfy the mouse setup check. Raw metadata retains `requestedPostStrength: 5` as the historical instruction; it is not the measured value.

CSP's [official Tool Property documentation](https://help.clip-studio.com/ja-jp/manual_jp/150_tools/ツールプロパティパレット.htm), checked 2026-10-10, explains that indicator bars have configurable numeric values and that the right-hand button reveals numeric entry. Therefore a bar's ordinal position must be recorded separately from its numeric value. Do not infer a universal five-bar mapping from this one observation.

| Wrapper input            | Observed value                             | Evidence boundary                                                 |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| Strength `k`             | 40                                         | Actual entry register; fifth indicator bar is user-reported       |
| Positional tolerance `T` | 160, bits `4064000000000000`               | Actual entry register                                             |
| Speed flag `0x480`       | 0                                          | Speed adjustment off                                              |
| Bezier selector `0x482`  | 0                                          | Ordinary post-correction route                                    |
| Length scale `S`         | 8.097101964970545, bits `402031b75947da06` | Actual entry register; remains present with tolerance scaling off |
| Closure argument         | 0                                          | Actual entry register                                             |
| FPCR                     | `00000000`                                 | Observed at both boundaries                                       |

`T=0.1*40²` is consistent with display-scale tolerance adjustment being off. The scale checkbox itself was not captured. Applying the recovered conversion to `S` implies magnification `12.35009765625%`; this is an inference, not an independently read UI value. Brush name, brush size, layer type, and live stabilization settings were not independently measured. Requested live stabilization 0 and speed stabilization off remain operator notes.

## Retained evidence and checks

- [Raw successful recording](pid-21351.jsonl) and [debugger output](pid-21351-lldb.txt).
- [Full offline report](pid-21351-report.json): valid integrity, one pair, no errors, changed geometry.
- [Independent review](independent-review.md): allocation and list integrity, parameters, endpoints, and interpretation limits.
- [External process check](process-resume.txt): both research processes in state `S` after both debugger children exited.
- [Unused PID 21626 recording](pid-21626.jsonl), [debugger output](pid-21626-lldb.txt), and [report](pid-21626-report.json): zero entries, expected deadline, clean detach; correctly rejected as an incomplete fixture.
- [File manifest](manifest.json): sizes and SHA256 values for these retained files.

Both processes used the approved research executable. Each recorder verified all 284 wrapper bytes against original SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd` and installed two hardware probes. The successful process used image base `0x104218000`, with correctly relocated entry `0x106b05064` and normal epilogue `0x106b05144`.

The successful header is timestamped `2026-10-10T18:40:53.817298+00:00`. Entry occurred at recorder elapsed `1.691880208` seconds and return at `1.715071708`. Clean detach completed at `1.716997875` seconds, with no cleanup errors, warnings, unmatched entries or deadline overrun. The operation was observed after arming but before the assistant could issue the next drawing cue; the user had requested restart and confirmed readiness. These elapsed times include debugger behavior and are not measurements of natural processing latency.

Both endpoints retained exactly the same coordinates. Four returned node coordinates match source coordinates and four are new; this is not merely deletion of 91 source points. Matching coordinates do not prove correspondence. Source quadratic-Bezier nodes are compatible with the Bezier checkbox being off because that checkbox selects the post-correction route/output.

The preserved stack includes the known mouse-up and mouse-dispatch functions. The record does not contain a complete down/drag/up input stream or independently identify the physical device. The user supplied mouse input, and the native stack supports attribution to the mouse route.

## Reproduction and limits

From the repository root, choose a new report filename:

```sh
node docs/research/clip-studio-paint-stabilization/spikes/post-replay/compare.ts docs/research/clip-studio-paint-stabilization/evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl --out /absolute/path/to/new-report.json
```

Observed analyzer exit 0:

```text
Capture integrity: valid; valid pairs: 1; arithmetic matches/mismatches: 0/0; whole-curve equivalence: not evaluated.
```

The report's configuration warning is expected: it lacks an independent UI configuration fingerprint. Arguments copied into the return record cannot establish absence of UI changes. Four arithmetic results are derived from the reference, not measured inside CSP's helpers. The complete curve evaluator, correspondence, mutation, endpoint operations, rendering, speed-on/scale-on behavior, native tablet behavior and pen feel remain unvalidated. External endpoint object graphs are not recursively captured.

One valid operation satisfies the immediate mouse setup check. Additional manual input should target a named unresolved branch or device behavior after offline analysis identifies its need. The next initial tablet session remains two diagnostic strokes, not a promise that two strokes establish all modes.
