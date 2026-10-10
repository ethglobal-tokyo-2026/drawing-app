/**
 * Whether an animation's `finished` rejected because it was cancelled: cancelling rejects it with an
 * AbortError, which is the cancel asked for, not a failure.
 */
export const isCancelled = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";
