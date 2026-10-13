#!/usr/bin/env node
/** Anonymous deployment verification. Default mode performs local checks only. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const here = resolve(dirname(scriptPath), "..");
const options = {
  mode: "check-local",
  source: "/Users/adoll/.codex/worktrees/csp-stabilization-release/drawing-app",
  browsers: ["chromium", "webkit"],
  expectedCommit: null,
};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--public") options.mode = "public";
  else if (arg === "--check-local") options.mode = "check-local";
  else if (arg === "--release-root") options.source = process.argv[++i];
  else if (arg === "--expected-commit") options.expectedCommit = process.argv[++i];
  else if (arg === "--browsers") options.browsers = process.argv[++i].split(",");
  else if (arg === "--help") {
    console.log("Usage: node production-smoke.mjs [--check-local | --public --expected-commit FULL_SHA] [--release-root CLEAN_CHECKOUT] [--browsers chromium,webkit]");
    console.log("--public is only for use after deployment is confirmed. It performs anonymous reads and disposable Worker calculations; no sign-in or drawing actions.");
    process.exit(0);
  } else throw new Error(`Unknown argument: ${arg}`);
}
assert.ok(options.source);
assert.ok(options.browsers.length && options.browsers.every((name) => ["chromium", "webkit"].includes(name)));
if (options.mode === "public") assert.match(options.expectedCommit ?? "", /^[a-f0-9]{40}$/);
const origin = "https://stickeroo.art";
const source = resolve(options.source);
const dist = resolve(source, "apps/frontend/dist");
const output = resolve(here, "evidence", `production-smoke-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
await mkdir(output, { recursive: false });
const report = {
  schema: "croquis-production-smoke/v1",
  startedAt: new Date().toISOString(), mode: options.mode, source, origin,
  output, status: "running", assets: [], browsers: [], errors: [],
  scope: "Published asset identity and anonymous synthetic correction-worker execution. No sign-in, ticket use, drawing save, or native tablet/pen-feel claim.",
};
const logLines = [];
const log = (event, data = {}) => {
  const record = { at: new Date().toISOString(), event, ...data };
  logLines.push(record);
  console.log(JSON.stringify(record));
};
const save = async () => {
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(output, "events.jsonl"), logLines.map((line) => JSON.stringify(line)).join("\n") + "\n");
};
const outerDeadline = setTimeout(() => {
  report.status = "failed";
  report.errors.push("Smoke check exceeded its 180-second outer deadline.");
  void save().finally(() => process.exit(1));
}, 180_000);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const bits = (value) => { const b = Buffer.alloc(8); b.writeDoubleBE(value); return b.toString("hex"); };
const git = (...args) => execFileSync("git", args, { cwd: source, encoding: "utf8", timeout: 10_000, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } }).trim();
const bounded = (promise, milliseconds, label) => new Promise((done, fail) => {
  const timer = setTimeout(() => fail(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds);
  promise.then((value) => { clearTimeout(timer); done(value); }, (error) => { clearTimeout(timer); fail(error); });
});
const readAsset = async (asset) => {
  assert.match(asset, /^\/assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/);
  return readFile(resolve(dist, asset.slice(1)));
};
const makeInput = (pressure, settings) => {
  const positions = [[0, 0], [1, 0.3], [2, 1], [3, -0.2], [4, 0], [5, 2]];
  const packets = positions.map(([x, y], index) => ({ x: x * 0.2, y: y * 0.2, pressure, t: 100 + index * 10, phase: index === 0 ? 2 : index === positions.length - 1 ? 3 : 1 }));
  return {
    packets,
    renderedPoints: packets.flatMap((packet, index) => [packet.x, packet.y, index + 1, index * 10]),
    settings: { ...settings, strength: 1 },
    magnificationFraction: 1, brushSize: 29.5, pointerType: "pen", stabilization: 20,
  };
};

try {
  report.scriptSha256 = sha(await readFile(scriptPath));
  const commit = git("rev-parse", "HEAD");
  assert.equal(git("status", "--porcelain", "--untracked-files=all"), "", "Release checkout must be clean.");
  if (options.expectedCommit) assert.equal(commit, options.expectedCommit, "Release commit differs from the explicitly selected commit.");
  report.commit = commit;
  const corePath = "apps/frontend/src/sticker-creation/canvas/post-correction/core.ts";
  const settingsPath = "apps/frontend/src/sticker-creation/canvas/post-correction/settings.ts";
  const { correctPostStroke } = await import(pathToFileURL(resolve(source, corePath)).href);
  const { FIRST_POST_CORRECTION } = await import(pathToFileURL(resolve(source, settingsPath)).href);
  report.sourceHashes = {};
  for (const file of [corePath, settingsPath, "apps/frontend/src/sticker-creation/canvas/post-correction/profile.ts", "apps/frontend/src/sticker-creation/canvas/post-correction/core.test.ts"])
    report.sourceHashes[file] = sha(await readFile(resolve(source, file)));
  const cases = [0.1, 1].map((pressure) => {
    const input = makeInput(pressure, FIRST_POST_CORRECTION);
    const before = structuredClone(input);
    const expected = correctPostStroke(input).points;
    assert.deepEqual(input, before, "Local core changed smoke input.");
    return { name: pressure === 0.1 ? "light" : "firm", input, expected, expectedBits: expected.map(bits) };
  });
  assert.deepEqual(cases[0].expected.slice(0, 4), [0, 0, 1, 0]);
  assert.ok(cases[1].expected[0] > 0, "Firm pressure must exercise endpoint deletion.");
  assert.notDeepEqual(cases[0].expected, cases[1].expected);
  for (const c of cases) assert.deepEqual(c.expected.slice(-4), [1, 0.4, 6, 50]);
  report.cases = cases;

  const index = await readFile(resolve(dist, "index.html"));
  const entries = [...index.toString().matchAll(/<script\b[^>]*\bsrc="([^\"]+)"/g)].map((m) => m[1]);
  assert.equal(entries.length, 1, "Expected one built entry script.");
  const entry = entries[0];
  const entryBytes = await readAsset(entry);
  const drawingNames = [...new Set([...entryBytes.toString().matchAll(/(?:assets\/|\.\/)DrawingScreen-([A-Za-z0-9_-]+)\.js/g)].map((m) => `/assets/DrawingScreen-${m[1]}.js`))];
  assert.equal(drawingNames.length, 1, "Built entry must identify one DrawingScreen chunk.");
  const owners = [];
  for (const name of await readdir(resolve(dist, "assets"))) {
    if (!name.endsWith(".js")) continue;
    const contents = (await readFile(resolve(dist, "assets", name))).toString();
    if (contents.includes("Post correction could not start:")) owners.push({ asset: `/assets/${name}`, contents });
  }
  assert.equal(owners.length, 1, "Expected one built correction service owner.");
  const workerReferences = [...owners[0].contents.matchAll(/new Worker\(new URL\(([`"'])([^`"']+)\1/g)].map((m) => m[2]);
  assert.equal(workerReferences.length, 1, "Correction service chunk must identify exactly one Worker URL.");
  const workerAsset = new URL(workerReferences[0], origin + owners[0].asset).pathname;
  const selected = [...new Set([entry, drawingNames[0], owners[0].asset, workerAsset])];
  const assets = [{ path: "/", bytes: index }, ...await Promise.all(selected.map(async (path) => ({ path, bytes: await readAsset(path) })))];
  report.discovery = { entry, drawingScreen: drawingNames[0], workerOwner: owners[0].asset, workerAsset };
  report.assets = assets.map(({ path, bytes }) => ({ path, localBytes: bytes.length, localSha256: sha(bytes) }));
  log("local-checks-passed", { commit, files: assets.length, cases: cases.length });

  if (options.mode === "public") {
    await Promise.all(assets.map(async ({ path, bytes }, i) => {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(15_000), cache: "no-store", redirect: "error" });
      assert.equal(response.status, 200, `GET ${path}`);
      const publicBytes = Buffer.from(await response.arrayBuffer());
      const result = report.assets[i];
      Object.assign(result, { status: response.status, publicBytes: publicBytes.length, publicSha256: sha(publicBytes), exact: publicBytes.equals(bytes), contentType: response.headers.get("content-type") });
      assert.ok(result.exact, `Published asset differs from local dist: ${path}`);
    }));
    log("public-assets-match", { files: assets.length });
    const playwright = await import(pathToFileURL(resolve(source, "apps/frontend/node_modules/@playwright/test/index.mjs")).href);
    for (const name of options.browsers) {
      const result = { name, status: "running", console: [], pageErrors: [], requestFailures: [], blockedWrites: [], cases: [] };
      report.browsers.push(result);
      let browser;
      let page;
      try {
        browser = await playwright[name].launch({ headless: true, timeout: 15_000 });
        const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, locale: "en-US", serviceWorkers: "block" });
        result.initialCookieCount = (await context.cookies()).length;
        assert.equal(result.initialCookieCount, 0);
        await context.route("**/*", async (route) => {
          const request = route.request();
          if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
            result.blockedWrites.push({ method: request.method(), url: request.url() });
            await route.abort("blockedbyclient");
          } else await route.continue();
        });
        page = await context.newPage();
        page.setDefaultTimeout(15_000);
        page.on("console", (message) => result.console.push({ type: message.type(), text: message.text() }));
        page.on("pageerror", (error) => result.pageErrors.push(String(error)));
        page.on("requestfailed", (request) => result.requestFailures.push({ method: request.method(), url: request.url(), failure: request.failure() }));
        const navigation = await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 20_000 });
        assert.equal(navigation?.status(), 200);
        await page.getByRole("button", { name: /Log in with LINE|LINEでログイン/ }).waitFor({ state: "visible", timeout: 25_000 });
        result.gateText = await page.locator(".line-gate").innerText();
        await page.screenshot({ path: resolve(output, `${name}-anonymous-gate.png`), timeout: 10_000 });
        for (const [index, c] of cases.entries()) {
          const observed = await bounded(page.evaluate(({ workerUrl, input, id }) => new Promise((resolve, reject) => {
            const began = performance.now();
            const worker = new Worker(workerUrl, { type: "module" });
            const progress = [];
            let finished = false;
            const timer = setTimeout(() => finish(new Error("Worker exceeded 5000ms smoke deadline")), 5000);
            const finish = (error, points) => {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              worker.terminate();
              if (error) reject(error);
              else {
                const bits = points.map((number) => {
                  const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, number);
                  return [...new Uint8Array(b.buffer)].map((v) => v.toString(16).padStart(2, "0")).join("");
                });
                resolve({ points, bits, progress, elapsedMs: performance.now() - began });
              }
            };
            worker.onerror = (event) => finish(new Error(event.message));
            worker.onmessageerror = () => finish(new Error("Worker message could not be decoded"));
            worker.onmessage = ({ data }) => {
              if (data?.id !== id) return finish(new Error("Worker response ID mismatch"));
              if (data.type === "progress") progress.push(data.progress);
              else if (data.type === "failure") finish(new Error(data.message));
              else if (data.type === "complete" && Array.isArray(data.points) && data.points.every(Number.isFinite)) finish(null, data.points);
              else finish(new Error("Malformed Worker completion"));
            };
            worker.postMessage({ id, input });
          }), { workerUrl: origin + workerAsset, input: c.input, id: index + 1 }), 10_000, `${name} ${c.name} worker evaluation`);
          result.cases.push({ name: c.name, ...observed, withinAppWorkerDeadline: observed.elapsedMs <= 1000, exact: JSON.stringify(observed.bits) === JSON.stringify(c.expectedBits) });
          assert.deepEqual(observed.bits, c.expectedBits, `${name} ${c.name}: every returned binary64 value must match local core`);
        }
        result.finalCookieCount = (await context.cookies()).length;
        assert.equal(result.pageErrors.length, 0, `${name} raised page errors`);
        result.status = "passed";
        log("browser-smoke-passed", { name, cases: result.cases.length });
      } catch (error) {
        result.status = "failed";
        result.error = String(error?.stack ?? error);
        if (page) {
          try {
            await page.screenshot({ path: resolve(output, `${name}-failure.png`), timeout: 5000 });
          } catch (screenshotError) {
            result.failureScreenshotError = String(screenshotError);
          }
        }
        throw error;
      } finally {
        if (browser) await bounded(browser.close(), 10_000, `${name} browser close`);
      }
    }
  }
  assert.equal(git("rev-parse", "HEAD"), report.commit, "Release commit changed during smoke check.");
  for (const [file, expected] of Object.entries(report.sourceHashes)) assert.equal(sha(await readFile(resolve(source, file))), expected, `Source changed: ${file}`);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.errors.push(String(error?.stack ?? error));
  log("smoke-failed", { message: String(error) });
  process.exitCode = 1;
} finally {
  clearTimeout(outerDeadline);
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(`Report: ${resolve(output, "report.json")}`);
}
