import type { ApiError } from "./apiClient";

type Listener = (error: ApiError, expectedUserId?: string) => void;

const listeners = new Set<Listener>();
let endsOnPurpose = false;

interface AccountReleaseGuard {
  userId: string;
  preservationError: () => ApiError | null;
  retryPreservation: () => void;
  blocked: (error: ApiError) => void;
}
const releaseGuards = new Set<AccountReleaseGuard>();
const pendingReleases = new Map<string, { userId: string | undefined; release: () => void }>();

/** The mounted owner registers its preservation requirement for every teardown or page navigation. */
export function beforeAccountRelease(guard: AccountReleaseGuard): () => void {
  releaseGuards.add(guard);
  return () => {
    releaseGuards.delete(guard);
    if (![...releaseGuards].some((current) => current.userId === guard.userId))
      pendingReleases.delete(guard.userId);
  };
}

/** Releases an account only when its unfinished positions are preserved; otherwise retains the action for safe retry. */
export function requestAccountRelease(userId: string | undefined, release: () => void): boolean {
  const guards = [...releaseGuards].filter(
    (guard) => userId === undefined || guard.userId === userId,
  );
  let blocked = false;
  for (const guard of guards) {
    const error = guard.preservationError();
    if (!error) continue;
    blocked = true;
    pendingReleases.set(guard.userId, { userId, release });
    guard.blocked(error);
  }
  if (blocked) return false;
  for (const guard of guards) pendingReleases.delete(guard.userId);
  release();
  return true;
}

/** Explicit retry preserves the frozen owner before attempting its retained action, or the caller's recovery. */
export function retryAccountRelease(userId: string, fallback: () => void): void {
  for (const guard of releaseGuards) if (guard.userId === userId) guard.retryPreservation();
  const pending = pendingReleases.get(userId);
  requestAccountRelease(pending ? pending.userId : userId, pending?.release ?? fallback);
}

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
  requestAccountRelease(expectedUserId, () => {
    for (const listener of [...listeners]) listener(error, expectedUserId);
  });
}

/** Logging out ends the session on purpose, so late answers do not interrupt the logout flow. */
export function sessionEndsOnPurpose(): void {
  endsOnPurpose = true;
}
