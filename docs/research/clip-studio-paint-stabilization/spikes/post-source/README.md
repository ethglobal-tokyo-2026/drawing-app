# Ordinary quadratic source construction

October 11, 2026. `post-source.ts` reconstructs the geometric portion of the
ordinary open `0x2021` source path from explicit `SVectorNode` records. These
records retain seven double scalar values until their native import boundary.
The builder does not substitute Croquis widths, raw speed, or raw pressure for
the input scalars. Scalar preparation belongs to `post-input.ts`.

## Implemented behavior

- Begin `0x1028ebd40` imports the first record unless its explicit deferred flag
  is set. The quadratic constructor starts its control and endpoint fields at
  zero. Path allocation adds bit 0 to `0x2020`, producing `0x2021`.
- Append `0x1028ec548` normally creates a new midpoint anchor through quadratic
  virtual `+0x28 = 0x102764880`. The preceding node's control becomes the previous
  raw record position. Repeated positions are retained; there is no invented
  spacing rejection.
- Explicit marker bit `0x10` affects the next append. It creates a corner node
  through virtual `+0x38`, then a midpoint through `+0x40`. Optional caller-enabled
  geometric corner detection uses the already recovered `0x1027878ec` predicate.
  The two corner controls use separately rounded add-then-half operations.
- Terminal `0x1028ec8d0` always allocates a node and invokes virtual
  `+0x30 = 0x102764984`: exact current position/direct scalar import, with the
  previous raw position as the preceding control.
- `0x1028ec4e0` accumulates distance from the previous raw record and can fade
  record `+0x30`, imported as node `+0x54`. It does not replace a node. The first
  deferred append bypasses that fade, matching the native branch.

Midpoint scalar handling is field-specific. Fields `+44,+48,+4c,+58,+5c` add the
two doubles, round to binary32, then multiply by binary32 `0.5` and round again.
Field `+50` uses the native shortest-angle interpolation in degrees and binary32
import. Field `+54` directly imports the current record's value. Midpoint nodes
retain constructor flags zero; direct import transfers source record low bits
0 and 1 into node flag bits 12 and 13. A constructed corner additionally sets
bit 0, and the explicit marker additionally sets bit 2.

The source index lists are portable provenance metadata, not a claim about a
native allocator or post-correction multimap. They identify records contributing
to each constructed anchor/control. Post correction creates its own associations
after source subdivision.

## Configuration provenance and limits

`QuadraticSourceBuilder(first, configuration, maximumNodes)` requires explicit
configuration. Its `append(record, inputScale)` takes the magnification fraction:
`0x10288db08` obtains `0x102992930`, and `0x10288db64..6c` multiplies by `0.01`.
The caller passes this in `d0` at `0x10288df80`. The corner predicate receives its
reciprocal as its length scale.

The begin caller builds its record at `sp+0x610`. Field `+d0` receives
`100/magnificationFraction` for event types 1 or 4, otherwise
`20/magnificationFraction` (`0x102889344..364`). The builder's corner positional
tolerance is `0.05 / beginRecord.d0` (`0x1028ebe88..94`). Begin `+dc` controls
deferred allocation, while `+c0/+c8` enable and parameterize scalar `+54` fading.
Those settings are explicit API inputs, not inferred from coordinates.

With post correction enabled, `0x10288983c..86c` writes zero to begin `+d8`,
selecting `0x2021` and initially disabling geometric corner detection. A renderer
callback at `0x1024a1268` can still enable that detection through an output flag.
This callback's runtime result is not present in the saved source capture.
The alternative `0x3021` path's corner filtering/removal, closed paths, rendering
callbacks, cached bounds and upstream brush-event generation are excluded.

The API explicitly bounds source nodes (10,000 by default), accepts finite
arithmetic, and restricts scalar angles to `[-360,720]` degrees to bound native
turn-normalization loops. These are research safeguards, not recovered native
limits. Fade length and append scale must be positive finite values. Unsupported
inputs fail rather than returning partial success as a corrected stroke.

## Evidence and verification

`extract_geometry.py` checks the pinned executable SHA-256 and retains nineteen
addressed function bodies with instruction-byte and assembly hashes in
`evidence/extraction.json`. It reads the original binary without starting or
attaching to CSP. The existing begin/move/terminal caller evidence is under
`../post-contract/evidence/`.

`native_geometry.py` executes seven reassembled source-node/angle functions in a
standalone ARM64 process. It verifies 155 unchanged instructions and 36 address
relocations against the original bytes. Relocated constant pages retain their
original bytes. The sole object seam replaces RTTI with an identity cast for a
known quadratic predecessor. It does not execute whole native brush or path
orchestration. Compiler, symbol inspection and execution each have timeouts.

All 520 cases match every output coordinate bit, seven binary32 scalar fields,
flags, and preceding control bits. They cover import, midpoint, terminal, corner,
and after-corner operations, including angular wrapping, signed zero and tiny
scalar values. The first comparison caught a register-lifetime interpretation
error in the after-corner control. `native-tests-before.txt` preserves that
failure; the code now follows the actual `v1=0.5` assignment before its stack
save. The native expectations were not changed to accommodate it.

Ten tests also cover ordinary insertion, terminal behavior, repeated positions,
deferred begin, distance fade, marker/corner branches, input ownership and work
limits. The original failing tests are retained in `evidence/tests-before.txt`.

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/post-source/extract_geometry.py
python3 docs/research/clip-studio-paint-stabilization/spikes/post-source/native_geometry.py
node --experimental-strip-types --test docs/research/clip-studio-paint-stabilization/post-source.test.ts
```

The saved native post fixture begins with already constructed quadratic nodes.
It has no paired upstream record sequence, so it cannot independently establish
that this source builder recreates those 99 nodes from the original device
events. The exact 99-to-eight correction replay remains a separate downstream
comparison. No browser rendering or universal brush-setting claim follows from
the source-node instruction comparisons.
