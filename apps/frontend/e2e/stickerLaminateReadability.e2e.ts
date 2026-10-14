import { expect, test, type Locator, type Page, type JSHandle } from "@playwright/test";

test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
  reducedMotion: "no-preference",
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", {
        value: 0,
        configurable: true,
      });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    // This fixture exercises delivered sensor readings after access is available.
    if (typeof window.DeviceMotionEvent === "function")
      Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
        value: undefined,
        configurable: true,
      });
  });
});

type PaperSnapshot = JSHandle<Uint8ClampedArray>;
const snapshots = new Set<PaperSnapshot>();
test.afterEach(async () => {
  try {
    await Promise.all([...snapshots].map((snapshot) => snapshot.dispose()));
  } finally {
    snapshots.clear();
  }
});
/** Keep every exact interior byte in the browser; only totals cross the process boundary. */
async function paperPixels(paper: Locator): Promise<PaperSnapshot> {
  const snapshot = await paper.evaluateHandle((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("The paper canvas is missing");
    const context = element.getContext("2d");
    if (!context) throw new Error("The paper snapshot context is unavailable");
    const x = Math.floor(element.width * 0.05),
      y = Math.floor(element.height * 0.05),
      width = Math.floor(element.width * 0.9),
      height = Math.floor(element.height * 0.9);
    if (!width || !height) throw new Error("The paper snapshot has no readable interior");
    return context.getImageData(x, y, width, height).data;
  });
  snapshots.add(snapshot);
  return snapshot;
}

async function readablePaper(snapshot: PaperSnapshot) {
  const { min, max, missingCoverage, tinted, brightFraction } = await snapshot.evaluate(
    async (pixels) => {
      const { paperReadability } = await import("./paperSnapshot.ts");
      return paperReadability(pixels);
    },
  );
  expect(missingCoverage, "Opaque paper must retain complete coverage").toBe(0);
  expect(tinted, "Clear laminate should reflect neutral light on white paper").toBe(0);
  expect(min, "The clear film should preserve near-white paper").toBeGreaterThanOrEqual(238);
  expect(
    max - min,
    "White paper must reveal a distinct reflected source edge",
  ).toBeGreaterThanOrEqual(12);
  expect(
    brightFraction,
    "The source should occupy a localized part of the cut",
  ).toBeGreaterThanOrEqual(0.1);
  expect(
    brightFraction,
    "The source must leave a visible surrounding paper region",
  ).toBeLessThanOrEqual(0.45);
  return { min, max, span: max - min, brightFraction };
}

/** A sharp gloss boundary must remain visible without relying on the artwork beneath it. */
async function glossEdge(paper: Locator) {
  return paper.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("The paper canvas is missing");
    const context = element.getContext("2d");
    if (!context) throw new Error("The paper snapshot context is unavailable");
    const left = Math.floor(element.width * 0.05),
      top = Math.floor(element.height * 0.05),
      width = Math.floor(element.width * 0.9),
      height = Math.floor(element.height * 0.9);
    const pixels = context.getImageData(left, top, width, height).data;
    let best: number[] = [],
      span = -1;
    for (let y = 0; y < height; y++) {
      const row = Array.from({ length: width }, (_, x) => pixels[(y * width + x) * 4]);
      const difference = Math.max(...row) - Math.min(...row);
      if (difference > span) {
        best = row;
        span = difference;
      }
    }
    if (span <= 0) throw new Error("The gloss source has no measurable edge");
    const min = Math.min(...best),
      max = Math.max(...best),
      peak = best.indexOf(max);
    const rising = best.slice(0, peak + 1);
    const start = rising.findIndex((value) => value >= min + span * 0.1);
    const end = rising.findIndex((value) => value >= min + span * 0.9);
    if (start < 0 || end < start) throw new Error("The gloss source edge cannot be read");
    return (end - start) / Math.min(element.width, element.height);
  });
}

async function paperChange(before: PaperSnapshot, after: PaperSnapshot) {
  const result = await before.evaluate(async (before, after) => {
    const { paperDifference } = await import("./paperSnapshot.ts");
    return {
      beforeLength: before.length,
      afterLength: after.length,
      ...paperDifference(before, after),
    };
  }, after);
  expect(result.afterLength).toBe(result.beforeLength);
  return result;
}

async function unchangedPaper(before: PaperSnapshot, after: PaperSnapshot, message: string) {
  const { changedPixels, maxChannelDifference } = await paperChange(before, after);
  expect({ changedPixels, maxChannelDifference }, message).toEqual({
    changedPixels: 0,
    maxChannelDifference: 0,
  });
}

async function settledPaper(page: Page, paper: Locator) {
  await page.waitForTimeout(1000);
  const pixels = await paperPixels(paper);
  await page.waitForTimeout(100);
  const second = await paperPixels(paper);
  try {
    await unchangedPaper(pixels, second, "A held sensor pose must retain its settled reflection");
  } finally {
    await second.dispose();
    snapshots.delete(second);
  }
  return pixels;
}

async function inkContrast(paper: Locator, print: Locator) {
  const read = async (canvas: Locator) =>
    canvas.evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The laminate canvas is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The laminate snapshot context is unavailable");
      // The fixture has a solid black patch at x35–80, y190–210 in its 240px print.
      const x = Math.floor((element.width * 58) / 240),
        y = Math.floor((element.height * 200) / 240);
      return [...context.getImageData(x - 2, y - 2, 5, 5).data];
    });
  const [white, black] = await Promise.all([read(paper), read(print)]);
  const linear = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (pixels: number[]) => {
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i + 3]).toBe(255);
      sum +=
        0.2126 * linear(pixels[i]) +
        0.7152 * linear(pixels[i + 1]) +
        0.0722 * linear(pixels[i + 2]);
    }
    return sum / (pixels.length / 4);
  };
  return (luminance(white) + 0.05) / (luminance(black) + 0.05);
}

test("the first iPad sensor reading retains the already visible neutral laminate", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html");
  const paper = page.locator("[data-white] canvas.sticker-material");
  await expect(paper).toHaveAttribute("data-state", "ready");
  const initial = await settledPaper(page, paper);
  const held = await page.evaluate(() => window.laminateFixture.getPose());

  const first = await page.evaluate(async () => {
    window.laminateFixture.tilt(40, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return window.laminateFixture.getPose();
  });
  expect(first, "Sensor acquisition must calibrate from the displayed held pose").toEqual(held);
  await unchangedPaper(
    initial,
    await settledPaper(page, paper),
    "Sensor acquisition must not flash the paper",
  );
  expect(
    (await readablePaper(initial)).span,
    "Neutral paper needs a localized reflection even when the ink is absent",
  ).toBeGreaterThanOrEqual(12);
  expect(await glossEdge(paper), "Gloss should reveal a short source boundary").toBeLessThanOrEqual(
    0.15,
  );
});

test("a five-degree iPad tilt visibly moves full-cut gloss while preserving the ink", async ({
  page,
}, info) => {
  await page.goto("/e2e/stickerLaminate.html");
  const paper = page.locator("[data-white] canvas.sticker-material");
  const print = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(paper).toHaveAttribute("data-state", "ready");
  await expect(print).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  const neutral = await settledPaper(page, paper);
  expect((await readablePaper(neutral)).span).toBeGreaterThanOrEqual(12);
  expect(await glossEdge(paper)).toBeLessThanOrEqual(0.15);
  expect(await inkContrast(paper, print)).toBeGreaterThanOrEqual(5);
  await info.attach("neutral-laminate", {
    body: await page.screenshot({ path: info.outputPath("neutral.png") }),
    contentType: "image/png",
  });

  for (const [name, beta, gamma] of [
    ["right", 40, 5],
    ["left", 40, -5],
    ["forward", 45, 0],
    ["backward", 35, 0],
  ] as const) {
    await page.evaluate(() => window.laminateFixture.tilt(40, 0));
    await unchangedPaper(
      neutral,
      await settledPaper(page, paper),
      `${name}: returning to neutral must restore the held reflection`,
    );
    await page.evaluate(([b, g]) => window.laminateFixture.tilt(b, g), [beta, gamma]);
    const tilted = await settledPaper(page, paper);
    if (name === "right")
      await info.attach("five-degree-laminate", {
        body: await page.screenshot({ path: info.outputPath("five-degree.png") }),
        contentType: "image/png",
      });
    await readablePaper(tilted);
    const change = await paperChange(neutral, tilted);
    expect(
      change.mean,
      `${name}: small tilt must move a readable reflection`,
    ).toBeGreaterThanOrEqual(1.5);
    expect(
      change.visibleFraction,
      `${name}: the reflection must move across blank paper, beyond an isolated glint`,
    ).toBeGreaterThanOrEqual(0.25);
    expect(
      await inkContrast(paper, print),
      `${name}: ink should remain distinct`,
    ).toBeGreaterThanOrEqual(5);
  }
});
