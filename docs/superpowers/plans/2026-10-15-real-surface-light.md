# Real-surface light: one light

The board behaves like real stickers under one real room: the light follows the hand, tremor included, and creases and drop shadows follow the room's light. On ad0ll's iPad (6fa74f2b), three things were wrong.

**What ad0ll saw:**

- **Three separate lights:** the shoji, a ceiling lamp seen lying flat, and a marumado seen near upright and at about 30° of tilt.
- **A "plus symbol":** the shoji's kumiko lattice, whose cells reflect larger than many stickers.
- **No visible crease shadows:**
  - a 2.5° slope;
  - 60% fill;
  - the marumado lighting creases from the front.

  Upright, the bottom slope was only 1.9% darker.

- **No visible drop shadows:** 2 px of elevation.

**Research and the spike** (`data/scratch/light-diagnosis/`, `data/scratch/one-light/`, branch `one-light-spike` at ca70faee): a real room has one light and about 25–35% fill, and real draped stickers have 8–30° slopes. The spike's variant c, built from that, gives one light across the whole sweep and readable art. Bottom slopes against top, at physical strength: 11% darker upright, 17% at β 105, 3% at the reading pose.

## Decisions (ad0ll, 2026-10-15)

1. **One light:** a round, soft ceiling light about 22° across, above and behind the viewer, a little left, about 17° above the still pose's normal.
   - Its halo stays.
   - No lattice, no extra lamps.
   - Its reflection shows only in a band of tilts, as a real one does. Shading and shadows respond everywhere.
2. **Fill is about 30% of the light,** and the floor is about as bright as the walls, as under a ceiling light.
3. **The paper follows the light slightly:** clamp((E/E_still)^0.4, 0.85, 1.0), all named constants.
   - Build it so it can be made fuller later: the board can dim by the same factor through a compositor-only overlay, with its share at 0 for now.
4. **Foil's diffraction lamps go** (`ROOM.lamps`). Holo's colors come from the one light and the room's bounce; the holo harness must still pass.
5. **Creases are steepened ×3 in the shader,** about 2.5° → 7.5°, a gentle real drape, at physical strength (`CREASE_SHADING` 1). The gloss breaks at creases too.
6. **A crease's step casts a short contact shadow** away from the light: length h·cot e, capped near 3 px. A fold darkening at the foot stays.
7. **Drop shadows sit at a real sticker's thickness,** about 1 CSS px, with a 1 px ambient contact shadow. The elevation is a named constant, to tune by feel.
8. **Lying flat, crease lighting flips** (+4%). That's accepted for now; revisit after the device check.

## Build (each lane owns its files)

- **A, the one light** (`sharedRoom.ts`'s light and bounces, `roomShader.ts`, `roomIrradiance.ts`, `laminateShader.ts`'s flash, `stickerRendererGpu.ts`'s room uniforms): decisions 1–2.
  - Delete `ROOM.lights`, `roomRound` and the lattice.
  - `roomFrame(pose).light` stays the one light's direction.
- **B, foil** (`foilShader.ts`, `foilMaterial.ts`, `ROOM.lamps`, `ROOM.foilBounce`), after A: decision 4. The foil's source samples follow the disc. Retune foil's bounce, and run the holo harness.
- **C, creases steeper** (`stickerShader.ts`'s normal decode): decision 5.
- **D, the step's contact shadow** (the crease bake and the shader): decision 6. The drape's height goes in the normal texture's alpha, and the shader marches a few samples toward the light.
- **E, paper light** (`stickerShader.ts`'s paper term, a board overlay): decision 3.
- **F, drop shadows** (`keyShadow.ts`, sticker CSS, tokens): decision 7.
- **G, tests and docs,** after the others:
  - the sweeps track the one light's glare, since there's no lattice now;
  - `sharedRoom.test`, `keyShadow.test`, `creaseLight`;
  - the README's room section.
- **Checks before deploy:**
  - every light, crease, laminate, foil and shadow e2e, in both engines;
  - the holo harness;
  - a critique on the 21-sticker board;
  - ad0ll's device check.

## Left after this

- **Each foil's metal and the room's bounce** (ad0ll: right after this version): gold warms the bounce it reflects, silver keeps it neutral, rose gold tints it, holo diffracts it. Research and a spike first.
- **ad0ll's device check in LINE, on iPad and phone, with the recorder on:** motion, the screen angle, and the strengths, by feel.
- **Static shadows left:** the photo sticker, gift bag, give sheet pick, gift received notice and receive dialog. The tray is unchecked.
- **Cost, if the device check shows a problem:** cache each sticker's layout between publishes, and skip the work after the copies when only the light changed.

## Platform limits

- **Android (Chromium, and LINE's Android WebView):** `deviceorientation` fires only after a 0.1° change, so slow tilts step and fine tremor is lost. iOS has no threshold.
- **LINE's in-app browser on iPad:** the screen angle is unverified on a device.
