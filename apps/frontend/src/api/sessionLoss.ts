import type { ApiError } from "./apiClient";

type Listener = (error: ApiError, expectedUserId?: string) => void;

const listeners = new Set<Listener>();
let endsOnPurpose = false;

/** Calls `listener` whenever a request finds the session gone; returns how to stop listening. */
export function onSessionLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * An account-bound request found its session absent or changed. SessionGate closes that account
 * and asks for Reload; before the app opens nobody listens, and bootstrap handles its own errors.
 */
export function reportSessionLost(error: ApiError, expectedUserId?: string): void {
  if (endsOnPurpose) return;
  for (const listener of [...listeners]) listener(error, expectedUserId);
}

/** Logging out ends the session on purpose, so late answers do not interrupt the logout flow. */
export function sessionEndsOnPurpose(): void {
  endsOnPurpose = true;
}
