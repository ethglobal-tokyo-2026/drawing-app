# Holo foil's warm hues

**Goal:** the holo backing foil shows its warm Foil hues (peach, lemon) beside its cool ones (aqua, sky, lilac) on every band at every pose, as DESIGN.md's Foil colors describe. It must never show green or a white band, and pink foil must stay pink.

**Why:**

- **The wavelength mapping:** `apps/frontend/scripts/generateFoilLookup.ts` maps wavelengths to the six palette slots with `phase = (λ − 380) / 400 · 6 + 2.5`. That puts the slots out of rainbow order and pushes the warm ones to the spectrum's dim red end:

  | Slot | aqua | sky | lilac | pink | peach | lemon |
  | ---- | ---- | --- | ----- | ---- | ----- | ----- |
  | nm   | 413  | 480 | 547   | 613  | 680   | 747   |

- **Brightness:** brightness follows the eye's sensitivity, so peach and lemon come out too dim to read. Today's bands show pink, lilac and sky only. Main was the same before the shared light.
- **The `+2.5` offset** was chosen to hide the neutral lemon-to-aqua bridge at the dim ends, so the spectrum's bright middle didn't wash out to white.

**Where it lives:**

- `generateFoilLookup.ts` (`pnpm --filter frontend foil-lookup`) writes `src/stickers/foilLookupBasis.json`: 512 values of `u` (−2…2) × 32 values of sigma. Each entry holds six palette weights plus an energy channel.
- `foilMaterial.ts` mixes the basis with a style's six palette colors. Holo uses pink, peach, lemon, aqua, sky and lilac; **pink foil uses its own pinks over the same basis**.
- `foilShader.ts` samples it:
  - in `foilDiffraction` (orders at `u = order·λ/1400`, plus holo's sweep `.22·sin(3·polar)`);
  - in `foilRoomOrders` (holo's colored floor, `u = .62 + .26·sin(…)`).
- `foilAllowedHue` grays true green.
- `docs/research/sticker-foil/material-reference.ts` is the independent reference the foil e2e (`e2e/stickerFoil.e2e.ts`) integrates against.

## Acceptance (measured, never eyeballed)

At β 0, 30, 55, 75, 90 and 110, and γ ±25 at β 55, on phone portrait and iPad landscape, in Chromium and WebKit:

1. Every holo band on the 21-sticker board, and the detail ring, shows at least one warm hue (peach or lemon) and one cool hue (aqua, sky or lilac). A hue counts at 1% or more of the band's pixels at chroma ≥ 24.
2. No green: 0 band pixels in the green hue range at chroma ≥ 24.
3. No white band: near-white pixels (luma ≥ 235, chroma < 12) stay within main's share of the band, plus 5 points. Main's share is measured first.
4. Pink foil: HLS saturation ≥ 0.6, with its hue in the pink range at every pose.
5. Holds from the shared light:
   - the detail ring is ≥ 55% colorful;
   - Kyoto Seika foil is unchanged;
   - paper and glare are unchanged;
   - the lookup texture keeps its size, so the GPU cost is unchanged.
6. **On a real phone, in LINE** (ad0ll's device, through the developer slip's performance recorder, read back from `/api/logs`):
   - the material's GPU cost while tilting and while dragging a sticker, against the shared light's numbers;
   - redraws as LINE's toolbar collapses and fires `resize`.

## Spike (each lane answers one question, from main `3b771601`; nothing merges)

- [ ] **H, the harness:** a render-and-measure script that every lane shares.
  - It renders the pose matrix on the e2e foil fixtures (holo and pink detail) and the 21-sticker board.
  - It writes `metrics.json` (acceptance 1–4 per band and pose) and a contact sheet.
  - It measures main first, as the baseline.
- [ ] **R, research:** how established holographic and iridescent foil renderers map a spectrum, or a grating's orders, to colors, and how they keep green out without a white bridge. With URLs.
- [ ] **A1, rainbow order with a neutral bridge:** lilac ≈ 420 nm, sky ≈ 460, aqua ≈ 490, a neutral bridge over green, lemon ≈ 575, peach ≈ 600, pink ≈ 630. Does the bridge read as a white band?
- [ ] **A2, rainbow order with green split:** green is split between aqua and lemon (no grey), or notched dark. Which keeps the band colored without a white band?
- [ ] **A3, the warm slots brought into reach:** keep the basis, and change the grating period, holo's sweep or the floor's `u` range so the poses reach the warm slots.
- [ ] **A4, holo-only basis with per-slot anchors:** warm slots get wide, bright bands across 560–630 nm. Holo gets its own basis and pink keeps today's.
- [ ] **A5, warm lamps in the room:** warm-colored lamps fixed in the shared room light holo's orders warm, over today's basis. This is the fallback.

## Decision, then build

- **Compare:** set the lanes' metrics and sheets side by side, and run impeccable's critique on the best one or two.
- **Approval:** ad0ll approves the approach.
- **Build:**
  - the generator and basis;
  - the shader;
  - `material-reference.ts` and the foil e2e;
  - the pose matrix and acceptance;
  - critique, merge and deploy.
