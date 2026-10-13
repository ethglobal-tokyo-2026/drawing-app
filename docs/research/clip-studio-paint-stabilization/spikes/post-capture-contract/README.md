# Read-only post-correction capture contract

2026-10-10. Static evidence for CSP 5.1.4 ARM64, SHA256 `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. All addresses are file virtual addresses before the runtime slide. This subtask did not attach to or execute the application. The capture implementation and any actual observations are separate evidence.

## Entry, exit, and lifetime

Use `0x1028ed064` before its first instruction. Retain the thread, entry SP, LR, FPCR, `x0..x4`, and raw `d0/d1` bits. `x0` is the holder; `[x0+0x18]` is its source `PWVectorStroke`. `w1` is signed strength `k`; `w2` is the per-source tolerance flag; `w3` is a closure/mode argument; `w4` selects the alternate class. `d0` is positional tolerance and `d1` is length scale. Save the entire source path and every node immediately.

Use `0x1028ed144` before its epilogue. Require the same thread, `SP=entrySP-0xc0`, and `x19=entry holder`. `x0` is the returned path and `[x19+0x18]` is the holder's final path. Retain both pointer values and the full final snapshot. At this instruction, the saved entry LR is at `[SP+0xb8]`. Normal parent return address is `0x102891d5c` plus the slide. An exception or missing exit is an incomplete invocation.

The complete wrapper spans `0x1028ed064..0x1028ed180` exclusive, `0x11c` bytes according to `LC_FUNCTION_STARTS`. A `0x118`-byte comparison omits its final exception-tail instruction at `0x1028ed17c`.

The wrapper dispatches to `PWVectorSmooth` when `w4==0`, otherwise `PWVectorSampleBezier`. The ordinary call is at `0x1028ed12c`, return at `0x1028ed130`. Its constructor lives at wrapper `SP+8`. The ordinary wrapper `0x1027873f4` receives `x0=smoother,x1=source,w2=k,w3=flag480,w4=closedMode,d0=T,d1=S`. It loads the source's owner from `source+0x18` into the core's `x1`.

The source has no safe post-return lifetime. Conversion `0x10277f8c8` can replace the source pointer at smoother `+0x48`, and core `0x102787324..32c` releases that pointer through its owner. `0x10277a5f8` dispatches removal by path flags; `0x102784098` unlinks the path and returns it to its pool, which calls its destructor. The wrapper later installs the result at holder `+0x18`. An equal numeric before/after pointer does not prove the original allocation survived: pools can reuse addresses.

## Complete bounded geometry

`PWVectorStroke` vtable address point is `0x104a53a78`, RTTI name `N12Planeswalker14PWVectorStrokeE`. Its pool's stride is `0xa8` bytes. Capture exactly that allocation for a matching runtime vtable, including slide. Other path vtables require a separate verified contract; do not guess their allocation size.

| Path offset | Representation |
| --- | --- |
| `+0x00` | vtable pointer |
| `+0x08/+0x10` | path-list links; preserve raw |
| `+0x18` | owning object pointer |
| `+0x20` | u32 flags |
| `+0x28` | embedded list object's vtable |
| `+0x30/+0x38` | first/last node pointers |
| `+0x40` | u32 node count |
| `+0x48` | node pool pointer |
| `+0x50..+0x87` | bounds and other state; preserve raw, no invented geometry semantics |
| `+0x88/+0x90` | shared endpoint evaluator pointer/control pair; virtual `+0x98` returns it |
| `+0x98` | f64 endpoint parameter returned by virtual `+0x88` |
| `+0xa0` | constructor-generated u32 value; preserve raw |

The common node prefix is `0x78` bytes. Pool constants and the actual allocator establish all four node sizes:

| Path selection priority | Node class | Vtable file VA | Bytes | Stored controls |
| --- | --- | --- | --- | --- |
| flags bit `0x20` first | `PWVectorBezierCurve` | `0x104a527b0` | `0x88` | one f64 pair at `+0x78/+0x80` |
| otherwise bit `0x40` | `PWVectorCubicBezierCurve` | `0x104a52a00` | `0x98` | f64 pairs `+0x78/+0x80`, `+0x88/+0x90` |
| otherwise bit `0x80` | `PWVectorSplineCurve` | `0x104a53918` | `0x78` | no stored pair; control accessors return false |
| otherwise | `PWVectorCurve` | `0x104a52b60` | `0x78` | no stored pair |

Node fields: vtable at `+0`; f64 x/y at `+8/+0x10`; bounds bytes at `+0x18..+0x27`; raw next/previous at `+0x28/+0x30`; owning path at `+0x38`; u32 flags at `+0x40`; seven f32 values at `+0x44,+0x48,+0x4c,+0x50,+0x54,+0x58,+0x5c`. Retain all seven without conflating them with raw pressure or rendered width. Additional f32 data at `+0x60/+0x64/+0x68` participates in endpoint processing; preserve it. `+0x6c` is a cached f32 and `+0x70` a cached f64. Their complete meanings are unresolved.

The Bezier stored control is not always its effective control: node flag `0x400` makes virtual `+0x20` return the midpoint of this node and its raw next node, or this position if next is null. Cubic flags `0x400/0x800` similarly select derived controls. Therefore retain flags and stored controls separately. Node flags are a different domain from path type flags; never require their type bits to match.

Traverse raw `next`, starting at `path+0x30`, exactly `count` nodes. Require a null previous pointer at the first node, a null next pointer after the last, unique nonzero addresses, each node owner equal to the captured path, every backward link equal to the preceding node, and final node equal to `path+0x38`. An empty path requires both ends null. These are not sentinel lists: path flag `0x100` causes adjacency accessors to return first/last at an end, while raw links stay null terminated. Never follow wrapped accessor behavior for enumeration.

An operational maximum of 4096 nodes is a capture safety bound, not an application limit. If the declared count exceeds it, mark the snapshot incomplete with the actual count; do not copy a prefix and call it complete. Likewise reject early null, an extra node, a cycle, an invalid region, partial read, unknown vtable, or mismatch. Retain full raw bytes and exact raw float bits. Capture addresses as hexadecimal strings. A full `0xa8` path plus every node preserves the known geometry and configuration fields, but does not recursively capture the endpoint evaluator object graph.

## Arithmetic observations without reconstructing the evaluator

Optional breakpoints must be restricted to the captured invocation/thread; shared helpers can be used elsewhere. A two-breakpoint wrapper capture already yields meaningful before/after geometry, counts, node flags, controls and scalar changes. It does not validate the full post algorithm.

At `0x102787260`, after clone/conversion and before the first removal pass, `x19` is the smoother. Its full known allocation is `0x78` bytes: output path `+0x40`, current source `+0x48`, current tolerance f64 `+0x50`, flag480 u32 `+0x58`, ratio/floor f32 `+0x5c/+0x60`, scale f64 `+0x68`, direct-source flag u32 `+0x70`. The ratio/floor values directly test `scalarLimits(k)`. Capture source again here only if an intermediate converted source is wanted; keep the original entry snapshot separately.

At `0x102788574`, immediately after the replacement sampler, `x19=smoother,x21=sourceNode,x20=replacementAnchor,w22=mode,w23=sourceSampleCount,d9=effectiveTolerance,s8=followingScalar,w0=samplerSuccess`. Source samples start at current `SP+0x1020`, replacement samples at `SP+0x20`, and replacement count is i32 at `SP+0x1c`. Each point is two f64 values, 16 bytes. On successful sampling require each count in `1..256` and read each entire array; failure records must retain the sampler status, not pretend the arrays are valid. Retain both nodes and smoother fields as well. This gives actual evaluated geometry for distance and scalar checks without guessing the six-point spline evaluator.

For an observed nearest-distance result use `0x10278859c`: `d0` is the distance returned for the point at `x23`, `d9` is its threshold. Read the point immediately; `x23` changes every iteration. For the scalar parameter fallback, `0x102788638` has `d0=t` from the nearest-segment parameter helper, with original endpoint scalars in `s11/s8` and bounds in `s9/s10`. At `0x102788650`, before narrowing, `d0` is the f64 interpolation result. At `0x102788680`, `w0` is acceptance from the helper. A helper call must be paired by thread/stack and input pointers if multiple observations are combined.

Corner predicate entry `0x1027878ec`: `x0/x1/x2` each address a 16-byte point, `d0=cornerTolerance,d1=lengthScale`; return `w0` is Boolean. Its three returns are `0x102787934`, `0x1027879cc`, and `0x102787a18`. Capturing the caller return at `0x102787c40` is simpler for the ordinary corner-classification use. It is not exclusively a post-correction function.

Do not add many hot helper breakpoints to the first capture: bounded stopping overhead can alter event cadence. Entry/exit captures preserve completed geometry; supplementary internal records should be explicitly labeled as an observed subset unless every helper invocation was recorded under a complete bounded policy.

## Mouse reachability and brush settings

No direct device-type test occurs in `0x1028ed064`, `0x1027873f4`, or the gate immediately preceding their call. A mouse stroke can therefore be a useful test candidate, but static analysis has not established the complete dynamic route for every selected tool. Existing [native mouse evidence](../../evidence/debugger-access/mouse-route/static/README.md) shows ordinary mouse reaches callback `0x1021e3708` then dispatcher `0x1021ef5d0`, which crosses dynamic view handlers. Its bypass of the tablet queue does not show that post-correction is unavailable.

The sole direct wrapper caller in image text is `0x102891d58` inside finalizer `0x10289148c`. Direct finalizer callers are `0x1028908d0`, `0x102893e68`, `0x102894974`, and `0x102895a90`. The first belongs to brush termination routine `0x10288fc64`. The finalizer's path to the post gate does not test the brush input-type field `+0xb8`. It does have ordinary tool/object gates and can exit earlier for missing state.

At `0x102891ca0`, `x20` is the brush. First require u32 `brush+0x164!=0`. Helper `0x102c709e4(brush+0x268)` returns true only when u32 `brush+0x278!=0` and u32 `brush+0x268` is 2, 3, 4 or 5. If it is true and `brush+0x258` is nonnull, the wrapper is skipped when `w24!=0` or u32 `[brush+0x258+0xc4]>1`. Their UI meanings remain unresolved. A later null holder also prevents the wrapper call. Capture these facts when diagnosing a missing invocation; do not conclude mouse exclusion from a visible stroke with no wrapper hit.

UI association is now directly traced through descriptor builder `0x1028c5438`:

| Setting | Descriptor branch | Resource key | English label |
| --- | --- | --- | --- |
| `0x47f` | `0x1028c6e48` to `0x1028c78b0`; linked enable ID `0x47e` stored at descriptor `+0x10` | `0x180084` / help `0x180085` | Post correction |
| `0x480` | `0x1028c6e58` | `0x180086` / help `0x180087` | Adjust by speed |
| `0x481` | `0x1028c7450` | `0x180088` / help `0x180089` | Adjust by scale |
| `0x482` | `0x1028c769c` | `0x18008a` / help `0x18008b` | Bezier curve |

These resource keys select group 24 labels 132–139, confirmed against the installed English resource. The descriptor obtains label/help through map getter `0x102e10fb0`. For the ordinary branch choose **Post correction enabled**, positive strength, **Bezier curve off**. Record actual wrapper arguments; do not infer their values only from the visible controls. The caller can cap strength to 4 and tolerance to 1.5. A wrapper entry and matched successful return prove that this specific input/settings case executed post-correction. A missed wrapper with unknown settings or an unobserved gate proves only that the attempted invocation was not captured.

## Evidence and verification

`evidence/manifest.json` retains exact instruction bytes and disassembly hashes for focused extracts. `evidence/metadata.json` retains the pool strides, vtables/RTTI records and relevant resource records. The executable itself is not copied into this directory. Run `python3 verify_evidence.py` here for saved-evidence integrity, or add `--binary /absolute/path/to/original-arm64` to compare the retained instruction/data bytes against the pinned image.

The 56 extracts include full wrapper/core/clone functions, constructors and allocation pools, path ownership/list operations, scalar/control accessors, sampled-geometry helpers, the finalizer and focused UI descriptor branches. Metadata retains the exact big-endian table entries linking the English resource group 24 to labels 132–139, not just a nearby-string association. Every direct `BL` in `__text` was checked for references to the wrapper/finalizer; their resulting caller lists are in metadata. Indirect callers remain unresolved.

Verification performed: saved evidence integrity and comparison against the pinned original both passed with 56 assembly extracts, 20 image data records and 30 resource records. These are static integrity results, not runtime observations or complete curve-equivalence results.
