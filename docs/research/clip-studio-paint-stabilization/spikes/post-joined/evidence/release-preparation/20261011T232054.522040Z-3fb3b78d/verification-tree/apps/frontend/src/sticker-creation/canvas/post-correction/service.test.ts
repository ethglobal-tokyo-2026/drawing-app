import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostCorrectionService, type PostCorrectionInput } from "./service";
import { FIRST_POST_CORRECTION } from "./settings";
import type { PostWorkerRequest, PostWorkerResponse } from "./protocol";
import { PostCorrectionError } from "./errors";

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: MessageEvent<PostWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  sent: PostWorkerRequest[] = [];
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: PostWorkerRequest) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(message: PostWorkerResponse) {
    this.onmessage?.(new MessageEvent<PostWorkerResponse>("message", { data: message }));
  }
}
const input: PostCorrectionInput = {
  packets: [{ x: 0, y: 0, pressure: 1, t: 0, phase: 2 }],
  renderedPoints: [0, 0, 2, 0],
  settings: { ...FIRST_POST_CORRECTION, strength: 5 },
  magnificationFraction: 1,
  brushSize: 7,
  pointerType: "pen",
  stabilization: 20,
};

beforeEach(() => {
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("post-correction worker service", () => {
  it("creates no worker until requested and accepts only the matching result", async () => {
    const service = new PostCorrectionService();
    expect(TestWorker.instances).toHaveLength(0);
    const result = service.correct(input);
    expect(TestWorker.instances).toHaveLength(1);
    const worker = TestWorker.instances[0],
      id = worker.sent[0].id;
    let done = false;
    void result.then(() => {
      done = true;
    });
    worker.reply({ id: id + 1, type: "complete", points: [5, 6, 2, 0] });
    await Promise.resolve();
    expect(done).toBe(false);
    worker.reply({ id, type: "complete", points: [3, 4, 2, 0] });
    await expect(result).resolves.toEqual([3, 4, 2, 0]);
    expect(worker.terminated).toBe(true);
    service.dispose();
  });

  it("terminates actual pending work on abort and never accepts a later result", async () => {
    const service = new PostCorrectionService(),
      controller = new AbortController();
    const result = service.correct(input, controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    const worker = TestWorker.instances[0];
    controller.abort();
    await rejected;
    expect(worker.terminated).toBe(true);
    worker.reply({ id: worker.sent[0].id, type: "complete", points: [3, 4, 2, 0] });
    service.dispose();
  });

  it("limits worker elapsed time and surfaces a persistent-error-compatible failure", async () => {
    vi.useFakeTimers();
    const service = new PostCorrectionService();
    const result = service.correct(input);
    const rejected = expect(result).rejects.toThrow(PostCorrectionError);
    await vi.advanceTimersByTimeAsync(1001);
    await rejected;
    expect(TestWorker.instances[0].terminated).toBe(true);
    service.dispose();
  });

  it("validates returned geometry and retains worker failure details", async () => {
    const service = new PostCorrectionService();
    const bad = service.correct(input),
      worker = TestWorker.instances[0];
    const badResult = expect(bad).rejects.toThrow(PostCorrectionError);
    worker.reply({ id: worker.sent[0].id, type: "complete", points: [NaN, 0, 2, 0] });
    await badResult;
    const failure = service.correct(input),
      second = TestWorker.instances[1];
    const failed = expect(failure).rejects.toThrow("source node work limit");
    second.reply({ id: second.sent[0].id, type: "failure", message: "source node work limit" });
    await failed;
    service.dispose();
  });

  it("disposal rejects pending work and prevents another worker from starting", async () => {
    const service = new PostCorrectionService();
    const pending = service.correct(input),
      rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    service.dispose();
    await rejected;
    expect(TestWorker.instances[0].terminated).toBe(true);
    await expect(service.correct(input)).rejects.toThrow(PostCorrectionError);
    expect(TestWorker.instances).toHaveLength(1);
  });
});
