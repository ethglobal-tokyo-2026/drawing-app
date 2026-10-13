# Source evaluator resolution in the first joined native capture

The immutable input is
`../../../evidence/debugger-access/post-joined-20261011T230556.990852Z-2249f1a0/joined.jsonl`,
SHA-256 `b02068367c020a8fecb3266e4b1213000d3292a16d5b40966cbb6a1b6515a104`.
The original incomplete report remains `native-joined-20261011T230556-report.json`.
The corrected reader produced `native-joined-20261011T230556-resolver-report.json`:
upstream, source construction, and post correction each match, with zero differences.
This is one native mouse case, not whole-feature equivalence or pen-feel validation.

## Incorrect guard and retained instructions

The previous reader required begin `+0x20` to equal path `+0x88`. The capture has
input brush `0x7575479800` and resolved evaluator `0x75767c9000`. The retained
instructions establish that these fields need not have the same identity:

- `../../post-evaluator/evidence/1028ebd40.asm`: `0x1028ebd8c` loads the begin
  shared pointer from `+0x20/+0x28`; `0x1028ebdac..db4` calls path virtual `+0xa0`.
- `../../post-evaluator/evidence/path-endpoint-configuration.asm`: setter
  `0x1027897a0` passes that input to `0x1024cc404` at `0x10278988c`, then stores
  the returned shared pointer to path `+0x88/+0x90` at `0x1027898a0`.
  The null-input branch clears both fields at `0x102789828`.
- `../../post-evaluator/evidence/1024cc404.asm`: `0x1024cc4a4..4a8` can select an
  equivalent cached object; otherwise `0x1024cc584` calls `0x1024c1398` to create
  a copied configuration. The result can be null (`0x1024cc5a0..5a4`).

The path parameter is a direct assignment: begin `+0x10` is passed at
`0x1028ebdc4..dd0` to setter `0x102789798`, which stores it at path `+0x98`.
Its bit-equality check remains unchanged; this capture contains 14.75.

## Replacement contract and evidence limit

Null input must clear both path shared-pointer fields. Non-null input requires
a complete captured resolved evaluator configuration, already validated against
the path pointer, image identity, known object layouts, and entry/return equality.
An explicitly captured null result is distinct from a missing snapshot. The
reader never substitutes the input pointer or constructor settings for the output.

The input-to-resolved-configuration transformation and cache selection are not
replayed. The report labels the resolved configuration as observed input to the
endpoint comparison. The original brush configuration was not recursively read at
source begin, so this recording cannot establish independent equivalence of that
transformation. Source nodes are still predicted only from independent source
records and construction settings; expected nodes never seed the prediction.

## Verification

The new native regression first failed on the original pointer guard. After the
fix, 24 focused source/upstream/joined tests pass, including null-input clearing,
missing resolved configuration, explicit null result, unchanged parameter binding,
and all existing state/byte-comparison regressions. Strict TypeScript checking
passes for the source reader/tests and joined/upstream readers. The joined CLI
exits zero on the unchanged native capture. No native operation or recapture was
performed for this fix.
