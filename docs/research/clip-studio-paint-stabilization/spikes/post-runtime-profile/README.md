# Ordinary post-correction caller configuration

Static analysis dated 2026-10-11. This closes the ownership of the optional cap
and movement-coordinate factors, and identifies bounded reads for the remaining
configured values. It does not report new runtime observations. No CSP process
was launched, attached, or called.

The preserved CSP 5.1.4 ARM64 image is
`/Users/adoll/Applications/CSP Research/original-arm64`, SHA-256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
`evidence/manifest.json` retains extraction commands, addressed function bounds,
original instruction-byte hashes, and saved disassembly hashes.
`evidence/static-metadata.json` retains vtable slots, RTTI records, type-name
bytes, and constants. These are disassembly and data reads, not original source
or decompiler output.

## Findings and runtime status

| Value                     | Producing code and owner                                                                    | Exact resolved behavior                                                                                                                                                        | Runtime status                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Optional post cap         | Finalizer `0x102891cd4..0x102891d24`; snap operation at brush `+0x78`                       | If the snap object exists, virtual `+0x10` returns nonzero, and its type at `+0x20` is not 100, cap signed strength at 4 when it is at least 5 and cap tolerance above at 1.5. | Gate is identified; chosen brush's snap pointer/type was not observed here.                                                          |
| Coordinate factor `C`     | `0x1021c7320` resolves the root view through `0x1021bbe5c`, then calls its virtual `+0x358` | Null root returns 1. `PWView` and `PWCanvasView` slots both target `0x1021c73b8`, which returns binary64 1.                                                                    | Fixed for these identified dispatch targets; actual root/override remains a runtime value.                                           |
| Rational factor `D`       | View `+0x98/+0xa8`, `0x1021bca90`, `0x1021d574c`, `0x1020c09dc`, `0x103116810`              | Two view-owned signed rational pairs pass through process-wide rational multipliers. Only the first resulting pair is converted to double and used for movement.               | Runtime view fields and mutable global multipliers remain unobserved. It is not established as a fixed document-resolution constant. |
| Magnification `M`         | `0x102992930`; `ViewInfo` value `+0`                                                        | Binary64 percent multiplied by binary64 0.01 at the movement caller.                                                                                                           | Runtime property; Croquis supplies its captured sheet scale.                                                                         |
| Platform                  | `0x102194e64` → `0x102072aa4`                                                               | Returns integer 2 in this image.                                                                                                                                               | Statically fixed for the pinned image.                                                                                               |
| Source family             | Begin caller `0x10288983c..0x10288986c`, begin record `+0xd8`                               | Post enabled takes the zero store. The ordinary builder then creates path type `0x2021`.                                                                                       | Fixed in the selected ordinary post-enabled branch; other caller branches exist.                                                     |
| Deferred source begin     | Begin record `+0xdc` → builder `+0x158`                                                     | Normally zero; the selected snap setup can set it to one.                                                                                                                      | Must read begin record or initialized builder for a native comparison.                                                               |
| Source corner processing  | Begin `0x1028ebd40`, record `+0xd8/+0x104`, renderer setup `0x1024a1268`                    | Initial flag is `d8 != 0 && field104 == 0`; renderer setup may supply the final flag. Ordinary setup passes zero to its enabling argument.                                     | Ordinary direct branch is narrowed; read builder `+0x138` after begin for a complete observation.                                    |
| Scalar fade               | `0x1028e11a4`; settings 1160, 1180, 1181, then 1162                                         | Requires successful retrieval, enum 1160 equal 2, Boolean 1180 true, converted length 1181, and caller response gate from 1162.                                                | Runtime settings; resolved begin `+0xc0/+0xc8` are sufficient.                                                                       |
| Startup pressure response | Begin `0x1028889ac`, record constructor `0x10288cd3c`; brush `+0x190`, incoming `d1`        | Startup length depends on pressure-response availability, device/platform, stabilization, and setting 50. Position is the actual constructor argument.                         | Neither zero nor a constructor default proves the selected brush's value.                                                            |
| Position/orientation      | Constructor `0x10288cd3c`; brush `+0x128/+0x12c`, `+0x148/+0x14c`, ViewInfo reflections     | Signed offsets; bearing takes precedence over rotation; optional 360 and 180 reflections follow selection.                                                                     | Runtime brush/event values, explicitly disabled in Croquis's present profile.                                                        |
| Endpoint parameter        | `0x1028da414`, begin `+0x10` → path `+0x98`                                                 | Unit-converted setting 1000 times 0.5, optionally divided by magnification when Boolean 1002 is enabled.                                                                       | Unit-zero Croquis diameter supports `brushSize / 2`; native conversion inputs remain per-brush values.                               |
| Endpoint evaluator        | Begin `+0x20`, path setter `0x1027897a0` → `0x1024cc404`                                    | Reuses or copies the configured brush responses, not the constructor-only response.                                                                                            | Separate bounded snapshot is required; see `../post-evaluator/README.md`.                                                            |

## The optional cap belongs to snapping

The object at brush `+0x78` is produced by snap factory `0x102ce88a4` and
stored by `0x102889940..0x102889954`. `0x102ce8894` reads its type at `+0x20`.
The saved vtable/RTTI bytes identify the following concrete classes:

| Type | Class                    | Constructor/factory | Virtual `+0x10`                                     |
| ---- | ------------------------ | ------------------- | --------------------------------------------------- |
| 10   | `PWSnapRuler`            | `0x102ce9998`       | `0x102ce889c`, returns 1                            |
| 20   | `PWSnapRulerParallel`    | `0x102cef024`       | Returns 1                                           |
| 21   | `PWSnapRulerEmit`        | `0x102ceda80`       | Returns 1                                           |
| 22   | `PWSnapRulerCurveEmit`   | `0x102ceb708`       | Returns 1                                           |
| 30   | `PWSnapRulerPerspective` | `0x102cef884`       | `0x102cef874`, returns `u32(object+0xb0) != 3`      |
| 40   | `PWSnapRulerGuide`       | `0x102cee2b8`       | Returns 1                                           |
| 50   | `PWSnapGrid`             | `0x102ce7078`       | Returns 1                                           |
| 100  | `PWSnapVector`           | `0x102cf9f70`       | Returns 1, but the cap explicitly excludes its type |

The retained metadata also identifies concentric-circle and parallel-curve snap
classes. Their numeric type arguments are not needed to resolve the cap and are
not assigned names or numbers here.

For example, `PWSnapVector` writes 100 at `0x102cfa100..0x102cfa104`;
its vtable is `0x104a717f8`. The perspective gate is important: the presence of
a snap pointer alone does not prove that the cap ran. An ordinary Croquis brush
with no snapping does not require this cap. Applying it unconditionally would
change the recovered caller behavior.

## Coordinate factors and owning fields

At begin `0x102888cc0`, the view is taken from event `+0x10`.
`0x1021bca90` passes view `+0x58` to `0x1021d574c`, which copies its
`+0x40/+0x50` pairs: consequently the original values are at view
`+0x98/+0xa8`, each `{signed64 numerator, signed64 denominator}`.

For the pinned Mac platform, the platform-1 branch in `0x1020c05d8` is skipped.
Let `R[i]` be each original view ratio, `G` the signed rational at
`0x104c8fef0`, and `H[i]` the pair at `0x104c8ff00 + 16*i`.
For the ordinary nonnegative-ratio domain, the instruction order is:

1. Copy `R` into `B`.
2. If `G` is exactly `0/1`, skip multiplication. Otherwise perform the
   native signed quotient adjustment and skip when its resulting integer is
   negative; for a positive denominator this is the floor of `G`.
3. In the remaining branch, multiply each `B[i]` by `G` using the native
   cross-canceling rational multiplication `0x100652310`.
4. Compute `R[i] * H[i]` independently and select the greater of that result
   and `B[i]` using `0x1004dfec0`.
5. `0x103116810` separately converts the first result's signed numerator and
   denominator to binary64 and divides them. This is movement argument `d2`.

`0x1031164a8` copies and multiplies a rational; it is not division. The
zero test above is specifically numerator zero/denominator one. Initializer
`0x1020c0f6c` sets `G=1/1` and `H[0]=H[1]=0/1`, which produce the identity
for positive `R`, but setters `0x1020c0504` and `0x1020c0524` can replace
these global values. Initialization is not evidence of their later value.
This research does not implement general signed-rational overflow behavior.
A comparison can instead retain the final rational pair or the resolved `d2`.

For `C`, root resolution follows live weak parent pairs at view `+0x28/+0x30`
and their control `+8` reference count. If the initial parent is absent, it
uses the pair at view `+0x18/+0x20`. A bounded reader must honor liveness and
reject cycles/excess depth; following every raw non-null pointer is incorrect.
The ordinary vtables `PWView=0x104a35690` and
`PWCanvasView=0x104a5c418` both have `+0x358=0x1021c73b8` (constant 1).
Other classes' coincident vtable offsets do not establish view behavior.
The simplest complete observation is the movement initializer's resolved
`d0/d1/d2`, with object fields retained separately for provenance.

## Magnification and reflection property

`0x102992930`, `0x102992eb8`, and `0x102992f64` all request the same
property-key object at `0x104cb6090`. `0x10214de74`/`0x10214dcd8` returns
its cached numeric key at `0x104cb60ac` after any required initialization.
`0x102991b84` asks `0x1029981a0` for a 72-byte `ViewInfo` value.

The direct property lookup is:

- Event `+0x10` → view; `0x1021c0e88` reads view `+0x1c8` → container.
- `0x1021ba99c` checks container `+0x50`. Nonzero selects custom callable
  dispatch `0x101dfb1d8`; this branch cannot be decoded as a tree.
- Otherwise the tree base is container `+8`, root pointer is container
  `+0x18`. Nodes have left/right at `+0/+8`, unsigned key at `+0x20`, and
  value holder at `+0x28`. The missing-value holder is container `+0x28`.
- Holder first pointer → typed property object. `0x1029a42f8` validates
  `Planeswalker::ViewInfo`; `0x1029a4378` returns object `+8` as its value.
- Within that value, percent is binary64 `+0`, reflection 360 is u32
  `+0x10`, and reflection 180 is u32 `+0x14` (raw object `+0x18/+0x1c`).

The getters construct zero defaults for these three fields when property
retrieval fails. A recorder read failure is not the same as a native getter
failure and must not substitute those defaults. For a custom callable or
unresolved key, capture the already-resolved getter return or constructor
arguments instead of invoking unknown process code.

## Source and startup configuration

The existing begin/append reconstruction is in `../post-source/`. Its `begin`
record is provided in `x1` to `0x1028ebd40`. Fields `+0xc0/+0xc8` become
builder `+0x11c/+0x120` (fade enable/length); builder `+0x128` is its running
distance. Record `+0xd0` supplies the denominator for `0.05 / denominator` at
builder `+0x130`. Record `+0xdc` becomes builder `+0x158` (defer).
Record `+0x104` is copied to builder `+0x118`; the initial corner decision
uses it with record `+0xd8` and ends at builder `+0x138`.

The ordinary post-enabled caller stores zero at record `+0xd8`.
`0x1024a1268` then calls `0x1024a1630` with `w6=0` at `0x1024a1380`.
That setup clears renderer `+0xd4` at `0x1024a174c` and skips its direct
enable store at `0x1024a1830..0x1024a1834`; successful return supplies this
field to the begin result. This narrows the corner path, but a read of builder
`+0x138` after setup remains the definitive observation, rather than assuming
that all indirect setup calls are side-effect free. Record flag `0x10` can
also request a corner on append; one caller sets it at
`0x10288dd40..0x10288dd50`.

`0x1028898a0` normally initializes defer to zero. The snap result inspected at
`0x102889be4..0x102889be8` can set it to one, independently of the later post
strength cap. Fade is likewise configured, not implied by source family:
`0x1028e11a4` requires enum setting 1160 equal 2 and Boolean 1180 true, obtains
length setting 1181, and converts it to unit zero via `0x1022180a0`. The
caller tests response setting 1162 through `0x102b191d0` before enabling fade.

Startup length at brush `+0x190` is cleared at `0x102889704`. It can become
nonzero for event device types 1 or 4, a nonzero setup flag at caller
`SP+0x81c`, and main or secondary pressure-response flag `0x10` tested via
`0x1024c28ec`. For the pen branch on this Mac image, the base is 3; the
`0x10288b1e0..0x10288b23c` branch then computes, with signed 32-bit operations,
`min(5, base + trunc(S/2)) + trunc(int32(S * setting50)/1000)`.
Non-pen type 1 keeps the earlier base without this pen adjustment.
The higher-level UI meaning of the separate setup flag is not established
here; its resolved brush field is directly readable.

Constructor `0x10288cd3c` consumes actual incoming `d1` as startup position.
Brush `+0x194` is a counter used by callers, but generated samples can add an
index/scale term; reading only the counter does not prove the argument.
Signed offset fields are brush `+0x128/+0x12c`. Bearing/rotation selection
fields `+0x148/+0x14c` are produced from primary then optional secondary
configuration `+0x278` bits 4 and 5. The actual event inclination, bearing,
and rotation are signed integers at event `+0xa8/+0xac/+0xb0`.

## Minimal observations, without guessing defaults

| Boundary                 | Bounded reads/arguments                                                                                                              | Why needed                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Movement initialization  | Existing initializer `d0/d1/d2`, device/platform/window; event `+0x10`                                                               | Directly proves the consumed magnification and two coordinate factors.                                                |
| Coordinate provenance    | View `+0x98..+0xb7` (32 bytes), globals `0x104c8fef0` (16), `0x104c8ff00` (32), resolved root vtable/slot                            | Explains the returned factors; all image addresses require ASLR slide.                                                |
| Finalizer before cap     | Brush `+0x78` pointer, snap vtable and slot `+0x10`, type `+0x20`; perspective `+0xb0` only if that target; brush strength/tolerance | Distinguishes no snap, exempt vector snap, disabled perspective gate, and an actual cap.                              |
| Begin source             | Record `+0x10`, `+0x20`, `+0xc0..+0xdc`, `+0x104`; initialized builder `+0x118..+0x158`                                              | Proves endpoint inputs, fade, defer, tolerance, and final corner state.                                               |
| Constructed source input | Constructor arguments including `d1`; brush offsets/startup/angle fields and event angle values; resolved reflection results         | Establishes all seven incoming scalars without interpreting rendered width as pressure.                               |
| Endpoint response        | Path `+0x88/+0x90/+0x98`, evaluator prefix through `+0x638`, present response objects and bounded curve controls                     | Supplies actual configured response, not constructor fallback. Exact schema belongs to `../post-evaluator/README.md`. |

The cap is observable before and after at brush `+0x168` (double tolerance)
and `+0x170` (signed strength). A post-wrapper-only observation sees already
capped inputs and cannot prove which gate was taken.

## Read-only production audit and finite delivery scope

At this review, `canvas/post-correction/core.ts` explicitly chooses `C=D=1`,
no snapping, ordinary selector 482 false, defer false, no scalar fade or corner
callback, zero startup/offset/orientation, inclination 90, and platform 2.
Those choices are internally explicit; this static investigation does not make
them the selected CSP brush's observed configuration.

That review identified an evaluator-configuration gap: the original core used
constructor-only settings. The release candidate now imports the immutable
[observed round brush profile](../croquis-post-correction/profile.md). Four
complete joined mouse recordings retain the same configured pressure response
and neutral source/startup fields; all recorded stages match. A failing
light/short-stroke regression preceded the replacement, and 1,530 additional
standalone native curve/endpoint outputs match that profile exactly. The source
setter resolves a cache/copy object, so begin input and path evaluator pointers
need not match. That selection/conversion is not independently replayed; the
resolved configuration is observed input to endpoint replay.

No arithmetic correction to `C=1`, cap skipping, or unit-zero
`pathParameter=brushSize/2` follows for the explicit ordinary Croquis profile:
the corresponding branches are now justified. `D=1` is its identity sheet
conversion choice; changing it requires an identified coordinate mapping,
not a native global copied without knowing the coordinate units. Magnification
is consumed in the proven percent-then-fraction order.

The previously absent **two live speed modes** are now exposed in the release
candidate's pen adapter and bilingual saved controls. Shared
`stabilization/arithmetic.ts` implements setting 41 enable plus setting 42:
zero requests fast motion, nonzero requests slow motion. `queue.ts` accepts
both flags and executes their recovered updates. Fixed remains the default;
mouse/touch remain fixed, and taper stays zero. Fast mode is enabled
only for strength at least 3, and slow mode takes precedence in the initializer;
the slow arithmetic branch applies at strength at most 30. The adapter and
bilingual controls retain these gates and have phase, release, zero-pressure
restart, and saved-choice tests. `catchUp=false`
matches the analyzed forwarding/flush callers and is not by itself a missing
speed control. Native device-specific strength conversion and browser sample
cadence remain separate acquisition choices; they should not be silently
changed while adding the mode.

Post correction's existing **Adjust by speed** flag 480 and **Adjust by scale**
are already passed to `convertPostSettings`; these are different from live
motion mode. The alternate post selector 482 remains forced false and requires
separate branch reconstruction if it is part of the requested release scope.
The current ordinary pipeline cannot be described as all post settings.

The output width/time transfer is intentionally Croquis rendering, and browser
packets currently do not retain tilt/bearing/rotation. A selected round brush
profile that disables those responses avoids expanding this delivery into all
CSP brush features. Its pressure response and startup values are now captured
and documented, while mouse pressure one in the joined recordings does not
provide a variable-pressure native stroke. No result here demonstrates natural
pen latency or identical physical input acquisition.

## Verification

Run from the repository root:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-runtime-profile/evidence/static_metadata.py
```

The saved `evidence/verification.json` reports 62 functions, 21,756 original
instruction bytes, and 13 type records verified against the pinned image.
All saved assembly hashes and function bounds also match the manifest.
Existing caller extracts remain in `../post-contract/evidence/1028889ac.asm`,
`../post-contract/evidence/10289148c.asm`, and `../post-source/evidence/`.
No production files were edited and no app test or benchmark was run for this
static-only task.

## Additional live speed-mode instruction check

The later bounded follow-up executes the original configuration/window helpers
in a standalone process, without CSP. `evidence/live_modes_oracle.py` extracts
`0x1021366bc`, `0x102136a5c`, `0x102193618`, and `0x10221b72c`, relocates
addresses, and verifies every resulting instruction against the pinned image.
Its only external callback aborts on invalid deque indexing. The test supplies
preallocated synthetic deque storage; it does not test native allocation or
event dispatch. Execution is limited to 30 seconds, compilation to 60 seconds.

Commands:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-runtime-profile/evidence/live_modes_oracle.py
bun docs/research/clip-studio-paint-stabilization/spikes/post-runtime-profile/evidence/compare_live_modes.ts
```

Results retained in `live-modes-native.json` and `live-modes-comparison.json`:

- 383 instructions match unchanged; 92 relocated instructions retain their
  opcodes/registers, branch targets, and constant bytes. FPCR is zero.
- 450 standalone cases: 144 requested fixed, 144 requested fast, and 162
  requested slow. Strengths include 0, 1, 2, 3, 4, 20, 30, 31, and 100;
  taper values 0, 5, and 50; states 0/1/2; both catch-up values; histories
  1–200 entries including deque block boundaries; stationary and moving
  positions; pressure boundaries; zero/backward/1000/1001-ms spacing.
- Every returned success flag, updated window, oldest whole-sample timestamp,
  x/y coordinate, and pressure matches the authoritative TypeScript exactly.
  This includes 24 slow cases whose subunit window correctly fails averaging.
- A separate contact-ingestion check of fresh production queues covers each
  integer UI strength 0–100, all three modes, and three motion/pressure
  patterns: 909 sequences and 43,632 calls, with no exception. Its 928
  below-one observations include the valid disabled and slow paths; they do
  not take the unsupported fixed/fast averaging branch. This is a reachability
  check, not a runtime native sequence or latency benchmark.

The current `queue.ts` subunit guard can remain for the supported immutable
configuration. With slow disabled, S=0 bypasses averaging; S=1/2 has integer
initial window at least one; larger fixed S starts at least two and cannot
drop below one. Fast requires S>=3, starts at least two, and clamps its update
below at two. Slow explicitly returns failed averaging when trunc(H)<=0.
Artificially changing queue configuration/state can enter the other native
subunit path at `0x102136e30..0x102136e8c`; its general behavior is not needed
to expose modes on a fresh properly configured browser queue. The application
should retain stroke-start settings and test mode changes between strokes.

Caller units are equally important. Fast uses distance **per input packet**,
not distance divided by elapsed time. `D=unsigned32(2*S+100)` is in the
pre-canvas input coordinate frame. Its separate rejection is an age strictly
greater than 1000 ms; it skips averaging rather than selecting another mode.
Slow uses segment distance and bounds over up to 30 packets, with no age test
in the scan itself. Neither branch takes a canvas zoom factor. The normal Mac
producer supplies screen coordinates with y inverted and integer milliseconds;
CSS coordinates are an explicit browser mapping, and differing acquisition
density affects these distance-based calculations.

The live settings caller's supposed device multiplier is actually guarded by
the platform getter equal to 4. The pinned Mac getter returns 2, so neither
1.3 nor 0.4 should be applied when enabling its modes. This is distinct from
post movement's input device-type field. The digitizer caller passes both
flags and `catchUp=0`. Its adjacent gesture singleton is
`PWGesturePacketQueue`: slow is forced false at `0x102e18f2c`, and its
ingestion callers use `timestamp=0`, `catchUp=1`, and no emission gating.
Ordinary native mouse input has a separate route; the prior mouse recording
did not execute shared ingestion. Therefore applying digitizer slow mode to
browser touch or mouse is an explicit Croquis extension, not proof of those
native routes. See the saved mouse-route static investigation for the class
and caller evidence.

No arithmetic discrepancy was found that blocks adding the two live modes.
Remaining finite implementation work is their settings/adapter path plus
release, zero-pressure restart, cancellation, resize, and browser regressions.
Those tests should run through `Stabilizer`, not only call its arithmetic
helpers. The two actual tablet recordings still cover fixed mode only; this
standalone result does not claim otherwise.
