# Native fill observer

`capture_fill.py` observes the already controlled approved research process.
It uses the existing `live-capture/capture_live_contract.py` implementation for
exact executable/ARM64 selection, address resolution, hardware probes,
stop-event classification, the deadline, and cleanup. It does not attach,
launch, evaluate target expressions, change target memory, or synthesize input.
Only the root agent operates the app and starts debugger attachments.

Three simultaneous hardware probes observe `CloseGapFill` entry at
`0x10253f5e4`, the initial flood result at `0x10253f704`, and its shared normal
return at `0x10253fb34`. All 2,348 function bytes must match the pinned original
before any probe is installed. No software-probe fallback exists.

Each call retains the full 528-byte fill object, every available 48-byte bitmap
header, and all bitmap bytes, including row padding. Limits reject oversized
data rather than truncate it: 8 MiB per bitmap and 64 MiB across the run. Lazy
or absent candidate storage at entry is explicit. Bitmap A holds the native
selection; final rendered RGBA also depends on subsequent rendering.

The entry saves the object, packed seed, output rectangle, thread, and stack.
The midpoint additionally checks the preserved object/seed/output registers.
Return pairing checks the same thread and frame, reads final A/C through the
saved object, and reads the rectangle through its saved pointer. The return
Boolean is in x19 at this probe; x0 has not yet received it. A false native
return retains partial masks with `selectedPixelsAreCompletedFill=false`.
Complete observation of a call is separate from native fill success.

## Root-controlled commands

Verify the fresh PID and exact executable path, and inspect the scratch
document and selected fill settings before starting. The launcher independently
selects the existing research process; it never opens CSP or changes settings.

No-input preflight:

```sh
python3 -B docs/research/clip-studio-paint-stabilization/spikes/fill-gap/record_fill.py --preflight --timeout 8 --calls 1 --label no-input-preflight
```

An expected no-input deadline is a passing setup check only if the full
instruction check and all three armed probes were retained, zero calls arrived,
cleanup acknowledged and observed detachment, the time budget was met, and an
independent process check found the same executable resumed.

One actual fill call:

```sh
python3 -B docs/research/clip-studio-paint-stabilization/spikes/fill-gap/record_fill.py --timeout 30 --calls 1 --label fixture-gap-1 --metadata-file /absolute/path/to/metadata.json
```

`--calls` accepts 1 through 64. Each requested call must include its entry,
initial result, and normal return; a partial call set is incomplete. The
launcher prints `RECORDING NOW` after the observer prints
`CSP fill capture active`. Input can follow that cue.

The observer reserves three seconds of its 5–30 second total budget for cleanup.
The launcher reuses the existing single 45-second outer debugger guard. Native
debugger calls have no individual timeout, so these are bounded attempts rather
than unconditional timing guarantees. An outer guard terminates its debugger
child; if the target is subsequently stopped or cleanup is unverified, the root
agent must resolve its state before another experiment.

Every run creates an exclusive directory under `evidence/captures/` with source
snapshots and hashes, metadata, `fill.jsonl`, complete debugger output, the
independent process observation, and the launcher result. Raw failures persist.
This observer neither predicts the whole algorithm nor establishes natural
latency or tablet feel.

## Saved data

The JSONL schema is `csp-fill-capture/v1`. Each `boundary` has `callId`, `phase`
(`entry`, `initial`, `return`), `threadId`, saved arguments, `seedDocument`,
`outputRect` with all 16 raw bytes and four signed values, and `snapshot`.

`snapshot.header` contains the complete raw object, numeric gap width, domain,
document offset, source-tile offset, and the A/C/T shared-pointer pairs.
`snapshot.bitmaps.A` (and C/T when present) contains the complete bitmap header,
dimensions, stride, data pointer, byte length, and `dataHex`. Null/unallocated
states and read failures are explicit. T must be present at the midpoint and
cleared at the shared return. Each snapshot reports `complete` and `errors`.

The summary reports requested/entered/paired calls, unmatched entries, native
successes, capture/cleanup errors, detached-state evidence, and whether the
deadline was exceeded. `captureComplete` requires the complete requested set
and clean observed detachment. `allFillsSucceeded` additionally checks every
native Boolean. Independent resume is supplied by the launcher, not the
debugger observer.

## Host verification

```sh
python3 -B docs/research/clip-studio-paint-stabilization/spikes/fill-gap/check_capture_fill.py
python3 -B docs/research/clip-studio-paint-stabilization/spikes/fill-gap/check_record_fill.py
```

The 32 observer checks use synthetic bytes and callbacks without any target.
Six launcher checks exercise strict actual-call ordering and expected preflight
failure classification. These checks establish saved-data handling, not native
runtime success; the no-input and actual root-run captures supply that evidence.
