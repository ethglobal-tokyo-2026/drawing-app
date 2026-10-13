import { expect, type Route } from "@playwright/test";
import { boardSticker, sealFromBoard, signIn, signedInUserId, test } from "./helpers.ts";

test("a sticker's blank corner lets a tap reach the sticker underneath", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, "silhouette-selection", "en");
  const underneath = boardSticker(page, "en", await sealFromBoard(page, "en"));
  const above = boardSticker(page, "en", await sealFromBoard(page, "en", { reach: 1.5 }));
  const headers = { "x-croquis-user-id": await signedInUserId(page) };

  // Crossing the sealed diagonal strokes exposes the lower cut inside the larger sticker's box.
  for (const [z, sticker] of [underneath, above].entries()) {
    const id = await sticker.getAttribute("data-sticker-id");
    if (!id) throw new Error("The placed sticker has no ID");
    const placement = {
      onBoard: true,
      x: 0.5,
      y: 0.4,
      scale: z === 0 ? 0.5 : 0.7,
      rotation: z === 0 ? 90 : 0,
      z,
    };
    const response = await page.request.patch(`/api/sticker-boards/me/sticker-placements/${id}`, {
      headers,
      data: { placement },
    });
    expect(response.status(), await response.text()).toBe(200);
  }
  const boardRead = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/sticker-boards/me",
  );
  await page.reload();
  expect((await boardRead).ok()).toBe(true);
  await expect(above).toBeVisible();
  await expect(underneath).toBeVisible();
  await expect(underneath).toHaveCSS("transform", /matrix\(0, 1, -1, 0,/);
  await expect(above).not.toHaveClass(/is-landing/);
  await expect(underneath).not.toHaveClass(/is-landing/);

  const box = await above.boundingBox();
  if (!box) throw new Error("The larger sticker is not on screen");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(above).toHaveAttribute("aria-pressed", "true");
  await expect(underneath).toHaveAttribute("aria-pressed", "false");
  await above.press("Escape");

  const exposed = await underneath.evaluate((sticker) => {
    if (!(sticker instanceof HTMLElement)) throw new Error("The lower sticker is missing");
    const bounds = sticker.getBoundingClientRect();
    // A quarter of the way along its diagonal, transformed through its clockwise quarter turn.
    return {
      x: bounds.x + bounds.width / 2 + parseFloat(sticker.style.height) / 4,
      y: bounds.y + bounds.height / 2 - parseFloat(sticker.style.width) / 4,
    };
  });
  expect(exposed.x).toBeGreaterThan(box.x);
  expect(exposed.x).toBeLessThan(box.x + box.width);
  expect(exposed.y).toBeGreaterThan(box.y);
  expect(exposed.y).toBeLessThan(box.y + box.height);
  await page.touchscreen.tap(exposed.x, exposed.y);
  await expect(underneath).toHaveAttribute("aria-pressed", "true");
  await expect(above).toHaveAttribute("aria-pressed", "false");

  // Farther into the same blank corner, neither sticker occupies the board.
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await expect(underneath).toHaveAttribute("aria-pressed", "false");
  await expect(above).toHaveAttribute("aria-pressed", "false");

  // Selection raises a sticker: put the larger one back above before testing the cached board.
  await above.press("Space");
  await expect(above).toHaveAttribute("aria-pressed", "true");
  await above.press("Escape");

  let allowRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => (allowRefresh = resolve));
  let refreshHeld = false;
  const delayedRefresh = async (route: Route) => {
    refreshHeld = true;
    await refreshGate;
    refreshHeld = false;
    await route.continue();
  };
  const boardPath = /\/api\/sticker-boards\/me$/;
  await page.route(boardPath, delayedRefresh);
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/sticker-boards/me",
  );
  const refreshTimeout = setTimeout(allowRefresh, 25_000);
  try {
    await page.reload();
    await expect(above).toBeVisible();
    await expect(underneath).toBeVisible();
    await expect.poll(() => refreshHeld).toBe(true);
    await page.touchscreen.tap(exposed.x, exposed.y);
    await expect(underneath).toHaveAttribute("aria-pressed", "true");
    await expect(above).toHaveAttribute("aria-pressed", "false");
    expect(refreshHeld, "Selection must succeed before the fresh board arrives").toBe(true);
  } finally {
    clearTimeout(refreshTimeout);
    allowRefresh();
    expect((await refreshed).ok()).toBe(true);
    await page.unroute(boardPath, delayedRefresh);
  }

  await above.press("Space");
  await expect(above).toHaveAttribute("aria-pressed", "true");
  await above.press("Escape");
  const lowerId = await underneath.getAttribute("data-sticker-id");
  if (!lowerId) throw new Error("The lower sticker has no ID");
  const beforeDrag = await underneath.boundingBox();
  if (!beforeDrag) throw new Error("The lower sticker is not on screen");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/sticker-placements/${lowerId}`),
  );
  await page.mouse.move(exposed.x, exposed.y);
  await page.mouse.down();
  await page.mouse.move(exposed.x + 20, exposed.y + 10, { steps: 4 });
  await expect(underneath).toHaveClass(/is-dragging/);
  await expect(above).not.toHaveClass(/is-dragging/);
  await page.mouse.up();
  expect((await saved).ok()).toBe(true);
  const afterDrag = await underneath.boundingBox();
  if (!afterDrag) throw new Error("The lower sticker disappeared after dragging");
  expect(afterDrag.x).toBeGreaterThan(beforeDrag.x);
  expect(afterDrag.y).toBeGreaterThan(beforeDrag.y);
});
