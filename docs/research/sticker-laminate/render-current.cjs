const fs = require("node:fs/promises");
const { createRequire } = require("node:module");
const path = require("node:path");
const root = path.resolve(__dirname, "../../..");
const frontend = createRequire(`${root}/apps/frontend/package.json`);
const api = createRequire(`${root}/apps/api/package.json`);
const { chromium, webkit } = frontend("@playwright/test");
const sharp = api("sharp");
const out = "/private/tmp/croquis-laminate-evidence";
const svgUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const mask = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><rect x="0" y="0" width="260" height="260" rx="20" fill="white"/></svg>',
);
const art = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><rect width="260" height="260" rx="20" fill="white"/><path d="M0 130 H260 V260 H0Z" fill="#888"/><path d="M25 25 L110 55 L40 100 M155 25 L235 55 L170 100" fill="none" stroke="#181824" stroke-width="3"/></svg>',
);
async function pixels(buffer) {
  return sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}
function compare(a, b, region) {
  let changed = 0,
    total = 0,
    max = 0,
    sum = 0;
  for (let y = region.y0; y < region.y1; y++)
    for (let x = region.x0; x < region.x1; x++) {
      const q = (y * a.info.width + x) * a.info.channels;
      let delta = 0;
      for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(a.data[q + c] - b.data[q + c]));
      total++;
      if (delta) changed++;
      max = Math.max(max, delta);
      sum += delta;
    }
  return {
    changed,
    total,
    maxChannelDelta: max,
    meanMaxChannelDelta: Number((sum / total).toFixed(4)),
  };
}
async function run(name, browserType, css) {
  const browser = await browserType.launch({ timeout: 20000 });
  try {
    const page = await browser.newPage({
      viewport: { width: 820, height: 320 },
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(10000);
    const figure = (id, resin) =>
      `<span id="${id}" class="sticker-figure"><img class="sticker-figure__img" src="${art}">${resin ? '<span class="live-resin"><i class="live-resin__plane"><b></b></i><i class="live-resin__spec"><b></b></i><i class="live-resin__sheen"><b></b></i></span>' : ""}</span>`;
    await page.setContent(
      `<style>${css}\n:root{--ease-out:cubic-bezier(.2,.6,.2,1);--sticker-cut:none;--sticker-cast:none}body{margin:0;display:flex;gap:10px;padding:10px;background:#d9d4c9}.sticker-figure{flex:none;width:260px;height:260px;--m:url("${mask}")}#plane .live-resin__spec,#plane .live-resin__sheen{display:none}</style>${figure("plain", false)}${figure("plane", true)}${figure("full", true)}`,
    );
    await page.locator("img").evaluateAll(async (imgs) => {
      await Promise.all(imgs.map((img) => img.decode()));
    });
    const plain = await pixels(await page.locator("#plain").screenshot());
    const plane = await pixels(await page.locator("#plane").screenshot());
    const comparison = {
      whiteInterior: compare(plain, plane, { x0: 118, x1: 142, y0: 60, y1: 125 }),
      grayInterior: compare(plain, plane, { x0: 118, x1: 142, y0: 135, y1: 195 }),
    };
    const animations = await page.locator("#full").evaluate((el) =>
      el.getAnimations({ subtree: true }).map((a) => ({
        name: a.animationName,
        iterations:
          a.effect.getTiming().iterations === Infinity
            ? "Infinity"
            : a.effect.getTiming().iterations,
        duration: a.effect.getTiming().duration,
      })),
    );
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = 0;
      }
    });
    const first = await pixels(await page.locator("#full").screenshot({ animations: "allow" }));
    await page.evaluate(() => {
      for (const a of document.getAnimations()) a.currentTime = 11000;
    });
    const later = await pixels(await page.locator("#full").screenshot({ animations: "allow" }));
    comparison.unattendedSpecularChange = compare(first, later, { x0: 0, x1: 260, y0: 0, y1: 260 });
    await page.screenshot({ path: `${out}/${name}-current.png`, animations: "allow" });
    const result = { engine: name, comparison, animations };
    await fs.writeFile(`${out}/${name}.json`, JSON.stringify(result, null, 2) + "\n");
    return result;
  } finally {
    await browser.close();
  }
}
async function main() {
  await fs.mkdir(out, { recursive: true });
  const css = (
    await Promise.all(
      ["sticker-figure.css", "live-resin.css"].map((file) =>
        fs.readFile(`${root}/apps/frontend/src/stickers/${file}`, "utf8"),
      ),
    )
  ).join("\n");
  const results = [];
  for (const [name, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ])
    results.push(await run(name, type, css));
  console.log(JSON.stringify(results, null, 2));
}
const timer = setTimeout(() => {
  console.error("Laminate browser research exceeded 60 seconds");
  process.exit(1);
}, 60000);
main().then(
  () => clearTimeout(timer),
  (error) => {
    clearTimeout(timer);
    console.error(error);
    process.exitCode = 1;
  },
);
