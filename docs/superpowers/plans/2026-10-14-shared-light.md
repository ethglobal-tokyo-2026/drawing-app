# One light, one viewpoint: follow-ups

The shared light shipped. Every sticker material reflects one room from one viewpoint:

- **The room:** a shoji screen above and behind the viewer, fixed to gravity.
- **The pose:** the light publishes the device's absolute pose, starting at the reading angle (β 55°).
- **Creases** are lit from the static top left.

Its round 3 impeccable critique scored 15/20, Good with no P1s. `docs/research/sticker-laminate/README.md` describes the model.

## Follow-ups

- [ ] **Holo's warm hues (ad0ll: after shipping, its own lane):** peach, lemon and aqua never show, on main before this too. `scripts/generateFoilLookup.ts` puts them at the dim red end of the lookup. Two Foil hues per board band is still mostly unmet: bands show one, sometimes two.
- [ ] **Crease bakes:** with the light fixed at the top left, only the base and topLeft crease images can show. The crease worker still bakes the other three sides, and `StickerCrease` decodes all five per crease. Bake and load only the two, and drop the blend.
- [ ] **The release fix's flat-snapshot batch** (`stickerRendererGpu.ts`) may be unneeded now that tiles sit at even atlas places. Its comment says atlas places round differently, which is no longer true.
- [ ] **DESIGN.md's One Light Rule:** it says the crease shading reads the shared material pose (no longer true), and doesn't mention the viewpoint or gravity. The wording goes to ad0ll.
- [ ] **Gloss lying flat (ad0ll: revisit later):** iPads lie flat on a desk while people draw and seal, and nothing shows laminate there. A small ceiling lamp that only a flat device mirrors would.
- [ ] **On a real phone, in LINE:** check through the performance recorder:
  - the shader's GPU cost, especially the dragged sticker's per-frame redraw;
  - redraws as LINE's toolbar collapses and fires `resize`.
