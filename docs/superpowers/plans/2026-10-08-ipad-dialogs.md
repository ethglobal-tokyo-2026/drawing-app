# iPad Dialogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** written 2026-10-08 from `docs/superpowers/specs/2026-10-08-ipad-dialogs-proposal.md`, confirmed by ad0ll 2026-10-09 with his answers to its three questions. Builds after the board and Shop-and-cards plans merge (Base).

**Goal:** On a large screen every sheet the sticker detail, Giving, Receiving, the Mini-game and Explore open is one 400px card in the middle; the sticker detail splits in two panes when the window is wider than tall; the Mini-game grows with its stage inside a phone-width band. On every size a gift in flight shows in its sticker's detail and its tray spot, the board's "On its way" badge and `GET /api/gifts/pending` go, and three sublines go. Plus four items no plan owned: device-neutral words, sheets padding the home indicator, `overflow: clip` on card hosts, the developer slip's Device paper.

**Architecture:** One card rule in `ui/`: `Sheet`'s `card` prop adds `.sheet-card` (`ui/sheet.css`, under the large-screen query); a swipe down a card's head runs through `ui/useSheetDrag.ts`, extracted from the drag the Shop lane put in `Sheet`. Giving and Receiving compose their sticker or bag with the card as one centered group in their own large-screen CSS. Gifts in flight read the board's `openGift`; a take-out from the detail runs through `takeOutGift` (shared with Giving's backend, one operation per gift) and `giving/takeOuts.ts` (state per sticker for this visit). The Mini-game's scale is a pure function of its stage (`liveScale`), so a replay finds the heart a combo was recorded on.

**Tech Stack:** React 19, TypeScript, CSS, Hono + zod, vitest + happy-dom, Playwright (`apps/frontend/e2e/`, Chromium; WebKit through a scratch script).

**Sources:** the brief above; Apple HIG links in it. Nothing ports from the draft branch `spike/ipad-board`: it has no dialog commits. Code from deleted plans is read with `git show 22de7791:docs/superpowers/plans/<file>` (the Oct 7 plans) and `git show 637f4aef:docs/superpowers/plans/2026-10-08-ipad-shop-and-cards.md` (the capture library).

---

## Decisions

| Brief | What                                                                                 | Task          |
| ----- | ------------------------------------------------------------------------------------ | ------------- |
| 1     | one card rule: 400px, middle, scrim over the tab row, swipe down its head            | 1, 3–5, 10–12 |
| 2     | detail: two panes when wider than tall, one centered column otherwise                | 6             |
| 3     | replay at a phone's scale: nothing to build, checked                                 | 17            |
| 4     | Giving from your board: the sticker at the card's head, one centered group           | 3             |
| 5     | the sticker picker as a card, the tab row and its lead Give dimmed                   | 3             |
| 6     | Receiving: one centered group, the Accept card under the bag's mouth                 | 4             |
| 7     | Mini-game: phone-width band, game grows with the stage up to 1.5×; receipt is a card | 10            |
| 8     | Explore's lifted sticker as a card, carets just outside the sticker's square         | 11            |
| 9     | gifts in flight in the detail and the tray, every size; the badge and its route go   | 7–9           |

ad0ll's answers (2026-10-09):

1. Take it out on a **sent** gift asks first, in place, as Mark 18+'s confirm does. A gift still in the bag comes out with no question.
2. The give sheet's "Pick your chat with them. The first to open it gets it." and "It comes off your board and into a gift bag.", and the picker's "Pick one of yours, then send it to @… in a LINE chat." go on every size, with their catalog strings (Task 3).
3. The gratitude events card's swipe-down is the Shop and cards lane's (built: `Sheet`'s `head`); this plan only moves that card onto the shared rule (Task 1).

This plan's readings, none open unless listed under Open:

- R1. **The card rule's home.** `.sheet-card` in `ui/sheet.css`, centered by layout alone as the Sealed card is (`inset: 0; margin: auto; height: fit-content`), `--card-w` wide (400px, `styles/tokens.css`). The gratitude events card takes it with `--card-w: 480px` (Shop plan's decision 3). Cards that aren't `Sheet`s (the gift received notice, the Mini-game's receipt, the lifted sticker) read `--card-w` and the same edges in their own large-screen blocks.
- R2. **The swipe.** `useSheetDrag` captures the pointer only once the press moves past the tap slop, so a tap on a button in a card's head (Giving's X, Can't find them?'s back) still presses it. Giving's sent step has no head, so it has no swipe; the scrim, Escape and Back close it.
- R3. **Window shape** is CSS `(orientation: landscape)` inside the large-screen query: it reads the viewport, so a Stage Manager window splits by its own shape.
- R4. **Take-out state** lives in memory for the visit (`giving/takeOuts.ts`): it outlives its detail, and a failure stays on that sticker's detail until Try again or Dismiss. The gift's state is the server's, so a reload reads it again from the board.
- R5. **Mini-game scale:** on a stage at least 600×600, `min(W/390, H/741)` clamped to [1, 1.5], else 1 (the deleted plan's decision 15.1 without its short-stage shrink: phones stay as they are). Shake thresholds stay (15.2).
- R6. **The seal sheet** hadn't landed on main at `637f4aef` (2026-10-08): main still arms the seal chip, and no branch holds a seal sheet. Task 12 is written against its expected shape and checks first.

## Base

- Branch from `origin/main` once all of these hold (Task 0 checks):
  - foundations merged (on main: `LARGE_SCREEN`, `useLargeScreen()`, `onLargeScreen()`, `ui/TabsLead.tsx`, `--gutter-large`);
  - **the board plan merged** (`2026-10-08-ipad-board-and-stat-board.md` gone from main): its header task still renders both gift badges in `.board-head`, which Task 9 removes, and its tray tasks edit the files Task 8 edits;
  - **the Shop and cards plan merged** (`2026-10-08-ipad-shop-and-cards.md` gone from main): `Sheet`'s `head`, `.bottom-sheet__head`, `dragBy()` in `ui/testing.ts`, the gratitude events card's large-screen block (`feat/ipad-shop-cards`, 2ce30e85 and fde90163).
- Task 12 also waits for the seal sheet on main; every other task runs without it.
- Names this plan reads, as the lanes named them. Where a landed name differs, use the landed one and note it beside the task.

| From        | Names                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundations | `ui/largeScreen.ts`: `LARGE_SCREEN`, `useLargeScreen()`; `ui/testing.ts`: `onLargeScreen()`; `--gutter-large`                                                 |
| Shop lane   | `Sheet` props `head`; `.bottom-sheet__head`; `DISMISS_PX` from `ui/Sheet`; `dragBy(el, ...path)`; `.gratitude-events-layer`, `.gratitude-events.bottom-sheet` |
| Board plan  | `StickerBoard.tsx`'s `head` fragment in `.board-head`, `.board-gifts`, `.board-gifts .pending-gifts-badge`; tray's `traySheets.ts`, `trayPresses.ts`          |

- Large-screen CSS spells `@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`; sideways adds `and (orientation: landscape)`, upright `and (orientation: portrait)`.
- Ports: this plan's dev server 5186 (Vite) and 8786 (API); its e2e runs `E2E_APP_PORT=5187 E2E_API_PORT=8787`. Not 5190/8790.
- WebKit: `PW_CORE=/Users/adoll/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core` (build 2368) runs here. WebKit drops the API's `Secure` cookie on localhost: sign in with `POST /api/session` from Node and add the cookie back with `secure: false` (the capture library in Task 17 does).

## Files

Under `apps/frontend/src/` unless shown.

- **Card rule:** create `ui/useSheetDrag.ts`; modify `ui/Sheet.tsx`, `ui/sheet.css`, `ui/Sheet.test.tsx`, `styles/tokens.css`, `sticker-board/stat-board/GratitudeEvents.tsx`, `gratitude-events.css`, `GratitudeEvents.test.tsx`.
- **Home indicator:** `styles/tokens.css`, `app/App.css`, `ui/sheet.css`, `receiving/receive-gift-dialog.css`, `tickets/tickets.css`, `tickets/ReserveTicketCheckout.css`, `giving/gift-received-notice.css`, `explore/lifted-sticker.css`.
- **Giving:** `giving/Giving.tsx`, `Giving.css`, `GiveSheet.tsx`, `give-sheet.css`, `CantFindThem.tsx`, `i18n/strings/giving.ts`.
- **Receiving:** `receiving/ReceiveGiftDialog.tsx`, `receive-gift-dialog.css`, `SendGratitudeSheet.tsx`, `send-gratitude-sheet.css`, `SendGratitudeSheet.test.tsx`.
- **Notice:** `giving/GiftReceivedNotice.tsx`, `gift-received-notice.css`, `GiftReceivedNotice.test.tsx`.
- **Detail:** `sticker-board/StickerDetail.tsx`, `sticker-detail.css`, `StickerDetail.test.tsx`; create `giving/takeOuts.ts`; modify `giving/giftBackend.ts`, `i18n/strings/stickerBoard.ts`.
- **Tray:** `sticker-board/tray/traySlots.ts`, `traySlots.test.ts`, `trayModel.ts`, `traySheets.ts`, `trayPresses.ts`, `StickerTray.tsx`, `sticker-tray.css`, `StickerTray.test.tsx`, `sticker-board/StickerBoard.tsx`.
- **Badge goes:** delete `giving/PendingGiftsNotificationBadge.tsx`, its test, `pending-gifts-badge.css`; modify `sticker-board/StickerBoard.tsx`, `StickerBoard.css`, `StickerBoard.test.tsx`, `api/apiClient.ts`, `httpApi.ts`, `httpApi.test.ts`, `testing.tsx`, `i18n/strings/giving.ts`; `apps/api/src/routes/gifts.ts`, `gifts/packaging.ts`, `client.ts`, `requestDiagnostics.ts`, `routes/giving.test.ts`, `routes/giftsForYou.test.ts`; `apps/frontend/e2e/giving.e2e.ts`.
- **Mini-game:** `gratitude/stageLayout.ts`, `stageLayout.test.ts`, `miniGameEngine.ts`, `miniGameEngine.test.ts`, `tierBackground.ts`, `tierBackground.test.ts`, `gratitude-mini-game.css`, `GratitudeMiniGame.tsx`, `GratitudeMiniGame.test.tsx`, `testCombos.ts`, `replay/replayFeed.ts`, `replay/replayFeed.test.ts`, `replay/mountGratitudeReplay.ts`.
- **Lifted sticker:** `explore/LiftedSticker.tsx`, `lifted-sticker.css`, `LiftedSticker.test.tsx`.
- **Seal sheet:** as it landed (Task 12).
- **Words:** `i18n/strings/app.ts`, `errors.ts`, `gratitude.ts`, `stickerBoard.ts`, `stickerCreation.ts`, `i18n/glossary.md`, `sticker-creation/session/session.ts`, `session.test.ts`, `sticker-creation/DrawingScreen.test.tsx`, `gratitude/GratitudeMiniGame.test.tsx`, `ui/motionPermission.ts`.
- **Clip:** `sticker-board/StickerBoard.css`, `sticker-creation/DrawingScreen.css`, `app/App.css`.
- **Device paper:** create `performance/deviceFacts.ts`, `deviceFacts.test.ts`, `sticker-board/stat-board/DeviceDetails.tsx`, `DeviceDetails.test.tsx`, `device-details.css`; modify `stat-board/StatBoard.tsx`, `i18n/strings/stickerBoard.ts`, `performance/performanceRecorder.ts`, `performanceRecorder.test.ts`, `performanceReport.ts`.
- **E2E:** create `apps/frontend/e2e/dialogs.e2e.ts`.
- **Docs:** `DESIGN.md`, `PRODUCT.md`, `docs/gratitude-mini-game-design-doc.md`.
- **Scratch (never committed):** `data/scratch/ipad-dialogs/`, untracked `apps/frontend/vite.ipad-dialogs.config.ts`.

## Setup

- `R` is the main checkout, shared with other sessions: never edit or commit there but the last task's merge. `W=$R/.claude/worktrees/ipad-dialogs`. Every command runs with absolute paths or in a subshell `(cd "$W" && …)`, never a bare `cd`.
- Frontend tests: `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run <paths>`. API tests: `pnpm -C "$W/apps/api" exec vitest run <paths>`. happy-dom is a phone; a large-screen test calls `onLargeScreen()` and restores with `vi.restoreAllMocks()`.
- Order: 0, 1, 2, then 3–9 in order (they share `giving.ts`, `StickerDetail.tsx` and the board). 10 then 13 (both edit `GratitudeMiniGame.test.tsx`). 11, 14 and 15 touch only their own files and can run beside 3–10 in lanes (`git switch -c <branch> <commit>` in the lane's worktree; restore any tracked file the fresh worktree lacks). Then 12 (if the seal sheet landed), 16, 17, 18, 19.

### Task 0: Base and worktree

- [ ] **Step 1: The base.**

```bash
git -C "$R" fetch origin
for p in ipad-board-and-stat-board ipad-shop-and-cards; do
  git -C "$R" cat-file -e "origin/main:docs/superpowers/plans/2026-10-08-$p.md" 2>/dev/null && echo "NOT MERGED: $p"
done
```

Expected: no output. Any `NOT MERGED` line: stop and report.

- [ ] **Step 2: Worktree.** `git -C "$R" worktree add -b feat/ipad-dialogs "$W" origin/main && pnpm -C "$W" install`. An isolated agent already in a fresh worktree runs `git switch -c feat/ipad-dialogs origin/main` and `pnpm install` in its own.
- [ ] **Step 3: Names.**

```bash
rg -n "head\?: ReactNode|bottom-sheet__head|export const DISMISS_PX|export function dragBy" "$W/apps/frontend/src/ui"
rg -n "board-head|PendingGiftsNotificationBadge|pending-gifts-badge" "$W/apps/frontend/src/sticker-board"
rg -n "gratitude-events-layer|max-width: 480px" "$W/apps/frontend/src/sticker-board/stat-board/gratitude-events.css"
rg -n -i "sealsheet|seal-sheet" "$W/apps/frontend/src/sticker-creation"
```

Expected: each Shop lane name found; the board's `.board-head` holds `PendingGiftsNotificationBadge`; the events card's block found. Note in this file, beside the task that reads it, any name that landed differently. The last search says whether Task 12 can run.

### Task 1: One card rule (decision 1)

**Files:** Create `ui/useSheetDrag.ts`. Modify `ui/Sheet.tsx`, `ui/sheet.css`, `ui/Sheet.test.tsx`, `styles/tokens.css`, `sticker-board/stat-board/GratitudeEvents.tsx`, `gratitude-events.css`, `GratitudeEvents.test.tsx`.

The drag moves out of `Sheet` as it is but for one thing, the pointer held only once the press passes the slop (R2), so `Sheet.test.tsx`'s and `GratitudeEvents.test.tsx`'s drag tests are its test; Task 16's X tap tests the late hold in a browser, and its card lines the CSS.

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/ui/Sheet.test.tsx src/sticker-board/stat-board/GratitudeEvents.test.tsx` → PASS (the baseline).
- [ ] **Step 2: `ui/useSheetDrag.ts`:**

```ts
import { useRef, useState, type CSSProperties, type DOMAttributes } from "react";

/** How far a sheet or a card must be dragged down before it lets go, px. */
export const DISMISS_PX = 40;
/** How far a finger may wander, any way, and still tap rather than drag. */
const TAP_SLOP_PX = 8;

/**
 * A finger's drag down a sheet by its perforation, or a card by its head: the paper follows the
 * finger down, and let go past DISMISS_PX it closes, leaving from where the drag left it. The
 * pointer is held only once the press moves past the slop, so a tap on a button in a head presses it.
 */
export function useSheetDrag(close: () => void) {
  const press = useRef<{ x: number; y: number; dy: number; moved: boolean } | null>(null);
  // A drag's release is its own; the click the browser sends after it isn't a tap.
  const dragged = useRef(false);
  const [dy, setDy] = useState(0);
  // Where a drag left the paper, so it slides away from there rather than jumping back first.
  const [leaveFrom, setLeaveFrom] = useState(0);
  const handlers: DOMAttributes<HTMLElement> = {
    onPointerDown: (e) => {
      press.current = { x: e.clientX, y: e.clientY, dy: 0, moved: false };
      dragged.current = false;
    },
    onPointerMove: (e) => {
      const held = press.current;
      if (!held) return;
      const x = e.clientX - held.x;
      const y = e.clientY - held.y;
      if (!held.moved && Math.hypot(x, y) > TAP_SLOP_PX) {
        held.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      held.dy = Math.max(0, y);
      setDy(held.dy);
    },
    onPointerUp: () => {
      const held = press.current;
      press.current = null;
      setDy(0);
      // A tap closes on the click that follows it, as a screen reader's activation does.
      if (!held?.moved) return;
      dragged.current = true;
      if (held.dy <= DISMISS_PX) return;
      setLeaveFrom(held.dy);
      close();
    },
    onPointerCancel: () => {
      press.current = null;
      setDy(0);
    },
  };
  const style: CSSProperties = dy
    ? { transform: `translateY(${dy}px)` }
    : { "--leave-from": `${leaveFrom}px` };
  return {
    handlers,
    /** The paper's offset while dragged, else where it leaves from. */
    style,
    /** True once, for the click that follows a drag's release, which isn't a tap. */
    tookClick: () => {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
    /** A sheet opened again leaves from where it rests. */
    reset: () => setLeaveFrom(0),
  };
}
```

- [ ] **Step 3: `Sheet.tsx`** keeps its props and adds one:

```ts
  /** On a large screen it shows as a card in the middle of its layer (sheet.css's `.sheet-card`). */
  card?: boolean;
```

In the body: `const close = …` moves above `const drag = useSheetDrag(close);`; `press`, `dragged`, `dy`, `leaveFrom`, `release`, the Shop lane's `drag` object and the `DISMISS_PX`/`TAP_SLOP_PX` constants go; the reopen branch calls `drag.reset()` in place of `setLeaveFrom(0)`; the root's `className` list gains `card && "sheet-card"` after `"bottom-sheet"`, its `style` is `drag.style`; the perforation takes `{...drag.handlers}` and `onClick={() => { if (!drag.tookClick()) close(); }}`; the head takes `{...(large ? drag.handlers : {})}`. `Sheet.test.tsx` and `GratitudeEvents.test.tsx` import `DISMISS_PX` from `./useSheetDrag` / `../../ui/useSheetDrag`.

- [ ] **Step 4: The rule.** `styles/tokens.css`, beside `--gutter-large`:

```css
/* A card's width on a large screen: a phone's, as the ticket cards and the Sealed card rise at. */
--card-w: 400px;
```

`ui/sheet.css`, at its end, after the Shop lane's head block:

```css
/* One card rule for a large screen (Sheet's `card`): in the middle of its layer at a phone's width,
   by layout alone, as the Sealed card is, and no taller than the layer, its body scrolling. No tear
   strip: the perforation stays for keyboards and screen readers, and a swipe down the head closes it. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .bottom-sheet.sheet-card {
    --sheet-foot-inset: 0px;
    inset: 0;
    display: flex;
    flex-direction: column;
    width: min(var(--card-w), calc(100% - 2 * var(--gutter-large)));
    height: fit-content;
    max-height: calc(100% - 2 * var(--gutter-large));
    margin: auto;
    padding-top: 20px;
    border-radius: 16px;
  }

  .bottom-sheet.sheet-card > .perf:not(:focus-visible) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
```

A sheet whose own rule sets `left`, `right`, `bottom` or `max-height` with two classes resets them in its own large-screen block (Tasks 3–4 list each).

- [ ] **Step 5: The gratitude events card on the rule.** `GratitudeEvents.tsx`'s `<Sheet>` gains `card`. In `gratitude-events.css`'s large-screen block, the layer's flex centering and padding, the sheet's `position`, `width`, `max-width`, `padding-top` and `border-radius`, and the perforation's hiding go; the block keeps one rule, under its comment "A large screen shows it as the shared card (ui/sheet.css), wider for its rows.":

```css
.gratitude-events.bottom-sheet {
  --card-w: 480px;
}
```

- [ ] **Step 6:** Step 1's command and `pnpm -C "$W/apps/frontend" typecheck` → PASS.
- [ ] **Step 7: Commit.** `git -C "$W" add apps/frontend/src && git -C "$W" commit -m "feat(frontend): one card rule for sheets on a large screen, and the drag that closes a sheet or a card"`

### Task 2: Sheets pad the home indicator (every size)

**Files:** `styles/tokens.css`, `app/App.css`, `ui/sheet.css`, `receiving/receive-gift-dialog.css`, `tickets/tickets.css`, `tickets/ReserveTicketCheckout.css`, `giving/gift-received-notice.css`, `explore/lifted-sticker.css`.

From the Oct 7 foundations plan's Task 4 (`git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-foundations.md | sed -n '1941,1969p'`), on main's files. A sheet over the tabs (the motion card, Giving's, the Accept sheet) reaches the screen's foot and pads 24px only today. Its test is Task 16's "home indicator" e2e test.

- [ ] **Step 1: The token.** `tokens.css`, after `--tabs-strip`:

```css
/* The home indicator's safe area under a layer that reaches the screen's foot. Inside .screen, which
   ends above the tab strip, it's 0 (App.css): the strip clears the indicator there. */
--foot-inset: env(safe-area-inset-bottom);
```

`App.css`'s `.screen` gains `--foot-inset: 0px;` first, and its comment the sentence "It ends above the tab strip, which clears the home indicator, so nothing in it pads the foot's safe area."

- [ ] **Step 2: Sheets pad it.** `sheet.css`'s `.bottom-sheet` gains first `--sheet-foot-inset: var(--foot-inset, 0px);` under `/* The home indicator's safe area the paper runs down over, under its content. */`, and its `padding: 0 20px 24px;` becomes `padding: 0 20px calc(24px + var(--sheet-foot-inset));`. `.receive-gift__sheet.bottom-sheet`'s `padding-bottom: 30px;` becomes `calc(30px + var(--sheet-foot-inset))`. A card sets `--sheet-foot-inset: 0px` (Task 1).
- [ ] **Step 3: The rest read the token.** `tickets.css`'s `.out-of-tickets` `padding: 14px;` becomes `padding: 14px 14px calc(14px + var(--foot-inset, 0px));`, its comment gaining "Over the tabs, as the checkout is over the Shop, it clears the home indicator."; `ReserveTicketCheckout.css`'s `.phone > .reserve-checkout` rule and its comment go. `gift-received-notice.css`'s and `lifted-sticker.css`'s `env(safe-area-inset-bottom)` become `var(--foot-inset, 0px)`.
- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/ui src/tickets src/receiving` → PASS (CSS only).
- [ ] **Step 5: Commit.** `fix(frontend): sheets over the tabs pad the home indicator's safe area`

### Task 3: Giving and the give sheet as cards; three lines go (decisions 1, 4, 5; answer 2)

**Files:** `giving/Giving.tsx`, `Giving.css`, `GiveSheet.tsx`, `give-sheet.css`, `CantFindThem.tsx`, `i18n/strings/giving.ts`.

- [ ] **Step 1: The lines go (every size).** In `giving.ts` delete `sheet.sendInChatHint`, `sheet.leaves` and `giveSheet.lead`, with their comments. In `Giving.tsx` delete the hint `<p>`, the key's `aria-describedby={hintId}`, `hintId` and `useId`, the leaves `<p>` and the `StickerGlyph` import; in `GiveSheet.tsx` the lead `<p>`. In `Giving.css` delete `.giving__hint` and `.giving__leaves`. Then `rg -n "sendInChatHint|sheet\.leaves|giveSheet\.lead|giving__hint|giving__leaves" "$W/apps" "$W/DESIGN.md"` → nothing; any test or doc hit changes with it.
- [ ] **Step 2: Heads.** Each view's header moves into `Sheet`'s `head`, so a swipe down it closes the card on a large screen:
  - `CantFindThem.tsx` exports `CantFindThemHead({ onBack })`, its `<header className="giving__head">…</header>`; `CantFindThem` keeps the rest.
  - `Giving.tsx`: `let head: ReactNode = null;` beside `content`; each branch that renders `<header className="giving__head">` assigns it to `head` instead (the cantFind branch `<CantFindThemHead onBack={() => setCantFind(false)} />`), keyed by `view` with the body's slide: `<header key={view} className={`giving__head ${slideIn ? "is-in" : ""}`}>`. The sent step has none. `<Sheet … head={head ?? undefined} card>`.
  - `Giving.css`: the slide rules `.giving__body.is-in` (and its reduced-motion twin) take `:is(.giving__body, .giving__head).is-in`; add `.giving .bottom-sheet__head { flex: none; }`.
  - `GiveSheet.tsx`: its header goes to `head`, `<Sheet … card>`. `give-sheet.css`: `.bottom-sheet.giving__sheet--give > .bottom-sheet__head { margin-bottom: 14px; }` (the body's gap it left).
- [ ] **Step 3: The picker's scrim dims the tab row (decision 5).** `GiveSheet.tsx` imports `createPortal` and `useLargeScreen`; its layer goes over the whole phone on a large screen, where Give stands in the tab row:

```tsx
const large = useLargeScreen();
// …
const sheet = (
  <div className="board-sheet-layer" ref={layer}>
    {/* as now */}
  </div>
);
// On a large screen its scrim dims the tab row too, where Give stands.
const phone = large ? document.querySelector<HTMLElement>(".phone") : null;
return phone ? createPortal(sheet, phone) : sheet;
```

- [ ] **Step 4: Giving's group (decision 4).** `Giving.css`, before its reduced-motion block (starting values; Task 17's Giving lines tune them):

```css
/* On a large screen the sticker and its card are one group in the middle: the sticker at the card's
   head, just above its top edge with its peel shadow, and every step in the same card. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .giving {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: var(--gutter-large);
  }

  .giving__sticker {
    position: relative;
    flex: none;
    padding-top: 0;
  }

  .giving .bottom-sheet.sheet-card {
    position: relative;
    inset: auto;
    flex: 0 1 auto;
    min-height: 0;
    max-height: none;
    margin: 0;
  }
}
```

The give sheet's card needs nothing more: four tiles a row at 400px are a phone's size.

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/giving src/sticker-board/ArtistBoard.test.tsx` and typecheck → PASS.
- [ ] **Step 6: Commit.** `feat(frontend): on an iPad Giving and the give sheet are one card in the middle, and their sublines go`

### Task 4: Receiving and the Send gratitude card (decisions 1, 6)

**Files:** `receiving/ReceiveGiftDialog.tsx`, `receive-gift-dialog.css`, `SendGratitudeSheet.tsx`, `send-gratitude-sheet.css`, `SendGratitudeSheet.test.tsx`.

- [ ] **Step 1: Write the failing test.** In `SendGratitudeSheet.test.tsx` (import `onLargeScreen` from `../ui/testing`; its `afterEach` gains `vi.restoreAllMocks()`), in `describe("SendGratitudeSheet")`:

```tsx
it("on an iPad waits as a card over a scrim, which says Later", () => {
  onLargeScreen();
  open(people.ken, people.mika);
  act(() => document.querySelector<HTMLElement>(".send-gratitude-layer__scrim")?.click());
  expect(onLater).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/receiving/SendGratitudeSheet.test.tsx` → FAIL: no scrim.
- [ ] **Step 3: `SendGratitudeSheet.tsx`.** Its `<Sheet>` gains `card`, `head` (its `.send-gratitude-sheet__from` block) and, on a large screen, `layer`; there it renders inside a layer over the whole phone:

```tsx
const large = useLargeScreen();
const layer = useRef<HTMLDivElement>(null);
const sheet = (
  <Sheet
    label={title}
    onClose={onLater}
    className="send-gratitude-sheet"
    card
    layer={large ? layer : undefined}
    head={from}
  >
    {rest}
  </Sheet>
);
if (!large) return sheet;
// On a large screen it's a card in the middle, over a scrim that dims the board and the tab row.
const phone = document.querySelector<HTMLElement>(".phone");
const layered = (
  <div className="send-gratitude-layer" ref={layer}>
    <div className="send-gratitude-layer__scrim" onClick={onLater} />
    {sheet}
  </div>
);
return phone ? createPortal(layered, phone) : layered;
```

`send-gratitude-sheet.css`, at its end:

```css
/* A large screen's layer and scrim, as the give sheet's. */
.send-gratitude-layer {
  position: absolute;
  inset: 0;
  z-index: var(--z-sheet);
}

.send-gratitude-layer__scrim {
  position: absolute;
  inset: 0;
  background: rgba(28, 24, 36, 0.36);
}

@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .bottom-sheet.send-gratitude-sheet.sheet-card {
    left: 0;
    right: 0;
    bottom: 0;
  }
}
```

- [ ] **Step 4: Receiving's group.** `ReceiveGiftDialog.tsx`'s Accept `<Sheet>` gains `card` and `head` (its `.receive-gift__copy`). `receive-gift-dialog.css`, before the reduced-motion block (starting values; Task 17's Receiving lines tune `--accept-over`):

```css
/* On a large screen one group in the middle: the header centered over the bag, the bag and its pull
   tab at a phone's size, and once torn the Accept card under the bag's mouth, over its lower half as
   the phone's sheet is. The group centers, not the card alone. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .receive-gift {
    --accept-over: 150px;
    justify-content: center;
    align-items: center;
  }

  .receive-gift > :not(.bottom-sheet) {
    width: min(390px, 100%);
  }

  .receive-gift__head,
  .receive-gift__end-head {
    justify-content: center;
    text-align: center;
  }

  .receive-gift__sheet.bottom-sheet.sheet-card {
    position: relative;
    inset: auto;
    flex: none;
    margin: calc(-1 * var(--accept-over)) 0 0;
  }
}
```

`--accept-over` is an unverified guess: Task 17 measures the phone's overlap (the Accept sheet's top against the bag's box at 390×844 once torn) and sets it to that.

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/receiving` → PASS.
- [ ] **Step 6: Commit.** `feat(frontend): on an iPad Receiving is one centered group, and Send gratitude a card over a scrim`

### Task 5: The gift received notice as a card (decision 1)

**Files:** `giving/GiftReceivedNotice.tsx`, `gift-received-notice.css`, `GiftReceivedNotice.test.tsx`.

- [ ] **Step 1: Write the failing test.** In `GiftReceivedNotice.test.tsx` (import `onLargeScreen`, `dragBy` from `../ui/testing`, `DISMISS_PX` from `../ui/useSheetDrag`; its `afterEach` gains `vi.restoreAllMocks()`), the existing test's `root.render(<GiftReceivedNotice … />)` moves into `const showNotice = () => act(() => root.render(…))`, which both tests call:

```tsx
it("on an iPad closes from its scrim, and from a swipe down its head past the drag's length", () => {
  onLargeScreen();
  showNotice();
  act(() => host.querySelector<HTMLElement>(".gift-received-notice__scrim")?.click());
  expect(onClose).toHaveBeenCalledOnce();
  const head = host.querySelector(".gift-received-notice__head");
  dragBy(head, [0, DISMISS_PX]);
  expect(onClose).toHaveBeenCalledOnce();
  dragBy(head, [0, DISMISS_PX * 2]);
  expect(onClose).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2:** run it → FAIL: no scrim.
- [ ] **Step 3: Implement.** In `GiftReceivedNotice.tsx`: `const large = useLargeScreen(); const drag = useSheetDrag(onClose);`. The head, stage and act go inside `<div className="gift-received-notice__card" style={large ? drag.style : undefined}>`; before it, `{large && <div className="gift-received-notice__scrim" onClick={onClose} />}`; the head takes `{...(large ? drag.handlers : {})}`. `gift-received-notice.css`:

```css
/* The notice's page on a phone; a card on a large screen. */
.gift-received-notice__card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

/* On a large screen the board stays behind a scrim, and the notice is the shared card (ui/sheet.css)
   in the middle, its head the swipe that closes it. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .gift-received-notice {
    justify-content: center;
    align-items: center;
    padding: var(--gutter-large);
    background: none;
  }

  .gift-received-notice__scrim {
    position: absolute;
    inset: 0;
    background: rgba(28, 24, 36, 0.36);
  }

  .gift-received-notice__card {
    position: relative;
    flex: none;
    width: min(var(--card-w), 100%);
    max-height: 100%;
    padding-bottom: 24px;
    border-radius: 16px;
    background: var(--liner);
    box-shadow: var(--shadow-sheet);
  }

  .gift-received-notice__head {
    touch-action: none;
  }

  .gift-received-notice__act {
    padding-bottom: 0;
  }
}
```

- [ ] **Step 4:** Step 1's file → PASS.
- [ ] **Step 5: Commit.** `feat(frontend): on an iPad the gift received notice is a card over the board`

### Task 6: The sticker detail's panes (decisions 2, 3)

**Files:** `sticker-board/StickerDetail.tsx`, `sticker-detail.css`.

CSS and two layout-neutral wrappers; the existing detail tests are its regression test, Task 16's detail test its layout test.

- [ ] **Step 1: Wrappers.** In `StickerDetail.tsx`'s `sticker ? (…)` branch, the stage and the pager go inside `<div className="sticker-detail__sticker-pane">`; everything after the pager up to and including the `.sticker-detail__marked` status line goes inside `<div className="sticker-detail__column">`. On a phone both are plain blocks inside the scrolling `.sticker-detail__main`.
- [ ] **Step 2: The figure's box as a variable.** `sticker-detail.css`: `.sticker-detail` gains first `--figure: 216px;` under `/* The sticker's box: a phone's, grown on a large screen. */`; `.sticker-detail__stage`'s `height: 240px;` becomes `height: calc(var(--figure) + 24px);`; the figure rule's comment becomes "Its own shape, inside the --figure square; the timelapse's layer over it takes the same box." and its width `calc(var(--figure) * min(1, var(--ar)))`.
- [ ] **Step 3: The panes**, before `@media (hover: hover)`:

```css
/* ---------- Large screens ---------- */

/* The sticker grows up to 1.5×, and what's about it keeps a phone's width: never across the room. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .sticker-detail {
    --figure: 324px;
    --column-w: 390px;
  }
}

/* Upright: one centered column under the sticker. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) and (orientation: portrait) {
  .sticker-detail__column {
    width: min(var(--column-w), 100%);
    margin-inline: auto;
  }
}

/* Wider than tall: the sticker, its carets and its timelapse centered on the left; the column beside
   it scrolls on its own, so a trail opened or a replay played never scrolls the sticker away. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) and (orientation: landscape) {
  .sticker-detail__main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) min(var(--column-w), 50%);
    grid-template-rows: minmax(0, 1fr);
    column-gap: var(--gutter-large);
    padding: 0 var(--gutter-large) 0 18px;
    overflow: hidden;
  }

  .sticker-detail__sticker-pane {
    align-self: center;
  }

  .sticker-detail__column {
    min-height: 0;
    padding-bottom: 44px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }

  .sticker-detail__column::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/StickerDetail.test.tsx src/sticker-board/TransferTrail.test.tsx` → PASS. Decision 3 needs no code: the replay's stage takes its card's width, a phone's in the column (Task 17 checks it).
- [ ] **Step 5: Commit.** `feat(frontend): on an iPad the sticker detail splits in two panes when the window is wider than tall, one column otherwise`

### Task 7: A gift in flight in its sticker's detail (decision 9, answer 1)

**Files:** Modify `giving/giftBackend.ts`, `sticker-board/StickerDetail.tsx`, `sticker-detail.css`, `StickerDetail.test.tsx`, `i18n/strings/stickerBoard.ts`, `i18n/strings/giving.ts`. Create `giving/takeOuts.ts`.

States, from the board's `openGift`: **sent, for someone** — the closed bag's sleeve, "On its way to @bob"; **sent, no one yet** — the sleeve, "On its way"; **packed** — the open bag's sleeve, "In the bag", Give still the key. Take it out sits under the note in all three; a sent gift's opens an in-place confirm first.

- [ ] **Step 1: Write the failing tests.** In `StickerDetail.test.tsx`, import `gift` from `../api/testFixtures` and `errorMessage` beside `errorDetail`. The test "shows a sent sticker on its way in place of Give, and gives a packed one" gives way to:

```tsx
describe("a gift in flight", () => {
  const inFlight = (no: number, status: "packed" | "sent", to?: string) =>
    sticker(no, day(14), { openGift: { id: `g-${no}`, status, ...(to && { to }) } });
  /** The detail of `s`, opened by its owner, whose take-outs go to `startTakeOut`. */
  const openInFlight = (s: BoardStickerView, startTakeOut?: ApiClient["startTakeOut"]) =>
    open(
      { stickers: [s], startId: s.id, ownerId: you.id },
      emptyApi(startTakeOut && { startTakeOut }),
    );
  const takeOut = () => i18next.t(($) => $.giving.inTheBag.takeOut);
  const note = () => document.querySelector(".sticker-detail__on-its-way")?.textContent;
  const alert = () => document.querySelector(".sticker-detail__take-out-failed")?.textContent;
  const landsOut = (giftId: string) =>
    Promise.resolve({ gift: gift({ id: giftId, status: "taken_out" }) });

  it("says its state only, Take it out under it, and keeps Give the key while it's in the bag", () => {
    openInFlight(inFlight(133, "sent", "bob"));
    expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWayTo, { receiver: "@bob" }));
    expect(button("Give")).toBeUndefined();
    expect(button(takeOut())).toBeDefined();
    openInFlight(inFlight(133, "sent"));
    expect(note()).toBe(i18next.t(($) => $.stickerBoard.detail.onItsWay));
    const packed = inFlight(133, "packed");
    openInFlight(packed);
    expect(note()).toBe(i18next.t(($) => $.giving.inTheBag.title));
    expect(button(takeOut())).toBeDefined();
    press("Give");
    expect(onGive).toHaveBeenCalledExactlyOnceWith(packed);
  });

  it("takes a gift in the bag out at once, and a sent one only once its confirm says so", async () => {
    const startTakeOut = vi.fn<ApiClient["startTakeOut"]>(landsOut);
    openInFlight(inFlight(133, "packed"), startTakeOut);
    press(takeOut());
    await settle();
    expect(startTakeOut).toHaveBeenCalledExactlyOnceWith("g-133");

    openInFlight(inFlight(147, "sent"), startTakeOut);
    press(takeOut());
    expect(startTakeOut).toHaveBeenCalledOnce();
    // Cancel takes focus first, so Enter alone never takes it back.
    expect(document.activeElement?.textContent).toBe(
      i18next.t(($) => $.stickerBoard.detail.takeOut.cancel),
    );
    press(takeOut());
    await settle();
    expect(startTakeOut).toHaveBeenLastCalledWith("g-147");
  });

  it("goes on once the detail closes, and says why it failed there until tried again", async () => {
    const refusal = new ApiError(409, { error: "take_out_not_landed", detail: "Not landed yet" });
    let refuse: (error: unknown) => void = () => {};
    const startTakeOut = vi
      .fn<ApiClient["startTakeOut"]>()
      .mockImplementationOnce(() => new Promise((_, reject) => (refuse = reject)))
      .mockImplementationOnce(landsOut);
    const packed = inFlight(117, "packed");
    openInFlight(packed, startTakeOut);
    press(takeOut());
    act(() => root.render(null));
    await act(async () => refuse(refusal));
    openInFlight(packed, startTakeOut);
    expect(alert()).toContain(
      i18next.t(($) => $.giving.inTheBag.couldntTakeOut, {
        no: "No.0117",
        reason: errorMessage(refusal),
      }),
    );
    press("Try again");
    await settle();
    expect(startTakeOut).toHaveBeenCalledTimes(2);
    expect(alert()).toBeUndefined();
  });

  it("puts Give back with focus once it's out, and says the sticker is back on the board", async () => {
    openInFlight(inFlight(133, "packed"), landsOut);
    press(takeOut());
    await settle();
    expect(document.activeElement?.textContent).toBe("Give");
    expect(document.querySelector(".sticker-detail__taken-out")?.textContent).toBe(
      i18next.t(($) => $.stickerBoard.detail.takeOut.back.onBoard, { no: "No.0133" }),
    );
  });
});
```

`take_out_not_landed` is one of the take-out route's refusals (`apps/api/src/gifts/takeOut.ts`); if `ErrorBody` types its `error` another way, take its spelling there.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/StickerDetail.test.tsx -t "in flight"` → FAIL: no `takeOut` strings, no note for a packed gift, no Take it out.
- [ ] **Step 3: Strings.** `stickerBoard.ts`, in `detail`, after `onItsWayTo`:

```ts
    /** Take it out, on the detail of a sticker in a gift you sent or packed. */
    takeOut: {
      /** Sticker detail, a sticker you sent: the in-place confirm Take it out opens, its title; {{no}} is its number, such as "No.0147" */
      title: { en: "Take {{no}} out?", ja: "{{no}}を取り出しますか？" },
      /** Sticker detail, Take it out's confirm: the quiet link that closes it with nothing taken out */
      cancel: { en: "Cancel", ja: "キャンセル" },
      /** Where the sticker went once Take it out landed, said to screen readers. */
      back: {
        /** Sticker detail: said to screen readers once Take it out landed and the sticker is back on your board; {{no}} is its number */
        onBoard: { en: "{{no}} is back on your board", ja: "{{no}}をボードに戻しました" },
        /** Sticker detail: said to screen readers once Take it out landed and the sticker is back in your sticker tray; {{no}} is its number */
        inTray: { en: "{{no}} is back in your tray", ja: "{{no}}をトレイに戻しました" },
      },
    },
```

`onItsWay`'s and `onItsWayTo`'s comments become "Sticker detail, a sticker you've sent that hasn't been received (… to someone in the app): the note in place of Give, beside its sleeve". In `giving.ts` the comments of `inTheBag.title`, `inTheBag.takeOut`, `takingOut.button` and `inTheBag.couldntTakeOut` add the sticker detail's use: "; and the sticker detail of a sticker in a packed gift: its note" / "…: the quiet link under its note, and its confirm's key" / "…: that link's words while it runs" / "…: the alert under its note, with Try again and Dismiss".

- [ ] **Step 4: One take-out per gift.** In `giftBackend.ts`, the backend's `takeOut` becomes a module function, which the backend calls as `takeOut: (giftId) => takeOutGift({ api, userId, sign }, giftId)`:

```ts
/**
 * Takes a gift back out, from the bag or after sending: one operation per gift, whoever asks, so a
 * sticker's detail and Giving share it.
 */
export function takeOutGift(
  {
    api,
    userId,
    sign = signWithSuiWallet,
  }: { api: ApiClient; userId: string; sign?: SignSponsored },
  giftId: string,
): Promise<void> {
  const pending = takingOut.get(giftId);
  if (pending) return pending;
  const operation = (async () => {
    // The server answers a take-out for the giver's wallet to sign, or none when the sticker never
    // went into the escrow.
    const { takeOut } = await api.startTakeOut(giftId);
    if (takeOut) await api.takeOutGift(giftId, await sign(takeOut));
    tokens.delete(giftId);
    forgetKeptGift(userId, giftId);
  })().finally(() => takingOut.delete(giftId));
  takingOut.set(giftId, operation);
  return operation;
}
```

The backend's `settle` keeps its other callers.

- [ ] **Step 5: `giving/takeOuts.ts`:**

```ts
import { useSyncExternalStore } from "react";
import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import { forget as forgetKeptBoard } from "../sticker-board/lastBoard";
import { myStickerBoardChanged } from "../sticker-board/useMyStickerBoard";
import { takeOutGift } from "./giftBackend";

/** A take-out from a sticker's detail: on its way, or why it failed. */
export type TakeOut =
  { giftId: string; step: "takingOut" } | { giftId: string; step: "failed"; error: ApiError };

/**
 * Take-outs started from a sticker's detail, by sticker, for this visit: one goes on after its detail
 * closes, and a failure stays on that detail until it's tried again or dismissed. The gift's state is
 * the server's, so a reload reads it again from the board.
 */
const takeOuts = new Map<string, TakeOut>();
const listeners = new Set<() => void>();
const landed = new Set<(stickerId: string) => void>();

function set(stickerId: string, takeOut: TakeOut | null) {
  if (takeOut) takeOuts.set(stickerId, takeOut);
  else takeOuts.delete(stickerId);
  for (const listener of listeners) listener();
}

/** Takes `stickerId`'s gift `giftId` back out, unless that's already on its way. */
export function takeOutFromDetail(
  deps: { api: ApiClient; userId: string },
  stickerId: string,
  giftId: string,
) {
  if (takeOuts.get(stickerId)?.step === "takingOut") return;
  set(stickerId, { giftId, step: "takingOut" });
  takeOutGift(deps, giftId).then(
    () => {
      set(stickerId, null);
      // The board, and the board kept on this device, still hold the gift.
      forgetKeptBoard();
      myStickerBoardChanged();
      for (const listener of landed) listener(stickerId);
    },
    (error: unknown) => {
      const failure = apiError(error);
      console.error(`Sticker ${stickerId}'s gift ${giftId} wasn't taken out`, failure);
      set(stickerId, { giftId, step: "failed", error: failure });
    },
  );
}

/** Clears a failed take-out's alert. */
export function dismissTakeOut(stickerId: string) {
  if (takeOuts.get(stickerId)?.step === "failed") set(stickerId, null);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The take-out of `stickerId`'s gift from its detail, while one is on its way or failed. */
export const useTakeOut = (stickerId: string | null) =>
  useSyncExternalStore(subscribe, () => (stickerId ? (takeOuts.get(stickerId) ?? null) : null));

/** Tells `listener` each sticker whose take-out landed. Returns what stops it. */
export function onTakenOut(listener: (stickerId: string) => void) {
  landed.add(listener);
  return () => void landed.delete(listener);
}
```

- [ ] **Step 6: The detail.** In `StickerDetail.tsx` (imports: `ArrowUUpLeft`, `takeOutFromDetail`, `dismissTakeOut`, `onTakenOut`, `useTakeOut`). Take it out shows where `ownerId` is set, which the board always passes for your own stickers; the take-out's person is `ownerId` (no `useMe()`: the detail renders outside a SessionGate in its tests).
  - State: `takenOut` (`ReadonlySet<string>`, stickers whose take-out landed here, until the board's reload drops their gift), `takeOutAsk` (the sticker id whose confirm is up), `takenOutSaid` (`{ stickerId, words }`), and `takeOut = useTakeOut(sticker?.id ?? null)`.
  - `const openGift = sticker && !takenOut.has(sticker.id) ? sticker.openGift : null;` and `const sent = openGift?.status === "sent";`. `owed`'s `!onItsWay(sticker)` becomes `!sent`; the lift's `given` keeps `s.openGift?.status === "sent"`.
  - An effect `onTakenOut((id) => …)`: for an id among `stickers`, add it to `takenOut`, set `takenOutSaid` to `back.onBoard` or `back.inTray` by that sticker's `placement.on`, and, if it's the shown sticker, focus the act's key after the render (`root.current?.querySelector<HTMLElement>(".sticker-detail__acts .key")?.focus({ preventScroll: true })` in a layout effect keyed on `takenOutSaid`).
  - The act slot, in place of the `onItsWay(sticker) ? … :` branch, in `mode === "yours"`:

```tsx
{openGift && (
  <div className="sticker-detail__in-flight">
    <p className="sticker-detail__on-its-way">
      <span className={`sticker-detail__sleeve ${sent ? "" : "is-open"}`} aria-hidden="true">
        <img src={sticker.urls.png} alt="" draggable={false} />
      </span>
      <span>
        {!sent
          ? t(($) => $.giving.inTheBag.title)
          : openGift.to
            ? t(($) => $.stickerBoard.detail.onItsWayTo, { receiver: formatHandle(openGift.to) })
            : t(($) => $.stickerBoard.detail.onItsWay)}
      </span>
    </p>
    {takeOutAsk === sticker.id && takeOut?.step !== "takingOut" ? (
      <div className="sticker-detail__mark-ask" role="group" aria-labelledby={`${markId}-take-out`}>
        <p className="sticker-detail__mark-title" id={`${markId}-take-out`}>
          {t(($) => $.stickerBoard.detail.takeOut.title, { no: formatNo(sticker.no) })}
        </p>
        <div className="sticker-detail__mark-actions">
          <QuietLink ref={cancelTakeOut} onClick={() => setTakeOutAsk(null)}>
            {t(($) => $.stickerBoard.detail.takeOut.cancel)}
          </QuietLink>
          <LabelButton size="sm" onClick={() => startTakeOut(openGift.id)}>
            {t(($) => $.giving.inTheBag.takeOut)}
          </LabelButton>
        </div>
      </div>
    ) : (
      <QuietLink
        aria-busy={takeOut?.step === "takingOut" || undefined}
        aria-disabled={takeOut?.step === "takingOut" || undefined}
        onClick={() => {
          if (takeOut?.step === "takingOut") return;
          if (sent) setTakeOutAsk(sticker.id);
          else startTakeOut(openGift.id);
        }}
      >
        <ArrowUUpLeft />{" "}
        {takeOut?.step === "takingOut"
          ? t(($) => $.giving.takingOut.button)
          : t(($) => $.giving.inTheBag.takeOut)}
      </QuietLink>
    )}
    {takeOut?.step === "failed" && (
      <ErrorLine
        className="sticker-detail__take-out-failed"
        detail={errorDetail(takeOut.error)}
        onRetry={() => startTakeOut(takeOut.giftId)}
        action={{
          label: t(($) => $.stickerBoard.detail.dismiss),
          onClick: () => dismissTakeOut(sticker.id),
        }}
      >
        {t(($) => $.giving.inTheBag.couldntTakeOut, {
          no: formatNo(sticker.no),
          reason: errorMessage(takeOut.error),
        })}
      </ErrorLine>
    )}
  </div>
)}
{!sent && (owed && onSendGratitude ? (/* the stack, as now */) : onGive && (/* the Give key, as now */))}
```

    with `const startTakeOut = (giftId: string) => { setTakeOutAsk(null); if (ownerId) takeOutFromDetail({ api, userId: ownerId }, sticker.id, giftId); };` (inside the branch, where `sticker` is set; the in-flight block renders its link and confirm only when `ownerId` is set), `cancelTakeOut` focused when the confirm opens (as `cancelMark` is), focus back on Take it out when Cancel or Escape closes it (Escape steps out of it first, as out of Mark 18+'s), and a page turn closing it (`onPage` sets `takeOutAsk` to null). After `.sticker-detail__marked`: `<p className="visually-hidden sticker-detail__taken-out" role="status">{takenOutSaid?.stickerId === sticker.id ? takenOutSaid.words : ""}</p>`.

- `sticker-detail.css`: `.sticker-detail__in-flight { display: grid; gap: 10px; margin-top: 18px; }`; `.sticker-detail__in-flight > .sticker-detail__mark-ask { margin-top: 0; }`; the note's `flex: 1` goes (it's no longer in a flex row); the open bag's sleeve, after `.sticker-detail__sleeve::after`: `.sticker-detail__sleeve.is-open::after { display: none; }` under `/* In the bag, not sent: no tape across its mouth yet. */`. Japanese wraps: the note's text keeps `min-width: 0` and normal wrapping. Nothing here animates, so under reduced motion the note goes in one frame as everywhere.
- [ ] **Step 7:** Step 2's command → PASS; then the whole file, `src/giving` and typecheck → PASS.
- [ ] **Step 8: Commit.** `feat(frontend): a gift in flight shows in its sticker's detail, which takes it out, asking first once it's sent`

### Task 8: A gift on its way in the sticker tray (decision 9)

**Files:** `sticker-board/tray/traySlots.ts`, `traySlots.test.ts`, `trayModel.ts`, `traySheets.ts`, `trayPresses.ts`, `StickerTray.tsx`, `sticker-tray.css`, `StickerTray.test.tsx`, `sticker-board/StickerBoard.tsx`, `i18n/strings/stickerBoard.ts`.

Today a sticker on its way leaves bare paper (`traySheets.ts` skips a `given` slot with no `givenTo`). Now its spot shows the sticker under the sleeve's frost, inside its own cut line, never peels, and a tap opens its detail among your stickers.

- [ ] **Step 1: Write the failing tests.** In `traySlots.test.ts`, "marks stickers out on the board, on their way or received, or here" expects `["used", "onItsWay", "given", "here", "here"]`. In `StickerTray.test.tsx`: `api` gains `openYours: () => {}`; in "leaves a given sticker's spot…" the two lines saying a sticker on its way leaves nothing to tap go; "traces a given sticker's own cut line on its spot, and leaves one on its way only paper" becomes "traces a given sticker's own cut line on its spot", its `outlines` read from `'.tray__slot[data-id="given"] .tray__given-outline'`. Add after them:

```tsx
it("shows a sticker on its way under frost in its spot, which opens it among your stickers", async () => {
  const openYours = vi.fn();
  render([sentSticker("sent", 3)], { openYours });
  await openTray();
  const spot = board.querySelector<HTMLElement>('.tray__slot[data-id="sent"]');
  expect(spot?.getAttribute("aria-label")).toBe("No.0001, on its way. Open it");
  expect(spot?.querySelector(".tray__frost")).not.toBeNull();
  expect(spot?.querySelector(".tray__given-outline")).not.toBeNull();
  act(() => spot?.click());
  expect(openYours).toHaveBeenCalledExactlyOnceWith("sent");
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/tray` → FAIL.
- [ ] **Step 3: Strings.** `stickerBoard.ts`, `tray.slot`, after `given`:

```ts
      /** Sticker tray: screen readers' name for the spot of a sticker you sent that no one has received yet, a button that opens it among your stickers */
      onItsWay: { en: "{{no}}, on its way. Open it", ja: "{{no}}、お届け中のシールをひらく" },
      /** Sticker tray: screen readers' name for the spot of a sticker you sent to someone that they haven't received yet, a button that opens it among your stickers; {{recipient}} is who it waits for, such as "@bob" */
      onItsWayTo: {
        en: "{{no}}, on its way to {{recipient}}. Open it",
        ja: "{{no}}、{{recipient}}さんへお届け中のシールをひらく",
      },
```

- [ ] **Step 4: The state.** `traySlots.ts`: `TraySlotState` gains `"onItsWay"` (its doc: "on its way" — its spot shows it under frost); `state` becomes `!s.held ? "given" : onItsWay(s) ? "onItsWay" : s.placement.on ? "used" : "here"`; `newSlots` keeps only `"here"` and `"used"` (its filter `s.state !== "given"` becomes `s.state === "here" || s.state === "used"`).
- [ ] **Step 5: The spot.** `trayModel.ts`: `TraySticker` gains `/** On its way: who it waits for, printed, when the app knows. */ onItsWayTo?: string;` and the tray's api `/** Opens a sticker on its way among your stickers. */ openYours: (id: string) => void;`. `StickerTray.tsx` sets `sticker.onItsWayTo = handleOf(…)` from `s.openGift.to` for an `onItsWay` slot. `traySheets.ts`: `sheetEl` appends `onItsWay` slots too; `slotEl` for one, before the given branch: the shared press, its `aria-label` from `onItsWay`/`onItsWayTo`, the sticker's image (as a `here` slot draws it, never peelable) under `<i class="tray__frost">`, and its cut line (`cutLineEl`). `trayPresses.ts`: a click on `.tray__slot[data-state="onItsWay"]` calls `api.openYours(id)` (beside `openGivenAt`); `holdPress` and the slot-tap guard treat it as `given` (opens on click, never peels). `StickerBoard.tsx`'s tray api gains `openYours`. `sticker-tray.css`:

```css
/* A sticker on its way: in its spot under the sleeve's frost, inside its own cut line, so its sheet's
   packing never moves. It opens, never peels. */
.tray__slot[data-state="onItsWay"] {
  cursor: pointer;
}

.tray__frost {
  position: absolute;
  inset: 0;
  -webkit-mask: var(--src) center / contain no-repeat;
  mask: var(--src) center / contain no-repeat;
  background: rgba(246, 245, 250, 0.62);
  backdrop-filter: blur(4px);
  pointer-events: none;
}
```

(`--src` is the slot's image URL, set on the frost as Giving's silhouette sets it.) Reduced motion: the frost appears in one frame (no transition).

- [ ] **Step 6:** Step 2's command → PASS; `src/sticker-board` and typecheck → PASS.
- [ ] **Step 7: Commit.** `feat(frontend): a sticker on its way waits under frost in its tray spot, which opens its detail`

### Task 9: The "On its way" badge and its route go (decision 9; sequenced after the board plan)

**Files:** listed under Files, Badge goes.

- [ ] **Step 1: The board.** In `StickerBoard.tsx`: the `pending` query, `reloadPending` and its state, `onTheirWay`, the `PendingGiftsNotificationBadge` import and element go; `onMyStickerBoardChanged` sets only `setReloadForGift(true)`; `board-who`'s `is-roomy` and the `.board-gifts` condition read `waiting.length > 0` only; the gifts comment becomes `{/* Gifts for you: they ask to be opened. */}`. `StickerBoard.css`: in the large-screen block, `:is(.gifts-for-you-badge, .pending-gifts-badge)` becomes `.gifts-for-you-badge`, `.board-gifts .pending-gifts-badge` goes, and the 600–699px block that stacks the gifts goes (one badge has nothing to stack). Delete `giving/PendingGiftsNotificationBadge.tsx`, its test and `pending-gifts-badge.css`; delete `giving.pendingGifts` from `giving.ts`. `StickerBoard.test.tsx`'s `pendingGifts` mocks and the counts that read them go.
- [ ] **Step 2: The client.** `apiClient.ts` drops `pendingGifts` and the `PendingGifts` import; `httpApi.ts` its method; `httpApi.test.ts` its `["/api/gifts/pending", "GET"]` row; `api/testing.tsx` its stub.
- [ ] **Step 3: The API**, nothing else reading it (`rg -n "pendingGifts|PendingGifts|gifts/pending" "$W/apps" "$W/packages"` → only these): `routes/gifts.ts`'s `.get("/pending", …)` and import; `packaging.ts`'s `pendingGiftsSchema`, `PendingGifts`, `pendingGifts()` and any import only they used; `client.ts`'s `PendingGifts` export; `requestDiagnostics.ts`'s `"/api/gifts/pending"`; `routes/giving.test.ts`'s `describe("GET /api/gifts/pending")`. In `routes/giftsForYou.test.ts`, "The giver's gifts on their way say who it went to." reads the giver's board instead:

```ts
// The giver's board says who the gift waits for.
const board = await bodyOf(await test.get(giverId, "/api/sticker-boards/me"), stickerBoardSchema);
expect(board.boardStickers.find((s) => s.sticker.id === gift.stickerId)?.openGift).toMatchObject({
  id: gift.id,
  status: "sent",
  for: { id: bobId },
});
```

(use the file's or `stickerBoards.test.ts`'s way of reading `/api/sticker-boards/me` and its schema; if `test.get` is rooted at `/api/gifts`, call the board route the way `stickerBoards.test.ts` does).

- [ ] **Step 4: E2E.** `e2e/giving.e2e.ts`'s badge lines become the detail's, through another sticker's detail and its strip:

```ts
// Sent, it leaves Alice's board; its detail says it's on its way.
await expect(boardSticker(alice, language, no)).toHaveCount(0);
const other = await sealFromBoard(alice, language);
const detail = await openDetail(alice, language, other);
await detail
  .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
  .getByRole("button", { name: no, exact: true })
  .click();
await expect(detail.getByText(say(stickerBoard.detail.onItsWay, language))).toBeVisible();
await detail.getByRole("button", { name: say(ui.backToBoard, language) }).click();
```

(import `ui` from `strings` if the file doesn't).

- [ ] **Step 5:** `pnpm -C "$W/apps/api" exec vitest run src/routes` and `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board src/api src/giving`, both typechecks → PASS. `pnpm -C "$W/apps/frontend" exec knip` (or the repo's knip script) reports nothing new.
- [ ] **Step 6: Commit.** `feat: the board's "On its way" badge and GET /api/gifts/pending go; a gift in flight shows in its sticker's detail and tray spot`

### Task 10: The Mini-game in a phone-width band, the game growing with its stage (decisions 1, 7)

**Files:** listed under Files, Mini-game.

Read the Oct 7 plan's Tasks 8–9: `git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-explore-and-dialogs.md | sed -n '800,1137p'`. Take its live-game parts, changed as below; leave its replay scale (`replayScale`, `REPLAY_FRAME`, the feed's reach: decision 3), its `FULL_SCALE_HEIGHT` shrink (R5) and its `sizeClassOf`.

- [ ] **Step 1: Write the failing tests.**
  - `stageLayout.test.ts`: from the old Task 8 Step 1 keep "sits centered under the frame…" and the two `liveScale` tests "stays at 1 on a phone" and "grows with a regular stage's smaller side, up to its cap" (named "grows with a large screen's stage's smaller share, up to its cap"); add:

```ts
it("is 1 on a stage under a large screen's size either way", () => {
  expect(liveScale(1180, 590)).toBe(1);
  expect(liveScale(590, 1180)).toBe(1);
});

it("draws the live heart as wide as its scale lets it be", () => {
  const [w, h] = [820, 1180];
  expect(liveHeartRest(w, h).width).toBeCloseTo(MAX_HEART_WIDTH * liveScale(w, h));
});
```

- `miniGameEngine.test.ts`: the old Task 9 Step 1's `mountOn` lift and its `describe("on a stage drawn bigger")` (the slid tap, the grown stroke passes).
- `tierBackground.test.ts`: the old Task 9 Step 1's speed lines test.
- `testCombos.ts`'s `session(config = GAME_CONFIG, stage = STAGE)` records on `stage` (`createReplayRecorder({ seed: 42, intensity: 0.7, ...stage })`). `replayFeed.test.ts` (import `liveHeartRest`):

```ts
it("places a tap recorded on an iPad's grown heart where it landed on that heart", () => {
  const ipad = { width: 820, height: 1180 };
  const grown = liveHeartRest(ipad.width, ipad.height);
  const s = session(GAME_CONFIG, ipad);
  s.tap(1000, grown.x + grown.width / 2, grown.y);
  s.end(1100, "closed");
  const [tap] = createReplayFeed(s.finish().replay, RECORDED_HEART).inputs;
  expect(tap?.kind === "touch" && tap.point.x).toBeCloseTo(
    RECORDED_HEART.x + RECORDED_HEART.width / 2,
    0,
  );
});
```

- `GratitudeMiniGame.test.tsx` (`onLargeScreen`, `dragBy` from `../ui/testing`, `DISMISS_PX` from `../ui/useSheetDrag`), reaching the receipt as "says the gratitude is saved on the phone…" does:

```tsx
it("on an iPad closes from a swipe down its receipt's head", async () => {
  onLargeScreen();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  recordGratitude.mockRejectedValue(new TypeError("Failed to fetch"));
  open({ giftId: "g1" });
  tapOnce();
  await play(ONE_TAP_ENDS_MS);
  dragBy(document.querySelector(".gr-receipt .gr-rc-row"), [0, DISMISS_PX * 2]);
  expect(onClose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/gratitude` → FAIL: no `liveScale`, `liveHeartRest`; the slid tap is a drag; the lines have no width; the iPad tap lands at 1.5× the heart's half; no swipe.
- [ ] **Step 3: `stageLayout.ts`.** `heartRest` takes `widest = MAX_HEART_WIDTH` as its fourth parameter (`Math.min(width * HEART_SHARE, widest)`), and:

```ts
/** The live game's stage on the phone it was made for, px: it draws at scale 1 there. */
export const LIVE_STAGE = { width: 390, height: 741 } as const;
/** The most the live game grows on a large screen's stage. */
export const MAX_LIVE_SCALE = 1.5;
/** A stage at least this both ways is a large screen's (ui/largeScreen.ts), px. */
const LARGE_STAGE_MIN = 600;

/**
 * The live game's scale on a `width` × `height` stage: 1 on a phone's; on a large screen's, its
 * smaller share of LIVE_STAGE, from 1 up to MAX_LIVE_SCALE. Read from the stage alone, so a replay
 * finds the heart a combo was recorded on from the stage it recorded.
 */
export function liveScale(width: number, height: number): number {
  if (width < LARGE_STAGE_MIN || height < LARGE_STAGE_MIN) return 1;
  const grown = Math.min(width / LIVE_STAGE.width, height / LIVE_STAGE.height);
  return Math.min(MAX_LIVE_SCALE, Math.max(1, grown));
}

/** The live game's heart at rest, as wide as its scale lets it be. */
export const liveHeartRest = (width: number, height: number) =>
  heartRest(width, height, LIVE_FRAME, MAX_HEART_WIDTH * liveScale(width, height));
```

- [ ] **Step 4: The engine,** as the old Task 9 Steps 3–4 have it (speed lines sized to the stage; `scale`, `heartWidest` and `inputScale` read once from the stage in `mountMiniGameEngine`; the tap slop and the try at stroking scaled by `inputScale`; `--gr-scale` set by the engine; `middleIn` for the giver's picture), with: `LIVE_STAGE_WIDTH` gives way to `LIVE_STAGE` everywhere (`mountGratitudeReplay.ts`'s `scale = width / LIVE_STAGE.width` stays the replay's rule, its `--gr-scale` line going since the engine sets it); `mountReplayEngine` passes `heartWidest: MAX_HEART_WIDTH`; the old step's doc comments that name `replayScale` name the replay's width over `LIVE_STAGE`'s instead. The recorded heart is the live game's: `replayFeed.ts`'s and `mountGratitudeReplay.ts`'s `heartRest(width, height, LIVE_FRAME)` / `heartRest(replay.stage[0], replay.stage[1], LIVE_FRAME)` become `liveHeartRest(…)`.
- [ ] **Step 5: The stylesheet,** as the old Task 9 Step 5 has it (the px lengths at `--gr-scale`, the replay block's four rules going), its "regular width" block becoming, at the file's end:

```css
/* ------------------------------------------------------------------ large screens
   The top band with its X, the HUD and the receipt share one centered phone-width band; the ground,
   the heart and its effects keep the whole stage. The receipt is the shared card (ui/sheet.css). */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .gr:not([data-mode="replay"]) :is(.gr-top, .gr-hud) {
    left: max(0px, calc(50% - 195px));
    right: max(0px, calc(50% - 195px));
  }

  .gr:not([data-mode="replay"]) .gr-receipt,
  .gr:not([data-mode="replay"]) .gr-receipt:is(.has-note, .has-detail) {
    inset: 0;
    width: min(var(--card-w), calc(100% - 48px));
    height: fit-content;
    margin: auto;
  }

  .gr:not([data-mode="replay"]) .gr-receipt .gr-rc-row {
    touch-action: none;
  }
}
```

(`.gr-hud` has its own 20px sides on a phone: keep them inside the band by padding if the HUD's rule sets `left`/`right` to 20px.)

- [ ] **Step 6: The receipt's swipe.** In `GratitudeMiniGame.tsx`: `const large = useLargeScreen(); const drag = useSheetDrag(close);` (`close` as the X's); the receipt takes `style={large ? drag.style : undefined}` and its `.gr-rc-row` `{...(large ? drag.handlers : {})}`.
- [ ] **Step 7:** Step 2's command and typecheck → PASS: happy-dom's sizeless stage is the phone fallback, so the other engine tests see scale 1.
- [ ] **Step 8: Commit.** `feat(frontend): on an iPad the Mini-game grows with its stage inside a phone-width band, and its receipt is a card`

### Task 11: Explore's lifted sticker as a card (decisions 1, 8)

**Files:** `explore/LiftedSticker.tsx`, `lifted-sticker.css`, `LiftedSticker.test.tsx`.

- [ ] **Step 1: Write the failing test.** In `LiftedSticker.test.tsx` (`onLargeScreen`, `dragBy` from `../ui/testing`, `DISMISS_PX` from `../ui/useSheetDrag`; its `afterEach` gains `vi.restoreAllMocks()`), after the `it.each` of ways to put it back:

```tsx
it("on an iPad puts the sticker back at a swipe down the card's head", async () => {
  onLargeScreen();
  lift(1);
  dragBy(document.querySelector(".lifted-sticker__about"), [0, DISMISS_PX * 2]);
  await landed();
  expect(sheet()).toBeNull();
  expect(document.activeElement).toBe(buttonOf(pile[1]?.sticker.id ?? ""));
});
```

- [ ] **Step 2:** run it → FAIL.
- [ ] **Step 3: Implement.** `LiftedSticker.tsx`: `const large = useLargeScreen(); const drag = useSheetDrag(close);`; `.lifted-sticker__sheet` takes `style={large ? drag.style : undefined}`; `.lifted-sticker__about` takes `{...(large ? drag.handlers : {})}`. `lifted-sticker.css`, before its reduced-motion block:

```css
/* On a large screen it's the shared card (ui/sheet.css) in the middle, its carets just outside the
   sticker's square; the flight lands in the card, and Put back flies it home. */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .lifted-sticker__sheet {
    inset: 0;
    width: min(var(--card-w), calc(100% - 2 * var(--gutter-large)));
    height: fit-content;
    max-height: calc(100% - 2 * var(--gutter-large));
    margin: auto;
    padding-block: 20px;
    border-radius: 16px;
  }

  .lifted-sticker__sheet > .perf:not(:focus-visible) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .lifted-sticker__turn--previous {
    left: calc(50% - 105px - 40px);
  }

  .lifted-sticker__turn--next {
    right: calc(50% - 105px - 40px);
  }

  .lifted-sticker__about {
    touch-action: none;
  }
}
```

(105px is half the 210px square; 40px the caret and its gap: starting values.)

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/explore` → PASS.
- [ ] **Step 5: Commit.** `feat(frontend): on an iPad Explore's lifted sticker is a card in the middle`

### Task 12: The seal sheet on a large screen (decision 1; once the seal sheet is on main)

Not on main when this plan was written (R6). Expected shape: one tap on ✓ raises a sheet with the preview, an 18+ switch, Seal and Not yet; at 0:00 its title is "Time's up" and only Seal is left.

**Files:** the seal sheet's component and CSS as landed; its test file.

- [ ] **Step 1: Find it.** `git -C "$W" fetch origin && git -C "$W" rebase origin/main`, then `rg -n -i "sealsheet|seal-sheet|timeIsUp" "$W/apps/frontend/src/sticker-creation"`. Nothing: leave this task unchecked, say so in the hand-off, and go on.
- [ ] **Step 2: Write the failing test** in its test file, with its render: on a large screen at 0:00 neither the scrim nor a swipe down its head closes it, and before 0:00 the swipe does.

```tsx
it("on an iPad closes from a swipe down its head, but not once time's up", () => {
  onLargeScreen();
  // …raise the seal sheet with time left, as the file does…
  dragBy(document.querySelector(".seal-sheet .bottom-sheet__head"), [0, DISMISS_PX * 2]);
  expect(/* the sheet */).toBeNull();
  // …raise it at 0:00…
  dragBy(document.querySelector(".seal-sheet .bottom-sheet__head"), [0, DISMISS_PX * 2]);
  expect(/* the sheet */).not.toBeNull();
});
```

Use its landed class and the file's way of reaching 0:00; the two expectations stand.

- [ ] **Step 3: Implement.** A `Sheet`: `card`, `head` (its preview and title), `busy` while the seal is on its way and at 0:00 (nothing but Seal closes it then). Its own markup: the card's large-screen block as Task 11's, reading `--card-w`, with `useSheetDrag` on its head. Over the drawing screen its scrim dims the tucked tab strip and the sidebar.
- [ ] **Step 4:** its test file → PASS. **Step 5: Commit.** `feat(frontend): on an iPad the seal sheet is a card in the middle`

### Task 13: Words that name no device (every size)

**Files:** listed under Files, Words.

The Oct 7 foundations plan's Task 7 (`git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-foundations.md | sed -n '2099,2160p'`): its steps as written, with these differences from main:

- `stickerBoard.ts`'s `settings.language.notKept` on main reads "…but this phone couldn't keep it: the next time you open Croquis, it may start in the old one for a moment." Its `en` becomes `"Your language is saved, but this device couldn’t keep it: the next time you open Croquis, it may start in the old one for a moment."`; `ja` stays; its comment says "this device couldn't keep it for its next start, over the device's own words for a report".
- `app.ts`'s motion card: `question.en` `"Shake to send gratitude? After you allow it, you’ll be asked once more."`, `ja` `"端末を振って感謝を送りませんか？許可すると、もう一度確認が表示されます。"`; the three comments say "on iPhone and iPad" and "iOS or iPadOS".
- If the seal sheet moved `seal.failed.onThisPhone`, rename it where it landed.
- The glossary row: `| device (a phone or an iPad) | 端末 | "This device" in notes and errors; never the device's name |`.

- [ ] **Step 1–6:** the old task's steps (tests first: `session.test.ts`, `DrawingScreen.test.tsx`, `GratitudeMiniGame.test.tsx` read the catalog; they fail on `onThisDevice`; then the words, the code, the checks). Its Step 5's `checks.js words` gives way to `rg -n -i 'en: ".*\bi?phone' "$W/apps/frontend/src/i18n/strings"` → no match.
- [ ] **Step 7: Commit.** `fix(frontend): words that named the phone or iPhone name no device`

### Task 14: A card can't scroll its host (`overflow: clip`)

**Files:** `sticker-board/StickerBoard.css`, `sticker-creation/DrawingScreen.css`, `app/App.css`.

The Oct 7 foundations plan's Task 5 and its finding (`sed -n '32p;1971,1981p'` of the same `git show`): WebKit under reduced motion scrolls `.board` (`overflow: hidden`, still a scroll container) by 42px to show the key the rising out-of-tickets card focuses, so the scrim ends short of the tabs.

- [ ] **Step 1:** `.board`'s `overflow: hidden;` (StickerBoard.css line 9) becomes `overflow: clip;`, its comment ending "It clips without being a scroll container, so a card focused as it rises from past its foot can't scroll it."; `.drawing-screen`'s likewise ("…so a ticket card focused as it rises can't scroll it."); App.css's desktop frame `.phone`'s `overflow: hidden;` becomes `overflow: clip;`.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board src/sticker-creation` → PASS. Its test is Task 17's "board stays put" WebKit line.
- [ ] **Step 3: Commit.** `fix(frontend): the out-of-tickets card no longer scrolls the board up in WebKit`

### Task 15: The developer slip's Device paper

**Files:** listed under Files, Device paper.

The Oct 7 foundations plan's Task 2 (`sed -n '1125,1611p'` of the same `git show`): its files, tests and code, with the size class giving way to the large-screen query:

- `deviceFactRows(facts, large: boolean)`; its last row `["Large screen", large ? "yes" : "no"]`; `deviceLines` and `formatDeviceDetails` take `large` in place of `sizeClass`. The test's `regular` constant becomes `true`, and its expected last row `["Large screen", "yes"]`.
- `DeviceDetails` reads `useLargeScreen()`. Its test drops `observeSizeClass` and `windowAt`'s frame: `windowAt` spies `innerWidth` and `innerHeight` only, and the first test calls `onLargeScreen()` and expects `row("Large screen")` to be `"yes"` and the copy to contain `"\nLarge screen: yes"`.
- `describeDevice` reads `window.matchMedia(LARGE_SCREEN).matches`; its test expects `"\nLarge screen: "`.
- The paper's comment says "and whether the app takes the large layout"; the slip's DESIGN.md bullet gains "a Device paper with what the device says and Copy" (Task 18).
- The Pencil summary in that plan isn't this task: `2026-10-08-ipad-pencil.md` owns Pencil input.

- [ ] **Steps:** the old task's Steps 1–10, tests first (`deviceFacts.test.ts` fails: no module; `DeviceDetails.test.tsx` fails: no component; the recorder's test fails on its new line). Its `checks.js device` line gives way to Task 17's Device paper screenshot.
- [ ] **Commit.** `feat(frontend): the developer slip's Device paper says what the device says`

### Task 16: End-to-end specs

**Files:** Create `apps/frontend/e2e/dialogs.e2e.ts`.

- [ ] **Step 1: The spec.**

```ts
import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  boardSticker,
  giveFromBoard,
  handleOf,
  openDetail,
  openTheirBoard,
  say,
  sealFromBoard,
  sendInLineChat,
  signIn,
  test,
} from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { giving, stickerBoard, ui } = strings;
const language = "en";
/** tokens.css's --card-w. */
const CARD_W = 400;
/** The detail's column on a large screen: a phone's width. */
const COLUMN_W = 390;

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not on screen");
  return { ...box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
};

/** A card in the middle of the page, as wide as a card. */
async function expectCardInTheMiddle(page: Page, card: Locator) {
  const box = await boxOf(card);
  const view = page.viewportSize();
  expect(box.width).toBeLessThanOrEqual(CARD_W + 0.5);
  expect(Math.abs(box.cx - (view?.width ?? 0) / 2)).toBeLessThanOrEqual(2);
}

/** What a tap at the tab row's lead slot lands on. */
const atTheLead = (page: Page) =>
  page.evaluate(() => {
    const lead = document.querySelector(".tabs-lead")?.getBoundingClientRect();
    if (!lead) return null;
    return (
      document.elementFromPoint(lead.x + lead.width / 2, lead.y + lead.height / 2)?.className ??
      null
    );
  });

test.describe("On an iPad", () => {
  test.use(ipad);

  test("Give from your board is one card in the middle, the sticker at its head, and its X closes it", async ({
    page,
  }) => {
    await signIn(page, "giver", language);
    const no = await sealFromBoard(page, language);
    await giveFromBoard(page, language, no);
    const card = page.getByRole("dialog", { name: say(giving.give, language, { no }) });
    await expectCardInTheMiddle(page, card);
    const sticker = await boxOf(page.locator(".giving__figure"));
    expect(sticker.y + sticker.height).toBeLessThanOrEqual((await boxOf(card)).y);
    await card.getByRole("button", { name: say(giving.close, language), exact: true }).tap();
    await expect(card).toBeHidden();
  });

  test("Give on someone's board opens the picker as a card, its scrim over the tab row's Give", async ({
    page,
    friend,
  }) => {
    const handle = handleOf(await signIn(friend, "artist", language));
    await signIn(page, "visitor", language);
    await sealFromBoard(page, language);
    await openTheirBoard(page, language, handle);
    await page
      .getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true })
      .tap();
    const card = page.getByRole("dialog", {
      name: say(giving.giveSheet.title, language, { name: handle }),
    });
    await expectCardInTheMiddle(page, card);
    expect(await atTheLead(page)).toContain("giving__scrim");
  });

  test("the sticker detail splits sideways, and is one phone-width column upright", async ({
    page,
  }) => {
    await signIn(page, "artist", language);
    const no = await sealFromBoard(page, language);
    const detail = await openDetail(page, language, no);
    const column = detail.locator(".sticker-detail__column");
    const upright = await boxOf(column);
    expect(upright.width).toBeLessThanOrEqual(COLUMN_W + 0.5);
    expect(
      Math.abs(upright.cx - (await boxOf(detail.locator(".sticker-detail__main"))).cx),
    ).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 1180, height: 820 });
    const stage = await boxOf(detail.locator(".sticker-detail__stage"));
    const sideways = await boxOf(column);
    expect(sideways.x).toBeGreaterThanOrEqual(stage.x + stage.width);
    expect(sideways.width).toBeLessThanOrEqual(COLUMN_W + 0.5);
  });
});

test("a sent gift's detail says it's on its way, and Take it out asks before it puts Give back", async ({
  page,
}) => {
  await signIn(page, "giver", language);
  const no = await sealFromBoard(page, language);
  const other = await sealFromBoard(page, language);
  await giveFromBoard(page, language, no);
  await sendInLineChat(page, language, no);
  const detail = await openDetail(page, language, other);
  await detail
    .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
    .getByRole("button", { name: no, exact: true })
    .click();
  await expect(detail.getByText(say(stickerBoard.detail.onItsWay, language))).toBeVisible();
  await detail.getByRole("button", { name: say(giving.inTheBag.takeOut, language) }).click();
  const ask = detail.getByRole("group", {
    name: say(stickerBoard.detail.takeOut.title, language, { no }),
  });
  await expect(
    ask.getByRole("button", { name: say(stickerBoard.detail.takeOut.cancel, language) }),
  ).toBeFocused();
  await ask.getByRole("button", { name: say(giving.inTheBag.takeOut, language) }).click();
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.give, language), exact: true }),
  ).toBeFocused();
  await detail.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
});

test("a sheet over the tabs pads the home indicator", async ({ page }) => {
  await signIn(page, "giver", language);
  const no = await sealFromBoard(page, language);
  // Playwright reports no safe area: an iPhone's stands in.
  await page.evaluate(() => document.documentElement.style.setProperty("--foot-inset", "34px"));
  await giveFromBoard(page, language, no);
  const sheet = page.getByRole("dialog", { name: say(giving.give, language, { no }) });
  // 24px is .bottom-sheet's own foot padding, which a test can't import from CSS.
  expect(await sheet.evaluate((el) => getComputedStyle(el).paddingBottom)).toBe(`${24 + 34}px`);
});
```

- [ ] **Step 2:** `E2E_APP_PORT=5187 E2E_API_PORT=8787 pnpm -C "$W/apps/frontend" exec playwright test e2e/dialogs.e2e.ts e2e/giving.e2e.ts` → PASS. A failure is the layout's or the spec's: fix the one that's wrong, in one batch, and run once more.
- [ ] **Step 3: Commit.** `test(e2e): an iPad's dialogs are cards in the middle, the detail splits sideways, and a gift in flight comes back out`

### Task 17: Check it in WebKit and Chromium

Scratch only: `data/scratch/ipad-dialogs/` (gitignored), untracked `apps/frontend/vite.ipad-dialogs.config.ts`.

- [ ] **Step 1: Servers.** The Vite config as the Shop plan's (`git show 637f4aef:docs/superpowers/plans/2026-10-08-ipad-shop-and-cards.md`, Task 10 Step 1) on 5186, its proxy to 8786. API: `(cd "$W/apps/api" && PORT=8786 DATABASE_URL=data/scratch/ipad-dialogs/dialogs.db IMAGE_DIR=../../data/scratch/ipad-dialogs/images IMAGE_BASE_URL=http://localhost:5186/api/images pnpm dev)`; Vite: `(cd "$W/apps/frontend" && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm exec vite --config vite.ipad-dialogs.config.ts)`, both in the background.
- [ ] **Step 2: Library.** `lib.mjs` from the same `git show`, Task 10 Step 2, unchanged but `SIZES`, which gains `[1180, 820]`. Run with `PW_CORE=/Users/adoll/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core BASE=http://localhost:5186`.
- [ ] **Step 3: Seed.** `seed.mjs` signs in `dlg-alice` and `dlg-bob` (the library's `open`), each seals three stickers (Draw, a stroke, the seal as main seals it then), alice gives bob one from his board (LIFF Mock's picker answers success), and sends one through LINE's picker; bob receives his from the gifts badge and sends gratitude for it. Their numbers go to `seed.json`.
- [ ] **Step 4: `checks.mjs`,** one pass line each (`check(label, ok, measured)`), at every size in both engines, a screenshot per state, contact sheets at the end. Phones (390×844) first: each phone line must match main's (run the same script on a worktree of `origin/main` first and keep its `baseline.json`).
  - **Cards** (give sheet, Giving, Send gratitude, gratitude events, notice, receipt, lifted sticker): width ≤ `--card-w` (+0.5; 480 for gratitude events), centered within 2px, its key inside the viewport; `elementFromPoint` at the tab row's middle is the card's scrim. Phones: across the foot as on main.
  - **Giving:** the figure's foot above the card's top, the gap ≤ 16px; figure and card share a center x within 2px.
  - **Picker:** tiles within 4px of the phone's tile width, four a row; the picked tile no wider than a tile.
  - **Receiving:** header, bag and pull tab share a center x within 2px; torn, the Accept card's top between the bag's middle and its foot. Measure the phone's overlap first and set `--accept-over` to it.
  - **Detail:** sideways, the column right of the stage and ≤ 390.5 wide; scrolling the column to its end leaves the stage's top where it was; upright, the column centered and ≤ 390.5; the figure wider than 216px and at most 324px. In Japanese (`localStorage` `draw.language` = `ja`), the in-flight note and Take it out wrap inside the column (`scrollWidth ≤ clientWidth`).
  - **Replay (decision 3):** the replay stage's width within 2px of the phone's.
  - **Mini-game:** the top band and the HUD inside a centered 390px band; the heart's width within 1px of `232 × liveScale(stage)`.
  - **Lifted sticker:** each caret's inner edge within 16px of the 210px square's edge; Put back's flight ends on the pile's spot (the clone's last box within 4px of it).
  - **Board stays put (Task 14):** WebKit, reduced motion, out of tickets over the board: `.board`'s `scrollTop` is 0 and the scrim reaches the tabs.
  - **Device paper (Task 15):** a screenshot of the slip at 820×1094.
- [ ] **Step 5:** Fix what failed in one batch (`fix(frontend): …`, naming each), run Step 4 once more. WebKit that can't load a `data:` URL is the Mac's: say so and finish in Chromium.
- [ ] **Step 6:** Stop both servers. Keep `shots/` for the hand-off.

### Task 18: The docs

**Files:** `DESIGN.md`, `PRODUCT.md`, `docs/gratitude-mini-game-design-doc.md`.

- [ ] **Step 1: DESIGN.md.**
  - Elevation's **Sheet** bullet: add "On an iPad every sheet the detail, Giving, Receiving, the Mini-game and Explore open is a 400px card in the middle over a scrim that dims the tab row; the scrim, its X, Escape, Back and a swipe down its head close it, and its perforation is left to keyboards and screen readers. One card at a time: a flow's next step replaces its content."
  - **Gifts on the board:** "Opposite your name, top-right, stacked: gifts for you, then gifts on their way." becomes "Opposite your name, top-right: gifts for you."; the **On their way** bullet goes.
  - **Sticker trail**'s **On its way** bullet becomes: "**In flight:** where Give sits, a Liner Lift note with the gift bag's frosted sleeve: "On its way to @bob" once the app knows who it waits for, "On its way" until then; a gift still in the bag shows its open sleeve and "In the bag", with Give still the key. Take it out, a quiet link under the note, takes it back: at once from the bag, and after a confirm in place, as Mark 18+'s, once it's sent. While it runs it reads "Taking it out…"; leaving the detail doesn't stop it; a failure stays under the note with Try again and Dismiss. Once it's out, Give is the key again and has focus."
  - **Sticker tray**'s given spot bullet: "a sticker on its way leaves only paper, since the pending gifts badge holds it" becomes "a sticker on its way waits in its spot under the sleeve's frost, inside its cut line; it never peels, and a tap opens it among your stickers ("No.0147, on its way to @bob. Open it")".
  - The sticker detail (Timelapse or Sticker trail section, wherever the detail's layout is described): "On an iPad wider than tall, the sticker, its carets and its timelapse sit centered on the left and a phone-width column beside them scrolls on its own; upright, one centered phone-width column under the sticker, grown up to 1.5×."
  - **Gratitude:** "In the Mini-game on an iPad, the top band, the HUD and the receipt keep a phone's width in the middle, and the game grows with its stage up to 1.5×."
  - Giving, wherever its sheet's lines are described: drop "Pick your chat…", "It comes off your board…" and the picker's lead.
  - Graphite's "(the clear film of gifts on their way)" goes.
  - The developer slip bullet gains the Device paper.
  - Layout, the sheets' foot padding: "and 24px at the foot" becomes "and 24px at the foot, over the home indicator's safe area where a sheet reaches the screen's foot".
- [ ] **Step 2: PRODUCT.md:** "Until it's sent, you can take the sticker back out." becomes "Until it's received, you can take the sticker back out, from Giving or its sticker detail."
- [ ] **Step 3: The Mini-game doc:** its scale paragraph says the live game draws at 1 on a phone and, on a large screen, at its stage's smaller share of 390×741 up to 1.5× (`liveScale`, `stageLayout.ts`), its touch rules with it and its shake thresholds not; a replay maps a recorded combo by the heart the live game drew (`liveHeartRest`).
- [ ] **Step 4:** `pnpm -C "$W" exec oxfmt DESIGN.md PRODUCT.md docs/gratitude-mini-game-design-doc.md`; commit `docs: DESIGN.md and PRODUCT.md describe the iPad's dialogs and gifts in flight`.

### Task 19: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm -C "$W" check` → lint, typecheck, tests, format and the Move tests pass.
- [ ] **Step 2:** Squash onto `origin/main`, no AI attribution lines: `feat(frontend): the iPad's dialogs as cards, the sticker detail's panes and the Mini-game's band`, `feat: gifts in flight in their sticker's detail and tray spot; the board's badge and GET /api/gifts/pending go`, `fix(frontend): device-neutral words, sheets over the home indicator, cards that can't scroll their host, the Device paper`, `test(e2e): …`, `docs: …`.
- [ ] **Step 3:** `git -C "$W" fetch origin && git -C "$W" rebase origin/main`, the changed files' tests once more; then in the main checkout, in one command: `git -C "$R" fetch origin && git -C "$R" merge --ff-only origin/main && git -C "$R" merge-base --is-ancestor main feat/ipad-dialogs && git -C "$R" merge --ff-only feat/ipad-dialogs && git -C "$R" push origin main`.
- [ ] **Step 4:** Remove the worktree and branch; `git rm` this plan and the brief on main in a `docs:` commit by pathspec (the design brief keeps its row until the last iPad plan purges it).
- [ ] **Step 5:** Hand ad0ll the contact sheets, and what only a real iPad shows: the swipe's feel on a card's head; the frost's blur in LINE's browser; the Mini-game's growth by hand.

## Open

1. **Layout calls to confirm on the captures:** a packed gift's act slot runs note, Take it out, then Give (the brief puts the link under the note and keeps Give the key); `--accept-over` (Task 4) is measured from the phone, not designed.
2. **No swipe on Giving's sent step** (R2): it has no head; its Back to board, the scrim, Escape and Back close it.
3. **The take-out confirm's words** are new (answer 1): "Take No.0147 out?", Cancel, and Giving's "Take it out" as its key, with no line on what the friend's Gift Message then says.
4. **The seal sheet** (Task 12) waits for its own work on main; the drawing plan's seal chip steps (`2026-10-08-ipad-drawing.md` Step 3 of its large layout task) become moot once the sheet replaces the chip.
