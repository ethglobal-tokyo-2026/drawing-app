import { SAME_COLOR } from "../../../apps/frontend/src/sticker-creation/canvas/fill";
import { boundedFrame } from "../../../apps/frontend/src/sticker-creation/canvas/sheetFrame";
import { LayerInk } from "../../../apps/frontend/src/sticker-creation/layers/layerInk";
import { LayerDisplay } from "../../../apps/frontend/src/sticker-creation/layers/layerDisplay";
import { verifyWetPreview } from "./previewProbe";

// This probe deliberately uses private adapters to measure existing canvas operations unchanged.
// It is disposable research code, not a product worker or gesture controller.
const frame = boundedFrame({ w: 374, h: 823, density: 4 });
const paint = [255, 104, 116];
const color = "#ff6874";
let worker: Worker | null = null;
let requestId = 0;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

function request(input: any): Promise<any> {
  worker ??= new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const current = worker;
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      current.terminate();
      worker = null;
      reject(new Error("Spike region request exceeded 1000 ms"));
    }, 1000);
    const cleanup = () => {
      clearTimeout(timer);
      current.removeEventListener("message", answer);
      current.removeEventListener("error", failed);
    };
    const answer = (event: MessageEvent) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.kind === "error") reject(new Error(event.data.message));
      else resolve(event.data);
    };
    const failed = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message));
    };
    current.addEventListener("message", answer);
    current.addEventListener("error", failed);
    const buffers = new Set([input.shown.data.buffer, input.target.data.buffer]);
    try {
      current.postMessage({ ...input, id }, [...buffers]);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function setup(name: string) {
  const ink: any = new LayerInk();
  ink.setFrame(frame);
  const count = name === "tenLayers" ? 10 : name === "grid" ? 2 : 1;
  const state = {
    layers: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      opacity: name === "tenLayers" && i < 9 ? 75 : 100,
      locked: false,
      clipped: name === "tenLayers" && i === 2,
    })),
    nextId: count + 1,
  };
  ink.show(state);
  const { width, height } = ink;
  const draw = (id: number, work: (g: CanvasRenderingContext2D) => void) => {
    const own = ink.writable(id);
    own.g.save();
    own.g.setTransform(1, 0, 0, 1, 0, 0);
    work(own.g);
    own.g.restore();
    own.box = { x: 0, y: 0, w: frame.w, h: frame.h };
  };
  const grid = (g: CanvasRenderingContext2D) => {
    g.fillStyle = "#17212c";
    const thickness = Math.ceil(frame.density * 3);
    for (let i = 0; i <= 10; i++) {
      g.fillRect(Math.min(width - thickness, Math.floor((i * width) / 10)), 0, thickness, height);
      g.fillRect(0, Math.min(height - thickness, Math.floor((i * height) / 10)), width, thickness);
    }
  };
  if (name === "grid") draw(1, grid);
  if (name === "tenLayers") {
    for (let id = 1; id <= 9; id++)
      draw(id, (g) => {
        g.fillStyle = `rgba(${40 + id * 4},80,110,0.25)`;
        g.fillRect(0, 0, width, height);
      });
    draw(10, grid);
  }
  if (name === "heldLayer")
    draw(1, (g) => {
      g.fillStyle = "rgba(20,30,40,0.06)";
      g.fillRect(0, 0, width, height);
    });
  if (name === "noOp")
    draw(1, (g) => {
      g.fillStyle = color;
      g.fillRect(0, 0, width, height);
    });
  const targetLayer = count;
  const reference = name === "grid" || name === "tenLayers" ? "visible" : "layer";
  const seeds =
    name === "grid"
      ? Array.from({ length: 100 }, (_, i) => {
          const row = Math.floor(i / 10),
            column = row % 2 ? 9 - (i % 10) : i % 10;
          return {
            x: Math.floor(((column + 0.5) * width) / 10),
            y: Math.floor(((row + 0.5) * height) / 10),
          };
        })
      : [{ x: Math.floor(width / 2), y: Math.floor(height / 2) }];
  return { ink, state, targetLayer, reference, seeds, width, height };
}

function canvasBytes(ink: any): number {
  const canvases = new Set<HTMLCanvasElement>();
  for (const own of ink.inks.values()) canvases.add(own.canvas);
  for (const copy of ink.copies) canvases.add(copy.canvas);
  if (ink.reader) canvases.add(ink.reader.canvas);
  if (ink.clipper) canvases.add(ink.clipper.canvas);
  return [...canvases].reduce((sum, canvas) => sum + canvas.width * canvas.height * 4, 0);
}

// Temporary enumeration duplicates only the current adaptive read schedule, never the flood itself.
function* areas(width: number, height: number, sx: number, sy: number) {
  for (let n = 0, side = Math.round(160 * frame.density); n < 3; n++, side *= 2) {
    const half = Math.floor(side / 2),
      x = Math.max(0, sx - half),
      y = Math.max(0, sy - half);
    const at = {
      x,
      y,
      w: Math.min(width, sx + half + 1) - x,
      h: Math.min(height, sy + half + 1) - y,
    };
    if (n > 0 && at.w * at.h * 2 >= width * height) break;
    yield {
      at,
      cut: { left: x > 0, top: y > 0, right: x + at.w < width, bottom: y + at.h < height },
    };
  }
  yield { at: { x: 0, y: 0, w: width, h: height }, cut: undefined };
}

async function run(caseName: string, iteration: number, verify = false) {
  const name = caseName === "tenLayersReleasedScratch" ? "tenLayers" : caseName;
  const releaseScratchBeforeInstall = caseName === "tenLayersReleasedScratch";
  if (iteration === 0) {
    worker?.terminate();
    worker = null;
  }
  const surface = setup(name);
  const { ink, state, width, height, reference, targetLayer } = surface;
  const host = document.createElement("div");
  host.style.cssText = "position:relative;width:374px;height:823px;background:white";
  document.body.append(host);
  const display: any = new LayerDisplay(host, ink);
  display.show(state, targetLayer);
  await nextFrame();
  if ((name === "blank" || name === "heldLayer") && iteration % 2)
    surface.seeds[0] = { x: width - 8, y: height - 8 };
  const visits = new Uint8Array(width * height);
  const held = name === "heldLayer" || name === "tenLayers" ? ink.hold(targetLayer) : null;
  const metrics: any = {
    width,
    height,
    backingPixels: width * height,
    totalMs: 0,
    firstFillMs: 0,
    drainMs: 0,
    readMs: 0,
    installMs: 0,
    displayMs: 0,
    firstFrameOpportunityMs: 0,
    workerMs: 0,
    roundTripOverheadMs: 0,
    maxMainSliceMs: 0,
    inputHandlerMaxMs: 0,
    requests: 0,
    patchReads: 0,
    readCalls: 0,
    readPixels: 0,
    cacheReads: 0,
    peakCanvasBytes: canvasBytes(ink),
    peakArrayBytesEstimate: visits.byteLength,
    copyCountPeak: 0,
    restoreMs: 0,
    frameGapMaxMs: 0,
    longTaskMaxMs: 0,
    longTaskSupported: PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false,
    failures: [],
  };
  const ids = state.layers.map((layer: any) => layer.id);
  const measure = <T>(field: string, work: () => T): T => {
    const start = performance.now();
    const value = work();
    const elapsed = performance.now() - start;
    metrics[field] += elapsed;
    metrics.maxMainSliceMs = Math.max(metrics.maxMainSliceMs, elapsed);
    return value;
  };
  const readReference = (at: any) =>
    measure("readMs", () => {
      metrics.readCalls++;
      metrics.readPixels += at.w * at.h;
      const own = ink.inks.get(targetLayer);
      return reference === "visible"
        ? ink.readShown(state, ids, at)
        : own
          ? ink.readLayer(own, at)
          : new ImageData(at.w, at.h);
    });
  const readTarget = (at: any) =>
    measure("readMs", () => {
      const own = ink.inks.get(targetLayer);
      if (own) {
        metrics.readCalls++;
        metrics.readPixels += at.w * at.h;
        return ink.readLayer(own, at);
      }
      return new ImageData(at.w, at.h);
    });
  const updateMemory = (arrays = 0) => {
    metrics.peakCanvasBytes = Math.max(metrics.peakCanvasBytes, canvasBytes(ink));
    metrics.peakArrayBytesEstimate = Math.max(
      metrics.peakArrayBytesEstimate,
      visits.byteLength + 65536 + arrays,
    );
    metrics.copyCountPeak = Math.max(metrics.copyCountPeak, ink.copiesHeld);
  };
  let cache: { at: any; pixels: ImageData } | null = null;
  const pixel = (x: number, y: number) => {
    if (
      !cache ||
      x < cache.at.x ||
      y < cache.at.y ||
      x >= cache.at.x + cache.at.w ||
      y >= cache.at.y + cache.at.h
    ) {
      const tx = Math.floor(x / 128) * 128,
        ty = Math.floor(y / 128) * 128;
      const at = { x: tx, y: ty, w: Math.min(128, width - tx), h: Math.min(128, height - ty) };
      cache = { at, pixels: readReference(at) };
      metrics.cacheReads++;
      updateMemory();
    }
    const p = ((y - cache.at.y) * cache.at.w + x - cache.at.x) * 4;
    return Array.from(cache.pixels.data.subarray(p, p + 4));
  };
  let observer: PerformanceObserver | null = null;
  if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        metrics.longTaskMaxMs = Math.max(metrics.longTaskMaxMs, entry.duration);
    });
    observer.observe({ type: "longtask" });
  }
  let tracking = true,
    lastFrame: number | null = null;
  const track = (time: number) => {
    if (!tracking) return;
    if (lastFrame !== null)
      metrics.frameGapMaxMs = Math.max(metrics.frameGapMaxMs, time - lastFrame);
    lastFrame = time;
    requestAnimationFrame(track);
  };
  requestAnimationFrame(track);
  const started = performance.now();
  let firstFilled = false,
    releasedAt = started;
  let firstFrame: Promise<void> | null = null;
  const ops: any[] = [];
  try {
    if (name === "noOp") {
      for (let i = 0; i < 5000; i++) {
        const t = (i % 2500) / 2499,
          x = Math.min(width - 1, Math.floor(t * width)),
          y = Math.min(height - 1, Math.floor(t * height));
        const start = performance.now();
        const value = pixel(x, y);
        const distance =
          Math.abs(value[0] - paint[0]) +
          Math.abs(value[1] - paint[1]) +
          Math.abs(value[2] - paint[2]);
        if (!(value[3] >= 128 && distance < SAME_COLOR))
          throw new Error("No-op fixture was not the paint color");
        metrics.maxMainSliceMs = Math.max(metrics.maxMainSliceMs, performance.now() - start);
        if (i % 256 === 255) await nextFrame();
      }
    } else {
      const queue: any[] = [];
      let produced = false;
      const produce = async () => {
        for (let i = 0; i < surface.seeds.length; i += 8) {
          if (i) await nextFrame();
          const start = performance.now();
          queue.push(...surface.seeds.slice(i, i + 8));
          metrics.inputHandlerMaxMs = Math.max(
            metrics.inputHandlerMaxMs,
            performance.now() - start,
          );
        }
        produced = true;
        releasedAt = performance.now();
      };
      const producer = produce();
      let initial: number[] | null = null;
      while (!produced || queue.length) {
        const seed = queue.shift();
        if (!seed) {
          await nextFrame();
          continue;
        }
        if (visits[seed.y * width + seed.x]) continue;
        const value = pixel(seed.x, seed.y);
        initial ??= value;
        const eligible =
          initial[3] < 128
            ? value[3] < 128
            : value[3] >= 128 &&
              Math.abs(value[0] - initial[0]) +
                Math.abs(value[1] - initial[1]) +
                Math.abs(value[2] - initial[2]) <
                72;
        if (!eligible) continue;
        if (
          value[3] >= 128 &&
          Math.abs(value[0] - paint[0]) +
            Math.abs(value[1] - paint[1]) +
            Math.abs(value[2] - paint[2]) <
            SAME_COLOR
        )
          continue;
        const op = {
          tool: "fill",
          layer: targetLayer,
          reference,
          color,
          gap: 2,
          x: seed.x / frame.density,
          y: seed.y / frame.density,
          T: 0,
        };
        for (const { at, cut } of areas(width, height, seed.x, seed.y)) {
          const beforeRead = performance.now();
          const shown = readReference(at);
          const target = reference === "layer" ? shown : readTarget(at);
          metrics.maxMainSliceMs = Math.max(metrics.maxMainSliceMs, performance.now() - beforeRead);
          metrics.patchReads++;
          updateMemory(
            (shown.data.buffer === target.data.buffer ? 1 : 2) * at.w * at.h * 4 + at.w * at.h,
          );
          const sent = performance.now();
          metrics.requests++;
          const answer = await request({
            shown,
            target,
            at,
            cut,
            sx: seed.x - at.x,
            sy: seed.y - at.y,
            color: paint,
            gap: 2 * frame.density,
            locked: false,
          });
          const roundTrip = performance.now() - sent;
          metrics.workerMs += answer.workerMs;
          metrics.roundTripOverheadMs += Math.max(0, roundTrip - answer.workerMs);
          if (answer.kind === "past") continue;
          if (answer.kind === "empty") break;
          if (answer.target.data.length !== at.w * at.h * 4)
            throw new Error("Worker returned invalid target dimensions");
          measure("installMs", () => {
            const pixels = new ImageData(answer.target.data, at.w, at.h);
            if (answer.written) {
              if (releaseScratchBeforeInstall && held) ink.releaseScratch();
              ink.put(targetLayer, pixels, at, answer.found.box, false);
              cache = null;
              ops.push(op);
              measure("displayMs", () => {
                display.showCurrent();
                display.inkChanged(answer.written.box);
              });
            }
            for (let s = 0; s < answer.interior.length; s += 3)
              visits.fill(
                1,
                answer.interior[s] * width + answer.interior[s + 1],
                answer.interior[s] * width + answer.interior[s + 2],
              );
          });
          updateMemory(
            answer.target.data.byteLength +
              answer.found.marks.byteLength +
              answer.interior.byteLength +
              (answer.written?.spans.byteLength ?? 0) +
              (answer.written?.colors.byteLength ?? 0),
          );
          if (!firstFilled && answer.written) {
            firstFilled = true;
            metrics.firstFillMs = performance.now() - started;
            firstFrame = nextFrame().then(() => {
              metrics.firstFrameOpportunityMs = performance.now() - started;
            });
          }
          break;
        }
      }
      await producer;
    }
    const completed = performance.now();
    metrics.totalMs = completed - started;
    metrics.drainMs = Math.max(0, completed - releasedAt);
    metrics.changedRegions = ops.length;
    const displayCanvases = [
      display.below.canvas,
      display.above.canvas,
      display.wet.canvas,
      display.view.canvas,
    ];
    metrics.actualDisplayCanvasBytes = displayCanvases.reduce(
      (sum, canvas) => sum + canvas.width * canvas.height * 4,
      0,
    );
    metrics.peakKnownRawCanvasBytes = metrics.peakCanvasBytes + metrics.actualDisplayCanvasBytes;
    metrics.estimatedCanvasBytesWithProductDisplay =
      metrics.peakCanvasBytes + 8 * width * height * 4;
    if (name === "grid" && ops.length !== 100)
      metrics.failures.push(`Grid changed ${ops.length} cells, expected 100`);
    if (name === "noOp" && metrics.requests !== 0)
      metrics.failures.push("No-op traversal dispatched worker requests");
    // Let the mounted preview survive a paint opportunity before reading or rolling it back.
    await firstFrame;
    await nextFrame();
    let selected: Uint8ClampedArray | null = null,
      composite: Uint8ClampedArray | null = null;
    if (verify) {
      const own = ink.inks.get(targetLayer);
      selected = own
        ? own.g.getImageData(0, 0, width, height).data
        : new Uint8ClampedArray(width * height * 4);
      const rendered = ink.composite(state);
      composite = rendered.getContext("2d")!.getImageData(0, 0, width, height).data;
      rendered.width = rendered.height = 1;
    }
    if (held) {
      measure("restoreMs", () => ink.restore(targetLayer, held));
      cache = null;
      display.showCurrent();
      display.inkChanged({ x: 0, y: 0, w: width, h: height });
      ink.release(held);
      if (ink.copiesHeld !== 0) metrics.failures.push("Touch hold retained a canvas after release");
    }
    await nextFrame();
    return { metrics, selected, composite, ops, seeds: surface.seeds };
  } finally {
    tracking = false;
    observer?.disconnect();
    if (held && !held.released) ink.release(held);
    display.release();
    host.remove();
    ink.releaseAll();
  }
}

async function verifyFillSpike() {
  const failures: string[] = [],
    cases: any[] = [];
  for (const name of [
    "blank",
    "grid",
    "tenLayers",
    "tenLayersReleasedScratch",
    "heldLayer",
    "noOp",
  ]) {
    const live = await run(name, 0, true);
    const expected = setup(name === "tenLayersReleasedScratch" ? "tenLayers" : name);
    try {
      for (const op of live.ops) expected.ink.flood(op, expected.state);
      const own = expected.ink.inks.get(expected.targetLayer);
      const selected = own
        ? own.g.getImageData(0, 0, expected.width, expected.height).data
        : new Uint8ClampedArray(expected.width * expected.height * 4);
      const rendered = expected.ink.composite(expected.state);
      const composite = rendered
        .getContext("2d")!
        .getImageData(0, 0, expected.width, expected.height).data;
      const compare = (a: Uint8ClampedArray, b: Uint8ClampedArray, label: string) => {
        if (a.length !== b.length) {
          failures.push(`${name} ${label} lengths differ`);
          return;
        }
        for (let i = 0; i < a.length; i++)
          if (a[i] !== b[i]) {
            failures.push(`${name} ${label} byte ${i}: ${a[i]} versus ${b[i]}`);
            break;
          }
      };
      compare(live.selected!, selected, "selected layer");
      compare(live.composite!, composite, "composite");
      failures.push(...live.metrics.failures);
      if (name === "grid") {
        for (const { x, y } of live.seeds)
          if (selected[(y * expected.width + x) * 4 + 3] !== 255)
            failures.push("Grid center was not painted opaque");
        const edge =
          (Math.floor(expected.height / 20) * expected.width + Math.floor(expected.width / 10)) * 4;
        if (composite[edge] !== 23 || composite[edge + 1] !== 33 || composite[edge + 2] !== 44)
          failures.push("Grid boundary changed color");
      }
      rendered.width = rendered.height = 1;
      cases.push({
        name,
        changedRegions: live.ops.length,
        exactSelectedPixels: !failures.some((f) => f.startsWith(`${name} selected`)),
        exactCompositePixels: !failures.some((f) => f.startsWith(`${name} composite`)),
      });
    } finally {
      expected.ink.releaseAll();
    }
  }
  return {
    cases,
    failures,
    limitation:
      "Known center seeds exercise a sequential queue; no production pointer interpolation, history, sealing, or touch rollback controller is implemented.",
  };
}

Object.assign(window, {
  verifyFillSpike,
  verifyWetPreview,
  runFillSpike: async (name: string, iteration: number) => (await run(name, iteration)).metrics,
});
