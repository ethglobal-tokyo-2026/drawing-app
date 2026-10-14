import { expect, test } from "@playwright/test";

test("a copied finish retains its committed frame while an explicit target prepares, fails and retries", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = 0,
    fail = true;
  const mask =
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/></svg>';
  await page.route("**/copy-target.svg", async (route) => {
    requested++;
    await held;
    await route.fulfill({ contentType: "image/svg+xml", body: mask });
  });
  await page.route("**/copy-retry.svg", async (route) => {
    await route.fulfill(
      fail
        ? { status: 500, body: "expected target failure" }
        : { contentType: "image/svg+xml", body: mask },
    );
  });
  await page.goto("/e2e/stickerLaminate.html?foil=1");
  await expect(page.locator("canvas.sticker-material").first()).toHaveAttribute(
    "data-state",
    "ready",
  );
  const before = await page.evaluate(async () => {
    const { mountStickerCopy, stickerFoilCoverage, updateSticker } =
      await import("../src/stickers/stickerRenderer.ts");
    const source = document.querySelector<HTMLCanvasElement>("canvas.sticker-material");
    if (!source) throw new Error("Source missing");
    const description = stickerFoilCoverage(source);
    const print = source.closest(".sticker-figure")?.querySelector("img")?.src;
    if (!description || !print) throw new Error("Source generation missing");
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:10px;top:10px;width:240px;height:240px";
    const canvas = document.createElement("canvas");
    canvas.className = "copy-test";
    host.append(canvas);
    document.body.append(host);
    const dispose = mountStickerCopy(
      canvas,
      source,
      () => true,
      () => host.remove(),
    );
    const options = {
      print,
      cut: "/copy-target.svg",
      finish: "gloss" as const,
      foil: { style: "pink" as const, size: "board" as const },
    };
    const retained = canvas.toDataURL();
    Reflect.set(window, "copyControl", { canvas, dispose, host, options, retained });
    updateSticker(canvas, options, { width: 120, height: 120 });
    updateSticker(source, {
      print,
      cut: description.cut,
      finish: "gloss",
      foil: { ...description.material, style: "pink" },
    });
    return {
      frame: description.frame,
      pixels: retained,
      style: description.material.style,
      alpha: Array.from({ length: description.coverage.alpha.length }, (_, i) =>
        description.coverage.alpha.at(i),
      ),
    };
  });
  await expect.poll(() => requested).toBeGreaterThan(0);
  const pending = await page.evaluate(async () => {
    const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>(".copy-test");
    if (!canvas) throw new Error("Copy missing");
    const description = stickerFoilCoverage(canvas);
    if (!description) throw new Error("The pending copied descriptor is missing");
    return {
      frame: description.frame,
      pixels: canvas.toDataURL(),
      style: description.material.style,
      alpha: Array.from({ length: description.coverage.alpha.length }, (_, i) =>
        description.coverage.alpha.at(i),
      ),
    };
  });
  expect(pending).toEqual(before);
  release();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
        const canvas = document.querySelector<HTMLCanvasElement>(".copy-test");
        if (!canvas) throw new Error("Copy missing");
        return stickerFoilCoverage(canvas)?.frame;
      }),
    )
    .toEqual({ width: 120, height: 120 });
  const transition = await page.evaluate(async () => {
    const { stickerFoilCoverage, updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>(".copy-test");
    if (!canvas) throw new Error("Copy missing");
    const description = stickerFoilCoverage(canvas);
    if (!description) throw new Error("Committed target missing");
    const print = document.querySelector<HTMLImageElement>(".sticker-figure img")?.src;
    if (!print) throw new Error("Print missing");
    const options = {
      print,
      cut: "/copy-retry.svg",
      finish: "gloss" as const,
      foil: { style: "holo" as const, size: "board" as const },
    };
    let rejected = 0;
    for (const width of [0, NaN, Infinity, -1]) {
      try {
        updateSticker(canvas, options, { width, height: 120 });
      } catch {
        rejected++;
      }
    }
    updateSticker(canvas, options, { width: 180, height: 180 });
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(8000));
    return {
      rejected,
      before: { frame: description.frame, style: description.material.style },
      after: stickerFoilCoverage(canvas)?.frame,
    };
  });
  expect(transition).toEqual({
    rejected: 4,
    before: { frame: { width: 120, height: 120 }, style: "pink" },
    after: { width: 120, height: 120 },
  });
  fail = false;
  await page.evaluate(async () => {
    const { updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>(".copy-test");
    const print = document.querySelector<HTMLImageElement>(".sticker-figure img")?.src;
    if (!canvas || !print) throw new Error("Retry source missing");
    updateSticker(
      canvas,
      { print, cut: "/copy-retry.svg", finish: "gloss", foil: { style: "holo", size: "board" } },
      { width: 180, height: 180 },
    );
    await whenStickerSettled(canvas, undefined, AbortSignal.timeout(8000));
  });
  expect(
    await page.evaluate(async () => {
      const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
      const canvas = document.querySelector<HTMLCanvasElement>(".copy-test");
      if (!canvas) throw new Error("Retry copy missing");
      return stickerFoilCoverage(canvas)?.frame;
    }),
  ).toEqual({ width: 180, height: 180 });
});

test("concealing the source retires a copied target before late coverage can settle", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/copy-concealed.svg", async (route) => {
    requested = true;
    await held;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/></svg>',
    });
  });
  await page.goto("/e2e/stickerLaminate.html?lift=1&foil=1");
  await expect(page.locator("[data-lift-origin] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  const retainedFrame = await page.evaluate(async () => {
    const { mountStickerCopy, updateSticker, stickerFoilCoverage } =
      await import("../src/stickers/stickerRenderer.ts");
    const source = document.querySelector<HTMLCanvasElement>(
      "[data-lift-origin] canvas.sticker-material",
    );
    const print = document.querySelector<HTMLImageElement>("[data-lift-origin] img")?.src;
    if (!source || !print) throw new Error("The source to conceal is missing");
    const host = document.createElement("div");
    host.className = "pending-copy";
    host.style.cssText =
      "position:fixed;top:10px;left:10px;width:240px;height:240px;pointer-events:none";
    const canvas = document.createElement("canvas");
    host.append(canvas);
    document.body.append(host);
    mountStickerCopy(
      canvas,
      source,
      () => true,
      () => host.remove(),
    );
    const retained = stickerFoilCoverage(canvas);
    Reflect.set(window, "concealedCopy", { canvas, retained });
    updateSticker(
      canvas,
      {
        print,
        cut: "/copy-concealed.svg",
        finish: "gloss",
        foil: { style: "pink", size: "board" },
      },
      { width: 120, height: 120 },
    );
    return retained?.frame;
  });
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Conceal fixture", exact: true }).click();
  await expect(page.locator(".pending-copy")).toHaveCount(0);
  release();
  const state = await page.evaluate(async () => {
    const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const stored: unknown = Reflect.get(window, "concealedCopy");
    if (!stored || typeof stored !== "object")
      throw new Error("The retired copy evidence is missing");
    const canvas: unknown = Reflect.get(stored, "canvas");
    const retained: unknown = Reflect.get(stored, "retained");
    if (!(canvas instanceof HTMLCanvasElement) || !retained || typeof retained !== "object")
      throw new Error("The retired copy evidence is invalid");
    return {
      connected: canvas.isConnected,
      width: canvas.width,
      current: stickerFoilCoverage(canvas),
      retainedFrame: Reflect.get(retained, "frame") as unknown,
    };
  });
  expect(state).toMatchObject({
    connected: false,
    width: 0,
    current: undefined,
    retainedFrame,
  });
});

test("a settled live copy retries an identical frame-only request after failure", async ({
  page,
}) => {
  let fail = false,
    requests = 0;
  await page.route("**/frame-only.svg", async (route) => {
    requests++;
    await route.fulfill(
      fail
        ? { status: 500, body: "expected frame-only failure" }
        : {
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/></svg>',
          },
    );
  });
  await page.goto("/e2e/stickerLaminate.html?foil=1");
  await expect(page.locator("canvas.sticker-material").first()).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.evaluate(async () => {
    const api = await import("../src/stickers/stickerRenderer.ts");
    const source = document.querySelector<HTMLCanvasElement>("canvas.sticker-material");
    const print = document.querySelector<HTMLImageElement>(".sticker-figure img")?.src;
    if (!source || !print) throw new Error("Source missing");
    const host = document.createElement("div");
    host.className = "sticker-material-surface";
    host.style.cssText = "position:fixed;left:0;top:0;width:240px;height:240px";
    const canvas = document.createElement("canvas");
    canvas.className = "frame-only-copy";
    host.append(canvas);
    document.body.append(host);
    const dispose = api.mountStickerCopy(
      canvas,
      source,
      () => true,
      () => host.remove(),
    );
    const options = {
      print,
      cut: "/frame-only.svg",
      finish: "gloss" as const,
      foil: { style: "pink" as const, size: "board" as const },
    };
    Reflect.set(window, "disposeFrameOnly", dispose);
    Reflect.set(window, "requestFrameOnly", async () => {
      api.updateSticker(canvas, options, { width: 120, height: 120 });
      await api.whenStickerSettled(canvas, undefined, AbortSignal.timeout(8000));
    });
    api.updateSticker(canvas, options, { width: 180, height: 180 });
  });
  const frame = () =>
    page.locator(".frame-only-copy").evaluate(async (canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Copy canvas missing");
      const api = await import("../src/stickers/stickerRenderer.ts");
      return api.stickerFoilCoverage(canvas)?.frame;
    });
  await expect.poll(frame).toEqual({ width: 180, height: 180 });
  // This is a live 180px acquisition, not the source-seeded 240px snapshot.
  const pixels = await page.locator(".frame-only-copy").evaluate((c) => {
    if (!(c instanceof HTMLCanvasElement)) throw new Error("Copy canvas missing");
    return c.toDataURL();
  });
  fail = true;
  const request = () =>
    page.evaluate(async () => {
      const request: unknown = Reflect.get(window, "requestFrameOnly");
      if (typeof request !== "function") throw new Error("Frame request missing");
      await Reflect.apply(request, undefined, []);
    });
  await request();
  await expect(page.locator(".frame-only-copy")).toHaveAttribute(
    "data-error",
    /Replacing sticker print and cut/,
  );
  expect(await frame()).toEqual({ width: 180, height: 180 });
  expect(
    await page.locator(".frame-only-copy").evaluate((c) => {
      if (!(c instanceof HTMLCanvasElement)) throw new Error("Copy canvas missing");
      return c.toDataURL();
    }),
  ).toBe(pixels);
  const failedRequests = requests;
  await page.locator(".frame-only-copy").evaluate(async (canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Copy canvas missing");
    const api = await import("../src/stickers/stickerRenderer.ts");
    for (let i = 1; i <= 5; i++) {
      api.turnSticker(canvas, i);
      await new Promise(requestAnimationFrame);
    }
  });
  expect(requests).toBe(failedRequests);
  await expect(page.locator(".frame-only-copy")).toHaveAttribute(
    "data-error",
    /Replacing sticker print and cut/,
  );
  fail = false;
  await request();
  await expect.poll(frame).toEqual({ width: 120, height: 120 });
  expect(requests).toBeGreaterThan(failedRequests);
  await expect(page.locator(".frame-only-copy")).not.toHaveAttribute("data-error");
  await page.evaluate(() => {
    const dispose: unknown = Reflect.get(window, "disposeFrameOnly");
    if (typeof dispose !== "function") throw new Error("Copy disposal missing");
    Reflect.apply(dispose, undefined, []);
  });
});
