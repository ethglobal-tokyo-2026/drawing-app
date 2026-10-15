import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading, type Rotation } from "./deviceRotation";
import { ipad } from "./ipad";
import { decodeScreenshot, type ScreenshotPixels } from "./screenshotPixels";

// A large black gloss sticker mirrors only the room, so its brightest pixels are the shoji's glare.
// With the light and the eye fixed in the room, a mirror's glare moves as the device turns under it:
// these sweeps hold that against what the app draws.
test.use({ ...ipad, deviceScaleFactor: 1 });

/** Display luma, 0 to 1, above which a pixel of the black sticker is the shoji's glare. */
const GLARE = 0.35;
/** The least share of the sticker the glare must cover to be measured. */
const MIN_SHARE = 0.003;
/** How far back, as a share of the sticker, a step may go before it breaks a monotonic path. */
const STEP_SLACK = 0.01;

interface Glare {
  /** The swept angle, in degrees. */
  at: number;
  /** The glare's share of the sticker's pixels. */
  share: number;
  /** The glare's centroid, as a share of the sticker's width and height from its top left. */
  x: number;
  y: number;
  /** The lattice's orientation mod 90°, in degrees clockwise on screen. */
  lattice: number;
}

/** The glare's centroid, and the lattice's orientation from its edges' gradients, averaged at 4θ. */
function measureGlare({ width, height, data }: ScreenshotPixels): Omit<Glare, "at"> | null {
  const luma = new Float32Array(width * height);
  let count = 0,
    sumX = 0,
    sumY = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const value =
        (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
      luma[i] = value;
      if (value > GLARE) {
        count++;
        sumX += x;
        sumY += y;
      }
    }
  if (count < MIN_SHARE * width * height) return null;
  let cos = 0,
    sin = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const at = (dx: number, dy: number) => luma[(y + dy) * width + x + dx];
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
      const weight = gx * gx + gy * gy;
      if (!weight) continue;
      const angle = 4 * Math.atan2(gy, gx);
      cos += weight * Math.cos(angle);
      sin += weight * Math.sin(angle);
    }
  return {
    share: count / (width * height),
    x: sumX / count / width,
    y: sumY / count / height,
    lattice: (Math.atan2(sin, cos) / 4) * (180 / Math.PI),
  };
}

/** Waits for the light to land on the last reading, then for the material to draw it. */
async function settle(page: Page, deadlineMs: number) {
  await page.evaluate(async (deadlineMs) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const deadline = performance.now() + deadlineMs;
    let previous = "";
    let still = 0;
    while (still < 2 && performance.now() < deadline) {
      await frame();
      const next = JSON.stringify(window.lightSweepsFixture.getPose());
      still = next === previous ? still + 1 : 0;
      previous = next;
    }
    await frame();
    await frame();
  }, deadlineMs);
}

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
  if (centered) {
    await sendReading(page, centered);
    await settle(page, 3000);
  }
  for (const [i, { at, rotation }] of poses.entries()) {
    await sendReading(page, rotation);
    await settle(page, i === 0 ? 3000 : 900);
    const png = await page.screenshot({ clip, scale: "css" });
    await writeFile(testInfo.outputPath(`${name}-${String(i).padStart(2, "0")}-${at}.png`), png);
    const glare = measureGlare(await decodeScreenshot(png));
    path.push(glare && { at, ...glare });
  }
  // Beside its frames, so a run's paths can be compared with another's.
  await writeFile(testInfo.outputPath(`${name}.json`), JSON.stringify(path, null, 1));
  return path.filter((glare): glare is Glare => glare !== null);
}

const listPath = (path: Glare[]) =>
  path
    .map(
      (g) =>
        `${g.at}°: (${g.x.toFixed(3)}, ${g.y.toFixed(3)}) lattice ${g.lattice.toFixed(1)}° share ${g.share.toFixed(3)}`,
    )
    .join("\n");

/**
 * The poses where most of the glare is on the sticker. A sliver clipped by the sticker's edge has
 * too few lattice edges to orient, and its centroid sits wherever the tilted edge crosses first.
 */
const wholeGlare = (path: Glare[]) =>
  path.filter((glare) => glare.share >= 0.5 * Math.max(...path.map((other) => other.share)));

/**
 * The glare travels one way along `along` as the sweep goes, with little drift across it: each step
 * goes `direction`'s way, never back by more than STEP_SLACK.
 */
function expectTravel(path: Glare[], along: "x" | "y", direction: 1 | -1, label: string) {
  const across = along === "x" ? "y" : "x";
  const detail = `${label}\n${listPath(path)}`;
  expect.soft(path.length, `The glare shows at too few poses: ${detail}`).toBeGreaterThanOrEqual(4);
  const backSteps = path
    .slice(1)
    .filter((glare, i) => (glare[along] - path[i][along]) * direction < -STEP_SLACK);
  expect.soft(backSteps, `The glare turns back along ${along}: ${detail}`).toEqual([]);
  const values = (axis: "x" | "y", glares = path) => glares.map((glare) => glare[axis]);
  const travel = Math.max(...values(along)) - Math.min(...values(along));
  const whole = wholeGlare(path);
  const drift = Math.max(...values(across, whole)) - Math.min(...values(across, whole));
  expect.soft(travel, `The glare barely moves along ${along}: ${detail}`).toBeGreaterThan(0.15);
  expect.soft(drift, `The glare drifts along ${across}: ${detail}`).toBeLessThan(0.25 * travel);
}

/** Lattice orientations differ by this much, in degrees, mod 90. */
const latticeTurn = (from: number, to: number) => ((((to - from + 45) % 90) + 90) % 90) - 45;

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
      .toBeCloseTo(glare.at, -1);
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
