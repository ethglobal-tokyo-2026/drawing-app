# Holo foil's warm hues

**Goal:** the holo backing foil shows its warm Foil hues (peach, lemon) beside its cool ones (aqua, sky, lilac) on every band at every pose, as DESIGN.md's Foil colors describe. It must never show green or a white band, and pink foil must stay pink.

**Status:** approach chosen (ad0ll, 2026-10-15): A3's warm floor plus the cool floor's aqua rest point. Built as one commit on branch `holo-hues`, not merged. Paused while the shared light's behavior shipped.

**Why the warm hues were missing:**

- **The wavelength mapping:** `apps/frontend/scripts/generateFoilLookup.ts` maps wavelengths to the palette slots with `phase = (λ − 380) / 400 · 6 + 2.5`. The warm slots sit at the spectrum's dim red end:

  | Slot | aqua | sky | lilac | pink | peach | lemon |
  | ---- | ---- | --- | ----- | ---- | ----- | ----- |
  | nm   | 413  | 480 | 547   | 613  | 680   | 747   |

- **Brightness:** brightness follows the eye's sensitivity, so peach and lemon are too dim to read where the lamps' orders land.

**Where it lives:**

- `generateFoilLookup.ts` (`pnpm --filter frontend foil-lookup`) writes `src/stickers/foilLookupBasis.json`. `foilMaterial.ts` mixes it with a style's palette; pink foil uses its own pinks over the same basis.
- `foilShader.ts` samples it in `foilDiffraction` (the lamps' and window's orders) and `foilRoomOrders` (holo's colored floor, the only part the chosen approach changes).
- `docs/research/sticker-foil/material-reference.ts` is the independent reference the foil e2e integrates against.

## The change on `holo-hues`

In `foilRoomOrders` only:

- The floor reads the lookup's second order, which runs sky → lilac → pink → peach → amber (A3).
- It uses the lookup's sharpest row and rests at the second order's aqua for part of each sweep, lifted up to 1.5× there.
- **Fallback, if the aqua rest reads as a flat stripe or the lift as a brightness step:** the sharpest row with `u` at .865 ± .25 and no rest point. That gives sky on every band but rarer aqua.

## Before merging

- [ ] **Harness settle wait.** Under the world-fixed viewer, wait until the light hasn't published for 1.5 s. Then measure acceptance 1–5a in both engines, plus the strict green count (green beating red and blue by more than 2).
- [ ] **Guard test.** Extend `e2e/stickerFoil.e2e.ts`'s holo color test to require warm and cool pixels. The fixture renders at polar 0, so render each pose at several polars around the band. Confirm it fails with main's floor (`.62 + .26·sin`). The first draft is in `data/scratch/holo-warm/holo-guard-test-wip.patch`.
- [ ] **Critique.** Compare the aqua rest point with the fallback, then the foil e2e in both engines.
- [ ] **Real phone, in LINE,** through the developer slip's performance recorder: the material's GPU cost while tilting and dragging, and the look in motion.

## Acceptance (measured, never eyeballed)

At β 0, 30, 47, 55, 75, 90 and 110, and γ ±25 at β 47, on phone and iPad, in Chromium and WebKit:

1. Every holo band on the 21-sticker board, and the detail ring, shows a warm hue (peach or lemon) and a cool one (aqua, sky or lilac). A hue counts at 1% or more of the band's pixels at chroma ≥ 24.
2. No green.
3. No white band: near-white pixels (luma ≥ 235, chroma < 12) stay within main's share of the band, plus 5 points.
4. Pink foil and Kyoto Seika foil are unchanged.
5. The detail ring is ≥ 55% colorful, and the lookup texture keeps its size.

## What the spikes found

- **Remapping the spectrum fails:**
  - a rainbow order with a neutral bridge shows no warm hue at all;
  - a notch in the green leaves a grey gap and green-leaning pixels;
  - a holo-only basis is led by peach and adds 65 KB;
  - warm lamps read as a red tint.
- **The bright flare can't turn warm through brightness.** A flat brightness curve leaves the lamps' orders lilac, sky and pink. Their first order lands at `u` .2–.45 (aqua to pink), and the shader's σ ≥ .08 blurs about 112 nm. A warm flare would need the lamps moved, or a finer grating for them.
- **Aqua on every band needs a holo-only basis change.** In today's basis, aqua is a thin sliver at `u` .61–.64, beside the grey bridge.
