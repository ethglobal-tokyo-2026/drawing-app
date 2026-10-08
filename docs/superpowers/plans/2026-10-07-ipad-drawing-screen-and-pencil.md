# iPad: the Drawing Screen and Apple Pencil Implementation Plan

> **On hold (2026-10-08):** being reworked with its spec; don't build from it. Its scratch paths under `~/.cache` are out of date: a task's scratch goes in its worktree's gitignored `data/scratch/`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In a regular window the drawing screen stacks its size rail, undo, redo and seal check down the edge opposite the drawing hand around a centered sheet, and the color sheet becomes a popover; the screen fits LINE's short sheet; Settings gains a Drawing group (drawing hand, Pencil only, pen pressure with a strip to try it); and the Pencil gets a visible Pencil only tile, a hover ring, prediction ahead of the nib, palm rules, light starts and a speed fallback for flat pressure.

**Architecture:** The Drawing group's three settings live in `sticker-creation/drawingSettings.ts`, on one small store (`ui/deviceSetting.ts`) that Settings, the tool strip and the drawing screen read live. The stroke model (`brush.ts`) takes a pressure response (Off, Light, Normal, Firm). `.drawing-screen` carries `data-hand`; CSS keyed on it and on `.phone`'s `data-width`/`data-height` mirrors the compact layout, makes the regular one a grid (an edge column of in-flow controls beside the `.ink-area` the drawing sheet plan renders) and trims the short one. The ink engine trades its private pen latch for the `pencilOnly` setting, learns palm contacts in the tap recognizer, reports a hovering pen (`onHover`), paints `getPredictedEvents()` on an overlay (`PredictionCanvas`), remembers whether the page's pen senses pressure, and times its work for the performance recorder. Explore's sliding tabs move to `ui/` so Settings' pressure choices share them.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS grid, Canvas 2D, the i18n catalog, Playwright (WebKit, and Chromium with CDP pen input) scripts kept outside the repo.

---

## Decisions (awaiting ad0ll's sign-off)

Each is the spec's recommendation with the values this plan picks. Every number is a starting value, to tune from screenshots or at the device session.

**Spec 5. The regular drawing screen.** In regular width `.drawing-screen` is a grid.

- **Edge column**, 134px wide, opposite the drawing hand. Top to bottom: a 76px band under the timer; the size rail, centered between that band and the foot, 120px at least and `clamp(222px, 45%, 480px)` at most, so the thumb's travel grows from 160px to as much as 418px; undo and redo 16px under it; the seal check centered in the column (about 38px in from the side), 32px above the screen's foot, clear of the Pencil's corner swipe. The pieces are in flow, so under about 700px tall the rail shortens and the column starts under the top row.
- **Top row:** the timer, and the tool strip on the drawing hand's side, as today. **The sheet's area:** DrawingCanvas's own `.ink-area` (the drawing sheet plan's), which this plan places in the grid beside the column and under the band; that plan centers and scales the sheet inside it.
- **Color popover:** in regular width the color sheet opens under the tool strip, so under the color tile, aligned to the strip's outer edge: top 66px, 14px in, 360px wide, 16px corners, the Lift shadow, fading in over 220ms. Its perforation, Escape, Back and a tap anywhere outside it close it; the clock holds while it's open, as today. The seal chip opens from the check toward the sheet, at most 340px wide.
- **Smoothing and Clear** stay bars under the tools. **Compact** keeps today's layout.

**Spec 6. Drawing hand.** Right or Left in Settings' Drawing group, kept on the device (`draw.hand`; Right when nothing is kept). Left is the full mirror, on phones and iPads: the rail, undo and redo, the check and its chip (with its 18+ checkbox) go right; the tool strip goes top left and the timer top right; the bars and the popover open under the strip on its side; the paused hint's arrow becomes Phosphor's arrow-bend-right-up.

**Spec 7. Pencil only, visible.** Replaces the engine's private `penSeen` latch. Kept on the device (`draw.pencilOnly`: on, off, or nothing before a pen has drawn there). A pen touching the sheet turns it on only while nothing is kept, so after the first time only the person changes it, from the tile or from Settings. The tile leads the tool strip past a hairline (Phosphor's pen-nib; fill, reversed out of Ink, when on) and shows only once a pen has drawn on the device, so phones never see it. Two- and three-finger taps work either way.

**Spec 8. Hover preview.** A pen pointermove with buttons 0 over the sheet shows a ring centered on the nib, as wide as a mid-pressure stroke under the chosen response: brush size × `pressureWidth(MID_PRESSURE, response)` (`MID_PRESSURE` 0.5; about 0.71 under Normal, the full size under Off) × `sheetScale` (CSS px per sheet unit, the drawing sheet plan's `onFit`). A 1.5px line in the brush color with a 1px white outline; the eraser's ring is its full size, in Ink at 45%. None for fill, a mouse or a finger, a paused or locked sheet, or while a panel is open; it goes on contact and when the pen leaves the sheet, and never draws.

**Spec 9. Prediction.** Pen strokes, brush only (an eraser's guess can't show on an overlay). Each frame, the latest event's `getPredictedEvents()` points run through a copy of the lazy brush and paint at the stroke's last width on an overlay canvas sized and scaled as the ink is; the next frame wipes them. Never in the op, the history, the kept drawing or the seal. Without `getPredictedEvents`, nothing changes. The overlay takes its memory at the first prediction: as much as the ink canvas, about 17 MB at the drawing sheet plan's 4.2 MP cap (unverified cost; check at the device session).

**Spec 19. Pen pressure and the Drawing settings,** option (a).

- **The group:** on your Settings card, under Language and 18+ stickers: Drawing hand, always; Pencil only and Pen pressure once a pen has drawn on the device (so a phone shows only Drawing hand); one fine-print line saying they're kept on this device. They apply at once and never restart the app. A choice the device can't keep shows an error line and lasts until the app closes.
- **Pen pressure** (`draw.penPressure`, Normal when nothing is kept): Off, Light, Normal, Firm, one row in the house's segment pattern (Explore's sliding tabs, as a radio group: arrows and Home/End choose), a Seal Yellow label sliding to the choice. Width as a share of the brush size is `0.28 + 0.72 × p^e`, with `e` 0.5 for Light, 0.75 for Normal (today's), 1.25 for Firm (`PRESSURE_EXPONENTS`). Off draws the brush's own size, with its usual taper-in.
- **A pen whose pressure never changes** follows the speed model under Light, Normal and Firm, and draws a steady width under Off. The Shop's brush samples keep Normal.
- **Try it:** a 64px strip of drawing paper under the choices, where the pen draws in Ink at 12px with the chosen response (`StrokeBuilder` and `paintStroke` on its own canvas, `touch-action: none`). Fingers draw too, unless Pencil only is on; a mouse or trackpad draws by speed. The ink fades over 600ms once 3s have passed since the last stroke; under reduced motion it goes at once. Nothing is kept. It's hidden from screen readers, and a stroke on it neither swings the paper nor pulls the developer slip.
- **On an iPad,** the card stays the phone-sized paper on the cork back (the board plan's decision 12); Task 15 checks the group by touch, Pencil, keyboard and trackpad.

**The Pencil fixes:**

- **Resting palm and undo:** when a tap begins, a touch down `YOUNG_MS` (260ms, today's young-stroke bound) or longer rests and counts toward nothing, and a contact whose longer side is `PALM_CONTACT_PX` (80 CSS px, an unverified guess) or more never counts. A tap is judged when its last counted finger lifts.
- **Palm before the first Pencil stroke:** a palm-sized touch never draws, and a finger's stroke is taken back once its contact grows to a palm's. A smaller palm before the first Pencil stroke still draws until the pen takes it back, as today.
- **Heavy starts:** a stroke starts at its first sample's width, the dot included, once the page's pen has shown its pressure moving. Fingers and mice start as today.
- **Flat pressure:** a pen stroke's pressure sets its width only once it has moved more than `PRESSURE_STEP` (0.01) within the stroke, or an earlier stroke on the page did; until then the speed model applies, as for a finger.

**Short heights** (compact and `data-height="short"`, LINE's iPad sheet and an iPhone SE in LINE among them): the size rail is `clamp(120px, 100% − 196px, 222px)` tall, so it always ends above undo; the color sheet stops at 42% of the screen (52% today), hides its heading from sight (the dialog keeps its name) and has a 56px pad (72px under a 640px media query today, which goes). Target: at 540×620 it leaves at least half the drawing screen to the drawing.

**Keyboard:** Escape closes an open panel and disarms the armed check (a new session event, `escape`).

**Performance recorder:** the engine's work runs under `timeOurWork` as `ink paint` (strokes and their predicted tails), `ink fill`, `ink replay` (undo, redo, take-backs, loads, a frame change's repaint) and `ink snapshot` (commits, which snapshot from time to time).

## Depends on

Merged to main first (the spec's build order: foundations, then the drawing sheet, then this plan, whose Task 6 also waits for the Explore and dialogs plan, below):

- `apps/frontend/src/app/sizeClass.ts` (`2026-10-07-ipad-foundations.md`): `useSizeClass()`, and `data-width="compact|regular"` / `data-height="short|tall"` on `.phone`.
- `2026-10-07-ipad-drawing-sheet.md`, Tasks 2–4:
  - `canvas/sheetFrame.ts`; on `DrawingCanvasHandle`, `frame()` and `screenToSheet(clientX, clientY)`.
  - DrawingCanvas's root is `.ink-area` (absolute, inset 8px 8px 14px), which centers the fitted `.ink-sheet`; `.ink-sheet` stays the white paper the seal ceremony measures.
  - DrawingCanvas takes `onFit(scale)`; the drawing screen keeps it as `sheetScale` state and passes it to the size rail's `scale` prop, which sizes the ghost.
  - The engine holds the frame (`frame`, `fit`, `screenToSheet`, `useFrame`) and maps pointers through `origin`'s scale; `InkSurface.setFrame` replaces `resize`, and `resized()` is gone.
  - In `inkEngine.test.ts`, `setup()` calls `engine.fit(AREA, 1)`, so test pointers land on sheet units one to one, and defines `runFrame()`; `FakeLayer` has `setFrame`.

Where a block below shows a line that plan also rewrote, keep that plan's line and apply only this plan's change.

Also on main before this plan's edits reach them, each a line to keep when this plan's block shows the file as it was:

- **The foundations plan:** `.drawing-screen` clips with `overflow: clip` (`DrawingScreen.css`); `seal.failed.onThisPhone` is `onThisDevice` (`stickerCreation.ts`, `session.ts`, `session.test.ts`, `DrawingScreen.test.tsx`); `glossary.md` has its 端末 row; `stickerBoard.ts` has the developer slip's `device` strings and device-neutral `settings.language.notKept`; and the regular sheet rule in `ui/sheet.css` leaves alone a sheet that carries `bottom-sheet--popover`, which Task 13 gives the color sheet.
- **The Explore and dialogs plan,** which lands before this plan's Task 6: it changes where `ExploreScreen.tsx` renders the view switch (`columns === 1 && <SlidingTabs …/>`), appends regular-width rules to `ExploreScreen.css`, and passes `measureSheet={sheetBox}` to `<SealCeremony>` in `DrawingScreen.tsx`. Task 6 moves `SlidingTabs` as main has it then. If that plan hasn't merged when Task 6 comes up, do Tasks 7 to 14 first (none needs Task 6), then rebase onto main once it has, and do Task 6.

## Files

- Create `apps/frontend/src/ui/deviceSetting.ts`, `deviceSetting.test.ts`; move Explore's sliding tabs into `apps/frontend/src/ui/SlidingTabs.tsx`, `sliding-tabs.css`
- Create `apps/frontend/src/sticker-creation/drawingSettings.ts`, `drawingSettings.test.ts`
- Create `apps/frontend/src/sticker-board/stat-board/DrawingSettings.tsx`, `DrawingSettings.test.tsx`, `TryPen.tsx`, `drawing-settings.css`; modify `SettingsNote.tsx`, `SettingsNote.test.tsx`
- Modify `apps/frontend/src/explore/ExploreScreen.tsx`, `ExploreScreen.css` (the sliding tabs leave)
- Modify `apps/frontend/src/i18n/strings/stickerBoard.ts`, `stickerCreation.ts`; `apps/frontend/src/i18n/glossary.md`
- Modify `apps/frontend/src/icons/index.tsx`: `PencilOnlyIcon`, `ArrowBendRightUp`
- Modify `apps/frontend/src/sticker-creation/canvas/`: `gestures.ts`, `brush.ts`, `lazyBrush.ts`, `inkEngine.ts` and their tests; `DrawingCanvas.tsx`, `DrawingCanvas.css`. Create `canvas/predictionCanvas.ts`
- Modify `apps/frontend/src/sticker-creation/`: `session/session.ts`, `session/session.test.ts`, `useShortcuts.ts`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `DrawingScreen.css`, `TimerDot.tsx`, `SealKey.css`
- Modify `apps/frontend/src/sticker-creation/tools/`: `ToolStrip.tsx`, `SizeRail.tsx` (a comment), `HistoryButtons.tsx`, `ColorSheet.tsx` (`bottom-sheet--popover`), `ColorSheet.css`
- Modify `apps/frontend/src/shop/brushSamples.ts` (its brush sample builds a stroke, at Normal)
- Modify `DESIGN.md` and `PRODUCT.md`: the sentences this plan's work makes false

Scratch (scripts, screenshots, logs) goes in `~/.cache/drawing-app-ipad/drawing-screen/`, never in the repo.

## Setup

- [ ] **Step 1:** In one command, from anywhere in the repo: `MAIN=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)") && git -C "$MAIN" fetch && git -C "$MAIN" worktree add -b feat/ipad-drawing-screen "$MAIN/.claude/worktrees/ipad-drawing-screen" origin/main`, then `pnpm install` in the new worktree. Every command below runs from its root.
- [ ] **Step 2: The dependencies are in.** `rg -n "export (function|const) useSizeClass" apps/frontend/src/app/sizeClass.ts` and `rg -n "screenToSheet|frame:" apps/frontend/src/sticker-creation/canvas/DrawingCanvas.tsx` each print a line. If not, stop and tell the coordinator.
- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board/stat-board src/explore` → passes, so later failures are this plan's. Every test run here sets `TZ=Asia/Tokyo`: two tests on main fail in other time zones.

**UI tasks (3, 6, 7, 11–14):** before the first edit, read `~/.claude/skills/impeccable/reference/craft-floor.md`, and work with `/impeccable adapt` as the lens.

### Task 1: A setting this device keeps

**Files:** Create `apps/frontend/src/ui/deviceSetting.ts`, `apps/frontend/src/ui/deviceSetting.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSetting } from "./deviceSetting";
import { refusingStorage } from "./testing";

const KEY = "test.setting";
/** The setting as a page opens it: what this device keeps, read afresh. */
const opened = () =>
  deviceSetting<"a" | "b">(KEY, {
    parse: (text) => (text === "b" ? "b" : "a"),
    serialize: (value) => (value === "b" ? "b" : null),
    name: "The test setting",
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("deviceSetting", () => {
  it("keeps a value for the next visit, and tells every screen reading it at once", () => {
    const setting = opened();
    const heard = vi.fn();
    setting.subscribe(heard);
    expect(setting.set("b")).toBe(true);
    expect(heard).toHaveBeenCalledOnce();
    expect(opened().get()).toBe("b");
  });

  it("holds a value storage refused until the page goes, and says it wasn't kept", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const setting = opened();
    expect(setting.set("b")).toBe(false);
    expect(setting.get()).toBe("b");
    expect(logged).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
    expect(opened().get()).toBe("a");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/ui/deviceSetting.test.ts` → fails: `./deviceSetting` doesn't exist.
- [ ] **Step 3: Implement** `apps/frontend/src/ui/deviceSetting.ts`:

```ts
import { readStored, writeStored } from "./deviceStorage";

/** How a setting reads storage's text (null: nothing kept), writes it (null: keep nothing), and is named in the log. */
interface Format<T> {
  parse: (text: string | null) => T;
  serialize: (value: T) => string | null;
  name: string;
}

/**
 * A setting this device keeps under `key`, which every screen reading it follows at once. A value
 * storage refuses still holds until the page goes, so the app does what the person chose; `set` says
 * whether it was kept. For primitives: `get` parses afresh each call, which `useSyncExternalStore`
 * would take as a change for an object.
 */
export function deviceSetting<T>(key: string, { parse, serialize, name }: Format<T>) {
  const listeners = new Set<() => void>();
  /** A value storage refused, which holds for this page. */
  let unkept: { value: T } | null = null;
  return {
    get: (): T =>
      unkept ? unkept.value : parse(readStored(key, `${name} can't be read on this device`).text),
    set: (value: T): boolean => {
      const kept = writeStored(key, serialize(value), `${name} can't be kept on this device`);
      unkept = kept ? null : { value };
      for (const listener of listeners) listener();
      return kept;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
```

- [ ] **Step 4:** Run the same test file → passes.
- [ ] **Step 5:** Commit: `feat(frontend): a setting kept on the device, read live`

### Task 2: The drawing settings

**Files:** Create `apps/frontend/src/sticker-creation/drawingSettings.ts`, `drawingSettings.test.ts`; modify `apps/frontend/src/sticker-creation/canvas/brush.ts`

- [ ] **Step 1: Write the failing test,** `drawingSettings.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { keepPencilOnly, pencilTouched, readPencilOnly } from "./drawingSettings";

afterEach(() => localStorage.clear());

describe("Pencil only", () => {
  it("turns on as a pen first touches the sheet on this device, and a later pen never undoes the person's choice", () => {
    expect(readPencilOnly()).toBeNull();
    pencilTouched();
    expect(readPencilOnly()).toBe(true);
    keepPencilOnly(false);
    pencilTouched();
    expect(readPencilOnly()).toBe(false);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/drawingSettings.test.ts` → fails: the module doesn't exist.
- [ ] **Step 3: The pressure responses' names,** in `canvas/brush.ts` after `sizePx`:

```ts
/** How a pen's pressure sets its width: not at all (Off), or along a light, normal or firm curve. */
export const PEN_PRESSURES = ["off", "light", "normal", "firm"] as const;
export type PenPressure = (typeof PEN_PRESSURES)[number];
```

- [ ] **Step 4: The settings,** `drawingSettings.ts`:

```ts
import { useSyncExternalStore } from "react";
import { deviceSetting } from "../ui/deviceSetting";
import { PEN_PRESSURES, type PenPressure } from "./canvas/brush";

/*
 * Settings' Drawing group, kept on this device rather than the account, since each suits a device
 * and its pen. Every `keep…` applies at once and says whether the device kept it.
 */

export type DrawingHand = "right" | "left";

/** The hand a person draws with: Left mirrors the drawing screen. */
const hand = deviceSetting<DrawingHand>("draw.hand", {
  parse: (text) => (text === "left" ? "left" : "right"),
  serialize: (value) => (value === "left" ? "left" : null),
  name: "The drawing hand",
});

/** Pencil only: on, fingers only tap, to undo and redo. Null until a pen has drawn on this device. */
const pencilOnly = deviceSetting<boolean | null>("draw.pencilOnly", {
  parse: (text) => (text === "on" ? true : text === "off" ? false : null),
  serialize: (on) => (on === null ? null : on ? "on" : "off"),
  name: "Pencil only",
});

const isPenPressure = (text: string | null): text is PenPressure =>
  PEN_PRESSURES.some((each) => each === text);

/** How the pen's pressure sets its width, Normal until chosen. */
const penPressure = deviceSetting<PenPressure>("draw.penPressure", {
  parse: (text) => (isPenPressure(text) ? text : "normal"),
  serialize: (value) => (value === "normal" ? null : value),
  name: "The pen pressure",
});

export const useDrawingHand = (): DrawingHand => useSyncExternalStore(hand.subscribe, hand.get);
export const keepDrawingHand = (value: DrawingHand): boolean => hand.set(value);

/** Pencil only on this device; null before a pen has drawn here. */
export const usePencilOnly = (): boolean | null =>
  useSyncExternalStore(pencilOnly.subscribe, pencilOnly.get);
export const readPencilOnly = pencilOnly.get;
export const keepPencilOnly = (on: boolean): boolean => pencilOnly.set(on);
/** A pen touched the sheet: Pencil only turns on, the first time on this device. */
export function pencilTouched(): void {
  if (pencilOnly.get() === null) pencilOnly.set(true);
}

export const usePenPressure = (): PenPressure =>
  useSyncExternalStore(penPressure.subscribe, penPressure.get);
export const readPenPressure = penPressure.get;
export const keepPenPressure = (value: PenPressure): boolean => penPressure.set(value);
```

- [ ] **Step 5:** Run the same test and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `feat(frontend): the drawing hand, Pencil only and pen pressure, kept on the device`

### Task 3: Pencil only in the engine, and its tile

**Files** (under `apps/frontend/src/sticker-creation/` unless named): modify `canvas/inkEngine.ts`, `canvas/inkEngine.test.ts`, `canvas/DrawingCanvas.tsx`, `DrawingScreen.tsx`, `tools/ToolStrip.tsx`, `apps/frontend/src/icons/index.tsx`, `apps/frontend/src/i18n/strings/stickerCreation.ts`

UI task (the tile); Task 15 checks it in the browser.

- [ ] **Step 1: Write the failing test.** In `canvas/inkEngine.test.ts`: `SETTINGS` gains `pencilOnly: false`; `setup()`'s `events` gains `onPen: vi.fn(),`; and "stops fingers drawing once a pen has, while they still tap" becomes:

```ts
it("lets fingers draw until Pencil only is on, when they still tap, and tells of every pen", () => {
  const { engine, stroke, tap, committed, events } = setup();
  stroke("pen", 1, [0, 0], [100, 0]);
  expect(events.onPen).toHaveBeenCalledOnce();
  stroke("touch", 2, [0, 50], [100, 50], 1000);
  expect(committed()).toHaveLength(2);
  engine.settings = { ...engine.settings, pencilOnly: true };
  stroke("touch", 3, [0, 100], [100, 100], 2000);
  expect(committed()).toHaveLength(2);
  tap(2, 3000);
  expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/inkEngine.test.ts` → fails: the engine still latches.
- [ ] **Step 3: The engine.** In `canvas/inkEngine.ts`, `InkSettings` gains, after `armed`:

```ts
/** Pencil only is on: fingers tap, to undo and redo, and never draw. */
pencilOnly: boolean;
```

`InkEvents` gains, after `onDisarm`:

```ts
  /** A pen touched the sheet. */
  onPen: () => void;
```

Delete `private penSeen = false;`. In `down()`, `this.penSeen = true;` becomes `this.events.onPen();`, and `if (pointerType === "touch" && this.penSeen) return;` becomes `if (pointerType === "touch" && s.pencilOnly) return;`. The class comment's last sentence becomes "With Pencil only on, fingers only tap; a finger stroke a pen interrupts was a resting palm."

- [ ] **Step 4: The tile.** `icons/index.tsx`: `PenNib` joins the top import from `@phosphor-icons/react`, and after `ClearSheetIcon`:

```tsx
/** Pencil only: the tool strip's tile that stops fingers drawing once a pen has drawn. */
export const PencilOnlyIcon = (props: IconProps) => (
  <PenNib aria-hidden focusable="false" {...props} />
);
```

`stickerCreation.ts`, in `tools` after `clear`:

```ts
    /** Drawing screen, top right: the Pencil only tile at the start of the tool strip, which shows once an Apple Pencil has drawn on this device, named for screen readers; pressed, fingers only tap, to undo and redo, and never draw */
    pencilOnly: { en: "Pencil only", ja: "ペンのみ" },
```

`tools/ToolStrip.tsx`: `PencilOnlyIcon` joins the icons import; after `CLEAR_TILE`, `const PENCIL_TILE = TOOLS.length + 3;`. `Props` gains:

```ts
  /** Pencil only on this device, or null before a pen has drawn here, when there's no tile. */
  pencilOnly: boolean | null;
  onPencilOnly: (on: boolean) => void;
```

Destructure both, and open the strip with the tile, before `TOOLS.map`:

```tsx
{
  pencilOnly !== null && (
    <>
      <button
        {...tile(PENCIL_TILE)}
        className="tool-tile"
        aria-label={t(($) => $.stickerCreation.tools.pencilOnly)}
        aria-pressed={pencilOnly}
        onClick={() => onPencilOnly(!pencilOnly)}
      >
        <PencilOnlyIcon size={22} weight={pencilOnly ? "fill" : "bold"} />
      </button>
      {/* How the sheet takes input isn't a drawing tool: a hairline sets it apart. */}
      <span className="tool-rule" aria-hidden="true" />
    </>
  );
}
```

The component's comment gains "Once a pen has drawn on the device, Pencil only leads the strip past a rule."

- [ ] **Step 5: Passing it along.** `canvas/DrawingCanvas.tsx`: `const onPen = useEffectEvent(events.onPen);` beside the others, and the engine's events gain `onPen: () => onPen(),`. `DrawingScreen.tsx` imports `keepPencilOnly`, `pencilTouched` and `usePencilOnly` from `./drawingSettings`; after `const optedIn = useMyNsfwOptIn();`, `const pencilOnly = usePencilOnly();`. `DrawingCanvas`'s `settings` gain `pencilOnly: pencilOnly === true,` and it takes `onPen={pencilTouched}`; `ToolStrip` takes `pencilOnly={pencilOnly}` and `onPencilOnly={keepPencilOnly}`.
- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): Pencil only replaces the hidden pen latch, as a tile kept on the device`

### Task 4: Palms don't count, and never draw

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/gestures.ts`, `gestures.test.ts`, `inkEngine.ts`, `inkEngine.test.ts`

- [ ] **Step 1: Write the failing tests.** `gestures.test.ts` imports `YOUNG_MS` beside `TapRecognizer`, and gains:

```ts
it("leaves out a touch already down when a tap begins, so a resting palm doesn't hold the undo up", () => {
  const taps = new TapRecognizer();
  taps.down(9, 300, 600, 0);
  const t = YOUNG_MS + 100;
  taps.down(1, 0, 0, t);
  taps.down(2, 50, 0, t + 10);
  expect(taps.up(1, t + 100)).toBeNull();
  expect(taps.up(2, t + 110)).toBe("undo");
});

it("never counts a palm-sized contact: it lands as nothing, and a tap around it keeps its count", () => {
  const taps = new TapRecognizer();
  expect(taps.down(1, 0, 0, 0)).toBe("draw");
  expect(taps.down(9, 300, 600, 5, undefined, true)).toBe("ignore");
  taps.down(2, 50, 0, 10);
  expect(taps.up(1, 100)).toBeNull();
  expect(taps.up(2, 110)).toBe("undo");
});
```

`inkEngine.test.ts` imports `PALM_CONTACT_PX` and `YOUNG_MS` from `./gestures`, and above `SETTINGS`:

```ts
/** A fingertip's contact, well under a palm's. */
const FINGERTIP = PALM_CONTACT_PX / 4;
const palmSized = (input: PointerInput): PointerInput => ({
  ...input,
  width: PALM_CONTACT_PX,
  height: PALM_CONTACT_PX,
});
```

In `setup()`, `at` gains `width: pointerType === "touch" ? FINGERTIP : 1,` and `height: pointerType === "touch" ? FINGERTIP : 1,` after `pressure`, and `setup()` returns `runFrame` beside the rest. Then:

```ts
it("never draws with a palm-sized touch, and takes back a finger's stroke once its contact grows to one", () => {
  const { engine, at, runFrame, committed, layer } = setup();
  engine.down(palmSized(at("touch", 1, 0, 0, 0)));
  engine.move(palmSized(at("touch", 1, 40, 0, 16)));
  engine.up(palmSized(at("touch", 1, 40, 0, 32)));
  expect(layer.paints).toBe(0);
  engine.down(at("touch", 2, 0, 50, 1000));
  engine.move(at("touch", 2, 30, 50, 1016));
  runFrame();
  engine.move(palmSized(at("touch", 2, 40, 50, 1032)));
  engine.up(at("touch", 2, 40, 50, 1048));
  expect(committed()).toEqual([]);
});

it("undoes on a two-finger tap while a palm rests on the sheet, whatever its size", () => {
  for (const size of [FINGERTIP, PALM_CONTACT_PX]) {
    const { engine, at, stroke, tap, events } = setup({ pencilOnly: true });
    stroke("pen", 1, [0, 0], [100, 0]);
    stroke("pen", 2, [0, 20], [100, 20], 500);
    engine.down({ ...at("touch", 90, 300, 600, 1000), width: size, height: size });
    tap(2, 1000 + YOUNG_MS);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
  }
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas` → fails: no `YOUNG_MS` or `PALM_CONTACT_PX` export, and the resting palm holds the tap up.
- [ ] **Step 3: The recognizer.** In `gestures.ts`, the constants after `TAP_SLOP` become:

```ts
/**
 * A stroke younger and shorter than this when a second finger lands was the start of a tap. A touch
 * down this long when a tap begins was there before it, and rests.
 */
export const YOUNG_MS = 260;
const YOUNG_PX = 26;
/** A contact this wide, on its longer side in CSS px, is a palm, never a fingertip. */
export const PALM_CONTACT_PX = 80;

/** Whether a contact this size is a palm. */
export const isPalm = (width: number, height: number) => Math.max(width, height) >= PALM_CONTACT_PX;
```

`TouchDown`'s `"ignore"` comment becomes "Nothing: a palm, or a finger resting on the sheet while another draws." After the `LiveStroke` interface: `/** Where and when a touch landed, and whether it rests: a palm, or down from before the tap began, which counts toward nothing. */ interface HeldTouch { x0: number; y0: number; t0: number; resting: boolean }`. The class comment becomes "Multi-finger taps, fed touch pointers only: two fingers undo, three or more redo. A palm-sized contact, or a touch already down when a tap begins, rests and counts toward nothing, so a palm on the sheet never holds a tap up. A finger that lands while another is well into a stroke is ignored." In the class, `touches` becomes `new Map<number, HeldTouch>()`; `holds()` and `clear()` stay. In `up()`, `this.touches.size > 0` becomes `this.fingers() > 0`, its comment "The gesture the last counted finger's lift completes, if any."; in `cancel()`, `this.touches.size === 0` becomes `this.fingers() === 0`. `down`, `move` and `inGesture` become these, and `fingers` is new:

```ts
  down(id: number, x: number, y: number, t: number, stroke?: LiveStroke, palm = false): TouchDown {
    // A tap begins with this touch: whatever has been down a while was there before it.
    if (!this.gesture)
      for (const touch of this.touches.values()) if (t - touch.t0 >= YOUNG_MS) touch.resting = true;
    this.touches.set(id, { x0: x, y0: y, t0: t, resting: palm });
    if (palm) return "ignore";
    const fingers = this.fingers();
    if (fingers < 2 && !this.gesture) return "draw";
    let result: TouchDown = "gesture";
    if (stroke) {
      if (stroke.age >= YOUNG_MS || stroke.moved >= YOUNG_PX) return "ignore";
      result = "cancel-stroke";
    }
    this.gesture ??= { t0: t, fingers: 0, moved: 0 };
    this.gesture.fingers = Math.max(this.gesture.fingers, fingers);
    return result;
  }

  move(id: number, x: number, y: number, palm = false): void {
    const touch = this.touches.get(id);
    if (!touch) return;
    // A fingertip that spreads into a palm rests from then on.
    if (palm) touch.resting = true;
    if (!this.gesture || touch.resting) return;
    this.gesture.moved = Math.max(this.gesture.moved, Math.hypot(x - touch.x0, y - touch.y0));
  }

  /** Whether this finger belongs to a tap in progress, rather than a stroke. */
  inGesture(id: number): boolean {
    const touch = this.touches.get(id);
    return this.gesture !== null && touch !== undefined && !touch.resting;
  }

  /** Touches down that count toward a tap. */
  private fingers(): number {
    let count = 0;
    for (const touch of this.touches.values()) if (!touch.resting) count++;
    return count;
  }
```

- [ ] **Step 4: The engine.** In `inkEngine.ts`: `import { isPalm, TapRecognizer } from "./gestures";`. `PointerInput` gains, after `pressure`:

```ts
/** The contact's size in CSS px: a palm's is far wider than a fingertip's. */
width: number;
height: number;
```

In `down()`, `this.taps.down(...)` gains a sixth argument, `isPalm(e.width, e.height)`. In `move()`, `if (e.pointerType === "touch") this.taps.move(id, e.clientX, e.clientY);` becomes:

```ts
if (e.pointerType === "touch") {
  const palm = isPalm(e.width, e.height);
  this.taps.move(id, e.clientX, e.clientY, palm);
  // A fingertip that spreads into a palm as it settles never meant its stroke.
  if (palm && this.live?.id === id) {
    this.endStroke(true);
    this.swallowed.add(id);
    return;
  }
}
```

- [ ] **Step 5:** Run the canvas tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `fix(frontend): a resting palm no longer holds up two-finger undo, and a palm-sized touch never draws`

### Task 5: Pen pressure: four responses, light starts and flat pressure

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/brush.ts`, `brush.test.ts`, `inkEngine.ts`, `inkEngine.test.ts`, `DrawingScreen.tsx`; `apps/frontend/src/shop/brushSamples.ts`

- [ ] **Step 1: Write the failing tests.** In `brush.test.ts`, import `type PenPressure`; `start` and `widths` become:

```ts
/** A brush stroke from 0,0, with whatever of its start `given` sets. */
const builder = (given: Partial<ConstructorParameters<typeof StrokeBuilder>[0]> = {}) =>
  new StrokeBuilder({
    tool: "brush",
    color: "#000000",
    size: SIZE,
    x: 0,
    y: 0,
    t: 0,
    T: 0,
    pressure: 0,
    pointerType: "mouse",
    pressureVaries: false,
    response: "normal",
    ...given,
  });

const start = (tool: "brush" | "eraser" = "brush") => builder({ tool });

type Drawn = {
  pressure?: number | ((i: number) => number);
  pointer?: string;
  ms?: number;
  tool?: "brush" | "eraser";
  pressureVaries?: boolean;
  response?: PenPressure;
};

/**
 * Widths as fractions of the brush size, after adding `n` points 10px apart, `ms` apart. `pressure`
 * may follow the point's index; `pressureVaries` says the pen has shown its pressure moving before.
 */
function widths(n: number, drawn: Drawn = {}): number[] {
  const {
    pressure = 0.5,
    pointer = "mouse",
    ms = 16,
    tool = "brush",
    pressureVaries = true,
  } = drawn;
  const pressed = (i: number) => (typeof pressure === "number" ? pressure : pressure(i));
  const stroke = builder({
    tool,
    pressure: pressed(0),
    pointerType: pointer,
    pressureVaries,
    response: drawn.response ?? "normal",
  });
  for (let i = 1; i <= n; i++) stroke.add(i * 10, 0, pressed(i), i * ms);
  const { pts } = stroke.op;
  return Array.from({ length: pts.length / STRIDE }, (_, i) => pts[i * STRIDE + 2] / SIZE);
}
```

The skip test's calls drop the pointer type: `stroke.add(0.3, 0.3, 0.5, 16)` and `stroke.add(0.6, 0, 0.5, 32)`. Add:

```ts
it("starts a pen stroke at its first sample's width, so a light start stays light", () => {
  const light = widths(40, { pointer: "pen", pressure: 0.1 });
  const firm = widths(40, { pointer: "pen", pressure: 0.9 });
  expect(light[0]).toBeLessThan(firm[0]);
  // Nothing heavier than where it settles: no full-width start thinning out.
  expect(Math.max(...light)).toBeCloseTo(last(light));
});

it("draws a pen whose pressure never moves as a finger draws, by speed, under every curve", () => {
  for (const response of ["light", "normal", "firm"] as const)
    for (const ms of [0.5, 1000])
      expect(
        widths(40, { pointer: "pen", pressure: 0.5, pressureVaries: false, response, ms }),
      ).toEqual(widths(40, { pointer: "touch", ms }));
  // Once its pressure moves, pressure sets the width.
  const moving = { pointer: "pen", ms: 0.5, pressureVaries: false } as const;
  expect(last(widths(40, { ...moving, pressure: (i: number) => (i < 5 ? 0.5 : 1) }))).toBeCloseTo(
    last(widths(40, { pointer: "pen", ms: 0.5, pressure: 1 })),
  );
});

it("draws wider at one pressure under Light than Normal, and Normal than Firm, and the brush's own size under Off", () => {
  const at = (response: PenPressure) =>
    last(widths(40, { pointer: "pen", pressure: 0.3, response }));
  expect(at("light")).toBeGreaterThan(at("normal"));
  expect(at("normal")).toBeGreaterThan(at("firm"));
  const off = (pressure: number | ((i: number) => number), ms: number, pressureVaries: boolean) =>
    widths(40, { pointer: "pen", pressure, ms, pressureVaries, response: "off" });
  expect(off((i) => i / 40, 0.5, true)).toEqual(off(0.5, 1000, false));
  expect(last(off(0.5, 1000, false))).toBe(1);
});
```

In `inkEngine.test.ts`, `SETTINGS` gains `penPressure: "normal"`. `at` gains a sixth parameter, `pressure = pointerType === "pen" ? 0.6 : 0`, and its `pressure: pointerType === "pen" ? 0.6 : 0,` becomes `pressure,`. `stroke` gains a seventh, `pressure?: (step: number) => number` (its comment ends "; a pen presses `pressure(step)`"), passing `pressure?.(0)` to the down's `at`, `pressure?.(i)` to each move's and `pressure?.(steps)` to the up's. Then:

```ts
it("starts a pen stroke at its first sample's pressure once the pen has shown it senses pressure", () => {
  const LIGHT = 0.1;
  const dot = (op: Op | undefined) => (op?.tool === "brush" ? op.pts[2] : NaN);
  const fresh = setup();
  fresh.stroke("pen", 1, [0, 0], [100, 0], 0, () => LIGHT);
  const sensed = setup();
  sensed.stroke("pen", 1, [0, 0], [100, 0], 0, (step) => LIGHT + step / 20);
  sensed.stroke("pen", 2, [0, 50], [100, 50], 1000, () => LIGHT);
  // Until its pressure moves, a light press can't be told from a pen that senses none.
  expect(dot(sensed.committed()[1])).toBeLessThan(dot(fresh.committed()[0]));
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas` → fails: the builder takes no response, takes a pointer type per point, and starts every stroke at full width.
- [ ] **Step 3: The model.** In `brush.ts`, `FIRST_DOT`'s comment becomes "A stroke starts as a dot this fraction of its first width, then widens by `TAPER_STEP` a point." `widthFactor` gives way to:

```ts
/**
 * Each curve's exponent on the pressure: under 1 a light touch already draws wide, over 1 full width
 * takes more force. Normal is the response a pen has always had.
 */
export const PRESSURE_EXPONENTS = {
  light: 0.5,
  normal: 0.75,
  firm: 1.25,
} as const satisfies Record<Exclude<PenPressure, "off">, number>;
/** A pen pressed halfway: the hover ring shows a stroke's width at it, as Apple's guidance asks. */
export const MID_PRESSURE = 0.5;
/** A pen's pressure moving less than this within a stroke is a pen that senses none. */
const PRESSURE_STEP = 0.01;

/** How wide a pen draws at this pressure under `response`, as a fraction of the size; Off is the size. */
export const pressureWidth = (pressure: number, response: PenPressure) =>
  response === "off" ? 1 : 0.28 + 0.72 * pressure ** PRESSURE_EXPONENTS[response];
/** Touch, mouse and a pen with no pressure: a quick flick draws thinner, the way ink runs thin. */
const speedWidth = (speed: number) => clamp(1.12 - 0.15 * speed, 0.68, 1.1);
```

`StrokeStart` gains:

```ts
/** The first sample's pressure, and the pointer drawing. */
pressure: number;
pointerType: string;
/** This pen has shown its pressure moving before, so pressure sets the width from the first sample. */
pressureVaries: boolean;
/** How a pen's pressure sets its width; a finger or a mouse goes by speed whatever it is. */
response: PenPressure;
```

The class comment becomes "Builds a stroke point by point. A brush's width follows a pen's pressure through its response, or the speed for touch, mouse and a pen whose pressure never moves, smoothed so it never jumps, and tapers in from a dot. It starts from the first sample's width, so a light start stays light. The eraser keeps one width, and so does a pen with its pressure Off." In the class, `private smoothed = 1;` and the constructor give way to:

```ts
  private readonly pen: boolean;
  private readonly response: PenPressure;
  private readonly firstPressure: number;
  /** Pressure sets the width: this pen has shown its pressure moving, in this stroke or before. */
  private pressed: boolean;
  private smoothed: number;

  constructor(start: StrokeStart) {
    const { tool, color, size, x, y, t, T, pressure, pointerType, pressureVaries, response } = start;
    this.size = size;
    this.t0 = t;
    this.lastT = t;
    this.pen = pointerType === "pen";
    this.response = response;
    this.firstPressure = pressure;
    this.pressed = this.pen && pressureVaries && pressure > 0;
    this.smoothed = this.pressed ? pressureWidth(pressure, response) : 1;
    const dot = tool === "eraser" ? 1 : FIRST_DOT * this.smoothed;
    this.op = { tool, color, pts: [x, y, size * dot, 0], T };
  }
```

after `count`, `/** Whether pressure set this stroke's width: its pen senses pressure. */ get pressured(): boolean { return this.pressed; }`;

and `add` drops its `pointerType` parameter, `add(x: number, y: number, pressure: number, t: number): boolean`, its brush branch becoming:

```ts
if (tool === "brush") {
  if (this.pen && Math.abs(pressure - this.firstPressure) > PRESSURE_STEP) this.pressed = true;
  // Off, a pen draws the brush's size, whatever it reports.
  const wants =
    this.pen && this.response === "off"
      ? 1
      : this.pressed && pressure > 0
        ? pressureWidth(pressure, this.response)
        : speedWidth(dist / dt);
  this.smoothed = 0.7 * this.smoothed + 0.3 * wants;
  width *= this.smoothed * Math.min(1, FIRST_DOT + TAPER_STEP * n);
}
```

- [ ] **Step 4: The engine.** In `inkEngine.ts`, `import type { PenPressure } from "./brush";` (beside the `StrokeBuilder` import); `InkSettings` gains `/** How a pen's pressure sets its width. */ penPressure: PenPressure;`. After `fingersGone`:

```ts
  /** This page's pen has shown its pressure moving: its strokes start from their first sample's. */
  private pressurePen = false;
```

`beginStroke`'s `new StrokeBuilder({ … })` gains `pressure: e.pressure, pointerType: e.pointerType, pressureVaries: this.pressurePen, response: s.penPressure,`. In `paintNew`, `builder.add(lazy.x, lazy.y, queue[i + 2], live.pointerType, queue[i + 3])` becomes `builder.add(lazy.x, lazy.y, queue[i + 2], queue[i + 3])`. In `endStroke`, after `this.cancelFrame = null;`:

```ts
// A pen whose pressure moved senses it: its next strokes start from their first sample's.
if (live.builder.pressured) this.pressurePen = true;
```

and the catch-up's `add` drops `live.pointerType` too: `live.builder.add(x, y, live.pressure, (t += CATCH_UP_MS));`.

- [ ] **Step 5: The choice reaches the engine,** and the Shop keeps Normal. `DrawingScreen.tsx` imports `usePenPressure` with the other drawing settings; `const penPressure = usePenPressure();` after `pencilOnly`; `DrawingCanvas`'s `settings` gain `penPressure,`. In `apps/frontend/src/shop/brushSamples.ts`, the `"brush"` case's builder is a pen that senses pressure from none, at Normal, so the sample draws as it does today:

```ts
const stroke = new StrokeBuilder({
  tool: "brush",
  color: INK,
  size,
  x,
  y,
  t: 0,
  T: 0,
  pressure: 0,
  pointerType: "pen",
  pressureVaries: true,
  response: "normal",
});
```

and its `stroke.add(px, py, pressure, "pen", (i + 1) * 12)` becomes `stroke.add(px, py, pressure, (i + 1) * 12)`.

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/shop` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): pen pressure follows a chosen response, starts from the first sample, and a pen with flat pressure follows speed`

### Task 6: Settings' Drawing group

**Files:** Create `apps/frontend/src/ui/SlidingTabs.tsx`, `apps/frontend/src/ui/sliding-tabs.css`; modify `apps/frontend/src/explore/ExploreScreen.tsx`, `ExploreScreen.css`. Create `apps/frontend/src/sticker-board/stat-board/DrawingSettings.tsx`, `DrawingSettings.test.tsx`, `TryPen.tsx`, `drawing-settings.css`; modify `SettingsNote.tsx`, `SettingsNote.test.tsx`, `apps/frontend/src/i18n/strings/stickerBoard.ts`, `apps/frontend/src/i18n/glossary.md`

UI task. Try it paints on a canvas, which happy-dom can't, so Task 15 checks it in the browser.

- [ ] **Step 1: Write the failing tests,** `DrawingSettings.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import {
  keepDrawingHand,
  pencilTouched,
  readPencilOnly,
  readPenPressure,
} from "../../sticker-creation/drawingSettings";
import { refusingStorage } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

const words = stickerBoard.settings.drawing;
let unmount = () => {};
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused write holds in memory, and the next test would see it.
  keepDrawingHand("right");
  localStorage.clear();
});

function render() {
  const view = renderWithApi(<DrawingSettings />);
  unmount = view.unmount;
  return view.host;
}
const row = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll("label")].find((l) => l.textContent === label)?.querySelector("input");
const pencilSwitch = (host: HTMLElement) => host.querySelector<HTMLInputElement>('[role="switch"]');
const pressure = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll<HTMLElement>('[role="radio"]')].find((b) => b.textContent === label);

describe("Settings' Drawing group", () => {
  it("shows only the drawing hand until a pen has drawn on this device", () => {
    const phone = render();
    expect(row(phone, words.hand.right.en)?.checked).toBe(true);
    expect(pencilSwitch(phone)).toBeNull();
    expect(phone.querySelector('[role="radiogroup"]')).toBeNull();
    unmount();
    pencilTouched();
    const ipad = render();
    expect(pencilSwitch(ipad)?.checked).toBe(true);
    expect(pressure(ipad, words.pressure.normal.en)?.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps each choice on this device at once", () => {
    pencilTouched();
    const host = render();
    act(() => row(host, words.hand.left.en)?.click());
    act(() => pencilSwitch(host)?.click());
    act(() => pressure(host, words.pressure.light.en)?.click());
    expect([readPencilOnly(), readPenPressure()]).toEqual([false, "light"]);
    unmount();
    expect(row(render(), words.hand.left.en)?.checked).toBe(true);
  });

  it("moves the pressure choice with the arrow keys", () => {
    pencilTouched();
    const group = render().querySelector('[role="radiogroup"]');
    act(
      () =>
        void group?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        ),
    );
    expect(readPenPressure()).toBe("firm");
  });

  it("says when this device couldn't keep a choice, which lasts until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const host = render();
    act(() => row(host, words.hand.left.en)?.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(words.notKept.en);
    expect(row(host, words.hand.left.en)?.checked).toBe(true);
  });
});
```

In `SettingsNote.test.tsx`, both Japanese tests meet the new group. "reads in Japanese, naming each language in its own language" reads the language fieldset's radios only:

```tsx
const languages = host.querySelector("fieldset")?.querySelectorAll("label:has(input[type=radio])");
expect([...(languages ?? [])].map((l) => l.textContent)).toEqual([
  "LINEと同じ（English）",
  "English",
  "日本語",
]);
```

and the 18+ switch's "reads in Japanese" expects the legends `["言語", "18+のシール", "かく画面", "利き手"]`.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board` → fails: no `DrawingSettings`.
- [ ] **Step 3: The segment pattern moves to `ui/`.** Move `SlidingTabs` and its comment from `explore/ExploreScreen.tsx` into `apps/frontend/src/ui/SlidingTabs.tsx`, exported, with `import { useRef, type CSSProperties } from "react";` and `import "./sliding-tabs.css";`; Explore imports it from `../ui/SlidingTabs`. Move its rules from `explore/ExploreScreen.css` into `apps/frontend/src/ui/sliding-tabs.css`: `.sliding-tabs`, `.sliding-tabs__label`, `.sliding-tabs button` and its `::before`, `.selected` and `:focus-visible` rules, and a reduced-motion block holding `.sliding-tabs__label { transition: none; }` and `.sliding-tabs button { transition: color 120ms linear; }`. The `.view-switch` and `.leaderboard-tabs` rules stay in Explore's file, as do the Explore and dialogs plan's regular-width rules, and its reduced-motion block keeps `.leaderboard-tabs .sliding-tabs__label::after { transition: none; }`. That plan has landed (Depends on): move the component and the rules as main has them, its view switch rendering only in one column. Then the component learns radios: its comment's first sentence becomes "Choices as one label sliding along a track to the current one, which the arrow keys move too: tabs that switch a panel, or radios that set a value."; its props gain

```ts
  /** Tabs switch a panel, `${id}-panel`; radios set a value and name no panel. */
  kind?: "tabs" | "radios";
```

(default `kind = "tabs"`); the track's `role="tablist"` becomes `role={kind === "tabs" ? "tablist" : "radiogroup"}`; and each button's `role="tab"`, `aria-selected={tab === value}` and ``aria-controls={`${id}-panel`}`` give way to:

```tsx
          {...(kind === "tabs"
            ? { role: "tab", "aria-selected": tab === value, "aria-controls": `${id}-panel` }
            : { role: "radio", "aria-checked": tab === value })}
```

- [ ] **Step 4: The strings.** In `stickerBoard.ts`, after `settings.nsfw`:

```ts
    /** The Drawing group, a third section under 18+ stickers: settings kept on this device, which change drawing at once. */
    drawing: {
      /** Settings note: the heading over the Drawing group, the drawing screen's settings */
      title: { en: "Drawing", ja: "かく画面" },
      /** The drawing hand, which mirrors the drawing screen for a left hand. */
      hand: {
        /** Settings note, Drawing group: the small heading over the drawing hand choices */
        title: { en: "Drawing hand", ja: "利き手" },
        /** Settings note, Drawing group: the choice for drawing with the right hand, the default */
        right: { en: "Right", ja: "右手" },
        /** Settings note, Drawing group: the choice for drawing with the left hand, which mirrors the drawing screen */
        left: { en: "Left", ja: "左手" },
        /** Settings note, Drawing group: the fine print under the drawing hand choices */
        about: { en: "Mirrors the drawing screen to suit the hand you draw with.", ja: "かく画面を利き手に合わせて左右反転します。" },
      },
      /** Pencil only, the drawing screen tile's switch, shown once a pen has drawn on this device. */
      pencilOnly: {
        /** Settings note, Drawing group: the Pencil only switch's words, shown once a pen has drawn on this device */
        label: { en: "Pencil only", ja: "ペンのみ" },
        /** Settings note, Drawing group: the fine print under the Pencil only switch */
        about: { en: "On, only the pen draws, and fingers tap to undo and redo.", ja: "オンにすると、ペンだけでかけます。指はタップで元に戻す・やり直すときに使います。" },
      },
      /** How the pen's pressure sets its width, shown once a pen has drawn on this device. */
      pressure: {
        /** Settings note, Drawing group: the small heading over the pen pressure choices, and their name for screen readers */
        title: { en: "Pen pressure", ja: "筆圧" },
        /** Settings note, Drawing group: the pen pressure choice where the pen draws a steady width */
        off: { en: "Off", ja: "オフ" },
        /** Settings note, Drawing group: the pen pressure choice where a lighter touch draws full width */
        light: { en: "Light", ja: "軽め" },
        /** Settings note, Drawing group: the pen pressure choice that's the usual response, the default */
        normal: { en: "Normal", ja: "ふつう" },
        /** Settings note, Drawing group: the pen pressure choice where full width takes more force */
        firm: { en: "Firm", ja: "強め" },
        /** Settings note, Drawing group: the small print on the strip of paper under the pen pressure choices, where the pen tries the chosen one; hidden from screen readers */
        tryIt: { en: "Try it", ja: "ためしがき" },
      },
      /** Settings note, Drawing group: the fine print saying where the group is kept */
      kept: { en: "These are kept on this device, not your account.", ja: "これらはアカウントではなく、この端末に保存されます。" },
      /** Settings note, Drawing group: the alert when this device couldn't keep a choice, which still applies until the app closes */
      notKept: { en: "This device couldn’t keep that, so it lasts until you close Croquis.", ja: "この端末に保存できなかったため、クロッキーを閉じるまでの設定になります。" },
    },
```

`glossary.md`, rows after "two fingers" (オフ follows the opt-in's オン / オフ; Try it is ためしがき, since the glossary keeps "draw" as かく in hiragana, never 書く):

```
| Drawing (Settings' group)          | かく画面                               | The drawing screen's settings, kept on the device                                     |
| drawing hand                       | 利き手                                 | Right and left: 右手 / 左手                                                           |
| Pencil only                        | ペンのみ                               | Fingers only tap; the pen draws                                                       |
| pen pressure                       | 筆圧                                   | Off オフ, Light 軽め, Normal ふつう, Firm 強め                                        |
| Try it (under pen pressure)        | ためしがき                             | In hiragana, as かく is                                                               |
```

- [ ] **Step 5: The group,** `stat-board/DrawingSettings.tsx`:

```tsx
import { useId, useState } from "react";
import { useTranslation } from "../../i18n/react";
import { PEN_PRESSURES } from "../../sticker-creation/canvas/brush";
import {
  keepDrawingHand,
  keepPencilOnly,
  keepPenPressure,
  useDrawingHand,
  usePencilOnly,
  usePenPressure,
  type DrawingHand,
} from "../../sticker-creation/drawingSettings";
import { ErrorLine } from "../../ui/ErrorLine";
import { SlidingTabs } from "../../ui/SlidingTabs";
import { TryPen } from "./TryPen";
import "./drawing-settings.css";

const HANDS: readonly DrawingHand[] = ["right", "left"];

/**
 * Settings' Drawing group: the drawing hand, and once a pen has drawn on this device, Pencil only and
 * the pen's pressure, with a strip to try it on. They're this device's own, so each applies at once
 * and nothing restarts; a choice the device couldn't keep says so and lasts until the app closes.
 */
export function DrawingSettings() {
  const { t } = useTranslation();
  const id = useId();
  const hand = useDrawingHand();
  const pencilOnly = usePencilOnly();
  const pressure = usePenPressure();
  const [notKept, setNotKept] = useState(false);
  const kept = (done: boolean) => setNotKept(!done);
  return (
    <fieldset className="settings-note__setting">
      <legend className="fine settings-note__legend">
        {t(($) => $.stickerBoard.settings.drawing.title)}
      </legend>
      <fieldset className="settings-note__group">
        <legend className="settings-note__sublegend">
          {t(($) => $.stickerBoard.settings.drawing.hand.title)}
        </legend>
        {HANDS.map((each) => (
          <label key={each} className="settings-note__option">
            <input
              type="radio"
              name={`${id}-hand`}
              checked={hand === each}
              aria-describedby={`${id}-hand`}
              onChange={() => kept(keepDrawingHand(each))}
            />
            <span>{t(($) => $.stickerBoard.settings.drawing.hand[each])}</span>
          </label>
        ))}
        <p className="fine settings-note__about" id={`${id}-hand`}>
          {t(($) => $.stickerBoard.settings.drawing.hand.about)}
        </p>
      </fieldset>
      {/* No pen draws on a phone, so a phone shows the drawing hand alone. */}
      {pencilOnly !== null && (
        <>
          <label className="settings-note__option settings-note__switch">
            <span>{t(($) => $.stickerBoard.settings.drawing.pencilOnly.label)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={pencilOnly}
              aria-describedby={`${id}-pencil`}
              onChange={() => kept(keepPencilOnly(!pencilOnly))}
            />
          </label>
          <p className="fine settings-note__about" id={`${id}-pencil`}>
            {t(($) => $.stickerBoard.settings.drawing.pencilOnly.about)}
          </p>
          <p className="settings-note__sublegend" aria-hidden="true">
            {t(($) => $.stickerBoard.settings.drawing.pressure.title)}
          </p>
          <SlidingTabs
            kind="radios"
            tabs={PEN_PRESSURES}
            value={pressure}
            id={`${id}-pressure`}
            className="pen-pressure"
            onChange={(next) => kept(keepPenPressure(next))}
            label={t(($) => $.stickerBoard.settings.drawing.pressure.title)}
            labelOf={(each) => t(($) => $.stickerBoard.settings.drawing.pressure[each])}
          />
          <TryPen response={pressure} pencilOnly={pencilOnly} />
        </>
      )}
      <p className="fine settings-note__restarts">
        {t(($) => $.stickerBoard.settings.drawing.kept)}
      </p>
      {notKept && (
        <ErrorLine className="settings-note__problem">
          {t(($) => $.stickerBoard.settings.drawing.notKept)}
        </ErrorLine>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 6: Try it,** `stat-board/TryPen.tsx`:

```tsx
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "../../i18n/react";
import { StrokeBuilder, type PenPressure } from "../../sticker-creation/canvas/brush";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { paintStroke } from "../../sticker-creation/canvas/paintStroke";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { useReducedMotion } from "../../ui/useReducedMotion";

/** The pen's size on the strip, in CSS px: wide enough for the pressure to show. */
const TRY_SIZE = 12;
/** The ink stays this long after the last stroke, then fades. */
const TRY_FADE_AFTER_MS = 3000;
/** Ink, the color sheet's first swatch. */
const INK = "#1C1824";

type Sample = { clientX: number; clientY: number; pressure: number; timeStamp: number };

/**
 * Try it: a strip of drawing paper where the pen draws with the chosen pressure response, so the
 * choice is felt, not guessed. Fingers draw too, unless Pencil only is on. The ink fades a few seconds
 * after the last stroke, or goes at once under reduced motion; nothing is kept. Screen readers skip it.
 */
export function TryPen({ response, pencilOnly }: { response: PenPressure; pencilOnly: boolean }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const live = useRef<{ id: number; builder: StrokeBuilder; painted: number } | null>(null);
  // Whether this page's pen senses pressure, learned as on the drawing screen.
  const sensed = useRef(false);
  const fade = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    // The cork pulls up to the developer slip on a touch at its end: a stroke here isn't that pull.
    const keep = (e: TouchEvent) => e.stopPropagation();
    for (const type of ["touchstart", "touchmove"] as const) el.addEventListener(type, keep);
    return () => {
      for (const type of ["touchstart", "touchmove"] as const) el.removeEventListener(type, keep);
      clearTimeout(fade.current);
      releaseCanvas(el);
    };
  }, []);

  const point = (el: HTMLCanvasElement, e: Sample) => {
    const box = el.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const paint = () => {
    const stroke = live.current;
    if (!stroke || !ctx.current) return;
    paintStroke(ctx.current, stroke.builder.op, stroke.painted, stroke.builder.count);
    stroke.painted = stroke.builder.count;
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // A stroke here isn't a tap on the paper, which would swing it.
    e.stopPropagation();
    if (live.current || (pencilOnly && e.pointerType === "touch")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    clearTimeout(fade.current);
    el.classList.remove("is-fading");
    // Sized to the strip at the screen's density, which clears it: what's left fades anyway.
    const density = devicePixelRatio || 1;
    const [w, h] = [Math.round(el.clientWidth * density), Math.round(el.clientHeight * density)];
    if (el.width !== w || el.height !== h) [el.width, el.height] = [w, h];
    ctx.current ??= context2d(el);
    ctx.current.setTransform(density, 0, 0, density, 0, 0);
    const { x, y } = point(el, e);
    const { pressure, pointerType, timeStamp: t0 } = e;
    const builder = new StrokeBuilder({
      tool: "brush",
      color: INK,
      size: TRY_SIZE,
      x,
      y,
      t: t0,
      T: 0,
      pressure,
      pointerType,
      pressureVaries: sensed.current,
      response,
    });
    live.current = { id: e.pointerId, builder, painted: 0 };
    paint();
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (stroke?.id !== e.pointerId) return;
    const native: Sample & { getCoalescedEvents?: () => Sample[] } = e.nativeEvent;
    const samples = native.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length ? samples : [native]) {
      const { x, y } = point(e.currentTarget, sample);
      stroke.builder.add(x, y, sample.pressure, sample.timeStamp);
    }
    paint();
  };

  const end = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (stroke?.id !== e.pointerId) return;
    live.current = null;
    if (stroke.builder.pressured) sensed.current = true;
    const el = e.currentTarget;
    fade.current = window.setTimeout(() => {
      if (reduced) releaseCanvas(el);
      else el.classList.add("is-fading");
    }, TRY_FADE_AFTER_MS);
  };

  return (
    <div className="try-pen" aria-hidden="true">
      <canvas
        ref={canvas}
        className="try-pen__ink"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onTransitionEnd={(e) => {
          if (!e.currentTarget.classList.contains("is-fading")) return;
          releaseCanvas(e.currentTarget);
          e.currentTarget.classList.remove("is-fading");
        }}
      />
      <span className="try-pen__label">
        {t(($) => $.stickerBoard.settings.drawing.pressure.tryIt)}
      </span>
    </div>
  );
}
```

`stat-board/drawing-settings.css`:

```css
/* Settings' Drawing group: a fieldset inside it with no frame of its own, and a sub-setting's heading. */
.settings-note__group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.settings-note__sublegend {
  margin: 10px 0 2px;
  padding: 0;
  font: 700 13px/1.3 var(--font-ui);
  color: var(--ink);
}

/* Pen pressure's four choices: a Seal Yellow label slides to the one chosen. */
.pen-pressure {
  margin-top: 4px;
}
.pen-pressure .sliding-tabs__label {
  background: var(--seal);
}

/* Try it: drawing paper the pen draws on. It takes every touch, so the cork never scrolls under it. */
.try-pen {
  position: relative;
  height: 64px;
  margin-top: 10px;
  border-radius: 3px;
  background: var(--canvas);
  box-shadow: inset 0 0 0 1px var(--rule);
}
.try-pen__ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
.try-pen__ink.is-fading {
  opacity: 0;
  transition: opacity 600ms var(--ease-out);
}
.try-pen__label {
  position: absolute;
  left: 8px;
  top: 6px;
  font: 650 var(--fs-fine) / 1 var(--font-ui);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--graphite);
  pointer-events: none;
}
```

(Short rules sit on one line here; the pre-commit hook formats them.)

- [ ] **Step 7: The card.** `SettingsNote.tsx` imports `DrawingSettings` from `./DrawingSettings` and renders `<DrawingSettings />` after the 18+ fieldset, inside `.stat-board__paper`. Its doc comment ends with "Its Drawing group (`DrawingSettings`) is this device's own, and restarts nothing."
- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board src/explore` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 9:** Commit: `feat(frontend): Settings' Drawing group: drawing hand, Pencil only and pen pressure, with a strip to try it`

### Task 7: A ring where a hovering Pencil would land

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`; `apps/frontend/src/sticker-creation/DrawingScreen.tsx`, `DrawingScreen.css`

UI task (the ring).

- [ ] **Step 1: Write the failing test.** `inkEngine.test.ts` imports `type Hover`; `setup()`'s `events` gains `onHover: vi.fn<(at: Hover | null) => void>(),` and `at` gains `buttons: 1,` after `button`. Add:

```ts
it("shows where a hovering pen would land, never for a mouse, hides it as the pen lands or leaves, and draws nothing from it", () => {
  const { engine, at, layer, events } = setup();
  const hover = (pointerType: string, x: number, t: number) =>
    engine.move({ ...at(pointerType, 1, x, 40, t), buttons: 0 });
  hover("mouse", 10, 0);
  expect(events.onHover).not.toHaveBeenCalled();
  hover("pen", 10, 10);
  hover("pen", 20, 20);
  expect(events.onHover).toHaveBeenLastCalledWith({ clientX: 20, clientY: 40 });
  expect(layer.paints).toBe(0);
  engine.down(at("pen", 1, 20, 40, 30));
  expect(events.onHover).toHaveBeenLastCalledWith(null);
  engine.up(at("pen", 1, 20, 40, 40));
  hover("pen", 30, 50);
  engine.leave();
  expect(events.onHover).toHaveBeenLastCalledWith(null);
  // A paused sheet takes no mark, so a hovering pen shows none.
  engine.settings = { ...engine.settings, paused: true };
  hover("pen", 40, 60);
  expect(events.onHover).toHaveBeenLastCalledWith(null);
});
```

- [ ] **Step 2:** Run the engine's tests → fails: no `onHover`, `buttons` or `leave`.
- [ ] **Step 3: The engine.** `PointerInput` gains, after `button`:

```ts
/** The buttons held: none for a pen hovering over the sheet. */
buttons: number;
```

Before `InkEvents`, `/** Where a hovering pen would land, in client px. */ export interface Hover { clientX: number; clientY: number }`. `InkEvents` gains, after `onPen`, `/** A pen hovering over the sheet, where it would land; null once it lands or leaves. */ onHover: (at: Hover | null) => void;`. A field after `pressurePen`: `private hovering = false;`. In `attach()`: `const onLeave = () => this.leave();` beside the other handlers, `sheet.addEventListener("pointerleave", onLeave);` after the `lostpointercapture` listener, and its removal in the detach. In `down()`, right after `const { pointerId: id, pointerType } = e;`: `this.hideHover();`. In `move()`, right after `const id = e.pointerId;`:

```ts
// A pen with nothing pressed hovers: it shows where it would land, and never draws.
if (e.pointerType === "pen" && e.buttons === 0 && this.live?.id !== id) {
  this.hover(e);
  return;
}
```

After `finishStroke()`:

```ts
  /** The pointer left the sheet: a hovering pen's ring goes. */
  leave(): void {
    this.hideHover();
  }
```

and after `toSheet`:

```ts
  /** Where a hovering pen would land, while the sheet would take its mark. */
  private hover(e: PointerInput): void {
    const s = this.settings;
    if (s.locked || s.paused || s.panelOpen || s.tool === "fill" || this.live || !this.sheet) {
      this.hideHover();
      return;
    }
    this.hovering = true;
    this.events.onHover({ clientX: e.clientX, clientY: e.clientY });
  }

  private hideHover(): void {
    if (!this.hovering) return;
    this.hovering = false;
    this.events.onHover(null);
  }
```

- [ ] **Step 4: The ring.** `DrawingCanvas.tsx`: `const onHover = useEffectEvent(events.onHover);` and the engine's events gain `onHover: (at) => onHover(at),`. `DrawingScreen.tsx` imports `type Hover` beside `HistoryState`, and `MID_PRESSURE` and `pressureWidth` beside `sizePx`; after `const undoTile = …`: `const nib = useRef<HTMLSpanElement>(null);`. After `setSize`:

```ts
// A hovering Pencil's ring moves on the page itself: hover comes too often for React state.
const showNib = (at: Hover | null) => {
  const ring = nib.current;
  if (!ring) return;
  ring.hidden = at === null;
  if (!at) return;
  // As wide as a mid-pressure stroke under the chosen response; the eraser keeps one width.
  const width = tool === "eraser" ? 1 : pressureWidth(MID_PRESSURE, penPressure);
  const d = sizePx(sizes[sizeKey]) * width * sheetScale;
  ring.style.width = `${d}px`;
  ring.style.height = `${d}px`;
  ring.style.transform = `translate(${at.clientX - d / 2}px, ${at.clientY - d / 2}px)`;
};
```

`DrawingCanvas` takes `onHover={showNib}`. Right after `<DrawingCanvas … />`:

```tsx
<span
  ref={nib}
  className={`nib-ring ${tool === "eraser" ? "is-eraser" : ""}`}
  hidden
  aria-hidden="true"
/>
```

`DrawingScreen.css`, before the reduced-motion block:

```css
/* A hovering Pencil's ring: where it would land, as wide as a mid-pressure stroke on screen, in the
   brush's color. Fixed, it follows the pen in screen px, and takes no touch. */
.nib-ring {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 4;
  box-sizing: border-box;
  pointer-events: none;
  border: 1.5px solid var(--draw-color);
  border-radius: 50%;
  outline: 1px solid rgba(255, 255, 255, 0.85);
}
.nib-ring.is-eraser {
  border-color: rgba(28, 24, 36, 0.45);
}
```

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `feat(frontend): a hovering Pencil shows a ring as wide as a mid-pressure stroke`

### Task 8: The performance recorder names the ink's work

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts`, `inkEngine.test.ts`

- [ ] **Step 1: Write the failing test.** In `inkEngine.test.ts`, `INK_WORK` joins the `./inkEngine` import, and after the imports:

```ts
/** The labels the engine's work was timed under, as the performance recorder hears them. */
const timed = vi.hoisted((): string[] => []);
vi.mock("../../performance/performanceRecorder", () => ({
  timeOurWork: <T>(label: string, work: () => T): T => {
    timed.push(label);
    return work();
  },
}));
```

and the test:

```ts
it("names its painting, fills, replays and snapshots for the performance recorder", () => {
  const { engine, stroke } = setup({ tool: "fill" });
  timed.length = 0;
  stroke("touch", 1, [40, 40], [42, 40]);
  engine.settings = { ...engine.settings, tool: "brush" };
  stroke("mouse", 2, [0, 0], [100, 0], 1000);
  engine.undo();
  expect(new Set(timed)).toEqual(new Set(Object.values(INK_WORK)));
});
```

- [ ] **Step 2:** Run the engine's tests → fails: no `INK_WORK`.
- [ ] **Step 3: Implement.** `inkEngine.ts` imports `timeOurWork` from `../../performance/performanceRecorder`; after the constants:

```ts
/** The ink's work as the performance recorder's report names it, so a slow Pencil stroke can be told. */
export const INK_WORK = {
  paint: "ink paint",
  fill: "ink fill",
  replay: "ink replay",
  snapshot: "ink snapshot",
} as const;
```

Each piece of work goes under its label:

- `undo()`: `if (timeOurWork(INK_WORK.replay, () => this.history.undo())) this.notifyHistory();`, and `redo()` the same with `redo()`.
- `load()`: `timeOurWork(INK_WORK.replay, () => this.history.load(steps));`
- `useFrame()`, where a frame change now repaints: its last line becomes `timeOurWork(INK_WORK.replay, () => { if (this.layer.setFrame(frame)) this.history.invalidate(); });`
- `beginStroke()`: `timeOurWork(INK_WORK.paint, () => this.layer.paint(builder.op, 0, 1));`
- `paintFrame`:

```ts
  private readonly paintFrame = (): void => {
    this.cancelFrame = null;
    const live = this.live;
    if (live) timeOurWork(INK_WORK.paint, () => this.paintNew(live));
  };
```

- `endStroke()`, from `if (takeBack)` on:

```ts
if (takeBack) {
  timeOurWork(INK_WORK.replay, () => this.history.repaint());
  return;
}
timeOurWork(INK_WORK.paint, () => {
  this.paintNew(live);
  let t = live.t;
  for (const [x, y] of live.lazy.catchUp(live.x, live.y))
    live.builder.add(x, y, live.pressure, (t += CATCH_UP_MS));
  this.paintNew(live);
});
timeOurWork(INK_WORK.snapshot, () => this.history.commit(live.builder.op));
this.events.onCommit(live.builder.op);
this.notifyHistory();
```

- `applyFill()`: `if (!this.layer.fill(op)) return;` becomes `if (!timeOurWork(INK_WORK.fill, () => this.layer.fill(op))) return;`, and after the drawing sheet plan's `this.frameRule = "fixed";`, `this.history.commit(op);` becomes `timeOurWork(INK_WORK.snapshot, () => this.history.commit(op));`.

- [ ] **Step 4:** Run the engine's tests → pass.
- [ ] **Step 5:** Commit: `feat(frontend): the performance recorder times the ink's painting, fills and replays`

### Task 9: Prediction ahead of the nib

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/lazyBrush.ts`, `inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`, `DrawingCanvas.css`; create `canvas/predictionCanvas.ts`

- [ ] **Step 1: Write the failing test.** `inkEngine.test.ts` imports `type PredictionLayer`, and `type StrokeOp` beside `STRIDE`. After `FakeLayer`:

```ts
/** Records what the prediction overlay shows. */
class FakePrediction implements PredictionLayer {
  shown: StrokeOp | null = null;
  paint(op: StrokeOp) {
    this.shown = op;
  }
  clear() {
    this.shown = null;
  }
}
```

`setup` takes a second parameter, `prediction: PredictionLayer | null = null`, passed as the engine's fifth argument. Then:

```ts
it("paints a pen's predicted points ahead of its brush stroke for one frame, and never keeps them", () => {
  const prediction = new FakePrediction();
  const { engine, at, runFrame, committed } = setup({}, prediction);
  const guessing = (input: PointerInput, ...ahead: [number, number][]): PointerInput => ({
    ...input,
    getPredictedEvents: () => ahead.map(([x, y]) => ({ ...input, clientX: x, clientY: y })),
  });
  engine.down(at("pen", 1, 0, 0, 0));
  engine.move(guessing(at("pen", 1, 10, 0, 16), [20, 0], [30, 0]));
  runFrame();
  expect(prediction.shown?.pts.filter((_, i) => i % STRIDE === 0)).toEqual([10, 20, 30]);
  runFrame();
  expect(prediction.shown).toBeNull();
  engine.up(at("pen", 1, 10, 0, 40));
  expect(lastPoint(committed()[0])).toEqual([10, 0]);
  // An eraser's guess can't show over the ink, so it shows none.
  engine.settings = { ...engine.settings, tool: "eraser" };
  engine.down(at("pen", 2, 0, 50, 100));
  engine.move(guessing(at("pen", 2, 10, 50, 116), [20, 50]));
  runFrame();
  expect(prediction.shown).toBeNull();
});
```

- [ ] **Step 2:** Run the engine's tests → fails: nothing is predicted.
- [ ] **Step 3: The lazy brush can try a path.** `lazyBrush.ts`, after `follow`:

```ts
  /** A brush where this one is, on the same string, to try a path without moving this one. */
  copy(): LazyBrush {
    return new LazyBrush(this.x, this.y, this.radius);
  }
```

- [ ] **Step 4: The engine.** `inkEngine.ts`'s ops import gains `STRIDE` and `type StrokeOp`. After `InkLayer`: `/** Where a pen's predicted path shows for one frame: an overlay over the ink, never the ink. */ export interface PredictionLayer { /** Wipes what it showed, then paints this path. */ paint: (op: StrokeOp) => void; clear: () => void }`. `PointerInput` gains, after `getCoalescedEvents`: `/** Where the browser expects the pointer next, where it says. */ getPredictedEvents?: () => PointerInput[];`. `LiveStroke` gains `/** The browser's latest guess at the pen's next samples, flat: x, y. */ ahead: number[];`, and `beginStroke`'s live stroke `ahead: [],`. The constructor takes a fifth parameter, `prediction: PredictionLayer | null = null`, kept in `private readonly prediction: PredictionLayer | null;`. In `move()`, after the coalesced loop and before the frame is asked for:

```ts
live.ahead.length = 0;
if (live.pointerType === "pen")
  for (const guess of e.getPredictedEvents?.() ?? []) live.ahead.push(...this.toSheet(guess));
```

`paintFrame` paints the guess too:

```ts
  private readonly paintFrame = (): void => {
    this.cancelFrame = null;
    const live = this.live;
    if (!live) return;
    timeOurWork(INK_WORK.paint, () => {
      this.paintNew(live);
      this.paintAhead(live);
    });
  };
```

After `paintNew`:

```ts
  /**
   * The browser's guess at where the pen goes next, painted ahead of the stroke for this frame. It
   * runs through a copy of the lazy brush, so it trails the pen as the stroke does, at the stroke's
   * last width. A frame with no new guess wipes the last; none of it reaches the ink or the op.
   */
  private paintAhead(live: LiveStroke): void {
    const prediction = this.prediction;
    if (!prediction) return;
    const ahead = live.ahead.splice(0);
    const { pts, tool, color, T } = live.builder.op;
    if (ahead.length === 0 || tool !== "brush") {
      prediction.clear();
      return;
    }
    const last = (live.builder.count - 1) * STRIDE;
    const width = pts[last + 2];
    const guess = [pts[last], pts[last + 1], width, 0];
    const brush = live.lazy.copy();
    for (let i = 0; i < ahead.length; i += 2)
      if (brush.follow(ahead[i], ahead[i + 1])) guess.push(brush.x, brush.y, width, 0);
    if (guess.length === STRIDE) {
      prediction.clear();
      return;
    }
    prediction.paint({ tool, color, pts: guess, T });
    // The next frame wipes it, whether or not a new sample comes.
    this.cancelFrame ??= this.requestFrame(this.paintFrame);
  }
```

In `endStroke`, after `this.cancelFrame = null;`: `this.prediction?.clear();`.

- [ ] **Step 5: The overlay,** `canvas/predictionCanvas.ts`:

```ts
import { releaseCanvas } from "../../ui/releaseCanvas";
import { context2d } from "./context2d";
import type { PredictionLayer } from "./inkEngine";
import type { StrokeOp } from "./ops";
import { paintStroke } from "./paintStroke";

/** The ink canvas's backing size and its device px per sheet unit, which the overlay matches. */
type InkSize = { width: number; height: number; density: number };

/**
 * A transparent canvas over the ink, sized and scaled as the ink is, holding a pen's predicted path
 * for one frame. It takes its backing at the first prediction, so a device with no pen pays nothing.
 */
export class PredictionCanvas implements PredictionLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ink: () => InkSize;
  private ctx: CanvasRenderingContext2D | null = null;
  private painted = false;

  constructor(canvas: HTMLCanvasElement, ink: () => InkSize) {
    this.canvas = canvas;
    this.ink = ink;
  }

  paint(op: StrokeOp): void {
    const ctx = this.matched();
    this.wipe(ctx);
    paintStroke(ctx, op);
    this.painted = true;
  }

  clear(): void {
    if (this.painted && this.ctx) this.wipe(this.ctx);
  }

  /** Lets go of its backing now, as when the sheet goes. */
  release(): void {
    releaseCanvas(this.canvas);
    [this.ctx, this.painted] = [null, false];
  }

  /** Its context, the canvas sized as the ink is, which each drawing's frame sets. */
  private matched(): CanvasRenderingContext2D {
    const { width, height, density } = this.ink();
    if (this.canvas.width !== width || this.canvas.height !== height) {
      [this.canvas.width, this.canvas.height, this.painted] = [width, height, false];
    }
    const ctx = (this.ctx ??= context2d(this.canvas));
    ctx.setTransform(density, 0, 0, density, 0, 0);
    return ctx;
  }

  private wipe(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
    this.painted = false;
  }
}
```

`DrawingCanvas.tsx`: import `PredictionCanvas`; `const predictionRef = useRef<HTMLCanvasElement>(null);` beside `canvasRef`. In the effect, `const predicted = predictionRef.current;` joins the elements it returns early without; after `new InkSurface(canvas)`:

```ts
// Sized and scaled as the ink is whenever it paints, so it follows each drawing's frame.
const prediction = new PredictionCanvas(predicted, () => ({
  width: canvas.width,
  height: canvas.height,
  density: surface.density,
}));
```

The engine is built with `undefined, prediction` after its events (the default frame source, then the overlay), and the cleanup calls `prediction.release();` after `engine.dispose();`. Inside `.ink-sheet`, right after the ink canvas, a canvas with the ink canvas's class, so it lies exactly over it:

```tsx
{
  /* A pen's predicted path, one frame at a time: never read, kept or sealed. */
}
<canvas ref={predictionRef} className="ink-canvas ink-prediction" aria-hidden="true" />;
```

`DrawingCanvas.css`, at the end:

```css
/* The prediction overlay lies over the ink and lets every touch through to the sheet. */
.ink-prediction {
  pointer-events: none;
}
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): the browser's predicted points paint ahead of the Pencil for a frame`

### Task 10: Escape disarms the seal check

**Files:** Modify `apps/frontend/src/sticker-creation/session/session.ts`, `session.test.ts`, `useShortcuts.ts`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `session.test.ts`, "disarms on any touch of the canvas" becomes:

```ts
it("disarms on any touch of the canvas, and on Escape", () => {
  expect(run(start, ink, tap(1000), { type: "canvas-touch" }).phase).toBe("drawing");
  expect(run(start, ink, tap(1000), { type: "escape" }).phase).toBe("drawing");
});
```

`DrawingScreen.test.tsx`, after the clearing tests:

```tsx
describe("the seal key", () => {
  it("disarms on Escape, so the next tap only arms it again", async () => {
    reopen(keptHalfway);
    await settle();
    const key = () => document.querySelector<HTMLButtonElement>(".seal-key");
    act(() => key()?.click());
    expect(key()?.getAttribute("aria-label")).toBe(strings.stickerCreation.seal.tapAgain.en);
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(key()?.getAttribute("aria-label")).toBe(strings.stickerCreation.seal.label.en);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/session src/sticker-creation/DrawingScreen.test.tsx` → both fail.
- [ ] **Step 3: Implement.** `session.ts`, after `{ type: "canvas-touch" }`:

```ts
  /** Escape: the seal key disarms, as at a touch on the sheet. */
  | { type: "escape" }
```

and `case "escape":` joins `case "canvas-touch":` and `case "clear":`. `useShortcuts.ts`: `Shortcuts` gains `/** Takes back the seal key's first tap. */ disarm: () => void;`, the hook's comment ends "…[ and ] for the size, and Escape, which closes a panel and disarms the seal key.", and the Escape branch calls `s.closePanel();` then `s.disarm();`. `DrawingScreen.tsx`'s `useShortcuts({ … })` gains `disarm: () => send({ type: "escape" }),`.

- [ ] **Step 4:** Run the same tests → pass.
- [ ] **Step 5:** Commit: `fix(frontend): Escape disarms the seal check`

### Task 11: Left mirrors the drawing screen

**Files:** Modify `apps/frontend/src/sticker-creation/DrawingScreen.tsx`, `DrawingScreen.css`, `DrawingScreen.test.tsx`, `TimerDot.tsx`, `SealKey.css`, `tools/SizeRail.tsx`, `tools/HistoryButtons.tsx`, `apps/frontend/src/icons/index.tsx`

UI task.

- [ ] **Step 1: Write the failing test** in `DrawingScreen.test.tsx` (import `keepDrawingHand` from `./drawingSettings`):

```tsx
describe("the drawing screen's drawing hand", () => {
  it("mirrors at once when Left is chosen, with no reload", async () => {
    reopen(keptHalfway);
    await settle();
    const hand = () => document.querySelector(".drawing-screen")?.getAttribute("data-hand");
    expect(hand()).toBe("right");
    act(() => void keepDrawingHand("left"));
    expect(hand()).toBe("left");
  });
});
```

- [ ] **Step 2:** Run the drawing screen's tests → fails: no `data-hand`.
- [ ] **Step 3: The attribute.** `DrawingScreen.tsx` imports `useDrawingHand` with the other drawing settings; `const hand = useDrawingHand();` after `penPressure`; the root `div` takes `data-hand={hand}`.
- [ ] **Step 4: The hint's arrow.** `icons/index.tsx`: `ArrowBendRightUp,` after `ArrowBendLeftUp,` in the re-exports. `TimerDot.tsx` imports it, and `useDrawingHand` from `./drawingSettings`; after `const describedBy = useId();`:

```tsx
const hand = useDrawingHand();
// The hint's arrow points up at the timer, which a left hand's screen puts on the right.
const HintArrow = hand === "left" ? ArrowBendRightUp : ArrowBendLeftUp;
```

and the hint renders `<HintArrow className="timer-hint-arrow" size={28} />`.

- [ ] **Step 5: The chip slides out from the key's side.** `SealKey.css`: `.seal-chip`'s `transform: translateX(6px);` becomes `transform: translateX(var(--chip-from, 6px));`, with `/* It slides out from the key: --chip-from points back at the key in each layout. */` above it.
- [ ] **Step 6: The mirror.** `DrawingScreen.css`, before the reduced-motion block (short rules sit on one line here; the pre-commit hook formats them):

```css
/* ---------- Drawing hand: Left mirrors the screen. The rail, undo and redo, the check and the 18+
   switch go to the right; the tool strip and its bars to the top left, the timer to the top right. */
.drawing-screen[data-hand="left"] {
  --chip-from: -6px;
}
.drawing-screen[data-hand="left"] .drawing-top {
  left: 14px;
  right: 16px;
  flex-direction: row-reverse;
}
.drawing-screen[data-hand="left"] .timer-hint {
  left: auto;
  right: 4px;
  flex-direction: row-reverse;
  transform-origin: calc(100% - 14px) 0;
}
.drawing-screen[data-hand="left"] .timer-hint-label {
  margin: 18px -2px 0 0;
  transform-origin: 100% 0;
}
.drawing-screen[data-hand="left"] :is(.smoothing-bar, .clear-bar) {
  left: 14px;
  right: auto;
}
.drawing-screen[data-hand="left"] .size-rail {
  left: auto;
  right: 0;
}
/* Its number grows left for two digits, away from the screen's edge. */
.drawing-screen[data-hand="left"] .size-num {
  left: auto;
  right: 7px;
  transform-origin: 100% 100%;
}
.drawing-screen[data-hand="left"] .history-buttons {
  left: auto;
  right: 18px;
}
.drawing-screen[data-hand="left"] > .drawing-start-over {
  left: auto;
  right: 18px;
  justify-content: flex-end;
  text-align: right;
}
.drawing-screen[data-hand="left"] .key.seal-key {
  left: 18px;
  right: auto;
}
.drawing-screen[data-hand="left"] .seal-chip {
  --chip-away: flex-end;
  left: 88px;
  right: auto;
}
```

- [ ] **Step 7: Comments.** `SizeRail.tsx`: "a groove down the left edge" becomes "a groove down the edge opposite the drawing hand". `HistoryButtons.tsx`: "flat tiles at the bottom left" becomes "flat tiles at the foot of the size rail's edge".
- [ ] **Step 8:** Run the drawing screen's tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 9:** Commit: `feat(frontend): a left drawing hand mirrors the drawing screen`

### Task 12: The regular drawing screen

**Files:** Modify `apps/frontend/src/sticker-creation/DrawingScreen.tsx` (its comment), `DrawingScreen.css`

UI task. The layout is checked in the browser (Task 15); there's no unit test.

- [ ] **Step 1: The comment.** `DrawingScreen`'s doc comment becomes:

```ts
/**
 * The drawing screen: a white sheet on the Liner, the timer and the tools in one row across the top.
 * On a phone the size rail runs down one edge, with undo and redo at its foot and the seal key at the
 * other; in a regular window the rail, undo and redo and the seal key stack down the edge opposite
 * the drawing hand, and the sheet sits centered in the rest. A left hand mirrors it. It
 * owns the session (tickets, the clock and the seal step); the ink engine owns the drawing.
 */
```

- [ ] **Step 2: The grid.** `DrawingScreen.css`, after the mirror section. DrawingCanvas's `.ink-area` is the sheet's area: on a phone it fills the screen inside its margins, as it already does; here it fills the grid's `sheet` cell.

```css
/* ---------- Regular width: an edge column opposite the drawing hand carries the size rail, undo and
   redo under it, and the seal check at its foot; the sheet's area is the rest, under
   the top row. The column's pieces are in flow, so a short window shrinks the rail first. */
.phone[data-width="regular"] .drawing-screen {
  --chip-from: -6px;
  display: grid;
  grid-template-columns: 134px minmax(0, 1fr);
  grid-template-rows:
    76px minmax(0, 1fr) minmax(120px, clamp(222px, 45%, 480px)) auto minmax(16px, 1fr)
    auto 32px;
  grid-template-areas: ". ." ". sheet" "rail sheet" "history sheet" ". sheet" "seal sheet" ". sheet";
}

.phone[data-width="regular"] .drawing-screen[data-hand="left"] {
  --chip-from: 6px;
  grid-template-columns: minmax(0, 1fr) 134px;
  grid-template-areas: ". ." "sheet ." "sheet rail" "sheet history" "sheet ." "sheet seal" "sheet .";
}

.phone[data-width="regular"] .drawing-screen > :is(.ink-area, .size-ghost, .sealing-status) {
  grid-area: sheet;
}
.phone[data-width="regular"]
  .drawing-screen
  > :is(.size-rail, .history-buttons, .key.seal-key, .drawing-start-over) {
  position: relative;
  inset: auto;
  justify-self: center;
}
.phone[data-width="regular"] .drawing-screen > .size-rail {
  grid-area: rail;
  align-self: stretch;
  height: auto;
}
.phone[data-width="regular"] .drawing-screen > :is(.history-buttons, .drawing-start-over) {
  grid-area: history;
  align-self: start;
  margin-top: 16px;
}
.phone[data-width="regular"] .drawing-screen > .drawing-start-over {
  justify-content: center;
  text-align: center;
}
.phone[data-width="regular"] .drawing-screen > .key.seal-key {
  grid-area: seal;
}

/* The chip opens from the check toward the sheet, its 18+ box at the end away from the check. */
.phone[data-width="regular"] .drawing-screen > .seal-chip {
  --chip-away: flex-end;
  grid-area: seal;
  right: auto;
  bottom: 14px;
  left: calc(50% + 41px);
}
.phone[data-width="regular"] .drawing-screen[data-hand="left"] > .seal-chip {
  --chip-away: flex-start;
  right: calc(50% + 41px);
  left: auto;
}
.phone[data-width="regular"] .drawing-screen > .seal-chip.is-long {
  max-width: 340px;
}
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/DrawingScreen.test.tsx` and `pnpm -C apps/frontend typecheck` → pass. Look once at a desktop window 1180×820 with `?layout=regular` (the foundations plan's dev override) before committing.
- [ ] **Step 4:** Commit: `feat(frontend): the regular drawing screen stacks its controls down the edge opposite the drawing hand`

### Task 13: The color sheet is a popover in regular width

**Files:** Modify `apps/frontend/src/sticker-creation/tools/ColorSheet.tsx`, `ColorSheet.css`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `apps/frontend/src/i18n/strings/stickerCreation.ts` (`colorSheet.title`'s comment)

UI task. The foundations plan's regular sheet rule (`ui/sheet.css`) makes every `.bottom-sheet` a card at `--content-w` lifted off its layer's foot, except one that carries `bottom-sheet--popover`; the color sheet carries it (Step 4), so the popover's rule needs no resets.

- [ ] **Step 1: Write the failing tests.** In `DrawingScreen.test.tsx`, after the mocks, the layout is switchable:

```tsx
const layout = vi.hoisted(() => ({ regular: false }));
vi.mock("../app/sizeClass", async (original) => ({
  ...(await original<object>()),
  useSizeClass: () => ({ width: layout.regular ? "regular" : "compact", height: "tall" }),
}));
```

The existing `ColorSheet` and `ToolStrip` mocks give way to these, which show the sheet while it's open and add a color tile:

```tsx
// The color sheet, there while it's open.
vi.mock("./tools/ColorSheet", () => ({
  ColorSheet: ({ open }: { open: boolean }) => (open ? <div className="color-sheet" /> : null),
}));
// The tool strip's clear and color tiles, which control their panels as the real ones do.
type StripProps = {
  clearBarId: string;
  colorSheetId: string;
  onPanel: (panel: "clear" | "color") => void;
};
vi.mock("./tools/ToolStrip", () => ({
  ToolStrip: ({ clearBarId, colorSheetId, onPanel }: StripProps) => (
    <>
      <button
        type="button"
        className="clear-tile"
        aria-controls={clearBarId}
        onClick={() => onPanel("clear")}
      />
      <button
        type="button"
        className="color-tile"
        aria-controls={colorSheetId}
        onClick={() => onPanel("color")}
      />
    </>
  ),
}));
```

`afterEach` gains `layout.regular = false;`. Then:

```tsx
describe("the color sheet", () => {
  const colorSheet = () => document.querySelector(".color-sheet");
  const pressOn = (el: Element | null) =>
    act(() => void el?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  /** The drawing screen with the color sheet open: a popover in a regular window, else a bottom sheet. */
  const openColor = async (regular: boolean) => {
    layout.regular = regular;
    reopen(keptHalfway);
    await settle();
    act(() => document.querySelector<HTMLButtonElement>(".color-tile")?.click());
  };

  it("closes at a tap outside it where it's a popover, and keeps to taps inside", async () => {
    await openColor(true);
    pressOn(colorSheet());
    expect(colorSheet()).not.toBeNull();
    pressOn(document.querySelector(".timer-stub"));
    expect(colorSheet()).toBeNull();
  });

  it("stays up at a tap beside it on a phone, where it's a bottom sheet", async () => {
    await openColor(false);
    pressOn(document.querySelector(".timer-stub"));
    expect(colorSheet()).not.toBeNull();
  });
});
```

- [ ] **Step 2:** Run the drawing screen's tests → the popover test fails: the tap outside leaves it open.
- [ ] **Step 3: A tap outside closes it.** `DrawingScreen.tsx` imports `useSizeClass` from `../app/sizeClass`; after `const clearBarId = useId();`, `const popover = useSizeClass().width === "regular";`. `closeBarOutside` becomes:

```ts
// A tap anywhere but an open panel or its tile closes the panel: the bars always, and the color sheet
// where it's a popover, since a bottom sheet covers what's around it. The sheet is left to the ink
// engine, which closes it and swallows the tap: closing it here first would let the tap draw.
const closePanelOutside = (e: ReactPointerEvent) => {
  const open =
    panel === "smoothing"
      ? smoothingBarId
      : panel === "clear"
        ? clearBarId
        : panel === "color" && popover
          ? colorSheetId
          : null;
  if (!open || !(e.target instanceof Element)) return;
  const own = [`#${CSS.escape(open)}`, `[aria-controls="${open}"]`, ".ink-sheet"];
  if (panel === "color") own.push(".color-sheet");
  if (!e.target.closest(own.join(", "))) setPanel(null);
};
```

and the root takes `onPointerDownCapture={closePanelOutside}`.

- [ ] **Step 4: The popover.** In `ColorSheet.tsx`, the `Sheet`'s `className="color-sheet"` becomes `className="color-sheet bottom-sheet--popover"`, at every size: the foundations plan's regular sheet rule then leaves it alone, and on a phone nothing reads the class. `ColorSheet.css`, at the end:

```css
/* ---------- Regular width: a popover under the tool strip, from the color tile, so the drawing stays
   in view. Its perforation, Escape, Back and a tap outside close it, and the clock holds meanwhile. */
.phone[data-width="regular"] .drawing-screen .bottom-sheet.color-sheet {
  inset: 66px 14px auto auto;
  width: 360px;
  max-width: calc(100% - 28px);
  max-height: calc(100% - 82px);
  border-radius: 16px;
  box-shadow: var(--shadow-lift);
  animation: color-popover-in 220ms var(--ease-out);
}
.phone[data-width="regular"] .drawing-screen[data-hand="left"] .bottom-sheet.color-sheet {
  inset: 66px auto auto 14px;
}
.phone[data-width="regular"] .drawing-screen .bottom-sheet.color-sheet.is-leaving {
  animation: color-popover-out 160ms var(--ease-out) forwards;
}
@keyframes color-popover-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
@keyframes color-popover-out {
  to {
    opacity: 0;
    transform: translateY(-6px);
  }
}
```

- [ ] **Step 5:** `stickerCreation.ts`: `colorSheet.title`'s comment becomes `/** Color sheet, which slides up over the drawing screen from the color tile, or opens under the tool strip in a wide window: its heading, and its name for screen readers */`.
- [ ] **Step 6:** Run the drawing screen's tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): in a regular window the color sheet opens as a popover under the tools`

### Task 14: The drawing screen at short heights

**Files:** Modify `apps/frontend/src/sticker-creation/DrawingScreen.css`, `tools/ColorSheet.css`

UI task.

- [ ] **Step 1: The rail.** `DrawingScreen.css`, after the mirror section:

```css
/* ---------- Short heights, compact (LINE's iPad sheet, an iPhone SE in LINE, a landscape phone):
   the size rail ends above undo whatever the height. */
.phone[data-width="compact"][data-height="short"] .drawing-screen .size-rail {
  height: clamp(120px, calc(100% - 196px), 222px);
}
```

- [ ] **Step 2: The color sheet.** In `ColorSheet.css`, delete the `@media (max-height: 640px)` rule and its comment, and after `.color-picker` add:

```css
/* Short heights, compact: the sheet leaves more of the drawing in view. Its heading goes from sight
   (the dialog keeps its name), the pad gives way, and the swatches wait behind a scroll. */
.phone[data-width="compact"][data-height="short"] .bottom-sheet.color-sheet {
  max-height: 42%;
}
.phone[data-width="compact"][data-height="short"] .color-sheet .color-head {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.phone[data-width="compact"][data-height="short"] .color-sheet .color-pad {
  height: 56px;
}
```

- [ ] **Step 3:** `pnpm -C apps/frontend typecheck` → passes. Commit: `fix(frontend): the size rail and the color sheet fit short screens, LINE's iPad sheet among them`

### Task 15: Check it in WebKit and Chromium

Scratch only, in `~/.cache/drawing-app-ipad/drawing-screen/`; nothing here is committed.

- [ ] **Step 1: A dev server of its own,** on 5192 and 8792 (other sessions hold 5173/8788 and 5190/8790, and the other iPad plans 5191 and 5193–5196). The API, in the background: `PORT=8792 DATABASE_URL=data/ipad-drawing.db IMAGE_DIR=../../data/ipad-drawing-images IMAGE_BASE_URL=http://localhost:5192/api/images pnpm -C apps/api dev`. Vite, in the background, from an untracked `apps/frontend/vite.ipad-drawing.config.ts`:

```ts
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5192,
      strictPort: true,
      proxy: { "/api": { target: "http://localhost:8792" } },
    },
  }),
);
```

run as `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm -C apps/frontend exec vite --config vite.ipad-drawing.config.ts`.

- [ ] **Step 2: Helpers.** Copy `~/.cache/drawing-app-ipad/scripts/drawing/lib.js` into the scratch folder, with `BASE` `http://localhost:5192`, and `OUT` and `LOG` there. Its `openContext` signs in from Node and adds the session cookie back without `Secure` (WebKit drops it on http://localhost; see `~/.cache/drawing-app-ipad/seed.txt`) and routes WebKit's HTTPS through Node; `openCanvas` taps Draw. Sign each run in as a fresh `?as=draw-<check>-<n>` (three daily tickets each). For a left hand, `context.addInitScript(() => localStorage.setItem("draw.hand", "left"))`. `measure()` gains `sheetArea: box(".ink-area")`, `nib: box(".nib-ring")` and `pencilTile: box('[aria-label="Pencil only"]')`.
- [ ] **Step 3: Layout, WebKit, both hands,** one stroke drawn so the check shows. Regular at 744×1133, 1133×690, 820×1180, 1180×820 and 1376×1032 (iPad UA, DPR 2); compact at 390×844 and 375×591 (iPhone UA, DPR 3), and 540×620 and 540×564 (iPad UA). Capture `draw-<hand>-<w>x<h>.png`, log `measure()`, and log `RULE <what failed>` for each of these that fails:
  - Regular: the rail, undo and redo and the check lie inside the 134px column on the side away from the hand, none overlapping another; the rail at least 300px tall, and its center within 15% of the screen's height of the screen's middle, at 820×1180 and taller; the check at least 24px from the screen's side and 32px above its foot; `.ink-area` fills the rest under 76px, and the sheet sits inside it; the tool strip at the top on the hand's side, the timer opposite.
  - 1133×690, regular and short: the rail shorter than at 1180×820 and at least 120px, the column starting under the top row, and every piece of it on screen.
  - Compact, right hand, at 390×844: today's offsets (rail left 0, top 104, 222 tall; undo left 18, bottom 22; the check right 18, bottom 16). Left hand: the same from the other side.
  - 375×591, 540×620 and 540×564, compact and short: the rail ends at least 24px above undo.
  - Rotation: draw at 820×1180, `setViewportSize` to 1180×820 mid-drawing and back; the rules hold at each size, and no step is lost (`keptDrawing`).
- [ ] **Step 4: The color sheet.** WebKit at 1180×820 (both hands) and 820×1180: tap the color tile. The popover is 360px wide, 66px down, its outer edge 14px from the side; focus is inside it; the timer shows PAUSED (`.timer-dot.is-held`); a swatch picks and it stays open; Escape closes it; reopened, a tap on undo closes it; reopened, a tap on the sheet closes it and draws nothing. Capture `color-popover-<hand>-1180x820.png`. At 540×620 the sheet's top is at least half the drawing screen's height down, with the recents, pad and brightness bar wholly above its foot; capture `color-sheet-540x620.png`. At 390×844 it still stops at 52%.
- [ ] **Step 5: The Pencil, Chromium with CDP** at 820×1180 (`Input.dispatchMouseEvent` with `pointerType: "pen"`, `force`, `tiltX`/`tiltY` and `buttons`; `Input.dispatchTouchEvent` for fingers; see `~/.cache/drawing-app-ipad/scripts/drawing/cdpPen.js`):
  - Before any pen there's no Pencil only tile.
  - Hover (`mouseMoved`, `buttons: 0`) over the sheet: `.nib-ring` shows, centered on the pen, its width within 2px of the rail's `aria-valuenow` × 0.71 (Normal at `MID_PRESSURE`) × the sheet's CSS width ÷ the frame's width in units (374 in portrait). With Pen pressure on Off it's the full size. A press hides it; release and hover bring it back; hovering over the tool strip hides it. Capture `nib-ring-820x1180.png` while it shows.
  - The first pen stroke brings the tile, `aria-pressed="true"`, and a trusted touch stroke then adds no step. A tap on the tile turns it off, and a touch stroke draws. After a reload the tile is there and still off, and a pen stroke leaves it off. Capture `pencil-only-tile-820x1180.png`.
  - Pressure: a pen stroke with force rising 0.1 to 1 keeps widths that rise along it (`keptDrawing`'s width range); one with force fixed at 0.5 from a fresh page draws by speed (a fast and a slow stroke differ).
  - Prediction: log the `getPredictedEvents().length` the page sees on pen moves. Where it's above 0, `.ink-prediction` has painted pixels between moves and none a frame after release, and the kept stroke ends where the pen lifted.
  - WebKit too, with synthetic `PointerEvent`s dispatched on the sheet (`~/.cache/drawing-app-ipad/scripts/drawing/penPipeline.js`): `pointerType: "pen"` with varying `pressure`, `buttons: 0` for hover, and `predictedEvents: [...]` in a move's init. The ring shows, widths follow the pressure, and the overlay paints and wipes.
- [ ] **Step 6: Palms.** WebKit (synthetic events with `width`/`height`) and Chromium (trusted touches with `radiusX`/`radiusY` 60, logging the `width` the page sees): two pen strokes, a palm held down for 1s, then a two-finger tap → one step undone, for a palm 120 wide and for one 20 wide. A palm-sized touch stroke alone leaves no step and no ink.
- [ ] **Step 7: Settings' Drawing group,** on your cork back (the name button, then a tap on Settings' title to bring it in), in WebKit and Chromium:
  - At 390×844 with no pen yet: Drawing hand alone, and the fine print. After a pen stroke on the drawing screen at 820×1180: Pencil only, Pen pressure and Try it. The card is as wide as at 390×844 (the board plan's cork back keeps its size). Capture `drawing-settings-<w>x<h>.png`, in English and in Japanese (`localStorage["draw.language"] = "ja"`).
  - Touch: tap Left (the drawing screen's `data-hand` turns `left`), tap Light. Pencil: a CDP pen tap on Firm. Keyboard: Tab to the pressure choices; ArrowLeft and ArrowRight move the choice and its Seal Yellow label; Home and End reach Off and Firm. Trackpad: mouse clicks on each control, and a mouse drag on Try it draws.
  - Try it: CDP pen strokes with force rising 0.1 to 1 under Light, Normal and Firm; measure the ink's height at the stroke's start and end (alpha rows in a column of the strip's canvas): wider at the start under Light than under Firm, and one steady width under Off. With Pencil only on, a trusted touch stroke leaves the strip blank. 3s after the last stroke the canvas carries `is-fading` and then clears; with `reducedMotion: "reduce"` it clears with no `is-fading`. Drawing on it never swings the paper (no animation on `.settings-note > .stat-board__paper` after a pointerdown on the strip) nor shows the developer slip. Capture `try-it-820x1180.png` mid-stroke.
  - The accessibility tree (`page.locator(".settings-note").ariaSnapshot()`): the Drawing group, a radio group "Pen pressure" with four radios, the Pencil only switch; nothing of Try it.
- [ ] **Step 8: Keys.** Tap the check once (`page.touchscreen.tap` at its center) and press Escape: its `aria-label` reads "Seal: tap twice" again.
- [ ] **Step 9: The recorder, Chromium.** An init script sets `localStorage["draw.performanceRecorder"] = "on"`; CDP `Emulation.setCPUThrottlingRate` at 8. Draw a closed shape, fill outside it, undo. `page.evaluate(async () => (await import("/src/performance/performanceRecorder.ts")).readPerformanceRecording()?.slowFrames.flatMap((f) => Object.keys(f.ours)))` includes `ink fill` and `ink replay`.
- [ ] **Step 10: Sealing still plays.** At 1180×820, both hands: one stroke, the check tapped twice; the ceremony cuts round the ink on the sheet and the sealed card comes up. Capture `seal-<hand>-1180x820.png`.
- [ ] **Step 11:** Fix what the checks find in one batch and run them once more; stop both servers and delete `vite.ipad-drawing.config.ts`. Commit any fixes: `fix(frontend): the drawing screen and its settings hold at every checked size`.

### Task 16: Docs

**Files:** Modify `DESIGN.md`, `PRODUCT.md`

This plan updates the sentences its own work makes false (the spec's docs rule, which ad0ll's sign-off covers); the size-class overview in DESIGN.md's Layout is the finish's.

- [ ] **Step 1: DESIGN.md's Draw screen.**
  - **Tools:** append "Once a pen has drawn on the device, Pencil only leads the strip past a hairline: pen-nib, an Ink tile with the fill icon while on. The device's first pen stroke turns it on; after that only the tile or Settings changes it. On, fingers only tap, to undo and redo."
  - **Color sheet:** append "At a short height it stops at 42% and drops its heading. In a regular window it opens as a popover under the tool strip instead, 360px wide, so the drawing stays in view."
  - **Size rail:** "the left edge" becomes "the edge opposite the drawing hand; in a regular window it stands taller in that edge's column". The drawing sheet plan already rewrote this bullet's number ("in the sheet's px, a 390 px phone's") and added the **Sheet** bullet above it; keep both.
  - **Foot:** "flat undo and redo at the bottom left, the seal check at the bottom right" becomes "flat undo and redo at the foot of the rail's edge, the seal check at the other; in a regular window both stack under the rail, the check at the column's foot".
  - **Paused hint:** after "arrow-bend-left-up (bold, 28px)" add "(arrow-bend-right-up for a left hand)".
  - New after Size rail: "**Pencil hover:** a hovering Pencil shows a ring at its nib as wide as a mid-pressure stroke, in the brush's color with a thin white edge, or an Ink line for the eraser. It never draws, and goes on contact."
  - And: "**Drawing hand:** Left mirrors the screen: the rail, undo and redo, the check and its chip go right, the tool strip to the top left and the timer to the top right."
- [ ] **Step 2: DESIGN.md's cork back, Settings:** append "Under them, Drawing: Drawing hand's radio rows (Right, Left), and once a pen has drawn on the device, Pencil only's switch and Pen pressure's four choices (Off, Light, Normal, Firm) as sliding tabs with a Seal Yellow label, over Try it, a strip of drawing paper where the pen tries the choice in Ink, which fades. Fine print says they're kept on this device; they change drawing at once and restart nothing."
- [ ] **Step 3: PRODUCT.md's Operating Context.** Tools: "The brush follows pen pressure, or speed under a finger." becomes "The brush follows pen pressure, through the response chosen in Settings (Off, Light, Normal, Firm), or speed under a finger or a pen that reports no pressure." and after "with undo and redo buttons too." add "Once a pen draws on a device, fingers stop drawing there (Pencil only), and a tile in the tool strip, or Settings, turns that off." The stat board: "with Language and Show 18+ stickers" becomes "with Language, Show 18+ stickers and Drawing (the drawing hand, and on a device a pen has drawn on, Pencil only and pen pressure)".
- [ ] **Step 4:** Commit: `docs: the drawing screen's Pencil only, hover ring, drawing hand and pen pressure`

### Task 17: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, format and the Move tests all pass.
- [ ] **Step 2:** Squash the branch into representative commits with no AI attribution lines: `feat(frontend): Pencil only, pen pressure, a hover ring, prediction, palm rules and light starts`, `feat(frontend): Settings' Drawing group, with a strip to try the pen`, `feat(frontend): the regular drawing screen, a drawing hand that mirrors it, and short heights`, `docs: the drawing screen's Pencil only, hover ring, drawing hand and pen pressure`.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push.
- [ ] **Step 4:** Tick this plan's boxes on main, and leave this plan and the spec in place: the finish deletes them. Remove the worktree and the branch, and delete `~/.cache/drawing-app-ipad/drawing-screen/` once ad0ll has the captures.
- [ ] **Step 5:** Tell the coordinator what only an iPad settles for this plan, for the LINE sheet plan's device session:
  - palm contact widths (`PALM_CONTACT_PX` in `canvas/gestures.ts`), and whether a palm down first blocks the Pencil;
  - how Light, Normal and Firm feel with a real Pencil, on the drawing screen and on Try it (`PRESSURE_EXPONENTS` in `canvas/brush.ts`);
  - a Pencil (USB-C), whose pressure doesn't change: it should draw by speed under Light, Normal and Firm, and steadily under Off;
  - hover in LINE and in Safari; predicted points per move; and the prediction overlay's memory.
