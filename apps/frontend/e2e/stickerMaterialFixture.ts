/** Required browser resources fail at their allocation site in the complete-finish checks. */
export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("The complete-finish fixture resource is unavailable");
  return value;
}

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
