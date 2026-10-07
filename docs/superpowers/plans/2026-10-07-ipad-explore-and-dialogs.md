# iPad Explore and Dialogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On an iPad, Explore's pile keeps its size with This week beside it; the sticker detail, Giving, Receiving and the Shop sit in a centered column; the Gratitude Mini-game and its replay scale with their stage; and a rotation loses neither Explore's place nor the sealing sticker. LINE's short sheet holds all of them.

**Architecture:** The numbers live in pure helpers with unit tests: `pileScale` (pileLayout.ts), `exploreColumns`, `placeOf` and `scrollToKeep` (scrollPlace.ts), `heartRest`, `liveScale` and `replayScale` (stageLayout.ts), the replay feed's reach, and `toScreenAxes` (ui/screenAxes.ts, spec section 6). Hooks and observers apply them on resize: `usePileScale`, `useExploreColumns`, `useScrollPlace`, and the seal ceremony and the replay watching their own boxes. The rest is CSS keyed on the foundations' `data-width` and `data-height` marks, `--content-w` and `--key-min-w`.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS (container query units on three full-screen dialogs), Playwright WebKit and Chromium for the browser checks.

Start once ad0ll has signed off the spec and the foundations plan has merged.

---

## Decisions (awaiting ad0ll's sign-off)

From the spec's decisions 13, 14 and 15, each recommended there. Every value is a starting value, tuned from Task 16's screenshots.

13. **The pile keeps its size.**
    1. `PILE_MAX_SCALE` 1.5: a pile unit is the pile's width over 360 units, at most 1.5 px. Past that each day's heap stays 540 px wide and centered; its perforation still runs across the pile, its date badge sits at the heap's left, and the name tags scale with the heap.
    2. The search, the view switch, search results and This week's rows cap at the heap's full width, 540 px, and center, so their edges line up with the heap's.
    3. This week sits beside the pile from `TWO_COLUMNS_MIN_WIDTH` 960 px of Explore in regular width: 13-inch portrait and every landscape iPad. The search heads the pile's column, This week fills a 300–400 px column beside both, and the view switch goes. Search results still replace both. This week comes first for keys and screen readers, since the pile pages on without end.
    4. The lifted sticker: in regular width a card at `--content-w`, centered, rising 16 px as it fades in. At every size its sticker is at least 210 px and at least `LIFT_PILE_UNITS` 160 pile units at the pile's scale, so it's never smaller than its pile copy: 240 px at 1.5, and phones keep 210.
    5. Rotating keeps your place: the day or sticker nearest the view's top stays the same share of itself below the top.
    6. Not in this plan: days side by side, the spec's later option.
14. **Columns** (the foundations plan does sheets and ticket cards; it left these to this plan).
    1. The sticker detail: its page column at `--content-w`, its sticker 320 px in regular width (216 on phones). At every size the facts line lays its facts and Timelapse out as one wrapping row, each centered on it, so "BY @name" no longer drops below the others.
    2. Giving, Receiving and the gift received notice: in regular width, a phone's page (`--content-w` wide and at most `--ph-h` tall) in the middle of the screen, so the sticker and its sheet keep a phone's distance instead of the screen's. Giving's sheets and the Accept sheet sit at that page's foot, which is the screen's foot on screens up to 844 px tall; on taller ones they float `--page-y` above it, where spec decision 14 keeps bottom sheets at the screen's foot. That departure is ad0ll's call: the spec's way drops their `--sheet-lift` (Tasks 12 and 13), leaving them at the screen's foot under the centered page.
    3. The give sheet's picker in regular width: as many tiles a row as fit at 76 px, five in a 520 px card. Phones keep four.
    4. The receive dialog's pull-tab hint follows the stage instead of sitting at `top: 530px`. Under a two-line heading, as phones show it, it lands where it did.
    5. The sealed card's regular width is the foundations plan's (`SealedCard.css`). This plan only measures the sheet and the card again when the screen turns (Task 11), and checks that the sticker lands on the card's slot in regular width (Task 16).
    6. The Shop: its column at `--content-w`, the reserve tickets key at its own width (`--key-min-w` at least), and swatches 128 px (136 with their tile) in regular width, so the fourth runs past the column's edge as it runs past a phone's.
15. **The Mini-game stays full screen.**
    1. The live game's scale is 1 on phones. In regular width it's the stage's smaller side over the phone stage's (390 × 741), up to `MAX_LIVE_SCALE` 1.5. On a stage under `FULL_SCALE_HEIGHT` 600 px tall it's the height over 600: LINE's sheet with a header, and an iPhone SE inside LINE (about 375×591, short by spec decision 3) at 0.985. Lettering, pop-in words, particles, mini hearts, the start hint and the big heart's widest (232 px × scale) follow it (ad0ll's call: the heart grows with the stage, up to 1.5×). The scale is read as the screen opens; a rotation re-lays the stage and keeps it.
    2. The touch rules scale with it, so the game plays the same at any size: a first tap's slop, a stroke's least run, turn and fast speed, and the drag that counts as a try at stroking. A replay plays them at the scale its recording's stage did. The shake detector's thresholds stay: a shake is the device's own motion (m/s² and °/s), which no screen changes, and what a shake does on screen (the loose heart's launch, its kicks, the hard hit that dents a wall) already scales with the stage. A heavier device may want `minPeak` lower; Task 17 asks.
    3. In regular width the top band, the HUD and the receipt keep to `--content-w`, centered.
    4. The speed lines cover any stage: a square as wide as the stage's diagonal, never under the 1100 px they're drawn at.
    5. The heart leaves room under it on a short stage: the start hint's (`LIVE_FRAME.below` 80 px) and a replay's mini-heart floor (`REPLAY_FRAME.below` 48 px).
    6. The Gratitude replay's scale is its heart's width over a phone's live heart (226 px), so a wide, short card no longer magnifies the lettering; phone cards keep today's scale, and the stage stays 300 px tall. Recorded inputs are drawn in alike toward the heart where needed, so the farthest lands `STAGE_INSET` 8 px inside the stage and a stroke keeps its shape. On a resize the engine re-lays the heart, HUD and walls as it does today, and each input still to come lands by the heart where it is then; the lettering keeps the scale it started with.
    7. Device tilt and motion are read in the screen's axes (`toScreenAxes`): the shared light, the heart's sway with the loose heart's kicks, and the tray zipper's swing.

With no decision: the seal ceremony measures the sheet and the card again on resize, and the Mini-game, the receive dialog and the gift received notice get short-height passes, which count as bug fixes on an iPhone SE inside LINE (spec decision 3).

## Dependencies

- **Foundations plan, merged first:** `useSizeClass()` (compact and tall until the frame is measured, as in happy-dom) and `sizeClassOf(width, height, framed)` from `apps/frontend/src/app/sizeClass.ts`; `data-width` and `data-height` on `.phone`; in `styles/tokens.css`, `--content-w` (520px), `--key-min-w` (232px), `--shadow-float`, and `--foot-inset`, the home indicator's safe area under a layer that reaches the screen's foot (0 inside `.screen`); and the regular sheet rule in `ui/sheet.css`, `:where(.phone[data-width="regular"]) .bottom-sheet`, which floats a sheet at `--content-w`, `bottom: var(--sheet-lift)` over its layer's foot, sliding in by `--sheet-away` (`calc(100% + var(--sheet-lift))`). Its lift defaults to `calc(var(--gutter) + var(--foot-inset, 0px))`; a sheet placed higher sets `--sheet-lift`, never `bottom` or `--sheet-away`. On a sheet, `--sheet-foot-inset` is what its padding adds over the home indicator (0 in regular width). Its "for the other plans" list leaves to this plan the Mini-game's receipt, the receive dialog's end screens, the gift received notice, the sticker detail, the Shop's hero and Explore's lifted sticker. The sealed card's regular width is the foundations plan's own; this plan doesn't touch `SealedCard.css`. Foundations also edits `receive-gift-dialog.css` and `Giving.css` (`--key-min-w`, the Accept sheet's `--sheet-foot-inset`); this plan's rules sit beside those lines.
- **Drawing sheet plan:** `DrawingScreen.tsx`'s `sheetBox()` keeps returning the sheet's box on screen, now inside `.ink-area`; Task 11 passes it to the seal ceremony as a one-line prop. Both plans edit `DrawingScreen.tsx`, so rebase over whichever lands first.
- **Board plan:** the board is a scaled panel (reference 390×651, spec decision 10) whose stickers are laid out in screen px through the panel's scale. The sticker detail lifts a sticker off, and flies it back to, the box `useDetailLift` measures on the board (`getBoundingClientRect` and `offsetWidth`), so it follows the panel at any scale with no change here; Task 16 checks the fly-back. Both plans edit `sticker-board/tray/zipper.ts` and `zipper.test.ts`: the board plan its `opens` option, `renderChain`, `geometry()` and `reshape()`, with a test block of its own; this plan (Task 2) only the import, the last lines of `onMotion` that read the motion, and the swing tests. Whichever lands second rebases over the other.
- **Drawing screen and Pencil plan, which lands after this one:** its Task 6 moves `SlidingTabs` out of `explore/ExploreScreen.tsx`, and its `.sliding-tabs` rules out of `ExploreScreen.css`, into `ui/`. This plan leaves `SlidingTabs` and those rules where they are and only changes where the view switch renders (Task 4), so that move takes this plan's version of both files.
- **Ports:** this plan's checks use 5193 and 8793. The drawing sheet plan takes 5191 and 8791 and the board plan 5194 and 8794, beside this one; the Pencil plan 5192, foundations 5195 and the LINE sheet plan 5196 run at other times.

## Files

- Create `apps/frontend/src/ui/screenAxes.ts` and its test; modify `ui/testing.ts` (`turnScreen`)
- Modify `apps/frontend/src/stickers/light.ts`, `light.test.ts`; `apps/frontend/src/gratitude/phoneMotion.ts`, `phoneMotion.test.ts`; `apps/frontend/src/sticker-board/tray/zipper.ts` (its motion-reading lines only), `zipper.test.ts`
- Modify `apps/frontend/src/explore/pileLayout.ts`, `pileLayout.test.ts`, `StickerPile.tsx`, `sticker-pile.css`, `ExploreScreen.tsx`, `ExploreScreen.css`, `LiftedSticker.tsx`, `lifted-sticker.css`; create `usePileScale.ts`, `exploreColumns.ts` and its test, `scrollPlace.ts` and its test
- Modify `apps/frontend/src/sticker-board/StickerDetail.tsx`, `sticker-detail.css`
- Modify `apps/frontend/src/gratitude/stageLayout.ts`, `stageLayout.test.ts`, `miniGameEngine.ts`, `miniGameEngine.test.ts`, `gratitude-mini-game.css`, `tierBackground.ts`, `tierBackground.test.ts`; in `gratitude/replay/`: `replayFeed.ts`, `replayFeed.test.ts`, `mountGratitudeReplay.ts`, `mountGratitudeReplay.test.ts`, `replayEngine.test.ts`, `testing.ts`
- Modify `apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.test.tsx`, and `sticker-creation/DrawingScreen.tsx`
- Modify `apps/frontend/src/receiving/receive-gift-dialog.css`; `apps/frontend/src/giving/give-sheet.css`, `Giving.css`, `gift-received-notice.css`, `GiftReceivedNotice.tsx`
- Modify `apps/frontend/src/shop/ShopScreen.tsx`, `ShopScreen.css`
- Modify `DESIGN.md` and `docs/gratitude-mini-game-design-doc.md`. No PRODUCT.md sentence becomes false here, and no user-facing string changes, so the i18n catalog doesn't either.

## Setup

- [ ] From the main checkout, once the foundations plan is on main: `git worktree add -b feat/ipad-explore-and-dialogs .claude/worktrees/ipad-explore origin/main`, then `pnpm install` in it. Every command below runs from the worktree root.
- [ ] Tests run with `TZ=Asia/Tokyo`: two on main (`GiftReceivedNotice.test.tsx`, `StickerDetail.test.tsx`) fail in other time zones. Every test command here sets it.
- [ ] Before every UI edit (Tasks 3, 4, 6, 7, 9, 12–14), read `~/.claude/skills/impeccable/reference/craft-floor.md`, and judge the change through `/impeccable adapt`: rethink the composition for the screen, never scale pixels.

### Task 1: Screen axes

**Files:** Create `apps/frontend/src/ui/screenAxes.ts`, `apps/frontend/src/ui/screenAxes.test.ts`; modify `apps/frontend/src/ui/testing.ts`

- [ ] **Step 1: A test helper that turns the screen.** Append to `ui/testing.ts`, with `import { onTestFinished } from "vitest";` at its top:

```ts
/**
 * The screen turned `angle` degrees from the device's natural orientation, as screen.orientation
 * reports it, until the test ends.
 */
export function turnScreen(angle: number) {
  const own = Object.getOwnPropertyDescriptor(screen, "orientation");
  Object.defineProperty(screen, "orientation", { configurable: true, value: { angle } });
  onTestFinished(() => {
    if (own) Object.defineProperty(screen, "orientation", own);
    else Reflect.deleteProperty(screen, "orientation");
  });
}
```

- [ ] **Step 2: Write the failing test**, `ui/screenAxes.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { screenAngle, toScreenAxes } from "./screenAxes";
import { turnScreen } from "./testing";

/** Toward the device's top edge, and toward its right edge, in its own axes. */
const TOP = { x: 0, y: 1 };
const RIGHT = { x: 1, y: 0 };
/** Where `v` points on a screen turned `angle`, with −0 read as 0. */
const onScreen = (v: { x: number; y: number }, angle?: number) => {
  const { x, y } = toScreenAxes(v.x, v.y, angle);
  return { x: x + 0, y: y + 0 };
};

describe("toScreenAxes", () => {
  it.each([
    [0, "keeps the device's axes", { x: 0, y: 1 }, { x: 1, y: 0 }],
    [
      90,
      "turned counterclockwise: its top is the screen's left, its right the screen's top",
      { x: -1, y: 0 },
      { x: 0, y: 1 },
    ],
    [180, "upside down: both read backward", { x: 0, y: -1 }, { x: -1, y: 0 }],
    [
      270,
      "turned clockwise: its top is the screen's right, its right the screen's foot",
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ],
  ])("at %i°, %s", (angle, _, top, right) => {
    expect(onScreen(TOP, angle)).toEqual(top);
    expect(onScreen(RIGHT, angle)).toEqual(right);
  });

  it("turns by screen.orientation's angle unless told another", () => {
    turnScreen(270);
    expect(screenAngle()).toBe(270);
    expect(onScreen(TOP)).toEqual({ x: 1, y: 0 });
  });
});
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/ui/screenAxes.test.ts` → FAIL: `./screenAxes` doesn't resolve.
- [ ] **Step 4: Implement** `ui/screenAxes.ts`:

```ts
/**
 * Device tilt and motion arrive in the device's own axes, fixed to its natural orientation, while
 * the screen turns inside it. These read such a vector in the screen's axes, so a tilt or a push
 * means the same on screen in portrait and landscape.
 */

/**
 * How far the screen is turned from the device's natural orientation, in degrees: 0, 90, 180 or
 * 270. Upright where the browser doesn't say.
 */
export function screenAngle(): number {
  const angle = typeof screen === "undefined" ? 0 : (screen.orientation?.angle ?? 0);
  return (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
}

/**
 * (x, y) in the device's own axes, as its sensors report them (x toward its right edge, y toward
 * its top edge), in the screen's axes as it's turned `angle` (x toward the screen's right, y toward
 * its top). At 90 the device is turned counterclockwise, its top at the screen's left.
 */
export function toScreenAxes(x: number, y: number, angle = screenAngle()) {
  switch (angle) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}
```

- [ ] **Step 5:** Run the test again → PASS (5 tests).
- [ ] **Step 6:** Commit: `feat(frontend): read device tilt and motion in the screen's axes`

### Task 2: The light, the heart's sway and the zipper's swing follow the screen

**Files:** Modify `apps/frontend/src/stickers/light.ts`, `light.test.ts`, `apps/frontend/src/gratitude/phoneMotion.ts`, `phoneMotion.test.ts`, `apps/frontend/src/sticker-board/tray/zipper.ts`, `zipper.test.ts`

- [ ] **Step 1: Failing test for the light.** In `light.test.ts`, import `TILT_RANGE` and `HELD_LEAN` from `./light` and `turnScreen` from `../ui/testing`, and add to `describe("the shared light")`:

```ts
it("follows the tilt across the screen however the device is turned", () => {
  turnScreen(90);
  uninstall = installLight(root);
  showScreen();
  // Turned counterclockwise and held to read, its right edge tipped down: the screen's top is the
  // device's right side, raised as a reader holds it, and the screen's right is the device's foot.
  tiltTo(-HELD_LEAN, TILT_RANGE);
  vi.advanceTimersByTime(16);
  expect(lightAt()).toEqual(["1.000", "0.000"]);
});
```

- [ ] **Step 2: Failing test for the motion.** In `phoneMotion.test.ts`, import `turnScreen` from `../ui/testing`. `play`'s options gain a posture, `{ orientation = true, linear = true, gyro = true, held = HELD } = {}`, and its tilt line becomes `const tilt = { beta: held.beta, gamma: held.gamma + twisted };`. Add to `describe("listenToPhoneMotion")`:

```ts
it("reads the motion and the pull across the screen once the screen turns", () => {
  turnScreen(90);
  // Turned counterclockwise, the screen's right edge is the phone's foot: the phone pushed toward
  // it, lying with it raised.
  const pushedRight = motion(() => ({ a: { x: 0, y: -12, z: 0 }, turn: STILL, twisted: 0 }));
  for (const gyro of [true, false]) {
    const samples = play(1, { gyro, held: { beta: -20, gamma: 0 } }, pushedRight);
    expect(samples.filter((s) => s.t >= 1200).every((s) => s.ax > 0)).toBe(true);
    expect(samples.find((s) => s.gx !== null)?.gx).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2b: Failing test for the zipper.** In `zipper.test.ts`, the `swing` two tests each define moves up beside `whenDone`, and with it the jolt test's `jolt`, taking the acceleration: `const jolt = (x: number, y: number) => window.dispatchEvent(Object.assign(new Event("devicemotion"), { acceleration: { x, y, z: 0 } }));`, which that test calls as `jolt(6, 1)`. Import `turnScreen` from `../../ui/testing`, and after the jolt test add:

```ts
it("swings its pull across the screen however the phone is turned", async () => {
  // Upright, pushed toward the screen's right.
  jolt(6, 0);
  await vi.advanceTimersByTimeAsync(100);
  const upright = Math.sign(swing());
  await vi.advanceTimersByTimeAsync(SETTLE_MS);
  // Turned counterclockwise, the screen's right is the phone's foot.
  turnScreen(90);
  jolt(0, -6);
  await vi.advanceTimersByTimeAsync(100);
  expect(upright).not.toBe(0);
  expect(Math.sign(swing())).toBe(upright);
});
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/stickers/light.test.ts src/gratitude/phoneMotion.test.ts src/sticker-board/tray/zipper.test.ts` → FAIL: `HELD_LEAN` isn't exported, the motion's x is 0, and the turned pull swings the other way.
- [ ] **Step 4: The light.** In `light.ts`, import `toScreenAxes` from `../ui/screenAxes`; export `TILT_RANGE`, and rename `HELD_BETA` to an exported `HELD_LEAN` with the doc "How far a device's top leans back when it's held to read, in degrees." `lastGamma` becomes `lastTiltX`, and `fromTilt` starts:

```ts
const fromTilt = (e: DeviceOrientationEvent) => {
  if (e.gamma === null || e.beta === null) return;
  // Across and up the screen as it's turned now: gamma tips the device's right edge down, and
  // beta raises its top, which moves the light down.
  const tilt = toScreenAxes(e.gamma, -e.beta);
  aim(tilt.x / TILT_RANGE, -(tilt.y + HELD_LEAN) / TILT_RANGE);
```

Its sweep compares `tilt.x` with `lastTiltX` where it compared `e.gamma` with `lastGamma`, and ends `lastTiltX = tilt.x;`; `own.off` sets `lastTiltX = null;`.

- [ ] **Step 5: The motion.** In `phoneMotion.ts`, import `toScreenAxes` from `../ui/screenAxes`. The `MotionSample` doc's second paragraph begins "Each has the spec's sign on every platform, read across the screen as it's turned: a push toward the screen's right is +x, and the pull is positive with the screen's right edge up." In `onMotion`, the pull's line becomes:

```ts
// Gravity's pull across the screen as it's turned now.
const across = toScreenAxes(gravity.x, gravity.y).x;
pull = pull === null ? across : pull + (across - pull) * GRAVITY_FOLLOW;
```

and from `const sideways = s * linear.x;` to the end of `onMotion`:

```ts
// The phone's motion across and up the screen as it's turned now.
const moved = toScreenAxes(s * linear.x, s * linear.y);
// A phone with a gyroscope fuses its orientation from it, so the orientation keeps a shake's
// jerk out with no lag. Otherwise the pull is the gravity estimate low-passed twice, and its
// sign is the platform's.
const gx =
  turn && up
    ? STANDARD_GRAVITY * toScreenAxes(up.x, up.y).x
    : pull !== null && (sign !== null || e.timeStamp - firstAt >= SIGN_CHECK.waitMs)
      ? s * pull
      : null;
onSample(Math.abs(twist) > Math.abs(moved.x) ? twist : moved.x, moved.y, gx, e.timeStamp);
```

- [ ] **Step 5b: The zipper.** The board plan edits `zipper.ts` too (its `opens` option and `reshape()`), so this edit stays on the motion-reading lines, and whichever plan lands second rebases cleanly. Add `import { toScreenAxes } from "../../ui/screenAxes";` beside its `../../ui/easing` import, and at the end of `onMotion`, `nudge(ax, -ay); // the device's y points up the screen` becomes:

```ts
// Across and up the screen as it's turned now; nudge takes y down the screen.
const moved = toScreenAxes(ax, ay);
nudge(moved.x, -moved.y);
```

- [ ] **Step 6:** Run the three files → PASS; the earlier tests are unchanged, since an upright screen reads as before.
- [ ] **Step 7:** Commit: `fix(frontend): the light, the heart's sway and the zipper's swing follow the screen in landscape`

### Task 3: The pile keeps its size

**Files:** Modify `apps/frontend/src/explore/pileLayout.ts`, `pileLayout.test.ts`, `StickerPile.tsx`, `ExploreScreen.tsx` (`PileLoading`), `sticker-pile.css`; create `apps/frontend/src/explore/usePileScale.ts`

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: Write the failing test** in `pileLayout.test.ts`, importing `PILE_MAX_SCALE` and `pileScale`:

```ts
describe("pileScale", () => {
  it("lays the pile across a phone's width, and keeps its full scale on anything wider", () => {
    expect(pileScale(390) * PILE_WIDTH).toBeCloseTo(390);
    expect(pileScale(PILE_WIDTH * PILE_MAX_SCALE)).toBe(PILE_MAX_SCALE);
    for (const width of [820, 1180, 1376]) expect(pileScale(width)).toBe(PILE_MAX_SCALE);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore/pileLayout.test.ts` → FAIL: `pileScale` isn't exported.
- [ ] **Step 3: Implement** in `pileLayout.ts`, after `PILE_WIDTH`, whose doc becomes "The pile's width in units on every screen; the screen scales it to fit, up to PILE_MAX_SCALE.":

```ts
/** The most a pile unit grows to, px: past it the pile keeps its size, centered, however wide the screen. */
export const PILE_MAX_SCALE = 1.5;

/** px per pile unit on a pile `width` px wide: across its PILE_WIDTH units, up to PILE_MAX_SCALE. */
export const pileScale = (width: number) => Math.min(width / PILE_WIDTH, PILE_MAX_SCALE);
```

- [ ] **Step 4: The hook**, `explore/usePileScale.ts`:

```ts
import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { PILE_WIDTH, pileScale } from "./pileLayout";

/**
 * Scales the pile at `root` to its width: `--k` is px per unit and `--heap-w` a day's heap's width,
 * centered on a pile wider than that. `onScale` hears each new scale.
 */
export function usePileScale(
  root: RefObject<HTMLElement | null>,
  onScale: (k: number) => void = () => {},
) {
  const told = useEffectEvent(onScale);
  useLayoutEffect(() => {
    const pile = root.current;
    if (!pile) return;
    let shown: number | null = null;
    const scale = () => {
      const k = pileScale(pile.clientWidth);
      if (k === shown) return;
      shown = k;
      pile.style.setProperty("--k", String(k));
      pile.style.setProperty("--heap-w", `${PILE_WIDTH * k}px`);
      told(k);
    };
    scale();
    if (typeof ResizeObserver !== "function") return;
    const resized = new ResizeObserver(scale);
    resized.observe(pile);
    return () => resized.disconnect();
  }, [root]);
}
```

- [ ] **Step 5: The pile and its outline use it.** In `StickerPile.tsx`, `Props` gains `/** The pile's px per unit, each time it changes. */ onScale?: (k: number) => void;`, the component takes `onScale`, and the comment and `useLayoutEffect` that set `--k` become:

```ts
// The pile is PILE_WIDTH units across whatever the screen, up to its scale's cap.
usePileScale(root, onScale);
```

`useLayoutEffect` and `PILE_WIDTH` leave its imports, and `usePileScale` joins them. In `ExploreScreen.tsx`, import `usePileScale` from `./usePileScale`; in `PileLoading`, add `const root = useRef<HTMLDivElement>(null); usePileScale(root);` and put `ref={root}` on its `.sticker-pile` div.

- [ ] **Step 6: Center the heaps** in `sticker-pile.css`. The head comment's second sentence becomes "Positions come from pileLayout in pile units; --k scales a unit to px (usePileScale.ts), and --heap-w is a day's heap's width at that scale, centered on a wider pile." Then:
  - `.pile-day__badge` and `.pile-older__badge`: `left: 16px;` becomes `left: calc((100% - var(--heap-w, 100%)) / 2 + 16px);`, at the heap's left wherever the pile's edge is.
  - `.pile-day__heap`: `margin: 0;` becomes `margin: 0 auto;`, and it gains `width: var(--heap-w, 100%);`.
  - `.pile-loading` and `.pile-day__empty` gain `width: var(--heap-w, 100%);` and `margin: 0 auto;`.
  - `.pile-older-failed`: `margin: 14px 16px 12px;` becomes `max-width: calc(var(--heap-w, 100%) - 32px);` and `margin: 14px auto 12px;`.
- [ ] **Step 7:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 8:** Commit: `feat(frontend): Explore's pile keeps its size on wide screens, centered`

### Task 4: This week beside the pile, and the column's measure

**Files:** Create `apps/frontend/src/explore/exploreColumns.ts`, `exploreColumns.test.ts`; modify `ExploreScreen.tsx`, `ExploreScreen.css`

UI edit: craft floor first, `/impeccable adapt` as the lens. `SlidingTabs` and its `.sliding-tabs` rules stay where they are: the Pencil plan, which lands after this one, moves them to `ui/` (Dependencies).

- [ ] **Step 1: Write the failing test**, `explore/exploreColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { exploreColumns, TWO_COLUMNS_MIN_WIDTH } from "./exploreColumns";

describe("exploreColumns", () => {
  it("puts This week beside the pile only in regular width, and only once both fit", () => {
    expect(exploreColumns(TWO_COLUMNS_MIN_WIDTH, "regular")).toBe(2);
    expect(exploreColumns(TWO_COLUMNS_MIN_WIDTH - 1, "regular")).toBe(1);
    expect(exploreColumns(TWO_COLUMNS_MIN_WIDTH * 2, "compact")).toBe(1);
  });
});
```

- [ ] **Step 2:** Run it → FAIL: the module doesn't resolve.
- [ ] **Step 3: Implement** `explore/exploreColumns.ts`:

```ts
import { useLayoutEffect, useState, type RefObject } from "react";
import { useSizeClass, type SizeClass } from "../app/sizeClass";

/** Explore's width from which This week sits beside the pile: the pile at its full scale, the gap and a leaderboard. */
export const TWO_COLUMNS_MIN_WIDTH = 960;

/** How many columns Explore lays out `width` px wide: two only in regular width, with room for both. */
export const exploreColumns = (width: number, size: SizeClass["width"]): 1 | 2 =>
  size === "regular" && width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;

/** Explore's columns, from its scroller's width and the frame's size class. */
export function useExploreColumns(scroller: RefObject<HTMLElement | null>): 1 | 2 {
  const size = useSizeClass();
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== "function") return;
    const resized = new ResizeObserver(measure);
    resized.observe(el);
    return () => resized.disconnect();
  }, [scroller]);
  return exploreColumns(width, size.width);
}
```

- [ ] **Step 4: Explore lays out one or two columns.** In `ExploreScreen.tsx`, import `useExploreColumns` from `./exploreColumns`, and `PILE_MAX_SCALE` and `PILE_WIDTH` from `./pileLayout` beside `textWidth`. `ThisWeek`'s and `ThisWeekLoading`'s sections gain the class `this-week`. Explore's one loading line moves to the view, since two columns would say it twice: `ThisWeekLoading` returns its `<section className="explore-section this-week" aria-hidden="true">` alone, without the fragment and `<LoadingStatus />`, and so does `PileLoading` with its `.sticker-pile` div. In `ExploreScreen`, after `const field = …`:

```tsx
const scroller = useRef<HTMLDivElement>(null);
const columns = useExploreColumns(scroller);
```

The `shown` constant goes, and after `const open: Open = …` the render becomes:

```tsx
// Beside each other both show; otherwise the switch picks one. Each keeps its place among the
// view's children, so a rotation never remounts the pile or the pages it has loaded.
const showsPile = columns === 2 || view === "stickers";
const showsWeek = columns === 2 || view === "thisWeek";
const pile = !showsPile ? null : explore.state === "ready" ? (
  <Stickers explore={explore.data} meId={me.id} open={open} />
) : explore.state === "loading" ? (
  <PileLoading />
) : null;
const week = !showsWeek ? null : explore.state === "ready" ? (
  <ThisWeek leaderboards={explore.data.leaderboards} meId={me.id} open={open} />
) : explore.state === "loading" ? (
  <ThisWeekLoading />
) : null;
// With no switch there's no tab panel either.
const panel =
  columns === 1
    ? { role: "tabpanel", id: "explore-view-panel", "aria-labelledby": `explore-view-${view}` }
    : {};

return (
  <div
    ref={scroller}
    className="explore"
    data-columns={columns}
    style={{ "--pile-full": `${PILE_WIDTH * PILE_MAX_SCALE}px` }}
  >
    {/* the artist search's label and its status line stay as they are */}
    {q ? (
      searched && (
        <SearchResults query={searched} meId={me.id} open={open} announce={setSearchStatus} />
      )
    ) : (
      <>
        {columns === 1 && <SlidingTabs /* the view switch's props as they are */ />}
        <div className="explore-view" {...panel}>
          {explore.state === "loading" && <LoadingStatus />}
          {explore.state === "failed" ? (
            <Failed
              said={(reason) => t(($) => $.explore.failed.explore, { reason })}
              query={explore}
            />
          ) : (
            <>
              {week}
              {pile}
            </>
          )}
        </div>
      </>
    )}
  </div>
);
```

- [ ] **Step 5: The styles**, appended to `ExploreScreen.css`:

```css
/* ---------- Regular width ---------- */

/* The search, the view switch and the rows keep to a heap's full width, in the middle. */
.phone[data-width="regular"] .explore > :is(.artist-search, .view-switch, .explore-section),
.phone[data-width="regular"] .explore-view > .explore-section {
  width: 100%;
  max-width: var(--pile-full);
  margin-inline: auto;
}

/* Two columns: the pile under the search, This week beside them both. The view's own box steps
   aside, so its pile and This week are the columns' items. */
.explore[data-columns="2"] {
  display: grid;
  grid-template-columns: minmax(0, var(--pile-full)) minmax(300px, 400px);
  justify-content: center;
  align-content: start;
  align-items: start;
  gap: 22px 32px;
}

.explore[data-columns="2"] > .explore-view {
  display: contents;
}

.explore[data-columns="2"] :is(.artist-search, .explore-section, .sticker-pile) {
  grid-column: 1;
}

.explore[data-columns="2"] .this-week {
  grid-column: 2;
  grid-row: 1 / span 2;
}

/* In its column the pile no longer runs under the screen's side padding. */
.explore[data-columns="2"] .sticker-pile {
  margin: -6px 0 0;
}
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore` and `pnpm -C apps/frontend typecheck` → PASS: happy-dom measures 0, so Explore's tests see one column, as before.
- [ ] **Step 7:** Commit: `feat(frontend): This week sits beside Explore's pile on a wide screen`

### Task 5: A rotation keeps Explore's place

**Files:** Create `apps/frontend/src/explore/scrollPlace.ts`, `scrollPlace.test.ts`; modify `ExploreScreen.tsx`, `StickerPile.tsx`

- [ ] **Step 1: Write the failing test**, `explore/scrollPlace.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { placeOf, scrollToKeep, type Marker } from "./scrollPlace";

/** A view 700 px tall over a day that began above it, a sticker near its top, and one lower down. */
const VIEW_HEIGHT = 700;
const LAID: Marker[] = [
  { key: "day", top: -400, height: 1200 },
  { key: "near", top: 30, height: 150 },
  { key: "lower", top: 300, height: 150 },
];

describe("keeping the reader's place", () => {
  it("keeps the marker nearest the view's top the same share of itself below it, once re-laid", () => {
    const place = placeOf(LAID, VIEW_HEIGHT);
    if (!place) throw new Error("no place kept");
    expect(place.key).toBe("near");
    // The pile grew half again: the sticker is lower down and taller.
    const relaid = { key: "near", top: 245, height: 225 };
    const below = relaid.top - scrollToKeep(place, relaid);
    expect(below / relaid.height).toBeCloseTo(30 / 150);
  });

  it("keeps no place where the view shows no marker", () => {
    expect(placeOf([{ key: "day", top: VIEW_HEIGHT + 10, height: 400 }], VIEW_HEIGHT)).toBeNull();
    expect(placeOf([], VIEW_HEIGHT)).toBeNull();
  });
});
```

- [ ] **Step 2:** Run it → FAIL: the module doesn't resolve.
- [ ] **Step 3: Implement** `explore/scrollPlace.ts`:

```ts
import { useEffect, type RefObject } from "react";

/**
 * A reader's place in a scroller, kept while its content re-lays at a new width, as a rotation
 * does: the marker nearest the view's top stays the same share of itself below the top.
 */

/** Something the place is kept by, as laid out now: its top below the view's top, and its height, px. */
export interface Marker {
  key: string;
  top: number;
  height: number;
}

/** A place: its marker, and how far below the view's top that marker's top was, in its own heights. */
export interface ScrollPlace {
  key: string;
  at: number;
}

/** The place in a view `height` px tall: the marker it shows nearest its top, or null if it shows none. */
export function placeOf(markers: readonly Marker[], height: number): ScrollPlace | null {
  let nearest: Marker | null = null;
  for (const marker of markers) {
    const shown = marker.height > 0 && marker.top < height && marker.top + marker.height > 0;
    if (shown && (!nearest || Math.abs(marker.top) < Math.abs(nearest.top))) nearest = marker;
  }
  return nearest && { key: nearest.key, at: nearest.top / nearest.height };
}

/** How far to scroll so `marker`, laid out anew, sits where `place` had it. */
export const scrollToKeep = (place: ScrollPlace, marker: Marker) =>
  marker.top - place.at * marker.height;

/** A long scroll reads the markers at most this often, not every frame. */
const NOTE_MS = 100;
/** Frames after a resize that put the place back, for a layout that settles a frame late. */
const SETTLE_FRAMES = 2;

/**
 * Keeps the place in `scroller` across a change of its width, by the elements `selector` finds,
 * each named by `keyOf`. Both must keep their identity across renders.
 */
export function useScrollPlace(
  scroller: RefObject<HTMLElement | null>,
  selector: string,
  keyOf: (el: HTMLElement) => string,
) {
  useEffect(() => {
    const view = scroller.current;
    if (!view || typeof ResizeObserver !== "function") return;
    const markers = (): Marker[] => {
      const top = view.getBoundingClientRect().top;
      return [...view.querySelectorAll<HTMLElement>(selector)].map((el) => {
        const box = el.getBoundingClientRect();
        return { key: keyOf(el), top: box.top - top, height: box.height };
      });
    };
    let place: ScrollPlace | null = null;
    let width = view.clientWidth;
    let settling = 0;
    let noting = 0;
    const note = () => {
      noting = 0;
      if (!settling) place = placeOf(markers(), view.clientHeight);
    };
    const onScroll = () => {
      if (!noting) noting = window.setTimeout(note, NOTE_MS);
    };
    const putBack = () => {
      const kept = place;
      const marker = kept && markers().find((m) => m.key === kept.key);
      if (kept && marker) view.scrollTop += scrollToKeep(kept, marker);
    };
    const settle = () => {
      putBack();
      settling -= 1;
      if (settling > 0) requestAnimationFrame(settle);
    };
    const resized = new ResizeObserver(() => {
      if (view.clientWidth === width) return;
      width = view.clientWidth;
      putBack();
      if (!settling) requestAnimationFrame(settle);
      settling = SETTLE_FRAMES;
    });
    note();
    view.addEventListener("scroll", onScroll, { passive: true });
    resized.observe(view);
    return () => {
      view.removeEventListener("scroll", onScroll);
      resized.disconnect();
      clearTimeout(noting);
    };
  }, [scroller, selector, keyOf]);
}
```

- [ ] **Step 4: Explore keeps it.** In `StickerPile.tsx`, each day's `<section className="pile-day" …>` gains `data-pile-day={day}`. In `ExploreScreen.tsx`, import `useScrollPlace` from `./scrollPlace`, add above `ExploreScreen`:

```ts
/** What Explore keeps its place by across a resize: each day of the pile, and each sticker on it. */
const PILE_MARKERS = "[data-pile-day], [data-pile-id]";
const pileMarkerKey = (el: HTMLElement) => el.dataset.pileId ?? `day ${el.dataset.pileDay ?? ""}`;
```

and `useScrollPlace(scroller, PILE_MARKERS, pileMarkerKey);` under `const columns = …`.

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 6:** Commit: `fix(frontend): turning the screen keeps Explore's place in the pile`

### Task 6: The lifted sticker as a card, never smaller than its pile copy

**Files:** Modify `apps/frontend/src/explore/LiftedSticker.tsx`, `lifted-sticker.css`, `ExploreScreen.tsx` (`Stickers`)

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: The pile tells its scale.** In `ExploreScreen.tsx`'s `Stickers`, after `const lifted = …`:

```tsx
// The pile's px per unit, which the lifted sticker keeps to, so it's never smaller than its copy.
const [scale, setScale] = useState<number>();
```

`<StickerPile>` takes `onScale={setScale}`, and `<LiftedSticker>` takes `pileScale={scale}`.

- [ ] **Step 2: The lifted view.** In `LiftedSticker.tsx`, import `useSizeClass` from `../app/sizeClass`; `Props` gains `/** The pile's px per unit: the lifted sticker is never smaller than its copy there. */ pileScale?: number;`. Above `enterSheet`:

```ts
/** The lifted sticker's smallest box, px: a phone's. */
const LIFT_MIN_PX = 210;
/**
 * About the longest a pile sticker's image runs, in pile units: its cut at its longest and the
 * image's clear margin round it. The lifted sticker is at least this at the pile's scale.
 */
const LIFT_PILE_UNITS = 160;
```

`enterSheet(view)` becomes `enterFrom(from)`, which returns the same function for a view whose sheet comes in from `from`. Its doc becomes "The scrim comes up and the view comes in from `from` under the sticker as it flies in, both landing with it; then the artist, fine print and ways out rise in.", its head `const enterFrom = (from: Keyframe) => (view: HTMLElement): Animation[] => {`, its body stays, and the sheet's keyframes become `[from, { transform: "none", opacity: 1 }]`. `SHEET` gives way to:

```ts
const figureOf = (view: HTMLElement) =>
  view.querySelector<HTMLElement>(".lifted-sticker__slide .sticker-figure");
/** A sheet rising from the screen's foot. The pile stays in sight behind, so the spot keeps a ghost. */
const SHEET: LiftView = {
  figureOf,
  enter: enterFrom({ transform: "translateY(104%)", opacity: 1 }),
  ghost: 0.18,
};
/** In regular width, a card in the middle of the screen, rising a little as it fades in. */
const CARD: LiftView = {
  figureOf,
  enter: enterFrom({ transform: "translateY(16px)", opacity: 0 }),
  ghost: 0.18,
};
```

The component takes `pileScale = 0`; before `useDetailLift`:

```ts
const card = useSizeClass().width === "regular";
const side = Math.max(LIFT_MIN_PX, LIFT_PILE_UNITS * pileScale);
```

`useDetailLift` takes `into: card ? CARD : SHEET`, and the root `<div ref={root} className="lifted-sticker" …>` takes `style={{ "--lift-side": `${side}px` }}`.

- [ ] **Step 3: The styles** in `lifted-sticker.css`: the stage's `height: 228px;` becomes `height: calc(var(--lift-side, 210px) + 18px);`; the figure's comment becomes "Its own shape, inside a square no smaller than its copy on the pile." and its `width` `calc(var(--lift-side, 210px) * min(1, var(--ar)))`. Append:

```css
/* Regular width: a card in the middle of the screen at the app's content width, over the scrim. */
.phone[data-width="regular"] .lifted-sticker__sheet {
  top: 50%;
  bottom: auto;
  left: 50%;
  right: auto;
  width: min(var(--content-w), calc(100% - 48px));
  max-height: calc(100% - 48px);
  padding-bottom: 20px;
  border-radius: 16px;
  box-shadow: var(--shadow-float);
  translate: -50% -50%;
}
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore` and `pnpm -C apps/frontend typecheck` → PASS: happy-dom is compact, so the sheet and 210 px, as before.
- [ ] **Step 5:** Commit: `feat(frontend): the lifted sticker is a centered card on a wide screen, never smaller than its pile copy`

### Task 7: The sticker detail's column

**Files:** Modify `apps/frontend/src/sticker-board/StickerDetail.tsx`, `sticker-detail.css`

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: The facts line gets its own class.** In `StickerDetail.tsx`, the first fine print, the one ending in `<TimelapseButton …/>`, becomes `<p className="fine sticker-detail__fine-print sticker-detail__facts">`. The "you gave it" line keeps its classes: it's running text, which a row would break at its spaces.
- [ ] **Step 2: The styles** in `sticker-detail.css`. `.sticker-detail` gains, first, `--figure: 216px;` under the comment `/* The sticker's box: a phone's, grown in regular width. */`; the stage's `height: 240px;` becomes `height: calc(var(--figure) + 24px);`; the figure rule's comment becomes "Its own shape, inside the --figure square; the timelapse's layer over it takes the same box." and its `width` `calc(var(--figure) * min(1, var(--ar)))`. Replace `.sticker-detail__by` with:

```css
/* The facts and Timelapse lay out as one row, each centered on it, so a fact keeps to the others
   however tall the button makes the line; the facts wrap between each other. */
.sticker-detail__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.3em;
}

/* A name too long for the line ends in an ellipsis rather than running off it. */
.sticker-detail__by {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

and append:

```css
/* Regular width: the page keeps to the app's content width in the middle, its sticker grown to suit. */
.phone[data-width="regular"] .sticker-detail {
  --figure: 320px;
}

.phone[data-width="regular"] .sticker-detail__main {
  padding-inline: max(18px, calc((100% - var(--content-w)) / 2));
}
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/StickerDetail.test.tsx src/sticker-board/timelapse` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 4:** Commit: `fix(frontend): the sticker detail's by-line keeps to its facts, in a centered column with a bigger sticker on wide screens`

### Task 8: The Mini-game's scales

**Files:** Modify `apps/frontend/src/gratitude/stageLayout.ts`, `stageLayout.test.ts`, `replay/mountGratitudeReplay.ts`, `replay/replayEngine.test.ts`, `replay/replayFeed.test.ts`

- [ ] **Step 1: Write the failing tests.** Replace `stageLayout.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  FULL_SCALE_HEIGHT,
  heartRest,
  LIVE_FRAME,
  LIVE_STAGE,
  liveScale,
  MAX_HEART_WIDTH,
  MAX_LIVE_SCALE,
  REPLAY_FRAME,
  replayScale,
} from "./stageLayout";

/** A replay's stage in the gratitude card on a phone. */
const CARD = { width: 268, height: 300 };
const footOf = (heart: { y: number; height: number }) => heart.y + heart.height / 2;

describe("where the heart rests", () => {
  it("sits centered under the frame, never wider than its cap", () => {
    const wide = heartRest(1000, 900, LIVE_FRAME);
    expect(wide.x).toBe(500);
    expect(wide.width).toBe(MAX_HEART_WIDTH);
    expect(wide.y - wide.height / 2).toBeGreaterThan(LIVE_FRAME.above);
  });

  it("shrinks with a narrow stage, and stays on it", () => {
    const narrow = heartRest(CARD.width, CARD.height, REPLAY_FRAME);
    expect(narrow.width).toBeLessThan(MAX_HEART_WIDTH);
    expect(narrow.y - narrow.height / 2).toBeGreaterThan(REPLAY_FRAME.above);
    expect(footOf(narrow)).toBeLessThanOrEqual(CARD.height);
  });

  it("leaves the frame's room under it on a short stage", () => {
    for (const [width, height, frame] of [
      [540, 564, LIVE_FRAME],
      [1058, CARD.height, REPLAY_FRAME],
    ] as const) {
      expect(footOf(heartRest(width, height, frame))).toBeLessThanOrEqual(height - frame.below);
    }
  });
});

describe("the live game's scale", () => {
  it("stays at 1 on a phone", () => {
    expect(liveScale(LIVE_STAGE.width, LIVE_STAGE.height)).toBe(1);
    expect(liveScale(430, 829)).toBe(1);
  });

  it("grows with a regular stage's smaller side, up to its cap", () => {
    expect(liveScale(1180, 820)).toBeGreaterThan(1);
    expect(liveScale(1180, 820)).toBeLessThan(MAX_LIVE_SCALE);
    expect(liveScale(820, 1180)).toBe(MAX_LIVE_SCALE);
  });

  it("shrinks on a stage too short for its heart, start hint and words", () => {
    expect(liveScale(540, FULL_SCALE_HEIGHT - 40)).toBeLessThan(1);
  });
});

describe("a replay's scale", () => {
  it("is a phone card's width over the phone stage's, as its heart is", () => {
    expect(replayScale(CARD.width, CARD.height)).toBeCloseTo(CARD.width / LIVE_STAGE.width);
  });

  it("stops growing with a card's width once its height holds the heart back", () => {
    expect(replayScale(1058, CARD.height)).toBe(replayScale(460, CARD.height));
    expect(replayScale(460, CARD.height)).toBeLessThan(460 / LIVE_STAGE.width);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude/stageLayout.test.ts` → FAIL: the new names aren't exported.
- [ ] **Step 3: Implement.** Replace `stageLayout.ts` with:

```ts
import { sizeClassOf } from "../app/sizeClass";

/** What sits above the heart's area on a stage, and the room kept under the heart, px. */
export interface StageFrame {
  above: number;
  below: number;
}

/** The live Mini-game: its top band (176px) and HUD (80px) above, its start hint's two lines under. */
export const LIVE_FRAME: StageFrame = { above: 176 + 80, below: 80 };
/** A replay's stage: its slim HUD above, and a floor for the mini hearts to pile on under. */
export const REPLAY_FRAME: StageFrame = { above: 64, below: 48 };
/** The heart's widest at the live game's scale on a phone, px. */
export const MAX_HEART_WIDTH = 232;
/** The live game's stage on the phone it was made for, px: it draws at scale 1 there. */
export const LIVE_STAGE = { width: 390, height: 741 } as const;
/** The most the live game grows on a big stage. */
export const MAX_LIVE_SCALE = 1.5;
/** A live stage shorter than this draws the game smaller, so its heart, start hint and words fit, px. */
export const FULL_SCALE_HEIGHT = 600;

/** Below its widest, the heart takes this share of the stage's width. */
const HEART_SHARE = 0.58;
/** The heart art's height to width. */
const HEART_ASPECT = 232 / 240;
/** Its middle sits this share down the area under the frame, or lower… */
const REST_SHARE = 0.38;
/** …so its top keeps this far under the frame, px. */
const TOP_GAP = 12;
/** The narrowest it gets however little room a stage leaves, px. */
const MIN_HEART_WIDTH = 120;

/**
 * The heart at rest on a `width` × `height` stage: its middle, width and height, px. It takes a
 * share of the width up to `widest`, and stays short enough to leave the frame's room under it.
 */
export function heartRest(
  width: number,
  height: number,
  frame: StageFrame,
  widest = MAX_HEART_WIDTH,
) {
  const area = height - frame.above;
  // Its foot keeps `below` clear of the stage's foot, wherever its middle sits.
  const tallest = Math.min(
    area - frame.below - TOP_GAP,
    2 * ((1 - REST_SHARE) * area - frame.below),
  );
  const w = Math.max(
    MIN_HEART_WIDTH,
    Math.min(width * HEART_SHARE, widest, tallest / HEART_ASPECT),
  );
  const h = w * HEART_ASPECT;
  return {
    x: width / 2,
    y: Math.max(frame.above + area * REST_SHARE, frame.above + h * 0.5 + TOP_GAP),
    width: w,
    height: h,
  };
}

/**
 * The live game's scale on a `width` × `height` stage: 1 on a phone; in regular width the stage's
 * smaller side over LIVE_STAGE's, up to MAX_LIVE_SCALE; and smaller on a stage too short for it.
 */
export function liveScale(width: number, height: number): number {
  if (height < FULL_SCALE_HEIGHT) return height / FULL_SCALE_HEIGHT;
  if (sizeClassOf(width, height, false).width !== "regular") return 1;
  const grown = Math.min(width / LIVE_STAGE.width, height / LIVE_STAGE.height);
  return Math.min(MAX_LIVE_SCALE, Math.max(1, grown));
}

/** The live game's heart at rest, as wide as its scale lets it be. */
export const liveHeartRest = (width: number, height: number) =>
  heartRest(width, height, LIVE_FRAME, MAX_HEART_WIDTH * liveScale(width, height));

/** The heart on the phone stage, which a replay's heart measures its scale against. */
const LIVE_HEART_WIDTH = liveHeartRest(LIVE_STAGE.width, LIVE_STAGE.height).width;

/**
 * A replay stage's scale: its heart's width over the phone's live heart, so lettering, words and
 * mini hearts keep their size beside the heart however wide or short the card is.
 */
export const replayScale = (width: number, height: number) =>
  heartRest(width, height, REPLAY_FRAME).width / LIVE_HEART_WIDTH;
```

- [ ] **Step 4: Frames written out with `above` alone become the named frame.** `REPLAY_FRAME`, imported from `../stageLayout`, takes the place of `{ above: 64 }` in `mountGratitudeReplay.ts`'s `REPLAY_LAYOUT`, in `replayEngine.test.ts`'s layout, and in `replayFeed.test.ts`'s `CARD_HEART`.
- [ ] **Step 5:** `pnpm -C apps/frontend typecheck` and `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude` → PASS: a phone's live heart and a phone card's heart are where they were.
- [ ] **Step 6:** Commit: `feat(frontend): the Mini-game's stage scales from both its sides`

### Task 9: The live game and the replay draw at their stage's scale

**Files:** Modify `apps/frontend/src/gratitude/miniGameEngine.ts`, `miniGameEngine.test.ts`, `gratitude-mini-game.css`, `tierBackground.ts`, `tierBackground.test.ts`, `replay/mountGratitudeReplay.ts`, `replay/mountGratitudeReplay.test.ts`

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: Failing tests.** For the touch rules, in `miniGameEngine.test.ts`: lift the top-level `beforeEach`'s mount, from `host = document.createElement("div");` through its `mountMiniGameEngine(…)` call, unchanged, into `function mountOn(size?: { width: number; height: number })`, which `beforeEach` calls bare; with a size, before appending the host, it gives it the stage an iPad measures: `if (size) Object.defineProperties(host, { clientWidth: { value: size.width }, clientHeight: { value: size.height } });`. `strokeFrom` takes a fifth parameter, `span = 60`, in place of its two `60`s. Import `FEEL_CONFIG` beside `GAME_CONFIG`, and `liveHeartRest` and `liveScale` from `./stageLayout`. Then append at the file's end, since each mount seeds the next one's randomness and the tests above were written for their seeds:

```ts
describe("on a stage drawn bigger", () => {
  /** A portrait iPad's stage, which the game draws at MAX_LIVE_SCALE. */
  const IPAD = { width: 820, height: 1180 };
  const grown = liveScale(IPAD.width, IPAD.height);
  const remount = () => {
    engine.destroy();
    host.remove();
    mountOn(IPAD);
  };

  it("takes a first tap that slides past a phone's slop but inside the stage's", async () => {
    remount();
    const heart = liveHeartRest(IPAD.width, IPAD.height);
    const slide = (FEEL_CONFIG.tapSlopPx * (1 + grown)) / 2;
    pointer("pointerdown", heart.x, heart.y);
    pointer("pointermove", heart.x + slide, heart.y);
    pointer("pointerup", heart.x + slide, heart.y);
    await play(16);
    expect(host.dataset.phase).toBe("running");
  });

  it("unlocks stroke for passes grown with the stage, not for a phone's", async () => {
    remount();
    pressHeart();
    const phoneRun = FEEL_CONFIG.stroke.minRunPx * 1.2;
    pointer("pointerdown", OFF_HEART.x, OFF_HEART.y);
    await strokeFrom(OFF_HEART, 3, 40, undefined, phoneRun);
    expect(live()).not.toBe("Stroke unlocked.");
    // Three runs leave the thumb a run below where it went down.
    pointer("pointerup", OFF_HEART.x, OFF_HEART.y + phoneRun);
    pointer("pointerdown", OFF_HEART.x, OFF_HEART.y);
    await strokeFrom(OFF_HEART, 3, 40, undefined, phoneRun * grown);
    expect(live()).toBe("Stroke unlocked.");
  });
});
```

For the speed lines, in `tierBackground.test.ts`'s `describe("createTierBackground")`:

```ts
it("covers a stage of any size with its speed lines, however they turn", () => {
  const { ground, background } = setUp();
  const stage = { width: 1376, height: 1032 };
  background.setLayout(stage.width, stage.height, { x: 688, y: 600, height: 300 });
  const lines = ground.querySelector<SVGElement>(".gr-speedfield svg");
  expect(parseFloat(lines?.style.width ?? "0")).toBeGreaterThanOrEqual(
    Math.hypot(stage.width, stage.height),
  );
});
```

For the replay's scale, in `mountGratitudeReplay.test.ts`, importing `replayScale` and `LIVE_STAGE` from `../stageLayout` (if happy-dom keeps `clientWidth` on `HTMLElement.prototype`, spy there):

```ts
it("draws a wide, short card's replay at its height's scale, not its width's", () => {
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1058);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(300);
  play(TAPS);
  const gr = host.querySelector<HTMLElement>(".gr");
  const scale = Number(gr?.style.getPropertyValue("--gr-scale"));
  expect(scale).toBeCloseTo(replayScale(1058, 300), 2);
  expect(scale).toBeLessThan(1058 / LIVE_STAGE.width);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude/miniGameEngine.test.ts src/gratitude/tierBackground.test.ts src/gratitude/replay/mountGratitudeReplay.test.ts` → FAIL: the slid tap is a drag, a phone's passes unlock stroke, the lines have no width of their own, and the replay's scale reads 2.713.
- [ ] **Step 3: The speed lines size to the stage.** In `tierBackground.ts`, add `/** The speed lines' side as drawn, px: their SVG's square. */ const SPEED_FIELD_PX = 1100;`, and `setLayout` starts:

```ts
    setLayout(width, height, heart) {
      screen = { width, height };
      // They turn with the stroke, so they're a square the stage's diagonal across.
      if (speedLines instanceof SVGElement) {
        const side = Math.max(SPEED_FIELD_PX, Math.ceil(Math.hypot(width, height)));
        Object.assign(speedLines.style, {
          width: `${side}px`,
          height: `${side}px`,
          margin: `${-side / 2}px 0 0 ${-side / 2}px`,
        });
      }
```

- [ ] **Step 4: The engine's scale.** In `miniGameEngine.ts`:
  - The stage layout import becomes `import { heartRest, LIVE_FRAME, LIVE_STAGE, liveScale, MAX_HEART_WIDTH, type StageFrame } from "./stageLayout";`.
  - `LIVE_STAGE_WIDTH` goes, and `LIVE_LAYOUT.fallback` becomes `LIVE_STAGE`.
  - `ReplayEngineOptions.scale`'s doc becomes "The replay's scale (stageLayout's replayScale): lettering, particles and mini hearts draw at it.", and `inputScale`'s, there and in `EngineOptions`, "px on this stage per px of the live game on a phone: the touch and stroke rules scale by it."
  - `EngineOptions` gains, after `scale`: `/** The heart's widest, px: the live game's grows with its scale; a replay's heart sets its scale instead. */ heartWidest: number;`
  - The touch rules play at the stage's scale: `listenForTouches`' `tapSlopPx` becomes `FEEL_CONFIG.tapSlopPx * inputScale`, and the try at stroking needs `FEEL_CONFIG.stroke.tryTravelPx * inputScale` of travel. The stroke detector's lengths and speeds, the speed lines and the pull already read `inputScale`. The shake detector stays in m/s²: a device's motion doesn't change with its screen.
  - `mountMiniGameEngine` reads its scale off the stage before `mountEngine`, and passes it with the heart's widest:

```ts
// Read once as the screen opens: a rotation re-lays the stage and keeps this scale.
const scale = liveScale(
  parts.root.clientWidth || LIVE_LAYOUT.fallback.width,
  parts.root.clientHeight || LIVE_LAYOUT.fallback.height,
);
```

    and its `mountEngine` options' `scale: 1,` and `inputScale: 1,` become `scale, heartWidest: MAX_HEART_WIDTH * scale, inputScale: scale,`.

- `mountReplayEngine`'s `mountEngine` call gains `heartWidest: MAX_HEART_WIDTH,` after `...rest,`.
- In `mountEngine`, the options line becomes `const { frames, layout, scale, inputScale, speed, heartWidest } = options;`, followed by `// The stylesheet draws what it sizes in px at the stage's scale.` and `root.style.setProperty("--gr-scale", scale.toFixed(3));`.
- `layoutFor` starts `const rest = heartRest(width, height, layout.frame, heartWidest);`, and `applyLayout` places the hint `${L.rest.y + L.height * 0.5 + 22 * scale}px` down.
- The giver's picture moves with the top band in regular width, so `giverPoint` finds it through its positioned boxes. After `SQUASH_BY_METHOD`:

```ts
/** `el`'s middle in `root`'s px, through the positioned boxes between them. */
function middleIn(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  for (
    let at: Element | null = el;
    at instanceof HTMLElement && at !== root;
    at = at.offsetParent
  ) {
    x += at.offsetLeft;
    y += at.offsetTop;
  }
  return { x, y };
}
```

    and in `giverPoint`, what follows its replay line becomes:

```ts
const middle = middleIn(liveInput.parts.giverPhoto, root);
return { x: middle.x || 128, y: middle.y || 120 };
```

- `mountGratitudeReplay.ts`, which read `LIVE_STAGE_WIDTH`, drops it from its engine import and takes `replayScale` from `../stageLayout`: `const scale = width / LIVE_STAGE_WIDTH;` becomes `const scale = replayScale(width, height);`, and its `--gr-scale` line goes, since the engine sets it now.

- [ ] **Step 5: The stylesheet.** In `gratitude-mini-game.css`:
  - The root's comment becomes `/* clip, not hidden: the speed field's square runs past the stage, and would make it scrollable */`.
  - These px lengths take the stage's scale, as `calc(<length> * var(--gr-scale, 1))`, for every stage, live and replay: `.gr-beam-shaft`'s `width: 190px` and `margin-left: -95px`; `.gr-thumb-glow`'s `width` and `height` `150px` and `margin: -75px 0 0 -75px`; `.gr-dent`'s `width: 112px`, `height: 30px` and `margin-left: -56px`; `.gr-shakemarks svg`'s `width` and `height` `30px` and `margin-top: -15px`; `.gr-hint`'s `font-size: 22px`; the ending's sigh, `.gr-fuu`'s `font-size: 26px` and `gap: 6px`, and its svg's `width` and `height` `26px`. In the replay block, the comment "what the stylesheet sizes in px, at the stage's scale (the engine's --gr-scale)" and the four `.gr[data-mode="replay"]` rules under it go.
  - Append:

```css
/* ------------------------------------------------------------------ regular width
   The top band, the HUD and the receipt keep to the app's content width, in the middle; the
   ground, the heart and its effects keep the whole stage. */
.phone[data-width="regular"] .gr:not([data-mode="replay"]) .gr-top {
  left: max(0px, calc(50% - var(--content-w) / 2));
  right: max(0px, calc(50% - var(--content-w) / 2));
}
.phone[data-width="regular"] .gr:not([data-mode="replay"]) .gr-hud {
  left: max(20px, calc(50% - var(--content-w) / 2));
  right: max(20px, calc(50% - var(--content-w) / 2));
}
.phone[data-width="regular"] .gr:not([data-mode="replay"]) .gr-receipt {
  left: max(24px, calc(50% - var(--content-w) / 2));
  right: max(24px, calc(50% - var(--content-w) / 2));
}
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude` and `pnpm -C apps/frontend typecheck` → PASS: the engine's other tests mount on happy-dom's sizeless stage, the phone fallback, so they see scale 1 and the heart where it was.
- [ ] **Step 7:** Commit: `feat(frontend): the Mini-game grows with a big screen and shrinks on a short one, and a wide card's replay no longer magnifies`

### Task 10: The Gratitude replay

**Files:** Modify `apps/frontend/src/gratitude/replay/replayFeed.ts`, `replayFeed.test.ts`, `mountGratitudeReplay.ts`, `mountGratitudeReplay.test.ts`, `testing.ts`

- [ ] **Step 1: The tests.** In `replayFeed.test.ts`, the stage layout import becomes `import { heartRest, liveHeartRest, liveScale, REPLAY_FRAME } from "../stageLayout";`, and `STAGE_INSET` and `type ReplayStage` join the `./replayFeed` import. `RECORDED_HEART` becomes:

```ts
/** The stage the tests record on, laid out as a replay lays it: fed onto it, every input stays where it was. */
const RECORDED: ReplayStage = { ...STAGE, heart: liveHeartRest(STAGE.width, STAGE.height) };
const onRecorded = () => RECORDED;
```

and each `createReplayFeed(…, RECORDED_HEART)` takes `onRecorded`. In `describe("where a replay's inputs land")`, the card's heart becomes a stage the feed reads:

```ts
const CARD = { width: 268, height: 300 };
const CARD_STAGE: ReplayStage = {
  ...CARD,
  heart: heartRest(CARD.width, CARD.height, REPLAY_FRAME),
};
const CARD_HEART = CARD_STAGE.heart;
```

The touch test's `recorded` is `liveHeartRest(stage.width, stage.height)`, and its feed `createReplayFeed(s.finish().replay, () => CARD_STAGE)`. The stroke test ("unclamped past the replay stage's edge") gives way to:

```ts
it("draws a stroke that would run off the stage in toward the heart, keeping its shape", () => {
  const recorded = liveHeartRest(STAGE.width, STAGE.height);
  // A drag along the bottom of the phone, far under the heart.
  const path: StagePoint[] = [
    { x: 60, y: 700 },
    { x: 140, y: 720 },
    { x: 220, y: 735 },
    { x: 300, y: 710 },
  ];
  const s = session();
  s.tap(1000);
  s.fingerDown(1100, path[0].x, path[0].y);
  path.slice(1).forEach(({ x, y }, i) => s.move(1140 + 40 * i, x, y));
  s.lift();
  s.end(1400, "closed");

  const stroke = points(createReplayFeed(s.finish().replay, () => CARD_STAGE).inputs).slice(1);
  const kept = stroke.map((point) => onHeart(point, CARD_HEART));
  const was = path.map((point) => onHeart(point, recorded));
  // One share for every point: it shrinks toward the heart's middle without bending.
  const reach = kept[0][0] / was[0][0];
  expect(reach).toBeLessThan(1);
  expect(kept).toEqual(was.map(([x, y]) => near([x * reach, y * reach])));
  for (const { x, y } of stroke) {
    expect(x).toBeGreaterThanOrEqual(STAGE_INSET - 1e-9);
    expect(x).toBeLessThanOrEqual(CARD.width - STAGE_INSET + 1e-9);
    expect(y).toBeLessThanOrEqual(CARD.height - STAGE_INSET + 1e-9);
  }
});

it("keeps a touch recorded far off the heart on the replay's stage", () => {
  // A replay from another device can carry a touch at its stage's very corner.
  const replay: ReplayV1 = {
    v: 1,
    seed: 1,
    intensity: 1,
    stage: [1180, 820],
    durationMs: 100,
    endReason: "closed",
    switchedAtHit: 0,
    hits: [0, 0, 0, 1],
    strokes: [],
    shakes: [],
    strokePasses: [],
  };
  const [touch] = points(createReplayFeed(replay, () => CARD_STAGE).inputs);
  expect(touch.x).toBeGreaterThanOrEqual(STAGE_INSET - 1e-9);
  expect(touch.y).toBeGreaterThanOrEqual(STAGE_INSET - 1e-9);
});

it("lands each input by the heart where the stage has it once it's due", () => {
  const s = session();
  [1000, 1100].forEach((t) => s.tap(t));
  s.end(1200, "closed");
  let laid = CARD_STAGE;
  const feed = createReplayFeed(s.finish().replay, () => laid);
  const [first] = feed.due(0);
  // The card widens, as a rotation can leave it: its heart moves to the new middle.
  laid = { width: 460, height: CARD.height, heart: heartRest(460, CARD.height, REPLAY_FRAME) };
  const [second] = feed.due(100);
  if (first?.kind !== "touch" || second?.kind !== "touch") throw new Error("no touches fed");
  expect(onHeart(second.point, laid.heart)).toEqual(near(onHeart(first.point, CARD_HEART)));
  expect(second.point.x).toBeCloseTo(laid.heart.x, 0);
});

it("holds strokes recorded on a big stage to the rules they were recorded under", () => {
  const big = { width: 820, height: 1180 };
  const s = session();
  s.tap(1000);
  s.end(1100, "closed");
  const replay: ReplayV1 = { ...s.finish().replay, stage: [big.width, big.height] };
  const { inputScale } = createReplayFeed(replay, () => CARD_STAGE);
  // A run just long enough to count there is just long enough on the card.
  const run = FEEL_CONFIG.stroke.minRunPx * liveScale(big.width, big.height);
  const onCard = (run / liveHeartRest(big.width, big.height).width) * CARD_HEART.width;
  expect(onCard).toBeCloseTo(FEEL_CONFIG.stroke.minRunPx * inputScale);
});
```

In `mountGratitudeReplay.test.ts`, `play`'s fake feed becomes `(_replay, stage) => feedOf(tapsOn(times)(stage().heart), end ?? { at: replay.durationMs, reason: replay.endReason })`.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude/replay` → FAIL: `STAGE_INSET` and `ReplayStage` aren't exported, and the feed wants a heart.
- [ ] **Step 3: The feed**, `replayFeed.ts`:
  - The stage layout import becomes `import { liveHeartRest, liveScale } from "../stageLayout";`.
  - After `MAX_REPLAY_SPEED`: `/** A replayed input keeps at least this far inside its stage's edges, px, so what it draws stays on the card. */ export const STAGE_INSET = 8;`
  - After `StagePoint`:

```ts
/** The replay's stage as it's laid out now: its size, and its heart at rest. */
export interface ReplayStage {
  width: number;
  height: number;
  heart: HeartBox;
}
```

- `ReplayFeed` gains, after `end`: `/** px on the stage, as first laid out, per px of the live game on a phone: the stroke rules scale by it, as they did on the recording's stage. */ readonly inputScale: number;`. Its `inputs` and `due` docs add "placed on the stage as it's laid out now".
- After `TIE_ORDER`:

```ts
/** An offset from the recorded heart's middle, in its widths and heights. */
type Offset = StagePoint;

/** An input as recorded: its place an offset from the heart, until it's placed on a stage. */
type Recorded =
  | { kind: "touch"; at: number; offset: Offset; counted: boolean }
  | { kind: "strokeStart"; at: number; offset: Offset }
  | { kind: "strokeMove"; at: number; offset: Offset; fastPass: boolean | null }
  | Extract<FeedInput, { kind: "strokeEnd" | "reversal" }>;

/**
 * How much of their offsets from the heart the inputs keep on `stage`: 1, or less where that would
 * carry one past STAGE_INSET from an edge, drawing them all in alike so a stroke keeps its shape.
 */
function reachOn({ heart, width, height }: ReplayStage, offsets: readonly Offset[]): number {
  let reach = 1;
  for (const { x, y } of offsets) {
    const dx = x * heart.width;
    const dy = y * heart.height;
    if (dx < 0) reach = Math.min(reach, (heart.x - STAGE_INSET) / -dx);
    else if (dx > 0) reach = Math.min(reach, (width - STAGE_INSET - heart.x) / dx);
    if (dy < 0) reach = Math.min(reach, (heart.y - STAGE_INSET) / -dy);
    else if (dy > 0) reach = Math.min(reach, (height - STAGE_INSET - heart.y) / dy);
  }
  return Math.max(0, reach);
}
```

- `createReplayFeed(replay: ReplayV1, target: HeartBox)` becomes `createReplayFeed(replay: ReplayV1, stage: () => ReplayStage)`, its doc: "The replay's inputs in time order. Each keeps its place relative to the heart, in heart widths from its middle, so a stroke scales evenly and keeps its shape; on a stage too small to hold them all, they're drawn in alike. `stage` says how the replay's stage is laid out now: an input is placed when it's due, so a stage that re-lays mid-replay keeps what's still to come by its heart." Its head, down to the old `place` (whose clamping comment goes), becomes:

```ts
const [width, height] = replay.stage;
const recorded = liveHeartRest(width, height);
const offsetOf = (x: number, y: number): Offset => ({
  x: ((x / STAGE_UNITS) * width - recorded.x) / recorded.width,
  y: ((y / STAGE_UNITS) * height - recorded.y) / recorded.height,
});
```

- `touches`, `reversals` and `strokeInputs` hold `Recorded`s: each `point: place(x, y)` becomes `offset: offsetOf(x, y)` (in the stroke loop, `const offset = offsetOf(x, y);` and `{ kind: "strokeStart", at, offset }`, `{ kind: "strokeMove", at, offset, fastPass }`).
- From `const inputs = …` to the function's end:

```ts
// Each group is in time order already, and the sort is stable, so ties keep TIE_ORDER.
const all = [...touches, ...strokeInputs, ...reversals].sort(
  (a, b) => a.at - b.at || TIE_ORDER[a.kind] - TIE_ORDER[b.kind],
);
const offsets = all.flatMap((input) => ("offset" in input ? [input.offset] : []));

/** The stage the inputs were last placed on, and how much of their offsets they keep there. */
let laid: { stage: ReplayStage; reach: number } | null = null;
const layout = () => {
  const now = stage();
  if (laid && laid.stage === now) return laid;
  const fresh = { stage: now, reach: reachOn(now, offsets) };
  laid = fresh;
  return fresh;
};
const pointOf = (offset: Offset): StagePoint => {
  const { stage: on, reach } = layout();
  return {
    x: on.heart.x + offset.x * on.heart.width * reach,
    y: on.heart.y + offset.y * on.heart.height * reach,
  };
};
const place = (input: Recorded): FeedInput => {
  switch (input.kind) {
    case "touch":
      return { kind: "touch", at: input.at, point: pointOf(input.offset), counted: input.counted };
    case "strokeStart":
      return { kind: "strokeStart", at: input.at, point: pointOf(input.offset) };
    case "strokeMove":
      return {
        kind: "strokeMove",
        at: input.at,
        point: pointOf(input.offset),
        fastPass: input.fastPass,
      };
    default:
      return input;
  }
};

const first = layout();
let next = 0;
return {
  get inputs() {
    return all.map(place);
  },
  end: { at: replay.durationMs, reason: replay.endReason },
  // The recording's stage played the stroke rules at its own live scale.
  inputScale: (first.stage.heart.width / recorded.width) * first.reach * liveScale(width, height),
  due(at) {
    const from = next;
    while (next < all.length && all[next].at <= at) next++;
    return all.slice(from, next).map(place);
  },
};
```

- [ ] **Step 4: The test feed** in `replay/testing.ts`: `feedOf(inputs, end)` gains a third parameter, `inputScale = 1`, returned beside `inputs` and `end`.
- [ ] **Step 5: The mount.** In `mountGratitudeReplay.ts`, the stage layout import becomes `import { heartRest, REPLAY_FRAME, replayScale } from "../stageLayout";`, and `type ReplayStage` joins the feed's import. From `const width = …` down to `const recorded = …`:

```ts
/** The stage as it's laid out now: its size, and its heart at rest. */
const measure = (): ReplayStage => {
  const width = root.clientWidth || REPLAY_LAYOUT.fallback.width;
  const height = root.clientHeight || REPLAY_LAYOUT.fallback.height;
  return { width, height, heart: heartRest(width, height, REPLAY_LAYOUT.frame) };
};
let laid = measure();
// Lettering, words and mini hearts keep the size they start at. The engine re-lays its heart,
// HUD and walls as the card does, and the feed places what's still to come by that heart.
const scale = replayScale(laid.width, laid.height);
const feed = createFeed(replay, () => laid);
const resizes =
  typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        laid = measure();
      })
    : null;
resizes?.observe(root);
```

The engine takes `inputScale: feed.inputScale` in place of `heart.width / recorded.width`, and `stop` adds `resizes?.disconnect();` beside `visibility?.disconnect();`.

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/gratitude` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 7:** Commit: `fix(frontend): the Gratitude replay scales from both sides of its card, re-lays on resize, and keeps every input on its stage`

### Task 11: The seal ceremony through a rotation

**Files:** Modify `apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.test.tsx`, `apps/frontend/src/sticker-creation/DrawingScreen.tsx`

The sealed card's regular width is the foundations plan's (`SealedCard.css`); this task leaves the card's styles alone. The drawing sheet plan, beside this one, also edits `DrawingScreen.tsx`: rebase over it if it lands first, keeping its `sheetBox()`.

- [ ] **Step 1: Write the failing test**, appended to `SealCeremony.test.tsx`, with `vi.unstubAllGlobals();` added to the file's `afterEach`:

```tsx
describe("SealCeremony, as the screen turns", () => {
  it("moves the sticker with the sheet while it waits for its seal", async () => {
    let resize = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    let sheetNow = SHEET;
    view = renderWithApi(
      <SealCeremony
        sticker={sticker}
        sealed={null}
        failed={false}
        leaving={false}
        onLeft={onLeft}
        sheet={SHEET}
        measureSheet={() => sheetNow}
        handle="alice"
        onKeepDrawing={onKeepDrawing}
        onBoard={onBoard}
        onShop={onShop}
      />,
      emptyApi({ tickets: () => Promise.resolve(FRESH_TICKETS) }),
    );
    await act(async () => {});
    /** Where the sticker sits on a sheet laid out as `on`: its place in the ink, at the sheet's scale. */
    const leftOn = (on: typeof SHEET) => `${on.x + sticker.place.x * (on.w / sticker.inkWidth)}px`;
    const shown = () => view?.host.querySelector<HTMLElement>(".seal-ceremony__sticker");
    expect(shown()?.style.left).toBe(leftOn(SHEET));

    sheetNow = { x: 120, y: 40, w: 748, h: 1000 };
    act(() => resize());
    expect(shown()?.style.left).toBe(leftOn(sheetNow));
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/sealing/SealCeremony.test.tsx` → FAIL: there's no `measureSheet` prop, and the sticker stays at 58px.
- [ ] **Step 3: Implement.** In `SealCeremony.tsx`, `Props` gains after `sheet`:

```ts
  /**
   * Where the sheet is now, measured again whenever the ceremony's box resizes, as a rotation re-lays
   * the drawing screen: the dim, the cut and the sticker follow it, and the flight to the card is
   * measured again. Without it the sheet stays where the seal found it.
   */
  measureSheet?: () => Box;
```

Above `stage`: `const sameBox = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;`. The component takes `measureSheet`, and after `const slot = useRef<HTMLDivElement>(null);`:

```ts
// The sheet as last measured: where the seal found it, then wherever a resize moves it.
const [sheetNow, setSheetNow] = useState(sheet);
const remeasure = useEffectEvent(() => measureSheet?.() ?? sheet);
```

The render reads `stage(sticker, sheetNow)`. In the layout effect, its first line (`const { box, body, contour } = stage(sticker, sheet);`) goes, and the block from `const size = …` through `const cutLine = makeCutLine(…);` becomes:

```ts
const r = Math.min(devicePixelRatio || 1, 2);
/** Lays the dim, the used sticker silhouette and the cut out over the sheet `on`, and says where. */
const layOut = (on: Box) => {
  const size = { w: host.offsetWidth, h: host.offsetHeight };
  const placed = stage(sticker, on);
  paintDim(parts.dim, size, placed.box, sticker.maskImage, r);
  paintUsedStickerSilhouette(parts.usedStickerSilhouette, placed.box, sticker.maskImage, r);
  const cutLine = makeCutLine(parts.cut, size, placed.contour, r);
  return { sheet: on, size, box: placed.box, body: placed.body, cutLine };
};
let laid = layOut(sheet);
```

`cardReady` measures `flight(laid.box, laid.body, …)`; `cutter` reads `laid.cutLine.length`, and `show` calls `laid.cutLine.draw(…)`. After `skip.current = …`:

```ts
// A resize, as a rotation brings, moves the sheet and the card. The sticker and its cut follow
// the sheet, its base is set at once so this frame draws it there, and the flight is measured again.
const relayOut = () => {
  let on: Box;
  try {
    on = remeasure();
  } catch (error) {
    console.error(
      "The seal ceremony couldn't find the sheet after a resize; the sticker stays where it was",
      error,
    );
    return;
  }
  const resized = host.offsetWidth !== laid.size.w || host.offsetHeight !== laid.size.h;
  if (!resized && sameBox(on, laid.sheet)) return;
  laid = layOut(on);
  for (const node of [parts.sticker, parts.shadow, parts.usedStickerSilhouette])
    Object.assign(node.style, boxStyle(laid.box));
  path = null;
  if (isSealed()) cardReady();
  setSheetNow(on);
  show();
};
const watching = typeof ResizeObserver === "function" ? new ResizeObserver(relayOut) : null;
watching?.observe(host);
```

and the effect's cleanup gains `watching?.disconnect();`. In `DrawingScreen.tsx`, `<SealCeremony …>` gains `measureSheet={sheetBox}` after `sheet={ceremony.sheet}`.

- [ ] **Step 4: The card's slot in regular width.** The ceremony flies the sticker to `.sealed-card__slot` wherever the foundations plan's rule puts the card: centered at `--content-w` over the foot. Task 16's seal ceremony check measures the landing against the slot at the regular sizes, before and after a turn with the card up; a miss there is this task's to fix, in `SealCeremony.tsx`, never in the card's styles.
- [ ] **Step 5:** Run the ceremony's tests and `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/DrawingScreen.test.tsx`, then `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 6:** Commit: `fix(frontend): a sealing sticker follows the sheet and the sealed card through a rotation`

### Task 12: Receiving

**Files:** Modify `apps/frontend/src/receiving/receive-gift-dialog.css`

UI edit: craft floor first, `/impeccable adapt` as the lens. CSS only; Task 16 measures it.

- [ ] **Step 1: The bag's drop and the sticker's rise become variables.** `.receive-gift` gains, first:

```css
/* How far the closed bag sits low on its stage, the glide its reveal makes, and how far the
     sticker rises out of the bag. */
--glide: 92px;
--rise: -52px;
```

`.receive-gift__stage`'s `transform: translateY(92px);` becomes `transform: translateY(var(--glide));`; `.receive-gift.is-out .receive-gift__figure`'s transform becomes `translateY(var(--rise))`, and `.receive-gift.is-receiving .receive-gift__figure`'s `translateY(calc(var(--rise) - 6px)) scale(1.02)`.

- [ ] **Step 1b: The end screens clear the home indicator by its real safe area.** The dialog lies on `.phone`, over the tabs, where the foundations plan's `--foot-inset` is the home indicator's safe area. `.receive-gift__end-acts`'s fixed `padding: 0 24px 34px;` stands in for the home indicator on the target phone. It becomes the larger of the two, so the target phone keeps today's 34px and a deeper safe area is never covered, under the comment `/* At least the home indicator's safe area (tokens.css); 34px, the target phone's, at the least. */`:

```css
padding: 0 24px max(34px, var(--foot-inset, 0px));
```

- [ ] **Step 2: The hint follows the stage**, replacing `.receive-gift__hint`:

```css
/* Under the stage, clear of the bag where it sits low, wherever the heading's lines leave the stage.
   Under a two-line heading, as phones show it, that's where it always sat. */
.receive-gift__hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: calc(var(--glide) + 28px) 24px 0;
  text-align: center;
  transition: opacity 240ms ease;
}
```

- [ ] **Step 3: Short screens and regular width**, before the reduced-motion block:

```css
/* A short screen, such as LINE's iPad sheet or an iPhone SE inside LINE: the heading and the bag sit
   higher, and the sticker rises clear of a tighter Accept sheet. */
.phone[data-height="short"] .receive-gift {
  --glide: 56px;
  --rise: -62px;
}

.phone[data-height="short"] .receive-gift__head {
  padding-top: 12px;
}

.phone[data-height="short"] .receive-gift__sheet.bottom-sheet {
  padding-bottom: calc(14px + var(--sheet-foot-inset, 0px));
}

.phone[data-height="short"] .receive-gift__acts {
  padding-top: 8px;
}

.phone[data-height="short"] .receive-gift__terms {
  margin-top: 4px;
}

/* Regular width: a phone's page in the middle of the screen, the bag, its tab and the Accept sheet
   in their places on it. The sheet floats as every regular sheet does, over the page's foot. */
.phone[data-width="regular"] .receive-gift {
  container-type: size;
  padding-inline: max(0px, calc((100% - var(--content-w)) / 2));
}

.phone[data-width="regular"] .receive-gift > * {
  --page-y: max(0px, calc((100cqh - var(--ph-h)) / 2));
}

.phone[data-width="regular"] .receive-gift > :first-child {
  margin-top: var(--page-y);
}

.phone[data-width="regular"] .receive-gift__end-acts {
  margin-bottom: var(--page-y);
}

/* Lifted to the page's foot through the foundations rule's --sheet-lift, which sets its bottom and
   the distance it slides in from. */
.phone[data-width="regular"] .receive-gift__sheet.bottom-sheet {
  --sheet-lift: calc(var(--page-y) + var(--gutter) + var(--foot-inset, 0px));
}
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/receiving` → PASS: nothing the tests read changed.
- [ ] **Step 5:** Commit: `feat(frontend): the receive dialog keeps a phone's page on a wide screen and holds on a short one`

### Task 13: Giving and the gift received notice

**Files:** Modify `apps/frontend/src/giving/give-sheet.css`, `Giving.css`, `gift-received-notice.css`, `GiftReceivedNotice.tsx`

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: The picker and Giving's page.** Append to `give-sheet.css`:

```css
/* Regular width: as many tiles a row as fit at a phone's tile size, rather than four stretched ones. */
.phone[data-width="regular"] .sticker-picker {
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
}
```

and to `Giving.css`, before its reduced-motion block:

```css
/* Regular width: a phone's page in the middle of the screen, the sticker and its sheet in their
   places on it; the sheet floats as every regular sheet does, over the page's foot. */
.phone[data-width="regular"] .giving {
  container-type: size;
}

.phone[data-width="regular"] .giving > * {
  --page-y: max(0px, calc((100cqh - var(--ph-h)) / 2));
}

.phone[data-width="regular"] .giving__sticker {
  top: var(--page-y);
}

/* Lifted to the page's foot through the foundations rule's --sheet-lift. */
.phone[data-width="regular"] .giving > .bottom-sheet {
  --sheet-lift: calc(var(--page-y) + var(--gutter) + var(--foot-inset, 0px));
}
```

- [ ] **Step 2: The notice's prop fits its stage.** In `GiftReceivedNotice.tsx`, add `useLayoutEffect` to the React import, and `/** The prop's size, px, as gift-received-notice.css lays it out: a smaller stage shrinks it whole. */ const PROP = { width: 350, height: 390 };`. In the component, add `const stage = useRef<HTMLDivElement>(null);`, put `ref={stage}` on `<div className="gift-received-notice__stage">`, and before the arc's effect:

```ts
// On a short screen the prop shrinks whole to its stage, rather than losing its foot.
useLayoutEffect(() => {
  const [box, room] = [prop.current, stage.current];
  if (!box || !room) return;
  const fit = () => {
    if (!room.clientWidth || !room.clientHeight) return;
    const k = Math.min(1, room.clientWidth / PROP.width, room.clientHeight / PROP.height);
    box.style.setProperty("--fit", String(k));
  };
  fit();
  if (typeof ResizeObserver !== "function") return;
  const resized = new ResizeObserver(fit);
  resized.observe(room);
  return () => resized.disconnect();
}, []);
```

The arc measures in the prop's own px, which a fit scales along with the flyer. Its effect's head becomes:

```ts
  useEffect(() => {
    const [from, to] = [flyer.current, face.current];
    if (!arriving || !from || !to) return;
    // In the prop's own px: a fitted prop scales the flyer along with it.
    const tx = to.offsetLeft + to.offsetWidth / 2 - FLYER_PX / 2;
    const ty = to.offsetTop + to.offsetHeight / 2 - FLYER_PX / 2;
```

and the arc's `animate` call stays as it is.

- [ ] **Step 3: The notice's styles.** `.gift-received-notice__prop` gains `scale: var(--fit, 1);`. The notice lies on `.phone`, over the tabs, so its foot reads the foundations plan's home indicator token in place of `env()`: `.gift-received-notice__act`'s `padding: 0 24px calc(34px + env(safe-area-inset-bottom));` becomes `padding: 0 24px calc(34px + var(--foot-inset, 0px));`, the receive dialog's end screens' foot too (Task 12). Before the reduced-motion block:

```css
/* A short screen: less room above and below, so the prop keeps more of its size. */
.phone[data-height="short"] .gift-received-notice__head {
  padding-top: 16px;
}

.phone[data-height="short"] .gift-received-notice__act {
  padding-bottom: calc(16px + var(--foot-inset, 0px));
}

/* Regular width: a phone's page in the middle of the screen. */
.phone[data-width="regular"] .gift-received-notice {
  container-type: size;
  padding-inline: max(0px, calc((100% - var(--content-w)) / 2));
}

.phone[data-width="regular"] .gift-received-notice > * {
  --page-y: max(0px, calc((100cqh - var(--ph-h)) / 2));
}

.phone[data-width="regular"] .gift-received-notice__head {
  margin-top: var(--page-y);
}

.phone[data-width="regular"] .gift-received-notice__act {
  margin-bottom: var(--page-y);
}
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/giving` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 5:** Commit: `feat(frontend): Giving keeps a phone's page on a wide screen, and the received notice fits a short one`

### Task 14: The Shop's column

**Files:** Modify `apps/frontend/src/shop/ShopScreen.tsx`, `ShopScreen.css`

UI edit: craft floor first, `/impeccable adapt` as the lens.

- [ ] **Step 1: The swatch's side by size class.** In `ShopScreen.tsx`, import `useSizeClass` from `../app/sizeClass`; `SWATCH` becomes:

```ts
/**
 * A swatch's side, px: a phone's, and regular width's, where four run past the Shop's column as
 * they run past a phone's edge, so there's plainly more.
 */
const SWATCH = { compact: 96, regular: 128 } as const;
```

In `ShopScreen`, `const side = SWATCH[useSizeClass().width];` comes before `onSticker`; every size that read `SWATCH` (the skeleton's, `FinishPreview`'s and `BrushStrokeSample`'s `side`) reads `side`; and the root becomes `<div className="shop" style={{ "--swatch": `${side}px` }}>`.

- [ ] **Step 2: The styles.** In `ShopScreen.css`, `.shelf-item__swatch`'s `width: 104px;` and `height: 104px;` become `width: calc(var(--swatch, 96px) + 8px);` and `height: calc(var(--swatch, 96px) + 8px);`, under the comment `/* The swatch's side (ShopScreen's SWATCH) and its label stock's edge. */`. Append:

```css
/* ---------- Regular width ---------- */

/* The Shop keeps to the app's content width, in the middle; its shelves run past the column's edge. */
.phone[data-width="regular"] .shop {
  padding-inline: max(0px, calc((100% - var(--content-w)) / 2));
}

/* The page's one key at its own width, as on every card. */
.phone[data-width="regular"] .reserve-hero__key {
  width: auto;
  min-width: var(--key-min-w);
}
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/shop` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 4:** Commit: `feat(frontend): the Shop keeps to a column on a wide screen, its shelves still running past its edge`

### Task 15: The docs this plan's work changes

**Files:** Modify `DESIGN.md`, `docs/gratitude-mini-game-design-doc.md`

The spec's sign-off covers these DESIGN.md edits; the finish adds the size-class overview to Layout. No PRODUCT.md sentence becomes false here.

- [ ] **Step 1: DESIGN.md.**
  - Explore's lead: "Under the search, a two-way switch picks **Stickers** or **This week**." becomes "Under the search, a two-way switch picks **Stickers** or **This week**; where both fit side by side, This week sits beside the pile and the switch goes."
  - The pile: "a perforation row across the whole width as its top edge" becomes "a perforation row across the pile as its top edge".
  - The heap: "The layout is 360 units across on every phone, seeded by the day and the sticker, so the pile looks the same on every visit and a new sticker moves nothing beneath it." becomes "The layout is 360 units across on every screen, seeded by the day and the sticker, so the pile looks the same on every visit and a new sticker moves nothing beneath it. A unit grows with the pile's width up to 1.5px; a wider pile centers each day's heap at that size, its badge at the heap's left."
  - Lifted sticker's lead: "lifts it into a bottom sheet over a 36% Ink scrim." becomes "lifts it into a bottom sheet over a 36% Ink scrim; on a wide screen, into a card in its middle, at the cards' width."
  - The sheet: "the sticker in a 210px square" becomes "the sticker in a square of at least 210px, and never smaller than its copy on the pile,".
  - Gratitude replay, What plays: "Every tap plays where and when it landed;" becomes "Every tap plays where and when it landed, the whole combo drawn in toward the heart, keeping its shape, where the card's stage is too small to hold it;".
  - Shop's coming-soon shelves: "Four 104px swatches scroll sideways with snap, the fourth peeking past the edge." becomes "Four swatches scroll sideways with snap, the fourth peeking past the edge: 104px on a phone, and 136px on a wide screen, whose edge is the Shop's column's."
- [ ] **Step 2: The Mini-game design doc.**
  - Files table: `stageLayout.ts`'s row becomes "Where the heart rests on a stage, under the live screen's top band and HUD or a replay's HUD, with room kept under it; the live game's scale and a replay's".
  - Playing a replay, "The same engine": its second sentence becomes "`replayFeed.ts` turns the replay into inputs, each where it was relative to the heart, in heart widths from its middle, drawn in alike where the stage is too small to hold them all, and places each by the heart where the stage has it when it's due."
  - Its **Scale.** bullet becomes "**Scale.** The lettering, particles, mini hearts, the loose heart's kicks and the screen shake draw at the replay's heart's width over a phone's live heart, so a wide, short card doesn't magnify them, with fewer mini hearts in play. The scale is read as the replay starts; on a resize the engine re-lays the heart, HUD and walls. The physics runs in the live game's pixels."
  - Effects and motion gains, after **Intensity.**: "**Scale.** The live game draws at 1 on a phone. In regular width its lettering, words, particles, mini hearts, start hint and the heart's widest grow with the stage's smaller side, up to `MAX_LIVE_SCALE`; a stage shorter than `FULL_SCALE_HEIGHT` draws them smaller (`stageLayout.ts`). The touch rules' lengths and speeds (`tapSlopPx`, `tryTravelPx`, and a stroke's `minRunPx`, `turnPx` and `fastPxPerMs`) are a phone's px and scale with it, so the game plays the same at any size; the shake detector reads the device's own motion, which no screen size changes. The top band, the HUD and the receipt keep to the app's content width. The scale is read as the screen opens; a rotation re-lays the stage and keeps it." and, after **The motion permission.**: "**Axes.** The phone's motion and the light's tilt are read in the screen's axes (`ui/screenAxes.ts`), so landscape sways and kicks the heart and moves the light as portrait does."
- [ ] **Step 3:** `pnpm format` on the two files, then commit: `docs: DESIGN.md and the Mini-game design doc follow Explore, the dialogs and the Mini-game on an iPad`

### Task 16: Check it in WebKit and Chromium

Scratch (scripts, screenshots, logs) goes in `~/.cache/drawing-app-ipad-explore/`, never in the repo.

- [ ] **Step 1: A dev server of its own,** on 5193 and 8793:
  - From `apps/api`, in the background: `PORT=8793 DATABASE_URL=data/ipad-explore.db IMAGE_DIR=../../data/ipad-explore-images IMAGE_BASE_URL=http://localhost:5193/api/images pnpm dev`. `DATABASE_URL` resolves from the repo root.
  - An untracked `apps/frontend/vite.explore.config.ts` that `mergeConfig`s `vite.config.ts` with `server: { port: 5193, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:8793" } } }`, run as `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm -C apps/frontend exec vite --config vite.explore.config.ts`.
- [ ] **Step 2: People, stickers and a gift.** If `<main>/.claude/worktrees/ipad-research/data/ipad-research.db` still exists, start from a copy: `sqlite3 <it> ".backup '<worktree>/data/ipad-explore.db'"` and `/bin/cp -Rf <main>/.claude/worktrees/ipad-research/data/ipad-research-images <worktree>/data/ipad-explore-images` (the shell's `cp` asks before it overwrites), before the API starts; its `ipad-alice` has No.0005 with a Transfer Trail row and a Replay (`~/.cache/drawing-app-ipad/seed.txt`). Otherwise seed fresh people on the empty database:
  - Sign in as anyone at `http://localhost:5193/?as=<name>`: LIFF Mock answers for LINE and the dev sign-in makes the account. WebKit needs the session cookie added back without `Secure`: `POST /api/session` with `{"idToken":"drawing-app-dev-id-token:{\"sub\":\"dev-<name>\",\"name\":\"<Name>\"}","language":"en"}`, then add its `Set-Cookie` to the context for `localhost`, path `/`, `secure: false` (as `~/.cache/drawing-app-ipad/scripts/captures/lib.js` does, if it's still there).
  - Seal under LIFF Mock: Draw, one stroke, the seal check tapped twice; the mock chain seals it. Each person has three daily tickets a day, and the third seal's card is the last-ticket card. Seal four or more stickers across two days' worth of people for Explore's pile.
  - Give between two people: as the giver, Explore, search the other's handle, their board, Give, pick a sticker, Give, Send in a LINE chat (LIFF Mock's picker answers). The gift waits on the other's board.
  - Receive it as the other: the board's gift badge, the pull tab (focus the slider, End), Accept. Send gratitude plays the Mini-game; its sticker's detail then has a Transfer Trail row with a Replay, and the giver's next board load shows the gift received notice.
  - For the receive dialog's checks, keep one more gift waiting, and leave each check with Not now.
- [ ] **Step 3: The checks.** Playwright WebKit (iPad UA, DPR 2; iPhone UA, DPR 3 at phone sizes; `reducedMotion: "reduce"` for the board and Explore, since WebKit's screenshots draw the board's back face over its front otherwise) and Chromium (motion on). Sizes: 390×844, 375×591 (an iPhone SE inside LINE), 540×620 and 540×564 (LINE's iPad sheet, with and without its header's share), 744×1133, 1133×690 (regular and short), 820×1180, 1180×820, 1376×1032. Explore, the sticker detail and the receive dialog also in Japanese at 820×1180 and 540×620 (`localStorage` `draw.language` = `ja`). Each check is a measurement with a pass line:
  - **Pile:** `--k` on `.sticker-pile` ≤ `PILE_MAX_SCALE`; every `.pile-day__heap` is `PILE_WIDTH × k` wide and centered on the pile (±1 px); `.pile-day__badge` sits 16 px in from its heap's left; a `.pile-tag`'s font size ≤ 16.5 px.
  - **Columns:** at 1180×820 and 1376×1032, `.this-week` lies wholly right of `.sticker-pile`, the search over the pile's column, and there's no `.view-switch`; at the other regular sizes, one column, with `.artist-search`, `.view-switch` and the leaderboard ≤ 540 px wide and centered (±1 px). Search results replace both columns.
  - **Lifted:** the lifted figure's long side ≥ its pile copy's (`.pile-sticker__drop` of the same `data-pile-id`); in regular width the card's center is the screen's (±2 px) and it's ≤ `--content-w` wide; paging and Put back still fly the sticker between the card and its spot.
  - **Rotation mid-scroll:** WebKit, Explore scrolled two days down; note the topmost visible `.pile-sticker` and its top over its height; resize 820×1180 → 1180×820 → 820×1180, then 390×844 → 844×390 → 390×844, waiting 150 ms after each; that sticker's top over its height stays within 0.05 of what it was.
  - **Sticker detail:** the figure 320 px in regular width, 216 otherwise; `.sticker-detail__by`'s vertical center is its next fact's (±1 px) at every size, in both languages; `.sticker-detail__main`'s content ≤ `--content-w`. Opened from a board sticker at 540×620 and 1180×820 and closed, the sticker flies back onto its spot on the panel: the flyer's last box within 2 px of the board sticker's.
  - **Replay:** `--gr-scale` on `.replay-stage__host .gr` equals `replayScale` of the host's size (±0.01); the heart anchor's box lies inside the host; sampled at 25, 50 and 75% of the replay, every `.gr-cap` box lies inside the host; resizing 820×1180 → 1180×820 mid-replay leaves the heart inside the host and the landing in the card's heart dot.
  - **Mini-game** (the developer slip's "Try the gratitude mini-game", then 30 taps 70 ms apart): `--gr-scale` equals `liveScale` of the stage; at the ready phase the hint's bottom ≤ the stage's; through the combo every `.gr-cap` box lies inside `.gr` (sampled every 200 ms); in regular width `.gr-hud` and `.gr-receipt` ≤ `--content-w` and centered; the speed field's svg is at least the stage's diagonal. If words clip at 540×620, raise `FULL_SCALE_HEIGHT` and say so.
  - **Receive dialog:** closed, the hint's top ≥ the bag's bottom and its bottom ≤ the dialog's; torn open, the figure's bottom ≤ the Accept sheet's top − 8 px at every size, 375×591 and 540×564 included; in regular width the sheet's foot sits `(H − min(H, 844)) / 2` plus the gutter above the screen's (±2 px), centered; at 390×844 with a two-line heading the hint's top is 530 px (±1).
  - **Give sheet:** four picker tiles a row at 390×844 and 540×620, five or more in regular width; the sheet at `--content-w`, centered across the screen's foot. Giving's sticker and sheet in regular width: the sheet's foot `(H − min(H, 844)) / 2` plus the gutter above the screen's.
  - **Gift received notice:** at 375×591, 540×620 and 540×564 the prop's scaled box lies inside its stage, and Back to My board is on screen.
  - **The home indicator:** Playwright reports no safe area, so `document.documentElement.style.setProperty("--foot-inset", "34px")` stands in for an iPhone's. At 390×844, the receive dialog's end screen's `.receive-gift__end-acts` and the notice's `.gift-received-notice__act` each compute a 68px `padding-bottom`; at 375×591, 50px for the notice's act under the short pass.
  - **Shop:** in regular width `.shop`'s content ≤ `--content-w` and centered, the reserve tickets key narrower than its card; at every size each shelf's fourth swatch runs past its row's right edge, partly showing.
  - **Seal ceremony** (a fresh person, a stroke, the seal check twice), with `POST /api/stickers` held 6 s by `context.route`: resize 820×1180 → 1180×820 during the wait; the sticker's box stays inside the sheet's box (`.ink-sheet`) and the cut runs round it; let the answer through; the sticker's center lands within 4 px of `.sealed-card__slot`'s; resize back with the card up, and it's still within 4 px. The landing meets the slot the same way at every regular size, where the foundations plan's rule centers the card at `--content-w`. The last-ticket card fits inside the screen at 375×591 and 540×564; if it doesn't, say so in the hand-off rather than restyle the card, which is the foundations plan's: the LINE sheet plan's check of every surface at those sizes fixes it.
  - **Tilt** (Chromium, a board with stickers): an init script makes `screen.orientation` report `{ angle: 90 }`; after `deviceorientation` with gamma −40 and beta 32, a `.live-resin` reads `--lx` 1.000 and `--ly` 0.000.
  - Screenshots at every size of the pile, the lifted card, This week, the sticker detail mid-replay, the Mini-game mid-combo and its receipt, the receive dialog closed and torn, the give sheet, the Shop and the sealed card, as contact sheets for ad0ll.
- [ ] **Step 4:** Fix what the checks find in one batch, run them once more, and stop both servers.
- [ ] **Step 5:** Commit any fixes: `fix(frontend): …`, naming what each fixes.

### Task 17: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, the format check and the Move tests all pass.
- [ ] **Step 2:** Squash the branch into `feat(frontend): Explore, the dialogs and the Mini-game on an iPad` (Tasks 1–14 and 16's fixes) and Task 15's docs commit, with no AI attribution lines.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push.
- [ ] **Step 4:** Remove the worktree (it holds the untracked Vite config and `data/ipad-explore*`), the branch and `~/.cache/drawing-app-ipad-explore/` once ad0ll has the screenshots. The spec and the plans stay, this plan's boxes ticked on main (the LINE sheet plan checks for open ones): the LINE sheet plan's finish deletes them.
- [ ] **Step 5:** Hand ad0ll what needs a real iPad: in landscape, tipping its right edge down moves the light right and sways the heart the same way as in portrait, and a jolt swings the tray's pull as it does in portrait; whether stroking and shaking feel the same as on a phone (a heavier device may want the shake detector's `minPeak` lower); and LINE's sheet's real height, which says whether `FULL_SCALE_HEIGHT` or the receive dialog's short pass needs tuning.
