# iPad: LINE's Sheet, Safari and the Finish Implementation Plan

> **On hold (2026-10-08):** being reworked with its spec; don't build from it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Croquis holds together in LINE's phone-size sheet on an iPad and offers a way out to the full-screen layout in the browser; the sign-in gates stay usable above the on-screen keyboard; every surface passes a check at LINE's sheet sizes and in Safari; a real iPad settles what only it can; and the iPad work is finished: critique, polish, audit, durable docs, and its plans, spec and scratch purged.

**Architecture:** `line/lineSheet.ts` says whether the app is in LINE's sheet on an iPad: inside LINE, on an Apple phone or tablet, with a screen whose shorter side reaches `IPAD_MIN_SCREEN_SIDE`, in a compact frame. Then your sticker board's header band shows `FullScreenInBrowser` in its top-right corner, unless gift badges hold it; the link opens the app's own root through `openAppInBrowser()` (`line/openLink.ts`, `liff.openWindow` with `external: true`). The three sign-in gates stand on one `GatePaper` (`line/GateParts.tsx`) that scrolls and pads by what the on-screen keyboard hides (`ui/visibleArea.ts`). The rest is verification and the finish.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS, the i18n catalog, LIFF, Playwright (WebKit and Chromium) scripts kept outside the repo, the impeccable skill.

---

## Decisions (awaiting ad0ll's sign-off)

Each is the spec's recommendation with the values this plan picks. Every number is a starting value.

**Spec 1. Two places, one design.** Inside LINE on an iPad the app is compact and short; in Safari on an iPad it's regular; the frame's size decides, never `getOS()` or the user agent. Nothing to build beyond the foundations plan's size classes: Task 5's check list holds every surface to it, Settings' Drawing group (decision 19) included.

**Spec 2. A way out of LINE's sheet: option (a), the link.**

- **When:** `useInLineSheetOnIpad()`, the spec's four conditions: inside LINE (`liff.isInClient()`, read through `useIdentity().inClient`), an Apple device (`isAppleMobile()`, exported from `ui/motionPermission.ts`), a compact frame, and a screen whose shorter side is at least `IPAD_MIN_SCREEN_SIDE` (700).
- **Where:** the top-right corner of your sticker board's header band, opposite your name, where the gift badges sit; gift badges take the corner first, since giving is the product. It shows once the gifts have answered, so it never flashes before a badge. The board plan's header band takes its width from the panel and the tray's room beside it, never from what its corner holds; in LINE's sheet that's the board's full width, so the link needs no room made for it. While the corner holds either, your name isn't roomy. Controls never scale, so the link keeps its size on any panel.
- **What:** a quiet link, DESIGN.md's way out (Graphite, no stock, 46px to touch): Phosphor's arrow-square-out at 16px and "Full screen in the browser" / 「ブラウザで全画面表示」 at 13px, centered on the name's 48px row. In a narrow band it wraps onto two lines (`max-width: calc(38% - 34px)`) rather than run under your name.
- **The tap:** `liff.openWindow({ url: "<origin>/", external: true })` opens the iPad's default browser, Safari unless the person chose another. Only the app's root goes, never the page's path, query or hash, which can carry a Gift Claim Token or LIFF's parameters. If LINE refuses, an error line under the link says "The browser didn't open.", with LINE's words and Try again.
- **In the browser next:** the app opens on LineGate's "Your sticker board" with Log in with LINE. That tap starts LINE Login, which LINE for iPad may answer at once, or LINE shows its email or QR screen; after one login, a LINE single sign-on session makes the next one a tap. The friend picker opens there only with that single sign-on session, as a popup or a tab, and LINE may ask for its email login first. LINE's ID token lasts an hour in a browser, so a seal or Give after that asks for LINE Login again (Privy's sign-in lapses with it). Nothing to build: LineGate, `reconnectLine` and the picker already behave this way.
- **It ships before the device session,** since it shows only in the case it's for; Task 7 confirms the sheet and the detection, or takes it out.

**The sign-in gates at short heights** (the spec's Plans table; no decision number). The LINE gate, the sign-in gate and the handle prompt stand on one `GatePaper`. It centers what it holds; when that's taller than what shows, it starts at the top and scrolls. It pads by what the on-screen keyboard hides (the visual viewport), and brings the focused field's form into view as the keyboard comes or goes. The maker print stays put while the paper scrolls.

**Spec section 5. The device session.** After this plan's first deploy, ad0ll runs one session on an iPad, in LINE and in Safari: the spec's nine checks; decision 19's three (Light, Normal and Firm with a real Pencil, a Pencil (USB-C) whose pressure doesn't change, and Try it); and four this plan adds (the keyboard over a field, the link's way to the browser, a window drag mid-drawing, LINE's header menu). Results go into the tunable constants: the size classes (`REGULAR_MIN_WIDTH` 700, `REGULAR_MIN_HEIGHT` 600, `SHORT_BELOW_HEIGHT` 700), `--content-w` (520px), the drawing screen and Pencil plan's palm threshold and Light and Firm responses, and `IPAD_MIN_SCREEN_SIDE`.

**Spec section 8. The finish.** `/impeccable critique` at compact and at regular, their fixes in one batch, `/impeccable polish`, then `/impeccable audit` and its fixes. Each plan has already updated the DESIGN.md and PRODUCT.md sentences its own work made false, this one included (the link, in Task 3). The finish adds the size-class overview and the regular compositions to DESIGN.md's Layout once ad0ll approves the text, names the iPad in PRODUCT.md's Platform, and fixes anything still left. Once merged, it deletes the spec, every iPad plan, the review doc and `~/.cache/drawing-app-ipad`.

## Depends on

Every other iPad plan, merged to main: `2026-10-07-ipad-foundations.md`, `2026-10-07-ipad-drawing-sheet.md`, `2026-10-07-ipad-drawing-screen-and-pencil.md`, `2026-10-07-ipad-board.md` and `2026-10-07-ipad-explore-and-dialogs.md`. By the spec's section 6 names, this plan reads:

- `apps/frontend/src/app/sizeClass.ts`: `useSizeClass()` (Task 1); `REGULAR_MIN_WIDTH`, `REGULAR_MIN_HEIGHT`, `SHORT_BELOW_HEIGHT` (Task 7); `data-width` and `data-height` on `.phone`, and `?layout=` (Task 5).
- `--content-w` in `apps/frontend/src/styles/tokens.css` (Tasks 5 and 7).
- `apps/frontend/src/sticker-board/boardPanel.ts` (`panelFor`, `trayBesidePanel`, `REFERENCE_BOARD` 390×651), the header band as the board plan left it (decision 10: along the panel and the tray beside it, the board's full width in LINE's sheet), and the cork back's turn box of at least 360px (decision 12) (Tasks 3 and 5).
- `apps/frontend/src/sticker-creation/canvas/sheetFrame.ts` and `apps/frontend/src/ui/screenAxes.ts` (Task 5's rotation checks, Task 9's docs).
- The developer slip's Device paper and the performance recorder's Pencil summary (Task 7).
- The drawing screen and Pencil plan's palm threshold (`PALM_CONTACT_PX` in `sticker-creation/canvas/gestures.ts`), pen pressure responses (`PRESSURE_EXPONENTS` in `canvas/brush.ts`), and Settings' Drawing group: Drawing hand, Pencil only, Pen pressure and Try it (decisions 6, 7 and 19) (Tasks 5, 7 and 9).

## Files

- Create `apps/frontend/src/line/lineSheet.ts` and `lineSheet.test.ts`: `IPAD_MIN_SCREEN_SIDE`, `insideLineOnIpad`, `useInLineSheetOnIpad`
- Modify `apps/frontend/src/ui/motionPermission.ts`: export `isAppleMobile` (the foundations plan already moved the stray comment back over `iosMotionPrompt`)
- Modify `apps/frontend/src/line/openLink.ts`: `openAppInBrowser`
- Modify `apps/frontend/src/i18n/strings/stickerBoard.ts`: `board.fullScreen`
- Create `apps/frontend/src/sticker-board/FullScreenInBrowser.tsx` and `FullScreenInBrowser.test.tsx`
- Modify `apps/frontend/src/sticker-board/StickerBoard.tsx`, `StickerBoard.css`, `StickerBoard.test.tsx`, and DESIGN.md's Board header (this plan's own sentence, in its own merge)
- Create `apps/frontend/src/ui/visibleArea.ts` and `visibleArea.test.tsx`
- Modify `apps/frontend/src/line/GateParts.tsx` (`GatePaper`), `LineGate.tsx`, `LineGate.css`; `apps/frontend/src/api/SessionGate.tsx`, `HandlePrompt.tsx`, `HandlePrompt.css`
- Modify from the device session: `apps/frontend/src/app/sizeClass.ts`, `apps/frontend/src/styles/tokens.css`, `apps/frontend/src/sticker-creation/canvas/gestures.ts` (`PALM_CONTACT_PX`), `canvas/brush.ts` (`PRESSURE_EXPONENTS`), `apps/frontend/src/line/lineSheet.ts`
- Modify, in the finish: `DESIGN.md` (Layout's overview, anything still left), `PRODUCT.md` (Platform), `AGENTS.md` (Architecture)
- Create, then delete at the end: `docs/review/<date>-ipad-finish.md`. Delete `docs/superpowers/plans/2026-10-07-ipad-*.md`, `docs/superpowers/specs/2026-10-07-ipad-layout-design.md` and `~/.cache/drawing-app-ipad`

Scratch (scripts, screenshots, the device session's notes) goes in `~/.cache/drawing-app-ipad/line-sheet/`, never in the repo. Tests run with `TZ=Asia/Tokyo`: two on main (`GiftReceivedNotice.test.tsx`, `StickerDetail.test.tsx`) fail in other time zones.

## Setup

- [ ] **Step 1: Check the other plans are in.** `R` is the main checkout (`git rev-parse --show-toplevel` from the session's directory). `git -C "$R" fetch && git -C "$R" ls-tree -r --name-only origin/main | rg "app/sizeClass.ts|boardPanel.ts|canvas/sheetFrame.ts|ui/screenAxes.ts"` → all four paths. `git -C "$R" grep -c -F -e "- [ ]" origin/main -- docs/superpowers/plans/` → no iPad plan but this one has open boxes (every plan ticks its boxes as it merges, and every plan and the spec stay on main until this plan's finish). `(cd "$R" && gh pr list --state open)` → nothing touching the board header, the gates or `line/` (Favio and Aakash merge too). Anything else: stop and tell the coordinator.
- [ ] **Step 2: Worktree.** `W="$R/.claude/worktrees/ipad-line-sheet"`: `git -C "$R" worktree add -b feat/ipad-line-sheet "$W" origin/main`, then `pnpm -C "$W" install`. Below, use `git -C "$W"`, `pnpm -C "$W/..."` or a subshell, never a bare `cd`.

Main moves: every edit below names its file and symbol. Where a sibling plan reshaped the code around a symbol, apply the change to the symbol as it is now.

### Task 1: Inside LINE on an iPad

**Files:** Create `apps/frontend/src/line/lineSheet.ts`, `apps/frontend/src/line/lineSheet.test.ts`; modify `apps/frontend/src/ui/motionPermission.ts` (`isAppleMobile`)

- [ ] **Step 1: Export `isAppleMobile`.** The foundations plan's Task 7 already gave `isAppleMobile` and `iosMotionPrompt` each their own comment. In `motionPermission.ts`, `const isAppleMobile = () =>` becomes `export const isAppleMobile = () =>`; nothing else in the file changes.

- [ ] **Step 2: Write the failing test**, `apps/frontend/src/line/lineSheet.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { IPAD_MIN_SCREEN_SIDE, insideLineOnIpad } from "./lineSheet";

/** A screen whose shorter side is `side`, held each way up. */
const eachWayUp = (side: number) => [
  { width: side, height: side * 2 },
  { width: side * 2, height: side },
];

describe("insideLineOnIpad", () => {
  it("takes an iPad's screen either way up, and only inside LINE on Apple's own devices", () => {
    const inLine = (screen: { width: number; height: number }) =>
      insideLineOnIpad({ inClient: true, appleMobile: true, screen });
    for (const screen of eachWayUp(IPAD_MIN_SCREEN_SIDE)) {
      expect(inLine(screen)).toBe(true);
      // A browser on the same iPad.
      expect(insideLineOnIpad({ inClient: false, appleMobile: true, screen })).toBe(false);
      // LINE on another make of tablet, or LIFF Mock on a desktop.
      expect(insideLineOnIpad({ inClient: true, appleMobile: false, screen })).toBe(false);
    }
    for (const screen of eachWayUp(IPAD_MIN_SCREEN_SIDE - 1)) expect(inLine(screen)).toBe(false);
  });
});
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/line/lineSheet.test.ts` → fails: `./lineSheet` doesn't exist.
- [ ] **Step 4: Implement** `apps/frontend/src/line/lineSheet.ts`:

```ts
import { useState } from "react";
import { useSizeClass } from "../app/sizeClass";
import { useIdentity } from "../identity/useIdentity";
import { isAppleMobile } from "../ui/motionPermission";

/**
 * The shorter side of an iPad's screen is at least this, and a phone's never reaches it. The screen
 * stays the device's inside LINE's sheet, so it tells an iPad from a phone there.
 */
export const IPAD_MIN_SCREEN_SIDE = 700;

/** What tells LINE on an iPad apart, so a test can stand in for the device. */
interface Device {
  /** Inside the LINE app: `liff.isInClient()`. */
  inClient: boolean;
  /** Apple's phones and tablets, iPadOS's Mac-like user agent included. */
  appleMobile: boolean;
  screen: { width: number; height: number };
}

/** Inside LINE on an iPad. */
export const insideLineOnIpad = ({ inClient, appleMobile, screen }: Device) =>
  inClient && appleMobile && Math.min(screen.width, screen.height) >= IPAD_MIN_SCREEN_SIDE;

/**
 * Whether the app is in LINE's phone-size sheet on an iPad: inside LINE on an iPad, in a compact
 * frame. A regular frame there would mean LINE gave the app the whole screen.
 */
export function useInLineSheetOnIpad(): boolean {
  const { inClient } = useIdentity();
  const frame = useSizeClass();
  // The device doesn't change, and turning it only swaps the screen's sides.
  const [onIpad] = useState(() =>
    insideLineOnIpad({ inClient, appleMobile: isAppleMobile(), screen: window.screen }),
  );
  return onIpad && frame.width === "compact";
}
```

- [ ] **Step 5:** Run the test → passes. `pnpm -C "$W/apps/frontend" typecheck` → passes.
- [ ] **Step 6: Commit** (`git -C "$W" add` the three files): `feat(frontend): tell LINE's sheet on an iPad from a phone`

### Task 2: Full screen in the browser

**Files:** Modify `apps/frontend/src/i18n/strings/stickerBoard.ts` (the `board` group), `apps/frontend/src/line/openLink.ts`; create `apps/frontend/src/sticker-board/FullScreenInBrowser.tsx`, `apps/frontend/src/sticker-board/FullScreenInBrowser.test.tsx`

- [ ] **Step 1: Strings.** At the end of `stickerBoard.board`, after `unsaved_other`:

```ts
    /** The way out of LINE's phone-size sheet on an iPad, to Croquis full screen in the iPad's browser. */
    fullScreen: {
      /** Your sticker board, inside LINE on an iPad: the quiet link in the header band's top-right corner, opposite your name, that opens Croquis full screen in the iPad's browser */
      link: { en: "Full screen in the browser", ja: "ブラウザで<wbr/>全画面表示" },
      /** Your sticker board, inside LINE on an iPad: the alert under Full screen in the browser when LINE didn't open the browser, before Try again and LINE's words for a report */
      didntOpen: { en: "The browser didn’t open.", ja: "ブラウザがひらきませんでした。" },
    },
```

- [ ] **Step 2: `openAppInBrowser`**, after `openLinkInLine` in `apps/frontend/src/line/openLink.ts`:

```ts
/**
 * Opens the app in the device's browser, outside LINE: Safari, unless the person chose another. Only
 * the app's root goes, never this page's path, query or hash, which can carry a gift's token or LIFF's
 * parameters. Throws LINE's error when LINE won't open it.
 */
export function openAppInBrowser() {
  liff.openWindow({ url: new URL("/", location.href).href, external: true });
}
```

- [ ] **Step 3: Write the failing test**, `apps/frontend/src/sticker-board/FullScreenInBrowser.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../i18n/strings/stickerBoard";
import { FullScreenInBrowser } from "./FullScreenInBrowser";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const liff = vi.hoisted(() => ({
  openWindow: vi.fn<(params: { url: string; external?: boolean }) => void>(),
}));
vi.mock("@line/liff", () => ({ default: liff }));

let unmount = () => {};
afterEach(() => {
  unmount();
  liff.openWindow.mockReset();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

function show() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<FullScreenInBrowser />));
  unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  const press = (selector: string) =>
    act(() => host.querySelector<HTMLButtonElement>(selector)?.click());
  return { host, press };
}

describe("FullScreenInBrowser", () => {
  it("opens the app's root in the browser, leaving the page's path, query and hash behind", () => {
    history.replaceState(null, "", "/g/claim-token?liff.state=x#access_token=y");
    show().press(".label-btn--quiet");
    expect(liff.openWindow).toHaveBeenCalledExactlyOnceWith({
      url: `${location.origin}/`,
      external: true,
    });
  });

  it("says the browser didn't open, with LINE's words, and Try again asks LINE again", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    liff.openWindow.mockImplementationOnce(() => {
      throw Object.assign(new Error("not allowed here"), { code: "FORBIDDEN" });
    });
    const { host, press } = show();
    press(".label-btn--quiet");
    const alert = () => host.querySelector('[role="alert"]');
    expect(alert()?.textContent).toContain(stickerBoard.board.fullScreen.didntOpen.en);
    expect(host.textContent).toContain("FORBIDDEN: not allowed here");

    press('[role="alert"] .label-btn--quiet');
    expect(liff.openWindow).toHaveBeenCalledTimes(2);
    expect(alert()).toBeNull();
  });
});
```

- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/FullScreenInBrowser.test.tsx` → fails: `./FullScreenInBrowser` doesn't exist.
- [ ] **Step 5: Implement** `apps/frontend/src/sticker-board/FullScreenInBrowser.tsx` (its place in the header band is styled with the board's, in Task 3):

```tsx
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import { ArrowSquareOut } from "../icons";
import { describeLiffError } from "../line/liff";
import { openAppInBrowser } from "../line/openLink";
import { ErrorLine } from "../ui/ErrorLine";
import { QuietLink } from "../ui/QuietLink";

/**
 * The board's way out of LINE's phone-size sheet on an iPad: a quiet link that opens Croquis full
 * screen in the iPad's browser, where LINE Login signs you in. A refusal stays under it, with
 * LINE's words.
 */
export function FullScreenInBrowser() {
  const { t } = useTranslation();
  /** LINE's own words for why the browser didn't open. */
  const [refusal, setRefusal] = useState<string | null>(null);
  const open = () => {
    setRefusal(null);
    try {
      openAppInBrowser();
    } catch (error) {
      console.error("LINE didn't open Croquis in the browser", error);
      setRefusal(describeLiffError(error));
    }
  };
  return (
    <div className="board-full-screen">
      <QuietLink onClick={open}>
        <ArrowSquareOut size={16} aria-hidden />
        <span className="board-full-screen__words keep-phrases">
          {t(($) => $.stickerBoard.board.fullScreen.link)}
        </span>
      </QuietLink>
      {refusal !== null && (
        <ErrorLine detail={refusal} onRetry={open}>
          {t(($) => $.stickerBoard.board.fullScreen.didntOpen)}
        </ErrorLine>
      )}
    </div>
  );
}
```

- [ ] **Step 6:** Run the test → passes. `pnpm -C "$W/apps/frontend" typecheck` → passes.
- [ ] **Step 7: Commit** the four files: `feat(frontend): Full screen in the browser, the way out of LINE's sheet on an iPad`

### Task 3: The header band's corner

**Files:** Modify `apps/frontend/src/sticker-board/StickerBoard.tsx` (`StickerBoard`: the name button and the gift badges' block in the header band), `apps/frontend/src/sticker-board/StickerBoard.css` (the rules that place `.board-gifts`), `apps/frontend/src/sticker-board/StickerBoard.test.tsx`, `DESIGN.md` (Board header)

UI edit: read `~/.claude/skills/impeccable/reference/craft-floor.md` first, and work through `/impeccable adapt` as the lens (the header band in LINE's sheet on an iPad and on phones) without changing anything outside this task.

The board plan's header band (decision 10) runs along the top of the panel and the tray beside it, and takes the board's full width where that's too narrow for the name and the gift badges (LINE's sheet). Controls never scale: the link sits in the band's top-right corner, as the gift badges do, never inside the scaled panel.

- [ ] **Step 1: Write the failing test.** With the file's other `vi.mock` calls:

```tsx
// Inside LINE's sheet on an iPad only where a test says so.
const lineSheet = vi.hoisted(() => ({ onIpad: false }));
vi.mock("../line/lineSheet", () => ({ useInLineSheetOnIpad: () => lineSheet.onIpad }));
```

`gift` joins the `../api/testFixtures` import. Then:

```tsx
describe("StickerBoard inside LINE's sheet on an iPad", () => {
  afterEach(() => {
    lineSheet.onIpad = false;
  });

  it("offers full screen in the browser opposite your name, and gives that corner to gift badges", async () => {
    lineSheet.onIpad = true;
    const open = (api: ApiClient) => {
      const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
      unmount = view.unmount;
      return view.host;
    };
    const quiet = open(emptyApi());
    await act(async () => {});
    expect(quiet.querySelector(".board-full-screen")?.textContent).toBe(
      stickerBoard.board.fullScreen.link.en,
    );
    expect(quiet.querySelector(".board-who")?.classList.contains("is-roomy")).toBe(false);
    await act(() => vi.dynamicImportSettled());
    unmount();

    const gifted = sticker();
    const waiting = { gift: gift({ stickerId: gifted.id }), giver: people.mika, sticker: gifted };
    const withGift = open(emptyApi({ giftsForYou: () => Promise.resolve({ gifts: [waiting] }) }));
    await act(async () => {});
    expect(withGift.querySelector(".board-gifts")).not.toBeNull();
    expect(withGift.querySelector(".board-full-screen")).toBeNull();
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/StickerBoard.test.tsx` → the new test fails: no `.board-full-screen`.
- [ ] **Step 3: Implement** in `StickerBoard.tsx`. Imports: `FullScreenInBrowser` from `./FullScreenInBrowser`, `useInLineSheetOnIpad` from `../line/lineSheet`. With the other hooks, after `const optedIn = useMyNsfwOptIn();`:

```tsx
/** In LINE's phone-size sheet on an iPad, where the board offers full screen in the browser. */
const offersFullScreen = useInLineSheetOnIpad();
```

After `onTheirWay` is computed:

```tsx
const hasGifts = waiting.length > 0 || onTheirWay.length > 0;
// The corner waits until the gifts have answered, so the link never shows only to give way to a badge.
const giftsAnswered = forYou.state !== "loading" && pending.state !== "loading";
```

The name button's class, and the corner beside the gift badges' block in the band:

```tsx
      <button
        ref={nameButton}
        // Its width is its own until the corner opposite holds gift badges or the way to the browser.
        className={`board-who ${hasGifts || offersFullScreen ? "" : "is-roomy"}`}
```

```tsx
{
  hasGifts && (
    <div className="board-gifts">
      {/* Gifts for you first: they ask to be opened, where gifts on their way only report. */}
      <GiftsForYouBadge gifts={waiting} onOpen={onOpenGift} nudging={idle} />
      <PendingGiftsNotificationBadge gifts={onTheirWay} onOpen={openYours} />
    </div>
  );
}
{
  /* LINE's sheet on an iPad is phone-sized: the corner offers the browser's full screen, unless gift badges hold it. */
}
{
  offersFullScreen && giftsAnswered && !hasGifts && <FullScreenInBrowser />;
}
```

The board plan's header band takes its width from the panel and the tray's room (`bandOver` in `boardPanel.ts`), never from what its corner holds, so nothing there changes.

- [ ] **Step 4: Styles.** In `StickerBoard.css`, `.board-full-screen` joins every rule that places `.board-gifts` in the band (after the board plan, the one below, its `right` measured from the band's right edge through `--band-x` and `--band-w`), and gets its own rules. Its `max-width` and the name's add up to the band less its gutters: the board plan gives the name `calc(var(--band-w, 100%) * 0.62)`; if that share has changed by now, change this to match.

```css
/* Gift badges, gifts for you then gifts on their way, sit in the header band opposite your name,
   above the sticker tray's pull. With none, inside LINE's sheet on an iPad, the way to the browser's
   full screen sits there. */
.board-gifts,
.board-full-screen {
  position: absolute;
  z-index: 800;
  right: calc(100% - var(--band-x, 0px) - var(--band-w, 100%) + 12px);
  top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

/* A quiet link centered on the name's 48px row. The name keeps 62% of the band, so in a narrow band
   the link wraps onto two lines rather than run under it. */
.board-full-screen {
  justify-content: center;
  min-height: 48px;
  max-width: calc(var(--band-w, 100%) * 0.38 - 34px);
}

.board-full-screen .label-btn--quiet {
  max-width: 100%;
  gap: 6px;
  font-size: 13px;
  text-align: right;
}

.board-full-screen__words {
  min-width: 0;
  white-space: normal;
}

.board-full-screen > .error-line {
  width: min(300px, calc(100vw - 28px));
  box-shadow: var(--shadow-label);
}
```

- [ ] **Step 5: DESIGN.md**, this plan's own sentence in its own merge. Board header gains: "Inside LINE's sheet on an iPad, while no gift badge holds the corner opposite your name, a quiet link there, Full screen in the browser with Phosphor's arrow-square-out, opens Croquis in the iPad's browser; in a narrow band it wraps onto two lines rather than run under your name."
- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/StickerBoard.test.tsx src/sticker-board/FullScreenInBrowser.test.tsx src/line/lineSheet.test.ts` → pass. `pnpm -C "$W/apps/frontend" typecheck` and `pnpm -C "$W/apps/frontend" lint` → pass.
- [ ] **Step 7: Commit** the four files: `feat(frontend): your board offers full screen in the browser inside LINE on an iPad`

### Task 4: The sign-in gates scroll and stay above the keyboard

**Files:** Create `apps/frontend/src/ui/visibleArea.ts`, `apps/frontend/src/ui/visibleArea.test.tsx`; modify `apps/frontend/src/line/GateParts.tsx`, `apps/frontend/src/line/LineGate.tsx` (`LineGate`), `apps/frontend/src/line/LineGate.css` (`.line-gate`, `.line-gate::before`), `apps/frontend/src/api/SessionGate.tsx` (`SessionGate`), `apps/frontend/src/api/HandlePrompt.tsx` (`HandlePrompt`), `apps/frontend/src/api/HandlePrompt.css`

UI edit: read the craft floor first, and work through `/impeccable adapt` as the lens (the gates at LINE's sheet sizes, in Safari landscape, keyboard up).

- [ ] **Step 1: Write the failing test**, `apps/frontend/src/ui/visibleArea.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisibleArea, type VisibleArea } from "./visibleArea";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A visual viewport that fills the page until a test moves it, as iOS's does for the keyboard. */
const viewport = () =>
  Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, scale: 1 });
type Viewport = ReturnType<typeof viewport>;

function Paper({ area }: { area: VisibleArea }) {
  const paper = useRef<HTMLElement>(null);
  useVisibleArea(paper, area);
  return (
    <main ref={paper}>
      <form>
        <input aria-label="Handle" />
      </form>
    </main>
  );
}

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

function show(area: Viewport) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Paper area={area} />));
  unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  const paper = host.querySelector("main");
  return {
    hidden: () => ({
      top: paper?.style.getPropertyValue("--hidden-top"),
      bottom: paper?.style.getPropertyValue("--hidden-bottom"),
    }),
    input: host.querySelector("input"),
    form: host.querySelector("form"),
  };
}

const move = (area: Viewport, to: Partial<Viewport>, type = "resize") =>
  act(() => {
    Object.assign(area, to);
    area.dispatchEvent(new Event(type));
  });

describe("useVisibleArea", () => {
  it("pads by what the keyboard hides, above and below, and by nothing while zoomed", () => {
    const area = viewport();
    const { hidden } = show(area);
    expect(hidden()).toEqual({ top: "0px", bottom: "0px" });
    const keyboard = Math.round(innerHeight / 2);
    move(area, { height: innerHeight - keyboard });
    expect(hidden()).toEqual({ top: "0px", bottom: `${keyboard}px` });
    // iOS slid the page up to show a field: the slide is hidden above, the rest of the keyboard below.
    const slide = Math.round(keyboard / 2);
    move(area, { offsetTop: slide }, "scroll");
    expect(hidden()).toEqual({ top: `${slide}px`, bottom: `${keyboard - slide}px` });
    move(area, { scale: 2 });
    expect(hidden()).toEqual({ top: "0px", bottom: "0px" });
  });

  it("brings the focused field's form into view as the keyboard comes up", () => {
    const area = viewport();
    const { input, form } = show(area);
    const shown = vi.spyOn(Element.prototype, "scrollIntoView");
    act(() => input?.focus());
    move(area, { height: innerHeight / 2 });
    expect(shown.mock.contexts).toEqual([form]);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/ui/visibleArea.test.tsx` → fails: `./visibleArea` doesn't exist.
- [ ] **Step 3: Implement** `apps/frontend/src/ui/visibleArea.ts`:

```ts
import { useLayoutEffect, type RefObject } from "react";

/** A scale this close to 1 is no zoom. */
const UNZOOMED = 0.01;

/** The visual viewport, as this reads it, so a test can stand in for the browser's. */
export interface VisibleArea extends Pick<EventTarget, "addEventListener" | "removeEventListener"> {
  readonly height: number;
  readonly offsetTop: number;
  readonly scale: number;
}

/**
 * Keeps `paper`'s content in what the on-screen keyboard leaves visible. iOS's keyboard shrinks only
 * the visual viewport, and may slide the page up to show a field, so this sets `--hidden-top` and
 * `--hidden-bottom` on `paper` for its padding, and brings the focused field's form into view as the
 * keyboard comes or goes. A zoomed page pads by nothing: zoom, not a keyboard, shrank what shows.
 */
export function useVisibleArea(
  paper: RefObject<HTMLElement | null>,
  area: VisibleArea | null = window.visualViewport,
) {
  useLayoutEffect(() => {
    const el = paper.current;
    if (!el || !area) return;
    const follow = (event?: Event) => {
      const zoomed = Math.abs(area.scale - 1) > UNZOOMED;
      const top = zoomed ? 0 : Math.max(0, Math.round(area.offsetTop));
      const bottom = zoomed
        ? 0
        : Math.max(0, Math.round(window.innerHeight - area.offsetTop - area.height));
      el.style.setProperty("--hidden-top", `${top}px`);
      el.style.setProperty("--hidden-bottom", `${bottom}px`);
      // Only as the keyboard comes or goes: scrolling on a slide's scroll events would fight iOS's own.
      if (event?.type !== "resize") return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== el && el.contains(focused)) {
        (focused.closest("form") ?? focused).scrollIntoView({ block: "nearest" });
      }
    };
    follow();
    area.addEventListener("resize", follow);
    area.addEventListener("scroll", follow);
    return () => {
      area.removeEventListener("resize", follow);
      area.removeEventListener("scroll", follow);
    };
  }, [paper, area]);
}
```

- [ ] **Step 4:** Run the test → passes.
- [ ] **Step 5: `GatePaper`.** In `apps/frontend/src/line/GateParts.tsx`, the React import gains `type ComponentPropsWithoutRef`, `useVisibleArea` comes from `../ui/visibleArea`, and before `GateOpening`:

```tsx
/**
 * The bare paper every gate stands on. It scrolls when what's on it is taller than what shows, and
 * keeps it where the on-screen keyboard leaves it visible.
 */
export function GatePaper({ className, children, ...rest }: ComponentPropsWithoutRef<"main">) {
  const paper = useRef<HTMLElement>(null);
  useVisibleArea(paper);
  return (
    <main ref={paper} className={["line-gate", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </main>
  );
}
```

- [ ] **Step 6: The three gates stand on it.** `LineGate` (`GatePaper` joins the `./GateParts` import): `<main className="line-gate" aria-busy={line.status === "loading"}>` becomes `<GatePaper aria-busy={line.status === "loading"}>`, and its `</main>` becomes `</GatePaper>`. `SessionGate` (`GatePaper` joins the `../line/GateParts` import): `<main className="line-gate" aria-busy={state.step !== "failed"}>` becomes `<GatePaper aria-busy={state.step !== "failed"}>`, and `</main>` becomes `</GatePaper>`. `HandlePrompt` (imports `GatePaper` from `../line/GateParts`): `<main className="line-gate handle-prompt">` becomes `<GatePaper className="handle-prompt">`, and `</main>` becomes `</GatePaper>`.
- [ ] **Step 7: Styles.** In `LineGate.css`, `.line-gate` and `.line-gate::before` become:

```css
.line-gate {
  position: fixed;
  inset: 0;
  isolation: isolate;
  display: grid;
  place-content: center;
  /* Taller than what shows, it starts at the top and scrolls, rather than losing both ends. */
  align-content: safe center;
  justify-items: center;
  gap: 12px;
  /* What the on-screen keyboard hides pads the paper, so it centers in what's left (visibleArea.ts). */
  padding: calc(32px + var(--hidden-top, 0px)) 24px calc(32px + var(--hidden-bottom, 0px));
  scroll-padding: var(--hidden-top, 0px) 0 var(--hidden-bottom, 0px);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--liner-grain), var(--liner);
  text-align: center;
}

/* The maker print, barely there, as on the board; fixed, so it stays put while the paper scrolls. */
.line-gate::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--liner-print);
  opacity: 0.55;
  pointer-events: none;
}
```

In `HandlePrompt.css`, the `.handle-prompt__form` comment ends at "past the screen." (the gate scrolls now):

```css
/* One track that can shrink, so a long handle in the key or the field never widens the form past the
   screen. */
```

- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/ui/visibleArea.test.tsx src/line/LineGate.test.tsx src/api/SessionGate.test.tsx` → pass. Typecheck and lint the frontend → pass.
- [ ] **Step 9: Commit** the eight files: `feat(frontend): the sign-in gates scroll, and keep a field above the on-screen keyboard`

### Task 5: Every surface at LINE's sheet sizes and in Safari

Decision 1's expectations, as the check list this task runs in WebKit and Chromium. LINE's sheet is 540×620 or 580×640, each also with a 56px header off the height (540×564, 580×584), since whether the sheet has a header is unknown; its context carries an iPad's screen. Safari is 744×1133, 820×1180, 1180×820 and 1376×1032, plus 1133×690, an iPad mini's Safari in landscape, regular and short. Phones stay as baselines: 390×844, and 375×591, an iPhone SE inside LINE, which is compact and short too.

**Every surface, every size:**

- **U1** Nothing needed is cut off: every control and line is on screen or reachable by scrolling its own container, and the page never scrolls sideways.
- **U2** Every control keeps 44px to touch, keys 54px tall (by eye, against DESIGN.md's sizes).
- **U3** One key per screen; a dialog over a screen is its own screen.
- **U4** No text renders under 11px, counting every scale on its ancestors. Only sticker geometry scales (decisions 10 and 12), so there's no exception: text under 11px is a bug to fix.
- **U5** Regular: no key, block label or sheet wider than `--content-w`, except the full-screen compositions (drawing screen, board, Explore's pile, Mini-game).
- **U6** 390×844 matches the pre-iPad captures (`~/.cache/drawing-app-ipad/screens/captures/*-390x844.png`, while they exist) except listed bug fixes. 375×591 is short, so its short-height fixes count as bug fixes too (decision 3).
- **U7** Both languages fit: Japanese and English at every LINE size and at 1180×820.
- **U8** Turning 820×1180 to 1180×820 mid-drawing, mid-drag on the board and mid-scroll in Explore moves, hides and drops nothing, and keeps Explore's place.

**Per surface:**

| Surface                         | LINE's sheet (compact, short)                                                                                                                                                                                                                                                                                                                                       | Safari (regular)                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in gates                   | Centered; taller than what shows, starts at the top and scrolls; with the keyboard stand-in, the handle field, its error line and its key sit above it                                                                                                                                                                                                              | The same, a centered column                                                                                                                                                                                                                                                                                                                                                                              |
| Your board                      | The panel fits, top-aligned and centered, with the tray beside it where it fits; only the stickers' geometry scales; the header band takes the board's full width; name, corner (gift badges or Full screen in the browser) and Draw with its tickets at their own sizes, clear of each other and of the zipper's pull; no sticker under the band, Draw or the tabs | Panel scaled by `panelFor`, top-aligned and centered together with the tray beside it; the band along the panel and the tray; header, Draw and badges at their own sizes; no Full screen in the browser                                                                                                                                                                                                  |
| A selected sticker              | Frame, handles, toolbar and hint at their own sizes; toolbar row on one line, clear of Draw and the band, and it may reach over the tray's strip; step tiles 44px; the first-selection hint finds room or waits                                                                                                                                                     | The same, beside the scaled sticker                                                                                                                                                                                                                                                                                                                                                                      |
| Sticker tray                    | Opens beside the panel where `trayBesidePanel` says (the panel may give up a little scale), otherwise over it; the stack fits the mouth; dates at 11px or more; a pulled sheet floats inside the board                                                                                                                                                              | Opens beside the panel, like a facing page; the stack grows up to 1.5×; the spread takes more columns                                                                                                                                                                                                                                                                                                    |
| Cork back                       | Turns over in a box at least 360px wide; the papers at their phone sizes, centered on cork; Settings, the Sui address and Flip back reachable by scrolling; the developer slip pulls out                                                                                                                                                                            | The box is the panel; the papers at their phone sizes, centered; the turn's perspective follows the box's width                                                                                                                                                                                                                                                                                          |
| Settings' Drawing group         | Under Language and 18+ stickers: Drawing hand always; once a pen has drawn here, Pencil only and Pen pressure (Off, Light, Normal, Firm in one segment row) and Try it's strip, which draws the chosen response in Ink and fades, keeping nothing; one fine-print line says they're kept on this device; rows 44px to touch; a phone shows only Drawing hand        | The same card at its phone size on the cork; works by touch, pen and keyboard                                                                                                                                                                                                                                                                                                                            |
| Sticker detail                  | Sticker, fine print and Give in view; the Transfer Trail by scrolling; the replay's heart and lettering inside its stage                                                                                                                                                                                                                                            | A centered column at `--content-w`; the sticker grows; the replay scales by width and height                                                                                                                                                                                                                                                                                                             |
| Someone else's board            | Explore chip beside the name; Give in Draw's slot; the give sheet's picker fits                                                                                                                                                                                                                                                                                     | The same on the panel; the give sheet at `--content-w`, centered across the screen's foot, never a card in the middle                                                                                                                                                                                                                                                                                    |
| Giving                          | The sheet within the height, its body scrolling, its key in view; Can't find them fits                                                                                                                                                                                                                                                                              | A phone's page in a centered column, its sheet at `--content-w` at the page's foot (the Explore and dialogs plan's), never a card in the middle                                                                                                                                                                                                                                                          |
| Receiving                       | Bag, pull tab and the Accept sheet don't overlap; the Send gratitude sheet and the gift-received notice fit                                                                                                                                                                                                                                                         | A phone's page in a centered column, with no empty half-screen band; the Accept sheet at `--content-w` at the page's foot                                                                                                                                                                                                                                                                                |
| Gratitude Mini-game             | Pop-in words and slams inside the stage; the HUD on one row; the receipt fits                                                                                                                                                                                                                                                                                       | Lettering scales with the stage; the HUD and receipt capped                                                                                                                                                                                                                                                                                                                                              |
| Explore                         | The pile at its 1.5× cap; a whole day's heap by scrolling; search, switch and rows fit                                                                                                                                                                                                                                                                              | The pile capped and centered; This week beside it where it fits; the lifted sticker a centered card                                                                                                                                                                                                                                                                                                      |
| Shop and checkout               | The Shop's title shows over the checkout, or the card scrolls with Pay and Not now in view                                                                                                                                                                                                                                                                          | Hero and shelves at `--content-w`; the fourth swatch peeks                                                                                                                                                                                                                                                                                                                                               |
| Ticket cards, sealed card       | Across the foot as on phones, fitting the height, the last-ticket card included; the board doesn't shift; the scrim covers the tab strip                                                                                                                                                                                                                            | Ticket cards centered on the screen at `--content-w`; the sealed card at `--content-w` over the foot; keys at their own width                                                                                                                                                                                                                                                                            |
| Drawing screen                  | Today's layout with the short-height pass: the size rail fits; the color sheet leaves canvas to draw on; tools, undo, redo and the seal check in reach; the 18+ pill clear of the check; Left mirrors it                                                                                                                                                            | The edge opposite the drawing hand holds the size rail, undo, redo and the seal check, clear of the corner; the tool strip at the top on the drawing hand's side, the timer opposite; Left mirrors the whole screen; at 1133×690 the rail shortens and the column starts under the top row; the color sheet a popover from its tile; the sheet centered and scaled; Pencil only shows after a pen stroke |
| Seal ceremony                   | The cut and its label inside the screen                                                                                                                                                                                                                                                                                                                             | The cut at the sheet's scale; a turn mid-wait lays it out again                                                                                                                                                                                                                                                                                                                                          |
| Motion card, toast, error lines | Device-neutral words; they fit                                                                                                                                                                                                                                                                                                                                      | The motion card at `--content-w` above the tab strip; the toast centered                                                                                                                                                                                                                                                                                                                                 |
| Tabs                            | Equal thirds; the grabber clear of the home indicator                                                                                                                                                                                                                                                                                                               | Centered at their cap                                                                                                                                                                                                                                                                                                                                                                                    |

- [ ] **Step 1: Dev server**, on 5196 and 8796 (the research server may hold 5190 and 8790, other sessions 5173 and 8788, and the other iPad plans 5191–5195 until they're done), on a database of its own; never the research worktree's. If `~/.cache/drawing-app-ipad/data/` holds a database copy, reuse it and its images folder; otherwise start empty and Step 3 seeds the people:

```sh
W="$R/.claude/worktrees/ipad-line-sheet"
mkdir -p "$W/data" ~/.cache/drawing-app-ipad/line-sheet
ls ~/.cache/drawing-app-ipad/data/
# Only if it lists a copy: sqlite3 <that .db> ".backup '$W/data/line-sheet.db'" and
# /bin/cp -Rf <its images folder> "$W/data/line-sheet-images"
```

Run the API in the background: `(cd "$W/apps/api" && PORT=8796 DATABASE_URL=data/line-sheet.db IMAGE_DIR=../../data/line-sheet-images IMAGE_BASE_URL=http://localhost:5196/api/images pnpm dev)`. Write the untracked `apps/frontend/vite.line-sheet.config.ts`:

```ts
// Untracked, never committed: the LINE sheet plan's dev server on 5196, its API on 8796.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5196,
      strictPort: true,
      proxy: { "/api": { target: "http://127.0.0.1:8796" } },
    },
  }),
);
```

and run Vite in the background: `(cd "$W/apps/frontend" && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm exec vite --config vite.line-sheet.config.ts)`. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5196/` → `200`.

- [ ] **Step 2: Scripts.** `/bin/cp -f ~/.cache/drawing-app-ipad/scripts/captures/{pass1,pass2,seal,minigame,give2}.js ~/.cache/drawing-app-ipad/line-sheet/`, then write `~/.cache/drawing-app-ipad/line-sheet/lib.js` (the captures lane's, with this plan's sizes, engine, language, motion and rules; the copied scripts take indexes into `VIEWPORTS`):

```js
// Scratch for the LINE sheet plan: signed-in WebKit or Chromium contexts at each size, and the rules
// (U1, U3, U4, U5) every capture is checked against. Adapted from the iPad captures lane's lib.js.
const fs = require("fs");
const path = require("path");
const { webkit, chromium } = require(
  path.join(process.env.HOME, ".npm/_npx/86170c4cd1c5da32/node_modules/playwright-core"),
);

const BASE = "http://localhost:5196";
const ENGINE = process.env.ENGINE || "webkit";
const LANGUAGE = process.env.LANGUAGE || "en";
// Reduced motion by default: WebKit's screenshots draw no 3D, so the board's back would show mirrored.
const MOTION = process.env.MOTION === "on";
const DIR = path.join(process.env.HOME, ".cache/drawing-app-ipad/line-sheet");
const OUT = path.join(DIR, "shots");
const LOG = path.join(DIR, "run.log");
fs.mkdirSync(OUT, { recursive: true });

const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_UA = IPAD_UA.replace("iPad; CPU OS", "iPhone; CPU iPhone OS");
/** An iPad Air's screen, which LINE's sheet sits on: the screen stays the device's. */
const IPAD_SCREEN = { width: 820, height: 1180 };

const VIEWPORTS = [
  { w: 540, h: 620, screen: IPAD_SCREEN },
  { w: 540, h: 564, screen: IPAD_SCREEN },
  { w: 580, h: 640, screen: IPAD_SCREEN },
  { w: 580, h: 584, screen: IPAD_SCREEN },
  { w: 744, h: 1133, regular: true },
  { w: 820, h: 1180, regular: true },
  { w: 1180, h: 820, regular: true },
  { w: 1376, h: 1032, regular: true },
  { w: 390, h: 844, phone: true },
  { w: 375, h: 591, phone: true },
  // An iPad mini's Safari in landscape, regular and short; its height under Safari's toolbar is a guess.
  { w: 1133, h: 690, regular: true },
];

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
  fs.appendFileSync(LOG, line + "\n");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** WebKit drops the API's Secure cookie on http://localhost, so the sign-in goes from Node. */
async function sessionCookie(name, language) {
  const profile = { sub: `dev-${name}`, name: name.charAt(0).toUpperCase() + name.slice(1) };
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken: "drawing-app-dev-id-token:" + JSON.stringify(profile),
      language,
    }),
  });
  if (!res.ok)
    throw new Error(`POST /api/session for ${name} answered ${res.status}: ${await res.text()}`);
  return res.headers.getSetCookie().map((c) => {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    };
  });
}

/** A context at `vp`, signed in as `name` when given. */
async function openContext({
  name,
  vp,
  reducedMotion = "reduce",
  engine = ENGINE,
  language = LANGUAGE,
}) {
  const browser = await (engine === "webkit" ? webkit : chromium).launch();
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    screen: vp.screen ?? { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.phone ? 3 : 2,
    isMobile: true,
    hasTouch: true,
    userAgent: vp.phone ? IPHONE_UA : IPAD_UA,
    locale: language === "ja" ? "ja-JP" : "en-US",
    timezoneId: "Asia/Tokyo",
    reducedMotion: MOTION ? "no-preference" : reducedMotion,
  });
  if (language === "ja")
    await context.addInitScript(() => localStorage.setItem("draw.language", "ja"));
  if (engine === "webkit") {
    // WebKit's own HTTPS fails when launched from here, so outside hosts go through Node.
    await context.route(/^https:\/\//, async (r) => {
      try {
        await r.fulfill({ response: await r.fetch() });
      } catch (e) {
        log("route fetch failed", r.request().url(), String(e));
        await r.abort();
      }
    });
  }
  if (name) await context.addCookies(await sessionCookie(name, language));
  const page = await context.newPage();
  page.on("pageerror", (e) => log(`[${name} pageerror]`, String(e).slice(0, 400)));
  return { browser, context, page };
}

const goto = (page, name, hash = "") =>
  page.goto(`${BASE}/?as=${name}${hash}`, { waitUntil: "domcontentloaded" });

/** What the page sees, for the log: its size, the screen and the size class's marks. */
const env = (page) =>
  page.evaluate(() => {
    const phone = document.querySelector(".phone");
    return {
      inner: `${innerWidth}x${innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      sizeClass: `${phone?.dataset.width}/${phone?.dataset.height}`,
    };
  });

/** U1, U3, U4 and, in regular frames, U5, as problems in words. */
function checkLayout(page, vp) {
  return page.evaluate((regular) => {
    const problems = [];
    const root = document.scrollingElement;
    if (root.scrollWidth > innerWidth + 1)
      problems.push(`U1 scrolls sideways: ${root.scrollWidth}px`);
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        !el.closest("[inert], [hidden], [aria-hidden='true']") &&
        getComputedStyle(el).visibility !== "hidden"
      );
    };
    const layers = [...document.querySelectorAll("[role='dialog'], [role='alertdialog']")].filter(
      shown,
    );
    const top = layers.at(-1);
    const keys = [...document.querySelectorAll(".key")].filter(
      (k) => shown(k) && (!top || top.contains(k)),
    );
    if (keys.length > 1) problems.push(`U3 ${keys.length} keys on one screen`);
    const scaleOf = (el) => {
      let s = 1;
      for (let a = el; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.transform !== "none") {
          const m = new DOMMatrixReadOnly(cs.transform);
          s *= Math.hypot(m.a, m.b);
        }
        if (cs.scale && cs.scale !== "none") s *= parseFloat(cs.scale);
      }
      return s;
    };
    const small = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent.trim() || !shown(el) || el.closest(".visually-hidden")) continue;
      const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
      if (px < 10.95)
        small.add(
          `${el.getAttribute("class") || el.tagName} ${px.toFixed(1)}px "${n.textContent.trim().slice(0, 24)}"`,
        );
    }
    for (const s of small) problems.push(`U4 under 11px: ${s}`);
    if (regular) {
      const cap = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--content-w"),
      );
      for (const el of document.querySelectorAll(".key, .label-btn--block, .bottom-sheet")) {
        const w = el.getBoundingClientRect().width;
        if (shown(el) && w > cap + 1)
          problems.push(`U5 ${el.getAttribute("class")} ${Math.round(w)}px wide`);
      }
    }
    return problems;
  }, Boolean(vp.regular));
}

/** A screenshot named for the surface, size, engine and language, after checking its rules. */
async function shot(page, surface, vp) {
  const tag = `${surface}-${vp.w}x${vp.h}-${ENGINE}-${LANGUAGE}`;
  const problems = await checkLayout(page, vp);
  for (const p of problems) log(`RULE ${tag}: ${p}`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  log("captured", tag, problems.length ? `(${problems.length} rule problems)` : "");
  return problems;
}

async function stroke(page, box, points, steps = 6) {
  await page.mouse.move(box.x + points[0][0], box.y + points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps });
  await page.mouse.up();
}

module.exports = {
  BASE,
  ENGINE,
  LANGUAGE,
  OUT,
  IPAD_SCREEN,
  VIEWPORTS,
  log,
  sessionCookie,
  openContext,
  goto,
  env,
  checkLayout,
  shot,
  sleep,
  stroke,
};
```

`gates.js`:

```js
// Scratch for the LINE sheet plan: the sign-in gates at every size, with a stand-in for iOS's keyboard.
// Usage: ENGINE=webkit|chromium LANGUAGE=en|ja node gates.js
const L = require("./lib");

/** The keyboard stand-in's share of the height: an unverified guess near a docked iPad keyboard in landscape. */
const KEYBOARD_SHARE = 0.55;

/** iOS's keyboard as the page sees it: the visual viewport loses its foot, and says so. */
const raiseKeyboard = (page, px) =>
  page.evaluate((px) => {
    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      get: () => innerHeight - px,
    });
    visualViewport.dispatchEvent(new Event("resize"));
  }, px);

/** Where the gate's parts sit, and how far down the screen shows. */
const parts = (page) =>
  page.evaluate(() => {
    const gate = document.querySelector(".line-gate");
    const box = (sel) => {
      const r = gate.querySelector(sel)?.getBoundingClientRect();
      return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null;
    };
    return {
      title: box("h1"),
      field: box("input"),
      problem: box(".error-line"),
      key: box(".key"),
      shows: Math.round(visualViewport.offsetTop + visualViewport.height),
    };
  });

const json = (status, body) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const STATES = {
  // LIFF Mock's module never arrives, so LINE doesn't start, with the import's failure as its reason.
  async lineDidntStart(page) {
    await page.route(/liff-mock/, (r) => r.abort());
    await page.goto(`${L.BASE}/?as=lsp-gate`);
    await page.locator(".line-gate h1").waitFor();
  },
  // The server refuses sign-in with a long reason: the sign-in gate's failure and its details.
  async signInFailed(page) {
    const detail = "The database is being migrated and can't take sign-ins right now. "
      .repeat(8)
      .trim();
    await page.route(/\/api\/(session|me)(\?|$)/, (r) =>
      r.fulfill(json(503, { error: "unavailable", detail })),
    );
    await page.goto(`${L.BASE}/?as=lsp-gate`);
    await page.locator(".line-gate h1").waitFor();
  },
  // A LINE name with "@" can't be a handle, so the app asks for one, and a taken one shows the error line.
  async handlePrompt(page) {
    await page.route(/\/api\/me\/handle(\?|$)/, (r) =>
      r.fulfill(json(409, { error: "handle_taken", detail: "Someone else has @lsp" })),
    );
    await page.goto(`${L.BASE}/?as=lsp%40hp`);
    const field = page.locator(".handle-prompt input");
    await field.fill("lsp");
    await field.press("Enter");
    await page.locator(".handle-prompt .error-line").waitFor();
  },
};

(async () => {
  const failures = [];
  for (const vp of L.VIEWPORTS) {
    for (const [state, reach] of Object.entries(STATES)) {
      const { browser, page } = await L.openContext({ vp });
      const at = `${state} ${vp.w}x${vp.h} ${L.ENGINE} ${L.LANGUAGE}`;
      try {
        await reach(page);
        await L.sleep(500);
        failures.push(...(await L.shot(page, `gate-${state}`, vp)).map((p) => `${at}: ${p}`));
        if ((await parts(page)).title.top < 0) failures.push(`${at}: the title is cut off`);
        await page.evaluate(() => {
          const gate = document.querySelector(".line-gate");
          gate.scrollTop = gate.scrollHeight;
        });
        const end = await parts(page);
        for (const name of ["field", "problem", "key"])
          if (end[name] && end[name].bottom > vp.h)
            failures.push(`${at}: ${name} never scrolls into view`);
        if (state === "handlePrompt") {
          await page.evaluate(() => (document.querySelector(".line-gate").scrollTop = 0));
          await page.locator(".handle-prompt input").focus();
          await raiseKeyboard(page, Math.round(vp.h * KEYBOARD_SHARE));
          await L.sleep(300);
          const p = await parts(page);
          if (p.field.top < 0 || p.problem.bottom > p.shows || p.key.bottom > p.shows)
            failures.push(`${at}: the keyboard covers the form ${JSON.stringify(p)}`);
          await L.shot(page, `gate-${state}-keyboard`, vp);
        }
      } catch (e) {
        failures.push(`${at}: ${String(e).split("\n")[0]}`);
      } finally {
        await browser.close();
      }
    }
  }
  L.log(failures.length ? `GATES FAILED\n${failures.join("\n")}` : "GATES OK");
  process.exitCode = failures.length ? 1 : 0;
})();
```

`link.js`:

```js
// Scratch for the LINE sheet plan: Full screen in the browser on your board, where it shows and where it sits.
// Usage: ENGINE=webkit|chromium LANGUAGE=en|ja node link.js
const L = require("./lib");

// lsp-carol has no gift waiting, so the corner is the link's wherever it shows.
const NAME = "lsp-carol";
/** LINE in a narrow iPad window, where its sheet spans the window. */
const NARROW = { w: 375, h: 667, screen: L.IPAD_SCREEN };
const overlap = (a, b) =>
  a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

(async () => {
  const failures = [];
  for (const vp of [...L.VIEWPORTS, NARROW]) {
    // LIFF Mock says inside LINE, so the link shows exactly where an iPad's screen meets a compact frame.
    const shows = Boolean(vp.screen);
    const at = `${vp.w}x${vp.h} ${L.ENGINE} ${L.LANGUAGE}`;
    const { browser, page } = await L.openContext({ name: NAME, vp });
    try {
      await L.goto(page, NAME);
      await page.locator(".board-draw .key").waitFor({ timeout: 45000 });
      await L.sleep(1500);
      const link = page.locator(".board-full-screen .label-btn--quiet");
      if ((await link.count()) !== (shows ? 1 : 0))
        failures.push(`${at}: the link ${shows ? "is missing" : "shows"}`);
      if (shows) {
        const r = await page.evaluate(() => {
          const box = (sel) => document.querySelector(sel)?.getBoundingClientRect().toJSON();
          return {
            who: box(".board-who"),
            corner: box(".board-full-screen"),
            link: box(".board-full-screen .label-btn--quiet"),
            board: box(".board"),
            pull: box(".zip__tab--front"),
          };
        });
        if (overlap(r.who, r.corner)) failures.push(`${at}: the link runs under your name`);
        if (overlap(r.pull, r.corner)) failures.push(`${at}: the link covers the zipper's pull`);
        if (r.link.height + 14 < 44) failures.push(`${at}: the link is under 44px to touch`);
        if (r.corner.left < r.board.left || r.corner.right > r.board.right)
          failures.push(`${at}: the link leaves the board`);
        failures.push(...(await L.shot(page, "board-link", vp)).map((p) => `${at}: ${p}`));
        await link.tap();
        await L.sleep(500);
        if (await page.locator(".board-full-screen .error-line").count())
          failures.push(`${at}: the tap raised an error line`);
      }
    } catch (e) {
      failures.push(`${at}: ${String(e).split("\n")[0]}`);
    } finally {
      await browser.close();
    }
  }
  L.log(failures.length ? `LINK FAILED\n${failures.join("\n")}` : "LINK OK");
  process.exitCode = failures.length ? 1 : 0;
})();
```

`rotate.js` (U8) and `pen.js` (Chromium's pen):

```js
// Scratch for the LINE sheet plan: turning 820x1180 to 1180x820 mid-drawing, mid-drag and mid-scroll.
// Usage: ENGINE=webkit|chromium node rotate.js. Compare each before and after shot by eye.
const L = require("./lib");
const UP = { w: 820, h: 1180, regular: true };
const TURNED = { w: 1180, h: 820, regular: true };
const turn = (page) => page.setViewportSize({ width: TURNED.w, height: TURNED.h });
const run = async (name, test) => {
  const { browser, page } = await L.openContext({ name, vp: UP });
  await test(page, name).catch((e) => L.log(`ROTATE ${name} FAILED: ${String(e).split("\n")[0]}`));
  await browser.close();
};

(async () => {
  // Mid-drawing: a stroke across the whole sheet, turned, then sealed; the sticker keeps all of it.
  await run(`lsp-rotate-${L.ENGINE}`, async (page, name) => {
    await page.goto(`${L.BASE}/draw?as=${name}`);
    const sheet = page.locator(".ink-canvas");
    await sheet.waitFor({ timeout: 45000 });
    const b = await sheet.boundingBox();
    await L.stroke(page, b, [
      [6, b.height * 0.2],
      [b.width / 2, b.height * 0.8],
      [b.width - 6, b.height * 0.2],
    ]);
    await L.shot(page, "rotate-drawing-before", UP);
    await turn(page);
    await L.sleep(800);
    await L.shot(page, "rotate-drawing-after", TURNED);
    // The seal check breathes once armed, so it takes taps at its measured centre (webkit-testing).
    const check = await page.getByRole("button", { name: /^Seal/ }).boundingBox();
    for (let i = 0; i < 2; i++) {
      await page.touchscreen.tap(check.x + check.width / 2, check.y + check.height / 2);
      await L.sleep(700);
    }
    await page.getByRole("heading", { name: "Sealed" }).waitFor({ timeout: 60000 });
    await L.shot(page, "rotate-drawing-sealed", TURNED);
  });
  // Mid-drag on the board: half a drag, the turn, the rest of it; the sticker lands under the pointer.
  await run("lsp-alice", async (page, name) => {
    await L.goto(page, name);
    const s = page.locator(".placed-sticker").first();
    await s.waitFor({ timeout: 45000 });
    const b = await s.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 8 });
    await turn(page);
    await L.sleep(500);
    await page.mouse.move(TURNED.w / 2, TURNED.h / 2, { steps: 8 });
    await page.mouse.up();
    await L.sleep(800);
    await L.shot(page, "rotate-board-drag", TURNED);
  });
  // Mid-scroll in Explore: the day at the top of the view stays at the top.
  await run("lsp-alice", async (page, name) => {
    await page.goto(`${L.BASE}/explore?as=${name}`);
    await page
      .getByRole("button", { name: /^No\.\d+ by @/ })
      .first()
      .waitFor({ timeout: 45000 });
    await page.evaluate(() => document.querySelector(".explore").scrollBy(0, 900));
    await L.sleep(800);
    await L.shot(page, "rotate-explore-before", UP);
    await turn(page);
    await L.sleep(1200);
    await L.shot(page, "rotate-explore-after", TURNED);
  });
})();
```

```js
// Scratch for the LINE sheet plan, Chromium only: a CDP pen hovers over the sheet, draws harder as it
// goes, then tries Settings' Drawing group. Usage: node pen.js <width>x<height> (default 1180x820).
const L = require("./lib");
(async () => {
  const [w, h] = (process.argv[2] || "1180x820").split("x").map(Number);
  const vp = L.VIEWPORTS.find((v) => v.w === w && v.h === h) ?? { w, h, regular: true };
  const name = `lsp-pen-${w}`;
  const { browser, page } = await L.openContext({
    name,
    vp,
    engine: "chromium",
    reducedMotion: "no-preference",
  });
  const cdp = await page.context().newCDPSession(page);
  /** A pen stroke across `box`, pressing harder as it goes; buttons 0 is a hover. */
  const pen = (box, type, x, y, buttons) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x: box.x + x,
      y: box.y + y,
      pointerType: "pen",
      button: buttons ? "left" : "none",
      buttons,
      clickCount: 1,
      force: Math.min(1, 0.1 + x / box.width),
      tiltX: 20,
      tiltY: 10,
    });
  const stroke = async (box) => {
    await pen(box, "mousePressed", 10, box.height / 2, 1);
    for (let i = 1; i <= 24; i++)
      await pen(
        box,
        "mouseMoved",
        10 + (i * (box.width - 20)) / 24,
        box.height / 2 + (i % 2) * 6,
        1,
      );
    await pen(box, "mouseReleased", box.width - 10, box.height / 2, 0);
  };
  await page.goto(`${L.BASE}/draw?as=${name}`);
  const sheet = await page.locator(".ink-canvas").boundingBox();
  await pen(sheet, "mouseMoved", 200, 200, 0);
  await L.shot(page, "pen-hover", vp);
  await stroke(sheet);
  await L.sleep(400);
  await L.shot(page, "pen-stroke", vp);
  // A pen has drawn on this device, so the Drawing group shows Pencil only, Pen pressure and Try it.
  await L.goto(page, name);
  await page.getByRole("button", { name: /: your stats$/ }).click();
  await page.getByText("Try it").first().scrollIntoViewIfNeeded();
  await L.sleep(800);
  await L.shot(page, "drawing-group", vp);
  // Try it's strip: the drawing plan's canvas under its label.
  const strip = await page.locator(".try-pen__ink").boundingBox();
  await stroke(strip);
  await L.shot(page, "drawing-group-try-it", vp);
  await L.sleep(6000);
  await L.shot(page, "drawing-group-try-it-faded", vp);
  await browser.close();
})();
```

- [ ] **Step 3: Seed the people** (skip what a reused copy already holds). The copied scripts name the research's people; rename them, then fix any selector the iPad plans changed:

```sh
S=~/.cache/drawing-app-ipad/line-sheet
(cd "$S" && sed -i '' -e 's/ipad-alice/lsp-alice/g; s/ipad-bob/lsp-bob/g; s/Ipad-alice/Lsp-alice/g; s/Ipad-bob/Lsp-bob/g' pass1.js pass2.js seal.js minigame.js give2.js)
ENGINE=chromium node "$S/seal.js" lsp-alice 8,8,8 --no-capture
ENGINE=chromium node "$S/seal.js" lsp-bob 8,8 --no-capture
ENGINE=chromium node "$S/seal.js" lsp-carol 8 --no-capture
```

`seal.js` logs each sticker's number. In `give2.js`, `minigame.js` and `pass2.js`, the research's No.0005 becomes lsp-bob's first sticker. Then `ENGINE=chromium node "$S/give2.js"` (bob gives it to alice from her board, through LIFF Mock's picker) and `ENGINE=chromium node "$S/minigame.js" real 8` (alice receives it and sends gratitude, so it has a Transfer Trail and a replay). Point `give2.js` at bob's second sticker and run it again, so a gift waits for alice. Her three seals spent the day's tickets, so her Draw raises the out-of-tickets card until midnight JST; lsp-carol has no gift waiting.

- [ ] **Step 4: Gates and link.** In `$S`, run `gates.js` and `link.js` four times: `ENGINE=webkit LANGUAGE=en`, `ENGINE=webkit LANGUAGE=ja`, `ENGINE=chromium LANGUAGE=en`, `ENGINE=chromium LANGUAGE=ja`. Expected: `GATES OK` and `LINK OK`, exit 0. Look at `shots/board-link-*` and `shots/gate-*-keyboard-*`.
- [ ] **Step 5: The matrix**, in both engines (`for e in webkit chromium; do … done` over these):

```sh
ENGINE=$e node pass1.js 0,1,2,3,4,5,6,7,8,9,10
ENGINE=$e node pass2.js 0,1,2,3,4,5,6,7,8,9,10
ENGINE=$e node minigame.js demo 0,1,2,3,6,8
ENGINE=$e node seal.js lsp-$e-1 0,1,2
ENGINE=$e node seal.js lsp-$e-2 3,4,5
ENGINE=$e node seal.js lsp-$e-3 6,7,8
ENGINE=$e node seal.js lsp-$e-4 9,10
ENGINE=$e node rotate.js
```

Then: Japanese at LINE's sizes and 1180×820 in WebKit (`LANGUAGE=ja ENGINE=webkit node pass1.js 0,1,2,3,6`, the same for `pass2.js` and `minigame.js demo 0,6`); Chromium's pen and the Drawing group at 540×620, 580×584 and 1180×820 (`node pen.js 540x620`, and so on); the drawing screen with Drawing hand on Left at 540×620 and 1180×820 (`seal.js` for a fresh person, with `lib.js`'s `openContext` adding `context.addInitScript(() => localStorage.setItem("draw.hand", "left"))`, the Pencil plan's per-device setting); and the cork back's turn with motion on (`MOTION=on ENGINE=chromium node pass1.js 0,6 cork`). Each person seals three times a day at most, so `seal.js` gets a fresh person per three sizes.

- [ ] **Step 6: Read it against the check list.** `rg "RULE|FAILED" "$S/run.log"` lists every rule problem; go through `shots/` surface by surface against the table above, then put each 390×844 WebKit shot beside its pre-iPad capture for U6 (`~/.cache/drawing-app-ipad/scripts/captures/contact.py` builds side-by-side sheets). In `pen-hover` the hover ring shows; in `pen-stroke` the stroke's width follows the pen's pressure and the tool strip shows Pencil only on; `drawing-group` shows Pencil only, Pen pressure and Try it; Try it's ink shows in `drawing-group-try-it` and is gone in `-faded`.
- [ ] **Step 7: Fix in one batch.** UI edits: the craft floor first, `/impeccable adapt` as the lens. Breaks in other plans' surfaces get fixed here; a change to a design or a composition goes to ad0ll with screenshots instead. Run each failing check once more, and no more rounds.
- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C "$W" check` → lint, typecheck, tests, format and the Move tests pass. Commit the fixes, if any, with their paths: `fix(frontend): every surface at LINE's sheet sizes and in Safari`. Leave the servers up for Tasks 7 and 8.

### Task 6: Merge and deploy for the device session

- [ ] **Step 1:** Squash the branch into `feat(frontend): Full screen in the browser on your board inside LINE on an iPad` (with its DESIGN.md sentence), `feat(frontend): the sign-in gates scroll and keep a field above the keyboard` and, if Task 5 fixed anything, `fix(frontend): every surface at LINE's sheet sizes and in Safari`, with no AI attribution lines (`git -C "$W" log -3 --format=%B` to check).
- [ ] **Step 2:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push. Then rebase the branch onto the new main.
- [ ] **Step 3: Deploy main** (the `deploy-with-dev-slip` memory): ask the other sessions on main whether anything mustn't go live and wait for their answers; deploy from a clean worktree at main with `./deploy/deploy.sh`; afterwards check the live `StatBoard-*.js` chunk holds `getFriendship`, so the developer slip, with its Device paper and the recorder, is live.

### Task 7: The device session

Only LINE's own sheet and APIs, the Pencil, and iPadOS's keyboard and gestures need the iPad; Task 5 has checked everything else in WebKit and Chromium.

- [ ] **Step 1: A tunnel for the handle prompt** (item 11; a real account never sees it): in the background, `cloudflared tunnel --url http://localhost:5196` → note the `https://….trycloudflare.com` address (Vite's `allowedHosts` takes it). Stop it as soon as the session ends: under LIFF Mock anyone with the address can sign in as anyone on that scratch server.
- [ ] **Step 2: Hand ad0ll this script**, with the reasons, and ask for the answers and pastes listed:

  On the iPad, in LINE (open the Official account's chat menu, or a Gift Message's link). The developer slip is at the foot of your cork back (tap your name, pull up past the end, or Developer tools).
  1. **LINE's sheet:** read the Device paper in portrait, in landscape, and with LINE in a narrow window (Stage Manager or windowed apps, and Slide Over). Paste or photograph each: viewport, screen, user agent, safe areas, size class. Is there a header above the app, and does its menu offer to open the page in the browser? Is this iPad LINE's main or a sub device (LINE > Settings > Account shows Delete Account on the main one, Logout on a sub)?
  2. **The friend picker:** Give a sticker to a test friend (or the slip's Send a test message): does the picker open and send?
  3. **Full screen in the browser:** it shows top right on your board (not on an iPhone in LINE); tap it: the iPad's browser opens Croquis on Log in with LINE. Tap that: does LINE for iPad sign you in at once, or LINE's email or QR screen? On the board there, is the link gone?
  4. **Motion:** when the app asks for motion and you allow it, does iPadOS ask too, and does the answer last to the next launch?

  Then in Safari, signed in from step 3. Turn on Record performance on the slip first, and Copy report at the end (it carries the Pencil summary): 5. **The friend picker in Safari:** Give again: does it open (popup or tab), and does LINE ask for its email login first? 6. **Pressure:** draw light then hard with the Pencil, then with a finger. Which Pencil is it (Pro, 2nd generation, USB-C)? 7. **Palm first:** rest your palm on the sheet, then draw with the Pencil: does ink appear before you lift the palm? Does the palm leave a mark? Then a two-finger undo with your palm resting. 8. **Hover:** hold the Pencil just above the sheet: does the ring follow it, in the brush's color? Repeat in LINE. With the Pencil paired and before drawing, does the Device paper show `(any-pointer: fine)` on? 9. **Three fingers:** a three-finger tap on the sheet: redo, or iPadOS's shortcut bar? 10. **Edges and a long press:** drag strokes in from each edge and corner, and hold the Pencil still for three seconds mid-stroke: does any stroke stop short, or a loupe or menu appear? 11. **The keyboard:** open `<tunnel address>/?as=device%40hp` in Safari: the handle prompt. Tap the field in portrait and in landscape: are the field, the error line after a taken handle, and Use @… all above the keyboard, by scrolling if needed? In LINE, tap Explore's search: does the sheet move up, or the keyboard cover the tabs? 12. **Turning and resizing mid-drawing:** draw across the whole sheet, turn the iPad, drag Safari's window narrower and wider, then seal: is every stroke in the sticker? 13. **Light, Normal and Firm:** in Settings' Drawing group on your cork back, pick each in turn and draw with the Pencil, on Try it and on the sheet: which feels right? Does Light reach full width with a light touch, and Firm with a firm one, without straining? 14. **A Pencil (USB-C)**, if you have one: its pressure never changes, so under Light, Normal and Firm its width follows its speed, as a finger's does; under Off it draws a steady width. Is that what you see? 15. **Try it:** does the strip draw with the response you picked, in Ink, fade after a few seconds, and keep nothing once you leave Settings and come back? 16. Send: the Device paper pastes, the performance report, a yes or no for each question, and a screenshot of anything wrong.

- [ ] **Step 3: Apply the results.** Record them under this task as they come (the plan is deleted at the end); durable facts wait for Task 9.
  - **Detection (1, 3):** the screen in LINE's sheet is the device's → `IPAD_MIN_SCREEN_SIDE` stays. If it's the sheet's size, `insideLineOnIpad` takes the user agent instead (an Apple mobile device that isn't an iPhone: `!/iPhone|iPod/.test(navigator.userAgent)`), and its test follows. If LINE isn't a phone-size sheet at all, or the browser doesn't open, take the link out (its files, strings, CSS, DESIGN.md sentence and tests) and tell ad0ll.
  - **Size classes (1):** LINE's sheet must be compact, full-screen Safari regular, and a narrow window compact. If a real viewport lands on the wrong side, move `REGULAR_MIN_WIDTH`, `REGULAR_MIN_HEIGHT` or `SHORT_BELOW_HEIGHT` in `sizeClass.ts` past it, and its tests follow.
  - **Content width:** judge the cards in the Safari screenshots and on the iPad; move `--content-w` only if a card reads cramped or stretched.
  - **Palm (6, 7):** set the drawing screen and Pencil plan's palm threshold, `PALM_CONTACT_PX` in `canvas/gestures.ts`, between the largest fingertip contact and the smallest palm contact in the Pencil summary, nearer the palm: a fingertip taken for a palm stops finger drawing.
  - **Pen pressure (6, 13, 14):** move the drawing plan's Light and Firm exponents in `PRESSURE_EXPONENTS` (`canvas/brush.ts`) toward what felt right; Normal stays today's. A Pencil (USB-C) that doesn't follow its speed under Light, Normal and Firm, or doesn't hold a steady width under Off, is a bug to fix here.
  - **Motion, hover, three fingers, edges, keyboard, turning, Try it (4, 8, 9, 10, 11, 12, 15):** a ring that doesn't follow, a broken stroke, a covered field, a lost stroke or ink Try it keeps is a bug to fix here (UI edits: the craft floor first, `/impeccable adapt` as the lens). iPadOS taking three fingers, the motion prompt and `(any-pointer: fine)` are facts for Task 9.
- [ ] **Step 4:** Rerun the checks the changes touch (Task 5's scripts), then `TZ=Asia/Tokyo pnpm -C "$W" check`, and commit with paths: `fix(frontend): tune the iPad layout from the device session`. Merge and deploy as in Task 6.

### Task 8: Critique, polish and audit

- [ ] **Step 1: Two critiques.** Invoke the impeccable skill twice: `critique http://localhost:5196/?as=lsp-alice at LINE's sheet size, compact and short: 540×620, iPad screen, touch, English and Japanese` and `critique http://localhost:5196/?as=lsp-alice in Safari on an iPad, regular: 820×1180 and 1180×820, touch`. Each run's design review and detector evidence are two isolated sub-agents, as the skill requires; name the surfaces in both: the board, its tray and cork back with Settings' Drawing group, a sticker's detail, Giving, Receiving, the Mini-game, Explore, the Shop and checkout, the drawing screen and the sealed card. End each with `Questions skipped: the plan fixes every P0 and P1 in one batch`.
- [ ] **Step 2: Record** both critiques' findings in `docs/review/<date>-ipad-finish.md` as they come in, and commit it.
- [ ] **Step 3: Fix every P0 and P1 in one batch** (the craft floor first, `/impeccable adapt` as the lens). A finding that changes the design goes to ad0ll instead. Commit: `fix(frontend): the iPad critique's fixes`.
- [ ] **Step 4: `polish`** across both size classes, then **`audit`**; record the audit's findings in the review doc, fix its P0 and P1 in one batch, and list the rest with a reason in Task 10's summary. One more check round after each batch, then stop. Commit: `fix(frontend): the iPad polish and audit`.

### Task 9: The finish's docs

Each plan has already updated the DESIGN.md and PRODUCT.md sentences its own work made false, in its own merge (this one's link went with Task 3). The finish adds the size-class overview to DESIGN.md's Layout, names the iPad in PRODUCT.md's Platform, and fixes anything still left. Write what shipped: where the code differs from these words, the words follow the code. The Layout overview is a durable system change: show ad0ll the diff and commit only once approved.

- [ ] **Step 1: DESIGN.md's Layout.** The first sentence becomes "Every screen is designed on a 390 × 844 iPhone viewport." After its first paragraph:

```md
**Size classes.** The app measures its own frame, never the device, and marks `.phone` (`apps/frontend/src/app/sizeClass.ts`): `regular` from `REGULAR_MIN_WIDTH` wide and `REGULAR_MIN_HEIGHT` tall, otherwise `compact`; `short` below `SHORT_BELOW_HEIGHT`, otherwise `tall`. CSS selects on `data-width` and `data-height`; layouts in code read `useSizeClass()`. Phones, half-screen iPad windows and LINE's centered sheet on an iPad are compact; that sheet, an iPhone SE inside LINE and a landscape phone are short; an iPad in full-screen Safari is regular. The desktop phone frame is always compact. Regular never magnifies the phone: controls and type keep their sizes, and cards and columns stop at `--content-w`.

**Regular compositions.** From its first mark, the drawing sheet keeps one size in sheet units, centered and scaled to fit. The edge opposite the drawing hand carries the size rail at mid-height, undo and redo under it and the seal check at its foot, clear of the corner; the tool strip sits at the top on the drawing hand's side and the timer opposite it, and Drawing hand mirrors the whole screen. The color sheet opens as a popover from its tile. The sticker board is the target phone's board inside LINE as one reference panel (`REFERENCE_BOARD`), scaled uniformly to fit, top-aligned and centered: only the stickers' geometry scales, while the header band, Draw, the gift badges, the selection with its toolbar, and the artist chips keep their own sizes. The header band runs along the top of the panel and the tray beside it, or across the board's full width where that's too narrow. The sticker tray opens beside the panel wherever it fits, like the trade book's facing page, and the board turns over to its cork back in a box at least 360px wide, the papers at their own sizes. Explore's pile keeps its scale up to its cap, centered, with This week beside it where it fits and the lifted sticker as a centered card. Ticket cards center on the screen at `--content-w`; bottom sheets and the sealed card take that width, centered, but stay at the screen's foot, so they never cover what a sheet is about; keys keep their own width; and the sticker detail, Giving, Receiving and the Shop sit in a centered column. The Gratitude Mini-game stays full screen, its lettering scaled with the stage. The tabs stay at the foot, centered at their cap.
```

Add LINE's sheet as the device session measured it (its size, whether it has a header) to the size-classes paragraph.

- [ ] **Step 2: Anything still left.** Read DESIGN.md and PRODUCT.md against the shipped app at both size classes and fix each sentence still false. In particular:
  - If the drawing screen and Pencil plan didn't add it, the cork back's Settings bullet gains the Drawing group: "Drawing follows: Drawing hand (Right or Left), always; once a pen has drawn on the device, Pencil only and Pen pressure, one segment row of Off, Light, Normal and Firm, over Try it, a strip of drawing paper where the pen draws in Ink with the chosen response and fades, keeping nothing. One fine-print line says these stay on the device; a phone shows only Drawing hand."
  - The 11px Floor Rule's "Nothing inside a 390px phone renders under 11px." becomes "Nothing renders under 11px, on any device: only sticker images scale."
  - Do's gain "**Do** lay out by the frame's size classes, never by `getOS()` or the user agent."; Don'ts gain "**Don't** stretch a sheet, card or key edge to edge in regular width; it stops at `--content-w`."
- [ ] **Step 3: PRODUCT.md's Platform.** "A phone web app inside LINE" becomes "A phone-first web app inside LINE". After the browser bullet:

```md
- On an iPad, LINE shows Croquis in its centered sheet, as wide as a phone and shorter, where your sticker board offers Full screen in the browser. The browser, Safari unless you chose another, signs in with LINE Login and shows the iPad layout at any window size. In a browser LINE's sign-in lasts an hour, so a seal or a Give after that asks for LINE Login again. Most iPads are LINE sub devices, which show no chat menu, so iPad users mostly arrive through Gift Messages and links.
```

"iPhone is the target." becomes "iPhone is the target, and the iPad follows it; Android phones and tablets are out of scope unless they work for free, and nothing may block them." Fold in the device session's facts (how Safari's login went, whether the picker needs LINE's email login there, three fingers and the motion prompt on an iPad) where they change what a person does.

- [ ] **Step 4: AGENTS.md's Architecture**, with ad0ll's approval alongside the Layout text: `src/app` gains "and the size classes every layout reads (`sizeClass.ts`)"; `src/performance` gains "and what the device says about itself, for the developer slip's Device paper and the report (`deviceFacts.ts`)" (the foundations plan left both to the finish); `src/line` gains "and, inside LINE's sheet on an iPad, the way to the browser's full screen (`lineSheet.ts`)". The vocabulary table is untouched.
- [ ] **Step 5:** `pnpm -C "$W" format:check` → passes. Commit with paths: `docs: DESIGN.md's Layout, PRODUCT.md and AGENTS.md know the iPad`.

### Task 10: Check, merge and purge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm -C "$W" check:full` → lint, typecheck, tests, format, the Move tests and the production build pass; read knip's report for anything this work left unused and remove it.
- [ ] **Step 2:** Squash what followed Task 6's merge into `fix(frontend): tune the iPad layout from the device session`, `fix(frontend): the iPad critique, polish and audit` and `docs: DESIGN.md's Layout, PRODUCT.md and AGENTS.md know the iPad`, with no AI attribution lines.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge, push. Deploy main as in Task 6.
- [ ] **Step 4: Purge** (the spec's Plans section and the purge memory): delete every iPad plan (`docs/superpowers/plans/2026-10-07-ipad-*.md`), `docs/superpowers/specs/2026-10-07-ipad-layout-design.md` and the review doc, and commit on main with explicit pathspecs: `docs: the iPad layout is built, so its plans, spec and review go`. Push. Stop the servers and the tunnel, delete `~/.cache/drawing-app-ipad` (the research scratch, this plan's own included), and remove this worktree and its branch. Ask the coordinator before removing the research and planning worktrees, which other sessions made.
- [ ] **Step 5: Closing summary** for ad0ll: what the device session found, the constants it moved, the audit findings left with their reasons, and every decision still open.
