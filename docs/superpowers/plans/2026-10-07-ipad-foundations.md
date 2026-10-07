# iPad Foundations Implementation Plan

> **On hold (2026-10-08):** being reworked with its spec; don't build from it. Its scratch paths under `~/.cache` are out of date: a task's scratch goes in its worktree's gitignored `data/scratch/`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The base every other iPad plan builds on: LIFF's security update, size classes that mark the app's frame, sheets and cards that stop at one content width in regular width, two bug fixes, device-neutral words, and the developer slip's Device paper and Pencil summary for the device session.

**Architecture:** `app/sizeClass.ts` measures `.phone` with a ResizeObserver and marks it `data-width="compact|regular"` and `data-height="short|tall"`; CSS selects on the marks, code reads `useSizeClass()`. `styles/tokens.css` gains the content width (`--content-w`), a key's floor (`--key-min-w`), the floating sheet's shadow (`--shadow-float`) and the foot's safe area (`--foot-inset`, which `.screen` resets to 0, since the tab strip clears it there); `ui/sheet.css`, `tickets/tickets.css` and the sealed card read them. `performance/deviceFacts.ts` reads what the device says, for the slip's Device paper and the performance report, and the performance log sums up each kind of pointer.

**Tech Stack:** React 19, TypeScript, vitest + happy-dom, CSS, the i18n catalog, Playwright (Chromium and WebKit) for the browser checks, LIFF 2.31.1.

---

## Decisions (awaiting ad0ll's sign-off)

The spec's numbers (`docs/superpowers/specs/2026-10-07-ipad-layout-design.md`), each as recommended, with this plan's reading where the spec leaves a choice.

3. **Size classes.** `app/sizeClass.ts` marks `.phone`: `data-width="regular"` at ≥ `REGULAR_MIN_WIDTH` (700) px wide and ≥ `REGULAR_MIN_HEIGHT` (600) px tall, else `compact`; `data-height="short"` below `SHORT_BELOW_HEIGHT` (700) px tall, else `tall`. It measures the frame's own box, never `getOS()` or the user agent, so an iPhone SE inside LINE (about 375×591) is compact and short too. The desktop phone frame stays and is always compact; it says so through `--phone-frame` (App.css), so its media query lives in one place. The dev server's `?layout=regular|compact` picks the width class, and `regular` drops the desktop frame, so a desktop window previews the regular layout.
4. **Cards, not stretched sheets** (sheets and cards; the columns are the Explore and dialogs plan's). In regular width every `Sheet` and every `TicketCard` takes `--content-w` (520px to start), and keys keep their natural width. This plan's reading:
   - a. **Ticket cards center on the screen:** modal choices over a dimmed screen, with nothing behind them to keep in view.
   - b. **Bottom sheets stay at the foot,** centered at the content width, lifted a gutter and rounded all round, as the send gratitude sheet already floats. Giving and Receiving set a sticker above their sheet, and the send gratitude sheet keeps the board in view, so a sheet centered on the screen would cover what it's about; the Explore and dialogs plan sets their lift. A sheet on the phone itself (the motion card) floats above the tab strip, as the toast does.
   - c. **The sealed card** gets the same width over the foot, and its ceremony keeps its place at the foot. This plan owns the card's width; the Explore and dialogs plan only measures the sheet and the card again on resize, and checks the card's slot.
   - d. **A key at its natural width keeps at least 232px** (`--key-min-w`), the floor the sheets' keys already use; so does the block label under a card's key.
5. **Device-neutral words.** All seven English strings change: "phone" is wrong on an iPad and in a computer's browser. Six of their Japanese strings already say 端末, or no device at all (`invalid_request`), and stay; the motion card's Japanese names iPhone and changes. The glossary gains 端末 for "device", the strings' comments say "device", and `seal.failed.onThisPhone` becomes `onThisDevice`.
6. **The tabs stay at the foot,** centered at their 176px cap. Task 8 verifies it at every size; no code.
7. **LIFF 2.31.1,** pinned exactly. npm also has 2.31.2, published 2026-10-07 with no release note yet; the workspace's `minimumReleaseAge` (3 days) holds it back until 2026-10-10 anyway. Take it once LINE notes it.

**No decision needed:**

- **Bottom sheets' bottom safe area.** A sheet that reaches the screen's foot (over the tabs: the motion card, Giving's sheets, the Accept sheet) pads the home indicator's safe area under its content; one inside `.screen`, which ends above the tab strip, doesn't need to. `--foot-inset` is `env(safe-area-inset-bottom)`, and `.screen` resets it to 0. Ticket cards read it too, in place of the checkout's own `.phone > .reserve-checkout` rule.
- **The out-of-tickets card's shift.** Measured while writing this plan (Playwright WebKit, 1180×820, reduced motion): opening the card scrolled `.board` from 0 to 42px, so the scrim, which scrolls with the board, ended at 710 above the tabs' 752. The card starts its rise 56px low, 42px past the board's edge (its 14px padding), and WebKit scrolls an `overflow: hidden` box, still a scroll container, to show the key the card focuses as it opens. Where stickers overflow the board, as at iPad sizes and in LINE's sheet (the 540×620 capture shows the strip too), the scroll stays; elsewhere it springs back as the card settles. Chromium, and WebKit without reduced motion, didn't scroll. Forcing `focus({ preventScroll: true })`, or `.board { overflow: clip }`, each kept it at 0. The fix is `overflow: clip` on the hosts of ticket cards (the board, the drawing screen, the desktop phone frame): a layer that only clips can't be scrolled, by a focus or anything else. The focus trap stays as it is, since dialogs with a scrolling body rely on focus scrolling inside it.
- **For the device session (spec section 5):** the Device paper and the Pencil summary.
- **Docs:** the DESIGN.md and PRODUCT.md sentences this work makes false change in its merge (Task 9); the size-class overview is the finish's.
- **In passing:** `--ph-status`, `--ph-liff` and `--ph-safe` go (nothing reads them); the comment stacked above `isAppleMobile` in `ui/motionPermission.ts` moves to `iosMotionPrompt`; the floating sheet's shadow and the 232px key floor become tokens where they were copies.

Starting values, unverified guesses to tune by screenshots and the device session: `--content-w` 520px; the thresholds 700, 600 and 700.

**What this lays out, and what it leaves.** Every `Sheet` (`ui/Sheet.tsx`): the motion card, Giving's sheets, the give sheet on someone else's board, the Accept sheet, the send gratitude sheet, and the color sheet until the drawing screen and Pencil plan makes it a popover (Task 6 says how a popover opts out). Every `TicketCard` (`tickets/TicketCard.tsx`): out of tickets over the board and the canvas, the start card and the reserve ask, the checkout over the Shop, the board and the canvas, tickets not loaded. The sealed card. Left to their plans, being their own markup: the Mini-game's receipt, the receive dialog's end screens, the gift received notice, the sticker detail and the Shop's hero, and Explore's lifted sticker (Explore and dialogs). The developer slip stays wide: it's a dev tool.

## Files

- Modify `apps/frontend/package.json`, `pnpm-lock.yaml`: LIFF 2.31.1 (Task 0)
- Create `apps/frontend/src/app/sizeClass.ts`, `sizeClass.test.tsx`; modify `app/App.tsx`, `app/App.css`
- Create `apps/frontend/src/performance/deviceFacts.ts`, `deviceFacts.test.ts`; `sticker-board/stat-board/DeviceDetails.tsx`, `DeviceDetails.test.tsx`, `device-details.css`; modify `stat-board/StatBoard.tsx`
- Modify `apps/frontend/src/performance/performanceRecorder.ts`, `performanceReport.ts` and their tests; `stat-board/PerformanceRecorderControls.tsx`, its test and `performance-recorder-controls.css`
- Modify `apps/frontend/src/styles/tokens.css`, `ui/sheet.css`, `tickets/tickets.css`, `tickets/ReserveTicketCheckout.css`, `sticker-creation/sealing/SealedCard.css`, `app/motion-permission-card.css`, `receiving/receive-gift-dialog.css`, `receiving/send-gratitude-sheet.css`, `giving/Giving.css`, `sticker-board/tray/sticker-tray.css` (one shadow), `sticker-board/StickerBoard.css`, `sticker-creation/DrawingScreen.css`
- Modify the catalog (`i18n/strings/app.ts`, `errors.ts`, `gratitude.ts`, `stickerBoard.ts`, `stickerCreation.ts`), `i18n/glossary.md`, `sticker-creation/session/session.ts` and its test, `sticker-creation/DrawingScreen.test.tsx`, `gratitude/GratitudeMiniGame.test.tsx`, `ui/motionPermission.ts` (a comment)
- Modify `DESIGN.md`, `PRODUCT.md` (Task 9)

**Tests run with `TZ=Asia/Tokyo`,** every vitest, `pnpm test` and `pnpm check` run below: two tests on main (`GiftReceivedNotice.test.tsx`, `StickerDetail.test.tsx`) fail in other time zones. Turbo's strict env mode passes `TZ` through to its tasks.

## Browser checks

Each task's browser check is one function of one script, run against a dev server of its own. Scripts and screenshots live in `~/.cache/drawing-app-ipad-foundations/` (screenshots in `shots/`), never in the repo, and go with the worktree. A check prints `PASS` or `FAIL` lines with what it measured; the script exits non-zero on any `FAIL`.

**The dev server.** Other sessions hold 5173/8788 and the iPad research lane 5190/8790, and the other iPad plans take 5191–5194 and 5196; this plan's are 5195 and 8795. For a worktree `W` and ports `F` (Vite) and `A` (the API), each left running in the background:

```sh
mkdir -p "$W/data" ~/.cache/drawing-app-ipad-foundations/shots
(cd "$W/apps/api" && PORT=$A DATABASE_URL=data/ipad-checks.db IMAGE_DIR=../../data/ipad-checks-images IMAGE_BASE_URL=http://localhost:$F/api/images pnpm dev)
(cd "$W/apps/frontend" && CHECKS_PORT=$F CHECKS_API=http://localhost:$A VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm exec vite --config vite.checks.config.ts)
```

with an untracked `$W/apps/frontend/vite.checks.config.ts` (never `git add` it):

```ts
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: Number(process.env.CHECKS_PORT),
      strictPort: true,
      proxy: { "/api": { target: process.env.CHECKS_API } },
    },
  }),
);
```

The database starts empty; the checks sign in the people they need (`fd-*`) through the dev sign-in `apps/api/.env.example` turns on.

**`~/.cache/drawing-app-ipad-foundations/lib.js`.** Playwright comes from the npx copy the iPad lanes used, whose WebKit is installed; if it's gone, the `webkit-testing` memory says how to match another copy to the installed WebKit.

```js
// Helpers for the iPad foundations plan's browser checks. Not committed: it goes with the worktree.
const path = require("path");
const { webkit, chromium } = require(
  path.join(process.env.HOME, ".npm/_npx/86170c4cd1c5da32/node_modules/playwright-core"),
);

const BASE = process.env.BASE ?? "http://localhost:5195";
const SHOTS = path.join(process.env.HOME, ".cache/drawing-app-ipad-foundations/shots");
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
/** The spec's sizes: phones (an iPhone SE in LINE among them), LINE's sheet on an iPad with and
 * without its header, then iPads each way up, a short landscape window among them. */
const SIZES = [
  [390, 844],
  [375, 591],
  [540, 564],
  [540, 620],
  [744, 1133],
  [1133, 690],
  [820, 1180],
  [1180, 820],
  [1376, 1032],
];
/** The spec's starting thresholds (app/sizeClass.ts). */
const isRegular = ([w, h]) => w >= 700 && h >= 600;
const near = (a, b, slack = 1) => Math.abs(a - b) <= slack;
const mid = (b) => b.left + b.width / 2;

let failed = 0;
function check(ok, what, measured) {
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${what}${measured === undefined ? "" : ` ${JSON.stringify(measured)}`}`,
  );
}

/** A dev person's session cookie, without Secure: WebKit drops a Secure cookie on http://localhost. */
async function cookiesFor(name) {
  const profile = { sub: `dev-${name}`, name: name.charAt(0).toUpperCase() + name.slice(1) };
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken: `drawing-app-dev-id-token:${JSON.stringify(profile)}`,
      language: "en",
    }),
  });
  if (!res.ok) throw new Error(`POST /api/session for ${name}: ${res.status} ${await res.text()}`);
  return res.headers.getSetCookie().map((c) => {
    const [pair] = c.split(";");
    const at = pair.indexOf("=");
    return {
      name: pair.slice(0, at),
      value: pair.slice(at + 1),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    };
  });
}

const cookieHeader = async (name) =>
  (await cookiesFor(name)).map((c) => `${c.name}=${c.value}`).join("; ");

/** Saves a person's language choice to their account, which the app follows once they're signed in. */
async function chooseLanguage(name, languageChoice) {
  const res = await fetch(`${BASE}/api/me/language-choice`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: await cookieHeader(name) },
    body: JSON.stringify({ languageChoice }),
  });
  if (!res.ok) throw new Error(`choosing ${name}'s language: ${res.status} ${await res.text()}`);
}

/** Spends a person's daily tickets through the API, so Draw raises the out-of-tickets card: tap it by
 * its name saying so, since before the board has the tickets Draw opens the canvas to ask for them. */
async function spendAllTickets(name) {
  const cookie = await cookieHeader(name);
  for (let spent = 0; ; spent++) {
    const res = await fetch(`${BASE}/api/tickets/spend`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kind: "daily", idempotencyKey: crypto.randomUUID() }),
    });
    if (res.status === 409) return console.log(`${name}: no tickets left, after spending ${spent}`);
    if (!res.ok) throw new Error(`spending ${name}'s ticket: ${res.status} ${await res.text()}`);
  }
}

/** Closes the motion card where it asks: Chromium with an iPad's user agent. WebKit here never asks. */
async function dismissMotion(page) {
  const close = page.getByRole("button", { name: "Close Motion permission" });
  try {
    await close.waitFor({ timeout: 2000 });
  } catch {
    return console.log("no motion card to close");
  }
  await close.tap();
  await close.waitFor({ state: "detached" });
}

/**
 * A browser signed in as `name` (an iPad, with touch, 2x and its user agent, unless `desktop`), open
 * on `path`, ready once `ready` shows, with the motion card closed unless it's kept.
 */
async function start({
  engine,
  name,
  size,
  path: at = "/",
  query = "",
  ready = ".board-who",
  reducedMotion = "no-preference",
  desktop = false,
  init,
  keepMotionCard = false,
}) {
  const browser = await (engine === "webkit" ? webkit : chromium).launch();
  const viewport = { width: size[0], height: size[1] };
  const context = await browser.newContext({
    viewport,
    locale: "en-US",
    timezoneId: "Asia/Tokyo",
    reducedMotion,
    ...(desktop
      ? {}
      : {
          screen: viewport,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          userAgent: IPAD_UA,
        }),
  });
  // WebKit's fetches to outside HTTPS (fonts, LIFF) go through Node, as the iPad lanes found.
  if (engine === "webkit")
    await context.route(/^https:\/\//, (route) =>
      route.fetch().then(
        (response) => route.fulfill({ response }),
        (error) => (console.log(`route ${route.request().url()} failed: ${error}`), route.abort()),
      ),
    );
  await context.addCookies(await cookiesFor(name));
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${engine} ${name}] ${String(e).slice(0, 300)}`));
  await page.goto(`${BASE}${at}?as=${name}${query}`, { waitUntil: "domcontentloaded" });
  await page.locator(ready).first().waitFor({ timeout: 20_000 });
  // Until the drawing screen has loaded and told the board its sheet is fresh, Draw opens the canvas.
  if (at === "/")
    await page.locator(".drawing-screen").waitFor({ state: "attached", timeout: 20_000 });
  if (!keepMotionCard && !desktop) await dismissMotion(page);
  return { browser, context, page };
}

async function resize(page, [width, height]) {
  await page.setViewportSize({ width, height });
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForTimeout(300);
}

/** Runs `each` at every size, the page resized to it first. */
async function eachSize(page, each) {
  for (const size of SIZES) {
    await resize(page, size);
    await each(size);
  }
}

const box = (page, selector) =>
  page.evaluate(
    (s) => document.querySelector(s)?.getBoundingClientRect().toJSON() ?? null,
    selector,
  );

/** Turns the board over and brings the developer slip out, with its button for keyboards. */
async function openSlip(page) {
  await page.locator(".board-who").tap();
  await page.waitForTimeout(1200);
  await page.locator(".dev-slip__open").focus();
  await page.keyboard.press("Enter");
  await page.locator(".dev-slip.is-out").waitFor();
}

/** A slip row's value, by its label. */
const rowValue = (page, scope, label) =>
  page.evaluate(
    ([s, l]) => {
      const rows = [...document.querySelectorAll(`${s} .account-rows__row`)];
      return (
        rows.find((r) => r.querySelector("dt")?.textContent === l)?.querySelector("dd")
          ?.textContent ?? null
      );
    },
    [scope, label],
  );

const shot = (page, what, variant, [w, h]) =>
  page.screenshot({ path: path.join(SHOTS, `${what}-${variant}-${w}x${h}.png`) });

module.exports = {
  BASE,
  SIZES,
  isRegular,
  near,
  mid,
  check,
  failures: () => failed,
  cookiesFor,
  chooseLanguage,
  spendAllTickets,
  dismissMotion,
  start,
  resize,
  eachSize,
  box,
  openSlip,
  rowValue,
  shot,
};
```

**`~/.cache/drawing-app-ipad-foundations/checks.js`:** `node checks.js <check> …`, or every check with none named; `BASE=http://localhost:<port>` points it at another server.

```js
// The iPad foundations plan's browser checks: node checks.js [check …]. Not committed.
const L = require("./lib");
const named = (size) => size.join("x");

/** A sheet: regular, a 520px card centered a gutter over its layer's foot (over the tab strip when it
 * sits on the phone itself), its key at its own width; compact, across its layer at the foot. */
async function sheetFits(page, selector, size, label, key) {
  const m = await page.evaluate(
    ([s, k]) => {
      const at = (el) => el?.getBoundingClientRect().toJSON() ?? null;
      const sheet = document.querySelector(s);
      const onPhone = sheet.offsetParent.classList.contains("phone");
      const lift = onPhone ? at(document.querySelector(".tabs")).height + 12 : 12;
      return {
        sheet: at(sheet),
        layer: at(sheet.offsetParent),
        lift,
        key: k ? at(sheet.querySelector(k)) : null,
      };
    },
    [selector, key],
  );
  const { sheet, layer } = m;
  const regular = L.isRegular(size);
  const where = `${label} ${named(size)}`;
  L.check(
    regular
      ? L.near(sheet.width, 520) &&
          L.near(L.mid(sheet), L.mid(layer)) &&
          L.near(layer.bottom - sheet.bottom, m.lift)
      : L.near(sheet.left, layer.left) &&
          L.near(sheet.right, layer.right) &&
          L.near(sheet.bottom, layer.bottom),
    `${where}: ${regular ? "a 520px card over the foot" : "across the foot"}`,
    m,
  );
  if (m.key)
    L.check(
      regular
        ? m.key.width >= 232 && m.key.width < sheet.width - 41 && L.near(L.mid(m.key), L.mid(sheet))
        : L.near(m.key.width, sheet.width - 40),
      `${where}: its key ${regular ? "keeps its own width, centered" : "spans the sheet"}`,
      m.key,
    );
}

/** A card: regular, 520px and centered (in the middle of its layer, or over its foot), its key and the
 * label under it at their own width; compact, across its layer at the foot, as on phones. */
async function cardFits(page, parts, size, label) {
  const m = await page.evaluate((p) => {
    const at = (el) => el?.getBoundingClientRect().toJSON() ?? null;
    const card = document.querySelector(p.card);
    const layer = p.layer ? document.querySelector(p.layer) : card.offsetParent;
    return {
      layer: at(layer),
      card: at(card),
      key: at(card.querySelector(p.key)),
      label: at(card.querySelector(":scope > .label-btn--block")),
    };
  }, parts);
  const where = `${label} ${named(size)}`;
  const content = m.card.width - 36;
  if (L.isRegular(size)) {
    const placed = parts.middle
      ? L.near(m.card.top + m.card.height / 2, m.layer.top + m.layer.height / 2, 2)
      : L.near(m.layer.bottom - m.card.bottom, 14);
    L.check(
      L.near(m.card.width, 520) && L.near(L.mid(m.card), L.mid(m.layer)) && placed,
      `${where}: a 520px card ${parts.middle ? "in the middle" : "over the foot"}`,
      m.card,
    );
    for (const [part, b] of [
      ["key", m.key],
      ["label", m.label],
    ]) {
      if (b)
        L.check(
          b.width >= 232 && b.width < content - 1 && L.near(L.mid(b), L.mid(m.card)),
          `${where}: its ${part} keeps its own width, centered`,
          b,
        );
    }
  } else {
    L.check(
      L.near(m.card.width, m.layer.width - 28) && L.near(m.layer.bottom - m.card.bottom, 14),
      `${where}: across its layer at the foot`,
      m.card,
    );
    L.check(L.near(m.key.width, content), `${where}: its key spans the card`, m.key);
  }
}

const TICKET_CARD = {
  card: ".out-of-tickets__card",
  layer: ".out-of-tickets",
  key: ".out-of-tickets__key",
  middle: true,
};

const CHECKS = {
  /** Task 0: LIFF Mock still installs and signs in. It answers getVersion itself, with its own
   * 2.19.0, so the SDK's version is checked in the lockfile and the build. */
  async liff() {
    const { browser, page } = await L.start({
      engine: "chromium",
      name: "fd-liff",
      size: [390, 844],
      reducedMotion: "reduce",
    });
    await L.openSlip(page);
    const opened = await L.rowValue(page, ".dev-slip", "Opened in");
    L.check(opened !== null, "LIFF Mock signs in, and LINE's details show on the slip", opened);
    await browser.close();
  },

  /** Task 1: the frame's marks at every size and as it turns, the desktop frame and ?layout=; and
   * decision 17's tabs: at the foot, centered, each at most 176px. */
  async marks() {
    for (const engine of ["webkit", "chromium"]) {
      const { browser, page } = await L.start({
        engine,
        name: "fd-marks",
        size: L.SIZES[0],
        reducedMotion: "reduce",
      });
      await L.eachSize(page, async (size) => {
        const m = await page.evaluate(() => {
          const at = (el) => el.getBoundingClientRect().toJSON();
          const phone = document.querySelector(".phone");
          return {
            marks: { ...phone.dataset },
            phone: at(phone),
            strip: at(document.querySelector(".tabs")),
            tabs: [...document.querySelectorAll(".tabs .tab")].map(at),
          };
        });
        const want = {
          width: L.isRegular(size) ? "regular" : "compact",
          height: size[1] < 700 ? "short" : "tall",
        };
        L.check(
          m.marks.width === want.width && m.marks.height === want.height,
          `${engine} ${named(size)}: ${want.width} ${want.height}`,
          m.marks,
        );
        const widths = m.tabs.map((t) => t.width);
        const centered = L.near((m.tabs[0].left + m.tabs[2].right) / 2, L.mid(m.phone));
        const tabs =
          widths.length === 3 &&
          widths.every((w) => w <= 176.5 && L.near(w, widths[0], 0.5)) &&
          centered &&
          L.near(m.strip.bottom, m.phone.bottom);
        L.check(tabs, `${engine} ${named(size)}: three tabs at the foot, centered, at most 176px`, {
          widths,
        });
        await L.shot(page, "board", engine, size);
      });
      await browser.close();
    }
    for (const [query, want, phoneWidth] of [
      ["", "compact", 412],
      ["&layout=regular", "regular", 1280],
    ]) {
      const { browser, page } = await L.start({
        engine: "chromium",
        name: "fd-desk",
        size: [1280, 900],
        desktop: true,
        query,
      });
      const width = await page.evaluate(() => document.querySelector(".phone").dataset.width);
      const phone = await L.box(page, ".phone");
      L.check(
        width === want && L.near(phone.width, phoneWidth),
        `a desktop window${query}: ${want}, the phone ${phoneWidth}px wide`,
        { width, phone },
      );
      await browser.close();
    }
    const { browser, page } = await L.start({
      engine: "webkit",
      name: "fd-desk",
      size: [1180, 820],
      reducedMotion: "reduce",
      query: "&layout=compact",
    });
    const width = await page.evaluate(() => document.querySelector(".phone").dataset.width);
    L.check(
      width === "compact",
      "?layout=compact keeps an iPad's window on the phone layout",
      width,
    );
    await browser.close();
  },

  /** Task 2: the Device paper says what the device says, follows a turn, and copies. */
  async device() {
    for (const engine of ["webkit", "chromium"]) {
      const { browser, context, page } = await L.start({
        engine,
        name: "fd-device",
        size: [1180, 820],
        reducedMotion: "reduce",
      });
      if (engine === "chromium")
        await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: L.BASE });
      await L.openSlip(page);
      const rows = async () => ({
        viewport: await L.rowValue(page, ".device-details", "Viewport"),
        size: await L.rowValue(page, ".device-details", "Size class"),
        media: await L.rowValue(page, ".device-details", "Media"),
      });
      const wide = await rows();
      L.check(
        wide.viewport?.startsWith("1180×820") &&
          wide.size === "regular · tall" &&
          /pointer coarse/.test(wide.media ?? ""),
        `${engine}: 1180×820, regular · tall, a coarse pointer`,
        wide,
      );
      await L.resize(page, [540, 620]);
      const sheet = await rows();
      L.check(
        sheet.viewport?.startsWith("540×620") && sheet.size === "compact · short",
        `${engine}: it follows the window to LINE's sheet size`,
        sheet,
      );
      await L.shot(page, "device-paper", engine, [540, 620]);
      await page.getByRole("button", { name: "Copy device details" }).tap();
      const status = await page.locator(".device-details [role=status]").textContent();
      const byHand = await page.locator(".device-details textarea").count();
      L.check(
        status.startsWith("Copied") || byHand === 1,
        `${engine}: Copy device details copies, or leaves them to copy by hand`,
        { status, byHand },
      );
      await browser.close();
    }
  },

  /** Task 3: the recorder sums up a Pencil's and a finger's input; Chromium's CDP sends trusted pen events. */
  async pen() {
    const init = () => localStorage.setItem("draw.performanceRecorder", "on");
    const { browser, context, page } = await L.start({
      engine: "chromium",
      name: "fd-pen",
      size: [820, 1180],
      reducedMotion: "reduce",
      init,
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: L.BASE });
    const cdp = await context.newCDPSession(page);
    const pen = (type, x, y, force, buttons) =>
      cdp.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        pointerType: "pen",
        button: type === "mouseMoved" ? "none" : "left",
        buttons,
        clickCount: type === "mouseMoved" ? 0 : 1,
        force,
      });
    await pen("mouseMoved", 300, 600, 0, 0);
    await pen("mouseMoved", 310, 604, 0, 0);
    await pen("mousePressed", 320, 608, 0.1, 1);
    for (let i = 1; i <= 24; i++)
      await pen("mouseMoved", 320 + i * 8, 608 + i * 3, Math.min(1, 0.1 + i * 0.0375), 1);
    await pen("mouseReleased", 512, 680, 0, 0);
    const finger = (type, points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map(([x, y]) => ({ x, y, radiusX: 15, radiusY: 15, force: 0.5 })),
      });
    await finger("touchStart", [[400, 800]]);
    await finger("touchMove", [[404, 804]]);
    await finger("touchEnd", []);
    await L.openSlip(page);
    await page.waitForTimeout(1200);
    const lines = await page.locator(".performance-recorder__pointers li").allTextContents();
    const penLine = lines.find((l) => l.startsWith("pen:")) ?? "";
    const ok =
      /^pen: 1 down, \d+ moves, [1-9]\d* hovering · pressure 0\.10–1\.00/.test(penLine) &&
      lines.some((l) => l.startsWith("touch:"));
    L.check(ok, "the pen's contact, hovering and pressure, and the finger's contact", lines);
    await page.getByRole("button", { name: "Copy report" }).tap();
    const report = await page.evaluate(() => navigator.clipboard.readText());
    L.check(
      report.includes("\n  pen: 1 down") && report.includes("\nSize class: regular · tall"),
      "the report carries the pointers and the device's facts",
      report.slice(0, 600),
    );
    await L.shot(page, "pencil-summary", "chromium", [820, 1180]);
    await browser.close();
  },

  /** Task 4: what pads the home indicator's safe area. Playwright reports none, so 34px stands in. */
  async foot() {
    const padding = (page, s) =>
      page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).paddingBottom, s);
    await L.spendAllTickets("fd-foot");
    const { browser, page } = await L.start({
      engine: "chromium",
      name: "fd-foot",
      size: [390, 844],
      keepMotionCard: true,
    });
    await page.evaluate(() => document.documentElement.style.setProperty("--foot-inset", "34px"));
    await page.getByRole("dialog", { name: "Motion permission" }).waitFor();
    const sheet = await padding(page, ".phone > .bottom-sheet");
    L.check(
      sheet === "58px",
      "a sheet on the phone, over the tabs, pads 24px over the home indicator",
      sheet,
    );
    await L.dismissMotion(page);
    await page.getByRole("button", { name: /^Draw a new sticker: no tickets/ }).tap();
    await page.locator(".board > .out-of-tickets").waitFor();
    const overBoard = await padding(page, ".board > .out-of-tickets");
    L.check(
      overBoard === "14px",
      "a ticket card over the board leaves the indicator to the tabs",
      overBoard,
    );
    await page.getByRole("button", { name: "Back to My board" }).tap();
    await page.locator(".tab-shop").tap();
    await page.getByRole("button", { name: "Buy reserve tickets" }).first().tap();
    await page.locator(".phone > .reserve-checkout").waitFor();
    const overShop = await padding(page, ".phone > .reserve-checkout");
    L.check(overShop === "48px", "the checkout over the Shop, over the tabs, clears it", overShop);
    await browser.close();
  },

  /** Task 5: opening the out-of-tickets card never scrolls the board, at any size or motion setting. */
  async shift() {
    await L.spendAllTickets("fd-shift");
    for (const engine of ["webkit", "chromium"]) {
      for (const reducedMotion of ["reduce", "no-preference"]) {
        const { browser, page } = await L.start({
          engine,
          name: "fd-shift",
          size: L.SIZES[0],
          reducedMotion,
        });
        await page.evaluate(() => {
          window.boardScrolls = [];
          document.addEventListener(
            "scroll",
            (e) => {
              if (e.target instanceof Element && e.target.matches(".board"))
                window.boardScrolls.push(e.target.scrollTop);
            },
            true,
          );
        });
        await L.eachSize(page, async (size) => {
          await page.getByRole("button", { name: /^Draw a new sticker: no tickets/ }).tap();
          await page.getByRole("heading", { name: "Out of tickets for today" }).waitFor();
          await page.waitForTimeout(900);
          const m = await page.evaluate(() => ({
            scrolls: window.boardScrolls.splice(0),
            scrollTop: document.querySelector(".board").scrollTop,
            scrimBottom: document.querySelector(".out-of-tickets__scrim").getBoundingClientRect()
              .bottom,
            tabsTop: document.querySelector(".tabs").getBoundingClientRect().top,
            tabsDimmed:
              getComputedStyle(document.querySelector(".tabs"), "::after").content !== "none",
          }));
          const where = `${engine} ${reducedMotion} ${named(size)}`;
          L.check(
            m.scrolls.length === 0 && m.scrollTop === 0,
            `${where}: the board stays put under the card`,
            m,
          );
          L.check(
            L.near(m.scrimBottom, m.tabsTop) && m.tabsDimmed,
            `${where}: the scrim meets the dimmed tabs`,
            m,
          );
          if (engine === "webkit" && reducedMotion === "reduce")
            await L.shot(page, "out-of-tickets", engine, size);
          await page.getByRole("button", { name: "Back to My board" }).tap();
          await page.locator(".board > .out-of-tickets").waitFor({ state: "detached" });
        });
        await browser.close();
      }
    }
  },

  /** Task 6: sheets at the content width in regular width, across the foot in compact. */
  async sheets() {
    // A sheet on the phone itself, over the tabs: the motion card.
    {
      const { browser, page } = await L.start({
        engine: "chromium",
        name: "fd-motion",
        size: L.SIZES[0],
        keepMotionCard: true,
      });
      await page.getByRole("dialog", { name: "Motion permission" }).waitFor();
      await L.eachSize(page, async (size) => {
        await sheetFits(page, ".phone > .bottom-sheet", size, "chromium motion card", ".key");
        await L.shot(page, "motion-card", "chromium", size);
      });
      await browser.close();
    }
    // A sheet inside .screen: the color sheet, whose layer stops above the grabber's strip.
    for (const engine of ["webkit", "chromium"]) {
      const { browser, page } = await L.start({
        engine,
        name: `fd-color-${engine}`,
        size: [820, 1180],
        reducedMotion: "reduce",
        path: "/draw",
        ready: ".ink-canvas",
      });
      await page.getByRole("button", { name: "Color", exact: true }).tap();
      await page.locator(".bottom-sheet.color-sheet").waitFor();
      await L.eachSize(page, async (size) => {
        await sheetFits(page, ".bottom-sheet.color-sheet", size, `${engine} color sheet`);
        await L.shot(page, "color-sheet", engine, size);
      });
      await browser.close();
    }
  },

  /** Task 6: ticket cards in the middle at the content width in regular width, keys at their own width. */
  async cards() {
    await L.spendAllTickets("fd-cards");
    for (const engine of ["webkit", "chromium"]) {
      const { browser, page } = await L.start({
        engine,
        name: "fd-cards",
        size: L.SIZES[0],
        reducedMotion: "reduce",
      });
      await page.getByRole("button", { name: /^Draw a new sticker: no tickets/ }).tap();
      await page.locator(".board > .out-of-tickets").waitFor();
      await L.eachSize(page, (size) =>
        cardFits(page, TICKET_CARD, size, `${engine} out of tickets over the board`),
      );
      await page.getByRole("button", { name: "Back to My board" }).tap();
      await page.locator(".tab-shop").tap();
      await page.getByRole("button", { name: "Buy reserve tickets" }).first().tap();
      await page.locator(".phone > .reserve-checkout").waitFor();
      await L.eachSize(page, async (size) => {
        await cardFits(page, TICKET_CARD, size, `${engine} checkout over the Shop`);
        await L.shot(page, "checkout", engine, size);
      });
      await page.goto(`${L.BASE}/draw?as=fd-cards`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Out of tickets for today" }).waitFor();
      await L.eachSize(page, (size) =>
        cardFits(page, TICKET_CARD, size, `${engine} out of tickets over the canvas`),
      );
      await browser.close();
    }
  },

  /** Task 6: the sealed card at the content width over the foot in regular width. */
  async sealed() {
    const { browser, page } = await L.start({
      engine: "chromium",
      name: "fd-seal",
      size: [1180, 820],
      path: "/draw",
      ready: ".ink-canvas",
    });
    const ink = await L.box(page, ".ink-canvas");
    await page.mouse.move(ink.x + 200, ink.y + 200);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++)
      await page.mouse.move(ink.x + 200 + i * 12, ink.y + 200 + (i % 5) * 20);
    await page.mouse.up();
    const seal = await L.box(page, ".seal-key");
    for (let tap = 0; tap < 2; tap++) {
      await page.touchscreen.tap(seal.x + seal.width / 2, seal.y + seal.height / 2);
      await page.waitForTimeout(700);
    }
    await page.getByRole("heading", { name: "Sealed" }).waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await L.eachSize(page, async (size) => {
      await cardFits(
        page,
        { card: ".sealed-card", key: ".sealed-card__key", middle: false },
        size,
        "chromium sealed card",
      );
      await L.shot(page, "sealed-card", "chromium", size);
    });
    await browser.close();
  },

  /** Task 7: the motion card names no device, in English or in Japanese. */
  async words() {
    for (const language of ["en", "ja"]) {
      // The account's choice, which wins over the device's after sign-in.
      await L.chooseLanguage(`fd-words-${language}`, language);
      const { browser, page } = await L.start({
        engine: "chromium",
        name: `fd-words-${language}`,
        size: [820, 1180],
        keepMotionCard: true,
      });
      const text = await page.locator(".motion-card__text").textContent();
      L.check(!/iPhone|phone/.test(text), `${language}: the motion card names no device`, text);
      await browser.close();
    }
  },
};

(async () => {
  const asked = process.argv.slice(2);
  for (const name of asked.length ? asked : Object.keys(CHECKS)) {
    console.log(`== ${name}`);
    await CHECKS[name]();
  }
  console.log(L.failures() ? `${L.failures()} FAILED` : "ALL PASS");
  process.exit(L.failures() ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### Task 0: LIFF 2.31.1 (decision 18), on its own branch

Standalone: it merges, and deploys, ahead of the rest, which branches after it. Use `git -C`, `pnpm -C` or a subshell, never a bare `cd`.

- [ ] **Step 1: Worktree.** `R` is the main checkout (`git rev-parse --show-toplevel` from the session's directory) and `T=$R/.claude/worktrees/liff-2-31-1`: `git -C "$R" fetch origin && git -C "$R" worktree add -b chore/liff-2.31.1 "$T" origin/main && pnpm -C "$T" install`.
- [ ] **Step 2: Pin it.** In `$T/apps/frontend/package.json`, `"@line/liff": "^2.31.0",` becomes `"@line/liff": "2.31.1",`, so the lockfile never floats to a release LINE hasn't noted.
- [ ] **Step 3: The lockfile.** `pnpm -C "$T" install` rewrites `pnpm-lock.yaml`: `@line/liff` and each `@liff/*` package to 2.31.1, and `@line/liff-mock@1.0.4`'s peer to 2.31.1. LIFF Mock needs no change: its peer range is `>= 2.19.0` (`npm view @line/liff-mock@1.0.4 peerDependencies`). Then:
  - `pnpm -C "$T/apps/frontend" list @line/liff @line/liff-mock` → `@line/liff 2.31.1`, `@line/liff-mock 1.0.4`
  - `rg -c "@line/liff@2\.31\.1" "$T/pnpm-lock.yaml"` → a count (the known hit), then `rg -c "@(line|liff)/[a-z-]+@2\.31\.0" "$T/pnpm-lock.yaml"` → no match (exit 1)
  - `git -C "$T" status --short` → only `apps/frontend/package.json` and `pnpm-lock.yaml`
- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$T/apps/frontend" test` and `pnpm -C "$T/apps/frontend" typecheck` → pass.
- [ ] **Step 5: LIFF Mock still installs and signs in.** Write `lib.js` and `checks.js` (Browser checks), start the dev server with `W=$T F=5195 A=8795`, then `node ~/.cache/drawing-app-ipad-foundations/checks.js liff` → `PASS LIFF Mock signs in, and LINE's details show on the slip`. Stop both servers. (The slip's LIFF app row reads `SDK 2.19.0` there: LIFF Mock answers `getVersion` with its own default.)
- [ ] **Step 6: The build carries it.** `pnpm -C "$T/apps/frontend" build`, then `/usr/bin/grep -rlF '"2.31.1"' "$T/apps/frontend/dist/assets"` → at least one file, and `/usr/bin/grep -rlF '"2.31.0"' "$T/apps/frontend/dist/assets"` → none (`rg` would skip the gitignored `dist`).
- [ ] **Step 7: Commit** (no AI attribution lines):

```bash
git -C "$T" add apps/frontend/package.json pnpm-lock.yaml
git -C "$T" commit -F - <<'MSG'
chore(frontend): LIFF 2.31.1, which LINE says to take at once

LINE deprecated LIFF 2.20.0 to 2.31.0 on 2026-09-30 for a security issue with a LIFF app opened in
an external browser through crafted query parameters. Pinned, so the lockfile can't float to a
release LINE hasn't noted.
MSG
```

- [ ] **Step 8:** `TZ=Asia/Tokyo pnpm -C "$T" check` → lint, typecheck, tests, the format check and the Move tests pass (it needs the Sui CLI).
- [ ] **Step 9: Merge and push,** in one command, since other sessions commit on main: `git -C "$R" fetch origin && git -C "$R" merge --ff-only origin/main && git -C "$R" merge --no-edit chore/liff-2.31.1 && git -C "$R" push origin main`. Then `git -C "$R" worktree remove --force "$T" && git -C "$R" branch -d chore/liff-2.31.1`.
- [ ] **Step 10: Deploy,** once ad0ll has signed off decision 18: from a clean worktree at main, `./deploy/deploy.sh` (`deploy/README.md`'s Main only, and the `deploy-with-dev-slip` memory). Its own checks must pass, and the live `StatBoard-*.js` chunk still holds `getFriendship`.

## Setup

- [ ] **Step 1:** Task 0 is on `origin/main`: `git -C "$R" log origin/main --oneline -5` shows it.
- [ ] **Step 2: Worktree.** `W=$R/.claude/worktrees/ipad-foundations`: `git -C "$R" fetch origin && git -C "$R" worktree add -b feat/ipad-foundations "$W" origin/main && pnpm -C "$W" install`.
- [ ] **Step 3: Dev server,** as in Browser checks, with `F=5195 A=8795`; then `node ~/.cache/drawing-app-ipad-foundations/checks.js liff` → `PASS`.
- [ ] Main moves while this runs: each edit names its file and symbol; apply it to the symbol as it stands.

### Task 1: Size classes (decision 3)

**Files:** Create `apps/frontend/src/app/sizeClass.ts`, `apps/frontend/src/app/sizeClass.test.tsx`; modify `apps/frontend/src/app/App.tsx`, `apps/frontend/src/app/App.css`

- [ ] **Step 1: Write the failing test**, `sizeClass.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  observeSizeClass,
  REGULAR_MIN_HEIGHT,
  REGULAR_MIN_WIDTH,
  SHORT_BELOW_HEIGHT,
  sizeClassOf,
  useSizeClass,
  type SizeClass,
} from "./sizeClass";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** happy-dom's ResizeObserver never calls back; this one does when a test resizes the frame. */
class ResizingObserver implements ResizeObserver {
  static live = new Set<ResizingObserver>();
  readonly onResize: ResizeObserverCallback;
  constructor(onResize: ResizeObserverCallback) {
    this.onResize = onResize;
  }
  observe = () => void ResizingObserver.live.add(this);
  unobserve = () => {};
  disconnect = () => void ResizingObserver.live.delete(this);
}

let frame: HTMLDivElement;
let stop = () => {};
const measures = (width: number, height: number) =>
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, width, height));
/** The app starts watching the frame at `width` × `height`. */
const observe = (width: number, height: number) => {
  measures(width, height);
  act(() => {
    stop = observeSizeClass(frame);
  });
};
/** The browser resizes the frame, as a rotation or a window drag does. */
const resize = (width: number, height: number) => {
  measures(width, height);
  act(() => {
    for (const observer of ResizingObserver.live) observer.onResize([], observer);
  });
};
const marks = () => ({ width: frame.dataset.width, height: frame.dataset.height });

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizingObserver);
  frame = document.createElement("div");
  document.body.append(frame);
});

afterEach(() => {
  stop();
  stop = () => {};
  frame.remove();
  history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sizeClassOf", () => {
  it("is regular from REGULAR_MIN_WIDTH wide and REGULAR_MIN_HEIGHT tall, short below SHORT_BELOW_HEIGHT", () => {
    expect(sizeClassOf(REGULAR_MIN_WIDTH, REGULAR_MIN_HEIGHT, false).width).toBe("regular");
    expect(sizeClassOf(REGULAR_MIN_WIDTH - 1, SHORT_BELOW_HEIGHT, false).width).toBe("compact");
    expect(sizeClassOf(REGULAR_MIN_WIDTH, REGULAR_MIN_HEIGHT - 1, false).width).toBe("compact");
    expect(sizeClassOf(REGULAR_MIN_WIDTH, SHORT_BELOW_HEIGHT - 1, false).height).toBe("short");
    expect(sizeClassOf(REGULAR_MIN_WIDTH, SHORT_BELOW_HEIGHT, false).height).toBe("tall");
  });

  it("gives LINE's sheet, half an iPad and phones the phone layout, and a full-screen iPad the regular one", () => {
    // LINE's sheet on an iPad, an iPhone SE in LINE, half an 11-inch iPad, a phone on its side, then
    // an 11-inch iPad in full-screen Safari each way up.
    const frames: [number, number, SizeClass][] = [
      [540, 620, { width: "compact", height: "short" }],
      [375, 591, { width: "compact", height: "short" }],
      [590, 820, { width: "compact", height: "tall" }],
      [844, 390, { width: "compact", height: "short" }],
      [820, 1180, { width: "regular", height: "tall" }],
      [1180, 820, { width: "regular", height: "tall" }],
    ];
    for (const [width, height, sizeClass] of frames)
      expect(sizeClassOf(width, height, false)).toEqual(sizeClass);
  });

  it("keeps the desktop phone frame compact at any size", () => {
    expect(sizeClassOf(REGULAR_MIN_WIDTH * 2, SHORT_BELOW_HEIGHT * 2, true).width).toBe("compact");
  });
});

describe("observeSizeClass", () => {
  it("marks the frame as it starts and on every resize", () => {
    observe(390, 844);
    expect(marks()).toEqual({ width: "compact", height: "tall" });
    resize(1180, 820);
    expect(marks()).toEqual({ width: "regular", height: "tall" });
    resize(540, 620);
    expect(marks()).toEqual({ width: "compact", height: "short" });
  });

  it("takes the width the dev server's ?layout= asks for, whatever the frame measures", () => {
    history.replaceState(null, "", "/?as=someone&layout=regular");
    observe(390, 844);
    expect(marks()).toEqual({ width: "regular", height: "tall" });
    stop();
    history.replaceState(null, "", "/?layout=compact");
    observe(1180, 820);
    expect(marks()).toEqual({ width: "compact", height: "tall" });
  });
});

describe("useSizeClass", () => {
  it("lays out again when the frame changes class", () => {
    function Shows() {
      const { width, height } = useSizeClass();
      return <p>{`${width} ${height}`}</p>;
    }
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<Shows />));
    observe(390, 844);
    expect(host.textContent).toBe("compact tall");
    resize(1180, 820);
    expect(host.textContent).toBe("regular tall");
    act(() => root.unmount());
    host.remove();
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/app/sizeClass.test.tsx` → fails: `./sizeClass` doesn't exist.
- [ ] **Step 3: Implement** `sizeClass.ts`:

```ts
import { useSyncExternalStore } from "react";

/** Regular from this frame width, in CSS px: an iPad's full-screen browser, never LINE's sheet on one. */
export const REGULAR_MIN_WIDTH = 700;
/** Regular also needs this height, so a phone on its side, wide and short, stays compact. */
export const REGULAR_MIN_HEIGHT = 600;
/** Short below this frame height: LINE's sheet on an iPad, an iPhone SE in LINE, a phone on its side. */
export const SHORT_BELOW_HEIGHT = 700;

/**
 * The app frame's size class: whether its width takes the regular layout or the phone's, and whether
 * its height needs the short pass.
 */
export type SizeClass = { width: "compact" | "regular"; height: "short" | "tall" };

/** A frame `width` × `height` CSS px. The desktop phone frame (`framed`) is a phone, so it's compact. */
export function sizeClassOf(width: number, height: number, framed: boolean): SizeClass {
  const regular = !framed && width >= REGULAR_MIN_WIDTH && height >= REGULAR_MIN_HEIGHT;
  return {
    width: regular ? "regular" : "compact",
    height: height < SHORT_BELOW_HEIGHT ? "short" : "tall",
  };
}

/** A phone's, until the frame is first measured. */
let current: SizeClass = { width: "compact", height: "tall" };
const listeners = new Set<() => void>();

/** The app frame's size class as last measured. */
export const readSizeClass = (): SizeClass => current;

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

/** The app frame's size class, following resizes and rotations, for layouts in code. */
export function useSizeClass(): SizeClass {
  return useSyncExternalStore(subscribe, readSizeClass);
}

/** The dev server's `?layout=regular|compact`: the width class to show, whatever the frame measures. */
function layoutAsked(): SizeClass["width"] | null {
  if (!import.meta.env.DEV) return null;
  const asked = new URLSearchParams(location.search).get("layout");
  return asked === "regular" || asked === "compact" ? asked : null;
}

/**
 * Measures the app's frame now and on every resize, marks it `data-width` and `data-height` for CSS,
 * and tells `useSizeClass`. It goes by the frame's own size, never the device: inside LINE's sheet on
 * an iPad, the frame is the sheet. Returns what stops it.
 */
export function observeSizeClass(frame: HTMLElement): () => void {
  const asked = layoutAsked();
  const measure = () => {
    const { width, height } = frame.getBoundingClientRect();
    // The desktop phone frame says so itself (App.css).
    const framed = getComputedStyle(frame).getPropertyValue("--phone-frame").trim() === "1";
    const measured = sizeClassOf(width, height, framed);
    const next: SizeClass = asked ? { ...measured, width: asked } : measured;
    frame.dataset.width = next.width;
    frame.dataset.height = next.height;
    if (next.width === current.width && next.height === current.height) return;
    current = next;
    for (const listener of listeners) listener();
  };
  measure();
  const resizes = new ResizeObserver(measure);
  resizes.observe(frame);
  return () => resizes.disconnect();
}
```

- [ ] **Step 4:** Run the same test file → passes.
- [ ] **Step 5: Mark the app's frame.** In `App.tsx`, `import { observeSizeClass } from "./sizeClass";` beside the other `./` imports, and after `useFocusLoop(phone, drawing);`:

```tsx
// The frame's size class marks it for CSS and tells useSizeClass, from the first paint on.
useLayoutEffect(() => {
  const frame = phone.current;
  return frame ? observeSizeClass(frame) : undefined;
}, []);
```

In `App.css`, the desktop frame's comment ends `…the screen's radius plus the bezel. It tells sizeClass.ts it's there (--phone-frame); the dev server's ?layout=regular drops it, to preview the regular layout. */`, and inside its media query `.phone {` becomes:

```css
  .phone:not([data-width="regular"]) {
    --phone-frame: 1;
```

(the rule's other lines, and `#root`'s, stay as they are).

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/app` and `pnpm -C "$W/apps/frontend" typecheck` → pass. App's tests render `.phone` with happy-dom's ResizeObserver, which never calls back: they see the first measure only.
- [ ] **Step 7:** `node ~/.cache/drawing-app-ipad-foundations/checks.js marks` → every line `PASS`.
- [ ] **Step 8: Commit:** `feat(frontend): size classes mark the app's frame regular or compact, short or tall`

### Task 2: The Device paper (spec section 5)

Read `~/.claude/skills/impeccable/reference/craft-floor.md` before this UI edit, and judge the paper through `/impeccable layout`.

**Files:** Create `apps/frontend/src/performance/deviceFacts.ts`, `deviceFacts.test.ts`, `apps/frontend/src/sticker-board/stat-board/DeviceDetails.tsx`, `DeviceDetails.test.tsx`, `device-details.css`; modify `stat-board/StatBoard.tsx`, `i18n/strings/stickerBoard.ts` (`developer`), `performance/performanceRecorder.ts` (`describeDevice`), `performanceRecorder.test.ts`, `performanceReport.ts` (a comment)

The paper's rows are generated text, as the performance report is: their labels and values come from `deviceFacts.ts`, which the report shares, and the slip's own words (its heading, Copy and what Copy says) are in the catalog under `developer`, English only.

- [ ] **Step 1: Write the failing test**, `performance/deviceFacts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deviceFactRows, type DeviceFacts } from "./deviceFacts";

/** Safari on an 11-inch iPad Air in landscape with a Pencil paired, as WebKit's source answers. */
const ipadInSafari: DeviceFacts = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
  platform: "MacIntel",
  touchPoints: 5,
  viewport: { width: 1180, height: 760 },
  visualViewport: { width: 1180, height: 459.5, left: 0, top: 0, scale: 1 },
  screen: { width: 1180, height: 820, orientation: "landscape-primary" },
  pixelRatio: 2,
  safeArea: { top: 0, right: 0, bottom: 20, left: 0 },
  media: [
    { feature: "hover", matches: ["none"] },
    { feature: "any-hover", matches: ["none"] },
    { feature: "pointer", matches: ["coarse"] },
    { feature: "any-pointer", matches: ["fine", "coarse"] },
  ],
};
const regular = { width: "regular", height: "tall" } as const;

describe("the device's facts", () => {
  it("read as a row a fact, with the app's size class last", () => {
    expect(deviceFactRows(ipadInSafari, regular)).toEqual([
      ["User agent", ipadInSafari.userAgent],
      ["Platform", "MacIntel · 5 touch points"],
      ["Viewport", "1180×760 · visual 1180×460 at 0,0, scale 1"],
      ["Screen", "1180×820 at 2x landscape-primary"],
      ["Safe areas", "top 0 · right 0 · bottom 20 · left 0"],
      ["Media", "hover none · any-hover none · pointer coarse · any-pointer fine coarse"],
      ["Size class", "regular · tall"],
    ]);
  });

  it("say what a browser leaves out", () => {
    const bare: DeviceFacts = {
      ...ipadInSafari,
      platform: "",
      visualViewport: null,
      screen: { width: 1180, height: 820, orientation: null },
      media: [{ feature: "any-pointer", matches: [] }],
    };
    const rows = new Map(deviceFactRows(bare, regular));
    expect(rows.get("Platform")).toBe("none · 5 touch points");
    expect(rows.get("Viewport")).toBe("1180×760 · no visual viewport");
    expect(rows.get("Screen")).toBe("1180×820 at 2x");
    expect(rows.get("Media")).toBe("any-pointer nothing");
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/performance/deviceFacts.test.ts` → fails: `./deviceFacts` doesn't exist.
- [ ] **Step 3: Implement** `performance/deviceFacts.ts`:

```ts
import type { SizeClass } from "../app/sizeClass";

interface Size {
  width: number;
  height: number;
}
type Side = "top" | "right" | "bottom" | "left";
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

/**
 * What a device and its browser say about themselves, as far as a layout depends on it: for the
 * developer slip's Device paper and the performance report, where no developer tools reach.
 */
export interface DeviceFacts {
  userAgent: string;
  platform: string;
  touchPoints: number;
  viewport: Size;
  /** The part of the page on screen; null where the browser has none. */
  visualViewport: (Size & { left: number; top: number; scale: number }) | null;
  screen: Size & { orientation: string | null };
  pixelRatio: number;
  /** env(safe-area-inset-*), in CSS px. */
  safeArea: Record<Side, number>;
  /** Each media feature with the values it matches. */
  media: { feature: string; matches: string[] }[];
}

/** The media features an iPad answers its own way, each with the values it can match. */
const MEDIA_FEATURES = [
  { feature: "hover", values: ["hover", "none"] },
  { feature: "any-hover", values: ["hover", "none"] },
  { feature: "pointer", values: ["fine", "coarse", "none"] },
  { feature: "any-pointer", values: ["fine", "coarse", "none"] },
];

/** env(safe-area-inset-*), through a probe padded by them, since script can't read env(). */
function readSafeArea(): Record<Side, number> {
  const probe = document.createElement("div");
  probe.style.setProperty("position", "fixed");
  probe.style.setProperty("visibility", "hidden");
  for (const side of SIDES)
    probe.style.setProperty(`padding-${side}`, `env(safe-area-inset-${side})`);
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const px = (side: Side) =>
    Math.round(Number.parseFloat(style.getPropertyValue(`padding-${side}`)) || 0);
  const safeArea = { top: px("top"), right: px("right"), bottom: px("bottom"), left: px("left") };
  probe.remove();
  return safeArea;
}

/** What the device and its browser say now. */
export function readDeviceFacts(): DeviceFacts {
  const visual = window.visualViewport;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    touchPoints: navigator.maxTouchPoints,
    viewport: { width: innerWidth, height: innerHeight },
    visualViewport: visual
      ? {
          width: visual.width,
          height: visual.height,
          left: visual.offsetLeft,
          top: visual.offsetTop,
          scale: visual.scale,
        }
      : null,
    screen: {
      width: screen.width,
      height: screen.height,
      orientation: screen.orientation?.type ?? null,
    },
    pixelRatio: devicePixelRatio,
    safeArea: readSafeArea(),
    media: MEDIA_FEATURES.map(({ feature, values }) => ({
      feature,
      matches: values.filter((value) => matchMedia(`(${feature}: ${value})`).matches),
    })),
  };
}

/**
 * Calls `onChange` whenever what the device says may have changed: a turn, a resize or a zoom, or a
 * Pencil, trackpad or mouse coming or going. Returns what stops it.
 */
export function watchDeviceFacts(onChange: () => void): () => void {
  const media = MEDIA_FEATURES.flatMap(({ feature, values }) =>
    values.map((value) => matchMedia(`(${feature}: ${value})`)),
  );
  window.addEventListener("resize", onChange);
  window.visualViewport?.addEventListener("resize", onChange);
  screen.orientation?.addEventListener("change", onChange);
  for (const query of media) query.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.visualViewport?.removeEventListener("resize", onChange);
    screen.orientation?.removeEventListener("change", onChange);
    for (const query of media) query.removeEventListener("change", onChange);
  };
}

const size = ({ width, height }: Size) => `${Math.round(width)}×${Math.round(height)}`;

/** The facts as labeled rows, the app's size class last: the Device paper's rows, the report's lines. */
export function deviceFactRows(facts: DeviceFacts, sizeClass: SizeClass): [string, string][] {
  const visual = facts.visualViewport;
  const viewport = visual
    ? `${size(facts.viewport)} · visual ${size(visual)} at ${Math.round(visual.left)},${Math.round(visual.top)}, scale ${visual.scale}`
    : `${size(facts.viewport)} · no visual viewport`;
  const screenParts = [size(facts.screen), `at ${facts.pixelRatio}x`, facts.screen.orientation];
  const media = facts.media.map(
    ({ feature, matches }) => `${feature} ${matches.join(" ") || "nothing"}`,
  );
  return [
    ["User agent", facts.userAgent],
    ["Platform", `${facts.platform || "none"} · ${facts.touchPoints} touch points`],
    ["Viewport", viewport],
    ["Screen", screenParts.filter(Boolean).join(" ")],
    ["Safe areas", SIDES.map((side) => `${side} ${facts.safeArea[side]}`).join(" · ")],
    ["Media", media.join(" · ")],
    ["Size class", `${sizeClass.width} · ${sizeClass.height}`],
  ];
}

/** The rows as a report's lines. */
export const deviceLines = (facts: DeviceFacts, sizeClass: SizeClass) =>
  deviceFactRows(facts, sizeClass).map(([label, value]) => `${label}: ${value}`);

/** The facts as text to paste into a chat. */
export const formatDeviceDetails = (facts: DeviceFacts, sizeClass: SizeClass, takenAt: Date) =>
  [`Device details, taken ${takenAt.toISOString()}`, ...deviceLines(facts, sizeClass)].join("\n");
```

- [ ] **Step 4:** Run the same test file → passes.
- [ ] **Step 5: Write the failing test**, `stat-board/DeviceDetails.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeSizeClass } from "../../app/sizeClass";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { ToastProvider } from "../../ui/ToastProvider";
import { DeviceDetails } from "./DeviceDetails";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const strings = stickerBoard.developer.device;
const writeText = vi.fn<(text: string) => Promise<void>>();
let host: HTMLDivElement;
let root: Root;
let stopSizing = () => {};

/** The window, and the app's frame filling it, at `width` × `height`. */
function windowAt(width: number, height: number) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
  const frame = document.createElement("div");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, width, height));
  stopSizing();
  stopSizing = observeSizeClass(frame);
}
/** The paper's value for `label`. */
const row = (label: string) =>
  [...host.querySelectorAll(".account-rows__row")]
    .find((r) => r.querySelector("dt")?.textContent === label)
    ?.querySelector("dd")?.textContent;
const copy = () =>
  act(async () =>
    [...host.querySelectorAll("button")].find((b) => b.textContent === strings.copy.en)?.click(),
  );
// AccountRow's Copy toasts, so the paper renders inside a ToastProvider, as on the slip.
const render = () =>
  act(() =>
    root.render(
      <ToastProvider>
        <DeviceDetails />
      </ToastProvider>,
    ),
  );

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  stopSizing();
  stopSizing = () => {};
  writeText.mockReset();
  vi.restoreAllMocks();
});

describe("DeviceDetails", () => {
  it("says what the device says, with the app's size class, and copies it whole", async () => {
    windowAt(1180, 820);
    render();
    expect(row("Viewport")).toMatch(/^1180×820 /);
    expect(row("Size class")).toBe("regular · tall");
    writeText.mockResolvedValue();
    await copy();
    const copied = writeText.mock.lastCall?.[0] ?? "";
    expect(copied).toMatch(/^Device details, taken .+\nUser agent: /);
    expect(copied).toContain("\nSize class: regular · tall");
    expect(host.querySelector('.device-details [role="status"]')?.textContent).toBe(
      strings.copied.en,
    );
  });

  it("follows the window as it turns", () => {
    windowAt(820, 1180);
    render();
    windowAt(1180, 820);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(row("Viewport")).toMatch(/^1180×820 /);
  });

  it("says why the clipboard refused, and leaves the details to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    windowAt(820, 1180);
    render();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copy();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      strings.notCopied.en.replace("{{reason}}", "Not allowed here"),
    );
    expect(host.querySelector("textarea")?.value).toContain("Viewport: 820×1180");
  });
});
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/stat-board/DeviceDetails.test.tsx` → fails: `./DeviceDetails` doesn't exist.
- [ ] **Step 7: Implement.** In `stickerBoard.ts`, inside `developer`, after `performance: { … },`:

```ts
    device: {
      title: { en: "Device" },
      copy: { en: "Copy device details" },
      copied: { en: "Copied. Paste it into the chat." },
      notCopied: {
        en: "The device details couldn’t be copied: {{reason}}. They’re below to copy by hand.",
      },
      text: { en: "Device details" },
    },
```

`stat-board/DeviceDetails.tsx`:

```tsx
import { useLayoutEffect, useState } from "react";
import { useSizeClass } from "../../app/sizeClass";
import { useTranslation } from "../../i18n/react";
import { AccountRow } from "../../identity/AccountRow";
import { Copy } from "../../icons";
import {
  deviceFactRows,
  formatDeviceDetails,
  readDeviceFacts,
  watchDeviceFacts,
  type DeviceFacts,
} from "../../performance/deviceFacts";
import { ErrorLine } from "../../ui/ErrorLine";
import { LabelButton } from "../../ui/LabelButton";
import "./device-details.css";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The developer slip's Device paper: what the device and its browser say about themselves and the
 * app's size class, following every turn and resize, with Copy for a report from a real iPad.
 */
export function DeviceDetails() {
  const { t } = useTranslation();
  const sizeClass = useSizeClass();
  const [facts, setFacts] = useState<DeviceFacts | null>(null);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The details, to copy by hand after the clipboard refused them. */
  const [uncopied, setUncopied] = useState<string | null>(null);

  // Read before the first paint, then again whenever a turn, a resize, a zoom or a pointing device
  // may have changed them.
  useLayoutEffect(() => {
    const read = () => setFacts(readDeviceFacts());
    read();
    return watchDeviceFacts(read);
  }, []);
  if (!facts) return null;

  const copy = async () => {
    const text = formatDeviceDetails(facts, sizeClass, new Date());
    setCopied(false);
    setProblem(null);
    setUncopied(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error("The device details couldn't be copied", error);
      setProblem(t(($) => $.stickerBoard.developer.device.notCopied, { reason: reason(error) }));
      setUncopied(text);
    }
  };

  return (
    <div className="device-details">
      <h3 className="fine device-details__h">{t(($) => $.stickerBoard.developer.device.title)}</h3>
      <dl className="account-rows">
        {deviceFactRows(facts, sizeClass).map(([label, value]) => (
          <AccountRow key={label} label={label} value={value} />
        ))}
      </dl>
      {/* The clipboard wants the tap's own click, which the press would fire late. */}
      <LabelButton size="sm" icon={<Copy />} data-press="off" onClick={() => void copy()}>
        {t(($) => $.stickerBoard.developer.device.copy)}
      </LabelButton>
      <p className="fine device-details__note" role="status">
        {copied ? t(($) => $.stickerBoard.developer.device.copied) : ""}
      </p>
      {problem && <ErrorLine>{problem}</ErrorLine>}
      {uncopied && (
        <textarea
          className="device-details__text"
          aria-label={t(($) => $.stickerBoard.developer.device.text)}
          readOnly
          value={uncopied}
        />
      )}
    </div>
  );
}
```

`stat-board/device-details.css`:

```css
/* ---------- The Device paper, on the developer slip ---------- */

.device-details {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--rule-strong);
}

.device-details__h {
  margin: 0;
  color: var(--ink);
  font-weight: 700;
  letter-spacing: 0.1em;
}

.device-details > .label-btn {
  justify-self: start;
}

.device-details__note {
  margin: -2px 0 0;
}

/* In the app's own face, not the system monospace, whose zero is slashed too. */
.device-details__text {
  min-height: 160px;
  font: 500 13px/1.4 var(--font-ui);
  -webkit-user-select: text;
  user-select: text;
}

.device-details :focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
}
```

In `StatBoard.tsx`, `import { DeviceDetails } from "./DeviceDetails";`, and `<DeviceDetails />` goes into the `DeveloperSlip`'s children right after `<LineDetails />`, so the device's facts follow LINE's.

- [ ] **Step 8:** Run the DeviceDetails test → passes.
- [ ] **Step 9: The report shares the facts.** In `performanceRecorder.test.ts`, the test `"says when the clock moves in whole ms, as WebKit's does"` becomes:

```ts
it("says what the device says, and when the clock moves in whole ms, as WebKit's does", () => {
  let t = 0;
  const now = vi.spyOn(performance, "now").mockImplementation(() => Math.floor((t += 0.3)));
  const device = describeDevice();
  expect(device).toMatch(/^User agent: .+\nPlatform: /);
  expect(device).toContain("\nSize class: ");
  expect(device).toMatch(/\nClock: 1ms steps$/);
  now.mockImplementation(() => (t += 0.005));
  expect(describeDevice()).not.toContain("Clock");
});
```

`TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/performance/performanceRecorder.test.ts` → that test fails. Then `performanceRecorder.ts` imports `readSizeClass` from `../app/sizeClass` and `deviceLines, readDeviceFacts` from `./deviceFacts`, and `describeDevice` becomes:

```ts
/** The device and its browser, for the report, and the clock's step where it's a whole ms or more. */
export function describeDevice(): string {
  const lines = deviceLines(readDeviceFacts(), readSizeClass());
  const step = clockStepMs();
  if (step >= 1) lines.push(`Clock: ${Math.round(step)}ms steps`);
  return lines.join("\n");
}
```

In `performanceReport.ts`, the comment on `ReportInput`'s `device` says "The device and its browser" in place of "The phone and browser". Run the recorder's tests again → pass.

- [ ] **Step 10:** `pnpm -C "$W/apps/frontend" typecheck` and `pnpm -C "$W/apps/frontend" lint` → pass; `node ~/.cache/drawing-app-ipad-foundations/checks.js device` → every line `PASS`. Look at `shots/device-paper-*-540x620.png`.
- [ ] **Step 11: Commit:** `feat(frontend): the developer slip's Device paper says what the device says`

### Task 3: The Pencil summary (spec section 5)

Read the craft floor before this UI edit, and judge the slip's new lines through `/impeccable layout`.

**Files:** Modify `apps/frontend/src/performance/performanceRecorder.ts`, `performanceRecorder.test.ts`, `performanceReport.ts`, `performanceReport.test.ts`, `sticker-board/stat-board/PerformanceRecorderControls.tsx`, its test, `performance-recorder-controls.css`, `i18n/strings/stickerBoard.ts` (`developer.performance.what`)

Per kind of pointer: contacts begun, moves in contact, moves hovering (a Pencil hovers with nothing pressed), the pressure's range, the contact's width and height ranges, and the coalesced and predicted samples a move carried. For the device session's palm question, Clear between trials (a resting palm, then a fingertip) keeps each range to one kind of contact.

- [ ] **Step 1: Write the failing test**, in `performanceRecorder.test.ts`'s `describe("the recorder on the page")`:

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

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/performance/performanceRecorder.test.ts` → fails: the summary has no `pointers`.
- [ ] **Step 3: Implement** in `performanceRecorder.ts`. The module's comment gains the pointers: `…and what happened around each slow one, and each kind of pointer seen, for checking a Pencil. Off, it costs…`. After `PerformanceSummary`'s interface:

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
        if (sample.kind === "move") pointers.set(sample.pointerType, { ...was, hovers: was.hovers + 1 });
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
/** The parts of a PointerEvent the recorder reads; outside a secure context there's no coalesced list. */
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

In `startListening`, `hear("pointerdown", onTap);` gives way to the first hearing below, and the second follows `hear("pointerup", onTap);`:

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

- [ ] **Step 4:** Run the recorder's tests → pass. `"records a slow frame … then stops all it started"` still holds: `hear` adds its stop for the new listener.
- [ ] **Step 5: Write the failing tests** for the report. In `performanceReport.test.ts`, the imports take `type PointerKindSummary` and `formatPointerLine`, the `summary` literal gains `pointers: new Map(),`, and in `describe("the performance report")`:

```ts
const pen: PointerKindSummary = {
  downs: 2,
  moves: 400,
  hovers: 57,
  pressure: { min: 0.03, max: 0.97 },
  width: { min: 0.5, max: 0.5 },
  height: { min: 0.5, max: 0.5 },
  coalesced: { total: 1560, most: 6 },
  predicted: { total: 400, most: 2 },
};

it("sums up each kind of pointer: contacts and hovering, pressure, contact and samples a move", () => {
  const finger: PointerKindSummary = {
    downs: 1,
    moves: 0,
    hovers: 0,
    pressure: { min: 0, max: 0 },
    width: { min: 30, max: 41.5 },
    height: { min: 30, max: 41.5 },
    coalesced: { total: 0, most: 0 },
    predicted: null,
  };
  expect(
    report({
      pointers: new Map([
        ["pen", pen],
        ["touch", finger],
      ]),
    }),
  ).toContain(
    [
      "Pointers",
      "  pen: 2 down, 400 moves, 57 hovering · pressure 0.03–0.97 · contact 0.5–0.5 × 0.5–0.5px · 3.9 coalesced a move (most 6) · 1.0 predicted a move (most 2)",
      "  touch: 1 down, 0 moves, 0 hovering · pressure 0.00–0.00 · contact 30.0–41.5 × 30.0–41.5px · 0.0 coalesced a move (most 0) · no predicted events",
    ].join("\n"),
  );
});

it("says when no pointer was seen, and when a hovering pen never touched", () => {
  expect(report()).toContain("Pointers: none seen");
  const hovering = { ...pen, downs: 0, moves: 0, pressure: null, width: null, height: null };
  expect(formatPointerLine("pen", hovering)).toBe("pen: 0 down, 0 moves, 57 hovering · no contact");
});
```

- [ ] **Step 6:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/performance/performanceReport.test.ts` → the two new tests fail.
- [ ] **Step 7: Implement** in `performanceReport.ts`. The type import takes `PointerKindSummary`, `SampleCount` and `Span` too; after `calls`:

```ts
const range = ({ min, max }: Span, digits: number) =>
  `${min.toFixed(digits)}–${max.toFixed(digits)}`;

/** Samples a move, on average and at most, or that the browser has no such list. */
const perMove = (samples: SampleCount | null, moves: number, name: string) =>
  samples === null
    ? `no ${name} events`
    : `${(moves > 0 ? samples.total / moves : 0).toFixed(1)} ${name} a move (most ${samples.most})`;

/** One kind of pointer: its contacts and hovering, how hard and how big, and the samples a move carried. */
export function formatPointerLine(type: string, kind: PointerKindSummary): string {
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
  return [
    "Pointers",
    ...[...pointers].map(([type, kind]) => `  ${formatPointerLine(type, kind)}`),
    "",
  ];
}
```

In `formatPerformanceReport`'s `lines`, between the `""` after the 30 fps line and `"Slow frames by screen"`: `...pointerLines(summary.pointers),`. Run the report's tests → pass.

- [ ] **Step 8: The slip shows them.** In `PerformanceRecorderControls.test.tsx`'s describe:

```tsx
it("lists each kind of pointer it has seen under its summary", () => {
  record();
  act(() => {
    window.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "pen", buttons: 1, pressure: 0.5 }),
    );
    vi.advanceTimersByTime(1000);
  });
  expect(control(".performance-recorder__pointers").textContent).toMatch(/^pen: 1 down/);
});
```

`TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/stat-board/PerformanceRecorderControls.test.tsx` → fails. Then `PerformanceRecorderControls.tsx` imports `formatPointerLine` beside `formatPerformanceReport, formatSummaryLine`, and after the summary's `<p>`:

```tsx
{
  summary && summary.pointers.size > 0 && (
    <ul className="performance-recorder__pointers">
      {[...summary.pointers].map(([type, kind]) => (
        <li key={type}>{formatPointerLine(type, kind)}</li>
      ))}
    </ul>
  );
}
```

`performance-recorder-controls.css`, after `.performance-recorder__summary`:

```css
/* Each kind of pointer seen, a line each, for checking a Pencil. */
.performance-recorder__pointers {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font: 500 13px/1.4 var(--font-ui);
  font-variant-numeric: tabular-nums;
}
```

`stickerBoard.ts`: `developer.performance.what` becomes `{ en: "Slow frames and what happened around them, and each kind of pointer. While it’s on, it records from the app’s start." }`. Run the controls' tests → pass.

- [ ] **Step 9:** `pnpm -C "$W/apps/frontend" typecheck` and `lint` → pass; `node ~/.cache/drawing-app-ipad-foundations/checks.js pen` → every line `PASS`.
- [ ] **Step 10: Commit:** `feat(frontend): the performance recorder sums up each kind of pointer`

### Task 4: Bottom sheets clear the home indicator

Read the craft floor before this UI edit, and judge it through `/impeccable adapt`.

**Files:** Modify `apps/frontend/src/styles/tokens.css`, `app/App.css` (`.screen`), `ui/sheet.css` (`.bottom-sheet`), `receiving/receive-gift-dialog.css` (`.receive-gift__sheet.bottom-sheet`), `tickets/tickets.css` (`.out-of-tickets`), `tickets/ReserveTicketCheckout.css`

- [ ] **Step 1: The failing check.** `node ~/.cache/drawing-app-ipad-foundations/checks.js foot` → `FAIL` for the sheet over the tabs (24px) and for the checkout over the Shop (14px); `PASS` for the card over the board.
- [ ] **Step 2: The token and its reset.** In `tokens.css`, after `--tabs-strip`:

```css
/* The home indicator's safe area under a layer that reaches the screen's foot. Inside .screen,
     which ends above the tab strip, it's 0 (App.css): the strip clears the indicator there. */
--foot-inset: env(safe-area-inset-bottom);
```

In `App.css`, `.screen` gains `--foot-inset: 0px;` as its first declaration, and its comment a sentence: `It ends above the tab strip, which clears the home indicator, so nothing in it pads the foot's safe area.`

- [ ] **Step 3: Sheets pad it.** In `sheet.css`, `.bottom-sheet` gains, first:

```css
/* The home indicator's safe area the paper runs down over, under its content (tokens.css). */
--sheet-foot-inset: var(--foot-inset, 0px);
```

and its `padding: 0 20px 24px;` becomes `padding: 0 20px calc(24px + var(--sheet-foot-inset));`. In `receive-gift-dialog.css`, `.receive-gift__sheet.bottom-sheet`'s `padding-bottom: 30px;` becomes `padding-bottom: calc(30px + var(--sheet-foot-inset));`.

- [ ] **Step 4: Ticket cards pad it.** In `tickets.css`, `.out-of-tickets`'s `padding: 14px;` becomes `padding: 14px 14px calc(14px + var(--foot-inset, 0px));`, and its comment gains `Over the tabs, as the checkout is over the Shop, it clears the home indicator.` In `ReserveTicketCheckout.css`, the rule that did that for the checkout alone goes, with its comment: `.phone > .reserve-checkout { padding-bottom: calc(14px + env(safe-area-inset-bottom)); }`.
- [ ] **Step 5:** `checks.js foot` → every line `PASS`.
- [ ] **Step 6: Commit:** `fix(frontend): sheets over the tabs pad the home indicator's safe area`

### Task 5: The out-of-tickets card no longer rides the board up

Read the craft floor before this UI edit, and judge it through `/impeccable adapt`.

**Files:** Modify `apps/frontend/src/sticker-board/StickerBoard.css` (`.board`), `sticker-creation/DrawingScreen.css` (`.drawing-screen`), `app/App.css` (the desktop frame)

- [ ] **Step 1: The failing check.** `node ~/.cache/drawing-app-ipad-foundations/checks.js shift` → `FAIL … webkit reduce …: the board stays put under the card` at every size (`scrolls` lists 42, then 0); `PASS` in Chromium and in WebKit without reduced motion.
- [ ] **Step 2: Clip without scrolling.** In `StickerBoard.css`, `.board`'s `overflow: hidden;` becomes `overflow: clip;`, and its comment ends `It clips without being a scroll container, so a card focused as it rises from past its foot can't scroll it.` In `DrawingScreen.css`, `.drawing-screen`'s `overflow: hidden;` becomes `overflow: clip;`, and its comment ends `It clips without being a scroll container, so a ticket card focused as it rises can't scroll it.` In `App.css`, the desktop frame's `.phone:not([data-width="regular"])` takes `overflow: clip;` in place of `overflow: hidden;`: the motion card and the checkout over the Shop sit on the phone itself.
- [ ] **Step 3:** `checks.js shift` → every line `PASS`. Look at `shots/out-of-tickets-webkit-*.png`: the header sits where it did, and the scrim reaches the tabs.
- [ ] **Step 4:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board src/sticker-creation` → pass.
- [ ] **Step 5: Commit:** `fix(frontend): the out-of-tickets card no longer rides the board up`

### Task 6: Sheets and cards at one content width (decision 14)

Read the craft floor before this UI edit, and work through `/impeccable adapt`: phones stay as they are; in regular width nothing stretches past `--content-w`.

**Files:** Modify `apps/frontend/src/styles/tokens.css`, `ui/sheet.css`, `tickets/tickets.css`, `sticker-creation/sealing/SealedCard.css`, `app/motion-permission-card.css`, `giving/Giving.css` (`.giving__acts .key`), `receiving/receive-gift-dialog.css` (`.receive-gift__acts .key`), `receiving/send-gratitude-sheet.css`, `sticker-board/tray/sticker-tray.css` (`.tray__pulled .tray__paper`)

The sheet and sealed card rules are written `:where(.phone[data-width="regular"]) …`, as low in specificity as `.bottom-sheet` itself, so a surface's own rule (the dialogs plan's page, the send gratitude sheet's gutters) wins without resetting anything. A sheet that places itself, such as the color popover, carries `bottom-sheet--popover`, and the card rule leaves it alone entirely.

- [ ] **Step 1: The failing checks.** `node ~/.cache/drawing-app-ipad-foundations/checks.js sheets cards sealed` → `FAIL` at the regular sizes, 744×1133, 1133×690, 820×1180, 1180×820 and 1376×1032 (sheets and cards span the frame, keys stretch); `PASS` at the compact ones, 390×844, 375×591, 540×564 and 540×620.
- [ ] **Step 2: Tokens.** In `tokens.css`, the phone's group loses `--ph-status`, `--ph-liff` and `--ph-safe`, its comment becomes `/* The desktop phone frame (App.css): an iPhone 13/14 viewport in a bezel */`, and after it:

```css
/* Regular width (app/sizeClass.ts): the one width cards, sheets and columns take, so nothing
     stretches across a big screen. A starting value, tuned from screenshots. */
--content-w: 520px;
/* The least a key narrows to where it keeps its own width, as at a card's or sheet's foot. */
--key-min-w: 232px;
```

and after `--shadow-sheet`:

```css
--shadow-float:
  0 0 0 0.5px rgba(28, 24, 36, 0.18), 3px 7px 8px rgba(28, 24, 36, 0.16),
  8px 18px 30px rgba(28, 24, 36, 0.18); /* held over the page: a sheet out of the tray, a floating card */
```

- [ ] **Step 3: Sheets.** In `sheet.css`, both keyframes slide by `--sheet-away`: `bottom-sheet-in`'s `from` and `bottom-sheet-out`'s `to` become `transform: translateY(var(--sheet-away, 104%));`. After `bottom-sheet-out`:

```css
/* Regular width (app/sizeClass.ts): a card at the content width, lifted off its layer's foot and
   rounded all round, so it never stretches across a big screen, sliding in from below whatever its
   lift. As low in specificity as .bottom-sheet, so a surface's own rule wins; a sheet that places
   itself, as a popover does, carries bottom-sheet--popover and is left alone. */
:where(.phone[data-width="regular"]) .bottom-sheet:not(:where(.bottom-sheet--popover)) {
  --sheet-foot-inset: 0px;
  --sheet-lift: calc(var(--gutter) + var(--foot-inset, 0px));
  --sheet-away: calc(100% + var(--sheet-lift));
  bottom: var(--sheet-lift);
  width: min(var(--content-w), calc(100% - 2 * var(--gutter)));
  margin-inline: auto;
  border-radius: 16px;
  box-shadow: var(--shadow-float);
}

/* On the phone itself it floats above the tab strip, as the toast does, rather than over the tabs. */
:where(.phone[data-width="regular"]) > .bottom-sheet:not(:where(.bottom-sheet--popover)) {
  --sheet-lift: calc(var(--tabs-strip) + var(--gutter));
}
```

- [ ] **Step 4: Ticket cards,** at the end of `tickets.css`:

```css
/* Regular width (app/sizeClass.ts): the card centers on the screen at the content width, and its key
   and the label under it keep their own width rather than stretching across it. */
.phone[data-width="regular"] .out-of-tickets {
  align-items: center;
  justify-content: center;
}

.phone[data-width="regular"] .out-of-tickets__card {
  width: min(100%, var(--content-w));
}

.phone[data-width="regular"] .out-of-tickets__key {
  width: auto;
  min-width: var(--key-min-w);
  max-width: 100%;
}

.phone[data-width="regular"] .out-of-tickets__card > .label-btn--block {
  width: fit-content;
  min-width: var(--key-min-w);
  max-width: 100%;
  margin-inline: auto;
}
```

The checkout's purchases and address labels sit in its scrolling body, not on the card itself, so they keep the body's width.

- [ ] **Step 5: The sealed card,** at the end of `SealedCard.css`:

```css
/* Regular width (app/sizeClass.ts): the content width over the foot, where the ceremony lands the
   sticker, its key and the label under it at their own width. */
:where(.phone[data-width="regular"]) .sealed-card {
  left: 0;
  right: 0;
  width: min(var(--content-w), calc(100% - 28px));
  margin-inline: auto;
}

:where(.phone[data-width="regular"]) .sealed-card .sealed-card__key,
:where(.phone[data-width="regular"]) .sealed-card > .label-btn--block {
  width: fit-content;
  min-width: var(--key-min-w);
  max-width: 100%;
  margin-inline: auto;
}
```

- [ ] **Step 6: The motion card's key,** at the end of `motion-permission-card.css`:

```css
/* Regular width: Allow keeps its own width, centered, rather than stretching across the card. */
.phone[data-width="regular"] .motion-card .key {
  justify-self: center;
  min-width: var(--key-min-w);
}
```

- [ ] **Step 7: Copies become the tokens.** `min-width: 232px;` becomes `min-width: var(--key-min-w);` in `.giving__acts .key` (`Giving.css`), `.receive-gift__acts .key` (`receive-gift-dialog.css`) and `.send-gratitude-sheet__acts .key` (`send-gratitude-sheet.css`). The three-layer `box-shadow` of `.bottom-sheet.send-gratitude-sheet` and of `.tray__pulled .tray__paper` (`sticker-tray.css`) becomes `box-shadow: var(--shadow-float);`. Then `rg -n "232px|8px 18px 30px" "$W/apps/frontend/src" --glob '*.css'` → only `tokens.css`.
- [ ] **Step 8:** `checks.js sheets cards sealed foot shift` → every line `PASS`. Look at this task's `shots/` at the regular sizes through `/impeccable adapt`, and at the compact ones (390×844, 375×591, 540×564, 540×620), which must look as they did before this task.
- [ ] **Step 9: Commit:** `feat(frontend): in regular width, sheets and cards take one content width`

### Task 7: Device-neutral words (decision 16)

**Files:** Modify `apps/frontend/src/i18n/strings/app.ts`, `errors.ts`, `gratitude.ts`, `stickerBoard.ts`, `stickerCreation.ts`, `i18n/glossary.md`, `sticker-creation/session/session.ts`, `session.test.ts`, `sticker-creation/DrawingScreen.test.tsx`, `gratitude/GratitudeMiniGame.test.tsx`, `ui/motionPermission.ts`

- [ ] **Step 1: The tests follow the catalog.** In `session.test.ts`, `"blames the phone only for a failure before the request left it"` becomes `"blames the device only for a failure before the request left it"`, and its `.toBe("onThisPhone")` becomes `.toBe("onThisDevice")`. In `DrawingScreen.test.tsx`, `strings.stickerCreation.seal.failed.onThisPhone.en` becomes `strings.stickerCreation.seal.failed.onThisDevice.en`. In `GratitudeMiniGame.test.tsx`, after the imports:

```ts
/** The receipt's note for gratitude kept on the device until it can go to @alice. */
const keptNote = () => i18next.t(($) => $.gratitude.receipt.kept, { handle: "@alice" });
```

and `const kept = "Saved on this phone. It goes to @alice when you’re back online.";` becomes `const kept = keptNote();`, while both `"Saved on this phone"` in `toContain` and `not.toContain` become `keptNote()`. The two test names there that say "on the phone" and "the phone can't keep it" say "device".

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C "$W/apps/frontend" exec vitest run src/sticker-creation/session/session.test.ts src/sticker-creation/DrawingScreen.test.tsx src/gratitude/GratitudeMiniGame.test.tsx` → the session and DrawingScreen tests fail (`onThisDevice` doesn't exist); the Mini-game's pass.
- [ ] **Step 3: The words.** Each `en` below, and each comment's "phone", changes; each `ja` not shown stays:
  - `app.ts`, `motionPermission`:

```ts
    /** Motion permission card, shown once over the app on iPhone and iPad: its screen-reader name */
    label: { en: "Motion permission", ja: "モーションの許可" },
    /** Motion permission card, shown once over the app on iPhone and iPad: the question it asks, naming what shaking does and that the system asks once more after Allow */
    question: {
      en: "Shake to send gratitude? After you allow it, you’ll be asked once more.",
      ja: "端末を振って感謝を送りませんか？許可すると、もう一度確認が表示されます。",
    },
    /** Motion permission card: the key that grants motion access, after which iOS or iPadOS shows its own prompt */
```

- `errors.ts`, `invalid_request.en`: `"Croquis couldn’t read what your device sent. Try again. If it keeps happening, tell the Croquis Official account in LINE."`
- `gratitude.ts`, `receipt.kept.en`: `"Saved on this device. It goes to {{handle}} when you’re back online."`; `receipt.lost.en`: `"This combo wasn’t sent, and this device couldn’t save it. Close this and send your gratitude again."`, its comment saying "this device couldn't save it".
- `stickerBoard.ts`, `settings.language.notKept.en`: `"Your language is saved, but this device couldn’t keep it. It changes the next time you open the app."`, its comment saying "this device couldn't keep it for the next start, over the device's own words for a report"; the timelapse's `notPlayed` comment says "when this device couldn't play it".
- `stickerCreation.ts`, `timer.note.notKept.en`: `"This device can’t keep your drawing,\nso seal it before you close the app"`, its comment saying "for as long as this device can't keep your drawing in progress"; and `seal.failed.onThisPhone` becomes:

```ts
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing failed on this device before the server was asked; the check is the seal key's icon */
      onThisDevice: {
        en: "Couldn’t seal: something went wrong on this device. Tap the check to try again.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>この端末で<wbr/>問題が<wbr/>起きました。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
```

- [ ] **Step 4: The code follows.** In `session.ts`, `SealProblem`'s `"onThisPhone"` becomes `"onThisDevice"`; `describeSealFailure`'s comment says "`sent`: the request had left the device", its inline comment "a failure before the request left is the device's", and it returns `{ kind: sent ? "noAnswer" : "onThisDevice" }`; `sealFailure`'s comment says "before it left the device". The glossary's table gains:

```md
| device (a phone or an iPad) | 端末 | "This device" in notes and errors; never the device's name |
```

In `motionPermission.ts`, the comment stacked above `isAppleMobile`'s own moves above `iosMotionPrompt`, whose inner comment names iPads too:

```ts
/** iPhone and iPad, iPadOS included, which reports itself as a Mac with a touch screen. */
const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

/** iOS's motion prompt, which TypeScript's DOM types don't declare. */
function iosMotionPrompt(): (() => Promise<string>) | undefined {
  // Some desktop browsers carry the prompt too; the ask is for the phones and iPads that need it.
```

- [ ] **Step 5:** Step 2's tests, `src/sticker-board/stat-board/SettingsNote.test.tsx` (same `TZ=Asia/Tokyo … vitest run`) and `pnpm -C "$W/apps/frontend" typecheck` → pass. `rg -n -i 'en: ".*\bdevice' "$W/apps/frontend/src/i18n/strings"` → six lines (the known hits; the motion card's question names nothing), then `rg -n -i 'en: ".*\bi?phone' "$W/apps/frontend/src/i18n/strings"` → no match. `checks.js words` → `PASS` in both languages.
- [ ] **Step 6: Commit:** `fix(frontend): words that named the phone or iPhone name no device`

### Task 8: The sweep at every size (decision 17)

Read the craft floor, and look through `/impeccable adapt`.

- [ ] **Step 1:** `node ~/.cache/drawing-app-ipad-foundations/checks.js` (every check) → `ALL PASS`. Decision 17 holds when `marks` finds the three tabs at the foot, centered and at most 176px each, at every size in both engines.
- [ ] **Step 2: Look** at every image in `shots/`, at every size and in both engines. At regular sizes nothing this plan touches stretches past `--content-w`; keys keep their own width; the motion card sits above the tabs. At the compact sizes everything is as it was on main, but for the home indicator's padding (Task 4) and the board that no longer shifts (Task 5). Fix what's off in one batch, run Step 1 again, and commit as `fix(frontend): …`, naming what it fixes. (Giving's sheets and the give sheet are the Explore and dialogs plan's checks, with their columns.)

### Task 9: DESIGN.md and PRODUCT.md

The sentences this plan's work makes false; ad0ll's sign-off on the spec covers these edits. The size-class overview in DESIGN.md's Layout is the finish's.

- [ ] **Step 1: DESIGN.md.**
  - Layout, second paragraph: `and sheets pad 18–20px on the sides and 24px at the foot.` → `and sheets pad 18–20px on the sides and 24px at the foot, over the home indicator's safe area where a sheet reaches the screen's foot.`
  - Shadow Vocabulary, Sheet: `a bottom sheet rising over the page.` → `a bottom sheet rising over the page from its foot; in regular width it floats as a card instead.`
  - Shadow Vocabulary, Floating sheet: `a sheet pulled out of the tray, hovering over the board.` → `a sheet pulled out of the tray, hovering over the board, and a bottom sheet floating as a card in regular width (\`--shadow-float\`).`
  - Shapes: `bottom sheets 16–18px on their top corners, the Send gratitude sheet, floating clear of the edges, 16px all round,` → `bottom sheets 16–18px on their top corners, and 16px all round where they float clear of the edges, as the Send gratitude sheet does and every sheet does in regular width,`
  - The cork back, Developer slip: `LINE's and Privy's details on a torn-top slip,` → `LINE's, the device's and Privy's details on a torn-top slip,`
  - The Draw key's tickets: `Full-width Draw keys on the cards carry only their label;` → `Draw keys on the cards carry only their label;`
  - Gratitude, After: `saved on this phone to go when it can` → `saved on this device to go when it can`
- [ ] **Step 2: PRODUCT.md,** the Gratitude Mini-game's second bullet: `Shake needs iPhone's motion permission, which the app asks for once after sign-in.` → `Shake needs the device's motion permission, which the app asks for once after sign-in on an iPhone or iPad.`
- [ ] **Step 3: Commit,** with an explicit pathspec: `docs: DESIGN.md and PRODUCT.md as the iPad foundations left them`

### Task 10: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm -C "$W" check` → lint, typecheck, tests, the format check and the Move tests pass.
- [ ] **Step 2: Squash** into two commits with no AI attribution lines: Tasks 1 to 3, then Tasks 4 to 9. Nothing may be left uncommitted (`git -C "$W" status --short` lists only the untracked `vite.checks.config.ts`). The base is the branch's fork point, never a newer `origin/main`, whose changes a tree from before them would undo:

```bash
OLD=$(git -C "$W" rev-parse HEAD)
BASE=$(git -C "$W" merge-base HEAD origin/main)
SPLIT=$(git -C "$W" log --format=%H -F --grep="the performance recorder sums up each kind of pointer" -1)
A=$(git -C "$W" commit-tree "$SPLIT^{tree}" -p "$BASE" -F - <<'MSG'
feat(frontend): size classes mark the app's frame, and the developer slip measures the device

app/sizeClass.ts marks .phone data-width (compact or regular) and data-height (short or tall) by
the frame's own size, and useSizeClass() reads it; the desktop phone frame stays compact, and the
dev server's ?layout= picks the width. The developer slip's Device paper says what the device says,
and the performance recorder sums up each kind of pointer, for the iPad device session.
MSG
)
B=$(git -C "$W" commit-tree "$OLD^{tree}" -p "$A" -F - <<'MSG'
feat(frontend): in regular width, sheets and cards take one content width

Ticket cards center at --content-w; sheets and the sealed card take its width over the foot, keys
at their own width. Sheets over the tabs pad the home indicator; the board and the drawing screen
clip without scrolling, so a rising card no longer lifts the board; the words that named the phone
name no device; DESIGN.md and PRODUCT.md follow.
MSG
)
git -C "$W" reset --keep "$B"
```

Then `git -C "$W" diff "$OLD" HEAD` → nothing, and `git -C "$W" log --format=%B -2` → the two messages, with no attribution lines.

- [ ] **Step 3: Merge and push,** in the main checkout in one command: `git -C "$R" fetch origin && git -C "$R" merge --ff-only origin/main && git -C "$R" merge --no-edit feat/ipad-foundations && git -C "$R" push origin main`.
- [ ] **Step 4:** Stop both servers. Once ad0ll has the screenshots: `git -C "$R" worktree remove --force "$W"` (it holds the untracked config and `data/`), `git -C "$R" branch -d feat/ipad-foundations`, and `~/.cache/drawing-app-ipad-foundations/`. The spec and this plan stay until the finish deletes them; tick this plan's boxes as they're done.
- [ ] **Step 5:** The device session needs the Device paper and the recorder live, and the LINE sheet plan deploys them; deploy earlier only on the coordinator's word, as in Task 0's Step 10.

## For the other plans

- **Size classes:** `.phone[data-width="compact|regular"][data-height="short|tall"]` in CSS; `useSizeClass()` in components, `readSizeClass()` outside React (`app/sizeClass.ts`). Where no frame was measured (the sign-in gates, a unit test that renders no App), `useSizeClass()` gives a phone's class, compact and tall, and never throws; App's `.phone` measures 0×0 in happy-dom, so a test that renders App sees compact and short.
- **Tokens:** `--content-w`, `--key-min-w`, `--shadow-float`, and `--foot-inset` (0 inside `.screen`); on a sheet, `--sheet-foot-inset`, `--sheet-lift` and `--sheet-away`.
- **A sheet in regular width** (`ui/sheet.css`): to place one higher, set `--sheet-lift` (not `bottom`) on it, and it still slides in from below the screen. Its default is `calc(var(--gutter) + var(--foot-inset, 0px))`, and a higher lift keeps both terms: the Explore and dialogs plan lifts Giving's sheets and the Accept sheet to its page's foot with `--sheet-lift: calc(var(--page-y) + var(--gutter) + var(--foot-inset, 0px))`. A sheet that places itself, as the drawing screen and Pencil plan's color popover does, adds `bottom-sheet--popover` to its `className` (for the color sheet, `className="color-sheet bottom-sheet--popover"` in `ColorSheet.tsx`, at every size); the regular card rule then sets nothing on it, and the popover's rule needs no resets. Its base `.bottom-sheet` rule still applies.
- **The sealed card** takes `--content-w` over the foot in regular width (`SealedCard.css`, same low specificity); this plan is its one owner. The seal ceremony's re-measuring on resize, and the check that the card's slot meets the landing sticker in regular width, are the Explore and dialogs plan's.
- **The home indicator under a full-screen layer on `.phone`:** `--foot-inset` is its safe area wherever a layer reaches the screen's foot. The Explore and dialogs plan's receive dialog end screens and gift received notice pad their foot with it, in place of a fixed 34px and of `env()`.
- **A layer that hosts a rising card or sheet clips with `overflow: clip`,** not `hidden`, or a focused card can scroll it.
- **Lines changed in other plans' files:** `min-width: 232px` is `var(--key-min-w)` in `Giving.css`, `receive-gift-dialog.css` and `send-gratitude-sheet.css`; `.tray__pulled .tray__paper`'s shadow is `var(--shadow-float)`; the Accept sheet's padding reads `--sheet-foot-inset`. `motionPermission.ts`'s comments are already apart, so the LINE sheet plan's Task 1 only adds the export.
- **The Pencil summary** gives each pointer type's ranges since the last Clear; the device session clears between a resting palm and a fingertip to read each. The report's device lines and the Device paper share `deviceFacts.ts`.
- **AGENTS.md's Architecture** (the finish) could name `deviceFacts.ts` beside the recorder in `src/performance`, as well as `sizeClass.ts` in `src/app`.
