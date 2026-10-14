# Bounded static candidate trace after the soft-source captures

This trace only reads the pinned CSP 5.1.4 ARM64 image and existing captures.
No native process was attached, resumed, or altered. The image's SHA256 matches
the existing extraction fingerprint:
`6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd`.
Exact extraction commands, address ranges, callback-table words, and output
hashes are retained in `manifest.json`. All addresses below are unslid ARM64
virtual addresses. Symbol-name guesses from the enclosing symbol were removed.

## Established call path and captured values

The existing lazy-preparation extract `../../evidence/102540ac4.asm` shows:

1. `0x102541054…0x1025410bc` copies the reference source at fill-object `+0xc8`
   and candidate bitmap C at `+0x1a0`, passes source offsets, the preparation
   rectangle, flags at `+0xa0`, mode at `+0xa4`, a value at `+0x170`, and four
   target components at `+0x178…+0x184`.
2. `0x1025410c0` calls **`0x1025452d4`**. That function builds tile jobs and
   dispatches through the stored callback table **`0x104a4b8d0`**.
3. Read-only Mach-O mapping places that table at file offset `0x4a4b8d0` in
   `__DATA_CONST`; its first four words are `0x10254a06c`, `0x10254a144`, `0x10`,
   and `0x10453e718`.
4. `0x10254a06c` manages the callback object. **`0x10254a144`** is its invoker;
   it retrieves the source tile and dispatches by source-format getter values
   and the mode originating from `+0xa4`.

All five actual captures retain the complete 528-byte fill-object header.
`captured-parameters.json` records their return values. A fresh check of all
15 entry/initial/return headers confirms these parameters are identical and
stable across every captured boundary:

| Fill-object offset                                | Value under the observed color margin 10 setting |
| ------------------------------------------------- | ------------------------------------------------ |
| `+0xa0` flags                                     | `0x440` / 1088                                   |
| `+0xa4` mode                                      | 0                                                |
| `+0x110`                                          | 0                                                |
| `+0x170` interval tolerance passed to the workers | 26                                               |
| `+0x178…+0x184` target components                 | [0, 0, 0, 0]                                     |

This captures the value 26 under color margin 10. It does not recover the
general UI-to-tolerance conversion formula. Crucially, the source-format getter
results and active worker entry were not captured; do not label either worker
below as dynamically confirmed for these calls.

## Conditional separate-alpha/color worker

When the source-format branch has bit 5 set and mode is zero,
`0x10254a34c` calls **`0x1025484dc`**. Its loop reads one source byte per pixel
from one source plane and three color bytes from a four-byte packed plane.
The control flow treats the first plane as alpha separately from color:

- With flags bit 14 clear, `0x10254851c…0x102548540` prepares the target-alpha
  interval and the small-alpha shortcut. Flags bit 13 selects a different
  alpha-handling rule; it is clear in the captured `0x440` value.
- `0x1025485c4…0x1025485ec` sets C directly when both the target alpha and
  candidate alpha are no greater than the tolerance. This bypasses the color
  comparisons.
- Otherwise, `0x1025485f0…0x102548674` requires candidate alpha inside the
  prepared inclusive interval and each of the three color components inside
  its own inclusive target-component ± tolerance interval. It writes or clears
  the candidate bit using the established MSB-first order.

**If this worker and these captured controls are the active path**, a zero-alpha
target and tolerance 26 reduce candidate eligibility to **alpha ≤ 26 inclusive**,
irrespective of color. Values above 26 fail the zero-target alpha interval.
That conditional static result is consistent with the directly positive native
C alpha16 corner pixels and the observed alpha64 containment. C zeros alone
still do not prove the active worker or a complete native eligibility predicate.

## Conditional byte-only worker and exact next checks

When source format equals 1 and mode is zero, `0x10254a3b0` calls
**`0x1025492d4`**. With flags bit 14 clear, its byte loop at
`0x102549340…0x10254936c` writes C for an inclusive
**target-byte − tolerance ≤ source-byte ≤ target-byte + tolerance** interval.
No summed RGB metric appears in this worker. The source-byte meaning remains
dependent on the source format selected by the invoker.

The exact next confirmation is the active source-format getter value and worker
entry at `0x10254a144`; the workers are now located. After that, vary color
margin and test partial-alpha values on both sides of the recovered interval,
retaining a deliberately prepared C domain or direct worker observation so lazy
zeros cannot masquerade as rejection. The static path also exposes a different
per-component color metric from Croquis's summed RGB distance < 72, but its
active-format and color controls still need confirmation. A complete native
predicate and the general margin conversion remain outstanding.
