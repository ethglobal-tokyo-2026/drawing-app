# iPad Small Windows and the Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Below 600×600 (Split View, Slide Over, LINE's sheet on an iPad) Croquis keeps a whole phone layout; the size rail, the color sheet and the sign-in gates fit short heights; turning or resizing the window mid-drawing, mid-drag and mid-scroll loses nothing; and the iPad work is finished: a WebKit and Chromium sweep at every size, an impeccable critique, polish and audit, DESIGN.md and PRODUCT.md as built, one squashed merge, and the brief, plans and draft branch purged.

**Architecture:** No new layout system. The foundations plan's large-screen query, `(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`, already gives every smaller window the phone layout. This plan makes that layout hold in windows that aren't phones: the four sign-in gates stand on one `GatePaper` that scrolls and pads by what the on-screen keyboard hides (`ui/visibleArea.ts`); under 700px tall the size rail ends above undo and the color sheet stops at 42%; stickers on the board and in Explore's pile stop growing past the widest phone's size (Open item 1). Everything else is checking: scratch Playwright scripts drive WebKit and Chromium at every size, log rule breaks and save screenshots, and each check's breaks are fixed in one batch.

**Tech Stack:** React 19, TypeScript, CSS, vitest + happy-dom, Playwright 1.63 (`@playwright/test` from `apps/frontend`, driven by scratch scripts through `tsx`), the impeccable skill.

---

## Open

Unsettled until ad0ll signs off; tasks build each recommendation unless ad0ll picks otherwise.

1. **A phone-layout window wider than a phone keeps phone-sized stickers.** Today a sticker's size is a share of the board's width and Explore's pile scales its 360 units to the width, so in LINE's 540px sheet stickers are about 1.4× a phone's and the pile 1.5×; in a 1000px window, about 2.6× and 2.8× (computed from the code, not measured). Built (Task 3): the board's unit stops at `PHONE_UNIT_MAX` (440, the widest iPhone's width) and the pile's scale at `MAX_PILE_SCALE` (1.25, the large layout's), past which the pile widens instead. Phones 440px wide or narrower are unchanged. Alternative: keep scaling with the width.
2. **Short heights:** the phone layout under 700px tall (LINE's sheet on an iPad, an iPhone SE in LINE, and likely an iPhone's Safari under its bars, unverified) gets a color sheet that stops at 42% (52% today), its heading hidden from sight and its pad 56px (72px under 640px tall today). The rail becomes `clamp(120px, 100% − 196px, 222px)`, which changes only drawing screens under 418px tall (a phone on its side).
3. **LINE's sheet on an iPad** is taken as LINE's 2021 figure, 540×620 ("LIFF apps opened on the iPad will be displayed in a formSheet size (540W x 620H pt)", https://developers.line.biz/en/news/2021/), unverified on today's LINE; also checked as 540×564 (if LINE draws its 56px header there) and 580×640 (iPadOS's newer form sheet). ad0ll's look in LINE on an iPad after a deploy settles it; not in this plan.
4. **A window wide but short** (an iPadOS window dragged under 600px tall, e.g. 1000×560) gets the phone layout stretched to its width, keys and cards included. Checked only for nothing cut off or unreachable. Not built: the phone layout centered in a phone-wide column there, as the desktop frame does.
5. **320px windows** (Split View's narrow pane and Slide Over on smaller iPads under older iPadOS) aren't checked, as PRODUCT.md says of 320px phones.
6. **Full screen in the browser,** the Oct 7 plan's link out of LINE's sheet, is dropped: the brief has none.
7. **Deploying** isn't in this plan; it ends at the push.
8. **The sign-in gates** (Task 1) are beyond the brief, whose short-height pass names only the size rail and the color sheet: under about 600px tall a gate's stack and the handle prompt's field with the keyboard up don't fit, so they scroll and pad by what the keyboard hides (`ui/visibleArea.ts`, `GatePaper`). Drop Task 1 if declined.

## Depends on

Every other plan in the brief's table merged to main: `2026-10-08-small-fixes.md`, `ipad-foundations`, `ipad-board-and-stat-board`, `ipad-shop-and-cards`, `ipad-explore`, `ipad-drawing`, `ipad-pencil`, and `ipad-dialogs` (still to write: the sticker detail, giving, receiving, the Mini-game and Explore's lifted sticker on an iPad, which this plan's check list reads "as built"; if ad0ll drops it, those rows check only that nothing is cut off). Names this plan reads, as the draft `spike/ipad-board` has them (where a plan landed another name or shape, apply the change to the symbol as it landed and note the landed name here):

- Foundations: the large-screen query, `LARGE_SCREEN` and `useLargeScreen()` in `apps/frontend/src/ui/largeScreen.ts`, repeated in CSS; the desktop frame in `app/App.css`.
- Board (its plan, `2026-10-08-ipad-board-and-stat-board.md`): `BoardLayout`, `PHONE_BOARD` and `unitOf(layout, boardWidth)` in `sticker-board/placement.ts`, read by `useBoardSize.ts` with `useBoardLayout()`.
- Explore: `PILE_WIDTH`, `LARGE_PILE_SCALE` and `pileFit(px, large)` in `explore/pileLayout.ts`, read by `explore/StickerPile.tsx`.
- Drawing: `.ink-area`, `.size-rail` (its drag reads the rail's own height), `.history-buttons`, `.key.seal-key`, `.tool-strip`, the color popover's rules in `tools/ColorSheet.css`.
- Small fixes: `stickerBoard.statBoard.gratitude.events.open` ("See where it came from").
- Shop and cards: the checkout, ticket cards, Sealed card and gratitude events card centered at 400px in the large layout.

## Files

- Create `apps/frontend/src/ui/visibleArea.ts`, `apps/frontend/src/ui/visibleArea.test.tsx`
- Modify `apps/frontend/src/line/GateParts.tsx` (`GatePaper`), `line/LineGate.tsx`, `line/LineGate.css`, `api/SessionGate.tsx`, `api/HandlePrompt.tsx`, `api/HandlePrompt.css`, `app/AppCrashBoundary.tsx`
- Modify `apps/frontend/src/sticker-creation/tools/SizeRail.css`, `tools/ColorSheet.css`
- Modify `apps/frontend/src/sticker-board/placement.ts`, `placement.test.ts`, `apps/frontend/src/explore/pileLayout.ts`, `pileLayout.test.ts`, `StickerPile.tsx`
- Modify what the checks, critique and audit find, in any frontend file
- Modify `DESIGN.md`, `PRODUCT.md`, `AGENTS.MD` (Architecture, only a missing line)
- Create, then delete before the squash: `docs/review/<date>-ipad-finish.md`
- Delete at the end: the brief, every iPad plan, this plan, `spike/ipad-board` and its worktree
- Scratch, never committed: `$W/data/scratch/small-windows/` (scripts, `shots/`, `run.log`, `seed.json`) and `$W/data/small-windows/` (database and images); `data/` is gitignored

## Setup

Each shell call starts fresh, so every command block below assumes this line first (pick other ports in Step 4 if these are taken, and use them everywhere):

```sh
R="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"; W="$R/.claude/worktrees/ipad-small-windows"; S="$W/data/scratch/small-windows"; export APP_PORT=5183 API_PORT=8783 SW_BASE=http://localhost:5183
run() { local script=$1; shift; pnpm -C "$W/apps/frontend" exec tsx "../../data/scratch/small-windows/$script" "$@"; }
```

Never a bare `cd`: use `git -C`, `pnpm -C` or a subshell. `run` takes a scratch script and its arguments; variables set before it (`ENGINE=chromium run …`) reach the script.

- [ ] **Step 1: The other plans are in.** `git -C "$R" fetch origin`, then `git -C "$R" grep -c -F -e "- [ ]" origin/main -- 'docs/superpowers/plans/2026-10-08-*.md'` lists no plan but this one (a plan ticks its boxes as it merges, or deletes itself). `git -C "$R" grep -l -F "(min-width: 600px) and (min-height: 600px)" origin/main -- apps/frontend/src` lists files. `(cd "$R" && gh pr list --state open)`: nothing touching the gates, the drawing screen's tools, `placement.ts` or `pileLayout.ts`. Anything else: stop and tell the coordinator.
- [ ] **Step 2: Worktree and browsers.**

```sh
git -C "$R" worktree add -b feat/ipad-small-windows "$W" origin/main
pnpm -C "$W" install --frozen-lockfile --prefer-offline
pnpm -C "$W/apps/frontend" exec playwright install webkit chromium
mkdir -p "$S/shots" "$W/data/small-windows/images"
```

- [ ] **Step 3: WebKit renders.** The finish needs WebKit, and on 2026-10-08 Playwright's WebKit on this Mac couldn't load even a `data:` URL (its networking process failed to start; Chromium worked). Write `$S/probe.mjs`:

```js
// Scratch, deleted with the worktree: does Playwright's WebKit render a page on this Mac?
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const W = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { webkit } = createRequire(path.join(W, "apps/frontend/package.json"))("@playwright/test");
const browser = await webkit.launch({ timeout: 30_000 });
try {
  const page = await browser.newPage();
  await page.goto('data:text/html,<p id="ok">ok</p>', { timeout: 15_000 });
  const text = await page.textContent("#ok", { timeout: 5_000 });
  const png = await page.screenshot({ timeout: 10_000 });
  if (text !== "ok") throw new Error(`WebKit rendered "${text}"`);
  console.log(`WEBKIT OK: ${browser.version()}, a ${png.length}-byte screenshot`);
} finally {
  await browser.close();
}
```

Run `node "$S/probe.mjs"` → `WEBKIT OK: …`. If it fails (`page.goto: Timeout 15000ms exceeded` on the `data:` URL), tell ad0ll at once: "Playwright's WebKit can't load a page on this Mac, as on 2026-10-08; a restart is the likely fix. Please restart when you can; I'll resume from the plan's boxes." Tasks 1–3 need no browser and go on; Task 4 starts only once the probe prints `WEBKIT OK`. Never finish Tasks 4–8 in Chromium alone.

- [ ] **Step 4: Dev server** on two free ports (other sessions' servers come and go) and a database of its own. The research database gives Explore's pile fifty-odd stickers; skip the copy if it's gone:

```sh
sqlite3 "$R/.claude/worktrees/ipad-research/data/scratch/ipad/data/ipad-research.db" ".backup '$W/data/small-windows/drawing-app.db'"
/bin/cp -Rf "$R/.claude/worktrees/ipad-research/data/scratch/ipad/data/ipad-research-images/." "$W/data/small-windows/images/"
```

Write `$S/vite.config.mts`:

```ts
// Scratch, deleted with the worktree: the app's own Vite config on this plan's ports.
import appConfig from "../../../apps/frontend/vite.config.ts";

export default {
  ...appConfig,
  server: {
    ...appConfig.server,
    port: Number(process.env.APP_PORT),
    strictPort: true,
    proxy: {
      ...appConfig.server?.proxy,
      "/api": { target: `http://127.0.0.1:${process.env.API_PORT}` },
    },
  },
};
```

Start both in the background (`run_in_background`), the API then Vite:

```sh
(cd "$W/apps/api" && PORT=$API_PORT DATABASE_URL="$W/data/small-windows/drawing-app.db" IMAGE_DIR="$W/data/small-windows/images" IMAGE_BASE_URL="http://localhost:$APP_PORT/api/images" exec node --env-file=.env.example src/server.ts)
```

```sh
(cd "$W/apps/frontend" && VITE_LIFF_MOCK=on VITE_DEV_SLIP=on exec node_modules/.bin/vite --config ../../data/scratch/small-windows/vite.config.mts)
```

`curl -s -o /dev/null -w "%{http_code}\n" $SW_BASE/` → `200`; `curl -s -o /dev/null -w "%{http_code}\n" $SW_BASE/api/me` → `401`. The API applies main's pending migrations to the copy as it starts.

- [ ] **Step 5: The scratch library,** `$S/lib.mjs`:

```js
// Scratch for the iPad small windows plan, deleted with its worktree: signed-in WebKit and Chromium
// contexts at each window size, names from the app's catalog, and the rules every shot is checked by.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { strings } from "../../../apps/frontend/src/i18n/strings/index.ts";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const W = path.resolve(DIR, "../../..");
const pw = createRequire(path.join(W, "apps/frontend/package.json"))("@playwright/test");

export const S = strings;
export const BASE = process.env.SW_BASE ?? "http://localhost:5183";
export const ENGINE = process.env.ENGINE ?? "webkit";
export const LANGUAGE = process.env.LANGUAGE ?? "en";
export const RUN = `${ENGINE}-${LANGUAGE}`;
export const OUT = path.join(DIR, "shots");
export const SEED = path.join(DIR, "seed.json");
const LOG = path.join(DIR, "run.log");

/** The large layout's query, as the foundations plan wrote it. */
export const LARGE = "(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)";

const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_UA = IPAD_UA.replace("iPad; CPU OS", "iPhone; CPU iPhone OS");

/** Every window the plan checks: the device it stands for, and the layout the brief gives it. */
const SIZES = {
  "390x844": { device: "iphone", large: false }, // an iPhone in LINE
  "375x667": { device: "iphone", large: false }, // an iPhone SE
  "540x620": { device: "ipad", large: false }, // LINE's sheet on an iPad, LINE's own figure
  "540x564": { device: "ipad", large: false }, // the same less a 56px header, if LINE draws one there
  "580x640": { device: "ipad", large: false }, // iPadOS's newer form sheet, if LINE takes it
  "585x734": { device: "ipad", large: false }, // Safari beside another app, 11-inch, sideways
  "375x946": { device: "ipad", large: false }, // Safari's narrow pane or Slide Over, 13-inch
  "1000x560": { device: "ipad", large: false }, // a window dragged short
  "600x600": { device: "ipad", large: true }, // the large layout's smallest window
  "683x946": { device: "ipad", large: true }, // Safari beside another app, half each, 13-inch
  "744x1047": { device: "ipad", large: true }, // iPad mini, Safari, upright
  "820x1094": { device: "ipad", large: true }, // iPad Air 11-inch, Safari, upright
  "1133x658": { device: "ipad", large: true }, // iPad mini, Safari, sideways
  "1180x734": { device: "ipad", large: true }, // iPad Air 11-inch, Safari, sideways
  "1376x946": { device: "ipad", large: true }, // iPad Pro 13-inch, Safari, sideways
  "1280x800": { device: "desktop", large: false }, // a laptop's browser: the phone frame
};

export function size(name) {
  if (!SIZES[name]) throw new Error(`No size ${name} in lib.mjs's SIZES`);
  const [w, h] = name.split("x").map(Number);
  return { name, w, h, ...SIZES[name] };
}

export const sizesFrom = (list) => list.split(",").map(size);

export function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(" ")}`;
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Polls `test` until it holds. */
export async function until(test, ms = 15_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(150)) if (await test()) return;
  throw new Error(`waited ${ms}ms for ${test}`);
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textOf = (leaf, language) =>
  ((language === "ja" ? leaf.ja : undefined) ?? leaf.en).replaceAll("<wbr/>", "");

/** A catalog string as the app shows it, its {{variables}} filled. */
export const say = (leaf, vars = {}, language = LANGUAGE) =>
  textOf(leaf, language).replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));

/** A catalog string as a pattern for a whole name, each {{variable}} matching anything. */
export const named = (leaf, language = LANGUAGE) =>
  new RegExp(
    `^${textOf(leaf, language)
      .split(/\{\{\w+\}\}/)
      .map(escape)
      .join(".+")}$`,
  );

/** Names that start with a catalog string, such as a key whose name goes on with its tickets. */
export const startsWith = (leaf, language = LANGUAGE) =>
  new RegExp(`^${escape(say(leaf, {}, language))}`);

/** Signs `name` in from Node as LIFF Mock's `?as=` does: WebKit drops the API's Secure cookie on
 * http://localhost, so the cookie goes back in without it. */
export async function signIn(name, language = LANGUAGE) {
  const who = name.toLowerCase();
  const profile = { sub: `dev-${who}`, name: who.charAt(0).toUpperCase() + who.slice(1) };
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken: `drawing-app-dev-id-token:${JSON.stringify(profile)}`,
      language,
    }),
  });
  if (!res.ok)
    throw new Error(`POST /api/session for ${name} answered ${res.status}: ${await res.text()}`);
  return res.headers.getSetCookie().map((cookie) => {
    const [pair] = cookie.split(";");
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

/** Calls the API as `name`, from Node. */
export async function api(name, method, route, body) {
  const cookie = (await signIn(name)).map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${BASE}/api${route}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, text: await res.text() };
}

/** Spends whatever daily tickets `name` has left today, so Draw raises the out-of-tickets card. */
export async function spendDailyTickets(name) {
  for (let spent = 0; ; spent++) {
    const { status, text } = await api(name, "POST", "/tickets/spend", {
      kind: "daily",
      idempotencyKey: randomUUID(),
    });
    if (status !== 201)
      return log(`TICKETS ${name}: spent ${spent}, then ${status} ${text.slice(0, 120)}`);
  }
}

export const seeded = () => JSON.parse(fs.readFileSync(SEED, "utf8"));

/** A fresh browser at `sz`, signed in as `name` when given. Motion is reduced unless `motion`:
 * WebKit's screenshots draw no 3D, so a turning board would show its back mirrored. */
export async function open({
  size: sz,
  name,
  engine = ENGINE,
  language = LANGUAGE,
  motion = false,
  askMotion = false,
}) {
  const browser = await pw[engine].launch();
  const touch = sz.device !== "desktop";
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h },
    deviceScaleFactor: sz.device === "iphone" ? 3 : 2,
    isMobile: touch,
    hasTouch: touch,
    ...(touch ? { userAgent: sz.device === "iphone" ? IPHONE_UA : IPAD_UA } : {}),
    locale: language === "ja" ? "ja-JP" : "en-US",
    timezoneId: "Asia/Tokyo",
    reducedMotion: motion ? "no-preference" : "reduce",
  });
  await context.addInitScript(
    ({ ja, askMotion }) => {
      if (ja) localStorage.setItem("draw.language", "ja");
      // The motion card asks once; only its own check wants it.
      if (!askMotion) localStorage.setItem("draw.motion", "denied");
    },
    { ja: language === "ja", askMotion },
  );
  if (engine === "webkit") {
    // WebKit's own HTTPS fails when launched from here, so outside hosts go through Node.
    await context.route(/^https:\/\//, async (route) => {
      try {
        await route.fulfill({ response: await route.fetch() });
      } catch (error) {
        log(`ROUTE ${route.request().url()} failed: ${error}`);
        await route.abort();
      }
    });
  }
  if (name) await context.addCookies(await signIn(name, language));
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on("pageerror", (e) =>
    log(`PAGEERROR ${name ?? "-"} ${sz.name} ${engine}: ${String(e).slice(0, 300)}`),
  );
  return { browser, page };
}

/** Opens Croquis as `name` on their board. */
export async function toBoard(page, name) {
  await page.goto(`${BASE}/?as=${name}`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("region", { name: say(S.stickerBoard.board.label) })
    .waitFor({ timeout: 45_000 });
  // Gift badges and stickers land a beat after the board.
  await sleep(1500);
}

export const drawKey = (page) =>
  page.getByRole("button", { name: startsWith(S.stickerBoard.board.drawLabel) });

/** The drawing screen's sheet; a begun Kyoto Seika sheet's name goes on after a comma. */
export const canvas = (page) =>
  page.getByLabel(new RegExp(`^${escape(say(S.stickerCreation.canvas))}(?:$|[,、])`));

/** One stroke across the sheet's middle, once nothing covers it. */
export async function stroke(page) {
  const sheet = canvas(page);
  await sheet.hover();
  const b = await sheet.boundingBox();
  const [x, y] = [b.x + b.width * 0.3, b.y + b.height * 0.4];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(x + i * b.width * 0.03, y + i * b.height * 0.02);
  await page.mouse.up();
  await until(() =>
    page.getByRole("button", { name: say(S.stickerCreation.history.undo) }).isEnabled(),
  );
}

/** Arms the seal key; resolves with the armed chip's 18+ box. */
export async function arm(page) {
  await page.getByRole("button", { name: say(S.stickerCreation.seal.label) }).tap();
  const box = page.getByRole("checkbox", { name: say(S.stickerCreation.nsfw.label) });
  await box.waitFor();
  return box;
}

/** The armed key's second tap, at its center since it keeps moving. Resolves with the Sealed card. */
export async function sealArmed(page) {
  const b = await page
    .getByRole("button", { name: say(S.stickerCreation.seal.tapAgain) })
    .boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  const card = page.getByRole("dialog", { name: startsWith(S.stickerCreation.sealedCard.title) });
  await card.waitFor({ timeout: 60_000 });
  const no = (
    await card
      .getByText(/No\.\d+/)
      .first()
      .textContent()
  ).match(/No\.\d+/)[0];
  return { card, no };
}

/** Mashes the Gratitude Mini-game's heart for a combo; its bar then drains to the receipt. */
export async function playMiniGame(page) {
  const heart = page.getByRole("button", { name: named(S.gratitude.heart) });
  await heart.waitFor({ timeout: 20_000 });
  const b = await heart.boundingBox();
  for (let i = 0; i < 45; i++) {
    await page.touchscreen.tap(
      b.x + b.width / 2 + ((i * 7) % 11) - 5,
      b.y + b.height / 2 + ((i * 5) % 9) - 4,
    );
    await sleep(60);
  }
}

/**
 * U1 nothing scrolls sideways; U2 one key per screen or dialog; U3 no text under 11px, counting every
 * scale on its ancestors; U4 in the large layout no key wider than 400px, since controls keep phone
 * sizes. Touch targets are left to the eye and the audit: tiles padded by their strip and swatches
 * whose cells take the tap measure small here by design.
 */
export function rules(page, sz) {
  return page.evaluate((large) => {
    const problems = [];
    const root = document.scrollingElement;
    if (root.scrollWidth > innerWidth + 1)
      problems.push(`U1 the page scrolls sideways: ${root.scrollWidth}px`);
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < innerHeight &&
        r.left < innerWidth &&
        !el.closest("[inert], [hidden], [aria-hidden='true']") &&
        getComputedStyle(el).visibility !== "hidden"
      );
    };
    const name = (el) =>
      (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40) || el.getAttribute("class");
    const top =
      [...document.querySelectorAll("[role='dialog'], [role='alertdialog']")]
        .filter(shown)
        .at(-1) ?? document.body;
    const keys = [...top.querySelectorAll(".key")].filter(shown);
    if (keys.length > 1) problems.push(`U2 ${keys.length} keys: ${keys.map(name).join(" | ")}`);
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
      if (px < 10.95) small.add(`"${n.textContent.trim().slice(0, 24)}" at ${px.toFixed(1)}px`);
    }
    for (const s of small) problems.push(`U3 text under 11px: ${s}`);
    if (large) {
      for (const key of keys) {
        const w = key.getBoundingClientRect().width;
        if (w > 401) problems.push(`U4 ${name(key)} is ${Math.round(w)}px wide`);
      }
    }
    return problems;
  }, sz.large);
}

/** Logs what breaks the rules on screen now, and saves a screenshot named for the surface and run. */
export async function shot(page, surface, sz) {
  const tag = `${surface}-${sz.name}-${RUN}`;
  for (const problem of await rules(page, sz)) log(`RULE ${tag}: ${problem}`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
}
```

- [ ] **Step 6: The people,** `$S/seed.mjs`:

```js
// Scratch for the iPad small windows plan: the people the sweep visits. sw-bob and sw-alice seal three
// stickers each; bob gives alice three from her board: she receives the first and sends gratitude for
// it, receives the second without, and the third waits for her. Their numbers go to seed.json.
// Usage: ENGINE=webkit|chromium run seed.mjs
import fs from "node:fs";
import * as L from "./lib.mjs";

const { S, say, named } = L;
const [ALICE, BOB] = ["sw-alice", "sw-bob"];
/** LINE's sheet less its header: the phone layout's least height, where seals and gifts are tightest. */
const AT = L.size("540x564");

async function as(name, steps) {
  const { browser, page } = await L.open({ size: AT, name });
  try {
    return await steps(page);
  } finally {
    await browser.close();
  }
}

const sealThree = (name) =>
  as(name, async (page) => {
    await L.toBoard(page, name);
    await L.drawKey(page).tap();
    const numbers = [];
    for (let i = 0; i < 3; i++) {
      await L.stroke(page);
      await L.arm(page);
      const { card, no } = await L.sealArmed(page);
      numbers.push(no);
      // The last daily ticket's card leads with Back to My board.
      const next = i < 2 ? S.stickerCreation.sealedCard.keepDrawing : S.ui.backToBoard;
      await card.getByRole("button", { name: say(next) }).tap();
    }
    L.log(`SEED ${name} sealed ${numbers.join(" ")}`);
    return numbers;
  });

/** `giver` gives `no` to `receiver` from the receiver's board, through LIFF Mock's friend picker. */
const give = (giver, receiver, no) =>
  as(giver, async (page) => {
    await page.goto(`${L.BASE}/explore?as=${giver}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: say(S.explore.search.label) }).tap();
    await page.keyboard.type(receiver, { delay: 20 });
    await page
      .getByRole("button", { name: new RegExp(`^@${receiver}`, "i") })
      .first()
      .tap();
    await page
      .getByRole("button", { name: say(S.stickerBoard.artistBoard.give), exact: true })
      .tap();
    const sheet = page.getByRole("dialog", { name: named(S.giving.giveSheet.title) });
    await sheet.getByRole("radio", { name: no }).tap();
    await sheet.getByRole("button", { name: say(S.giving.give, { no }) }).tap();
    await page.getByRole("button", { name: say(S.ui.backToBoard) }).waitFor({ timeout: 60_000 });
    await L.shot(page, "gift-sent", AT);
    L.log(`SEED ${giver} gave ${no} to ${receiver}`);
  });

/** `name` tears open the gift waiting on their board and accepts it, then sends gratitude or not. */
const receive = (name, { gratitude }) =>
  as(name, async (page) => {
    await L.toBoard(page, name);
    await page.locator(".gifts-for-you-badge").first().tap();
    await page
      .getByRole("dialog", { name: named(S.receiving.title) })
      .getByRole("slider")
      .focus();
    await page.keyboard.press("End");
    await page.getByRole("button", { name: say(S.receiving.gift.accept), exact: true }).tap();
    const ask = page.getByRole("dialog", { name: named(S.receiving.sendGratitude.title) });
    await ask.waitFor();
    if (!gratitude)
      return ask.getByRole("button", { name: say(S.receiving.sendGratitude.later) }).tap();
    const recorded = page.waitForResponse(
      (r) => r.url().includes("/api/gratitude") && r.request().method() === "POST",
      { timeout: 60_000 },
    );
    await ask.getByRole("button", { name: say(S.receiving.sendGratitude.send) }).tap();
    await L.playMiniGame(page);
    L.log(`SEED ${name} sent gratitude: ${(await recorded).status()}`);
  });

if (fs.existsSync(L.SEED)) {
  L.log(`SEED already done, in ${L.SEED}`);
} else {
  const bob = await sealThree(BOB);
  const alice = await sealThree(ALICE);
  // The gift chip opens the newest gift, so each is received before the next is given.
  await give(BOB, ALICE, bob[0]);
  await receive(ALICE, { gratitude: true });
  await give(BOB, ALICE, bob[1]);
  await receive(ALICE, { gratitude: false });
  await give(BOB, ALICE, bob[2]);
  fs.writeFileSync(
    L.SEED,
    JSON.stringify({ alice, bob, trail: bob[0], noGratitude: bob[1], waiting: bob[2] }, null, 2),
  );
  L.log("SEED done");
}
```

Run `ENGINE=webkit run seed.mjs` (`ENGINE=chromium` while WebKit is down) → `SEED done`, and `$S/seed.json` names the six stickers. A step that fails names its selector; fix the selector in the script (a sibling plan may have renamed a string or class), never the app, and rerun after deleting the database copy's `sw-` people or the whole copy (Step 4 again).

## The check list

Every check reads its shots against this. Rules U1–U4 (`lib.mjs`'s `rules`) are logged for every shot; touch targets (44px, DESIGN.md's Touch targets) are read by eye and by the audit.

| Surface                                | Phone layout: phones, LINE's sheet, beside another app, Slide Over, short windows                                                                                                                                                                                                                                                    | Large layout: a touch screen 600 × 600 and up                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in gates                          | Centered; taller than the window, starts at the top and scrolls; with the keyboard up, the handle field, its error line and its key above it                                                                                                                                                                                         | The same                                                                                                                                                                                                              |
| Your board                             | Name and gift badges clear of Draw and the zipper's pull; stickers about a phone's size (Open item 1), none under the header, Draw or the tabs                                                                                                                                                                                       | Stickers at a phone's size, the rest board; one header row, the name then the gift badges; Draw at the tab row's left end, the tabs to its right in the quieter style; the zipper the board's height                  |
| A selected sticker                     | Toolbar on one line, clear of Draw and the header                                                                                                                                                                                                                                                                                    | The same                                                                                                                                                                                                              |
| Sticker tray                           | Opens over the board; the stack fits; dates 11px or more                                                                                                                                                                                                                                                                             | Sheets grow up to 1.5× to fill the pouch                                                                                                                                                                              |
| Stat board                             | Papers at phone size; Settings, the Sui address and Flip back reachable by scrolling; Flip back at the top left                                                                                                                                                                                                                      | The phone's order in one centered cluster; Settings under it on yours; Flip back at the top left                                                                                                                      |
| Gratitude events                       | A sheet whose rows scroll                                                                                                                                                                                                                                                                                                            | A centered card                                                                                                                                                                                                       |
| Someone else's board and stat board    | Give in Draw's slot; their Sui address paper                                                                                                                                                                                                                                                                                         | Give at the tab row's left end; the lit Explore tab's caret leads back                                                                                                                                                |
| Give sheet, gift                       | Within the height, the body scrolling, its key in view; the gift's bag, pull tab and Accept sheet never overlap                                                                                                                                                                                                                      | As built                                                                                                                                                                                                              |
| Sticker detail                         | Sticker, fine print and Give in view; the Transfer Trail by scrolling; the replay's heart and lettering inside its stage                                                                                                                                                                                                             | As built                                                                                                                                                                                                              |
| Gratitude Mini-game                    | Pop-in words and slams inside the stage; the HUD on one row; the receipt fits                                                                                                                                                                                                                                                        | As built                                                                                                                                                                                                              |
| Explore                                | The pile about a phone's scale (Open item 1), scrolling; search, switch and rows fit                                                                                                                                                                                                                                                 | Sideways: the search across the top, the pile left, This week right, each scrolling on its own, results in the pile's column; This week's three leaderboards at once; the pile at about a phone's scale, showing more |
| Shop, checkout                         | As on phones; Pay and Not now in view                                                                                                                                                                                                                                                                                                | Sideways: the reserve tickets banner over the three shelves side by side, no scrolling; upright: one centered column, every swatch whole; the checkout in the middle at 400px                                         |
| Out of tickets, Sealed card            | Fit the height, the last ticket's card included                                                                                                                                                                                                                                                                                      | In the middle at 400px                                                                                                                                                                                                |
| Drawing screen                         | At 390×844 today's offsets (rail left 0, top 104, 222 tall; undo left 18, bottom 22; the check right 18, bottom 16); the rail ends 24px or more above undo; under 700px tall the color sheet's top at or below half the screen, with the recents, pad and brightness bar above its foot; the armed chip's 18+ box clear of the check | A slim top bar (timer, My board, tools) and sidebar (rail, undo, redo, the check); colors as a popover under the tool strip; the sheet centered and scaled                                                            |
| The deal, in Kyoto Seika Practice Mode | The clouds, their dice and Begin fit                                                                                                                                                                                                                                                                                                 | The same                                                                                                                                                                                                              |
| Seal ceremony                          | The cut and its label inside the screen                                                                                                                                                                                                                                                                                              | The cut at the sheet's scale                                                                                                                                                                                          |
| Motion card (Chromium only)            | Fits                                                                                                                                                                                                                                                                                                                                 | Fits                                                                                                                                                                                                                  |
| Desktop, 1280×800                      | The phone frame                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                     |

Both languages fit: Japanese at 375×667, 540×620 and 1180×734.

### Task 1: The sign-in gates scroll and stay above the keyboard

**Files:** Create `apps/frontend/src/ui/visibleArea.ts`, `apps/frontend/src/ui/visibleArea.test.tsx`; modify `apps/frontend/src/line/GateParts.tsx`, `line/LineGate.tsx`, `line/LineGate.css`, `api/SessionGate.tsx`, `api/HandlePrompt.tsx`, `api/HandlePrompt.css`, `app/AppCrashBoundary.tsx`

UI task: read `~/.claude/skills/impeccable/reference/craft-floor.md` first, with `/impeccable adapt` as the lens.

- [x] **Step 1: Write the failing test,** `apps/frontend/src/ui/visibleArea.test.tsx`:

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

- [x] **Step 2:** `pnpm -C "$W/apps/frontend" exec vitest run src/ui/visibleArea.test.tsx` → fails: `./visibleArea` doesn't exist.
- [x] **Step 3: Implement** `apps/frontend/src/ui/visibleArea.ts`:

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

- [x] **Step 4:** Run the test → passes.
- [x] **Step 5: `GatePaper`.** In `apps/frontend/src/line/GateParts.tsx` the React import gains `type ComponentPropsWithoutRef`, `useVisibleArea` comes from `../ui/visibleArea`, and before `GateOpening`:

```tsx
/**
 * The bare paper every gate stands on. What it holds centers while it fits; taller than the window, it
 * starts at the top and scrolls. It keeps it where the on-screen keyboard leaves it visible.
 */
export function GatePaper({ className, children, ...rest }: ComponentPropsWithoutRef<"main">) {
  const paper = useRef<HTMLElement>(null);
  useVisibleArea(paper);
  return (
    <main ref={paper} className={className ? `line-gate ${className}` : "line-gate"} {...rest}>
      <div className="line-gate__stack">{children}</div>
    </main>
  );
}
```

- [x] **Step 6: The four gates stand on it.** `GatePaper` joins each file's `GateParts` import (`HandlePrompt.tsx` imports it from `../line/GateParts`):
  - `LineGate`: `<main className="line-gate" aria-busy={line.status === "loading"}>` → `<GatePaper aria-busy={line.status === "loading"}>`, its `</main>` → `</GatePaper>`.
  - `SessionGate`: `<main className="line-gate" aria-busy={state.step !== "failed"}>` → `<GatePaper aria-busy={state.step !== "failed"}>`, its `</main>` → `</GatePaper>`.
  - `HandlePrompt`: `<main className="line-gate handle-prompt">` → `<GatePaper className="handle-prompt">`, its `</main>` → `</GatePaper>`.
  - `AppCrashed` in `AppCrashBoundary.tsx`: `<main className="line-gate">` → `<GatePaper>`, its `</main>` → `</GatePaper>`.
- [x] **Step 7: Styles.** In `line/LineGate.css`, `.line-gate` and `.line-gate::before` become these, with `.line-gate__stack` after them:

```css
.line-gate {
  position: fixed;
  inset: 0;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  /* What the on-screen keyboard hides pads the paper, so the stack centers in what's left (visibleArea.ts). */
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

/* Auto margins center the stack while it fits and give way when it doesn't, so a tall one starts at
   the top and scrolls rather than losing its head. */
.line-gate__stack {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-block: auto;
}
```

In `api/HandlePrompt.css`, the `.handle-prompt__form` comment ends at "past the screen.":

```css
/* One track that can shrink, so a long handle in the key or the field never widens the form past the
   screen. */
```

- [x] **Step 8:** `pnpm -C "$W/apps/frontend" exec vitest run src/ui/visibleArea.test.tsx src/line/LineGate.test.tsx src/api/SessionGate.test.tsx src/app/AppCrashBoundary.test.tsx` → pass. `pnpm -C "$W" check` → passes.
- [x] **Step 9: Commit** the nine files by path: `feat(frontend): the sign-in gates scroll and keep a field above the on-screen keyboard`

### Task 2: The drawing screen at short heights

**Files:** Modify `apps/frontend/src/sticker-creation/tools/SizeRail.css` (`.size-rail`), `tools/ColorSheet.css` (the `@media (max-height: 640px)` rule), `DESIGN.md` (Draw screen's Color sheet and Size rail bullets)

UI task: craft floor first, `/impeccable adapt` as the lens. Phones' offsets stay; the large layout's rules, with their higher specificity, are untouched.

- [x] **Step 1: The rail.** In `.size-rail`, `height: 222px;` becomes:

```css
/* Ends at least 24px above undo however short the screen: undo's 22px foot, its 46px tiles and the
     gap take 92px below the rail, which starts 104px down. */
height: clamp(120px, calc(100% - 196px), 222px);
```

- [x] **Step 2: The color sheet.** In `ColorSheet.css`, delete the `@media (max-height: 640px)` rule and its comment, and after `.color-picker` add:

```css
/* Short heights in the phone layout (LINE's sheet on an iPad, an iPhone SE in LINE): the color sheet
   leaves more than half the drawing sheet in view. Its heading goes from sight (the dialog keeps its
   name), the pad gives way, and the swatches wait behind a scroll. */
@media not all and (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  @media (max-height: 699.98px) {
    .bottom-sheet.color-sheet {
      max-height: 42%;
    }

    .color-sheet .color-head {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .color-picker .color-pad {
      height: 56px;
    }
  }
}
```

If the foundations plan spells the large-screen query otherwise, the outer condition is its exact negation in that spelling.

- [x] **Step 3: DESIGN.md,** this plan's own sentences. Draw screen's **Color sheet** bullet gains: "Under 700px tall in the phone layout, such as LINE's sheet on an iPad, it stops at 42%, its heading hidden from sight and its pad 56px tall, so more than half the sheet stays in view." **Size rail** gains: "On a short screen it shortens, so it always ends 24px above undo."
- [x] **Step 4:** `pnpm -C "$W" check` → passes (CSS has no unit test; Task 4's sweep measures it at every size).
- [x] **Step 5: Commit** the three files: `fix(frontend): the size rail and the color sheet fit short heights, LINE's sheet on an iPad among them`

### Task 3: Stickers keep a phone's size in a wider phone-layout window

Open item 1. **Files:** Modify `apps/frontend/src/sticker-board/placement.ts` (`unitOf`), `placement.test.ts`, `apps/frontend/src/explore/pileLayout.ts` (`LARGE_PILE_SCALE`, `pileFit`), `pileLayout.test.ts`, `explore/StickerPile.tsx` (the pile's fit effect), `DESIGN.md`

- [x] **Step 1: Write the failing tests.** `placement.test.ts` imports `PHONE_BOARD`, `PHONE_UNIT_MAX` and `unitOf`, and gains:

```ts
describe("unitOf", () => {
  it("sizes a phone layout's stickers by the board's width, up to the widest phone's", () => {
    for (const width of [375, PHONE_BOARD.W, PHONE_UNIT_MAX])
      expect(unitOf("phone", width)).toBe(width);
    expect(unitOf("phone", PHONE_UNIT_MAX + 100)).toBe(PHONE_UNIT_MAX);
  });
});
```

In `pileLayout.test.ts`, `LARGE_PILE_SCALE` in the import becomes `MAX_PILE_SCALE`, and the `pileFit` test becomes:

```ts
describe("pileFit", () => {
  it("scales a phone's 360-unit pile to its width, and past MAX_PILE_SCALE keeps that scale across more units", () => {
    const widest = PILE_WIDTH * MAX_PILE_SCALE;
    for (const px of [PILE_WIDTH, widest])
      expect(pileFit(px)).toEqual({ k: px / PILE_WIDTH, units: PILE_WIDTH });
    const [wider, wide] = [pileFit(widest * 1.2), pileFit(widest * 3)];
    expect([wider.k, wide.k]).toEqual([MAX_PILE_SCALE, MAX_PILE_SCALE]);
    expect(wide.units).toBeGreaterThan(wider.units);
    expect(wider.units).toBeGreaterThan(PILE_WIDTH);
  });
});
```

- [x] **Step 2:** `pnpm -C "$W/apps/frontend" exec vitest run src/sticker-board/placement.test.ts src/explore/pileLayout.test.ts` → fails: no `PHONE_UNIT_MAX` or `MAX_PILE_SCALE` exported.
- [x] **Step 3: The board's unit.** In `placement.ts`, before `unitOf`:

```ts
/** The widest iPhone's width: a phone layout wider than it, such as LINE's sheet on an iPad, sizes stickers by it. */
export const PHONE_UNIT_MAX = 440;
```

and `unitOf`'s phone branch, `: boardWidth`, becomes `: Math.min(boardWidth, PHONE_UNIT_MAX)`:

```ts
export const unitOf = (layout: BoardLayout, boardWidth: number) =>
  layout === "large" ? PHONE_BOARD.W : Math.min(boardWidth, PHONE_UNIT_MAX);
```

Its doc comment gains: "A phone layout wider than the widest phone keeps that phone's unit, and the extra width is board."

- [x] **Step 4: The pile's fit.** In `pileLayout.ts`, `LARGE_PILE_SCALE` and `pileFit` become:

```ts
/**
 * px per pile unit at most, about a phone's: a wider pile, in either layout, spans more units and shows
 * more stickers, rather than a phone's 360 units blown up.
 */
export const MAX_PILE_SCALE = 1.25;

/** A pile `px` wide: px per unit, and its width in units. */
export const pileFit = (px: number) =>
  px / PILE_WIDTH > MAX_PILE_SCALE
    ? { k: MAX_PILE_SCALE, units: Math.floor(px / MAX_PILE_SCALE) }
    : { k: px / PILE_WIDTH, units: PILE_WIDTH };
```

`PileOptions.width`'s comment becomes "Its width in units: PILE_WIDTH, or wider past MAX_PILE_SCALE (pileFit)." In `StickerPile.tsx`, `pileFit(pile.clientWidth, large)` becomes `pileFit(pile.clientWidth)`, the effect's deps `[large]` become `[]`, its comment becomes "A pile is PILE_WIDTH units across, scaled to its width up to about a phone's scale; a wider one spans as many units as fit.", and `const large = useLargeScreen();` and its import go if nothing else in the file reads them. `rg -n "LARGE_PILE_SCALE|pileFit\(" "$W/apps/frontend/src"` → no other caller left with two arguments.

- [x] **Step 5:** Run Step 2's tests → pass. `pnpm -C "$W" check` → passes; a sibling plan's test that expected a phone layout's unit or pile scale to grow past a phone's follows Open item 1.
- [x] **Step 6: DESIGN.md.** The board's sentence that stickers keep their phone size gains "in a phone-layout window wider than a phone too"; Explore's sentence that the pile keeps stickers about phone size gains "in any window wider than a phone". Where the sibling plans worded them otherwise, add the same fact to their sentences.
- [x] **Step 7: Commit** the six files: `fix(frontend): stickers keep a phone's size in LINE's sheet and Split View, and the extra width is room`

### The check scripts

Written once, before Task 4; scratch, so never committed. Selectors come from the catalog (`lib.mjs`'s `say`, `named`, `startsWith`), so a copy change doesn't break them; a step that fails on a selector gets the script fixed, not the app.

- [x] **`$S/sweep.mjs`**, every surface at each size:

```js
// Scratch for the iPad small windows plan: every surface at each size, in one engine and language,
// checked by lib.mjs's rules and saved for reading against the plan's check list.
// Usage: ENGINE=webkit|chromium LANGUAGE=en|ja run sweep.mjs <size,…> [surface,…]
import * as L from "./lib.mjs";

const { S, say, named, startsWith } = L;
const [ALICE, BOB] = ["sw-alice", "sw-bob"];
const seed = L.seeded();
const sizes = L.sizesFrom(process.argv[2]);
const only = (process.argv[3] ?? "").split(",").filter(Boolean);
const wants = (...surfaces) => !only.length || surfaces.some((s) => only.includes(s));
let failed = 0;

async function step(surface, sz, page, act) {
  if (!wants(surface)) return;
  try {
    await act();
  } catch (error) {
    failed++;
    L.log(`FAILED ${surface}-${sz.name}-${L.RUN}: ${String(error).split("\n")[0]}`);
    await page
      .screenshot({ path: `${L.OUT}/fail-${surface}-${sz.name}-${L.RUN}.png` })
      .catch(() => {});
  }
}

async function as(name, sz, surfaces, steps, options = {}) {
  if (!wants(...surfaces)) return;
  const { browser, page } = await L.open({ size: sz, name, ...options });
  try {
    await steps(page);
  } finally {
    await browser.close();
  }
}

const overlap = (a, b) =>
  a &&
  b &&
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/** The drawing screen's parts against the check list: phones' offsets, the rail above undo, the color
 * sheet's share of a short screen, the popover under the tool strip. */
async function measureDrawing(page, sz, when) {
  const p = await page.evaluate(() => {
    const screen = [...document.querySelectorAll(".drawing-screen")].find(
      (s) => !s.closest("[inert]"),
    );
    const s = screen.getBoundingClientRect();
    const box = (selector) => {
      const r = screen.querySelector(selector)?.getBoundingClientRect();
      return r && r.width && r.height
        ? {
            top: r.top - s.top,
            bottom: r.bottom - s.top,
            left: r.left - s.left,
            right: s.right - r.right,
            width: r.width,
            height: r.height,
          }
        : null;
    };
    return {
      height: s.height,
      rail: box(".size-rail"),
      undo: box(".history-buttons"),
      check: box(".key.seal-key"),
      tools: box(".tool-strip"),
      color: box(".bottom-sheet.color-sheet"),
      brightness: box(".color-brightness"),
    };
  });
  const bad = (why) =>
    L.log(`RULE drawing-${when}-${sz.name}-${L.RUN}: ${why} ${JSON.stringify(p)}`);
  if (sz.large) {
    if (p.color && p.tools && p.color.top < p.tools.bottom)
      bad("the color popover starts above the tool strip's foot");
    if (p.color && p.color.width > 401) bad("the color popover is wider than 400px");
    return;
  }
  if (p.rail && p.undo && p.rail.bottom + 24 > p.undo.top + 0.5)
    bad("the size rail ends less than 24px above undo");
  if (sz.name === "390x844" && when === "stroked") {
    const offsets = [
      p.rail.left,
      p.rail.top,
      p.rail.height,
      p.undo.left,
      p.height - p.undo.bottom,
      p.check.right,
      p.height - p.check.bottom,
    ].map(Math.round);
    if (offsets.join() !== "0,104,222,18,22,18,16") bad(`a phone's offsets moved: ${offsets}`);
  }
  if (p.color) {
    if (sz.h < 700 && p.color.top < p.height / 2 - 1)
      bad("the color sheet covers more than half the drawing screen");
    if (sz.h >= 700 && p.color.height > p.height * 0.52 + 1)
      bad("the color sheet covers more than 52%");
    if (p.brightness && p.brightness.bottom > p.color.bottom + 1)
      bad("the brightness bar is below the color sheet's foot");
  }
}

for (const sz of sizes) {
  L.log(`SWEEP ${sz.name} ${L.RUN}`);
  if (
    wants(
      "board",
      "selected",
      "tray",
      "out-of-tickets",
      "gift",
      "detail",
      "explore",
      "shop",
      "mini-game",
    )
  ) {
    await L.spendDailyTickets(ALICE);
  }
  await as(
    ALICE,
    sz,
    [
      "board",
      "selected",
      "tray",
      "out-of-tickets",
      "gift",
      "detail",
      "explore",
      "shop",
      "mini-game",
    ],
    async (page) => {
      await step("board", sz, page, async () => {
        await L.toBoard(page, ALICE);
        // The window stands for what the brief means; which layout the app then drew is read from the shot.
        const large = await page.evaluate((query) => matchMedia(query).matches, L.LARGE);
        if (large !== sz.large)
          L.log(
            `RULE board-${sz.name}-${L.RUN}: the large-screen query ${large ? "matches" : "doesn't match"}, where the brief gives the ${sz.large ? "large" : "phone"} layout`,
          );
        if (sz.device === "desktop") {
          const frame = await page.locator(".phone").boundingBox();
          if (frame.width > sz.w - 100)
            L.log(
              `RULE board-${sz.name}-${L.RUN}: no phone frame; the app is ${Math.round(frame.width)}px wide`,
            );
        }
        await L.shot(page, "board", sz);
      });
      if (sz.device === "desktop") return;
      await step("selected", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await page.getByRole("button", { name: new RegExp(`^${seed.alice[0]}[,、]`) }).tap();
        await page.getByRole("button", { name: say(S.stickerBoard.toolbar.view) }).waitFor();
        await L.shot(page, "selected", sz);
      });
      await step("tray", sz, page, async () => {
        await L.toBoard(page, ALICE);
        // The Zipper's pull sways at rest, so it takes a tap at its measured center.
        const pull = await page.locator(".zip__pull").first().boundingBox();
        await page.touchscreen.tap(pull.x + pull.width / 2, pull.y + pull.height / 2);
        await page.getByLabel(say(S.stickerBoard.tray.sheets)).first().waitFor();
        await L.sleep(800);
        await L.shot(page, "tray", sz);
      });
      await step("out-of-tickets", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await L.drawKey(page).tap();
        await page.getByRole("heading", { name: say(S.tickets.outOfTickets.title) }).waitFor();
        await L.sleep(600);
        await L.shot(page, "out-of-tickets", sz);
      });
      await step("gift", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await page.locator(".gifts-for-you-badge").first().tap();
        const dialog = page.getByRole("dialog", { name: named(S.receiving.title) });
        await dialog.waitFor();
        await L.sleep(1200);
        await L.shot(page, "gift", sz);
        await dialog.getByRole("slider").focus();
        await page.keyboard.press("End");
        await page
          .getByRole("button", { name: say(S.receiving.gift.accept), exact: true })
          .waitFor();
        await L.sleep(1200);
        await L.shot(page, "gift-opened", sz);
        // Not now leaves the gift waiting for the next size.
        await page.getByRole("button", { name: say(S.receiving.gift.notNow) }).tap();
      });
      await step("detail", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await page.getByRole("button", { name: new RegExp(`^${seed.trail}[,、]`) }).tap();
        await page.getByRole("button", { name: say(S.stickerBoard.toolbar.view) }).tap();
        const detail = page.getByRole("dialog", { name: seed.trail });
        await detail.waitFor();
        await L.sleep(800);
        await L.shot(page, "detail", sz);
        await detail
          .getByRole("button", { name: named(S.stickerBoard.timelapse.watchLabel) })
          .tap();
        await L.sleep(2500);
        await L.shot(page, "detail-timelapse", sz);
        const replay = detail.getByRole("button", {
          name: named(S.stickerBoard.transferTrail.replayYours),
        });
        if (!(await replay.count())) {
          await detail
            .getByRole("region", { name: say(S.stickerBoard.transferTrail.label) })
            .getByRole("button")
            .first()
            .tap();
        }
        await replay.tap();
        await L.sleep(2500);
        await L.shot(page, "detail-replay", sz);
      });
      await step("explore", sz, page, async () => {
        await page.goto(`${L.BASE}/explore?as=${ALICE}`, { waitUntil: "domcontentloaded" });
        const piled = page.locator(".pile-sticker__button");
        await piled.first().waitFor({ timeout: 45_000 });
        await L.sleep(1500);
        L.log(`EXPLORE ${sz.name} ${L.RUN}: ${await piled.count()} stickers in the pile`);
        await L.shot(page, "explore", sz);
        await piled.first().tap();
        const putBack = page.getByRole("button", { name: say(S.explore.lifted.putBack) });
        await putBack.waitFor();
        await L.shot(page, "explore-lifted", sz);
        await putBack.tap();
        // This week sits behind the switch on phones and upright, beside the pile sideways.
        const week = page.getByRole("button", { name: say(S.explore.views.thisWeek), exact: true });
        if (await week.count()) await week.first().tap();
        await L.sleep(1200);
        await L.shot(page, "explore-week", sz);
        await page.getByRole("searchbox", { name: say(S.explore.search.label) }).tap();
        await page.keyboard.type(BOB, { delay: 20 });
        const row = page.getByRole("button", { name: new RegExp(`^@${BOB}`, "i") }).first();
        await row.waitFor();
        await L.shot(page, "explore-search", sz);
        await row.tap();
        const give = page.getByRole("button", {
          name: say(S.stickerBoard.artistBoard.give),
          exact: true,
        });
        await give.waitFor();
        await L.sleep(1500);
        await L.shot(page, "their-board", sz);
        await give.tap();
        const sheet = page.getByRole("dialog", { name: named(S.giving.giveSheet.title) });
        await sheet.waitFor();
        await L.sleep(800);
        await L.shot(page, "give-sheet", sz);
        await sheet.getByRole("button", { name: say(S.giving.close), exact: true }).tap();
        await page
          .getByRole("button", { name: named(S.stickerBoard.artistBoard.theirStats) })
          .tap();
        await L.sleep(1200);
        await L.shot(page, "their-stat-board", sz);
      });
      await step("shop", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await page.getByRole("button", { name: say(S.app.tabs.shop), exact: true }).tap();
        const buy = page.getByRole("button", { name: say(S.shop.reserve.buy) }).first();
        await buy.waitFor();
        await L.sleep(1200);
        await L.shot(page, "shop", sz);
        await buy.tap();
        await L.sleep(1500);
        await L.shot(page, "checkout", sz);
      });
      await step("mini-game", sz, page, async () => {
        await L.toBoard(page, ALICE);
        await page.getByRole("button", { name: named(S.stickerBoard.board.yourStats) }).tap();
        await L.sleep(800);
        await page.getByRole("button", { name: say(S.stickerBoard.developer.label) }).focus();
        await page.keyboard.press("Enter");
        const tryIt = page.getByRole("button", {
          name: say(S.stickerBoard.developer.gratitudeDemo.try),
        });
        await tryIt.scrollIntoViewIfNeeded();
        await tryIt.tap();
        await L.playMiniGame(page);
        await L.shot(page, "mini-game-combo", sz);
        await L.sleep(9000);
        await L.shot(page, "mini-game-receipt", sz);
      });
    },
  );
  if (sz.device === "desktop") continue;

  await as(BOB, sz, ["stat-board"], async (page) => {
    await step("stat-board", sz, page, async () => {
      await L.toBoard(page, BOB);
      await page.getByRole("button", { name: named(S.stickerBoard.board.yourStats) }).tap();
      await L.sleep(1000);
      await L.shot(page, "stat-board", sz);
      await page
        .getByRole("region", { name: say(S.stickerBoard.settings.title) })
        .scrollIntoViewIfNeeded();
      await L.sleep(600);
      await L.shot(page, "stat-board-settings", sz);
      await page.getByText(say(S.stickerBoard.statBoard.gratitude.events.open)).tap();
      await L.sleep(1500);
      await L.shot(page, "gratitude-events", sz);
    });
  });

  const drawer = `sw-d-${sz.name}-${L.RUN}-${Date.now() % 100_000}`;
  await as(drawer, sz, ["drawing"], async (page) => {
    await step("drawing", sz, page, async () => {
      await L.toBoard(page, drawer);
      await L.drawKey(page).tap();
      await L.canvas(page).waitFor();
      await L.sleep(1500);
      await L.shot(page, "draw", sz);
      await L.stroke(page);
      await measureDrawing(page, sz, "stroked");
      await L.shot(page, "draw-stroked", sz);
      await page.getByRole("button", { name: say(S.stickerCreation.tools.color) }).tap();
      await L.sleep(900);
      await measureDrawing(page, sz, "color");
      await L.shot(page, "draw-color", sz);
      const label = say(S.stickerCreation.colorSheet.title);
      await page.getByRole("button", { name: say(S.ui.sheet.close, { label }) }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: say(S.stickerCreation.tools.smoothing) }).tap();
      await L.sleep(600);
      await L.shot(page, "draw-smoothing", sz);
      const sheet = await L.canvas(page).boundingBox();
      await page.touchscreen.tap(sheet.x + sheet.width * 0.7, sheet.y + sheet.height * 0.7);
      await L.sleep(400);
      const box18 = await (await L.arm(page)).boundingBox();
      const check = await page
        .getByRole("button", { name: say(S.stickerCreation.seal.tapAgain) })
        .boundingBox();
      if (overlap(box18, check))
        L.log(`RULE drawing-armed-${sz.name}-${L.RUN}: the 18+ box overlaps the check`);
      await L.shot(page, "draw-armed", sz);
      // A short window seals on the day's last ticket, so its tallest Sealed card shows where room is least.
      if (sz.h < 700) await L.spendDailyTickets(drawer);
      await page.route(/\/api\/stickers\/?$/, async (route) => {
        if (route.request().method() === "POST") await L.sleep(4000);
        await route.continue();
      });
      const sealed = L.sealArmed(page);
      await L.sleep(2500);
      await L.shot(page, "draw-sealing", sz);
      await sealed;
      await L.sleep(800);
      await L.shot(page, "sealed-card", sz);
    });
  });

  const examinee = `sw-k-${sz.name}-${L.RUN}-${Date.now() % 100_000}`;
  await as(examinee, sz, ["kyoto-seika"], async (page) => {
    await step("kyoto-seika", sz, page, async () => {
      const on = await L.api(examinee, "POST", "/me/kyoto-seika-practice", {
        kyotoSeikaPractice: true,
      });
      if (on.status !== 200)
        throw new Error(`Kyoto Seika Practice Mode didn't switch on: ${on.status} ${on.text}`);
      await L.toBoard(page, examinee);
      await L.drawKey(page).tap();
      const begin = page.getByRole("button", { name: named(S.kyotoSeika.begin.label) });
      await begin.waitFor();
      await L.sleep(1500);
      await L.shot(page, "kyoto-seika-deal", sz);
      await begin.tap();
      await L.sleep(1200);
      await L.shot(page, "kyoto-seika-begun", sz);
    });
  });

  if (L.ENGINE === "chromium") {
    await as(
      ALICE,
      sz,
      ["motion-card"],
      async (page) => {
        await step("motion-card", sz, page, async () => {
          await L.toBoard(page, ALICE);
          const card = page.getByRole("dialog", { name: say(S.app.motionPermission.label) });
          if (
            await card.waitFor({ timeout: 8000 }).then(
              () => true,
              () => false,
            )
          )
            await L.shot(page, "motion-card", sz);
          else L.log(`MOTION ${sz.name} ${L.RUN}: the motion card didn't ask`);
        });
      },
      { askMotion: true },
    );
  }
}
L.log(failed ? `SWEEP ${L.RUN} FAILED ${failed} steps` : `SWEEP ${L.RUN} OK`);
process.exitCode = failed ? 1 : 0;
```

- [x] **`$S/gates.mjs`**, the gates at each size with a stand-in keyboard:

```js
// Scratch for the iPad small windows plan: the sign-in gates at each size, scrolled to their foot, and
// the handle prompt under a stand-in for iOS's keyboard. Usage: ENGINE=… LANGUAGE=… run gates.mjs <size,…>
import * as L from "./lib.mjs";

/** The keyboard stand-in's share of the height: an unverified guess near an iPad's docked keyboard. */
const KEYBOARD_SHARE = 0.55;
const sizes = L.sizesFrom(process.argv[2]);

/** iOS's keyboard as the page sees it: the visual viewport loses its foot, and says so. */
const raiseKeyboard = (page, px) =>
  page.evaluate((px) => {
    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      get: () => innerHeight - px,
    });
    visualViewport.dispatchEvent(new Event("resize"));
  }, px);

/** Where the gate's parts sit, and how far down the visible area reaches. */
const parts = (page) =>
  page.evaluate(() => {
    const gate = document.querySelector(".line-gate");
    const box = (selector) => {
      const r = gate.querySelector(selector)?.getBoundingClientRect();
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

const GATES = {
  // LIFF Mock's module never arrives, so LINE doesn't start.
  async lineDidntStart(page) {
    await page.route(/liff-mock/, (route) => route.abort());
    await page.goto(`${L.BASE}/?as=sw-gate`);
    await page.locator(".line-gate h1").waitFor();
  },
  // LINE doesn't answer the server, with a long reason under the failure.
  async signInFailed(page) {
    const detail = "LINE didn't answer: the connection to its verify endpoint timed out. "
      .repeat(6)
      .trim();
    await page.route(/\/api\/(session|me)(\?|$)/, (route) =>
      route.fulfill(json(502, { error: "line_unavailable", detail })),
    );
    await page.goto(`${L.BASE}/?as=sw-gate`);
    await page.locator(".line-gate h1").waitFor();
  },
  // A LINE name with "@" can't be a handle, so the app asks for one; a taken one shows the error line.
  async handlePrompt(page) {
    await page.route(/\/api\/me\/handle(\?|$)/, (route) =>
      route.fulfill(json(409, { error: "handle_taken", detail: "Someone else has @sw" })),
    );
    await page.goto(`${L.BASE}/?as=sw%40hp`);
    const field = page.locator(".handle-prompt input");
    await field.fill("sw");
    await field.press("Enter");
    await page.locator(".handle-prompt .error-line").waitFor();
  },
};

let failures = 0;
const fail = (at, why) => {
  failures++;
  L.log(`FAILED gate ${at}: ${why}`);
};
for (const sz of sizes) {
  for (const [gate, reach] of Object.entries(GATES)) {
    const at = `${gate}-${sz.name}-${L.RUN}`;
    const { browser, page } = await L.open({ size: sz });
    try {
      await reach(page);
      await L.sleep(500);
      await L.shot(page, `gate-${gate}`, sz);
      if ((await parts(page)).title.top < 0) fail(at, "its title is cut off at the top");
      await page.evaluate(() => {
        const gate = document.querySelector(".line-gate");
        gate.scrollTop = gate.scrollHeight;
      });
      const end = await parts(page);
      for (const part of ["field", "problem", "key"]) {
        if (end[part] && end[part].bottom > sz.h) fail(at, `its ${part} never scrolls into view`);
      }
      if (gate === "handlePrompt") {
        await page.evaluate(() => (document.querySelector(".line-gate").scrollTop = 0));
        await page.locator(".handle-prompt input").focus();
        await raiseKeyboard(page, Math.round(sz.h * KEYBOARD_SHARE));
        await L.sleep(300);
        const p = await parts(page);
        if (p.field.top < 0 || p.problem.bottom > p.shows || p.key.bottom > p.shows) {
          fail(at, `the keyboard covers the form ${JSON.stringify(p)}`);
        }
        await L.shot(page, `gate-${gate}-keyboard`, sz);
      }
    } catch (error) {
      fail(at, String(error).split("\n")[0]);
    } finally {
      await browser.close();
    }
  }
}
L.log(failures ? `GATES ${L.RUN} FAILED ${failures}` : `GATES ${L.RUN} OK`);
process.exitCode = failures ? 1 : 0;
```

- [x] **`$S/turn.mjs`**, turning or resizing the window mid-drawing, mid-drag and mid-scroll:

```js
// Scratch for the iPad small windows plan: the window turns or resizes from one size to another
// mid-drawing, mid-drag on the board, mid-scroll in Explore, and with gratitude events open.
// Usage: ENGINE=… run turn.mjs <from> <to>
import * as L from "./lib.mjs";

const { S, say, named } = L;
const [from, to] = [L.size(process.argv[2]), L.size(process.argv[3])];
const pair = `${from.name}-to-${to.name}`;
let failures = 0;
const fail = (scenario, why) => {
  failures++;
  L.log(`FAILED turn ${scenario} ${pair} ${L.RUN}: ${why}`);
};
const resize = (page, sz) => page.setViewportSize({ width: sz.w, height: sz.h });

async function scenario(label, name, act) {
  const { browser, page } = await L.open({ size: from, name });
  try {
    await act(page);
  } catch (error) {
    fail(label, String(error).split("\n")[0]);
    await page
      .screenshot({ path: `${L.OUT}/fail-turn-${label}-${pair}-${L.RUN}.png` })
      .catch(() => {});
  } finally {
    await browser.close();
  }
}

/** The sheet's shape on screen, and its painted ink's box as shares of the ink canvas. */
const sheetAndInk = (page) =>
  page.evaluate(() => {
    const sheet = document.querySelector(".drawing-screen .ink-sheet").getBoundingClientRect();
    const canvas = document.querySelector(".drawing-screen .ink-canvas");
    const { data, width, height } = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height);
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if (data[(y * width + x) * 4 + 3] < 128) continue;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
    }
    return {
      aspect: sheet.width / sheet.height,
      ink: x1 < 0 ? null : [x0 / width, y0 / height, x1 / width, y1 / height],
    };
  });

// A blank sheet follows the window; once marked, it keeps its shape and its ink, and seals whole.
const drawer = `sw-t-${pair}-${L.RUN}-${Date.now() % 100_000}`;
await scenario("drawing", drawer, async (page) => {
  await L.toBoard(page, drawer);
  await L.drawKey(page).tap();
  await L.canvas(page).waitFor();
  await L.sleep(1200);
  await resize(page, to);
  await L.sleep(1200);
  const blank = await sheetAndInk(page);
  if (blank.aspect > 1 !== to.w > to.h)
    fail("drawing", `a blank sheet didn't follow the window: ${blank.aspect.toFixed(2)}`);
  await resize(page, from);
  await L.sleep(1200);
  await L.stroke(page);
  const before = await sheetAndInk(page);
  await L.shot(page, `turn-drawing-${pair}-before`, from);
  await resize(page, to);
  await L.sleep(1200);
  const after = await sheetAndInk(page);
  await L.shot(page, `turn-drawing-${pair}-after`, to);
  if (Math.abs(after.aspect / before.aspect - 1) > 0.01)
    fail(
      "drawing",
      `the sheet's shape changed: ${before.aspect.toFixed(3)} → ${after.aspect.toFixed(3)}`,
    );
  if (!after.ink || before.ink.some((v, i) => Math.abs(v - after.ink[i]) > 0.02))
    fail("drawing", `the ink moved: ${before.ink} → ${after.ink}`);
  await L.arm(page);
  await L.sealArmed(page);
  await L.shot(page, `turn-drawing-${pair}-sealed`, to);
});

// Half a drag, the turn, the rest: the sticker stays on the board, and a reload finds it where it landed.
await scenario("board", "sw-alice", async (page) => {
  await L.toBoard(page, "sw-alice");
  const sticker = page.locator(".placed-sticker").first();
  const id = await sticker.getAttribute("data-sticker-id");
  const b = await sticker.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 30, { steps: 8 });
  await resize(page, to);
  await L.sleep(600);
  const [x, y] = [to.w * 0.45, to.h * 0.45];
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
  await L.sleep(1000);
  await L.shot(page, `turn-board-${pair}`, to);
  const same = `.placed-sticker[data-sticker-id="${id}"]`;
  const landed = await page.locator(same).boundingBox();
  const board = await page
    .getByRole("region", { name: say(S.stickerBoard.board.label) })
    .boundingBox();
  if (!landed) return fail("board", "the dragged sticker is gone");
  const [cx, cy] = [landed.x + landed.width / 2, landed.y + landed.height / 2];
  if (cx < board.x || cx > board.x + board.width || cy < board.y || cy > board.y + board.height) {
    fail("board", "the dragged sticker left the board");
  }
  // Turning keeps the layout, so the drag goes on under the finger; crossing 600 may end it where it was.
  const off = Math.hypot(cx - x, cy - y);
  if (from.large === to.large && off > 16)
    fail("board", `the dragged sticker landed ${Math.round(off)}px from the finger`);
  await L.toBoard(page, "sw-alice");
  const kept = await page.locator(same).boundingBox();
  if (!kept || Math.hypot(kept.x - landed.x, kept.y - landed.y) > 16)
    fail("board", "a reload put the sticker elsewhere");
});

// Scrolled down the pile: the sticker at the top of the view is still in view after the turn.
await scenario("explore", "sw-alice", async (page) => {
  await page.goto(`${L.BASE}/explore?as=sw-alice`, { waitUntil: "domcontentloaded" });
  await page.locator(".pile-sticker__button").first().waitFor({ timeout: 45_000 });
  await L.sleep(1500);
  /** Scrolls the pile's own scroller when asked; names the first pile sticker wholly in its view. */
  const look = (scroll) =>
    page.evaluate((scroll) => {
      const buttons = [...document.querySelectorAll(".pile-sticker__button")];
      let el = buttons[0].parentElement;
      while (
        el &&
        !(
          el.scrollHeight > el.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(el).overflowY)
        )
      )
        el = el.parentElement;
      const scroller = el ?? document.scrollingElement;
      if (scroll) scroller.scrollBy(0, scroller.clientHeight * 0.6);
      const view = el ? el.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const seen = buttons.find((b) => {
        const r = b.getBoundingClientRect();
        return r.height > 0 && r.top >= view.top && r.bottom <= view.bottom;
      });
      return { scrolled: scroller.scrollTop, label: seen?.getAttribute("aria-label") ?? null };
    }, scroll);
  await look(true);
  await L.sleep(800);
  const before = await look(false);
  if (!before.scrolled || !before.label)
    return L.log(`TURN explore ${pair} ${L.RUN}: the pile doesn't scroll here; skipped`);
  await L.shot(page, `turn-explore-${pair}-before`, from);
  await resize(page, to);
  await L.sleep(1500);
  await L.shot(page, `turn-explore-${pair}-after`, to);
  const after = await page.evaluate((label) => {
    const b = [...document.querySelectorAll(".pile-sticker__button")].find(
      (x) => x.getAttribute("aria-label") === label,
    );
    let el = b?.parentElement;
    while (
      el &&
      !(el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))
    )
      el = el.parentElement;
    const view = el ? el.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    const r = b?.getBoundingClientRect();
    return Boolean(r && r.bottom > view.top && r.top < view.bottom);
  }, before.label);
  if (!after) fail("explore", `${before.label} left the view`);
});

// Gratitude events open as the window turns: they stay whole on screen, sheet or card.
await scenario("events", "sw-bob", async (page) => {
  await L.toBoard(page, "sw-bob");
  await page.getByRole("button", { name: named(S.stickerBoard.board.yourStats) }).tap();
  await L.sleep(800);
  await page.getByText(say(S.stickerBoard.statBoard.gratitude.events.open)).tap();
  await L.sleep(1200);
  await resize(page, to);
  await L.sleep(1200);
  await L.shot(page, `turn-events-${pair}`, to);
  const box = await page.getByRole("dialog").last().boundingBox();
  if (
    !box ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > to.w + 1 ||
    box.y + box.height > to.h + 1
  ) {
    fail("events", `the open events run off the screen: ${JSON.stringify(box)}`);
  }
});

L.log(failures ? `TURN ${pair} ${L.RUN} FAILED ${failures}` : `TURN ${pair} ${L.RUN} OK`);
process.exitCode = failures ? 1 : 0;
```

- [x] **`$S/overlay.mjs`**, impeccable's in-page detector for Task 7, in the sweep's touch contexts (a desktop browser, the Playwright MCP's included, shows the phone frame instead):

```js
// Scratch for the iPad small windows plan: impeccable's detector run inside Croquis at each size.
// Usage: DETECT=http://localhost:<live-server port>/detect.js run overlay.mjs <size,…>
import * as L from "./lib.mjs";

const { S, say, named } = L;
const PAGES = {
  board: (page) => L.toBoard(page, "sw-alice"),
  explore: (page) => page.goto(`${L.BASE}/explore?as=sw-alice`, { waitUntil: "domcontentloaded" }),
  shop: async (page) => {
    await L.toBoard(page, "sw-alice");
    await page.getByRole("button", { name: say(S.app.tabs.shop), exact: true }).tap();
  },
  "stat-board": async (page) => {
    await L.toBoard(page, "sw-bob");
    await page.getByRole("button", { name: named(S.stickerBoard.board.yourStats) }).tap();
  },
  drawing: async (page) => {
    const name = `sw-o-${Date.now() % 100_000}`;
    await page.context().addCookies(await L.signIn(name));
    await L.toBoard(page, name);
    await L.drawKey(page).tap();
    await L.canvas(page).waitFor();
  },
};
for (const sz of L.sizesFrom(process.argv[2])) {
  for (const [surface, reach] of Object.entries(PAGES)) {
    const { browser, page } = await L.open({ size: sz, name: "sw-alice", engine: "chromium" });
    const said = [];
    page.on("console", (m) => m.text().includes("impeccable") && said.push(m.text()));
    try {
      await reach(page);
      await L.sleep(3000);
      await page.addScriptTag({ url: process.env.DETECT });
      await L.sleep(3000);
      L.log(
        `OVERLAY ${surface}-${sz.name}: ${said.length ? said.join(" | ") : "nothing reported"}`,
      );
      await L.shot(page, `overlay-${surface}`, sz);
    } catch (error) {
      L.log(`FAILED overlay ${surface}-${sz.name}: ${String(error).split("\n")[0]}`);
    } finally {
      await browser.close();
    }
  }
}
```

- [x] **Reading a run.** Problems, grouped across sizes:

```sh
rg "FAILED|PAGEERROR" "$S/run.log"
rg -o "RULE .*" "$S/run.log" | sed -E 's/-[0-9]+x[0-9]+-(webkit|chromium)-(en|ja)//' | sort | uniq -c | sort -rn
```

Contact sheets, each surface's sizes side by side in one engine and language (`webkit-en` here), to Read:

```sh
mkdir -p "$S/contact"
for s in $(ls "$S/shots" | sed -E 's/-[0-9]+x[0-9]+-(webkit|chromium)-(en|ja)\.png$//' | sort -u); do
  magick montage -label '%t' "$S"/shots/$s-[0-9]*x[0-9]*-webkit-en.png -tile x1 -geometry '360x780>+10+10' -background '#333' "$S/contact/$s.png"
done
```

### Task 4: Small windows

**Files:** whatever the checks find. Starts once `node "$S/probe.mjs"` prints `WEBKIT OK`, the servers answer and `$S/seed.json` exists.

- [ ] **Step 1: Run,** English, one background call per engine (`run_in_background`), the two at once:

```sh
for e in webkit; do
  ENGINE=$e run sweep.mjs 540x620,540x564,580x640,585x734,375x946,1000x560,600x600,683x946,1280x800
  ENGINE=$e run gates.mjs 540x620,540x564,580x640,585x734,375x946,1000x560,600x600,683x946
  ENGINE=$e run turn.mjs 585x734 1180x734
  ENGINE=$e run turn.mjs 1180x734 585x734
done
```

and the same with `for e in chromium`. The two turns go from beside another app to full screen and back, crossing 600. Expected, per engine: `SWEEP <engine>-en OK`, `GATES <engine>-en OK`, and `TURN … OK` twice.

- [ ] **Step 2: Read** the run (above) and the contact sheets against the check list: the phone column at every size but 600×600 and 683×946, the large column there; the desktop size shows the phone frame. Where the research saw LINE's sheet break, look first: the checkout's head cut off at 540×620, the Mini-game's pop-in words clipped at its edges, the gift's risen sticker under the Accept sheet below about 580px tall, the gift-received notice at 540×564, and stickers crowding Draw's row.
- [ ] **Step 3: Fix in one batch** (craft floor first, `/impeccable adapt` as the lens). Breaks in other plans' surfaces get fixed here; a change to a composition goes to ad0ll with its screenshots instead, and Open item 4's stretched wide-short window isn't a break.
- [ ] **Step 4:** Rerun only what failed (`sweep.mjs <sizes> <surfaces>`, or the one `gates.mjs` or `turn.mjs` call) once; no further rounds. `pnpm -C "$W" check` → passes.
- [ ] **Step 5: Commit** the fixes by path, if any: `fix(frontend): the phone layout holds in Split View, Slide Over and LINE's sheet on an iPad`

### Task 5: Turning the iPad

**Files:** whatever the check finds.

- [ ] **Step 1: Run,** one background call per engine, the two at once:

```sh
for e in webkit; do
  ENGINE=$e run turn.mjs 820x1094 1180x734
  ENGINE=$e run turn.mjs 1180x734 820x1094
  ENGINE=$e run turn.mjs 744x1047 1133x658
done
```

and the same with `for e in chromium`. Expected: `TURN … OK` three times per engine.

- [ ] **Step 2: Read** the `turn-*` shots: mid-drawing the marked sheet keeps its shape, scaled to fit, and its ink, and the sticker seals whole; a blank sheet takes the new shape; mid-drag the sticker stays under the finger and a reload keeps it there; the board follows the screen; in Explore the sticker at the top of the view stays in view; open gratitude events stay whole.
- [ ] **Step 3: Fix in one batch** (craft floor first, `/impeccable adapt` as the lens); rerun the failing pair once. `pnpm -C "$W" check` → passes.
- [ ] **Step 4: Commit** the fixes, if any: `fix(frontend): turning the iPad mid-drawing, mid-drag or mid-scroll loses nothing`

### Task 6: The sweep at every size

**Files:** whatever the sweep finds.

- [ ] **Step 1: Run** the brief's eight sizes, one background call per engine, the two at once:

```sh
for e in webkit; do
  ENGINE=$e run sweep.mjs 390x844,375x667,540x620,744x1047,820x1094,1133x658,1180x734,1376x946
  ENGINE=$e run gates.mjs 390x844,375x667,540x620,744x1047,820x1094,1133x658,1180x734,1376x946
done
```

and the same with `for e in chromium`; then Japanese in WebKit:

```sh
LANGUAGE=ja ENGINE=webkit run sweep.mjs 375x667,540x620,1180x734
LANGUAGE=ja ENGINE=webkit run gates.mjs 540x620,1180x734
```

Expected: `SWEEP … OK` and `GATES … OK` for every run.

- [ ] **Step 2: The end-to-end suite,** which starts its own servers: `pnpm -C "$W/apps/frontend" test:e2e`, then `E2E_WEBKIT=on pnpm -C "$W/apps/frontend" test:e2e` → every test passes in both engines.
- [ ] **Step 3: Read** against the check list, both columns, including 390×844's drawing offsets (`RULE drawing-stroked-390x844…` must not appear) and Japanese's fit.
- [ ] **Step 4: Fix in one batch** (craft floor first, `/impeccable adapt` as the lens); rerun only what failed, once. `pnpm -C "$W" check` → passes.
- [ ] **Step 5: Commit** the fixes, if any: `fix(frontend): every surface holds at every iPad and phone size`

### Task 7: Critique

Run from the coordinating session, which can start the skill's two isolated assessments; a subagent can't, and would leave a degraded critique.

- [ ] **Step 1: The detector's in-page evidence.** `(cd "$W" && ~/.claude/skills/impeccable/scripts/impeccable live-server --background)` prints its port; `DETECT=http://localhost:<port>/detect.js` with `run overlay.mjs 540x620,585x734,820x1094,1180x734`; then `(cd "$W" && ~/.claude/skills/impeccable/scripts/impeccable live-server stop)`, and `git -C "$W" status --short` lists nothing the server left (it can edit `apps/frontend/index.html`; restore it if so).
- [ ] **Step 2: Two critiques** through the impeccable skill (Skill tool), one per layout:
  - `critique apps/frontend/src: the phone layout in small windows, LINE's sheet on an iPad (540×620) and Safari beside another app (585×734), touch, English and Japanese. Screens: the board with its tray and stat board and Settings, gratitude events, a sticker's detail, the gift and give sheet, the Mini-game, Explore with someone else's board, the Shop and checkout, the drawing screen with the deal in Kyoto Seika Practice Mode, the Sealed card. Evidence: "$S"/shots/*-540x620-*.png, *-585x734-*.png and "$S"/contact/, which a desktop browser can't reproduce; the detector's in-page findings are the OVERLAY lines in "$S"/run.log. Questions skipped: the plan fixes every P0 and P1 in one batch.`
  - The same for the large layout at 820×1094 and 1180×734.
- [ ] **Step 3: Record** each critique's findings in `docs/review/<date>-ipad-finish.md` (the date in Tokyo) as they come in, and commit it on the branch: `docs: the iPad finish's critique`.
- [ ] **Step 4: Fix every P0 and P1 in one batch** (craft floor first). A finding that changes a design goes to ad0ll with its shots instead, and stays in the review doc. Rerun the sweep's affected surfaces once, at the sizes the findings named. `pnpm -C "$W" check` → passes.
- [ ] **Step 5: Commit:** `fix(frontend): the iPad critique's fixes`

### Task 8: Polish and audit

- [ ] **Step 1: Polish** through the impeccable skill: `polish apps/frontend/src across both layouts, at the sizes and with the evidence of Task 7`.
- [ ] **Step 2: Audit:** `audit apps/frontend/src`, whose integrity pass runs the detector over the frontend's markup:

```sh
(cd "$W" && ~/.claude/skills/impeccable/scripts/impeccable detect --json apps/frontend/src > "$S/detect.json"; echo "exit=$?")
```

Exit `0` is clean, `2` lists findings in `$S/detect.json`; verify each in context and call out false positives.

- [ ] **Step 3: Record** the audit's findings in the review doc; fix P0 and P1 in one batch; give each finding left its reason there. Rerun the affected surfaces once. `pnpm -C "$W" check` → passes.
- [ ] **Step 4: Commit:** `fix(frontend): the iPad polish and audit`

### Task 9: The docs

Each plan wrote its own sentences as it merged. Write what shipped: where the app differs from the words below, the words follow the app.

- [ ] **Step 1: DESIGN.md's Layout.** The first paragraph's opening sentence, "Every screen is a 390 × 844 iPhone viewport.", becomes "The phone layout is designed on a 390 × 844 iPhone viewport." Before it, a paragraph:

```md
Croquis has two layouts, chosen by the window, never the device. **The large layout** is for a touch screen at least 600 × 600, an iPad either way up: the same Sticker Trade Book composed for the room rather than stretched. Controls, type and stickers keep their phone sizes, and the room goes to the board, the pile and the sheet. Anything smaller keeps **the phone layout**: Split View, Slide Over, a short window, and LINE's sheet on an iPad, which stays phone-shaped (about 540 × 620) even sideways. In a window wider than a phone, stickers still stop at the widest phone's size. A desktop browser shows the phone layout inside a phone frame. The layout follows the window as it turns or resizes; a sheet that's been drawn on keeps its shape, and nothing open is lost.
```

After the first paragraph:

```md
**Short heights.** Under 700px tall the phone layout gives the sheet room: the color sheet stops at 42% with its heading hidden, and the size rail shortens to end 24px above undo. The sign-in gates center on the paper, scroll when what they hold is taller than the window, and keep the focused field above the on-screen keyboard.

**The large layout, screen by screen** (detailed under each component): the board has one header row and Draw at the tab row's left end, and keeps a layout of its own beside the phone's; the stat board is one centered cluster; the Shop is a banner over three shelves sideways and one column upright; Explore puts the search across the top, the pile and This week side by side; the drawing screen gives the sheet all but a slim top bar and sidebar, with colors in a popover; and the checkout, ticket cards, Sealed card and gratitude events rise to the middle at 400px.
```

- [ ] **Step 2: The rest of DESIGN.md.** Do's gain "**Do** lay out by the window: the large layout from a 600 × 600 touch screen, the phone layout below it and in a desktop's frame."; Don'ts gain "**Don't** stretch a key, card or sheet across an iPad: controls keep phone sizes, and the room goes to the board, the pile and the sheet." Read each component section against the large layout's shots, and fix each sentence still false.
- [ ] **Step 3: PRODUCT.md, where the iPad changes it.** Platform: "A phone web app inside LINE" becomes "A phone-first web app inside LINE". After the browser bullet:

```md
- On an iPad, LINE shows Croquis in its phone-size sheet, with the phone layout. In Safari or another browser, a touch screen at least 600 × 600 gets the large layout, composed for the room; a smaller window, such as Split View or Slide Over, keeps the phone's.
```

"iPhone is the target." becomes "iPhone is the target, and the iPad follows it with a layout of its own." Where a sentence says "the phone" for what an iPad now does too (the drawing in progress kept on it, the cut made on it, combos waiting on it, Storage), it says "the device".

- [ ] **Step 4: AGENTS.MD's Architecture,** only for a line no sibling plan wrote: `src/ui` gains its own line if none names it, "`src/ui` — shared controls and hooks, among them the large-screen query every layout reads (`largeScreen.ts`) and what the on-screen keyboard leaves visible (`visibleArea.ts`)". The vocabulary table stays.
- [ ] **Step 5:** `pnpm -C "$W" format:check` → passes. Commit: `docs: DESIGN.md and PRODUCT.md describe the iPad layouts as built`

### Task 10: Check, squash and merge

- [ ] **Step 1:** `pnpm -C "$W" check:full` → lint, typecheck, tests, format, Move tests and the production build pass; read knip's report and remove anything this work left unused.
- [ ] **Step 2: The review doc goes.** Its fixed findings are done; copy the open ones (each with its reason) into the closing summary's draft, then `git -C "$W" rm docs/review/<date>-ipad-finish.md` and commit.
- [ ] **Step 3: Squash** into four commits with no AI attribution lines (AGENTS.md):

```sh
git -C "$W" fetch origin && git -C "$W" rebase origin/main
git -C "$W" reset --soft origin/main && git -C "$W" restore --staged .
git -C "$W" add apps/frontend/src/ui/visibleArea.ts apps/frontend/src/ui/visibleArea.test.tsx apps/frontend/src/line apps/frontend/src/api/SessionGate.tsx apps/frontend/src/api/HandlePrompt.tsx apps/frontend/src/api/HandlePrompt.css apps/frontend/src/app/AppCrashBoundary.tsx
git -C "$W" commit -m "feat(frontend): the sign-in gates scroll and keep a field above the on-screen keyboard"
git -C "$W" add apps/frontend/src/sticker-creation/tools/SizeRail.css apps/frontend/src/sticker-creation/tools/ColorSheet.css apps/frontend/src/sticker-board/placement.ts apps/frontend/src/sticker-board/placement.test.ts apps/frontend/src/explore/pileLayout.ts apps/frontend/src/explore/pileLayout.test.ts apps/frontend/src/explore/StickerPile.tsx
git -C "$W" commit -m "fix(frontend): small windows keep a whole phone layout: phone-sized stickers, and a size rail and color sheet that fit short heights"
git -C "$W" add apps
git -C "$W" commit -m "fix(frontend): the iPad finish: every size, turning, and the critique, polish and audit fixes"
git -C "$W" add DESIGN.md PRODUCT.md AGENTS.MD
git -C "$W" commit -m "docs: DESIGN.md and PRODUCT.md describe the iPad layouts as built"
```

A commit with nothing staged is skipped. `git -C "$W" status --short` → empty; `git -C "$W" log --format=%B origin/main..HEAD | rg -i "co-authored|claude|generated"` → nothing. If the rebase brought in new commits, rerun `pnpm -C "$W" check`.

- [ ] **Step 4: Merge,** in the main checkout, in one command, once `git -C "$R" status` shows no merge in progress (other sessions merge there):

```sh
git -C "$R" fetch origin && git -C "$R" merge --ff-only origin/main && git -C "$R" merge-base --is-ancestor main feat/ipad-small-windows && git -C "$R" merge --ff-only feat/ipad-small-windows && git -C "$R" push origin main
```

If main moved, rebase in `$W` (Step 3's first line), check, and run it again.

### Task 11: Purge and close

- [ ] **Step 1: Stop** this plan's API and Vite (TaskStop, or `lsof -tiTCP:$APP_PORT -sTCP:LISTEN | xargs kill` and the same for `$API_PORT`), and the research dev servers if they still run from the research worktree: `lsof -nP -iTCP:5190 -sTCP:LISTEN` and `:8790`, each PID's `lsof -p <pid> | rg cwd` inside `$R/.claude/worktrees/ipad-research`, then `kill <pid>`.
- [ ] **Step 2: The draft and this worktree go:**

```sh
git -C "$R" worktree remove --force "$R/.claude/worktrees/ipad-research"
git -C "$R" branch -D spike/ipad-board
git -C "$R" worktree remove --force "$W"
git -C "$R" branch -d feat/ipad-small-windows
git -C "$R" worktree prune
```

`git -C "$R" worktree list` and `git -C "$R" branch --list '*ipad*'`: any other iPad worktree or branch is another session's; ask the coordinator before removing it.

- [ ] **Step 3: The brief and plans go,** on main with explicit paths: `git -C "$R" rm docs/superpowers/specs/2026-10-08-ipad-design-brief.md` plus every iPad plan still there (`git -C "$R" ls-files 'docs/superpowers/plans/*ipad*' docs/superpowers/plans/2026-10-08-small-fixes.md`, this one included), then `git -C "$R" commit -m "docs: the iPad work is built, so its brief and plans go" -- <those paths>` and `git -C "$R" push origin main`. `2026-10-08-board-feedback-backlog.md` is ad0ll's backlog and stays.
- [ ] **Step 4: Closing summary** for ad0ll: what each check found and fixed; the critique and audit findings left, with reasons; Open items 1–7 and the brief's open items (the My board icon, the My board tab's pink beside the gifts badge's, gifts on their way in the sticker detail); what no check here reaches: LINE's sheet on a real iPad (its size and header), 320px windows, and how a wide, short window looks.

## Self-review

- **Brief coverage:** below 600×600 the phone layout: Tasks 3 and 4, with the query's edges (600×600, 683×946) and the desktop frame; the short-height pass for the rail and color sheet: Task 2, measured in Tasks 4 and 6; the sign-in gates: Task 1, checked by `gates.mjs`; turning mid-drawing, mid-drag and mid-scroll: Task 5, and crossing 600 in Task 4; the sweep at the eight sizes in both engines: Task 6; critique, polish and audit with `impeccable detect --json`: Tasks 7 and 8; DESIGN.md's large-layout sections and PRODUCT.md: Task 9; the squash with no AI credit and the merge: Task 10; the brief, plans, `spike/ipad-board` and its worktree: Task 11. WebKit is probed in Setup Step 3, before any task.
- **Placeholders:** none in code. What the checks find can't be written in advance; each check gets one batch of fixes and one rerun.
- **Names:** `GatePaper`, `useVisibleArea`, `VisibleArea`, `PHONE_UNIT_MAX`, `unitOf`, `MAX_PILE_SCALE` and `pileFit(px)` match across tasks. The scripts read only what `lib.mjs` defines; sibling plans' names are listed under Depends on.
