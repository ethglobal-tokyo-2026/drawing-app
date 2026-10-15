# Shared light: follow-ups

The world-fixed viewer shipped (3dea75b6). The room and the viewer stay put while the hand turns the device:

- tilts slide the reflection as a mirror does;
- a steering-wheel turn rotates it;
- the viewer re-centers past a 25° turn.

The e2e sweeps (`stickerLightSweeps`, `stickerLightRotations`) cover every orientation on iPad, iPhone and Android. These are left.

- [ ] **Check on ad0ll's iPad, in LINE.**
  - The performance recorder's orientation lines show the angle the light used beside the browser's own `window.orientation` and `screen.orientation`.
  - Confirm LINE's in-app browser on iPad gives the angle Safari does.
- [ ] **Square the shoji.**
  - `roomFrame`'s `across` is −left projected perpendicular to the light, so with the shoji 6° off-axis the lattice sits about 2.8° off level. A review judged that visible on iPad-size stickers.
  - Making `across` level alone swings the vertical bars about 4–5° off plumb, so build both axes from the world's horizontal in the light's plane.
  - Then re-run the sweeps and expect the lattice near 0°.
- [ ] **Bound re-centering's redraws.**
  - Past the release, the viewer glides with a 2 s time constant down to the 0.5° step, publishing every 0.25°. A model of the loop, not measured on a device, puts a past-release posture change at about 8 s of whole-board redraws, against 0.7 s before.
  - A slow heading turn, such as turning in a chair, redraws every frame.
  - Ease onto the device over a fixed time of about 1 s, then land. Measure in Chromium and on the iPad through the recorder.
- [ ] **The glare's window.** At γ 0 the glare is on the sticker only for β about 30–55, and past it the sticker shows only a faint bounce gradient, so leaving the window can read as the light going out. Judge with ad0ll on the 21-sticker board whether to widen the halo or the bounce, and check there that the halo never grays the ink.
- [ ] **The foil's moving shine.**
  - ad0ll wants holo's hue bands kept all the way around, a bright patch where the light falls that fades into darker metal and glides with tilt, and pink's deep-rose side back.
  - Round 3 is commit 6d0341a1 on branch `foil-shine-3`, not merged. It scored 13/20 against a bar of 15, and e2e passes.
    - What's left: holo shows no patch, because darkening alone doesn't read on pastels and it needs light added at the patch. Pink goes wine-dark when upright. The two foils swing by different amounts for the same light.
  - Questions for ad0ll:
    - Should pink keep a floor that stays recognizably pink when upright, since it marks an NSFW sticker?
    - Should holo's patch add light, or only darken the metal away from it?
