# The gratitude heart: implementation plan

Drawing app · 2026-09-25 · the build plan for **Send gratitude**, the combo minigame. A dedicated build agent carries it out. **This is a plan, not code:** every type and table below is a spec to build from, and every asset is described, not made.

**Inputs**

- `../PRODUCT.md`: lines 26–30 (two kinds of artist), 50–65 (the combo), principles 6 and 7, Decisions of 2026-09-23
- `build-contract.md`: items 11 (the timer game), 12 (materials move), 18 (Phosphor icons), 22 (secrets are never collected), 23 and 35 (mini hearts and sweat), 24 (no flip side)
- `../SCOPE.md`: §6 and open decision 13 (the ladder)
- `references.md` §3 (manga symbols, the five tiers), `two-audiences.md`, `gratitude-history-brief.md`
- The prototype: `../prototype/screens/gratitude.js`, `gratitude.css`, `../prototype/harness/gratitude.html`

**Superseded, and ignored here.** Every SCOPE §6 row about a flip side, a front capped at Calm, the air-bubble door, or a first tap that sends and a second that starts the combo. The flip side was dropped on 2026-09-24 (build-contract item 24). There's one experience for everyone: the first tap starts the combo, and it escalates only when you push it (PRODUCT.md line 30, principle 7).

## 1. The mechanic model

### 1.1 The spec, verbatim

PRODUCT.md line 52:

> The first tap starts a **bar that drains**. Fast tapping wins some of it back, but the drain keeps speeding up, so after about 5 seconds it outruns anyone's tapping and the combo ends. Each tap is one gratitude.

PRODUCT.md line 53:

> **Effects escalate with the combo.** Early taps are modest. A long combo gets more and more anime, and more and more over the top, in suggestive, uncomfortable, played-for-laughs ways, even though you're only tapping.

PRODUCT.md line 30:

> The gratitude combo escalates only when you push it, so friends who tap a few times get a warm thank-you, and people who mash reach the wild upper tiers.

build-contract item 11, which is **newer** than line 52's "Each tap is one gratitude":

> - **The bar drains.** It appears on the first combo tap and runs DOWN, showing when you'll run out of time, as in Death Stranding. Empty ends the combo.
> - **Taps add time, with diminishing returns,** in the style of Mullet Mad Jack. Each tap adds less as the combo grows, so staying alive takes more and more taps.
> - **Faster tapping makes the numbers climb faster,** like Death Stranding's likes. A multiplier driven by tap speed scales each tap's gain.
> - **The gratitude amount is always visible,** with the multiplier next to it. Nothing sits on or over the heart, which is the control.
> - **Pop-in text and sound effects are temporary** on screen, drawn from a large bank for each tier.
> - **No grid-paper background** on the gratitude screens.

PRODUCT.md lines 58–63, the parts that shape the model:

> - It doesn't count at first; about 5 fast passes unlock it. You have to lift your finger to tap again.
> - **No mixing:** once you start stroking or shaking, you're committed to that method for the rest of the combo.
> - **Hint before unlock** … When your input is heading toward a hidden method, the heart hints at it, very subtly at first … then stronger as you get closer, until the method unlocks.
> - **One arc, three looks:** all three methods follow the same escalation, but each has its own animation.

**How "Each tap is one gratitude" is read.** Item 11 is newer, and its multiplier makes a tap worth more than one. So a tap is still counted as one tap, and the count is recorded beside the total (§5). Its gratitude is 10 × the multiplier.

**What the prototype got wrong.** Its drain is constant (1 s of bar per second); only the per-tap gain shrinks, to a floor of 0.05 s. Anyone tapping faster than 20 a second adds more than the drain takes, so a bot, or a four-finger drummer, never runs out. That breaks "outruns anyone's tapping". This model makes the drain itself speed up, and caps how many taps count.

### 1.2 The model in plain words

- **The bar** holds 1.0. The first tap fills it and starts the combo clock at 0.
- **The drain** starts at 0.36 of the bar a second and doubles every 1.6 s. Left alone, a full bar lasts 1.8 s after the first tap, 0.95 s at 2 s, and 0.3 s at 5 s.
- **Each counted tap adds time,** less each tap: 0.30 of the bar at first, shrinking toward a floor of 0.20. The bar never overfills.
- **The drain outruns you** once it takes more a second than your taps can add at the floor (taps a second × 0.20). At most 16 taps a second count, so the drain beats everyone, a bot included, by 5.0 s.
- **The bar on screen shows the time you'd have left if you stopped now,** as a share of the first tap's 1.8 s. Item 11 asks for a bar that "runs DOWN, showing when you'll run out of time, as in Death Stranding", and this is that reading. Because the drain keeps speeding up, the bar keeps sinking for everyone, a masher included. Each counted tap shows as a small bump up, which is line 52's "wins some of it back", and the bar goes on sinking from there. Slow taps give small, rare bumps on a bar that falls fast. Fast taps give a steady flutter on a bar that falls slowly.
- **Taps count on the heart,** because item 11 calls the heart "the control". The hit area is the heart's resting bounds plus a generous margin. It stays fixed at the rest position, so the tier effects that jiggle or bounce the heart never move the target out from under a thumb. Strokes count anywhere on the screen (line 59).
- **Gratitude per tap** is 10 × the multiplier, rounded. The multiplier chases a target set by the taps counted in the last second: ×1 at 2 a second or slower, plus 0.55 for each tap a second above that, up to ×8 (at about 14.7 a second). It climbs fast and sags slower. It scales gratitude only, never time.
- **Tiers** are reached by the running amount, never by the tap count, and never drop within a combo.
- **Stroke and shake feed the same model** through a weight per event: one arc, three looks.
- **The clock is the monotonic clock** (`performance.now()`), never a sum of frame times, so a dropped frame or a stall gives no free time.

### 1.3 States

```
READY (heart pulses, one-line instruction, no bar) ──tap on the heart──▶ RUNNING·tap
READY ──5th fast pass──▶ RUNNING·stroke          READY ──shake unlock──▶ RUNNING·shake
RUNNING·tap ──5th fast pass──▶ RUNNING·stroke    RUNNING·tap ──shake unlock──▶ RUNNING·shake
RUNNING·any ──bar empty · page hidden · page closed · 8 s stop──▶ ENDED
ENDED ──total sent once──▶ RECORDED ──▶ PAYOFF (the receipt)
```

| From           | Event                                             | To                       | What happens                                                                      |
| -------------- | ------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| READY          | touch-down on the heart's hit area                | RUNNING·tap              | Bar full, clock at 0, and the tap counts                                          |
| READY          | 5th fast stroke pass in a row                     | RUNNING·stroke           | The combo starts committed to stroke                                              |
| READY          | shake unlock (motion allowed, §2)                 | RUNNING·shake            | The combo starts committed to shake                                               |
| RUNNING·tap    | touch-down on the heart's hit area                | RUNNING·tap              | +time, +gratitude, the cadence updates. A touch-down elsewhere counts for nothing |
| RUNNING·tap    | fast pass 1–4, or rhythmic shake below the unlock | RUNNING·tap              | Hint progress rises (0–1). Passes and shakes add nothing yet                      |
| RUNNING·tap    | 5th fast pass, or shake unlock                    | RUNNING·stroke or ·shake | Commit. The bar and amount carry on                                               |
| RUNNING·stroke | fast pass                                         | RUNNING·stroke           | Counts as 2.4 taps' worth                                                         |
| RUNNING·stroke | touch-down                                        | RUNNING·stroke           | Not a tap (no mixing): it starts a stroke                                         |
| RUNNING·shake  | shake reversal                                    | RUNNING·shake            | Counts as 1.5 taps' worth                                                         |
| RUNNING·shake  | tap or stroke                                     | RUNNING·shake            | Ignored (no mixing)                                                               |
| RUNNING·any    | bar empty                                         | ENDED                    | Reason `empty`                                                                    |
| RUNNING·any    | page hidden or closed                             | ENDED                    | Reason `hidden` or `closed`. The total goes out with `keepalive` (§5)             |
| RUNNING·any    | combo clock reaches 8 s                           | ENDED                    | Reason `cap`. A safety stop that play never reaches                               |
| ENDED          | —                                                 | RECORDED                 | Exactly one send per combo, before any payoff plays                               |

**Lift to tap.** A tap is a touch-down. A touch that travels past the tap slop is a stroke until it lifts, and a new tap needs a new touch. A pass streak resets on a slow pass or a gap over 0.5 s.

**Hints are progress, not state.** In READY and RUNNING·tap the stroke and shake detectors report progress from 0 to 1 (passes out of 5, reversals out of 12). The renderer turns it into the heart's tremor (§3). Nothing records it, counts it or shows it as found (build-contract item 22).

### 1.4 The tuning table

One table, one source file. The dev page (§7) puts a slider on every row.

| Group      | Name                   | Value                    | Meaning                                                                                       |
| ---------- | ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Bar        | `barStart`             | 1.0                      | The first tap fills the bar                                                                   |
|            | `drainStart`           | 0.36 bar/s               | The drain at the first tap. A full bar alone lasts 1.8 s                                      |
|            | `drainDoubling`        | 1.6 s                    | The drain doubles this often: 0.36 → 0.86 at 2 s → 2.04 at 4 s → 3.14 at 5 s                  |
|            | `gainFirst`            | 0.30 bar                 | Time added by the first taps                                                                  |
|            | `gainFloor`            | 0.20 bar                 | Later taps approach this                                                                      |
|            | `gainDecay`            | 0.93                     | Each tap keeps 93% of the last tap's gain above the floor: tap 10 adds 0.25, tap 30 adds 0.21 |
|            | `maxCombo`             | 8.0 s                    | Safety stop. Play never reaches it: the longest combo is 6.1 s                                |
| Counting   | `hitMargin`            | 28 px                    | Added on every side of the heart's resting bounds. The area never follows the heart's jiggle  |
|            | `rateCap`              | 16 a second, bursts of 4 | Counted taps at most. Taps past the cap still animate but add nothing. Two thumbs reach 14    |
|            | `strokeWeight`         | 2.4                      | One fast pass is worth 2.4 taps (to time, cadence and gratitude). Tuned on the phone          |
|            | `shakeWeight`          | 1.5                      | One shake reversal is worth 1.5 taps. Tuned on the phone                                      |
|            | `strokeUnlock`         | 5 fast passes            | About 5, as PRODUCT.md line 58 says. The pass thresholds are in §2                            |
|            | `shakeUnlock`          | 12 reversals             | In rhythm. The thresholds are in §2                                                           |
| Multiplier | `base`                 | 10                       | Gratitude per tap at ×1                                                                       |
|            | `cadenceWindow`        | 1.0 s                    | The multiplier reads the taps counted in the last second                                      |
|            | `multFreeRate`         | 2 a second               | At or below this, the target is ×1                                                            |
|            | `multPerRate`          | 0.55                     | Each tap a second above that adds this to the target                                          |
|            | `multMax`              | ×8                       | Reached at about 14.7 a second                                                                |
|            | `multRise`, `multFall` | 6 /s, 2.5 /s             | How fast the multiplier chases its target up and down                                         |
| Tiers      | ありがと               | 1                        | The first tap                                                                                 |
|            | 照れ                   | 90                       | A friend at 3 a second gets here at about 3 s                                                 |
|            | ドキドキ               | 320                      | Needs about 5 a second                                                                        |
|            | オーバーヒート         | 1,100                    | Needs one-finger mashing                                                                      |
|            | 昇天                   | 3,000                    | Needs two thumbs                                                                              |
| Effects    | `intensity`            | 0–1                      | Scales every effect (§3). It never touches the numbers above                                  |

### 1.5 Simulation

**Method.** A scratch Python script outside any repo. 1,000 runs per human profile. Each run picks a steady rate inside the band, and every gap between taps is jittered by ±22% (Gaussian). The bot taps exactly every 33 ms. The drain is integrated exactly between taps. Players keep going until the bar empties.

| Player              | Taps a second               | Combo length, s (p10–p90) | Taps counted | Total gratitude (p10–p90) | Multiplier at the end | Peak tier                    | When each tier arrives, s (median)                      |
| ------------------- | --------------------------- | ------------------------- | ------------ | ------------------------- | --------------------- | ---------------------------- | ------------------------------------------------------- |
| Calm friend         | 2–3                         | 3.4 (3.1–3.6)             | 9            | 90 (70–132)               | ×1.0                  | 照れ 55%, ありがと 45%       | ありがと 0.0 · 照れ 2.9                                 |
| Enthusiastic tapper | 5                           | 4.2 (4.1–4.4)             | 21           | 458 (363–558)             | ×2.4                  | ドキドキ 98%, 照れ 2%        | 照れ 1.2 · ドキドキ 3.0                                 |
| One-finger masher   | 8–9                         | 5.0 (4.8–5.1)             | 42           | 1,629 (1,389–1,882)       | ×4.3                  | オーバーヒート 100%          | 照れ 0.7 · ドキドキ 1.4 · オーバーヒート 3.5            |
| Two-thumb masher    | 12–14                       | 5.6 (5.5–5.8)             | 74           | 4,476 (3,758–5,235)       | ×6.9                  | 昇天 100%                    | 照れ 0.5 · ドキドキ 0.9 · オーバーヒート 1.8 · 昇天 4.0 |
| Bot                 | 30 (16 count)               | 6.1                       | 100          | 7,064                     | ×8.0                  | 昇天                         | 照れ 0.3 · ドキドキ 0.6 · オーバーヒート 1.4 · 昇天 2.9 |
| Stroker (extra)     | 5 passes a second           | 5.3 (5.0–5.6)             | 27 passes    | 3,356 (2,620–4,207)       | ×6.3                  | 昇天 71%, オーバーヒート 29% | 昇天 4.5                                                |
| Shaker (extra)      | 8 reversals a second (4 Hz) | 5.4 (5.1–5.7)             | 43 reversals | 3,555 (2,663–4,590)       | ×6.2                  | 昇天 76%, オーバーヒート 24% | 昇天 4.4                                                |

**Short combos.** One tap and stop: 1.8 s, 10 gratitude, ありがと. Three taps and stop: 2.2 s, 30 gratitude, ありがと.

**When the drain outruns a steady tapper** (it then takes more than their taps add, and the bar empties within about a second):

| Taps a second | 2.5   | 5     | 8.5   | 13    | 14    | 16 (the cap, and any bot) |
| ------------- | ----- | ----- | ----- | ----- | ----- | ------------------------- |
| Outrun at     | 0.8 s | 2.4 s | 3.6 s | 4.6 s | 4.7 s | 5.0 s                     |

**What the numbers say**

- **Friends get a warm thank-you.** Taps of 2–3 a second end at ありがと or 照れ, with the multiplier near ×1.
- **Each band lands on its own tier.** No 5-a-second run reaches オーバーヒート, and no 8–9 run reaches 昇天. 昇天 takes two thumbs.
- **Mashers get a real top.** A two-thumb masher spends 1.6 s in 昇天 before the bar empties.
- **The cap keeps bots in check.** A bot gets 0.5 s more and 1.6× a two-thumb masher's total, because only 16 taps a second count. The server applies the same cap (§5).
- **Stroke and shake follow the same arc** at vigorous but plausible rates. Their weights are first guesses, to be tuned on the phone (§2).

### 1.6 How the model meets each rule

| Rule (source)                                                                                                                               | How the model meets it                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "a **bar that drains**" and "runs DOWN, showing when you'll run out of time" (line 52; item 11)                                             | Only the drain moves the bar down. On screen it shows the time left if you stopped now, so it sinks even while a masher holds it full                                            |
| "Fast tapping wins some of it back" (line 52)                                                                                               | Each counted tap adds 0.20–0.30 of the bar, drawn as a small bump up on a bar that keeps sinking                                                                                 |
| "the drain keeps speeding up" (line 52)                                                                                                     | The drain doubles every 1.6 s                                                                                                                                                    |
| "after about 5 seconds it outruns anyone's tapping and the combo ends" (line 52)                                                            | At most 16 taps a second count, and the drain beats 16 × 0.20 at 5.0 s. Two-thumb combos end at 5.6 s, a bot's at 6.1 s                                                          |
| "Taps add time, with diminishing returns … Each tap adds less as the combo grows" (item 11)                                                 | Each tap's gain falls from 0.30 toward 0.20 as the count grows, on top of the faster drain                                                                                       |
| "A multiplier driven by tap speed scales each tap's gain" (item 11)                                                                         | Gratitude per tap is 10 × a multiplier set by the last second's taps, ×1 to ×8. It scales gratitude, not time                                                                    |
| "Each tap is one gratitude" (line 52, older)                                                                                                | Read through item 11: each tap still counts as one, and the tap count is recorded beside the total                                                                               |
| "The gratitude amount is always visible, with the multiplier next to it. Nothing sits on or over the heart, which is the control" (item 11) | The amount and multiplier are model outputs from the first tap on, and §3 places them above the heart, never on it. The heart is the tap target, with its hit area fixed at rest |
| "friends who tap a few times get a warm thank-you, and people who mash reach the wild upper tiers" (line 30)                                | Simulated: 2–3 a second ends at ありがと or 照れ, 8–9 at オーバーヒート, and 12–14 at 昇天                                                                                       |
| "Early taps are modest" (line 53)                                                                                                           | Tiers follow the amount, and every combo starts at ×1 and ありがと                                                                                                               |
| "about 5 fast passes unlock it" (line 58)                                                                                                   | `strokeUnlock` is 5; passes before it add nothing                                                                                                                                |
| "You have to lift your finger to tap again" (line 58)                                                                                       | A tap is a touch-down. A touch that has become a stroke can't tap until it lifts                                                                                                 |
| "No mixing" (line 61)                                                                                                                       | RUNNING·stroke and RUNNING·shake are one-way. Other inputs are ignored until the combo ends                                                                                      |
| "Hint before unlock" (line 62)                                                                                                              | The detectors report progress from 0 to 1 in READY and RUNNING·tap, and the heart's hint follows it                                                                              |
| "One arc, three looks" (line 63)                                                                                                            | All three methods feed one bar, one multiplier and one ladder through a per-event weight. Only the look differs (§3)                                                             |
| "Secrets are never collected" (item 22)                                                                                                     | Unlocks are never counted or shown as found. The method is recorded only for the server's plausibility check                                                                     |

## 2. Inputs on an iPhone in LINE's browser

LINE on iOS opens the app in its in-app browser, a WKWebView. Nothing here is trusted until the device checklist (§7.2) passes inside LINE.

### 2.1 Taps

- **Pointer Events on the stage.** Each finger fires its own `pointerdown` with its own `pointerId`, so two thumbs landing in the same frame count twice.
- **A tap counts at touch-down, not on lift.** That's lower latency, and a masher's thumbs overlap.
- **Hit test:** the heart's resting bounding box plus `hitMargin` on every side. It's computed at layout and on resize, and never read from the animated transform. The handler does no layout reads. It passes `{ kind: 'tap', t: event.timeStamp }` to the logic and returns.
- **Touch-downs outside the hit area** count for nothing, but they can still start a stroke.

### 2.2 Strokes (anywhere on the screen)

| Rule         | Value                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Where        | Anywhere on the screen, over the heart and the HUD included: the Vita grip's thumb lands wherever it lands (line 59)   |
| Which finger | The first touch to travel past the 12 px tap slop becomes the stroke finger. Other touches are ignored while it's down |
| A pass       | A run along the axis with more travel, at least 70 px, that ends at a reversal (12 px back the other way) or at a lift |
| Fast         | Average speed over the pass of at least 0.45 px/ms                                                                     |
| Unlock       | 5 fast passes, with no gap over 0.5 s. A slow pass, a longer gap, or a tap resets the streak                           |
| Cap          | 10 passes a second                                                                                                     |
| Lift to tap  | The stroke finger can't tap until it lifts                                                                             |

### 2.3 Shake

- **Signal:** `devicemotion`'s `acceleration`, with gravity removed. If only `accelerationIncludingGravity` exists, subtract a low-pass estimate of gravity.
- **A reversal** is when the dominant axis flips sign after a peak of at least 12 m/s², 70–400 ms after the last reversal. Twelve in rhythm unlock shake. Hint progress is reversals out of 12, and it decays when the rhythm breaks. The cap is 14 a second.
- **Permission.** iOS 13 and later needs `DeviceMotionEvent.requestPermission()`, called inside a tap's `pointerup` or `click` (a touch-down doesn't count as a gesture). Whether LINE's WKWebView shows the prompt is unknown: the host app has to answer WebKit's request, and LINE may not.
- **Who asks.** The heart screen never prompts: a system dialog mid-combo would stop the game and give the hidden method away. Motion is one app-wide permission, asked once from a tap by the first feature that needs it. The tray's zipper already reacts to shakes (build-contract item 30). The heart reads the result (§8, decision 4).
- **Fallback.** If the answer isn't `granted` within 3 s, or no `devicemotion` event arrives within 1 s of granting, motion is `unavailable`. The shake detector stays off, and nothing on screen mentions shake. PRODUCT.md line 64 says "the method picker hides it", but there's no visible picker, since the methods are found by trying (line 62). So hiding means the detector is off.
- **Device test** (§7.2 row 4): a dev-page key asks for motion inside LINE, then in Safari as a control. Record whether a prompt appeared, what `requestPermission()` returned, events per second, and the peak acceleration of a hard shake. Android LINE needs no prompt, but gets the same test.

### 2.4 Keep the page still

| Problem                           | Fix                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scroll and bounce                 | The screen is fixed and fills the viewport. `overflow: hidden` and `overscroll-behavior: none` on the root, plus a non-passive `touchmove` listener on the stage that prevents the default |
| LINE's own swipe gestures         | The same. Test whether a hard downward stroke minimizes or closes the LIFF view (§7.2 row 2)                                                                                               |
| Double-tap zoom and pinch         | `touch-action: none` on the stage, `maximum-scale=1` in the viewport, and the default of `gesturestart` prevented                                                                          |
| Text selection                    | `user-select: none` (and its `-webkit-` form) on the whole screen                                                                                                                          |
| Long-press callout, tap highlight | `-webkit-touch-callout: none`, a transparent `-webkit-tap-highlight-color`, `contextmenu` prevented, and images and SVG not draggable                                                      |

### 2.5 Haptics

iOS WebKit has no `navigator.vibrate`. One workaround is worth a device test: Safari 17.4 and later tick the Taptic Engine when an `<input type="checkbox" switch>` toggles, and toggling it through its label inside a tap handler may work in LINE's web view too. If it does, tick on tier-ups and at the end, never on every tap. Android uses `navigator.vibrate` at the same moments. Nothing depends on haptics.

### 2.6 Sound

- **Off by default.** A mute key sits in the top bar (Phosphor `speaker-simple-slash` and `speaker-simple-high`, bold, filled when on). The choice persists on the device.
- **Unlock.** One `AudioContext`, created and resumed inside the `pointerup` of the tap that turns sound on. Samples decode once.
- **The silent switch is respected:** `navigator.audioSession.type = 'ambient'` where it exists. At most 8 voices. Tap sounds pitch up with the multiplier.

## 3. Rendering

### 3.1 The choice: the heart and HUD in the DOM, and one Canvas 2D layer for everything that multiplies

| Option                             | For                                                                                                                                               | Against                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM and CSS transforms only        | A crisp vector heart and text; the compositor handles transform and opacity                                                                       | 100+ minis, sweat drops and puffs means 100+ elements whose transforms change every frame. Spawning 6–10 per tap at 16 taps a second churns the DOM mid-mash          |
| **Canvas 2D for effects (chosen)** | One element. Sprites are pre-rendered once to offscreen canvases, and drawing ~150 a frame is cheap on any recent iPhone. No layout or style work | Text and the heart would lose crispness and accessibility, so they stay in the DOM                                                                                    |
| WebGL (PixiJS)                     | Headroom for thousands of particles                                                                                                               | A dependency of 200 KB or more on the app's first load. iOS drops WebGL contexts when LINE goes to the background, which needs restore code. Our counts don't need it |

- **The layers.** The heart is SVG in the DOM, animated only by transform and opacity. The HUD is DOM: the bar as a `scaleX`, and the amount and multiplier in tabular figures above the heart. Pop-ins are a pool of 8 DOM nodes. One full-screen canvas carries minis, sweat, steam, glints, focus lines and motion lines.
- **Screen shake** moves the canvas and the pop-in layer, never the heart ("During 昇天 the big heart stays in place", item 23).
- **Budget:** 60 fps during a 16-a-second mash at intensity 1 with 150 live sprites. Per frame, the logic takes under 0.5 ms and the canvas under 4 ms. The canvas renders at `min(devicePixelRatio, 2)`. Pools are fixed (minis 120, sweat 30, steam 16, pop-ins 8), and the oldest is recycled, so nothing allocates on a tap. Collisions use a coarse grid.
- **Materials move** (build-contract item 12: "Domes and stickers share one moving light"). The heart's gloss is a highlight positioned from the app's one `LightSource` (§4). Each tap's squash shifts it too, so the gloss moves on every beat and never sits static.
- **No grid paper** (item 11). **Icons come only from Phosphor** (item 18).

### 3.2 Effects: one arc, three looks

| Tier           | Every method                                                                                                                                                                           | Tap                                                        | Stroke                                                 | Shake                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| ありがと       | A heartbeat on each event, one small rising ♡, キラキラ glints                                                                                                                         | Squash under the finger, a ring from the touch point       | The heart leans with the stroke                        | The heart sways with the wrist                                                |
| 照れ           | 赤面線 blush lines, one 汗 drop, pop-ins begin                                                                                                                                         | A deeper squash; the blush pulses per tap                  | Faint motion lines along the stroke                    | A jelly wobble                                                                |
| ドキドキ       | Heart eyes, 集中線 behind the heart, a light screen shake, mini hearts from every event (item 23), a slow sweat drip (item 35)                                                         | Minis spray from under the finger                          | Minis fling along the stroke; the motion lines thicken | The heart pops free and ricochets off the edges, knocking minis off the walls |
| オーバーヒート | Full blush, steam from the head (always with the blush: alone it reads as rage, references.md), trembling, a heavy shake, sweat that piles at the bottom, 「ハァ…ハァ…」-style pop-ins | Harder sprays; each tap flings nearby minis away (item 35) | A speed field of streaks                               | Faster ricochets, with a squash at each wall                                  |
| 昇天           | The soul wisp, beams of light, 集中線 at full, and a rain of minis from the top into the same pile (item 23)                                                                           | The heart stays put, dazed                                 | The streaks turn into light beams                      | The heart floats back to its rest spot and stays (item 23)                    |

**The ceiling** (line 55). Allowed: "blushing, steam, heart eyes, trembling, 「haa… haa…」, the nosebleed gag, screen shake, rising ♡". Never: "bodies, undressing, explicit words, moaning audio". The nosebleed is §8 decision 6.

### 3.3 One dial

`intensity`, from 0 to 1, scales every effect: particle counts and speeds, shake amplitude, blush density, steam volume, and the pop-in rate and size. It also decides which bank lines may appear, since each line carries a `minIntensity`. The default is 0.7. The presentation setting (a dev-page toggle, or `?presentation=1`) sets it to 1. The dial never changes the numbers in §1.4.

### 3.4 Reduced motion

Under `prefers-reduced-motion: reduce`:

- no screen shake and no ricochet (shake mode gets a small wobble in place)
- minis and sweat appear in the pile and fade, instead of flying
- focus lines and motion lines are static
- pop-ins fade without flying

The bar, amount, multiplier and tiers don't change. A polite live region announces each tier-up by name, and the total at the end.

## 4. Architecture

The UI framework is **React** (decided 2026-09-25). The heart doesn't know about it.

| Package               | Holds                                                                                                                                                                       | Depends on |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `packages/heart-core` | The tuning, the combo logic, the stroke and shake detectors, and `replayCombo`. No DOM and no timers: every call takes a time, so tests use a fake clock by passing numbers | nothing    |
| `packages/heart-view` | Input, motion, audio, haptics, the renderer, and `mountHeart`                                                                                                               | heart-core |
| `apps/web`            | The React app (the LIFF app), with `GratitudeHeart`, a thin wrapper                                                                                                         | heart-view |
| `apps/api`            | The record endpoint, which runs `replayCombo` on every record                                                                                                               | heart-core |

Public interface, as signatures only:

```ts
// heart-core
export type Method = "tap" | "stroke" | "shake";
export type Tier = 0 | 1 | 2 | 3 | 4; // ありがと … 昇天
export type EndReason = "empty" | "hidden" | "closed" | "cap";
export interface Tuning {
  // one field per row of §1.4
  version: string;
  barStart: number;
  drainStart: number;
  drainDoublingS: number;
  gainFirst: number;
  gainFloor: number;
  gainDecay: number;
  maxComboS: number;
  hitMarginPx: number;
  rateCap: number;
  rateBurst: number;
  strokeWeight: number;
  shakeWeight: number;
  strokeUnlock: number;
  shakeUnlock: number;
  base: number;
  cadenceWindowS: number;
  multFreeRate: number;
  multPerRate: number;
  multMax: number;
  multRise: number;
  multFall: number;
  tiers: readonly [number, number, number, number, number];
}
export type Input =
  | { kind: "tap"; t: number }
  | { kind: "pass"; t: number; fast: boolean }
  | { kind: "reversal"; t: number; rhythmic: boolean };
export interface ComboState {
  phase: "ready" | "running" | "ended";
  method: Method;
  bar: number;
  barShown: number; // barShown: time left if you stopped now, 0–1
  events: number;
  total: number;
  mult: number;
  peakMult: number;
  tier: Tier | null;
  hint: { stroke: number; shake: number }; // 0–1
}
export interface ComboResult {
  method: Method;
  events: number;
  total: number;
  peakMult: number;
  peakTier: Tier;
  durationMs: number;
  eventTimes: number[];
  endReason: EndReason;
  tuningVersion: string;
}
export type Effect =
  | { kind: "counted"; method: Method; gain: number; timeAdded: number }
  | { kind: "ignored"; why: "cap" | "mixing" }
  | { kind: "tier"; tier: Tier }
  | { kind: "commit"; method: "stroke" | "shake" }
  | { kind: "ended"; result: ComboResult };
export interface Combo {
  readonly state: Readonly<ComboState>;
  input(e: Input): Effect[];
  advance(now: number): Effect[]; // each frame: drains, ends when empty or at the cap
  end(now: number, reason: EndReason): Effect[];
}
export declare function createCombo(tuning?: Partial<Tuning>): Combo;
export declare function replayCombo(
  r: ComboResult,
  tuning: Tuning,
): { total: number; tier: Tier; ok: boolean; why?: string };

// heart-view
export interface LightSource {
  subscribe(fn: (x: number, y: number) => void): () => void;
}
export interface HeartOptions {
  tuning?: Partial<Tuning>;
  intensity?: number;
  presentation?: boolean;
  light: LightSource;
  motion: "granted" | "unavailable" | "unknown";
  sound: boolean;
  bank: PopInLine[];
  sounds?: SoundBank; // §6
  onEnd(total: number, result: ComboResult): void;
}
export interface HeartHandle {
  setIntensity(v: number): void;
  setSound(on: boolean): void;
  end(reason: EndReason): void;
  destroy(): void;
}
export declare function mountHeart(host: HTMLElement, options: HeartOptions): HeartHandle;
```

- **heart-view watches the page itself.** On `visibilitychange` to hidden, or `pagehide`, it ends a running combo and calls `onEnd` synchronously, so the app can send within the same event.
- **The React wrapper** mounts in an effect, passes prop changes to `setIntensity` and `setSound`, and destroys on unmount.

## 5. Recording contract

### 5.1 The client

1. On ENDED, `onEnd` hands the app the result.
2. The app stores the record on the device under its idempotency key, then POSTs it with `fetch` and `keepalive: true`. The body stays under 4 KB; keepalive allows 64 KB.
3. A hidden or closed page ends a running combo (reason `hidden` or `closed`) and sends in the same event.
4. On a 2xx, the stored copy is deleted. It's also deleted on a 409 that returns the stored result for the same key. On the next app open, any stored copy is sent again, and the key makes repeats harmless.

### 5.2 Payload

| Field                  | Type                                 | Notes                                                                                      |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `idempotencyKey`       | string                               | A UUID v4 from `crypto.randomUUID()`, made at the first counted event                      |
| `handoffId`            | string                               | The hand-off being thanked. Each carries at most one gratitude (item 33)                   |
| `method`               | `tap`, `stroke` or `shake`           |                                                                                            |
| `events`               | integer                              | Counted taps, passes or reversals: the tap count, sent beside the total                    |
| `total`                | integer                              | The gratitude, with the multiplier                                                         |
| `peakMult`, `peakTier` | number, 0–4                          |                                                                                            |
| `durationMs`           | integer                              | From the first counted event to the end                                                    |
| `eventTimes`           | integer[]                            | Milliseconds after the first counted event. At most 120 entries (the cap allows about 100) |
| `endReason`            | `empty`, `hidden`, `closed` or `cap` |                                                                                            |
| `tuningVersion`        | string                               | Picks the tuning the server replays with                                                   |

The caller's LINE Login identity travels in the `Authorization` header, and the server verifies it with LINE.

### 5.3 The server's plausibility checks

| Check  | Rule                                                                                                                                  | On failure                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Who    | The caller is the hand-off's receiver, and the gift was accepted                                                                      | 403                                                                                                         |
| Once   | Nothing is recorded for this hand-off yet                                                                                             | Same key: 200 with the stored result. Another key: 409                                                      |
| Shape  | `events` equals the length of `eventTimes`. The times ascend from 0, and `durationMs` is at most 8,000 and no less than the last time | 422                                                                                                         |
| Rate   | No one-second window holds more than cap + burst: 20 taps, 12 passes or 16 reversals                                                  | 422                                                                                                         |
| Replay | `replayCombo` runs the named tuning over `eventTimes`. Every event must land before the bar empties                                   | 422 if not. Otherwise the replayed total and tier are stored, and a gap over 1% from the client's is logged |

The server computes the artist's 20% when the giver isn't the sticker's artist (item 34).

### 5.4 Telling the giver

- **One LINE message from the Official Account, combined.** The account sends 500 pushes a month; confirm the figure with the Messaging API's `GET /v2/bot/message/quota`. Multicast saves nothing, since each recipient counts.
- **Combining.** The first gratitude to a giver in a 6-hour window pushes at once. Later ones in that window fold into one digest when it closes: the latest thanker, how many others, and the combined amount. No money words.
- **Quota guard.** Past 80% of the month's quota, the window becomes a day, with one digest at 20:00 JST. At 100%, pushes stop and the in-app animation carries it.
- **In the app.** The next time the giver opens the app, `GET /api/gratitude/unseen` returns what arrived. The app plays each one as the replay on its sticker, then marks it seen.

### 5.5 On-chain, later (interface only)

```ts
export interface GratitudeEntry {
  handoffId: string;
  stickerId: string;
  from: `0x${string}`;
  to: `0x${string}`;
  artist: `0x${string}` | null;
  total: bigint;
  artistShare: bigint;
  method: Method;
  recordedAt: number;
}
export interface GratitudeLedger {
  record(entry: GratitudeEntry): Promise<{ txHash: `0x${string}` }>; // once per handoffId; a repeat returns the first
}
```

The relayer writes each entry once, after the server has stored it. The interface never shows any of this.

## 6. Assets to make

| Asset                  | How many                                                   | Format                                                                                 | Tone and content                                                                                                                                                                                                                                                                              | Who makes it                                                                                                                      | Time                     |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Pop-in bank            | 30 lines per tier (150), plus 12 each for stroke and shake | JSON matching `PopInLine`                                                              | Japanese manga symbols and onomatopoeia, each with a short English gloss, since the interface is English. Tier 1 is warm and polite, 2 shy, 3 heart-racing, 4 overheated but deniable, and 5 reverent (尊い, 昇天). Never explicit words. The boldest lines get `minIntensity` of 0.8 or more | Drafted by Claude from this row. A native speaker on the team checks the Japanese, and tiers 4–5 get approved against the ceiling | 1.5 h, plus 0.5 h review |
| Sounds                 | About 21: 3 tap pops per tier, 5 tier-up stings, 1 end cue | Mono AAC (.m4a), 48 kHz, under 30 KB each, peaks at −1 dBTP                            | Instruments and foley only: pops, bells, a heartbeat thump, a kettle hiss, a chime swell. No human voice, never moaning audio                                                                                                                                                                 | Made with an sfxr-style generator, or recorded by the team                                                                        | 2 h                      |
| The heart              | 1 outline, 5 faces (one per tier), blush lines             | SVG path data in a TypeScript data file                                                | The app's sticker ink line                                                                                                                                                                                                                                                                    | The team's designer, or the prototype's heart paths                                                                               | 2 h                      |
| Small sprites          | Mini heart, sweat drop, steam puff, glint, soul wisp       | SVG paths, pre-rendered to offscreen canvases at load                                  | The same line                                                                                                                                                                                                                                                                                 | The team's designer                                                                                                               | 1.5 h                    |
| Focus and motion lines | —                                                          | Generated at runtime                                                                   | —                                                                                                                                                                                                                                                                                             | —                                                                                                                                 | —                        |
| Icons                  | X, speaker on and off                                      | Phosphor (MIT), fetched from `@phosphor-icons/core` and inlined, never drawn (item 18) | Bold, filled when active                                                                                                                                                                                                                                                                      | —                                                                                                                                 | 0.1 h                    |

- **Bank types:** `PopInLine { tier: Tier; method?: Method; jp: string; en: string; minIntensity: number }` and `SoundBank { tap: Record<Tier, string[]>; tierUp: Record<Tier, string>; end: string }`.
- **How pop-ins are drawn:** from a shuffle bag per tier, so no line repeats within a combo. At most one appears every 0.35 s, and each lives 0.6–1.2 s.

## 7. Build tasks

### 7.1 In order

| #   | Task                                                                                                                                                                                                  | Hours | Done when                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `heart-core` package, tuning as data                                                                                                                                                                  | 0.5   | `pnpm -F heart-core test` runs                                                                                                                                                              |
| 2   | Combo logic: drain, gains, cap, multiplier, tiers, end reasons                                                                                                                                        | 2     | Fake-clock tests: one tap ends at 1.82 s ± 0.01. The seeded §1.5 profiles match within ±0.1 s and ±3%. A 30-a-second input counts at most 16 a second plus the burst. Nothing runs past 8 s |
| 3   | Stroke and shake detectors, hints, no mixing, lift to tap                                                                                                                                             | 2     | Synthetic traces: 5 fast passes unlock and 4 don't. A slow pass resets. Taps after a commit return `ignored: mixing`                                                                        |
| 4   | `replayCombo`                                                                                                                                                                                         | 0.5   | Replaying every test combo reproduces its total                                                                                                                                             |
| 5   | Dev page `/dev/heart`: a slider per tuning row; live bar, multiplier and tier; outrun time per rate; "play a profile" keys; intensity and presentation toggles; the frame-time overlay; tuning export | 1.5   | Moving `drainStart` changes the single-tap time shown                                                                                                                                       |
| 6   | Input: Pointer Events, the heart's fixed hit area, multi-touch, the page kept still                                                                                                                   | 1.5   | §7.2 rows 2 and 3 pass                                                                                                                                                                      |
| 7   | Renderer: DOM heart and HUD, one canvas, pools, the gloss on the shared light                                                                                                                         | 2     | 60 fps on the phone under a synthetic 30-a-second input                                                                                                                                     |
| 8   | The tap look across all five tiers, with the dial and reduced motion                                                                                                                                  | 3     | Each tier reads differently at intensity 0.3, 0.7 and 1                                                                                                                                     |
| 9   | Stroke and shake looks, and their hints                                                                                                                                                               | 2.5   | Hints show from pass 2 and from 3 reversals                                                                                                                                                 |
| 10  | Motion adapter and fallback                                                                                                                                                                           | 1     | `unavailable` turns the shake detector off, and nothing on screen mentions shake                                                                                                            |
| 11  | Sound (unlock, mute, banks) and the haptic probe                                                                                                                                                      | 1.5   | Silent until switched on; plays from the next tap                                                                                                                                           |
| 12  | Pop-ins: shuffle bags and `minIntensity`                                                                                                                                                              | 1     | No repeats within a combo                                                                                                                                                                   |
| 13  | Client recording: keepalive, the stored copy, resend on open                                                                                                                                          | 1.5   | §7.2 row 5 passes                                                                                                                                                                           |
| 14  | Server endpoint: checks, replay, idempotency, the artist's share                                                                                                                                      | 2     | Tests: a repeated key returns 200 and the same result; a second key returns 409; 40 taps in a second return 422                                                                             |
| 15  | Telling the giver: push digest job, quota guard, the unseen feed                                                                                                                                      | 2     | Two thanks within 6 hours make one push                                                                                                                                                     |
| 16  | The thin React wrapper, `GratitudeHeart`                                                                                                                                                              | 0.5   | Mounts, follows prop changes, and unmounts with no listeners left                                                                                                                           |
| 17  | On-device pass (§7.2)                                                                                                                                                                                 | 1.5   | Every row passes or has its fallback in place                                                                                                                                               |

That's 26.5 hours of build, and the §6 assets (about 7.5 hours) run in parallel.

**If time runs short, cut in this order.** SCOPE.md §6 lists stroke as MVP and shake as Stretch.

1. The haptic probe (half of task 11) and the push digest (task 15). Until the quota guard matters, send one push per gratitude.
2. Shake: its detector, its look and its hint (parts of tasks 3, 9 and 10). The motion prompt test still runs, because the tray's zipper needs it.
3. Sound (the rest of task 11).
4. Stroke (the rest of tasks 3 and 9).

What's left is the tap combo through all five tiers, with recording and the server's replay check. That's tasks 1, 2, 4–8, 12–14, 16 and 17, about 17.5 hours.

### 7.2 On-device checklist: an iPhone, inside LINE

LINE's web view may not allow Safari's Web Inspector, so the dev page shows its own overlay: frame times, counted events, the motion state and the last server record.

| #   | Check                                                                                                            | Passes when                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | 60 fps while mashing: two thumbs for 10 s at intensity 1                                                         | Under 2% of frames over 20 ms, and none over 50 ms                                   |
| 2   | Nothing scrolls or zooms: hard strokes both ways, double taps, a pinch, long presses on the heart and the amount | No scroll, bounce, zoom, selection or callout, and LINE neither minimizes nor closes |
| 3   | Taps from two thumbs count: 20 alternating taps, slow and then fast                                              | The counter shows 20                                                                 |
| 4   | The motion prompt appears: ask in LINE, then in Safari                                                           | The prompt, the answer and events per second are recorded, and the fallback is right |
| 5   | The total survives closing: close with the × mid-combo, and swipe LINE away mid-combo                            | After reopening, the server holds each record, with reason `closed` or `hidden`      |
| 6   | Sound                                                                                                            | Silent at the start, plays after the key, and respects the silent switch             |
| 7   | Haptic probe                                                                                                     | Whether the switch trick ticks inside LINE is recorded                               |
| 8   | Reduced motion                                                                                                   | No shake and no flying particles                                                     |
| 9   | The Vita grip: a thumb stroking anywhere, 5 fast passes                                                          | Stroke unlocks, and no LINE gesture fires                                            |

## 8. Open decisions

Each default applies if there's no answer, so the build never waits.

| #   | Decision                                                                                     | Default                                                                                  | Alternative                             |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Gratitude per tap at ×1                                                                      | 10, so the numbers climb like Death Stranding's likes                                    | 1, matching "Each tap is one gratitude" |
| 2   | Where taps count                                                                             | On the heart, with the hit area fixed at rest (item 11: "the control")                   | Anywhere on the stage                   |
| 3   | The UI framework                                                                             | **Decided: React** (2026-09-25). The heart stays framework-agnostic                      | —                                       |
| 4   | Where the motion prompt is asked                                                             | Once, app-wide, from a tap in the first feature that needs it; never on the heart screen | A quiet motion key on the heart screen  |
| 5   | Intensity                                                                                    | 0.7 day to day, and 1 for the presentation                                               | —                                       |
| 6   | The nosebleed gag: line 55 allows it, and references.md advises keeping it out of the ladder | In, only at オーバーヒート and up, and only at intensity 0.8 or more                     | Out                                     |
| 7   | A page hidden mid-combo                                                                      | Ends the combo and records it at once                                                    | Pauses the combo                        |
| 8   | The server's replay disagrees with the client                                                | Record the replayed total                                                                | Reject the record                       |
| 9   | Combining pushes                                                                             | One push, then a digest per 6-hour window; daily past 80% of the quota                   | A daily digest only                     |
| 10  | The giver's push shows the amount                                                            | Yes                                                                                      | The thanker's name only                 |
| 11  | Stroke and shake weights                                                                     | 2.4 and 1.5 until the phone test                                                         | —                                       |
