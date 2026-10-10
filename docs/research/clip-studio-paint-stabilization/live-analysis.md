# Live stabilization: implementation handoff

This is a bounded static reconstruction of the live packet filter in Clip Studio Paint 5.1.4's ARM64 image, SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. Clip Studio Paint is the reference behavior; current Croquis stabilization is not a target or compatibility constraint. The companion `live-reference.ts` contains independently executable pure calculations and the recovered output-phase transition. It deliberately does not supply a complete queue driver, device conversion, active timing settings, or application event names.

The reference implements the finite, consistent-state domain of the recovered calculations. It follows instruction order where practical, but JavaScript multiply/add operations are not bit-identical to ARM64 fused arithmetic. No runtime trace of Clip Studio Paint has been performed.

**October 9, 2026 — native contract update:** The [live packet contract spike](spikes/live-contract/README.md) resolves normal macOS packet timestamps as integer milliseconds and positions as screen coordinates with y inverted. It identifies the supposed device getter as a constant platform discriminator, making the 1.3/0.4 scaling branch unreachable in this image. It also recovers interval image values, preference mappings, a conditional 15 ms fallback, native eraser identification, and upstream pressure conversion. Active settings, packet spacing, and invariants across cached or alternate producers remain unobserved. The pure reference calculations are unchanged.

## Evidence and correction summary

The original evidence is in `evidence/live/digitizer-averaging.asm`, `evidence/live/digitizer-queue.asm`, and `evidence/live/settings-to-queue.asm`. Additional helper evidence is in `evidence/live/distance-bounds-helpers.asm`. Every address below is a virtual address in the identified image, not a source-code line.

| Earlier summary                                                   | More precise reconstruction                                                                                                                                                                                                                                      | Evidence                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Slow H is capped by scanned count, available-minus-one, and 100.  | Those caps run only if mean positive-segment length is positive **or** catch-up is active. No motion and no catch-up skips all three caps. Catch-up skips the available-minus-one cap.                                                                           | `0x102136d58..0x102136d60`, `0x102136e0c`, `0x102136ea0..0x102136ee0` |
| Pressure/state boundaries stop the slow scan.                     | The first backward segment hitting a boundary resets H to 0 ordinarily, or I during catch-up. The boundary segment is included in distance, count, and bounds before the test. The newest sample's pressure does not seed the scan's positive-pressure flag.     | `0x102136c24..0x102136d38`                                            |
| Previous raw pressures drive extrapolation.                       | The two stored input pressures already include any earlier extrapolation. Recurring zero-pressure flush inputs can therefore keep updating this extrapolation history.                                                                                           | `0x102136830..0x10213686c`, `0x10213699c..0x1021369a0`                |
| Ending movement threshold is `max(0.5, 2 - 0.04*(T+H))`.          | Algebraically correct. Operation order is `max(0.5, fma(-H, 0.04, fma(-T, 0.04, 2)))`. Original instructions are FMSUB; the product is subtracted **from** the addend.                                                                                           | `0x102137164..0x10213718c`                                            |
| Ending checks reversal or sufficiently small decreasing movement. | Geometry is skipped on the call that consumes phase 3. Pressure-zero ending can still occur on that call. Geometry-triggered ending does not itself set pressure to zero.                                                                                        | `0x102137080..0x10213712c`, `0x1021371f8..0x102137208`                |
| Flush repeatedly feeds a zero-pressure terminal position.         | Correct, but there is no explicit iteration cap in the binary. The bypass argument is copied from packet `+0x38`; a nonzero value prevents phase/state updates and would keep phase 1 indefinitely in this loop. Its reachable-domain guarantee remains unknown. | `0x1020bde84..0x1020bdf34`, `0x1021367f4..0x102136804`                |
| Window timestamps describe the selected history.                  | Field `+0x80` receives the oldest **whole-weight** sample's timestamp, before selection of the fractional older sample.                                                                                                                                          | `0x102136f94..0x102136ff4`                                            |
| Configuration T influences final taper.                           | T also determines initial H: for S >= 3, `I = clamp(arithmeticShiftRight(min(S,T),1),2,15)`. T=0 still gives I=2.                                                                                                                                                | `0x1021366cc..0x102136700`                                            |

The previously reported fixed-mode growth formula was correct: the numerator includes `+1`. The saved assembly also correctly includes the slow branch at S=30; do not silently change that to S<30 to match public UI prose.

## Parameters, units, and persistent fields

Names below are descriptive labels used in this reconstruction, not recovered original C++ member names. The [native producer trace](spikes/live-contract/README.md) establishes normal timestamps as integer milliseconds and positions as `(screenX, mainDisplayHeight - screenY)` before stabilization. Packet type `+0x40` is 3 for eraser and 2 otherwise on that native path, including some non-tablet packets. Fresh native packets have bypass `+0x38` equal to zero; the full meaning and invariants of that field across cached or alternate producers remain unresolved. The interval's active preference value is not known.

| Queue offset     | Type                   | Recovered use                                                                                                                   |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `+0x08`          | deque subobject        | Starts the sample deque; implementation pointers are omitted from the portable reference.                                       |
| `+0x28`          | 64-bit integer         | Deque front index.                                                                                                              |
| `+0x30`          | 64-bit integer         | Available deque record count.                                                                                                   |
| `+0x38`          | signed 32-bit integer  | Collected record count, capped at 1000.                                                                                         |
| `+0x3c`          | signed 32-bit integer  | Configured stabilization S.                                                                                                     |
| `+0x40`, `+0x44` | 32-bit flags           | Fast-motion and slow-motion flags.                                                                                              |
| `+0x48`, `+0x4c` | signed 32-bit integers | Constructor constants 200 and 25.                                                                                               |
| `+0x50`          | signed 32-bit integer  | Initial window I.                                                                                                               |
| `+0x58`          | binary64               | Current window H.                                                                                                               |
| `+0x60`          | binary64               | Fast distance scale D.                                                                                                          |
| `+0x68`          | signed 32-bit integer  | Second setting T.                                                                                                               |
| `+0x70`          | binary64               | Maximum pressure decline per processed output, `T != 0 ? 1/T : 1`.                                                              |
| `+0x78`          | 64-bit timestamp       | Timestamp of the last emitted output.                                                                                           |
| `+0x80`          | 64-bit timestamp       | Oldest whole-weight averaged timestamp, or current input timestamp when averaging is skipped/fails.                             |
| `+0x88`          | signed 32-bit integer  | State: 0 outside active processing, 1 active, 2 ending. These labels are inferred from branches.                                |
| `+0x90`, `+0x98` | binary64 pair          | Most recent processed output position, even if emission was suppressed.                                                         |
| `+0xa0`, `+0xa8` | binary64 pair          | Previous processed output position.                                                                                             |
| `+0xb0`          | binary64               | Most recent processed output pressure, even if emission was suppressed.                                                         |
| `+0xb8`, `+0xc0` | binary64 pair          | Most recent input position, before averaging.                                                                                   |
| `+0xc8`, `+0xd0` | binary64 pair          | Previous and previous-previous input pressure after extrapolation.                                                              |
| `+0xd8`          | 32-bit flag            | Enables pressure decline limit.                                                                                                 |
| `+0xdc`          | 32-bit flag            | Keeps zero pressure from triggering pressure-based ending; geometry may still end. Setter recovered, caller meaning unresolved. |
| `+0xe0`          | 32-bit flag            | Selects timestamp-based emission gating instead of remembered skip-count gating.                                                |
| `+0xe4`, `+0xe8` | signed 32-bit integers | Current suppressed count and remembered suppressed count.                                                                       |
| `+0xec`          | binary64               | Cached packet `+0x28`, semantic meaning unresolved.                                                                             |
| `+0xf4`          | 32-bit integer         | Cached packet `+0x30`, semantic meaning unresolved.                                                                             |
| `+0xf8`          | 64-bit timestamp       | Cached packet `+0x48`.                                                                                                          |

Each history record is 32 bytes: binary64 x at `+0x00`, binary64 y at `+0x08`, binary64 pressure at `+0x10`, 64-bit timestamp at `+0x18`. Relevant loads/stores: `0x102136878..0x10213688c`, `0x1021369d0..0x102136a4c`, `0x102136f18..0x102136f64`.

Constructor `0x10213655c` zeroes the queue fields except constants 200/25, maximum decline 1, and the adjacent flag pair at `+0xe0`/`+0xe4` set to 1/0. Configuration does not clear existing history or reset state. Reset `0x102137210..0x1021372a0` clears history, position/pressure history, counts, and `+0x80`; it does **not** write state `+0x88`, H, `+0x78`, `+0xd8`, or `+0xdc`.

## Configuration and dispatcher

Setting retrieval `0x102ad8018` attempts integer 40 (S), Boolean 41 (enable), integer 42 (mode, local fallback 1), and integer 50 (T). Setting availability gates and failure paths matter; `motionFlags` takes resolved values and does not invent retrieval defaults. With enable true, mode 0 selects fast and any nonzero mode selects slow (`0x102ad8170..0x102ad8190`). The function also reads Boolean 1043; no role in this filter is established here.

The digitizer caller at `0x102e18d58` contains a branch that scales S and T only when platform getter `0x102194e64` returns 4. In this ARM64 image that getter tail-branches to `0x102072aa4`, which always returns 2, so ordinary execution preserves S and T. The unreachable branch uses a scale of 1.3 for this queue and 0.4 for the other queue. Each scaled value adds `+0.50000001` if nonnegative, `-0.50000001` if negative, then converts toward zero to signed 32-bit (`0x102e18e68..0x102e18f24`). The other queue is always passed slow=false at `0x102e18f2c`; do not propagate the digitizer slow flag there. The [platform evidence](spikes/live-contract/evidence/device-type.asm) establishes this image's constant; it does not identify platform value 4 in other builds.

Configuration `0x1021366bc`:

```text
store S, T
I = S if S < 3 else clamp(min(S,T) arithmetic-shift-right 1, 2, 15)
H = double(I)
maximumDecline = 1/T if T != 0 else 1
if slowRequested:
    fast = false; slow = true; D = 0
else if S >= 3 and fastRequested:
    fast = true; slow = false
    D = double(unsigned32((S << 1) + 100))
else:
    fast = false; slow = false; D = 0
```

`0x102136a5c` first uses the fast branch when fast=true and collected count >=2. Otherwise it selects slow when slow=true and S<=30, and fixed otherwise (`0x102136a90..0x102136b2c`). If the fast branch finds the preceding timestamp more than 1000 units old, it returns false without falling back to fixed/slow.

Fixed mode (`0x102136b2c..0x102136b68`, `0x102136cf8`, `0x102136e1c..0x102136e2c`):

```text
if state == 0: H = I
else:
    if H < S: H += min(0.5, (S - H + 1) / S)
    H = min(H, S)
```

Fast mode (`0x102136aa4..0x102136b18`, `0x102136e14..0x102136e2c`):

```text
if signed64(now - precedingTimestamp) > 1000: return false
d = sqrt((currentX - precedingX)^2 + (currentY - precedingY)^2)
u = (D - d) / D
H += (u > 0 ? 0.5*u : u)
if H < 2: H = 2
else: H = min(H, state == 0 ? I : S)
```

Distance is per input packet, with no division by elapsed time. Distance helper `0x102193618` computes squared distance with FMADD followed by square root; squared distance zero returns zero.

## Slow scan and exact cap placement

All scan arithmetic is in `0x102136b6c..0x102136ee0`. `adjustSlowWindow` implements this block; `catchUpArgument` is incoming x4 of `0x102136a5c`, passed from incoming x3 of ingestion. Both analyzed digitizer forwarding and flush calls pass that ingestion argument as zero (`0x1020be024`, `0x1020bdee0`). The alternate catch-up branch exists but its use by other callers is not established in this handoff.

```text
if deque count == 0: return false
catchUp = argument != 0 and H < S                  // evaluated before any reset
N = min(collectedCount, deque count)
K = min(N, 30)
bounds = zero rectangle; include newest selected sample
L = 0; C = 0; scanned = 1; seenPositiveOlderPressure = false

for each older sample, at most K - 1 iterations:
    scanned += 1
    d = distance from previous inspected sample to this older sample
    if d > 0:
        L += d; C += 1; include this older sample in bounds
    previous inspected sample = this older sample
    if older.pressure > 0:
        seenPositiveOlderPressure = true
    else if seenPositiveOlderPressure or state == 0:
        if scanned == 2: H = catchUp ? I : 0
        break

v = C >= 1 ? L/C : 0
if not (v > 0 or catchUp):
    return H with canAverage = trunc(H) > 0       // no caps on this path

candidate = S
if (25/10 - v) > 0:
    R = diagonal(bounds)
    candidate = signed32_trunc_saturating((200/10 * (25/10-v)) * (R/L))
target = max(candidate, state == 0 ? I : S)
step = catchUp ? 0.5 : 0.25
if step > abs(H-target): H = target
else if H > target: H -= step
else if H < target: H += step
H = min(H, scanned)
if not catchUp: H = min(H, N-1)
H = min(H, 100)
return H with canAverage = trunc(H) > 0
```

The boundary test includes a segment terminating at a nonpositive-pressure sample. It does not check the newest sample's pressure when initializing `seenPositiveOlderPressure`. Duplicate positions update the previous inspected sample and run pressure tests, but do not increment C or expand bounds. Unlike the averaging kernel and fast branch, this scan has no timestamp-age check.

The bounds helper `0x10221b72c..0x10221b7b8` starts an invalid rectangle as `(x, y, x+1e-8, y+1e-8)`. A new minimum directly changes the minimum. A value at or above the maximum changes that maximum to `value+1e-8`. The diagonal therefore is not quite the exact geometric bounding diagonal. If coordinate magnitude makes addition of `1e-8` round away, the helper can treat the rectangle as invalid again; the reference preserves those comparisons.

During stationary catch-up, L can be zero with a nonzero epsilon rectangle diagonal. `R/L` becomes positive infinity; FCVTZS to signed 32-bit saturates to 2147483647 before target/caps. The TypeScript helper models this conversion rather than leaving an infinite target. If R and L are both zero, the conversion of NaN becomes zero. No finite-coordinate runtime guarantee beyond the inspected branch is assumed.

## Fractional box average and history padding

For successful normal windows H>=1, let m=trunc(H) and r=H-m. Newest-first sample vectors contain all of x, y, and pressure. Integer samples have unit weight, the next older sample has weight r, and normalization multiplies each sum by `1/(m+r)` (`0x102136ef0..0x102137024`):

```text
out = (Q0 + Q1 + ... + Q(m-1) + r*Qm) / H
```

At each integer step, a sample whose signed timestamp age is <=1000 is usable. Once the age exceeds 1000 or history runs out, the last usable sample repeats for all remaining integer slots and the fractional slot. The scan never resumes past that break, even if older timestamps were out of order. If the first selected sample is unusable, averaging returns false. The fractional slot alone checks age>1000 and falls back to the last whole sample; it does not change `+0x80` (`0x102136ff0..0x102136ff4`). Age exactly 1000 is accepted. Signed negative ages are also accepted by the inspected comparisons.

The caller has already appended the current input sample, normally guaranteeing at least one usable timestamp. History is capped at 1000 by advancing the deque front and removing one oldest record on subsequent appends (`0x102136890..0x1021368c4`; constant pair at `0x104303ce0` is `1,-1`). This filter does not distance-weight the average and does not predict position beyond the stored positions.

The exported averaging helper requires finite H>=1. The slow path explicitly returns false when trunc(H)<=0 (`0x102136ee4..0x102136eec`). Fixed/fast code has a distinct subunit path at `0x102136e30..0x102136e8c`, but ordinary enabled fixed configurations use integer I>=1, fast configurations use I>=2, and S=0 with slow disabled bypasses averaging altogether. Artificial H<=0 calls can encounter division by zero or invalid pointers in the binary; they are not silently assigned invented fallback semantics in the reference.

## Ingestion: exact state and emission ordering

At `0x1021367c0`, arguments are:

```text
x0 queue
x1 pointer to caller phase
x2 timestamp
x3 catch-up argument for slow mode
x4 emission-gating requested
x5 emission interval
x6 bypass processing
x7 output packet
d0 input x, d1 input y, d2 input pressure
```

The reference exposes the calculations separately, so an implementer must preserve this order:

```text
if bypass != 0:                                   // 0x1021367f4..0x102136804
    output position = input position
    output pressure = input pressure
    return true                                  // no queue/phase/history writes

p = inputPressure
if p <= 0 and state != 0 and storedOlderPressure > storedPressure + 0.02:
    delta = storedOlderPressure - storedPressure
    p = clamp(storedPressure - delta, -0.2, 0)    // 0x102136824..0x10213686c

append (input position, p, timestamp); cap history at 1000
current position = input position; current pressure = p
if S > 0 or slowFlag != 0:
    attempt H adjustment and average
    if averaging fails: oldestWholeTimestamp = timestamp
else:
    oldestWholeTimestamp = timestamp

localPhase = callerPhase
adjust phase/state/pressure/ending position         // 0x102137058

emit = true
if emissionGatingRequested and localPhase == 1:
    if timestampGate:
        if signed64(timestamp - lastEmittedTimestamp) < interval:
            emit = false
        else:
            rememberedSkippedCount = skippedCount
    else if skippedCount < rememberedSkippedCount:
        emit = false

if emit:
    skippedCount = 0
    lastEmittedTimestamp = timestamp
    callerPhase = localPhase
    output position/pressure = current processed position/pressure
else:
    skippedCount = signed32(skippedCount + 1)

previousPreviousOutputPosition = previousOutputPosition
previousOutputPosition = current processed position
olderStoredInputPressure = storedInputPressure
storedInputPressure = p
previousInputPosition = input position
previousOutputPressure = current processed pressure
return emit
```

The emission gate is `0x102136920..0x102136988`; the unconditional final history writes are `0x102136990..0x1021369a8`. Suppressed outputs still update state, H, averaged position, pressure, and all processed-output history. The caller's phase pointer changes only on emission. Describing `+0x90` as the last _emitted_ position would be incorrect.

## Phase, pressure, and ending calculation

Pure helper `adjustOutputPhase` corresponds to `0x102137058..0x10213720c`. Phase numbers are established; human event names remain inferred.

```text
firstEndingPacket = false
if phase == 2:
    if state == 0:
        state = 1
        return                                    // no pressure clamp on this call
    phase = 1
else if phase == 3:
    if state == 0:
        pressure = 0; timestampGate = true
        return
    if state == 1:
        state = 2; timestampGate = false
    phase = 1
    firstEndingPacket = true
else if phase != 1:
    return

if state == 0: return
if declineFlag != 0 and previousOutputPressure-pressure > maximumDecline:
    pressure = previousOutputPressure-maximumDecline

if pressure <= 0:
    if retainAtZeroFlag == 0:
        if previousOutputPressure > pressure + 1e-8:
            f = previousOutputPressure / (previousOutputPressure-pressure)
            position = previousOutputPosition + f*(position-previousOutputPosition)
        pressure = 0
        phase = 3; state = 0; timestampGate = true
        return
    pressure = 0

if state != 2 or firstEndingPacket: return
delta = position - previousOutputPosition
previousDelta = previousOutputPosition - previousPreviousOutputPosition
stop = dot(delta, previousDelta) < 0
if not stop:
    threshold = T == 0 ? 2 : max(0.5, (2-T*0.04)-H*0.04)
    stop = lengthSquared(delta) <= threshold^2
           and lengthSquared(delta) < lengthSquared(previousDelta)
if stop:
    phase = 3; state = 0; timestampGate = true
```

Decline clipping is one-sided; there is no corresponding rise limit (`0x1021370e4..0x102137104`). Zero interpolation uses an epsilon condition on the pressure difference, not an unconditional requirement that previous pressure be positive (`0x102137194..0x1021371cc`). Geometry termination leaves pressure unchanged (`0x1021371f8..0x102137208`). Equal motion lengths do not pass the decreasing-motion comparison, even at zero length (`0x1021371ec..0x1021371f4`).

## Derived digitizer dispatch and terminal loops

`0x1020bdf80` maps input events 4..9 to phases `2,2,3,2,2,3`, using table `0x104513b10`; all other events map to phase 1. It calls ingestion with catch-up=0, gating=1, interval from global `0x104b22068`, and bypass from packet `+0x38`. The input record's x/y are at `+0x10/+0x18`, pressure at `+0x20`, timestamp at `+0x48`. Its separate synthetic flag is written to the output packet by helper `0x102136534`; it is not the slow catch-up argument.

The [native interval trace](spikes/live-contract/README.md) distinguishes stored image values from active settings: global `0x104b22068` starts at 10, while the platform-2 option mapping is 1→15, 2→20, 3→0, and other→10, in milliseconds for normal native packets. A settings-retrieval failure on modern macOS conditionally selects option 1, giving 15 ms. Global `0x104b22070` has image initializer 1. Neither active value was observed, and the fallback depends on that settings-application path executing.

If ingestion emits and its phase is unchanged, forwarding preserves the original event number. If phase changed, canonical output events are phase1→1; phase2→7 when packet `+0x40`==3, else 4; phase3→9 when packet `+0x40`==3, else 6 (`0x1020be038..0x1020be088`). Forwarding always caches input fields `+0x28`, `+0x30`, and `+0x48`, even when ingestion suppressed emission (`0x1020be08c..0x1020be0a0`).

The outer dispatcher `0x1020bdb6c` is exactly:

```text
if event == 2:
    reset queue history (0x102137210)
    callback(event=2, zero input record, initialized empty output)
    return

if event == 3:
    if state != 0:
        terminal = copy(input record)
        terminal.position = last input position (+0xb8/+0xc0)
        terminal.pressure = 0
        terminal[+0x28] = cached +0xec
        terminal[+0x30] = cached +0xf4
        if terminal.timestamp <= 0: terminal.timestamp = cached +0xf8
        flush(terminal)
    callback(event=3, zero input record, initialized empty output)
    return

if event == 6 or event == 9:
    timestampGate = false
    count = signed32(truncSigned32(H) - T)
    while count > 0:
        forward(event=1, original input record, synthetic=true)
        if state == 0: return
        count -= 1
    if global32[0x104b22070] == 0:
        flush(original input record)
        return
    forward(original event, original input record, synthetic=false)
    return

if state == 2 and event in {4,5,7,8}:
    flush(original input record)
declineFlag = ((packet[+0x40] & ~1) == 2)
forward(original event, original input record, synthetic=false)
```

Addresses: event2 `0x1020bdd60..0x1020bdd98`; event3 `0x1020bdbac..0x1020bdc40`; events6/9 prefeed and mode choice `0x1020bdc54..0x1020bdcdc`; pending-ending flush `0x1020bdce0..0x1020bdd18`; decline flag `0x1020bdd1c..0x1020bdd30`. The prefeed loop preserves the input packet's pressure; it does not itself force that pressure to zero. Its repeat count is computed once from H before the loop and is not recomputed as H changes. It can end early when state reaches 0.

Flush `0x1020bde40..0x1020bdf60`:

```text
state = 2
timestampGate = false
terminalPosition = packet position
terminalTimestamp = packet timestamp
bypass = packet[+0x38]
initialize one output packet with synthetic=true
phase = 1
do:
    emitted = ingest(terminalPosition, pressure=0,
                     phase by reference, terminalTimestamp,
                     catchUp=0, gating=0,
                     interval=global64[0x104b22068], bypass, output)
    if emitted:
        callback(canonical event for phase and packet[+0x40], packet, output)
while phase == 1
```

The terminal timestamp is constant throughout that loop. No sleeping, timestamp increment, elapsed-time termination, or explicit loop bound appears. Gating=0 means ordinary non-bypassed ingestion emits every loop iteration. This code is intentionally pseudocode, not an exported unbounded driver. The unrecovered producer contract for bypass and retain-at-zero settings must be established before implementing a faithful application queue; adding a watchdog would be an application safety decision, not a recovered Clip Studio Paint constant.

## Numeric precision and remaining uncertainties

- The queue's recovered x/y, pressure, H, scale, and threshold arithmetic uses binary64 registers. The newly traced native producer obtains float32 event pressure and widens it before queue ingestion, with additional producer-specific pressure corrections; binary64 queue arithmetic does not imply binary64 precision throughout acquisition.
- ARM64 FMADD/FMLA appears in distance, slow bounds diagonal, fractional accumulation, and ending geometry; FMSUB appears in the threshold. Native fused rounding can alter the final bit and, at tight boundaries, branch decisions or integer candidate conversion. The reference is mathematically faithful on its stated domain, not a bit-exact CPU emulator.
- Signed integer truncation is `FCVTZS`, not nearest rounding. The helper models its signed32 saturation and NaN→0 behavior. A native ARM64 probe confirmed those cases and FMSUB operand direction; it did not execute application code.
- Timestamps are represented as `bigint` in the reference. The original subtraction uses 64-bit wrapping arithmetic and signed comparisons. The code preserves that subtraction; the traced ordinary native producer supplies integer milliseconds, making its 1000-unit history threshold one second. The zero-timestamp fallback and alternate producer coverage have narrower evidence, as recorded in the [contract spike](spikes/live-contract/README.md).
- UI-setting names, the complete event-code taxonomy, bypass and retain-at-zero invariants, active emission preferences, and the active mode at `0x104b22070` still require evidence before becoming app defaults. Native eraser type 3, the constant platform discriminator, the interval option mapping, and image initializers are now established; these findings do not identify every alternate producer or another platform's value 4.
- Both digitizer ingestion call sites here use catch-up=false. Existence of an internal catch-up branch does not establish that the live digitizer regularly uses it.
- The native input coordinate transform is now established as screen coordinates with y inverted; the pure reference still supplies no application coordinate conversion or packet frequency normalization. H counts packets. Replacing the stream with browser-coalesced points changes the effective filter unless acquisition timing and units are deliberately matched. No canvas zoom multiplier appears before the queue in the traced native path; later output-to-view conversion is not fully reconstructed.
- The binary's reset leaves H and state untouched. Call ordering outside the inspected wrapper must not be replaced with a guessed generic reset that clears every field.

## Verification

Run from the repository root:

```text
node --test docs/research/clip-studio-paint-stabilization/live-reference.test.ts
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext docs/research/clip-studio-paint-stabilization/live-reference.ts
clang -std=c11 -Wall -Wextra -Werror docs/research/clip-studio-paint-stabilization/evidence/arm64-numeric-probe.c -o /private/tmp/csp-arm64-numeric-probe
/private/tmp/csp-arm64-numeric-probe
```

The focused tests cover fixed growth's `+1`, first window configuration, flag precedence, scaling round direction, fast timestamp boundaries, fractional weights, oldest whole-sample timestamp, history padding, all slow cap exceptions, first-segment boundary reset, pressure extrapolation, epsilon interpolation, geometric ending, phase-3 geometry suppression, output gating, event mappings, and terminal repeat count. Exact command output is recorded in `evidence/verification.txt`. The numeric probe requires an ARM64 host and a C compiler and executes only the small arithmetic instructions shown in its source. These tests verify the extracted mathematics and branch reconstruction, not visual or runtime equivalence to the installed application.
