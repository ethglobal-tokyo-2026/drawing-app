import { afterEach, describe, expect, it, vi } from "vitest";
import { createFillCompletion } from "./fillCompletion";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("fill completion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the exact same promise for a repeated key and publishes pending immediately", async () => {
    const finish = deferred<void>();
    const pending = vi.fn();
    const change = vi.fn();
    const completion = createFillCompletion(() => finish.promise, pending, vi.fn(), vi.fn());

    const first = completion.run("seal", change);
    const repeated = completion.run("seal", vi.fn());

    expect(repeated).toBe(first);
    expect(pending).toHaveBeenCalledExactlyOnceWith(true);
    finish.resolve();
    await first;
    expect(change).toHaveBeenCalledOnce();
  });

  it("reports settling at 150 milliseconds and clears state when the change completes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const finish = deferred<void>();
    const change = deferred<void>();
    const pending = vi.fn();
    const settling = vi.fn();
    const completion = createFillCompletion(() => finish.promise, pending, settling, vi.fn());

    const request = completion.run("tool:fill", () => change.promise);
    expect(settling).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(149);
    expect(settling).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settling).toHaveBeenLastCalledWith(true);
    finish.resolve();
    await Promise.resolve();
    expect(pending).toHaveBeenLastCalledWith(true);
    change.resolve();
    await request;
    expect(settling).toHaveBeenLastCalledWith(false);
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("does not change state after finish fails and reports the failure", async () => {
    const error = new Error("finish failed");
    const failed = vi.fn();
    const pending = vi.fn();
    const settling = vi.fn();
    const change = vi.fn();
    const completion = createFillCompletion(() => Promise.reject(error), pending, settling, failed);

    await expect(completion.run("seal", change)).rejects.toBe(error);
    expect(change).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledExactlyOnceWith(error);
    expect(settling).toHaveBeenLastCalledWith(false);
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("reports a change failure and clears its own state", async () => {
    const error = new Error("change failed");
    const failed = vi.fn();
    const pending = vi.fn();
    const completion = createFillCompletion(async () => {}, pending, vi.fn(), failed);

    await expect(completion.run("panel:layers", () => Promise.reject(error))).rejects.toBe(error);
    expect(failed).toHaveBeenCalledExactlyOnceWith(error);
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("logs a failed error reporter while preserving the original transition rejection", async () => {
    const transitionError = new Error("finish failed");
    const reportingError = new Error("error reporter failed");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const completion = createFillCompletion(
      async () => {
        throw transitionError;
      },
      vi.fn(),
      vi.fn(),
      () => {
        throw reportingError;
      },
    );

    await expect(completion.run("seal", vi.fn())).rejects.toBe(transitionError);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "Fill transition error reporting failed; preserving the original transition error",
      { transitionError, reportingError },
    );
  });

  it("rejects a different key while preserving the active transition", async () => {
    const finish = deferred<void>();
    const failed = vi.fn();
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    const completion = createFillCompletion(() => finish.promise, vi.fn(), vi.fn(), failed);
    const first = completion.run("tool:fill", firstChange);

    await expect(completion.run("reference:composite", secondChange)).rejects.toThrow(
      "A fill transition is already pending",
    );
    expect(failed).toHaveBeenCalledOnce();
    finish.resolve();
    await first;
    expect(firstChange).toHaveBeenCalledOnce();
    expect(secondChange).not.toHaveBeenCalled();
  });

  it("invalidates old completion callbacks when canceled before starting a new request", async () => {
    const oldFinish = deferred<void>();
    const newFinish = deferred<void>();
    const pending = vi.fn();
    const settling = vi.fn();
    const failed = vi.fn();
    const oldChange = vi.fn();
    const newChange = vi.fn();
    let finishCalls = 0;
    const completion = createFillCompletion(
      () => (finishCalls++ === 0 ? oldFinish.promise : newFinish.promise),
      pending,
      settling,
      failed,
    );

    const oldRequest = completion.run("seal:old", oldChange);
    completion.cancel();
    const newRequest = completion.run("seal:new", newChange);
    const pendingCallsBeforeOldFinish = pending.mock.calls.length;
    const settlingCallsBeforeOldFinish = settling.mock.calls.length;
    oldFinish.reject(new Error("obsolete finish failed"));
    await expect(oldRequest).rejects.toThrow("obsolete finish failed");
    expect(oldChange).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(pending).toHaveBeenCalledTimes(pendingCallsBeforeOldFinish);
    expect(settling).toHaveBeenCalledTimes(settlingCallsBeforeOldFinish);

    newFinish.resolve();
    await newRequest;
    expect(newChange).toHaveBeenCalledOnce();
    expect(pending).toHaveBeenLastCalledWith(false);
  });

  it("clears state on cancel and suppresses the timer and later change", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const finish = deferred<void>();
    const pending = vi.fn();
    const settling = vi.fn();
    const change = vi.fn();
    const completion = createFillCompletion(() => finish.promise, pending, settling, vi.fn());

    const request = completion.run("reference:composite", change);
    completion.cancel();
    expect(settling).toHaveBeenLastCalledWith(false);
    expect(pending).toHaveBeenLastCalledWith(false);
    await vi.advanceTimersByTimeAsync(150);
    finish.resolve();
    await request;
    expect(change).not.toHaveBeenCalled();
    expect(settling).not.toHaveBeenCalledWith(true);
  });

  it("supports synchronous finish throws and asynchronous changes", async () => {
    const finishError = new Error("sync finish failed");
    const failed = vi.fn();
    const change = deferred<void>();
    const completion = createFillCompletion(
      () => {
        throw finishError;
      },
      vi.fn(),
      vi.fn(),
      failed,
    );
    await expect(completion.run("finish-error", vi.fn())).rejects.toBe(finishError);
    expect(failed).toHaveBeenCalledExactlyOnceWith(finishError);

    const next = createFillCompletion(async () => {}, vi.fn(), vi.fn(), vi.fn());
    const request = next.run("async-change", () => change.promise);
    await Promise.resolve();
    let completed = false;
    void request.then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    change.resolve();
    await request;
    expect(completed).toBe(true);
  });
});
