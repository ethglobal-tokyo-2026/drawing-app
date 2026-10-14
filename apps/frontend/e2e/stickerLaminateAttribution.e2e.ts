import { expect, test, type CDPSession } from "@playwright/test";
import { writeFile } from "node:fs/promises";

declare global {
  interface Window {
    stickerLaminateAttributionTrace?: (action: "start" | "end") => Promise<void>;
  }
}

async function diagnosticDeadline<T>(operation: Promise<T>, milliseconds: number, failure: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(failure)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function readAttributionTrace(trace: CDPSession, handle: string) {
  const chunks: string[] = [];
  const until = performance.now() + 10_000;
  const failures: unknown[] = [];
  try {
    while (true) {
      const left = until - performance.now();
      if (left <= 0) throw new Error("Reading the foil trace exceeded 10 seconds");
      const chunk = await diagnosticDeadline(
        trace.send("IO.read", { handle }),
        left,
        "Reading the foil trace exceeded 10 seconds",
      );
      chunks.push(
        chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data,
      );
      if (chunk.eof) break;
    }
  } catch (error) {
    failures.push(error);
  }
  try {
    await diagnosticDeadline(
      trace.send("IO.close", { handle }),
      5000,
      "Closing the foil trace exceeded 5 seconds",
    );
  } catch (error) {
    failures.push(error);
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      `Reading or closing the attribution trace failed: ${failures.map(String).join("; ")}`,
    );
  return chunks.join("");
}

test.use({
  viewport: { width: 1200, height: 1454 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

test("attribute a fresh cold startup before navigation through settled materials", async ({
  page,
}, info) => {
  test.skip(
    process.env.STICKER_STARTUP_ATTRIBUTION !== "on",
    "Explicit cold-start diagnostic; no frame-rate qualification",
  );
  test.skip(info.project.name !== "chromium", "The cold-start CPU profile requires Chrome CDP");
  await page.setViewportSize({ width: 1200, height: 1454 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const capture: Record<string, unknown> = {
    engine: info.project.name,
    stickerCount: 21,
    diagnosticOnly: true,
    errors,
    exportFailures: [] as string[],
  };
  const exportFailures: string[] = [];
  capture.exportFailures = exportFailures;
  let trace: CDPSession | undefined;
  let tracing = false;
  let profiling = false;
  await page.addInitScript(() => {
    let active = true;
    let last = performance.now();
    const phase = () => window.stickerBoardDragFixture?.phase ?? "navigation";
    const result = {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      frames: [] as { time: number; interval: number; phase: string }[],
      operations: [] as {
        operation: string;
        time: number;
        milliseconds: number;
        phase: string;
        canvas?: number;
        kind?: string;
        width?: number;
        height?: number;
        stack?: string;
      }[],
      loads: [] as {
        time: number;
        phase: string;
        event: string;
        width: number;
        height: number;
        sourceKind: string;
      }[],
      marks: [] as { name: string; time: number }[],
      settled: false,
    };
    Reflect.set(window, "stickerColdStartupAttribution", result);
    const canvases = new WeakMap<HTMLCanvasElement, number>();
    const kinds = new WeakMap<HTMLCanvasElement, string>();
    let nextCanvas = 1;
    const canvasOf = (canvas: HTMLCanvasElement) => {
      let id = canvases.get(canvas);
      if (!id) {
        id = nextCanvas++;
        canvases.set(canvas, id);
      }
      return id;
    };
    const measure = (
      operation: string,
      action: () => unknown,
      canvas?: HTMLCanvasElement,
      kind?: string,
    ) => {
      const started = performance.now();
      try {
        return action();
      } finally {
        if (active) {
          const elapsed = performance.now() - started;
          result.operations.push({
            operation,
            time: started,
            milliseconds: elapsed,
            phase: phase(),
            ...(canvas && {
              canvas: canvasOf(canvas),
              kind: kind ?? kinds.get(canvas),
              width: canvas.width,
              height: canvas.height,
            }),
            stack: new Error().stack,
          });
        }
      }
    };
    for (const name of [
      "compileShader",
      "linkProgram",
      "getShaderParameter",
      "getProgramParameter",
      "getError",
      "texImage2D",
      "texSubImage2D",
      "clear",
      "drawArrays",
    ] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(WebGLRenderingContext.prototype, name);
      const method: unknown = descriptor?.value;
      if (!descriptor || typeof method !== "function")
        throw new Error(`The native GL ${name} method is unavailable`);
      Object.defineProperty(WebGLRenderingContext.prototype, name, {
        ...descriptor,
        value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          return measure(
            `GL.${name}`,
            () => {
              const returned: unknown = Reflect.apply(method, this, args);
              return returned;
            },
            this.canvas instanceof HTMLCanvasElement ? this.canvas : undefined,
            "webgl",
          );
        },
      });
    }
    const contextDescriptor = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
    );
    const getContext: unknown = contextDescriptor?.value;
    if (!contextDescriptor || typeof getContext !== "function")
      throw new Error("The native canvas context method is unavailable");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      ...contextDescriptor,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        kinds.set(this, kind);
        return measure(
          `canvas.getContext(${kind})`,
          () => {
            const returned: unknown = Reflect.apply(getContext, this, [kind, ...args]);
            return returned;
          },
          this,
          kind,
        );
      },
    });
    for (const name of ["width", "height"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, name);
      const set: unknown = descriptor && Reflect.get(descriptor, "set");
      if (!descriptor || typeof set !== "function")
        throw new Error(`The native canvas ${name} setter is unavailable`);
      Object.defineProperty(HTMLCanvasElement.prototype, name, {
        ...descriptor,
        set: function (this: HTMLCanvasElement, value: number) {
          measure(
            `canvas.${name}`,
            () => {
              const returned: unknown = Reflect.apply(set, this, [value]);
              return returned;
            },
            this,
          );
        },
      });
    }
    const copyDescriptor = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      "drawImage",
    );
    const copy: unknown = copyDescriptor?.value;
    if (!copyDescriptor || typeof copy !== "function")
      throw new Error("The native canvas copy method is unavailable");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      ...copyDescriptor,
      value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        return measure(
          "canvas.drawImage",
          () => {
            const returned: unknown = Reflect.apply(copy, this, args);
            return returned;
          },
          this.canvas,
          "2d",
        );
      },
    });
    for (const name of ["getImageData", "putImageData"] as const) {
      const method = CanvasRenderingContext2D.prototype[name];
      Object.defineProperty(CanvasRenderingContext2D.prototype, name, {
        configurable: true,
        value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          return measure(
            `canvas.${name}`,
            () => Reflect.apply(method, this, args),
            this.canvas,
            "2d",
          );
        },
      });
    }
    const encode: unknown = Reflect.get(HTMLCanvasElement.prototype, "toDataURL");
    if (typeof encode !== "function") throw new Error("The native PNG encoder is missing");
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      const result: unknown = measure(
        "canvas.toDataURL",
        () => Reflect.apply(encode, this, args),
        this,
        "2d",
      );
      if (typeof result !== "string") throw new Error("The PNG encoder returned no image");
      return result;
    };
    const assetWaits: {
      operation: string;
      url: string;
      start: number;
      end: number;
      stack?: string;
      failure?: string;
    }[] = [];
    Reflect.set(window, "stickerAssetWaits", assetWaits);
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const stack = new Error().stack ?? "";
      const caller = stack.includes("prepareStickerFoil")
        ? "static"
        : stack.includes("stickerRenderer")
          ? "renderer"
          : "other";
      const coverageKeys = stack.includes("foilCoverageImage")
        ? (window.stickerBoardDragFixture?.assets() ?? [])
            .filter((asset) => asset.urls.mask === url || asset.urls.foil === url)
            .map((asset) => {
              const figure = document.querySelector<HTMLElement>(`[data-sticker-id="${asset.id}"]`);
              const foil = figure?.querySelector<HTMLElement>(".sticker-foil");
              const surface = figure?.querySelector<HTMLElement>(
                caller === "static" ? ".sticker-foil" : ".sticker-material-surface",
              );
              if (!foil || !surface)
                throw new Error("A coverage acquisition has no matching presentation");
              return {
                id: asset.id,
                cut: asset.urls.mask,
                mask: asset.urls.foil ?? null,
                style: ["holo", "pink", "kyoto-seika"].find((style) =>
                  foil.classList.contains(`sticker-foil--${style}`),
                ),
                size: "board",
                width: surface.clientWidth,
                height: surface.clientHeight,
                caller,
              };
            })
        : [];
      const entry = {
        operation: "fetch",
        phase: phase(),
        coverageKeys,
        url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        start: performance.now(),
        end: 0,
        stack: new Error().stack,
        failure: undefined as string | undefined,
      };
      try {
        return await originalFetch(input, init);
      } catch (error) {
        entry.failure = String(error);
        throw error;
      } finally {
        entry.end = performance.now();
        assetWaits.push(entry);
      }
    };
    const decode: unknown = Reflect.get(HTMLImageElement.prototype, "decode");
    if (typeof decode !== "function") throw new Error("The native image decoder is missing");
    HTMLImageElement.prototype.decode = async function () {
      const entry = {
        operation: "decode",
        url: this.src,
        start: performance.now(),
        end: 0,
        stack: new Error().stack,
        failure: undefined as string | undefined,
      };
      try {
        await Reflect.apply(decode, this, []);
      } catch (error) {
        entry.failure = String(error);
        throw error;
      } finally {
        entry.end = performance.now();
        assetWaits.push(entry);
      }
    };
    for (const name of ["load", "error"] as const)
      document.addEventListener(
        name,
        (event) => {
          if (active && event.target instanceof HTMLImageElement) {
            const image = event.target;
            result.loads.push({
              time: performance.now(),
              phase: phase(),
              event: name,
              width: image.naturalWidth,
              height: image.naturalHeight,
              sourceKind: image.src.startsWith("blob:")
                ? "blob"
                : image.src.startsWith("data:")
                  ? "data"
                  : "URL",
            });
          }
        },
        true,
      );
    const sample = (now: number) => {
      if (!active) return;
      result.frames.push({ time: now, interval: now - last, phase: phase() });
      last = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    Reflect.set(window, "finishStickerColdStartupAttribution", () => {
      active = false;
      result.marks = performance
        .getEntriesByType("mark")
        .map((entry) => ({ name: entry.name, time: entry.startTime }));
      result.settled = true;
      return result;
    });
  });
  try {
    trace = await diagnosticDeadline(
      page.context().newCDPSession(page),
      5000,
      "Creating the startup CDP session exceeded 5 seconds",
    );
    await diagnosticDeadline(
      trace.send("Profiler.enable"),
      5000,
      "Enabling the startup CPU profile exceeded 5 seconds",
    );
    await diagnosticDeadline(
      trace.send("Profiler.setSamplingInterval", { interval: 1000 }),
      5000,
      "Setting the startup CPU sampling interval exceeded 5 seconds",
    );
    await diagnosticDeadline(
      trace.send("Profiler.start"),
      5000,
      "Starting the startup CPU profile exceeded 5 seconds",
    );
    profiling = true;
    await diagnosticDeadline(
      trace.send("Tracing.start", {
        transferMode: "ReturnAsStream",
        categories:
          "devtools.timeline,blink,cc,blink.user_timing,v8,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.cpu_profiler.hires",
      }),
      5000,
      "Starting the cold-start trace exceeded 5 seconds",
    );
    tracing = true;
    await page.goto("/e2e/stickerBoardDrag.html?variant=mixed-21");
    await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(21);
    await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
    const originalWidth = await page
      .locator("[data-sticker-id=large-drag-1]")
      .evaluate((element: HTMLElement) => parseFloat(element.style.width));
    for (const width of [originalWidth - 1, originalWidth]) {
      await page.evaluate((width) => {
        window.stickerBoardDragFixture.setPhase("startup");
        const target = document.querySelector<HTMLElement>("[data-sticker-id='large-drag-1']");
        if (!target) throw new Error("The resize target is missing");
        target.style.width = `${width}px`;
      }, width);
      await page.evaluate(async () => {
        await new Promise<number>(requestAnimationFrame);
        await new Promise<number>(requestAnimationFrame);
      });
      await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
      await expect
        .poll(() =>
          page
            .locator("[data-sticker-id=large-drag-1] .sticker-foil")
            .evaluate((element: HTMLElement) =>
              parseFloat(element.style.getPropertyValue("--foil-print-pitch")),
            ),
        )
        .toBeCloseTo(width / 80, 5);
    }
    await page.evaluate(() => window.stickerBoardDragFixture.setPhase("stationary-hold"));
    await page.waitForTimeout(250);
    capture.assetWaits = await page.evaluate((): unknown =>
      Reflect.get(window, "stickerAssetWaits"),
    );
    await page.evaluate(async () => {
      await new Promise<number>(requestAnimationFrame);
      await new Promise<number>(requestAnimationFrame);
      const finish: unknown = Reflect.get(window, "finishStickerColdStartupAttribution");
      if (typeof finish !== "function")
        throw new Error("The cold-start frame sampler is unavailable");
      Reflect.apply(finish, window, []);
    });
    expect(errors).toEqual([]);
  } catch (error) {
    capture.failure = String(error);
    throw error;
  } finally {
    if (trace) {
      if (profiling)
        try {
          const profile: unknown = await diagnosticDeadline(
            trace.send("Profiler.stop"),
            5000,
            "Stopping the startup CPU profile exceeded 5 seconds",
          );
          const path = info.outputPath("sticker-cold-startup-cpu-profile.json");
          await writeFile(path, JSON.stringify(profile), "utf8");
          capture.cpuProfilePath = path;
          await info.attach("sticker-cold-startup-cpu-profile", {
            path,
            contentType: "application/json",
          });
        } catch (error) {
          exportFailures.push(String(error));
        }
      if (tracing)
        try {
          const complete = new Promise<string>((resolve, reject) => {
            trace?.once("Tracing.tracingComplete", ({ stream }: { stream?: string }) => {
              if (stream) resolve(stream);
              else reject(new Error("Chrome returned no cold-start trace stream"));
            });
          });
          await diagnosticDeadline(
            trace.send("Tracing.end"),
            5000,
            "Stopping the cold-start trace exceeded 5 seconds",
          );
          const handle = await diagnosticDeadline(
            complete,
            5000,
            "Completing the cold-start trace exceeded 5 seconds",
          );
          const body = await readAttributionTrace(trace, handle);
          const path = info.outputPath("sticker-cold-startup-chrome-trace.json");
          await writeFile(path, body, "utf8");
          capture.tracePath = path;
          await info.attach("sticker-cold-startup-chrome-trace", {
            path,
            contentType: "application/json",
          });
        } catch (error) {
          exportFailures.push(String(error));
        }
      try {
        await diagnosticDeadline(
          trace.detach(),
          5000,
          "Detaching the startup CDP session exceeded 5 seconds",
        );
      } catch (error) {
        exportFailures.push(String(error));
      }
    }
    if (!page.isClosed())
      try {
        capture.result = await page.evaluate(() => {
          const result: unknown = Reflect.get(window, "stickerColdStartupAttribution");
          return result;
        });
      } catch (error) {
        exportFailures.push(String(error));
      }
    const path = info.outputPath("sticker-cold-startup-attribution.json");
    await writeFile(path, JSON.stringify(capture, null, 2), "utf8");
    await info.attach("sticker-cold-startup-attribution", {
      path,
      contentType: "application/json",
    });
    console.log("Cold startup attribution capture", path);
    console.log("Cold startup attribution export failures", JSON.stringify(exportFailures));
  }
});

test("attribute complete 21-sticker motion and fenced GL work", async ({ page }, info) => {
  test.skip(
    process.env.STICKER_ATTRIBUTION !== "on",
    "Explicit diagnostic; no frame-rate qualification",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const capture: Record<string, unknown> = { engine: info.project.name, errors };
  const traceFailures: string[] = [];
  capture.traceFailures = traceFailures;
  const trace = info.project.name === "chromium" ? await page.context().newCDPSession(page) : null;
  let traceActive = false;
  let traceStream: string | undefined;
  const endTrace = async () => {
    if (!trace || !traceActive) return;
    const completed = new Promise<string>((resolve, reject) => {
      trace.once("Tracing.tracingComplete", ({ stream }: { stream?: string }) => {
        if (stream) resolve(stream);
        else reject(new Error("Chrome returned no foil trace stream"));
      });
    });
    await diagnosticDeadline(
      trace.send("Tracing.end"),
      5000,
      "Chrome did not stop foil tracing in 5 seconds",
    );
    traceActive = false;
    traceStream = await diagnosticDeadline(
      completed,
      5000,
      "Chrome did not complete the foil trace in 5 seconds",
    );
  };
  if (trace)
    await page.exposeFunction("stickerLaminateAttributionTrace", async (action: string) => {
      try {
        if (action === "start") {
          await diagnosticDeadline(
            trace.send("Tracing.start", {
              transferMode: "ReturnAsStream",
              categories: "devtools.timeline,blink,cc,blink.user_timing",
            }),
            5000,
            "Chrome did not begin foil tracing in 5 seconds",
          );
          traceActive = true;
        } else if (action === "end") await endTrace();
        else throw new Error(`Unknown attribution trace action: ${action}`);
      } catch (error) {
        // Optional tracing failure is retained while the component measurements can still complete.
        traceFailures.push(String(error));
        console.warn("Foil trace failed", String(error));
      }
    });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", { value: 0, configurable: true });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    if (typeof window.DeviceMotionEvent !== "function")
      throw new Error("The motion permission stand-in requires DeviceMotionEvent");
    Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
    const descriptor = Object.getOwnPropertyDescriptor(WebGLRenderingContext.prototype, "clear");
    const original: unknown = descriptor?.value;
    if (!descriptor || typeof original !== "function")
      throw new Error("The native WebGL clear method is unavailable");
    const contexts: WebGLRenderingContext[] = [];
    Reflect.set(window, "stickerLaminateAttributionContexts", contexts);
    Reflect.set(window, "restoreStickerMaterialAttributionClear", () =>
      Object.defineProperty(WebGLRenderingContext.prototype, "clear", descriptor),
    );
    Object.defineProperty(WebGLRenderingContext.prototype, "clear", {
      ...descriptor,
      value: function (this: WebGLRenderingContext, ...args: unknown[]) {
        if (!contexts.includes(this)) contexts.push(this);
        Reflect.apply(original, this, args);
      },
    });
  });
  try {
    await page.goto("/e2e/stickerBoardDrag.html?variant=mixed-21");
    await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(21);
    await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
    expect(await page.locator(".sticker-crease").count()).toBeGreaterThanOrEqual(13);
    expect(await page.evaluate(() => window.stickerBoardDragFixture.askForMotion())).toBe(
      "granted",
    );
    const result = await page.evaluate(async () => {
      const fixture = window.stickerBoardDragFixture;
      fixture.setPhase("idle");
      fixture.tilt(40, 0, 123);
      const contexts: unknown = Reflect.get(window, "stickerLaminateAttributionContexts");
      const restoreClear: unknown = Reflect.get(window, "restoreStickerMaterialAttributionClear");
      if (
        !Array.isArray(contexts) ||
        contexts.length !== 1 ||
        !(contexts[0] instanceof WebGLRenderingContext) ||
        typeof restoreClear !== "function"
      )
        throw new Error("Attribution requires the original single laminate GL context");
      Reflect.apply(restoreClear, window, []);
      const gl = contexts[0];
      const source = gl.canvas;
      const clearDescriptor = Object.getOwnPropertyDescriptor(
        WebGLRenderingContext.prototype,
        "clear",
      );
      const drawDescriptor = Object.getOwnPropertyDescriptor(
        WebGLRenderingContext.prototype,
        "drawArrays",
      );
      const copyDescriptor = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype,
        "drawImage",
      );
      const clear: unknown = clearDescriptor?.value;
      const draw: unknown = drawDescriptor?.value;
      const copy: unknown = copyDescriptor?.value;
      if (
        !clearDescriptor ||
        !drawDescriptor ||
        !copyDescriptor ||
        typeof clear !== "function" ||
        typeof draw !== "function" ||
        typeof copy !== "function"
      )
        throw new Error("The existing drawing methods are unavailable");
      const materials = [
        ...document.querySelectorAll<HTMLCanvasElement>(".placed-sticker canvas.sticker-material"),
      ];
      const foils = [...document.querySelectorAll<HTMLElement>(".placed-sticker .sticker-foil")];
      const stickers = [...document.querySelectorAll<HTMLElement>(".placed-sticker")];
      if (materials.length !== 21 || foils.length !== 21 || stickers.length !== 21)
        throw new Error("Attribution requires all 21 original materials and foils");
      const geometry = () =>
        stickers.map((node) => {
          const box = node.getBoundingClientRect();
          return {
            id: node.dataset.stickerId,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          };
        });
      const originalGeometry = geometry();
      const diagnosticStyle = document.createElement("style");
      diagnosticStyle.dataset.stickerLaminateAttribution = "";
      document.head.append(diagnosticStyle);
      const positions = [...materials, ...foils].map((node) => {
        if (!node.parentNode) throw new Error("A material node has no original parent");
        return { node, parent: node.parentNode, next: node.nextSibling };
      });
      const restore = () => {
        for (const position of [...positions].reverse())
          position.parent.insertBefore(position.node, position.next);
      };
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      const result = {
        metadata: {
          diagnosticOnly: true,

          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          attributes: gl.getContextAttributes(),
          renderer: String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
          vendor: String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR)),
          extensions: gl.getSupportedExtensions() ?? [],
          timerQueriesUsed: false,
          normalSources: fixture.normals(),
          originalGeometry,
        },
        phases: [] as {
          name: string;
          timingAltered: boolean;
          frames: {
            interval: number;
            elapsed: number;
            inputMs: number;
            x: number;
            y: number;
            rotationDegrees: number;
            alpha: number;
            beta: number;
            gamma: number;
          }[];
          copies: { frame: number; kind: string; sticker?: string; milliseconds: number }[];
          batches: number;
          draws: number;
          fencedBatches: {
            priorDrainWallMs: number;
            submissionWallMs: number;
            finishWallMs: number;
            completionWallMs: number;
            draws: number;
            width: number;
            height: number;
          }[];
          geometry: typeof originalGeometry;
          style: string;
        }[],
        restored: false,
        stylesRestored: false,
        sameContext: false,
        sameNormalSources: false,
        errors: [] as string[],
      };
      Reflect.set(window, "stickerLaminateAttribution", result);
      let phase: (typeof result.phases)[number] | undefined;
      let frame = 0;
      let pendingBatch: { started: number; priorDrainWallMs: number; draws: number } | undefined;
      let expired = false;
      let pendingFrame: { id: number; reject: (error: Error) => void } | undefined;
      const deadline = setTimeout(() => {
        expired = true;
        if (pendingFrame) {
          cancelAnimationFrame(pendingFrame.id);
          pendingFrame.reject(new Error("The attribution phases exceeded 25 seconds"));
          pendingFrame = undefined;
        }
      }, 25_000);
      const nextFrame = () =>
        new Promise<number>((resolve, reject) => {
          if (expired) return reject(new Error("The attribution phases exceeded 25 seconds"));
          const id = requestAnimationFrame((now) => {
            pendingFrame = undefined;
            resolve(now);
          });
          pendingFrame = { id, reject };
        });
      const settle = async () => {
        fixture.tilt(40, 0, 123);
        const started = performance.now();
        while (performance.now() - started < 850) await nextFrame();
      };
      Object.defineProperty(WebGLRenderingContext.prototype, "clear", {
        ...clearDescriptor,
        value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          if (phase && this === gl) {
            phase.batches++;
            if (phase.timingAltered) {
              const priorStarted = performance.now();
              gl.finish();
              pendingBatch = {
                started: performance.now(),
                priorDrainWallMs: performance.now() - priorStarted,
                draws: 0,
              };
            }
          } else if (phase && this !== gl)
            result.errors.push("The laminate GL context changed during attribution");
          Reflect.apply(clear, this, args);
        },
      });
      Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", {
        ...drawDescriptor,
        value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          if (phase && this === gl) {
            phase.draws++;
            if (pendingBatch) pendingBatch.draws++;
          }
          Reflect.apply(draw, this, args);
        },
      });
      Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
        ...copyDescriptor,
        value: function (this: CanvasRenderingContext2D, image: unknown, ...args: unknown[]) {
          if (phase?.timingAltered && image === source && pendingBatch) {
            const finishStarted = performance.now();
            gl.finish();
            const completed = performance.now();
            phase.fencedBatches.push({
              priorDrainWallMs: pendingBatch.priorDrainWallMs,
              submissionWallMs: finishStarted - pendingBatch.started,
              finishWallMs: completed - finishStarted,
              completionWallMs: completed - pendingBatch.started,
              draws: pendingBatch.draws,
              width: source.width,
              height: source.height,
            });
            pendingBatch = undefined;
          }
          const kind =
            image === source
              ? "GL source"
              : this.canvas.classList.contains("sticker-material")
                ? "retained material"
                : undefined;
          const started = phase && kind ? performance.now() : 0;
          const returned: unknown = Reflect.apply(copy, this, [image, ...args]);
          if (phase && kind)
            phase.copies.push({
              frame,
              kind,
              sticker: this.canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId,
              milliseconds: performance.now() - started,
            });
          return returned;
        },
      });
      try {
        const phases = ["full scene", "fenced GL"] as const;
        for (const name of phases) {
          restore();
          diagnosticStyle.textContent = "";
          await settle();
          if (name === "full scene") await window.stickerLaminateAttributionTrace?.("start");
          phase = {
            name,
            timingAltered: name === "fenced GL",
            frames: [],
            copies: [],
            batches: 0,
            draws: 0,
            fencedBatches: [],
            geometry: geometry(),
            style: diagnosticStyle.textContent,
          };
          result.phases.push(phase);
          frame = 0;
          pendingBatch = undefined;
          const duration = phase.timingAltered ? 700 : 2000;
          let last = await nextFrame();
          const started = last;
          performance.mark(`sticker-material-attribution-${name}-start`);
          while (last - started < duration) {
            const now = await nextFrame();
            frame++;
            const elapsed = now - started;
            const angle = (elapsed / 2000) * Math.PI * 4;
            const beta = 40 + 5 * Math.cos(angle);
            const gamma = 5 * Math.sin(angle);
            const alpha = 123 + 3 * Math.sin(angle);
            const inputMs = fixture.tilt(beta, gamma, alpha);
            phase.frames.push({
              interval: now - last,
              elapsed,
              inputMs,
              alpha,
              beta,
              gamma,
              ...fixture.getPose(),
            });
            last = now;
          }
          performance.mark(`sticker-material-attribution-${name}-end`);
          phase = undefined;
          pendingBatch = undefined;
          if (name === "full scene") await window.stickerLaminateAttributionTrace?.("end");
        }
      } catch (error) {
        result.errors.push(String(error));
        throw error;
      } finally {
        phase = undefined;
        clearTimeout(deadline);
        if (pendingFrame) cancelAnimationFrame(pendingFrame.id);
        restore();
        diagnosticStyle.remove();
        Object.defineProperty(WebGLRenderingContext.prototype, "clear", clearDescriptor);
        Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", drawDescriptor);
        Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", copyDescriptor);
        result.restored = positions.every(
          ({ node, parent, next }) => node.parentNode === parent && node.nextSibling === next,
        );
        result.stylesRestored = !diagnosticStyle.isConnected;
        result.sameContext = !gl.isContextLost();
        result.sameNormalSources =
          JSON.stringify(fixture.normals()) === JSON.stringify(result.metadata.normalSources);
      }
      return result;
    });
    await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
    capture.result = result;
    expect(result.restored).toBe(true);
    expect(result.stylesRestored).toBe(true);
    expect(result.sameContext).toBe(true);
    expect(result.sameNormalSources).toBe(true);
    expect(result.errors).toEqual([]);
    for (const phase of result.phases) {
      expect(phase.geometry).toEqual(result.metadata.originalGeometry);
      expect(phase.frames.length).toBeGreaterThan(0);
      expect(phase.draws).toBeGreaterThan(0);
      expect(
        phase.copies.filter((copy: { kind: string }) => copy.kind === "retained material").length,
      ).toBeGreaterThan(0);
      if (phase.timingAltered) expect(phase.fencedBatches.length).toBe(phase.batches);
      else expect(phase.fencedBatches).toEqual([]);
      const intervals = phase.frames
        .map((frame: { interval: number }) => frame.interval)
        .toSorted((a: number, b: number) => a - b);
      console.log(
        "Laminate attribution",
        JSON.stringify({
          engine: info.project.name,
          phase: phase.name,
          timingAltered: phase.timingAltered,
          displayFrameCount: intervals.length,
          p95DisplayFrameMs: intervals[Math.floor(intervals.length * 0.95)],
          maximumDisplayFrameMs: Math.max(...intervals),
          batches: phase.batches,
          draws: phase.draws,
          GLSourceCopies: phase.copies.filter((copy: { kind: string }) => copy.kind === "GL source")
            .length,
          retainedMaterialCopies: phase.copies.filter(
            (copy: { kind: string }) => copy.kind === "retained material",
          ).length,
        }),
      );
    }
    expect(errors).toEqual([]);
  } catch (error) {
    capture.failure = String(error);
    throw error;
  } finally {
    if (trace) {
      try {
        await endTrace();
        if (traceStream) {
          const body = await readAttributionTrace(trace, traceStream);
          const tracePath = info.outputPath("sticker-foil-attribution-chrome-trace.json");
          await writeFile(tracePath, body, "utf8");
          capture.tracePath = tracePath;
          await info.attach("sticker-foil-attribution-chrome-trace", {
            path: tracePath,
            contentType: "application/json",
          });
        }
      } catch (error) {
        traceFailures.push(String(error));
        console.warn("Exporting foil trace failed", String(error));
      } finally {
        try {
          await diagnosticDeadline(
            trace.detach(),
            5000,
            "Detaching the foil trace exceeded 5 seconds",
          );
        } catch (error) {
          traceFailures.push(String(error));
          console.warn("Detaching foil trace failed", String(error));
        }
      }
    }
    if (!page.isClosed()) {
      try {
        capture.result = await page.evaluate(() => {
          const observed: unknown = Reflect.get(window, "stickerLaminateAttribution");
          return observed;
        });
      } catch (error) {
        capture.exportFailure = String(error);
      }
    }
    const path = info.outputPath("sticker-material-attribution.json");
    await writeFile(path, JSON.stringify(capture, null, 2), "utf8");
    await info.attach("sticker-material-attribution", { path, contentType: "application/json" });
    console.log("Laminate attribution capture", path);
  }
});
