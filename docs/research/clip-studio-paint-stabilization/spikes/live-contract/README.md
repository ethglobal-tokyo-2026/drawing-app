# Native live packet contract spike — October 9, 2026

Read-only static analysis of the Clip Studio Paint 5.1.4 ARM64 image identified in the [live stabilization handoff](../../live-analysis.md), SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. The research made no process attachment or app state changes; this directory preserves its findings and evidence. All addresses below are unslid virtual addresses. The reconstruction describes Clip Studio Paint as the reference behavior; current Croquis stabilization is not a target or compatibility constraint.

## Confirmed changes to the existing handoff

### 1. The getter used for 1.3/0.4 scaling is a platform discriminator in this build

`0x102194e64` tail-branches to `0x102072aa4`. That function contains exactly `mov w0, #2; ret`. Therefore the caller's comparison against 4 cannot succeed in this image under ordinary execution, and S/T are not multiplied by 1.3 or 0.4 on this native path. Calling this getter an external device getter is misleading. The nearby getter `0x102194e68` leads to `0x102072aac`, which asks `NSProcessInfo` for `operatingSystemVersion`. The packet producer is in the Objective-C class `PWLegacyApplicationMac` (the preserved metadata excerpt, retaining original output line numbers).

Evidence: [device-type.asm](evidence/device-type.asm), [platform-version-selectors.asm](evidence/platform-version-selectors.asm), [objc-relevant-metadata.txt](evidence/objc-relevant-metadata.txt).

### 2. Native packet timestamps are signed integer milliseconds

Producer `-[PWLegacyApplicationMac event:toPacket:]` is `0x1020572a8`. At `0x102057358..0x102057370`, it invokes the event's `timestamp` selector, multiplies its binary64 result by 1000.0 (constant `0x1042ecf58`), converts with `FCVTZS x8,d0`, and stores packet `+0x48`.

Thus the ordinary path is:

```text
packet.timestamp = signed64_truncate(event.timestamp * 1000.0)
if packet.timestamp == 0:
    packet.timestamp = fallbackClock()
```

Apple specifies `NSEvent.timestamp` as seconds since system startup: https://developer.apple.com/documentation/appkit/nsevent/timestamp . The normal queue's 1000-unit age check therefore means 1000 ms on this producer path; interval values below also use milliseconds. This establishes units, not packet frequency.

The zero timestamp fallback `0x10310f644` calls `0x1031088a4`, which reads `mach_absolute_time`, multiplies by a global numerator and divides by a global denominator at `0x104ceb224`, stores that integer into a helper, and converts through `0x103121190`. The latter implements division rounded away from zero by 1,000,000. I did not trace initialization of the numerator/denominator, so the fallback's expected nanosecond-to-millisecond interpretation is not promoted to a fully verified claim here.

Evidence: [event-to-packet-selectors.asm](evidence/event-to-packet-selectors.asm), [constants.txt](evidence/constants.txt), [fallback-timestamp.asm](evidence/fallback-timestamp.asm), [fallback-clock.asm](evidence/fallback-clock.asm), [indirect-symbols.txt](evidence/indirect-symbols.txt).

### 3. Native queue positions are screen coordinates with y inverted

The same producer selects `(sx, sy)` as follows:

- Event types 10, 11, 12 (keyboard/flags) and 24 (tablet proximity): `mouseLocation`.
- Other event types with a non-null `window`: `window.convertBaseToScreen(event.locationInWindow)`.
- Other event types without a window: `event.locationInWindow` directly.

It calls `CGMainDisplayID` and `CGDisplayBounds`, takes the returned display height `h`, then stores:

```text
packet[+0x10] = sx
packet[+0x18] = h - sy
packet[+0x04] = signed32_floor(sx)
packet[+0x08] = signed32_floor(h - floor(sy))
```

Positions at `+0x10/+0x18` retain binary64 fractions. There is no canvas zoom or backing-scale multiplication in this producer or between its packet and the queue. This establishes the native coordinate frame before stabilization. It does not establish physical tablet counts, browser pixel equivalence, or document-space behavior under arbitrary display configurations.

The outgoing call chain is:

```text
0x10205767c tabletEvent:tabletEventKind:useLastPenAttitude:
    → 0x1020572a8 event:toPacket:
    → 0x1021f0b1c (event, packet)
    → 0x1020bdb6c queue dispatcher
    → 0x1020bdf80 normal forwarding
    → 0x1021367c0 ingestion
```

The callback from the queue is `0x1021f0b90`; additional output-to-view conversion happens after stabilization. Its full function was captured but not fully reconstructed in this bounded spike.

Apple documents `convertBaseToScreen:` as conversion from window base coordinates to screen coordinates: https://developer.apple.com/documentation/appkit/nswindow/convertbasetoscreen%3A . It documents the nil-window screen-coordinate case for `locationInWindow`: https://developer.apple.com/documentation/appkit/nsevent/locationinwindow .

Evidence: [event-to-packet-selectors.asm](evidence/event-to-packet-selectors.asm) at `0x1020572d8..0x1020573c0`; imported function names in [indirect-symbols.txt](evidence/indirect-symbols.txt); [mac-packet-producer-selectors.asm](evidence/mac-packet-producer-selectors.asm), [dispatch-producer.asm](evidence/dispatch-producer.asm), [output-callback.asm](evidence/output-callback.asm).

### 4. Interval 10 is the image initializer, not a reliable active default

`0x104b22068` is a file-backed `__data` signed64 value of 10. `0x104b22070` is a file-backed 32-bit value of 1. These are actual image bytes, not assumptions from zero-filled memory.

Setter `0x1020be418` calls the constant platform getter. For this build's platform value 2, its option argument chooses:

| Option | Emission interval in milliseconds |
| ------ | --------------------------------- |
| 1      | 15                                |
| 2      | 20                                |
| 3      | 0                                 |
| Other  | 10                                |

The table is three signed64 integers at `0x104513b28`: 15, 20, 0. This function writes the option at `0x104d63fb0`, then tail-calls the interval setter `0x1020bdb48`.

Settings application function `0x1005e9444` invokes this setter with a successfully retrieved integer when it differs from the current option. When retrieval fails, platform 2 and an OS version at least 10.11 cause option 1 to be selected, again only if it differs. The OS version helper was traced to `NSProcessInfo.operatingSystemVersion`; it normalizes versions after 10.15 to 11.0. Thus 15 ms is the recovered modern-macOS missing-setting fallback when that settings application path executes. Actual saved option and call ordering still need observation; do not replace the active default with either 10 or 15 unconditionally.

The terminal-mode setter `0x1020bdb60` stores w0 to `0x104b22070`; the direct branch scan found no callers. This is not proof that no indirect caller exists. Static mode initializer 1 is verified; active mode remains unobserved.

Evidence: [constants.txt](evidence/constants.txt), [interval-writer.asm](evidence/interval-writer.asm), [interval-settings.asm](evidence/interval-settings.asm), [platform-version-selectors.asm](evidence/platform-version-selectors.asm), [producer-refs.txt](evidence/producer-refs.txt), [interval-option-refs.txt](evidence/interval-option-refs.txt).

### 5. Packet type 3 is eraser on this native path; type 2 is broader than pen

The proximity handler `0x10205788c` reads the event's `pointingDeviceType` at `0x1020578c8..0x1020578d4` and caches it at `0x104c8e220`. The producer stores packet type 3 when this cached value equals 3, and 2 otherwise (`0x1020573e8..0x1020573fc`, `0x102057438..0x102057448`). Apple's SDK defines `NX_TABLET_POINTER_ERASER` as 3, and AppKit maps its eraser enum to that value.

Type 3 can therefore be named eraser for this producer. Do not universally rename type 2 pen: the non-tablet branch also explicitly stores `(type=2, field44=0)` at `0x1020574f8..0x102057500`. Types 4/5 versus 7/8 in the native event sender are selected by eraser state and whether `clickCount == 2`; 6 becomes 9 for eraser. The send method's kind 2/3 comes from proximity entry/exit. Actual event-stream observations remain useful for clear end-user names.

SDK evidence inspected:

- `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/System/Library/Frameworks/AppKit.framework/Headers/NSEvent.h`, lines 191–202.
- `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/System/Library/Frameworks/IOKit.framework/Headers/hidsystem/IOLLEvent.h`, lines 336–339.

Apple description: https://developer.apple.com/documentation/appkit/nsevent/pointingdevicetype-swift.enum/eraser .

### 6. Native pressure precision and bypass provenance are narrower than queue arithmetic

The ordinary tablet branch invokes the native `pressure` selector and executes `fcvt d0,s0` before storing packet `+0x20` at `0x102057508..0x102057514`. Native pressure is float32 widened to binary64. That is compatible with the earlier finding that the queue itself uses binary64 arithmetic, but contradicts any stronger claim that pressure is never narrowed anywhere upstream.

There are producer adjustments: vendor ID 0x5ac selects `correctPressure:`; dragged-event types 6, 7, and 27 with native pressure exactly zero become 0.01 before queue ingestion (`0x102057518..0x102057558`). On an initial kind-4 packet with pressure zero, the sender temporarily disables mouse coalescing and waits up to 0.033 seconds for a selected event, then uses that event's pressure or a small fallback (`0x102057780..0x10205783c`). These behaviors make a direct browser-pressure-to-queue comparison incomplete.

`0x10205767c` zero-initializes the complete 96-byte stack packet before conversion. `event:toPacket:` does not write `+0x38`; therefore ordinary fresh packets on this traced native path have bypass=0. The proximity-exit path can copy the cached previous packet before conversion. I did not establish every producer's invariant or all writes to that cache, and the alternate producer family around `0x103201a20` was only inspected as a caller. Therefore the universal guarantee needed to rule out all unbounded flush cases is still open.

Evidence: [event-to-packet-selectors.asm](evidence/event-to-packet-selectors.asm), [mac-packet-producer-selectors.asm](evidence/mac-packet-producer-selectors.asm), [correct-pressure.asm](evidence/correct-pressure.asm), [other-packet-producer.asm](evidence/other-packet-producer.asm).

## What a later runtime capture still needs

1. Read active `0x104b22068`, `0x104b22070`, and option `0x104d63fb0` after app initialization.
2. Record packet `+0x10/+0x18`, `+0x20`, `+0x38`, `+0x40`, `+0x48` at `0x1021f0b1c` or `0x1020bdf80`, plus caller event, during pen, eraser, mouse, and proximity exit.
3. Record input spacing and output callback times. The static interval is an emission gate and does not establish sample rate, native event coalescing, or scheduling latency.
4. Compare the same display-space stroke at different document zoom levels; the producer shows pre-canvas screen coordinates, while conversion after the callback still merits inspection if document-space equivalence is required.
5. Observe retain-at-zero and bypass during ending before treating the binary's unbounded flush as a safe general-purpose driver.

No runtime equivalence or visual-equivalence claim is made by this static spike. The later [debugger investigation](../../runtime-capture.md) succeeded with an approved research copy and observed active interval 0 ms, option 3, and terminal mode 1 for that session. Input/output pairs, cadence, and device-specific behavior remain observation requirements.

## Reproduction and evidence boundaries

The binary is not included. Supply the same ARM64 image from a local Clip Studio Paint installation; the reproduction script checks its SHA-256 before disassembly. If the installed executable is universal, extract its ARM64 slice with `lipo` first. Run from the repository root with Python 3 and Apple's command-line development tools available:

```sh
export CSP_ARM64=/absolute/path/to/extracted/paint-arm64
python3 docs/research/clip-studio-paint-stabilization/spikes/live-contract/reproduce.py --output /absolute/path/to/evidence-output
```

[reproduce.py](reproduce.py) regenerates the assembly, selector annotations, constants, imported-symbol excerpt, and Objective-C metadata excerpt. It reads the supplied binary and writes only to the requested output directory. Each disassembly command has a 30-second timeout. Reference scans can also be regenerated with the included [trace_refs.py](trace_refs.py); they report candidate instructions and must be checked against the surrounding disassembly because the short-range page scan does not model register clobbers:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/live-contract/trace_refs.py 0x104b22068 0x104b22070 0x1020bdb6c 0x1020bdf80
python3 docs/research/clip-studio-paint-stabilization/spikes/live-contract/trace_refs.py 0x1020bdb48 0x1020bdb60 0x1021f0b1c
python3 docs/research/clip-studio-paint-stabilization/spikes/live-contract/trace_refs.py 0x1020be418
```

[evidence/verification.txt](evidence/verification.txt) records the original static checks. It does not imply that Clip Studio Paint code was executed. [evidence/SHA256SUMS](evidence/SHA256SUMS) identifies the preserved evidence files. The metadata and imported-symbol files are relevant excerpts of tool output, and the `.asm` files are complete for their stated address ranges. The alternate producer range ends at `0x103201c70`, so its final function is intentionally partial. External SDK paths above identify inspected headers and are not required repository dependencies.
