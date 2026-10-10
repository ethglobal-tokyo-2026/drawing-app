/**
 * Tests Croquis in real iPadOS Safari, on the iPad Air 11-inch simulator through safaridriver (W3C
 * WebDriver over fetch), for what Safari's own UI can get wrong and Playwright's WebKit can't show:
 * Safari's toolbars and the home indicator over controls, overflow, turning the iPad, iOS's motion
 * prompt, its native pickers, touch ink, and the session cookie surviving a reload. It makes no Apple
 * Pencil input: Simulator has none, and safaridriver turns a pen action into a finger's touch. Run it
 * after changing large-screen layouts, sheets, the tab bar, or touch input:
 *
 *   pnpm --filter frontend test:ipad-safari
 *
 * It needs Xcode with an iOS simulator runtime, and Accessibility access for the terminal, which opens
 * and turns the iPad's window through Simulator's menus. IPAD names another simulator. It starts its own
 * API, HTTPS Vite (Safari drops the Secure session cookie over http://localhost, so the iPad is told to
 * trust a cert for localhost) and safaridriver, logs PASS or FAIL per check with what it measured, keeps
 * screenshots of failures only, in data/ipad-safari/failures/, and exits non-zero on any FAIL.
 */
import { type ChildProcess, execFile, spawn, type SpawnOptions } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { strings } from "../src/i18n/strings";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const out = `${root}data/ipad-safari`;
const IPAD = process.env.IPAD ?? "iPad Air 11-inch (M4)";
const { app, explore, shop, stickerBoard, stickerCreation } = strings;

type Point = { x: number; y: number };

const log = (line: string) =>
  console.log(`[ipad-safari ${new Date().toISOString().slice(11, 19)}] ${line}`);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function until<T>(what: string, check: () => Promise<T>, ms = 30_000, every = 250) {
  const end = Date.now() + ms;
  let last: unknown;
  while (Date.now() < end) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await sleep(every);
  }
  throw new Error(
    `Timed out after ${ms} ms waiting for ${what}${last ? `: ${messageOf(last)}` : ""}`,
  );
}

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        address !== null && typeof address === "object"
          ? resolve(address.port)
          : reject(new Error("No port was free")),
      );
    });
  });

const simctl = (...args: string[]) =>
  run("xcrun", ["simctl", ...args], { maxBuffer: 64 << 20, timeout: 180_000 });

/** Runs AppleScript in Simulator's process through System Events. */
const inSimulator = (script: string) =>
  run(
    "osascript",
    [
      "-e",
      'tell application "Simulator" to activate',
      "-e",
      `tell application "System Events" to tell process "Simulator"\n${script}\nend tell`,
    ],
    { timeout: 30_000 },
  );

const rotate = (direction: "Left" | "Right") =>
  inSimulator(`perform action "AXRaise" of (first window whose name contains "${IPAD}")
  click menu item "Rotate ${direction}" of menu "Device" of menu bar 1`);

/** The simulator IPAD names, on the newest iOS runtime that has it. */
async function pickIpad() {
  const listed: unknown = JSON.parse((await simctl("list", "devices", "available", "-j")).stdout);
  if (!isRecord(listed) || !isRecord(listed.devices)) throw new Error("simctl listed no devices");
  const runtimes = Object.entries(listed.devices)
    .filter(([runtime]) => runtime.includes("iOS"))
    .toSorted(([a], [b]) => b.localeCompare(a, "en", { numeric: true }));
  for (const [, devices] of runtimes) {
    const found = (Array.isArray(devices) ? (devices as unknown[]) : []).find(
      (device) => isRecord(device) && device.name === IPAD,
    );
    if (isRecord(found) && typeof found.udid === "string") {
      return { udid: found.udid, booted: found.state === "Booted" };
    }
  }
  throw new Error(`No simulator named "${IPAD}": make one with \`xcrun simctl create\``);
}

async function localhostCert() {
  const dir = `${out}/tls`;
  const key = `${dir}/localhost-key.pem`;
  const cert = `${dir}/localhost-cert.pem`;
  if (!existsSync(cert)) {
    mkdirSync(dir, { recursive: true });
    log("making a self-signed cert for localhost");
    await run("openssl", [
      ...[
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "800",
        "-subj",
        "/CN=localhost",
      ],
      ...["-keyout", key, "-out", cert],
      ...["-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"],
      ...["-addext", "extendedKeyUsage=serverAuth"],
    ]);
  }
  return { key, cert };
}

const children: ChildProcess[] = [];
function start(name: string, command: string, args: string[], options: SpawnOptions = {}) {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  const file = `${out}/${name}.log`;
  writeFileSync(file, "");
  const append = (chunk: Buffer) => writeFileSync(file, chunk, { flag: "a" });
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  children.push(child);
}

const httpsUp = (url: string, ca: Buffer) =>
  new Promise<boolean>((resolve) => {
    const req = request(url, { ca, timeout: 2_000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => req.destroy());
    req.end();
  });

/** Boots the iPad with its window open, and starts the API, HTTPS Vite and safaridriver. */
async function bringUp() {
  mkdirSync(out, { recursive: true });
  const ipad = await pickIpad();
  if (!ipad.booted) await simctl("boot", ipad.udid);
  await simctl("bootstatus", ipad.udid);
  // Simulator opens no window for a device booted from the command line, and turning needs one.
  await inSimulator(`if (count of (windows whose name contains "${IPAD}")) is 0 then
    click menu item "${IPAD}" of menu 1 of menu item "Open Simulator" of menu "File" of menu bar 1
    delay 3
  end if`);
  const tls = await localhostCert();
  await simctl("keychain", ipad.udid, "add-root-cert", tls.cert);

  const [apiPort, appPort, driverPort] = [await freePort(), await freePort(), await freePort()];
  const data = `${out}/db`;
  rmSync(data, { recursive: true, force: true });
  mkdirSync(`${data}/images`, { recursive: true });
  const appOrigin = `https://localhost:${appPort}`;
  // As the end-to-end suite starts them (playwright.config.ts), but the app over HTTPS.
  start("api", process.execPath, ["--env-file=.env.example", "src/server.ts"], {
    cwd: `${root}apps/api`,
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATABASE_URL: `${data}/drawing-app.db`,
      IMAGE_DIR: `${data}/images`,
      IMAGE_BASE_URL: `${appOrigin}/api/images`,
      DEV_SIGN_IN: "on",
      STICKER_CHAIN_MODE: "mock",
    },
  });
  const viteConfig = `${out}/vite.config.ts`;
  writeFileSync(
    viteConfig,
    `import { readFileSync } from "node:fs";
import e2e from ${JSON.stringify(`${root}apps/frontend/e2e/vite.config.ts`)};
const https = { key: readFileSync(${JSON.stringify(tls.key)}), cert: readFileSync(${JSON.stringify(tls.cert)}) };
export default { ...e2e, server: { ...e2e.server, https } };
`,
  );
  start("vite", `${root}apps/frontend/node_modules/.bin/vite`, ["--config", viteConfig], {
    cwd: `${root}apps/frontend`,
    env: {
      ...process.env,
      E2E_APP_PORT: String(appPort),
      E2E_API_PORT: String(apiPort),
      VITE_LIFF_MOCK: "on",
    },
  });
  start("safaridriver", "safaridriver", ["-p", String(driverPort)]);
  const driver = `http://127.0.0.1:${driverPort}`;
  const api = async () => (await fetch(`http://127.0.0.1:${apiPort}/api/me`)).status > 0;
  await until("the API", api, 60_000);
  await until("Vite over HTTPS", () => httpsUp(appOrigin, readFileSync(tls.cert)), 60_000);
  await until("safaridriver", async () => {
    const body: unknown = await (await fetch(`${driver}/status`)).json();
    return isRecord(body) && isRecord(body.value) && body.value.ready === true;
  });
  log(`${IPAD}: API :${apiPort}, app ${appOrigin}, safaridriver :${driverPort}`);
  return { ...ipad, appOrigin, driver };
}

// In the page: controls found by role and accessible name, waits that poll the DOM, and where Safari
// leaves room for content: the visual viewport, less the safe-area insets (the home indicator's).
const LIB = `
const ROLES = {
  button: "button, [role=button], a",
  tab: "nav button",
  named: "[aria-label]",
  region: "section, [role=region], [aria-label], [aria-labelledby]",
  radiogroup: "[role=radiogroup]",
  dialog: "[role=dialog], dialog",
  input: "input, textarea",
};
const shown = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
const nameOf = (el) => (el.getAttribute("aria-label")
  ?? ((el.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim()
  || (el.labels?.[0]?.textContent ?? el.getAttribute("placeholder") ?? el.textContent))).trim();
const named = (role, source) => [...document.querySelectorAll(ROLES[role])].find((el) => shown(el) && new RegExp(source).test(nameOf(el))) ?? null;
const waitFor = async (what, check, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = check(); if (v) return v; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error("timed out waiting for " + what);
};
const click = async (role, source) => { const el = await waitFor(role + " /" + source + "/", () => named(role, source)); el.click(); return el; };
const rest = (ms) => new Promise((r) => setTimeout(r, ms));
const room = () => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;inset:0 auto auto 0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.append(probe);
  const s = getComputedStyle(probe);
  const inset = { top: parseFloat(s.paddingTop), right: parseFloat(s.paddingRight), bottom: parseFloat(s.paddingBottom), left: parseFloat(s.paddingLeft) };
  probe.remove();
  const v = visualViewport;
  return { inset, top: v.offsetTop + inset.top, left: v.offsetLeft + inset.left, right: v.offsetLeft + v.width - inset.right, bottom: v.offsetTop + v.height - inset.bottom };
};
const fits = (controls) => {
  const r = room();
  const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
  const outside = [];
  for (const [label, role, source] of controls) {
    const el = named(role, source);
    if (!el) { outside.push(label + " missing"); continue; }
    const b = el.getBoundingClientRect();
    if (b.top < r.top - 0.5 || b.left < r.left - 0.5 || b.right > r.right + 0.5 || b.bottom > r.bottom + 0.5) {
      outside.push(label + " at " + [b.left, b.top, b.right, b.bottom].map(Math.round).join(","));
    }
  }
  return { viewport: [innerWidth, innerHeight], inset: r.inset, overflow, outside };
};
`;

const literal = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactly = (text: string) => `^${literal(text)}$`;
const startsWith = (text: string) => `^${literal(text)}`;
const fill = (leaf: { en: string }, vars: Record<string, string>) =>
  leaf.en.replaceAll(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");

const board = exactly(stickerBoard.board.label.en);
const canvas = startsWith(stickerCreation.canvas.en);
const flip = `${literal(fill(stickerBoard.board.yourStats, { name: "" }))}$`;
const drawKey = `^(${literal(fill(stickerBoard.board.drawLabelWithTickets, { tickets: "" }))}|${literal(stickerBoard.board.continueDrawing.en)}$)`;
const tabs: [string, string, string][] = [
  ["My board tab", "tab", exactly(app.tabs.myBoard.en)],
  ["Explore tab", "tab", exactly(app.tabs.explore.en)],
  ["Shop tab", "tab", exactly(app.tabs.shop.en)],
];

/** Each screen: how to open it from the one before, and the controls that must sit in Safari's room. */
const SCREENS: {
  name: string;
  open: string;
  args: string[];
  controls: [string, string, string][];
}[] = [
  {
    name: "board",
    open: `await click("tab", args[0]); await waitFor("the board", () => named("named", args[1]));`,
    args: [exactly(app.tabs.myBoard.en), board],
    controls: [...tabs, ["Draw", "button", drawKey], ["Flip", "button", flip]],
  },
  {
    name: "stat board",
    open: `await click("button", args[0]); await waitFor("Settings", () => named("region", args[1]));`,
    args: [flip, exactly(stickerBoard.settings.title.en)],
    controls: [...tabs, ["Flip back", "button", exactly(stickerBoard.statBoard.flipBack.en)]],
  },
  {
    name: "Shop",
    open: `await click("tab", args[0]); await waitFor("Buy", () => named("button", args[1]));`,
    args: [exactly(app.tabs.shop.en), exactly(shop.reserve.buy.en)],
    controls: [...tabs, ["Buy reserve tickets", "button", exactly(shop.reserve.buy.en)]],
  },
  {
    name: "Explore",
    open: `await click("tab", args[0]); await waitFor("search", () => named("input", args[1]));`,
    args: [exactly(app.tabs.explore.en), exactly(explore.search.label.en)],
    controls: [...tabs, ["artist search", "input", exactly(explore.search.label.en)]],
  },
  {
    name: "drawing screen",
    open: `await click("tab", args[0]);
             await waitFor("the board", () => named("named", args[1]));
             await click("button", args[2]);
             await waitFor("the canvas", () => named("named", args[3]), 20000);`,
    args: [exactly(app.tabs.myBoard.en), board, drawKey, canvas],
    controls: [
      ["canvas", "named", canvas],
      ["Seal", "button", exactly(stickerCreation.seal.label.en)],
      ["Undo", "button", exactly(stickerCreation.history.undo.en)],
    ],
  },
];

const isPoint = (value: unknown): value is Point =>
  isRecord(value) && typeof value.x === "number" && typeof value.y === "number";

async function test({ udid, appOrigin, driver }: Awaited<ReturnType<typeof bringUp>>) {
  let session = "";
  let failures = 0;
  let passes = 0;
  const wd = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const res = await fetch(`${driver}/session${session ? `/${session}` : ""}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const reply: unknown = await res.json();
    const value = isRecord(reply) ? reply.value : undefined;
    if (isRecord(value) && typeof value.error === "string") {
      throw new Error(`WebDriver ${method} ${path}: ${value.error}: ${String(value.message)}`);
    }
    return value;
  };
  /** Runs `body` in the page as an async function; it sees LIB and `args`. */
  const page = async (body: string, ...args: unknown[]) => {
    const script = `const done = arguments[arguments.length - 1];
const args = [...arguments].slice(0, -1);
${LIB}
(async () => { ${body} })().then((value) => done({ ok: true, value }), (e) => done({ ok: false, error: String(e?.message ?? e) }));`;
    const result = await wd("POST", "/execute/async", { script, args });
    if (!isRecord(result) || result.ok !== true) {
      throw new Error(isRecord(result) ? String(result.error) : "the page script returned nothing");
    }
    return result.value;
  };
  const failureShot = async (name: string) => {
    const base = `${out}/failures/${name.replaceAll(/[^A-Za-z0-9]+/g, "-")}`;
    mkdirSync(`${out}/failures`, { recursive: true });
    writeFileSync(
      `${base}.page.png`,
      Buffer.from(String(await wd("GET", "/screenshot")), "base64"),
    );
    await simctl("io", udid, "screenshot", `${base}.device.png`);
    return `${base.slice(root.length)}.{page,device}.png`;
  };
  /** One check: PASS with what it measured, or FAIL with why and a screenshot. */
  const check = async (name: string, fn: () => Promise<string>) => {
    try {
      log(`PASS ${name}: ${await fn()}`);
      passes++;
    } catch (error) {
      failures++;
      const shot = session ? await failureShot(name).catch((e: unknown) => messageOf(e)) : "";
      log(`FAIL ${name}: ${messageOf(error)}${shot ? ` (${shot})` : ""}`);
    }
  };
  /** A finger touching down at the first of `points`, through the rest, in viewport CSS px. */
  const touch = async (points: Point[]) => {
    const actions = [
      { type: "pointerMove", duration: 0, origin: "viewport", ...points[0] },
      { type: "pointerDown", button: 0 },
      ...points
        .slice(1)
        .map((at) => ({ type: "pointerMove", duration: 16, origin: "viewport", ...at })),
      { type: "pointerUp", button: 0 },
    ];
    await wd("POST", "/actions", {
      actions: [{ type: "pointer", id: "touch", parameters: { pointerType: "touch" }, actions }],
    });
    await wd("DELETE", "/actions");
  };
  /**
   * Pixels holding ink in what the sheet shows: every visible ink canvas on it, 0×0 ones skipped,
   * composited in DOM order at its effective CSS opacity, as a stroke in progress is on one of its own.
   */
  const inkedPixels = async () =>
    Number(
      await page(`const sheet = document.querySelector(".ink-sheet");
        if (!sheet) return 0;
        const box = sheet.getBoundingClientRect();
        const shown = [...sheet.querySelectorAll(".ink-canvas")].filter((c) => {
          const at = c.getBoundingClientRect();
          return c.width > 0 && c.height > 0 && at.width > 0 && at.height > 0
            && getComputedStyle(c).visibility === "visible";
        });
        if (shown.length === 0) return 0;
        const k = Math.max(...shown.map((c) => c.width / c.getBoundingClientRect().width));
        const out = document.createElement("canvas");
        out.width = Math.round(box.width * k);
        out.height = Math.round(box.height * k);
        const g = out.getContext("2d", { willReadFrequently: true });
        for (const c of shown) {
          let opacity = 1;
          for (let el = c; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity);
          const at = c.getBoundingClientRect();
          g.globalAlpha = opacity;
          g.drawImage(c, (at.left - box.left) * k, (at.top - box.top) * k, at.width * k, at.height * k);
        }
        const { data } = g.getImageData(0, 0, out.width, out.height);
        out.width = 0;
        out.height = 0;
        let inked = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
        return inked;`),
    );
  /** A wavy stroke across the canvas's middle half, `down` of the way down. */
  const strokeAcross = async (down: number) => {
    const points = await page(
      `const b = (await waitFor("the canvas", () => named("named", args[0]))).getBoundingClientRect();
       return Array.from({ length: 17 }, (_, i) => ({
         x: Math.round(b.x + b.width * (0.25 + (0.5 * i) / 16)),
         y: Math.round(b.y + b.height * args[1] + Math.sin(i / 3) * 20),
       }));`,
      canvas,
      down,
    );
    if (!Array.isArray(points) || !points.every(isPoint))
      throw new Error("No stroke on the canvas");
    return points;
  };
  /** Touches `choice` in the radio group named `group`; resolves with the group's checked choice. */
  const touchRadio = async (group: string, choice: string) => {
    const at = await page(
      `const group = await waitFor("the row", () => named("radiogroup", args[0]));
       const radio = [...group.querySelectorAll("[role=radio]")].find((r) => nameOf(r) === args[1]);
       radio.scrollIntoView({ block: "center" });
       await rest(400);
       const b = radio.getBoundingClientRect();
       return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };`,
      exactly(group),
      choice,
    );
    if (!isPoint(at)) throw new Error(`No ${choice} in ${group}`);
    await touch([at]);
    return page(
      `await rest(600);
       const radios = [...named("radiogroup", args[0]).querySelectorAll("[role=radio]")];
       return nameOf(radios.find((r) => r.getAttribute("aria-checked") === "true"));`,
      exactly(group),
    );
  };
  const fitsNow = async (screen: (typeof SCREENS)[number]) => {
    const seen = await page(`await rest(800); return fits(args[0]);`, screen.controls);
    if (!isRecord(seen)) throw new Error("No measurement");
    const summary = `viewport ${JSON.stringify(seen.viewport)}, safe-area ${JSON.stringify(seen.inset)}, overflow ${String(seen.overflow)} px`;
    if (Number(seen.overflow) > 1) throw new Error(`overflows sideways: ${summary}`);
    if (Array.isArray(seen.outside) && seen.outside.length > 0) {
      throw new Error(`outside Safari's room: ${seen.outside.join("; ")}; ${summary}`);
    }
    return summary;
  };
  const turn = async (direction: "Left" | "Right") => {
    await rotate(direction);
    const landscape = direction === "Left";
    await until(
      landscape ? "a landscape viewport" : "a portrait viewport",
      async () => (await page("return innerWidth > innerHeight")) === landscape,
      15_000,
      300,
    );
  };

  await check("a WebDriver session on the iPad's Safari", async () => {
    const created = await wd("POST", "", {
      capabilities: {
        alwaysMatch: {
          browserName: "Safari",
          platformName: "iOS",
          "safari:useSimulator": true,
          "safari:deviceType": "iPad",
          "safari:deviceUDID": udid,
          acceptInsecureCerts: true,
        },
      },
    });
    if (!isRecord(created) || typeof created.sessionId !== "string")
      throw new Error("No session id");
    session = created.sessionId;
    await wd("POST", "/timeouts", { script: 60_000 });
    return session;
  });
  if (!session) return failures;
  try {
    // A first visit, whatever an earlier run left in this Safari, such as the motion card declined.
    await wd("POST", "/url", { url: `${appOrigin}/api/me` });
    await page("localStorage.clear(); sessionStorage.clear();");
    const who = `sim-ipad-${Math.random().toString(36).slice(2, 8)}`;
    await check("signing in shows the board", async () => {
      await wd("POST", "/url", { url: `${appOrigin}/?as=${who}` });
      await page(`await waitFor("the board", () => named("named", args[0]), 30000);`, board);
      return who;
    });
    await check("iOS's motion prompt is asked for once, and Don't allow closes it", async () => {
      const asked = await page(
        `if (!named("dialog", args[0])) return false;
         await click("button", args[1]);
         await waitFor("the card to go", () => !named("dialog", args[0]));
         return true;`,
        exactly(app.motionPermission.label.en),
        exactly(app.motionPermission.dontAllow.en),
      );
      if (asked !== true)
        throw new Error("the motion card never showed, though Safari has requestPermission");
      return "asked; declined";
    });
    await check("the session survives a reload", async () => {
      await wd("POST", "/refresh", {});
      const status = await page(
        `await waitFor("the board", () => named("named", args[0]), 30000);
         return (await fetch("/api/me")).status;`,
        board,
      );
      if (status !== 200)
        throw new Error(`GET /api/me answered ${String(status)} after the reload`);
      return "GET /api/me 200";
    });

    for (const screen of SCREENS) {
      let opened = false;
      await check(`${screen.name}, upright: in Safari's room, no overflow`, async () => {
        await page(screen.open, ...screen.args);
        opened = true;
        return fitsNow(screen);
      });
      if (!opened) continue;
      if (screen.name === "stat board") {
        await check("choice rows are segmented radio groups, with no native picker", async () => {
          const rows = await page(
            `return { selects: document.querySelectorAll("select").length, rows: [...document.querySelectorAll("[role=radiogroup]")].map((g) => nameOf(g) + ": " + g.querySelectorAll("[role=radio]").length) };`,
          );
          if (!isRecord(rows) || rows.selects !== 0) {
            throw new Error(`a native select is on the stat board: ${JSON.stringify(rows)}`);
          }
          const { hand } = stickerBoard.settings.drawing;
          const left = await touchRadio(hand.label.en, hand.left.en);
          const right = await touchRadio(hand.label.en, hand.right.en);
          if (left !== hand.left.en || right !== hand.right.en) {
            throw new Error(
              `touching ${hand.label.en}'s choices checked ${String(left)}, then ${String(right)}`,
            );
          }
          return `${JSON.stringify(rows.rows)}; a touch checks Left, then Right`;
        });
      }
      if (screen.name === "drawing screen") {
        await check("a touch stroke paints the canvas", async () => {
          // A fresh sheet takes ink once the server has answered its ticket's spend.
          const before = await inkedPixels();
          const after = await until(
            "ink from a touch stroke",
            async () => {
              await touch(await strokeAcross(0.35));
              const inked = await inkedPixels();
              return inked > before ? inked : 0;
            },
            20_000,
            500,
          );
          return `painted px ${before} → ${after}`;
        });
      }
      await check(`${screen.name}, turned: re-laid in Safari's room, no overflow`, async () => {
        await turn("Left");
        try {
          return await fitsNow(screen);
        } finally {
          await turn("Right");
        }
      });
    }
  } finally {
    await wd("DELETE", "").catch((error: unknown) =>
      log(`ending the session failed: ${messageOf(error)}`),
    );
  }
  log(`${passes} passed, ${failures} failed`);
  return failures;
}

let up: Awaited<ReturnType<typeof bringUp>> | undefined;
try {
  rmSync(`${out}/failures`, { recursive: true, force: true });
  up = await bringUp();
  process.exitCode = (await test(up)) > 0 ? 1 : 0;
} catch (error) {
  log(`FAIL bringing up the iPad and servers: ${messageOf(error)}`);
  process.exitCode = 1;
} finally {
  for (const child of children) child.kill();
  if (up && !up.booted) {
    log(`shutting ${IPAD} down`);
    await simctl("shutdown", up.udid).catch((error: unknown) =>
      log(`shutdown failed: ${messageOf(error)}`),
    );
  }
}
