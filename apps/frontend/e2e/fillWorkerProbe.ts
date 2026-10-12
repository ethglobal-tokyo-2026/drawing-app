import type { Page } from "@playwright/test";

interface FillWorkerSnapshot {
  workers: { id: number; url: string; type: string; terminated: boolean }[];
  requests: {
    worker: number;
    id: number;
    ordinal: number;
    beforeBytes: number[];
    afterBytes: number[];
    uniqueTransfers: boolean;
  }[];
  responses: {
    worker: number;
    id: number;
    kind: string;
    typedPixels: boolean;
    typedMarks: boolean;
    typedSpans: boolean;
    written: boolean;
    gated: boolean;
  }[];
  retained: number;
  delivered: number;
}
interface FillWorkerControls {
  read: () => FillWorkerSnapshot;
  arm: (ordinal: number) => void;
  release: () => void;
  clear: () => void;
}
declare global {
  interface Window {
    fillWorkerProbe?: FillWorkerControls;
  }
}

/** Observes real module workers and optionally holds one genuine answer's original callback. */
export async function installFillWorkerProbe(page: Page) {
  await page.addInitScript(() => {
    const nativeWorker = window.Worker;
    const workers: FillWorkerSnapshot["workers"] = [];
    const requests: FillWorkerSnapshot["requests"] = [];
    const responses: FillWorkerSnapshot["responses"] = [];
    const ordinals = new Map<string, number>();
    let gate: number | null = null;
    let delivered = 0;
    let held: {
      event: MessageEvent<unknown>;
      handler: (this: Worker, event: MessageEvent) => unknown;
      worker: Worker;
    } | null = null;
    const record = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null;
    window.Worker = class extends nativeWorker {
      private readonly probeId: number | null;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.probeId = String(url).includes("sticker-creation/canvas/fill-worker/")
          ? workers.length + 1
          : null;
        const workerId = this.probeId;
        if (workerId === null) return;
        workers.push({
          id: workerId,
          url: String(url),
          type: options?.type ?? "classic",
          terminated: false,
        });
        this.addEventListener("message", (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (!record(data) || typeof data.id !== "number")
            throw new Error("Native Fill response has no request ID");
          const result = record(data.result) ? data.result : null;
          const pixels = result && record(result.pixels) ? result.pixels : null;
          const found = result && record(result.found) ? result.found : null;
          const written = result && record(result.written) ? result.written : null;
          const box = found && record(found.box) ? found.box : null;
          const gated = ordinals.get(`${workerId}:${data.id}`) === gate;
          responses.push({
            worker: workerId,
            id: data.id,
            kind: typeof result?.kind === "string" ? result.kind : String(data.type),
            typedPixels:
              pixels?.data instanceof Uint8ClampedArray &&
              typeof pixels.width === "number" &&
              typeof pixels.height === "number" &&
              pixels.data.length === pixels.width * pixels.height * 4,
            typedMarks:
              found?.marks instanceof Uint8Array &&
              typeof box?.w === "number" &&
              typeof box.h === "number" &&
              found.marks.length === box.w * box.h,
            typedSpans:
              result?.interiorSpans instanceof Uint32Array &&
              result.interiorSpans.length > 0 &&
              result.interiorSpans.length % 3 === 0,
            written:
              written?.spans instanceof Uint32Array &&
              written.colors instanceof Uint32Array &&
              written.spans.length > 0 &&
              written.spans.length % 3 === 0 &&
              written.colors.length > 0 &&
              written.colors.length % 2 === 0,
            gated,
          });
          if (!gated) return;
          if (held) throw new Error("The Fill probe already holds an answer");
          if (!this.onmessage) throw new Error("Native Fill answer has no original callback");
          held = { event, handler: this.onmessage, worker: this };
          event.stopImmediatePropagation();
        });
      }
      override postMessage(
        message: unknown,
        transferOrOptions?: Transferable[] | StructuredSerializeOptions,
      ): void {
        const post: unknown = Reflect.get(nativeWorker.prototype, "postMessage");
        if (typeof post !== "function") throw new Error("Native Worker postMessage is unavailable");
        const args: unknown[] =
          transferOrOptions === undefined ? [message] : [message, transferOrOptions];
        if (this.probeId === null) {
          Reflect.apply(post, this, args);
          return;
        }
        if (!record(message) || typeof message.id !== "number")
          throw new Error("Native Fill request has no ID");
        const transfer = Array.isArray(transferOrOptions)
          ? transferOrOptions
          : (transferOrOptions?.transfer ?? []);
        const buffers = transfer.filter((item): item is ArrayBuffer => item instanceof ArrayBuffer);
        const ordinal = requests.length + 1;
        ordinals.set(`${this.probeId}:${message.id}`, ordinal);
        const beforeBytes = buffers.map((buffer) => buffer.byteLength);
        Reflect.apply(post, this, args);
        requests.push({
          worker: this.probeId,
          id: message.id,
          ordinal,
          beforeBytes,
          afterBytes: buffers.map((buffer) => buffer.byteLength),
          uniqueTransfers: new Set(buffers).size === buffers.length,
        });
      }
      override terminate(): void {
        const worker = workers.find((worker) => worker.id === this.probeId);
        if (worker) worker.terminated = true;
        super.terminate();
      }
    };
    window.fillWorkerProbe = {
      read: () => ({
        workers: workers.map((worker) => ({ ...worker })),
        requests: requests.map((request) => ({
          ...request,
          beforeBytes: [...request.beforeBytes],
          afterBytes: [...request.afterBytes],
        })),
        responses: responses.map((response) => ({ ...response })),
        retained: held ? 1 : 0,
        delivered,
      }),
      arm(ordinal) {
        if (!Number.isSafeInteger(ordinal) || ordinal < 1)
          throw new Error("Fill gate needs a positive request ordinal");
        gate = ordinal;
      },
      release() {
        const answer = held;
        if (!answer) throw new Error("Fill gate has no native answer");
        held = null;
        delivered++;
        answer.handler.call(answer.worker, answer.event);
      },
      clear() {
        held = null;
        gate = null;
      },
    };
  });
}
export const readFillWorkerProbe = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillWorkerProbe) throw new Error("Fill worker probe is missing");
    return window.fillWorkerProbe.read();
  });
export const armFillWorkerGate = (page: Page, requestOrdinal: number) =>
  page.evaluate((ordinal) => {
    if (!window.fillWorkerProbe) throw new Error("Fill worker probe is missing");
    window.fillWorkerProbe.arm(ordinal);
  }, requestOrdinal);
export const releaseFillWorkerGate = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillWorkerProbe) throw new Error("Fill worker probe is missing");
    window.fillWorkerProbe.release();
  });
export const clearFillWorkerGate = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillWorkerProbe) throw new Error("Fill worker probe is missing");
    window.fillWorkerProbe.clear();
  });
