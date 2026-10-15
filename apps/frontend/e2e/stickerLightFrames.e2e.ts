import { expect, test } from "@playwright/test";

/** Read complete pixels outside the source frame, where only backing foil can appear. */
async function materialPixels(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-sticker="0"] canvas.sticker-material');
    const paper = document.querySelector("[data-white] canvas.sticker-material");
    if (!(canvas instanceof HTMLCanvasElement) || !(paper instanceof HTMLCanvasElement))
      throw new Error("The complete foil and white-paper materials are missing");
    const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) throw new Error("The complete foil pixels are unavailable");
    let foil = "";
    let count = 0;
    for (let x = 0; x < canvas.width; x++) {
      const i = x * 4;
      if (pixels[i + 3]) {
        foil += `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]};`;
        count++;
      }
    }
    return { foil, count, paper: paper.toDataURL(), pose: window.laminateFixture.getPose() };
  });
}

async function heldPose(
  page: import("@playwright/test").Page,
  angle: number,
  beta: number,
  gamma: number,
  alpha: number,
) {
  await page.evaluate(
    ({ angle, beta, gamma, alpha }) => {
      // Pinned on the prototype, so the renderer can still listen for orientation changes.
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        configurable: true,
        get: () => angle,
      });
      window.laminateFixture.tilt(beta, gamma, alpha);
    },
    { angle, beta, gamma, alpha },
  );
  // A landed light publishes the reading's own angles, where a gliding one publishes its own.
  await page.evaluate(
    async ({ beta, gamma }) => {
      let previous = "";
      let still = 0;
      let landed = false;
      const deadline = performance.now() + 5000;
      while (!landed || still < 5) {
        if (performance.now() > deadline)
          throw new Error("The shared material light did not land on the reading");
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const pose = window.laminateFixture.getPose();
        const next = JSON.stringify(pose);
        still = next === previous ? still + 1 : 0;
        previous = next;
        landed = pose.beta === beta && pose.gamma === gamma;
      }
    },
    { beta, gamma },
  );
  return materialPixels(page);
}

test("sticker detail restores identical laminate and foil after screen orientation round trips", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerLaminate.html?count=1&side=360&foil=1");
  await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(4);
  await heldPose(page, 0, 40, 0, 123);
  const first = await heldPose(page, 0, 42, 3, 124);
  expect(first.count).toBeGreaterThan(0);
  const turned = await heldPose(page, 90, 42, 3, 124);
  expect(turned.pose).not.toEqual(first.pose);
  expect(turned.paper).not.toBe(first.paper);
  expect(turned.foil).not.toBe(first.foil);
  expect(await heldPose(page, 0, 42, 3, 124)).toEqual(first);
  // Inside the viewer's re-centering dead zone, so the same reading gives the same light.
  for (let repeat = 0; repeat < 3; repeat++) {
    await heldPose(page, 90, 46, 10, 128);
    await heldPose(page, 90, 36, -9, 120);
    expect(await heldPose(page, 0, 42, 3, 124)).toEqual(first);
  }
});

test("foil and laminate follow the same displayed pose throughout a diagonal wrist movement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerLaminate.html?count=1&side=300&foil=1");
  await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(4);
  await heldPose(page, 0, 40, 0, 123);
  let previous = await materialPixels(page);
  let foilChanged = 0;
  let paperChanged = 0;
  for (let frame = 0; frame < 30; frame++) {
    const phase = (frame / 30) * Math.PI * 2;
    await page.evaluate(
      ({ phase }) =>
        window.laminateFixture.tilt(
          40 + 5 * Math.sin(phase),
          5 * Math.cos(phase),
          123 + 3 * Math.sin(phase),
        ),
      { phase },
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const next = await materialPixels(page);
    if (next.foil !== previous.foil) foilChanged++;
    if (next.paper !== previous.paper) paperChanged++;
    previous = next;
  }
  expect(foilChanged).toBeGreaterThan(0);
  expect(paperChanged).toBeGreaterThan(0);
  const held = await heldPose(page, 0, 42, 3, 124);
  expect(await heldPose(page, 0, 42, 3, 124)).toEqual(held);
});
