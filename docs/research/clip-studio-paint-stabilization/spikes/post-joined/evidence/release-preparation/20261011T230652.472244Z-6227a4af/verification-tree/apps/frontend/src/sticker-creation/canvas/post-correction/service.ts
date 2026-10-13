import type { PostCorrectionInput } from "./core.ts";
import type { PostWorkerRequest, PostWorkerResponse } from "./protocol.ts";
import { PostCorrectionError } from "./errors.ts";
import { validatePostCorrectionPoints } from "./validation.ts";
export type { PostCorrectionInput } from "./core.ts";

/** Browser elapsed-time bound, including worker startup and message transfer. */
const DEADLINE_MS = 1000;

/** One disposable worker per request lets cancellation stop synchronous arithmetic immediately. */
export class PostCorrectionService {
  private nextId = 1;
  private disposed = false;
  private readonly active = new Map<number, () => void>();

  correct(input: PostCorrectionInput, signal?: AbortSignal): Promise<number[]> {
    if (this.disposed)
      return Promise.reject(new PostCorrectionError("Post correction service has been disposed."));
    if (signal?.aborted)
      return Promise.reject(new DOMException("Post correction was canceled.", "AbortError"));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      let worker: Worker;
      try {
        worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      } catch (error) {
        reject(
          new PostCorrectionError(
            `Post correction could not start: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        return;
      }
      let done = false;
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
        this.active.delete(id);
      };
      const fail = (error: Error) => {
        if (!done) {
          cleanup();
          reject(error);
        }
      };
      const abort = () => fail(new DOMException("Post correction was canceled.", "AbortError"));
      timer = setTimeout(
        () =>
          fail(new PostCorrectionError("Post correction exceeded its one-second worker deadline.")),
        DEADLINE_MS,
      );
      this.active.set(id, abort);
      signal?.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent<PostWorkerResponse>) => {
        const response = event.data;
        if (response === null || typeof response !== "object") {
          fail(new PostCorrectionError("Post correction returned an invalid response."));
          return;
        }
        if (done || response.id !== id) return;
        if (response.type === "progress") {
          console.debug("Post correction progress", { id, ...response.progress });
          return;
        }
        if (response.type === "failure") {
          fail(new PostCorrectionError(response.message));
          return;
        }
        if (response.type !== "complete") {
          fail(new PostCorrectionError("Post correction returned an unknown response."));
          return;
        }
        try {
          validatePostCorrectionPoints(response.points);
          cleanup();
          resolve(response.points);
        } catch (error) {
          fail(
            error instanceof PostCorrectionError ? error : new PostCorrectionError(String(error)),
          );
        }
      };
      worker.onerror = (event) =>
        fail(new PostCorrectionError(`Post correction worker failed: ${event.message}`));
      worker.onmessageerror = () =>
        fail(new PostCorrectionError("Post correction worker returned an unreadable response."));
      try {
        worker.postMessage({ id, input } satisfies PostWorkerRequest);
      } catch (error) {
        fail(
          new PostCorrectionError(
            `Post correction input could not be sent: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const abort of this.active.values()) abort();
  }
}
