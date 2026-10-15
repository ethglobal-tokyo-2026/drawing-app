import { expect, test } from "@playwright/test";
import {
  checkStickerFrameBudget,
  displayMilliseconds as milliseconds,
  stickerDisplayBudget,
} from "./stickerPerformance.ts";

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

test("simultaneous observer callbacks and re-exposure share one material batch and one copy per sticker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observers: (() => void)[] = [];
    Reflect.set(window, "laminateObserverCallbacks", observers);
    const Resize = window.ResizeObserver;
    window.ResizeObserver = class extends Resize {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observers.push(() => callback([], this));
      }
    };
    const Intersection = window.IntersectionObserver;
    window.IntersectionObserver = class extends Intersection {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        observers.push(() =>
          callback(
            [
              {
                boundingClientRect: new DOMRect(),
                intersectionRect: new DOMRect(),
                intersectionRatio: 1,
                isIntersecting: true,
                rootBounds: null,
                target: document.body,
                time: performance.now(),
              },
            ],
            this,
          ),
        );
      }
    };
    const gpu = new Set<HTMLCanvasElement>();
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
    const observations = { batches: 0, draws: 0, copies: new Map<HTMLCanvasElement, number>() };
    Reflect.set(window, "laminateCopyObservations", observations);
    const clear: unknown = Reflect.get(WebGLRenderingContext.prototype, "clear");
    const drawArrays: unknown = Reflect.get(WebGLRenderingContext.prototype, "drawArrays");
    if (typeof clear !== "function" || typeof drawArrays !== "function")
      throw new Error("The GPU drawing methods are missing");
    Object.defineProperty(WebGLRenderingContext.prototype, "clear", {
      configurable: true,
      value: function (this: WebGLRenderingContext, ...args: unknown[]) {
        observations.batches++;
        Reflect.apply(clear, this, args);
      },
    });
    Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", {
      configurable: true,
      value: function (this: WebGLRenderingContext, ...args: unknown[]) {
        observations.draws++;
        Reflect.apply(drawArrays, this, args);
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
        if (this.canvas.classList.contains("sticker-material"))
          observations.copies.set(this.canvas, (observations.copies.get(this.canvas) ?? 0) + 1);
        Reflect.apply(drawImage, this, [source, ...args]);
      },
    });
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/e2e/stickerLaminate.html?count=5&side=160");
  await expect
    .poll(() => page.locator("canvas.sticker-material[data-state=ready]").count())
    .toBe(8);
  await page.waitForTimeout(200);
  const copies = await page.evaluate(async () => {
    const { refreshSticker } = await import("../src/stickers/stickerRenderer.ts");
    const observations: unknown = Reflect.get(window, "laminateCopyObservations");
    if (!observations || typeof observations !== "object")
      throw new Error("The laminate copy observations are missing");
    const copies: unknown = Reflect.get(observations, "copies");
    if (!(copies instanceof Map)) throw new Error("The per-sticker copy counts are missing");
    Reflect.set(observations, "batches", 0);
    Reflect.set(observations, "draws", 0);
    copies.clear();
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-material"))
      refreshSticker(canvas);
    const observers: unknown = Reflect.get(window, "laminateObserverCallbacks");
    if (!Array.isArray(observers)) throw new Error("The laminate observers were not captured");
    for (const entry of observers) {
      const callback: unknown = entry;
      if (typeof callback !== "function") throw new Error("A laminate observer is not callable");
      Reflect.apply(callback, undefined, []);
    }
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const batches: unknown = Reflect.get(observations, "batches");
    const draws: unknown = Reflect.get(observations, "draws");
    if (typeof batches !== "number" || typeof draws !== "number")
      throw new Error("The material batch counts are missing");
    return {
      batches,
      draws,
      copies: [...copies.values()],
    };
  });
  expect(copies.batches, "Repeated observer requests must coalesce into one shared GL batch").toBe(
    1,
  );
  expect(copies.draws).toBe(8);
  expect(copies.copies).toEqual(Array<number>(8).fill(1));
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
    .poll(() => page.locator("canvas.sticker-material[data-state=ready]").count())
    .toBe(8);
  await page.evaluate(() => {
    window.laminateFixture.tilt(40, 0);
  });
  await page.waitForTimeout(800);
  const snapshot = () =>
    page.locator('[data-sticker="0"] canvas.sticker-material').evaluate(async (element) => {
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
  await expect(page.locator("canvas.sticker-material[data-state=ready]")).toHaveCount(8);
  await page.evaluate(() => {
    window.laminateFixture.tilt(40, 0);
  });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    window.laminateFixture.flight(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  expect(
    await snapshot(),
    "An individual redraw must copy the same pixels from the retained taller GL buffer",
  ).toBe(before);
});

test("a board of stickers retains complete paper during a sustained small tilt", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const observations = { batches: 0, draws: 0, copies: new Map<HTMLCanvasElement, number>() };
    Reflect.set(window, "laminateCadenceObservations", observations);
    for (const [method, counter] of [
      ["clear", "batches"],
      ["drawArrays", "draws"],
    ] as const) {
      const draw: unknown = Reflect.get(WebGLRenderingContext.prototype, method);
      if (typeof draw !== "function") throw new Error(`The GPU ${method} method is missing`);
      Object.defineProperty(WebGLRenderingContext.prototype, method, {
        configurable: true,
        value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          observations[counter]++;
          Reflect.apply(draw, this, args);
        },
      });
    }
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (typeof drawImage !== "function") throw new Error("The canvas image method is missing");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (this.canvas.classList.contains("sticker-material"))
          observations.copies.set(this.canvas, (observations.copies.get(this.canvas) ?? 0) + 1);
        Reflect.apply(drawImage, this, args);
      },
    });
  });
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/e2e/stickerLaminate.html?count=24&side=120");
  await expect
    .poll(() => page.locator("canvas.sticker-material[data-state=ready]").count())
    .toBe(27);
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await page.waitForTimeout(800);
  const result = await page.evaluate(async () => {
    const fixture = window.laminateFixture;
    const paper = document.querySelector("[data-white] canvas.sticker-material");
    if (!(paper instanceof HTMLCanvasElement)) throw new Error("The paper snapshot is missing");
    const context = paper.getContext("2d");
    if (!context) throw new Error("The paper snapshot context is unavailable");
    const observations: unknown = Reflect.get(window, "laminateCadenceObservations");
    if (!observations || typeof observations !== "object")
      throw new Error("The laminate cadence observations are missing");
    const copyCounts: unknown = Reflect.get(observations, "copies");
    if (!(copyCounts instanceof Map)) throw new Error("The laminate copy counts are missing");
    const eligible = [
      ...document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-material[data-state=ready]"),
    ].filter((canvas) => {
      const box = canvas.getBoundingClientRect();
      return (
        canvas.clientWidth > 0 &&
        canvas.clientHeight > 0 &&
        box.bottom >= 0 &&
        box.top <= innerHeight &&
        box.right >= 0 &&
        box.left <= innerWidth
      );
    });
    const counters = () => {
      const batches: unknown = Reflect.get(observations, "batches"),
        draws: unknown = Reflect.get(observations, "draws");
      if (typeof batches !== "number" || typeof draws !== "number")
        throw new Error("The laminate batch counts are missing");
      return {
        batches,
        draws,
        copies: eligible.map((canvas) => {
          const count: unknown = copyCounts.get(canvas) ?? 0;
          if (typeof count !== "number") throw new Error("A laminate copy count is invalid");
          return count;
        }),
      };
    };
    let previous = counters();
    const publications: { batches: number; draws: number; copies: number[] }[] = [];
    // Registered after the renderer, this observes the completed work for each shared publication.
    const unsubscribe = fixture.subscribeLight(() => {
      const current = counters();
      publications.push({
        batches: current.batches - previous.batches,
        draws: current.draws - previous.draws,
        copies: current.copies.map((count, index) => count - previous.copies[index]),
      });
      previous = current;
    });
    fixture.costs.length = 0;
    const intervals: number[] = [];
    const framePublications: number[] = [];
    let sampledPublications = 0;
    let lastTime = performance.now(),
      missingPaper = 0,
      changedFrames = 0;
    let lastPose = fixture.getPose();
    for (let frame = 0; frame < 180; frame++) {
      const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      intervals.push(now - lastTime);
      lastTime = now;
      framePublications.push(publications.length - sampledPublications);
      sampledPublications = publications.length;
      const pose = fixture.getPose();
      if (
        pose.beta !== lastPose.beta ||
        pose.gamma !== lastPose.gamma ||
        pose.screenAngle !== lastPose.screenAngle
      )
        changedFrames++;
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
    unsubscribe();
    const costs = [...fixture.costs];
    fixture.tilt(40, 0);
    return {
      intervals,
      costs,
      missingPaper,
      changedFrames,
      displayedFrames: 180,
      eligible: eligible.length,
      publications,
      framePublications,
    };
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
    publishedFrames: result.publications.length,
    eligibleStickers: result.eligible,
    publicationMismatches: result.publications.flatMap((publication, index) =>
      publication.batches !== 1 ||
      publication.draws !== result.eligible ||
      publication.copies.some((count) => count !== 1)
        ? [{ index, ...publication }]
        : [],
    ),
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
  expect(result.eligible).toBe(27);
  expect(
    result.publications.length,
    "The sustained tilt must publish changed light poses",
  ).toBeGreaterThan(0);
  expect(
    result.framePublications.every((count) => count <= 1),
    "The shared light must publish at most once per displayed frame",
  ).toBe(true);
  // Tiny targets may correctly stay below the hand-tremor threshold. Every pose that is published
  // must still render in that publication, without an additional CSS or renderer frame throttle.
  expect(report.publicationMismatches).toEqual([]);
  await page.waitForTimeout(1000);
  const held = await page.evaluate(() => window.laminateFixture.getPose());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(held);
});

for (const [presentation, count, side] of [
  ["board", 24, 120],
  ["detail", 1, 360],
] as const) {
  test(`a loaded sticker ${presentation} follows rotation within the display frame budget`, async ({
    page,
  }, info) => {
    test.skip(
      !checkStickerFrameBudget,
      "Display frame budgets require explicit hardware qualification",
    );
    await page.addInitScript(() => {
      const work = { geometryMs: 0, transferMs: 0 };
      Reflect.set(window, "laminateWork", work);
      const bounds: unknown = Reflect.get(Element.prototype, "getBoundingClientRect");
      if (typeof bounds !== "function") throw new Error("The geometry method is unavailable");
      Element.prototype.getBoundingClientRect = function () {
        const started = performance.now();
        const result: unknown = Reflect.apply(bounds, this, []);
        if (!(result instanceof DOMRect)) throw new Error("The canvas geometry is unavailable");
        if (this instanceof HTMLCanvasElement && this.classList.contains("sticker-material"))
          work.geometryMs += performance.now() - started;
        return result;
      };
      const copy: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
      if (typeof copy !== "function") throw new Error("The canvas image method is unavailable");
      Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
        configurable: true,
        value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          const started = performance.now();
          Reflect.apply(copy, this, args);
          work.transferMs += performance.now() - started;
        },
      });
      const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
      if (typeof getContext !== "function") throw new Error("The canvas context method is missing");
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
          const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
          if (kind === "webgl" && context instanceof WebGLRenderingContext) {
            const debug = context.getExtension("WEBGL_debug_renderer_info");
            Reflect.set(
              window,
              "laminateGpuRenderer",
              context.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
            );
          }
          return context;
        },
      });
    });
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(
      `/e2e/stickerLaminate.html?count=${count}&side=${side}&${presentation}=1&foil=1`,
    );
    await expect
      .poll(() => page.locator("canvas.sticker-material[data-state=ready]").count())
      .toBe(count);
    expect(await page.locator(".sticker-figure.is-stuck").count()).toBe(
      presentation === "board" ? count : 0,
    );
    await page.evaluate(() => window.laminateFixture.tilt(40, 0, 123));
    await page.waitForTimeout(800);
    // Reading GPU-backed pixels every frame introduces a synchronous readback. Coverage is checked
    // separately above; this budget measures the actual displayed motion without that probe.
    const measurements = await page.evaluate(async (displayBudget) => {
      const baseline: number[] = [];
      let steady = performance.now();
      for (let frame = 0; frame < 45; frame++) {
        const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        baseline.push(now - steady);
        steady = now;
      }
      const baselineP95 = baseline.slice(1).toSorted((a, b) => a - b)[
        Math.floor((baseline.length - 1) * 0.95)
      ];
      const renderer: unknown = Reflect.get(window, "laminateGpuRenderer");
      if (typeof renderer !== "string" || /SwiftShader|llvmpipe|software/i.test(renderer))
        throw new Error(
          `Sticker performance qualification refused: hardware GPU unavailable (${String(renderer)})`,
        );
      if (Math.round(baselineP95 * 1000) / 1000 > displayBudget.p95Ms)
        throw new Error(
          `Sticker performance qualification refused: idle display p95 is ${baselineP95}ms, above ${displayBudget.p95Ms}ms`,
        );
      window.laminateFixture.costs.length = 0;
      const work: unknown = Reflect.get(window, "laminateWork");
      if (!work || typeof work !== "object" || !("geometryMs" in work) || !("transferMs" in work))
        throw new Error("The laminate timing phases are unavailable");
      work.geometryMs = 0;
      work.transferMs = 0;
      const samples: number[] = [];
      let last = performance.now();
      for (let frame = 0; frame < 120; frame++) {
        const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        samples.push(now - last);
        last = now;
        window.laminateFixture.tilt(
          40 + 5 * Math.cos(frame / 24),
          5 * Math.sin(frame / 24),
          123 + 2 * Math.sin(frame / 24),
        );
      }
      const costs = [...window.laminateFixture.costs];
      window.laminateFixture.tilt(40, 0, 123);
      const gpu: unknown = Reflect.get(window, "laminateGpuRenderer");
      return { intervals: samples.slice(1), baseline: baseline.slice(1), costs, gpu, work };
    }, stickerDisplayBudget);
    const { intervals } = measurements;
    const sorted = intervals.toSorted((a, b) => a - b);
    const report = {
      engine: info.project.name,
      presentation,
      meanMs: intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length,
      p95Ms: milliseconds(sorted[Math.floor(sorted.length * 0.95)]),
      maximumMs: milliseconds(Math.max(...intervals)),
      baselineP95Ms: measurements.baseline.toSorted((a, b) => a - b)[
        Math.floor(measurements.baseline.length * 0.95)
      ],
      rendererMeanMs:
        measurements.costs.reduce((sum, cost) => sum + cost, 0) / measurements.costs.length,
      rendererP95Ms: measurements.costs.toSorted((a, b) => a - b)[
        Math.floor(measurements.costs.length * 0.95)
      ],
      gpu: measurements.gpu,
      work: measurements.work,
    };
    await info.attach("display-frame-budget", {
      body: JSON.stringify(report),
      contentType: "application/json",
    });
    console.log("Sticker display frame budget", JSON.stringify(report));
    expect(
      report.p95Ms,
      "At least 95% of display frames must meet a 60fps minimum",
    ).toBeLessThanOrEqual(stickerDisplayBudget.p95Ms);
    expect(
      report.maximumMs,
      "Rotation must not stall the display for more than 50ms",
    ).toBeLessThanOrEqual(stickerDisplayBudget.maximumMs);
  });
}
