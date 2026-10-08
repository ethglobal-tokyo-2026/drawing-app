# iPad: Apple Pencil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a device where an Apple Pencil has drawn, the drawing screen takes Pencil only or Pencil and finger (a default in Settings' Drawing group, a quick switch on the drawing screen), pen pressure follows Off, Light, Normal or Firm with a strip to try it, a hovering Pencil shows a ring where it will land, prediction paints a guess ahead of the nib, and resting palms, heavy starts and flat-pressure pens behave.

**Architecture:** Two device settings join `sticker-creation/drawingSettings.ts`: the input mode (null until a pen first draws on the device, which sets Pencil only) and the pen pressure. The drawing screen hands the ink engine the sheet's input mode (the Pencil only tile's choice for this sheet, else the default) and the pen pressure. The engine replaces its private pen latch with the input mode, judges palms in the tap recognizer, starts a pen stroke at its first sample's width once the page's pen has shown pressure moving, reports a hovering pen as a ring DrawingCanvas places on the paper, and paints `getPredictedEvents()` on an overlay canvas for one frame. `stat-board/PencilSettings.tsx` adds the Input and Pen pressure rows and the Try it strip to the Drawing group. The performance recorder times the ink's work and sums up each kind of pointer, for the device session.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, Canvas 2D, Pointer Events (coalesced, predicted, hover), the i18n catalog, Playwright (`apps/frontend/e2e/`, Chromium with CDP pen and touch input; a WebKit scratch script).

---

## Decisions

ad0ll's (2026-10-08), with the values this plan picks. Values marked _unverified guess_ wait for the device session.

1. **Input mode:** Pencil only (`pencilOnly`: fingers only tap, two to undo, three to redo) or Pencil and finger (`pencilAndFinger`: fingers draw too, and tap the same).
   - **Default:** Settings' Drawing group, kept on the device (`draw.inputMode`). Nothing is kept until a pen first touches the sheet on the device; that keeps Pencil only, as today's hidden pen latch does for a page. From then only the person changes it.
   - **Quick switch:** a Pencil only tile leading the tool strip past a hairline (Phosphor's pen-nib; pressed, reversed out of Ink, for Pencil only). A tap switches this sheet only; a fresh sheet, or a reload, starts from the default.
   - Neither shows before a pen has drawn on the device, so phones never see them.
2. **Pen pressure** (`draw.penPressure`, Normal when nothing is kept): a pen's width as a share of the brush size is `0.28 + 0.72 × p^e`, `e` 0.5 Light, 0.75 Normal (today's curve), 1.25 Firm (`PRESSURE_EXPONENTS`; Light's and Firm's an _unverified guess_). Off draws the brush's own size, tapering in as every stroke does. The Shop's brush sample keeps Normal.
3. **Settings rows,** under the drawing hand, once a pen has drawn on the device: Input and Pen pressure as choice rows (Language's pattern: the choice at the row's end, the select laid unseen over the row); one supporting note under Input saying each new drawing starts this way and the drawing screen's tile switches it; Try it under Pen pressure, a 64px strip of drawing paper where the pen draws in Ink at 12px with the chosen curve (fingers too, unless the default is Pencil only; a mouse by speed), fading over 600ms once 3s have passed since the last stroke (at once under reduced motion), hidden from screen readers. A choice the device can't keep shows an error line and lasts until Croquis closes.
4. **Flat-pressure pens:** pressure sets a pen's width only once it has moved more than 0.01 within the stroke, or an earlier stroke on the page did; until then the speed model applies, as for a finger. A Pencil (USB-C), which senses no pressure, draws by speed under Light, Normal and Firm, and steady under Off.
5. **Heavy starts:** once the page's pen has shown pressure moving, a stroke starts at its first sample's width, the dot included. Fingers, mice and a page's first pen stroke start as today.
6. **Palms:**
   - On every device, a touch down `YOUNG_MS` (260ms, today's young-stroke bound) or longer when a tap begins rests and counts toward nothing; a tap is judged when its last counted finger lifts.
   - On a device a pen has drawn on, a contact whose longer side is `PALM_CONTACT_PX` (80 CSS px, _unverified guess_) or more never draws or counts, and a finger stroke whose contact spreads to that size is taken back. Before a pen has drawn there, size judges nothing, so a wrong threshold can't stop finger drawing on phones.
7. **Hover ring:** a pen moving with no buttons over the paper shows a ring centered on the nib, as wide as its stroke shows on screen: the brush size × the paper's scale × a middle pressure's width under the curve (Apple's HIG: preview a middle value), or the speed model's middle while the page's pen hasn't shown pressure; the full size under Off and for the eraser; at least 6px. A 1.5px line in the brush color with a 1px white outline; the eraser's in Ink at 45%. None for fill, a mouse or a finger, or on a locked, paused or panel-covered sheet. It goes when the pen lands or leaves the paper, and never draws.
8. **Prediction,** the opposite of Smoothing, which trails the line to steady it: pen brush strokes only. Each frame, the latest move's `getPredictedEvents()` points run through a copy of the lazy brush, so the guess extends the line where the stroke will go, and paint at the stroke's last width on an overlay canvas sized and scaled as the ink is; the next frame wipes them. Never in the op, the history, the kept drawing, the timelapse or the seal. Without `getPredictedEvents` (iPadOS before 18.2), nothing changes. The overlay takes its memory at the first prediction: the ink's backing, 4.2 MP × 4 bytes ≈ 17 MB at `MAX_INK_PIXELS`.
9. **Performance recorder:** the ink's work is timed as `ink paint` (strokes and their prediction), `ink fill`, `ink replay` (undo, redo, take-backs, a frame change's repaint) and `ink snapshot` (commits). The report gains a Pointers section: for each pointer type, contacts, moves, hovering moves, the pressure range, the contact size range, and coalesced and predicted samples a move.

## Depends on

On main before Task 1 (the brief's order: Phase 0, foundations, then `2026-10-08-ipad-drawing.md`, then this plan):

- **Sheet units,** `2026-10-08-ipad-drawing.md`'s port of `spike/ipad-board`'s 609020e0, 5f4c2085, bd02a3b3 and b9caf92b:
  - `canvas/sheetFrame.ts`; on the engine, `fit(area, devicePixelRatio)`, `frame`, `screenToSheet`, and the private `place()` returning `{ left, top, scale }` (CSS px a sheet unit spans) and `origin`.
  - DrawingCanvas's root `.ink-area`, holding the paper `.ink-sheet` (main's `under`, then the ink canvas `.ink-canvas`); its `onFit(scale)`; `InkSurface.setFrame` and `density`.
  - `canvas/inkEngine.test.ts`: `setup()` calls `engine.fit(AREA, 1)`, so test pointers land one CSS px to the unit; `FakeLayer.setFrame`; `paperAt`, `framed`.
- **Settings' Drawing group,** the same plan: a setting kept on the device (expected `ui/deviceSetting.ts`: `deviceSetting(key, { parse, serialize, name })` returning `{ get, set, subscribe }`, where `set` says whether the device kept the value and a refused value holds until the page goes); `sticker-creation/drawingSettings.ts` with the drawing hand; the group's component in `sticker-board/stat-board/`, rendered on your Settings card.
- **Phase 0,** `2026-10-08-small-fixes.md`: Settings' choice row CSS (`settings-note__choice`, `settings-note__picked`, `settings-note__select`) and `settings-note__about`.
- **The e2e suite** (on main since 056d3cfa): `apps/frontend/e2e/helpers.ts` (`signIn`, `openSettings`, `canvas`, `drawKeyName`, `say`), `pnpm --filter frontend test:e2e`.

Where the drawing plan named something differently, use its name: Setup Step 2 finds each. Where a block below shows a line that plan also rewrote, keep its line and apply only this plan's change.

## Files

- Modify `apps/frontend/src/sticker-creation/drawingSettings.ts`, `drawingSettings.test.ts`
- Modify `apps/frontend/src/sticker-creation/canvas/`: `inkEngine.ts`, `inkEngine.test.ts`, `brush.ts`, `brush.test.ts`, `gestures.ts`, `gestures.test.ts`, `lazyBrush.ts`, `DrawingCanvas.tsx`, `DrawingCanvas.css`; create `predictionCanvas.ts`
- Modify `apps/frontend/src/sticker-creation/DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `tools/ToolStrip.tsx`
- Modify `apps/frontend/src/icons/index.tsx` (`PencilOnlyIcon`)
- Create `apps/frontend/src/sticker-board/stat-board/PencilSettings.tsx`, `PencilSettings.test.tsx`, `TryPenPressure.tsx`, `pencil-settings.css`, and `ChoiceRow.tsx` unless the Drawing group has one; one line in the Drawing group's component
- Modify `apps/frontend/src/shop/brushSamples.ts`
- Modify `apps/frontend/src/performance/performanceRecorder.ts`, `performanceRecorder.test.ts`, `performanceReport.ts`, `performanceReport.test.ts`
- Modify `apps/frontend/src/i18n/strings/stickerCreation.ts`, `stickerBoard.ts`; `apps/frontend/src/i18n/glossary.md`
- Create `apps/frontend/e2e/pen.ts`, `apps/frontend/e2e/pencil.e2e.ts`
- Modify `DESIGN.md`, `PRODUCT.md`
- Scratch, never committed: the worktree's gitignored `data/scratch/ipad-pencil/`, and an untracked `apps/frontend/vite.ipad-pencil.config.ts`

## Setup

- [ ] **Step 1: A worktree at main's tip.** Already in a worktree of your own: `git switch -c feat/ipad-pencil main`. Otherwise, from anywhere in the repo: `MAIN=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)") && git -C "$MAIN" worktree add -b feat/ipad-pencil "$MAIN/.claude/worktrees/ipad-pencil" main`. Then `pnpm install` in it. Every command below runs from the worktree's root.
- [ ] **Step 2: The dependencies are in.** Each prints at least one line:

```bash
rg -n "screenToSheet|^  fit\(" apps/frontend/src/sticker-creation/canvas/inkEngine.ts
rg -n "private place\(\)" apps/frontend/src/sticker-creation/canvas/inkEngine.ts
rg -n "ink-area" apps/frontend/src/sticker-creation/canvas/DrawingCanvas.tsx
rg -n "export (function|const) deviceSetting" apps/frontend/src/ui
rg -n "DrawingHand" apps/frontend/src/sticker-creation/drawingSettings.ts
rg -ln "useDrawingHand" apps/frontend/src/sticker-board/stat-board
rg -n "settings-note__choice|settings-note__about" apps/frontend/src/sticker-board/stat-board/settings-note.css
```

If any prints nothing, read `docs/superpowers/plans/2026-10-08-ipad-drawing.md` for the name it used and use that name below. If the sheet units or the Drawing group aren't on main at all, stop and tell the coordinator.

- [ ] **Step 3: A green start.** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board/stat-board src/performance src/shop` → passes, so a later failure is this plan's. Every test run here sets `TZ=Asia/Tokyo`: some date tests on main assume Tokyo.

**UI tasks (3, 6, 7):** before the first edit, read the impeccable skill's `reference/craft-floor.md` and work with `/impeccable adapt` as the lens.

### Task 1: Input mode and pen pressure, kept on the device

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts`, `canvas/brush.ts`, `drawingSettings.ts`, `drawingSettings.test.ts`

- [ ] **Step 1: Write the failing test.** In `drawingSettings.test.ts` (it runs under happy-dom and clears `localStorage` after each test; add either if missing), `keepInputMode`, `penDrew` and `readInputMode` join the import from `./drawingSettings`, and it gains:

```ts
describe("the input mode", () => {
  it("starts every sheet in Pencil only once a pen first draws on this device, and a later pen never undoes the person's choice", () => {
    expect(readInputMode()).toBeNull();
    penDrew();
    expect(readInputMode()).toBe("pencilOnly");
    keepInputMode("pencilAndFinger");
    penDrew();
    expect(readInputMode()).toBe("pencilAndFinger");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/drawingSettings.test.ts` → fails: no `penDrew`.
- [ ] **Step 3: The input modes,** in `canvas/inkEngine.ts` after the constants:

```ts
/** How the sheet takes input: Pencil only, where fingers only tap, or Pencil and finger. */
export const INPUT_MODES = ["pencilOnly", "pencilAndFinger"] as const;
export type InputMode = (typeof INPUT_MODES)[number];
```

- [ ] **Step 4: The pen pressures,** in `canvas/brush.ts` after `sizePx`:

```ts
/** How a pen's pressure sets its width: not at all (Off), or along a light, normal or firm curve. */
export const PEN_PRESSURES = ["off", "light", "normal", "firm"] as const;
export type PenPressure = (typeof PEN_PRESSURES)[number];
```

- [ ] **Step 5: The settings,** in `drawingSettings.ts`. Imports gain `INPUT_MODES` and `type InputMode` from `./canvas/inkEngine`, and `PEN_PRESSURES` and `type PenPressure` from `./canvas/brush`; after the drawing hand's exports:

```ts
/** The input each sheet starts in; null until a pen has drawn on this device. */
const inputMode = deviceSetting<InputMode | null>("draw.inputMode", {
  parse: (text) => INPUT_MODES.find((mode) => mode === text) ?? null,
  serialize: (mode) => mode,
  name: "The input mode",
});

/** How a pen's pressure sets its width, Normal until chosen. */
const penPressure = deviceSetting<PenPressure>("draw.penPressure", {
  parse: (text) => PEN_PRESSURES.find((each) => each === text) ?? "normal",
  serialize: (value) => (value === "normal" ? null : value),
  name: "The pen pressure",
});

/** Settings' default input for each sheet; null before a pen has drawn on this device. */
export const useInputMode = (): InputMode | null =>
  useSyncExternalStore(inputMode.subscribe, inputMode.get);
export const readInputMode = inputMode.get;
export const keepInputMode = (mode: InputMode): boolean => inputMode.set(mode);
/** A pen drew on the sheet: the first time on this device, every sheet starts in Pencil only. */
export function penDrew(): void {
  if (inputMode.get() === null) inputMode.set("pencilOnly");
}

export const usePenPressure = (): PenPressure =>
  useSyncExternalStore(penPressure.subscribe, penPressure.get);
export const readPenPressure = penPressure.get;
export const keepPenPressure = (value: PenPressure): boolean => penPressure.set(value);
```

(`useSyncExternalStore` from `react`, as the drawing hand's hook imports it.)

- [ ] **Step 6:** Run the same test and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): the input mode and pen pressure, kept on the device`

### Task 2: The input mode replaces the hidden pen latch

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`, `apps/frontend/src/sticker-creation/DrawingScreen.tsx`

- [ ] **Step 1: Write the failing test.** In `canvas/inkEngine.test.ts`, `SETTINGS` gains `inputMode: null,` (a device no pen has drawn on) and `setup()`'s `events` gains `onPen: vi.fn(),`. The test "stops fingers drawing once a pen has, while they still tap" becomes:

```ts
it("lets fingers draw in Pencil and finger, only tap in Pencil only, and tells of every pen", () => {
  const { engine, stroke, tap, committed, events } = setup({ inputMode: "pencilAndFinger" });
  stroke("pen", 1, [0, 0], [100, 0]);
  expect(events.onPen).toHaveBeenCalledOnce();
  stroke("touch", 2, [0, 50], [100, 50], 1000);
  expect(committed()).toHaveLength(2);
  engine.settings = { ...engine.settings, inputMode: "pencilOnly" };
  stroke("touch", 3, [0, 100], [100, 100], 2000);
  expect(committed()).toHaveLength(2);
  tap(2, 3000);
  expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/inkEngine.test.ts` → fails: `onPen` is never called, and the pen latch stops the second finger stroke.
- [ ] **Step 3: The engine.** In `inkEngine.ts`, `InkSettings` gains, after `armed`:

```ts
/**
 * Pencil only: fingers tap, to undo and redo, and never draw. Pencil and finger: both draw. Null on
 * a device no pen has drawn on: fingers draw, and no contact is judged a palm by its size.
 */
inputMode: InputMode | null;
```

`InkEvents` gains, after `onDisarm`:

```ts
  /** A pen touched the sheet. */
  onPen: () => void;
```

Delete `private penSeen = false;`. In `down()`, `this.penSeen = true;` becomes `this.events.onPen();`, and `if (pointerType === "touch" && this.penSeen) return;` becomes `if (pointerType === "touch" && s.inputMode === "pencilOnly") return;`. The class comment's last sentence becomes "In Pencil only, fingers only tap; in either mode, a finger stroke a pen interrupts was a resting palm."

- [ ] **Step 4: DrawingCanvas passes it on.** In `canvas/DrawingCanvas.tsx`, `const onPen = useEffectEvent(events.onPen);` beside the other events, and the engine's events gain `onPen: () => onPen(),`.
- [ ] **Step 5: The drawing screen.** In `DrawingScreen.tsx`, `penDrew` and `useInputMode` join the import from `./drawingSettings`, and beside the drawing hand's hook:

```ts
// The input each sheet starts in, from Settings; null before a pen has drawn on this device.
const defaultInputMode = useInputMode();
```

DrawingCanvas's `settings` gain `inputMode: defaultInputMode,`, and the element takes `onPen={penDrew}`.

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): the input mode replaces the hidden pen latch`

### Task 3: The Pencil only tile switches the sheet's input

**Files:** Modify `apps/frontend/src/sticker-creation/tools/ToolStrip.tsx`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `apps/frontend/src/icons/index.tsx`, `apps/frontend/src/i18n/strings/stickerCreation.ts`

UI task; Task 11 checks the tile in the browser.

- [ ] **Step 1: Write the failing test.** In `DrawingScreen.test.tsx`: `penDrew` and `readInputMode` are imported from `./drawingSettings`, and `type InputMode` beside `type HistoryState` from `./canvas/inkEngine`. `sheetCalls.settings`'s type, and the DrawingCanvas mock's `settings` prop type, gain `inputMode: InputMode | null`. The ToolStrip mock takes the tile's props too, and renders it after its other tiles (`…` is the mock as it stands):

```tsx
vi.mock("./tools/ToolStrip", () => ({
  ToolStrip: ({
    …,
    inputMode,
    onInputMode,
  }: {
    …;
    inputMode: InputMode | null;
    onInputMode: (mode: InputMode) => void;
  }) => (
    <>
      …
      {inputMode && (
        <button
          type="button"
          className="input-tile"
          aria-pressed={inputMode === "pencilOnly"}
          onClick={() => onInputMode(inputMode === "pencilOnly" ? "pencilAndFinger" : "pencilOnly")}
        />
      )}
    </>
  ),
}));
```

Then:

```tsx
describe("the input mode", () => {
  const inputTile = () => document.querySelector<HTMLButtonElement>(".input-tile");

  it("starts each sheet in Settings' default once a pen has drawn here, and the tile switches this sheet alone", async () => {
    reopen(keptHalfway, {}, TEST_ME, { spendTicket: () => Promise.resolve(spentDaily(false)) });
    await settle();
    expect(inputTile()).toBeNull();
    expect(sheetCalls.settings?.inputMode).toBeNull();

    act(() => penDrew());
    expect(inputTile()?.getAttribute("aria-pressed")).toBe("true");
    expect(sheetCalls.settings?.inputMode).toBe("pencilOnly");

    act(() => inputTile()?.click());
    expect(sheetCalls.settings?.inputMode).toBe("pencilAndFinger");
    expect(readInputMode()).toBe("pencilOnly");

    act(() => drawingScreen.current?.startNewSticker());
    await settle();
    expect(sheetCalls.settings?.inputMode).toBe("pencilOnly");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/DrawingScreen.test.tsx` → fails: the tool strip is given no input mode, so no tile shows.
- [ ] **Step 3: The icon.** `icons/index.tsx`: `PenNib` joins the import from `@phosphor-icons/react`, and after `ClearSheetIcon`:

```tsx
/** Pencil only: the drawing screen's tile that switches the sheet between Pencil only and Pencil and finger. */
export const PencilOnlyIcon = (props: IconProps) => (
  <PenNib aria-hidden focusable="false" {...props} />
);
```

- [ ] **Step 4: The string.** `stickerCreation.ts`, in `tools` after `clear`:

```ts
    /** Drawing screen, tool strip: the Pencil only tile at its start, shown once a pen has drawn on this device, named for screen readers; pressed, only the pen draws on this sheet and fingers tap to undo and redo */
    pencilOnly: { en: "Pencil only", ja: "ペンのみ" },
```

- [ ] **Step 5: The tile.** `tools/ToolStrip.tsx`: `PencilOnlyIcon` joins the icons import; `import type { InputMode } from "../canvas/inkEngine";`; after `CLEAR_TILE`, `const INPUT_TILE = TOOLS.length + 3;`. `Props` gains:

```ts
  /** The sheet's input mode, or null before a pen has drawn on this device, when there's no tile. */
  inputMode: InputMode | null;
  /** The tile switches the sheet between Pencil only and Pencil and finger. */
  onInputMode: (mode: InputMode) => void;
```

Destructure both, and open the strip with the tile, before `TOOLS.map` (`…` is the code as it stands):

```tsx
    <div className="tool-strip" role="toolbar" …>
      {inputMode && (
        <>
          <button
            {...tile(INPUT_TILE)}
            className="tool-tile"
            aria-label={t(($) => $.stickerCreation.tools.pencilOnly)}
            aria-pressed={inputMode === "pencilOnly"}
            onClick={() =>
              onInputMode(inputMode === "pencilOnly" ? "pencilAndFinger" : "pencilOnly")
            }
          >
            <PencilOnlyIcon size={22} weight={inputMode === "pencilOnly" ? "fill" : "bold"} />
          </button>
          {/* How the sheet takes input isn't a drawing tool: a hairline sets the tile apart. */}
          <span className="tool-rule" aria-hidden="true" />
        </>
      )}
      {TOOLS.map(…)}
```

The component's comment gains: "Once a pen has drawn on the device, the Pencil only tile leads the strip past a rule."

- [ ] **Step 6: The sheet's choice.** In `DrawingScreen.tsx`, `type InputMode` joins the import from `./canvas/inkEngine`, and Task 2's `defaultInputMode` line is followed by:

```ts
// The Pencil only tile's choice for this sheet; a fresh sheet starts in the default again.
const [sheetInputMode, setSheetInputMode] = useState<InputMode | null>(null);
const inputMode = defaultInputMode === null ? null : (sheetInputMode ?? defaultInputMode);
```

In `run`'s `"reset-sheet"` case, `setSheetInputMode(null);` after `setPanel(null);`. DrawingCanvas's `settings` take `inputMode,` in place of `inputMode: defaultInputMode,`. ToolStrip takes `inputMode={inputMode}` and `onInputMode={setSheetInputMode}`.

- [ ] **Step 7:** Run the drawing screen's tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 8:** Commit: `feat(frontend): a Pencil only tile switches the sheet's input, which starts from Settings' default`

### Task 4: Palms never draw or hold up a tap

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
it("judges a palm-sized touch a palm on a device a pen has drawn on: it never draws, and a finger's stroke that spreads into one is taken back", () => {
  /** One touch stroke, palm-sized from where it lands, or once it has moved with `spreads`. */
  const touchStroke = (sheet: ReturnType<typeof setup>, spreads = false) => {
    const contact = (input: PointerInput, landing: boolean) =>
      spreads && landing ? input : palmSized(input);
    sheet.engine.down(contact(sheet.at("touch", 1, 0, 50, 0), true));
    sheet.engine.move(contact(sheet.at("touch", 1, 30, 50, 16), false));
    sheet.runFrame();
    sheet.engine.up(contact(sheet.at("touch", 1, 40, 50, 32), false));
    return sheet.committed();
  };
  // No pen has drawn on a phone, so size judges nothing there.
  expect(touchStroke(setup())).toHaveLength(1);
  for (const spreads of [false, true])
    expect(touchStroke(setup({ inputMode: "pencilAndFinger" }), spreads)).toEqual([]);
});

it("undoes on a two-finger tap while a palm rests on the sheet, whatever its size", () => {
  for (const size of [FINGERTIP, PALM_CONTACT_PX]) {
    const { engine, at, stroke, tap, events } = setup({ inputMode: "pencilOnly" });
    stroke("pen", 1, [0, 0], [100, 0]);
    stroke("pen", 2, [0, 20], [100, 20], 500);
    engine.down({ ...at("touch", 90, 300, 600, 1000), width: size, height: size });
    tap(2, 1000 + YOUNG_MS);
    expect(events.onHistory).toHaveBeenLastCalledWith(state(true, true));
  }
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas` → fails: no `YOUNG_MS` or `PALM_CONTACT_PX` export, a palm draws, and the resting palm holds the tap up.
- [ ] **Step 3: The recognizer.** `gestures.ts` becomes:

```ts
/** Every finger must lift within this long of the gesture's start… */
const TAP_MS = 420;
/** …each having moved less than this many CSS px. */
const TAP_SLOP = 14;
/**
 * A stroke younger and shorter than this when a second finger lands was the start of a tap. A touch
 * down this long when a tap begins was there before it, and rests.
 */
export const YOUNG_MS = 260;
const YOUNG_PX = 26;
/** A contact this wide on its longer side, in CSS px, is a palm, never a fingertip. */
export const PALM_CONTACT_PX = 80;

/** Whether a contact this size, in CSS px, is a palm. */
export const isPalm = (width: number, height: number) => Math.max(width, height) >= PALM_CONTACT_PX;

/** What a touch that just landed should do. */
export type TouchDown =
  /** Draw with it: it's the only finger down. */
  | "draw"
  /** Take back the first finger's stroke; the fingers are tapping. */
  | "cancel-stroke"
  /** Nothing yet: it's part of a tap. */
  | "gesture"
  /** Nothing: a palm, or a finger resting on the sheet while another draws. */
  | "ignore";

export type TapGesture = "undo" | "redo";

/** The stroke the first finger is drawing, if any, as a second one lands. */
interface LiveStroke {
  /** ms since it began. */
  age: number;
  /** CSS px from where it began. */
  moved: number;
}

/** Where and when a touch landed, and whether it rests: a resting touch counts toward no tap. */
interface HeldTouch {
  x0: number;
  y0: number;
  t0: number;
  resting: boolean;
}

/**
 * Multi-finger taps, fed touch pointers only: two fingers undo, three or more redo. A palm-sized
 * contact, or a touch already down when a tap begins, rests and counts toward nothing, so a palm on
 * the sheet never holds a tap up. A finger that lands while another is well into a stroke is ignored.
 */
export class TapRecognizer {
  private readonly touches = new Map<number, HeldTouch>();
  private gesture: { t0: number; fingers: number; moved: number } | null = null;

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

  /** Whether this finger is down, as far as the recognizer has heard. */
  holds(id: number): boolean {
    return this.touches.has(id);
  }

  /** Forgets every finger and any tap in progress; returns the fingers it held. */
  clear(): number[] {
    const ids = [...this.touches.keys()];
    this.touches.clear();
    this.gesture = null;
    return ids;
  }

  /** The gesture the last counted finger's lift completes, if any. */
  up(id: number, t: number): TapGesture | null {
    this.touches.delete(id);
    const gesture = this.gesture;
    if (!gesture || this.fingers() > 0) return null;
    this.gesture = null;
    if (t - gesture.t0 >= TAP_MS || gesture.moved >= TAP_SLOP) return null;
    if (gesture.fingers === 2) return "undo";
    return gesture.fingers >= 3 ? "redo" : null;
  }

  /** The browser took the touch (a scroll or a system gesture): no tap. */
  cancel(id: number): void {
    this.touches.delete(id);
    if (!this.gesture) return;
    this.gesture.moved = Infinity;
    if (this.fingers() === 0) this.gesture = null;
  }

  /** Touches down that count toward a tap. */
  private fingers(): number {
    let count = 0;
    for (const touch of this.touches.values()) if (!touch.resting) count++;
    return count;
  }
}
```

- [ ] **Step 4: The engine.** In `inkEngine.ts`, `import { isPalm, TapRecognizer } from "./gestures";`. `PointerInput` gains, after `pressure`:

```ts
/** The contact's size in CSS px: a palm's is far wider than a fingertip's. */
width: number;
height: number;
```

In `down()`, `this.taps.down(…)` gains a sixth argument, `this.palmContact(e)`. In `move()`, `if (e.pointerType === "touch") this.taps.move(id, e.clientX, e.clientY);` becomes:

```ts
if (e.pointerType === "touch") {
  const palm = this.palmContact(e);
  this.taps.move(id, e.clientX, e.clientY, palm);
  // A fingertip that spreads into a palm as it settles never meant its stroke.
  if (palm && this.live?.id === id) {
    this.endStroke(true);
    this.swallowed.add(id);
    return;
  }
}
```

After `toSheet`:

```ts
  /** A palm-sized contact, judged only on a device a pen has drawn on: before that, size rules nothing. */
  private palmContact(e: PointerInput): boolean {
    return this.settings.inputMode !== null && isPalm(e.width, e.height);
  }
```

- [ ] **Step 5:** Run the canvas tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `fix(frontend): a resting palm no longer holds up two-finger undo, and a palm never draws once a pen has`

### Task 5: Pen pressure: four curves, light starts, flat pressure

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/brush.ts`, `brush.test.ts`, `inkEngine.ts`, `inkEngine.test.ts`, `apps/frontend/src/sticker-creation/DrawingScreen.tsx`, `apps/frontend/src/shop/brushSamples.ts`

- [ ] **Step 1: Write the failing tests.** In `brush.test.ts`, `type PenPressure` joins the `./brush` import, and `start` and `widths` give way to:

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

interface Drawn {
  /** One pressure for every point, or each point's by its index. */
  pressure?: number | ((i: number) => number);
  pointer?: string;
  ms?: number;
  tool?: "brush" | "eraser";
  /** The pen has shown its pressure moving before this stroke. */
  pressureVaries?: boolean;
  response?: PenPressure;
}

/** Widths as fractions of the brush size, after adding `n` points 10px apart, `ms` apart. */
function widths(n: number, drawn: Drawn = {}): number[] {
  const {
    pressure = 0.5,
    pointer = "mouse",
    ms = 16,
    tool = "brush",
    pressureVaries = true,
    response = "normal",
  } = drawn;
  const pressed = (i: number) => (typeof pressure === "number" ? pressure : pressure(i));
  const stroke = builder({
    tool,
    pressure: pressed(0),
    pointerType: pointer,
    pressureVaries,
    response,
  });
  for (let i = 1; i <= n; i++) stroke.add(i * 10, 0, pressed(i), i * ms);
  const { pts } = stroke.op;
  return Array.from({ length: pts.length / STRIDE }, (_, i) => pts[i * STRIDE + 2] / SIZE);
}
```

The skip test builds its stroke with `builder()`, and its adds drop the pointer type: `stroke.add(0.3, 0.3, 0.5, 16)` and `stroke.add(0.6, 0, 0.5, 32)`. The other tests stay as they are. Add, inside `describe("StrokeBuilder")`:

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
  expect(last(widths(40, { ...moving, pressure: (i) => (i < 5 ? 0.5 : 1) }))).toBeCloseTo(
    last(widths(40, { pointer: "pen", ms: 0.5, pressure: 1 })),
  );
});

it("draws wider at one pressure under Light than Normal, and Normal than Firm, and the brush's own size under Off", () => {
  const at = (response: PenPressure) =>
    last(widths(40, { pointer: "pen", pressure: 0.3, response }));
  expect(at("light")).toBeGreaterThan(at("normal"));
  expect(at("normal")).toBeGreaterThan(at("firm"));
  const off = (pressure: Drawn["pressure"], ms: number, pressureVaries: boolean) =>
    widths(40, { pointer: "pen", pressure, ms, pressureVaries, response: "off" });
  expect(off((i) => i / 40, 0.5, true)).toEqual(off(0.5, 1000, false));
  expect(last(off(0.5, 1000, false))).toBe(1);
});
```

In `inkEngine.test.ts`: `SETTINGS` gains `penPressure: "normal",`. `at` gains a sixth parameter, `pressure = pointerType === "pen" ? 0.6 : 0`, and its `pressure: pointerType === "pen" ? 0.6 : 0,` becomes `pressure,`. `stroke` gains a sixth parameter, `pressure?: (step: number) => number`, passing `pressure?.(0)` to the down's `at`, `pressure?.(i)` to each move's and `pressure?.(steps)` to the up's; its comment ends "; a pen presses `pressure(step)` at each". Then:

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

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas` → fails: the builder takes no curve, takes a pointer type per point, and starts every stroke at full width.
- [ ] **Step 3: The model.** `brush.ts` becomes (Task 1's pressures kept):

```ts
import { clamp } from "../../ui/easing";
import { STRIDE, type StrokeOp } from "./ops";

/**
 * The size rail's value (0–1) as a width in sheet units, the px the rail shows, squared so the
 * fine sizes get most of the travel.
 */
export const sizePx = (value: number) => 1.5 + 46.5 * value * value;

/** How a pen's pressure sets its width: not at all (Off), or along a light, normal or firm curve. */
export const PEN_PRESSURES = ["off", "light", "normal", "firm"] as const;
export type PenPressure = (typeof PEN_PRESSURES)[number];

/** Points closer than this many sheet units to the last one add cost and nothing else. */
const MIN_STEP = 0.5;
/** A stroke starts as a dot this fraction of its first width, then widens by `TAPER_STEP` a point. */
const FIRST_DOT = 0.6;
const TAPER_STEP = 0.08;
/**
 * Each curve's exponent on the pressure: under 1 a light touch already draws wide, over 1 full width
 * takes more force. Normal is the curve a pen has always had.
 */
const PRESSURE_EXPONENTS = {
  light: 0.5,
  normal: 0.75,
  firm: 1.25,
} as const satisfies Record<Exclude<PenPressure, "off">, number>;
/** A pen pressed halfway: what the hover ring previews, as Apple's guidance asks of a preview. */
const MID_PRESSURE = 0.5;
/** A pen's pressure moving less than this within a stroke is a pen that senses none. */
const PRESSURE_STEP = 0.01;
/** Touch, mouse and a pen with no pressure draw between these fractions of the size: thin when quick. */
const SPEED_WIDTHS = { fast: 0.68, slow: 1.1 } as const;

/** How wide a pen draws at this pressure under `response`, as a fraction of the size; Off is the size. */
const pressureWidth = (pressure: number, response: PenPressure) =>
  response === "off" ? 1 : 0.28 + 0.72 * pressure ** PRESSURE_EXPONENTS[response];
/** Touch, mouse and a pen with no pressure: a quick flick draws thinner, the way ink runs thin. */
const speedWidth = (speed: number) =>
  clamp(1.12 - 0.15 * speed, SPEED_WIDTHS.fast, SPEED_WIDTHS.slow);

/**
 * How wide a pen's mark will be before it lands, as a fraction of the size: a middle pressure under
 * its curve, or the speed model's middle for a pen not known to sense pressure. Off is the size.
 */
export const previewWidth = (response: PenPressure, pressureVaries: boolean) =>
  response === "off"
    ? 1
    : pressureVaries
      ? pressureWidth(MID_PRESSURE, response)
      : (SPEED_WIDTHS.fast + SPEED_WIDTHS.slow) / 2;

interface StrokeStart {
  tool: StrokeOp["tool"];
  color: string;
  /** Width in sheet units. */
  size: number;
  x: number;
  y: number;
  /** When the first point landed, in ms. */
  t: number;
  /** ms into the session. */
  T: number;
  /** The first sample's pressure, and the pointer drawing. */
  pressure: number;
  pointerType: string;
  /** This pen has shown its pressure moving before, so pressure sets the width from the first sample. */
  pressureVaries: boolean;
  /** How a pen's pressure sets its width; a finger or a mouse goes by speed whatever it is. */
  response: PenPressure;
}

/**
 * Builds a stroke point by point. A brush's width follows a pen's pressure through its curve, or the
 * speed for touch, mouse and a pen whose pressure never moves, smoothed so it never jumps, and tapers
 * in from a dot. It starts from the first sample's width, so a light start stays light. The eraser
 * keeps one width, and so does a pen with its pressure Off.
 */
export class StrokeBuilder {
  readonly op: StrokeOp;
  private readonly size: number;
  private readonly t0: number;
  private lastT: number;
  private readonly pen: boolean;
  private readonly response: PenPressure;
  private readonly firstPressure: number;
  /** Pressure sets the width: this pen has shown its pressure moving, in this stroke or before. */
  private pressed: boolean;
  private smoothed: number;

  constructor(start: StrokeStart) {
    const { tool, color, size, x, y, t, T, pressure, pointerType, pressureVaries, response } =
      start;
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

  get count(): number {
    return this.op.pts.length / STRIDE;
  }

  /** Whether pressure set this stroke's width: its pen senses pressure. */
  get pressured(): boolean {
    return this.pressed;
  }

  /** Adds a point unless it's within half a unit of the last one; says whether it did. */
  add(x: number, y: number, pressure: number, t: number): boolean {
    const { pts, tool } = this.op;
    const n = this.count;
    const dist = Math.hypot(x - pts[(n - 1) * STRIDE], y - pts[(n - 1) * STRIDE + 1]);
    if (dist < MIN_STEP) return false;
    const dt = Math.max(1, t - this.lastT);
    this.lastT = t;
    let width = this.size;
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
    pts.push(x, y, width, Math.round(t - this.t0));
    return true;
  }
}
```

- [ ] **Step 4: The engine.** In `inkEngine.ts`, `import { StrokeBuilder, type PenPressure } from "./brush";`. `InkSettings` gains, after `inputMode`, `/** How a pen's pressure sets its width. */ penPressure: PenPressure;`. After `fingersGone`:

```ts
  /** This page's pen has shown its pressure moving: its strokes start at their first sample's width. */
  private pressurePen = false;
```

`beginStroke`'s `new StrokeBuilder({ … })` gains `pressure: e.pressure, pointerType: e.pointerType, pressureVaries: this.pressurePen, response: s.penPressure,`. In `paintNew`, `builder.add(lazy.x, lazy.y, queue[i + 2], live.pointerType, queue[i + 3])` becomes `builder.add(lazy.x, lazy.y, queue[i + 2], queue[i + 3])`. In `endStroke`, after `this.cancelFrame = null;`:

```ts
// A pen whose pressure moved senses it: its next strokes start at their first sample's width.
if (live.builder.pressured) this.pressurePen = true;
```

and the catch-up's `add` drops `live.pointerType`: `live.builder.add(x, y, live.pressure, (t += CATCH_UP_MS));`.

- [ ] **Step 5: The choice reaches the engine,** and the Shop keeps Normal. `DrawingScreen.tsx`: `usePenPressure` joins the drawing settings import; `const penPressure = usePenPressure();` after the input mode lines; DrawingCanvas's `settings` gain `penPressure,`. `shop/brushSamples.ts`'s `"brush"` case:

```ts
    case "brush": {
      const path = wave(side);
      const [x, y] = path[0];
      // Today's brush as a pen that senses pressure draws it, under the Normal curve.
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
      path.slice(1).forEach(([px, py], i) => {
        const pressure = Math.sin((Math.PI * (i + 1)) / path.length) ** 0.8;
        stroke.add(px, py, pressure, (i + 1) * 12);
      });
      return stroke.op;
    }
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/shop` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): pen pressure follows a chosen curve, starts at the first sample, and a flat-pressure pen follows speed`

### Task 6: Settings: Input, Pen pressure and Try it

**Files:** Create `apps/frontend/src/sticker-board/stat-board/PencilSettings.tsx`, `PencilSettings.test.tsx`, `TryPenPressure.tsx`, `pencil-settings.css`, `ChoiceRow.tsx` (Step 4); modify the Drawing group's component, `apps/frontend/src/i18n/strings/stickerBoard.ts`, `apps/frontend/src/i18n/glossary.md`

UI task. Try it paints on a canvas, which happy-dom can't, so Task 11 checks it in the browser.

- [ ] **Step 1: Write the failing tests,** `PencilSettings.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import {
  keepInputMode,
  keepPenPressure,
  penDrew,
  readInputMode,
  readPenPressure,
} from "../../sticker-creation/drawingSettings";
import { refusingStorage } from "../../ui/testing";
import { PencilSettings } from "./PencilSettings";

const words = stickerBoard.settings.pencil;
let unmount = () => {};
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused value holds until a kept one replaces it, and the next test would see it.
  keepInputMode("pencilOnly");
  keepPenPressure("normal");
  localStorage.clear();
});

function render() {
  const view = renderWithApi(<PencilSettings />);
  unmount = view.unmount;
  return view.host;
}
/** The select laid over the row named `label`. */
function row(host: HTMLElement, label: string) {
  const named = (select: HTMLSelectElement) =>
    document.getElementById(select.getAttribute("aria-labelledby") ?? "")?.textContent;
  const select = [...host.querySelectorAll("select")].find((each) => named(each) === label);
  if (!select) throw new Error(`No row named ${label}`);
  return select;
}
const choose = (select: HTMLSelectElement, value: string) =>
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

describe("Settings' Pencil rows", () => {
  it("show once a pen has drawn on this device, starting from Pencil only and Normal", () => {
    const host = render();
    expect(host.querySelector("select")).toBeNull();
    act(() => penDrew());
    expect(row(host, words.input.title.en).value).toBe("pencilOnly");
    expect(row(host, words.pressure.title.en).value).toBe("normal");
  });

  it("keep each choice on this device at once", () => {
    penDrew();
    const host = render();
    choose(row(host, words.input.title.en), "pencilAndFinger");
    choose(row(host, words.pressure.title.en), "light");
    expect([readInputMode(), readPenPressure()]).toEqual(["pencilAndFinger", "light"]);
  });

  it("say when this device couldn't keep a choice, which still applies until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    penDrew();
    const host = render();
    choose(row(host, words.pressure.title.en), "firm");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(words.notKept.en);
    expect(row(host, words.pressure.title.en).value).toBe("firm");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board/PencilSettings.test.tsx` → fails: no `PencilSettings`.
- [ ] **Step 3: The strings.** `stickerBoard.ts`, in `settings` after the drawing plan's Drawing group strings:

```ts
    /** The Drawing group's Pencil rows, shown once a pen has drawn on this device. */
    pencil: {
      input: {
        /** Settings note, Drawing group: the Input row's name, the input each new drawing starts in */
        title: { en: "Input", ja: "入力" },
        /** Settings note, Drawing group: the Input choice where only the pen draws and fingers tap to undo and redo */
        pencilOnly: { en: "Pencil only", ja: "ペンのみ" },
        /** Settings note, Drawing group: the Input choice where fingers draw as well as the pen */
        pencilAndFinger: { en: "Pencil and finger", ja: "ペンと指" },
        /** Settings note, Drawing group: the note under the Input row: it's how each new drawing starts, and the drawing screen's pen tile switches it */
        about: {
          en: "Each new drawing starts this way. The pen tile on the drawing screen switches it as you draw.",
          ja: "新しくかくたびに、この設定ではじまります。かく画面のペンのボタンで、かいている途中にも切り替えられます。",
        },
      },
      pressure: {
        /** Settings note, Drawing group: the Pen pressure row's name */
        title: { en: "Pen pressure", ja: "筆圧" },
        /** Settings note, Drawing group: the Pen pressure choice where the pen draws the brush's own width */
        off: { en: "Off", ja: "オフ" },
        /** Settings note, Drawing group: the Pen pressure choice where a light touch already draws wide */
        light: { en: "Light", ja: "軽め" },
        /** Settings note, Drawing group: the Pen pressure choice that's the usual curve, the default */
        normal: { en: "Normal", ja: "ふつう" },
        /** Settings note, Drawing group: the Pen pressure choice where full width takes more force */
        firm: { en: "Firm", ja: "強め" },
        /** Settings note, Drawing group: the small print on the strip of paper under Pen pressure, where the pen tries the chosen curve; hidden from screen readers */
        tryIt: { en: "Try it", ja: "ためしがき" },
      },
      /** Settings note, Drawing group: the alert when this device couldn't keep an Input or Pen pressure choice, which still applies until the app closes */
      notKept: {
        en: "This device couldn’t keep that, so it lasts until you close Croquis.",
        ja: "この端末に保存できなかったため、クロッキーを閉じるまでの設定になります。",
      },
    },
```

If the Drawing group already has a not-kept string with these words, use it and leave `pencil.notKept` out. `glossary.md`, rows after "two fingers":

```
| Pencil only / Pencil and finger    | ペンのみ / ペンと指                    | The two inputs: Settings' Input (入力), and the drawing screen's pen tile           |
| pen pressure                       | 筆圧                                   | Off オフ, Light 軽め, Normal ふつう, Firm 強め                                        |
| Try it (under Pen pressure)        | ためしがき                             | In hiragana, as かく is                                                               |
```

- [ ] **Step 4: One choice row.** If the Drawing group renders its drawing hand through a component of Language's row shape (a label, the choice with a caret, the select over the row), use it for the rows below and skip this step. Otherwise create `stat-board/ChoiceRow.tsx`, and move the drawing hand's row onto it in the same commit when it's that markup inline:

```tsx
import { useId } from "react";
import { CaretDown } from "../../icons";

interface Props<T extends string> {
  label: string;
  choices: readonly T[];
  value: T;
  nameOf: (choice: T) => string;
  onChoose: (choice: T) => void;
  /** The id of a note that says more about the setting. */
  describedBy?: string;
}

/**
 * A setting as one row with its choice at the end. The select lies unseen over the whole row, so a
 * tap anywhere on it opens the device's own list of choices.
 */
export function ChoiceRow<T extends string>({
  label,
  choices,
  value,
  nameOf,
  onChoose,
  describedBy,
}: Props<T>) {
  const id = useId();
  return (
    <div className="settings-note__option settings-note__choice">
      <span id={id}>{label}</span>
      <span className="settings-note__picked" aria-hidden>
        <span>{nameOf(value)}</span>
        <CaretDown size={16} weight="bold" />
      </span>
      <select
        className="settings-note__select"
        aria-labelledby={id}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => {
          const picked = choices.find((choice) => choice === event.target.value);
          if (picked) onChoose(picked);
        }}
      >
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {nameOf(choice)}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 5: The rows,** `stat-board/PencilSettings.tsx`:

```tsx
import { useId, useState } from "react";
import { useTranslation } from "../../i18n/react";
import { PEN_PRESSURES } from "../../sticker-creation/canvas/brush";
import { INPUT_MODES } from "../../sticker-creation/canvas/inkEngine";
import {
  keepInputMode,
  keepPenPressure,
  useInputMode,
  usePenPressure,
} from "../../sticker-creation/drawingSettings";
import { ErrorLine } from "../../ui/ErrorLine";
import { ChoiceRow } from "./ChoiceRow";
import { TryPenPressure } from "./TryPenPressure";
import "./pencil-settings.css";

/**
 * The Drawing group's Pencil rows, once a pen has drawn on this device: the input each new drawing
 * starts in, and how the pen's pressure sets its width, with a strip to try it. They're this
 * device's own, so each applies at once; one the device couldn't keep says so and lasts until
 * Croquis closes.
 */
export function PencilSettings() {
  const { t } = useTranslation();
  const id = useId();
  const inputMode = useInputMode();
  const pressure = usePenPressure();
  const [notKept, setNotKept] = useState(false);
  const kept = (done: boolean) => setNotKept(!done);
  // No pen draws on a phone, so a phone shows none of this.
  if (inputMode === null) return null;
  return (
    <>
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.pencil.input.title)}
        choices={INPUT_MODES}
        value={inputMode}
        nameOf={(mode) => t(($) => $.stickerBoard.settings.pencil.input[mode])}
        describedBy={`${id}-input`}
        onChoose={(mode) => kept(keepInputMode(mode))}
      />
      <p className="settings-note__about" id={`${id}-input`}>
        {t(($) => $.stickerBoard.settings.pencil.input.about)}
      </p>
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.pencil.pressure.title)}
        choices={PEN_PRESSURES}
        value={pressure}
        nameOf={(each) => t(($) => $.stickerBoard.settings.pencil.pressure[each])}
        onChoose={(each) => kept(keepPenPressure(each))}
      />
      <TryPenPressure response={pressure} fingersDraw={inputMode === "pencilAndFinger"} />
      {notKept && (
        <ErrorLine className="settings-note__problem">
          {t(($) => $.stickerBoard.settings.pencil.notKept)}
        </ErrorLine>
      )}
    </>
  );
}
```

- [ ] **Step 6: Try it,** `stat-board/TryPenPressure.tsx`:

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
 * Try it: a strip of drawing paper where the pen draws with the chosen pressure curve, so the choice
 * is felt, not guessed. Fingers draw too unless `fingersDraw` is off; a mouse draws by speed. The ink
 * fades a few seconds after the last stroke, or goes at once under reduced motion; nothing is kept.
 * Screen readers skip it.
 */
export function TryPenPressure({
  response,
  fingersDraw,
}: {
  response: PenPressure;
  fingersDraw: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const live = useRef<{ id: number; builder: StrokeBuilder; painted: number } | null>(null);
  // Whether this pen senses pressure, learned as the drawing screen learns it.
  const sensed = useRef(false);
  const fade = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    // The strip takes the whole touch: no scroll, no Scribble or text selection from the Pencil, and
    // the cork never reads it as its pull toward the developer slip.
    const hold = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("touchstart", hold, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    return () => {
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchmove", hold);
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
    // A stroke here isn't a press on the paper around it.
    e.stopPropagation();
    if (live.current || (!fingersDraw && e.pointerType === "touch")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    clearTimeout(fade.current);
    el.classList.remove("is-fading");
    // Sized to the strip at the screen's density, which clears it: what's left would fade anyway.
    const density = devicePixelRatio || 1;
    const [w, h] = [Math.round(el.clientWidth * density), Math.round(el.clientHeight * density)];
    if (el.width !== w || el.height !== h) [el.width, el.height] = [w, h];
    ctx.current ??= context2d(el);
    ctx.current.setTransform(density, 0, 0, density, 0, 0);
    const { x, y } = point(el, e);
    const builder = new StrokeBuilder({
      tool: "brush",
      color: INK,
      size: TRY_SIZE,
      x,
      y,
      t: e.timeStamp,
      T: 0,
      pressure: e.pressure,
      pointerType: e.pointerType,
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
    <div className="try-pen-pressure" aria-hidden="true">
      <canvas
        ref={canvas}
        className="try-pen-pressure__ink"
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
      <span className="try-pen-pressure__label">
        {t(($) => $.stickerBoard.settings.pencil.pressure.tryIt)}
      </span>
    </div>
  );
}
```

`stat-board/pencil-settings.css`:

```css
/* Try it: drawing paper under Pen pressure, where the pen tries the chosen curve. It takes every
   touch, so the cork never scrolls or pulls under it, and offers no text to select. */
.try-pen-pressure {
  position: relative;
  height: 64px;
  margin: 4px 0 8px;
  border-radius: 3px;
  background: var(--canvas);
  box-shadow: inset 0 0 0 1px var(--rule);
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
.try-pen-pressure__ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
.try-pen-pressure__ink.is-fading {
  opacity: 0;
  transition: opacity 600ms var(--ease-out);
}
.try-pen-pressure__label {
  position: absolute;
  top: 6px;
  left: 8px;
  font: 650 var(--fs-fine) / 1 var(--font-ui);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--graphite);
  pointer-events: none;
}
```

- [ ] **Step 7: Into the group.** In the Drawing group's component (Setup Step 2 found it), import `PencilSettings` from `./PencilSettings` and render `<PencilSettings />` right after the drawing hand's row, inside the group's element. Its doc comment gains "Once a pen has drawn on the device, the Pencil rows follow (`PencilSettings`)."
- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board` and `pnpm -C apps/frontend typecheck` → pass. A test that lists the card's rows in Japanese still passes: on a fresh device the Pencil rows render nothing.
- [ ] **Step 9:** Commit: `feat(frontend): Settings' Input and Pen pressure, with a strip to try the pen`

### Task 7: The hover ring

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`, `DrawingCanvas.css`

UI task.

- [ ] **Step 1: Write the failing test.** `inkEngine.test.ts` imports `type HoverRing` beside `type InkLayer`; `setup()`'s `events` gains `onHover: vi.fn<(ring: HoverRing | null) => void>(),`; `at` gains `buttons: 1,` after `button`. Then:

```ts
it("rings where a hovering pen would land, as wide as its stroke on screen, and hides it as the pen lands or leaves", () => {
  const { engine, at, layer, events } = setup({ penPressure: "off" });
  const hover = (pointerType: string, x: number, t: number) =>
    engine.move({ ...at(pointerType, 1, x, 40, t), buttons: 0 });
  const ring = () => events.onHover.mock.lastCall?.[0];
  // Paper 100px in, two CSS px to the unit.
  const detach = engine.attach(paperAt(framed(engine), 100, 0, 2));
  hover("mouse", 110, 0);
  expect(events.onHover).not.toHaveBeenCalled();
  hover("pen", 140, 10);
  expect(ring()).toEqual({ x: 40, y: 40, diameter: SETTINGS.size * 2 });
  // Under a curve, a middle pressure: narrower than the brush's full size.
  engine.settings = { ...engine.settings, penPressure: "normal" };
  hover("pen", 140, 20);
  expect(ring()?.diameter).toBeLessThan(SETTINGS.size * 2);
  expect(layer.paints).toBe(0);
  engine.down(at("pen", 1, 140, 40, 30));
  expect(ring()).toBeNull();
  engine.up(at("pen", 1, 140, 40, 40));
  hover("pen", 150, 50);
  engine.leave();
  expect(ring()).toBeNull();
  // A paused sheet takes no mark, so a hovering pen shows none.
  hover("pen", 150, 60);
  engine.settings = { ...engine.settings, paused: true };
  hover("pen", 160, 70);
  expect(ring()).toBeNull();
  detach();
});
```

- [ ] **Step 2:** Run the engine's tests → fails: no `onHover`, `buttons` or `leave`.
- [ ] **Step 3: The engine.** In `inkEngine.ts`, `previewWidth` joins the `./brush` import. `PointerInput` gains, after `button`:

```ts
/** The buttons held: none for a pen hovering over the sheet. */
buttons: number;
```

Before `InkEvents`:

```ts
/** Where a hovering pen would land on the paper, and how wide its stroke would show, in CSS px. */
export interface HoverRing {
  x: number;
  y: number;
  diameter: number;
}
```

`InkEvents` gains, after `onPen`:

```ts
  /** A pen hovering over the sheet; null once it lands or leaves, or the sheet takes no mark. */
  onHover: (ring: HoverRing | null) => void;
```

After `pressurePen`: `/** A hover ring shows. */ private hovering = false;`. In `attach()`: `const onLeave = () => this.leave();` beside the other handlers, `sheet.addEventListener("pointerleave", onLeave);` after the `lostpointercapture` listener, and `sheet.removeEventListener("pointerleave", onLeave);` in the detach. `down()` opens with `this.hideHover();`. `move()`, right after `const id = e.pointerId;`:

```ts
// A pen with nothing pressed hovers: a ring shows where it would land, and it never draws.
if (e.pointerType === "pen" && e.buttons === 0 && this.live?.id !== id) {
  this.hover(e);
  return;
}
```

After `finishStroke()`:

```ts
  /** The pointer left the paper: a hovering pen's ring goes. */
  leave(): void {
    this.hideHover();
  }
```

After `palmContact`:

```ts
  /** A hovering pen's ring, while the sheet would take its mark. */
  private hover(e: PointerInput): void {
    const s = this.settings;
    if (s.locked || s.paused || s.panelOpen || s.tool === "fill" || this.live || !this.sheet) {
      this.hideHover();
      return;
    }
    const { left, top, scale } = this.place();
    const share = s.tool === "eraser" ? 1 : previewWidth(s.penPressure, this.pressurePen);
    this.hovering = true;
    this.events.onHover({
      x: e.clientX - left,
      y: e.clientY - top,
      diameter: s.size * share * scale,
    });
  }

  private hideHover(): void {
    if (!this.hovering) return;
    this.hovering = false;
    this.events.onHover(null);
  }
```

- [ ] **Step 4: The ring.** In `DrawingCanvas.tsx`, `type HoverRing` joins the `./inkEngine` import; `interface Props extends InkEvents` becomes `interface Props extends Omit<InkEvents, "onHover">` with `// The hover ring is the paper's own, so its event stays here.` above it. After the imports:

```ts
/** A ring narrower than this many CSS px reads as a dot, so a fine brush's ring keeps this width. */
const MIN_RING_PX = 6;

/** Puts the ring where a hovering pen would land, or takes it away: hover comes too often for React state. */
function showRing(el: HTMLElement | null, ring: HoverRing | null) {
  if (!el) return;
  el.hidden = ring === null;
  if (!ring) return;
  const d = Math.max(ring.diameter, MIN_RING_PX);
  el.style.width = `${d}px`;
  el.style.height = `${d}px`;
  el.style.transform = `translate(${ring.x - d / 2}px, ${ring.y - d / 2}px)`;
}
```

`const ringRef = useRef<HTMLSpanElement>(null);` beside `canvasRef`; the engine's events gain `onHover: (ring) => showRing(ringRef.current, ring),`. Inside `.ink-sheet`, after the ink canvas (`…` is the code as it stands):

```tsx
      <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
        {under}
        <canvas ref={canvasRef} className="ink-canvas" … />
        {/* Where a hovering pen would land. */}
        <span
          ref={ringRef}
          className={settings.tool === "eraser" ? "nib-ring is-eraser" : "nib-ring"}
          hidden
          aria-hidden="true"
        />
      </div>
```

`DrawingCanvas.css`, at the end:

```css
/* A hovering Pencil's ring: where it would land, as wide as its stroke shows, in the brush's color
   with a white edge for dark ink. It takes no touch. */
.nib-ring {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--draw-color);
  border-radius: 50%;
  outline: 1px solid rgba(255, 255, 255, 0.85);
  pointer-events: none;
}
.nib-ring.is-eraser {
  border-color: rgba(28, 24, 36, 0.45);
}
```

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `feat(frontend): a hovering Pencil shows a ring as wide as its stroke`

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

and:

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
- `useFrame()`: its last line becomes `timeOurWork(INK_WORK.replay, () => { if (this.layer.setFrame(frame)) this.history.invalidate(); });`
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

- `applyFill()`: `if (!this.layer.fill(op)) return;` becomes `if (!timeOurWork(INK_WORK.fill, () => this.layer.fill(op))) return;`, and `this.history.commit(op);` becomes `timeOurWork(INK_WORK.snapshot, () => this.history.commit(op));`.

- [ ] **Step 4:** Run the engine's tests → pass.
- [ ] **Step 5:** Commit: `feat(frontend): the performance recorder times the ink's painting, fills and replays`

### Task 9: Prediction ahead of the nib

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/lazyBrush.ts`, `inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`, `DrawingCanvas.css`; create `canvas/predictionCanvas.ts`

- [ ] **Step 1: Write the failing test.** `inkEngine.test.ts` imports `type PredictionLayer` from `./inkEngine`. After `FakeLayer`:

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
  // A guess at erasing can't show on an overlay, so the eraser shows none.
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

- [ ] **Step 4: The engine.** In `inkEngine.ts`, `STRIDE` joins the `./ops` import as a value. After `InkLayer`:

```ts
/**
 * Where prediction shows: the browser's guess at a pen's next samples, painted ahead of the stroke for
 * one frame on an overlay over the ink, never the ink. It's the opposite of Smoothing, which trails
 * the line to steady it.
 */
export interface PredictionLayer {
  /** Wipes what it showed, then paints this path. */
  paint: (op: StrokeOp) => void;
  clear: () => void;
}
```

`PointerInput` gains, after `getCoalescedEvents`: `/** Where the browser expects the pointer next, where it says. */ getPredictedEvents?: () => PointerInput[];`. `LiveStroke` gains `/** The browser's latest guess at the pen's next samples, flat: x, y. */ predicted: number[];`, and `beginStroke`'s live stroke `predicted: [],`. The constructor takes a fifth parameter, `prediction: PredictionLayer | null = null`, kept in `private readonly prediction: PredictionLayer | null;`. In `move()`, after the coalesced loop and before the frame is asked for:

```ts
live.predicted.length = 0;
if (live.pointerType === "pen")
  for (const guess of e.getPredictedEvents?.() ?? []) live.predicted.push(...this.toSheet(guess));
```

`paintFrame` paints the guess too:

```ts
  private readonly paintFrame = (): void => {
    this.cancelFrame = null;
    const live = this.live;
    if (!live) return;
    timeOurWork(INK_WORK.paint, () => {
      this.paintNew(live);
      this.paintPrediction(live);
    });
  };
```

After `paintNew`:

```ts
  /**
   * The browser's guess at where the pen goes next, painted ahead of the stroke for this frame. It
   * runs through a copy of the lazy brush, so it extends the line as the stroke would, at the
   * stroke's last width; the next frame wipes it, and none of it reaches the ink or the op.
   */
  private paintPrediction(live: LiveStroke): void {
    const prediction = this.prediction;
    if (!prediction) return;
    const ahead = live.predicted.splice(0);
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
 * A transparent canvas over the ink, sized and scaled as the ink is, holding a pen's prediction for
 * one frame. It takes its backing at the first prediction, so a device with no pen pays nothing.
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

  /** Its context, the canvas sized as the ink is, which each sheet's frame sets. */
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
// Sized and scaled as the ink is whenever it paints, so it follows the sheet's frame.
const prediction = new PredictionCanvas(predicted, () => ({
  width: canvas.width,
  height: canvas.height,
  density: surface.density,
}));
```

The engine is built with `undefined, prediction` after its events (the browser's frames, then the overlay), and the cleanup calls `prediction.release();` after `engine.dispose();`. Inside `.ink-sheet`, between the ink canvas and the ring, a canvas with the ink canvas's class, so it lies exactly over it (`…` is the code as it stands):

```tsx
      <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
        {under}
        <canvas ref={canvasRef} className="ink-canvas" … />
        {/* A pen's prediction, one frame at a time: never read, kept or sealed. */}
        <canvas ref={predictionRef} className="ink-canvas ink-prediction" aria-hidden="true" />
        {/* Where a hovering pen would land. */}
        <span ref={ringRef} … />
      </div>
```

`DrawingCanvas.css`, after `.ink-canvas`:

```css
/* The prediction overlay lies over the ink and lets every touch through to the paper. */
.ink-prediction {
  pointer-events: none;
}
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): prediction paints the browser's guess ahead of the Pencil for a frame`

### Task 10: The performance recorder sums up each kind of pointer

**Files:** Modify `apps/frontend/src/performance/performanceRecorder.ts`, `performanceRecorder.test.ts`, `performanceReport.ts`, `performanceReport.test.ts`, `apps/frontend/src/i18n/strings/stickerBoard.ts` (`developer.performance.what`)

For the device session: palm and fingertip contact sizes, a flat-pressure pen's pressure, hover, and predicted samples, read in LINE's browser, which has no developer tools. Clear between trials keeps each range to one kind of contact.

- [ ] **Step 1: Write the failing tests.** `performanceRecorder.test.ts`, in `describe("the recorder on the page")`:

```ts
it("sums up each kind of pointer: contacts, hovering, pressure, contact size and samples a move", () => {
  startPerformanceRecorder();
  const sample = new PointerEvent("pointermove");
  const pen = (type: string, init: PointerEventInit) =>
    window.dispatchEvent(new PointerEvent(type, { pointerType: "pen", ...init }));
  const contact = { buttons: 1, width: 0.5, height: 0.5 };
  pen("pointermove", { buttons: 0 });
  pen("pointerdown", { ...contact, pressure: 0.1 });
  pen("pointermove", {
    ...contact,
    pressure: 0.9,
    coalescedEvents: [sample, sample, sample],
    predictedEvents: [sample],
  });
  pen("pointermove", { ...contact, pressure: 0.4, coalescedEvents: [sample] });
  window.dispatchEvent(
    new PointerEvent("pointerdown", { pointerType: "touch", buttons: 1, width: 30, height: 34 }),
  );

  const pointers = readPerformanceRecording()?.summary.pointers;
  expect(pointers?.get("pen")).toEqual({
    downs: 1,
    moves: 2,
    hovers: 1,
    pressure: { min: 0.1, max: 0.9 },
    width: { min: 0.5, max: 0.5 },
    height: { min: 0.5, max: 0.5 },
    coalesced: { total: 4, most: 3 },
    predicted: { total: 1, most: 1 },
  });
  expect(pointers?.get("touch")).toMatchObject({
    downs: 1,
    width: { min: 30, max: 30 },
    height: { min: 34, max: 34 },
  });
  clearPerformanceRecording();
  expect(readPerformanceRecording()?.summary.pointers.size).toBe(0);
});
```

`performanceReport.test.ts`: `type PointerKindSummary` joins the `./performanceRecorder` type import; the `summary` literal gains `pointers: new Map(),`; and in `describe("the performance report")`:

```ts
it("lists each kind of pointer: contacts and hovering, pressure, contact size and samples a move", () => {
  const pen: PointerKindSummary = {
    downs: 2,
    moves: 400,
    hovers: 57,
    pressure: { min: 0.03, max: 0.97 },
    width: { min: 0.5, max: 0.5 },
    height: { min: 0.5, max: 0.5 },
    coalesced: { total: 1560, most: 6 },
    predicted: null,
  };
  const hovering = { ...pen, downs: 0, moves: 0, pressure: null, width: null, height: null };
  const text = report({
    pointers: new Map([
      ["pen", pen],
      ["mouse", hovering],
    ]),
  });
  expect(text).toContain(
    [
      "Pointers",
      "  pen: 2 down, 400 moves, 57 hovering · pressure 0.03–0.97 · contact 0.5–0.5 × 0.5–0.5px · 3.9 coalesced a move (most 6) · no predicted events",
      "  mouse: 0 down, 0 moves, 57 hovering · no contact",
    ].join("\n"),
  );
  expect(report()).toContain("Pointers: none seen");
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/performance` → fails: the summary has no `pointers`.
- [ ] **Step 3: The recorder.** In `performanceRecorder.ts`, the module comment's "…and what happened around each slow one." becomes "…and what happened around each slow one, and each kind of pointer seen, for checking a Pencil." After `PerformanceSummary`'s interface:

```ts
/** Lowest and highest of what was seen. */
export interface Span {
  min: number;
  max: number;
}

/** Samples moves carried: all of them, and the most in one move. */
export interface SampleCount {
  total: number;
  most: number;
}

/**
 * One kind of pointer while recording, for checking a Pencil on a real iPad: its contacts and its
 * hovering, how hard and how big its contact was, and the samples each move carried.
 */
export interface PointerKindSummary {
  /** Contacts begun, and moves in contact. */
  downs: number;
  moves: number;
  /** Moves with nothing pressed: a Pencil hovering, or a mouse. */
  hovers: number;
  /** In contact: the pressure, and the contact's width and height in CSS px; null before any contact. */
  pressure: Span | null;
  width: Span | null;
  height: Span | null;
  /** Each move in contact's coalesced and predicted samples; null where the browser has no such list. */
  coalesced: SampleCount | null;
  predicted: SampleCount | null;
}

/** A pointerdown or pointermove, as the recorder keeps it. */
export interface PointerSample {
  kind: "down" | "move";
  pointerType: string;
  /** A button or the contact is down. */
  pressed: boolean;
  pressure: number;
  width: number;
  height: number;
  /** Its coalesced and predicted samples; null where the browser has no such list. */
  coalesced: number | null;
  predicted: number | null;
}
```

`PerformanceSummary` gains, after `windows`, `/** Each kind of pointer seen, by its pointerType. */ pointers: ReadonlyMap<string, PointerKindSummary>;`, and `PerformanceLog` gains, after `note`, `/** A pointer pressed or moved. */ notePointer: (sample: PointerSample) => void;`. Before `createPerformanceLog`:

```ts
const widen = (span: Span | null, value: number): Span =>
  span
    ? { min: Math.min(span.min, value), max: Math.max(span.max, value) }
    : { min: value, max: value };

const tally = (count: SampleCount | null, samples: number | null): SampleCount | null =>
  samples === null
    ? count
    : { total: (count?.total ?? 0) + samples, most: Math.max(count?.most ?? 0, samples) };

const NO_POINTER: PointerKindSummary = {
  downs: 0,
  moves: 0,
  hovers: 0,
  pressure: null,
  width: null,
  height: null,
  coalesced: null,
  predicted: null,
};
```

Inside `createPerformanceLog`, after `let windows …`: `const pointers = new Map<string, PointerKindSummary>();`. In the object it returns, after `note,`:

```ts
    notePointer: (sample) => {
      const was = pointers.get(sample.pointerType) ?? NO_POINTER;
      if (!sample.pressed) {
        // A move with nothing pressed hovers; a press with nothing pressed isn't one.
        if (sample.kind === "move")
          pointers.set(sample.pointerType, { ...was, hovers: was.hovers + 1 });
        return;
      }
      const down = sample.kind === "down";
      pointers.set(sample.pointerType, {
        ...was,
        downs: was.downs + (down ? 1 : 0),
        moves: was.moves + (down ? 0 : 1),
        pressure: widen(was.pressure, sample.pressure),
        width: widen(was.width, sample.width),
        height: widen(was.height, sample.height),
        coalesced: down ? was.coalesced : tally(was.coalesced, sample.coalesced),
        predicted: down ? was.predicted : tally(was.predicted, sample.predicted),
      });
    },
```

`summary()` gains `pointers: new Map(pointers),` (each record is replaced, never changed in place, so a shallow copy holds still), and `clear` gains `pointers.clear();`. Before `startListening`:

```ts
/** The parts of a PointerEvent the recorder reads; before iOS 18.2 there are no sample lists. */
interface PointerReading {
  type: string;
  pointerType: string;
  buttons: number;
  pressure: number;
  width: number;
  height: number;
  getCoalescedEvents?: () => readonly unknown[];
  getPredictedEvents?: () => readonly unknown[];
}

const readPointer = (e: PointerReading): PointerSample => ({
  kind: e.type === "pointerdown" ? "down" : "move",
  pointerType: e.pointerType,
  pressed: e.buttons !== 0,
  pressure: e.pressure,
  width: e.width,
  height: e.height,
  coalesced: e.getCoalescedEvents?.().length ?? null,
  predicted: e.getPredictedEvents?.().length ?? null,
});
```

In `startListening`, `hear("pointerdown", onTap);` becomes the first block below, and the second follows `hear("pointerup", onTap);`:

```ts
hear("pointerdown", (e) => {
  onTap(e);
  log.notePointer(readPointer(e));
});
```

```ts
// Every move, for the pointers' summary: even a Pencil's rate of events is no load for this.
hear("pointermove", (e) => log.notePointer(readPointer(e)));
```

- [ ] **Step 4: The report.** In `performanceReport.ts`, the type import takes `PointerKindSummary`, `SampleCount` and `Span` too; after `calls`:

```ts
const range = ({ min, max }: Span, digits: number) =>
  `${min.toFixed(digits)}–${max.toFixed(digits)}`;

/** Samples a move, on average and at most, or that the browser has no such list. */
const perMove = (samples: SampleCount | null, moves: number, name: string) =>
  samples === null
    ? `no ${name} events`
    : `${(moves > 0 ? samples.total / moves : 0).toFixed(1)} ${name} a move (most ${samples.most})`;

/** One kind of pointer: its contacts and hovering, how hard and how big, and the samples a move carried. */
function pointerLine(type: string, kind: PointerKindSummary): string {
  const head = `${type}: ${count(kind.downs)} down, ${count(kind.moves)} moves, ${count(kind.hovers)} hovering`;
  const { pressure, width, height } = kind;
  if (!pressure || !width || !height) return `${head} · no contact`;
  return [
    head,
    `pressure ${range(pressure, 2)}`,
    `contact ${range(width, 1)} × ${range(height, 1)}px`,
    perMove(kind.coalesced, kind.moves, "coalesced"),
    perMove(kind.predicted, kind.moves, "predicted"),
  ].join(" · ");
}

/** The pointers seen, for checking a Pencil, or that none was. */
function pointerLines(pointers: PerformanceSummary["pointers"]): string[] {
  if (pointers.size === 0) return ["Pointers: none seen", ""];
  return ["Pointers", ...[...pointers].map(([type, kind]) => `  ${pointerLine(type, kind)}`), ""];
}
```

In `formatPerformanceReport`'s `lines`, right after the `""` that follows the 30 fps line: `...pointerLines(summary.pointers),`. `stickerBoard.ts`: `developer.performance.what` becomes `{ en: "Slow frames and what happened around them, and each kind of pointer. While it’s on, it records from the app’s start." }`.

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/performance src/sticker-board/stat-board` and `pnpm -C apps/frontend typecheck` → pass. "records a slow frame … then stops all it started" still holds: `hear` adds its stop for the new listener.
- [ ] **Step 6:** Commit: `feat(frontend): the performance recorder sums up each kind of pointer`

### Task 11: End to end: the Pencil through Chromium's pen and touch input

**Files:** Create `apps/frontend/e2e/pen.ts`, `apps/frontend/e2e/pencil.e2e.ts`

Trusted pen events from Chromium's DevTools protocol: `Input.dispatchMouseEvent` with `pointerType: "pen"`, `force` (pressure), `tiltX` and `buttons` (0 hovers); fingers and palms through `Input.dispatchTouchEvent` with `radiusX` and `radiusY`. Ink is measured from the canvases' own pixels. Install Chromium once if needed: `pnpm --filter frontend exec playwright install chromium`.

- [ ] **Step 1: The helpers,** `e2e/pen.ts`:

```ts
import type { Page } from "@playwright/test";

/** A point on screen, in CSS px. */
export type At = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

/** The point a share of the way across and down `box`. */
export const at = (box: Box, across: number, down: number): At => ({
  x: box.x + box.width * across,
  y: box.y + box.height * down,
});

/** `steps` moves along a row of `box`, `down` of the way down, from `from` to `to` of the way across. */
export const along = (box: Box, down: number, from: number, to: number, steps = 24): At[] =>
  Array.from({ length: steps + 1 }, (_, i) => at(box, from + ((to - from) * i) / steps, down));

/** The middle of a stroke's points. */
export const middle = (points: At[]) => points[Math.floor(points.length / 2)];

/** An Apple Pencil held at an angle: trusted pen events with pressure and tilt, hovering with no buttons. */
export async function pencil(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    { x, y }: At,
    force: number,
    pressed: boolean,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      pointerType: "pen",
      button: type === "mouseMoved" && !pressed ? "none" : "left",
      buttons: pressed ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      force,
      tiltX: 30,
    });
  return {
    hover: (point: At) => send("mouseMoved", point, 0, false),
    down: (point: At, force: number) => send("mousePressed", point, force, true),
    move: (point: At, force: number) => send("mouseMoved", point, force, true),
    up: (point: At) => send("mouseReleased", point, 0, false),
  };
}
export type Pencil = Awaited<ReturnType<typeof pencil>>;

/** A pen stroke through `points`, pressed `force(i)` at each, `ms` between moves. */
export async function penStroke(
  page: Page,
  pen: Pencil,
  points: At[],
  force: (i: number) => number,
  ms = 16,
) {
  await pen.down(points[0], force(0));
  for (let i = 1; i < points.length; i++) {
    await pen.move(points[i], force(i));
    await page.waitForTimeout(ms);
  }
  await pen.up(points[points.length - 1]);
}

/** A finger or a palm on the glass: its id, where it is, and its contact's radius in CSS px. */
export type Contact = At & { id: number; radius: number };

/**
 * Fingers and palms. Each event lists every contact still down, as the protocol asks: it presses
 * what's new, lifts what a move leaves out, and ends with none.
 */
export async function hand(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: "touchStart" | "touchMove" | "touchEnd", contacts: Contact[]) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: contacts.map(({ x, y, id, radius }) => ({
        x,
        y,
        id,
        radiusX: radius,
        radiusY: radius,
        force: 1,
      })),
    });
  return {
    down: (contacts: Contact[]) => send("touchStart", contacts),
    move: (contacts: Contact[]) => send("touchMove", contacts),
    /** Lifts every contact but `staying`. */
    up: (staying: Contact[] = []) =>
      staying.length > 0 ? send("touchMove", staying) : send("touchEnd", []),
  };
}
export type Hand = Awaited<ReturnType<typeof hand>>;

/** One contact drawn through `points`, `radius` CSS px across its half. */
export async function touchStroke(page: Page, fingers: Hand, points: At[], radius: number) {
  const contact = (point: At): Contact => ({ ...point, id: 1, radius });
  await fingers.down([contact(points[0])]);
  for (const point of points.slice(1)) {
    await fingers.move([contact(point)]);
    await page.waitForTimeout(16);
  }
  await fingers.up();
}

/** CSS px each way from a point that ink is looked for in: a stroke's width, never the next row's. */
const BAND = 48;

/**
 * How many CSS px of ink a short vertical line through `point` crosses on the canvas `selector`
 * names: how thick a roughly horizontal stroke there came out.
 */
export function inkAt(page: Page, point: At, selector = ".ink-canvas:not(.ink-prediction)") {
  return page.evaluate(
    ({ selector, x, y, band }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) throw new Error(`No canvas at ${selector}`);
      if (canvas.width === 0) return 0;
      const box = canvas.getBoundingClientRect();
      const k = canvas.width / box.width;
      const top = Math.max(0, Math.round((y - band - box.top) * k));
      const bottom = Math.min(canvas.height, Math.round((y + band - box.top) * k));
      if (bottom <= top) return 0;
      const column = ctx.getImageData(Math.round((x - box.left) * k), top, 1, bottom - top).data;
      let inked = 0;
      for (let i = 3; i < column.length; i += 4) if (column[i] > 128) inked++;
      return inked / k;
    },
    { selector, x: point.x, y: point.y, band: BAND },
  );
}

/** Pixels holding ink anywhere on the canvas `selector` names. */
export function inkedPixels(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let inked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
    return inked;
  }, selector);
}

/**
 * From now on, counts the animation frames in which the canvas `selector` names holds ink near
 * screen y; resolves with what reads the count. A frame's guess is gone by the next, so only a
 * watch in every frame can see one.
 */
export async function countInkedFrames(page: Page, selector: string, y: number) {
  await page.evaluate(
    ({ selector, y, band }) => {
      const seen = window as Window & { inkedFrames?: number };
      seen.inkedFrames = 0;
      const look = () => {
        const canvas = document.querySelector<HTMLCanvasElement>(selector);
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx && canvas.width > 0) {
          const box = canvas.getBoundingClientRect();
          const k = canvas.height / box.height;
          const top = Math.max(0, Math.round((y - band - box.top) * k));
          const rows = Math.min(canvas.height - top, Math.round(2 * band * k));
          if (rows > 0) {
            const { data } = ctx.getImageData(0, top, canvas.width, rows);
            for (let i = 3; i < data.length; i += 4)
              if (data[i] > 0) {
                seen.inkedFrames = (seen.inkedFrames ?? 0) + 1;
                break;
              }
          }
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    },
    { selector, y, band: BAND },
  );
  return () => page.evaluate(() => (window as Window & { inkedFrames?: number }).inkedFrames ?? 0);
}
```

- [ ] **Step 2: Does Chromium predict for these moves?** In a throwaway run of Step 3's `openSheet`, add a `pointermove` listener on `window` summing `e.getPredictedEvents().length`, draw a `penStroke`, and log the sum. Above 0: keep Step 3's prediction test. At 0: leave that test out and say so in the merge summary; the engine's unit test and the device session cover prediction.
- [ ] **Step 3: The specs,** `e2e/pencil.e2e.ts`:

```ts
import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { PALM_CONTACT_PX } from "../src/sticker-creation/canvas/gestures.ts";
import { canvas, drawKeyName, openSettings, say, signIn } from "./helpers.ts";
import {
  along,
  at,
  countInkedFrames,
  hand,
  inkAt,
  inkedPixels,
  middle,
  pencil,
  penStroke,
  touchStroke,
  type Box,
  type Hand,
} from "./pen.ts";

const { stickerBoard, stickerCreation } = strings;
const language = "en";
/** A fingertip's contact radius, well under a palm's. */
const FINGERTIP = PALM_CONTACT_PX / 8;

// An iPad in portrait, the Pencil's own device.
test.use({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 });
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The Pencil comes through Chromium's DevTools protocol",
);

/** Signs someone new in and opens a fresh sheet; resolves with the paper's box on screen. */
async function openSheet(page: Page, who: string) {
  await signIn(page, who, language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  const sheet = canvas(page, language);
  // Waits until nothing covers the paper, as the suite's own strokes do.
  await sheet.hover();
  const box = await sheet.boundingBox();
  if (!box) throw new Error("The sheet isn't on screen");
  return box;
}

const undo = (page: Page) =>
  page.getByRole("button", { name: say(stickerCreation.history.undo, language) });
const pencilOnlyTile = (page: Page) =>
  page.getByRole("button", { name: say(stickerCreation.tools.pencilOnly, language) });

/** Two fingertips land together near the sheet's foot, and lift. */
async function twoFingerTap(fingers: Hand, box: Box) {
  const tap = [at(box, 0.3, 0.85), at(box, 0.45, 0.85)].map((point, i) => ({
    ...point,
    id: 10 + i,
    radius: FINGERTIP,
  }));
  await fingers.down(tap);
  await fingers.up();
}

test("a pen's first stroke brings the Pencil only tile; fingers then only tap, until the tile lets them draw", async ({
  page,
}) => {
  const box = await openSheet(page, "pencil-only");
  await expect(pencilOnlyTile(page)).toHaveCount(0);
  const pen = await pencil(page);
  const penRow = along(box, 0.2, 0.1, 0.4);
  await penStroke(page, pen, penRow, () => 0.5);
  await expect(undo(page)).toBeEnabled();
  await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "true");

  const fingers = await hand(page);
  const fingerRow = along(box, 0.5, 0.6, 0.9);
  await touchStroke(page, fingers, fingerRow, FINGERTIP);
  expect(await inkAt(page, middle(fingerRow))).toBe(0);
  // Fingers still tap: two take the pen's stroke back.
  await twoFingerTap(fingers, box);
  await expect.poll(() => inkAt(page, middle(penRow))).toBe(0);

  await pencilOnlyTile(page).click();
  await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "false");
  await touchStroke(page, fingers, fingerRow, FINGERTIP);
  expect(await inkAt(page, middle(fingerRow))).toBeGreaterThan(0);
});

test("a hovering pen rings where it will land, as wide as the stroke it draws, and the ring goes as it lands or leaves", async ({
  page,
}) => {
  // Off draws the brush's own width, so the stroke under the ring has one width to match.
  await page.addInitScript(() => localStorage.setItem("draw.penPressure", "off"));
  const box = await openSheet(page, "hover");
  const pen = await pencil(page);
  const ring = page.locator(".nib-ring");
  const row = along(box, 0.4, 0.2, 0.7);
  await pen.hover(row[0]);
  await expect(ring).toBeVisible();
  const shown = await ring.boundingBox();
  if (!shown) throw new Error("The ring has no box");
  expect(Math.abs(shown.x + shown.width / 2 - row[0].x)).toBeLessThan(1.5);
  expect(Math.abs(shown.y + shown.height / 2 - row[0].y)).toBeLessThan(1.5);

  // Pressed ever harder, a stroke under Off keeps one width: the ring's.
  await penStroke(page, pen, row, (i) => 0.1 + (0.9 * i) / row.length, 40);
  await expect(ring).toBeHidden();
  const early = await inkAt(page, row[8]);
  const late = await inkAt(page, row[row.length - 4]);
  expect(Math.abs(early - late)).toBeLessThan(1);
  expect(Math.abs(late - shown.width)).toBeLessThan(2);

  await pen.hover(at(box, 0.5, 0.7));
  await expect(ring).toBeVisible();
  // Above the paper, over the top bar.
  await pen.hover({ x: box.x + 30, y: box.y - 30 });
  await expect(ring).toBeHidden();
});

test("pen pressure: a pen whose pressure never moves draws by speed; then strokes widen as they press harder, and start as light as they land", async ({
  page,
}) => {
  const box = await openSheet(page, "pressure");
  const pen = await pencil(page);
  // The page's first strokes, at one pressure: a quick one draws thinner than a slow one.
  const slow = along(box, 0.15, 0.1, 0.4);
  const quick = along(box, 0.15, 0.6, 0.9);
  await penStroke(page, pen, slow, () => 0.5, 60);
  await penStroke(page, pen, quick, () => 0.5, 0);
  expect(await inkAt(page, middle(quick))).toBeLessThan(await inkAt(page, middle(slow)));

  // Pressure that moves sets the width: wider where it's pressed harder.
  const rising = along(box, 0.35, 0.1, 0.9);
  await penStroke(page, pen, rising, (i) => 0.1 + (0.9 * i) / rising.length);
  expect(await inkAt(page, rising[4])).toBeLessThan(await inkAt(page, rising[rising.length - 4]));

  // From now on a stroke starts at its first sample's width: a light one starts thin.
  const light = along(box, 0.6, 0.1, 0.4);
  const firm = along(box, 0.6, 0.6, 0.9);
  await penStroke(page, pen, light, () => 0.1);
  await penStroke(page, pen, firm, () => 0.9);
  expect(await inkAt(page, light[2])).toBeLessThan(await inkAt(page, firm[2]));
});

test("prediction paints a guess ahead of the pen while it moves, and none of it stays", async ({
  page,
}) => {
  const box = await openSheet(page, "prediction");
  const pen = await pencil(page);
  const row = along(box, 0.5, 0.1, 0.6, 30);
  const lift = row[row.length - 1];
  const inkedFrames = await countInkedFrames(page, ".ink-prediction", lift.y);
  await penStroke(page, pen, row, () => 0.5, 8);
  expect(await inkedFrames()).toBeGreaterThan(0);
  await expect.poll(() => inkedPixels(page, ".ink-prediction")).toBe(0);
  // The stroke ends where the pen lifted.
  expect(await inkAt(page, { x: lift.x + 24, y: lift.y })).toBe(0);
});

test("once a pen has drawn here, a palm never draws, and a resting palm doesn't hold up two-finger undo", async ({
  page,
}) => {
  const box = await openSheet(page, "palm");
  const pen = await pencil(page);
  await penStroke(page, pen, along(box, 0.2, 0.1, 0.4), () => 0.5);
  await expect(undo(page)).toBeEnabled();
  // Pencil and finger, so fingers draw: a palm still doesn't.
  await pencilOnlyTile(page).click();
  const fingers = await hand(page);
  const palmRow = along(box, 0.5, 0.55, 0.9);
  await touchStroke(page, fingers, palmRow, PALM_CONTACT_PX);
  expect(await inkAt(page, middle(palmRow))).toBe(0);

  const second = along(box, 0.7, 0.1, 0.4);
  await penStroke(page, pen, second, () => 0.5);
  const palm = { ...at(box, 0.85, 0.95), id: 1, radius: PALM_CONTACT_PX };
  const tap = [at(box, 0.3, 0.85), at(box, 0.45, 0.85)].map((point, i) => ({
    ...point,
    id: 10 + i,
    radius: FINGERTIP,
  }));
  await fingers.down([palm]);
  await fingers.down([palm, ...tap]);
  await fingers.up([palm]);
  await expect.poll(() => inkAt(page, middle(second))).toBe(0);
  await fingers.up();
});

test("Settings shows Input and Pen pressure once a pen has drawn on the device, and Try it takes the pen", async ({
  page,
}) => {
  await signIn(page, "pencil-settings", language);
  let settings = await openSettings(page, language);
  const input = () =>
    settings.getByRole("combobox", {
      name: say(stickerBoard.settings.pencil.input.title, language),
    });
  await expect(input()).toHaveCount(0);

  // What a pen's first stroke on the drawing screen keeps on the device.
  await page.evaluate(() => localStorage.setItem("draw.inputMode", "pencilOnly"));
  await page.reload();
  settings = await openSettings(page, language);
  await expect(input()).toHaveValue("pencilOnly");
  await settings
    .getByRole("combobox", { name: say(stickerBoard.settings.pencil.pressure.title, language) })
    .selectOption("light");

  const strip = page.locator(".try-pen-pressure__ink");
  await strip.scrollIntoViewIfNeeded();
  const box = await strip.boundingBox();
  if (!box) throw new Error("Try it isn't on screen");
  // Pencil only: a finger leaves the strip blank, and the pen draws.
  const row = along(box, 0.5, 0.1, 0.9);
  await touchStroke(page, await hand(page), row, FINGERTIP);
  expect(await inkedPixels(page, ".try-pen-pressure__ink")).toBe(0);
  await penStroke(page, await pencil(page), row, (i) => 0.1 + (0.9 * i) / row.length);
  expect(await inkedPixels(page, ".try-pen-pressure__ink")).toBeGreaterThan(0);
  // It fades a few seconds after the last stroke, and nothing is kept.
  await expect.poll(() => inkedPixels(page, ".try-pen-pressure__ink"), { timeout: 6000 }).toBe(0);
});
```

- [ ] **Step 4:** `pnpm --filter frontend test:e2e pencil` → passes. A failure is a bug in Tasks 1–9's code or a wrong measure here: fix it, and run once more. Then `pnpm -C apps/frontend typecheck` (the specs typecheck under `tsconfig.e2e.json`) and `pnpm -C apps/frontend lint` → pass.
- [ ] **Step 5:** Commit: `test(e2e): the Pencil through Chromium's pen and touch input`

### Task 12: WebKit captures

Scratch only, in `data/scratch/ipad-pencil/`; nothing here is committed. WebKit is the iPad's engine, and Playwright's has no CDP, so it takes synthetic `PointerEvent`s dispatched on the paper.

- [ ] **Step 1: Can WebKit open a page here?** `pnpm --filter frontend exec playwright install webkit`, then `(cd apps/frontend && node -e 'import("@playwright/test").then(async ({ webkit }) => { const b = await webkit.launch(); const p = await b.newPage(); await p.goto("data:text/html,<p>ok"); console.log(await p.textContent("p")); await b.close(); })')` prints `ok`. If it can't (on 2026-10-08 Playwright's WebKit on this Mac couldn't load even a `data:` URL, and a restart is the likely fix), tell the coordinator at once, do Task 13 meanwhile, and come back once the probe prints `ok`. If it still can't by the merge, merge without the captures and list them as owed.
- [ ] **Step 2: Servers of its own,** on 5196 and 8796, in the background, from the worktree's root. The API: `D="$PWD/data/scratch/ipad-pencil" && mkdir -p "$D/images" && (cd apps/api && PORT=8796 DATABASE_URL="$D/drawing-app.db" IMAGE_DIR="$D/images" IMAGE_BASE_URL=http://localhost:5196/api/images DEV_SIGN_IN=on STICKER_CHAIN_MODE=mock node --env-file=.env.example src/server.ts)`. Vite: `(cd apps/frontend && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on node_modules/.bin/vite --config vite.ipad-pencil.config.ts)`, with an untracked `apps/frontend/vite.ipad-pencil.config.ts`:

```ts
// Untracked, never committed: the Pencil plan's WebKit captures, on 5196 with its API on 8796.
import { mergeConfig } from "vite";
import appConfig from "./vite.config.ts";

export default mergeConfig(appConfig, {
  server: { port: 5196, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:8796" } } },
});
```

- [ ] **Step 3: The script,** `data/scratch/ipad-pencil/webkit.mjs`, run as `(cd apps/frontend && node ../../data/scratch/ipad-pencil/webkit.mjs)`, so it loads Playwright through the frontend's packages. Its helpers:

```js
// One-shot: the Pencil plan's WebKit captures. Deleted with its folder once the plan merges.
import { createRequire } from "node:module";
import { appendFileSync, mkdirSync } from "node:fs";

const require = createRequire(`${process.cwd()}/package.json`);
const { webkit } = require("@playwright/test");
const BASE = "http://localhost:5196";
const OUT = new URL("./out/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const log = (line) => {
  console.log(line);
  appendFileSync(`${OUT}log.txt`, `${line}\n`);
};
const IPAD = {
  viewport: { width: 820, height: 1180 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
};

/** WebKit drops the API's Secure session cookie on http://localhost: sign in from Node, add it back plain. */
async function signIn(context, name) {
  const idToken = `drawing-app-dev-id-token:${JSON.stringify({ sub: `dev-${name}`, name })}`;
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken, language: "en" }),
  });
  if (!res.ok) throw new Error(`Signing ${name} in failed: ${res.status} ${await res.text()}`);
  await context.addCookies(
    res.headers.getSetCookie().map((line) => {
      const [pair] = line.split(";");
      const cut = pair.indexOf("=");
      return { name: pair.slice(0, cut), value: pair.slice(cut + 1), url: BASE, httpOnly: true };
    }),
  );
}

/** A pen event of `type` on the paper at screen x, y: pressure, and `buttons` 0 to hover. */
const penEvent = (page, type, x, y, { pressure = 0.5, buttons = 1, predicted = [] } = {}) =>
  page.evaluate(
    ({ type, x, y, pressure, buttons, predicted }) => {
      const init = {
        bubbles: true,
        cancelable: true,
        pointerId: 7,
        pointerType: "pen",
        isPrimary: true,
      };
      const at = (cx, cy) =>
        new PointerEvent("pointermove", { ...init, clientX: cx, clientY: cy, pressure, buttons });
      document.querySelector(".ink-sheet").dispatchEvent(
        new PointerEvent(type, {
          ...init,
          clientX: x,
          clientY: y,
          pressure,
          buttons,
          predictedEvents: predicted.map(([px, py]) => at(px, py)),
        }),
      );
    },
    { type, x, y, pressure, buttons, predicted },
  );
```

Each run: a fresh context (`IPAD`), `context.route(/^https:\/\//, async (route) => route.fulfill({ response: await route.fetch() }))` (WebKit's own HTTPS fails when launched from the Bash tool), `signIn` as `pencil-webkit-<n>`, `page.goto(`${BASE}/?as=pencil-webkit-<n>`)`, then Draw (`getByRole("button", { name: /^Draw a new sticker/ })`). Captures, each logged with what it measured:

1. **Facts:** whether `new PointerEvent("pointermove", { predictedEvents: [new PointerEvent("pointermove")] }).getPredictedEvents().length` is 1 in this WebKit; if not, prediction's capture shows nothing and the log says why.
2. `tile-before-pen.png`: no Pencil only tile. Then a pen stroke (`pointerdown`, twenty `pointermove`s with pressure rising 0.1 to 1, `pointerup`) and `tile-pencil-only.png`: the tile pressed, the stroke wider at its end.
3. `hover-ring.png`: a `pointermove` with `buttons: 0`; `.nib-ring` is visible and centered on the point (log its box); and `hover-ring-eraser.png` after `E` picks the eraser.
4. `prediction.png`: mid-stroke moves carrying `predicted` points 20px ahead; log the inked pixel count of `.ink-prediction` in the next frame (above 0), and 0 a frame after `pointerup`.
5. `settings-pencil-en.png` and `settings-pencil-ja.png` (`localStorage["draw.language"] = "ja"` in an init script, with `draw.inputMode` set): flip to your stat board (`getByRole("button", { name: /: your stats$/ })`) and scroll the Settings note into view; Input, Pen pressure and Try it under the drawing hand. Then synthetic pen events on `.try-pen-pressure__ink` and `try-it.png` mid-stroke.
6. `drawing-ja.png`: the tile in Japanese (its name, ペンのみ, from the accessibility tree: `page.locator(".tool-strip").ariaSnapshot()`).

- [ ] **Step 4:** Fix what the captures show in one batch, rerun Task 11's spec and this script once, stop both servers, delete `vite.ipad-pencil.config.ts`, and commit any fix: `fix(frontend): the Pencil's tile, ring and Settings rows in WebKit`. Keep `data/scratch/ipad-pencil/out/` until ad0ll has seen the captures.

### Task 13: Docs

**Files:** Modify `DESIGN.md`, `PRODUCT.md`

Only the sentences this plan's work makes false, plus its own, as main has them then (Phase 0 and the drawing plan edit the same sections).

- [ ] **Step 1: DESIGN.md's Draw screen.**
  - **Tools:** append "Once a pen has drawn on the device, the Pencil only tile leads the strip past a hairline: pen-nib, an Ink tile with the fill icon while pressed. Pressed, only the pen draws on the sheet and fingers tap to undo and redo; a tap switches the sheet, and a fresh sheet starts from Settings' Input."
  - New after Size rail: "**Pencil hover:** a hovering Pencil shows a ring centered on its nib, as wide as the stroke it would draw, in the brush's color with a thin white edge, or an Ink line for the eraser. It never draws, and goes on contact or off the paper."
  - New after it: "**Prediction:** a Pencil stroke runs a frame's guess ahead of the nib, the opposite of Smoothing; it's never kept."
- [ ] **Step 2: DESIGN.md's Settings** (the cork back): after the drawing hand's sentence, "Once a pen has drawn on the device, Input (Pencil only, Pencil and finger) and Pen pressure (Off, Light, Normal, Firm) follow as rows with their choice at the end, Input with a supporting note, and Try it under Pen pressure: a 64px strip of drawing paper where the pen tries the curve in Ink, which fades."
- [ ] **Step 3: PRODUCT.md's Operating Context.** Tools: "The brush follows pen pressure, or speed under a finger." becomes "The brush follows pen pressure through the curve chosen in Settings (Off, Light, Normal, Firm), or speed under a finger or a pen that reports none." After "with undo and redo buttons too." add "Once an Apple Pencil draws on a device, each sheet starts in Settings' Input, Pencil only (fingers only tap) or Pencil and finger, and a tile on the drawing screen switches the sheet; a resting palm draws nothing and holds up no tap." The stat board's Settings list gains "and, on a device a pen has drawn on, Input and Pen pressure".
- [ ] **Step 4:** Commit: `docs: the drawing screen's Pencil, and Settings' Input and Pen pressure`

### Task 14: Check, squash and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, the format check and the Move tests pass. `pnpm --filter frontend test:e2e` → the whole suite passes, Pencil included.
- [ ] **Step 2:** Squash the branch into these commits, with no AI attribution lines: `feat(frontend): the Pencil's input mode, pen pressure, hover ring, prediction and palm rules`, `feat(frontend): Settings' Input and Pen pressure, with a strip to try the pen`, `feat(frontend): the performance recorder times the ink and sums up each pointer`, `test(e2e): the Pencil through Chromium's pen and touch input`, `docs: the drawing screen's Pencil, and Settings' Input and Pen pressure`.
- [ ] **Step 3:** In the main checkout, in one command: fast-forward main, merge the branch, push.
- [ ] **Step 4:** Tick this plan's boxes on main, and leave the plan there: the small-windows plan deletes it with the brief. Hand the coordinator the list under "What waits for ad0ll's device session", the WebKit captures (`data/scratch/ipad-pencil/out/`, copied wherever the coordinator says), and anything Task 11 Step 2 or Task 12 Step 1 left out; then remove the worktree, its scratch with it, and the branch.

## What waits for ad0ll's device session

No boxes here: this plan is done at Task 14's merge, so the small-windows plan's check for unticked plans passes. When ad0ll's session reports come in, one follow-up commit on main's code: `PALM_CONTACT_PX` (`canvas/gestures.ts`) between the fingertips' and the resting palms' contact widths; `PRESSURE_EXPONENTS` (`canvas/brush.ts`) as ad0ll chose; and, if the ring stays after the Pencil leaves hover range, `hover()` in `inkEngine.ts` hides it once no hover move has come for a beat. Then `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and `pnpm --filter frontend test:e2e pencil`, and `fix(frontend): the palm threshold and pressure curves as the iPad measured them`.

Only a real iPad and Pencil settle these. Setup: an iPad and Pencil that hover, iPadOS 18.2 or later, a Pencil (USB-C) if at hand; Croquis in LINE and in Safari; the developer slip's performance recorder on; Clear between trials, Copy report after each.

1. **Palm widths:** a resting palm, then a fingertip, on the sheet; each report's `touch:` contact range. Then, in Pencil and finger, a resting palm draws nothing while a fingertip draws, and a two-finger tap undoes while the palm rests. Whether a palm down first stops the Pencil drawing.
2. **Hover:** the ring shows over the paper in LINE and in Safari (`pen: … hovering` above 0), and goes when the Pencil lifts out of range or leaves the paper.
3. **Prediction:** `pen: … predicted a move` above 0 in LINE and in Safari.
4. **Pencil (USB-C):** the report's pen pressure range is one value; it draws by speed under Light, Normal and Firm, and one width under Off.
5. **Scribble and system gestures:** a Pencil stroke on the sheet and on Try it is never cut short or turned into a text selection or the magnifier.
6. **Taps:** two- and three-finger taps undo and redo in both inputs, with no system menu.
7. **Memory:** a full Pencil drawing in LINE ends without the page reloading.
8. **Feel,** judged in normal use and tuned by value: Light, Normal and Firm (`PRESSURE_EXPONENTS` 0.5, 0.75, 1.25), light starts from a page's second stroke, the ring's 6px floor.

## Self-review

- **Brief coverage** (`2026-10-08-ipad-design-brief.md`, "Apple Pencil"): input mode with Settings' default and a quick switch, shown only where a pen has drawn (Tasks 1–3, 6); two- and three-finger taps either way (Task 2's test, Task 11); pen pressure Off, Light, Normal, Firm with a strip to try it (Tasks 5, 6); the hover ring at the stroke's width (Task 7); prediction, redrawn each frame and never kept, named as Smoothing's opposite (Task 9); palms never draw or count toward undo, heavy starts, flat-pressure pens (Tasks 4, 5). The old plan's layout, drawing hand, color popover, short heights and Escape-disarms-the-seal tasks are left to `2026-10-08-ipad-drawing.md` and the small-windows plan.
- **Placeholder scan:** no TBD, no "similar to". Two choices are made at run time, each with its rule: Task 6 Step 4 (a choice row component the Drawing group may already have) and Task 11 Step 2 (whether Chromium predicts for CDP moves). Setup Step 2 maps the drawing plan's names.
- **Names across tasks:** `INPUT_MODES` and `InputMode` (`inkEngine.ts`); `PEN_PRESSURES`, `PenPressure`, `previewWidth` (`brush.ts`); `useInputMode`, `readInputMode`, `keepInputMode`, `penDrew`, `usePenPressure`, `readPenPressure`, `keepPenPressure` (`drawingSettings.ts`); `InkSettings.inputMode` and `penPressure`; `InkEvents.onPen` and `onHover`; `HoverRing`; `PredictionLayer`, `PredictionCanvas`; `INK_WORK`; `isPalm`, `PALM_CONTACT_PX`, `YOUNG_MS`; `ChoiceRow`, `PencilSettings`, `TryPenPressure`; `PointerKindSummary`, `PointerSample`, `Span`, `SampleCount`; CSS `.nib-ring`, `.ink-prediction`, `.try-pen-pressure__ink`; storage keys `draw.inputMode`, `draw.penPressure`.
- **Test helpers in `inkEngine.test.ts`** change in order: Task 2 (`inputMode`, `onPen`), Task 4 (`width`, `height`, `runFrame`), Task 5 (`penPressure`, `at`'s and `stroke`'s pressure), Task 7 (`buttons`, `onHover`), Task 8 (the recorder mock), Task 9 (`FakePrediction`, `setup`'s second parameter).
