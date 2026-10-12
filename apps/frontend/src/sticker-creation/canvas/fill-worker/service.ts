import type { FillPatchInput, FillPatchResult } from "./protocol";
import { FillError } from "./errors";
import { fillTransferBuffers, readFillWorkerResponse, validateFillPatch } from "./protocol";

interface Pending {
  worker: Worker;
  timer: ReturnType<typeof setTimeout>;
  signal: AbortSignal;
  abort: () => void;
  reject: (error: FillError) => void;
}

export class FillWorkerService {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private nextId = 0;
  private disposed = false;

  prepare(
    input: FillPatchInput,
    deadlineAt: number,
    signal: AbortSignal,
  ): Promise<FillPatchResult> {
    return new Promise((resolve, reject: (error: FillError) => void) => {
      try {
        if (this.disposed) throw new FillError("Fill worker service was disposed");
        if (this.pending) throw new FillError("Fill worker already has an active request");
        if (signal.aborted) throw new FillError("Fill preparation was aborted");
        const remaining = deadlineAt - performance.now();
        if (!Number.isFinite(remaining) || remaining <= 0)
          throw new FillError("Fill preparation exceeded its region deadline");
        validateFillPatch(input);
        const worker =
          this.worker ?? new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
        this.worker = worker;
        const id = ++this.nextId;
        const at = { ...input.at };
        const abort = () => this.fail(new FillError("Fill preparation was aborted"));
        this.pending = {
          worker,
          signal,
          abort,
          reject,
          timer: setTimeout(
            () => this.fail(new FillError("Fill preparation exceeded its region deadline")),
            remaining,
          ),
        };
        signal.addEventListener("abort", abort, { once: true });
        worker.onerror = (event) => {
          event.preventDefault();
          this.fail(new FillError(`Fill worker crashed: ${event.message}`));
        };
        worker.onmessageerror = () =>
          this.fail(new FillError("Fill worker response could not be decoded"));
        worker.onmessage = ({ data }: MessageEvent<unknown>) => {
          if (this.pending?.worker !== worker) return;
          try {
            if (signal.aborted) throw new FillError("Fill preparation was aborted");
            if (performance.now() >= deadlineAt)
              throw new FillError("Fill preparation exceeded its region deadline");
            const response = readFillWorkerResponse(data, id, at);
            if (response.type === "failure")
              throw new FillError(`Fill worker failed: ${response.message}`);
            this.finish();
            resolve(response.result);
          } catch (error) {
            this.fail(
              error instanceof FillError
                ? error
                : new FillError("Fill worker response failed", undefined, { cause: error }),
            );
          }
        };
        worker.postMessage(
          { id, input },
          fillTransferBuffers([input.shown.data, input.target.data]),
        );
      } catch (error) {
        const failure =
          error instanceof FillError
            ? error
            : new FillError("Fill worker could not start or receive pixels", undefined, {
                cause: error,
              });
        if (this.pending?.reject === reject) this.fail(failure);
        else reject(failure);
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    this.fail(new FillError("Fill worker service was disposed"));
  }

  private finish(): void {
    const pending = this.pending;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.signal.removeEventListener("abort", pending.abort);
    pending.worker.onmessage = null;
    pending.worker.onerror = null;
    pending.worker.onmessageerror = null;
    this.pending = null;
  }

  private fail(error: FillError): void {
    const pending = this.pending;
    this.finish();
    this.worker?.terminate();
    this.worker = null;
    pending?.reject(error);
  }
}
