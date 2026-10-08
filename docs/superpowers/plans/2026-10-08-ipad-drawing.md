# iPad Drawing Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One sheet for every device, the large drawing screen (slim top bar, slim sidebar, colors as a popover), a My board key that leaves in one tap and comes back to the drawing, Escape disarming the seal check, and a drawing hand (Right or Left, kept on the device) that mirrors the drawing screen on phones and iPads.

**Architecture:** Ports `spike/ipad-board`'s sheet-unit commits (a drawing's frame in sheet units, fixed from its first mark, its paper scaled to fit, the die-cut border and the timelapse in units), its layout and its My board key, fitted to main's seal chip (the 18+ box inside it) and Kyoto Seika's corner print. The drawing hand is a device setting (`ui/deviceSetting.ts`, `sticker-creation/drawingSettings.ts`) that sets `data-hand` on `.drawing-screen`; CSS keyed on it mirrors both layouts. Settings' Drawing group (`stat-board/DrawingSettings.tsx`, rows through `stat-board/ChoiceRow.tsx`) is where the Pencil plan adds its rows.

**Tech Stack:** React 19, TypeScript, Canvas 2D, IndexedDB, CSS, vitest + happy-dom + fake-indexeddb, the i18n catalog, Playwright scratch scripts (WebKit and Chromium).

**Brief:** `docs/superpowers/specs/2026-10-08-ipad-design-brief.md`, "Drawing screen". **Reference:** `spike/ipad-board` (worktree `.claude/worktrees/ipad-research`), never merged.

---

## Decisions

1. **One sheet for every device,** as the draft built it from the approved sheet plan: a 374-unit short side (`SHEET_SHORT_UNITS`), the long side following the area's shape at the first mark (1 to 2.2×), a blank sheet following its area; shown scaled to fit, so turning only rescales; ink density the screen's own at the shown size, at most `MAX_INK_PIXELS` (4.2 MP); strokes, sizes and the die-cut border (`BORDER_UNITS` 23) in units; the size rail's "px" are a 390 px phone's; a drawing kept without a frame opens on its area at scale 1; fills replay at their recorded density.
2. **Large layout,** the draft's values: a 76px sidebar (`--edge-w`), a 62px top bar (`--top-h`), an 8px foot, a 180px rail with no px number (its thumb's tip shows the size), undo over redo, the seal check at the sidebar's foot; the sheet takes the rest. Colors open as a 360px popover under the tool strip at its outer edge, with no tear strip; a tap outside closes it.
3. **Seal chip:** opens from the check toward the sheet, its 18+ box at the end away from the check (`--chip-away`), sliding out from the check (`--chip-from`, new).
4. **My board key:** small label stock with the My board icon, centered in the top bar; a large screen has no grabber; the key hides under a ticket card's scrim, as the grabber does.
5. **Drawing hand:** `draw.hand` on the device, Right when nothing is kept. Left mirrors places, not reading order: undo stays before redo, chip text stays left-aligned, the timer keeps its tilt; the paused hint's arrow is mirrored in CSS.
6. **Kyoto Seika's corner print:** the sheet's bottom corner on the drawing hand's side: over the seal check on a phone, the corner away from the sidebar's check and chip on an iPad. The deal tucks toward it.
7. **Settings' Drawing group,** last on your Settings card: a fieldset, legend "Drawing" (かく画面), one choice row "Drawing hand · Right" in Language's pattern, a status line "Kept on this device." after a change, an error line when the device can't keep it.
8. **Escape** closes an open panel and disarms the armed check, through a session event `escape`.

## Depends on

- **Phase 0,** `2026-10-08-small-fixes.md`: Settings' choice row CSS (`settings-note__choice`, `settings-note__picked`, `settings-note__select`). It may reshape `SettingsNote.test.tsx`.
- **Foundations,** `2026-10-08-ipad-foundations.md`: `ui/largeScreen.ts` (`LARGE_SCREEN`, `useLargeScreen()`), whose query CSS spells `(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`; TabBar importing `useLargeScreen`, with a large-screen `@media` block in `TabBar.css`; the desktop frame.
- **Built on by** `2026-10-08-ipad-pencil.md`, with these names: `canvas/sheetFrame.ts`; the engine's `fit`, `frame`, `screenToSheet`, private `place()` and `origin`; DrawingCanvas's `.ink-area` > `.ink-sheet` > (`under`, `.ink-canvas`), its `onFit(scale)`, its handle's `frame()` and `screenToSheet()`; DrawingScreen's `sheetScale`; `ui/deviceSetting.ts` (`deviceSetting(key, { parse, serialize, name })` → `{ get, set, subscribe }`); `drawingSettings.ts` (`DRAWING_HANDS`, `DrawingHand`, `useDrawingHand`, `keepDrawingHand`); `stat-board/DrawingSettings.tsx`, `stat-board/ChoiceRow.tsx` (the Pencil plan's Task 6 Step 4 API); `stickerBoard.settings.drawing.notKept` (the Pencil plan's `pencil.notKept` words, so it can reuse it); `.drawing-screen[data-hand]`.

## Files

- Ported (Tasks 1–8): `sticker-creation/canvas/` (`sheetFrame.ts` and test, `inkSurface.ts`, `inkEngine.ts` and test, `DrawingCanvas.tsx`, `DrawingCanvas.css`, `brush.ts`, `lazyBrush.ts`, `ops.ts`, `gestures.ts`), `sticker-creation/sealing/` (`dieCut.ts`, `cutSticker.ts`, `sealWorker.ts`, `makeSticker.ts`, `timelapse.ts`, their tests, new `cutSticker.test.ts`), `session/keptSession.ts` and test, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `DrawingScreen.css`, `SealKey.css`, `tools/SizeRail.tsx`, `SizeRail.css`, `SizeRail.test.tsx`, `tools/ColorSheet.css`, `sticker-board/timelapse/` (`timelapseCrop.ts`, `timelapsePlayer.ts`, `fillSnapshots.ts`, two tests), `apps/api/src/stickers/timelapse.ts` (comments), `app/TabBar.tsx`, `TabBar.css`, `TabBar.test.tsx`, `app/App.css`, `i18n/strings/app.ts`, `stickerCreation.ts` (a comment)
- New code (Tasks 9–12): `session/session.ts` and test, `useShortcuts.ts`; create `ui/deviceSetting.ts`, `deviceSetting.test.ts`, `sticker-creation/drawingSettings.ts`, `sticker-board/stat-board/ChoiceRow.tsx`, `DrawingSettings.tsx`, `DrawingSettings.test.tsx`; modify `SettingsNote.tsx`, `SettingsNote.test.tsx`, `i18n/strings/stickerBoard.ts`, `i18n/glossary.md` (Kyoto Seika's corner print and deal take their mirror rules from `DrawingScreen.css`)
- Docs: `DESIGN.md`, `PRODUCT.md`
- Scratch, never committed: the worktree's gitignored `data/scratch/ipad-drawing/`, an untracked `apps/frontend/vite.ipad-drawing.config.ts`

All `apps/frontend/src/` paths below are written from `src/` on.

## Setup

- [ ] **Step 1: A worktree at main's tip,** once Phase 0 and foundations are on main. From anywhere in the repo: `MAIN=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)") && git -C "$MAIN" worktree add -b feat/ipad-drawing "$MAIN/.claude/worktrees/ipad-drawing" main`, then `pnpm install` in it. Every command below runs from its root.
- [ ] **Step 2: The dependencies are in.** Each prints a line; if one doesn't, stop and tell the coordinator:

```bash
rg -n "export const (LARGE_SCREEN|useLargeScreen)" apps/frontend/src/ui/largeScreen.ts
rg -n "useLargeScreen" apps/frontend/src/app/TabBar.tsx
rg -n "settings-note__choice" apps/frontend/src/sticker-board/stat-board/settings-note.css
git cat-file -e 609020e0 && git cat-file -e c34494ea && echo "spike objects present"
```

- [ ] **Step 3: A green start.** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board src/app src/ui` → passes. Every test run sets `TZ=Asia/Tokyo`: some date tests assume Tokyo.

**How a port runs.** `git show <sha> -- <paths> | git apply -3` (the spike's objects are in this repository). A conflict leaves markers: resolve as the task says, `git add`, run the task's test, commit with the task's message. Every port was tried in order on a scratch clone of main at `ed18a266` (before Phase 0 and foundations): typecheck, lint, format and `src/sticker-creation src/sticker-board src/app src/ui` passed. The conflicts listed are the ones it met; Phase 0 or foundations can add others in the files named.

**UI tasks (8, 11, 12):** read the impeccable skill's `reference/craft-floor.md` first and work with `/impeccable adapt` as the lens.

### Task 1: The sheet's frame (609020e0)

- [ ] **Step 1:** `git show 609020e0 | git apply -3`: `canvas/sheetFrame.ts` and its test (new), `MAX_DPR` moving from `inkSurface.ts`, the timelapse imports. Conflicts: none.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/sheetFrame.test.ts src/sticker-board/timelapse` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 3:** Commit: `feat(frontend): the drawing sheet's frame, in sheet units, with its fit and ink density`

### Task 2: One frame per drawing, the paper scaled to fit (5f4c2085)

- [ ] **Step 1:** `git show 5f4c2085 | git apply -3`: the engine's frame, `fit`, `screenToSheet` and mapping; `InkSurface.setFrame`; DrawingCanvas's `.ink-area` (with `touch-action: none`) around the fitted `.ink-sheet`; unit comments.
- [ ] **Step 2: Conflict, `canvas/DrawingCanvas.tsx`'s returned JSX.** Main prints `under` on the paper and names the canvas `label ?? catalog`. Keep the draft's `.ink-area` > `.ink-sheet` nesting, with `{under}` first inside `.ink-sheet` and the canvas's `aria-label={label ?? t(($) => $.stickerCreation.canvas)}`. The signature keeps main's `under, label`.
- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas src/sticker-board/timelapse` and typecheck → pass.
- [ ] **Step 4:** Commit: `feat(frontend): a drawing keeps one frame in sheet units, and its paper scales to fit`

### Task 3: Sealing in sheet units (bd02a3b3)

- [ ] **Step 1:** `git show bd02a3b3 | git apply -3`: `BORDER_UNITS`, `cutInk` and its test, the density through `makeSticker` and the sealing worker, the timelapse recording the frame, `inkDensity` leaving the handle.
- [ ] **Step 2: Conflicts.**
  - `DrawingScreen.tsx` imports: drop the draft's `NsfwToggle` import (main has none); keep `import type { SheetFrame } from "./canvas/sheetFrame";`.
  - `DrawingScreen.tsx` `cutFromSheet`: keep main's Kyoto Seika lines (`pair`, `kept`, `subjects`), then the draft's comment and `if (!frame) return null;`.
  - `DrawingScreen.test.tsx` imports: main's, plus `import { frameFor, SHEET_SHORT_UNITS } from "./canvas/sheetFrame";` after the `./canvas/ops` import.
  - `DrawingScreen.test.tsx` hoisted values: main's (`sheetCalls` through `rail`), then the draft's `FRAME` and its comment.
  - `sealing/makeSticker.ts` merges clean over main's own `new Worker(new URL("./sealWorker.ts", import.meta.url), …)`; check `cutInWorker(ink, density)` still starts it that way, not through `startWorker`.
- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board/timelapse` and typecheck → pass.
- [ ] **Step 4:** Commit: `feat(frontend): stickers are cut with their border in sheet units, and the timelapse records the frame`

### Task 4: The size ghost at the sheet's scale (b9caf92b)

- [ ] **Step 1:** `git show b9caf92b | git apply -3`. Conflict, `canvas/DrawingCanvas.tsx`'s `Props`: keep main's `under` and `label`, then add the draft's `onFit`.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/tools src/sticker-creation/DrawingScreen.test.tsx` and typecheck → pass.
- [ ] **Step 3:** Commit: `feat(frontend): the size rail's ghost shows the brush at its size on the sheet`

### Task 5: The kept drawing keeps its frame (1f96da7f)

- [ ] **Step 1:** `git show 1f96da7f | git apply -3`.
- [ ] **Step 2: Conflicts.**
  - `DrawingScreen.tsx` `putBack`: keep main's Kyoto Seika lines; its `canvas.current?.load(found.steps);` becomes `canvas.current?.load(found.steps, found.frame);`.
  - `session/keptSession.ts` `loadKeptSession`: keep main's multi-line `lost` return (with `kyotoSeika: null`), and take the draft's `readDrawing(userId).then(({ steps, frame }): KeptDrawing => ({ status: "found", steps, frame, ...record }),`.
- [ ] **Step 3: What typecheck then asks for** in `DrawingScreen.test.tsx`: the Kyoto Seika reload fixture (`kyotoSeika: part, steps: []`) gains `frame: null`, and `new SessionKeeper(me.id).save([...], halfway)` gains `FRAME` as its third argument.
- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and typecheck → pass.
- [ ] **Step 5:** Commit: `feat(frontend): the drawing kept on the device keeps the frame it's drawn in`

### Task 6: Fills replay at the density they were drawn at (8cab7634)

- [ ] **Step 1:** `git show 8cab7634 | git apply -3`. Conflicts: none.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/timelapse` and typecheck → pass.
- [ ] **Step 3:** Commit: `fix(frontend): a timelapse floods its fills at the density they were drawn at`

### Task 7: My board in the drawing screen's top bar (c34494ea)

- [ ] **Step 1:** `git show c34494ea -- apps/frontend/src/app/TabBar.tsx apps/frontend/src/app/TabBar.test.tsx apps/frontend/src/i18n/strings/app.ts | git apply -3`. Leave out its `TabBar.css` hunk: it rewrites 0a45a528's grabber rule, which this plan doesn't take. Expect `TabBar.tsx` conflicts: the foundations plan renders `<TabsLeadSlot />` (not the draft's `registerTabsLead`) and already has `const large = useLargeScreen()` and `backToExplore` reading it. Keep foundations' lines; take only the `LabelButton` import, the doc comment's last sentence, the `.tab-home` label for `tucked && large` and the grabber for `tucked && !large`. `app.ts` sits beside foundations' new `tabs.backToExplore`: keep both.
- [ ] **Step 2: `TabBar.css`:** inside foundations' large-screen `@media` block, the `.tab-home` rule and its comment as the draft has them: `git show c34494ea:apps/frontend/src/app/TabBar.css | rg -n -B2 -A7 "^  \.tab-home"`.
- [ ] **Step 3: `App.css`:** `git show 0a45a528 -- apps/frontend/src/app/App.css | git apply -3` (on a large screen the tucked strip is only the home indicator). Its comment becomes "On a large screen My board sits in the drawing screen's top bar instead of the grabber, so the strip is only the home indicator's." The grabber's scrim rule, `.phone.has-tucked-tabs:has(.out-of-tickets__scrim) .tab-grabber`, takes `:is(.tab-grabber, .tab-home)`, its comment "Nor can the grabber or My board be used then, so they go rather than poking up out of the scrim."
- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/app/TabBar.test.tsx` and typecheck → pass. Breaking `tucked && large` turns its large-screen test red.
- [ ] **Step 5:** Commit: `feat(frontend): on a large screen the drawing screen's top bar has My board, one tap back to the board`

### Task 8: The large drawing screen (3ee8ba5c, 0a45a528, 696123ba)

- [ ] **Step 1: Code.** `git show 3ee8ba5c -- apps/frontend/src/sticker-creation/DrawingScreen.tsx | git apply -3` (`closePanelOutside`: on a large screen a tap outside the color popover closes it) and `git show 0a45a528 -- apps/frontend/src/sticker-creation/tools/SizeRail.tsx apps/frontend/src/sticker-creation/tools/SizeRail.css | git apply -3` (the rail's drag reads its travel from `--thumb-foot`). Conflicts: none.
- [ ] **Step 2: CSS,** in order: `git show 3ee8ba5c -- apps/frontend/src/sticker-creation/DrawingScreen.css apps/frontend/src/sticker-creation/tools/ColorSheet.css | git apply -3`, the same paths from `0a45a528`, then `git show 696123ba -- apps/frontend/src/sticker-creation/tools/ColorSheet.css | git apply -3`. Conflicts: none.
- [ ] **Step 3: Main's seal chip.** In `DrawingScreen.css`'s large block:
  - delete `.drawing-screen > .nsfw-toggle` (main's 18+ box is in the chip);
  - the block's comment: "Large screens: as in drawing apps made for a tablet, the controls take a slim top bar and a slim sidebar at the edge away from the drawing hand, and the sheet takes everything else. The sidebar holds the size rail, undo over redo and the seal check at its foot, whose chip opens toward the sheet. Kyoto Seika's corner print keeps the sheet's corner on the drawing hand's side.";
  - `.drawing-screen > .seal-chip` gains `--chip-away: flex-end;` and `--chip-from: -6px;` first, its comment "The chip opens from the check over the sheet's corner, its 18+ box at the end away from the check."
    In `SealKey.css`, `.seal-chip`'s `transform: translateX(6px);` becomes `transform: translateX(var(--chip-from, 6px));` under `/* It slides out from the check: --chip-from points back toward the check wherever the chip opens. */`. In `i18n/strings/stickerCreation.ts`, `colorSheet.title`'s comment: `/** Color sheet, which slides up over the drawing screen from the color tile, or opens under the tool strip on a large screen: its heading, and its name for screen readers */`.
- [ ] **Step 4: The popover's test** (the draft has none), in `DrawingScreen.test.tsx`: a hoisted `layout = { large: false }` (reset in `afterEach`); `vi.mock("../ui/largeScreen", async (original) => ({ ...(await original<object>()), useLargeScreen: () => layout.large }))`; the `ColorSheet` mock renders `<div className="color-sheet" />` while `open`. At the file's end, `describe("the color sheet")`, opening it with `reopen(keptHalfway)`, `settle()` and `act(openPanel("color"))`: on a large screen a bubbling `pointerdown` on `.color-sheet` leaves it and one on `.timer-stub` closes it; on a phone one on `.timer-stub` leaves it. Changing `panel === "color" && large` to `false` turns the first red.
- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and typecheck → pass.
- [ ] **Step 6:** Commit: `feat(frontend): the large drawing screen gives the sheet everything but a slim top bar and sidebar, and colors open as a popover`

### Task 9: Escape disarms the seal check

**Files:** `session/session.ts`, `session/session.test.ts`, `useShortcuts.ts`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`

- [ ] **Step 1: Failing tests.** `session.test.ts`, "disarms on any touch of the canvas" becomes:

```ts
it("disarms on any touch of the canvas, and on Escape", () => {
  expect(run(start, ink, tap(1000), { type: "canvas-touch" }).phase).toBe("drawing");
  expect(run(start, ink, tap(1000), { type: "escape" }).phase).toBe("drawing");
});
```

`DrawingScreen.test.tsx`, first in `describe("the armed seal chip's 18+ box")` (it has `openArmed` and `armed`):

```tsx
it("disarms at Escape, so the next tap only arms it again", async () => {
  await openArmed();
  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
  expect(armed()).toBe(false);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/session/session.test.ts src/sticker-creation/DrawingScreen.test.tsx` → both fail.
- [ ] **Step 3: Implement.** `session.ts`, after `| { type: "canvas-touch" }`:

```ts
  /** Escape: the seal key disarms, as at a touch on the sheet. */
  | { type: "escape" }
```

and `case "escape":` between `case "canvas-touch":` and `case "clear":` in `transition`. `useShortcuts.ts`: `Shortcuts` gains, after `closePanel`,

```ts
  /** Takes back the seal key's first tap. */
  disarm: () => void;
```

the hook's comment becomes

```ts
/**
 * The drawing screen's keys: ⌘Z and ⇧⌘Z (or ⌘Y), B, E and G for the tools, [ and ] for the size, and
 * Escape, which closes a panel and disarms the seal key.
 */
```

and the Escape branch calls `s.closePanel();` then `s.disarm();`. `DrawingScreen.tsx`'s `useShortcuts({ … })` gains `disarm: () => send({ type: "escape" }),` after `closePanel`.

- [ ] **Step 4:** The same tests and typecheck → pass.
- [ ] **Step 5:** Commit: `fix(frontend): Escape disarms the seal check`

### Task 10: The drawing hand, kept on the device

**Files:** Create `src/ui/deviceSetting.ts`, `src/ui/deviceSetting.test.ts`, `src/sticker-creation/drawingSettings.ts`

- [ ] **Step 1: Failing test,** `ui/deviceSetting.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSetting } from "./deviceSetting";
import { refusingStorage } from "./testing";

/** The setting as a page opens it: what this device keeps, read afresh. */
const opened = () =>
  deviceSetting<"a" | "b">("test.setting", {
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

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/ui/deviceSetting.test.ts` → fails: no `./deviceSetting`.
- [ ] **Step 3: `ui/deviceSetting.ts`:**

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

- [ ] **Step 4: `sticker-creation/drawingSettings.ts`:**

```ts
import { useSyncExternalStore } from "react";
import { deviceSetting } from "../ui/deviceSetting";

/*
 * Settings' Drawing group, kept on this device rather than the account, since each suits a device and
 * the hand that draws on it. Each `keep…` applies at once and says whether the device kept it.
 */

export const DRAWING_HANDS = ["right", "left"] as const;
export type DrawingHand = (typeof DRAWING_HANDS)[number];

/** The hand that draws, which Left mirrors the drawing screen for. Anything but Left is Right. */
const hand = deviceSetting<DrawingHand>("draw.hand", {
  parse: (text) => (text === "left" ? "left" : "right"),
  serialize: (value) => (value === "left" ? "left" : null),
  name: "The drawing hand",
});

export const useDrawingHand = (): DrawingHand => useSyncExternalStore(hand.subscribe, hand.get);
export const keepDrawingHand = (value: DrawingHand): boolean => hand.set(value);
```

- [ ] **Step 5:** The test and typecheck → pass.
- [ ] **Step 6:** Commit: `feat(frontend): the drawing hand, kept on the device`

### Task 11: Settings' Drawing group

**Files:** Create `src/sticker-board/stat-board/ChoiceRow.tsx`, `DrawingSettings.tsx`, `DrawingSettings.test.tsx`; modify `SettingsNote.tsx`, `SettingsNote.test.tsx`, `src/i18n/strings/stickerBoard.ts`, `src/i18n/glossary.md`

- [ ] **Step 1: Failing test,** `stat-board/DrawingSettings.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { keepDrawingHand, type DrawingHand } from "../../sticker-creation/drawingSettings";
import { refusingStorage } from "../../ui/testing";
import { DrawingSettings } from "./DrawingSettings";

const words = stickerBoard.settings.drawing;
let unmount = () => {};

afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // A refused write holds until the page goes, and the next test would see it.
  keepDrawingHand("right");
  localStorage.clear();
});

/** The Drawing group as Settings shows it. */
function render() {
  const view = renderWithApi(<DrawingSettings />);
  unmount = view.unmount;
  return view.host;
}

/** Picks a drawing hand from the row's list, as the device's own picker does. */
const pick = (host: HTMLElement, hand: DrawingHand) =>
  act(() => {
    const select = host.querySelector("select");
    if (!select) throw new Error("No drawing hand row");
    select.value = hand;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

/** The hand the row shows at its end. */
const shown = (host: HTMLElement) => host.querySelector(".settings-note__picked")?.textContent;

describe("Settings' Drawing group", () => {
  it("keeps the drawing hand on this device for the next visit, and says so", () => {
    const host = render();
    expect(shown(host)).toBe(words.hand.right.en);
    pick(host, "left");
    expect(shown(host)).toBe(words.hand.left.en);
    expect(host.querySelector('[role="status"]')?.textContent).toBe(words.kept.en);
    unmount();
    expect(shown(render())).toBe(words.hand.left.en);
  });

  it("says when this device couldn't keep the drawing hand, which still applies until Croquis closes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
    const host = render();
    pick(host, "left");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(words.notKept.en);
    expect(shown(host)).toBe(words.hand.left.en);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board/DrawingSettings.test.tsx` → fails: no `./DrawingSettings`.
- [ ] **Step 3: The strings,** `stickerBoard.ts`, in `settings` after `kyotoSeika`:

```ts
    /** The Drawing group, after the entrance exam: settings this device keeps for drawing, not your account. */
    drawing: {
      /** Settings note: the legend over the Drawing group, the drawing screen's settings this device keeps */
      title: { en: "Drawing", ja: "かく画面" },
      /** The drawing hand: Left mirrors the drawing screen. */
      hand: {
        /** Settings note, Drawing group: the drawing hand row's name; a tap opens the choice of Right or Left */
        label: { en: "Drawing hand", ja: "利き手" },
        /** Settings note, Drawing group: the drawing hand choice for the right hand, the default */
        right: { en: "Right", ja: "右手" },
        /** Settings note, Drawing group: the drawing hand choice for the left hand, which mirrors the drawing screen */
        left: { en: "Left", ja: "左手" },
      },
      /** Settings note, Drawing group: the status line once a drawing setting has changed, which this device keeps rather than your account */
      kept: { en: "Kept on this device.", ja: "この端末に保存しました。" },
      /** Settings note, Drawing group: the alert when this device couldn't keep a drawing setting, which still applies until Croquis closes */
      notKept: {
        en: "This device couldn’t keep that, so it lasts until you close Croquis.",
        ja: "この端末に保存できなかったため、クロッキーを閉じるまでの設定になります。",
      },
    },
```

`glossary.md`, after the "two fingers" row:

```
| Drawing (Settings' group)          | かく画面                               | The drawing screen's settings, kept on the device                                     |
| drawing hand                       | 利き手                                 | Right 右手, Left 左手; Left mirrors the drawing screen                                |
```

- [ ] **Step 4: One choice row,** `stat-board/ChoiceRow.tsx` (the Pencil plan's rows use it too):

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

If Phase 0 left Language's row as this same markup inline in `SettingsNote.tsx`, move it onto `ChoiceRow` in this commit (its `<option>`s keep `lang`: add an optional `langOf?: (choice: T) => string | undefined` prop then, applied to the picked span and each option).

- [ ] **Step 5: The group,** `stat-board/DrawingSettings.tsx`:

```tsx
import { useState } from "react";
import { useTranslation } from "../../i18n/react";
import {
  DRAWING_HANDS,
  keepDrawingHand,
  useDrawingHand,
  type DrawingHand,
} from "../../sticker-creation/drawingSettings";
import { ErrorLine } from "../../ui/ErrorLine";
import { ChoiceRow } from "./ChoiceRow";

/**
 * Settings' Drawing group: the drawing screen's settings, kept on this device rather than your
 * account, since each suits a device and the hand that draws on it. A change applies at once, and the
 * status line says it's kept; one the device couldn't keep says so and lasts until Croquis closes.
 */
export function DrawingSettings() {
  const { t } = useTranslation();
  const hand = useDrawingHand();
  // Whether the device kept the last change; null until something changes.
  const [kept, setKept] = useState<boolean | null>(null);
  const handName = (each: DrawingHand) => t(($) => $.stickerBoard.settings.drawing.hand[each]);
  return (
    <fieldset className="settings-note__setting" data-setting="drawing">
      <legend className="fine settings-note__legend">
        {t(($) => $.stickerBoard.settings.drawing.title)}
      </legend>
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.drawing.hand.label)}
        choices={DRAWING_HANDS}
        value={hand}
        nameOf={handName}
        onChoose={(each) => setKept(keepDrawingHand(each))}
      />
      <p className="fine settings-note__status" role="status">
        {kept ? t(($) => $.stickerBoard.settings.drawing.kept) : ""}
      </p>
      {kept === false && (
        <ErrorLine className="settings-note__problem">
          {t(($) => $.stickerBoard.settings.drawing.notKept)}
        </ErrorLine>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 6: On the card.** `SettingsNote.tsx` imports `DrawingSettings` from `./DrawingSettings` and renders `<DrawingSettings />` after its last setting, inside `.stat-board__paper`; its doc comment ends "The Drawing group (`DrawingSettings`) is this device's own." `SettingsNote.test.tsx`: the group adds one legend and one status line, both last. A test listing every legend ("reads in Japanese") gains `"かく画面"` at its end; every `statuses(host)` array compared whole gains a trailing `""`.
- [ ] **Step 7:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board` and typecheck → pass. `serialize: () => null` in `drawingSettings.ts` turns both new tests red; dropping the `ErrorLine` turns the second.
- [ ] **Step 8:** Commit: `feat(frontend): Settings' Drawing group, with the drawing hand`

### Task 12: Left mirrors the drawing screen

**Files:** `src/sticker-creation/DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `DrawingScreen.css`, `tools/ColorSheet.css`

- [ ] **Step 1: Failing test,** at the end of `DrawingScreen.test.tsx` (import `keepDrawingHand` from `./drawingSettings`):

```tsx
describe("the drawing hand", () => {
  it("mirrors the drawing screen at once when Left is chosen, with no reload", async () => {
    reopen(keptHalfway);
    await settle();
    const hand = () => document.querySelector(".drawing-screen")?.getAttribute("data-hand");
    expect(hand()).toBe("right");
    act(() => void keepDrawingHand("left"));
    expect(hand()).toBe("left");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/DrawingScreen.test.tsx` → fails: no `data-hand`.
- [ ] **Step 3: The attribute.** `DrawingScreen.tsx` imports `useDrawingHand` from `./drawingSettings`; `const hand = useDrawingHand();` after `const large = useLargeScreen();`; the root `div` takes `data-hand={hand}` before `style`. Its doc comment:

```ts
/**
 * The drawing screen: a white sheet on the Liner, the timer and the tools in one row across the top.
 * On a phone the size rail runs down the left edge, undo and redo sit at the bottom left and the seal
 * key at the bottom right; on a large screen the rail, undo and redo and the seal key stack in a slim
 * sidebar at the left edge. A left drawing hand mirrors both. It owns the session (tickets, the clock
 * and the seal step); the ink engine owns the drawing.
 */
```

- [ ] **Step 4: The phone's mirror,** `DrawingScreen.css`, before the large block:

```css
/* ---------- Drawing hand: Left mirrors the screen, so the drawing hand never rests on a control. The
   rail, undo and redo and the seal check go to the right; the tools to the top left, the timer to the
   top right. Each control keeps its own reading order. */
.drawing-screen[data-hand="left"] > .drawing-top {
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

.drawing-screen[data-hand="left"] .timer-hint-arrow {
  scale: -1 1;
}

.drawing-screen[data-hand="left"] .timer-hint-label {
  margin: 18px -2px 0 0;
  transform-origin: 100% 0;
}

/* The wide dot grows from its top-right corner, away from the screen's edge. */
.drawing-screen[data-hand="left"] .timer-dot.is-wide {
  translate: -4px 4px;
}

.drawing-screen[data-hand="left"] > :is(.smoothing-bar, .clear-bar) {
  left: 14px;
  right: auto;
}

.drawing-screen[data-hand="left"] > .size-rail {
  left: auto;
  right: 0;
}

/* The rail's number grows left for two digits, away from the screen's edge. */
.drawing-screen[data-hand="left"] .size-num {
  left: auto;
  right: 7px;
  transform-origin: 100% 100%;
}

.drawing-screen[data-hand="left"] > .history-buttons {
  left: auto;
  right: 18px;
}

.drawing-screen[data-hand="left"] > .drawing-start-over {
  left: auto;
  right: 18px;
  justify-content: flex-end;
  text-align: right;
}

.drawing-screen[data-hand="left"] > .key.seal-key {
  left: 18px;
  right: auto;
}

/* The chip opens right of the check, its 18+ box at the end away from it. */
.drawing-screen[data-hand="left"] > .seal-chip {
  --chip-away: flex-end;
  --chip-from: -6px;
  left: 88px;
  right: auto;
}

/* Kyoto Seika's corner print stays over the seal check, and the deal tucks toward it. */
.drawing-screen[data-hand="left"] .corner-print {
  left: 39px;
  right: auto;
  translate: -50% 0;
}

.drawing-screen[data-hand="left"] > .kyoto-seika-deal {
  transform-origin: 40px calc(100% - 270px);
}
```

- [ ] **Step 5: The large screen's mirror,** last in the large block (these beat the phone's rules above by coming later at the same specificity):

```css
/* Left: the sidebar at the right edge, its chip opening left over the sheet. */
.drawing-screen[data-hand="left"] > .drawing-top {
  left: 8px;
  right: 8px;
}

.drawing-screen[data-hand="left"] > .ink-area {
  inset: var(--top-h) var(--edge-w) var(--foot) 8px;
}

.drawing-screen[data-hand="left"] > .size-rail {
  left: auto;
  right: calc((var(--edge-w) - 40px) / 2);
}

.drawing-screen[data-hand="left"] > .history-buttons {
  left: auto;
  right: calc((var(--edge-w) - 46px) / 2);
}

.drawing-screen[data-hand="left"] > .drawing-start-over {
  left: auto;
  right: 4px;
  justify-content: center;
  text-align: center;
}

.drawing-screen[data-hand="left"] > .key.seal-key {
  left: auto;
  right: calc((var(--edge-w) - 58px) / 2);
}

.drawing-screen[data-hand="left"] > .seal-chip {
  --chip-away: flex-start;
  --chip-from: 6px;
  left: auto;
  right: calc(var(--edge-w) + 4px);
}

.drawing-screen[data-hand="left"] > :is(.smoothing-bar, .clear-bar) {
  left: 8px;
  right: auto;
}
```

`ColorSheet.css`, in its large block after the popover's rule:

```css
.drawing-screen[data-hand="left"] .bottom-sheet.color-sheet {
  inset: var(--top-h) auto auto 8px;
}
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` and typecheck → pass. A hand read once (`useState(hand.get)`) instead of `useSyncExternalStore` turns the new test red.
- [ ] **Step 7:** Commit: `feat(frontend): a left drawing hand mirrors the drawing screen on phones and iPads`

### Task 13: Check it in WebKit and Chromium

Scratch only, in `data/scratch/ipad-drawing/`. The scripts were run in Chromium against the trial port and passed; their copies are in `.claude/worktrees/ipad-research/data/scratch/ipad-drawing/` (`lib.js`, `layout.js`, `sameSize.js`, `rotate.js`): copy them here. If that folder is gone, write them from the checks below.

- [ ] **Step 1: Can WebKit open a page here?** `pnpm --filter frontend exec playwright install webkit chromium`, then `(cd apps/frontend && node -e 'import("@playwright/test").then(async ({ webkit }) => { const b = await webkit.launch(); const p = await b.newPage(); await p.goto("data:text/html,<p>ok"); console.log(await p.textContent("p")); await b.close(); })')` prints `ok`. On 2026-10-08 it didn't on this Mac (the e2e config gates WebKit for the same reason): tell the coordinator, run Chromium meanwhile, and run WebKit once the probe prints `ok`. Still not by the merge: merge without WebKit and list it as owed.
- [ ] **Step 2: Servers of its own,** on 5192 and 8792 (check `lsof -nP -iTCP -sTCP:LISTEN` first), in the background from the worktree's root. API: `D="$PWD/data/scratch/ipad-drawing" && mkdir -p "$D/images" && (cd apps/api && PORT=8792 DATABASE_URL="$D/drawing-app.db" IMAGE_DIR="$D/images" IMAGE_BASE_URL=http://localhost:5192/api/images DEV_SIGN_IN=on STICKER_CHAIN_MODE=mock node --env-file=.env.example src/server.ts)`. Vite: `(cd apps/frontend && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on node_modules/.bin/vite --config vite.ipad-drawing.config.ts)`, from an untracked `vite.ipad-drawing.config.ts` that `mergeConfig`s `./vite.config.ts` with `server: { port: 5192, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:8792" } } }`.
- [ ] **Step 3: Run,** each with `webkit` and with `chromium`: `DRAW_BASE=http://localhost:5192 PLAYWRIGHT_CORE=$(cd apps/frontend && node -p 'require.resolve("@playwright/test")') node data/scratch/ipad-drawing/<script>.js <engine>` (`lib.js` takes `chromium` and `webkit` from whatever `PLAYWRIGHT_CORE` names). Each prints PASS or FAIL lines and exits 1 on a FAIL; captures land in `data/scratch/ipad-drawing/shots/`.
  - `layout.js`, at 390×844 Right and Left, 820×1094 Right, 1180×734 Right and Left: the sheet fits its area, centered; the tools on the drawing hand's side and the timer opposite; on a phone the rail, undo and redo and the check where the hand puts them (Right: rail at 0, undo 18 in, check 18 from the right; Left: the same from the other side) and the grabber at the foot; on an iPad the rail, undo and redo and the check inside the 76px sidebar away from the hand, the sheet's area under the 62px top bar beside it, My board centered, no grabber. Armed, the chip opens from the check toward the sheet and its 18+ box sits at the end away from the check. Colors: a bottom sheet at most about half the drawing screen on a phone; on an iPad a popover 62px down at the strip's outer edge, closed by a tap on the sidebar's Liner. On an iPad, My board then Draw bring back the same ink, the same kept frame and steps, and no ticket spent. Captures: `drawn-`, `armed-`, `color-`, `board-`, `resumed-<engine>-<size>-<hand>.png`.
  - `sameSize.js`: one pen loop in sheet units, sealed at 390×844, 1180×734 and 820×1094: the same long side, the short side within 1%, the place on the sheet within 3 units. Trial: frames 374×772 @3, 617×374 @3.55, 374×520 @3.935; stickers 704×599, 704×598, 704×597.
  - `rotate.js`: three strokes at 820×1094, the last low on the portrait sheet; turned to 1180×734 and back, the ink's pixels untouched, the frame kept and the paper fitted, centered; reloaded in landscape, the same frame and ink within 1%; sealed, the timelapse's sheet is the frame and the sticker holds every stroke.
  - Kyoto Seika, by hand in the browser (Settings' entrance exam on, Draw, Begin): at 390×844 and 1180×734, Right and Left, armed, `seika-<size>-<hand>.png`: the corner print over the check on a phone, in the sheet's bottom corner on the hand's side on an iPad, never under the chip.
- [ ] **Step 4:** Look at every capture, both engines. Fix what they show in one batch, rerun the failing script once, stop both servers, delete `vite.ipad-drawing.config.ts`, and commit any fix: `fix(frontend): the drawing screen holds at every checked size and hand`. Keep `shots/` until ad0ll has seen them.

### Task 14: Docs

**Files:** `DESIGN.md`, `PRODUCT.md`, as Phase 0 and foundations left them; only the sentences this plan makes false, plus its own.

- [ ] **Step 1: DESIGN.md's Draw screen.**
  - After "The canvas is just for drawing.", a first bullet: "**Sheet:** white paper inside thin Liner margins. A drawing keeps the shape its sheet took at the first mark, and turning the screen or resizing the window scales it to fit, centered, so strokes, brush sizes and the sticker's white border are the same on every screen."
  - **Size rail:** "with a live number of the brush size in px" becomes "with a live number of the brush size in the sheet's px, a 390px phone's, so a size draws the same on any screen".
  - **Paused hint:** after "arrow-bend-left-up (bold, 28px)" add "(mirrored for a left hand)".
  - New bullets after **Foot**: "**Large screens:** a slim top bar holds the timer, My board (small label stock, one tap to your board, where Draw picks the drawing back up) and the tools; a 76px sidebar at the edge away from the drawing hand holds the size rail (shorter, with no px number: its thumb's tip shows the size), undo over redo, and the seal check at its foot, whose armed chip opens over the sheet. The sheet takes everything else. Colors open as a 360px popover under the tool strip, at its outer edge, with no tear strip; a tap outside closes it." and "**Drawing hand:** Left, in Settings, mirrors the screen on phones and iPads: the rail, undo and redo and the seal check go right, its chip opening toward the sheet with the 18+ box at its far end; the tools go top left and the timer top right. Each control keeps its reading order: undo still comes before redo."
  - **Keep drawing:** "down toward the Board grabber, 70% of the screen" becomes "down 70% of the screen, toward the Board grabber on a phone".
- [ ] **Step 2: DESIGN.md elsewhere.** The deal's **corner print**: "centered over the seal check just above it" becomes "in the sheet's bottom corner on the drawing hand's side: on a phone centered over the seal check, just above it, and on a large screen the corner away from the sidebar"; "The armed chip opens left of the check, so it never covers them." becomes "The armed chip never covers them." Index tabs' **Tucked:** append "On a large screen the drawing screen's top bar holds My board instead." Layout, after "The draw and seal screens use this, so the canvas gets the room.": "On a large screen the drawing screen has no grabber: My board in its top bar goes straight to the board." Settings (the stat board): after the entrance exam's sentences, "Last, Drawing: Drawing hand as one row showing Right or Left, the device's own list unseen over it, as Language's. It's kept on this device, not the account, so its status line says so."
- [ ] **Step 3: PRODUCT.md.** Tools: append "The sheet is the same on every device, shown scaled to fit, so a sticker comes out the same from a phone or an iPad, and turning an iPad mid-drawing keeps its shape. A left drawing hand, in Settings, mirrors the drawing screen." The stat board's Settings list gains "the drawing hand" after Kyoto Seika Manga Expression Practice Mode.
- [ ] **Step 4:** Commit: `docs: one sheet for every device, the large drawing screen, My board and the drawing hand`

### Task 15: Check, squash and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, format and the Move tests pass. `pnpm --filter frontend test:e2e` → passes (the core loop and Kyoto Seika specs draw and seal on the ported sheet).
- [ ] **Step 2:** Squash, with no AI attribution lines: `feat(frontend): one sheet for every device, in sheet units, scaled to fit` (Tasks 1–6), `feat(frontend): the large drawing screen, My board in its top bar, and Escape disarms the seal check` (7–9), `feat(frontend): the drawing hand, in Settings' Drawing group, mirrors the drawing screen` (10–12, Task 13's fixes), `docs: one sheet for every device, the large drawing screen, My board and the drawing hand`.
- [ ] **Step 3:** In the main checkout, in one command: fast-forward main, merge the branch, push.
- [ ] **Step 4:** Tick this plan's boxes on main and leave it there (the small-windows plan deletes it with the brief). Hand the coordinator the captures and anything Task 13 left owed, then remove the worktree, its scratch with it, and the branch.

## Open

1. **The drawing hand's control:** a choice row with the device's list (Language's pattern, this plan) or a two-way segment; and whether "Kept on this device." belongs in its status line.
2. **The corner print on an iPad:** the sheet's bottom corner on the drawing hand's side (this plan) or beside the sidebar's check.
3. **Language's row onto `ChoiceRow`:** done in Task 11 only if Phase 0's markup matches; otherwise Phase 0's row stays inline.
4. **E2E coverage:** `sameSize.js` and `rotate.js` check the sheet's core promise; whether they become specs in `apps/frontend/e2e/` (Chromium only today) or stay scratch.
5. **WebKit:** it couldn't open pages on this Mac on 2026-10-08; the trial's WebKit capture (390×844 Left) predates that. Task 13 owes both engines.
6. **Left's top right corner:** the wide timer and its PAUSED tag sit a few px from the screen's right edge at 1180×734 (seen in a trial capture, not measured); check the captures, and pull the top bar in if the tag clips.

## Self-review

- **Brief coverage:** one sheet for every device, 374 units, the long side from the first mark, scaled to fit, strokes, sizes and border in units (Tasks 1–6); turning mid-drawing keeps the shape and a blank sheet follows the screen (Task 2's engine tests, Task 13's `rotate.js`); the slim top bar (timer, My board, tools) and slim sidebar (rail, undo and redo, the seal check with its chip and 18+ box opening toward the sheet), the sheet taking the rest (Tasks 7, 8); colors as a popover under the tool strip (Task 8); My board in one tap, the drawing kept and Draw resuming it (Task 7, Task 13's `layout.js`); the drawing hand in Settings, on the device, Right by default, Left mirroring phones and iPads (Tasks 10–12); phones unchanged but for the hand (the phone checks in `layout.js`); Escape (Task 9, the coordinator's addition).
- **Ports:** every sha the task named, with its `git show`, its conflicts on main and its test: 609020e0, 5f4c2085, bd02a3b3, b9caf92b, 1f96da7f, 8cab7634 (Tasks 1–6), c34494ea (Task 7, plus 0a45a528's App.css hunk), 3ee8ba5c, 0a45a528, 696123ba (Task 8). Not taken: 0a45a528's and c34494ea's `TabBar.css` grabber hunks (replaced by `.tab-home`), the draft's `.nsfw-toggle` rule, 911d56e4's Clear bar size (not this plan's).
- **Placeholder scan:** no TBD. Two run-time choices, each with its rule: Task 7 Step 1 (TabBar's merge if foundations differs from the draft) and Task 11 Step 4 (Language's row).
- **Names:** `deviceSetting`, `DRAWING_HANDS`, `DrawingHand`, `useDrawingHand`, `keepDrawingHand`, `ChoiceRow`, `DrawingSettings`, `stickerBoard.settings.drawing.*`, `data-hand`, `--chip-away`, `--chip-from`, `escape`, `disarm`, storage key `draw.hand`, all as the Pencil plan expects.
- **Tests that can fail:** each new test was turned red in the trial by the edit its task names (Tasks 7, 8, 9, 11, 12, and both `deviceSetting` tests by dropping the notification or the held value).
