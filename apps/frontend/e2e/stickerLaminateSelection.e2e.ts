import { observeStickerHardware, qualifyStickerScene } from "./stickerPerformance";
import { expect, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { say, sealFromBoard, signIn, signedInUserId, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";
import {
  checkStickerFrameBudget,
  displayMilliseconds,
  stickerDisplayBudget,
} from "./stickerPerformance.ts";

test.use(ipad);
test.beforeEach(async ({ page }) => observeStickerHardware(page));

/** When the board was marked complete, on the page's clock, or null before it is. */
const boardCompleteAt = (page: Page) =>
  page.evaluate(async () => {
    const { readBootMilestones } = await import("../src/performance/bootMilestones.ts");
    return readBootMilestones().find((entry) => entry.step === "board complete")?.at ?? null;
  });

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
    page.locator(".placed-sticker canvas.sticker-material[data-state=ready]"),
  ).toHaveCount(2);
  // Decoded images with incomplete material must not release deferred imports or tray images.
  const releasedAt = await page.evaluate(() => {
    const held: unknown = Reflect.get(window, "startupNormal");
    if (!held || typeof held !== "object") throw new Error("The normal upload hold is missing");
    const release: unknown = Reflect.get(held, "release");
    if (typeof release !== "function") throw new Error("The normal upload release is missing");
    const at = performance.now();
    Reflect.apply(release, undefined, []);
    return at;
  });
  await expect.poll(() => boardCompleteAt(page)).not.toBeNull();
  expect(await boardCompleteAt(page)).toBeGreaterThan(releasedAt);
  await expect(page.locator(".placed-sticker canvas.sticker-material[data-error]")).toHaveCount(0);
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
  const coats = page.locator(".placed-sticker canvas.sticker-material[data-state=ready]");
  await expect(coats).toHaveCount(2);
  await qualifyStickerScene(page, info, "selection");
  // Include the normal rebake after selecting, rather than measuring only an already-settled board.
  const frames = await page.evaluate(async (id) => {
    const sticker = document.querySelector(`[data-sticker-id="${id}"]`);
    if (!(sticker instanceof HTMLElement)) throw new Error("The selection target is missing");
    const originalCoats = [...document.querySelectorAll(".placed-sticker canvas.sticker-material")];
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

test("decoded board artwork waits for an actual delayed required foil commit", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?count=1&board=1&side=240");
  await expect(page.locator("canvas.sticker-material")).toHaveAttribute("data-state", "ready");
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/required-foil.svg", async (route) => {
    requested = true;
    await held;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/></svg>',
    });
  });
  await page.evaluate(async () => {
    const { updateSticker } = await import("../src/stickers/stickerRenderer.ts");
    const { followBoardAssembly, forgetBoardComplete } =
      await import("../src/sticker-board/boardComplete.ts");
    const { CreaseStore } = await import("../src/sticker-board/useCreases.ts");
    const host = document.querySelector("[data-sticker]");
    const canvas = host?.querySelector("canvas.sticker-material");
    const img = host?.querySelector("img");
    if (!(host instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement) || !img)
      throw new Error("The foil readiness fixture is missing");
    host.classList.add("placed-sticker");
    host.dataset.stickerId = "required";
    const print = img.src;
    const figure = host.querySelector(".sticker-figure");
    if (!figure) throw new Error("The foil readiness figure is missing");
    const cut = getComputedStyle(figure).getPropertyValue("--m").slice(5, -2);
    updateSticker(canvas, {
      print,
      cut,
      finish: "gloss",
      foil: { style: "holo", size: "board", mask: "/required-foil.svg" },
    });
    const creases = new CreaseStore();
    creases.want([]);
    forgetBoardComplete();
    followBoardAssembly([], { fresh: true, materials: { root: host, creases, active: true } });
  });
  await expect.poll(() => requested).toBe(true);
  // The material wait crosses one frame before it checks the surface; a board complete that
  // skipped the held foil lands before the next frame starts.
  const releasedAt = await page.evaluate(
    () => new Promise<number>((frame) => requestAnimationFrame(() => requestAnimationFrame(frame))),
  );
  release();
  await expect.poll(() => boardCompleteAt(page)).not.toBeNull();
  expect(await boardCompleteAt(page)).toBeGreaterThan(releasedAt);
  await expect(page.locator("canvas.sticker-material")).toHaveAttribute("data-foil", "true");
});
