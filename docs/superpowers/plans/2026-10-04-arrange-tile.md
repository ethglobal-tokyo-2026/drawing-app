# Arrange Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The selected sticker's Arrange row stops taking room on every selection: one Arrange tile ends the toolbar's row and opens the step tiles, which repeat while held and are read out once they settle.

**Architecture:** `StickerToolbar` takes one `arrange` prop (`open`, `onOpen`, `onStep`) in place of `onArrange`. `StickerBoard` keeps `open`, remembered per person on the device (`arrangeOpen.ts`). `useHeldRepeat` gives a step tile its hold-to-repeat. `useBoardGestures` reports the last step of a run when the run settles, and whether it moved the sticker; `StickerBoard` reads that out through a status line.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS, the i18n catalog, Playwright (Chromium and WebKit) for the browser checks.

---

## Decisions (approved by ad0ll)

1. Arrange's eight step tiles hide behind one Arrange tile at the end of Give · View · Remove: a flat tile with Phosphor's arrows-out-cardinal (`ArrangeIcon`), bold while closed, fill and reversed out of Ink while open, as Smoothing is on the drawing screen. They stay in the app: keys alone don't satisfy WCAG 2.5.7.
2. Open, the step tiles sit in two rows of four, each 44px to touch: Move left, up, down, right; then Smaller, Bigger, Turn left, Turn right. They open on the side of the toolbar's row away from the sticker, so opening them doesn't move the row.
3. Open or closed is kept per person on the device; closed until first opened.
4. A held step tile repeats its step after `HOLD_DELAY_MS`, every `REPEAT_MS`, then every `FAST_REPEAT_MS` once held `FAST_AFTER_MS`, as iOS steppers do. A tap, Enter or Space takes one step. A hold that repeated swallows its release's click. Sliding `SLOP_OUT` past the tile stops it. No long-press callout, selection or menu.
5. A run of steps, from tiles or keys, is read out once it settles (`STEP_SAVE_IDLE_MS`, when it saves): what the last step did, or that the board's edge or a size limit stopped it. The same words twice in a row are read twice.
6. The toolbar's row, Arrange tile included, fits one line on a 360px phone in both languages: the toolbar's labels give up side padding and icon gap, by measurement.
7. In passing: the tiles' pressed shade is mixed from Ink instead of a hard-coded rgba.

Starting timings, unverified guesses to tune by feel: `HOLD_DELAY_MS` 400, `REPEAT_MS` 100, `FAST_REPEAT_MS` 50, `FAST_AFTER_MS` 1500.

## Files

- Modify `apps/frontend/src/i18n/strings/stickerBoard.ts`: the Arrange tile's label comment; `moved` and `stopped` read-outs
- Modify `apps/frontend/src/icons/index.tsx`: `ArrangeIcon`
- Modify `apps/frontend/src/ui/press.ts`: export `SLOP_OUT` and `SWALLOW_MS`
- Create `apps/frontend/src/ui/useHeldRepeat.ts`
- Modify `apps/frontend/src/sticker-board/useBoardGestures.ts` and its test: `SettledStep`, `onStepsSettled`
- Create `apps/frontend/src/sticker-board/arrangeOpen.ts`
- Modify `apps/frontend/src/sticker-board/StickerToolbar.tsx` and its test: `arrange` prop, Arrange tile, `StepTile`, the step tiles' side
- Modify `apps/frontend/src/sticker-board/StickerBoard.tsx` and its test: open state, read-outs
- Modify `apps/frontend/src/sticker-board/StickerBoard.css`
- Modify `DESIGN.md`

Someone else's board (`ArtistBoard`) passes no `arrange`, so it keeps a toolbar with no Arrange.

## Setup

- [ ] `git worktree add -b feat/arrange-tile .claude/worktrees/arrange-tile origin/main`, then `pnpm install` in it. Every command below runs from the worktree root.

### Task 1: The Arrange tile's strings and icon

**Files:** Modify `apps/frontend/src/i18n/strings/stickerBoard.ts` (the `toolbar.arrange` block), `apps/frontend/src/icons/index.tsx`

- [ ] **Step 1: Replace the head of `toolbar.arrange` and add the read-outs after `turnRight`**

```ts
    /** The toolbar's Arrange tile and the step tiles it opens, which arrange the selected sticker without dragging it: each names what one press does. */
    arrange: {
      /** Your sticker board, a sticker selected: the toolbar's Arrange tile, which shows or hides the step tiles, and screen readers' name for their group */
      label: { en: "Arrange", ja: "配置を変える" },
      // left … turnRight stay as they are
      /** What the last of a run of steps did, read out by screen readers once the run settles. */
      moved: {
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it left */
        left: { en: "Moved left", ja: "左へ動かしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it right */
        right: { en: "Moved right", ja: "右へ動かしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it up */
        up: { en: "Moved up", ja: "上へ動かしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it down */
        down: { en: "Moved down", ja: "下へ動かしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having made it smaller */
        smaller: { en: "Made smaller", ja: "小さくしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having made it bigger */
        bigger: { en: "Made bigger", ja: "大きくしました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having turned it counterclockwise */
        turnLeft: { en: "Turned left", ja: "左に回しました" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having turned it clockwise */
        turnRight: { en: "Turned right", ja: "右に回しました" },
      },
      /** What stopped the last of a run of steps from changing anything, read out once the run settles. Nothing stops a turn. */
      stopped: {
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's left edge */
        left: { en: "It's at the left edge", ja: "左端です" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's right edge */
        right: { en: "It's at the right edge", ja: "右端です" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's top edge */
        up: { en: "It's at the top edge", ja: "上端です" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's bottom edge */
        down: { en: "It's at the bottom edge", ja: "下端です" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the smallest a sticker goes */
        smaller: { en: "It's as small as it goes", ja: "これ以上小さくできません" },
        /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the biggest a sticker goes */
        bigger: { en: "It's as big as it goes", ja: "これ以上大きくできません" },
      },
    },
```

- [ ] **Step 2: Add `ArrangeIcon`** to `icons/index.tsx`: `ArrowsOutCardinal` joins the top import from `@phosphor-icons/react`, and after `RemoveIcon`:

```tsx
/** Arrange: the selected sticker's toolbar tile that opens its step tiles. */
export const ArrangeIcon = (props: IconProps) => (
  <ArrowsOutCardinal aria-hidden focusable="false" {...props} />
);
```

- [ ] **Step 3:** `pnpm -C apps/frontend typecheck` → passes.
- [ ] **Step 4:** Commit: `feat: the Arrange tile's strings and icon`

### Task 2: A run of steps reports how it settled

**Files:** Modify `apps/frontend/src/sticker-board/useBoardGestures.ts`, `apps/frontend/src/sticker-board/useBoardGestures.test.tsx`

- [ ] **Step 1: Write the failing test**, in `describe("steps, from keys and from Arrange")`:

```tsx
it("tell the last of a run once it settles, and that the board's edge stopped it", () => {
  const onStepsSettled = vi.fn<NonNullable<Options["onStepsSettled"]>>();
  board(() => {}, { onStepsSettled });
  pressRight(3);
  expect(onStepsSettled).not.toHaveBeenCalled();
  act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
  expect(onStepsSettled).toHaveBeenCalledExactlyOnceWith({ step: "right", moved: true });

  // More presses than the field has pixels: the last ones can't move it.
  pressRight(fieldOf(390, 657).w);
  act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
  expect(onStepsSettled).toHaveBeenLastCalledWith({ step: "right", moved: false });
});
```

- [ ] **Step 2:** `pnpm -C apps/frontend exec vitest run src/sticker-board/useBoardGestures.test.tsx` → fails: `onStepsSettled` isn't an option.
- [ ] **Step 3: Implement.** After `type Live`:

```ts
/**
 * The last of a run of steps, once the run has gone quiet: whether it moved the sticker, or the
 * board's edge or a size limit stopped it. Nothing stops a turn.
 */
export type SettledStep =
  { step: Step; moved: true } | { step: Exclude<Step, "turnLeft" | "turnRight">; moved: false };

const isTurn = (step: Step): step is "turnLeft" | "turnRight" =>
  step === "turnLeft" || step === "turnRight";
/** A step that changes a spot by less than this changed nothing. */
const STILL = 1e-3;
const stayed = (a: Live, b: Live) =>
  Math.abs(a.x - b.x) < STILL && Math.abs(a.y - b.y) < STILL && Math.abs(a.s - b.s) < STILL;
```

In `Options`:

```ts
  /** A run of steps, from keys or Arrange's tiles, gone quiet and saved: the last of them. */
  onStepsSettled?: (last: SettledStep) => void;
```

In the effect, `stepped` carries the last step, and the idle timer settles instead of only saving:

```ts
let stepped: {
  id: string;
  el: HTMLElement;
  live: Live;
  last: SettledStep;
  timer: number;
} | null = null;
// saveSteps stays as it is.
/** Steps gone quiet: saved, and the last of them told. */
const settle = () => {
  const last = stepped?.last;
  saveSteps();
  if (last) latest.current.onStepsSettled?.(last);
};
const step = (id: string, by: Step) => {
  // … unchanged down to `draw(el, sticker, live);`
  if (stepped) clearTimeout(stepped.timer);
  const last: SettledStep =
    isTurn(by) || !stayed(from, live) ? { step: by, moved: true } : { step: by, moved: false };
  stepped = { id, el, live, last, timer: window.setTimeout(settle, STEP_SAVE_IDLE_MS) };
};
```

The other `saveSteps()` calls (another sticker stepped, Escape, blur, unmount, Remove) save without telling.

- [ ] **Step 4:** Run the same test file → passes.
- [ ] **Step 5:** Commit: `feat: a run of steps tells the board how it settled`

### Task 3: The Arrange tile opens the step tiles

**Files:** Modify `apps/frontend/src/sticker-board/StickerToolbar.tsx`, `apps/frontend/src/sticker-board/StickerToolbar.test.tsx`

- [ ] **Step 1: Write the failing tests.** Replace the file's `describe` with:

```tsx
import { stickerBoard } from "../i18n/strings/stickerBoard";

const arrangeStrings = stickerBoard.toolbar.arrange;
const arrangeTile = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>(".sticker-toolbar__arrange-toggle");
const tiles = (host: HTMLElement) => buttons(host, '[role="group"]');
const arranging = (
  open: boolean,
  onStep: (step: Step) => void = () => {},
  onOpen: (open: boolean) => void = () => {},
) => ({ arrange: { open, onOpen, onStep } });

describe("StickerToolbar's Arrange", () => {
  it("keeps the step tiles in until the Arrange tile is pressed, and says whether they're out", () => {
    const onOpen = vi.fn<(open: boolean) => void>();
    const closed = show(arranging(false, () => {}, onOpen));
    expect(arrangeTile(closed)?.getAttribute("aria-expanded")).toBe("false");
    expect(tiles(closed)).toEqual([]);
    act(() => arrangeTile(closed)?.click());
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(true);

    unmount();
    const open = show(arranging(true));
    expect(arrangeTile(open)?.getAttribute("aria-expanded")).toBe("true");
    expect(open.querySelector('[role="group"]')?.id).toBe(
      arrangeTile(open)?.getAttribute("aria-controls"),
    );
  });

  it("opens a tile for every step, each taking the step it's named for once, for those who can't drag", () => {
    const onStep = vi.fn<(step: Step) => void>();
    const host = show(arranging(true, onStep));
    const taken = tiles(host).map((tile) => {
      act(() => tile.click());
      return { label: tile.getAttribute("aria-label"), step: onStep.mock.lastCall?.[0] };
    });
    expect(taken.map((t) => t.step).sort()).toEqual(Object.keys(arrangeStrings.moved).sort());
    expect(taken.map((t) => t.label)).toEqual(
      taken.map((t) => t.step && arrangeStrings[t.step].en),
    );
  });

  it("is left off a board that can't be rearranged", () => {
    const host = show();
    expect(arrangeTile(host)).toBeNull();
    expect(tiles(host)).toEqual([]);
    expect(host.querySelector('[role="toolbar"]')?.textContent).toContain("View");
  });
});
```

- [ ] **Step 2:** `pnpm -C apps/frontend exec vitest run src/sticker-board/StickerToolbar.test.tsx` → fails: there's no `arrange` prop and no Arrange tile.
- [ ] **Step 3: Implement.** `onArrange` gives way to:

```ts
  /**
   * Arrange, for a press instead of a drag: whether its step tiles are out (the board keeps that, so
   * it holds for the next selection), and the step each takes. Someone else's board has none.
   */
  arrange?: { open: boolean; onOpen: (open: boolean) => void; onStep: (step: Step) => void };
```

`ARRANGE` reads by rows:

```ts
/** Arrange's step tiles in the order they read: moves on the first row, sizes and turns on the second. */
const ARRANGE: readonly { step: Step; Glyph: Icon }[] = [
  { step: "left", Glyph: CaretLeft },
  { step: "up", Glyph: CaretUp },
  { step: "down", Glyph: CaretDown },
  { step: "right", Glyph: CaretRight },
  { step: "smaller", Glyph: Minus },
  { step: "bigger", Glyph: Plus },
  { step: "turnLeft", Glyph: ArrowCounterClockwise },
  { step: "turnRight", Glyph: ArrowClockwise },
];
```

`const tilesId = useId();` beside the refs. The Arrange tile closes the acts row, and the group follows it:

```tsx
          {arrange && (
            <button
              type="button"
              className="sticker-toolbar__arrange-toggle"
              aria-label={t(($) => $.stickerBoard.toolbar.arrange.label)}
              aria-expanded={arrange.open}
              aria-controls={arrange.open ? tilesId : undefined}
              onClick={() => arrange.onOpen(!arrange.open)}
            >
              <ArrangeIcon size={18} weight={arrange.open ? "fill" : "bold"} />
            </button>
          )}
        </div>
        {arrange?.open && (
          <div
            id={tilesId}
            className="sticker-toolbar__arrange"
            role="group"
            aria-label={t(($) => $.stickerBoard.toolbar.arrange.label)}
          >
            {ARRANGE.map(({ step, Glyph }) => (
              <button
                key={step}
                type="button"
                className="sticker-toolbar__step"
                aria-label={t(($) => $.stickerBoard.toolbar.arrange[step])}
                onClick={() => arrange.onStep(step)}
              >
                <Glyph size={18} weight="bold" aria-hidden />
              </button>
            ))}
          </div>
        )}
```

In the placing `useLayoutEffect`, after the transform is set, mark which side the toolbar took (the stylesheet puts the step tiles on the far side):

```ts
// Over the sticker, the step tiles open above the toolbar's row, so opening them never moves it.
el.dataset.over = String(top + bar.h / 2 < sticker.y);
```

`StickerBoard.tsx` passes the new prop, open for this page only until Task 5 keeps it. After `const account = useMe();`:

```tsx
const [arrangeOpen, setArrangeOpen] = useState(false);
```

and the toolbar's `onArrange` gives way to:

```tsx
                  arrange={{
                    open: arrangeOpen,
                    onOpen: setArrangeOpen,
                    onStep: (step) => arrange(s.id, step),
                  }}
```

- [ ] **Step 4:** Run the toolbar tests and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 5:** Commit: `feat: the Arrange tile opens the selected sticker's step tiles`

### Task 4: A held step tile repeats

**Files:** Modify `apps/frontend/src/ui/press.ts`; create `apps/frontend/src/ui/useHeldRepeat.ts`; modify `apps/frontend/src/sticker-board/StickerToolbar.tsx`, `apps/frontend/src/sticker-board/StickerToolbar.test.tsx`

- [ ] **Step 1: Write the failing tests**, inside `describe("StickerToolbar's Arrange")`:

```tsx
describe("a held step tile", () => {
  const pointer = (el: Element, type: string, at: { clientX?: number; clientY?: number } = {}) =>
    act(
      () =>
        void el.dispatchEvent(
          new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, ...at }),
        ),
    );
  const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());

  it("repeats its step, faster the longer it's held, and takes none for the release", () => {
    const onStep = vi.fn<(step: Step) => void>();
    const [tile] = tiles(show(arranging(true, onStep)));
    pointer(tile, "pointerdown");
    wait(HOLD_DELAY_MS - 1);
    expect(onStep).not.toHaveBeenCalled();
    wait(FAST_AFTER_MS - HOLD_DELAY_MS + 1);
    const early = onStep.mock.calls.length;
    wait(FAST_AFTER_MS - HOLD_DELAY_MS);
    expect(onStep.mock.calls.length - early).toBeGreaterThan(early);

    pointer(tile, "pointerup");
    const held = onStep.mock.calls.length;
    act(() => tile.click());
    wait(FAST_AFTER_MS);
    expect(onStep).toHaveBeenCalledTimes(held);
  });

  it("stops when the finger slides off it", () => {
    const onStep = vi.fn<(step: Step) => void>();
    const [tile] = tiles(show(arranging(true, onStep)));
    pointer(tile, "pointerdown");
    wait(HOLD_DELAY_MS);
    const before = onStep.mock.calls.length;
    // happy-dom lays nothing out, so the tile is a point at 0,0, and this is far past it.
    pointer(tile, "pointermove", { clientX: 200, clientY: 200 });
    wait(FAST_AFTER_MS);
    expect(onStep).toHaveBeenCalledTimes(before);
  });
});
```

Imports: `beforeEach` from vitest, and `FAST_AFTER_MS`, `HOLD_DELAY_MS` from `../ui/useHeldRepeat`.

- [ ] **Step 2:** Run the toolbar tests → the two new tests fail (no step on hold).
- [ ] **Step 3: Implement.** In `press.ts`, export the two constants as they are: `export const SLOP_OUT = 16;` and `export const SWALLOW_MS = 800;`. Create `ui/useHeldRepeat.ts`:

```ts
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { SLOP_OUT, SWALLOW_MS } from "./press";

/** A held press waits this long before it repeats, so a tap stays one step. */
export const HOLD_DELAY_MS = 400;
/** How often a held press repeats, until it's been held `FAST_AFTER_MS`… */
export const REPEAT_MS = 100;
export const FAST_AFTER_MS = 1500;
/** …and how often after that. */
export const FAST_REPEAT_MS = 50;

/**
 * Handlers for a button whose press, held, repeats `act`, faster the longer it's held, as iOS's
 * steppers do. A tap, Enter or Space acts once, on click; a hold that repeated swallows the click its
 * release brings. Sliding off, a mouse leaving or a cancelled pointer stops it.
 */
export function useHeldRepeat(act: () => void) {
  const latest = useRef(act);
  useLayoutEffect(() => {
    latest.current = act;
  });
  const timer = useRef<number | undefined>(undefined);
  const repeated = useRef(false);
  /** Until when a click is the release of a hold that repeated. */
  const swallowUntil = useRef(0);

  const stopRepeating = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  const release = () => {
    stopRepeating();
    if (repeated.current) swallowUntil.current = performance.now() + SWALLOW_MS;
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const repeat = (held: number) => {
    repeated.current = true;
    latest.current();
    const next = held < FAST_AFTER_MS ? REPEAT_MS : FAST_REPEAT_MS;
    timer.current = window.setTimeout(() => repeat(held + next), next);
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      stopRepeating();
      repeated.current = false;
      swallowUntil.current = 0;
      timer.current = window.setTimeout(() => repeat(HOLD_DELAY_MS), HOLD_DELAY_MS);
    },
    // A finger stays on the tile it pressed until it lifts, so sliding off is measured here.
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (timer.current === undefined) return;
      const r = e.currentTarget.getBoundingClientRect();
      const off =
        e.clientX < r.left - SLOP_OUT ||
        e.clientX > r.right + SLOP_OUT ||
        e.clientY < r.top - SLOP_OUT ||
        e.clientY > r.bottom + SLOP_OUT;
      if (off) stopRepeating();
    },
    onPointerLeave: stopRepeating,
    onPointerUp: release,
    onPointerCancel: release,
    // A hold is the point here, so no long-press menu.
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    onClick: () => {
      if (performance.now() < swallowUntil.current) {
        swallowUntil.current = 0;
        return;
      }
      latest.current();
    },
  };
}
```

In `StickerToolbar.tsx`, the step buttons become `StepTile`s:

```tsx
{
  ARRANGE.map(({ step, Glyph }) => (
    <StepTile
      key={step}
      label={t(($) => $.stickerBoard.toolbar.arrange[step])}
      Glyph={Glyph}
      onStep={() => arrange.onStep(step)}
    />
  ));
}
```

```tsx
/** A step tile: a tap or a key takes its step once, and a hold repeats it until let go. */
function StepTile({ label, Glyph, onStep }: { label: string; Glyph: Icon; onStep: () => void }) {
  const held = useHeldRepeat(onStep);
  return (
    <button type="button" className="sticker-toolbar__step" aria-label={label} {...held}>
      <Glyph size={18} weight="bold" aria-hidden />
    </button>
  );
}
```

- [ ] **Step 4:** Run the toolbar tests and `src/ui/press.test.ts` → pass.
- [ ] **Step 5:** Commit: `feat: a held step tile repeats its step`

### Task 5: The board keeps Arrange open and reads steps out

**Files:** Create `apps/frontend/src/sticker-board/arrangeOpen.ts`; modify `apps/frontend/src/sticker-board/StickerBoard.tsx`, `apps/frontend/src/sticker-board/StickerBoard.test.tsx`

- [ ] **Step 1: Write the failing test.** Lift the first-selection hint tests' `visit` to module scope as `visitBoard` (same body, and those tests call it by that name), then add:

```tsx
describe("StickerBoard's Arrange", () => {
  const arrangeTile = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>(".sticker-toolbar__arrange-toggle");
  const stepTiles = (host: HTMLElement) => host.querySelectorAll(".sticker-toolbar__step");

  it("is closed until opened, then stays open for the next selection and the next visit", async () => {
    const [a, b] = [boardSticker({ placement: at(0.3) }), boardSticker({ placement: at(0.7) })];
    const first = await visitBoard(a, b);
    selectByKeys(first.host, a.stickerId);
    expect(stepTiles(first.host)).toHaveLength(0);
    act(() => arrangeTile(first.host)?.click());
    selectByKeys(first.host, b.stickerId);
    expect(stepTiles(first.host).length).toBeGreaterThan(0);
    await act(() => vi.dynamicImportSettled());
    first.unmount();

    const later = await visitBoard(a, b);
    selectByKeys(later.host, a.stickerId);
    expect(arrangeTile(later.host)?.getAttribute("aria-expanded")).toBe("true");
  });
});
```

- [ ] **Step 2:** `pnpm -C apps/frontend exec vitest run src/sticker-board/StickerBoard.test.tsx` → fails: the next visit starts closed.
- [ ] **Step 3: Implement.** `arrangeOpen.ts`:

```ts
import { personKey, readStored, writeStored } from "../ui/deviceStorage";

/** Whether a person left Arrange open on this device: it opens with every selection after, on every visit. */
const openKey = (userId: string) => personKey("draw.board.arrangeOpen", userId);

/** Whether `userId` left Arrange open on this device. */
export const arrangeLeftOpen = (userId: string) =>
  readStored(openKey(userId), "Whether Arrange was left open can't be read on this device").text ===
  "open";

/** Keeps whether `userId` has Arrange open, for their next selection and visit. */
export const keepArrangeOpen = (userId: string, open: boolean) =>
  writeStored(
    openKey(userId),
    open ? "open" : null,
    "Whether Arrange is open can't be kept on this device",
  );
```

In `StickerBoard.tsx`, Task 3's `useState(false)` becomes:

```tsx
// Arrange's step tiles stay out for every selection once opened, on every visit from this device.
const [arrangeOpen, setArrangeOpen] = useState(() => arrangeLeftOpen(account.id));
const openArrange = (open: boolean) => {
  setArrangeOpen(open);
  keepArrangeOpen(account.id, open);
};
const stepsSaid = useRef<HTMLParagraphElement>(null);
/** Reads out what a run of steps did once it settles; cleared first, so the same words twice are read twice. */
const tellSteps = (last: SettledStep) => {
  const el = stepsSaid.current;
  if (!el) return;
  const words = last.moved
    ? t(($) => $.stickerBoard.toolbar.arrange.moved[last.step])
    : t(($) => $.stickerBoard.toolbar.arrange.stopped[last.step]);
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = words;
  });
};
```

`useBoardGestures({ … })` takes `onStepsSettled: tellSteps`. Inside `.board-stage`, after the two hidden description spans:

```tsx
<p ref={stepsSaid} className="visually-hidden" role="status" />
```

The toolbar's `arrange` takes `onOpen: openArrange` in place of `setArrangeOpen`.

Imports: `arrangeLeftOpen` and `keepArrangeOpen` from `./arrangeOpen`, and `type SettledStep` from `./useBoardGestures`.

- [ ] **Step 4:** Run the board, toolbar and gestures tests, then `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 5:** Commit: `feat: the board keeps Arrange open and reads its steps out`

### Task 6: Styles

**Files:** Modify `apps/frontend/src/sticker-board/StickerBoard.css` (the `.sticker-toolbar__arrange` and `.sticker-toolbar__step` rules, and `.sticker-toolbar .label-btn`)

- [ ] **Step 1: Replace the Arrange rules** (from the `/* Arrange: eight flat tiles` comment through `.sticker-toolbar__step:focus-visible`):

```css
/* Arrange's step tiles: moves on the first row, sizes and turns on the second, one step each, for
   whoever can't or won't drag, each 44px to touch. Over the sticker they open above the toolbar's
   row, so opening them never moves it. */
.sticker-toolbar__arrange {
  display: grid;
  grid-template-columns: repeat(4, minmax(44px, 1fr));
  gap: 10px 2px;
  padding-top: 5px;
  box-shadow: inset 0 1px 0 var(--rule);
}

.sticker-toolbar[data-over="true"] .sticker-toolbar__arrange {
  order: -1;
  padding: 0 0 5px;
  box-shadow: inset 0 -1px 0 var(--rule);
}

/* A hold repeats a tile's step, so a long press must not select, call out or scroll. */
.sticker-toolbar__step {
  position: relative;
  display: grid;
  place-items: center;
  height: 34px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ink);
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.sticker-toolbar__step::before {
  content: "";
  position: absolute;
  inset: -5px -1px;
}

/* The Arrange tile ends the toolbar's row: a flat tile, reversed out of Ink while the step tiles are
   out, 44px to touch. */
.sticker-toolbar__arrange-toggle {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--rule);
  touch-action: manipulation;
}

.sticker-toolbar__arrange-toggle::before {
  content: "";
  position: absolute;
  inset: -3px -4px;
}

.sticker-toolbar__arrange-toggle[aria-expanded="true"] {
  background: var(--ink);
  color: var(--liner-lift);
  box-shadow: none;
}

.sticker-toolbar__step:active,
.sticker-toolbar__arrange-toggle[aria-expanded="false"]:active {
  background: color-mix(in srgb, var(--ink) 10%, transparent);
}

.sticker-toolbar__step:focus-visible,
.sticker-toolbar__arrange-toggle:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 0;
}
```

- [ ] **Step 2: Trim the toolbar's labels** (starting values; Task 7 measures them):

```css
/* A 36px face on its lip, trimmed at the sides so the row, Arrange tile included, fits the narrowest
   phones. */
.sticker-toolbar .label-btn {
  min-height: calc(36px + var(--lip));
  padding: 0 10px 0 8px;
  font-size: 13px;
  gap: 6px;
}
```

- [ ] **Step 3:** Commit: `feat: the Arrange tile and two rows of step tiles, 44px to touch`

### Task 7: Check it in WebKit and Chromium

Scratch (scripts, screenshots) goes in `~/.cache/drawing-app-arrange/`, never in the repo.

- [ ] **Step 1: Start a dev server of its own** (other sessions hold 5173/8788): the API with `PORT=8790 DATABASE_URL=data/arrange.db IMAGE_DIR=../../data/arrange-images CDN_BASE_URL=http://localhost:5190/api/images pnpm -C apps/api dev`, and Vite from an untracked `apps/frontend/vite.arrange.config.ts`:

```ts
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default mergeConfig(
  base,
  defineConfig({ server: { port: 5190, proxy: { "/api": { target: "http://localhost:8790" } } } }),
);
```

run as `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm -C apps/frontend exec vite --config vite.arrange.config.ts`.

- [ ] **Step 2: Boards to check:** sign in at `http://localhost:5190/?as=arrange-en` and `?as=arrange-ja` (localStorage `draw.language` = `ja`). Seal two stickers for each (Draw, one stroke, tap the check twice), then hold Move down to take one near the bottom, so one toolbar sits under its sticker and one over.
- [ ] **Step 3: Checks**, with Playwright's Chromium and WebKit (touch on, `isMobile`) at 360×740, 375×667, 390×844 and 430×932, in both languages. For WebKit, follow the `webkit-testing` memory: its sign-in cookie needs adding back without `Secure`.
  - Closed: the toolbar's row is one line and fits: `acts.offsetHeight` equals a label's height, and `bar.offsetWidth <= stage.clientWidth - 54` (`toolbarSpot`'s room). If it doesn't fit, trim `.sticker-toolbar .label-btn` further and check again.
  - Open: every step tile is at least 44px wide, the rows are 10px apart, and the tiles sit on the side away from the sticker.
  - Opening leaves the row where it was: the acts row's `getBoundingClientRect()` before and after the Arrange tile is tapped, for the toolbar under its sticker and the one over its sticker.
  - Hold: a touch held on Move down for 1.5s (Chromium: CDP `Input.dispatchTouchEvent`; WebKit: `pointerdown`/`pointerup` with `pointerType: "touch"` dispatched on the tile) moves the sticker several steps, and the release adds none.
  - Read-out: the board's `[role="status"]` says "Moved left" after a tap on Move left, once `STEP_SAVE_IDLE_MS` has passed, and "It's at the left edge" after Move left is held into the edge; the Japanese in `ja`.
  - Accessibility tree: `page.locator(".sticker-toolbar").ariaSnapshot()` shows the Arrange button with its expanded state and the named group.
  - Screenshots at 375×667, closed and open, in both languages, for ad0ll.
- [ ] **Step 4:** Fix what the checks find in one batch and run them once more. Stop both servers.
- [ ] **Step 5:** Commit any trims: `fix: the toolbar's labels fit beside the Arrange tile`

### Task 8: DESIGN.md

- [ ] **Step 1:** In the stickers paragraph, "Its toolbar adds an Arrange row of flat tiles (move, bigger and smaller, turn) that steps it like the keys, for anyone who can't drag." becomes "Its toolbar ends with Arrange, a flat tile that opens two rows of flat step tiles (move; bigger and smaller, turn) that step it like the keys, for anyone who can't drag."
- [ ] **Step 2:** Under Touch targets, the last sentence becomes "Sticker handles, tray folder tabs, the sheet stack's +N button, a floating sheet's X, the zip pull, drawing tools, and the selected sticker's Arrange tile and step tiles all pad to 44px."
- [ ] **Step 3:** Under Selection handles, after "…where a second tap opens it.", add: "Arrange, the toolbar's last tile, opens its step tiles in two rows on the side away from the sticker, so the toolbar's row stays where it was; once opened they stay out for every selection on that phone. A held step tile repeats its step, faster the longer it's held. Once steps go quiet, screen readers hear what the last one did, or that the board's edge or a size limit stopped it."
- [ ] **Step 4:** Commit: `docs: DESIGN.md's toolbar has the Arrange tile`

### Task 9: Check and merge

- [ ] **Step 1:** `pnpm check` → lint, typecheck, tests and format all pass.
- [ ] **Step 2:** Squash the branch into `feat: the selected sticker's Arrange tile opens step tiles that repeat when held and are read out` and `docs: DESIGN.md's toolbar has the Arrange tile`, with no AI attribution lines.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push.
- [ ] **Step 4:** Delete this plan, the worktree, the branch and `~/.cache/drawing-app-arrange/` once ad0ll has the screenshots.
- [ ] **Step 5:** Hand ad0ll only what needs an iPhone in LINE: a held tile shows no callout, magnifier or text selection, and how the repeat feels.
