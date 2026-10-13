# Selected profile standalone native comparison

All **1,530 outputs match exact binary64 bits**: 90 response-curve outputs and
1,440 configured endpoint outputs. No CSP process was launched, attached, or
changed. This is synthetic pressure coverage of the captured configuration,
not a new observation of tablet input or native endpoint deletion.

`prepare.mts` decodes the entry and return evaluator snapshots from
`post-joined-20261011T230556.990852Z-2249f1a0/joined.jsonl`, verifies the capture's
SHA-256, checks both configurations agree, and checks the whole configuration
equals the production profile. It then creates independent oracle inputs from
that decoded configuration. The main response has flags 17, minimum binary32
`3dcccccc`, the captured four binary64 controls, and adjustment mode 1.

The 90 retained binary32 pressures cover 0 through 1: a uniform grid, nearby
binary32 values around control/segment boundaries, values beside 1, very small
normal and subnormal values, and a deterministic additional sample. Other node
attributes remain neutral: flags 0, scalars `[pressure, 1, 0, 0, 1, 1, 1]`.
Every pressure is tested at parameters
`[0, 2^-24, 1e-8, .01, .1, .25, .5, .75, 1, 1.25, 1.5, 2.5, 5, 7.5, 14.75, 50]`.
The last four include the requested brush radii; the small values exercise the
evaluator's lower clamp and adjustment at short endpoint scales.

`run_native.py` imports the existing `post-evaluator/native_oracle.py` unchanged,
checks its source hash, substitutes only the new case list, and redirects its
evidence output here. The harness extracts and executes the original pure ARM64
instructions, verifies 364 unchanged instruction words and 84 relocations,
and requires FPCR zero. Compile, symbol inspection, and execution keep the
existing 60/15/30-second bounds. The original native-vector file was not changed.

`compare.mts` calls production `evaluatePostEndpoint` and
`evaluatePostResponseCurve` with the production profile, preserves every output
bit, checks all native case inputs equal the prepared inputs, and checks source
hashes still match. `comparison.json` contains every result and zero failures.

At radius 14.75, native endpoint outputs include:

| Retained pressure | Native and production bits |
| --- | --- |
| 0 | `3ff1b33321800000` |
| 0.5 | `40261423323b28b0` |
| 1 | `402cc00000000000` |

The initial commands, run from the repository root, were:

```sh
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/evidence/selected-profile-20261011T2345/prepare.mts
python3 docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/evidence/selected-profile-20261011T2345/run_native.py
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/evidence/selected-profile-20261011T2345/compare.mts
```

The scripts refuse to overwrite their primary result files. Use a new evidence
directory for a later run. Extracted instructions and native assembly in this
directory remain local under the release audit's evidence policy.
