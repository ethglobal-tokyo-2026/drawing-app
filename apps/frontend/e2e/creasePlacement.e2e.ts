import { expect } from "@playwright/test";
import { signIn, sealFromBoard, signedInUserId, test } from "./helpers";
import { hand, FINGERTIP } from "./pen";
import { ipad } from "./ipad";

test.use({ ...ipad, viewport: { width: 1032, height: 1376 } });

interface PlacementFrame {
  time: number;
  surfaces: {
    id: string | undefined;
    classes: string;
    paint: { reveal: boolean; opacity: string; progress: string }[];
    laminate: { reveal: boolean; progress: string }[];
  }[];
}

declare global {
  interface Window {
    placementFrames: PlacementFrame[];
  }
}

test("setting an overlapping sticker down sweeps its crease on the actual board", async ({
  page,
}, info) => {
  await signIn(page, "crease-placement", "en");
  await sealFromBoard(page, "en");
  await sealFromBoard(page, "en");
  const ids = await page.locator(".placed-sticker").evaluateAll((stickers) =>
    stickers.map((sticker) => {
      const id = sticker.getAttribute("data-sticker-id");
      if (!id) throw new Error("The placed sticker has no ID");
      return id;
    }),
  );
  expect(ids).toHaveLength(2);
  const headers = { "x-croquis-user-id": await signedInUserId(page) };
  for (const [z, id] of ids.entries()) {
    const placement = {
      onBoard: true,
      x: 0.45 + z * 0.06,
      y: 0.4 + z * 0.06,
      scale: 0.7,
      rotation: 0,
      z,
    };
    const response = await page.request.patch(`/api/sticker-boards/me/sticker-placements/${id}`, {
      headers,
      data: { placement, largePlacement: placement },
    });
    expect(response.status(), await response.text()).toBe(200);
  }
  await page.reload();
  await expect(
    page.locator(".placed-sticker canvas.sticker-laminate[data-state=ready]"),
  ).toHaveCount(2);
  await expect(page.locator(".sticker-crease")).toHaveCount(1);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const frames: PlacementFrame[] = [];
    window.placementFrames = frames;
    const started = performance.now();
    const record = () => {
      frames.push({
        time: performance.now() - started,
        surfaces: [...document.querySelectorAll<HTMLElement>(".placed-sticker")].map((sticker) => ({
          id: sticker.dataset.stickerId,
          classes: sticker.className,
          paint: [...sticker.querySelectorAll<HTMLElement>(".sticker-crease-reveal")].map(
            (paint) => ({
              reveal: paint.hasAttribute("data-crease-reveal"),
              opacity: getComputedStyle(paint).opacity,
              progress: paint.style.getPropertyValue("--crease-reveal"),
            }),
          ),
          laminate: [...sticker.querySelectorAll<HTMLElement>(".sticker-laminate-surface")].map(
            (coat) => ({
              reveal: coat.hasAttribute("data-crease-reveal"),
              progress: coat.style.getPropertyValue("--crease-reveal"),
            }),
          ),
        })),
      });
      if (performance.now() - started < 4000) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  const target = page.locator(`.placed-sticker[data-sticker-id="${ids[1]}"]`);
  const box = await target.boundingBox();
  if (!box) throw new Error("The placement target is missing");
  const finger = await hand(page);
  const contact = {
    id: 1,
    radius: FINGERTIP,
    x: box.x + box.width * 0.8,
    y: box.y + box.height * 0.5,
  };
  await finger.down([contact]);
  await finger.move([{ ...contact, x: contact.x + 28 }]);
  await expect(target).toHaveClass(/is-dragging/);
  await page.waitForTimeout(300);
  await finger.up();
  await expect(target).not.toHaveClass(/is-dragging/);
  await page.waitForTimeout(1700);
  const frames = await page.evaluate(() => window.placementFrames);
  await info.attach("placement-frames", {
    body: JSON.stringify(frames),
    contentType: "application/json",
  });
  const revealing = frames.flatMap((frame) =>
    frame.surfaces.filter(
      (surface) => surface.id === ids[1] && surface.paint.some((paint) => paint.reveal),
    ),
  );
  expect(revealing.length).toBeGreaterThan(0);
  expect(revealing.every((surface) => !surface.classes.includes("is-dragging"))).toBe(true);
  expect(
    revealing.every((surface) => surface.paint[0].progress === surface.laminate[0].progress),
  ).toBe(true);
  const progress = revealing.map((surface) => Number(surface.paint[0].progress));
  expect(progress[0]).toBe(0);
  expect(progress.some((value) => value > 0 && value < 1)).toBe(true);
  await expect(target.locator("[data-crease-reveal]")).toHaveCount(0);
});
