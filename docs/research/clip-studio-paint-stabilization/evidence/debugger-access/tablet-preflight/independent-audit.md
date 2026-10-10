# Tablet recorder independent audit

2026-10-09. Read-only review of the prepared digitizer recorder against the saved ARM64 assembly. This review did not attach to CSP, generate input, call target functions, or establish native tablet behavior.

## Static checks

- The shared ingestion entry `0x1021367c0` and common exit `0x1021369ac` cover both normal and terminal digitizer calls, including suppression and bypass. Pairing by thread and `exit SP = entry SP - 0xb0` matches the prologue.
- The common queue prefix is 236 bytes. Digitizer allocation is 256 bytes; gesture allocation is 248 bytes. The narrower read avoids the prior gesture overread.
- Initial deque history cannot be assumed empty. Proximity reset can precede ordinary hover samples before pen-down. The recorder now saves all initial records at the candidate begin. Block selection `(front + i) >> 7` and record selection `(front + i) & 127` match the assembly; up to 1,000 records can span nine blocks.
- Only three common-prefix wrapper changes are permitted between ingestion calls: decline flag `+0xd8` assigned 0 or 1, timestamp gate `+0xe0` cleared to 0, and state `+0x88` assigned 2 by terminal forwarding. Normal-forward cache writes start at `+0xec` and lie outside the common prefix. Configuration changes remain errors.
- Native 6/9 release clears gating and can produce its final phase during synthetic phase-1 prefeed before any phase-3 input reaches ingestion. The dispatcher checks state after the normal-forward callback returns and returns immediately if idle. Requiring a phase-3 input would reject this valid ending path.
- Shared ingestion's final phase is earlier than the native callback return. Normal forwarding invokes the callback at `0x1020be088`, updates derived cache, and returns; only then does the dispatcher check state at `0x1020bdca0`. The revised recorder requires native source return, using a dynamically exchanged fourth hardware breakpoint paired to source thread and stack.
- If terminal mode 1 returns from release in state 2, later hover can finish the queue. The revised recorder also waits for that completing source handler to return. A final ingestion exit alone is insufficient.
- A terminal flush final pair additionally requires the terminal completion point `0x1020bdf38`, after the flush callback, with phase 3, idle state, and matching common queue bytes.

## Early pressure ending and rejection boundaries

The phase helper can end an active queue on nonpositive processed pressure before native release (`0x10213710c` through `0x102137194` to `0x1021371f8`). The revised contract preserves that final pair provisionally, continues recording idle queue ingestion, and waits for native release and its return. It rejects a new active segment before release. The host checks cover this path without presuming that the user's device produces it.

For this early-final case, the source return observation starts at release. It proves a source handler returned after the final phase, rather than directly observing the earlier handler that produced that phase. Under sequential dispatch that earlier handler has returned before release begins. The recorder does not independently exclude native event reentry from inside that earlier callback; it should not claim a separate direct producer-return observation for that case.

Other unknown callers, nested ingestion, incomplete history, changing configuration/FPCR, unexpected common state changes, limits, and cleanup failures remain explicit incomplete outcomes. A successful host test does not remove those native-device uncertainties.

## Scope

Completion means an instrumented digitizer queue arithmetic fixture with complete captured initial history, paired inputs/outputs, observed native release and return, final phase/state, and an additional source return when a later event completes ending. It does not certify original event cadence, rendered pixels, post-correction curves, or matching pen feel. Saved complete input/settings permit repeated offline comparison of that captured case; other settings and device behaviors may need additional native captures.

## Independent host verification

The frozen implementation's 27 host checks were independently rerun with installed LLDB and all passed. The command was `xcrun lldb --batch -o 'script import sys; sys.dont_write_bytecode=True; sys.path.insert(0,"docs/research/clip-studio-paint-stabilization/spikes/live-capture"); import check_tablet_stroke; check_tablet_stroke.run_checks()'`.

A separate probe at `/private/tmp/csp-tablet-max-history-check.py` constructed 1,000 unique records beginning at logical index 127. All records were extracted byte-for-byte in oldest-first order across nine blocks using ten bounded host reads; no read exceeded 4,096 bytes. This probe did not read a CSP process.

Reviewed file SHA256 values:

- `capture_tablet_stroke.py`: `07ce8ff76e8de6043963957ca86b5bc55498a9744194f37495684cc6ac4960a6`
- `check_tablet_stroke.py`: `81efe370490bf7a8720a55980bcfdb45d714ca27595ec56c0e0084ffff5be2a0`

These are host and static checks. No native tablet recording or original-app/reconstruction replay was performed by this reviewer.
