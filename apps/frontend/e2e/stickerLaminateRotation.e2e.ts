import { expect, test, type Locator, type Page } from "@playwright/test";
import { ipad } from "./ipad.ts";
import { about, compose, sendReading } from "./deviceRotation.ts";

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

/** The screen turned to `angle`, as a browser reports it, and tilt delivered without asking. */
async function holdScreen(page: Page, angle: number) {
  await page.addInitScript((screenAngle) => {
    // The synthetic orientation fixture must not mix its readings with a host sensor stream.
    window.addEventListener(
      "deviceorientation",
      (event) => {
        if (event.isTrusted) event.stopImmediatePropagation();
      },
      { capture: true },
    );
    // Pinned on the prototype, so the screen's orientation stays the event target the renderer
    // listens to for turns.
    if (typeof ScreenOrientation === "function")
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        get: () => screenAngle,
        configurable: true,
      });
    Object.defineProperty(window, "orientation", { value: screenAngle, configurable: true });
    if (typeof window.DeviceMotionEvent === "function")
      Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
        value: undefined,
        configurable: true,
      });
  }, angle);
}

/** Delivers one reading and waits until the light has landed on it and the stickers have redrawn. */
async function tiltTo(page: Page, beta: number, gamma: number, alpha: number) {
  await page.evaluate(([b, g, a]) => window.laminateFixture.tilt(b, g, a), [beta, gamma, alpha]);
  await expect
    .poll(() => page.evaluate(() => window.laminateFixture.getPose()))
    .toMatchObject({ beta, gamma });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/** Waits until the light has landed on the last reading, and the stickers have drawn it. */
async function landed(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const before = JSON.stringify(window.laminateFixture.getPose());
        for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
        return JSON.stringify(window.laminateFixture.getPose()) === before;
      }),
    )
    .toBe(true);
}

test("turning a flat iPad about gravity turns the room on screen, then holds with no unattended wave", async ({
  page,
}) => {
  await holdScreen(page, 0);
  await page.goto("/e2e/stickerLaminate.html?foil=1&side=240");
  const paper = page.locator("[data-white] canvas.sticker-material");
  const foil = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(paper).toHaveAttribute("data-state", "ready");
  await expect(foil).toHaveAttribute("data-state", "ready");
  await tiltTo(page, 0, 0, 123);
  const foilBefore = await snapshot(foil);
  // Only the compass heading changes, a turn about the screen's normal: the room holds still in
  // the world while the iPad turns under it.
  await page.evaluate(() => window.laminateFixture.tilt(0, 0, 133));
  await landed(page);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toMatchObject({
    beta: 0,
    gamma: 0,
    screenAngle: 0,
  });
  await expect.poll(() => snapshot(foil)).not.toBe(foilBefore);
  const held = { paper: await snapshot(paper), foil: await snapshot(foil) };
  await page.waitForTimeout(1000);
  expect({ paper: await snapshot(paper), foil: await snapshot(foil) }).toEqual(held);
});

/**
 * Delivers the reading a device turned to `screenAngle` reports when its displayed screen is held
 * `held` degrees up from flat and rolled `roll` degrees about the displayed vertical. The whole
 * attitude, heading included: on its side, a roll about the displayed vertical turns the device's
 * alpha too, and the room holds still in the world, so a reading that kept alpha would also turn it.
 */
async function holdDisplayed(page: Page, screenAngle: number, held: number, roll: number) {
  await sendReading(
    page,
    compose(about.z(123), about.x(held), about.y(roll), about.z(screenAngle)),
  );
  await landed(page);
}

/**
 * The shoji's side edge nearer the screen's middle, from the room at the landed pose: where it
 * mirrors on screen, in CSS px from the viewport's center (y down, at the shoji's middle), and how
 * far a degree of roll about the displayed vertical carries it. A direction d mirrors for the eye e
 * at e.xy + e.z·d.xy / d.z, and a roll turns the eye and the room together, since both stay put.
 */
const shojiEdge = (page: Page) =>
  page.evaluate(async () => {
    const { roomFrame, ROOM } = await import("../src/stickers/sharedRoom.ts");
    const frame = roomFrame(window.laminateFixture.getPose());
    type Vector = readonly number[];
    const mirror = (eye: Vector, d: Vector) => [
      eye[0] + (eye[2] * d[0]) / d[2],
      eye[1] + (eye[2] * d[1]) / d[2],
    ];
    const a = Math.PI / 180;
    const roll = (v: Vector) => [
      v[0] * Math.cos(a) + v[2] * Math.sin(a),
      v[1],
      -v[0] * Math.sin(a) + v[2] * Math.cos(a),
    ];
    const [edge] = [-1, 1]
      .map((side) => frame.light.map((l, i) => l + side * ROOM.shoji.halfWidth * frame.across[i]))
      .toSorted((p, q) => Math.abs(mirror(frame.eye, p)[0]) - Math.abs(mirror(frame.eye, q)[0]));
    const [x] = mirror(frame.eye, edge);
    return {
      x,
      y: mirror(frame.eye, frame.light)[1],
      perDegree: Math.abs(mirror(roll(frame.eye), roll(edge))[0] - x),
    };
  });

for (const [name, angle, held] of [
  ["portrait", 0, 45],
  ["landscape clockwise", 90, 45],
  ["landscape counterclockwise", -90, 45],
] as const) {
  test(`mixed wrist rotations move laminate with foil: ${name}`, async ({ page }) => {
    await holdScreen(page, angle);
    await page.goto("/e2e/stickerLaminate.html?foil=1&side=240");
    expect(await page.evaluate(() => window.screen.orientation.angle)).toBe(angle);
    const paper = page.locator("[data-white] canvas.sticker-material");
    const foil = page.locator('[data-sticker="0"] .sticker-material');
    await expect(paper).toHaveAttribute("data-state", "ready");
    // The same pose of the displayed screen in every turn. Inside the shoji's glare white paper
    // clips evenly, so the paper straddles the glare's side edge, where the room puts it.
    await holdDisplayed(page, angle, held, 0);
    const edge = await shojiEdge(page);
    const view = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    const side = 240;
    const top = Math.min(Math.max(view.height / 2 + edge.y - side / 2, 0), view.height - side);
    await page.addStyleTag({
      content: `[data-white]{position:fixed!important;left:${view.width / 2 + edge.x - side / 2}px;top:${top}px}`,
    });
    // A step away and back redraws the paper where it now sits.
    await holdDisplayed(page, angle, held + 1, 0);
    await holdDisplayed(page, angle, held, 0);
    const neutral = await reflection(paper);
    const foilNeutral = await snapshot(foil);
    // A roll that carries the edge a third of the way across the paper.
    const roll = side / 3 / edge.perDegree;
    for (const sign of [-1, 1]) {
      // A wrist turn delivers coupled beta and gamma changes, not independent Euler sliders.
      await holdDisplayed(page, angle, held + (roll / 3) * sign, roll * sign);
      const after = await reflection(paper);
      await expect.poll(() => snapshot(foil)).not.toBe(foilNeutral);
      // With the eye and room still, rolling the displayed right edge away carries the glare toward
      // the left edge, which comes toward the eye, whichever way the screen is turned.
      expect(
        (neutral.x - after.x) * sign,
        "The laminate must travel with the foil under the same reading",
      ).toBeGreaterThan(0.05);
    }
  });
}
