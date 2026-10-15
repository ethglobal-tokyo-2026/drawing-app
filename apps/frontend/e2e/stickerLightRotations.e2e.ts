import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading, type Rotation } from "./deviceRotation";
import { ipad } from "./ipad";
import { phone } from "./phone";
import { decodeScreenshot } from "./screenshotPixels";
import {
  expectTravel,
  landOn,
  latticeTurn,
  listPath,
  measureGlare,
  STEP_SLACK,
  wholeGlare,
  type Frame,
  type Glare,
} from "./shojiGlare";

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

async function capture(page: Page, clip: Clip, testInfo: TestInfo, name: string): Promise<Frame> {
  const png = await page.screenshot({ clip, scale: "css" });
  await writeFile(testInfo.outputPath(`${name}.png`), png);
  return measureGlare(await decodeScreenshot(png));
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
  await landOn(page, await sendReading(page, centered), 3000);
  const path: (Glare | null)[] = [];
  for (const [i, { at, rotation }] of poses.entries()) {
    await landOn(page, await sendReading(page, rotation), 3000);
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
        const whole = wholeGlare(leftRight);
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

      await landOn(page, await sendReading(page, held(about.x(READING), 0)), 3000);
      note("upright", await capture(page, clip, testInfo, "turn-00-upright"));
      // A steering-wheel turn at the reading tilt, the UI still upright until the turn completes.
      for (const [i, wheel] of [15, 30, 45, 60, 75, 90].entries()) {
        await landOn(
          page,
          await sendReading(page, compose(about.x(READING), about.z(wheel))),
          3000,
        );
        note(
          `wheel ${wheel}°`,
          await capture(page, clip, testInfo, `turn-0${i + 1}-wheel-${wheel}`),
        );
      }
      await turnUi(page, device, 90);
      clip = await stickerClip(page);
      const pose = held(about.x(READING), 90);
      const reading = await sendReading(page, pose);
      await landOn(page, reading, 3000);
      // Through the viewer's re-centering, then once the light stops publishing.
      const after: Frame[] = [];
      for (let i = 0; i < 6; i++) {
        const frame = await capture(page, clip, testInfo, `turn-1${i}-on-its-side`);
        note(`on its side ${i}`, frame);
        after.push(frame);
        await page.waitForTimeout(1000);
      }
      const settledMs = await landOn(page, reading, 20_000, 1500);
      const settled = await capture(page, clip, testInfo, "turn-20-settled");
      note(`settled after ${Math.round(settledMs)} ms`, settled);
      after.push(settled);

      // A fresh session opened on its side, at the same pose.
      const freshPage = await page.context().newPage();
      await freshPage.setViewportSize(sizeAt(device, 90));
      await presentAs(freshPage, device, 90);
      await freshPage.goto("/e2e/stickerLightSweeps.html");
      clip = await stickerClip(freshPage);
      await landOn(freshPage, await sendReading(freshPage, pose), 5000, 1500);
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
