# One light, one viewpoint

**Goal:** the sticker material shows one light in one room, seen from one viewpoint: a single soft reflection that sweeps across everything on screen as the device tilts, instead of a copy of the window on every sticker.

**Why:** `stickerShader.ts` computes each sticker's view from its own center (`view = normalize(vec3(-point, 2.4))`, `point` in that sticker's own size), and the pose is relative to the first sensor reading (`relativeTiltPose`). Every sticker therefore mirrors the window at the same spot, and the room ignores gravity.

## Brief (impeccable shape; ad0ll chose the still pose and the light's size)

1. **One viewpoint.** One eye in front of the screen's center, on its axis, at a fixed physical distance (assumed ≈32 cm, about 1900 CSS px; unverified guess, tune by eye). Every material surface on screen (board, tray sheets, detail, flights, Shop previews) reflects according to where it sits on screen.
2. **One room, fixed to gravity.** The device's absolute tilt (DeviceOrientation beta and gamma) orients the room; compass heading is ignored. The viewer faces the screen, so the room's "behind the viewer" follows the device's facing.
3. **The light:** a large soft window above and behind the viewer, a little to the left, the same light the static shadows fall from (DESIGN.md: top left). Its reflection is a broad patch over several stickers that shows across the usual holding angles and slides off as the device tilts.
4. **Bounce:** a ceiling brighter than the walls, and walls brighter than the floor. Gloss mirrors the room faintly and the window strongly; foil, a metal, mirrors the room strongly, bright toward the ceiling and dimmer toward the floor, never dead grey at usual angles.
5. **Poses** (physically, for a ~45° light):
   - Upright: the window is above the reflection; only the room's bounce.
   - Usual reading angle (~55° from flat): the window's reflection sits near the top.
   - Tilted back: it crosses the middle.
   - Flat: ceiling glow, window low or off.
   - Facing away or down: the floor, dim.
6. **Still pose:** with no motion permission, permission declined, reduced motion or a hidden page, the light assumes the usual reading angle and holds there. The desktop fallback sweeps around it.
7. **Creases** take their lit side from the same light's direction on screen. Static CSS shadows and controls are unchanged (No Gloss Rule).
8. **Anti-goals:**
   - per-sticker highlights;
   - idle drift or sway after the device stops;
   - light moved by a pointer;
   - an always-on fake highlight.
9. **Motion:**
   - A dragged sticker's reflection updates as it moves.
   - A scrolled surface redraws when scrolling stops.
   - Flyers keep their copied pixels.
   - Positions are read once per drawn frame, from a layout the light's frame doesn't dirty.
10. **DESIGN.md:** the One Light Rule will need to mention the viewpoint and gravity. The wording goes to ad0ll once the look is approved; lanes don't edit it.

## Physics (device frame: x right, y toward the top, z out of the screen toward the viewer)

- **Up**, from DeviceOrientation: `up = (−cos β·sin γ, sin β, cos β·cos γ)`. Rotate x and y into screen axes by the screen orientation angle.
- **Toward the viewer, horizontally:** `h = normalize(H(z) + w·H(−y))`, where `H(v) = v − (v·up)·up`. `H(−y)` carries a flat device, whose viewer sits at the bottom edge; past upright (β > 90°), lean on `H(z)`.
- **Left:** from up and h.
- **Light:** `L = normalize(cos e·(cos a·h + sin a·left) + sin e·up)`, with elevation e chosen so the still pose (β ≈ 55°) puts the window near the top, and a ≈ 20° left. The window's extent and softness are tuned by eye.
- **Per fragment:** `p` = the sticker's center on screen + its on-screen scale × its turned local point, in CSS px from the screen's center. `view = normalize(vec3(−p, D))`. The reflected direction looks up the world room, using `dot(r, up)` for elevation and `r` against `L` for the window.
- **Normals** stay fixed to the sticker. Only the room turns with the device.

## Verification

- **Pose matrix:**
  - β 0, 30, 55, 75, 90 and 110, plus γ ±25 at β 55;
  - phone portrait at 390×844, iPad landscape;
  - the 21-sticker board (`stickerBoardDrag.html?variant=mixed-21`) and a sticker detail;
  - Chromium and WebKit;
  - side by side with main at rest.
- **Performance:** the 21-sticker board tilt and drag at 4× CPU throttle, against main.
- **Real device:** a phone check in LINE through the performance recorder.

## Lanes

- [ ] **A. Prototype and pose matrix (spike):** shader and renderer path behind a test hook that sets beta, gamma and the screen angle; contact sheets; impeccable critique.
- [ ] **B. Light:** `light.ts` publishes the absolute up vector, smoothed, with the still pose and the fallback; it feeds creases' `--lx` and `--ly`; unit tests.
- [ ] **C. Renderer:** per-surface screen positions, drag and scroll redraws, flights, the Shop; e2e updates; performance check.
