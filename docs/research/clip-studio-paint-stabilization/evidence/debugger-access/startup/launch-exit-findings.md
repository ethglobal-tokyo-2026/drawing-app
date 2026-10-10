# Research-copy startup exit: bounded static finding

The observed exit is explained by duplicate-instance handling. This conclusion is tied to the parent's observed return address `0x10204bc88`, not a general claim about every startup failure.

## Exact observed handler

Objective-C metadata identifies `0x10204ba7c` as `-[PWLegacyDummyApplicationDelegateMac applicationDidFinishLaunching:]`. The class appears at `0x104af9070`, its class reference at `0x104af8810`, and its method selector reference `0x104af7e70` resolves to `applicationDidFinishLaunching:`.

This function:

1. Reads `NSWorkspace.sharedWorkspace.launchedApplications`.
2. Reads its own `NSBundle.mainBundle.bundleIdentifier` and `bundlePath`.
3. For each launched application's dictionary, reads `NSApplicationBundleIdentifier` and `NSApplicationPath`.
4. When the bundle identifiers match and the paths differ, calls `launchApplication:` with the other application's path (`0x10204bb6c..0x10204bb98`). If the delegate has queued files at `self+0x08`, forwards them using `openFile:withApplication:` (`0x10204bb9c..0x10204bc40`).
5. Unconditionally calls `terminate:` on NSApp at `0x10204bc84` after the enumeration. Its return address is exactly `0x10204bc88`, matching the parent's trace.

The dictionary key strings are CFString objects at `0x104ae7db8` and `0x104ae7dd8`, containing `NSApplicationBundleIdentifier` and `NSApplicationPath`, respectively. The queued-file setter immediately before this handler is `0x10204ba54`; it retains incoming x3 and stores it at `self+0x08`.

## Why that delegate was installed

The only relevant class-reference use found by the bounded scan is in `0x10204f998`. Its immediate selection logic is sufficient to explain the handler:

```text
if incoming w2 bit 0 is set:
    enumerate launched applications
    if any application's bundle identifier == own bundle identifier
       and that application's bundle path != own bundle path:
        select PWLegacyDummyApplicationDelegateMac
        return null instead of the ordinary application object
otherwise:
    initialize the ordinary application and its delegate
```

At `0x10204faa4..0x10204fac0`, a matching bundle identifier followed by a differing path branches to `0x10204fbc8`. That branch loads the dummy delegate class reference at `0x10204fbd8`, allocates/initializes it, and installs it with `setDelegate:` at `0x10204fbf4`. The incoming flag's original name was not recovered and is unnecessary to identify this predicate.

The parent's report that the original application remains running while the separate research-copy path exits fits this exact predicate. Neither the launch handler nor the immediately inspected delegate-selection function performs a license or code-signature test. The evidence supports duplicate-instance forwarding as the reason for this particular observed termination; it does not establish the absence of unrelated checks elsewhere in the application.

## Evidence and scope

- `launch-handler.asm`: complete `0x10204ba7c` function.
- `launch-handler-selectors.asm`: same assembly annotated with selector names decoded from Objective-C stubs.
- `launch-delegate-selection.asm`: complete `0x10204f998` function, the immediate dummy-delegate constructor caller.
- `launch-delegate-selection-selectors.asm`: selector-annotated version.
- `dummy-open-files.asm`: immediate pending-file storage method.
- `dummy-delegate-refs.txt`: candidate class-reference locations, checked against the saved selection disassembly.
- Existing `objc-metadata.txt`, lines 64–84, confirms the class and handler method.

The listed assembly/reference files are preserved beside this report. They were originally generated under `/private/tmp/csp-live-contract-spike`; the full metadata file cited above was inspected there, while the report records the decoded class/selector references needed for this finding. The inspected binary was `/private/tmp/csp-stabilization-research/paint-arm64`, SHA-256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. No application changes or debugger operations were performed by this static-analysis subtask. The parent investigation's separate debugger operations are documented in the runtime-capture report. No bypass is proposed.
