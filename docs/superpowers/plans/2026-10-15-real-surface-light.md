# Real-surface light: what's left

The board behaves like real stickers under one real room. The light follows the hand, tremor included. Creases and drop shadows follow the room's light, and a light reflects at every pose. `docs/research/sticker-laminate/README.md` describes the model; DESIGN.md's One Light Rule and depth rules carry the approved wording.

## Platform limits

- **Android** (Chromium, and LINE's Android WebView): `deviceorientation` fires only after an angle moves 0.1°, which is 6.6 px of reflection. Slow tilts arrive in steps, and tremor under 0.1° never reaches the page. iOS and iPadOS have no threshold.
- **LINE's in-app browser on iPad:** the screen angle is unverified on a device. The performance recorder's orientation lines show it.

## Left

- [ ] **Next: each foil's metal and the room's bounce light** (ad0ll: subtle, worth doing right after this version). Research and a spike first, as for the light.
  - Gold warms the bounce it reflects, silver keeps it neutral, rose gold tints it, and holo diffracts it.
  - Today the bounce is one neutral level for every foil.
- [ ] **ad0ll's device check, in LINE, on iPad and phone, with the performance recorder on.**
  - Motion: the reflection follows the hand, steps never show, and the screen angle reads right.
  - Strengths, judged by feel: crease shading (`CREASE_SHADING`), the key shadow's elevations, the lights' positions and brightness, the foil's shine, and the dip near β 30.
  - Cost: the batch note now breaks a publish into layout, submit, copies and the work after them.
  - Holo's warm hues, in motion.
- [ ] **Lying flat:** crease lighting doesn't flip (the shoji and the lit wall cancel). Revisit after the device check; ad0ll suggested a light in front of the viewer as well as behind.
- [ ] **Static shadows left:** the photo sticker, gift bag, give sheet pick, gift received notice and receive dialog are plain images with the old top-left cast. The tray's shadows are unchecked.
- [ ] **Cost, if the device check shows a problem.** In Chromium, a redraw costs 0.9 ms of main thread at full speed and 5.9 ms at 4× throttle. About 40% of that is layout reads and about 25% copies. Levers: cache each sticker's layout between publishes, and skip the work after the copies when only the light changed.
