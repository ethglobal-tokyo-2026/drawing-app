# One light, one viewpoint

**Goal:** the sticker material shows one light in one room, seen from one viewpoint: a single soft reflection that sweeps across everything on screen as the device tilts, instead of a copy of the window on every sticker.

**Why:** `stickerShader.ts` computes each sticker's view from its own center (`view = normalize(vec3(-point, 2.4))`, `point` in that sticker's own size), and the pose is relative to the first sensor reading (`relativeTiltPose`). Every sticker therefore mirrors the window at the same spot, and the room ignores gravity.

## Brief (impeccable shape and critique; ad0ll's choices marked)

1. **One viewpoint.** One eye in front of the screen's center, at a fixed physical distance (assumed ≈32 cm, about 1900 CSS px; unverified guess, tune by eye). Every material surface on screen (board, tray sheets, detail, flights, Shop previews) reflects according to where it sits on screen.
   - From β ≈ 45° up, the eye sits on the screen's axis.
   - As the device lies flat, it moves toward 50–60° above the bottom edge, where people look from. A flat device then mirrors the room beyond its top edge, not the ceiling straight above.
2. **One room, fixed to gravity.** The device's absolute tilt (DeviceOrientation beta and gamma) orients the room; compass heading is ignored. The viewer faces the screen, so the room's "behind the viewer" follows the device's facing.
3. **The light is a shoji screen (ad0ll):**
   - **What it is:** a large washi screen above and behind the viewer, a little to the left. It's the same light the static shadows fall from (DESIGN.md: top left).
   - **How it looks:** soft light through the paper, with the lattice crisp in its reflection, so gloss reads as gloss even where the patch is faint.
   - **Where it shows:** its reflection is a broad patch over several stickers. It lands on the board, not just its top edge, at the still pose, and slides off as the device tilts.
4. **Bounce:**
   - **The room:** a ceiling, the wall the screen lights, a horizon and a floor, each dimmer than the one before. Not a bare gradient.
   - **Gloss** mirrors the room faintly and the screen strongly.
   - **Foil,** a metal, mirrors the room strongly.
   - **Holo** is most colorful away from the reflection, as real holo foil is: at least two Foil hues on every band at every pose from β 0° to 110°. Pink stays pink.
5. **Poses** (physically, for a ~45° light):
   - Upright: the screen is above the reflection; only the room's bounce.
   - Usual reading angle (~55° from flat): the screen's reflection sits on the upper board.
   - Tilted back: it crosses the middle.
   - Flat: the lit wall beyond the top edge.
   - Facing away or down: the floor, dim.
6. **Still pose (ad0ll: the usual reading angle):** with no motion permission, permission declined, reduced motion or a hidden page, the light assumes β 55° and holds there. The desktop fallback sweeps around it.
7. **Paper never clips:** a highlight shoulder keeps the print legible under the brightest reflection.
8. **Creases stay lit from the top left (ad0ll),** agreeing with every drop shadow; they no longer shift with tilt. Only reflections follow the room. Static CSS shadows and controls are unchanged (No Gloss Rule).
9. **Anti-goals:**
   - per-sticker highlights;
   - idle drift or sway after the device stops;
   - light moved by a pointer;
   - an always-on fake highlight.
10. **Motion:**
    - A dragged sticker's reflection updates as it moves.
    - A scrolled surface redraws when scrolling stops.
    - Flyers keep their copied pixels.
    - Positions are read once per drawn frame, from a layout the light's frame doesn't dirty.
11. **DESIGN.md:** the One Light Rule will need to mention the viewpoint and gravity. The wording goes to ad0ll once the look is approved; lanes don't edit it.

## Physics (device frame: x right, y toward the top, z out of the screen toward the viewer)

- **Up**, from DeviceOrientation: `up = (−cos β·sin γ, sin β, cos β·cos γ)`. Rotate x and y into screen axes by the screen orientation angle.
- **Toward the viewer, horizontally:** `h = normalize(H(z) + w·H(−y))`, where `H(v) = v − (v·up)·up`. `H(−y)` carries a flat device, whose viewer sits at the bottom edge; past upright (β > 90°), lean on `H(z)`.
- **Left:** from up and h.
- **Light:** `L = normalize(cos e·(cos a·h + sin a·left) + sin e·up)`, with elevation e and azimuth a tuned so the still pose lands the screen's reflection on the upper board. The critique's starting guesses are e ≈ 38–40° and a ≈ 10–12°.
- **Per fragment:** `p` = the sticker's center on screen + its on-screen scale × its turned local point, in CSS px from the screen's center. `view = normalize(eye − p)`, with the eye from brief item 1. The reflected direction looks up the world room, using `dot(r, up)` for elevation and `r` against `L` for the screen.
- **Normals** stay fixed to the sticker. Only the room turns with the device.

## Verification

- **Pose matrix:**
  - β 0, 30, 55, 75, 90 and 110, plus γ ±25 at β 55;
  - phone portrait at 390×844, iPad landscape;
  - the 21-sticker board (`e2e/stickerBoardDrag.html?variant=mixed-21`) and a sticker detail;
  - Chromium and WebKit;
  - side by side with main at rest.
- **Critique:** each round is critiqued with impeccable. Round 1 scored 13/20 (Acceptable), with two P1s (grey holo; gloss at the still pose) and three P2s (flat viewpoint, washout, creases).
- **Performance:** the 21-sticker board tilt and drag at 4× CPU throttle, against main.
- **Real device:** a phone check in LINE through the performance recorder.

## Lanes

- [x] **A. Prototype and pose matrix (spike):** branch `shared-light-spike`, d7b0a9d5; critiqued.
- [ ] **A2. Second round on the spike:** the shoji screen, holo off the reflection, the flat viewpoint, the paper shoulder and top-left creases; the pose matrix again; re-critique.
- [ ] **B. Light:** `light.ts` publishes the absolute up vector, smoothed, with the still pose and the fallback; creases stay top-left; unit tests.
- [ ] **C. Renderer:** per-surface screen positions, drag and scroll redraws, flights, the Shop; e2e updates; performance check.
