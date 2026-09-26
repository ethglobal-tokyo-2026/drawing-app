// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CutSticker } from "./cutSticker";
import { makeSticker } from "./makeSticker";
import type { SealReply, SealRequest } from "./sealWorker";

// happy-dom has no 2D canvas: this one reads every sheet as blank and paints nothing.
vi.mock("../canvas/context2d", () => ({
  context2d: (canvas: HTMLCanvasElement) => ({
    getImageData: () => new ImageData(canvas.width, canvas.height),
    putImageData: () => {},
  }),
}));

/** The sealing worker, which each test answers for. */
class FakeWorker {
  static started: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<SealReply>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  sent: { request: SealRequest; transfer: Transferable[] } | null = null;
  stopped = false;
  constructor() {
    FakeWorker.started.push(this);
  }
  postMessage(request: SealRequest, transfer: Transferable[]) {
    this.sent = { request, transfer };
  }
  terminate() {
    this.stopped = true;
  }
}

const answer = (reply: SealReply) => new MessageEvent("message", { data: reply });

const hasWorker = () => vi.stubGlobal("Worker", FakeWorker);
// happy-dom's own OffscreenCanvas has no 2D context.
const canPaintOffscreen = () =>
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      getContext() {
        return {};
      }
    },
  );

/** Starts a seal where the browser can cut in a worker, and returns that worker. */
async function sealInWorker() {
  hasWorker();
  canPaintOffscreen();
  const sealing = makeSticker(document.createElement("canvas"));
  const worker = await vi.waitFor(() => {
    const [started] = FakeWorker.started;
    if (!started) throw new Error("no worker started yet");
    return started;
  });
  return { sealing, worker };
}

const png = () => new Blob([], { type: "image/png" });
const CUT: CutSticker = {
  png: png(),
  flat: png(),
  layers: {
    plain: png(),
    tint: png(),
    gloss: png(),
    shadow: png(),
    mask: png(),
    spec: png(),
    rim: png(),
  },
  maskPixels: new Uint8ClampedArray(3 * 2 * 4),
  outline: "M0 0L3 0L3 2Z",
  width: 3,
  height: 2,
  pad: 0,
  inkWidth: 300,
  place: { x: 10, y: 20, w: 30, h: 20 },
  contour: [
    [10, 20],
    [40, 20],
    [40, 40],
  ],
};

beforeEach(() => {
  FakeWorker.started = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("makeSticker", () => {
  it.each<[string, () => void]>([
    ["no Worker", canPaintOffscreen],
    [
      "no OffscreenCanvas",
      () => {
        hasWorker();
        vi.stubGlobal("OffscreenCanvas", undefined);
      },
    ],
    ["an OffscreenCanvas that can't paint", hasWorker],
  ])("cuts on the main thread where there's %s", async (_, browser) => {
    browser();
    await expect(makeSticker(document.createElement("canvas"))).resolves.toBeNull();
    expect(FakeWorker.started).toHaveLength(0);
  });

  it("hands the worker the ink rather than a copy, and lets what it cut go on dispose", async () => {
    const { sealing, worker } = await sealInWorker();
    const ink = worker.sent?.request.ink;
    expect(ink).toBeInstanceOf(ImageBitmap);
    expect(worker.sent?.transfer).toEqual([ink]);

    worker.onmessage?.(answer({ ok: true, cut: CUT }));
    const sticker = await sealing;
    expect(worker.stopped).toBe(true);
    expect(sticker?.maskImage).toMatchObject({ width: CUT.width, height: CUT.height });

    const revoke = vi.spyOn(URL, "revokeObjectURL");
    sticker?.dispose();
    const revoked = revoke.mock.calls.map(([url]) => url);
    expect(revoked.toSorted()).toEqual(Object.values(sticker?.layers ?? {}).toSorted());
    expect(sticker?.maskImage).toMatchObject({ width: 0, height: 0 });
  });

  it.each<[string, (worker: FakeWorker) => void, string]>([
    [
      "the cut fails there",
      (w) => w.onmessage?.(answer({ ok: false, error: "Encoding a 3 × 2 layer as PNG failed" })),
      "Encoding a 3 × 2 layer as PNG failed",
    ],
    ["its script doesn't load", (w) => w.onerror?.(new Event("error")), "script didn't load"],
  ])("fails the seal, saying why, when %s, and stops the worker", async (_, fail, why) => {
    const { sealing, worker } = await sealInWorker();
    fail(worker);
    await expect(sealing).rejects.toThrow(why);
    expect(worker.stopped).toBe(true);
  });

  it("gives up on a worker that never answers, and stops it", async () => {
    vi.useFakeTimers();
    const { sealing, worker } = await sealInWorker();
    const failed = expect(sealing).rejects.toThrow("didn't finish");
    await vi.runAllTimersAsync();
    await failed;
    expect(worker.stopped).toBe(true);
  });
});
