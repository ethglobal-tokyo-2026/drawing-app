# Source record and movement reconstruction

Pinned CSP 5.1.4 ARM64 image SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. `evidence/manifest.json` identifies the original bytes of each routine and the exact 91-entry startup lookup table. The executable remains outside this repository.

`post-input.ts` reconstructs constructor `0x1028f2274`, initializer `0x1028f2344`, movement update `0x1028f25b0`, source record construction `0x10288cd3c`, and startup interpolation `0x102217e30`. The research entry point forwards to the production implementation after relocation.

## Recovered input arithmetic

The source record retains double position and seven doubles until its node import narrows the scalar fields to binary32. Its seven values are the supplied pressure attribute after optional startup response, integer inclination times the retained binary64 constant `1/90`, the movement result, the optional orientation, and three initial values of one. Position adds two signed integer offsets. Orientation can use either supplied integer bearing or rotation, followed in order by optional `360-angle` and `180-angle` transforms. This is the constructed brush attribute; it is not necessarily raw OS pressure or rendered width.

Startup response interpolates the exact native table: `table[i] + fraction*(table[i+1]-table[i])` with fused multiply-add, where `degrees=(startupPosition/startupLength)*90`, `i=trunc(degrees)`. The supported caller interval is `[0,90)`. If the original supplied pressure exceeds one, the final attribute is set to one even if startup response reduced it first. No sine-library approximation is used.

Time mode requires enabled input, device type other than one, and a nonzero initial timestamp. In time mode the movement base is eight; otherwise it is 100 for types one/four and 20 for other types. With `E` enabled, `M` magnification fraction, `C` external coordinate factor, and `D` document ratio:

```
denominator = (E ? C*D : 1) * base
if M > 1e-8: denominator = denominator/M
scale = denominator > 1e-8 ? 1/denominator : priorScale
```

A fresh native object initializes `priorScale=1`. The implementation represents a freshly constructed object rather than a reused native object with an arbitrary previous scale.

Without time mode, the result is distance from the previous position times scale, capped above at one. With time mode, distance is measured from the position two update calls back. A timestamp deque and counter give `(((distance*scale)*startupFactor)*counter)/(timestamp-oldest)`, again capped above at one. The denominator uses the oldest timestamp read **before** any removal. Duplicate and backward timestamps have distinct native behavior; every call advances the two-position history even when scalar reuse is requested. Signed 64-bit arithmetic is retained for timestamps.

Platform-specific startup factors, the five-unit short interval, and counter changes are preserved. The pinned Mac platform getter returns two. Other platform values are explicit test inputs, not identified tablet-driver types.

## Caller provenance and Croquis choices

At `0x102888c78..84`, `M=0x102992930(context)*0.01`, the view magnification fraction. `C` comes from `0x1021c7320`: external object virtual slot `+0x358`, with a null-object fallback of one. `D` comes from a document/context ratio through `0x103116810`, which converts signed integer numerator and denominator separately to doubles before dividing. Their complete external-object configuration has not been captured. Setting ID 40 supplies the movement window, separately from post-correction strength.

Croquis chooses an identity sheet-coordinate conversion (`C=D=1`), its displayed sheet scale for `M`, type four for pen input and one for other pointers, platform two, and its stabilization setting for the window. Its profile uses zero offsets/startup taper/orientation and constant inclination 90. These are explicit application configuration choices. They are not claimed to be the saved CSP brush's complete settings. Every completed stabilization packet supplies the pressure attribute and timestamp before Croquis brush spacing discards any points. Current rendered widths and playback times remain separate metadata.

## Independent verification

Run on macOS ARM64 with the original image available:

```
CSP_ARM64='/Users/adoll/Applications/CSP Research/original-arm64' python3 docs/research/clip-studio-paint-stabilization/spikes/post-input/native_oracle.py
node --test docs/research/clip-studio-paint-stabilization/post-input.test.ts
```

`native_oracle.py` builds a separate executable containing the original instructions, verifies 304 unchanged instructions and 72 relocations, and checks FPCR zero. It does not launch or attach CSP. Native heap/deque allocation, external platform/reflection getters, and reference-release operations use explicitly listed harness callbacks. The deque harness uses bounded valid storage; it is not a recreation or test of CSP's allocator. An unexpected free or exception aborts.

The retained 6,240 cases compare initialization/update scalar bits, two-position history, timestamp contents, counters, startup state, and source-record position/scalar bits. They include all initializer branches, enabled/disabled and absent-time modes, duplicate/backward time, reuse, startup taper, reflections, and the original-pressure cap. All compared fields match. This proves the extracted arithmetic under those explicit inputs, not identical browser acquisition, full native source-builder orchestration, or pen feel.
