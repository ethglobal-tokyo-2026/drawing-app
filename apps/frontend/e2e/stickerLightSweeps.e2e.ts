import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading } from "./deviceRotation";
import { glareReading } from "./glarePose";
import { ipad } from "./ipad";
import {
  bearingTurn,
  capture,
  expectHeldHeight,
  expectTravel,
  glareLevels,
  glarePath,
  landOn,
  listPath,
  rotationOf,
  stickerPoint,
  steps,
  stillBetaOf,
  sweep,
  type Glare,
} from "./ceilingLightGlare";

// A large black gloss sticker mirrors only the room, so the ceiling light's glare stands out on it.
// With the light and the eye fixed in the room, a mirror's glare moves as the device turns under it:
// these sweeps hold that against what the app draws. The light hangs where the still pose's glare
// falls off the screen, so each sweep is a look from the still pose, around the pose that puts the
// glare on the sticker.
test.use({ ...ipad, deviceScaleFactor: 1 });

type Clip = { x: number; y: number; width: number; height: number };

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
 * Holds the still pose upright, so the viewer is centered there, and finds the look that puts the
 * glare `offset` from the sticker's middle, as shares of its size.
 */
async function lookFromStill(page: Page, clip: Clip, testInfo: TestInfo, offset = { x: 0, y: 0 }) {
  const rest = await sendReading(page, about.x(await stillBetaOf(page)));
  await landOn(page, rest, 3000);
  const still = await capture(page, clip, testInfo, "still");
  const look = await glareReading(page, rest, 0, await stickerPoint(page, clip, offset));
  return { rest, still, look: rotationOf(look) };
}

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

/** Tilted about the screen's horizontal axis from 10° forward of the look to 10° back. */
async function forwardBack(page: Page, clip: Clip, testInfo: TestInfo, name: string) {
  const { rest, still, look } = await lookFromStill(page, clip, testInfo);
  const frames = await sweep(
    page,
    clip,
    testInfo,
    name,
    steps(-10, 10, 11).map((tilt) => ({ at: tilt, rotation: compose(look, about.x(tilt)) })),
    rest,
  );
  const levels = glareLevels(still, frames[5].pixels);
  return glarePath(testInfo, name, frames, levels);
}

test("tilting forward and back moves the glare up and down the sticker", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  const path = await forwardBack(page, clip, testInfo, "forward-back");
  expectClimb(path, "Forward/back, 10° either way of the look");
});

test("tilting left and right slides the glare sideways at one height", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  const { rest, still, look } = await lookFromStill(page, clip, testInfo);
  const frames = await sweep(
    page,
    clip,
    testInfo,
    "left-right",
    steps(-10, 10, 11).map((tilt) => ({ at: tilt, rotation: compose(look, about.y(tilt)) })),
    rest,
  );
  const path = await glarePath(
    testInfo,
    "left-right",
    frames,
    glareLevels(still, frames[5].pixels),
  );
  expectTravel(path, "x", -1, "Left/right, 10° either way of the look");
  expectHeldHeight(path, "Left/right, 10° either way of the look");
});

test("turning the device like a steering wheel carries the glare around the sticker by the turn", async ({
  page,
}, testInfo) => {
  const clip = await openSticker(page, { pinAngle: true });
  // A quarter of the way up, so the glare's place has a bearing around the sticker's middle.
  const { rest, still, look } = await lookFromStill(page, clip, testInfo, { x: 0, y: -0.25 });
  const turns = [-20, -10, 0, 10, 20];
  const frames = await sweep(
    page,
    clip,
    testInfo,
    "steering-wheel",
    turns.map((turn) => ({ at: turn, rotation: compose(look, about.z(turn)) })),
    rest,
  );
  // The glare runs past the sticker's edges, so it is measured inside the circle the turn carries
  // onto itself.
  const path = await glarePath(
    testInfo,
    "steering-wheel",
    frames,
    glareLevels(still, frames[2].pixels),
    "circle",
  );
  const level = path.find((glare) => glare.at === 0);
  if (!level) throw new Error(`No glare in the sticker's circle at the look:\n${listPath(path)}`);
  expect
    .soft(path.length, `The glare leaves the sticker's circle:\n${listPath(path)}`)
    .toBe(turns.length);
  for (const glare of path) {
    // A turn about the screen's normal carries the eye and the light around it together, so the whole
    // glare turns about the screen's middle by as much, clockwise for a counterclockwise turn; only
    // the frames' pixels part its bearing from the turn.
    expect
      .soft(
        bearingTurn(level.bearing, glare.bearing),
        `Turned ${glare.at}°, the glare turns around the sticker:\n${listPath(path)}`,
      )
      .toBeCloseTo(Number(glare.at), 0);
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
      const path = await forwardBack(page, clip, testInfo, "ipad-forward-back");
      expectClimb(path, `iPad forward/back, screen.orientation.angle ${angle}`);
    });
  });
}
