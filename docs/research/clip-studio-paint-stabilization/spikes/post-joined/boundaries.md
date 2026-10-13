# Joined native source capture boundaries

October 11, 2026. Static preparation for Task 3 of the fidelity/delivery plan. No CSP process was launched or attached. The original ARM64 image SHA-256 is `6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`. Addresses below are unslid file virtual addresses. Every instruction in the adjacent extracts includes its original four bytes in little-endian storage order; `evidence/extraction.json` records ranges and hashes. Reproduce with `python3 .../post-joined/evidence/extract_boundaries.py`.

## What the boundaries establish

The three source methods expose complete **constructed SVectorNode records** before geometric insertion. They do not themselves expose raw OS pen packets. Their verified callers retain native brush-event fields and constructor inputs, allowing a separate brush-event-to-record comparison at the same stops for identified branches. A brush event is already downstream of device/response transformations; this is not automatically a queue-output-to-brush-event proof.

Keep three independent comparison results:

1. Observed caller inputs and configuration to constructed records, including movement scalar. Unknown caller branches, unobserved initialization, or missing configuration cannot pass this stage.
2. Every constructed begin/append/finish record to the complete source path captured at post entry.
3. That observed source and actual post/evaluator configuration to the returned corrected path.

Do not seed stage 1 from the constructed scalar it is checking, or seed stage 2 from expected native nodes. Observing stages 2–3 does not make stage 1 complete.

## Source method entry and normal return

Read before the first instruction. Save image identity/slide, thread, PC, entry SP, LR, FPCR, integer registers, and raw `d0..d10` bits. Pair a dynamic caller-return observation by thread, saved LR, restored entry SP, and outstanding call identity. Each method has one normal `ret`; exception/unwind paths are distinct and never count as success.

| Method       | Entry / first bytes       | Inputs                                                                                                                                          | Normal `ret`  | Return meaning                                         |
| ------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| Begin        | `0x1028ebd40`, `ff8302d1` | `x0` holder; `x1` begin record, 0x108 bytes                                                                                                     | `0x1028ebf9c` | `w0` success boolean; source is `[savedHolder+0x18]`   |
| Append       | `0x1028ec548`, `ff0303d1` | `x0` holder; `x1` SVectorNode, 0x58 bytes; `x2` output rectangle target; `d0` magnification fraction                                            | `0x1028ec67c` | Do not interpret `x0` as a path; inspect saved holder  |
| Finish       | `0x1028ec8d0`, `ff8302d1` | `x0` holder; `x1` SVectorNode, 0x58 bytes; `x2` output rectangle target; `w3` whether to render                                                 | `0x1028ec9c0` | `x0` source path, loaded from holder+0x18              |
| Post wrapper | `0x1028ed064`, `ff0303d1` | Same holder in `x0`; signed `w1=k`; `w2` source-tolerance switch; `w3` closure/mode; `w4` alternate selector; `d0` tolerance; `d1` length scale | `0x1028ed158` | `x0` returned path; holder+0x18 may have been replaced |

All listed `ret` words are `c0035fd6`. Verify the original entry and intended caller-return instruction bytes before arming probes. At post entry, save the complete source immediately using the existing strict path/node reader; it may be destroyed during correction.

At begin entry the first record is `begin+0x50`. A record has binary64 xy at +0/+8, seven binary64 scalars at +0x10 through +0x40, another eight bytes at +0x48, and two uint32 fields at +0x50/+0x54. Geometric import uses low bits of +0x50. Constructor `0x10288cd3c` clears +0x48/+0x50 and writes its supplied `w5` to +0x54. Preserve all 0x58 bytes; do not relabel +0x54 as a source index or queue phase.

## Holder state and identity

Use a capture-local begin generation, thread, holder address, and observed path address. A numeric address alone is insufficient because objects can be reused. Require the holder at post entry to belong to the recorded successful begin, with all source calls in order and a successful finish. Record every source path replacement; unexplained replacement invalidates the source comparison.

The ordinary post caller at `0x102891d2c..d58` loads the **first primary holder** from the vector reached through global `0x104d6e0f0`. Begin and finish iterate that vector's 16-byte shared-pointer slots. A separate holder vector at `0x104d6e0f8` is not interchangeable.

Only these exact holder field reads are required; this audit does not claim a complete holder allocation size:

| Holder offset   | Read                | Meaning in retained instructions                                 |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| +0x18           | pointer             | Current source path                                              |
| +0x68           | 0x58 bytes          | Latest constructed record after optional fade                    |
| +0xc0           | 0x58 bytes          | Previous constructed record, maintained by append                |
| +0x118          | uint32              | Copied begin+0x104                                               |
| +0x11c          | uint32              | Scalar +0x30 fade enable                                         |
| +0x120 / +0x128 | doubles             | Fade length / cumulative distance                                |
| +0x130          | double              | Corner tolerance, `0.05 / begin[+0xd0]`                          |
| +0x138          | uint32              | Effective corner detection flag, including begin callback result |
| +0x13c          | uint32              | Previous input's explicit marker bit 0x10                        |
| +0x140          | pointer-sized field | Copied begin+0x48                                                |
| +0x158          | uint32              | Deferred first-node state                                        |

Begin inputs also supply fade enable +0xc0, fade length +0xc8, tolerance denominator +0xd0, path-choice input +0xd8, deferred flag +0xdc, and caller field +0x104. Begin's renderer callback can alter holder+0x138. Read effective state **after successful begin**, or at the next source entry before mutation; reading begin inputs alone is insufficient.

Append copies its input to a local record before fading it. `0x1028ec4e0` can alter that local +0x30. Thus capture both entry input and the holder's later record; the latter is not an untouched input replacement. Finish similarly copies/fades before import.

## Same-stop upstream reads: exact caller gates

All stack offsets in this table refer to **source method entry SP**, before its prologue: that is the caller's current SP. Register identities are valid only with the stated LR and matching holder; do not extrapolate them to other callers.

| Source entry LR                               | Verified caller and identity                                                                             | Same-stop constructor/movement inputs                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x10288ad38`                                 | Primary begin; `x19=brush`, `x20=event`, `x24=holder`; `x25` byte offset in primary 16-byte holder slots | Constructor xy at `SP+0x190`; `startupPosition=double(int32[brush+0x194])`. Future initializer arguments are `d8=M`, `d9=C`, `d10=D`, `u32[SP+0x4ec]=enabled`, `i32[SP+0x4e8]=window`, event device/time, and begin-record xy. Primary movement pointer is from the matching 16-byte slot of the vector at global `0x104d6e100`. |
| `0x10288e2d8`                                 | Direct primary append; `x19=brush`, `x20=event`, `x22=holder`, `x21=holder index`                        | Constructor xy at `SP+0x1e0`; startup from brush+0x194; movement object pointer at `SP+0x278`. Its update has already run with record xy and event+0xd0; capture complete post-update state.                                                                                                                                     |
| `0x102891848`                                 | Primary finish; `x20=brush`, `x25=event`, `x22=holder`, `x28=holder index`                               | Constructor xy at `SP+0x2d0`; startup from brush+0x194; movement pointer at `SP+0x110`. `u32[SP+0x3c] != 0` selects fresh record construction and movement update. Zero reuses the supplied record and must be reported separately.                                                                                              |
| `0x10288aef8` / `0x10288df88` / `0x102891870` | Secondary begin / append / finish, using holder vector `0x104d6e0f8`                                     | Not the primary post holder. Secondary movement vector is `0x104d6e108`. Retain separately; never merge into the primary record sequence.                                                                                                                                                                                        |

The primary initializer at caller `0x10288aeb4` runs **after begin returns**. A movement-object snapshot at source-begin entry therefore contains pre-initialization state. Record the initializer arguments above and verify its result against the first observed primary update/state. Reused prior state cannot be called a fresh constructor merely because its pointer exists.

The recorder retains the pre-initialization object's vtable and +0x10 scale as `upstream.movementBeforeInitialization` (`address`, `vtableHex`, `scaleHex`, `complete`, `errors`). This scale can survive initialization when its denominator does not exceed the native threshold. It does not read or claim an initialized deque at begin; initializer arguments and subsequent observed history establish that separately.

Read the following exact native brush-event fields, without claiming an event allocation size: shared-pointer pair +0x10 (16 bytes, view/context), xy +0x80 (16 bytes), supplied pressure attribute +0xa0 (double), bearing +0xa8 (int32), inclination +0xac (int32), rotation +0xb0 (int32), device type +0xb8 (int32), metadata +0xc0/+0xc4 (two uint32), and timestamp +0xd0 (signed 64 bits). Record xy passed to the constructor separately: the caller can transform event xy before construction.

Read exact brush fields rather than guessing a full allocation size: +0x128/+0x12c signed xy offsets; +0x148/+0x14c angle-source flags; +0x190 startup length; +0x194 startup counter; +0x1a0 secondary-holder flag. The counter becomes 1 at begin caller `0x10288afa8` and increments once per outer move at `0x10288e848..850`; it is **not** a per-insertion counter when one event generates several samples. Reflection getters `0x102992eb8`/`0x102992f64` use the context pair; their resolved inputs are covered by the separate runtime-profile task. If angle flags are both zero, constructor instructions bypass those getters.

### Generated append is a different upstream contract

Primary append LR `0x10288dda0` still accepts a full source record, but its scalar provenance differs. Capture generated data at `SP+0x200`: xy +0, supplied pressure +0x10, bearing/inclination/rotation +0x18/+0x1c/+0x20, marker +0x24, timestamp +0x28. The constructor receives `startupPosition = double(int32[brush+0x194]) + double(uint32(x25))/d9`, with the native separately rounded division then addition. `w24` is generated count, `w25` generated index, and `w23` selects behavior. When `w23==30`, movement is updated for each generated record. Otherwise record movement comes from a sequence prepared through `0x1028f2798` and advanced at caller stack +0x150/+0xd0. A generic `PostMovement.update` per source record is not equivalent. Initially restrict full upstream proof to the direct primary branch; stage 2 may still compare supported constructed records from other branches.

## Movement state

Allocation of the movement object is explicitly 0x90 bytes at `0x10288ac1c..28`; constructor `0x1028f2274` initializes through +0x88. Preserve its vtable, complete 0x90-byte prefix, and active timestamp deque values. Important fields are mode +8, scale +0x10, deque +0x18, count/limit +0x48/+0x4c, initial timestamp +0x50, short-interval flag +0x58, startup count +0x5c, reuse flag +0x60, current/previous xy +0x68/+0x78, and last scalar +0x88.

For the deque, map begin/end are +0x20/+0x28, first logical index +0x38, and element count +0x40. For logical index `j=first+i`, read the block pointer at `mapBegin + 8*(j>>9)`, then the signed timestamp at `block + 8*(j&511)`. This matches `0x1028f26e4..2728`; blocks contain 512 eight-byte elements. Validate map order/alignment, every requested block pointer/range, arithmetic overflow, and the complete active count under an explicit bound. Do not emit a truncated deque as complete. Counts/counters are movement-history state, not source-call counts.

The separate movement object at brush+0x2a8 is an acceptance/gating helper. It is not the primary per-holder movement object from global `0x104d6e100`.

## Can retained state avoid per-event stops?

The holder alone cannot: begin/append repeatedly overwrite its two 0x58-byte records. Node midpoint/scalar imports lose original binary64 information through binary32 rounding; reconstructing input from output nodes would not be independent evidence.

A **conditional** fuller cache does exist:

- Brush+0x2e8 is a vector descriptor `{begin,end,capacity}` for 0x108-byte begin records. `0x10288d814` copies/constructs a complete begin record and advances by 0x108.
- Brush+0x300 is a vector descriptor for 0x18-byte inner-vector descriptors, one per holder. Each inner vector stores complete 0x58-byte constructed records. `0x10288fb28` copies all 0x58 bytes and advances by 0x58.
- Begin stores these only if `0x102c70688(brush+0x268,eventContextPair)` is nonzero. Move storage at `0x10288e150..164` additionally requires event+0xc0 == 0. This cache's record is copied after source dispatch, from the caller stack; source fading used a separate local copy.
- Finalizer `0x1028919a0..9b8` conditionally passes the corresponding begin-record and inner-vector descriptor to `0x102c5e52c`. Its predicate `0x102c709c4(brush+0x268)` requires nonzero brush+0x278 and brush+0x268 == 1. The related `0x102c709e4` recognizes other modes (2–5) under that same enable field.

These are constructed records, not original brush events or initializer state. The inner cache does not supply the separately retained begin record or independently observed terminal input. Its availability and completeness for the selected ordinary brush are not established. Preserve bounded descriptors/content at the proposed stops for discovery; do not substitute this cache for append probes until a pilot trace proves gate conditions, holder correspondence, exact count/order/content, and terminal handling. This is an opportunity to reduce later stops, not a working capture shortcut.

## Bounded automated-mouse capture design

Static evidence establishes a primary source route usable independently of tablet acquisition; whether the selected brush reaches it must be observed. Automation must first identify the approved research process and a disposable canvas. This document does not claim working UI automation, launch permission beyond existing authorization, or a completed dry run.

Use verified source begin/append/finish and post-entry hardware probes, restricted to a bounded attempt. Retain the begin probe until post entry so a second begin fails explicitly, including reuse of the same holder/path address. A short planned mouse path with finitely many events is preferable to a human trying to finish during debugger stalls. Input must wait for an actual recorder-ready signal. Recorder and input producer each need independent finite deadlines and reliable release/detachment cleanup.

Four hardware slots permit the four entry probes, with an entry slot temporarily replaced by its verified caller-return probe when strict per-call return pairing is required. Alternatively, reading effective holder state at the next observed source boundary avoids append-return stops, but then report only source-entry completeness and final successful wrapper return, not individual per-call return coverage. Reject unexpected recursion, caller transitions, thread switches, source replacement, partial reads, cap exhaustion, or unmatched calls. At post entry disable hot source probes, save complete input/configuration, and arm the verified wrapper return; retain the returned output only after matching thread/SP/LR and pointer checks.

Keep full raw reads and structured completeness/error fields. Run the joined replay only when each required observation is complete. Debugger stops perturb event cadence, so these records can validate arithmetic/caller composition; they cannot measure natural latency or pen feel.

## Implemented first recorder schema

`../live-capture/capture_joined_post.py` inherits `PostCapture` without modifying the base reader or endpoint-evaluator capture. It never launches or attaches. Its `run` function requires an already controlled approved research process, exclusive output creation, a 5–30 second deadline, at most 256 source entries, at most 256 active movement timestamps, and exactly one primary holder. Four source/post-entry probes remain active through source capture; at post entry they are removed and the verified post epilogue probe is installed. No individual source return is claimed. Existing bounded secondary workqueue-stop handling is reused, with full diagnostics, a warning, and its existing once-per-thread/four-total caps.

The header remains `csp-post-capture/v1`; metadata adds `joinedSourceSchema: "csp-joined-source/v1"`. New records use existing `diagnostic` envelopes with event `source_begin`, `source_append`, or `source_finish`. Their `details` contain:

- `sourceSequence`: consecutive integer starting at one; `threadId`: decimal string; `holder`, `recordAddress`, `entrySp`, and `callerReturnLoad`: runtime address strings.
- `boundary` and `callerReturn`: unslid file-address strings. `fpcr` and `fpsr`: fixed-width hexadecimal register bits. FPCR must be zero for a complete source event.
- `recordHex`: all 0x58 constructed record bytes. Begin additionally retains all 0x108 bytes in `beginHex` and points `recordAddress` at begin+0x50. Append has `scaleBits` (16 hexadecimal binary64 bits, most significant digit first); finish has unsigned `renderFlag`.
- Append/finish `holderBefore`: `pathAddress`, `stateHex` containing exactly 0x44 bytes at holder+0x118 through +0x15b, `complete`, and `errors`. This retains all effective source configuration, mutable distance, previous marker and deferred state; it does not imply a full holder allocation size. Begin omits this field because effective state is not initialized yet.
- `upstream`: independently complete or incomplete raw brush/event fields, constructor point/startup input, and primary movement identity/initializer or post-update state. Offset-keyed raw fields preserve exact native bytes. Generated append, unresolved reflection inputs, reused finish construction, or missing reads explicitly leave this stage incomplete. The device-4 initializer getter at `0x102194e64` branches to `0x102072aa4`, which returns constant 2; the recorder verifies both pinned and loaded instruction ranges before reporting `platformValue: 2`. This value is not inferred from the operating-system name.
- Top-level `complete` and `errors` describe the constructed source observation. Upstream failure cannot promote stage-1 equivalence, but does not discard a complete record needed for stages 2–3.

The summary retains the base post completion/cleanup fields and adds `sourceEntries`, `sourceStage`, `sourceEntryComplete`, `upstreamComplete`, `workqueue_step_recoveries`, and `capture_warnings`. `sourceEntryComplete` describes observed ordered entries followed by a post return; it is not a claim about individual method returns, raw tablet acquisition, replay equivalence, or natural event timing. Cleanup failure still makes overall `captureComplete` false.
