import { expect } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { say, sealFromBoard, signIn, signedInUserId, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";
import {
  checkStickerFrameBudget,
  displayMilliseconds,
  stickerDisplayBudget,
} from "./stickerPerformance.ts";

test.use(ipad);

test("initial board material settles before deferred startup work begins", async ({ page }) => {
  await signIn(page, "laminate-startup", "en");
  await sealFromBoard(page, "en");
  await sealFromBoard(page, "en");
  const ids = await page.locator(".placed-sticker").evaluateAll((stickers) =>
    stickers.map((sticker) => {
      const id = sticker.getAttribute("data-sticker-id");
      if (!id) throw new Error("The startup sticker has no ID");
      return id;
    }),
  );
  expect(ids).toHaveLength(2);
  const headers = { "x-croquis-user-id": await signedInUserId(page) };
  for (const [z, id] of ids.entries()) {
    const placement = {
      onBoard: true,
      x: 0.45 + z * 0.03,
      y: 0.4 + z * 0.02,
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
  await page.addInitScript(() => {
    const fetchImage = window.fetch.bind(window);
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let waiting = 0;
    Reflect.set(window, "startupNormal", { release, waiting: () => waiting });
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith("blob:")) return fetchImage(input, init);
      // The crease worker's normal is uploaded from its local Blob URL; hold that upload after print decode.
      waiting++;
      return held.then(() => fetchImage(input, init));
    };
  });
  await page.reload();
  const readStartup = () =>
    page.evaluate(async () => {
      const { readBootMilestones } = await import("../src/performance/bootMilestones.ts");
      return readBootMilestones().map((milestone) => milestone.step);
    });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const held: unknown = Reflect.get(window, "startupNormal");
        if (!held || typeof held !== "object") throw new Error("The normal upload hold is missing");
        const waiting: unknown = Reflect.get(held, "waiting");
        if (typeof waiting !== "function") throw new Error("The normal upload count is missing");
        const count: unknown = Reflect.apply(waiting, undefined, []);
        if (typeof count !== "number") throw new Error("The normal upload count is invalid");
        return count;
      }),
    )
    .toBeGreaterThan(0);
  await expect(
    page.locator(".placed-sticker canvas.sticker-laminate[data-state=ready]"),
  ).toHaveCount(2);
  // Cross the old image-only quiet period: incomplete material must not release deferred imports or tray images.
  await page.waitForTimeout(1100);
  expect(await readStartup()).not.toContain("board complete");
  await page.evaluate(() => {
    const held: unknown = Reflect.get(window, "startupNormal");
    if (!held || typeof held !== "object") throw new Error("The normal upload hold is missing");
    const release: unknown = Reflect.get(held, "release");
    if (typeof release !== "function") throw new Error("The normal upload release is missing");
    Reflect.apply(release, undefined, []);
  });
  await expect.poll(readStartup).toContain("board complete");
  await expect(page.locator(".placed-sticker canvas.sticker-laminate[data-error]")).toHaveCount(0);
});

test("selecting overlapping stickers retains their coating without a long input stall", async ({
  page,
}, info) => {
  await signIn(page, "laminate-selection", "en");
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
      x: 0.45 + z * 0.03,
      y: 0.4 + z * 0.02,
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
  const coats = page.locator(".placed-sticker canvas.sticker-laminate[data-state=ready]");
  await expect(coats).toHaveCount(2);
  // Include the normal rebake after selecting, rather than measuring only an already-settled board.
  const frames = await page.evaluate(async (id) => {
    const sticker = document.querySelector(`[data-sticker-id="${id}"]`);
    if (!(sticker instanceof HTMLElement)) throw new Error("The selection target is missing");
    const originalCoats = [...document.querySelectorAll(".placed-sticker canvas.sticker-laminate")];
    const intervals: number[] = [];
    let lostSnapshots = 0;
    const started = performance.now();
    let last = started;
    sticker.focus();
    sticker.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    let selectedAt: number | null = null;
    while (performance.now() - started < 1500) {
      const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      intervals.push(now - last);
      last = now;
      if (selectedAt === null && sticker.getAttribute("aria-pressed") === "true")
        selectedAt = now - started;
      for (const coat of originalCoats)
        if (
          !(coat instanceof HTMLCanvasElement) ||
          coat.dataset.state !== "ready" ||
          !coat.width ||
          !coat.height
        )
          lostSnapshots++;
    }
    return { intervals, lostSnapshots, selectedAt };
  }, ids[0]);
  await expect(
    page.getByRole("button", { name: say(strings.stickerBoard.toolbar.view, "en"), exact: true }),
  ).toBeVisible();
  await info.attach("selection-frames", {
    body: JSON.stringify(frames),
    contentType: "application/json",
  });
  expect(frames.lostSnapshots).toBe(0);
  expect(frames.selectedAt).not.toBeNull();
  if (!checkStickerFrameBudget) return;
  expect(
    frames.selectedAt,
    "Selection should appear within 100ms on the qualification browser",
  ).toBeLessThanOrEqual(100);
  expect(
    displayMilliseconds(Math.max(...frames.intervals)),
    "Selecting and rebaking must not introduce a frame stall over 50ms",
  ).toBeLessThanOrEqual(stickerDisplayBudget.maximumMs);
  expect(
    displayMilliseconds(
      frames.intervals.toSorted((a, b) => a - b)[Math.floor(frames.intervals.length * 0.95)],
    ),
    "At least 95% of selection frames should remain within 16.7ms",
  ).toBeLessThanOrEqual(stickerDisplayBudget.p95Ms);
});
