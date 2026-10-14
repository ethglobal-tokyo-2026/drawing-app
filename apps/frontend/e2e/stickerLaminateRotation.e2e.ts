import { expect, test, type Locator } from "@playwright/test";
import { ipad } from "./ipad.ts";

test.use(ipad);

/** Bright-source centroid, measured from the actual white-paper output rather than its reference. */
async function reflection(paper: Locator) {
  return paper.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("White paper is missing");
    const context = element.getContext("2d");
    if (!context) throw new Error("White-paper pixels are unavailable");
    const { width, height } = element;
    const pixels = context.getImageData(0, 0, width, height).data;
    let minimum = 255;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i + 3] === 255) minimum = Math.min(minimum, pixels[i]);
    let total = 0,
      x = 0,
      y = 0;
    for (let row = 0; row < height; row++)
      for (let column = 0; column < width; column++) {
        const i = (row * width + column) * 4;
        if (pixels[i + 3] !== 255) continue;
        const weight = Math.max(0, pixels[i] - minimum - 3);
        total += weight;
        x += (weight * (column + 0.5)) / width;
        y += (weight * (row + 0.5)) / height;
      }
    if (!total) throw new Error("The gloss has no measurable localized reflection");
    return { x: x / total, y: y / total };
  });
}

async function snapshot(paper: Locator) {
  return paper.evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("White paper is missing");
    return canvas.toDataURL();
  });
}

test("turning a flat iPad preserves twist and moves the reflection without an unattended wave", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.screen, "orientation", {
      value: { angle: 0 },
      configurable: true,
    });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    if (typeof window.DeviceMotionEvent === "function")
      Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
        value: undefined,
        configurable: true,
      });
  });
  await page.goto("/e2e/stickerLaminate.html?foil=1&side=240");
  const paper = page.locator("[data-white] canvas.sticker-material");
  await expect(paper).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(0, 0, 123));
  await page.waitForTimeout(900);
  const foil = page.locator('[data-sticker="0"] canvas.sticker-material');
  const foilBefore = await snapshot(foil);
  const before = await snapshot(paper);
  await page.evaluate(() => window.laminateFixture.tilt(0, 0, 133));
  await expect
    .poll(async () => (await page.evaluate(() => window.laminateFixture.getPose())).rotationDegrees)
    .toBeCloseTo(-10, 2);
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  expect(pose.x).toBeCloseTo(0, 5);
  expect(pose.y).toBeCloseTo(0, 5);
  await expect.poll(() => snapshot(paper)).not.toBe(before);
  const after = await snapshot(paper);
  await expect.poll(() => snapshot(foil)).not.toBe(foilBefore);
  const foilAfter = await snapshot(foil);
  await page.waitForTimeout(1000);
  expect(await snapshot(paper)).toBe(after);
  expect(await snapshot(foil)).toBe(foilAfter);
});

for (const [name, angle, beta, axis] of [
  ["portrait held upright", 0, 80, "x"],
  ["portrait held flatter", 0, 12, "x"],
  ["landscape clockwise", 90, 40, "x"],
  ["landscape counterclockwise", -90, 40, "x"],
] as const) {
  test(`mixed wrist rotations move laminate with foil: ${name}`, async ({ page }) => {
    await page.addInitScript((screenAngle) => {
      // The synthetic orientation fixture must not mix its readings with a host sensor stream.
      window.addEventListener(
        "deviceorientation",
        (event) => {
          if (event.isTrusted) event.stopImmediatePropagation();
        },
        { capture: true },
      );
      Object.defineProperty(window.screen, "orientation", {
        value: { angle: screenAngle },
        configurable: true,
      });
      Object.defineProperty(window, "orientation", { value: screenAngle, configurable: true });
      if (typeof window.DeviceMotionEvent === "function")
        Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
          value: undefined,
          configurable: true,
        });
    }, angle);
    await page.goto("/e2e/stickerLaminate.html?foil=1&side=240");
    expect(await page.evaluate(() => window.screen.orientation.angle)).toBe(angle);
    const paper = page.locator("[data-white] canvas.sticker-material");
    const foil = page.locator('[data-sticker="0"] .sticker-material');
    await expect(paper).toHaveAttribute("data-state", "ready");
    await page.evaluate((b) => window.laminateFixture.tilt(b, 0, 123), beta);
    await page.waitForTimeout(900);
    const initialPose = await page.evaluate(() => window.laminateFixture.getPose());
    expect(
      initialPose.x,
      "The controlled first reading must calibrate without moving the light",
    ).toBeCloseTo(0, 5);
    expect(
      initialPose.y,
      "The controlled first reading must calibrate without moving the light",
    ).toBeCloseTo(0, 5);
    const neutral = await reflection(paper);
    const foilNeutral = await snapshot(foil);
    for (const sign of [-1, 1]) {
      await page.evaluate(
        ([b, direction, screenAngle]) => {
          const vertical =
            screenAngle === 90
              ? 5 * direction
              : screenAngle === -90
                ? -5 * direction
                : 0.5 * direction;
          // A wrist turn delivers coupled alpha, beta, and gamma changes, not independent Euler sliders.
          window.laminateFixture.tilt(b + vertical, 2 * direction, 123 + 5 * direction);
        },
        [beta, sign, angle],
      );
      await page.waitForTimeout(900);
      const after = await reflection(paper);
      await expect.poll(() => snapshot(foil)).not.toBe(foilNeutral);
      expect(
        (after[axis] - neutral[axis]) * sign,
        "The laminate must travel with the foil under the same reading",
      ).toBeGreaterThan(0.05);
    }
  });
}
