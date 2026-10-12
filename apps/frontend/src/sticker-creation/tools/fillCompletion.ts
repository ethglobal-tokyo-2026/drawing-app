type FillCompletionCallbacks = {
  pending: (value: boolean) => void;
  settling: (value: boolean) => void;
  failed: (error: unknown) => void;
};

type ActiveTransition = {
  key: string;
  promise: Promise<void>;
  timer: ReturnType<typeof setTimeout> | undefined;
};

export type FillCompletion = {
  run: (key: string, change: () => void | Promise<void>) => Promise<void>;
  cancel: () => void;
};

const SETTLING_DELAY_MS = 150;

export function createFillCompletion(
  finish: () => Promise<void>,
  pending: FillCompletionCallbacks["pending"],
  settling: FillCompletionCallbacks["settling"],
  failed: FillCompletionCallbacks["failed"],
): FillCompletion {
  const callbacks: FillCompletionCallbacks = { pending, settling, failed };
  let active: ActiveTransition | undefined;

  function reportFailure(error: unknown): void {
    try {
      callbacks.failed(error);
    } catch (reportingError) {
      console.error(
        "Fill transition error reporting failed; preserving the original transition error",
        { transitionError: error, reportingError },
      );
    }
  }

  function notify(callback: (value: boolean) => void, value: boolean): void {
    try {
      callback(value);
    } catch (error) {
      reportFailure(error);
    }
  }

  function clear(transition: ActiveTransition): void {
    if (active !== transition) return;
    active = undefined;
    if (transition.timer !== undefined) clearTimeout(transition.timer);
    transition.timer = undefined;
    notify(callbacks.settling, false);
    notify(callbacks.pending, false);
  }

  function run(key: string, change: () => void | Promise<void>): Promise<void> {
    if (active) {
      if (active.key === key) return active.promise;
      const error = new Error("A fill transition is already pending");
      reportFailure(error);
      const rejected = Promise.reject<void>(error);
      // Keep ignored conflicts from becoming unhandled while preserving this rejection for callers.
      void rejected.catch(() => {});
      return rejected;
    }

    let resolveRequest: () => void = () => {};
    let rejectRequest: (error: unknown) => void = () => {};
    const promise = new Promise<void>((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    const transition: ActiveTransition = { key, promise, timer: undefined };
    active = transition;
    // Active failures are reported to persistent UI; observe ignored rejections while leaving this promise rejected for its caller.
    void promise.catch(() => {});

    notify(callbacks.pending, true);
    transition.timer = setTimeout(() => {
      if (active === transition) notify(callbacks.settling, true);
    }, SETTLING_DELAY_MS);

    let finished: Promise<void>;
    try {
      finished = finish();
    } catch (error) {
      finished = Promise.reject(error);
    }

    void finished.then(
      () => {
        if (active !== transition) {
          resolveRequest();
          return;
        }
        let changed: void | Promise<void>;
        try {
          changed = change();
        } catch (error) {
          if (active === transition) {
            clear(transition);
            reportFailure(error);
          }
          rejectRequest(error);
          return;
        }
        void Promise.resolve(changed).then(
          () => {
            clear(transition);
            resolveRequest();
          },
          (error: unknown) => {
            if (active === transition) {
              clear(transition);
              reportFailure(error);
            }
            rejectRequest(error);
          },
        );
      },
      (error: unknown) => {
        if (active !== transition) {
          // Cancellation invalidates this transition identity; preserve its rejection but suppress callbacks that could overwrite a newer request.
          rejectRequest(error);
          return;
        }
        clear(transition);
        reportFailure(error);
        rejectRequest(error);
      },
    );

    return promise;
  }

  function cancel(): void {
    const transition = active;
    if (!transition) return;
    active = undefined;
    if (transition.timer !== undefined) clearTimeout(transition.timer);
    transition.timer = undefined;
    notify(callbacks.settling, false);
    notify(callbacks.pending, false);
  }

  return { run, cancel };
}
