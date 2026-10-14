# CSP narrow-area outline and stop-line rules

Static follow-up on 2026-10-13. No CSP process was launched, attached, or changed.
No Croquis product code was changed. This note adds evidence to
[native-algorithm.md](native-algorithm.md) without replacing its findings or
claiming a complete equivalent implementation.

The source is the pinned
`/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64`, SHA256
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
All instruction addresses below are unslid ARM64 virtual addresses.
The [new manifest](evidence/narrow-boundary/manifest.json) retains six complete
function extracts with original instruction bytes, original-byte SHA256,
assembly SHA256, exact `LC_FUNCTION_STARTS` entries, and addressed retained-name
ancestry. The [verification record](evidence/narrow-boundary/verification.json)
checks all 1,453 new instructions and all six name ancestries against the source
and confirms the five overlapping earlier assembly hashes.

## Function boundaries and names

These names come from addressed terminals in the image's retained
`LC_DYLD_INFO_ONLY` name data, not the nearest public symbol reported by the
disassembler. Every parent edge back to retained root `0x894593` is recorded.
That root was established by the earlier indicator-preset manifest. The
source's `__TEXT` base is `0x100000000`; terminal address values are relative
to that base. `LC_FUNCTION_STARTS` independently establishes each boundary.

| Start         | Exclusive end | Bytes | Recovered name, abbreviated only for this table                                       |
| ------------- | ------------- | ----: | ------------------------------------------------------------------------------------- |
| `0x102543078` | `0x10254343c` |   964 | `PWFloodFill::TraceOutlineForSoak(int&, int&, int&, unsigned int, unsigned int&)`     |
| `0x102090f80` | `0x102091078` |   248 | `PWBitmap1Bit::DrawSegment(int, int, int, int, unsigned int)`                         |
| `0x102541b0c` | `0x102541c0c` |   256 | `PWFloodFill::CheckFlagAndRender(int, int, unsigned int, unsigned int, SRect const&)` |
| `0x102541c94` | `0x102542720` | 2,700 | `PWFloodFill::FindNarrowestPointForEachGap(SRect&, vector<SPoint>&)`                  |
| `0x102542720` | `0x102542c50` | 1,328 | `PWFloodFill::RefillToStopLine(SPoint, SRect, vector<SPoint> const&, SRect&)`         |
| `0x10254343c` | `0x102543578` |   316 | `PWFloodFill::RenderBlockForCloseGap(int, int)`                                       |

All belong to `Planeswalker`; the full vector allocator and namespace spelling
are retained in the manifest. In particular, the previously missing helper
really ends at `0x10254343c`; this is now proven by adjacent function-start
entries rather than inferred from the next available extract.

## `TraceOutlineForSoak`: directly recovered contract

The bitmap names A and C have the meanings established in native-algorithm.md:
A=1 means selected; C=1 means reference eligibility. This helper reads both
and does not directly write their bits. It can prepare C lazily through
`CheckFlagAndRender` before reading a neighbor.

| Entry argument | Observed role                                                 |
| -------------- | ------------------------------------------------------------- |
| `x0`           | Valid `PWFloodFill*`; A at `+0x190`, C at `+0x1a0`            |
| `x1`           | Pointer to signed current x; updated only on success          |
| `x2`           | Pointer to signed current y; updated only on success          |
| `x3`           | Pointer to integer direction; changed during the search       |
| `w4`           | Zero versus nonzero traversal mode                            |
| `x5`           | Pointer to unsigned output flag; written only on success      |
| `w0` return    | 1 when a neighbor is accepted; 0 on failure or checked status |

For incoming directions 0 through 7, the displacement table is exact:

| Direction |  dx |  dy |
| --------: | --: | --: |
|         0 |  +1 |   0 |
|         1 |  +1 |  -1 |
|         2 |   0 |  -1 |
|         3 |  -1 |  -1 |
|         4 |  -1 |   0 |
|         5 |  -1 |  +1 |
|         6 |   0 |  +1 |
|         7 |  +1 |  +1 |

At `0x1025430f8–0x102543130`, nonzero mode begins at
`(incomingDirection + 3) mod 8`; zero mode begins at
`(incomingDirection - 3) mod 8`. The helper tries at most eight neighbors.
The former decreases direction after each rejection, and the latter increases
it, wrapping at 0 and 7 (`0x10254325c–0x102543298`). The displacement selection
is `0x102543140–0x1025431d0`.

For each proposed neighbor:

1. It rejects negative x/y or coordinates at or above A's width/height
   (`0x1025431d4–0x1025431f8`). These are bitmap bounds, not the caller's crop.
2. It calls `CheckFlagAndRender(this, x, y, 1, 0, translatedDomain)` and checks
   `this+0x1fc` immediately afterward (`0x1025431fc–0x10254321c`). The domain
   is `this+0x140` translated by minus offsets `+0x1d0/+0x1d4`. This helper's
   Boolean return is not used to reject the neighbor.
3. It rejects A=1 neighbors (`0x102543220–0x102543254`). A=0 neighbors must
   also have C=1 (`0x1025432a0–0x1025432bc`).
4. A cardinal direction is then accepted. A diagonal direction requires an
   additional cardinal neighbor of the original point: direction `d-1 mod 8`
   in nonzero mode, or `d+1 mod 8` in zero mode. That point must also have
   C=1 and A=0 (`0x1025432c0–0x1025433f4`). The diagonal's coordinate checks
   already ensure this intervening cardinal point is in bitmap bounds.

The unsigned output has a precise local rule. Start its accumulator at zero.
Each rejected out-of-bounds neighbor, examined C=0 neighbor, or diagonal whose
extra cardinal point has C=0 sets the accumulator to one. The primary point
tests A first, so primary A=1 preserves the prior accumulator without testing
C. The extra cardinal point tests C first, so its A=1 preserves the accumulator
only when C=1; C=0 sets it regardless of A.
Success returns the accumulator from before the accepted neighbor, writes its
x/y, and leaves its direction in place (`0x102543424–0x102543438`). Failure
does not write x/y or the output flag; the direction may already be changed.
Calling this output a marker for an encountered reference edge is a semantic
interpretation. Its accumulation and return rules above are instruction-proven.

The secondary `CheckFlagAndRender` call for a diagonal does not have an
immediate `+0x1fc` check. Do not treat return 1 as independently proving that
the whole operation has no cancellation/status condition. The enclosing
analyzer checks status at its call sites and completion.

## Narrowest-point selection: additional proven arithmetic

`FindNarrowestPointForEachGap` scans the supplied rectangle in row-major order.
It starts from A=0,C=1 pixels with at least one cardinal A=1 neighbor
(`0x102541df0–0x102541eb0`). The initial direction is cardinal and depends on
those adjacent selected pixels. An ordered point collection tracks points
already encountered. It invokes the two outline modes repeatedly, maintains
two temporary point lists, and appends points when the corresponding returned
flag is nonzero (`0x1025423b0–0x1025423e4`).

At `0x102541d24–0x102541d2c`, it computes the squared-distance bound:

```text
limit = 2 * (g + 1) * (g + 1)
```

This computation uses 32-bit integer instructions. For ordinary gap widths,
the later signed 64-bit point arithmetic computes
`dx*dx + dy*dy`. The two loops at `0x10254240c–0x102542438` and
`0x10254246c–0x102542498` search one list against the current point on the
other outline. A distance must be **strictly less** than the bound to pass
`0x10254249c–0x1025424a8`; equality stops this portion of traversal. Equal
minimum distances select the later list index, because the index changes on
less-than-or-equal while the distance itself changes only on less-than.

Remembered endpoint-pair choices also depend on the two returned flags at
`0x1025424ac–0x1025424e4`. The routine appends a pair to the caller's vector
at `0x10254259c–0x1025425e8`; each point is two signed 32-bit coordinates.
The strict distance rule is established, but describing the complete pair
selection as a global nearest-pair search would go beyond these instructions.
The later [endpoint-pair translation](endpoint-pair-rules.md) now establishes
list lifetime, remembered choices, replacement ties, empty-list fallback,
and swapped-start closure. Startup tracing, outer candidate visitation,
actual endpoint observations, and complete stage interactions remain open.
This geometric bound is separate from the common omitted-component area bound
`8*g*g` established in native-algorithm.md.

## Stop-line rasterization: directly recovered rules

`RefillToStopLine` consumes consecutive endpoint pairs, 16 bytes per segment.
It calls `DrawSegment` on T first with mode 0 and then on the same ordered
pairs with mode 1 (`0x102542850–0x102542860`,
`0x1025429c0–0x1025429d0`). Mode zero clears bits; every nonzero value sets
bits. Endpoint order matters at exact half-step ties.

For ordinary in-bounds coordinates without arithmetic overflow, define
`ax=abs(x1-x0)`, `ay=abs(y1-y0)`, `M=max(ax,ay)`, `m=min(ax,ay)`, and signed
steps `sx` and `sy` toward the ending endpoint. The helper's recurrence is:

```text
D = 2*m - M
write the current pixel
takeMinorStep = (D >= 0)
D += takeMinorStep ? 2*(m-M) : 2*m
take one major-axis step; take a minor-axis step only when takeMinorStep
```

It chooses y as the major axis only when `ay > ax`; equal magnitudes choose x
(`0x102090fdc–0x102090fe8`). The recurrence and tie test are at
`0x102090fc0–0x102090fcc` and `0x102091034–0x102091060`. For noncoincident
endpoints it writes `M+1` samples including both endpoints. For coincident
endpoints it writes the same bit twice (`0x102090fa8–0x102090fb0`,
`0x102090fec`). These half-step examples follow directly:

```text
(0,0) -> (2,1): (0,0), (1,1), (2,1)
(2,1) -> (0,0): (2,1), (1,0), (0,0)
```

The exact addressing is `0x80 >> (X & 7)` in
`data[unsigned32(stride*Y) + (X >> 3)]`, where `X=max(signed(x),0)` and
`Y=max(signed(y),0)` (`0x102090ff8–0x102091030`). Negative samples collapse
onto row or column zero. There is no upper-coordinate or dimension check in
this helper. Endpoint validity is therefore a caller obligation, and negative
clamping is not evidence of general segment clipping.

All recurrence operations use wrapped 32-bit values. Magnitudes are the
unsigned absolute values of the wrapped signed differences; minimum and
maximum use unsigned comparisons. A maximum magnitude with bit 31 set returns
before accessing the bitmap (`0x102090fb4`). The ordinary-coordinate
description above must not be generalized to extreme values where error
arithmetic overflows. Calling this a Bresenham-style nearest-pixel line is an
interpretation; the recurrence, tie, bit, and bounds rules are directly visible.

## Reproduction and remaining limits

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/extract_narrow_boundary.py \
  '/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64' \
  --output docs/research/clip-studio-paint-stabilization/spikes/fill-gap/evidence/narrow-boundary
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/verify_narrow_boundary.py
```

The function-name recovery rejects byte-search candidates that do not parse
as complete name nodes and records that count. It recovers only the six
addressed names; it does not claim to validate every retained name in the image.
An initial whole-subtree traversal encountered invalid unrelated retained data,
failing with `ValueError: Retained name child is invalid` at node `0x6cedb`
under `_ZN12Planeswalker11PWBrushPlotC`. The retained method validates only each
requested terminal's ancestry. It rejected 29,866 arbitrary byte-search
candidates; these are not missing or failed requested function names.

Static verification passed for all six new ranges, the original bytes of all
1,453 instructions, all six addressed name ancestries, and the five overlapping
earlier assembly hashes. No native helper
execution or pixel-equivalence test was performed. These findings resolve
the previously missing outline helper and raster rules. The later
[endpoint-pair translation](endpoint-pair-rules.md) resolves the main loop's
selection and termination rules. Complete startup tracing, outer visitation,
paired native endpoint observations, and interaction with lazy reference
preparation and later bitmap passes remain unresolved.
