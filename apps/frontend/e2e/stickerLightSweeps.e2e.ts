import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading, type Rotation } from "./deviceRotation";
import { ipad } from "./ipad";
import { decodeScreenshot } from "./screenshotPixels";
import {
  expectTravel,
  landOn,
  latticeTurn,
  listPath,
  measureGlare,
  wholeGlare,
  type Glare,
} from "./shojiGlare";

// A large black gloss sticker mirrors only the room, so the shoji's glare stands out on it.
// With the light and the eye fixed in the room, a mirror's glare moves as the device turns under it:
// these sweeps hold that against what the app draws.
test.use({ ...ipad, deviceScaleFactor: 1 });

async function openSticker(page: Page, { pinAngle }: { pinAngle: boolean }) {
  if (pinAngle)
    await page.addInitScript(() =>
      // Pinned on the prototype, as an upright screen reports it, so only the room is under test.
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        configurable: true,
        get: () => 0,
      }),
    );
  await page.goto("/e2e/stickerLightSweeps.html");
  await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(1);
  const box = await page.locator("[data-sweep-sticker]").boundingBox();
  if (!box) throw new Error("The sweep sticker isn't on screen");
  return { x: box.x + 2, y: box.y + 2, width: box.width - 4, height: box.height - 4 };
}

/**
 * Holds the first pose until the light rests on it, then moves through the rest, capturing each
 * promptly once the light has landed: the viewpoint may drift back while the device moves. With
 * `centered`, the light first rests there, so the viewer is centered on it before the sweep.
 */
async function sweep(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  testInfo: TestInfo,
  name: string,
  poses: { at: number; rotation: Rotation }[],
  centered?: Rotation,
) {
  const path: (Glare | null)[] = [];
  if (centered) await landOn(page, await sendReading(page, centered), 3000);
  for (const [i, { at, rotation }] of poses.entries()) {
    await landOn(page, await sendReading(page, rotation), 3000);
    const png = await page.screenshot({ clip, scale: "css" });
    await writeFile(testInfo.outputPath(`${name}-${String(i).padStart(2, "0")}-${at}.png`), png);
    const { glare } = measureGlare(await decodeScreenshot(png));
    path.push(glare && { at, ...glare });
  }
  // Beside its frames, so a run's paths can be compared with another's.
  await writeFile(testInfo.outputPath(`${name}.json`), JSON.stringify(path, null, 1));
  return path.filter((glare): glare is Glare => glare !== null);
}

/** Upright in portrait, tilted back from 30° to 80°: the top edge goes away from the face. */
const FORWARD_BACK = Array.from({ length: 21 }, (_, i) => 30 + i * 2.5).map((beta) => ({
  at: beta,
  rotation: about.x(beta),
}));

/** Tilting back carries the glare up the sticker, into its top quarter. */
function expectClimb(path: Glare[], label: string) {
  expectTravel(path, "y", -1, label);
  expect
    .soft(
      Math.min(...path.map((glare) => glare.y)),
      `It never reaches the top quarter:\n${listPath(path)}`,
    )
    .toBeLessThan(0.25);
}

test("tilting forward and back moves the glare up and down the sticker", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  const path = await sweep(page, clip, testInfo, "forward-back", FORWARD_BACK);
  expectClimb(path, "Forward/back, β 30° to 80° at γ 0°");
});

test("tilting left and right moves the glare sideways without turning the lattice", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  const poses = Array.from({ length: 21 }, (_, i) => -20 + i * 2).map((gamma) => ({
    at: gamma,
    rotation: compose(about.x(47), about.y(gamma)),
  }));
  // Held at the reading pose first, as a hand does, so the whole sweep stays inside the viewer's
  // re-centering release and shows the tilt alone.
  const path = await sweep(page, clip, testInfo, "left-right", poses, about.x(47));
  expectTravel(path, "x", -1, "Left/right, γ −20° to 20° at β 47°");
  const whole = wholeGlare(path);
  const turns = whole.map((glare) => latticeTurn(whole[0].lattice, glare.lattice));
  expect
    .soft(
      Math.max(...turns) - Math.min(...turns),
      `The lattice turns as the device tilts sideways:\n${listPath(whole)}`,
    )
    .toBeLessThan(8);
});

test("turning the device like a steering wheel turns the lattice by the turn", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  const turns = [-20, -10, 0, 10, 20];
  const path = await sweep(
    page,
    clip,
    testInfo,
    "steering-wheel",
    turns.map((turn) => ({ at: turn, rotation: compose(about.x(47), about.z(turn)) })),
  );
  const level = path.find((glare) => glare.at === 0);
  if (!level) throw new Error(`No glare on the sticker at β 47°:\n${listPath(path)}`);
  for (const glare of path) {
    // A device turned counterclockwise sees the room turn clockwise on its screen, by as much.
    expect
      .soft(
        latticeTurn(level.lattice, glare.lattice),
        `Turned ${glare.at}°, the lattice turns:\n${listPath(path)}`,
      )
      .toBeCloseTo(Number(glare.at), -1);
  }
});

// An iPad in desktop mode has a Mac's user agent but five touch points. Safari keeps
// window.orientation there; an in-app browser may not, which leaves the orientation type.
for (const { browser, windowOrientation } of [
  { browser: "Safari", windowOrientation: 0 },
  { browser: "a browser without window.orientation", windowOrientation: null },
] as const) {
  test.describe(`on an iPad in desktop mode, in ${browser}`, () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    });

    test("held upright, tilting forward and back still moves the glare up and down", async ({
      page,
      browserName,
    }, testInfo) => {
      test.skip(
        browserName !== "webkit",
        "WebKit is the iPad's engine, and its screen angle is under test",
      );
      await page.addInitScript((orientation) => {
        Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
          configurable: true,
          get: () => 5,
        });
        // Without it, the light falls back to the orientation type.
        Object.defineProperty(window, "orientation", {
          configurable: true,
          get: () => orientation ?? undefined,
        });
      }, windowOrientation);
      // Not pinned: held upright, WebKit reports 90 here, as a real iPad in desktop mode does.
      const clip = await openSticker(page, { pinAngle: false });
      const angle = await page.evaluate(() => screen.orientation?.angle);
      testInfo.annotations.push({ type: "screen.orientation.angle", description: String(angle) });
      const path = await sweep(page, clip, testInfo, "ipad-forward-back", FORWARD_BACK);
      expectClimb(path, `iPad forward/back, screen.orientation.angle ${angle}`);
    });
  });
}
