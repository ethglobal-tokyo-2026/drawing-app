# Offline live digitizer queue replay

This research-only tool reads saved `capture_tablet_stroke.py` JSONL files and compares every included digitizer ingestion call with the TypeScript arithmetic reference, including software fusion at recovered ARM instruction sites. It never attaches to a debugger, reads application memory, launches Clip Studio Paint, or supplies input. The [complete S20/T0 recording](../../evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s20-comparison-final.json) matches every compared field across 311 included calls; the [S0/T0 baseline](../../evidence/debugger-access/stabilization-fused-arithmetic-20261011/native-s0-comparison-final.json) matches 115. Both include recorded release and source return. These results validate the captured sequences, not all settings or pen feel. Synthetic fixtures remain labeled synthetic in their metadata and reports. See [capture preparation](../../capture-preparation.md) for remaining coverage.

Requires Node.js 24 with native TypeScript support. Run from the repository root:

```sh
node docs/research/clip-studio-paint-stabilization/spikes/live-replay/compare-capture.ts /absolute/path/tablet-stroke.jsonl --report /absolute/path/comparison.json
```

The input is read only. `--report` creates precisely the requested output with exclusive creation; existing files are never overwritten. Omit `--report` to print the full JSON report. Exit codes: **0** means exact equality of all compared fields, **1** means differences, **2** means invalid, incomplete, unsupported, or unreadable input (or a report write failure). The report states the failure category and reason. Report write failure also prints the unsaved report to stderr.

An exact result is scoped to the recorded fields and this reference. It does not certify native arithmetic in general, actual tablet use, natural timing, rendered output, post-correction, latency, or matching pen feel.

## Reconstruction

`queue.ts` seeds the common queue bytes and `initial_history_oldest_first` from the captured begin. It retains its own predicted state through all subsequent calls; captured exits never reset the prediction. Only explicitly recorded and validated wrapper changes at `+0xd8`, `+0xe0`, and (for a flush) `+0x88` are applied between calls.

Each ingestion follows `0x1021367c0..0x1021369a8`: bypass; stored-pressure extrapolation; append/cap at 1000; fast/slow/fixed window dispatch; fractional averaging; phase/pressure/ending adjustment; emission gate; unconditional input/output history updates. All suppressed calls are replayed, and their caller phase remains unchanged. Every recorded terminal/prefeed call is consumed; the tool does not invent missing calls or simulate an unrecorded terminal loop. Native release and final-source return records, plus terminal-wrapper completion when the final output came from a flush, are required.

An included ingestion between the final flush output and terminal-wrapper completion is invalid, matching the recorder's contract. Terminal packet comparisons use that final flush call's prediction explicitly.

The arithmetic, binary64 fusion, and queue now come directly from `apps/frontend/src/sticker-creation/canvas/stabilization/`. This replay adapter delegates ingestion to that same browser-safe production queue. Operation order and domain follow `../../live-analysis.md` and `../../evidence/live/digitizer-averaging.asm`. Arithmetic corrections do not modify raw recordings or the recorder.

## Validation and comparison

`reader.ts` checks the file's final newline and summary, original image fingerprint and fixture scope, instruction-verification assertions, monotonically ordered record times, complete entry/pairing/contract/exit pairs, pointers/thread pairing, initial history, immutable configuration, wrapper mutation bytes, captured field duplicates against raw bytes, active globals, caller classifications, phase/state bounds, summary counts, and source/terminal completion. Unknown record kinds and unsupported floating-point modes fail explicitly. Capture audit records are counted in `captureRecordCounts`; their UI/debugger mechanics are not emulated. Calls outside the digitizer fixture are paired, validated, and listed in `excludedCalls`.

`compare.ts` checks emitted/suppressed status, caller phase, queue state, integer flags/counts/timestamps, all captured common configuration fields, immutable bytes, coordinates, pressure, and H. Every binary64 comparison includes expected/actual bits, absolute error, and ULP distance. Signed-zero encodings are adjacent in the ordered-bit ULP metric. No tolerance converts a difference into a pass. Recovered FMADD/FMLA/FMSUB operations use one-rounding software arithmetic; separately rounded instructions remain separate. Numeric divergence can cause a control mismatch, and both remain visible.

Explicit bounds and exclusions:

- FPCR must be `0x00000000`; FPSR is recorded in reports but its exception/status side effects are not predicted.
- Finite coordinates, pressures, and common queue floating fields; valid configuration formulas/constants; S and T within `[0,1000]`; H within `[0,1000]`. Computed nonfinite values fail with the call ID. Fixed/fast averaging below H=1 is unsupported. The slow helper's explicit failed-average subunit path is supported.
- At most 64 MiB, 40,000 records, 512 paired calls, 2,048 native source events, and 1,000 initial/history samples. These bounds prevent unbounded file parsing or arithmetic loops.
- Native allocator addresses/metadata and deque front index at `+0x08..+0x2f` are not predictable from captured sample bytes. Their entry/exit bytes appear in every call report, but their values are not compared to invented pointers. Record count/order are modeled. Common bytes `+0x30..+0xeb` and immutable vtable bytes `+0x00..+0x07` are compared.
- Digitizer-only cached fields `+0xec..+0xff` and out-of-line history after begin were not saved by the recorder. They cannot be independently compared.
- Instruction/image/debugger assertions in the file are checked for consistency. The offline tool cannot authenticate an arbitrary file as genuine native evidence.

## Host verification and synthetic example

The synthetic expected results are hand-calculated independently of the replay driver: S=0 emits a begin at `(4,8,.5)`, suppresses movement to `(8,8,.5)` after 5 ms while preserving processed state, and emits the terminal `(8,8,0)`. The fixture writer uses these explicit states, never the driver to generate its expected output.

```sh
node --test docs/research/clip-studio-paint-stabilization/spikes/live-replay/*.test.ts
mkdir -p '/Users/adoll/Applications/CSP Research/outputs'
csp_replay_output=$(mktemp -d '/Users/adoll/Applications/CSP Research/outputs/live-replay.XXXXXX')
node docs/research/clip-studio-paint-stabilization/spikes/live-replay/write-synthetic-fixture.ts "$csp_replay_output/synthetic-stroke.jsonl"
node docs/research/clip-studio-paint-stabilization/spikes/live-replay/compare-capture.ts "$csp_replay_output/synthetic-stroke.jsonl" --report "$csp_replay_output/synthetic-comparison.json"
```

The generated fixture and report remain in a new directory under the persistent research location. The unique directory prevents a repeated run from overwriting earlier results.

Tests also cover captured hover history, fixed fractional growth, fast expiration and distance, slow boundary failure and stationary cap bypass, recurring pressure history, phase-3 geometry suppression, remembered-count suppression, cap-at-1000, bypass, malformed/truncated/missing pairs and terminal records, unsupported FPCR/nonfinite inputs, numeric/control regressions, report exit codes, and prevention of input/output overwrite.

The repository currently resolves Node type definitions through pnpm; the verified optional typecheck is:

```sh
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck --types node --typeRoots node_modules/.pnpm/@types+node@24.13.6/node_modules/@types docs/research/clip-studio-paint-stabilization/spikes/live-replay/*.ts
```

`sample-report.json` is the full verified synthetic report; it is not a captured tablet result. The CLI writes full, untruncated per-call reports.
