const fs = require("node:fs");
const path = require("node:path");
const { tmpdir } = require("node:os");
const { createRequire } = require("node:module");
const repo = path.resolve(__dirname, "../../../../..");
const requireFrontend = createRequire(path.join(repo, "apps/frontend/package.json"));
const requireTsx = createRequire(requireFrontend.resolve("tsx"));
const esbuild = requireTsx("esbuild");
const { chromium } = requireFrontend("@playwright/test");
const output = path.resolve(process.argv[2] ?? path.join(tmpdir(), "csp-croquis-replay-spike"));
fs.mkdirSync(output, { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, "pixels.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: path.join(output, "pixels.bundle.js"),
  define: { "import.meta.env.DEV": "false" },
});
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: 20000 });
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ path: path.join(output, "pixels.bundle.js") });
    const result = await page.evaluate(() => globalThis.runPixels());
    fs.writeFileSync(path.join(output, "pixels.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    for (const check of result.results) {
      if (check.test === "explicit_terminal_replacement_vs_corrected_replay" && !check.equal)
        throw new Error("Snapshot replacement differs from corrected replay: " + check.tool);
      if (check.test === "negative_control_repaint_without_restore" && check.equal)
        throw new Error("Negative control unexpectedly equals corrected replay: " + check.tool);
    }
  } catch (error) {
    const result = { status: "failed", name: error.name, message: error.message };
    fs.writeFileSync(path.join(output, "pixels-failure.json"), JSON.stringify(result, null, 2));
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
})();
