import type { AccountSelection, SessionEnvelope } from "@drawing-app/api/client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { ApiError } from "./apiClient";

export const SessionEnvelopeContext = createContext<SessionEnvelope | null>(null);
export function useSessionEnvelope(): SessionEnvelope {
  const session = useContext(SessionEnvelopeContext);
  if (!session) throw new Error("useSessionEnvelope needs an accepted session");
  return session;
}
export const selectionOf = (session: SessionEnvelope): AccountSelection => ({
  userId: session.me.id,
  selectionVersion: session.selectionVersion,
});
export const selectionKey = (selection: AccountSelection) =>
  JSON.stringify([selection.userId, selection.selectionVersion]);

let accepted: AccountSelection | null = null;
let lifetime = 0;
const lifetimeListeners = new Set<() => void>();
const changed = () => {
  lifetime += 1;
  lifetimeListeners.forEach((listener) => listener());
};
/** Only the Privy provider remounts for a new local lifetime; account save queues stay mounted. */
export function useSessionLifetime(): number {
  return useSyncExternalStore(
    (listener) => {
      lifetimeListeners.add(listener);
      return () => {
        lifetimeListeners.delete(listener);
      };
    },
    () => lifetime,
  );
}
const listeners = new Set<() => void>();
export const currentSelection = () => accepted;
export const isAccountSelectionCurrent = (selection: AccountSelection) =>
  accepted !== null && selectionKey(accepted) === selectionKey(selection);
export function assertAccountSelectionCurrent(selection: AccountSelection) {
  if (!isAccountSelectionCurrent(selection))
    throw new ApiError(409, { error: "session_account_changed" });
}
/** Invalidate retained callbacks before a transition, even before React closes its providers. */
export function suspendSession() {
  accepted = null;
  changed();
  listeners.forEach((listener) => listener());
}
/** Only SessionGate accepts the authoritative envelope after checking the LINE principal. */
export function acceptSession(session: SessionEnvelope) {
  const selection = selectionOf(session);
  if (isAccountSelectionCurrent(selection)) return;
  suspendSession();
  accepted = Object.freeze(selection);
  changed();
}
export function onSessionSuspended(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const restoreListeners = new Set<(session: SessionEnvelope) => void>();
/** Asks the mounted gate to validate and restore after a failed transition. Never accepts directly. */
export function requestSessionRestore(session: SessionEnvelope): void {
  if (restoreListeners.size !== 1) throw new ApiError(409, { error: "session_account_changed" });
  for (const restore of restoreListeners) restore(session);
}
export function onSessionRestoreRequested(restore: (session: SessionEnvelope) => void) {
  restoreListeners.add(restore);
  return () => {
    restoreListeners.delete(restore);
  };
}
/** A retained operation stays invalid after suspension, even if the same server version is restored. */
export function captureAccountSelection(selection: AccountSelection): () => void {
  const lifetime = accepted;
  return () => {
    assertAccountSelectionCurrent(selection);
    if (lifetime !== accepted) throw new ApiError(409, { error: "session_account_changed" });
  };
}
