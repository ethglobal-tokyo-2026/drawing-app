# Exact post-correction performance

The saved ordinary correction case still matches all retained native output fields: **99 input nodes → 304 subdivided nodes → eight spline nodes**. The optimization changes only shared `apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts`; post geometry, traversal, source comparisons, and rounding locations are unchanged.

## Measured cause and change

The initial CPU profile (`baseline.cpuprofile`, summarized in `baseline-summary.json`) shows binary64 decoding and software fused arithmetic dominating the run. The original implementation allocated three DataViews and decoded three BigInts for each fused operation. The profiled replay took 8,132 ms. The explicit 1,000 ms saved-case budget failed at 7,853 ms (`budget-before.json`) before implementation.

The updated helper reuses one synchronous scratch DataView and adds a conservative exact arithmetic path. No ordinary multiplication-plus-addition substitutes for fused arithmetic. Its first saved-case run passed the same budget at 211 ms, with zero native field differences (`budget-after-first.json`). The integer implementation remains the fallback for ambiguous rounding and values outside the safe domain.

## Why the fast arithmetic remains fused

The transform is based on Dekker splitting and Knuth TwoSum, described and implemented in Jonathan Shewchuk's public-domain arithmetic work: https://www.cs.cmu.edu/~quake/robust.html and https://www.cs.cmu.edu/afs/cs/project/quake/public/code/predicates.c. This implementation uses those error-free transformations to certify a result, and falls back instead of deciding a difficult rounding case approximately.

1. Nonzero multiplicands must have magnitudes in `[2^-400, 2^400]`. The addend must be zero or within the same range. Splitting with `2^27 + 1` therefore cannot overflow. The operands' exact components lie on a grid no finer than `2^-452`; their products and all arithmetic residuals lie on a grid no finer than `2^-904`. Intermediate magnitudes stay far below overflow, and nonzero low terms stay normal. This is a deliberately conservative domain.
2. The splitting transform computes `product + productError = a*b` exactly. TwoSum computes `sum + additionError = product+c` exactly.
3. A second TwoSum gives `correction + correctionError = additionError+productError` exactly. A third gives `candidate + candidateError = sum+correction` exactly. Consequently the true fused value is exactly `candidate + candidateError + correctionError`.
4. Compute the rounded residual `candidateError+correctionError`. The candidate's nearest rounding boundary is a representable power of two. If the absolute rounded residual is **strictly less** than that boundary, monotonic round-to-nearest implies that the exact residual is strictly less too. At exact powers of two, use the smaller gap toward zero on both sides, conservatively. Thus the candidate is the unique nearest binary64 result.
5. Equal or larger residuals, zero candidates, extreme operands, and subnormal candidates use the existing BigInt implementation. It retains ties-to-even, cancellation, signed zero, gradual underflow, and finite-product/infinite-addend behavior. NaN payloads and floating-point status flags remain outside the existing scope.

The scratch view is safe because these functions are synchronous, take primitive numbers, invoke no callbacks, and return no aliases to the view.

## Verification

- `fma-before.json`: 122,744 independently executed ARM64 `FMADD` cases match the original helper.
- `fma-after-first.json`: the same inputs and expected-result hashes match the optimized helper.
- `fma-full-significands.json`: 202,744 native cases, including full 53-bit significands, cancellation, halfway sums, exponent boundaries, signed zeros, subnormals, and overflow; zero differences. The deterministic generator and native oracle source are retained. Reports include input, expected-output, implementation, and generator hashes.
- `reference-after.txt`: 183 existing tests passed, including native spline/quadratic/sampling vectors, the full ordinary post fixture, and native live S0/S20 recordings. Two additional unit tests cover cancellation/ties and exponent/signed-zero boundaries in `binary64.test.ts`.

Reproduce the standalone native differential on an ARM64 Mac:

```sh
clang -O2 -ffp-contract=off docs/research/clip-studio-paint-stabilization/spikes/post-performance/fma-oracle.c -o /tmp/csp-post-fma-oracle
node docs/research/clip-studio-paint-stabilization/spikes/post-performance/check-fma.ts /tmp/csp-post-fma-oracle /absolute/new-fma-report.json
node docs/research/clip-studio-paint-stabilization/spikes/post-performance/check-budget.ts /absolute/new-budget-report.json
```

The native process only executes arithmetic; it never attaches to CSP. Its timeout is 20 seconds. All report writes are exclusive and never replace an existing report.

## Browser benchmark and limits

`benchmark.mjs` bundles the same pure pipeline and runs it in isolated Chromium and WebKit test processes. It needs no app server or user browser profile. The first sandboxed launch failed because macOS denied browser process registration; `node-browser-first.json` and its log retain the complete failure. `node-browser-final.json` records the successful run outside that sandbox. Every browser output node, scalar, and endpoint byte matched Node's result exactly.

Apple M5 Max, Node 24.21.0; three repetitions per case:

| Case                      | Node         | Chromium   | WebKit     |
| ------------------------- | ------------ | ---------- | ---------- |
| Saved native 99-node case | 168–211 ms   | 162–177 ms | 261–303 ms |
| Synthetic wave, 32 nodes  | 1.1–1.4 ms   | 1.0–1.3 ms | 1–2 ms     |
| Synthetic wave, 99 nodes  | 3.6–4.7 ms   | 3.3–3.5 ms | 5 ms       |
| Synthetic wave, 240 nodes | 10.5–11.8 ms | 8.2–9.6 ms | 11–12 ms   |

```sh
node docs/research/clip-studio-paint-stabilization/spikes/post-performance/benchmark.mjs /absolute/new-browser-report.json
```

Each correction has a five-second deadline, each benchmark a 30-second cumulative deadline, and each browser a 45-second close guard. Full rows and all repetitions remain in the reports. Synthetic waves are constructed test inputs, not recordings of native source construction. The saved case has large coordinates and substantially more subdivision/source comparisons; node count alone does not predict cost.

These are pure correction timings on one desktop. They exclude source construction, worker transfer, rendering, and UI scheduling, and do not establish iPad, embedded LINE browser, or worst-case latency. A worker and bounded cancellation remain necessary for UI responsiveness. No geometry caches or pipeline changes were needed to remove the measured bottleneck.
