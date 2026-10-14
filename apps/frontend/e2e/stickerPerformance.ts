import type { Page, TestInfo } from "@playwright/test";
/** Display timing is an explicit hardware qualification, separate from functional regressions. */
export const checkStickerFrameBudget = process.env.STICKER_FRAME_BUDGET === "on";

/** A 60fps floor; recorded cadence still distinguishes 60Hz output from ProMotion output. */
export const stickerDisplayBudget = { p95Ms: 16.7, maximumMs: 50 } as const;

/** Remove subtraction noise such as 16.7000000000007 without changing the display budget. */
export const displayMilliseconds = (value: number) => Math.round(value * 1000) / 1000;

/** Capture the renderer actually used by this scene before its first material mounts. */
export async function observeStickerHardware(page: Page) {
  if (!checkStickerFrameBudget) return;
  await page.addInitScript(() => {
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function")
      throw new Error("The native canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl" && context instanceof WebGLRenderingContext) {
          const debug = context.getExtension("WEBGL_debug_renderer_info");
          Reflect.set(
            window,
            "stickerQualificationGpu",
            String(context.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER)),
          );
        }
        return context;
      },
    });
  });
}

/** Each scene must independently refuse software rendering and an unhealthy idle cadence. */
export async function qualifyStickerScene(page: Page, info: TestInfo, scene: string) {
  if (!checkStickerFrameBudget) return;
  const report = await page.evaluate(async () => {
    const intervals: number[] = [];
    let last = performance.now();
    for (let frame = 0; frame < 45; frame++) {
      const now = await new Promise<number>(requestAnimationFrame);
      intervals.push(now - last);
      last = now;
    }
    const samples = intervals.slice(1);
    return {
      gpu: Reflect.get(window, "stickerQualificationGpu") as unknown,
      intervals: samples,
      p95Ms: samples.toSorted((a, b) => a - b)[Math.floor(samples.length * 0.95)],
    };
  });
  await info.attach(`${scene}-hardware-idle`, {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  console.log("Sticker scene hardware/idle", scene, JSON.stringify(report));
  if (typeof report.gpu !== "string" || /SwiftShader|llvmpipe|software/i.test(report.gpu))
    throw new Error(
      `Sticker performance qualification refused: hardware GPU unavailable (${String(report.gpu)})`,
    );
  if (displayMilliseconds(report.p95Ms) > stickerDisplayBudget.p95Ms)
    throw new Error(
      `Sticker performance qualification refused: idle display p95 is ${report.p95Ms}ms, above ${stickerDisplayBudget.p95Ms}ms`,
    );
}

/** Bounded display sampling without pixel readback, including actual live flyer ownership. */
export async function startStickerMotionSample(page: Page, selector: string) {
  await page.evaluate((selector) => {
    const sample = {
      intervals: [] as number[],
      missing: 0,
      observed: 0,
      frame: 0,
      last: performance.now(),
      timeout: 0,
      expired: false,
      incomplete: [] as unknown[],
    };
    const tick = (now: number) => {
      sample.intervals.push(now - sample.last);
      sample.last = now;
      for (const canvas of document.querySelectorAll<HTMLCanvasElement>(selector)) {
        sample.observed++;
        if (canvas.dataset.state !== "ready" || !canvas.width || !canvas.height) {
          sample.missing++;
          sample.incomplete.push({
            at: now,
            state: canvas.dataset.state,
            width: canvas.width,
            height: canvas.height,
          });
        }
      }
      sample.frame = requestAnimationFrame(tick);
    };
    sample.frame = requestAnimationFrame(tick);
    sample.timeout = window.setTimeout(() => {
      sample.expired = true;
      cancelAnimationFrame(sample.frame);
    }, 20000);
    window.stickerMotionSample = sample;
  }, selector);
}
export async function finishStickerMotionSample(page: Page, info: TestInfo, scene: string) {
  const result = await page.evaluate(() => {
    const sample = window.stickerMotionSample;
    if (!sample) throw new Error("The sticker motion sample is unavailable");
    cancelAnimationFrame(sample.frame);
    clearTimeout(sample.timeout);
    delete window.stickerMotionSample;
    return {
      intervals: sample.intervals.slice(1),
      observed: sample.observed,
      missing: sample.missing,
      expired: sample.expired,
      incomplete: sample.incomplete,
    };
  });
  const report = {
    ...result,
    p95Ms: displayMilliseconds(
      result.intervals.toSorted((a, b) => a - b)[Math.floor(result.intervals.length * 0.95)],
    ),
    maximumMs: displayMilliseconds(Math.max(...result.intervals)),
  };
  await info.attach(`${scene}-display`, {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  console.log("Sticker motion display", scene, JSON.stringify(report));
  if (result.expired || !result.observed || result.missing || result.intervals.length < 60)
    throw new Error(
      `${scene} did not retain a complete live finish throughout enough display frames`,
    );
  if (
    report.p95Ms > stickerDisplayBudget.p95Ms ||
    report.maximumMs > stickerDisplayBudget.maximumMs
  )
    throw new Error(
      `${scene} exceeded unchanged display budgets: p95 ${report.p95Ms}ms, maximum ${report.maximumMs}ms`,
    );
}

declare global {
  interface Window {
    stickerMotionSample?: {
      intervals: number[];
      observed: number;
      missing: number;
      frame: number;
      timeout: number;
      last: number;
      expired: boolean;
      incomplete: unknown[];
    };
  }
}
