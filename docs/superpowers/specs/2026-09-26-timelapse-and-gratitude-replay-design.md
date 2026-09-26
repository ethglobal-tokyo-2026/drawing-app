# Timelapse and Gratitude Replay: design

**Status:** built 2026-09-27: the timelapse in the sticker detail and the gratitude replay in the Transfer Trail, as designed here, with `hasTimelapse`, `density` and `strokePasses` on the API. DESIGN.md's "Timelapse" and "Gratitude replay" describe them as built. Their strings went into `i18n/strings/` with Japanese, not as "Translation" below planned. Still out of scope: the giver's pink tag, and a Timelapse button on someone else's board. Approved 2026-09-27: ad0ll accepted every recommendation ("I'm going to go ahead and trust with your recommendations"). Designed from `main` at `753aa9f`.

**Sources.** Code references name functions and files rather than line numbers, because `main` moves under this doc; `DRAFTS` = the design drafts' `drawing-app/` directory.

## Decisions (ad0ll, 2026-09-26 and 27)

1. **Timelapse:** a Timelapse button in the sticker detail (the sticker's drill-down) plays how the sticker was drawn.
2. **Gratitude replay:** plays **inline**, in the gratitude card it belongs to, never as a modal.
3. **The timelapse route** exists and is live: `GET /api/stickers/:stickerId/timelapse` answers the stored `TimelapseV1` as JSON, or `404 timelapse_not_found` for a sticker sealed before uploads began.
4. **The gratitude card** is the Transfer Trail's open row, the gratitude card that exists. The giver's pink tag is later work (see "Out of scope").
5. **Replay length:** real time when a combo lasted up to 4s; a longer combo plays on a clock sped up to fit 4s, at most ×2.
6. **The timelapse's frame** is the sticker's final silhouette from the first stroke. Ink outside the cut never shows.
7. **The timelapse's length** scales with how long it was drawn: 2.5–6s.
8. **Reduced motion:** a timelapse's strokes still play; its fills appear at once and its ending is a 150ms fade with no sheen. A gratitude replay plays through the engine's reduced path.

## What exists today

| Piece                                                                   | State                                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Timelapse upload at seal (`sticker-creation/sealing/timelapse.ts`)      | Live. Stickers sealed from 2026-09-26 22:14 JST have one; earlier ones never will.                                         |
| `TimelapseV1`                                                           | One definition, `apps/api/src/stickers/timelapse.ts`, exported through `@drawing-app/api/client`. Lengths in sheet pixels. |
| `GET /api/stickers/:stickerId/timelapse`                                | Live, typed in the app's client as `api.timelapse(stickerId)`. Cached as immutable.                                        |
| Gratitude replay recording (`gratitude/replayRecorder.ts` → `ReplayV1`) | Live: every combo is stored with its replay.                                                                               |
| `GET /api/gratitude/:giftId`, `POST /api/gratitude/:giftId/seen`        | Live; `api.gratitude` and `api.markGratitudeSeen` exist in the client, used only by tests.                                 |
| Transfer Trail's Replay button (`sticker-board/TransferTrail.tsx`)      | Drawn only when `onReplay` is passed; `StickerDetail` doesn't pass it.                                                     |
| The giver's pink tag (DESIGN.md, "After")                               | Not built. The API has what it needs: `Me.unseenGratitudeCount` and `GET /api/gratitude/unseen`.                           |
| Any player                                                              | None.                                                                                                                      |

---

## Part 1: the gratitude replay

### Where it plays

**The Transfer Trail's open row**, the one gratitude card that already exists: a pink-outlined card with the 40px heart dot, the amount in 27px Figure type, "From @x", and the screen's only Replay pill (`li.transfer-trail__row.is-open`). DESIGN.md already says "The sticker's trail opens the same replay."

Pressing **Replay** grows a stage **inside the card**, between the figure row and the artist's-share line. The amount and heart dot stay above it as the card's header, so the stage reads as the card's own playback, not a new surface. The card is 262–292px wide on 360–390px phones (the detail's 62px strip and 18px padding), so the stage is **the card's inner width (238–268px) × 300px**. The engine's `scale` option (stage width / 390) sizes everything in it: the heart comes out at 140–160px, and the tier lettering, the slam and the pop-ins shrink with it, so オーバーヒート still fits at 238px.

**Sequence:**

1. Tap Replay → the pill becomes **Stop** (Phosphor's Stop), and the card eases open to the stage's height (200ms, height and opacity only).
2. The replay loads (`api.gratitude(giftId)`, fetched on press, not before). While it loads, the stage shows the heart at rest.
3. The combo plays: the timer bar, the amount counting, the multiplier, tiers, pop-ins, mini hearts.
4. **The ending lands in the card:** the heart shrinks into the card's pink heart dot, and the 27px amount pulses once. No receipt, no top band, no X, no sigh.
5. After a beat (600ms) the stage eases shut, and the pill reads **Replay** again.

**Stop** (or Escape while the stage has focus, or paging to another sticker, or the card closing because another row opened) ends the replay at once and shuts the stage.

**The giver's pink tag**, when it's built, mounts the same component in its own card, which expands in place on the board's edge instead of opening a scrim. Its landing is the given sticker's outline. That's a separate piece of work; this design only keeps the component placement-agnostic so the tag can use it (see "Out of scope").

### What it shows, and how faithful it is

It replays **what was recorded**, not a synthesis. (The drafts' `playReplay` makes the replay up from the totals: an eased amount and invented multiplier curves. The app records every touch, so it can do better.)

| Method | Faithfulness                                                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap    | Exact: every touch, its position, whether it counted.                                                                                                                         |
| Shake  | Exact from the shake unlock on. Nothing before the unlock is recorded (sway, jiggle, the tip), and a reversal's strength isn't recorded, so ricochets use a nominal strength. |
| Stroke | Close, not exact: samples are thinned to about 30 per second, and which moves ended a pass isn't recorded. The stroke detector runs again over the samples.                   |

The amount is always right: **the card's figure comes from the stored `gratitude.total`**, never from the replay's HUD. If the replayed record ends with a different total, hits or peak tier than the stored one (a stroke combo can), the HUD snaps to the stored total at the end, and the mismatch is logged with the gift id.

**Pop-in words and particles** aren't reproducible from the seed today: one random stream feeds them and also per-frame jitter and physics, so draws depend on the frame rate. See "Engine changes", item 6.

### Length

A faithful combo runs 1–8s (`durationMs` is capped at 8000), and DESIGN.md says the giver's replay takes **3s**. The combo rules are closed-form in time, so a replay can run on a virtual clock without changing the score:

- Play in real time when `durationMs ≤ 4000`; above that, speed the clock so the combo takes 4s (at most ×2, so an 8s combo takes 4s). The ending is the short landing above, not the live game's endings (昇天's alone runs about 2.4s).
- Web Animations used by the pop-ins and slam get `playbackRate` equal to the clock's speed.

### Data and state

- **Fetch on press:** `useApiQuery("gratitude:" + giftId, (api) => api.gratitude(giftId))`, which answers `{ gratitude, replay, giver, receiver }`.
- **Loading:** the stage shows the resting heart; the pill reads Stop.
- **Failure:** the stage shuts and the card shows one line, "Couldn't load the replay: {reason}. Try again", with the reason from the `ApiError` (`errorMessage`), following the detail's existing load failure.
- **An unknown game config version** (`gratitude.gameConfigVersion` not in `GAME_CONFIG`'s versions) plays with the current config and logs it. The stored figures stay right regardless.
- **Seen:** when the viewer is the giver and `seenByGiverAt` is null, call `api.markGratitudeSeen(giftId)` when the ending starts, and keep the row marked so a second replay doesn't call it again. `toTrailRows` currently drops `seenByGiverAt`; it keeps it. Nothing shows `Me.unseenGratitudeCount` yet, so nothing refreshes; the pink tag will read it fresh. A receiver or a third person never marks it (the API answers them `403 not_giver`).

### Engine changes

All seams are inside `mountMiniGameEngine` (`gratitude/miniGameEngine.ts`); the live game keeps its behavior.

1. **Input source.** A new option: `input: "live"` (today: `listenForTouches`, `listenToPhoneMotion`, key and pointer listeners, the touchmove hold) or `input: { replay }`. In replay mode none of those listeners attach, and neither do the recorder, `onRecord`, the visibility end (hidden/pagehide), the tips or the heart button. The heart is `aria-hidden` and inert.
2. **A pure `gratitude/replay/replayFeed.ts`**, no DOM. It decodes `ReplayV1`'s running sums into one time-ordered queue of touches, stroke samples and shake reversals, in heart-relative coordinates (item 4). It's fully unit-testable.
3. **Dispatch in the frame loop.** `drawFrame` feeds every queued input whose time has come, through the existing handlers, before `combo.advanceTo(now)`:
   - the first touch: the squash, then `firstTap`; later touches `tapHeart`;
   - stroke samples: `onStrokeStart`, `onStrokeMove`, `onStrokeEnd`;
   - the first reversal: `unlockShake`; later ones the shaking branch of `onMotion`, at the nominal strength.
   - End reasons: `empty` and `cap` end by themselves; `hidden` and `closed` end with `combo.endCombo(t0 + durationMs, reason)`. Stored replays can also say `sent` (the one-tap send, removed in `14f73a7`); the feed plays those as a one-hit combo ending at `durationMs`.
4. **Positions relative to the heart.** A replay's positions are shares of the recording phone's stage (`replay.stage`, e.g. 390×741). Mapped as shares onto a 268×300 stage, touches would miss the heart. The feed rebuilds the recording's heart box from `replay.stage` with the live layout rules, expresses each point in heart widths from the heart's middle, and maps it onto the replay's heart.
5. **Layout and scale options.** `TOP`, `HUD_TOP`, `HUD_HEIGHT`, the fallback size and `layoutFor` become options, with a landing point (`landAt()`) in place of `giverPhoto`. A `scale` option (stage width / 390) scales the lettering, the slam, pop-ins, particles, mini hearts (capped at about 40 alive inline, 90 live) and the HUD.
6. **Seeded effects.** Each effect gets its own stream, `seededRandom(seed ^ salt)`: pop-in words, slam and pop-in slots, particle spawns. Per-frame jitter (tremor, the bar's shiver, physics) keeps an unseeded stream: it's texture, not story. The same change applies to live play, so every combo recorded after it replays with the same words. Combos recorded before it replay with different words, which is acceptable.
7. **Replay-mode styles.** `.gr[data-mode="replay"]`, ported from the drafts' `gratitude.css` replay rules (12px inset HUD, 12px track, 28px amount, 18px multiplier), plus: no ground mask, no `touch-action: none` (so the detail still scrolls under a finger), no sheet z-index.
8. **Frame loop.** An IntersectionObserver pauses the loop while the card is off screen; paging to another sticker destroys the engine. The dev slip's "Show frame times" readout works on the inline stage too, for measuring on a phone.

### Stroke passes

Record which stroke samples ended a pass: an optional `strokePasses: number[][]` on `ReplayV1`, one array per stroke of the indexes of its samples that ended a pass, added to the API's schema and the recorder. Replays of new stroke combos then replay exactly; stored ones stay close. Old replays without the field stay valid.

### Motion, accessibility

- **Reduced motion:** never autoplays (nothing does). On press, it plays through the engine's existing reduced path: fades instead of flights, no screen shake, no climax. `setReduced` switches mid-play if the setting changes.
- No motion permission is needed: shakes come from the recorded reversals.
- The stage is `aria-hidden`; one polite live line says "Replaying @bob's 2,946 gratitude", and "Replay ended" when it lands. The pill's label switches between "Play the replay of …" and "Stop the replay". Focus stays on the pill.

---

## Part 2: the timelapse

### Where it plays

**The button** appears once the detail's answer is in, and sits in the detail's meta, at the end of the fine print that already says how long it took: "by @mika · drawn in 2:51 · 9.26". It's a small `LabelButton` with Phosphor's Play, labeled **Timelapse**, the same pattern as the toolbar's buttons. It's not called "Replay": DESIGN.md gives that word, and "the screen's only Replay button", to the gratitude card. It shows in both "yours" and "given" modes, and **only when the sticker has a timelapse**. The detail's answer gains `hasTimelapse` (a left join in `stickerDetail`), so stickers sealed before uploads began show no button, rather than a button that fails.

**It plays in the sticker's own spot**, the detail's 240px stage, over the sticker itself:

- A **playback layer** sits over `StickerFigure`, in the same grid cell and at the same size: white paper masked to the sticker's cut (its mask PNG), with the ink canvas inside. It's a sibling of the figure, not inside `.sticker-figure`: the lift's flyer clones the figure, and a cloned canvas is blank.
- So the sticker's silhouette, baked shadow, kiss-cut groove and foil stay in place the whole time, and the ink appears inside them stroke by stroke, as it was drawn.
- **At the end:** a 300ms hold on the finished ink, then the layer fades out over 400ms, revealing the real sticker's resin tint, gloss and live resin, and the sheen sweeps once (`sweepSheen`, as the seal does). Because the layer and the sticker share the silhouette and the ink, nothing jumps.

Ink drawn outside the final cut never shows: the cut is exactly what was kept.

**Controls and states:**

- **Loading:** tapping Timelapse fetches `api.timelapse(id)` (the browser keeps it for a year) and the button reads **Loading…**. A timelapse with fills then prepares them (below) while the button reads **Preparing…**.
- **Playing:** the button reads **Skip**; tapping it, or the sticker, jumps to the end state (finished ink, then the reveal).
- **Stop:** paging (swipe, arrows, the strip), Escape, Back, or closing the detail stops the player and disposes it. Closing hides the layer synchronously before `close()` runs the lift backward, so the flyer never shows two stickers.
- **Failure:** the layer goes, and a line under the meta says "Couldn't load the timelapse: {reason}. Try again", like the detail's other load failure.
- **Accessibility:** the canvas is `aria-hidden`; a polite live line says "Playing how No.0147 was drawn" and "Done". The button's label switches between "Watch No.0147 being drawn" and "Skip to the end"; focus stays on it.

### How it renders

**Decode.** `decodeTimelapse(t) → { ink, place, ops: Op[] }`, the inverse of `encodeTimelapse`, back to the drawing screen's own `Op`s in sheet pixels. It gets a round-trip test against the encoder.

**Paint strokes with the drawing screen's own code.** The stored points are the drawing screen's finished output: lazy-brush positions, pressure or speed widths, the taper, the lift's catch-up points. So the player replays them as they are and never reruns the brush. Each frame it calls `paintStroke(ctx, op, painted, due)` for the points now due, exactly the live engine's call, so strokes look as they did while drawn. The one difference is in the anti-aliasing: the live engine painted each frame's range as its own fill, so the joints' edge alpha can differ by a hair.

- **Eraser strokes** play too: `destination-out` on the ink canvas, over the white paper layer, just like the drawing screen.
- **Undone work never appears**: the timelapse only holds the ops still on the sheet at seal, so an undo shows as a squeezed gap.

**The display canvas** is the stage box's size × `min(devicePixelRatio, 3)`, drawing through the crop transform `(r·s, 0, 0, r·s, −place.x·r·s, −place.y·r·s)`, where `s` is CSS pixels per sheet pixel (box width / `place.w`) and `r` the density. `place` can reach past the sheet's edges (the die-cut grows past them); anything read from a full-sheet canvas is clipped to where `place` overlaps the sheet, since older Safari draws nothing for an out-of-bounds source rectangle.

**Fills are prepared, not flooded live.** A fill floods whatever pixels are there at that moment, at the drawing's pixel density (the alpha threshold and the 2px grow are in device pixels), and costs a full-canvas read and write each time: too slow at playback speed, and wrong at the display's density. So when a timelapse has fills, a **prepare pass** runs first:

1. A detached full-sheet `InkSurface` at the drawing's density `d0` applies every op in order.
2. After each fill it copies the `place` crop into a display-size snapshot canvas.
3. It yields to the page between fills, then releases the sheet canvas.

During playback, a fill's snapshot is revealed inside a circle growing from the tap point over the fill's beat. Strokes after it keep painting on top.

- **Density.** The drawing's density isn't recorded today. From now on the encoder adds `density` to `TimelapseV1` (an optional field; the encoder already receives it), and fill taps are stored to 0.01px instead of 0.1, so a fill seeds the exact pixel. For older timelapses, `d0` is estimated as `sticker.width / place.w` when the image wasn't scaled down, else 3. A wrong estimate can flood a slightly different region; the ending's fade to the real sticker covers it.
- **If the prepare pass is too slow on a phone**, it moves to a worker (OffscreenCanvas; `paintStroke` takes the wider context type, `floodFill` runs as is), with the main thread as the fallback, as `makeSticker` does.

**Time.** A pure `timelapseSchedule.ts`, tested like `sealTimeline`, maps the drawing's time to playback time.

What the recorded times mean:

- `T` is the session clock, which starts at the first finished stroke and pauses while the color sheet, the smoothing bar or the size rail is up, or the page is hidden.
- Point times inside a stroke are real time.

The schedule:

```
gap_i  = max(0, T_i − T_{i−1} − D_{i−1})     D = a stroke's last point ms, 0 for a fill
idle_i = G · (1 − exp(−gap_i / G)),  G ≈ 300ms   short pauses keep their rhythm, long ones vanish
D_i'   = D_i with in-stroke holds capped at 150ms per point step
A      = Σ D_i' + Σ idle_i
L      = clamp(A / 15, 2.5s, 6s);  k = L / A    one speed for every point and gap
fills  = a 150–200ms reveal each, at most 25% of L together
end    = 300ms hold, 400ms reveal
```

One speed for everything keeps each stroke's shape and the speed ratios between strokes; only idle time is squeezed. A 3-minute sticker plays in at most 6s, a quick doodle in 2.5s.

**Frame loop.** It uses the house pattern (`miniGameEngine`'s loop, `sealTimeline`):

- a frame source that tests inject;
- real time clamped to 50ms a frame;
- each frame's work wrapped in `timeOurWork("timelapse", …)`;
- paused while the page is hidden;
- stopped when done, with every canvas released (width and height to 0, as `makeSticker` does).

**Reduced motion:** the strokes still play, since the person asked for them and nothing moves across the screen, but fills appear at once and the ending is a 150ms fade with no sheen.

**A fix on the way:** `InkSurface.fill` makes a full-size copy canvas on every fill and never releases it. The drawing screen leaks one per fill today, and the prepare pass would too. It gets released.

---

## Build order

It fans out after a small shared commit. Each lane gets its own worktree, a first commit within about 15 minutes, and only its own package's checks. The full check, the end-to-end run and one code review happen at the end.

**Foundation (one commit, first):**

- API: `hasTimelapse` on the sticker detail; `density` (optional) on `TimelapseV1`; `strokePasses` (optional) on `ReplayV1`.
- App: `decodeTimelapse` with its round-trip test; `density` and 0.01px fill taps in the encoder; `seenByGiverAt` kept on `TrailRow`; `InkSurface.fill` releases its copy; `MAX_DPR` exported.
- The two players' interfaces, as typed stubs, so the UI lanes and the engine lanes build against them at once: `createTimelapsePlayer` (prepare, play, skip, stop) and `mountGratitudeReplay` (finished, stop, setReduced). The implementation plan fixes their exact signatures.

**Lanes, in parallel:**

| Lane | Owns                                                                                       | Builds                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| T1   | `sticker-board/timelapse/` player files (new)                                              | `timelapseSchedule.ts`; the player: prepare pass, paint, fill reveals, the end                                                |
| T2   | `sticker-board/timelapse/` UI files (new); the mount point in `StickerDetail.tsx`          | the Timelapse button and its states, the playback layer over the figure, Skip, stop on page and close, reduced motion         |
| G1   | `gratitude/miniGameEngine.ts` and its helpers, `gratitude-mini-game.css`                   | the input source option, layout and scale options, replay-mode styles, seeded effect streams                                  |
| G2   | `gratitude/replay/replayFeed.ts` (new), `replayRecorder.ts`, the API's replay schema       | the pure feed with heart-relative positions and the virtual clock; `strokePasses` recorded and accepted                       |
| G3   | `gratitude/replay/` UI files (new); the mount point in `TransferTrail.tsx`; `trailRows.ts` | the inline stage in the open row: fetch on press, Stop, the landing in the heart dot, seen and `me` refresh, the failure line |

**Finish (controller):**

1. End to end in Chromium on the dev server, with dev sign-in (`DEV_SIGN_IN=on`, LIFF Mock's `?as=`):
   - as `?as=alice`: seal a sticker, then open its detail. Timelapse plays and ends on the real sticker.
   - Give it; as `?as=bob`: receive it and play the Mini-game.
   - As alice again: open the sticker. The trail's Replay plays inline, lands in the card, and alice's unseen gratitude count drops.
2. `pnpm check:full`, one code review, then merge, push and deploy.

## Translation

The app is moving to Japanese and English (the i18n spec, `docs/superpowers/specs/2026-09-26-i18n-design.md`):

- Every new user-facing string goes into the English catalog of its folder (`i18n/en/stickerBoard.ts`, `i18n/en/gratitude.ts`), read with `t(($) => $.section.key, vars)` from `useTranslation` (`i18n/react`). Counts use i18next plurals.
- The Japanese catalogs stay partial by design until the translation pass (the i18n spec's decision 9), so no Japanese strings are added here; missing keys fall back to English.
- Log text and thrown errors stay in the code.
- New folders follow the i18n branch's `jsx-no-literals` rule.

## Working alongside the i18n slices

Draft PR #10 (`i18n/handoff`) and its slice branches (`i18n/sticker-board`, `i18n/gratitude`, `i18n/sticker-creation` and more) are moving every folder's text into the catalogs, in the same files this work changes. To keep merges small:

- **New UI lives in new files:** `sticker-board/timelapse/` (the player, its layer, its button) and `gratitude/replay/` (the feed and the inline stage). `StickerDetail.tsx` and `TransferTrail.tsx` get mount points of a few lines each.
- **Engine changes are new options and a new input path.** They leave the engine's text (tier names, pop-in words, HUD labels) alone, since the gratitude slice owns it.
- **Before merging,** each lane merges the latest `main` (with whatever slices have landed), resolves there, and reruns its checks. Catalog conflicts are key unions.

## Out of scope

- **The giver's pink tag** on the board's edge. It will mount the same inline replay in its own card and land on the given sticker's outline.
- **Someone else's board:** its sticker view doesn't get a Timelapse button yet.
- **The drafts' synthesized replay**, which invents the curves from the totals; this plays what was recorded.
