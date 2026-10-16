import { expect, test, type Locator, type Page, type JSHandle } from "@playwright/test";
import type { DevicePose } from "../src/stickers/lightMode";
import type { Reading } from "./deviceRotation.ts";
import { glareReading, type ScreenPoint } from "./glarePose.ts";

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
    // WebKit can report a turned screen for a portrait page; every reading here means portrait.
    // Pinned on the prototype, so the renderer can still listen for orientation changes.
    if (typeof ScreenOrientation === "function")
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        get: () => 0,
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

/**
 * The least step, in display levels, across the ceiling light's edge on white paper, from inside its
 * glare to outside it in one pose. Near white the glare's lift rolls off into the highlight shoulder.
 */
const EDGE_SPAN = 10;

/** The page's own still pose: an iPad holds a tablet's, where this runner, with no screen, holds a phone's. */
const pageStillPose = (page: Page) =>
  page.evaluate(async () => (await import("../src/stickers/lightMode.ts")).STILL_POSE);

/** A sticker's box on screen: its middle in CSS px from the visual viewport's center, y down, and its size. */
const onScreen = (sticker: Locator) =>
  sticker.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const viewport = visualViewport;
    if (!viewport) throw new Error("The visual viewport is missing");
    return {
      x: (box.left + box.right) / 2 - (viewport.offsetLeft + viewport.width / 2),
      y: (box.top + box.bottom) / 2 - (viewport.offsetTop + viewport.height / 2),
      width: box.width,
      height: box.height,
    };
  });

/** White paper's display level, 0 to 255, under the light as shown: the coat's paper white, as the room's light follows it. */
const paperWhiteLevel = (page: Page) =>
  page.evaluate(async () => {
    const { COAT } = await import("../src/stickers/coat.ts");
    const { paperLight } = await import("../src/stickers/paperLight.ts");
    const { roomFrame } = await import("../src/stickers/sharedRoom.ts");
    const linear = COAT.paperWhite * paperLight(roomFrame(window.laminateFixture.getPose()));
    return 255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055);
  });

/** Where the glare's edge crosses the paper: neutral, near paper white, and lit over only part of the cut. */
async function readablePaper(snapshot: PaperSnapshot, paperWhite: number) {
  const { min, max, missingCoverage, tinted, brightFraction } = await snapshot.evaluate(
    async (pixels) => {
      const { paperReadability } = await import("./paperSnapshot.ts");
      return paperReadability(pixels);
    },
  );
  expect(missingCoverage, "Opaque paper must retain complete coverage").toBe(0);
  expect(tinted, "Clear laminate should reflect neutral light on white paper").toBe(0);
  expect(min, "The clear film should preserve near-white paper").toBeGreaterThanOrEqual(
    Math.round(paperWhite) - 1,
  );
  expect(
    max - min,
    "White paper must reveal a distinct reflected source edge",
  ).toBeGreaterThanOrEqual(EDGE_SPAN);
  expect(
    brightFraction,
    "The source should occupy a localized part of the cut",
  ).toBeGreaterThanOrEqual(0.1);
  expect(
    brightFraction,
    "The source must leave a visible surrounding paper region",
  ).toBeLessThanOrEqual(0.45);
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

/** Where ink is read: the fixture print's solid black patch, x 35–80 and y 190–210 of its 240 px. */
const INK = { x: 58 / 240, y: 200 / 240 };

/** The ink patch's middle on screen, in CSS px from the visual viewport's center, y down. */
const inkOnScreen = (print: Locator): Promise<ScreenPoint> =>
  print.evaluate((element, ink) => {
    const box = element.getBoundingClientRect();
    const viewport = visualViewport;
    if (!viewport) throw new Error("The visual viewport is missing");
    return {
      x: box.left + box.width * ink.x - (viewport.offsetLeft + viewport.width / 2),
      y: box.top + box.height * ink.y - (viewport.offsetTop + viewport.height / 2),
    };
  }, INK);

/**
 * In the page, so the room is its own device class's: the ceiling light as flat gloss mirrors it at
 * `at` on screen, in each pose, as roomShader draws it. Its body, through the rim's blur, and the
 * veil there, each a share of the light's radiance.
 */
const glossLightAt = (page: Page, poses: DevicePose[], at: ScreenPoint) =>
  page.evaluate(
    async ({ poses, at }) => {
      const { ROOM, roomFrame } = await import("../src/stickers/sharedRoom.ts");
      const { discProfile } = await import("../src/stickers/foilMaterial.ts");
      const { RIM_BLUR_SHARE, VEIL } = await import("../src/stickers/roomShader.ts");
      const { GLOSS_ROUGHNESS } = await import("../src/stickers/stickerRendererGpu.ts");
      const { light } = ROOM;
      const blur = Math.hypot(light.feather, RIM_BLUR_SHARE * GLOSS_ROUGHNESS);
      const dot = (a: readonly number[], b: readonly number[]) =>
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      return poses.map((pose) => {
        const frame = roomFrame(pose);
        // The eye's ray to `at`, mirrored by the flat screen, then placed on the light's plane.
        const ray = [at.x - frame.eye[0], at.y - frame.eye[1], frame.eye[2]];
        const along = dot(ray, frame.light);
        if (along <= 0) return { body: 0, veil: 0 };
        const q = Math.hypot(
          dot(ray, frame.across) / along,
          dot(ray, frame.down) / along / light.aspect,
        );
        const outside = Math.max(Math.atan(q) - Math.atan(light.radius), 0);
        return {
          body: discProfile(q, { ...light, feather: blur }),
          veil: VEIL.level / (outside + VEIL.offset),
        };
      });
    },
    { poses, at },
  );

/**
 * The most, in degrees, any step's reference moved from the session's initial `rest`.
 */
const viewerOffRest = (
  page: Page,
  rest: Reading,
  steps: { reading: Reading; pose: DevicePose }[],
) =>
  page.evaluate(
    async ({ rest, steps }) => {
      const { angleBetween, attitudeOf, IDENTITY, inverse, multiply } =
        await import("../src/stickers/lightMode.ts");
      const centered = attitudeOf(rest.alpha, rest.beta, rest.gamma);
      return Math.max(
        ...steps.map(({ reading, pose }) =>
          angleBetween(
            pose.turn ?? IDENTITY,
            multiply(inverse(attitudeOf(reading.alpha, reading.beta, reading.gamma)), centered),
          ),
        ),
      );
    },
    { rest, steps },
  );

async function inkContrast(paper: Locator, print: Locator) {
  const read = async (canvas: Locator) =>
    canvas.evaluate((element, ink) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The laminate canvas is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The laminate snapshot context is unavailable");
      const x = Math.floor(element.width * ink.x),
        y = Math.floor(element.height * ink.y);
      return [...context.getImageData(x - 2, y - 2, 5, 5).data];
    }, INK);
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

/**
 * Holds the device at `beta`, `gamma` until the light lands there and the material has drawn it;
 * returns the pose it landed on.
 */
function holdPose(page: Page, beta: number, gamma: number) {
  return page.evaluate(
    async ([beta, gamma]) => {
      const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      window.laminateFixture.tilt(beta, gamma);
      const deadline = performance.now() + 5000;
      for (;;) {
        await frame();
        const pose = window.laminateFixture.getPose();
        if (pose.beta === beta && pose.gamma === gamma) break;
        if (performance.now() > deadline)
          throw new Error(`The light never landed at beta ${beta}, gamma ${gamma}`);
      }
      await frame();
      await frame();
      return window.laminateFixture.getPose();
    },
    [beta, gamma] as const,
  );
}

/** The reflection's step across the paper's interior, and how much of it the bright side covers. */
const reflectionOn = (paper: Locator) =>
  paper.evaluate(async (element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("The paper canvas is missing");
    const context = element.getContext("2d");
    if (!context) throw new Error("The paper snapshot context is unavailable");
    const pixels = context.getImageData(
      Math.floor(element.width * 0.05),
      Math.floor(element.height * 0.05),
      Math.floor(element.width * 0.9),
      Math.floor(element.height * 0.9),
    ).data;
    const { paperReadability } = await import("./paperSnapshot.ts");
    const { span, brightFraction } = paperReadability(pixels);
    return { span, brightFraction };
  });

test("the first iPad sensor reading glides the laminate to the device's pose, and the ceiling light's glare reads on white paper", async ({
  page,
}) => {
  // White paper alone at the top, wide enough to hold the ceiling light's soft edge.
  await page.goto("/e2e/stickerLaminate.html?count=0&side=600");
  const paper = page.locator("[data-white] canvas.sticker-material");
  await expect(paper).toHaveAttribute("data-state", "ready");
  const still = await settledPaper(page, paper);
  const stillPose = await pageStillPose(page);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(stillPose);

  // The first reading, a little past the still pose. The viewer centers on it, and a small tilt from
  // it carries the glare across the paper while the session keeps its reference.
  const rest: Reading = { alpha: 0, beta: stillPose.beta + 5, gamma: 0 };
  // The first pose the light writes after the reading, which lies on its way rather than at it.
  const first = await page.evaluate(
    async ({ stillBeta, beta }) => {
      window.laminateFixture.tilt(beta, 0);
      for (let frame = 0; frame < 60; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const pose = window.laminateFixture.getPose();
        if (pose.beta !== stillBeta) return pose;
      }
      throw new Error("The light never left the still pose after a reading");
    },
    { stillBeta: stillPose.beta, beta: rest.beta },
  );
  expect(first.beta, "The first reading glides rather than jumping").toBeGreaterThan(
    stillPose.beta,
  );
  expect(first.beta, "The first reading glides rather than jumping").toBeLessThan(rest.beta);
  await settledPaper(page, paper);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toMatchObject({
    beta: rest.beta,
    gamma: 0,
    screenAngle: 0,
  });

  // One eye sees the ceiling light at one place on screen: carry the glare's middle in from beyond
  // the paper's left edge, the light's side, until its edge crosses this paper, which is wide enough
  // to hold the soft edge from inside the glare to outside it in one pose, so the paper's own light,
  // which changes with tilt, can't stand in for the glare.
  const box = await onScreen(page.locator("[data-white]"));
  let crossing: Reading | null = null;
  const seen: string[] = [];
  for (let offset = box.width; offset >= 0 && !crossing; offset -= box.width / 12) {
    const reading = await glareReading(page, rest, 0, { x: box.x - offset, y: box.y });
    await holdPose(page, reading.beta, reading.gamma);
    const { span, brightFraction } = await reflectionOn(paper);
    seen.push(`${offset.toFixed(0)} px left: span ${span}, bright ${brightFraction.toFixed(3)}`);
    if (span >= EDGE_SPAN && brightFraction >= 0.1 && brightFraction <= 0.45) crossing = reading;
  }
  expect(
    crossing,
    `Some tilt must carry the glare's edge across the paper:\n${seen.join("\n")}`,
  ).not.toBeNull();
  const crossed = await settledPaper(page, paper);
  expect(
    (await paperChange(still, crossed)).mean,
    "The device's real pose moves the reflection from the still pose's",
  ).toBeGreaterThanOrEqual(1.5);
  await readablePaper(crossed, await paperWhiteLevel(page));
});

test("a tilt sweep carries the ceiling light's reflection across full-cut gloss while preserving the ink", async ({
  page,
}, info) => {
  await page.goto("/e2e/stickerLaminate.html");
  const paper = page.locator("[data-white] canvas.sticker-material");
  const print = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(paper).toHaveAttribute("data-state", "ready");
  await expect(print).toHaveAttribute("data-state", "ready");
  // The first reading is the still pose, so the viewer centers there.
  const { beta, gamma } = await pageStillPose(page);
  const rest: Reading = { alpha: 0, beta, gamma };
  await holdPose(page, beta, gamma);

  // Tilts that carry the glare's middle down past the white paper's right edge, away from the print
  // beside it, in steps of half the paper: its body crosses the whole paper and leaves it. Each step
  // lands and keeps what it shows, and the steps are measured once the sweep is done.
  const box = await onScreen(page.locator("[data-white]"));
  const aims: { y: number; reading: Reading }[] = [];
  for (let step = -6; step <= 6; step++) {
    const y = (step * box.height) / 2;
    aims.push({
      y,
      reading: await glareReading(page, rest, 0, { x: box.x + box.width / 2, y: box.y + y }),
    });
  }
  const steps: { y: number; pose: DevicePose; pixels: PaperSnapshot; contrast: number }[] = [];
  for (const { y, reading } of aims)
    steps.push({
      y,
      pose: await holdPose(page, reading.beta, reading.gamma),
      pixels: await paperPixels(paper),
      contrast: await inkContrast(paper, print),
    });
  expect(
    await viewerOffRest(
      page,
      rest,
      aims.map(({ reading }, i) => ({ reading, pose: steps[i].pose })),
    ),
    "The visible session's reference changed during the sweep",
  ).toBeLessThan(0.01);

  // The ink is outside the light where the light's blurred edge has fallen below its veil: from
  // there out, only the veil and the room's bounce reach it, and it stays readable. Nearer, the edge
  // of a light at its physical brightness, several times paper white, washes black ink.
  const light = await glossLightAt(
    page,
    steps.map(({ pose }) => pose),
    await inkOnScreen(print),
  );
  const outside = steps.filter((_, i) => light[i].body <= light[i].veil);
  expect(outside.length, "Some tilt must leave the ink outside the light").toBeGreaterThan(0);
  for (const { y, contrast } of outside)
    expect(
      contrast,
      `glare ${y} px from the paper's middle, the ink outside the light: ink should remain distinct`,
    ).toBeGreaterThanOrEqual(5);

  const spans: number[] = [];
  let moved = 0;
  for (const [i, { pixels }] of steps.entries()) {
    spans.push(
      await pixels.evaluate(
        async (pixels) => (await import("./paperSnapshot.ts")).paperReadability(pixels).span,
      ),
    );
    if (!i) continue;
    const change = await paperChange(steps[i - 1].pixels, pixels);
    if (change.mean >= 1.5 && change.visibleFraction >= 0.25) moved++;
  }
  await info.attach("reflection-spans", {
    body: JSON.stringify(spans),
    contentType: "application/json",
  });
  expect(Math.max(...spans), "Some tilt must put the reflection on the sticker").toBeGreaterThan(1);
  expect(
    Math.min(...spans),
    "Away from the reflection, the paper must show none of it",
  ).toBeLessThanOrEqual(1);
  expect(
    moved,
    "A tilt step must move the reflection across blank paper, beyond an isolated glint",
  ).toBeGreaterThan(0);
});
