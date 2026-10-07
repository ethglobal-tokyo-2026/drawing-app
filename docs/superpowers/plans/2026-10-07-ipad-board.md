# iPad Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every device draws the sticker board as one panel, the target phone's board scaled uniformly to fit, so a board reads the same everywhere. Only the stickers scale; every control and word keeps its own size. Where the board has room, the sticker tray opens beside the panel. The cork back turns in a box the size of the panel, with its papers at their phone sizes.

**Architecture:** `sticker-board/boardPanel.ts` owns the board's layout: `REFERENCE_BOARD`, `panelFor`, `trayBesidePanel`, your own board's layout (`ownBoardLayout`) and someone else's (`visitorFrame`), the header band and the turn box. Placements stay as fractions of the reference board's field (`REFERENCE_FIELD` in `placement.ts`), drawn through the panel's one scale and offset. Gestures work in reference px, so a resize mid-drag keeps the sticker under the finger. Full-size controls are placed against a `BoardFrame`, and the CSS reads the panel and band from variables. The tray engine reads the same layout, and its Zipper gains a right-opening mouth. `BoardFlip` turns the turn box.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS, Playwright (WebKit and Chromium) for the browser checks.

---

## Decisions

Spec: `docs/superpowers/specs/2026-10-07-ipad-layout-design.md`, decisions 10–12. ad0ll's sign-off on the spec covers them, and the DESIGN.md edits that follow in Task 10. Values marked _start_ are starting values, tuned from the screenshots in Task 9.

**10. One board for every device.** The board on the target phone inside LINE is the reference panel: 390×651, with today's field inside it.

- `REFERENCE_BOARD` = `{ width: 390, height: 651 }`: DESIGN.md's 390×844 viewport, less the 47px status bar, LINE's 56px header and the 90px tab strip. One constant, which the tests derive from.
- `REFERENCE_FIELD` is left 16, top 86, 334×549 reference px. Placements keep their stored fractions (`x`, `y` of the field; `s` of the reference width), and nothing in the database or API changes.
- The panel is scaled uniformly to fit, top-aligned and centered across. It's never centered vertically.
- Only geometry scales: sticker images, with their white edge, foil and shadows. The kiss-cut and cast are declared on `.placed-sticker` at `--panel-k`, and so are the dragging and lifted-corner shadows and the fallback foil band.
- Everything else keeps its own size, for the 11px floor: the header, Draw and its tickets, the gift badges, the selection frame, handles, toolbar and hint, and the artist chips. Nothing that holds text is CSS-scaled: stickers are sized in px, and controls are placed, never scaled.
- The header band runs along the top of the panel and the tray's room beside it. Where that's narrower than `HEADER_BAND_MIN` 360 (_start_), the band takes the board's full width. Your name sits at its left, the gift badges and the Explore back chip at its right. Its box is `--band-x`/`--band-w` on `.board`, which the LINE sheet plan's "Full screen in the browser" link can use too.
- Draw, its nudge and the alerts start at the band's left and stay at the board's foot, in the thumb zone, even where the board is taller than the panel.
- Arrange's steps and the arrow keys move 10 reference px. `S_MIN` and `S_MAX` are shares of the panel's width. Reading order and arrow-key focus are worked out in reference px.
- The toolbar stays inside the panel, clear of the tray's strip, where it fits. On LINE's sheet the panel is narrower than the toolbar, so it reaches over the tray's strip, drawn above the tray.
- Someone else's board has the same panel and field as the owner's, centered. Its field no longer runs to the right inset.
- The loading skeleton sits on the panel and scales with it.
- When the board resizes mid-drag (an iPad turning), the point you grabbed stays under the finger.

**11. The tray beside the board.** Wherever the tray fits beside the panel it opens there, like the facing page. The Zipper stays on the panel's right edge, and phones keep today's tray over the board.

- The tray goes beside when there's `BESIDE_ROOM.min` = `GMAX` 172 + `BESIDE_EDGE` 27 = 199px beside the panel (_start_). To make that room, the panel may give up `MAX_SCALE_GIVEN_FOR_TRAY` 0.15 of its fitted scale (_start_). An iPad mini upright needs 0.146, an 11-inch upright 0.07.
- Beside, the panel moves left so that it and the tray's room (up to `BESIDE_ROOM.max`) sit centered together. Someone else's board stays centered.
- Beside, the Zipper's chain runs down the panel's right edge, with its 24px canvas edge just inside the panel. The right row parts, and the mouth opens beside the panel, up to `GMAX × max(1, stack scale)` wide. The column runs from under the header (y 64) to the board's foot.
- Beside, the stack grows up to `MAX_STACK_SCALE` 1.5 in a tall mouth (_start_), as far as the room by the chain holds. Its dates, NEW badges, 18+ marks, +N button and empty-sheet note are scaled back to their own size, and the edges behind stay 15px.
- The spread covers the whole board. Beside the panel it deals as many columns as draw the sheets biggest; phones keep at most four.
- A pulled-out sheet floats over the board left of the Zipper, as today. Turning the board over with the tray open beside the panel closes the tray.

**12. The cork back keeps its own sizes.**

- The turn box is the panel, widened where it's narrower to `CORK_MIN_WIDTH` 360 (the narrowest supported phone), inside the board.
- The papers keep their phone sizes and the 11px floor. They sit in a column no wider than a 430px phone's (402px), centered on cork, and the cork scrolls as today. That leaves room for Settings' Drawing group (decision 19, the Pencil plan), which grows the Settings card at its phone width.
- The front face stays full size, since it hosts full-screen dialogs. It's clipped to the turn box while it turns, and the board's liner holds still round it. The Ink table lies under the turn box only.
- The perspective is 1500px × (turn box width ÷ 390), so a 390px board turns exactly as today.

Computed from these formulas, not measured. Board = viewport less the 68px tab strip (no LINE header, no home indicator):

| Viewport               | Board    | Scale (fitted) | Panel    | Tray   | Stack scale | Header band | Turn box |
| ---------------------- | -------- | -------------- | -------- | ------ | ----------- | ----------- | -------- |
| 390×844                | 390×776  | 1.00           | 390×651  | over   | 1.00        | full        | 390      |
| 540×620 (LINE's sheet) | 540×552  | 0.85           | 331×552  | beside | 0.71        | full        | 360      |
| 744×1133               | 744×1065 | 1.40 (1.64)    | 545×910  | beside | 1.00        | full        | 545      |
| 820×1180               | 820×1112 | 1.59 (1.71)    | 621×1037 | beside | 1.00        | full        | 621      |
| 1180×820               | 1180×752 | 1.16           | 451×752  | beside | 1.26        | 222–958     | 451      |
| 1376×1032              | 1376×964 | 1.48           | 578×964  | beside | 1.50        | 257–1119    | 578      |
| an iPhone in LINE      | 390×651  | 1.00           | 390×651  | over   | 0.98        | full        | 390      |
| an SE in LINE          | 375×523  | 0.80           | 313×523  | over   | 0.63        | full        | 360      |

To confirm on a device: the 651 (the Device paper, foundations plan), and LINE's sheet's board height, 552 or about 496 with a header (scale 0.85 or 0.76).

## Files

All under `apps/frontend/src/sticker-board/` unless shown.

- Create `boardPanel.ts`, `testBoardFrame.ts`, and in `tray/`: `trayMeasures.ts` and `trayColumn.ts`, with tests, and `trayModel.test.ts` and `traySpread.test.ts`.
- Modify `placement.ts`, `boardGesture.ts`, `useBoardGestures.ts`, `PlacedSticker.tsx`, `BoardLoading.tsx`, `StickerToolbar.tsx`, `ArtistChipLayer.tsx`, `StickerBoard.tsx`/`.css` and `ArtistBoard.tsx`/`.css`. In `tray/`: `zipper.ts`, `trayModel.ts`, `trayEngine.ts`, `traySheets.ts`, `traySpread.ts`, `trayPaging.ts`, `trayPresses.ts`, `trayPeel.ts`, `trayBoardDrop.ts` and `sticker-tray.css`. In `stat-board/`: `BoardFlip.tsx`, `board-flip.css` and `stat-board.css`. Also the tests beside them, `styles/tokens.css`, `stickers/sticker-figure.css`, `stickers/sticker-foil.css` and `DESIGN.md`.

## Setup

- [ ] Start once `2026-10-07-ipad-foundations.md` has merged (the spec's build order; nothing here needs its code). Run `git worktree add -b feat/ipad-board .claude/worktrees/ipad-board origin/main`, then `pnpm install` in it. Every command below runs from the worktree root.

Test commands run with `TZ=Asia/Tokyo`: without it, `GiftReceivedNotice.test.tsx` and `StickerDetail.test.tsx` fail on main.

Files other plans edit too:

- **From the foundations plan, already in this branch's base:** `StickerBoard.css`'s `.board` clips with `overflow: clip`, `sticker-tray.css`'s `.tray__pulled .tray__paper` casts `var(--shadow-float)`, and `tokens.css` has `--content-w`, `--key-min-w`, `--shadow-float` and `--foot-inset`. Keep them as they are.
- **Beside this plan, the Explore and dialogs plan** edits `tray/zipper.ts` (an import of `toScreenAxes`, and the last lines of `onMotion`) and `tray/zipper.test.ts` (the swing tests' `jolt`, and one test after them). Task 4 stays off `onMotion` and `nudge`, so whichever plan lands second rebases over the other.
- **After this plan, the LINE sheet plan** puts its link in the header band's top-right corner, against `--band-x` and `--band-w`, beside `.board-gifts`.

Task order: 1 first, then 2 before 3. Tasks 4 and 5 need only Task 1. Task 6 needs 2, 4 and 5, Task 7 needs 6, and Task 8 needs 2. Then 9, 10 and 11.

### Task 1: The board's layout

**Files:** Create `apps/frontend/src/sticker-board/tray/trayMeasures.ts`, `boardPanel.ts` and `boardPanel.test.ts`. Modify imports in `tray/trayModel.ts`, `trayEngine.ts`, `traySpread.ts`, `trayBoardDrop.ts`, `trayPeel.ts`, `trayPresses.ts` and `StickerTray.test.tsx`.

- [ ] **Step 1: Write the failing test**, `apps/frontend/src/sticker-board/boardPanel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  HEADER_BAND_MIN,
  MAX_SCALE_GIVEN_FOR_TRAY,
  ownBoardLayout,
  panelFor,
  REFERENCE_BOARD,
  toBoard,
  toReference,
  trayBesidePanel,
  visitorFrame,
} from "./boardPanel";
import { BESIDE_ROOM, CHAIN_INSET } from "./tray/trayMeasures";

/** Boards the app meets, in board px: a phone's in LINE, LINE's sheet on an iPad, iPads in Safari, a narrow window. */
const BOARDS = {
  phone: { W: REFERENCE_BOARD.width, H: REFERENCE_BOARD.height },
  lineSheet: { W: 540, H: 552 },
  ipadUpright: { W: 820, H: 1112 },
  ipadTurned: { W: 1180, H: 752 },
  narrowWindow: { W: 320, H: 1000 },
};
const roomy = [BOARDS.lineSheet, BOARDS.ipadUpright, BOARDS.ipadTurned];

describe("the board's panel", () => {
  it("fits the reference board inside any board, unstretched, top-aligned, centered across, touching two edges", () => {
    for (const { W, H } of Object.values(BOARDS)) {
      const p = panelFor(W, H);
      expect(p.width / p.height).toBeCloseTo(REFERENCE_BOARD.width / REFERENCE_BOARD.height);
      expect(p.scale).toBeCloseTo(p.width / REFERENCE_BOARD.width);
      expect(Math.min(W - p.width, H - p.height)).toBeCloseTo(0);
      expect(Math.min(W - p.width, H - p.height)).toBeGreaterThanOrEqual(-1e-9);
      expect(p.top).toBe(0);
      expect(2 * p.left + p.width).toBeCloseTo(W);
    }
  });

  it("maps reference px onto the panel and back, however it's scaled and placed", () => {
    const p = ownBoardLayout(BOARDS.ipadTurned.W, BOARDS.ipadTurned.H).panel;
    expect(toReference(p, toBoard(p, { x: 123.4, y: 567.8 }))).toEqual({
      x: expect.closeTo(123.4),
      y: expect.closeTo(567.8),
    });
    const corner = toBoard(p, { x: REFERENCE_BOARD.width, y: REFERENCE_BOARD.height });
    expect(corner).toEqual({
      x: expect.closeTo(p.left + p.width),
      y: expect.closeTo(p.top + p.height),
    });
  });

  it("puts the tray beside your panel on iPads and in LINE's sheet, the Zipper on its right edge, its room on the board", () => {
    const fits = ({ W, H }: { W: number; H: number }) =>
      trayBesidePanel(panelFor(W, H), W, BESIDE_ROOM.min);
    expect([fits(BOARDS.phone), fits(BOARDS.lineSheet), fits(BOARDS.ipadTurned)]).toEqual([
      false,
      true,
      true,
    ]);
    for (const { W, H } of roomy) {
      const own = ownBoardLayout(W, H);
      expect(own.trayBeside).toBe(true);
      expect(own.panel.left).toBeGreaterThanOrEqual(0);
      expect(own.zipX).toBeCloseTo(own.panel.left + own.panel.width);
      expect(own.zipX + BESIDE_ROOM.min).toBeLessThanOrEqual(W + 1e-9);
    }
  });

  it("gives up no more than its share of the panel's scale for the tray, else keeps the tray over the stickers", () => {
    const upright = ownBoardLayout(BOARDS.ipadUpright.W, BOARDS.ipadUpright.H);
    const fitted = panelFor(BOARDS.ipadUpright.W, BOARDS.ipadUpright.H).scale;
    expect(upright.panel.scale).toBeLessThan(fitted);
    expect(upright.panel.scale).toBeGreaterThanOrEqual(fitted * (1 - MAX_SCALE_GIVEN_FOR_TRAY));
    const phone = ownBoardLayout(BOARDS.phone.W, BOARDS.phone.H);
    expect(phone.trayBeside).toBe(false);
    expect(phone.panel).toEqual(panelFor(BOARDS.phone.W, BOARDS.phone.H));
    expect(phone.zipX).toBe(phone.W - CHAIN_INSET);
  });

  it("runs the header band along the panel and the tray's room, or across the board where that's too narrow", () => {
    const turned = ownBoardLayout(BOARDS.ipadTurned.W, BOARDS.ipadTurned.H);
    expect(turned.band.left).toBe(turned.panel.left);
    expect(turned.band.left + turned.band.width).toBeGreaterThan(turned.zipX);
    expect(turned.band.left + turned.band.width).toBeLessThanOrEqual(turned.W);
    // An iPhone SE's board in LINE: its panel is narrower than the header needs.
    const se = ownBoardLayout(375, 523);
    expect(se.panel.width).toBeLessThan(HEADER_BAND_MIN);
    expect(se.band).toEqual({ left: 0, width: se.W });
    const theirs = visitorFrame(BOARDS.ipadTurned.W, BOARDS.ipadTurned.H);
    expect(theirs.panel).toEqual(panelFor(BOARDS.ipadTurned.W, BOARDS.ipadTurned.H));
    expect(theirs.band).toEqual({ left: theirs.panel.left, width: theirs.panel.width });
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/boardPanel.test.ts` → fails: `./boardPanel` can't be resolved.
- [ ] **Step 3: Create `tray/trayMeasures.ts`:**

```ts
/**
 * The sticker tray's measures that the board lays itself out by, in board px. The tray's code loads
 * apart from the board's, so they live on their own.
 */

/** The tray runs from just under the board's header to its foot. */
export const TOP = 64;
/** The tray's column over the stickers: wide enough for the parting row's full travel. */
export const COL = 205;
/** How far the parting row travels open at a phone's size: about half a phone's screen. */
export const GMAX = 172;
/** Over the stickers, the Zipper's chain runs this far in from the board's right edge. */
export const CHAIN_INSET = 15;
/** The tray's strip at rest, from its left edge to the board's right edge; controls keep left of it. */
export const STRIP = 40;
/** Beside the panel, the open stack may grow up to this in a tall mouth. */
export const MAX_STACK_SCALE = 1.5;
/** Beside the panel, past the mouth: the parting tape, and a gutter to the board's edge. */
export const BESIDE_EDGE = 27;
/** The room beside the panel the open tray takes: at a phone's size, and grown to its most. */
export const BESIDE_ROOM = { min: GMAX + BESIDE_EDGE, max: GMAX * MAX_STACK_SCALE + BESIDE_EDGE };
```

In `tray/trayModel.ts`, delete `TOP`, `COL` and `GMAX` with their comments (from `/** The tray runs from just under the board's header to its foot. */` through `export const GMAX = 172;`, keeping `STACK_Y` and `CRACK`). Their importers take them from `./trayMeasures` instead:

- `trayEngine.ts`: `COL` and `GMAX`.
- `traySpread.ts` and `trayPeel.ts`: `COL`, `GMAX` and `TOP`.
- `trayBoardDrop.ts`, `trayPresses.ts` and `StickerTray.test.tsx`: `TOP`.

- [ ] **Step 4: Create `boardPanel.ts`:**

```ts
import { BESIDE_ROOM, CHAIN_INSET, STRIP, TOP } from "./tray/trayMeasures";

/**
 * The board every placement is stored against: the target phone's board inside LINE. Every device
 * draws it as one panel, scaled uniformly to fit, so a board arranged anywhere reads the same everywhere.
 */
export const REFERENCE_BOARD = { width: 390, height: 651 } as const;
/** The most of its fitted scale the panel gives up to make room for the sticker tray beside it. */
export const MAX_SCALE_GIVEN_FOR_TRAY = 0.15;
/** The header band is never narrower than this: your name and the gift badges need it. */
export const HEADER_BAND_MIN = 360;

/** The reference board as a device draws it, in board px; `scale` is board px per reference px. */
export interface Panel {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The reference board at `scale`, top-aligned and centered across a board this wide. */
const panelAt = (scale: number, boardW: number): Panel => {
  const width = REFERENCE_BOARD.width * scale;
  return {
    scale,
    left: (boardW - width) / 2,
    top: 0,
    width,
    height: REFERENCE_BOARD.height * scale,
  };
};

/** The reference board, scaled uniformly to fit a board this big, top-aligned and centered across. */
export const panelFor = (boardW: number, boardH: number) =>
  panelAt(Math.min(boardW / REFERENCE_BOARD.width, boardH / REFERENCE_BOARD.height), boardW);

/** Whether a sticker tray `trayW` px wide fits beside the panel, once the panel moves over for it. */
export const trayBesidePanel = (panel: Panel, boardW: number, trayW: number) =>
  boardW - panel.width >= trayW;

/** A point in reference px, where the panel draws it, in board px. */
export const toBoard = (panel: Panel, at: { x: number; y: number }) => ({
  x: panel.left + at.x * panel.scale,
  y: panel.top + at.y * panel.scale,
});

/** A point on the board, in reference px on the panel. */
export const toReference = (panel: Panel, at: { x: number; y: number }) => ({
  x: (at.x - panel.left) / panel.scale,
  y: (at.y - panel.top) / panel.scale,
});

/** The board as its full-size controls see it, in board px. */
export interface BoardFrame {
  W: number;
  H: number;
  panel: Panel;
  /** Where the sticker tray's strip starts, which controls keep left of; someone else's panel's edge. */
  trayEdge: number;
  /** The header band along the top: the panel and the tray's room beside it, or the whole board where that's too narrow. */
  band: { left: number; width: number };
}

/** Your own board: its panel, and the sticker tray's place by it, in board px. */
export interface OwnBoardLayout extends BoardFrame {
  /** The tray opens beside the panel, where there's room, rather than over the stickers. */
  trayBeside: boolean;
  /** Where the Zipper's chain runs, and where the tray's column starts at the top. */
  zipX: number;
  trayTop: number;
}

/** The header band over `left`..`right`, or across the whole board where that's too narrow for the header. */
const bandOver = (left: number, right: number, W: number) =>
  right - left >= HEADER_BAND_MIN ? { left, width: right - left } : { left: 0, width: W };

/**
 * Your own board's layout. On a phone the panel is centered and the tray runs down the board's right
 * edge, over the stickers. Where the tray fits beside the panel, the panel giving up at most its share
 * of scale for it, the panel moves left so that it and the tray's room sit centered together, and the
 * Zipper runs down its right edge.
 */
export function ownBoardLayout(W: number, H: number): OwnBoardLayout {
  const fitted = panelFor(W, H);
  const least = panelAt(fitted.scale * (1 - MAX_SCALE_GIVEN_FOR_TRAY), W);
  if (!trayBesidePanel(least, W, BESIDE_ROOM.min)) {
    const right = fitted.left + fitted.width;
    return {
      W,
      H,
      panel: fitted,
      trayBeside: false,
      zipX: W - CHAIN_INSET,
      trayEdge: W - STRIP,
      trayTop: TOP,
      band: bandOver(fitted.left, right, W),
    };
  }
  const sized = panelAt(Math.min(fitted.scale, (W - BESIDE_ROOM.min) / REFERENCE_BOARD.width), W);
  const room = Math.min(W - sized.width, BESIDE_ROOM.max);
  const panel = { ...sized, left: (W - sized.width - room) / 2 };
  const zipX = panel.left + panel.width;
  return {
    W,
    H,
    panel,
    trayBeside: true,
    zipX,
    trayEdge: zipX - (STRIP - CHAIN_INSET),
    trayTop: TOP,
    band: bandOver(panel.left, zipX + room, W),
  };
}

/** Someone else's board: the same panel, centered, with no tray beside it. */
export function visitorFrame(W: number, H: number): BoardFrame {
  const panel = panelFor(W, H);
  const right = panel.left + panel.width;
  return { W, H, panel, trayEdge: right, band: bandOver(panel.left, right, W) };
}
```

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/boardPanel.test.ts src/sticker-board/tray` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `feat: the board's layout: one panel scaled to fit, the tray's room beside it and the header band`

### Task 2: Stickers sit on the panel, in reference units

**Files:** Modify `placement.ts` and `placement.test.ts`, `boardGesture.ts`, `useBoardGestures.ts` and `useBoardGestures.test.tsx`, `PlacedSticker.tsx`, `BoardLoading.tsx`, `StickerBoard.tsx`, `ArtistBoard.tsx` and `ArtistBoard.test.tsx`.

- [ ] **Step 1: Write the failing tests.**

In `placement.test.ts`:

- Imports: drop `fieldOf`, add `REFERENCE_FIELD` and `fieldOn`, and add `import { panelFor, REFERENCE_BOARD } from "./boardPanel";`.
- In "keeps a point dropped past the field's edge on the field", `fieldOf(390, 700)` becomes `fieldOn(panelFor(1180, 752))`.
- "sizes the long side as a share of the board's width…" is renamed "…of the panel's width…".
- In the hint tests' `stickerAt`, `toPx(fieldOf(board.W, board.H), at)` becomes `toPx(fieldOver(board), at)`, with this helper above the tests:

```ts
/** The reference field's margins on a board this big: under the header band, clear of the tray's strip. */
const fieldOver = (board: { W: number; H: number }) => ({
  left: REFERENCE_FIELD.left,
  top: REFERENCE_FIELD.top,
  w: board.W - (REFERENCE_BOARD.width - REFERENCE_FIELD.w),
  h: board.H - (REFERENCE_BOARD.height - REFERENCE_FIELD.h),
});
```

Then add:

```ts
it("draws a placement on the panel and reads it back, at the same share of the panel on any board", () => {
  for (const [W, H] of [
    [REFERENCE_BOARD.width, REFERENCE_BOARD.height],
    [540, 552],
    [1180, 752],
  ]) {
    const panel = panelFor(W, H);
    const field = fieldOn(panel);
    const at = { x: 0.3, y: 0.7 };
    const drawn = toPx(field, at);
    const back = toFrac(field, drawn);
    expect(back.x).toBeCloseTo(at.x);
    expect(back.y).toBeCloseTo(at.y);
    const onReference = toPx(REFERENCE_FIELD, at);
    expect((drawn.x - panel.left) / panel.width).toBeCloseTo(onReference.x / REFERENCE_BOARD.width);
    expect((drawn.y - panel.top) / panel.height).toBeCloseTo(
      onReference.y / REFERENCE_BOARD.height,
    );
  }
});
```

In `useBoardGestures.test.tsx`:

- Imports: `import { fieldOf, sizeOf, toPx, transformAt } from "./placement";` becomes `import { fieldOn, REFERENCE_FIELD, S_MAX, stickerBox, toPx } from "./placement";`. Add `import { ownBoardLayout, REFERENCE_BOARD, toBoard, type OwnBoardLayout } from "./boardPanel";`.
- The test `Board` gives each sticker a corner handle: `<div key={s.id} className="placed-sticker" data-sticker-id={s.id} tabIndex={0}><i data-handle="scale" /></div>`.
- After `noTray`, add:

```tsx
/** The target phone's board in LINE, which the panel fills. */
const PHONE = ownBoardLayout(REFERENCE_BOARD.width, REFERENCE_BOARD.height);

/** The board's props: the one sticker, selected, on `layout`. */
const boardProps = (
  layout: OwnBoardLayout,
  overrides: Partial<Omit<Options, "stage">> = {},
): Omit<Options, "stage"> => ({
  stickers: [sticker],
  layout,
  selected: "a",
  reduced: true,
  tray: noTray,
  onSelect: () => {},
  onOpen: () => {},
  onCommit: () => {},
  onRemove: () => {},
  ...overrides,
});

/** Renders the board on `layout`, its stage measured at that size, and returns the first sticker. */
const show = (layout: OwnBoardLayout, overrides: Partial<Omit<Options, "stage">> = {}) => {
  act(() => root.render(<Board {...boardProps(layout, overrides)} />));
  const stage = host.querySelector<HTMLElement>(".board-stage");
  const el = host.querySelector<HTMLElement>(".placed-sticker");
  if (!stage || !el) throw new Error("the board didn't render");
  stage.getBoundingClientRect = () => new DOMRect(0, 0, layout.W, layout.H);
  return el;
};
```

- Each existing test's `root.render(<Board …/>)`, with the stage lookup and mock after it, becomes one call:
  - the pinch test: `const el = show(PHONE, { onCommit });`
  - the tray-drop test: `const el = show(PHONE, { tray, onCommit });`
  - the focus test's `render(selected)`: `show(PHONE, { stickers, selected, onSelect, onCommit })`
  - the steps' `board(onCommit, overrides)`: `show(PHONE, { onCommit, ...overrides })`
- In "tell the last of a run…", `fieldOf(390, 657).w` becomes `REFERENCE_FIELD.w`.
- In "peel a removed sticker up…", the lines computing `x, y` and `w, h` become `const { transform } = stickerBox(fieldOn(PHONE.panel), PHONE.panel.width, saved, sticker);`, and the expectation is `expect(first).toContain(transform);`.

Inside `describe("steps, from keys and from Arrange")`, add:

```tsx
it("move a sticker by the same share of the board on a phone as on an iPad", () => {
  const savedOn = (layout: OwnBoardLayout) => {
    const onCommit = vi.fn<Options["onCommit"]>();
    show(layout, { onCommit });
    pressRight(3);
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    act(() => root.render(null));
    return onCommit.mock.lastCall?.[1].x;
  };
  expect(savedOn(ownBoardLayout(820, 1112))).toBe(savedOn(PHONE));
});
```

At the end of the file:

```tsx
describe("useBoardGestures on the panel", () => {
  /** An 11-inch iPad's board in Safari, upright and turned. */
  const UPRIGHT = ownBoardLayout(820, 1112);
  const TURNED = ownBoardLayout(1180, 752);
  /** A sticker's center as its element is drawn, in board px. */
  const drawnCenter = (el: HTMLElement) => {
    const [x = NaN, y = NaN] = (
      /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(el.style.transform) ?? []
    )
      .slice(1)
      .map(Number);
    return { x: x + parseFloat(el.style.width) / 2, y: y + parseFloat(el.style.height) / 2 };
  };

  it("keeps the point grabbed under the finger as the board turns mid-drag, and puts it down there", async () => {
    const onCommit = vi.fn<Options["onCommit"]>();
    const el = show(UPRIGHT, { onCommit });
    const start = stickerBox(
      fieldOn(UPRIGHT.panel),
      UPRIGHT.panel.width,
      sticker.placement,
      sticker,
    );
    // Grabbed 20px right of its center, then carried past the slop.
    const grab = { x: start.x + 20, y: start.y };
    const held = { x: grab.x + 30, y: grab.y };
    act(() => {
      point(el, "pointerdown", 1, grab.x, grab.y);
      point(el, "pointermove", 1, held.x, held.y);
    });
    show(TURNED, { onCommit });
    // The grabbed point stays under the finger, its distance from the center scaled with the panel.
    const offset = (20 * TURNED.panel.scale) / UPRIGHT.panel.scale;
    expect(drawnCenter(el).x).toBeCloseTo(held.x - offset, 0);
    expect(drawnCenter(el).y).toBeCloseTo(held.y, 0);

    const drop = { x: 500, y: 400 };
    await act(async () => {
      point(el, "pointermove", 1, drop.x, drop.y);
      point(el, "pointerup", 1, drop.x, drop.y);
    });
    const placement = onCommit.mock.lastCall?.[1];
    if (!placement) throw new Error("the sticker wasn't put down");
    const center = toBoard(TURNED.panel, toPx(REFERENCE_FIELD, placement));
    expect(center.x).toBeCloseTo(drop.x - offset, 0);
    expect(center.y).toBeCloseTo(drop.y, 0);
  });

  it("stops a sticker growing at the same share of the panel on any board, so the biggest still fits", () => {
    const el = show(TURNED, { stickers: [{ ...sticker, width: 100, height: 100 }] });
    const corner = el.querySelector('[data-handle="scale"]');
    if (!corner) throw new Error("no corner handle");
    act(() => {
      point(corner, "pointerdown", 1, 600, 400);
      point(corner, "pointermove", 1, 5000, 5000);
    });
    expect(parseFloat(el.style.height)).toBeCloseTo(S_MAX * TURNED.panel.width, 0);
    expect(parseFloat(el.style.height)).toBeLessThan(TURNED.panel.height);
  });
});
```

In `ArtistBoard.test.tsx`, import `fieldOn, toPx` from `./placement` and `visitorFrame` from `./boardPanel`, then add:

```tsx
describe("ArtistBoard's stickers", () => {
  it("sit where their owner's board draws them, on the same panel, centered", async () => {
    // An iPad's board in landscape, where the panel is much narrower than the board.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1180);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(752);
    const [first] = stickersIn(await visit(three()));
    if (!first) throw new Error("no stickers drawn");
    const [x = NaN] = (/translate\((-?[\d.]+)px/.exec(first.style.transform) ?? [])
      .slice(1)
      .map(Number);
    const at = toPx(fieldOn(visitorFrame(1180, 752).panel), { x: 0.2, y: 0.2 });
    expect(x + parseFloat(first.style.width) / 2).toBeCloseTo(at.x, 0);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/placement.test.ts src/sticker-board/useBoardGestures.test.tsx src/sticker-board/ArtistBoard.test.tsx` → fails: `fieldOn`, `REFERENCE_FIELD` and the `layout` option don't exist.
- [ ] **Step 3: `placement.ts`.** Add `import { REFERENCE_BOARD, type Panel } from "./boardPanel";` and `import { STRIP } from "./tray/trayMeasures";`. In `Placement`, the comments become `/** Center, as fractions of the reference board's field. */` and `/** Long side, as a fraction of the reference board's width. */`. `/** The right edge belongs to the sticker tray. */ const TRAY_EDGE = 40;` becomes `/** The right edge belongs to the sticker tray's strip, as wide in reference px as on a phone. */ const TRAY_EDGE = STRIP;`. Replace `fieldOf` with:

```ts
/** The reference board's field, in reference px: under the header band, clear of the tray's strip. */
export const REFERENCE_FIELD: Field = {
  left: INSET + 4,
  top: HEADER,
  w: REFERENCE_BOARD.width - (INSET + 4) - TRAY_EDGE,
  h: REFERENCE_BOARD.height - FOOT - HEADER,
};

/** The reference field as the panel draws it, in board px. */
export const fieldOn = (panel: Panel): Field => ({
  left: panel.left + REFERENCE_FIELD.left * panel.scale,
  top: panel.top + REFERENCE_FIELD.top * panel.scale,
  w: REFERENCE_FIELD.w * panel.scale,
  h: REFERENCE_FIELD.h * panel.scale,
});
```

`sizeOf` and `stickerBox` rename their `boardWidth` parameter `panelWidth`. `sizeOf`'s comment becomes `/** A sticker's size on a panel this wide: `s` sets its long side, and the art sets its shape. */`.

- [ ] **Step 4: `boardGesture.ts`.** Imports become `import { REFERENCE_BOARD, type Panel } from "./boardPanel";` and `import { clampS, REFERENCE_FIELD } from "./placement";`. The `STEP_MOVE` comment says "in reference px" for "in px", and so does `pinchBy`'s for "in board pixels". Replace `dragBounds`:

```ts
/**
 * Where a held sticker's center may go, in reference px: a little over the header, and past the tray's
 * strip to the board's own edge. Where it's let go still lands on the field.
 */
export const dragBounds = (panel: Panel, boardW: number) => ({
  minX: REFERENCE_FIELD.left,
  maxX: (boardW - 12 - panel.left) / panel.scale,
  minY: REFERENCE_FIELD.top - 10,
  maxY: REFERENCE_BOARD.height - 18,
});
```

- [ ] **Step 5: `useBoardGestures.ts`.**

Imports: `EASE_PEEL` becomes `clamp, EASE_PEEL`, and the second `./placement` import becomes `import { REFERENCE_FIELD, sizeOf, toFrac, toPx, transformAt } from "./placement";`. Add `import { toBoard, toReference, type OwnBoardLayout, type Panel } from "./boardPanel";`.

In `Options`, `field` and `size` give way to `/** Your board's panel, and the tray's place by it; null until the board is measured. */ layout: OwnBoardLayout | null;`.

`Live`'s comment says "in reference px on the panel" for "in board pixels". In `Gesture`, the drag member gains `grab: Pt`, under the comment `/** `p0`is in board px, for the slops;`grab`, `from`and`start` in reference px, so a resize mid-gesture keeps up. */`.

Beside `arranging`, add `const relaying = useRef<() => void>(() => {});`. After the effect, add:

```ts
// A board that changes size mid-gesture, as an iPad turns, keeps the sticker in hand under the finger.
useLayoutEffect(() => relaying.current(), [options.layout]);
```

In the effect, `liveOf`, `local` and `pairOf` are replaced with:

```ts
/** The panel the board is drawn on, once it's measured. */
const panelNow = (): Panel | null => {
  const panel = latest.current.layout?.panel;
  return panel && panel.scale > 0 ? panel : null;
};
const liveOf = (p: Placement): Live => ({ ...toPx(REFERENCE_FIELD, p), s: p.s, r: p.r });
/** Where the stage is on screen, and how much it's drawn scaled mid-turn. */
const refreshOrigin = () => {
  const r = stage.getBoundingClientRect();
  origin = { left: r.left, top: r.top, k: r.width / (stage.offsetWidth || r.width || 1) };
};
const local = (e: PointerEvent): Pt => ({
  x: (e.clientX - origin.left) / origin.k,
  y: (e.clientY - origin.top) / origin.k,
});
const pairOf = (panel: Panel): { pair: [number, number]; start: [Pt, Pt] } => {
  const [[a, at], [b, bt]] = [...pointers.entries()];
  return { pair: [a, b], start: [toReference(panel, at), toReference(panel, bt)] };
};
```

Replace `draw` and `commit`:

```ts
/** Puts the element where `live` says, on the panel as it is now, without React. */
const draw = (el: HTMLElement, sticker: BoardSticker, live: Live) => {
  const panel = panelNow();
  if (!panel) return;
  const at = toBoard(panel, live);
  const { w, h } = sizeOf(panel.width, live.s, sticker);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.transform = transformAt(at.x, at.y, w, h, live.r);
};

/** Saves where `live` leaves the sticker, and returns that spot. */
const commit = (el: HTMLElement, sticker: BoardSticker, live: Live): Placement => {
  const at = toFrac(REFERENCE_FIELD, live);
  const placement: Placement = {
    on: true,
    x: round(at.x, 4),
    y: round(at.y, 4),
    s: round(live.s, 4),
    r: round(normalizeTurn(live.r), 2),
    z: sticker.placement.z,
  };
  // Let go past the field's edge, it settles on the field; React draws the same when it catches up.
  draw(el, sticker, liveOf(placement));
  latest.current.onCommit(sticker.id, placement);
  return placement;
};
```

`step` drops `const { field } = latest.current;`. Its guard becomes `if (!panelNow() || !sticker || !el || leaving.has(id)) return;`, its `from` is `stepped?.live ?? liveOf(sticker.placement)`, and its held-at-the-edge line is `const live = { ...next, ...toPx(REFERENCE_FIELD, toFrac(REFERENCE_FIELD, next)) };`.

`peelMark`'s head, through `const { w, h } = …`, becomes the lines below. Its `transformAt(live.x, live.y, …)` becomes `transformAt(at.x, at.y, …)`.

```ts
const mask = sticker.urls.mask;
const panel = panelNow();
if (latest.current.reduced || !panel) return;
const at = toBoard(panel, live);
const { w, h } = sizeOf(panel.width, live.s, sticker);
```

In `dropHeld`, `const into = await intoTray(g.id, g.live);` becomes `const panel = panelNow(); const into = panel ? await intoTray(g.id, toBoard(panel, g.live)) : false;`.

In `stow`:

- Its head, through the guard, becomes `const saved = saveSteps(); const { layout, reduced } = latest.current; const panel = panelNow(); const sticker = stickerOf(id); if (!sticker || !layout || !panel || stowingId || leaving.has(id)) return;`.
- Its `readingOrder(…)` maps with `toPx(REFERENCE_FIELD, s.placement)`.
- From `const from = liveOf(…)` through `const to = …`, it becomes the lines below.
- The keyframes' first two `at(from…)` become `at(start)` and `at({ x: start.x, y: start.y - 10 }, 1.05)`.

```ts
const from = liveOf(saved?.id === id ? saved.placement : sticker.placement);
peelMark(sticker, from);
const { w, h } = sizeOf(panel.width, from.s, sticker);
const start = toBoard(panel, from);
const fieldTop = panel.top + REFERENCE_FIELD.top * panel.scale;
// It rides to the tray: to the board's edge over the stickers, onto the Zipper beside the panel.
const to = {
  x: layout.trayBeside ? layout.zipX : layout.W - STOW_EDGE,
  y: Math.min(layout.H - 90, Math.max(fieldTop + 40, start.y)),
};
```

In `onDown`:

- `const { field, selected } = latest.current;` becomes `const { selected } = latest.current; const panel = panelNow();`, and the guard's `!field` becomes `!panel`.
- The `origin = …` block becomes `if (pointers.size === 0) refreshOrigin();`.
- Both `liveOf(…, field)` calls drop `field`.
- The pinch gesture spreads `...pairOf(panel)`.
- The handle gesture's `from: pt` becomes `from: toReference(panel, pt)`.

Replace `onMove` with:

```ts
/** Moves the sticker in hand to where its pointers are now, on the panel as it is now. */
const follow = (g: Exclude<Gesture, { mode: "maybe" | "bg" }>, pt: Pt) => {
  const { layout } = latest.current;
  const panel = panelNow();
  const sticker = stickerOf(g.id);
  if (!layout || !panel || !sticker) return;
  const at = toReference(panel, pt);
  if (g.mode === "drag") {
    // The finger may carry it over the header and past the tray's strip; it settles on the field.
    const bounds = dragBounds(panel, layout.W);
    g.live = {
      ...g.b0,
      x: clamp(g.b0.x + at.x - g.grab.x, bounds.minX, bounds.maxX),
      y: clamp(g.b0.y + at.y - g.grab.y, bounds.minY, bounds.maxY),
    };
    // Near its used sticker silhouette in the open tray, the tray draws it in.
    const snap = latest.current.tray.current?.boardDrag(g.id, toBoard(panel, g.live))?.snap;
    if (snap) {
      const { w, h } = sizeOf(panel.width, g.live.s, sticker);
      g.el.style.transform = `${transformAt(snap.x, snap.y, w, h, snap.r)} scale(${snap.scale.toFixed(3)})`;
      return;
    }
  } else if (g.mode === "scale") g.live = { ...g.b0, s: scaleBy(g.b0, g.from, at, g.b0.s) };
  else if (g.mode === "rotate") g.live = { ...g.b0, r: turnBy(g.b0, g.from, at, g.b0.r) };
  else {
    const a = pointers.get(g.pair[0]);
    const b = pointers.get(g.pair[1]);
    if (!a || !b) return;
    const next = pinchBy(g.start, [toReference(panel, a), toReference(panel, b)], g.b0);
    g.live = { ...next, ...toPx(REFERENCE_FIELD, toFrac(REFERENCE_FIELD, next)) };
  }
  draw(g.el, sticker, g.live);
};

/** The board changed size mid-gesture: the sticker in hand follows the finger onto the new panel. */
relaying.current = () => {
  const g = gesture.current;
  const last = [...pointers.values()].at(-1);
  if (!g || g.mode === "maybe" || g.mode === "bg" || !last) return;
  refreshOrigin();
  follow(g, last);
};

const onMove = (e: PointerEvent) => {
  if (!pointers.has(e.pointerId)) return;
  const pt = local(e);
  pointers.set(e.pointerId, pt);
  const panel = panelNow();
  let g = gesture.current;
  if (!g || g.mode === "bg" || !panel) return;
  const sticker = stickerOf(g.id);
  if (!sticker) return;
  if (g.mode === "maybe") {
    if (!passedSlop(g.p0, pt)) return;
    const b0 = liveOf(sticker.placement);
    g = gesture.current = {
      mode: "drag",
      id: g.id,
      el: g.el,
      p0: g.p0,
      grab: toReference(panel, g.p0),
      b0,
      live: b0,
    };
    pick(g.id, g.el);
    startHold(g);
    peelMark(sticker, b0);
    // Picked up, it catches the light: a sheen sweeps across its resin.
    const sheen = sheenIn(g.el);
    if (sheen && !latest.current.reduced) sweepSheen(sheen);
  }
  follow(g, pt);
};
```

The rest of the effect:

- In `onUp`, the pinch handoff becomes `if (g.pair.includes(e.pointerId) && pointers.size >= 2) { const panel = panelNow(); if (panel) gesture.current = { ...g, ...pairOf(panel), b0: g.live }; }`.
- In `onKey`, `const { field, selected } = latest.current;` becomes `const { selected } = latest.current;`, the guard becomes `if (!panelNow() || !(e.target instanceof Element)) return;`, and `points` maps with `toPx(REFERENCE_FIELD, s.placement)`.
- The cleanup adds `relaying.current = () => {};`.

- [ ] **Step 6: `PlacedSticker.tsx` and `BoardLoading.tsx`.**

`PlacedSticker`'s `boardWidth: number;` prop becomes `/** The panel's width, which sizes stickers. */ panelWidth: number;`, renamed in the destructuring and passed as `stickerBox(field, panelWidth, sticker.placement, sticker)`.

`BoardLoading` takes the panel:

- Add `import type { Panel } from "./boardPanel";`.
- `SPOTS`' comment becomes `/** Where the placeholder stickers sit, as shares of the panel, their size in reference px, turned as a hand would stick them. */`.
- The signature is `export function BoardLoading({ panel }: { panel: Panel })`, with the comment `/** Faint sticker shapes on the panel while its stickers load, where stickers usually sit. */`.
- Each `Skeleton` takes `width={spot.size * panel.scale} height={spot.size * panel.scale} style={{ left: panel.left + (spot.x / 100) * panel.width, top: panel.top + (spot.y / 100) * panel.height, rotate: `${spot.turn}deg` }}`.

- [ ] **Step 7: `StickerBoard.tsx`.** In the `./placement` import, `fieldOf` becomes `fieldOn, REFERENCE_FIELD`. Add `import { ownBoardLayout } from "./boardPanel";`. Replace `const field = useMemo(() => size && fieldOf(size.W, size.H), [size]);` with:

```ts
/** Your board's panel, and the sticker tray's place by it. */
const layout = useMemo(() => size && ownBoardLayout(size.W, size.H), [size]);
const field = useMemo(() => layout && fieldOn(layout.panel), [layout]);
```

Then `size` gives way to `layout`:

- `chips`: `!field || !layout`, and `box: stickerBox(field, layout.panel.width, s.placement, s)`.
- `useBoardGestures({…})`: `field,` and `size,` become `layout,`.
- `trayBoard.stickerRect`: `if (!s || !field || !layout) return null;`, and its box takes `layout.panel.width`.
- `trayBoard.sizeFor`: `return s && layout ? sizeOf(layout.panel.width, s.placement.s, s) : { w: 0, h: 0 };`.
- `order`: `readingOrder(onBoard.map((s) => ({ id: s.id, ...toPx(REFERENCE_FIELD, s.placement) })))`.
- `chosenBox`: `chosen && field && layout && stickerBox(field, layout.panel.width, chosen.placement, chosen)`.
- The skeleton: `{!stickers && board.state === "loading" && layout && <BoardLoading panel={layout.panel} />}`.
- The stickers: `{field && layout && inOrder.map((s) => (` with `panelWidth={layout.panel.width}`. The toolbar's sticker box takes `layout.panel.width`, and its `board={size}` becomes `board={layout}`.

- [ ] **Step 8: `ArtistBoard.tsx`.** The `./placement` import becomes `import { boxOf, fieldOn, kept, REFERENCE_FIELD, stickerBox, toPx, type Box } from "./placement";`. Add `import { visitorFrame } from "./boardPanel";`, and delete `visitField` with its comment. Replace `const field = size && visitField(size.W, size.H);` with:

```ts
/** Their board, drawn on the same panel as their own, centered: there's no tray beside it. */
const frame = useMemo(() => size && visitorFrame(size.W, size.H), [size]);
const field = frame && fieldOn(frame.panel);
```

Then:

- `order` and `onStageKeyDown`'s `points` map with `toPx(REFERENCE_FIELD, s.placement)`.
- `chips`: `!field || !frame`, with the box at `frame.panel.width`.
- The stickers: `{field && frame && inOrder.map((s) => (` with `panelWidth={frame.panel.width}`. The toolbar's sticker box takes `frame.panel.width`, and the toolbar takes `board={frame}`.

- [ ] **Step 9:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board` and `pnpm -C apps/frontend typecheck` → pass. Then `rg -n "fieldOf|visitField|boardWidth" apps/frontend/src` → nothing.
- [ ] **Step 10:** Commit: `feat: stickers sit on the panel in reference units, the same composition on every device`

### Task 3: Controls keep their size on the panel; only stickers scale

UI edits. Before any of them, read `~/.claude/skills/impeccable/reference/craft-floor.md`, and judge them through `/impeccable adapt`.

**Files:** Create `testBoardFrame.ts`. Modify:

- `boardPanel.ts`, `placement.ts` and `placement.test.ts`;
- `StickerToolbar.tsx` and its test, `ArtistChipLayer.tsx` and its test;
- `StickerBoard.tsx` and `.css`, `ArtistBoard.tsx` and `.css`;
- `styles/tokens.css`, `stickers/sticker-figure.css` and `stickers/sticker-foil.css`.

- [ ] **Step 1: Write the failing tests.** Create `testBoardFrame.ts`:

```ts
import { REFERENCE_BOARD, type BoardFrame } from "./boardPanel";
import { STRIP } from "./tray/trayMeasures";

/** A board whose panel and header band fill it, with the sticker tray's strip down its right edge. */
export const fullFrame = (W: number, H: number): BoardFrame => ({
  W,
  H,
  panel: { scale: W / REFERENCE_BOARD.width, left: 0, top: 0, width: W, height: H },
  trayEdge: W - STRIP,
  band: { left: 0, width: W },
});
```

In `placement.test.ts`:

- Import `fullFrame` from `./testBoardFrame`, and `ownBoardLayout`.
- Every `toolbarSpot(…, board, …)` and `hintSpot(…, board, …)` passes `fullFrame(board.W, board.H)` in place of `board`.
- The assertions against `board.W - 40` use `fullFrame(board.W, board.H).trayEdge`.

Add:

```ts
it("keeps the toolbar inside a narrower panel, clear of the tray's strip, and past one too narrow for it, on the board", () => {
  const bar = { w: 303, h: 49 };
  const ipad = ownBoardLayout(1180, 752);
  const { panel } = ipad;
  for (const x of [panel.left, panel.left + panel.width / 2, panel.left + panel.width]) {
    const { left } = toolbarSpot(
      { x, y: panel.top + panel.height / 2, w: 120, h: 100, r: 0 },
      ipad,
      bar,
    );
    expect(left).toBeGreaterThanOrEqual(panel.left);
    expect(left + bar.w).toBeLessThanOrEqual(ipad.trayEdge);
  }
  const sheet = ownBoardLayout(540, 552);
  const { left } = toolbarSpot(
    { x: sheet.panel.left + sheet.panel.width, y: 300, w: 80, h: 80, r: 0 },
    sheet,
    bar,
  );
  expect(left).toBeGreaterThan(0);
  expect(left + bar.w).toBeLessThan(sheet.W);
  expect(left + bar.w).toBeGreaterThan(sheet.trayEdge);
});
```

In `ArtistChipLayer.test.tsx`, `const BOARD = { W: 390, H: 700 };` becomes `const FRAME = fullFrame(390, 700);`. The render passes `frame={FRAME}`, and `BOARD.W` and `BOARD.H` become `FRAME.W` and `FRAME.H`. In `StickerToolbar.test.tsx`, `board={{ W: 390, H: 657 }}` becomes `frame={fullFrame(390, 657)}`.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/placement.test.ts src/sticker-board/ArtistChipLayer.test.tsx src/sticker-board/StickerToolbar.test.tsx` → fails on types and on the new test.
- [ ] **Step 3: `placement.ts`.** Add `type BoardFrame` to the `./boardPanel` import. After `MIDDLE_CLEAR`, add:

```ts
/** A full-size control keeps this far inside the board's edges. */
const EDGE = 10;

/**
 * Where a full-size control `w` px wide may sit across the board, as its left edge's range: inside the
 * panel and clear of the tray's strip where that fits; else from the board's left inset; over the strip
 * only on a panel too narrow for it.
 */
export function controlSpan(frame: BoardFrame, w: number) {
  const clear = frame.trayEdge - 4 - w;
  const last = clear >= EDGE ? clear : frame.W - EDGE - w;
  const first = Math.max(EDGE, Math.min(frame.panel.left + EDGE, last));
  return { first, last: Math.max(first, last) };
}

/** Where a full-size control may sit top to bottom: under the header, above the panel's foot. */
const controlBand = ({ panel }: BoardFrame) => ({
  top: panel.top + Math.max(HEADER, HEADER * panel.scale) - 6,
  bottom: panel.top + panel.height - 12,
});
```

`toolbarSpot` takes `frame: BoardFrame` for `board: { W: number; H: number }`:

- `left` becomes `const span = controlSpan(frame, toolbar.w); const left = clamp(sticker.x - toolbar.w / 2, span.first, span.last);`.
- `highest` and `lowest` become `const band = controlBand(frame); const highest = band.top; const lowest = band.bottom - toolbar.h;`.
- `top + toolbar.h > board.H - 12` becomes `top + toolbar.h > band.bottom`.
- Its comment's "never over the header or the sticker tray's edge" becomes "never over the header, and inside the panel clear of the tray's strip where it fits".

`hintRoom` becomes `/** The widest the first selection's hint can be: from the board's left inset to the tray's strip. */ export const hintRoom = (frame: BoardFrame) => frame.trayEdge - 4 - EDGE;`.

`hintSpot` takes `frame: BoardFrame`. Its `left` is `const span = controlSpan(frame, hint.w); const left = clamp((toolbar.left + toolbar.right) / 2 - hint.w / 2, span.first, span.last);`, and its loop is `const band = controlBand(frame); for (let top = band.top; top + hint.h <= band.bottom; top++) {`.

- [ ] **Step 4: `StickerToolbar.tsx`.** Import `type BoardFrame`. The `board` prop becomes `/** The board as its full-size controls see it: the panel, and where the tray's strip starts. */ frame: BoardFrame;`, passed to `toolbarSpot`, `hintRoom` and `hintSpot`. After `el.dataset.over = …`, add:

```ts
// On a panel too narrow for it, it reaches over the tray's strip, and is drawn above the tray there.
el.dataset.overTray = String(left + bar.w > frame.trayEdge);
```

- [ ] **Step 5: `ArtistChipLayer.tsx`.** Import `type BoardFrame`. The `board` prop becomes `/** The board as its full-size controls see it: chips keep under the header and clear of the tray. */ frame: BoardFrame;`, and the component calls `placeChips(chips, frame)`. `placeChips(chips: Chip[], { panel, trayEdge }: BoardFrame)` clamps with `const left = clamp(x - w / 2 - 10, 8, trayEdge - 4 - CHIP_W);` and `let top = clamp(y - h / 2 - 20, panel.top + 74, panel.top + panel.height - 150);`.
- [ ] **Step 6: `boardPanel.ts`.** Add `import type { CSSProperties } from "react";` and:

```ts
/**
 * The panel's and the header band's places as CSS variables, for what sits on their edges at its own
 * size, and the panel's scale, which only the stickers' kiss-cut, cast and foil follow.
 */
export const boardVars = ({ panel, band }: BoardFrame): CSSProperties => ({
  "--panel-x": `${panel.left}px`,
  "--panel-w": `${panel.width}px`,
  "--panel-k": panel.scale,
  "--band-x": `${band.left}px`,
  "--band-w": `${band.width}px`,
});
```

- [ ] **Step 7: The boards.** In both, import `boardVars`.
- `StickerBoard.tsx`: the front's root takes `style={layout ? boardVars(layout) : undefined}`. The toolbar takes `frame={layout}` for `board={layout}`. The chip layer becomes `{chips.length > 0 && layout && (<ArtistChipLayer chips={chips} frame={layout} … />)}`.
- `ArtistBoard.tsx`: the front's root takes `style={frame ? boardVars(frame) : undefined}`. The toolbar takes `frame={frame}`, and the chip layer becomes `{chips.length > 0 && frame && (<ArtistChipLayer chips={chips} frame={frame} … />)}`.
- [ ] **Step 8: CSS, what keeps its size.** Every offset is measured from the band's or the panel's edges, with `var(…)` fallbacks that keep today's look before the board is measured. Write `BR(N)` for `calc(100% - var(--band-x, 0px) - var(--band-w, 100%) + N)`.

`StickerBoard.css`:

- `.board-who`: `left: calc(var(--band-x, 0px) + 14px)` and `max-width: calc(var(--band-w, 100%) * 0.62)`. `.board-who.is-roomy`: `max-width: calc(var(--band-w, 100%) - 28px)`. Its comment becomes `/* Header: your picture and name at the header band's left, above every sticker, at its own size. It turns the board over to its stat board. */`.
- `.board-gifts`: `right: BR(12px)`.
- `.board-draw` and `.board-nudge`: `left: calc(var(--band-x, 0px) + 14px)`. Their `bottom`s stay on the board's foot. `.board-draw`'s comment becomes `/* Draw: the board's one key, at the header band's left and the board's foot, in the thumb's reach. */`.
- `.board-alerts`: `left: calc(var(--band-x, 0px) + 14px)` and `right: calc(100% - var(--panel-x, 0px) - var(--panel-w, 100%) + 44px)`.
- A new rule:

```css
/* On a panel too narrow for it, the toolbar reaches over the tray's strip, and stays on top of it. */
.sticker-toolbar[data-over-tray="true"] {
  z-index: 975;
}
```

`ArtistBoard.css`: `.explore-chip`'s `right` becomes `BR(14px)`.

- [ ] **Step 9: CSS, what scales: only a sticker's geometry.**

In `tokens.css`, move `--sticker-cut` and `--sticker-cast` out of the `:root` block into their own rule:

```css
/* A sticker's kiss-cut and cast. Declared again on a board's stickers, so there they resolve at the
   panel's scale, as the sticker's image is drawn; everywhere else --panel-k is unset, so 1. */
:root,
.placed-sticker {
  --sticker-cut: drop-shadow(
    0 0 calc(0.5px * var(--panel-k, 1)) rgba(28, 24, 36, 0.55)
  ); /* the kiss-cut groove */
  --sticker-cast: drop-shadow(
      calc(1px * var(--panel-k, 1)) calc(2px * var(--panel-k, 1)) calc(1.5px * var(--panel-k, 1))
        rgba(28, 24, 36, 0.16)
    )
    drop-shadow(
      calc(2px * var(--panel-k, 1)) calc(6px * var(--panel-k, 1)) calc(8px * var(--panel-k, 1))
        rgba(28, 24, 36, 0.1)
    );
}
```

The other three:

- `StickerBoard.css`, in `.placed-sticker.is-dragging :is(.sticker-figure__img, .sticker-foil__cast)`: each length of the two `drop-shadow`s is multiplied by `var(--panel-k, 1)`, e.g. `drop-shadow(calc(3px * var(--panel-k, 1)) calc(8px * var(--panel-k, 1)) calc(6px * var(--panel-k, 1)) rgba(28, 24, 36, 0.18))`.
- `stickers/sticker-figure.css`, `.sticker-figure.is-curled .sticker-figure__flapw`: `filter: drop-shadow(calc(1.2px * var(--panel-k, 1)) calc(2.2px * var(--panel-k, 1)) calc(1.4px * var(--panel-k, 1)) rgba(28, 24, 36, 0.26));`.
- `stickers/sticker-foil.css`, `.sticker-foil--board`: `--foil-w: calc(5px * var(--panel-k, 1));`.

The header's photo sticker, the artist chips and every other control sit outside `.placed-sticker`, so they keep today's shadows.

- [ ] **Step 10:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board src/stickers` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 11:** Commit: `feat: the board's controls keep their size on the panel, and only its stickers scale`

### Task 4: The Zipper opens to the left or the right

**Files:** Modify `apps/frontend/src/sticker-board/tray/zipper.ts` and `zipper.test.ts`, and the `createZipper` call in `trayEngine.ts`. The Explore and dialogs plan also edits both zipper files, routing `onMotion` through `toScreenAxes` (Setup): leave `onMotion`, `nudge` and the swing tests to it, and rebase over its lines if it lands first.

- [ ] **Step 1: Write the failing tests.** `OPTIONS` gains `opens: "left"`. Add:

```ts
describe("the Zipper, opening either way", () => {
  /** Where each tooth of a row sits across the track. */
  const teethX = (row: "a" | "b") =>
    [...zip.el.querySelectorAll<HTMLElement>(`.zip__seg--${row}`)].map((el) =>
      parseFloat(/translate\((-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? "NaN"),
    );
  const openFully = async () => {
    void zip.open();
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
  };

  it("parts its left row over the board, the right row staying on the chain", async () => {
    await openFully();
    const { chainX } = zip.geometry();
    expect(Math.min(...teethX("a"))).toBeLessThan(chainX - OPTIONS.maxGap / 2);
    expect(teethX("b").every((x) => Math.abs(x - chainX) < 1)).toBe(true);
  });

  it("parts its right row beside the board when it opens to the right, the lining between them", async () => {
    zip.destroy();
    zip = createZipper(host, { ...OPTIONS, chainAt: 15, opens: "right" });
    await openFully();
    const { chainX } = zip.geometry();
    expect(Math.max(...teethX("b"))).toBeGreaterThan(chainX + OPTIONS.maxGap / 2);
    expect(teethX("a").every((x) => Math.abs(x - chainX) < 1)).toBe(true);
    const shown = [...zip.el.querySelectorAll<HTMLElement>(".zip__sliver")].filter(
      (el) => el.style.opacity === "1",
    );
    expect(shown.length).toBeGreaterThan(0);
    for (const el of shown) {
      const [x = NaN, across = NaN] = (
        /translate\((-?[\d.]+)px,-?[\d.]+px\) scaleX\((-?[\d.]+)\)/.exec(el.style.transform) ?? []
      )
        .slice(1)
        .map(Number);
      expect(x).toBeGreaterThan(chainX);
      expect(across).toBeLessThan(0);
    }
  });

  it("moves its chain, widens its mouth and turns it the other way when reshaped", async () => {
    zip.reshape({ chainAt: 15, maxGap: 250, opens: "right" });
    await openFully();
    expect(zip.geometry().chainX).toBe(15);
    expect(Math.max(...teethX("b"))).toBeGreaterThan(15 + OPTIONS.maxGap);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray/zipper.test.ts` → fails: `opens` and `reshape` don't exist.
- [ ] **Step 3: Implement.**

`ZipperOptions` gains `/** Which row parts: the left, opening over the board, or the right, opening beside it. */ opens: "left" | "right";`. `ZipperGeometry` gains `opens: ZipperOptions["opens"];`, and `lipX`'s comment becomes `/** The parting lip's x at a place on the track. */`. `Zipper` gains `/** Moves the chain, sets the mouth's widest, or turns it the other way, and redraws. */ reshape: (next: Partial<Pick<ZipperOptions, "chainAt" | "maxGap" | "opens">>) => void;`.

`const o = options;` becomes `const o: ZipperOptions = { ...options };`. In the comments on `LINING`, `gapOf` and the geometry, "the left row" and "the left lip" become "the parting row" and "the parting lip", and "the right row" becomes "the still row".

In `renderChain`, replace everything above the lining loop with:

```ts
// The row that parts: the left one, opening over the board, or the right one, opening beside it.
const right = o.opens === "right";
const outward = right ? -1 : 1;
const [parting, still] = right ? [teethB, teethA] : [teethA, teethB];
const total = shape.G > 0.05 ? sample() : 0;
const len = Math.max(1e-3, shape.sM);
const stretch = total > 0 ? Math.max(1, total / len) : 1;
// The parting row's teeth run along the curve, spaced by their place on the tape.
for (const s of parting) {
  if (total > 0 && s.a < shape.sM) {
    const q = at((shape.sM - s.a) * stretch);
    put(
      s,
      `translate(${f2(chainX + outward * q.c + ripple(q.a))}px,${f2(yOf(q.a))}px) rotate(${f2(outward * q.ang)}deg)`,
    );
    putTape(s, stretch > 1.002 ? `scaleY(${stretch.toFixed(3)})` : "");
  } else {
    put(s, `translate(${f2(chainX + ripple(s.a))}px,${f2(yOf(s.a))}px)`);
    putTape(s, "");
  }
}
for (const s of still) put(s, `translate(${f2(chainX + ripple(s.a))}px,${f2(yOf(s.a))}px)`);
```

In the lining loop, from `const g = Math.max(…)` through its `put`:

```ts
const g = Math.max(gap(lo), gap(hi), gap(sl.a));
// From under the parting lip to just under the chain, its shaded end at the lip.
const lip = g + LINING.underLip;
const across = (lip + LINING.underChain) / LINING.width;
put(
  sl,
  right
    ? `translate(${f2(chainX + lip)}px,${f2(yOf(sl.a))}px) scaleX(${(-across).toFixed(3)})`
    : `translate(${f2(chainX - lip)}px,${f2(yOf(sl.a))}px) scaleX(${across.toFixed(3)})`,
);
```

The top stops:

```ts
// The parting tape's top stop rides out with its lip.
const topStop = STOP / 2;
const out = gap(topStop);
stopA.style.transform = `translate(${f2(chainX - STOP_SIDE - (right ? 0 : out))}px,${f2(yOf(topStop))}px)`;
stopB.style.transform = `translate(${f2(chainX + STOP_SIDE + (right ? out : 0))}px,${f2(yOf(topStop))}px)`;
```

`geometry()` gains `opens: o.opens,` and `lipX: (a) => chainX + (o.opens === "right" ? gap(a) : -gap(a)),`. The `zipper` object gains:

```ts
    reshape(next) {
      if (destroyed) return;
      Object.assign(o, next);
      L = 0;
      if (build()) render();
      wake();
    },
```

`trayEngine.ts`'s `createZipper(col, { … })` gains `opens: "left"`.

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 5:** Commit: `feat: the Zipper opens to the left or the right, and can be reshaped`

### Task 5: The tray's stack scales to its mouth, not only down

**Files:** Create `apps/frontend/src/sticker-board/tray/trayModel.test.ts`. Modify `trayModel.ts`, `trayEngine.ts`, `traySheets.ts`, `traySpread.ts`, `trayPaging.ts`, `trayPresses.ts`, `trayPeel.ts` and `sticker-tray.css`.

- [ ] **Step 1: Write the failing test**, `trayModel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MIN_STACK_SCALE, SHEET, STACK_FOOT, STACK_Y, stackScaleFor } from "./trayModel";
import { GMAX, MAX_STACK_SCALE } from "./trayMeasures";

/** Where the open window would end for a stack at `scale` to fit it exactly. */
const footFor = (scale: number) => 2 + STACK_Y + STACK_FOOT + scale * SHEET.h;

describe("the open stack's scale", () => {
  it("shrinks to fit a short mouth, never under its least, and stays whole where it fits", () => {
    expect(stackScaleFor(footFor(0.8), null)).toBeCloseTo(0.8);
    expect(stackScaleFor(footFor(0.1), null)).toBe(MIN_STACK_SCALE);
    expect(stackScaleFor(footFor(1.4), null)).toBe(1);
    expect(stackScaleFor(null, null)).toBe(1);
  });

  it("grows beside the panel in a tall mouth, as far as the room by the chain holds its mouth", () => {
    const roomy = GMAX * MAX_STACK_SCALE * 2;
    expect(stackScaleFor(footFor(1.3), roomy)).toBeCloseTo(1.3);
    expect(stackScaleFor(footFor(3), roomy)).toBe(MAX_STACK_SCALE);
    expect(stackScaleFor(footFor(3), GMAX * 1.2)).toBeCloseTo(1.2);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray/trayModel.test.ts` → fails: no `stackScaleFor`.
- [ ] **Step 3: Rename `shrink` to `stackScale`:**

```bash
(cd apps/frontend/src/sticker-board/tray && sed -i '' -e 's/ui\.shrink/ui.stackScale/g' -e 's/shrunkInset()/stackInset(ui.stackScale)/g' traySheets.ts traySpread.ts trayPaging.ts trayPresses.ts trayPeel.ts trayEngine.ts && sed -i '' -e 's/--shrink/--stack-scale/g' sticker-tray.css trayEngine.ts)
```

- [ ] **Step 4: The rest by hand.**

`trayModel.ts`:

- Add `import { clamp } from "../../ui/easing";` and `import { GMAX, MAX_STACK_SCALE } from "./trayMeasures";`.
- `TrayState`'s `shrink` becomes `stackScale`, under the comment `/** How much the stack is scaled to fit its mouth: down from 1 on a short board, up beside a tall panel. The sheets scale; their words and the edges behind the front one keep their size on screen. */`.
- After `CRACK`, add:

```ts
/**
 * However short the tray, the stack is scaled to no less than this, so the dates on its narrowest
 * edge, kept at the fine-print floor, still sit beside the sheet's number.
 */
export const MIN_STACK_SCALE = 0.5;

/**
 * How much the stack is scaled, from where the fully open mouth's window ends (column px; null before
 * the Zipper has a size): down until its sheets, the edges behind them and the +N button fit. Beside the
 * panel, where the mouth may take `room` px, up to MAX_STACK_SCALE in a tall mouth, as far as that room holds.
 */
export function stackScaleFor(windowBot: number | null, room: number | null) {
  if (windowBot === null) return 1;
  const fits = (windowBot - 2 - STACK_Y - STACK_FOOT) / SHEET.h;
  const most = room === null ? 1 : clamp(room / GMAX, 1, MAX_STACK_SCALE);
  return clamp(fits, MIN_STACK_SCALE, most);
}

/** The stack's left inset, so a shrunk stack stays centered in its mouth. */
export const stackInset = (scale: number) => (SHEET.w * Math.max(0, 1 - scale)) / 2;
```

`trayEngine.ts`:

- Delete `MIN_SHRINK` with its comment, and make `shrink: 1,` read `stackScale: 1,`.
- Drop `shrunkInset` from the `traySheets` destructuring.
- In the `./trayModel` import, drop `SHEET` and `STACK_FOOT`, unused now, and add `stackInset, stackScaleFor`.
- Replace `shrunkFor` and `shrinkStack` with:

```ts
let fittedFor = 0;
/** Scales the stack until its sheets, the edges behind them and the +N button fit the open mouth. */
function fitStack(height: number) {
  if (!height || height === fittedFor) return;
  fittedFor = height;
  const scale = stackScaleFor(zip.openWindow()?.bot ?? null, null);
  if (Math.abs(scale - ui.stackScale) < 0.001) return;
  ui.stackScale = scale;
  stack.style.setProperty("--stack-scale", scale.toFixed(4));
  if (ui.model && ui.order.length) renderStack();
}
```

- `onFrame` calls `fitStack(g.H);` for `shrinkStack(g.H);`.

`traySheets.ts`: delete `shrunkInset`, its comment and its entry in the returned object.

`traySpread.ts` and `trayPeel.ts`: drop `shrunkInset` from the `traySheets` destructuring and import `stackInset` from `./trayModel`. In `trayPeel.ts`'s `rectOfFit`, the comment becomes `// A sheet on the stack is drawn scaled; a pulled-out one is full size.`, and `shrunk` is renamed `scaled`.

`sticker-tray.css`'s comments:

- On `.tray__stack`: `/* The engine scales the stack to its mouth: down on a short board, up beside a tall panel. Its words and edges keep their size on screen. */`.
- Above the depth shades: `/* Further back, a shade darker. Each level is also a little narrower, and the stack is scaled to fit, so its dates are set to land on the fine-print floor. */`.
- On `.tray__depth`: `/* The engine keeps it its own size however the stack is scaled. */`.

- [ ] **Step 5:** `rg -n -i "shrink|shrunk" apps/frontend/src/sticker-board/tray` → only `sheetPacking.ts` ("never shrunk to fit", about stickers on a sheet). Then `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 6:** Commit: `refactor: the tray's stack scales to its mouth, not only down`

### Task 6: The sticker tray opens beside the panel

UI edits. Before any of them, read `~/.claude/skills/impeccable/reference/craft-floor.md`, and judge them through `/impeccable adapt`.

**Files:** Create `tray/trayColumn.ts` and `trayColumn.test.ts`. Modify `tray/trayModel.ts`, `trayEngine.ts`, `trayBoardDrop.ts`, `trayPeel.ts`, `trayPresses.ts`, `traySpread.ts`, `sticker-tray.css` and `StickerTray.test.tsx`.

- [ ] **Step 1: Write the failing tests.** `trayColumn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ownBoardLayout, REFERENCE_BOARD } from "../boardPanel";
import { trayColumnFor } from "./trayColumn";
import { BESIDE_EDGE, GMAX, MAX_STACK_SCALE } from "./trayMeasures";

describe("the sticker tray's column", () => {
  it("runs down a phone's board's right edge, its Zipper opening over the stickers", () => {
    const place = ownBoardLayout(REFERENCE_BOARD.width, REFERENCE_BOARD.height);
    const { box, zipper } = trayColumnFor(place, GMAX);
    expect(zipper.opens).toBe("left");
    expect(box.left + box.width).toBe(place.W);
    expect(box.left + zipper.chainAt).toBe(place.zipX);
  });

  it("runs down the panel's right edge where there's room, opening beside it, to the board's foot and on the board", () => {
    // LINE's sheet, and iPads in Safari: mini upright, 11-inch and 13-inch turned.
    for (const [W, H] of [
      [540, 552],
      [744, 1065],
      [1180, 752],
      [1376, 964],
    ]) {
      const place = ownBoardLayout(W, H);
      const widest = Math.min(GMAX * MAX_STACK_SCALE, W - BESIDE_EDGE - place.zipX);
      const { box, zipper } = trayColumnFor(place, widest);
      expect(zipper.opens).toBe("right");
      expect(box.left + zipper.chainAt).toBeCloseTo(place.panel.left + place.panel.width);
      expect(box.left + box.width).toBeLessThanOrEqual(W);
      expect(box.top + box.height).toBe(H);
    }
  });
});
```

In `StickerTray.test.tsx`:

- Import `ownBoardLayout` and `REFERENCE_BOARD` from `../boardPanel`, `trayColumnFor` from `./trayColumn`, and `GMAX, MAX_STACK_SCALE` from `./trayMeasures`.
- Move `numbersIn` out of `describe("on a board of this height")` to module scope, unchanged.

Add:

```tsx
describe("beside a panel with room by it", () => {
  /** Your board this big, its tray's column measured where the layout puts it, with the tray open. */
  const openOnBoard = async (
    W: number,
    H: number,
    stickers: BoardStickerView[],
    side: Partial<TrayBoard> = {},
  ) => {
    const place = ownBoardLayout(W, H);
    const { box } = trayColumnFor(place, GMAX);
    const sized = (column: number, whole: number) =>
      function (this: HTMLElement) {
        return this.classList.contains("tray__col") ? column : whole;
      };
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(sized(box.width, W));
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(sized(box.height, H));
    boardReads.mockReturnValue(new DOMRect(0, 0, W, H));
    render(stickers, side);
    await openTray();
    return place;
  };
  /** Where the window the open stack shows through starts, in board px. */
  const windowLeft = () => {
    const [x = Number.NaN] = numbersIn(board.querySelector(".tray__w1"));
    return (
      Number.parseFloat(
        board.querySelector<HTMLElement>(".tray")?.style.getPropertyValue("--tray-col-x") ?? "",
      ) + x
    );
  };

  it("opens beside the panel on an iPad's board, and over the stickers on a phone's", async () => {
    const ipad = await openOnBoard(1180, 752, manyStickers(8));
    expect(windowLeft()).toBeGreaterThanOrEqual(ipad.zipX);
    act(() => root.unmount());
    root = createRoot(host);
    const phone = await openOnBoard(REFERENCE_BOARD.width, REFERENCE_BOARD.height, manyStickers(8));
    expect(windowLeft()).toBeLessThan(phone.zipX);
  });

  it("grows the stack in the tall mouth beside a 13-inch iPad's panel, never past its most", async () => {
    await openOnBoard(1376, 964, manyStickers(8));
    const [, , scale = Number.NaN] = numbersIn(stackEl());
    expect(scale).toBeGreaterThan(1);
    expect(scale).toBeLessThanOrEqual(MAX_STACK_SCALE);
  });

  it("takes back a board sticker let go past the Zipper, and leaves one let go on the panel", async () => {
    const remove = vi.fn();
    const place = await openOnBoard(1180, 752, [sticker("a", 1, true), sticker("b", 2, true)], {
      remove,
    });
    const y = place.trayTop + 200;
    let landed: (boolean | undefined)[] = [];
    await act(async () => {
      landed = [
        await tray.current?.boardDrop("b", { x: place.zipX - 80, y }),
        await tray.current?.boardDrop("a", { x: place.zipX + 40, y }),
      ];
    });
    expect(landed).toEqual([false, true]);
    expect(remove).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("sticks a peeled sticker on the board left of the Zipper, and puts back one let go beside the panel", async () => {
    endAnimationsAtOnce();
    const placed = vi.fn((_id: string) => Promise.resolve(document.createElement("div")));
    const place = await openOnBoard(1180, 752, manyStickers(8), { place: placed });
    const peelTo = async (x: number) => {
      const from = place.zipX + 120;
      pointer(
        frontSheet()?.querySelector('.tray__slot[data-state="here"]') ?? null,
        "pointerdown",
        from,
        300,
      );
      pointer(stackEl(), "pointermove", from - 20, 300);
      pointer(stackEl(), "pointermove", x, 300);
      pointer(stackEl(), "pointerup", x, 300);
      await act(async () => {});
    };
    await peelTo(place.zipX + 40);
    expect(placed).not.toHaveBeenCalled();
    await peelTo(place.zipX - 120);
    expect(placed).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray` → fails: no `./trayColumn`, and the tray never opens beside the panel.
- [ ] **Step 3: Create `trayColumn.ts`:**

```ts
/**
 * Where the sticker tray's column goes on the board, and how its Zipper is set up in it, in board px:
 * down the board's right edge, its mouth opening over the stickers, or down the panel's right edge,
 * its mouth opening beside it. Either way it runs from under the header to the board's foot.
 */
import type { OwnBoardLayout } from "../boardPanel";
import { CHAIN_INSET, COL, GMAX } from "./trayMeasures";

/** The tray's canvas edge, where the Zipper's still tape is sewn on. */
export const COVER = 24;
/** Beside the panel, past the mouth: the parting tape and a hair of room. */
const PAST_MOUTH = 18;

export interface TrayColumn {
  box: { left: number; top: number; width: number; height: number };
  /** The canvas edge's left. */
  cover: number;
  zipper: { chainAt: number; maxGap: number; opens: "left" | "right" };
}

/** The column for your board's layout, its mouth `maxGap` wide at most beside the panel. */
export function trayColumnFor(place: OwnBoardLayout, maxGap: number): TrayColumn {
  const height = place.H - place.trayTop;
  if (!place.trayBeside)
    return {
      box: { left: place.W - COL, top: place.trayTop, width: COL, height },
      cover: place.W - COVER,
      zipper: { chainAt: COL - CHAIN_INSET, maxGap: GMAX, opens: "left" },
    };
  return {
    box: {
      left: place.zipX - COVER,
      top: place.trayTop,
      width: COVER + maxGap + PAST_MOUTH,
      height,
    },
    cover: place.zipX - COVER,
    zipper: { chainAt: COVER, maxGap, opens: "right" },
  };
}
```

- [ ] **Step 4: `trayModel.ts`'s `Tray`.** The `Wb`, `Hb` and `colLeft` members, with their comment, become:

```ts
/** The board's width and height, where the tray's column sits on it, and where the Zipper's chain runs. */
Wb: () => number;
Hb: () => number;
colLeft: () => number;
colTop: () => number;
zipX: () => number;
/** The tray opens beside the sticker board's panel, rather than over its stickers. */
beside: () => boolean;
/** The open stack's top left, in board pixels. */
openStackAt: () => Point;
```

- [ ] **Step 5: `trayEngine.ts`.** Add `import { ownBoardLayout } from "../boardPanel";` and `import { trayColumnFor } from "./trayColumn";`. The trayMeasures import becomes `import { BESIDE_EDGE, GMAX } from "./trayMeasures";`.

Right after `board.append(root);`, insert the code below, and delete the later `Wb`, `Hb` and `colLeft` lines:

```ts
const Wb = () => board.clientWidth || 390;
const Hb = () => board.clientHeight || 657;
/** Your board's panel, and the tray's place by it: over the stickers, or beside the panel. */
let place = ownBoardLayout(Wb(), Hb());
/** The mouth's widest: a phone's, or wider beside the panel to hold a grown stack. */
let maxGap = GMAX;
let column = trayColumnFor(place, maxGap);
/** Puts the column, and the canvas edge its still tape is sewn to, where the layout says. */
function placeColumn() {
  root.dataset.side = place.trayBeside ? "beside" : "over";
  const { box, cover } = column;
  const set = (name: string, v: number) => root.style.setProperty(name, `${v.toFixed(1)}px`);
  set("--tray-col-x", box.left);
  set("--tray-col-y", box.top);
  set("--tray-col-w", box.width);
  set("--tray-col-h", box.height);
  set("--tray-cover-x", cover);
}
placeColumn();
```

The Zipper becomes `const zip = createZipper(col, { ...column.zipper, insets: [6, 6] });`. Where `colLeft` was, add the following, and add `colTop, zipX: () => place.zipX, beside: () => place.trayBeside, openStackAt,` to the `tray` object:

```ts
const colLeft = () => column.box.left;
const colTop = () => column.box.top;
const openStackAt = (): Point => {
  const chain = colLeft() + column.zipper.chainAt;
  const lip = place.trayBeside ? chain + 3 : chain - 0.97 * maxGap + 3;
  return { x: lip + 3 + stackInset(ui.stackScale), y: colTop() + STACK_Y };
};
```

Replace Task 5's `fitStack`:

```ts
let fittedFor = 0;
/**
 * Scales the stack to its open mouth: down until its sheets, the edges behind them and the +N button
 * fit a short one; beside the panel, up in a tall one, the mouth widening to hold it.
 */
function fitStack() {
  const room = place.trayBeside ? place.W - BESIDE_EDGE - place.zipX : null;
  const scale = stackScaleFor(zip.openWindow()?.bot ?? null, room);
  const gap = place.trayBeside ? GMAX * Math.max(1, scale) : GMAX;
  if (Math.abs(gap - maxGap) > 0.5) {
    maxGap = gap;
    column = trayColumnFor(place, maxGap);
    placeColumn();
    zip.reshape(column.zipper);
  }
  if (Math.abs(scale - ui.stackScale) < 0.001) return;
  ui.stackScale = scale;
  stack.style.setProperty("--stack-scale", scale.toFixed(4));
  if (ui.model && ui.order.length) renderStack();
}
/** The board changed size: the column goes over the stickers or beside the panel, as there's room. */
function layout() {
  const next = ownBoardLayout(Wb(), Hb());
  if (next.W === place.W && next.H === place.H) return;
  place = next;
  if (!place.trayBeside) maxGap = GMAX;
  column = trayColumnFor(place, maxGap);
  placeColumn();
  zip.reshape(column.zipper);
  fitStack();
}
const boardSize = new win.ResizeObserver(layout);
boardSize.observe(board);
```

In `onFrame`:

- `const open = clamp(G / (0.97 * GMAX), 0, 1);` becomes `const open = clamp(G / (0.97 * maxGap), 0, 1);`.
- `fitStack(g.H);` becomes `if (g.H && g.H !== fittedFor) { fittedFor = g.H; fitStack(); }`.
- In `if (range)`, `const xw = g.chainX - k * G + 3;` becomes:

```ts
const beside = place.trayBeside;
const mouth = k * G;
// The window the stack shows through runs from the parting lip to the chain.
const xw = beside ? g.chainX + 3 : g.chainX - mouth + 3;
w1.style.width = beside ? `${Math.max(0, mouth - 3).toFixed(2)}px` : "";
```

- `const bx = lerp(-58, 3, Math.pow(open, 0.85));` becomes `const bx = lerp(beside ? 64 : -58, 3, Math.pow(open, 0.85));`. Its comment says the stack slides out "from under the parting lip".

`destroy()` adds `boardSize.disconnect();`.

- [ ] **Step 6: The drop zones, the peel, the pulled-out sheet and the spread.**

`trayBoardDrop.ts`: drop `TOP`, `Wb` and `colLeft`, and destructure `zipX, colTop, beside` from `tray`. After `clearTarget`, add:

```ts
/** A board sticker brought this close to the Zipper opens the tray on its sheet, or goes in. */
const nearZipper = (pt: Point) => pt.x > zipX() - 59;
/** Over the open tray: past its parting lip over the stickers, or past the chain beside the panel. */
const overOpenTray = (pt: Point) => pt.x > (beside() ? zipX() : zipX() - (ui.geo?.G ?? 0)) - 12;
```

Then:

- `boardDrag`'s `nearEdge` is `nearZipper(pt) && pt.y > colTop() - 20`.
- `snapFor` drops `const lip = …`, and takes `const over = onPulled ? onPulled.over : overOpenTray(pt);`.
- `boardDrop` drops `const lip = …`, and takes `const into = onPulled || (zip.isOpen ? overOpenTray(pt) : nearZipper(pt));`.

`trayPeel.ts`: drop `COL`, `GMAX`, `STACK_Y`, `TOP`, `colLeft` and the `stackInset` import, and destructure `zipX, beside, openStackAt`. Then:

- `overBoard` is `(pt: Point) => pt.x < zipX() - 31 && pt.y > 8`.
- `slotHome`'s body becomes `const q = placeOf(s); const at = openStackAt(); const k = ui.stackScale; return { x: at.x + q.x * k, y: at.y + q.y * k, w: q.w * k, h: q.h * k, r: q.r };`.
- `showOnBoard`'s test is `r.x + r.w * 0.2 > (beside() ? zipX() : zipX() - (ui.geo?.G ?? 0)) - 15`.

`trayPresses.ts`: drop `TOP` and `Wb`, and destructure `colTop, zipX`. Then:

- `releasePull`: `const x = clamp(p.x, 8, zipX() - 25 - SHEET.w); const y = clamp(p.y, colTop() - 6, Hb() - SHEET.h - 10);`.
- `settlePulled`: the home test is `p.x + SHEET.w * 0.5 > zipX() - 45`, then `p.x = clamp(p.x, 8 - SHEET.w * 0.4, zipX() + 15 - SHEET.w * 0.6); p.y = clamp(p.y, colTop() - 20, Hb() - SHEET.h * 0.5);`.
- `sendHome`: `const home = { x: colLeft() + ui.stackAt.x, y: colTop() + ui.stackAt.y };`.

`traySpread.ts`: drop `COL`, `GMAX`, `STACK_Y` and the `stackInset` import, and destructure `colTop, openStackAt`. `stackOnBoard`'s y is `colTop() + ui.stackAt.y`. Delete `stackOnBoardOpen`, and in `closeSpread` use `const home = openStackAt();`.

- [ ] **Step 7: CSS.** In `sticker-tray.css`:
- In `.tray`, delete `--tray-top: 64px;` and `--tray-col: 205px;`.
- `.tray__cover` takes `left: var(--tray-cover-x); top: var(--tray-col-y); height: var(--tray-col-h);` for `right: 0; top: var(--tray-top); bottom: 0;`.
- `.tray__col` takes `left: var(--tray-col-x); top: var(--tray-col-y); width: var(--tray-col-w); height: var(--tray-col-h);` for its `right`, `top`, `bottom` and `width`.

Add the rules below. The first is _start_, to settle from the screenshots in Task 9. The others keep the stack's words at their own size when it grows; the dates and +N already are.

```css
/* Beside the panel the canvas edge is the panel's own right edge: the parting tape hangs past it. */
.tray[data-side="beside"] .tray__cover {
  box-shadow:
    var(--tray-edge-shadow),
    0.5px 0 0 rgba(120, 20, 70, 0.3);
}

/* A stack grown beside the panel scales its paper and stickers, never its words: scaled back here. */
.tray__stack .tray__new {
  transform-origin: 100% 0;
  scale: calc(1 / max(1, var(--stack-scale, 1)));
}

.tray__stack .tray__mark {
  scale: calc(1 / max(1, var(--stack-scale, 1)));
}

.tray__stack .tray__empty {
  font-size: calc(var(--fs-fine) / max(1, var(--stack-scale, 1)));
}
```

- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 9:** Commit: `feat: the sticker tray opens beside the panel where the board has room`

### Task 7: The spread deals more columns beside the panel

**Files:** Modify `apps/frontend/src/sticker-board/tray/traySpread.ts`. Create `traySpread.test.ts`.

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, expect, it } from "vitest";
import { REFERENCE_BOARD } from "../boardPanel";
import { SHEET } from "./trayModel";
import { PHONE_MAX_COLUMNS, spreadCells } from "./traySpread";

type Cells = ReturnType<typeof spreadCells>;
const columns = (cells: Cells) => new Set(cells.map((c) => Math.round(c.x))).size;
const inside = (cells: Cells, W: number, H: number) =>
  cells.every((c) => c.x >= 0 && c.y >= 0 && c.x + SHEET.w * c.k <= W && c.y + SHEET.h * c.k <= H);

describe("the spread", () => {
  it("deals a phone's sheets in no more than a phone's columns, inside the board", () => {
    const { width, height } = REFERENCE_BOARD;
    for (const n of [1, 3, 7, 30]) {
      const cells = spreadCells(n, width, height);
      expect(columns(cells)).toBeLessThanOrEqual(PHONE_MAX_COLUMNS);
      expect(inside(cells, width, height)).toBe(true);
    }
  });

  it("deals more columns beside the panel, drawing many sheets bigger, inside the board", () => {
    const wide = spreadCells(60, 1376, 964, { wide: true });
    expect(columns(wide)).toBeGreaterThan(PHONE_MAX_COLUMNS);
    expect(wide[0]?.k).toBeGreaterThan(spreadCells(60, 1376, 964)[0]?.k ?? Infinity);
    expect(inside(wide, 1376, 964)).toBe(true);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray/traySpread.test.ts` → fails: `spreadCells` isn't exported.
- [ ] **Step 3: Implement.** Replace `spreadCells` with:

```ts
/** The most columns a phone's board deals the spread into. */
export const PHONE_MAX_COLUMNS = 4;

/** Columns a phone's board deals `n` sheets into. */
const phoneColumns = (n: number) => (n <= 1 ? 1 : n <= 2 ? 2 : n <= 6 ? 3 : PHONE_MAX_COLUMNS);

/** How big each sheet is drawn, for `n` sheets in `cols` columns on a board this big. */
function cellScale(n: number, cols: number, W: number, H: number) {
  const rows = Math.ceil(n / cols);
  return Math.min(
    n <= 2 ? 0.95 : 0.8,
    (W - 18 * 2 - 14 * (cols - 1)) / cols / SHEET.w,
    (H - TOP - 30 - (rows - 1) * 18) / (rows * SHEET.h),
  );
}

/**
 * Where the spread lays out `n` sheets on a board this big. A phone's board deals at most four columns;
 * beside the panel (`wide`), as many as draw the sheets biggest.
 */
export function spreadCells(n: number, W: number, H: number, { wide = false } = {}) {
  let cols = phoneColumns(n);
  if (wide)
    for (let more = cols + 1; more <= n; more++)
      if (cellScale(n, more, W, H) > cellScale(n, cols, W, H)) cols = more;
  const rows = Math.ceil(n / cols);
  const k = cellScale(n, cols, W, H);
  const [cw, ch] = [SHEET.w * k, SHEET.h * k];
  const left0 = (W - (cols * cw + (cols - 1) * 14)) / 2;
  const top0 = Math.max(TOP - 6, (H - (rows * ch + (rows - 1) * 18)) / 2);
  return Array.from({ length: n }, (_, d) => ({
    x: left0 + (d % cols) * (cw + 14),
    y: top0 + Math.floor(d / cols) * (ch + 18),
    k,
    rot: SPREAD_TURNS[d % SPREAD_TURNS.length],
  }));
}
```

In `openSpread`, destructure `beside` from `tray`, and call `spreadCells(list.length, Wb(), Hb(), { wide: beside() })`.

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/tray` → pass.
- [ ] **Step 5:** Commit: `feat: the spread deals more columns beside the panel`

### Task 8: The cork back keeps its own sizes

UI edits. Before any of them, read `~/.claude/skills/impeccable/reference/craft-floor.md`, and judge them through `/impeccable adapt`.

**Files:** Modify `boardPanel.ts` and its test, `stat-board/BoardFlip.tsx`, `BoardFlip.test.tsx`, `board-flip.css` and `stat-board.css`, `StickerBoard.tsx` and `.css`, and `ArtistBoard.tsx`.

- [ ] **Step 1: Write the failing tests.** In `boardPanel.test.ts`, import `CORK_MIN_WIDTH` and `turnBoxFor`, and add:

```ts
it("turns the panel over in a box no narrower than the cork back needs where the board allows, inside the board", () => {
  for (const { W, H } of Object.values(BOARDS)) {
    const { panel } = ownBoardLayout(W, H);
    const box = turnBoxFor(panel, W);
    expect(box.width).toBeGreaterThanOrEqual(Math.min(W, Math.max(CORK_MIN_WIDTH, panel.width)));
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(W + 1e-9);
    expect([box.top, box.height]).toEqual([panel.top, panel.height]);
  }
  // Widened where the board has room both sides, it stays centered on the panel.
  const se = panelFor(375, 523);
  const box = turnBoxFor(se, 375);
  expect(box.left + box.width / 2).toBeCloseTo(se.left + se.width / 2);
});
```

In `BoardFlip.test.tsx`, `render` takes the box, and gets two tests:

```tsx
const BOX = { left: 0, top: 0, width: 390, height: 700 };
const render = (turned: boolean, turnBox: typeof BOX | null = BOX) =>
  act(() =>
    root.render(
      <BoardFlip
        turned={turned}
        turnBox={turnBox}
        onTurnedChange={onTurnedChange}
        front={<button>front</button>}
        back={<button onClick={onBackPressed}>back</button>}
      />,
    ),
  );
const turnEl = () => host.querySelector<HTMLElement>(".board-turn");
```

```tsx
it("turns with a depth that follows the width of what turns", () => {
  const depthAt = (width: number) => {
    render(false, { ...BOX, width });
    return Number.parseFloat(turnEl()?.style.getPropertyValue("--turn-perspective") ?? "");
  };
  expect(depthAt(780)).toBeCloseTo(2 * depthAt(390), 0);
});

it("shows only what turns of the front while it turns, and the whole front at rest", () => {
  render(false);
  expect(turnEl()?.classList.contains("is-turning")).toBe(false);
  render(true);
  expect(turnEl()?.classList.contains("is-turning")).toBe(true);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/boardPanel.test.ts src/sticker-board/stat-board/BoardFlip.test.tsx` → fails: no `turnBoxFor`, and no `turnBox` prop.
- [ ] **Step 3: `boardPanel.ts`.** Add `import { clamp } from "../ui/easing";` and:

```ts
/** The cork back is never narrower than the narrowest phone's board, so its papers keep their layout. */
export const CORK_MIN_WIDTH = 360;

/** The box the board turns over in, in board px: the panel, widened to the cork's narrowest, inside the board. */
export function turnBoxFor(panel: Panel, boardW: number) {
  const width = Math.min(boardW, Math.max(panel.width, CORK_MIN_WIDTH));
  const left = clamp(panel.left + (panel.width - width) / 2, 0, boardW - width);
  return { left, top: panel.top, width, height: panel.height };
}
```

- [ ] **Step 4: `BoardFlip.tsx`.** Add `type CSSProperties` to the react import, and `import { REFERENCE_BOARD } from "../boardPanel";`. `Props` gains `/** The box it turns over in, in board px: the panel, as wide as the cork back needs; the whole board until it's measured. */ turnBox?: { left: number; top: number; width: number; height: number } | null;`. After `TURN_MS`, add:

```ts
/** The turn's depth per px of what turns: a 390px board turns as it always has, and a wider one no steeper. */
const TURN_DEPTH = 1500 / REFERENCE_BOARD.width;

const turnVars = (box: NonNullable<Props["turnBox"]>): CSSProperties => ({
  "--turn-x": `${box.left}px`,
  "--turn-y": `${box.top}px`,
  "--turn-w": `${box.width}px`,
  "--turn-h": `${box.height}px`,
  "--turn-perspective": `${(box.width * TURN_DEPTH).toFixed(0)}px`,
});
```

In the component:

- Take `turnBox`, and add `const [turning, setTurning] = useState(false);`.
- `land` adds `setTurning(false);` after `running.current = [];`, and `setTurning(true);` follows `const turn = board.animate(TURN, timing);`.
- The root's classes gain `turning && "is-turning"`, and the root takes `style={turnBox ? turnVars(turnBox) : undefined}`.

- [ ] **Step 5: CSS.**

`tokens.css` already has `--liner-grain`, holding the same data URI as `.board`'s `background-image` (the sign-in gates and the Shop read it). `StickerBoard.css`'s `.board` takes `background-image: var(--liner-grain);` in place of its own copy.

In `board-flip.css`, replace `.board-turn` and `.board-flip`:

```css
/* Over the drawing screen, which stays mounted underneath. The turn's depth follows the width of what
   turns, and round it the board's own ground holds still. */
.board-turn {
  position: absolute;
  inset: 0;
  z-index: 25;
  overflow: hidden;
  perspective: var(--turn-perspective, 1500px);
  perspective-origin: calc(var(--turn-x, 0px) + var(--turn-w, 100%) / 2)
    calc(var(--turn-y, 0px) + var(--turn-h, 100%) * 0.42);
  background-color: var(--liner);
  background-image: var(--liner-grain);
}

.board-turn::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--liner-print);
  opacity: 0.55;
  pointer-events: none;
}

/* The Ink table it turns over, under what turns. */
.board-turn::after {
  content: "";
  position: absolute;
  z-index: 0;
  left: var(--turn-x, 0px);
  top: var(--turn-y, 0px);
  width: var(--turn-w, 100%);
  height: var(--turn-h, 100%);
  background: var(--ink);
  pointer-events: none;
}

.board-flip {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-style: preserve-3d;
  transform-origin: calc(var(--turn-x, 0px) + var(--turn-w, 100%) / 2)
    calc(var(--turn-y, 0px) + var(--turn-h, 100%) / 2);
}

/* While it turns, the front shows only what turns: the board round it holds still. */
.board-turn.is-turning .board-front {
  clip-path: inset(
    var(--turn-y, 0px) calc(100% - var(--turn-x, 0px) - var(--turn-w, 100%))
      calc(100% - var(--turn-y, 0px) - var(--turn-h, 100%)) var(--turn-x, 0px)
  );
}
```

`.board-rear` adds `inset: auto; left: var(--turn-x, 0px); top: var(--turn-y, 0px); width: var(--turn-w, 100%); height: var(--turn-h, 100%);`. Its comment becomes `/* The back is cork the size of what turns, before its papers arrive, never the dark behind the board. */`.

In `stat-board.css`, `.stat-board__cork` gains the lines below, with `--cork-papers-max` beside `--cork-inset`. A phone up to 430px wide keeps today's insets. A wider turn box centers the papers on cork, and the cork still scrolls, so Settings' Drawing group (decision 19) only lengthens the Settings card.

```css
/* The papers keep a phone's sizes: no wider than a 430px phone's cork less its insets, centered on cork. */
--cork-papers-max: 402px;
padding-inline: max(var(--cork-inset), calc((100% - var(--cork-papers-max)) / 2));
```

- [ ] **Step 6: The boards.** `StickerBoard.tsx` imports `turnBoxFor`, and passes `turnBox={layout && turnBoxFor(layout.panel, layout.W)}` to `BoardFlip`. In `turn`, after `setTurned(over);`, add:

```ts
// Beside the panel the open tray isn't part of what turns, so it shuts as the board turns over.
if (over && layout?.trayBeside) void tray.current?.close();
```

`ArtistBoard.tsx` imports `turnBoxFor`, and passes `turnBox={frame && turnBoxFor(frame.panel, frame.W)}`.

- [ ] **Step 7:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board` and `pnpm -C apps/frontend typecheck` → pass.
- [ ] **Step 8:** Commit: `feat: the cork back turns in the panel's box, its papers at their phone sizes`

### Task 9: Check it in WebKit and Chromium

Read `~/.claude/skills/impeccable/reference/craft-floor.md` first, and judge the screenshots through `/impeccable adapt`. Scratch (scripts, screenshots, the database) goes in `~/.cache/drawing-app-ipad-board/` and `data/ipad-board*`, never committed.

- [ ] **Step 1: A dev server of your own**, on ports 5194/8794: other sessions hold 5173/8788, the research server 5190/8790, and the other iPad plans 5191–5193 and 5195–5196.
  - The data: if `<main checkout>/.claude/worktrees/ipad-research/data/ipad-research.db` still exists, copy it with `mkdir -p data && sqlite3 <that path> ".backup data/ipad-board.db"` and `/bin/cp -Rf <its folder>/ipad-research-images data/ipad-board-images`. Its people are in `~/.cache/drawing-app-ipad/seed.txt`: ipad-alice holds No.0002–0004, and No.0005 from ipad-bob, which wears foil.
  - The API: `(cd apps/api && PORT=8794 DATABASE_URL=data/ipad-board.db IMAGE_DIR=../../data/ipad-board-images IMAGE_BASE_URL=http://localhost:5194/api/images pnpm dev)`. On a fresh `DATABASE_URL` it applies its migrations as it starts.
  - Vite: an untracked `apps/frontend/vite.board.config.ts` merges `vite.config.ts` with `server: { port: 5194, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:8794" } } }`. Run it as `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm -C apps/frontend exec vite --config vite.board.config.ts`.
- [ ] **Step 2: People, if the research data is gone,** seeded through the app under LIFF Mock and the mock chain. Below, "alice" and "bob" mean these two or the research's two.
  - Sign in at `http://localhost:5194/?as=board-alice` and `?as=board-bob`, in two windows that don't share cookies. Each seals three stickers, a day's daily tickets: Draw, a stroke, then tap the check twice, about 700ms apart.
  - board-bob gives board-alice one: Explore, search "board-alice", her board, Give, pick it, Send in a LINE chat; LIFF Mock's picker answers success. She receives it from her board: the gifts badge, focus the pull tab and press End, then Accept. Her board now has a foil sticker.
- [ ] **Step 3: Scripts.** Copy `lib.js` and `api.js` from `~/.cache/drawing-app-ipad/scripts/board/`, with `BASE` at `http://localhost:5194` and `OUT` in the scratch folder.
  - `lib.js` signs in from Node and adds the cookie back without `Secure`, which WebKit drops on localhost.
  - WebKit board screenshots use `reducedMotion: "reduce"`: its screenshots draw no 3D.
  - Set one composition: `node api.js <alice> <No.>=0.25,0.15,0.36,-4 <No.>=0.75,0.45,0.34,3 <No.>=0.3,0.8,0.32,-3 <No.>=0.72,0.85,0.3,5`, one for each of her four stickers.
- [ ] **Step 4: Check at 390×844, 375×591, 540×564, 540×620, 580×640, 744×1133, 1133×690, 820×1180, 1180×820 and 1376×1032**, in WebKit and Chromium, as alice, and as bob visiting her board. The panel is `.board`'s `--panel-x`/`--panel-w`/`--panel-k`, and the band is `--band-x`/`--band-w`.
  - Each sticker's center, as a share of the panel, is the same at every size and for both people, within 0.5%.
  - Every `.placed-sticker` box lies inside the board, and none touches Draw.
  - The panel's top is the board's top.
  - The name, gifts badges and Explore chip sit in the header band, and Draw at the band's left on the board's foot. All keep their own size: the name 48px tall, Draw 54px.
  - A sticker's `.sticker-figure__img` cast is `--panel-k` times today's, from `getComputedStyle(…).filter`. The header's photo sticker and the artist chips keep today's.
  - No text on the board renders under 11px.
  - Selecting a sticker puts its toolbar on the board, clear of Draw, and Arrange opens. With fresh storage, the first-selection hint shows at the roomy sizes.
  - At 540×620 and 580×640, the toolbar reaches over the tray's strip, drawn above it, with nothing cut off.
- [ ] **Step 5: The tray.** Tap the pull (`.zip__tab--front`, with `page.touchscreen.tap`).
  - At 390×844 the open sheet is over the board, as today. Elsewhere it starts right of the panel's right edge, and covers no sticker.
  - Where the stack grows (1180×820, 1376×1032), its NEW badges and dates are their phone size.
  - Peel a sticker from the sheet onto the panel with the mouse: it lands on the panel.
  - Drag a board sticker to the Zipper: the tray opens to its sheet, and it goes into its silhouette.
  - Pull the sheet out: it floats over the board, left of the Zipper.
  - Screenshot each size, open.
- [ ] **Step 6: The cork back.** Tap the name.
  - WebKit, reduced motion: the cork's box is the turn box (451px wide at 1180×820, 360 at 540×620), with liner round it. The papers' column is at most 402px, centered on cork.
  - Chromium, motion on, screenshot ~320ms in: only the turn box turns, and the ground round it holds still.
  - Screenshot each size at rest on the back.
- [ ] **Step 7: Turning mid-drag**, at 820×1180, both engines. Press a sticker 20px right of its center and move 40px. Then `setViewportSize({ width: 1180, height: 820 })` and wait two frames: the sticker's center is under the mouse less 20 × (new scale ÷ old scale), within 2px. Move again and let go. `node api.js <alice>` shows the saved spot where it was let go.
- [ ] **Step 8: On the panel too.**
  - A fresh person (`?as=board-fresh`): Draw's pulse ring is round Draw at every size.
  - A new browser context on alice's board: the foil sticker's artist chip greets at its sticker's top-left, inside the panel.
  - bob gives alice a second sticker: her gifts badge sits at the band's right, clear of the Zipper's pull, at 820×1180 and 540×620.
- [ ] **Step 9:** Fix what the checks find in one batch, and run them once more. Tune the _start_ values from the screenshots, and report each as a value. Stop both servers.
- [ ] **Step 10:** Commit any fixes: `fix: the board on the panel, from the browser checks`

### Task 10: DESIGN.md's board

The spec's docs rule: this plan updates the DESIGN.md and PRODUCT.md sentences its own work makes false, in its own merge, and ad0ll's sign-off on the spec covers them. PRODUCT.md has none: it describes no board geometry. The finish adds only the size-class overview.

- [ ] **Step 1:** In Layout's board paragraph, replace from "The board's header is your avatar…" through "…in the thumb's reach." with:

  "Every device draws the board as one panel: the target phone's 390 × 651 board inside LINE, scaled uniformly to fit, top-aligned and centered across, so a board arranged anywhere reads the same everywhere. Only the stickers scale, with their white edge, foil and shadows; every control and word keeps its own size. A header band runs along the top of the panel and the tray beside it, or the whole board where that's too narrow, with your avatar and name at its left. The compact Draw key floats at the band's left on the board's foot. On a phone the sticker tray runs down the board's right edge from under the header (y 64) to the foot, and opens across half the screen. Where the board has room beside the panel, the panel moves over, giving up a little of its scale if it must. The Zipper runs down its right edge, and the tray opens beside it like the facing page. Someone else's board is the same panel with the tray gone. Give takes Draw's slot, and a small Explore back chip sits beside the name. The cork back turns in a box at least 360px wide, the panel or wider, and its papers keep their phone sizes, centered on cork. It's a two-column grid (206px and the rest, 16 × 12px gaps), with Flip back at the foot of the right column in the thumb's reach."

- [ ] **Step 2:**
  - Board header: "at the board's top left" becomes "at the header band's left".
  - The cork back, at the end of **The turn:**: "Only its box turns, over the Ink table under it, and the board round it holds still. The turn's depth follows the box's width, so a wide board turns no more steeply than a phone's."
  - Stickers, **Foil:** "about 5px on the board" becomes "about 5px on a phone's board", and "5px on the board, 6px on the detail" becomes "5px on a phone's board, scaled with the panel, 6px on the detail".
- [ ] **Step 3:** Sticker tray and Selection handles:
  - The tray's lead becomes "…zipped down the board's right edge, or down the panel's where the tray opens beside it."
  - In **Opening:**, "…settles at half the screen." becomes "…settles at half a phone's screen. Beside the panel the right row parts instead, and the mouth opens into the room beside it."
  - **The sheets:** gains, after the short-phone sentence, "Beside a tall panel it grows, up to 1.5×, its words at their own size."
  - **The spread:** gains "Beside the panel it deals as many columns as draw them biggest."
  - Selection handles gains, after the toolbar's placement: "On LINE's sheet it may reach over the tray's strip."
- [ ] **Step 4:** Commit: `docs: DESIGN.md's board is one panel on every device`

### Task 11: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, the format check and the Move tests all pass.
- [ ] **Step 2:** Squash the branch into `feat: one sticker board panel on every device, the tray beside it and the cork back in its box` and the DESIGN.md commit, with no AI attribution lines.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push.
- [ ] **Step 4:** Once it's merged, delete the worktree, the branch, `~/.cache/drawing-app-ipad-board/` and `data/ipad-board*`. Keep this plan, its boxes ticked on main (the LINE sheet plan checks for open ones), and the spec: the finish deletes them.
- [ ] **Step 5:** Hand ad0ll only what needs an iPad: the 651 board on a phone in LINE, LINE's sheet's real board height, and how the tray beside the panel and the turn feel.
