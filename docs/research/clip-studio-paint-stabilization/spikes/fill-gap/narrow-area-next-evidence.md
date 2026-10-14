# Narrow-area runtime evidence to recover next

Read-only follow-up on 2026-10-13. This uses the existing pinned assembly
extracts and does not establish complete narrow-area equivalence.

The boundary analyzer at `0x102541c94` repeatedly calls **`0x102543078`**,
now recovered as `TraceOutlineForSoak` in
[narrow-boundary-rules.md](narrow-boundary-rules.md). Its exact
`LC_FUNCTION_STARTS` range is `0x102543078–0x10254343c`, 964 bytes, with the
original bytes verified. Calls at `0x102542130`,
`0x102542184`, and `0x102542528` supply `w4=0`; calls at `0x1025421f8`,
`0x102542270`, and `0x102542500` supply `w4=1`. Stack addresses in `x3` and
`x5` are subsequently read by the caller. The scan directions, diagonal support,
and returned flags are translated. The subsequent
[endpoint-pair audit](endpoint-pair-rules.md) translates list eligibility,
remembered choices, ties, termination, and endpoint order. Full startup tracing
and outer candidate visitation remain the next offline gaps.

The existing `RefillToStopLine` extract at **`0x102542720`** provides a useful
runtime separation point. It saves entry `x4` in `x23` at `0x102542744`.
At `0x102542828–0x102542834`, it reads begin/end pointers from that object,
divides their byte difference by eight, then divides the point count by two.
Each subsequent segment is a pair of signed `(x,y)` points occupying 16 bytes.

The first loop loads paired endpoints at `0x102542850` and `0x102542854`,
passes bitmap T with `w5=0`, and calls the same raster helper
`0x102090f80` at `0x102542860`. The second loop reloads the same pairs at
`0x1025429c0` and `0x1025429c4`, passes T with `w5=1`, and calls it again
at `0x1025429d0`. The raster helper's inclusive endpoints and direction-sensitive
half-step rules are now established in narrow-boundary-rules.md. Their actual
native endpoint inputs and interaction with later masks still need observation.

Between those loops, `0x102542980–0x10254298c` performs the byte operation
`T = T & ~A`. After the second loop, `0x102542a30–0x102542a48` performs
`T = T & C`, followed by `C = C & ~T`. These operations cover the helper's
expanded/clipped region and do not by themselves reconstruct the full fill.

A later focused observer can record the complete endpoint vector at helper
entry, with its begin/end pointers, count, raw signed points, thread/call
pairing, seed, region, and A/C/T state. This would distinguish incorrect
endpoint selection from incorrect rasterization or later bitmap passes.
It should run as a separate bounded experiment after verifying the helper
bytes and allocation lifetime, rather than adding unchecked reads to the
current three-probe fill recorder.

Useful deterministic cases are a narrow pocket with two short entrances,
rotated equivalents, diagonal entrances, and narrow areas both on and off.
Existing complete final A masks can select which case needs these deeper
observations; another baseline capture is unnecessary merely to repeat the
already recovered static helpers.
