import {
  checkStickerFrameBudget,
  observeStickerHardware,
  qualifyStickerScene,
  startStickerMotionSample,
  finishStickerMotionSample,
} from "./stickerPerformance";
import type { Locator, Page } from "@playwright/test";
import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  boardSticker,
  drawAndSeal,
  drawKeyName,
  handleOf,
  openDetail,
  openExplore,
  say,
  sealFromBoard,
  signIn,
  startsWith,
  test,
} from "./helpers.ts";
import { hand, FINGERTIP } from "./pen.ts";
import { ipad } from "./ipad.ts";
import {
  holdFlights,
  holdFlyers,
  holdRoute,
  land,
  solidSvg,
  waitTwoFrames,
  type watchCoverageJobs,
} from "./stickerMaterialFixture.ts";

declare global {
  interface Window {
    /** Holds one of the source's two foil consumers back from a new generation. */
    flightGenerationHold?: { waiting: number; release: () => void };
    /** The flyer finish whose committed foil a generation test keeps checking. */
    flightCopiedFinish?: HTMLCanvasElement;
    /** The flyer finish a Page or Cancel test released. */
    flightReleasedFinish?: HTMLCanvasElement;
    /** The board sticker's pixels in the first frame its return uncovers. */
    flightFirstVisibleReturn?: string;
    /** The tray flyer's first committed peel, against its slot's pixels. */
    flightFirstPeelCommit?: { state?: string; samePixels: boolean; width: number; height: number };
    flightPeelGpu?: WebGLRenderingContext;
    flightRestorePeel?: () => void;
    flightPeelCoverage?: ReturnType<typeof watchCoverageJobs>;
    /** How many times a cast was pointed at a coverage mask. */
    flightCastWrites?: number;
  }
}

test.use(ipad);
test.beforeEach(async ({ page }) => observeStickerHardware(page));

/** A figure's foil cast, and what its finish's committed descriptor says the cast should show. */
const castAndCommitted = (figure: Locator) =>
  figure.evaluate(async (root) => {
    const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
    const finish = root.querySelector<HTMLCanvasElement>("canvas.sticker-material");
    const cast = root.querySelector<HTMLElement>(".sticker-foil");
    const committed = finish && stickerFoilCoverage(finish);
    if (!committed || !cast) throw new Error("The committed foil or its cast is missing");
    const c = committed.coverage;
    return {
      cast: {
        mask: cast.style.getPropertyValue("--foil-coverage"),
        box: ["--foil-left", "--foil-top", "--foil-width", "--foil-height"].map((key) =>
          cast.style.getPropertyValue(key),
        ),
        pink: cast.classList.contains("sticker-foil--pink"),
      },
      committed: {
        mask: `url("${c.mask}")`,
        box: [
          (100 * c.x) / c.sourceWidth,
          (100 * c.y) / c.sourceHeight,
          (100 * c.width) / c.sourceWidth,
          (100 * c.height) / c.sourceHeight,
        ].map((value) => `${value}%`),
        pink: committed.material.style === "pink",
      },
    };
  });

test("a sticker tapped on its sheet flies to the board on a copy of its material", async ({
  page,
}) => {
  const slot = await preparedPinkTray(page);
  const id = await slot.getAttribute("data-id");
  // Only now: the sticker went into the tray on a flight of its own.
  await page.evaluate(holdFlyers, "tray__flyer");
  await slot.tap();
  const flyer = page.locator(".tray__flyer");
  // Placing it redraws the sheets: the flight must outlive the slot material it copies.
  await expect(flyer).toHaveCount(1);
  await expect(flyer.locator("canvas.sticker-material")).toHaveAttribute("data-state", "ready");
  await land(flyer);
  await expect(flyer).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(`.tray__slot[data-id="${id}"]`)).toHaveAttribute("data-state", "used");
});

test("with no WebGL, a lift still flies its sticker off the board and back", async ({ page }) => {
  await page.addInitScript(() => {
    const get: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof get !== "function") throw new Error("Canvas context method missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind.includes("webgl")) return null;
        const context: unknown = Reflect.apply(get, this, [kind, ...args]);
        return context;
      },
    });
  });
  await holdFlights(page, "detail-lift__flyer");
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1");
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "failed",
  );
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  const flyer = page.locator(".detail-lift__flyer");
  await expect(flyer.locator(".sticker-figure img")).toBeVisible();
  await land(flyer);
  await expect(flyer).toHaveCount(0);
  await expect(page.locator("[data-lift-view] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "failed",
  );
  const back = await page
    .getByRole("button", { name: "Close fixture", exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLElement)) throw new Error("The close fixture is missing");
      button.click();
      return document.querySelectorAll(".detail-lift__flyer img").length;
    });
  expect(back, "Closing flies the sticker back").toBe(1);
});

test("a sticker lifted off Explore's pile flies into its sheet", async ({ page }) => {
  await holdFlights(page, "detail-lift__flyer");
  const handle = handleOf(await signIn(page, "pile-flight", "en"));
  const no = await sealFromBoard(page, "en");
  await openExplore(page, "en");
  const sticker = page
    .getByRole("region", { name: say(strings.explore.pile.today, "en"), exact: true })
    .getByRole("button", {
      name: startsWith(
        say(strings.explore.pile.sticker, "en", { number: no, artist: handle, ago: "" }),
      ),
    });
  // The pile's stickers overlap, so a tap on its spot could land on another: the keyboard lifts it.
  await sticker.focus();
  await page.keyboard.press("Enter");
  const flyer = page.locator(".detail-lift__flyer");
  await expect(flyer.locator(".sticker-figure img")).toBeVisible();
  await land(flyer);
  await expect(flyer).toHaveCount(0);
  await expect(
    page.getByRole("dialog", {
      name: say(strings.explore.lifted.label, "en", { no, artist: handle }),
    }),
  ).toBeVisible();
});

test("a closing sticker keeps its rendered laminate pixels during the flight", async ({ page }) => {
  await signIn(page, "laminate-flight", "en");
  const no = await sealFromBoard(page, "en");
  const detail = await openDetail(page, "en", no);
  const coat = detail.locator(".sticker-detail__slide canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  // Opening must have landed before the close constructs its separate flyer.
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
  const pixels = await detail
    .getByRole("button", { name: say(strings.ui.backToBoard, "en"), exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLElement)) throw new Error("The detail close button is missing");
      button.click();
      const canvas = document.querySelector(".detail-lift__flyer canvas.sticker-material");
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The closing flyer is missing");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The closing flyer context is missing");
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let channel = 3; channel < rgba.length; channel += 4) if (rgba[channel] > 0) opaque++;
      return { opaque, state: canvas.dataset.state };
    });
  expect(pixels.state).toBe("ready");
  expect(pixels.opaque, "Cloning the DOM must also copy the visible canvas bitmap").toBeGreaterThan(
    100,
  );
});

test("foil outside paper stays live through reversed lifts and source concealment removes the whole flyer", async ({
  page,
}) => {
  await holdFlights(page, "detail-lift__flyer");
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1&side=300");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0, 123));
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (el) => el.textContent === "Open fixture",
    );
    button?.click();
  });
  const flyer = page.locator(".detail-lift__flyer");
  await expect(flyer).toHaveCount(1);
  await flyer.evaluate((el) => {
    el.setAttribute("data-owner", "retained");
  });
  const read = () =>
    flyer.locator("canvas.sticker-material").evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The complete flyer is missing");
      const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
      if (!pixels) throw new Error("The flyer pixels are missing");
      // The source cut begins at 2/240; output extends beyond the source frame for its foil.
      let overflow = 0;
      let digest = 0;
      for (let x = 0; x < canvas.width; x++) {
        const i = x * 4;
        if (pixels[i + 3]) {
          overflow++;
          digest += pixels[i] + pixels[i + 1] * 3 + pixels[i + 2] * 7;
        }
      }
      return { overflow, digest, foil: canvas.dataset.foil };
    });
  await expect(flyer.locator(".sticker-foil")).toHaveAttribute("data-state", "ready");
  const before = await read();
  expect(before.foil).toBe("true");
  expect(before.overflow).toBeGreaterThan(0);
  await page.evaluate(() => window.laminateFixture.tilt(46, 12, 130));
  await expect.poll(async () => (await read()).digest).not.toBe(before.digest);
  await page.getByRole("button", { name: "Close fixture", exact: true }).click();
  await expect(flyer).toHaveAttribute("data-owner", "retained");
  await page.getByRole("button", { name: "Conceal fixture", exact: true }).click();
  await expect(flyer).toHaveCount(0);
  await expect(page.locator(".detail-lift__flyer img")).toHaveCount(0);
});

test("a covered board destination has the held pose before its first visible return frame", async ({
  page,
}) => {
  await holdFlights(page, "detail-lift__flyer");
  // The origin's hide ends by canceling its animation: that frame is the first one uncovered.
  await page.addInitScript(() => {
    const animate: unknown = Reflect.get(Element.prototype, "animate");
    if (typeof animate !== "function") throw new Error("The native flight animation is missing");
    Element.prototype.animate = function (frames, timing) {
      const animation: unknown = Reflect.apply(animate, this, [frames, timing]);
      if (!(animation instanceof Animation))
        throw new Error("The native flight animation was not created");
      if (this.hasAttribute("data-lift-origin")) {
        const cancel = animation.cancel.bind(animation);
        animation.cancel = () => {
          const canvas = this.querySelector("canvas.sticker-material");
          if (canvas instanceof HTMLCanvasElement)
            window.flightFirstVisibleReturn = canvas.toDataURL();
          cancel();
        };
      }
      return animation;
    };
  });
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1");
  const board = page.locator("[data-lift-origin] canvas.sticker-material");
  await expect(board).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0, 123));
  const before = await board.evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error("The retained board material is missing");
    return canvas.toDataURL();
  });
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(1);
  await page.evaluate(() => window.laminateFixture.tilt(46, 12, 130));
  await expect.poll(() => page.evaluate(() => window.laminateFixture.getPose().x)).not.toBe(0);
  // Wait for the shared published pose to stop; no fresh sensor event accompanies the return.
  await page.evaluate(async () => {
    let previous = "";
    let still = 0;
    const deadline = performance.now() + 5000;
    while (still < 5) {
      if (performance.now() > deadline) throw new Error("The held return pose did not settle");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const next = JSON.stringify(window.laminateFixture.getPose());
      still = next === previous ? still + 1 : 0;
      previous = next;
    }
  });
  expect(
    await board.evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error("The retained board material is missing");
      return canvas.toDataURL();
    }),
  ).toBe(before);
  await page.getByRole("button", { name: "Close fixture", exact: true }).click();
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await expect(page.locator("[data-lift-view], .detail-lift__flyer")).toHaveCount(0);
  const exposed = await page.evaluate(() => {
    const result = window.flightFirstVisibleReturn;
    if (result === undefined) throw new Error("The first visible return was not captured");
    return result;
  });
  expect(exposed).not.toBe(before);
  await waitTwoFrames(page);
  expect(
    await board.evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error("The retained board material is missing");
      return canvas.toDataURL();
    }),
  ).toBe(exposed);
});

for (const action of ["Page fixture", "Cancel fixture"] as const) {
  test(`${action} releases the whole live lift owner and prevents obsolete landing`, async ({
    page,
  }) => {
    const detailFoil = await holdRoute(page, "**/delayed-detail-foil.svg", () => solidSvg("white"));
    await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1&delayedDetail=1");
    await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
      "data-state",
      "ready",
    );
    await page.getByRole("button", { name: "Open fixture", exact: true }).click();
    await detailFoil.requested;
    // Forward movement ends while the detail's material loads: the lift waits there to land.
    await page.locator(".detail-lift__flyer").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished));
      const canvas = el.querySelector("canvas.sticker-material");
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The pending lift is missing");
      window.flightReleasedFinish = canvas;
    });
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.locator(".detail-lift__flyer, .detail-lift__flyer img")).toHaveCount(0);
    // The late settlement the released lift was waiting on must not land it.
    detailFoil.release();
    if (action === "Page fixture")
      await expect(page.locator("[data-lift-view] canvas.sticker-material")).toHaveAttribute(
        "data-state",
        "ready",
      );
    else await expect(page.locator("[data-lift-view]")).toHaveCount(0);
    expect(
      await page.evaluate(async () => {
        const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
        const canvas = window.flightReleasedFinish;
        if (!canvas) throw new Error("The released lift's finish is missing");
        return {
          connected: canvas.isConnected,
          pixels: canvas.width * canvas.height,
          coverage: stickerFoilCoverage(canvas),
        };
      }),
    ).toEqual({ connected: false, pixels: 0, coverage: undefined });
    await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
  });
}

test("pink foil stays live outside paper while a tray sticker curls, peels, and returns", async ({
  page,
}) => {
  const slot = await preparedPinkTray(page);
  const box = await slot.boundingBox();
  if (!box) throw new Error("The foil tray slot is missing");
  const finger = await hand(page);
  const contact = { id: 1, radius: FINGERTIP, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event("deviceorientation"), { alpha: 123, beta: 40, gamma: 0 }),
    ),
  );
  await slot.evaluate((slot) => {
    const source = slot.querySelector<HTMLCanvasElement>("canvas.sticker-material");
    if (!source) throw new Error("The peel source is missing");
    const observer = new MutationObserver(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".tray__flyer canvas.sticker-material",
      );
      if (!canvas) return;
      window.flightFirstPeelCommit = {
        state: canvas.dataset.state,
        samePixels: canvas.toDataURL() === source.toDataURL(),
        width: canvas.width,
        height: canvas.height,
      };
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await finger.down([contact]);
  await finger.move([{ ...contact, x: contact.x - 14 }]);
  const flyer = page.locator(".tray__flyer");
  await expect(flyer).toHaveCount(1);
  expect(await page.evaluate(() => window.flightFirstPeelCommit)).toMatchObject({
    state: "ready",
    samePixels: true,
  });
  await expect
    .poll(() =>
      flyer.locator("canvas.sticker-material").evaluate(async (canvas) => {
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The live peel is missing");
        const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
        return stickerFoilCoverage(canvas)?.material.size;
      }),
    )
    .toBe("board");
  const castMatches = await flyer.evaluate(async (flyer) => {
    const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = flyer.querySelector<HTMLCanvasElement>("canvas.sticker-material");
    const cast = flyer.querySelector<HTMLElement>(".sticker-foil");
    const committed = canvas && stickerFoilCoverage(canvas);
    if (!committed || !cast) throw new Error("The committed peel cast is missing");
    return {
      same: cast.style.getPropertyValue("--foil-coverage") === `url("${committed.coverage.mask}")`,
      left: cast.style.getPropertyValue("--foil-left"),
      expectedLeft: `${(100 * committed.coverage.x) / committed.coverage.sourceWidth}%`,
    };
  });
  expect(castMatches.same).toBe(true);
  expect(castMatches.left).toBe(castMatches.expectedLeft);

  await expect(flyer.locator("canvas.sticker-material")).toHaveAttribute("data-state", "ready");
  await expect(flyer.locator(".sticker-foil")).toHaveAttribute("data-state", "ready");
  await expect(flyer).toHaveClass(/is-flat/);
  const read = () =>
    flyer.evaluate(async (el) => {
      const canvas = el.querySelector("canvas.sticker-material");
      const curl = el.querySelector(".tray__curl");
      if (!(canvas instanceof HTMLCanvasElement) || !(curl instanceof HTMLElement))
        throw new Error("The live curled material is missing");
      const mask = new Image();
      mask.src = getComputedStyle(curl).getPropertyValue("--m").slice(5, -2);
      await mask.decode();
      const cut = document.createElement("canvas");
      cut.width = canvas.width;
      cut.height = canvas.height;
      const context = cut.getContext("2d");
      const live = canvas.getContext("2d");
      if (!context || !live) throw new Error("The tray foil pixel contexts are missing");
      context.drawImage(mask, 0, 0, cut.width, cut.height);
      const paper = context.getImageData(0, 0, cut.width, cut.height).data;
      const pixels = live.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (paper[i + 3] === 0 && pixels[i + 3] > 0) count++;
        else pixels.fill(0, i, i + 4);
      }
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels))].join(",");
      cut.width = cut.height = 0;
      return { count, digest, foil: canvas.dataset.foil };
    });
  const curled = await read();
  expect(curled.foil).toBe("true");
  expect(curled.count).toBeGreaterThan(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event("deviceorientation"), { alpha: 130, beta: 46, gamma: 12 }),
    ),
  );
  await expect.poll(async () => (await read()).digest).not.toBe(curled.digest);
  await finger.move([{ ...contact, x: contact.x - 45 }]);
  await expect(flyer).not.toHaveClass(/is-flat/);
  expect((await read()).count).toBeGreaterThan(0);
  // Releasing toward the tray returns it to its slot, whose retained complete material must resume.
  await finger.move([{ ...contact, x: (page.viewportSize()?.width ?? 1032) - 1 }]);
  await finger.up();
  await expect(flyer).toHaveCount(0);
  await expect(slot).toHaveAttribute("data-state", "here");
  await expect(slot.locator("canvas.sticker-material")).toHaveAttribute("data-foil", "true");
});

// Each consumer waits while its box is outside the viewport, as an offscreen sticker does: holding
// one back lets the other commit the new generation first, so the source's cast and finish
// disagree when the copy is made.
for (const { first, change } of [
  { first: "static cast", change: "Replace source fixture" },
  { first: "finish", change: "Resize source fixture" },
] as const) {
  test(`the copied cast follows the committed finish when the source's ${first} commits a change first`, async ({
    page,
  }) => {
    await holdFlights(page, "detail-lift__flyer");
    await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1");
    const origin = page.locator("[data-lift-origin]");
    await expect(origin.locator("canvas.sticker-material")).toHaveAttribute("data-state", "ready");
    await expect(origin.locator(".sticker-foil")).toHaveAttribute("data-state", "ready");
    const initial = await castAndCommitted(origin);
    const [moved, held] =
      first === "static cast" ? (["cast", "committed"] as const) : (["committed", "cast"] as const);
    await origin.evaluate((host, held) => {
      // The renderer measures the finish's surface; the static cast measures its own span.
      const box = host.querySelector<HTMLElement>(
        held === "committed" ? ".sticker-material-surface" : ".sticker-foil",
      );
      if (!box) throw new Error("The held foil consumer is missing");
      const hold = {
        waiting: 0,
        release() {
          Reflect.deleteProperty(box, "getBoundingClientRect");
          document.dispatchEvent(new Event("visibilitychange"));
        },
      };
      Object.defineProperty(box, "getBoundingClientRect", {
        configurable: true,
        value: () => {
          hold.waiting++;
          return new DOMRect(0, innerHeight + 100, 1, 1);
        },
      });
      window.flightGenerationHold = hold;
    }, held);
    await page.getByRole("button", { name: change, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.flightGenerationHold?.waiting ?? 0))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => (await castAndCommitted(origin))[moved].mask)
      .not.toBe(initial[moved].mask);
    const source = await castAndCommitted(origin);
    // React restyles a static cast's class at once; its coverage is what waits.
    expect(
      { mask: source[held].mask, box: source[held].box },
      `The source's held ${held} side keeps its first coverage`,
    ).toEqual({ mask: initial[held].mask, box: initial[held].box });
    expect(source.cast.mask, "The copy must be made while the source disagrees").not.toBe(
      source.committed.mask,
    );

    await page.getByRole("button", { name: "Open fixture", exact: true }).click();
    const flyer = page.locator(".detail-lift__flyer");
    const copiedCast = flyer.locator(".sticker-foil");
    await expect(copiedCast).toHaveAttribute("data-state", "ready");
    const copied = await castAndCommitted(flyer);
    expect(copied.cast).toEqual(copied.committed);
    expect(copied.committed).toEqual(source.committed);
    const frozen = await copiedCast.evaluate(async (foil) => {
      const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
      const finish = foil.closest(".sticker-figure")?.querySelector("canvas.sticker-material");
      if (!(finish instanceof HTMLCanvasElement)) throw new Error("The copied finish is missing");
      const committed = stickerFoilCoverage(finish);
      if (!committed) throw new Error("The copied finish's committed foil is missing");
      window.flightCopiedFinish = finish;
      // A copied cast must still load its mask after the source has moved on.
      const mask = committed.coverage.mask;
      const image = new Image();
      image.src = mask;
      await image.decode().catch((error: unknown) => {
        throw new Error(
          `Decoding the copied cast's mask ${mask.slice(0, 60)} failed: ${String(error)}`,
        );
      });
      return [
        committed,
        committed.material,
        committed.frame,
        committed.coverage,
        committed.coverage.alpha,
      ].every(Object.isFrozen);
    });
    expect(frozen, "The committed descriptor a copy keeps must be frozen").toBe(true);

    await page.evaluate(() => window.flightGenerationHold?.release());
    await page.getByRole("button", { name: "Resume source fixture", exact: true }).click();
    await expect
      .poll(async () => (await castAndCommitted(origin))[held].mask)
      .not.toBe(source[held].mask);
    // Later source commits must not change the cast retained by the live copied owner.
    await waitTwoFrames(page);
    expect(await castAndCommitted(flyer)).toEqual(copied);
    await page.getByRole("button", { name: "Conceal fixture", exact: true }).click();
    await expect(flyer).toHaveCount(0);
    expect(
      await page.evaluate(async () => {
        const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
        const finish = window.flightCopiedFinish;
        if (!finish) throw new Error("The retired copied finish is missing");
        return stickerFoilCoverage(finish);
      }),
    ).toBeUndefined();
  });
}

test("a retained lift restarts reverse geometry after forward movement ends while detail material is pending", async ({
  page,
}) => {
  const detailFoil = await holdRoute(page, "**/delayed-detail-foil.svg", () => solidSvg("white"));
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1&delayedDetail=1");
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  await detailFoil.requested;
  const flyer = page.locator(".detail-lift__flyer");
  await expect(flyer).toHaveCount(1);
  await flyer.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((animation) => animation.finished));
    el.setAttribute("data-owner", "retained-after-forward");
  });
  await page.getByRole("button", { name: "Close fixture", exact: true }).evaluate((button) => {
    if (!(button instanceof HTMLElement)) throw new Error("The close fixture is missing");
    button.click();
    const flyer = document.querySelector(".detail-lift__flyer");
    if (!(flyer instanceof HTMLElement)) throw new Error("The retained reversed flyer is missing");
    for (const animation of flyer.getAnimations()) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await expect(flyer).toHaveAttribute("data-owner", "retained-after-forward");
  detailFoil.release();
  // A late forward material settlement must leave the reversed owner and its visual hide intact.
  await expect(page.locator("[data-lift-view] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(flyer).toHaveCount(1);
  const turns = await flyer.evaluate(async (el) => {
    const { stickerTurn } = await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const canvas = el.querySelector("canvas.sticker-material");
    const animation = el.getAnimations()[0];
    if (!(canvas instanceof HTMLCanvasElement) || !animation)
      throw new Error("The retained reverse material is missing");
    const sample = async (time: number) => {
      animation.currentTime = time;
      await twoFrames();
      return {
        sampled: stickerTurn(canvas),
        tilt:
          (Math.atan2(
            -new DOMMatrixReadOnly(getComputedStyle(el).transform).m13,
            new DOMMatrixReadOnly(getComputedStyle(el).transform).m33,
          ) *
            180) /
          Math.PI,
        actual:
          (Math.atan2(
            new DOMMatrixReadOnly(getComputedStyle(el).transform).m12,
            new DOMMatrixReadOnly(getComputedStyle(el).transform).m11,
          ) *
            180) /
          Math.PI,
      };
    };
    return [await sample(180), await sample(80)];
  });
  expect(turns[1].actual).not.toBeCloseTo(turns[0].actual, 1);
  expect(turns[1].tilt).not.toBeCloseTo(turns[0].tilt, 1);
  for (const turn of turns) expect(turn.sampled).toBeCloseTo(turn.actual, 1);
  await page.getByRole("button", { name: "Cancel fixture", exact: true }).click();
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
});

async function preparedPinkTray(page: Page) {
  await signIn(page, "foil-tray-flight", "en");
  await page.getByRole("button", { name: drawKeyName("en", DAILY_TICKETS_PER_DAY) }).click();
  const { card, no } = await drawAndSeal(page, "en", { nsfw: true });
  await card.getByRole("button", { name: say(strings.ui.backToBoard, "en") }).click();
  await boardSticker(page, "en", no).click();
  await page.getByRole("button", { name: say(strings.stickerBoard.toolbar.remove, "en") }).click();
  const zipper = page.getByRole("button", {
    name: startsWith(say(strings.stickerBoard.tray.zipper, "en")),
  });
  await zipper.press("ArrowDown");
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  const slot = page.locator('.tray__sheet.is-top .tray__slot[data-state="here"]');
  await expect(slot.locator("canvas.sticker-material")).toHaveAttribute("data-state", "ready");
  await expect(slot.locator("canvas.sticker-material")).toHaveAttribute("data-foil-style", "pink");
  await expect(slot.locator(".sticker-foil")).toHaveAttribute("data-state", "ready");
  return slot;
}

test("real detail flights retain complete foil within the display frame budget", async ({
  page,
}, info) => {
  test.skip(
    !checkStickerFrameBudget,
    "Display frame budgets require explicit hardware qualification",
  );
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1");
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await qualifyStickerScene(page, info, "detail-flight");
  await startStickerMotionSample(page, ".detail-lift__flyer canvas.sticker-material");
  try {
    for (let cycle = 0; cycle < 4; cycle++) {
      await page.getByRole("button", { name: "Open fixture", exact: true }).click();
      await expect(page.locator("[data-lift-view] canvas.sticker-material")).toHaveAttribute(
        "data-state",
        "ready",
      );
      await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
      await page.getByRole("button", { name: "Close fixture", exact: true }).click();
      await expect(page.locator("[data-lift-view], .detail-lift__flyer")).toHaveCount(0);
    }
  } finally {
    await finishStickerMotionSample(page, info, "detail-flight");
  }
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
});

test("real pink sheet peel retains complete foil within the display frame budget", async ({
  page,
}, info) => {
  test.skip(
    !checkStickerFrameBudget,
    "Display frame budgets require explicit hardware qualification",
  );
  const slot = await preparedPinkTray(page);
  await qualifyStickerScene(page, info, "sheet-peel");
  const box = await slot.boundingBox();
  if (!box) throw new Error("The prepared sheet slot is missing");
  const finger = await hand(page);
  const contact = { id: 1, radius: FINGERTIP, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await startStickerMotionSample(page, ".tray__flyer canvas.sticker-material");
  try {
    await finger.down([contact]);
    await finger.move([{ ...contact, x: contact.x - 14 }]);
    await expect(page.locator(".tray__flyer")).toHaveCount(1);
    for (let frame = 0; frame < 120; frame++) {
      await page.evaluate(() => new Promise<number>(requestAnimationFrame));
      await finger.move([{ ...contact, x: contact.x - 55 - 12 * Math.sin(frame / 12) }]);
    }
    await finger.move([{ ...contact, x: (page.viewportSize()?.width ?? 1032) - 1 }]);
    await finger.up();
    await expect(page.locator(".tray__flyer")).toHaveCount(0);
  } finally {
    await finishStickerMotionSample(page, info, "sheet-peel");
  }
  await expect(slot).toHaveAttribute("data-state", "here");
  await expect(slot.locator("canvas.sticker-material")).toHaveAttribute("data-foil-style", "pink");
});

test("a pending source-seeded peel recovers its committed cast after shared context loss", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof get !== "function") throw new Error("Canvas context method missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(get, this, [kind, ...args]);
        if (kind === "webgl" && context instanceof WebGLRenderingContext)
          window.flightPeelGpu = context;
        return context;
      },
    });
    const set: unknown = Reflect.get(CSSStyleDeclaration.prototype, "setProperty");
    if (typeof set !== "function") throw new Error("Style method missing");
    window.flightCastWrites = 0;
    CSSStyleDeclaration.prototype.setProperty = function (...args) {
      if (args[0] === "--foil-coverage")
        window.flightCastWrites = (window.flightCastWrites ?? 0) + 1;
      Reflect.apply(set, this, args);
    };
  });
  const slot = await preparedPinkTray(page);
  const cut = await slot.locator("canvas.sticker-material").evaluate(async (canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Peel canvas missing");
    const { stickerFoilCoverage, updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const committed = stickerFoilCoverage(canvas);
    const print = canvas.closest(".tray__slot")?.querySelector("img")?.src;
    if (!committed || !print || !committed.material.mask)
      throw new Error("Source descriptor missing");
    // A real component update gives the sheet independently grown coverage; the actual peel
    // still requests its authored board mask. Both generations contain production alpha bytes.
    updateSticker(canvas, {
      print,
      cut: committed.cut,
      finish: "gloss",
      foil: { ...committed.material, mask: undefined },
    });
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(8000));
    return committed.material.mask;
  });
  await page.evaluate(async (cut) => {
    // The tray runs on the app's own page, so the fixture module is addressed from the root.
    const { watchCoverageJobs } = await import("../e2e/stickerMaterialFixture.ts");
    window.flightPeelCoverage = watchCoverageJobs(cut, true);
  }, cut);
  const box = await slot.boundingBox();
  if (!box) throw new Error("Tray slot missing");
  const finger = await hand(page);
  const contact = { id: 1, radius: FINGERTIP, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await finger.down([contact]);
  await finger.move([{ ...contact, x: contact.x - 14 }]);
  const flyer = page.locator(".tray__flyer");
  await expect(flyer).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.flightPeelCoverage?.jobs ?? 0))
    .toBeGreaterThan(0);
  const size = () =>
    flyer.locator("canvas.sticker-material").evaluate(async (canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Peel canvas missing");
      const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
      return stickerFoilCoverage(canvas)?.material.size;
    });
  expect(await size()).toBe("sheet");
  await page.evaluate(() => {
    const gl = window.flightPeelGpu;
    if (!gl) throw new Error("Peel GPU missing");
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("Context loss extension missing");
    window.flightRestorePeel = () => extension.restoreContext();
    extension.loseContext();
  });
  await expect(flyer.locator("canvas.sticker-material")).toHaveAttribute("data-state", "failed");
  expect(await size()).toBe("sheet");
  await page.evaluate(() => {
    const resume = window.flightRestorePeel;
    if (!resume) throw new Error("Peel recovery callback missing");
    resume();
  });
  await page.evaluate(() => {
    const coverage = window.flightPeelCoverage;
    if (!coverage) throw new Error("Peel coverage hold missing");
    coverage.restore();
  });
  await expect.poll(size).toBe("board");
  const compare = () =>
    flyer.evaluate(async (flyer) => {
      const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
      const canvas = flyer.querySelector<HTMLCanvasElement>("canvas.sticker-material");
      const cast = flyer.querySelector<HTMLElement>(".sticker-foil");
      const committed = canvas && stickerFoilCoverage(canvas);
      if (!canvas?.parentElement || !committed || !cast) throw new Error("Committed cast missing");
      const c = committed.coverage;
      const same = cast.style.getPropertyValue("--foil-coverage") === `url("${c.mask}")`;
      return {
        frame: committed.frame,
        expectedFrame: {
          width: canvas.parentElement.clientWidth,
          height: canvas.parentElement.clientHeight,
        },
        mask: committed.material.mask,
        className: cast.className,
        same,
        actual: ["--foil-left", "--foil-top", "--foil-width", "--foil-height"].map((key) =>
          cast.style.getPropertyValue(key),
        ),
        expected: [
          (100 * c.x) / c.sourceWidth,
          (100 * c.y) / c.sourceHeight,
          (100 * c.width) / c.sourceWidth,
          (100 * c.height) / c.sourceHeight,
        ].map((v) => `${v}%`),
      };
    });
  const result = await compare();
  expect(result.same).toBe(true);
  expect(result.frame).toEqual(result.expectedFrame);
  expect(result.mask).toBe(cut);
  expect(result.className).toContain("sticker-foil--board");
  expect(result.actual).toEqual(result.expected);
  const writes = await page.evaluate(() => window.flightCastWrites ?? 0);
  expect(writes).toBeGreaterThan(0);
  await flyer.locator("canvas.sticker-material").evaluate(async (canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Peel canvas missing");
    const { turnSticker } = await import("../src/stickers/stickerRenderer.ts");
    for (let i = 1; i <= 8; i++) {
      turnSticker(canvas, i);
      await new Promise(requestAnimationFrame);
    }
  });
  expect(await page.evaluate(() => window.flightCastWrites ?? 0)).toBe(writes);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Peel viewport missing");
  await finger.move([{ ...contact, x: viewport.width - 1 }]);
  await finger.up();
  await expect(flyer).toHaveCount(0);
});
