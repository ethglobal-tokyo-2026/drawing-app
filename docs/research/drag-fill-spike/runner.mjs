import { createRequire } from "node:module";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const researchDirectory = dirname(fileURLToPath(import.meta.url));
const worktree = process.env.FILL_SPIKE_ROOT ?? resolve(researchDirectory, "../../..");
const originalProject = dirname(realpathSync(resolve(worktree, "node_modules")));
const output = process.env.FILL_SPIKE_OUTPUT ?? resolve(researchDirectory, "results.json");
const port = Number(process.env.FILL_SPIKE_PORT ?? 5297);
const verifyOnly = process.env.FILL_SPIKE_VERIFY_ONLY === "1";
const cases = ["blank", "grid", "tenLayers", "tenLayersReleasedScratch", "heldLayer", "noOp"];
const warmups = 2;
const measuredRuns = 20;
const callTimeoutMs = 60_000;
const caseTimeoutMs = 120_000;
const requireFrontend = createRequire(resolve(worktree, "apps/frontend/package.json"));

async function importFrontend(name) {
  const loaded = await import(pathToFileURL(requireFrontend.resolve(name)).href);
  return loaded.default ?? loaded;
}

function percentile(sorted, fraction) {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * fraction;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

function numericFields(value, prefix = "", fields = {}) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fields;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "number" && Number.isFinite(child)) fields[path] = child;
    else if (typeof child === "object" && child !== null && !Array.isArray(child))
      numericFields(child, path, fields);
  }
  return fields;
}

function summarize(runs) {
  const values = new Map();
  for (const run of runs) {
    if (run.phase !== "measured" || !run.result) continue;
    for (const [name, value] of Object.entries(numericFields(run.result))) {
      if (!values.has(name)) values.set(name, []);
      values.get(name).push(value);
    }
  }
  return Object.fromEntries(
    [...values.entries()].map(([name, samples]) => {
      samples.sort((a, b) => a - b);
      return [
        name,
        {
          count: samples.length,
          p50: percentile(samples, 0.5),
          p95: percentile(samples, 0.95),
          max: samples.at(-1),
        },
      ];
    }),
  );
}

async function persist(results) {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.writing`;
  await writeFile(temporary, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await rename(temporary, output);
}

async function bounded(work, timeoutMs, label) {
  if (timeoutMs <= 0) throw new Error(`${label} exceeded its deadline`);
  let timer;
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function resultFailures(result) {
  if (!result || typeof result !== "object") return ["Harness returned no result object"];
  if (!("failures" in result)) return [];
  if (!Array.isArray(result.failures)) return ["Harness failures field is not an array"];
  return result.failures.map((failure) => String(failure));
}

const results = {
  startedAt: new Date().toISOString(),
  limitation:
    "Synthetic headless desktop browser measurements; no physical iPhone or Apple Pencil validation.",
  worktree,
  url: `http://127.0.0.1:${port}/docs/research/drag-fill-spike/index.html`,
  settings: { cases, coldRuns: 1, warmups, measuredRuns, callTimeoutMs, caseTimeoutMs, verifyOnly },
  browsers: [],
  failures: [],
};

let server;
let exitCode = 0;
try {
  const [{ createServer }, { chromium, webkit }] = await Promise.all([
    importFrontend("vite"),
    importFrontend("@playwright/test"),
  ]);
  server = await createServer({
    configFile: false,
    root: worktree,
    resolve: {
      alias: {
        "@drawing-app/api/client": resolve(worktree, "apps/api/src/client.ts"),
        "@drawing-app/db/limits": resolve(worktree, "packages/db/src/schema/limits.ts"),
      },
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      fs: { allow: [worktree, originalProject] },
    },
  });
  await server.listen();
  await persist(results);

  for (const [name, browserType] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browserRecord = {
      name,
      version: null,
      platform: null,
      verification: null,
      wetPreviewVerification: null,
      cases: [],
      consoleErrors: [],
      pageErrors: [],
      failures: [],
    };
    results.browsers.push(browserRecord);
    await persist(results);
    let browser;
    let context;
    let page;
    try {
      browser = await browserType.launch({ headless: true, timeout: 30_000 });
      browserRecord.version = browser.version();
      context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") browserRecord.consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => browserRecord.pageErrors.push(String(error)));
      await bounded(
        () => page.goto(results.url, { waitUntil: "load" }),
        callTimeoutMs,
        `${name} page load`,
      );
      browserRecord.platform = await bounded(
        () =>
          page.evaluate(() => ({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory ?? null,
            devicePixelRatio: devicePixelRatio,
            viewport: { width: innerWidth, height: innerHeight },
          })),
        callTimeoutMs,
        `${name} platform read`,
      );
      browserRecord.verification = await bounded(
        () => page.evaluate(() => window.verifyFillSpike()),
        callTimeoutMs,
        `${name} correctness verification`,
      );
      browserRecord.failures.push(...resultFailures(browserRecord.verification));
      browserRecord.wetPreviewVerification = await bounded(
        () => page.evaluate(() => window.verifyWetPreview()),
        callTimeoutMs,
        `${name} wet preview verification`,
      );
      browserRecord.failures.push(...resultFailures(browserRecord.wetPreviewVerification));
      await persist(results);

      if (browserRecord.failures.length === 0 && !verifyOnly) {
        for (const caseName of cases) {
          const caseRecord = { name: caseName, runs: [], summary: {}, failures: [] };
          browserRecord.cases.push(caseRecord);
          const caseDeadline = Date.now() + caseTimeoutMs;
          for (let iteration = 0; iteration < 1 + warmups + measuredRuns; iteration++) {
            const phase = iteration === 0 ? "cold" : iteration <= warmups ? "warmup" : "measured";
            const remaining = caseDeadline - Date.now();
            const timeoutMs = Math.min(callTimeoutMs, remaining);
            const run = { phase, iteration, result: null, error: null };
            caseRecord.runs.push(run);
            try {
              run.result = await bounded(
                () =>
                  page.evaluate(
                    ({ caseName, iteration }) => window.runFillSpike(caseName, iteration),
                    { caseName, iteration },
                  ),
                timeoutMs,
                `${name} ${caseName} ${phase} ${iteration}`,
              );
              caseRecord.failures.push(
                ...resultFailures(run.result).map((failure) => `${phase} ${iteration}: ${failure}`),
              );
            } catch (error) {
              run.error = String(error);
              caseRecord.failures.push(`${phase} ${iteration}: ${run.error}`);
            }
            caseRecord.summary = summarize(caseRecord.runs);
            await persist(results);
            if (caseRecord.failures.length > 0) break;
          }
          browserRecord.failures.push(
            ...caseRecord.failures.map((failure) => `${caseName}: ${failure}`),
          );
          await persist(results);
          if (browserRecord.failures.length > 0) break;
        }
      }
    } catch (error) {
      browserRecord.failures.push(String(error));
    } finally {
      try {
        await context?.close();
      } catch (error) {
        browserRecord.failures.push(`Closing context failed: ${error}`);
      }
      try {
        await browser?.close();
      } catch (error) {
        browserRecord.failures.push(`Closing browser failed: ${error}`);
      }
      await persist(results);
    }
    results.failures.push(...browserRecord.failures.map((failure) => `${name}: ${failure}`));
    if (browserRecord.pageErrors.length > 0)
      results.failures.push(
        ...browserRecord.pageErrors.map((error) => `${name} page error: ${error}`),
      );
    if (browserRecord.consoleErrors.length > 0)
      results.failures.push(
        ...browserRecord.consoleErrors.map((error) => `${name} console error: ${error}`),
      );
    await persist(results);
  }
} catch (error) {
  results.failures.push(String(error));
} finally {
  try {
    await server?.close();
  } catch (error) {
    results.failures.push(`Closing Vite failed: ${error}`);
  }
  results.finishedAt = new Date().toISOString();
  await persist(results);
  if (results.failures.length > 0) exitCode = 1;
}

process.exitCode = exitCode;
console.log(
  JSON.stringify({
    output,
    failures: results.failures.length,
    browsers: results.browsers.map(({ name, version, cases }) => ({
      name,
      version,
      cases: cases.length,
    })),
  }),
);
