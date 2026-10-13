const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const repo = path.resolve(__dirname, "../../../../..");
const requireFrontend = createRequire(path.join(repo, "apps/frontend/package.json"));
const requireTsx = createRequire(requireFrontend.resolve("tsx"));
const esbuild = requireTsx("esbuild");
const { chromium } = requireFrontend("@playwright/test");
const output = path.resolve(
  process.argv[2] ??
    path.join(__dirname, `results-pixels-${new Date().toISOString().replace(/[:.]/g, "-")}`),
);
fs.mkdirSync(output, { recursive: true });
for (const name of [
  "pixels.bundle.js",
  "pixels.json",
  "pixels-failure.json",
  "pixels-provenance.json",
])
  if (fs.existsSync(path.join(output, name)))
    throw new Error(`Refusing to overwrite ${name}; select a fresh output directory`);
esbuild.buildSync({
  entryPoints: [path.join(__dirname, "pixels.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: path.join(output, "pixels.bundle.js"),
  define: { "import.meta.env.DEV": "false", "import.meta.env.MODE": '"production"' },
});
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: 20000 });
    const page = await browser.newPage();
    const scriptErrors = [];
    page.on("pageerror", (error) => scriptErrors.push(error.message));
    page.setDefaultTimeout(20000);
    // Supply a local origin for app language storage without starting a server or fetching a site.
    await page.route("https://croquis-replay.test/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body></body></html>",
      }),
    );
    await page.goto("https://croquis-replay.test/");
    await page.addScriptTag({ path: path.join(output, "pixels.bundle.js") });
    if (scriptErrors.length) throw new Error("Pixel bundle failed: " + scriptErrors.join("; "));
    let evaluationTimer;
    let result;
    try {
      result = await Promise.race([
        page.evaluate(() => globalThis.runPixels()),
        new Promise((_, reject) => {
          evaluationTimer = setTimeout(
            () => reject(new Error("Pixel regression exceeded its 20-second execution limit")),
            20000,
          );
        }),
      ]);
    } finally {
      clearTimeout(evaluationTimer);
    }
    fs.writeFileSync(path.join(output, "pixels.json"), JSON.stringify(result, null, 2), {
      flag: "wx",
    });
    console.log(JSON.stringify(result, null, 2));
    for (const check of result.results) {
      if (check.test === "current_engine_terminal_vs_final_operation_replay" && !check.equal)
        throw new Error("Current committed layer differs from finalized replay: " + check.tool);
      if (check.test === "explicit_terminal_replacement_vs_corrected_replay" && !check.equal)
        throw new Error("Snapshot replacement differs from corrected replay: " + check.tool);
      if (check.test === "negative_control_repaint_without_restore" && check.equal)
        throw new Error("Negative control unexpectedly equals corrected replay: " + check.tool);
    }
    const files = ["pixels.ts", "pixels.cjs"]
      .map((name) => path.join(__dirname, name))
      .concat(
        [
          "apps/frontend/src/sticker-creation/canvas/inkEngine.ts",
          "apps/frontend/src/sticker-creation/canvas/stabilizer.ts",
          "apps/frontend/src/sticker-creation/canvas/brush.ts",
          "apps/frontend/src/sticker-creation/canvas/strokeCurve.ts",
          "apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts",
          "apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts",
          "apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts",
          "apps/frontend/src/sticker-creation/layers/layerInk.ts",
          "apps/frontend/src/sticker-creation/layers/layerHistory.ts",
          "apps/frontend/src/sticker-creation/layers/layerDisplay.ts",
          "apps/frontend/src/sticker-creation/canvas/paintStroke.ts",
        ].map((name) => path.join(repo, name)),
      );
    fs.writeFileSync(
      path.join(output, "pixels-provenance.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          node: process.version,
          files: files.map((file) => ({
            path: path.relative(repo, file),
            sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
          })),
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
  } catch (error) {
    const result = { status: "failed", name: error.name, message: error.message };
    fs.writeFileSync(path.join(output, "pixels-failure.json"), JSON.stringify(result, null, 2), {
      flag: "wx",
    });
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
})();
