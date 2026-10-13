import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", { value: 0, configurable: true });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    // Delivered sensor readings are exercised after access is available.
    if (typeof window.DeviceMotionEvent === "function")
      Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
        value: undefined,
        configurable: true,
      });
  });
});

test("simultaneously re-exposed sticker surfaces share one GPU snapshot transfer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const gpu = new WeakSet<HTMLCanvasElement>();
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function") throw new Error("The canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl") gpu.add(this);
        return context;
      },
    });
    Reflect.set(window, "laminateGpuCopies", 0);
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (typeof drawImage !== "function") throw new Error("The canvas image method is missing");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (
        this: CanvasRenderingContext2D,
        source: CanvasImageSource,
        ...args: number[]
      ) {
        if (source instanceof HTMLCanvasElement && gpu.has(source)) {
          const copies: unknown = Reflect.get(window, "laminateGpuCopies");
          if (typeof copies !== "number") throw new Error("The laminate copy counter is missing");
          Reflect.set(window, "laminateGpuCopies", copies + 1);
        }
        Reflect.apply(drawImage, this, [source, ...args]);
      },
    });
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/e2e/stickerLaminate.html?count=5&side=160");
  await expect
    .poll(() => page.locator("canvas.sticker-laminate[data-state=ready]").count())
    .toBe(8);
  await page.waitForTimeout(200);
  const copies = await page.evaluate(async () => {
    const { refreshLaminate } = await import("../src/stickers/laminateRenderer.ts");
    Reflect.set(window, "laminateGpuCopies", 0);
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-laminate"))
      refreshLaminate(canvas);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const copies: unknown = Reflect.get(window, "laminateGpuCopies");
    if (typeof copies !== "number") throw new Error("The laminate copy counter is missing");
    return copies;
  });
  expect(
    copies,
    "Re-exposure must batch the GPU transfer rather than copying each sticker separately",
  ).toBe(1);
});

test("a single sticker turn does not shrink and reallocate the shared material buffers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const contexts = new Set<HTMLCanvasElement>();
    const allocations: { before: number; after: number }[] = [];
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function") throw new Error("The canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl") contexts.add(this);
        return context;
      },
    });
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (typeof drawImage !== "function") throw new Error("The canvas image method is missing");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (
        this: CanvasRenderingContext2D,
        source: CanvasImageSource,
        ...args: number[]
      ) {
        if (source instanceof HTMLCanvasElement && contexts.has(source)) contexts.add(this.canvas);
        Reflect.apply(drawImage, this, [source, ...args]);
      },
    });
    for (const property of ["width", "height"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
      if (!descriptor) throw new Error(`Missing canvas ${property} accessors`);
      const read: unknown = Reflect.get(descriptor, "get"),
        write: unknown = Reflect.get(descriptor, "set");
      if (typeof read !== "function" || typeof write !== "function")
        throw new Error(`Missing canvas ${property} accessors`);
      Object.defineProperty(HTMLCanvasElement.prototype, property, {
        ...descriptor,
        set: function (this: HTMLCanvasElement, value: number) {
          if (contexts.has(this)) {
            const before: unknown = Reflect.apply(read, this, []);
            if (typeof before !== "number")
              throw new Error(`The canvas ${property} value is not a number`);
            allocations.push({ before, after: value });
          }
          Reflect.apply(write, this, [value]);
        },
      });
    }
    Reflect.set(window, "laminateBufferAllocations", allocations);
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/e2e/stickerLaminate.html?count=5&side=160");
  await expect
    .poll(() => page.locator("canvas.sticker-laminate[data-state=ready]").count())
    .toBe(8);
  await page.evaluate(() => {
    window.laminateFixture.tilt(40, 0);
  });
  await page.waitForTimeout(800);
  const snapshot = () =>
    page.locator('[data-sticker="0"] canvas.sticker-laminate').evaluate(async (element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The sticker snapshot is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The sticker snapshot context is unavailable");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        context.getImageData(0, 0, element.width, element.height).data,
      );
      return [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    });
  const before = await snapshot();
  await page.evaluate(() => {
    const allocations: unknown = Reflect.get(window, "laminateBufferAllocations");
    if (!Array.isArray(allocations)) throw new Error("No laminate allocation observations");
    allocations.length = 0;
    window.laminateFixture.flight(12, 8);
    window.laminateFixture.tilt(45, 5);
  });
  await page.waitForTimeout(800);
  const allocations = await page.evaluate(() => {
    const result: unknown = Reflect.get(window, "laminateBufferAllocations");
    if (!Array.isArray(result)) throw new Error("No laminate allocation observations");
    return result.map((entry: unknown) => {
      if (!entry || typeof entry !== "object")
        throw new Error("A laminate allocation observation is invalid");
      const before: unknown = Reflect.get(entry, "before"),
        after: unknown = Reflect.get(entry, "after");
      if (typeof before !== "number" || typeof after !== "number")
        throw new Error("A laminate allocation observation has invalid dimensions");
      return { before, after };
    });
  });
  expect(allocations.filter(({ before, after }) => after < before)).toEqual([]);
  await expect(page.locator("canvas.sticker-laminate[data-state=ready]")).toHaveCount(8);
  await page.evaluate(() => {
    window.laminateFixture.tilt(40, 0);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.laminateFixture.flight(0, 0));
  expect(
    await snapshot(),
    "An individual redraw must copy the same pixels from the retained taller atlas",
  ).toBe(before);
});

test("a board of stickers retains complete paper during a sustained small tilt", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/e2e/stickerLaminate.html?count=24&side=120");
  await expect
    .poll(() => page.locator("canvas.sticker-laminate[data-state=ready]").count())
    .toBe(27);
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await page.waitForTimeout(800);
  const result = await page.evaluate(async () => {
    const fixture = window.laminateFixture;
    const paper = document.querySelector("[data-white] canvas.sticker-laminate");
    if (!(paper instanceof HTMLCanvasElement)) throw new Error("The paper snapshot is missing");
    const context = paper.getContext("2d");
    if (!context) throw new Error("The paper snapshot context is unavailable");
    fixture.costs.length = 0;
    const intervals: number[] = [];
    let lastTime = performance.now(),
      missingPaper = 0,
      changedFrames = 0;
    let lastPose = fixture.getPose();
    for (let frame = 0; frame < 180; frame++) {
      const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      intervals.push(now - lastTime);
      lastTime = now;
      const pose = fixture.getPose();
      if (pose.x !== lastPose.x || pose.y !== lastPose.y) changedFrames++;
      lastPose = pose;
      const column = context.getImageData(
        Math.floor(paper.width / 2),
        Math.floor(paper.height * 0.1),
        1,
        Math.floor(paper.height * 0.8),
      ).data;
      for (let channel = 3; channel < column.length; channel += 4)
        if (column[channel] !== 255) missingPaper++;
      fixture.tilt(40 + 5 * Math.cos(frame / 24), 8 * Math.sin(frame / 24));
    }
    const costs = [...fixture.costs];
    fixture.tilt(40, 0);
    return { intervals, costs, missingPaper, changedFrames, displayedFrames: 180 };
  });
  const summarize = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      count: samples.length,
      meanMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    };
  };
  const report = {
    engine: info.project.name,
    displayedFrames: result.displayedFrames,
    changedFrames: result.changedFrames,
    missingPaper: result.missingPaper,
    renderer: summarize(result.costs),
    display: summarize(result.intervals.slice(1)),
  };
  await info.attach("laminate-frame-measurements", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log("Laminate frame measurements", JSON.stringify(report));
  expect(result.missingPaper, "Paper must stay opaque during repeated sensor updates").toBe(0);
  expect(
    result.changedFrames,
    "The coating should follow display frames rather than a CSS throttle",
  ).toBeGreaterThanOrEqual(135);
  await page.waitForTimeout(1000);
  const held = await page.evaluate(() => window.laminateFixture.getPose());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(held);
});
