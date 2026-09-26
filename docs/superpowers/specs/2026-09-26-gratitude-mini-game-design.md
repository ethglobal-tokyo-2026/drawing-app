# Gratitude mini-game: design

2026-09-26. Part 1 of gratitude: the thanker's (Gratitude) Mini-game, as designed, with the combo timing from PRODUCT.md. Built tap-first as a demo (phase A), then stroke, shake and the motion ask (phase B).

**Sources.** `DESIGN` = the design drafts' `drawing-app/` directory (`ethglobal-tokyo-2026-design-drafts`, checked out beside this repo). `P` = `DESIGN/prototype`.

- `P/screens/gratitude.js`: tuning 47–146, art 176–380, detectors 528–598, `HeartSim` 634–2423, harness states 3026–3053. `P/screens/gratitude.css`, `P/harness/gratitude.html`.
- `DESIGN/DESIGN.md` "Gratitude" and "Hit counter"; `DESIGN/PRODUCT.md` 50–65; `DESIGN/research/build-contract.md` items 11, 12, 22–24, 35 and 50; `DESIGN/research/references.md` §3.

**Precedence:** this spec > build-contract LATEST DECISIONS > DESIGN.md > `P`'s code > PRODUCT.md > SCOPE.md. Where this spec changes the designs, it says so.

## Decisions

1. **Part 1 is the thanker's side only.** Part 2 (receiving) adds the Send gratitude sheet after Accept, one stored gratitude per gift and the replay. Part 3 adds the giver's side, the LINE notice and the server's check.
2. **The drain speeds up** (PRODUCT.md line 52), so every combo ends by about 6 s. This replaces `P`'s constant drain, under which a two-thumb masher went on for about 11 s and 20 or more taps a second never ended. The tier thresholds move to fit.
3. **One tap sends; a second tap within the catch window starts the combo**, as in DESIGN.md and `P`.
4. **Tap first.** Phase A is the tap demo. Phase B adds stroke, shake and the motion ask.
5. **Motion permission is asked once, after sign-in, on iPhones only.** Nothing asks on the heart screen. This changes the designs, where the heart screen asks and the Zipper waits for it.
6. **No fog after 昇天 and no condensation beads for now.** Later: condensation at オーバーヒート and clouds at 昇天.
7. **Strong effects.** `P`'s effect counts stay. The target is phones from the last four years.
8. **No sound and no haptics.** The designs have neither.
9. **Everything lives in `apps/frontend/src/gratitude/`.** Parts 2 and 3 add to the same folder.

## The rules

| Phase     | What happens                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ready     | The heart breathes. "Tap the heart" sits under it                                                                                                                                              |
| first tap | On release, on the heart, not a drag (under 12px of travel), held under 0.8s: 1 hit, 10 gratitude at ×1. The heart winds up toward the giver's picture → sending                               |
| sending   | A touch-down within 0.92s of the first tap (a 0.8s catch window plus 0.12s grace) catches the heart → running, and that touch is a hit. No catch: the heart flies to the giver → ended, `sent` |
| running   | Every touch-down on the heart is a hit if the rate limit allows it: 16 a second, bursts of 4. Touches past the limit still animate but add nothing. Touches off the heart count for nothing    |
| ended     | The result goes to the app before any ending plays                                                                                                                                             |

**The bar**

- It fills to 1.0 on the catch, and the combo clock starts at 0.
- It drains at 0.36 × 2^(t / 1.6) of the bar a second, where t is the combo clock.
- Hit n adds 0.20 + 0.10 × 0.93^(n − 3) of the bar, for n ≥ 3 (the catch is hit 2). The bar never goes above 1.
- When the bar empties the combo ends (`empty`). 8s after the first hit it ends (`cap`), a safety stop that play doesn't reach.
- **On screen:** the seconds you'd have left if you stopped now, T × log2(1 + bar × ln 2 / (T × drain)) with T = 1.6s. The fill is those seconds over the 1.8s a full bar lasts at the catch. It sinks for everyone as the drain speeds up, and every hit bumps it back up. It runs hot under 30% and blinks under 12%, as in `P`. Each hit shows its "+0.2s" tick.

**The multiplier**

- Its target is min(8, 1 + 0.55 × max(0, H − 2)), where H is the hits in the last second.
- On a hit, if the target is higher, m += (target − m) × 0.35.
- Between hits, m moves toward the target as target + (m − target) × e^(−k·Δt), with k = 6 rising and 2.5 falling. The target changes only when a hit arrives or drops out of the last second.
- A hit is worth round(10 × m) gratitude.

**Tiers**, by the gratitude total, never dropping within a combo: ありがと 1 · 照れ 90 · ドキドキ 320 · オーバーヒート 1,100 · 昇天 3,000.

**Hitstop:** a tier-up pauses the combo clock and every animation for 0.06s; the 昇天 climax pauses them for 0.14s.

**Ends:** `sent` (one tap), `empty`, `cap`, `hidden` (the page is hidden mid-combo, which ends it at once), `closed` (the X during sending or running).

**Replayable.** The rules compute the drain and the multiplier exactly between hits, never stepped per frame. The same hit times, method switch and config version always give the same total, peak and end. The server's replayed `total` (part 3) and the replay animation (part 2) rely on this.

**Simulated** (2026-09-26): steady tapping with gaps jittered by ±22%, medians of 400 runs, without hitstop.

| Taps a second | Length | Gratitude | Peak tier      |
| ------------- | ------ | --------- | -------------- |
| 2.5           | 3.4s   | 129       | 照れ           |
| 5             | 4.3s   | 562       | ドキドキ       |
| 8.5           | 5.0s   | 1,849     | オーバーヒート |
| 13            | 5.7s   | 4,832     | 昇天           |
| 20 or more    | 6.0s   | 7,362     | 昇天           |

**The result**, passed to `onEnd`. Its fields match the draft schema's `gratitude` table, so part 2 can record it as it is. The names follow the uncommitted edit in `worktree-schema-proposal`: `hits`, `hit_times` and `switched_at_hit`, where its last commit says `events`:

```ts
interface GratitudeResult {
  /** The sticker it thanks. Part 2 records the gift instead. */
  stickerId: string;
  /** The method the combo ended in. */
  method: "tap" | "stroke" | "shake";
  /** Where in hitTimes a combo committed to stroke or shake, 0 if it started there; null for taps only. */
  switchedAtHit: number | null;
  /** Counted taps, passes or reversals: the design's "64 HITS". */
  hits: number;
  /** Milliseconds after the first hit, one per hit. The replay and the server's check run on these. */
  hitTimes: number[];
  /** From the first hit to the end; the receipt shows it in seconds. */
  durationMs: number;
  endReason: "sent" | "empty" | "cap" | "hidden" | "closed";
  /** Gratitude, multiplier included. */
  total: number;
  peakMult: number;
  /** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
  peakTier: 0 | 1 | 2 | 3 | 4;
  /** GAME_CONFIG's version, so a replay runs with the numbers the combo had. */
  tuningVersion: string;
}
```

## The screen

It covers the whole phone, like the sticker detail, with the tabs hidden. LINE's header reads "Send gratitude". The layout follows `P` at 390×844.

- **Top:** the sticker (`StickerFigure`), and the giver's `PhotoSticker` with a heart dot that pops when the heart lands. Beside them: "From", the `@handle`, and fine print like `No.0147 · 4:52 · 2026.09.23`. The X is at the top right.
- **HUD, under the top and never on the heart:** the bar with its seconds and ticks, the amount in Figure type with ♡, and the multiplier sticker (×1.0–×8.0).
- **The heart:** the screen's one dome. It holds its spot, and every tap has to land on it. Its hit area is its resting bounds, as `P`'s `onHeart`, so a squash or a tremor never moves the target.
- **The receipt:**
  - after one tap: "Sent to @giver ♡" and "For No.0147"
  - after a combo: the amount, "gratitude to @giver", "best ×7.8 · 5.6s", "昇天 ascension · tap"
  - then Back to your board, in label stock with the sticker-board icon

**Effects on the tap path**, as `P`'s `hit`, `applyTier`, `applyBg`, `faceFor` and `sweatStep`:

| Tier           | The heart                                             | Each hit                                                                                                  | Ground                 |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| ありがと       | Dot eyes                                              | Squash, a finger stamp, a rising ♡; a glint every 2nd hit                                                 | Liner                  |
| 照れ           | Shy face, blush, a sweat drop                         | A sweat bead every 4th hit                                                                                | Blush                  |
| ドキドキ       | Heart eyes, heartbeat, boiling outline                | Mini hearts sprayed from under the finger, a light screen shake, a burst every 5th hit; sweat hearts drip | Focus lines            |
| オーバーヒート | ＞＜ face, full blush, tremor, a nosebleed past 1,800 | Steam every 2nd hit, a heavy screen shake, hearts raining from the top, heavier sweat                     | Heat haze              |
| 昇天           | Bliss face                                            | A glint every 3rd hit, heavier sweat still                                                                | Light beams, white-out |

- **Every tier-up** slams the tier's name in outlined 袋文字 with its English gloss, with a punch and the hitstop.
- **Pop-in words:** one every 3rd hit in ありがと and 照れ, every 2nd from ドキドキ.
- **Mini hearts:** they bounce, collide, pile along the bottom and fade. A tap shoves nearby piled hearts away.
- **Intensity** scales all of it the way `P`'s `heat` does. It's 0.7 by default, and 1 with the test menu's Full effects switch: the design's setting for the presentation.

**Endings**, as `P`:

- **One tap:** the heart flies to the giver's picture in 0.38s. The picture squashes and gets its heart dot, then the receipt shows.
- **A combo below 昇天:** the same flight.
- **A combo at 昇天:** the climax. A flash, the heart goes limp and pale, 昇天 slams, two 昇天 pop-ins show, and the soul rises to the giver.
- **After a combo:** "fuu…" for 1s, the stamps and hearts tidy away, then the receipt.

**Reduced motion**, as `P`:

- No screen shake, punch, breathing or heartbeat; no mini hearts sprayed from taps or sweated off the heart.
- Rising hearts fade up in place.
- No haze or light rays.
- The heart fades out instead of flying, and there's no climax.
- The numbers don't change.

**Accessibility**, as `P`:

- The heart is a button ("Send gratitude to @giver"), and Enter or Space taps it.
- A polite live region announces the catch, the total at most every 1.6s, and the result.

**Keeping the page still:** `touch-action: none`, and the stage prevents touchmove's default. `base.css` already turns off selection and the callout.

## The tap demo's entry (phase A)

- **A hidden test menu.** Holding your name chip on the Sticker Board for 0.5s opens it, as a `Sheet` labelled "Tests". Right-click opens it on desktop. The tap that ends a hold doesn't flip the board.
- **Try the gratitude mini-game** opens it for your newest sticker on the board, with you as the giver. With no stickers it's disabled and says "Draw a sticker first".
- **Full effects**, a switch: the intensity dial at 1 instead of 0.7.
- **Show frame times**, a switch: a small readout of frame times on the mini-game, for measuring on a phone, where LINE's browser has no developer tools.
- Both switches are saved on the device.
- **`onEnd` stores nothing in part 1.** Back to your board and the X close the screen.

## Phase B: stroke, shake and the motion ask

Stroke and shake work as in `P`, with this spec's timing.

- **Stroke:**
  - Detection is `P`'s `StrokeDetector`: runs of 40px or more, fast at 0.38 px/ms or more; a pause over 0.9s breaks the streak.
  - Before it unlocks, a drag on the heart stretches it on a spring and throws speed lines when it's hard or fast. After three tries, the tip "Stroke it back and forth, fast" shows.
  - Five fast passes anywhere on the screen unlock it. "!?" slams, and the combo commits to stroke, starting or catching it if needed.
  - Its look: the speed field, stream lines, the heart stretching and leaning with the thumb, mini hearts flung along each pass from ドキドキ up, and stroke pop-ins 30% of the time.
  - The stroke finger can't tap until it lifts.
- **Shake:**
  - Detection is `P`'s `ShakeDetector`: peaks of 11 m/s² or more, flips 60–480ms apart, and a run broken by 650ms of calm.
  - With motion allowed, the heart sways with the wrist and tilts with the phone's roll, and shaking jiggles it.
  - At 4 reversals "Keep shaking!" shows, and at 11 a corner lifts.
  - At 16 the heart comes loose ("ポンッ") and ricochets off the walls, denting them and, from ドキドキ up, knocking mini hearts off.
- **Weights:** a fast pass counts as 2.4 hits and a reversal as 1.5, toward the bar, the cadence and the gratitude. Each still adds one to the hit count n, and to `hits`. Both weights are first guesses, tuned on the phone. They stay fixed per method, because a replay knows only where the combo switched. `P`'s speed-based weights would need a weight stored for every hit.
- **Speed limits,** the same guard as the tap limit: at most 10 passes and 14 reversals a second count, with bursts of 4. Hard stroking or shaking stays under them; only a script or a phone rattling on a table reaches them.
- **No mixing:** once a combo commits to stroke or shake, other input is ignored until it ends.
- **The motion ask:**
  - `ui/motionPermission.ts` holds the app's one answer. `askForMotion()` must run inside a tap.
  - `app/MotionPermissionCard.tsx` shows once after sign-in, only where `DeviceMotionEvent.requestPermission` exists. It reads: "Sticker Board uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?", with Allow and Not now.
  - The answer is stored. Declining leaves shake, the light's tilt and the Zipper's swing off, and nothing asks again.
  - If motion was allowed but none arrives in the first second of a later launch, the card comes back.
  - An error from `requestPermission` counts as not allowed and is logged.
  - The sticker tray plan's T4 changes to read `motionPermission`.
  - Touch works either way: the Zipper's pull still drags and taps, and the light follows a finger. Motion adds the pull's swing, the light's tilt and shake.

## Files

Paths are under `apps/frontend/src/gratitude/` unless they name another folder.

| File                                               | Main functions                                                                                       | What it is                                                                                   | Phase                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------ |
| `GratitudeMiniGame.tsx`, `gratitude-mini-game.css` | `GratitudeMiniGame`                                                                                  | The screen: the sticker and giver, the HUD, the heart, the receipt; mounts the engine        | A                        |
| `gameConfig.ts`                                    | `GAME_CONFIG`                                                                                        | Every number above, and `P`'s effect numbers                                                 | A                        |
| `combo.ts` (+test)                                 | `createGratitudeCombo`: `tapHeart`, `countStrokePass`, `countShakeReversal`, `advanceTo`, `endCombo` | The rules, with no DOM; every call is passed the current time                                | A; stroke and shake in B |
| `miniHeartPhysics.ts` (+test)                      | `createMiniHeartPhysics`: `sprayFromTap`, `sweatFromHeart`, `rainFromTop`, `shoveAwayFrom`, `step`   | Mini hearts: gravity, bounces, collisions through a grid, settling, fading, the live cap     | A                        |
| `popInWords.ts`                                    | `POP_IN_WORDS`, `createPopInPicker`                                                                  | `P`'s words for each tier, stroke and shake, unchanged; never the same word twice in a row   | A                        |
| `heartArt.ts`                                      | `bigHeartSvg`, `miniHeartSvg`, `stampHeartSvg`, `soulSvg`, `focusLinesSvg`                           | `P`'s art                                                                                    | A                        |
| `miniGameEngine.ts`                                | `mountMiniGameEngine`                                                                                | The one frame loop: takes input, advances the combo, draws every layer                       | A                        |
| `touchInput.ts`                                    | `listenForTouches`                                                                                   | Pointer events: taps on the heart's resting area, drags; the stroke finger in B              | A                        |
| `heartMotion.ts`                                   | `createHeartMotion`                                                                                  | Squash, breathing, heartbeat, tremor, wind-up, limp; stretch, lean, sway and ricochet in B   | A                        |
| `heartFaces.ts`                                    | `heartFaceFor`                                                                                       | Face, blush, sweat, boiling outline and nosebleed for each tier and intensity                | A                        |
| `comboHud.ts`                                      | `createComboHud`                                                                                     | The bar with its seconds and ticks, the amount, the multiplier sticker                       | A                        |
| `tierSlamAndPopIns.ts`                             | `slamTierName`, `showPopInWord`                                                                      | Outlined 袋文字, kept clear of the heart and the edges                                       | A                        |
| `particleEffects.ts`                               | `createParticleEffects`                                                                              | Rising ♡, finger stamps, glints, steam, sweat beads, bursts; speed lines and wall dents in B | A                        |
| `miniHeartLayer.ts`                                | `drawMiniHearts`                                                                                     | Draws the physics' hearts from a fixed set of elements                                       | A                        |
| `tierBackground.ts`                                | `showTierBackground`                                                                                 | Blush, focus lines, heat haze, light beams, white-out                                        | A                        |
| `gameEndings.ts`                                   | `flyHeartToGiver`, `playAscension`, `sighAndTidy`                                                    | The endings                                                                                  | A                        |
| `strokeDetector.ts` (+test)                        | `createStrokeDetector`: `fingerDown`, `fingerMove`, `fingerUp`                                       | Fast passes anywhere on the screen                                                           | B                        |
| `shakeDetector.ts` (+test)                         | `createShakeDetector`: `addMotionSample`                                                             | Rhythmic shakes                                                                              | B                        |
| `phoneMotion.ts`                                   | `listenToPhoneMotion`                                                                                | Motion samples with gravity taken out, once allowed                                          | B                        |
| `ui/motionPermission.ts`                           | `askForMotion`, `useMotionPermission`                                                                | The app's one motion answer                                                                  | B                        |
| `app/MotionPermissionCard.tsx`                     | `MotionPermissionCard`                                                                               | The ask after sign-in                                                                        | B                        |
| `ui/useLongPress.ts`                               | `useLongPress`                                                                                       | A hold that fires once and swallows the click after it                                       | A                        |
| `sticker-board/TestMenuSheet.tsx`                  | `TestMenuSheet`                                                                                      | The hidden test menu                                                                         | A                        |
| `sticker-board/StickerBoard.tsx`                   | —                                                                                                    | The hold on the name chip; opens the menu and the mini-game                                  | A                        |

## Performance

- **Target:** phones from the last four years, with `P`'s effect counts.
- **Built to be cheap:**
  - Only transform and opacity animate, and the loop never reads layout.
  - Every effect reuses a fixed set of elements.
  - Art that repeats (stamps, mini hearts) has no CSS filter.
  - The heart's blurred body sits on its own layer, under the faces and the boiling outline, so changing those doesn't redraw the blur.
  - The loop sleeps when nothing moves, and React doesn't render during play.
- **Measured before it's called done:**
  - Desktop Chrome with the CPU slowed 4×, under a scripted two-thumb mash (13 a second) to 昇天 with the pile full. Report the frames over 34ms, with the command that measured them.
  - The owner's iPhone inside LINE, with the test menu's Show frame times on.
- **If frames drop:** the mini hearts move to one canvas, and their physics stays the same. Fewer effects only with the owner's OK.

## Errors

- A failure in the frame loop stops the game, logs what failed along with the combo's state, and shows a line on screen saying so. The X still works.
- The result goes out before any ending plays. If `onEnd` throws, the error is logged and the ending still plays.

## Testing

- **Unit (vitest):**
  - **The combo:**
    - One tap with no catch ends `sent`; a catch inside the window starts the bar.
    - Faster steady tapping lasts longer and reaches a higher tier and total.
    - Hits over 16 a second (beyond the burst) don't count, and tiers never drop.
    - The 8s stop holds, and hiding the page ends the combo with its result.
    - A result's `hitTimes` has one entry per hit, and its `durationMs` stays within 8,000.
    - Replaying a result's hit times through a fresh combo gives the same total, peak tier and end, however the frames fell.
  - **Touch input:** a touch-down just outside the heart's resting area isn't a hit, and one inside it is.
  - **The mini-heart physics:** a spray falls, bounces, settles into the pile and fades. A tap shoves nearby hearts away, and the live cap holds.
  - **The detectors (B):** five fast passes unlock and four don't; a slow pass or a pause breaks the streak; jolts without rhythm don't count.
- **The screen (happy-dom):** one tap shows "Sent to @…" and calls `onEnd` once with a one-tap result. The X before any tap calls nothing.
- **Looks:** screenshots at 390×844 beside `P`'s harness states `front-calm`, `front-sent`, `flip-arigato`, `flip-tere`, `front-receipt`, `flip-dokidoki`, `flip-overheat`, `flip-high-mult`, `flip-low-timer`, `flip-shoten` and `flip-receipt`, with every difference listed. Phase B adds the `stroke-*` and `shake-*` states.
- **On the owner's phone, inside LINE:**
  - Taps feel immediate, and two thumbs both count.
  - Nothing scrolls, zooms or selects.
  - Frame times at 昇天.
  - Phase B: whether iOS shows the motion prompt inside LINE, whether the answer survives closing LINE, and a thumb stroking anywhere unlocks stroke.

## Later

- Condensation at オーバーヒート and clouds at 昇天.
- **Part 2:** the Send gratitude sheet after Accept, one stored gratitude per gift, and the replay when a thanked sticker is reopened.
- **Part 3:** the giver's pink tag, replay card and warmer glow, the LINE notice, and the server's check.
- **The stand-in plan** (`docs/superpowers/plans/2026-09-25-gratitude-heart-stand-in.md`) is deleted when this spec's implementation plan lands. Its recording contract lives on in the draft schema's `gratitude` table.
- **The draft schema** has every column the result needs, and its limits fit: 1–120 hits (a combo tops out near 100), 8,000ms, tiers 0–4, multiplier 1–8. It needs `sent` added to its end reasons, because here one tap sends; the draft follows the stand-in's rule that the first tap starts the combo. If it renames `tuning_version` to match `gameConfig.ts`, the result follows.
