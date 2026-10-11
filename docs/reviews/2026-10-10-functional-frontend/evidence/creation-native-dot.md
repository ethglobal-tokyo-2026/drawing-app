Native Canvas reproduction for detached pen-dot loss when sealing
================================================================

Run from the repository root after installing the frontend dependencies and Playwright browsers:

```sh
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/reviews/2026-10-10-functional-frontend/evidence/creation-native-dot.mts
```

The script creates isolated blank Chromium and WebKit pages. It uses the production `StrokeBuilder` and `sizePx(0)` to make a stationary pen mark with normal pressure, then paints its single-point circle with the same radius calculation as `paintStroke.ts:38,58–60`. It reads actual native Canvas pixels and calls the production `dieCut` function. It neither opens the app nor accesses user data.

The sheet is 374 × 748 units at density 3. The dot is at (58.4375, 58.4375); its production brush width is 0.525 units and the renderer floors its radius to 0.3 units. A second case adds an ordinary large opaque shape well away from the dot. These correspond to a smallest-size pen tap and a drawing that includes that detached tap.

Expected: the dot contributes to the cut in both cases. Actual in both browsers: its native peak alpha is 255, yet it is discarded by alpha averaging before the cut. The dot-only input returns no cut. The larger drawing returns a cut that omits the detached dot. The captured output is in `creation-native-dot.stdout.txt`.

This confirms production brush output and native Canvas rasterization, not a full UI or physical Pencil event sequence. The primitive is repeated explicitly in the script to avoid introducing an app build/server dependency. `dieCut.test.ts` checks preservation of thin ink with larger marks but does not cover this minimum-width, downsampling-boundary case.

Relevant implementation: `apps/frontend/src/sticker-creation/sealing/dieCut.ts:383–392` averages alpha and discards cells at or below 18; `paintStroke.ts:5,38,58–60` and `brush.ts:9,27,153–170` permit this dot. This is not merely transparent speckle: both native renderers produce an alpha-255 source pixel. In `DrawingScreen.tsx:455–468`, no-cut input returns to drawing before timeout and resets the sheet after timeout. With a larger shape, sealing succeeds and loses the detached dot from the cut Sticker.

Recommended correction: determine cut occupancy from qualifying source alpha before downsampling, preserving occupied cells rather than averaging away small opaque marks. Add regression coverage for a native minimum-width detached dot across different grid alignments and densities; ensure all source ink above the intended alpha threshold lies inside the resulting cut.
