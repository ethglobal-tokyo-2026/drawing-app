/**
 * Tests Croquis in real iPadOS Safari, on the iPad Air 11-inch simulator through safaridriver (W3C
 * WebDriver over fetch), for what Safari's own UI can get wrong and Playwright's WebKit can't show:
 * Safari's toolbars and the home indicator over controls, overflow, turning the iPad, Croquis's
 * motion-permission card, native pickers, touch ink, and the session cookie surviving a reload. It makes no Apple
 * Pencil input: Simulator has none, and safaridriver turns a pen action into a finger's touch. Run it
 * after changing large-screen layouts, sheets, the tab bar, or touch input:
 *
 *   pnpm --filter frontend test:ipad-safari
 *
 * It needs Xcode 27 with an iOS simulator runtime; devicectl sets the selected iPad's orientation.
 * IPAD selects another simulator by name or UDID. It starts its own
 * API, HTTPS Vite (Safari drops the Secure session cookie over http://localhost, so the iPad is told to
 * trust a cert for localhost) and safaridriver, logs PASS or FAIL per check with what it measured, keeps
 * screenshots of failures only, in data/ipad-safari/failures/, and exits non-zero on any FAIL.
 * IPAD_LAMINATE_ONLY=1 instead checks the laminate fixture in portrait and both landscape
 * orientations. It keeps pixel measurements and screenshots in data/ipad-safari/laminate/ and
 * limits setup, checks, and cleanup to 180 seconds. Synthetic tilt checks Safari rendering and
 * light input handling; it does not establish that a physical iPad delivers sensor readings.
 * IPAD_STICKER_DRAG_ONLY=1 instead records native touch on 15 overlapping large stickers. It
 * exports the existing performance recorder, each input phase, and successful screenshots in
 * data/ipad-safari/sticker-drag/ under the same 180-second limit. Simulator frame timing does
 * not establish physical iPad sensor delivery or ProMotion rendering.
 * IPAD_STICKER_TRACE=1 adds an eight-second Time Profiler capture. A simulator booted by this run
 * includes its Safari, workers, graphics, and compositor processes; a shared booted simulator
 * requires one identifiable new Safari content process. The explicit simulator target excludes
 * the Mac's unrelated apps. Instrumented timings are for attribution, not frame qualification.
 */
import { type ChildProcess, execFile, spawn, type SpawnOptions } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describeIpadServerCleanupFailure, stopIpadServers } from "./ipadServers";
import { IpadSimulator } from "./ipadSimulator";
import { strings } from "../src/i18n/strings";
import { assertSessionPersisted } from "../e2e/sessionPersistence.ts";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const out = `${root}data/ipad-safari`;
const IPAD = process.env.IPAD ?? "iPad Air 11-inch (M4)";
const laminateOnly = process.env.IPAD_LAMINATE_ONLY === "1";
const stickerDragOnly = process.env.IPAD_STICKER_DRAG_ONLY === "1";
const boundedDiagnostic = laminateOnly || stickerDragOnly;
const diagnosticName = stickerDragOnly ? "sticker drag" : "laminate";
const diagnosticStarted = Date.now();
const diagnosticEnd = boundedDiagnostic ? diagnosticStarted + 180_000 : Infinity;
let cleaningUp = false;
const { app, explore, shop, stickerBoard, stickerCreation } = strings;

type Point = { x: number; y: number };

const log = (line: string) =>
  console.log(`[ipad-safari ${new Date().toISOString().slice(11, 19)}] ${line}`);
/** Reserve 25 seconds for the existing session, server, and simulator cleanup. */
const timeoutFor = (ms: number) => {
  const remaining = diagnosticEnd - (cleaningUp ? 0 : 25_000) - Date.now();
  if (remaining <= 0)
    throw new Error(`The iPad ${diagnosticName} diagnostic reached its 180-second limit`);
  return Math.max(1, Math.min(ms, remaining, cleaningUp && boundedDiagnostic ? 5_000 : Infinity));
};
const sleep = async (ms: number) => {
  const bounded = timeoutFor(ms);
  await new Promise((resolve) => setTimeout(resolve, bounded));
  if (bounded < ms)
    throw new Error(`The iPad ${diagnosticName} diagnostic exhausted its check time`);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function until<T>(what: string, check: () => Promise<T>, ms = 30_000, every = 250) {
  const end = Date.now() + timeoutFor(ms);
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
  run("xcrun", ["simctl", ...args], { maxBuffer: 64 << 20, timeout: timeoutFor(180_000) });

/** The simulator IPAD names, on the newest iOS runtime that has it. */
async function pickIpad() {
  const listed: unknown = JSON.parse((await simctl("list", "devices", "available", "-j")).stdout);
  if (!isRecord(listed) || !isRecord(listed.devices)) throw new Error("simctl listed no devices");
  const runtimes = Object.entries(listed.devices)
    .filter(([runtime]) => runtime.includes("iOS"))
    .toSorted(([a], [b]) => b.localeCompare(a, "en", { numeric: true }));
  for (const [runtime, devices] of runtimes) {
    const found = (Array.isArray(devices) ? (devices as unknown[]) : []).find(
      (device) => isRecord(device) && (device.name === IPAD || device.udid === IPAD),
    );
    if (isRecord(found) && typeof found.udid === "string") {
      return {
        udid: found.udid,
        name: String(found.name),
        runtime,
        booted: found.state === "Booted",
      };
    }
  }
  throw new Error(`No simulator matching "${IPAD}": make one with \`xcrun simctl create\``);
}

async function localhostCert() {
  const dir = `${out}/tls`;
  const key = `${dir}/localhost-key.pem`;
  const cert = `${dir}/localhost-cert.pem`;
  if (!existsSync(cert)) {
    mkdirSync(dir, { recursive: true });
    log("making a self-signed cert for localhost");
    await run(
      "openssl",
      [
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
      ],
      { timeout: timeoutFor(30_000) },
    );
  }
  return { key, cert };
}

const children: ChildProcess[] = [];
let simulator: IpadSimulator | undefined;
async function start(name: string, command: string, args: string[], options: SpawnOptions = {}) {
  const timeout = timeoutFor(30_000);
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  const file = `${out}/${name}.log`;
  writeFileSync(file, "");
  const append = (chunk: Buffer) => writeFileSync(file, chunk, { flag: "a" });
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  children.push(child);
  await once(child, "spawn", { signal: AbortSignal.timeout(timeout) });
  return child;
}

const httpsUp = (url: string, ca: Buffer) =>
  new Promise<boolean>((resolve) => {
    const req = request(url, { ca, timeout: timeoutFor(2_000) }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => req.destroy());
    req.end();
  });

/** Boots the iPad in portrait, and starts the API, HTTPS Vite and safaridriver. */
async function bringUp() {
  mkdirSync(out, { recursive: true });
  const ipad = await pickIpad();
  simulator = new IpadSimulator(ipad.udid, ipad.booted, (tool, args) =>
    run("xcrun", [tool, ...args], { maxBuffer: 64 << 20, timeout: timeoutFor(180_000) }),
  );
  log(
    `preparing ${ipad.name} (${ipad.udid}, ${ipad.runtime}); ${ipad.booted ? "already booted" : "booting for this run"}`,
  );
  await simulator.boot();
  await simulator.orient("portrait");
  const tls = await localhostCert();
  await simctl("keychain", ipad.udid, "add-root-cert", tls.cert);

  const [apiPort, appPort, driverPort] = [await freePort(), await freePort(), await freePort()];
  const data = `${out}/db`;
  rmSync(data, { recursive: true, force: true });
  mkdirSync(`${data}/images`, { recursive: true });
  const appOrigin = `https://localhost:${appPort}`;
  // As the end-to-end suite starts them (playwright.config.ts), but the app over HTTPS.
  await start("api", process.execPath, ["--env-file=.env.example", "src/server.ts"], {
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
  const viteConfig = `${out}/vite.config.mts`;
  writeFileSync(
    viteConfig,
    `import { readFileSync } from "node:fs";
import { createIpadSafariServerConfig } from ${JSON.stringify(`${root}apps/frontend/scripts/ipadSessionProbe.ts`)};
const https = { key: readFileSync(${JSON.stringify(tls.key)}), cert: readFileSync(${JSON.stringify(tls.cert)}) };
export default createIpadSafariServerConfig({ https });
`,
  );
  await start("vite", `${root}apps/frontend/node_modules/.bin/vite`, ["--config", viteConfig], {
    cwd: `${root}apps/frontend`,
    env: {
      ...process.env,
      E2E_APP_PORT: String(appPort),
      E2E_API_PORT: String(apiPort),
      VITE_LIFF_MOCK: "on",
    },
  });
  await start("safaridriver", "safaridriver", [
    "-p",
    String(driverPort),
    ...(boundedDiagnostic ? ["--diagnose"] : []),
  ]);
  log("waiting for API, HTTPS Vite, and safaridriver");
  const driver = `http://127.0.0.1:${driverPort}`;
  const api = async () =>
    (
      await fetch(`http://127.0.0.1:${apiPort}/api/me`, {
        signal: AbortSignal.timeout(timeoutFor(5_000)),
      })
    ).status > 0;
  await until("the API", api, 60_000);
  await until("Vite over HTTPS", () => httpsUp(appOrigin, readFileSync(tls.cert)), 60_000);
  await until("safaridriver", async () => {
    const body: unknown = await (
      await fetch(`${driver}/status`, { signal: AbortSignal.timeout(timeoutFor(5_000)) })
    ).json();
    return isRecord(body) && isRecord(body.value) && body.value.ready === true;
  });
  log(`${IPAD}: API :${apiPort}, app ${appOrigin}, safaridriver :${driverPort}`);
  return { ...ipad, simulator, appOrigin, driver };
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

async function test({
  udid,
  booted,
  simulator: device,
  appOrigin,
  driver,
}: Awaited<ReturnType<typeof bringUp>>) {
  let session = "";
  let failures = 0;
  let passes = 0;
  let probeStarted = false;
  const nativeTraceRequested = stickerDragOnly && process.env.IPAD_STICKER_TRACE === "1";
  const safariContentPids = async () => {
    const listed = await run("ps", ["-axo", "pid=,ppid=,args="], { timeout: timeoutFor(5_000) });
    const rows = listed.stdout.split("\n").flatMap((line) => {
      const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
      return match ? [{ pid: Number(match[1]), parent: Number(match[2]), command: match[3] }] : [];
    });
    const owner = rows.find(
      (row) => row.command.startsWith("launchd_sim ") && row.command.includes(udid),
    );
    if (!owner) throw new Error("The selected simulator's process owner could not be identified");
    return rows
      .filter(
        (row) => row.parent === owner.pid && row.command.includes("/WebContentExtension.appex/"),
      )
      .map((row) => row.pid);
  };
  const priorContentPids =
    nativeTraceRequested && booted ? new Set(await safariContentPids()) : new Set<number>();
  const wd = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const res = await fetch(`${driver}/session${session ? `/${session}` : ""}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutFor(180_000)),
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
    await device.orient(direction === "Left" ? "landscapeLeft" : "portrait");
    const landscape = direction === "Left";
    await until(
      landscape ? "a landscape viewport" : "a portrait viewport",
      async () => (await page("return innerWidth > innerHeight")) === landscape,
      15_000,
      300,
    );
  };

  /** Measurements come from the rendered canvas, including every row inside the fixture's cut. */
  const laminateReading = async (selector = "[data-sticker]") => {
    const seen = await page(
      `
      const tiles = [...document.querySelectorAll(args[0])];
      const fixture = window.laminateFixture;
      if (!fixture) throw new Error("The sticker laminate fixture is absent");
      const surfaces = tiles.map((tile) => {
        const canvases = tile.querySelectorAll("canvas.sticker-material");
        if (canvases.length !== 1) throw new Error("Each sticker must have one laminate canvas");
        const canvas = canvases[0];
        const box = canvas.getBoundingClientRect();
        const visible = box.right > 0 && box.bottom > 0 && box.left < innerWidth && box.top < innerHeight;
        const state = canvas.dataset.state;
        const source = tile.matches("[data-ramp]") ? "ramp"
          : tile.matches("[data-white]") ? "flat-white" : "sticker";
        const result = { source, sticker: tile.dataset.sticker, visible, state,
          cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight,
          width: canvas.width, height: canvas.height };
        if (!visible || state !== "ready") return result;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("The laminate canvas has no 2D context");
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let hash = 2166136261, covered = 0, missingRows = 0, uncoveredRows = 0, minAlpha = 255;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
        for (let i = 3; i < data.length; i += 4) if (data[i] >= 254) covered++;
        const x0 = Math.ceil(canvas.width * .12), x1 = Math.floor(canvas.width * .88);
        const y0 = Math.ceil(canvas.height * .12), y1 = Math.floor(canvas.height * .88);
        for (let y = y0; y < y1; y++) {
          let rowCovered = 0;
          for (let x = x0; x < x1; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            minAlpha = Math.min(minAlpha, alpha);
            if (alpha >= 254) rowCovered++;
          }
          if (rowCovered === 0) missingRows++;
          if (rowCovered < x1 - x0) uncoveredRows++;
        }
        const cornerAlpha = [3, (canvas.width - 1) * 4 + 3,
          ((canvas.height - 1) * canvas.width) * 4 + 3, data.length - 1].map((at) => data[at]);
        return { ...result, hash: (hash >>> 0).toString(16).padStart(8, "0"),
          coveredFraction: covered / (canvas.width * canvas.height), missingRows, uncoveredRows, minAlpha, cornerAlpha };
      });
      const costs = fixture.costs.toSorted((a, b) => a - b);
      return { time: performance.now(), pose: fixture.getPose(), userAgent: navigator.userAgent,
        touchPoints: navigator.maxTouchPoints, dpr: devicePixelRatio,
        viewport: { width: innerWidth, height: innerHeight },
        angle: screen.orientation?.angle ?? window.orientation ?? 0,
        total: tiles.length, surfaces, writes: costs.length,
        rendererCostP95: costs.length ? costs[Math.ceil(costs.length * .95) - 1] : null };
    `,
      selector,
    );
    if (!isRecord(seen) || !Array.isArray(seen.surfaces) || !isPoint(seen.pose)) {
      throw new Error("The laminate fixture returned incomplete measurements");
    }
    return seen;
  };
  const readyLaminate = async (count: number, selector = "[data-sticker]") => {
    await page(
      `await waitFor("visible sticker laminate canvases", () => {
      const tiles = [...document.querySelectorAll(args[1])];
      if (!window.laminateFixture || tiles.length !== args[0]) return false;
      const visible = tiles.flatMap((tile) => [...tile.querySelectorAll("canvas.sticker-material")])
        .filter((canvas) => { const b = canvas.getBoundingClientRect();
          return b.right > 0 && b.bottom > 0 && b.left < innerWidth && b.top < innerHeight; });
      if (visible.some((canvas) => canvas.dataset.state === "failed")) throw new Error("Rendering laminate failed");
      return visible.length > 0 && visible.every((canvas) => canvas.dataset.state === "ready");
    }); await rest(1500);`,
      count,
      selector,
    );
  };
  const assertLaminate = (seen: Record<string, unknown>, count: number) => {
    if (seen.total !== count || !Array.isArray(seen.surfaces)) {
      throw new Error(`Expected ${count} stickers; measured ${JSON.stringify(seen)}`);
    }
    const visible = seen.surfaces.filter(
      (surface: unknown) => isRecord(surface) && surface.visible === true,
    );
    if (visible.length === 0) throw new Error("No sticker laminate canvas is visible");
    for (const surface of visible) {
      if (
        !isRecord(surface) ||
        surface.state !== "ready" ||
        typeof surface.hash !== "string" ||
        surface.missingRows !== 0 ||
        surface.uncoveredRows !== 0 ||
        Number(surface.minAlpha) < 254 ||
        Number(surface.coveredFraction) < 0.85 ||
        !Array.isArray(surface.cornerAlpha) ||
        surface.cornerAlpha.some((alpha: unknown) => alpha !== 0)
      ) {
        throw new Error(`A sticker has incomplete cut coverage: ${JSON.stringify(surface)}`);
      }
    }
    return visible
      .map((surface: unknown) => (isRecord(surface) ? String(surface.hash) : ""))
      .join(",");
  };
  const laminateChecks = async () => {
    const dir = `${out}/laminate`;
    mkdirSync(dir, { recursive: true });
    const evidence = {
      simulator: udid,
      appOrigin,
      input: "Synthetic orientation; Safari simulator rendering, not physical sensor delivery",
      measurements: [] as unknown[],
      screenshots: [] as string[],
      passes: 0,
      failures: 0,
      elapsedMs: 0,
    };
    const save = () => {
      evidence.elapsedMs = Date.now() - diagnosticStarted;
      evidence.passes = passes;
      evidence.failures = failures;
      writeFileSync(`${dir}/results.json`, `${JSON.stringify(evidence, null, 2)}\n`);
    };
    const shot = async (name: string) => {
      const path = `${dir}/${name}`;
      writeFileSync(
        `${path}.page.png`,
        Buffer.from(String(await wd("GET", "/screenshot")), "base64"),
      );
      evidence.screenshots.push(`${path}.page.png`);
      await simctl("io", udid, "screenshot", `${path}.device.png`);
      evidence.screenshots.push(`${path}.device.png`);
      save();
      log(`laminate screenshots ${path}.{page,device}.png`);
    };
    const read = async (name: string, count: number, selector = "[data-sticker]") => {
      const seen = await laminateReading(selector);
      evidence.measurements.push({ name, ...seen });
      save();
      return { seen, hash: assertLaminate(seen, count), pose: JSON.stringify(seen.pose) };
    };
    const open = async (query: string, count: number) => {
      // This run's isolated HTTPS origin owns only diagnostic storage.
      await page('localStorage.removeItem("draw.motion");');
      await wd("POST", "/url", { url: `${appOrigin}/e2e/stickerLaminate.html?${query}` });
      await readyLaminate(count);
    };
    log(
      "checking iPad Safari laminate rendering with synthetic tilt; physical sensors remain unverified",
    );
    await wd("POST", "/url", { url: `${appOrigin}/api/me` });
    const angles: unknown[] = [];
    try {
      for (const orientation of ["portrait", "landscapeLeft", "landscapeRight"] as const) {
        timeoutFor(1);
        await check(
          `laminate ${orientation}: cut coverage and stationary pixels at 0/5/11/22 seconds`,
          async () => {
            if (orientation === "landscapeRight") {
              await run(
                "xcrun",
                [
                  "devicectl",
                  "device",
                  "orientation",
                  "set",
                  "--device",
                  udid,
                  orientation,
                  "--timeout",
                  "30",
                ],
                { timeout: timeoutFor(30_000), maxBuffer: 64 << 20 },
              );
            } else {
              await device.orient(orientation);
            }
            await until(
              `${orientation} viewport`,
              async () =>
                (await page("return innerWidth > innerHeight")) === (orientation !== "portrait"),
              15_000,
            );
            await open("side=480&turn=-27&height=320", 1);
            const start = Date.now();
            const baseline = await read(`${orientation}-still-0`, 1);
            angles.push(baseline.seen.angle);
            await shot(`${orientation}-still-0`);
            for (const seconds of [5, 11, 22]) {
              await sleep(Math.max(0, start + seconds * 1000 - Date.now()));
              const held = await read(`${orientation}-still-${seconds}`, 1);
              if (held.hash !== baseline.hash || held.pose !== baseline.pose) {
                throw new Error(
                  `Stationary laminate changed after ${seconds} seconds: ${baseline.hash} -> ${held.hash}`,
                );
              }
            }
            await shot(`${orientation}-still-22`);
            return `angle ${String(baseline.seen.angle)}; stable hash ${baseline.hash}; all cut rows covered`;
          },
        );
        timeoutFor(1);
        await check(
          `laminate ${orientation}: finite tilt moves the light, then holds`,
          async () => {
            const before = await read(`${orientation}-before-tilt`, 1);
            const poses: string[] = [];
            for (const gamma of [-28, 28]) {
              await page("window.laminateFixture.tilt(40, args[0]); await rest(1500);", gamma);
              const tilted = await read(`${orientation}-tilt-${gamma}`, 1);
              if (tilted.hash === before.hash)
                throw new Error(`Tilt ${gamma} did not change laminate pixels`);
              await page("await rest(1500);");
              const held = await read(`${orientation}-held-${gamma}`, 1);
              if (held.hash !== tilted.hash || held.pose !== tilted.pose) {
                throw new Error(`Tilt ${gamma} continued moving after it settled`);
              }
              poses.push(tilted.pose);
            }
            if (poses[0] === poses[1])
              throw new Error("Opposite tilts produced the same light pose");
            await shot(`${orientation}-held-tilt`);
            return `opposite tilts ${poses.join(" -> ")}; each held after 1.5 seconds`;
          },
        );
      }
      await check("laminate both landscape orientations are distinct", async () => {
        if (angles.length !== 3 || angles[1] === angles[2]) {
          throw new Error(
            `Safari did not report distinct landscape angles: ${JSON.stringify(angles)}`,
          );
        }
        return `Safari screen angles ${JSON.stringify(angles)}`;
      });
      await check("laminate denied motion keeps the last published light", async () => {
        const before = await read("before-denial", 1);
        await page(`const { declineMotion } = await import("/src/ui/motionPermission.ts");
          declineMotion(); window.laminateFixture.tilt(60, -28); await rest(1500);`);
        const held = await read("after-denial-and-tilt", 1);
        if (held.hash !== before.hash || held.pose !== before.pose)
          throw new Error("Denied motion moved laminate light");
        await shot("denied-held");
        return `held hash ${held.hash}`;
      });
      for (const count of [12, 48]) {
        timeoutFor(1);
        await check(
          `${count} sticker laminates: visible cut coverage and unknown input stays static`,
          async () => {
            await open(`count=${count}&side=120`, count);
            const before = await read(`count-${count}-unknown`, count);
            await page(`window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: null, gamma: null }));
            window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: NaN, gamma: Infinity }));
            await rest(1500);`);
            const held = await read(`count-${count}-unknown-held`, count);
            if (held.hash !== before.hash || held.pose !== before.pose)
              throw new Error("Unknown orientation moved laminate light");
            await page("window.laminateFixture.tilt(40, 28); await rest(1500);");
            const tilted = await read(`count-${count}-tilted`, count);
            await shot(`count-${count}`);
            const surfaces = Array.isArray(tilted.seen.surfaces) ? tilted.seen.surfaces : [];
            const visible = surfaces.filter(
              (surface: unknown) => isRecord(surface) && surface.visible === true,
            ).length;
            return `${count} stickers mounted, ${visible} visible; covered rows; renderer p95 ${String(tilted.seen.rendererCostP95)} ms`;
          },
        );
      }
      await check(
        "laminate raw-drape ramp: same-size flat comparison changes reflection",
        async () => {
          await open("side=240&turn=0&ramp=1", 1);
          const show = async (selector: string) => {
            await page(
              `const tile = document.querySelector(args[0]);
            if (!tile) throw new Error("The flat/ramp comparison is absent");
            tile.scrollIntoView({ block: "center" });`,
              selector,
            );
            await readyLaminate(1, selector);
          };
          await show("[data-white]");
          const flat = await read("ramp-flat-comparison", 1, "[data-white]");
          await shot("ramp-flat-comparison");
          await show("[data-ramp]");
          const ramp = await read("ramp-before-tilt", 1, "[data-ramp]");
          const flatSurface: unknown = Array.isArray(flat.seen.surfaces)
            ? flat.seen.surfaces[0]
            : undefined;
          const rampSurface: unknown = Array.isArray(ramp.seen.surfaces)
            ? ramp.seen.surfaces[0]
            : undefined;
          if (
            !isRecord(flatSurface) ||
            !isRecord(rampSurface) ||
            flatSurface.source !== "flat-white" ||
            rampSurface.source !== "ramp" ||
            flatSurface.cssWidth !== rampSurface.cssWidth ||
            flatSurface.cssHeight !== rampSurface.cssHeight ||
            flatSurface.width !== rampSurface.width ||
            flatSurface.height !== rampSurface.height ||
            flat.pose !== ramp.pose
          ) {
            throw new Error("The flat/ramp comparison differs in source, size, or held pose");
          }
          const heightRange = await page(`const height = window.laminateFixture.rampHeight;
          if (!Array.isArray(height) || height.length !== 240 * 240)
            throw new Error("The raw-drape ramp height is absent");
          return { samples: height.length, min: Math.min(...height), max: Math.max(...height) };`);
          evidence.measurements.push({
            name: "ramp-height-range",
            ...(isRecord(heightRange) ? heightRange : {}),
          });
          save();
          if (
            !isRecord(heightRange) ||
            !(Number(heightRange.max) > Number(heightRange.min)) ||
            flat.hash === ramp.hash
          ) {
            throw new Error("The raw-drape ramp did not change the flat reflection");
          }
          await shot("ramp-before-tilt");
          return `source ramp; ${String(rampSurface.cssWidth)}×${String(rampSurface.cssHeight)} CSS px, turn 0°; flat ${flat.hash} -> ramp ${ramp.hash}; height ${JSON.stringify(heightRange)}`;
        },
      );
      await check(
        "laminate raw-drape ramp: finite tilt holds with complete cut coverage",
        async () => {
          const before = await read("ramp-tilt-baseline", 1, "[data-ramp]");
          await page("window.laminateFixture.tilt(40, 28); await rest(1500);");
          const tilted = await read("ramp-tilted", 1, "[data-ramp]");
          if (tilted.hash === before.hash || tilted.pose === before.pose)
            throw new Error("Finite tilt did not change the ramp reflection");
          await page("await rest(1500);");
          const held = await read("ramp-held", 1, "[data-ramp]");
          if (held.hash !== tilted.hash || held.pose !== tilted.pose)
            throw new Error("The ramp reflection continued moving after finite tilt settled");
          await shot("ramp-held");
          return `source ramp; finite tilt ${tilted.hash}; held after 1.5 seconds; all cut rows covered`;
        },
      );
    } finally {
      save();
      log(`laminate measurements ${dir}/results.json`);
    }
  };

  /** Native touch and the app's recorder share the fixture's measured input phases. */
  const stickerDragChecks = async () => {
    const dir = `${out}/sticker-drag`;
    mkdirSync(dir, { recursive: true });
    const evidence: Record<string, unknown> = {
      simulator: udid,
      startedAt: new Date().toISOString(),
      input: "native Safari WebDriver touch",
      limitation: "Simulator timing does not qualify physical sensor delivery or ProMotion",
    };
    const save = () => writeFileSync(`${dir}/results.json`, JSON.stringify(evidence, null, 2));
    let traceDone: Promise<unknown> | undefined;
    const nativeTraceErrors: string[] = [];
    const failNativeTrace = (error: unknown) => {
      const message = messageOf(error);
      nativeTraceErrors.push(message);
      evidence.nativeTraceErrors = nativeTraceErrors;
      if (nativeTraceErrors.length === 1) failures++;
      log(`FAIL focused native Time Profiler: ${message}`);
    };
    const pointer = async (actions: Record<string, unknown>[]) => {
      await wd("POST", "/actions", {
        actions: [
          {
            type: "pointer",
            id: "sticker-drag-touch",
            parameters: { pointerType: "touch" },
            actions,
          },
        ],
      });
    };
    try {
      await check(
        "large sticker board: settled cuts, creases, and performance recorder",
        async () => {
          await wd("POST", "/url", { url: `${appOrigin}/e2e/stickerBoardDrag.html?recorder=on` });
          evidence.setup = await page(`
          await waitFor("large sticker board fixture", () => {
            const error = document.querySelector("[data-asset-error]")?.dataset.assetError;
            if (error) throw new Error(error);
            return document.querySelectorAll(".placed-sticker").length === 15
              && window.stickerBoardDragFixture;
          }, 25000);
          const fixture = window.stickerBoardDragFixture;
          await fixture.whenMaterialsSettled();
          if (!fixture.recorderOn()) throw new Error("The existing performance recorder is not running");
          const ready = document.querySelectorAll(".placed-sticker canvas[data-state=ready]").length;
          const creases = document.querySelectorAll(".sticker-crease").length;
          if (ready !== 15 || !creases) throw new Error("The board did not settle all 15 laminates and overlap creases");
          window.__ipadDragErrors = [];
          window.addEventListener("error", (event) => window.__ipadDragErrors.push(event.message));
          window.addEventListener("unhandledrejection", (event) =>
            window.__ipadDragErrors.push(String(event.reason)));
          const originalError = console.error;
          console.error = (...values) => {
            window.__ipadDragErrors.push(values.map(String).join(" "));
            originalError.apply(console, values);
          };
          fixture.setPhase("idle");
          return { ready, creases, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
            userAgent: navigator.userAgent, supportedPerformanceEntries: PerformanceObserver.supportedEntryTypes,
            surfaces: [...document.querySelectorAll(".placed-sticker canvas.sticker-material")]
              .map((canvas) => ({ width: canvas.width, height: canvas.height, state: canvas.dataset.state })) };
        `);
          save();
          return JSON.stringify(evidence.setup);
        },
      );
      if (!isRecord(evidence.setup)) return;
      await check(
        "large sticker board: native first movement, sustained drag, and release",
        async () => {
          const target = await page(`
          for (let index = 0; index < 5; index++) {
            const id = "large-drag-" + index;
            const sticker = document.querySelector('[data-sticker-id="' + id + '"]');
            const box = sticker?.getBoundingClientRect();
            if (!box) continue;
            for (let y = Math.max(15, box.top + 15); y < Math.min(innerHeight - 15, box.bottom - 15); y += 15)
              for (let x = Math.max(15, box.left + 15); x < Math.min(innerWidth - 100, box.right - 15); x += 15)
                if (document.elementFromPoint(x, y)?.closest(".placed-sticker") === sticker)
                  return { id, x: Math.round(x), y: Math.round(y) };
          }
          throw new Error("No large central sticker has an exposed native touch target");
        `);
          if (
            !isRecord(target) ||
            !isPoint(target) ||
            !("id" in target) ||
            typeof target.id !== "string"
          )
            throw new Error("The native drag target is incomplete");
          const id = target.id;
          evidence.target = target;
          if (nativeTraceRequested) {
            try {
              // Only a device this run booted may include all of its cooperating render processes.
              // A shared simulator retains the narrow Safari content process requirement.
              let pid: number | undefined;
              if (booted) {
                const candidates = (await safariContentPids()).filter(
                  (candidate) => !priorContentPids.has(candidate),
                );
                if (candidates.length !== 1)
                  throw new Error(
                    `A focused native trace on a shared simulator requires one new Safari content process; found ${JSON.stringify(candidates)}`,
                  );
                pid = candidates[0];
              }
              const path = `${dir}/first-drag-${Date.now()}.trace`;
              const notification = `dev.croquis.sticker-drag.trace.${process.pid}.${Date.now()}`;
              const subscriber = await start("sticker-drag-trace-start", "/usr/bin/notifyutil", [
                "-1",
                notification,
              ]);
              const ready = once(subscriber, "close", {
                signal: AbortSignal.timeout(timeoutFor(15_000)),
              })
                .then(([code]: unknown[]) => ({ code }))
                .catch((error: unknown) => ({ error: messageOf(error) }));
              evidence.nativeTrace = {
                path,
                simulator: udid,
                pid: pid ?? null,
                scope: booted
                  ? "one Safari content process"
                  : "all processes on the simulator booted by this run",
                durationSeconds: 8,
                template: "Time Profiler",
                startNotification: notification,
              };
              const child = await start("sticker-drag-time-profiler", "xcrun", [
                "xctrace",
                "record",
                "--template",
                "Time Profiler",
                "--device",
                udid,
                ...(booted ? ["--attach", String(pid)] : ["--all-processes"]),
                "--notify-tracing-started",
                notification,
                "--time-limit",
                "8s",
                "--output",
                path,
              ]);
              // The deadline covers up to 15 seconds to start, 8 to record, and 60 to finalize;
              // timeoutFor still reserves cleanup under the overall 180-second diagnostic limit.
              traceDone = once(child, "close", { signal: AbortSignal.timeout(timeoutFor(83_000)) })
                .then(async ([code]) => {
                  if (code !== 0) throw new Error(`Native Time Profiler exited ${String(code)}`);
                  const tableOfContents = `${path}.toc.xml`;
                  await run(
                    "xcrun",
                    ["xctrace", "export", "--input", path, "--toc", "--output", tableOfContents],
                    {
                      timeout: timeoutFor(15_000),
                      maxBuffer: 64 << 20,
                    },
                  );
                  evidence.nativeTraceTableOfContents = tableOfContents;
                })
                .catch(failNativeTrace);
              const notificationResult = await ready;
              if ("error" in notificationResult)
                throw new Error(
                  `The native trace start notification failed: ${notificationResult.error}`,
                );
              if (notificationResult.code !== 0)
                throw new Error(
                  `The native trace notification subscriber exited ${String(notificationResult.code)}: ${readFileSync(`${out}/sticker-drag-trace-start.log`, "utf8")}`,
                );
              if (child.exitCode !== null)
                throw new Error(
                  `Time Profiler ended before the gesture: ${readFileSync(`${out}/sticker-drag-time-profiler.log`, "utf8")}`,
                );
            } catch (error) {
              failNativeTrace(error);
            }
          }
          await page(`
            const fixture = window.stickerBoardDragFixture;
            let pressed = false, firstMoveAt = null;
            document.addEventListener("pointerdown", (event) => {
              if (event.pointerType !== "touch") return;
              pressed = true; firstMoveAt = null; fixture.setPhase("pointerdown");
            }, true);
            document.addEventListener("pointermove", (event) => {
              if (!pressed || event.pointerType !== "touch") return;
              firstMoveAt ??= performance.now();
              fixture.setPhase(performance.now() - firstMoveAt > 200 ? "drag" : "first-move");
              queueMicrotask(() => {
                const held = document.querySelector(".board-stage")?.dataset.held;
                if (held) window.__ipadHeldSticker = held;
              });
            }, true);
            document.addEventListener("pointerup", (event) => {
              if (event.pointerType !== "touch") return;
              pressed = false; fixture.setPhase("release");
            }, true);
            document.addEventListener("pointercancel", (event) => {
              if (event.pointerType === "touch") window.__ipadDragErrors.push("The native touch was canceled");
            }, true);
          `);
          // Safari ends a contact between separate action requests. One finite touch batch keeps
          // the finger down, with measured holds around the initial contact and slop crossing.
          await pointer([
            { type: "pointerMove", duration: 0, origin: "viewport", x: target.x, y: target.y },
            { type: "pointerDown", button: 0 },
            { type: "pause", duration: 200 },
            {
              type: "pointerMove",
              duration: 16,
              origin: "viewport",
              x: target.x + 18,
              y: target.y,
            },
            { type: "pause", duration: 250 },
            ...Array.from({ length: 20 }, (_, index) => ({
              type: "pointerMove",
              duration: 16,
              origin: "viewport",
              x: target.x + 18 + (index + 1) * 3,
              y: target.y,
            })),
            { type: "pointerUp", button: 0 },
          ]);
          await wd("DELETE", "/actions");
          await page(
            `await waitFor("the selected sticker's toolbar after release", () =>
          document.querySelector(".board-stage")?.dataset.held === ""
            && document.querySelector(".sticker-toolbar"));
            if (window.__ipadHeldSticker !== args[0]) throw new Error("The native movement did not hold the target sticker");
            await waitFor("release observation frames", () =>
              window.stickerBoardDragFixture.frames.filter((frame) => frame.phase === "release").length >= 60, 10000);`,
            id,
          );
          evidence.phases = await page(`
          const fixture = window.stickerBoardDragFixture;
          fixture.setPhase("idle");
          const percentile = (values) => values.length
            ? values.toSorted((a, b) => a - b)[Math.floor(values.length * .95)] : null;
          return { frames: fixture.frames, events: fixture.events, mutations: fixture.mutations,
            missingSnapshots: fixture.missingSnapshots, errors: window.__ipadDragErrors,
            summary: ["asset-preparation", "startup", "pointerdown", "first-move", "drag", "release"].map((phase) => {
              const frames = fixture.frames.filter((frame) => frame.phase === phase).map((frame) => frame.interval);
              const inputs = fixture.events.filter((event) => event.phase === phase).map((event) => event.duration);
              return { phase, frameCount: frames.length, p95FrameMs: percentile(frames),
                maximumFrameMs: frames.length ? Math.max(...frames) : null, inputCount: inputs.length,
                p95InputMs: percentile(inputs), maximumInputMs: inputs.length ? Math.max(...inputs) : null };
            }) };
        `);
          evidence.recording = await page(
            "return window.stickerBoardDragFixture.finishRecorder();",
          );
          writeFileSync(
            `${dir}/selected-after-drag.page.png`,
            Buffer.from(String(await wd("GET", "/screenshot")), "base64"),
          );
          await simctl("io", udid, "screenshot", `${dir}/selected-after-drag.device.png`);
          save();
          const measured = evidence.phases;
          if (
            !isRecord(measured) ||
            !Array.isArray(measured.missingSnapshots) ||
            !Array.isArray(measured.errors)
          )
            throw new Error("The native drag phase recording is incomplete");
          if (measured.missingSnapshots.length || measured.errors.length)
            throw new Error(
              `The native drag lost laminate snapshots or reported errors: ${JSON.stringify(measured)}`,
            );
          return JSON.stringify(measured.summary);
        },
      );
    } finally {
      await wd("DELETE", "/actions").catch((error: unknown) => {
        failures++;
        log(`releasing native sticker drag touch failed: ${messageOf(error)}`);
      });
      try {
        const exported = await page(
          `const fixture = window.stickerBoardDragFixture;
          if (!fixture) return { unavailable: "The large sticker board fixture is absent", url: location.href,
            assetError: document.querySelector("[data-asset-error]")?.dataset.assetError ?? null };
          const finalState = { frames: fixture.frames, events: fixture.events, mutations: fixture.mutations,
            missingSnapshots: fixture.missingSnapshots, errors: window.__ipadDragErrors ?? [],
            assetError: document.querySelector("[data-asset-error]")?.dataset.assetError ?? null,
            held: document.querySelector(".board-stage")?.dataset.held ?? null,
            selected: document.querySelector(".board-stage")?.dataset.selected ?? null };
          let recording = null, recordingError = null;
          if (args[0]) {
            try { recording = fixture.finishRecorder(); }
            catch (error) { recordingError = String(error?.stack ?? error); }
          }
          return { finalState, recording, recordingError };
        `,
          !evidence.recording,
        );
        if (!isRecord(exported)) {
          evidence.exportUnavailable = { error: "The native diagnostic export returned no result" };
          failures++;
          log("FAIL native sticker drag export: The native diagnostic export returned no result");
        } else if (typeof exported.unavailable === "string") {
          evidence.exportUnavailable = exported;
          failures++;
          log(`FAIL native sticker drag export: ${JSON.stringify(exported)}`);
        } else {
          evidence.finalState = exported.finalState;
          if (!evidence.recording && exported.recording) evidence.recording = exported.recording;
          if (typeof exported.recordingError === "string") {
            evidence.recordingError = exported.recordingError;
            failures++;
            log(`FAIL native sticker drag recorder export: ${exported.recordingError}`);
          }
        }
      } catch (error) {
        evidence.exportUnavailable = { error: messageOf(error) };
        failures++;
        log(`FAIL native sticker drag export: ${messageOf(error)}`);
      }
      if (traceDone) await traceDone;
      save();
      log(`native sticker drag measurements and recorder ${dir}/results.json`);
    }
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
    await until(
      "the initial portrait viewport",
      async () => (await page("return innerWidth < innerHeight")) === true,
    );
    return "started in portrait";
  });
  if (!session) return failures;
  const sessionCookie = async () => {
    const observed = await page(`const response = await fetch("/api/__e2e/ipad-session");
      if (!response.ok) throw new Error("The session cookie probe could not be read");
      return response.json();`);
    if (!isRecord(observed) || typeof observed.cookie !== "string" || !observed.cookie)
      throw new Error("The browser sent no session cookie to the API path");
    if (observed.httpOnly !== true || observed.secure !== true)
      throw new Error("The session cookie was not issued with HttpOnly and Secure");
    return observed.cookie;
  };
  const sessionRequests = async () => {
    const count = await page(`const response = await fetch("/__e2e/session-requests");
      if (!response.ok) throw new Error("The session probe could not be read");
      return (await response.json()).created;`);
    if (typeof count !== "number") throw new Error("The session probe returned no count");
    return count;
  };
  try {
    if (stickerDragOnly) {
      await stickerDragChecks();
      log(
        `${passes} passed, ${failures} failed; iPad simulator Safari, native touch and app performance recorder`,
      );
      return failures;
    }
    if (laminateOnly) {
      await laminateChecks();
      log(`${passes} passed, ${failures} failed; iPad simulator Safari, synthetic input`);
      return failures;
    }
    // A first visit, whatever an earlier run left in this Safari, such as the motion card declined.
    await wd("POST", "/url", { url: `${appOrigin}/api/me` });
    await page("localStorage.clear(); sessionStorage.clear();");
    await page(`const response = await fetch("/__e2e/session-probe", { method: "POST" });
      if (!response.ok) throw new Error("The session probe could not start");`);
    probeStarted = true;
    const who = `sim-ipad-${Math.random().toString(36).slice(2, 8)}`;
    await check("signing in shows the board", async () => {
      await wd("POST", "/url", { url: `${appOrigin}/?as=${who}` });
      await page(`await waitFor("the board", () => named("named", args[0]), 30000);`, board);
      return who;
    });
    await check("Croquis's motion-permission card appears, and Don't allow closes it", async () => {
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
      const before = { cookie: await sessionCookie(), created: await sessionRequests() };
      await wd("POST", "/refresh", {});
      const meStatus = await page(
        `await waitFor("the board", () => named("named", args[0]), 30000);
         return (await fetch("/api/me")).status;`,
        board,
      );
      if (typeof meStatus !== "number") throw new Error("GET /api/me returned no status");
      const after = { cookie: await sessionCookie(), created: await sessionRequests(), meStatus };
      assertSessionPersisted(before, after);
      return "same HttpOnly cookie, no new session, GET /api/me 200";
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
        await check("Language and Drawing hand use segmented radio groups", async () => {
          const rows = await page(
            `return args[0].map(([label, selector]) => {
              const row = document.querySelector(selector);
              const group = row?.querySelector("[role=radiogroup]");
              return { label, present: !!row, selects: row?.querySelectorAll("select").length ?? 0,
                groups: row?.querySelectorAll("[role=radiogroup]").length ?? 0,
                role: group?.getAttribute("role"), name: group ? nameOf(group) : null,
                radios: group?.querySelectorAll("[role=radio]").length ?? 0,
                checked: group?.querySelectorAll('[role=radio][aria-checked="true"]').length ?? 0 };
            });`,
            [
              [
                stickerBoard.settings.language.title.en,
                '.settings-note [data-setting="language"] .settings-choice',
              ],
              [
                stickerBoard.settings.drawing.hand.label.en,
                '.settings-note [data-setting="drawing"] > .settings-choice',
              ],
            ],
          );
          // Other mounted screens may intentionally have selects; only these two rows promise radios.
          if (
            !Array.isArray(rows) ||
            rows.length !== 2 ||
            rows.some(
              (row) =>
                !isRecord(row) ||
                row.present !== true ||
                row.selects !== 0 ||
                row.groups !== 1 ||
                row.role !== "radiogroup" ||
                row.name !== row.label ||
                row.radios !== 2 ||
                row.checked !== 1,
            )
          ) {
            throw new Error(
              `Language or Drawing hand is not a segmented radio group: ${JSON.stringify(rows)}`,
            );
          }
          const { hand } = stickerBoard.settings.drawing;
          const left = await touchRadio(hand.label.en, hand.left.en);
          const right = await touchRadio(hand.label.en, hand.right.en);
          if (left !== hand.left.en || right !== hand.right.en) {
            throw new Error(
              `touching ${hand.label.en}'s choices checked ${String(left)}, then ${String(right)}`,
            );
          }
          return `${JSON.stringify(rows)}; a touch checks Left, then Right`;
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
    if (boundedDiagnostic) {
      cleaningUp = true;
      await device.orient("portrait").catch((error: unknown) => {
        failures++;
        process.exitCode = 1;
        log(`restoring the diagnostic's portrait orientation failed: ${messageOf(error)}`);
      });
    }
    if (probeStarted) {
      await page(`const response = await fetch("/__e2e/session-probe", { method: "DELETE" });
        if (!response.ok) throw new Error("The session probe could not be released");`).catch(
        (error: unknown) => log(`releasing the session probe failed: ${messageOf(error)}`),
      );
    }
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
  const failures = await test(up);
  process.exitCode = failures > 0 || process.exitCode === 1 ? 1 : 0;
} catch (error) {
  log(
    `FAIL ${boundedDiagnostic ? `iPad Safari ${diagnosticName} diagnostic` : "bringing up the iPad and servers"}: ${messageOf(error)}`,
  );
  process.exitCode = 1;
} finally {
  cleaningUp = true;
  await stopIpadServers(children).catch((error: unknown) => {
    log(`server cleanup failed: ${describeIpadServerCleanupFailure(error)}`);
    process.exitCode = 1;
  });
  if (simulator) {
    log(`releasing ${IPAD}; only a device booted by this run is shut down`);
    await simulator.shutdown().catch((error: unknown) => {
      log(`shutdown failed: ${messageOf(error)}`);
      process.exitCode = 1;
    });
  }
  if (boundedDiagnostic)
    log(
      `${diagnosticName} diagnostic and cleanup took ${Date.now() - diagnosticStarted} ms (180-second limit)`,
    );
}
