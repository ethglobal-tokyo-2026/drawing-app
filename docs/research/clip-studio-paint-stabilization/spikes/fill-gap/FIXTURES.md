# Controlled native and Croquis fill comparisons

The 11 fixtures in [fixtures/manifest.json](fixtures/manifest.json) preserve
exact binary-alpha source pixels as PNG and compressed RGBA. Their dimensions,
seed coordinates, source hashes, opening coordinates, probes, and ordinary
four-neighbor connectivity are recorded. The fixtures have no soft edges;
selection classification can therefore be compared independently of later
native anti-aliasing and Croquis's edge tuck.

`generate_fixtures.py` uses only Python's standard library. The rectangle
fixtures have three-pixel opaque black outlines and transparent source pixels.
The exact 240 × 200 edge fixture keeps the physical canvas sides close to its
outline. The diagonal fixture uses an integer Bresenham path with a
three-pixel square pen. The recolor fixture is opaque green and has a
four-pixel-high bridge between two lobes.

The current Croquis implementation was run at raw image-pixel gaps **1, 3, 5,
10, 20** through `findFill` and `writeFill`, without a DOM or product changes.
The 55 complete selection masks and counts are in
[fixtures/croquis-baselines.json](fixtures/croquis-baselines.json). That file
records the source hash of `fill.ts`, preserving which implementation produced
the results. Its five gaps do not adopt a new product setting.

## Croquis baseline observations

These are measured source-fixture results, not native CSP results.

| Fixture                              | Gap 1               | Gap 3               | Gap 5               | Gap 10              | Gap 20              |
| ------------------------------------ | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| Axis opening 1                       | Outside selected    | Closed              | Closed              | Closed              | Closed              |
| Axis opening 3                       | Outside selected    | Outside selected    | Closed              | Closed              | Closed              |
| Axis opening 5                       | Outside selected    | Outside selected    | Outside selected    | Closed              | Closed              |
| Axis opening 10                      | Outside selected    | Outside selected    | Outside selected    | Closed              | Closed              |
| Axis opening 20                      | Outside selected    | Outside selected    | Outside selected    | Outside selected    | Closed              |
| Axis opening 21                      | Outside selected    | Outside selected    | Outside selected    | Outside selected    | Outside selected    |
| Axis opening 5, seed near upper line | Outside selected    | Outside selected    | Outside selected    | Closed              | Closed              |
| Edge opening 2, 240 × 200            | Outside selected    | Closed              | Closed              | Closed              | Outside selected    |
| Diagonal opening                     | Outside selected    | Outside selected    | Outside selected    | Closed              | Closed              |
| Small pocket                         | Pocket selected     | Pocket omitted      | Pocket omitted      | Pocket omitted      | Pocket selected     |
| Green bridge 4                       | Both lobes selected | Both lobes selected | Both lobes selected | Both lobes selected | Both lobes selected |

The edge fixture selects 30,229 pixels at gap 3 and 45,870 at gap 20. The
small-pocket fixture selects 79,523 pixels when the pocket is omitted and
80,025 when it is included. The recolor selects all 50,560 green pixels at
every gap tested. These cases give native captures distinct, reproducible
questions to answer.

## Native capture comparison

`compare_native.mjs` accepts the observer's `csp-fill-capture/v1` JSONL
boundaries. It only compares successful final `return` boundaries with complete
snapshot bytes. It decodes final A using MSB-first bit order and the captured
byte stride, then adds the captured document offset to bitmap coordinates.
It verifies the mapped native seed against both the captured document seed,
when present, and the fixture seed.

An exact fixture-seed mismatch is rejected by default. The explicit
`--use-captured-seed` option recomputes Croquis at the actual captured document
seed and records both seeds; it does not silently substitute a coordinate.
The captured gap width is passed directly to Croquis. The captured narrow-area
flag is preserved in each result; Croquis does not have that separate option.

The report compares native A with Croquis's `IN` classification and retains
full lossless masks for both selections and both directions of difference.
Counts, exclusive bounds, canvas-side contact, and named probes accompany
those masks. Native pixels outside the fixture document are counted separately
and never become hidden differences. Overlay PNGs show native-only pixels in
red, Croquis-only in blue, and shared selected pixels in green.

Candidate eligibility is derived from the exact fixture RGBA and the captured
seed. When captured C is present, the report classifies its positive bits
against that known source. **C is prepared lazily**: eligible zero bits may
be unprepared, so they are recorded separately and do not prove a native
eligibility disagreement. Full captured bytes remain in the source JSONL.

Single-fixture capture:

```sh
node docs/research/clip-studio-paint-stabilization/spikes/fill-gap/compare_native.mjs \
  --capturefile /absolute/path/to/capture.jsonl \
  --fixture axis-gap-5 \
  --output /absolute/path/to/comparison.json
```

For a file containing several fixtures, pass `--map` with a JSON array of
`{"callId":"captured call ID","fixtureId":"axis-gap-5"}` objects.
Use `--call-id` to select one call. Missing mappings, failed fills, incomplete
captures, and invalid coordinates persist in the report's `failures` array and
make the process return a failure status.

## Reproduction and verification

```sh
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/generate_fixtures.py
python3 docs/research/clip-studio-paint-stabilization/spikes/fill-gap/validate_fixtures.py
node docs/research/clip-studio-paint-stabilization/spikes/fill-gap/croquis-baselines.mjs
node --test \
  docs/research/clip-studio-paint-stabilization/spikes/fill-gap/bitmap.test.mjs \
  docs/research/clip-studio-paint-stabilization/spikes/fill-gap/compare_native.test.mjs
```

Verification confirmed the 11 PNGs' chunk checksums and exact decoded RGBA,
dimensions, alpha values, and hashes. Seven tests cover native bit order, padded
strides, signed offsets, lossless mask packing, incomplete-capture rejection,
an extra selected pixel, and failed fills or contradictory seed coordinates.
Synthetic observer records in those tests validate comparison handling; they
are not native evidence. Node 24.21.0 executed the existing TypeScript fill
module directly. No packages were installed.
