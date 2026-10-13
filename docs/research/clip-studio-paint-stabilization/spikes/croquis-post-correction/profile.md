# Selected round brush profile

`canvas/post-correction/profile.ts` stores the immutable ordinary round brush
configuration selected in the October 11 native recording. The core now uses
that configuration instead of the evaluator constructor's pre-settings values.
The curve, curve points, response objects, source configuration, and input
configuration are frozen. A correction cannot change the profile for a later
stroke.

## Observation

- Recording: `evidence/debugger-access/post-joined-20261011T230556.990852Z-2249f1a0/joined.jsonl` relative to the research folder.
- Recording SHA-256: `b02068367c020a8fecb3266e4b1213000d3292a16d5b40966cbb6a1b6515a104`.
- Pinned original ARM64 image SHA-256: `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
- Decoded comparison: [native-joined-20261011T230556-resolver-report.json](../post-joined/evidence/native-joined-20261011T230556-resolver-report.json).

The captured upstream constructor and movement comparisons match for the three
mouse source calls. The recorded post input has three nodes; the reconstructed
post result matches both retained nodes. These observations establish the
values below for the selected brush, not universal native defaults. The original
report rejected the different begin/post evaluator pointers. The corrected
reader follows the statically proved cache/copy setter contract and requires
captured resolved configuration; it does not replay the resolver's selection or
configuration conversion. The retained resolver report matches upstream, source,
and post stages. The other three matched
[second](../post-joined/evidence/native-joined-20261011T230954-report.json) and
[third](../post-joined/evidence/native-joined-20261011T231118-report.json), and
[fourth](../post-joined/evidence/native-joined-20261011T231350-report.json)
recordings contain the same full response configuration.

| Configuration                      | Observed value                                                                                | Production use                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary source                    | Begin mode `+d8=0`, defer `+dc=0`; effective holder mode 0                                    | Existing ordinary open `0x2021`, immediate node import                                                                                               |
| Source fade and corner             | Begin `+c0=0`, effective holder fade 0 and corner 0                                           | Both disabled                                                                                                                                        |
| Record offsets and angle selectors | Brush `+128/+12c=0`, `+148/+14c=0`                                                            | Zero offset, no angle selection                                                                                                                      |
| Startup response                   | Brush `+190=0`; position advances 0, 1, 2                                                     | Startup length 0, so position cannot affect record pressure                                                                                          |
| Event orientation                  | Bearing 0, inclination 90, rotation 0; reflection getters not called                          | Same neutral input orientation                                                                                                                       |
| Movement                           | Enabled, window 20, device type 1, platform 2, magnification 1, coordinate/document factors 1 | Current live strength and sheet magnification remain inputs; device type is pen 4 or other input 1; the observed neutral conversion factors remain 1 |
| Path parameter                     | 14.75, half brush diameter 29.5                                                               | Half the user's current Croquis brush size in sheet units                                                                                            |
| Main endpoint response             | Flags 17, minimum binary32 `3dcccccc`; four pressure controls below                           | Exact captured values                                                                                                                                |
| Other main response fields         | Input-1 minimum 0/maximum 1; input-2, random, input-4 minima 0; remaining curves absent       | Exact captured values                                                                                                                                |
| Secondary endpoint response        | Flags 0, disabled; base 1, minimum 0, input-1 range 0–1, remaining minima 0, curves absent    | Exact captured values                                                                                                                                |
| Endpoint adjustment                | Mode 1, brush bit 4 clear                                                                     | Exact captured values                                                                                                                                |

The main minimum is **0.09999999403953552**, not the binary32 rounding of the
decimal literal `0.1`. The pressure control coordinates are binary64:

| x bits             | y bits             | x                  | y                  |
| ------------------ | ------------------ | ------------------ | ------------------ |
| `0000000000000000` | `0000000000000000` | 0                  | 0                  |
| `3fd3333333333333` | `3fe2094f2094f209` | 0.3                | 0.5636363636363636 |
| `3fe586fb586fb587` | `3fed1745d1745d17` | 0.6727272727272727 | 0.9090909090909091 |
| `3ff0000000000000` | `3ff0000000000000` | 1                  | 1                  |

## Deliberate Croquis inputs

The browser supplies completed stabilized positions, pressure, phases, and
timestamps. Native-group resets and preservation of idle emitted points are
unchanged. The captured brush profile does not replace Croquis's pressure
setting, invent device tilt, or apply the native pressure curve to rendered
width. The curve belongs to the recovered endpoint-deletion evaluator.

The core still derives width and time from the original rendered stroke by
normalized cumulative distance. It still preserves both endpoint attributes
and total elapsed duration. The selected profile applies to the existing brush
and eraser correction path; it does not import any other native brush rendering
features.

## Checks and limits

The profile test preserves every pressure-control bit, the binary32 minimum,
the secondary settings, and adjustment mode. It checks every shared object is
frozen. At the curve endpoints, the recovered evaluator gives 14.375 for unit
pressure and 1.1062499340623617 for zero pressure at parameter 14.75; these are
arithmetic consequences of the captured configuration, not newly measured
native evaluator outputs.

A synthetic short-stroke regression exercises the actual core: low pressure
retains the initial endpoint while unit pressure permits its removal. Replacing
the selected configuration with constructor defaults makes the test fail: the
light stroke starts at `(0.30000000000000004, 0.13)` instead of `(0, 0)`. The test
also retains the original first/last width and elapsed duration. Existing
zero-pressure groups, idle endings, source phase checks, and attribute-transfer
tests remain active.

All four native recordings use mouse pressure 1. The first three exit endpoint
processing at the travel limit. The fourth reaches both modeled decisions at
segment length 4.101572507812477 and threshold 7.125, retaining both endpoints
as native output does. No recording observes actual endpoint deletion or
variable-pressure pen behavior. The reconstructed threshold is not a separate
native interior probe. Operating-system delivery, physical iPad performance,
and subjective pen feel remain outside these comparisons.

The [selected-profile standalone oracle](../post-evaluator/evidence/selected-profile-20261011T2345/README.md)
adds 1,530 exact binary64 outputs: 90 response-curve cases and 1,440 endpoint
cases over 90 retained binary32 pressures and 16 parameters. It executes the
original instructions with the decoded captured configuration and verifies 364
unchanged instruction words, 84 relocations, and FPCR zero. These synthetic
inputs cover pressure arithmetic without claiming a new tablet observation.
