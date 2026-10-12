import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FillPatchInput, FillWorkerRequest } from "./protocol";
import { FillWorkerService } from "./service";
import { FillError } from "./errors";
import { prepareFillPatch } from "./core";

class TestWorker {
  static made: TestWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: { preventDefault: () => void; message: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: FillWorkerRequest[] = [];
  transfers: Transferable[][] = [];
  terminate = vi.fn();
  postMessage(request: FillWorkerRequest, transfer: Transferable[]) {
    this.requests.push(structuredClone(request));
    this.transfers.push(transfer);
    structuredClone(request, { transfer });
  }
  constructor() {
    TestWorker.made.push(this);
  }
  answer(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
  complete() {
    const request = this.requests.at(-1);
    if (!request) throw new Error("Worker has no request");
    this.answer({ id: request.id, type: "complete", result: prepareFillPatch(request.input) });
  }
}
const input = (): FillPatchInput => {
  const target = { width: 2, height: 1, data: new Uint8ClampedArray(8) };
  return {
    at: { x: 0, y: 0, w: 2, h: 1 },
    shown: target,
    target,
    sx: 0,
    sy: 0,
    color: [255, 0, 0],
    gap: 0,
    locked: false,
  };
};
const worker = () => {
  const found = TestWorker.made.at(-1);
  if (!found) throw new Error("Worker was not started");
  return found;
};
beforeEach(() => {
  TestWorker.made = [];
  vi.stubGlobal("Worker", TestWorker);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fill worker service", () => {
  it("starts lazily, transfers shared pixels once, and reuses the worker", async () => {
    const service = new FillWorkerService();
    expect(TestWorker.made).toHaveLength(0);
    const patch = input();
    const pending = service.prepare(patch, performance.now() + 1000, new AbortController().signal);
    expect(patch.target.data.byteLength).toBe(0);
    expect(worker().transfers[0]).toHaveLength(1);
    worker().complete();
    const result = await pending;
    expect(result.kind).toBe("found");
    if (result.kind !== "found") throw new Error("Region not returned");
    expect([...result.pixels.data]).toEqual([255, 0, 0, 255, 255, 0, 0, 255]);
    const next = service.prepare(input(), performance.now() + 1000, new AbortController().signal);
    worker().complete();
    await expect(next).resolves.toMatchObject({ kind: "found" });
    expect(TestWorker.made).toHaveLength(1);
    service.dispose();
  });
  it("rejects overlapping work without interrupting the active operation", async () => {
    const service = new FillWorkerService();
    const first = service.prepare(input(), performance.now() + 1000, new AbortController().signal);
    await expect(
      service.prepare(input(), performance.now() + 1000, new AbortController().signal),
    ).rejects.toBeInstanceOf(FillError);
    worker().complete();
    await expect(first).resolves.toMatchObject({ kind: "found" });
    service.dispose();
  });
  it("uses the original region deadline across patch expansions", async () => {
    vi.useFakeTimers();
    const service = new FillWorkerService();
    const deadlineAt = performance.now() + 1000;
    const patch = input();
    patch.cut = { left: false, top: false, right: true, bottom: false };
    const first = service.prepare(patch, deadlineAt, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(750);
    worker().complete();
    await expect(first).resolves.toEqual({ kind: "past" });
    const next = service.prepare(input(), deadlineAt, new AbortController().signal);
    const rejected = expect(next).rejects.toBeInstanceOf(FillError);
    await vi.advanceTimersByTimeAsync(250);
    await rejected;
    expect(worker().terminate).toHaveBeenCalledTimes(1);
    service.dispose();
  });
  it("rejects aborted work and prevents its late answer from completing the next operation", async () => {
    const service = new FillWorkerService();
    const abort = new AbortController();
    const first = service.prepare(input(), performance.now() + 1000, abort.signal);
    const old = worker();
    const oldRequest = old.requests[0];
    abort.abort();
    await expect(first).rejects.toBeInstanceOf(FillError);
    const next = service.prepare(input(), performance.now() + 1000, new AbortController().signal);
    old.answer({ id: oldRequest.id, type: "complete", result: { kind: "empty" } });
    worker().complete();
    await expect(next).resolves.toMatchObject({ kind: "found" });
    expect(old.terminate).toHaveBeenCalledTimes(1);
    service.dispose();
  });
  it.each(["error", "messageerror", "wrong-id", "malformed", "failure"])(
    "surfaces %s and discards the worker",
    async (failure) => {
      const service = new FillWorkerService();
      const pending = service.prepare(
        input(),
        performance.now() + 1000,
        new AbortController().signal,
      );
      const request = worker().requests[0];
      if (failure === "error")
        worker().onerror?.({ preventDefault: () => {}, message: "Worker crashed" });
      else if (failure === "messageerror") worker().onmessageerror?.();
      else if (failure === "wrong-id")
        worker().answer({ id: request.id + 1, type: "complete", result: { kind: "empty" } });
      else if (failure === "failure")
        worker().answer({ id: request.id, type: "failure", message: "Fill failed" });
      else worker().answer({ id: request.id, type: "complete", result: { kind: "found" } });
      await expect(pending).rejects.toBeInstanceOf(FillError);
      expect(worker().terminate).toHaveBeenCalledTimes(1);
      service.dispose();
    },
  );
  it.each([
    (patch: FillPatchInput) => {
      patch.at.w = -1;
    },
    (patch: FillPatchInput) => {
      patch.target.width = 1;
    },
    (patch: FillPatchInput) => {
      patch.target.data = new Uint8ClampedArray(3);
    },
    (patch: FillPatchInput) => {
      patch.at.x = 0.5;
    },
  ])("rejects malformed patches before transfer", async (corrupt) => {
    const service = new FillWorkerService();
    const patch = input();
    corrupt(patch);
    await expect(
      service.prepare(patch, performance.now() + 1000, new AbortController().signal),
    ).rejects.toBeInstanceOf(FillError);
    expect(patch.target.data.byteLength).toBeGreaterThan(0);
    expect(TestWorker.made).toHaveLength(0);
    service.dispose();
  });
  it("rejects pending and future work when disposed", async () => {
    const service = new FillWorkerService();
    const pending = service.prepare(
      input(),
      performance.now() + 1000,
      new AbortController().signal,
    );
    service.dispose();
    await expect(pending).rejects.toBeInstanceOf(FillError);
    await expect(
      service.prepare(input(), performance.now() + 1000, new AbortController().signal),
    ).rejects.toBeInstanceOf(FillError);
    expect(worker().terminate).toHaveBeenCalledTimes(1);
  });
  it.each(["aborted", "expired"])(
    "does not detach input for an already %s request",
    async (reason) => {
      const service = new FillWorkerService();
      const patch = input();
      const controller = new AbortController();
      if (reason === "aborted") controller.abort();
      await expect(
        service.prepare(
          patch,
          performance.now() + (reason === "expired" ? -1 : 1000),
          controller.signal,
        ),
      ).rejects.toBeInstanceOf(FillError);
      expect(TestWorker.made).toHaveLength(0);
      expect(patch.target.data.byteLength).toBe(8);
      service.dispose();
    },
  );
  it.each(["start", "send"])("surfaces worker %s failure with its cause", async (stage) => {
    const service = new FillWorkerService();
    const cause = new Error("Worker transport failed");
    if (stage === "start")
      vi.stubGlobal(
        "Worker",
        class {
          constructor() {
            throw cause;
          }
        },
      );
    else
      vi.spyOn(TestWorker.prototype, "postMessage").mockImplementationOnce(() => {
        throw cause;
      });
    await expect(
      service.prepare(input(), performance.now() + 1000, new AbortController().signal),
    ).rejects.toMatchObject({ name: "FillError", cause });
    if (stage === "send") expect(worker().terminate).toHaveBeenCalledTimes(1);
    service.dispose();
    vi.restoreAllMocks();
  });
  it.each(["pixels", "box", "marks", "interior", "written-box", "written-spans", "written-colors"])(
    "rejects malformed prepared %s before returning an installable result",
    async (field) => {
      const service = new FillWorkerService();
      const pending = service.prepare(
        input(),
        performance.now() + 1000,
        new AbortController().signal,
      );
      const request = worker().requests[0];
      const result = prepareFillPatch(request.input);
      if (result.kind !== "found" || !result.written) throw new Error("No recorded region");
      switch (field) {
        case "pixels":
          result.pixels.data = new Uint8ClampedArray(7);
          break;
        case "box":
          result.found.box.x = 1;
          break;
        case "marks":
          result.found.marks = new Uint8Array(1);
          break;
        case "interior":
          result.interiorSpans = new Uint32Array([0, 0, 3]);
          break;
        case "written-box":
          result.written.box.y = 1;
          break;
        case "written-spans":
          result.written.spans = new Uint32Array([0, 0, 3]);
          break;
        case "written-colors":
          result.written.colors = new Uint32Array([1, 0]);
          break;
      }
      worker().answer({ id: request.id, type: "complete", result });
      await expect(pending).rejects.toBeInstanceOf(FillError);
      expect(worker().terminate).toHaveBeenCalledTimes(1);
      service.dispose();
    },
  );
});
