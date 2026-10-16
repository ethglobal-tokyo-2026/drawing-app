import { expect, test, type Page } from "@playwright/test";
import { about, sendReading, type Reading } from "./deviceRotation";
import { landOn } from "./ceilingLightGlare";
import { glareReading } from "./glarePose";
import { ipad } from "./ipad";

async function peakLevel(page: Page) {
  return page.locator("canvas.sticker-material").evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The reflection canvas is missing");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The reflection pixels are unavailable");
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let peak = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] === 255) peak = Math.max(peak, data[i]);
    return peak;
  });
}

async function reflectedPeak(page: Page, rest: Reading) {
  const look = await glareReading(page, rest, 0);
  await page.evaluate(
    (reading) => window.dispatchEvent(Object.assign(new Event("deviceorientation"), reading)),
    look,
  );
  await landOn(page, look, 3000);
  return peakLevel(page);
}

const linearLevel = (level: number) => {
  const channel = level / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

for (const sample of [
  { name: "phone", device: "phone", options: {} },
  { name: "tablet portrait", device: "tablet", options: { ...ipad } },
  {
    name: "tablet landscape",
    device: "tablet",
    options: { ...ipad, viewport: { width: 1376, height: 1032 } },
  },
  {
    name: "tablet LINE-sized page",
    device: "tablet",
    options: {
      ...ipad,
      viewport: { width: 440, height: 956 },
      screen: { width: 1032, height: 1376 },
    },
  },
] as const) {
  test.describe(`${sample.name} light placement`, () => {
    test.use(sample.options);
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
        Object.defineProperty(ScreenOrientation.prototype, "angle", {
          get: () => 0,
          configurable: true,
        });
        Object.defineProperty(window, "orientation", { value: 0, configurable: true });
      });
    });

    test("keeps the resting source centered above the screen and limits its reflected brightness", async ({
      page,
    }) => {
      await page.goto("/e2e/stickerLightSweeps.html");
      await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(1);
      const still = await page.evaluate(() => window.lightSweepsFixture.stillPose);
      const rest = await sendReading(page, about.x(still.beta));
      await landOn(page, rest, 3000);
      const placement = await page.evaluate(async () => {
        const { ROOM, roomFrame } = await import("../src/stickers/sharedRoom.ts");
        const { mirrored } = await import("./glarePose.ts");
        const { VIEWING_CLASS } = await import("../src/stickers/viewing.ts");
        const frame = roomFrame(window.lightSweepsFixture.getPose());
        const rim = Array.from({ length: 360 }, (_, i) =>
          mirrored(frame, ROOM.light, {
            across: Math.cos((i * Math.PI) / 180),
            down: Math.sin((i * Math.PI) / 180),
          }),
        );
        if (rim.some((point) => point === null))
          throw new Error("The resting light crosses the screen plane");
        return {
          device: VIEWING_CLASS,
          middle: mirrored(frame, ROOM.light, { across: 0, down: 0 }),
          bottom: Math.max(...rim.flatMap((point) => (point ? [point.y] : []))),
          top: -innerHeight / 2,
        };
      });
      expect(placement.device).toBe(sample.device);
      expect(Math.abs(placement.middle?.x ?? Infinity)).toBeLessThan(1);
      expect(placement.bottom).toBeLessThan(placement.top);

      const restingPeak = await peakLevel(page);
      const peak = await reflectedPeak(page, rest);
      expect(peak, "The direct reflection should still visibly lift black ink").toBeGreaterThan(
        restingPeak * 2,
      );
      await page.goto("/e2e/stickerLightSweeps.html?white");
      await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(1);
      const whiteRest = await sendReading(page, about.x(still.beta));
      await landOn(page, whiteRest, 3000);
      const whitePeak = await reflectedPeak(page, whiteRest);
      expect(
        (linearLevel(whitePeak) + 0.05) / (linearLevel(peak) + 0.05),
        "Ink under the reflected source must stay distinguishable from illuminated white paper",
      ).toBeGreaterThanOrEqual(1.5);
    });
  });
}
