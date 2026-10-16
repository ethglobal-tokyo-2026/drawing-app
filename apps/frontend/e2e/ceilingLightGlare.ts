import { writeFile } from "node:fs/promises";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { about, compose, sendReading, type Reading, type Rotation } from "./deviceRotation";
import { decodeScreenshot, type ScreenshotPixels } from "./screenshotPixels";

// The light sweeps' black gloss sticker mirrors only the room, whose one source is the ceiling light:
// its glare is the largest region lit past halfway from the sticker's own level to the light's.

/** The least share of the sticker the ceiling light's glare must cover to be measured. */
const MIN_SHARE = 0.003;
/** Glare pixels this close, in CSS px, are one region. */
const JOIN_PX = 16;
/** How far back, as a share of the sticker, a step may go before it breaks a monotonic path. */
const STEP_SLACK = 0.01;
/** The glare's share of the sticker past which its centroid no longer tracks where it is. */
const FILLED = 0.7;
/** How many times the sticker's own level the light's reflection must reach to be told from the room's. */
const MIN_CONTRAST = 2;

export interface Glare {
  /** The swept angle, in degrees, or the frame's name. */
  at: number | string;
  /** The glare's share of the sticker's pixels. */
  share: number;
  /** The glare's centroid, as a share of the sticker's width and height from its top left. */
  x: number;
  y: number;
  /** Where the centroid lies around the sticker's center, in degrees clockwise on screen from up. */
  bearing: number;
}

export interface Frame {
  luma: Float32Array;
  glare: Omit<Glare, "at"> | null;
}

/**
 * Where the glare is measured: the whole sticker, or the largest circle about its middle. A turn about
 * the screen's normal carries the circle onto itself, so the glare inside it turns by exactly the turn,
 * where the sticker's edges clip a glare that runs past them differently at each turn.
 */
export type GlareArea = "sticker" | "circle";

/**
 * Display luma, 0 to 1: the sticker's own, with the glare off it, and the light's reflection, where
 * the glare is on it. Measured, so the light's radiance is the model's to set.
 */
export interface GlareLevels {
  sticker: number;
  light: number;
}

function lumaOf({ width, height, data }: ScreenshotPixels) {
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++)
    luma[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  return luma;
}

const percentile = (luma: Float32Array, p: number) =>
  Float32Array.from(luma).sort()[Math.min(luma.length - 1, Math.floor(p * luma.length))];

/** The levels from a frame with the glare off the sticker and one with it on. */
export function glareLevels(off: ScreenshotPixels, on: ScreenshotPixels): GlareLevels {
  const levels = { sticker: percentile(lumaOf(off), 0.5), light: percentile(lumaOf(on), 0.99) };
  expect(
    levels.light,
    `The light's reflection doesn't stand out from the sticker: ${JSON.stringify(levels)}`,
  ).toBeGreaterThan(MIN_CONTRAST * levels.sticker);
  return levels;
}

/** The ceiling light's glare in `area`: the largest glare region, with its centroid. */
export function measureGlare(
  pixels: ScreenshotPixels,
  levels: GlareLevels,
  area: GlareArea = "sticker",
): Frame {
  const { width, height } = pixels;
  const luma = lumaOf(pixels);
  const radius = Math.min(width, height) / 2;
  // Pixels are measured at their centers, so a turn about the sticker's middle maps the circle exactly.
  const lit = (x: number, y: number) =>
    luma[y * width + x] > (levels.sticker + levels.light) / 2 &&
    (area === "sticker" || Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) <= radius);
  const columns = Math.ceil(width / JOIN_PX);
  const rows = Math.ceil(height / JOIN_PX);
  const cellOf = (x: number, y: number) =>
    Math.floor(y / JOIN_PX) * columns + Math.floor(x / JOIN_PX);
  const litCells = new Uint8Array(columns * rows);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (lit(x, y)) litCells[cellOf(x, y)] = 1;
  // Cells holding glare, joined to their eight neighbors.
  const regionOf = new Int32Array(columns * rows).fill(-1);
  let regions = 0;
  for (let start = 0; start < litCells.length; start++) {
    if (!litCells[start] || regionOf[start] >= 0) continue;
    regionOf[start] = regions;
    const stack = [start];
    for (let cell = stack.pop(); cell !== undefined; cell = stack.pop()) {
      const cx = cell % columns;
      const cy = Math.floor(cell / columns);
      for (let ny = Math.max(0, cy - 1); ny <= Math.min(rows - 1, cy + 1); ny++)
        for (let nx = Math.max(0, cx - 1); nx <= Math.min(columns - 1, cx + 1); nx++) {
          const next = ny * columns + nx;
          if (litCells[next] && regionOf[next] < 0) {
            regionOf[next] = regions;
            stack.push(next);
          }
        }
    }
    regions++;
  }
  const stats = Array.from({ length: regions }, () => ({ count: 0, sumX: 0, sumY: 0 }));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const region = stats[regionOf[cellOf(x, y)]];
      if (!region || !lit(x, y)) continue;
      region.count++;
      region.sumX += x + 0.5;
      region.sumY += y + 0.5;
    }
  const largest = stats.reduce<(typeof stats)[number] | null>(
    (best, region) => (!best || region.count > best.count ? region : best),
    null,
  );
  if (!largest || largest.count < MIN_SHARE * width * height) return { luma, glare: null };
  const x = largest.sumX / largest.count;
  const y = largest.sumY / largest.count;
  return {
    luma,
    glare: {
      share: largest.count / (width * height),
      x: x / width,
      y: y / height,
      bearing: Math.atan2(x - width / 2, height / 2 - y) * (180 / Math.PI),
    },
  };
}

/** The mean difference in luma between two frames of one size. */
export function lumaDifference(a: Frame, b: Frame) {
  let difference = 0;
  for (let i = 0; i < a.luma.length; i++) difference += Math.abs(a.luma[i] - b.luma[i]);
  return difference / a.luma.length;
}

/**
 * Waits for the light to land exactly on `reading`, as it does once a reading is held, then for the
 * material to draw it. With `quietMs`, the pose must also hold that long, which outlasts a
 * re-centering viewer's spaced steps.
 */
export async function landOn(page: Page, reading: Reading, deadlineMs: number, quietMs = 0) {
  const landed = await page.evaluate(
    async ({ reading, deadlineMs, quietMs }) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const start = performance.now();
      let previous = "";
      let changed = start;
      let landed = false;
      while (!landed && performance.now() < start + deadlineMs) {
        await frame();
        const pose = window.lightSweepsFixture.getPose();
        const next = JSON.stringify(pose);
        if (next !== previous) changed = performance.now();
        previous = next;
        // A landed light publishes the reading's own angles, where a gliding one publishes its own.
        landed =
          pose.beta === reading.beta &&
          pose.gamma === reading.gamma &&
          performance.now() - changed >= quietMs;
      }
      await frame();
      await frame();
      return { landed, settledMs: changed - start };
    },
    { reading, deadlineMs, quietMs },
  );
  expect(
    landed.landed,
    `The light never lands on ${JSON.stringify(reading)}${quietMs ? ` and holds there ${quietMs} ms` : ""}`,
  ).toBe(true);
  return landed.settledMs;
}

/** The device's rotation for a reading: R = Rz(α)·Rx(β)·Ry(γ). */
export const rotationOf = ({ alpha, beta, gamma }: Reading): Rotation =>
  compose(about.z(alpha), about.x(beta), about.y(gamma));

/** The still pose's beta for the page's own device class. */
export const stillBetaOf = (page: Page) =>
  page.evaluate(() => window.lightSweepsFixture.stillPose.beta);

/**
 * A point `offset` from the sticker's middle, as shares of its size, in CSS px from the visual
 * viewport's center: where glareReading puts the glare.
 */
export const stickerPoint = (
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  offset = { x: 0, y: 0 },
) =>
  page.evaluate(
    ({ clip, offset }) => {
      const viewport = window.visualViewport;
      if (!viewport) throw new Error("No visual viewport to aim the glare in");
      return {
        x: clip.x + clip.width * (0.5 + offset.x) - viewport.width / 2,
        y: clip.y + clip.height * (0.5 + offset.y) - viewport.height / 2,
      };
    },
    { clip, offset },
  );

/** Fails if the viewer has moved off `rest`, as it does once a pose lasts past a re-centering hold. */
async function expectViewerOn(page: Page, rest: Reading, last: Reading) {
  const off = await page.evaluate(
    async ({ rest, last }) => {
      const { angleBetween, attitudeOf, IDENTITY, inverse, multiply } =
        await import("../src/stickers/lightMode.ts");
      const turn = multiply(
        inverse(attitudeOf(last.alpha, last.beta, last.gamma)),
        attitudeOf(rest.alpha, rest.beta, rest.gamma),
      );
      return angleBetween(window.lightSweepsFixture.getPose().turn ?? IDENTITY, turn);
    },
    { rest, last },
  );
  expect(off, "The viewer re-centered: the poses outlasted its hold").toBeLessThan(0.01);
}

/** The viewer's turn from the device, in degrees: none once it is centered on the device. */
export const viewerTurn = (page: Page) =>
  page.evaluate(async () => {
    const { angleBetween, IDENTITY } = await import("../src/stickers/lightMode.ts");
    return angleBetween(window.lightSweepsFixture.getPose().turn ?? IDENTITY, IDENTITY);
  });

/** One screenshot of the sticker, kept beside the run's other frames. */
export async function capture(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  testInfo: TestInfo,
  name: string,
) {
  const png = await page.screenshot({ clip, scale: "css" });
  await writeFile(testInfo.outputPath(`${name}.png`), png);
  return decodeScreenshot(png);
}

/**
 * Lands on each pose in turn, capturing it promptly, with the viewer centered on `rest`, then lands
 * back on `rest`: inside every re-centering release, so the next excursion starts its holds afresh.
 * The frames are measured afterwards, since a hold counts while they are.
 */
export async function sweep(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  testInfo: TestInfo,
  name: string,
  poses: { at: number; rotation: Rotation }[],
  rest: Reading,
) {
  const shots: { at: number; png: Buffer }[] = [];
  let last = rest;
  for (const [i, { at, rotation }] of poses.entries()) {
    last = await sendReading(page, rotation);
    await landOn(page, last, 3000);
    const png = await page.screenshot({ clip, scale: "css" });
    await writeFile(testInfo.outputPath(`${name}-${String(i).padStart(2, "0")}-${at}.png`), png);
    shots.push({ at, png });
  }
  await expectViewerOn(page, rest, last);
  await landOn(page, await sendReading(page, rotationOf(rest)), 3000);
  return Promise.all(
    shots.map(async ({ at, png }) => ({ at, pixels: await decodeScreenshot(png) })),
  );
}

/** A sweep's glare path, written beside its frames so a run's paths can be compared with another's. */
export async function glarePath(
  testInfo: TestInfo,
  name: string,
  frames: { at: number; pixels: ScreenshotPixels }[],
  levels: GlareLevels,
  area: GlareArea = "sticker",
) {
  const path = frames.map(({ at, pixels }): Glare | null => {
    const { glare } = measureGlare(pixels, levels, area);
    return glare && { at, ...glare };
  });
  await writeFile(testInfo.outputPath(`${name}.json`), JSON.stringify(path, null, 1));
  return path.filter((glare): glare is Glare => glare !== null);
}

/** A sweep's steps, evenly from `from` to `to`. */
export const steps = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

const describeGlare = (g: Glare) =>
  `${g.at}: (${g.x.toFixed(3)}, ${g.y.toFixed(3)}) bearing ${g.bearing.toFixed(1)}° share ${g.share.toFixed(3)}`;
export const listPath = (path: Glare[]) => path.map(describeGlare).join("\n");

/**
 * The poses where most of the glare is on the sticker. A sliver clipped by the sticker's edge has
 * its centroid wherever the tilted edge crosses first.
 */
const wholeGlare = (path: Glare[]) =>
  path.filter((glare) => glare.share >= 0.5 * Math.max(...path.map((other) => other.share)));

/**
 * The glare travels one way along `along` as the sweep goes, with little drift across it: each step
 * where it is whole goes `direction`'s way, never back by more than STEP_SLACK.
 */
export function expectTravel(path: Glare[], along: "x" | "y", direction: 1 | -1, label: string) {
  const across = along === "x" ? "y" : "x";
  const detail = `${label}\n${listPath(path)}`;
  expect.soft(path.length, `The glare shows at too few poses: ${detail}`).toBeGreaterThanOrEqual(4);
  if (path.length < 2) return;
  const whole = wholeGlare(path);
  // A glare that fills most of the sticker has its centroid pinned near the middle, so those steps
  // say nothing about its travel.
  const backSteps = whole
    .slice(1)
    .filter(
      (glare, i) =>
        Math.max(glare.share, whole[i].share) < FILLED &&
        (glare[along] - whole[i][along]) * direction < -STEP_SLACK,
    );
  expect.soft(backSteps, `The glare turns back along ${along}: ${detail}`).toEqual([]);
  // From where it enters to where it leaves, which holds where the glare outgrows the sticker and
  // every whole step is filled.
  const travel = (path[path.length - 1][along] - path[0][along]) * direction;
  const drift =
    Math.max(...whole.map((glare) => glare[across])) -
    Math.min(...whole.map((glare) => glare[across]));
  expect
    .soft(travel, `The glare doesn't travel ${direction > 0 ? "+" : "−"}${along}: ${detail}`)
    .toBeGreaterThan(0.15);
  expect
    .soft(drift, `The glare drifts along ${across}: ${detail}`)
    .toBeLessThan(0.25 * Math.abs(travel));
}

/**
 * A turn about the screen's vertical axis carries the eye and the light around it together, which
 * slides the glare sideways, its height changing only as much as the light hangs off to one side; a
 * room that rolled with the tilt would swing it up or down as it goes.
 */
export function expectHeldHeight(path: Glare[], label: string) {
  const whole = wholeGlare(path);
  const range = (axis: "x" | "y") =>
    Math.max(...whole.map((glare) => glare[axis])) - Math.min(...whole.map((glare) => glare[axis]));
  expect
    .soft(
      range("y"),
      `The glare's height wanders as the device tilts sideways: ${label}\n${listPath(path)}`,
    )
    .toBeLessThan(0.1 * range("x"));
}

/** Bearings differ by this much, in degrees, the short way round. */
export const bearingTurn = (from: number, to: number) =>
  ((((to - from + 180) % 360) + 360) % 360) - 180;
