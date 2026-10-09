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
/** The ink's pixels per sheet unit. */
const DENSITY = 2;

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
  const sealing = makeSticker(document.createElement("canvas"), DENSITY);
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
  sharp: null,
  flat: png(),
  layers: {
    plain: png(),
    gloss: png(),
    shadow: png(),
    mask: png(),
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
    await expect(makeSticker(document.createElement("canvas"), DENSITY)).resolves.toBeNull();
    expect(FakeWorker.started).toHaveLength(0);
  });

  it("hands the worker the ink rather than a copy, and lets what it cut go on dispose", async () => {
    const { sealing, worker } = await sealInWorker();
    const ink = worker.sent?.request.ink;
    expect(ink).toBeInstanceOf(ImageBitmap);
    expect(worker.sent?.transfer).toEqual([ink]);
    // The cut measures its border in sheet units, so the worker hears the ink's density.
    expect(worker.sent?.request.density).toBe(DENSITY);

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

  it("fails the seal, saying why, when the cut fails in the worker, and stops the worker", async () => {
    const { sealing, worker } = await sealInWorker();
    worker.onmessage?.(answer({ ok: false, error: "Encoding a 3 × 2 layer as PNG failed" }));
    await expect(sealing).rejects.toThrow("Encoding a 3 × 2 layer as PNG failed");
    expect(worker.stopped).toBe(true);
  });

  it("cuts on the main thread, and says so, when the worker's script doesn't load", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sealing, worker } = await sealInWorker();
    worker.onerror?.(new Event("error"));
    await expect(sealing).resolves.toBeNull();
    expect(worker.stopped).toBe(true);
    expect(logged).toHaveBeenCalledWith(
      "The sticker is cut on the main thread instead",
      expect.objectContaining({ message: "The sealing worker's script didn't load" }),
    );
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
