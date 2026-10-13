# Drag Fill feasibility spike

Date: 2026-10-11, America/New_York. Measurements finished 2026-10-12 UTC.

This is a local experiment, not an implementation of Drag Fill. No product source was changed. The existing flood algorithm, LayerInk, and LayerDisplay were imported from commit `c1a6368ed09ef23f0d4f3e6cf314ecd4a151f6c6` in an isolated checkout.

## Decision

The worker approach is supported by these synthetic desktop measurements. Prepared fills produced exactly the same selected-layer and composite bytes as sequential existing fills in Chromium and WebKit. The outlined-sheet latency and drain targets passed, no instrumented main-thread slice exceeded 50 ms, and same-paint traversal sent no worker requests. WebKit's complete main-thread task target remains unproven because it lacks the Long Tasks observer.

The provisional touch design needs a correction before implementation: reuse LayerDisplay's existing wet canvas instead of installing provisional pixels into LayerInk and making an additional full-layer hold. Releasing the reference scratch canvases before installation helped, but the conservative canvas model left too little reserve. Selected clipped layers and existing Undo checkpoint copies still require an explicit memory check during integration.

The replacement preview passed exact pixel comparisons in five bounded desktop fixtures in both browsers. It leaves the actual selected layer unchanged until acceptance and needs no additional LayerInk hold copy.

These results do not establish physical iPhone or Apple Pencil feel, complete pointer interpolation, durable grouped Undo, or sealing/time-up behavior. Those are remaining implementation and device checks, not completed tests.

## Browser experiment

The harness used a 374 × 823 sheet at bounded density 3.016: 1128 × 2482 backing pixels, or 2,799,696 pixels. It ran Chromium 155.0.8059.12 and WebKit 26.6 sequentially on this Mac, headless, with the real display mounted at 374 × 823 CSS pixels. Each case had a fresh-worker run, two warm-ups, and 20 measured runs per browser. Modules had already been served during correctness verification, so the fresh-worker run is not an uncached site-startup measurement.

Cases:

- Maximum-size transparent sheet, alternating center and lower-right seeds; this exercises adaptive patch expansion.
- 100 fully closed cells, outlines on the lower layer, paint on the blank selected upper layer, Visible layers reference. Eight known center seeds enter the FIFO per animation-frame packet. This tests queue pressure without implementing pointer interpolation.
- Ten inked visible layers, one clipped layer, and a connected outline recolor spanning the sheet; the selected layer already has ink and is held before installation.
- The same ten-layer case with scratch release before installation.
- A translucent pre-inked selected layer held before filling; this forces the actual copy-on-write path rather than a hold on a blank layer.
- 5,000 candidate samples crossing an already matching paint region, using one 128 × 128 reference tile cache.

Warm-run results, milliseconds unless specified:

| Measurement                                                  | Chromium | WebKit |
| ------------------------------------------------------------ | -------: | -----: |
| 100-cell first installed fill, p95                           |      4.7 |    4.0 |
| 100-cell next frame opportunity, p95                         |     17.5 |   18.0 |
| 100-cell complete processing, p95                            |    332.9 |  334.2 |
| 100-cell remaining drain after final packet, p95             |    133.1 |  135.1 |
| Longest instrumented main-thread slice across all warm cases |     25.2 |    9.0 |
| Maximum blank-sheet region completion, p95                   |     78.1 |   62.0 |
| Pre-inked held-layer completion, p95                         |    141.8 |   69.3 |
| Worker requests for 5,000 same-paint candidates              |        0 |      0 |
| Reference cache reads for those candidates                   |       54 |     54 |

`firstFillMs` ends after installation into the mounted selected-layer canvas. `firstFrameOpportunityMs` is the next animation-frame callback; it is not a measured display-presentation timestamp. The prepared result remains mounted through a paint opportunity before rollback or cleanup. Main-thread slices measure the read/composite/install paths, while worker timings and round-trip overhead are separate. Round-trip overhead includes scheduling and startup, not just buffer transfer.

Chromium exposed the Long Tasks observer; no long task was reported during the measured intervals. WebKit did not expose that observer, so its zero-valued field is unavailable evidence. Both browsers also recorded animation-frame gaps. Verification readbacks happen after the timed processing interval.

All six correctness cases per browser matched exact RGBA bytes on both the selected layer and the composite. The cell centers became opaque, the tested dark boundary retained its color, and all 100 cells changed. Transferred buffer aliases were deduplicated. Provisional holds were released after restoration.

## Memory finding

The probe counts known canvas dimensions and array lengths; it does not measure actual process, GPU, or browser heap residency. It also applies LayerInk's existing conservative reservation of eight full-sheet canvas equivalents for the product display.

| Ten-layer experiment                          | Known raw canvas bytes, including display | Conservative canvas estimate |
| --------------------------------------------- | ----------------------------------------: | ---------------------------: |
| Hold plus retained reference scratch          |                               167,981,760 |                  235,174,464 |
| Release reference scratch before installation |                               156,782,976 |                  223,975,680 |

The existing canvas budget is 224,000,000 bytes. The first estimate exceeds it; the second leaves only 24,320 bytes of reserve. This is a failure of the conservative planning budget, not evidence that the browser used exactly that amount of resident memory or that an iPhone allocation failed.

Reuse of the existing wet canvas removes the extra provisional LayerInk copy. The product implementation must substitute the complete raw layer, including unchanged pixels, so alpha and clipping stay correct. A patch-only overlay can double alpha. Acceptance must install the retained prepared result before clearing the preview; cancellation must clear the preview and redraw affected clipping without changing history. Release scratch before accepted installation where needed, and include existing checkpoint copies and the selected clipped-layer view in the budget check. Do not interpret the scratch-release variant as proof that every ten-layer configuration fits.

## Replacement preview experiment

The separate `previewProbe.ts` uses the existing LayerDisplay wet canvas with 320 × 400 fixtures: partial layer opacity, locked transparency, a selected clipped layer, a base layer with a clipped layer above it, and a blank layer. It copies the complete raw layer into wet, replaces the prepared dirty pixels, hides the actual mounted layer, and uses wet as the selected-layer source for the existing clipping operations. This is a research adapter, not a production preview API.

All five fixtures in both Chromium and WebKit produced zero byte differences against the existing fill's displayed result. The actual layer stayed unchanged during preview. Cancellation restored the original displayed result; acceptance matched both the existing fill's actual layer and display. `copiesHeld` remained zero during preview. The comparison flattens the real display canvases with their opacity/visibility; it does not measure physical display presentation.

These fixtures have no Undo checkpoint holds. They prove the preview's pixel behavior for these cases, not maximum-size timing, all clipping combinations, or a complete ten-layer memory budget. Those checks belong to the implementation gate.

## Touch experiment

The unmodified TapRecognizer was exercised in eight asserted traces:

- A young second finger with provisional-contact metadata returns `cancel-stroke`, then completes Undo. The engine must interpret that result as Fill-preview cancellation when Fill is active.
- A first contact moved 27 CSS pixels at 100 ms returns `ignore` for a second finger when that movement is supplied; no Undo follows. Omitting the metadata permits an erroneous Undo.
- A stationary first contact at 261 ms does not become a multi-finger Undo.
- Three young fingers complete Redo; a resting palm does not join the tap; later fingers after accepted movement remain ignored.

This experiment covers the recognizer only. Engine pointer roles, queued earlier fills, preview cancellation, and real browser touch events remain integration tests. In particular, a two-finger Undo while a previously released Fill is still computing must wait for that earlier Fill to commit before it chooses the history action.

## Reproduction and evidence

With the repository dependencies and Playwright browsers installed, run from the repository root:

```sh
node docs/research/drag-fill-spike/runner.mjs
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/research/drag-fill-spike/touchProbe.ts
```

For correctness checks without repeating the timing runs:

```sh
FILL_SPIKE_VERIFY_ONLY=1 FILL_SPIKE_OUTPUT=/private/tmp/drag-fill-preview-results.json node docs/research/drag-fill-spike/runner.mjs
```

The browser runner starts a dedicated Vite server on port 5297, uses no API server or database, saves results incrementally, and closes its browsers/server on exit. `FILL_SPIKE_PORT`, `FILL_SPIKE_ROOT`, and `FILL_SPIKE_OUTPUT` override those locations. Each browser call has a 60-second cap, each case a 120-second cap, and each worker request a 1,000-ms cap. This transport probe uses per-request deadlines; the product's proposed single deadline across all expansions still needs implementation coverage.

The initial isolated baseline ran from `apps/frontend`:

```sh
node node_modules/vitest/vitest.mjs run src/sticker-creation/canvas/fill.test.ts src/sticker-creation/layers/layerInk.test.ts src/sticker-creation/canvas/gestures.test.ts
```

Result: 3 files passed, 93 tests passed. Preparatory harness startup failures involving a CommonJS import and an unresolved workspace dependency were corrected before the measured runs. The final browser run exited 0 with no correctness, page, or console failures. No product tests were changed.

Full timing observations are in `results.json`; the earlier offscreen experiment is in `results-offscreen.json`. The replacement preview and repeated fill correctness observations are in `preview-results.json`; that runner exited 0 with no correctness, page, or console failures. The preserved, formatted harness was also rerun from the primary workspace at commit `80a87b2dabf57a6b23a2389d9bcbf9154c938063` in correctness-only mode: `reproduction-results.json` records both browsers passing all six fill and five preview cases with no page or console failures. The imported fill, recognizer, frame, layer, display, and limit files were unchanged between the two commits. Source files are `probe.ts`, `previewProbe.ts`, `worker.ts`, `runner.mjs`, and `index.html`; asserted touch traces are in `touch-results.jsonl`, generated by `touchProbe.ts` and repeated successfully after preservation.
