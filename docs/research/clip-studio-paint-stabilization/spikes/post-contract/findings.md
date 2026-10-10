# Post-correction data contract spike

2026-10-09 — read-only static trace of the Clip Studio Paint 5.1.4 ARM64 image identified in the [main post-correction handoff](../../post-analysis.md). Image SHA256: `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. No CSP stroke was executed, no before/after fixture was measured, and no Croquis product file changed. The saved evidence supports a future CSP reconstruction; Croquis's current stabilizer is disposable and does not constrain that behavior.

## Results that change the earlier handoff

1. Ordinary output type `0x80` is **`PWVectorSplineCurve`**, established by allocation and RTTI rather than inferred from geometry. Its concrete sampler is `0x102789114`.
2. Source node float `+0x4c` is a **derived movement/time factor**, capped above at 1. Its source is not a raw event speed field. Ordinary move construction writes the return of stateful helper `0x1028f25b0` into `SVectorNode` double `+0x20`.
3. Source node float `+0x44` is the brush's event scalar `+0xa0`, transformed before import. This scalar has now been traced through brush-event construction back to input-wrapper double `+0xc8`. That establishes the exact field provenance and shows at least two possible response transforms before post correction; the OS/device pressure producer is not yet connected end to end in this spike. Calling it raw pressure remains incorrect.
4. The ordinary spline sampler uses up to two outer neighbors on each side, respects corner flag bit 0, and generates **5 through 256** uniformly parameter-spaced positions from a length-related helper and the supplied density argument. It does not simply test a replacement chord.

## Node import and brush-event field provenance

Previously established [import `0x10276b190`](../../evidence/post/10276b190.asm) narrows `SVectorNode+0x10` to node float `+0x44` and `SVectorNode+0x20` to float `+0x4c`. The following call chain is newly traced:

```text
input wrapper getter 0x1021288f0: double [wrapper+0xc8]
  0x102e1ccf0 -> [sp+0x170] of brush-event record at sp+0xd0
  therefore brush-event double +0xa0
  0x102e1dad0 copies event, can apply 0x102e1f800 to +0xa0
  virtual brush dispatch, including wrapper 0x1028ef25c
  0x1028ef25c can apply 0x1024a9bb4 to copied event +0xa0
  0x10288d8ac: event+0xa0 -> d0 of 0x10288cd3c
  0x10288cd3c -> SVectorNode double +0x10
  0x1028ec548 (append) / 0x1028ebd40 (begin) / 0x1028ebfe4 (rebuild)
  node import, directly or through concrete curve virtual methods
```

Relevant exact instructions:

- `0x1021288f0` loads double `+0xc8`. `0x102e1ccf0–cf4` stores it at brush-event `+0xa0`.
- `0x102e1cd70–cd74` loads another wrapper getter `0x102128838` and stores its 64-bit result at brush-event `+0xd0`. That getter loads wrapper `+0x88`; this is the value passed into the movement/time helper's integer-time input.
- `0x102e1e2ac–2b8`, `0x102e1e448–454`, `0x102e1e680–68c` conditionally replace the event scalar with `0x102e1f800`. That helper fetches an optional object and invokes `0x1024a9bb4` with the scalar. The transform's settings and formula are outside this trace.
- `0x1028ef390–398` similarly passes copied event `+0xa0` through `0x1024a9bb4` under its branch conditions. This demonstrates a scalar response transform, not what UI setting selected it.
- `0x10288dec4` and `0x10288ace4` explicitly load event `+0xa0` as the constructor's incoming `d0`.

### `SVectorNode+0x10` construction

`0x10288cd3c` keeps incoming `d0` in `d8`, initially stores it unchanged at output `+0x10`, then:

```text
q = incomingScalar
if brush.i32At190 != 0 and double(brush.i32At190) > suppliedD1:
    q = lookup102217e30((suppliedD1 / double(brush.i32At190)) * 90) * q
if incomingScalar > 1:
    q = 1
```

The final comparison is against the original incoming value, not the scaled result. `0x102217e30` linearly interpolates adjacent entries in the table at `0x10451cbd8`, using the truncated argument and FMADD. The first table entries are `0`, `0.0174524064372835`, `0.034899496702501`, `0.0523359562429438`; they match a sine-in-degrees table. Only the lookup behavior is required by the evidence; do not replace it with `Math.sin` and claim exact equality.

The `suppliedD1` caller is based on brush `+0x194`, sometimes plus a generated-sample index divided by a scale (`0x10288dd14–dd20`). Its complete setting/counter semantics remain open. The source scalar can therefore be modified by a startup progression before node import. There is no rendered brush-width conversion in `0x10288cd3c`.

### `SVectorNode+0x20` construction

`0x10288cd7c` initializes output doubles `+0x20/+0x28` to zero. Move callers then overwrite `+0x20`:

- `0x10288df54–df64`: current constructed x/y and event `+0xd0` -> `0x1028f25b0`, return -> `[sp+0x2e8]`, record base `sp+0x2c8`.
- `0x10288e2b0–e2c0`: same mapping on another ordinary move path.
- `0x10288dd60–dd70`: generated samples can call the same helper. An alternate branch interpolates this scalar (`0x10288dd78–dd88`) instead of deriving it from each generated coordinate.
- `0x102891810` invokes the helper in terminal processing as well; do not synthesize a fresh raw velocity from only final output keys.

This separates the factor from event `+0xa0` and from the final rendered width.

## Movement/time factor: exact behavioral boundary

Helper `0x1028f25b0` accepts `(self, int64 time, double x, double y)`; the time is wrapper `+0x88` through brush-event `+0xd0`. Its units are not established here. It keeps current and previous positions at `+0x68/+0x78`, last result at `+0x88`, an integer-time deque, counters, and a scale at `+0x10`.

- If flag `+0x60` is set, it reuses the last result, while still shifting position history and applying the upper cap.
- Without time mode (`+0x8==0`), result is distance from current input to stored `+0x68`, multiplied by scale `+0x10`.
- With time mode, distance is from current input to stored `+0x78` (the position before the most recently stored one). A startup/device branch supplies multiplier `d9`; its default after startup is 1.
- The short-time branch (`+0x58!=0` and initial timestamp `+0x50 + 5 > current time`) returns `((distance*scale)*d9)*0.1`.
- Otherwise, if the oldest retained timestamp is at least the current time, result is 0. For positive elapsed time the result is `(((distance*scale)*d9)*double(counter48))/double(currentTime-oldestTime)`, with the inspected order of multiplies and division. Timestamp append/deque rotation and counter changes precede this calculation.
- Final result is upper-capped at 1, stored at `+0x88`, then narrowed later during node import. There is no final zero clamp in this helper.

`0x1028f2344` initializes the helper: resets result to 0, seeds both positions, conditionally seeds the timestamp deque, chooses time mode by input flags/type/time, and derives the scale from three double configuration inputs and constants 8, 20 or 100. Device startup multipliers and timestamp-window sizes are configuration dependent. Exact instructions are saved, but the initializer's source setting identities are not all established. **Use a retained derived factor, or reproduce the full configuration/state machine. A generic pixels-per-millisecond value is not an equivalent substitute.**

No formula above establishes that the UI label for setting `0x480` is a particular phrase; that still needs direct label/resource evidence.

## Type `0x80` and sampler resolution

The complete selection chain:

```text
0x102781714 path initialization:
    type bit 5 -> pool10277eb98
    type bit 6 -> pool10277ebf0
    type bit 7 -> pool10277ec48
0x10277ec48 sets pool vtable address point 0x104a53390
pool virtual +0x10 -> 0x10277f2bc
0x10277f2bc -> node constructor 0x102788840
0x102788840 sets node vtable address point 0x104a53918
vtable[-1] -> typeinfo0x104a53a50 -> name PWVectorSplineCurve
node vtable+0xf8 -> 0x102789114
```

For type bit 5 (`0x20`), the analogous pool is `0x104a53300`, allocator `0x10277f17c`, node constructor `0x1027647c0`, node vtable `0x104a527b0`, RTTI `PWVectorBezierCurve`, sampler `0x1027653d4`. Brush begin `0x1028ebd40` creates type `0x3020` or `0x2020`; rebuild caller `0x102891324` passes `0x80` into `0x1028ebfe4`. This proves both concrete paths exist in the traced brush chain, but does not prove that every source stroke reaching post correction has one fixed class.

### Ordinary spline replacement samples

`0x10276ca3c` and `0x10276cb14` both dispatch virtual `+0xf8` when a next node is available. Their existing single-point fallback remains unchanged.

`0x102789114` initializes its success output to 1 and dispatches on replacement mode:

- mode 1 advances the supplied following node with `0x10276af80`, so the candidate is omitted. If no resulting following node exists, output is the anchor position alone.
- mode 2 calls `0x102789248`, which builds outer-neighbor context with one preceding node omitted.
- mode 3 calls `0x1027893b0`, which builds outer-neighbor context with one following node omitted.
- default/mode 0 calls `0x1027888dc` to acquire unmodified context.

The context builder uses up to two additional positions before the anchor and two after the endpoint, checks bit 0 at the relevant nodes, duplicates endpoint context when it reaches an end/corner, and calls `0x10359f8d4` on outer positions. That helper is still unresolved here; the contexts must not be assumed to be ordinary Catmull-Rom keys.

All these paths call `0x1035a01c0` with six 2D positions, density `4.0` from the wrappers, and parameter range `[0,1]`. That helper:

```text
measure = helper10359fd24(the six positions)
n = clampSigned(truncate((abs(tEnd-tStart)*measure)/density), 4, 255)
dt = (tEnd-tStart)/double(n)
evaluate helper10359f580 at tStart, then repeated t += dt, n positions total
evaluate helper10359f580 separately at exactly tEnd
return n+1
```

Thus the sampler's count and uniform parameter schedule are resolved; the six-point evaluator and measurement formula remain unresolved. The table/evaluator, neighbor adjustment, flags and adjacency are necessary to claim exact geometry. No proposed array simplifier was added.

## Croquis retention contract

This is an implementation recommendation grounded in the traced boundaries, not a claim that current Croquis storage already contains these values.

Keep an in-memory source record for each accepted stroke sample through final correction:

1. Stable source index; x/y in one declared coordinate system; original input timestamp and phase; whether the sample was real input or generated completion/interpolation.
2. Raw input pressure separately from the scalar after any input response/live averaging/startup treatment. The post scalar belongs to the latter boundary. Keep rendered width/taper downstream as separate data.
3. The derived movement/time factor at sample construction, together with its calculation settings if it is recomputed. Keeping only a final resampled timestamp cannot reconstruct the helper's timestamp deque and two-position history.
4. Source curve identity, node positions, applicable controls and flags, endpoint/closed-path behavior, and stable correspondence from retained output nodes to all associated source records. Source geometry must remain immutable while output geometry changes.
5. Fixed per-stroke post settings, magnification-to-coordinate conversion, and the pressure/width response settings used for that stroke.

For the future Croquis reconstruction, retain raw x/y/pressure/time plus completed live samples and explicit source indices before flattening. Recover and reproduce the CSP initializer before treating its derived movement/time factor as complete. Until then, keep the unresolved configuration explicit in an experimental adapter; an app-specific speed factor would be a documented approximation, not recovered CSP behavior. Choose the final operation format around the reconstructed geometry, width and timing requirements rather than preserving the current stabilizer. The current finalized `StrokeOp` is usable only if converting into it preserves those requirements after correction and before commit.

## Resolved versus remaining

Resolved: exact sample-construction writers for both post scalars; `+0x20` movement/time calculation and upper cap; its distinction from raw speed; event-wrapper offsets and response-transform boundaries for `+0x10`; concrete ordinary `PWVectorSplineCurve` selection; sampler virtual targets; uniform parameter sample-count rule; wider neighbor context needed after deletion.

Remaining: end-to-end OS/device pressure and timestamp producer into wrapper `+0xc8/+0x88`; all scalar-response settings; full movement/time initializer settings and time units; neighbor adjustment `0x10359f8d4`; six-point evaluator `0x10359f580`; measurement helper `0x10359fd24`; source-type selection for each actual brush configuration; mutation, endpoint and closure behavior already listed by the prior handoff; runtime input/output fixtures.

## Verification

Each saved assembly file was extracted from the binary using its `LC_FUNCTION_STARTS` boundary and objdump. Speculative string annotations from the extraction helper were removed. The [evidence manifest](evidence/manifest.json) records function boundaries, extracted instruction-byte hashes, assembly-text hashes, and the original bytes used to decode constants, vtables and RTTI. Only the referenced functions and small data excerpts are retained; the original executable is not included.

Run the self-contained [verification script](verify_evidence.py) from the repository root:

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-contract/verify_evidence.py
```

To compare these saved byte records and function hashes with a separately supplied copy of the analyzed ARM64 executable, add `--binary /absolute/path/to/paint-arm64`. The script rejects a different image hash and resolves its Mach-O addresses and function boundaries without the temporary research helper. The default verification needs only Python's standard library and the files in this directory.

See [verification output](evidence/verification.txt). These checks validate evidence integrity and static observations only. No stroke replay, rendered result or whole-algorithm equivalence was executed or claimed.

| Claim | Retained evidence |
| --- | --- |
| Input-wrapper fields and brush-event construction | [getter](evidence/1021288f0.asm), [time getter](evidence/102128838.asm), [event construction](evidence/102e1ca68.asm), [event response](evidence/102e1dad0.asm), [response helper](evidence/102e1f800.asm), [brush response](evidence/1028ef25c.asm) |
| Node scalars and their callers | [sample constructor](evidence/10288cd3c.asm), [lookup](evidence/102217e30.asm), [begin](evidence/1028889ac.asm), [moves](evidence/10288d8ac.asm), [terminal](evidence/10289148c.asm), [append](evidence/1028ec548.asm), [rebuild](evidence/1028ebfe4.asm) |
| Movement/time factor | [initializer](evidence/1028f2344.asm), [update](evidence/1028f25b0.asm) |
| Type `0x80` allocation | [path initialization](evidence/102781714.asm), [pool](evidence/10277ec48.asm), [allocator](evidence/10277f2bc.asm), [node constructor](evidence/102788840.asm), [decoded RTTI](evidence/constants-and-vtables.txt) |
| Concrete samplers and wider context | [spline dispatch](evidence/102789114.asm), [context](evidence/1027888dc.asm), [mode 2](evidence/102789248.asm), [mode 3](evidence/1027893b0.asm), [sampling schedule](evidence/1035a01c0.asm), [Bézier sampler](evidence/1027653d4.asm) |
