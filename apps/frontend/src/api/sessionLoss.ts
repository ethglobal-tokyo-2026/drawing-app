import type { ApiError } from "./apiClient";

type Listener = (error: ApiError) => void;

const listeners = new Set<Listener>();
let endsOnPurpose = false;

/** Calls `listener` whenever a request finds the session gone; returns how to stop listening. */
export function onSessionLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A request came back 401 signed_out. SessionGate listens while the app is open and signs in again,
 * so no screen has to handle it; before the app opens nobody listens, and boot handles its own.
 */
export function reportSessionLost(error: ApiError): void {
  if (endsOnPurpose) return;
  for (const listener of [...listeners]) listener(error);
}

/** Logging out ends the session on purpose, so the answers still in flight don't sign in again. */
export function sessionEndsOnPurpose(): void {
  endsOnPurpose = true;
}
