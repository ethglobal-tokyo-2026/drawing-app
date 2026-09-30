# Gratitude Mini-game

How the (Gratitude) Mini-game works, for whoever changes or tunes it. The code in `apps/frontend/src/gratitude/` is the source of truth. Every number lives in `gameConfig.ts`, so this doc names fields, never values:

- `G` = `GAME_CONFIG`: the rules. A combo records `G.version`, and a replay needs the same numbers.
- `M` = `GAME_CONFIG.multiplier`.
- `F` = `FEEL_CONFIG`: touch, the detectors and the effects. A combo doesn't record these.

## What it is

After receiving a sticker, the receiver taps, strokes or shakes a heart to make gratitude for the sticker's giver. Each counted tap, stroke pass or shake reversal is one hit. The first hit starts the combo and its bar, so one tap is never the whole game: the bar gives time for the next.

**Where it opens:** from a received sticker. Once one sticks to your board, the Send gratitude sheet (`receiving/SendGratitudeSheet.tsx`) asks whether to send its giver gratitude now. Later leaves it for the sticker's detail, which offers Send gratitude until that gift has gratitude.

**Where the result goes:** `gratitudeOutbox.ts` keeps the finished combo on the device, in a list of the person who played it, then sends it to `POST /api/gratitude`. A combo the server hasn't recorded or refused goes again each time the app starts with that person signed in. An entry the outbox can't read stays as it is, unsent, and a list it can't read is never written over. A combo in play is kept too, unsent, from its first hit and then now and then as hits come, ended as the page going hidden would end it, so a webview torn down without visibilitychange or pagehide still leaves it to send; its finished record takes its place under the same idempotency key. The app sends one kept in play only once no other tab could still be playing it.

**The demo:** "Try the gratitude mini-game", on the stat board's developer slip, opens it for your newest sticker on the board, with you as the giver, and records nothing. With no stickers it's disabled and says "Draw a sticker first". The dev server shows the slip unless `VITE_DEV_SLIP=off`, and a build shows it only with `VITE_DEV_SLIP=on`, which `deploy/deploy.sh` sets. Two switches, kept on the device, sit beside it: Full effects and Show frame times.

## Files

Under `apps/frontend/src/gratitude/` unless a path says otherwise.

| File                                                                     | Owns                                                                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `gameConfig.ts`                                                          | `GAME_CONFIG` and `FEEL_CONFIG`                                                                                          |
| `combo.ts`                                                               | The rules, with no DOM or clock: `createGratitudeCombo`, `replayGratitudeCombo`, `fullBarSeconds`                        |
| `touchInput.ts`                                                          | Pointer events: `isOnHeart`, and `listenForTouches` for taps on the heart and the stroke finger                          |
| `strokeDetector.ts`, `shakeDetector.ts`                                  | Fast passes anywhere on the screen; rhythmic reversals of the phone                                                      |
| `phoneMotion.ts`                                                         | The phone's motion samples with gravity taken out, for the shake detector                                                |
| `miniGameEngine.ts`                                                      | The one frame loop: sends input to the rules, turns the rules' events into effects, draws every layer                    |
| `GratitudeMiniGame.tsx`, `gratitude-mini-game.css`                       | The screen: the sticker and giver, the HUD's place, the stage, the receipt; mounts the engine and passes on the result   |
| `gratitudeOutbox.ts`                                                     | Keeps each combo on the device, in play and finished, and sends it to `POST /api/gratitude` until recorded or refused    |
| `heartMotion.ts`, `heartFaces.ts`, `heartArt.ts`                         | The heart's motion, its face for each tier and intensity, and the art                                                    |
| `comboHud.ts`                                                            | The bar with its seconds and ticks, the amount, the multiplier sticker                                                   |
| `tierSlamAndPopIns.ts`, `popInWords.ts`, `tierNames.ts`                  | Tier-name slams and pop-in words in outlined 袋文字; the words; the tier names and glosses                               |
| `particleEffects.ts`                                                     | Finger stamps, rising ♡, glints, steam, sweat beads, bursts                                                              |
| `miniHeartPhysics.ts`, `miniHeartLayer.ts`                               | Mini hearts: their physics, and drawing them from a fixed set of elements                                                |
| `tierBackground.ts`                                                      | The ground behind the heart, by tier                                                                                     |
| `gameEndings.ts`                                                         | The endings: the flight to the giver, 昇天's climax, the sigh and tidy                                                   |
| `frameTimeReadout.ts`, `miniGameDemoSettings.ts`                         | The frame-time readout; the demo's switches                                                                              |
| `replayRecorder.ts`                                                      | The replay: the touches, stroke samples and passes, and reversals a combo was played with                                |
| `stageLayout.ts`                                                         | Where the heart rests on a stage, under the live screen's top band and HUD or a replay's HUD                             |
| `webAnimations.ts`                                                       | Web Animations that keep pace with a replay's clock                                                                      |
| `replay/replayFeed.ts`, `replay/replayInput.ts`, `replay/replayClock.ts` | A replay's inputs moved onto the replay's stage; handing them to the engine; the replay's clock, sped up for long combos |
| `replay/mountGratitudeReplay.ts`, `replay/useGratitudeReplay.ts`         | The engine in replay mode on a card's stage; loading, stopping and marking a replay watched                              |
| `replay/ReplayStage.tsx`, `sticker-board/TransferTrail.tsx`              | The stage that eases open in the Transfer Trail's open row; Replay and Stop                                              |
| `ui/motionPermission.ts`, `app/MotionPermissionCard.tsx`                 | The app's one motion answer; the ask after sign-in                                                                       |
| `sticker-board/stat-board/GratitudeDemoControls.tsx`                     | The demo's button and switches on the developer slip                                                                     |

## Phases

`combo.view.phase` is one of three.

| Phase   | Starts                      | Ends                                                          | Shows                                                                                                                                                                                                      |
| ------- | --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ready   | The screen opens            | The first tap, or a stroke or shake unlock → running          | The heart breathing, "Tap the heart / as fast as you can!" beating under it on two lines (still with reduced motion). The HUD: a full bar reading `fullBarSeconds`, 0 and ×1.0. A touch squashes the heart |
| running | The first tap, or an unlock | The bar empties; the safety stop; the page goes hidden; the X | The HUD, the tier's face and ground, every hit's effects                                                                                                                                                   |
| ended   | Any end above               | —                                                             | The record goes to `onEnd` first, then the ending, then the receipt                                                                                                                                        |

- The bar shows from the start, so the combo is plain to see before the first tap. The first hit fills it and brings ありがと.
- Endings: a combo below 昇天 flies the heart into the giver's picture. A combo at 昇天 plays the climax: a flash, the heart goes limp and pale, 昇天 slams and its soul rises to the giver. Then "fuu…" shows and everything tidies away before the receipt.
- A page that goes hidden ends the combo at once and skips the ending. The X ends it and closes the screen. Either way the record goes out.
- The receipt shows the total, the best multiplier, the hits and the peak tier.

## Input methods

**Tap.** A touch counts only on the heart's resting area (`isOnHeart`): its resting box, or the ellipse through the box's edges grown by `F.heartReach`. The area never follows the squash or the tremor, so an animation can't move the target out from under a thumb.

- The first tap counts on release, and only if it traveled less than `F.tapSlopPx` and was held less than `F.tapHoldMs`, so a drag or a hold never sends.
- Every later tap counts at touch-down. Every finger counts, so two thumbs both score.
- Enter or Space on the heart's button taps it.

**Stroke.** A thumb stroking back and forth anywhere on the screen, per `F.stroke`:

- One finger strokes at a time: the first to drag past `F.tapSlopPx`. When it lifts, another finger still dragging takes over at its next move, so swapping thumbs keeps stroking.
- A run ends when the thumb doubles back by `turnPx`. A run of at least `minRunPx` is a pass, and a pass at `fastPxPerMs` or faster is fast. Runs are measured along their own direction, so any direction counts.
- A slow pass, or a pause longer than `pauseMs`, breaks the streak of fast passes.
- `unlockPasses` fast passes in a row unlock stroke: "!?" slams, and the combo commits to stroke, starting it first if need be. Once a tap combo's bar is running, `unlockPassesMidCombo` passes do it, so the switch lands before the bar runs out. After that, each fast pass is a hit.
- The first tap starts the streak over: the replay keeps strokes only from the first hit on, so passes before it never count toward a switch, and a replay switches where the combo did.
- Before the unlock, a drag on the heart stretches it. After `triesForTip` drags of `tryTravelPx` or more that don't unlock, the tip "Stroke it back and forth, fast" shows.
- Once committed, the heart stretches and leans with the thumb, with speed lines, and flings mini hearts along each pass from ドキドキ up. Pop-ins sometimes come from the stroke words.

**Shake.** Shaking the phone, or twisting it back and forth with the wrist like turning a doorknob, in a rhythm, per `F.shake`:

- The motion is the phone's acceleration with gravity taken out. Sideways, it's the stronger of that and the twist, so a twist and the push it gives the phone count as one motion.
- The twist is the phone's turning rate about the axis it last turned fast about, its long axis to start, scaled into the same units: a twist at `twistPeakDegPerS` peaks like a shake at `minPeak`. Its direction flips where the phone turns back, so a twist counts sooner after the turn than a shake, whose push flips a quarter turn later.
- Only the dominant axis counts, and motion under `deadZone` is ignored. A twist has to pass `deadZone / minPeak` of `twistPeakDegPerS` to flip at all, which tilting the phone to read it, walking or setting it down stays under.
- A reversal is the motion flipping direction after a peak of at least `minPeak`, between `minGapMs` and `maxGapMs` after the last flip. `resetMs` of calm breaks the run, so a single jolt never counts.
- Motion counts from its first sample. Where a platform flips the motion's sign, `phoneMotion.ts` finds it from the orientation while the phone is still; the sign sets only which way the heart goes.
- With motion allowed, the heart sways with the wrist and its twist, tilts with the phone's roll, and jiggles when shaken. On a phone with a gyroscope the roll comes from the orientation, at once. Otherwise it comes from the gravity estimate low-passed twice, which keeps a shake out of it but lags.
- At `keepShakingAt` reversals "Keep shaking!" shows, at `cornerAt` a corner lifts, and at `unlockAt` (`unlockAtMidCombo` once a tap combo's bar is running) the heart comes loose ("ポンッ") and the combo commits to shake. After that, each reversal is a hit, and the loose heart ricochets off the walls, denting them and, from ドキドキ up, knocking mini hearts off.
- Shake needs motion permission on iPhones (below).

**All methods:**

- **No mixing.** A combo is tap until it commits to stroke or shake (`commitTo`). From then on, other input counts for nothing until it ends. `switchedAtHit` records where it committed.
- **Lift to tap.** The stroke finger can't tap until it lifts.
- **A speed limit per method.** Each method has a token bucket that holds up to `G.burst` hits and refills at `G.tapsPerSecond`, `G.passesPerSecond` or `G.reversalsPerSecond`. A hit past the limit is a `limited` event: the heart squashes and a stamp shows, but it adds nothing and isn't recorded. Hard play stays under the limits; a script or a phone rattling on a table reaches them.

## Scoring

Each hit has a weight `w`, which counts toward the multiplier's cadence, the bar's gain and the gratitude:

```
w = 1                  a tap, or a combo's first hit, whatever its method
w = G.methodWeight     any other stroke pass or shake reversal
```

Each hit adds one to `hits`, whatever its weight. The weight is fixed per method so that a replay needs only where the combo switched, not a weight for every hit.

**The multiplier** `m` starts at 1 and chases a target:

```
H      = the sum of w over the hits in the last M.windowMs
target = min(M.max, 1 + M.perHit × max(0, H − M.freeHits))

on a hit, if target > m:  m ← m + (target − m) × M.hitNudge
between events:           m(Δt) = target + (m − target) × e^(−k·Δt)
                          k = M.rise when target > m, else M.fall; Δt in seconds
```

The target changes only when a hit arrives or leaves the window.

**Gratitude per hit**, with `m` after the hit's nudge:

```
gratitude = round(G.gratitudePerHit × m × w)
```

## The bar

The bar is the combo's clock. It holds between 0 and 1.

- It fills to 1 at the first hit, and the combo clock `c` starts at 0. `c` is seconds since then, less tier-up freezes.
- It drains faster and faster, so every combo ends:

  ```
  drain(c) = G.drainStart × 2^(c / G.drainDoublingS)   bars a second
  ```

- Every hit after the first adds a gain, and the bar never goes past full. `n` is the hit's place in the combo, so the first gain comes at hit 2:

  ```
  gain(n) = G.gainFloor + G.gainAboveFloor × G.gainDecay^(n − 2)
  bar     ← min(1, bar + w × gain(n))
  ```

- **On screen**, the seconds left if the hits stopped now, and the fill as a share of what a full bar lasts at the first hit:

  ```
  T = G.drainDoublingS,  K = G.drainStart × T / ln 2
  secondsLeft    = T × log2(bar / K + 2^(c / T)) − c
  fullBarSeconds = secondsLeft with bar = 1 and c = 0
  barFill        = min(1, secondsLeft / fullBarSeconds)
  ```

  The fill sinks as the drain speeds up, and every hit bumps it back up with a tick showing the seconds it added. It runs hot below `comboHud.ts`'s `HOT` share and blinks below `BLINK`.

- **The ends:** the bar empties; the safety stop, `G.maxDurationMs` after the first hit, which play doesn't reach; the page going hidden; the X.

## Tiers and faces

The tier comes from the total: ありがと below `G.tierStarts[0]`, then 照れ, ドキドキ, オーバーヒート and 昇天 from `G.tierStarts[0]` to `G.tierStarts[3]`. Tiers show only once the combo is running, and they never drop.

**The tier-up freeze:** a tier-up holds the combo clock, the drain and the multiplier for `G.tierUpFreezeMs`, and the engine holds every animation with them. Each tier-up slams the tier's name in outlined 袋文字 with its English gloss, and punches the page. 昇天's climax holds everything for `F.climaxFreezeMs`.

| Tier           | The heart (`heartFaces.ts`)                                                | The ground (`tierBackground.ts`) |
| -------------- | -------------------------------------------------------------------------- | -------------------------------- |
| ありがと       | Dot eyes                                                                   | The calm liner                   |
| 照れ           | A shy face, a blush, a sweat drop                                          | A warm blush                     |
| ドキドキ       | Heart eyes and a boiling outline; the heart beats and drips sweat hearts   | Focus lines                      |
| オーバーヒート | A ＞＜ face, a full blush and a tremor; a nosebleed once the total is high | Focus lines and heat haze        |
| 昇天           | A bliss face                                                               | Light beams and a white-out      |

Every hit squashes the heart, stamps under the finger and sends up a ♡. The higher the tier, the more each hit adds: glints, sweat beads, bursts, steam, screen shake, hearts raining from the top, and from `F.miniHearts.fromTier` up, mini hearts sprayed from under the finger. The mini hearts bounce off the walls, the HUD's underside and each other, pile along the bottom and fade; a tap shoves nearby piled hearts away. Pop-in words show every few hits, more often from ドキドキ. `onHit` in `miniGameEngine.ts` sets these cadences.

## Replay and the record

- **Closed form between events.** The rules' state changes only at events: a hit, a hit leaving the cadence window, the bar emptying, the safety stop. Between events, the bar and the multiplier follow the formulas above exactly, never stepped per frame, so the same hits give the same record however the frames fell.
- **Whole milliseconds.** Hit times are whole milliseconds after the first hit, and never earlier than an event already run, so a replay meets events in the same order.
- **`replayGratitudeCombo(record)`** plays a record's hits through a fresh combo: taps, then from `switchedAtHit` its passes or reversals, up to `durationMs`. Under the same config it returns the same record, which `combo.test.ts` checks.
- **The record** (`ComboRecord`, and `GratitudeResult` with the sticker's ID added): `method` (the one it ended in), `switchedAtHit`, `hits`, `hitTimes`, `durationMs`, `total`, `peakMult` (to hundredths), `peakTier` and `gameConfigVersion`. The record doesn't say how the combo ended: gratitude exists or it doesn't.
- **What the server keeps.** `POST /api/gratitude` takes the gift, the record's scored fields and the replay. The `gratitude` table (`packages/db/src/schema/gratitude.ts`) stores, per received gift, `method`, `hits`, `total`, `peakMult`, `peakTier`, the Original Artist Gratitude Share, `gameConfigVersion`, the gzipped replay and `seenByGiverAt`; `switchedAtHit` and `durationMs` are inside the replay (`apps/api/src/gratitude/replay.ts`). The server doesn't recount a combo: `apps/api/src/gratitude/record.ts` checks that the body and its replay agree, refuses a total over `hits` × `MAX_GRATITUDE_PER_HIT` (a hit's gratitude at `M.max` and the heaviest weight, rounded up), and stores the total it was sent. A rule that lets a hit score more than that needs the bound changed with it.
- **The replay** (`ReplayV1`, sent with the record; `replayRecorder.ts` builds it) keeps what the record's scored fields leave out, to check a combo or play it back: every touch on the heart with whether it counted, each stroke's path sampled a few dozen times a second, every shake reversal from the switch on, where the combo switched method, the effects' seed and intensity, the stage's size, the length, and how the combo ended (`sent`, `empty`, `cap`, `hidden` or `closed`). Positions are stored relative to the stage, and each time and position after the first as the change from the one before. Each stroke also lists which of its samples ended a fast pass (`strokePasses`), so a stroke combo replays exactly; one recorded before that field existed is recovered only approximately, by running the stroke detector over the samples again. The trail's card plays it back (`gratitude/replay/`).
- **Change `G.version` whenever a rule number changes**, so an old record replays with the numbers it was played with. `FEEL_CONFIG` changes need no new version.

## Playing a replay

What a person sees is in DESIGN.md's Gratitude replay. How it runs:

- **The same engine.** `mountGratitudeReplay` runs `miniGameEngine.ts` in replay mode: no listeners, recorder, tips or live region, and the heart takes no taps. `replayFeed.ts` turns the replay into inputs, each where it was relative to the heart, in heart widths from its middle. `replayInput.ts` hands them to the engine's own handlers as its clock reaches them, so the rules, the detectors and the effects run as they did live. The effects draw from the replay's seed, each from its own stream, so a combo looks the same however the frames fall.
- **Speed.** `replaySpeed`: real time up to `REPLAY_REAL_TIME_MS`, and a longer combo sped up to take that long, at most `MAX_REPLAY_SPEED` times as fast. Web Animations keep pace through `webAnimations.ts`; CSS transitions run at real time. The first hit comes a moment in, so the heart rests first.
- **Scale.** The lettering, particles, mini hearts, the loose heart's kicks and the screen shake scale by the stage's width over 390, with fewer mini hearts in play. The physics runs in the live game's pixels.
- **The figures.** A replay ends on the stored combo's total, hits and tier. If its own count comes out different, the HUD shows the stored figures and a console warning names the gift. A replay shows no English glosses.
- **Stopping.** `useGratitudeReplay` stops it on Stop, Escape, another gift or the card going. After Stop, Escape or the landing, the engine stays in view until its stage has eased shut, so the stage never shuts empty. It hears Escape on the document while a replay plays, because Safari doesn't focus a clicked button. Off screen, the replay's clock pauses.
- **Watched.** As the heart lands, the giver's replay marks the gratitude watched (`POST /api/gratitude/:giftId/seen`) while `seenByGiverAt` is null.

## Effects and motion

- **Intensity.** One dial scales every effect: `F.intensity.everyday` by default, and `F.intensity.full` with the demo's Full effects switch. A low dial keeps each tier's face but drops the boiling outline, the full blush and the nosebleed.
- **Reduced motion** turns off screen shake, the punch, breathing and heartbeat, and sprayed and sweated mini hearts. Rising hearts fade up in place, the haze and light beams go, and the heart fades out instead of flying, with no climax. The numbers don't change.
- **Accessibility.** The heart is a button ("Send gratitude to @giver"). A polite live region asks for more taps as the combo starts, then gives the total now and then, and the result.
- **The motion permission.** `ui/motionPermission.ts` holds the app's one answer, kept on the device.
  - `app/MotionPermissionCard.tsx` asks once, after sign-in, and only where the browser has an ask (iOS). Nothing asks on the heart screen.
  - Allow asks the platform from inside the tap. Not now is kept, and nothing asks again.
  - If a kept yes brings no motion soon after a later launch, the card asks again. A failed ask counts as no, is logged and isn't kept.
  - Declining leaves shake, the light's tilt and the Zipper's swing off. Touch works either way.
- **The engine.** One animation-frame loop. Only transform and opacity animate, every effect reuses a fixed set of elements, the loop never reads layout, and it sleeps once nothing moves. React renders the screen's parts once and hears only the record and the ending. A failure in the loop stops the game, logs the combo's state and says so on screen; the X still works.

## Tuning

| To change                                                        | Edit                                                |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Scoring, the bar, tiers, speed limits, method weights            | `GAME_CONFIG`, and bump its `version`               |
| The heart's reach, tap slop and hold, the detectors, mini hearts | `FEEL_CONFIG`                                       |
| Per-hit effects and their cadence                                | `onHit` in `miniGameEngine.ts`                      |
| The faces, the ground, the HUD's warnings                        | `heartFaces.ts`, `tierBackground.ts`, `comboHud.ts` |

`G.gratitudePerHit`, `G.methodWeight` and `M.max` are set in `packages/db/src/schema/limits.ts`, where the server reads them to bound a combo's total.

These tests pin the design's intent, and a retune has to keep them passing:

- `combo.test.ts`:
  - The first tap starts a full bar, and one tap alone ends only when the bar runs out.
  - Faster tapping lasts longer and reaches a higher tier and total.
  - 照れ never comes before the 7th tap at any steady speed, and comes on the 5th stroke or shake.
  - The speed limits hold, tiers only climb, the safety stop holds, and the freeze lifts.
  - Hiding the page ends the combo with its record.
  - Times are whole milliseconds, and a replay gives the same record, for tap combos and for combos that started in or switched to stroke or shake.
  - Committing to a method shuts out the others.
- `miniGameEngine.test.ts`: once a tap combo's bar is running, stroke and shake unlock in fewer moves; before any tap, they take the full unlock.
- `detectors.test.ts`: the stroke unlock streak, strokes in any direction, a slow pass or a pause breaking the streak, and a rhythmic shake counting where a sway, a wobble or a single jolt doesn't.
- `touchInput.test.ts`: the heart's reach, every finger counting, a drag or a hold not being a tap, and a finger still dragging taking the stroke over.
- `miniHeartPhysics.test.ts`: the pile settles and fades, a tap shoves it, and the live cap holds.
