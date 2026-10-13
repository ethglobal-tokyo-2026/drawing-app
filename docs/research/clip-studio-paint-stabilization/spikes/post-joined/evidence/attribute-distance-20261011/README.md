# Cross-engine attribute-distance diagnosis

The deployed `d229c59e78da40497e6f467d34b68533f7cf5469` adapter's two `Math.hypot` calls explain the saved WebKit width discrepancy. This is Croquis width/time transfer after the recovered geometry calculation.

`report.json` retains the input report hash, deployed source hash, probe hash, every input difference, every segment/cumulative distance, and every returned binary64 value. The script reads the original adapter and validator from that exact Git commit, removes TypeScript annotations with Node's parser, and evaluates the same function bodies in fresh Node 24.21.0, Chromium 155.0.8059.12, and WebKit 26.6 processes. Browser pages remain blank; this probe makes no application or native-process requests.

Reproduce from the repository root:

```sh
node docs/research/clip-studio-paint-stabilization/spikes/post-joined/scripts/compare-attribute-distance.mjs
```

The script has a 60-second deadline and 15-second browser launch deadlines. The first sandboxed Chromium launch was denied by macOS process isolation; `sandbox-launch-failure.json` preserves that result. The successful rerun used approved process permissions.

## Observed cause

Node and Chromium agree on all original calculations. WebKit's original `Math.hypot` differs by one ULP on three of the five source segments. It also differs on five of eight corrected segments in the light case, and three of four corrected segments in the firm case. These differences affect the accumulated distances and the width interpolation fraction.

The original adapter reproduced the saved light-case WebKit result exactly. Its only final differences from Node are:

| Zero-based flat index | Field | WebKit minus Node |
| --- | --- | --- |
| 10 | Width | +1 ULP; +4.440892098500626e-16 |
| 14 | Width | +1 ULP; +4.440892098500626e-16 |
| 18 | Width | +1 ULP; +4.440892098500626e-16 |
| 26 | Width | -1 ULP; -8.881784197001252e-16 |

All 18 light-case coordinates, all nine times, and both endpoint widths agree. The firm case's original returned values agree despite its intermediate distance differences. The original production smoke stopped after the light failure; this separate probe supplies the firm adapter comparison.

## Isolated replacement

The second calculation changes only the two adapter calls to this fixed-order, scaled norm:

```js
const scale = Math.max(Math.abs(dx), Math.abs(dy));
if (scale === 0 || !Number.isFinite(scale)) return scale;
const x = dx / scale;
const y = dy / scale;
return scale * Math.sqrt(x * x + y * y);
```

With that replacement, all 22 segment distances, all 22 cumulative distances, and all 56 returned fields across the two cases match exactly in all three runtimes. The returned values also match the original Node results for both cases. No coordinates or recovered native equations are changed by this substitution.

ECMAScript permits implementation-dependent approximation for `Math.hypot`; the explicit arithmetic avoids that particular variation while scaling before squaring. See https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.hypot and https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sqrt. Returning a nonfinite scale retains the existing adapter length-validation failure when finite coordinates subtract to an infinite difference.

This probe proves the cause and proposed replacement for these saved inputs. It does not establish all-browser/all-input arithmetic equivalence, pen feel, or native brush rendering. Production changes and larger/smaller-coordinate regression tests are owned by the release task; this investigation changed no production files.
