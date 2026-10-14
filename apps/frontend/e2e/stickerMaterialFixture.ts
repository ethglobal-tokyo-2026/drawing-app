import type { Locator, Page, Route } from "@playwright/test";

/** Required browser resources fail at their allocation site in the complete-finish checks. */
export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("The complete-finish fixture resource is unavailable");
  return value;
}

/** Resolves two animation frames later: the renderer's shared frame queue has run, then the next. */
export const twoFrames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

/** The same wait, from the test's side. */
export const waitTwoFrames = (page: Page) => page.evaluate(twoFrames);

/** A PNG data URL, transparent but for `color` filling all of it inside `inset` pixels. */
export function solidPng(width: number, height: number, color: string, inset = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = required(canvas.getContext("2d"));
  context.fillStyle = color;
  context.fillRect(inset, inset, width - 2 * inset, height - 2 * inset);
  const url = canvas.toDataURL();
  canvas.width = canvas.height = 0;
  return url;
}

/** An SVG answer for a route: one rectangle of `fill` covering the whole image. */
export const solidSvg = (fill: string, width = 240, height = width) => ({
  contentType: "image/svg+xml",
  body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${fill}"/></svg>`,
});

/** Serves the laminate fixture's address as an empty page, for tests that mount their own stickers. */
export const emptyLaminatePage = (page: Page) =>
  page.route("**/e2e/stickerLaminate.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>',
    }),
  );

/** Holds every request for `url` until `release()`, then answers each with `answer`. */
export async function holdRoute(
  page: Page,
  url: string,
  answer: (route: Route) => Parameters<Route["fulfill"]>[0],
) {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let notify = () => {};
  const requested = new Promise<void>((resolve) => {
    notify = resolve;
  });
  const hold = { requests: 0, requested, release };
  await page.route(url, async (route) => {
    hold.requests++;
    notify();
    await released;
    await route.fulfill(answer(route));
  });
  return hold;
}

/** Holds every flyer with this class 100 ms into its flight, until the test finishes it. */
export function holdFlyers(flyer: string) {
  const animate: unknown = Reflect.get(Element.prototype, "animate");
  if (typeof animate !== "function") throw new Error("The native flight animation is missing");
  Element.prototype.animate = function (frames, timing) {
    const animation: unknown = Reflect.apply(animate, this, [frames, timing]);
    if (!(animation instanceof Animation))
      throw new Error("The native flight animation was not created");
    if (this.classList.contains(flyer)) {
      animation.pause();
      animation.currentTime = 100;
    }
    return animation;
  };
}

/** Holds those flyers on every page this test opens. */
export const holdFlights = (page: Page, flyer: "detail-lift__flyer" | "tray__flyer") =>
  page.addInitScript(holdFlyers, flyer);

/** Lets a held flyer's flight finish. */
export const land = (flyer: Locator) =>
  flyer.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.finish();
  });

/** Independent cut read, placed in the committed output frame before inspecting exposed foil. */
export async function registeredPaperAlpha(canvas: HTMLCanvasElement) {
  const { stickerFoilCoverage } = await import("../src/stickers/stickerRenderer.ts");
  const description = required(stickerFoilCoverage(canvas));
  const coverage = description.coverage;
  const response = await fetch(description.cut, { signal: AbortSignal.timeout(5000) });
  if (!response.ok)
    throw new Error(`Reading the comparison cut ${description.cut} answered ${response.status}`);
  const cut = await createImageBitmap(await response.blob());
  const mask = new OffscreenCanvas(canvas.width, canvas.height);
  const context = required(mask.getContext("2d"));
  try {
    context.drawImage(
      cut,
      (-coverage.x / coverage.width) * canvas.width,
      (-coverage.y / coverage.height) * canvas.height,
      (coverage.sourceWidth / coverage.width) * canvas.width,
      (coverage.sourceHeight / coverage.height) * canvas.height,
    );
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    cut.close();
    mask.width = mask.height = 0;
  }
}

/** Counts the foil coverage worker's jobs for `url`, holding them until released when asked. */
export function watchCoverageJobs(url: string, hold = false) {
  const post: unknown = Reflect.get(Worker.prototype, "postMessage");
  if (typeof post !== "function") throw new Error("Worker messaging is unavailable");
  const target = new URL(url, document.baseURI).href;
  const held: (() => void)[] = [];
  const watch = { jobs: 0, release, restore };
  function release() {
    hold = false;
    for (const send of held.splice(0)) send();
  }
  function restore() {
    release();
    Object.defineProperty(Worker.prototype, "postMessage", { value: post, writable: true });
  }
  Object.defineProperty(Worker.prototype, "postMessage", {
    writable: true,
    value(this: Worker, ...args: unknown[]) {
      const job: unknown = Reflect.get(Object(args[0]), "job");
      const send = () => {
        Reflect.apply(post, this, args);
      };
      if (typeof job !== "object" || job === null || Reflect.get(job, "url") !== target) send();
      else {
        watch.jobs++;
        if (hold) held.push(send);
        else send();
      }
    },
  });
  return watch;
}
