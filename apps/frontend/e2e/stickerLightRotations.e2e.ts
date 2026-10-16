import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { about, compose, sendReading, type Rotation } from "./deviceRotation";
import { glareReading } from "./glarePose";
import { ipad } from "./ipad";
import { phone } from "./phone";
import { hideAndShow } from "./screenTilt";
import {
  capture,
  expectHeldHeight,
  expectTravel,
  glareLevels,
  glarePath,
  landOn,
  listPath,
  lumaDifference,
  measureGlare,
  rotationOf,
  stickerPoint,
  steps,
  stillBetaOf,
  sweep,
  viewerTurn,
  type Glare,
} from "./ceilingLightGlare";

// The light sweeps' black gloss sticker, held in every orientation its screen can be turned to. Each
// reading is the screen's own tilt carried into the device's portrait axes, so the glare must cross
// the displayed sticker the same way whichever way the device is held. The still pose's glare falls
// off the screen, so each sweep is a look from the still pose, around the pose that puts the glare on
// the sticker.
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

/** How far each sweep tilts either way of the look, in degrees: past where the glare leaves the sticker. */
const SPAN = { ipad: 10, phone: 7 } as const;

/**
 * Where a look from the settled pose puts the glare: on the sticker's top edge, so its rim crosses
 * the sticker even where the glare outgrows it, and moves with any difference in the viewer.
 */
const LOOK_OFFSET = { x: 0, y: -0.5 };

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

        // The still pose in the screen's axes centers the viewer; the look puts the glare on the
        // sticker's middle, and the tilts turn the screen about its own axes from there.
        const rest = await sendReading(page, held(about.x(await stillBetaOf(page)), turn));
        await landOn(page, rest, 3000);
        const still = await capture(page, clip, testInfo, "still");
        const look = rotationOf(
          await glareReading(page, rest, turn, await stickerPoint(page, clip)),
        );
        const onIpad = device.upright === ipad.viewport;
        const span = SPAN[onIpad ? "ipad" : "phone"];
        const tilts = (tilt: (degrees: number) => Rotation) =>
          steps(-span, span, 11).map((degrees) => ({
            at: degrees,
            rotation: held(compose(look, about.z(-turn), tilt(degrees)), turn),
          }));

        // Leaning the screen back climbs the glare up the displayed sticker in every orientation.
        const forwardBackFrames = await sweep(
          page,
          clip,
          testInfo,
          "forward-back",
          tilts(about.x),
          rest,
        );
        const levels = glareLevels(still, forwardBackFrames[5].pixels);
        const forwardBack = await glarePath(testInfo, "forward-back", forwardBackFrames, levels);
        expectTravel(forwardBack, "y", -1, `Forward/back, ${turnName(turn)}`);

        // Turning the screen about its vertical axis slides the glare across the displayed sticker.
        const leftRight = await glarePath(
          testInfo,
          "left-right",
          await sweep(page, clip, testInfo, "left-right", tilts(about.y), rest),
          levels,
        );
        expectTravel(leftRight, "x", -1, `Left/right, ${turnName(turn)}`);
        // A phone's sticker, and an iPad's on its side, is narrower than the ceiling light's glare,
        // whose centroid then follows where the round edge crosses the sticker's.
        if (onIpad && Math.abs(turn) !== 90)
          expectHeldHeight(leftRight, `Left/right, ${turnName(turn)}`);
      });

    test("returned on its side, the glare is a fresh session's after a fresh reading", async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);
      await presentAs(page, device, 0);
      await page.goto("/e2e/stickerLightSweeps.html");
      let clip = await stickerClip(page);
      const stillBeta = await stillBetaOf(page);

      await landOn(page, await sendReading(page, held(about.x(stillBeta), 0)), 3000);
      // A steering-wheel turn at the still pose, the UI still upright until the turn completes.
      for (const wheel of [15, 30, 45, 60, 75, 90])
        await landOn(
          page,
          await sendReading(page, compose(about.x(stillBeta), about.z(wheel))),
          3000,
        );
      await turnUi(page, device, 90);
      clip = await stickerClip(page);
      // Leaned back as it lands, since a viewer turned only about the screen's normal sees the same
      // room: the settled viewer's eye has moved, so a viewer that lands anywhere else shows.
      const pose = held(about.x(stillBeta + 10), 90);
      const reading = await sendReading(page, pose);
      await landOn(page, reading, 3000);
      const turned = [await viewerTurn(page)];
      await hideAndShow(page);
      // A visibility return alone holds the last frame; the next reading supplies the new posture.
      turned.push(await viewerTurn(page));
      const settledMs = await landOn(page, await sendReading(page, pose), 3000);
      turned.push(await viewerTurn(page));
      const settled = await capture(page, clip, testInfo, "turn-20-settled");
      // A settled viewer's glare is off the sticker, so a look from the settled pose shows it.
      const look = rotationOf(
        await glareReading(page, reading, 90, await stickerPoint(page, clip, LOOK_OFFSET)),
      );
      await landOn(page, await sendReading(page, look), 3000);
      const settledLook = await capture(page, clip, testInfo, "turn-21-settled-look");

      // A fresh session opened on its side, at the same pose, then the same look.
      const freshPage = await page.context().newPage();
      await freshPage.setViewportSize(sizeAt(device, 90));
      await presentAs(freshPage, device, 90);
      await freshPage.goto("/e2e/stickerLightSweeps.html");
      const freshClip = await stickerClip(freshPage);
      await landOn(freshPage, await sendReading(freshPage, pose), 5000, 1500);
      const fresh = await capture(freshPage, freshClip, testInfo, "turn-30-fresh-on-its-side");
      await landOn(freshPage, await sendReading(freshPage, look), 3000);
      const freshLook = await capture(freshPage, freshClip, testInfo, "turn-31-fresh-look");

      const levels = glareLevels(fresh, freshLook);
      const [heldSettled, heldFresh, lookSettled, lookFresh] = [
        settled,
        fresh,
        settledLook,
        freshLook,
      ].map((pixels) => measureGlare(pixels, levels));
      const glares: Glare[] = [];
      if (lookSettled.glare) glares.push({ at: "settled look", ...lookSettled.glare });
      if (lookFresh.glare) glares.push({ at: "fresh look", ...lookFresh.glare });
      await writeFile(
        testInfo.outputPath("turn.json"),
        JSON.stringify({ settledMs, turned, glares }, null, 1),
      );
      const detail = `${listPath(glares)}\nSettled after ${Math.round(settledMs)} ms; the viewer's turn each second: ${turned.map((t) => t.toFixed(1)).join(", ")}`;

      expect
        .soft(turned[1], `The reference changed before a fresh reading:\n${detail}`)
        .toBe(turned[0]);
      expect
        .soft(turned[turned.length - 1], `The viewer never lands:\n${detail}`)
        .toBeLessThan(0.01);
      expect(lookSettled.glare, `No glare in the look once settled:\n${detail}`).not.toBeNull();
      expect(lookFresh.glare, `No glare in the fresh session's look:\n${detail}`).not.toBeNull();
      const target = lookFresh.glare;
      if (!lookSettled.glare || !target) return;
      // A fresh resumed reference matches a newly opened page, held or looking.
      for (const [label, a, b] of [
        ["held", heldSettled, heldFresh],
        ["looking", lookSettled, lookFresh],
      ] as const)
        expect
          .soft(
            lumaDifference(a, b),
            `The settled frame, ${label}, differs from a fresh one:\n${detail}`,
          )
          .toBeLessThan(0.002);
      expect.soft(Math.abs(lookSettled.glare.x - target.x), detail).toBeLessThan(0.004);
      expect.soft(Math.abs(lookSettled.glare.y - target.y), detail).toBeLessThan(0.004);
    });
  });
