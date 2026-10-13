# Independent source/input review

Read-only review of `post-source.ts`, `post-input.ts`, their tests, original addressed instructions, and the standalone native harnesses. No source or input implementation changed during this review. The focused 17-test run passed, including 520 source-construction vectors and 6,240 movement/record vectors, with the optimized exact FMA helper.

## Arithmetic and orchestration findings

No discrepancy was found in the supported arithmetic or ordinary constructor sequence examined:

- `0x1027648e8` adds binary64 scalar pairs, converts the sum to binary32, and then multiplies by binary32 one-half. The code retains this double rounding. Scalar `+54` copies the current record instead of averaging it. Angle interpolation preserves its distinct wrap behavior.
- `0x102764a44` really overwrites vector `v1` with one-half before saving it. The after-corner preceding control therefore equals the midpoint of the previous raw position and the newly constructed midpoint. The unusual formula is supported by the instructions and native vectors.
- `0x102781770` appends and links the newly allocated node before its virtual constructor runs. The preceding node is available at `+30`. `0x1027647c0` zeroes each new quadratic control. The final node's zero control is not an inferred endpoint coordinate.
- Begin at `0x1028ebd40` copies the initial record into both historical positions and clears the pending marker. The deferred append branch in `0x1028ec548` directly imports its first record, without midpoint construction or fading, then updates both histories. The implementation follows that ordering.
- Ordinary append fades the local current-record copy before construction, tests corners against the prior two raw positions, and records marker bit `0x10` for the next append. The code does not apply that marker prematurely.
- Finish at `0x1028ec8d0` fades and creates a terminal node. Its additional `0x10276b2c4` work writes the bounds/cache at `+18`, outside the retained source position/control/scalar fields represented here.
- `0x1028f25b0` measures timed movement from the position two calls back, reads the oldest timestamp before optional removal, preserves position-history updates on reuse, and clamps only above one. The code preserves these unusual details. The initializer's platform/device branches and denominator threshold match the instructions.
- `0x10288cd3c` caps based on the original pressure after optional startup multiplication. Signed offsets, integer orientation selection, and reflection order agree with the record constructor. The retained sine table is used rather than substituting `Math.sin`.

## Integration constraints requiring explicit handling

1. Source corner construction can produce flags `1` or `5`; current ordinary post input validation accepts only zero flags. A caller enabling corner detection or injecting marked records must extend the recovered pipeline support or reject that configuration explicitly. The tested constructor does not itself make those flags compatible with the current pipeline.
2. Deferred begin followed directly by finish creates one source node. The current pipeline requires at least two. Tap handling must account for the selected begin configuration; it cannot assume every completed source has two nodes.
3. `PostMovement` accepts a native signed-32-bit window. Product integration should pass its bounded supported setting and keep a stroke-input limit; a large arbitrary window is not a practical browser allocation budget.
4. Movement's coordinate factor and document ratio remain explicit inputs. `0x1021c7320` reads external virtual `+358` (with a null-object default of one); `0x103116810` divides signed integer fields. The native harness supplies these parameters. Its arithmetic comparisons do not establish a browser-to-native unit conversion or the correct caller values for every device.
5. Source `+4c` is the recovered movement scalar, not Croquis rendered width. Pressure, tilt, orientation, movement, and the three initialized unit scalars stay separate. The constructor oracle does not justify substituting already flattened brush widths for these fields.

## Confidence boundary

The source harness executes original constructor instructions with checked relocation and an explicitly substituted identity cast for a known quadratic predecessor. It does not execute native allocation, the whole begin/append/finish orchestration, renderer callbacks, or the alternate `0x3021` path. The orchestration conclusions above come from static control/data flow and host sequence tests.

The movement harness executes original arithmetic and lookup instructions, but supplies platform/reflection getters and deque allocation helpers. Its recorded cases intentionally cover initialization and repeated update state; they do not constitute paired raw-device-input-to-source-path replay. The record cases use movement zero because the later caller write is outside `0x10288cd3c`. That distinction should remain in the integration documentation.
