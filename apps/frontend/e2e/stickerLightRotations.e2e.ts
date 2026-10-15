import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading, type Rotation } from "./deviceRotation";
import { ipad } from "./ipad";
import { phone } from "./phone";
import { decodeScreenshot } from "./screenshotPixels";

// The light sweeps' black gloss sticker, held in every orientation its screen can be turned to. Each
// reading is the screen's own tilt carried into the device's portrait axes, so the glare must cross
// the displayed sticker the same way whichever way the device is held.
test.use({ deviceScaleFactor: 1 });

/** How far the device is turned from portrait, counterclockwise as its screen faces you, in degrees. */
type Turn = 0 | 90 | -90 | 180;

/** What the page says about the turn; an absent key leaves the browser's own value. */
interface ScreenReport {
  /** `window.orientation`; null hides it, as some in-app browsers do. */
  windowOrientation?: number | null;
  type?: OrientationType;
  angle?: number;
}

declare global {
  interface Window {
    lightRotationsReport: ScreenReport;
  }
}

interface Device {
  name: string;
  /** The one engine the device runs, where only one can present it. */
  engine?: "webkit" | "chromium";
  userAgent: string;
  touchPoints?: number;
  /** The page's size held upright. */
  upright: { width: number; height: number };
  turns: Turn[];
  report: (turn: Turn) => ScreenReport;
}

const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

const typeOf = (turn: Turn): OrientationType =>
  turn === 0
    ? "portrait-primary"
    : turn === 90
      ? "landscape-primary"
      : turn === -90
        ? "landscape-secondary"
        : "portrait-secondary";

const DEVICES: Device[] = [
  {
    name: "an iPad in desktop mode, in Safari",
    engine: "webkit",
    userAgent: MAC_SAFARI,
    touchPoints: 5,
    upright: ipad.viewport,
    turns: [0, 90, -90, 180],
    // screen.orientation stays WebKit's own, which calls an upright iPad turned by 90°.
    report: (turn) => ({ windowOrientation: turn }),
  },
  {
    name: "an iPad in desktop mode, in a browser without window.orientation",
    engine: "webkit",
    userAgent: MAC_SAFARI,
    touchPoints: 5,
    upright: ipad.viewport,
    turns: [0, 90, -90, 180],
    // Upright, the orientation type stays WebKit's own too.
    report: (turn) =>
      turn === 0 ? { windowOrientation: null } : { windowOrientation: null, type: typeOf(turn) },
  },
  {
    name: "an iPhone",
    userAgent: IPHONE_SAFARI,
    upright: phone.viewport,
    turns: [0, 90, -90],
    report: (turn) => ({ windowOrientation: turn }),
  },
  {
    name: "an Android phone",
    engine: "chromium",
    userAgent: ANDROID_CHROME,
    upright: phone.viewport,
    turns: [0, 90, -90],
    report: (turn) => ({ angle: (turn + 360) % 360 }),
  },
];

const sizeAt = ({ upright }: Device, turn: Turn) =>
  Math.abs(turn) === 90 ? { width: upright.height, height: upright.width } : upright;

/** The reading of a device turned by `turn` whose screen is posed at `screen`, in the screen's axes. */
const held = (screen: Rotation, turn: Turn) => compose(screen, about.z(turn));

/** The reading tilt: the still pose's beta, about the screen's horizontal axis. */
const READING = 47;

/** Display luma, 0 to 1, above which a pixel of the black sticker is the shoji's glare. */
const GLARE = 0.35;
/** The least share of the sticker the glare must cover to be measured. */
const MIN_SHARE = 0.003;
/** How far back, as a share of the sticker, a step may go before it breaks a monotonic path. */
const STEP_SLACK = 0.01;
/** The glare's share of the sticker past which its centroid no longer tracks where it is. */
const FILLED = 0.7;

interface Glare {
  /** The swept angle, in degrees, or the frame's name. */
  at: number | string;
  /** The glare's share of the sticker's pixels. */
  share: number;
  /** The glare's centroid, as a share of the sticker's width and height from its top left. */
  x: number;
  y: number;
  /** The lattice's orientation mod 90°, in degrees clockwise on screen. */
  lattice: number;
}

interface Frame {
  luma: Float32Array;
  glare: Omit<Glare, "at"> | null;
}

/** The glare's centroid, and the lattice's orientation from its edges' gradients, averaged at 4θ. */
async function measure(png: Buffer): Promise<Frame> {
  const { width, height, data } = await decodeScreenshot(png);
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
  if (count < MIN_SHARE * width * height) return { luma, glare: null };
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
    luma,
    glare: {
      share: count / (width * height),
      x: sumX / count / width,
      y: sumY / count / height,
      lattice: (Math.atan2(sin, cos) / 4) * (180 / Math.PI),
    },
  };
}

/**
 * Waits for the light to land on the last reading, then for the material to draw it. With `quietMs`,
 * the pose must also hold that long, which outlasts a re-centering viewer's spaced steps.
 */
async function settle(page: Page, deadlineMs: number, quietMs = 0) {
  return page.evaluate(
    async ({ deadlineMs, quietMs }) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const start = performance.now();
      let previous = "";
      let still = 0;
      let changed = start;
      while (performance.now() < start + deadlineMs) {
        await frame();
        const next = JSON.stringify(window.lightSweepsFixture.getPose());
        if (next === previous) still++;
        else {
          still = 0;
          changed = performance.now();
        }
        previous = next;
        if (still >= 2 && performance.now() - changed >= quietMs) break;
      }
      await frame();
      await frame();
      return { settledMs: changed - start, timedOut: performance.now() >= start + deadlineMs };
    },
    { deadlineMs, quietMs },
  );
}

/** Presents the page as `device` turned by `turn`, from before its first script runs. */
async function presentAs(page: Page, device: Device, turn: Turn) {
  await page.addInitScript(
    ({ touchPoints, report }) => {
      window.lightRotationsReport = report;
      if (touchPoints !== null)
        Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
          configurable: true,
          get: () => touchPoints,
        });
      if ("windowOrientation" in report)
        Object.defineProperty(window, "orientation", {
          configurable: true,
          get: () => window.lightRotationsReport.windowOrientation ?? undefined,
        });
      const proto = ScreenOrientation.prototype;
      for (const key of ["type", "angle"] as const) {
        const own: unknown = Reflect.get(Object.getOwnPropertyDescriptor(proto, key) ?? {}, "get");
        Object.defineProperty(proto, key, {
          configurable: true,
          get(this: ScreenOrientation): unknown {
            const pinned = window.lightRotationsReport[key];
            return pinned ?? (typeof own === "function" ? Reflect.apply(own, this, []) : undefined);
          },
        });
      }
    },
    { touchPoints: device.touchPoints ?? null, report: device.report(turn) },
  );
}

/** Turns the page's report and shape to `turn`, as the UI turns with the device. */
async function turnUi(page: Page, device: Device, turn: Turn) {
  await page.evaluate((report) => {
    window.lightRotationsReport = report;
  }, device.report(turn));
  await page.setViewportSize(sizeAt(device, turn));
}

async function stickerClip(page: Page) {
  await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(1);
  const box = await page.locator("[data-sweep-sticker]").boundingBox();
  if (!box) throw new Error("The sweep sticker isn't on screen");
  return { x: box.x + 2, y: box.y + 2, width: box.width - 4, height: box.height - 4 };
}

type Clip = Awaited<ReturnType<typeof stickerClip>>;

async function capture(page: Page, clip: Clip, testInfo: TestInfo, name: string) {
  const png = await page.screenshot({ clip, scale: "css" });
  await writeFile(testInfo.outputPath(`${name}.png`), png);
  return measure(png);
}

/**
 * Rests the light on `centered`, so the viewer is centered there, then moves through the poses,
 * capturing each once the light has landed.
 */
async function sweep(
  page: Page,
  clip: Clip,
  testInfo: TestInfo,
  name: string,
  poses: { at: number; rotation: Rotation }[],
  centered: Rotation,
) {
  await sendReading(page, centered);
  await settle(page, 3000);
  const path: (Glare | null)[] = [];
  for (const [i, { at, rotation }] of poses.entries()) {
    await sendReading(page, rotation);
    await settle(page, i === 0 ? 3000 : 900);
    const { glare } = await capture(
      page,
      clip,
      testInfo,
      `${name}-${String(i).padStart(2, "0")}-${at}`,
    );
    path.push(glare && { at, ...glare });
  }
  await writeFile(testInfo.outputPath(`${name}.json`), JSON.stringify(path, null, 1));
  return path.filter((glare): glare is Glare => glare !== null);
}

const describeGlare = (g: Glare) =>
  `${g.at}: (${g.x.toFixed(3)}, ${g.y.toFixed(3)}) lattice ${g.lattice.toFixed(1)}° share ${g.share.toFixed(3)}`;
const listPath = (path: Glare[]) => path.map(describeGlare).join("\n");

/**
 * The glare travels one way along `along` as the sweep goes, with little drift across it: each step
 * goes `direction`'s way, never back by more than STEP_SLACK.
 */
function expectTravel(path: Glare[], along: "x" | "y", direction: 1 | -1, label: string) {
  const across = along === "x" ? "y" : "x";
  const detail = `${label}\n${listPath(path)}`;
  expect.soft(path.length, `The glare shows at too few poses: ${detail}`).toBeGreaterThanOrEqual(4);
  if (path.length < 2) return;
  // A glare that fills most of the sticker has its centroid pinned near the middle, so those steps
  // say nothing about its travel.
  const backSteps = path
    .slice(1)
    .filter(
      (glare, i) =>
        Math.max(glare.share, path[i].share) < FILLED &&
        (glare[along] - path[i][along]) * direction < -STEP_SLACK,
    );
  expect.soft(backSteps, `The glare turns back along ${along}: ${detail}`).toEqual([]);
  const values = (axis: "x" | "y") => path.map((glare) => glare[axis]);
  const travel = Math.max(...values(along)) - Math.min(...values(along));
  const drift = Math.max(...values(across)) - Math.min(...values(across));
  expect.soft(travel, `The glare barely moves along ${along}: ${detail}`).toBeGreaterThan(0.15);
  expect.soft(drift, `The glare drifts along ${across}: ${detail}`).toBeLessThan(0.25 * travel);
}

/** Lattice orientations differ by this much, in degrees, mod 90. */
const latticeTurn = (from: number, to: number) => ((((to - from + 45) % 90) + 90) % 90) - 45;

/** A sweep's steps, evenly from `from` to `to`. */
const steps = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

const turnName = (turn: Turn) =>
  turn === 0
    ? "upright"
    : turn === 90
      ? "on its side, top edge to the left"
      : turn === -90
        ? "on its side, top edge to the right"
        : "upside down";

for (const device of DEVICES)
  test.describe(`on ${device.name}`, () => {
    test.use({
      userAgent: device.userAgent,
      isMobile: true,
      hasTouch: true,
      viewport: device.upright,
    });
    test.beforeEach(({ browserName }) => {
      test.skip(
        device.engine !== undefined && browserName !== device.engine,
        `Only ${device.engine} presents ${device.name}`,
      );
    });

    for (const turn of device.turns)
      test(`held ${turnName(turn)}, tilts about the screen's axes move the glare along them`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(sizeAt(device, turn));
        await presentAs(page, device, turn);
        await page.goto("/e2e/stickerLightSweeps.html");
        const clip = await stickerClip(page);
        const reported = await page.evaluate(() => ({
          windowOrientation: String(Reflect.get(window, "orientation")),
          type: screen.orientation?.type,
          angle: screen.orientation?.angle,
        }));
        testInfo.annotations.push({ type: "reported", description: JSON.stringify(reported) });

        // Leaning the screen back from 30° to 56°, centered on 43° so the viewer stays put: the
        // glare climbs the displayed sticker in every orientation.
        const forwardBack = await sweep(
          page,
          clip,
          testInfo,
          "forward-back",
          steps(30, 56, 14).map((beta) => ({ at: beta, rotation: held(about.x(beta), turn) })),
          held(about.x(43), turn),
        );
        expectTravel(forwardBack, "y", -1, `Forward/back, ${turnName(turn)}`);

        // Turning the screen about its vertical axis at the reading tilt slides the glare across
        // the displayed sticker without turning its lattice.
        // A phone's small sticker loses the glare off its top edge at the reading tilt, so it sweeps
        // where the glare sits mid-sticker.
        const onIpad = device.upright === ipad.viewport;
        const tilt = onIpad ? READING : 40;
        const range = onIpad ? 20 : 8;
        const leftRight = await sweep(
          page,
          clip,
          testInfo,
          "left-right",
          steps(-range, range, 11).map((gamma) => ({
            at: gamma,
            rotation: held(compose(about.x(tilt), about.y(gamma)), turn),
          })),
          held(about.x(tilt), turn),
        );
        expectTravel(leftRight, "x", -1, `Left/right, ${turnName(turn)}`);
        const whole = leftRight.filter(
          (glare) => glare.share >= 0.5 * Math.max(...leftRight.map((other) => other.share)),
        );
        const turns = whole.map((glare) => latticeTurn(whole[0].lattice, glare.lattice));
        expect
          .soft(
            Math.max(...turns) - Math.min(...turns),
            `The lattice turns as the device tilts sideways:\n${listPath(whole)}`,
          )
          .toBeLessThan(8);
      });

    test("turned from upright onto its side, the settled glare is a fresh session's", async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      await presentAs(page, device, 0);
      await page.goto("/e2e/stickerLightSweeps.html");
      let clip = await stickerClip(page);
      const frames: Glare[] = [];
      const note = (at: string, { glare }: Frame) => {
        if (glare) frames.push({ at, ...glare });
      };

      await sendReading(page, held(about.x(READING), 0));
      await settle(page, 3000);
      note("upright", await capture(page, clip, testInfo, "turn-00-upright"));
      // A steering-wheel turn at the reading tilt, the UI still upright until the turn completes.
      for (const [i, wheel] of [15, 30, 45, 60, 75, 90].entries()) {
        await sendReading(page, compose(about.x(READING), about.z(wheel)));
        await settle(page, 900);
        note(
          `wheel ${wheel}°`,
          await capture(page, clip, testInfo, `turn-0${i + 1}-wheel-${wheel}`),
        );
      }
      await turnUi(page, device, 90);
      clip = await stickerClip(page);
      const pose = held(about.x(READING), 90);
      await sendReading(page, pose);
      await settle(page, 900);
      // Through the viewer's re-centering, then once the light stops publishing.
      const after: Frame[] = [];
      for (let i = 0; i < 6; i++) {
        const frame = await capture(page, clip, testInfo, `turn-1${i}-on-its-side`);
        note(`on its side ${i}`, frame);
        after.push(frame);
        await page.waitForTimeout(1000);
      }
      const { settledMs, timedOut } = await settle(page, 20_000, 1500);
      expect(timedOut, "The light never stops publishing after the turn").toBe(false);
      const settled = await capture(page, clip, testInfo, "turn-20-settled");
      note(`settled after ${Math.round(settledMs)} ms`, settled);
      after.push(settled);

      // A fresh session opened on its side, at the same pose.
      const freshPage = await page.context().newPage();
      await freshPage.setViewportSize(sizeAt(device, 90));
      await presentAs(freshPage, device, 90);
      await freshPage.goto("/e2e/stickerLightSweeps.html");
      clip = await stickerClip(freshPage);
      await sendReading(freshPage, pose);
      await settle(freshPage, 5000, 1500);
      const fresh = await capture(freshPage, clip, testInfo, "turn-30-fresh-on-its-side");
      note("fresh on its side", fresh);
      await writeFile(testInfo.outputPath("turn.json"), JSON.stringify(frames, null, 1));
      const detail = listPath(frames);

      expect(settled.glare, `No glare once settled:\n${detail}`).not.toBeNull();
      expect(fresh.glare, `No glare in the fresh session:\n${detail}`).not.toBeNull();
      const target = fresh.glare;
      if (!settled.glare || !target) return;
      // A settled viewer depends only on the pose, so the two frames match to the pixel.
      let difference = 0;
      for (let i = 0; i < fresh.luma.length; i++)
        difference += Math.abs(settled.luma[i] - fresh.luma[i]);
      expect
        .soft(
          difference / fresh.luma.length,
          `The settled frame differs from a fresh one:\n${detail}`,
        )
        .toBeLessThan(0.002);
      expect.soft(Math.abs(settled.glare.x - target.x), detail).toBeLessThan(0.004);
      expect.soft(Math.abs(settled.glare.y - target.y), detail).toBeLessThan(0.004);
      expect
        .soft(Math.abs(latticeTurn(target.lattice, settled.glare.lattice)), detail)
        .toBeLessThan(0.5);
      // No lasting jump: after the turn, every frame closes on the settled glare, never backing off.
      const distances = after
        .map(({ glare }) => glare && Math.hypot(glare.x - target.x, glare.y - target.y))
        .filter((distance): distance is number => distance !== null);
      const backOffs = distances
        .slice(1)
        .filter((distance, i) => distance > distances[i] + STEP_SLACK);
      expect.soft(backOffs, `The glare moves away from where it settles:\n${detail}`).toEqual([]);
    });
  });
