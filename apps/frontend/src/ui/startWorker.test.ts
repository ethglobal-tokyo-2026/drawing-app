// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { startWorker } from "./startWorker";

/** Records the script each worker was started from. */
class FakeWorker {
  static started: FakeWorker[] = [];
  script: string;
  stopped = false;
  constructor(script: string | URL) {
    this.script = String(script);
    FakeWorker.started.push(this);
  }
  terminate() {
    this.stopped = true;
  }
}

afterEach(() => {
  FakeWorker.started = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("startWorker", () => {
  it("starts a script on the page's own origin from that script", () => {
    vi.stubGlobal("Worker", FakeWorker);
    const { stop } = startWorker("/assets/sealWorker.js");
    const [worker] = FakeWorker.started;
    expect(worker?.script).toBe(new URL("/assets/sealWorker.js", location.href).href);
    stop();
    expect(worker?.stopped).toBe(true);
  });

  it("starts a script on the CDN from a module of the page's own that imports it, and lets that module go on stop", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const made = vi.spyOn(URL, "createObjectURL");
    const revoked = vi.spyOn(URL, "revokeObjectURL");
    const script = "https://cdn.example/assets/sealWorker.js";
    const { stop } = startWorker(script);

    const [worker] = FakeWorker.started;
    const source = made.mock.calls[0]?.[0];
    if (!(source instanceof Blob))
      throw new Error("no module was made for the worker to start from");
    await expect(source.text()).resolves.toBe(`import "${script}";`);
    const boot = worker?.script;
    expect(boot).toMatch(/^blob:/);

    stop();
    expect(worker?.stopped).toBe(true);
    expect(revoked).toHaveBeenCalledWith(boot);
  });
});
