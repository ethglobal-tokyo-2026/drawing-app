import { inflateSync } from "node:zlib";
import { chromium, expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { say, signIn } from "./helpers.ts";
import { phone } from "./phone.ts";
import { E2E_APP_PORT } from "./ports.ts";

const language = "en";

/** How far the board's grain and maker print shade its ground off the Liner, per channel. */
const GROUND_SHADING = 24;

/** One CSS pixel as the browser painted it, after any darkening it does: [red, green, blue]. */
async function paintedAt(page: Page, { x, y }: { x: number; y: number }) {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 }, scale: "css" });
  // IHDR's bit depth and color type: 8-bit RGB or RGBA keeps a pixel's color in its first three bytes.
  if (png[24] !== 8 || (png[25] !== 2 && png[25] !== 6)) {
    throw new Error(`The screenshot is a PNG of color type ${png[25]} at ${png[24]} bits`);
  }
  // After the signature, chunks of length, type, data and CRC. The first pixel has nothing left of it
  // or above it for a row filter to add, so it inflates to its own bytes, after the row's filter byte.
  const pixels: Buffer[] = [];
  for (let at = 8; at < png.length; at += 12 + png.readUInt32BE(at)) {
    if (png.toString("ascii", at + 4, at + 8) === "IDAT") {
      pixels.push(png.subarray(at + 8, at + 8 + png.readUInt32BE(at)));
    }
  }
  const [, red, green, blue] = inflateSync(Buffer.concat(pixels));
  return [red, green, blue];
}

test("the board keeps its Liner ground where the browser forces pages dark", async ({
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Forced darkening is Chromium's");
  // Chromium's own forced darkening, as Chrome's Auto Dark Theme and Android's WebView apply it.
  const browser = await chromium.launch({ args: ["--blink-settings=forceDarkModeEnabled=true"] });
  try {
    const context = await browser.newContext({
      ...phone,
      colorScheme: "dark",
      baseURL: `http://localhost:${E2E_APP_PORT}`,
    });
    const page = await context.newPage();
    await signIn(page, "dark", language);
    const board = page.getByRole("region", {
      name: say(strings.stickerBoard.board.label, language),
    });
    const box = await board.boundingBox();
    if (!box) throw new Error("The board isn't on screen");
    // At its left edge, a third of the way down: clear of the header, Draw and the empty board's spot.
    const ground = { x: box.x + 16, y: box.y + box.height / 3 };
    expect(
      await board.evaluate((stage, { x, y }) => document.elementFromPoint(x, y) === stage, ground),
      "something on the board lies over its ground there",
    ).toBe(true);

    const liner = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("i"));
      probe.style.color = "var(--liner)";
      const rgb = getComputedStyle(probe).color.match(/\d+/g)?.map(Number);
      probe.remove();
      if (!rgb) throw new Error("--liner isn't a color");
      return rgb;
    });
    const painted = await paintedAt(page, ground);
    const off = Math.max(...painted.map((channel, i) => Math.abs(channel - liner[i])));
    expect(
      off,
      `painted rgb(${painted.join(", ")}), the Liner is rgb(${liner.join(", ")})`,
    ).toBeLessThanOrEqual(GROUND_SHADING);
  } finally {
    await browser.close();
  }
});
