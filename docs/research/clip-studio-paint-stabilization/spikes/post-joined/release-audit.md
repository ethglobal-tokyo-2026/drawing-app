# Local public-release scope audit

Reviewed October 11, 2026. This is a local selection report, not permission to
publish everything under the research directory. No staging, commits, deletion,
native attachment, or deployment was performed for this audit.

## Final live speed review

No actionable implementation blocker found. The selected fixed/slow/fast mode
reaches the queue once at stroke start; native speed flags apply only to pen
input. The existing strength gates remain in the shared arithmetic. Release,
cancel, raw pressure capability detection, and the initial CSS coordinate basis
continue through the same queue. Saved sessions validate the three values and
restore older sessions to fixed mode. English and Japanese descriptions explain
the effective strength ranges.

The final select uses `height: 44px`, addressing Safari's ignored minimum height.
The browser regression checks its actual height, panel bounds, overflow, both
languages, both speed selections, and a pen stroke. Independent targeted review
checks passed 14 tests (195 filtered out); the implementation author reported
293 focused checks and four browser cases passing. Root subsequently reported
2,541 frontend tests, 259 research tests, type-aware lint, and production build
passing. These are distinct sources of verification; this audit did not rerun
the full suites.

Four later joined native mouse recordings now match all observed stages and
retain the selected resolved brush configuration; see
`native-validation-20261011.md`. The deployed implementation uses that immutable
profile, with 1,530 further exact standalone native curve/endpoint outputs.
These results do not establish cache/copy selection, identical browser
acquisition, every brush configuration, or pen feel in CSP.

## Public production selection

The explicit final selection contains 43 frontend files: 16 modified files and
27 new files. It extends the original 41-path manifest only with `profile.ts`
and `profile.test.ts`; only `core.ts` and its test changed among the original
paths. They contain the app implementation and self-contained frontend tests;
no production import of private capture files was found.

The final package is
`evidence/release-preparation/20261011T232054.522040Z-3fb3b78d/`. Its patch
passed check/application outside the repository, and all 43 files match their
manifest hashes and modes. Unrelated LINE, language-catalog, brands, and DESIGN
changes are excluded. The isolated candidate subsequently passed 2,545 frontend
tests across 253 files. Feature commit `d229c59e` was then merged, pushed, and
deployed normally. The public smoke found a WebKit attribute-transfer rounding
difference, fixed separately on main `b6128209`; its final suite passed 2,567
frontend tests and 22 browser cases. Normal redeployment and final public
verification passed: five byte-exact assets and exact light/firm worker output
bits in Chromium/WebKit. See [the delivery record](delivery-20261011.md). The 43-file package
is the preserved feature-selection artifact, not the later follow-up commit.

The modified selection is:

- `apps/frontend/e2e/pencil.e2e.ts`
- `apps/frontend/src/i18n/strings/stickerCreation.ts`
- `apps/frontend/src/sticker-board/stat-board/TryPenPressure.tsx`
- `apps/frontend/src/sticker-creation/DrawingScreen.tsx` and its test
- `apps/frontend/src/sticker-creation/canvas/brush.ts` and its test
- `apps/frontend/src/sticker-creation/canvas/inkEngine.ts` and its test
- `apps/frontend/src/sticker-creation/canvas/stabilizer.ts` and its test
- `apps/frontend/src/sticker-creation/session/keptSession.ts` and its test
- `apps/frontend/src/sticker-creation/tools/SmoothingBar.tsx`, its CSS and test

All 23 selected new TypeScript files in
`apps/frontend/src/sticker-creation/canvas/post-correction/` and the four files
`arithmetic.ts`, `binary64.ts`, `queue.ts`, and `queue.test.ts` in its sibling
`stabilization/` directory belong to that selection. The numeric sine table in
`post-correction/input-table.ts` is required by the reconstructed arithmetic;
it is not an executable or a raw memory capture.

The browser tests now write screenshots through Playwright's
`testInfo.outputPath`. Selected outputs were copied into local evidence with
manifests for review; no test needs to write directly into the research tree.
Keep those generated images local.

## Research source candidates

Use an explicit file selection, not a whole-directory add. Suitable candidates
are the maintained analysis and integration documents; authored readers,
replayers, generators, portable arithmetic tests, and capture/benchmark harness
source; and concise performance/proof/review records. Check each candidate for
embedded extracted code, private capture excerpts, machine paths, and claims
that depend on unpublished observations. Some capture scripts contain native
instruction signatures, so a source extension alone is not approval.

Synthetic fixtures are different from native memory dumps. For example,
`spikes/post-joined/evaluator-memory-fixture.json` explicitly identifies simulated
host memory, and `spikes/post-replay/fixtures/synthetic-*.jsonl` are generated
test inputs. They can accompany their portable tests after normal review.

Numeric oracle result files can also be selected after inspection: retain only
mathematical input/output vectors and their provenance. Do not equate these with
raw registers, objects, histories, or process memory. Several existing tests
require those vector files:

- `post-quadratic.test.ts`, `post-spline.test.ts`: `spikes/post-spline/evidence/native-vectors.json`
- `post-input.test.ts`: `spikes/post-input/evidence/native.json`
- `post-evaluator.test.ts`: `spikes/post-evaluator/evidence/native-vectors.json`
- `post-sampling.test.ts`: `spikes/post-pipeline/evidence/sampling-native-vectors.json`
- `post-source.test.ts`: `spikes/post-source/evidence/native-geometry.json`
- `post-spline-length.test.ts`: `spikes/post-pipeline/evidence/endpoint-native.json`

Two test files instead unconditionally read private live captures:
`spikes/live-replay/native-replay.test.ts` and `post-pipeline.test.ts`. Before
publishing that test collection, separate these into explicit local native
verification or otherwise make the public suite independent of those captures.
Excluding the captures while leaving unconditional reads would break a clean
public checkout. No such changes were made during this audit.

## Keep local

The snapshot has 850 dirty research entries. Exclude native runtime JSONL
captures and raw memory/register snapshots; debugger and process logs; screenshots
of the research app; copied recorder snapshots; machine/signing inventories;
extracted `.asm` and generated native `.S`; compiled oracle or benchmark programs;
debug symbol bundles; CPU profiles; and incidental generated output. Retain them
locally as evidence rather than deleting them.

Examples include `evidence/debugger-access/tablet-*`, `post-mouse-*`,
`post-joined-*`, and `persistent-copy-20261010.json`. Three benchmark executables
and their three DWARF images are present beneath `stop-wait-benchmark-20261011`,
`workqueue-stop-fix-20261011`, and `workqueue-stop-reproduction-20261011`. Their
Mach-O headers were verified. These are generated benchmark artifacts, not
required production assets.

The pinned research application and original ARM image are outside the checkout
under the operator's Applications directory. Keep them there. The three current
`docs/superpowers/plans/2026-10-11-csp-*.md` files are working plans; move useful
final conclusions into maintained documentation when appropriate.

The current `.gitignore` ignores logs, build output and Python caches but does
not exclude the native captures, disassembly, debug bundles, or these generated
research outputs. A whole-checkout or whole-research-directory add is unsafe.

## Already tracked evidence

There are already 89 tracked files under the main research `evidence/`
directory, including 55 assembly extracts and five runtime JSONL files:

- `debugger-access/live-contract-first-call.jsonl`
- `debugger-access/mouse-route/mouse-pair-check.jsonl`
- `debugger-access/mouse-route/mouse-route-complete.jsonl`
- `debugger-access/mouse-route/mouse-route-event-driven.jsonl`
- `debugger-access/tablet-preflight/tablet-no-input-preflight.jsonl`

Tracked machine manifests and debugger text are present as well. Ignore rules
alone cannot remove tracked content or previous history. This audit establishes
tracked status, not whether a remote already contains each file. Resolve that
publication scope explicitly before a public push; no history rewrite or
removal is authorized or performed by this report.
