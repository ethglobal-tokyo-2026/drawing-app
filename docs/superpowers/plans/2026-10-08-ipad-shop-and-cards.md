# iPad Shop and Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On an iPad the Shop is one centered column upright and one spread held sideways (a reserve tickets banner over the three shelves, nothing to scroll); the reserve ticket checkout, the ticket cards and the Sealed card rise to the middle at 400px; the gratitude events card centers. Phones unchanged.

**Architecture:** CSS under foundations' large-screen query, ported from the draft on `spike/ipad-board`, plus two wrapper elements in the reserve tickets section and one around the shelves. One behavior change, test first: the seal ceremony measures the Sealed card's slot again when the ceremony itself resizes, so a turn keeps the sticker on a centered card. The layout is checked by a scratch Playwright script with pass lines, in WebKit and Chromium.

**Tech Stack:** React 19, TypeScript, CSS, vitest + happy-dom, Playwright (WebKit, Chromium).

Source of truth: `docs/superpowers/specs/2026-10-08-ipad-design-brief.md`, "Shop and cards". The draft: branch `spike/ipad-board`, never merged; read a commit with `git show <sha>`.

---

## Open (ad0ll's sign-off)

1. **A turn keeps the sticker on the Sealed card** (Task 4). Beyond the brief: a card centered by layout moves on a turn without resizing, and the ceremony measured its slot again only when the card resized. Tried in Chromium on main plus this plan: without Task 4 the sticker stayed where the card had been at every size but the one it sealed at, phones included. Drop Task 4 if declined.
2. **Phase 0's one "Coming soon"** becomes the first row of the shelves' grid held sideways, over all three shelves.
3. **As drafted:** the spread from 800px wide held sideways; the upright column as wide as a shelf's four 104px swatches with their gaps and sides; the spread's 96px swatches two by two; the checkout, ticket cards and Sealed card 400px wide; the gratitude events card 480px wide, its tear strip only for keyboards and screen readers.
4. **Short landscape** (Task 8 Step 3): tried in Chromium with the purchases label and a one-line "Coming soon" (the draft had neither), the spread scrolled 36px at 1133×658, so screens under 700px tall draw it closer; the key and the swatches keep their sizes. Task 10 Step 5 has the next cut if Phase 0's heading is taller.

## Left for later

From `2026-10-07-ipad-explore-and-dialogs.md`, which this plan's commit deletes. Its full code: `git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-explore-and-dialogs.md`.

- **The seal ceremony's sheet through a turn** (its Task 11, `measureSheet`): while the seal is on its way, a turn moves the sheet but not the cut sticker, its dim or its cut line. The drawing plan (`2026-10-08-ipad-drawing.md`) owns the sheet's box, so it belongs there. Task 4 here covers the card.
- **The Gratitude replay** (its Tasks 8 and 10): the replay's scale is its card's width over a phone's, so a wide, short Transfer Trail card on an iPad magnifies its lettering across the heart. Its fix: scale by the replay heart's width over a phone's live heart (`replayScale`), place each input relative to the heart, drawn in alike to stay on the stage, and lay out again on resize. No plan in the brief covers the sticker detail.
- **The Mini-game's scale** (its Tasks 8–9): the live game grows with an iPad's stage up to 1.5×, its touch rules with it; the speed lines cover any stage; the top band, HUD and receipt keep a phone's width. Not in the brief.
- **Device tilt in the screen's axes** (its Tasks 1–2, `toScreenAxes`): held sideways, the shared light, the heart's sway and the zipper's swing read the device's axes, not the screen's. Fits the board-and-stat-board plan (the zipper) or foundations.
- **The sticker detail's column, Giving's and Receiving's phone page, the gift received notice, the give sheet's picker** (its Tasks 7, 12–13): not in the brief; each needs a design call.

## Base

- Branch from `origin/main` once Phase 0 (`2026-10-08-small-fixes.md`) and foundations (`2026-10-08-ipad-foundations.md`) have merged. The board-and-stat-board, Explore and drawing plans can run beside this one.
- From foundations: `apps/frontend/src/ui/largeScreen.ts` exports `LARGE_SCREEN`, `"(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)"`, and `useLargeScreen()`; the CSS uses the same query; `--gutter-large` is in `styles/tokens.css`.
- From Phase 0: the Shop's copy (no price line, no line under a shelf's name, the count over Buy, one "Coming soon" over the shelves), and your gratitude events (`sticker-board/stat-board/GratitudeEvents.tsx`, `gratitude-events.css`) as a bottom sheet.
- Overlaps: the drawing plan may edit `SealCeremony.tsx` for the sheet; Task 4 touches only `cardReady` and the lines after `show`. The brief's plan table gives the gratitude events card to this plan, not the board's. The Explore plan adds the same `stubResizeObservers` to `ui/testing.ts`: whichever lands second keeps one copy.
- Ports: this plan's dev server takes 5183 and its API 8783; if either is taken, use a free pair throughout.

## Ports from the draft

| Draft commit                  | What it is                                                                | Task | How                                       |
| ----------------------------- | ------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| `943b5d9a`                    | ticket cards rise to the middle; the Shop's wrappers                      | 2, 6 | `tickets.css` by `git apply`; TSX by hand |
| `7ca72b31`                    | the query needs a touch screen; the upright column; the swatch variables  | 2, 7 | `tickets.css` by `git apply`; CSS by hand |
| `27dc855c`                    | the Sealed card rises to the middle                                       | 3    | `git apply`                               |
| `8ba750b3`, `911d56e4`        | the gratitude events card's large-screen block, no tear strip             | 5    | by hand                                   |
| `500e5fad`, `696123ba` (Shop) | the spread: banner, upright perforation, three shelves; air after the fan | 6, 8 | by hand: Phase 0 rewrote the hero         |
| `c9d290b0`                    | the Shop's copy                                                           | —    | Phase 0                                   |

## Files

- Modify: `apps/frontend/src/ui/testing.ts` (Task 1)
- Modify: `apps/frontend/src/tickets/tickets.css` (Task 2)
- Modify: `apps/frontend/src/sticker-creation/sealing/SealedCard.css` (Task 3)
- Modify: `apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.test.tsx`, `slotTracker.ts` (Task 4)
- Modify: `apps/frontend/src/sticker-board/stat-board/gratitude-events.css` (Task 5)
- Modify: `apps/frontend/src/shop/ReserveTicketsHero.tsx`, `ShopScreen.tsx` (Task 6), `ShopScreen.css` (Tasks 7–8)
- Modify: `DESIGN.md` (Task 9)
- Scratch, never committed: `data/scratch/ipad-shop/` (gitignored), untracked `apps/frontend/vite.ipad-shop.config.ts` (Task 10)

Test commands run from the worktree root. `TZ=Asia/Tokyo` because some frontend tests assume Tokyo time.

### Task 1: Base check, worktree, test helper

**Files:** Modify `apps/frontend/src/ui/testing.ts`

- [ ] **Step 1: Worktree.** From the main checkout:

```bash
git fetch origin
git worktree add -b feat/ipad-shop-and-cards .claude/worktrees/ipad-shop-and-cards origin/main
```

Then `pnpm install --frozen-lockfile --prefer-offline` in it. A lane in an isolated agent worktree runs `git switch -c feat/ipad-shop-and-cards origin/main`, `git checkout -- .` and the install in its own.

- [ ] **Step 2: Check the base.**

```bash
rg -n 'export const (LARGE_SCREEN|useLargeScreen)' apps/frontend/src/ui/largeScreen.ts
rg -n -- '--gutter-large' apps/frontend/src/styles/tokens.css
rg -n 'reserve-hero__price|shelf__lead|lead=' apps/frontend/src/shop
rg -n 'comingSoon' apps/frontend/src/shop
rg -n 'any-pointer' apps/frontend/src/sticker-board/stat-board/gratitude-events.css
git cat-file -t 943b5d9a
```

Expected: both exports, `LARGE_SCREEN` the query above; `--gutter-large` defined; no hits for the old copy; `comingSoon` rendered once, over the shelves; no `any-pointer` in `gratitude-events.css`; `commit`.

- No Phase 0 or no foundations on main: stop and report.
- Foundations keys the large layout some other way (another query, or a class or data attribute on `.phone`): write every large-screen rule in this plan in its form.
- No `--gutter-large`: Task 8 Step 1 adds it.
- `gratitude-events.css` already has a large-screen block: Task 5 compares it with the block there.
- `943b5d9a` missing (`spike/ipad-board` deleted): stop and report.

- [ ] **Step 3: The test helper.** Unless `ui/testing.ts` already exports `stubResizeObservers` (the Explore plan adds the same one), add `import { onTestFinished } from "vitest";` to its imports and append:

```ts
/**
 * ResizeObservers a test reports to, since happy-dom's never call back: `resize(el)` tells each
 * observer watching `el`, and `resize()` every observer watching anything. Gone when the test ends.
 */
export function stubResizeObservers() {
  const watching = new Map<
    ResizeObserver,
    { targets: Set<Element>; callback: ResizeObserverCallback }
  >();
  class TestResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      watching.set(this, { targets: new Set(), callback });
    }
    observe(target: Element) {
      watching.get(this)?.targets.add(target);
    }
    unobserve(target: Element) {
      watching.get(this)?.targets.delete(target);
    }
    disconnect() {
      watching.get(this)?.targets.clear();
    }
  }
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = TestResizeObserver;
  onTestFinished(() => {
    globalThis.ResizeObserver = original;
  });
  return {
    resize(el?: Element | null) {
      for (const [observer, { targets, callback }] of watching) {
        if (el ? targets.has(el) : targets.size > 0) callback([], observer);
      }
    },
  };
}
```

- [ ] **Step 4:** `pnpm -C apps/frontend typecheck` → passes.
- [ ] **Step 5:** Commit: `test(frontend): ResizeObservers a test reports to`

### Task 2: The checkout and the ticket cards rise to the middle at 400px

**Files:** Modify `apps/frontend/src/tickets/tickets.css`

The checkout, the out-of-tickets card and the start card all rise in `TicketCard` (`.out-of-tickets`), so one rule moves them all.

- [ ] **Step 1: Port.**

```bash
git show 943b5d9a -- apps/frontend/src/tickets/tickets.css | git apply --3way
git show 7ca72b31 -- apps/frontend/src/tickets/tickets.css | git apply --3way
```

Conflicts: none expected; both apply cleanly to main at `ed18a266`, and Phase 0 leaves `tickets.css` alone. The file gains, before its `@media (prefers-reduced-motion: reduce)` block:

```css
/* On a large screen a ticket card rises to the middle at about a phone's width, rather than running
   across the screen's foot. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .out-of-tickets {
    justify-content: center;
    align-items: center;
  }

  .out-of-tickets__card {
    max-width: 400px;
  }
}
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/tickets` → PASS, unchanged: CSS only. The layout's test is Task 10's "ticket cards" and "checkout" lines.
- [ ] **Step 3:** Commit: `feat(frontend): on an iPad the checkout and the ticket cards rise to the middle at 400px`

### Task 3: The Sealed card rises to the middle at 400px

**Files:** Modify `apps/frontend/src/sticker-creation/sealing/SealedCard.css`

- [ ] **Step 1: Port.** `git show 27dc855c -- apps/frontend/src/sticker-creation/sealing/SealedCard.css | git apply --3way`. Conflicts: none expected (clean on `ed18a266`; Phase 0's Sealed card change is its fine print). The file ends:

```css
/* On a large screen the card rises to the middle at about a phone's width, as the ticket cards do.
   Centered by layout alone: the ceremony aims the sticker's flight at the card's offsets. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .sealed-card {
    inset: 0;
    width: min(400px, calc(100% - 28px));
    height: fit-content;
    margin: auto;
  }
}
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/sealing` → PASS. The layout's test is Task 10's "Sealed card" lines.
- [ ] **Step 3:** Commit: `fix(frontend): on an iPad the Sealed card rises to the middle at 400px, as the ticket cards do`

### Task 4: A turn keeps the sticker on the Sealed card (Decision 1)

**Files:** Modify `apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx`, `SealCeremony.test.tsx`, `slotTracker.ts`

New, not from the draft. The ceremony's slot tracker watches only the card's size; a centered card keeps its size through a turn, and once the ceremony has ended no frame redraws the sticker.

- [ ] **Step 1: Write the failing test.** In `SealCeremony.test.tsx`, the `../../ui/testing` import becomes `import { ReducedMotion, stubResizeObservers } from "../../ui/testing";`, and at the file's end:

```tsx
/** Where the sticker's transform puts it: its translate, px. */
function stickerPlace() {
  const transform =
    host.querySelector<HTMLElement>(".seal-ceremony__sticker")?.style.transform ?? "";
  const [, x, y] = /translate\((-?[\d.e+-]+)px, (-?[\d.e+-]+)px\)/.exec(transform) ?? [];
  return { x: Number(x), y: Number(y) };
}

describe("SealCeremony as the screen turns", () => {
  it("keeps the sticker on the sealed card's slot when a turn moves the card", async () => {
    const resizes = stubResizeObservers();
    await seal(1);
    playThrough();
    const sealedCard = card();
    if (!(sealedCard instanceof HTMLElement)) throw new Error("no sealed card");
    const before = stickerPlace();
    // A turn re-lays the ceremony and moves the card, centered in it, without resizing the card.
    const moved = 240;
    Object.defineProperty(sealedCard, "offsetTop", { value: sealedCard.offsetTop + moved });
    act(() => resizes.resize(root()));
    expect(stickerPlace().y - before.y).toBeCloseTo(moved);
    expect(stickerPlace().x).toBeCloseTo(before.x);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/sealing/SealCeremony.test.tsx -t "turns"` → FAIL: `expected +0 to be close to 240`.
- [ ] **Step 3: Implement.** In `SealCeremony.tsx`'s layout effect, the comment and declarations before `cardReady` become:

```ts
// The card comes with the sealed sticker, so its slot is measured once the card is there, and
// again whenever the card or the ceremony changes size: the card grows upward from its foot, and
// a turn moves a card centered on a large screen without resizing it.
let slotAt: ReturnType<typeof trackSlot> | null = null;
let cardEl: HTMLElement | null = null;
// No frame draws once the ceremony has ended, so a resize draws its last one again.
let redraw = () => {};
```

`trackSlot`'s observe callback in `cardReady` becomes:

```ts
(onResize) => {
  const resizes = new ResizeObserver(() => {
    onResize();
    redraw();
  });
  resizes.observe(c);
  resizes.observe(host);
  return () => resizes.disconnect();
},
```

and after the `show` function, before `let raf = 0;`:

```ts
redraw = () => {
  if (ended) show();
};
```

In `slotTracker.ts`, the doc becomes: "Where the sealed card's slot is, measured once and again whenever the card or the ceremony around it changes size: a late ticket row grows the card upward from its foot, and a turn moves a card centered on a large screen."

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/sealing` → PASS, every test.
- [ ] **Step 5:** Commit: `fix(frontend): a turn keeps the sealed sticker on its card`

### Task 5: The gratitude events card centers

**Files:** Modify `apps/frontend/src/sticker-board/stat-board/gratitude-events.css`

- [ ] **Step 1: Port, by hand.** `git show 8ba750b3 -- apps/frontend/src/sticker-board/stat-board/gratitude-events.css` creates the whole file, which Phase 0 already holds, so read the block from the draft's last version, `git show 911d56e4:apps/frontend/src/sticker-board/stat-board/gratitude-events.css`, and insert it before the file's `@media (prefers-reduced-motion: reduce)` block:

```css
/* A large screen raises it to the middle as a card of its own width, as the ticket cards rise. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .gratitude-events-layer {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  /* The tear strip gave the sheet its top room; the card takes its side padding there instead. */
  .gratitude-events.bottom-sheet {
    position: relative;
    width: 100%;
    max-width: 480px;
    padding-top: 20px;
    border-radius: 16px;
  }

  /* A card has no tear strip: the perforation's button stays for keyboards and screen readers, unseen
     until it's focused, and the scrim and Escape close it too. */
  .gratitude-events.bottom-sheet > .perf:not(:focus-visible) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
```

Conflicts: if Phase 0 named the layer or the sheet differently, use its classes. If Step 2 of Task 1 found a block already there, make it match this one.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/stat-board` → PASS. The layout's test is Task 10's "gratitude events" lines.
- [ ] **Step 3:** Commit: `feat(frontend): on an iPad your gratitude events open as a centered card`

### Task 6: The Shop's boxes for the spread

**Files:** Modify `apps/frontend/src/shop/ReserveTicketsHero.tsx`, `apps/frontend/src/shop/ShopScreen.tsx`

Layout-neutral on a phone: plain blocks with no margins of their own.

- [ ] **Step 1: The reserve tickets section** (the draft's `500e5fad`, reordered by `c9d290b0`; read the result with `git show c9d290b0:apps/frontend/src/shop/ReserveTicketsHero.tsx`). Keep Phase 0's words and order, and wrap the title and its line in `.reserve-hero__text`, and the error line, the count, the key and the Sui credit in `.reserve-hero__buy`, so the section's return is:

```tsx
<section className="reserve-hero" aria-labelledby={`${id}-title`}>
  <TicketStubs className="reserve-hero__fan" size="large" stubs={FAN} stars="front" />
  {/* The words, then the key: one column on a phone, a banner's row across an iPad held sideways. */}
  <div className="reserve-hero__text">
    <h2 className="reserve-hero__title" id={`${id}-title`}>
      {t(($) => $.shop.reserve.title)}
    </h2>
    <p className="reserve-hero__lead keep-phrases">{t(($) => $.shop.reserve.lead)}</p>
  </div>
  <TearLine />
  <div className="reserve-hero__buy">
    {/* With no tickets loaded the Shop would read as if you hold none, so a failed load says so. */}
    {error && (
      <ErrorLine className="reserve-hero__problem" detail={errorDetail(error)} onRetry={refresh}>
        {t(($) => $.shop.reserve.heldProblem, { reason: errorMessage(error) })}
      </ErrorLine>
    )}
    {held > 0 && (
      <p className="reserve-hero__held">
        <span aria-hidden="true">
          <Trans
            i18nKey={($) => $.shop.reserve.held}
            components={{ count: <TicketCount kind="reserve" count={held} /> }}
          />
        </span>
        <span className="visually-hidden">
          {t(($) => $.shop.reserve.heldSpoken, { count: held })}
        </span>
      </p>
    )}
    <Key className="reserve-hero__key" tone="blue" icon={<BuyTicketsIcon />} onClick={onBuy}>
      {t(($) => $.shop.reserve.buy)}
    </Key>
    <SuiCredit />
  </div>
</section>
```

- [ ] **Step 2: The shelves** (the draft's `943b5d9a`, `git show 943b5d9a -- apps/frontend/src/shop/ShopScreen.tsx`, without the `lead` props Phase 0 removed). Wrap the three `ComingSoonShelf`s in `<div className="shop__shelves">`. The draft's `.shop__reserve` wrapper stays out: no rule has styled it since `500e5fad`. The return becomes:

```tsx
<div className="shop">
  <h1 className="shop__title">{t(($) => $.shop.title)}</h1>
  <ReserveTicketsHero onBuy={onBuyReserveTickets} />
  <ShopTicketPurchases />
  {/* One after the other on a phone; held sideways, side by side under the one "Coming soon". */}
  <div className="shop__shelves">
    <ComingSoonShelf
      title={t(($) => $.shop.shelves.laminates.title)}
      items={LAMINATES.map((laminate) => ({
        id: laminate,
        name: t(($) => $.shop.shelves.laminates.items[laminate]),
        preview: onSticker((s) => (
          <FinishPreview sticker={s} side={SWATCH} finish={{ laminate }} />
        )),
      }))}
    />
    <ComingSoonShelf
      title={t(($) => $.shop.shelves.brushes.title)}
      swatch="white"
      items={BRUSHES.map((kind) => ({
        id: kind,
        name: t(($) => $.shop.shelves.brushes.items[kind]),
        preview: <BrushStrokeSample kind={kind} side={SWATCH} />,
      }))}
    />
    <ComingSoonShelf
      title={t(($) => $.shop.shelves.backingFoils.title)}
      items={BACKING_FOILS.map((foil) => ({
        id: foil,
        name: t(($) => $.shop.shelves.backingFoils.items[foil]),
        preview: onSticker((s) => <FinishPreview sticker={s} side={SWATCH} finish={{ foil }} />),
      }))}
    />
  </div>
</div>
```

Then move Phase 0's one "Coming soon" element (`rg -n 'comingSoon' apps/frontend/src/shop`), its markup unchanged, into `.shop__shelves` as its first child: Task 8 lays it across the spread's three shelves. If Phase 0 gave the shelves other props, keep Phase 0's.

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/shop` and `pnpm -C apps/frontend typecheck` → PASS.
- [ ] **Step 4:** Commit: `refactor(frontend): the Shop's reserve tickets and shelves get the boxes an iPad lays out`

### Task 7: The Shop upright: one centered column, every swatch whole

**Files:** Modify `apps/frontend/src/shop/ShopScreen.css`

From `7ca72b31` (`git show 7ca72b31 -- apps/frontend/src/shop/ShopScreen.css`): its first three hunks by hand; its media query hunk edits `943b5d9a`'s block, which this plan doesn't take.

- [ ] **Step 1: The swatch's measures as variables.** `.shop` gains, after `background: var(--liner);`:

```css
/* A shelf's swatch and the gap between swatches, which a large screen's column is sized by. */
--shelf-swatch: 104px;
--shelf-gap: 10px;
```

`.shelf__row`'s `gap: 10px;` becomes `gap: var(--shelf-gap);`, and `.shelf-item__swatch`'s `width: 104px;` and `height: 104px;` become `width: var(--shelf-swatch);` and `height: var(--shelf-swatch);`.

- [ ] **Step 2: The column.** Before `/* ---------- Previews ---------- */`:

```css
/* ---------- Large screens ---------- */

/* Nothing stretches across an iPad. Upright the page is one centered column, the reserve tickets
   over the shelves, as wide as a shelf's four swatches with the row's sides, so none is cut off. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .shop {
    padding-inline: max(
      0px,
      calc((100% - 4 * var(--shelf-swatch) - 3 * var(--shelf-gap) - 36px) / 2)
    );
  }
}
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/shop` → PASS. The layout's test is Task 10's "Shop upright" lines.
- [ ] **Step 4:** Commit: `feat(frontend): the Shop on an iPad held upright is one centered column with every swatch whole`

### Task 8: The Shop held sideways: one spread

**Files:** Modify `apps/frontend/src/shop/ShopScreen.css`; `apps/frontend/src/styles/tokens.css` only if Task 1 found no `--gutter-large`

The draft's `500e5fad`, as `c9d290b0` (Phase 0's copy) and `696123ba` (air after the fan) left it: `git show 696123ba:apps/frontend/src/shop/ShopScreen.css | sed -n '/orientation: landscape/,/---------- Previews/p'`. Not applied as a patch: its hunks sit on `943b5d9a`'s two-column block and the hero's price line, neither of which exists here. New beside the draft: the rule that puts Phase 0's "Coming soon" across the grid's first row, and implicit grid rows, since that heading adds one.

- [ ] **Step 1: Only if Task 1 found no `--gutter-large`:** in `styles/tokens.css`, after `--gutter: 12px;`:

```css
/* A large screen's edge margin: an iPad's, wider than the phone's gutter. */
--gutter-large: 20px;
```

- [ ] **Step 2: The spread**, after Task 7's block, inside the Large screens section:

```css
/* Held sideways the page is one spread with nothing to scroll: reserve tickets as a banner across
   the top (the fan, the words, then past an upright perforation, like a ticket's stub, the count
   over the key), and under it the three shelves side by side, each with its swatches two by two. */
@media (min-width: 800px) and (min-height: 600px) and (any-pointer: coarse) and (orientation: landscape) {
  .shop {
    --shelf-swatch: 96px;
    --spread-w: min(1040px, 100% - 2 * var(--gutter-large));
    padding: 20px calc((100% - var(--spread-w)) / 2) 24px;
  }

  .shop__title {
    margin: 0 0 12px;
  }

  .reserve-hero {
    display: flex;
    align-items: center;
    column-gap: 28px;
    margin: 0;
    padding: var(--card-pad) 28px;
    text-align: start;
  }

  /* The front ticket's star reaches past the fan's box; its margin keeps air between the star and
     the title. */
  .reserve-hero .reserve-hero__fan {
    flex: none;
    margin: 0 16px 0 0;
  }

  .reserve-hero__text {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* The perforation turns upright and runs the banner's full height. */
  .reserve-hero > .tear-line {
    flex: none;
    align-self: stretch;
    width: 10px;
    height: auto;
    margin: calc(-1 * var(--card-pad)) 0;
    background: radial-gradient(circle, rgba(28, 24, 36, 0.16) 1.4px, #0000 1.9px) 50% 0 / 4px 9px
      repeat-y;
  }

  .reserve-hero__buy {
    flex: none;
    width: calc(var(--ph-w) - 60px);
  }

  .shop__purchases {
    max-width: calc(var(--ph-w) - 24px);
    margin-inline: 0;
  }

  /* Each shelf as wide as its swatches, the three spread to the banner's edges under the one "Coming
     soon"; their heads and swatches share rows, so a head that wraps lowers every shelf's swatches. */
  .shop__shelves {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, max-content));
    justify-content: space-between;
    column-gap: 32px;
    margin-top: 24px;
  }

  .shop__shelves > :not(.shelf) {
    grid-column: 1 / -1;
    justify-self: start;
    margin: 0 0 8px;
  }

  .shop__shelves > .shelf {
    display: grid;
    grid-row: span 2;
    grid-template-rows: subgrid;
    align-content: start;
    margin-top: 0;
  }

  .shelf__head {
    padding-inline: 0;
  }

  /* Two by two, every swatch in view, so the row has nothing to scroll. */
  .shelf__row {
    display: grid;
    grid-template-columns: repeat(2, var(--shelf-swatch));
    gap: 12px var(--shelf-gap);
    padding: 14px 0 0;
    overflow: visible;
  }
}
```

- [ ] **Step 3: Short screens**, after Step 2's block (Decision 4; `696123ba` tightened the stat board the same way):

```css
/* A short landscape, an iPad mini's: the spread draws closer, so nothing scrolls. The key and the
   swatches keep their sizes. */
@media (min-width: 800px) and (min-height: 600px) and (max-height: 699px) and (any-pointer: coarse) and (orientation: landscape) {
  .shop {
    padding-block: 14px 16px;
  }

  .shop__title {
    margin-bottom: 8px;
  }

  .reserve-hero {
    --card-pad: 12px;
  }

  .shop__shelves {
    margin-top: 16px;
  }

  .shelf__row {
    padding-top: 10px;
    row-gap: 8px;
  }
}
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/shop` → PASS. The layout's test is Task 10's "Shop sideways" lines.
- [ ] **Step 5:** Commit: `feat(frontend): the Shop on an iPad held sideways is one spread, a reserve tickets banner over three shelves`

### Task 9: DESIGN.md

**Files:** Modify `DESIGN.md`

- [ ] **Step 1: Shop.** Before the bullet starting `- **Previews** use the app's own materials.`:

```markdown
- **On an iPad:** upright, one centered column as wide as a shelf's four swatches with its sides, so every swatch shows whole. Held sideways, one spread with nothing to scroll: reserve tickets as a banner across the top (the fan, the name and its line, then past an upright perforation, like a ticket's stub, the count over Buy and the Sui credit), your ticket purchases under it, and the three shelves side by side under the one "Coming soon", each with its four 96px swatches two by two.
```

- [ ] **Step 2: Out of tickets.** At the end of the section's first paragraph (ending "…its key becomes a plain Draw."), add: "On an iPad every ticket card, the start card and the reserve ticket checkout included, rises to the middle of the screen at 400px wide instead of across its foot."
- [ ] **Step 3: Sealed card.** At the end of the Draw screen's `- **Sealed card:**` bullet, add: "On an iPad the card rises to the middle at 400px wide, as the ticket cards do, and the sticker stays on its slot when the screen turns." (Without Task 4, end after "do.")
- [ ] **Step 4: Gratitude events.** In the stat board's Gratitude bullet, the words saying what your gratitude events open as (`rg -n 'gratitude events' DESIGN.md`) become "a bottom sheet on a phone, and on an iPad a centered card 480px wide whose tear strip is left only to keyboards and screen readers".
- [ ] **Step 5:** `pnpm exec oxfmt DESIGN.md`, then commit: `docs: DESIGN.md describes the Shop and its cards on an iPad`

No PRODUCT.md sentence becomes false, and no user-facing string changes.

### Task 10: Check it in WebKit and Chromium

Scratch only: `data/scratch/ipad-shop/` is gitignored, and the Vite config stays untracked. Each pass line prints `PASS` or `FAIL` with what it measured.

- [ ] **Step 1: Servers.** Write `apps/frontend/vite.ipad-shop.config.ts`:

```ts
// Untracked, never committed: this plan's dev server on 5183, its API on 8783.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config.ts";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5183,
      strictPort: true,
      proxy: { "/api": { target: "http://127.0.0.1:8783" } },
    },
  }),
);
```

and start both in the background (`DATABASE_URL` resolves from the repo root):

```bash
(cd apps/api && PORT=8783 DATABASE_URL=data/ipad-shop.db IMAGE_DIR=../../data/ipad-shop-images IMAGE_BASE_URL=http://localhost:5183/api/images pnpm dev)
(cd apps/frontend && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm exec vite --config vite.ipad-shop.config.ts)
```

- [ ] **Step 2: The capture library**, `data/scratch/ipad-shop/lib.mjs`:

```js
// Scratch, never committed: engines, sign-in and measures for this plan's captures.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PW_CORE);

export const BASE = process.env.BASE;
export const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

/** The brief's sizes, CSS px: a phone, then iPads upright and held sideways. */
export const SIZES = [
  [390, 844],
  [744, 1047],
  [820, 1094],
  [1133, 658],
  [1180, 734],
];
export const ENGINES = ["webkit", "chromium"];
export const isLarge = ([w, h]) => w >= 600 && h >= 600;
export const sideways = ([w, h]) => w > h;
export const near = (a, b, within) => Math.abs(a - b) <= within;
const UA = {
  phone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

let failed = 0;
/** One pass line: PASS or FAIL, what it checks, and what was measured. */
export function check(label, ok, measured) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} ${JSON.stringify(measured)}`);
}
export const failures = () => failed;

/**
 * A page signed in as `name` at `size` in `engine`: a touch screen in Tokyo, reduced motion unless
 * `motion`. WebKit drops the API's Secure cookie on http://localhost, so the session opens from Node
 * and its cookie goes back in without Secure.
 */
export async function open(engine, size, name, { motion = false } = {}) {
  const [width, height] = size;
  const browser = await (engine === "webkit" ? webkit : chromium).launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: isLarge(size) ? 2 : 3,
    isMobile: true,
    hasTouch: true,
    userAgent: isLarge(size) ? UA.ipad : UA.phone,
    locale: "en-US",
    timezoneId: "Asia/Tokyo",
    reducedMotion: motion ? "no-preference" : "reduce",
  });
  // No motion permission prompt over the captures.
  await context.addInitScript(() => localStorage.setItem("draw.motion", "denied"));
  // WebKit launched from a tool's shell can't reach outside hosts; Node fetches them for it.
  if (engine === "webkit")
    await context.route(/^https:\/\//, async (route) =>
      route.fulfill({ response: await route.fetch() }),
    );
  const profile = { sub: `dev-${name}`, name: name[0].toUpperCase() + name.slice(1) };
  const answer = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken: `drawing-app-dev-id-token:${JSON.stringify(profile)}`,
      language: "en",
    }),
  });
  if (!answer.ok) throw new Error(`Signing in as ${name}: ${answer.status} ${await answer.text()}`);
  for (const cookie of answer.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const at = pair.indexOf("=");
    await context.addCookies([
      {
        name: pair.slice(0, at),
        value: pair.slice(at + 1),
        domain: "localhost",
        path: "/",
        secure: false,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`PAGE ERROR ${engine}: ${error.message}`));
  await page.goto(`${BASE}/?as=${name}`);
  return { browser, page };
}

/** The first match's box, CSS px, or null. */
export const box = (page, selector) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const [x, y, w, h] = [r.x, r.y, r.width, r.height];
    return { x, y, w, h, right: x + w, bottom: y + h, cx: x + w / 2, cy: y + h / 2 };
  }, selector);

/** Resizes the page, as a turn or another iPad would, and lets the layout settle. */
export async function resize(page, [width, height]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
}

/** One page of every screenshot, a row per surface, for ad0ll. */
export async function contactSheet(engine, files) {
  const rows = Object.entries(files)
    .map(
      ([surface, shots]) =>
        `<h2>${surface}</h2><div>${shots.map((f) => `<img src="${f}">`).join("")}</div>`,
    )
    .join("");
  const html = `${SHOTS}contact-${engine}.html`;
  writeFileSync(
    html,
    `<style>body{font:14px sans-serif}div{display:flex;gap:8px;align-items:flex-start}img{height:420px}</style>${rows}`,
  );
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  // A file page may show the file images beside it; a blank page may not.
  await page.goto(`file://${html}`, { waitUntil: "load" });
  await page.screenshot({ path: `${SHOTS}contact-${engine}.png`, fullPage: true });
  await browser.close();
}
```

- [ ] **Step 3: The checks**, `data/scratch/ipad-shop/checks.mjs`:

```js
// Scratch, never committed: this plan's pass lines and screenshots, in WebKit and Chromium.
import {
  BASE,
  ENGINES,
  SHOTS,
  SIZES,
  box,
  check,
  contactSheet,
  failures,
  isLarge,
  near,
  open,
  resize,
  sideways,
} from "./lib.mjs";

const NAME = "ipadshop-ann";
/** A turn and back, then every other size, with the Sealed card up. */
const TURNS = [
  [1180, 734],
  [820, 1094],
  [744, 1047],
  [1133, 658],
  [390, 844],
];

/** Every GET /api/tickets answers as the server does, with `patch` over its tickets. */
async function ticketsAs(page, patch) {
  await page.unroute("**/api/tickets");
  await page.route("**/api/tickets", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, tickets: { ...body.tickets, ...patch } } });
  });
}

/** A card's pass lines: across the foot, 14px in, on a phone; 400px wide in the middle on an iPad. */
async function cardLines(page, tag, size, layerSelector, cardSelector) {
  const layer = await box(page, layerSelector);
  const card = await box(page, cardSelector);
  if (!layer || !card) return check(`${tag} is up`, false, { layer, card });
  if (isLarge(size)) {
    check(`${tag}: 400px wide at most`, card.w <= 400.5, card);
    check(`${tag}: in the middle`, near(card.cx, layer.cx, 2) && near(card.cy, layer.cy, 2), {
      card,
      layer,
    });
  } else {
    const foot =
      near(card.x, layer.x + 14, 1) &&
      near(card.right, layer.right - 14, 1) &&
      near(card.bottom, layer.bottom - 14, 1);
    check(`${tag}: across the foot, 14px in`, foot, { card, layer });
  }
}

/** Draws one stroke on a fresh sheet and seals it with the seal key's two taps. */
async function sealOne(page) {
  await page.getByRole("button", { name: /^Draw a new sticker/ }).click();
  const canvas = page.locator(".ink-sheet canvas").first();
  await canvas.waitFor();
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.4);
  await page.mouse.down();
  for (let i = 1; i <= 12; i += 1)
    await page.mouse.move(
      b.x + b.width * (0.3 + 0.03 * i),
      b.y + b.height * (0.4 + 0.05 * Math.sin(i / 2)),
    );
  await page.mouse.up();
  for (const name of ["Seal: tap twice", "Tap again to seal"]) {
    const key = await page.getByRole("button", { name }).boundingBox();
    // The armed seal key keeps moving, so a locator's tap waits on it forever: tap where it is.
    await page.touchscreen.tap(key.x + key.width / 2, key.y + key.height / 2);
    await page.waitForTimeout(400);
  }
  // The card is up once its last line has faded in, and the ceremony ends a moment later: measure
  // sooner and the card is still rising and the sticker still on the sheet.
  await page.waitForFunction(
    () => {
      const card = document.querySelector(".sealed-card");
      return card?.style.opacity === "1" && !card.querySelector("[data-card-line][inert]");
    },
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(600);
}

async function sealedCard(page, engine, files) {
  await resize(page, [820, 1094]);
  await sealOne(page);
  for (const size of TURNS) {
    await resize(page, size);
    const tag = `${engine} ${size.join("x")} Sealed card`;
    await cardLines(page, tag, size, ".seal-ceremony", ".sealed-card");
    const slot = await box(page, ".sealed-card__slot");
    const sticker = await box(page, ".seal-ceremony__sticker");
    check(
      `${tag}: the sticker on its slot`,
      near(sticker.cx, slot.cx, 4) && near(sticker.cy, slot.cy, 4),
      { sticker, slot },
    );
    const file = `${engine}-sealed-card-${size.join("x")}.png`;
    await page.screenshot({ path: `${SHOTS}${file}` });
    files["Sealed card"].push(file);
  }
  await page.getByRole("button", { name: "Back to My board" }).click();
}

async function ticketCards(page, engine, size, files) {
  for (const [label, patch] of [
    ["out of tickets", { dailyLeft: 0, reserveLeft: 0 }],
    ["reserve ask", { dailyLeft: 0, reserveLeft: 3 }],
  ]) {
    await ticketsAs(page, patch);
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: /^Draw a new sticker/ }).click();
    await page.locator(".out-of-tickets__card").waitFor();
    await page.waitForTimeout(600);
    await cardLines(
      page,
      `${engine} ${size.join("x")} ${label}`,
      size,
      ".out-of-tickets",
      ".out-of-tickets__card",
    );
    const file = `${engine}-${label.replace(/ /g, "-")}-${size.join("x")}.png`;
    await page.screenshot({ path: `${SHOTS}${file}` });
    files["Ticket cards"].push(file);
  }
  await page.unroute("**/api/tickets");
}

async function checkout(page, engine, size, files) {
  await page.goto(`${BASE}/`);
  await page.locator(".tab-shop").click();
  await page.getByRole("button", { name: "Buy reserve tickets" }).click();
  await page.locator(".reserve-checkout .out-of-tickets__card").waitFor();
  await page.waitForTimeout(600);
  await cardLines(
    page,
    `${engine} ${size.join("x")} checkout`,
    size,
    ".reserve-checkout",
    ".reserve-checkout .out-of-tickets__card",
  );
  const file = `${engine}-checkout-${size.join("x")}.png`;
  await page.screenshot({ path: `${SHOTS}${file}` });
  files.Checkout.push(file);
}

async function shop(page, engine, size, files) {
  await ticketsAs(page, { reserveLeft: 5 });
  await page.goto(`${BASE}/`);
  await page.locator(".tab-shop").click();
  await page.locator(".shelf").first().waitFor();
  // The purchases label shows once Privy has a Sui wallet; the dev server never signs Privy in.
  await page.evaluate(() =>
    import("/src/identity/privy.ts").then((m) =>
      m.setPrivyStatus({ state: "signed-in", userId: "capture", suiWallet: `0x${"1".repeat(64)}` }),
    ),
  );
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
        right: b.right,
        bottom: b.bottom,
        cx: b.x + b.width / 2,
      };
    };
    const shopEl = document.querySelector(".shop");
    const hero = document.querySelector(".reserve-hero");
    return {
      scrolls: shopEl.scrollHeight > shopEl.clientHeight + 1,
      screen: r(shopEl),
      banner: getComputedStyle(hero).display === "flex",
      hero: r(hero),
      parts: [
        ".reserve-hero__fan",
        ".reserve-hero__text",
        ".reserve-hero > .tear-line",
        ".reserve-hero__buy",
      ].map((s) => r(document.querySelector(s))),
      held: r(document.querySelector(".reserve-hero__held")),
      key: r(document.querySelector(".reserve-hero__key")),
      shelves: [...document.querySelectorAll(".shop__shelves > .shelf")].map(r),
      rows: [...document.querySelectorAll(".shelf__row")].map((row) => ({
        row: r(row),
        scrolls: row.scrollWidth > row.clientWidth + 1,
        swatches: [...row.querySelectorAll(".shelf-item__swatch")].map(r),
      })),
    };
  });
  const tag = `${engine} ${size.join("x")} Shop`;
  const file = `${engine}-shop-${size.join("x")}.png`;
  await page.screenshot({ path: `${SHOTS}${file}` });
  files.Shop.push(file);
  await page.unroute("**/api/tickets");
  if (!isLarge(size)) {
    check(`${tag}: the phone's card, not a banner`, !m.banner, m.hero);
    check(
      `${tag}: every shelf scrolls sideways`,
      m.rows.every((row) => row.scrolls),
      m.rows.map((row) => row.row),
    );
    return;
  }
  check(`${tag}: centered`, near(m.hero.cx, m.screen.cx, 1.5), { hero: m.hero, screen: m.screen });
  if (!sideways(size)) {
    const whole = m.rows.every(
      (row) =>
        !row.scrolls &&
        row.swatches.every((s) => s.x >= row.row.x - 0.5 && s.right <= row.row.right + 0.5),
    );
    check(
      `${tag} upright: every swatch whole, no shelf scrolls`,
      whole,
      m.rows.map((row) => row.row),
    );
    return;
  }
  check(`${tag} sideways: nothing scrolls`, !m.scrolls, m.screen);
  check(
    `${tag} sideways: fan, words, perforation, then the key, in a row`,
    m.banner && m.parts.every((p, i) => i === 0 || p.x > m.parts[i - 1].x),
    m.parts,
  );
  check(
    `${tag} sideways: the perforation runs the banner's height`,
    near(m.parts[2].h, m.hero.h, 1),
    {
      tear: m.parts[2],
      hero: m.hero,
    },
  );
  check(
    `${tag} sideways: the count over the key`,
    m.held !== null && m.held.bottom <= m.key.y + 0.5,
    {
      held: m.held,
      key: m.key,
    },
  );
  check(
    `${tag} sideways: three shelves side by side`,
    m.shelves.length === 3 &&
      m.shelves.every(
        (s, i) => near(s.y, m.shelves[0].y, 1) && (i === 0 || s.x > m.shelves[i - 1].right),
      ),
    m.shelves,
  );
  const twoByTwo = m.rows.every(
    (row) =>
      !row.scrolls &&
      new Set(row.swatches.map((s) => Math.round(s.x))).size === 2 &&
      new Set(row.swatches.map((s) => Math.round(s.y))).size === 2,
  );
  check(
    `${tag} sideways: swatches two by two, all in view`,
    twoByTwo,
    m.rows.map((row) => row.swatches),
  );
  check(
    `${tag} sideways: the shelves' swatches share rows`,
    m.rows.every((row) => near(row.swatches[0].y, m.rows[0].swatches[0].y, 1)),
    m.rows.map((row) => row.swatches[0]),
  );
}

async function gratitudeEvents(page, engine, size, files) {
  const board = await (await page.request.get(`${BASE}/api/sticker-boards/me`)).json();
  const sticker = board.boardStickers[0].sticker;
  await page.unroute("**/api/sticker-boards/me/user-stats");
  await page.route("**/api/sticker-boards/me/user-stats", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const gratitude = { ...body.userStats.gratitude, direct: 480, residual: 120, total: 600 };
    await route.fulfill({
      response,
      json: { ...body, userStats: { ...body.userStats, gratitude } },
    });
  });
  await page.unroute("**/api/gratitude/events**");
  await page.route("**/api/gratitude/events**", (route) =>
    route.fulfill({
      json: {
        events: [
          {
            giftId: `0x${"b".repeat(64)}`,
            sticker,
            from: board.owner,
            part: "residual",
            amount: 120,
            recordedAt: new Date().toISOString(),
          },
          {
            giftId: `0x${"a".repeat(64)}`,
            sticker,
            from: board.owner,
            part: "direct",
            amount: 480,
            recordedAt: new Date(Date.now() - 86_400_000).toISOString(),
          },
        ],
        next: null,
      },
    }),
  );
  await page.goto(`${BASE}/`);
  await page.locator(".board-who").click();
  await page.getByRole("button", { name: "See where it came from" }).click();
  await page.locator(".gratitude-events.bottom-sheet").waitFor();
  await page.waitForTimeout(600);
  const tag = `${engine} ${size.join("x")} gratitude events`;
  const layer = await box(page, ".gratitude-events-layer");
  const card = await box(page, ".gratitude-events.bottom-sheet");
  const perf = await box(page, ".gratitude-events.bottom-sheet > .perf");
  if (isLarge(size)) {
    const middle = card.w <= 480.5 && near(card.cx, layer.cx, 2) && near(card.cy, layer.cy, 2);
    check(`${tag}: a card in the middle, 480px wide at most`, middle, { card, layer });
    check(`${tag}: no tear strip`, perf.w <= 1 && perf.h <= 1, perf);
  } else {
    const foot =
      near(card.x, layer.x, 1) &&
      near(card.right, layer.right, 1) &&
      near(card.bottom, layer.bottom, 1);
    check(`${tag}: a bottom sheet across the foot`, foot, { card, layer });
    check(`${tag}: its tear strip`, perf.h >= 20, perf);
  }
  const file = `${engine}-gratitude-events-${size.join("x")}.png`;
  await page.screenshot({ path: `${SHOTS}${file}` });
  files["Gratitude events"].push(file);
}

for (const engine of ENGINES) {
  const files = {
    "Sealed card": [],
    "Ticket cards": [],
    Checkout: [],
    Shop: [],
    "Gratitude events": [],
  };
  // Chromium plays the ceremony; WebKit's screenshots draw no 3D, so it runs with reduced motion.
  const { browser, page } = await open(engine, [820, 1094], NAME, {
    motion: engine === "chromium",
  });
  await page.getByRole("button", { name: /^Draw a new sticker/ }).waitFor({ timeout: 60_000 });
  await sealedCard(page, engine, files);
  for (const size of SIZES) {
    await resize(page, size);
    await ticketCards(page, engine, size, files);
    await checkout(page, engine, size, files);
    await shop(page, engine, size, files);
    await gratitudeEvents(page, engine, size, files);
  }
  await browser.close();
  await contactSheet(engine, files);
}
console.log(`${failures()} failed`);
process.exitCode = failures() ? 1 : 0;
```

- [ ] **Step 4: Run.** With both servers up:

```bash
PW_CORE=$(node -e '
const fs = require("fs"), os = require("os"), p = require("path");
const npx = p.join(os.homedir(), ".npm/_npx"), cache = p.join(os.homedir(), "Library/Caches/ms-playwright");
for (const d of fs.readdirSync(npx)) {
  const core = p.join(npx, d, "node_modules/playwright-core");
  if (!fs.existsSync(core)) continue;
  const b = require(p.join(core, "browsers.json")).browsers;
  const has = (n) => fs.existsSync(p.join(cache, `${n}-${b.find((x) => x.name === n).revision}`));
  if (has("webkit") && has("chromium")) { console.log(core); break; }
}') BASE=http://localhost:5183 node data/scratch/ipad-shop/checks.mjs
```

Expected: every line `PASS` and `0 failed`. Without Phase 0's gratitude events the run stops at that check. No `playwright-core` with both browsers installed: `npx playwright-core install webkit chromium`, then run again. WebKit that can't load a `data:` URL is the Mac's fault, not the app's (it couldn't on 2026-10-08): say so and finish in Chromium. These scripts ran in Chromium against main plus this plan's changes, with Phase 0's one "Coming soon" stood in for.

- [ ] **Step 5: Fix what failed, in one batch, and run Step 4 again.** If "Shop sideways: nothing scrolls" still fails at 1133×658, Phase 0's heading is taller than the trial's: in Task 8 Step 3's block add `.reserve-hero .reserve-hero__fan { height: 88px; }` (16px) and take the rest off `.shop__shelves`'s `margin-top`, never the key or the swatches. Commit fixes as `fix(frontend): …`, naming what each fixes. Without Task 4 (Decision 1 declined), the Sealed card's slot line passes only at 820×1094.

- [ ] **Step 6:** Stop both servers (TaskStop). Keep `data/scratch/ipad-shop/shots/` for the hand-off.

### Task 11: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, the format check and the Move tests pass.
- [ ] **Step 2:** Squash onto `origin/main` as two commits, with no AI attribution lines: `feat(frontend): the Shop and its cards on an iPad` (Tasks 1–8 and Task 10's fixes) and `docs: DESIGN.md describes the Shop and its cards on an iPad` (Task 9).
- [ ] **Step 3:** In the worktree, `git fetch origin && git rebase origin/main`, then the tests for the files this plan changed once more. In the main checkout, with no merge in progress and nothing staged, in one command: `git fetch origin && git merge --ff-only origin/main && git merge-base --is-ancestor main feat/ipad-shop-and-cards && git merge --ff-only feat/ipad-shop-and-cards && git push origin main`.
- [ ] **Step 4:** Remove the worktree (it holds the untracked Vite config and `data/`) and the branch, once ad0ll has the contact sheets. Then `git rm` this plan on main with a `docs:` commit by pathspec; the brief keeps its row until the last iPad plan purges it.
- [ ] **Step 5:** Hand ad0ll: `contact-webkit.png` and `contact-chromium.png`, and the decisions above with any that changed. What only a real iPad shows: the spread and the cards inside LINE's own browser chrome, at LINE's sheet heights.

## Self-review

- **Brief coverage:** landscape banner with fan, name and line, count and Buy past an upright perforation (Tasks 6, 8); three shelves side by side, no scrolling (Task 8, Task 10's "Shop sideways" lines, Step 5's fallback); portrait one centered column, every swatch whole (Task 7, Task 10's "Shop upright"); the checkout, ticket cards and Sealed card at 400px in the middle (Tasks 2–3, Task 10's card lines); the gratitude events card centered (Task 5); phones unchanged (every rule behind the large-screen query, wrappers with no box of their own, Task 10's phone lines).
- **Old plan:** the Sealed card's turn kept (Task 4); the sheet's turn, the replay, the Mini-game, the tilt axes and the other dialogs listed under Left for later with where each fits.
- **Ports:** every draft commit in the table has its command, its expected conflicts and its test; `c9d290b0` stays Phase 0's.
- **Tests:** one new vitest, written first, which fails without the change (`expected +0 to be close to 240`); the rest is CSS, whose test is Task 10's pass lines, each naming the rule it guards.
- **Names:** `stubResizeObservers`, `redraw`, `.reserve-hero__text`, `.reserve-hero__buy` and `.shop__shelves` are spelled the same in every task that uses them.
