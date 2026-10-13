import type { ChatMenuLink, AccountSelection } from "@drawing-app/api/client";
import { useEffect, useSyncExternalStore } from "react";
import { createServerClient } from "../api/httpApi";
import { useMe } from "../api/meContext";
import { useSessionEnvelope, selectionOf } from "../api/sessionContext";
import { messageOf } from "../i18n/errorMessage";
import { jsonField } from "../identity/privy";

/**
 * The menu under the Official Account's chat: "Open Sticker Board" for someone new; for someone with
 * an account, Draw, My board and Explore, with the tickets they have left on the Draw key.
 */
export type ChatMenuStatus =
  | { state: "waiting" }
  | { state: "linking" }
  | { state: "answered"; link: ChatMenuLink }
  | { state: "failed"; reason: string };

const waiting: ChatMenuStatus = { state: "waiting" };
const statuses = new Map<string, ChatMenuStatus>();
const listeners = new Set<() => void>();

function set(userId: string, next: ChatMenuStatus) {
  statuses.set(userId, next);
  listeners.forEach((l) => l());
}

export const chatMenuStatus = (userId: string) => statuses.get(userId) ?? waiting;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useChatMenuStatus(): ChatMenuStatus {
  const { id } = useMe();
  return useSyncExternalStore(subscribe, () => chatMenuStatus(id));
}

const asked = new Set<string>();

function fail(userId: string, reason: string) {
  console.error(`The chat menu didn't link: ${reason}`);
  set(userId, { state: "failed", reason });
}

/**
 * Asks the app's server to link your chat menu to the one for your language and the tickets you have
 * left, once per page load. The server asks LINE itself; the answer goes to the status, and this
 * never throws.
 */
export async function linkChatMenu(
  selection: AccountSelection,
  api = createServerClient(fetch, selection),
): Promise<void> {
  const userId = selection.userId;
  if (asked.has(userId)) return;
  asked.add(userId);
  set(userId, { state: "linking" });
  try {
    const response = await api["line-menu"].$post();
    if (response.ok) {
      set(userId, { state: "answered", link: (await response.json()).chatMenu });
      return;
    }
    const error = jsonField(await response.json().catch(() => null), "error");
    fail(userId, `HTTP ${response.status}${typeof error === "string" ? ` ${error}` : ""}`);
  } catch (error) {
    fail(userId, `couldn’t reach the server: ${messageOf(error)}`);
  }
}

/** Links your chat menu once you're signed in to the app's server. It shows nothing. */
export function ChatMenuLink() {
  const session = useSessionEnvelope();
  const id = session.me.id;
  const version = session.selectionVersion;
  useEffect(() => {
    void linkChatMenu(selectionOf(session));
  }, [id, version, session]);
  return null;
}
