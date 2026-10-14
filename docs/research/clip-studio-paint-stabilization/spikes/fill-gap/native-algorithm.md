# CSP gap fill: bitmap passes and capture contract

Read-only static research, 2026-10-13, for the fingerprinted CSP 5.1.4 ARM64
image recorded in [README.md](README.md). These are recovered instructions and
limited semantic interpretations. Four actual native selected masks have been
compared with current Croquis in [COMPARISONS.md](COMPARISONS.md). A complete
equivalent browser implementation has not been written or verified.
The [algorithm extraction manifest](evidence/algorithm-extraction.json)
records 26 bounded function extracts, constants, commands, and hashes.

## What differs from Croquis

Croquis's current `apps/frontend/src/sticker-creation/canvas/fill.ts` uses
3/4 chamfer steps to estimate distance from a line, searches away from lines
when the seed is close, classifies other regions using `ROOM = 1.5`, and assigns
`POCKET` pixels to the nearest region. Those rules are visible at lines 46-70
and 385-516.

The recovered CSP gap path instead prepares square barrier perimeters, protects
the seed's immediate region, flood-fills through the resulting mask, restores
pixels with constrained horizontal/vertical scans, and performs local repeated
4-neighbor shrinking. Both narrow-area settings also recover small omitted
components using an explicit pixel-count limit, **8 times the squared gap
width**, rather than a maximum-distance test. Narrow areas on adds further
connectivity and stop-line processing. Adopting CSP's selector values alone
cannot reproduce this behavior.

## Bitmap roles and layout

`Planeswalker::PWFloodFill::CloseGapFill(SPoint, unsigned int, SRect&)` is at
`0x10253f5e4`, size 2,348 bytes. Its `this` object has these relevant fields:

| Offset             | Directly observed role                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| `+0x90`            | 16-byte shared pointer to optional progress object                            |
| `+0xc8`            | Reference image/tile source used by lazy candidate preparation                |
| `+0x140`           | `SRect`: left, top, right, bottom, signed 32-bit values                       |
| `+0x16c`           | Integer gap width                                                             |
| `+0x190`           | 16-byte shared pointer to selected/visited bitmap, called A below             |
| `+0x1a0`           | 16-byte shared pointer to reference candidate bitmap, called C below          |
| `+0x1b0`           | 16-byte shared pointer to temporary barrier/refinement bitmap, called T below |
| `+0x1d0`, `+0x1d4` | Offsets from bitmap coordinates to document coordinates                       |
| `+0x1d8`, `+0x1dc` | Offsets used to address the reference tile source                             |
| `+0x1e0`           | 16-byte seed exemption rectangle                                              |
| `+0x1f0`           | Enables gap barrier preparation during the initial flood                      |
| `+0x1fc`           | Cancellation/status value checked by the routines                             |

A shared pointer is 16 bytes: object pointer at `+0`, ownership pointer at
`+8`. A native `PWBitmap1Bit` object is 48 bytes and has width at `+8`, height
at `+12`, byte stride at `+16`, and data pointer at `+40`. Width, height, and
stride are signed 32-bit values. Allocation at `0x10208ff08` establishes stride
`ceil(width / 8)` and zero-initializes the bytes. Pixel `(x,y)` uses:

```text
byte = data[y * stride + (x >> 3)]
bit  = 0x80 >> (x & 7)
```

Bitmap roles are established by `0x10253d98c`: it **writes its first bitmap
argument (`x1`)**, while the second (`x2`) supplies eligibility bits. Ordinary
fill writes A while reading C's 1 bits. Initial gap fill writes A while reading
T's 0 bits. A's 1 bits indicate selected pixels. C is prepared lazily, so its
entry snapshot may be mostly zero; it is not necessarily a complete reference
image at that point.

## Initial gap barriers

`0x10253f668-0x10253f690` creates a seed exemption rectangle with radius
`floor(g / 2) + 2`, clipped to bitmap dimensions. Gap preparation is selected
by `+0x1f0 = 1` during the initial scanline flood, then turned off afterward.
Lazy reference preparation in `0x102540ac4` calls **`0x102546750`** to construct
T from C in each prepared rectangle.

The direct bit behavior of `0x102546750` is:

1. Clear T within the supplied rectangle.
2. Copy each C=0 pixel as T=1.
3. For a C=0 pixel adjacent horizontally or vertically to a C=1 pixel, set
   the **perimeter** of a clipped axis-aligned rectangle around it. Its backward
   extent is `floor(g/2)` and forward extent is `ceil(g/2)`, inclusive.
4. Within the intersection of the prepared rectangle and seed exemption,
   clear T where C=1.

It draws perimeters, not every interior cell of every square. Isolated specks
can therefore produce rings with interior zero bits. Treating this as generic
dense square dilation would lose directly observed behavior. Odd widths have
different backward/forward extents; this asymmetry is explicit in the integer
instructions.

The first flood calls `0x10253d98c` with A as its write mask and T as its
eligibility mask, requiring T=0. C and T are prepared as needed during that
flood. The seed exemption ensures that a region with little clearance near the
seed is still considered; this is different from Croquis's nearest-clearance
seed search.

## Restoration and local shrinking

After the first flood, CSP expands the selected rectangle by `g + 2`, rounds
horizontal bounds outward to byte boundaries (`0x1020900d0`), and clips it to
bitmap dimensions. It copies A into T there, then calls **`0x102546a64`** with
source A, destination T, reference C, and reach g.

`0x102546a64` reads source 1 bits at the source boundary. It extends vertically
through C=1 pixels, at most reach steps, and extends horizontally through C=1
pixels on the reached rows when the corresponding source neighbor is zero.
It ORs destination bits and retains the destination's existing bits. Its scans
stop at the first C=0 pixel; this is not a Euclidean distance transform. CSP
then copies T back into A.

For g >= 2, CSP computes:

```text
a = max(1, trunc(g * 0.35 + 0.50000001))
```

- For g <= 10, it calls `0x102547380(T, A, C, a, rectangle, 2*g)`.
- For g > 10, q is `floor(g/4)`. It calls that routine with `a + q`, copies
  the result A into T, and expands T into A with constrained reach q.

`0x102547380` selects C=1, source=0 pixels adjacent to source=1. It creates
clipped windows of radius `2*g` around those pixels, skipping a center already
inside an earlier processed window. It calls **`0x1025476d4`**, whose retained
callback RTTI identifies `PWFloodFillInnerFunction::ShrinkImageByPixelSub`,
then copies each local result into the destination. Thus this is local window
processing in raster order, not proven equivalent to shrinking the whole image
at once.

The shrinking callback at **`0x10254b288`** has a precise simple operation.
Each iteration first copies the old local mask into a new local mask. For each
old=0 pixel whose corresponding global C bit is 1, it clears that pixel's
horizontal and vertical neighbors in the new mask. It does not propagate from
C=0 pixels. The code processes rows in three phases to avoid neighboring-row
write conflicts, then swaps the old/new buffers. It repeats the requested
number of iterations. In ordinary Boolean notation:

```text
new[p] = old[p] &&
         no q in p's four neighbors has (old[q] == 0 && C[q] == 1)
```

The crop boundary and local/global coordinate offset are part of this contract.

## Narrow areas and common omitted-component recovery

When the narrow-area argument is nonzero, CSP first clears T, refloods the
seed's connected A component into T, and copies it back into A. It then calls
`0x102541c94` to analyze boundary/stop-line candidates and may call
**`RefillToStopLine` at `0x102542720`**. This path uses explicit point/segment
lists and further mask Boolean operations. Subsequent
[outline/raster research](narrow-boundary-rules.md) and
[endpoint-pair research](endpoint-pair-rules.md) recover scan order, diagonal
support, strict cross-front distance, flag-dependent remembered choices,
replacement ties, termination, and ordered raster endpoints. Startup preparation
and complete stage interactions still need native validation; reproducing only
the surrounding floods would not establish equivalence.

**Both settings** converge at `0x10253fc3c` and run common recovery. CSP expands
the processing rectangle by `4*g`, creates a local omitted mask from
`C AND NOT A`, and calls `0x102542c50` with threshold **8*g*g**. That routine
starts from omitted components adjacent to A. A component is merged into A
only when its flood succeeds, it stays strictly inside the local crop, and
its pixel count is no greater than that threshold. Components touching any
crop side or exceeding the count stay omitted. The relevant checks are at
`0x102542e78-0x102542eb0`.

This explicit area test is materially different from Croquis's `ROOM` and
`POCKET` depth classification. It must be evaluated independently of any
selector mapping or general gap-width tuning.

## Observer capture locations

At `CloseGapFill` entry:

| Register | Value                                                                    |
| -------- | ------------------------------------------------------------------------ |
| `x0`     | Valid native `PWFloodFill*`                                              |
| `x1`     | SPoint packed as x in low 32 bits, y in high 32 bits; bitmap coordinates |
| `w2`     | Narrow-area argument, observed caller passes 0 or `0x400`                |
| `x3`     | Pointer to output 16-byte SRect, exclusive right/bottom bounds           |

Store x0 and x3 at entry. The routine later repurposes x19 as its Boolean
result. The shared normal return location **`0x10253fb34`** copies x19 to x0;
an observer there can read the final A bitmap through the saved x0 pointer and
the final rectangle through saved x3. T has been released and its shared
pointer cleared by that point. On failure, retain the success flag and do not
label partial mask state as a completed fill.

**`0x10253f704`**, immediately after the initial flood returns, is useful for
recording initial A, barrier T, and the C pixels already prepared. Record
bitmap dimensions, stride, domain rectangle, both coordinate-offset pairs,
gap width, narrow-area argument, and status with every capture. The A bitmap
is the direct algorithm result; final visible RGBA also depends on later
rendering/anti-aliasing and is a separate comparison.

One observed native allocation is **0x210 bytes** at `0x1029b71d4`. Constructing
a fake object with only three masks is insufficient: the entry calls source
tile and cache/container methods. Use a valid object from a native operation
for observer captures.

## Controlled helper inputs

These contracts are useful for a later controlled native helper comparison;
no helper invocation or process modification was performed in this static
research.

| Helper        | Integer-register arguments                                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x102546750` | x0=&C shared pointer, x1=&T shared pointer, w2=g, x3=packed rectangle left/top, x4=packed rectangle right/bottom, x5=packed seed exemption left/top, x6=packed seed exemption right/bottom                             |
| `0x102546a64` | x0=&source shared pointer, x1=&destination shared pointer already copied from source, x2=&C shared pointer, w3=reach, x4=packed rectangle left/top, x5=packed rectangle right/bottom, x6=&null progress shared pointer |
| `0x102547380` | x0=&source shared pointer, x1=&destination shared pointer, x2=&C shared pointer, w3=shrinking iterations, x4=packed rectangle left/top, x5=packed rectangle right/bottom, w6=window radius                             |
| `0x1025476d4` | x0=&source shared pointer, x1=&destination shared pointer, x2=&C shared pointer, w3=shrinking iterations, x4=packed rectangle left/top, x5=packed rectangle right/bottom                                               |

All four return void. The first two use bitmap fields directly and do not
construct a `PWFloodFill`. Their masks must have valid dimensions, strides,
bytes, and in-bounds clipped rectangles. The latter two allocate native
temporary bitmaps and use native ownership/container helpers; they require
that native runtime context. A packed point is
`uint32(x) | (uint64(uint32(y)) << 32)`.

No exact Croquis replacement or native equivalence claim follows from these
static findings alone. Paired native captures should cover odd/even gaps,
diagonals, isolated specks, narrow loops, omitted components around the 8*g*g
limit, crop edges, and both narrow-area settings.
